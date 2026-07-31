import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(process.argv[2], "utf8"));
const THR = parseFloat(process.argv[3] ?? "0.5"); // column ink threshold
function ext(arr, thr) {
  let a = -1, b = -1;
  for (let i = 0; i < arr.length; i++) if (arr[i] > thr) { if (a < 0) a = i; b = i; }
  return [a, b];
}
console.log("frame\tt\ttotal\tbg\t\tx0\tx1\tw\tcx\ty0\ty1\th");
for (const f of d) {
  const [x0, x1] = ext(f.cols, THR);
  const [y0, y1] = ext(f.rows, THR);
  console.log([f.i, f.t.toFixed(3), f.total.toFixed(0), f.bg.join(","), x0, x1, x1 - x0 + 1, ((x0 + x1) / 2).toFixed(1), y0, y1, y1 - y0 + 1].join("\t"));
}
