# sequoia — reference measurements

Measured off the **Aside launch film** (87.5s, 1920x1080 @29.97fps) on
2026-10-31. Frames were full-decoded, resampled to a 30fps clock (frame n is
at t = n/30 s) and scaled to the 1280x720 stage, so stage px = reference px /
1.5. Seven section passes measured and rebuilt the film in parallel. Their
notes follow unedited, one per section, on the absolute film clock.

| section | range (ms) | presets |
|---|---|---|
| S1 | 0 – 10200 | `sequoia-search-type`, `sequoia-word-flow`, `sequoia-trash-dock`, `sequoia-button-cascade`, `sequoia-letter-rise` |
| S2 | 10200 – 21267 | `sequoia-refusal-chat`, `sequoia-type-center`, `sequoia-light-curtain` |
| S3 | 21267 – 31733 | `sequoia-title-stack`, `sequoia-word-staircase`, `sequoia-task-panel`, `sequoia-task-chat` |
| S4 | 31733 – 42400 | `sequoia-word-chain`, `sequoia-task-timeline` |
| S5 | 42400 – 53133 | `sequoia-spawn-tree`, `sequoia-agent-log`, `sequoia-chat-reply`, `sequoia-disc-grow` |
| S6 | 53133 – 66567 | `sequoia-circle-wipe`, `sequoia-bench-chart`, `sequoia-type-stack`, `sequoia-cando-drum` |
| S7 | 66567 – 87533 | `sequoia-kinetic`, `sequoia-laptop` |

Seams: frame 1997 (66566.67 ms) falls just under the S6/S7 seam, so S7's
opening scenes start at 66566.6 in the assembled config.


---

## s1 — 0 – 10200 ms — measurements and build notes

Frames: `ref/f720/fNNNNN.jpg`, n = t·30. Stage px (1280x720). Tools in `sections/s1/tools/`
(bbox, pilltrack, runs, blob, words, tiles2, rim, fitbez = random-search cubic-bezier fit).

Ground: graphite [38,40,37] on every frame 0–306 (corner.txt + spot checks). No ground change in range.
f306 (10.200s) is EMPTY ground — the seam frame carries nothing.

### Beat list (frame-exact)

| frames | t (s) | beat |
|---|---|---|
| 0–12 | 0–0.40 | search pill at rest, dead still |
| 13–29 | 0.43–0.97 | push 1 (1.00 → 2.03x) on the pill's LEFT edge |
| 15–37 | 0.50–1.23 | I-beam pops in at (512,472) pill-space, flies up-left rotating −55° → 0, lands on "Search"; press f33–35, gone f37 |
| 34–55 | 1.13–1.83 | push 2 (2.03 → 6.25x), +37px drift right |
| 38 | 1.267 | placeholder clears; glow starts ~f35 |
| 39–49 | 1.30–1.63 | "We killed" types, 1 glyph / 1.25 frames, newest glyphs cyan [96,182,212] |
| 55–66 | 1.85–2.25 | whip-pan 1 (−223px), dawn tile slides in from +250px |
| 70–87 | 2.35–2.90 | whip-pan 2 (−552px), navy tile slides in |
| 88–101 | 2.92–3.37 | whip-pan 3 (−209px), ember tile slides in |
| 101–109 | 3.37–3.63 | hold |
| 109–121 | 3.63–4.03 | accelerating lift (pill −28px, tiles −78px by f121) |
| 122 | 4.067 | HARD CUT (motion-matched: tiles keep rising) to the wide shot |
| 122–133 | 4.07–4.43 | tiles rise to apex (exp-out), dawn tilts −18.5°, ember +28–31° |
| 126–134 | 4.20–4.47 | "They" rises 46px, grey → white |
| 129–144 | 4.31–4.80 | bin rises from below (rim top 740 → 403) |
| 134–145 | 4.47–4.83 | tiles fall (exp-in) into the bin, converging on x≈640 |
| 139–155 | 4.63–5.17 | text block whips up 176px (They 318 → 142) to make room |
| 145–163 | 4.83–5.43 | "promised us to do" / "the work": grey rise, blue flash sweeps L→R (~95px/frame), hop home, white |
| 173–181 | 5.77–6.03 | glass tile blooms behind the bin (360x314, r≈88) |
| 181–187 | 6.03–6.23 | bin+tile shrink to dock scale (bin 0.62x) |
| 181–194 | 6.03–6.47 | block-1 words exit one by one: slide left (accelerating) + fade |
| 189–200 | 6.30–6.67 | tile widens into the dock (790x196 at 238–1028 × 410–606); divider; spark, mail, compass pop in right-to-left |
| 191–212 | 6.37–7.07 | "Instead, they / bury you in": words slide in from +30px, grey → blue → white |
| 198–224 | 6.60–7.47 | hand pops in over the mail tile, glides to the spark tile; spark hovers 1.2x (f210–216); press f220–224 |
| 225 | 7.500 | HARD SWAP dock → "Connect App +" card (682x190 at 298,413), pops 0.93 → 1 |
| 229–251 | 7.63–8.37 | block-2 words exit (Instead, f229 … in f246), slide left, blue-grey |
| 237–241 | 7.90–8.03 | 4 cards fan out BEHIND up-left (offset ≈ −48,−58 each) |
| 241–250 | 8.03–8.33 | dragged chain stamps out in FRONT up-right (≈ +50,−52 per frame) |
| 249–262 | 8.30–8.73 | cards spawn all over with a springy pop (0.86 → 1.05 → 1) |
| 250–270 | 8.33–9.00 | camera drift up (~105px/s), then accelerating pull (≈ 0.5·frames^2.75) |
| 266–282 | 8.87–9.40 | "buttons..." letters spring up, 48ms apart, overshoot ~11px (f274), dim → cyan-grey → white; dots lag (f278+) |
| 299–305 | 9.97–10.17 | word slides left, accelerating (−16px) |
| 306 | 10.200 | empty (cut to s2) |

### Key measurements

- Pill at rest: fill x 226–1053 (827), y 329–390 (h 61), r ≈ 18; fill [49,53,53] (left [46,50,48] → right [50,54,55]);
  1px light top edge [62,70,72]; faint teal glow above; dark 2px shadow below. Placeholder cap 14.5px at x 251.8, grey
  [165,167,163]. Segmented control x 880–1044, h 39, r 12, [31,33,31]; active chip x 961–1040, h 32, [58,60,58].
- Push 1 (log scale, fit rms 0.01 in ln s): start 0.453s, 672ms, bez(.846,.207,.066,.959), 1 → 2.03.
  Push 2: start 1.128s, 657ms, bez(.642,.287,.223,1.004), 2.03 → 6.25, plus +37px x drift. Origin = (226, 360):
  the pill's left edge never moves during push 1 (226 ± 1px on every frame f0–f33).
- Typed text cap 100px at 6.25x → 16px pill space (font ≈ 23px); starts at the placeholder's x (251.8).
- I-beam: 81 pill-px tall (163px at 2.02x), path (512,472) → (302,366) bez(.736,.458,.132,.903) 550ms; rotation
  −55° → 0; scale 0.45 → 1 (grows as it lands); drop shadow offset (81,81) → (45,47) pill px as it lands.
