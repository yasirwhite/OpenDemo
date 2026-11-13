# spruce

An 80-second **aura-gradient launch film for an AI app builder**. Grainy
colour grounds carry big, short claims; between them the product appears at
punch-in scale, pressed by a white hand cursor. It runs in eight beats:

- **0–8.8s, the claim.** A field of soft glossy bubbles on cream, one of
  them labelled. The field pales away and a line grows word by word ("Fewer
  than 9% → 4% → 1% ◎ of people"). A huge typed line pulls back while gradient
  braces close on it ("{ can write code }"), "but now anyone can", a
  gradient "Meet", and a hard cut to the wordmark on an arc aura (blue sky,
  magenta band, orange core).
- **8.8–23s, the scale.** Words over two glossy orbs on black, one huge word
  on the arc aura ("Quicker"), "than you'd think", then cream again: "Join
  other makers", "launching" letter by letter, a counter over a gradient
  scribble, "new projects every week". The camera falls into the last word,
  a flower opens with a sparkle at its heart, and the sparkle opens onto a
  wall of built sites. The wall pans, punches into one site, and cuts to it
  on a laptop.
- **23–33s, the prompt.** A black pill inside a thick orange-to-blue glow;
  the prompt types, the hand presses send, the pill squeezes into a small
  rect and grows into the app window inside the same glow. A close-up of the
  composer types a follow-up; the tilted window shows the result.
- **33–41s, collaboration.** "Now with your team" with two named cursors,
  Invite/Publish at punch-in scale, an invite dialog, a row of avatars that
  becomes the toolbar, and the shared dashboard with both cursors.
- **41–53.6s, visual edits.** "Tweak it visually", a select target, the
  composer toolbar where the hand switches on Select, then the editor: the
  heading is retyped in an Edit Text panel, selected, and recoloured from a
  palette.
- **53.6–63s, publishing.** "publish instantly / what / you / made / on your
  own domain" on the arc aura, Publish pressed, a publish dialog cycling
  through custom domains, the live site in a browser and on a laptop.
- **63–72.2s, code.** "Introducing /code view", a code toggle pressed until
  it glows, an insights app flipping to its code, "Edit the code right where
  it lives", "or sync to ⑂ your repo".
- **72.2–80.4s, the close.** A blurred aura shaped like the brand mark
  ("Now it's your move", "What will you make?"), then the gradient mark on
  black, the wordmark, and the url alone.

Choose it for an **AI app or site builder, a prompt-to-product tool, or a
no-code platform** launching a big version: it sells the outcome (sites and
apps made from a sentence), then walks feature beats (collaboration, visual
edits, domains, code access). It works with no footage at all, because the
product UI is drawn, and every window takes your own recording. The
placeholder product is **Spruce** (`spruce.example`), whose users build a
yoga-studio booking app ("Studio Flow"), a coffee site ("Halfmoon"), a
finance dashboard and an HR insights app.

## Provenance

Derived from the **Lovable 2.0 launch film** ("multiplayer vibe coding"),
posted 2025-04-24 by the founder at
[x.com/antonosika/status/1915482887618465995](https://x.com/antonosika/status/1915482887618465995).
Checked on 2026-11-13 (fxtwitter API), it had **379,092 views, 4,485 likes,
2,237 bookmarks and 221 reposts** on an 85.7k-follower account: a 1.18% like
rate, the highest of the night's candidates. The dated record is in
`references/launch-scouting.json`; the manifest entry (`lovable-2`, md5 only,
media not committed) is in `references/references.json`.

It was rebuilt **frame-by-frame on 2026-11-13** on the film's own 30fps clock:
the beat boundaries sit on the reference's frames (15 of its 21
detected cuts land within one frame in a diff trace of the rebuild), the
aura ring colours were sampled down the centre column of the reference
(`RINGS` in `spruce-shared.jsx`), and type sizes, window scales and hand
positions were matched against 80+ paired frames. `reference-notes.md` has
the numbers. None of Lovable's content is used: no name, mark, copy, UI or
site design. The mark, the sites, the apps and every line of copy are new.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/spruce/template.json
node src/lib/textcards/render.mjs --out spruce.mp4 --fps 30 --scale 1.5
```

Render at **30fps** with `--scale 1.5` (1920x1080). The film is authored in
1920x1080 reference px on the 1280x720 stage. If someone else may be
rendering from the same checkout, render from a private stage
(`src/lib/textcards/README.md`, `--html`). The auras are CSS gradients and
the glow around the pill and windows is built from the rect's distance field,
so software rendering (`--disable-gpu`) is safe.

## What is fixed and what is replaceable

**Fixed (the template):**

- **The beat list.** 69 scenes on the reference's frames (`startMs` /
  `durationMs`). Lines carry their own `camera` pull-backs (big on entry,
  settling on an ease-out, then a slow linear shrink): keep them when you
  retime, they are most of the film's motion.
- **The grounds.** Three families, cut hard: cream with rim auras, the arc
  aura (`arc`, `arc2`, `arc3`), and black with a violet haze (`dark`). All
  carry a per-frame grain. The mark-shaped closing aura is `spruce-endaura`.
- **The glow.** Pill and window share one ring set (`GLOW_RINGS`).
- **The hand.** It always travels, presses (scale 0.88) and releases.

**Replaceable:**

- **Copy** (`role` on every scene):
  - `brand`: every claim line, the counter's numbers, the wordmark (`name`
    on `spruce-lockup` and `spruce-endcard`) and the url. Keep line lengths
    close, since sizes and camera pulls were fitted to them.
  - `user-voice`: the two prompts (`PROMPT`, `FOLLOW` in the scenes
    `s3-pill`, `s3-close`).
  - `product-voice`: collaborator names and emails, the domain list in the
    publish dialog.
- **Your recordings.** Every `spruce-window` scene takes `src` (an .mp4 of
  your app) and `clip`; the footage fills the window and rides its glow,
  tilt and zoom. Record at ~1.54:1 (the window is 1540x1000 native).
- **Pictures.** `spruce-laptop` takes `image` (your own product photo
  replaces the drawn set) or `images` for the page on its screen;
  `spruce-wall` takes `images` per site kind; `spruce-avatars` takes
  `images` `avatar-1`..`avatar-5`.
- **The mark.** `markPath` in `spruce-type.jsx` (a 100x100 path). The
  lockup morphs a round seed into it and the closing aura is blurred copies
  of it, so a new mark changes all three.

## Presets

All in `templates/spruce/presets/`, registered by one spread in
`src/lib/textcards/src/presets/index.jsx`:

| preset | what it draws |
|---|---|
| `spruce-ground` | base + ring aura + soft blobs + grain |
| `spruce-line` | a centred line growing word by word, re-centring; or typed with a gradient caret |
| `spruce-letters` | one word, letters arriving from the middle outward |
| `spruce-bubbles` | the opening field of glossy spheres |
| `spruce-braces` | gradient braces closing on a line |
| `spruce-counter` | oblique counter over a gradient scribble |
| `spruce-orbs` | two glossy spheres on black, one word at a time |
| `spruce-bloom` | fall into a letter, a flower, a sparkle |
| `spruce-lockup` | seed-to-mark morph and wordmark reveal |
| `spruce-wall` | the site opening in the sparkle, the wall, the punch-in |
| `spruce-laptop` | a site on a laptop: rock or desk set, or a photo slot |
| `spruce-pill` | the glowing prompt pill, typing, press, squeeze |
| `spruce-window` | the app window: glow, tilt, close-ups, six views, cursors, `src` |
| `spruce-buttons` | Invite / Publish at punch-in scale |
| `spruce-dialog` | invite or publish dialog |
| `spruce-avatars` | avatars popping into a row and a toolbar |
| `spruce-toolbar` | the composer toolbar close-up |
| `spruce-toggle` | the code toggle or the select target |
| `spruce-browser` | the published site in a browser |
| `spruce-cursors` | named collaborator cursors over type |
| `spruce-endaura` | the mark-shaped closing aura |
| `spruce-endcard` | mark, wordmark, url on black |
