import * as A from "./an.mjs";
const { W, BH, BY0 } = A;

// --- geometry track (from scale.mjs logic, inlined & robust) ---
function geom(i) {
  const f = A.frame(i);
  const cp = A.colPeak(f, 150, 215);       // restrict to line-1 band (settled y 160..200 + slack)
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
  return { lineL, lineR, x0: sx, x1: ex, w: ex - sx, peak: lp, cp };
}

// reference geometry at settled frame 64
const REF = 64;
const g64 = geom(REF);
const RX0 = g64.x0, RW = g64.w;

// settled group windows (frame 64 coords)
const GROUPS = {
  Re: [181, 220], m1: [220.5, 250], e1: [250.5, 269], m2: [269.5, 299],
  mem: [220.5, 299], ber: [300, 354.5], ing: [355, 393],
  is: [399.5, 423.5], so: [430, 467.5],
};

export function mapX(i, g, xs) { return g.x0 + (xs - RX0) * (g.w / RW); }

function groupStats(i, g, win) {
  const f = A.frame(i);
  const a0 = Math.max(0, Math.round(mapX(i, g, win[0])));
  const a1 = Math.min(W - 1, Math.round(mapX(i, g, win[1])));
  // vertical band scaled too
  const yc = 176.5, sc = g.w / RW;
  const y0 = Math.max(BY0, Math.round(yc + (158 - yc) * sc));
  const y1 = Math.min(BY0 + BH - 1, Math.round(yc + (200 - yc) * sc));
  let peak = 0, sum = 0, n = 0, dr = 0, dg = 0, db = 0, wsum = 0;
  let minLum = 999, minPx = null;
  for (let y = y0; y <= y1; y++) for (let x = a0; x <= a1; x++) {
    const al = A.alphaAt(f, x, y);
    if (al > peak) peak = al;
    sum += al; n++;
    if (al > 0.02) { dr += A.px(f, x, y)[0] * al; dg += A.px(f, x, y)[1] * al; db += A.px(f, x, y)[2] * al; wsum += al; }
    const p = A.px(f, x, y), lum = (p[0] + p[1] + p[2]) / 3;
    if (lum < minLum) { minLum = lum; minPx = p; }
  }
  return { a0, a1, y0, y1, peak, mean: sum / Math.max(1, n), sum,
    col: wsum > 0 ? [dr / wsum, dg / wsum, db / wsum].map(Math.round) : null,
    minLum, minPx };
}

const which = process.argv[2] || "all";
const list = which === "all" ? Object.keys(GROUPS) : which.split(",");
const hdr = ["f", "t", "scale", "x0"];
for (const k of list) hdr.push(k + ".pk", k + ".sum", k + ".rgb");
console.log(hdr.join("\t"));
for (let i = 0; i < A.N; i++) {
  const g = geom(i);
  if (!g) { console.log(`${i}\t${A.T(i).toFixed(3)}\t-\t-`); continue; }
  const row = [i, A.T(i).toFixed(3), (g.w / RW).toFixed(4), g.x0.toFixed(2)];
  for (const k of list) {
    const st = groupStats(i, g, GROUPS[k]);
    row.push(st.peak.toFixed(3), st.sum.toFixed(1), st.minPx ? st.minPx.join(",") : "-");
  }
  console.log(row.join("\t"));
}
