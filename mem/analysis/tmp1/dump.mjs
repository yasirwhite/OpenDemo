#!/usr/bin/env node
// Dump raw RGB band crop for a time range to a binary file for offline analysis.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const FFMPEG = process.env.OPENDEMO_FFMPEG;
const VIDEO = process.argv[2];
const T0 = parseFloat(process.argv[3]), DUR = parseFloat(process.argv[4]);
const OUT = process.argv[5];
const W = 640, H = 360;
const BY0 = 100, BY1 = 280, BH = BY1 - BY0;

const frames = [];
await new Promise((res, rej) => {
  const args = ["-v", "error"];
  if (T0 > 0) args.push("-ss", T0.toFixed(4));
  args.push("-i", VIDEO, "-t", DUR.toFixed(4), "-vf", `scale=${W}:${H}:flags=neighbor`, "-pix_fmt", "rgb24", "-f", "rawvideo", "-");
  const p = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
  const FB = W * H * 3; let acc = Buffer.alloc(0), err = "";
  p.stderr.on("data", d => err += d);
  p.stdout.on("data", c => {
    acc = acc.length ? Buffer.concat([acc, c]) : c;
    while (acc.length >= FB) {
      const f = acc.subarray(0, FB);
      frames.push(Buffer.from(f.subarray(BY0 * W * 3, BY1 * W * 3)));
      acc = acc.subarray(FB);
    }
  });
  p.on("error", rej);
  p.on("close", c => c === 0 ? res() : rej(new Error(`ffmpeg ${c}: ${err.slice(-300)}`)));
});
writeFileSync(OUT, Buffer.concat(frames));
console.error(`frames=${frames.length} W=${W} BH=${BH} BY0=${BY0} -> ${OUT}`);
