#!/usr/bin/env node
/**
 * glyph-motion.mjs
 * OpenDemo — L1 (glyph-level motion extraction) + L2 (easing-curve fitting)
 *
 * The measurement half of the "copy a real video's text motion" pipeline.
 * Where video-signature.mjs looks at whole frames at 8fps on a 160x90 gray
 * thumbnail, this looks at INDIVIDUAL GLYPHS at the video's native framerate
 * and full resolution, and fits an actual easing curve to how each one moves.
 *
 * The point: an AI asked to "make text animate like this video" guesses, and
 * guesses land on constant ease-in-out — the tell-tale bouncy AI look. Here we
 * MEASURE displacement, opacity, blur, scale and stagger per glyph, then fit
 * the measurement against a catalog of easing families that deliberately
 * includes the ones a guess never picks: step (hard cut), exponential decay,
 * anticipation/back, and damped springs. The renderer downstream is handed
 * numbers, not adjectives.
 *
 * Pipeline:
 *   1. motionProfile()  — per-frame global diff at NATIVE fps → bursts / holds
 *   2. segmentGlyphs()  — connected-ish glyph boxes on a settled frame
 *   3. trackGlyphs()    — per-glyph per-frame ink / dx / dy / sharpness / spread
 *   4. fitCurve()       — least-squares fit vs. an easing catalog, keeps residual
 *
 * Exports: analyzeVideo, motionProfile, segmentGlyphs, trackGlyphs, fitCurve
 *
 * CLI:
 *   node scripts/glyph-motion.mjs <video> [--template t.json] [--out report.json]
 */

import { spawn } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FFMPEG, getVideoMeta } from "../../scripts/video-signature.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Frame streaming
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Streams a time range as rgb24 frames, invoking onFrame(buf, idx) per frame.
 * Frames are NOT retained — the callback must extract what it needs.
 */
function streamRange(videoPath, startMs, durMs, w, h, onFrame) {
  return new Promise((res, rej) => {
    const args = ["-v", "error"];
    if (startMs > 0) args.push("-ss", (startMs / 1000).toFixed(3));
    args.push("-i", videoPath);
    if (durMs != null) args.push("-t", (durMs / 1000).toFixed(3));
    args.push("-vf", `scale=${w}:${h}:flags=area`, "-pix_fmt", "rgb24", "-f", "rawvideo", "-");

    const p = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
    const frameBytes = w * h * 3;
    let acc = null;
    let idx = 0;
    let err = "";
    p.stderr.on("data", (d) => { err += d; });
    p.stdout.on("data", (chunk) => {
      acc = acc && acc.length ? Buffer.concat([acc, chunk]) : chunk;
      while (acc.length >= frameBytes) {
        onFrame(acc.subarray(0, frameBytes), idx++);
        acc = acc.subarray(frameBytes);
      }
    });
    p.on("error", rej);
    p.on("close", (c) => (c === 0 ? res(idx) : rej(new Error(`ffmpeg ${c}: ${err.slice(-300)}`))));
  });
}

/** Collects a range into an array of retained Buffers (bounded by maxFrames). */
async function collectRange(videoPath, startMs, durMs, w, h, maxFrames = 240) {
  const frames = [];
  await streamRange(videoPath, startMs, durMs, w, h, (buf) => {
    if (frames.length < maxFrames) frames.push(Buffer.from(buf));
  });
  return frames;
}

// ─────────────────────────────────────────────────────────────────────────────
// L1a — motion profile at native fps → bursts and holds
// ─────────────────────────────────────────────────────────────────────────────

function toGray(buf, w, h) {
  const g = new Float32Array(w * h);
  for (let i = 0, p = 0; i < g.length; i++, p += 3) {
    g[i] = 0.299 * buf[p] + 0.587 * buf[p + 1] + 0.114 * buf[p + 2];
  }
  return g;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[s.length >> 1];
}

/**
 * Per-frame global diff at native fps. This is the macro pacing signal — the
 * existing 8fps signature cannot resolve a 4-frame fade, which is precisely the
 * kind of edit that separates hand-made motion from generated motion.
 */
export async function motionProfile(videoPath, opts = {}) {
  const w = opts.w ?? 160;
  const h = opts.h ?? 90;
  const meta = getVideoMeta(videoPath);
  const fps = opts.fps ?? meta.fps;
  const diffs = [];
  let prev = null;
  await streamRange(videoPath, 0, null, w, h, (buf) => {
    const g = toGray(buf, w, h);
    if (prev) {
      let s = 0;
      for (let k = 0; k < g.length; k++) s += Math.abs(g[k] - prev[k]);
      diffs.push(s / (g.length * 255));
    }
    prev = g;
  });
  return { diffs, fps, meta };
}

/**
 * Splits the motion profile into bursts (something is moving) and holds
 * (nothing is). The burst WIDTH is the interesting part: a 1-frame burst is a
 * hard cut, 2-5 frames is a snap or short fade, 20+ frames is a slow dissolve.
 * Generated motion graphics are overwhelmingly mid-width and uniform.
 */
export function segmentBursts(diffs, fps, opts = {}) {
  const med = median(diffs);
  const mad = median(diffs.map((d) => Math.abs(d - med))) || 1e-6;
  const thr = opts.threshold ?? Math.max(med + 3 * mad, 0.0025);
  const joinGap = opts.joinGap ?? 2; // frames of quiet that don't end a burst

  const bursts = [];
  let i = 0;
  while (i < diffs.length) {
    if (diffs[i] < thr) { i++; continue; }
    let j = i;
    let quiet = 0;
    while (j < diffs.length && quiet <= joinGap) {
      if (diffs[j] >= thr) quiet = 0;
      else quiet++;
      j++;
    }
    const end = j - quiet;
    const slice = diffs.slice(i, Math.max(end, i + 1));
    bursts.push({
      startFrame: i,
      endFrame: end,
      frames: Math.max(1, end - i),
      startMs: (i / fps) * 1000,
      endMs: (end / fps) * 1000,
      peak: Math.max(...slice),
      area: slice.reduce((a, b) => a + b, 0),
    });
    i = j;
  }

  const holds = [];
  let cursor = 0;
  for (const b of bursts) {
    if (b.startFrame > cursor) {
      holds.push({
        startFrame: cursor, endFrame: b.startFrame,
        frames: b.startFrame - cursor,
        startMs: (cursor / fps) * 1000, endMs: (b.startFrame / fps) * 1000,
      });
    }
    cursor = b.endFrame;
  }
  if (cursor < diffs.length) {
    holds.push({
      startFrame: cursor, endFrame: diffs.length, frames: diffs.length - cursor,
      startMs: (cursor / fps) * 1000, endMs: (diffs.length / fps) * 1000,
    });
  }

  for (const b of bursts) b.kind = classifyBurst(b);
  return { bursts, holds, threshold: thr };
}

function classifyBurst(b) {
  if (b.frames <= 1 && b.peak > 0.08) return "cut";
  if (b.frames <= 2) return "snap";
  if (b.frames <= 5) return "short-fade";
  if (b.frames <= 15) return "animation";
  if (b.frames <= 40) return "long-animation";
  return "sustained";
}

// ─────────────────────────────────────────────────────────────────────────────
// L1b — ink map + glyph segmentation on a settled frame
// ─────────────────────────────────────────────────────────────────────────────

