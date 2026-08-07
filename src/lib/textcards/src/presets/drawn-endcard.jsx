/**
 * drawn-endcard.jsx — the hand-drawn logo resolve that closes a produced
 * motion-graphics film (measured off the Anthropic "Claude mobile" outro,
 * 38.8–44.35s, frame by frame at 10fps + spot checks at 30fps).
 *
 * One continuous gesture, four phases, all pure functions of t:
 *
 *   WIPE      a paper-white phone-shaped blob is revealed by a straight
 *             boundary sweeping from the top-left, while a black marker
 *             stroke draws the phone outline (up the left edge, across the
 *             top, down the right — the path stays OPEN, like a sketch).
 *   COLLAPSE  the outline un-draws from its tail while the head spirals
 *             inward, so the rectangle melts into a single drawn curve that
 *             contracts to a dot at screen centre; the white blob morphs
 *             into a four-lobed X silhouette and shrinks away underneath.
 *   MARK      the dot flips to terracotta and grows 11 irregular spikes —
 *             the drawn asterisk — with a slight settling counter-rotation.
 *   LOCKUP    the asterisk slides left onto the lockup position and the
 *             wordmark types on beside it, one glyph per beat, no caret,
 *             left-anchored so landed glyphs never move. Then a long hold.
 *
 * Stage coordinates are 1280x720 (reference 1920x1080 measurements / 1.5).
 */

import React from "react";
import { at, clamp01, lerp } from "../easing.js";

const rgbs = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const mix = (a, b, p) => {
  const q = clamp01(p);
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * q));
};
const easeOutP = (p, k = 2.2) => 1 - Math.pow(1 - clamp01(p), k);
const easeInP = (p, k = 2.2) => Math.pow(clamp01(p), k);
const smooth = (p) => { const q = clamp01(p); return q * q * (3 - 2 * q); };
// Same asymmetric settle the text presets use: fast first third, long tail.
const settleP = (p) => { const q = clamp01(p); return 1 - Math.pow(1 - q, 2.8) * (1 - 0.3 * q); };

const D2R = Math.PI / 180;

// ── outline path ─────────────────────────────────────────────────────────────
// The marker's journey drawn on: off-screen bottom-left, up the left edge,
// across the top, down the right edge (the path stays open, like a sketch).
// For the collapse each sample also carries its POLAR coordinates around a
// fixed centre, unwrapped, so the whole line can deform continuously into an
// inward spiral — measured behaviour: the rectangle never erases segment by
// segment, it bends into a curve while un-drawing from the tail.
let _geomCache = null;
function outlineGeom() {
  if (_geomCache) return _geomCache;
  const A = [];
  const add = (x, y) => A.push([x, y]);
  for (let i = 0; i <= 12; i++) add(413, lerp(910, 768, i / 12));
  for (let i = 1; i <= 64; i++) add(413, lerp(768, 117, i / 64));
  for (let i = 1; i <= 9; i++) {
    const a = (180 + 90 * (i / 9)) * D2R;
    add(470 + 57 * Math.cos(a), 117 + 57 * Math.sin(a));
  }
  for (let i = 1; i <= 34; i++) add(lerp(470, 810, i / 34), 60);
  for (let i = 1; i <= 9; i++) {
    const a = (270 + 90 * (i / 9)) * D2R;
    add(810 + 57 * Math.cos(a), 117 + 57 * Math.sin(a));
  }
  for (let i = 1; i <= 42; i++) add(867, lerp(117, 533, i / 42));

  const c0 = [640, 440];
  let prev = null;
  const P = A.map(([x, y]) => {
    const dx = x - c0[0], dy = y - c0[1];
    let a = Math.atan2(dy, dx);
    if (prev != null) {
      while (a < prev - Math.PI) a += 2 * Math.PI;
      while (a > prev + Math.PI) a -= 2 * Math.PI;
    }
    prev = a;
    return { x, y, r: Math.hypot(dx, dy), a };
  });
  _geomCache = { P, c0, a0: P[0].a, a1: P[P.length - 1].a };
  return _geomCache;
}

