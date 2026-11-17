/**
 * linden s2 — the lines (f561 -> f751, 18.67 -> 25.0s). Three on black.
 *
 * Measured (ref 960-px units unless marked stage):
 *   - From f559 the frame is pure black (the gutter the camera dove into).
 *   - Each line FADES IN linearly over 16 frames (peak luminance 30, 46, 64
 *     ... at +17/frame: f561-f577, f609-f625, f657-f673), holds, and the
 *     first two CUT OUT in one frame (f607 -> f608, f654 -> f655). The last
 *     holds to the end.
 *   - All three are pure white, one line, centred at x 480, baseline y 286
 *     (stage 381), cap height 35 (stage 46.7). Widths 438 / 385 / 391.
 *   - Line 1 is the product name in two weights (heavy name, light suffix);
 *     line 2 a short claim in a semibold; line 3 the address in a regular.
 * This rebuild adds the mark ahead of the last line so the film's last
 * frame is the brand, not a bare address.
 */
import React from "react";
import { clamp01 } from "../../../src/lib/textcards/src/easing.js";
import { SANS } from "./linden-shared.jsx";

const SIZE = 66.7; // stage px; cap 46.7 at the face's 0.70 cap ratio
const BASE = 381; // stage baseline
const FADE_MS = 533; // 16 frames

let ctx = null;
function textWidth(str, font) {
	if (typeof document === "undefined") return str.length * 0.5 * SIZE;
	if (!ctx) ctx = document.createElement("canvas").getContext("2d");
	ctx.font = font;
	return ctx.measureText(str).width;
}

/** The placeholder mark: a linden leaf (heart-shaped base, drawn-out tip) on a short stem. */
export function LindenMark({ size, colour = "#fff", src }) {
	if (src) {
		return (
			<img
				alt=""
				src={src}
				style={{ width: size, height: size, objectFit: "contain", display: "block" }}
			/>
		);
	}
	return (
		<svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
			<path
				d="M47 96 C47 90 47 86 46 80 C28 80 8 68 8 47 C8 28 22 17 36 21 C42 22 46 26 48 31 C52 21 58 12 70 6 C69 13 71 18 76 22 C88 30 94 42 90 56 C85 72 68 80 50 80 C50 86 50 91 51 96 Z"
				fill={colour}
			/>
			<path
				d="M48 77 C47 60 52 40 66 18"
				stroke="#000"
				strokeWidth="3.2"
				fill="none"
				strokeLinecap="round"
			/>
			<path
				d="M49 60 L30 46 M51 50 L72 40 M50 68 L34 63 M55 38 L70 30"
				stroke="#000"
				strokeWidth="2.4"
				fill="none"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export const S2_PRESETS = {
	"linden-line": {
		note: "One white line centred on black: fades in over 16 frames, holds, and leaves on a hard cut at the scene's end. Use it three times after `linden-wall`: the name (`lead` heavy + `text` light), a claim, then the address with `mark: true` so the film ends on the brand. `markSrc` is the image slot for your own mark.",
		nativeMs: 1567,
		params: {
			lead: ["string", "-", "heavy part, set first (the product name)"],
			text: ["string", "Try it now for free", "the line (or the light part after `lead`)"],
			weight: ["number", "600", "weight of `text` (300 light, 400 regular, 600 semibold)"],
			mark: ["boolean", "false", "set the mark ahead of the line"],
			markSrc: ["string", "-", "image slot: your mark (square svg/png)"],
		},
		render: (c, t) => {
			const ms = t * 1000 - c.startMs;
			const a = clamp01(ms / (c.fadeMs ?? FADE_MS));
			const lead = c.lead ?? "";
			const text = c.text ?? "Try it now for free";
			const weight = c.weight ?? 600;
			const gap = lead ? SIZE * 0.24 : 0;
			const wl = lead ? textWidth(lead, `700 ${SIZE}px ${SANS}`) : 0;
			const wt = textWidth(text, `${weight} ${SIZE}px ${SANS}`);
			const ms2 = c.mark ? SIZE * 1.0 : 0;
			const mg = c.mark ? SIZE * 0.3 : 0;
			const total = ms2 + mg + wl + gap + wt;
			const x0 = 640 - total / 2;
			const font = { fontFamily: SANS, fontSize: SIZE, letterSpacing: -0.6 };
			return (
				<div
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						width: 1280,
						height: 720,
						background: "#000",
						opacity: a,
						zIndex: 20,
					}}
				>
					{c.mark ? (
						<div style={{ position: "absolute", left: x0, top: BASE - SIZE * 0.7 - ms2 * 0.2 }}>
							<LindenMark size={ms2} src={c.markSrc} />
						</div>
					) : null}
					<svg width={1280} height={720} style={{ position: "absolute", left: 0, top: 0 }}>
						<text x={x0 + ms2 + mg} y={BASE} fill="#fff" style={font}>
							{lead ? <tspan fontWeight={700}>{lead}</tspan> : null}
							<tspan fontWeight={weight} dx={lead ? gap : 0}>
								{text}
							</tspan>
						</text>
					</svg>
				</div>
			);
		},
	},
};
