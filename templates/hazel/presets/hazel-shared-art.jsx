/**
 * hazel-shared-art.jsx — every picture in the film, drawn in code.
 *
 * The reference's generated illustrations, marks and photographed mockups are
 * replaced with original vector stand-ins: a swift (the hero mark), a set of
 * line icons, a camera drawing, a lighthouse illustration, flower-pot motifs
 * and flat mockup scenes. Any of them can be swapped for a real image through
 * the `src` / `srcs` slots in template.json.
 *
 * Line art always draws through DrawSet (pathLength=1, stroke-dash ramp), so a
 * picture can be stroked on from a single progress value.
 */
import React, { useMemo } from "react";
import { clamp01, H, rgbs } from "./hazel-shared.jsx";

// ── generic stroke-on ─────────────────────────────────────────────────────

/** Strokes a list of paths on with a per-path stagger; p in 0..1. */
export function DrawSet({
	paths,
	p = 1,
	stroke = H.cyan,
	width = 1.6,
	stagger = 0.6,
	opacity = 1,
}) {
	const n = paths.length;
	return (
		<g
			fill="none"
			stroke={rgbs(stroke)}
			strokeWidth={width}
			strokeLinecap="round"
			strokeLinejoin="round"
			opacity={opacity}
		>
			{paths.map((d, i) => {
				const span = 1 - stagger;
				const a = n > 1 ? (i / (n - 1)) * stagger : 0;
				const q = clamp01((p - a) / Math.max(1e-4, span));
				if (q <= 0) return null;
				return (
					<path
						key={d.slice(0, 18) + i}
						d={d}
						pathLength="1"
						strokeDasharray="1 1"
						strokeDashoffset={1 - q}
					/>
				);
			})}
		</g>
	);
}

// ── the hero mark ─────────────────────────────────────────────────────────

/** Wing poses for a four-frame flap, measured in a 240 x 160 box. */
export const BIRD_POSES = {
	up: [112, 4],
	mid: [66, 28],
	level: [28, 62],
	half: [88, 42],
};

/** One closed outline for the swift, with the wing tip at (tx, ty). */
export function birdPath(tx = 66, ty = 28) {
	const rf = [158, 70];
	const rr = [108, 88];
	const dx = tx - rf[0];
	const dy = ty - rf[1];
	const L = Math.hypot(dx, dy) || 1;
	const nx = -dy / L;
	const ny = dx / L;
	const f1 = [rf[0] + 0.32 * dx + nx * 0.2 * L, rf[1] + 0.32 * dy + ny * 0.2 * L];
	const f2 = [rf[0] + 0.72 * dx + nx * 0.17 * L, rf[1] + 0.72 * dy + ny * 0.17 * L];
	const bx = rr[0] - tx;
	const by = rr[1] - ty;
	const b1 = [tx + 0.34 * bx - nx * 0.08 * L, ty + 0.34 * by - ny * 0.08 * L];
	const b2 = [tx + 0.72 * bx - nx * 0.15 * L, ty + 0.72 * by - ny * 0.15 * L];
	const fmt = (a) => `${a[0].toFixed(1)} ${a[1].toFixed(1)}`;
	return [
		"M 234 74",
		"C 224 64 206 56 188 58",
		`C 176 58 166 63 ${rf[0]} ${rf[1]}`,
		`C ${fmt(f1)} ${fmt(f2)} ${tx} ${ty}`,
		`C ${fmt(b1)} ${fmt(b2)} ${rr[0]} ${rr[1]}`,
		"C 86 90 62 92 8 80",
		"C 26 96 40 104 56 110",
		"C 42 116 30 124 12 136",
		"C 66 134 122 128 160 108",
		"C 186 98 212 92 234 74",
		"Z",
	].join(" ");
}

/** Filled swift. `pose` is a key of BIRD_POSES or a tip pair. */
export function Bird({ x = 0, y = 0, w = 240, pose = "mid", fill = H.ink, stroke, sw = 2 }) {
	const tip = typeof pose === "string" ? BIRD_POSES[pose] : pose;
	const k = w / 240;
	return (
		<g transform={`translate(${x} ${y}) scale(${k})`}>
			<path
				d={birdPath(tip[0], tip[1])}
				fill={fill ? rgbs(fill) : "none"}
				stroke={stroke ? rgbs(stroke) : "none"}
				strokeWidth={sw / k}
				strokeLinejoin="round"
			/>
		</g>
	);
}

const hexCache = new Map();
/** Grid points inside the swift, used for every halftone. */
export function halftonePoints(pitch, pose = "mid") {
	const key = `${pitch}|${pose}`;
	if (hexCache.has(key)) return hexCache.get(key);
	const tip = BIRD_POSES[pose];
	const path = new Path2D(birdPath(tip[0], tip[1]));
	const ctx = document.createElement("canvas").getContext("2d");
	const pts = [];
	const h = pitch * 0.866;
	let row = 0;
	for (let y = 0; y <= 160; y += h, row++) {
		for (let x = row % 2 ? pitch / 2 : 0; x <= 240; x += pitch) {
			if (ctx.isPointInPath(path, x, y)) pts.push([x, y]);
		}
	}
	hexCache.set(key, pts);
	return pts;
}

/** A swift of dots. `build` 0..1 sweeps the dots on from the tail. */
export function HalftoneBird({
	x,
	y,
	w,
	build = 1,
	pitch = 5.2,
	stroke,
	fill,
	r = 2.2,
	pose = "mid",
}) {
	const k = w / 240;
	const pts = halftonePoints(pitch, pose);
	const front = build * 258 - 8;
	return (
		<g transform={`translate(${x} ${y}) scale(${k})`}>
			{pts.map(([px, py]) => {
				const q = clamp01((front - px) / 18);
				if (q <= 0) return null;
				return (
					<circle
						key={`${px}-${py}`}
						cx={px}
						cy={py}
						r={r * q}
						fill={fill ? rgbs(fill) : "none"}
						stroke={stroke ? rgbs(stroke) : "none"}
						strokeWidth={0.5 / k}
					/>
				);
			})}
		</g>
	);
}

