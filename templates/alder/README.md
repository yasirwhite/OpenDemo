# alder

A 20-second **horizon-montage launch film**. Every shot is the curved edge of
something (a planet, a dish, a leaf, a loaf, lace, a page), framed so the edge
lies across the middle of the frame like a horizon. The film cuts hard from
edge to edge, faster and faster, and a short line of serif type stands on
that horizon:

- a planet limb holds still for 1.24s while its haze breathes outward
- 13 wordless plates: 1.04s cuts that tighten to ~0.55s, a different surface,
  colour and sky each time, the edge always at the same height
- the line arrives one word-group at a time: "Look" over 5 plates, "a little"
  over 5, "closer" over 13. The type is re-set on every cut, holds dead still
  inside a plate and steps a little larger at the next one (46 px to 154 px).
  It turns dark on pale plates, sinks into the image on some, and bends to the
  curvature of the later ones
- the cuts accelerate to 0.20s, then a hard cut to a navy sky with the limb's
  haze along the bottom: the name card, then the wordmark
- the whole end card pans up 545 px on an accelerating curve and lands
  exactly on the opening frame, so the film loops

Choose it for a launch that wants mood over features: a model release, a
"new version" announcement, a research or brand moment, anything that should
read as *wonder* rather than *demo*. It has no UI, no devices and no logo
construction. It is a colour-and-texture montage held together by one shape
and one cut rhythm. Swap in your own photos of curved edges and it becomes
your film.

The placeholder product is **Lumen 2**, by **Alder**. The line reads "Look /
a little / closer".

## Provenance

Derived from **Anthropic's "Introducing Claude Opus 5.5" launch film**, posted
2026-09-22 by @claudeai at
[x.com/claudeai/status/2102435511222890900](https://x.com/claudeai/status/2102435511222890900).
Checked on 2026-11-06 (fxtwitter API), it had **29,632,715 views, 98,339 likes,
9,078 reposts and 13,519 bookmarks** on a 2.0M-follower account. That is about
2.5x the likes of the next-best short film vetted that night. The account's
reach accounts for part of that. The dated record is in
`references/launch-scouting.json`, and the manifest entry (`claude-opus-5-5`,
md5 only, media not committed) is in `references/references.json`.

It was rebuilt **frame-by-frame on 2026-11-06** on the film's own 25fps clock
(stage px = reference px / 1.5). These were all measured:

- every cut frame, from per-frame differences
- each plate's edge height and sag
- the sky and body colours of each plate
- the type's size, baseline, colour and bend on every plate
- the limb's colour profile, sampled down the centre column
- the end-card pan, tracked frame by frame from the limb edge's position

None of Anthropic's content is used: no name, mark, wordmark, copy or imagery.
The reference's macro photographs are image slots here, filled by default with
generated textures in the same colours. The line, the name and the wordmark
are new. `reference-notes.md` has the measurements.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/alder/template.json
node src/lib/textcards/render.mjs --out alder.mp4 --fps 25 --scale 1.5
```

Render at **25fps**. Every cut is a multiple of 40 ms, and the end-card pan
replays a per-frame trace. The film is authored on the 1280x720 stage, and
`--scale 1.5` renders that stage at 1920x1080. If someone else may be
rendering from the same checkout, render from a private stage (see
`src/lib/textcards/README.md`, `--html`).

## What is fixed and what is replaceable

**Fixed (the template):**

- The 37 cut times. Their lengths are 1.24 (horizon), then 1.04, 1.04, 0.44,
  0.24, 0.24, 0.52, 0.60, 0.52, 0.56, 0.60, 0.52, 0.56, 0.60, then 0.32, 0.40,
  0.32, 0.44, 0.48 ("Look"), then 0.32, 0.40, 0.32, 0.32, 0.44 ("a little"),
  then 0.28, 0.24, 0.32, 0.32, 0.28, 0.32, 0.24, 0.28, 0.28, 0.28, 0.24, 0.20,
  0.20 ("closer"). Then 1.32 for the name card and 2.72 for the wordmark. All
  in seconds.
- The edge height. Every plate's apex sits at y 340-400 at frame centre, and
  the type's baseline sits at y 342-353, just above it.
- The type's step schedule: one size per cut, always growing.
- The limb profile and the end-card pan (`END_PAN` in
  `presets/alder-shared.jsx`).

If the copy does not fit a beat, shorten the copy, not the beat. Keep each
word-group short: one or two words, held across its run of plates.

**Replaceable:**

- **Copy.** Every text scene has `role: "brand"`:
  - the three word-groups of the line (`s3-line-1..3`, `text`)
  - the name card (`s4-name`)
  - the wordmark (`s4-wordmark`)

  Each line scene's `steps` set the size, colour, alpha, blur and bend per
  plate. If you replace a plate's image, revisit that plate's step: dark type
  for a pale plate, white for a dark one.
- **Image slots.** There are 36, `plate-01` … `plate-36` (`s2-plate-NN`).
  - Set `src` to a photo. It is clipped to the body under the edge, with its
    top aligned to the edge.
  - Shoot or crop the photo so that its subject's own curved edge is near the
    top. That curved edge is the whole film.
  - Each slot's `label` says what the reference showed there: a glass dish
    rim, a bread crust, a leaf edge, lace, plant cells, mushroom gills…
  - Without `src`, the plate's `layers` generate a stand-in in the
    reference's colours, value and edge character. The kinds are noise,
    rings, spokes, lines, cells, beads, blobs, stripes, hatch and a motif
    band. The edge itself can be smooth, rough, scalloped or furred.
- **Drawn stand-ins.** These are in `presets/alder-shared.jsx`:
  - `AlderMark`: a disc cut by its own horizon
  - the `LIMB` colour profile, which can be recoloured for a different
    planet

## Presets

All of alder's presets live with the template in `presets/`. They register
into the textcards registry through one spread (`ALDER_PRESETS`).

- `alder-horizon` (`alder-s1.jsx`): the planet limb, drawn as one radial
  gradient on a 3750 px radius. It takes `glow` keys (the haze breathing) and
  `pan` keys (`"end"` = the measured rise).
- `alder-plate` (`alder-s2.jsx`): one horizon plate. A sky, an edge, a body,
  a texture stack, rim strokes and an optional photo slot.
- `alder-line` (`alder-s3.jsx`): one word-group of type riding an arc, with
  one state per cut.
- `alder-title` and `alder-grain` (`alder-s4.jsx`): the end titles, which
  share the end card's pan, and film grain over everything.

`alder-plate` and `alder-line` are general enough to reuse: any "match cut on
a shape" montage can be built from them.

## Known gaps

- **Plates.** The default plates are generated textures, not photographs.
  Colour, value, sky, edge height and edge profile match the reference plate
  by plate: mean sky and body colour are within ~15/255 on most plates. The
  surface detail of a macro photo (specular glints, depth of field, fibres)
  is not there. The film reads as intended once real photos fill the slots.
- **Font.** Georgia stands in for the reference's book serif, sized to its
  x-height. Bent words use an SVG text path, which rotates each glyph rather
  than warping it.
- **One animated plate.** The reference's plate 13 is a painted frieze whose
  figures gallop frame to frame. The stand-in drifts its shapes slowly
  instead.
- **Grain.** The grain is a uniform soft-light noise. The reference's grain
  differs from plate to plate, because it comes from the source photos.
