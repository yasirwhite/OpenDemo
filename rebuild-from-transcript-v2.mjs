#!/usr/bin/env node
/**
 * rebuild-from-transcript-v2.mjs
 *
 * Rebuilds an animated text video from a schema-v2 "transcript" JSON
 * (per-letter enter/exit animations with AUTHORITATIVE settled boxes,
 * explicit per-letter t0/t1, group visibleUntilMs holds, product-demo /
 * static-hold / cut markers).
 *
 * Key difference from the v1 (schema v1) renderer this was adapted from:
 *  - v1 had to GUESS per-letter animation duration and glyph size/anchor.
 *  - v2 gives box{x,y,w,h} as the authoritative settled ink geometry
 *    (fontPx === box.h) and explicit t0/t1 per letter, plus group
 *    visibleUntilMs holds and (usually) a matching text-exit with its own
 *    box/style. This renderer trusts those numbers directly instead of
 *    inferring them.
 *
 * No external npm dependencies -- glyphs are rasterized once per (char,
 * weight) at a large reference size via ffmpeg drawtext (white-on-transparent,
 * so the alpha channel is a reusable ink mask), tight-cropped to their ink
 * bounding box, then bilinearly resized per letter-instance so the ink
 * height exactly equals box.h. Color is applied at composite time so a
 * single raster mask serves every group regardless of that group's
 * colorRGB.
 *
 * Usage:
 *   node rebuild-from-transcript-v2.mjs <transcript.json> <output.mp4> [--workdir DIR]
 */

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const transcriptPath = args[0];
const outputPath = args[1];
let workDir = path.join(os.tmpdir(), 'rebuild2-work');
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--workdir') workDir = args[++i];
}
if (!transcriptPath || !outputPath) {
  console.error('Usage: node rebuild-from-transcript-v2.mjs <transcript.json> <output.mp4> [--workdir DIR]');
  process.exit(1);
}
fs.mkdirSync(workDir, { recursive: true });

const FONT_REGULAR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

// ---------------------------------------------------------------------------
// Load transcript
// ---------------------------------------------------------------------------
const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
const { width, height, durationMs } = transcript.video;
const events = transcript.events;

// OUTPUT_FPS: rendered/encoded frame rate. INFORMATION GAP: source video is
// 29.97fps but the task requires exact 30/1 output; all transcript times are
// in ms, so we simply resample onto a clean 30fps grid rather than trying to
// preserve 29.97 (a deliberate, instructed divergence, not a gap).
const OUTPUT_FPS = 30;

function ease(curve, t) {
  t = Math.max(0, Math.min(1, t));
  switch (curve) {
    case 'ease-out': return 1 - (1 - t) * (1 - t);
    case 'ease-in': return t * t;
    case 'linear':
    default: return t;
  }
}
function lerp(a, b, t) { return a + (b - a) * t; }

function fontForWeight(w) {
  return (w === 'bold' || w === 'heavy') ? FONT_BOLD : FONT_REGULAR;
}

// ---------------------------------------------------------------------------
// Raw glyph rasterization: one ink-alpha mask per (char, weight), at a large
// reference size, tight-cropped to ink bbox (alpha > threshold).
// ---------------------------------------------------------------------------
const REF_SIZE = 260;
const rawGlyphCache = new Map();

function rasterizeRawGlyph(ch, fontFile) {
  const key = `${fontFile}_${ch.codePointAt(0)}`;
  if (rawGlyphCache.has(key)) return rawGlyphCache.get(key);

  const canvasW = Math.ceil(REF_SIZE * 2.4);
  const canvasH = Math.ceil(REF_SIZE * 2.6);
  const rawPath = path.join(workDir, `glyph_${key.replace(/[^a-zA-Z0-9_]/g, '_')}.rgba`);

  const textFilePath = path.join(workDir, `glyphtext_${key.replace(/[^a-zA-Z0-9_]/g, '_')}.txt`);
  fs.writeFileSync(textFilePath, ch);

  const filter = `color=c=black@0.0:s=${canvasW}x${canvasH},format=rgba[bg];[bg]drawtext=fontfile=${fontFile}:textfile=${textFilePath}:fontsize=${REF_SIZE}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`;

  try {
    execFileSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', filter,
      '-frames:v', '1', '-pix_fmt', 'rgba', '-f', 'rawvideo',
      rawPath,
    ], { stdio: ['ignore', 'ignore', 'ignore'] });
  } catch (e) {
    console.error('ffmpeg glyph render failed for', JSON.stringify(ch), e.message);
  }

  let glyph;
  if (fs.existsSync(rawPath)) {
    const buf = fs.readFileSync(rawPath);
    fs.unlinkSync(rawPath);
    let minX = canvasW, minY = canvasH, maxX = -1, maxY = -1;
    for (let y = 0; y < canvasH; y++) {
      for (let x = 0; x < canvasW; x++) {
        const a = buf[(y * canvasW + x) * 4 + 3];
        if (a > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      glyph = { w: 0, h: 0, data: new Uint8Array(0) };
    } else {
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      const data = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          data[y * w + x] = buf[((minY + y) * canvasW + (minX + x)) * 4 + 3];
        }
      }
      glyph = { w, h, data };
    }
  } else {
    glyph = { w: 0, h: 0, data: new Uint8Array(0) };
  }
  rawGlyphCache.set(key, glyph);
  return glyph;
}

