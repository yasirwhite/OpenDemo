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
  SweepText, TypeOn, Pill, Statement, ProductSlot, MediaWindow, LogoSlot, OrbRoll,
  CosmicBackdrop, PointerCursor, capMetrics,
} from "../effects.jsx";
import { C, FONT } from "../theme.js";
import { rgb } from "../easing.js";
import { PhoneChat } from "../effects-phone.jsx";
import { DrawnEndcard } from "./drawn-endcard.jsx";
import { PetalDrift } from "./petal-drift.jsx";
import { PromptCard } from "./prompt-card.jsx";
import { GradientSweep } from "./gradient-sweep.jsx";
import { RadialGlow } from "./radial-glow.jsx";
import { PosterReveal } from "./poster-reveal.jsx";
import { DomainInput } from "./domain-input.jsx";
import { StarLockup } from "./star-lockup.jsx";
import { ApertureFold } from "./aperture-fold.jsx";
import { ApertureIgnite } from "./aperture-ignite.jsx";
import { SitePage } from "./site-page.jsx";
import { BrandSheet } from "./brand-sheet.jsx";

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

  "aperture-fold": {
    note: "A brand mark ASSEMBLING itself: flat blades arrive edge-on (revealed by their own rotation, not by a fade), swing in around the centre, un-foreshorten and interlock into a faceted aperture ring with a hollow middle. The film's first frame. Real perspective, solved in JS so it is identical across renders. Every *Ms is SCENE-RELATIVE.",
    nativeMs: 3200,
    params: {
      blades: ["number", 6, "how many pieces the mark is cut into; 5-8 read best, 3 minimum. Fewer than 5 and the hollow stops reading as a ring, more than 8 and the seams close up"],
      size: ["number", 240, "outer DIAMETER of the assembled mark in stage px"],
      x: ["number", 0, "mark centre offset from frame centre, px"],
      y: ["number", 0, "mark centre offset from frame centre, px"],
      hole: ["number", 0.46, "inner radius as a fraction of the outer — the hollow. 0.3 is a heavy ring, 0.6 a thin one"],
      gap: ["number", 0.94, "tangential fill per blade; <1 leaves the hairline seams that make it read as ASSEMBLED instead of as one drawn ring. 1 = blades touch"],
      twistDeg: ["number", 14, "pinwheel skew of each blade's inner edge — 0 is a plain polygon ring, which is the boring version"],
      rotDeg: ["number", 0, "resting rotation of the whole mark"],
      colours: ["rgb[]", "[blue, violet]", "ramp sampled AROUND the ring and wrapped, so blade N-1 meets blade 0 with no seam in the colour"],
      shadeAmount: ["number", 0.22, "how far a blade tones toward `shadeTo` as it turns edge-on. Flat at rest (all blades face camera), dimensional only while folding"],
      shadeTo: ["rgb", [14, 12, 30], "the colour blades tone toward when edge-on"],
      shadow: ["object|null", "{dx:0,dy:9,blur:16,alpha:0.16}", "contact shadow under the mark, {dx,dy,blur,alpha,colour}; opacity tracks the fold so nothing casts before it exists. null = off"],
      assembleMs: ["number", 1150, "base per-blade travel; each blade rides 0.86x/1.0x/1.14x of it so the phases never line back up"],
      staggerMs: ["number", 75, "per-slot lag. Slots are MIRRORED (ring distance from blade 0), so both halves converge together rather than one hand sweeping round"],
      pairSkewMs: ["number", 26, "extra lag on the second blade of each mirrored pair, so the symmetry is not machine-exact"],
      orbitFromDeg: ["number", -68, "how far around the ring each blade starts from its slot. A third of the blades ride a backOut and overshoot it — the reference's fold is non-monotonic for exactly this reason"],
      spreadFrom: ["number", 1.45, "starting radius as a multiple of the resting one"],
      rollFromDeg: ["number", 90, "starting rotation about each blade's RADIAL axis. 90 is exactly edge-on — zero width, so the mark is revealed by rotation and never needs a fade-in"],
      rollSlow: ["number", 1.45, "the un-foreshortening runs this much LONGER than the blade's travel, so a piece arrives still turning and finishes folding flat in place. At 1.0 the blades are flat before they land and the mark reads as sliding, not folding"],
      pitchFromDeg: ["number", -32, "starting tilt about each blade's tangential axis; biased per blade by 1/-0.7/0.45"],
      spinFromDeg: ["number", 26, "starting rotation in the blade's own plane, alternating sign so neighbours counter-spin"],
      zFrom: ["number", -260, "starting depth; negative is away from camera, so blades grow as they arrive"],
      persp: ["number", 900, "camera distance in px. Lower is a wider lens and a more violent foreshortening"],
      settleMs: ["number|null", null, "window for the whole-mark settle, measured from SCENE START; null = the full assemble, which is what you want. It rides the assembly rather than following it — a settle that begins after the last blade lands is continuous in position but jumps to ~15deg/s on one frame, and that corner is visible"],
      settleRotDeg: ["number", -7, "how far over-rotated the ring starts; it screws itself closed into rest as it assembles"],
      settleScale: ["number", 1.05, "scale the mark settles down FROM — the enters-oversized-and-settles device, on a curve that lands with exactly zero velocity"],
      core: ["object|null", null, "{r, colour, atMs, durMs} — a dot in the hollow that pops in on a backOut. r is a fraction of the outer radius"],
      label: ["object|null", null, "{text, atMs, durMs, size, weight, font, colour, dy, tracking, riseDy, riseDurMs} — optional wordmark under the mark, fading up and settling from below on the same exponential the text presets use"],
      dive: ["object|null", null, "{atMs, durMs, mag, magPow, tiltDeg, spinDeg, spinPow, splayZ} — the camera flies THROUGH the hollow: the locked mark enlarges, spins up and envelops the frame, for a hard cut on the far side. Magnification is driven directly (M = mag^(p^magPow)) and the camera z solved from it, so growth is relative-constant-then-steepening rather than the flat-then-vertical shape a z ramp gives. magPow>1 also makes the dive leave the hold with zero velocity. null = no dive, and the preset renders exactly as before"],
      "dive.magMix/magPow2": ["number", "0 / 8", "BUILDUP shape. With magMix 0 (the default) the magnification is the single power magPow. Above 0 it blends a second, much steeper power in: ln M = ln(mag)*((1-magMix)*p^magPow + magMix*p^magPow2). Use it when the dive must read as PICKING UP SPEED rather than as an animation that plays — one power cannot both creep for the first third and blow up on the last frame, which is what the reference dive measures (1.2%/picture early, 78% on its last; single-power fit rms 0.079 ln-units, two-power 0.0079). Both exponents >1, so the frame-to-frame growth rate is strictly increasing on (0,1] and cannot ease out anywhere"],
      "dive.tiltReturn/tiltPow": ["bool/number", "true / 1.25", "the lay-back rises and RETURNS to zero by default, which squares the hollow up for a fly-through. tiltReturn false lands the full tilt at p=1 instead — for a dive that CRASHES rather than passes through. The return is an ease-out and it foreshortens the ring while it runs, so on an acceleration-tuned dive it dents the measured growth in the last frames. tiltPow moves the peak later without dropping the return"],
      "dive.bearR/bearBlade/bearAtP": ["number/int/number", "0 / 0 / 1", "CRASH TARGET. 0 flies straight up the ring's axis, so the mark opens symmetrically about frame centre. bearR aims the lens off-centre by that fraction of the outer radius, along the ring angle of blade `bearBlade` sampled at `bearAtP` of the dive — bearAtP 1 puts that blade on the lens axis on the last frame before the cut. One blade then rushes the lens while the opposite one slides away, which is what the reference's dive does (it registers as a similarity about a fixed point 23px off centre). Keep bearR < hole: the nearest ink ends up (hole-bearR)*R*M from centre and that has to clear the frame's corner radius for the cut to land on a bare plate"],
    },
    render: (c, t) => (
      <ApertureFold
        t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        blades={c.blades} size={c.size} x={c.x} y={c.y}
        hole={c.hole} gap={c.gap} twistDeg={c.twistDeg} rotDeg={c.rotDeg}
        colours={c.colours} shadeAmount={c.shadeAmount} shadeTo={c.shadeTo}
        shadow={c.shadow}
        assembleMs={c.assembleMs} staggerMs={c.staggerMs} pairSkewMs={c.pairSkewMs}
        orbitFromDeg={c.orbitFromDeg} spreadFrom={c.spreadFrom}
        rollFromDeg={c.rollFromDeg} rollSlow={c.rollSlow} pitchFromDeg={c.pitchFromDeg}
        spinFromDeg={c.spinFromDeg} zFrom={c.zFrom} persp={c.persp}
        settleMs={c.settleMs} settleRotDeg={c.settleRotDeg} settleScale={c.settleScale}
        core={c.core ?? null} label={c.label ?? null} dive={c.dive ?? null}
      />
    ),
  },

  "reveal-line": {
    note: "A line writing itself on in syllables, each fading up at its final colour. Optional gloss sweep across one group. The opener.",
    nativeMs: 2900,
    params: {
      groups: ["array", [], "[{text, atMs, colour, shimmer:{startMs,durMs}, riseDy, riseDurMs}] — the reveal unit is the SYLLABLE, not the letter; riseDy/riseDurMs override the scene-level rise for that group"],
      size: ["number", 72, "font px at 1280x720"],
      font: ["string|null", null, "CSS font-family override for this scene (e.g. a serif stack); null uses theme FONT"],
      scaleFrom: ["number", 1.83, "line scales linearly down to 1.0 across scaleDurMs"],
      scaleDurMs: ["number", 1168, "linear, hard stop, no ease-out"],
      scaleEase: ["string|null", null, "null = linear hard stop (measured mem default); 'out'|'expo'|'quint' for a decelerating scale-settle — Comet's interstitials measure ~1.09-1.11 -> 1.0 dying out over ~1.15s"],
      staggerMs: ["number|null", null, "uniform per-group onset stagger: groups that OMIT atMs land at groups[0].atMs + i*staggerMs — Comet's word entries measure exactly 240ms apart, never irregular"],
      riseDy: ["number", 0, "px every group enters BELOW its rest position, settling up on a true exponential (per-frame delta x0.85-0.88 at 25fps). Measured 21±0.5px (~0.5em) on Comet's line-2; 0 = off, byte-identical to the old renderer"],
      riseDurMs: ["number", 1050, "when the rise reads as settled (time constant is a quarter of this — measured tau 0.25-0.29s => ~1000-1150)"],
      riseEase: ["string|null", null, "null = the measured exponential settle; or 'expo'|'out'|'quint'|'inout' riding an eased ramp over riseDurMs"],
      settleDx: ["number", -68, "re-centring slide once the last group lands"],
      exitSweepMs: ["number", 550, "dissolve front duration"],
      exitFrom: ["string", "right", "'right' (measured default) or 'left' — which end the exit dissolve front starts from"],
      exitSlideDy: ["number", 0, "px of ACCELERATING per-word lift during the exit (negative = up). Measured on 'Ask anything, anywhere.': 33-61px up, per-frame deltas 0.4/2.3/7.9/16.6/25.9 (ease-in), the film's only translating text exit; 0 = off"],
      exitWordStaggerMs: ["number", 80, "per-group lag on the exit lift, exitFrom side first (measured ~80ms)"],
    },
    render: (c, t) => (
      // RevealLine compares its cue times against absolute timeline seconds, so
      // every *Ms cue below is offset by the scene start. Config authors write
      // them relative to the scene, which is the only reading that survives a
      // scene being moved — get this wrong on a scene starting late and the exit
      // front reads as long finished, leaving one glyph on screen.
      <RevealLine
        t={t} start={s(c.startMs)} size={c.size ?? 72} weight={c.weight ?? 430}
        font={c.font ?? null}
        x={c.x ?? 0} y={c.y ?? 0}
        scaleFrom={c.scaleFrom ?? 1.83} scaleDur={s(c.scaleDurMs ?? 1168)}
        scaleEase={c.scaleEase ?? null}
        slideAt={c.settleAtMs != null ? s(c.startMs + c.settleAtMs) : null}
        slideDx={c.settleDx ?? -68} slideDur={s(c.settleDurMs ?? 834)}
        exitAt={c.exitAtMs != null ? s(c.startMs + c.exitAtMs) : null}
        exitSweep={s(c.exitSweepMs ?? 550)} exitFade={s(c.exitFadeMs ?? 200)}
        exitFrom={c.exitFrom ?? "right"}
        exitSlideDx={c.exitSlideDx ?? -300} exitSlideDur={s(c.exitSlideDurMs ?? 550)}
        exitSlideDy={c.exitSlideDy ?? 0} exitWordStagger={s(c.exitWordStaggerMs ?? 80)}
        riseDy={c.riseDy ?? 0} riseDur={s(c.riseDurMs ?? 1050)} riseEase={c.riseEase ?? null}
        blurIn={c.blurIn ?? 9} exitBlur={c.exitBlur ?? 14}
        groups={(c.groups ?? []).map((g, i) => ({
          // staggerMs fills in onsets for groups that omit atMs — the uniform
          // cadence Comet uses (measured exactly 6 frames = 240ms per word).
          // Without staggerMs the old contract holds: atMs is required.
          text: g.text,
          at: s(c.startMs + (g.atMs
            ?? (c.staggerMs != null ? ((c.groups[0].atMs ?? 0) + i * c.staggerMs) : g.atMs))),
          dur: s(g.durMs ?? 280),
          colour: g.colour ?? C.ink, blurIn: g.blurIn, italic: g.italic,
          riseDy: g.riseDy, riseDur: g.riseDurMs != null ? s(g.riseDurMs) : undefined,
          shimmer: g.shimmer ? {
            start: s(c.startMs + g.shimmer.startMs), dur: s(g.shimmer.durMs ?? 730),
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
      glow: ["object", null, "{r, colour} — measured bloom around the glyph; for bright dots/marks on black"],
      font: ["string|null", null, "CSS font-family override for this scene (e.g. a serif stack); null uses theme FONT"],
      italic: ["bool", false, "italic glyphs"],
      enterDy: ["number", 0, "px the line sits BELOW its rest baseline at entry, decaying with the same settle — a big oversized entrance that also drifts up into place"],
      riseFromPx: ["number|null", null, "independent rise-into-place: the line enters this many px BELOW rest and settles on the measured exponential, on its OWN clock — unlike enterDy, which shares the scale-settle's duration. Comet's word rises measure 21-39px with tau ~0.25s while the fade runs shorter"],
      riseDurMs: ["number", 1050, "when the riseFromPx settle reads as done (time constant = a quarter of this)"],
      riseEase: ["string|null", null, "null = measured exponential; 'expo'|'out'|'quint'|'inout' for an eased ramp over riseDurMs"],
      exitBlur: ["number", 0, "defocus px ramping in across the exit shrink — a receding-out-of-focus exit rather than a clean cut"],
      exitFade: ["bool", false, "fade opacity across the exit too (measured default is shrink-and-cut, no fade)"],
    },
    render: (c, t) => (
      <FadeWord
        t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)} text={c.text}
        cx={c.cx ?? 640} baseline={c.baseline ?? 390}
        size={c.size ?? 90} colour={c.colour ?? C.ink} blurIn={c.blur ?? 0}
        font={c.font ?? null} italic={!!c.italic}
        blurOut={c.exitBlur ?? 0}
        glow={c.glow ?? null}
        rise={c.riseFromPx != null
          ? { dy: c.riseFromPx, dur: s(c.riseDurMs ?? 1050), ease: c.riseEase ?? null }
          : null}
        enter={{ scale: c.scaleFrom ?? 1.7, dur: s(c.settleDurMs ?? 467), ease: "expo", fade: c.fade !== false, dy: c.enterDy ?? 0 }}
        exit={c.exitScale != null
          ? { at: s(c.exitAtMs ?? c.startMs + c.durationMs - 400), dur: s(c.exitDurMs ?? 400),
              scale: c.exitScale, ease: "in", pow: 2.4, fade: c.exitFade === true }
          : null}
      />
    ),
  },

  "statement": {
    note: "Centred one- or two-line copy that rises and fades in, lines staggered. The workhorse for a plain message.",
    nativeMs: 1000,
    params: {
      lines: ["array", [], "one or two strings"],
      lineStaggerMs: ["number", 167, "second line trails the first — this is the measured value, and stretching it past ~250 breaks the two lines into separate events instead of one arrival"],
      riseDy: ["number", 27, "px each line travels up on entry"],
      riseEase: ["string|null", null, "override the entry ease for ALL lines: 'expo'|'ease'|'out'|'quint'|'inout'|'in'|'linear'. null keeps the measured split — line 1 expo, later lines CSS ease"],
      enterMs: ["number", 133, "first line's rise (expo, no fade)"],
      enter2Ms: ["number", 267, "later lines' rise (CSS ease, with fade)"],
      size: ["number", 83, "font px"],
    },
    render: (c, t) => (
      <WordBeat
        t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        size={c.size ?? 83} colour={c.colour ?? C.ink} stack lineHeight={c.lineHeight ?? 0.94}
        exit="cut"
        words={(c.lines ?? []).map((text, i) => ({
          text, delay: s((c.lineStaggerMs ?? 167) * i),
          enter: { dy: c.riseDy ?? 27, ease: c.riseEase ?? (i === 0 ? "expo" : "ease"), fade: i > 0 },
          enterDur: s(i === 0 ? (c.enterMs ?? 133) : (c.enter2Ms ?? 267)),
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
        size={c.size ?? 90} x={c.x ?? 0} y={c.y ?? 0} colour={c.colour ?? C.ink}
        words={[{ text: c.text }]} enter="cut" exit="cut"
      />
    ),
  },

  "two-tone": {
    note: "One line where a span is in an accent colour — 'Re|mem', 'Let |Mem| take'. Optionally the accent WIPES in left-to-right rather than being static.",
    nativeMs: 900,
    params: {
      parts: ["array", [], "[{text, colour, wipe:{startMs,durMs}, riseFromPx, riseDurMs, riseEase}] — riseFromPx makes that (non-wipe) part enter that many px below rest and settle up on the measured exponential, independent of its fade"],
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
            rise={p.riseFromPx != null
              ? { dy: p.riseFromPx, dur: s(p.riseDurMs ?? 1050), ease: p.riseEase ?? null }
              : null}
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
      stops: ["array|null", null, "where each ramp colour sits along the line, 0=first character 1=last (same length as ramp; null = the measured default [0,0.59,0.69,0.79,0.90], which holds the settled colour over the left 59% and cools across the tail). Author it when the reference does NOT cool monotonically — Bloom's 'your brand is extracted' rises to a saturated violet by the 30% mark, PLATEAUS to 62%, and pales only over the last few characters, which the default cannot express at any ramp"],
      font: ["string|null", null, "CSS font-family override for this scene; null uses theme FONT"],
      italic: ["bool", false, "italic glyphs (the birch end-card wordmark is an italic serif)"],
      letterRiseDy: ["number", 0, "px each character lands BELOW its rest and rises expo-out while fading up — measured on Comet's 'Ask more': 36px in 0.24s at ~10cps. 0 = the mem default, characters pop on whole"],
      letterRiseDurMs: ["number", 240, "one character's rise duration (measured 0.24s)"],
      letterFall: ["object|null", null, "{fromDx, fromDy, durMs, ease:'back'|'out'|'expo'|'quint'|'inout', pow, staggerMs, fade} — letter-fall entry: each character arrives offset by (fromDx, fromDy) px (negative dx = from the left, negative dy = from above, i.e. it falls) and settles into place; staggerMs overrides the cps cadence for the motion (pair with a high cps for a fall-in of an already-complete line); fade:false keeps the pop-on opacity. The birch end-card grammar"],
    },
    render: (c, t) => (
      <TypeOn t={t} start={s(c.startMs)} text={c.text}
        cps={c.cps ?? 13.2} size={c.size ?? 248} weight={c.weight ?? 430}
        font={c.font ?? null} italic={!!c.italic}
        ramp={c.ramp} stops={c.stops ?? undefined} caret={c.caret !== false}
        letterRiseDy={c.letterRiseDy ?? 0}
        letterRiseDur={s(c.letterRiseDurMs ?? 240)}
        letterFall={c.letterFall ? {
          dx: c.letterFall.fromDx ?? 0, dy: c.letterFall.fromDy ?? 0,
          dur: s(c.letterFall.durMs ?? 400), ease: c.letterFall.ease,
          pow: c.letterFall.pow,
          stagger: c.letterFall.staggerMs != null ? s(c.letterFall.staggerMs) : undefined,
          fade: c.letterFall.fade,
        } : null}
        exitAt={c.exitAtMs != null ? s(c.exitAtMs) : null}
        exitDur={s(c.exitDurMs ?? 434)} />
    ),
  },

  "orb-roll": {
    note: "Glassy gradient orbs drifting on keyframed paths past giant depth-blurred serif words rolling vertically like a wheel — a 'noun list' overture, or (with holdMs) an orb loader with rolling status labels. Use words: [] for an orb drifting alone. ALL atMs cues in this preset are ABSOLUTE film-clock ms, not scene-relative.",
    nativeMs: 5000,
    params: {
      words: ["array", [], "strings (or {text, dx}) listed top to bottom; word i sits at the focus line at focusAtMs + i*stepMs; dx nudges that one line horizontally in px so unequal labels can each sit centred"],
      focusAtMs: ["number", null, "ABSOLUTE ms when words[0] is centred on the focus line"],
      stepMs: ["number", 800, "ms per word step — the roll is linear in t"],
      holdMs: ["number", 0, "ms of each step spent resting SHARP on the focus before a smoothstep roll spends the remaining (stepMs - holdMs); 0 keeps the original continuous linear roll"],
      size: ["number", 130, "font px of the focused word"],
      x: ["number", 700, "left edge of the word column"],
      focusY: ["number", 360, "y of the focus line (word centre)"],
      spacingPx: ["number", 190, "vertical distance between words at the focus"],
      tiltDeg: ["number", 7, "wheel tilt per word of distance from the focus"],
      blurPer: ["number", 7, "px of blur per word of distance — the depth cue"],
      growBelow: ["number", 0.28, "scale added per word below the focus (the wheel comes toward camera)"],
      colour: ["rgb", "ink", "focused word colour"],
      fade: ["rgb", [170, 180, 175], "colour far words fade toward"],
      fadeOutAtMs: ["number|null", null, "ABSOLUTE ms when the whole column melts away (orbs stay)"],
      orbs: ["array", [], "[{keys:[{atMs,x,y,r,blur}], skins:[{atMs,hi,mid,lo}], trackX}] — radial-gradient spheres; keys/skins interpolate with a smoothstep per segment. Per-key `blur` (default 0 = the sharp sphere) is CSS blur px and interpolates with the rest — the Bloom loader orb is a soft blob, not a solid ball — measured off the reference it is a 50px-radius sphere carrying ~11px of blur (a 22px 10-90 edge), and at 0 it stays the original sharp sphere. `trackX` (default false) makes the orb ride the words' own roll curve: its x picks up (dx[i] - dx[0]) interpolated on the SAME parameter that swaps the labels, so it slides to each label's left edge on exactly the label-swap timing and holds the gap its keyed x sets against word 0. Use it whenever the orb is a bullet in front of a rolling label whose width changes"],
      font: ["string|null", null, "CSS font-family override for this scene; null uses theme FONT"],
    },
    render: (c, t) => (
      <OrbRoll t={t}
        words={c.words ?? []}
        focusAt={c.focusAtMs != null ? s(c.focusAtMs) : null}
        step={s(c.stepMs ?? 800)} hold={s(c.holdMs ?? 0)}
        size={c.size ?? 130} x={c.x ?? 700} focusY={c.focusY ?? 360}
        spacing={c.spacingPx ?? 190} tiltDeg={c.tiltDeg ?? 7}
        blurPer={c.blurPer ?? 7} growBelow={c.growBelow ?? 0.28}
        colour={c.colour ?? [26, 57, 51]} fade={c.fade ?? [170, 180, 175]}
        fadeOutAt={c.fadeOutAtMs != null ? s(c.fadeOutAtMs) : null}
        fadeOutDur={s(c.fadeOutDurMs ?? 450)}
        font={c.font ?? null}
        orbs={(c.orbs ?? []).map((o) => ({
          keys: (o.keys ?? []).map((k) => ({ t: s(k.atMs), x: k.x, y: k.y, r: k.r, blur: k.blur ?? 0 })),
          skins: (o.skins ?? []).map((k) => ({ t: s(k.atMs), hi: k.hi, mid: k.mid, lo: k.lo })),
          trackX: o.trackX ?? false,
        }))}
      />
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

  "gradient-sweep": {
    note: "Serif kinetic line(s) whose glyphs land hot and cool through a travelling pink→magenta→purple→ink front — the gradient-sweep type grammar (Bloom-style openers). Lines reveal per-glyph (revealStepMs>0) or arrive whole and RISE from below; an optional resweep re-washes the settled line once; scaleKeys drive push-in creeps and burst exits. All *Ms cues are SCENE-RELATIVE.",
    nativeMs: 1700,
    params: {
      lines: ["array", [], "[{text, atMs}] — atMs is when the line starts landing/rising, scene-relative"],
      size: ["number", 160, "font px at 1280x720"],
      font: ["string|null", null, "CSS font-family override (e.g. a serif stack); null uses theme FONT"],
      weight: ["number", 700, "font weight"],
      lineHeight: ["number", 1.0, "line box height as an em multiple"],
      letterSpacing: ["string", "-0.012em", "CSS letter-spacing"],
      x: ["number", 0, "block offset px"], y: ["number", 0, "block offset px"],
      revealStepMs: ["number", 40, "per-glyph land stagger; 0 = the whole line lands at once"],
      revealDurMs: ["number", 110, "per-glyph fade/blur-in duration"],
      blurIn: ["number", 8, "px blur a glyph lands with"],
      coolDelayMs: ["number", 120, "hold before a glyph starts cooling"],
      coolStepMs: ["number", 60, "per-glyph cooling offset — set it ABOVE revealStepMs and the front lags on later glyphs, which is the travelling-gradient look"],
      coolDurMs: ["number", 450, "one glyph's full ramp traversal"],
      ramp: ["array", "pale pink→magenta→purple→ink", "colour stops a glyph passes through, land → settled"],
      rise: ["object|null", null, "{dyPx, durMs, colour} — lines rise dyPx from below on an expo, tinted colour while moving"],
      resweep: ["object|null", null, "{atMs, stepMs, durMs, colour, colour2, amount} — one bump wash crossing L→R then cooling back; colour2 tints the right end"],
      scaleKeys: ["array|null", null, "[{atMs, s, ease:'in'|'linear', pow}] whole-block scale keys, scene-relative"],
      exit: ["object|null", null, "{atMs, durMs, blur, dx, fade} — fade/blur/slide the block away"],
    },
    render: (c, t) => (
      <GradientSweep t={t}
        lines={(c.lines ?? []).map((l) => ({ text: l.text, at: s(c.startMs + (l.atMs ?? 0)) }))}
        size={c.size ?? 160} weight={c.weight ?? 700} font={c.font ?? null}
        lineHeight={c.lineHeight ?? 1.0} letterSpacing={c.letterSpacing ?? "-0.012em"}
        x={c.x ?? 0} y={c.y ?? 0}
        revealStep={s(c.revealStepMs ?? 40)} revealDur={s(c.revealDurMs ?? 110)}
        blurIn={c.blurIn ?? 8}
        coolDelay={s(c.coolDelayMs ?? 120)} coolStep={s(c.coolStepMs ?? 60)}
        coolDur={s(c.coolDurMs ?? 450)}
        ramp={c.ramp ?? undefined}
        rise={c.rise ? { dy: c.rise.dyPx ?? 280, dur: s(c.rise.durMs ?? 300), colour: c.rise.colour } : null}
        resweep={c.resweep ? {
          at: s(c.startMs + (c.resweep.atMs ?? 0)), step: s(c.resweep.stepMs ?? 30),
          dur: s(c.resweep.durMs ?? 500), colour: c.resweep.colour,
          colour2: c.resweep.colour2, amount: c.resweep.amount,
        } : null}
        scaleKeys={c.scaleKeys ? c.scaleKeys.map((k) => ({
          t: s(c.startMs + (k.atMs ?? 0)), s: k.s, ease: k.ease, pow: k.pow,
        })) : null}
        exit={c.exit ? {
          at: s(c.startMs + (c.exit.atMs ?? 0)), dur: s(c.exit.durMs ?? 250),
          blur: c.exit.blur, dx: c.exit.dx, fade: c.exit.fade,
        } : null}
      />
    ),
  },

  // ──────────────────────────────────────────────────────── backdrops ────

  "cosmic-backdrop": {
    note: "A dark-space backdrop: a ring of blurred colour orbs that swells and dims, and a starfield that fades in and holds. Sits UNDER text scenes (it starts earlier, so it sorts underneath). For outros where luminance drains to black and type is the only bright element.",
    nativeMs: 9500,
    params: {
      orbs: ["object", null, "{atMs,inDurMs,peak,outAtMs,outDurMs,outScale,outX,outY,count,ringR,orbR,blur,swellFrom,swellTo,seed} — cues relative to scene start; on exit the ring COLLAPSES toward (outX,outY) while fading, it does not fade in place"],
      stars: ["object", null, "{atMs,inDurMs,outAtMs,outDurMs,count,seed,rotDegPerSec,zoomPctPerSec} — cues relative to scene start. rotDegPerSec (default 0) slowly rotates the whole field about frame centre, positive = clockwise; zoomPctPerSec (default 0) is the slow push-in that rides with it (measured 1.95 deg/s and +0.40%/s on the Comet closer). Both are pure functions of t measured from the stars' own start, and together they are what makes a held space shot read as alive rather than as a still. Either being non-zero lays the field out across the circumscribed square instead of the frame rect (so the corners never sweep in empty) and scales `count` by the area ratio, keeping the on-screen density the same"],
    },
    render: (c, t) => (
      <CosmicBackdrop t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        orbs={c.orbs ? {
          at: s(c.orbs.atMs ?? 0), inDur: s(c.orbs.inDurMs ?? 1800),
          peak: c.orbs.peak,
          outAt: c.orbs.outAtMs != null ? s(c.orbs.outAtMs) : null,
          outDur: s(c.orbs.outDurMs ?? 700),
          outScale: c.orbs.outScale, outX: c.orbs.outX, outY: c.orbs.outY,
          count: c.orbs.count, ringR: c.orbs.ringR, orbR: c.orbs.orbR,
          blur: c.orbs.blur, swellFrom: c.orbs.swellFrom, swellTo: c.orbs.swellTo,
          seed: c.orbs.seed,
        } : null}
        stars={c.stars ? {
          at: s(c.stars.atMs ?? 0), inDur: s(c.stars.inDurMs ?? 900),
          outAt: c.stars.outAtMs != null ? s(c.stars.outAtMs) : null,
          outDur: s(c.stars.outDurMs ?? 700),
          count: c.stars.count, seed: c.stars.seed,
          rotDegPerSec: c.stars.rotDegPerSec, zoomPctPerSec: c.stars.zoomPctPerSec,
        } : null} />
    ),
  },

  "petal-drift": {
    note: "A drift layer of soft accent shapes that pop in small over type, grow while drifting toward camera, defocus as they approach, and dissolve. Draws lavender petal-flowers by default; give it `mark` and it drifts a BRAND MARK image on exactly the same choreography, which is how a film carries one logo through every beat that would otherwise want decorative florals. Deterministic from per-flower seed. Key atMs are SCENE-RELATIVE ms.",
    nativeMs: 1400,
    params: {
      flowers: ["array", [], "[{seed, petals, keys:[{atMs,x,y,r,rot,blur,o}]}] — keys interpolate with a smoothstep per segment; r is petal-tip radius in stage px, o opacity, blur defocus px, rot degrees"],
      hi: ["rgb", [250, 247, 253], "petal base and flower core (near-white)"],
      mid: ["rgb", [212, 183, 254], "petal body lavender"],
      lo: ["rgb", [169, 139, 224], "petal edge violet"],
      deep: ["rgb", [82, 37, 157], "back-petal shadow violet"],
      mark: ["object|null", null, "{src, opacity} — draw this image at every flower's keyed box instead of the drawn blossom (seed/petals then do nothing, and hi/mid/lo/deep are inert). The asset must be SQUARE and centred so `r` keeps meaning half the drawn size. Preloaded before the first frame like any other image the config names"],
    },
    render: (c, t) => (
      <PetalDrift t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        hi={c.hi} mid={c.mid} lo={c.lo} deep={c.deep}
        mark={c.mark ?? null}
        flowers={(c.flowers ?? []).map((f) => ({
          seed: f.seed, petals: f.petals,
          keys: (f.keys ?? []).map((k) => ({
            t: s(c.startMs + k.atMs), x: k.x, y: k.y, r: k.r,
            rot: k.rot ?? 0, blur: k.blur ?? 0, o: k.o ?? 1,
          })),
        }))}
      />
    ),
  },

  "radial-glow": {
    note: "One very faint radial wash of colour BEHIND type — the nearly-transparent purple circle that sits under the Bloom 'your brand is extracted' beat and gives the near-white ground its cast. A soft ellipse with a FLAT CORE that holds peak tint to `core` of the radius then rolls off to nothing at the rim; sparse keys fade/grow/drift it. Give it a startMs slightly EARLIER than the text scene it must sit behind — scenes render sorted by startMs. Not a bloom or a light source: it darkens toward its colour like a wash of ink, so the tint colour must be the colour you want the ground pulled TOWARD. Key atMs are SCENE-RELATIVE.",
    nativeMs: 2360,
    params: {
      keys: ["array", [], "[{atMs, alpha, x, y, r, ease, pow}] sparse envelope — x,y is the wash centre in stage px, r its outer radius in stage px (where the tint reaches zero), alpha a 0..1 MULTIPLIER of peakAlpha. Omitted channels inherit the previous key. Interpolation is LINEAR by default; ease ('smooth'|'in'|'out', with pow) shapes the segment INTO that key"],
      colour: ["rgb", [186, 103, 255], "the wash's own colour — the ground is pulled toward this. Measure it as ground + (colour-ground)*peakAlpha; a wash whose blue matches the ground's leaves B untouched, which is what a pale violet cast over white looks like"],
      peakAlpha: ["number", 0.12, "layer alpha at the centre when a key's alpha is 1. colour and peakAlpha trade off exactly over one flat ground, so pick the alpha that makes `colour` read as the tint you mean"],
      core: ["number", 0.26, "fraction of the radius held at FULL tint before the falloff starts — 0 gives a plain point-gradient, which is NOT what a painted wash looks like"],
      falloff: ["number", 1.45, "exponent of the roll-off ((1-d)/(1-core))^falloff from core to rim; 1 = linear, higher = the tint collapses sooner and the rim is wider and fainter"],
      aspect: ["number", 1, "ry/rx — 1 is a circle, >1 taller than wide"],
      blend: ["string", "normal", "CSS mix-blend-mode. 'normal' is a plain alpha tint and is right for a wash over a light ground; 'screen'/'plus-lighter' only if the reference's glow BRIGHTENS what is under it"],
      steps: ["number", 16, "gradient stops used to sample the falloff; 16 is already exact to well under 1/255"],
    },
    render: (c, t) => {
      let prev = { alpha: 0, x: 640, y: 360, r: 400 };
      const keys = (c.keys ?? []).map((k) => (prev = {
        t: s(c.startMs + (k.atMs ?? 0)),
        alpha: k.alpha ?? prev.alpha, x: k.x ?? prev.x,
        y: k.y ?? prev.y, r: k.r ?? prev.r,
        ease: k.ease, pow: k.pow,
      }));
      return (
        <RadialGlow t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
          keys={keys}
          colour={c.colour ?? undefined} peakAlpha={c.peakAlpha ?? undefined}
          core={c.core ?? undefined} falloff={c.falloff ?? undefined}
          aspect={c.aspect ?? undefined} blend={c.blend ?? undefined}
          steps={c.steps ?? undefined} />
      );
    },
  },

  "prompt-card": {
    note: "Card-framed generate loop (the Bloom grammar): serif question with per-word scatter arrival, white prompt pill (gradient orb icon, placeholder, typed prompt), a Select Brand chip whose dropdown opens as a whiteout close-up where the brand pops into a coloured pill with a check, and a dark submit arrow that pulses on press — all driven by camera keys that punch in fast and rest. mode:'generating' instead renders the between-states overlay: a glassy magenta orb drifting beside a serif status label that hard-swaps to a done label. All *Ms cues are SCENE-RELATIVE. The reference's photographic flower-field ground and petal accents are overlay/slot territory and are NOT rendered here.",
    nativeMs: 4650,
    params: {
      mode: ["string", "card", "'card' (default) or 'generating'"],
      camera: ["array", [], "[{atMs, s, px, py, ease:'out'|'inout'|'linear'}] — (px,py) is the stage point held at frame centre at zoom s; 'out' (default) lands fast then rests"],
      blurInMs: ["number", 500, "defocus arrival — blur clears over this long from scene start"],
      exitAtMs: ["number|null", null, "defocus exit start (blur up + fade out)"],
      exitDurMs: ["number", 300, "exit duration"],
      exitBlur: ["number", 14, "peak exit blur px"],
      question: ["object", null, "{words:[{text, atMs, fromScale, fromDy}], size, y} — words settle onto one centred serif row"],
      placeholder: ["string", "Generate anything...", "grey text in the pill before typing"],
      typed: ["object", null, "{text, typeAtMs, cps} — the prompt typed into the pill (no caret, per the reference)"],
      brand: ["string", "", "chip label after the dropdown closes"],
      dropdown: ["object", null, "{openAtMs, selectAtMs, closeAtMs, option, colour, textColour} — whiteout cover + floating list at the chip; the list shifts up a row on select"],
      pressAtMs: ["number|null", null, "submit pulse"],
      ink: ["rgb", [28, 24, 32], "question / typed text colour"],
      pillH: ["number", 94, "prompt pill height in stage px — the pill is a stadium so its corner radius is always half this, and it stays centred on the y=393 control line shared by the orb, prompt text, chip and submit arrow. Reference measures 99-100 (r ~50) at home framing in all three generate loops"],
      orb: ["object", null, "generating mode: {x, y, r} stage px"],
      label: ["string", "Generating", "generating mode status label (serif)"],
      doneLabel: ["string", "Done!", "label after doneAtMs"],
      doneAtMs: ["number|null", null, "hard label swap, scene-relative"],
      inMs: ["number", 200, "generating overlay fade in"],
      outMs: ["number", 250, "generating overlay fade out before scene end"],
    },
    render: (c, t) => (
      <PromptCard t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        mode={c.mode ?? "card"}
        cam={(c.camera ?? []).map((k) => ({
          at: s(c.startMs + (k.atMs ?? 0)), s: k.s ?? 1,
          px: k.px ?? 640, py: k.py ?? 360, ease: k.ease,
        }))}
        blurInDur={s(c.blurInMs ?? 500)}
        exitAt={c.exitAtMs != null ? s(c.startMs + c.exitAtMs) : null}
        exitDur={s(c.exitDurMs ?? 300)} exitBlur={c.exitBlur ?? 14}
        question={c.question ? {
          words: (c.question.words ?? []).map((w) => ({
            text: w.text, at: s(c.startMs + (w.atMs ?? 0)),
            fromScale: w.fromScale, fromDy: w.fromDy,
          })),
          size: c.question.size, y: c.question.y,
        } : null}
        placeholder={c.placeholder ?? "Generate anything..."}
        typed={c.typed ? {
          text: c.typed.text, typeAt: s(c.startMs + (c.typed.typeAtMs ?? 0)),
          cps: c.typed.cps ?? 16,
        } : null}
        brand={c.brand ?? ""}
        dropdown={c.dropdown ? {
          openAt: c.dropdown.openAtMs != null ? s(c.startMs + c.dropdown.openAtMs) : null,
          selectAt: c.dropdown.selectAtMs != null ? s(c.startMs + c.dropdown.selectAtMs) : null,
          closeAt: c.dropdown.closeAtMs != null ? s(c.startMs + c.dropdown.closeAtMs) : null,
          option: c.dropdown.option, colour: c.dropdown.colour,
          textColour: c.dropdown.textColour,
        } : null}
        pressAt={c.pressAtMs != null ? s(c.startMs + c.pressAtMs) : null}
        ink={c.ink ?? [28, 24, 32]}
        pillH={c.pillH ?? 94}
        orb={c.orb ?? null}
        label={c.label ?? "Generating"} doneLabel={c.doneLabel ?? "Done!"}
        doneAt={c.doneAtMs != null ? s(c.startMs + c.doneAtMs) : null}
        inDur={s(c.inMs ?? 200)} outDur={s(c.outMs ?? 250)}
      />
    ),
  },

  "poster-reveal": {
    note: "A brand poster drawn from parameters (mark, wordmark, headline, caption, brand gradient) plus the reveal that brings it on: a blocky mosaic dissolve descending while the picture rises into place, or an oversized defocused arrival that resolves. For the 'here is the asset the product just generated' beat, with no binary asset to ship.",
    nativeMs: 1580,
    params: {
      // rect — measure it off the reference; these are stage px (1280x720)
      w: ["number", 1064, "poster width in stage px"],
      h: ["number", 598, "poster height in stage px"],
      cx: ["number", 640, "poster centre x; the pull-back scales about this point"],
      cy: ["number", 360, "poster centre y"],
      radius: ["number", 0, "corner radius; the measured posters are square-cornered"],
      ground: ["rgb", [253, 253, 253], "the ground BEHIND the poster — the mosaic dissolve is drawn as blocks of this colour, so it must match the scene ground or the front shows a seam"],
      // artwork
      bg: ["rgb", [10, 10, 12], "poster ground (OpenDemo site --bg)"],
      ink: ["rgb", [244, 244, 245], "headline + wordmark + mark glyph"],
      sub: ["rgb", [157, 157, 168], "caption"],
      accentA: ["rgb", [232, 72, 58], "brand gradient start (#e8483a)"],
      accentB: ["rgb", [124, 108, 245], "brand gradient end (#7c6cf5)"],
      wordmark: ["string", "OpenDemo", "text beside the mark, top-left"],
      lines: ["string[]", [], "headline, one string per line — line breaks are authored, not wrapped, so the poster reads the same at any rect"],
      caption: ["string|null", null, "one line under the hairline"],
      headSize: ["number|null", null, "headline px; default h*0.155"],
      headWeight: ["number", 700, "headline weight"],
      headTrack: ["number", -0.035, "headline letter-spacing in em"],
      headLead: ["number", 0.94, "headline line-height"],
      capSize: ["number|null", null, "caption px; default headSize*0.20"],
      markSize: ["number|null", null, "logomark px; default pad*0.86"],
      markSrc: ["string|null", null, "the brand's own mark as an image (file:// URL or a path relative to index.html), drawn in the header lockup instead of the built-in glyph. A poster in a TEMPLATE belongs to whatever brand the film is retargeted to, so this is the field that keeps it from shipping someone else's logo. Preloaded before the first frame"],
      padFrac: ["number", 0.085, "margin as a fraction of the poster's short side"],
      pad: ["number|null", null, "absolute margin px, overriding padFrac"],
      glow: ["bool", true, "the two soft brand lights behind the type"],
      rule: ["bool", true, "hairline between headline and caption"],
      font: ["string|null", null, "CSS font-family; null uses theme FONT"],
      arch: ["false|{cx,cy,r,sw,foot,opacity}|null", null, "the oversized logomark doorway that carries the empty side of the poster. false removes it; the object overrides its springing point (cx,cy as fractions of w,h), radius and stroke width (fractions of the short side), `foot` (fraction of h the legs stop at — under 1 keeps a portrait poster's arch clear of its headline) and opacity. Defaults cx .78 cy .62 r .40 sw .055 foot 1.0 opacity .85"],
      // rise into place
      riseDyPx: ["number", 0, "px BELOW rest that the poster starts; it settles up on the measured exponential (offset x0.805 per frame at 25fps). The artwork travels with the top edge — that is the whole trick of this reveal"],
      riseAtMs: ["number|null", null, "scene-relative ms the rise starts; null = scene start"],
      riseDurMs: ["number", 738, "settle time constant; exp(-4u) over this window"],
      // reveal
      mode: ["string", "mosaic", "'mosaic' (blocky dissolve front) | 'blur' (oversized defocused arrival) | 'none'"],
      frontAtMs: ["number|null", null, "scene-relative ms the dissolve front leaves the poster's top edge; null = scene start"],
      frontDurMs: ["number", 1100, "front travel time when frontKeys is absent (smoothstep)"],
      frontKeys: ["[{atMs,f}]", null, "MEASURED fraction-complete checkpoints, linearly interpolated — use this rather than a curve, because the reference's front is smoothstep on one beat and near-linear on another"],
      tileW: ["number", 26, "dissolve tile width, stage px"],
      tileH: ["number", 30, "dissolve tile height, stage px"],
      band: ["number", 90, "depth of the scatter band around the front, stage px"],
      streak: ["number", 0.8, "per-COLUMN lead/lag as a fraction of band — this is what makes the edge read as vertical streaks rather than a ragged line"],
      jitter: ["number", 0.5, "per-TILE lead/lag as a fraction of band"],
      seed: ["number", 7, "noise seed; deterministic, so frames rendered out of order match"],
      // blur-in / settle
      blurFromPx: ["number", 0, "defocus at scene start, clearing on the same exponential"],
      blurDurMs: ["number", 600, "defocus time constant"],
      blurPow: ["number|null", null, "null = exponential settle; a number switches to (1-u)^pow, which REACHES ZERO at blurDurMs instead of trailing off"],
      scaleFrom: ["number", 1, "arrives at this scale and settles to 1.0 (the measured blur-in beat starts at ~1.39)"],
      scaleDurMs: ["number", 738, "settle time constant for scaleFrom"],
      scalePow: ["number|null", null, "as blurPow, for the scale settle; the measured blur-in beat is (1-u)^1.227 over 2150ms, which no exponential fits"],
      fadeInMs: ["number", 0, "opacity ramp from scene start; 0 = pop on"],
      // pull-back exit
      outAtMs: ["number|null", null, "scene-relative ms the pull-back starts"],
      outDurMs: ["number", 500, "pull-back duration; the reference CUTS mid-flight, so this can outlast the scene"],
      outScale: ["number", 0.72, "scale the pull-back is heading for"],
      outPow: ["number", 2.6, "pull-back acceleration; measured 2-3, accelerating hard"],
      outFade: ["number", 0, "0 = no fade (hard cut out), 1 = fully faded by outDurMs"],
      outBlurPx: ["number", 0, "defocus added by the pull-back"],
    },
    render: (c, t) => {
      const from = s(c.startMs), to = s(c.startMs + c.durationMs);
      return (
        <PosterReveal t={t} from={from} to={to}
          w={c.w ?? 1064} h={c.h ?? 598} cx={c.cx ?? 640} cy={c.cy ?? 360}
          radius={c.radius ?? 0} ground={c.ground ?? [253, 253, 253]}
          bg={c.bg} ink={c.ink} sub={c.sub} accentA={c.accentA} accentB={c.accentB}
          wordmark={c.wordmark ?? "OpenDemo"} lines={c.lines ?? []} caption={c.caption ?? null}
          headSize={c.headSize ?? null} headWeight={c.headWeight ?? 700}
          headTrack={c.headTrack ?? -0.035} headLead={c.headLead ?? 0.94}
          capSize={c.capSize ?? null} markSize={c.markSize ?? null} markSrc={c.markSrc ?? null}
          padFrac={c.padFrac ?? 0.085} pad={c.pad ?? null}
          glow={c.glow !== false} rule={c.rule !== false} font={c.font ?? null}
          arch={c.arch === undefined ? null : c.arch}
          riseDy={c.riseDyPx ?? 0}
          riseAt={c.riseAtMs != null ? s(c.startMs + c.riseAtMs) : null}
          riseDur={s(c.riseDurMs ?? 738)}
          mode={c.mode ?? "mosaic"}
          frontAtS={c.frontAtMs != null ? s(c.startMs + c.frontAtMs) : null}
          frontDur={s(c.frontDurMs ?? 1100)}
          frontKeys={c.frontKeys ? c.frontKeys.map((k) => ({ at: s(c.startMs + k.atMs), f: k.f })) : null}
          tileW={c.tileW ?? 26} tileH={c.tileH ?? 30} band={c.band ?? 90}
          streak={c.streak ?? 0.8} jitter={c.jitter ?? 0.5} seed={c.seed ?? 7}
          blurFrom={c.blurFromPx ?? 0} blurDur={s(c.blurDurMs ?? 600)} blurPow={c.blurPow ?? null}
          scaleFrom={c.scaleFrom ?? 1} scaleDur={s(c.scaleDurMs ?? 738)} scalePow={c.scalePow ?? null}
          fadeIn={s(c.fadeInMs ?? 0)}
          outAt={c.outAtMs != null ? s(c.startMs + c.outAtMs) : null}
          outDur={s(c.outDurMs ?? 500)} outScale={c.outScale ?? 0.72}
          outPow={c.outPow ?? 2.6} outFade={c.outFade ?? 0} outBlur={c.outBlurPx ?? 0}
        />
      );
    },
  },

  "domain-input": {
    note: "Bloom's 'Enter Domain' beat, built: a globe chip + bold serif caption over a wide white glass pill with a soft magenta/violet orb bullet, a grey serif placeholder that fades, the domain typed in near-black serif, and a dark circular submit arrow — over a watercolour flower-field ground. mode:'submit' re-skins the SAME pill for the landing beat: flat purple on black, the button reduced to a hairline ring + arrow, with a specular gloss sweeping along it. Layout is static and camera-driven: put the punch-in / whip / settle in the scene's `camera` block (the reference zooms about the ORB at origin 257.5,443, NOT frame centre). All *Ms cues are SCENE-RELATIVE. Defaults are the measured ref.mp4 4.6-7.9s values in stage px at camera scale 1.",
    nativeMs: 2120,
    params: {
      mode: ["string", "input", "'input' (light glass skin, ground + label + text) or 'submit' (dark skin: black backdrop, purple pill, gloss, ring button)"],
      pill: ["object", { x: 210, y: 340, w: 869.3, h: 126 }, "the field's rect in stage px — measured ref l315 t510 r1618 b698"],
      pillRadius: ["number|null", null, "null = h/2 (a true pill; the reference measures exactly that)"],
      pillFill: ["string", "linear-gradient(97deg, #fbfdfc 0%, #ffffff 42%, #fafcff 100%)", "CSS background for the light skin; the dark skin uses gloss.base instead"],
      pillShadow: ["string", "0 16px 34px rgba(120,100,160,0.20), 0 3px 8px rgba(120,100,160,0.10)", "light skin only; measured shadow reaches ~22px below the pill at ~11/255 depth"],
      darkShadow: ["string", "0 30px 90px rgba(150,40,240,0.30)", "dark skin only: the violet bloom the pill throws onto the black ground"],
      orb: ["object", { x: 267.3, y: 403.3, r: 30 }, "bullet orb centre + visible radius — measured ref (401,605) r45"],
      orbBlur: ["number", 7, "px; the reference orb is saturated to r~20 (ref px) and gone by r~45, i.e. heavily blurred"],
      orbHi: ["rgb", [214, 120, 226], "orb upper-left orchid rim"],
      orbMid: ["rgb", [166, 33, 132], "orb magenta body"],
      orbLo: ["rgb", [138, 26, 106], "orb deep core — measured [153,35,130] after blur"],
      orbViolet: ["rgb", [178, 23, 190], "the violet lobe low-right; measured [178,23,178]"],
      label: ["object", null, "{text, globeX, globeY, globeR, chipR, chipColour, chipAlpha, stroke, textX, baseline, baselineEm, scaleX, size, weight, colour} — measured globe (235.7,291.3) r13.3 behind a pale chip r25.7, text ink left 271.3 baseline 301.7 ink width 178.7, cap height 19.3 (Georgia bold 28). baseline is the TYPOGRAPHIC baseline; baselineEm is the face-specific gap to the line-box bottom (0.150 for Georgia bold at line-height 1). scaleX compresses the advance widths about the left edge — the reference face is ~11% more condensed than Georgia at the same cap height"],
      placeholder: ["object", null, "{text, x, baseline, baselineEm, scaleX, size, colour, fadeAtMs, fadeMs} — measured ink left 314.0, baseline 415.3, ink width 186.0, x-height 17.3 (Georgia 36, baselineEm 0.203, scaleX 0.955); it fades out at scene+190ms over ~90ms, long before the first keystroke"],
      typed: ["object", null, "{text, x, baseline, baselineEm, scaleX, size, colour, typeAtMs, cps} — same face and metrics as the placeholder (measured ink width 211.2 for gumroad.com). Character n lands at typeAtMs+(n-1)/cps; the reference measures 11 chars exactly 72ms apart from scene+600ms, i.e. cps 13.89 — an exact fit on all 18 sampled frames"],
      submit: ["object", null, "{x, y, r, face, ring, ringAlpha, ringWidth, arrowH, arrowW, arrowStroke, arrowColour, faceKeys} — measured centre (1017.0,402.0) in BOTH skins (they agree to 1.3px, which is what proves the two beats are one object); light skin r30 filled [55,53,58], dark skin r27.2 with a hairline ring. faceKeys:[{atMs, c:[r,g,b], a, ringA}] overrides face/ringAlpha with the measured morph — the dark button lands at [86,0,149] and warms to [167,80,234] while its ring fades in"],
      ground: ["object", null, "input skin: {base, haze:[{x,y,r,c,a}], petals:[{x,y,r,c,a}], push:[{x,y,r,c,a}], pushKeys:[{atMs,amount}], hazeBlur, petalBlur} — a stylised watercolour flower field. `haze` is the scale-1 wash and `petals` the bottom band (out of frame once the camera has pushed in); `push` is the deep bloom layer whose opacity follows `pushKeys`. That ramp is measured, not decorative: the frame's top band goes [252,252,253] -> [229,204,246] across the beat, which magnifying a static ground does not reproduce"],
      backdrop: ["object", null, "submit skin: {colour, inMs} — a full-bleed cover that hides the outgoing light beat; measured swap completes inside one 40ms frame"],
      gloss: ["object", null, "submit skin: {base, keys:[{atMs,x,w,amount,wash,washR,washX0,washX1}], angleDeg, rim} — `base` is the pill's flat fill (measured [123,36,188]); the keys drive the specular band (x = CONTENT x of its peak, w its width, amount its peak white alpha) plus a white lighting ramp over the fill from `wash` at content x `washX0` to `washR` at `washX1` (equal values = a flat veil). The band sits still in SCREEN space in the reference, so its content x is keyed to cancel the camera's settle: measured 828 -> 963 -> 991 while its peak dims 0.99 -> 0.53 and the wash cools 0.51 -> 0 on the same expo the camera lands on"],
      flash: ["object", null, "{atMs, durMs, inMs, colour, core, x, y, r, travel, wipe:{colour,deg,from,to,soft}} — the whip's cut. `wipe` is a hard dark wedge sweeping down from the top-right (its gradient edge travels from `from`% to `to`% across the beat); the radial part is the purple light leak blooming over it, ramping in over inMs, travelling `travel` CONTENT px left and fading across durMs. Both live inside the camera, so x/y/r are content px — at 2x zoom that is half the screen size you want"],
      fadeOutAtMs: ["number|null", null, "scene-relative start of a hard fade out"],
      fadeOutMs: ["number", 80, "fade-out duration"],
    },
    render: (c, t) => (
      <DomainInput t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        mode={c.mode ?? "input"}
        pill={c.pill ?? { x: 210, y: 340, w: 869.3, h: 126 }}
        pillRadius={c.pillRadius ?? null}
        pillFill={c.pillFill ?? "linear-gradient(97deg, #fbfdfc 0%, #ffffff 42%, #fafcff 100%)"}
        pillShadow={c.pillShadow ?? "0 16px 34px rgba(120,100,160,0.20), 0 3px 8px rgba(120,100,160,0.10)"}
        darkShadow={c.darkShadow ?? "0 30px 90px rgba(150,40,240,0.30)"}
        orb={c.orb ?? { x: 267.3, y: 403.3, r: 30 }}
        orbBlur={c.orbBlur ?? 7}
        orbHi={c.orbHi ?? [214, 120, 226]} orbMid={c.orbMid ?? [166, 33, 132]}
        orbLo={c.orbLo ?? [138, 26, 106]} orbViolet={c.orbViolet ?? [178, 23, 190]}
        label={c.label ?? null}
        placeholder={c.placeholder ?? null}
        typed={c.typed ?? null}
        submit={c.submit ? {
          ...c.submit,
          faceKeys: c.submit.faceKeys
            ? c.submit.faceKeys.map((k) => ({
                at: k.atMs ?? 0, r: k.c[0], g: k.c[1], b: k.c[2],
                a: k.a ?? 1, ra: k.ringA ?? 0.9,
              }))
            : null,
        } : null}
        ground={c.ground ? {
          ...c.ground,
          pushKeys: c.ground.pushKeys
            ? c.ground.pushKeys.map((k) => ({ at: k.atMs ?? 0, amount: k.amount }))
            : null,
        } : null}
        backdrop={c.backdrop ?? null}
        gloss={c.gloss ? {
          ...c.gloss,
          keys: (c.gloss.keys ?? []).map((k) => ({
            at: k.atMs ?? 0, x: k.x, w: k.w, amount: k.amount,
            wash: k.wash, washR: k.washR, x0: k.washX0, x1: k.washX1,
          })),
        } : null}
        flash={c.flash ?? null}
        fadeOutAtMs={c.fadeOutAtMs ?? null} fadeOutMs={c.fadeOutMs ?? 80}
      />
    ),
  },

  // ──────────────────────────────────────────────────── screen interiors ────
  // Drawn UI comps. Standalone scenes in their own right, but their reason to
  // exist is `media-window`'s `interior`: a screen a film has to SHOW before
  // any recording of it exists, built out of type, cards, pills and swatches
  // rather than left as a dashed box.

  "site-page": {
    note: "A stylised marketing WEBSITE as artwork: app chrome with the domain being inspected, a nav bar, a hero headline (optionally shown with the extractor's selection highlights over it), body copy, buttons, a search field, feature cards and a card grid — on a page that scrolls under the frame. The 'here is the site we are reading' screen. Every cue is SCENE-RELATIVE ms.",
    nativeMs: 7840,
    params: {
      brand: ["object", null, "{name, domain, accent, accent2, ink, paper} — the site's own identity: `name` is set as the nav wordmark, `accent`/`accent2` colour its buttons, chips and stickers"],
      scroll: ["array", [], "[{atMs, y, ease, pow}] — the page's scroll offset in design px, keyed; the page is drawn tall and this slides it under the window. Omitted channels inherit"],
      sidebar: ["object|null", null, "{w, domain, status, orb} — the inspector rail on the left: the domain chip and a small orb + status label. null drops the rail and the page runs full width"],
      hero: ["object|null", null, "{eyebrow, lines, body, cta, search, note} — the top-of-page block"],
      highlight: ["object|null", null, "{atMs, durMs, colour, alpha, staggerMs} — the extractor's selection boxes sweeping over the hero type, which is what makes the screen read as being READ rather than browsed"],
      sections: ["array", [], "[{kind, ...}] — the page below the hero: 'cards' (a row of feature cards), 'loop' (a ring diagram with labels), 'claim' (centred copy + button), 'grid' (a product grid), 'strip' (a row of tiles)"],
      stickers: ["array", [], "[{x, y, r, rot, kind}] — the brand's decorative shapes floating over the page; 'coin' is the tilted disc the reference scatters around its hero"],
      font: ["string|null", null, "CSS font-family for the page; null uses theme FONT"],
    },
    render: (c, t) => (
      <SitePage t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)} cfg={c} />
    ),
  },

  "brand-sheet": {
    note: "A brand-kit SPECIMEN SHEET as artwork: a header with a status orb, the extracted wordmark, a row of hex swatches with labels, then rows specimening the brand's type, buttons, iconography and product cards. The 'here is everything we pulled out of that site' screen. Every cue is SCENE-RELATIVE ms.",
    nativeMs: 2720,
    params: {
      brand: ["object", null, "{name, accent, accent2, ink, paper} — whose kit this is"],
      header: ["object|null", null, "{title, orb:{r, hi, mid, lo}, size} — the status line at the top of the sheet"],
      wordmark: ["object|null", null, "{text, size, colour, weight, tracking} — the extracted wordmark, centred under the header"],
      swatches: ["array", [], "[{hex, label, colour}] — the palette row; `colour` overrides the parsed hex, `label` is the caption under the chip"],
      rows: ["array", [], "[{kind, ...}] — the specimen rows under the palette: 'type' (headline + body + a nav list), 'icons' (a row of glyph tiles), 'grid' (product cards), 'chips' (buttons and fields)"],
      reveal: ["object|null", null, "{atMs, staggerMs, durMs} — rows fading up in order as the sheet is built; null draws the finished sheet"],
      font: ["string|null", null, "CSS font-family for the sheet; null uses theme FONT"],
    },
    render: (c, t) => (
      <BrandSheet t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)} cfg={c} />
    ),
  },

  // ─────────────────────────────────────────────────────── placeholders ────

  "product-slot": {
    note: "Reserved space for product footage — a 3D cinematic shot or a plain screen recording. Renders a labelled box so the gap is visible while editing.",
    nativeMs: 4000,
    params: {
      label: ["string", "product demo", "what belongs here"],
      index: ["number", null, "slot number, shown in the box"],
      bg: ["rgb", "greyWarm", "ground colour so the cut rhythm still reads"],
      src: ["string|null", null, "footage to PLAY in the slot instead of describing it — a file:// URL or a path relative to index.html. Setting it suppresses the dashed placeholder. Seeked per frame as a pure function of t (see src/video-sources.js); the driver must await window.prepareFrame(t) before renderAtTime, which render.mjs does"],
      clip: ["object|null", null, "{from, to, fit} — which part of the source plays. fit:'1x' (default) plays at true speed from `from`; 'stretch' remaps [from,to] onto the scene; 'loop' wraps"],
      fill: ["string", "cover", "'cover' (fill the slot, crop the overflow) or 'contain' (letterbox)"],
      watermark: ["object|null", null, "{src, text, h, margin, marginX, marginY, anchor, clamp, drop, opacity, scaleWithH, colour, font, weight, tracking, textScale, plate} — a bug drawn INSIDE the slot, over the footage; bottom-right unless `anchor` says otherwise. See media-window's entry; a slot resolves the fractions against the 720px frame, and `clamp` is a no-op there because the slot IS the frame"],
    },
    render: (c, t) => (
      <ProductSlot t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        label={c.src ? null : (c.label ?? "product demo")} index={c.index}
        videoKey={c.src ? (c.id ?? null) : null}
        watermark={c.watermark ?? null}
        bg={c.bg ?? C.greyWarm} ink={c.ink} />
    ),
  },

  "media-window": {
    note: "An ANIMATED product window: a framed rounded rect (placeholder interior like product-slot) whose position, size, scale and opacity are keyframed — rise-from-bottom entries, drifts, punch-zooms to full-bleed, pull-backs to the exact home rect, shrink-and-fade exits. For films whose UI windows are themselves choreographed; footage is composited later with the same transforms. Keys' atMs are SCENE-RELATIVE; omitted channels inherit the previous key, so a byte-still hold is two keys with nothing changed.",
    nativeMs: 10400,
    params: {
      w: ["number", 946, "window width at scale 1 (the measured maps-window home rect is 946x683 at (675,373))"],
      h: ["number", 683, "window height at scale 1"],
      radius: ["number", 14, "corner radius px (interpolates through keys; full-bleed keys usually take it to 0)"],
      keys: ["array", [], "[{atMs, x, y, w, h, scale, opacity, blur, radius, shadowAlpha, ease, pow, fullBleed}] — (x,y) is the window CENTRE in stage px; shadowAlpha (default 1) scales `shadow`'s alpha without touching the face, for a handover where the outgoing window shares the incoming one's rect: ramp it 1->0 as the incoming window's opacity goes 0->1, or the two drop shadows stack and the shared edge darkens and then snaps when the outgoing scene ends; scale multiplies w/h; ease shapes the segment INTO this key: 'inout' (default — the measured punch shape), 'out', 'expo', 'in'+pow, 'linear', 'back'. fullBleed:true is shorthand for x:640,y:360,w:1280,h:720,radius:0. Entry from the bottom edge = first key with y > 720+h/2, next key at home; measured entry is fast-attack ('expo'|'out', top edge 719->32 in ~0.5s); punches are 'inout' over ~0.28s; exits fade in place (opacity 0) or shrink ('in')"],
      label: ["string|null", null, "what belongs here, shown in the dashed interior box; null renders a blank face"],
      index: ["number", null, "slot number, shown under the label"],
      face: ["rgb", [248, 246, 243], "the window's face colour"],
      shadow: ["bool|object", true, "soft drop shadow under the floating window. true = the measured default (0 / h*0.026 / h*0.09 / rgba(12,12,20,0.30), scaling with the window height); false = none; or {dx,dy,blur,spread,colour,alpha,scaleWithH} for the edge-of-UI shots where the window's SIDE is inside the frame and needs a shadow beside it, not just under it — omitted fields keep the default's values, and scaleWithH:false pins the shadow in absolute px so a zoom does not grow it. dx/dy/blur/spread are authored at a 720px window height and scale with h unless scaleWithH:false"],
      ink: ["rgb|null", null, "label colour; null picks legible from face luminance"],
      src: ["string|null", null, "REAL FOOTAGE to play inside the window — a file:// URL or a path relative to index.html. The footage rides every key in `keys` (rise, punch, pull-back, slide-off) and is clipped by the live `radius` and lit by `shadow`, which is what a post-hoc ffmpeg overlay cannot do on a window that moves. Setting it suppresses the dashed placeholder. Seeked per frame as a pure function of t (src/video-sources.js); the driver must await window.prepareFrame(t) before renderAtTime, which render.mjs does"],
      clip: ["object|null", null, "{from, to, fit} — which part of the source plays. fit:'1x' (default) plays at true speed from `from`; 'stretch' remaps [from,to] onto the scene duration; 'loop' wraps at true speed"],
      fill: ["string", "cover", "'cover' (fill the window rect, crop the overflow — a UI window should look full, not letterboxed) or 'contain' (letterbox inside the face colour)"],
      interior: ["object|null", null, "{preset, ...} — a DRAWN interior instead of footage: any preset slug rendered inside the window's clip, authored in the full 1280x720 design space and scaled onto the live rect, so it rides every key and is cut by the live radius. This is how a screen that has no recording yet stops reading as a placeholder — `site-page` and `brand-sheet` are the stylised UI comps built for it. The interior inherits the window's startMs/durationMs, so its own cues are scene-relative to the WINDOW. Setting it suppresses the dashed placeholder, exactly as `src` does; `src` wins if both are given"],
      watermark: ["object|null", null, "{src, text, h, margin, marginX, marginY, anchor, clamp, drop, opacity, scaleWithH, colour, font, weight, tracking, textScale, plate} — a brand bug drawn INSIDE the window, on top of the footage. Because it lives inside the clip it rides every key, is cut by the live `radius` and picks up the window's `blur`, which an overlay composited onto the finished frame cannot do. `src` is the brand's own logo as an image (a file:// URL or a path relative to index.html); `text` instead TYPESETS a wordmark — one house treatment every clip can share, and the answer for footage whose product has no usable logo file; both together render the real lockup, mark then wordmark, on one chip. `h` (default 0.052) and the margins (default 0.034) are FRACTIONS of the window's live height, so the bug holds its proportion through a punch to full-bleed — pass scaleWithH:false to pin them against a 720px frame instead. Text-only extras: `colour` (default white), `font`, `weight` (650), `tracking` (0.06em), `textScale` (0.46 — cap height as a fraction of `h`), and `plate` — the translucent chip behind the type, false for none or {colour,alpha,radius,padX} (default rgba(10,12,18,0.55)); an image bug is expected to carry its own ground inside the asset. Image sources are preloaded and decoded before the first frame (see src/index.jsx), so the frame a window enters on cannot render without it. `anchor` (default 'bottom-right') is one of top/bottom/centre x left/right/centre, e.g. 'top-centre' for the big translucent watermark treatment — a centred axis ignores its margin. `clamp` (default false) stops a top-anchored bug leaving the picture when the window is bigger than the frame: a window that punches to 1274x908 has its top edge 210px above the frame, and an unclamped top bug would sit off-screen for the whole punch. `drop` overrides the built-in soft shadow — false for none, {colour, alpha, blur, dx, dy} (blur/dx/dy are fractions of `h`), or an ARRAY of those stacked, which is how a bare mark with no chip carries separation over footage of either polarity"],
    },
    render: (c, t) => (
      <MediaWindow t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        w={c.w ?? 946} h={c.h ?? 683} radius={c.radius ?? 14}
        face={c.face ?? [248, 246, 243]} ink={c.ink ?? null}
        shadow={c.shadow ?? true}
        label={(c.src || c.interior) ? null : (c.label ?? null)} index={c.index}
        videoKey={c.src ? (c.id ?? null) : null}
        watermark={c.watermark ?? null}
        // A drawn interior is rendered through the ordinary preset path, given
        // the WINDOW's clock, so anything in the registry can be a screen.
        interior={(!c.src && c.interior) ? renderScene({
          ...c.interior,
          id: `${c.id ?? "win"}-interior`,
          startMs: c.startMs, durationMs: c.durationMs,
        }, t) : null}
        keys={(c.keys ?? []).map((k) => k.fullBleed
          ? { t: s(c.startMs + k.atMs), x: 640, y: 360, w: 1280, h: 720, radius: 0,
              scale: k.scale, opacity: k.opacity, blur: k.blur,
              shadowAlpha: k.shadowAlpha, ease: k.ease, pow: k.pow }
          : { t: s(c.startMs + k.atMs), x: k.x, y: k.y, w: k.w, h: k.h,
              scale: k.scale, opacity: k.opacity, blur: k.blur, radius: k.radius,
              shadowAlpha: k.shadowAlpha, ease: k.ease, pow: k.pow })}
      />
    ),
  },

  "pointer-cursor": {
    note: "A mouse pointer that travels in from off-frame, lands on a control, presses it and leaves — so a button in a demo beat fires because something CLICKED it instead of firing on its own. Keys are the same sparse list and the same easing family as media-window ('in'+pow to accelerate off an edge, 'out'/'expo' to arrive with nothing left), so the pointer moves like everything else in the film. (x,y) is the TIP. The press is a scale dip about the tip; the control's own flash stays in the control, authored separately, which is what lets you put the dip a frame or two AHEAD of the flash so the click reads as the cause. Draw it in the same scene space as the control it presses — if that control sits under a scene `camera`, give this scene the same camera block. All *Ms are SCENE-RELATIVE.",
    nativeMs: 1400,
    params: {
      keys: ["array", [], "[{atMs, x, y, scale, opacity, rotDeg, ease, pow}] — (x,y) is the pointer TIP in stage px. Sparse: omitted channels inherit the previous key, so a hold is two keys with nothing changed between them. `ease` shapes the segment INTO the key (default 'inout')"],
      press: ["array", [], "[{atMs, amount}] press depth 0..1, LINEAR between keys — a click is a mechanical travel, and easing it reads as a squash. Put the bottom of the dip on a frame boundary; at 25fps that is what decides whether the press is seen at all"],
      size: ["number", 36, "pointer height in stage px, tip to tail"],
      pressDip: ["number", 0.16, "scale lost at full press, pivoting on the TIP so the contact point never moves"],
      pressDx: ["number", 2.6, "px the glyph shoves right at full press — the hand's weight going in"],
      pressDy: ["number", 2.6, "px the glyph shoves down at full press"],
      fill: ["rgb", [255, 255, 255], "glyph body. White with a dark outline is the one combination that survives both a cream frame and a near-black button"],
      stroke: ["rgb", [24, 26, 28], "glyph outline"],
      strokeWidth: ["number", 1.5, "outline width in the glyph's own 21.8-unit space"],
      shadowAlpha: ["number", 0.34, "soft contact drop under the glyph; 0 for none"],
    },
    render: (c, t) => (
      <PointerCursor t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        size={c.size ?? 36}
        pressDip={c.pressDip ?? 0.16}
        pressDx={c.pressDx ?? 2.6} pressDy={c.pressDy ?? 2.6}
        fill={c.fill ?? [255, 255, 255]} stroke={c.stroke ?? [24, 26, 28]}
        strokeWidth={c.strokeWidth ?? 1.5}
        shadowAlpha={c.shadowAlpha ?? 0.34}
        keys={(c.keys ?? []).map((k) => ({
          t: s(c.startMs + (k.atMs ?? 0)),
          x: k.x, y: k.y, scale: k.scale, opacity: k.opacity, rotDeg: k.rotDeg,
          ease: k.ease, pow: k.pow,
        }))}
        press={(c.press ?? []).map((k) => ({
          t: s(c.startMs + (k.atMs ?? 0)), amount: k.amount,
        }))}
      />
    ),
  },

  "logo-lockup": {
    note: "Closing mark + wordmark laid out as one horizontal group, cap-centred on each other and centred on the stage. Sized off the text, so any brand name works untuned.",
    nativeMs: 2000,
    params: {
      text: ["string", "", "the wordmark"],
      size: ["number", 100, "wordmark font px; the mark is sized from its cap height"],
      markSvg: ["string|null", null, "path to the real logo, relative to index.html — the swappable brand mark"],
      markLabel: ["string", "logo", "label inside the placeholder box, when markSvg is absent"],
      markGap: ["number", 0.35, "gap as a fraction of mark height, so it scales with the lockup instead of being tuned per brand"],
      markScale: ["number", 1.25, "mark height as a multiple of cap height; a square mark reads short at 1.0"],
      ground: ["rgb", null, "the scene background, so the placeholder stays legible on dark"],
      scaleFrom: ["number", 2.67, "arrives large and shrinks; it never fully settles"],
      creep: ["number", 0.06, "slow shrink after the settle; 0 for a lockup that holds dead still"],
      font: ["string|null", null, "CSS font-family override for the wordmark; null uses theme FONT"],
      italic: ["bool", false, "italic wordmark"],
      fadeInMs: ["number", 0, "opacity ramp from scene start; 0 = pop on (measured default)"],
      blurInMs: ["number", 0, "defocus that clears over this long from scene start; 0 = sharp"],
      blurInPx: ["number", 16, "peak defocus px at scene start, when blurInMs > 0"],
      riseDy: ["number", 0, "px the lockup starts BELOW its rest position, decelerating up into place"],
      riseDurMs: ["number", 420, "duration of the rise"],
      markOffset: ["number|null", null, "DEPRECATED and ignored — the gap is markGap now"],
    },
    render: (c, t) => {
      const from = s(c.startMs), to = s(c.startMs + c.durationMs);
      if (t < from - 0.001 || t > to + 0.001) return null;
      const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
      const grow = 1 + ((c.scaleFrom ?? 2.67) - 1) * Math.pow(1 - cl((t - from) / s(c.settleDurMs ?? 534), 0, 1), 3);
      const creep = 1 - (c.creep ?? 0.06) * cl((t - from - s(c.settleDurMs ?? 534)) / s(c.creepDurMs ?? 1433), 0, 1);
      const sc = grow * creep;
      // Optional dissolve-in: opacity/defocus/rise all clearing from scene
      // start, for closers that resolve out of a blur instead of popping on.
      const fadeIn = c.fadeInMs ? cl((t - from) / s(c.fadeInMs), 0, 1) : 1;
      const blurPx = c.blurInMs
        ? (c.blurInPx ?? 16) * Math.pow(1 - cl((t - from) / s(c.blurInMs), 0, 1), 1.3)
        : 0;
      const rise = (c.riseDy ?? 0) * Math.pow(1 - cl((t - from) / s(c.riseDurMs ?? 420), 0, 1), 2);

      // Mark and gap both derive from cap height, so the lockup holds its
      // proportions for any wordmark at any size — nothing to hand-tune.
      const size = c.size ?? 100;
      const { cap, dy } = capMetrics(size);
      const markH = c.markH ?? cap * (c.markScale ?? 1.25);
      const gap = markH * (c.markGap ?? 0.35);

      // One flex row: the group is laid out naturally, then centred and scaled
      // as a unit. Scaling the parent (not each child) is what stops the gap
      // stretching with the entry animation.
      return (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `translateY(${rise.toFixed(2)}px) scale(${sc.toFixed(4)})`,
          opacity: fadeIn,
          filter: blurPx > 0.4 ? `blur(${blurPx.toFixed(2)}px)` : "none",
        }}>
          <LogoSlot inline t={t} from={from} to={to}
            w={c.markW ?? markH * 1.387} h={markH}
            label={c.markLabel ?? "logo"} ground={c.ground}
            markSvg={c.markSvg ?? null} />
          <span style={{
            flex: "none", marginLeft: `${gap.toFixed(2)}px`,
            // dy pulls the cap box onto the row's centre line; see capMetrics.
            transform: `translateY(${dy.toFixed(2)}px)`,
            fontFamily: c.font ?? FONT, fontSize: `${size}px`, fontWeight: 430,
            fontStyle: c.italic ? "italic" : "normal",
            lineHeight: 1, whiteSpace: "nowrap",
            color: rgb(c.colour ?? C.ink), letterSpacing: "-0.022em",
          }}>
            {c.text}
          </span>
        </div>
      );
    },
  },

  "star-lockup": {
    note: "The closer where a point of light BECOMES the mark, not where a logo cross-fades in over a dot. A spark swells to a peak disc inside a two-layer bloom, CONDENSES on a fast-then-slow curve, and the two halves of the OpenDemo arch grow out of it along their own path length, each led by a hot ignition front that decays into the brand gradient behind it; the residual bloom settles to a resting glow and the wordmark rises in beside the mark. Sits OVER a cosmic-backdrop that keeps rotating (stars.rotDegPerSec) — the mark holds dead still and the starfield is what stays alive. The mark is drawn inline, so no binary asset is loaded; it is the same geometry as opendemo-logo.svg.",
    nativeMs: 6800,
    params: {
      text: ["string", "OpenDemo", "the wordmark; empty string = mark only, and then the mark never slides off frame centre"],
      boldFrom: ["number", 4, "character index the heavy weight starts at — 4 splits Open|Demo. 0 = all heavy, text.length = all light"],
      size: ["number", 68, "wordmark font px"],
      tracking: ["number", -0.016, "wordmark letter-spacing in em"],
      weightLight: ["number", 300, "weight of the first run"],
      weightBold: ["number", 640, "weight of the second run"],
      font: ["string|null", null, "CSS font-family for the wordmark; null uses theme FONT"],
      tagline: ["string", "", "optional small line under the wordmark; empty = none"],
      taglineSize: ["number", 22, "tagline font px"],
      taglineGap: ["number", 0.34, "gap below the wordmark's cap line, as a fraction of the wordmark size"],
      starX: ["number", 640, "x the light ignites at — and where the bead stays for the whole beat"],
      starY: ["number", 300, "y the light ignites at. The mark hangs BELOW it (the bead is the crown), so this sits above frame centre by roughly 0.36*markH"],
      markH: ["number", 170, "mark ink height in px, bead top to feet"],
      lockX: ["number", 640, "x the settled mark+wordmark group is centred on"],
      markGap: ["number", 0.3, "mark-to-wordmark gap as a fraction of mark ink height, so it scales with the lockup"],
      igniteAtMs: ["number", 0, "scene-relative ms the spark starts growing"],
      igniteDurMs: ["number", 620, "spark -> peak disc. Measured 9 frames at 25fps on the reference, S-curved"],
      peakHoldMs: ["number", 90, "how long the disc holds its peak before condensing (measured ~2 frames)"],
      condenseDurMs: ["number", 800, "peak -> bead radius, fast then slow"],
      drawAtMs: ["number", 720, "scene-relative ms the strokes start growing out of the bead — just AFTER the peak, so the light is visibly being spent"],
      drawDurMs: ["number", 820, "how long the arch takes to reach its feet"],
      glowSettleDurMs: ["number", 950, "residual bloom decay once the arch is drawn"],
      slideAtMs: ["number", 1620, "scene-relative ms the mark slides left off frame centre to make room for the wordmark"],
      slideDurMs: ["number", 700, "slide settle"],
      wordAtMs: ["number", 1760, "scene-relative ms the wordmark starts fading and rising in"],
      wordDurMs: ["number", 780, "wordmark fade/rise"],
      wordRise: ["number", 16, "px the wordmark starts below its rest position"],
      outDurMs: ["number", 0, "fade the whole lockup out over this long at the END of the scene; 0 = hold to the cut"],
      peakR: ["number", 46, "peak disc radius px (measured 46.8 off the reference at 1280x720)"],
      sparkR: ["number", 1.6, "radius the spark starts at"],
      restGlow: ["number", 0.3, "the glow the settled mark keeps, 0..1 of peak. 0 makes the mark go flat and the light read as having been a separate object"],
      shock: ["number", 0.22, "peak alpha of the thin ring thrown off at the moment the disc stops growing; 0 = off"],
      hotLen: ["number", 26, "length of the hot ignition front, in units of the 100-long normalised stroke path"],
      frontGlow: ["number", 1, "ignition front intensity multiplier"],
      bead: ["rgb", [255, 255, 255], "the light itself"],
      hot: ["rgb", [255, 250, 245], "the ignition front"],
      warm: ["rgb", [232, 72, 58], "brand warm — the arch at the crown (#e8483a)"],
      cool: ["rgb", [124, 108, 245], "brand cool — the arch at the feet (#7c6cf5)"],
      word: ["rgb", [240, 238, 246], "wordmark colour"],
      taglineColour: ["rgb", [150, 150, 172], "tagline colour"],
    },
    render: (c, t) => (
      <StarLockup t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        // The uid becomes an SVG gradient id, so anything that is not a word
        // character has to go or two lockups on one stage collide.
        uid={`sl${String(c.id ?? c.startMs).replace(/\W+/g, "")}`}
        starX={c.starX} starY={c.starY} markH={c.markH} lockX={c.lockX}
        markGap={c.markGap}
        text={c.text} boldFrom={c.boldFrom} size={c.size} tracking={c.tracking}
        weightLight={c.weightLight} weightBold={c.weightBold} font={c.font ?? null}
        tagline={c.tagline} taglineSize={c.taglineSize} taglineGap={c.taglineGap}
        igniteAt={c.igniteAtMs != null ? s(c.igniteAtMs) : undefined}
        igniteDur={c.igniteDurMs != null ? s(c.igniteDurMs) : undefined}
        peakHold={c.peakHoldMs != null ? s(c.peakHoldMs) : undefined}
        condenseDur={c.condenseDurMs != null ? s(c.condenseDurMs) : undefined}
        drawAt={c.drawAtMs != null ? s(c.drawAtMs) : undefined}
        drawDur={c.drawDurMs != null ? s(c.drawDurMs) : undefined}
        glowSettleDur={c.glowSettleDurMs != null ? s(c.glowSettleDurMs) : undefined}
        slideAt={c.slideAtMs != null ? s(c.slideAtMs) : undefined}
        slideDur={c.slideDurMs != null ? s(c.slideDurMs) : undefined}
        wordAt={c.wordAtMs != null ? s(c.wordAtMs) : undefined}
        wordDur={c.wordDurMs != null ? s(c.wordDurMs) : undefined}
        wordRise={c.wordRise}
        outDur={c.outDurMs != null ? s(c.outDurMs) : undefined}
        peakR={c.peakR} sparkR={c.sparkR} restGlow={c.restGlow} shock={c.shock}
        hotLen={c.hotLen} frontGlow={c.frontGlow}
        bead={c.bead} hot={c.hot} warm={c.warm} cool={c.cool}
        word={c.word} taglineColour={c.taglineColour} />
    ),
  },

  "aperture-ignite": {
    note: "The closer, for a film that OPENS on aperture-fold: one sun takes a lap around the ring and every glass shard it passes swings out of nothing behind it, until the whole aperture stands; the sun then falls into the hollow and stays as the mark's core, the group slides left and the wordmark rises in beside it. The shards are the same geometry aperture-fold assembles, revealed by the same roll-out-of-edge-on rather than by a fade. Built for black — sits OVER a cosmic-backdrop that keeps rotating, and the mark holds dead still against it. Every *Ms is SCENE-RELATIVE.",
    nativeMs: 5740,
    params: {
      blades: ["number", 6, "shard count; must match the opener's or the film has two logos"],
      size: ["number", 260, "outer DIAMETER of the assembled mark in stage px"],
      hole: ["number", 0.46, "inner radius as a fraction of the outer — the hollow the sun ends up in"],
      gap: ["number", 0.94, "tangential fill per shard; <1 leaves the seams that make it read as assembled"],
      twistDeg: ["number", 14, "pinwheel skew of each shard's inner edge"],
      rotDeg: ["number", -90, "resting rotation. -90 puts shard 0 at twelve o'clock, which is where the sun ignites"],
      cx: ["number", 640, "ring centre x DURING the reveal, before the lockup slide"],
      cy: ["number", 352, "ring centre y; it never moves vertically"],
      lockX: ["number", 640, "x the settled mark+wordmark group is centred on"],
      colours: ["rgb[]", "[blue, violet]", "ramp sampled AROUND the ring and wrapped"],
      glassAlpha: ["number", 0.44, "resting fill opacity of a shard. Above ~0.6 the facets stop reading as glass and become plastic; below ~0.3 they vanish into the starfield"],
      edgeAlpha: ["number", 0.9, "shard outline opacity — the edge is what makes it glass"],
      edgeW: ["number", 1.7, "shard outline width px"],
      bloom: ["number", 0.5, "opacity of the blurred copy of the shards under themselves. On black this is what keeps the facets from reading as flat vector fill; 0 = off"],
      sun: ["rgb", [255, 252, 244], "the light itself"],
      sunWarm: ["rgb", [255, 214, 150], "the colour its bloom falls off through"],
      sparkR: ["number", 1.8, "radius the spark starts at"],
      peakR: ["number", 30, "radius it swells to before setting off"],
      sunR: ["number", 15, "radius it travels at"],
      coreR: ["number", 9, "radius it rests at, in the hollow"],
      orbitWobble: ["number", 0.13, "how far the orbit radius breathes, as a fraction. One sine drives this, the sun's size and its brightness together — split them and the orbit reads as a sticker sliding round a circle"],
      sunDepth: ["number", 0.24, "how much the sun's own radius rides that same sine"],
      trail: ["number", 0.62, "opacity of the sun's wake — the arc it has just covered, drawn OVER the glass. 0 = off, and then the lap reads as six unrelated flashes instead of one journey. Under the glass it is invisible by construction: the arc already covered is exactly the arc that now has shards standing on it"],
      tailDeg: ["number", 74, "how far back the wake reaches, in degrees of the lap. Much past ~110 it stops being a wake and becomes a drawn orbit line"],
      flare: ["number", 0.4, "how hard the sun's bloom pulses as it spends itself on each shard — six beats, one per ignition. The CORE deliberately does not pulse; pumping both makes the sun read as stuttering rather than discharging. 0 = a bead sliding round at constant brightness"],
      restGlow: ["number", 0.82, "the glow the sun keeps once it has fallen into the hollow, 0..1 of its travelling brightness. Low values make the mark go flat and the light read as having been a separate object all along"],
      text: ["string", "OpenDemo", "the wordmark; empty = mark only, and then the mark never slides off centre"],
      boldFrom: ["number", 4, "character index the heavy weight starts at — 4 splits Open|Demo"],
      wordSize: ["number", 62, "wordmark font px"],
      tracking: ["number", -0.016, "wordmark letter-spacing in em"],
      weightLight: ["number", 300, "weight of the first run"],
      weightBold: ["number", 640, "weight of the second run"],
      font: ["string|null", null, "CSS font-family for the wordmark; null uses theme FONT"],
      word: ["rgb", [240, 238, 246], "wordmark colour"],
      markGap: ["number", 0.3, "mark-to-wordmark gap as a fraction of the mark's LIVE diameter, so it closes with the mark when lockSize shrinks it"],
      lockSize: ["number|null", null, "the mark's DIAMETER once it has locked up, in stage px. `size` is what the aperture is REVEALED at — alone on the frame, where it has to carry it — and that is usually far bigger than it should be standing next to type. The shrink rides the slide's own curve, so it is a property of a move the film already has rather than a new beat, and it cannot touch the ignition: slideP is 0 until slideAtMs. The wordmark's gap and the group's centring both follow it. null = the mark locks up at `size`, exactly as before"],
      igniteAtMs: ["number", 0, "scene-relative ms the spark starts growing"],
      igniteDurMs: ["number", 460, "spark -> peak disc"],
      peakHoldMs: ["number", 80, "how long it holds its peak before condensing"],
      condenseDurMs: ["number", 380, "peak -> travelling radius"],
      orbitAtMs: ["number", 840, "scene-relative ms the lap starts"],
      orbitDurMs: ["number", 2360, "the whole lap. Shard ignitions are SOLVED from this curve, not scheduled beside it, so retiming the lap can never leave the sun lighting shards it has not reached"],
      leadDeg: ["number", 26, "how far before shard 0's slot the sun enters"],
      trailDeg: ["number", 60, "how far past the last slot it runs on. With 6 shards, 60 closes the lap exactly back on shard 0"],
      shardDurMs: ["number", 340, "how long one shard takes to roll out of edge-on"],
      shardHotMs: ["number", 420, "how long its ignition heat takes to decay — deliberately LONGER than shardDurMs, so a shard does not finish opening and finish cooling on the same frame"],
      fallAtMs: ["number", 3140, "scene-relative ms the sun starts falling into the hollow"],
      fallDurMs: ["number", 460, "the fall"],
      slideAtMs: ["number", 3480, "scene-relative ms the mark slides left to make room"],
      slideDurMs: ["number", 720, "slide settle"],
      wordAtMs: ["number", 3680, "scene-relative ms the wordmark fades and rises in"],
      wordDurMs: ["number", 760, "wordmark fade/rise"],
      wordRise: ["number", 15, "px the wordmark starts below its rest position"],
      sunFadeAtMs: ["number|null", null, "scene-relative ms the settled sun starts going out, ending the beat on the glass + wordmark alone. null = it stays as the mark's core, exactly as before. Set it AFTER the wordmark has landed (wordAtMs+wordDurMs) — the light leaving while the type is still arriving reads as one muddled event instead of a handover"],
      sunFadeDurMs: ["number", 780, "the whole departure; the hollow is dark at sunFadeAtMs+this"],
      sunFadeCore: ["number", 0.72, "fraction of that window the CORE takes. Below 1 the core goes first, the bloom next and the wide halo last, so the point of light dissolves outward into its own glow; at 1 all three go together and it reads as a dimmer being turned down"],
      sunSoak: ["number", 0.18, "how much of the departing light the glass keeps — the shards' bloom lifts by this fraction across the fade and HOLDS. Without it the hollow reads as suddenly empty: the halo had been lighting the facets from the middle, so removing it dims the mark as well. 0 = the light just leaves"],
    },
    render: (c, t) => (
      <ApertureIgnite t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)}
        // The uid becomes an SVG gradient id, so anything that is not a word
        // character has to go or two of these on one stage collide.
        uid={`ai${String(c.id ?? c.startMs).replace(/\W+/g, "")}`}
        blades={c.blades} size={c.size} hole={c.hole} gap={c.gap}
        twistDeg={c.twistDeg} rotDeg={c.rotDeg}
        cx={c.cx} cy={c.cy} lockX={c.lockX} colours={c.colours}
        glassAlpha={c.glassAlpha} edgeAlpha={c.edgeAlpha} edgeW={c.edgeW} bloom={c.bloom}
        sun={c.sun} sunWarm={c.sunWarm}
        sparkR={c.sparkR} peakR={c.peakR} sunR={c.sunR} coreR={c.coreR}
        orbitWobble={c.orbitWobble} sunDepth={c.sunDepth}
        trail={c.trail} tailDeg={c.tailDeg} flare={c.flare} restGlow={c.restGlow}
        text={c.text} boldFrom={c.boldFrom} wordSize={c.wordSize} tracking={c.tracking}
        weightLight={c.weightLight} weightBold={c.weightBold} font={c.font ?? null}
        word={c.word} markGap={c.markGap} lockSize={c.lockSize ?? null}
        igniteAtMs={c.igniteAtMs} igniteDurMs={c.igniteDurMs} peakHoldMs={c.peakHoldMs}
        condenseDurMs={c.condenseDurMs}
        orbitAtMs={c.orbitAtMs} orbitDurMs={c.orbitDurMs}
        leadDeg={c.leadDeg} trailDeg={c.trailDeg}
        shardDurMs={c.shardDurMs} shardHotMs={c.shardHotMs}
        fallAtMs={c.fallAtMs} fallDurMs={c.fallDurMs}
        slideAtMs={c.slideAtMs} slideDurMs={c.slideDurMs}
        wordAtMs={c.wordAtMs} wordDurMs={c.wordDurMs} wordRise={c.wordRise}
        sunFadeAtMs={c.sunFadeAtMs ?? null} sunFadeDurMs={c.sunFadeDurMs}
        sunFadeCore={c.sunFadeCore} sunSoak={c.sunSoak} />
    ),
  },

  "drawn-endcard": {
    note: "Hand-drawn logo resolve: a paper wipe + marker stroke erase the frame, the outline collapses through a spiral into a dot, the dot flips to a brand colour and grows a drawn asterisk, then a serif wordmark types on beside it. The produced-motion-graphics outro.",
    nativeMs: 5550,
    params: {
      text: ["string", "Claude", "the wordmark typed beside the mark"],
      wipeAtMs: ["number", 550, "scene-relative ms the paper wipe starts"],
      wipeDurMs: ["number", 550, "wipe sweep duration"],
      collapseAtMs: ["number", 1100, "outline starts un-drawing into the spiral"],
      collapseDurMs: ["number", 900, "collapse ends as a dot at (popX,popY)"],
      markAtMs: ["number", 2000, "dot flips to accent and spikes grow"],
      slideAtMs: ["number", 2620, "asterisk slides left onto the lockup"],
      typeAtMs: ["number", 2760, "wordmark starts typing, left-anchored"],
      cps: ["number", 15.5, "type-on characters per second"],
      textSize: ["number", 101, "wordmark font px (stage 1280x720)"],
      textLeft: ["number", 527, "wordmark left edge x"],
      textBaseline: ["number", 383, "wordmark baseline y"],
      font: ["string", "Georgia serif stack", "wordmark font family"],
      markX: ["number", 470, "asterisk centre x at rest"],
      markY: ["number", 344, "asterisk centre y at rest"],
      popX: ["number", 627, "collapse dot / asterisk pop centre x"],
      popY: ["number", 349, "collapse dot / asterisk pop centre y"],
      markR: ["number", 40, "asterisk spike tip radius px"],
      ink: ["rgb", [25, 24, 22], "stroke + wordmark colour"],
      accent: ["rgb", [211, 114, 86], "asterisk terracotta"],
      paper: ["rgb", [250, 249, 245], "the wipe's paper white"],
    },
    render: (c, t) => (
      <DrawnEndcard t={t} start={s(c.startMs)}
        wipeAt={s(c.wipeAtMs ?? 550)} wipeDur={s(c.wipeDurMs ?? 550)}
        collapseAt={s(c.collapseAtMs ?? 1100)} collapseDur={s(c.collapseDurMs ?? 900)}
        markAt={s(c.markAtMs ?? 2000)} slideAt={s(c.slideAtMs ?? 2700)}
        typeAt={s(c.typeAtMs ?? 2740)} cps={c.cps ?? 15.5}
        text={c.text ?? "Claude"} textSize={c.textSize ?? 101}
        textLeft={c.textLeft ?? 527} textBaseline={c.textBaseline ?? 383}
        font={c.font ?? undefined} letterSpacing={c.letterSpacing ?? "0em"}
        markX={c.markX ?? 470} markY={c.markY ?? 344}
        popX={c.popX ?? 627} popY={c.popY ?? 349} markR={c.markR ?? 40}
        ink={c.ink ?? [25, 24, 22]} accent={c.accent ?? [211, 114, 86]}
        paper={c.paper ?? [250, 249, 245]} stroke={c.stroke ?? 10}
      />
    ),
  },

  "phone-chat": {
    note: "A produced in-film phone UI: cream drawn-device frame on the set colour, chat header, scrolling thread of user bubbles / streaming serif replies / tool-result cards / a salmon thinking mark, and a composer that types on and sends. For films whose 'product footage' is itself styled motion graphics. All cues are SCENE-RELATIVE ms.",
    nativeMs: 15500,
    params: {
      title: ["string", "Claude", "header wordmark (serif bold)"],
      subtitle: ["string", "", "lighter serif next to the title, e.g. a model name"],
      scroll: ["array", [], "[{atMs, y, durMs, ease:'out'|'expo'|'inout'}] — thread offset keys in stage px; content translates up by y, easing INTO each key across durMs"],
      items: ["array", [], "flow items, stacked top to bottom, each with atMs (omit = visible from scene start), optional hideAtMs (unmounts, later items shift up — how a spinner is replaced in place) and optional role. Kinds: {kind:'label', text} tiny sender name · {kind:'bubble', text} user sans bubble · {kind:'paragraph', text, streamMs, w?, size?} serif reply revealed word by word (w caps width so wrap points match a reference) · {kind:'card', rows:[...]} white tool card, rows typed cardHeader|fieldLabel|title|body|bullet|kv|button each with atMs (cardHeader: icon 'calendar'|'envelope'; body: muted, \\n keeps line breaks; bullet: muted:false for ink; button: enableAtMs flips it grey->ink, burstAtMs flashes drawn emphasis strokes around it) · {kind:'mark', thinkUntilMs, cycle} salmon asterisk, spins (cycle:false) or cycles drawn frames until thinkUntilMs then rests · {kind:'confetti', durMs} measured dot burst anchored to the previous item · {kind:'gap', h}"],
      composer: ["object", null, "{placeholder, text, typeAtMs, cps, hideAtMs, idleTop, typingTop, iconRowY} — placeholder fades as typing starts; send button appears with the first character; hideAtMs slides the panel away (the send). idleTop/typingTop move the panel top (screen-relative px) as typing begins; iconRowY pins the icon row at a fixed screen y while the panel grows"],
      greeting: ["object", null, "{line1, line2, atMs, hideAtMs} — centred serif welcome under a drawn salmon mark, e.g. the film's 'How can I help you / this morning?'. Hides on send"],
      intro: ["object", null, "{handAtMs, handExitAtMs, drawAtMs, drawDurMs, fadeAtMs} — the hand-drawn opener: a line-art hand places a paper slab, a wobbly outline self-draws with ~8Hz line boil from drawAtMs, and from fadeAtMs outline+slab resolve into the clean device"],
      chromeAtMs: ["number|null", null, "when the header + composer chrome fade in (after the drawn intro); null = visible from scene start"],
    },
    render: (c, t) => {
      const abs = (ms) => (ms == null ? null : s(c.startMs + ms));
      const cfg = {
        title: c.title, subtitle: c.subtitle,
        scroll: (c.scroll ?? []).map((k) => ({ atS: s(c.startMs + k.atMs), y: k.y, durS: k.durMs != null ? s(k.durMs) : undefined, ease: k.ease })),
        items: (c.items ?? []).map((it) => ({
          ...it,
          _atS: abs(it.atMs),
          _hideS: abs(it.hideAtMs),
          _streamS: it.streamMs != null ? s(it.streamMs) : undefined,
          _thinkUntilS: abs(it.thinkUntilMs),
          _durS: it.durMs != null ? s(it.durMs) : undefined,
          rows: it.rows ? it.rows.map((r) => ({ ...r, _atS: abs(r.atMs ?? 0), _enableS: abs(r.enableAtMs), _burstS: abs(r.burstAtMs) })) : undefined,
        })),
        composer: c.composer ? {
          placeholder: c.composer.placeholder ?? "",
          text: c.composer.text ?? "",
          typeAtS: abs(c.composer.typeAtMs),
          cps: c.composer.cps ?? 30,
          hideAtS: abs(c.composer.hideAtMs),
          idleTop: c.composer.idleTop,
          typingTop: c.composer.typingTop,
          iconRowY: c.composer.iconRowY,
        } : null,
        greeting: c.greeting ? {
          line1: c.greeting.line1, line2: c.greeting.line2,
          atS: abs(c.greeting.atMs ?? 0), hideAtS: abs(c.greeting.hideAtMs),
        } : null,
        intro: c.intro ? {
          handAtS: abs(c.intro.handAtMs ?? 350),
          handExitAtS: abs(c.intro.handExitAtMs ?? 2050),
          drawAtS: abs(c.intro.drawAtMs ?? 1620),
          drawDurS: s(c.intro.drawDurMs ?? 560),
          fadeAtS: abs(c.intro.fadeAtMs ?? 2450),
        } : null,
        chromeAtS: abs(c.chromeAtMs),
      };
      return <PhoneChat t={t} from={s(c.startMs)} to={s(c.startMs + c.durationMs)} cfg={cfg} />;
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