/** Modal background colour, from a coarse 3D colour histogram. */
function estimateBg(buf, w, h) {
  const bins = new Map();
  const step = Math.max(1, Math.floor((w * h) / 20000));
  for (let i = 0; i < w * h; i += step) {
    const p = i * 3;
    const key = ((buf[p] >> 3) << 10) | ((buf[p + 1] >> 3) << 5) | (buf[p + 2] >> 3);
    bins.set(key, (bins.get(key) || 0) + 1);
  }
  let bestKey = 0, bestN = -1;
  for (const [k, n] of bins) if (n > bestN) { bestN = n; bestKey = k; }
  return [((bestKey >> 10) & 31) << 3, ((bestKey >> 5) & 31) << 3, (bestKey & 31) << 3];
}

/**
 * Soft ink map in [0,1] — distance from background, not a hard threshold, so
 * opacity and blur are both measurable rather than quantised away.
 */
function inkMap(buf, w, h, bg, lo = 10, hi = 70) {
  const ink = new Float32Array(w * h);
  const [br, bgc, bb] = bg;
  for (let i = 0, p = 0; i < ink.length; i++, p += 3) {
    const d = (Math.abs(buf[p] - br) + Math.abs(buf[p + 1] - bgc) + Math.abs(buf[p + 2] - bb)) / 3;
    ink[i] = d <= lo ? 0 : d >= hi ? 1 : (d - lo) / (hi - lo);
  }
  return ink;
}

function rowProfile(ink, w, h, x0, x1, y0, y1) {
  const prof = new Float32Array(y1 - y0);
  for (let y = y0; y < y1; y++) {
    let s = 0;
    for (let x = x0; x < x1; x++) s += ink[y * w + x];
    prof[y - y0] = s;
  }
  return prof;
}

function colProfile(ink, w, h, x0, x1, y0, y1) {
  const prof = new Float32Array(x1 - x0);
  for (let x = x0; x < x1; x++) {
    let s = 0;
    for (let y = y0; y < y1; y++) s += ink[y * w + x];
    prof[x - x0] = s;
  }
  return prof;
}

/** Runs of consecutive indices where prof exceeds `frac` of its own max. */
function runsAbove(prof, frac, minLen = 1) {
  const max = Math.max(...prof);
  if (max <= 0) return [];
  const thr = max * frac;
  const runs = [];
  let start = -1;
  for (let i = 0; i < prof.length; i++) {
    if (prof[i] > thr) { if (start < 0) start = i; }
    else if (start >= 0) { if (i - start >= minLen) runs.push([start, i]); start = -1; }
  }
  if (start >= 0 && prof.length - start >= minLen) runs.push([start, prof.length]);
  return runs;
}

/**
 * Splits an over-wide ink run at interior column-profile minima. Only applies
 * to runs wider than a plausible single glyph, so normal letters pass through
 * untouched.
 */
function splitWideRun(cols, x0, x1, bandH, opts = {}) {
  const maxGlyphW = bandH * (opts.maxGlyphWidthFrac ?? 1.1);
  if (x1 - x0 <= maxGlyphW) return [[x0, x1]];
  const minW = Math.max(3, Math.round(bandH * (opts.minGlyphWidthFrac ?? 0.16)));
  const seg = Array.from(cols.slice(x0, x1));
  const segMax = Math.max(...seg);
  if (segMax <= 0) return [[x0, x1]];

  // Candidate cuts: interior local minima, ranked by how deep they are.
  const cands = [];
  for (let i = minW; i < seg.length - minW; i++) {
    if (seg[i] <= seg[i - 1] && seg[i] <= seg[i + 1] && seg[i] < segMax * (opts.splitDepth ?? 0.34)) {
      cands.push([i, seg[i]]);
    }
  }
  cands.sort((a, b) => a[1] - b[1]);

  const cuts = [];
  for (const [i] of cands) {
    if (i < minW || seg.length - i < minW) continue;
    if (cuts.every((c) => Math.abs(c - i) >= minW)) cuts.push(i);
  }
  if (!cuts.length) return [[x0, x1]];
  cuts.sort((a, b) => a - b);

  const out = [];
  let prev = 0;
  for (const c of cuts) { out.push([x0 + prev, x0 + c]); prev = c; }
  out.push([x0 + prev, x1]);
  return out.filter(([a, b]) => b - a >= 2);
}

/**
 * Glyph boxes on a settled frame: split into line bands by row projection,
 * then into glyphs by column projection within each band.
 */
export function segmentGlyphs(buf, w, h, opts = {}) {
  const bg = opts.bg || estimateBg(buf, w, h);
  const ink = inkMap(buf, w, h, bg);
  let total = 0;
  for (let i = 0; i < ink.length; i++) total += ink[i];
  if (total < w * h * 0.0008) return { glyphs: [], bg, ink, inkTotal: total };

  const rows = rowProfile(ink, w, h, 0, w, 0, h);
  let bands;
  if (opts.singleBand) {
    // Caller knows this is one rendered line — take its full vertical extent so
    // ascenders and descenders stay attached to their glyphs.
    const r = runsAbove(rows, 0.004, 1);
    bands = r.length ? [[r[0][0], r[r.length - 1][1]]] : [];
  } else {
    bands = runsAbove(rows, opts.bandFrac ?? 0.06, Math.max(2, Math.round(h * 0.012)));
    // A row of text contributes far less ink across its ascender and descender
    // rows than across its x-height, so a flat threshold slices those tails off
    // into bands of their own. Re-attach any band separated by less than a
    // fraction of the taller neighbour's height.
    const mergedBands = [];
    for (const b of bands) {
      const last = mergedBands[mergedBands.length - 1];
      if (last) {
        const gap = b[0] - last[1];
        const tall = Math.max(last[1] - last[0], b[1] - b[0]);
        if (gap <= tall * (opts.bandMergeFrac ?? 0.45)) { last[1] = b[1]; continue; }
      }
      mergedBands.push([...b]);
    }
    bands = mergedBands;
  }

  const glyphs = [];
  for (const [y0, y1] of bands) {
    const bandH = y1 - y0;
    const cols = colProfile(ink, w, h, 0, w, y0, y1);
    const runs = runsAbove(cols, opts.glyphFrac ?? 0.04, 1);
    // Merge only hairline splits — a stroke broken by antialiasing, not the
    // kerning between two letters. Display type is tightly kerned, so this gap
    // has to stay far below the inter-character gap or whole words collapse
    // into a single box and all per-character stagger is lost.
    const merged = [];
    const minGap = Math.max(1, Math.round(bandH * (opts.mergeGapFrac ?? 0.02)));
    for (const r of runs) {
      const last = merged[merged.length - 1];
      if (last && r[0] - last[1] < minGap) last[1] = r[1];
      else merged.push([...r]);
    }
    // Letters that actually touch survive as one over-wide run; split those at
    // the deepest interior minima of the column profile. Band height is only a
    // first guess at "too wide" — after one pass the median width of this
    // band's own pieces is a far better ruler, so re-split against that.
    let split = [];
    for (const r of merged) split.push(...splitWideRun(cols, r[0], r[1], bandH, opts));
    if (split.length >= 3) {
      const medW = median(split.map(([a, b]) => b - a));
      if (medW >= 4) {
        const reSplit = [];
        for (const r of split) {
          reSplit.push(...splitWideRun(cols, r[0], r[1], medW * (opts.reSplitFrac ?? 1.5), {
            ...opts, maxGlyphWidthFrac: 1, minGlyphWidthFrac: 0.34,
          }));
        }
        split = reSplit;
      }
    }

    for (const [x0, x1] of split) {
      if (x1 - x0 < 2) continue;
      // Tighten vertically to this glyph's own ink
      const sub = rowProfile(ink, w, h, x0, x1, y0, y1);
      const vr = runsAbove(sub, 0.05, 1);
      if (!vr.length) continue;
      const gy0 = y0 + vr[0][0];
      const gy1 = y0 + vr[vr.length - 1][1];
      let mass = 0;
      for (let y = gy0; y < gy1; y++) for (let x = x0; x < x1; x++) mass += ink[y * w + x];
      if (mass < 6) continue;
      glyphs.push({ x0, x1, y0: gy0, y1: gy1, mass, band: [y0, y1] });
    }
  }
  glyphs.sort((a, b) => (a.band[0] - b.band[0]) || (a.x0 - b.x0));
  return { glyphs, bg, ink, inkTotal: total };
}

