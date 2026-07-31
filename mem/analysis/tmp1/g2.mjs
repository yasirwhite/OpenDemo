import * as A from "./an.mjs";
const { W, BH, BY0 } = A;

function geom(i) {
  const f = A.frame(i);
  const cp = A.colPeak(f, 150, 215);
  let lineL = -1, lineR = -1;
  for (let x = 20; x < 620; x++) if (cp[x] > 0.04) { if (lineL < 0) lineL = x; lineR = x; }
  if (lineL < 0) return null;
  let lp = 0; for (let x = lineL; x < Math.min(W, lineL + 90); x++) lp = Math.max(lp, cp[x]);
  const thr = lp * 0.5;
  let s = -1, e = -1;
  for (let x = lineL; x < Math.min(W, lineL + 130); x++) {
    if (cp[x] >= thr) { if (s < 0) s = x; e = x; }
    else if (s >= 0) { let g = 0, xx = x; while (xx < W && cp[xx] < lp * 0.2 && g < 6) { g++; xx++; } if (g >= 2) break; }
  }
  if (s < 0) return null;
  let sx = s - (cp[s] - thr) / Math.max(1e-9, cp[s] - cp[s - 1]);
  let ex = e + (cp[e] - thr) / Math.max(1e-9, cp[e] - cp[e + 1]);
  let sc = (ex - sx) / 36.75;
  if (sc < 0.2 || sc > 2.2) sc = null;
  return { lineL, lineR, x0: sx, x1: ex, sc, cp };
}
const GROUPS = {
  Re: [181, 220], m1: [220.5, 250], e1: [250.5, 269], m2: [269.5, 299],
  mem: [220.5, 299], ber: [300, 354.5], ing: [355, 393], is: [399.5, 423.5], so: [430, 467.5],
};
const REF_X0 = 182.32;
function win(g, w) {
  const s = g.sc ?? 1;
  return [Math.max(0, Math.round(g.x0 + (w[0] - REF_X0) * s)), Math.min(W - 1, Math.round(g.x0 + (w[1] - REF_X0) * s))];
}
function stats(i, g, w) {
  const f = A.frame(i);
  const [a0, a1] = win(g, w);
  const s = g.sc ?? 1, yc = 176.5;
  const y0 = Math.max(BY0, Math.round(yc + (156 - yc) * s));
  const y1 = Math.min(BY0 + BH - 1, Math.round(yc + (202 - yc) * s));
  let sum = 0, peak = 0;
  const cp = new Float64Array(a1 - a0 + 1);
  let mR = 0, mG = 0, mB = 0, wt = 0, minL = 999, minP = [255, 255, 255];
  for (let x = a0; x <= a1; x++) {
    let m = 0;
    for (let y = y0; y <= y1; y++) {
      const al = A.alphaAt(f, x, y); sum += al; if (al > m) m = al;
      if (al > 0.05) { const p = A.px(f, x, y); mR += p[0] * al; mG += p[1] * al; mB += p[2] * al; wt += al; }
      const p2 = A.px(f, x, y), L = 0.299 * p2[0] + 0.587 * p2[1] + 0.114 * p2[2];
      if (L < minL) { minL = L; minP = p2; }
    }
    cp[x - a0] = m; if (m > peak) peak = m;
  }
  let grad = 0;
  for (let k = 1; k < cp.length; k++) grad = Math.max(grad, Math.abs(cp[k] - cp[k - 1]));
  const sharp = peak > 0.02 ? grad / peak : 0;
  return { sum, peak, sharp, col: wt > 0 ? [mR / wt, mG / wt, mB / wt].map(v => Math.round(v)) : null, minP, minL };
}
const list = (process.argv[2] || "Re,mem,ber,ing,is,so").split(",");
const mode = process.argv[3] || "sum";
console.log(["f", "t", "sc", "x0"].concat(list.flatMap(k => [k + ".sum", k + ".pk", k + ".shp", k + ".col", k + ".dark"])).join("\t"));
for (let i = 0; i < A.N; i++) {
  const g = geom(i);
  if (!g || !g.sc) { console.log(`${i}\t${A.T(i).toFixed(3)}\tBAD`); continue; }
  const row = [i, A.T(i).toFixed(3), g.sc.toFixed(3), g.x0.toFixed(1)];
  for (const k of list) {
    const st = stats(i, g, GROUPS[k]);
    row.push(st.sum.toFixed(0), st.peak.toFixed(3), st.sharp.toFixed(2), st.col ? st.col.join(",") : "-", st.minP.join(","));
  }
  console.log(row.join("\t"));
}
