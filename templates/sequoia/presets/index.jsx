/**
 * sequoia preset registry — every preset the `sequoia` launch film is built from.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render(cfg, t). All are pure functions of t.
 */

import { S1_PRESETS } from "./sequoia-s1.jsx";
import { S2_PRESETS } from "./sequoia-s2.jsx";
import { S3_PRESETS } from "./sequoia-s3.jsx";
import { S4_PRESETS } from "./sequoia-s4.jsx";
import { S5_PRESETS } from "./sequoia-s5.jsx";
import { S6_PRESETS } from "./sequoia-s6.jsx";
import { S7_PRESETS } from "./sequoia-s7.jsx";
import { SequoiaGround } from "./sequoia-shared.jsx";

export const SEQUOIA_PRESETS = {
	"sequoia-ground": {
		note: "sequoia's ground: one flat colour per key (graphite [38,40,37] / off-white [254,255,253]); keys interpolate colour, ease:'hold' for the hard cuts. Paint it first so the section's beats render over it.",
		nativeMs: 4000,
		params: {
			keys: ["array", "[{at:0, colour:[38,40,37]}]", "scene-relative ground states"],
		},
		render: SequoiaGround,
	},
	...S1_PRESETS,
	...S2_PRESETS,
	...S3_PRESETS,
	...S4_PRESETS,
	...S5_PRESETS,
	...S6_PRESETS,
	...S7_PRESETS,
};
