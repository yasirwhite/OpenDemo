#!/usr/bin/env node
/**
 * timeline-extractor.mjs
 * Converts a reference video into an editable VIDEO TEMPLATE: scenes (split
 * at hard cuts) with exact sampled palettes, per-beat palette tracking, and
 * a timeline of transitions, pulses, scrolls, and pans at the reference's
 * exact timestamps.
 *
 * The template is the stage-1 deliverable — render-mimic.mjs turns it into
 * an .mp4 with the reference's dimensions, cuts and animation rhythm.
 * Stage-2 assistants personalize it (brand colors, product screenshots as
 * scene images, timing tweaks) and re-render.
 *
 * Exports:
 *   extractTemplate(videoPath, opts) → template
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import { extractSignature, FFMPEG } from "./video-signature.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Beat keyframes + OCR + style classification
// ─────────────────────────────────────────────────────────────────────────────

function extractKeyframe(videoPath, tMs, outPath) {
  const r = spawnSync(FFMPEG, [
    "-v", "error", "-y", "-ss", (tMs / 1000).toFixed(3), "-i", videoPath,
    "-frames:v", "1", "-q:v", "2", outPath,
  ], { encoding: "utf8" });
  return r.status === 0 && existsSync(outPath);
}

let tesseractAvailable;
function ocrImage(imagePath) {
  if (tesseractAvailable === undefined) {
    tesseractAvailable = !spawnSync("tesseract", ["--version"], { encoding: "utf8" }).error;
  }
  if (!tesseractAvailable) return "";
  // Upscale 2.5x + sharpen before OCR — big display type at low resolutions
  // trips tesseract otherwise.
  const up = imagePath.replace(/\.png$/i, "_2x.png");
  spawnSync(FFMPEG, ["-v", "error", "-y", "-i", imagePath,
    "-vf", "scale=iw*2.5:ih*2.5:flags=lanczos,unsharp=5:5:0.8", up], { encoding: "utf8" });
  const ocrSrc = existsSync(up) ? up : imagePath;
  const base = imagePath.replace(/\.(png|jpg)$/i, "_ocr");
  const r = spawnSync("tesseract", [ocrSrc, base, "--psm", "6", "-l", "eng"], { encoding: "utf8" });
  try { if (existsSync(up)) rmSync(up); } catch { /* ignore */ }
  const txt = `${base}.txt`;
  if (r.status === 0 && existsSync(txt)) {
    const text = readFileSync(txt, "utf8").replace(/\s+/g, " ").trim();
    try { rmSync(txt); } catch { /* ignore */ }
    // Quality gate: keep only plausible English-like words; if the frame
    // yields mostly noise, return nothing (beat falls back to screen style).
    const words = text.split(" ").filter((w) => {
      if (!/^[A-Za-z'’.,!?&+-]{2,16}$/.test(w)) return false;
      const letters = w.replace(/[^A-Za-z]/g, "").toLowerCase();
      if (letters.length < 2) return false;
      const vowels = (letters.match(/[aeiouy]/g) || []).length;
      if (vowels / letters.length < 0.2) return false;       // no vowel-less noise
      if (/(.)\1\1/.test(letters)) return false;            // no triple repeats
      return true;
    });
    const rawCount = text.split(" ").length;
    if (words.length < 2 || words.length / rawCount < 0.6) return "";
    return words.slice(0, 12).join(" ");
  }
  return "";
}

/** Whitespace share of a keyframe (decoded tiny) — classifies text-slide vs screen. */
function keyframeBgShare(imagePath) {
  const w = 64, h = 36;
  const r = spawnSync(FFMPEG, [
    "-v", "error", "-i", imagePath, "-vf", `scale=${w}:${h}`,
    "-pix_fmt", "gray", "-f", "rawvideo", "-",
  ], { maxBuffer: w * h + 4096 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < w * h) return 0.5;
  const gray = r.stdout;
  const hist = new Uint32Array(32);
  for (let i = 0; i < w * h; i++) hist[gray[i] >> 3]++;
  let mode = 0;
  for (let b = 1; b < 32; b++) if (hist[b] > hist[mode]) mode = b;
  const lo = (mode << 3) - 20, hi = (mode << 3) + 28;
  let n = 0;
  for (let i = 0; i < w * h; i++) if (gray[i] >= lo && gray[i] <= hi) n++;
  return n / (w * h);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exact color sampling (true pixel means, not histogram bin centers)
// ─────────────────────────────────────────────────────────────────────────────

function decodeTiny(videoPath, sampleFps, w, h) {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn(FFMPEG, [
      "-v", "error", "-i", videoPath,
      "-vf", `fps=${sampleFps},scale=${w}:${h}:flags=area`,
      "-pix_fmt", "rgb24", "-f", "rawvideo", "-",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    proc.stdout.on("data", (c) => chunks.push(c));
    proc.on("error", reject);
    proc.on("close", () => resolvePromise(Buffer.concat(chunks)));
  });
}

function luminance([r, g, b]) { return 0.299 * r + 0.587 * g + 0.114 * b; }
function colorDist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function saturation([r, g, b]) { return Math.max(r, g, b) - Math.min(r, g, b); }

/**
 * True palette for a time range: cluster pixels by posterized bucket and
 * return the mean color of the biggest clusters.
 */
function paletteForRange(colorData, startMs, endMs) {
  const { buf, frameBytes, sampleFps, frameCount } = colorData;
  const f0 = Math.max(0, Math.floor((startMs / 1000) * sampleFps));
  const f1 = Math.min(frameCount, Math.max(f0 + 1, Math.ceil((endMs / 1000) * sampleFps)));

  const sums = new Map(); // bucket → [rSum,gSum,bSum,count]
  for (let f = f0; f < f1; f++) {
    const off = f * frameBytes;
    for (let p = off; p < off + frameBytes; p += 3) {
      const r = buf[p], g = buf[p + 1], b = buf[p + 2];
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      let s = sums.get(key);
      if (!s) { s = [0, 0, 0, 0]; sums.set(key, s); }
      s[0] += r; s[1] += g; s[2] += b; s[3]++;
    }
  }
  if (sums.size === 0) return { bg: [246, 247, 249], panel: [255, 255, 255], accent: [50, 100, 210] };

  const clusters = [...sums.values()]
    .map((s) => ({ color: [s[0] / s[3], s[1] / s[3], s[2] / s[3]], n: s[3] }))
    .sort((a, b) => b.n - a.n);

  const bg = clusters[0].color;

  let panel = null;
  let accent = null;
  for (const c of clusters.slice(1, 14)) {
    const d = colorDist(c.color, bg);
    if (!panel && d > 18 && d <= 120) panel = c.color;
    if (!accent && d > 120) accent = c.color;
    if (panel && accent) break;
  }
  // Accent fallback: most saturated notable cluster
  if (!accent) {
    const sat = clusters.slice(1, 14).sort((a, b) => saturation(b.color) - saturation(a.color))[0];
    accent = sat && saturation(sat.color) > 30 ? sat.color
      : luminance(bg) > 128 ? [50, 100, 210] : [225, 228, 238];
  }
  if (!panel) {
    panel = luminance(bg) > 128 ? bg.map((v) => Math.max(0, v - 14)) : bg.map((v) => Math.min(255, v + 18));
  }

  const rnd = (c) => c.map((v) => Math.round(v));
  return { bg: rnd(bg), panel: rnd(panel), accent: rnd(accent) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Template extraction
// ─────────────────────────────────────────────────────────────────────────────

const TRANSITION_COVERAGE = 0.6; // animation segments above this = content swap
const PULSE_MERGE_MS = 350;      // merge pulses closer than this

/**
 * @param {string} videoPath
 * @param {{ sampleFps?: number, fps?: number, maxDurationMs?: number }} opts
 */
export async function extractTemplate(videoPath, opts = {}) {
  const assetsDir = opts.assetsDir || null;
  if (assetsDir) mkdirSync(assetsDir, { recursive: true });
  const sig = await extractSignature(videoPath, { sampleFps: opts.sampleFps ?? 8 });

  // Exact color stream (small: 32x18 @ 2fps)
  const COLOR_W = 32, COLOR_H = 18, COLOR_FPS = 2;
  const colorBuf = await decodeTiny(videoPath, COLOR_FPS, COLOR_W, COLOR_H);
  const colorData = {
    buf: colorBuf,
    frameBytes: COLOR_W * COLOR_H * 3,
    sampleFps: COLOR_FPS,
    frameCount: Math.floor(colorBuf.length / (COLOR_W * COLOR_H * 3)),
  };

  const durationMs = Math.min(sig.durationMs, opts.maxDurationMs ?? Infinity);
  const cellPxY = sig.height / sig.frameH;
  const cellPxX = sig.width / sig.frameW;

  // ── Timeline events from segments ──────────────────────────────────────────
  const timeline = [];
  for (const s of sig.segments) {
    if (s.startMs >= durationMs) continue;
    const durMs = Math.round(s.endMs - s.startMs);
    const region = s.bbox
      ? { x: +(((s.bbox.x0 + s.bbox.x1) / 2).toFixed(3)), y: +(((s.bbox.y0 + s.bbox.y1) / 2).toFixed(3)) }
      : { x: 0.5, y: 0.5 };

    switch (s.type) {
      case "animation": {
        if (s.coverage >= TRANSITION_COVERAGE) {
          // Keep transitions as sharp as the reference — punchy demo pops
          // ~300ms: 2-3 analysis samples with strong per-sample change
          // (animation-class). Real-content backgrounds keep histograms stable
          // across swaps, so sharp transitions don't read as spurious cuts.
          const minSpread = s.coverage >= 0.7 ? 420 : 300;
          timeline.push({ type: "transition", tMs: Math.round(s.startMs), durMs: Math.min(Math.max(durMs, minSpread), 600), coverage: +s.coverage.toFixed(2) });
        } else {
          timeline.push({ type: "pulse", tMs: Math.round(s.startMs), durMs: Math.max(durMs, 350), region, coverage: +s.coverage.toFixed(2) });
        }
        break;
      }
      case "micro": {
        timeline.push({ type: "pulse", tMs: Math.round(s.startMs), durMs: Math.max(durMs, 320), region, coverage: +Math.max(s.coverage, 0.03).toFixed(2) });
        break;
      }
      case "scroll": {
        const rawScroll = s.vShift * cellPxY;
        const distance = Math.round(Math.sign(rawScroll) * Math.max(Math.abs(rawScroll) * 2, 44));
        if (Math.abs(rawScroll) >= 8) {
          // Cap per-sample speed (~55px per 125ms) — faster reads as a hard cut
          const minDur = Math.ceil(Math.abs(distance) / 55) * 125;
          const maxDur = Math.max(250, Math.floor(Math.abs(distance) / 22) * 125);
          timeline.push({ type: "scroll", tMs: Math.round(s.startMs), durMs: Math.min(Math.max(durMs, 250, minDur), maxDur), distance });
        }
        break;
      }
      case "pan": {
        // Amplify so the rendered per-sample shift clears the detector's cell size
        const rawPan = s.hShift * cellPxX;
        const distance = Math.round(Math.sign(rawPan) * Math.min(Math.max(Math.abs(rawPan) * 2.5, 30), 220));
        if (Math.abs(rawPan) >= 8) {
          const minDur = Math.ceil(Math.abs(distance) / 55) * 125;
          const maxDur = Math.max(250, Math.floor(Math.abs(distance) / 22) * 125);
          timeline.push({ type: "pan", tMs: Math.round(s.startMs), durMs: Math.min(Math.max(durMs, 250, minDur), maxDur), distance });
        } else {
          timeline.push({ type: "pulse", tMs: Math.round(s.startMs), durMs: Math.max(durMs, 320), region, coverage: +s.coverage.toFixed(2) });
        }
        break;
      }
    }
  }
  // Transitions too close to a hard cut would smear it — the cut must land clean
  const cutTimes = sig.cuts.filter((t) => t < durationMs);
  const moves = timeline.filter((e) => e.type === "scroll" || e.type === "pan");
  const cleaned = timeline
    .filter((e) =>
      e.type !== "transition" ||
      !cutTimes.some((c) => Math.abs(e.tMs - c) < 500 || (e.tMs < c && e.tMs + e.durMs > c - 100)))
    .map((e) => {
      // A transition overlapping a scroll/pan muddies the translation signal
      // (reads as a spurious cut) — demote it to a pulse; the move itself
      // carries the motion.
      if (e.type === "transition" &&
          moves.some((mv) => e.tMs < mv.tMs + mv.durMs + 300 && e.tMs + e.durMs > mv.tMs - 300)) {
        return { type: "pulse", tMs: e.tMs, durMs: e.durMs, region: { x: 0.5, y: 0.45 }, coverage: 0.4 };
      }
      return e;
    });
  timeline.length = 0;
  timeline.push(...cleaned);

  timeline.sort((a, b) => a.tMs - b.tMs);

  // Merge pulses that are close in time (one UI reaction, several samples)
  const merged = [];
  for (const ev of timeline) {
    const prev = merged[merged.length - 1];
    if (ev.type === "pulse" && prev?.type === "pulse" &&
        ev.tMs - (prev.tMs + prev.durMs) < PULSE_MERGE_MS) {
      prev.durMs = Math.min(ev.tMs + ev.durMs - prev.tMs, 1200);
      prev.coverage = Math.max(prev.coverage, ev.coverage);
      continue;
    }
    merged.push(ev);
  }

  // ── Scenes (split at hard cuts), with per-beat palettes ───────────────────
  const sceneStarts = [0, ...sig.cuts.filter((t) => t < durationMs)];
  const scenes = sceneStarts.map((startMs, i) => {
    const endMs = sceneStarts[i + 1] ?? durationMs;
    const pal = paletteForRange(colorData, startMs, endMs);

    // Beats: palette re-sampled between transitions, so the render tracks
    // the reference's color timeline within the scene.
    const marks = [startMs,
      ...merged.filter((e) => e.type === "transition" && e.tMs > startMs && e.tMs < endMs).map((e) => e.tMs + e.durMs)];
    const beats = marks.map((m, k) => {
      const bEnd = marks[k + 1] ?? endMs;
      const bp = paletteForRange(colorData, m, bEnd);
      const beat = { tMs: Math.round(m), bg: bp.bg, panel: bp.panel, accent: bp.accent };

      if (assetsDir) {
        // Capture the reference's actual content for this beat: a keyframe
        // (used directly for dense "screen" beats, replaceable in stage 2)
        // and its OCR'd text (rendered as a clean text slide for sparse
        // "text" beats — same words as the reference).
        const mid = Math.min(m + Math.max((bEnd - m) * 0.35, 200), bEnd - 100);
        const frameName = `beat_${i}_${k}.png`;
        const framePath = join(assetsDir, frameName);
        if (extractKeyframe(videoPath, mid, framePath)) {
          beat.image = `${basename(assetsDir)}/${frameName}`;
          const share = keyframeBgShare(framePath);
          beat.style = share >= 0.72 ? "text" : "screen";
          const words = ocrImage(framePath);
          if (words) beat.text = words;
          if (beat.style === "text" && !beat.text) beat.style = "screen";
        }
      }
      return beat;
    });

    return {
      startMs: Math.round(startMs),
      bg: pal.bg, panel: pal.panel, accent: pal.accent,
      beats,
      // "image": "screenshots/scene-N.png"  ← stage-2 personalization hook
      _comment: `Scene ${i}: ${((endMs - startMs) / 1000).toFixed(1)}s. Set "image" to a product screenshot to personalize.`,
    };
  });

  return {
    _meta: {
      kind: "opendemo-video-template",
      stage: "1-generic",
      source: videoPath,
      generatedAt: new Date().toISOString(),
      referenceSummary: {
        durationMs: sig.durationMs,
        cuts: sig.cuts,
        eventCounts: merged.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {}),
      },
      personalization: [
        "This is an editable video template. Re-render after ANY edit with:",
        "  node render-mimic.mjs <this-file> --output out.mp4",
        "Then score against the reference:",
        "  node evaluate-mimic.mjs <reference> out.mp4",
        "Beat content: style 'text' renders beat.text as a big clean text slide;",
        "style 'screen' uses beat.image as the frame background. Edit either freely.",
        "To personalize for a product (stage 2):",
        "  1. Set scenes[i].image to product screenshots (any size; auto-scaled).",
        "  2. Adjust scenes[i].bg/panel/accent (and beats) to the product's brand colors.",
        "  3. Keep timeline timestamps — they reproduce the reference's rhythm.",
        "  4. Optionally edit/add/remove timeline events (transition/pulse/scroll/pan).",
      ],
    },
    video: {
      width: sig.width,
      height: sig.height,
      fps: opts.fps ?? 30,
      durationMs,
    },
    scenes,
    timeline: merged,
  };
}
