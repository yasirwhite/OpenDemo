# willow — reference notes

What was measured off the reference, and what the config carries. The method is
`docs/reference-matching.md`. These notes are the per-film record.

**Reference:** the Strawberry 1.0 launch film (Strawberry Browser), 90.0s,
1920x1080 @24fps, posted 2026-10-26 by @charles_maddock. The manifest is in
`references/references.json` (id `strawberry`). Media is not committed; fetch it
with `node references/fetch.mjs`.

**Units:** all px are 1280x720 stage px (reference px / 1.5). Frame n is at
t = n/24 s. Everything was measured from full-decode frames, never from a
low-fps dump. The measuring scripts and per-section generators lived in the
build scratch (`.demo-build/`) and are not committed. The numbers they
produced are the dense key tables in `template.json`.

## Film-wide grammar

- **Grounds.** A near-white field (cream `[255,254,250]`) under a static
  halftone grid of alternating shapes. The pitch is 27.07px (40.6px in the
  master; autocorrelation peaks at 41/81/122/162). Shape type cycles circle,
  diamond, square with (col + row) % 3, and every shape is ~13.5px across.
  Strength is a contrast field, not a size field. It is the same in every beat
  sampled: heavy top-right and bottom-left, a full top row, and a clear
  centre. It is embedded per cell in `presets/willow-shared.jsx`.
  Registration across a 1.7s hold finds zero drift. Beats re-tint by hard cut:
  - dreams: blue `[244,247,250]`, dots `[238,243,248]`
  - slides: pink `[252,237,232]`, dots `[248,231,227]`
  - meetings: mint `[242,253,245]`, dots `[235,248,239]`
  - library: lavender `[239,233,245]`
  - testimonials: `[249,241,244]`, dots `[234,222,243]`
  - Some beats drop the halftone entirely.
- **Type.** A heavy neo-grotesk in near-black with one pastel accent per beat;
  the wordmark is a serif. FONT resolves to Segoe UI on Windows. Line widths
  are matched at equal cap height with tracking of about -0.04 to -0.085em.
- **Cadence.** Parts of the film animate on twos or threes, and some footage
  runs at a 20fps cadence inside 24fps. The rebuild interpolates smoothly
  except where stepping is the look (the end card on twos, a few held keys).
- **Cuts.** Hard cuts at f293 (12.208s, a camera continuation), f635, f688,
  f712, f752, f1182, f1216, f1281, f1384, f1641, f1683, f1784, f1847 and f1991.
  Grounds cut with them.

## Section map

| section | range | beats |
|---|---|---|
| S1 | 0.000–12.208 | "You" + character pass, "You have", dreams/plans/goals tint swaps, "You want / to move / fast", runners, "You need a team", wordmark, "The AI team / that works alongside you", crew pill |
| S2 | 12.208–25.375 | ask window pull-back, composer close-up + typing + send, "I've got you!", agent window + tab + people search (slot), outreach card stack, calendar (slot) |
| S3a | 25.375–31.333 | "I'm your companion", "I can do" chip drum, "I work", "in your tabs/apps/docs" drum |
| S4 | 31.333–49.250 | new tab + glyph tiles, slides window (slot), punch to Chat, composer, chat thread with status rows, deck pull-back (slot), meeting toast |
| S5 | 49.250–63.583 | "Transcribe meetings", call window + notetaker pill, companion + bubble stack, "Everyone / on your team / gets a companion", portrait orbit + dock, characters fly off |
| S6 | 63.583–76.958 | library window + role cursors + punch, folder groups, "Works on 1.8 billion websites" + glyph cloud, testimonial cover-flow, "267k companions already created" + avatar lattice |
| S3b | 76.958–90.000 | "Discover" zoom drop, "a new way to work", characters + hand sweep, "Claim your companion today", end card (buttons swap to URL pill) |

## S1 — overture (0.000–12.208s, f0–f292)

The S1 build carries its measurements as the key tables in `template.json` and
in the `note` fields of `presets/willow-s1.jsx`. Its section agent was
interrupted before it wrote a notes file. The orchestrator verified it with
ref | ours stills at 16 timestamps (0.5–12.25s). Beat frames:

- f2–f39: "You" and the red character pass (f8–f43).
- f40–f72: dreams/plans/goals word swaps on tint cuts.
- f73–f105: "You want / to move / fast".
- f99–f133: runners.
- f122–f144: "You need a team".
- f145–f184: wordmark assembly.
- f185–f280: "The AI team / that works alongside you", with the characters at f160–f264.
- f265–f292: crew pill, 3 heads becoming 6 at 11.54s.

The type is elastic:

- Lines enter with squash-and-stretch (scaleY overshoots to ~1.066 while scaleX gives way).
- Fresh letters hop 0.09–0.16em and fall back.
- A pastel highlight runs across newly typed letters and hands back to ink.
- Blocks re-lay by scale and slide.

Inks:

- "The AI team" is dark grey `[40,42,39]`, not black.
- Accents: purple `[151,93,205]`, blue `[129,182,234]`, green `[63,222,90]`, coral `[243,113,90]`.
- "works / alongside / you" are `[129,77,185]` / `[176,88,98]` / `[172,212,64]`.

The last few frames before the f293 cut sit slightly under-zoomed against S2's
pull-back (a seam caveat).


## S2 — 12.208s – 25.375s (f00293 – f00608) — measurements and build notes

All coordinates are 1280x720 stage px. Frame n is at n/24 s. Camera convention used
by every S2 preset: `screen = s * design + (dx, dy)`. Camera/window fits were made
with a gradient-NCC scale+translate search (`fit.py`, template frame noted per beat),
cursors with a colour mask (`cur.py`), mascots with a blue mask (`masc.py`), text
rows/edges with column scans (`probe.py`). Scripts live in the session scratchpad;
the numbers below are what the configs carry (`gen.mjs` holds every table).

### Beat list (frame exact)

