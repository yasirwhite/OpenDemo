# linden

A 25-second **gallery-wall launch film** for a generative media product. It
is one wall of finished outputs on black, seen by one continuous camera:

- one card alone on black, drifting slowly toward you, while the wall fades
  up behind it inside a widening pool of light
- the card sinks back into its place in the wall, and the wall lights to full
- the camera pushes in, rolls and yaws across the wall and lands square on a
  second card, the focus
- it pulls back and slides down across the whole wall
- it accelerates back toward the first card and dives into the black gutter
  beside it
- three white lines on black, one at a time: the name ("Linden Studio 1.0"),
  a claim ("Type a line, get a film"), and the mark with the address

Choose it for a **model, app or tool whose output is pictures or clips**: an
image or video model, a template gallery, a showcase of what people made. The
film sells volume and quality in one move: there is a lot of it, and any one
of it holds up close. It makes no feature claims, so the claim line has to say
what the product does.

It renders complete with no assets. Every card has drawn placeholder art
(vistas, dunes, blooms, ringed planets, night skylines, a mascot, glossy
objects, bands, arcades and figure studies), coloured from the reference's
card palette. Put your own outputs in the image slots and the drawn art
steps aside.

The placeholder product is **Linden Studio 1.0**, a fictional model that turns
a line of text into pictures and short clips.

## Provenance

Derived from **xAI's "Grok Imagine 1.0" launch film**, posted 2026-02-02 by
@xai at
[x.com/xai/status/2018164753810764061](https://x.com/xai/status/2018164753810764061).
Checked on 2026-11-12 (fxtwitter API), it had **14,583,215 views, 20,614
likes, 2,816 reposts, 3,680 replies and 5,693 bookmarks** on a 2.09M-follower
account (about 7x the follower count). That is a big brand halo, so the film
was judged on its craft as well: one wall, one camera, three lines, and no
cuts until the type. The dated record is in `references/launch-scouting.json`,
and the manifest entry (`grok-imagine-1`, md5 only, media not committed) is in
`references/references.json`.

It was rebuilt on 2026-11-12 on the film's own 30fps clock (stage px =
reference px / 1.5). The camera was **solved, not eyeballed**: the wall is a
plane, so every frame is a plane-to-screen homography. They were found with
SIFT matches and RANSAC, chained frame to frame and re-anchored on direct
matches against three keyframes, then smoothed and sampled every 3 frames.
The preset replays those samples through a spline (p95 error 3.7 stage px).
The card layout was read off the frame where the wall faces the camera
square, plus a mosaic of the whole wall stitched with the same homographies.
The opening card, the wall behind it and the pool of light were tracked
separately. `reference-notes.md` has the numbers.

None of the reference's content is used: no name, mark, copy, pictures or
clips. Every card picture in the reference is a generated clip; here each is
a drawn placeholder or your own image.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/linden/template.json
node src/lib/textcards/render.mjs --out linden.mp4 --fps 30 --scale 1.5
```

Render at **30fps**: the camera is a per-frame path in reference frames. The
film is authored on the 1280x720 stage, and `--scale 1.5` renders it at
1920x1080. If someone else may be rendering from the same checkout, render
from a private stage (see `src/lib/textcards/README.md`, `--html`).

## What is fixed and what is replaceable

**Fixed (the template):**

- The camera path and its timing: A f1-f99 one card, B f99-f113 it sinks
  into the wall, C f114-f330 push/roll/yaw onto the focus card, D f330-f500
  pull back, E f500-f558 the dive, black from f559. Don't stretch
  `linden-wall`: it is 18.6s of measured path.
- The wall: 33 cards, their rects and corner radius (8% of the short side),
  pure black ground, no shadows.
- The lines: 66.7 px Segoe UI, centred, baseline 381, white; each fades in
  over 16 frames and leaves on a hard cut.

**Replaceable (fields in `template.json`):**

| scene | field | what it is |
|---|---|---|
| `s1-wall` | `hero` | **image slot** `{src, label}`: the opening card, and the one the camera dives beside. 2:3 portrait |
| `s1-wall` | `focus` | **image slot** `{src, label}`: the card the camera lands on at ~11s. 2:3 portrait |
| `s1-wall` | `media[]` | **image slots** `{src, label}`: the rest of the wall, nearest the hero first; a short list cycles. Mostly 2:3 and 3:4, a few landscape; pictures crop to cover |
| `s2-name` | `lead`, `text`, `weight` | the name, heavy, and a light suffix (version, product line) |
| `s3-claim` | `text` | one short claim, ~25 characters. Say what it makes |
| `s4-address` | `text`, `mark`, `markSrc` | the address, with your mark ahead of it |

**Slots: 34 image slots**: `hero`, `focus`, 31 `media` cards, and `markSrc`.
Without a `src`, drawn placeholder art renders. Your strongest output belongs
in `hero`: the film opens on it and ends inside it.

## Presets

Both live in `presets/` and are registered by one spread in
`src/lib/textcards/src/presets/index.jsx`.

| slug | beat |
|---|---|
| `linden-wall` | the opening card, the wall, and the whole camera move, ending on black |
| `linden-line` | one white line on black: 16-frame fade in, hold, hard cut out. Optional mark ahead of it |

## Fonts

Segoe UI (700 for the name, 300, 400 and 600 for the rest). It ships with
Windows; other systems fall back to Inter, Helvetica Neue or Arial.
