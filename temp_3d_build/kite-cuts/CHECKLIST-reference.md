# Reference observation checklist — kite_official_sample_1.mp4
Granular inventory of what is actually in the original, to grade any render against.
Format: OBSERVATION → what it's composed of. Grade each as PASS / PARTIAL / FAIL on the current render.

## GLOBAL (applies to whole video)
- G1. Color grade is warm-neutral, HIGH CONTRAST, with deep true-black backgrounds on device shots.
- G2. Everything is crisp / anti-aliased / high-res — no jaggies, no muddy edges.
- G3. Lighting has a clear KEY DIRECTION (upper-right) — devices show a light side and a shadow side, not flat even light.
- G4. Devices rest on a GLOSSY REFLECTIVE FLOOR; a soft mirror reflection of the device fades downward. Black glossy floor for dark shots, white glossy floor for phone shots.
- G5. Real Apple device GEOMETRY: rounded corners, chamfered edges, correct 16" MBP + iPhone Pro proportions. (Boxes read as fake.)
- G6. Screens show REAL, crisp app screenshots (Kite editor / macOS Weather), not flat synthetic UI.
- G7. Composition uses NEGATIVE SPACE; device is often off-center (phone in right third).
- G8. Subtle depth-of-field: nearest part of device slightly soft, screen sharp.
- G9. Hard cuts between shots; timing per kite-cuts.json (already correct — keep).

## MACBOOK shots (opening + orange + wide + record-iphone)
- M1. BACKGROUND is pure black; NOT a colored room. (Orange/weather is the on-screen macOS wallpaper.)
- M2. Orientation is near-frontal to GENTLE 3/4 (~8–20° yaw), camera slightly ABOVE looking down ~10°.
- M3. The KEYBOARD is fully visible on the deck — individual keys, and they are BACKLIT (faint glow / legible legends).
- M4. Trackpad visible (large, below keyboard), space-gray palm rest, speaker grilles flanking the keyboard.
- M5. Thin black screen bezels + camera NOTCH at top center of the display.
- M6. Aluminum is space-gray with realistic spec: bright edge highlights on the lit (upper-right) side, darker on the left.
- M7. Rounded front lip on the base; small PORTS (3 dots) visible on the right side of the base.
- M8. Screen content: real UI — opening shows the Kite EDITOR (dark, left toolbar, "kite.video" watermark); later shows macOS desktop with ORANGE Ventura wallpaper + Weather window + screen-record toolbar.
- M9. Clear MIRROR REFLECTION of the base + screen glow on the black glossy floor, fading down.
- M10. Screen is bright and legible; slight glow but not blown out.

## PHONE shots (portrait orbit + landscape + outro)
- P1. Environment: light/white studio, subtle gradient (a touch darker at bottom-left → white), NOT pure flat white.
- P2. Phone positioned in the RIGHT THIRD; large NEGATIVE SPACE to the left.
- P3. iPhone Pro geometry: black titanium rail, VERY rounded corners, thin uniform bezels, dynamic-island pill at top.
- P4. SIDE BUTTONS modeled and visible on the left edge (volume pair + action button) when turned to 3/4.
- P5. Orientation: strong 3/4 (~30–35° yaw) showing the left side; slight backward lean; landscape variant is rolled 90°.
- P6. Titanium rail catches a bright vertical HIGHLIGHT down the visible edge.
- P7. Real Weather app screenshot (Mission Dolores, 57°, air quality, radar map), crisp.
- P8. Floor REFLECTION of the phone on glossy white floor + soft contact shadow.

## MOTION (per cut — verify against reference at start/mid/end timestamps)
- Use kite-cuts.json timings. For each cut confirm: entry direction, yaw/pitch/roll path, whether it's a
  dolly-in / orbit / hold, and that the device stays correctly framed (not cropped awkwardly).

## SCORING LOOP
1. Render current video. 2. For each item above, compare my frame vs reference frame at matched time.
3. Mark PASS/PARTIAL/FAIL + a one-line note on the delta. 4. Fix the FAILs with biggest visual impact first.
5. Re-render, re-score. Stop iterating an item after clearly diminishing returns (~30 min / obviously stuck);
   move to the next. Goal: each pass strictly closer to reference. Deliver only the assembled Kite-format MP4.
