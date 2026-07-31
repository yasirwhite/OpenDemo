# mem — text presets for launch videos

The **text treatment** of the mem launch video, rebuilt as reusable React
presets so any product's copy can be presented in that style.

Scope of this branch is **text only**. The 3D product shots live on
`feature/3d-renders` (the Kite work); product footage here is reserved as
labelled placeholder slots for those renders to drop into.

Reference: `reference/mem-reference.mp4` (78.5s, 640x360, 29.97fps).

---

## Quick start

```bash
# from the repo root
node mem/build.mjs                              # bundle the React text layer
node mem/text-layer/render.mjs                  # -> mem/mem-text.mp4 (60fps)
node mem/text-layer/render.mjs --out mem/mem-text-full.mp4   # full 78.5s

# check a moment against the reference (TOP = reference, BOTTOM = ours)
node mem/text-layer/compare.mjs 3.15:3.15 16.78:16.78
#                               ^ref ^ours seconds

node mem/text-layer/render.mjs --at 3.4 --png /tmp/f.png     # single frame
```

If `ffmpeg` is not on PATH set `OPENDEMO_FFMPEG` to a modern binary. A pre-2016
build seeks inaccurately with `-ss`, which silently shifts every frame you
extract — and every measurement taken from it.

---

## Product slots — what to replace

Eight slots, boundaries measured to the frame. Each renders as a dashed box
reading `[ product demo ]` with its number and time range. To swap one in,
replace the `<ProductSlot>` in `src/timeline.jsx` with whatever renders the
Kite footage over the same `from`/`to`.

| # | in | out | dur | reference content |
|---|---|---|---|---|
| 1 | 11.90 | 16.50 | 4.6s | app toolbar, iPhone note lists |
| 2 | 17.45 | 20.22 | 2.8s | mic / voice recording card |
| 3 | 21.19 | 24.90 | 3.7s | desktop notes window |
| 4 | 27.93 | 31.53 | 3.6s | voice-mode pill, transcript |
| 5 | 40.95 | 45.15 | 4.2s | meeting prep on phone |
| 6 | 48.32 | 51.49 | 3.2s | desktop search board |
| 7 | 58.23 | 63.93 | 5.7s | Mem Chat answering |
| 8 | 74.74 | 76.51 | 1.8s | brand mark animation |

~29s of product footage; the remaining ~49s is text.

---

## Layout

```
mem/
  mem-text.mp4                first 11s
  mem-text-full.mp4           the whole 78.5s
  mem-text-vs-reference.mp4   side-by-side
  reference/                  the source video
  text-layer/                 THE WORK
    src/effects.jsx             the preset library
    src/timeline.jsx            every beat, with its measurements in comments
    src/theme.js                palette sampled off the reference
    src/easing.js               pure easing functions
    render.mjs                  Playwright frame-by-frame -> mp4
    compare.mjs                 reference-vs-ours contact sheets
  analysis/                   CV measurement tooling (see below)
  tools/                      compare-render.mjs — labelled side-by-side
  archive/                    superseded approaches
```

## How it works

`render.mjs` launches headless Chromium, calls `window.renderAtTime(t)` per
frame and screenshots it — the **same contract** the 3D scene uses
(`temp_3d_build/kite-cuts/scene3.html` on the other branch), so both layers can
eventually run off one frame loop.

**Every visual property must be a pure function of `t`.** No CSS transitions,
no keyframes, no rAF. The renderer jumps around the timeline out of order, so
anything driven by wall clock tears.

### Presets (`src/effects.jsx`)

| preset | for |
|---|---|
| `RevealLine` | a line writing itself on in syllables, with a gloss sweep |
| `WaveText` | slide-in at full size + a travelling colour wave + shrink-out |
| `WordBeat` | phrases with per-word enter/exit (cut, rise, slide, scale) |
| `FadeWord` | a word pinned by centre-x and baseline, with its own size |
| `GroupXform` | one global scale+translate over several words |
| `PanCanvas` + `ClipWord` | a camera panning across words on a fixed canvas |
| `SweepText` | a travelling two-colour wave; optionally a permanent wipe |
| `TypeOn` | types on, each character ageing through a colour ramp |
| `Pill` | fixed-size tinted slab + text as one unit |
| `Statement`, `ProductSlot` | plain centred copy; placeholder slots |

---

## What the reference actually does

All measured frame-by-frame at 24–30fps by six parallel agents. **Almost every
one of these was invisible at 1–2s sampling, and several are the opposite of
what the footage looks like at a glance.**