// Downsample-safe resize of a single-channel (alpha) mask.
//   INFORMATION GAP / bug fixed during self-verify round 1: naive bilinear
//   point-sampling loses thin strokes (apostrophes, hyphens, serifs on small
//   letters) when downscaling from the large reference raster (REF_SIZE=260)
//   down to small box.h values (some as small as 3px). Point-sampled
//   bilinear only looks at a 2x2 neighborhood regardless of how large the
//   true downscale ratio is, so a thin stroke can fall entirely between
//   sample points and vanish. Fixed with a proper area/box-filter downsample
//   (mipmap-style iterative halving + a final fractional box-filter pass),
//   which integrates ink coverage over the whole source region contributing
//   to each destination pixel.
function halveMask(src, w, h) {
  const w2 = Math.max(1, Math.floor(w / 2));
  const h2 = Math.max(1, Math.floor(h / 2));
  const dst = new Float64Array(w2 * h2);
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      let sum = 0, count = 0;
      for (let dy = 0; dy < 2; dy++) {
        const sy = y * 2 + dy;
        if (sy >= h) continue;
        for (let dx = 0; dx < 2; dx++) {
          const sx = x * 2 + dx;
          if (sx >= w) continue;
          sum += src[sy * w + sx];
          count++;
        }
      }
      dst[y * w2 + x] = count > 0 ? sum / count : 0;
    }
  }
  return { data: dst, w: w2, h: h2 };
}

function boxFilterResize(src, srcW, srcH, dstW, dstH) {
  const dst = new Float64Array(dstW * dstH);
  const xScale = srcW / dstW, yScale = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    const sy0 = y * yScale, sy1 = (y + 1) * yScale;
    const iy0 = Math.floor(sy0), iy1 = Math.min(srcH, Math.ceil(sy1));
    for (let x = 0; x < dstW; x++) {
      const sx0 = x * xScale, sx1 = (x + 1) * xScale;
      const ix0 = Math.floor(sx0), ix1 = Math.min(srcW, Math.ceil(sx1));
      let sum = 0, area = 0;
      for (let sy = iy0; sy < iy1; sy++) {
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        if (wy <= 0) continue;
        for (let sx = ix0; sx < ix1; sx++) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          if (wx <= 0) continue;
          const w = wx * wy;
          sum += src[sy * srcW + sx] * w;
          area += w;
        }
      }
      dst[y * dstW + x] = area > 0 ? sum / area : 0;
    }
  }
  return { data: dst, w: dstW, h: dstH };
}

function resizeMask(src, srcW, srcH, dstW, dstH) {
  dstW = Math.max(1, Math.round(dstW));
  dstH = Math.max(1, Math.round(dstH));
  if (srcW <= 0 || srcH <= 0) return { data: new Uint8Array(dstW * dstH), w: dstW, h: dstH };
  let cur = { data: Float64Array.from(src), w: srcW, h: srcH };
  while (cur.w > dstW * 2 && cur.h > dstH * 2) {
    cur = halveMask(cur.data, cur.w, cur.h);
  }
  const boxed = boxFilterResize(cur.data, cur.w, cur.h, dstW, dstH);
  const out = new Uint8Array(dstW * dstH);
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.max(0, Math.min(255, Math.round(boxed.data[i])));
  }
  return { data: out, w: dstW, h: dstH };
}