- Pans (screen px of the text start): 424 → 201 (f0 1.848s, 402ms, bez(.87,.159,.167,.997)); 201 → −351 (2.346s,
  496ms, bez(.647,.302,0,.983)); −351 → −560 (2.915s, 390ms, bez(.641,.215,0,.97)). rms 1.0 / 4.1 / 1.0 px.
  Each pan centres a span: [text start, tile0 right] at 685.5; [tile0, tile1] at 650.75; [tile0, tile2] at 633.
- Tiles: 317px at 6.25x (50.8 pill), pitch 382.5 (gap 10.4 pill), lead from text 15.4 pill. Slide-in offset decays
  ×0.72–0.75/frame (tau ≈ 115ms) from ~+250px; enters at 1.843 / 2.472 / 3.020s.
- Lift: pill y −0.72·(e^{0.306·frames}−1), tiles −1.32·(…), from f109.
- Wide shot: tiles 122px at x 428/639/849, y 343; apex 185/168/183 at f133 (rise tau 87ms); fall
  5.4·(e^{(t−f134)/99ms}−1). Bin: rim 213 wide, top 403, body to 632, bottom 162 wide; rise start 4.313s,
  447ms, bez(.786,.304,.196,.831), rim 740 → 403 (rms 2.6px).
- Words: cap 65px (font ≈ 93px Segoe), line pitch 96; block-1 cap tops 142/238/335, block-2 193/289; "buttons…"
  cap top 329, 448–819. Blue flash [27–36,142–148,190–195] held ~2 frames, ramp 1 up / 2 down. Block-1 whip:
  start 4.449s, 647ms, bez(1,−.105,0,.968), 176px (rms 1.1px).
- Dock (f205): 238–1028 × 410–606, r ≈ 62; tiles 144px, pitch 183; divider x 810; bin 850–985 (0.62x).
- Card: 682x190, r ≈ 48, text cap 52 (Segoe needs 79px), pad 67 / gap 60 / pad 70; backdrop blur makes
  the cards behind read as grey smears.
- Hand: ~95px glyph over the dock (f205), ~125–135px around the click and in the cascade.

### Mechanism notes

- The opener is ONE camera on a big canvas: two log-scale pushes on the pill's left edge, then whip-pans whose
  velocity profile is a sharp asymmetric S (accelerate ~6 frames, one huge frame, settle ~6) — never linear.
- The cut at f122 is motion-matched: the tiles accelerate upward into the cut and keep rising (decelerating)
  after it.
- The "word flow" is the film's text grammar here: words appear grey and LOW, rise to a hold just under the
  line, and a blue flash sweeping left-to-right pops each one home before it goes white. Exits go word by word
  to the left with acceleration.
- Scenes layer by startMs in the timeline (config-timeline sorts them). The cascade's back layer therefore
  starts at 6290 (before the "Instead" text at 6300) with clockMs 7490.

### Iterations

1. First build: geometry of the opener already within a few px; found: in-bin tiles offset by half the bin
   (local-coord bug), hand invisible (shared HandCursor size scaling has no effect — wrapped locally), card text
   7% small, back-layer cards painting over the text (z-index + startMs ordering), block-1 exits 2–3 frames late,
   dots of "buttons..." too early, typed glyphs staying cyan too long, glow too strong.
2. Second build: all of the above fixed; remaining deltas listed in the table below.
3. Third build: word size 91.5 / gap 0.19em (line-2 widths within 1-2%), glyph-top constant 0.745em (cap tops
   within 1px), letter rise dy0 90 / back 2.0 / 570ms (b trace f270-f284 within 1-4px of the reference).

### Motion traces, ours vs reference (from sbs.ours.mp4 vs ref/f720)

- Pill height f12-f56: within 1-4px on every frame (push 1 + push 2), excluding frames where a glyph crosses the
  sampling column.
- Text-start x through the three whip-pans f54-f101: within 0-6px per frame, same velocity profile (peak 84 / 164 /
  78 px per frame on the same frames).
- Navy tile y through rise/apex/fall f122-f144: within 2-5px. Bin rim f131-f144: within 2-5px.
- "They" block whip f139-f155: within 4px. "buttons" b f270-f284: within 1-4px (peak one frame late).

### PASS / PARTIAL / FAIL

