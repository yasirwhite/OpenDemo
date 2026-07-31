#!/usr/bin/env node
// Per-frame precision probe for mem-reference.mp4
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const FFMPEG = process.env.OPENDEMO_FFMPEG;
const VIDEO = process.argv[2];
const T0 = parseFloat(process.argv[3] ?? "0");
const DUR = parseFloat(process.argv[4] ?? "3.6");
const OUT = process.argv[5] ?? "probe.json";
const W = 640, H = 360;

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

function patchMean(buf, x0, y0, x1, y1) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const p = (y * W + x) * 3; r += buf[p]; g += buf[p + 1]; b += buf[p + 2]; n++;
  }
  return [r / n, g / n, b / n];
}

const out = [];
const FPS = 30000 / 1001;
for (let i = 0; i < frames.length; i++) {
  const buf = frames[i];
  const bg = patchMean(buf, 0, 0, 40, 40);
  const ink = new Float32Array(W * H);
  let total = 0;
  for (let k = 0, p = 0; k < W * H; k++, p += 3) {
    const d = Math.max(Math.abs(buf[p] - bg[0]), Math.abs(buf[p + 1] - bg[1]), Math.abs(buf[p + 2] - bg[2]));
    const v = d <= 6 ? 0 : Math.min(1, (d - 6) / 40);
    ink[k] = v; total += v;
  }
  const cols = new Float32Array(W), rows = new Float32Array(H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = ink[y * W + x]; cols[x] += v; rows[y] += v; }
  out.push({
    i, t: +(T0 + i / FPS).toFixed(4),
    bg: bg.map(v => +v.toFixed(1)),
    total: +total.toFixed(1),
    cols: Array.from(cols, v => +v.toFixed(2)),
    rows: Array.from(rows, v => +v.toFixed(2)),
  });
}
writeFileSync(OUT, JSON.stringify(out));
console.error(`wrote ${OUT}`);
