# Reference notes — Intercom "Meet Fin 2" launch film (66.2s, 1920×1080, 60fps)

Per-reference notes in the format of `docs/reference-matching.md`'s closing
sections (kept here rather than appended there, per the integration brief).
Rebuilt as the `fir` template, 2026-09-08, from seven scene-level measurement
passes plus an integration pass. Scene scratch (decodes, traces, probes,
compare sheets) lives under `templates/fir/work/`.

## Timebase — three separate traps in one file

- The pre-extracted 10fps dump (`fin2-frames/fNNNN.jpg`) is NOT `NNNN/10`s:
  offsets are **non-constant**, ~0.05–0.14s ahead depending on the segment
  (f0192 is byte-identical to the 60fps frame at 19.05s; f0535 is really
  ~53.35s). Exactly the trap section 7 of the method doc warns about. Every
  timing here came from full 60fps decodes of the mp4.
- The container's first frame has pts 0.0143s, so film t = pts − 0.0143, and
  the renderer's frame k (drawn at t = k/60) corresponds to **source frame
  n = k** — address reference frames by index (`select=eq(n\,N)`), never by
  `-ss` (a pre-2016 ffmpeg on PATH also mis-seeks `-ss` before `-i`).
- Scenes 1 and 7's graphics are authored at **24fps telecined into 60** (3:2
  frame holds); only their exit/enter dissolves are 60fps. Content-frame times
  are display times. We render smooth at 60.

## Film grammar

- 7 scenes: logo-open (0–3.4) → chat "track my order" (3.4–17.2) →
  split "update my booking" (17.2–30.8) → handover-to-team (30.8–48.2) →
  routing (48.2–59.2) → platform-highlight borders (59.2–62.3) →
  outro lockup (62.3–66.2, ends with no fade).
- ONE ground runs the whole mid-film: grainy lavender, dead still (per-frame
  |dLuma| 0.000–0.005 over 31.5–48.4s — no band drift anywhere it was
  measurable). Its pale top plateau and pale bottom band exist only at the
  LEFT; by x≈900@1920 both decay to the dark mid violet. Panels enter as
  events: the painterly landscape cuts in on ONE frame (17.233), is PUSHED off
  by the white panel (30.80–31.32, texture cross-correlation proves push, not
  wipe), the white panel's edge compresses right 48.29–49.15, coral inset
  borders crossfade on/off linearly over exactly 18 frames each way
  (58.983–62.133), then a 3-frame pure-white flash (62.233) and a hard cut to
  black + the outro mark already at its largest (62.283).
- The film's emphasis move is the POPOUT: a thread bubble grows out of the
  card to a FIXED frame-space rect at ~1.6× type, holds, returns. Four of
  them, each with its own asymmetric progress curve; the popped box never
  resizes between language states (2-line Chinese top-aligns in the 3-line
  rect).
- Only the LAST bot message row ever keeps its avatar; the avatar is one
  travelling element that hops to the newest row. At the split, the card's
  bottom-left avatar IS the mark tile: it detaches and becomes the diagram
  node (×3.62 scale, travel mostly vertical, inout pow 2.3).
- Every fade in the diagram scenes is measured as a MEAN-LUMINANCE ramp; a
  thresholded pixel count reads 100–400ms late because it only fires near full
  opacity.

## Measured mechanisms worth stealing

- **Logo pop** (0.567s): first frame 1.37× at ~55% alpha, next frame 1.25× at
  full — an exponential settle (τ≈96ms), not a fade, not an ease. The glyph
  draws on while the tile settles (bars scale vertically about their OWN
  centres, centre-first stagger; smile reveals centre-out).
- **Lockup expansion**: the mark slides left on one bezier while the wordmark
  emerges through a soft mask whose ramp collapses as it settles. The opener
  reveals TAIL-first (rigid wordmark sliding right from behind the mark:
  "m"→"com"→"ercom"); the outro reveals HEAD-first (pinned wordmark, window
  opening rightward: "i"→"int"→"interco"). The bookends are NOT the same move
  reversed, and the outro's shrink is a measured cubic-bezier about a pivot
  11.8% BELOW the tile centre — not the opener's exponential.
- **Card rise** (3.400–3.98): bottom-entry, ~160px@1080/frame peak with real
  shutter smear (~80px@1080), overshoot to top=15@1080 at 3.600, undershoot,
  home. Re-measured at integration with an alpha-0.5 edge probe (symmetric-blur
  immune): the first measurement pass ran ~1.2 frames late through the early
  rise — probe the EDGE CENTRE, not a brightness threshold, on smeared motion.
- **Language cycle**: each swap is fade-out → ~130ms BLANK → fade-in (115ms
  each), text only, bubble holds. The last language PERSISTS in the thread
  after the popout returns.
- **Handover arrow** (31.09–31.48): does not grow. Full geometry from the
  start; a 272px@1920 LINEAR alpha ramp sweeps across it at constant 2104px/s.
- **Tile pulse** (38.0–39.4): whole-tile uniform scale ×1.14 about its centre,
  mouth shape constant. **Team breath** (39.05–43.93): one ×1.125 scale about
  a shared origin between the four (identities never crossfade — byte-identical
  before/after).
- **Routing ghosts**: the three unpicked routes are the SAME fat elbow outline
  as the picked one, dash-stroked (2px, 3-on/3-off @1920) — which is why they
  read as one bracket along the shared riser. The pick arrow rises in 44ms,
  runs at 2473px/s near-linear, grows its head out of the bar end in the last
  2 frames, and the picked person swells ×1.17 a second later.
- **Borders**: opacity fades of a constant-geometry inset stroke (full 27px
  width already present at alpha 0.48). b1's fade-out ends on the exact frame
  b2's fade-in begins.

## Integration corrections (what the scene passes got wrong)

- Scene 2's card-rise keys were re-authored from exact-index frames (onset
  3.400 not 3.417; front-loaded curve). Everything else in that pass verified.
- The ground was assembled from scene 3's vertical profile + a horizontal
  falloff mask + a dark grain layer under the panels (the reference grain is
  bidirectional; a white-only turbulence layer can only lighten). Calibrated
  against rendered-vs-reference grids at t=10/41/57 to ±10 per channel.
- The segmenter's notes were wrong in ~15 documented places (popout duration
  ×2.5, exits up vs down, wipes vs pushes, crossfades vs scale-breaths, border
  "instant" vs 300ms fades…). Every one was caught by a full-decode
  measurement pass — never build from a 10fps eyeball.

## Remaining deviations (documented in `templates/fir/README.md` too)

Emoji artwork (Fluent vs Apple), wordmark typeface (Segoe approximation),
painterly panel (gradient, not a painting), ground texture (no diagonal
washes, tamer grain), CSS motion blur (softer than shutter smear), 60fps-smooth
scenes 1/7 vs telecined source, per-letter stem drift at 3× zoom.