/** The small brand glyph (a filbert), 24-unit box, knocked-out highlight. */
export function NutGlyph({ x = 0, y = 0, size = 24, fill = H.ink }) {
	const k = size / 24;
	return (
		<g transform={`translate(${x} ${y}) scale(${k})`}>
			<path
				d="M12 1.4 C 13.2 4.2 19.8 8 19.8 14.4 C 19.8 19.2 16.2 22.6 12 22.6 C 7.8 22.6 4.2 19.2 4.2 14.4 C 4.2 8 10.8 4.2 12 1.4 Z"
				fill={rgbs(fill)}
			/>
			<path
				d="M8.2 14.6 C 8.4 11.6 10.2 9.4 12 8.2"
				fill="none"
				stroke="#fff"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</g>
	);
}

/** The big round product mark: a swift over a striped sun. */
export function SunMark({
	cx = 0,
	cy = 0,
	r = 100,
	ink = [26, 26, 28],
	line = false,
	gap = [245, 245, 243],
}) {
	const id = `sun${Math.round(r)}${line ? "l" : "f"}`;
	if (line) {
		return (
			<g fill="none" stroke={rgbs(H.line)} strokeWidth="1.3">
				<circle cx={cx} cy={cy} r={r} />
				{[0.1, 0.32, 0.54].map((d) => (
					<line key={d} x1={cx - r * 0.86} x2={cx + r * 0.86} y1={cy + r * d} y2={cy + r * d} />
				))}
				<Bird
					x={cx - r * 0.96}
					y={cy - r * 1.08}
					w={r * 1.92}
					fill={null}
					stroke={H.line}
					sw={1.3}
				/>
			</g>
		);
	}
	return (
		<g>
			<defs>
				<clipPath id={id}>
					<circle cx={cx} cy={cy} r={r} />
				</clipPath>
			</defs>
			<circle cx={cx} cy={cy} r={r} fill={rgbs(ink)} />
			<g clipPath={`url(#${id})`}>
				{[0.1, 0.32, 0.54, 0.76].map((d) => (
					<rect
						key={d}
						x={cx - r}
						y={cy + r * d}
						width={r * 2}
						height={r * 0.08}
						fill={rgbs(gap)}
					/>
				))}
			</g>
			<Bird
				x={cx - r * 0.96}
				y={cy - r * 1.08}
				w={r * 1.92}
				fill={ink}
				stroke={gap}
				sw={r * 0.05}
			/>
		</g>
	);
}

// ── line icons (a 100-unit box each) ──────────────────────────────────────

export const ICONS = {
	compass: ["M50 10 A40 40 0 1 1 49.9 10", "M64 36 L56 56 L36 64 L44 44 Z", "M50 4 V10 M50 90 V96"],
	tent: ["M10 84 L50 22 L90 84 Z", "M50 22 V10", "M38 84 L50 56 L62 84", "M4 84 H96"],
	mountain: ["M4 86 L36 30 L54 58 L68 40 L96 86 Z", "M28 44 L36 52 L44 42"],
	lantern: [
		"M34 30 H66 V76 H34 Z",
		"M42 22 H58 L66 30 M42 22 L34 30",
		"M40 76 V84 H60 V76",
		"M50 12 V22",
		"M50 42 C 42 52 44 62 50 66 C 56 62 58 52 50 42 Z",
	],
	boot: [
		"M30 14 H58 L60 54 L84 66 C 90 70 92 76 92 84 H26 Z",
		"M26 84 V90 H92 V84",
		"M34 28 H54 M34 40 H55",
	],
	bike: [
		"M26 70 A18 18 0 1 1 25.9 70",
		"M74 70 A18 18 0 1 1 73.9 70",
		"M26 70 L44 40 H66 L74 70 M44 40 L54 70 H26 M54 70 L66 40",
		"M40 32 H50 M66 40 L62 28 H72",
	],
	pin: [
		"M50 92 C 34 66 22 54 22 38 A28 28 0 0 1 78 38 C 78 54 66 66 50 92 Z",
		"M50 26 A12 12 0 1 1 49.9 26",
	],
	flask: [
		"M40 10 H60 M44 10 V40 L18 84 C 16 90 20 94 26 94 H74 C 80 94 84 90 82 84 L56 40 V10",
		"M28 66 H72",
	],
	tram: [
		"M30 12 H70 A10 10 0 0 1 80 22 V70 A10 10 0 0 1 70 80 H30 A10 10 0 0 1 20 70 V22 A10 10 0 0 1 30 12 Z",
		"M20 46 H80 M34 90 L40 80 M66 90 L60 80 M40 62 H60",
	],
};

export function Icon({ name, x, y, size, p = 1, stroke = H.cyan, width = 1.6, stagger = 0.5 }) {
	const k = size / 100;
	return (
		<g transform={`translate(${x} ${y}) scale(${k})`}>
			<DrawSet paths={ICONS[name]} p={p} stroke={stroke} width={width / k} stagger={stagger} />
		</g>
	);
}

/** Black-line UI icon for the app window rows. */
export const WindowIcon = ({ name, x, y, size }) => (
	<Icon name={name} x={x} y={y} size={size} stroke={[34, 36, 42]} width={2.4} stagger={0} />
);

// ── camera technical drawing (a 620 x 720 box) ────────────────────────────

const CIRC = (cx, cy, r) => `M${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx - r + 0.01} ${cy}`;

