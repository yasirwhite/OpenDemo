// Per-cut MOTION report: how much does each shot actually move, and where in the
// shot does the movement sit? Answers "why does every frame have zoom on".
import { readFileSync } from "node:fs";

const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
const BOUNDS = JSON.parse(process.argv[3]);
const label = process.argv[4] || "";

console.log(`\n=== ${label} ===`);
console.log("cut  window        area%start->end   swing%   move-window        verdict");
console.log("-".repeat(96));

let moving = 0;
for (let i = 0; i < BOUNDS.length - 1; i++) {
  const t0 = BOUNDS[i], t1 = BOUNDS[i + 1];
  const seg = rows.filter((r) => r.t >= t0 + 0.1 && r.t < t1 - 0.1 && r.areaPct > 0);
  if (seg.length < 2) { console.log(`${String(i + 1).padStart(2)}   ${t0.toFixed(2)}-${t1.toFixed(2)}  (too few samples)`); continue; }

  const a = seg.map((r) => r.areaPct);
  const first = a[0], last = a[a.length - 1];
  const swing = ((Math.max(...a) - Math.min(...a)) / Math.max(1e-6, Math.min(...a))) * 100;

  // where in the shot is the frame-to-frame change concentrated?
  const d = [];
  for (let k = 1; k < seg.length; k++) d.push(Math.abs(a[k] - a[k - 1]));
  const total = d.reduce((s, v) => s + v, 0);
  let acc = 0, p50 = 1;
  for (let k = 0; k < d.length; k++) { acc += d[k]; if (acc >= total * 0.5) { p50 = (k + 1) / d.length; break; } }

  const growth = ((last - first) / Math.max(1e-6, first)) * 100;
  const isMoving = Math.abs(growth) > 12 || swing > 25;
  if (isMoving) moving++;
  const where = p50 < 0.4 ? "front-loaded" : p50 > 0.7 ? "back-loaded" : "spread (zoomy)";
  console.log(
    `${String(i + 1).padStart(2)}   ${t0.toFixed(2)}-${t1.toFixed(2)}  ` +
      `${first.toFixed(1).padStart(6)} -> ${last.toFixed(1).padStart(6)}  ` +
      `${swing.toFixed(0).padStart(5)}%   ${(isMoving ? where : "-").padEnd(16)}   ` +
      `${isMoving ? "MOVES " + (growth > 0 ? "+" : "") + growth.toFixed(0) + "%" : "locked"}`
  );
}
console.log(`\nmoving cuts: ${moving} / ${BOUNDS.length - 1}`);
