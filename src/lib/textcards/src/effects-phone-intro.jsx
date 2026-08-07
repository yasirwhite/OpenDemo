/**
 * effects-phone-intro.jsx — the hand-drawn opener for the phone-chat device:
 * a line-art hand places a paper-white slab on the set, a wobbly outline
 * self-draws around it with line boil (the sketch), then the outline fades and
 * the clean device (drawn by PhoneChat) takes over underneath.
 *
 * Measured off the Anthropic "Claude mobile" launch film 0.0–2.8s: the paper
 * enters small and landscape under the hand, turns portrait as it is placed,
 * the outline draws clockwise from the top-left over ~0.55s while boiling at
 * ~8Hz between three wobble variants, and everything resolves into the settled
 * cream device as the outline fades.
 *
 * Pure function of t; all cue times arrive as ABSOLUTE seconds.
 */

import React from "react";
import { at, clamp01, lerp, easeIn, rgb } from "./easing.js";

/** Piecewise keyframe lookup with per-segment smoothstep. keys = [[t, v], ...]. */
function keyVal(keys, t) {
  if (!keys?.length) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a[0] && t < b[0]) {
      const p = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      const e = p * p * (3 - 2 * p);
      return lerp(a[1], b[1], e);
    }
  }
  return last[1];
}

/** Hand-drawn wobbly rounded-rect path + its polyline length. Deterministic in
 *  (rect, seed); three seeds cycled at 8Hz give the line boil. */
