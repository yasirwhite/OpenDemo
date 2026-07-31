#!/usr/bin/env node
/**
 * compare.mjs — reference frame above, our render below, for a list of times.
 *
 * The acceptance test for this layer is visual: render, look at it next to the
 * reference, fix what differs. This builds the pairs to look at.
 *
 * Usage:
 *   node text-layer/compare.mjs 1.0:1.0 3.1:3.1 3.9:4.2 ...
 *   (each pair is refSeconds:oursSeconds)
 */

import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { mkdirSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
function findFfmpeg() {
  if (process.env.OPENDEMO_FFMPEG && existsSync(process.env.OPENDEMO_FFMPEG)) return process.env.OPENDEMO_FFMPEG;
  try { const p = require("@ffmpeg-installer/ffmpeg").path; if (existsSync(p)) return p; } catch {}
  return "ffmpeg";
}
const FFMPEG = findFfmpeg();
const REF = resolve(__dirname, "..", "reference", "mem-reference.mp4");
const OUTDIR = resolve(__dirname, "cmp");
// Wipe between runs: the tiler globs p_%02d.png, so leftovers from a longer
// previous run get silently tiled in alongside the current ones.
rmSync(OUTDIR, { recursive: true, force: true });
mkdirSync(OUTDIR, { recursive: true });

const pairs = process.argv.slice(2).filter((a) => a.includes(":")).map((a) => {
  const [r, o] = a.split(":").map(Number);
  return { ref: r, ours: o };
});
if (!pairs.length) { console.log("usage: compare.mjs ref:ours [ref:ours ...]"); process.exit(1); }

const browser = await chromium.launch({ headless: true, args: ["--force-device-scale-factor=1"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
await page.goto("file://" + resolve(__dirname, "index.html").replace(/\\/g, "/"), { waitUntil: "load" });
await page.waitForFunction("window.__ready === true", { timeout: 20000 });
const stage = await page.$("#root");

const tiles = [];
let i = 0;
for (const p of pairs) {
  const refPng = join(OUTDIR, `r_${String(i).padStart(2, "0")}.png`);
  spawnSync(FFMPEG, ["-y", "-v", "error", "-ss", String(p.ref), "-i", REF,
    "-frames:v", "1", "-vf", "scale=560:315", refPng]);

  await page.evaluate((t) => window.renderAtTime(t), p.ours);
  const oursRaw = join(OUTDIR, `o_raw_${String(i).padStart(2, "0")}.png`);
  writeFileSync(oursRaw, await stage.screenshot({ type: "png" }));
  const oursPng = join(OUTDIR, `o_${String(i).padStart(2, "0")}.png`);
  spawnSync(FFMPEG, ["-y", "-v", "error", "-i", oursRaw, "-vf", "scale=560:315", oursPng]);

  // Stack: reference on top, ours beneath, labelled by position.
  const pairPng = join(OUTDIR, `p_${String(i).padStart(2, "0")}.png`);
  spawnSync(FFMPEG, ["-y", "-v", "error", "-i", refPng, "-i", oursPng,
    "-filter_complex", "[0][1]vstack=inputs=2", pairPng]);
  tiles.push(pairPng);
  console.log(`  ref ${p.ref}s / ours ${p.ours}s`);
  i++;
}
await browser.close();

const cols = Math.min(3, tiles.length);
const rows = Math.ceil(tiles.length / cols);
const out = resolve(__dirname, "compare.png");
spawnSync(FFMPEG, ["-y", "-v", "error", "-i", join(OUTDIR, "p_%02d.png"),
  "-filter_complex", `tile=${cols}x${rows}:margin=6:padding=6:color=0x666666`, "-frames:v", "1", out]);
console.log(`\nTOP = reference, BOTTOM = ours\n${out}`);
