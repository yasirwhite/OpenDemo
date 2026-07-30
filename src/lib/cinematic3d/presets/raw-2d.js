import { C, RIG } from "./rig.js";

// PRESET: raw-2d
// No 3D at all - the recording on black with a spring zoom. Cheapest to render and the most legible for dense UI.

// The duration this shot was tuned at — reference scene 02, a single 4000 ms cut.
// Other durations still render; the sub-cut timings scale proportionally, which
// is why a short scene can squeeze a cut down to a few frames. render.mjs warns.
export const nativeDurationMs = 4000;

export const note = 'No 3D at all - the recording on black with a spring zoom. Cheapest to render and the most legible for dense UI.';

export default /**
 * Shot 4 — RAW 2D. No 3D scene at all: the recording on black, zoomed with
 * OpenDemo's own spring (stiffness 320 / damping 40). Use when the UI matters
 * more than the hardware.
 *
 * `focus[]` entries become zoom stops: {at, on:[u,v], scale}. Between them the
 * frame HOLDS — dead flat, no drift. A hold that creeps reads as constant zoom.
 */
function preset({ durationMs, screen, focus = [], cursor }) {
  const stops = [{ at: 0.0, scale: 0.78, x: 0, y: 0 }];
  for (const f of focus) {
    const at = f.at ?? 0.5;
    const scale = f.scale ?? 1.3;
    // pan so the focus point lands centre-frame at the zoomed scale
    const x = f.on ? -(f.on[0] - 0.5) * scale : 0;
    const y = f.on ? (f.on[1] - 0.5) * scale : 0;
    stops.push({ at: Math.max(0.02, at - 0.10), scale: stops[stops.length - 1].scale, x: stops[stops.length - 1].x, y: stops[stops.length - 1].y });
    stops.push({ at, scale, x, y });
    stops.push({ at: Math.min(0.99, at + (f.hold ?? 0.25)), scale, x, y });   // HOLD, identical values
  }
  stops.push({ at: 1.0, ...stops[stops.length - 1], at: 1.0 });
  return [{
    name: "raw-2d", durationMs, device: "screen", env: "dark", screen,
    keys: [
      { at: 0.00, cam: C(0, 0, 60, [0, 16, 0], 27), pose: { py: 16 }, mode: "raw2d" },
      { at: 1.00, cam: C(0, 0, 60, [0, 16, 0], 27), pose: { py: 16 }, mode: "raw2d" },
    ],
    zoom2d: { stops },
    cursor,
  }];
}
