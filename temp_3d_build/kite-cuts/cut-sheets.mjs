// Build one dense contact sheet PER CUT so in-cut events are visible.
// (One frame per cut is what hid the lid-opening and the 2D sections.)
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const FF = "ffmpeg";
const video = process.argv[2];
const outDir = process.argv[3];
const BOUNDS = JSON.parse(process.argv[4]);   // [t0, t1, t2, ...] full boundary list
const COLS = 4, ROWS = 3, N = COLS * ROWS, TILE = 420;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (let i = 0; i < BOUNDS.length - 1; i++) {
  const t0 = BOUNDS[i], t1 = BOUNDS[i + 1], dur = t1 - t0;
  // N evenly spaced samples strictly inside the cut
  const fps = N / dur;
  const tmp = join(outDir, `tmp${i}`);
  mkdirSync(tmp, { recursive: true });
  const inset = Math.min(0.06, dur * 0.03);
  execFileSync(FF, [
    "-y", "-v", "error",
    "-ss", String(t0 + inset), "-t", String(dur - inset * 2),
    "-i", video,
    "-vf", `fps=${fps.toFixed(4)},scale=${TILE}:-1`,
    "-frames:v", String(N),
    "-q:v", "2", join(tmp, "f_%02d.jpg"),
  ]);
  execFileSync(FF, [
    "-y", "-v", "error",
    "-i", join(tmp, "f_%02d.jpg"),
    "-vf", `scale=${TILE}:-1,tile=${COLS}x${ROWS}:padding=4:margin=4`,
    "-frames:v", "1",
    join(outDir, `cut${String(i + 1).padStart(2, "0")}_${t0.toFixed(2)}-${t1.toFixed(2)}.jpg`),
  ]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`cut ${i + 1}: ${t0.toFixed(2)}-${t1.toFixed(2)} (${dur.toFixed(2)}s) -> ${N} samples @ ${fps.toFixed(2)}fps`);
}
