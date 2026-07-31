#!/usr/bin/env node
/**
 * rebuild-from-transcript.mjs
 *
 * Rebuilds an animated text video from a "transcript" JSON that describes
 * per-letter enter/exit animations (position, alpha, curve, stagger),
 * product-demonstration placeholders, static holds, and cut markers.
 *
 * No external npm dependencies -- glyphs are rasterized once via ffmpeg's
 * drawtext filter (onto a small transparent canvas) and then composited
 * per-frame in pure JS onto an RGB24 framebuffer that is piped into ffmpeg
 * for final H.264 encoding.
 *
 * Usage:
 *   node rebuild-from-transcript.mjs <transcript.json> <output.mp4> [--workdir DIR]
 */

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const transcriptPath = args[0];
const outputPath = args[1];
let workDir = path.join(os.tmpdir(), 'rebuild-work');
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--workdir') workDir = args[++i];
}

if (!transcriptPath || !outputPath) {
  console.error('Usage: node rebuild-from-transcript.mjs <transcript.json> <output.mp4> [--workdir DIR]');
  process.exit(1);
}

const glyphDir = path.join(workDir, 'glyphs');
fs.mkdirSync(glyphDir, { recursive: true });

const FONT_REGULAR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

// ---------------------------------------------------------------------------
// Load transcript
// ---------------------------------------------------------------------------
const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
const { width, height, fps, durationMs } = transcript.video;
const events = transcript.events;

