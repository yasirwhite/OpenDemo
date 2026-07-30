// Print the zoom map as a readable per-0.1s trace with a sparkline of framing.
import { readFileSync } from "node:fs";
const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
const t0 = Number(process.argv[3] ?? 0), t1 = Number(process.argv[4] ?? 1e9);
const CUTTH = Number(process.argv[5] ?? 26);

const bar = (v, lo, hi, n = 34) => {
  const k = Math.round(((v - lo) / (hi - lo)) * n);
  return "#".repeat(Math.max(0, Math.min(n, k))).padEnd(n, ".");
};
console.log("   t    w%    h%    cx    cy   top   bot   edge%  cut  framing(width)");
console.log("-".repeat(104));
let prev = null;
for (const r of rows) {
  if (r.t < t0 || r.t > t1) continue;
  const isCut = r.diff > CUTTH;
  const dw = prev ? (r.w - prev.w) : 0;
  const trend = Math.abs(dw) < 0.35 ? "  " : dw > 0 ? "in" : "ou";
  console.log(
    `${r.t.toFixed(1).padStart(5)} ${String(r.w).padStart(5)} ${String(r.h).padStart(5)} ` +
      `${String(r.cx).padStart(5)} ${String(r.cy).padStart(5)} ${String(r.tp ?? "-").padStart(5)} ${String(r.bt ?? "-").padStart(5)} ` +
      `${String(r.edge).padStart(6)}  ${isCut ? "CUT" : "   "} ${trend} ${bar(r.w, 0, 100)}`
  );
  prev = r;
}
