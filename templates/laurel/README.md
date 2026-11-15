# laurel

A 21-second **feature-drop launch film** carried by one object: a dark
**voice pill** with a row of live green level bars. Everything else happens
around it:

- a lime brand keycap rises out of the bottom of the frame and draws its
  mark; three grey keys fall in, tilted, and land beside it to spell the
  shortcut ("Laurel / voice / dictation")
- the pill rises in on a green glow with one overshoot and knocks the grey
  keys off the frame; the lime key drops away
- a thread runs out of the pill and tears open into a paper wedge that sweeps
  a lilac, line-drawn ground across the frame. A chat composer pops in, and the
  sentence the pill hears is **typed** into it with a tinted tail, held, and
  deleted
- the pill sits at the bottom of the frame from here on. The composer's line
  becomes "Types into any app", which slides to the centre beside a white
  tile. App icons roll up through the tile faster and faster
- a hand-lettered word and a serif claim type in above the pill, with an
  availability line and fine print, rising into place as they type
- a hard cut to a lime card: the pill falls out through the cut, the mark
  draws on large, shrinks, and the wordmark types out beside it

Choose it for a **single feature or input-method launch**: dictation, a
shortcut, a hotkey, a voice or capture mode, anything you can show as "press
this, and the words appear wherever you are". It is fully drawn: keycaps,
pill, composer, icons and type are all presets, so it renders without any
footage at all. Its spine is the pill, so every beat stays tied to the one
thing being launched.

The placeholder product is **Laurel**, adding hands-free dictation. The
title reads "DICTATION / Every word, typed for you."

## Provenance

Derived from **Granola's "voice typing" launch film**, posted 2026-10-29 by
@meetgranola at
[x.com/meetgranola/status/2115837013975081208](https://x.com/meetgranola/status/2115837013975081208).
Re-checked on 2026-11-10 (fxtwitter API), it had **1,865,067 views, 7,448
likes, 292 reposts, 530 replies, 583 quotes and 5,680 bookmarks** on a
27.6k-follower account, about 67x the follower count. It was first vetted on
2026-10-30 at 800k views and parked; it more than doubled in the eleven days
since. The dated record is in `references/launch-scouting.json`, and the
manifest entry (`granola-voice`, md5 only, media not committed) is in
`references/references.json`.

It was rebuilt **frame-by-frame on 2026-11-10/11** on the film's own 30fps
clock (stage px = reference px / 1.5). These were all measured:

- the lime key's rise, sink and slide, tracked every frame from its face
  colour, and the three grey keys' fall paths and landing frames
- the pill's top edge every frame (rise, overshoot, drop) and its scale from
  the capsule's width, plus the glow's colour 40 px from its edge
- the wedge's apex and opening, the composer's pop scale, the typing,
  holding and deleting frames
- the line's slide (as a share of its distance), the icon arrival frames and
  the exit curve
- the title stack's rows every 3rd frame, and the end card's mark size, draw
  and lockup slide

None of Granola's content is used: no name, mark, wordmark, keycap art, copy
or colours beyond the measured greys, lime and lilac. The reference's
composer is a third-party chat app; here it is a neutral composer with a
drawn sun glyph, and the reference's real app icons are neutral drawn glyphs.
`reference-notes.md` has the measurements.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/laurel/template.json
node src/lib/textcards/render.mjs --out laurel.mp4 --fps 30 --scale 1.5
```

Render at **30fps**: the presets replay curves measured per reference frame.
The film is authored on the 1280x720 stage, and `--scale 1.5` renders it at
1920x1080. If someone else may be rendering from the same checkout, render
from a private stage (see `src/lib/textcards/README.md`, `--html`).

## What is fixed and what is replaceable

**Fixed (the template):**

- The timing of every beat, in reference frames. Each preset converts its
  scene-relative time to reference frames through `f0`, so a scene's motion
  follows it if you move its `startMs`, but its internal timing does not
  stretch.
- The pill's path: rise f78-f102 with an overshoot to cy 333, glow until
  f141, drop and shrink f156-f192 to (640, 615) at scale 0.597, a bob f500-f520,
  then out through the cut.
- The geometry: key outlines 189/188/188/306 x 213 px at y 252, composer card
  122-1161 x 247-484, icon tile 106 px, title stack baselines.
- The palette: ground [245,246,242], lime [208,235,73], pill [44,46,40], bars
  [120,208,5], lilac [195,180,230], end card [176,203,75].

**Replaceable (fields in `template.json`):**

| scene | field | what it is |
|---|---|---|
| `s1-keys` | `keys[].glyph`, `keys[].word` | the three grey key legends; the last key is wide |
| `s1-keys` | `fnLabel`, `markSrc` | small legend and your mark on the lime key |
| `s3-composer` | `greeting`, `placeholder` | the composer heading and its empty hint |
| `s3-composer` | `text` | the dictated sentence; `[fn]` becomes an inline key chip. Aim for about 1.3 lines (~80 characters) |
| `s3-composer` | `chipsLeft`, `chipsRight` | the composer's chips |
| `s4-line` | `text` | the "works everywhere" line (keep it under ~20 characters) |
| `s4-line` | `icons[]` | **image slots**: `{src, label}` per icon arrival, 11 of them |
| `s5-title` | `title`, `claim`, `available`, `fine` | hand-lettered word, serif claim (≤ ~27 characters), availability and fine print |
| `s6-endcard` | `word`, `colour`, `markSrc` | wordmark, card colour, your mark |

**Slots: 12 image slots**: 11 icons, plus your mark (`markSrc`, set on both
`s1-keys` and `s6-endcard`). With no `src`, drawn stand-ins render.

If the copy does not fit a beat, shorten the copy, not the beat.

## Presets

All six live in `presets/` and are registered by one spread in
`src/lib/textcards/src/presets/index.jsx`.

| slug | beat |
|---|---|
| `laurel-keys` | the keycaps: rise, fall, land, knock-off, drop |
| `laurel-pill` | the persistent voice pill and its sound ribbon (z 30, above everything but the end card's pill pass) |
| `laurel-composer` | thread, torn wedge, lilac ground, composer, typing and deletion |
| `laurel-line` | the sliding line and the icon drum |
| `laurel-title` | the typed title stack |
| `laurel-endcard` | the brand card: mark draw, shrink, wordmark type |

## Fonts

Georgia (serif), Segoe UI (interface sans and wordmark), Ink Free (the hand
title, with synthetic bold, a 1.2 px stroke and an 84% squeeze) and Consolas
(the key chip). All four ship with Windows; other systems fall back to the
listed alternatives, and the hand title is the one that changes most.