// ── white blob ───────────────────────────────────────────────────────────────
// Polar shape around a moving centre: superellipse (the phone slab) morphing
// into a four-lobed X, then scaled to nothing.
function blobPath(cx, cy, morph, scale) {
  const N = 144;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const phi = (i / N) * Math.PI * 2;
    // phone slab: superellipse half-extents 240 x 365
    const se = Math.pow(
      Math.pow(Math.abs(Math.cos(phi)) / 240, 5) +
      Math.pow(Math.abs(Math.sin(phi)) / 365, 5), -1 / 5);
    // X silhouette: four petals on the diagonals
    const xr = 108 + 178 * Math.pow(Math.abs(Math.cos(2 * (phi - Math.PI / 4))), 1.6);
    const r = lerp(se, xr, morph) * scale;
    const x = cx + r * Math.cos(phi), y = cy + r * Math.sin(phi);
    d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d + "Z";
}

// ── the drawn asterisk ───────────────────────────────────────────────────────
// 11 irregular rays, hand-drawn lengths; order of appearance is fixed.
const RAYS = [
  { a: 183, l: 1.00 }, { a: 148, l: 0.94 }, { a: 118, l: 0.80 },
  { a: 92, l: 0.88 }, { a: 63, l: 0.96 }, { a: 34, l: 0.72 },
  { a: 5, l: 0.82 }, { a: -32, l: 0.90 }, { a: -63, l: 0.78 },
  { a: -95, l: 0.92 }, { a: -128, l: 0.86 },
];

