#!/usr/bin/env node
/**
 * mock-generator.mjs
 * Stage 1 of the two-stage mimic pipeline.
 *
 * Generates a self-contained mock web page from the analyzed reference video
 * so the generic template is runnable — and therefore SCOREABLE with
 * evaluate-mimic.mjs — before any product personalization happens.
 *
 * The mock reproduces the reference's measurable signals:
 *   - scenes (one per hard cut / navigation) with palette-matched backgrounds
 *   - inputs & buttons at the detected interaction regions
 *   - modal fade/scale transitions where the reference had animations
 *   - tall scrollable scenes where the reference scrolled
 *
 * Stage 2: an AI assistant personalizes the template for a real product
 * (URL or local repo via the flow "serve" block); the mock is then unused.
 *
 * Exports:
 *   generateMock(analyzedSteps, options) → { mockDir, selectorMap }
 *     options: { videoPath, outputDir, width?, height? }
 *     selectorMap: Map<analyzedStep, { target, value?, gotoTarget? }>
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractSignature } from "./video-signature.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Palette helpers
// ─────────────────────────────────────────────────────────────────────────────

function binToRgb(bin) {
  const r = ((bin >> 4) & 3) * 64 + 32;
  const g = ((bin >> 2) & 3) * 64 + 32;
  const b = (bin & 3) * 64 + 32;
  return [r, g, b];
}

function rgbCss([r, g, b]) {
  return `rgb(${r},${g},${b})`;
}

function colorDist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function luminance([r, g, b]) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Dominant + contrasting accent color for a frame range. */
function paletteForRange(frames, startMs, endMs) {
  const acc = new Float64Array(64);
  let n = 0;
  for (const f of frames) {
    if (f.tMs < startMs || f.tMs >= endMs) continue;
    for (let k = 0; k < 64; k++) acc[k] += f.hist[k];
    n++;
  }
  if (n === 0) return { bg: [245, 246, 248], accent: [40, 90, 200], panel: [255, 255, 255] };

  const ranked = [...acc.keys()].sort((a, b) => acc[b] - acc[a]);
  const bg = binToRgb(ranked[0]);

  // Accent: strongest bin that contrasts with the background
  let accent = null;
  for (const bin of ranked.slice(1, 8)) {
    if (acc[bin] <= 0) break;
    const c = binToRgb(bin);
    if (colorDist(c, bg) > 90) { accent = c; break; }
  }
  if (!accent) accent = luminance(bg) > 128 ? [40, 90, 200] : [230, 230, 240];

  // Panel: slightly offset from bg for visible structure
  const panel = luminance(bg) > 128
    ? bg.map((v) => Math.max(0, v - 18))
    : bg.map((v) => Math.min(255, v + 22));

  return { bg, accent, panel };
}

// ─────────────────────────────────────────────────────────────────────────────
// Region extraction from analyzed steps
// ─────────────────────────────────────────────────────────────────────────────

