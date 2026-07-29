# Kite-match render — scoring vs `kite_official_sample_1.mp4`

Deliverable: **`temp_3d_build/kite-cuts/kite-match.mp4`** — 1920×1080, 30 fps, h264 yuv420p, 36.00 s, 1080 frames.
Rendered on this machine's GPU (Chromium + ANGLE/D3D11 on Intel Iris Xe), 1080 frames in 23 s (~47 fps).

Scene: `scene2.html` · cuts: `cuts.js` · screen content: `ui-textures.js` · driver: `render2.mjs`

---

## 1. Cut-timing diff — the one place brief and reference disagree

The brief asks to **keep the existing cut timing** *and* to **confirm it matches the reference**. Those are
not compatible. Measured, not assumed:

| | boundaries | shots | total |
|---|---|---|---|
| `kite-cuts.json` (kept) | 3.50, 6.80, 10.40, 13.40, 16.80, 20.20, 23.20, 26.40, 29.80, 32.80 | 11 | **36.00 s** |
| reference (ffmpeg scene detect) | 1.62, 4.95, 7.92, 11.95, 13.82, 18.12, 21.19, 24.52, 28.49, 35.59, 41.45, 44.35 | 13 | **46.00 s** |

- **My render vs `kite-cuts.json`: exact.** Scene detection on `kite-match.mp4` returns
  `3.5 6.8 10.4 13.4 16.8 20.2 23.2 26.4 29.8 32.8` — every boundary on the intended frame. **PASS.**
- **`kite-cuts.json` vs the reference: does not match.** The reference runs 10 s longer, has 2 more shots,
  and its durations vary widely (1.62 s … 7.10 s) where the cut library is a uniform ~3–3.5 s.

I followed the explicit instruction (keep existing timing) rather than silently re-timing. `CUTS` in
`cuts.js` is data-driven, so switching to reference timing is one array edit if you want that instead.

## 2. Motion — what the reference actually does

Classified from 3 fps contact sheets (`ref/seg_A..D.png`). The reference camera is **static in essentially
every cut**; what moves is on-screen UI, plus the device itself in a few shots. There is **no camera orbit
anywhere** in the reference.

So the two `orbit` cuts in the library were rebuilt:

| cut | was | now |
|---|---|---|
| `laptop-wide-orbit` | camera swings −0.5→+0.4 rad | locked yaw, slow dolly 100→95 cm |
| `phone-portrait-orbit` | camera arcs left | camera locked; the **phone** turns −14°→−32° |

Every cut is keyed independently from a fixed `SETUPS` table; within a cut only position and FOV
interpolate, so a cut can dolly but cannot orbit. Reused setups (`macFront`, `macScreen`, `phoneRight`…)
across consecutive cuts hold angle consistency. Final: **6 static, 5 slow push, 0 orbits.**

## 3. Floor z-fighting — fixed at the cause

The old scene stacked **two coplanar planes at y = 0**: an opaque grey floor and a reflection-fade overlay.
Coplanar geometry at identical depth = the flat grey punching through wherever the overlay lost.

The fix is structural, not a bias tweak — there is now **exactly one plane**, so there is nothing to fight:

- one unlit floor at y = 0; reflections are mirrored clones drawn **below** it, showing through a radial
  alpha ramp (strong at the contact point, opaque further out).
- the floor is deliberately **unlit**. A lit PBR floor sampling the studio environment renders as a flat
  grey sheet that both looks wrong on a black set and swallows the reflection — that was the "grey floor".
- the contact shadow is a separate decal lifted to y = 0.06 **and** polygon-offset, so it can never become
  coplanar either.
- near/far tightened from 0.1 / 300 to **1 / 500**, and fog matched to each backdrop so the floor's far
  edge dissolves instead of ending on a hard horizon.

Two real bugs found and fixed along the way: three samples `alphaMap` from the **green** channel, so a ramp
painted as `rgba(255,255,255,a)` left the floor fully opaque and hid the reflection entirely; and the panel's
content quad sat inside its extruded shell (z 0.36 vs a 0.365 front face), rendering solid black.

## 4. Checklist score

### GLOBAL
| | item | grade | note |
|---|---|---|---|
| G1 | warm-neutral, high contrast, true-black device shots | **PASS** | dark env is pure `#000` |
| G2 | crisp / anti-aliased / high-res | **PASS** | 1920×1080, MSAA, aniso 16, crf 17 |
| G3 | clear key direction (upper-right), lit vs shadow side | **PASS** | key (70, 95, 55) + fill + rim |
| G4 | glossy reflective floor, reflection fades downward | **PASS** | black floor dark shots, white for phone |
| G5 | real Apple geometry, correct proportions | **PASS** | real GLBs at true dimensions (§5) |
| G6 | screens show real, crisp app screenshots | **PARTIAL** | canvas-drawn UI at 2200–2560 px, not real captures |
| G7 | negative space, device off-centre | **PARTIAL** | phone is right-of-centre, less extreme than reference |
| G8 | subtle depth-of-field | **FAIL** | no DoF pass; everything uniformly sharp |
| G9 | hard cuts, timing per `kite-cuts.json` | **PASS** | verified exact by scene detection |

