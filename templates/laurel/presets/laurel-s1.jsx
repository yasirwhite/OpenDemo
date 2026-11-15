/**
 * laurel s1 — the keycaps (f1 -> f152, 0 -> 5.03s in the reference).
 *
 * Measured (stage px, tracked every frame on a 320x180 decode):
 *   - The LIME key rises from below the frame on a hard ease-out: face top
 *     y 640 (f1), 556, 444, 368, 312, 268, 236, 216, 200, 188 (f19), centred
 *     at x 640. Its mark draws on f3-f10 while it rises.
 *   - f21-f31 it sinks 64 px to y 252 (accelerating), then f31-f39 slides
 *     left to x 284.5 (640 -> 628 -> 590 -> 497 -> 343 -> 284.5) as three
 *     grey keys fall in from the top right, tilted, and land in a row:
 *     f38 (cx 482), f40 (cx 679), f45 (cx 936, a wide key). Outlines 188,
 *     188, 306 px wide, all 213 tall, 10 px apart: the row spans 190-1089.
 *   - f73-f79 the lime key alone steps down 28 px (y 280).
 *   - f81-f90 the rising pill knocks the grey keys off: two fly up and out
 *     of the top, the wide one tumbles out to the right (-25..+50 deg). The
 *     lime key recoils 16 px left and back (f83-f92).
 *   - f134-f152 the lime key drops out of the bottom, accelerating.
 */
import React from "react";
import { curve, Keycap, L, LaurelMark, Layer, refFrame, SANS, SERIF } from "./laurel-shared.jsx";

// ── lime key: face-top y, centre x, tilt, mark draw ────────────────────────
const LIME_Y = [
	[1, 640],
	[3, 556],
	[5, 444],
	[7, 368],
	[9, 312],
	[11, 268],
	[13, 236],
	[15, 216],
	[17, 200],
	[19, 188],
	[23, 188],
	[25, 192],
	[27, 200],
	[29, 212],
	[31, 252],
	[73, 252],
	[75, 264],
	[77, 276],
	[79, 280],
	[134, 280],
	[137, 319],
	[140, 379],
	[143, 449],
	[146, 522],
	[149, 574],
	[152, 650],
];
const LIME_X = [
	[1, 640],
	[29, 640],
	[31, 628],
	[33, 590],
	[35, 497],
	[37, 343],
	[39, 284.5],
	[82, 284.5],
	[83, 281],
	[86, 270],
	[89, 268],
	[92, 282],
	[95, 284.5],
];
const LIME_ROT = [
	[1, -9],
	[9, -3],
	[15, 0],
	[134, 0],
	[152, 4],
];
const MARK_DRAW = [
	[3, 0],
	[10, 1, "o"],
];

// ── grey keys: [frame, cx, cy, rot] in screen px (cy = outline centre) ────
const FALL = [
	// Key 1, lands f38.
	[
		[27, 870, -140, 12],
		[28, 860, -60, 12],
		[29, 840, 40, 11],
		[30, 820, 80, 10],
		[31, 820, 200, 9],
		[32, 800, 220, 8],
		[33, 780, 300, 6],
		[34, 740, 340, 4],
		[35, 680, 360, 3],
		[36, 600, 360, 2],
		[37, 520, 360, 1],
		[38, 482, 358, 0],
		[80, 482, 358, 0],
		[81, 520, 180, -5],
		[82, 560, -40, -10],
		[83, 590, -260, -14],
	],
	// Key 2, lands f40.
	[
		[31, 980, -140, 15],
		[32, 970, -60, 15],
		[33, 960, 20, 14],
		[34, 940, 60, 12],
		[35, 880, 120, 10],
		[36, 800, 180, 8],
		[37, 720, 240, 6],
		[38, 690, 280, 4],
		[39, 682, 320, 2],
		[40, 679, 358, 0],
		[80, 679, 358, 0],
		[81, 720, 280, -5],
		[82, 800, 160, 5],
		[83, 880, 20, 10],
		[84, 940, -140, 15],
	],
	// Key 3 (wide), lands f45.
	[
		[35, 1060, -140, -8],
		[36, 1040, -60, -8],
		[37, 980, -20, -7],
		[38, 944, 40, -6],
		[39, 940, 80, -5],
		[40, 940, 100, -4],
		[41, 940, 180, -3],
		[42, 940, 240, -2],
		[43, 940, 300, -2],
		[44, 938, 340, -1],
		[45, 936, 358, 0],
		[80, 936, 358, 0],
		[81, 980, 380, -5],
		[82, 1060, 430, -20],
		[83, 1120, 480, -25],
		[84, 1180, 520, -20],
		[85, 1220, 560, 10],
		[86, 1240, 580, 20],
		[87, 1262, 592, 30],
		[88, 1300, 602, 40],
		[90, 1420, 630, 55],
		[93, 1700, 680, 70],
	],
];
const WIDTHS = [188, 188, 306];

