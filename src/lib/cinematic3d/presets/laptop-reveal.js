import { C, RIG } from "./rig.js";

// PRESET: laptop-reveal
// Opens on a shut laptop that reveals itself. Strong opener; the device is the subject.

// The duration this shot was tuned at — reference scene 01, cuts 1700 + 2900 + 3400 ms.
// Other durations still render; the sub-cut timings scale proportionally, which
// is why a short scene can squeeze a cut down to a few frames. render.mjs warns.
export const nativeDurationMs = 8000;

export const note = 'Opens on a shut laptop that reveals itself. Strong opener; the device is the subject.';

export default /** Shot 1 — device reveals itself: lid opens from shut while the camera holds. */
function preset({ durationMs, screen, cursor }) {
  return [{
    name: "laptop-reveal", durationMs, device: "macbook", env: "dark", screen,
    spin: { rate: 4.5, dir: -1, from: 0 },
    lidOpen: { from: 0, to: RIG.lidWorking, startAt: 0.06, endAt: 0.46, ease: "out" },
    keys: [
      { at: 0.00, cam: C(0, 5, 78.0, [0, 11.2, -12]), pose: { lid: 0, yaw: 0 } },
      { at: 0.06, cam: C(0, 5, 77.0, [0, 11.3, -12]), pose: { lid: 0, yaw: 0 }, ease: "linear" },
      { at: 0.46, cam: C(0, 4, 58.0, [0, 11.8, -12]), pose: { lid: RIG.lidWorking }, ease: "out" },
      { at: 1.00, cam: C(0, 4, 58.0, [0, 11.8, -12]), pose: { lid: RIG.lidWorking }, ease: "linear" },
    ],
    cursor,
  }];
}