export const CAMERA_PATHS = [
	// body
	"M104 248 H516 A16 16 0 0 1 532 264 V452 A16 16 0 0 1 516 468 H104 A16 16 0 0 1 88 452 V264 A16 16 0 0 1 104 248 Z",
	"M88 296 H532",
	"M88 424 H532",
	"M226 248 L244 206 H376 L394 248",
	"M272 218 H348 V236 H272 Z",
	"M138 248 V226 H184 V248",
	"M446 248 V230 H506 V248",
	CIRC(136, 340, 18),
	CIRC(484, 338, 22),
	"M484 316 V338 L500 348",
	// lens
	CIRC(310, 360, 92),
	CIRC(310, 360, 74),
	CIRC(310, 360, 54),
	CIRC(310, 360, 28),
	"M286 334 C 294 326 306 322 318 324",
	// callouts
	CIRC(84, 118, 58),
	"M128 160 L190 226",
	"M52 118 H116 M84 86 V150 M62 96 L106 140",
	CIRC(536, 112, 58),
	"M492 152 L420 226",
	"M536 66 V158 M490 112 H582",
	CIRC(536, 112, 24),
	CIRC(92, 606, 62),
	"M136 562 L214 470",
	"M56 606 C 72 584 112 584 128 606 M56 622 C 72 644 112 644 128 622",
	CIRC(528, 606, 62),
	"M484 562 L402 470",
	"M494 582 L562 630 M562 582 L494 630",
	"M0 696 H620",
];

// ── lighthouse illustration (1012 x 720 box) ──────────────────────────────

/** Fill layers, in paint order. Each also strokes for the line-art state. */
export const SCENE = [
	{ d: "M0 0 H1012 V720 H0 Z", f: [116, 214, 240] },
	{ d: "M0 0 H1012 V140 C 760 180 260 170 0 120 Z", f: [146, 226, 244] },
	{ d: "M734 92 A62 62 0 1 1 733.9 92", f: [254, 222, 130] },
	{
		d: "M60 190 C 60 150 120 140 150 170 C 170 130 250 130 268 182 C 300 176 332 200 322 236 H52 C 30 232 30 196 60 190 Z",
		f: [252, 252, 250],
	},
	{
		d: "M720 300 C 722 262 780 250 806 278 C 830 240 908 244 918 292 C 952 288 984 310 974 344 H716 C 692 340 694 306 720 300 Z",
		f: [252, 252, 250],
	},
	{ d: "M0 420 H1012 V600 H0 Z", f: [62, 164, 190] },
	{ d: "M0 420 H1012 V446 H0 Z", f: [108, 200, 214] },
	{ d: "M120 470 H310 M420 500 H700 M760 462 H930 M60 540 H260 M640 556 H880", f: null },
	{ d: "M462 96 L450 720 H570 L558 96 Z", f: [248, 244, 234] },
	{ d: "M456 300 L453 420 H567 L564 300 Z", f: [226, 72, 62] },
	{ d: "M452 560 L450 680 H570 L568 560 Z", f: [226, 72, 62] },
	{ d: "M448 40 H572 V96 H448 Z", f: [38, 62, 84] },
	{ d: "M462 18 H558 L572 40 H448 Z", f: [226, 72, 62] },
	{ d: "M474 50 H546 V88 H474 Z", f: [254, 226, 130] },
	{
		d: "M0 720 V612 C 140 560 240 576 370 620 C 470 656 560 642 650 610 C 780 566 910 572 1012 620 V720 Z",
		f: [52, 124, 96],
	},
	{
		d: "M0 720 V664 C 170 630 340 668 500 690 C 660 708 860 668 1012 682 V720 Z",
		f: [226, 188, 110],
	},
	{
		d: "M820 420 L864 340 V420 Z M872 420 V322 L918 420 Z M806 430 H934 L918 452 H826 Z",
		f: [244, 240, 228],
	},
	{ d: "M160 300 C 172 288 182 288 192 300 C 202 288 214 288 226 300", f: null },
	{ d: "M88 344 C 96 336 104 336 112 344 C 120 336 128 336 136 344", f: null },
	// detail strokes (line state only)
	{ d: "M462 96 H558 M458 180 H562 M454 240 H566 M446 40 L574 40", lo: true },
	{ d: "M478 54 H542 V84 H478 Z M498 54 V84 M520 54 V84 M478 68 H542", lo: true },
	{
		d: "M60 190 C 84 180 110 196 128 216 M150 170 C 158 196 170 214 206 228 M268 182 C 262 204 276 224 296 232",
		lo: true,
	},
	{
		d: "M720 300 C 744 290 766 304 782 322 M806 278 C 812 302 826 320 860 332 M918 292 C 914 314 928 332 950 340",
		lo: true,
	},
	{
		d: "M0 500 C 120 490 180 512 300 502 C 430 490 520 516 660 504 C 780 494 880 516 1012 504",
		lo: true,
	},
	{ d: "M0 580 C 160 566 280 592 460 578 C 620 566 760 592 1012 576", lo: true },
	{
		d: "M0 640 C 90 620 150 628 220 644 M300 672 C 380 650 470 660 560 676 M660 652 C 760 628 860 634 960 652",
		lo: true,
	},
	{ d: "M820 420 L864 340 M872 420 L872 322 M806 430 H934", lo: true },
	{ d: "M70 118 L152 72 L234 118 M90 118 V190 H214 V118", lo: true },
	{ d: "M96 148 H136 V190 H96 Z M168 148 H208 V168 H168 Z", lo: true },
	{
		d: "M840 150 A36 36 0 1 1 839.9 150 M876 140 V128 M876 228 V216 M822 186 H810 M942 186 H930 M836 146 L828 138 M916 226 L924 234",
		lo: true,
	},
];

/** The illustration as line art (`p` strokes it on) and / or in colour. */
export function SceneLine({ p = 1, stroke = H.cyan, width = 1.5 }) {
	return (
		<DrawSet paths={SCENE.map((s) => s.d)} p={p} stroke={stroke} width={width} stagger={0.55} />
	);
}

