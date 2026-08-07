# aspen

A ~72-second cinematic launch film for an **AI browser** — serif claims on
cream, a colour-shifting orb rolling a noun column, four product windows that
rise, punch and fly, a template carousel, a voice-mode interlude, and a cosmic
close on black. The longest and quietest template in the set: it holds still
more than it moves, and every move is measured.

The placeholder product is **Aspen** (`aspen.computer`), named after the
template. An aspen grove is one organism — hundreds of trunks sharing a single
root system — and that is the whole voice: *rooted*, *threaded*, *one root*,
rather than fast / smart / powerful. The film opens "A browser rooted in you."
and closes "One root. Every answer."

## Provenance

Derived from the **Perplexity Comet launch film** — the launch of Perplexity's
agentic browser — posted at
[x.com/perplexity_ai/status/1942969263305671143](https://x.com/perplexity_ai/status/1942969263305671143):
**6.5k likes confirmed via the X syndication API (2026-08-05); ~1.7M views as
reported at scouting** (views are not exposed by that API — see
`references/launch-scouting.json` for the dated record). It was picked for its
restraint — a 72-second film that is in motion under a fifth of the time and
still carries five product demos.

Rebuilt and **motion-corrected frame-by-frame on 2026-08-05/06**, then
human-approved against the reference. Every timing, ground stop, camera key,
window track, orb path and easing in `template.json` was measured off that film
at its native **25fps**; the copy and brand were then replaced with the
fictional product above. No reference media is committed — only the measured
config.

The corrections are worth knowing about, because they are what the config's
`_note` blocks record: the 8.03s black flash is a disc *accelerating* out of the
last ellipsis dot (it had been an exponential settle, i.e. exactly backwards);
the 60.44s dark mass *morphs* from a dome into the frame rather than scaling;
the map window's 16.5–20.6s state is not full-bleed but a 1.399× scale that
keeps one corner and its shadow in frame; and the plate ramp under the swallow
is a monotonic least-squares fit through a reference that contradicts itself.

## The carousel — aspen's signature optional section

**27.20–35.50s, slots 2–7.** Five template segments whip through right-to-left,
one at a time, and a sixth stops.

The gaps between arrivals grow **360 / 480 / 640 / 850 / 1130 ms** and the
easings run down with the clock: card 1 crosses on `linear` at ~3500px/s and is
never meant to be read; card 2 gets an `out`; cards 4 and 5 arrive on an `expo`,
which is the first time anything nearly stops; card 5 parks near centre for the
best part of a second before `in`/pow 2.6 throws it off left. The exits
accelerate on rising powers (1.6 → 1.9 → 2.2 → 2.6) while the entries decelerate
harder, so the deck visibly runs down instead of looping.

Then the sixth card lands and does not leave. Its entry is the film's own
fly-in-from-right (1690 → 1240 on `in`/pow 2.2, then onto centre) so it reads as
the same film — except it lands on `out` rather than `expo`, because an expo is
98% arrived a third of the way in and the whole point of this card is being
**seen slowing down**. It then runs three steps with a dead hold between each:
lands as a card at **30.96** and sits still 0.44s, grows into an 880×495 window
at **31.90** and plays there 1.46s, punches to full bleed at **33.66** on the
measured 0.30s in-out and holds 1.70s, then hands off to the cream ground.

It reads as a carousel because of the lines around it — *"See everything"*
before, *"and go further than ever"* after. Fill the cards with something that
is plainly a *different* film's copy from yours, and give the hero kinetic type
rather than more product UI: the product's own screens are four seconds away
and the beat should not pre-empt them.

The beat is **optional and self-contained**. It occupies exactly the envelope of
the single window it replaced (27200 + 8300 = 35500), so deleting the six
`tpl-*` scenes and pasting this one back changes nothing outside 27.20–35.50s:

```json
{
  "id": "thread-demo",
  "preset": "media-window",
  "role": "product-voice",
  "startMs": 27200,
  "durationMs": 8300,
  "index": 2,
  "label": "Aspen reading a thread",
  "w": 719, "h": 575, "radius": 12,
  "face": [248, 246, 243],
  "ink": [24, 46, 43],
  "src": null, "clip": null, "fill": "cover",
  "_fill": "Aspen beside a long chat thread: flies in blurred from the right, settles floating on cream, punches in ~29.1s, a catch-me-up prompt types into the assistant rail, the answer streams, frame fades to the cream ground by 35.3s.",
  "keys": [
    { "atMs": 0,    "x": 1656, "y": 304, "blur": 12, "opacity": 1 },
    { "atMs": 240,  "x": 1223, "blur": 9, "ease": "in", "pow": 2.2 },
    { "atMs": 960,  "x": 620,  "blur": 0, "ease": "expo" },
    { "atMs": 1880, "x": 618, "y": 310, "w": 976, "h": 780, "radius": 8, "ease": "inout" },
    { "atMs": 2260, "fullBleed": true, "ease": "inout" },
    { "atMs": 7560 },
    { "atMs": 8160, "opacity": 0, "ease": "linear" }
  ]
}
```

(Renumber slots 8/9/10 down to 3/4/5 if you do — the indices are only the
labels' own bookkeeping.)

## Fixed vs replaceable

**Fixed — do not touch when retargeting:**

- `startMs` / `durationMs` on every scene, the whole `ground` timeline, every
  `camera` block, every media-window `keys` track, every orb `keys`/`skins`
  track, all easings. These *are* the template.
- The section grammar (see `_sections` in the config): cream open → noun column
  → the refrain → demo window → carousel → voice interlude → hard cut at 48.04s
  → cosmic close. **48.04s is the film's only score-1.0 hard cut**; everything
  else hands over in motion, including the 60.44s swallow, whose interior
  `[1,1,1]` matches the following dark scene exactly so there is no cut there
  either.
- `video`: 1280×720 @ **25fps** (the reference's native rate — render with
  `--fps 25`, not 60).
- **`line-2`'s `x` is a measured constant, not layout.** The black disc at 8.03
  grows out of the *last ellipsis dot* of that line. Change the copy and the
  ellipsis moves, and the film's biggest transition starts next to nothing
  instead of out of it. The shipped `x: 9` was measured, not guessed: at t=7.96
  the approved rebuild's rightmost ink column is 923, and x of 0/5/9/10/15
  renders 913/918/923/924/929. Re-measure it the same way if you rewrite the
  line. `_copyNote` on the scene says so too.
- **`ask-once` is fitted to its beat.** `type-on` runs at `cps: 12` from 14100
  and the measured exit fires at an *absolute* 14900, so the copy has to be
  typed out by then — **9 characters is the hard ceiling**, and the beat ships 8.
  Longer copy leaves the line half-typed when the exit takes it, which is what
  an 11-character draft did.

**Replaceable — this is the retarget surface:**

- Every copy-bearing scene carries a `role` (`brand` ×19, `product-voice` ×10).
  Rewrite per the Copy roles table in `src/lib/textcards/README.md`, keeping
  character counts close to the placeholder copy so the tuned sizes and cadences
  hold. The three-beat refrain — **"Ask once" / "See everything" / "and go
  further than ever"** — is one escalating sentence broken across 20 seconds;
  replace all three or none. Both single-glyph italics in the third line (the
  *u* of "further", the *e* of "ever") and the italic *o* in "y*o*u." and
  "d*o*ts" are the film's one typographic tic — keep one per line.
- The noun column (`noun-roll.words`): swap the five nouns, keep the count and
  the short → long → short width cadence (4 / 7 / 9 / 7 / 4 characters here).
- **The ten fillable windows**, indexed `slot 1` … `slot 10` in film order. Each
  carries a short on-screen `label` and a long **`_fill` note** holding the
  measured description of what the window does and what belongs in it. Set `src`
  (and `clip`) on a scene to play footage inside the window — that is strongly
  preferred over compositing afterwards, because the footage then rides the same
  `keys` track and is cut by the live corner radius and lit by the same shadow.
- `aperture-mark.png` — the film's **only** image asset, shipped in this folder.
  It is the mark that opens the film at 0.9s and the mark in the closing lockup.
  The config reaches it as `../../../templates/aspen/aperture-mark.png`, which
  the browser resolves relative to `src/lib/textcards/index.html` — keep the path
  repo-relative so the template renders from a fresh clone with nothing fetched.
- The closing lockup (`aspen-lockup`) is mark + wordmark laid out as one
  self-centring group, so any brand name works untuned. `markW` is ignored when
  `markSvg` is set (the mark is drawn square at `markH`); `markGap` is a fraction
  of `markH`, so the lockup holds its proportions at any size.

## Known caveats (honest limits of the rebuild)

- **Orbs render flatter than the reference's glassy spheres.** The reference
  orbs are refractive glass with internal highlights and visible caustics; the
  `orb-roll` gradient orbs match the paths, radii and the teal → orange → red →
  dark skin walk, but not the material. This is the most obvious difference at a
  glance and the first thing worth fixing.
- **The starfield is sparser than the reference's.** `cosmic-backdrop` draws
  1400 stars over the 60.9–70.4s close; the reference's field is denser and has
  a faint nebular wash behind it. The rotation and slow zoom match; the sky is
  thinner.
- **The windows need transform-matched compositing.** Roughly 40 seconds of the
  film is window territory, and those windows are choreographed — they rise
  blurred from the bottom edge, punch to near-full-bleed, pull back to an exact
  home rect, slide off left, fly straight up out of frame. Footage dropped on
  top with a static `overlay` filter **will not track them**. Set `src` on the
  scene and let the engine composite inside the window, or drive your own
  compositing through the same `keys` track. Only slot 9 (`product-slot`) owns
  the whole frame and can take a plain overlay.
- **With no footage in it, the carousel's full-bleed hold is a near-white
  frame.** Slot 7 punches to full bleed at 33.66 and holds 1.7s; the window face
  and the cream ground are within four levels of each other, so an empty hero
  reads as a blank frame with a dashed box in it. It is the beat that most needs
  filling, and it looks worse empty than any other window in the film.
- **`_film`'s note is inherited from the rebuild** and still describes the
  reference's own section names. It is provenance, not instruction; `_sections`
  and `_about` are the current ones.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/aspen/template.json
node src/lib/textcards/render.mjs --out aspen.mp4 --fps 25
```

To retarget it to a real product, follow `templates/README.md`.
