/**
 * easing.js — pure easing functions.
 *
 * Everything here is a pure function of normalised time. Nothing in this text
 * layer may use CSS transitions or animations: the renderer drives frames by
 * calling renderAtTime(t) out of order and screenshotting, so any wall-clock
 * animation would desynchronise. Every visual property is computed from t.
 */

export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Progress of a segment starting at `start` lasting `dur`, at time `t`. */
export const at = (t, start, dur) => clamp01((t - start) / Math.max(1e-6, dur));

export const linear = (t) => t;
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Accelerating. "yesterday" shrinks on one of these, NOT on an ease-out:
 * measured per-frame it loses 0.23%/frame at the start and 8.5%/frame on its
 * final frame, with only 7.5% of the total change in the first third (a linear
 * tween would be 33%). The acceleration itself steepens near the end, so this
 * sits slightly past cubic.
 */
export const easeIn = (t, p = 3.4) => Math.pow(t, p);
export const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
/**
 * Symmetric S, each half raised to `p`. 3 (the default) is the cubic the
 * media-window punches and camera drifts have always used. Lower is a gentler
 * S: the Bloom film's ground dissolves measure at p 1.5-1.85, where a cubic
 * leaves too slowly and arrives too abruptly (0.10-0.14 of the travel off at
 * the quarter points, ~1.5 frames of timing error each side).
 */
export const easeInOut = (t, p = 3) =>
  (t < 0.5 ? Math.pow(2, p - 1) * Math.pow(t, p) : 1 - Math.pow(-2 * t + 2, p) / 2);
export const expoOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Measured off the reference: a very fast attack that then creeps for a long
 * time. mem's reveals almost never use a symmetric ease — the motion is
 * essentially over in the first fifth of the duration and the rest is settle.
 */
export const memReveal = (t) => 1 - Math.pow(1 - t, 4.2);

/** Overshoot, for the few beats that visibly spring past their resting state. */
export const backOut = (t, s = 1.4) => {
  const u = t - 1;
  return 1 + u * u * ((s + 1) * u + s);
};

/**
 * REMAINING fraction (1 -> ~0) of a true exponential settle: per-frame delta
 * decays by a constant factor, which is what the Comet film's word rises
 * measure as (x0.83-0.88/frame at 25fps, tau 0.21-0.29s). Time constant is
 * dur/4, so at `start + dur` only e^-4 (~1.8%, sub-pixel at these travels)
 * remains — `dur` is "when it reads as settled", which is what an author can
 * actually time off a reference. Never clamps, so the tail keeps creeping the
 * way the measured curves do.
 */
export const settleDecay = (t, start, dur) =>
  t <= start ? 1 : Math.exp((-4 * (t - start)) / Math.max(1e-6, dur));

/**
 * Easing lookup by config-facing name, for the channels that take an `ease`
 * string (rise-into-place, media-window keys, per-scene camera). `pow` feeds
 * the parameterised curves. Unknown/absent names fall back to `fallback`
 * (default cubic ease-out) so a typo degrades gracefully instead of throwing
 * mid-render.
 */
export function easeByName(name, pow, fallback = easeOut) {
  switch (name) {
    case "linear": return linear;
    case "in":     return (p) => easeIn(p, pow ?? 2.6);
    case "out":    return easeOut;
    case "quint":  return easeOutQuint;
    case "inout":  return (t) => easeInOut(t, pow ?? 3);
    case "expo":   return expoOut;
    case "back":   return (p) => backOut(p, pow ?? 1.4);
    case "mem":    return memReveal;
    default:       return fallback;
  }
}

/** Per-item stagger: returns this item's local progress. */
export function staggered(t, start, dur, index, stepMs, totalMs) {
  const delay = (stepMs * index) / 1000;
  return at(t, start + delay, dur - (totalMs ? totalMs / 1000 : 0) || dur);
}

/** CSS cubic-bezier(x1,y1,x2,y2) — Newton solve for t, then evaluate y. */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sy(clamp01(t));
  };
}

export const rgb = ([r, g, b]) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
export const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
