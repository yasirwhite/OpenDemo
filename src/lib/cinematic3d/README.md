# Cinematic 3D (experimental)

Places an OpenDemo recording inside 3D product shots — a MacBook Pro or iPhone on a
studio set, with camera work derived by measuring real product films frame-by-frame.

> **Status: experimental.** It renders and it is configurable, but it is not wired into
> `run-demo.mjs` and the shot library is small. Treat it as an optional finishing pass,
> not part of the default demo flow.

```bash
node src/lib/cinematic3d/render.mjs src/lib/cinematic3d/configs/my-demo.json 3
```

Renders on the GPU via headless Chromium (~25 fps at 1080p on integrated graphics) and
encodes an MP4.

---

## What you configure

You configure **intent** — which slice of the recording plays, and what deserves
attention. You do not configure camera angles. The cinematography is already tuned;
re-deriving it per demo is how these films get worse, not better.

```json
{
  "source": "../../recordings/my-demo.mp4",
  "output": "../../recordings_3d/my-demo-3d.mp4",
  "width": 1920, "height": 1080, "fps": 30,
  "scenes": [
    { "preset": "laptop-reveal",       "duration": 3.0, "clip": { "from": 0.0, "to": 2.0 } },
    { "preset": "laptop-punch-reveal", "duration": 5.0, "clip": { "from": 2.0, "to": 6.5 },
      "focus": { "scale": 3.0, "revealScale": 2.25 } },
    { "preset": "raw-2d",              "duration": 3.0, "clip": { "from": 6.5, "to": 10.0 },
      "focus": [{ "at": 0.35, "on": [0.5, 0.55], "scale": 1.45, "hold": 0.3 }] }
  ]
}
```

| field | meaning |
|---|---|
| `source` | the recording to put on screen. Omit for placeholder UI. |
| `clip.from/to` | which seconds of the recording play during this scene |
| `clip.fit` | `"stretch"` (default) remaps the clip onto the scene duration; `"loop"` plays at true 1x and wraps |
| `duration` | how long the scene runs in the output (may differ from the clip length — the clip is time-remapped to fit) |
| `focus` | what to zoom on. Shape depends on the preset (see below). |

`clip` and `duration` being independent is deliberate: you can hold on 2 seconds of
recording for 5 seconds of screen time, or compress 10 seconds into 4. When a scene
runs much longer than its footage, `"fit": "loop"` usually reads better than the
slow motion `stretch` gives you.

## Shot presets

One preset per scene of the reference film they were derived from — six shots that
were each reviewed frame-by-frame against the original, not a general-purpose
camera library. **See [`presets/previews/`](presets/previews/) for what each one
actually looks like** (three moments per shot: start, middle, end).

| preset | use it when |
|---|---|
| `laptop-reveal` | opener. Shut laptop reveals itself; the device is the subject. |
| `raw-2d` | dense UI that must stay legible. No 3D at all; cheapest to render. |
| `laptop-punch-reveal` | **the workhorse.** A feature being used — see the pattern below. |
| `floating-panel` | closing beat. Screen floats over a reflective ground, can dissolve out. |
| `laptop-hold` | a long walkthrough that needs room to breathe. Almost no movement. |
| `phone-showcase` | mobile captures. Spins in, demos, flash-zooms, spins out. |

Adding one: drop `presets/<slug>.js` exporting `default` (the builder) and `note`
(one line on when to use it), register it in `presets/index.js`, then run
`node src/lib/cinematic3d/tools/make-previews.mjs <slug>` to generate its strip.

## Building a film: how many scenes, and how fast

**Use as many presets as the demo wants, in any order, and reuse them.** There is no
prescribed count and no prescribed sequence. Two shots is a fine film. Six shots of
`laptop-punch-reveal` on six different features is a fine film. The example config uses
three because that demo is ten seconds long, not because three is the number.

Take liberties. These presets are shots that worked in one film — they are a starting
vocabulary, not a template to fill in.

**Fewer, longer scenes beat more, shorter ones.** A short recording of one action does
not carry many scenes — every cut asks the viewer to reorient, and if the next shot ends
before they have, the film reads as jumpy no matter how good each shot is. The example
config covers a ten-second login in **two** shots for exactly this reason; three left the
last one at 2.55s, which was not enough time to follow.

**Watch out for multi-cut presets at short durations.** `laptop-punch-reveal` splits its
duration into three sub-cuts at fixed proportions (31% reopen / 11% punch / 58% reveal),
so a 2.5s scene gives the punch **0.28s — eight frames**. Give it 4s or more, or use a
single-cut preset. The same scaling makes the lid open faster in a short scene than a
long one (48°/s at 5s, 327°/s at 0.8s), which is a known flaw: a rate should not be a
proportion of the shot it sits in.

