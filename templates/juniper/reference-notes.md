# juniper — reference measurements

Measured off the **Rork Max launch film** (60.0s, 1920x1080 @60fps) on
2026-11-03. Frames were full-decoded, resampled to a 30fps clock (frame n is
at t = n/30 s, source frame 2n) and scaled to the 1280x720 stage, so stage px =
reference px / 1.5. Six section passes measured and rebuilt the film in
parallel. Their notes follow unedited, one per section, on the absolute film
clock; the assembly pass's changes are listed first. Script and folder names
in the notes refer to the night's scratch build (`.demo-build/`, not committed).

| section | range (ms) | presets |
|---|---|---|
| S1 | 0 – 3933 | `juniper-title-stack`, `juniper-phone-trio`, `juniper-cursor-streak` |
| S2 | 3933 – 7800 | `juniper-toggle-pill`, `juniper-warm-bloom`, `juniper-max-word`, `juniper-word-flash`, `juniper-label-assemble`, `juniper-phone-whip` |
| S3 | 7800 – 25100 | `juniper-side-label`, `juniper-phone-comp`, `juniper-watch-comp` |
| S4 | 25100 – 36133 | `juniper-device-label`, `juniper-device-stage` |
| S5 | 36133 – 47066 | `juniper-rise-lines`, `juniper-builder-window`, `juniper-install-phone`, `juniper-s5-cursor` |
| S6 | 47066 – 60000 | `juniper-claim-zoom`, `juniper-bento`, `juniper-endcard` |

Seams: 3933, 36133 and 47066 sit on hard cuts (f118, f1084 and f1412 belong to
the incoming section). 7800 (f234) and 25100 (f753) are held frames drawn by
both sides; s4 draws the watch with the same `UltraWatch` as s3, so the 25100
seam is pixel-identical.

## Assembly pass (2026-11-03)

- **Seams.** Pair stills one frame either side of every seam (f116–f119,
  f232–f235, f751–f754, f1082–f1085, f1410–f1413) needed no fixes.
- **App launch (S5).** The launch card grew ~2 frames early (per-window lag
  trace of the full side-by-side: best shift −2 at f1240–f1252). The
  reference shows the full grid at f1242, an icon-sized card at f1243, ~60% at
  f1244, ~85% at f1245 and the app at f1246. `launchAtMs` 1183.3 -> 1216.7.
