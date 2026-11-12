/**
 * linden s1 — the wall (f1 -> f558, 0 -> 18.6s). One continuous camera.
 *
 * Measured (ref 960-px units unless marked stage):
 *   A  f1-f99    ONE card (2:3, 193 x 286 at f1) alone on black, centred at (480, 262.6), drifting
 *                toward camera: 196.5 px wide at f1, 231 at f40, 267 at f80,
 *                276 at f94 (an ease-in-out push, ~0.38%/frame at its peak).
 *                Behind it the wall fades up inside a widening pool of light:
 *                nothing until f15; by f36 cards within ~200 units of the
 *                hero are at 0.10 of full and the pool's edge is ~320 units
 *                out; by f96 0.31 of full out to ~490 units. The wall itself
 *                sits at 0.92-1.0 scale behind the card (tracked separately:
 *                SIFT on the wall with the card masked out).
 *   B  f99-f113  the card SINKS back into its slot: 270 px wide at f99, 205
 *                at f104, 117 at f108, 80 at f110, settling on the slot's 84
 *                by f113, while the wall lights to full (0.06 f104, 0.44
 *                f108, 0.70 f110, 0.90 f112, 1.0 f114).
 *   C  f114-f330 the camera pushes in, rolls and yaws across the wall and
 *                lands square on the FOCUS card (upper right of the hero).
 *   D  f330-f500 it pulls back and slides down-left over the wall.
 *   E  f500-f558 it accelerates into the gutter between the hero card and
 *                its right-hand neighbour: gutter 697-759 stage px at f540,
 *                653-783 at f550, 513-901 at f557; at f558 only the hero's
 *                edge is left, and from f559 the frame is the black gutter.
 * C, D and E are the homography table CAM in linden-shared.jsx.
 */
import React from "react";
import {
	apply,
	artKind,
	CardArt,
	camAt,
	cardMatrix,
	curve,
	FOCUS,
	HERO,
	HERO_C,
	LAYOUT,
	mix,
	refFrame,
	simAt,
} from "./linden-shared.jsx";

const K = 4 / 3; // ref 960-px units -> stage px

// A/B: the hero card's width (ref px) and centre.
const HERO_W = [
	[1, 196.5],
	[20, 211.2],
	[40, 231.2],
	[60, 252.5],
	[80, 267.0],
	[94, 276.0],
	[97, 274.0],
	[100, 267.5],
	[101, 256.4],
	[102, 245.8],
	[103, 228.4],
	[104, 205.6],
	[105, 182.3],
	[106, 159.1],
	[107, 136.7],
	[108, 117.5],
	[109, 96.3],
	[110, 80.2],
	[111, 80.6],
	[112, 82.2],
	[113, 85.2],
];
const HERO_X = [
	[1, 480],
	[100, 480],
	[104, 478.6],
	[106, 477.2],
	[108, 475.6],
	[110, 473.9],
	[112, 471.7],
	[113, 471.0],
];
const HERO_Y = [
	[1, 262.6],
	[100, 263.5],
	[104, 263.1],
	[106, 261.4],
	[108, 259.9],
	[110, 258.1],
	[112, 257.4],
	[113, 256.3],
];
// A/B: the wall behind it (scale, and where the hero's slot centre lands).
const WALL_S = [
	[1, 0.92],
	[30, 0.935],
	[50, 0.955],
	[60, 0.973],
	[70, 0.982],
	[80, 0.99],
	[90, 0.996],
	[96, 1.0],
	[101, 1.006],
	[104, 0.999],
	[106, 0.99],
	[108, 0.984],
	[110, 0.978],
	[112, 0.976],
	[113, 0.987],
];
const WALL_X = [
	[1, 478],
	[100, 478],
	[104, 476.3],
	[106, 476.2],
	[108, 474.5],
	[110, 473],
	[112, 471.5],
	[113, 470.5],
];
const WALL_Y = [
	[1, 262.6],
	[100, 262.6],
	[104, 262.1],
	[106, 260.7],
	[108, 259.9],
	[110, 258.7],
	[112, 257.3],
	[113, 256.5],
];
// The pool of light: level and edge radius (ref px from the hero centre).
const POOL_G = [
	[15, 0],
	[36, 0.105],
	[41, 0.167],
	[46, 0.206],
	[51, 0.247],
	[56, 0.26],
	[61, 0.267],
	[71, 0.282],
	[81, 0.29],
	[96, 0.306],
];
const POOL_R = [
	[15, 230],
	[36, 322],
	[61, 400],
	[96, 493],
	[110, 700],
];
const POOL_SOFT = 150;
const LIGHT_UP = [
	[99, 0],
	[102, 0.035],
	[104, 0.06],
	[106, 0.17],
	[108, 0.44],
	[110, 0.7],
	[112, 0.9],
	[114, 1],
];
const LAST = 558;

/** Slot order for `media`: nearest the hero first, so a short list fills the middle. */
const ORDER = LAYOUT.map((c, i) => [
	i,
	Math.hypot((c.r[0] + c.r[2]) / 2 - HERO_C[0], (c.r[1] + c.r[3]) / 2 - HERO_C[1]),
])
	.filter(([i]) => i !== HERO && i !== FOCUS)
	.sort((a, b) => a[1] - b[1])
	.map(([i]) => i);