export function SceneColour() {
	return (
		<g>
			{SCENE.filter((s) => !s.lo).map((s) =>
				s.f ? (
					<path key={s.d.slice(0, 24)} d={s.d} fill={rgbs(s.f)} />
				) : (
					<path
						key={s.d.slice(0, 24)}
						d={s.d}
						fill="none"
						stroke="#fff"
						strokeWidth="3"
						opacity="0.85"
					/>
				),
			)}
		</g>
	);
}

// ── pot-and-flower motifs (300 x 400 box) ─────────────────────────────────

export const VASES = {
	1: {
		bg: [244, 244, 170],
		pot: [176, 138, 76],
		rim: [122, 66, 32],
		stem: [156, 118, 50],
		petal: [224, 172, 76],
		tip: [194, 96, 40],
		flower: "wheat",
	},
	2: {
		bg: [158, 134, 186],
		pot: [22, 80, 88],
		rim: [60, 14, 62],
		stem: [24, 22, 42],
		petal: [240, 208, 46],
		tip: [214, 40, 86],
		flower: "fan",
	},
	3: {
		bg: [186, 158, 244],
		pot: [66, 132, 214],
		rim: [28, 42, 118],
		stem: [224, 118, 74],
		petal: [236, 92, 70],
		tip: [250, 170, 122],
		flower: "tulip",
	},
	4: {
		bg: [196, 200, 88],
		pot: [128, 70, 180],
		rim: [56, 22, 92],
		stem: [76, 110, 70],
		petal: [238, 112, 150],
		tip: [252, 200, 214],
		flower: "round",
	},
	5: {
		bg: [252, 236, 226],
		pot: [228, 158, 56],
		rim: [176, 60, 52],
		stem: [96, 128, 70],
		petal: [244, 188, 56],
		tip: [236, 108, 62],
		flower: "tower",
	},
	6: {
		bg: [64, 110, 200],
		pot: [214, 72, 62],
		rim: [240, 140, 112],
		stem: [36, 60, 40],
		petal: [244, 206, 80],
		tip: [228, 86, 122],
		flower: "fan",
	},
	7: {
		bg: [206, 62, 52],
		pot: [244, 222, 200],
		rim: [120, 32, 26],
		stem: [48, 26, 22],
		petal: [250, 232, 214],
		tip: [242, 170, 120],
		flower: "round",
	},
	8: {
		bg: [192, 238, 88],
		pot: [54, 22, 110],
		rim: [226, 74, 120],
		stem: [30, 56, 60],
		petal: [212, 58, 104],
		tip: [120, 40, 170],
		flower: "tulip",
	},
};

function Flower({ kind, x, y, s, pal, rot = 0 }) {
	const P = rgbs(pal.petal);
	const T = rgbs(pal.tip);
	const body = {
		wheat: (
			<>
				{[-16, -6, 6, 16].map((a) => (
					<ellipse
						key={a}
						cx={a * 0.9}
						cy={-Math.abs(a) * 0.5 - 8}
						rx="4.5"
						ry="10"
						fill={P}
						transform={`rotate(${a * 1.4} ${a * 0.9} 0)`}
					/>
				))}
				<ellipse cx="0" cy="-20" rx="4" ry="9" fill={T} />
			</>
		),
		fan: (
			<>
				{[-54, -27, 0, 27, 54].map((a) => (
					<path
						key={a}
						d="M0 0 L-7 -28 Q0 -36 7 -28 Z"
						fill={a % 2 ? T : P}
						transform={`rotate(${a})`}
					/>
				))}
				<circle r="5" fill={T} />
			</>
		),
		tulip: (
			<>
				<path
					d="M-13 0 C -18 -16 -12 -30 -10 -32 L-3 -22 L0 -34 L3 -22 L10 -32 C 12 -30 18 -16 13 0 Z"
					fill={P}
				/>
				<ellipse cx="0" cy="-8" rx="6" ry="10" fill={T} />
			</>
		),
		round: (
			<>
				{[0, 60, 120, 180, 240, 300].map((a) => (
					<ellipse key={a} cx="0" cy="-16" rx="8" ry="12" fill={P} transform={`rotate(${a})`} />
				))}
				<circle r="8" fill={T} />
			</>
		),
		tower: (
			<>
				<ellipse cx="0" cy="-2" rx="18" ry="9" fill={P} />
				<ellipse cx="0" cy="-15" rx="13" ry="8" fill={T} />
				<circle cx="0" cy="-28" r="8" fill={P} />
			</>
		),
	}[kind];
	return <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>{body}</g>;
}

/** A symmetrical pot of flowers. `grow` 0..1 builds pot, stems, then blooms. */
export function Vase({ id = 1, x = 0, y = 0, w = 300, h = 400, grow = 1, bg = true }) {
	const pal = VASES[id];
	const blooms = [
		[150, 92, 1.5, 0],
		[92, 118, 1.25, -18],
		[208, 118, 1.25, 18],
		[50, 170, 1.05, -30],
		[250, 170, 1.05, 30],
	];
	return (
		<g transform={`translate(${x} ${y}) scale(${w / 300} ${h / 400})`}>
			{bg && <rect width="300" height="400" fill={rgbs(pal.bg)} />}
			{grow > 0.12 && (
				<g>
					<path
						d="M92 244 C 70 262 66 318 112 356 H188 C 234 318 230 262 208 244 Z"
						fill={rgbs(pal.pot)}
					/>
					<path
						d="M84 236 H216 C 220 236 220 252 216 252 H84 C 80 252 80 236 84 236 Z"
						fill={rgbs(pal.rim)}
					/>
					<path d="M150 266 L184 304 L150 342 L116 304 Z" fill={rgbs(pal.petal)} />
					<circle cx="150" cy="304" r="12" fill={rgbs(pal.rim)} />
					<path
						d="M82 300 C 96 286 100 322 118 308 M218 300 C 204 286 200 322 182 308"
						fill="none"
						stroke={rgbs(pal.tip)}
						strokeWidth="5"
						strokeLinecap="round"
					/>
				</g>
			)}
			{grow > 0.35 &&
				blooms.map(([bx, by]) => (
					<path
						key={`s${bx}`}
						d={`M150 238 C 150 200 ${bx} 190 ${bx} ${by + 8}`}
						fill="none"
						stroke={rgbs(pal.stem)}
						strokeWidth="5"
					/>
				))}
			{blooms.map(([bx, by, s, r], i) =>
				grow > 0.55 + i * 0.08 ? (
					<Flower key={`f${bx}`} kind={pal.flower} x={bx} y={by} s={s} pal={pal} rot={r} />
				) : null,
			)}
		</g>
	);
}