- **Push-in blur (S5).** The reference's zoom blur at f1140–f1150 is radial
  about the zoom origin: the far chat panel smears into lines while the toolbar
  stays readable. `juniper-builder-window` gained `zoomStreak` (N copies
  averaged over the last `zoomShutter` = half of each frame's zoom travel);
  the scene uses 10. Omitted, the preset renders exactly as before.
- **Grey-to-ink ramps (S6).** On the 1% luminance percentile of each line band,
  the claim and end-card lines reached ink ~2 frames before the reference.
  Claim fade 300 -> 360 ms (pow 1.6); end-card fade 600 -> 750 ms (pow 1.8).
  Both now track within ~1 frame.
- **Sequential renders.** 70 frames across every moving beat were rendered in
  sequence and again solo. Differences are limited to 1-px anti-aliasing on the
  current edges and sub-pixel text placement (max 155/255 on single edge
  pixels). There were no ghost edges of earlier frames.
- **Shared vocabulary.** `UltraWatch` / `ULTRA` moved from `juniper-s3.jsx` into
  `juniper-shared.jsx`; s3 and s4 import it from there. All 1800 frames hash
  identical before and after the move.

---

## s1 — 0–3933 ms (f0–f117) measurements and verdicts

Traced on every frame f0–f117 (ref/f720). Scripts: `py/trace.py` (text bands), `py/phones.py`
(phone tops, rows that are >80% non-ground inside each phone's straight top edge), `py/cmp.py` (ref vs ours).

### Layout at rest (f80), stage px
- Title "Introducing Rork Max": cap "I" y70–116 (cap 47, so Segoe 67 px semibold), baseline 117, x330–951, centred at 640.
- Sub 1: "T" cap y151–183 (cap 33, 47 px regular), baseline 184, x256–1023. Sub 2: x-height 24 (y207–230), baseline 231, x310–969. Line pitch 47.
- Credit row: "Swift" cap y267–282 (cap 16, 23 px), baseline 283; tile 27x26 at x659–685, y261–286 (red [226,80,74]); gaps 7/9 px.
- Phones: centre body x488–791 (304 wide), sides x94–389 / x890–1185 (296 wide). Rest tops at f103: centre 310, sides 363. Rim is dark copper [110,66,46] in this beat (not the bright orange of 9.0 s), ~5 px rim plus ~5 px black bezel.
- Title, subtitles and credit row do not move after they settle: no group shift. Only the phones drift.

### Motion
- Phones: an exponential settle plus a linear drift. top = rest + 0.29 px/frame * (103 − f) + A·r^f with
  centre A 82, r 0.877; left 76 / 0.88; right 58 / 0.89. Check f0 469/422/451, f5 432/380/425, f10 413/360/409, f20 393/339/392.
  No x motion and no scale change.
- Title: opacity 0 → 1 linear f0–f5 (ink sum .19 .39 .60 .80 1.0). Rise residual 92 (f0), 78 64 52 41 33 26 20 15 11 8 5 3 1 (f1–f13), 0 by f15.
- Sub 1 (anchor f20): opacity speeds up from .04 at f21 to .81 at f30, then a slow tail to 1 by about f42. Rise 43 px, about ×0.875/frame, settled f45.
- Sub 2 (anchor f36): opacity slows down (.09 f37, .61 f45, .79 f50, .91 f55, .97 f60). Rise 68 px, about ×0.895/frame, settled f63.
- Credit row (anchor f44): each word blurs in on one curve, shifted per word. "Powered" +0 frames, "by" +4, "Swift" +8 (checked against the per-word ink sums). Blur σ goes about 6 → 0 by k32. The tile glyph shows faintly first; the tile body fades in f60–f74 and is nearly sharp.
- Push-in f103–f117: one normalised curve (k: .01 f105, .045 f107, .09 f109, .17 f111, .305 f113, .54 f115, .73 f116, 1 f117), about ×1.35 per frame at the end.
  Scale about (640,360) is 1 → 1.0885 (subtitle width 767 → 835; left phone edge 94 → 46). Text translates −72 px and phones +87.4 px.
  The stack and the phones separate, so this is not one rigid transform. Motion blur is directional (SVG feGaussianBlur), σ = k·(speed − 8 px/frame), with k 0.3 for phones and 0.18 for text.
- Cursor: the next beat's arrow streaks in on f116 (tip about 870,680) and f117 (792,642), then f118 (688,578) and f119 (613,527) in s2. It is smeared toward the bottom right and is about 60 px tall.

### Verdicts (2nd iteration, pairs at 0.1, 0.333, 0.8, 1.2, 1.6, 1.8, 2.0, 2.2, 2.667, 3.6, 3.767, 3.833, 3.867, 3.9 + sbs 0–3.9)
| beat | verdict | delta |
|---|---|---|
| phone settle f0–f30 | PASS | tops within 2 px on every checked frame |
| phone drift f30–f103 | PASS | within 1 px |
| title fade-rise f0–f15 | PASS | band top within 1 px; width 622 vs 621 |
| sub 1 entry f20–f45 | PASS | top within 4 px at f24, 1 px when settled; line is 13 px wider (Segoe) |
| sub 2 entry f36–f63 | PASS | within 2 px |
| credit row blur-in f44–f76 | PASS | word order and timing match; Segoe word shapes |
| push-in f104–f117 | PASS | text within 1–2 px; phones lag 1–4 px late in the push (f116 424 vs 428) |
| motion blur f115–f117 | PARTIAL | directional blur present. Text smear is now close; phone edge spread is about right, but the reference also has a slight radial (scale) component that a 2-axis Gaussian only approximates |
| cursor streak f116–f117 | PARTIAL | position matches; drawn as 6 ghost copies (the reference smear is softer) |
| phone screens | slot | flat faces tinted like the footage (room beige, sky/garden, slate map) plus slot labels |

First pass had every text line 8–11 px low: the `font` shorthand was resetting line-height after it had been set. Fixed by ordering the properties. Tracking was then set to −0.025em so Segoe's width approaches SF's.

---

## s2 — 3933–7800 ms (f118–f233) — measurements and verdicts

Frames: ref/f720 (30 fps clock, stage px). Scripts: sections/s2/py/ (fitbloom.py, cmp.py, mkscenes.py).

### Beat list (frame-exact)
| frames | beat | mechanism (measured) |
|---|---|---|
| f118 | hard cut to pill | pill body x389–890 (scale 0.930) |
| f118–f128 | camera settle | pill group 0.930 → 1.000 about (639.5,359.5), expo-out (residual ×0.75/frame); settled pill x370–909, y270–449 (540×180, r 90) |
| f116–f130 | cursor | tip (870,680)s1, (792,642)s1, (688,578), (612,528), (560,487), (526,455), (502,428), (483,408), (472,390), (464,376), (458,365), (455,358), (453,351), (452,345), (451,340); ghost-streaked f118–f121 |
| f130 | press | arrow shrinks |
| f132–f137 | cursor fade | opacity .8 .6 .45 .3 .18 .06 |
| f136–f148 | knob slide | knob centre 461 → 824 px, EASE-IN steps 12, 9.5, 12.5, 15, 16.5, 19, 24.5, 28, 34, 40, 49.5, 61, 41.5 → hard stop; overshoot to 838 (f153), settles back to 829.5 (f164). Knob Ø144. |
| f136–f142 | knob warms | dark [60,62,59] → gradient [242,211,105]→[227,136,66] cross-fade .1 .3 .5 .7 .9 1 |
| f136–f148 | pill warms | pill colour lerps with knob progress: [106,108,105] → [141,133,120] |
| f136–f155 | label slide | ONE text run slides left 572 → 435 px (lags the knob); cream [227,218,153] left of the knob centre, grey [138,140,137] right of it; cap 44 (332–376) |
| f165–f168 | pill exit | scale 1.033, 1.126, 1.28, 1.485 (accelerating), opacity .94 .68 .28 0, defocus |
| f164–f181 | warm bloom | peak field (f172) fit: 130.7° ramp [255,248,223] 0 / [248,198,149] 34.7 / [247,189,146] 44 / [241,156,131] 78.2 / [238,138,112] 100 under an ellipse (606,345; 759×598) fading to [253,237,245] (67→127 %), rms 2.8/255. Opacity per frame f164..f181: 0 .01 .072 .155 .277 .425 .621 .948 1 .721 .542 .403 .29 .196 .117 .057 .016 0. Mid-opacity frames are pinker (residual G −4.8, B +2.2) → right-weighted pink veil 0.75·a·(1−a). |
| f169–f172 | white "Max" | scale vs settled .541 .677 .874 → 1 (f172); centre y 355.5 → 359.5; broad white halo |
| f173–f181 | Max → gradient | white .85 .4 .1 0; gradient fill .2 → 1 by f181 with a clearing blur 4 → 0 px; settled ink x444–834, cap 283–436 |
| f182, f189, f196, f203, f206 | word flashes | hard cuts; x-height centred on y359.5; one continuous zoom-out 0.25 %/frame ("can" 332 → 326 px over 6 frames) |
| f211–f214 | "for [glyph]" | centred (430–848 at S 3.07), same drift |
| f214–f232 | label zoom-down | scale vs settled: 3.05 3.01 2.99 2.95 2.89 2.81 2.70 2.50 2.19 1.80 1.51 1.34 1.21 1.14 1.087 1.05 1.025 1.0125 1 (S-curve, fastest f222–f223); "for"+glyph pair centre travels (640,340) → settled spot on the same progress (checked: 'f' centre x 459.5/385/304.5/281/273 at f211/222/225/228/234, model within 5 px) |
| f220–f230 | device word roll | offset in its clip window 64 54 44 30 18 12 7.5 4 2 .8 0; clip bottom = baseline+17 (flat cut on f222–f225); vertical smear; device word also smears horizontally (its end moves fastest) |
| f222–f228 | sub-label | fades .1 .29 .49 .69 .93 1; scales/travels in x with the block but holds its settled height (~y310 ink centre) |
| f223–f233 | phone whip | centre offset (px right of slot): sliver at the right edge f224, then 403, 272.5, 177.5, 112.5, 68.5, 38.5, 18.5, 6.5, 1 (f225–f233), lands f234; scale 1+0.209·offset/616 (heights 712, 695, 684, 677, 673 at f227–f231); horizontal smear 0.14×px/frame |

Settled comp at 7800 (= s3's): main line ink x264–619 (ref) / 263–619 (ours), baseline 384, 67 px; sub 25 px centred 442.5, baseline 315.5 (ref ink y298–321); phone PhoneFrame left 659, top 25, 326 wide, no shadow, rim [206,124,84]/[236,160,116]/[186,108,72] + s3's inner rim rings.

### Verification
- pairs1..pairs5 (ref | ours PNGs), ours2/ours3 (frames), jun1 (Juniper copy sheet), sbs.mp4 (3.9–7.9 s, s3's scenes included after 7800).
- Per-frame motion trace (mean |Δ| per frame, 160×90, ref/ours): knob slide f136–f148 0.3–1.8 / 0.4–1.8; bloom f165–f181 within ±2.5 per frame (peak f171 16.5/17.7, f173 13.6/15.6); label morph f216–f223 within ±1; phone whip f225–f233 ours ~25 % lower — the slot is a flat gradient where the reference has moving game footage.
- Seam 7800: s2 f233 → s3 f234 label region max |Δ| 13 (match) and 0 (Juniper copy); phone region mean 1.45 (the reference itself moves 1.3 there).

### PASS / PARTIAL / FAIL (second iteration)
| beat | verdict | delta |
|---|---|---|
| f118 cut + camera settle | PASS | pill bbox within 2 px every frame |
| cursor path + click + fade | PARTIAL | path within ~3 px; our vector arrow vs the reference's pixel-art arrow; f118–f120 streak reads darker-edged than the ref's grey smear |
| knob slide / warm-up / label split | PASS | knob centre within 2–4 px per frame; colours exact; JuniperMark replaces the bird |
| pill hold | PASS | — |
| pill dissolve f165–f168 | PASS | bbox within 5–15 px (blur edges) |
| warm bloom | PASS | corner samples within ~6/255 at every frame; peak rms 2.8 |
| white Max + glow | PARTIAL | size/position match; halo slightly tighter than the ref's |
| Max → gradient | PASS | ink x444–832 vs 444–835 |
| word flashes | PASS (timing) / PARTIAL (shape) | cut frames exact; "can" 477–801 vs 474–805; Segoe is wider on "beautiful" (+33 px) and its ascenders run ~12 px taller (x-height matched, per brief) |
| for-glyph zoom-down | PASS | lead-word left within 4 px every frame |
| device roll + sub fade | PASS | — |
| phone whip | PASS | bbox within ~10 px mid-whip, landed exactly on s3's slot |
| seam 7800 | PASS | label identical to s3's first frame |

Known small artefact: f215 shows a 1.9 (vs 0.7) frame diff where the label's motion smear first switches on.

---

## s3 — 7800–25100 ms (f234–f752): measurements, build, verdicts

All numbers are stage px on the 30fps / 1280x720 reference frames (`ref/f720`). Scripts used: `crop.py`, `cols.py`, `rows.py`, `subrows.py`, `m.py` in this folder.

### Beat list (re-traced every frame)
| frames | beat |
|---|---|
| f234–f323 | runner game. Phone settles: rim x 659.7 (f234) -> 661.5 (f300) -> 662.6 (f348) -> 663.0 (f396) -> 663.3 (f468+), y25–694. Exponential settle, tau ~80 frames, +3.6 px total. Holds after that (BEATS' "x658 -> 664" was the exit starting at f585). |
| f316–f330 | sub-label swap, anchor f323.4 (half a frame early compared with the others) |
| f324 | cut: slot -> flight tracker. White screen flash .76 on the cut frame, then decaying |
| f405–f423 | sub-label swap, anchor f413 |
| f413 | cut: habit tracker, flash 1.00 |
| f496–f512 | sub swap, anchor f504; f504 cut: virtual pet, flash .76 |
| f536–f541 | slot content: the app minimises to the home screen (footage only; ours is a hard slot swap at f537 with no flash) |
| f585–f596 | phone whips out to the right. Centre x +2.5, 7, 16, 29, 48, 75.5, 116 (f591), then x1.55 per frame. Height 670 -> 631 (f591) -> 577 (f593). Fades from f592; heavy h-smear from f592 |
| f586–f603 | "iPhone" rolls up (-1, -2, -3, -5, -9, -13, -21, -33 px…) inside a clip window from y319 to y401. "Watch" rises from below (+55 at f592, then +44, 30, 19, 13, 8, 5, 3, 2, 1). "for"+glyph slide right 10 px (ink 264 -> 274). The line is right-aligned at ink x620 |
| f587–f601 | sub swap inside the morph, anchor f593.6 |
| f591–f604 | watch enters in place behind the phone. Opacity rises linearly 0 -> 1 over f591–f596. Scale .71 (f592), .78, .85, .90, .93, .955, .975, .985, .99, .995, 1 (f604), centred at bbox x850, y359.5. No slide |
| f604–f752 | watch static at ink bbox x676–1024, y72–647 |
| f665–f680 | sub swap, anchor f673; f673 cut: Doom game, flash 1.00 (.96 measured) |
| f748–f752 | static hold (seam) |

### Measured grammar
- **Sub swap** (u = frames from the anchor; ink tops, rest y298):
  - old: 0, -1, -2, -3, -4, -6, -10, -15, -23, -31 (u -8..1). Opacity .78 / .55 / .3 at u -1 / 0 / 1.
  - new: +23, +17, +11, +7, +5, +3, +2, +1, +1, 0 (u -1..8). Opacity .33 / .56 / .8 / 1 at u -1..2.
  - The same table fits all five swaps once each is given its own anchor.
- **Flash** (screen mean luminance as excess over the settled value, white = 1): u0 1.0 (or .76), then .60, .46, .36, .28, .21, .16, .12, .09, .06, .04, .02, .01. It covers everything inside the bezel, the island too (phone: white from 12 px inside the rim edge).
- **Label**: main line ink x264–619 for "iPhone" and x274–620 for "Watch", so it is right-aligned at x620. Ascender top 335, baseline 384. Gaps: "for" -> glyph 19 px, glyph -> word 21 px. Sub-label: 25 px regular, ink y298–321, centred at x~442.5 (centres 442.5, 443.5, 445, 442.5, 439.5, 443.5 across the six subs).
- **Phone rim** (f240/f300/f450, outside -> in): copper [196,112,75] -> [247,166,121] -> highlight [255,200,165] -> [174,136,117] -> brown lip [74,52,41] -> [42,31,27] -> black bezel. That is not s1's [110,66,46], and not the flat Q.phoneRim.
- **No shadows** under the phone or the watch (the ground reads [254,255,253] right up to the edges).
- **Watch (Ultra)**, measured on f640/f720:
  - Band: x739–943 at the case, 199 wide at its far ends, r~12 ends, top at y72; bottom tail x767–915 to y647.
  - Body: x676–1006 (330 wide). Shoulders x720–962 at y146–186, then a tall corner taper to the full width at y276.
  - Bezel ring: x688–994, y168–548, r~80.
  - Black glass: x698–984, y188–530.
  - Content area: x711–971, y201–518, r~58.
  - Crown: x1006–1024, y276–342. Guard: to x1019, y250–470. Side button: y378–468. Orange action button [204,127,75]: x676–684, y348–440.

### Build
- `juniper-side-label` replays the measured sub-swap, word-roll and line-shift tables. The word smear is an SVG directional blur. Font size is 67: Segoe UI at 67 gives an "iPhone" ink width of 198, equal to the reference.
- `juniper-phone-comp` uses the shared PhoneFrame with `shadow={false}` and measured rim props, plus a local RimProfile overlay (inner highlight + brown lip). It also draws the settle drift, the slot cuts, a FlashLayer above the island, and the exit tables. H-smear is sigma 0.09 x (speed - 8).
- `juniper-watch-comp` uses a local `UltraWatch` (exported, with `ULTRA` geometry) plus the entry tables, slot cuts and flash.

### Per-frame checks (ours vs ref)
- **Morph** (`cols.py`-style): phone left edge f584–f591 is within 1–2 px every frame. Watch bbox f594–f605 is within 1 px on x and 2 px on y every frame.
- **Word roll**: ink tops f592–f600 are within 1–3 px. Sub swaps at f318–f327 and f409–f419 are within 1–3 px, with matching opacity.
- **Flash luminance**: f413 ref 254/185/153/129/109 vs ours 255/170/140/120/102. f673 ref 252/175/148/126/109 vs ours 254/168/138/117/100.
- **Frame-diff trace** of the sbs clip vs `corner.txt`: f324 18.1/21.7, f413 48.3/42.5, f504 33.3/32.9, f586–f597 tracks 2.4->26.4->3.2 against 3.5->25.5->3.2, f673 22.1/20.2. The only gaps are motion inside the footage (f264, f278, f536–538 app minimise, f680, f730), which belongs to slot content.

### Verdicts (iteration 3)
| beat | verdict | delta |
|---|---|---|
| seam f234: phone + label | PASS | phone rim 1 px; label ink: iPhone x263–620 vs 264–619, ascender top 333 vs 335 (Segoe's ascender is 2 px taller) |
| runner hold + drift | PASS | settle curve matches within ~0.5 px |
| f324 / f413 / f504 cuts (slot + flash + sub swap) | PASS | sub 1–2 px; flash within ~0.05 |
| f537 home-screen slot swap | PARTIAL | the reference's app-minimise zoom is footage; ours is a hard slot change |
| phone whip-out f585–f596 | PASS | 1–2 px position; smear judged by eye |
| watch entry f591–f604 | PASS | within 1–2 px per frame |
| word roll + line shift | PASS / PARTIAL | roll 1–3 px. Segoe "Watch" is 182 px against SF's 190, so "for" lands at x281 instead of x274 |
| watch look (UltraWatch) | PARTIAL | silhouette, ring, glass, band and buttons match the measurements. The texture is a stylised weave, and the crown is simpler than the photo |
| f673 cut + Doom hold to seam | PASS | |
| seam f752 static watch | PASS | ink bbox x676–1023, y72–646 vs 676–1024, 72–647 |

---

## s4 — 25100–36133 ms (f753–f1083): measurements, build, verdicts

All numbers are stage px on the full-decode 30 fps frames (`ref/f720`). Traces were taken
per frame with `m_wt.py` (device rects + label bands), `m_sub.py` (sub-label bands +
min luminance) and run on our own renders too (`x_m_*.py` with `FD=ours_f`), so every
table below has a ref/ours side-by-side in this session's transcript.

### Beat list (frame-exact)

| frames | beat |
|---|---|
| f753 | static seam hold: watch (ink x676–1024, y72–647), "Doom-like 3D game / for [glyph] Watch" |
| f753–f763 | watch whips out right: band-left 740,741,744,751,761,777,800,832,882,962,1089 (×~1.5/frame), sinks 0.083 px/px, fades from f761 (display lum → op .88,.68,.47; faint remnant at the right edge to f765), horizontal smear from f760 |
| f753–f772 | label block travels side → top-centre on ONE curve for x and y (progress .004,.008,.019,.030,.061,.106,.167,.255,.373,.50,.684,.798,.867,.916,.947,.970,.985,.996,1) — accelerate 10 frames / decelerate 9, smeared along its path |
| f755–f771 | sub roll "Doom-like 3D game" → "Miro style notebook app" (same template as below) |
| f758–f767 | device word "Watch" → "iPad" rolls inside a clip window (fast variant, half-way at f763) |
| f761–f773 | tablet rises: scale .619,.695,.795,.869,.913,.942,.961,.974,.987,.992,.997,1 from f762 about a point ~620 px below its centre (centre-y offset ≈ 600·(1−s)); opacity 0→1 over f761–f767; settled x262–1024, y162–686 |
| f773–f843 | tablet hold, notebook app (screen [254,249,243]) |
| f835–f851 | sub roll-crossfade "Miro…" → "AR Furniture Planner": old top 36,35,35,34,33,31,28,24,17,8,2 (fade from k7: min-lum 27,86,136,189), new appears k7 at ~+28 grey, 44,41,39,38,37,37,36 |
| f844 | HARD CUT of the screen to the AR camera view, which opens from a white wash (screen mean 225,201,188,177…145 vs settled 142 → 0.74·0.72^k) |
| f924–f936 | tablet recedes: width 760,758,752,746,734,720,698,~658,596,524,468; centre-y +1,+4,+9,+19,+31,+50,+78,+122,+197,+286,+367; opacity 1 to f931 then .72,.55,.35,.17,0 |
| f925–f941 | sub roll "AR Furniture Planner" → "Tinder for movies" (identical template, s=f925) |
| f926–f942 | word roll "iPad" → "TV" (pitch 78; old 0,−1,−2,−4,−7,−13,−22,−36…; new …+23 f935 → 0 f942); line re-aligns 494→515 on the same curve |
| f931–f943 | TV grows in about its centre: width 556,640,754,844,894,928,950,964,976,982,986,989 from f932; opacity .20,.40,.60,.80,1.0 f932–f936 (measured on 5 points of the TV each frame); drawn over the receding tablet |
| f943–f994 | TV hold x149–1137, y146–700 (989×555, r≈18), maroon-vignetted black screen (slot) |
| f994–f1006 | TV recedes (same table within 1 %: width 987,984,978,970,958,942,916…) |
| f995–f1011 | sub roll → "VR basketball"; f997–f1013 word roll "TV" → "Vision Pro" (re-align 515→423) |
| f1001–f1013 | headset window grows in: width 600,652,720,768,798,816,830,839,846,850,852,855 from f1002; opacity .19,.40,.60,.80,1.0 f1002–f1006 |
| f1013–f1068 | headset hold x216–1070, y160–704 (855×545, r≈34), title band 59 px (hairline y219), round buttons 29 px at y190 |
| f1068–f1083 | closing pull-back of the whole comp about (643,361), accelerating: width 855,852,852,850,848,844,841,836,831,824,814,800,781 over f1071–f1083 → 1−s = 0.103·p³ over f1068–f1084 (label moves with it: sub top 36→64) |
| f1084 | HARD CUT (s5) |

Devices: no drop shadows anywhere (ground clean right under every device edge).
Tablet edge (f800, outside→in): dark 2 [41,43,40], highlight 2 [145,147,144], dark 2 [19,21,18],
grey 4 [62,64,61], black 3, screen from 13.5; radius ~40; two top buttons at x+76/x+114.
Our own watch trace at f753 (kept for the record, the build uses s3's UltraWatch): case flanks
x676–1006, titanium ring x688–995 / y168–550 (10 px sides, 20 top), black border 698–983 /
188–530, display 710–972 / 204–516, crown 1006–1024 / 248–345, side button to 1022 / 375–465,
band 198 wide at the top end widening to 204 at the lugs, lugs 722–960 at y150–166.

### Build

- `juniper-device-label`: states list; per-state layout travel (table `travel`), device-word roll
  (`roll`, `roll-fast`; clip window cap−22 … baseline+18, vertical smear 0.2·speed), sub roll
  template; side layout = s3's (right-aligned box right 622, baseline 384, sub centred 442.5,
  67/25 px, tracking −0.015em / −0.005em, BASE_EM 0.914); top layout centred x637, baseline 122.5.
  Travel smear: anisotropic SVG Gaussian along the motion direction (rotated box trick).
- `juniper-device-stage`: watch (s3 `UltraWatch`, imported), local tablet / TV / headset frames,
  curves `whip-right`, `rise`, `recede`, `grow`, `grow-window`; slot faces sampled from each
  app's mean colours; AR wash-in; closing `pullback`.
- Rendering hazard found and fixed: with the scene `camera` (a repainted, fractionally scaled
  subtree) frames rendered in sequence kept 1-px ghost edges of earlier frames (window edges at
  x1047/1067, y693 at 36.1 s, only when preceded by other frames). Fix: the pull-back and every
  MOVING device are their own compositing layer (`will-change`), rest frames are not layered and
  sit on integer coordinates. Verified: sequence vs solo renders differ by ≤5/255, no ghosts.
- Seam 25100: our frame vs a fresh render of s3's config at 25.0999 s — max pixel diff 0.

### Verdicts (ref vs ours, per-frame traces + pairs)

| beat | verdict | delta |
|---|---|---|
| seam f753 | PASS | identical to s3's frame (diff 0); vs ref: s3's label ink 281–618 vs 274–620 |
| watch whip-out f753–f765 | PASS | band-left within 1–13 px per frame (ours 741,742,744,751,760,774,796,825,872,949,1082); fade + smear match visually |
| label travel f753–f772 | PARTIAL | y within 1–6 px; x 7 px right at start (s3's line), up to ~19 px right mid-flight (f761–f762), converges by f768 |
| Watch→iPad word roll | PARTIAL | timing by eye from blurred frames (half-way f763 both); Segoe vs SF glyph shapes |
| sub rolls f835 / f925 / f995 | PASS | band tops within 1–2 px every frame, fade lum within ~10/255 |
| tablet rise f761–f773 | PASS | left edge within 0–4 px, top within 2–8 px (blur-smeared edge), opacity ramp a touch strong at f765 |
| tablet hold + AR cut f844 | PASS (geometry) / slot | rect exact (262–1024 × 162–685); content is a slot face + wash-in |
| tablet→TV f924–f943 | PASS | tablet and TV edges within 0–7 px every frame; crossfade order and opacity match |
| iPad→TV word roll | PASS | main band within 1–3 px per frame; line re-align 497→521 vs 494→515 |
| TV hold | PASS (geometry) | 149–1137 × 146–700 exact |
| TV→headset f994–f1013 | PASS | edges within 0–5 px per frame |
| TV→Vision Pro roll | PARTIAL | timing matches; "for  Vision Pro" line sits ~11 px left of the ref (ref centres it at 648, its iPad/TV lines at 634.5 — inconsistent in the ref; we centre all at 637) |
| headset hold | PASS (geometry) | 216–1070 × 160–704 exact; footage is a slot face |
| pull-back f1068–f1083 | PASS | window edges within 0–3 px per frame (f1083 252–1034 vs 252–1033) |

Type: Segoe UI stands in for SF; caps matched (main 47, sub 17.5 vs ref ~19 at the top layout —
kept at s3's 25 px for one label system); Segoe lines run ~3–8 % wider than SF.

---

## s5 — builder window (36133–47066 ms, f1084–f1411)

All numbers are stage px on the f720 full-decode frames (frame n = n/30 s). Tools: `py/win2.py`
(window rect + headline bands), `py/rect.py`, `py/box.py`, `py/cur.py` (cursor by frame diff),
`py/runs.py`, `py/grid.py`; `o_*.py` are the same tools pointed at our frames (`FD=ours/`).
Scenes are generated by `gen.py` (measured key tables live there).

### Beats (frame-exact)
| frames | beat |
|---|---|
| f1084 | HARD CUT in. Canvas (headline + window) already mid-settle at scale 1.106 about (640,360), blurred |
| f1084–f1096 | canvas settle 1.106→1.000; excess per frame .106 .079 .060 .045 .034 .024 .019 .013 .009 .006 .004 .002 0 (≈×0.75) |
| f1082(virtual)–f1111 | "One click to install apps" rises: own offset 124 px at f1084, ×0.865/frame, 0 by f1111; colour L 214→ink by f1098 |
| f1098–f1124 | "on your [glyph] device" rises from behind the window top (offset 88, ×0.88), grey [165]→ink by ~f1112 |
| f1139.5–f1144 | both lines fade out in place |
| f1140–f1159 | content zoom 1→3.0 about window top-right (window frame stays x170–1109, top 268). z per frame: 1.04 1.12 1.25 1.42 1.62 1.84 2.05 2.23 2.40 2.53 2.65 2.74 2.82 2.88 2.92 2.96 2.98 2.99 3.0 |
| f1140–f1168 | "no 99$ dev account" rises (offset 95, ×0.87), grey→ink by f1156 |
| f1153–f1180 | "no Xcode" rises (offset 90, ×0.88) |
| f1153–f1170 | cursor in from the window bottom (912,705)@f1154 → play button (805,391)@f1168; click f1169–1170; fade f1171–1174 |
| f1174–f1186 | status "Peter's iPhone"→"Signing" (yellow), text xfade 6 fr, pill width 307→237 over 15 fr (Live/home pills shift right) |
| f1204–f1217 | window frame pulls back + left: scale 1→0.782 about (−89,−94.5): s = 1 .997 .992 .983 .967 .942 .895 .846 .818 .801 .793 .788 .785 .782 → rest x113.5 y189 (735×471) |
| f1207–f1212 | headlines fade out |
| f1206–f1217 | phone whips in from lower right: offset (dx,dy) 255,446@1209 175,286 105,160 57,88 36,47 22,24 10,11 4,4 0@1217; rot −10°→0; rest x905 y124 w276 |
| f1209.5 | status → "Installing" |
| f1241.5–f1250 | app launch: dark card grows from icon (row5 col3) to full screen (130 ms), app slot fades in |
| f1243.5 | status → "Peter's iPhone" (fast: 100 ms xfade, 250 ms width) |
| f1245–f1258 | toast fades in, text rises 38 px screen on ×0.8/frame |
| f1307–f1322 | window back to scale 1 about y=189.5 (top edge fixed): left 113.5 114 114.5 115 116 118 120 123 127 131 137 143 151 160 167 170 |
| f1308–f1319 | phone falls out lower right, accelerating (dy 1 6 15 32 58 116 218 345 430 …), scale→1.03 |
| f1310–f1313 | toast fades |
| f1312–f1325 | "Two clicks to ship to the App Store" rises (offset 110, ×0.77), grey→ink by f1320 |
| f1329–f1347 | cursor in from below (839,626)@1330 → Publish (889,219)@1347 |
| f1348 | click on Publish |
| f1349.8–f1352 | popover opens: scale 0.55→0.97→1, blur 8→1→0, origin popover top-centre |
| f1362–f1394 | cursor to "Publish 3 changes" (839,486); click f1397; fade f1399–1402 |
| f1399–f1403 | popover collapses toward its top-centre with blur (scale →0.45, fade) |
| f1400–f1411 | canvas pull-back accelerating 1→0.906 (left edge 170→214; ×~1.35 per frame), no blur |
| f1412 | HARD CUT out (s6) |

### Layout (C space = 3× window px; zoom 3 shows C 1:1 relative to the window's top-right)
- Window 940×602, r14, fill [21,23,20]; runs off the bottom in phases A/C.
- Zoom origin fitted: window point (940, −2.25) — Publish x1011→812, avatar y280→311, preview phone right x903→489 all land.
- Toolbar (zoomed screen @f1200): avatar x602–670, Share 681–795, Publish 810–992 (white), more 1007–1080; pills y277–343; hairline y354.
- Row 2: home 568–627, Live 643–827, status 841–1078 (Signing/Installing 237 wide, Peter's iPhone 307), y371–430.
- Chat panel x0–328 window px ([28,30,27]), header y283, text 9.3 px (28 C), lines 12.4 px.
- Preview phone (zoom 1): x706–903, top 374, bare light screen + 2 px dark outline, island 65×17.
- Popover (zoomed screen @f1370, window top 190): x531–1084, y281–690, r22, [35,37,34]; field y376–443; CTA y456–515 white; "App Stores" rule y555; tiles y594–668.
- Toast (phase B screen): x439–822, y560–636 → C 2296–2786, 470–567.
- Headlines: cap 48, x-height 36 → Segoe UI Semibold 66 px (70 was 6% too wide); baselines 120 / 201.
- Cursor: ~30 px tall (f1166) → size 40; ~40 px tall (f1396) → size 52.
- Install phone: 276×568 (PhoneFrame width 276), icons 40 px on a 57.7×62.4 grid, dock y486–544.

### Verification
Pairs: `p1/ p2/ p3/ p4/ seam/` (ref | ours). Motion checked per frame on our decoded sbs frames
(`ours/`) with the same tools as the reference:
- canvas settle f1084–f1096: window width 1039/1010/994/980/971/962… vs ref 1040/1014/996/982/972/963… (≤4 px)
- headline line 1 top per frame f1088–f1112: within 0–2 px after f1090 (ref band carries more blur at f1084–87)
- zoom f1141–f1160: avatar left edge within 5–7 px (ours 607 vs 602 at rest before the avatar size fix)
- window A→B f1203–f1218: left/top within 0–4 px every frame
- phone in f1209–f1217: top within 1–3 px; phone out f1308–f1314 within 3–11 px
- window B→C and end pull-back: left/top within 0–3 px every other frame

### PASS / PARTIAL / FAIL
| beat | verdict | delta |
|---|---|---|
| cut-in canvas settle + "One click" rise | PASS | ≤4 px; colour ramp a touch fast at f1084–86 |
| "on your [glyph] device" | PASS | glyph block 8 px wider than the vendor logo |
| push-in zoom into toolbar | PASS | ≤6 px; zoom blur is isotropic (ref is radial) |
| "no 99$ / no Xcode" crossfade + rise | PASS | |
| cursor → play click, Signing | PASS | cursor glyph thinner than the macOS arrow |
| window pull-back + phone whip-in | PASS | blur directional per axis, ref streaks along the diagonal |
| app launch + toast | PARTIAL | launch shape timing ≈1 frame; app is a slot (by design) |
| phone out + window push + "Two clicks" | PASS | |
| cursor → Publish, popover open | PASS | open is uniform scale (ref squashes more vertically on f1350) |
| cursor → Publish 3 changes, collapse | PASS | |
| end pull-back to the seam | PASS | ≤3 px |
| builder UI chrome look | PARTIAL | Segoe UI vs SF: toolbar labels render semibold-ish; store tiles use AppTile glyphs per copy deck |

Iterations: 4 pair passes + 3 sbs renders. Post-sbs tweak (seam frames only, verified with
`seam/` pairs): canvas blur strength per key (blurK 30 at the cut, 0 for the end pull-back).
Note: in `sbs.mp4` the reference side appears ~1–2 frames early versus the f720 frames
(ffmpeg -ss on the 60 fps source); per-frame checks above use the f720 frames.

---

## s6 — 47066–60000 ms (f1412–f1799): claim, bento, end card

Stage px, 30 fps clock (frame n = n/30 s). Ref frames `ref/f720`. Scripts: `meas1.py` (text bands per
frame), `meas2.py` (grid bbox), `trace.py` / `cmp.py` (ref vs ours), `gen.py` (emits both scene files
and the test configs).

### Beat list (frame-exact)
| frames | beat |
|---|---|
| f1412 | hard cut in (diff 97). Line 1 is already moving: it started ~f1411 |
| f1411.2–f1426 | "If your device can do it," rises 140 layout px, (1-p)^2.25 over 483 ms; opacity 0.2@f1412 -> 1@f1420 (1-(1-p)^1.6, 300 ms); vertical-only motion blur at f1412–f1416 |
| f1411–f1479 | camera: block scale about (640,360): 1.27@f1412, 1.123@f1420, 1.081@f1430, 1.047@f1446, 1.013@f1466, 1.0@f1479 (fast, then a long creep). Keys per frame in gen.py |
| f1428.9–f1442 | "Rork Max can build it" rises 135 px; opacity 0.29@f1430 -> 1@f1438. Line 2 sits 20 px LEFT of centre (x274–965 vs line 1 x258–1021 at scale 1) |
| f1479–f1481 | hold (diff 0.06–0.4) |
| f1481–f1493 | accelerating push-in: S 1.004, 1.008, 1.014, 1.022, 1.035, 1.050, 1.069, 1.094, 1.127, 1.169, 1.228, 1.310 (increments ×1.3/frame); slight blur at f1492–1493 |
| f1490.7–f1498 | ground crossfade [254,255,253] -> [234,236,233], linear (~3 lum/frame) |
| f1494 | text gone; grid in at S 0.759, opacity ~0.43, blurred |
| f1493–f1508 | grid scale 1-0.30·(1-p)^3.2 over 550 ms (0.759, 0.823, 0.867, 0.899, 0.922, 0.942, 0.956 … 1.0@f1508); opacity 0.43/0.63/0.85/1 at f1494–1497 |
| f1508–f1644 | bento hold. Only robot (±1.5 px bob, ~2.7 s period, arms sway), orb (churning lobes) and orange strands move |
| f1644–f1657 | grid shrink, ease-in: 1-S = 0.108·p^2.8 over 467 ms (0.99@f1650, 0.912@f1657); content stays opaque |
| f1651.3–f1658.3 | ground back to off-white (234 -> 253@f1658 -> 254) |
| f1658 | hard cut to the end card (line 1 at ~6 % opacity) |
| f1657.5–f1690 | "Start the next App Store hit" rises 131 px ((1-p)^2.7, 1067 ms), fade 1-(1-p)^1.8 over 600 ms. 6 px left of centre |
| f1667.5–f1700 | "with ● Rork Max" same, 10 frames later |
| f1699–f1714 | url "rork.com/max" blurs in in place (opacity ~linear 470 ms, blur 5 -> 0) |
| f1725–f1735 | lines shrink 1 -> 0.94 (ease-in) and fade linearly f1730–f1735 |
| f1726–f1754 | dot slides 569.5 -> 639.5 (x), 366.9 -> 359.3 (y), d 39.5 -> 53; asymmetric in-out, peak velocity f1739 (46 %) |
| f1725.5–f1749 | url lifts 18 px (435 -> 417 top), peak at 40 % |
| f1754–f1799 | dot + url hold (diff 0.00), no fade |

### Measured layout / type
- Claim: cap "I" 287–340 / "R" 379–433 -> Segoe semibold 77.5 px, tracking -0.0255em (widths 764 / 692);
  baselines 338 / 431 at scale 1.
- Grid rect x75.5–1204, y77.5–642, card fill [254,255,253], radius ~19, no shadow. Column gutters 12/14/10.5/10,
  row gutters 8 (profiles across each gutter). Column widths 366 / 378.5 / 361.5. Card heights: A 180.5 / 107.5 /
  260.5 (193 | 164); BC 180.5 (159.5 | 205) / 185 / 182.5; DE 86.5+86 (175.5 | 176) / 252 / 115.5.
- Card titles cap 14 -> 20 px semibold, cap top 20.5 px below card top. Gradient words cap 28 -> 40 px, tracking
  -0.06em, gradient [236,200,80] -> [208,116,60] (sampled; deeper orange than the tier "Max").
- Art rects (f1560): devices group x123–393 y135–233; AR tile x495–571 y147–230; robot x690–769 y126–239; NFC ring
  d63 @ x940 y90; Screen Time tile 52 @ x1136 y95; chat bubble x712–815 y281–307; game board x643–815 y315–437;
  widget x861–1027 y385–463; widgets phone x1042–1199 from y313; orb x293–426 y486–620 (incl. glow);
  strands x455–829 y525–627; phone fan x76–255 from y459.
- End card: cap "R" 345–391 -> 67 px semibold, tracking -0.0415em; baselines ~308.5 / 388.5; dot inline d 39.5
  centre (569.5, 366.9) colour [22,24,21]; url x-height 20 -> 40 px regular, tracking -0.047em, colour ~[26,28,25].

### Iterations
1. First build: positions within ~3–10 px; widths ok; misses: claim line 2 centred (ref is 20 px left), end line 1
   6 px right, dot gaps too wide (+6 px), url blur-in late, bento entry opacity low, art (devices blank, phones short).
2. dx offsets, tracking, baselines, mark gaps, url fade, entry fade pow, device faces, phone fan / widgets phone.
3. Curve fits from consecutive-frame traces: claim rise pow 2.4 -> 2.25 (was settling ~4 px early), bento entry 500
   ms cubic -> 550 ms pow 3.2 (ref has a longer tail), end rise 983 ms pow 2.42 -> 1067 ms pow 2.7 (was 5 px early
   at f1676–f1680).

Final trace (ours vs ref, bbox at thr 30): every sampled frame f1412–f1754 within 0–4 px on edges and 0–3 px on
width, except bento f1497 (ours 14 px narrower: entry blur shrinks the thresholded bbox) and the Segoe descender
(+6–8 px below the claim's line 1 — font, not position).

### PASS / PARTIAL / FAIL
| beat | verdict | delta |
|---|---|---|
| seam f1412 (hard cut, line 1 mid-entry) | PASS | top 422 vs 425, width 966 vs 969, opacity matches (L203 vs 204) |
| claim line 1 rise + fade + v-blur | PASS | ≤3 px per frame f1412–f1426 |
| claim line 2 rise + fade | PASS | ≤4 px; x offset reproduced |
| claim camera settle + hold | PASS | widths within 2 px f1412–f1481 |
| push-in f1481–f1493 | PASS | widths equal to the px; blur slightly lighter |
| zoom-dissolve into grid + ground crossfade | PASS | scale/opacity/ground within 1 frame. The ref's faint diagonal light streak over f1492–1494 is not rebuilt |
| bento layout (rects, gutters, radius, titles) | PASS | card edges within 1 px; titles/words within 2 px |
| bento art | PARTIAL | drawn stand-ins (no marks): orb darker and less "cloudy" than the ref; robot simpler; device screens are slots; widget/phone are placeholders |
| bento living motion | PARTIAL | orb churn, strand flow, robot bob present; strand shapes/glow differ |
| bento exit + cut f1658 | PASS | ≤6 px on edges f1644–f1657 |
| end-card lines rise/fade | PASS | ≤3 px |
| url blur-in | PASS | timing within a frame; Segoe "/" 4 px taller |
| outro: lines shrink/fade, dot travel + grow, url lift | PASS | dot x within 1–3 px, d within 1 px, url within 1 px across f1726–f1754 |
| end hold | PASS | dot 614–666 vs 613–666; url 528–751 vs 528–750 |