| frames | t (s) | beat | mechanism |
|---|---|---|---|
| f293–f311 | 12.208–12.958 | ask window pull-back | camera continues S1's pull-back: s 1.756 -> 1.000 about (638,~165), peak speed f294–f296 (dlog s ≈ .12/frame), then decays x0.76/frame; settled f308. Placeholder "Ask Strawberry..." until f308; hand clicks composer ~f302–f304; "B" typed f310. |
| f312 | 13.000 | HARD CUT to composer close-up | s = 3.057 constant, dx −733 → −935 (expo-out pan, deltas 86, 27, 27, 15, 6, 3 px/frame; settled f325), dy −1100. Hand jumps with the cut (cheat cut, design x 668 → 479). |
| f312–f331 | 13.0–13.79 | prompt types on | chars visible: f312 6, f314 7, f318 8, f319 9, f320 10, f321 11 … f328 18, f330 19, f331 20 (≈1 char/frame = 24 cps after f319). Caret visible f321–f326 only. |
| f339–f350 | 14.125–14.583 | zoom-out | s 3.057 → 1.623: f340 3.037, f341 2.953, f342 2.906, f343 2.741, f344 2.424, f345 1.888, f346 1.738, f347 1.696, f348 1.646, f349 1.630, f350 1.623 (slow start, peak at f344–f345, settles in 5 frames). d follows the same progress (verified: f345 predicted −498/−455 vs fit −495/−457). Window chrome is not seen again after the cut (it would show when the camera pans up; the ref shows none), so the drawn window ends at f312. |
| f350–f366 | 14.583–15.25 | hold, hand to send | hand moves from (577,487) to send (860,510) f343–f352, presses ~f361–f366 (send circle darkens f364–f367). |
| f366–f378 | 15.25–15.75 | companion leaves + pan up | blue mascot leaves the pill at f366 (pill closes up 339 → 309 design px by f371) and dives through the composer; content pans up ease-in: composer top 359, 354, 349, 340, 327, 309, 284, 251, 209, 153, 78 (f367–f377) → Δy = 358·p^2.6 over 11 frames. Hand exits down-right. |
| f379–f398 | 15.79–16.58 | "I've got you!" | bubble [231,241,243], ~375x150 + tail, text 51px/500; centre (831,391) rot +12° at f379 → overshoot (799,213) −11° at f383 → (819,250) −7° f388 → rises out f393–f397 (deltas 16, 27, 40, 58 px/frame). Mascot bbox grows 235x195 → 455x587 (f379–f392) and is the slot. |
| f397–f407 | 16.54–16.96 | agent window slides in | ground wipes white → [237,245,248] f397–f405 (window left edge at x≈92 = 2.95·165−395). Window at s = 2.95 (traffic-light diameter 44 px vs 15 px at rest). dy from the ghost heading band and the red light: f397 −975 … f402 −845, f403 −791, f404 −742, f405 −700, f406 −432 (a 268 px jump), f407 −306, f408 −216, f409 −149, f410 −97, f411 −59, f412 −31, f413 −12, f414 −1, f415 4. Mascot shrinks into the cursor f403–f407. |
| f408 | 17.0 | agent cursor appears | paper-plane cursor (tip up-right), where the mascot vanished. |
| f417 | 17.375 | "+" opens tab 2 | single-frame whip: camera to s 2.847, d (−729, 17); tab "Connections" (active) inserted, page = third-party footage (slot). |
| f426–f442 | 17.75–18.42 | pull-out to window | s 2.847 → 1.0: f426 2.763, f428 2.498, f430 2.192, f432 1.848, f434 1.339, f436 1.078, f438 1.031, f440 1.010, f442 1.000 (late peak f432–f434, then a hard exponential stop). Window at rest 165..1097 x 86..649, chrome [246,250,251], content [253,255,252]. |
| f444–f453 | 18.5–18.92 | click Connect | cursor tip (928,408), press ~f449. |
| f454 | 18.917 | CUT to outreach card | card 309..967 (658 wide), height steps (on twos) 388, 443, 458, 464, 469, 482, 491, 496, 500, 503, 505, 507 at f454…f477, centred y≈360; message box opens by the same amount (58 → 164). |
| f460–f490 | 19.17–20.42 | message types | chars: f460 1, f462 13, f468 33, f474 72, f480 100, f486 131, f490 150 (≈5 chars/frame); newest ~8 chars blue [86,160,210], caret blue. |
| f488–f502 | 20.33–20.92 | cursor to Send, click | cursor (rot: tip right) sits right of the card, moves onto Send f485–f490, press ~f499. |
| f503–f528 | 20.96–22.0 | card stack cycles | top card cuts: Anna f503 (−3.2°), Eric f508 (+3.0°), Emma f515, Yara f519, Ryan f522, Liam f525, Madison f527 — gaps 5, 7, 4, 3, 3, 2 frames (accelerating). Cursor holds on Send. |
| f529–f537 | 22.04–22.38 | stack shrinks | cut to s .856 then .842, .826, .813, .789 (f535), .663 + fan-out (f536). |
| f538 | 22.417 | CUT to calendar | window (f566 frame 230..1046 x 116..604) centre/scale: rises cy 502 → 361 (f538–f556) at s 1.086, breathes to 1.0 (f562–f569), back to 1.086 (f581), then drops accelerating cy 374, 402, 422, 478, 624, 702 (f584–f597), gone by f600. Profile-card fan (top card 302x258) in front: f538 s 1.07, f541 .947, f552 1.0 at (665,275), drops into the calendar f555–f556. Events appear f557–f580 (product footage). |
| f595–f608 | 24.79–25.33 | mascot tumbles out, "I'm your companion" | bubble x 254..971, body 151 tall, [232,239,242]; top y f599 145, f601 116, f603 92, f605 86 (overshoot), f607 91, f609 97, (S3: f611 101, f613 103). Mascot bbox table in gen.mjs (small at (547,133) f598, grows to 473x597 by f608). Ground [244,249,252] with LIGHTER dots [254,255,255]. |

The reference is animated on twos/threes from f454 on (byte-identical neighbouring
frames); the rebuild renders smoothly except where hold keys reproduce the steps
(card height, bubble spring at the end).

### Grounds

| frames | base | dots | notes |
|---|---|---|---|
| f293–f396 | [254,255,253] | none | window shadow is warm [234,230,227] near edges |
| f397–f405 | fade to [237,245,248] | none | wipe follows the agent window sliding down |
| f405–f453 | [237,245,248] | none | lighter centre (glow 0.55) |
| f454–f537 | [226,236,238] | [240,247,249] (lighter than base) | centre glow [243,250,252] |
| f538–f598 | [225,235,237] | none | centre glow |
| f599– | [244,249,252] | [254,255,255] | S3's ground |

### Layout (design px)

* Ask window (f310): window 158..1118 x 69..651, face [248,247,243]; content 169..1108 x 130..640;
  lights (188/214/240, 105) r 7.5; tab 283..449 x 87..123; pill 463..802 x 232..296 [244,241,236];
  "Ask" cap 342..369 (Georgia ~41px), lockup 475..805; composer 373..903 x 409..532 r 32 border
  [229,230,232]; send (862,495) r 23 [102,152,179]; "+" (406,494); prompt 24px Segoe.
* Agent window (f447): 165..1097 x 86..649; tabs start 113u, active tab +50u right padding.
* Message card (f498): 309..967 x 106..613 r 20; avatar d122 (402,198); name bold 27px;
  title 17px; message box 341..937 x 356..520 [241,247,248], text 22px; Send 791..937 x 541..587 [20,106,189].
* Calendar window (f566): 230..1046 x 116..604; tabs New Tab / Connections / Google Calendar (active).

### Verification (pairs at 26 matched timestamps across 5 rounds, sbs of the full range)

Per-frame motion energy (mean |Δ| per frame, ref vs ours) was compared over the whole
range: the camera beats line up frame-for-frame (pull-back f293–f308, close-up cut
f312, zoom-out f339–f350 peaking at f344/345 in both, pan-up f367–f378). Where ours is
lower it is because a slot replaces busy footage (mascot art, the people-search page,
the calendar) — the window/camera motion under those slots follows the measured keys.

| beat | frames | verdict | delta / note |
|---|---|---|---|
| ask pull-back | f293–f311 | PASS | camera from per-frame fit; window/pill/lockup/composer within ~5 px; pill art is a slot |
| close-up cut + typing | f312–f338 | PASS | text width within 2%, baseline within ~5 px; hand is a pointing hand (ref uses an open-hand glyph) |
| zoom-out + hold + send | f339–f366 | PASS | scale trace matches per frame |
| companion leaves, pan up | f366–f378 | PASS | ease-in pan (p 2.6) matches composer y per frame within ~10 px; mascot is a slot |
| "I've got you!" | f379–f398 | PASS | bubble centre/rotation per frame; text width within 1% |
| agent window slide | f397–f416 | PARTIAL | heading/red-light calibrated; ghost page layout approximate (pill position, heading ~50 px right) |
| tab opens, pull-out, Connect | f417–f453 | PARTIAL | chrome/tabs/camera PASS; page is a slot (empty), so the frame reads much emptier than the ref |
| outreach card + typing | f454–f502 | PASS | card rect, growth steps, wrap, typing cadence, cursor path and orientation match; avatar is an initials Avatar |
| card cycle + shrink | f503–f537 | PASS/PARTIAL | cut cadence exact; per-card rotation/offset eyeballed (±1°); shrink scale from fit, fan-out approximate |
| calendar window + card fan | f538–f598 | PARTIAL | window centre/scale per 3 frames PASS; fan geometry approximate; calendar interior is a slot (the event tiles filling in are not drawn) |
| mascot tumble + "I'm your companion" | f595–f608 | PASS | bubble rect/spring per frame; mascot bbox per frame (slot) |

## S3 — measurements and verdicts

Section S3 of the willow rebuild: two ranges sharing one kinetic-type vocabulary.

- (a) 25.375–31.333s (f00609–f00751)
- (b) 76.958–90.000s (f01847–f02159)

All numbers are stage px (1280x720). They were measured on the full-decode frames in
`ref/f720`, where frame n is at n/24 s. The measuring scripts are in `sections/s3/tools/`:

| script | what it measures |
|---|---|
| `diff.py` | cut detection |
| `ink.py` | dark and saturated bboxes |
| `bands.py` | chip row bands |
| `mascots2.py` | hue-classified mascot bboxes |
| `handtrack` / contrast tracker | hand cursor |
| `cmp.py` | ref vs ours bboxes on pair PNGs |
| `motion.py` | per-frame ref vs ours tracks from the sbs |

`gen.py` turns the tables below into `scenes.match.json` and `scenes.json`.

**Frame duplicates.** The reference repeats frames (diff ≈ 0.03):

- range (a): irregularly (636, 638, 641, 644, 646, 650, 657, 665, 674, 687, 689…)
- the zoom in range (b): every 4th frame
- the end card: on twos (12fps)

The rebuild interpolates smoothly, except the end card. The end card is stepped at 12fps (`step`), because the reference genuinely animates on twos there.

### Beat list (frame-exact)

