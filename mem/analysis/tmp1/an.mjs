import { readFileSync } from "node:fs";
export const W = 640, BH = 180, BY0 = 100, FPS = 30000 / 1001;
const raw = readFileSync(process.env.BAND || "mem/analysis/tmp1/band.raw");
export const N = raw.length / (W * BH * 3);
export function frame(i) { return raw.subarray(i * W * BH * 3, (i + 1) * W * BH * 3); }
export function px(f, x, y) { const p = ((y - BY0) * W + x) * 3; return [f[p], f[p + 1], f[p + 2]]; }
// alpha = how far below white (bg = 255,255,255)
export function alphaAt(f, x, y) {
  const p = ((y - BY0) * W + x) * 3;
  return (765 - f[p] - f[p + 1] - f[p + 2]) / 765;
}
// peak alpha per column
export function colPeak(f, y0 = BY0, y1 = BY0 + BH) {
  const a = new Float64Array(W);
  for (let x = 0; x < W; x++) { let m = 0; for (let y = y0; y < y1; y++) { const v = alphaAt(f, x, y); if (v > m) m = v; } a[x] = m; }
  return a;
}
export function colSum(f, y0 = BY0, y1 = BY0 + BH) {
  const a = new Float64Array(W);
  for (let x = 0; x < W; x++) { let s = 0; for (let y = y0; y < y1; y++) s += alphaAt(f, x, y); a[x] = s; }
  return a;
}
export function rowSum(f, x0, x1, y0 = BY0, y1 = BY0 + BH) {
  const a = new Float64Array(y1 - y0);
  for (let y = y0; y < y1; y++) { let s = 0; for (let x = x0; x <= x1; x++) s += alphaAt(f, x, y); a[y - y0] = s; }
  return a;
}
export function runs(arr, thr, gap = 0) {
  const r = []; let s = -1, q = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > thr) { if (s < 0) s = i; q = 0; }
    else if (s >= 0) { q++; if (q > gap) { r.push([s, i - q]); s = -1; q = 0; } }
  }
  if (s >= 0) r.push([s, arr.length - 1 - q]);
  return r;
}
export const T = i => i / FPS;
