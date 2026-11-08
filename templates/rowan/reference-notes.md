# rowan — reference measurements

Measured off the **Pencil launch film** ("infinite design canvas for Claude
Code", 79.1s, 1812x1080 @30fps, 2,372 frames) on 2026-11-08. Frame `fN` is
N/30 s. All positions are reference px; the template authors in a 1812x1080
box centred on the 1280x720 stage (stage px = ref px / 1.5), so a
`--scale 1.5` render is the reference picture 1:1 with 54 px of extra width
on each side. Scripts and frame dumps live in the night's scratch build
(`.demo-build/nightly/2026-11-08/`, not committed).

## What the film is

One macOS app window lying on a black backdrop of thin white contour ribbons.
Everything else happens INSIDE the window: the product is a design canvas
whose agent builds designs while you watch. The produced layer is small but
exact:

- the window composited on the ribbon backdrop (never full-screen)
- a camera that pushes in slowly and linearly, and never resets on a cut
- hard cuts that swap the window's content under that one move
- four dips to black at the section changes
- four short mono captions pinned to the frame corners
- a typed mono end card: a two-line claim, then the url

## Sections

| section | range (frames) | rowan scenes |
|---|---|---|
| S1 opening, build | f0 – f437 | `s1-cli`, `s1-prompt`, `s1-chat`, `s1-build` |
| S2 the designs | f438 – f1397 | `s2-take-*` x6, `s2-board-4`, `s2-board-9`, `s2-phones`, `s2-phone-close` |
| S3 design to code, design system | f1398 – f2189 | `s3-site`, `s3-site-menu`, `s3-code`, `s3-browser`, `s3-components`, `s3-variables`, `s3-light`, `s3-gradient` |
| S4 end card | f2190 – f2372 | `end-claim`, `end-url` |

## Cuts and dips

Per-frame mean absolute difference on 160x90 greys, plus mean luminance.

- **Hard cuts:** f30, f75, f119 (artboard appears), f438, f525, f624, f733,
  f891, f942, f1144, f1245, f1304 (a 4-frame canvas whip that flashes to
  luminance 110 on a white screen), f1398, f1486, f1866, f1981, f2057, f2075,
  f2190.
- **Dips to black** (luminance falls linearly to 0.0 and climbs back):
  f1037→f1041→f1045, f1551→f1556→f1561, f1652→f1657→f1662 and
  f1717→f1724→~f1735.
- **The light flip:** f2057–f2074, mean luminance 18.5 → 195.6 → 37.5. The
  whole UI goes light for 18 frames.

## The camera

The window's edges were tracked every 5th frame (rows and columns whose
pixels sit in the window grey 18..48). The window is 16:9: its aspect is
1.776–1.780 on every frame where all four edges are visible. Native size
1776 x 999 at s = 1.

| take | frames | window height | centre |
|---|---|---|---|
| opening push | f0 – f29 | 946 + 3.04 px/frame (946 → 1034) | frame centre |
| prompt close-up | f30 – f74 | s 1.831 → 2.040; top-left corner (133.4,135.4) → (146.9,150.0) | anchored near (15, 10) |
| take A | f75 – f1037 | 946 + 0.1954 px/frame | frame centre (905.5, 539.5 at f75) |
| take B | f1041 – f2189 | 946 + 0.1218 px/frame | frame centre |

- Take A runs straight through the cuts at f119, f438, f525, f624, f733,
  f891 and f942 (f522 h1033 → f527 h1032, f730 h1074 → f735 h1074).
- Take B runs through the dips and cuts from f1041 to f2189 (f1300 h978 →
  f1400 h990 → f1665 h1022 → f2025 h1066, all within 2 px of the line).
- The prompt beat's scale comes from the traffic-light pitch: 35 px at f32
  and 38.5 px at f72, against 19 px at s 1.00 (f360).
- **The one punch:** f1570–f1578 the camera scales x1.37 about frame point
  (1471, 781). The terminal's four edges fit that anchor to 1 px (left
  782 → 527, right 1488 → 1494, top 296 → 117, bottom 845 → 868).
- Zooms that look like camera moves but are the app's own canvas zoom (the
  chrome does not change size): f1304 onto the phone screens, f1419–f1423
  onto the site, f1738–f1751 and f1866 onto the design-system page,
  f2026–f2040 onto the Theme menu. The views draw these.

## The backdrop

White ribbons of ~50–70 parallel hairlines, brightest along a crest, fixed to
the window (they scale with the camera: the top-left crest crosses the frame
top at x ~460 on f75 and is twice the size on f32). There are three:

- a sheet curling up out of the top-left corner, its crest crossing the top
  edge around x 340–470
- a fold bulging past the right edge between y 330 and 1000
- a faint sheet along the bottom-left under the window

They are drawn as fans of cubic curves (`RIBBONS` in `rowan-shared.jsx`),
fitted by eye on f32, f75 and f360.

## The window (native px, f360, s ~1.00)

- **Titlebar:** 0–36, luminance 12–14. Traffic lights at x 18/37/56, y 18,
  r 6. Icons at x 88/114/140/166. Document title centred at x ~812. "Export
  code" from x 1454 and the agent status from x 1584 at the right.
- **Tool rail:** a floating card x 8–40 from y 46, icons on x 24 from y 59.
- **Agent panel:** a card at the top-left (41,41 298x334) while thinking,
  f75–~f100. It then docks along the left at x 4, w 300. Its top climbs from
  y ~385 (f110) to 252 (f250) as the stream fills.
