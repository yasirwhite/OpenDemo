# rowan

A 79-second **dark canvas-editor launch film**. The whole film is one app
window lying on a black backdrop of thin white contour ribbons. The camera
pushes in slowly and never stops. The window's contents change under it, on
hard cuts and four dips to black:

- **0–14.6s.** The agent CLI on the canvas. Then a close-up of the prompt
  being typed into the agent pill, the prompt as a chat card ("Thinking…"),
  and an artboard building itself part by part while the agent streams its
  steps.
- **14.6–46.6s.** Six finished takes on the same design cut in one after
  another (orange, yellow, serif, green, navy, mono). A dip, then a 2x2
  board and a 3x3 board of takes and a row of phone screens. The canvas
  whips onto three of them and a row is dragged by hand.
- **46.6–73s.** A one-page site on the canvas, zoomed in and edited. Then
  "Design to code": the agent CLI turns the selected frame into an app, the
  camera punches in, and the coded site scrolls in a browser. After that,
  "Components with slots" (a design-system page whose slot fills with table
  rows), "Variables" (a token table and the Theme menu, with the whole UI
  flipping light for 18 frames) and "Full editing control" (a mesh-gradient
  disc whose handles are dragged).
- **73–79s.** A typed mono end card on black: "Shape on canvas. / Ship in
  code.", then the url.

Choose it for a **developer tool or AI design tool whose product is a
window**: an editor, a canvas, an IDE, an agent workbench. It sells by
showing the product working, so it works best when you have screen
recordings. The template gives them a stage: the backdrop, the measured
camera, the cut rhythm, the dips, the captions and the end card. The
placeholder product is **Rowan** (`rowan.example`), an AI design canvas. Its
agent designs a wind-farm control room ("Windrow"), a bakery site ("Linden
Bakehouse") and a design system ("bramble").

## Provenance

Derived from the **Pencil launch film** ("infinite design canvas for Claude
Code"), posted 2026-01-21 by the founder at
[x.com/tomkrcha/status/2014028990810300498](https://x.com/tomkrcha/status/2014028990810300498).
Re-checked on 2026-11-08 (fxtwitter API), it had **1,504,940 views, 8,569
likes, 918 reposts and 10,497 bookmarks** on a 26.1k-follower account: about
58x the follower count, with no brand halo. The dated record is in
`references/launch-scouting.json`. The manifest entry (`pencil`, md5 only,
media not committed) is in `references/references.json`.

It was rebuilt **frame-by-frame on 2026-11-08** on the film's own 30fps clock.
These were measured:

- every cut and dip frame
- the camera, from the window's edges every 5th frame: two linear pushes
  that run under every cut, plus the prompt close-up and one x1.37 punch
- the window, panel, artboard and board geometry
- the caption positions, faces and frames
- the end card's typing schedule, from its white-pixel extents on every
  frame

`reference-notes.md` has the numbers. None of Pencil's content is used: no
name, mark, copy, design or UI asset. The editor, the designs, the site, the
CLI banner and every caption are new.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/rowan/template.json
node src/lib/textcards/render.mjs --out rowan.mp4 --fps 30 --scale 1.5
```

Render at **30fps**. Every cut sits on a 30fps frame. The film is authored in
a 1812x1080 reference box centred on the 1280x720 stage, and `--scale 1.5`
renders it at 1920x1080. If someone else may be rendering from the same
checkout, render from a private stage (see `src/lib/textcards/README.md`,
`--html`).

## What is fixed and what is replaceable

**Fixed (the template):**

- **The cut list.** Beats run 1.00, 1.50, 1.47, 10.63, 2.90, 3.30, 3.63,
  5.27, 1.70 and 3.30s (take A). After the dip they run 3.43, 3.37, 1.97,
  3.13, 2.93, 2.33, 3.37, 2.23, 8.57, 2.53, 0.60 and 3.83s (take B). The end
  card is 3.00 + 3.10s.
- **The four dips to black,** each 4–7 frames down and 4–11 frames up.
- **The camera** (`cam` keys on every `rowan-shot`):
  - a fast opening push
  - the prompt close-up
  - take A: window height +0.1954 px/frame
  - take B: +0.1218 px/frame
  - the x1.37 punch on "Design to code"

  The push never resets on a cut. That continuity is the film's motion. Keep
  it when you retime.
- **The backdrop ribbons** (`RIBBONS`) and the window chrome.

**Replaceable:**

- **Your recordings: 22 window slots.** Every `rowan-shot` scene takes `src`
  (an .mp4 of your app window) and `clip` (`{ "from": 3.2, "fit": "1x" }`).
  The recording then fills the window, and the backdrop, camera and cuts stay.
  Record the window at 16:9 (the window is 1776x999 native) and crop to its
  edges. Each slot's beat is the reference's: what it showed is in the
  scene's `view` and in `reference-notes.md`.
- **Pictures: 16 image slots,** under a scene's `images`. Without them, drawn
  stand-ins are used.
  - `hero` in the build and take beats (a turbine at night by default)
  - `cell-1`..`cell-9` in the boards
  - `site-1`..`site-6` in the site, code and browser beats
- **Copy:**
  - `role: "user-voice"`: the prompt the agent receives (`s1-cli`,
    `s1-prompt`, `s1-chat`) and the design-to-code request (`s3-code`). Keep
    the voice and swap the specifics.
  - `role: "product-voice"`: what the agent writes and designs. The talk is
    `TALK`/`TODO` in `rowan-s2.jsx`, the designs' copy is `COPY`/`THEMES`,
    and the site's copy is `SITE` in `rowan-s3.jsx`.
  - `role: "brand"`: the four captions (`cap-*`, one short outcome phrase
    each) and the end card (`end-claim`: two lines, then `end-url`). Keep
    the line lengths close (16 and 13 characters) or retime `at`/`frames`.
    The cursor schedule is in each scene.
- **The document names** in the titlebar (`doc`).

## Presets

All of rowan's presets live with the template in `presets/`. They register
into the textcards registry through one spread (`ROWAN_PRESETS`).

- `rowan-shot` (`rowan-s1.jsx`): one window beat. It draws the backdrop, the
  window at the camera's keys, and a drawn interior picked by `view`, or your
  recording (`src`). The views are:
  - `cli`, `prompt`, `chat`, `build` (s1)
  - `variant`, `board`, `phones`, `phone-close` (s2)
  - `site`, `code`, `browser`, `components`, `variables`, `light`,
    `gradient` (s3)
- `rowan-caption` (`rowan-s4.jsx`): a mono caption pinned to the frame
  corner.
- `rowan-dip` (`rowan-s4.jsx`): a linear dip to black over everything.
- `rowan-typed` (`rowan-s4.jsx`): the typed mono end card, with an
  underscore cursor.

`rowan-shared.jsx` holds the vocabulary: the camera, the ribbons, the window
chrome, the agent panel, the properties panel, the terminal and the picture
stand-ins. `rowan-s2.jsx` holds the parametric design (`Dashboard`, eight
themes, built part by part) and the phone screens.

## Known gaps

- **Interiors are drawn.** The reference is a screen capture of a real
  editor. Layout, geometry and timing follow it, but the drawn UI is
  sparser, and the pictures are stand-ins until you fill the slots. The film
  is meant to carry your recordings.
- **Fonts.** Segoe UI stands in for the UI grotesk and Consolas for the mono.
  The reference's end-card mono is lighter than Consolas.
- **Cursor.** The pointer moves on keyed paths. The reference's pointer moves
  with a real hand's jitter.
- **The mesh gradient** is layered radial gradients, not a true mesh. Colours
  and swirl follow the reference's shuffle, not its exact field.
