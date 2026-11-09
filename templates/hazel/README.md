# hazel

A 43.8-second **vector-construction launch film for a graphics or illustration
model**. Paper-white grounds, pale cyan line art that strokes itself on, one
blue sky field, and a run of beats where the product's output is drawn on
camera:

- a frosted label on a sky field, then the product name wiped on by a pale
  panel sliding along the line
- three split screens on a hard centre edge: line icons beside an app window,
  a halftone mark beside a dock tile, a technical drawing beside a printed
  sheet
- a rolling column of scope words under a selection box, with specimens
  popping up around each stop
- an easing curve drawing across the sky field
- code pouring over a line-art illustration, which then blooms into colour
  from a single point
- letterforms stroked on point by point at huge size, then pulled back to the
  whole word
- the mark's outline drawn from its head, then a four-frame motion strip
  filling in one pose at a time
- the mark on real objects, cut hard on a four-frame clock
- a table of finished work revealed tile by tile
- a prompt typed into a composer, a picture building in layers, three cuts of
  variations, eight stamps on a four-frame clock
- a status line, a blur-in claim, a claim whose last words cut through three
  faces, and a wordmark

Choose it for products that make vector art, icons, marks, type or
illustrations. It suits any tool whose output is a drawing you can show being
drawn. Almost nothing is footage. The lines, the mark, the charts, the app
chrome, the mockups and the type are all drawn in code, so the film renders
complete with no assets.

The placeholder product is **Filbert 2.0**, a fictional vector-graphics
model. Its mark is a swift over a striped sun, and its worked example is a
lighthouse illustration and a set of flower-pot motifs. None of the reference's
names, marks, copy or artwork are used.

## Provenance

Derived from the **QuiverAI "Introducing Arrow 2" launch film**, posted
2026-09-16 by @QuiverAI at
[x.com/QuiverAI/status/2100295136261349802](https://x.com/QuiverAI/status/2100295136261349802).
Checked on 2026-11-09 (fxtwitter API), it had **2,366,346 views, 11,184 likes
and 14,079 bookmarks** on a 24,745-follower account, about 96x the follower
count. The dated record is in `references/launch-scouting.json`, and the
manifest entry (`quiver-arrow2`, md5 only, media not committed) is in
`references/references.json`.

It was rebuilt **frame-by-frame on 2026-11-09**. Cut frames, drum positions,
tile rectangles, pill and panel geometry, colours and type sizes were measured
from full-decode frames of the 25fps master. The 20 beats were then compared
side by side at matched size. `reference-notes.md` has the measurements per
section.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/hazel/template.json
node src/lib/textcards/render.mjs --out hazel.mp4 --fps 25 --scale 1.5
```

Render at **25fps**. The film is authored directly in reference pixels on the
1280x720 stage. `--scale 1.5` gives the 1920x1080 film the config declares;
leave it off for a 1280x720 proof. If someone else may be rendering from the
same checkout, render from a private stage (snapshot `index.html` +
`dist/bundle.js` and pass `--html`, see `src/lib/textcards/README.md`).

## What is fixed and what is replaceable

**Fixed (the template):**

- every `startMs` / `durationMs` and every cut frame, including the
  four-frame clocks on the mockups (f581–f623) and stamps (f814–f846)
- the panel wipe and word-drum roll keys, the sky field, the colour bloom, the
  letterform pull-back, and the frame-strip fill timing
- the palette in `presets/hazel-shared.jsx` (paper, panel, cyan, ink, the
  sky bands, the royal blue of the strip)

If copy does not fit a beat, shorten the copy, not the beat.

**Replaceable:**

- **Copy.** Every text scene carries a `role`:
  - `brand`: the labels and claims (`s1-*`, `s2-sky-curve`, `s4-*`, `s6-*`),
    and the stamp caption, tag and price.
  - `feature`: the drum's words (`s2-drum.words`). Change `stops` to match.
  - `user-voice`: the prompts (`s3-strip.prompt`, `s5-composer.text`).
  - `product-voice`: the letter caption (`s3-letters`) and the status lines
    (`s5-generate.status`, `s6-loader.items`).
- **Image slots.** 22 in all, each drawn until you pass a `src`:
  - `s4-mockups.items` (12): any object photo of your mark. `kind` picks the
    drawn stand-in.
  - `s5-stamps.items` (8): the motif on a stamp, or a full replacement photo.
  - `s1-split-camera` `src`: the printed sheet.
  - `s3-code` `src`: the picture the colour bloom reveals.
  - `tiles` arrays in `s1-live`, `s2-drum`, `s4-table` and `s6-claim` also
    take `src` per tile.
- **Drawn stand-ins.** Restyle these to the real product, all in
  `presets/hazel-shared-art.jsx`:
  - `birdPath` / `Bird` / `HalftoneBird`: the hero mark and its halftone.
    Point `birdPath` at your mark's outline and every beat that draws it
    follows. Change `BIRD_POSES` for the four strip poses.
  - `SunMark`, `NutGlyph`: the big mark and the small brand glyph.
  - `ICONS`, `CAMERA_PATHS`, `SCENE`: line art (each is a list of paths).
  - `VASES`, `Vase`, `Stamp`, `Mockup`, `TILES`: the outputs.
- **The letterforms** (`s3-letters`). The word is the table `GLYPHS` in
  `presets/hazel-s3.jsx`: per-letter advance and on-curve anchor positions read
  from the installed Georgia Italic. To change the word, regenerate that table
  for your letters.

## Presets

All of hazel's presets live with the template in `presets/`, registered into
the textcards registry through one spread (`HAZEL_PRESETS`). Each preset is
documented in its `note`.

- `hazel-shared.jsx`: palette, sparse keyframes, the sky field, selection box.
- `hazel-shared-art.jsx`: the drawn art and mockups.
- `hazel-s1.jsx` … `hazel-s6.jsx`: one file per section.

Reusable beyond this film:

- `hazel-split`: a hard-edged split with a stroke-on left pane
- `hazel-drum`: a word column under a selection box, with specimens
- `hazel-code-reveal`: code over line art that blooms into colour
- `hazel-letter-draw`: letterforms drawn point by point with a pull-back
- `hazel-mockups` / `hazel-stamps`: four-frame cut montages

## Known gaps

- **Fonts.** Only system fonts are used: Segoe UI stands in for the film's UI
  grotesk, Georgia Italic for its display serif, Bahnschrift and Impact for the
  swap faces, Consolas for the mono labels. The letter-draw word depends on
  Georgia Italic being installed; on another machine it falls back and the
  anchors drift from the outline.
- **Mockups and stamps.** They are flat drawn scenes. The reference's are
  photographs, so these read as graphics until photos go in the slots.
- **Drawn art density.** The illustrations are simpler than the reference's
  generated art, with fewer strokes per picture.
- **Word-drum blur** is a uniform CSS blur, not true motion blur.
