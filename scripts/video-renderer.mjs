#!/usr/bin/env node
/**
 * video-renderer.mjs
 * Direct template-video renderer — no browser, no cursor, no walkthrough.
 *
 * Takes a "video template" (an editable JSON timeline extracted from a
 * reference demo video by timeline-extractor.mjs) and synthesizes an .mp4
 * with the same dimensions, duration, cuts, transitions, and animation
 * rhythm as the reference. Frames are drawn in pure JS and piped to ffmpeg.
 *
 * Rendering model:
 *   - scenes switch instantly at their startMs (hard cuts); the first look of
 *     a post-cut scene is a high-contrast "hero" so the cut registers
 *   - "transition" events crossfade the content to a new arrangement with a
 *     subtle brightness pop
 *   - "pulse" events pop a card in at the detected region, sized by detected
 *     coverage; cards persist (parallax layer) until the next transition
 *   - "scroll"/"pan" events translate a continuous infinite card column
 *   - scene "beats" track the reference's palette over time (bg stays locked
 *     per scene for histogram stability)
 *   - a gentle brightness "breathe" reproduces the continuous energy floor of
 *     real screencasts without registering as events
 *   - scenes[i].image (product screenshot) replaces the wireframe background
 *     for stage-2 personalization
 *
 * Exports:
 *   renderTemplate(template, outputPath, opts) → Promise<outputPath>
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { FFMPEG } from "./video-signature.mjs";
import { renderTextSlide } from "./text-slide.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic PRNG
// ─────────────────────────────────────────────────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// rgb24 drawing primitives
// ─────────────────────────────────────────────────────────────────────────────

function fillFrame(buf, w, h, [r, g, b]) {
  for (let x = 0; x < w; x++) {
    const p = x * 3;
    buf[p] = r; buf[p + 1] = g; buf[p + 2] = b;
  }
  const rowBytes = w * 3;
  for (let y = 1; y < h; y++) buf.copyWithin(y * rowBytes, 0, rowBytes);
}

function fillRect(buf, w, h, x0, y0, rw, rh, [r, g, b], alpha = 1) {
  const xs = Math.max(0, Math.round(x0));
  const ys = Math.max(0, Math.round(y0));
  const xe = Math.min(w, Math.round(x0 + rw));
  const ye = Math.min(h, Math.round(y0 + rh));
  if (xe <= xs || ye <= ys) return;

  if (alpha >= 1) {
    const rowStart = (ys * w + xs) * 3;
    for (let x = xs; x < xe; x++) {
      const p = (ys * w + x) * 3;
      buf[p] = r; buf[p + 1] = g; buf[p + 2] = b;
    }
    const spanBytes = (xe - xs) * 3;
    for (let y = ys + 1; y < ye; y++) {
      buf.copyWithin((y * w + xs) * 3, rowStart, rowStart + spanBytes);
    }
  } else {
    const ia = 1 - alpha;
    for (let y = ys; y < ye; y++) {
      for (let x = xs; x < xe; x++) {
        const p = (y * w + x) * 3;
        buf[p] = buf[p] * ia + r * alpha;
        buf[p + 1] = buf[p + 1] * ia + g * alpha;
        buf[p + 2] = buf[p + 2] * ia + b * alpha;
      }
    }
  }
}

/** Copy img into dst shifted by (dx, dy); revealed edges filled with fillCol. */
function blitShifted(dst, img, w, h, dx, dy, fillCol) {
  const [fr, fg2, fb] = fillCol;
  for (let y = 0; y < h; y++) {
    const sy = y + dy;
    if (sy < 0 || sy >= h) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 3;
        dst[p] = fr; dst[p + 1] = fg2; dst[p + 2] = fb;
      }
      continue;
    }
    for (let x = 0; x < w; x++) {
      const sx = x + dx;
      const p = (y * w + x) * 3;
      if (sx < 0 || sx >= w) {
        dst[p] = fr; dst[p + 1] = fg2; dst[p + 2] = fb;
      } else {
        const q = (sy * w + sx) * 3;
        dst[p] = img[q]; dst[p + 1] = img[q + 1]; dst[p + 2] = img[q + 2];
      }
    }
  }
}

