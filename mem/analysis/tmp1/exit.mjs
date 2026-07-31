import * as A from "./an.mjs";
const { W } = A;
const LET = { R: [182, 200], e0: [201, 219], m1: [221, 249], e1: [251, 268], m2: [270, 298], b: [301, 318], e2: [320, 337], ri: [339, 353], n: [356, 372], g: [374, 392], i: [400, 406], s1: [407, 422], s2: [431, 446], o: [448, 466] };
const keys = Object.keys(LET);
// line left edge per frame (leftmost col with peak alpha > 0.10), used as offset
function leftEdge(i) {
  const f = A.frame(i); const cp = A.colPeak(f, 150, 215);
  for (let x = 20; x < 620; x++) if (cp[x] > 0.10) return x;
  return null;
}
console.log(["f", "t", "dx"].concat(keys).join("\t"));
for (let i = 60; i <= 88; i++) {
  const L = leftEdge(i);
  if (L === null) { console.log(`${i}\t${A.T(i).toFixed(3)}\t-`); continue; }
  const d = L - 182;
  const f = A.frame(i);
  const row = [i, A.T(i).toFixed(3), d];
  for (const k of keys) {
    const [a, b] = LET[k];
    let pk = 0;
    for (let y = 155; y <= 205; y++) for (let x = a + d; x <= b + d; x++) if (x >= 0 && x < W) pk = Math.max(pk, A.alphaAt(f, x, y));
    row.push(pk.toFixed(2));
  }
  console.log(row.join("\t"));
}
