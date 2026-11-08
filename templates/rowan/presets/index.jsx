/**
 * rowan preset registry — every preset the `rowan` launch film is built from.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render(cfg, t). All are pure functions of t.
 *
 * `rowan-shot` (s1) draws every window beat; its interiors ("views") live in
 * s1 (opening, build), s2 (the designs) and s3 (design to code, the design
 * system). s4 holds the type: captions, dips and the typed end card.
 */

import { S1_PRESETS } from "./rowan-s1.jsx";
import { S4_PRESETS } from "./rowan-s4.jsx";

export const ROWAN_PRESETS = {
	...S1_PRESETS,
	...S4_PRESETS,
};
