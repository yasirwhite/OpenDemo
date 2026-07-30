// Distinguish CAMERA zooms from UI cuts.
//
// The two leave different fingerprints:
//   * an instant zoom on the SAME screen  -> big jump in subject width, but the
//     pixels barely change statistically (same content, just larger), so the
//     frame-to-frame luminance diff stays LOW.
//   * a real cut to new content           -> luminance diff spikes HIGH.
//   * a UI state change with a locked camera -> diff spikes, width does NOT move.
// So width-delta and pixel-diff together classify every event.
import { readFileSync } from "node:fs";

const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
const DIFF_HI = Number(process.argv[3] ?? 20);   // content really changed
const DW_BIG = Number(process.argv[4] ?? 8);     // instant scale jump
const DW_SLOW = 0.7;                             // per-frame creep = eased zoom

const ev = [];
for (let i = 1; i < rows.length; i++) {
  const a = rows[i - 1], b = rows[i];
  if (!a.w || !b.w) continue;
  const dw = b.w - a.w, diff = b.diff ?? 0;
  let kind = null;
  if (Math.abs(dw) >= DW_BIG && diff < DIFF_HI) kind = dw > 0 ? "ZOOM-IN  (instant, same UI)" : "ZOOM-OUT (instant, same UI)";
  else if (Math.abs(dw) >= DW_BIG && diff >= DIFF_HI) kind = "SCENE CUT (new content + new scale)";
  else if (Math.abs(dw) < DW_BIG && diff >= DIFF_HI) kind = "UI CHANGE (camera locked)";
  if (kind) ev.push({ t: b.t, kind, dw: +dw.toFixed(1), diff, w: b.w });
}

// eased zooms = runs of small consistent width change
const runs = [];
let cur = null;
for (let i = 1; i < rows.length; i++) {
  const a = rows[i - 1], b = rows[i];
  if (!a.w || !b.w) { cur = null; continue; }
  const dw = b.w - a.w;
  const moving = Math.abs(dw) > DW_SLOW && Math.abs(dw) < DW_BIG;
  if (moving) {
    if (cur && Math.sign(dw) === cur.sign) { cur.t1 = b.t; cur.w1 = b.w; }
    else { cur = { t0: a.t, t1: b.t, w0: a.w, w1: b.w, sign: Math.sign(dw) }; runs.push(cur); }
  } else cur = null;
}

console.log("=== INSTANT EVENTS ===");
console.log("   t   type                                   dw      diff   w%");
for (const e of ev) {
  console.log(`${e.t.toFixed(1).padStart(5)}  ${e.kind.padEnd(36)} ${String(e.dw).padStart(6)} ${String(e.diff).padStart(7)} ${String(e.w).padStart(5)}`);
}

console.log("\n=== EASED CAMERA MOVES (continuous width change) ===");
console.log("  from    to    dur    w%: from -> to      x    ");
for (const r of runs) {
  const dur = r.t1 - r.t0;
  if (dur < 0.25 || Math.abs(r.w1 - r.w0) < 4) continue;
  console.log(
    `${r.t0.toFixed(1).padStart(6)} ${r.t1.toFixed(1).padStart(6)} ${dur.toFixed(1).padStart(6)}s   ` +
      `${r.w0.toFixed(1).padStart(5)} -> ${r.w1.toFixed(1).padStart(5)}   ${(r.w1 / r.w0).toFixed(2)}x`
  );
}
