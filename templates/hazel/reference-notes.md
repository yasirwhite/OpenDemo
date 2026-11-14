# hazel: reference notes

Reference: the QuiverAI "Introducing Arrow 2" launch film, 43.84 s,
1280x720 @25fps. Frame numbers are 0-based on that 25fps clock
(`ms = frame * 40`). All pixel values are reference pixels. Colours are 6x6 px
averages from full-decode frames. The film is authored on the 1280x720 stage,
so stage px = reference px.

## Beat map

| frames | seconds | beat | preset |
|---|---|---|---|
| 0–5 | 0.00–0.24 | sky field, frosted label pill, thin handle curve | `hazel-sky-pill` (bracket) |
| 6–66 | 0.24–2.68 | panel wipe across one line, tiles | `hazel-live-line` |
| 67–107 | 2.68–4.32 | split: line icons + app window | `hazel-split` |
| 108–144 | 4.32–5.80 | split: halftone mark + dock tile | `hazel-split` |
| 145–187 | 5.80–7.52 | split: technical drawing + sheet | `hazel-split` |
| 188–329 | 7.52–13.20 | word drum, three stops | `hazel-drum` |
| 328–391 | 13.12–15.68 | sky field, thick easing curve | `hazel-sky-pill` (scurve) |
| 392–441 | 15.68–17.68 | code over line art, colour bloom | `hazel-code-reveal` |
| 442–497 | 17.68–19.92 | letterforms, pull-back | `hazel-letter-draw` |
| 498–537 | 19.92–21.52 | mark outline, drawn from the head | `hazel-outline-draw` |
| 538–580 | 21.52–23.24 | four-pose strip | `hazel-frame-strip` |
| 581–639 | 23.24–25.60 | mockup montage, 4-frame clock | `hazel-mockups` |
| 640–714 | 25.60–28.60 | table of work | `hazel-table` |
| 715–756 | 28.60–30.28 | prompt typed in composer | `hazel-composer` |
| 757–813 | 30.28–32.56 | picture builds, three variant cuts | `hazel-generate` |
| 814–845 | 32.56–33.84 | stamps, 4-frame clock | `hazel-stamps` |
| 846–889 | 33.84–35.60 | status line rolling | `hazel-loader` |
| 890–955 | 35.60–38.24 | first claim, tiles | `hazel-claim` |
| 956–1019 | 38.24–40.80 | second claim, face swap | `hazel-swap-line` |
| 1020–1095 | 40.80–43.84 | wordmark | `hazel-wordmark` |

Hard cuts from a per-frame diff trace on 160x90 frames: 6, 67, 108, 145, 188,
392, 442, 581, 585, 589, 593, 597, 601, 605, 609, 613, 617, 621, 623, 640, 691,
715, 757, 791, 799, 808, 814, 818, 822, 826, 830, 834, 838, 842, 846. Beats
that dissolve instead: drum to sky (f328–336), and the claims (f952–958,
f1020–1024).

## Measurements by beat

**Sky field.** Blue field with diagonal pale streaks: top-left [82,125,187],
mid [95,136,199], low centre [147,172,212] at f3; [107,155,201] / [155,172,197]
at f360. Streaks drift by about 1 px per frame.

**Pill.** x 470–810, y 310–410 at f3, radius 8, white at ~22%. At the second
sky beat it enters at f340 and grows 1.00 → 1.14 linearly to f391.

**Panel wipe.** Pale panel [232,241,248], y 120–566, left edge decelerating
830 (f7) → 770 → 685 → 600 → 540 → 486 (f61–66). Text spans x 487–812 (34 px
cap) on the panel. The panel is the mask: text is pale outside it and dark
inside, so the edge does the reveal. Grid lines [221,234,245], pitch 62.

**Splits.** Hard edge at x=640. Left pane [246,246,246]. App window at x 808,
y 46, radius 26; rows 100 px apart, 58 px type, on blue [122,164,226]. Dock:
band [36,40,47], y 104–624; app tile 320 px, radius 66, at x 812.

**Drum.** Word pitch 132 px, marker centred y 354. Grey words [205,206,208],
selected [36,42,61] at about 1.2x size. The roll passes four words in ~24
frames, heavily blurred, then steps one word in ~4 frames at f252 and f280.
Box handles white with blue rings. Stop 2 flanks the word with six dark icons;
stop 3 has three tiles.

**Colour bloom.** Art fills x 134–1146. Code panel x 324–956, y 184–536,
[58,60,54]. Bloom starts f416 at the top centre and covers the picture by
f436, soft-edged.

**Letterforms.** Huge scale (s ≈ 2.7) drifting across the word, then a 4-frame
pull-back (f472–476) to the whole word. Stroke [150,176,214], about 1.3 px.
Bottom bar rises at f476; caption enters f494. Hazel's word comes from a glyph
table read from the installed Georgia Italic.

**Strip.** Four poses start at f538, f546, f554, f563, each filling royal blue
[8,16,196] about 4 frames later.

**Table.** Ground [222,221,215] to [232,231,229] at centre. Flicker tile
(x 558, y 97, 338x388) alternates line/colour on a 3-frame clock, f641–656.
Big mark f659–665, outline for 3 frames then solid. Final mosaic tile
rectangles measured from f700, with a hairline outlined numeral drawing on
at f698–710.

**Composer.** Panel x 64–978, composer x 90–950, y 490–650, send button
[44,108,230]. Prompt types 1 char/frame from f718.

**Generate.** Picture x 921–1280, y 64–558, builds in layers over 30 frames.
Variants cut at f791, f799, f808. Status line rolls on a 9-frame clock.

**Claims.** 50 px type centred on y ≈ 360. The swap line cuts its last phrase
through three faces on an 8-frame clock (f980–1004), then back to regular.

## What was changed by design

- Mark: a swift, a filbert glyph. Hero illustration: a lighthouse, motifs:
  flower pots. All drawn in code, none traced from the reference.
- Copy rewritten throughout. Words such as the scope list are ordinary
  category names and are configurable.
- Live-action frames in the reference (a hand holding a leaflet, a phone in
  hand) are drawn stand-ins here, so the film has no people in it.
