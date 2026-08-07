/**
 * radial-glow.jsx — one very faint radial wash of colour sitting BEHIND type.
 *
 * Measured off the Bloom launch film, the "your brand is extracted" beat
 * (28.86–30.90s), frame by frame at 25fps against the near-white ground:
 *
 *   SHAPE   a soft ellipse with a FLAT CORE, not a plain point-gradient. The
 *           tint holds its peak out to ~26% of the radius, then rolls off on a
 *           ((1-d)/(1-core))^1.46 curve to nothing at the rim. Fitting that
 *           exact model to every non-glyph pixel of the settled frames lands at
 *           rms 1.6/255 on a peak of 18.7/255 — the residual is the painted
 *           asset's watercolour texture, which a gradient cannot carry.
 *   TINT    over the reference's [253,253,253] ground the plateau reads
 *           [245,235,253]: dR -8.0, dG -18.0, dB 0.0. BLUE IS UNTOUCHED, which
 *           pins the wash's own blue at the ground's — so it is a violet with
 *           B~255 laid on at a very low alpha, NOT one of the film's saturated
 *           brand purples (those would drag B down 6/255, and the frames say it
 *           does not move). dR/dG holds at 0.44 for the whole two seconds, so
 *           it is one constant colour fading up, not a colour that travels.
 *   ENVELOPE  it fades up over ~380ms while it GROWS and DRIFTS RIGHT (stage
 *           centre x 410 -> 627, radius 400 -> 584), settles by ~29.65s, holds
 *           dead still, and is HARD CUT at 30.90s on the shot change. No fade
 *           out: the frame at 30.88 is at full strength and 30.92 is clean.
 *   ORDER   it is UNDER the type. Ruled out by measurement, not by eye: the
 *           glyph ink floor inside the glow core sits at [86,19,137] and does
 *           not move by even 1/255 while the wash fades up beneath it. A veil
 *           on TOP at this alpha would have lifted it ~16/255 per channel.
 *
 * Pure function of `t`, like every preset here: no wall clock, no state.
 */

import React from "react";
import { clamp01, lerp } from "../easing.js";

/**
 * Sparse envelope keys, resolved to {alpha, x, y, r}. Interpolation is LINEAR
 * by default because that is what the reference's fade-up measures as — its
 * alpha ramp runs ahead of a smoothstep through the whole onset. `ease` on a
 * key shapes the segment INTO that key when a softer join is wanted.
 */
function keyed(keys, t) {
  if (!keys || !keys.length) return null;
  if (t <= keys[0].t) return keys[0];
  const last = keys[keys.length - 1];
  if (t >= last.t) return last;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a.t && t < b.t) {
      const p = clamp01((t - a.t) / Math.max(1e-6, b.t - a.t));
      const e = b.ease === "smooth" ? p * p * (3 - 2 * p)
        : b.ease === "in" ? Math.pow(p, b.pow ?? 2)
        : b.ease === "out" ? 1 - Math.pow(1 - p, b.pow ?? 2)
        : p;
      return {
        alpha: lerp(a.alpha, b.alpha, e),
        x: lerp(a.x, b.x, e),
        y: lerp(a.y, b.y, e),
        r: lerp(a.r, b.r, e),
      };
    }
  }
  return last;
}

/**
 * The wash is one absolutely-positioned div carrying a CSS radial-gradient
 * whose stops sample f(d) = ((1-d)/(1-core))^falloff. Every stop shares one
 * colour and differs only in alpha, so the browser's premultiplied gradient
 * interpolation is exactly a linear ramp of that alpha — the rendered profile
 * is the fitted profile, not an approximation of it.
 *
 * `blend` stays "normal" by default: over the near-white ground of this beat a
 * plain alpha tint reproduces the measured deltas exactly, and normal is the
 * only mode that keeps behaving when the ground underneath is not white.
 */
export function RadialGlow({
  t, from, to, keys = [],
  colour = [186, 103, 255],
  peakAlpha = 0.12,
  core = 0.26,
  falloff = 1.45,
  aspect = 1,
  blend = "normal",
  steps = 16,
}) {
  if (t < from - 1e-6 || t > to + 1e-6) return null;
  const k = keyed(keys, t);
  if (!k || !(k.r > 1) || !(k.alpha > 0.002)) return null;

  const rx = k.r, ry = k.r * (aspect || 1);
  const a0 = peakAlpha * clamp01(k.alpha);
  const cc = `${colour[0]},${colour[1]},${colour[2]}`;
  const c = Math.min(0.95, Math.max(0, core));
  const n = Math.max(2, Math.round(steps));

  const stops = [`rgba(${cc},${a0.toFixed(5)}) 0%`];
  if (c > 0) stops.push(`rgba(${cc},${a0.toFixed(5)}) ${(c * 100).toFixed(2)}%`);
  for (let i = 1; i <= n; i++) {
    const d = c + (1 - c) * (i / n);
    const v = Math.pow((1 - d) / (1 - c), falloff);
    stops.push(`rgba(${cc},${(a0 * v).toFixed(5)}) ${(d * 100).toFixed(2)}%`);
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute",
        left: `${(k.x - rx).toFixed(2)}px`,
        top: `${(k.y - ry).toFixed(2)}px`,
        width: `${(rx * 2).toFixed(2)}px`,
        height: `${(ry * 2).toFixed(2)}px`,
        background: `radial-gradient(ellipse closest-side, ${stops.join(", ")})`,
        ...(blend && blend !== "normal" ? { mixBlendMode: blend } : null),
      }} />
    </div>
  );
}
