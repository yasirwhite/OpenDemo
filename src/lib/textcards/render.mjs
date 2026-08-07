#!/usr/bin/env node
/**
 * render.mjs — renders a text-card config to mp4, frame by frame.
 *
 * Same shape as the 3D branch's renderer: launch headless Chromium, walk the
 * timeline calling window.renderAtTime(t), screenshot each frame, pipe to
 * ffmpeg. Deterministic because nothing in the page animates on wall clock.
 *
 * Usage:
 *   node src/lib/textcards/render.mjs [--out out.mp4] [--fps 60]
 *   node src/lib/textcards/render.mjs --at 3.2 --png frame.png   (single frame)
 *   node src/lib/textcards/render.mjs --sheet --times 1,2,3      (contact sheet)
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function findFfmpeg() {
  if (process.env.OPENDEMO_FFMPEG && existsSync(process.env.OPENDEMO_FFMPEG)) return process.env.OPENDEMO_FFMPEG;
  try {
    const p = require("@ffmpeg-installer/ffmpeg").path;
    if (existsSync(p)) return p;
  } catch { /* fall through */ }
  return "ffmpeg";
}
const FFMPEG = findFfmpeg();

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const has = (name) => args.includes(name);

const OUT = opt("--out", resolve(__dirname, "out.mp4"));
// 60fps: the reference's reveals move ~50ms per character, so at 30fps a
// character transition spans under two frames and reads as steppy.
const FPS = parseFloat(opt("--fps", "60"));
const AT = opt("--at", null);
const PNG = opt("--png", null);
const SHEET = has("--sheet");
const SHEET_TIMES = (opt("--times", "") || "").split(",").filter(Boolean).map(Number);
// --html <file> renders a PRIVATE copy of the stage (its own index.html +
// dist/bundle.js) instead of the shared one. Two people rendering different
// films at once otherwise race on dist/bundle.js: A builds, B builds, A
// screenshots B's film. Snapshot the bundle after your build, point --html at
// the snapshot, and your render cannot be overwritten mid-flight. Omitted =
// the shared stage, exactly as before.
const HTML = opt("--html", null);

const url = "file://" + resolve(HTML ?? resolve(__dirname, "index.html")).replace(/\\/g, "/");

const browser = await chromium.launch({ headless: true, args: ["--force-device-scale-factor=1"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text()); });
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction("window.__ready === true", { timeout: 20000 });

const DURATION = await page.evaluate("window.DURATION");
const stage = await page.$("#root");

// prepareFrame(t) seeks any footage bound to a window (src/video-sources.js)
// and resolves only once the decoder has produced that picture. It MUST be
// awaited before renderAtTime: screenshotting mid-seek captures the previous
// frame, which is invisible in a still and reads as a tear in motion. Configs
// without footage resolve immediately, so this is a no-op for them.
async function shoot(t) {
  await page.evaluate(async (tt) => {
    if (window.prepareFrame) await window.prepareFrame(tt);
    window.renderAtTime(tt);
    // A <video> is composited on its own layer, and the seeked picture is not
    // guaranteed to be in a committed frame the instant renderAtTime returns —
    // the first capture after a layer is created can come back with the
    // previous picture. Two rAFs put a committed compositor frame between the
    // DOM update and the screenshot. This waits for the compositor only; it
    // decides nothing about WHAT is drawn, so the frame stays a pure function
    // of t. Configs with no footage never take this path.
    if (window.__hasVideo) {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
  }, t);
  return stage.screenshot({ type: "png" });
}

if (AT != null) {
  const buf = await shoot(parseFloat(AT));
  const out = PNG || resolve(__dirname, "frame.png");
  writeFileSync(out, buf);
  console.log(`frame @${AT}s -> ${out}`);
  await browser.close();
  process.exit(0);
}

if (SHEET) {
  const times = SHEET_TIMES.length ? SHEET_TIMES : [0.5, 1.2, 2.8, 3.1, 3.6, 4.3, 5.0, 6.8, 7.6, 8.9, 9.6, 10.3];
  // --sheetdir keeps two people sheeting different films out of each other's
  // frames; omitted = ./sheet as before.
  const SHEETDIR = opt("--sheetdir", null);
  const dir = SHEETDIR ? resolve(SHEETDIR) : resolve(__dirname, "sheet");
  mkdirSync(dir, { recursive: true });
  let i = 0;
  for (const t of times) {
    // In a private sheet dir, name by timestamp — a sheet is compared against
    // the reference at the SAME t and s_07.png does not say which t that was.
    // The default dir keeps the s_NN names other tooling already reads.
    const name = SHEETDIR
      ? `t_${String(Math.round(t * 1000)).padStart(6, "0")}.png`
      : `s_${String(i).padStart(2, "0")}.png`;
    writeFileSync(join(dir, name), await shoot(t));
    i++;
  }
  console.log(`${i} frames -> ${dir}`);
  await browser.close();
  process.exit(0);
}

const total = Math.floor(DURATION * FPS);
console.log(`rendering ${total} frames @ ${FPS}fps (${DURATION}s) -> ${OUT}`);

const ff = spawn(FFMPEG, [
  "-y", "-v", "error",
  "-f", "image2pipe", "-vcodec", "png", "-r", String(FPS), "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "16",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT,
], { stdio: ["pipe", "ignore", "pipe"] });
let ffErr = "";
ff.stderr.on("data", (d) => { ffErr += d; });

for (let f = 0; f < total; f++) {
  const buf = await shoot(f / FPS);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % 60 === 0) process.stdout.write(`  ${f}/${total}\n`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}: ${ffErr.slice(-400)}`)))));
console.log(`done -> ${OUT}`);
await browser.close();
