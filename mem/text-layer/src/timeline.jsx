/**
 * timeline.jsx — mem's text beats.
 *
 * Every time and position here was read off the reference frame by frame at
 * 24-30fps, not from a sparse contact sheet.
 *
 *   0.0 – 3.15   "Remembering is so"  groups write on; a highlight sweeps "mem"
 *   2.78 – 4.56  "yesterday"          two per-character waves: enter, recolour
 *   4.56 – 11.0  one running sentence on beige, assembling itself:
 *                  "Meet" · "your" · "new"
 *                  "notes app" · "second brain" · "thought partner"
 *
 * The beige stretch is the part that was previously wrong: it is not three
 * unrelated slides, it is ONE sentence, and the closing phrase swaps while
 * words slide through horizontally.
 */

import React from "react";
import { C } from "./theme.js";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
import { RevealLine, WaveText, WordBeat, PanCanvas, ClipWord,
         Statement, TypeOn, Highlight, ProductSlot, SweepText, FadeWord, GroupXform, Pill, LogoSlot } from "./effects.jsx";

// Camera easings, named from measured peak/mean velocity ratios.
const QUINT_INOUT = (p) => (p < 0.5 ? 16 * p * p * p * p * p : 1 - Math.pow(-2 * p + 2, 5) / 2);
const CUBIC_INOUT = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/**
 * COPY CATALOGUE — read this before retargeting the template.
 *
 * The strings in this timeline are NOT all the same kind of thing, and a model
 * adapting this to another product needs to tell them apart:
 *
 *   brand         marketing copy. REPLACE THIS with the new product's message.
 *                 "Capture anything", "Turn brain dumps into beautiful notes",
 *                 "Find anything", "Deep Search", "Not another notes app",
 *                 "Your go-to thought partner", "Let Mem take / notes for you",
 *                 "and recall everything with", "Mem Chat", "and of course",
 *                 "Remembering is so / yesterday", "Meet your new ...".
 *
 *   product-voice DIEGETIC — the product speaking back to its user inside a
 *                 demo scenario. It is dialogue, not a slogan. Keep the VOICE
 *                 (assistant confirming an action) and rewrite the specifics.
 *                   - "I’ve created a to-do list for you"
 *                   - "I’ve added it to your 2pm meeting agenda with Sarah"
 *                     (in a product shot, not rebuilt here)
 *
 *   user-voice    DIEGETIC — the user's own words being captured by the
 *                 product. Also dialogue. Same rule: keep the voice, swap the
 *                 content.
 *                   - "Tell Mem what to remember"   (typed prompt)
 *                   - "I need to ask Sarah about the domain name"  (a note)
 *                   - "What if there was WeWork for dogs?"  (in a product shot)
 *
 *   feature       the seven pills. A literal feature list — swap for the new
 *                 product's features, keep the count and the cadence.
 *
 * "Sarah", "WeWork for Dogs", "2pm meeting" are all part of mem's fictional
 * demo scenario. They are placeholders in the same sense the product shots
 * are — not brand voice, and they should be replaced wholesale.
 */

export const DURATION = 78.5;

/**
 * Ground colour cuts with the beat — mem never crossfades the background, it
 * switches on a single frame. Sampled per segment off the reference.
 */
export function bgAt(t) {
  if (t < 4.5379) return C.white;          // opening
  if (t < 17.451) return C.cream;          // sentence, product, "Capture anything"
  if (t < 35.702) return C.white;          // product shots, typing beat, Sarah line
  if (t < 31.90) return C.greyWarm;        // voice mode / transcript
  if (t < 35.90) return C.white;           // typing beat
  if (t < 38.50) return C.grey;            // "I've added it..."
  if (t < 38.205) return [240, 230, 212]; // beige lightbulb
  if (t < 45.145) return C.white;         // Mem / remembers / for you, then phone
  if (t < 45.145) return C.white;          // meeting prep
  if (t < 46.947) return [249, 245, 235];  // cream canvas, "Find anything"/"with"
  if (t < 48.315) return [22, 28, 78];     // navy sphere filling frame, "Deep Search"
  if (t < 48.315) return C.white;
  if (t < 51.485) return [15, 17, 46];     // desktop search board
  if (t < 56.323) return C.white;          // "and recall everything with"
  if (t < 58.225) return [237, 225, 203];  // "Mem Chat" cream
  if (t < 65.299) return [232, 232, 232];  // chat answering, to-do list
  if (t < 66.166) return [237, 225, 203]; // "and of course"
  if (t < 71.772) return C.white;         // pills + "Not another notes app"
  if (t < 76.543) return [237, 225, 203]; // closing line + brand mark
  return C.white;                          // wordmark
}

// Shared motion vocabulary for the sentence marquee.
const RISE = { dy: 150, ease: "expo" };
const FROM_RIGHT = { dx: 1150, ease: "expo", fade: false };
const OUT_LEFT = { dx: -1250, ease: "expo", fade: false };
const OUT_UPLEFT = { dx: -420, dy: -150, ease: "expo" };