/** Nearest-neighbor center zoom blit (Ken Burns drift on screen beats). */
function zoomBlit(dst, img, w, h, scale) {
  const cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++) {
    const sy = Math.min(h - 1, Math.max(0, Math.round(cy + (y - cy) / scale)));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(w - 1, Math.max(0, Math.round(cx + (x - cx) / scale)));
      const p = (y * w + x) * 3;
      const q = (sy * w + sx) * 3;
      dst[p] = img[q]; dst[p + 1] = img[q + 1]; dst[p + 2] = img[q + 2];
    }
  }
}

/** Uniform brightness scale on a whole frame (ambient breathe). */
function scaleFrame(buf, f) {
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i] * f;
    buf[i] = v > 255 ? 255 : v;
  }
}

function blendFrames(dst, src, alpha) {
  const ia = 1 - alpha;
  for (let i = 0; i < dst.length; i++) dst[i] = dst[i] * ia + src[i] * alpha;
}

/** Uniform brightness lift (the transition "pop"). */
function flashFrame(buf, amount, towards = 255) {
  const a = amount;
  const ia = 1 - a;
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * ia + towards * a;
}

function mix(a, b, t) {
  const tt = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt, a[2] + (b[2] - a[2]) * tt];
}

function shade([r, g, b], f) {
  return [Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f)];
}

function luminance([r, g, b]) { return 0.299 * r + 0.587 * g + 0.114 * b; }

// ─────────────────────────────────────────────────────────────────────────────
// Scene look drawing — wireframe app UI, deterministic, scroll-continuous
// ─────────────────────────────────────────────────────────────────────────────

