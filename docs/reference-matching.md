# Matching a reference video

A working method for taking a film you admire and reproducing its camera language in
OpenDemo. Written from one full attempt (a Kite product film) but the method is the
point, not that film. **If you run this against a new reference, add a section at the
bottom rather than rewriting the method.**

The tools live in `src/lib/cinematic3d/tools/`.

---

## The shape of the work

1. **Segment** the reference into meaningful scenes.
2. **Measure** each scene rather than describing it.
3. **Build** the shot, then **verify against frames**, not against your own numbers.
4. **Iterate with a human**, one clip at a time.

Most of the cost is in step 3. Assume your measurements are wrong until a frame agrees.

---

## 1. Segment by idea, not by cut

A scene is one coherent idea. Cuts *inside* a scene are punch-ins on the same subject at
the same home framing; cuts *between* scenes change the subject.

The first 8 seconds of the reference contained three cuts but demonstrated a single UI
flow on a single screen at a single home framing — that is **one scene**. Splitting it
into three broke the thing holding it together.

Signals that two shots belong to the same scene:

- same subject and same content, only the framing differs
- a camera drift that runs *through* the cut point without resetting
- the framing returns to a value it held earlier (a "home")

## 2. Sample densely enough to see events

Sampling rate must be **≥3× the shortest event you care about**. Reference events here
ran 0.4–0.9s, so ≥8 fps. At 1 fps a 0.5s lid-opening is 0–1 frames — structurally
invisible, and it was missed for exactly that reason.

Better than looking: measure a **time-varying signal per cut**. Subject height going
14% → 91% in half a second says "something opened" without anyone looking at anything.

```bash
node tools/zoommap.mjs <framesDir> <servedDir> 10 zoom.json   # per-frame framing
node tools/printmap.mjs zoom.json 0 18                        # readable trace
node tools/events.mjs zoom.json                               # classify events
```

## 3. Know what your metrics cannot see

This is the most important section. An edge-bounding-box measure is cheap and useful,
and it is **blind in ways that will cost you hours** if you trust it.

| it cannot distinguish | why |
|---|---|
| device rotated 20° vs camera orbited 20° | identical bounding box; only parallax against fixed set elements tells you |
| camera at −21° vs +21° | subject width is symmetric. **No size metric can see handedness.** |
| a push-in vs a cut to a different object showing the same texture | identity is not a framing property |
| an instant zoom vs a cut | both spike frame-to-frame difference identically |
| a content change vs a camera move | a popover appearing moves the metric with the camera still |

And one active failure mode: on **full-bleed UI**, a density-gated bbox *shrinks as the
picture grows*, because plain margins fall below the gate as dense widgets fill the
frame. This inverted the zoom direction twice in a row and produced a confident, wrong
answer both times.

**Rule: the bbox is valid for a device on a set. For full-bleed 2D, verify against
frames.** When a human says the picture does something and your metric disagrees, the
metric is wrong.

## 4. Measure what a metric *can* see, exactly

When two objects must share an orientation, **compare surface normals — do not compare
renders.** Put the reference object in the scene as a straightedge, measure, remove it.

That turned a pose being guessed across three coupled angles into one number: the planes
were 31.97° apart because a pitch sign was inverted. Right magnitude, wrong direction —
and *almost exactly double* is the signature of a sign error, worth recognising from the
number alone. After the flip: 1.27°, all of it the donor model's own yaw.

Similarly, solve framing constraints instead of nudging. Keeping a 15.4cm subject inside
a 20.3cm frame while a pedestal adds 3.6cm gives a window only 1.3cm wide:

```
T + 3.6 − 10.16 ≤ 1.7   (bottom still in at the END)   → T ≤ 8.26
T + 10.16      ≥ 17.1   (top still in at the START)    → T ≥ 6.94
```

Three rounds of small adjustments failed because the value was *outside* the window.
Two inequalities settled it.

`tools/solve.mjs` does the same thing for distance: binary-search the camera until the
rendered subject width matches a measured target, so shots are authored in the units the
reference was measured in.

## 5. Motion traps

Every jitter found during this work was one of these:

- **Constant-rate motion expressed as chained keyframes.** Each segment boundary is a
  velocity discontinuity. Rotation ran 9.0°/s then 6.5°/s while other cuts ran 4.1°/s,
  purely from inherited easing. A lid decelerated to a near-stop mid-open and restarted.
  → Compute constant-rate motion analytically from elapsed **seconds**. Immune to
  retiming and to whatever the camera keys are doing.
- **"Holds" that creep.** `0.950 → 0.962` is not a hold. Zero frames were ever still, so
  two real zooms read as jerks inside constant drift. → Byte-identical values, and dump
  the rendered curve to confirm `d/frame == 0`.
- **Micro-drift on unused axes.** A `y` sliding 0.000 → 0.008 across a shot reads as
  jitter even when nothing else moves. → Pin unused axes to 0.
