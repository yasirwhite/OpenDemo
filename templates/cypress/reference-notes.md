# cypress: reference measurements

Measured off the **Claude Meetings launch film** (62.54 s, 1920x1080 @24fps,
1501 frames) on 2026-11-14.

- Every frame was decoded to stage size (1280x720), named by source frame:
  `f0` = 0.00 s, `fN` = N/24 s. Stage px = reference px / 1.5.
- Scripts, frame dumps and compare sheets live in the night's scratch build
  (`.demo-build/nightly/2026-11-14/`, not committed).
- Each preset file opens with its own measurement block, and its curves cite
  the frames they were read from. This file is the map.

| section | frames | ms | presets |
|---|---|---|---|
| S1 call, hello, title | f0 – f354 | 0 – 14792 | `cypress-call-grid`, `cypress-agent-hello`, `cypress-title-card`, `cypress-voice-bubble`, `cypress-reply-bubble` |
| S2 whiteboard build | f355 – f708 | 14792 – 29542 | `cypress-tile-iris`, `cypress-whiteboard`, `cypress-claim-voice` |
| S3 sort, votes, chat | f709 – f1136 | 29542 – 47375 | `cypress-organize-tile`, `cypress-sort-board`, `cypress-chat-stack` |
| S4 doc, tagline, end | f1137 – f1500 | 47375 – 62542 | `cypress-notes-doc`, `cypress-swap-line`, `cypress-endcard` |

## Cuts

Scene-detect (scene score > 0.08 on a 320x180 decode) separates real cuts
from reflows:

- **Hard cuts (score 1.0):** f226, f355, f709, f757 and f1137, plus f179
  (0.41).
- **Reflows, not cuts:** f6, f14, f24 and f32 are grid reflows inside one
  shot. Each tile lerps old → new on an o3 ease, and newcomers fade in place.
- **Pixel iris:** f410 – f417. It opens one 42.67 px ring per frame, with a
  leading ring of 50% paper.
- **Vertical whip blurs:** f941 – f944 (board → chat) and f1240 – f1245
  (doc → cream). Both read as streaks: scene scores 0.17 / 0.57 / 0.17.
- **Line fade:** the tagline fades out word by word, left to right, from
  f1398. The cut to the end card is at f1412.

## Palette (sampled)

| what | rgb | where |
|---|---|---|
| call ground, chat ground | 0,1,0 | f100, f1000 corners |
| tile body, bubble body | 21,23,20 | f210, f330 |
| name chip | 7,9,6 | f210 |
| agent coral | 208,111,87 | f390 blob core |
| paper | 250,249,244 | f330, f600 |
| claim-2 cream (darker) | 236,236,226 | f640 |
| notes: blue / lilac / peach / yellow / green | 193,226,243 / 227,217,244 / 248,211,193 / 248,235,167 / 214,240,201 | f600 |

## Shot notes

- **Call grid.** Tiles are aspect 0.729, with 7 px gaps and an 8 px radius.
  Seven layouts are keyed (f0, f4, f11, f21, f29, f37, f121).
  - The 7th slot traces a dashed outline clockwise from the top-right
    (f121–f128) and fills dark (f129–f136).
  - The blob pops in f143–f149, peaking at 84 px and settling to 77, then
    shrinks on threes to 42 px by f176.
- **Close-up.** It is the same world under a camera centred on the agent
  tile at x2.097, creeping linearly to x2.548 by f225. The glyph animates on
  twos, and the rays grow centre → inner pair → outer pair (f201–f213).
- **Title.** The push carries through the cut: x0.684 at f226 eases to a
  creep of about 1% per 10 frames, then accelerates from f340.
  - The voice bubble enters at f250, 39 px low at 0.59 opacity, and settles
    exponentially by f268.
  - The reply bubble cuts in at f306.
  - From f336 the bubbles scale faster than the title and fly at the camera.
- **Whiteboard.** The world is the stage at f604.
  - Zoom runs .9375 at f424 → 1.0 at f496, then pushes to 1.079 at f619.
  - The board pans up 77 px (f500–f516).
  - The heading types f518–f538, with fresh characters coral.
  - 17 notes each pop 16% oversized with the corner folded back, then
    settle.
  - Five name-tag cursors enter as arrows whose pill grows out of a dot.
- **Sort.** The camera was solved per frame by registration chained from
  f830: a pull-back f757–f830, a tilt up to ~f866, then a push and pan right
  to f905.
  - Notes shrink from 155 to 140 px as they land.
  - Panels re-lay out on single frames (f793, f804/f812, f816).
  - The docked window drops a check mark f845–f875.
- **Chat.** Cards are 840 px wide (x 220–1060) with 106 px avatars, a
  65 px line pitch and a 33 px gap. Each new message is one 11-frame scroll
  step, with the newcomer riding in late from below.
  - The request cuts in alone after two black frames (f1089–f1090).
- **Doc.** The agent tag flies in at 3.86x and lands by f1151. "Next steps"
  types f1161–f1174.
  - Content is pushed down 523 px by f1186 while the card grows.
  - The camera pushes 1.0 → 1.5 over f1186–f1217, and the page whips from
    f1227.
- **Tagline.** First-word swaps land on hard frames at f1294, f1313 and
  f1330. The selection clears at f1345. The viewer cursor glides in
  f1351–f1372 and its reaction bubble widens at f1370, f1381 and f1389.
- **End card.** The dot appears at f1412–f1413 and blooms into the mark.
  The wordmark types one letter per frame from f1428 (each letter lands
  grey, then turns to ink) while the lockup re-centres.