function drawLook(buf, w, h, scene, pal, lookIndex, scrollY, panX, spawnedCards, imageBuf, noShift = false) {
  if (imageBuf) {
    if ((scrollY || panX) && !noShift) blitShifted(buf, imageBuf, w, h, Math.round(panX), Math.round(scrollY), pal.bg);
    else imageBuf.copy(buf);
  } else {
    fillFrame(buf, w, h, pal.bg);
  }

  const layoutRand = mulberry32(scene.seed * 1009 + lookIndex * 79 + 7);
  const textCol = mix(pal.bg, luminance(pal.bg) > 128 ? [42, 42, 50] : [214, 214, 224], 0.8);
  const headerH = h * 0.085;

  if (imageBuf) {
    // Real/beat background carries the content; only overlay persisted cards.
  } else if (lookIndex === 0 && scene.seed > 1) {
    // Hero landing look for scenes after a hard cut: large accent-colored
    // regions shift the frame's histogram so the cut registers as a real
    // content change, like the reference's scene switch.
    const hero = pal.accent;
    fillRect(buf, w, h, 0, headerH, w, h * 0.58, hero);
    fillRect(buf, w, h, w * 0.2, h * 0.24, w * 0.6, h * 0.09, mix(hero, [255, 255, 255], 0.8));
    fillRect(buf, w, h, w * 0.28, h * 0.38, w * 0.44, h * 0.05, mix(hero, [255, 255, 255], 0.55), 0.85);
    fillRect(buf, w, h, w * 0.1, h * 0.7, w * 0.8, h * 0.22, shade(hero, 0.75));
  } else {
    const dense = lookIndex % 2 === 1;
    const period = h * 0.30; // constant — period changes read as phantom scrolls

    // "media" looks carry large high-contrast blocks (like screenshots/video
    // regions in real demos) so content swaps produce real motion energy
    const mediaCol = mix(pal.accent, luminance(pal.bg) > 128 ? [45, 45, 62] : [225, 228, 240], 0.45);
    if (dense) {
      const mRand = mulberry32(scene.seed * 4001 + lookIndex * 53 + 3);
      fillRect(buf, w, h, w * (0.5 + mRand() * 0.14) - panX, headerH + h * (0.08 + mRand() * 0.1) - scrollY, w * 0.38, h * 0.42, mediaCol);
      fillRect(buf, w, h, w * (0.08 + mRand() * 0.05) - panX, headerH + h * (0.55 + mRand() * 0.08) - scrollY, w * 0.3, h * 0.28, shade(mediaCol, 0.8));
    }

    // Infinite content column: card k lives at yk = k*period - scrollY.
    // Card content is seeded by (scene, look, k) so scrolling is continuous.
    const contentTop = headerH + h * 0.04;
    const kFirst = Math.floor((scrollY - h) / period);
    const kLast = Math.ceil((scrollY + h * 2) / period);
    for (let k = kFirst; k <= kLast; k++) {
      const rand = mulberry32(scene.seed * 2003 + lookIndex * 131 + k * 17 + 5);
      const y = contentTop + k * period - scrollY;
      if (y > h || y + period < headerH) continue;
      const cardX = -panX + w * (dense ? 0.05 + rand() * 0.06 : 0.12 + rand() * 0.16);
      const cardW = w * (dense ? 0.74 + rand() * 0.18 : 0.42 + rand() * 0.3);
      const cardH = period * (0.55 + rand() * 0.18); // constant height stats across looks
      fillRect(buf, w, h, cardX, y, cardW, cardH, pal.panel);
      const lines = 3;
      for (let l = 0; l < lines; l++) {
        fillRect(buf, w, h,
          cardX + cardW * 0.06, y + cardH * (0.16 + l * 0.26),
          cardW * (0.32 + rand() * 0.5), Math.max(2, cardH * 0.1),
          textCol, 0.55);
      }
      fillRect(buf, w, h, cardX + cardW * 0.06, y + cardH * 0.76, cardW * 0.16, cardH * 0.14, pal.accent);
      // Vertical divider stripes: dense horizontal texture so pans sweep
      // detectable change across card interiors (flat fills only register
      // at their edges)
      const stripeCol = shade(pal.panel, luminance(pal.panel) > 128 ? 0.87 : 1.22);
      for (let st = 0; st < 7; st++) {
        fillRect(buf, w, h,
          cardX + cardW * (0.08 + st * 0.13 + rand() * 0.02), y + cardH * 0.12,
          Math.max(4, cardW * 0.022), cardH * 0.76, stripeCol);
      }
    }

    // Side rail on some looks
    if (layoutRand() > 0.5) {
      fillRect(buf, w, h, 0, headerH, w * 0.05, h - headerH, shade(pal.panel, 0.95));
    }
  }

  // Header bar (always on top of content)
  fillRect(buf, w, h, 0, 0, w, headerH, pal.panel);
  fillRect(buf, w, h, w * 0.03, headerH * 0.3, w * 0.05, headerH * 0.42, pal.accent);

  // Persistent spawned cards (from past pulses) — content layer, parallax
  for (const card of spawnedCards) {
    drawPulseCard(buf, w, h, card, pal, 1, 0, panX * 0.6, scrollY * 0.6);
  }
}