- **Rotating about the wrong pivot.** A laptop's display sits ~17cm behind the model
  origin, so yawing about the origin swings the screen through an arc instead of turning
  it in place. → Rotate about the feature you are framing.
- **Easing names are inverted relative to how they read.** An object *leaving* frame that
  should start slow and accelerate needs `ease: "in"`. This got flipped the wrong way
  twice. When a human says "ease out", ask whether they mean the curve or the feeling.

## 6. Amplitude is usually the error, not presence

The reference moved in **10 of 13** shots — *more* often than the first attempt did. The
problem was never how many shots moved, it was **how much and where in the shot**.

- Reference: moves fast, briefly, then rests. Typically 1.2–1.4× over ≤0.8s, then flat.
- First attempt: 1.7–1.9× smeared across whole 3-second shots.

Also measure *where in the shot* the movement sits, not just how much. A move front-loaded
into the first third then held reads as designed; the same move spread evenly reads as a
slow zoom.

And check whether a move is directional at all — one 7-second shot turned out to *breathe*
(70.5 → 74.1 → 70.6, net zero, 1.05× amplitude) and had been built as a 1.7× push.

## 6b. Keep one speed across the whole film

Retiming a shot to fit a slot is the obvious move and it is usually wrong. If three
shots play at 1.00x and the fourth is stretched to 0.63x so it fills four seconds, the
film reads as broken — **the change of speed is what registers, not the speed.**
Uniformly fast reads as energetic; uniformly slow reads as deliberate; mixed reads as a
mistake.

Fix the rate first, then choose durations to match, rather than choosing durations and
letting the rate fall out. Where a shot genuinely needs more screen time than its
footage, loop the footage at 1x instead of stretching it.

Same logic as the "holds that creep" trap above: the eye is far more sensitive to a
*discontinuity* in a rate than to the rate itself.

## 7. Rendering hazards

- **Renderer state persists across frames.** three's clear colour survives between
  renders, so an overlay scene with no background of its own cleared *light* after a
  white scene. With parallel workers that made it non-deterministic. → Force the clear
  colour every frame; assume any persistent state is a determinism bug.
- **Transparent overlays occlude.** `transparent: true` still defaults to
  `depthWrite: true`, so a mostly-alpha sprite writes depth over its full quad and punches
  a rectangle out of anything drawn behind it. Latent until a second layer appears.
- **A `VideoTexture`'s `.image` is a `<video>`** — it has `videoWidth`/`videoHeight`, not
  `width`/`height`. Reading the wrong pair yields NaN and the quad silently vanishes.
- **A media element served without HTTP Range support is silently unseekable.** The
  static server answered a plain `200` with no `Accept-Ranges`, so Chromium dropped every
  `video.currentTime = t`, fired `seeked` anyway, and rendered the first decoded picture
  for the whole film. Nothing errored; `readyState` was 4 and `duration` was correct. It
  looked exactly like a screenshot pasted onto the device, and a human spotted it before
  any check did. → Serve `206`, and **assert the seek landed** (`|currentTime − target| <
  0.5`) rather than trusting that it did.

The shared shape here: each of these fails *quietly and plausibly*. After any change to
how content reaches the screen, verify that two frames from different moments differ —
hash them. A metric that never fires is not a passing metric.

## 8. Working with a human reviewer

- **Only touch the clip under review.** An approved clip is frozen until they reopen it.
  Extending a note to other clips because it "seems to apply" burns their trust and their
  time.
- **Check whether a value is legitimately per-scene before fixing it globally.** A global
  lid-angle fix that was right for one scene flattened another that genuinely reclined more.
- **Never claim a match on metrics alone.** It was claimed twice while the picture plainly
  disagreed. Show the side-by-side and state what is still off.
- **Reversals are normal direction, not contradiction.** "I take that back" arrived several
  times and was right each time. Record the current instruction and why.
- **Ambiguity gets asked about, not resolved silently.** "The first segments" meant one
  clip, not two; guessing wrong changed work that was already signed off.

## 9. Verification loop

```bash
node tools/cut-sheets.mjs <video> <outDir> "[0,1.62,4.95,...]"   # per-cut contact sheets
node tools/compare.mjs out.png '[{"label":"...","mine":"/a.png","ref":"/b.png"}]'
```

Compare at **matched moments**, put them side by side, and state PASS / PARTIAL / FAIL per
item with the delta. Do sample stills first — a few per shot, seconds to render — and only
commit to a full render once the samples hold up.

## 10. Transitions are mechanisms — describe them before you rebuild them

Learned the hard way on the Comet and Bloom rebuilds (2026-08-06): every miss the
human reviewer caught survived earlier passes because the transition had been
*labelled* ("fades out", "cut to black") instead of *described*. The fix rounds
that finally hit reference quality all followed the same discipline:

