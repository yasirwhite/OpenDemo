import * as A from "./an.mjs";
const { W, BH, BY0 } = A;
// core colour of an absolute x-window at a frame: mean of pixels with alpha >= 0.85*peak
function core(i, x0, x1, y0 = 155, y1 = 205) {
  const f = A.frame(i);
  let peak = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) peak = Math.max(peak, A.alphaAt(f, x, y));
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (A.alphaAt(f, x, y) >= 0.85 * peak) { const p = A.px(f, x, y); r += p[0]; g += p[1]; b += p[2]; n++; }
  }
  return { peak: +peak.toFixed(3), n, rgb: [r / n, g / n, b / n].map(v => Math.round(v)) };
}
const args = process.argv.slice(2);
if (args[0] === "settled") {
  const i = 64;
  const spans = { Re: [182, 219], m1: [221, 249], e1: [251, 268], m2: [270, 298], b: [301, 318], e2: [320, 337], r2: [339, 353], n: [356, 372], g: [374, 392], is: [400, 423], so: [430, 467], bering: [300, 393] };
  for (const [k, s] of Object.entries(spans)) console.log(k.padEnd(8), JSON.stringify(core(i, s[0], s[1])));
  // background samples
  const f = A.frame(i);
  for (const [x, y] of [[20, 120], [600, 120], [320, 260], [50, 250]]) console.log(`bg@${x},${y}`, A.px(f, x, y).join(","));
} else if (args[0] === "sweep") {
  // per-letter core over frames, windows follow the line via x0 offset table
  console.log("f\tt\tm1\te1\tm2\tm1L\te1L\tm2L");
  const REF = { x0: 182.32 };
  for (let i = 33; i <= 66; i++) {
    // recompute line left edge from column peak
    const f = A.frame(i);
    const cp = A.colPeak(f, 150, 215);
    let L = -1; for (let x = 20; x < 620; x++) if (cp[x] > 0.1) { L = x; break; }
    const d = L - 182;
    const m1 = core(i, 221 + d, 249 + d), e1 = core(i, 251 + d, 268 + d), m2 = core(i, 270 + d, 298 + d);
    const lum = c => Math.round(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]);
    console.log([i, A.T(i).toFixed(3), m1.rgb.join(","), e1.rgb.join(","), m2.rgb.join(","), lum(m1.rgb), lum(e1.rgb), lum(m2.rgb)].join("\t"));
  }
}