function at(track, f) {
	const v = curve(
		track.map((k) => [k[0], [k[1], k[2], k[3]]]),
		f,
	);
	return { cx: v[0], cy: v[1], rot: v[2] };
}

/** Motion blur from speed (px/frame), capped. */
function blurOf(track, f) {
	const a = at(track, f - 0.5);
	const b = at(track, f + 0.5);
	const v = Math.hypot(b.cx - a.cx, b.cy - a.cy);
	return Math.min(5, Math.max(0, (v - 15) * 0.06));
}

function GreyLegend({ glyph, word, w }) {
	return (
		<>
			<div
				style={{
					position: "absolute",
					left: 20,
					top: 16,
					font: `400 36px ${SANS}`,
					lineHeight: 1,
					color: "rgb(36,37,36)",
				}}
			>
				{glyph}
			</div>
			<div
				style={{
					position: "absolute",
					left: 20,
					top: 110,
					width: w - 50,
					font: `400 30px ${SANS}`,
					lineHeight: 1,
					color: "rgb(30,31,30)",
					whiteSpace: "nowrap",
				}}
			>
				{word}
			</div>
		</>
	);
}

export const S1_PRESETS = {
	"laurel-keys": {
		note: "The opening keycaps, a pure function of the reference's tracked curves: the lime brand key rises and draws its mark, three grey keys fall in tilted and land in a row (the shortcut that starts the feature), the row holds, the voice pill (laurel-pill) knocks the grey keys off, and the lime key drops out. `keys` are the three grey legends [{glyph, word}]; the last key is the wide one.",
		nativeMs: 5067,
		params: {
			keys: [
				"array",
				'[{glyph:"⌃",word:"Laurel"},{glyph:"⌥",word:"dictate"},{glyph:"⌘",word:"anywhere"}]',
				"grey key legends, left to right (role feature)",
			],
			fnLabel: ["string", "fn", "small legend on the lime key"],
			markSrc: ["string", "-", "image slot: your mark on the lime key (default: drawn leaf)"],
			f0: ["number", "1", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 1);
			const keys = c.keys ?? [];
			const limeX = curve(LIME_X, f);
			const limeY = curve(LIME_Y, f);
			const drop = f >= 134;
			const greys = FALL.map((tr, i) => {
				if (f < tr[0][0]) return null;
				const p = at(tr, f);
				const w = WIDTHS[i];
				if (p.cy < -200 || p.cx - w / 2 > 1300) return null;
				const k = keys[i] ?? {};
				return (
					<Keycap
						key={`k${w}${k.word ?? i}`}
						cx={p.cx}
						top={p.cy - 106.5}
						w={w}
						rot={p.rot}
						blur={blurOf(tr, f)}
						seed={i + 2}
					>
						<GreyLegend glyph={k.glyph ?? ""} word={k.word ?? ""} w={w} />
					</Keycap>
				);
			});
			const vy = drop ? curve(LIME_Y, f + 0.5) - curve(LIME_Y, f - 0.5) : 0;
			return (
				<Layer z={20}>
					{greys}
					<Keycap
						cx={limeX}
						top={limeY}
						w={189}
						kind="lime"
						rot={curve(LIME_ROT, f)}
						blur={Math.min(4, Math.max(0, (Math.abs(vy) - 14) * 0.05))}
						seed={1}
					>
						<div style={{ position: "absolute", left: 28, top: 26 }}>
							<LaurelMark size={104} p={curve(MARK_DRAW, f)} id="lk" src={c.markSrc} />
						</div>
						<div
							style={{
								position: "absolute",
								right: 16,
								bottom: 12,
								font: `400 27px ${SERIF}`,
								lineHeight: 1,
								color: `rgb(${L.ink.join(",")})`,
							}}
						>
							{c.fnLabel ?? "fn"}
						</div>
					</Keycap>
				</Layer>
			);
		},
	},
};