- **Name the mechanism, not the impression.** "Fades away" hid three different
  truths: a window that shrinks AND flies up while fading (three channels on
  different ease powers); a circle that *morphs into the frame* (rises while its
  width contracts and its corner radius collapses); a disc that grows *out of an
  ellipsis dot* with accelerating (not decelerating) growth. Write the sentence
  that names origin point, channels, and curve direction — if you cannot write
  it, you have not looked closely enough to rebuild it.
- **Ease direction is a coin with two very different sides.** An expo-*out*
  where the reference accelerates reads as wrong even when endpoints match.
  Sample mid-motion positions across consecutive frames and fit the curve; do
  not pick an easing by vibe.
- **Every motion claim gets pixel numbers first.** Element rect, corner radius,
  shadow extent and density, per-frame position — measured from full-decode
  frames *before* the config is touched. Approximation is the recurring failure
  mode; measurement is the recurring fix.
- **Verify motion in motion.** Matched stills pass while the film still reads
  wrong. Compare consecutive-frame *deltas* (position/coverage per frame)
  against the reference's — the per-frame trace is what catches a lagging
  swallow or a front-loaded entry.
- **Windows and frames are animated objects.** The display surface itself
  rises, drifts, punch-zooms, shrinks and slides away — with an edge shadow
  whose density is measurable and which full-bleed geometry physically removes.
  Measure the window's trajectory like any other actor. Ambient motion is often
  compound (slow rotation *plus* slight zoom); track two fixed points to
  separate the components.
- **Grounds change in bursts.** Map every background state change even when a
  plate hides it — the burst rhythm (hard cut vs timed dissolve, dead-still
  holds between) is part of the film's grammar, not scenery.
- **The reviewer's notes name where to look, not what to change.** Convert each
  note into measurements at that timestamp, then fix to the measurement. The
  notes that unlocked "perfect" were nuances no metric flagged — a bottom gap,
  a corner radius, a ball easing toward shorter text — caught only by a human
  watching the side-by-side. Always produce the side-by-side; always get it
  watched.

---

## Per-reference notes

Append a section per reference film. Keep the method above generic.

### Kite product film (46s, 1920×1080, 30fps)

- 13 shots; durations 1.62–7.10s, deliberately uneven.
- Each section has a **home framing it returns to exactly** — 0–8s lives at 71% subject
  width, punches to 96%, returns to 70.6%.
- Scale changes are **instant or eased-then-stopped**; held shots are flat to ±0.3%.
- Only **5 eased camera moves in the whole film**, none longer than 0.8s, none over 1.4×
  except the phone's entrance.
- Camera drift **alternates direction** between sections rather than sliding one way.
- The device is often shown **opening** — a shut laptop revealing itself is the opener,
  and it happens twice.
- Sections cut between **3D device**, **bare floating screen with no device**, and
  **genuine full-bleed 2D**. Not everything is a hardware shot.
- One cross-dissolve (~28.3s) that **cut detection cannot see** — it shows only as edge
  energy draining, never as a luminance spike.

### Comet browser launch film (72s, 1280×720→720p master, 25fps)

- Rebuilt 2026-08-05/06 as the `aspen` template. Grammar: cream kinetic-serif
  overture with rolling depth-blurred nouns and glassy orbs → animated browser
  windows (rise / punch-in / slide-left-shrink exits, measured edge shadows,
  settled rects deliberately shy of the frame edges — 22–36px bottom gaps) →
  voice-mode particle sphere → circle-to-frame morph swallow → rotating
  starfield outro (+1.95°/s with +0.40%/s zoom) with light-resolves-to-mark.
- Text entries rise into place (~21px, exponential settle) film-wide; exits
  lift harder (accelerating, −40px+). This upward drift is the film's signature
  and was invisible at 1–2s sampling.
- Traps that cost passes: the flash beat's disc grows out of the last ellipsis
  dot with *accelerating* growth; the swallow is a morph, not a circle wipe;
  window shadows are constant through zooms and vanish only via full-bleed
  geometry; the 8fps frame dumps carried non-constant timing offsets (trust
  full decode only).

### Bloom design-tool launch film (59s, 1920×1080, 25fps)

- Rebuilt 2026-08-05/06 as the `birch` template. Grammar: lilac gradient
  grounds, serif type with gradient washes and a near-transparent radial glow
  that tints text; one measured card comp (stage 1051×592, radius ~33, radius
  tracks scale) gliding/shrinking/fading through the film; loader beats with a
  blurred ball that eases to each label's width; background changes in three
  bursts (15.4–23.7s) between dead-still holds; pixel-sort poster reveals
  (rising top edge + per-column tile dissolve); letter-fall end card (letters
  enter from the left and settle).
- Film-wide constant smooth camera zooms (~1.00→1.06 class) on nearly every
  scene — the single most-missed feature of the first pass; assume every scene
  has one until measured otherwise.
- Slot labels belong only on genuinely empty placeholder boxes — never over
  rebuilt UI.
