/**
 * effects.jsx — mem's text presets. Text only: no SVG accents, no glyphs.
 *
 * Every component is a PURE function of `t` (seconds, absolute on the
 * timeline). No CSS transitions, no keyframes, no requestAnimationFrame — the
 * renderer calls renderAtTime(t) for arbitrary t and screenshots, so anything
 * driven by wall clock would tear.
 *
 * All behaviour below was read off the reference frame by frame at 24-30fps.
 * Sampling at 2s intervals is what previously produced a wrong reading of the
 * copy itself.
 */

import React from "react";
import { at, clamp01, lerp, easeOut, easeIn, expoOut, memReveal, backOut, cubicBezier, rgb, mixRgb, settleDecay, easeByName } from "./easing.js";

// The settle slide is an asymmetric S: 50% of the distance by 40% of the time,
// peak velocity 2x mean at u=0.32, then a long tail. Symmetric ease-in-outs all
// miss it mid-curve by 8-15 points.
const SETTLE_EASE = cubicBezier(0.30, 0.0, 0.20, 1.0);
// CSS "ease" — measured on the second line of "Turn brain dumps": 50% of the
// travel by ~38% of the duration, with the last quarter covering only 8.6%.
const STANDARD_EASE = cubicBezier(0.25, 0.1, 0.25, 1.0);
import { C, FONT, STAGE } from "./theme.js";
import { videoRef, getVideoEl } from "./video-sources.js";

const centre = {
  position: "absolute", inset: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexDirection: "column",
};

// ─────────────────────────────────────────────────────────────────────────────
// Shimmer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A pale highlight travelling left→right across a run of characters.
 *
 * Measured on "mem" between 1.35s and 1.85s: the first `m` washes out first,
 * then the `e`, then the last `m`, while "Re" and "bering" hold constant. It
 * is a gloss sweep over the accent word only — the sort of detail that reads
 * as craft, and whose absence reads as flat.
 *
 * Returns highlight strength 0..1 for character `i` of `n`.
 */