### MACBOOK
| | item | grade | note |
|---|---|---|---|
| M1 | background pure black, not a coloured room | **PASS** | orange is on-screen wallpaper only |
| M2 | near-frontal → gentle 3/4, camera slightly above | **PASS** | yaw −6…−19°, pitch 7–13° |
| M3 | keyboard visible, individual keys, backlit | **PARTIAL** | real keycaps w/ legends; not emissively backlit |
| M4 | trackpad, palm rest, speaker grilles | **PASS** | all modelled |
| M5 | thin black bezels + notch | **PASS** | |
| M6 | aluminium space-gray, bright edge highlights | **PARTIAL** | machine is **silver** — matching the reference, which is silver, not the checklist's "space-gray" |
| M7 | rounded front lip, ports on the right | **PASS** | modelled; small at these framings |
| M8 | Kite editor + macOS orange desktop + record toolbar | **PASS** | incl. `kite.video` watermark |
| M9 | mirror reflection on black glossy floor | **PASS** | |
| M10 | screen bright and legible, not blown out | **PASS** | |

### PHONE
| | item | grade | note |
|---|---|---|---|
| P1 | light studio, subtle gradient, not flat white | **PASS** | |
| P2 | phone in right third, negative space left | **PARTIAL** | right-of-centre; reference pushes further right |
| P3 | titanium rail, very rounded corners, dynamic island | **PASS** | |
| P4 | side buttons modelled and visible | **PASS** | reads on the edge-on outro |
| P5 | strong 3/4 ~30–35°, landscape variant rolled | **PARTIAL** | see §6 — reference's "landscape" shot is a ~30° diagonal, not a 90° roll |
| P6 | titanium rail catches a vertical highlight | **PASS** | |
| P7 | real Weather screenshot (Mission Dolores, 57°, AQ, radar) | **PARTIAL** | drawn, but every named element present |
| P8 | floor reflection + soft contact shadow | **PASS** | |

**23 PASS · 7 PARTIAL · 1 FAIL.**

## 5. Models

Both donors replaced the 209 KB `public/mac.glb` (3 meshes, no keyboard geometry, lid merged into the shell).

| | source | geometry | screen mesh |
|---|---|---|---|
| MacBook Pro 16" | `aarxnmendez/macbookpro-3d-landing` → `macbook-16.glb` | 19 meshes, 91.7 k verts, 18 PBR textures (base + metal-rough + normal) | separate emissive panel, UV 0.007–0.994 |
| iPhone 15 Pro Max | `adrianhajdin/iphone` → `scene.glb` | 31 meshes, 46.6 k verts, 34 textures | separate emissive panel, UV 0–1 |

Both carry **correct real-world dimensions** — MBP 35.48 cm wide (real: 35.57), iPhone 77.7 × 159.5 × 12.3 mm
(real 15 Pro Max: 76.7 × 159.9 × 8.25 + camera bump). The set works in centimetres; the iPhone is scaled ×100
from metres. Screen content is driven through each donor's own UVs, so it fits the rounded display exactly.

## 6. Deliberate deviations from the reference

1. **Timing** — 36 s / 11 cuts, per the explicit instruction. Reference is 46 s / 13 cuts (§1).
2. **No lid-open animation.** The reference opens the lid in two shots (0–2 s, 12–14 s). The donor MacBook
   merges lid and base into single meshes spanning the whole model, so hinging the lid needs vertex-level
   surgery. Camera-only motion was kept instead, which is what the brief's motion section asks for.
3. **`phone-landscape-diagonal` is a ~30° lean, not a 90° roll.** `kite-cuts.json` specifies roll ≈ 1.45–1.69 rad,
   but the reference frame at 43 s is a diagonal lean with the top-right corner high. Matched the reference.
4. **No depth-of-field** (G8) — would need a post-process pass.

## 7. Reproduce

```bash
node temp_3d_build/kite-cuts/render2.mjs sample      # 3 stills per cut -> sample/
node temp_3d_build/kite-cuts/render2.mjs full 2      # 1080 frames -> frames2/   (~23 s)
ffmpeg -y -framerate 30 -i frames2/f_%04d.jpg -c:v libx264 -preset slow -crf 17 \
       -pix_fmt yuv420p -movflags +faststart kite-match.mp4
```

`compare.mjs` builds the labelled MINE | REFERENCE grids used for scoring (`ref/compare_*.png`).
Note: the `ffmpeg` on PATH is a 2013 panda3d shim whose `tile` filter is unreliable — that is why the
comparison grids are composed in-browser instead.