// ── small tile art (w x h boxes) ──────────────────────────────────────────

const IsoBox = ({ x, y, w, d, h, stroke, fill }) => {
	const a = 0.5;
	const top = `M${x} ${y - h} L${x + w} ${y - h - w * a} L${x + w + d} ${y - h - w * a + d * a} L${x + d} ${y - h + d * a} Z`;
	const left = `M${x} ${y - h} L${x} ${y} L${x + d} ${y + d * a} L${x + d} ${y - h + d * a} Z`;
	const right = `M${x + d} ${y + d * a} L${x + w + d} ${y - w * a + d * a} L${x + w + d} ${y - h - w * a + d * a} L${x + d} ${y - h + d * a} Z`;
	return (
		<g fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round">
			<path d={left} />
			<path d={right} />
			<path d={top} />
		</g>
	);
};

export const TILES = {
	plant: (w, h) => (
		<g>
			<rect width={w} height={h} fill={rgbs([186, 198, 212])} />
			<Vase id={4} x={w * 0.14} y={h * 0.04} w={w * 0.72} h={h * 0.96} bg={false} />
		</g>
	),
	lock: (w, h) => (
		<g>
			<rect width={w} height={h} fill={rgbs([226, 238, 240])} />
			<path
				d={`M${w * 0.34} ${h * 0.5} V${h * 0.34} A${w * 0.16} ${w * 0.16} 0 0 1 ${w * 0.66} ${h * 0.34} V${h * 0.5}`}
				fill="none"
				stroke={rgbs([74, 78, 92])}
				strokeWidth={w * 0.07}
			/>
			<rect
				x={w * 0.26}
				y={h * 0.46}
				width={w * 0.48}
				height={h * 0.42}
				rx={w * 0.08}
				fill={rgbs([190, 60, 170])}
			/>
			<circle cx={w * 0.5} cy={h * 0.62} r={w * 0.07} fill={rgbs([60, 22, 90])} />
			<rect
				x={w * 0.47}
				y={h * 0.64}
				width={w * 0.06}
				height={h * 0.16}
				fill={rgbs([60, 22, 90])}
			/>
		</g>
	),
	kite: (w, h) => (
		<g>
			<path
				d={`M${w * 0.5} ${h * 0.06} L${w * 0.84} ${h * 0.46} L${w * 0.5} ${h * 0.94} L${w * 0.16} ${h * 0.46} Z`}
				fill={rgbs([250, 196, 92])}
			/>
			<path
				d={`M${w * 0.5} ${h * 0.06} L${w * 0.84} ${h * 0.46} L${w * 0.5} ${h * 0.46} Z`}
				fill={rgbs([234, 106, 72])}
			/>
			<path
				d={`M${w * 0.5} ${h * 0.94} L${w * 0.16} ${h * 0.46} L${w * 0.5} ${h * 0.46} Z`}
				fill={rgbs([136, 118, 226])}
			/>
			<path
				d={`M${w * 0.5} ${h * 0.94} C ${w * 0.4} ${h * 1.04} ${w * 0.62} ${h * 1.06} ${w * 0.52} ${h * 1.16}`}
				fill="none"
				stroke={rgbs([136, 118, 226])}
				strokeWidth="2"
			/>
		</g>
	),
	chair: (w, h) => (
		<g
			fill="none"
			stroke={rgbs([34, 36, 42])}
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path
				d={`M${w * 0.2} ${h * 0.12} C ${w * 0.26} ${h * 0.02} ${w * 0.76} ${h * 0.02} ${w * 0.82} ${h * 0.12} L${w * 0.78} ${h * 0.46} H${w * 0.24} Z`}
			/>
			{[0.34, 0.46, 0.58, 0.7].map((k) => (
				<path key={k} d={`M${w * k} ${h * 0.08} V${h * 0.46}`} />
			))}
			<path d={`M${w * 0.16} ${h * 0.5} H${w * 0.86} L${w * 0.82} ${h * 0.58} H${w * 0.2} Z`} />
			<path
				d={`M${w * 0.24} ${h * 0.58} L${w * 0.18} ${h * 0.98} M${w * 0.78} ${h * 0.58} L${w * 0.84} ${h * 0.98} M${w * 0.4} ${h * 0.58} L${w * 0.38} ${h * 0.86} M${w * 0.62} ${h * 0.58} L${w * 0.64} ${h * 0.86}`}
			/>
		</g>
	),
	cabin: (w, h) => {
		const stroke = rgbs([94, 112, 216]);
		const fill = "rgba(255,255,255,0.65)";
		return (
			<g>
				<rect width={w} height={h} fill={rgbs([224, 228, 248])} />
				<g transform={`translate(${w * 0.12} ${h * 0.62}) scale(${w / 280})`}>
					<IsoBox x={0} y={46} w={88} d={120} h={4} stroke={stroke} fill="rgba(255,255,255,0.4)" />
					<IsoBox x={34} y={10} w={70} d={72} h={46} stroke={stroke} fill={fill} />
					<path
						d="M34 -36 L72 -92 L142 -70 L104 -72 L104 -80 L34 -36"
						fill={fill}
						stroke={stroke}
						strokeWidth="1.4"
					/>
					<path d="M34 -36 L72 -92 L106 -40" fill="none" stroke={stroke} strokeWidth="1.4" />
					<IsoBox x={132} y={40} w={18} d={18} h={40} stroke={stroke} fill={fill} />
				</g>
			</g>
		);
	},
	watch: (w, h) => (
		<g fill="none" stroke={rgbs([86, 86, 88])} strokeWidth="1.5" strokeLinejoin="round">
			<rect width={w} height={h} fill={rgbs([232, 232, 232])} stroke="none" />
			<rect
				x={w * 0.3}
				y={h * 0.18}
				width={w * 0.42}
				height={h * 0.52}
				rx={w * 0.09}
				transform={`rotate(14 ${w * 0.5} ${h * 0.44})`}
			/>
			<rect
				x={w * 0.35}
				y={h * 0.24}
				width={w * 0.32}
				height={h * 0.4}
				rx={w * 0.06}
				transform={`rotate(14 ${w * 0.5} ${h * 0.44})`}
			/>
			<path
				d={`M${w * 0.42} ${h * 0.2} L${w * 0.5} ${h * -0.02} H${w * 0.78} L${w * 0.72} ${h * 0.24}`}
			/>
			<path
				d={`M${w * 0.3} ${h * 0.66} L${w * 0.24} ${h * 0.98} H${w * 0.52} L${w * 0.58} ${h * 0.72}`}
			/>
		</g>
	),
	phoneIso: (w, h) => (
		<g>
			<rect width={w} height={h} fill={rgbs([220, 236, 238])} />
			<g transform={`translate(${w * 0.16} ${h * 0.62}) scale(${w / 160})`}>
				<IsoBox
					x={0}
					y={0}
					w={60}
					d={80}
					h={5}
					stroke={rgbs([96, 104, 112])}
					fill="rgba(255,255,255,0.8)"
				/>
				<IsoBox
					x={8}
					y={22}
					w={60}
					d={80}
					h={5}
					stroke={rgbs([96, 104, 112])}
					fill="rgba(255,255,255,0.5)"
				/>
			</g>
		</g>
	),
	cameraLine: (w, h) => (
		<g transform={`scale(${Math.min(w / 620, h / 720)})`}>
			<DrawSet paths={CAMERA_PATHS} p={1} stroke={[120, 124, 132]} width={4} stagger={0} />
		</g>
	),
	gear: (w, h) => (
		<g fill="none" stroke={rgbs([150, 150, 150])} strokeWidth="1.2">
			<circle cx={w * 0.5} cy={h * 0.52} r={w * 0.3} />
			<circle cx={w * 0.5} cy={h * 0.52} r={w * 0.18} />
			{[0, 45, 90, 135].map((a) => (
				<line
					key={a}
					x1={w * 0.5}
					y1={h * 0.16}
					x2={w * 0.5}
					y2={h * 0.88}
					transform={`rotate(${a} ${w * 0.5} ${h * 0.52})`}
				/>
			))}
		</g>
	),
	badge: (w, h) => (
		<g>
			<rect width={w} height={h} fill={rgbs([92, 56, 170])} />
			<g transform={`translate(${w * 0.08} ${h * 0.14}) scale(${(w * 0.84) / 240})`}>
				<path d={birdPath(66, 28)} fill={rgbs([224, 222, 244])} />
			</g>
		</g>
	),
	sign: (w, h) => (
		<g>
			<rect width={w} height={h} rx="4" fill={rgbs([28, 32, 36])} />
			<g transform={`translate(${w * 0.24} ${h * 0.38}) scale(${(w * 0.52) / 240})`}>
				<path d={birdPath(112, 4)} fill="#fff" />
			</g>
		</g>
	),
	iconSheet: (w, h) => (
		<g>
			<rect width={w} height={h} fill={rgbs([170, 236, 176])} />
			{["tent", "pin", "lantern", "compass"].map((n, i) => (
				<Icon
					key={n}
					name={n}
					x={w * 0.1 + (i % 2) * w * 0.44}
					y={h * 0.1 + (i > 1 ? 1 : 0) * h * 0.44}
					size={w * 0.36}
					stroke={[30, 110, 70]}
					width={1.6}
					stagger={0}
				/>
			))}
		</g>
	),
	wordmark: (w, h, label = "ORCHARD") => (
		<text
			x={w / 2}
			y={h * 0.68}
			textAnchor="middle"
			style={{ font: `700 ${Math.min(h * 0.5, w / (label.length * 0.68))}px Georgia, serif` }}
			fill={rgbs([26, 28, 30])}
		>
			{label}
		</text>
	),
	night: (w, h) => (
		<g>
			<rect width={w} height={h} fill={rgbs([26, 48, 110])} />
			<g transform={`translate(${w * 0.18} ${h * 0.24}) scale(${(w * 0.64) / 240})`}>
				<path d={birdPath(112, 4)} fill={rgbs([220, 234, 250])} />
			</g>
		</g>
	),
	landscape: (w, h) => (
		<g>
			<rect width={w} height={h * 0.62} fill={rgbs([40, 92, 200])} />
			<rect y={h * 0.6} width={w} height={h * 0.4} fill={rgbs([40, 120, 74])} />
			<path
				d={`M0 ${h * 0.62} L${w * 0.22} ${h * 0.36} L${w * 0.42} ${h * 0.62} M${w * 0.42} ${h * 0.62} L${w * 0.72} ${h * 0.3} L${w} ${h * 0.62} Z`}
				fill={rgbs([28, 74, 60])}
			/>
			<circle cx={w * 0.74} cy={h * 0.2} r={h * 0.08} fill="#fff" />
		</g>
	),
	sceneLine: (w, h) => (
		<svg
			x="0"
			y="0"
			width={w}
			height={h}
			viewBox="0 0 1012 720"
			preserveAspectRatio="xMidYMid slice"
		>
			<rect width="1012" height="720" fill="rgb(232,244,251)" />
			<SceneLine p={1} width={4} />
		</svg>
	),
	lighthouse: (w, h) => (
		<svg
			x="0"
			y="0"
			width={w}
			height={h}
			viewBox="0 0 1012 720"
			preserveAspectRatio="xMidYMid slice"
		>
			<SceneColour />
		</svg>
	),
};

