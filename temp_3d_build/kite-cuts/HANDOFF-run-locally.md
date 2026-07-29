# Kite-match render — spec + method (continue this LOCALLY on a GPU)

## Why this doc exists
A first attempt (this folder) reproduced Kite's **cut timing well** but the render looked amateur.
Root causes: (1) procedural box-model devices instead of real geometry, (2) flat lighting / no HDRI,
(3) software rendering in a cloud sandbox forcing slow iteration + no real reflections/DoF.
Cut TIMING is good and should be preserved (see kite-cuts.json). The problem to fix is
**device-orientation accuracy** and **render quality**.

## Run this ON THE USER'S COMPUTER (GPU), not the cloud
Fast renders (seconds, not minutes) are required for the compare-and-iterate loop below.
Reference video + extracted frames are already on disk in `temp_3d_build/`.

## Assets to use (replace the procedural boxes)
- Real **MacBook Pro** GLB/GLTF (16:10, notch) with PBR materials (space-gray aluminum).
- Real **iPhone 15/16 Pro** GLB with dynamic island.
- An **HDRI** studio environment (.hdr/.exr) for reflections + lighting (neutral studio + a warm/orange
  variant + a bright white variant + a sky variant to match Kite's backgrounds).
- Note: `public/mac.glb` already exists in the repo — evaluate it before sourcing a new one.
- Renderer: GPU three.js (r > 150) with RGBELoader/PMREM env, or Blender EEVEE/Cycles.

## METHOD — iterate each cut to ~90% match
1. Describe the cut in words first (high level), e.g. "device slides in from left while rotating
   from steep 3/4 to near-front; camera static." THEN tune the fine knobs.
2. Render the cut. Grab MY frame and the REFERENCE frame at the SAME timestamps (start / mid / end).
3. Put them side-by-side and score this checklist per timestamp:
   - device YAW (left/right turn)   — degrees + which edge recedes
   - device PITCH (tilt up/down)
   - device ROLL (in-plane lean; 90° for landscape phone)
   - POSITION in frame (centered? left/right third? floating with gap below?)
   - SCALE (how much of frame the device fills)
   - ENTRY/EXIT direction (slides from left? pushes in? orbits L→R?)
   - BACKGROUND (dark / orange wallpaper / white studio / sky)
   - CAMERA move (static / dolly-in / orbit / rise)
   - REFLECTION + contact shadow present and correct
4. Fix the biggest deltas, re-render that cut only, re-score. Each pass must be closer to reference
   and further from the previous version. Show the user a side-by-side at checkpoints.

## Reference shot breakdown (46s @ 30fps, 1fps frames = f_01..f_46 in temp_3d_build)
| # | time (s) | device | plain-language motion | orientation start→end | framing / bg |
|---|----------|--------|-----------------------|------------------------|--------------|
| 1 | 0–2  | MacBook | hero, held 3/4 from front-LEFT, lid ~105° open | yaw ≈ -25° steady, slight down-pitch | medium, whole laptop, DARK floor + reflection |
| 2 | 2–5  | MacBook | dolly IN toward screen until it ~fills | yaw -25°→-8° (turning to face) | closes to screen-fill, DARK |
| 3 | 5–8  | MacBook | 3/4 left on ORANGE Ventura wallpaper, weather app | yaw ≈ -22° | medium, warm ORANGE bg |
| 4 | 8–11 | MacBook | push IN on orange until screen fills | yaw -22°→-10° | screen-fill, ORANGE |
| 5 | 11–14| MacBook | WIDE full-body, small; rotates left→toward front | yaw -30°→-5°, pitch ~+8° | wide, DARK, strong silver floor reflection |
| 6 | 14–17| screen/panel | push-in, screen at strong perspective, right edge receding | yaw ≈ +25° | ORANGE, near screen-fill |
| 7 | 17–20| screen/panel | 3/4 receding right, pushed in | yaw ≈ +22° | WHITE studio |
| 8 | 20–24| full-bleed app | content fills frame, minimal move (moon widget) | ~frontal | SKY-blue gradient |
| 9 | 24–28| screen/panel | floating, gentle orbit, reflection on white ground | yaw +10°→-10° | SKY + white floor |
| 10| 28–36| MacBook | frontal, subtle push; screen shows an iPhone (Record iPhone) | yaw ≈ ±8° | DARK |
| 11| 36–41| iPhone (portrait) | frontal → orbit to 3/4 LEFT, floating | yaw 0°→-35°, slight pitch | WHITE, floor reflection, negative space |
| 12| 41–44| iPhone (landscape) | rotated 90°, diagonal 3/4 tilt, orbit | roll 90°, yaw -20°→+25°, pitch ~+9° | WHITE |
| 13| 44–46| iPhone (portrait) | dramatic 3/4 leaning outro | yaw +30°→+55°, pitch -8° (leans back) | WHITE |

(Angles are starting estimates — refine them against the frames during the compare loop.)

## Deliverable
36s, 1280×720 (or 1080p), 30fps MP4 that scores ≥~90% on the checklist above vs the reference,
using real device models + HDRI. Screen CONTENT is secondary — match motion, orientation, framing, look.
