import { C, RIG } from "./rig.js";

// PRESET: floating-panel
// Screen detaches from any device and floats over a reflective ground, orbiting. Good closing beat; can dissolve out.

// The duration this shot was tuned at — reference scene 04, cuts 3000 + 3400 + 3900 ms.
// Other durations still render; the sub-cut timings scale proportionally, which
// is why a short scene can squeeze a cut down to a few frames. render.mjs warns.
export const nativeDurationMs = 10300;

export const note = 'Screen detaches from any device and floats over a reflective ground, orbiting. Good closing beat; can dissolve out.';

export default /** Shot 5 — floating panel, orbiting, dissolves out. Good for a closing beat. */
function preset({ durationMs, screen, cursor, focus, dissolve = true }) {
  // The middle sub-cut is a hard jump from dist 54 to 38 and back out to 68.
  // At the tuned 10.3s that is a designed beat; on a short closing shot it
  // becomes a ~1s flash in and out, which reads as a glitch rather than a move.
  // `"focus": null` drops it, leaving a calm float that lifts away and
  // dissolves — usually what a closing beat actually wants.
  if (focus === null) {
    const w = Math.round(durationMs * 0.42);
    return [
      {
        name: "panel-wide", durationMs: w, device: "screen", env: "sky", screen,
        orbit: { yawFrom: -8, yawDir: 1, yawRate: 3.0, pitchFrom: -6, pitchRate: 1.0 },
        keys: [
          { at: 0.00, cam: C(0, 0, 54.0, [0, 14.2, 0], 29), pose: { py: 14.2 } },
          { at: 1.00, cam: C(0, 0, 50.0, [0, 14.2, 0], 29), pose: { py: 14.2 }, ease: "linear" },
        ],
        cursor,
      },
      {
        name: "panel-exit", durationMs: durationMs - w, device: "screen", env: "sky", screen,
        orbit: { yawFrom: -4, yawDir: 1, yawRate: 2.4, pitchFrom: -1, pitchRate: 0.8 },
        keys: [
          { at: 0.00, cam: C(0, 0, 50.0, [0, 14.2, 0], 29), pose: { py: 14.2 } },
          { at: 0.80, cam: C(0, 0, 55.0, [0, 14.2, 0], 29), pose: { py: 14.2 }, ease: "linear" },
          { at: 1.00, cam: C(0, 0, 55.0, [0, 14.2, 0], 29), pose: { py: 30.0 }, ease: "in" },
        ],
        cursor,
        ...(dissolve ? { fade: { from: 0.80, color: "#ffffff" } } : {}),
      },
    ];
  }

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
