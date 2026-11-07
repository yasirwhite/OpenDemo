# maple

A 30-second **vector-construction launch film for a design or logo AI**. A
mark is the protagonist. It changes state beat by beat, cut hard between a
black and a white ground, inside drawn design-tool chrome:

- a pencil sketch photo pulls back into a canvas window, a blue trace runs
  round the mark and its own SVG code drifts across it
- a glow-trail outline on black, then an ink outline on an isometric grid
- an extreme close-up wireframe draws on, anchor dots pop and the corners
  round off
- the whole mark with nodes and a cursor: a navy fill, a hatch sweep, then a
  gradient fill scrubbed through hues by a rainbow slider
- a full-bleed gradient with a resize selection box, a shrink into an
  app-icon tile, and a typed prompt ("create variations of this mark") with a
  caret-tracking camera, a send-button click and a whip up
- a gradient card rises on black and three rolodex flips show the variations;
  the cursor drags the mark out of the last card
- an eight-cut photo-mockup montage, a prompt card on a dot grid ("Add a
  wordmark to this mark"), an outline "lorem" wordmark and a ten-face font
  flash
- a lockup grows out of the cursor inside a selection box with construction
  guides, collapses to the logo, and the url types on under it

Choose it for products that make or edit vector graphics: logo and brand
generators, icon tools, design assistants, SVG editors. It also fits any
launch whose output is one graphic you can draw yourself. Almost nothing is
footage: the mark, the cards, the chrome and the type are all drawn. Only the
sketch photo and the eight mockups are image slots.

The placeholder product is **Maple** (`maple.example`), whose model **Samara**
turns a sketch into a clean, editable vector mark. The sample customer brand
is "lorem", as in the original.

## Provenance

Derived from the **QuiverAI "Arrow 1.0" launch film** (Arrow 1.0 launch and
$8.3M seed), posted 2026-02-25 by co-founder @joanrod_ai at
[x.com/joanrod_ai/status/2026693353090240819](https://x.com/joanrod_ai/status/2026693353090240819).
Checked on 2026-11-05 (fxtwitter API), it had **1,293,062 views, 4,787 likes
and 6,366 bookmarks** on a 4,832-follower account: about 268x the follower
count, with no brand halo. The dated record is in
`references/launch-scouting.json`, and the manifest entry (`quiver-arrow`, md5
only, media not committed) is in `references/references.json`.

It was rebuilt **frame-by-frame on 2026-11-05**. The 60fps master was
resampled to a 30fps clock at stage size (stage px = reference px / 1.5), and
six section passes traced every beat off full-decode frames. Positions,
per-frame motion tables, easings, colour ramps, cut frames and type sizes are
all measured. The sections were then assembled and compared side by side
against the reference. The copy, both marks (the hexagon hero and the company
logo) and the variations were replaced with original drawn stand-ins. No
reference media is committed. `reference-notes.md` has the measurements per
section and the assembly pass's changes.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/maple/template.json
node src/lib/textcards/render.mjs --out maple.mp4 --fps 30 --scale 1.5
```

Render at **30fps**: most motion replays per-frame tables measured on a 30fps
clock. The film is authored on the 1280x720 stage. `--scale 1.5` renders that
stage at device scale 1.5, which gives the 1920x1080 film the config declares.
Leave `--scale` off for a 1280x720 proof. If someone else may be rendering
from the same checkout, render from a private stage (snapshot `index.html` +
`dist/bundle.js` and pass `--html`, see `src/lib/textcards/README.md`).

## What is fixed and what is replaceable

**Fixed (the template):**

- every `startMs` / `durationMs` and every cut frame: the hard cuts at 2.033s,
  3.033s, 4.033s, 6.033s, 8.033s, 8.967s, 17.033s and 23.033s, the two fades
  (white to black at 13.8s, grey to black at 21.133s), the six-frame mockup
  cuts and the three-frame font cuts, and the cut to black at 29.633s
- the motion tables: the sketch pull-back, the trace, the code drift, the
  comet trails, the close-up push-in and fillets, the pull-back and hatch
  sweep, the resize and icon shrink, the typing glide and caret pan, the
  button fly-in and whip, the card rise, tilt and flips, the drag and drop,
  the prompt-card entrance and exit, the wordmark pan, the lockup grow and
  collapse, and every cursor path
- the grounds (black `[0,1,0]`, white `[253,255,252]`, the grey `[192]` cut)
  and the chrome blues (trace, navy fill, hatch, selection, caret, send
  button)

If copy does not fit a beat, shorten the copy, not the beat.

**Replaceable:**

- **Copy.** Every text scene carries a `role`:
  - `brand`: the lockup name and suffix and the url (`s6-brand-close`), and
    the strings composited on the mockups (`s5-mockups.strings`).
  - `user-voice`: the two typed prompts (`s3-prompt.text`,
    `s5-prompt-card.prompt`).
  - `product-voice`: the canvas pill and the SVG code (`s1-sketch-canvas`),
    the prompt-card placeholder, the outline wordmark and the font-flash words.

  The prompts, lockup and url are laid out with measured text, so words of a
  different length reflow: the caret pan scales with the prompt's length and
  the selection box hugs the new lockup. Check every beat after a retarget
  anyway.
- **Image slots.** 9 in all:
  - `sketch-photo` (`s1-sketch-canvas`): the opening photo of a hand sketch.
    By default a drawn pencil sketch on paper stands in. Set `"photo":
    "slot"` and `"src"` to use a real photo.
  - `mockup-1` … `mockup-8` (`s5-mockups`): brochure, coffee cup, shopfront,
    street poster, framed print, packaging, apparel and billboard. Pass
    `"srcs": {"mockup-1": "path.jpg", …}`. Without a source each one is a
    tonal wash of the original layout with a corner caption. The variation
    mark and the per-slot strings are composited over the photo at the
    measured spot.
- **Drawn stand-ins.** Restyle these to the real product, all in
  `presets/maple-shared.jsx`:
  - `MapleMark`: the hexagon hero in every state (sketch, trace, outline,
    wireframe, filled, hatched, gradient), with its `blades` and `cube`
    variations
  - `MapleLogo` and `Lockup`: the company logo and the end lockup
  - `GradientArt` / `GRADIENTS` and the card art in `maple-s4.jsx`
    (`CARD_ART`: ember, orchid, dawn, lagoon)
  - the chrome: `ArrowCursor`, `SelectionBox`, `SendButton`, `Caret`, the
    canvas window and the prompt card

## Presets

All of maple's presets live with the template in `presets/`. They register
into the textcards registry through one spread (`MAPLE_PRESETS`).

- `maple-shared.jsx`: the shared vocabulary: the palette `Q`, `kf()` sparse
  keyframes, `maple-ground`, the mark and its geometry (`markGeometry`,
  `markSvgCode`), the logo and lockup, the chrome, gradient art and image
  slots. `CURSOR_CAL` documents how `ArrowCursor`'s `size` maps to its
  visible size.
- `maple-s1.jsx` … `maple-s6.jsx`: one file per section. Each preset is
  documented in its `note`.

These are general enough to reuse in other films:

- `maple-prompt-send`: a typed prompt with glyph pops, a caret-tracking pan
  and a send button that flies in, gets clicked and whips away
- `maple-rolodex`: perspective card flips over a bottom hinge, with a lifted
  mark and a card drop
- `maple-prompt-card`: a prompt composer that enters in 3D over a settling dot
  grid, types, clicks and exits
- `maple-font-flash`: a wordmark cut through ten faces, three frames each
- `maple-brand-close`: a lockup that grows and collapses inside a selection
  box, then a url type-on

## Known gaps

- **Fonts.** Only system fonts are used. Arial and Segoe UI stand in for the
  Inter-class prompt and UI face, Consolas for the code and url mono, and
  Century Gothic for the geometric lockup. Sizes are matched on x-height or
  cap height. The font flash has no blackletter installed, so its blackletter
  "Lorem" is drawn from broad-nib strokes. Its rounded, techno and round
  geometric faces are system fonts filtered, stretched or stroked toward the
  originals.
- **Sketch photo.** The default opening is a drawn pencil sketch on drawn
  paper, not a photo. Desk grain, pen and pencil texture are simpler than
  the original.
- **Mockups.** Without real photos the montage shows tonal washes, which are
  flatter than photos.
- **Gradients.** The full-bleed field and the cards are sampled grids and
  hand-tuned blob specs. Hue and layout are close, but fine fold lines and
  some swoosh edges are softer than the original.
- **Marks.** The marks are Maple's own: an arrowhead knockout instead of the
  original's corner notch, and samara blades instead of thin slots. Inner
  strokes, fillets and comet trails follow Maple's geometry, so they differ
  from the reference by design.
- **Fixed tables.** Many beats replay dense measured tables (cursor paths,
  card flips, typing glides). They are exact for these timings, but retiming
  a beat means re-deriving its table.
