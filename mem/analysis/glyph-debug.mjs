#!/usr/bin/env node
/**
 * glyph-debug.mjs
 * Visual verification for the glyph segmenter. Measurement code that is only
 * ever checked by reading its own numbers back is measurement code that drifts
 * — this renders what segmentGlyphs() actually found, on top of the frame it
 * found it in, so the boxes can be eyeballed against the real text.
 *
 * Usage:
 *   node scripts/glyph-debug.mjs <video> --at <seconds> [--out box.png]
 *   node scripts/glyph-debug.mjs <video> --strip <s0> <s1> [--n 12]
 */

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { FFMPEG, getVideoMeta } from "../../scripts/video-signature.mjs";
import { segmentGlyphs } from "./glyph-motion.mjs";

function grabFrame(videoPath, tSec, w, h) {
  const r = spawnSync(FFMPEG, [
    "-v", "error", "-ss", tSec.toFixed(3), "-i", videoPath,
    "-vf", `scale=${w}:${h}:flags=area`, "-frames:v", "1",
    "-pix_fmt", "rgb24", "-f", "rawvideo", "-",
  ], { maxBuffer: w * h * 3 + 65536 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < w * h * 3) {
    throw new Error(`grab failed @${tSec}: ${r.stderr?.toString().slice(-200)}`);
  }
  return Buffer.from(r.stdout.subarray(0, w * h * 3));
}

function drawBox(buf, w, h, x0, y0, x1, y1, col) {
  const put = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = (y * w + x) * 3;
    buf[p] = col[0]; buf[p + 1] = col[1]; buf[p + 2] = col[2];
  };
  for (let x = x0; x < x1; x++) { put(x, y0); put(x, y1 - 1); }
  for (let y = y0; y < y1; y++) { put(x0, y); put(x1 - 1, y); }
}

function writePng(buf, w, h, outPath) {
  const r = spawnSync(FFMPEG, [
    "-y", "-v", "error",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${w}x${h}`, "-i", "-",
    resolve(outPath),
  ], { input: buf });
  if (r.status !== 0) throw new Error(`png write failed: ${r.stderr?.toString().slice(-200)}`);
}

const PALETTE = [
  [220, 40, 40], [30, 120, 220], [20, 160, 80], [230, 140, 20],
  [160, 60, 200], [0, 170, 170], [200, 40, 130], [110, 110, 40],
];

function main() {
  const args = process.argv.slice(2);
  const video = resolve(args[0]);
  const meta = getVideoMeta(video);
  const w = meta.width, h = meta.height;

  let at = null, strip = null, n = 12, out = "glyph-debug.png";
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--at") at = parseFloat(args[++i]);
    else if (args[i] === "--strip") strip = [parseFloat(args[++i]), parseFloat(args[++i])];
    else if (args[i] === "--n") n = parseInt(args[++i], 10);
    else if (args[i] === "--out") out = args[++i];
  }

  const times = strip
    ? Array.from({ length: n }, (_, i) => strip[0] + ((strip[1] - strip[0]) * i) / (n - 1))
    : [at];

  if (times.length === 1) {
    const buf = grabFrame(video, times[0], w, h);
    const seg = segmentGlyphs(buf, w, h, {});
    console.log(`t=${times[0]}s  bg=[${seg.bg}]  inkTotal=${seg.inkTotal.toFixed(0)}  glyphs=${seg.glyphs.length}`);
    seg.glyphs.forEach((g, i) => {
      console.log(`  #${i} x=${g.x0}-${g.x1} (${g.x1 - g.x0}w) y=${g.y0}-${g.y1} (${g.y1 - g.y0}h) mass=${g.mass.toFixed(0)}`);
    });
    seg.glyphs.forEach((g, i) => drawBox(buf, w, h, g.x0, g.y0, g.x1, g.y1, PALETTE[i % PALETTE.length]));
    writePng(buf, w, h, out);
    console.log(`💾 ${resolve(out)}`);
    return;
  }

  // Filmstrip: tile the sampled frames into a grid with boxes drawn
  const cols = Math.min(4, times.length);
  const rows = Math.ceil(times.length / cols);
  const tile = Buffer.alloc(w * cols * h * rows * 3, 255);
  const TW = w * cols;
  times.forEach((t, k) => {
    const buf = grabFrame(video, t, w, h);
    const seg = segmentGlyphs(buf, w, h, {});
    seg.glyphs.forEach((g, i) => drawBox(buf, w, h, g.x0, g.y0, g.x1, g.y1, PALETTE[i % PALETTE.length]));
    console.log(`  t=${t.toFixed(2)}s glyphs=${seg.glyphs.length}`);
    const ox = (k % cols) * w, oy = Math.floor(k / cols) * h;
    for (let y = 0; y < h; y++) {
      buf.copy(tile, ((oy + y) * TW + ox) * 3, y * w * 3, (y + 1) * w * 3);
    }
  });
  writePng(tile, TW, h * rows, out);
  console.log(`💾 ${resolve(out)}`);
}

main();
