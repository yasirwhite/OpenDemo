/**
 * star-lockup.jsx — the closing beat where a point of light BECOMES the mark.
 *
 * The failure mode this exists to kill: a glowing dot holds on a starfield,
 * then a logo cross-fades in over it. Two unrelated things sharing a position.
 * The reference outro (Comet launch film, 64.5–66.0s, decoded frame by frame)
 * does something else entirely — the light is the raw material the mark is
 * made of, and you can watch the transfer happen:
 *
 *   64.54  a speck
 *   64.92  a hard white disc, r≈47px, inside a bloom about 2.5x that wide
 *          (bright-pixel area 5 -> 6885 px^2 in nine frames, S-curved)
 *   65.0+  the disc CONDENSES — it shrinks fast then slow — and the strokes of
 *          the mark are shed out of it, growing from the disc's edge outward
 *   65.9   area has settled to ~2200 px^2 and the mark holds, dead still,
 *          for the remaining six seconds
 *
 * So: one continuous quantity of light, redistributed. Total bright area barely
 * dips across the handoff, which is exactly why it reads as continuous rather
 * than as a swap. That is reproduced here as five overlapping phases:
 *
 *   IGNITE    a spark swells to a peak disc inside a two-layer bloom
 *   CONDENSE  the disc collapses toward the bead radius on a fast-then-slow
 *             curve, and a thin shock ring expands away from it
 *   DRAW      both halves of the arch grow OUT of the bead along their own
 *             path length, each led by a hot white ignition front that decays
 *             into the settled brand gradient behind it
 *   SETTLE    the residual bloom decays to a resting glow the mark keeps
 *   LOCKUP    the mark slides left off frame centre and the wordmark fades and
 *             rises into place beside it
 *
 * Every value is a pure function of `t`. Nothing here reads a wall clock.
 */

import React from "react";
import { clamp01, lerp } from "../easing.js";
import { FONT } from "../theme.js";
import { capMetrics } from "../effects.jsx";

const rgbs = (c, a) => (a == null
  ? `rgb(${c[0]},${c[1]},${c[2]})`
  : `rgba(${c[0]},${c[1]},${c[2]},${a})`);
const mix = (a, b, p) => { const q = clamp01(p); return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * q); };
const eOut = (p, k = 2.4) => 1 - Math.pow(1 - clamp01(p), k);
const eIn = (p, k = 2.4) => Math.pow(clamp01(p), k);
const eInOut = (p, k = 2) => {
  const q = clamp01(p);
  return q < 0.5 ? Math.pow(2, k - 1) * Math.pow(q, k) : 1 - Math.pow(-2 * q + 2, k) / 2;
};
/** progress of a segment; unlike easing.at this is safe with dur<=0. */
const seg = (t, start, dur) => (dur <= 0 ? (t >= start ? 1 : 0) : clamp01((t - start) / dur));

/**
 * THE OPENDEMO MARK, in a 100x100 unit box.
 *
 * A rounded-square portal — the frame you watch a demo inside — broken once at
 * the crown, with a bead of light nested in the break. The rounded square is
 * the existing OpenDemo brand shape; the break is the "open"; the bead is the
 * star this whole beat is made of. One opening, not two: an earlier version
 * left the floor open as well and the silhouette fell apart into two brackets.
 *
 * Both stroke paths START at the crown break and END together at the floor's
 * midpoint, so a single `stroke-dashoffset` ramp draws them OUTWARD from the
 * bead and the two ignition fronts collide at the bottom. That is the whole
 * reason the geometry is described from the crown rather than as one loop.
 *
 * The break is sized so the stroke's round cap stops 1.5 units (~3px at
 * markH 170) short of the bead: near enough to read as one object being shed
 * from another, far enough not to weld into a blob at rest.
 *
 * Kept byte-identical to <g id="mark"> in ../../opendemo-logo.svg.
 */
