/**
 * laurel s4 — "works in any app": a typed line and an app-icon drum
 * (f294 -> f422, 9.77 -> 14.03s in the reference).
 *
 * Measured (stage px):
 *   - The line takes over the composer's text slot: typed from f295 at
 *     ~1 unit/frame, its left edge sliding from x 184 to its centred place
 *     (x 374 for a 380 px line) by f318 on an S (19% f301, 51% f304, 87% f310). Serif ~52 px, cap top
 *     342, baseline 377.
 *   - From f316 a white tile (106 px, r ~20, at x 800-906, y 308-414, i.e.
 *     46 px right of the line) shows one app icon at a time. Icons roll
 *     up through it: each enters from 70 px below, blurred and small, and
 *     the previous one leaves 70 px up, fading. Arrivals accelerate:
 *     settled on f322, 340, 358, 373, 393, 398, 402, 405, 408, 411, 414 (the
 *     last few are streaks).
 *   - EXIT: line and tile rise and fade on an accelerating curve: centre
 *     y offset 0 (f409), -37 (f412), -100 (f415), -177 (f418), -257 (f421).
 */
import React from "react";
import { curve, hash, Layer, refFrame, SERIF, Typed, textWidth } from "./laurel-shared.jsx";

const SIZE = 52;
const BASE = 377;
const TILE = 106;
const GAP = 46;
const ARRIVE = [322, 340, 358, 373, 393, 398, 402, 405, 408, 411, 414];
// Share of the slide done, from the composer slot to the centred place.
const SLIDE = [
	[295, 0],
	[298, 0.08],
	[301, 0.19],
	[304, 0.51],
	[307, 0.72],
	[310, 0.87],
	[313, 0.95],
	[316, 0.99],
	[318, 1],
];
const EXIT_DY = [
	[409, 0],
	[412, -37, "i"],
	[415, -100],
	[418, -177],
	[421, -257],
];
const EXIT_A = [
	[415, 1],
	[422, 0],
];

/** Neutral stand-in app glyphs (no real marks): drawn, 56 px. */
const GLYPHS = [
	// mail
	(k) => (
		<g key={k}>
			<rect x={8} y={14} width={40} height={28} rx={5} fill="#e5533d" />
			<path
				d="M10 17 L28 31 L46 17"
				stroke="#fff"
				strokeWidth={4}
				fill="none"
				strokeLinejoin="round"
			/>
		</g>
	),
	// chat
	(k) => (
		<g key={k}>
			<path
				d="M10 14 h36 a4 4 0 0 1 4 4 v18 a4 4 0 0 1 -4 4 h-20 l-10 8 v-8 h-6 a4 4 0 0 1 -4 -4 v-18 a4 4 0 0 1 4 -4z"
				fill="#222"
			/>
			<circle cx={20} cy={27} r={2.6} fill="#fff" />
			<circle cx={28} cy={27} r={2.6} fill="#fff" />
			<circle cx={36} cy={27} r={2.6} fill="#fff" />
		</g>
	),
	// document
	(k) => (
		<g key={k}>
			<path
				d="M15 8 h18 l10 10 v30 a3 3 0 0 1 -3 3 h-25 a3 3 0 0 1 -3 -3 v-37 a3 3 0 0 1 3 -3z"
				fill="#3b78e7"
			/>
			<rect x={19} y={26} width={18} height={3} fill="#fff" />
			<rect x={19} y={33} width={18} height={3} fill="#fff" />
			<rect x={19} y={40} width={12} height={3} fill="#fff" />
		</g>
	),
	// cube
	(k) => (
		<g key={k}>
			<path d="M28 7 L47 18 V39 L28 50 L9 39 V18Z" fill="#1d1d1f" />
			<path d="M28 7 L47 18 L28 29 L9 18Z" fill="#6e6e73" />
			<path d="M28 29 V50" stroke="#fff" strokeWidth={2} />
		</g>
	),
	// calendar
	(k) => (
		<g key={k}>
			<rect
				x={9}
				y={11}
				width={38}
				height={36}
				rx={6}
				fill="#fff"
				stroke="#d9d9d9"
				strokeWidth={2}
			/>
			<rect x={9} y={11} width={38} height={11} rx={5} fill="#f0613a" />
			<text
				x={28}
				y={42}
				textAnchor="middle"
				fontFamily="Segoe UI"
				fontWeight={700}
				fontSize={17}
				fill="#222"
			>
				17
			</text>
		</g>
	),
	// spark
	(k) => (
		<g key={k}>
			<path
				d="M28 6 C30 20 36 26 50 28 C36 30 30 36 28 50 C26 36 20 30 6 28 C20 26 26 20 28 6Z"
				fill="#7b6cf6"
			/>
		</g>
	),
	// palette
	(k) => (
		<g key={k}>
			<circle cx={28} cy={28} r={20} fill="#f6b73c" />
			<circle cx={20} cy={21} r={5} fill="#e5533d" />
			<circle cx={32} cy={17} r={5} fill="#3b78e7" />
			<circle cx={39} cy={28} r={5} fill="#2fa36b" />
			<circle cx={24} cy={37} r={6} fill="#fff" />
		</g>
	),
	// notes
	(k) => (
		<g key={k}>
			<rect x={11} y={9} width={34} height={40} rx={5} fill="#ffd84d" />
			<rect x={17} y={20} width={22} height={3} fill="#8a6d00" />
			<rect x={17} y={28} width={22} height={3} fill="#8a6d00" />
			<rect x={17} y={36} width={14} height={3} fill="#8a6d00" />
		</g>
	),
	// terminal
	(k) => (
		<g key={k}>
			<rect x={8} y={12} width={40} height={32} rx={6} fill="#111" />
			<path d="M15 22 L22 28 L15 34" stroke="#7fe07a" strokeWidth={3} fill="none" />
			<rect x={25} y={33} width={12} height={3} fill="#7fe07a" />
		</g>
	),
	// globe
	(k) => (
		<g key={k}>
			<circle cx={28} cy={28} r={19} fill="#2a9df4" />
			<ellipse cx={28} cy={28} rx={8} ry={19} fill="none" stroke="#fff" strokeWidth={2.4} />
			<path d="M9 28 H47 M13 18 H43 M13 38 H43" stroke="#fff" strokeWidth={2.4} />
		</g>
	),
	// music
	(k) => (
		<g key={k}>
			<rect x={8} y={8} width={40} height={40} rx={10} fill="#fc3c62" />
			<path d="M24 37 V18 L38 15 V33" stroke="#fff" strokeWidth={3} fill="none" />
			<circle cx={21} cy={37} r={4} fill="#fff" />
			<circle cx={35} cy={34} r={4} fill="#fff" />
		</g>
	),
];

