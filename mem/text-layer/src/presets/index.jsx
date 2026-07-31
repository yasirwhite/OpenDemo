/**
 * Text-card preset registry.
 *
 * Deliberately the same shape as `src/lib/cinematic3d/presets/index.js`: a slug
 * per effect, a one-line `note` on when to reach for it, the duration it was
 * tuned at, and a parameter schema. A model assembling a video should be able
 * to read this file alone and know what it can put on screen.
 *
 * To ADD a preset: add an entry below with `render`, `note`, `nativeMs` and
 * `params`, then it is immediately usable from a config file by slug.
 *
 * Every preset is a PURE function of `t` (seconds, absolute on the timeline).
 * No CSS transitions, no keyframes, no rAF — the renderer calls
 * renderAtTime(t) out of order and screenshots, so wall-clock animation tears.
 */

import React from "react";
import {
  RevealLine, WaveText, WordBeat, FadeWord, GroupXform, PanCanvas, ClipWord,
  SweepText, TypeOn, Pill, Statement, ProductSlot, LogoSlot,
} from "../effects.jsx";
import { C } from "../theme.js";

const s = (ms) => ms / 1000;

/**
 * Each entry:
 *   note      when to use it, one line — this is what a model reads to choose
 *   nativeMs  the duration it was measured/tuned at; other durations work but
 *             the further you stray the more the internal proportions distort
 *   params    name -> [type, default, what it does]
 *   render    (cfg, t) => JSX.  cfg.startMs / cfg.durationMs are always present.
 */
