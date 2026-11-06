# alder — reference measurements

Measured off the **"Introducing Claude Opus 5.5" launch film** (20.0s,
1920x1080 @25fps, 500 frames) on 2026-11-06. Frames were full-decoded at
960x540 and named by source frame (`f001` = 0.00s, `fN` = (N-1)/25 s). Stage
px = 960-px measurements x 4/3 (= reference px / 1.5). Scripts and frame dumps
live in the night's scratch build (`.demo-build/`, not committed).

| section | range (ms) | presets |
|---|---|---|
| S1 | 0 – 1240 | `alder-horizon` |
| S2 | 1240 – 15960 | `alder-plate` x36 |
| S3 | 8720 – 15960 | `alder-line` x3 (over the plates) |
| S4 | 15960 – 20000 | `alder-horizon` (pan `end`), `alder-title` x2 |
| — | 0 – 20000 | `alder-grain` |

## Cuts

Per-frame mean absolute difference on 240x135 greys. Every cut is a single
frame and none is a dissolve. Cuts start at f032, f058, f084, f095, f101, f107,
f120, f135, f148, f162, f177, f190, f204, f219, f227, f237, f245, f256, f268,
f276, f286, f294, f302, f313, f320, f326, f334, f342, f349, f357, f363, f370,
f377, f384, f390, f395 and f400. The wordmark cut is at f433. Inside the
plates, frame-to-frame differences stay under 12/255, except f204–f218, where
the frieze's figures are animated. The plates hold still.

The rebuild's cut list from the same tool is **identical** (36 of 36 plate
cuts on the same frame). One engine fix was needed for that: `liveAt` now
rounds `t*1000` to the microsecond, because 203/25*1000 = 8119.999…, which
started the 8120 ms scene a frame late.

## S1 / S4 — the limb

- **Edge.** The limb edge sits at ref y 258/540 at frame centre on f001–f031,
  which is stage y 344. The radius comes from the sag: 46 stage px of drop 587
  px off centre gives R ≈ 3750.
- **Profile.** Sampled down the centre column of f490 (edge at 452) and f001
  for the ground. Distances are above the edge, in stage px:
  - −323: ground [17,22,18]
  - 0: [120,48,29]
  - 11: orange [192,67,33]
  - 43: [210,143,72]
  - 75: peach [166,135,119]
  - 107: grey [133,133,137]
  - 139–187: flat blue [104,131,140]
  - 251: [49,83,100]
  - 331: [20,33,40]
  - 603: navy sky [14,19,22]

  The full table is `LIMB`. The opening and the end card are the same profile
  at different heights: a profile-match search finds them with mean error
  1.1–1.8/255.
- **Breathing.** On f001→f031 the haze rows above the peach band brighten
  (y 40: 52→77 L) while the edge and orange line do not move. The rebuild
  stretches distances above d = 60 by `glow` 1.00→1.18. The centre-column
  profile at f031 then matches within ~5/255.
- **Off-axis tint.** The left side runs warmer and the right purpler (f001
  x=60 vs x=900). This is a soft-light gradient over the limb.
- **End card.** f400–f456 hold the edge at ref y 667 (stage 889, off frame).
  From f457 the whole card rises: limb and wordmark move by the same amount
  every frame, to within 1 px. The stage-px offset is (edge − 258) x 4/3:

  | t (s) | offset (stage px) |
  |---|---|
  | 18.20 | 545 |
  | 18.52 | 531 |
  | 18.84 | 496 |
  | 19.16 | 429 |
  | 19.48 | 303 |
  | 19.64 | 207 |
  | 19.80 | 84 |
  | 19.92 | 13 |
  | 20.00 | 0 |

  It accelerates for 1.5s, peaks at ~31 px/frame at 19.72, then brakes in
  0.25s onto f001. `END_PAN` replays this as a monotone cubic. The rebuild's
  tracked edge matches the reference's within 1 px at every sampled frame
  from f452 to f500.
- **Titles.** The name card (f400–f432) is centred with its cap top at stage
  312. The 8-character name is 251 px wide, which is Georgia 64.5 px with
  the baseline at 360. The wordmark (f433–) is a mark plus a word, 275 px
  wide, with its baseline at 364.

## S2 — plates

Each plate was measured on its third frame. A per-column colour-gradient edge
detector with an iterative parabola fit gives the edge height at x=640 and
the sag 640 px out. The median colours above and below the fit give the sky
and body. Where texture or type defeated the fit, the edge was read off a
gridded still: P6, P9, P10, P11, P13, P14, P25, P29, P32 and P34.

- **Edge height.** 31 of 36 plates sit at stage y 340–372 (median 355). The
  exceptions are P10 at 400, P25 at 425, P28 at 400, P30 at 375 and P35 at
  385.
- **Sag.** It runs 30–270 px.
- **Cut lengths.** 1.04, 1.04, 0.44, 0.24, 0.24, 0.52, 0.60, 0.52, 0.56, 0.60,
  0.52, 0.56, 0.60, 0.60, then the line's runs (see the README).
- **Rebuild check.** On 33 measurable plates, sky colour is within 3/255 on
  27 plates and body colour within 20/255 on 25. The edge height is within
  5 px wherever the reference's fit is reliable. The largest remaining
  colour differences are generated textures standing in for photos with
  strong local detail: P16's thermal sky, P23's lace and P34's sketch ink.

## S3 — the line

- **Position.** The type is centred on x 640. Bottom-of-letter rows at the
  960-px scale are 253–261 in the reference and 256–261 in the rebuild, on
  the same plates.
- **Stillness.** The type holds dead still inside a plate: f219 equals f226
  and f227 equals f236 on the type pixels.
- **Size.** It is re-set larger at every cut. Georgia-equivalent sizes, from
  word width / em width:
  - group 1: 46, 51, 54, 59, 67
  - group 2: 72, 77, 81, 86, 88
  - group 3: 106, 107, 113, 113, 121, 126, 126, 133, 141, 145, 150, 154, 150
- **Colour.** Warm white [238,234,226] on dark plates. Near-black on the pale
  plates P30, P31, P33 and P34. Partly transparent or softened where the
  reference sinks the type into the photo: P19, P20, P25 and P28 are
  transparent; P14 and P35 are blurred.
- **Bend.** The word bends to the plate on P27 and P31–P36. The rebuild's
  `bend` is the baseline drop 300 px from centre: 12–26.

## What the rebuild does not reproduce

- The plates' photographic micro-detail (see the README's Known gaps).
- P13's animated frieze.
- The reference's per-plate grain. The rebuild uses one soft-light grain.