| frames | t (s) | beat |
|---|---|---|
| 609–634 | 25.375–26.417 | Pale-blue ground. Static speech bubble "I'm your companion" + people glyph. Blue mascot (slot) lands after its jump, bobs and waves, then drops out accelerating (head top 302→328→376→513 over f631–634). |
| 635 | 26.458 | **Hard cut** to cream. "I can do" + tinted chip drum. The label rises from +60px: 60/17/5/1/0 at f635/637/639/640/642. |
| 647–686 | 26.958–28.583 | Drum steps sales→…→reports, with cadence accelerating: new chip on the line at f648, 656, 663, 669, 673, 676, 679, 682, 686 (intervals 8,7,6,4,3,3,3,4). |
| 684–687 | 28.50–28.63 | Exit: the whole row lifts −2/−10/−39 (accelerating). |
| 688 | 28.667 | **Hard cut**. "I" alone appears at its final place in the centred line "I work". It rises +89px, decaying ×0.6–0.66 per frame (tau ≈ 95ms). |
| 692 | 28.833 | "work" (coral) appears +28px, tau ≈ 74ms. |
| 703–711 | 29.29–29.63 | Exit slides LEFT accelerating: −1, −2, −4, −8, −15, −26, −48. |
| 712 | 29.667 | **Hard cut**. "in your" + white card drum (tabs/apps/docs) + grey "+". The label arrives from the right: +39/+14/+3/0 at f712/714/715/716. Off-line cards arrive from the left: −30/−10/−2/0. |
| 714–730 | 29.75–30.42 | Hand cursor rises in from below-right (straight line, expo-out ×0.77/frame) and parks by the "+" with its fingertip at (985,402). No press is detected (bbox constant 74x81 through f729–743). |
| 720–728 | 30.0–30.33 | Drum step tabs→apps. Progress 0/.007/.05/.18/.74/(dup)/.93/.98/1 (in-out, 7 frames). |
| 734–742 | 30.58–30.92 | Drum step apps→docs. Progress 0/.03/.12/(dup)/.60/.96/.99/1. |
| 744–751 | 31.0–31.29 | Exit: the row lifts 0/−1/−1/−5/−11/−22/−44/−67 (ease-in). The hand travels up-left ~2× as far (fingertip to (913,262)). f752 cuts to S4's browser window. |
| 1847 | 76.958 | **Hard cut**. Giant "Discover" at 4.19× (width 1257). |
| 1847–1869 | 76.96–77.88 | Scale 4.19, 3.74, 3.44, 3.28, 3.19, 3.14, 3.12, 3.10, 3.08, 3.05, 3.02, 2.98, 2.89, 2.72, then **1.20 in one frame** (f1865), then 1.053, 1.013, 1.0. The text centre holds at (645.5, 359.5) while >1.2×, then lands at (640.5, 341). |
| 1871–1877 | 77.96–78.21 | "a new way" (coral, f1872) and "to work" (f1875) pop in place (+8px). The block re-lays up 36px (−11, −26, −31, −34, −35, −36.5). |
| 1888–1904 | 78.67–79.33 | Four mascots (slots) fly in: purple drops from the top, the blue hero rises huge (2.5×) from the bottom and jumps to an apex at f1897, red slides in from the left, green from the top-right. The text block moves up 180px (in-out, fastest at f1895–1896). |
| 1919–1944 | 79.96–81.0 | Hand enters at the right edge and sweeps left over green, purple, blue and red. Each slot pops ~1.08–1.10× while hovered (green f1921–25, purple f1925–29, blue f1927–31, red f1929–36). The hand then returns to the hero at (527,509). |
| 1931–1937 | 80.46–80.71 | The "Discover" block shrinks about its centre, accelerating: .994, .981, .961, .932, .886, .762. |
| 1939 | 80.792 | **Hard cut**. "Claim your" settles 1.172→1.0 about its top edge. Hero grows to 1.10× (f1945) → 1.185× (f1981), pivot 79% down. |
| 1945 | 81.04 | "companion" appears (coral, +11, tau 122ms). "today" appears at f1953 (+7, tau 230ms). |
| 1959–1966 | 81.63–81.92 | Hand press: bbox 59x65 → 51x56 (×0.86). The hero squashes to 1.09× and regrows. |
| 1991 | 82.958 | **Hard cut** to the empty cream end card for 2 frames. |
| 1993–2009 | 83.04–83.71 | End card builds on twos. Wordmark +38 (f1993). Mark grows from a dot and "Download now" +15 (f1995). "for free" +27 (f1997). Store buttons +15 (f2001). |
| 2041 | 85.042 | Buttons swap on ONE frame for the URL pill (+16 rise). Holds to f2159 (the film's last frame). |

### Elements

### Grounds

- **(a) blue:** base [244,249,252]. The halftone is LIGHTER than the base, with dots at [254,255,255].
- **(a) cream from f635:** base [255,254,250], dot [246,243,240].
- **(b):** base [255,254,250], dot [246,243,241].

All ground changes are hard cuts.

### Speech bubble

- Rect (253,100)–(972,251), r ≈ 48, fill [231,241,243].
- Tail: a wedge whose vertical right edge sits at x=400, from y=251 to 281.
- Text:
  - "I'm your": ink [27,31,30], x 305..526, cap ≈ 50, medium weight.
  - "companion": [131,182,229].
  - People glyph: right edge at 922.
- Static through range (a). Its entry belongs to S2.

### Tinted chips

- Chip h 137, pitch 155, radius ≈ 60 (stadium). Left-aligned at x=578, which is 72px after the label ink.
- Inside the chip: icon at +34, icon ≈ 70px, 20px gap, text at the label size (cap 75–76), right pad ≈ 36.
- Line chip centre y=352, which is the label's cap centre (label caps 314..390).
- Fade measured on chip faces:

  | d (distance from line, in pitches) | relative intensity |
  |---|---|
  | 0 | 1 |
  | ±1 | ≈0.67 |
  | ±2 | ≈0.15–0.25 |

  This fits exp(−0.4 d²) and is a continuous vertical ramp (one chip carries a gradient).
- Edge spread: ~3px at d≤1, ~8px at d=2, so blur ≈ 0.9·d² px.
- Colours on the line (bg / text):

  | chip | bg | text |
  |---|---|---|
  | sales | [217,247,221] | [68,225,97] |
  | research | [231,240,247] | [133,187,239] |
  | marketing | [252,227,222] | [245,122,100] |
  | outreach | [250,245,203] | [245,210,15] |
  | HR | [224,238,251] | [101,179,252] |
  | accounting | [234,222,242] | [156,98,212] |
  | design | as sales | as sales |
  | coding | as outreach | as outreach |
  | writing | as research | as research |
  | reports | as marketing | as marketing |

- Drum position s (chip index on the line, group offset removed), per frame:

  | frames | s |
  |---|---|
  | 635…645 | −.832, −.394, −.226, −.116, −.052, −.013, 0 |
  | 647…654 | .045, .806, .968, .994, 1 |
  | 655…662 | 1.052, 1.716, 1.819, 1.839, 1.884 |
  | 663…668 | 2.626, 2.871, 2.910, 2.948, 3.103 |
  | 669…672 | 3.877, 3.955, 3.981, 4.258 |
  | 673…678 | 4.942, 5.0, 5.768, 5.955, 6.0 |
  | 679…686 | 6.897, 6.948, 6.974, 7.703, 7.923, 7.987, 8.174, 8.852 |

  Later steps overlap: the next step starts before the last has settled.
- No chip scaling. Chip heights are 141px in every band.

### Card chips

- Card h 105, pitch ≈ 134 (step 1 measured 137, step 2 129–130). Radius ≈ 15, face [255,254,253].
- Hairline plus soft shadow, ~13px below at α ≈ 0.08.
- CENTRE-aligned in the column: tabs card 590–930, apps 578–945.
- Line card centre 355.5. The label baseline is ~4px above the card text baseline.
- Text alpha by position: the line is ink; d=+1 below ≈ 0.45 (0.57 at first, 0.33 later); d=−1 above ≈ 0.25; ±2 ≈ 0.11. Faded cards stay crisp.
- "+": (960..1016, 335..391), stroke 9, [212,207,204].

### Hand cursor

- (a): bbox 74x81, fingertip at bbox left+25, top+1.
- (b): bbox 59x65, fingertip at left+21, top+1.
- The reference hand is chunkier than the shared glyph (w/h 0.91 vs 0.60).

### Discover / Claim type

- Cap 57 (≈81.5px Segoe Bold), line pitch 72, ink [33,33,32], coral [245,120,96].
- Final positions:
  - "Discover": x 491..790, y 96..152.
  - Line 2 "a new way" 326..681, "to work" 695..952.
  - "Claim your": x 459..820, cap top 89.
  - "companion" 342..723, "today" 742..937, y 160..233.

### Mascot slots (b), settled

| mascot | cx | cy | w | notes |
|---|---|---|---|---|
| red | 298 | 493 | 195 | |
| hero (blue) | 528 | 495 | 215 | |
| purple | 746 | 500 | 188 | |
| green | 952 | 495 | 236 | |

- All slots h 410. The mascots occlude the type, so the slots render above the text.
- Entry keys are in `gen.py` (per-colour hue bboxes).

### End card (final rects)

| element | rect | colour / notes |
|---|---|---|
| mark | (441,142)–(514,217) | grows .15/.2/.55/.92/.97/1 |
| serif wordmark | (533,155)–(837,216) | [28,27,23] |
| "Download now" | (330,290)–(949,362) | ink [6,6,4] (blacker than the kinetic type) |
| "for free" | (486,394)–(785,468) | [244,113,89] |
| Mac button | (408,558)–(619,626) | |
| Windows button | (630,558)–(874,626) | |
| URL pill | (404,557)–(875,628) | fill [237,229,225], text [122,111,105] (451..826) |

- Buttons: black, r ≈ 9, "Download for" ~14px, "Mac OS"/"Windows" ~32px.
- Rises decay ×0.43 per 2 frames (tau 100ms on the 12fps grid).

### Iterations

1. **First build** (`pair1`):
   - Mascot slots in (b) all rendered at frame centre, in purple. My slug `willow-art-slot` collided with S5's identically named preset, which the registry spread lets win. Renamed to `willow-mascot-slot`, and the hand to `willow-hand-path`.
   - The hand was ~3× too big. The shared HandCursor scales twice. Fixed in my wrapper by solving size from the wanted glyph height and compensating the fingertip.
   - Segoe Bold ran 6–12% wider than the reference's Inter Display.
2. **Calibration by bbox** (`pair2`):
   - Tracking −0.06em on the heavy lines, −0.04 on "Discover", −0.085 on "in your".
   - Bubble 66px, −0.035em. End card headline −0.05em. Wordmark 63px. Pill pad 64, button pads 24/31.
   - Widths now within 1–3%:

     | element | ref (px) | ours (px) |
     |---|---|---|
     | "I can do" | 335 | 342 |
     | "Download now" | 617 | 617 |
     | "for free" | 299 | 299 |
     | wordmark | 302 | 300 |
     | pill | 471 | 471 |
     | "Discover" | 299 | 297 |
     | "Claim your" | 361 | 364 |
     | "companion" | 381 | 382 |

3. **Card chips** (`pair3`): white cards were invisible because the per-chip mask also clipped their shadow. The card skin now fades each card by opacity (crisp, as measured). The Discover zoom solves dx per frame for the measured centre.
4. End card. The cue times sat exactly on frame times and lost a frame to rounding, so all appearance cues are now 1–2ms early. The mark grow keys are snapped to the 12fps grid. The placeholder mark is sized to the reference ink: 73x75 at (447..520), against the reference's 441..514. Row nudged −5px. Button pads were widened to 467px total.

### Motion checks

Consecutive-frame ref vs ours, from `motion.py` on the sbs:

- **"I can do"** rise (f635–643) and exit lift (f684–687): identical deltas. Ours sits 4px higher throughout because Segoe's `d` ascender is taller. The caps line up.
- **"I"** rise (f688–702): within 0–7px per frame. The "I work" exit slide matches. Ours x is 5px right because the Segoe line is 10px wider.
- **Tinted drum, chip on the line:** per frame within ±6px on every step f647–687.
- **Card drum:** steps match within ±6px (f724 and f738 mid-step frames).
- **Hand (a):** within 2px in y on every frame f715–729. The bbox is narrower because of the shared glyph.
- **"Discover" zoom** f1847–1877: widths within 1% on every frame, including the one-frame whip at f1865 (816 vs 816 right edge). Ours is 4–9px higher.
- **Text block lift** during the mascot entry (coral line top, f1887–1905): within 2–4px.
- **"Claim your" settle** f1939–1949: widths within 6px, tops within 3px.
- **End card:** every element's rise matches per 12fps step within 1–4px. The pill swaps on f2041 and rises +16→0 as measured.

### Verdicts

| beat | frames | verdict | delta |
|---|---|---|---|
| Ground (blue / cream, hard cut f635; cream in b) | all | PASS | base/dot sampled; same halftone |
| Speech bubble | 609–634 | PASS | rect exact; text width 224 vs 221; tail as measured |
| Mascot slot (a): land, bob, drop | 609–634 | PARTIAL | head-top track exact. It is a slot, so no rotation or arm wave |
| "I can do" + tinted drum | 635–687 | PASS | label 342 vs 335 wide; drum per-frame ±6px. Icons are neutral glyphs; the icon-morph-on-focus detail (marketing dot→pie) is not rebuilt |
| "I work" pop + exit | 688–711 | PASS | rise/exit deltas match; x +5px |
| "in your" card drum + "+" + hand | 712–751 | PASS | steps, exit and hand path match. The hand glyph is the thinner shared one |
| "Discover" zoom-whip + re-lay | 1847–1877 | PASS | widths ≤1% on every frame |
| Mascot fly-in (4 slots) + hover pops + hero grow/press | 1888–1990 | PARTIAL | per-slot bbox paths and scales follow the hue-tracked measurements, approximated as rects (limb poses not representable) |
| Hand sweep and tap (b) | 1919–1990 | PASS | path from the contrast tracker; press f1959–1966 at ×0.86 |
| "Discover" exit shrink | 1931–1938 | PASS | scales as measured |
| "Claim your / companion today" | 1939–1990 | PASS | settle within 6px; word pops on frame |
| End card build + swap, holds to 90.0 | 1991–2159 | PASS | all rects within 1–8px. The mark is a placeholder, not the product mark |

## willow S4 — 31.333–49.250s (f752–f1181), measurements and verdicts

All numbers from full-decode 1280x720 frames (frame n = n/24 s). Trackers in `tools/`
(red.py = traffic light + Chat mark, send.py, bear.py, typed.py, rows.py, toast.py,
bbox.py, pinkedge.py); `tools/cmp.py <tracker>` runs the same tracker on our render
(`ours/` = frames of sbs.ours.mp4) so every motion below was checked per frame.
Config tables live in `gen.mjs` (dense keys = the per-frame measurements).

The source animates several moves ON TWOS (duplicate frames 753/754, 756/757, 805, 809,
912, the whole f1019–1035 pull-back, f1134–1142 zoom); those are reproduced with
held keys. Held keys and internal scene starts switch half a frame early so rounded
timestamps sample the same side of every step (no effect at n/24).

### Beat list
| frames | beat | mechanism |
|---|---|---|
| 752–762 | new-tab window rises | pure translate (red light x const 168.5), y offset 73.6, 42.6, 42.6, 26.0, 15.5, 15.5, 8.6, 3.9, 1.3, 1.2, 0 — expo-out on twos. Ground fades cream [254,250,246] → pink [252,237,232] linearly 752→763 |
| 752–762 | glyph tiles fly in | group dx 76→0, dy −27→0 (net of window), scale 0.89→1 (blue-tile centroid/area) |
| 767–770 | tiles click + collapse | 767 dip (s .985, +7px), 769 s .93, 770 s .77 rot −14 → cut |
| 752–770 | hand on the slides tile | fingertip (793,262) → (766,214) expo, press 767 |
| 771–783 | slides window "breath" | s 1 → .939 (771–775, expo-out) hold 775–778 → 1.0 (779–783, in-out), about frame centre (fit origin (649,366)) |
| 784–793 | hold | home rect 133..1146 x 53..667, 10px rim, 55px chrome |
| 794–812 | punch to the Chat pill | s 1.003, 1.0075, 1.017, 1.030, 1.058, 1.110, 1.27, 1.55(→1.62), 2.28(→2.40), 2.52(→2.56), 2.68, 2.68, 2.79, 2.88, 2.94, 2.94, 2.97, 2.99, 3.00 about fixed origin (1282,−44) — fit from the Chat-mark track (pred. vs meas. ≤1px at 799). Slow-in over 7 frames, fast through, decelerating 10 frames. Pill 82.5x45 → 245x135 (x3.0) |
| 813–821 | hold, click | hand press 816–821 (6 frames) |
| 822–829 | pan up | dy 0, −1.2, −3.4, −6.9, −12, −12, −19.4, −30.4, −46.4 (accelerating) → cut |
| 830–843 | composer close-up settles up | send-button y offset 114, 70, 51, 38, 28.2, 20.7, 14.9, 10.4, 6.8, 4.1, 2.2, 0.9, 0.2, 0 |
| 829–849 | prompt types on | ~35 px/frame (1.6 chars/frame), "He" at 830, complete 849; caret solid while typing, off 849–854, then 8 on / 8 off |
| 860–881 | hand to send, click | press 872–875; button lightens [120,76,63] → [150,112,100] |
| 882–883 | blank white | composer gone |
| 884–893 | user bubble rises | top offset 67, 40, 26, 16, 10, 5, 2, 1, 1, 0 (≈×0.62/frame) |
| 894–902 | agent reply | avatar pops; text slides in from −17px: 17, 11, 7, 5, 3, 2, 1, 0 |
| 906–919 | scroll 1 | −0, −1, −5, −11, −23, −44, −44, −105, −166, −188, −198, −204, −207, −209 (in-out, on twos at 912) |
| 918–925 | row "Researching" | chip pops, types ~1.3 chars/frame |
| 939–947 | → "Finding sources" | 2nd chip drops in (+8, +3, 0), text retypes ~1.6 chars/frame |
| 957–968 | → "Summarizing findings" | 3rd chip, ~1.75 chars/frame |
| 975–990 | scroll 2 | −87px in-out; slow zoom-out starts 979 (s 1 → .972 at 1012, linear, about ≈(680,200)) |
| 986–987 | row 2 "Updating slide deck" | chip 986, text whole at 987; shimmer from 993, band moving +32 px/frame |
| 1013–1018 | pull begins | s .968, .958, .940, .917, .885, .838 (accelerating) → cut |
| 1019–1035 | window + sidebar pull-back | ON TWOS: s 2.75, 1.90, 1.55, 1.34, 1.20, 1.107, 1.045, 1.010, 1.00 (yellow status icon + right rim, right rim pinned at ~1129) |
| 1036–1133 | hold; slides fill in (slot) | agent cursors over the slot; hand parked at (410,660) |
| 1134–1142 | zoom toward bottom-right | on twos: s 1.012, 1.034, 1.074, 1.135, 1.33 (anchored ~ (1129,657)) → cut |
| 1143–1149 | corner close-up settles | relative zoom .82 → 1 about (1050,572) (s 2.21 → 2.70); ground flat [249,231,227] (no halftone) |
| 1149–1161 | toast enters | appears whole at 0.967 scale, 36–40px low; rises over 6 frames about its right edge (x 990 pinned), ±3px float |
| 1155–1181 | hand to the button, click | enters 1155 from below, on button by 1161, press 1172–1177 (button dips) |
| 1182 | hard cut to S5 | |

### Element measurements (stage px)
- Window rims [247,246,241] 10px; chrome 55/53px; traffic lights r7.5, pitch 27, x+30 from rim; tab text 15px (cap 10–11); active tab = white pill 175 wide, "+" 42px after; Chat pill 82x45 r10 fill [239,239,237], 27px from the inner right edge.
- New-tab: "Ask" sans cap 28 (40px), brand serif 43px, baseline 382 (window top 53); composer 553x128 r30 at (363,410); placeholder cap 21 (29–30px) [178,178,178]; send d48 [107,155,196].
- Composer close-up: box 910x317 r~54 at (176,243), hairline [228,231,235]; text cap 34 (48.5px) at x218; "+" 33px; agent chip 134x82; send d79 [120,76,63]; window corner inner (1128,598), rim 40px.
- Thread close-up: bubble 666x213 r~60 at right 1162, fill [242,243,241], text cap 38–39 (53–55px) 2 lines 64px pitch; reply cap 37 (53px) at x118; status rows pitch 194, chips 137 square, overlap pitch 125, status grey [96,96,96].
- Sidebar (window 152..1129 x 64..656): x850..1118, header 11.5px bold, bubble 172x46, reply 12px, chips 30px, composer 244x58 r14.
- Toast: 730x273 r~62, fill [28,30,27], rim [108,110,105]; title bold, meta grey, action pill 354x80 white; video glyph 88px.
- Pink ground: base [252,237,232], dots [244,228,223] at full strength (corners min [244.7,229.7,224.7]).

### Verdicts (after 3 iterations; pairs1 → pairs2 → pairs3 + sbs)
| beat | verdict | delta |
|---|---|---|
| A window rise 752–762 | PASS | red light y within 1px every frame (153 vs 164.5 at f752: ours enters at 753 pos—f752 itself matches 164.5 by key) |
| A tiles / heading / composer | PARTIAL | tiles are neutral glyph tiles (shapes differ by design); mark sits ~2px off after fix; collapse 769–770 approximated |
| B dip 771–783 | PASS | red light ≤0.5px per frame |
| B punch 794–812 | PASS | red light ≤2.5px per frame 794–800; Chat pill rect within ~3% at 813–829 |
| B hand + click | PARTIAL | positions within ~10px; the reference's "grab" pose at 800–805 is not drawn (pointing hand throughout) |
| C composer pan + typing | PASS | send button ≤0.6px per frame 830–845; text width within 2.6%; Segoe semibold vs Inter-medium |
| C hand / send press | PASS | press frames 872–875 exact |
| D bubble rise / reply slide | PASS | bubble top identical per frame 885–893; reply x within 2px |
| D scrolls / status typing / chips | PASS | bubble/rows track within 1–3px; char counts within ±1 |
| D shimmer | PARTIAL | single band, speed measured; reference band softer |
| D slow zoom + pull 979–1018 | PASS (by construction) | keys from bear-avatar track |
| E pull-back on twos | PASS | status icon centroid within 4px every step |
| E slides fill-in | SLOT | dashed placeholder; agent cursor paths approximate (PARTIAL) |
| E final zoom 1134–1142 | PARTIAL | 1142 key fitted from the sidebar bubble (x1.33); 1134–1140 from window edges |
| F corner settle / toast entry | PASS | toast bbox within 2–4px per frame 1149–1158 |
| F hand + click | PASS | press 1172–1177 |
| ground | PASS/PARTIAL | colours match to ~2/255 mean; the reference's soft lighter cloud at the top-left of 31.3–34s is not modelled |

### Known differences
- Mascot/character art → Avatars (initials-gradient discs) and one labelled pill slot ("character art — team").
- Slides editor (third-party footage) → dashed slot in all framings; reference shows the deck building charts.
- FONT resolves to Segoe UI: widths matched with negative tracking; glyph shapes differ from the Inter-like original.
- Brand mark is a generic coral dot-diamond placeholder.

## S5 — 49.250s–63.583s (f01182–f01525)

All px are 1280x720 stage px, frames are film frames (t = n/24). Measured from full-decode
frames with numpy masks (scripts in `work/`: m1–m9 measure, trace.py/tagtrace.py compare
ref vs ours per frame). Configs are generated by `gen.py` (both copies from one source).

### Beat list (frame-exact)

| frames | beat | ground |
|---|---|---|
| 1182–1215 | "Transcribe meetings" chip line (hard cut in) | cream [255,254,250], halftone 1 |
| 1216–1280 | call window + notetaker pill (hard cut) | mint [242,253,245], dot [235,248,239] |
| 1281–1383 | companion (art slot) + chat-bubble stack (hard cut) | mint + soft white centre glow (centre reads [244,254,246]) |
| 1384–1397 | "Everyone" oversize settle (hard cut) | cream |
| 1398–1424 | "Everyone / on your team" (hard re-lay) | cream |
| 1425–1449 | "gets a companion" (hard cut) | cream |
| 1450–1509 | portraits orbit (1450) -> dock to row (1474–1493) ; mascots enter 1478–1490 | cream |
| 1509.5–1521 | ground dissolves cream -> lavender [239,233,245], halftone fades to 0 | — |
| 1510–1525 | portraits lift off top; mascots push in (1514–1518), tumble (1520–1525) | lavender |

Seam: the NEXT section's library window is already visible from **f1522–1523** (its bottom edge
enters at the top of frame). My scenes end at 63.583s; S6 must start its window ≥4 frames
before f1526 (or accept those frames without it).

