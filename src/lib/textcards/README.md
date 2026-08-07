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
node src/lib/textcards/render.mjs --sheet --times 1,2.2 --sheetdir out/  # ...elsewhere
node src/lib/textcards/render.mjs --html snap/index.html --out v.mp4     # private stage
```

`dist/bundle.js` is a single shared artefact, so two people rendering two films
at once will race: A builds, B builds, A screenshots B's film. To be safe,
snapshot `index.html` + `dist/bundle.js` (+ any `*.svg` a config points at) into
a directory of your own right after your build, and render that with `--html`.
`--sheetdir` does the same for contact sheets, and names the frames by
timestamp (`t_017040.png`) instead of by index. Both flags default to the shared
stage, so existing commands are unchanged.

If `ffmpeg` is not on PATH, set `OPENDEMO_FFMPEG` to a modern binary. Pre-2016
builds seek inaccurately with `-ss`.

---

## Presets

The registry is `src/presets/index.jsx`. Each entry carries a `note` (when to
use it), `nativeMs` (the duration it was tuned at) and a `params` block — that
file is authoritative, this table is the summary.

| slug | use it for | native |
|---|---|---|
| `aperture-fold` | a brand mark ASSEMBLING itself — flat blades arrive edge-on (revealed by their own rotation, never by a fade), swing in around the centre and interlock into a faceted aperture ring. Real perspective, solved in JS. The film's first frame. Give it `dive` and the locked mark then enlarges, tumbles and the lens flies THROUGH the hollow, for a hard cut on the far side; `dive.magMix` makes that a BUILDUP whose frame-to-frame growth cannot ease out anywhere, and `dive.bearR`/`bearBlade` aim the lens past the middle so one shard rushes it. | 3.2s |
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
| `orb-roll` | glassy gradient orbs drifting past giant depth-blurred words rolling vertically. All its `atMs` cues are absolute film-clock ms. | 5.0s |
| `cosmic-backdrop` | dark-space backdrop under text: a blurred orb ring that swells then collapses toward a point, and a starfield that fades in and holds — or slowly rotates and pushes in (`stars.rotDegPerSec` / `zoomPctPerSec`, both default 0), which is what stops a long held space shot reading as a still. | 9.5s |
| `petal-drift` | soft lavender petal-flowers popping in over type, growing toward camera while defocusing, then dissolving. A floral brand accent; deterministic from per-flower seeds. | 1.4s |
| `product-slot` | reserved space for footage — a 3D shot or a plain recording. | 4.0s |
| `media-window` | an ANIMATED footage window: keyframed position/size/scale/opacity/radius — rise-from-bottom entries, punch-zooms to full-bleed, exact pull-backs, slide-and-shrink exits. `shadow` takes an object (`{dx,dy,blur,spread,colour,alpha,scaleWithH}`) for the shots that hold the window's EDGE inside the frame and need the shadow to read beside it, not just under it. With `radius` keyed to half the width it is also the film's circles and swallow masses. Interior is a dashed placeholder, or the REAL FOOTAGE if you give it `src` — the video then rides every key and is clipped by the live radius (see *Fitting product shots in*). `watermark` puts a brand corner bug INSIDE that clip. | 10.4s |
| `gradient-sweep` | serif display lines revealed a group at a time under a travelling warm-to-cool gradient, optionally rising into place. Bloom's opening claims. | 1.7s |
| `prompt-card` | a prompt composer as UI: glass pill, orb bullet, prompt text, brand chip and submit, with its own camera. The generate-loop beat. | 4.7s |
| `domain-input` | the "enter your domain" beat, built not slotted: globe chip + serif label, glass pill with an orb bullet, placeholder that gives way to typed text, circular submit — plus a `submit` skin on black with a gloss sweep. | 2.1s |
| `radial-glow` | one nearly-transparent radial wash BEHIND type, flat-cored and keyed, for the faint colour cast a painted background asset would give. | 2.4s |
| `poster-reveal` | a procedurally drawn brand poster (mark, wordmark, headline, caption, brand gradient) plus its reveal — a blocky mosaic dissolve descending while the picture rises, or an oversized defocused arrival. "The asset the product just generated", with no binary to ship. | 1.6s |
| `logo-lockup` | closing mark + wordmark; the mark is a swappable placeholder. | 2.0s |
| `star-lockup` | the closer where a point of light BECOMES the OpenDemo mark: the star swells, condenses, and the two halves of the portal grow out of it led by a hot ignition front, then the wordmark rises in beside it. Put it over a `cosmic-backdrop` with `stars.rotDegPerSec`. | 6.8s |
| `aperture-ignite` | the closer for a film that OPENS on `aperture-fold`: ONE SUN takes a lap around the ring and every glass shard it passes swings out of nothing behind it, until the whole aperture stands; the sun then falls into the hollow and stays as the mark's core, the group slides left and the wordmark rises in beside it. Same six pieces as `aperture-fold`, same roll-out-of-edge-on reveal — the shards are imported from it rather than re-derived, so one film cannot end up with two versions of its own logo. Shard ignitions are SOLVED from the sun's angle curve, so retiming the lap can never desync them. Built for black; put it over a `cosmic-backdrop` with `stars.rotDegPerSec`. | 5.74s |
| `drawn-endcard` | hand-drawn outro resolve: paper wipe + marker stroke erase the frame, the outline melts to a dot, a drawn asterisk pops and a serif wordmark types on beside it. | 5.55s |
| `phone-chat` | a produced phone-UI scene: drawn device, chat thread, streaming replies, tool cards, composer. | 15.5s |

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

`ground` is the background colour timeline. A stop switches on a single frame —
a hard cut, which is what most ground changes are. A stop that carries
`fadeMs` (plus optional `ease`, default `inout`, and `pow`) instead
**crossfades** into its colour from whatever was live, across
`fromMs .. fromMs+fadeMs`:

```json
{ "fromMs": 17120, "colour": [119,159,149], "fadeMs": 880, "ease": "inout" }
```

Reach for it only where the reference dissolves rather than cuts — Bloom's
extract passage holds a painterly ground for a beat and then dissolves to the
next over ~0.8s, and a step cannot say that. Stops without `fadeMs` behave
exactly as before.

A stop that carries `colour2` paints a **two-tone gradient** instead of a flat
fill, with optional `angle` (CSS degrees, default `180`, i.e. `colour` at the
top), `shape` (`"linear"` or `"radial"`, default linear, radial being centred
on the frame), and `stops` (`[p0,p1]` in 0..1 — where along the axis each
colour lands, default `[0,1]`):

```json
{ "fromMs": 13720, "colour": [252,168,110], "colour2": [8,4,20],
  "angle": 178, "stops": [0.11,0.32], "fadeMs": 720, "ease": "inout" }
