import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(process.argv[2], "utf8"));
const THR = parseFloat(process.argv[3] ?? "0.15");
function runs(arr, thr, gap = 2) {
  const r = []; let s = -1, q = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > thr) { if (s < 0) s = i; q = 0; }
    else if (s >= 0) { q++; if (q > gap) { r.push([s, i - q]); s = -1; q = 0; } }
  }
  if (s >= 0) r.push([s, arr.length - 1 - q]);
  return r;
}
for (const f of d) {
  const g = runs(f.cols, THR, 2).filter(([a, b]) => b - a >= 1);
  const rr = runs(f.rows, THR, 2);
  const yext = rr.length ? [rr[0][0], rr[rr.length - 1][1]] : [-1, -1];
  const desc = g.map(([a, b]) => {
    let m = 0, mR = 0, mG = 0, mB = 0, w = 0;
    for (let x = a; x <= b; x++) { m += f.cols[x]; w += f.cols[x]; mR += f.cR[x] * f.cols[x]; mG += f.cG[x] * f.cols[x]; mB += f.cB[x] * f.cols[x]; }
    return `${a}-${b}[${(m).toFixed(0)}|${Math.round(mR / w)},${Math.round(mG / w)},${Math.round(mB / w)}]`;
  });
  console.log(`f${String(f.i).padStart(3)} t=${f.t.toFixed(3)} y=${yext[0]}-${yext[1]} n=${g.length}  ` + desc.join(" "));
}
