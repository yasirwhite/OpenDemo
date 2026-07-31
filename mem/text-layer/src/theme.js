/**
 * theme.js — palette and type, sampled from the mem reference.
 *
 * These are read off actual frames rather than guessed, so a beat rendered
 * against the wrong background reads as obviously wrong rather than subtly off.
 */

export const C = {
  white: [255, 255, 255],   // the opening ground is pure white, not off-white
  cream: [240, 230, 212],   // #F0E6D4 — sampled off the beige ground
  creamDeep: [232, 223, 200],
  grey: [229, 229, 229],
  greyWarm: [237, 235, 231],

  ink: [20, 18, 33],        // near-black with a blue cast (B exceeds R,G by ~12)
  inkSoft: [46, 43, 70],
  salmon: [232, 93, 87],    // #E85D57 — sampled off the settled "mem"
  salmonPale: [247, 170, 160],
  blue: [74, 108, 240],
  blueSoft: [110, 140, 245],
  violet: [124, 92, 200],
};

/**
 * mem sets a geometric grotesque. Segoe UI is the closest thing installed on
 * Windows; the weights below are tuned so the rendered line mass matches the
 * reference rather than to match a nominal weight name.
 */
export const FONT = `"Segoe UI", "Inter", system-ui, -apple-system, sans-serif`;

export const STAGE = { w: 1280, h: 720 };

/** Reference frames are 640x360; the stage is 2x that, so scale measurements. */
export const REF_SCALE = STAGE.w / 640;
