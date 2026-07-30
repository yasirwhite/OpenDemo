# Zoom map — `kite_official_sample_1.mp4`

Measured at **10 fps (461 frames)** with an edge-based bounding box (`zoommap.mjs`), because the
luminance mask conflated screen brightness with framing. `w%` = subject width as a share of frame
width. `cx/cy` = edge centroid, `cy` rising means content moves **down**, i.e. the camera pans **up**.

## The governing idea

The film is **not 13 independent shots.** It is a small number of **continuous camera moves**, and the
"cuts" are almost entirely **scale changes on the same scene** — same subject, same angle, same ongoing
motion, different zoom level. Three rules fall straight out of the numbers:

1. **Each section has a HOME framing it keeps returning to.** Cut 1 settles at `w = 71.9%`. After the
   punch-in, 4.6 s returns to `w = 70.6%`. That is the same framing, not a similar one.
2. **Zoom changes are either INSTANT or EASED — never a creep.** Inside a held shot the width is
   constant to within ±1% for seconds at a time. Movement happens between shots, not during them.
3. **The camera's drift continues ACROSS the cuts.** The lateral drift in 0–8 s and the upward pan in
   14–18 s both run straight through the cut points. That continuity is what makes it feel like one
   camera in one room rather than a montage.

And underneath all of it: **the camera moves, the device does not.** Nothing in the reference rotates a
device in place.

---

## Section A — 0.0 to 8.0 s · one UI flow, one home framing

| t | w% | h% | cx | what is happening |
|---|---|---|---|---|
| 0.0 | 58.4 | **14.2** | 47.5 | laptop **shut** — h = 14% is a flat slab |
| 0.2 | 66.9 | 53.6 | 47.8 | lid rising fast |
| 0.5 | 70.2 | 86.7 | 48.4 | lid nearly open |
| 0.8 | 71.4 | 91.4 | 48.6 | **settled** |
| 0.8→1.6 | 71.4→71.7 | 91.7 | 48.6→49.1 | **locked, 0.9 s of stillness** |
| **1.7** | **96.4** | 89.7 | 51.6 | **FLASH CUT** — instant punch to 96%, no transition |
| 1.7→4.5 | 96.4→94.2 | — | 51.6→46.5 | locked (1% drift over 2.8 s) |
| **4.6** | **70.6** | 91.7 | 49.2 | **FLASH CUT back to the home framing** — 70.6 vs 71.9 |
| 4.6→7.9 | 70.6→70.5 | 91.9 | **49.2→51.4** | width locked; slow **lateral drift** |

The lid open takes **0.7 s** and the camera zoom under it is gentle — `w` only goes 58.4 → 71.4, a **1.22×**
push. The lid changes `h` from 14% to 91%; the camera barely changes `w`. The dramatic part of that shot
is the *device opening*, not the camera. `bot` sits at 99% throughout — the base is pinned to the bottom
edge, which is your "a tiny bit of keyboard visible at the bottom".

Then 1.7 s is a **pure scale jump with zero camera movement** — exactly your "flash cut to the zoomed in
element". The content change at 2.3 s (`h` 89.7 → 97.5) is the Record-this-display overlay appearing,
not a camera move: `w` doesn't budge.

4.6 s snaps back to **the same home framing** and then the only motion for 3.3 seconds is `cx` sliding
49.2 → 51.4. That is the consistent left/right drift you described, and it is *slow* — about 0.7% of
frame width per second.

## Section B — 8.0 to 12.0 s · device view → flat app

| t | w% | what is happening |
|---|---|---|
| **8.0** | 63.4 | **CUT** to the flat/floating app view |
| 8.0→8.7 | 63.4→76.9 | **eased interpolated zoom in** over 0.7 s |
| 8.7→10.1 | 77.2→77.5 | **locked for 1.4 s** |
| **10.3** | 94.4 | **CUT** — punch to full-bleed |
| 10.4→11.9 | 84.7→87.7 | slow settle |

This is the one place with a conventional eased zoom — 0.7 s in, then a long hold. Everything else in the
film is instant.

## Section C — 12.0 to 18.1 s · the second lid open, then a continuous pan up

| t | w% | h% | cx | cy | what is happening |
|---|---|---|---|---|---|
| **12.0** | 44.8 | **8.9** | **66.7** | 68.8 | **CUT — laptop SHUT again**, sitting **right of centre** |
| 12.3 | 51.7 | 62.2 | 61.8 | 49.3 | lid rising |
| 12.9 | 63.1 | 71.7 | 58.0 | 53.2 | open |
| 13.0→13.8 | 63.4→63.8 | 71.4 | 57.8→57.6 | 53.6→54.6 | **locked** |
| **13.9** | **81.9** | 87.8 | 53.8 | 44.0 | **FLASH CUT** in |
| 13.9→14.5 | 81.9→82.0 | 88.3→89.7 | — | **44.0→45.5** | width locked, **panning up** |
| **14.6** | **95.5** | 84.7 | 53.4 | 46.2 | **FLASH CUT** in again |
| 14.6→18.1 | 95.5→95.0 | — | — | **46.2→50.8** | width locked, **pan continues** |