// ─────────────────────────────────────────────────────────────────────────────
// L1c — per-glyph tracking across a burst window
// ─────────────────────────────────────────────────────────────────────────────

/** Sub-sample-accurate 1D alignment of two profiles (parabolic refinement). */
function bestShift(a, b, maxShift) {
  let best = 0, bestErr = Infinity;
  const errAt = (s) => {
    let err = 0, n = 0;
    for (let i = 0; i < b.length; i++) {
      const j = i + s;
      if (j < 0 || j >= a.length) continue;
      err += Math.abs(a[j] - b[i]); n++;
    }
    return n < b.length * 0.4 ? Infinity : err / n;
  };
  const cache = new Map();
  const E = (s) => { if (!cache.has(s)) cache.set(s, errAt(s)); return cache.get(s); };
  for (let s = -maxShift; s <= maxShift; s++) {
    const e = E(s);
    if (e < bestErr) { bestErr = e; best = s; }
  }
  const em = E(best - 1), e0 = E(best), ep = E(best + 1);
  let sub = best;
  if (Number.isFinite(em) && Number.isFinite(ep)) {
    const denom = em - 2 * e0 + ep;
    if (Math.abs(denom) > 1e-9) sub = best + (0.5 * (em - ep)) / denom;
  }
  return { shift: sub, err: bestErr };
}

/**
 * Per-pixel coverage over a window: the LINEAR alpha implied by projecting each
 * pixel onto the background→settled-colour axis.
 *
 * The ink map is deliberately soft-clamped (good for presence, bad for shape):
 * that clamp makes gradient-per-mass depend on how faint the glyph is, so a
 * fading glyph reads as blurrier and narrower than it is. Coverage is linear in
 * alpha, so gradient-per-mass computed on it is opacity-invariant — blur and
 * scale become measurable DURING a fade rather than only after it.
 */
function coverageWindow(src, w, x0, x1, y0, y1, bg, D, dLen2) {
  const ww = x1 - x0, wh = y1 - y0;
  const out = new Float32Array(ww * wh);
  if (!D || dLen2 <= 1) return out;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = (y * w + x) * 3;
      const a = ((src[p] - bg[0]) * D[0] + (src[p + 1] - bg[1]) * D[1] + (src[p + 2] - bg[2]) * D[2]) / dLen2;
      out[(y - y0) * ww + (x - x0)] = a < 0 ? 0 : a > 1.6 ? 1.6 : a;
    }
  }
  return out;
}

/**
 * Centroid and quantile extent of a 1D mass profile.
 *
 * Quantiles rather than raw first/last nonzero: both are amplitude-invariant,
 * so a glyph that is merely FAINTER measures the same extent, while one that is
 * genuinely SMALLER does not. That is what makes this usable as a scale
 * estimate independent of opacity and colour.
 */
function profileStats(prof, qLo = 0.06, qHi = 0.94) {
  let total = 0;
  for (let i = 0; i < prof.length; i++) total += prof[i];
  if (total <= 1e-6) return null;
  let cx = 0;
  for (let i = 0; i < prof.length; i++) cx += prof[i] * i;
  cx /= total;
  let acc = 0, lo = 0, hi = prof.length - 1;
  for (let i = 0; i < prof.length; i++) { acc += prof[i]; if (acc >= total * qLo) { lo = i; break; } }
  acc = 0;
  for (let i = prof.length - 1; i >= 0; i--) { acc += prof[i]; if (acc >= total * (1 - qHi)) { hi = i; break; } }
  return { centroid: cx, lo, hi, extent: Math.max(1, hi - lo), total };
}

/** Mean gradient magnitude per unit mass on a standalone window buffer. */
function sharpnessWin(buf, ww, wh) {
  let grad = 0, mass = 0;
  for (let y = 1; y < wh - 1; y++) {
    for (let x = 1; x < ww - 1; x++) {
      const i = y * ww + x;
      grad += Math.abs(buf[i + 1] - buf[i - 1]) + Math.abs(buf[i + ww] - buf[i - ww]);
      mass += buf[i];
    }
  }
  return mass > 1e-6 ? grad / mass : 0;
}

function colProfileWin(buf, ww, wh) {
  const prof = new Float32Array(ww);
  for (let x = 0; x < ww; x++) {
    let s = 0;
    for (let y = 0; y < wh; y++) s += buf[y * ww + x];
    prof[x] = s;
  }
  return prof;
}

/** Mean gradient magnitude per unit ink — a blur proxy (sharp text = high). */
function sharpness(ink, w, x0, x1, y0, y1) {
  let grad = 0, mass = 0;
  for (let y = y0 + 1; y < y1 - 1; y++) {
    for (let x = x0 + 1; x < x1 - 1; x++) {
      const i = y * w + x;
      const gx = ink[i + 1] - ink[i - 1];
      const gy = ink[i + w] - ink[i - w];
      grad += Math.abs(gx) + Math.abs(gy);
      mass += ink[i];
    }
  }
  return mass > 1e-6 ? grad / mass : 0;
}

/**
 * Tracks the settled glyph boxes backwards and forwards across a window of
 * frames. Per glyph per frame we record:
 *   ink   — total ink in the (dilated) window → opacity proxy
 *   dx,dy — profile alignment shift vs. the settled template → displacement
 *   sharp — gradient per unit ink → blur proxy
 *   spread— column-profile std dev → scale proxy
 */
