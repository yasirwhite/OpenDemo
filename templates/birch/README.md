# birch

A ~59-second kinetic-typography launch film for a **brand engine** — a product
you point at a domain, which reads the site, extracts the brand, and then
generates any on-brand asset from a prompt. Serif claims on white cooling
through gradient sweeps, an orb loader, card-framed product screens over
painterly grounds, three prompt→poster loops, and a still lockup close.

The placeholder product is **Birch** (`birch.studio`), named after the
template. Three fictional *customer* brands live inside the demo scenario —
**Lantern** (a maker marketplace, the site the film reads), **Ashvale** (a
coffee roaster) and **Quarry** (a hardware residency).

## Provenance

Derived from the **Bloom launch film** — "World's first on-brand AI" design
tool — posted by its founder at
[x.com/rincidium/status/1995946528343818656](https://x.com/rincidium/status/1995946528343818656):
**~1.5M views** (1,498,794 views / 5,814 likes / 7,516 bookmarks, measured
2026-08-05) from a **6,305-follower** account. That ratio is why it was
picked: the spread is craft-driven, with no brand halo to discount.

Rebuilt frame-by-frame on **2026-08-05/06** and human-approved against the
reference. Every timing, ground stop, camera key, window track and easing in
`template.json` was measured off that film at its native **25fps**; the copy
and brand were then replaced with the fictional product above. No reference
media is committed — only the measured config.

## Fixed vs replaceable

**Fixed — do not touch when retargeting:**

- `startMs` / `durationMs` on every scene, the whole `ground` timeline, every
  `camera` block, every media-window `keys` track, every orb `keys` track, all
  easings. These *are* the template.
- The act structure (see `_acts` in the config): opener → the ask → the read →
  the evidence → the turn → the loop ×3 → the closer.
- `video`: 1280x720 @ **25fps** (the reference's native rate — render with
  `--fps 25`, not 60).
- The two hand-centred lockups. `closer-url-at`/`closer-url-domain` and
  `closer-logo-mark`/`closer-wordmark` are pairs of separate scenes that have
  to read as one line, so their `cx` / `camera.keys[0].x` are *measured*
  constants, not layout. Changing the product name or the domain means
  re-measuring them (ink width of each half, 23px clear between 'at' and the
  domain centred on 638; 17px clear between mark and wordmark centred on 646).

**Replaceable — this is the retarget surface:**

- Every text scene carries a `role` (`brand` ×18, `product-voice` ×12,
  `user-voice` ×2). Rewrite per the Copy roles table in
  `src/lib/textcards/README.md`, keeping character counts close to the
  placeholder copy so the tuned sizes and typing cadences hold. The typed
  domain in `extract-input` is fitted to **11 characters**.
- The three `media-window` scenes (13.68–21.52s, 20.92–23.64s, 23.48–25.73s)
  are the footage windows. They ship with **drawn interiors** rather than
  dashed placeholders, so the whole cut reviews before any footage exists.
  Footage dropped into them must be driven through the SAME `keys` track — the
  windows glide, hold and punch, and a static overlay will not track them.
- The interiors' brand fields. `extract-site-comp.interior` (`site-page`) and
  `extract-kit-comp.interior` (`brand-sheet`) each carry a `brand` block —
  name, domain, accents, ink, paper — plus their own copy. Swap those and the
  customer changes without touching a timing.
- The three `poster-reveal` scenes: `wordmark`, `lines`, `caption` and the
  palette are parameters; the rects, reveals and pixel-sort dissolves are not.
- `aperture-mark.png` — the film's **only** image asset, shipped in this
  folder. It is the product's mark on the end card, the mark on every
  generated poster, and the shape of both drift layers. Swapping that one file
  re-brands the whole film. The config reaches it as
  `../../../templates/birch/aperture-mark.png`, which the browser resolves
  relative to `src/lib/textcards/index.html` — keep the path repo-relative so
  the template renders from a fresh clone with nothing else fetched.

## Known caveats (honest limits of the rebuild)

- **System serif, not the reference's brand font.** The reference sets its
  claims in a rounded custom serif; this rebuild uses
  `Georgia, 'Times New Roman', serif`. The rhythm, sizes and the pink→ink
  gradient sweep match, but the letterforms are visibly a stand-in — this is
  the most obvious difference at a glance and the first thing worth fixing if
  a licensed face is available.
- **The painterly grounds are approximated as two-tone gradients.** Behind the
  card-framed screens (13.7–25.3s) the reference paints soft, brushy colour
  fields; here they are two-stop linear gradients with matched hues and
  timings. Close in colour and cadence, flatter in texture.
- **The mark is a rasterised aperture, not the reference's floral motif.** The
  original's decorative layers are airbrushed blossoms; the template carries
  one brand mark through the same choreography instead, which is what makes
  the layer retargetable at all.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/birch/template.json
node src/lib/textcards/render.mjs --out birch.mp4 --fps 25
```

To retarget it to a real product, follow `templates/README.md`.
