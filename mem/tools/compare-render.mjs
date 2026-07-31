#!/usr/bin/env node
/**
 * compare-render.mjs
 * Builds a labelled side-by-side of two renders for eyeball review.
 *
 * Usage:
 *   node scripts/compare-render.mjs <left.mp4> "<left label>" <right.mp4> "<right label>" <out.mp4>
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { FFMPEG } from "../../scripts/video-signature.mjs";
import { findFont, drawtextFontArg } from "../../scripts/text-slide.mjs";

const [leftPath, leftLabel, rightPath, rightLabel, outPath] = process.argv.slice(2);
if (!outPath) {
  console.log('Usage: node scripts/compare-render.mjs <left.mp4> "<label>" <right.mp4> "<label>" <out.mp4>');
  process.exit(1);
}

const font = drawtextFontArg(findFont());
const label = (text) =>
  `drawtext=fontfile=${font}:text='${text.replace(/'/g, "’").replace(/:/g, "\\:")}'` +
  `:fontsize=19:fontcolor=black:box=1:boxcolor=white@0.8:boxborderw=9:x=18:y=18`;

const filter =
  `[0:v]scale=640:360,${label(leftLabel)}[a];` +
  `[1:v]scale=640:360,${label(rightLabel)}[b];` +
  `[a][b]hstack=inputs=2`;

const r = spawnSync(FFMPEG, [
  "-y", "-v", "error", "-i", resolve(leftPath), "-i", resolve(rightPath),
  "-filter_complex", filter,
  "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  resolve(outPath),
], { encoding: "utf8" });

if (r.status !== 0) {
  console.error(`ffmpeg failed: ${(r.stderr || "").slice(-400)}`);
  process.exit(1);
}
console.log(`✅ ${resolve(outPath)}`);