/** A positioned tile: the user's image when `src` is set, else TILES[art]. */
export function TileBox({
	x,
	y,
	w,
	h,
	art,
	src,
	label,
	opacity = 1,
	scale = 1,
	blur = 0,
	radius = 0,
}) {
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: w,
				height: h,
				opacity,
				transform: scale !== 1 ? `scale(${scale.toFixed(4)})` : undefined,
				filter: blur ? `blur(${blur.toFixed(2)}px)` : undefined,
				borderRadius: radius,
				overflow: "hidden",
			}}
		>
			{src ? (
				<img alt="" src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
			) : (
				<svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
					{TILES[art]?.(w, h, label)}
				</svg>
			)}
		</div>
	);
}

// ── stamps ────────────────────────────────────────────────────────────────

/** A perforated postage stamp with a motif, a caption and a denomination. */
export function Stamp({
	vase = 2,
	w = 320,
	h = 420,
	caption = "Filbert Collectors",
	price = "85¢",
	tag = "forma",
}) {
	const hole = 7;
	const nx = Math.floor(w / (hole * 2.6));
	const ny = Math.floor(h / (hole * 2.6));
	const holes = [];
	for (let i = 0; i <= nx; i++) {
		const x = (i * w) / nx;
		holes.push([x, 0], [x, h]);
	}
	for (let i = 0; i <= ny; i++) {
		const y = (i * h) / ny;
		holes.push([0, y], [w, y]);
	}
	const id = `stampmask${vase}${w}`;
	return (
		<svg
			width={w}
			height={h}
			style={{ overflow: "visible", filter: "drop-shadow(0 4px 8px rgba(40,30,20,0.32))" }}
		>
			<defs>
				<mask id={id}>
					<rect x="-2" y="-2" width={w + 4} height={h + 4} fill="#fff" />
					{holes.map(([cx, cy]) => (
						<circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={hole / 2} fill="#000" />
					))}
				</mask>
			</defs>
			<g mask={`url(#${id})`}>
				<rect width={w} height={h} fill={rgbs([248, 246, 240])} />
				<Vase id={vase} x={w * 0.08} y={h * 0.06} w={w * 0.84} h={h * 0.7} />
				<text
					x={w * 0.5}
					y={h * 0.83}
					textAnchor="middle"
					style={{ font: `400 ${w * 0.082}px Georgia, serif` }}
					fill={rgbs([60, 62, 66])}
					opacity="0.92"
				>
					{caption}
				</text>
				<text
					x={w * 0.1}
					y={h * 0.95}
					style={{ font: `400 ${w * 0.11}px Consolas, monospace` }}
					fill={rgbs([46, 48, 50])}
				>
					{tag}
				</text>
				<text
					x={w * 0.9}
					y={h * 0.95}
					textAnchor="end"
					style={{ font: `400 ${w * 0.11}px Consolas, monospace` }}
					fill={rgbs([46, 48, 50])}
				>
					{price}
				</text>
			</g>
		</svg>
	);
}

