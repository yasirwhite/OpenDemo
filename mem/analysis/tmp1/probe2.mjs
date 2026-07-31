#!/usr/bin/env node
// v2: robust bg (per-frame modal colour), per-column ink + colour stats, glyph boxes.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const FFMPEG = process.env.OPENDEMO_FFMPEG;
const VIDEO = process.argv[2];
const T0 = parseFloat(process.argv[3] ?? "0");
const DUR = parseFloat(process.argv[4] ?? "3.8");
const OUT = process.argv[5] ?? "p2.json";
const W = 640, H = 360;
const FPS = 30000 / 1001;

function streamRange(startS, durS, onFrame) {
  return new Promise((res, rej) => {
    const args = ["-v", "error"];
    if (startS > 0) args.push("-ss", startS.toFixed(4));
    args.push("-i", VIDEO, "-t", durS.toFixed(4));
    args.push("-vf", `scale=${W}:${H}:flags=neighbor`, "-pix_fmt", "rgb24", "-f", "rawvideo", "-");
    const p = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
    const FB = W * H * 3;
    let acc = Buffer.alloc(0), idx = 0, err = "";
    p.stderr.on("data", d => err += d);
    p.stdout.on("data", c => {
      acc = acc.length ? Buffer.concat([acc, c]) : c;
      while (acc.length >= FB) { onFrame(acc.subarray(0, FB), idx++); acc = acc.subarray(FB); }
    });
    p.on("error", rej);
    p.on("close", c => c === 0 ? res(idx) : rej(new Error(`ffmpeg ${c}: ${err.slice(-400)}`)));
  });
}

const frames = [];
await streamRange(T0, DUR, (buf) => { frames.push(Buffer.from(buf)); });
console.error(`decoded ${frames.length} frames`);

function modalBg(buf) {
  const bins = new Map();
  for (let k = 0; k < W * H; k += 7) {
    const p = k * 3;
    const key = (buf[p] << 16) | (buf[p + 1] << 8) | buf[p + 2];
    bins.set(key, (bins.get(key) || 0) + 1);
  }
  let bk = 0, bn = -1;
  for (const [k, n] of bins) if (n > bn) { bn = n; bk = k; }
  return [(bk >> 16) & 255, (bk >> 8) & 255, bk & 255];
}

// Band of interest for the line (generous)
const BY0 = 110, BY1 = 270;

const out = [];
for (let i = 0; i < frames.length; i++) {
  const buf = frames[i];
  const bg = modalBg(buf);
  const cols = new Float64Array(W);
  const colR = new Float64Array(W), colG = new Float64Array(W), colB = new Float64Array(W);
  const rows = new Float64Array(H);
  let total = 0, maxA = 0;
  // alpha = luminance-distance from bg normalised; keep raw max-channel-dist too
  for (let y = BY0; y < BY1; y++) {
    for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 3;
      const dr = bg[0] - buf[p], dg = bg[1] - buf[p + 1], db = bg[2] - buf[p + 2];
      const d = Math.max(dr, dg, db, 0);
      if (d > maxA) maxA = d;
      const a = d < 4 ? 0 : d / 255;
      cols[x] += a; rows[y] += a; total += a;
      colR[x] += a * buf[p]; colG[x] += a * buf[p + 1]; colB[x] += a * buf[p + 2];
    }
  }
  for (let x = 0; x < W; x++) { if (cols[x] > 0) { colR[x] /= cols[x]; colG[x] /= cols[x]; colB[x] /= cols[x]; } }
  out.push({
    i, t: +(T0 + i / FPS).toFixed(4), bg, total: +total.toFixed(2), maxA,
    cols: Array.from(cols, v => +v.toFixed(3)),
    rows: Array.from(rows, v => +v.toFixed(3)),
    cR: Array.from(colR, v => Math.round(v)),
    cG: Array.from(colG, v => Math.round(v)),
    cB: Array.from(colB, v => Math.round(v)),
  });
}
writeFileSync(OUT, JSON.stringify(out));
console.error(`wrote ${OUT}`);