// ---------------------------------------------------------------------------
// Easing functions
//   INFORMATION GAP: transcript only names the curve ("linear" | "ease-out" |
//   "ease-in"); exact easing polynomial/exponent is not specified. We use
//   standard quadratic ease-in/out as a reasonable default.
// ---------------------------------------------------------------------------
function ease(curve, t) {
  t = Math.max(0, Math.min(1, t));
  switch (curve) {
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in':
      return t * t;
    case 'linear':
    default:
      return t;
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Per-letter animation duration.
//   INFORMATION GAP (high impact): the transcript gives each letter only a
//   t0 (start time). There is no explicit per-letter duration/end time. The
//   parent event has t0/t1 (overall span) and sometimes staggerMs. We derive
//   a per-letter duration as follows:
//     - If the group has N letters and a staggerMs, the last letter's
//       "budget" until group t1 is used as its duration, and earlier letters
//       get duration = (t1 - t0_letter), capped at a reasonable max so
//       letters don't animate glacially slow when they start very early.
//     - If no staggerMs (single/simultaneous letters), duration =
//       (event.t1 - event.t0), or a fallback of 400ms if degenerate (t1<=t0).
//   This is an assumption; the true per-letter tween length is not encoded.
// ---------------------------------------------------------------------------
const DEFAULT_LETTER_DUR = 400; // ms fallback
const MAX_LETTER_DUR = 900; // cap so a letter starting at group t0 with a
                             // far-away group t1 doesn't crawl

function computeLetterDuration(event) {
  const span = (event.t1 ?? event.t0 + DEFAULT_LETTER_DUR) - event.t0;
  if (span > 0) return Math.min(span, MAX_LETTER_DUR);
  return DEFAULT_LETTER_DUR;
}

// ---------------------------------------------------------------------------
// Glyph rasterization
//   Each distinct (char, glyphHeightPx-rounded, weight, colorRGB) combo is
//   rendered once to a transparent-background PNG via ffmpeg drawtext, then
//   read back as RGBA via ffmpeg rawvideo pipe.
//   INFORMATION GAP: exact font family is unknown (transcript only supplies
//   weightEstimate: bold/regular/light). We map bold/heavy -> DejaVuSans-Bold,
//   everything else -> DejaVuSans (regular). "light" has no DejaVu Light
//   variant readily available without extra fc-config, so it also falls back
//   to regular DejaVuSans (a low-impact simplification).
// ---------------------------------------------------------------------------
const glyphCache = new Map();

function fontForWeight(weightEstimate) {
  if (weightEstimate === 'bold' || weightEstimate === 'heavy') return FONT_BOLD;
  return FONT_REGULAR; // 'regular' | 'light' | undefined
}

function glyphKey(ch, sizePx, fontFile, color) {
  return `${ch.codePointAt(0)}_${sizePx}_${path.basename(fontFile)}_${color.join('-')}`;
}

// Render a single glyph to raw RGBA buffer + its canvas width/height using
// ffmpeg drawtext on a transparent canvas. We oversize the canvas generously
// and let ffmpeg tell us nothing back (drawtext doesn't report metrics), so
// we use a generous fixed padding around an estimated bounding box, then trim
// via alpha scan in JS. This keeps compositing simple (glyph placed by its
// visual top-left after trim, anchored using the transcript's per-letter x/y
// which we treat as a baseline-left-ish anchor -- see INFORMATION GAP notes
// in README/report about anchor semantics).
function rasterizeGlyph(ch, sizePx, fontFile, color) {
  const key = glyphKey(ch, sizePx, fontFile, color);
  if (glyphCache.has(key)) return glyphCache.get(key);

  const canvasW = Math.ceil(sizePx * 2.2) + 8;
  const canvasH = Math.ceil(sizePx * 2.2) + 8;
  const rawPath = path.join(glyphDir, `${key.replace(/[^a-zA-Z0-9_.-]/g, '_')}.rgba`);

  // Escape text for ffmpeg drawtext (colon, backslash, percent, single quote,
  // apostrophe need escaping).
  let text = ch;
  if (text === "'") text = '\\\'';
  const escaped = text
    .replace(/\\/g, '\\\\\\\\')
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%');

  const [r, g, b] = color;
  const colorHex = `0x${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

  // Render directly to a transparent RGBA raw buffer -- NOTE: must include
  // format=rgba in the filter chain, otherwise ffmpeg's lavfi color source
  // gets flattened to opaque rgb24 and all "transparent" pixels become solid
  // black (a real bug we hit and fixed during development/testing).
  const filter = `color=c=black@0.0:s=${canvasW}x${canvasH},format=rgba[bg];[bg]drawtext=fontfile=${fontFile}:text='${escaped}':fontsize=${sizePx}:fontcolor=${colorHex}:x=(w-text_w)/2:y=(h-text_h)/2`;

  try {
    execFileSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', filter,
      '-frames:v', '1', '-pix_fmt', 'rgba', '-f', 'rawvideo',
      rawPath,
    ], { stdio: ['ignore', 'ignore', 'ignore'] });
  } catch (e) {
    console.error('ffmpeg glyph render failed for', ch, e.message);
  }

  const buf = fs.readFileSync(rawPath);
  fs.unlinkSync(rawPath);

  // Trim to tight bounding box using alpha channel, but remember the offset
  // from canvas center so we can re-anchor around the transcript x/y point
  // (which we treat as the glyph's visual left edge at its transcript y,
  // approximating a baseline/vertical-center hybrid -- see report).
  let minX = canvasW, minY = canvasH, maxX = -1, maxY = -1;
  for (let y = 0; y < canvasH; y++) {
    for (let x = 0; x < canvasW; x++) {
      const a = buf[(y * canvasW + x) * 4 + 3];
      if (a > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  let glyph;
  if (maxX < 0) {
    // blank glyph (space etc.)
    glyph = { w: 1, h: 1, data: Buffer.alloc(4), offsetX: 0, offsetY: 0 };
  } else {
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const data = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      const srcRow = (minY + y) * canvasW + minX;
      buf.copy(data, y * w * 4, srcRow * 4, (srcRow + w) * 4);
    }
    glyph = { w, h, data, offsetX: minX - canvasW / 2, offsetY: minY - canvasH / 2 };
  }
  glyphCache.set(key, glyph);
  return glyph;
}

// ---------------------------------------------------------------------------
// Pre-scan: rasterize every distinct glyph referenced in the transcript.
// ---------------------------------------------------------------------------
function collectGlyphRequests() {
  const requests = new Map(); // key -> {ch,sizePx,fontFile,color}
  for (const ev of events) {
    if (ev.type !== 'text-enter' && ev.type !== 'text-exit') continue;
    const style = ev.style || inheritedStyleFor(ev);
    if (!style) continue;
    const sizePx = Math.max(4, Math.round(style.glyphHeightPx));
    const fontFile = fontForWeight(style.weightEstimate);
    const color = style.colorRGB || [34, 34, 34];
    for (const L of ev.letters || []) {
      const key = glyphKey(L.ch, sizePx, fontFile, color);
      if (!requests.has(key)) requests.set(key, { ch: L.ch, sizePx, fontFile, color });
    }
  }
  return requests;
}

// text-exit events in this transcript format frequently omit `style`
// (INFORMATION GAP, high impact): we must inherit color/size/weight from the
// most recent text-enter event that shares overlapping letters/text, so the
// exiting text renders in the same style it entered with. We match by
// looking backwards for the most recent enter event whose `text` field
// shares the most characters in common (heuristic), falling back to the
// nearest preceding enter event overall.
function inheritedStyleFor(exitEvent) {
  if (exitEvent.style) return exitEvent.style;
  let best = null;
  let bestScore = -1;
  for (const ev of events) {
    if (ev.type !== 'text-enter') continue;
    if (ev.t0 > exitEvent.t0) continue;
    if (!ev.style) continue;
    // crude overlap score: shared characters between ev.text and exitEvent.text
    const a = new Set((ev.text || '').replace(/\s/g, '').split(''));
    const b = new Set((exitEvent.text || '').replace(/\s/g, '').split(''));
    let score = 0;
    for (const c of b) if (a.has(c)) score++;
    // prefer temporally closer matches on tie
    score = score * 1000 - (exitEvent.t0 - ev.t0);
    if (score > bestScore) {
      bestScore = score;
      best = ev.style;
    }
  }
  return best || { colorRGB: [34, 34, 34], glyphHeightPx: 24, weightEstimate: 'regular' };
}

const glyphRequests = collectGlyphRequests();
console.error(`Rasterizing ${glyphRequests.size} distinct glyphs...`);
const glyphs = new Map();
for (const [key, req] of glyphRequests) {
  glyphs.set(key, rasterizeGlyph(req.ch, req.sizePx, req.fontFile, req.color));
}
console.error('Glyph rasterization complete.');

// ---------------------------------------------------------------------------
// Build a flat list of "letter instances" with resolved absolute timing and
// per-letter style, for both enter and exit events.
// ---------------------------------------------------------------------------
const letterInstances = [];

for (const ev of events) {
  if (ev.type !== 'text-enter' && ev.type !== 'text-exit') continue;
  const style = ev.style || inheritedStyleFor(ev);
  const sizePx = Math.max(4, Math.round(style.glyphHeightPx));
  const fontFile = fontForWeight(style.weightEstimate);
  const color = style.colorRGB || [34, 34, 34];
  const curve = (ev.motion && ev.motion.curve) || 'linear';
  const letterDur = computeLetterDuration(ev);

  for (const L of ev.letters || []) {
    const key = glyphKey(L.ch, sizePx, fontFile, color);
    const glyph = glyphs.get(key);
    if (!glyph) continue;
    const t0 = L.t0;
    const t1 = t0 + letterDur;
    letterInstances.push({
      glyph,
      t0,
      t1,
      from: L.from,
      to: L.to,
      curve,
      eventType: ev.type,
      eventId: ev.id,
    });
  }
}

console.error(`Total letter instances: ${letterInstances.length}`);

// Sort by t0 for a small perf win when scanning (not strictly required)
letterInstances.sort((a, b) => a.t0 - b.t0);

// ---------------------------------------------------------------------------
// product-demonstration / static-hold windows
// ---------------------------------------------------------------------------
const productWindows = events.filter(e => e.type === 'product-demonstration');

// ---------------------------------------------------------------------------
// Frame compositing
// ---------------------------------------------------------------------------
const totalFrames = Math.ceil((durationMs / 1000) * fps);
const bg = 255; // plain white background
// INFORMATION GAP: transcript style blocks include a `bgGray` field per
// event (e.g. 255, 233, 227, 248...) which likely reflects the *sampled*
// background luminance behind that text at capture time (probably from a
// gradient/app-screenshot backdrop in the real product demo footage), NOT an
// instruction to paint a flat gray rectangle. Per task instructions we
// render a plain white canvas throughout and ignore bgGray, since attempting
// to reconstruct the true (unknown) background imagery is out of scope and
// would be pure fabrication. This is a high-impact known divergence from the
// source video's actual look during any segment where bgGray != 255.
const label = '[product demonstration]';

function drawGlyphIntoFrame(frame, glyph, cx, cy, alpha) {
  if (alpha <= 0.002) return;
  const startX = Math.round(cx - glyph.w / 2 + (glyph.offsetX || 0) * 0 + glyph.offsetXAdjust || 0);
  // We anchor glyph so that (cx, cy) corresponds to the letter's transcript
  // from/to x,y point, treated as the glyph's left edge at vertical-center
  // of the glyph (a reasonable middle ground given anchor semantics are
  // ambiguous -- see INFORMATION GAP notes).
  const x0 = Math.round(cx);
  const y0 = Math.round(cy - glyph.h / 2);
  for (let gy = 0; gy < glyph.h; gy++) {
    const fy = y0 + gy;
    if (fy < 0 || fy >= height) continue;
    for (let gx = 0; gx < glyph.w; gx++) {
      const fx = x0 + gx;
      if (fx < 0 || fx >= width) continue;
      const gi = (gy * glyph.w + gx) * 4;
      const ga = glyph.data[gi + 3] / 255;
      const a = ga * alpha;
      if (a <= 0.002) continue;
      const fi = (fy * width + fx) * 3;
      const gr = glyph.data[gi];
      const gg = glyph.data[gi + 1];
      const gb = glyph.data[gi + 2];
      frame[fi] = Math.round(gr * a + frame[fi] * (1 - a));
      frame[fi + 1] = Math.round(gg * a + frame[fi + 1] * (1 - a));
      frame[fi + 2] = Math.round(gb * a + frame[fi + 2] * (1 - a));
    }
  }
}

// Pre-rasterize the product-demonstration placeholder label once (gray text).
const PLACEHOLDER_COLOR = [130, 130, 130];
const PLACEHOLDER_SIZE = 18;
const placeholderGlyphs = [];
{
  const fontFile = FONT_REGULAR;
  let cursorAdvance = 0;
  for (const ch of label) {
    const g = rasterizeGlyph(ch, PLACEHOLDER_SIZE, fontFile, PLACEHOLDER_COLOR);
    placeholderGlyphs.push({ ch, glyph: g });
  }
}
// crude monospace-ish advance based on average glyph width + spacing
function placeholderTotalWidth() {
  let w = 0;
  for (const { glyph, ch } of placeholderGlyphs) {
    w += (ch === ' ' ? PLACEHOLDER_SIZE * 0.35 : glyph.w + 1.5);
  }
  return w;
}
const placeholderWidth = placeholderTotalWidth();

function drawPlaceholder(frame) {
  let x = Math.round((width - placeholderWidth) / 2);
  const y = Math.round(height / 2);
  for (const { glyph, ch } of placeholderGlyphs) {
    if (ch === ' ') {
      x += PLACEHOLDER_SIZE * 0.35;
      continue;
    }
    drawGlyphIntoFrame(frame, glyph, x, y, 1.0);
    x += glyph.w + 1.5;
  }
}

// ---------------------------------------------------------------------------
// Spawn ffmpeg encoder, pipe raw frames to stdin
// ---------------------------------------------------------------------------
const ffArgs = [
  '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${width}x${height}`, '-r', String(fps),
  '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'veryfast',
  outputPath,
];
const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

let frameIdx = 0;

function renderFrame(tMs) {
  const frame = Buffer.alloc(width * height * 3, bg);

  // product-demonstration placeholder
  const inProduct = productWindows.some(w => tMs >= w.t0 && tMs < w.t1);
  if (inProduct) {
    drawPlaceholder(frame);
  }

  // active letters
  for (const L of letterInstances) {
    if (tMs < L.t0 || tMs >= L.t1) continue;
    const t = (tMs - L.t0) / (L.t1 - L.t0);
    const e = ease(L.curve, t);
    const x = lerp(L.from.x, L.to.x, e);
    const y = lerp(L.from.y, L.to.y, e);
    const alpha = lerp(L.from.alpha, L.to.alpha, e);
    drawGlyphIntoFrame(frame, L.glyph, x, y, alpha);
  }

  return frame;
}

function writeNextBatch() {
  const BATCH = 30;
  let i = 0;
  function pump() {
    let ok = true;
    while (ok && frameIdx < totalFrames && i < BATCH) {
      const tMs = (frameIdx / fps) * 1000;
      const frame = renderFrame(tMs);
      ok = ff.stdin.write(frame);
      frameIdx++;
      i++;
    }
    if (frameIdx >= totalFrames) {
      ff.stdin.end();
      return;
    }
    if (i >= BATCH) {
      i = 0;
      setImmediate(pump);
    } else if (!ok) {
      ff.stdin.once('drain', () => { i = 0; pump(); });
    }
  }
  pump();
}

ff.on('close', (code) => {
  console.error(`ffmpeg exited with code ${code}. Frames written: ${frameIdx}/${totalFrames}`);
  process.exit(code === 0 ? 0 : 1);
});

console.error(`Rendering ${totalFrames} frames at ${fps}fps (${width}x${height})...`);
writeNextBatch();