// Cache of scaled masks per (char weight boxH) -- box.h is the authoritative
// per-letter size, so many letters across the timeline share the same
// (char, weight, boxH) combination.
const scaledMaskCache = new Map();
function getScaledMask(ch, weight, boxH) {
  const fontFile = fontForWeight(weight);
  const h = Math.max(1, Math.round(boxH));
  const key = `${fontFile}_${ch.codePointAt(0)}_${h}`;
  if (scaledMaskCache.has(key)) return scaledMaskCache.get(key);
  const raw = rasterizeRawGlyph(ch, fontFile);
  let scaled;
  if (raw.w === 0 || raw.h === 0) {
    scaled = { data: new Uint8Array(0), w: 0, h: 0 };
  } else {
    const scale = h / raw.h;
    const w = raw.w * scale;
    scaled = resizeMask(raw.data, raw.w, raw.h, w, h);
  }
  scaledMaskCache.set(key, scaled);
  return scaled;
}

// ---------------------------------------------------------------------------
// Build per-letter render instances.
// Enter letters: animate [t0,t1] from(from.x/y,from.alpha) -> box(x,y),
//   alpha 1; hold fully visible box position/size until group.visibleUntilMs.
// Exit letters: animate [t0,t1] from box(x,y) alpha 1 -> to(x,y), to.alpha.
//   (v2 gives text-exit its own style + box, so no more style inheritance
//   guessing needed like v1 had to do.)
// ---------------------------------------------------------------------------
const instances = [];

for (const ev of events) {
  if (ev.type !== 'text-enter' && ev.type !== 'text-exit') continue;
  const style = ev.style || { colorRGB: [34, 34, 34], weightEstimate: 'regular' };
  const color = style.colorRGB || [34, 34, 34];
  const weight = style.weightEstimate;
  const curve = (ev.motion && ev.motion.curve) || 'linear';

  for (const L of ev.letters || []) {
    const mask = getScaledMask(L.ch, weight, L.box.h);
    if (ev.type === 'text-enter') {
      instances.push({
        kind: 'enter',
        mask, color,
        animStart: L.t0, animEnd: L.t1,
        fromX: L.from.x, fromY: L.from.y, fromAlpha: L.from.alpha,
        toX: L.box.x, toY: L.box.y,
        holdEnd: ev.visibleUntilMs,
        curve,
      });
    } else {
      // exit: authoritative start = box (settled position), matches 'from'
      // to within ~1px per data inspection; box is preferred as the more
      // precisely-labeled authoritative field.
      instances.push({
        kind: 'exit',
        mask, color,
        animStart: L.t0, animEnd: L.t1,
        fromX: L.box.x, fromY: L.box.y, fromAlpha: 1,
        toX: L.to.x, toY: L.to.y, toAlpha: (L.to.alpha ?? 0),
        curve,
      });
    }
  }
}
console.error(`Built ${instances.length} letter render instances.`);

// ---------------------------------------------------------------------------
// product-demonstration placeholder: "[product demonstration]" small gray
// centered text, rasterized once as a whole string (this placeholder isn't
// subject to the per-letter box-fidelity requirement -- it's a stand-in for
// content we intentionally do not fabricate).
// ---------------------------------------------------------------------------
// static-hold events observed in this transcript are always sandwiched
// between two product-demonstration windows (e024 -> e025 -> e026), i.e. the
// video is presumably still showing the paused/static product screenshot,
// not blank white. INFORMATION GAP: the schema doesn't say what a
// static-hold should render (no letters, no product flag); we treat it the
// same as product-demonstration (placeholder) rather than leave a jarring
// blank-white flash, since it's contextually bounded by product windows in
// this transcript. See gaps log.
const productWindows = events.filter(e => e.type === 'product-demonstration' || e.type === 'static-hold');
let placeholder = null;
{
  const label = '[product demonstration]';
  const fontsize = 18;
  const canvasW = 400, canvasH = 50;
  const rawPath = path.join(workDir, 'placeholder.rgba');
  const labelTextPath = path.join(workDir, 'placeholder_text.txt');
  fs.writeFileSync(labelTextPath, label);
  const filter = `color=c=black@0.0:s=${canvasW}x${canvasH},format=rgba[bg];[bg]drawtext=fontfile=${FONT_REGULAR}:textfile=${labelTextPath}:fontsize=${fontsize}:fontcolor=0x828282:x=(w-text_w)/2:y=(h-text_h)/2`;
  execFileSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', filter,
    '-frames:v', '1', '-pix_fmt', 'rgba', '-f', 'rawvideo', rawPath,
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
  const buf = fs.readFileSync(rawPath);
  fs.unlinkSync(rawPath);
  let minX = canvasW, minY = canvasH, maxX = -1, maxY = -1;
  for (let y = 0; y < canvasH; y++) for (let x = 0; x < canvasW; x++) {
    const a = buf[(y * canvasW + x) * 4 + 3];
    if (a > 10) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    data[y * w + x] = buf[((minY + y) * canvasW + (minX + x)) * 4 + 3];
  }
  placeholder = { w, h, data, color: [130, 130, 130] };
}