The second open is the same move as the first — lid does the work (`h` 8.9 → 71.7 in 0.9 s), camera
adds only a **1.4×** push — but at a **different home framing (63.8% vs 71.9%)** and, critically, with the
laptop **off-centre to the right**: `cx` starts at 66.7 and settles at 57.5. That is the angle you want
matched; the machine is not centred and not frontal.

Then 13.9 and 14.6 are two **instant** scale jumps, and across both of them `cy` climbs steadily
44.0 → 50.8. The pan up **does not restart at the cuts** — it runs continuously from 13.9 to 18.1 s. That
is the single most important thing in this section: the cuts are windows onto one unbroken camera move.

---

## What this means for our build

| reference behaviour | what we currently do | change |
|---|---|---|
| camera drifts; device is static | we **rotate the device** (phone spins, yaw keys) | move the rotation onto the camera |
| each section has one home framing, returned to exactly | every cut has its own bespoke setup | define a home per section; punches are offsets from it |
| scale changes are instant or eased-then-held | we interpolate scale across whole shots | snap or ease-in-fast, then hold flat |
| camera motion continues across cuts | our motion resets at every cut boundary | carry drift across cuts within a section |
| lid open = device does the work, camera pushes only ~1.2–1.4× | our C1 pushed 1.4× but from a much wider start | match 58→71% and 45→63% width exactly |
| held shots are flat to ±1% | ours drift several % | flatten holds completely |

The last row is probably what reads as jitter: our "locked" shots still carry small residual movement,
and our moving shots ease across their whole duration instead of arriving and stopping.

---

## Section D — 18.1 to 46.0 s (analysed after the fact; findings I had not reported)

### 28.5–35.6 s is a BREATHE, not a push
| t | 28.5 | 30.5 | **32.1** | 34.1 | 35.5 |
|---|---|---|---|---|---|
| w% | 70.5 | 73.1 | **74.1** | 72.7 | 70.6 |

Width rises 70.5 → 74.1 then returns to 70.6. **Net zero over 7.1 s, amplitude 1.05×.** `top` stays pinned
at 6.4–6.7 and `bot` at 99.2 the whole time. This is the subtlest move in the film, and I built it as a
1.7× directional push — the single biggest amplitude error in our cut list.

### The phone enters from the LEFT edge and exits to the RIGHT edge
| t | 35.7 | 35.9 | 36.3 | 36.7 | 37.1 | … | 45.3 | 45.5 | 45.7 | 45.9 |
|---|---|---|---|---|---|---|---|---|---|---|
| cx | **5.9** | 23.7 | 45.5 | 50.4 | 50.6 | … | 55.6 | 63.6 | **81.0** | gone |
| w% | 13.3 | 30.8 | 17.7 | 23.9 | 25.2 | … | 26.6 | 21.4 | 19.1 | 0 |

The phone slides in from the far-left frame edge over ~1.4 s and settles dead centre, then at the very end
slides out to the right and clears frame. Symmetric bookends — the film enters and exits laterally.

### Held shots are flatter than I claimed
37.1 → 41.3 s holds at **w = 25.0%** for **4.2 seconds**, varying by ±0.3%. Not ±1%. And the subject is
only a quarter of frame width — far more negative space than we are giving it.

### The 28.3 s dissolve is invisible to cut detection
`edge%` collapses 5.43 → 2.07 → 9.64 across 28.1–28.5 s while the luminance diff never spikes. A gradual
dissolve does not register as a cut; it only shows up as **edge energy draining away**. Worth remembering
as a detection method, not just a fact about this film.

### Camera drift alternates direction between sections
| section | cx path | direction |
|---|---|---|
| 4.6–7.9 | 49.2 → 51.4 | right |
| 18.2–21.2 | 59.7 → 63.9 | right |
| 21.3–24.5 | 65.8 → 59.9 | **left** |
| 24.7–28.3 | 47.5 → 51.6 | right |

The camera oscillates side to side rather than drifting one way — which is what keeps a 46 s film from
feeling like it is sliding off screen.

### Subjects are pinned to frame edges
Through 28.5–35.6 s, `top` and `bot` hold constant at 6.5 / 99.2 while width breathes. The framing is
anchored vertically and only the depth changes very slightly. Several other held shots do the same.
