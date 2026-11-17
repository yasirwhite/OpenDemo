/**
 * laurel preset registry — every preset the `laurel` launch film is built from.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render(cfg, t). All are pure functions of t.
 *
 * s1 keycaps, s2 the persistent voice pill, s3 the composer, s4 the line and
 * icon drum, s5 the title stack, s6 the brand card.
 */

import { S1_PRESETS } from "./laurel-s1.jsx";
import { S2_PRESETS } from "./laurel-s2.jsx";
import { S3_PRESETS } from "./laurel-s3.jsx";
import { S4_PRESETS } from "./laurel-s4.jsx";
import { S5_PRESETS } from "./laurel-s5.jsx";
import { S6_PRESETS } from "./laurel-s6.jsx";

export const LAUREL_PRESETS = {
	...S1_PRESETS,
	...S2_PRESETS,
	...S3_PRESETS,
	...S4_PRESETS,
	...S5_PRESETS,
	...S6_PRESETS,
};
