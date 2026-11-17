/**
 * laurel s6 — the brand card (f521 -> f630, 17.33 -> 21.0s).
 *
 * Measured (stage px):
 *   - f521 HARD CUT from the off-white title stack to a flat lime
 *     [176,203,75] (one frame, diff 63.7).
 *   - The mark DRAWS ON along its own stroke f522-f532, centred at
 *     (~636, 360) and ~300 px tall; holds to f538; shrinks to ~150 px on
 *     f538-f548 (300, 240 f541, 170 f544, 152 f547) and settles at 144.
 *   - The wordmark types one letter per ~1.9 frames f553-f566, 26 px right
 *     of the mark, while the mark eases left from centre to x 360 (630,
 *     620 f553, 586 f556, 514 f559, 450 f562, 410 f565, 390 f568, 370
 *     f571, 360 by f585): the lockup re-centres behind its own letters.
 *     Final lockup 288-1000 x 283-437: mark 144 px, heavy rounded
 *     lowercase with x-height ~90 and baseline 405. Held to the end.
 */
import React from "react";
import { curve, L, LaurelMark, Layer, refFrame, rgbs, textWidth, WORD } from "./laurel-shared.jsx";

const DRAW = [
	[521.5, 0],
	[522, 0.02],
	[524, 0.08],
	[527, 0.65],
	[530, 0.95],
	[532, 1],
];
const SIZE = [
	[538, 300],
	[541, 240],
	[544, 170],
	[547, 152],
	[552, 146],
	[560, 144],
];
const WORD_SIZE = 170;
// Measured lockup progress: share of the way from centre to the final mark x.
const PROG = [
	[552, 0],
	[553, 0.04],
	[556, 0.16],
	[559, 0.43],
	[562, 0.67],
	[565, 0.81],
	[568, 0.89],
	[571, 0.96],
	[576, 0.99],
	[585, 1],
];
const GAP = 26;
const MARK_FINAL = 144;

export const S6_PRESETS = {
	"laurel-endcard": {
		note: "The closing brand card: a hard cut to a flat brand colour, the mark draws itself on large at centre, shrinks, and the wordmark types out to its right while the mark eases left so the lockup lands centred. `markSrc` is the image slot for your own mark (default: the drawn leaf). Times are reference frames via `f0`.",
		nativeMs: 3667,
		params: {
			word: ["string", "laurel", "wordmark, lowercase (role brand)"],
			colour: ["array", "[176,203,75]", "card colour"],
			markSrc: ["string", "-", "image slot: your mark (svg/png)"],
			f0: ["number", "521", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 521);
			const word = c.word ?? "laurel";
			const size = curve(SIZE, f);
			const ww = textWidth(word, `700 ${WORD_SIZE}px ${WORD}`) - 4 * word.length;
			const finalX = 644 - (MARK_FINAL + GAP + ww) / 2 + MARK_FINAL / 2;
			const mx = 636 + (finalX - 636) * curve(PROG, f);
			const n = Math.max(1, word.length);
			const shown = Math.max(0, Math.min(n, Math.floor((f - 553) / (13 / n)) + 1));
			const left = mx + MARK_FINAL / 2 + GAP;
			return (
				<Layer z={25} style={{ background: rgbs(c.colour ?? L.endLime) }}>
					<div style={{ position: "absolute", left: mx - size / 2, top: 360 - size / 2 }}>
						<LaurelMark size={size} p={curve(DRAW, f)} id="ec" src={c.markSrc} weight={12.5} />
					</div>
					{f >= 553 ? (
						<div
							style={{
								position: "absolute",
								left,
								top: 405 - WORD_SIZE * 1.02,
								font: `700 ${WORD_SIZE}px ${WORD}`,
								lineHeight: 1.2,
								letterSpacing: -4,
								color: rgbs(L.ink),
								whiteSpace: "nowrap",
							}}
						>
							{word.slice(0, shown)}
						</div>
					) : null}
				</Layer>
			);
		},
	},
};