function srcFor(c, i) {
	if (i === HERO) return c.hero?.src;
	if (i === FOCUS) return c.focus?.src;
	const k = ORDER.indexOf(i);
	const m = c.media ?? [];
	return m.length ? m[k % m.length]?.src : undefined;
}

function Card({ H, i, src, light, p }) {
	const [x0, y0, x1, y1] = LAYOUT[i].r;
	const w = x1 - x0;
	const h = y1 - y0;
	const q = [apply(H, x0, y0), apply(H, x1, y0), apply(H, x1, y1), apply(H, x0, y1)];
	const xs = q.map((v) => v[0]);
	const ys = q.map((v) => v[1]);
	if (
		Math.max(...xs) < -20 ||
		Math.min(...xs) > 1300 ||
		Math.max(...ys) < -20 ||
		Math.min(...ys) > 740
	) {
		return null;
	}
	const kb = 1 + 0.06 * p; // a slow push inside a supplied picture
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: w,
				height: h,
				borderRadius: 0.08 * Math.min(w, h),
				overflow: "hidden",
				background: "#000",
				transformOrigin: "0 0",
				transform: cardMatrix(H, x0, y0),
			}}
		>
			{src ? (
				<img
					alt=""
					src={src}
					style={{
						width: w,
						height: h,
						objectFit: "cover",
						display: "block",
						transform: `scale(${kb})`,
					}}
				/>
			) : (
				<CardArt
					kind={artKind(i, w, h)}
					w={w}
					h={h}
					cols={LAYOUT[i].c}
					seed={i + 1}
					p={p}
					id={`c${i}`}
				/>
			)}
			{light < 0.999 ? (
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: "#000",
						opacity: 1 - Math.max(0, light),
					}}
				/>
			) : null}
		</div>
	);
}

export const S1_PRESETS = {
	"linden-wall": {
		note: "The whole picture half of the film: one card alone on black drifting toward camera while a wall of outputs fades up around it, the card sinking back into its slot, then one continuous camera move over the wall (push, roll and yaw onto a focus card, a pull back across the wall, an accelerating dive into the gutter beside the first card) that ends on black. Image slots: `hero` (the opening card), `focus` (the card the camera lands on) and `media` (the rest, nearest the middle first). Without them, drawn placeholder art. Times are reference frames via `f0`; do not stretch it, the camera is a measured path.",
		nativeMs: 18600,
		params: {
			hero: ["object", "-", "image slot {src, label}: the opening card (2:3 portrait)"],
			focus: ["object", "-", "image slot {src, label}: the card the camera lands on at ~11s (2:3)"],
			media: [
				"array",
				"[]",
				"image slots [{src, label}]: the rest of the wall, nearest the hero first; cycles",
			],
			f0: ["number", "1", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 1);
			if (f >= LAST + 0.5) return null;
			const p = Math.min(1, t / 25);
			let H;
			let light = () => 1;
			let hero = null;
			if (f < 114) {
				const at = [curve(WALL_X, f) * K, curve(WALL_Y, f) * K];
				H = simAt(at, curve(WALL_S, f));
				const g = curve(POOL_G, f);
				const R = curve(POOL_R, f);
				const up = curve(LIGHT_UP, f);
				light = (i) => {
					const r = LAYOUT[i].r;
					const d = Math.hypot((r[0] + r[2]) / 2 - HERO_C[0], (r[1] + r[3]) / 2 - HERO_C[1]) / K;
					const pool = g * Math.max(0, Math.min(1, (R - d) / POOL_SOFT));
					return mix([pool], [1], up)[0];
				};
				const [x0, , x1] = LAYOUT[HERO].r;
				const k = (curve(HERO_W, f) * K) / (x1 - x0);
				hero = { H: simAt([curve(HERO_X, f) * K, curve(HERO_Y, f) * K], k) };
			} else if (f <= 557) {
				H = camAt(f);
			} else {
				// f557 -> f558: the last push, x2.4 about (560, 400); measured hero edge
				// 513 -> 472 and its neighbour gone past the right edge
				const z = 2.4 ** (f - 557);
				const B = camAt(557);
				const Z = [
					[z, 0, 560 * (1 - z)],
					[0, z, 400 * (1 - z)],
					[0, 0, 1],
				];
				H = Z.map((row) =>
					[0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]),
				);
			}
			const cards = [];
			for (let i = 0; i < LAYOUT.length; i++) {
				if (i === HERO && hero) continue;
				const l = light(i);
				if (l <= 0.002) continue;
				cards.push(<Card key={i} H={H} i={i} src={srcFor(c, i)} light={l} p={p} />);
			}
			// the black gutter the dive ends in: one frame of the hero's edge, then black
			return (
				<div
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						width: 1280,
						height: 720,
						overflow: "hidden",
						background: "#000",
						zIndex: 10,
					}}
				>
					{cards}
					{hero ? <Card H={hero.H} i={HERO} src={srcFor(c, HERO)} light={1} p={p} /> : null}
				</div>
			);
		},
	},
};
