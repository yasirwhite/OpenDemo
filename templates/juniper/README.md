# juniper

A 60-second **multi-device launch film for a product that builds apps**. It
opens on a title stack over three phones, then a hard push-in cuts to a toggle
pill. A cursor flips the pill on, it blooms into a glowing tier word, and six
one-word flashes ("can make beautiful real apps for …") zoom down into a
kinetic device label as a phone whips in.

The spine is a run of device comps on a flat off-white ground. Each one is a
labelled app slot inside a drawn device beside a two-line label
("Virtual pet with live updates / for ◆ Phone"):

- four phone apps, cut hard with a white screen flash
- a phone-to-watch morph, then two watch apps
- watch to tablet: the label travels to top centre while the tablet rises
- tablet to TV to headset: the devices recede and grow in, the device word
  rolls vertically, and the headset window pulls back

A dark app-builder window follows:

- "One click to install apps", a push-in to its toolbar, "no $99 dev account /
  no IDE setup" and a "Signing" status
- a phone whips in with a home-screen grid, installs and launches the app, and
  a toast confirms it
- "Two clicks to ship to the store": a cursor opens and confirms a Publish
  popover

It closes on "If your device can do it, / Juniper Max can build it", a
zoom-dissolve into a 13-card bento feature grid on grey, and an end card that
collapses to the brand mark and URL.

Choose it for products whose output runs on many devices: app builders,
cross-platform frameworks, design-to-code tools, device ecosystems. It also
fits any launch that wants to show a tier upgrade ("… Max", "… Pro") and then a
tour of what the product makes. It needs footage for the app screens. Every
screen is a labelled slot inside a drawn device, so it works with mock UI as
well as with recordings.

The placeholder product is **Juniper Max** (`juniper.example`), "an AI that
builds apps for every device".

## Provenance

