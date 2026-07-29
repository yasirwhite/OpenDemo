# Kite-style cinematic cut library (3D product-demo presets)

A reusable set of camera "cuts" that reproduce the look of kite.video demo videos:
photoreal-ish devices floating in styled studios, keyframed camera moves, hard cuts
between shots. Think "21st.dev for video motions" — pick named cuts, chain them, render.

## Files
- `scene.html`      — self-contained three.js scene. Builds procedural MacBook / iPhone /
                      floating app-panel, 4 studio environments (dark / orange / sky / white),
                      floor reflections, and a timeline of shots. Exposes `window.renderAtTime(t)`
                      and `window.DURATION` for deterministic frame capture.
- `render.mjs`      — headless-Chromium frame grabber → JPEG sequence (parallel workers, resumable).
- `kite-cuts.json`  — the cut library: 11 named presets (device + environment + camera keyframes
                      + device-pose keyframes + duration). This is the reusable artifact.
- `three.min.js`    — the three.js build (copied from the app's public/ so it renders identically).

## Render
```bash
npm i playwright
node render.mjs full 4              # writes frames/f_XXXX.jpg (add "resume" to skip existing)
ffmpeg -y -framerate 30 -i frames/f_%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 18 out.mp4
```

## Cut anatomy
Each cut is one shot. `camera` is [px,py,pz, targetX,targetY,targetZ] interpolated start→end
with an ease-in-out; `pose` is the device's {yaw,pitch,roll,py} (radians) interpolated the same way.
Assemble a video by listing cut names in order — they play back-to-back as hard cuts, exactly like
the reference. To change screen content, swap the canvas UI in `scene.html` (content is decoupled
from motion, so the cuts stay identical).

## How this maps back to OpenDemo
The presets are expressed so they can drive either path:
1. `src/lib/exporter/threeDPass.ts` (fast 2.5D shader tilt) — use the `pose` yaw/pitch/roll as an
   animated `Rotation3D` per shot instead of the current single static tilt.
2. A real three.js pass (this scene) for the photoreal hero look, with the actual recording mapped
   onto the device screen instead of the placeholder weather UI.
Agents reference cuts by name (e.g. `"cuts": ["laptop-hero-3q-left","phone-portrait-lean-outro"]`).