export function trackGlyphs(frames, w, h, glyphs, settledIdx, opts = {}) {
  const dil = opts.dilate ?? 0.35;
  const bg = opts.bg || estimateBg(frames[settledIdx], w, h);
  const inks = frames.map((f) => inkMap(f, w, h, bg));
  const settledInk = inks[settledIdx];

  // ── Line-level transform ──────────────────────────────────────────────────
  // Kinetic typography scales and moves a LINE, not nine independent letters.
  // Measured per glyph, a line that grows about its own centre reads as mostly
  // translation, and the glyph drifts out of its own window so its extent gets
  // clipped — which is why scale survived on only one glyph in nine. Measuring
  // the transform once over the whole line is both more robust and the right
  // model of what is actually being animated.
  const LX0 = Math.max(0, Math.min(...glyphs.map((g) => g.x0)) - 8);
  const LX1 = Math.min(w, Math.max(...glyphs.map((g) => g.x1)) + 8);
  const LY0 = Math.max(0, Math.min(...glyphs.map((g) => g.y0)) - 8);
  const LY1 = Math.min(h, Math.max(...glyphs.map((g) => g.y1)) + 8);
  const refLineCol = colProfile(settledInk, w, h, LX0, LX1, LY0, LY1);
  const refLineRow = rowProfile(settledInk, w, h, LX0, LX1, LY0, LY1);
  const refLineC = profileStats(refLineCol);
  const refLineR = profileStats(refLineRow);

  const lineXf = frames.map((_, f) => {
    const ink = inks[f];
    const cs = profileStats(colProfile(ink, w, h, LX0, LX1, LY0, LY1));
    const rs = profileStats(rowProfile(ink, w, h, LX0, LX1, LY0, LY1));
    if (!cs || !rs || !refLineC || !refLineR) return null;
    const sX = cs.extent / refLineC.extent;
    const sY = rs.extent / refLineR.extent;
    return {
      scale: Math.max(0.2, Math.min(3, (sX + sY) / 2)),
      shiftX: cs.centroid - refLineC.centroid,
      shiftY: rs.centroid - refLineR.centroid,
    };
  });

  const tracks = [];
  for (const g of glyphs) {
    const gw = g.x1 - g.x0, gh = g.y1 - g.y0;
    const px = Math.round(gw * dil), py = Math.round(gh * dil);
    const X0 = Math.max(0, g.x0 - px), X1 = Math.min(w, g.x1 + px);
    const Y0 = Math.max(0, g.y0 - py), Y1 = Math.min(h, g.y1 + py);
    const maxShiftX = Math.max(3, px), maxShiftY = Math.max(2, py);

    const refCol = colProfile(settledInk, w, h, X0, X1, Y0, Y1);
    const refRow = rowProfile(settledInk, w, h, X0, X1, Y0, Y1);
    let refInk = 0;
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) refInk += settledInk[y * w + x];
    const refSharp = sharpness(settledInk, w, X0, X1, Y0, Y1);
    const refSpread = profileSpread(refCol);

    // Geometry of the settled glyph, measured from the ink profile. All
    // photometry below is sampled RELATIVE to this frame of reference.
    const refColStats = profileStats(refCol);
    const refRowStats = profileStats(refRow);

    // Sampling set stored as offsets from the settled centroid, not as absolute
    // pixels. A word that scales up 33% and drifts left barely overlaps its own
    // settled footprint in early frames — sampling a fixed footprint therefore
    // read a fully visible word as 3% opaque and dragged its colour toward the
    // background. Warping this set by the measured scale and shift makes the
    // photometry follow the glyph instead of the glyph's final resting place.
    // Offsets are taken from the LINE centroid, in absolute frame coordinates,
    // so applying the line's scale about that centre carries each glyph to
    // where it actually is on that frame.
    const lineCx = LX0 + (refLineC ? refLineC.centroid : 0);
    const lineCy = LY0 + (refLineR ? refLineR.centroid : 0);
    const maskRel = [];
    if (refLineC && refLineR) {
      for (let y = Y0; y < Y1; y++) {
        for (let x = X0; x < X1; x++) {
          if (settledInk[y * w + x] > 0.5) maskRel.push([x - lineCx, y - lineCy]);
        }
      }
    }

    /** Mean colour + visible-fraction over the mask warped by (scale, shift). */
    const sampleWarped = (src, scale, shiftX, shiftY, coverDelta) => {
      if (!maskRel.length) return null;
      const cx = lineCx + shiftX, cy = lineCy + shiftY;
      let r = 0, g2 = 0, b2 = 0, n = 0, vis = 0;
      for (const [rdx, rdy] of maskRel) {
        const sx = Math.round(cx + rdx * scale);
        const sy = Math.round(cy + rdy * scale);
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        const p = (sy * w + sx) * 3;
        r += src[p]; g2 += src[p + 1]; b2 += src[p + 2]; n++;
        const d = (Math.abs(src[p] - bg[0]) + Math.abs(src[p + 1] - bg[1]) + Math.abs(src[p + 2] - bg[2])) / 3;
        if (d > coverDelta) vis++;
      }
      if (n < maskRel.length * 0.4) return null;
      return { mean: [r / n, g2 / n, b2 / n], cover: vis / n };
    };
    const meanOver = (src) => {
      const s = sampleWarped(src, 1, 0, 0, 12);
      return s ? s.mean : null;
    };
    // An antialiased glyph observes as α·C + (1-α)·B. So for a PURE opacity
    // fade the mean colour travels along the straight line from background B to
    // the settled colour C, and α is just the projection onto that line. Any
    // component perpendicular to it is a genuine colour change that no opacity
    // ramp can explain. That decomposition is what separates "fade" from
    // "recolour" instead of letting a darkening glyph masquerade as a fade.
    const cFinal = meanOver(frames[settledIdx]);
    const D = cFinal ? [cFinal[0] - bg[0], cFinal[1] - bg[1], cFinal[2] - bg[2]] : null;
    const dLen2 = D ? D[0] * D[0] + D[1] * D[1] + D[2] * D[2] : 0;

    const winW = X1 - X0, winH = Y1 - Y0;
    const refCov = coverageWindow(frames[settledIdx], w, X0, X1, Y0, Y1, bg, D, dLen2);
    const refSharpCov = sharpnessWin(refCov, winW, winH);
    const refSpreadCov = profileSpread(colProfileWin(refCov, winW, winH));

    const samples = [];
    for (let f = 0; f < frames.length; f++) {
      const ink = inks[f];
      let sum = 0;
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) sum += ink[y * w + x];
      const col = colProfile(ink, w, h, X0, X1, Y0, Y1);
      const row = rowProfile(ink, w, h, X0, X1, Y0, Y1);

      // Geometry (shift/sharpness/spread) is only meaningful once most of the
      // glyph is actually present. Aligning a 10%-opacity ghost against the
      // settled template returns confident nonsense — that is what produced
      // 20px of phantom "overshoot" on a word that never moves.
      const presence = refInk > 0 ? sum / refInk : 0;
      // Two gates, because the channels have different sensitivities to opacity.
      // Alignment (dx/dy) is shape-based and survives a partly-faded glyph, but
      // sharpness and spread do NOT: a fading glyph registers only its darkest
      // core in the ink map, so it measures narrower and softer purely as a
      // side effect of being faint. Without the stricter gate every fade also
      // reports a phantom scale-up and defocus.
      const solid = presence >= (opts.moveMinInk ?? 0.6);
      const measurable = presence >= (opts.geomMinInk ?? 0.18);

      // ── Geometry first: the line transform, shared by every glyph.
      const xf = lineXf[f];
      const scaleGeom = xf ? xf.scale : null;

      // Per-glyph displacement, measured individually so letters that move
      // independently of the line are not flattened away — but reported as the
      // RESIDUAL after the line transform. A glyph sitting still in a line that
      // scales up still has a large centroid shift; charging that to translate
      // as well as to scale makes the renderer move it twice.
      const cs = measurable ? profileStats(col) : null;
      const rs = measurable ? profileStats(row) : null;
      let sx = null, sy = null;
      if (cs && rs && refColStats && refRowStats && xf) {
        const gRelX = (X0 + refColStats.centroid) - lineCx;
        const gRelY = (Y0 + refRowStats.centroid) - lineCy;
        const predDx = xf.shiftX + gRelX * (xf.scale - 1);
        const predDy = xf.shiftY + gRelY * (xf.scale - 1);
        sx = (cs.centroid - refColStats.centroid) - predDx;
        sy = (rs.centroid - refRowStats.centroid) - predDy;
      }

      // ── Photometry second, sampled through the line transform.
      const warped = xf ? sampleWarped(frames[f], xf.scale, xf.shiftX, xf.shiftY, opts.coverMinDelta ?? 12) : null;

      let sharpRel = null;
      if (measurable && refSharpCov > 0) {
        const cov = coverageWindow(frames[f], w, X0, X1, Y0, Y1, bg, D, dLen2);
        sharpRel = sharpnessWin(cov, winW, winH) / refSharpCov;
      }

      // Motion-compensated mean colour, decomposed against B→C.
      const obs = warped ? warped.mean : null;
      let alpha = null, perp = null;
      if (obs && D && dLen2 > 1) {
        const o = [obs[0] - bg[0], obs[1] - bg[1], obs[2] - bg[2]];
        alpha = (o[0] * D[0] + o[1] * D[1] + o[2] * D[2]) / dLen2;
        const px2 = o[0] - alpha * D[0], py2 = o[1] - alpha * D[1], pz2 = o[2] - alpha * D[2];
        perp = Math.sqrt(px2 * px2 + py2 * py2 + pz2 * pz2);
      }

      // Colour-independent presence, over the same warped footprint.
      //
      // The projection above cannot tell "faint navy" from "opaque salmon" —
      // they are the same point on the B→C axis. That ambiguity is real, not a
      // bug, so when a genuine colour change is present the projection is not
      // usable as opacity and this is what gets used instead.
      const cover = warped ? warped.cover : null;

      samples.push({
        f,
        ink: presence,
        // Projection-derived opacity. Unlike `ink` this cannot be inflated by a
        // glyph merely getting darker in place — but it IS unreliable when the
        // glyph's colour changes, hence `cover` as the fallback estimator.
        alpha,
        cover,
        // Distance off the fade line — nonzero only for a real colour change.
        perp,
        obs,
        // Displacement now comes from the ink centroid rather than profile
        // cross-correlation — same quantity, but measured in the same frame of
        // reference as the scale, so the two stay consistent.
        dx: sx === null ? null : sx,
        dy: sy === null ? null : sy,
        sharp: sharpRel,
        // Scale measured directly from profile extent, not inferred from how
        // wide the intensity distribution looks.
        spread: scaleGeom,
        solid,
      });
    }
    tracks.push({ glyph: g, window: { X0, X1, Y0, Y1 }, samples, refInk, bgRgb: bg, settledRgb: cFinal });
  }
  return tracks;
}

