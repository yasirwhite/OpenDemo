/**
 * juniper preset registry — every preset the `juniper` launch film is built from.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render(cfg, t). All are pure functions of t.
 */

import { S1_PRESETS } from "./juniper-s1.jsx";
import { S2_PRESETS } from "./juniper-s2.jsx";
import { S3_PRESETS } from "./juniper-s3.jsx";
import { S4_PRESETS } from "./juniper-s4.jsx";
import { S5_PRESETS } from "./juniper-s5.jsx";
import { S6_PRESETS } from "./juniper-s6.jsx";
import { JuniperGround } from "./juniper-shared.jsx";

export const JUNIPER_PRESETS = {
	"juniper-ground": {
		note: "juniper's ground: one flat colour per key (off-white [254,255,253]; bento grey [234,236,233]); keys interpolate colour, ease:'hold' for cuts. Paint it first so the section's beats render over it.",
		nativeMs: 4000,
		params: {
			keys: ["array", "[{at:0, colour:[254,255,253]}]", "scene-relative ground states"],
		},
		render: JuniperGround,
	},
	...S1_PRESETS,
	...S2_PRESETS,
	...S3_PRESETS,
	...S4_PRESETS,
	...S5_PRESETS,
	...S6_PRESETS,
};
