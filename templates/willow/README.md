# willow

A ~90-second **character-led launch film for an AI work companion**: elastic
kinetic type on pale halftone grounds that re-tint by hard cut ("You have /
ideas / plans / deadlines"), a cast of character-art slots running through the
type, a browser "Ask" composer that types a request and sends it, outreach
cards stacking, a rolling drum of capability chips ("I can do …"), a chat
thread whose status rows tick through the work, a meeting toast, a call window
with a notetaker pill, a portrait orbit with role tags, a library worked over
by role-tagged agent cursors, three proof beats (a sites counter in a cloud of
app glyphs, a testimonial cover-flow, a "crews hired" counter in an avatar
lattice) and a serif-wordmark end card. It is the most character- and
UI-card-heavy template in the set. Choose it for products that are a team of
agents, assistants or companions.

The placeholder product is **Willow** (`willow.example`), "the AI crew that
works beside you". Each character slot is a crewmate.

## Provenance

Derived from the **Strawberry 1.0 launch film** (Strawberry Browser), posted
2026-10-26 at
[x.com/charles_maddock/status/2114659351470247986](https://x.com/charles_maddock/status/2114659351470247986).
It had **1.87M views, 4.5k likes and 4.7k bookmarks** when checked
2026-10-30 (fxtwitter API), against a 10k-follower founder account. Found on
launchgallery.video. The dated record is in `references/launch-scouting.json`.

Rebuilt **frame-by-frame on 2026-10-30** at the film's native 24fps, by six
section passes, assembled and compared side by side against the reference.
Every timing, ground tint, camera key, drum step, cursor path and easing in
`template.json` was measured off full-decode frames. The copy and brand were
then replaced with the fictional product above. No reference media is
committed. `reference-notes.md` has the measurements per section.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/willow/template.json
node src/lib/textcards/render.mjs --out willow.mp4 --fps 24
```

Render at **24fps**. Several beats are keyed per reference frame, and the end
card steps on twos by design. If someone else may be rendering from the same
checkout, render from a private stage: snapshot `index.html` +
`dist/bundle.js` and pass `--html` (see `src/lib/textcards/README.md`).

## What is fixed and what is replaceable

**Fixed (the template):**
- every `startMs` / `durationMs`, the key tables, easings and camera moves
- the ground tints and the halftone field
- the drum cadence (it accelerates)
- the counter curves
- the cut points

If copy does not fit a beat, shorten the copy, not the beat.

**Replaceable:**

- **Copy.** Every text scene carries a `role`:
  - `brand`: slogans, claims and the sign-off. Replace wholesale.
  - `product-voice`: the companion's replies ("Sure — I'll get the crew on
    it.", "On it!", status rows). This is dialogue; keep the voice.
  - `user-voice`: the typed requests ("Find 50 design partners", "Help me
    polish this pitch deck") and the testimonials. Keep the voice.
  - `feature`: the chip drums (sales, research, marketing … / tabs, apps,
    docs). Swap the words and keep the count.

  Text lays out from measured glyph widths, so different-length copy reflows.
- **Character-art slots.** These are dashed, tinted boxes labelled
  `character art — …` that ride the measured bbox motion of the original cast
  (passes, runs, tumbles, flights, the hero grow). Drop in your mascot art,
  avatar renders or product hero shots.
- **App-footage slots.** These are dashed boxes inside drawn browser frames
  (people search, calendar, slides editor, deck filling in, finished deck).
  Give the window a `src` to play a recording, or an `interior` preset to draw
  one.
- **Drawn stand-ins** that you should restyle to the real product:
  - the brand mark: a coral dot cluster; swap it for your logo
  - neutral app-glyph tiles where the original had third-party logos
  - initials avatars where it had photos
  - the call window, library and folder cards, outreach cards and chat panel,
    all drawn generically

## Presets

All of willow's presets live with the template in `presets/` and register into
the textcards registry through one spread (`WILLOW_PRESETS`):

- `willow-shared.jsx`: the ground (`willow-ground`), `kf()` keyframes, cursors
  and avatars.
- `willow-s1.jsx` … `willow-s6.jsx`: one file per section, each preset
  documented in its `note`.

The elastic type engine (`willow-kinetic-type`), the chip drum
(`willow-chip-drum`), the bubble stack (`willow-bubble-stack`) and the counter
(`willow-counter-type`) are general enough to reuse in other films.

## Known gaps

- The characters are rectangles. Poses, limbs, squash and the hand-wave cannot
  be shown, only each figure's bbox path, scale and rotation.
- The type is Segoe UI standing in for an Inter-class grotesk. Widths are
  matched with tracking, so x-heights read slightly different.
- The reference animates parts of the film on twos or threes, and its footage
  stutters at 20fps inside 24fps. The rebuild interpolates those moves
  smoothly.
- The reference's open-palm "grab" hand pose is drawn as the pointing hand.
