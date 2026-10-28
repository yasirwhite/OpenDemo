# fir

A ~66-second **AI-agent launch film**: brand lockup on black → a floating
mobile chat card over grainy lavender answering "track my order" (with a map
card and a popped-out answer bubble that cycles four languages) → a split-screen
second scenario ("update my booking") beside an emoji flow diagram → the chat
card hands over to a 2×2 team of person-at-laptop emojis → a routing diagram
that picks one specialist with a bold elbow arrow → coral border highlights →
white flash, hard cut to black, closing lockup. Flat 2D, diagram-led, chat-UI
heavy — the demo-est template in the set.

## Provenance

Derived from **Intercom's "Meet Fin 2" launch film** (66.2s, 1080p, 60fps
source; graphics authored at 24fps inside the 60fps container for scenes 1 and
7, 60fps elsewhere). Rebuilt scene-by-scene by seven measurement passes and
integrated 2026-09-08; every timing, key list, easing, colour and ground stop
in `template.json` was measured off full 60fps decodes of that film (the
pre-extracted 10fps frame dump carries non-constant timing offsets and was
never trusted for timing — see `reference-notes.md`).

**This worked example still carries the reference's own brand and copy**
("intercom" wordmark, "Fin" agent, its demo dialogue) because the template is
verified by side-by-side comparison against the reference. Retargeting =
swapping the surfaces below; the timings are the template.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/fir/template.json
node src/lib/textcards/render.mjs --out fin.mp4 --fps 60
```

The film-clock is 60fps and several beats are frame-exact against it (the
62.233s white flash is exactly 3 frames) — render at `--fps 60`, not less.

## The presets (registered from `templates/fir/presets/`)

| slug | owns |
|---|---|
| `fir-lockup` | both black bookends: mark pop-in/shrink-in, glyph draw-on, lockup expansion (tail-reveal opener / head-reveal outro), exit crossfade |
| `fir-ground` | the whole ground: measured lavender profile with horizontal falloff + two-polarity grain, the painterly right panel (cut in / pushed off), the flat white panel and its compression, the coral inset borders |
| `fir-chat-card` | the chat card: measured rise-with-overshoot, thread items at measured card-local y, popouts (grow to a fixed frame rect, language swaps, return), slide right, exit down with motion blur |
| `fir-emoji-flow` | the diagram layer: emoji nodes, the Fin mark tile (detach-from-avatar travel, mouth pulse, compression slide), routing tile, labels, growing connectors, the swept-alpha handover arrow, ghost + filled elbow pick arrows, four person emojis (entry reveal, breath, column re-form, pick swell) |

Parameter documentation lives in `templates/fir/presets/index.jsx` (the
authoritative `params` blocks) — same shape as every other textcards preset.

## Fixed vs replaceable

**Fixed — do not touch when retargeting:**

- Every `startMs`/`durationMs`, every `keys` list, every easing/bezier, the
  ground `profile`, panel edge keys, border cues, and the config-level `ground`
  stops (`62233` white / `62283` black — the flash is frame-exact).
- The scene architecture: ONE `fir-ground` scene (3150→62230), ONE
  `fir-emoji-flow` scene (17150→62230), two `fir-chat-card` instances that hand
  over at 17140 with the card at home and an empty thread. Both shared scenes
  MUST end at 62230 or they cover the white flash.
- `video`: 1280×720 stage @ 60fps, 66215ms.
- The measured mark geometry (`glyph` blocks on the mark tiles, and
  `MARK_GEOM_MEASURED` inside the chat card) — it is the same logo at every
  size in the film.

**Replaceable — the retarget surface:**

- **Brand**: `wordmark.text` on both `fir-lockup` scenes (any short lowercase
  wordmark; `size`/`tracking`/`inkWidth` were fitted to "intercom" at Segoe UI
  Semibold — re-measure `inkWidth`/`lockupLeft`/`lockupRight` if the name's
  width differs by more than ~10%), plus `markBg`/`markFg`. The five-bar comb
  mark itself is drawn in `fir-lockup.jsx` (`IntercomMark`) — swap that
  component's geometry for another brand's mark.
- **Agent identity**: `header` (`name`/`sub`/`chip`) and `mark` colours on both
  chat-card scenes; the mark tile's `bg`/`fg` in the flow elements.
- **Chat transcript** (`role: product-voice` dialogue): every item's
  `text`/`paras` in both card scenes, the map card's `steps`/`pill`, the
  `source`/`footer` labels on the answer card, the `options` pills. Line breaks
  are AUTHORED (`whiteSpace: pre`) — keep line counts and rough widths, or
  re-measure the popout rects.
- **Languages**: `popouts[0].langs` on the first card scene — four states
  (EN/ES/DE/ZH in the example), each with `outAtMs`/`inAtMs` cues. Swap the
  translations, keep the cue rhythm.
- **Diagram labels**: the two `label` elements ("Customer", "Fin 2") in the
  flow scene.
- **Team/emoji casting**: `char` on the emoji nodes (🤔), the four `person`
  elements' `chars` (person-at-laptop set), the 🐝 in "I'm on it!".
- **Ground palette**: `profile` colours + `base` (the lavender), the painterly
  panel's `palette.stops`/`blobs`, the coral `borders[].colour`.

## VO cue map (from the reference's captions, `fin2.en.vtt`)

The reference carries a professional female VO; the beats land on scene
boundaries. If you record a replacement voiceover, hit these windows:

| film s | line | on screen |
|---|---|---|
| 3.9–8.9 | "Fin 2 is the first AI agent to deliver human-quality customer service, handling…" | card rises, first question |
| 8.9–13.3 | "…all of your frontline support and giving your customers safe, accurate and…" | answer + map land |
| 13.3–18.5 | "…personalized answers in over 45 languages." | answer pops out, language cycle |
| 17.7–23.5 | "When a customer sends a question, Fin 2 responds right away, using…" | split, second scenario |
| 23.5–30.5 | "…your support content and policies to generate answers, fetching or updating customer data, all in your tone of voice…" | grounded answer, popouts |
| 30.5–35.5 | "…and only handing over to your team when it can't resolve the issue." | card exits, team appears |
| 35.5–44.6 | "This way a huge proportion of your support volume is resolved by Fin, giving your team the time to provide personal and attentive support…" | diagram hold, tile pulse, team breath |
| 44.6–47.5 | "…to the customers who really need it. Everybody wins." | hold |
| 47.5–55.6 | "And even better: if Fin does need to hand over to human support, it can use the context it's gathered during the conversation to route it straight to the right team…" | compression, routing, pick arrow |
| 55.6–60.1 | "…ensuring your customers get a seamless experience while moving from automated…" | pick swell, border 1 |
| 60.1–63.8 | "…to human support." | border 2, flash, outro |

## Known caveats (honest limits of the rebuild)

- **Emoji artwork is Segoe UI Emoji (Fluent), not Apple's.** Every glyph
  renders (no tofu), sizes/positions/motion are calibrated to the reference,
  but the drawings differ — most visible on the big 🤔 (3D staring face vs
  Apple's flat side-eye) and the person-at-laptop set (purple laptops).
  Fixing this needs a shipped emoji font/bitmap set.
- **The wordmark typeface is a substitute** (Segoe UI Semibold + 1.4px stroke).
  X-height, total ink width and stem weight match the reference exactly;
  individual letter widths drift up to 9px@1920 mid-word. Visible at 3× zoom.
- **The painterly right panel is a gradient approximation**, mean-matched to
  the reference's Monet-ish landscape but without brush texture, clouds or the
  figure in the field. Reads correct in tone, synthetic in texture.
- **The lavender ground is a model, not a plate**: measured vertical profile ×
  horizontal falloff + two turbulence layers. The reference's diagonal cloudy
  washes and heavier film grain are only approximated; its texture reads
  smoother here.
- **Motion blur is CSS**: the card rise/exit use a Y-only gaussian and the
  slide uses a small isotropic blur where the reference has real shutter smear
  (~50 stage px at peak). Reads as motion, softer than the real smear.
- **Scenes 1/7 graphics run smooth at 60fps** where the reference holds each
  24fps content frame 2–3 display frames. Matched exactly at content-frame
  times; a straight frame-diff mid-move shows the interpolation.

To retarget to a real product, follow `templates/README.md`.
