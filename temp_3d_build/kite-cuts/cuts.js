// ---------------------------------------------------------------------------
// CUT LIST — timing is preserved verbatim from kite-cuts.json (11 cuts, 36.0s).
// Only the CAMERA BEHAVIOUR changed, per the brief.
//
// Method (deliberately NOT "animate one orbit and slice it"):
//   * Every cut is keyed independently from the small fixed SETUPS table below.
//   * Within a cut we interpolate camera POSITION and FOV only — never azimuth.
//     `from` and `to` naming the SAME setup means a locked-off camera.
//   * Reusing setups across consecutive cuts is what holds angle consistency.
//
// Reference analysis (temp_3d_build/ref/seg_*.png, 3 fps contact sheets) found
// the reference camera to be static in essentially every cut; the motion is
// on-screen UI plus a little device rotation. So most cuts here are `static`.
// ---------------------------------------------------------------------------

// Camera setups are spherical around a look-at target, in centimetres.
// yaw: + = camera moves to the device's right.  pitch: + = camera above, looking down.
export const SETUPS = {
  // --- MacBook setups -----------------------------------------------------
  // M2: near-frontal to gentle 3/4 (8-20 deg yaw), camera slightly above (~10 deg down).
  // Pitch stays shallow: the deck's front lip sits ~12 cm nearer the lens than the
  // look-at plane, so a steep down-angle magnifies it and crops the base.
  macHero:      { yaw: -12, pitch: 8, dist: 76, target: [0, 11.0, -4], fov: 26 },
  macHeroIn:    { yaw: -12, pitch: 8, dist: 72, target: [0, 11.0, -4], fov: 26 },
  macFront:     { yaw: -6,  pitch: 7, dist: 72, target: [0, 11.5, -4], fov: 26 },
  macFrontIn:   { yaw: -6,  pitch: 7, dist: 68, target: [0, 11.5, -4], fov: 26 },
  // wide, lower, lots of floor so the mirror reflection reads (M9/G4)
  macWide:      { yaw: -19, pitch: 9, dist: 100, target: [0, 9.5, -4], fov: 25 },
  macWideIn:    { yaw: -19, pitch: 9, dist: 95, target: [0, 9.5, -4], fov: 25 },

  // Screen-fill: aimed at the display centre, on the display's own axis.
  // The lid leans back ~20 deg, so the camera sits high and looks down.
  // macScreen keeps a sliver of keyboard in frame; macScreenO goes full-bleed
  // past the bezel, which is what the reference does on the orange desktop.
  macScreen:    { yaw: -6, pitch: 13, dist: 36, target: [0, 11.0, -14], fov: 27 },
  macScreenIn:  { yaw: -6, pitch: 13, dist: 34, target: [0, 11.0, -14], fov: 27 },
  macScreenO:   { yaw: -15, pitch: 18, dist: 42, target: [0, 12.8, -17], fov: 27 },
  macScreenOIn: { yaw: -15, pitch: 18, dist: 40, target: [0, 12.8, -17], fov: 27 },

  // Screen-fill on the laptop but with the Record-iPhone desktop (reference cut 10
  // frames this as a display filling the frame, not as a whole-machine shot).
  macPhoneScreen:   { yaw: -4, pitch: 11, dist: 40, target: [0, 11.5, -14], fov: 27 },
  macPhoneScreenIn: { yaw: -4, pitch: 11, dist: 38, target: [0, 11.5, -14], fov: 27 },

  // --- floating panel setups ---------------------------------------------
  // The reference runs these near full-bleed, so the panel is pushed close and
  // the yaw is gentle — a hard angle would crop the content.
  panel3qR:     { yaw: -14, pitch: 4, dist: 52, target: [0, 16, 0], fov: 28 },
  panel3qRIn:   { yaw: -14, pitch: 4, dist: 50, target: [0, 16, 0], fov: 28 },
  panelFront:   { yaw: -5,  pitch: 3, dist: 62, target: [0, 16, 0], fov: 28 },
  panelFrontIn: { yaw: -5,  pitch: 3, dist: 60, target: [0, 16, 0], fov: 28 },
  panelFloat:   { yaw: -10, pitch: 6, dist: 50, target: [0, 16.5, 0], fov: 27 },
  panelFloatIn: { yaw: -10, pitch: 6, dist: 47, target: [0, 16.5, 0], fov: 27 },

  // --- iPhone setups ------------------------------------------------------
  // G7/P2: phone in the RIGHT third, big negative space to the left. Achieved by
  // aiming left of the phone so the phone lands right-of-centre in frame.
  phoneRight:   { yaw: -6, pitch: 5, dist: 34, target: [-4.4, 9.4, 0], fov: 26 },
  phoneRightIn: { yaw: -6, pitch: 5, dist: 33, target: [-4.4, 9.4, 0], fov: 26 },
  phoneLand:    { yaw: -4, pitch: 6, dist: 33, target: [-2.4, 9.2, 0], fov: 27 },
  phoneLandIn:  { yaw: -4, pitch: 6, dist: 32, target: [-2.4, 9.2, 0], fov: 27 },
  phoneOutro:   { yaw: 6,  pitch: 4, dist: 40, target: [-3.0, 9.4, 0], fov: 26 },
  phoneOutroIn: { yaw: 6,  pitch: 4, dist: 38, target: [-3.0, 9.4, 0], fov: 26 },
};

