# maple — reference measurements

Measured off the **QuiverAI "Arrow 1.0" launch film** (30.0s, 1920x1080 @60fps)
on 2026-11-05. Frames were full-decoded, resampled to a 30fps clock (frame n
is at t = n/30 s, source frame 2n) and scaled to the 1280x720 stage, so stage
px = reference px / 1.5. Six section passes measured and rebuilt the film.
Their notes follow, one per section, on the absolute film clock; the assembly
pass's changes are listed first. Script and folder names in the notes refer to
the night's scratch build (`.demo-build/`, not committed).

| section | range (ms) | presets |
|---|---|---|
| S1 | 0 – 4033 | `maple-sketch-canvas`, `maple-comet-outline`, `maple-iso-outline` |
| S2 | 4033 – 8966 | `maple-wire-closeup`, `maple-node-mark`, `maple-hue-scrub` |
| S3 | 8966 – 13800 | `maple-icon-resize`, `maple-prompt-send` |
| S4 | 13800 – 17033 | `maple-rolodex` |
| S5 | 17033 – 23033 | `maple-mockup-montage`, `maple-prompt-card`, `maple-outline-wordmark`, `maple-font-flash` |
| S6 | 23033 – 30000 | `maple-brand-close` |

Every section lays its own `maple-ground` scene first. Seams: 4033, 8966,
17033 and 23033 sit on hard cuts (f121, f269, f511 and f691 belong to the
incoming section). 13800 (f414) is the first frame of the white-to-black fade;
the ember card's top sliver is already on screen at f413, and s3 draws it with
s4's own card art and rise curve.

## Assembly pass (2026-11-05)

- **Seams.** Pair stills either side of every seam (f120/121, f268/269,
  f413/414, f510/511, f690/691) and 4 mid-motion stills per section needed no
  fixes. The full-film per-frame diff trace (160x90) finds the same cut frames
  in the rebuild as in the reference, and no frame where the rebuild's motion
  energy departs from the reference's by more than max(6, 50%).
- **Draw order.** The timeline sorts scenes by `startMs` (stable), so a
  later-starting scene paints on top. `s5-outline-wordmark` starts with the
  prompt card (19033) so it stays under the exiting card; ground scenes are
  listed first in each section. Ground keys sit ~5 ms before frame times.
- **One card-art source.** `CARD_ART` is exported from `maple-s4.jsx`; s3
  imports it for the f413 sliver instead of keeping a copy (`EMBER_CARD`).
- **Cursor.** `ArrowCursor` gained a `rotate` prop (deg, about the tip); s2's
  turn before the exit (f203–f205) uses it instead of a rotated wrapper.
  `CURSOR_CAL` documents the measured visible size (tip to right wing ~0.70–0.74
  x `size`; white fill on black 15.15 of 24 units; white tip inset (2.46, 2.05)
  units). s6 reads its calibration from it. Renders are unchanged apart from
  sub-pixel shadow rasterisation on the turned cursor (f205).