**Keep the playback speed the same across every scene.** This is the one rule worth
being strict about. `duration` and `clip` being independent means each scene has an
implied rate:

```
rate = (clip.to - clip.from) / duration
```

A film that runs at 1.00x and then drops to 0.63x for the closing shot reads as broken,
even though each shot on its own looks fine. **The change of speed is what the eye
catches, not the speed.** All-fast is fine. All-slow is fine. Fast-then-slow is not.

So either:

- set every scene's `duration` equal to its clip length (everything at 1.00x), or
- scale every scene by the same factor — if one shot is at 0.7x, put them all at 0.7x.

`render.mjs` prints the rate per scene and warns when they differ by more than 15%.

When a scene must run longer than the footage you have for it, use
`"clip": { "fit": "loop" }` rather than stretching it. Looping holds 1.00x and wraps;
stretching turns that one scene into slow motion while its neighbours play at speed.

## The punch-then-reveal pattern

`laptop-punch-reveal` encodes the most useful piece of grammar we found. It is two
moves doing two different jobs:

1. **Push in hard** to frame the thing being clicked. This is *attention* — it says
   "look here, this is happening".
2. **Pull back a little** to show what the click affected. This is *consequence* — the
   element that changed needs surrounding context to be legible, and staying at
   click-magnification hides it.

The pull-back must be **small**. Go back too far and you throw away the attention the
push just bought. Defaults are `scale: 3.0` in, `revealScale: 2.25` back.

This generalises: given a click position and the region it affects, the two
magnifications follow from the two bounding boxes rather than from taste.

## Deriving zooms from the demo itself

The demo JSON already knows what was clicked and when, so zooms should not be authored
twice. `focusFromSteps(steps, sceneStart, sceneEnd)` in `presets/index.js` converts steps into
focus entries, given `{ at, on: [u, v], zoom }` per step where `on` is the target's
normalised position in the frame.

It only zooms steps explicitly marked `zoom` — zooming every interaction is the single
most common way these films go wrong, and the same warning already in AGENT_README
applies here with more force, because a 3D push is far more disruptive than a 2D one.

## Rules the presets already enforce

Worth knowing so you do not fight them:

- **A hold is dead flat.** Identical values on both keys. A "hold" that creeps by 1% reads
  as constant motion and makes every real move feel like a jerk.
- **Constant-rate motion is computed, not keyframed.** Rotation, lid angle and pedestal
  are analytic functions of elapsed seconds. Chained keyframes put a velocity
  discontinuity at every segment boundary, which reads as jitter.
- **Scale changes are instant or eased-then-stopped**, never a slow creep across a shot.
- **Camera drift continues across cuts** inside a scene, which is what makes several
  shots feel like one camera in one room.

## Files

| file | role |
|---|---|
| `presets/` | the shot library — one file per shot, plus `rig.js` (shared geometry and sign conventions) and `index.js` (registry + `buildCuts()` + `focusFromSteps()`). Start here. |
| `presets/previews/` | one strip per preset showing what it looks like. Generated. |
| `scene.html` | the renderer. Consumes a config, exposes `prepareFrame`/`renderAtTime`. |
| `render.mjs` | driver: headless Chromium -> frames -> MP4. |
| `placeholderScreens.js` | canvas-drawn stand-in UI when there is no `source`. |
| `assets/*.glb` | device models, real-world scale. |
| `tools/` | reference-matching toolkit + `make-previews.mjs` — see `docs/reference-matching.md`. |
| `configs/` | where your configs go — gitignored except `configs/examples/`. See its README. |

## Determinism

Frames are produced by `prepareFrame(t)` then `renderAtTime(t)` — never by a playback
clock. The video is *seeked* per frame and awaited, never played. Output is identical
regardless of worker count or machine speed, which matters because rendering is
parallel and any residual renderer state would otherwise leak between frames.

## Known gaps

- Not called from `run-demo.mjs`; you invoke `render.mjs` yourself.
- Six presets, all derived from one reference film. The vocabulary is narrow.
- **Multi-cut presets scale their internal timings as fractions of the scene duration**,
  so a short scene silently speeds up its lid animation and can squeeze a cut down to a
  few frames. Constant-rate motion should be constant across durations; it is not yet.
- Device screens show the recording letterboxed to the panel's aspect; no crop control yet.
- No contact shadow under the phone on white sets, so it can read as floating.
- Only two device models.