function Icon({ i, src }) {
	if (src) {
		return (
			<img
				alt=""
				src={src}
				style={{ width: 58, height: 58, objectFit: "contain", display: "block" }}
			/>
		);
	}
	return (
		<svg width={58} height={58} viewBox="0 0 56 56" style={{ display: "block" }}>
			{GLYPHS[i % GLYPHS.length](i)}
		</svg>
	);
}

export const S4_PRESETS = {
	"laurel-line": {
		note: "A typed serif line that slides from the composer's text slot to the centre, beside a white tile through which app icons roll up on an accelerating cadence (the 'works everywhere' beat); then line and tile rise out. `icons` [{src?, label}] are image slots, one per arrival (11 in the reference); without `src` a neutral drawn glyph stands in. Times are reference frames via `f0`.",
		nativeMs: 4267,
		params: {
			text: ["string", "Types into any app", "the line (role claim)"],
			icons: ["array", "[{label:'mail'},…]", "image slots: {src, label} per arrival"],
			f0: ["number", "294", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 294);
			const text = c.text ?? "";
			const font = `400 ${SIZE}px ${SERIF}`;
			const tw = textWidth(text, font);
			const finalLeft = 640 - (tw + GAP + TILE) / 2;
			const slide = (184 - finalLeft) * (1 - curve(SLIDE, f));
			const fpc = 17 / Math.max(1, text.length);
			const dy = curve(EXIT_DY, f);
			const alpha = curve(EXIT_A, f);
			const icons = c.icons ?? [];
			const tileX = finalLeft + tw + GAP;
			const tiles = [];
			ARRIVE.forEach((a, k) => {
				const next = ARRIVE[k + 1] ?? 1e9;
				const prev = ARRIVE[k - 1] ?? a - 6;
				const din = Math.min(6, (a - prev) * 0.7);
				const dout = Math.min(4, (next - a) * 0.7);
				const pIn = (f - (a - din)) / din;
				const pOut = (f - (next - dout)) / dout;
				if (pIn < 0 || pOut > 1) return;
				const e = (p) => 1 - (1 - Math.min(1, Math.max(0, p))) ** 2;
				const y = pIn < 1 ? 70 * (1 - e(pIn)) : pOut > 0 ? -70 * e(pOut) : 0;
				const op = pIn < 1 ? e(pIn) : pOut > 0 ? 1 - e(pOut) : 1;
				const speed = pIn < 1 ? 70 / din : pOut > 0 ? 70 / dout : 0;
				const sc = pIn < 1 ? 0.82 + 0.18 * e(pIn) : 1;
				const ic = icons[k] ?? {};
				tiles.push(
					<div
						key={`${a}-${ic.label ?? k}`}
						style={{
							position: "absolute",
							left: tileX,
							top: 361 - TILE / 2 + y,
							width: TILE,
							height: TILE,
							borderRadius: 20,
							background: "rgb(252,252,250)",
							boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							opacity: op,
							transform: `scale(${sc.toFixed(3)})`,
							filter:
								speed > 12
									? `blur(${Math.min(6, (speed - 12) * 0.12 + hash(k) * 0.5).toFixed(2)}px)`
									: undefined,
						}}
					>
						<Icon i={k} src={ic.src} />
					</div>,
				);
			});
			return (
				<Layer z={15}>
					<div
						style={{
							position: "absolute",
							inset: 0,
							transform: `translateY(${dy.toFixed(2)}px)`,
							opacity: alpha,
						}}
					>
						<div
							style={{
								position: "absolute",
								left: finalLeft + slide,
								top: BASE - SIZE * 0.92,
								font,
								lineHeight: 1,
								whiteSpace: "nowrap",
							}}
						>
							<Typed text={text} f={f} at={295} fpc={fpc} tail={3} ink={[30, 30, 28]} />
						</div>
						{tiles}
					</div>
				</Layer>
			);
		},
	},
};
