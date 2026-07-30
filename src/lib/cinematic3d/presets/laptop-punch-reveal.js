import { C, RIG } from "./rig.js";

// PRESET: laptop-punch-reveal
// Punch in on an interaction, hold, then pull back a little to show what it affected. The workhorse for feature demos.

// The duration this shot was tuned at — reference scene 03, cuts 1900 + 700 + 3600 ms.
// Other durations still render; the sub-cut timings scale proportionally, which
// is why a short scene can squeeze a cut down to a few frames. render.mjs warns.
export const nativeDurationMs = 6200;

export const note = 'Punch in on an interaction, hold, then pull back a little to show what it affected. The workhorse for feature demos.';

export default /**
 * Shot 3 — PUNCH-THEN-REVEAL. The core interaction grammar.
 *
 * Push in hard to frame the thing being clicked (attention), hold through the
 * interaction, then pull back a LITTLE to show what the click affected
 * (consequence). The pull-back must be small — go back too far and you throw
 * away the attention the push just bought.
 *
 * `focus.scale` sets how hard the punch is; `focus.revealScale` how far it
 * returns. Both are relative to the wide framing.
 */
function preset({ durationMs, screen, cursor, focus = {} }) {
  const punch = focus.scale ?? 3.0;         // wide 92 cm -> ~30 cm
  const reveal = focus.revealScale ?? 2.25; // pull back to ~41 cm
  const wide = 92, sc = RIG.screenCentre(RIG.lidReclined);
  // The reference's own cut lengths. buildCuts() rescales these proportionally if
  // the scene asks for a duration other than nativeDurationMs (6.2s), so leaving
  // them absolute keeps the measured values visible rather than as rounded percents.
  const openMs = 1900, punchMs = 700, resultMs = 3600;
  return [
    {
      name: "laptop-reopen", durationMs: openMs, device: "macbook", env: "dark", screen,
      lidOpen: { from: 0, to: RIG.lidReclined, startAt: 0.05, endAt: 0.46, ease: "out" },
      followLid: { reach: 11.0 },              // track the lid's HORIZONTAL sweep only
      pan: { rate: 0.45, from: 0 },            // wide shot -> slowest pedestal
      keys: [
        { at: 0.00, cam: C(19, 1.2, 108.0, [-6.3, 8.3, -15.9], 25), pose: { lid: 0 } },
        { at: 0.05, cam: C(19, 1.2, 106.0, [-6.3, 8.3, -15.9], 25), pose: { lid: 0 }, ease: "linear" },
        { at: 0.46, cam: C(19, 1.2, wide, [-6.3, 8.3, -15.9], 25), pose: { lid: RIG.lidReclined }, ease: "out" },
        { at: 1.00, cam: C(19, 1.2, wide, [-6.3, 8.3, -15.9], 25), pose: { lid: RIG.lidReclined } },
      ],
      cursor,
    },
    {
      name: "laptop-punch", durationMs: punchMs, device: "macbook", env: "dark", screen,
      pan: { rate: 0.70, from: 0.855 },        // tighter shot -> quicker pedestal
      keys: [
        { at: 0.00, cam: C(16, 5, wide / punch, [0, 10.6, sc.z], 29), pose: { lid: RIG.lidReclined } },
        { at: 1.00, cam: C(16, 5, wide / punch, [0, 10.6, sc.z], 29), pose: { lid: RIG.lidReclined } },
      ],
      cursor,
    },
    {
      name: "laptop-reveal-result", durationMs: resultMs,
      device: "macbook", env: "dark", screen,
      pan: { rate: 0.60, from: 1.345 },
      keys: [
        { at: 0.00, cam: C(14, 4, wide / reveal, [0, 10.6, sc.z], 29), pose: { lid: RIG.lidReclined } },
        { at: 1.00, cam: C(14, 4, wide / reveal, [0, 10.6, sc.z], 29), pose: { lid: RIG.lidReclined } },
      ],
      cursor,
    },
  ];
}
