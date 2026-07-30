// ---------------------------------------------------------------------------
// CUT LIST v4 — rebuilt on the measured ZOOM MAP (see ZOOM-MAP.md).
//
// Structure is now 15 segments, not 13: the reference's two extra events are
// instant punch-ins at 10.30 s and 14.60 s that were previously folded into
// neighbouring shots.
//
// Every distance below was SOLVED (solve.mjs) to hit a measured subject-width
// target from the reference, to within 0.35%. The comments give the target.
//
// Model:
//   * HOME FRAMING per section; punches are temporary departures that snap back.
//     0-8 s lives at w=71%; 1.70 punches to 96%; 4.60 returns to 70.6%.
//   * Scale changes are INSTANT (new segment) or EASED-THEN-STOPPED (<=0.8 s).
//     Nothing creeps across a whole shot.
//   * Holds are DEAD FLAT — identical cam on every key.
//   * Camera drift CONTINUES ACROSS CUTS inside a section (the pan up through
//     13.90 -> 18.20, the lateral slides in 4.60 -> 8.00).
//   * THE CAMERA MOVES, THE DEVICE DOES NOT. Device pose is constant within a
//     segment; the lid angle is the only animated device property.
// ---------------------------------------------------------------------------

const C = (yaw, pitch, dist, target, fov = 26) => ({ yaw, pitch, dist, target, fov });