// durationMs preserved exactly from kite-cuts.json — do not retime here.
export const CUTS = [
  {
    name: "laptop-hero-3q-left", durationMs: 3500, device: "macbook", env: "dark",
    screen: "kite", motion: "slow push",
    cam: { from: "macHero", to: "macHeroIn" },
    pose: { from: { yaw: 0 }, to: { yaw: 0 } },
  },
  {
    name: "laptop-push-in-screen", durationMs: 3300, device: "macbook", env: "dark",
    screen: "kite", motion: "static",
    cam: { from: "macScreen", to: "macScreen" },
    pose: { from: { yaw: 0 }, to: { yaw: 0 } },
  },
  {
    name: "laptop-orange-push", durationMs: 3600, device: "macbook", env: "dark",
    screen: "desktopWeather", motion: "static",
    cam: { from: "macFront", to: "macFront" },
    pose: { from: { yaw: 0 }, to: { yaw: 0 } },
  },
  {
    name: "panel-orange-yaw-glide", durationMs: 3000, device: "macbook", env: "dark",
    screen: "desktopWeather", motion: "slow push",
    cam: { from: "macScreenO", to: "macScreenOIn" },
    pose: { from: { yaw: 0 }, to: { yaw: 0 } },
  },
  {
    // was "laptop-wide-orbit" — the reference does NOT orbit here, it holds wide
    // on the whole machine with a strong floor reflection. Rebuilt as a slow push.
    name: "laptop-wide-orbit", durationMs: 3400, device: "macbook", env: "dark",
    screen: "desktopWeather", motion: "slow push",
    cam: { from: "macWide", to: "macWideIn" },
    pose: { from: { yaw: 0 }, to: { yaw: 0 } },
  },
  {
    name: "panel-white-3q-push", durationMs: 3400, device: "panel", env: "white",
    screen: "weatherPanel", motion: "static",
    cam: { from: "panel3qR", to: "panel3qR" },
    pose: { from: { yaw: 11, py: 16 }, to: { yaw: 11, py: 16 } },
  },
  {
    name: "panel-sky-fullbleed", durationMs: 3000, device: "panel", env: "sky",
    screen: "moonPanel", motion: "static",
    cam: { from: "panelFront", to: "panelFrontIn" },
    pose: { from: { yaw: 4, py: 16 }, to: { yaw: 4, py: 16 } },
  },
  {
    name: "laptop-frontal-drift", durationMs: 3200, device: "macbook", env: "dark",
    screen: "desktopPhone", motion: "static",
    cam: { from: "macPhoneScreen", to: "macPhoneScreen" },
    pose: { from: { yaw: 0 }, to: { yaw: 0 } },
  },
  {
    // was a camera orbit; the reference rotates the PHONE while the camera holds.
    name: "phone-portrait-orbit", durationMs: 3400, device: "iphone", env: "white",
    screen: "phoneWeather", motion: "static camera / device rotates",
    cam: { from: "phoneRight", to: "phoneRight" },
    pose: { from: { yaw: -14, pitch: 6, py: 9.4 }, to: { yaw: -32, pitch: 8, py: 9.4 } },
  },
  {
    // reference frame at 43 s is a ~30 deg in-plane lean, not a full 90 deg roll
    name: "phone-landscape-diagonal", durationMs: 3000, device: "iphone", env: "white",
    screen: "phoneWeatherDark", motion: "static",
    cam: { from: "phoneLand", to: "phoneLandIn" },
    pose: { from: { yaw: -22, pitch: 9, roll: 30, py: 9.2 }, to: { yaw: -16, pitch: 9, roll: 26, py: 9.2 } },
  },
  {
    // dramatic near-edge-on outro: the reference swings far enough to reveal the
    // titanium rail and camera bump (P4/P6)
    name: "phone-portrait-lean-outro", durationMs: 3200, device: "iphone", env: "white",
    screen: "phoneWeather", motion: "slow push",
    cam: { from: "phoneOutro", to: "phoneOutroIn" },
    pose: { from: { yaw: 24, pitch: -4, roll: 3, py: 9.4 }, to: { yaw: 104, pitch: -7, roll: 7, py: 9.4 } },
  },
];

export const DURATION = CUTS.reduce((n, c) => n + c.durationMs, 0) / 1000;
