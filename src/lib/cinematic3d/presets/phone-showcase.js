import { C, RIG } from "./rig.js";

// PRESET: phone-showcase
// Phone spins in, demos, flash-zooms on a detail, spins out. Use for mobile captures.

// The duration this shot was tuned at — reference scene 06, a single 10300 ms cut.
// Other durations still render; the sub-cut timings scale proportionally, which
// is why a short scene can squeeze a cut down to a few frames. render.mjs warns.
export const nativeDurationMs = 10300;

export const note = 'Phone spins in, demos, flash-zooms on a detail, spins out. Use for mobile captures.';

export default /**
 * Shot 7 — phone showcase. ONE continuous shot: spins in from the left, demos,
 * flash-cuts in on part of the UI, flash-cuts back, spins out to the right.
 *
 * The rest pose is COPLANAR with a MacBook display at lid 106 (verified by
 * comparing surface normals, not by eye). That is what makes the lean look
 * deliberate rather than arbitrary.
 *
 * The look-at is solved, not guessed. The phone spans y 1.7-17.1 and the
 * pedestal adds 3.6 cm over the shot, so at dist 44 (frame 20.3 cm tall):
 *     T + 3.6 - 10.16 <= 1.7   (bottom still in at the END)  -> T <= 8.26
 *     T + 10.16      >= 17.1   (top still in at the START)   -> T >= 6.94
 */
function preset({ durationMs, screen, focus = {} }) {
  const wide = 44, punch = wide / (focus.scale ?? 1.69);
  const T = 8.2, Tend = 5.2;   // Tend resets the accumulated pedestal
  const P = (yaw, px) => ({ yaw, pitch: -16, roll: 0, px, py: 9.4, pz: -10.6 });
  return [{
    name: "phone-showcase", durationMs, device: "iphone", env: "white", screen,
    pan: { rate: 0.35, from: 0 },
    keys: [
      { at: 0.000, cam: C(19, -2.3, wide, [0, T, -10.6]), pose: P(0, -36) },
      { at: 0.126, cam: C(19, -2.3, wide, [0, T, -10.6]), pose: P(360, 0), ease: "out" },
      { at: 0.520, cam: C(19, -2.3, wide, [0, T, -10.6]), pose: P(360, 0) },
      // flash cut: keys 5 ms apart, so it JUMPS rather than moves
      { at: 0.5205, cam: C(19, -1.2, punch, [0, 10.1, -10.6]), pose: P(360, 0) },
      { at: 0.820, cam: C(19, -1.2, punch, [0, 10.1, -10.6]), pose: P(360, 0) },
      { at: 0.8205, cam: C(19, -2.3, wide, [0, Tend, -10.6]), pose: P(360, 0) },
      { at: 0.874, cam: C(19, -2.3, wide, [0, Tend, -10.6]), pose: P(360, 0) },
      // leaves slow then accelerates: that is ease "in", despite reading as "easing out"
      { at: 1.000, cam: C(19, -2.3, wide, [0, Tend, -10.6]), pose: P(720, 60), ease: "in" },
    ],
  }];
}