export const CUTS = [
  // 1 | 0.00-1.70 | Camera is DEAD ON and centred (yaw 0, target x 0). The lid
  //     opens and the LAPTOP rotates LEFT. One single eased dolly, no second lurch.
  {
    name: "s01-laptop-open", durationMs: 1700, device: "macbook", env: "dark", screen: "kite",
    spin: { rate: 4.5, dir: -1, from: 0 },        // 1.70 s x 4.5 = 7.65 deg left
    lidOpen: { from: 0, to: 95, startAt: 0.06, endAt: 0.46, ease: "out" },
    keys: [
      { at: 0.00, cam: C(0, 5, 78.0, [0, 11.2, -12]), pose: { lid: 0, yaw: 0 } },
      { at: 0.06, cam: C(0, 5, 77.0, [0, 11.3, -12]), pose: { lid: 0, yaw: 0 }, ease: "linear" },
      // ONE move from here to 0.46 — the old list re-zoomed 63->55.5 in the last
      // 0.17 s on top of this, which is what read as a jump.
      { at: 0.46, cam: C(0, 4, 58.0, [0, 11.8, -12]), pose: { lid: 95, yaw: -7 }, ease: "out" },
      { at: 1.00, cam: C(0, 4, 58.0, [0, 11.8, -12]), pose: { lid: 95, yaw: -13 }, ease: "linear" },
    ],
    // pointer only after the lid is open (gated in scene3 too)
    cursor: [{ at: 0.55, u: 0.50, v: 0.66 }, { at: 1.0, u: 0.46, v: 0.72, ease: "out" }],
  },

  // 2 | 1.70-4.60 | INSTANT punch. Rotation INVERTS: laptop now turns RIGHT.
  {
    name: "s02-punch-editor", durationMs: 2900, device: "macbook", env: "dark", screen: "kite",
    spin: { rate: 4.5, dir: 1, from: -7.65 },     // inverts; 2.90 s x 4.5 = 13.05 deg right
    keys: [
      { at: 0.00, cam: C(0, 2, 45.0, [0, 11.4, -13]), pose: { lid: 95, yaw: -13 } },
      { at: 0.21, cam: C(0, 2, 45.0, [0, 11.4, -13]), pose: { lid: 95, yaw: -8 }, ease: "linear", screen: "desktopRecord" },
      { at: 1.00, cam: C(0, 2, 45.0, [0, 11.4, -13]), pose: { lid: 95, yaw: -1 }, ease: "linear" },
    ],
    cursor: [
      { at: 0.00, u: 0.46, v: 0.72 }, { at: 0.15, u: 0.40, v: 0.62, ease: "inOut" },
      { at: 0.24, u: 0.50, v: 0.55, ease: "out" }, { at: 0.70, u: 0.52, v: 0.58, ease: "inOut" },
      { at: 1.00, u: 0.49, v: 0.60, ease: "inOut" },
    ],
  },

  // 3 | 4.60-8.00 | INSTANT return to the home framing. Rotation INVERTS again: left.
  {
    name: "s03-home-orange", durationMs: 3400, device: "macbook", env: "dark", screen: "desktopWeather",
    spin: { rate: 4.5, dir: -1, from: 5.40 },     // inverts; 3.40 s x 4.5 = 15.3 deg left
    keys: [
      { at: 0.00, cam: C(0, 4, 55.0, [0, 11.9, -12]), pose: { lid: 95, yaw: -1 } },
      { at: 0.50, cam: C(0, 4, 55.0, [0, 11.9, -12]), pose: { lid: 95, yaw: -8 }, ease: "linear", screen: "desktopSelect" },
      { at: 1.00, cam: C(0, 4, 55.0, [0, 11.9, -12]), pose: { lid: 95, yaw: -15 }, ease: "linear" },
    ],
    cursor: [
      { at: 0.00, u: 0.52, v: 0.78 }, { at: 0.35, u: 0.46, v: 0.66, ease: "inOut" },
      { at: 0.55, u: 0.50, v: 0.52, ease: "out" }, { at: 1.00, u: 0.55, v: 0.50, ease: "inOut" },
    ],
  },

  // 4 | 8.00-12.00 | RAW 2D, ONE continuous shot. No three.js, no cuts.
  //     Reference measurement for this window:
  //       8.0-8.7   eased zoom   w 63.6 -> 77.0
  //       8.7-10.1  HELD         w 77.7        (1.4 s dead flat)
  //       10.2-10.4 softens back w ~61         (bbox spikes to 94.7 then 61.4 =
  //                                             a cross-dissolve, NOT a cut)
  //       10.5-11.4 eased zoom   w 61.4 -> 86.9
  //       11.4-12.0 HELD         w 86.7
  //     Scales below are relative to the contain-fit width (90% of frame), so
  //     0.707 lands w 63.6, 0.966 lands w 86.9.
  {
    name: "s04-raw2d", durationMs: 4000, device: "screen", env: "dark", screen: "desktopWeather",
    keys: [
      { at: 0.00, cam: C(0, 0, 60, [0, 16, 0], 27), pose: { py: 16 }, mode: "raw2d" },
      { at: 1.00, cam: C(0, 0, 60, [0, 16, 0], 27), pose: { py: 16 }, mode: "raw2d" },
    ],
    zoom2d: {
      // EXACTLY two moves and two DEAD-FLAT holds.
      // The previous version crept during both "holds" (0.950->0.962 and
      // 1.420->1.440) and drifted y the whole time, so nothing was ever still and
      // the two zooms read as jerks inside constant motion. Identical values on
      // both keys of a hold means the spring settles and genuinely stops.
      // x and y are pinned at 0 — any micro-drift there reads as jitter.
      stops: [
        { at: 0.000, scale: 0.780, x: 0, y: 0 },
        { at: 0.220, scale: 0.980, x: 0, y: 0 },   // zoom 1  (~0.9 s, eased)
        { at: 0.550, scale: 0.980, x: 0, y: 0 },   // HOLD    (1.3 s, dead flat)
        { at: 0.830, scale: 1.430, x: 0, y: 0 },   // zoom 2  (~1.1 s, eased)
        { at: 1.000, scale: 1.430, x: 0, y: 0 },   // HOLD    (0.7 s, dead flat)
      ],
    },
    cursor: [
      { at: 0.00, u: 0.50, v: 0.76 }, { at: 0.30, u: 0.44, v: 0.60, ease: "inOut" },
      { at: 0.62, u: 0.52, v: 0.55, ease: "inOut" }, { at: 1.00, u: 0.47, v: 0.62, ease: "inOut" },
    ],
  },

  // 6 | 12.00-13.90 | second lid open, OFF-CENTRE RIGHT (cx 66.7 -> 57.5), 1.42x
  {
    name: "s06-laptop-open-wide", durationMs: 1900, device: "macbook", env: "dark", screen: "desktopWeather",
    // reclines further than scene 1 (95 deg) — the reference leans back here
    lidOpen: { from: 0, to: 106, startAt: 0.05, endAt: 0.46, ease: "out" },
    followLid: { reach: 11.0 },                 // approach along the lid arc
    pan: { rate: 0.45, from: 0 },               // widest shot -> slowest. 1.90 s -> +0.855
    keys: [
      { at: 0.00, cam: C(19, 1.2, 108.0, [-6.3, 8.3, -15.9], 25), pose: { lid: 0 } },
      { at: 0.05, cam: C(19, 1.2, 106.0, [-6.3, 8.3, -15.9], 25), pose: { lid: 0 }, ease: "linear" },
      { at: 0.46, cam: C(19, 1.2, 92.0, [-6.3, 8.3, -15.9], 25), pose: { lid: 106 }, ease: "out" },
      { at: 1.00, cam: C(19, 1.2, 92.0, [-6.3, 8.3, -15.9], 25), pose: { lid: 106 } },          // HOLD
    ],
    cursor: [{ at: 0.6, u: 0.5, v: 0.72 }, { at: 1.0, u: 0.47, v: 0.68, ease: "out" }],
  },

  // 7 | 13.90-14.60 | INSTANT punch into the SAME laptop — same asset, same lid
  //     angle, just a much closer camera. (This was wrongly a separate bare-screen
  //     object, so the punch cut to a different thing instead of pushing in.)
  //     Screen centre at lid 106 sits at (0, 12.4, -15.9); we aim BELOW it and let
  //     the pedestal carry the frame up.
  {
    name: "s07-punch-pan-a", durationMs: 700, device: "macbook", env: "dark", screen: "desktopWeather",
    pan: { rate: 0.70, from: 0.855 },           // dampened. 0.70 s -> +1.345
    keys: [
      { at: 0.00, cam: C(16, 5, 26.0, [0, 10.6, -15.9], 29), pose: { lid: 106 } },
      { at: 1.00, cam: C(16, 5, 26.0, [0, 10.6, -15.9], 29), pose: { lid: 106 } },
    ],
    cursor: [{ at: 0.0, u: 0.44, v: 0.52 }, { at: 1.0, u: 0.47, v: 0.56, ease: "linear" }],
  },

  // 8 | 14.60-18.20 | small pull back, still the same laptop; pedestal unbroken
  {
    name: "s08-punch-pan-b", durationMs: 3600, device: "macbook", env: "dark", screen: "desktopWeather",
    pan: { rate: 0.60, from: 1.345 },           // dampened. 3.60 s -> +3.505
    keys: [
      { at: 0.00, cam: C(14, 4, 37.0, [0, 10.6, -15.9], 29), pose: { lid: 106 } },
      { at: 1.00, cam: C(14, 4, 37.0, [0, 10.6, -15.9], 29), pose: { lid: 106 } },
    ],
    cursor: [
      { at: 0.0, u: 0.42, v: 0.50 }, { at: 0.5, u: 0.52, v: 0.46, ease: "inOut" },
      { at: 1.0, u: 0.46, v: 0.54, ease: "inOut" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 18.20-28.50 is ONE scene: same moon content, same sky, three framings.
  // Full-bleed -> punch in on the moon card -> pull back to the floating panel,
  // then dissolve. Same home/punch/return shape as scene 1.
  //
  // The tilt comes from ORBITING the camera off-axis, not from rolling the panel.
  // (The old `roll: -14` on the sky plane was the crooked screen.)
  // Azimuth alternates direction per cut like scene 1; elevation climbs steadily
  // at 1.0 deg/s across all three, so the rise is unbroken through both cuts.
  // ---------------------------------------------------------------------------

  // 9 | 18.20-21.20 | full-bleed, azimuth swinging RIGHT
  {
    name: "s09-moon-wide", durationMs: 3000, device: "screen", env: "sky", screen: "moonPanel",
    orbit: { yawFrom: -8, yawDir: 1, yawRate: 3.0, pitchFrom: -6, pitchRate: 1.0 },
    keys: [
      { at: 0.00, cam: C(0, 0, 54.0, [0, 14.2, 0], 29), pose: { py: 14.2 } },
      { at: 1.00, cam: C(0, 0, 54.0, [0, 14.2, 0], 29), pose: { py: 14.2 } },
    ],
    cursor: [{ at: 0.0, u: 0.36, v: 0.62 }, { at: 0.5, u: 0.55, v: 0.50, ease: "inOut" }, { at: 1.0, u: 0.50, v: 0.66, ease: "inOut" }],
  },

  // 10 | 21.20-24.60 | INSTANT punch in on the moon card; azimuth INVERTS
  {
    name: "s10-moon-punch", durationMs: 3400, device: "screen", env: "sky", screen: "moonPanel",
    orbit: { yawFrom: 1, yawDir: -1, yawRate: 3.0, pitchFrom: -3, pitchRate: 1.0 },
    keys: [
      { at: 0.00, cam: C(0, 0, 38.0, [-3.0, 14.2, 0], 29), pose: { py: 14.2 } },
      { at: 1.00, cam: C(0, 0, 38.0, [-3.0, 14.2, 0], 29), pose: { py: 14.2 } },
    ],
    cursor: [{ at: 0.0, u: 0.44, v: 0.48 }, { at: 1.0, u: 0.52, v: 0.44, ease: "inOut" }],
  },

  // 11 | 24.60-28.50 | pull back to the floating panel over the floor; azimuth
  //     INVERTS again. Dissolves to white at the end.
  {
    name: "s11-moon-panel-dissolve", durationMs: 3900, device: "screen", env: "sky", screen: "moonPanel",
    orbit: { yawFrom: -9.2, yawDir: 1, yawRate: 3.0, pitchFrom: 0.4, pitchRate: 1.0 },
    keys: [
      { at: 0.00, cam: C(0, 0, 68.0, [0, 14.2, 0], 29), pose: { py: 14.2 } },
      // sits on the floor, then LIFTS AWAY as it fades — the panel moves, the
      // camera does not, so it reads as the UI floating off rather than a push
      { at: 0.78, cam: C(0, 0, 68.0, [0, 14.2, 0], 29), pose: { py: 14.2 } },
      { at: 1.00, cam: C(0, 0, 68.0, [0, 14.2, 0], 29), pose: { py: 30.0 }, ease: "in" },
    ],
    cursor: [{ at: 0.0, u: 0.40, v: 0.52 }, { at: 1.0, u: 0.50, v: 0.58, ease: "inOut" }],
    fade: { from: 0.78, color: "#ffffff" },
  },

  // 12 | 28.50-35.70 | the BREATHE: w 70.5 -> 74.1 -> 70.6. Net zero over 7.2 s.
  {
    name: "s12-laptop-orbit", durationMs: 7200, device: "macbook", env: "navy", screen: "desktopPhone",
    orbit: { yawFrom: -6, yawDir: 1, yawRate: 1.2, pitchFrom: 7, pitchRate: 0.28 },
    keys: [
      // NOT a breathe. One constant, very subtle pull-out across the whole shot
      // while the camera orbits — dist 52 -> 57 is about 10% over 7.2 s.
      { at: 0.00, cam: C(0, 0, 52.0, [0, 11.3, -4]), pose: { lid: 95 } },
      { at: 0.50, cam: C(0, 0, 54.5, [0, 11.3, -4]), pose: { lid: 95 }, ease: "linear", screen: "desktopPhoneWeather" },
      { at: 1.00, cam: C(0, 0, 57.0, [0, 11.3, -4]), pose: { lid: 95 }, ease: "linear" },
    ],
    cursor: [
      { at: 0.00, u: 0.62, v: 0.58 }, { at: 0.45, u: 0.55, v: 0.50, ease: "inOut" },
      { at: 0.80, u: 0.68, v: 0.62, ease: "inOut" }, { at: 1.00, u: 0.66, v: 0.60, ease: "inOut" },
    ],
  },

  // ---------------------------------------------------------------------------
  // 13 | 35.70-46.00 | ONE continuous shot. No cuts at all.
  //
  // What looked like cuts is the same phone with its UI changing (a popup /
  // slide-in), plus a zoom into part of the interface right at the end.
  //
  // Rest pose is COPLANAR with the scene-3 laptop display: verified by comparing
  // surface normals with ?debugmac=1 — mac lean +15.95 deg, phone +16.00, planes
  // 1.27 deg apart (that residual is the donor mac's own yaw, not the pose).
  // NOTE: pitch is NEGATIVE-back in this rig. pitch:+16 leans it FORWARD.
  //
  // The camera starts low and pedestals up for the whole 10.3 s, slowly enough
  // that the phone stays fully in frame throughout — until the closing zoom.
  // ---------------------------------------------------------------------------
  {
    name: "s13-phone-single", durationMs: 10300, device: "iphone", env: "white", screen: "phoneHome",
    pan: { rate: 0.35, from: 0 },      // +3.6 cm of pedestal over the whole shot
    // Framing constraint, solved rather than eyeballed: the phone spans y 1.7-17.1
    // (15.4 cm projected at pitch -16). At dist 44 the frame is 20.3 cm tall and the
    // pedestal adds 3.6 cm, so the look-at must satisfy
    //     T + 3.6 - 10.16 <= 1.7   (bottom still in at the END)   -> T <= 8.26
    //     T + 10.16      >= 17.1   (top still in at the START)    -> T >= 6.94
    // T = 7.4 sits mid-window with ~0.7 cm of margin at both ends.
    // After the flash-cut back, T drops by the pan accumulated so far (2.96 cm) so
    // the framing RESETS to the centred original rather than continuing to ride up.
    keys: [
      // --- spin in from the left, back-first, easing to a stop (1.30 s) --------
      { at: 0.000, cam: C(19, -2.3, 44.0, [0, 8.2, -10.6]), pose: { yaw: 0, pitch: -16, roll: 0, px: -36, py: 9.4, pz: -10.6 } },
      { at: 0.126, cam: C(19, -2.3, 44.0, [0, 8.2, -10.6]), pose: { yaw: 360, pitch: -16, roll: 0, px: 0, py: 9.4, pz: -10.6 }, ease: "out", screen: "phoneWeather" },
      // --- demo: camera holds, only the pedestal moves; UI change is NOT a cut -
      { at: 0.520, cam: C(19, -2.3, 44.0, [0, 8.2, -10.6]), pose: { yaw: 360, pitch: -16, roll: 0, px: 0, py: 9.4, pz: -10.6 }, screen: "phoneWeatherDark" },
      // --- FLASH CUT IN (keys 5 ms apart), 44 -> 26 = 1.69x --------------------
      { at: 0.5205, cam: C(19, -1.2, 26.0, [0, 10.1, -10.6]), pose: { yaw: 360, pitch: -16, roll: 0, px: 0, py: 9.4, pz: -10.6 } },
      { at: 0.820, cam: C(19, -1.2, 26.0, [0, 10.1, -10.6]), pose: { yaw: 360, pitch: -16, roll: 0, px: 0, py: 9.4, pz: -10.6 } },
      // --- FLASH CUT BACK, resetting to the centred original framing -----------
      { at: 0.8205, cam: C(19, -2.3, 44.0, [0, 5.2, -10.6]), pose: { yaw: 360, pitch: -16, roll: 0, px: 0, py: 9.4, pz: -10.6 }, screen: "phoneWeather" },
      { at: 0.874, cam: C(19, -2.3, 44.0, [0, 5.2, -10.6]), pose: { yaw: 360, pitch: -16, roll: 0, px: 0, py: 9.4, pz: -10.6 } },
      // --- spins OUT to the right over 1.30 s: the true inverse of the entrance.
      //     Entrance came in FAST and decelerated; the exit starts SLOW and
      //     accelerates away. That is the "in" curve (t^3), not "out" — the
      //     naming is the opposite of how it reads on screen, which is why this
      //     got flipped the wrong way twice. px 60 so the full 1.30 s is spent
      //     travelling instead of leaving frame early and idling.
      { at: 1.000, cam: C(19, -2.3, 44.0, [0, 5.2, -10.6]), pose: { yaw: 720, pitch: -16, roll: 0, px: 60, py: 9.4, pz: -10.6 }, ease: "in" },
    ],
  },
];

export const DURATION = CUTS.reduce((n, c) => n + c.durationMs, 0) / 1000;
