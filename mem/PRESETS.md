# Text-card presets

Reusable kinetic-typography effects for launch videos. Pick presets by slug,
give each a start and a duration, fill in the copy — the way
`src/lib/cinematic3d/presets/` works for the 3D product shots.

Every parameter here was measured off a real launch film frame by frame, not
invented. The defaults are the measured values.

```bash
node mem/build.mjs --config mem/configs/my-video.json
node mem/text-layer/render.mjs --out mem/my-video.mp4 --fps 60
```

The registry lives in `text-layer/src/presets/index.jsx` — `PRESET_NOTES` and
each entry's `params` block are the authoritative list.

---

## The presets

| slug | use it for | native |
|---|---|---|
| `reveal-line` | a line writing itself on in syllables, optional gloss sweep. The opener. | 2.9s |
| `wave-word` | one big word slides in, a colour wave crosses it, it shrinks away. The hero beat. | 1.7s |
| `scale-in` | arrives oversized and settles. Carries scale across a cut so two shots read as one move. | 0.74s |
| `statement` | centred one/two-line copy, lines staggered. The workhorse. | 1.0s |
| `word-cut` | words replacing each other on hard cuts, one frame, no crossfade. Sets a fast rhythm. | 0.7s |
| `two-tone` | one line with an accent span, optionally wiping in left-to-right. | 0.9s |
| `pan-sentence` | a sentence on a long canvas with a camera panning across it. | 4.8s |
| `group-move` | several words sharing one global scale+translate while fading in individually. | 0.9s |
| `type-on` | types on with a caret, colour ramp fitted to the line. | 2.3s |
| `feature-pills` | a run of tinted slabs, cadence accelerating. A feature list. | 3.7s |
| `product-slot` | reserved space for footage — 3D shot or plain recording. | 4.0s |
| `logo-lockup` | closing mark + wordmark, mark as a swappable placeholder. | 2.0s |

**Native duration** is what a preset was tuned at. Other durations render, but
the further you stray the more the internal proportions distort.

---

## Assembling a video

Scenes may — and should — **overlap**. A good sequence hands over while the
outgoing beat is still leaving; rendering one at a time turns every crossfade
into a cut.

```json
{
  "video":  { "width": 1280, "height": 720, "fps": 60, "durationMs": 24000 },
  "ground": [ { "fromMs": 0, "colour": [255,255,255] },
              { "fromMs": 4538, "colour": [240,230,212] } ],
  "scenes": [
    { "id":"hook", "role":"brand", "preset":"reveal-line",
      "startMs":0, "durationMs":2900,
      "groups":[ {"text":"Remembering is so","atMs":133,"blurIn":true} ] },

    { "id":"hero", "role":"brand", "preset":"wave-word",
      "startMs":2820, "durationMs":1720, "text":"yesterday", "size":280 },

    { "id":"slot-1", "preset":"product-slot",
      "startMs":5860, "durationMs":4140, "index":1, "label":"product demo" }
  ]
}
```

`mem/configs/example-launch.json` is a complete worked example using every
preset. `mem/text-layer/src/timeline.jsx` is the full hand-authored rebuild —
read it when you want to see what good parameter values look like in context.

---

## Copy roles — label these

A model retargeting this template needs to tell these apart, because they are
not all replaceable the same way. Tag each scene with `role`:

| role | what it is | how to adapt |
|---|---|---|
| `brand` | marketing copy — slogans, claims, the sign-off | replace wholesale |
| `product-voice` | the product talking back **inside a demo scenario** ("I've created a to-do list for you") | keep the voice, swap the specifics |
| `user-voice` | the user's own words being captured ("Tell it what to remember") | keep the voice, swap the specifics |
| `feature` | a literal feature list (the pills) | swap for the new product's features, keep the count and cadence |

`product-voice` and `user-voice` are **dialogue, not slogans**. Reading them as
brand copy is the most likely way to get a retarget badly wrong — they are the
product demonstrating itself, and they carry names, times and scenarios that
are part of a fictional scenario and should be replaced along with the copy.

---

## Rules that are not negotiable

**Everything must be a pure function of `t`.** No CSS transitions, no
keyframes, no `requestAnimationFrame`. The renderer calls `renderAtTime(t)` out
of order and screenshots each frame; anything driven by wall clock tears.

**Cut, don't crossfade.** In the reference every background change and almost
every beat change is a single frame. Reach for `word-cut` before you reach for
a fade.

**Hold still.** The reference is in motion only ~19% of the time. Long dead
holds are what make the moving parts land.

---

## What makes this not look generated

These were measured off the reference and are the difference between motion
that reads as designed and motion that reads as defaulted:

| | measured |
|---|---|
| easing shape spread | 0.41 — curves genuinely differ from each other |
| curves matching plain ease-in-out | ~1% |
| move/hold ratio | 0.19 |
| sharp-edit share | 0.31 (cuts and snaps, not crossfades) |
| edit widths | median 5 frames, range 1–48 |

If everything in your sequence eases the same way and every transition is the
same length, it will read as generated no matter how good the copy is. Vary the
easing, vary the edit length, and cut hard.

**Scale is the most under-used axis.** Eleven separate scale animations were
found in a 78-second reference, most on beats that look static. `scale-in`
exists for this. Entering at 1.5–2.0× and settling on an exponential is the
single most effective way to make a beat feel authored.
