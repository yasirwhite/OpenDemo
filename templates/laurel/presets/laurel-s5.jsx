/**
 * laurel s5 — the title stack (f421 -> f520, 14.00 -> 17.33s).
 *
 * Measured (stage px, dark-pixel rows tracked every 3rd frame):
 *   - A hand-lettered caps word, final x 388-904, top 236, bottom 328;
 *     typed f421-f448 left-anchored at its final place, tinted tail.
 *   - A serif claim under it, final cap top 336, baseline ~382, x 234-1047
 *     (~72 px); typed f433-f452.
 *   - "available" line, serif ~28 px, cap top 456, baseline ~474; typed
 *     f460-f468. Fine print, sans ~16 px grey [104], baseline ~516; typed
 *     f469-f478.
 *   - The whole stack rises into place while it types, decelerating:
 *     offset +76 (f426), +64 (f432), +44 (f438), +32 (f444), +24 (f450),
 *     +16 (f456), +12 (f462), +8 (f468), +4 (f474), 0 (f486). Held still
 *     to f513, then it lifts off: -20 (f516), -40 (f519), into the cut.
 */
import React from "react";
import {
	curve,
	HAND,
	L,
	Layer,
	refFrame,
	SANS,
	SERIF,
	Typed,
	textWidth,
} from "./laurel-shared.jsx";

const STACK_DY = [
	[421, 84],
	[426, 76],
	[432, 64],
	[438, 44],
	[444, 32],
	[450, 24],
	[456, 16],
	[462, 12],
	[468, 8],
	[474, 4],
	[486, 0],
	[513, 0],
	[516, -20, "i"],
	[519, -40],
	[521, -55],
];

/** One centred, left-anchored typed line. */
function Line({
	text,
	font,
	size,
	base,
	f,
	at,
	frames,
	tail,
	ink,
	capRatio = 0.92,
	squeeze = 1,
	heavy = 0,
}) {
	const w = textWidth(text, font) * squeeze;
	const n = Math.max(1, text.length);
	return (
		<div
			style={{
				position: "absolute",
				left: 640 - w / 2,
				top: base - size * capRatio,
				font,
				lineHeight: 1,
				whiteSpace: "nowrap",
				transformOrigin: "0 0",
				transform: squeeze !== 1 ? `scaleX(${squeeze})` : undefined,
				WebkitTextStroke: heavy ? `${heavy}px currentColor` : undefined,
			}}
		>
			<Typed text={text} f={f} at={at} fpc={frames / n} tail={tail} ink={ink} />
		</div>
	);
}

export const S5_PRESETS = {
	"laurel-title": {
		note: "The title stack under the pill: a hand-lettered caps word, a serif claim, an availability line and fine print, each TYPED left-anchored at its final centred place with a tinted tail, the stack rising into place as it types and lifting off into the cut. Times are reference frames via `f0`.",
		nativeMs: 3334,
		params: {
			title: ["string", "DICTATION", "hand-lettered word (role brand-feature)"],
			claim: ["string", "Every word, typed for you.", "serif claim (role claim)"],
			available: ["string", "Out now on desktop.", "availability line"],
			fine: ["string", "Phone apps are on the way.", "fine print"],
			f0: ["number", "421", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 421);
			const dy = curve(STACK_DY, f);
			return (
				<Layer z={15}>
					<div
						style={{ position: "absolute", inset: 0, transform: `translateY(${dy.toFixed(2)}px)` }}
					>
						<Line
							text={c.title ?? ""}
							font={`700 100px ${HAND}`}
							size={100}
							squeeze={0.84}
							heavy={1.2}
							base={309}
							capRatio={0.78}
							f={f}
							at={421}
							frames={27}
							tail={6}
							ink={[12, 12, 12]}
						/>
						<Line
							text={c.claim ?? ""}
							font={`400 70px ${SERIF}`}
							size={70}
							base={382}
							capRatio={0.92}
							f={f}
							at={433}
							frames={19}
							tail={5}
							ink={[16, 16, 14]}
						/>
						<Line
							text={c.available ?? ""}
							font={`400 28px ${SERIF}`}
							size={28}
							base={474}
							f={f}
							at={460}
							frames={8}
							tail={4}
							ink={[22, 22, 20]}
						/>
						<Line
							text={c.fine ?? ""}
							font={`400 16px ${SANS}`}
							size={16}
							base={516}
							f={f}
							at={469}
							frames={9}
							tail={4}
							ink={L.fine}
						/>
					</div>
				</Layer>
			);
		},
	},
};
