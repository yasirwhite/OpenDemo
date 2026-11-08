/**
 * rowan s4 — the type of the film: corner captions, dips to black and the
 * typed end card (52.0 -> 79.1s).
 *
 * Measured (reference px, 1812x1080):
 *   - CAPTIONS are frame overlays (they do not ride the camera: "Design to
 *     code" spans x 1485-1707 on f1561 and on f1600, across a x1.37 punch).
 *     A mono face at ~15.9 px advance (Consolas 28.9 px), light grey.
 *       "Design to code"                  f1561-f1652, right edge 1707, base 980
 *       "Advanced components with slots"  f1735-f1980, left 68, base 970
 *       "Variables"                       f1981-f2056, left 68, base 970
 *       "Full editing control"            f2075-f2189, left 79, base 968
 *   - DIPS: mean luminance falls linearly to 0 and climbs back: f1037-f1041
 *     -f1045 (4+4 frames), f1551-f1556-f1561 (5+5), f1652-f1657-f1662
 *     (5+5), f1717-f1724-f1735 (7 down, ~11 up).
 *   - END CARD: hard cut to black at f2190. An underscore cursor at f2192;
 *     "Dream on canvas."-length line typed f2197-f2218 (1.4 frames/char,
 *     44.3 px advance — Consolas 80.5 px, cap 56), line 2 f2221-f2236,
 *     baselines 503 and 632, each line centred on x ~910 for its final
 *     length; held with the cursor to f2279; black f2280; the url typed
 *     f2295-f2324 (~3.2 frames/char) on baseline 575, cursor gone f2329,
 *     held to the last frame.
 */
import React from "react";
import { blinkOn, fms, kf, localMs, MONO, RefBox, rgbs } from "./rowan-shared.jsx";

const CAP_SIZE = 28.9;
const END_SIZE = 80.5;
const ADV = 0.55; // Consolas advance / em

function Caption({ text, x, right, base, colour = [232, 232, 232], size = CAP_SIZE }) {
	const top = base - size * 0.8;
	return (
		<div
			style={{
				position: "absolute",
				left: right != null ? right - text.length * size * ADV : x,
				top,
				font: `400 ${size}px ${MONO}`,
				lineHeight: 1,
				color: rgbs(colour),
				whiteSpace: "pre",
			}}
		>
			{text}
		</div>
	);
}

/** One typed line with an optional trailing underscore cursor. */
function TypedLine({ text, n, cx = 910, base, size = END_SIZE, cursor, colour = [222, 222, 222] }) {
	const adv = size * ADV;
	const left = cx - (text.length * adv) / 2;
	return (
		<div
			style={{
				position: "absolute",
				left,
				top: base - size * 0.8,
				font: `400 ${size}px ${MONO}`,
				lineHeight: 1,
				color: rgbs(colour),
				whiteSpace: "pre",
			}}
		>
			{text.slice(0, n)}
			{cursor ? "_" : ""}
		</div>
	);
}

export const S4_PRESETS = {
	"rowan-caption": {
		note: "A small mono caption pinned to the FRAME (not the camera), the film's only words over the product: bottom-left (`x`) or bottom-right (`right`) on baseline `base`, reference px. Keep it to one short outcome phrase.",
		nativeMs: 3000,
		params: {
			text: ["string", "Design to code", "caption copy (role brand)"],
			x: ["number", "68", "left edge (ref px)"],
			right: ["number", "-", "right edge instead of x"],
			base: ["number", "970", "baseline (ref px)"],
		},
		render: (c) => (
			<RefBox z={20}>
				<Caption text={c.text} x={c.x ?? 68} right={c.right} base={c.base ?? 970} />
			</RefBox>
		),
	},
	"rowan-dip": {
		note: "A dip to black over everything: `keys` [{at, a}] scene-relative, a = black opacity (the reference's dips are linear, 4-7 frames down and 4-11 up).",
		nativeMs: 400,
		params: { keys: ["array", "[{at:0,a:0},{at:150,a:1},{at:300,a:0}]", "opacity keys"] },
		render: (c, t) => {
			const a = kf(c.keys, localMs(c, t)).a ?? 0;
			return (
				<div
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						width: 1280,
						height: 720,
						background: `rgba(0,0,0,${Math.max(0, Math.min(1, a)).toFixed(4)})`,
						zIndex: 40,
					}}
				/>
			);
		},
	},
	"rowan-typed": {
		note: "The typed mono end card on black: `lines` [{text, base, at, frames}] each typed from `at` ms at `frames` per character (30 fps frames), centred on x ~910 for its final length, with an underscore cursor that blinks before typing (`cursorAt`), rides the typing and stays until `cursorOff`. Two scenes make the reference's card: the two-line claim, then the url.",
		nativeMs: 3000,
		params: {
			lines: ["array", "-", "[{text, base, at, frames}]"],
			cursorAt: ["number", "67", "first cursor frame (ms)"],
			cursorOff: ["number", "-", "cursor gone (ms); omitted = stays"],
		},
		render: (c, t) => {
			const ms = localMs(c, t);
			const lines = c.lines ?? [];
			let active = -1;
			const ns = lines.map((l, i) => {
				const n = Math.max(
					0,
					Math.min(l.text.length, Math.floor((ms - l.at) / fms(l.frames ?? 1.4)) + 1),
				);
				if (ms >= l.at || i === 0) active = i;
				return ms >= l.at ? n : 0;
			});
			const typing = lines.some((l, i) => ms >= l.at && ns[i] < l.text.length);
			const before = lines.length && ms < lines[0].at;
			const showCursor =
				ms >= (c.cursorAt ?? 0) &&
				(c.cursorOff == null || ms < c.cursorOff) &&
				(typing || !before || blinkOn(ms - (c.cursorAt ?? 0), c.blinkMs ?? 133));
			return (
				<RefBox z={30}>
					<div
						style={{
							position: "absolute",
							left: -60,
							top: -10,
							width: 1932,
							height: 1100,
							background: "#000",
						}}
					/>
					{lines.map((l, i) =>
						i <= active ? (
							<TypedLine
								key={l.text}
								text={l.text}
								n={ns[i]}
								base={l.base}
								cx={l.cx ?? 910}
								cursor={i === active && showCursor}
							/>
						) : null,
					)}
				</RefBox>
			);
		},
	},
};