export const PRESETS = {

  // ───────────────────────────────────────────────────────── entrances ────

  "reveal-line": {
    note: "A line writing itself on in syllables, each fading up at its final colour. Optional gloss sweep across one group. The opener.",
    nativeMs: 2900,
    params: {
      groups: ["array", [], "[{text, atMs, colour, shimmer:{startMs,durMs}}] — the reveal unit is the SYLLABLE, not the letter"],
      size: ["number", 72, "font px at 1280x720"],
      scaleFrom: ["number", 1.83, "line scales linearly down to 1.0 across scaleDurMs"],
      scaleDurMs: ["number", 1168, "linear, hard stop, no ease-out"],
      settleDx: ["number", -68, "re-centring slide once the last group lands"],
      exitSweepMs: ["number", 550, "right-to-left dissolve front"],
    },
    render: (c, t) => (
      <RevealLine
        t={t} start={s(c.startMs)} size={c.size ?? 72} weight={c.weight ?? 430}
        x={c.x ?? 0} y={c.y ?? 0}
        scaleFrom={c.scaleFrom ?? 1.83} scaleDur={s(c.scaleDurMs ?? 1168)}
        slideAt={c.settleAtMs != null ? s(c.settleAtMs) : null}
        slideDx={c.settleDx ?? -68} slideDur={s(c.settleDurMs ?? 834)}
        exitAt={c.exitAtMs != null ? s(c.exitAtMs) : null}
        exitSweep={s(c.exitSweepMs ?? 550)} exitFade={s(c.exitFadeMs ?? 200)}
        exitSlideDx={c.exitSlideDx ?? -300} exitSlideDur={s(c.exitSlideDurMs ?? 550)}
        blurIn={c.blurIn ?? 9} exitBlur={c.exitBlur ?? 14}
        groups={(c.groups ?? []).map((g) => ({
          text: g.text, at: s(g.atMs), dur: s(g.durMs ?? 280),
          colour: g.colour ?? C.ink, blurIn: g.blurIn,
          shimmer: g.shimmer ? {
            start: s(g.shimmer.startMs), dur: s(g.shimmer.durMs ?? 730),
            width: g.shimmer.width ?? 0.62, amount: g.shimmer.amount ?? 0.55,
          } : undefined,
        }))}
      />
    ),
  },

  "wave-word": {
    note: "One big word slides in at full size, a colour wave crosses it left-to-right, then it shrinks away on an accelerating curve. The hero beat.",
    nativeMs: 1700,
    params: {
      text: ["string", "", "single word or short phrase"],
      size: ["number", 280, "font px"],
      hot: ["rgb", "salmon", "colour it arrives in"],
      to: ["rgb", "ink", "colour the wave leaves behind"],
      slideFromPx: ["number", 470, "enters from the right by this much"],
      shrinkToScale: ["number", 0.6, "cut mid-shrink; it never reaches rest"],
    },
    render: (c, t) => (
      <WaveText
        t={t} start={s(c.startMs)} text={c.text}
        size={c.size ?? 280} weight={c.weight ?? 500}
        hot={c.hot ?? C.salmon} to={c.to ?? C.ink}
        slideFromPx={c.slideFromPx ?? 470} slideDur={s(c.slideDurMs ?? 600)}
        sweepStart={s(c.sweepAtMs ?? 567)} sweepDur={s(c.sweepDurMs ?? 470)}
        shrinkStart={c.shrinkAtMs != null ? s(c.shrinkAtMs) : null}
        shrinkDur={s(c.shrinkDurMs ?? 830)} shrinkTo={c.shrinkToScale ?? 0.6}
        maxBlur={c.maxBlur ?? 26}
      />
    ),
  },

  "scale-in": {
    note: "A word or line that arrives oversized and settles on an exponential. Use it to carry scale across a hard cut so two shots read as one move.",
    nativeMs: 740,
    params: {
      text: ["string", "", "the copy"],
      scaleFrom: ["number", 1.7, "1.5-2.0 for a normal entrance; 5.6 for a dramatic one"],
      settleDurMs: ["number", 467, "exponential, ~80% of the change in the first third"],
      blur: ["number", 0, "motion blur on the fastest frames; 20+ reads as camera"],
    },
    render: (c, t) => (
      <FadeWord
        t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)} text={c.text}
        cx={c.cx ?? 640} baseline={c.baseline ?? 390}
        size={c.size ?? 90} colour={c.colour ?? C.ink} blurIn={c.blur ?? 0}
        enter={{ scale: c.scaleFrom ?? 1.7, dur: s(c.settleDurMs ?? 467), ease: "expo", fade: c.fade !== false }}
        exit={c.exitScale != null
          ? { at: s(c.exitAtMs ?? c.startMs + c.durationMs - 400), dur: s(c.exitDurMs ?? 400),
              scale: c.exitScale, ease: "in", pow: 2.4, fade: false }
          : null}
      />
    ),
  },

  "statement": {
    note: "Centred one- or two-line copy that rises and fades in, lines staggered. The workhorse for a plain message.",
    nativeMs: 1000,
    params: {
      lines: ["array", [], "one or two strings"],
      lineStaggerMs: ["number", 167, "second line trails the first"],
      size: ["number", 83, "font px"],
    },
    render: (c, t) => (
      <WordBeat
        t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        size={c.size ?? 83} colour={c.colour ?? C.ink} stack lineHeight={c.lineHeight ?? 0.94}
        exit="cut"
        words={(c.lines ?? []).map((text, i) => ({
          text, delay: s((c.lineStaggerMs ?? 167) * i),
          enter: { dy: c.riseDy ?? 27, ease: i === 0 ? "expo" : "ease", fade: i > 0 },
          enterDur: s(i === 0 ? 133 : 267),
        }))}
      />
    ),
  },

  // ───────────────────────────────────────────────────── word sequences ────

  "word-cut": {
    note: "Words replacing each other on HARD CUTS — one frame, no crossfade. mem's sharpest device; use it to set a fast rhythm.",
    nativeMs: 700,
    params: {
      text: ["string", "", "the word"],
      size: ["number", 90, "font px"],
    },
    render: (c, t) => (
      <WordBeat
        t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        size={c.size ?? 90} x={c.x ?? 0} y={c.y ?? 0}
        words={[{ text: c.text }]} enter="cut" exit="cut"
      />
    ),
  },

  "two-tone": {
    note: "One line where a span is in an accent colour — 'Re|mem', 'Let |Mem| take'. Optionally the accent WIPES in left-to-right rather than being static.",
    nativeMs: 900,
    params: {
      parts: ["array", [], "[{text, colour, wipe:{startMs,durMs}}]"],
      size: ["number", 98, "font px"],
    },
    render: (c, t) => (
      <>
        {(c.parts ?? []).map((p, i) => p.wipe ? (
          <SweepText key={i} t={t} from={s(c.startMs)} text={p.text}
            size={c.size ?? 98} base={c.colour ?? C.ink}
            hot={p.colour} cool={p.colour} permanent
            sweepAt={s(p.wipe.startMs)} crossDur={s(p.wipe.durMs ?? 434)} cycleDur={0.30}
            cx={p.cx} baseline={c.baseline ?? 400} />
        ) : (
          <FadeWord key={i} t={t} from={s(c.startMs + (p.delayMs ?? 0))}
            to={s(c.startMs + c.durationMs)} text={p.text}
            cx={p.cx} baseline={c.baseline ?? 400}
            size={c.size ?? 98} colour={p.colour ?? c.colour ?? C.ink}
            enter={{ dur: s(p.fadeMs ?? 100), ease: "linear" }} />
        ))}
      </>
    ),
  },

  "pan-sentence": {
    note: "A sentence laid out on a long canvas with a CAMERA panning across it; each word only does a small local reveal. Use when phrases should feel like one continuous move, not separate slides.",
    nativeMs: 4800,
    params: {
      camera: ["array", [], "[{atMs, x, y, ease}] canvas point at screen centre"],
      words: ["array", [], "[{text, x, y, atMs, durMs}] fixed canvas positions"],
      zoom: ["object", null, "{atMs, durMs, to} closing dolly"],
    },
    render: (c, t) => (
      <PanCanvas
        t={t}
        zoom={c.zoom ? { at: s(c.zoom.atMs), dur: s(c.zoom.durMs), to: c.zoom.to } : null}
        keys={(c.camera ?? []).map((k) => ({
          t: s(k.atMs), x: k.x, y: k.y,
          ease: k.ease === "linear" ? (p) => p : undefined,
        }))}
      >
        {(c.words ?? []).map((w, i) => (
          <ClipWord key={i} t={t} at={s(w.atMs)} dur={s(w.durMs ?? 334)}
            text={w.text} x={w.x} y={w.y}
            size={c.size ?? 86} easePow={w.easePow ?? 2.1} />
        ))}
      </PanCanvas>
    ),
  },

  "group-move": {
    note: "Several words sharing ONE global scale+translate while fading in individually. Use when a phrase is driven by a single camera-like move — animating the words separately gets the geometry wrong.",
    nativeMs: 900,
    params: {
      keys: ["array", [], "[{atMs, s, x, ease}] the shared transform"],
      words: ["array", [], "[{text, cx, baseline, atMs, fadeMs}]"],
    },
    render: (c, t) => (
      <GroupXform t={t} from={s(c.startMs)}
        originX={c.originX ?? 640} originY={c.originY ?? 372}
        keys={(c.keys ?? []).map((k) => ({ t: s(k.atMs), s: k.s, x: k.x, ease: k.ease, pow: k.pow }))}>
        {(c.words ?? []).map((w, i) => (
          <FadeWord key={i} t={t} from={s(w.atMs)} to={s(c.startMs + c.durationMs)}
            text={w.text} cx={w.cx} baseline={w.baseline ?? 400}
            size={w.size ?? c.size ?? 98} colour={w.colour ?? c.colour ?? C.ink}
            enter={{ dur: s(w.fadeMs ?? 100), ease: "linear" }} />
        ))}
      </GroupXform>
    ),
  },

  // ──────────────────────────────────────────────────────────── special ────

  "type-on": {
    note: "Types on one character at a time with a caret, the colour ramp fitted to the whole line and re-fitted on every keystroke. Reads as 'each character lands hot and cools'.",
    nativeMs: 2340,
    params: {
      text: ["string", "", "what gets typed"],
      cps: ["number", 13.2, "characters per second"],
      size: ["number", 248, "font px — large; the line runs off frame and the caret is kept in view"],
      ramp: ["array", null, "colour stops, settled -> newest"],
    },
    render: (c, t) => (
      <TypeOn t={t} start={s(c.startMs)} text={c.text}
        cps={c.cps ?? 13.2} size={c.size ?? 248} weight={c.weight ?? 430}
        ramp={c.ramp} caret={c.caret !== false}
        exitAt={c.exitAtMs != null ? s(c.exitAtMs) : null}
        exitDur={s(c.exitDurMs ?? 434)} />
    ),
  },

  "feature-pills": {
    note: "A sequence of fixed-size tinted slabs, each with dark text, cadence accelerating. A literal feature list.",
    nativeMs: 3700,
    params: {
      pills: ["array", [], "[{text, slab, colour, durMs}] — slab is a FIXED box, not padded to the text"],
      size: ["number", 134, "font px"],
    },
    render: (c, t) => {
      let cursor = c.startMs;
      return (
        <>
          {(c.pills ?? []).map((p, i) => {
            const from = cursor; cursor += p.durMs ?? 600;
            return (
              <Pill key={i} t={t} from={s(from)} to={s(cursor)}
                text={p.text} slab={p.slab} colour={p.colour}
                size={c.size ?? 134}
                scaleFrom={i === 0 ? (c.firstScaleFrom ?? 1.104) : 1}
                exitRise={p.static ? 0 : -18} static_={!!p.static} />
            );
          })}
        </>
      );
    },
  },

  // ─────────────────────────────────────────────────────── placeholders ────

  "product-slot": {
    note: "Reserved space for product footage — a 3D cinematic shot or a plain screen recording. Renders a labelled box so the gap is visible while editing.",
    nativeMs: 4000,
    params: {
      label: ["string", "product demo", "what belongs here"],
      index: ["number", null, "slot number, shown in the box"],
      bg: ["rgb", "greyWarm", "ground colour so the cut rhythm still reads"],
    },
    render: (c, t) => (
      <ProductSlot t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        label={c.label ?? "product demo"} index={c.index}
        bg={c.bg ?? C.greyWarm} />
    ),
  },

  "logo-lockup": {
    note: "Closing mark + wordmark centred as one unit. The mark is a placeholder box — swap in an svg/img at the same cx/cy and the centring holds.",
    nativeMs: 2000,
    params: {
      text: ["string", "", "the wordmark"],
      markLabel: ["string", "logo", "label inside the placeholder box"],
      scaleFrom: ["number", 2.67, "arrives large and shrinks; it never fully settles"],
    },
    render: (c, t) => {
      const from = s(c.startMs), to = s(c.startMs + c.durationMs);
      const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
      const grow = 1 + ((c.scaleFrom ?? 2.67) - 1) * Math.pow(1 - cl((t - from) / s(c.settleDurMs ?? 534), 0, 1), 3);
      const creep = 1 - (c.creep ?? 0.06) * cl((t - from - s(c.settleDurMs ?? 534)) / s(c.creepDurMs ?? 1433), 0, 1);
      const sc = grow * creep;
      return (
        <>
          <LogoSlot t={t} from={from} to={to} cx={640 - (c.markOffset ?? 113) * sc}
            cy={c.markCy ?? 366} w={c.markW ?? 86} h={c.markH ?? 62}
            scale={sc} label={c.markLabel ?? "logo"} />
          <FadeWord t={t} from={from} to={to} text={c.text}
            cx={640 + (c.textOffset ?? 57) * sc} baseline={c.baseline ?? 384}
            size={c.size ?? 100} colour={c.colour ?? C.ink}
            enter={{ scale: c.scaleFrom ?? 2.67, dur: s(c.settleDurMs ?? 534), ease: "expo", fade: false }}
            exit={{ at: from + s(c.settleDurMs ?? 534), dur: s(c.creepDurMs ?? 1433),
                    scale: 1 - (c.creep ?? 0.06), ease: "linear", fade: false }} />
        </>
      );
    },
  },
};

export const PRESET_NOTES = Object.fromEntries(
  Object.entries(PRESETS).map(([k, v]) => [k, v.note]));

export const PRESET_NATIVE_MS = Object.fromEntries(
  Object.entries(PRESETS).map(([k, v]) => [k, v.nativeMs]));

/** Renders one scene from a config object. Unknown slug -> nothing, loudly. */
export function renderScene(scene, t) {
  const p = PRESETS[scene.preset];
  if (!p) {
    if (typeof console !== "undefined") console.warn(`unknown preset: ${scene.preset}`);
    return null;
  }
  return p.render(scene, t);
}
