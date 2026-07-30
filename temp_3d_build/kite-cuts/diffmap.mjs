// Side-by-side zoom-map diff: reference vs ours, sampled per segment.
import { readFileSync } from "node:fs";
const A = JSON.parse(readFileSync(process.argv[2], "utf8"));  // reference
const B = JSON.parse(readFileSync(process.argv[3], "utf8"));  // ours
const BOUNDS = JSON.parse(process.argv[4]);

const at = (rows, t) => rows.reduce((best, r) => (Math.abs(r.t - t) < Math.abs(best.t - t) ? r : best), rows[0]);
const f = (v, n = 5) => String(v).padStart(n);

console.log("seg  window         |        REFERENCE w%        |          OURS w%           | verdict");
console.log("                    |  start   mid    end  swing |  start   mid    end  swing |");
console.log("-".repeat(100));
let ok = 0;
for (let i = 0; i < BOUNDS.length - 1; i++) {
  const t0 = BOUNDS[i], t1 = BOUNDS[i + 1];
  const pick = (rows) => {
    const s = at(rows, t0 + 0.15), m = at(rows, (t0 + t1) / 2), e = at(rows, t1 - 0.15);
    const seg = rows.filter((r) => r.t >= t0 + 0.1 && r.t <= t1 - 0.1 && r.w > 0).map((r) => r.w);
    const swing = seg.length ? +(Math.max(...seg) - Math.min(...seg)).toFixed(1) : 0;
    return [s.w, m.w, e.w, swing];
  };
  const [as_, am, ae, asw] = pick(A);
  const [bs, bm, be, bsw] = pick(B);
  // grade on end-framing and on how much the shot moves
  const dEnd = Math.abs(ae - be), dSwing = Math.abs(asw - bsw);
  const good = dEnd < 9 && dSwing < 9;
  if (good) ok++;
  console.log(
    `${String(i + 1).padStart(3)}  ${t0.toFixed(2)}-${t1.toFixed(2)} | ${f(as_)} ${f(am)} ${f(ae)} ${f(asw)} | ` +
      `${f(bs)} ${f(bm)} ${f(be)} ${f(bsw)} | ${good ? "ok" : `end Δ${dEnd.toFixed(0)}  swing Δ${dSwing.toFixed(0)}`}`
  );
}
console.log(`\nsegments matching: ${ok}/${BOUNDS.length - 1}`);
