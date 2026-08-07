# Templates — complete launch films with product-shaped holes

A **template** is a whole launch video — measured timings, colour grounds,
easings, music grid — with `product-slot` scenes and role-tagged copy left open
for a real product. A **preset** is one shot or text beat (see
`src/lib/cinematic3d/presets/` and `src/lib/textcards/src/presets/`). Templates
are built *out of* presets; users pick a template, not a preset.

**If you are an agent asked to make an "exciting launch video", this file is
your instruction set.** Read it top to bottom; pull in the engine READMEs only
at the step that needs them.

## Layout

```
templates/
  index.json          the registry — slug, style, duration, tags, categories
  <slug>/
    template.json     the full film config (textcards format)
    README.md         provenance + what is fixed vs replaceable
```

Template slugs are **tree names** (`cedar`, `birch`, `aspen`, …) — short,
memorable, no meaning to collide with product words. See
`docs/engineering/conventions.md`.

## Choosing a template

Read `templates/index.json`, match its `style`/`tags` against what the user's
product needs, and confirm the pick with the user before doing any work.
The registry is the only list — do not rely on a count written here. As of
this writing it holds **cedar** (kinetic typography, two product slots, ~36s),
**birch** (kinetic typography for a brand engine, drawn product screens,
three media windows, ~59s) and **aspen** (a cinematic product-demo film for an
AI browser, ten choreographed windows including an optional template carousel,
~72s).

## Using a template: the flow

1. **Copy the config out of the repo** — `templates/<slug>/template.json` into
   your working directory (same rule as every OpenDemo config: never author
   inside the repo).
2. **Retarget the copy.** Every text scene carries a `role`
   (`brand` / `product-voice` / `user-voice` / `feature`). What each role
   means and how to adapt it is the *Copy roles* table in
   `src/lib/textcards/README.md`. The one rule that outranks the others:
   `product-voice` and `user-voice` are **dialogue inside a demo scenario**,
   not slogans — swap the specifics, keep the voice.
3. **Do not touch the timings.** `startMs`/`durationMs`/easings/grounds *are*
   the template — they were measured frame-by-frame off a real film. If copy
   does not fit a beat, shorten the copy, not the beat.
4. **Build and review the text layer first.** Product slots render labelled
   placeholder boxes, so the whole cut can be reviewed before any footage
   exists:
   ```bash
   node src/lib/textcards/build.mjs --config my-video.json
   node src/lib/textcards/render.mjs --out text.mp4 --fps 60
   ```
5. **Record the product** with the standard walkthrough flow
   (`run-demo.mjs` — see `AGENT_README.md` / `USAGE.md`).
6. **Render each slot** through the 3D pipeline
   (`src/lib/cinematic3d/README.md` for the schema and shot presets), at the
   **same width/height/fps** as the template's `video` block or the overlay
   will not line up.
7. **Composite** each shot onto its slot's window — the text layer stays
   independently rebuildable:
   ```bash
   # slot at startMs 6330, durationMs 4000  ->  6.33 .. 10.33
   ffmpeg -y -i text.mp4 -i shot1.mp4 -filter_complex \
     "[1:v]setpts=PTS+6.33/TB[s];[0:v][s]overlay=0:0:enable='between(t,6.33,10.33)'" \
     -c:v libx264 -crf 17 -pix_fmt yuv420p -r 60 final.mp4
   ```
8. **Deliver** per the standard rules in `AGENT_README.md` (copy the .mp4 into
   the user's project, tell them the exact path).
9. **Then — and only then — offer music.** Ask the user if they want the video
   cut to a track. If yes, read `docs/music-sync.md` and re-time against the
   bar grid. Do not raise music before the silent cut is approved.

Keep scratch work (mock apps, recordings, intermediate renders) in
`.demo-build/` — it is gitignored.

## Crafting a story (learned from the film that won)

The strongest launch film we've produced was not the template-faithful cut —
it was the one that dramatized the product's own loop as a story. The
principles, in the order they mattered:

- **Show the wish, then answer it.** A bare typed line on an empty frame
  ("Make me a demo") — no interface, no product — answered by a real demo
  appearing. Then, later, the *same wish made specific inside the product*
  ("Use OpenDemo to make a StackRender launch"), answered by the film's
  hardest cut. **Rhyme, don't repeat:** two typed beats work when the second
  escalates the first. First act you ask; second act you ask for something
  real, and what answers you is the product working.
- **Every ask on screen gets its payoff on screen.** A prompt without its
  result, or a result without its ask, breaks the story.
- **Narrate capability as beats, not features.** "Pick a template." before a
  carousel that *demonstrates* picking — segments flying past, decelerating,
  landing on one that grows into the playing window. The viewer learns the
  product by watching it happen, never by being told.
- **New beats must be built in-theme.** When the user asks for something no
  preset covers (a cursor that clicks, a template carousel, a prompt pill),
  build it from the film's existing motion vocabulary — the same easing
  families, grounds, type voice and window grammar. That is why invented
  beats read as part of the film instead of insertions. Never animate outside
  the template's own character.

## Directing rules that carry over from the 2D flow

- **Zoom even more sparingly in 3D.** A 3D push is far more disruptive than a
  2D one.
- **Punch-then-reveal for feature moments:** push in hard to frame the click
  (attention), then pull back a *little* to show what it affected
  (consequence). Pulling back too far throws away the attention the push just
  bought.
- **Cut, don't crossfade.** Almost every transition in a real launch film is a
  single frame.
- **Hold still.** A good reference is in motion only ~19% of the time; the
  dead holds are what make the moving parts land.
- **Vary the easing and the edit length.** Uniformity is what reads as
  generated.
- **Use scale.** Entering oversized and settling on an exponential is the
  single most effective device, and the most commonly missed.

## Authoring a NEW template

This is reference-derivation work, not config editing. Read
`docs/reference-matching.md` first (method + traps — the short version:
**sample frames densely**, nearly every wrong conclusion came from sparse
sampling). Then:

1. Register the reference film in `references/references.json` (manifest only —
   media is never committed).
2. Measure and rebuild the film scene by scene with textcards / cinematic3d
   presets; add new engine presets if the film's grammar needs them.
3. Land it as `templates/<next-tree-name>/` with placeholder copy for a
   fictional product, a README recording provenance and what is fixed, and an
   entry in `templates/index.json` with `style`, `tags` and `category` filled
   in — that metadata is how templates stay findable as the collection grows.
4. Add nothing binary: preview media is fetched, not committed
   (`docs/engineering/conventions.md`).