**Scale is everywhere.** Eleven separate scale animations, most on beats that
look static. The opening line ramps 1.83x→1.00x *linearly* over 1.168s. "Meet"
enters at ~1.7x and settles on an exponential (tau 98ms), picking up the size
"yesterday" was cut at so the two read as one move through the cut. "Not"
enters at **5.6x**. "and of course" at 1.50x. "I've created a to-do list"
zooms out for its entire life. The closing wordmark never settles at all.

**Reveals are travelling waves, not gradients.** "yesterday" runs two, both
~50ms per character: characters enter blurred and salmon left-to-right, then a
*second* wave recolours them salmon→navy. At 3.70s the reference shows "yester"
navy while "day" is still salmon — a static gradient cannot do that.

**Gloss sweeps.** A pale highlight crosses "mem" once (1.35→1.85s, ~0.15s per
letter). "Capture anything" is crossed by a black→red→blue→black wave at
~66px/frame. "Mem Chat" cycles navy→red→violet→blue→navy per letter.

**Camera vs. per-element — it goes both ways.** The beige sentence
("notes app / second brain / thought partner") is ONE camera pan across a fixed
canvas; building it as six word animations gets the relative positions wrong.
So are "Let Mem take meeting", "notes for you" and "Not another notes app".
But "and recall everything with" *looks* like a pan and isn't — its circle
cluster holds identical pixels for 4.6s while "and" travels 161px.

**Things that are not what they appear:** "anything" is not blue (a blue sphere
passes in front of it); "Deep Search" is not a separate shot (the navy sphere
scales up x15 to become the background); the "Find anything" beat is a 3D scene
of orbiting spheres with occlusion order flipping.

**Everything cuts.** No crossfades anywhere — backgrounds switch on a single
frame, and "Meet"→"your" is one frame with zero transition.

**Also:** the reveal unit in the opening line is the syllable, not the letter
(m/e/m arrive on the same frame at identical alpha). There are **seven**
feature pills. The pill slab is a fixed 976x186 box, not padded to its text.
The typing beat is authored at ~15fps and each character ages through its
colour ramp keyed off time-since-typed, not screen position.

---

## analysis/

A local CV pipeline that measures the reference. It is **input, not the
acceptance test** — the acceptance test is looking at frames next to the
reference with `compare.mjs`.

```bash
node mem/analysis/glyph-motion.mjs mem/reference/mem-reference.mp4 \
     --out mem/analysis/out/glyph-motion.json
node mem/analysis/effect-classifier.mjs mem/analysis/out/glyph-motion.json \
     --out mem/analysis/out/effects.json
node mem/analysis/glyph-debug.mjs mem/reference/mem-reference.mp4 --at 3.6 --out /tmp/seg.png
```

Reliable: cut and beat timing, per-beat palettes, line layout, numeric glyph
boxes (`glyph-debug.mjs` is what the measurement agents leaned on). Not
reliable: `roundtrip-check.mjs` — it re-measures our own render, so it moves
whenever the burst detector's sensitivity changes, and it disagreed with the
frames often enough not to be trusted.

### Pacing vocabulary measured off mem

Why hand-made motion reads differently from generated motion — the "AI look" is
uniformity, and all of it is measurable:

| | mem |
|---|---|
| easing shape spread | 0.41 (curves genuinely differ) |
| curves matching plain ease-in-out | ~1% |
| move/hold ratio | 0.19 (81% of the video is held still) |
| sharp-edit share | 0.31 (cuts and snaps, not crossfades) |
| edit widths | median 5 frames, range 1–48 |

---

## Known gaps

- The typing beat runs a few characters behind the reference.
- The red arrow above "Not another notes app" is not drawn (a graphic, not text).
- The 9.9% word-gap contraction during "Let Mem take meeting"'s build is not modelled.
- Typeface is Segoe UI standing in for mem's geometric grotesque. Dropping a
  webfont into `text-layer/` is a one-line change and would close most of the
  remaining visual gap.
- Three timings are inference, not measurement, and are flagged in code: the
  "notes" reveal (it enters frame already at rest), "thought"'s onset (clipped
  by the frame edge), and "Meet"'s scale on its single most motion-blurred frame.

## archive/

Superseded, kept because the measurements in them are still good.

- `raster-renderer/` — an ffmpeg/pure-JS glyph compositor that predated the
  React layer. Replaced because real typography is trivial in DOM and painful
  in pixel buffers.
- `template-renderer/` — earlier `render-mimic.mjs` output (scored 0.70).
- `walkthrough-mimic/` — Playwright walkthrough attempt (0.42). A dead end:
  polished demo videos have no cursor.
- `transcript-rebuild/`, `zips/`, `scratch/` — earlier experiments and leftovers.
