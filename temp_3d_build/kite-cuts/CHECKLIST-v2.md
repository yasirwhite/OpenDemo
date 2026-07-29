# Reference checklist v2 — rebuilt from a dense frame pass

Supersedes `CHECKLIST-reference.md`. That version had 20 items for a 46 s / 13-shot video, all of them
static attributes (materials, geometry, lighting), no per-cut entries, and a single line for motion. It
could not see anything that *happens inside* a cut — which is why two lid-opens, a no-device floating
screen, several full-bleed 2D sections and a dissolve all scored as PASS.

**Evidence base:** 13 per-cut contact sheets at 12 samples each (`ref/cutsheets/`), 11 read densely
(cuts 1–6, 9–13 = 132 frames); cuts 7–8 classified from measurement only. Plus programmatic framing
measurement of all 185 frames at 4 fps (`ref/analysis-ref.json`, `analyze-frames.mjs`). Previous pass
looked at 11 frames total.

Grades are for the current deliverable, `kite-match.mp4` (11 cuts / 36 s).

---

## PART A — new global axes

These axes did not exist in v1. Each is a thing v1 structurally could not test.

| # | axis | reference behaviour | ours | grade |
|---|---|---|---|---|
| A1 | **Render mode varies per shot** | 3 modes: 3D device, floating screen with NO device, full-bleed 2D | every cut is a 3D device or a framed 3D panel | **FAIL** |
| A2 | **Full-bleed 2D sections** | content runs edge-to-edge, no panel border, no perspective (e.g. 10.7–11.9 s) | never; always a bordered 3D object | **FAIL** |
| A3 | **Floating screen with no device** | 7.9–10.6 s is a bare screen + reflection, no laptop | we render a whole MacBook there | **FAIL** |
| A4 | **Device self-animation** | lid opens in 2 shots; phone spins in 2 shots | no device animation at all | **FAIL** |
| A5 | **In-cut content changes** | nearly every cut swaps screen state mid-shot | screens are frozen textures | **FAIL** (deprioritised) |
| A6 | **Non-hard transitions** | dissolve to white at 28.5 s; fade-out to empty at 46 s | all hard cuts | **FAIL** |
| A7 | **Shot count / structure** | 13 shots, durations 1.62–7.10 s | 11 shots, uniform 3.0–3.6 s | **FAIL** |
| A8 | **Motion is the norm, not the exception** | 9 of 13 shots have a real push or device move | 6 of 11 static, pushes are tiny (5 %) | **FAIL** |
| A9 | **Push magnitude** | subject grows 40–100 % within a shot | ~5 % (dist 76→72 etc.) | **FAIL** |
| A10 | **Background is not always pure black** | cut 10 is dark **navy/blue**, not black | pure black | **FAIL** |
| A11 | **Shots can start or end on empty frame** | opens on near-empty black, ends on empty white | starts and ends on a full subject | **FAIL** |
| A12 | **Subject may be cropped by frame edge** | cuts 2, 6, 12 deliberately crop the device | everything fully contained | **PARTIAL** |

## PART B — per-cut blocks

Format: **mode · framing · motion · events · transitions · environment**

### C1 — 0.00–1.62 s (1.62 s) · laptop reveal
| item | reference | ours (cut 1, 0.0–3.5 s) | grade |
|---|---|---|---|
| B1.1 | starts with lid **fully closed**, flat slab | lid open ~110° the whole time | **FAIL** |
| B1.2 | lid animates **closed → ~105°** over ~0.6 s | none | **FAIL** |
| B1.3 | camera pushes in hard while the lid opens; subject goes ~15 % → ~85 % of frame width | ~5 % growth | **FAIL** |
| B1.4 | ends near screen-fill, base cropped | whole laptop with margin | **FAIL** |
| B1.5 | pure black bg, faint floor reflection | correct | **PASS** |
| B1.6 | duration 1.62 s (shortest shot) | 3.5 s | **FAIL** |