```

Stops with no `colour2` are flat and render exactly as they always did.

A flat ground is the cheapest thing to get wrong: it can only be the mean of
what it replaces. Sampled in the exposed frame margins, Bloom's sunset meadow
runs `[243,158,104]` at the top to `[5,1,18]` at the bottom, its garden runs
dark foliage at the LEFT to a bright window at the right — a horizontal axis,
not a vertical one — and its purple field runs `[168,123,249]` to `[70,24,150]`
straight down with no horizontal component at all. Three grounds, three
directions: vary the angle, because one direction for a whole film is the thing
a gradient is there to avoid.

`stops` is what makes a gradient describe a real ground rather than a generic
ramp. That sunset holds its sky flat over the top 11% and is dark by 32% down,
so `[0.11,0.32]` puts the horizon where the reference's is; the flower-meadow
grounds later in the film are its mirror image, pale until ~70% and warm below.
Keep pale grounds under type pale — a two-tone there wants to read as depth,
not as a second colour.

Two gradients dissolve **per pixel**, not by interpolating their parameters:
sweeping the angle and the stop positions between two different geometries
passes through ramps neither side has, and measured against the reference that
drags the sunset's bright sky across the whole frame mid-dissolve (118/255 too
bright in the lower margins at 17.60s). Stops that share a geometry — which is
every fade a flat ground can have — still just lerp their colours.

Scenes may — and should — **overlap**. A good sequence hands over while the
outgoing beat is still leaving. Rendering one at a time turns every crossfade
into a cut.

### Per-scene camera

Any scene may carry a `camera` — one smooth scale (+translate) drift applied
to the whole scene, for compositions that zoom as a unit. Reference films run
slow zooms (~3-6%/s, linear) under entire passages, and settle whole lines
from ~1.10× decelerating while the words themselves hold still — both are this
channel, not per-element animation:

```json
{ "preset": "reveal-line", "startMs": 0, "durationMs": 4800,
  "camera": { "keys": [ { "atMs": 0,    "scale": 1.00 },
                        { "atMs": 4800, "scale": 1.18, "ease": "linear" } ] } }