function wobblyRect(x, y, w, h, r, seed) {
  const pts = [];
  const put = (px, py) => pts.push([px, py]);
  const N = 26;
  const corner = (cx, cy, a0, a1) => {
    for (let i = 1; i <= 8; i++) {
      const a = a0 + (a1 - a0) * (i / 8);
      put(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  };
  put(x + r, y);
  for (let i = 1; i <= N; i++) put(x + r + (w - 2 * r) * (i / N), y);
  corner(x + w - r, y + r, -Math.PI / 2, 0);
  for (let i = 1; i <= N; i++) put(x + w, y + r + (h - 2 * r) * (i / N));
  corner(x + w - r, y + h - r, 0, Math.PI / 2);
  for (let i = 1; i <= N; i++) put(x + w - r - (w - 2 * r) * (i / N), y + h);
  corner(x + r, y + h - r, Math.PI / 2, Math.PI);
  for (let i = 1; i <= N; i++) put(x, y + h - r - (h - 2 * r) * (i / N));
  corner(x + r, y + r, Math.PI, Math.PI * 1.5);
  let len = 0, path = "";
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const u = i / pts.length;
    const d = 2.3 * Math.sin(u * 61 + seed * 2.13) + 1.5 * Math.sin(u * 137 + seed * 4.71);
    const [px, py] = pts[i];
    const nx = px - (x + w / 2), ny = py - (y + h / 2);
    const nl = Math.hypot(nx, ny) || 1;
    out.push([px + (nx / nl) * d, py + (ny / nl) * d]);
  }
  for (let i = 0; i < out.length; i++) {
    path += (i === 0 ? "M" : "L") + out[i][0].toFixed(1) + " " + out[i][1].toFixed(1);
    if (i > 0) len += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
  }
  return { path, len };
}

/** Line-art hand, fingers up, wrist running off the bottom. Local box ~0..250
 *  x 0..430 with fingertips near y=26. */
function HandPaths() {
  const s = { fill: "none", stroke: "rgb(24,22,18)", strokeWidth: 15, strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <g>
      <path d="M 60 168 C 42 128 34 108 30 92 C 26 76 40 70 50 84 C 60 98 70 122 78 150 C 62 210 52 280 50 430" {...s} />
      <path d="M 78 150 C 84 96 92 62 102 56 C 114 50 122 62 122 86 C 122 112 118 142 112 170" {...s} />
      <path d="M 112 170 C 118 108 128 66 140 60 C 152 54 160 68 158 96 C 156 124 152 152 148 176" {...s} />
      <path d="M 148 176 C 156 124 166 92 178 88 C 190 84 196 98 194 122 C 192 146 188 170 184 190" {...s} />
      <path d="M 184 190 C 192 152 200 130 210 128 C 222 126 226 140 222 160 C 218 180 212 198 206 214" {...s} />
      <path d="M 206 214 C 226 260 236 330 238 430" {...s} />
    </g>
  );
}

/**
 * cfg (all *At in ABSOLUTE seconds):
 *   handAt / handExitAt   hand fade-in and exit start
 *   drawAt / drawDur      outline self-draw window
 *   fadeAt                outline (and slab aura) fade start
 *   paper                 slab colour, defaults to the film's paper white
 * The slab/hand keyframes are measured for this film and offset by base
 * (= the scene's start), so a moved scene keeps the choreography.
 */
export function PhoneIntro({ t, base, handAt, handExitAt, drawAt, drawDur, fadeAt, paper = [250, 249, 245] }) {
  if (t > fadeAt + 0.6) return null;

  const b = base;
  const slabKeys = {
    cx: [[b + 0.35, 650], [b + 1.15, 623], [b + 1.60, 707], [b + 1.95, 640], [b + 2.75, 640]],
    cy: [[b + 0.35, 368], [b + 1.15, 240], [b + 1.60, 390], [b + 1.95, 400], [b + 2.75, 398]],
    w: [[b + 0.35, 313], [b + 1.15, 560], [b + 1.60, 560], [b + 1.95, 527], [b + 2.75, 512]],
    h: [[b + 0.35, 257], [b + 1.15, 400], [b + 1.60, 660], [b + 1.95, 700], [b + 2.75, 692]],
    rot: [[b + 0.35, -2], [b + 1.15, -10], [b + 1.60, 5], [b + 1.95, 0]],
    rad: [[b + 0.35, 10], [b + 1.15, 14], [b + 1.60, 56], [b + 1.95, 62]],
  };
  const handKeys = {
    x: [[b + 0.40, 470], [b + 0.65, 500], [b + 1.15, 420], [b + 1.60, 560], [b + 1.95, 580], [b + 2.35, 620]],
    y: [[b + 0.40, 620], [b + 0.65, 300], [b + 1.15, 380], [b + 1.60, 330], [b + 1.95, 470], [b + 2.35, 860]],
    rot: [[b + 0.40, -10], [b + 0.65, 0], [b + 1.60, 4], [b + 2.35, 10]],
  };

  const slabO = clamp01(at(t, handAt - 0.05, 0.2)) * (1 - clamp01(at(t, fadeAt + 0.25, 0.3)));
  const slab = {
    cx: keyVal(slabKeys.cx, t), cy: keyVal(slabKeys.cy, t),
    w: keyVal(slabKeys.w, t), h: keyVal(slabKeys.h, t),
    rot: keyVal(slabKeys.rot, t), rad: keyVal(slabKeys.rad, t),
  };

  const drawP = clamp01(at(t, drawAt, drawDur));
  const outlineO = 1 - clamp01(at(t, fadeAt, 0.32));
  const seed = Math.floor(t * 8) % 3;
  // Outline hugs the settled device: PhoneChat's body is (398, 52, 484 wide).
  const ow = wobblyRect(404, 58, 472, 616, 54, seed);

  const hx = keyVal(handKeys.x, t), hy = keyVal(handKeys.y, t), hrot = keyVal(handKeys.rot, t);
  const handO = clamp01(at(t, handAt, 0.12)) * (1 - easeIn(at(t, handExitAt, 0.3), 1.6));

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {slabO > 0.004 && (
        <div style={{
          position: "absolute",
          left: (slab.cx - slab.w / 2).toFixed(1) + "px", top: (slab.cy - slab.h / 2).toFixed(1) + "px",
          width: slab.w.toFixed(1) + "px", height: slab.h.toFixed(1) + "px",
          borderRadius: slab.rad.toFixed(0) + "px",
          background: rgb(paper), opacity: slabO,
          transform: `rotate(${slab.rot.toFixed(2)}deg)`,
          boxShadow: "0 10px 40px rgba(140,124,102,0.35)",
        }}>
          {/* notch dash seen while the phone is being set down */}
          <div style={{
            position: "absolute", left: "56%", top: 24, width: 44, height: 13, borderRadius: 8,
            background: "rgb(24,22,18)",
            opacity: clamp01(at(t, b + 1.5, 0.1)) * (1 - clamp01(at(t, drawAt + 0.25, 0.2))),
          }} />
        </div>
      )}

      {outlineO > 0.004 && drawP > 0.001 && (
        <svg width="1280" height="720" style={{ position: "absolute", left: 0, top: 0, opacity: outlineO }}>
          <path d={ow.path} fill="none" stroke="rgb(22,20,17)" strokeWidth="13" strokeLinecap="round"
            strokeDasharray={ow.len.toFixed(0)} strokeDashoffset={(ow.len * (1 - drawP)).toFixed(0)} />
        </svg>
      )}

      {handO > 0.004 && (
        <svg width="1280" height="720" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <g opacity={handO.toFixed(3)}
            transform={`translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${hrot.toFixed(1)}) scale(1.5)`}>
            <HandPaths />
          </g>
        </svg>
      )}
    </div>
  );
}