export const BEATS = [
  // ── 0.133–2.836  "Remembering is so"   (native frames 4–85)
  //
  // Syllable arrivals to the frame: Re .133 / mem .868 / ber 1.168 / ing 1.335
  // / is 1.535 / so 1.602. Letters inside a syllable arrive TOGETHER — the
  // reveal unit is the syllable. Each fades up at its final colour, linearly,
  // over ~0.28s (the two trailing words take ~0.36s). Only "Re" is blurred in.
  //
  // Underneath all of that the whole line is scaling 1.83x -> 1.00x linearly
  // over 1.168s, which is what makes the early frames read as drifting right.
  // A pale sweep crosses "mem" once, 1.27 -> 2.00s, ~0.15s per letter.
  // The line is centred on the width of "Remembering" until " is so" arrives,
  // then re-centres on the full string — so it starts 34px (68 stage) right of
  // final and settles back, rather than sliding left from centre. Exit is a
  // right-to-left dissolve from 2.302 while the line accelerates away.
  {
    from: 0.0, to: 2.90,
    render: (t) => (
      <RevealLine
        t={t}
        start={0.133}
        size={72}
        weight={430}
        y={-6}
        x={68}
        scaleFrom={1.83}
        scaleDur={1.168}
        slideAt={1.301}
        slideDx={-68}
        slideDur={0.834}
        exitAt={2.302}
        exitSweep={0.55}
        exitFade={0.20}
        exitSlideDx={-300}
        exitSlideDur={0.55}
        blurIn={9}
        exitBlur={14}
        groups={[
          { text: "Re", at: 0.133, dur: 0.334, colour: C.ink, blurIn: true },
          { text: "mem", at: 0.868, dur: 0.27, colour: C.salmon,
            shimmer: { start: 1.27, dur: 0.73, width: 0.62, amount: 0.55 } },
          { text: "ber", at: 1.168, dur: 0.28, colour: C.ink },
          { text: "ing", at: 1.335, dur: 0.29, colour: C.ink },
          { text: " is", at: 1.535, dur: 0.37, colour: C.ink },
          { text: " so", at: 1.602, dur: 0.35, colour: C.ink },
        ]}
      />
    ),
  },

  // ── 2.820–4.538  "yesterday"   (native frames 85–135)
  //
  // Measured, and NOT what it looks like: the word slides in FROM THE RIGHT at
  // FULL SIZE (centre x 354→320 native, ease-out, f102–f115), heavily motion
  // blurred. What reads as a per-character stagger is the frame edge clipping
  // it as it travels in. A left→right colour sweep runs coral→navy over 0.47s
  // (f102–f116). Then it SHRINKS on an accelerating curve from f110, reaching
  // scale 0.599 at f135 — and is cut mid-flight, never reaching a rest size.
  // No opacity fade anywhere; the lightening is motion blur over white.
  {
    from: 2.820, to: 4.5379,
    render: (t) => (
      <WaveText
        t={t}
        start={2.820}
        text="yesterday"
        size={280}
        weight={500}
        hot={C.salmon}
        to={C.ink}
        slideFromPx={470}
        slideDur={0.60}
        sweepStart={0.567}
        sweepDur={0.47}
        shrinkStart={3.673}
        shrinkDur={0.83}
        shrinkTo={0.599}
        maxBlur={26}
      />
    ),
  },

  // ── 4.5379–5.2719  "Meet"   (native frames 136–157)
  //
  // Does NOT pop in static. It enters oversized and shrinks to rest, picking up
  // the size "yesterday" was cut at, so the two read as ONE continuous move
  // through the cut. Frame 137 measures 1.472x and the excess decays by a
  // factor of ~0.71 per frame — an exponential, tau ~= 0.098s — landing exactly
  // on 1.000 at frame 149/150. Back-extrapolating that curve puts frame 136 at
  // ~1.7x; the raw bbox there reads 2.0-2.2x but frame 136 is the most heavily
  // motion-blurred frame in the shot, so that reading is blur, not glyph.
  // No opacity fade, no overshoot.
  {
    from: 4.5379, to: 5.2719,
    render: (t) => (
      <WordBeat
        t={t} from={4.5379} to={5.2719} size={88} words={[{ text: "Meet" }]}
        enter={{ scale: 1.664, ease: "expo", fade: false, blur: 22 }} enterDur={0.467}
        exit="cut"
      />
    ),
  },

  // ── 5.2719–5.8058  "your"   (native frames 158–174)
  // Hard cut both ends, and measured COMPLETELY STATIC — 64.10px on its first
  // frame, no entrance scale at all. The big scale-in is unique to "Meet".
  // Sits ~1px lower than "Meet" on the same baseline; real, cause unknown.
  {
    from: 5.2719, to: 5.8058,
    render: (t) => (
      <WordBeat t={t} from={5.2719} to={5.8058} size={88} y={2} words={[{ text: "your" }]} />
    ),
  },

  // ── 5.8392–6.2727  "new"   (native frames 175–188)
  //
  // Never holds still: it is already 16px left and 4px up on its first frame
  // and moving. The exit is a rigid PAN along a circular arc (radius 408px,
  // 42 degrees swept), not a straight slide — a straight-line fit leaves 18px
  // of residual. Travels dx -246 / dy -158 native over 0.400s, ACCELERATING.
  // No scale, no fade, and — unlike "Meet" — no motion blur at any speed.
  {
    from: 5.8392, to: 6.2727,
    render: (t) => (
      <WordBeat
        t={t} from={5.8392} to={5.8392} size={88} x={-33} y={-8}
        words={[{ text: "new" }]}
        enter="cut"
        exit={{ dx: -492, dy: -316, ease: "in", easePow: 1.45, fade: false }}
        exitDur={0.400}
      />
    ),
  },

  // ── 6.20–11.0  "notes app" / "second brain" / "thought partner"
  //
  // ONE CAMERA PAN over a static canvas — not three phrases entering and
  // leaving. Sub-pixel frame registration shows the three phrases pinned at
  // fixed canvas positions with the residual flat to +-1px once the camera is
  // subtracted. "second slides in from the right" and "notes rises from below"
  // are the SAME move seen at different moments.
  //
  // Canvas offsets come from the measured camera deltas: notes app -> second
  // brain is 444px native, second brain -> thought partner is 671px (just over
  // one screen width). Camera scale is exactly 1.000 until the closing dolly.
  //
  // On top of the camera each WORD does exactly one thing: slides up from
  // behind a hard clip line. No fade, no blur, no scale, no horizontal
  // component. Second word of each phrase lags the first by 467ms (400ms for
  // the two-line phrase).
  {
    from: 6.20, to: 11.90,
    render: (t) => (
      <PanCanvas
        t={t}
        zoom={{ at: 9.90, dur: 0.62, to: 2.6 }}
        keys={[
          { t: 6.20, x: 400, y: -960 },
          // Arrival settles vertically later than horizontally — two decay
          // rates on the same move.
          { t: 7.30, x: 476, y: 6, ease: (p) => 1 - Math.pow(1 - p, 2.2) },
          { t: 7.60, x: 560, y: 6, ease: (p) => p },
          // peak/mean velocity 1.83 -> quintic ease-in-out
          { t: 8.60, x: 1396, y: 8, ease: QUINT_INOUT },
          // peak/mean 1.60 -> sine/cubic ease-in-out
          { t: 9.70, x: 2776, y: 172, ease: CUBIC_INOUT },
          { t: 11.0, x: 2860, y: 186, ease: (p) => p },
        ]}
      >
        <ClipWord t={t} at={6.32} dur={0.334} text="notes"   x={0}    y={-69}   easePow={2.1} />
        <ClipWord t={t} at={6.787} dur={0.334} text="app"    x={230}  y={-69}   easePow={2.1} />
        <ClipWord t={t} at={7.63} dur={0.334} text="second"  x={1170} y={-67}   easePow={2.1} />
        <ClipWord t={t} at={8.10} dur={0.367} text="brain"   x={1462} y={-67}   easePow={2.1} />
        <ClipWord t={t} at={9.036} dur={0.364} text="thought" x={2460} y={77} easePow={1.45} />
        <ClipWord t={t} at={9.17} dur={0.630} text="partner" x={2476} y={163} easePow={1.45} />
      </PanCanvas>
    ),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11.9s onward.
  //
  // IMPORTANT — different fidelity from everything above. Beats 0–11s were
  // measured frame-by-frame at 24–30fps. The beats below were laid out from a
  // 1-second survey pass: the COPY, the CUT TIMING and the ground colours are
  // right, but per-beat motion is built from the preset vocabulary rather than
  // measured. They need the same dense treatment to match properly.
  //
  // Product footage is deliberately NOT imitated — each shot is reserved as a
  // labelled slot to be replaced by the Kite 3D renders.
  // ═══════════════════════════════════════════════════════════════════════════

  // MEASURED. Frame-exact boundaries: product runs to f494 (16.503), text
  // occupies f495-522, product resumes f523 (17.451).
  { from: 11.90, to: 16.503, render: (t) => (
      <ProductSlot t={t} from={11.90} to={16.503} index={1} bg={C.cream}
        label="product demo" /> ) },

  // "Capture anything" — 16.517-17.417.
  //
  // No entry animation at all: it is already final size, full opacity and
  // stationary, and gets UNCOVERED as the previous shot's phone slides off to
  // the left. The apparent left-to-right build is the phone edge, not the text
  // — its glyph boxes are pixel-identical across the reveal.
  //
  // It is pure BLACK, with no permanent accent colour. The colour is a single
  // travelling wave (see SweepText). Exit is a hard ease-in scale-down to 0.54,
  // cut mid-flight.
  { from: 16.517, to: 17.451, render: (t) => (
      <SweepText t={t} from={16.517} text="Capture anything"
        size={68} weight={430} base={[0, 0, 0]}
        sweepAt={16.680} crossDur={0.124} cycleDur={0.334}
        exitAt={16.984} exitDur={0.434} exitScale={0.543} exitPow={3.5} /> ) },

  { from: 17.451, to: 20.220, render: (t) => (
      <ProductSlot t={t} from={17.451} to={20.220} index={2} bg={C.white}
        label="product demo" /> ) },

  // "Turn brain dumps / into beautiful notes" — 20.220-21.155.
  //
  // Nothing scales here (checked explicitly: sX=1.0000, sY within 0.25%).
  // Line 1 drops ~25px and lands hard — 54% of the travel in the first frame.
  // Line 2 starts 167ms later, drops ~29px AND fades 0.10 -> 1.00, landing 9
  // frames after line 1. Then 400ms of dead hold, then a hard cut.
  { from: 20.220, to: 21.188, render: (t) => (
      <WordBeat t={t} from={20.220} to={21.188} size={83} colour={[25, 23, 39]}
        stack lineHeight={0.94} exit="cut"
        words={[
          { text: "Turn brain dumps", delay: 0.067,
            enter: { dy: 25, ease: "expo", fade: false }, enterDur: 0.133 },
          { text: "into beautiful notes", delay: 0.234,
            enter: { dy: 29, ease: "ease" }, enterDur: 0.267 },
        ]} /> ) },

  { from: 21.188, to: 24.90, render: (t) => (
      <ProductSlot t={t} from={21.188} to={24.90} index={3} bg={C.white}
        label="product demo" /> ) },

  // ── 24.79–25.69  "Let Mem take meeting"
  //
  // Words fade in per WORD (linear, 100ms each, no character stagger) at
  // 0 / +200 / +234ms, while the WHOLE PHRASE runs one global transform:
  // translate 272px left on an exponential (tau 0.19s, 71% of the distance in
  // the first third) and scale UP to 1.147x, then reverse into an accelerating
  // scale-DOWN to 0.921x that is cut mid-motion. Fitting one affine map through
  // all three word centroids lands the middle word within 0.5px, so this is a
  // single transform, not three animations.
  //
  // "Mem" additionally takes a soft left-to-right colour wipe navy -> orange,
  // linear over 434ms with a ~30px feather.
  { from: 24.791, to: 25.692, render: (t) => (
      <GroupXform t={t} from={24.791} originX={541} originY={372}
        keys={[
          { t: 24.791, s: 1.000, x: 272 },
          { t: 25.092, s: 1.147, x: 60, ease: "expo" },
          { t: 25.358, s: 1.147, x: 0, ease: "expo" },
          { t: 25.692, s: 1.056, x: 0, ease: "in", pow: 2.4 },
        ]}>
        <FadeWord t={t} from={24.791} to={25.692} text="Let" cx={214} baseline={400}
          size={98} colour={[3, 1, 20]} enter={{ dur: 0.100, ease: "linear" }} />
        <SweepText t={t} from={24.791} text="Mem" size={98} weight={430}
          base={[3, 1, 20]} hot={[238, 74, 48]} cool={[238, 74, 48]}
          sweepAt={24.825} crossDur={0.434} cycleDur={0.30} permanent
          cx={404} baseline={400} />
        <FadeWord t={t} from={24.992} to={25.692} text="take" cx={616} baseline={400}
          size={98} colour={[3, 1, 20]} enter={{ dur: 0.100, ease: "linear" }} />
        <FadeWord t={t} from={25.225} to={25.692} text="meeting" cx={936} baseline={400}
          size={98} colour={[3, 1, 20]} enter={{ dur: 0.100, ease: "linear" }} />
      </GroupXform>
  ) },

  // ── 25.73–27.89  "notes for you"
  //
  // "notes" arrives at FULL opacity — no fade, only a scale-down 0.83x in
  // 167ms. "for" (+200ms) and "you" (+267ms) fade in linearly over 167ms.
  // Through the hold the whole line keeps zooming out slowly, 0.92x over 1.1s
  // — easy to miss and definitely there. The exit is three things at once: a
  // global slide right with motion blur, "you" then "for" fading out RIGHT to
  // LEFT 167ms apart, and "notes" surviving, sliding back to frame centre and
  // collapsing to 0.64x before the cut.
  { from: 25.726, to: 27.894, render: (t) => (
      <GroupXform t={t} from={25.726} originX={664} originY={368}
        keys={[
          { t: 25.726, s: 1.205, x: 0 },
          { t: 25.893, s: 1.000, x: 0, ease: "expo" },
          { t: 27.127, s: 0.920, x: 0, ease: "linear" },
          { t: 27.327, s: 0.903, x: 62, ease: "expo" },
          { t: 27.894, s: 0.903, x: 62, ease: "linear" },
        ]}>
        <FadeWord t={t} from={25.726} to={27.894} text="notes" cx={639} baseline={400}
          size={80} colour={[3, 1, 20]}
          slide={{ at: 27.327, dx: -30, dur: 0.334, pow: 2.0 }}
          exit={{ at: 27.528, dur: 0.367, scale: 0.638, ease: "in", pow: 2.4, fade: false }} />
        <FadeWord t={t} from={25.926} to={27.528} text="for" cx={787} baseline={400}
          size={80} colour={[3, 1, 20]} enter={{ dur: 0.167, ease: "linear" }}
          exit={{ at: 27.361, dur: 0.167, ease: "linear" }} />
        <FadeWord t={t} from={26.193} to={27.361} text="you" cx={912} baseline={400}
          size={80} colour={[3, 1, 20]} enter={{ dur: 0.167, ease: "linear" }}
          exit={{ at: 27.194, dur: 0.167, ease: "linear" }} />
      </GroupXform>
  ) },

  { from: 27.928, to: 31.531, render: (t) => (
      <ProductSlot t={t} from={27.928} to={31.531} index={4} bg={C.white}
        label="product demo" /> ) },

  // Per-character multicolour with a caret.
  // ── 31.56–33.90  "Tell Mem what to remember"
  //
  // ENDS AT 33.90, not 35.9. Base cadence 1 char / 2 frames (15 char/s) with
  // authored holds — a 0.30s pause after "Tell Mem" — averaging 12.8 char/s.
  // The line is centre-anchored and re-centres on each keystroke, stepping in a
  // single frame and sitting geometrically frozen between them: no easing at
  // all. Characters just appear, full size and opacity, in one frame.
  // Exit is a uniform scale about frame centre, cut mid-animation.
  { from: 31.565, to: 33.900, render: (t) => (
      <TypeOn t={t} start={31.565} text="Tell Mem what to remember"
        cps={13.2} size={248} weight={430}
        exitAt={33.466} exitDur={0.434} /> ) },

  // ── 33.93–35.67  "I need to ask Sarah about the domain name"
  //
  // Same sans-serif on a DEAD STRAIGHT baseline — the "handwritten curve" is a
  // transient wave that travels the line AFTER typing finishes, at ~80px/frame,
  // peaking larger toward the right end. Enters as a uniform scale-down from
  // 1.488x (the exit curve time-reversed) and leaves by pure vertical
  // translation upward, accelerating, cut while still on screen.
  { from: 33.934, to: 35.669, render: (t) => (
      <FadeWord t={t} from={33.934} to={35.669} text="I need to ask Sarah about the domain name"
        cx={640} baseline={382} size={62} colour={[0, 0, 0]}
        enter={{ scale: 1.488, dur: 0.367, ease: "expo", fade: false }}
        exit={{ at: 35.202, dur: 0.467, dy: -420, ease: "in", pow: 2.8, fade: false }} /> ) },

  { from: 35.702, to: 37.404, render: (t) => (
      <ProductSlot t={t} from={35.702} to={37.404} index={5} bg={[229, 229, 229]}
        label="product demo" /> ) },

  { from: 37.437, to: 38.205, render: (t) => (
      <ProductSlot t={t} from={37.437} to={38.205} index={6} bg={[240, 230, 212]}
        label="line-art graphic" /> ) },

  // ── 38.24–40.57  "Mem" / "remembers" / "for you"
  //
  // Three states in ONE continuous white shot, separated by fades rather than
  // cuts. Type size shrinks through the cascade (x-height 29 / 26 / 22).
  // In "remembers" only the middle "mem" is coral — and it is static, not a
  // sweep. "for" and "you" are the SAME colour; "you" only reads lighter
  // because its fade-in has not finished when the shared fade-out starts.
  { from: 38.238, to: 39.039, render: (t) => (
      <FadeWord t={t} from={38.238} to={39.039} text="Mem"
        cx={628} baseline={398} size={112} colour={[16, 14, 32]}
        enter={{ dy: 36, dur: 0.367, ease: "expo" }}
        exit={{ at: 38.839, dur: 0.200, dx: -24, ease: "in", pow: 2.0 }} /> ) },

  { from: 39.072, to: 39.973, render: (t) => (
    <>
      <FadeWord t={t} from={39.072} to={39.973} text="re" cx={438} baseline={394}
        size={100} colour={[16, 14, 32]} enter={{ dx: 26, dur: 0.267, ease: "expo" }}
        exit={{ at: 39.706, dur: 0.267, scale: 0.810, ease: "in", pow: 2.4 }} />
      <FadeWord t={t} from={39.072} to={39.973} text="mem" cx={590} baseline={394}
        size={100} colour={[238, 95, 82]} enter={{ dx: 26, dur: 0.267, ease: "expo" }}
        exit={{ at: 39.706, dur: 0.267, scale: 0.810, ease: "in", pow: 2.4 }} />
      <FadeWord t={t} from={39.072} to={39.973} text="bers" cx={790} baseline={394}
        size={100} colour={[16, 14, 32]} enter={{ dx: 26, dur: 0.267, ease: "expo" }}
        exit={{ at: 39.706, dur: 0.267, scale: 0.810, ease: "in", pow: 2.4 }} />
    </>
  ) },

  { from: 40.007, to: 40.574, render: (t) => (
    <>
      <FadeWord t={t} from={40.007} to={40.574} text="for" cx={572} baseline={390}
        size={86} colour={[11, 10, 19]} enter={{ dy: 18, dur: 0.234, ease: "expo" }}
        exit={{ at: 40.374, dur: 0.200, ease: "linear" }} />
      <FadeWord t={t} from={40.174} to={40.574} text="you" cx={730} baseline={390}
        size={86} colour={[11, 10, 19]} enter={{ dy: 18, dur: 0.234, ease: "expo" }}
        exit={{ at: 40.374, dur: 0.200, ease: "linear" }} />
    </>
  ) },

  { from: 40.607, to: 45.145, render: (t) => (
      <ProductSlot t={t} from={40.607} to={45.145} index={7} bg={C.white}
        label="product demo" /> ) },

  // ── 45.18–47.41  "Find anything" → "with"
  //
  // MEASURED, and two things I had wrong: "anything" is NOT blue — it is the
  // same near-black navy as "Find", and what reads as blue is a blue SPHERE
  // orbiting in front of the letters. And this is not a flat 2D beat: it is a
  // 3D scene of four spheres orbiting a camera-facing text plane (occlusion
  // order flips as they pass front-to-back). I render the text only.
  //
  // "Find" enters at 1.13x and settles in 0.20s, then REFLOWS 101.5px left
  // (203 stage) over 0.634s to make room for "anything", which fades up
  // LINEARLY over 0.30s with no stagger. Both then scale DOWN to ~0.80 on an
  // ease-in and are replaced by a hard cut — not faded out.
  { from: 44.645, to: 46.146, render: (t) => (
    <>
      <FadeWord t={t} from={44.645} to={46.146} text="Find"
        cx={633} baseline={399} size={112} colour={[16, 12, 30]}
        enter={{ scale: 1.13, dur: 0.20, ease: "expo" }}
        slide={{ at: 45.045, dx: -203, dur: 0.634, pow: 2.5 }}
        exit={{ at: 45.812, dur: 0.334, scale: 0.80, ease: "in", pow: 2.6, fadeAmt: 0.18 }} />
      <FadeWord t={t} from={45.312} to={46.146} text="anything"
        cx={762} baseline={399} size={112} colour={[16, 12, 30]}
        enter={{ dur: 0.30, ease: "linear" }}
        exit={{ at: 45.812, dur: 0.334, scale: 0.80, ease: "in", pow: 2.6, fadeAmt: 0.18 }} />
    </>
  ) },

  // ── 46.15–46.88  "with" — enters at 1.28x with motion blur, settles 0.37s,
  // holds 0.33s, then a 2-frame pure fade as the navy sphere swallows it.
  // Measured 6% larger than "Find anything"; cause unknown.
  { from: 46.146, to: 46.914, render: (t) => (
      <FadeWord t={t} from={46.146} to={46.914} text="with"
        cx={638} baseline={403} size={119} colour={[16, 12, 30]} blurIn={16}
        enter={{ scale: 1.28, dur: 0.37, ease: "pow", pow: 2.5, from0: false }}
        exit={{ at: 46.847, dur: 0.067, ease: "linear" }} /> ) },

  // ── 46.95–48.18  "Deep Search"
  //
  // NOT a separate dark-blue shot: the navy sphere from the previous beat
  // scales up x15 and becomes the background. Pale blue text with a real bloom
  // (half-intensity radius ~15px, filling the letter counters). Holds 0.83s
  // dead static, then an accelerating dolly 2.34x — only ~6% of the log-scale
  // change in the first third — and blows out.
  { from: 46.947, to: 48.215, render: (t) => (
      <FadeWord t={t} from={46.947} to={48.215} text="Deep Search"
        cx={631} baseline={387} size={112} weight={430} colour={[205, 233, 255]}
        glow={{ r: 40, colour: [120, 175, 255] }}
        enter={{ dur: 0.16, ease: "linear" }}
        exit={{ at: 47.913, dur: 0.30, scale: 2.34, ease: "in", pow: 3.2, fade: false }} /> ) },

  { from: 48.315, to: 51.485, render: (t) => (
      <ProductSlot t={t} from={48.315} to={51.485} index={8} bg={[15, 17, 46]}
        label="product demo" ink={[235, 238, 250]} /> ) },

  // ── 51.72–56.29  "and · recall · everything · with"
  //
  // NOT a camera pan — tested and excluded. The 2x2 circle cluster holds the
  // exact same pixel cells for the whole 4.6s while "and" travels 161px, so no
  // global transform can explain it. Words cross-fade in place at their own
  // positions and their own sizes ("everything" is 0.81x the others).
  //
  // Each word enters with a fade plus a short INWARD slide (~10px) on a clean
  // exponential, tau ~95ms — position and opacity share the same time constant.
  { from: 51.718, to: 54.421, render: (t) => (
    <>
      <FadeWord t={t} from={51.718} to={54.421} text="and"
        cx={642} baseline={397} size={105} colour={[16, 15, 32]} blurOut={9}
        slide={{ at: 52.352, dx: -325, dur: 0.601, ease: "inout" }}
        exit={{ at: 54.021, dur: 0.434 }} />
      <FadeWord t={t} from={53.421} to={54.421} text="recall"
        cx={955} baseline={392} size={105} colour={[16, 15, 32]} blurOut={9}
        enter={{ dx: -15, dur: 0.30, ease: "expo" }}
        exit={{ at: 54.021, dur: 0.434 }} />
    </>
  ) },

  { from: 54.388, to: 56.290, render: (t) => (
    <>
      <FadeWord t={t} from={54.388} to={56.290} text="every"
        cx={158} baseline={389} size={85} colour={[16, 15, 32]} blurOut={16}
        enter={{ dx: 16, dur: 0.30, ease: "expo" }}
        exit={{ at: 56.123, dur: 0.167, fade: false }} />
      <FadeWord t={t} from={54.789} to={56.290} text="thing"
        cx={345} baseline={389} size={85} colour={[16, 15, 32]} blurOut={16}
        enter={{ dx: 15, dur: 0.30, ease: "expo" }}
        exit={{ at: 56.123, dur: 0.167, fade: false }} />
      <FadeWord t={t} from={55.422} to={56.290} text="with"
        cx={954} baseline={397} size={105} colour={[16, 15, 32]} blurOut={16}
        enter={{ dx: -15, dur: 0.30, ease: "expo" }}
        exit={{ at: 56.123, dur: 0.167, fade: false }} />
    </>
  ) },

  // ── 56.32–58.06  "Mem Chat"
  //
  // Both words are navy at rest — the blue/salmon split is a TRAVELLING COLOUR
  // WAVE, not static colouring. Each letter cycles navy → red → violet → blue
  // → navy, staggered left to right; the red front moves 11.6px/frame and each
  // letter takes 367ms to get from its red peak to its blue peak, ~0.93s for a
  // full cycle. The wave is already entering from the left on the cut frame.
  // Entry is a small scale-in, 0.943 → 1.000 in 200ms.
  { from: 56.323, to: 58.058, render: (t) => (
      <SweepText t={t} from={56.323} text="Mem Chat"
        size={88} weight={430} base={[16, 18, 43]}
        hot={[176, 82, 75]} cool={[95, 126, 230]}
        sweepAt={56.290} crossDur={0.578} cycleDur={0.930}
        scaleFrom={0.943} scaleDur={0.200}
        exitAt={57.760} exitDur={0.300} exitScale={1} exitPow={1} /> ) },

  { from: 58.225, to: 63.931, render: (t) => (
      <ProductSlot t={t} from={58.225} to={63.931} index={9} bg={[232, 232, 232]}
        label="product demo" /> ) },

  // ── 64.03–65.27  "I've created a to-do list for you"
  //
  // Never actually static: it zooms out continuously for its whole 38-frame
  // life, 1.043 -> 0.796. Entry is a 200ms fade plus a 28px block rise, with a
  // per-WORD downward dip travelling left to right at ~1 word per frame (33ms)
  // — genuinely per-word, not a camera move: on one frame the seven words sit
  // at seven different offsets. Exit is scale only, ease-in, hard cut.
  { from: 64.031, to: 65.265, render: (t) => (
      <GroupXform t={t} from={64.031} originX={640} originY={361}
        keys={[
          { t: 64.031, s: 1.043 },
          { t: 64.732, s: 1.000, ease: "expo" },
          { t: 65.065, s: 0.969, ease: "linear" },
          { t: 65.265, s: 0.796, ease: "in", pow: 2.4 },
        ]}>
        <FadeWord t={t} from={64.031} to={65.265} text="I’ve created a to-do list for you"
          cx={640} baseline={382} size={82} colour={[0, 0, 0]}
          enter={{ dy: 28, dur: 0.200, ease: "expo" }} />
      </GroupXform>
  ) },

  // ── 65.30–66.10  "and of course" — enters at 1.50x and scales down on a
  // clean exponential (tau 90ms, 76% of the change in the first third), holds
  // 200ms bit-identical, then an accelerating scale-out. No fade at all.
  { from: 65.299, to: 66.099, render: (t) => (
      <FadeWord t={t} from={65.299} to={66.099} text="and of course"
        cx={640} baseline={390} size={82} colour={[0, 0, 0]}
        enter={{ scale: 1.502, dur: 0.367, ease: "expo", fade: false }}
        exit={{ at: 65.799, dur: 0.300, scale: 0.847, ease: "in", pow: 2.4, fade: false }} /> ) },

  // ── 66.13–69.84  SEVEN feature pills, not three.
  //
  // The slab is a fixed 976x186 box centred in frame — not padded to the text.
  // Cadence accelerates hard (1.17s, 0.63, 0.43, 0.37, 0.27, 0.23) then the
  // last one holds. Only the FIRST pill scales in; the rest have zero scale.
  // "Dark Mode" alone exits by pure fade with no motion.
  { from: 66.133, to: 69.837, render: (t) => (
    <>
      <Pill t={t} from={66.133} to={67.334} text="Offline Mode"
        slab={[194, 182, 237]} colour={[30, 0, 82]} scaleFrom={1.104} exitRise={-18} />
      <Pill t={t} from={67.334} to={67.968} text="Team Sharing"
        slab={[236, 199, 233]} colour={[57, 12, 50]} exitRise={-18} />
      <Pill t={t} from={67.968} to={68.402} text="Templates"
        slab={[207, 242, 180]} colour={[42, 75, 9]} exitRise={-18} />
      <Pill t={t} from={68.402} to={68.769} text="Version History"
        slab={[165, 219, 241]} colour={[6, 57, 96]} exitRise={-18} />
      <Pill t={t} from={68.769} to={69.036} text="API Access"
        slab={[239, 184, 140]} colour={[82, 32, 0]} exitRise={-18} />
      <Pill t={t} from={69.036} to={69.270} text="Zapier Integrations"
        slab={[234, 205, 148]} colour={[80, 52, 0]} exitRise={-18} />
      <Pill t={t} from={69.270} to={69.837} text="Dark Mode"
        slab={[190, 190, 190]} colour={[36, 36, 36]} static_ />
    </>
  ) },

  // ── 69.94–71.74  "Not another notes app"
  //
  // "Not" enters at 5.6x and zooms down over 667ms on a constant log-rate
  // exponential while fading up. The other words then fade in per word, 167ms
  // apart. The whole thing then PANS: 302px left (one camera over a static
  // canvas — all four word edges move by an identical amount), holds, then
  // pans up and out. The red arrow is a separate graphic, not rebuilt here.
  { from: 69.937, to: 71.738, render: (t) => (
      <GroupXform t={t} from={69.937} originX={640} originY={382}
        keys={[
          { t: 69.937, s: 1.0, x: 302 },
          { t: 70.271, s: 1.0, x: 302, ease: "linear" },
          { t: 71.171, s: 1.0, x: 0, ease: "expo" },
          { t: 71.738, s: 1.0, x: 0, ease: "linear" },
        ]}>
        <FadeWord t={t} from={69.937} to={71.738} text="Not" cx={300} baseline={382}
          size={82} colour={[12, 10, 24]}
          enter={{ scale: 5.59, dur: 0.667, ease: "expo" }} />
        <FadeWord t={t} from={70.638} to={71.738} text="another" cx={520} baseline={382}
          size={82} colour={[12, 10, 24]} enter={{ dur: 0.234, ease: "linear" }} />
        <FadeWord t={t} from={70.805} to={71.738} text="notes" cx={772} baseline={382}
          size={82} colour={[12, 10, 24]} enter={{ dur: 0.234, ease: "linear" }} />
        <FadeWord t={t} from={70.972} to={71.738} text="app" cx={952} baseline={382}
          size={82} colour={[12, 10, 24]} enter={{ dur: 0.234, ease: "linear" }} />
      </GroupXform>
  ) },

  // ── 71.77–74.71  "Your go-to / thought partner"
  //
  // The only off-centre text in the whole closing stretch: the block sits 27px
  // (stage) RIGHT of frame centre. Word onsets are 400 / 200 / 433ms apart and
  // each word fades slowly — ~500ms — while sliding ~40px right into place.
  // Exit is one global zoom-out about frame centre, confirmed by three
  // independent measurements agreeing to 0.02.
  { from: 71.772, to: 74.708, render: (t) => (
      <GroupXform t={t} from={71.772} originX={640} originY={361}
        keys={[
          { t: 71.772, s: 1.0 },
          { t: 74.207, s: 1.0, ease: "linear" },
          { t: 74.708, s: 0.757, ease: "in", pow: 2.4 },
        ]}>
        <FadeWord t={t} from={72.239} to={74.708} text="Your" cx={563} baseline={342}
          size={80} colour={[0, 0, 0]} enter={{ dx: -40, dur: 0.500, ease: "expo" }} />
        <FadeWord t={t} from={72.639} to={74.708} text="go-to" cx={745} baseline={342}
          size={80} colour={[0, 0, 0]} enter={{ dx: -40, dur: 0.500, ease: "expo" }} />
        <FadeWord t={t} from={72.840} to={74.708} text="thought" cx={540} baseline={420}
          size={80} colour={[0, 0, 0]} enter={{ dx: -40, dur: 0.500, ease: "expo" }} />
        <FadeWord t={t} from={73.273} to={74.708} text="partner" cx={812} baseline={420}
          size={80} colour={[0, 0, 0]} enter={{ dx: -40, dur: 0.500, ease: "expo" }} />
      </GroupXform>
  ) },

  { from: 74.741, to: 76.510, render: (t) => (
      <ProductSlot t={t} from={74.741} to={76.510} index={10} bg={[237, 225, 203]}
        label="brand mark" /> ) },

  // ── 76.54–78.51  the wordmark. It NEVER settles: a fast decelerating shrink
  // for ~16 frames then an extremely slow creep (-0.06px/frame) that is still
  // going on the final frame of the video.
  // ── 76.54–78.51  closing lockup: MARK + wordmark, centred as one unit.
  //
  // Measured rest geometry: mark x242-285, 14px gap, "mem" x299-398 (native),
  // the pair centred on frame. The mark is a placeholder — drop an svg/img in
  // at the same cx/cy and the lockup keeps its centring. It never settles: a
  // fast shrink for ~16 frames then a creep still running on the final frame.
  { from: 76.543, to: 78.510, render: (t) => {
      const p = clamp(t, 76.543, 78.510);
      const grow = 1 + 1.67 * Math.pow(1 - clamp((p - 76.543) / 0.534, 0, 1), 3);
      const creep = 1 - 0.06 * clamp((p - 77.077) / 1.433, 0, 1);
      const s = grow * creep;
      return (
        <>
          <LogoSlot t={t} from={76.543} to={78.510}
            cx={640 - 113 * s} cy={366} w={86} h={62} scale={s} label="logo" />
          <FadeWord t={t} from={76.543} to={78.510} text="mem"
            cx={640 + 57 * s} baseline={384} size={100} colour={[17, 14, 42]}
            enter={{ scale: 2.67, dur: 0.534, ease: "expo", fade: false }}
            exit={{ at: 77.077, dur: 1.433, scale: 0.94, ease: "linear", fade: false }} />
        </>
      );
  } },

];

export function beatAt(t) {
  for (let i = BEATS.length - 1; i >= 0; i--) if (t >= BEATS[i].from) return BEATS[i];
  return BEATS[0];
}
