# sequoia

An ~87.5-second **continuous-camera type-and-UI launch film for an AI agent
product**. Type, icons and drawn interface fill the whole film, and almost
nothing cuts. The camera pushes into a tiny search pill and types a line. It
whip-pans across rival app icons and tosses them into a dock trash can. It
buries the viewer in "Connect App" buttons, then shows a rival assistant
refusing ("I can't do that", "Please approve action") and drags the refusals
into the trash. "Introducing" gives way to a light-curtain wordmark reveal.

On off-white, the film then shows:

- a title stack and an "across 🌐 websites 🔑 accounts ↺ history" staircase
- a composer that types the user's task
- a task timeline drawn by a travelling blue dot: a dropdown, a visited site,
  steps and a streamed summary
- a "Spawning subagents in parallel" tree
- an agent log ending in a refund, and a "how did you just do that?" chat

A disc wipe returns the film to graphite for a benchmark bar chart, "Anything
you can do in a 🌐 browser" and a rolling "can do" drum. It closes on privacy
beats (a closing laptop, scrambled "encrypted" glyphs, a password field
masking itself), "Bring your own 🔑 subscription", a lockup and the URL.

Choose it for products that do work on the user's behalf: agents, browsers,
automation tools. It suits a film that argues against rivals before it
demonstrates. It is the most UI-heavy template in the set that needs almost
no footage, because the interface is drawn rather than recorded.

The placeholder product is **Sequoia** (`sequoia.example`), "a browser that
does your work".

## Provenance

Derived from the **Aside launch film**, posted 2026-06-23 at
[x.com/hyojun_at/status/2069497198879048131](https://x.com/hyojun_at/status/2069497198879048131).
When checked on 2026-10-31 (fxtwitter API) it had **1.71M views, 7.35k likes
and 7.55k bookmarks** on an 8.4k-follower founder account, with no brand halo.
It was found on launchgallery.video, first vetted 2026-08-05 and re-vetted
2026-10-31. The dated record is in `references/launch-scouting.json`.

It was rebuilt **frame-by-frame on 2026-10-31** on a 30fps clock (the master
is 29.97fps). Seven parallel section passes did the work, then the sections
were assembled and compared side by side against the reference. Every timing,
camera table, pop, typing cadence, colour ramp and easing in `template.json`
was measured off full-decode frames. The copy and brand were then replaced
with the fictional product above. No reference media is committed.
`reference-notes.md` has the measurements per section.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/sequoia/template.json
node src/lib/textcards/render.mjs --out sequoia.mp4 --fps 30
```

Render at **30fps**. Most motion replays measured per-frame tables. If
someone else may be rendering from the same checkout, render from a private
stage: snapshot `index.html` + `dist/bundle.js` and pass `--html` (see
`src/lib/textcards/README.md`).

## What is fixed and what is replaceable

**Fixed (the template):**

- every `startMs` / `durationMs`
- the camera tables, pops, typing cadences, shimmer sweeps and easings
- the two grounds: graphite `[38,40,37]` and off-white `[254,255,253]`
- the cut points: the light dissolve at 20.8s, the disc wipe at 52.7s, and
  the hard cuts at 66.567s and 79.267s

If copy does not fit a beat, shorten the copy, not the beat.

**Replaceable:**

- **Copy.** Every text scene carries a `role`:
  - `brand`: slogans, claims, the lockup and the URL. Replace wholesale.
  - `product-voice`: the agent's replies, task steps, log lines and the
    rivals' refusals. This is dialogue; keep the voice.
  - `user-voice`: the typed task and the "how did you just do that?" bubble.
    Keep the voice.
  - `feature`: the "can do" drum and the benchmark rows. Swap the words and
    keep the count.

  Most layouts measure their text with canvas `measureText` and reflow, and
  several camera tables re-aim at the laid-out words. Even so, check every
  beat after a retarget: some layouts flex further than others.
- **Product slots.** These are labelled placeholder faces:
  - the product's new-tab UI that the camera pushes through (~25.3-27s)
  - the website the agent visits (~36-40s)
  - the screen of the laptop (~70.5-72s)

  Each sits inside drawn chrome (window, laptop) that rides the measured
  motion.
- **Drawn stand-ins.** Restyle these to the real product:
  - the brand mark: `SequoiaMark`, a ringed pine in `presets/sequoia-shared.jsx`
  - neutral app tiles where the original showed rival browsers and assistants
    (`AppTile`)
  - letter tiles where it showed LinkedIn, Netflix, Amazon and a bank
    (`BrandGlyph`); in the placeholder copy these are ProLink, Streamly,
    Cartwell and Northbank
  - generic model glyphs in the "bring your own subscription" row
  - the benchmark rows' competitor names (Agent A-D)

## Presets

All of sequoia's presets live with the template in `presets/`. They register
into the textcards registry through one spread (`SEQUOIA_PRESETS`).

- `sequoia-shared.jsx`: the shared vocabulary:
  - `sequoia-ground`, `kf()` sparse keyframes and the palette
  - the Lucide line-icon map (`Icon`)
  - the mark and wordmark
  - app tiles, letter glyphs and cursors
- `sequoia-s1.jsx` … `sequoia-s7.jsx`: one file per section; each preset is
  documented in its `note`.

These are general enough to reuse in other films:

- `sequoia-kinetic`: rows of words, inline icons and fields on sparse
  keyframes, with typed reveals and glyph scramble
- `sequoia-type-stack`: centred lines with typing, rises, lurches and exits
- `sequoia-task-timeline`: a canvas whose lines are drawn by a dot
- `sequoia-bench-chart`
- `sequoia-cando-drum`

## Known gaps

- **Font.** Segoe UI stands in for an Inter-Display-class grotesk. Widths are
  matched with weight 600 and negative tracking, so x-heights and glyph tops
  read slightly different.
- **Stand-in glyphs.** The rival app tiles, service letter tiles and model
  glyphs are neutral stand-ins, so the dock and the subscription row are
  calmer in colour than the reference.
- **Approximate beats.** The hand cursor does not tilt while it travels. The
  "Connect App" card swarm approximates the reference's chaotic spawn
  positions. The reverse-genie curtain and the rope of refusals pouring into
  the trash match in timing and shape, but their curvature is approximate.
- **Fixed tables.** Several beats replay dense measured tables (camera,
  dot paths, cursor paths). They are exact for these timings, but retiming a
  beat means re-deriving its table.
