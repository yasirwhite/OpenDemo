# linden: reference notes

Reference: Grok Imagine 1.0 launch film (`grok-imagine-1` in
`references/references.json`), 1920x1080, 30fps, 751 frames (25.03s).
Decoded to 960x540 JPEGs for measuring; "ref px" below are 960-wide units
unless marked, stage px = 1920-px / 1.5 = ref px x 4/3. f1 = t 0.

## Structure

| frames | beat |
|---|---|
| f1-f99 | one card alone, pushing toward camera; the wall fades up behind it |
| f99-f113 | the card sinks back into its slot; the wall lights to full |
| f114-f330 | camera push, roll and yaw across the wall onto the focus card |
| f330-f500 | pull back, sliding down and left across the wall |
| f500-f558 | accelerating dive into the gutter right of the hero card |
| f559-f560 | black (inside the gutter) |
| f561-f607 | line 1 fades in f561-f577, holds, cuts out f607 -> f608 |
| f609-f654 | line 2 fades in f609-f625, cuts out f654 -> f655 |
| f657-f751 | line 3 fades in f657-f673, holds to the end |

No cuts in the picture half: f1-f558 is one shot.

## Opening card (A, B)

Tracked by multi-scale template matching on the card's interior (corr
0.85-0.97 every frame).

- 2:3, 193 x 286 at f1 (aspect 1.482), corner radius ~8% of width.
- Centre fixed at (480, 262.6) through f100, so slightly above frame centre.
- Width: 196.5 f1, 211 f20, 231 f40, 252.5 f60, 267 f80, 276 f94: an
  ease-in-out push peaking near 0.38%/frame.
- Sink: 270 f99, 267.5 f100, 256 f101, 246 f102, 228 f103, 206 f104, 182
  f105, 159 f106, 137 f107, 117.5 f108, 96 f109, 80 f110, then 80.6 / 82.2 /
  85.2 at f111-f113 as it settles on the slot (84.3 x 124.9 at f114).

## The wall behind it (A, B)

Tracked separately: SIFT on contrast-stretched frames with the card masked
out, similarity model.

- Scale 0.935 f30, 0.955 f50, 0.973 f60, 0.99 f80, 1.0 f96, 1.006 f101,
  0.99 f106, 0.978 f110, 0.976 f112; the slot centre sits at (478, 262.6)
  until f100, then drifts to (470.5, 256.5) by f113.
- So the card is IN FRONT of the wall during A, at roughly 2.3-3.3x the
  wall's scale, and sinks back through depth in B; the wall barely moves.

Brightness (frame / full-brightness wall, per ring of distance from the hero
centre in wall units):

| frame | 120-170 | 170-230 | 230-320 | 320-450 |
|---|---|---|---|---|
| f36 | 0.09 | 0.11 | 0.03 | 0 |
| f61 | 0.13 | 0.27 | 0.21 | 0.03 |
| f96 | 0.31 | 0.31 | 0.29 | 0.23 |
| f104 | 0.52 | 0.35 | 0.32 | 0.46 |
| f108 | 0.71 | 0.61 | 0.61 | 0.68 |
| f110 | 0.84 | 0.79 | 0.79 | 0.80 |
| f112 | 0.95 | 0.93 | 0.93 | 0.92 |

Nothing visible before f15. Modelled as a pool: level 0 f15, 0.105 f36, 0.26
f56, 0.29 f81, 0.31 f96; edge radius 230 f15, 322 f36, 400 f61, 493 f96 with
a 150-unit soft edge; then a lift to full of 0.06 f104, 0.17 f106, 0.44
f108, 0.70 f110, 0.90 f112, 1.0 f114.

## Camera (C, D, E)

- Frame-to-frame homographies (SIFT 4000, ratio 0.75, RANSAC 3 px), chained
  from f114 and re-anchored every 10 frames. Verified against direct
  matches to f114: within 1 wall unit to f270, then a drift of ~13-20 units
  while the camera is zoomed on the focus card.
- Final solve: chain f114-f260; f261-f360 relative to a direct f250 match
  (f294-f362 bridged by chaining forward from f293 and back from f363 and
  blending); f361-f545 direct against f114; f546-f557 chained from f530.
- Checked against the gutter beside the hero, measured from dark columns:

  | frame | measured gutter (stage x) | solved |
  |---|---|---|
  | f540 | 697-759 | 700-762 |
  | f550 | 653-783 | 657-783 |
  | f555 | 579-845 | 586-844 |
  | f557 | 513-901 | 520-884 |

- f558: only the hero card's edge (stage x 472) is left; the neighbour has
  passed the right edge. Rebuilt as a x2.4 push about (560, 400) from f557.
- Encoded per frame as hero-centre position, log zoom, roll, a unit stretch
  and the perspective row; gaussian-smoothed (sigma 1.5 frames), sampled
  every 3 frames, replayed with Catmull-Rom. p95 interpolation error 3.7
  stage px against the per-frame solve.
- Motion peaks: f190 (diff 44.7), f265 (57.3), f366 (63.1): fast whips with
  motion blur in the reference.

## Wall layout

33 cards. Rects in the f114 frame (wall square to camera); cards outside it
from a mosaic of f114-f552 warped back with the solved homographies (mean
composite). Rows at about y 105, 255, 410 and 560 (ref px); cards 57-150 wide,
60-245 tall; gutters 14-24. The hero is (427.5, 193.2)-(511.7, 318.1), the
focus card (545, 41)-(636, 177). Nothing to the right of x ~940.

## Lines

- Pure white on pure black, centred at x 480 (line 1 sits ~14 left), baseline y 286 (stage 381), cap height 35 (stage 46.7): Segoe UI at
  66.7 stage px.
- Line 1: a heavy name and a light suffix, 438 wide. Line 2: semibold claim,
  385 wide. Line 3: regular address, 391 wide.
- Fades are linear: peak luminance 30, 46, 64 ... (+17/frame) from f563,
  full by f577-f579.
- The reference ends on the address. This rebuild sets the mark ahead of it
  so the last frame carries the brand.

## Not rebuilt

- The cards in the reference are playing clips. Here they are drawn art with
  a slow drift, or still images with a 6% push.
- No motion blur on the whips (f190, f265, f366) or the sink (f101-f109).
- The wall is not exactly planar in the reference (the mosaic ghosts at the
  left edge); a single plane is used.
