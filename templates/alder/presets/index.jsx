/**
 * alder preset registry — every preset the `alder` launch film is built from.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render(cfg, t). All are pure functions of t.
 */

import { S1_PRESETS } from "./alder-s1.jsx";
import { S2_PRESETS } from "./alder-s2.jsx";
import { S3_PRESETS } from "./alder-s3.jsx";
import { S4_PRESETS } from "./alder-s4.jsx";

export const ALDER_PRESETS = {
	...S1_PRESETS,
	...S2_PRESETS,
	...S3_PRESETS,
	...S4_PRESETS,
};