Derived from the **Rork Max launch film**, posted 2026-02-19 by @rork at
[x.com/rork/status/2024570781330792896](https://x.com/rork/status/2024570781330792896).
Re-checked on 2026-11-03 (fxtwitter API), it had **8,615,998 views, 17,637
likes and 23,248 bookmarks** on a 59.2k-follower account: about 145x the
follower count, with no big-brand halo. It was first vetted as an accept on
2026-08-05. The dated record is in `references/launch-scouting.json`, and the
manifest entry (`rork-max`, md5 only, media not committed) is in
`references/references.json`.

It was rebuilt **frame-by-frame on 2026-11-03**. The 60fps master was
resampled to a 30fps clock at stage size (stage px = reference px / 1.5), and
six parallel section passes traced every beat off full-decode frames. Positions,
per-frame motion tables, easings, colour ramps, cut frames and type sizes are
all measured. The sections were then assembled and compared side by side
against the reference. The copy, brand mark, device names and every
third-party mark were replaced with the fictional product above. No reference
media is committed. `reference-notes.md` has the measurements per section and
the assembly pass's changes.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/juniper/template.json
node src/lib/textcards/render.mjs --out juniper.mp4 --fps 30 --scale 1.5
```

Render at **30fps**: most motion replays per-frame tables measured on a 30fps
clock. The film is authored on the 1280x720 stage. `--scale 1.5` renders that
stage at device scale 1.5, which gives the 1920x1080 film the config declares.
Type and vectors are drawn at full resolution, not upscaled. Leave `--scale`
off for a 1280x720 proof. If someone else may be rendering from the same
checkout, render from a private stage: snapshot `index.html` +
`dist/bundle.js` and pass `--html` (see `src/lib/textcards/README.md`).

## What is fixed and what is replaceable

**Fixed (the template):**

- every `startMs` / `durationMs` and every cut frame: the hard cuts at 3.933s,
  36.133s and 47.067s, the word flashes at 6.067–7.033s, and the app cuts
  inside each device beat
- the motion tables: the push-ins, the phone and device whips, the morphs and
  label rolls, the builder-window zoom and pull-backs, the cursor paths, and the
  bento entry and exit
- the grounds: off-white `[254,255,253]`, the bento grey `[234,236,233]`, and the
  warm bloom behind the tier word
- the tier gradient (yellow `[240,218,119]` to orange `[228,147,80]`) and the
  grey-to-ink headline entry

If copy does not fit a beat, shorten the copy, not the beat.

**Replaceable:**

- **Copy.** Every text scene carries a `role`:
  - `brand`: the title stack, the pill, the word flashes, the builder
    headlines, the claim and the end card. Replace wholesale.
  - `feature`: the device labels (the app name over "for ◆ Device") and the
    bento card titles. Swap the words and keep the count.
  - `product-voice`: the builder window (chat summary, toolbar and status
    pills, toast, Publish popover) and the headset window title. This is the
    product talking inside a demo, so keep the voice and swap the specifics
    (the app name, "Maya's Phone", the share URL).

  Labels and headlines are laid out with flex and measured text, so words of a
  different length reflow. The side label is right-aligned and re-aligns to
  the new device word as it rolls. Check every beat after a retarget anyway.
- **Product slots.** These are labelled placeholder faces inside drawn devices:
  - the three phones under the title stack
  - the ten phone, watch, tablet, TV and headset apps
  - the builder's preview phone and the installed app
  - the bento widget phone and the device-family minis

  16 labelled slots in all. Each one is drawn inside its device and follows the
  measured device motion. To use real screens, replace the slot face in the
  section preset, or composite footage over the rendered film for the slots
  that hold still.
- **Drawn stand-ins.** Restyle these to the real product:
  - the brand mark: `JuniperMark`, a filled berry dot in
    `presets/juniper-shared.jsx`
  - `PlatformGlyph`, the neutral platform glyph inline in "for ◆ Phone", "on
    your ◆ device" and "For any ◆ device"
  - the "Powered by" tile, the home-screen grid and the store tiles
    (`AppTile`), and the bento card art (robot, orb, waves, NFC, focus, health
    and home tiles)
  - the device names: Phone, Watch, Tablet, TV, Headset

## Presets

All of juniper's presets live with the template in `presets/`. They register
into the textcards registry through one spread (`JUNIPER_PRESETS`).

- `juniper-shared.jsx`: the shared vocabulary:
  - `juniper-ground`, `kf()` sparse keyframes and the palette `Q`
  - the Lucide line-icon map (`Icon`), the mark, the wordmark and the tier
    gradient
  - app tiles, letter glyphs and cursors
  - the device frames, including the measured `UltraWatch`
- `juniper-s1.jsx` … `juniper-s6.jsx`: one file per section. Each preset is
  documented in its `note`.

These are general enough to reuse in other films:

- `juniper-side-label` and `juniper-device-label`: the kinetic two-line device
  label, with sub-label roll-crossfades, a vertical device-word roll and
  side-to-top travel
- `juniper-device-stage`: device frames with whip, rise, recede and grow morphs
- `juniper-toggle-pill`, `juniper-warm-bloom` and `juniper-max-word`: the tier
  switch
- `juniper-builder-window`: a dark builder app with toolbar, status pill,
  toast and popover
- `juniper-bento`: a nested row/column bento grid on measured gutters

## Known gaps

- **Font.** Segoe UI stands in for the reference's SF-class grotesk. Sizes are
  matched on cap height or x-height, and some widths on tracking, so long words
  ("beautiful") run a little wider and ascenders a little taller.
- **Motion blur.** Push-ins, whips and the zoom-dissolve use directional
  Gaussian blur. The reference's blur is partly radial, so the fastest frames
  smear a little differently.
- **Slots.** All app footage is a labelled slot face tinted like the original
  footage. Motion inside the screens (game footage, the app minimising to the
  home screen at 17.9s) is footage and is not rebuilt.
- **Stand-in art.** The bento orb, robot and strands are drawn stand-ins. They
  move like the reference but are simpler and calmer in colour.
- **Fixed tables.** Many beats replay dense measured tables (camera, cursor
  paths, device morphs). They are exact for these timings, but retiming a beat
  means re-deriving its table.