export const MARK = {
  // 111.3 units of path each; pathLength is normalised to 100 when drawn.
  left: "M35 15H31A16 16 0 0 0 15 31V69A16 16 0 0 0 31 85H50",
  right: "M65 15H69A16 16 0 0 1 85 31V69A16 16 0 0 1 69 85H50",
  bead: { cx: 50, cy: 15, r: 7 },
  strokeW: 13,
  // visible ink, stroke and bead included — what the lockup lays out against
  box: { x0: 8.5, y0: 8, x1: 91.5, y1: 91.5 },
};
const MARK_W = MARK.box.x1 - MARK.box.x0;      // 83
const MARK_H = MARK.box.y1 - MARK.box.y0;      // 83.5

/**
 * Wordmark run width. Canvas is the only way to measure text, but the answer
 * depends solely on (text, size, weight, font, tracking), so this stays a pure
 * function of t and is cached. Without it the lockup cannot be centred as a
 * unit and the mark's slide would have to be hand-tuned per brand name.
 */
let _mctx = null;
const _mcache = new Map();
export function runWidth(text, size, weight, font, trackEm) {
  const key = `${text}|${size}|${weight}|${font}|${trackEm}`;
  const hit = _mcache.get(key);
  if (hit != null) return hit;
  let w = size * 0.56 * [...text].length;               // fallback
  try {
    _mctx = _mctx ?? document.createElement("canvas").getContext("2d");
    _mctx.font = `${weight} ${size}px ${font}`;
    const m = _mctx.measureText(text);
    if (m.width > 0) w = m.width;
  } catch { /* fallback above */ }
  // CSS letter-spacing adds after every character, the last one included.
  w += trackEm * size * [...text].length;
  _mcache.set(key, w);
  return w;
}

