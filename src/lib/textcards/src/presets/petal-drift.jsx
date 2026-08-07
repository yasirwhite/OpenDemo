/**
 * petal-drift.jsx — soft painterly petal-flowers blooming over type.
 *
 * Measured off the Bloom launch-film closer (56.2s–57.45s): lavender flowers
 * POP IN small behind the URL line (each reaches full size in ~150–250ms),
 * then grow slowly while drifting UP a little — reading as blossoms floating
 * toward the camera — and defocus harder the closer they get, before the whole
 * layer dissolves into the endcard. Despite the brief "falling petals", the
 * frames show the drift is upward; trust the frames.
 *
 * Each flower is two rings of teardrop petals (a darker back ring offset half
 * a step behind a lighter front ring) plus a near-white core — a vector read
 * of the reference's airbrushed blossoms. Petal-shape jitter is deterministic
 * from `seed` (mulberry32), so the layer is a pure function of t and identical
 * across renders and workers.
 */

import React from "react";
import { clamp01, lerp, rgb, mixRgb } from "../easing.js";

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (p) => { const q = clamp01(p); return q * q * (3 - 2 * q); };

/** Smoothstep interpolation across [{t,x,y,r,rot,blur,o}] keys, ends clamped. */
function keyed(keys, t) {
  if (!keys?.length) return null;
  let a = keys[0], b = keys[keys.length - 1];
  if (t <= a.t) return a;
  if (t >= b.t) return b;
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t && t < keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }
  }
  const e = smooth((t - a.t) / Math.max(1e-6, b.t - a.t));
  return {
    x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), r: lerp(a.r, b.r, e),
    rot: lerp(a.rot ?? 0, b.rot ?? 0, e),
    blur: lerp(a.blur ?? 0, b.blur ?? 0, e),
    o: lerp(a.o ?? 1, b.o ?? 1, e),
  };
}

/**
 * One petal as an SVG path: a FAT rounded teardrop from near the core out to
 * radius ~96 (viewBox units, tip radius 100), with per-petal length/width
 * jitter baked in by the caller. Wide enough that adjacent petals overlap —
 * the reference blossoms read as one soft lavender mass, not as spokes.
 */
function petalPath(len, wid) {
  const tip = -96 * len;
  const waist = 42 * wid;
  const belly = -56 * len;
  return `M 0 -8 C ${waist} -16, ${(waist * 0.96).toFixed(1)} ${belly}, 0 ${tip} ` +
         `C ${(-waist * 0.96).toFixed(1)} ${belly}, ${-waist} -16, 0 -8 Z`;
}

export function PetalDrift({
  t, from, to, flowers = [],
  hi = [250, 247, 253],   // petal base / core near-white
  mid = [212, 183, 254],  // petal body lavender
  lo = [169, 139, 224],   // petal edge violet
  deep = [82, 37, 157],   // back-petal shadow violet
  mark = null,            // {src, opacity} — draw a brand mark instead of petals
}) {
  if (t < from - 0.001 || t > to + 0.001) return null;

  const els = flowers.map((f, fi) => {
    const k = keyed(f.keys, t);
    if (!k || k.r <= 1 || k.o <= 0.004) return null;

    // A brand mark in place of the drawn blossom. The keys are the same
    // choreography — same pop-in, same growth toward camera, same defocus,
    // same dissolve — so a film can carry ONE mark through every beat that
    // used decorative flowers without re-timing anything. The asset is
    // expected to be square and centred (see the make-mark export), which is
    // what lets `r` keep meaning "half the drawn size".
    if (mark && mark.src) {
      return (
        <img key={fi} src={mark.src} alt=""
          width={(k.r * 2).toFixed(1)} height={(k.r * 2).toFixed(1)}
          style={{
            position: "absolute",
            left: `${(k.x - k.r).toFixed(1)}px`, top: `${(k.y - k.r).toFixed(1)}px`,
            width: `${(k.r * 2).toFixed(1)}px`, height: `${(k.r * 2).toFixed(1)}px`,
            opacity: (clamp01(k.o) * (mark.opacity ?? 1)).toFixed(3),
            transform: `rotate(${k.rot.toFixed(2)}deg)`,
            filter: k.blur > 0.4 ? `blur(${k.blur.toFixed(2)}px)` : "none",
          }} />
      );
    }

    // Deterministic petal jitter — same seed, same flower, every frame.
    const rnd = mulberry32(f.seed ?? fi * 7 + 3);
    const n = f.petals ?? 6;
    const stepDeg = 360 / n;
    const petals = [];
    for (let j = 0; j < n; j++) {
      petals.push({
        ang: stepDeg * j + (rnd() - 0.5) * 9,
        len: 0.92 + rnd() * 0.14,
        wid: 0.9 + rnd() * 0.22,
      });
    }

    const idF = `pdF${fi}`, idB = `pdB${fi}`;
    return (
      <svg key={fi} viewBox="-100 -100 200 200"
        width={(k.r * 2).toFixed(1)} height={(k.r * 2).toFixed(1)}
        style={{
          position: "absolute",
          left: `${(k.x - k.r).toFixed(1)}px`, top: `${(k.y - k.r).toFixed(1)}px`,
          opacity: clamp01(k.o).toFixed(3),
          transform: `rotate(${k.rot.toFixed(2)}deg)`,
          filter: k.blur > 0.4 ? `blur(${k.blur.toFixed(2)}px)` : "none",
        }}>
        <defs>
          <linearGradient id={idF} x1="0" y1="-8" x2="0" y2="-95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={rgb(mixRgb(hi, mid, 0.45))} />
            <stop offset="42%" stopColor={rgb(mid)} />
            <stop offset="100%" stopColor={rgb(lo)} />
          </linearGradient>
          <linearGradient id={idB} x1="0" y1="-8" x2="0" y2="-95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={rgb(mixRgb(mid, deep, 0.35))} />
            <stop offset="100%" stopColor={rgb(deep)} />
          </linearGradient>
        </defs>
        {/* back ring: darker, half a petal-step behind, peeking between petals */}
        {petals.map((p, j) => (
          <g key={`b${j}`} transform={`rotate(${(p.ang + stepDeg / 2).toFixed(1)}) scale(0.88)`}>
            <path d={petalPath(p.len, p.wid)} fill={`url(#${idB})`} opacity="0.5" />
          </g>
        ))}
        {/* front ring: light lavender; the pale rim is what separates petals
            into a blossom instead of one fused mass. Drawn evens-then-odds so
            overlaps alternate — stacking them one way round reads as a
            pinwheel twist the reference does not have. */}
        {petals.map((p, j) => (j % 2 ? null : (
          <g key={`f${j}`} transform={`rotate(${p.ang.toFixed(1)})`}>
            <path d={petalPath(p.len, p.wid)} fill={`url(#${idF})`}
              stroke={rgb(hi)} strokeWidth="2.5" />
          </g>
        )))}
        {petals.map((p, j) => (j % 2 ? (
          <g key={`f${j}`} transform={`rotate(${p.ang.toFixed(1)})`}>
            <path d={petalPath(p.len, p.wid)} fill={`url(#${idF})`}
              stroke={rgb(hi)} strokeWidth="2.5" />
          </g>
        ) : null))}
        <circle r="13" fill={rgb(hi)} />
        <circle r="6" fill={rgb(mixRgb(hi, mid, 0.5))} />
      </svg>
    );
  });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {els}
    </div>
  );
}
