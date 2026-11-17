/**
 * linden preset registry — every preset the `linden` launch film is built from.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render(cfg, t). All are pure functions of t.
 *
 * s1 the wall of outputs and its one continuous camera, s2 the lines on black.
 */

import { S1_PRESETS } from "./linden-s1.jsx";
import { S2_PRESETS } from "./linden-s2.jsx";

export const LINDEN_PRESETS = {
	...S1_PRESETS,
	...S2_PRESETS,
};