function profileSpread(prof) {
  let sum = 0, wsum = 0;
  for (let i = 0; i < prof.length; i++) { sum += prof[i]; wsum += prof[i] * i; }
  if (sum <= 1e-6) return 0;
  const mean = wsum / sum;
  let v = 0;
  for (let i = 0; i < prof.length; i++) v += prof[i] * (i - mean) * (i - mean);
  return Math.sqrt(v / sum);
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 — easing-curve catalog and fitting
// ─────────────────────────────────────────────────────────────────────────────

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Cubic-bezier easing y(x) with P0=(0,0), P3=(1,1) — the CSS form. */
function bezierEase(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sampleX(t) - x;
      if (Math.abs(e) < 1e-6) break;
      const d = dX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sampleY(clamp01(t));
  };
}

/**
 * The catalog. `step`, `expoOut` and `backOut` are here on purpose: a model
 * guessing at motion essentially never proposes them, and their absence is
 * what makes generated sequences feel uniformly soft.
 */
const FAMILIES = [
  { name: "linear", params: [], fn: () => (t) => t },
  {
    name: "power-out", params: [{ lo: 1.2, hi: 8, steps: 24 }],
    fn: ([n]) => (t) => 1 - Math.pow(1 - t, n),
  },
  {
    name: "power-in", params: [{ lo: 1.2, hi: 8, steps: 24 }],
    fn: ([n]) => (t) => Math.pow(t, n),
  },
  {
    name: "power-in-out", params: [{ lo: 1.2, hi: 6, steps: 20 }],
    fn: ([n]) => (t) => (t < 0.5 ? Math.pow(2 * t, n) / 2 : 1 - Math.pow(2 - 2 * t, n) / 2),
  },
  {
    name: "expo-out", params: [{ lo: 3, hi: 16, steps: 26 }],
    fn: ([k]) => {
      const d = 1 - Math.pow(2, -k);
      return (t) => (1 - Math.pow(2, -k * t)) / d;
    },
  },
  {
    name: "step", params: [{ lo: 0, hi: 1, steps: 40 }],
    fn: ([s]) => (t) => (t >= s ? 1 : 0),
  },
  {
    name: "back-out", params: [{ lo: 0.4, hi: 4, steps: 24 }],
    fn: ([s]) => (t) => { const u = t - 1; return 1 + u * u * ((s + 1) * u + s); },
  },
  {
    name: "spring",
    params: [{ lo: 0.12, hi: 1.05, steps: 22 }, { lo: 3, hi: 26, steps: 22 }],
    fn: ([zeta, omega]) => (t) => {
      if (zeta >= 1) return 1 - (1 + omega * t) * Math.exp(-omega * t);
      const wd = omega * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
    },
  },
  {
    name: "cubic-bezier",
    params: [
      { lo: 0, hi: 1, steps: 7 }, { lo: -0.4, hi: 1.6, steps: 8 },
      { lo: 0, hi: 1, steps: 7 }, { lo: -0.4, hi: 1.6, steps: 8 },
    ],
    fn: (p) => bezierEase(p[0], p[1], p[2], p[3]),
  },
];

/**
 * Rebuilds an easing function from a fitted {family, params} pair. The renderer
 * uses this, so a curve is evaluated by exactly the code that fitted it — if
 * these ever diverged, every rendered animation would silently drift from the
 * measurement it claims to reproduce.
 */
export function makeEasing(family, params = []) {
  const fam = FAMILIES.find((f) => f.name === family);
  if (!fam) return (t) => t;
  return fam.fn(params);
}

export const EASING_FAMILY_NAMES = FAMILIES.map((f) => f.name);

function rmse(fn, samples) {
  let s = 0;
  for (const [t, p] of samples) { const d = fn(t) - p; s += d * d; }
  return Math.sqrt(s / samples.length);
}

function gridSearch(family, samples, refineRounds = 2) {
  let ranges = family.params.map((p) => ({ ...p }));
  let best = { params: ranges.map((r) => (r.lo + r.hi) / 2), err: Infinity };
  if (!ranges.length) return { params: [], err: rmse(family.fn([]), samples) };

  for (let round = 0; round <= refineRounds; round++) {
    const axes = ranges.map((r) => {
      const out = [];
      for (let i = 0; i < r.steps; i++) out.push(r.lo + ((r.hi - r.lo) * i) / (r.steps - 1));
      return out;
    });
    const idx = new Array(axes.length).fill(0);
    while (true) {
      const p = idx.map((v, k) => axes[k][v]);
      const e = rmse(family.fn(p), samples);
      if (e < best.err) best = { params: p, err: e };
      let k = axes.length - 1;
      while (k >= 0 && ++idx[k] >= axes[k].length) { idx[k] = 0; k--; }
      if (k < 0) break;
    }
    ranges = ranges.map((r, k) => {
      const span = (r.hi - r.lo) / (r.steps - 1);
      return { lo: best.params[k] - span, hi: best.params[k] + span, steps: Math.max(5, Math.round(r.steps / 2)) };
    });
  }
  return best;
}

