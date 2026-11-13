# spruce — reference measurements

Measured off the **Lovable 2.0 launch film** ("multiplayer vibe coding",
80.4s, 1920x1080 @30fps, 2,412 frames) on 2026-11-13. Frame `fN` is N/30 s.
All positions are reference px; the template authors in a 1920x1080 box on
the 1280x720 stage (stage px = ref px / 1.5), so a `--scale 1.5` render is
the reference picture 1:1. Scripts, frame dumps and the side-by-side live in
the night's scratch build (`.demo-build/nightly/2026-11-13/`, not
committed).

## What the film is

A produced film with no people. Its layer is:

- three ground families cut hard between beats: cream with rim auras, a
  concentric "arc" aura centred below the frame, black with a violet haze
  (and one mark-shaped aura at the close), all under heavy film grain;
- one grotesk, semibold, in lines that grow word by word and re-centre;
- the product shown at punch-in scale (buttons ~90 px type, dialogs at
  ~2x), pressed by a white hand cursor that travels, presses and releases;
- a black prompt pill inside a thick glow that becomes the app window;
- the app window flat in the glow, tilted in perspective, or at x2.5 for
  the composer close-ups.

## Sections

| section | frames | spruce scenes |
|---|---|---|
| S1 the claim | f0 – f263 | `s1-*` |
| S2 the scale, the bloom, the wall | f264 – f688 | `s2-*` |
| S3 the prompt and the window | f689 – f989 | `s3-*` |
| S4 collaboration | f990 – f1229 | `s4-*` |
| S5 visual edits | f1230 – f1607 | `s5-*` |
| S6 publishing | f1608 – f1889 | `s6-*` |
| S7 code | f1890 – f2166 | `s7-*` |
| S8 the close | f2167 – f2411 | `s8-*` |

## Cuts

Per-frame mean absolute difference on 160x90 greys (threshold 8, peak 2.5x
its neighbours). Hard cuts: f209 (cream to the lockup), f264 (to the orbs),
f689 (to the pill), f992 (to cream, "Now"), f1348 (to the editor), f1502,
f1610 (to the arc aura), f1703 (to the Publish button), f1733, f1806,
f1889 (to "Introducing"), f1990 (to the insights app), f2076 (to "Edit"),
f2167 (to the closing aura), f2280 (to the end card). Everything else is a
move or a morph inside one shot: the film has few cuts and a lot of camera.
The rebuild cuts on the same frames.

## Grounds

Sampled every 60 px down the centre column (RGB):

- **arc, f240 (lockup):** y0 84,126,245 · y120 153,143,252 · y240
  221,142,245 · y300 247,135,240 · y420 236,73,192 · y480 230,46,161 · y720
  236,25,71 · y780 238,58,42 · y900+ ~239,76,24. A ring around (960, ~1250)
  with an ellipse aspect of ~1.38 (checked at x=100). `RINGS.arc`.
- **arc2, f324 (the big word):** lilac 157,133,242 at the top, magenta
  240,16,142 through the middle, orange 240,65,37 from y~960. `RINGS.arc2`.
- **arc3, f360 (the follow-on):** magenta at the top, orange 235,65,34 at
  y300–360, peach 247,181,150 at the bottom. `RINGS.arc3`.
- **cream, f150:** 247,243,236 across the middle with pink 245,208,221 only
  in the top ~120 px and the bottom corners. Built as cream + soft blobs.
- **grain:** strong on every aura (the reference's flat patches have a
  per-pixel spread of roughly ±10/255). One seeded 256 px noise tile,
  re-offset every frame, overlay-blended at alpha 0.1–0.2.

## Type

- Mid lines ~104 px (cap height ~84 px at 1x): "Less than 1% of the world"
  spans 1,164 px at f66. Big single words 300–330 px ("Faster" 1,170 px
  wide at f324). The wordmark is ~1,215 px wide with its mark at f240.
- Entrances: a new word arrives blurred (~14 px) and sharpens in ~200 ms;
  "ghost" words arrive pale and darken late ("change", "before"); "to"
  drops in from below (f156); "creating" assembles from the middle out
  (f414–440).
- Re-centring: the visible line's centre eases to the frame centre over
  ~300 ms each time a word lands ("but that's about" is centred at x905 on
  f144, the full line at x960 by f168).
- Camera: almost every line enters large and settles on an ease-out, then
  shrinks linearly (e.g. "Join" ~2.3x at f378 → 1.95x at f393 → 1.0 at
  f400; the typed line 3.3x at f84 → 1.0 at f108 → 0.78 at f141).
- The typed hero types ~1 char per frame with a 48 px caret graded lilac →
  magenta → orange.

## Product beats

- **Pill f689–792:** 480 px tall at the start, left edge drifting 600 →
  280 px while the prompt types (f700–738); pulled back to ~1,350x190 by
  f752 with the hand on send (press f750–756); squeezed to ~460x100 by
  f786 (text compressing horizontally), then a ~400x160 rect that grows
  into the window (f792–834, glow kept).
- **Window:** 1.54:1; ~1,156 px wide at f816 in a ~350 px glow; the
  composer close-up f840–940 is the window's lower-left at ~x2.6 with a
  slight roll; the "after" shot f942–990 is tilted (left edge nearer).
- **Punch-ins:** Invite/Publish at ~440/560 px button width (f1050,
  f1703); invite dialog at ~2x (f1080–1116); avatars d ~270 popping in
  over f1116–1128, shrinking into a toolbar strip f1146–1170; the
  publish dialog cycles five typed domains every ~13 frames (f1736–1800).
- **Bloom f540–566:** the camera falls into a letter of the last word, a
  scalloped pink flower (R ~900, blurred) opens with a 4-point sparkle, the
  sparkle darkens and swells and the first site is seen THROUGH it. The
  rebuild clips the site wall to a growing sparkle path.
- **Wall f588–642:** the hero site at ~0.44x among a masonry wall
  (gaps ~21 px), panning down-left, punching into one site by f624, cut to
  the same site on a laptop at f642 (slow pull-back to f689).
- **Close f2167–2412:** the mark-shaped aura rises in on cream (f2167–
  2190), the frame goes violet, the warm core swells to f2270 and the whole
  aura shrinks to show its edges at f2274; cut to black at f2280 with the
  mark large and blurred settling by f2298; the wordmark reveals f2304–
  2316; the url alone from f2350.

## What the rebuild does not do

- The reference's product footage (real app captures, photos of laptops on
  rock and on a desk, portrait photography in the sites and avatars) is
  drawn here. Every window takes `src`; laptops and avatars take images.
- Segoe UI stands in for the reference's grotesk; it is wider, so tracking
  is pulled in (-0.035em) and sizes were fitted by line width.
- The reference's glow and auras are slightly softer than the rebuilt
  gradients, and its grain is coarser on the darkest grounds.