export function StarLockup({
  t, from, to, uid = "sl",
  // ── layout ──
  starX = 640, starY = 300,     // where the light lives = the bead's rest spot
  markH = 170,                  // mark ink height in px (MARK_H units tall)
  lockX = 640,                  // centre the settled mark+wordmark group here
  markGap = 0.30,               // gap as a fraction of mark ink height
  // ── copy ──
  text = "OpenDemo", boldFrom = 4, size = 68, tracking = -0.016,
  weightLight = 300, weightBold = 640, font = null,
  tagline = "", taglineSize = 22, taglineGap = 0.34,
  // ── timing (scene-relative seconds) ──
  igniteAt = 0, igniteDur = 0.62, peakHold = 0.09,
  condenseDur = 0.80,
  drawAt = 0.72, drawDur = 0.82,
  glowSettleDur = 0.95,
  slideAt = 1.62, slideDur = 0.70,
  wordAt = 1.76, wordDur = 0.78, wordRise = 16,
  outDur = 0,
  // ── light ──
  peakR = 46, sparkR = 1.6, restGlow = 0.30, shock = 0.22,
  hotLen = 26, frontGlow = 1,
  // ── colour ──
  bead = [255, 255, 255], hot = [255, 250, 245],
  warm = [232, 72, 58], cool = [124, 108, 245],
  word = [240, 238, 246], taglineColour = [150, 150, 172],
}) {
  if (t < from - 0.001 || t > to + 0.001) return null;
  const T = (cue) => from + cue;                 // scene-relative -> absolute
  const k = markH / MARK_H;                      // unit -> px
  const beadR = MARK.bead.r * k;

  // ── the light's own envelope ────────────────────────────────────────────
  // One radius curve through the whole beat: spark -> peak -> bead. Because it
  // is one continuous function there is no frame where the disc jumps size,
  // which is the single easiest way to make this read as a cross-fade.
  const igP = seg(t, T(igniteAt), igniteDur);
  const peakT = T(igniteAt) + igniteDur + peakHold;
  const coP = seg(t, peakT, condenseDur);
  const swell = lerp(sparkR, peakR, eInOut(igP, 2.2));
  const starR = coP <= 0 ? swell : lerp(peakR, beadR, eOut(coP, 2.0));
  // The strokes grow on a FRONT-LOADED curve, not a linear one. The bloom
  // collapses fast (it is tied to starR), so a linear draw leaves a hole: total
  // lit area measured over consecutive frames dipped 38% and then climbed back,
  // which on playback is a flicker. Front-loading the draw fills that hole with
  // stroke as fast as the disc gives it up, and the measured curve becomes
  // monotone.
  const drawP = seg(t, T(drawAt), drawDur);
  const drawE = eOut(drawP, 1.9);
  // Energy: 1 while the light is a free star, decaying as it is spent on the
  // strokes. eIn (not eOut) so the bloom holds through the early draw — it is
  // the same light, and it cannot leave before the strokes have taken it.
  const spent = eIn(drawP, 1.35);
  const settleP = seg(t, T(drawAt) + drawDur, glowSettleDur);
  const energy = lerp(1, restGlow, Math.max(spent * 0.72, eOut(settleP, 1.8)));
  const born = clamp01(igP * 6);                 // the first two frames fade up

  // ── lockup geometry ─────────────────────────────────────────────────────
  const ff = font ?? FONT;
  const chars = [...text];
  const lightTxt = chars.slice(0, Math.max(0, boldFrom)).join("");
  const boldTxt = chars.slice(Math.max(0, boldFrom)).join("");
  const wordW = (lightTxt ? runWidth(lightTxt, size, weightLight, ff, tracking) : 0)
    + (boldTxt ? runWidth(boldTxt, size, weightBold, ff, tracking) : 0);
  const markW = MARK_W * k, markInkH = MARK_H * k;
  const gapPx = markInkH * markGap;
  const totalW = markW + (wordW > 0 ? gapPx + wordW : 0);
  // The mark resolves at the star's position and only THEN slides left to make
  // room; sliding first would mean the flash happens off-centre.
  const restCx = lockX - totalW / 2 + markW / 2;
  const slideP = wordW > 0 ? eOut(seg(t, T(slideAt), slideDur), 2.8) : 0;
  const cx = lerp(starX, restCx, slideP);
  const cy = starY;                              // the bead never moves vertically
  // unit-space origin: unit (bead.cx, bead.cy) must land on (cx, cy)
  const ox = cx - MARK.bead.cx * k;
  const oy = cy - MARK.bead.cy * k;
  const inkCy = oy + (MARK.box.y0 + MARK_H / 2) * k;   // vertical centre of the ink
  const wordLeft = ox + MARK.box.x1 * k + gapPx;

  const outO = outDur > 0 ? 1 - seg(t, to - outDur, outDur) : 1;
  if (outO <= 0.002) return null;

  // ── SVG layer ───────────────────────────────────────────────────────────
  const els = [];
  const G = `${uid}-`;

  // Bloom: two layers so the falloff is not a single exponential. The wide one
  // is what makes the peak read as a light source rather than a white circle.
  const bloomA = 0.92 * energy * born;
  const wideA = 0.42 * energy * born;
  els.push(
    <div key="bloom" style={{ position: "absolute", inset: 0 }}>
      <div style={{
        position: "absolute",
        left: `${(cx - starR * 5.2).toFixed(1)}px`, top: `${(cy - starR * 5.2).toFixed(1)}px`,
        width: `${(starR * 10.4).toFixed(1)}px`, height: `${(starR * 10.4).toFixed(1)}px`,
        borderRadius: "50%", opacity: wideA.toFixed(3),
        background: `radial-gradient(circle, ${rgbs(bead, 0.30)} 0%, ${rgbs(mix(bead, warm, 0.35), 0.13)} 26%, ${rgbs(warm, 0)} 62%)`,
      }} />
      <div style={{
        position: "absolute",
        left: `${(cx - starR * 2.4).toFixed(1)}px`, top: `${(cy - starR * 2.4).toFixed(1)}px`,
        width: `${(starR * 4.8).toFixed(1)}px`, height: `${(starR * 4.8).toFixed(1)}px`,
        borderRadius: "50%", opacity: bloomA.toFixed(3),
        background: `radial-gradient(circle, ${rgbs(bead, 0.95)} 0%, ${rgbs(bead, 0.55)} 20%, ${rgbs(mix(bead, warm, 0.5), 0.16)} 44%, ${rgbs(warm, 0)} 74%)`,
      }} />
    </div>
  );

  // Shock ring: the moment the light stops growing it throws one thin ring
  // outward. Not in the reference, but it is what carries the eye from "the
  // disc stopped" to "something is coming out of it" across the 3-4 frames
  // where nothing else has happened yet.
  const shP = seg(t, peakT - 0.04, 0.46);
  if (shock > 0 && shP > 0 && shP < 1) {
    const r = lerp(peakR * 0.80, peakR * 3.0, eOut(shP, 2.2));
    // Sine envelope, not a decay: the ring has to be born out of the disc's
    // own edge rather than snapping on at full strength one frame after the
    // peak, and it has to be gone before the strokes need the attention.
    const a = shock * Math.sin(Math.PI * Math.pow(shP, 0.8));
    els.push(
      <div key="shock" style={{
        position: "absolute",
        left: `${(cx - r).toFixed(1)}px`, top: `${(cy - r).toFixed(1)}px`,
        width: `${(r * 2).toFixed(1)}px`, height: `${(r * 2).toFixed(1)}px`,
        borderRadius: "50%", opacity: a.toFixed(3),
        // Fat and heavily blurred: a thin crisp ring reads as a lens artefact
        // stuck on in post, which is exactly the "generated" tell this beat
        // cannot afford. This is a pressure wave, not an outline.
        border: `${lerp(14, 4, eOut(shP, 1.5)).toFixed(2)}px solid ${rgbs(mix(bead, warm, 0.25))}`,
        filter: `blur(${lerp(10, 22, shP).toFixed(2)}px)`,
      }} />
    );
  }

  // The strokes. Everything is expressed against pathLength=100 so the two
  // halves ignite together regardless of their real arc length.
  if (drawP > 0) {
    const front = drawE * 100;
    const s0 = Math.max(0, front - hotLen);
    const hotSpan = front - s0;
    // Blur radii are UNIT-space: a CSS filter on a child of the scaled <g>
    // resolves in that <g>'s coordinates, so a value in stage px would end up
    // multiplied by k a second time and the glow would grow as markH squared.
    const blurRest = MARK.strokeW * 0.80;
    const blurFront = MARK.strokeW * 0.60;
    // The first frames of a round-capped dash are a full-width DOT. Fading the
    // stroke up over the first 7% of the draw hides that inside the bloom,
    // which is still at its brightest there.
    const strokeO = clamp01(drawP / 0.07) * outO;
    const frontA = frontGlow * Math.pow(1 - eIn(drawP, 3.2), 0.9);
    const paths = [MARK.left, MARK.right];
    const dashRest = { strokeDasharray: `${front.toFixed(2)} 200`, strokeDashoffset: "0" };
    const dashHot = { strokeDasharray: `${hotSpan.toFixed(2)} 200`, strokeDashoffset: `${(-s0).toFixed(2)}` };
    const common = { fill: "none", strokeLinecap: "round", pathLength: 100 };
    els.push(
      <svg key="arch" viewBox="0 0 1280 720" width="1280" height="720"
        style={{ position: "absolute", inset: 0 }}>
        <defs>
          {/* userSpaceOnUse resolves in the space of the element that
              REFERENCES the gradient — which is inside the translate+scale
              below, i.e. unit space. Stage-pixel coordinates here silently
              push both stops off the shape and the whole arch renders as the
              first stop's flat colour. */}
          {/* Warm holds a long plateau and violet only arrives at the feet —
              an even two-stop ramp across the whole mark reads as a stock
              coral-to-purple gradient rather than as this brand's pair. */}
          <linearGradient id={`${G}arch`} gradientUnits="userSpaceOnUse"
            x1="50" y1="10" x2="50" y2="90">
            <stop offset="0" stopColor={rgbs(mix(hot, warm, 0.80))} />
            <stop offset="0.28" stopColor={rgbs(warm)} />
            <stop offset="0.64" stopColor={rgbs(mix(warm, cool, 0.28))} />
            <stop offset="1" stopColor={rgbs(cool)} />
          </linearGradient>
        </defs>
        <g transform={`translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${k.toFixed(5)})`}
          style={{ opacity: strokeO }}>
          {/* residual bloom hugging the drawn part — this is the light that
              moved OUT of the star and into the strokes, so its opacity is the
              complement of the star's own decay. Kept tight and faint: blurred
              wide it stops reading as glow and becomes a grey smudge behind
              the mark. */}
          <g style={{ filter: `blur(${blurRest.toFixed(2)}px)`, opacity: (0.14 + 0.46 * (1 - eOut(settleP, 1.6))).toFixed(3) }}>
            {paths.map((d, i) => (
              <path key={i} d={d} {...common} strokeWidth={MARK.strokeW * 1.05}
                stroke={rgbs(mix(bead, warm, 0.45))} style={dashRest} />
            ))}
          </g>
          {paths.map((d, i) => (
            <path key={`r${i}`} d={d} {...common} strokeWidth={MARK.strokeW}
              stroke={`url(#${G}arch)`} style={dashRest} />
          ))}
          {/* the ignition front: a short hot segment riding the growing tip,
              blurred so it bleeds into the gradient it leaves behind */}
          {frontA > 0.01 && (
            <g style={{ filter: `blur(${blurFront.toFixed(2)}px)`, opacity: frontA.toFixed(3) }}>
              {paths.map((d, i) => (
                <path key={`h${i}`} d={d} {...common} strokeWidth={MARK.strokeW * 1.02}
                  stroke={rgbs(hot)} style={dashHot} />
              ))}
            </g>
          )}
        </g>
      </svg>
    );
  }

  // The bead itself — the same disc that was the star, never re-created.
  els.push(
    <div key="bead" style={{
      position: "absolute",
      left: `${(cx - starR).toFixed(2)}px`, top: `${(cy - starR).toFixed(2)}px`,
      width: `${(starR * 2).toFixed(2)}px`, height: `${(starR * 2).toFixed(2)}px`,
      borderRadius: "50%", background: rgbs(bead), opacity: born.toFixed(3),
      boxShadow: `0 0 ${(starR * 1.5).toFixed(1)}px ${rgbs(bead, 0.55 * energy)}`,
    }} />
  );

  // ── wordmark ────────────────────────────────────────────────────────────
  const kids = [];
  if (wordW > 0) {
    // A line box centres on the font's ascent/descent, not on the cap, so a
    // wordmark aligned to the mark's ink centre sits low by capMetrics.dy.
    const { cap, dy } = capMetrics(size);
    const wP = eOut(seg(t, T(wordAt), wordDur), 2.6);
    if (wP > 0.004) {
      kids.push(
        <div key="word" style={{
          position: "absolute", left: `${wordLeft.toFixed(1)}px`,
          top: `${(inkCy - size * 0.5).toFixed(1)}px`,
          transform: `translateY(${(dy + wordRise * (1 - wP)).toFixed(2)}px)`,
          opacity: wP.toFixed(3),
          fontFamily: ff, fontSize: `${size}px`, lineHeight: 1,
          letterSpacing: `${tracking}em`, whiteSpace: "pre", color: rgbs(word),
        }}>
          <span style={{ fontWeight: weightLight }}>{lightTxt}</span>
          <span style={{ fontWeight: weightBold }}>{boldTxt}</span>
        </div>
      );
    }
    if (tagline) {
      const tP = eOut(seg(t, T(wordAt) + 0.22, wordDur), 2.6);
      if (tP > 0.004) {
        kids.push(
          <div key="tag" style={{
            position: "absolute", left: `${wordLeft.toFixed(1)}px`,
            top: `${(inkCy + cap * 0.5 + size * taglineGap).toFixed(1)}px`,
            transform: `translateY(${(wordRise * 0.7 * (1 - tP)).toFixed(2)}px)`,
            opacity: (tP * 0.9).toFixed(3),
            fontFamily: ff, fontSize: `${taglineSize}px`, fontWeight: 400,
            letterSpacing: "0.04em", whiteSpace: "pre", color: rgbs(taglineColour),
          }}>{tagline}</div>
        );
      }
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: outO }}>
      {els}
      {kids}
    </div>
  );
}