function regionOf(step, fallbackIndex) {
  if (step.region && typeof step.region.x === "number") return step.region;
  // Vision-provider steps: parse "~62% across, ~30% down" hints if present
  const text = `${step.notes || ""} ${step.screenDescription || ""}`;
  const m = text.match(/~?(\d+)%\s*across.*?~?(\d+)%\s*down/);
  if (m) return { x: parseInt(m[1]) / 100, y: parseInt(m[2]) / 100 };
  // Fallback: stack down the center
  return { x: 0.5, y: Math.min(0.25 + fallbackIndex * 0.13, 0.8) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main generator
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMock(analyzedSteps, options = {}) {
  const { videoPath, outputDir } = options;
  if (!outputDir) throw new Error("generateMock: options.outputDir is required");

  // Palette + duration from the reference video (skipped gracefully if unavailable)
  let sig = null;
  if (videoPath) {
    try { sig = await extractSignature(videoPath, { sampleFps: 4 }); } catch { /* palette fallback */ }
  }
  const durationMs = sig?.durationMs || (analyzedSteps[analyzedSteps.length - 1]?.timestampMs ?? 10000) + 2000;

  // ── Split steps into scenes ────────────────────────────────────────────────
  // A new scene starts at: every "goto" after t=0, and after every
  // navigation-click (a click the analyzer flagged as causing a page change).
  const scenes = [{ startMs: 0, steps: [] }];
  for (const step of analyzedSteps) {
    const isSceneBreak =
      (step.action === "goto" && step.timestampMs > 0) ||
      (step.action === "click" && step.target === "<SELECTOR_OF_NAVIGATION_TRIGGER>");

    if (step.action === "click" && step.target === "<SELECTOR_OF_NAVIGATION_TRIGGER>") {
      // The nav trigger lives in the CURRENT scene; the scene break happens on click
      scenes[scenes.length - 1].steps.push(step);
      scenes.push({ startMs: step.timestampMs, steps: [] });
      step._navToScene = scenes.length - 1;
      continue;
    }
    if (isSceneBreak) {
      scenes.push({ startMs: step.timestampMs, steps: [] });
      step._gotoScene = scenes.length - 1;
      continue; // goto steps produce no element
    }
    scenes[scenes.length - 1].steps.push(step);
  }

  // ── Build elements + selector map ─────────────────────────────────────────
  const selectorMap = new Map();
  let elId = 0;
  const sceneHtml = [];

  for (let sIdx = 0; sIdx < scenes.length; sIdx++) {
    const scene = scenes[sIdx];
    const endMs = scenes[sIdx + 1]?.startMs ?? durationMs;
    const pal = sig
      ? paletteForRange(sig.frames, scene.startMs, endMs)
      : paletteForRange([], 0, 0);

    const hasScroll = scene.steps.some((st) => st.action === "scroll");
    const els = [];
    let regionIdx = 0;

    for (const step of scene.steps) {
      if (step.action === "type") {
        const id = `m${elId++}`;
        const r = regionOf(step, regionIdx++);
        els.push(
          `<input id="${id}" class="el input" style="left:${(r.x * 100).toFixed(1)}%;top:${(r.y * 100).toFixed(1)}%" placeholder="Enter text..." />`
        );
        selectorMap.set(step, { target: `#${id}`, value: step.value && !step.value.includes("<") ? step.value : "Demo input text" });
      } else if (step.action === "click") {
        const id = `m${elId++}`;
        const r = regionOf(step, regionIdx++);
        const isNav = step._navToScene !== undefined;
        const isAnim = step.zoom === true && !isNav;
        const onclick = isNav
          ? `showScene(${step._navToScene})`
          : isAnim
            ? `showModal(this)`
            : `pulse(this)`;
        const label = isNav ? "Continue" : isAnim ? "Open" : "Select";
        els.push(
          `<button id="${id}" class="el btn" style="left:${(r.x * 100).toFixed(1)}%;top:${(r.y * 100).toFixed(1)}%" onclick="${onclick}">${label}</button>`
        );
        selectorMap.set(step, { target: `#${id}` });
      } else if (step.action === "goto") {
        // in-scene goto (t=0 opener) — no element
        selectorMap.set(step, { gotoTarget: sIdx === 0 ? "/" : `/#s${sIdx}` });
      }
    }

    // goto steps that START this scene need their hash target
    for (const step of analyzedSteps) {
      if (step._gotoScene === sIdx) selectorMap.set(step, { gotoTarget: `/#s${sIdx}` });
    }

    const filler = hasScroll
      ? Array.from({ length: 8 }, (_, k) => `<div class="card">Section ${k + 1}</div>`).join("\n      ")
      : "";

    sceneHtml.push(`
  <section class="scene${sIdx === 0 ? " active" : ""}" id="s${sIdx}"
           style="--bg:${rgbCss(pal.bg)};--panel:${rgbCss(pal.panel)};--accent:${rgbCss(pal.accent)};${hasScroll ? "min-height:260vh;" : ""}">
    <header class="bar"></header>
    <div class="panel"></div>
    ${els.join("\n    ")}
    ${filler}
  </section>`);
  }

  // ── Assemble the page ─────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>OpenDemo Stage-1 Mock</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; overflow-x: hidden; }
  .scene { display: none; position: relative; width: 100vw; min-height: 100vh; background: var(--bg); }
  .scene.active { display: block; }
  .bar { position: absolute; top: 0; left: 0; right: 0; height: 7vh; background: var(--panel); box-shadow: 0 1px 4px rgba(0,0,0,.12); }
  .panel { position: absolute; left: 30%; top: 18%; width: 40%; height: 55%; background: var(--panel); border-radius: 10px; box-shadow: 0 4px 18px rgba(0,0,0,.10); }
  .el { position: absolute; transform: translate(-50%, -50%); z-index: 3; }
  .input { width: 24%; min-width: 180px; padding: 10px 14px; font-size: 15px; border: 2px solid var(--accent); border-radius: 6px; background: #fff; }
  .btn { padding: 11px 26px; font-size: 15px; color: #fff; background: var(--accent); border: 0; border-radius: 6px; cursor: pointer; transition: transform .12s ease; }
  .btn.pulsed { transform: translate(-50%, -50%) scale(.94); }
  .card { position: relative; margin: 110vh auto 3vh; width: 42%; padding: 26px; background: var(--panel); border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,.08); font-size: 15px; }
  .card ~ .card { margin-top: 3vh; }
  #modal { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(10,12,20,.45); opacity: 0; transition: opacity .45s ease; z-index: 9; }
  #modal.open { opacity: 1; }
  #modal .box { width: 40%; min-width: 300px; padding: 44px; text-align: center; font-size: 21px; background: #fff; border-radius: 12px; transform: scale(.82); transition: transform .45s ease; }
  #modal.open .box { transform: scale(1); }
</style>
</head>
<body>
${sceneHtml.join("\n")}
  <div id="modal"><div class="box">✓ Action completed</div></div>
<script>
  function showScene(n) {
    document.querySelectorAll(".scene").forEach(function (s) { s.classList.remove("active"); });
    var el = document.getElementById("s" + n);
    if (el) el.classList.add("active");
    window.scrollTo(0, 0);
  }
  function showModal(btn) {
    var m = document.getElementById("modal");
    m.style.display = "flex";
    requestAnimationFrame(function () { m.classList.add("open"); });
    setTimeout(function () {
      m.classList.remove("open");
      setTimeout(function () { m.style.display = "none"; }, 500);
    }, 1800);
  }
  function pulse(btn) {
    btn.classList.add("pulsed");
    setTimeout(function () { btn.classList.remove("pulsed"); }, 160);
  }
  function applyHash() {
    var m = (location.hash || "").match(/^#s(\\d+)$/);
    showScene(m ? parseInt(m[1]) : 0);
  }
  window.addEventListener("hashchange", applyHash);
  applyHash();
</script>
</body>
</html>
`;

  const mockDir = resolve(outputDir);
  mkdirSync(mockDir, { recursive: true });
  writeFileSync(resolve(mockDir, "index.html"), html, "utf8");

  return { mockDir, selectorMap, sceneCount: scenes.length };
}