// ── flat mockup scenes (1280 x 720) ───────────────────────────────────────

const Knit = ({ id }) => (
	<filter id={id} x="0" y="0" width="100%" height="100%">
		<feTurbulence type="fractalNoise" baseFrequency="0.9 0.28" numOctaves="2" seed="7" />
		<feColorMatrix values="0 0 0 0 0.46  0 0 0 0 0.46  0 0 0 0 0.47  0 0 0 0.55 -0.16" />
		<feComposite in2="SourceGraphic" operator="over" />
	</filter>
);

/** Deterministic speckle fibres for the paper mockups. */
function Fibres({ count = 70, colour = [170, 164, 150] }) {
	const items = useMemo(() => {
		const out = [];
		let v = 1234;
		const r = () => {
			v = (v * 16807) % 2147483647;
			return v / 2147483647;
		};
		for (let i = 0; i < count; i++) {
			const x = r() * 1280;
			const y = r() * 720;
			const a = r() * Math.PI * 2;
			const l = 16 + r() * 44;
			const c = r();
			out.push({ x, y, x2: x + Math.cos(a) * l, y2: y + Math.sin(a) * l, c, k: i });
		}
		return out;
	}, [count]);
	return (
		<g stroke={rgbs(colour)} fill="none" strokeWidth="1.3" strokeLinecap="round" opacity="0.55">
			{items.map((f) => (
				<path
					key={f.k}
					d={`M${f.x} ${f.y} Q${(f.x + f.x2) / 2 + f.c * 12} ${(f.y + f.y2) / 2 - f.c * 12} ${f.x2} ${f.y2}`}
				/>
			))}
		</g>
	);
}

