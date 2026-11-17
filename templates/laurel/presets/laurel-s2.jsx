/**
 * laurel s2 — the voice pill, the film's spine (f78 -> f520, 2.57 -> 17.33s).
 *
 * Measured (stage px; top edge tracked every frame, scale from the inner
 * width of the capsule, 402x162 big -> 240x98 small):
 *   - RISE f78-f102: from below the frame to cy 361 with one overshoot:
 *     cy 737, 681, 629, 581, 537, 501, 469, 441, 417, 397, 381 (f88), 369,
 *     357, 349, 341, 337, 333 (f95-96, peak), 337, 337, 341, 347, 353, 361
 *     (f102). Centred on x 640 throughout.
 *   - GLOW: a green halo while it is big. Strongest as it lands (f87-f96,
 *     40 px above the pill [159,207,100]), settled by f102 ([202,225,169]),
 *     gone in 3 frames at f141-f144.
 *   - DROP f156-f192: cy 361 -> 615 on an S (f156 361, f164 445, f170 549,
 *     f176 614), shrinking late (scale 1 at f170, .89 f174, .74 f178, .66
 *     f182, .605 f188, .597 f192). Then dead still at (640, 615).
 *   - RIBBON: a dotted level line streams in from the left edge at ~25 px
 *     per frame from f122 and runs into the pill's left end; grey on the
 *     off-white ground, white once the lilac ground is under it (f180);
 *     fades out with the lilac, f290-f299.
 *   - END: f500-f520 the pill bobs up 24 px and falls back past its rest
 *     just before the hard cut, and rides THROUGH the cut onto the brand card,
 *     falling out of the bottom by f527 (cy 640 f521, 691 f524).
 */
import React from "react";
import { curve, Layer, Pill, Ribbon, refFrame } from "./laurel-shared.jsx";

const CY = [
	[78, 737],
	[79, 681],
	[80, 629],
	[81, 581],
	[82, 537],
	[83, 501],
	[84, 469],
	[85, 441],
	[86, 417],
	[87, 397],
	[88, 381],
	[89, 369],
	[90, 357],
	[91, 349],
	[92, 341],
	[93, 337],
	[95, 333],
	[96, 333],
	[98, 337],
	[99, 341],
	[100, 347],
	[101, 353],
	[102, 361],
	[156, 361],
	[158, 369],
	[160, 385],
	[162, 413],
	[164, 445],
	[166, 481],
	[168, 517],
	[170, 549],
	[172, 583],
	[174, 604],
	[176, 614],
	[178, 616],
	[184, 618],
	[190, 615],
	[500, 615],
	[504, 603],
	[508, 595],
	[512, 591],
	[516, 599],
	[518, 607],
	[520, 627],
	[521, 640],
	[524, 691, "i"],
	[527, 790],
];
const SCALE = [
	[170, 1],
	[172, 0.98],
	[174, 0.89],
	[176, 0.81],
	[178, 0.74],
	[180, 0.69],
	[182, 0.66],
	[184, 0.63],
	[188, 0.605],
	[192, 0.597],
];
const GLOW = [
	[78, 1.35],
	[96, 1.3],
	[102, 0.9, "o"],
	[141, 0.9],
	[144, 0.08],
	[146, 0],
];
const FRONT = [
	[122, 0],
	[140, 450],
	[150, 700],
];
const RIBBON_ON = [
	[121, 0],
	[122, 1],
	[290, 1],
	[299, 0],
];
const RIBBON_TINT = [
	[174, 0],
	[181, 1],
];

export const S2_PRESETS = {
	"laurel-pill": {
		note: "The persistent voice pill: one dark capsule with nine live green level bars that rises in with an overshoot and a green halo (knocking the keycaps off), then drops and shrinks to the bottom of the frame and stays there under every later beat, then rides through the end-card cut and drops out. Carries the dotted sound ribbon that streams into its left end. Positions are the reference's tracked curves (film frames via `f0`); keep it ABOVE the composer, line and title scenes (z 30).",
		nativeMs: 14967,
		params: {
			f0: ["number", "78", "reference frame the scene starts on"],
			ribbon: ["boolean", "true", "draw the sound ribbon"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 78);
			const s = curve(SCALE, f);
			const cy = curve(CY, f);
			const on = c.ribbon === false ? 0 : curve(RIBBON_ON, f);
			const tint = curve(RIBBON_TINT, f);
			const ribbonColour = [0, 1, 2].map((k) =>
				Math.round(165 + (252 - 165) * tint + (k === 2 ? 3 * tint : 0)),
			);
			return (
				<>
					{/* The ribbon runs BEHIND the lime keycap (z 20), the pill above it. */}
					<Layer z={18}>
						{on > 0.001 ? (
							<Ribbon
								y={cy}
								x1={640 - 201 * s}
								front={curve(FRONT, f)}
								s={s}
								f={f}
								colour={ribbonColour}
								opacity={on}
							/>
						) : null}
					</Layer>
					<Layer z={30}>
						<Pill cx={640} cy={cy} s={s} glow={curve(GLOW, f)} f={f} />
					</Layer>
				</>
			);
		},
	},
};