function shimmerAt(t, sh, i, n) {
  if (!sh) return 0;
  const p = at(t, sh.start, sh.dur ?? 0.5);
  if (p <= 0 || p >= 1) return 0;
  const head = lerp(-1.2, n + 0.2, p); // travels from before the first glyph to past the last
  const d = i - head;
  const sigma = sh.width ?? 0.85;
  return Math.exp(-(d * d) / (2 * sigma * sigma)) * (sh.amount ?? 1);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * The opening line — "Re | mem | ber | ing | is | so".
 *
 * Measured frame by frame, and there is far more happening than a fade-in:
 *
 *   SCALE   the whole line ramps 1.83x -> 1.00x, LINEARLY (residuals under
 *           0.5%), over 1.168s, about a fixed point at frame-centre-x and
 *           y=176.5/360. It stops dead at 1.00 — no ease-out, no overshoot.
 *           What looks like the line drifting right is entirely this scale-down
 *           about the centre; there is no independent translation in that phase.
 *   ARRIVE  syllables appear at their FINAL layout position and fade up at
 *           their final colour. Letters inside a syllable arrive together —
 *           the reveal unit is the syllable, not the letter. Only the first
 *           group is blurred on entry.
 *   SETTLE  once the scale lands, the line slides left 34px on an asymmetric
 *           S-curve — roughly half the width " is so" added.
 *   EXIT    a dissolve front sweeps RIGHT to LEFT at ~450px/s while the whole
 *           line accelerates away leftward; letters fade AND blur as it passes.
 *
 * RISE (off, unless riseDy is set): each group additionally enters riseDy px
 * BELOW its rest position and settles up on a true exponential — measured on
 * the Comet film's "Connecting the dots" beat: every word first paints 21±0.5px
 * low (~0.52em at its type size) and the per-frame delta decays x0.85-0.88 at
 * 25fps (tau 0.25-0.29s, settled ~1.0-1.1s after onset). Fraction-complete
 * checkpoints for 'between': 50% at 0.2s, 77% at 0.48s, 85% at 0.72s — that is
 * settleDecay with dur ~1.05s, not a cubic. Exit lift (off, unless exitSlideDy
 * is set): words lift ACCELERATING while the dissolve front takes them,
 * staggered per group — measured on "Ask anything, anywhere.": per-frame deltas
 * 0.4, 2.3, 7.9, 16.6, 25.9px (ease-in), 33-61px of travel, ~80ms word lag,
 * exit-side word first.
 */
export function RevealLine({
  t, start, groups, size = 72, weight = 430,
  font = null,
  groupDur = 0.28, x = 0, y = 0,
  scaleFrom = 1.83, scaleDur = 1.168, scaleEase = null,
  slideAt = null, slideDx = -68, slideDur = 0.834,
  exitAt = null, exitSweep = 0.33, exitFade = 0.26,
  exitFrom = "right",
  exitSlideDx = -260, exitSlideDur = 0.55,
  exitSlideDy = 0, exitWordStagger = 0.08,
  riseDy = 0, riseDur = 1.05, riseEase = null,
  blurIn = 8, exitBlur = 16,
  highlight = [255, 252, 250],
}) {
  // Linear by default — the mem-measured slope is constant to within 0.5%.
  // scaleEase (e.g. "out") is for films whose lines settle decelerating
  // instead: Comet's interstitials measure ~1.09-1.11 -> 1.00 over ~1.15s with
  // the rate dying out, never a hard linear stop.
  const scaleP = clamp01(at(t, start, scaleDur));
  const scale = lerp(scaleFrom, 1, scaleEase ? easeByName(scaleEase)(scaleP) : scaleP);

  const settle = slideAt == null ? 0 : SETTLE_EASE(at(t, slideAt, slideDur));
  const flee = exitAt == null ? 0 : easeIn(at(t, exitAt, exitSlideDur), 2.2);
  const dx = slideDx * settle + exitSlideDx * flee;
  const nGroups = groups.length;

  // Flatten to characters so the exit front can sweep across them.
  const chars = [];
  groups.forEach((g, gi) => [...g.text].forEach((ch, ci) =>
    chars.push({ ch, g, gi, ci, n: g.text.length })));
  const N = chars.length;

  return (
    <div style={{ ...centre }}>
      <div style={{
        display: "flex", alignItems: "baseline", whiteSpace: "nowrap",
        transform: `translate(${(x + dx).toFixed(2)}px, ${y}px) scale(${scale.toFixed(4)})`,
        transformOrigin: "50% 50%",
      }}>
        {chars.map((c, i) => {
          const k = memReveal(at(t, c.g.at, c.g.dur ?? groupDur));
          // Exit front travels right -> left, ACCELERATING: it starts as a
          // per-letter sweep and ends with the remaining left half collapsing
          // together, because the global collapse catches up with the front.
          let gone = 0;
          if (exitAt != null) {
            const sweep = easeIn(at(t, exitAt, exitSweep), 1.6);
            // exitFrom picks which end dissolves first; "right" is the measured
            // mem behaviour, "left" mirrors it for films whose front runs the
            // other way.
            const d = exitFrom === "left"
              ? sweep * (N - 1) - i
              : i - (1 - sweep) * (N - 1);
            gone = memReveal(clamp01((d / Math.max(1, N * 0.18)) + 0.0001))
                 * memReveal(at(t, exitAt, exitFade + exitSweep));
          }
          const sh = shimmerAt(t, c.g.shimmer, c.ci, c.n);
          const base = c.g.colour ?? C.ink;
          const b = (c.g.blurIn ? blurIn * (1 - k) : 0) + exitBlur * gone;

          // Vertical channels are strictly opt-in: with riseDy and exitSlideDy
          // both absent no transform is emitted and the span is byte-identical
          // to the pre-rise renderer. `kinetic` is constant across the scene so
          // the display mode never flips mid-beat.
          const gRiseDy = c.g.riseDy ?? riseDy;
          const kinetic = gRiseDy !== 0 || (exitSlideDy !== 0 && exitAt != null);
          let dyPx = 0;
          if (kinetic) {
            if (gRiseDy !== 0) {
              const rDur = c.g.riseDur ?? riseDur;
              // Default is the measured exponential; a named ease rides an
              // eased ramp over rDur instead.
              const rem = riseEase
                ? 1 - easeByName(riseEase)(clamp01(at(t, c.g.at, rDur)))
                : settleDecay(t, c.g.at, rDur);
              dyPx += gRiseDy * rem;
            }
            if (exitSlideDy !== 0 && exitAt != null) {
              // Word order follows the dissolve front: the end that dissolves
              // first also lifts first.
              const order = exitFrom === "left" ? c.gi : nGroups - 1 - c.gi;
              dyPx += exitSlideDy * easeIn(at(t, exitAt + exitWordStagger * order, exitSlideDur), 2.2);
            }
          }

          return (
            <span
              key={i}
              style={{
                fontFamily: font ?? FONT,
                fontSize: `${size}px`,
                fontWeight: c.g.weight ?? weight,
                fontStyle: c.g.italic ? "italic" : "normal",
                color: rgb(sh > 0.002 ? mixRgb(base, highlight, sh) : base),
                opacity: clamp01(k) * (1 - clamp01(gone)),
                letterSpacing: "-0.02em",
                filter: b > 0.4 ? `blur(${b.toFixed(2)}px)` : "none",
                whiteSpace: "pre",
                // Transforms need a box; inline-block only when a vertical
                // channel is in play, so legacy configs keep inline spans.
                display: kinetic ? "inline-block" : undefined,
                transform: kinetic ? `translateY(${dyPx.toFixed(2)}px)` : undefined,
              }}
            >
              {c.ch}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * "yesterday" — measured frame-by-frame, and it works differently from how it
 * looks at a glance:
 *
 *   ENTRY   the word slides in FROM THE RIGHT at full size, heavily motion
 *           blurred, in coral. It does NOT scale up and it does NOT stagger
 *           per character — what looks like a character stagger is the word
 *           being clipped by the right frame edge as it travels in.
 *   COLOUR  a left→right sweep recolours it coral→navy over ~0.47s, ending
 *           just as the shrink gets under way. At 3.70s "yester" is navy while
 *           "day" is still coral.
 *   EXIT    it SHRINKS on an accelerating (ease-IN) curve about a fixed
 *           anchor, from 1.0 down to ~0.60, and is then cut mid-flight — it
 *           never reaches a rest size. The next beat picks that size up.
 *
 * There is no opacity fade at any point; the apparent lightening is motion
 * blur mixing with the white ground.
 */
export function WaveText({
  t, start, text,
  hot = C.salmon, to = C.ink,
  size = 292, weight = 500,
  slideFromPx = 470, slideDur = 0.60,
  sweepStart = 0.57, sweepDur = 0.47,
  shrinkStart = null, shrinkDur = 0.83, shrinkTo = 0.60,
  maxBlur = 26, uid = "wv",
}) {
  const chars = [...text];

  // Entry: pure horizontal translation, decelerating.
  const slideP = at(t, start, slideDur);
  const dx = lerp(slideFromPx, 0, easeOut(slideP));

  // Exit: accelerating shrink about the word's own centre.
  const scale = shrinkStart == null
    ? 1
    : lerp(1, shrinkTo, easeIn(at(t, shrinkStart, shrinkDur)));

  // Motion blur tracks how fast the word is actually moving: strong while it
  // slides in, and again as the shrink accelerates away at the end.
  const slideSpeed = 1 - easeOut(slideP);
  const shrinkSpeed = shrinkStart == null ? 0 : Math.pow(at(t, shrinkStart, shrinkDur), 3);
  const blur = maxBlur * Math.max(slideSpeed, shrinkSpeed * 0.75);

  return (
    <div style={{ ...centre }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id={`${uid}-b`} x="-60%" y="-40%" width="220%" height="180%">
            <feGaussianBlur stdDeviation={`${Math.max(0, blur).toFixed(2)} ${Math.max(0, blur * 0.18).toFixed(2)}`} />
          </filter>
        </defs>
      </svg>
      <div style={{
        display: "flex",
        transform: `translateX(${dx.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        transformOrigin: "50% 50%",
        whiteSpace: "nowrap",
        filter: blur > 0.4 ? `url(#${uid}-b)` : "none",
      }}>
        {chars.map((ch, i) => {
          // Colour sweep: each character crosses coral→navy in turn.
          const f = chars.length > 1 ? i / (chars.length - 1) : 0;
          const w = memReveal(at(t, start + sweepStart + f * sweepDur * 0.72, sweepDur * 0.34));
          return (
            <span
              key={i}
              style={{
                fontFamily: FONT,
                fontSize: `${size}px`,
                fontWeight: weight,
                letterSpacing: "-0.045em",
                color: rgb(mixRgb(hot, to, w)),
                whiteSpace: "pre",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The sentence marquee
// ─────────────────────────────────────────────────────────────────────────────

function motionOf(spec, p, dir) {
  if (!spec || spec === "cut") return { dx: 0, dy: 0, s: 1, o: 1 };
  // "in" is ACCELERATING — used by "new", whose exit sweeps along an arc with
  // angular velocity ramping from 1.4 to 4.9 deg/frame. Most exits decelerate;
  // this one does the opposite and it is what makes the pan feel driven.
  const e = spec.ease === "expo" ? expoOut(p)
          : spec.ease === "in"   ? easeIn(p, spec.easePow ?? 1.45)
          : spec.ease === "ease" ? STANDARD_EASE(p)
          : spec.ease === "out"    ? easeOut(p)
          : spec.ease === "quint"  ? 1 - Math.pow(1 - p, 5)
          : spec.ease === "inout"  ? (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
          : spec.ease === "linear" ? p
          : memReveal(p);
  // k is "distance still to travel" on entry, "distance already travelled" on exit.
  const k = dir === "in" ? 1 - e : e;
  return {
    dx: (spec.dx ?? 0) * k,
    dy: (spec.dy ?? 0) * k,
    // Blur tracks how fast the transform is still moving, so it clears as the
    // motion settles. The reference blurs "Meet" hard for its first 3 frames
    // and is sharp by the 5th; a sharp scale-in reads as a UI transition
    // rather than as camera motion.
    blur: (spec.blur ?? 0) * Math.pow(k, 1.4),
    // SCALE. A word does not simply appear at its final size: it can arrive
    // oversized and settle, which is how one beat hands its scale to the next
    // across a cut. Omitting this is what made the swaps read as flat popups.
    s: 1 + ((spec.scale ?? 1) - 1) * k,
    o: spec.fade === false ? 1 : (dir === "in" ? clamp01(e * 1.7) : 1 - clamp01(e)),
  };
}

/**
 * One phrase in mem's running sentence: "Meet / your / new / notes app /
 * second brain / thought partner".
 *
 * The beige stretch is NOT a series of independent slides — it is one sentence
 * assembling itself, and the transitions differ per phrase, which is most of
 * why it feels alive:
 *
 *   cut         appears and vanishes on a SINGLE frame, no crossfade
 *               ("Meet"→"your" at 5.28s is one frame, verified at 30fps)
 *   riseUp      rises into place from below
 *   fromRight   slides in from off the right edge
 *   slideLeft   exits off the left edge
 *   slideUpLeft exits up and to the left
 *
 * Words carry their own enter/exit so "second" can arrive from the right while
 * "brain" rises from below a beat later.
 */
export function WordBeat({
  t, from, to, words, size = 84, weight = 430, colour = C.ink,
  x = 0, y = 0, gap = 0.30, enter = "cut", exit = "cut",
  enterDur = 0.34, exitDur = 0.42, lineHeight = 1.08, stack = false,
}) {
  if (t < from - 0.001 || t > to + 0.8) return null;

  return (
    <div style={{ ...centre, transform: `translate(${x}px, ${y}px)` }}>
      <div style={{
        display: "flex",
        flexDirection: stack ? "column" : "row",
        alignItems: stack ? "center" : "baseline",
        gap: stack ? 0 : `${size * gap}px`,
        lineHeight,
        whiteSpace: "nowrap",
      }}>
        {words.map((w, i) => {
          const inSpec = w.enter ?? enter;
          const outSpec = w.exit ?? exit;
          const inAt = from + (w.delay ?? 0);
          const outAt = to + (w.exitDelay ?? 0);

          // A hard cut has no ramp: before its frame the word simply is not there.
          if ((inSpec === "cut" || !inSpec) && t < inAt) return null;
          if ((outSpec === "cut" || !outSpec) && t >= outAt) return null;

          const mi = motionOf(inSpec, at(t, inAt, w.enterDur ?? enterDur), "in");
          const mo = motionOf(outSpec, at(t, outAt, w.exitDur ?? exitDur), "out");
          const opacity = clamp01(mi.o) * clamp01(mo.o);
          if (opacity <= 0.004) return null;
          const scale = mi.s * mo.s;
          const blur = Math.max(mi.blur, mo.blur);

          return (
            <span
              key={i}
              style={{
                fontFamily: FONT,
                fontSize: `${w.size ?? size}px`,
                fontWeight: w.weight ?? weight,
                color: rgb(w.colour ?? colour),
                letterSpacing: "-0.022em",
                whiteSpace: "pre",
                opacity,
                transform: `translate(${mi.dx + mo.dx}px, ${mi.dy + mo.dy}px) scale(${scale.toFixed(4)})`,
                transformOrigin: "50% 50%",
                filter: blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : "none",
                display: "inline-block",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/** Centred copy, one or two lines. The workhorse for plain statements. */
export function Statement({
  t, start, dur = 0.6, lines, size = 74, weight = 400,
  colour = C.ink, lineStagger = 0.1, align = "center", lineHeight = 1.18,
  x = 0, y = 0,
}) {
  return (
    <div style={{ ...centre, transform: `translate(${x}px, ${y}px)` }}>
      {lines.map((line, i) => {
        const k = memReveal(at(t, start + i * lineStagger, dur));
        const spans = Array.isArray(line) ? line : [{ text: line }];
        return (
          <div key={i} style={{
            display: "flex", justifyContent: align, lineHeight,
            opacity: k, transform: `translateY(${(1 - k) * size * 0.16}px)`,
          }}>
            {spans.map((s, j) => (
              <span key={j} style={{
                fontFamily: FONT, fontSize: `${size}px`,
                fontWeight: s.weight ?? weight,
                color: rgb(s.colour ?? colour),
                letterSpacing: "-0.022em", whiteSpace: "pre",
              }}>
                {s.text}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Types on, with the colour ramp fitted to the LINE rather than to each
 * character.
 *
 * Measured: it is one horizontal gradient across the line's own bounding box —
 * black at the left, peak blue at u=0.69, peak salmon at u=0.85 — and the
 * gradient RE-FITS on every keystroke. So every glyph changes colour whenever a
 * new one lands, which is why it reads as "each character arrives hot and cools
 * as more text arrives". Modelling it per-character gets the cooling rate wrong.
 *
 * Base cadence is 1 char per 2 frames (15 char/s) with authored holds — a
 * 0.30s pause after "Tell Mem" — averaging 12.8 char/s. Characters just appear:
 * full size, full opacity, one frame, no pop or fade. The caret does NOT blink;
 * it is present every frame with a constant vertical blue-to-mauve gradient.
 *
 * PER-LETTER ENTRY (off by default — characters pop on, as above):
 *   letterRiseDy   each character lands riseDy px LOW and rises expo-out while
 *                  fading up. Measured on Comet's "Ask more" card: baseline
 *                  maxY 427 -> 391 (36px) in 0.24s, cadence 80-120ms/letter.
 *   letterFall     each character arrives from an (dx, dy) offset — the
 *                  letters-slide-in-from-the-left-and-fall grammar of the
 *                  birch end-card — settling over dur with a named ease.
 *                  {dx, dy, dur, ease, pow, stagger?, fade?}; stagger (s)
 *                  decouples the motion cadence from cps so a fully-typed line
 *                  can still fall in letter by letter.
 */
export function TypeOn({
  t, start, text, cps = 12.8, size = 274, weight = 430, font = null, italic = false,
  ramp = [[2, 2, 2], [2, 2, 2], [102, 138, 242], [180, 110, 190], [254, 94, 66]],
  stops = [0, 0.59, 0.69, 0.79, 0.90],
  caret = true, caretBlink = 0.53, caretDy = 0.055,
  letterRiseDy = 0, letterRiseDur = 0.24, letterFall = null,
  exitAt = null, exitDur = 0.434,
}) {
  const chars = [...text];
  const n = Math.max(0, Math.min(chars.length, Math.floor((t - start) * cps) + 1));
  if (n <= 0) return null;

  // Solid while keys are landing, then a slow pulse once the line is finished —
  // a caret that sits rock-still reads as a frozen frame rather than as waiting.
  // It must never unmount and never reach 0: the caret is a flex child, so
  // dropping it changes the row's width and visibly shifts the whole line.
  // Cosine, floored, so the box is always there. Pure in t, so it survives the
  // renderer visiting frames out of order.
  const done = n >= chars.length;
  const idle = done ? t - (start + chars.length / cps) : 0;
  const caretOn = done
    ? 0.28 + 0.72 * (0.5 + 0.5 * Math.cos((Math.PI * idle) / caretBlink))
    : 1;

  // Uniform scale about frame centre — the same exit curve mem reuses across
  // several beats, accelerating hard and cut mid-animation.
  const scale = exitAt == null ? 1 : 1 - 0.153 * Math.pow(clamp01(at(t, exitAt, exitDur)), 3.0);

  const colourAt = (u) => {
    for (let i = 0; i < stops.length - 1; i++) {
      if (u <= stops[i + 1]) {
        const f = (u - stops[i]) / Math.max(1e-6, stops[i + 1] - stops[i]);
        return mixRgb(ramp[i], ramp[i + 1], clamp01(f));
      }
    }
    return ramp[ramp.length - 1];
  };

  // The line is centred only while it FITS. Once it outgrows the frame the
  // reference keeps the caret near the right edge and lets the text run off to
  // the left — centring a 25-character line at this size would park the caret
  // off-screen and show the middle of the phrase instead of what is being
  // typed. Width is estimated from the glyph count since we cannot measure the
  // DOM from inside a pure render.
  const estWidth = n * 0.47 * size;
  const shift = Math.min(0, 460 - estWidth / 2);

  return (
    <div style={{ ...centre }}>
      <div style={{
        display: "flex", alignItems: "center", whiteSpace: "nowrap",
        transform: `translateX(${shift.toFixed(1)}px) scale(${scale.toFixed(4)})`,
        transformOrigin: "50% 50%",
      }}>
        {chars.slice(0, n).map((ch, i) => {
          // Per-letter entry motion. `kinetic` is constant for the scene, so
          // legacy configs emit exactly the old span (no transform, no opacity
          // key) and stay byte-identical.
          const kinetic = letterRiseDy !== 0 || letterFall != null;
          let ldx = 0, ldy = 0, lo = 1;
          if (kinetic) {
            if (letterRiseDy !== 0) {
              // landAt is when char i is typed: i < n  <=>  t >= start + i/cps.
              const e = expoOut(clamp01(at(t, start + i / cps, letterRiseDur)));
              ldy += letterRiseDy * (1 - e);
              lo *= e;
            }
            if (letterFall != null) {
              const fAt = start + i * (letterFall.stagger ?? 1 / cps);
              const e = easeByName(letterFall.ease ?? "back", letterFall.pow)(
                clamp01(at(t, fAt, letterFall.dur ?? 0.4)));
              ldx += (letterFall.dx ?? 0) * (1 - e);
              ldy += (letterFall.dy ?? 0) * (1 - e);
              if (letterFall.fade !== false) lo *= clamp01(e * 1.5);
            }
          }
          return (
            <span key={i} style={{
              fontFamily: font ?? FONT, fontSize: `${size}px`, fontWeight: weight,
              // undefined (not "normal") when off, so legacy DOM is unchanged.
              fontStyle: italic ? "italic" : undefined,
              color: rgb(colourAt(n > 1 ? i / (n - 1) : 1)),
              letterSpacing: "-0.03em", whiteSpace: "pre",
              display: kinetic ? "inline-block" : undefined,
              transform: kinetic ? `translate(${ldx.toFixed(2)}px, ${ldy.toFixed(2)}px)` : undefined,
              opacity: kinetic ? clamp01(lo) : undefined,
            }}>
              {ch}
            </span>
          );
        })}
        {caret && (
          <span style={{
            display: "inline-block",
            width: `${size * 0.073}px`, height: `${size * 1.88 * 0.34}px`,
            background: `linear-gradient(to bottom, ${rgb([101, 144, 248])}, ${rgb([159, 117, 148])})`,
            marginLeft: `${size * 0.055}px`,
            // Flex centres on the line box, which sits high against the caps —
            // nudge down so it reads centred on the glyphs.
            transform: `translateY(${(size * caretDy).toFixed(2)}px)`,
            opacity: caretOn,
          }} />
        )}
      </div>
    </div>
  );
}

/** Copy on a rounded tinted slab — "Zapier Integrations". */
export function Highlight({
  t, start, dur = 0.5, text, size = 80, weight = 400,
  colour = C.ink, slab = C.creamDeep, padX = 0.34, padY = 0.16,
}) {
  const open = expoOut(at(t, start, dur));
  return (
    <div style={{ ...centre }}>
      <div style={{
        padding: `${size * padY}px ${size * padX}px`,
        borderRadius: `${size * 0.16}px`,
        background: rgb(slab),
        transform: `scaleX(${lerp(0.72, 1, open)})`,
        opacity: clamp01(open * 1.4),
      }}>
        <span style={{
          fontFamily: FONT, fontSize: `${size}px`, fontWeight: weight,
          color: rgb(colour), letterSpacing: "-0.022em",
          opacity: memReveal(at(t, start + 0.12, dur)), display: "block", whiteSpace: "pre",
        }}>
          {text}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera over a static canvas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The beige stretch is NOT a series of phrases entering and leaving. The three
 * phrases sit at FIXED positions on one long canvas and a camera pans across
 * them. Verified by sub-pixel frame registration: subtract the camera and the
 * residual is flat to +-1px.
 *
 * So "second slides in from the right" and "notes rises up from below" are the
 * same single camera move, not two different text animations. Building them as
 * per-word slides — which is what I did first — cannot reproduce the way the
 * whole field moves together, and gets the relative positions wrong.
 *
 * Camera scale is exactly 1.000 until the final dolly-in at ~9.9s.
 */
export function PanCanvas({ t, keys, zoom = null, children }) {
  let cam = keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a.t && t < b.t) {
      const p = (t - a.t) / (b.t - a.t);
      const e = b.ease ? b.ease(p) : easeOut(p);
      cam = { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) };
      break;
    }
    if (t >= b.t) cam = b;
  }
  // Exit dolly: accelerating zoom, per-frame factor climbing 1.007 -> 1.096.
  const scale = zoom ? 1 + (zoom.to - 1) * easeIn(at(t, zoom.at, zoom.dur), 2.6) : 1;

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0,
        transform: `translate(640px, 360px) scale(${scale.toFixed(4)}) translate(${(-cam.x).toFixed(2)}px, ${(-cam.y).toFixed(2)}px)`,
        transformOrigin: "0 0",
      }}>
        {children}
      </div>
    </div>
  );
}

/**
 * A word pinned to the canvas that reveals by sliding up from behind a hard
 * clip line — an overflow:hidden box plus translateY. Measured: no fade, no
 * blur, no scale, and zero horizontal component. Travel is ~43px native (one
 * line box); the word is invisible until its top clears the clip, so only the
 * last ~30px of the move is ever on screen.
 */
export function ClipWord({
  t, at: revealAt, dur = 0.334, text, x, y,
  size = 86, weight = 430, colour = C.ink, easePow = 2.1, travel = 86,
}) {
  const p = clamp01(at(t, revealAt, dur));
  // Decelerating, no overshoot: R proportional to (t_end - t)^p.
  const remaining = Math.pow(1 - p, easePow);
  return (
    <div style={{
      position: "absolute", left: `${x}px`, top: `${y}px`,
      overflow: "hidden", height: `${size * 1.32}px`,
    }}>
      <span style={{
        display: "inline-block",
        fontFamily: FONT, fontSize: `${size}px`, fontWeight: weight,
        color: rgb(colour), letterSpacing: "-0.022em", whiteSpace: "pre",
        transform: `translateY(${(remaining * travel).toFixed(2)}px)`,
      }}>
        {text}
      </span>
    </div>
  );
}

/**
 * A placeholder standing in for a product shot.
 *
 * mem alternates kinetic type with footage of its own product. Those shots are
 * the parts to be swapped for the Kite 3D renders, so rather than imitate them
 * this reserves the slot: it keeps the cut rhythm and ground colour intact and
 * labels what belongs there, so the swap is a straight substitution.
 */
export function ProductSlot({
  t, from, to, label = "product demonstration", index = null,
  bg = C.greyWarm, ink = null, videoKey = null, watermark = null,
}) {
  // Pick a legible label colour from the ground rather than assuming a light
  // background — a dark scene would otherwise render an invisible placeholder.
  const lum = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];
  ink = ink ?? (lum < 128 ? [238, 236, 244] : C.ink);
  const inK = memReveal(at(t, from, 0.18));
  const outK = memReveal(at(t, to - 0.18, 0.18));
  const o = clamp01(inK) * (1 - clamp01(outK));
  if (o <= 0.004) return null;
  const secs = (to - from).toFixed(1);

  return (
    <div style={{
      position: "absolute", inset: 0, background: rgb(bg), opacity: o,
      display: "flex", alignItems: "center", justifyContent: "center",
      // Only when footage fills the slot — an empty slot must lay out exactly
      // as it always has, clipping included.
      ...(videoKey ? { overflow: "hidden" } : null),
    }}>
      {/* A slot carrying `src` IS the footage: the reserved space is filled
          rather than described, and the dashed placeholder is suppressed. */}
      {videoKey && getVideoEl(videoKey) && (
        <div ref={videoRef(videoKey)} style={{
          position: "absolute", inset: 0,
          // A <video> is composited on its own layer, and an ancestor's
          // overflow:hidden clips that layer at integer precision — which
          // leaves a ~2px square notch at each rounded corner. Rounding the
          // video's OWN container (and the element, below) makes the
          // compositor round the layer itself, so the corner is clean.
          borderRadius: "inherit", overflow: "hidden",
        }} />
      )}
      {/* A full-frame slot is 720 tall, so the bug's fractions resolve against
          the frame — the same physical size it has in a floating window. */}
      <WindowMark mark={watermark} H={720} />
      {label != null && (
      <div style={{
        border: `2px dashed ${rgb(mixRgb(bg, ink, 0.28))}`,
        borderRadius: 18,
        padding: "56px 84px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        <span style={{
          fontFamily: FONT, fontSize: 58, fontWeight: 450,
          color: rgb(mixRgb(bg, ink, 0.86)), letterSpacing: "-0.02em",
        }}>
          [ {label} ]
        </span>
        <span style={{
          fontFamily: FONT, fontSize: 24, fontWeight: 400,
          color: rgb(mixRgb(bg, ink, 0.45)), letterSpacing: "0.04em",
        }}>
          {index != null ? `slot ${index} · ` : ""}{from.toFixed(1)}s – {to.toFixed(1)}s · {secs}s
        </span>
      </div>
      )}
    </div>
  );
}

/**
 * A framed media window whose position, size, scale and opacity are pure
 * functions of t via measured keypoints — the animated counterpart of
 * ProductSlot, for films whose UI windows are themselves choreographed.
 *
 * Measured off the Comet launch film's product windows, which a static slot
 * cannot express:
 *   maps window   rises from the bottom edge on a fast-attack expo (top edge
 *                 719 -> 32 in ~0.5s, peak ~3150px/s), holds at
 *                 [202,32,1147,714], punches to full-bleed in 0.28s
 *                 (ease-in-out), holds DEAD FLAT (sidebar edge 748.31±0.11px
 *                 over 3.7s), pulls back to the same home rect within 1px,
 *                 freezes for 3.0s, fades in place.
 *   slack window  flies in from the right edge (left edge 1228 -> 260,
 *                 peak 4850px/s, ease-in-out, blurred), then a two-phase
 *                 punch-in to full-bleed.
 * Those become key lists here; interiors stay placeholder — footage is
 * composited later with the same transforms.
 *
 * Keys are sparse: omitted channels inherit the previous key's value, so a
 * hold is two keys with nothing changed between them (byte-still, as
 * measured), and a fade-out is a key that only moves `opacity`. Interpolation
 * into key k uses k.ease (default "inout" — the measured punch shape).
 *
 * `shadow` is true (the measured default drop shadow, which scales with the
 * window's height), false (none), or an object for the cases where the film
 * shows the window's EDGE inside the frame and the shadow has to read to the
 * side as well as below: {dx, dy, blur, spread, colour, alpha, scaleWithH}.
 * Omitted fields fall back to the default shadow's values, so `shadow:{}` and
 * `shadow:true` render identically.
 */
/**
 * A corner bug drawn INSIDE a window, so it is clipped by the live radius,
 * rides every keyframed move and blurs with the window rather than floating on
 * the frame. Sizes and insets are FRACTIONS of the window's live height by
 * default, which is what keeps it reading as part of the picture through a
 * punch to full-bleed; scaleWithH:false pins it in absolute px instead.
 *
 * Pure in t: everything it draws comes from the already-resolved window rect.
 * Returns null when unset, so a window without one lays out exactly as before.
 *
 * Two ways to say whose product this is:
 *
 *   `src`   the brand's own logo, as an image asset. Different mark, different
 *           colours, different letterforms per company.
 *   `text`  a TYPESET wordmark drawn by the engine — one house treatment every
 *           clip shares, so the bug reads as the film's furniture rather than
 *           as five different companies' stationery. Needs no asset, and a
 *           product with no usable logo file still gets attributed.
 *
 * Both together is the real-world lockup: mark then wordmark, on one chip.
 * A `src`-only mark renders EXACTLY the element it always did (the early
 * return below), so configs written against the image-only version are
 * untouched by this.
 *
 * WHERE it sits is `anchor` — "bottom-right" (the default, and what every
 * config written before this said implicitly) through "top-center", the
 * treatment a big translucent watermark wants: horizontally centred on the
 * picture, so the eye stays on the middle of the frame instead of being pulled
 * into a corner. The margins keep their meaning on whichever edges the anchor
 * names, and a centred axis ignores its margin.
 *
 * `clamp` (default false — off, so nothing already rendered moves) keeps the
 * bug inside the FRAME when the window it lives in does not fit there. Three
 * of this film's windows are deliberately larger than 1280x720 at some point:
 * the maps window punches to 1274x908 centred at y=244, which puts its top
 * edge 210px above the picture for 3.7s, and a top-anchored bug measured from
 * that edge would spend the whole punch off-screen. Clamped, the bug slides
 * only as far as the top of the VISIBLE picture and stops — which is where a
 * viewer reads a watermark as being anyway. `top` is the window's top edge in
 * frame coordinates, supplied by the caller because only the caller knows it.
 *
 * `drop` replaces the built-in soft shadow: false for none, an object, or an
 * ARRAY of objects stacked into one filter. A bare mark (no chip) has to carry
 * its own separation, and which way it needs to separate follows the mark's own
 * ink: a dark wordmark over dark footage needs a light halo, a light one over a
 * light panel needs a dark halo. Omitted = the measured default drop, so the
 * chip-carrying configs are byte-identical.
 */
function WindowMark({ mark, H, top = 0 }) {
  if (!mark || (!mark.src && !mark.text)) return null;
  const rel = mark.scaleWithH !== false;
  const unit = rel ? H : 720;
  const mh = (mark.h ?? 0.052) * unit;
  const mx = (mark.marginX ?? mark.margin ?? 0.034) * unit;
  const my = (mark.marginY ?? mark.margin ?? 0.034) * unit;
  if (mh < 0.5) return null;
  // Separation under either style: it keeps the bug's edge off a busy picture
  // without darkening the footage around it, which a plate alone cannot do once
  // the footage under the plate is itself light — and which is the ONLY thing
  // holding a bare, plateless mark apart from its ground.
  const drop = (() => {
    const spec = mark.drop;
    if (spec === undefined || spec === true) {
      return `drop-shadow(0 ${(mh * 0.06).toFixed(2)}px ${(mh * 0.16).toFixed(2)}px rgba(0,0,0,0.38))`;
    }
    if (spec === false || spec === null) return "none";
    const one = (d) => {
      const c = (d.colour ?? [0, 0, 0]).map((v) => Math.round(v)).join(", ");
      return `drop-shadow(${((d.dx ?? 0) * mh).toFixed(2)}px ${((d.dy ?? 0.06) * mh).toFixed(2)}px `
        + `${((d.blur ?? 0.16) * mh).toFixed(2)}px rgba(${c}, ${(d.alpha ?? 0.38).toFixed(3)}))`;
    };
    return (Array.isArray(spec) ? spec : [spec]).map(one).join(" ");
  })();

  // Anchor -> the two offsets and the transform that recentres a centred axis.
  // "bottom-right" resolves to exactly the right/bottom pair the bug has always
  // used, with no transform, so the default path is unchanged.
  const anchor = mark.anchor ?? "bottom-right";
  const vert = anchor.startsWith("top") ? "top" : anchor.startsWith("bottom") ? "bottom" : "middle";
  const horz = anchor.endsWith("left") ? "left" : anchor.endsWith("right") ? "right" : "centre";
  const place = {};
  const shift = [];
  if (vert === "top") {
    // Clamped: never above `inset` px from the top of the frame, whatever the
    // window is doing. `top` is 0 for a full-frame slot, so this is a no-op there.
    place.top = `${(mark.clamp ? Math.max(my, my - top) : my).toFixed(2)}px`;
  } else if (vert === "bottom") {
    place.bottom = `${my.toFixed(2)}px`;
  } else {
    place.top = "50%"; shift.push("translateY(-50%)");
  }
  if (horz === "left") place.left = `${mx.toFixed(2)}px`;
  else if (horz === "right") place.right = `${mx.toFixed(2)}px`;
  else { place.left = "50%"; shift.push("translateX(-50%)"); }
  const shiftStyle = shift.length ? { transform: shift.join(" ") } : null;

  if (!mark.text) {
    return (
      <img src={mark.src} alt="" style={{
        position: "absolute",
        ...place, ...shiftStyle,
        height: `${mh.toFixed(2)}px`, width: "auto",
        opacity: mark.opacity ?? 1,
        // A chipped asset brings its own ground and only wants the soft drop; a
        // bare one is read straight against the footage and wants whatever
        // `drop` says, which is usually a rim on both polarities.
        filter: drop,
        pointerEvents: "none",
      }} />
    );
  }

  // Typeset path. `h` is the CHIP height, so a text bug and an image bug given
  // the same `h` occupy the same band — which is the whole point of being able
  // to compare the two styles on the same cut.
  const plate = mark.plate === false ? null : (typeof mark.plate === "object" ? mark.plate : {});
  const ink = mark.colour ?? [255, 255, 255];
  const fs = mh * (mark.textScale ?? 0.46);
  const padX = plate ? mh * (plate.padX ?? 0.42) : 0;
  const gap = mark.src ? mh * 0.2 : 0;

  return (
    <div style={{
      position: "absolute",
      ...place, ...shiftStyle,
      height: `${mh.toFixed(2)}px`,
      display: "flex", alignItems: "center", gap: `${gap.toFixed(2)}px`,
      padding: `0 ${padX.toFixed(2)}px`,
      borderRadius: `${(mh * (plate ? (plate.radius ?? 0.28) : 0)).toFixed(2)}px`,
      background: plate
        ? `rgba(${(plate.colour ?? [10, 12, 18]).map((v) => Math.round(v)).join(", ")}, ${(plate.alpha ?? 0.55).toFixed(3)})`
        : "none",
      opacity: mark.opacity ?? 1,
      filter: drop,
      pointerEvents: "none",
      whiteSpace: "nowrap",
    }}>
      {mark.src && (
        <img src={mark.src} alt="" style={{ height: `${(mh * 0.58).toFixed(2)}px`, width: "auto", display: "block" }} />
      )}
      <span style={{
        fontFamily: mark.font ?? FONT,
        fontSize: `${fs.toFixed(2)}px`,
        fontWeight: mark.weight ?? 650,
        letterSpacing: `${(mark.tracking ?? 0.06).toFixed(3)}em`,
        // The tracking above adds a trailing space after the last glyph, which
        // reads as a lopsided chip at this size. Pull it back.
        marginRight: `${(-fs * (mark.tracking ?? 0.06)).toFixed(2)}px`,
        color: rgb(ink),
        lineHeight: 1,
      }}>
        {mark.text}
      </span>
    </div>
  );
}

export function MediaWindow({
  t, from, to, keys = [],
  w = 946, h = 683, radius = 14,
  face = [248, 246, 243], ink = null, shadow = true,
  label = null, index = null, videoKey = null, watermark = null,
  interior = null,
}) {
  if (t < from - 0.001 || t > to + 0.001) return null;

  // Resolve sparse keys into dense ones (each channel inherits backwards).
  const base = { t: from, x: 640, y: 360, w, h, scale: 1, opacity: 1, blur: 0, radius, shadowAlpha: 1 };
  const dense = [];
  let prev = base;
  for (const k of keys) {
    const nk = {
      t: k.t,
      x: k.x ?? prev.x, y: k.y ?? prev.y,
      w: k.w ?? prev.w, h: k.h ?? prev.h,
      scale: k.scale ?? prev.scale, opacity: k.opacity ?? prev.opacity,
      blur: k.blur ?? prev.blur, radius: k.radius ?? prev.radius,
      shadowAlpha: k.shadowAlpha ?? prev.shadowAlpha,
      ease: k.ease, pow: k.pow,
    };
    dense.push(nk);
    prev = nk;
  }

  let cur = base;
  if (dense.length) {
    cur = dense[dense.length - 1];
    if (t <= dense[0].t) cur = dense[0];
    else {
      for (let i = 0; i < dense.length - 1; i++) {
        const a = dense[i], b = dense[i + 1];
        if (t >= a.t && t < b.t) {
          const p = (t - a.t) / Math.max(1e-6, b.t - a.t);
          const e = easeByName(b.ease ?? "inout", b.pow, easeInOutCubic)(p);
          cur = {
            x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e),
            w: lerp(a.w, b.w, e), h: lerp(a.h, b.h, e),
            scale: lerp(a.scale, b.scale, e), opacity: lerp(a.opacity, b.opacity, e),
            blur: lerp(a.blur, b.blur, e), radius: lerp(a.radius, b.radius, e),
            shadowAlpha: lerp(a.shadowAlpha, b.shadowAlpha, e),
          };
          break;
        }
      }
    }
  }

  const o = clamp01(cur.opacity);
  if (o <= 0.004) return null;
  const W = cur.w * cur.scale, H = cur.h * cur.scale;
  if (W < 1 || H < 1) return null;

  const lum = 0.299 * face[0] + 0.587 * face[1] + 0.114 * face[2];
  const inkC = ink ?? (lum < 128 ? [238, 236, 244] : C.ink);
  const secs = (to - from).toFixed(1);

  // The default is height-relative (a big window casts a bigger shadow); an
  // object may pin absolute px instead via scaleWithH:false, which is what the
  // edge-of-UI shots need — there the shadow must not shrink with the zoom.
  const boxShadow = (() => {
    if (!shadow) return "none";
    const cfg = typeof shadow === "object" ? shadow : {};
    const rel = cfg.scaleWithH !== false;
    const unit = rel ? H : 720;
    const dx = (cfg.dx ?? 0) * (rel ? unit / 720 : 1);
    const dy = (cfg.dy != null ? cfg.dy * (rel ? unit / 720 : 1) : unit * 0.026);
    const bl = (cfg.blur != null ? cfg.blur * (rel ? unit / 720 : 1) : unit * 0.09);
    const sp = (cfg.spread ?? 0) * (rel ? unit / 720 : 1);
    const col = cfg.colour ?? [12, 12, 20];
    // Keyed `shadowAlpha` (default 1, so untouched configs are unaffected) scales
    // the drop shadow WITHOUT touching the face. Needed when one window hands over
    // to another that shares its rect: both shadows would otherwise stack and the
    // edge darkens, then snaps back when the outgoing scene ends. Ramping the
    // outgoing window's shadowAlpha to 0 as the incoming one fades in keeps the
    // pair reading as the single window the reference shows.
    const a = (cfg.alpha ?? 0.30) * clamp01(cur.shadowAlpha ?? 1);
    return `${dx.toFixed(1)}px ${dy.toFixed(1)}px ${bl.toFixed(1)}px ${sp.toFixed(1)}px `
      + `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${a})`;
  })();

  return (
    <div style={{
      position: "absolute",
      left: `${(cur.x - W / 2).toFixed(2)}px`, top: `${(cur.y - H / 2).toFixed(2)}px`,
      width: `${W.toFixed(2)}px`, height: `${H.toFixed(2)}px`,
      borderRadius: `${cur.radius.toFixed(2)}px`,
      background: rgb(face),
      opacity: o,
      overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow,
      filter: cur.blur > 0.4 ? `blur(${cur.blur.toFixed(2)}px)` : "none",
    }}>
      {/* Footage layer. The <video> is a persistent element adopted here, so it
          inherits the window's overflow:hidden (clipped by the live radius) and
          sits under the same shadow — it tracks every keyframed move for free.
          Seeked by prepareVideos before the frame is drawn, never played. */}
      {videoKey && getVideoEl(videoKey) && (
        <div ref={videoRef(videoKey)} style={{
          position: "absolute", inset: 0,
          // A <video> is composited on its own layer, and an ancestor's
          // overflow:hidden clips that layer at integer precision — which
          // leaves a ~2px square notch at each rounded corner. Rounding the
          // video's OWN container (and the element, below) makes the
          // compositor round the layer itself, so the corner is clean.
          borderRadius: "inherit", overflow: "hidden",
        }} />
      )}
      {/* DRAWN interior — a stylised UI comp instead of footage, authored in a
          full 1280x720 design space and scaled onto the window's live rect. It
          lives inside the same clip as `src` footage would, so it rides every
          key (glide, punch to full-bleed, pull-back) and is cut by the live
          radius. Scaled per axis so it fills the rect exactly whatever the
          window's aspect; a 16:9 window's two factors differ by ~0.1%. Null for
          every config that does not ask for one, which is all of the old ones. */}
      {interior && (
        <div style={{
          position: "absolute", left: 0, top: 0,
          width: `${STAGE.w}px`, height: `${STAGE.h}px`,
          transform: `scale(${(W / STAGE.w).toFixed(5)}, ${(H / STAGE.h).toFixed(5)})`,
          transformOrigin: "0 0",
        }}>
          {interior}
        </div>
      )}
      {/* Corner bug, over the footage and under nothing — inside the same
          clip, so it travels with the window instead of sitting on the frame.
          `top` is this window's top edge in FRAME coordinates: a clamped mark
          needs it to know how much of the window is above the picture. */}
      <WindowMark mark={watermark} H={H} top={cur.y - H / 2} />
      {label != null && (
        <div style={{
          border: `2px dashed ${rgb(mixRgb(face, inkC, 0.28))}`,
          borderRadius: Math.max(6, H * 0.026),
          padding: `${(H * 0.055).toFixed(0)}px ${(H * 0.11).toFixed(0)}px`,
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: Math.max(4, H * 0.018),
        }}>
          <span style={{
            fontFamily: FONT, fontSize: Math.max(11, H * 0.062), fontWeight: 450,
            color: rgb(mixRgb(face, inkC, 0.86)), letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
          }}>
            [ {label} ]
          </span>
          <span style={{
            fontFamily: FONT, fontSize: Math.max(9, H * 0.028), fontWeight: 400,
            color: rgb(mixRgb(face, inkC, 0.45)), letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}>
            {index != null ? `slot ${index} · ` : ""}{from.toFixed(1)}s – {to.toFixed(1)}s · {secs}s
          </span>
        </div>
      )}
    </div>
  );
}

// Local cubic in-out for MediaWindow's default segment ease (the measured
// punch shape: slow-fast-slow, never linear).
const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/**
 * A mouse pointer that drives a UI beat — travels in from off-frame, lands on a
 * control, presses it, and leaves.
 *
 * Why it exists: a button that fires on its own reads as the film animating
 * itself. A button that fires because something PRESSED it reads as a person
 * using the product, which is what a demo is. The engine already owns every
 * other kind of arrival (windows flying in from the right edge, orbs rolling
 * off the top), so this borrows their grammar rather than inventing one: the
 * SAME sparse key list as MediaWindow, resolved by the SAME easeByName family
 * ('in'+pow to accelerate off an edge, 'out'/'expo'/'quint' to arrive with no
 * velocity left), and the same default 'inout' between keys.
 *
 * Pure in t. Everything — position, the press, the glyph — is read off the key
 * lists for the sampled t, so renderAtTime may be called in any order.
 *
 *   keys    [{atMs, x, y, scale, opacity, rotDeg, ease, pow}] — (x,y) is the
 *           pointer's TIP in stage px, which is the only point a viewer reads
 *           as "where the mouse is". Channels are sparse and inherit backwards
 *           exactly as MediaWindow's do, so a hold is two keys with nothing
 *           changed between them.
 *   press   [{atMs, amount}] 0..1, linear between keys — 1 is fully pressed.
 *           The dip is a SCALE about the tip plus a small shove along the
 *           pointer's own axis: the tip stays exactly on the control (a dip
 *           that moves the tip reads as the mouse slipping), and what the eye
 *           sees is the hand's weight going into the click. The control's own
 *           reaction (a flash, a fill change) stays where it belongs — in the
 *           control — so the two are authored independently and can be nudged
 *           a frame apart until the press reads as the CAUSE.
 *
 * The glyph is drawn here rather than loaded: an inline path is one less asset
 * to gate on, recolours per film, and keeps the whole beat a function of t.
 * Proportions are the standard arrow (45-degree right edge, notched tail).
 */
const POINTER_PATH = "M0 0 L0 16.8 L4.05 12.9 L6.55 18.95 L9.15 17.85 L6.7 11.9 L11.85 11.9 Z";
// Glyph box in path units, padded for the stroke; the TIP is the path's origin.
const POINTER_VB = { x: -1.4, y: -1.4, w: 14.6, h: 21.8 };

export function PointerCursor({
  t, from, to,
  keys = [], press = [],
  size = 36,
  pressDip = 0.16, pressDx = 2.6, pressDy = 2.6,
  fill = [255, 255, 255], stroke = [24, 26, 28], strokeWidth = 1.5,
  shadowAlpha = 0.34,
}) {
  if (t < from - 0.001 || t > to + 0.001) return null;
  if (!keys.length) return null;

  // Sparse keys, resolved exactly as MediaWindow resolves its own.
  const base = { t: from, x: 640, y: 360, scale: 1, opacity: 1, rotDeg: 0 };
  const dense = [];
  let prev = base;
  for (const k of keys) {
    prev = {
      t: k.t,
      x: k.x ?? prev.x, y: k.y ?? prev.y,
      scale: k.scale ?? prev.scale, opacity: k.opacity ?? prev.opacity,
      rotDeg: k.rotDeg ?? prev.rotDeg,
      ease: k.ease, pow: k.pow,
    };
    dense.push(prev);
  }
  let cur = dense[dense.length - 1];
  if (t <= dense[0].t) cur = dense[0];
  else {
    for (let i = 0; i < dense.length - 1; i++) {
      const a = dense[i], b = dense[i + 1];
      if (t >= a.t && t < b.t) {
        const e = easeByName(b.ease ?? "inout", b.pow, easeInOutCubic)(
          (t - a.t) / Math.max(1e-6, b.t - a.t));
        cur = {
          x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e),
          scale: lerp(a.scale, b.scale, e), opacity: lerp(a.opacity, b.opacity, e),
          rotDeg: lerp(a.rotDeg, b.rotDeg, e),
        };
        break;
      }
    }
  }
  const o = clamp01(cur.opacity);
  if (o <= 0.004) return null;

  // Press depth: linear between keys, held flat outside them. Linear on purpose
  // — a click is a mechanical travel, and easing it makes the dip read as a
  // squash rather than as a button going down.
  let p = 0;
  if (press.length) {
    p = t <= press[0].t ? (press[0].amount ?? 0)
      : t >= press[press.length - 1].t ? (press[press.length - 1].amount ?? 0)
      : 0;
    for (let i = 0; i < press.length - 1; i++) {
      const a = press[i], b = press[i + 1];
      if (t >= a.t && t < b.t) {
        p = lerp(a.amount ?? 0, b.amount ?? 0, (t - a.t) / Math.max(1e-6, b.t - a.t));
        break;
      }
    }
  }
  p = clamp01(p);

  const S = size / POINTER_VB.h;                 // path units -> stage px
  const W = POINTER_VB.w * S, H = POINTER_VB.h * S;
  const tipX = -POINTER_VB.x * S, tipY = -POINTER_VB.y * S;
  const sc = cur.scale * (1 - pressDip * p);

  return (
    <div style={{
      position: "absolute",
      left: `${(cur.x - tipX).toFixed(2)}px`, top: `${(cur.y - tipY).toFixed(2)}px`,
      width: `${W.toFixed(2)}px`, height: `${H.toFixed(2)}px`,
      opacity: o,
      // Origin is the TIP, so the press scale pivots on the pixel the pointer
      // is actually touching and the contact point never moves.
      transformOrigin: `${tipX.toFixed(2)}px ${tipY.toFixed(2)}px`,
      transform: `translate(${(pressDx * p).toFixed(2)}px, ${(pressDy * p).toFixed(2)}px) `
        + `rotate(${cur.rotDeg.toFixed(2)}deg) scale(${sc.toFixed(4)})`,
      filter: shadowAlpha > 0
        ? `drop-shadow(0 ${(size * 0.05).toFixed(2)}px ${(size * 0.085).toFixed(2)}px rgba(0,0,0,${shadowAlpha}))`
        : "none",
      pointerEvents: "none",
    }}>
      <svg width={W} height={H}
        viewBox={`${POINTER_VB.x} ${POINTER_VB.y} ${POINTER_VB.w} ${POINTER_VB.h}`}
        style={{ display: "block", overflow: "visible" }}>
        <path d={POINTER_PATH} fill={rgb(fill)}
          stroke={rgb(stroke)} strokeWidth={strokeWidth}
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * A line whose fill is crossed once by a travelling two-colour wave, then
 * scaled away.
 *
 * Measured on "Capture anything": the text sits pure black and stationary,
 * then a wave runs left→right at ~66px/frame (crossing the 246px phrase in
 * about 4 frames), and at any fixed x the colour cycles
 *   black → red (#DD5953) → blue (#7185DB) → black
 * over ~10 frames / 333ms. Critically it is a CONTINUOUS GRADIENT, not a
 * per-character effect — a luma profile across the phrase is a smooth ramp
 * that crosses glyph boundaries without steps.
 *
 * The exit is a uniform scale-down about frame centre, 1.00 → 0.543 in 434ms,
 * on a very strong ease-IN: only ~5% of the change happens in the first third
 * and 67% in the last quarter. It is cut mid-flight.
 */
export function SweepText({
  t, from, text, size = 68, weight = 430,
  base = [0, 0, 0], hot = [221, 89, 83], cool = [113, 133, 219],
  sweepAt, crossDur = 0.124, cycleDur = 0.334,
  exitAt = null, exitDur = 0.434, exitScale = 0.543, exitPow = 3.5,
  scaleFrom = 1, scaleDur = 0.2, permanent = false,
  x = 0, y = 0, cx = null, baseline = null,
}) {
  const chars = [...text];
  const n = chars.length;

  const grow = lerp(scaleFrom, 1, expoOut(clamp01(at(t, from, scaleDur))));
  const shrink = exitAt == null ? 1 : lerp(1, exitScale, Math.pow(clamp01(at(t, exitAt, exitDur)), exitPow));
  const scale = grow * shrink;

  const colourAt = (i) => {
    if (sweepAt == null) return base;
    const f = n > 1 ? i / (n - 1) : 0;
    const phase = (t - (sweepAt + f * crossDur)) / cycleDur;
    // A permanent wipe (e.g. "Mem" going navy -> orange for good) settles on
    // `cool` instead of cycling back to `base`.
    if (phase <= 0) return base;
    if (phase >= 1) return permanent ? cool : base;
    if (permanent) return mixRgb(base, cool, clamp01(phase / 0.55));
    // black -> red -> blue -> black, timed off the measured peaks
    if (phase < 0.30) return mixRgb(base, hot, phase / 0.30);
    if (phase < 0.55) return mixRgb(hot, cool, (phase - 0.30) / 0.25);
    return mixRgb(cool, base, (phase - 0.55) / 0.45);
  };

  const placed = cx != null && baseline != null;
  const outer = placed
    ? { position: "absolute", left: `${cx}px`, top: `${baseline}px`,
        transform: `translate(-50%, -100%)`, whiteSpace: "nowrap" }
    : { ...centre, transform: `translate(${x}px, ${y}px)` };

  return (
    <div style={outer}>
      <div style={{
        display: "flex", whiteSpace: "nowrap",
        transform: `scale(${scale.toFixed(4)})`,
        transformOrigin: placed ? "50% 100%" : "50% 50%",
      }}>
        {chars.map((ch, i) => (
          <span key={i} style={{
            fontFamily: FONT, fontSize: `${size}px`, fontWeight: weight,
            color: rgb(colourAt(i)), letterSpacing: "-0.022em", whiteSpace: "pre",
          }}>
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A word pinned by its centre-x and baseline, with independent entry, hold,
 * mid-beat slide and exit.
 *
 * Needed because from 41s on mem stops centring things: words sit at their own
 * coordinates and at their OWN SIZES (measured: "everything" is 0.81x its
 * neighbours, "with" is 1.06x), reflow sideways to make room for the next
 * word, and exit by scaling rather than fading. None of that fits a flex row.
 *
 * All positions are stage px (1280x720), i.e. native 640x360 doubled.
 */
export function FadeWord({
  t, from, to, text, cx, baseline, size = 100, weight = 430, colour = C.ink,
  enter = null, exit = null, slide = null, rise = null, blurIn = 0, blurOut = 0, glow = null,
  font = null, italic = false,
}) {
  if (t < from - 0.001 || t > to + 0.001) return null;

  // Entry: opacity, optional scale, optional offset.
  let o = 1, s = 1, dx = 0, dy = 0, blur = 0;
  if (enter) {
    const p = clamp01(at(t, from + (enter.delay ?? 0), enter.dur ?? 0.3));
    const e = enter.ease === "linear" ? p
            : enter.ease === "expo" ? expoOut(p)
            : enter.ease === "pow" ? 1 - Math.pow(1 - p, enter.pow ?? 2.5)
            : memReveal(p);
    o *= enter.fade === false ? 1 : clamp01(enter.from0 === false ? 0.3 + e * 0.7 : e);
    s *= 1 + ((enter.scale ?? 1) - 1) * (1 - e);
    dx += (enter.dx ?? 0) * (1 - e);
    dy += (enter.dy ?? 0) * (1 - e);
    blur = Math.max(blur, blurIn * (1 - e));
  }

  // Rise-into-place, independent of `enter` so the fade/blur and the vertical
  // settle can run on their own clocks — the Comet measurements have the
  // fade-sharpen finishing in ~0.8-1.0s while the 21-39px rise settles on its
  // own tau-0.25s exponential. {dy, dur, ease, pow, delay}; default curve is
  // the measured settleDecay, a named ease rides an eased ramp over dur.
  if (rise && rise.dy) {
    const rAt = from + (rise.delay ?? 0);
    const rem = rise.ease
      ? 1 - easeByName(rise.ease, rise.pow)(clamp01(at(t, rAt, rise.dur ?? 1.05)))
      : settleDecay(t, rAt, rise.dur ?? 1.05);
    dy += rise.dy * rem;
  }

  // Mid-beat reflow — a word shifting sideways to make room for the next one.
  if (slide) {
    const p = clamp01(at(t, slide.at, slide.dur ?? 0.6));
    const e = slide.ease === "inout" ? (p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2)
            : 1 - Math.pow(1 - p, slide.pow ?? 2.5);
    dx += (slide.dx ?? 0) * e;
  }

  // Exit: scale-away and/or fade, often ease-IN (accelerating out of frame).
  if (exit) {
    const p = clamp01(at(t, exit.at, exit.dur ?? 0.4));
    const e = exit.ease === "in" ? Math.pow(p, exit.pow ?? 2.6)
            : exit.ease === "linear" ? p
            : memReveal(p);
    s *= 1 + ((exit.scale ?? 1) - 1) * e;
    if (exit.fade !== false) o *= 1 - clamp01(e * (exit.fadeAmt ?? 1));
    blur = Math.max(blur, blurOut * e);
  }
  if (o <= 0.004) return null;

  return (
    <div style={{
      position: "absolute", left: `${cx + dx}px`, top: `${baseline + dy}px`,
      transform: `translate(-50%, -100%) scale(${s.toFixed(4)})`,
      transformOrigin: "50% 100%",
      opacity: o,
      filter: blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : "none",
      whiteSpace: "nowrap",
      fontFamily: font ?? FONT, fontSize: `${size}px`, fontWeight: weight,
      fontStyle: italic ? "italic" : "normal",
      color: rgb(colour), letterSpacing: "-0.022em",
      // Real bloom, measured: half-intensity radius ~0.37x cap height,
      // detectable to ~2.7x that, and it fills the letter counters.
      textShadow: glow
        ? `0 0 ${glow.r * 0.5}px ${rgb(glow.colour)}, 0 0 ${glow.r}px ${rgb(glow.colour)}, 0 0 ${glow.r * 2.7}px ${rgb(glow.colour)}`
        : "none",
    }}>
      {text}
    </div>
  );
}

/**
 * Applies one global scale+translate to a group of words.
 *
 * Needed because from 24.8s mem drives whole phrases with a single camera-like
 * transform while the individual words fade in on top of it. Measured: fitting
 * one affine map through all three word centroids of "Let Mem take meeting"
 * lands the middle word to within 0.5px, and the per-word size ratios agree to
 * 0.3%. Animating the words separately there would be wrong.
 */
export function GroupXform({ t, from, keys, originX = 640, originY = 372, children }) {
  let k = keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a.t && t < b.t) {
      const p = (t - a.t) / (b.t - a.t);
      const e = b.ease === "expo" ? expoOut(p)
              : b.ease === "in" ? Math.pow(p, b.pow ?? 2.6)
              : b.ease === "linear" ? p
              : memReveal(p);
      k = { s: lerp(a.s ?? 1, b.s ?? 1, e), x: lerp(a.x ?? 0, b.x ?? 0, e) };
      break;
    }
    if (t >= b.t) k = b;
  }
  return (
    <div style={{
      position: "absolute", inset: 0,
      transform: `translate(${(k.x ?? 0).toFixed(2)}px, 0px) scale(${(k.s ?? 1).toFixed(4)})`,
      transformOrigin: `${originX}px ${originY}px`,
    }}>
      {children}
    </div>
  );
}

/**
 * A feature pill — dark text on a rounded tinted slab.
 *
 * The slab is a FIXED 976x186 box (stage px) centred in frame, NOT padded to
 * the text: horizontal padding varies from 30px on the longest label to 176px
 * on the shortest. Slab and text are one composited unit — measured opacity
 * tracks within 0.05 between them, so there is no wipe or scale-open of the
 * slab ahead of its text.
 *
 * Entry is a fade over 3-4 frames plus a short upward translate on a fast
 * exponential (tau ~45ms). The text travels about TWICE as far as the slab,
 * which is what gives the arrival its slight bounce.
 */
export function Pill({
  t, from, to, text, slab, colour, size = 134,
  rise = 24, riseDur = 0.10, fadeDur = 0.117, exitDur = 0.167,
  scaleFrom = 1, scaleDur = 0.167, exitRise = 0, static_ = false,
}) {
  if (t < from - 0.001 || t > to + 0.001) return null;
  const inP = clamp01(at(t, from, fadeDur));
  const outP = clamp01(at(t, to - exitDur, exitDur));
  const o = clamp01(inP) * (1 - clamp01(Math.pow(outP, 1.6)));
  if (o <= 0.004) return null;

  const settle = 1 - Math.pow(1 - clamp01(at(t, from, riseDur)), 3);
  const slabDy = rise * (1 - settle) + (static_ ? 0 : exitRise * Math.pow(outP, 2.2));
  const textDy = slabDy * 2;
  const s = lerp(scaleFrom, 1, expoOut(clamp01(at(t, from, scaleDur))));

  return (
    <div style={{
      position: "absolute", inset: 0, opacity: o,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        position: "absolute", width: 976, height: 186, borderRadius: 42,
        background: rgb(slab),
        transform: `translateY(${slabDy.toFixed(2)}px) scale(${s.toFixed(4)})`,
      }} />
      <span style={{
        position: "absolute",
        fontFamily: FONT, fontSize: `${size}px`, fontWeight: 430,
        color: rgb(colour), letterSpacing: "-0.022em", whiteSpace: "pre",
        transform: `translateY(${textDy.toFixed(2)}px) scale(${s.toFixed(4)})`,
      }}>
        {text}
      </span>
    </div>
  );
}

/**
 * Glassy gradient orbs drifting past a column of giant depth-blurred words
 * rolling vertically — the "noun list" overture grammar (Comet-style).
 *
 * The words sit on a wheel: a continuous roll position u(t) (in word units,
 * linear in t) puts word i at distance d = i - u from a fixed focus line. The
 * focused word is sharp and ink; distance adds blur, pales the colour, tilts
 * the baseline like a rolling wheel, and (below the focus only) scales the
 * word up as it approaches. Measured off the reference: ~190px spacing,
 * ~0.8s per step, ~7px blur and ~7deg tilt per unit of distance.
 *
 * `hold` (seconds) optionally quantises the roll into hold-then-roll steps:
 * word i rests exactly on the focus for `hold` seconds, then a smoothstep
 * carries the wheel to word i+1 across the remaining (step - hold). hold=0 is
 * byte-identical to the original continuous linear roll. A word may be given
 * as {text, dx} to nudge that one line horizontally, so a column of unequal
 * status labels can each sit centred on the same axis.
 *
 * Orbs are CSS radial-gradient spheres on keyframed paths (smoothstep between
 * keys, so velocities die out at each key instead of snapping). Skins are
 * colour keyframes mixed the same way; the gradient centre drifts as a pure
 * function of t so the sphere reads as slowly turning. Works with words: []
 * for an orb drifting alone. ALL atMs cues here are ABSOLUTE film-clock ms.
 */
export function OrbRoll({
  t, words = [], focusAt = null, step = 0.8, hold = 0,
  size = 130, x = 700, focusY = 360, spacing = 190,
  tiltDeg = 7, blurPer = 7, growBelow = 0.28,
  colour = [26, 57, 51], fade = [170, 180, 175],
  fadeOutAt = null, fadeOutDur = 0.45,
  orbs = [], font = null,
}) {
  const smooth = (p) => { const q = clamp01(p); return q * q * (3 - 2 * q); };

  // The roll parameter: word i sits on the focus line exactly when u === i.
  // hold=0: the original continuous linear roll, untouched. hold>0: plateau
  // on each word for `hold` seconds, then smoothstep to the next across the
  // remaining (step - hold). Before the first focus instant the approach
  // runs at the roll rate, so word 0 arrives with the same energy.
  // Hoisted out of the word loop so orbs can ride the SAME curve (trackX).
  let u = null;
  if (focusAt != null) {
    const tau = t - focusAt;
    if (hold <= 0) u = tau / step;
    else {
      const roll = Math.max(1e-6, step - hold);
      if (tau < 0) u = tau / roll;
      else {
        const k = Math.floor(tau / step);
        const frac = tau - k * step;
        u = frac <= hold ? k : k + smooth((frac - hold) / roll);
      }
    }
  }

  const wordEls = [];
  if (words.length && focusAt != null) {
    const global = fadeOutAt == null ? 1 : 1 - smooth(at(t, fadeOutAt, fadeOutDur));
    if (global > 0.004) {
      words.forEach((entry, i) => {
        const w = typeof entry === "string" ? { text: entry } : entry;
        const d = i - u;
        const ad = Math.abs(d);
        if (ad > 3.2) return;
        const blur = blurPer * Math.pow(ad, 1.15);
        const col = mixRgb(colour, fade, clamp01(ad * 0.55));
        const scale = 1 + growBelow * Math.max(0, d);
        wordEls.push(
          <div key={i} style={{
            position: "absolute", left: `${(x + (w.dx ?? 0)).toFixed(1)}px`, top: `${(focusY + d * spacing).toFixed(1)}px`,
            transform: `translateY(-50%) rotate(${(d * tiltDeg).toFixed(2)}deg) scale(${scale.toFixed(4)})`,
            transformOrigin: "0% 50%",
            fontFamily: font ?? FONT, fontSize: `${size}px`, fontWeight: 430,
            color: rgb(col), letterSpacing: "-0.022em", whiteSpace: "nowrap",
            opacity: global,
            filter: blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : "none",
          }}>
            {w.text}
          </div>
        );
      });
    }
  }

  const keyed = (keys, t) => {
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
      blur: lerp(a.blur ?? 0, b.blur ?? 0, e),
      hi: a.hi ? mixRgb(a.hi, b.hi, e) : undefined,
      mid: a.mid ? mixRgb(a.mid, b.mid, e) : undefined,
      lo: a.lo ? mixRgb(a.lo, b.lo, e) : undefined,
    };
  };

  const orbEls = orbs.map((orb, i) => {
    const p = keyed(orb.keys, t);
    if (!p || p.r <= 1) return null;
    // Opt-in (trackX): ride the SAME roll parameter the words do, so the orb
    // slides between per-word anchors on exactly the label-swap curve and
    // arrives with it. The anchors are the words' own dx — each word is drawn
    // left-aligned at x + dx — so the orb tracks each label's width for free,
    // holding whatever gap the orb's own keyed x sets against word 0.
    let ox = p.x;
    if (orb.trackX && u != null && words.length > 1) {
      const dxOf = (k) => { const w = words[k]; return typeof w === "string" ? 0 : (w.dx ?? 0); };
      const uu = Math.max(0, Math.min(words.length - 1, u));
      const i0 = Math.min(words.length - 2, Math.floor(uu));
      ox = p.x + lerp(dxOf(i0), dxOf(i0 + 1), uu - i0) - dxOf(0);
    }
    const oBlur = p.blur ?? 0;
    const skin = keyed(orb.skins?.map((s) => ({ t: s.t, x: 0, y: 0, r: 0, hi: s.hi, mid: s.mid, lo: s.lo })), t)
      ?? { hi: [120, 150, 150], mid: [60, 90, 95], lo: [20, 40, 45] };
    // The gradient centre drifts slowly so the sphere reads as turning.
    const gx = 36 + 10 * Math.sin(t * 0.9 + i * 2.1);
    const gy = 30 + 8 * Math.cos(t * 0.7 + i * 1.3);
    return (
      <div key={`orb${i}`} style={{
        position: "absolute",
        ...(oBlur > 0.4 ? { filter: `blur(${oBlur.toFixed(2)}px)` } : null),
        left: `${(ox - p.r).toFixed(1)}px`, top: `${(p.y - p.r).toFixed(1)}px`,
        width: `${(p.r * 2).toFixed(1)}px`, height: `${(p.r * 2).toFixed(1)}px`,
        borderRadius: "50%",
        background: `radial-gradient(circle at ${gx.toFixed(1)}% ${gy.toFixed(1)}%, ${rgb(skin.hi)} 0%, ${rgb(skin.mid)} 55%, ${rgb(skin.lo)} 92%)`,
        boxShadow: `inset ${(-p.r * 0.16).toFixed(1)}px ${(-p.r * 0.2).toFixed(1)}px ${(p.r * 0.5).toFixed(1)}px rgba(8,12,12,0.38)`,
      }} />
    );
  });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {wordEls}
      {orbEls}
    </div>
  );
}

/**
 * A dark-space backdrop: a ring of heavily blurred colour orbs that swells,
 * brightens and dims away, and a static starfield that fades in and holds.
 *
 * Measured off a cosmic outro: the orb ring lives BEHIND bright type on black,
 * peaks while the line holds, then collapses as a starfield takes over; the
 * stars then hold near-still for seconds (per-frame delta under 0.5 luma) and
 * everything fades before the film's final black. Nothing here animates per
 * element: the ring is one opacity/scale envelope, the stars another —
 * per-star twinkle read as noise at 32x18 and was left out on purpose.
 *
 * Layout is deterministic from `seed` (mulberry32), so the backdrop is a pure
 * function of t and identical across renders and workers.
 */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const ORB_PALETTE = [
  [196, 118, 60],   // amber
  [70, 140, 138],   // teal
  [168, 74, 84],    // rose
  [176, 146, 74],   // gold
  [92, 112, 138],   // slate blue
  [190, 178, 158],  // warm cream
];

export function CosmicBackdrop({ t, from, to, orbs = null, stars = null }) {
  if (t < from - 0.001 || t > to + 0.001) return null;

  const els = [];

  if (orbs) {
    const oAt = from + (orbs.at ?? 0);
    const inP = memReveal(at(t, oAt, orbs.inDur ?? 1.8));
    const outP = orbs.outAt == null ? 0 : easeIn(at(t, from + orbs.outAt, orbs.outDur ?? 0.7), 1.6);
    const o = (orbs.peak ?? 0.95) * clamp01(inP) * (1 - clamp01(outP));
    if (o > 0.004) {
      // One envelope for the whole ring: a linear swell across the phase, so
      // the ring breathes as a unit instead of orbs animating separately.
      const phaseDur = ((orbs.outAt ?? (orbs.at ?? 0) + 2.5) + (orbs.outDur ?? 0.7)) - (orbs.at ?? 0);
      const swell = lerp(orbs.swellFrom ?? 0.94, orbs.swellTo ?? 1.06, at(t, oAt, phaseDur));
      // Exit is a COLLAPSE, not a fade-in-place: the ring shrinks toward a
      // point (measured below-left of centre) as it dims, which is what lets
      // a comet/mark pick the motion up.
      const cScale = lerp(1, orbs.outScale ?? 0.32, clamp01(outP));
      const rnd = mulberry32(orbs.seed ?? 7);
      const n = orbs.count ?? 11;
      const ringR = orbs.ringR ?? 300;
      const orbR = orbs.orbR ?? 105;
      const kids = [];
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 - Math.PI / 2 + (rnd() - 0.5) * 0.4;
        const rr = ringR * (0.86 + rnd() * 0.28);
        const R = orbR * (0.72 + rnd() * 0.56);
        const cx = 640 + Math.cos(ang) * rr;
        const cy = 360 + Math.sin(ang) * rr * 0.92;
        const col = ORB_PALETTE[i % ORB_PALETTE.length];
        const a = 0.55 + rnd() * 0.45;
        kids.push(
          <div key={i} style={{
            position: "absolute",
            left: `${(cx - R).toFixed(1)}px`, top: `${(cy - R).toFixed(1)}px`,
            width: `${(R * 2).toFixed(1)}px`, height: `${(R * 2).toFixed(1)}px`,
            borderRadius: "50%",
            background: `radial-gradient(circle at 42% 38%, rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(2)}) 0%, rgba(${col[0]},${col[1]},${col[2]},${(a * 0.55).toFixed(2)}) 45%, rgba(${col[0]},${col[1]},${col[2]},0) 72%)`,
          }} />
        );
      }
      els.push(
        <div key="orbs" style={{
          position: "absolute", inset: 0, opacity: o.toFixed(3),
          transform: `scale(${swell.toFixed(4)})`, transformOrigin: "50% 50%",
          filter: `blur(${(orbs.blur ?? 26).toFixed(1)}px)`,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            transform: `scale(${cScale.toFixed(4)})`,
            transformOrigin: `${(orbs.outX ?? 500).toFixed(0)}px ${(orbs.outY ?? 470).toFixed(0)}px`,
          }}>
            {kids}
          </div>
        </div>
      );
    }
  }

  if (stars) {
    const sAt = from + (stars.at ?? 0);
    const inP = memReveal(at(t, sAt, stars.inDur ?? 0.9));
    const outP = stars.outAt == null ? 0 : easeIn(at(t, from + stars.outAt, stars.outDur ?? 0.7), 1.4);
    const o = clamp01(inP) * (1 - clamp01(outP));
    if (o > 0.004) {
      // Slow rotation (and the slow push-in that always rides with it) about
      // frame centre — pure functions of t, measured off the reference's
      // closing shot: 1.95 deg/s clockwise with +0.40%/s scale. At 0 (the
      // defaults) the field is laid out and drawn exactly as it always was.
      // Non-zero rates need stars OUTSIDE the 1280x720 rect too, or the
      // corners sweep in empty: the field is then laid out across the
      // circumscribed square (side = the frame diagonal) and `count` is scaled
      // by the area ratio so the on-screen density an author tuned at rate 0
      // is preserved.
      const rot = stars.rotDegPerSec ?? 0;
      const zoom = stars.zoomPctPerSec ?? 0;
      const moving = rot !== 0 || zoom !== 0;
      const DIAG = Math.hypot(1280, 720);                 // 1468.8
      const spanX = moving ? DIAG : 1280, spanY = moving ? DIAG : 720;
      const x0 = 640 - spanX / 2, y0 = 360 - spanY / 2;
      const rnd = mulberry32(stars.seed ?? 11);
      const n = Math.round((stars.count ?? 420) * (moving ? (spanX * spanY) / (1280 * 720) : 1));
      const kids = [];
      for (let i = 0; i < n; i++) {
        const x = x0 + rnd() * spanX, y = y0 + rnd() * spanY;
        const big = i % 41 === 0;
        const r = big ? 1.6 + rnd() * 1.2 : 0.5 + rnd() * 0.9;
        const a = big ? 0.85 + rnd() * 0.15 : 0.18 + Math.pow(rnd(), 2) * 0.6;
        // The handful of bright ones read blue-white in the reference.
        const col = big ? [168, 196, 255] : [214, 218, 228];
        kids.push(
          <div key={i} style={{
            position: "absolute",
            left: `${x.toFixed(1)}px`, top: `${y.toFixed(1)}px`,
            width: `${(r * 2).toFixed(1)}px`, height: `${(r * 2).toFixed(1)}px`,
            borderRadius: "50%",
            background: `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(2)})`,
            boxShadow: big ? `0 0 ${(r * 4).toFixed(0)}px rgba(${col[0]},${col[1]},${col[2]},0.55)` : "none",
          }} />
        );
      }
      els.push(
        <div key="stars" style={{
          position: "absolute", inset: 0, opacity: o.toFixed(3),
          ...(moving ? {
            transform: `rotate(${((t - sAt) * rot).toFixed(3)}deg) `
              + `scale(${(1 + (t - sAt) * zoom / 100).toFixed(5)})`,
            transformOrigin: "640px 360px",
          } : null),
        }}>
          {kids}
        </div>
      );
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {els}
    </div>
  );
}

/**
 * Cap height and the flex-centring correction for FONT at a given size.
 *
 * A flex row centres a text box on its LINE box, which Chrome derives from the
 * font's ascent/descent — so a mark centred against it sits low by half the
 * (ascent - descent - cap) slack. Segoe UI's descent is deep enough for that to
 * read as a misalignment, hence the measured correction rather than eyeballing.
 *
 * Canvas is the only way to read cap height, but the answer depends solely on
 * font+size, so this stays a pure function of `t` and is cached per size.
 */
let _capCtx = null;
const _capCache = new Map();
export function capMetrics(size) {
  const hit = _capCache.get(size);
  if (hit) return hit;
  // Segoe UI's own ratios, used if canvas is unavailable or gives nonsense.
  let out = { cap: size * 0.70, dy: size * -0.064 };
  try {
    _capCtx = _capCtx ?? document.createElement("canvas").getContext("2d");
    _capCtx.font = `${size}px ${FONT}`;
    const m = _capCtx.measureText("H");
    const cap = m.actualBoundingBoxAscent;
    // With lineHeight:1 the baseline lands at size/2 + (asc-desc)/2 from the
    // box top, so the cap centre is this far off the box centre.
    const dy = (cap + m.fontBoundingBoxDescent - m.fontBoundingBoxAscent) / 2;
    if (cap > size * 0.5 && cap < size * 0.85 && Number.isFinite(dy)) out = { cap, dy };
  } catch { /* fallback above */ }
  _capCache.set(size, out);
  return out;
}

/**
 * A placeholder for a brand mark sitting inline with text.
 *
 * The closing lockup is mark + wordmark centred together, so the mark cannot be
 * a full-frame slot like the product shots — it has to hold its place in the
 * line. `inline` drops the absolute positioning so a flex row can lay the mark
 * out next to the wordmark; the caller then owns position and scale for the
 * pair as a unit, which is the only way the gap survives a text change.
 */
export function LogoSlot({
  t, from, to, cx, cy, w = 86, h = 62, label = "logo", ink = null, scale = 1,
  ground = null, markSvg = null, inline = false,
}) {
  const glum = ground ? 0.299 * ground[0] + 0.587 * ground[1] + 0.114 * ground[2] : 255;
  ink = ink ?? (glum < 128 ? [238, 236, 244] : C.ink);
  if (t < from - 0.001 || t > to + 0.001) return null;
  const o = clamp01(at(t, from, 0.15)) * (1 - clamp01(at(t, to - 0.15, 0.15)));
  if (o <= 0.004) return null;

  // Inline: the flex parent places it, so no self-positioning and no self-scale
  // (the parent scales the whole lockup, which keeps the gap proportional).
  const place = inline ? { flex: "none" } : {
    position: "absolute", left: `${cx}px`, top: `${cy}px`,
    transform: `translate(-50%, -50%) scale(${scale.toFixed(4)})`,
  };

  // A real mark when the config supplies one; the dashed placeholder otherwise.
  // markSvg is a path relative to index.html, so a retarget is a one-line swap.
  if (markSvg) {
    return (
      <img
        src={markSvg}
        style={{ ...place, width: h, height: h, opacity: o }}
      />
    );
  }

  return (
    <div style={{
      ...place,
      width: w, height: h, opacity: o,
      border: `2px dashed ${rgb(mixRgb(ground ?? [255, 255, 255], ink, 0.45))}`,
      borderRadius: h * 0.22,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT, fontSize: h * 0.30, fontWeight: 450,
      color: rgb(mixRgb(ground ?? [255, 255, 255], ink, 0.75)), letterSpacing: "0.04em",
    }}>
      {label}
    </div>
  );
}
