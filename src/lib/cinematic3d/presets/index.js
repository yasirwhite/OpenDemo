// Shot preset registry.
//
// To ADD a preset: drop a `<slug>.js` here exporting `default` (the builder) and
// `note` (one line on when to use it), then add it to the two maps below and run
//   node src/lib/cinematic3d/tools/make-previews.mjs
// to generate its preview still.

import laptop_reveal, { note as laptop_reveal_note, nativeDurationMs as laptop_reveal_ms } from "./laptop-reveal.js";
import laptop_punch_reveal, { note as laptop_punch_reveal_note, nativeDurationMs as laptop_punch_reveal_ms } from "./laptop-punch-reveal.js";
import raw_2d, { note as raw_2d_note, nativeDurationMs as raw_2d_ms } from "./raw-2d.js";
import floating_panel, { note as floating_panel_note, nativeDurationMs as floating_panel_ms } from "./floating-panel.js";
import laptop_hold, { note as laptop_hold_note, nativeDurationMs as laptop_hold_ms } from "./laptop-hold.js";
import phone_showcase, { note as phone_showcase_note, nativeDurationMs as phone_showcase_ms } from "./phone-showcase.js";

export { RIG, C } from "./rig.js";

const S = 1000;   // ms per second

// ORBIT. scene.html sweeps the camera around the look-at point as
//   yaw = yawFrom + yawDir * yawRate * elapsedSeconds
//   pitch = pitchFrom + pitchRate * elapsedSeconds
// with every angle in degrees and both rates in degrees per second. A preset
// ships a tuned orbit; a config may override any subset of these keys, so the
// same shot can sweep slower, or reverse to sweep the other way, without
// forking the preset.
//
// These defaults apply when a config adds an orbit to a preset that had none.
// A partial override there would otherwise leave keys undefined, and the yaw
// math turns a single undefined into NaN — which silently renders a black frame
// rather than throwing.
const ORBIT_DEFAULTS = { yawFrom: 0, yawDir: 1, yawRate: 0, pitchFrom: 0, pitchRate: 0 };
const ORBIT_KEYS = Object.keys(ORBIT_DEFAULTS);

/** Merge a scene's orbit override onto whatever the preset emitted. */
function resolveOrbit(presetOrbit, override) {
  if (override === undefined) return presetOrbit;      // untouched
  if (override === null) return undefined;             // explicitly pinned
  const bad = Object.keys(override).filter((k) => !ORBIT_KEYS.includes(k));
  if (bad.length)
    throw new Error(`unknown orbit key(s) ${bad.join(", ")} — have: ${ORBIT_KEYS.join(", ")}`);
  for (const k of ORBIT_KEYS)
    if (override[k] !== undefined && !Number.isFinite(override[k]))
      throw new Error(`orbit.${k} must be a number, got ${JSON.stringify(override[k])}`);
  return { ...ORBIT_DEFAULTS, ...(presetOrbit ?? {}), ...override };
}

export const PRESETS = {
  "laptop-reveal": laptop_reveal,
  "laptop-punch-reveal": laptop_punch_reveal,
  "raw-2d": raw_2d,
  "floating-panel": floating_panel,
  "laptop-hold": laptop_hold,
  "phone-showcase": phone_showcase,
};

// What each shot was tuned at, in ms. A scene may run at any duration, but the
// further it strays from native the more the sub-cut proportions distort — see the
// warning render.mjs prints.
export const PRESET_NATIVE_MS = {
  "laptop-reveal": laptop_reveal_ms,
  "raw-2d": raw_2d_ms,
  "laptop-punch-reveal": laptop_punch_reveal_ms,
  "floating-panel": floating_panel_ms,
  "laptop-hold": laptop_hold_ms,
  "phone-showcase": phone_showcase_ms,
};

export const PRESET_NOTES = {
  "laptop-reveal": laptop_reveal_note,
  "laptop-punch-reveal": laptop_punch_reveal_note,
  "raw-2d": raw_2d_note,
  "floating-panel": floating_panel_note,
  "laptop-hold": laptop_hold_note,
  "phone-showcase": phone_showcase_note,
};

/**
 * Turn a cinematic3d config into the flat cut list the renderer consumes.
 * Also returns the source-time mapping so each frame knows which moment of the
 * recording to display.
 */
export function buildCuts(config) {
  const cuts = [];
  const mapping = [];
  let tCursor = 0;
  for (const scene of config.scenes ?? []) {
    const preset = PRESETS[scene.preset];
    if (!preset) throw new Error(`unknown preset "${scene.preset}" (have: ${Object.keys(PRESETS).join(", ")})`);
    const durationMs = Math.round((scene.duration ?? 6) * S);
    const screen = scene.screen ?? (config.source ? "video" : "placeholder");
    const produced = preset({ durationMs, screen, cursor: scene.cursor, focus: scene.focus, orbit: scene.orbit });

    // Presets are meant to be configurable, so a scene may retune the sweep the
    // preset shipped with — including on presets that emit no orbit at all.
    for (const c of produced) {
      const resolved = resolveOrbit(c.orbit, scene.orbit);
      if (resolved) c.orbit = resolved; else delete c.orbit;
    }

    // a preset may emit several cuts; split the requested duration across them
    const total = produced.reduce((n, c) => n + c.durationMs, 0);
    const k = durationMs / total;
    for (const c of produced) c.durationMs = Math.round(c.durationMs * k);

    for (const c of produced) {
      cuts.push(c);
      mapping.push({
        tStart: tCursor / S,
        tEnd: (tCursor + c.durationMs) / S,
        // which slice of the recording plays here
        clip: scene.clip ?? null,
        sceneStart: null,
      });
      tCursor += c.durationMs;
    }
    // record the scene span so source time can be interpolated across its cuts
    const sceneCuts = mapping.slice(mapping.length - produced.length);
    const s0 = sceneCuts[0].tStart, s1 = sceneCuts[sceneCuts.length - 1].tEnd;
    for (const m of sceneCuts) { m.sceneStart = s0; m.sceneEnd = s1; }
  }
  return { cuts, mapping, duration: tCursor / S };
}

/**
 * Derive focus points from the demo's own step list.
 *
 * The demo JSON already knows what was clicked and when, so zooms do not need to
 * be authored twice. Pass steps that carry a normalised target rect and a time,
 * and this emits the punch-then-reveal shape for the ones worth zooming on.
 *
 * Deliberately conservative: it zooms only steps explicitly marked `zoom`, because
 * zooming every interaction is the single most common way these films go wrong.
 */
export function focusFromSteps(steps, sceneStart, sceneEnd) {
  const span = Math.max(1e-6, sceneEnd - sceneStart);
  return steps
    .filter((s) => s.zoom && s.at != null && s.at >= sceneStart && s.at <= sceneEnd)
    .map((s) => ({
      at: (s.at - sceneStart) / span,
      on: s.on ?? [0.5, 0.5],
      scale: typeof s.zoom === "object" ? s.zoom.scale ?? 1.5 : 1.5,
      hold: typeof s.zoom === "object" ? s.zoom.hold ?? 0.25 : 0.25,
    }));
}