/** One full-frame mockup; `kind` names the drawn scene. */
export function Mockup({ kind, pose = "mid", tint }) {
	const birdAt = (x, y, w, fill, extra) => (
		<Bird x={x} y={y} w={w} pose={pose} fill={fill} {...extra} />
	);
	const scenes = {
		card: (
			<svg width="1280" height="720">
				<rect width="1280" height="720" fill={rgbs([238, 238, 238])} />
				<rect x="150" y="76" width="980" height="568" fill={rgbs([222, 222, 222])} />
				{birdAt(452, 228, 380, tint ?? [52, 54, 56])}
			</svg>
		),
		fibre: (
			<svg width="1280" height="720">
				<rect width="1280" height="720" fill={rgbs([232, 232, 230])} />
				<Fibres count={90} />
				{birdAt(440, 212, 400, tint ?? [64, 56, 96])}
			</svg>
		),
		shoe: (
			<svg width="1280" height="720">
				<rect width="1280" height="720" fill={rgbs([92, 74, 62])} />
				<path
					d="M-40 720 V218 C 220 150 520 60 880 -40 H1320 C 1296 40 1252 110 1190 172 C 1260 214 1320 290 1320 360 V720 Z"
					fill={rgbs([232, 228, 222])}
				/>
				<path
					d="M-40 620 C 300 640 880 650 1320 590"
					fill="none"
					stroke={rgbs([196, 192, 186])}
					strokeWidth="5"
				/>
				<path d="M-40 668 H1320 V720 H-40 Z" fill={rgbs([250, 248, 244])} />
				{[0, 1, 2, 3].map((i) => (
					<path
						key={i}
						d={`M${880 + i * 74} ${10 + i * 54} l76 46`}
						stroke="#fff"
						strokeWidth="16"
						strokeLinecap="round"
					/>
				))}
				{birdAt(452, 300, 430, tint ?? [54, 54, 56])}
			</svg>
		),
		tag: (
			<svg width="1280" height="720">
				<rect width="1280" height="720" fill={rgbs([236, 236, 238])} />
				<rect x="-20" y="170" width="1100" height="380" rx="70" fill={rgbs([224, 224, 226])} />
				{birdAt(130, 256, 560, tint ?? [24, 26, 40])}
				<text
					x="870"
					y="470"
					style={{ font: "600 240px Segoe UI, sans-serif" }}
					fill={rgbs([24, 26, 40])}
				>
					F
				</text>
			</svg>
		),
		pocket: (
			<svg width="1280" height="720">
				<defs>
					<Knit id="twillf" />
				</defs>
				<rect width="1280" height="720" fill={rgbs([196, 194, 182])} filter="url(#twillf)" />
				<path d="M320 450 L352 720 H840 L872 450 Z" fill={rgbs([186, 184, 170])} />
				<path
					d="M320 450 H872 M334 470 H858"
					stroke={rgbs([120, 118, 104])}
					strokeWidth="2.5"
					strokeDasharray="10 7"
					fill="none"
				/>
				<circle cx="130" cy="622" r="40" fill={rgbs([74, 72, 66])} />
				<circle cx="120" cy="612" r="4" fill={rgbs([180, 178, 168])} />
				<circle cx="140" cy="612" r="4" fill={rgbs([180, 178, 168])} />
				<circle cx="120" cy="632" r="4" fill={rgbs([180, 178, 168])} />
				<circle cx="140" cy="632" r="4" fill={rgbs([180, 178, 168])} />
				<g stroke={rgbs([48, 62, 170])} strokeWidth="3">
					{birdAt(420, 170, 480, tint ?? [58, 76, 200])}
				</g>
			</svg>
		),
		kraft: (
			<svg width="1280" height="720">
				<rect width="1280" height="720" fill={rgbs([244, 244, 240])} />
				<rect x="144" y="86" width="1014" height="548" fill={rgbs([212, 202, 186])} />
				{birdAt(440, 214, 410, null, { stroke: [246, 240, 228], sw: 5 })}
				{birdAt(443, 217, 410, null, { stroke: [176, 164, 146], sw: 2 })}
			</svg>
		),
		mug: (
			<svg width="1280" height="720">
				<rect width="1280" height="720" fill={rgbs([40, 30, 26])} />
				<rect x="0" y="0" width="1040" height="720" fill={rgbs([242, 238, 224])} />
				<path d="M-40 40 H140 V640 H-40 Z" fill={rgbs([168, 160, 142])} />
				<path
					d="M40 40 H180 C 200 200 200 520 180 680 H40 Z"
					fill="none"
					stroke={rgbs([218, 212, 196])}
					strokeWidth="30"
				/>
				{birdAt(288, 200, 510, tint ?? [26, 56, 190])}
			</svg>
		),
		cap: (
			<svg width="1280" height="720">
				<rect width="1280" height="720" fill={rgbs([210, 226, 228])} />
				<path
					d="M220 560 C 200 240 420 40 640 40 C 860 40 1080 240 1060 560 Z"
					fill={rgbs([240, 236, 220])}
				/>
				<path
					d="M160 560 C 400 500 880 500 1120 560 C 1160 620 1100 680 1000 680 H280 C 180 680 120 620 160 560 Z"
					fill={rgbs([232, 228, 208])}
				/>
				{birdAt(420, 190, 470, tint ?? [20, 56, 196])}
			</svg>
		),
		phone: (
			<svg width="1280" height="720">
				<rect width="1280" height="720" fill={rgbs([24, 22, 24])} />
				<rect x="130" y="-40" width="1040" height="800" rx="60" fill={rgbs([246, 246, 250])} />
				<Fibres count={50} />
				{birdAt(420, 200, 430, tint ?? [76, 68, 108])}
				<text
					x="620"
					y="690"
					textAnchor="middle"
					style={{ font: "800 72px Bahnschrift, Segoe UI, sans-serif" }}
					fill={rgbs([24, 24, 28])}
					letterSpacing="6"
				>
					FLIGHT
				</text>
			</svg>
		),
		knit: (
			<svg width="1280" height="720">
				<defs>
					<Knit id="knitf" />
				</defs>
				<rect width="1280" height="720" fill={rgbs([148, 148, 150])} filter="url(#knitf)" />
				{birdAt(300, 180, 620, tint ?? [24, 24, 26])}
			</svg>
		),
	};
	return <div style={{ position: "absolute", inset: 0 }}>{scenes[kind]}</div>;
}
