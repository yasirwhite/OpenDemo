/**
 * maple preset registry — every preset the `maple` launch film is built from.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render(cfg, t). All are pure functions of t.
 */

import { S1_PRESETS } from "./maple-s1.jsx";
import { S2_PRESETS } from "./maple-s2.jsx";
import { S3_PRESETS } from "./maple-s3.jsx";
import { S4_PRESETS } from "./maple-s4.jsx";
import { S5_PRESETS } from "./maple-s5.jsx";
import { S6_PRESETS } from "./maple-s6.jsx";
import { MapleGround } from "./maple-shared.jsx";

export const MAPLE_PRESETS = {
	"maple-ground": {
		note: "maple's ground: one flat colour per key (white [253,255,252], black [0,1,0]); ease:'hold' for the film's hard cuts, an eased segment for the two fades (f414-f423 white->black, f634-f647 grey->black). List it FIRST so the section's beats render over it.",
		nativeMs: 4000,
		params: {
			keys: ["array", "[{at:0, colour:[0,1,0]}]", "scene-relative ground states"],
		},
		render: MapleGround,
	},
	...S1_PRESETS,
	...S2_PRESETS,
	...S3_PRESETS,
	...S4_PRESETS,
	...S5_PRESETS,
	...S6_PRESETS,
};