- **Properties panel:** x 1580–1776. Section heads at y 52 (Context), 89,
  146, 236, 384, 554, 618, 686, 726 and 766 (Theme), window-relative +36.
- **Zoom pill:** x ~1472, y ~964.
- **The artboard:** (322, 100), 1200 x 750 (a 1440 x 900 frame at the canvas's
  83%), with a blue "Generating: …" label 12 px above. It sits in the same
  place in every single-design beat: f440 at s 1.018 spans ref x 330–1548, f893
  at s 1.107 spans x 279–1608. Both map back to native x 322.

## The designs (S2)

- **Build f119–f437:** parts appear in order. Sidebar at f119, brand at f180,
  then nav, status, the mission card, the user, crumbs at f360, the title,
  then the actions. The agent's steps tick over meanwhile and its todo list
  fills.
- **Takes:** six finished designs cut in on single frames:
  - f438 orange accent, with the first stat tile filled. Its stats arrive
    one by one to f522.
  - f525 yellow header block. The hero picture and the list arrive by f621.
  - f624 serif title. The properties panel is collapsed here.
  - f733 the green design the build beat was making. Its checklist ticks over.
  - f891 navy-to-blue gradient, cyan accent, mono title.
  - f942 lower-case mono.
- **Boards:**
  - 2x2 (f1041): 640 x 400 at native x 209/893, y 73/520
  - 3x3 (f1144): 405 x 266 at x 184/659/1150, y 76/380/690, mixing dark and
    light takes
- **Phones (f1245):** long mobile screens 155 x 753 at x 87 + 182·i, y 154,
  ten visible.
- **Phone close-up (f1304):** three screens at ~600 px wide: a white one
  cropped at the left, the selected dark one at 600–1200, a white/red one at
  the right. A row is dragged (f1335–f1345) and a label edited.

## S3

- **Site (f1398):** a 1440 x ~4100 one-page site at canvas zoom 0.198,
  native (658, 85). f1419–f1423 the canvas zooms to 0.66 on the second
  section, and a hand cursor swaps the three picture cards. f1486 cuts to the
  menu section, where rows are selected one by one.
- **Code (f1561):** the site at 0.255 (native 201, 88) and a terminal on the
  canvas (765, 258, 699x544). The prompt types at ~24.6 chars/s (3 chars at
  f1561, 35 at f1600). Then the x1.37 punch.
- **Browser (f1662):** a browser window over the editor (native 772, 25,
  958x960) showing the coded site, which scrolls top to bottom
  f1671–f1715. The terminal's file-tree summary sits beside it (411, 437).
- **Design system (f1724):**
  - a layers panel 0–196 with the rail moved to x 219
  - a component sheet (286, 100, 611x896)
  - three small dashboards at x 934–1227, the first with a dashed purple
    slot
  - canvas zoom x1.5 at f1738–f1741, x2.02 at f1748–f1751, x3.78 (hard)
    at f1866, where the slot fills with table rows
- **Variables (f1981):** a modal at the left (15, 36, 605x760). It closes at
  f2027, and the canvas then zooms x2 onto the Theme dropdowns, f2030–f2040.
  The menu (Light/Dark) opens at f2045.
- **Light flip (f2057–f2074),** then **mesh gradient (f2075):**
  - a black frame (119,80)–(1452,877)
  - a disc centred (782, 491) with r 267, on a 5x5 handle grid
  - a mesh popover at (1341, 253)
  - pastel at f2080, shuffled to cyan / crimson / black / amber by f2150

## Captions (frame overlays)

They do not ride the camera: "Design to code" spans x 1485–1707 at f1561
and at f1600, across the x1.37 punch. The face is mono, 15.6–15.9 px
advance (Consolas 28.9 px), light grey.

| caption | frames | place |
|---|---|---|
| "Design to code" | f1561 – f1652 | right edge 1707, cap top 961, baseline ~980 |
| "Advanced components with slots" | f1735 – f1980 | left 68, cap top 951, baseline ~970 |
| "Variables" | f1981 – f2056 | left 68 |
| "Full editing control" | f2075 – f2189 | left 79, cap top 949, baseline ~968 |

## End card

White-pixel extents tracked on every frame from f2188 on.

- f2190 hard cut to black. An underscore cursor at f2192 (x 559–595), which
  blinks.
- Line 1 is typed f2197–f2218 (1.4 frames/char), starting at x 562, with an
  advance of 44.3 px (Consolas 80.5 px) and a cap height of 56. Baseline 503.
- Line 2 starts f2221 at x 633, 1.25 frames/char, baseline 632. Each line is
  centred on x ~910 for its final length.
- The card holds with the cursor to f2279. f2280 is black.
- The url's cursor appears at f2285. Characters are typed f2295–f2324
  (~3 frames/char) on baseline 575, centred on x 912. The cursor goes at
  f2329 and the url holds to the last frame.

## Not measured / approximated

- **Interiors.** Every interior is drawn, not traced. Layout, panel
  geometry, artboard rects, board grids and timing follow the reference.
  Content, density and photography do not.
- **Type.** Segoe UI stands in for the UI grotesk, Consolas for the mono.
  The reference's end-card mono is lighter than Consolas, so the end card is
  set in a dimmer grey (222) to read closer.
- **Captions.** The second caption is shortened to "Components with slots".
  The reference's is one word longer.
