/**
 * alder s1 — the horizon (0 -> 1.24s, and again under the end titles).
 *
 * Measured: the opening is a planet limb held perfectly still (edge at ref
 * y 258/540 at frame centre on f001, f010, f020, f031: stage y 344). It is
 * not a still, though: the haze above the orange line breathes outward over
 * the 1.24s (rows 40-80 brighten 52 -> 77 luminance; the bands from the
 * orange line down do not move), so `glow` is keyed 1.00 -> ~1.18.
 *
 * The same limb sits under the end titles with its edge at stage y 889, below
 * the frame: only the haze shows, as a soft blue band along the bottom. Then
 * the whole card pans up 545 px (see alder-s4 `pan`) and lands on f001 — the
 * film is a loop.
 */
import React from "react";
import { curveAt, END_PAN, Limb, msOf } from "./alder-shared.jsx";

export const S1_PRESETS = {
	"alder-horizon": {
		note: "The planet-limb horizon that opens AND closes the film: dark ground, thin orange line, peach, grey-blue, a wide blue haze into a navy sky, all on one radius (~3750 px). `edgeY` places the limb at frame centre (344 opening; 889 = below frame under the end titles). `glow` [[ms, g]] stretches the upper haze (the opening breathes 1.00 -> 1.18). `pan` [[ms, dy]] offsets everything vertically (the end-card rise) — give the titles the SAME pan keys so the card moves as one.",
		nativeMs: 1240,
		params: {
			edgeY: ["number", "344", "limb top at frame centre (stage px)"],
			R: ["number", "3750", "limb radius"],
			glow: ["array", "[[0,1]]", "scene-relative [ms, haze stretch] keys"],
			pan: ["array", "-", "scene-relative [ms, dy] keys, monotone-cubic"],
			blur: ["number", "0", "softness"],
		},
		render: (c, t) => {
			const ms = msOf(t) - (c.startMs ?? 0);
			const glow = c.glow ? curveAt(c.glow, ms) : 1;
			const dy = c.pan ? curveAt(c.pan === "end" ? END_PAN : c.pan, ms) : 0;
			return (
				<Limb
					id={c.id ?? "limb"}
					edgeY={c.edgeY ?? 344}
					R={c.R ?? 3750}
					ax={c.ax ?? 640}
					glow={glow}
					blur={c.blur ?? 0}
					tint={c.tint ?? 0.6}
					dy={dy}
				/>
			);
		},
	},
};
