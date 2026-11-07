/**
 * willow preset registry — every preset the `willow` launch film is built from.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render(cfg, t). All are pure functions of t.
 */

import { S1_PRESETS } from "./willow-s1.jsx";
import { S2_PRESETS } from "./willow-s2.jsx";
import { S3_PRESETS } from "./willow-s3.jsx";
import { S4_PRESETS } from "./willow-s4.jsx";
import { S5_PRESETS } from "./willow-s5.jsx";
import { S6_PRESETS } from "./willow-s6.jsx";
import { WillowGround } from "./willow-shared.jsx";

export const WILLOW_PRESETS = {
	"willow-ground": {
		note: "willow's ground: flat base + the measured static halftone grid (circle/diamond/square, 27px pitch, contrast heavy top-right and bottom-left) + optional soft white glows. keys interpolate base/dot/strength/glow; use ease:'hold' for the hard cuts most ground changes are.",
		nativeMs: 4000,
		params: {
			keys: [
				"array",
				"[{at:0, base:[255,254,250], dot:[249,246,242], strength:1}]",
				"scene-relative ground states",
			],
			glows: ["array", "[]", "static soft white ellipses {x,y,rx,ry,alpha,colour,rot}"],
		},
		render: WillowGround,
	},
	...S1_PRESETS,
	...S2_PRESETS,
	...S3_PRESETS,
	...S4_PRESETS,
	...S5_PRESETS,
	...S6_PRESETS,
};
