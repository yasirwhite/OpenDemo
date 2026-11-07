/**
 * alder s3 — the line on the horizon (8.72 -> 15.96s in the reference).
 *
 * Three word-groups, each held across a run of plates: group 1 over 5 plates
 * (8.72-10.68), group 2 over 5 (10.68-12.48), group 3 over 13 (12.48-15.96).
 *
 * Measured (ref 960-wide px x 4/3, Georgia-equivalent size from word width):
 *   - centred on x 640; baseline at y 340-353, just above the plate's edge;
 *   - re-set on EVERY cut and dead still inside a plate (f219 == f226,
 *     f227 == f236 to the pixel);
 *   - size steps up at each cut: 46, 51, 54, 59, 67 | 72, 77, 81, 86, 88 |
 *     106, 107, 113, 113, 121, 126, 126, 133, 141, 145, 150, 154, 150 px;
 *   - colour follows the plate: warm white [238,234,226] on dark plates, near
 *     black on pale ones, sometimes semi-transparent (sunk into the image) or
 *     softened to the plate's focus;
 *   - from the 4th plate of group 3 the word BENDS to the plate's curvature
 *     (letters ride an arc; up to ~40 px of drop across the word).
 *
 * So the preset takes the copy once and a `steps` list, one entry per cut.
 */
import React from "react";
import { A, msOf, rgbs, SERIF, stepAt } from "./alder-shared.jsx";

/**
 * One set of type riding an arc. `bend` is the drop (px) of the baseline
 * 300 px either side of centre — positive arches the word like a horizon.
 */
export function ArcLine({
	id,
	text,
	size,
	y,
	x = 640,
	bend = 0,
	colour = A.ink,
	alpha = 1,
	blur = 0,
	tracking = 0,
	weight = 400,
	font = SERIF,
}) {
	const L = 1400;
	const b = bend * (L / 300) ** 2;
	const d = `M${x - L} ${y + b} Q${x} ${y - b} ${x + L} ${y + b}`;
	return (
		<svg
			width="1280"
			height="720"
			viewBox="0 0 1280 720"
			style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 10 }}
		>
			<defs>
				<path id={`${id}-p`} d={d} />
				{blur > 0 ? (
					<filter
						colorInterpolationFilters="sRGB"
						id={`${id}-b`}
						x="-20%"
						y="-50%"
						width="140%"
						height="200%"
					>
						<feGaussianBlur stdDeviation={blur} />
					</filter>
				) : null}
			</defs>
			<text
				fontFamily={font}
				fontSize={size}
				fontWeight={weight}
				letterSpacing={tracking}
				fill={rgbs(colour)}
				opacity={alpha}
				filter={blur > 0 ? `url(#${id}-b)` : undefined}
				style={{ fontKerning: "normal" }}
			>
				<textPath href={`#${id}-p`} startOffset="50%" textAnchor="middle">
					{text}
				</textPath>
			</text>
		</svg>
	);
}

export const S3_PRESETS = {
	"alder-line": {
		note: "One word-group of the line that stands on the horizon. Give the copy once and `steps` — one per plate cut (scene-relative atMs) with that plate's size, baseline y, bend, colour, alpha and blur. Each step holds dead still until the next cut; sizes step UP every cut (the reference grows 46 -> 154 px across 23 cuts). Three of these, back to back, make the line.",
		nativeMs: 1960,
		params: {
			text: ["string", "Look", "the words"],
			steps: [
				"array",
				"[{atMs:0, size:46, y:343}]",
				"per-cut state: size, y (baseline), x, bend, colour, alpha, blur, tracking",
			],
		},
		render: (c, t) => {
			const ms = msOf(t) - (c.startMs ?? 0);
			// the engine keeps a scene live until t*1000 passes its end, which can be
			// a hair late; never let two word-groups share a frame.
			if (ms >= (c.durationMs ?? Infinity)) return null;
			const st = stepAt(c.steps, ms);
			if (!st) return null;
			return (
				<ArcLine
					id={`${c.id ?? "line"}-${st.atMs ?? 0}`}
					text={c.text}
					size={st.size ?? c.size ?? 60}
					y={st.y ?? c.y ?? 345}
					x={st.x ?? c.x ?? 640}
					bend={st.bend ?? 0}
					colour={st.colour ?? c.colour ?? A.ink}
					alpha={st.alpha ?? 1}
					blur={st.blur ?? 0}
					tracking={st.tracking ?? c.tracking ?? 0}
				/>
			);
		},
	},
};
