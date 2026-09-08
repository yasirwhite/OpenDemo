import { C, RIG } from "./rig.js";

// PRESET: phone-hold
// Phone already on screen. Slow downward pan, no spin. Optional punch-in on a
// moment that matters. The middle of a mobile sequence.

// Tuned at 5000 ms. With no `focus` it is a single continuous move, so it holds
// its shape at any duration — a short scene simply pans less.
export const nativeDurationMs = 5000;

export const note = 'Phone already present. Slow downward pan, no spin. Optional focus punch-in. The middle of a mobile sequence.';

export default /**
 * The hold half of phone-showcase: the rest pose, no arrival and no exit.
 *
 * ZOOM IS OPT-IN. phone-showcase fires a flash-zoom at a fixed 0.52 of every
 * scene it is given, so reusing it across a sequence punches in on whatever
 * happens to be on screen and teaches the viewer the zoom means nothing. Here a
 * scene asks for one only when it has a moment worth it:
 *
 *   { "preset": "phone-hold", "duration": 4.5,
 *     "focus": [{ "at": 0.42, "scale": 1.7, "hold": 0.34 }] }
 *
 * `at` and `hold` are fractions of the scene. This is the case a punch is FOR:
 * a small state change — a counter ticking over, a toast appearing — is
 * invisible at the scale a phone occupies in a wide shot, so the camera has to
 * go and look at it.
 *
 * The pan drifts the look-at DOWN over the shot, which walks the eye from the
 * top of a phone screen toward the bottom — the direction the content reads.
 */
function preset({ durationMs, screen, cursor, focus }) {
  const wide = 44;
  const P = (yaw, px) => ({ yaw, pitch: -16, roll: 0, px, py: 9.4, pz: -10.6 });

  // PAN IS A RATE, NOT A DISTANCE. Keys are placed at fractions of the shot, so
  // a fixed start/end travel means a short scene performs the same move in less
  // time — i.e. faster. Two 2.6-3.2s holds next to a 3.6s arrival read as the
  // camera suddenly lurching. Scaling the travel by duration/native keeps the
  // deg-per-second identical at any length.
  const k = durationMs / nativeDurationMs;
  const Y0 = 9.3, TRAVEL = -2.4 * k, PUSH = 1.2 * k;
  const Y1 = Y0 + TRAVEL;
  const yAt = (u) => Y0 + TRAVEL * u;           // where the pan is at time u

  const keys = [{ at: 0.00, cam: C(19, -2.3, wide, [0, Y0, -10.6]), pose: P(360, 0) }];

  const f = Array.isArray(focus) ? focus[0] : focus;
  if (f && Number.isFinite(f.at)) {
    const at = Math.min(0.92, Math.max(0.04, f.at));
    const hold = Math.min(0.5, Math.max(0.06, f.hold ?? 0.3));
    const scale = Math.max(1.05, f.scale ?? 1.6);
    const IN = 0.09, OUT = 0.12;                // punch in fast, ease back slower
    const near = wide / scale;
    const end = Math.min(0.97, at + hold);
    keys.push(
      { at, cam: C(19, -2.3, wide, [0, yAt(at), -10.6]), pose: P(360, 0), ease: "linear" },
      { at: at + IN, cam: C(19, -1.6, near, [0, yAt(at) + 0.6, -10.6]), pose: P(360, 0), ease: "out" },
      { at: end, cam: C(19, -1.6, near, [0, yAt(end) + 0.6, -10.6]), pose: P(360, 0), ease: "linear" },
      { at: Math.min(0.99, end + OUT), cam: C(19, -2.3, wide, [0, yAt(end + OUT), -10.6]), pose: P(360, 0), ease: "inOut" },
    );
  }

  keys.push({ at: 1.00, cam: C(19, -2.3, wide + PUSH, [0, Y1, -10.6]), pose: P(360, 0), ease: "linear" });

  return [{
    name: "phone-hold", durationMs, device: "iphone", env: "white", screen,
    pan: { rate: 0.22, from: 0 },
    keys,
    cursor,
  }];
}
