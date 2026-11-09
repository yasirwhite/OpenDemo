/**
 * hazel preset registry — every preset the `hazel` launch film is built from.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render(cfg, t). All are pure functions of t.
 */

import { S1_PRESETS } from "./hazel-s1.jsx";
import { S2_PRESETS } from "./hazel-s2.jsx";
import { S3_PRESETS } from "./hazel-s3.jsx";
import { S4_PRESETS } from "./hazel-s4.jsx";
import { S5_PRESETS } from "./hazel-s5.jsx";
import { S6_PRESETS } from "./hazel-s6.jsx";

export const HAZEL_PRESETS = {
	...S1_PRESETS,
	...S2_PRESETS,
	...S3_PRESETS,
	...S4_PRESETS,
	...S5_PRESETS,
	...S6_PRESETS,
};
