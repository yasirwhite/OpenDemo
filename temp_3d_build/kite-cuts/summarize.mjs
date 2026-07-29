// Turn per-frame measurements into a per-CUT framing report.
// Usage: node summarize.mjs <analysis.json> [diffThreshold]
import { readFileSync } from "node:fs";

const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
const TH = Number(process.argv[3] || 26);

// --- cut boundaries from temporal-diff spikes -----------------------------
const cuts = [];
let start = 0;
for (let i = 1; i < rows.length; i++) {
  if (rows[i].diff > TH) { cuts.push([start, i - 1]); start = i; }
}
cuts.push([start, rows.length - 1]);

const bgName = (l) => (l < 40 ? "dark" : l > 205 ? "white" : l > 150 ? "light" : "mid");
const f = (v, w = 6) => (v === undefined ? "-".padStart(w) : String(v).padStart(w));

console.log(`frames=${rows.length}  cuts=${cuts.length}  (diff threshold ${TH})\n`);
console.log(
  "cut  t0     t1     dur   bg      brdr  |  area%      bboxW%     bboxH%    |  cx%        cy%       axis°      | motion"
);
console.log("-".repeat(132));

const summary = [];
for (let k = 0; k < cuts.length; k++) {
  const [a, b] = cuts[k];
  const seg = rows.slice(a, b + 1);
  if (!seg.length) continue;
  const g = (key) => seg.map((r) => r[key]).filter((v) => v !== undefined);
  const first = (key) => g(key)[0];
  const last = (key) => g(key)[g(key).length - 1];
  const rng = (key) => { const v = g(key); return [Math.min(...v), Math.max(...v)]; };

  const t0 = seg[0].t, t1 = seg[seg.length - 1].t + 0.25;
  const bg = bgName(seg[Math.floor(seg.length / 2)].bgLum);
  const brdr = Math.round(seg.reduce((s, r) => s + r.borderSpread, 0) / seg.length);

  const dArea = (last("areaPct") ?? 0) - (first("areaPct") ?? 0);
  const dCx = (last("cxPct") ?? 0) - (first("cxPct") ?? 0);
  const dCy = (last("cyPct") ?? 0) - (first("cyPct") ?? 0);
  const dAxis = (last("axisDeg") ?? 0) - (first("axisDeg") ?? 0);
  const dW = (last("bboxPctW") ?? 0) - (first("bboxPctW") ?? 0);

  // classify what actually happens inside the cut
  const tags = [];
  if (Math.abs(dArea) > 6 || Math.abs(dW) > 6) tags.push(dArea > 0 ? `PUSH +${dArea.toFixed(0)}%` : `PULL ${dArea.toFixed(0)}%`);
  if (Math.abs(dCx) > 3) tags.push(`panX ${dCx > 0 ? "+" : ""}${dCx.toFixed(0)}`);
  if (Math.abs(dCy) > 3) tags.push(`panY ${dCy > 0 ? "+" : ""}${dCy.toFixed(0)}`);
  if (Math.abs(dAxis) > 6) tags.push(`roll ${dAxis > 0 ? "+" : ""}${dAxis.toFixed(0)}°`);
  // area swing much bigger than net change => something opened/rotated mid-cut
  const [aMin, aMax] = rng("areaPct");
  if (aMax - aMin > Math.abs(dArea) * 2 + 8) tags.push(`IN-CUT EVENT (area ${aMin.toFixed(0)}->${aMax.toFixed(0)}%)`);
  if (brdr > 60) tags.push("FULL-BLEED 2D?");
  if (!tags.length) tags.push("static");

  const ar = rng("areaPct"), bw = rng("bboxPctW"), bh = rng("bboxPctH");
  const cx = rng("cxPct"), cy = rng("cyPct"), ax = rng("axisDeg");
  console.log(
    `${String(k + 1).padStart(2)}  ${f(t0.toFixed(2))} ${f(t1.toFixed(2))} ${f((t1 - t0).toFixed(2), 5)}  ${bg.padEnd(6)} ${f(brdr, 4)}  | ` +
      `${f(ar[0].toFixed(0), 3)}-${f(ar[1].toFixed(0), 3)}  ${f(bw[0].toFixed(0), 3)}-${f(bw[1].toFixed(0), 3)}  ${f(bh[0].toFixed(0), 3)}-${f(bh[1].toFixed(0), 3)} | ` +
      `${f(cx[0].toFixed(0), 3)}-${f(cx[1].toFixed(0), 3)}  ${f(cy[0].toFixed(0), 3)}-${f(cy[1].toFixed(0), 3)}  ${f(ax[0].toFixed(0), 4)}-${f(ax[1].toFixed(0), 4)} | ${tags.join(", ")}`
  );
  summary.push({ cut: k + 1, t0, t1, bg, brdr, tags });
}