export function DrawnEndcard({
  t, start,
  wipeAt = 0.55, wipeDur = 0.55,
  collapseAt = 1.1, collapseDur = 0.9,
  markAt = 2.0, growDelay = 0.12, growDur = 0.38,
  slideAt = 2.7, slideDur = 0.22,
  typeAt = 2.74, cps = 15.5,
  text = "Claude", textSize = 101, textLeft = 527, textBaseline = 383,
  font = `Georgia, "Times New Roman", serif`, letterSpacing = "0em",
  markX = 470, markY = 344, popX = 627, popY = 349, markR = 40,
  ink = [25, 24, 22], accent = [211, 114, 86], paper = [250, 249, 245],
  stroke = 10,
}) {
  if (t < start - 0.001) return null;
  const T = (cue) => start + cue; // scene-relative cue -> absolute seconds

  const els = [];
  const wipeP = clamp01(at(t, T(wipeAt), wipeDur));
  const colP = clamp01(at(t, T(collapseAt), collapseDur));

  // ── white blob (wipe reveal, then morph + shrink) ──
  if (wipeP > 0 && t < T(collapseAt) + collapseDur - 0.02) {
    const morph = smooth(at(t, T(collapseAt) + 0.25, 0.4));
    const shrink = easeInP(at(t, T(collapseAt) + 0.58, 0.2), 1.3);
    const scale = lerp(1, 0.02, shrink);
    const bcx = lerp(647, lerp(637, popX, shrink), morph);
    const bcy = lerp(400, lerp(415, popY, shrink), morph);
    if (scale > 0.04) {
      const clip = wipeP < 1;
      let poly = "";
      if (clip) {
        const q = easeInP(wipeP, 1.25);
        const Tx = lerp(470, 1400, q), Ty = 10;
        const B = q < 0.6
          ? [398, lerp(140, 745, q / 0.6)]
          : [lerp(398, 930, (q - 0.6) / 0.4), 765];
        poly = `${Tx.toFixed(0)},${Ty} 340,10 340,785 ${B[0].toFixed(0)},${B[1].toFixed(0)}`;
      }
      els.push(
        <svg key="blob" viewBox="0 0 1280 720" style={{ position: "absolute", inset: 0 }}>
          {clip && <clipPath id="dec-wedge"><polygon points={poly} /></clipPath>}
          <path d={blobPath(bcx, bcy, morph, scale)} fill={rgbs(paper)}
            clipPath={clip ? "url(#dec-wedge)" : undefined} />
        </svg>
      );
    }
  }

  // ── outline: draw on, then swirl-collapse into a curve, then a dot ──
  if (wipeP > 0 && colP < 0.985) {
    const { P, c0, a0, a1 } = outlineGeom();
    const N = P.length;
    // Draw: the head travels the path. Collapse: the head RETRACTS (right
    // edge first, then the top) while the tail stays and melts inward —
    // measured: the left side of the outline survives longest as the C.
    const head = colP <= 0 ? easeOutP(wipeP, 1.15) : 1 - easeInP(colP, 2.6);
    const tail = 0;
    const i0 = Math.round(clamp01(tail) * (N - 1));
    const i1 = Math.round(clamp01(head) * (N - 1));
    if (i1 > i0 + 1) {
      let d = "";
      for (let i = i0; i <= i1; i++) {
        let x, y;
        if (colP <= 0) {
          x = P[i].x; y = P[i].y;
        } else {
          // Angle-preserving radial melt: every point keeps its bearing and
          // its radius relaxes onto one shared shrinking circle — corners
          // round first, straights bow, the whole line becomes a single arc
          // that contracts. No swirl: measured collapse never rotates.
          const u = i / (N - 1);
          const R = lerp(235, 6, easeInP(colP, 3.2));
          const del = 0.22 * Math.pow(u, 0.55); // tail melts first, head last
          const m = smooth(clamp01((colP - del) / (1 - del)));
          const ccx = lerp(c0[0], popX, easeInP(colP, 2.5));
          const ccy = lerp(lerp(c0[1], 480, smooth(clamp01(colP * 1.5))), popY, easeInP(colP, 5));
          // the retracting head curls inward-forward as it melts (the hook
          // visible mid-collapse in the reference)
          const prox = clamp01((u - (head - 0.16)) / 0.16);
          const a = P[i].a + 1.25 * m * prox * prox;
          const r = lerp(P[i].r, R, m) * (1 - 0.3 * m * prox);
          x = ccx + r * Math.cos(a); y = ccy + r * Math.sin(a);
        }
        d += (i === i0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
      }
      els.push(
        <svg key="line" viewBox="0 0 1280 720" style={{ position: "absolute", inset: 0 }}>
          <path d={d} fill="none" stroke={rgbs(ink)} strokeWidth={stroke}
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
  }

  // ── dot → asterisk ──
  if (colP >= 1 || t >= T(markAt)) {
    const flip = clamp01(at(t, T(markAt), 0.12));           // black -> terracotta
    const col = mix(ink, accent, flip);
    const growAt = T(markAt) + growDelay;
    const rot = lerp(-22, 0, easeOutP(at(t, growAt, growDur + 0.16), 2.0));
    const slide = settleP(at(t, T(slideAt), slideDur));
    const drift = easeOutP(at(t, growAt, growDur), 2);      // rise while growing
    const cx = lerp(lerp(popX, popX - 6, drift), markX, slide);
    const cy = lerp(lerp(popY, popY - 11, drift), markY, slide);
    const popR = 9 * easeOutP(at(t, T(collapseAt) + collapseDur - 0.06, 0.12), 2);
    els.push(
      <svg key="mark" viewBox="0 0 1280 720" style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot.toFixed(2)})`}>
          <circle r={Math.max(popR, 5.5)} fill={rgbs(col)} />
          {RAYS.map((ray, i) => {
            const k = easeOutP(at(t, growAt + i * 0.006, growDur), 2.4);
            if (k <= 0.01) return null;
            const L = markR * ray.l * k;
            const a = ray.a * D2R;
            return (
              <line key={i}
                x1={(Math.cos(a) * markR * 0.09).toFixed(1)} y1={(-Math.sin(a) * markR * 0.09).toFixed(1)}
                x2={(Math.cos(a) * L).toFixed(1)} y2={(-Math.sin(a) * L).toFixed(1)}
                stroke={rgbs(col)} strokeWidth={stroke * 0.95} strokeLinecap="round" />
            );
          })}
        </g>
      </svg>
    );
  }

  // ── wordmark types on, left-anchored ──
  const n = Math.max(0, Math.min([...text].length, Math.floor((t - T(typeAt)) * cps) + 1));
  if (t >= T(typeAt) && n > 0) {
    els.push(
      <span key="word" style={{
        position: "absolute", left: `${textLeft}px`,
        top: `${(textBaseline - textSize * 0.85).toFixed(1)}px`,
        fontFamily: font, fontSize: `${textSize}px`, fontWeight: 500,
        lineHeight: 1, letterSpacing, whiteSpace: "pre", color: rgbs(ink),
      }}>
        {[...text].slice(0, n).join("")}
      </span>
    );
  }

  return <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>{els}</div>;
}