- **ImageSlot.** Gained `labelPosition: "corner"` (a bottom-left caption that
  stays clear of a composited mark, like the s5 mockups' own caption).
  Default unchanged.
- **End-card url (S6).** On the assembled film the url read thin and dim (ink
  545 vs the reference's 864 on f850). The ground-coloured thinning stroke
  `urlThin` 1.2 -> 0.5 px (ink 898 at 0.4).
- **Film end.** The brand-close scene ends at 29633 ms and the ground goes to
  pure black there (the reference's last 11 frames are black).


## s1 notes (f0-f120, 0-4033 ms)

All numbers are stage px (1280x720) measured on `ref/f720` (frame n = n/30 s), per frame through
every move. Scripts: `sections/s1/py/` (photo.py pull-back fit, blue.py/trace.py trace cover,
track.py / track2.py code-token tracking, excess.py text-over-background maps, kymo.py comet
kymograph, glow.py bloom energy, motion.py per-frame diff + rect, mkcfg.py writes both scene files
and the two test configs).

### Beat list (re-traced; corrects BEATS where noted)

| frames | beat | mechanism (measured) |
|---|---|---|
| f0-f1 | full-bleed sketch photo | identical frames (diff 0.01) |
| f1.75-f30 | pull-back into the canvas window | ONE group (window + photo frame) scaled about the photo centre: photo width 1280 -> 911, remaining r = 0.78 * 0.82^(f-3) (pure exponential from f1.75; ratio 0.80-0.83/frame every frame f3-f25). Photo CONTENT zooms on the same r but only to 0.759 (so it ends 1.067x cover-cropped inside the frame): c = 0.759 + 0.241 r (NCC fit per frame, residual <= 0.01). Group centre y 360 -> 376.25 on a quicker 0.8^(f-1). BEATS' "1.41x" is the frame; the content is 1.32x |
| f2-f5 | keyline ghost | a 1 px white rect inside the photo, half-height 319.3 f2 -> 305 f5 (x1.835 wide), lifting the inside +8 levels at f2; meets the shrinking photo edge ~f5.8 |
| settled | window | outer x44.5-1234.5, y32.5-680.5 (r ~19, [248-250] band, 1 px edge, soft shadow); canvas panel x58.5-1221.5, y47-668 [241-242], dot grid 13.25 x 13.2 px; chips y58-84: frame chip x69-97, image chip x104-132 + pill to x299 (left part canvas-grey, right white), "50%" x203-229, cap 11 px [113]; "</>" chip x1182-1211 |
| f3.5-f38 | blue trace, hexagon | one head from the UPPER-RIGHT vertex, clockwise (down the right side first). Cover per frame (blue mask projected on the perimeter): .005 f4, .06 f10, .182 f16, .415 f20, .603 f22 (peak ~0.095/frame), .83 f26, .93 f30, 1.0 f38. [29,124,220]-ish, 2.4 px |
| f20.3-f47 | blue trace, knockout | stub at the inner left corner f21-f26 (cover .012-.047), rest f27-f47 (.111 f30, .388 f36, .749 f40, 1.0 f47) |
| f22-f60 | SVG code drift | rows on a mono grid: cap tops y82/194.5/307/419.5/532/644.5 (pitch 112.5), digits cap 40 px, advance 33.3 px (-> Consolas 61 px). FOCUS plane: no scale, x = -167.8 + 163 * 0.9391^(f-40) (tracked token "1.75L391.5": 875 f22, 713 f28, 605 f34, 533 f40, 459 f50, 420 f60; fit < 4 px). Tokens land one by one (row 2 hero f22, row 3 f26, rows 1/2/4 f28-f33, row 0 + 5 dim f33-34). NEAR plane = same text x1.42 about y 334, blurred ~3 px, x_near = 1.42 x_focus + K, K = -1333 + 466 * 0.9391^(f-52) (tracked blurred row: 482 f46, 378, 284, 200, 126, 60, 2 f58: 52 -> 29 px/frame, same decay as the focus plane). Near copies fade in f38-f50; focus copies drop out f47-f58 except the hero tokens. White, normalised alpha 0.50 focus (p90) / 0.42 near. Over the window margins the text is nearly invisible (white on 241). BEATS' "grows toward camera" is the near plane, not a zoom |
| f61 | hard cut to black | diff 197 |
| f61-f70 | push-in | hexagon width 223 (f61-62 hold) -> 256.5: 1 - 0.13 * 0.71^(f-62), centre (639.75, 359.5) (vertical edges 528/751 f61 -> 511.5/768 f74+) |
| f61-f90 | comets | dim outline [~33], 1.5 px. Kymograph of the outline brightness per frame: two outer comets half a perimeter apart running COUNTER-clockwise and decelerating (B at 156/240 f61, 101 f64, 78 f66, 42 f70, 17 f74, 0 f79, -14 f90); core ~90 px with ~34 px ramps f61-f73, relaxing into a soft triangle (half-max ~107 px f80, ~94 f90). Knockout: two comets running clockwise. Bloom: off-line energy in the 520x460 region around the mark: mean 8.9 f63, 11.4 f69, 12.2 f72, 5.6 f78, 4.0 f87 |
| f91 | hard cut to white | diff 251 |
| f91-f120 | ink outline on the iso grid | black 2.2 px outline, hexagon 271 px wide (verticals 504/775, top 198, bottom 521). Grid: verticals 640 +- 0/70/140, horizontals 360 +- 0/83.5/167, diagonals slope +-0.6 with y-intercepts 93 px apart (5 per family, centred on the frame centre); dashes 9 on / 8 off, 1 px [~220]. Static (ref diff 0.1-0.2 = encode noise) |

### Build (maple-s1.jsx)

- `maple-sketch-canvas` (f0-f60): window chrome, drawn sketch photo (or the `sketch-photo`
  ImageSlot via `photo:'slot'` / `src`), trace, keyline ghost, `CodeDrift` (rows + per-token
  `[text, in, out|null, near|null]`). One group transform, one content transform, curves on the
  film-frame clock from `frame0`.
- `maple-comet-outline` (f61-f90): comets are 22 graded dashes on the closed path; bloom = the
  comets redrawn thick and blurred (5 px stroke / 3 px blur x0.8, 30 px stroke / 34 px blur
  x0.57). Thick-then-blur avoids the alpha plateau an feFuncA slope gives.
- `maple-iso-outline` (f91-f120): grid + `MapleMark` outline.
- The sketch photo is drawn: page tones are the f0 column medians as gradient stops (+6 lift,
  vertical ramp overlay), gutter shadow, dot grid (26 x 26.7 px), page-edge band, desk with seeded
  turbulence grain, pen, and a pencil `MapleMark` (double-pass lines, hatching heavier on the
  right). Measured vs f0 on a 9x4 grid: within +-5 levels on the upper half, 5-10 darker on the
  lower half of the pages.
- Copy: reference copy shows the reference SVG strings; Maple copy shows `markSvgCode()` lines
  (`<svg viewBox="0 0 400 468" fill="none"`, `xmlns=...`, `<path d="M200 4L392 119L392 349L200
  464L8 349L8 119Z" stroke="#141414" stroke-width="3"/>`, `<path d="M200 138L314 334L200 266L86
  334Z" ...`), wrapped on the same six rows with the same cue table; the kept hero tokens are
  `4L392 119L392` and `119Z"`.

### Verification (final sbs, per frame)

- photo rect, ref | ours: f3 41-1239 | 41-1240, f5 90-1189 | 88-1192, f8 133-1147 | 131-1149,
  f12 161-1119 | 160-1121, f20 180-1100 | 180-1100, f30 184-1095 | 184-1096 (<= 3 px)
- diff trace (160x90 thumbs) ref/ours: f6-f30 within 0.2 every frame (8.6/6.7, 4.8/4.4,
  2.3/2.3, 1.2/1.1 ...); code f28-f60 2.0-3.4 vs 1.8-2.9 (ours +0.3-0.6 at f48-f57, ref -0.9 at
  f43); comets f62-f90 within 0.2 every frame; cuts f61 197/196, f91 251/250
- trace cover, ref | ours: f10 .060|.050, f16 .182|.180, f20 .415|.400, f22 .603|.598, f26
  .830|.802, f30 .930|.912 (after f30 our mask under-counts where the brighter code crosses it)
- hero token x, ref | ours: f24 814|817, f28 713|717, f34 605|608, f46 484|482, f50 459|457,
  f59 423|420
- code alpha (normalised excess p90 / p98): focus 0.55/0.62 ref vs 0.50-0.58 ours after the
  0.58 -> 0.50 change; near 0.29/0.35 vs 0.30/0.35
- comet kymograph positions within ~8/240 of the perimeter every sampled frame (f61 ours 8/240
  ahead); bloom region mean 8.9/8.5 f63, 11.4/11.4 f69, 12.2/10.9 f72, 5.6/6.0 f78, 4.0/4.0 f87

### PASS / PARTIAL / FAIL

| beat | verdict | delta |
|---|---|---|
| f0-f1 photo (drawn sketch) | PARTIAL | layout, tones and sketch position match; it is a drawing, not a photo (desk grain, pen, pencil texture are simpler); Maple's arrowhead knockout by design |
| f2-f30 pull-back (group + content zoom) | PASS | rect edges <= 3 px every frame, diff trace within 0.2 from f6 |
| f2-f5 pull-back motion blur | PARTIAL | the reference smears the photo edge f2-f5 (diff 8.9/21.3/18.9 vs ours 15.2/20.3/10.9); keyline ghost rebuilt, smear not |
| window chrome (toolbar, pill, dot grid) | PASS | positions within 1-2 px; glyphs are drawn stand-ins |
| f4-f38 hexagon trace | PASS | cover within 0.03 per frame |
| f21-f47 knockout trace | PARTIAL | timing matches; path is Maple's arrowhead (by design) |
| f22-f60 code: focus drift | PASS | hero token within 4 px every sampled frame |
| f22-f60 code: token timing / near plane | PARTIAL | token in/out frames and the near plane's scale, drift and alpha match; Consolas is a little heavier than the reference mono, and the Maple copy's tokens differ in length |
| f61 cut / f61-f70 push-in | PASS | edges within 1 px |
| f61-f90 comets + bloom | PASS (outer) / PARTIAL (knockout) | outer positions within 8/240 per frame and the bloom energy within ~10%; knockout comets run on Maple's arrowhead, so their path differs |
| f91 cut / f91-f120 iso outline | PASS | outline within 1 px; grid lines on the measured lattice |

### Seams

- f0: film start, nothing before.
- f60 -> f61, f90 -> f91: internal hard cuts (ground keys `hold` at 2033 / 3033 ms).
- f120 -> f121 (s1 -> s2): all s1 scenes end at 4033 ms, so f121 (4033.3) is s2's alone (plain
  black). Last s1 frame f120: white ground, iso grid, black outline 271 px centred (639.5, 359.5).

## s2 notes (f121-f268, 4033-8966 ms)

All numbers are stage px (1280x720) measured on `ref/f720` (frame n = n/30 s), per frame through
every move. Scripts: `sections/s2/py/` (cur.py cursor/hatch tracker, grad.py gradient beat,
motion.py per-frame ref-vs-ours channels, meshgrid.py fill-state sampler).

### Beat list (re-traced; corrects BEATS where noted)

| frames | beat | mechanism (measured) |
|---|---|---|
| f121 | black, nothing lit (max level 1) | the cut frame; strokes are still off-frame |
| f122-f125 | wireframe draws on | outer path clockwise from the top: head on the right vertical f122 (25% down the lower-right edge), lower-left edge done f124 = 0.167 perimeter/frame; inner strokes ~290 px/frame, done f125. BEATS said "to ~f131": it is done by f125 |
| f123-f180 | push-in (not a slide) | ONE scale about (640.5, 590): hexagon half-width 509.5 -> 767 px; s = 1.5735 - 0.2333 e^-(f-123)/17 - 0.3402 e^-(f-123)/33 (residual < 0.8 px). Bottom vertex moves LEFT 475 -> 392 while the right edge moves right, so BEATS' "slides right/down" is a zoom |
| f129-f132 | anchor dots pop | lit-pixel counts 12, 37, 53, 65+; ~11.5 px white dots; 1 - 0.45^(f-128.3) |
| f151.5-f170 | fillets grow | bottom dot pair 25.8 px apart f154 -> 59.5 f180; R = 14.5 (1 - 0.79^(f-151.5)) mark units |
| strokes | two greys | ~255 upper left -> ~105 lower right in screen space (f125: lower-left edge 254 -> 128, lower-right ~110, right vertical 156 -> 113), ~3 px |
| f181 | cut (black on black) to the whole mark | white 2.4 px outline, nodes ~11 px (white ring, blue core), R 14.6 units (pair 16 px apart at W 403, continuous with f180's fillet) |
| f181-f240 | pull-back about the frame centre | width (vertical-edge distance) W = 282 + 121 e^-(f-181)/25.25: 403, 340 f200, 314 f215, 294 f240 (residual < 0.6 px). BEATS' 438/417 jumps were cursor pollution |
| f183-f202 | cursor entry | expo-out; body x 858 f183 -> 771 f198 (767 + 158 * 0.72^(f-181)), y 682 -> 438 (437 + 486 * 0.71^(f-181)); solid glyph with a horizontal streak off its right (f183-f190) |
| f187 | click: navy fill [6,61,108], no visible press | |
| f195-f200 | press-and-hold | glyph ~74 px (tip -> right wing) free, ~56 px held |
| f198.5-f211 | hatch sweep lower-right -> upper-left | hatched share 4% f199, 13, 24, 32, 40, 49, 58, 67, 74, 81, 90 f209, 96, 100% f211 (front at ~40 deg); lines 60 deg, perpendicular pitch 0.0342 W, ~2.6 px [45,145,224] |
| f203-f205 | cursor turns ~38 deg clockwise to point up (body bbox slides 766 -> 750 from the turn alone) | |
| f207-f215 | cursor exits up | tip 701,115 f211; 689,51 f212; 680,1 f213; ~90 px/frame peak f209-f210; grey all-over smear |
| f241 | cut to the gradient mark | W 288, centre (639.5, 360), rounded ~18 units, true-hole knockout, film grain |
| f242-f268 | halo ring | concentric rounded hexagon, half-width 191 f242 -> 316 f247 -> 362 f256: 144 + 221 (1 - 0.78^(f-241)); brightness 20 -> 6 (x0.78/frame), faint 1-2 level floor to f268 |
| f243-f257 | mark rises 360 -> 308 | 22 px on f243 then x0.75/frame |
| f242-f249 | slider rises | top 735.5 f242 (only the knob's hover disc peeks in at y 709+), 696, 668, 648, 634, 626, 621, 620 f249; ease-out power 2.45. Bar x 458-821, 17 px, hue wheel |
| f243-f268 | knob drag | knob x = 755 - 195 * 0.875^(f-243) (560, 605 f245, 653 f248, 693.5 f252, 718.5 f256, 749.5 f268); white 30 px disc + 72 px hover disc [50,52,49]; cursor tip on the knob centre, held size |
| f241-f268 | recolours | states A f241, B f245, C f249, D f252, E f256, F f260, G f263, A f267 (one-frame jumps; the knob moves continuously) |

### Build (maple-s2.jsx)

- `maple-wire-closeup` (f121-f180), `maple-node-mark` (f181-f240), `maple-hue-scrub` (f241-f268).
  Curves run on the film-frame clock from `frame0`.
- Fill states: 16 x 19 colour grids sampled off f241/245/249/252/256/260/263 (cell medians inside
  the hexagon, the reference's knockout filled from neighbours), drawn as SVG cells under a 9 px
  Gaussian blur, clipped to the mark, grain on top. Synchronous (no image decode).
- Maple's knockout is an arrowhead whose wings sit higher than the reference's inner corner, and
  its wing tips are acute (MapleMark's 0.6x inner fillet would retract them ~100 px off frame by
  f165). So the close-up framing drops 24 px (`shiftY`) and the close-up inner fillet is 0.22x
  (`innerRadius`), which keeps a dot pair on the right wing tip in frame through f180, at the
  height of the reference's inner-corner pair (y ~25-60).
- Cursor: `ArrowCursor` renders its glyph at ~0.70 x `size` here (size 64 -> 44.5 px tip -> right
  wing, its comment implies 0.90). Calibrated: size 100 free (74 px), x0.75 held, x0.8 on the
  slider. Rotation (f203-f205) via a wrapper rotating about the tip.

### Verification (pass 3, per-frame from the sbs clip)

- close-up right vertical x: |ref - ours| <= 2 px every frame f123-f180 (mean 1.0)
- pull-back left edge: <= 1 px every frame f181-f240
- hatched share: within 0.02 f199-f208; f209-f210 were 0.05-0.07 behind in the clip, keys
  nudged afterwards (frames render: 0.90 / 1.03 vs ref 0.90 / 0.96). The sbs clip predates
  this last two-key tweak.
- cursor body bbox: within 1-8 px f188-f207; f183-f187 x 10-13 px right (blur shape)
- mark top f241-f268: within 1 px; slider top: within 1 px; knob x: within 4 px

### PASS / PARTIAL / FAIL

| beat | verdict | delta |
|---|---|---|
| f121 black cut frame | PASS | identical |
| f122-f125 draw-on | PARTIAL | outer timing/position match; inner strokes are Maple's arrowhead (by design), so the inner composition differs |
| f123-f180 push-in | PASS | <= 2 px per frame (24 px framing offset by design, constant) |
| f129-f132 dot pop | PASS | timing and size |
| f151-f180 fillets | PASS (outer) / PARTIAL (inner) | outer pair spacing matches; inner pair is on the right wing tip near the top edge (ref: inner corner top-left) |
| two-grey strokes | PARTIAL | screen-space ramp approximates the reference's per-path greys (+-40 levels) |
| f181 node mark | PASS | width/nodes/line; inner shape differs by design |
| f181-f240 pull-back | PASS | <= 1 px |
| f183-f202 cursor entry | PASS | 1-8 px after f188; smear look approximated with ghost copies |
| f187 navy fill | PASS | same frame, same colour |
| f195-f201 press/release | PASS | size within ~5% |
| f198-f211 hatch | PASS | <= 0.02 share except f209-f210 |
| f203-f205 cursor turn | PASS | body bbox 755/746 vs 754/750 |
| f207-f215 exit | PASS | tips within ~10 px where measurable (f211-f213) |
| f241 gradient cut | PASS | size/position/radius/fill |
| f242-f268 halo | PASS | radius per frame within ~7 px, brightness matched |
| f243-f257 mark rise | PASS | <= 1 px |
| f242-f249 slider rise | PASS | <= 1 px |
| knob drag + cursor | PASS | <= 4 px |
| recolour states | PASS | same frames; fills are sampled grids (soft, slightly less crisp edges than the reference, e.g. state A's dark fold) |

### Seams

- f120 -> f121 (s1 -> s2): hard cut; s2's f121 is plain black (the reference's too). Nothing to
  share. s2's ground scene starts 4033.
- f268 -> f269 (s2 -> s3): s2's scenes end at 8966 ms so f269 (8966.67) is s3's alone. Last s2
  frame f268: state-A gradient mark centred (639.5, 308), W 288, slider at y 620, knob 749.5,
  cursor on the knob.

## s3 — resize, icon, prompt, send (f269–f413, 8966–13800 ms)

Presets (templates/maple/presets/maple-s3.jsx):
- `maple-icon-resize` (8966 +1450, f269–f312): full-bleed ember field + white mark + selection
  resize, cursor exit, shrink into the app-icon tile.
- `maple-prompt-send` (10416 +3384, f313–f413): tile, caret, typed prompt with the caret-tracking
  pan, send button fly-in, cursor, click, drift, whip; s4's ember card sliver on f413.
- Ground: `s3-ground` (maple-ground 8966 +4834): black, hold to white at 10028.33 (5 ms before
  f301; the field covers the frame until f303 anyway).

All numbers are stage px on `ref/f720` (frame n = n/30 s), measured per frame. Scripts in
`sections/s3/py/` (resize.py, bg.py, bgfit.py, shrink.py, tilefit.py, typ.py, pan.py, btn.py,
grid.py, trace.py).

### Beat list (re-traced; corrects BEATS where noted)

| frames | beat | mechanism (measured) |
|---|---|---|
| f269 | hard cut to the full-bleed ember field, white mark (pink knockout), selection box, cursor on the br handle | mark centred (640, 359.5); W (vertical-edge distance) 244 on the cut frame (blurred) |
| f269–f290 | resize = alt-drag about the centre | W = 458 − 214·0.81^(f−269): 285, 322, 347, 367, 385, 399, 410, 420, 427, 432 (f279) … 458; residual < 3 px. Visible height 1.183 W. Box = mark + 1.3 px (x) / + 2 px (y), line ~1.6→2.1 px, corner handles that scale with the mark (0.034 W: 8.5 px f269 → 15.6 px f290). Mark edge blur f269–f271 (sub-frame average); box and handles stay sharp. BEATS' "250 → ~500" was the bbox incl. handles/cursor |
| f269–f285 | the gradient itself settles (not a zoom: a scale/origin fit leaves 9.8 vs 10.5 mean error) | swoosh edge at y10: x 1021, 1030, 1039, 1046 … 1082; corner tl [80,65,106] → [69,67,101]; rebuilt as a per-cell crossfade of two sampled grids, x0.83/frame |
| f269–f298 | cursor rides the br handle | tip = box corner; tip → right wing (48, 16) |
| f299–f301 | cursor leaves down-right, smeared | (868,631) → ~(925,700) → gone |
| f300–f302 | the mark shrinks inside the still field | W 458, ~440 (heavily zoom-blurred), 254; the box is SHARP and lags one frame (458 at f301, 250 at f302), faint handles at f303, gone f304 |
| f303–f311 | the field becomes the app-icon tile | rounded square (r = 0.23 side) about the centre, side ≈1050, 720, 490, 335, 236, 177, 141, 121, 114, 113 (f311); zoom blur (centre sharp, edges smeared); white revealed round it. The field inside keeps its 16:9 aspect and shrinks slower (fit on f304–f312: 560, 414, 379, 344, 330, 320 px wide), offset +76/−7 px, so the resting tile shows the field's red left-centre (BEATS/brief "app icon carrying the small mark" — the crop was unmeasured) |
| f303–f308 | the mark keeps shrinking | W 110, 70, 54, 48, 46, 45 (rest 45 × 53, centre 640, 359) |
| f312–f313 | hold | tile x584–696, y304–415 |
| f314 | caret appears | [0,147,252], 5 × 102 px, x758–762, y307–408; no blink anywhere in the section |
| f314–f360 | typing glides | caret world x 760, 762, 766.5, 774.5, 784.5, 798, 813 … 1811 (f356), 1821.5 (f360): bell-shaped speed (peak ~36 px/frame f336–f341). Glyphs pop from ~0.2x at their final slot over ~2.5 frames, inserted as the reveal passes their slot (tiny c f316, full f318; r f320; e f322). Ink [20,20,20], x-height 46 (c f320: y336–382), ascender 60, baseline 382, line ink x732–1809 (1077 px) |
| f318–f398 | caret-tracking pan (text + tile + caret, one layer) | offset 2, 5, 10, 16, 24, 33, 44 … accelerating ~1.75 px/frame² to 41 px/frame (f345–f349), then decaying (36 f357, 26 f367, 17 f377, 10 f387, 6 f397). Measured from the tile edge (to f344), band correlation (to f377) and the parked caret (world x 1819) after. BEATS' "caret runs right to x~1000 then the camera pans" is the same thing seen in screen space (caret screen x peaks 1005 at f338) |
| f352–f385 | send button flies in on its own curve | centre x = 640 + 496.5·0.858^(f−353) (per-frame ratio 0.85–0.87 throughout), side = 189 − 126·0.785^(f−353) (29 f352 … 165 f360 … 189); centre y 360. BEATS' "~64 px" was 1/3 of the real 189 px. Horizontal smear f352–f357 |
| f357–f382 | cursor glides in from the lower right | straight line, ~0.86/frame: tip (1243,637), 1164,601, 1093,571, 1035,544, 985,521 … 717,395 (f372) … 659,369 (f383); white fill, black edge, tip → right wing (62, 20) |
| f390 | click | button 189 → 145 (0.765x) in ONE frame; cursor presses to 0.79x |
| f391–f409 | button + cursor drift down | button centre y 359.5, 364, 379.5, 398, 419, 439, 457.5, 474, 488.5, 501.5, 513, 522, 530.5, 536.5, 541.5, 546, 549, 551.5, 552; the cursor overshoots by up to 28 px (tip y 566, 574, 576 f405–f407) then springs back (568, 562) |
| f410–f413 | whip | button centre 513, 264, ~52, ~−70 with a vertical stretch + blur (extent 168 px f410, 190 px f411); the cursor releases (0.79 → 1) and drifts down-right, accelerating: tip (660,565), (670,576), (688,597), (709,619) |
| f413 | s4's ember card enters | top edge y668, x259–1020 (riseState(413) for x/scale, top pinned to the measured 668), cursor on top |

### Build notes

- Ember field: 32 × 18 cells (40 px) sampled off f302 / f269 (cells under the mark inpainted),
  SVG rects under a 0.55-cell Gaussian, plus seeded grain (overlay, 0.09). The shared
  `GRADIENTS.ember` spec was not used for the full-bleed: the sampled grid is closer, and it
  makes the settle (f269–f285) a per-cell crossfade. When the tile is larger than the field box
  (f303–f306) the field is edge-extended with a wide-blurred margin (the reference tile shows
  more art than the full-bleed did there — a lilac left edge and a violet lower-left corner the
  frame never showed).
- Zoom blur and the fly-in / cursor smears are exact sub-frame averages (additive layers at 1/n);
  the static field is drawn once (averaging a static gradient only adds 8-bit banding).
- Prompt type: Arial (Inter is not installed) sized by x-height 45.3 → 1083 px line (ref 1077);
  Segoe UI at the same x-height would run 7% long. Advances measured with canvas measureText,
  so other copy reflows; the pan scales with the line length (caret travel ratio).
- Cursor: `ArrowCursor` placed by its dark-edge tip (path tip = measured tip + 0.055·size);
  size 50 in the resize phase (48 px tip → wing), 65 in the prompt phase (62 px), 0.79x pressed.
- f413 card sliver: drawn with s4's `CARD_ART.ember` (exported from maple-s4.jsx at assembly;
  the section pass had kept a copy, `EMBER_CARD`).

### Verification

- pairs: `pairs1`..`pairs9` (ref | ours PNGs; 19 timestamps in pass 1, then the beats that
  needed work: f269-f272, f301-f306, f316-f340, f359-f362, f386, f395, f411-f413), sheets in `sh/`.
- motion: `trace_final.txt` = per-frame ref/ours, f269-f413, from `sbs.ours.mp4`: 160x90 thumb
  diff (motion energy) + per-phase measurements (mark width, tile width at the centre row, caret
  left x, button core centre / width).
  - mark width f269-f300: max |Δ| 5 px (f271, blurred), mean 1.5
  - tile width f303-f312: max 12 px (f303, blur extent), mean 2.1
  - caret x f314-f397 (= typing glide + pan): max 2 px, mean 0.4
  - button centre f353-f412: x ≤ 3 px (one ref-measure glitch at f391), y ≤ 4 px; width ≤ 5 px
  - motion energy: resize 0.29 mean |Δ|, typing 0.16, button/cursor 0.16; shrink f303-f305 runs
    37-41 vs 43-45 (ours a little softer on the two hardest blur frames)
- Maple copy rendered separately (`stages/s3/maple`, `maple_sheet.jpg`): "create variations of
  this mark" reflows (same glide, pan scaled by the line length), button/cursor unchanged.

### PASS / PARTIAL / FAIL

| beat | frames | verdict | delta |
|---|---|---|---|
| cut to the full-bleed field + white mark + box + cursor | f269 | PASS | mark/box/cursor within 3 px; mark is MapleMark (arrowhead knockout) by design |
| resize (alt-drag about the centre, x0.81/frame), edge blur, scaling handles | f269-f290 | PASS | width ≤ 5 px every frame, diff trace within 0.8 |
| field settle (G269 → G300 crossfade) | f269-f285 | PARTIAL | colour drift matches; the swoosh edge fades rather than slides, and the ref's thin dark fold line in the red is softened by the grid blur |
| film grain | f269-f302 | PARTIAL | re-rolled per frame like the ref; still-frame diff 0.3 vs ref 0.4-1.2 |
| cursor rides the handle / exits down-right | f269-f301 | PASS | ≤ 3 px; exit smear eyeballed from 2 frames |
| mark shrink in the still field, sharp lagging box | f300-f302 | PASS | box 458/250 on the right frames; mark blur close |
| field → icon tile with zoom blur | f303-f311 | PARTIAL | sizes ≤ 12 px (≤ 3 px from f305); colours approximate on f303-f305 (the ref tile shows art beyond the full-bleed crop: deeper navy corner, lilac edge; ours approximates with an overlay); resting tile crop fitted (mean error 2.8 levels) |
| resting tile | f311-f313 | PASS | 113 px, crop matches; f312/f313 scene seam byte-identical |
| caret appears | f314 | PASS | x 759 vs 758 |
| typing glide + glyph pops | f314-f360 | PASS | caret ≤ 2 px every frame; pop placement/timing matched on f316-f340 stills |
| caret-tracking pan | f318-f398 | PASS | via caret/tile: ≤ 2 px |
| prompt type face | f316-f398 | PARTIAL | Arial stand-in for the Inter-class face: x-height 45.3 vs 46, line 1083 vs 1077 px; glyph shapes differ slightly (a, t) |
| send button fly-in (own exponential), horizontal smear | f352-f385 | PASS | x ≤ 3 px, side ≤ 5 px |
| button look | f352-f409 | PASS | body/rim/top highlight/grey shadow measured at f386 |
| cursor glide-in | f357-f383 | PASS (path) / PARTIAL (smear) | tip path from the measured keys; the ref's moving cursor reads lighter grey than our averaged black edge |
| click (0.765x, cursor 0.79x) | f390 | PASS | same frame, width 144 vs 144 |
| drift down + cursor overshoot/spring | f391-f409 | PASS | y ≤ 2 px |
| whip up (stretch + vertical blur), cursor release + drift | f410-f413 | PASS | centre ≤ 6 px; diff 7.3 vs 6.3 at f411 (ours a touch crisper) |
| ember card sliver | f413 | PASS | top 668, x 259-1021, cursor on top |

### Seams

- f268 → f269 (s2 → s3): hard cut, nothing carries over. s3's scenes start at 8966 ms (s2's
  end there), so f269 = 8966.67 is s3's.
- f312 → f313 (inside s3): `maple-icon-resize` ends 10416, `maple-prompt-send` starts 10416;
  the resting tile is identical on both sides (verified byte-identical).
- f413 → f414 (s3 → s4): s3 draws s4's ember card at top y668 using `riseState(413)` for scale
  and x, and its card art (s4's `CARD_ART.ember`, imported). The grey cursor stays
  on screen at (709,619) on f413 and is not in s4's frames (the ref has none at f414). The send
  button's blur leaves the top edge on f413 (bottom edge ~y25).

## s4 — the rolodex (f414–f510, 13800–17033 ms)

Preset: `maple-rolodex` (templates/maple/presets/maple-s4.jsx). One preset owns the whole
beat: cards, flips, the lifted mark and the cursor run through each other. Scenes:
`s4-ground` (maple-ground, 13800 +3233, per-frame keys of the fade) + `s4-rolodex`
(13800 +3233). No strings in this section, so `scenes.json` = `scenes.match.json`.

### For s3: the card's first keys (f413 sliver)

The rise is ONE exponential in scale and position (fit residual < 2 px on top, bottom and
width over f413–f430):

    n = f − 413, p = 0.785^n
    s  = 1 − 0.115 p              (card 860 × 484 at s = 1, radius 15)
    cy = 360 + 515 p              (card centre; x centre 640)
    top = cy − 242 s, left = 640 − 430 s, no tilt, NO motion blur (edge ramp 1–2 px)

| frame | s | top y | bottom y | x | ref top (measured) |
|---|---|---|---|---|---|
| **f413** | 0.885 | **661** | 1089 (off) | 259–1021 | **668** (x259–1020) |
| f414 | 0.910 | 544 | 984 | 249–1031 | 545 (x248–1031) |
| f415 | 0.929 | 452 | 902 | 240–1040 | 452 |
| f416 | 0.944 | 381 | 838 | 234–1046 | 379 |
| f417 | 0.956 | 324 | 787 | 229–1051 | 323 |
| f418 | 0.966 | 280 | 747 | 225–1055 | 280 |
| f420 | 0.979 | 218 | 692 | 219–1061 | 218 / bottom 692 |

At f413 the reference sliver is 52 px tall (y668–719, x259–1020): ember gradient (pink-red left,
violet right), white ground [253,255,252] around it, the grey cursor still on the right. s3
should draw y668 (the model's 661 is 7 px high on that one frame; from f414 on the model is
within 2 px). `riseState(f)` is exported from maple-s4.jsx and returns `{s, ty, rect}` if s3
wants to import it (rect = screen x/y/w/h/r of the untilted card).

### Beat list (re-traced frame by frame, full-decode f720 frames)

Tools: `py/card.py`, `py/edges.py` (linear fit of the card's side edges → top/bottom width,
keystone), `py/fit.py` (camera fit), `py/rows.py`, `py/sliver.py`, `py/mark2.py` / `py/rot.py`
(mark centroid + rotation from side-edge slope), `py/trace.py` (ours vs ref per-frame diff +
card top + mark centroid).

**Mechanism (named):** a rolodex in ONE perspective camera. Cards are flat 860×484 planes
(radius 15) hinged on their bottom edge (y602, x210–1070). Fitting top width vs top y of the
tilting card over 20 frames gives perspective 1580 px, origin (640, 335), residual ~3 px. Each
front card falls TOWARD camera about the hinge (top gets wider and drops; BEATS' "tilts back" is
the wrong way round), flips over the hinge, hangs below it and drops out; the next card waits
behind and settles. Built as CSS 3D (`perspective` + `rotateX` about the hinge).

| frames | beat | measurement |
|---|---|---|
| f414–f423 | ground fade white→black | corner 195,130,93,67,46,31,18,10,3,0 (per-frame hold keys, set 5 ms before each frame) |
| f413–f431 | ember card rises, expo-out | one exponential (see table above), r 0.785/frame; no blur |
| f419–f436 | ember tilts toward camera | θ = 28.5°·1.27^(f−436): 1.7° f424, 4.7 f428, 9.6 f431, 18.1 f434, 28.5 f436 (pure exponential, ratio 1.24–1.29 every frame) |
| f437–f439 | ember flips, blurred | θ 38, 48, 64 (from the blurred top edge y~200/266/416) |
| f440–f443 | ember hangs and drops | θ ~125 (sliver edge slope 0.35 px/row), rigid drop 32 px/frame: sliver top 604, 636, 667, 698 |
| f436–f440 | orchid waits behind, settles | top 145/128/124/116, s .944→.995, hinge fixed (its bottom never shows) |
| f440–f447 | orchid tilts, flips | θ = 37·1.27^(f−445) (10.9 f440 … 37 f445), then 46.5, 60 |
| f448–f451 | orchid hangs (θ~100, slope 0.76) → 125 + drop 32, 63, 95 | |
| f446–f449 | dawn waits behind | top 163/147/128, s .907→.995 |
| f449–f455 | dawn tilts, flips | θ = 34.3·1.27^(f−453), then 44, 56 |
| f456–f460 | dawn hangs (100) → 125 + drop 17, 48, 79, 110 | |
| f453–f476 | lagoon revealed FLAT, grows about (640,360) | s = 1.0965·(1 − 0.176·0.79^(f−456)); widths 668 f454, 777 f456, 860 f459, 943 rest; rest x168–1111, y95–625, radius 16 |
| f459–f470 | chevron cursor rises onto the mark, expo-out | tip y 580, 473, 403, 357, 327, 303, 288, 273, 267, 260 → (655,257); 56×55 px hollow up-chevron, 2.5 px black edge; blurred while fast |
| f476–f484 | lift (drag) | grip y 253, 248, 237, 211, 132, 108, 99, 94, 91 → rest (654, 90) |
| f479–f498 | mark swings from the grip (pendulum) | rot +3.6, +5.7, +4.7, +3.2, +1.5, −0.4, −1.9, −3.4, −4.4, −4.8 (f488), −4.5, −4.0, −2.7, −1.6, −0.7, +0.3, +0.9, +0.9, +0.5, 0 (f499); centre = grip + R(rot)(−16, +104) |
| f478–f490 | soft drop shadow of the lifted mark on the card | ~(−6, +22), blur 16, α .38; knockout = true hole (teal shows through, black after the card leaves) |
| f485–f492 | card drops out, accelerating ×~2 | top +1, 4, 11, 24, 50, 99, 191, 379; gone f493; vertical blur ≈ 0.6–0.7 × travel |
| f495–f496 | release: chevron → pointer | rotate −32°, ×0.82 about the tip (pointer tip 654, 89) |
| f499–f510 | mark sinks, accelerating, shrinks, blurs | centre y 195, 197, 199, 202, 205, 210, 215, 224, 236, 254, 282, 321; width ×1 → 0.90 |
| f505–f510 | pointer exits up-left, accelerating | tip (652,86), (648,81), (641,66), (629,46), (607,11), (585,−15) |

Motion blur: the rise and the lagoon grow are SHARP in the reference (edge ramp 1–2 px at
90 px/frame). Flips, card drop, mark lift/sink and the cursor are blurred: edge ramps ≈ 0.6 ×
the per-frame travel (lift ≈ 0.35). Rebuilt as an exact sub-frame average (additive
`plus-lighter` layers at 1/n in an isolated group) plus a small vertical-only Gaussian on each
sample for long sweeps.

### For s5 (seam f510/f511)

f510 (last s4 frame): the lagoon blades mark alone on black, centre (639.6, 321), width ~189
(×0.90), heavy vertical blur (top/bottom ramps ~24 px), knockout black; the pointer is a
blurred tail at the top edge (x~585, y<0). f511 is a hard cut into mockup-1; nothing carries over.

### Gradient specs (local refinements, reported)

The shared `GRADIENTS` read wrong on the cards, so maple-s4.jsx carries `CARD_ART` (same
format, passed as `spec`): ember lost the S3 dusky top-left corner and big lilac swoosh (card
f424 is pink top-left, red/orange lower-left with a coral corner wedge, indigo lower right);
orchid's swoosh is the big sharp-edged near-white wedge from the top edge at x~35% to the right
edge at y~55%; dawn gets the broad peach/orange glow low centre and a soft cream band; lagoon
gets a slate-blue left third and a wide red flame at x~29%. Suggest folding these into
`GRADIENTS` as `*Card` variants if other sections need the card look.

### Verification

- pairs: `pairs1` (22 stills, first build), `pairs2`–`pairs5` (iterations); sheets `ps*.jpg`,
  gradient comparison `grads1.jpg`, motion strip `motion1.jpg`.
- motion: `trace_final.txt` = per-frame diff (160×90) ref vs ours + card top + mark centroid,
  f414–f510 (see the table below for the summary).
- `sbs.mp4` (ref | ours, f414–f510).

### PASS / PARTIAL / FAIL

Per-beat numbers from `trace_final.txt` (diff trace = mean abs per-frame change on 160×90
thumbs; card top = first row with a >200 px saturated run):

| beat | frames | verdict | delta |
|---|---|---|---|
| ground fade | f414–f423 | PASS | corner values within 2 levels each frame (one-frame lag bug in pass 1 fixed: keys 5 ms early) |
| ember rise (expo-out) | f414–f431 | PASS | card top ≤2 px every frame; diff trace mean delta 0.58 |
| tilt toward camera (keystone) | f419–f436 | PASS | top ≤3 px, widths ≤5 px; diff trace delta ≤0.5 |
| flip 1 (blur, hang, drop) | f437–f443 | PASS | top ≤5 px; diff 11.6/12.3/20.2/26.4 vs ref 10.1/14.4/19.2/21.8; smear reads continuous after the vertical-Gaussian fix |
| orchid settle/tilt/flip | f436–f451 | PASS | top ≤7 px (≤4 after the anchor retune except the blurred f448) |
| dawn settle/tilt/flip | f445–f460 | PASS | top ≤4 px |
| lagoon reveal + grow | f453–f476 | PASS | top ≤1 px, mark centre ≤1.2 px |
| chevron cursor entry | f459–f470 | PASS | tip path from measured keys; blurred while fast like the ref |
| lift + pendulum swing | f476–f499 | PASS | mark centroid ≤5.9 px (f480, mid-whip, blur weighting), ≤1 px elsewhere; rotation keys from the ref |
| drop shadow | f478–f490 | PARTIAL | eyeballed (−6, 22, blur 16, α .38); ref shadow is a touch larger/softer |
| card drop (blur) | f485–f492 | PASS | top ≤2 px to f491, 7–9 px on the f492 smear |
| release (chevron → pointer) | f495–f496 | PASS | rotate −32°, ×0.82; tip ≤2 px |
| mark sink + shrink + blur | f499–f510 | PASS | centroid ≤1.4 px; diff trace delta ≤0.44 |
| pointer exit up-left | f505–f510 | PASS | measured tip keys |
| card art (gradients) | all | PARTIAL | local CARD_ART specs close in hue/layout; mesh shapes are approximations (orchid's lower diagonal band, lagoon flame edge are softer than the ref) |
| marks on cards | all | intended difference | Maple `main` / `blades` / cube vs the reference's own marks (no real marks); the ref's thin-slot tri-blade reads as our samara blades |

Caveats: the additive sub-frame average quantises (8-bit) at 10–14 samples, so the flipping
cards show faint contour banding in the smooth gradients for 1–2 frames each; invisible at speed.
Back cards before they become front are keyed per frame (not a clean curve) because only their
top 10–40 px are ever visible.

## s5: mockups, prompt card, outline wordmark, font flash (f511-f690, 17033-23033 ms)

Presets (templates/maple/presets/maple-s5.jsx): `maple-mockup-montage`, `maple-prompt-card`
(rendered twice: `layer:"grid"` and `layer:"card"`), `maple-outline-wordmark`, `maple-font-flash`.
Scenes (both files): `s5-ground` (maple-ground 17033 +6000), `s5-mockups` (17033 +2000),
`s5-dot-grid` (19033 +2567), `s5-outline-wordmark` (19033 +3033, draws from f634), `s5-prompt-card`
(19033 +2567), `s5-font-flash` (22033 +1000).

Layering note: the timeline sorts scenes by startMs (stable), so a later-starting scene always paints
on top. The outline wordmark must sit UNDER the exiting card, so its scene starts at 19033 with the
card (listed before it) and renders nothing before f634.

Scripts in `py/`: track.py (button/tile per frame), rows.py + fit.py/fitgrid.py (dot-grid plane fit),
fitcard.py (card 3D fit), cardexit.py/lock.py (exit + lockup tracks), wash.py (slot washes),
compare.py (ref vs ours per-frame trace -> `trace.txt`), mkcfg.py (writes all four configs).

### Beat list (re-traced on the full-decode frames)

| frames | beat | measurement |
|---|---|---|
| f511-f570 | 8 photo slots, hard cut every 6 frames (511 517 523 529 535 541 547 553), billboard static f553-f570 | diff <= 0.6 inside each shot; billboard bbox identical f553-f570 (BEATS' "faint push" is not there) |
| all mockups | variation mark at a fixed screen spot | centre (639,360), 183 x 206 px (rounding ~80 mark units), true-hole knockout; colours white / black / white 0.94 / grey-white / gradient / white / black / black |
| f517-f522 | coffee photo is an INSET | x129-1149, y0-706; the brochure photo shows round it |
| strings | m1 "Lorem" 24 px + small mark (329,42), credit 23.6 px right-aligned x958, "THE" Arial Bold cap ~125 bottom; m3 "Lorem" 54 px light under the mark + small mark/"Lorem" top-left; m4 "Lorem"/"Arrow" 13.5 px top/bottom; m6 "Arrow" cropped at x1233; m8 "LOREM" Segoe UI Bold 109 (cap 76) either side, credit 16 px right x1140 | widths from ink bboxes |
| f571 | cut to white + dot grid | grid pitch 53.4 x 64 (not square), rows y=41+64k, cols x=641+53.4k, dots ~[228]; big dots at rows 233/361, cols 214/641/1068 |
| f571-f592 | grid layer settles on its own | row x-pitch 60.8 (f571) -> 53.34 (f592): scale 1 + 0.21 x0.795^n about (641,360) + 15 deg x0.8^n tilt, P 1600 (fit rms <= 0.5 px) |
| f571-f590 | card enters on its own 3D transform | P 2000, origin (640.5,360.5): translateY 242 x0.76^n, scale 1 + 0.257 x0.76^n, rotateX 48 (1-n/16)^1.5 deg, horizontal-only blur sigma 4.1 x0.76^n (button edge ramp 8,6,5,4,3 px, vertical ramp sharp). One plane with the grid does NOT fit (rms 40 px) |
| rest | card | x138-1142, y224-495, r 26, 1 px border + shadow (-29 levels at y496); tile x166-249 y252-335 r13; button x1025-1121 y376-473 [28,88,236]->[27,84,227]; text x177, baseline 428.5, Segoe UI 42.8 px (placeholder 597 px wide = ref) |
| f572-f586 | placeholder glyph wave + line tail | glyphs settle left to right (visibly settled: 6 by f572, 11 f574, 16 f576, 20 f578, 24 f580, 28 f584); whole line also 15 px low at f574, x0.85/frame |
| f575-f586 | tile fades in | lum 190,147,112,85,63,47,34,23,16,10,4: x0.765 from f574 |
| f602 / f603 | placeholder fades blurred / gone | |
| f603-f629 | "Add a wordmark to this logo" types on | per-glyph appear frames from the ink right edge per frame; each glyph pops small + blurred for one frame; no caret |
| f630-f635 | click | card turns: rotateY 8.5 deg about x1005, scale 0.945 x 0.97, shift -16.7 (fit on tile, text ends, button, card edges at f634; residual <= 3 px); button 96 -> 70 px f632-f633 (gradient inverted), back 83/88 f634/f635 |
| f633 / f634 | ground [251] / cut to grey [192] | then x0.79/frame: 192,152,118,94,74,59,47,37,29,23,18,15,11,9,7 ... 0 by f654 (corner.txt lags from f637; measured on 8 points) |
| f633-f647 | grid in the grey phase | dots +75 at the cut then drift up, -104.5 + 179.5 x0.8^(f-634); dot opacity x0.76/frame; dots lighter than the grey |
| f635-f646 | card exits up with a CW turn | bottom at x900 424,325,249,189,142,105,76,53,35,20; dy = -520(1-0.785^(f-635.4)) - 6(1-0.75^(f-636.5)); rz 2.1(1-0.72^(f-635.4)) deg (bottom slope .017-.029) |
| f634-f652 | blades mark slides out left | 210 x 237 px, centre y 359.5, x = -207 + 505 x0.91^(f-636), horizontal smear sigma 0.22 x speed |
| f637-f660 | outline wordmark pans left | Arial Bold 244.8 px, -2.5 px tracking, 2 px white stroke, ink 627 x 175, baseline 447; ink left 325 + 148 x0.872^(f-637) |
| f638-f647 | last glyph ("m") draws on as a stroke | dash over the glyph outline length (raster edge count x1.12), f637.7 -> f647.5 |
| f661 | ghost | outline word filled 25% white under the first flash face, gone f662 |
| f661-f690 | font flash, cut every 3 frames | ink bboxes: blackletter 290-989 x 238-492; rounded 217-1062 x 273-470; serif caps 237-1042 x 302-474; serif 255-1024 x 234-466; techno 211-1068 x 321-463; grotesk 327-952 x 275-447 (= the outline face filled); round geo 209-1070 x 252-468; then blackletter, rounded, serif caps |

### Verification

- pairs: `pairs1` (mockups), `pairs2`-`pairs6` (card, transition, flash iterations), `pairs_maple*`
  (Maple copy); crop sheets in `sh/`.
- `sbs.mp4` (ref | ours, 17.0-23.067 s, final build); `trace.txt` = per-frame ref vs ours: 160x90
  diff, button centre/width, text band, card bottom at x900, word left, flash ink bbox, ground.
- Final numbers (ref | ours): button centre f572 (1174,606)|(1172,607), f574 (1132,526)|(1132,528),
  f576 (1108,483)|(1109,484), f588 (1074,426)|(1074,426); entrance diff trace 3.35/3.60/3.16/2.94 vs
  2.95/3.06/2.85/2.79, then within 0.06 every frame to f600. Typing ink right edge within ~5 px per
  frame (f612 363|363, f620 601|598, f624 670|665). Click f630-f633 button within 3 px, size 70|68.
  Card bottom f636-f645 within 2-5 px every frame. Ground within 2 levels every frame. Word left
  within 1 px f637-f660. Flash ink boxes within 1-3 px (blackletter 6 px, round geo 10 px wide).

### PASS / PARTIAL / FAIL

| beat | verdict | delta |
|---|---|---|
| f511-f570 cut rhythm, mark spot/size, inset f517, strings | PASS | cuts on the frame; mark centre/size within 2 px; strings at measured spots |
| mockup photos | PARTIAL (by design) | slots: blurred tonal washes of the reference layout + corner caption until real photos are given (`srcs`); the cut diff is lower (33-65 vs 48-93) because a wash has no texture |
| mockup mark shape | intended difference | Maple blades (samara wings) vs the reference's thin Y slots |
| f571 cut + dot grid settle | PASS | grid rows/pitch from the plane fit (rms <= 0.5 px) |
| f571-f590 card 3D entrance + h-blur | PASS | button <= 3 px from f572, diff trace within 0.4 |
| placeholder glyph wave | PARTIAL | settled-glyph count within ~1-2 glyphs per frame; blur/fade profile eyeballed |
| tile fade, placeholder clear | PASS | |
| f603-f629 typing pops | PASS | per-frame ink right edge within ~5 px |
| f630-f635 click + turn | PASS | <= 3 px (text right end 5 px) |
| f634 grey cut + fade | PASS | <= 2 levels |
| grey-phase grid drift/fade | PASS | row phase per frame from the measured drift |
| f635-f646 card exit | PASS | <= 5 px per frame |
| mark slide-out + smear | PASS | centre within ~4 px; smear approximated with a horizontal Gaussian |
| outline wordmark pan | PASS | <= 1 px |
| last-glyph draw-on | PARTIAL | timing matches (about 50% at f643, 90% at f646); the stroke starts at the font's contour start (mid-top of the "m"), the reference starts at the left stem |
| f661 ghost | PASS | |
| flash timing (10 hard cuts) | PASS | every 3 frames from f661, last state through f690 |
| flash: blackletter (f661, f682) | PARTIAL | no blackletter installed: DRAWN textura glyphs (broad-nib pen strokes for L o r e m; other letters fall back to Cambria). Size/position match; the "L" is simpler than the reference's Old English capital |
| flash: heavy rounded (f664, f685) | PARTIAL | Segoe UI Black rounded by a blur+threshold filter: right weight and size, but not the reference's bubbly Cooper-like shapes |
| flash: serif caps / serif / grotesk | PASS | Book Antiqua (+3.5 px stroke) / Times New Roman / Arial Bold; ink boxes within 2 px |
| flash: techno caps | PARTIAL | Bahnschrift stretched x1.375: size/position match, no stencil cuts |
| flash: round geometric | PARTIAL | Century Gothic + 15 px round stroke; box within 10 px, letterforms close |

### Seams

- f510 -> f511 (s4 -> s5): hard cut; s5's first frame is mockup-1 (all s5 scenes start at 17033).
- f690 -> f691 (s5 -> s6): every s5 scene (ground included) ends at <= 23033; f690 = serif caps
  "LOREM" on black; f691 (23033.3) belongs to s6 alone.

### Notes for the orchestrator / shared

- The prompt-card scene carries two texts: `placeholder` (product-voice) and `prompt` (user-voice);
  the scene has `role: "user-voice"` plus a `roles` map.
- `labels` on the mockup scene are used for the corner captions (default: SLOTS labels).
- Suggest for maple-shared.jsx: a `MapleMark` option to set the knockout rounding independently of
  the hexagon's (s5 needs hexagon ~80 units with blades ~10; MapleMark ties them 0.7x), so
  `BladesMark` in maple-s5.jsx could go. Also `ImageSlot` could take a label position (its centred
  label sits under any composited mark), which is why s5 draws its own corner caption.

## s6 — brand close (f691–f899, 23033–30000 ms)

Preset: `maple-brand-close` (templates/maple/presets/maple-s6.jsx). One preset owns the whole
beat because the cursor runs continuously through every phase. Scenes: `maple-ground`
(23033 +6967, black [0,1,0], hold to pure [0,0,0] at f889) + `maple-brand-close` (23033 +6600,
ends on the f889 cut). rf below = frames after f691.

### Beat list (re-traced frame by frame, full-decode f720 frames)

| frames | beat | measurement |
|---|---|---|
| f691 | cut to black, cursor alone | tip (639,369), white glyph 55 px |
| f692–f715 | lockup grows out of the cursor point (alt-drag resize about the box centre 639.25,359.5) | s = 1 − 0.79^(f−691), pure exponential (box widths 295,339,370,395,415,430 @f695–700; remaining ×0.79/frame). Content scales; box line + handles do not. Cursor pressed (55→47 px) f692–f721, tip = br + (0, 12(1−s) − 2.5) |
| f692–f708 | guides DRAW ON from the frame edges | h (y359.5) end x 79,146,199,239,271,297,317,333,346 … = 398·(1 − 1.015·0.79^rf); v (x640) end y 55,111,155,189,215 … = 321.5·(1 − 1.05·0.79^rf); dashed 6/4.6, ~2 px, ~[80,121,150] |
| f716–f722 | guides ERASE from the far end, accelerating | h start x 8,40,83,147,223,339,gone; v start y 44,110,200,gone (ease-in p^1.6) |
| rest | lockup | box line x398–880.5, y321.5–397.5; handles 13 px (white, blue edge) tl tm tr bl br; logo x400–466 y323–390; "Quiver" ink x502–792, cap 65, x-h 50, baseline 391 (Century Gothic 700 @ cap 65 = 289.8 px wide, ref 290); light "A" x796–852 (Segoe UI Light); the "I" is an I-BEAM glyph x857–879 y323–391 (taller than caps). Selection tint over content = rgba(select,0.105): black→[2,15,23], white→[230,245,252] |
| f722–f723 | release | cursor 47→55 px |
| f725–f734 | cursor slides up the right edge br → mid-right | tip y 397,393,388,381,374,369,366,364,362,361 |
| f749–f750 | press | 55→47 px |
| f751–f765 | collapse: right edge dragged in; content anchored to the box's LEFT edge, cropped at its right edge | box (incl. handles) 494,482,330,237,181,145,121,106,96,89,85,82,81,80,79; remaining ×0.635/frame from f750.95; centre 639.25→635.25 |
| f766–f775 | release, cursor drops | tip y 361,362,365,372,386,409,427,436,440,441 → rest (676,441) |
| f782 | deselect = a click on empty canvas | cursor pressed f782 (45 px), up by f784; box ~40% one frame, tint off, logo pure white; box gone f783 |
| f783–f788 | url types on, left-anchored at its final centred spot | x559–721, x-h 430–446, baseline 446, advance 18.5 px (→ Consolas 33.6 px; the brief's "~28 px" undercounts), glyph pop ×0.35→1 over 1.6 frames from the baseline; per-glyph offsets 0,.3,.7,1.05,1.4,1.7,2.5,3.3,4.3 from f783.3 |
| f793–f800 | cursor exits down-right, accelerating ×1.68/frame | tip 677,443 → 683,451 → 688,458 → 696,469 → 708,488 → 729,517 → 762,565 → 820,648; gone f801 |
| f802–f888 | dead-still hold | diff 0.00 |
| **f889–f899** | **hard cut to pure black** | see below |

### The f889 "blip": a real beat, not an encode artifact

f888 → f889 changes 4646 px with max delta 254 across the logo + url box (x558–722, y324–451);
f889 = f890 = … = f899 exactly, and all-black (max channel 2). On the 60 fps source, frame 1777 still
carries the end card and frame **1778 (29.633 s) is the first all-zero frame**, held to the end.
The corner trace shows only diff 1.13 because the end card covers so little of the frame. So the
film hard-cuts to black for its final 11 frames (367 ms). Rebuilt: the preset scene ends at 29633 ms
and the ground goes to [0,0,0] there.

### Verification

- pairs: `pairs1`..`pairs4` (ref | ours PNGs, 40+ timestamps incl. mid-motion); crop sheets `cmp*.png`.
- metric table (blue box bbox and light-ink bbox, ref vs ours) via `metric.py`: box edges within
  1–3 px at every sampled frame of the grow and collapse; cursor bbox within 1–7 px.
- motion: per-frame diff trace (160x90 thumbs) of `sbs.ours.mp4` vs the reference over f691–f899:
  grow 0.53/0.76, 0.95/1.23, 1.37/1.45 (peak f697 both), 1.05/1.05 (f700), decay matched; collapse
  1.81/1.77, 3.67/4.13, 2.96/3.24, 2.20/2.34, 1.60/1.59, 1.04/1.03 … ; drop f769–f774 and exit
  f794–f801 matched to ±0.06. Cursor slide f726–f732 within 3 px per frame.
- Maple copy rendered separately (`stages/s6/maple`, `maple_sheet.png`, `maple_box.png`): "Maple" + "A"
  + I-beam reflows, the box grows down to hug the "p" descender (descPad 3), "maple.example"
  centred.

### PASS / PARTIAL / FAIL

| beat | verdict | delta |
|---|---|---|
| f691 cursor alone (seam) | PASS | tip within 1 px, size 55 |
| f692–f715 grow (curve, origin, box, cursor ride) | PASS | box edges ≤3 px per frame; diff trace matches; ours slightly higher f692–f696 (more ink: leaf logo) |
| guides draw-on + erase | PASS | end/start positions within ~10 px per frame |
| lockup at rest (type size, spacing, I-beam, tint, chrome) | PASS | widths within 1–2 px; logo is MapleLogo (intended difference) |
| cursor release / slide / press | PASS | ≤3 px |
| f751–f765 collapse | PASS | box edges ≤3 px every frame |
| f766–f775 cursor drop | PASS | ≤3 px |
| f782 deselect click | PASS | 1-frame box fade, press |
| f783–f788 url type-on | PASS (type) / PARTIAL (face) | timing per glyph matched; Consolas is a little heavier and less geometric than the reference mono even with the 1.2 px ground-coloured thinning stroke |
| f793–f800 exit | PASS | ≤7 px |
| f802–f888 hold | PASS | dead still |
| f889 cut to black | PASS | real beat, rebuilt |

Caveats: grow tail f709/f712 shows tiny non-monotonic diffs (0.29/0.18 vs ref 0.21/0.10) from
Chrome re-rasterising scaled text at near-1 scales; invisible at speed. MapleLogo's leaf carries
more white than the reference teardrop (+~15% ink on the end card).