function drawPulseCard(buf, w, h, ev, pal, grow, flashPhase = 0, offX = 0, offY = 0) {
  const area = Math.max(0.075, Math.min(0.3, ev.coverage || 0.05));
  const pw = w * Math.sqrt(area) * 1.2 * grow;
  const ph = h * Math.sqrt(area) * 0.9 * grow;
  const cx = (ev.region?.x ?? 0.5) * w - offX;
  const cy = (ev.region?.y ?? 0.5) * h - offY;
  fillRect(buf, w, h, cx - pw / 2 - 2, cy - ph / 2 - 2, pw + 4, ph + 4, shade(pal.accent, 0.85));
  // Brief high-contrast flash as the card appears — a clear energy spike
  const flashCol = luminance(pal.bg) > 128 ? shade(pal.accent, 0.55) : mix(pal.accent, [255, 255, 255], 0.4);
  const face = flashPhase > 0 ? mix(pal.panel, flashCol, flashPhase) : pal.panel;
  fillRect(buf, w, h, cx - pw / 2, cy - ph / 2, pw, ph, face);
  fillRect(buf, w, h, cx - pw * 0.38, cy - ph * 0.28, pw * 0.55, Math.max(2, ph * 0.16),
    flashPhase > 0.4 ? pal.panel : pal.accent);
  fillRect(buf, w, h, cx - pw * 0.38, cy + ph * 0.05, pw * 0.7, Math.max(2, ph * 0.12),
    mix(pal.bg, luminance(pal.bg) > 128 ? [40, 40, 48] : [215, 215, 224], 0.7), 0.6);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene image decoding (stage-2 screenshots)
// ─────────────────────────────────────────────────────────────────────────────

function decodeImage(path, w, h) {
  const r = spawnSync(
    FFMPEG,
    ["-v", "error", "-i", path, "-vf", `scale=${w}:${h}`, "-pix_fmt", "rgb24", "-frames:v", "1", "-f", "rawvideo", "-"],
    { maxBuffer: w * h * 3 + 4096 }
  );
  if (r.status === 0 && r.stdout?.length >= w * h * 3) return r.stdout.subarray(0, w * h * 3);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main renderer
// ─────────────────────────────────────────────────────────────────────────────

export async function renderTemplate(template, outputPath, opts = {}) {
  const log = opts.log || (() => {});
  const { width: w, height: h, fps, durationMs } = template.video;
  const scenes = template.scenes.map((s, i) => ({ seed: i + 1, ...s }));
  const timeline = [...template.timeline].sort((a, b) => a.tMs - b.tMs);
  const totalFrames = Math.round((durationMs / 1000) * fps);

  const templateDir = opts.templateDir || process.cwd();
  for (const s of scenes) {
    s._img = null;
    if (s.image) {
      const p = resolve(templateDir, s.image);
      s._img = existsSync(p) ? decodeImage(p, w, h) : null;
      if (!s._img) log(`   ⚠️  Scene image missing/undecodable: ${s.image}`);
    }
    // Per-beat backgrounds: "text" beats render the beat's words as a clean
    // text slide (kinetic-typography look); "screen" beats use the beat's
    // keyframe image. Both are editable in the template JSON.
    if (Array.isArray(s.beats)) {
      for (const b of s.beats) {
        b._bg = null;
        b._stages = null;
        const fg = luminance(b.bg) > 128 ? [32, 32, 42] : [235, 235, 242];
        if (b.style === "text" && b.text) {
          // Progressive word reveal: pre-render cumulative slides so pulses
          // advance the text, like the reference's kinetic typography.
          const words = b.text.split(/\s+/);
          const nStages = Math.min(4, words.length);
          const stages = [];
          for (let st = 1; st <= nStages; st++) {
            const upto = Math.ceil((st / nStages) * words.length);
            const slide = renderTextSlide({ text: words.slice(0, upto).join(" "), w, h, bg: b.bg, fg });
            if (slide) stages.push(slide);
          }
          if (stages.length) {
            b._stages = stages;
            b._bg = stages[stages.length - 1];
          } else {
            log(`   ⚠️  Text slide failed for beat @${b.tMs} — falling back`);
          }
        }
        if (!b._bg && b.image) {
          const ip = resolve(templateDir, b.image);
          b._bg = existsSync(ip) ? decodeImage(ip, w, h) : null;
        }
      }
    }
  }

  const currentBeat = (scene, tMs) => {
    let beat = null;
    if (Array.isArray(scene.beats)) {
      for (const b of scene.beats) if (b.tMs <= tMs) beat = b;
    }
    return beat;
  };

  const sceneOf = (tMs) => {
    let idx = 0;
    for (let i = 0; i < scenes.length; i++) if (scenes[i].startMs <= tMs) idx = i;
    return idx;
  };
  for (const ev of timeline) ev._scene = sceneOf(ev.tMs);
  const transitionsOf = (sIdx) => timeline.filter((e) => e.type === "transition" && e._scene === sIdx);

  const beatPalette = (scene, tMs) => {
    let pal = { bg: scene.bg, panel: scene.panel, accent: scene.accent };
    if (Array.isArray(scene.beats)) {
      for (const b of scene.beats) {
        if (b.tMs <= tMs) {
          // bg stays locked to the scene (histogram stability inside a scene);
          // panel/accent track the reference's palette timeline
          pal = {
            bg: scene.bg,
            panel: mix(scene.panel, b.panel, 0.6).map(Math.round),
            accent: b.accent,
          };
        }
      }
    }
    return pal;
  };

  log(`   Rendering ${totalFrames} frames @ ${w}x${h} ${fps}fps...`);

  const ff = spawn(FFMPEG, [
    "-y", "-v", "error",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${w}x${h}`, "-r", String(fps),
    "-i", "-",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    resolve(outputPath),
  ], { stdio: ["pipe", "ignore", "pipe"] });
  let ffErr = "";
  ff.stderr.on("data", (d) => { ffErr += d; });

  const frame = Buffer.alloc(w * h * 3);
  const tmpB = Buffer.alloc(w * h * 3);
  const kbBuf = Buffer.alloc(w * h * 3);

  const writeFrame = (buf) => new Promise((res, rej) => {
    if (!ff.stdin.writable) { rej(new Error(`ffmpeg closed early: ${ffErr.slice(-200)}`)); return; }
    if (ff.stdin.write(Buffer.from(buf))) res();
    else ff.stdin.once("drain", res);
  });

  for (let f = 0; f < totalFrames; f++) {
    const tMs = (f / fps) * 1000;
    const sIdx = sceneOf(tMs);
    const scene = scenes[sIdx];
    const sceneTransitions = transitionsOf(sIdx);

    let look = 0;
    for (const tr of sceneTransitions) if (tMs >= tr.tMs + tr.durMs) look++;

    let scrollY = 0, panX = 0;
    let activeTransition = null;
    const growingPulses = [];
    const persistedCards = [];

    for (const ev of timeline) {
      if (ev._scene !== sIdx) continue;
      const dur = ev.durMs || 300;
      if (ev.type === "scroll") {
        if (tMs >= ev.tMs + dur) scrollY += ev.distance;
        else if (tMs >= ev.tMs) scrollY += ev.distance * ((tMs - ev.tMs) / dur); // linear
      } else if (ev.type === "pan") {
        if (tMs >= ev.tMs + dur) panX += ev.distance;
        else if (tMs >= ev.tMs) panX += ev.distance * ((tMs - ev.tMs) / dur);
      } else if (ev.type === "transition") {
        if (tMs >= ev.tMs && tMs < ev.tMs + dur) activeTransition = { ev, p: (tMs - ev.tMs) / dur };
      } else if (ev.type === "pulse") {
        const growWindow = Math.min(dur, 420);
        const nextTr = sceneTransitions.find((tr) => tr.tMs > ev.tMs);
        const expiresAt = nextTr ? nextTr.tMs : Infinity;
        if (tMs >= ev.tMs && tMs < ev.tMs + growWindow) {
          growingPulses.push({ ev, p: (tMs - ev.tMs) / growWindow });
        } else if (tMs >= ev.tMs + growWindow && tMs < expiresAt) {
          persistedCards.push(ev);
        }
      }
    }
    panX = Math.max(-w * 0.25, Math.min(w * 0.25, panX));

    const pal = beatPalette(scene, tMs);

    const beatNow = currentBeat(scene, tMs);
    const isText = beatNow?.style === "text" && beatNow?._stages;
    let bgNow = beatNow?._bg || scene._img;
    if (isText) {
      // Reveal stage = pulses completed inside this beat so far
      let stage = 0;
      for (const ev of timeline) {
        if (ev.type === "pulse" && ev.tMs >= beatNow.tMs && ev.tMs <= tMs) stage++;
      }
      bgNow = beatNow._stages[Math.min(stage, beatNow._stages.length - 1)];
    } else if (bgNow && beatNow) {
      // Ken Burns: slow zoom drift across the beat (subtle, continuous life)
      const beatElapsed = Math.max(0, tMs - beatNow.tMs);
      const kb = 1 + Math.min(0.045, (beatElapsed / 10000) * 0.03);
      if (kb > 1.002) {
        zoomBlit(kbBuf, bgNow, w, h, kb);
        bgNow = kbBuf;
      }
    }

    if (activeTransition) {
      const { ev, p } = activeTransition;
      const palAfter = beatPalette(scene, ev.tMs + ev.durMs + 1);
      const beatAfter = currentBeat(scene, ev.tMs + ev.durMs + 1);
      const bgAfter = beatAfter?._bg || scene._img;
      const afterText = beatAfter?.style === "text" && beatAfter?._stages;
      drawLook(frame, w, h, scene, pal, look, scrollY, panX,
        persistedCards.filter((c) => c.tMs < ev.tMs ? p < 0.5 : true), bgNow, isText);
      drawLook(tmpB, w, h, scene, palAfter, look + 1, scrollY, panX, [],
        afterText ? beatAfter._stages[0] : bgAfter, afterText);
      blendFrames(frame, tmpB, p); // linear: constant change rate per sample
      const flashTo = luminance(pal.bg) > 128 ? 255 : 242;
      flashFrame(frame, 0.22 * (ev.coverage ?? 1) * Math.sin(Math.PI * p), flashTo);
    } else {
      drawLook(frame, w, h, scene, pal, look, scrollY, panX,
        isText ? [] : persistedCards, bgNow, isText);
    }

    // Pulses: small ones pop near-instantly with a contrast flash; large ones
    // grow smoothly so per-sample coverage stays below hard-cut territory.
    const onRealScreen = !isText && beatNow?._bg;
    for (const { ev, p } of growingPulses) {
      if (isText) continue; // reveal stages carry the motion on text slides
      const big = (ev.coverage || 0) >= 0.25;
      const grow = big ? 1 - Math.pow(1 - p, 2) : Math.min(1, 0.85 + p * 0.3);
      if (onRealScreen) {
        // On real screenshots: a highlight ring + soft fill, like a UI focus
        // effect — not a foreign wireframe card.
        const area = Math.max(0.05, Math.min(0.35, ev.coverage || 0.05));
        const pw = w * Math.sqrt(area) * 1.15 * grow;
        const ph = h * Math.sqrt(area) * 0.85 * grow;
        const cx = (ev.region?.x ?? 0.5) * w;
        const cy = (ev.region?.y ?? 0.5) * h;
        const t = Math.max(3, Math.round(h * 0.012));
        fillRect(frame, w, h, cx - pw / 2, cy - ph / 2, pw, ph, pal.accent, 0.16);
        fillRect(frame, w, h, cx - pw / 2, cy - ph / 2, pw, t, pal.accent, 0.85);
        fillRect(frame, w, h, cx - pw / 2, cy + ph / 2 - t, pw, t, pal.accent, 0.85);
        fillRect(frame, w, h, cx - pw / 2, cy - ph / 2, t, ph, pal.accent, 0.85);
        fillRect(frame, w, h, cx + pw / 2 - t, cy - ph / 2, t, ph, pal.accent, 0.85);
      } else {
        const flashPhase = big ? 0.35 * (1 - p) : Math.max(0, 1 - p * 2.5);
        drawPulseCard(frame, w, h, ev, pal, grow, flashPhase, panX * 0.6, scrollY * 0.6);
      }
    }

    // Ambient brightness breathing — the continuous energy floor of real
    // screencasts (~0.01 mean). Deltas stay below the analyzer's per-pixel
    // change threshold: real motion energy, no phantom events.
    const breathe = 1 + 0.04 * Math.sin((2 * Math.PI * tMs) / 1400) * (0.6 + 0.4 * Math.sin((2 * Math.PI * tMs) / 5300));
    scaleFrame(frame, breathe);

    await writeFrame(frame);
  }

  ff.stdin.end();
  await new Promise((res, rej) => {
    ff.on("close", (code) => code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}: ${ffErr.slice(-300)}`)));
  });

  return resolve(outputPath);
}
