# laurel — reference measurements

Measured off the **Granola "voice typing" launch film** (21.056s, 1920x1080
@30fps, 630 frames) on 2026-11-10/11. Frames were full-decoded at 640x360 (for
looking) and 320x180 RGB / 160x90 grey (for tracking), named by source frame
(`f1` = 0.00s, `fN` = (N-1)/30 s). Stage px = reference px / 1.5. Scripts and
dumps live in the night's scratch build (`.demo-build/nightly/2026-11-11/`,
not committed).

| section | frames | ms | preset |
|---|---|---|---|
| S1 keys | f1 – f152 | 0 – 5067 | `laurel-keys` |
| S2 pill | f78 – f527 | 2566 – 17533 | `laurel-pill` |
| S3 composer | f148 – f307 | 4899 – 10233 | `laurel-composer` |
| S4 line + icons | f294 – f421 | 9766 – 14033 | `laurel-line` |
| S5 title | f421 – f520 | 13999 – 17333 | `laurel-title` |
| S6 card | f521 – f630 | 17333 – 21000 | `laurel-endcard` |

The only hard cut is **f521** (per-frame diff 63.7 on a 160x90 grey decode).
Everything else is continuous motion.

## Palette (sampled)

| what | rgb | where |
|---|---|---|
| ground | 245,246,242 | f20, f330 corners |
| lime key face | 208,235,73 | f60 (290,300) |
| grey key face / skirt | 211,212,210 / 186,187,185 | f60 (480,300) / (480,440) |
| pill | 44,46,40 | f110 inside the capsule |
| level bars | ~120,208,5 | f230 bar cores |
| glow, 40 px above the pill | 202,225,169 settled; 159,207,100 on landing | f102-f141 / f90 |
| lilac ground | 195,180,230 | f230 (700,40) |
| composer card | 251,249,252 | f230 (640,300) |
| end card | 176,203,75 | f600 corner |

## S1 keys

- Lime key, face top y (face colour tracked every frame): 640 (f1), 556, 444,
  368, 312, 268, 236, 216, 200, 188 (f19); holds; sinks 188 -> 252 over
  f21-f31 (accelerating); steps down to 280 over f73-f79; drops out f134-f152
  (280, 319, 379, 449, 522, 574).
- Lime key centre x: 640 until f29, then 628, 590, 497, 343, 284.5 (f31-f39).
  Recoil when the pill lands: 281 (f83), 270, 268, 282 (f92).
- Mark draws on f3-f10 while the key rises.
- Key outlines: lime 190-379, grey 388-576, 585-773, 783-1089; all y 252-465
  at rest. Face inset 14 px each side, flush with the top, 164 px tall.
- Grey keys fall from the top right, tilted 8-15 deg, and land on f38, f40
  and f45. Knocked off f81-f90: two out of the top, the wide one tumbling out
  to the right (-25 to +55 deg).

## S2 pill

- Big state 402x162 at (640, 361); small 240x98 at (640, 615): one scale,
  aspect constant (0.403 / 0.408).
- Top edge, every frame f78-f102: 656, 600, 548, 500, 456, 420, 388, 360, 336,
  316, 300, 288, 276, 268, 260, 256, 256, 252, 252, 256, 256, 260, ~266, 272,
  280. Peak overshoot 28 px at f95-f96.
- Drop f156-f192: top 280, 288, 304, 332, 364, 400, 436, 468, 504, 532, 548,
  556, 560, 564, 568 (every 2nd frame). Inner width 360 until f172, then 352,
  320, 292, 264, 248, 240, 224, 216, 208 (f192).
- Glow gone in three frames, f141-f144.
- 9 bars, 27 px apart at scale 1, 11 px wide, dots to ~57 px tall.
- Sound ribbon: dots/bars every ~30 px beside the big pill, ~18 px beside the
  small one; front advances ~25 px/frame from f122.
- f500-f520 the pill bobs (cy 615, 603, 595, 591, 599, 607, 627) and rides
  through the f521 cut onto the lime card (cy ~640 f521, ~691 f524), gone by
  f527.

## S3 composer

- Thread: pink/red from the pill's right end to the frame edge, f149-f160.
- Wedge apex x: ~840 (f164 in the rebuild's timing), ~560, ~300, ~30 (f176),
  off-frame after. Arm order from the inside: red, yellow, pink (+ a charcoal
  stroke) above; red, pink below. Arms off-frame by ~f187.
- Composer group scale about (640, 300): 0.76 (f159), 0.78, 0.80 (f182), 0.95
  (f186), 0.99 (f190), 1 (f194). Final card 122-1161 x 247-484 (white run on
  row y 380: 124-1160 from f190).
- Glyph flies from (40, 324) at f159 to its place by f168.
- Typing starts f182, line complete ~f220 (~2.4 units/frame). Deletion
  starts ~f277 ("your wo" by f280), ends f293. Heading gone by f291.
- Exit: card edges [64, 1104] (f298), [0, 990] (f301), [-, 838] (f304),
  [-, 528] (f307); lilac pulled in from the right edge and faded f292-f300.

## S4 line + icons

- Line left edge while typing: 184 (f295), 221 (f301), 282 (f304), 349
  (f310), 364 (f313), 372 (f316), 374 final for a 380 px line. Serif ~52 px,
  baseline ~377.
- Tile 800-906 x 308-414 (106 px, 46 px right of the line).
- Icons settled on f322, 340, 358, 373, ~393, ~398, ~402, ~405, ~408, ~411,
  ~414 (the last ones are streaks, read approximately).
- Exit, line centre offset: 0 (f409), -37 (f412), -100 (f415), -177 (f418),
  -257 (f421).

## S5 title

- Dark rows every 3rd frame: title top 312 (f426), 300, 280, 272, 268, 260,
  256, 252, 252, 248, 248, 244, 244, 240 (f474-f483), 236 (f486-f513), 216
  (f516), 196 (f519).
- Final: title 388-904 x 236-328; claim cap top 336, x 234-1047; available
  456-476; fine print ~504-516.
- Typing: title f421-f448, claim f433-f452, available f460-f468, fine
  f469-f478.

## S6 card

- Mark size ~300 (f529-f538), 240 (f541), 170 (f544), 152 (f547), 144 final.
- Draw: dot at f523-f524, ~65% by f527, ~95% by f530.
- Mark centre x: 630, 620 (f553), 586, 514, 450, 410, 390, 370 (f571), 360.
- Wordmark letters f553-f566. Final lockup 288-1000 x 283-437.

## What the rebuild changes on purpose

- Copy, names, mark, wordmark, composer chrome and app icons are new and
  neutral.
- The skirt prints are generated (oversized serif letters and thin lines),
  not the reference's collage scans.
- The lilac ground's drawing is a simplified version: ruled lines, pencil
  lines, one charcoal stroke, one column of tiny vertical type.
- Ink Free (squeezed, thickened) stands in for the reference's marker
  lettering; Georgia for its text serif; Segoe UI for its interface sans.
