import * as A from "./an.mjs";
const { W, BH, BY0 } = A;

function rowPeak(f, x0, x1) {
  const a = new Float64Array(BH);
  for (let y = BY0; y < BY0 + BH; y++) { let m = 0; for (let x = x0; x <= x1; x++) { const v = A.alphaAt(f, x, y); if (v > m) m = v; } a[y - BY0] = m; }
  return a;
}
// 50%-of-plateau crossings, subpixel
function cross50(arr, i0, i1) {
  let plateau = 0; for (let i = i0; i <= i1; i++) plateau = Math.max(plateau, arr[i]);
  const h = plateau * 0.5;
  let top = null, bot = null;
  for (let i = i0; i <= i1; i++) if (arr[i] >= h) { top = i; break; }
  for (let i = i1; i >= i0; i--) if (arr[i] >= h) { bot = i; break; }
  if (top === null) return null;
  // subpixel
  let ts = top; if (top > 0 && arr[top] !== arr[top - 1]) ts = top - (arr[top] - h) / (arr[top] - arr[top - 1]);
  let bs = bot; if (bot < arr.length - 1 && arr[bot] !== arr[bot + 1]) bs = bot + (arr[bot] - h) / (arr[bot] - arr[bot + 1]);
  return { top: ts, bot: bs, plateau };
}

console.log("f\tt\tpk\tReX0\tReX1\tReW\tcapTop\tbaseline\tcapH\tlineL\tlineR");
for (let i = 4; i < A.N; i++) {
  const f = A.frame(i);
  const cp = A.colPeak(f);
  let gmax = 0; for (let x = 0; x < W; x++) gmax = Math.max(gmax, cp[x]);
  if (gmax < 0.02) { continue; }
  // line extents at 3% absolute
  let lineL = -1, lineR = -1;
  for (let x = 0; x < W; x++) if (cp[x] > 0.03) { if (lineL < 0) lineL = x; lineR = x; }
  // leftmost glyph group ("Re"): from lineL, run until a gap where cp < 15% of local peak for >=1 col
  // find local peak in first 90 px
  let lp = 0; for (let x = lineL; x < Math.min(W, lineL + 90); x++) lp = Math.max(lp, cp[x]);
  const thr = lp * 0.5;
  // Re run: start at first x >= thr, end at last x >= thr before a gap of >=2 cols below 0.2*lp
  let s = -1, e = -1;
  for (let x = lineL; x < Math.min(W, lineL + 120); x++) {
    if (cp[x] >= thr) { if (s < 0) s = x; e = x; }
    else if (s >= 0) {
      let gap = 0, xx = x;
      while (xx < W && cp[xx] < lp * 0.2 && gap < 6) { gap++; xx++; }
      if (gap >= 2) break;
    }
  }
  if (s < 0) continue;
  // subpixel left/right edges of Re group at 50% of lp
  let sx = s; if (s > 0) sx = s - (cp[s] - thr) / Math.max(1e-9, cp[s] - cp[s - 1]);
  let ex = e; if (e < W - 1) ex = e + (cp[e] - thr) / Math.max(1e-9, cp[e] - cp[e + 1]);
  const rp = rowPeak(f, s, e);
  const c = cross50(rp, 0, BH - 1);
  const capTop = c ? c.top + BY0 : NaN, base = c ? c.bot + BY0 : NaN;
  console.log([i, A.T(i).toFixed(3), gmax.toFixed(3), sx.toFixed(2), ex.toFixed(2), (ex - sx).toFixed(2),
    capTop.toFixed(2), base.toFixed(2), (base - capTop).toFixed(2), lineL, lineR].join("\t"));
}
