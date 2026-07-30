import { C, RIG } from "./rig.js";

// PRESET: floating-panel
// Screen detaches from any device and floats over a reflective ground, orbiting. Good closing beat; can dissolve out.

// The duration this shot was tuned at — reference scene 04, cuts 3000 + 3400 + 3900 ms.
// Other durations still render; the sub-cut timings scale proportionally, which
// is why a short scene can squeeze a cut down to a few frames. render.mjs warns.
export const nativeDurationMs = 10300;

export const note = 'Screen detaches from any device and floats over a reflective ground, orbiting. Good closing beat; can dissolve out.';

export default /** Shot 5 — floating panel, orbiting, dissolves out. Good for a closing beat. */
function preset({ durationMs, screen, cursor, dissolve = true }) {
  const a = Math.round(durationMs * 0.29), b = Math.round(durationMs * 0.33);
  return [
    {
      name: "panel-wide", durationMs: a, device: "screen", env: "sky", screen,
      orbit: { yawFrom: -8, yawDir: 1, yawRate: 3.0, pitchFrom: -6, pitchRate: 1.0 },
      keys: [
        { at: 0.00, cam: C(0, 0, 54.0, [0, 14.2, 0], 29), pose: { py: 14.2 } },
        { at: 1.00, cam: C(0, 0, 54.0, [0, 14.2, 0], 29), pose: { py: 14.2 } },
      ],
      cursor,
    },
    {
      name: "panel-punch", durationMs: b, device: "screen", env: "sky", screen,
      orbit: { yawFrom: 1, yawDir: -1, yawRate: 3.0, pitchFrom: -3, pitchRate: 1.0 },
      keys: [
        { at: 0.00, cam: C(0, 0, 38.0, [-3.0, 14.2, 0], 29), pose: { py: 14.2 } },
        { at: 1.00, cam: C(0, 0, 38.0, [-3.0, 14.2, 0], 29), pose: { py: 14.2 } },
      ],
      cursor,
    },
    {
      name: "panel-exit", durationMs: durationMs - a - b, device: "screen", env: "sky", screen,
      orbit: { yawFrom: -9.2, yawDir: 1, yawRate: 3.0, pitchFrom: 0.4, pitchRate: 1.0 },
      keys: [
        { at: 0.00, cam: C(0, 0, 68.0, [0, 14.2, 0], 29), pose: { py: 14.2 } },
        { at: 0.78, cam: C(0, 0, 68.0, [0, 14.2, 0], 29), pose: { py: 14.2 } },
        // panel LIFTS AWAY as it fades — the object moves, the camera does not
        { at: 1.00, cam: C(0, 0, 68.0, [0, 14.2, 0], 29), pose: { py: 30.0 }, ease: "in" },
      ],
      cursor,
      ...(dissolve ? { fade: { from: 0.78, color: "#ffffff" } } : {}),
    },
  ];
}