// ---------------------------------------------------------------------------
// Compositing
// ---------------------------------------------------------------------------
function drawMask(frame, mask, x0, y0, alpha, color) {
  if (alpha <= 0.002 || mask.w === 0) return;
  x0 = Math.round(x0); y0 = Math.round(y0);
  const [cr, cg, cb] = color;
  for (let gy = 0; gy < mask.h; gy++) {
    const fy = y0 + gy;
    if (fy < 0 || fy >= height) continue;
    const rowBase = fy * width;
    const maskRow = gy * mask.w;
    for (let gx = 0; gx < mask.w; gx++) {
      const fx = x0 + gx;
      if (fx < 0 || fx >= width) continue;
      const a = (mask.data[maskRow + gx] / 255) * alpha;
      if (a <= 0.002) continue;
      const fi = (rowBase + fx) * 3;
      frame[fi] = Math.round(cr * a + frame[fi] * (1 - a));
      frame[fi + 1] = Math.round(cg * a + frame[fi + 1] * (1 - a));
      frame[fi + 2] = Math.round(cb * a + frame[fi + 2] * (1 - a));
    }
  }
}

const totalFrames = Math.ceil((durationMs / 1000) * OUTPUT_FPS);
const BG = 255;

function renderFrame(tMs) {
  const frame = Buffer.alloc(width * height * 3, BG);

  const inProduct = productWindows.some(w => tMs >= w.t0 && tMs < w.t1);
  if (inProduct && placeholder) {
    const x0 = (width - placeholder.w) / 2;
    const y0 = (height - placeholder.h) / 2;
    drawMask(frame, placeholder, x0, y0, 1.0, placeholder.color);
  }

  for (const L of instances) {
    if (L.kind === 'enter') {
      if (tMs < L.animStart) continue;
      if (tMs <= L.animEnd) {
        const span = Math.max(1, L.animEnd - L.animStart);
        const t = (tMs - L.animStart) / span;
        const e = ease(L.curve, t);
        const x = lerp(L.fromX, L.toX, e);
        const y = lerp(L.fromY, L.toY, e);
        const alpha = lerp(L.fromAlpha, 1, e);
        drawMask(frame, L.mask, x, y, alpha, L.color);
      } else if (tMs <= L.holdEnd) {
        drawMask(frame, L.mask, L.toX, L.toY, 1.0, L.color);
      }
      // else: past hold, nothing more drawn for this instance (a matching
      // text-exit instance, if any, takes over independently below).
    } else {
      // exit
      if (tMs < L.animStart || tMs > L.animEnd) continue;
      const span = Math.max(1, L.animEnd - L.animStart);
      const t = (tMs - L.animStart) / span;
      const e = ease(L.curve, t);
      const x = lerp(L.fromX, L.toX, e);
      const y = lerp(L.fromY, L.toY, e);
      const alpha = lerp(L.fromAlpha, L.toAlpha, e);
      drawMask(frame, L.mask, x, y, alpha, L.color);
    }
  }
  return frame;
}

// ---------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------
const ffArgs = [
  '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${width}x${height}`, '-r', `${OUTPUT_FPS}/1`,
  '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', `${OUTPUT_FPS}/1`, '-crf', '18', '-preset', 'veryfast',
  outputPath,
];
const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

let frameIdx = 0;
function writeNextBatch() {
  const BATCH = 30;
  let i = 0;
  function pump() {
    let ok = true;
    while (ok && frameIdx < totalFrames && i < BATCH) {
      const tMs = (frameIdx / OUTPUT_FPS) * 1000;
      const frame = renderFrame(tMs);
      ok = ff.stdin.write(frame);
      frameIdx++; i++;
    }
    if (frameIdx >= totalFrames) { ff.stdin.end(); return; }
    if (i >= BATCH) { i = 0; setImmediate(pump); }
    else if (!ok) { ff.stdin.once('drain', () => { i = 0; pump(); }); }
  }
  pump();
}

ff.on('close', (code) => {
  console.error(`ffmpeg exited with code ${code}. Frames written: ${frameIdx}/${totalFrames}`);
  process.exit(code === 0 ? 0 : 1);
});

console.error(`Rendering ${totalFrames} frames at ${OUTPUT_FPS}fps (${width}x${height})...`);
writeNextBatch();
