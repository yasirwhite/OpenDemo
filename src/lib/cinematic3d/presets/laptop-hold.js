import { C, RIG } from "./rig.js";

// PRESET: laptop-hold
// A long, patient shot with almost no movement. Use for a walkthrough that needs room to breathe.

// The duration this shot was tuned at — reference scene 05, a single 7200 ms cut.
// Other durations still render; the sub-cut timings scale proportionally, which
// is why a short scene can squeeze a cut down to a few frames. render.mjs warns.
export const nativeDurationMs = 7200;

export const note = 'A long, patient shot with almost no movement. Use for a walkthrough that needs room to breathe.';

export default /** Shot 6 — the long patient hold. Orbit plus a constant, very subtle pull-out. */
function preset({ durationMs, screen, cursor }) {
  return [{
    name: "laptop-hold", durationMs, device: "macbook", env: "navy", screen,
    orbit: { yawFrom: -6, yawDir: 1, yawRate: 1.2, pitchFrom: 7, pitchRate: 0.28 },
    keys: [
      { at: 0.00, cam: C(0, 0, 52.0, [0, 11.3, -4]), pose: { lid: RIG.lidWorking } },
      { at: 0.50, cam: C(0, 0, 54.5, [0, 11.3, -4]), pose: { lid: RIG.lidWorking }, ease: "linear" },
      { at: 1.00, cam: C(0, 0, 57.0, [0, 11.3, -4]), pose: { lid: RIG.lidWorking }, ease: "linear" },
    ],
    cursor,
  }];
}
