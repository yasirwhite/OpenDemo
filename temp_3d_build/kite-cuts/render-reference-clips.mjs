// Cut the reference film into the SAME meaningful segments as our clips, so each
// scene can be compared by flipping between two files in one folder.
//   NN-reference.mp4   sits next to   NN-<scene-id>.mp4
import { SCENES } from "./scenes.js";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const here = import.meta.dirname;
const src = join(here, "..", "kite_official_sample_1.mp4");
const clipsDir = join(here, "clips");
mkdirSync(clipsDir, { recursive: true });

const rows = [];
for (const sc of SCENES) {
  const n = sc.id.slice(0, 2);
  const out = join(clipsDir, `${n}-reference.mp4`);
  const dur = +(sc.t1 - sc.t0).toFixed(3);
  // -ss AFTER -i so the seek is decode-accurate and the segment starts on the
  // exact frame our clip starts on (input-side seeking snaps to keyframes).
  execFileSync("ffmpeg", [
    "-y", "-v", "error",
    "-i", src,
    "-ss", String(sc.t0), "-t", String(dur),
    "-an",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
  ]);
  rows.push({ n, id: sc.id, t0: sc.t0, t1: sc.t1, dur });
  console.log(`${n}-reference.mp4   ${String(sc.t0).padStart(6)} -> ${String(sc.t1).padStart(6)}  (${dur}s)   [${sc.title}]`);
}

writeFileSync(
  join(clipsDir, "PAIRS.md"),
  `# Clip pairs\n\nEach scene, ours next to the same window of the reference.\n\n` +
    `| # | ours | reference | window | scene |\n|---|---|---|---|---|\n` +
    rows.map((r) => `| ${r.n} | \`${r.id}.mp4\` | \`${r.n}-reference.mp4\` | ${r.t0}–${r.t1}s | ${SCENES.find((s) => s.id === r.id).title} |`).join("\n") +
    `\n\nBoth sides are 1920x1080 / 30 fps / h264, identical durations, so they scrub together.\n`
);
console.log(`\nwrote ${rows.length} reference clips + PAIRS.md`);
