# textcards — kinetic text for launch videos

The title cards, claims and feature beats that go *between* product shots.
Sibling to `src/lib/cinematic3d/`, and works the same way: pick presets by slug,
give each a start and a duration, fill in the copy.

Every parameter default here was measured off a real product launch film frame
by frame. They are not invented, and they are the reason this does not look
generated.

```bash
node src/lib/textcards/build.mjs --config my-video.json
node src/lib/textcards/render.mjs --out my-video.mp4 --fps 60
```

The config format is documented below. `templates/cedar/template.json` is a
complete worked film in this format — read it to see how the presets combine.

Other commands:

```bash
node src/lib/textcards/render.mjs --at 3.4 --png /tmp/f.png        # one frame
node src/lib/textcards/render.mjs --sheet --times 1,2.2,3.3        # contact sheet
```

If `ffmpeg` is not on PATH, set `OPENDEMO_FFMPEG` to a modern binary. Pre-2016
builds seek inaccurately with `-ss`.

---

## Presets

The registry is `src/presets/index.jsx`. Each entry carries a `note` (when to
use it), `nativeMs` (the duration it was tuned at) and a `params` block — that
file is authoritative, this table is the summary.

| slug | use it for | native |
|---|---|---|
| `reveal-line` | a line writing itself on in syllables, optional gloss sweep. The opener. | 2.9s |
| `wave-word` | one big word slides in, a colour wave crosses it, it shrinks away. The hero beat. | 1.7s |
| `scale-in` | arrives oversized and settles. Carries scale across a cut so two shots read as one move. | 0.74s |
| `statement` | centred one/two-line copy, lines staggered. The workhorse. | 1.0s |
| `word-cut` | words replacing each other on hard cuts — one frame, no crossfade. | 0.7s |
| `two-tone` | one line with an accent span, optionally wiping in left-to-right. | 0.9s |
| `pan-sentence` | a sentence on a long canvas with a camera panning across it. | 4.8s |
| `group-move` | several words sharing one global scale+translate while fading in individually. | 0.9s |
| `type-on` | types on with a caret, colour ramp fitted to the line. | 2.3s |
| `feature-pills` | a run of tinted slabs, cadence accelerating. A feature list. | 3.7s |
| `product-slot` | reserved space for footage — a 3D shot or a plain recording. | 4.0s |
| `logo-lockup` | closing mark + wordmark; the mark is a swappable placeholder. | 2.0s |

**Native duration** is what a preset was tuned at. Other durations render, but
the further you stray the more the internal proportions distort.

---

## Config format

```json
{
  "video":  { "width": 1280, "height": 720, "fps": 60, "durationMs": 26500 },
  "ground": [ { "fromMs": 0, "colour": [253,252,250] },
              { "fromMs": 4600, "colour": [24,22,34] } ],
  "scenes": [
    { "id": "hook", "role": "brand", "preset": "reveal-line",
      "startMs": 0, "durationMs": 3000,
      "groups": [ { "text": "Some people ", "atMs": 200, "blurIn": true } ] },

    { "id": "slot-1", "preset": "product-slot",
      "startMs": 6330, "durationMs": 4000,
      "index": 1, "label": "product demo — browsing the catalogue" }
  ]
}
```

`ground` is the background colour timeline — it switches on a single frame, it
never crossfades.

Scenes may — and should — **overlap**. A good sequence hands over while the
outgoing beat is still leaving. Rendering one at a time turns every crossfade
into a cut.

---

## Fitting product shots in

Author **one** config for the whole video and use `product-slot` wherever
footage belongs. Each slot renders a labelled box with its exact in/out times,
so the full cut can be built and reviewed before any footage exists — then
slots get replaced one at a time.

Footage can come from either path:
- `src/lib/cinematic3d/` — the recording inside 3D product shots
- `run-demo.mjs` — a plain screen recording

To fill a slot, overlay the footage onto its window rather than cutting the
video apart — the text layer stays independently rebuildable:

```bash
# slot-1: startMs 6330, durationMs 4000  ->  6.33 .. 10.33
ffmpeg -y -i text.mp4 -i shot1.mp4 -filter_complex \
  "[1:v]setpts=PTS+6.33/TB[s];[0:v][s]overlay=0:0:enable='between(t,6.33,10.33)'" \
  -c:v libx264 -crf 17 -pix_fmt yuv420p -r 60 final.mp4
```

Render the footage at the **same width/height/fps** as `video` or it will not
line up.

---

## Cutting to music

A post step, done after the silent cut is approved — the method (downbeats,
bar-gap variation, bar-aligned slots, grid detection and its failure modes)
lives in [`docs/music-sync.md`](../../../docs/music-sync.md).

---

## Copy roles — tag every scene

These are not all replaceable the same way, and a model retargeting this needs
to tell them apart. Set `role` on each scene:

| role | what it is | how to adapt |
|---|---|---|
| `brand` | marketing copy — slogans, claims, the sign-off | replace wholesale |
| `product-voice` | the product talking back **inside a demo scenario** | keep the voice, swap the specifics |
| `user-voice` | the user's own words being captured by the product | keep the voice, swap the specifics |
| `feature` | a literal feature list (the pills) | swap features, keep the count and cadence |

`product-voice` and `user-voice` are **dialogue, not slogans**. Reading them as
brand copy is the most likely way to get a retarget badly wrong. They also
carry names, times and scenarios belonging to a fictional demo — replace those
along with the copy.

---

## Rules

**Everything must be a pure function of `t`.** No CSS transitions, no
keyframes, no `requestAnimationFrame`. The renderer calls `renderAtTime(t)` out
of order and screenshots each frame; anything on a wall clock tears.

**Cut, don't crossfade.** In the reference, every background change and almost
every beat change is a single frame.

**Hold still.** The reference is in motion only ~19% of the time. The dead
holds are what make the moving parts land.

**Use scale.** Eleven separate scale animations were measured in a 78-second
reference, most on beats that look static. Entering at 1.5–2.0× and settling on
an exponential is the single most effective device and the most commonly missed.

**Check contrast against the ground.** Presets take explicit colours and will
happily render dark text on a dark background.

### What makes it look generated

| | measured on the reference |
|---|---|
| easing shape spread | 0.41 — curves genuinely differ from each other |
| curves matching plain ease-in-out | ~1% |
| move/hold ratio | 0.19 |
| sharp-edit share | 0.31 (cuts and snaps, not crossfades) |
| edit widths | median 5 frames, range 1–48 |

If everything eases the same way and every transition is the same length, it
reads as generated no matter how good the copy is. Vary the easing, vary the
edit length, cut hard.

---

## Files

```
build.mjs              bundles a config into dist/bundle.js
render.mjs             Playwright frame-by-frame -> mp4
index.html             the stage
src/presets/index.jsx  THE REGISTRY — notes, native durations, params
src/effects.jsx        preset implementations
src/config-timeline.jsx  config -> scene list
src/easing.js          pure easing functions
src/theme.js           default palette and type (configs should override)
```

Adding a preset: add an entry to `PRESETS` in `src/presets/index.jsx` with
`render`, `note`, `nativeMs` and `params`. It is immediately usable by slug.

Typeface is whatever `theme.js` names — Segoe UI / Inter by default. Drop a
webfont next to `index.html` and add it there to match a specific brand.