/**
 * Fits a normalized progress curve. Returns the best family, its params, the
 * residual, and — importantly — what the residual would have been with the
 * naive default (ease-in-out). That ratio is the "was this worth measuring"
 * number, and in practice it is large for hand-made motion.
 */
export function fitCurve(samples, opts = {}) {
  if (samples.length < 4) return null;
  const n = samples.length;
  const results = [];
  for (const fam of FAMILIES) {
    const { params, err } = gridSearch(fam, samples, opts.refine ?? 2);
    // Small-sample-corrected AIC. Without a complexity penalty the 4-parameter
    // cubic-bezier wins nearly every channel by overfitting noise, which would
    // hand the renderer meaningless control points instead of the real shape.
    const k = fam.params.length + 1;
    const rss = Math.max(err * err * n, 1e-12);
    const aic = n * Math.log(rss / n) + 2 * k;
    const aicc = n - k - 1 > 0 ? aic + (2 * k * (k + 1)) / (n - k - 1) : aic + 2 * k * (k + 1);
    results.push({
      family: fam.name,
      params: params.map((v) => Math.round(v * 1000) / 1000),
      rmse: Math.round(err * 10000) / 10000,
      aicc: Math.round(aicc * 100) / 100,
      k: fam.params.length,
    });
  }
  results.sort((a, b) => a.aicc - b.aicc);

  const naiveErr = rmse(bezierEase(0.42, 0, 0.58, 1), samples); // CSS ease-in-out
  const linearErr = rmse((t) => t, samples);

  // Parsimony: models within ΔAICc ≤ 4 of the best are not meaningfully
  // distinguishable, so take the simplest one in that set. Without this the
  // 4-parameter bezier absorbs almost every channel once windows get long —
  // technically the best fit, but it hands the renderer opaque control points
  // where "expo-out, k=7" is the real and reusable answer.
  const cutoff = results[0].aicc + (opts.deltaAicc ?? 4);
  const contenders = results.filter((r) => r.aicc <= cutoff);
  contenders.sort((a, b) => (a.k - b.k) || (a.aicc - b.aicc));
  const chosen = contenders[0];

  return {
    best: chosen,
    ranked: results.slice(0, 4).map((r) => ({ family: r.family, rmse: r.rmse, aicc: r.aicc })),
    naiveRmse: Math.round(naiveErr * 10000) / 10000,
    linearRmse: Math.round(linearErr * 10000) / 10000,
    // How much worse the naive default would have been. This is the number
    // that says whether measuring was worth it at all.
    gainVsNaive: Math.round((naiveErr / Math.max(chosen.rmse, 1e-6)) * 100) / 100,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel derivation — turn raw tracks into normalized progress curves
// ─────────────────────────────────────────────────────────────────────────────

function normalizeChannel(samples, key, fps, opts = {}) {
  // Frames where the channel is undefined (glyph not solid yet) are held at the
  // first defined value rather than treated as zero — a channel must describe
  // only the span over which it is actually observable.
  const raw = samples.map((s) => s[key]);
  const firstIdx = raw.findIndex((v) => v !== null && v !== undefined);
  if (firstIdx < 0) return null;
  const defined = raw.filter((v) => v !== null && v !== undefined).length;
  if (defined < (opts.minDefined ?? 6)) return null;

  let last = raw[firstIdx];
  const vals = raw.map((v) => { if (v !== null && v !== undefined) last = v; return last; });
  const n = vals.length;
  if (n < 4) return null;
  const settle = median(vals.slice(Math.max(0, n - 4)));
  const start = median(vals.slice(firstIdx, Math.min(firstIdx + 3, n)));
  const range = settle - start;
  const noise = opts.noise ?? 0.06;
  if (Math.abs(range) < noise) return null;

  const norm = vals.map((v) => (v - start) / range);
  // Plateau tolerance. Loosening this to catch slow tails backfires: it stretches
  // every duration, which spreads the same total change over more frames and makes
  // the rendered motion GENTLER per frame — dropping it below the detector's
  // threshold entirely. The reference's energy comes from large per-frame change,
  // not from long animations, so this stays tight.
  const tol = opts.plateauTolerance ?? 0.06;
  // Onset: first index that leaves the start plateau for good
  let onset = 0;
  for (let i = 0; i < n; i++) { if (norm[i] > tol) { onset = Math.max(0, i - 1); break; } }
  // Settle: last index that is still outside the final plateau
  let end = n - 1;
  for (let i = n - 1; i >= 0; i--) { if (Math.abs(norm[i] - 1) > tol) { end = Math.min(n - 1, i + 1); break; } }
  if (end - onset < 3) return null;

  const pts = [];
  for (let i = onset; i <= end; i++) pts.push([(i - onset) / (end - onset), norm[i]]);
  const overshoot = Math.max(0, Math.max(...norm.slice(onset, end + 1)) - 1);

  return {
    channel: key,
    onsetFrame: onset, settleFrame: end,
    durationMs: ((end - onset) / fps) * 1000,
    startValue: Math.round(start * 1000) / 1000,
    settleValue: Math.round(settle * 1000) / 1000,
    range: Math.round(range * 1000) / 1000,
    overshoot: Math.round(overshoot * 1000) / 1000,
    samples: pts,
  };
}

const CHANNEL_NOISE = { alpha: 0.10, cover: 0.12, dx: 1.6, dy: 1.6, sharp: 0.18, spread: 0.12 };

/** Pearson correlation between two per-frame series, over frames where both exist. */
function correlate(samples, keyA, keyB) {
  const xs = [], ys = [];
  for (const s of samples) {
    const a = s[keyA], b = s[keyB];
    if (a == null || b == null) continue;
    xs.push(a); ys.push(b);
  }
  const n = xs.length;
  if (n < 5) return 0;
  const mx = xs.reduce((p, q) => p + q, 0) / n;
  const my = ys.reduce((p, q) => p + q, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx2 += a * a; dy2 += b * b;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den < 1e-9 ? 0 : num / den;
}

/**
 * Colour progress: projects each frame's mean glyph colour onto the
 * start→settle colour vector, giving a scalar 0→1 that is immune to which
 * component (R/G/B) happens to carry the change. Returns null unless the
 * colour actually travels a perceptible distance.
 */
function colourChannel(samples, fps, opts = {}) {
  // Only a trajectory that leaves the background→settled line is a real colour
  // change. A pure fade rides that line exactly, and previously produced a
  // confident "recolour" spec that the renderer then applied ON TOP of the
  // opacity ramp — the same change counted twice.
  const perps = samples.map((s) => s.perp).filter((v) => v != null);
  const maxPerp = perps.length ? Math.max(...perps) : 0;
  if (maxPerp < (opts.minPerp ?? 13)) return null;

  const valid = samples.map((s, i) => ({ i, c: s.solid ? s.obs : null })).filter((v) => v.c);
  if (valid.length < (opts.minDefined ?? 6)) return null;

  const avg = (arr) => arr.reduce((a, v) => [a[0] + v.c[0] / arr.length, a[1] + v.c[1] / arr.length, a[2] + v.c[2] / arr.length], [0, 0, 0]);
  const startC = avg(valid.slice(0, Math.min(2, valid.length)));
  const endC = avg(valid.slice(-3));
  const d = [endC[0] - startC[0], endC[1] - startC[1], endC[2] - startC[2]];
  const dLen2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  if (Math.sqrt(dLen2) < (opts.minColourDistance ?? 26)) return null;

  const proj = new Array(samples.length).fill(null);
  for (const v of valid) {
    proj[v.i] = ((v.c[0] - startC[0]) * d[0] + (v.c[1] - startC[1]) * d[1] + (v.c[2] - startC[2]) * d[2]) / dLen2;
  }
  const ch = normalizeChannel(proj.map((p) => ({ colour: p })), "colour", fps, { noise: 0.12, minDefined: opts.minDefined ?? 6 });
  if (!ch) return null;
  return {
    ...ch,
    channel: "colour",
    fromRgb: startC.map(Math.round),
    toRgb: endC.map(Math.round),
    distance: Math.round(Math.sqrt(dLen2)),
    offLineDistance: Math.round(maxPerp),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestration
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeVideo(videoPath, opts = {}) {
  const log = opts.log || (() => {});
  log(`🎞  Motion profile at native fps...`);
  const { diffs, fps, meta } = await motionProfile(videoPath, {});
  const { bursts, holds, threshold } = segmentBursts(diffs, fps, {});
  log(`   ${diffs.length + 1} frames @ ${fps.toFixed(2)}fps · ${bursts.length} burst(s), ${holds.length} hold(s)`);

  const W = meta.width, H = meta.height;
  const analyzable = bursts.filter(
    (b) => b.frames >= (opts.minBurstFrames ?? 2) && b.frames <= (opts.maxBurstFrames ?? 45)
  );
  const limit = opts.maxBursts ?? analyzable.length;
  const chosen = analyzable.slice(0, limit);
  log(`   analysing ${chosen.length} burst(s) at ${W}x${H}...`);

  const events = [];
  for (const b of chosen) {
    // The settled state defines every channel's target value, so sampling it
    // too early biases the whole measurement. A burst ends when frame-to-frame
    // change drops below the motion threshold, but slow tails (a colour still
    // creeping toward its final value) continue below that threshold — so take
    // the reference state from the MIDDLE of the following hold, not from a
    // couple of frames after the burst.
    const nextHold = holds.find((hh) => hh.startFrame >= b.endFrame);
    const holdFrames = nextHold ? nextHold.frames : 6;
    const settleOffset = Math.max(3, Math.min(24, Math.round(holdFrames * 0.5)));
    const padPre = 4, padPost = settleOffset + 4;
    const f0 = Math.max(0, b.startFrame - padPre);
    const f1 = Math.min(diffs.length, b.endFrame + padPost);
    const startMs = (f0 / fps) * 1000;
    const durMs = ((f1 - f0) / fps) * 1000;
    if (f1 - f0 < 6) continue;

    let frames;
    try {
      frames = await collectRange(videoPath, startMs, durMs, W, H, 120);
    } catch (e) {
      log(`   ⚠️  burst @${(b.startMs / 1000).toFixed(2)}s decode failed: ${e.message}`);
      continue;
    }
    if (frames.length < 6) continue;

    const settledIdx = Math.min(frames.length - 1, (b.endFrame - f0) + settleOffset);
    const seg = segmentGlyphs(frames[settledIdx], W, H, {});
    if (!seg.glyphs.length) continue;

    // Display type vs. dense UI. A screenshot of an app is mostly small text
    // in a crowded layout; a kinetic-typography slide is a handful of huge
    // glyphs on empty ground. Only the latter has per-character motion worth
    // fitting — running the fitter over 60 tiny UI glyphs is slow and yields
    // curve fits on antialiasing noise.
    const inkFrac = seg.inkTotal / (W * H);
    const medGlyphH = median(seg.glyphs.map((g) => g.y1 - g.y0));
    // Glyph SIZE is the reliable discriminator. Ink fraction alone misfires on
    // display type set very large — a short word at 86% of frame width covers
    // enough of the frame to trip an ink-fraction ceiling tuned for dense UI,
    // and the shot gets discarded as a screenshot.
    const isDisplayType = medGlyphH >= H * (opts.displayGlyphFrac ?? 0.09);
    const contentClass =
      isDisplayType || (inkFrac < (opts.textInkMax ?? 0.12) && medGlyphH >= H * (opts.textGlyphMinFrac ?? 0.045))
        ? "text" : "screen";
    if (contentClass !== "text") {
      events.push({
        burst: b, windowFrames: [f0, f1], settledFrame: f0 + settledIdx,
        bg: seg.bg, contentClass, elementCount: 0,
        detectedGlyphs: seg.glyphs.length, inkFrac: Math.round(inkFrac * 1000) / 1000,
        stagger: null, elements: [],
      });
      log(`   · burst ${(b.startMs / 1000).toFixed(2)}s (${b.frames}f, ${b.kind}) → screen content, skipped`);
      continue;
    }

    const glyphs = seg.glyphs.length > (opts.maxGlyphs ?? 40)
      ? [...seg.glyphs].sort((a, c) => c.mass - a.mass).slice(0, opts.maxGlyphs ?? 40).sort((a, c) => a.x0 - c.x0)
      : seg.glyphs;

    const tracks = trackGlyphs(frames, W, H, glyphs, settledIdx, { bg: seg.bg });

    const elements = [];
    for (const tr of tracks) {
      const channels = {};
      const colourCh = colourChannel(tr.samples, fps, {});

      // Pick the opacity estimator that is valid for this glyph. With a real
      // colour change the B→C projection is degenerate, so fall back to
      // colour-independent coverage; without one the projection is both valid
      // and far more precise (it sees partial alpha, coverage saturates).
      const opacityKey = colourCh ? "cover" : "alpha";
      const opacityCh = normalizeChannel(tr.samples, opacityKey, fps, { noise: CHANNEL_NOISE[opacityKey] });
      if (opacityCh) { opacityCh.channel = "alpha"; opacityCh.estimator = opacityKey; }

      const candidates = [opacityCh];
      for (const key of ["dx", "dy", "sharp", "spread"]) {
        candidates.push(normalizeChannel(tr.samples, key, fps, { noise: CHANNEL_NOISE[key] }));
      }
      candidates.push(colourCh);
      // Scale and defocus are the two channels that opacity can counterfeit: a
      // glyph arriving at 3% alpha measures narrower and softer for purely
      // photometric reasons. Physics-based correction gets most of it, but the
      // residue is still enough to invent a 30% scale-up on a word that never
      // moves. So require the channel to be DISTINGUISHABLE from opacity — if
      // it tracks alpha almost perfectly, it carries no independent signal and
      // is dropped. Genuine scale or blur does not correlate this tightly.
      // Only `sharp` still needs this. Scale is now measured from ink-profile
      // extent — a geometric quantity that is legitimately allowed to correlate
      // with opacity, because a word really can grow and fade in together.
      // Sharpness is still photometric and can still be counterfeited by alpha.
      const confoundLimit = opts.confoundCorrelation ?? 0.94;
      for (const ch of candidates) {
        if (!ch) continue;
        if (ch.channel === "sharp") {
          const r = Math.abs(correlate(tr.samples, "alpha", ch.channel));
          if (r >= confoundLimit) continue;
          ch.independenceR = Math.round(r * 1000) / 1000;
        }
        // A curve fitted to fewer than 5 points on the animated span is not a
        // measurement, it is a coincidence.
        if (ch.samples.length < (opts.minFitSamples ?? 5)) continue;
        const fit = fitCurve(ch.samples, { refine: opts.refine ?? 2 });
        if (!fit) continue;
        channels[ch.channel] = { ...ch, samples: undefined, nSamples: ch.samples.length, fit };
      }
      if (!Object.keys(channels).length) continue;
      const onsets = Object.values(channels).map((c) => c.onsetFrame);
      elements.push({
        box: { x: tr.glyph.x0, y: tr.glyph.y0, w: tr.glyph.x1 - tr.glyph.x0, h: tr.glyph.y1 - tr.glyph.y0 },
        onsetFrame: Math.min(...onsets),
        onsetMs: ((f0 + Math.min(...onsets)) / fps) * 1000,
        channels,
      });
    }
    if (!elements.length) continue;

    // Settled layout of the line, as fractions of the frame. Motion was being
    // measured meticulously and then rendered at whatever type size the
    // renderer happened to pick — and a word covering 60% of frame width moves
    // far more pixels than one covering 40%, so the same easing produced a
    // fraction of the reference's motion energy. Layout is part of the spec.
    const lx0 = Math.min(...glyphs.map((g) => g.x0)), lx1 = Math.max(...glyphs.map((g) => g.x1));
    const ly0 = Math.min(...glyphs.map((g) => g.y0)), ly1 = Math.max(...glyphs.map((g) => g.y1));
    const layout = {
      widthFrac: Math.round(((lx1 - lx0) / W) * 1000) / 1000,
      heightFrac: Math.round(((ly1 - ly0) / H) * 1000) / 1000,
      cxFrac: Math.round((((lx0 + lx1) / 2) / W) * 1000) / 1000,
      cyFrac: Math.round((((ly0 + ly1) / 2) / H) * 1000) / 1000,
      glyphHeightFrac: Math.round((median(glyphs.map((g) => g.y1 - g.y0)) / H) * 1000) / 1000,
    };

    events.push({
      burst: b,
      windowFrames: [f0, f1],
      settledFrame: f0 + settledIdx,
      bg: seg.bg,
      contentClass: "text",
      layout,
      detectedGlyphs: seg.glyphs.length,
      elementCount: elements.length,
      stagger: staggerOf(elements, fps),
      elements,
    });
    log(`   · burst ${(b.startMs / 1000).toFixed(2)}s (${b.frames}f, ${b.kind}) → ${elements.length} element(s)`);
  }

  return {
    _meta: { kind: "opendemo-glyph-motion", source: resolve(videoPath), generatedAt: null, fps, size: [W, H] },
    profile: { threshold, frameCount: diffs.length + 1 },
    pacing: pacingProfile(bursts, holds, diffs, fps),
    events,
  };
}

/** Stagger: how the onsets of sibling glyphs are spaced, and in what order. */
function staggerOf(elements, fps) {
  if (elements.length < 2) return null;
  const byX = [...elements].sort((a, b) => a.box.x - b.box.x);
  const onsets = byX.map((e) => e.onsetFrame);
  const deltas = [];
  for (let i = 1; i < onsets.length; i++) deltas.push(onsets[i] - onsets[i - 1]);
  const monotoneUp = deltas.filter((d) => d >= 0).length / deltas.length;
  const med = median(deltas);
  const spread = median(deltas.map((d) => Math.abs(d - med)));
  let order = "simultaneous";
  if (Math.abs(med) >= 0.5) order = monotoneUp > 0.75 ? "left-to-right" : monotoneUp < 0.25 ? "right-to-left" : "scattered";
  return {
    order,
    medianFrames: med,
    medianMs: Math.round((med / fps) * 1000),
    jitterFrames: spread,
    monotonicity: Math.round(monotoneUp * 100) / 100,
    totalSpanMs: Math.round(((Math.max(...onsets) - Math.min(...onsets)) / fps) * 1000),
  };
}

/**
 * L4 — the macro pacing profile. This is the half that answers "why does
 * generated motion feel wrong even when each individual animation is fine":
 * move/hold balance, edit-width variety, and easing-family variety.
 */
export function pacingProfile(bursts, holds, diffs, fps) {
  const totalFrames = diffs.length;
  const moveFrames = bursts.reduce((a, b) => a + b.frames, 0);
  const holdMs = holds.map((h) => (h.frames / fps) * 1000);
  const kinds = {};
  for (const b of bursts) kinds[b.kind] = (kinds[b.kind] || 0) + 1;
  const widths = bursts.map((b) => b.frames);
  const wMed = median(widths);
  const wSpread = median(widths.map((x) => Math.abs(x - wMed)));
  return {
    moveHoldRatio: Math.round((moveFrames / Math.max(1, totalFrames)) * 1000) / 1000,
    burstCount: bursts.length,
    burstKinds: kinds,
    burstWidthFrames: { median: wMed, mad: wSpread, min: Math.min(...widths), max: Math.max(...widths) },
    holdMs: {
      median: Math.round(median(holdMs)),
      min: Math.round(Math.min(...holdMs)),
      max: Math.round(Math.max(...holdMs)),
      count: holds.length,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log(`Usage: node scripts/glyph-motion.mjs <video> [--out report.json] [--max-bursts N]`);
    process.exit(1);
  }
  const video = resolve(args[0]);
  let out = "glyph-motion.json";
  let maxBursts;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--out") out = args[++i];
    else if (args[i] === "--max-bursts") maxBursts = parseInt(args[++i], 10);
  }
  const log = (m) => process.stdout.write(`${m}\n`);
  log("═".repeat(58));
  log("🔬 OpenDemo — glyph motion measurement (L1 + L2)");
  log("═".repeat(58));

  const report = await analyzeVideo(video, { log, maxBursts });
  writeFileSync(resolve(out), JSON.stringify(report, null, 2), "utf8");

  log("─".repeat(58));
  log(`pacing: move/hold ${report.pacing.moveHoldRatio} · bursts ${report.pacing.burstCount} · ` +
      `widths med ${report.pacing.burstWidthFrames.median}f (mad ${report.pacing.burstWidthFrames.mad}) · ` +
      `holds med ${report.pacing.holdMs.median}ms`);
  log(`kinds: ${JSON.stringify(report.pacing.burstKinds)}`);

  const famCount = {};
  let chCount = 0;
  for (const ev of report.events) {
    for (const el of ev.elements) {
      for (const ch of Object.values(el.channels)) {
        famCount[ch.fit.best.family] = (famCount[ch.fit.best.family] || 0) + 1;
        chCount++;
      }
    }
  }
  log(`events: ${report.events.length} · elements ${report.events.reduce((a, e) => a + e.elementCount, 0)} · channels ${chCount}`);
  log(`easing families: ${JSON.stringify(famCount)}`);
  log(`💾 ${resolve(out)}`);
}

if (process.argv[1]?.endsWith("glyph-motion.mjs")) {
  main().catch((e) => { console.error(`💥 ${e.message}\n${e.stack}`); process.exit(1); });
}