### Measurements

**A. Chip line (on twos — ref frame pairs are byte-identical).** Line centred (224–1051).
Chip 224–719 x 305–414 (496x110, radius ~14, fill [233,242,237]). "Transcribe" teal core
[122,192,177], cap 55 (T 329–384); "meetings" [44,44,44] core, x-height 41, baseline 384,
23px right of the chip. Chip bottom per 2f: 437,425,423,419,417,415,414 → rise 23px expo
settle (dur ~650ms). "meetings" pops at f1186 19px low (418,412,408,406,404,402,401,400,399)
→ dur ~880ms. Layout fixed (chip doesn't move when the word appears). Pen glyph: -35° (f1182)
-> 0 (1184) -> +40° (1194), underline grows 0 -> ~58px. Exit lift: -3 (f1212), -8 (f1214),
ease-in, cut at 1216.

**B. Call window.** White content x162–1118, y128–644; frosted outer frame x150–1130,
y62–656 (r ~22); tab bar 64–126 [249,251,246]. Tiles 215x176 r14 at x312/537/768,
y157/346; colours [209,239,215] [211,184,237] [252,241,194] [232,196,180] [211,227,250]
[246,205,208]; discs d96 (D [149,80,215] + halo, T [244,196,12], J [72,134,236]).
Entry: pure translate, offsets 113,62,41,27,11,6,3,0 (f1216–1223) = cubic ease-out.
Exit f1273–1280: width 957->874 (0.913) about (640,~385), ease-in (pow 2.5).
Notetaker pill: vertical capsule 57x108 centred (1031.5,346) appears f1220 29px low:
29,20,12,1,-2,-4,-3,-2,-1,0; rotates 90° CCW f1235.5–1242 (inout cubic, mid -55° at 1239);
grows symmetrically 108 -> 286 wide f1244.4–1250 (quart-out; right edge 1095,1116,1151,1161,
1170,1172,1174); "Taking notes..." fades/wipes in f1247–1252. Rides window scale.

**C. Bubbles (on twos).** Mascot bbox x27–466, y122–678 static (internal anim only) -> slot.
Bubbles left x~550, white, r~22, thin dark rim + soft shadow; text cap 35 (regular),
line pitch 52; single-line h 108 (cap top +36), two-line h 140 (pads 18). Accents: purple
[151,106,196] (mean), coral [223,119,102], yellow [230,181,47]. Appear f1281 (scene cut),
1301, 1329, 1351. Stack: centred ~y303 until bottom > ~455, then bottom-pinned (rest tops
251 -> 176 -> 39 -> -95). Scroll curve vs appear frame: -4f .04, -2f .13, 0 .48, +2f .84,
+4f .95, +6f .98. New bubble: +25..39 px low on its first frame, 0 two frames later,
dip -7/-8 at +4..+6f, settled +10f.

**D. "Everyone" relay (on ones).** Stage 1 "Everyone" coral [239,114,92], cap 103,
width 563 at rest, centre (640,372). Scale 2.03 held f1384–85, then 1.46,1.265,1.15,1.08,
1.04,1.02… (excess x0.55–0.6/frame). Stage 2 (f1398): "Everyone" cap 71 (E 271–341), line 2
"on your team" baseline ~441 (width 533); line 1 rises 24 (24,24,10,5,2,1,0), line 2 52
(52,52,19,9,4,2,0); words at f1398/1402/1404; slow zoom-out ~2.4–2.8%/s; exit f1419–24
both lines slide LEFT, ease-in cubic, line 1 -25, line 2 -38. Stage 3 (f1425) "gets a
companion" x-height 51, baseline 386, width 753; words at f1425/1427/1430 each sliding in
from the right 36/25/25 px (x0.6/frame); exit f1445–49 width 743,733,715,685,625 (rate
doubling per frame) about centre.

**E. Portraits.** Tag centroids tracked per frame (role-tag colours Product [142,201,162],
Sales [213,116,118], Marketing [190,156,225], Founder [125,150,200]). Orbit about tag-centre
(638,468) = circle-centre (638,362), clockwise, items 90° apart. θ: -144.4 (1450), -119.4,
-102.8, -89.4, -78.2, -68.8, -60.5, -53.3, -46.8, -41.3 (1461) … -2.4 (1472) — 25°/f
decaying to ~4°/f. Radii: diagonal pair Product/Founder 133 -> 231, Sales/Marketing 181 ->
175. Source dups a frame every ~5.5 frames (1450/51, 1455/56, 1461/62 …) — ignored.
Circle d 226, tag 138x46 (Product), offset +106 under centre. Dock: row circles d~125
at x 291/533/765/1013, y 115/148/111/115 (Sales sits lower); tags 0.66 at their smallest
mid-flight then ~0.95. Founder departs ~1474.3, Sales 1475.3, Marketing 1477, Product
1479.3, all pow-4/5 ease-out over 14–16 f. Exit: tag y offsets 0,-5,-10,-19,-32,-50,-82,
-157 (f1510–1518), x fixed.
Mascots (slots): rest bboxes blue 135–415 x 248–668, pink 405–668 x 280–690, green
645–880 x 185–670, purple 870–1130 x 220–700. Entries: blue from left (f1478–1486),
pink falls from above (lands f1485, stretch/squash), green from right with -50px overshoot
(f1478–1490), purple from right (f1480–1489). Fly-away bboxes eyeballed at 1516/18/20/22/25
(push-in to ~1.3, then tumble ±90–170°, shrink to 0.35–0.85).

### Mechanisms -> presets

- `willow-chip-line` — chip + pen glyph + later words, expo rise per element, ease-in lift, twos.
- `willow-call-window` — drawn generic call window (my call: the grid is simple flat UI —
  pastel tiles, discs, pills — so drawing it keeps the template self-contained; photos ->
  `Avatar`, "Google Meet" tab -> "Meeting", no vendor marks) + notetaker pill morph.
- `willow-bubble-stack` — layout-driven stack with measured scroll curve + pop/dip.
- `willow-word-lines` — fixed-layout lines, per-word reveal/slide, per-line rise/exit,
  group settle/drift/accelerating shrink.
- `willow-orbit-row` — orbit tables + per-item dock blend + lift-off.
- `willow-art-slot` — character-art slot with keyed bbox motion (companion + 4 mascots).

### Verification (consecutive-frame traces, ref vs ours)

- Chip line f1182–1215: chip bottom within 0–6px each frame, same twos steps; "meetings" pops on
  f1186 (fixed a 0.03ms cue rounding that made it fire one step late) and tracks within 1–4px.
- Window f1216–1223: top edge 189/198, 166/168, 154/148, 136/136, 131/130, 128/128; exit widths
  within 2–3px each frame.
- Pill: rise 321/330, 312/314, 304/304, 293/293; rotation bbox 1238–1241 within 1–5px;
  growth right edge 1116/1118, 1151/1151, 1161/1166, 1170/1172, 1174/1174.
- Bubbles f1295–1311: b1 tops 251/249, 247/246, 238/238, 199/208, 180/178, 175/168; settle
  ~9px high before the gap/anchor fix (gap 27, anchor 307 applied after this trace).
- Everyone f1384–1405: bbox within 1–12px every frame (ours ~2% wider type).
- On your team f1398–1405, 1416–1424: within 0–6px incl. the left exit (336/338 at 1424).
- Gets a companion f1425–1435: left edge 299/304, 284/289, 276/280, 271/275 … 263/268;
  exit f1445–49 tuned k=0.0055 (was 0.0065, 16px too small on the last frame).
- Orbit f1450–1461: Product/Founder tags within 2–11px per frame.

### PASS / PARTIAL / FAIL

| beat | verdict | delta |
|---|---|---|
| A Transcribe meetings | PASS | timing/rise exact on twos; Segoe vs Inter letterforms; pen glyph is a generic drawing, slightly smaller |
| B call window + pill | PASS | motion within 1–9px per frame; tile photos are Avatars, toolbar buttons have no icons |
| C bubbles | PASS | layout/timing match; Segoe Regular wider + lighter than the reference's medium grotesk (strings run ~14px longer) |
| C companion | PARTIAL (by design) | static art slot at the measured bbox |
| D Everyone relay | PASS | per-frame bbox within ~1–12px; weight 700 Segoe is close but not identical |
| E orbit + dock | PARTIAL | orbit within ~10px; dock timing matches per item, but the tag-shrink-and-regrow is approximate |
| E mascot entries | PARTIAL | entry directions/timing measured; character squash/pose not representable in a slot |
| E fly-away 1510–1525 | PARTIAL | portraits lift-off matches; mascot tumble is a few keyed poses from eyeballed bboxes |
| ground | PASS | cuts at 1216/1281/1384 exact; lavender dissolve 1509.5–1521 |

## S6 — 63.583s – 76.958s (f01526 – f01846), notes

All measurements off full-decode 1280x720 frames (`ref/f720`), frame n = n/24 s.
The source footage runs at a 20 fps cadence inside 24 fps: every ~6th frame is a
duplicate (e.g. 1530=1529, 1536=1535, 1541=1540, 1547=1546, 1553=1552, 1558=1557).
Dense key tables drop the duplicate frames, so our motion is the same curve without
the stutter.

Tools used (all in `work/`): `sheet.py` (contact sheets), `diff.py` (cut finder),
`bbox.py` (white-panel bbox), `blobs.py`/`tags.py` (colour-blob tracking of folder
icons and role tags), `textbb.py` (dark-text blocks), `logos.py`, `tiles.py`/`tilet.py`
(avatar lattice + per-tile appearance), `ground.py` (base vs dot sampling),
`gen.py` (turns every table below into `scenes.match.json` / `scenes.json`).

### Beat list (frame-exact)

| frames | t (s) | beat | mechanism |
|---|---|---|---|
| (1522)–1530 | 63.42–63.79 | S5's mascots fall, shrink and BECOME the four cursors; Library window drops in behind | window enters from above (bottom edge 10 → 28 → 92 → 207 → 320 → 393 → 442 … 605 px at f1523…1540), inout-shaped, peak ~113 px/frame at f1526 |
| 1531 | 63.792 | hard swap mascots → role cursors (Founder ← blue, Sales ← pink, Product ← green, Marketing ← purple) | cursors glide to their folders, decelerating, landing ~f1541 |
| 1539–1562 | 64.13–65.08 | punch into the Campaign folder | layer scale 1.0 → 3.21 (log-scale midpoint at f1549.7, slow 10-frame ramp, violent middle 1.6 → 2.57 in 2 frames, long settle); camera centre drifts so Campaign+Sales stay framed |
| 1562–1572 | 65.08–65.50 | hold 3.21x (byte-still) | — |
| 1573–1581 | 65.54–65.88 | pull-back begins, accelerating (3.21 → 2.86) | cut before it completes |
| 1582 | 65.917 | CUT to empty Library at 1.37x | |
| 1582–1598 | 65.92–66.58 | pull-back to rest, expo-out (log scale × ~0.72/frame) | panel rest 165..1114 × 77..608 |
| 1585–1609 | 66.04–67.04 | cursors drag chip groups in from the bottom edge (Product f1585, Founder ~f1589, Marketing ~f1591, Sales ~f1593), each settling over ~12 frames | |
| 1609–1613 | 67.04–67.21 | window dips .9937 → .9505 | |
| 1610 | 67.083 | CUT (inside the dip) to the organised "Campaign" folder (3x2 doc cards) | |
| 1613–1625 | 67.21–67.71 | window back to 1.0; cursors drift to new targets | |
| 1637–1640 | 68.21–68.33 | window shrinks accelerating (.994 → .944) | |
| 1641 | 68.375 | CUT to cream "Works on 1.4 billion" | |
| 1641–1652 | 68.38–68.83 | text scale .53 → 1.0 (expo-out) about (640,360); glyph field recedes 1.41 → 1.0 with parallax | |
| 1645/1648/1651/1657 | | counter 1.4 → 1.5 → 1.6 → 1.7 → 1.8 (decelerating steps of 4,3,3,6 frames) | |
| 1651 | 68.792 | "websites" pops (no fade); block jumps up and settles (cap-centre 351 → 332 → 327 → 324 → 322 → 319.5 → 318.5) | |
| 1678–1682 | 69.92–70.08 | exit: text .992 → .904, field .9935 → .94, accelerating | |
| 1683 | 70.125 | CUT to lilac testimonial stack, camera 1.2x settling to 1.0 by f1690 | cards flick: p .96 → 3.0 over f1683–1698 |
| 1699–1725 | 70.79–71.88 | front card (Amanda) LIFTS .89 → 1.0: 80% in 5 frames, tail over ~20 | back cards still |
| 1731–1748 | 72.13–72.83 | advance Amanda → Johan, in/out, z-swap at mid-travel ~f1738.5 | |
| 1743–1767 | 72.63–73.63 | Johan lifts (slower: 70% in ~6 frames) | |
| 1776–1783 | 74.00–74.29 | exit: whole stack shrinks 1.0 → .828, accelerating, blurring | |
| 1784 | 74.333 | CUT to cream "200k companions" | |
| 1784–1826 | 74.33–76.08 | block scales .63 → 1.0 about (640,366) (the gap between the lines stays pinned) | |
| 1785–1808 | | counter +3k per SOURCE frame (20 fps) 200 → 254, then decelerating to 267 at f1827 | |
| 1791 / 1796 | 74.63 / 74.83 | "already" pops, then "created" pops, each in its final place | |
| 1794–1838 | | avatar tiles pop outward from the centre, each ~10–14 frames first-visible → full | |
| 1800–1830 | | lattice recedes 1.10 → 1.0 | |
| 1832–1846 | 76.33–76.92 | text pushes in (1.0 → 1.14) while the lattice recedes faster (1.0 → .866) | |
| 1847 | 76.958 | CUT to "Discover" (S-next) | |

### Grounds (sampled where there is no content)

| frames | base | dots | notes |
|---|---|---|---|
| 1526–1640 | [239,233,245] | none (strength 0) | flat lilac; bottom row has only the window shadow |
| 1641–1682 | [255,254,250] | [248,245,241], full mask | the standard cream halftone |
| 1683–1783 | [244,236,249] | [230,218,239] | lilac; top-right and bottom-left corners lighter/pinker between dots ([251,242,246]) → two corner glows [252,243,246] |
| 1784–1846 | [254,255,252] | none | plain cream (centre [254,255,253], edges [255,254,250]) |

### A — Library drop + punch (f1526–1581)

* Window (layer space): glass frame 151..1129 × 63..623 r30 [244,242,247]; panel
  165..1115 × 77..609 r20 [254,255,254]. Header: "Library" 20px/600 at x192, tab
  pill 289..670 × 104..144 [241,243,240] ("Projects" active, white), avatar stack
  4×40px from x≈966, "Suggested folders" 15px/600 at y175.
* Folder grid: x0 192, pitch 227, card 216×181 [241,243,240] r14; white thumb
  inset 10, h112; icon tile 54px r12; folder glyph [84,164,222]; label 18px/600,
  "in My Drive" 13.5px [130,132,129]; grid y0 196 pitch 193.
* Camera: dense table of (centre of the Campaign/Sales icon pair, scale) per
  frame, pivot = layer midpoint (413.5,268). Scale per frame (dups removed):
  1539 1.001, 1540 1.021, 1543 1.047, 1544 1.10, 1545 1.166, 1546 1.263, 1548 1.395,
  1549 1.597, 1550 2.05, 1551 2.574, 1552 2.81, 1554 2.95, 1555 3.04, 1556 3.10,
  1557 3.146, 1559 3.176, 1560 3.194, 1562 3.21 … 1572 3.21, 1574 3.185, 1576 3.168,
  1577 3.13, 1578 3.10, 1579 3.04, 1580 2.965.
* Cursors: ride the layer for position but NOT for size — the Founder tag grows
  96 → 155 px (1.61x) at f1551 and relaxes to 1.52x (146 px) while the window is
  at 3.21x; implemented as an explicit `cursorScale` table (A cursors are 0.92 of
  the B/C size). Tag offsets from the tip measured at f1541/f1606: ~50px below,
  left-aligned for a normal arrow, right-aligned for a mirrored one (Founder,
  Sales, Product in A; Founder, Product in B/C).
* Role colours (tag medians): Founder [132,148,192], Sales [214,112,116],
  Product [138,199,161], Marketing [188,148,230].

### B / C — empty library, organising, Campaign (f1582–1640)

* B scale (pivot = panel centre 639.5,342.5): 1582 1.37, 1583 1.229, 1585 1.157,
  1586 1.111, 1587 1.08, 1589 1.059, 1590 1.041, 1591 1.027, 1593 1.019, 1594 1.011,
  1595 1.006, 1597 1.003, 1598 1.001, 1609 .9937.
* C scale: 1610 .974, 1612 .955, 1613 .9505, 1619 .9526, 1620 .957, 1621 .966,
  1622 .983, 1624 .9937, 1625 .999, 1627–1636 1.0, 1637 .9937, 1638 .989, 1639 .98,
  1640 .944.
* Cursor tips: every tag box per frame (tags.py) → tip → layer coordinates through
  the inverse camera. Groups (chips / slide stack) hang rigidly off the tip at the
  offsets measured at f1606 (Prospects −3°, Email drafts +7°, Competitors −6°,
  slide stack −10°/+10°/0°).
* Campaign grid: 3 cols x0 192 pitch 306 card 283×199; rows y0 163 pitch 223;
  thumb inset 15, h145; label 18px.

### D — "Works on 1.8 billion websites" (f1641–1682)

* Type: cap height 62 px ⇒ 88px Segoe at 650 weight, tracking −0.06em (Segoe is
  ~10% wider than the reference's Inter Display at equal cap height; −0.06em
  restores the measured 703 px line width). Ink [44,44,45]; number gradient top
  [241,145,128] → bottom [236,116,97].
* Scale table: 1641 .53, 1642 .72, 1643 .84, 1644 .875, 1645 .905, 1646 .92, 1647 .95,
  1648 .97, 1649 .985, 1650 .99, 1652 1.0 … 1678 1.0, 1679 .992, 1680 .966,
  1681 .94, 1682 .904.
* Glyph cloud: 31 tiles at their measured centres/sizes (52–100 px, 0.25–1
  opacity). Field factor for an 84px tile (YouTube-red track): 1642 1.346, 1645 1.234,
  1650 1.14, 1655 1.076, 1660 1.042, 1665 1.02, 1670 1.0057, 1676 1.0, then
  .998/.9935/.975/.958/.94 over 1678–1682. Parallax: Teams (100px) moved 1.23x as
  far → offset factor 1 + (size/84)(S−1).

### E — testimonial stack (f1683–1783)

* Card (front, lifted, f1725): 732×480 r36 at (640,350). Quote 40px/600 (cap 28),
  48 px leading, x+60, first baseline +170; divider at +300; avatar 96px at
  (+106,+374); name 37px/700 baseline +366; title 29px/400 [58,51,51] baseline
  +405; mark 52px at (+648,+85). Ink [42,28,31].
* Slots (f1725): k−2 (301, s .644), k−1 (433, .746), k0 (640, .89 → lifted 1.0),
  k+1 (880, .723), k+2 (1006, .556). Depth blur light (k±1 ≈1.3 px, k±2 ≈2.2 px).
  Between k0 and k±1 the card keeps its size longer than its position (Amanda at
  k=−.29 still .88), so scale interpolates on |k|².
* Progress p (card index): 1683 .96, 1684 1.08, 1685 1.24, 1686 1.42, 1687 1.57,
  1688 1.71, 1689 1.85, 1690 2.03, 1691 2.52, 1692 2.75, 1693 2.87, 1694 2.925,
  1695 2.96, 1696 2.985, 1698 3.0 … 1731 3.0, 1732 3.012, 1733 3.027, 1734 3.053,
  1735 3.095, 1736 3.16, 1737 3.28, 1738 3.5, 1739 3.74, 1740 3.85, 1741 3.905,
  1742 3.944, 1743 3.967, 1744 3.98, 1746 3.994, 1748 4.0. (From each front card's
  text-block LEFT edge, L = cx − 306·scale, camera folded in.)
* Lift: front-card top edge 135, 131, 123, 119, 117, 116 (f1699–1704) → 111 by
  f1725. The lift collapses within 0.1 slot of leaving (f1732–1736: .983 → .90).
* Exit scale: 1777 .996, 1778 .983, 1779 .967, 1780 .946, 1781 .916, 1782 .883,
  1783 .828 (+ blur 0.5 → 3 px).

### F — "267k companions already created" (f1784–1846)

* Type: digits cap 59 ⇒ 84px; line 1 descender and line 2 ascender both pinned at
  y ≈ 366 while scaling (anchor (640,366)); baselines −15 / +61 at scale 1.
* Scale: 1784 .63, 1786 .71, 1788 .78, 1790 .81, 1792 .836, 1794 .85, 1796 .877,
  1798 .89, 1800 .904, 1802 .918, 1804 .93, 1806 .945, 1810 .96, 1814 .973,
  1819 .986, 1826 1.0, 1832 1.014, 1835 1.027, 1838 1.04, 1839 1.055, 1840 1.068,
  1842 1.082, 1843 1.096, 1844 1.11, 1846 1.137.
* Counter shown per frame: 200 200 203 206 209 209 212 215 218 218 221 224 227 227
  230 233 236 236 239 242 245 245 248 251 254 254 256 257 258 258 259 260 261 261
  262 263 264 264 264 265 266 266 266 267… — authored as hold keys, so it is the
  same sequence.
* Lattice (centre 645,376, pitch 111.5 at g=1; rows 1 and 3 are half-offset):
  g 1796 1.12, 1800 1.10, 1806 1.063, 1810 1.045, 1816 1.022, 1820 1.018,
  1826 1.004, 1830 1.0, 1834 .996, 1836 .982, 1838 .973, 1840 .951, 1842 .933,
  1844 .892, 1846 .866.
* 53 tiles extracted from f1840 (head / faint "ghost" head / blank pastel) with
  their first-visible frame; plus a faint outer ring at ±4.5/5 pitches appearing
  ~f1834.

### Content decisions

* **Library / drive window**: drawn generically (frame, tabs, avatar stack, folder
  cards, doc-skeleton thumbnails) instead of a footage slot. The punch-in goes to
  3.2x on one folder card and the cursors land on specific folder icons, so a
  dashed slot could not carry the beat; everything in it is generic UI (folder
  names, doc skeletons, chips with neutral glyph tiles). Avatar photos → gradient
  circles. Third-party product icons (Sheets, Gmail, Docs, Slides) → neutral
  glyphs in similar colours.
* **Glyph cloud**: every app logo → a white tile with a generic coloured glyph
  (disc / ring / square / bars / doc / envelope / play / triangle / heart / dots),
  same positions, sizes and opacities.
* **Testimonials**: avatar photos → `Avatar` initials; Strawberry's pixel mark → a
  generic coral rounded-diamond mark. The Omer card's name-on-top layout and the
  Swedish Chamber card's logo row are folded into the single card layout.
* **Avatar crowd**: the companion heads are character art → pastel tiles with a
  neutral head-and-shoulders mark (blank tiles stay blank, faint ones at 0.22).
  This is the slot for a user's own avatars.
* **Mascots f1526–1530**: four `media-window` slots (bbox per frame) shrinking to
  the cursor spawn points — they are S5's characters finishing their fall.

### PASS / PARTIAL / FAIL (see report for the final table)

| beat | frames | verdict | delta (measured on sbs.mp4, ours vs ref) |
|---|---|---|---|
| mascots -> cursors (S5's art) | 1526–1530 | PARTIAL | four labelled slots with eyeballed per-frame bboxes; the art itself is not ours to draw |
| Library drop-in + cursor glide | 1526–1541 | PASS | panel bottom edge within 1 px/frame (207/320/393/…/595 vs 206/319/392/…/593); every role tag within 1–2 px per frame |
| punch to 3.21x, hold, pull | 1539–1581 | PASS | Campaign/Sales icon spacing within 0–6 px per frame (e.g. f1550 466 vs 472, f1556 705 vs 704, hold 730 vs 728); cursor growth table reproduces the 1.61x overshoot |
| cut, pull-back, groups dragged in | 1582–1609 | PASS (geometry) / PARTIAL (content) | panel bbox within 1–2 px each frame; chip groups ride measured tag tracks; chips and slide cards are generic drawings; the reference's 20 fps stutter frames are smoothed |
| Campaign folder, dip, organise, shrink | 1610–1640 | PASS | panel bbox within 1–3 px; doc thumbnails are generic skeletons |
| Works on N websites | 1641–1682 | PASS | line widths within 2–5 px after tracking; counter steps on the exact frames; "websites" pops on f1651; glyph tiles replace logos at measured positions, sizes, opacities and parallax |
| testimonial flick | 1683–1698 | PARTIAL | front-card left edge within 1–15 px; incoming-card z-swap within ±1 frame; the Omer/Swedish cards use the single card layout |
| lift, advance, exit | 1699–1783 | PASS | front text-block left edge within 0–3 px through the advance (f1737 315 vs 313, f1741 394 vs 393); Johan settles ~10 px left of the ref (the ref card is narrower) |
| companions counter | 1784–1846 | PASS | line-1 top within 1–2 px every frame, widths within 5 px, counter sequence identical |
| avatar crowd | 1794–1846 | PARTIAL | lattice, receding curve and per-tile first frames are measured; heads are neutral tiles, the outer ring is approximated |

Mean abs luma difference per frame (160x90): 2–5 across the library beats, ~9 on
the glyph cloud (logos vs glyphs), 7–10 on testimonials (photos vs initials), 1–9
on companions. There are no spikes at any cut.
