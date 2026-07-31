/**
 * theme.js — default palette and type.
 *
 * These are only DEFAULTS. Every preset takes explicit colours, and a config
 * should set its own brand palette per scene rather than relying on these.
 * The values here come from measuring a real launch film, so they are a
 * reasonable neutral starting point rather than an arbitrary guess.
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
 * A geometric grotesque is the house style for this kind of film. Segoe UI /
 * Inter are the closest things generally installed; drop a webfont next to
 * index.html and add it here to get closer to a specific brand.
 */
export const FONT = `"Segoe UI", "Inter", system-ui, -apple-system, sans-serif`;

export const STAGE = { w: 1280, h: 720 };

