/**
 * gradient-sweep.jsx — serif kinetic lines whose glyphs land hot and cool
 * through a travelling pink → magenta → purple → ink front.
 *
 * Measured off the Bloom launch film (0–4.8s), frame by frame at 25fps:
 *
 *   LAND    glyphs appear at their FINAL layout position, left to right,
 *           ~40ms apart, slightly blurred, at a pale pink. A line can instead
 *           arrive whole and RISE from below the frame (tinted a deep purple
 *           while it moves — the colour gradient only becomes readable once
 *           the rise settles).
 *   COOL    each glyph then traverses a fixed colour ramp (pale pink → hot
 *           magenta → purple → ink). The cooling clock is offset per glyph
 *           (coolStep > revealStep), so the front LAGS increasingly on later
 *           glyphs: the head of the line is ink while the tail still burns
 *           magenta — that lag is the whole gradient-sweep look.
 *   RESWEEP an optional single bump wash re-crosses the settled line once
 *           (violet wash on "Meet Bloom" at ~3.3s; warm red/pink on the exit
 *           of "Always on-brand." at ~2.4s), then cools back to ink.
 *   SCALE   the whole block creeps in scale during holds and BURSTS on exit
 *           (ease-in to ~3x, cut mid-flight) — expressed as scaleKeys.
 *
 * Pure function of `t`, like every preset here: no wall clock, no state.
 */

import React from "react";
import { at, clamp01, lerp, easeIn, expoOut, memReveal, rgb, mixRgb } from "../easing.js";
import { C, FONT } from "../theme.js";

// land → settled, as sampled off the reference glyph stems.
const DEFAULT_RAMP = [
  [252, 210, 248], // pale pink the glyph lands at
  [236, 88, 222],  // hot magenta
  [154, 24, 162],  // purple (sampled: 154,24,162)
  [70, 30, 86],    // deep violet
  [24, 19, 28],    // settled ink
];

function rampAt(ramp, u) {
  const n = ramp.length - 1;
  if (n <= 0) return ramp[0] ?? C.ink;
  const v = clamp01(u) * n;
  const i = Math.min(n - 1, Math.floor(v));
  return mixRgb(ramp[i], ramp[i + 1], v - i);
}

function scaleAt(keys, t) {
  if (!keys || !keys.length) return 1;
  let s = keys[0].s ?? 1;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= b.t) { s = b.s ?? 1; continue; }
    if (t >= a.t) {
      const p = (t - a.t) / Math.max(1e-6, b.t - a.t);
      const e = b.ease === "in" ? Math.pow(p, b.pow ?? 2.2)
              : b.ease === "linear" ? p
              : memReveal(p);
      return lerp(a.s ?? 1, b.s ?? 1, e);
    }
  }
  return s;
}

/**
 * lines: [{ text, at }] — `at` is absolute seconds the line starts landing.
 * rise:    { dy, dur, colour } or null
 * resweep: { at, step, dur, colour, colour2 } or null (at absolute seconds)
 * scaleKeys: [{ t, s, ease, pow }] absolute seconds
 * exit:    { at, dur, blur, dx, fade } or null (at absolute seconds)
 */
export function GradientSweep({
  t, lines, size = 160, weight = 700, font = null,
  lineHeight = 1.0, x = 0, y = 0, letterSpacing = "-0.012em",
  revealStep = 0.04, revealDur = 0.11, blurIn = 8,
  coolDelay = 0.12, coolStep = 0.06, coolDur = 0.45,
  ramp = DEFAULT_RAMP,
  rise = null, resweep = null, scaleKeys = null, exit = null,
}) {
  const sc = scaleAt(scaleKeys, t);

  let o = 1, exitBlur = 0, exitDx = 0;
  if (exit) {
    const p = clamp01(at(t, exit.at, exit.dur ?? 0.25));
    if (exit.fade !== false) o = 1 - Math.pow(p, 1.6);
    exitBlur = (exit.blur ?? 0) * easeIn(p, 1.4);
    exitDx = (exit.dx ?? 0) * easeIn(p, 1.6);
  }
  if (o <= 0.004) return null;

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column",
      opacity: o,
      transform: `translate(${(x + exitDx).toFixed(2)}px, ${y}px) scale(${sc.toFixed(4)})`,
      transformOrigin: "50% 50%",
      filter: exitBlur > 0.4 ? `blur(${exitBlur.toFixed(2)}px)` : "none",
    }}>
      {lines.map((ln, li) => {
        const lat = ln.at ?? 0;
        // Optional rise: the whole line translates up from below while its
        // glyphs are already laid out. Tinted rise.colour while moving.
        let dy = 0, riseMix = 0;
        if (rise) {
          const p = clamp01(at(t, lat, rise.dur ?? 0.3));
          if (p <= 0) return null; // not yet on stage
          const e = expoOut(p);
          dy = (rise.dy ?? 280) * (1 - e);
          riseMix = 1 - p; // fades linearly as the rise completes
        }
        const chars = [...ln.text];
        const n = chars.length;
        return (
          <div key={li} style={{
            display: "flex", whiteSpace: "nowrap",
            lineHeight: String(lineHeight),
            transform: dy > 0.01 ? `translateY(${dy.toFixed(2)}px)` : "none",
          }}>
            {chars.map((ch, i) => {
              // Land: opacity + blur-in, per glyph, left to right.
              const landAt = lat + i * revealStep;
              const k = memReveal(at(t, landAt, revealDur));
              // Cool: fixed ramp traversal on a per-glyph offset clock.
              const cool = clamp01(at(t, lat + coolDelay + i * coolStep, coolDur));
              let col = rampAt(ramp, cool);
              // Resweep: one bump wash crossing left → right, then back.
              if (resweep) {
                const p = at(t, (resweep.at ?? 0) + i * (resweep.step ?? 0.03), resweep.dur ?? 0.5);
                if (p > 0 && p < 1) {
                  const f = n > 1 ? i / (n - 1) : 0;
                  const wash = resweep.colour2
                    ? mixRgb(resweep.colour ?? [140, 90, 220], resweep.colour2, f)
                    : (resweep.colour ?? [140, 90, 220]);
                  col = mixRgb(col, wash, Math.sin(Math.PI * clamp01(p)) * (resweep.amount ?? 1));
                }
              }
              if (riseMix > 0.001) col = mixRgb(col, rise.colour ?? [88, 48, 128], riseMix);
              const b = blurIn * (1 - k);
              return (
                <span key={i} style={{
                  fontFamily: font ?? FONT,
                  fontSize: `${size}px`, fontWeight: weight,
                  color: rgb(col),
                  opacity: clamp01(k),
                  letterSpacing,
                  whiteSpace: "pre",
                  filter: b > 0.4 ? `blur(${b.toFixed(2)}px)` : "none",
                }}>
                  {ch}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