### C2 — 1.62–4.95 s (3.33 s) · screen-fill, editor → record overlay
| item | reference | ours (cut 2) | grade |
|---|---|---|---|
| B2.1 | screen fills frame **edge-to-edge**, no bezel visible | full screen with bezel and black margin | **FAIL** |
| B2.2 | thin **keyboard strip** visible along the bottom ~15 % | keyboard mostly out of frame | **PARTIAL** |
| B2.3 | content changes mid-cut: editor → "Record this display" | frozen editor | **FAIL** |
| B2.4 | slow pull-back through the shot | static | **FAIL** |
| B2.5 | `kite.video` watermark present | present | **PASS** |

### C3 — 4.95–7.92 s (2.97 s) · laptop on orange desktop
| item | reference | ours (cut 3) | grade |
|---|---|---|---|
| B3.1 | steady push across the shot (base visible → base cropped) | static | **FAIL** |
| B3.2 | near-frontal, very slight yaw | correct | **PASS** |
| B3.3 | weather window is **dark/purple-tinted**, not light blue | light blue | **FAIL** |
| B3.4 | wallpaper has a **navy/dark-blue wedge top-left** | all-warm, no navy | **PARTIAL** |
| B3.5 | screen-record toolbar visible at screen bottom | present | **PASS** |
| B3.6 | ends on "Drag to select an area to record" dim state | frozen | **FAIL** |

### C4 — 7.92–11.95 s (4.03 s) · floating screen → full-bleed 2D
| item | reference | ours (cut 4) | grade |
|---|---|---|---|
| B4.1 | **no laptop present** — bare floating screen | full MacBook rendered | **FAIL** |
| B4.2 | screen has a floor **reflection** below it | n/a | **FAIL** |
| B4.3 | strong push: screen grows ~2× across phase 1 | ~5 % | **FAIL** |
| B4.4 | second half becomes **full-bleed 2D**, zero perspective | 3D tilted screen throughout | **FAIL** |
| B4.5 | macOS menu bar visible at top of the floating screen | present | **PASS** |

### C5 — 11.95–13.82 s (1.87 s) · second lid-open, wide
| item | reference | ours (cut 5) | grade |
|---|---|---|---|
| B5.1 | lid animates **~15° → ~110°** over ~0.6 s | none | **FAIL** |
| B5.2 | camera pushes in during the open, then holds | tiny push, no hold | **PARTIAL** |
| B5.3 | **strong** glossy floor reflection, clearly readable | present but weak | **PARTIAL** |
| B5.4 | gentle 3/4, right side receding | correct | **PASS** |
| B5.5 | duration 1.87 s | 3.4 s | **FAIL** |

### C6 — 13.82–18.12 s (4.30 s) · strongly tilted app plane
| item | reference | ours (cut 6) | grade |
|---|---|---|---|
| B6.1 | app plane at a **strong** perspective tilt (both axes) | mild tilt | **PARTIAL** |
| B6.2 | orange wallpaper visible at the left edge / corners only | large orange border | **PARTIAL** |
| B6.3 | content overflows the frame on all sides | contained with margin | **FAIL** |
| B6.4 | slight pull-back over the shot | static | **FAIL** |

### C7 — 18.12–21.19 s (3.07 s) · light-bg app plane *(classified from measurement only)*
| item | reference | ours (cut 7) | grade |
|---|---|---|---|
| B7.1 | full-bleed, border spread 148 (content to the edges) | bordered panel | **FAIL** |
| B7.2 | light/white background | correct | **PASS** |

### C8 — 21.19–24.52 s (3.33 s) · sky-bg plane *(measurement only)*
| item | reference | ours | grade |
|---|---|---|---|
| B8.1 | subject high in frame (centroid ~30 % height), rolled ~-20° | centred, no roll | **FAIL** |
| B8.2 | sky/mid background | correct | **PASS** |