| beat | frames | verdict | delta |
|---|---|---|---|
| Search pill at rest | 0-12 | PASS | geometry within 2px; Segoe placeholder a touch lighter |
| I-beam fly-in + click | 15-37 | PASS | path within ~10px mid-flight, lands on the same glyph; our beam a hair smaller at f20 |
| Push 1 / push 2 | 13-55 | PASS | per-frame pill height within 1-4px |
| Typing + glow | 38-56 | PASS | widths within 2%; glow similar extent, slightly softer |
| Whip-pans + tile slide-ins | 55-101 | PASS | per-frame within 0-6px; tiles are neutral AppTile stand-ins (orb vs dome etc.) |
| Lift into cut | 109-121 | PASS | exponential fit; icons over-lift matched |
| Toss / tilt / fall into bin | 122-145 | PASS | traces within 5px |
| "They promised us to do the work" | 126-194 | PASS | positions within 4px; blue flash order/timing per word; exits within ~1 frame |
| Bin, glass tile, shrink | 129-188 | PARTIAL | geometry right; reference icons read more inside the rim opening, ours a bit more hidden |
| Dock growth + icon pops | 188-200 | PASS | rects within ~10px; generic dark tiles for browser/mail |
| "Instead, they bury you in" | 191-251 | PASS | within 5px, colours/timing match |
| Hand + spark hover/click | 198-224 | PARTIAL | path and press timing match; hand glyph is the shared HandCursor (outline thinner than the reference's) |
| Swap to Connect App card | 225-236 | PASS | card 682x190 at the same place, pop 0.93 -> 1 |
| Card fan / drag chain / spawns | 237-262 | PARTIAL | mechanism + density + timing match; individual spawn positions approximate the chaos rather than copy it |
| Camera pull away | 250-272 | PASS | drift + power-law pull; ours ~10px lower at f269 |
| "buttons..." letter rise + exit | 266-305 | PASS | b trace within 1-4px; dots lag like the reference |
| Seam 10.200 | 306 | PASS | empty ground on both |

---

## s2 — 10.200 – 21.267 s (frames 306 – 638)

Stage px = 1280x720, frame n = n/30 s. Tools: `tools/bbox.py`, `edge.py`, `white.py`, `strip.py` (this dir).

### Beat list (frame-exact)

| frames | t (s) | beat |
|---|---|---|
| 306 | 10.200 | empty graphite (seam frame; s1's "buttons..." gone at 10.20) |
| 307–316 | 10.233–10.533 | "Then" enters: T-left 583→541 exp settle (−29,−14,−6,−3,−2…px/frame), lum 206→236→247→255 (opacity ~.77/.91/.96/1). Cap 64px (329–393), x-height 47 → Segoe 600 @ 91px |
| 316–332 | 10.53–11.07 | dead hold |
| 333–361 | 11.100–12.033 | PAN 1 (parallax): composer left 1280→352 (peak 198 px/frame at 11.50→11.53), "Then" 541→91 (peak 75 px/f). Both slow start, 1–2 frame velocity peak at p≈.45, long exp tail. Tables COMP_PAN1 / LEAD_PAN1 |
| 348 | 11.600 | comma pops on ("Then,") |
| 350–360 | 11.667–12.000 | words typed one per 2 frames: they .667, stop .733, when .800, it .867, gets .933, real 12.000; each enters lavender [~130,110,205]→white over ~0.12s (measured [184,176,206]→[223,220,237]→[247,247,251]) sliding in from +12px |
| 361–368 | 12.03–12.27 | hold |
| 369–393 | 12.267–13.100 | PAN 2: composer 352→242 (centred), peak 21 px/f at 12.68; "Then," moves 3.1x the composer (−330px) and leaves frame left by 12.83 |
| 397–403 | 13.2–13.433 | line deleted word by word (gone: 13.233/13.267/13.300/13.367/13.400/13.433, 1 grey frame before each) |
| 393–418 | 13.10–13.933 | composer top 320→553 (bottom fixed 685), peak 42 px/f at 13.47 |
| 402 / 409 | 13.40 / 13.633 | placeholder "Ask" then "Ask AI..." (cap 20px, [166,168,165], cap-top = bottom−101) |
| 411–426 | 13.70–14.20 | "Why did you stop?" fades in, rises 18px (506→488, exp), right-aligned to composer right (1037), [171,173,170] |
| 430/438/445/454 | 14.333/14.600/14.833/15.133 | refusal rows pop (hard), question jumps up per row; pill 52 tall, pitch 60, fill [48,50,47], r≈10, text [231,233,230] cap 20 |
| 452–470 | 15.067–15.633 | whole stack lifts 167px (STACK_RISE), peak 35 px/f at 15.37 |
| 463–470 | 15.43–15.63 | dock grows from centre: pill width 239/404/597/674/707/723/730, icons .74→.94→1; dock 275–1005 × 537–684, fill [31,33,30] |
| 468–480 | 15.60–16.00 | question exits upward, accelerating (ease-in ~3, 105px) |
| 466–483 | 15.53–16.10 | hand enters from left, hovers icon 1, slides to the AI tile (hover magnifies ~1.17), click 16.10–16.17 |
| 494–520 | 16.47–17.30 | drag: tile path 622,604 → 709,424 (16.8) → 840,448 (17.0) → into bin 850,580 (17.25); tile tilts; dock slot closes 16.55–16.85 (dock 730→560 wide) |
| 498–535 | 16.6–17.85 | chat follows as a rope: composer collapses to a ~110x18 bar trailing the tile (310x60 at 16.8), rows drag up-right and tilt (−5..−10° at 17.0), then pour one after another round an arc into the bin (17.3: rows on a diagonal at +35°; 17.6: vertical column above the bin; last row gone 17.85) |
| 537–550 | 17.900–18.333 | "Introducing" typed (I .900, n .967, t 18.0, r .033, o .067, d .133, u .167, c .2, i .267, n .3, g .333), centred, cap 63, cap-top 320 |
| 543–562 | 18.1–18.75 | hand travels trash → icon 1 (450,627 by 18.5), click ~18.62–18.75, icon magnifies |
| 566–576 | 18.867–19.200 | reverse genie (measured outline per frame, GENIE table): top rises 545→0 by 19.03 widening 224/334/490/684/864px, bottom pinned to icon until 19.0 then widens/drops; full frame at 19.2 |
| 574–588 | 19.13–19.60 | wordmark letters fade/blur in (A 19.13, s ~19.23, i ~19.30, d ~19.40, e ~19.5) at width 230 |
| 590–599 | 19.667–19.967 | wordmark punch: width 230→294→498→556 (x2.42), then 598 (20.1), 640 (20.4), 646 (20.8) |
| 624–638 | 20.800–21.267 | linear white veil: bottom px 2→19→56→110→163→219→254 = alpha (k−624)/14 exactly; text fades out 21.0→21.1 |

Curtain texture (19.5s): vertical ramp sampled x=680–760, per-channel horizontal profile rows 100–200 (left side darker/bluer), 14 flutes of exactly 91.4px (edges at 90,182,273,…,1188), sawtooth brightness inside each.

### Presets
- `sequoia-refusal-chat` (10200–19233)
- `sequoia-type-center` (17900–19233)
- `sequoia-light-curtain` (18850–21267)

### Verification (pairs: p1…p7, pfinal, pfix; sbs.mp4)

Per-frame traces ours vs ref (from sbs.ours.mp4 frames):
- Pan 1 composer edge: identical ±2px every frame 11.10–12.10.
- "Then" entry: ±1px; pan 2: ±1–5px.
- Composer shrink top: ±1px (bottom 684 vs 682).
- Stack rise: ±1px.

| beat | verdict | delta |
|---|---|---|
| "Then" entry / hold | PASS | ±1px, opacity curve matched |
| pan 1 + typing | PASS | ±2px; word colour ramp matched to 3 frames |
| pan 2 / "Then," exit | PASS | ±5px; our line 1 ~1% wider (Segoe vs grotesk) |
| delete + shrink + placeholder | PASS | ±1px, deletion frames exact |
| question + rows stacking | PASS | ±3px; small text Segoe 500 slightly heavier than ref |
| stack rise + dock entry | PASS/PARTIAL | rise ±1px; dock reveal ~10% narrower on 15.43–15.5 |
| hand + hover + click | PARTIAL | path ±20px; ref hand tilts while moving (ours upright); neutral app tiles |
| drag + rope into trash | PARTIAL | shape/rhythm match (rows drag, tilt, pour into bin by 17.85); composer bar collapses a little slower and is less visible 17.0–17.4; row poses ±40px mid-pour |
| "Introducing" type-on | PASS | letter frames exact; width 448 vs ~455 |
| reverse genie | PARTIAL | outline keyed per frame; side curvature and flute convergence approximate |
| wordmark reveal + punch | PARTIAL | timing/size match (widths ±10px); Segoe semibold vs ref's geometric grotesk; fluted-glass slicing approximated by 14 offset bands |
| white wash to off-white | PASS | linear veil matches per-pixel values; ends fully off-white at 21.267 |

---

## s3 — 21.267–31.733 (frames 638–951 @30fps clock), notes

Ground: off-white [254,255,253] for the whole range (corner trace, ref/corner.txt). One `sequoia-ground` scene.
Camera grammar: the panel world is static 22.2–26.1, one push-in 26.13–27.2, nothing else moves as a group except
the title block's re-centring and the chat group's rise + slow zoom.

### Beat list (absolute s / frame)

| beat | from | to | mechanism (measured) |
|---|---|---|---|
| A1 mark drop | 21.267 (638) | 21.9 | mark (435,342) Ø91 slides down from under a clip edge at y 252; bottom 258→389, offsets 131,111,88,61,40,28,20,15,12,9,7,5 (linear 0.1s then expo) |
| A2 line rise | 21.433 / 21.933 / 22.033 / 22.133 first visible | — | each line ~59px low, decays ×0.72–0.8/frame; line-1 fades in over ~0.22s, lines 2–4 ~0.15s |
| A3 block re-centre | 21.75 | 22.7 | line-1 cap top 313→176 (Δ137 = 3·pitch/2), progress table, peak 23px/frame at 22.0 |
| A4 blue band | 21.3 | 22.3 | band [110,150,166] σ≈55px, ~30px/frame, iso-lines tilted 42° (lower lines later) |
| A5 ink wave | 22.3 | 22.9 | front tilted 34.6°, mid crosses line-1 x=530 @22.467, x=890 @22.73; line-4 lags ~0.14s; ~360px grey→blue-grey→ink ramp |
| A6 exit | 23.033 | 23.333 | in place: ink → [110] (23.1) → [150] (23.133) → ground (23.333), no motion |
| T tracer | 21.5 | 23.87 | dot (blue [15,142,196] r5, white ring, soft shadow) from (163,640) up the left border, r=26 corner at 22.12, along top y=95, decelerating to x=1076; arc-length table (peak 73px/f at the corner) |
| T divider | 22.62 | 23.27 | x=375 sidebar divider grows down from the top border to ~y 485, grey 229→240 fade |
| T sidebar | 22.2 | 25.6 | wireframe sidebar (label, Tasks/Routines/Customize, bar, 4 skeleton rows) fades in 22.2–22.45; blue shimmer sweeps ~every 1.5s; hands over 25.3–25.6 |
| B1 "across" | 23.4 (702) | 23.73 | rises 58px (×0.69 then ×0.8/frame), colour [188,221,236]→[100,138,150]→[55,75,80]→ink by 23.73 |
| B2 head climb | 23.9 | 24.73 | x-height top 381→250, burst 24.03–24.1 (−10,−45,−27 px/f), then settle (table) |
| B3 staircase | 24.2 (726) | 24.9 | rows pop in at final y, already ink, displaced websites +145, accounts −145, history +49; one convergence curve 1,.50,.37,.30,.23,.19,.16,.13,.11,.09…; clipped at x=377 |
| B4 exits | 25.333 | 25.6 | each word accelerates left (×1.75–2.2/frame) then hard-cuts: head 25.533, rows 25.6 |
| C1 product UI | 25.3 | 26.1 | window chrome + slot fade 25.3–25.6, composer+mark 25.65–25.85, tasks area 25.7–26.0; dot fades 25.6–25.9; full window border from 25.3 |
| C2 push-in | 26.13 | 27.2 | scale 1→1.925 about (1110,270) (composer 521→1003px wide), slow-in to a peak at 26.63 (+0.19/frame), expo settle; tasks area fades 26.6–26.8 |
| D1 I-beam | 27.1 (813) | 28.1 | grows from a point (h 5→95 by 27.35) at (588,500), flies left to (274,363) peak 42px/f at 27.45, tilts with velocity (lagging) to −27° at 27.5, upright by 27.9; ghost shadow offset (+85,+86) blurred; fades 28.03–28.1 |
| D2 typing | 27.967 (839) | 28.967 (869) | "cancel all unused subscriptions and request refunds" 51 chars in 1.0s, per-frame char table from the measured text width |
| D3 composer lift | 29.45 | 29.933 | composer + mark rise ease-in to −26px, then HARD CUT at 29.933 (898) |
| E1 bubble | 29.933 | 31.25 | cut in opaque; group rise 55,33,26,…→0 (fast first frame then ×0.88/f); zoom 1→1.033 about (659,250) to 31.2, hold |
| E2 reply | 30.30 | 30.60 | word stream 13 words; each word light blue [160,208,228] → [80,158,200] → [55,105,135] → ink in ~0.26s |
| E3 exit | 31.267 | 31.667 | slide left accelerating (−32 @31.5, −120 @31.633) + fade (0 by 31.667); 31.7 blank |

Type sizes (Segoe UI stand-in): title 90px/600 (ref cap 64, x 49; width "work done" 421 vs ours 423), staircase
96px/600 (head width 262 vs 257), composer 25px/400 (+0.005em; typed width matches to 0px at 28.5), Tab 17,
"to switch" 19, lower row 20; chat 31.5px/400, pitch 38.2.

### Verification (pairs p1–p7, sbs consecutive-frame traces)

| beat | verdict | delta |
|---|---|---|
| A1 mark drop | PASS | path within 2px; mark glyph is the placeholder |
| A2/A3 lines + re-centre | PASS | line-1 top per frame within 1–3px 21.43–22.7; line fade within ~15 L units |
| A4/A5 colour waves | PASS/PARTIAL | front timing within ~1 frame; ref keeps a faint blue cast on lower lines a bit longer |
| A6 exit | PASS | |
| Tracer dot | PASS | dot x/y within 1–3px every frame |
| Divider / sidebar | PARTIAL | geometry matches; shimmer is approximate (ref timing irregular) |
| B1–B3 staircase | PASS | head top within 1px from 24.0; row baselines equal; Segoe word widths differ ("history" +29px) |
| B4 exits | PASS | within ~5px over 5 frames |
| C1 product UI | PARTIAL (by design) | product footage replaced by a labelled slot + drawn chrome/composer |
| C2 push-in | PASS | mark-top trace within 1px, composer edges within ~10px mid-push |
| D1 I-beam | PASS | bbox within 1–3px every frame incl. tilt |
| D2 typing | PASS | char count ±1 |
| D3 lift + cut | PASS | |
| E1–E3 chat | PASS | bubble edges within 0–3px; reply ~1px y, exit within ~8px |

Seams: 21.267 — both sides show only a sliver of the mark under its clip edge (s2 must end fully light at 21.267).
31.733 — s3 draws nothing from 31.667 on; at 31.733 the ref already shows s4's history icon (s4 owns it).

---

## s4 — 31.733–42.400 (frames 952–1271 on the 30fps clock)

Ground: off-white [254,255,253] the whole range, no change (corner trace 254 throughout).
Frame 951 (31.700) is blank (s3 has faded out); frame 952 shows the history icon alone.

### Beat list (frame-exact)

| frames | beat | mechanism (measured) |
|---|---|---|
| 952 | history icon pops | black, ~55px glyph, rotated ~+35–45° CW, turns back upright by ~970 (ease-out) |
| 954/957/961/965 | "searching" "browsing" "history" "for" pop | word arrives +25px right of its slot, settles 25,14,9,7,4,4,3,2 (settleDecay 280ms); colour per frame since appear [171,200,206]→[111,141,149]→[64,107,123]→[47,84,92]→[37,58,61]→[19,37,41]→[8,27,33]→[2,10,13]→black |
| 952–978 | whole line recentres | final layout x 176..1097 (centre 636), group offset 222,154,117,94,77,63,53,43,36,30,25,22,18,15,12,10,8,7,5,4,3,2,1,0 px/frame |
| 983–993 | exit | scale 1.00→1.12 about line centre, accelerating (1.005,1.01,1.015,1.02,1.03,1.04,1.05,1.065,1.095,1.12); icon/searching/for fade from 986.3 over ~5.7f; browsing/history from ~988.8 over ~4.5f; no blur |
| 994 | blank | |
| 995–1012 | "Credit card ⌄" pops grey [160,162,159] at 0.761x about (650,~360), settles 1−0.239·e^(−f/4.1) | |
| 995–1024 | teal shimmer band [92,148,170] L→R, centre x 286→1040 (~26px/f), half-width ~130 | |
| 1018–1034 | grey → black | darkest-pixel 163,145,128,104,60,19,0 at 1018/20/23/26/29/32/34 |
| 1020–1036 | dropdown expands | title left 370→123, chevron 875→1103; normalised p 0,.008,.016,.029,.045,.066,.115,.218,.741,.856,.914,.947,.967,.979,.992,.996,1 (expo in-out) |
| 1022–1031 | chevron turns 180° CCW | 0,40,55,92,130,135,140,150,175,180 |
| 1031–1049 | canvas lifts 221px | title centroid track 220.6,219.7,218.0,215.6,212.0,206.9,199.3,187.2,161.2,52.3,31.1,20.1,13.2,8.5,5.1,2.8,1.3,0.45,0 |
| 1037–1047 | dot1 at SCREEN y 140.4 while the canvas lifts | grows in (scale from sqrt of blob area .4→1 over 6f) |
| 1040/1042/1043 | rows pop | in-canvas offsets r1 −8→0 (9f), r2 +18→0 (4f), r3 +54,25,14,7,3,1,0 |
| 1048–1077 | dot1 draws timeline 141→545 (canvas), shrinks out 1075–1077 | |
| 1051–1150 | scroll 1 | ease in-out, peak 17px/f at ~1085, then constant ~3.3px/f drift (≈100px/s) 1113–1146 |
| 1067 | "Open Chase.com" step pops +46px, settles ×0.72/f | grey [104,106,103] |
| 1069–1118 | window-draw dot | rises x=124.4 from canvas 749, r40 corner, runs the top edge (643.7) to x≈993 accelerating to 58px/f then decelerating; trail grey with blue tail; shrinks out 1111–1118 |
| 1082– | dot2 draws timeline 621→1260 (canvas), grows in 1082–1100 | |
| 1097–1115 | window face revealed | diagonal mask, iso-lines u = x + 0.95·y, ramp width 875, P(u) −192,−75,30,…,1327 at 1098..1110 (~120–140/f) |
| 1150–1254 | scroll 2 | fast ease (peak 47px/f at 1167), decays to 0 by ~1220; camera tracked off the window's rigid bottom edge |
| 1169 / 1176 | "Sign in…" (+28, ×0.8/f) / "Open last month's…" (+26) pop | connector segments grow 1173–1176, 1180–1185 |
| 1179–1194 | summary streams in | ~1.5 words/frame, each word mid-blue → [74,142,165] → [30,31,29] in 3 frames |
| 1216–1271 | dot3 | grows in at canvas 1646, draws down, r27.5 turn right at canvas 1742.9, then pan right (0.1→90px/f peak at 1255, −37.7 at 1263, min −21.5 at 1268, −32 at 1271), r27.5 up-turn at canvas x 1305.9, up to canvas 1496.5, r turn right |

Seam at 42.400 (frame 1272, s5's first frame): horizontal line at screen y≈359 from the
up-turn corner (screen x≈21, vertical going down to y≈605 then left off-frame) to the dot
at (288.5, 358.8); camera x pan still running at ≈ −32px/frame and accelerating; the dot
then decelerates to rest at x≈507 by 42.63 (s5's job).

### Type (Segoe UI stand-in, calibrated against reference ink boxes)

- chain: 66px / 600 / tracking −0.025em / gap 11; x-height band 342–376 vs ref 343–377.
- title: 91px / 600; ink x 124–565 vs ref 124–568, y 103–171 vs 105–171.
- rows: 32px / 500(→Segoe regular); row text 185–962 vs ref 183–957.
- steps: 32.5px / 400; paragraph 31.5px / 400, line pitch 37, width 1010 (wraps after "month.").

### Camera source

cam.txt (sub-pixel FFT cross-correlation, valid ≤1150; checked against row3 at 1100 within
1px) → biased low during the 47px/f scroll (accumulated 33px) so 1150–1254 is taken from the
window's bottom edge (rigid, canvas 1215.4); 1237–1263 x from the window's right edge
(canvas 1154.46); 1264–1271 x from the vertical line of the up-turn. Keys thinned to
0.35px linear error (134 keys).

### Verification

Pairs p1–p6 read; sbs `sbs.mp4` rendered once. Per-frame camera deltas (ours vs ref,
shift.py on both): within 0.1–0.7px/frame everywhere (e.g. 1166 ref −38.6 / ours −39.0;
1256 dx ref −88.5 / ours −88.6). Chain/header extents per frame within ≤5px (952–1036).

| beat | verdict | delta |
|---|---|---|
| icon + word pops, colour ramp, slide | PASS | ≤5px extents; first-frame colour of each word approximated by one ramp (ref varies by sub-frame phase) |
| line recentring | PASS | ≤5px per frame |
| exit push-in + staggered fade | PASS | fade timing ±1 frame |
| Credit card pop/scale/shimmer | PASS | shimmer band is a 3-stop gradient; ref has a slightly softer band and a faint second teal tint while darkening (not rebuilt) |
| expansion + chevron turn | PASS | ≤4px; chevron stroke a touch lighter |
| canvas lift + rows | PASS | rows ±2px |
| dot1 / timeline line | PASS | dot grows in by scale (ref blob area) |
| Open Chase step | PASS | |
| window outline draw + reveal | PARTIAL | geometry/timing match; face is a placeholder slot (by design) so the reveal reads only as a faint grey face |
| scroll 1 / drift / scroll 2 | PASS | <1px/frame |
| Sign in / statement steps + segments | PASS | ±2px |
| summary stream | PASS | font wraps identically |
| dot3 path + pan | PASS | dot ±3px at 41.7/42.0/42.27 |

---

## s5 — 42.400–53.133s (frames 1272–1594 @30fps clock, 1280x720 stage)

All numbers measured on `ref/f720` full-decode frames. Scripts in `py/` (shift.py =
phase-correlation per-frame content shift, dot.py = blue-dot centroid, lines.py = text
row extents, band.py / vline.py / stream.py = targeted extents; *2.py variants take a
frames dir first so they run on our render too). `camtable.py` and `gen.py` turn the
traces into the configs; every table in the scene files is one of these traces.

Ground: off-white [254,255,253] in every corner 42.40–53.03 (dips to 243 at 50.9–51.4
are content passing, not a ground change). Dark arrives only as the disc (53.03–53.13).

### Beat list

| # | frames | t (s) | what |
|---|---|---|---|
| A | 1272–1290 | 42.400–43.000 | dot runs right on the timeline line, decelerating (world v 87→3 px/f, expo-out), stops at world x 352; camera pans right 31→24 px/f |
| B | 1289–1316 | 42.967–43.867 | pill outline draws out of a "{" fork at the dot (both halves at once, arc front 44→72→45 px/f), copy reveals L→R through a ~300px soft mask (front 59 px/f = 1770 px/s, starts 42.88), dot shrinks into the fork 42.95–43.13 |
| C | 1307–1321, 1336–1342 | 43.567–44.033, 44.53–44.73 | shimmer: blue band [114,170,192] ±175px sweeps the copy, ease-in-out 0.47s, period 0.667s |
| D | 1316–1343 | 43.867–44.767 | connector draws slowly out of the right notch (≈6 px/f stub, corner r25, trunk 3 px/f); camera pan bends from right (−39 px/f at 44.1) to down (−22 px/f at 44.9) |
| E | 1343–1368 | 44.767–45.600 | dot fades/grows in at the trunk head (scale 0→1 over 0.3s) and drops, accelerating to ~65 px/f world, blue comet trail ~110px behind it ([97,143,158] core); camera y glides out (×0.88/f decay), x (×0.9/f) |
| F | 1360–1376 | 45.333–45.867 | branches draw off the trunk (cubic, 48 down / 55 out, then 50px tail fading to 0), rows pop at 45.500 / 45.600 / 45.700 (one frame, full opacity) and slide left from +63px, ×0.78/f |
| G | 1375–1399 | 45.833–46.633 | push-in 1.00→1.59 (row spacing 128→202px), ease-in-out, peak +0.09/f at 46.17; rows zoom about ≈(362,140); line layer lags by +51px×(s−1) |
| H | 1395–1415 | 46.500–47.167 | rows 2/3 fade (46.35–46.67); row 1: label erases L→R (≈55 px/f), task erases R→L (≈120 px/f), then agent icon (192→564) and glyph (762→657) converge on frame centre, gap 34px (ease-in then expo-out, peak 113 px/f at 46.9) |
| I | 1418–1446 | 47.267–48.233 | branch remnants fade (47.33–47.47), icon tints to pale [200,212,215], pair pops ×2.32 about frame centre (47.43–47.83, ease-in-out), holds, fades 48.13–48.23 |
| J | 1427–1459 | 47.567–48.633 | log rule draws down at x=124.5 from y40 to y335 (expo-out, 0.43s); "Inspecting..." (30px, [198,207,207]) reveals 48.23–48.33, blue shimmer 48.37–48.57, erases L→R 48.55–48.63 |
| K | 1461–1470 | 48.700–49.000 | paragraph streams (chars 4/24/33/46/56/62/70 at successive frames); each word light blue [166,199,209] → blue [77,142,166] → ink after ~2 frames |
| L | 1476–1544 | 49.200–51.467 | row "Starting a chat..." pops 49.200, "Asking for a refund" 49.433 (both slide up 40px, ×0.73/f), result line streams 50.20–50.33; column scrolls (ease-in-out 49.2→50.0, slow drift, accelerating exit 50.7→51.47: 64 px/f at the end) |
| M | 1545–1560 | 51.500–52.000 | hard cut: user bubble (fill [235,237,234], 537×82, r≈20, text 30px) already moving up, settles +46→0 (27,16,11,8,5…); reply streams 51.53–52.07 at x118 / y383, lines 39px |
| N | 1548–1590 | 51.6–53.0 | slow linear push 1.0→1.0225 about (640,398) |
| O | 1582–1593 | 52.733–53.100 | graphite disc grows from (527,441) — r 2.5,4.5,10,19,29.5,45.5,70.5,114,179.5,333,554,~640 per frame (×1.55–1.9); centre drifts to frame centre ∝ r/750 |

World coordinates for A–I = stage px of frame 1290 (43.000s) at scale 1. Pill: left
edge x=391.5, centre y=358.5, h=166, corner r=25, notch r=20, text 93px (cap 65px),
pad-left 56, right edge 1785 (pad-right 110), copy colour [180,182,179]. Trunk x=1911
(pill right +126). Rows centred y 812.5 / 940 / 1067.5; icon 37×34 [158–168 grey],
label 33px [160,162,159] with a static dark band over "suba" ([40,42,39]), glyph 36px,
task 33px semibold [0–13]. Line work [228,230,227] 1.5px; dot Ø10.8 [12,140,192] with
2px white ring and a soft blue drop shadow (+11px, blur 9).

Type note: Segoe UI stands in. Cap heights matched (pill 93px → 65; rows 33px → 23;
log/chat 30px → 21). Width differs: pill copy tracked −2.5px (Segoe is 75px wider over
the line), row copy −0.3px, body +0.8px (Segoe is 6% narrower than the reference body
face) plus a 0.3px text stroke (Segoe 400 had 12% less ink than the reference's ~500).

### Verification

Per-frame camera shift (phase correlation, ours vs ref) identical to the pixel 42.43–44.93
(table replay). Dot track within 1–2px 44.80–45.47. Collapse + pop: icon/glyph x within
3–6px every 3rd frame 46.5–48.1. Log/chat text rows within 1–5px at 17 sampled frames
48.4–52.67. Seams: 42.400 mean abs diff 1.69/255; 53.100 dark fraction 0.940 vs 0.949.

### PASS / PARTIAL / FAIL (after 5 build/compare iterations)

| beat | verdict | delta |
|---|---|---|
| A line + dot run, pan | PASS | camera/dot per-frame identical; dot 1px smaller core |
| B pill draw + reveal | PASS | outline/fork timing ±1f; letterforms are Segoe (tracked to the reference width) |
| C shimmer | PASS | band position/period matched; colour sampled |
| D connector + pan bend | PASS | shifts identical |
| E dot drop + trail | PASS | dot ±1.5px; trail strength is speed-gated, visually close |
| F branches + row pops | PARTIAL | branch is a fitted cubic (≤3px); row x ±10px from font widths; glyphs are neutral tiles (L/N/a) |
| G push-in | PASS | rows y ±2px; trunk ±5px (needed the measured line-layer parallax) |
| H erase + converge | PASS | icon/glyph ±3–6px; erase fronts ±1f, soft (30px) vs crisper reference |
| I tint, pop, fade | PARTIAL | geometry ±4px; the agent icon is a drawn stand-in (reference icon has a cool gradient) |
| J rule + Inspecting | PASS | |
| K paragraph stream | PASS | word arrival ±1f, colour lag 15/50/65ms |
| L rows + scroll | PASS | ±1–5px through the accelerating exit |
| M bubble + reply | PASS | bubble +8px wider (tracking); reply ±2px |
| N push | PASS | |
| O disc | PASS | radius table replayed in log space; edge crisp |

---

## s6 — 53.133–66.567s (frames 1594–1996) — measurements and verdicts

All px are 1280x720 stage px; frame n = n/30 s (ref/f720 full decode). Tools in `tools/`
(cyan.py / cam.py chart camera, rows.py / rowr.py / rowsfit.py bar growth, lines.py text bands,
circ.py circle fit, cmp.py / grey.py pair comparison, canvas.py camera model, gen.py config).

### Beat list

| frames | s | beat |
|---|---|---|
| 1594 | 53.133 | s5's dark circle wipe, last frame: disc (625,368) r≈700, off-white corners; cyan glow at left edge (x0,y360). Full dark from 1595. |
| 1595–1619 | 53.17–53.97 | lead bar = glowing line shooting in from the left: screen right end 8→1185 (smooth in-out, peak 72px/f at 1605–1607), thickness 10→79, centre y 357→274. Broad flat cyan haze ([37,45,47]) over most of the frame 1599–1617, gone by 1623. |
| 1606–1650 | | grey bars grow from the left (staggered ~4f), heights at camera scale (no own scale). Row width progress fitted as lurch (start 1606.5/1610/1614/1617, ta 8/8/9/13 f). |
| ≤1606–1648 | 53.3–54.93 | camera pull-back (isotropic; bar pitch & width measured each frame): s 2.08 → 1.80 (1611) → 1.66 (1614) → 1.325 (1620) → 1.16 (1628) → 1.00 (1648), about ≈(515,303). |
| 1648–1716 | 54.93–57.20 | slow ACCELERATING pull-back s 1.00 → 0.976 (1664) → 0.957 (1680) → 0.921 (1700) → 0.849 (1716), origin drifting ≈(585,299)→(634,356). |
| 1622–1650 | | labels word-by-word (dim 0.3 + 0.2em low, settle ~4f), values digit-by-digit (+0.3em right); title 1628/1632/1636, subtitle tokens 1638→1649. |
| 1717 | 57.233 | hard cut to big type. |
| 1717–1733 | | "Anything" typed: letters at 1717,1720,1722,1724,1726,1728,1730,1733, centred on visible letters (c≈641). Cap 63 px, x-height 48 → Segoe UI 600 @90px. |
| 1719–1733 | | block offset 85px → 0: lurch, jump frame 1724→1725 (+36→+16). "you can" lands 1725. |
| 1733 / 1740 / 1749 | | "do" (+33), "in a" (+36), "(globe) browser" (+31) rise in: 0.4e^(-n/0.8)+0.6e^(-n/5.2). Lines laid out for full content (no re-centre), baselines 300/392/482, pitch 91. |
| 1768–1779 | 58.93–59.30 | tear-apart: "in a" −71px ^2.7 / 5f, gone 1774; "do" +23px / 10f; "you can" −19px from 1773, gone 1779; "Anything" −23px up from 1774; all gone 1780. Line 3 re-centres (lurch 1770, jump 1773→1774). |
| 1784–1800 | 59.47–60.0 | "(globe) browser" rises 482→391 baseline (lurch, jump 1790→1791). |
| 1807–1816 | 60.23–60.53 | globe shrinks ~0.88, hard swap at 1811 to mark + "Aside" (left edge kept), mark pops 0.85→1. |
| 1833–1842 | 61.1–61.4 | lockup rises 391→300 (lurch, jump 1837→1838). |
| 1844–1851 | | lockup slides to centre (c 590→636), lurch. |
| 1846–1855 | | "can do it for you" appears at +65 and rises (single exp τ≈2.2f), centred. |
| 1874–1881 | 62.47–62.70 | deleted one non-space char per frame to "can do"; line left edge lurches 322→525 (stem rests at centre+19). |
| 1885–1895 | | lockup leaves upward −33px accelerating, gone 1895. |
| 1896–1906 | 63.2–63.53 | "can do" slides left to the drum row (lurch, jump 1901→1902). |
| 1904 | 63.467 | drum appears: icon + "sign in" white at column x≈645 (baseline 391), grey list below (white @ 0.10, pitch 91); column settles +13px right. |
| 1917,1924,1930,1934,1938,1940,1942 | | hard steps (433,233,200,133,133,67,67 ms): messaging, company/internal tools (2 lines), payments, video play, documents, spreadsheets, presentations. Icon pops 0.88→1 over ~3f on each step. |
| 1947–1951 | 64.9–65.03 | "can do" rises −38 accelerating, gone 1951; "presentations" loses its "s" at 1949. |
| 1952–1963 | 65.07–65.43 | one char deleted per frame to nothing; icon+word group re-centres on the icon (in-out p2.5, 1950→1963). |
| 1963–1966 | | outline icon alone, shrinks 81→74px (anticipation). |
| 1967–1996 | 65.57–66.53 | icon switches to filled form; push-in measured: width 72→81 (1970)→101 (1975)→145 (1978)→265 (1980)→388 (1982)→450 (1986)→480 (1992)→522 (1996). Centre y 366.5, x 644→634. |
| 1997 | 66.567 | hard cut to off-white (s7). |

### Verdicts (after 3 iterations; pairs in pair1–pair4, traces compared on extracted sbs frames)

| beat | verdict | delta |
|---|---|---|
| seam frame 1594 (circle tail) | PASS | disc geometry from circle fit; glow at left edge present |
| line shoots in + haze (1595–1620) | PASS | right end/thickness from the measured trace (≤3px); haze flat tint matches level, slightly softer edges |
| camera pull-back 1620–1716 | PASS | s within 0.003, L/R within 1–3px every 8 frames |
| grey bars grow | PARTIAL | row timing within ~1 frame; widths during the fastest frames up to ~40px off |
| label/value reveals | PARTIAL | word timing generic (rowAt + 133ms/word) vs measured irregular stagger (±1–2f per word) |
| chart type | PASS | cap 21 / font 30px; Segoe widths ±3% |
| "Anything" typing + block lurch | PASS | letter frames exact; positions ±4px |
| word rises / tear-apart exits | PASS | ±2–5px per frame on measured traces |
| browser rise / swap / Aside rise / slide | PASS | ±2–4px; "Aside" Segoe word ~12px narrower |
| claim rise / deletion / shift / slide | PASS | deletion frames exact; edges ±10px (Segoe "can do it for you" 4.5% wider) |
| drum steps / icons / grey list | PASS | step frames exact, column/stem ±3px; grey list pitch after the 2-line item ~10px tighter than ref |
| outro deletion / group re-centre | PASS | ±5px |
| filled icon push-in | PASS | bbox within 1–2px at 1967/1980/1990/1996 (glyph is a local drawing, proportions matched to ref 1990) |

Known caveats: Segoe UI stands in for the grotesk (some words 3–5% wider); the
mark is SequoiaMark (pine), the third-party icons are Lucide/local drawings; the
ground in screenshots reads [37,39,35] vs ref [37,39,37] (stage colour pipeline, all sections).

---

## s7 — 66.567–87.533 s — measurements and verdicts

Frames: ref/f720 fNNNNN (n = t·30). Ink blobs measured with `words.py` (row bands, then
word segments; threshold 90 on |rgb − ground|), per-word traces with `segs.py`, laptop
edges with column/row run profiles. All values stage px (1280×720). Every key in gen.mjs
is one of these per-frame measurements; cuts are placed half a frame before the frame
they first appear on.

### Type
One size for the whole section on both grounds: x-height 49–50 px (`e` 335–385,
`runs` 433–483, `own` 342–391, `aside.com` 326–392). Ref ascender/descender only 17 px
beyond x-height (Inter-Display-ish); Segoe UI's are ~23 — tops/bottoms of our words sit
~6 px further out (unfixable with the system font; baselines match to ±1 px).
Widths: Segoe UI 600 at 100 px with tracking −0.058 em matches ref word widths within
~2 % (`everything` 423 vs 420, `locally,` 252 vs 258, `encrypted` 402 vs 410).
Word gap (ink→ink) 26–27 px → flex gap 19 px. Ink: [2,4,1] / white; field grey [114,116,113].

### Beats (frame-exact)
| # | frames | what | mechanism (measured) |
|---|---|---|---|
| A1 | 1997–2053 | "everything is private" typed, centred, baseline 385 | 1 char/1–2 frames (list in gen.mjs), centred so it grows both ways; space typed on its own frame (2021, 2025) shifts the line ½ space. Hold 2033–2045. 2045–2053 words SPREAD: positions scale about x≈1075 while glyphs keep size — everything dx 0,−3,−8,−16,−26,−38,−54,−76,−112 (accelerating), is −1…−71, private −1…−29. |
| A2 | 2054–2095 | "everything" cut → "is 🔒 private" | 2054 cut, is/private continue left and settle (expo, ratio ~0.65/frame: is 514→425); lock pops in the gap at 2056 (scale .86→1 over 5 f, bounce dy −4,−7,−9,−4,+2), shackle drops 2069–2071. 2062–2072 lock+private jump up 84 px (in-out, peak 35 px/f at 2067–68) while "is" lags (−1…−40, accelerating); "is" cut 2075, row re-centres +45→+20 (expo). |
| B | 2075–2095 | "under your" rises in, "control" | L2 baseline 393 enters +48 (ratio 0.6/f); 2080–2089 slides −148 (in-out) as "control" cuts in at 2086 (+14→0). Exits staggered & accelerating: L1 −1,−4,−15 cut 2093; under −3,−8 cut 2095; your −1,−4,−18 cut 2096; control cut 2096. |
| C | 2095–2127 | "Data | never leaves" / "your device" | Data (left 288, baseline 301) rises +20→0 in 4 f; "never leaves" RIGHT-anchored at 989 and typed (5 chars at 2096, then one per frame 2100–2107) so "never" slides left as letters appear; "your device" (left 443, baseline 392) rises +50, ratio .47. |
| D | 2111–2182 | laptop | bezel top per frame 717→604 (2111–2118 expo-out) → 107 (2118–2135: accelerating to 153 px/f at 2125–26 then ×0.55/f settle); bezel 278–1000, deck 219–1061 / 590–613. Pull-back 2136–2152 about (640,360) 1→0.931, accelerating. CUT 2153 to closed lid from above: 577×401 slab, grad [102,100,103]→[17,19,16], scale 1.107→1.0 decelerating by 2168; exit 2172–2182 up (−7…−552, accelerating then easing as it leaves). Screen = labelled slot. |
| E | 2180–2248 | "Everything / runs ▭ locally," → "▭ locally, encrypted" | Everything (left 306, base 383) +20→0; runs/locally (base 483) +21→0 from 2182; drive icon cut-in 2186 (scale .87→1). 2189–2200 runs −77 / icon+locally +178 (in-out, peak 72 px/f). 2200–2204 Everything up (−23) & runs down (+23), cut 2204/2205; icon+locally rise 90 (2200–2211) then slide −455 (2207–2224, peak 149 px/f). "encrypted" scrambles 2220→2239 (9 glyphs always, one more real char every 2 f, garbage re-rolled every 2 f). Exit up 2245–2248, cut 2249. |
| F | 2249–2377 | "Aside won't let AI" → password field | Aside rises +13 (2249), won't/let +14 (2251), AI slides in +16 (2253) — all expo. 2263–2267 Aside slides left (accelerating), won't/let lift and cut. Camera pan carried by the row from AI's x: 2268–2310 (0 → −985, whip at 2275–77: −208 px/f) then from the field's right edge to 2377; field enters ahead of the pan (extra dx 250→0, 2269–2286). Field 128 px pill, r≈22, text→eye gap ~140, eye 77 px, deep soft shadow. Cursor (≈105 px hand) rises from bottom-right 2310→2326, rides the eye, press 2328–2330; eye→eye-off + asterisks 2331–2333 (pitch 43 px, asterisks narrower than text so field width holds); cursor fades 2334–2336. Push-in 2365–2377 1→1.091 about centre. |
| G | 2378–2402 | HARD CUT to graphite (79.267): eye-off alone | same eye-off position across the cut (590–689); scale 1→1.12 by 2386 (decel), slide left 2392–2402 (accelerating, −90), cut 2403. |
| H | 2403–2451 | "Bring your own / subscription" | each word enters from the right (+170/+94/+64) with expo settle and a 3-frame grey→white fade, 2-frame stagger; line 2 rises in +49 at 2414 while line 1 lifts 44; 2421–2428 line 2 makes room for the key (+108); line 1 dims & lifts, cut 2428; key slides left & fades 2434–2439; subscription slides left 2436–2451. |
| I | 2440–2489 | model conveyor into the app tile | burst icon slides in 2440–2444 (1017→904); app tile (159 px, [28,30,27], mark 0.64) lands at 2452 (+46→0 expo); icons at 155 px spacing pop in (2453/2455) and ride a conveyor u(t) that accelerates to 130 px/2f (2478) then eases; each icon shrinks linearly as it nears the tile and passes BEHIND it; tile shrinks .975→.86 (2486–2489) and cuts to the bare mark. |
| J | 2490–2557 | mark → "[mark] Aside a browser / that does your" | bare mark 75→71; slides left 2497–2504 as "Aside" cuts in (2502); slides again 2510–2520 as "a browser" rises in (2516, +29); "that does your" (left 399 = Aside's left, base 486) rises in 2522. Exit: mark+Aside lift & cut 2544, "a browser" slides right & cut 2548, line 2 rises 93 to line 1's baseline and drifts right (2549–2557). |
| K | 2558–2626 | "your" + "work" → aside.com | hard swap to "your" alone (433, expo from −24), "work" drops in from above (−22) at 640; 2569–2583 they part (±361, in-out, peak 166 px/f) and dim to 17 % (2574–2577); "aside.com" typed centred from 2575, one char per 2 frames; your/work slide off further and cut 2595. Hold to end. |

Ground: off-white [254,255,253] from the 66.567 hard cut; hard cut to graphite [38,40,37]
on frame 2378 (79.267). Verified on frames 2377/2378.

### Verdicts (after 3 build/compare iterations; r1→r2→r5, sbs.mp4)
| beat | verdict | delta |
|---|---|---|
| A1 typing + spread | PASS | char timing frame-exact; word x within 2–8 px; glyphs 6 px taller (font) |
| A2 is/lock/private | PASS | positions ±5 px, lock 3 px wider; jump/lag timing per-frame |
| B under your control | PASS | ±6 px; ref has 2–3 px per-word baseline wobble we only partly carry |
| C Data never leaves | PASS | right-anchored typing reproduced; ±3 px |
| D laptop / lid | PARTIAL | geometry & motion per-frame within 2 px; screen is a slot (by brief); deck drawn simpler (no feet/sheen); lid has no logo (Apple logo removed — no generic glyph added) |
| E locally/encrypted | PASS | slide per-frame within 1 px; scramble glyph set generic |
| F won't let AI / field / cursor | PARTIAL | pan & entry per-frame; field text ~3 % narrower; shadow slightly lighter; hand glyph is a local drawing; asterisk glyphs Segoe's |
| G eye-off | PASS | same rect across the cut, scale/slide per-frame |
| H Bring your own | PARTIAL | positions ±8 px; fade levels from peak brightness (approx.); line 1 sits ~5 px lower vs line 2 |
| I conveyor | PARTIAL | timing/positions ±8 px; icons are generic stand-ins (burst / slashed circle / filled sparkle / bot / aperture), ref's star has a blue gradient (ours flat [88,140,245]) |
| J mark + a browser | PASS | ±4 px; SequoiaMark in place of the Aside mark |
| K end card | PASS | ±3 px, dim 17 % matches |
