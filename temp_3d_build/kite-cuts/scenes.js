// ---------------------------------------------------------------------------
// MEANINGFUL SEGMENTS ("scenes")
//
// A scene is one coherent idea, not one shot. The reference's first 8 seconds
// contain three cuts but demonstrate a single UI flow on a single screen at a
// single home framing — so that is ONE scene. Cuts inside a scene are punch-ins
// and punch-outs on the same subject; cuts BETWEEN scenes change the subject.
//
// `slots` names the swappable screen content, so a demo recording can be dropped
// into a scene without touching its camera work:
//    primary   - the main app screen the scene is built around
//    state.*   - alternate states of that same screen (dialogs, overlays, modes)
// Camera, framing and timing are fixed per scene; only slots change.
// ---------------------------------------------------------------------------

export const SCENES = [
  {
    id: "01-open-and-record",
    title: "Open & start recording",
    t0: 0.00, t1: 8.00,
    cuts: [0, 1, 2],
    idea: "Laptop opens on the editor, punch in to show the record control being used, punch back out to the same home framing as the desktop takes over.",
    homeW: 71,
    camera: "1.15x reveal dolly over 0.75 s, then locked. Two instant punches (96%, back to 71%). Slow lateral drift right.",
    slots: { primary: "kite", state: ["desktopRecord", "desktopWeather", "desktopSelect"] },
  },
  {
    id: "02-flat-app-zoom",
    title: "Device view to flat app",
    t0: 8.00, t1: 12.00,
    cuts: [3],
    idea: "The screen detaches from the device and becomes a bare floating display, then a genuine full-bleed 2D app view. The film's only conventional eased zoom lives here.",
    homeW: 77,
    camera: "No 3D. Two eased zooms with a hold between; no cuts. OpenDemo spring.",
    slots: { primary: "desktopWeather", state: [] },
  },
  {
    id: "03-reopen-and-pan",
    title: "Reopen, then pan up through the UI",
    t0: 12.00, t1: 18.20,
    cuts: [4, 5, 6],
    idea: "Laptop opens a second time, off-centre right. Two instant punches follow, and a single upward pan runs unbroken across both cut points.",
    homeW: 52,
    camera: "1.15x reveal, then two punches (82%, 95%). The pan up does NOT restart at the cuts.",
    slots: { primary: "desktopWeather", state: [] },
  },
  {
    id: "04-moon-sequence",
    title: "Moon detail — wide, punch, pull back, dissolve",
    t0: 18.20, t1: 28.50,
    cuts: [7, 8, 9],
    idea: "ONE scene, not two. Same moon content and same sky throughout: full-bleed, instant punch in on the moon card, pull back to the panel floating over the floor, dissolve to white. Same home/punch/return shape as scene 01.",
    homeW: 80,
    camera: "Camera ORBITS the panel — azimuth alternates direction per cut (3.0 deg/s), elevation climbs steadily (1.0 deg/s) unbroken across both cut points, always aimed at the panel centre. The tilt is off-axis camera, never object roll.",
    slots: { primary: "moonPanel", state: [] },
  },
  {
    id: "05-record-iphone",
    title: "Record iPhone (the long hold)",
    t0: 28.50, t1: 35.70,
    cuts: [10],
    idea: "The longest shot in the film, on a navy ground. The camera breathes 1.05x out and back — net zero over 7.2 seconds.",
    homeW: 71,
    camera: "Breathe only: 70.5% -> 74.1% -> 70.6%. No net move.",
    slots: { primary: "desktopPhone", state: ["desktopPhoneWeather"] },
  },
  {
    id: "06-phone-showcase",
    title: "Phone slides in, holds, exits",
    t0: 35.70, t1: 46.00,
    cuts: [11],
    idea: "ONE continuous shot of one phone — no cuts. It enters from the left turning a full 360, settles into a lean coplanar with the scene-3 laptop display, its UI changes (popup/slide-in) while the camera holds, and the shot closes by zooming into part of the interface.",
    homeW: 25,
    camera: "Locked apart from a slow pedestal up (0.35 cm/s) running the whole 10.3 s, slow enough that the phone stays fully in frame, then a closing zoom.",
    slots: { primary: "phoneWeather", state: ["phoneHome", "phoneWeatherDark"] },
  },
];

export const sceneOf = (cutIndex) => SCENES.find((s) => s.cuts.includes(cutIndex));