### C9 — 24.52–28.49 s (3.97 s) · floating panel on white floor
| item | reference | ours (cut 7 sky) | grade |
|---|---|---|---|
| B9.1 | panel is a **thin flat sheet**, minimal frame | thick dark extruded frame | **FAIL** |
| B9.2 | clear reflection on glossy white floor | present | **PASS** |
| B9.3 | gentle push through the shot | very slight | **PARTIAL** |
| B9.4 | **dissolves to white** at the end | hard cut | **FAIL** |
| B9.5 | subtle window title bar at top of the panel | absent | **FAIL** |

### C10 — 28.49–35.59 s (7.10 s) · laptop + Record iPhone
| item | reference | ours (cut 8) | grade |
|---|---|---|---|
| B10.1 | **slow continuous push over 7.1 s**, base visible → base cropped | static | **FAIL** |
| B10.2 | background is dark **navy/blue**, not black | pure black | **FAIL** |
| B10.3 | longest shot in the film (7.1 s) | 3.2 s | **FAIL** |
| B10.4 | mirrored iPhone centred on the display | present | **PASS** |
| B10.5 | screen content changes home → weather mid-shot | frozen | **FAIL** (deprioritised) |

### C11 — 35.59–41.45 s (5.86 s) · phone spin-in
| item | reference | ours (cut 9) | grade |
|---|---|---|---|
| B11.1 | phone **spins ~180° back → front** in the first ~1 s | no spin; small yaw drift | **FAIL** |
| B11.2 | spin eases out, then settles into a held 3/4 | linear-ish ease over whole cut | **FAIL** |
| B11.3 | phone drifts laterally left → right across the shot | fixed position | **FAIL** |
| B11.4 | camera-bump side visible during the spin | never shown | **FAIL** |
| B11.5 | white studio, visible horizon + floor reflection | correct | **PASS** |
| B11.6 | duration 5.86 s | 3.4 s | **FAIL** |

### C12 — 41.45–44.35 s (2.90 s) · phone diagonal, dark UI
| item | reference | ours (cut 10) | grade |
|---|---|---|---|
| B12.1 | phone **cropped by the bottom edge** — tighter than full-body | fully contained | **FAIL** |
| B12.2 | roll ~15–20°, top leaning right | ~28° | **PARTIAL** |
| B12.3 | dark "Conditions" UI | correct | **PASS** |
| B12.4 | essentially static with a slight drift | static | **PASS** |

### C13 — 44.35–46.00 s (1.65 s) · phone spin-out
| item | reference | ours (cut 11) | grade |
|---|---|---|---|
| B13.1 | holds portrait ~1.1 s, then **spins front → edge → back** in ~0.4 s | slow continuous rotate over 3.2 s | **FAIL** |
| B13.2 | spin is fast and late, not spread across the shot | spread across whole shot | **FAIL** |
| B13.3 | phone **exits / clears frame**; film ends on an empty white frame | ends on the phone | **FAIL** |
| B13.4 | duration 1.65 s | 3.2 s | **FAIL** |

## PART C — score

| | count |
|---|---|
| **FAIL** | **41** |
| **PARTIAL** | **9** |
| **PASS** | **14** |
| total items | 64 |

v1 scored this same render 23 PASS / 7 PARTIAL / 1 FAIL. The render did not get worse — the checklist got
honest. The 41 failures cluster into five fixable groups:

1. **Structure** (A7, and every duration row) — 11 uniform cuts vs 13 varied ones.
2. **Render modes** (A1–A3, B4.1, B4.4, B7.1) — need full-bleed 2D and no-device floating screen modes.
3. **Device animation** (A4, B1.2, B5.1, B11.1, B13.1) — need the lid hinge and phone spins.
4. **Push magnitude** (A8, A9, and ~8 per-cut rows) — our pushes are ~5 %, reference is 40–100 %.
5. **Transitions** (A6, B9.4, B13.3) — need a dissolve and an exit-to-empty.

Group 4 is the cheapest and probably the single biggest perceptual win: it is pure number changes in
`cuts.js`, no new machinery. Groups 2 and 3 need the structural work (2D mode, lid split, keyframe tracks).
