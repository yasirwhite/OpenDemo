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
import { at, clamp01, lerp, easeOut, easeIn, expoOut, memReveal, backOut, cubicBezier, rgb, mixRgb } from "./easing.js";

// The settle slide is an asymmetric S: 50% of the distance by 40% of the time,
// peak velocity 2x mean at u=0.32, then a long tail. Symmetric ease-in-outs all
// miss it mid-curve by 8-15 points.
const SETTLE_EASE = cubicBezier(0.30, 0.0, 0.20, 1.0);
// CSS "ease" — measured on the second line of "Turn brain dumps": 50% of the
// travel by ~38% of the duration, with the last quarter covering only 8.6%.
const STANDARD_EASE = cubicBezier(0.25, 0.1, 0.25, 1.0);
import { C, FONT } from "./theme.js";

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
 */
export function RevealLine({
  t, start, groups, size = 72, weight = 430,
  groupDur = 0.28, x = 0, y = 0,
  scaleFrom = 1.83, scaleDur = 1.168,
  slideAt = null, slideDx = -68, slideDur = 0.834,
  exitAt = null, exitSweep = 0.33, exitFade = 0.26,
  exitSlideDx = -260, exitSlideDur = 0.55,
  blurIn = 8, exitBlur = 16,
  highlight = [255, 252, 250],
}) {
  // Linear, not eased — measured slope is constant to within 0.5%.
  const scale = lerp(scaleFrom, 1, clamp01(at(t, start, scaleDur)));

  const settle = slideAt == null ? 0 : SETTLE_EASE(at(t, slideAt, slideDur));
  const flee = exitAt == null ? 0 : easeIn(at(t, exitAt, exitSlideDur), 2.2);
  const dx = slideDx * settle + exitSlideDx * flee;

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
            const reached = (1 - sweep) * (N - 1);
            gone = memReveal(clamp01(((i - reached) / Math.max(1, N * 0.18)) + 0.0001))
                 * memReveal(at(t, exitAt, exitFade + exitSweep));
          }
          const sh = shimmerAt(t, c.g.shimmer, c.ci, c.n);
          const base = c.g.colour ?? C.ink;
          const b = (c.g.blurIn ? blurIn * (1 - k) : 0) + exitBlur * gone;

          return (
            <span
              key={i}
              style={{
                fontFamily: FONT,
                fontSize: `${size}px`,
                fontWeight: c.g.weight ?? weight,
                fontStyle: c.g.italic ? "italic" : "normal",
                color: rgb(sh > 0.002 ? mixRgb(base, highlight, sh) : base),
                opacity: clamp01(k) * (1 - clamp01(gone)),
                letterSpacing: "-0.02em",
                filter: b > 0.4 ? `blur(${b.toFixed(2)}px)` : "none",
                whiteSpace: "pre",
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
 */
export function TypeOn({
  t, start, text, cps = 12.8, size = 274, weight = 430,
  ramp = [[2, 2, 2], [2, 2, 2], [102, 138, 242], [180, 110, 190], [254, 94, 66]],
  stops = [0, 0.59, 0.69, 0.79, 0.90],
  caret = true, caretBlink = 0.53, caretDy = 0.055,
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
        {chars.slice(0, n).map((ch, i) => (
          <span key={i} style={{
            fontFamily: FONT, fontSize: `${size}px`, fontWeight: weight,
            color: rgb(colourAt(n > 1 ? i / (n - 1) : 1)),
            letterSpacing: "-0.03em", whiteSpace: "pre",
          }}>
            {ch}
          </span>
        ))}
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
  bg = C.greyWarm, ink = null,
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
    }}>
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
  enter = null, exit = null, slide = null, blurIn = 0, blurOut = 0, glow = null,
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
      fontFamily: FONT, fontSize: `${size}px`, fontWeight: weight,
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