```

`atMs` is scene-relative; keys may set `scale`, `x`, `y` (omitted channels
inherit the previous key); `ease` shapes the segment into that key (`linear`
default, `out`/`expo`/`quint` for settles, `in` + `pow`, `inout`);
`originX`/`originY` default to frame centre. Scenes without `camera` render
exactly as before.

### Rise-into-place

The measured text presets share an opt-in entry channel: words enter ~0.5em
below their rest position and settle up on a true exponential (per-frame
delta decaying ×0.85–0.88 at 25fps, settled in ~1s). `reveal-line` takes
`riseDy`/`riseDurMs`/`riseEase` (plus uniform `staggerMs`, a decelerating
`scaleEase`, and a staggered accelerating `exitSlideDy` lift); `scale-in` and
`two-tone` take `riseFromPx`/`riseDurMs`/`riseEase`; `type-on` takes
`letterRiseDy` (per-letter, 36px/0.24s measured) and `letterFall` (letters
arrive from the left and fall into place). All default off — see the params
blocks in `src/presets/index.jsx`.

---

## Fitting product shots in

Author **one** config for the whole video and use `product-slot` wherever
footage belongs. Each slot renders a labelled box with its exact in/out times,
so the full cut can be built and reviewed before any footage exists — then
slots get replaced one at a time.

Footage can come from either path:
- `src/lib/cinematic3d/` — the recording inside 3D product shots
- `run-demo.mjs` — a plain screen recording

### The window plays it (`src`) — use this when the window MOVES

Give a `media-window` or `product-slot` a `src` and the footage renders *inside*
the window frame, so it rides every key the window has — the rise from the
bottom edge, the punch to full-bleed, the pull-back, the slide-and-shrink exit —
clipped by the live `radius` and lit by the same `shadow`:

```json
{ "id": "hero", "preset": "media-window", "startMs": 15150, "durationMs": 10450,
  "src":  "file:///abs/path/demo.mp4",
  "clip": { "from": 10.6, "to": 21.05, "fit": "1x" },
  "fill": "cover",
  "keys": [ … ] }
```

`clip.fit` is `1x` (true speed from `from`), `stretch` (remap `[from,to]` onto
the scene) or `loop`. `fill` is `cover` or `contain`. Setting `src` suppresses
the dashed placeholder. Paths are `file://` URLs or relative to `index.html` —
absolute is safer, because `--html` renders from a snapshot directory.

The source is **seeked, never played**: `src/video-sources.js` maps the film
clock to the source clock as a pure function of `t`, and `render.mjs` awaits
`window.prepareFrame(t)` before `renderAtTime(t)`. Any other driver must do the
same, or it screenshots the frame *before* the seek landed — invisible in a
still, a tear in motion.

Two things to check when you use it. Render the same `t` twice with a different
`t` in between and compare bytes: it must be identical. And take consecutive
25fps frames inside each window and look at the deltas — produced films hold
their title cards dead still for seconds, so place `clip.from` such that the
source's frozen stretches land where the *window* is moving. A frozen picture
inside a frozen window is the one combination that reads as a stall.

### Whose footage is it — `watermark`

A film that cuts between several customers' products has to say whose each shot
is, and the honest place for that is *inside the picture*, not floating on the
frame:

```json
{ "preset": "media-window", "src": "file:///…/nextly-demo.mp4",
  "watermark": { "src": "file:///…/nextly-watermark.svg" },
  "keys": [ … ] }
```

The bug is drawn inside the window's own clip, so it is cut by the live
`radius`, picks up the window's `blur`, and rides the rise, the punch to
full-bleed and the slide-off exit with everything else — which is the whole
reason it is not an ffmpeg overlay. `h` (default `0.052`) and the margins
(default `0.034`) are **fractions of the window's live height**, so one spec
holds the same proportion on a 315px card in a carousel and on the full frame;
`scaleWithH: false` pins them against a 720px frame instead. `product-slot`
takes the same object.

Point it at an SVG and it ships as text, not a binary. The assets are preloaded
and decoded before `__ready`, because the frame a window *enters* on is exactly
the frame a just-requested image would still be fetching — one frame with no
mark on it, invisible in a contact sheet.

**Corner chip or big translucent watermark.** `anchor` (default `bottom-right`)
takes `top`/`bottom`/`centre` crossed with `left`/`right`/`centre`; a centred
axis ignores its margin. The two treatments are opposites and it is worth being
deliberate about which one a film wants:

```json
"watermark": { "src": "…/nextly-mark.svg", "h": 0.08,
               "anchor": "top-centre", "clamp": true,
               "marginY": 0.05, "opacity": 0.38,
               "drop": [ { "colour": [255,255,255], "alpha": 0.34, "blur": 0.07, "dy": 0 },
                         { "colour": [0,0,0],       "alpha": 0.38, "blur": 0.11, "dy": 0 } ] }
```

- *Small, opaque, cornered, on a chip* reads as a broadcast bug — a labelled
  object with an edge, and an edge parked in a corner is something the eye keeps
  going back to.
- *Large, translucent, centred, bare* reads as a watermark before it is read at
  all. Centred costs no eye travel on footage that composes centre-stage, and
  the size is what carries it once the chip is gone.

Three things follow from dropping the chip. **The asset must be cropped to its
ink** — `width:auto` sizes by height, so viewBox slack scales up as dead space
and walks the mark off its anchor. **The ink has to be mid-luminance**, because
without a ground it is read against the footage, and real product footage cuts
across polarity inside one clip; a near-black wordmark dies on the dark half and
a white one dies on the light half, while a mid tone (and its hue) survives
both. **`drop` replaces the built-in shadow**: `false`, an object, or an ARRAY
stacked into one filter — an inner light rim with a wider dark one outside it
gives an edge on either polarity, since each shadow is cast by the element plus
the shadows before it.

`clamp: true` keeps a top-anchored bug inside the *frame* when the window is
bigger than it. This matters more often than it sounds: a window that punches to
1274x908 centred at y=244 has its top edge 210px above the picture, and an
unclamped top bug spends the whole punch off-screen. Clamped, it stops at the
top of the visible picture — where a viewer reads a watermark as being anyway —
and one inset then serves every beat instead of one per beat.

Whichever you pick, *measure it*: a bare mark's legibility is a property of the
footage under it, which changes every frame. Render the film twice, once with
the marks deleted, and difference the two — the difference is the mark exactly,
with no guessing at where it landed. Judge on RGB distance, not luminance; a
violet mark over a dimmed grey canvas can sit within 5 luminance steps of its
ground and still be the most obvious thing on screen.

### ffmpeg overlays it — only when the window is STILL

If the slot does not move, the footage can be composited afterwards and the text
layer stays independently rebuildable:

```bash
# slot-1: startMs 6330, durationMs 4000  ->  6.33 .. 10.33
ffmpeg -y -i text.mp4 -i shot1.mp4 -filter_complex \
  "[1:v]setpts=PTS+6.33/TB[s];[0:v][s]overlay=0:0:enable='between(t,6.33,10.33)'" \
  -c:v libx264 -crf 17 -pix_fmt yuv420p -r 60 final.mp4
```

Render the footage at the **same width/height/fps** as `video` or it will not
line up. This path cannot follow a keyframed window; `src` is the answer there.

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
src/video-sources.js   footage bound to windows: per-frame deterministic seeking
src/easing.js          pure easing functions
src/theme.js           default palette and type (configs should override)
opendemo-logo.svg      the OpenDemo logo (mark + wordmark), light-ground primary
```

Adding a preset: add an entry to `PRESETS` in `src/presets/index.jsx` with
`render`, `note`, `nativeMs` and `params`. It is immediately usable by slug.

---

## The OpenDemo mark

`opendemo-logo.svg` is the logo: a rounded-square **portal** broken once at the
crown with a bead of light nested in the break, plus a light/bold `OpenDemo`
wordmark. The portal is the frame you watch a demo inside, the break is the
"open", and the stroke runs `#e8483a` at the crown to `#7c6cf5` at the feet —
the gallery's existing gradient, so the mark inherits brand equity instead of
inventing a palette.

The same geometry is **duplicated as path strings** in
`src/presets/star-lockup.jsx` (`const MARK`), because the closing preset draws
the mark itself rather than loading the file — that is the only way the strokes
can be dashed on individually, and it means an outro ships with no binary
asset. **Change one, change the other.**

Both stroke paths deliberately start at the crown break and end together at the
floor's midpoint, so a single `stroke-dashoffset` ramp grows them OUTWARD from
the bead and the two ignition fronts collide at the bottom.

Typeface is whatever `theme.js` names — Segoe UI / Inter by default. Drop a
webfont next to `index.html` and add it there to match a specific brand.
