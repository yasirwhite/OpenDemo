/**
 * alder s4 — the end titles (15.96 -> 20.0s in the reference).
 *
 * Measured:
 *   - 15.96 hard cut from the last plate to the navy sky [14,19,22] with the
 *     limb haze along the bottom (limb edge at stage y 889, below frame).
 *   - name card 15.96-17.28: white serif, centred, cap top at stage y 312,
 *     251 px wide for an 8-character name. Dead still.
 *   - 17.28 hard cut to the wordmark (mark + word, 275 px wide), same
 *     baseline. Dead still until 18.20.
 *   - 18.20-20.00 the WHOLE card (titles and limb together, to the pixel:
 *     wordmark rows and limb edge move by the same amount every frame) pans
 *     up 545 px. Accelerating for 1.5s, peak ~31 px/frame at 19.72, then a
 *     short brake that lands exactly on the opening frame. Sampled every
 *     frame and replayed as a monotone curve (`pan`), not a named ease.
 */
import React from "react";
import { A, AlderMark, curveAt, END_PAN, Grain, msOf, rgbs, SERIF } from "./alder-shared.jsx";

export function Title({
	text,
	size = 64,
	y = 360,
	mark = false,
	markSize,
	gap,
	colour = A.title,
	dy = 0,
	tracking = 0,
}) {
	// Georgia at line-height 1 puts its baseline 0.848 em below the box top.
	const ms = markSize ?? size * 0.72;
	return (
		<div
			style={{
				position: "absolute",
				zIndex: 10,
				left: 0,
				width: 1280,
				top: y + dy - 0.848 * size,
				height: size * 1.4,
				display: "flex",
				justifyContent: "center",
				alignItems: "baseline",
				color: rgbs(colour),
				fontFamily: SERIF,
				fontSize: size,
				lineHeight: 1,
				letterSpacing: tracking,
				whiteSpace: "nowrap",
			}}
		>
			{mark ? (
				<span
					style={{
						display: "inline-block",
						width: ms,
						height: ms,
						marginRight: gap ?? size * 0.14,
					}}
				>
					<AlderMark size={ms} colour={colour} />
				</span>
			) : null}
			<span>{text}</span>
		</div>
	);
}

export const S4_PRESETS = {
	"alder-title": {
		note: "A centred serif title over the end-card sky: the product name card, then (with mark:true) the wordmark, cut hard from one to the other. `y` is the baseline. Give it the SAME `pan` keys as the end-card alder-horizon so titles and limb rise as one card (alder-s4 END_PAN is the measured rise).",
		nativeMs: 1320,
		params: {
			text: ["string", "Alder", "the copy"],
			size: ["number", "64", "font size px"],
			y: ["number", "360", "baseline y"],
			mark: ["boolean", "false", "draw the Alder mark before the text"],
			pan: ["array|'end'", "-", "scene-relative [ms, dy] keys; 'end' = the measured END_PAN"],
		},
		render: (c, t) => {
			if (msOf(t) >= (c.startMs ?? 0) + (c.durationMs ?? Infinity)) return null;
			const ms = msOf(t) - (c.panFromMs ?? c.startMs ?? 0);
			const keys = c.pan === "end" ? END_PAN : c.pan;
			const dy = keys ? curveAt(keys, ms) - (keys === END_PAN ? 545.3 : 0) : 0;
			return (
				<Title
					text={c.text}
					size={c.size ?? 64}
					y={c.y ?? 360}
					mark={!!c.mark}
					markSize={c.markSize}
					gap={c.gap}
					colour={c.colour ?? A.title}
					tracking={c.tracking ?? 0}
					dy={dy}
				/>
			);
		},
	},
	"alder-grain": {
		note: "Film grain over the whole film (soft-light fractal noise re-seeded every 1/25s). List it LAST so it sits over everything; one scene spanning the film.",
		nativeMs: 20000,
		params: {
			amount: ["number", "0.22", "opacity of the grain layer"],
			freq: ["number", "0.9", "grain frequency"],
		},
		render: (c, t) => (
			<Grain id={c.id ?? "grain"} t={t} amount={c.amount ?? 0.22} freq={c.freq ?? 0.9} />
		),
	},
};
