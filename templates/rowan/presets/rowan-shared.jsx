/**
 * rowan-shared.jsx — the vocabulary every rowan preset is built from.
 *
 * Measured off a 79.1s canvas-editor launch film (1812x1080 @30fps; frame n =
 * n/30 s). Everything here is authored in REFERENCE PIXELS: a 1812x1080 box
 * placed on the 1280x720 stage at left 36 and scaled by 1/1.5, so rendering
 * with `--scale 1.5` gives 1920x1080 with the reference's picture 1:1 in the
 * middle (54 px of extra width each side, which the backdrop fills).
 *
 *   THE WORLD  one app window (1776 x 999 "native" px, 16:9, radius 12) lying
 *              on a black backdrop of white contour ribbons. The camera moves
 *              the world as one: window and ribbons scale together (checked
 *              on the ribbon crest at f32 vs f75 vs f360).
 *   THE CAMERA almost the whole film is two slow, LINEAR, centred pushes,
 *              tracked from the window's edges every 5th frame:
 *                take A f75..f1037   window height 946 + 0.1954 px/frame
 *                take B f1041..f2189 window height 946 + 0.1218 px/frame
 *              The cuts and dips between beats do NOT reset the camera
 *              (f522 h1033 -> f527 h1032; f1300 h978 -> f1400 h990): the
 *              content changes under one continuous move. The opening is a
 *              fast push (h946 -> 1034 over f0..f29, 3.04 px/frame) and the
 *              prompt beat a 1.83x -> 2.04x push anchored near the top-left
 *              corner (traffic-light pitch 35 px at f32, 38.5 px at f72).
 *              Inner zooms (the habit screens, the table, the theme menu) are
 *              the APP's canvas zoom, drawn by the views, not camera moves.
 *   CHROME     dark editor: titlebar 36 px (19 grey), floating tool rail,
 *              agent panel (left), properties panel (x 1580..1776), zoom pill.
 *   TYPE       Segoe UI stands in for the UI grotesk; Consolas for every mono
 *              (captions, end card, terminal, the mono dashboard variant).
 *
 * Every export is a pure function of its props.
 */
import React from "react";
import { clamp01, easeByName, lerp } from "../../../src/lib/textcards/src/easing.js";

// ── type and colour ───────────────────────────────────────────────────────

export const UI = `"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
export const MONO = `"JetBrains Mono", "Cascadia Mono", Consolas, "Courier New", monospace`;
export const SERIF = `Georgia, "Times New Roman", serif`;
export const CONDENSED = `"Bahnschrift Condensed", "Arial Narrow", "Segoe UI", sans-serif`;

export const rgbs = (c, a = 1) =>
	a >= 1
		? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
		: `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, a).toFixed(4)})`;

/** Measured greys (luminance medians on f360, the window at s ~1.00). */
export const K = {
	black: [0, 0, 0],
	canvas: [30, 30, 30], // canvas body (29-30 everywhere it is empty)
	title: [19, 19, 19], // titlebar strip (12-14 measured; lifted for the encoder)
	panel: [26, 26, 26], // properties panel and agent panel ground
	card: [36, 36, 36], // agent panel rows, floating cards
	field: [42, 42, 42], // property fields
	line: [48, 48, 48], // hairlines and dividers
	edge: [62, 62, 62], // window and card outlines
	text: [228, 228, 228],
	dim: [150, 150, 150],
	faint: [104, 104, 104],
	select: [74, 128, 228], // selection box / "Generating" label blue
	red: [237, 95, 87],
	amber: [245, 190, 70],
	green: [92, 200, 92],
	ok: [72, 190, 110],
};

// ── time ──────────────────────────────────────────────────────────────────

export const FPS = 30;
/** Reference frame -> ms (30 fps clock). */
export const fms = (f) => (f * 1000) / FPS;
export const localMs = (cfg, t) => t * 1000 - (cfg.startMs ?? 0);

/**
 * kf(keys, ms) — keyframe interpolation over scene-relative `at` (ms). Keys
 * inherit omitted channels from the previous key; `ease` shapes the segment
 * INTO that key (linear default, "hold" jumps). Arrays interpolate per item.
 */
export function kf(keys, ms) {
	if (!keys || !keys.length) return {};
	const res = [];
	let prev = {};
	for (const k of keys) {
		const cur = { ...prev };
		for (const [n, v] of Object.entries(k)) if (n !== "ease" && n !== "pow") cur[n] = v;
		cur.ease = k.ease;
		cur.pow = k.pow;
		res.push(cur);
		prev = cur;
	}
	if (ms <= res[0].at) return res[0];
	const last = res[res.length - 1];
	if (ms >= last.at) return last;
	for (let i = 0; i < res.length - 1; i++) {
		const a = res[i];
		const b = res[i + 1];
		if (ms >= a.at && ms < b.at) {
			if (b.ease === "hold") return a;
			const p = clamp01((ms - a.at) / Math.max(1e-6, b.at - a.at));
			const e = easeByName(b.ease ?? "linear", b.pow, (x) => x)(p);
			const o = {};
			for (const n of Object.keys(b)) {
				if (n === "at" || n === "ease" || n === "pow") continue;
				const va = a[n];
				const vb = b[n];
				if (typeof va === "number" && typeof vb === "number") o[n] = lerp(va, vb, e);
				else if (Array.isArray(va) && Array.isArray(vb) && va.length === vb.length)
					o[n] = va.map((x, j) => (typeof x === "number" ? lerp(x, vb[j], e) : vb[j]));
				else o[n] = e < 1 ? (va ?? vb) : vb;
			}
			return o;
		}
	}
	return last;
}

/** 0..1 progress of ms through [a, b]. */
export const prog = (ms, a, b) => clamp01((ms - a) / Math.max(1e-6, b - a));

/** Typed prefix of `text` at `ms`: `cps` chars/s from `at`. */
export const typed = (text, ms, at, cps = 20) =>
	text.slice(0, Math.max(0, Math.min(text.length, Math.floor(((ms - at) / 1000) * cps))));

/** A caret that blinks on a 530 ms half-period (on first). */
export const blinkOn = (ms, period = 530) => Math.floor(Math.max(0, ms) / period) % 2 === 0;

// ── the world and its camera ──────────────────────────────────────────────

export const WIN_W = 1776;
export const WIN_H = 999;
export const REF_W = 1812;
export const REF_H = 1080;

/**
 * Camera keys: { at, s, cx, cy } — the window's CENTRE sits at frame point
 * (cx, cy) in reference px, at scale s. Linear between keys unless `ease`.
 * Defaults to the measured home framing (centre of frame, s 0.947).
 */
export function camAt(keys, ms) {
	const k = kf(keys && keys.length ? keys : [{ at: 0, s: 0.947, cx: 906, cy: 540 }], ms);
	return { s: k.s ?? 0.947, cx: k.cx ?? 906, cy: k.cy ?? 540 };
}

/**
 * <RefBox> — the 1812x1080 reference picture on the 1280x720 stage.
 * Children are positioned in reference px. Not clipped: the stage clips.
 */
export function RefBox({ children, z = 1 }) {
	return (
		<div
			style={{
				position: "absolute",
				left: (1280 - REF_W / 1.5) / 2,
				top: 0,
				width: REF_W,
				height: REF_H,
				transform: `scale(${(1 / 1.5).toFixed(6)})`,
				transformOrigin: "0 0",
				zIndex: z,
			}}
		>
			{children}
		</div>
	);
}

/** <World cam> — native window coords, placed by the camera. */
export function World({ cam, children }) {
	const x = cam.cx - (cam.s * WIN_W) / 2;
	const y = cam.cy - (cam.s * WIN_H) / 2;
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: WIN_W,
				height: WIN_H,
				transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${cam.s.toFixed(5)})`,
				transformOrigin: "0 0",
			}}
		>
			{children}
		</div>
	);
}

// ── the backdrop: white contour ribbons on black ──────────────────────────

/**
 * One ribbon = `n` thin curves swept between two cubic edges. Each curve i
 * runs from lerp(a0, b0, u) through the two handles to lerp(a1, b1, u), with
 * u = i/(n-1) eased so lines bunch at the crest. Brightness peaks at `crest`
 * (0..1 across the ribbon) like light on a folded sheet.
 */
function ribbonPaths(r) {
	const out = [];
	const n = r.n ?? 60;
	for (let i = 0; i < n; i++) {
		const u0 = i / (n - 1);
		const u = r.bunch ? u0 ** r.bunch : u0;
		const P = (A, B) => [lerp(A[0], B[0], u), lerp(A[1], B[1], u)];
		const p0 = P(r.a0, r.b0);
		const c1 = P(r.a1, r.b1);
		const c2 = P(r.a2, r.b2);
		const p3 = P(r.a3, r.b3);
		const d = Math.abs(u0 - (r.crest ?? 0.5));
		const a = (r.alpha ?? 0.5) * Math.max(0.12, 1 - d * (r.falloff ?? 1.6));
		out.push({
			d: `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p3[0].toFixed(1)} ${p3[1].toFixed(1)}`,
			a,
		});
	}
	return out;
}

/**
 * Ribbon specs in NATIVE window coordinates (the window spans 0..1776 x
 * 0..999; the frame at the home framing spans about -70..1844 x -70..1070).
 * Fitted by eye against f32, f75 and f360: a sheet curling up out of the
 * top-left corner with its crest crossing the top edge around x 340-470, a
 * fold bulging past the right edge between y 330 and 1000, and a faint
 * sheet along the bottom-left under the window.
 */
export const RIBBONS = [
	{
		// top-left curl
		n: 70,
		a0: [-260, 620],
		a1: [40, 520],
		a2: [260, 120],
		a3: [400, -120],
		b0: [-260, 130],
		b1: [80, 40],
		b2: [300, -60],
		b3: [520, -140],
		crest: 0.92,
		falloff: 1.1,
		alpha: 0.62,
		bunch: 0.8,
	},
	{
		// right fold
		n: 64,
		a0: [1700, 300],
		a1: [1900, 380],
		a2: [1980, 640],
		a3: [2060, 980],
		b0: [1700, 560],
		b1: [1860, 640],
		b2: [1900, 880],
		b3: [1960, 1140],
		crest: 0.1,
		falloff: 1.3,
		alpha: 0.6,
		bunch: 1.2,
	},
	{
		// bottom-left sheet
		n: 54,
		a0: [-300, 900],
		a1: [100, 960],
		a2: [700, 1010],
		a3: [1400, 1100],
		b0: [-300, 1080],
		b1: [100, 1110],
		b2: [700, 1130],
		b3: [1400, 1160],
		crest: 0.05,
		falloff: 1.4,
		alpha: 0.42,
		bunch: 1,
	},
];

export function Backdrop({ ribbons = RIBBONS, tint = [255, 255, 255] }) {
	return (
		<svg
			width={WIN_W + 1200}
			height={WIN_H + 800}
			viewBox={`-600 -400 ${WIN_W + 1200} ${WIN_H + 800}`}
			style={{ position: "absolute", left: -600, top: -400, overflow: "visible" }}
		>
			<title>backdrop</title>
			{ribbons.flatMap((r, ri) =>
				ribbonPaths(r).map((p, i) => (
					<path key={`${ri}-${i}`} d={p.d} fill="none" stroke={rgbs(tint, p.a)} strokeWidth={1.1} />
				)),
			)}
		</svg>
	);
}

// ── small drawing helpers ─────────────────────────────────────────────────

/** Absolutely positioned single-line text; (x, y) is the box top-left. */
export function T({
	x = 0,
	y = 0,
	size = 12,
	colour = K.text,
	alpha = 1,
	weight = 400,
	font = UI,
	children,
	w,
	align,
	tracking,
	style,
}) {
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: w,
				textAlign: align,
				font: `${weight} ${size}px ${font}`,
				lineHeight: 1.2,
				letterSpacing: tracking,
				color: rgbs(colour, alpha),
				whiteSpace: "nowrap",
				...(style ?? {}),
			}}
		>
			{children}
		</div>
	);
}

/** A filled / outlined rectangle. */
export function Box({ x, y, w, h, fill, stroke, r = 0, a = 1, sw = 1, children, style }) {
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: w,
				height: h,
				borderRadius: r,
				background: fill ? rgbs(fill, a) : undefined,
				border: stroke ? `${sw}px solid ${rgbs(stroke)}` : undefined,
				boxSizing: "border-box",
				overflow: children ? "hidden" : undefined,
				...(style ?? {}),
			}}
		>
			{children}
		</div>
	);
}

/** Grey placeholder text lines (the unreadable small print of a UI). */
export function Lines({ x, y, w, n = 3, gap = 9, h = 3, colour = K.faint, a = 0.6, seed = 1 }) {
	const out = [];
	for (let i = 0; i < n; i++) {
		const f =
			0.55 + (0.45 * (((Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453) % 1) + 1)) / 2;
		out.push(
			<Box
				key={i}
				x={x}
				y={y + i * gap}
				w={i === n - 1 ? w * f * 0.7 : w * f}
				h={h}
				r={h / 2}
				fill={colour}
				a={a}
			/>,
		);
	}
	return <>{out}</>;
}

/** Stroke icon glyphs for the tool rail and chrome (24-unit viewBox). */
const ICONS = {
	pointer: "M6 4l12 7-5.5 1.5L10 18z",
	rect: "M5 5h14v14H5z",
	chevron: "M8 10l4 4 4-4",
	text: "M6 6h12M12 6v13",
	frame: "M8 4v16M16 4v16M4 8h16M4 16h16",
	note: "M5 5h14v9l-5 5H5zM14 19v-5h5M8 9h8M8 12h5",
	hand: "M8 12V7a1.5 1.5 0 013 0v4-6a1.5 1.5 0 013 0v6-5a1.5 1.5 0 013 0v7c0 4-2 7-6 7-3 0-4-1-6-4l-2-3a1.4 1.4 0 012-2l1 1",
	component: "M12 3l4 4-4 4-4-4zM12 13l4 4-4 4-4-4zM7 8l4 4-4 4-4-4zM17 8l4 4-4 4-4-4z",
	keyboard: "M3 7h18v11H3zM6 10h1M9 10h1M12 10h1M15 10h1M18 10h0M7 14h10",
	sliders: "M4 7h10M18 7h2M4 12h4M12 12h8M4 17h12M19 17h1M14 5v4M8 10v4M16 15v4",
	sidebar: "M4 5h16v14H4zM9 5v14",
	files: "M6 3h8l4 4v14H6zM14 3v4h4",
	folder: "M3 7h6l2 2h10v10H3z",
	plus: "M12 5v14M5 12h14",
	code: "M9 8l-4 4 4 4M15 8l4 4-4 4",
	sun: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
	check: "M5 12l4 4 10-10",
	up: "M12 19V5M6 11l6-6 6 6",
	spark: "M12 3v18M3 12h18M6 6l12 12M18 6L6 18",
	bell: "M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20h4",
	gear: "M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
	diamond: "M12 3l9 9-9 9-9-9z",
	panel: "M4 5h16v14H4zM15 5v14",
	clip: "M15 7l-6 6a2 2 0 003 3l7-7a4 4 0 00-6-6l-7 7a6 6 0 008 8l5-5",
	circle: "M12 4a8 8 0 100 16 8 8 0 000-16z",
	x: "M7 7l10 10M17 7L7 17",
	search: "M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l4 4",
	share: "M12 15V3M8 7l4-4 4 4M5 12v8h14v-8",
	reload: "M19 12a7 7 0 11-2-5M19 4v4h-4",
};

export function Icon({ name, x, y, size = 16, colour = K.text, a = 0.85, sw = 1.6, fill = false }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			style={{ position: "absolute", left: x - size / 2, top: y - size / 2 }}
		>
			<title>{name}</title>
			<path
				d={ICONS[name] ?? ICONS.rect}
				fill={fill ? rgbs(colour, a) : "none"}
				stroke={rgbs(colour, a)}
				strokeWidth={sw}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** macOS-style arrow pointer, tip at (x, y). ~22 px tall at s 1. */
export function Pointer({ x, y, scale = 1, hand = false, a = 1 }) {
	return (
		<svg
			width={26 * scale}
			height={30 * scale}
			viewBox="0 0 26 30"
			style={{
				position: "absolute",
				left: x - 3 * scale,
				top: y - 2 * scale,
				opacity: a,
				zIndex: 50,
			}}
		>
			<title>pointer</title>
			{hand ? (
				<path
					d="M9 14V5a2 2 0 014 0v7-2a2 2 0 014 0v2a2 2 0 014 0v2a2 2 0 013 1v6c0 5-3 8-8 8-4 0-6-2-8-5l-3-5a2 2 0 013-2l1 2z"
					fill="#fff"
					stroke="#000"
					strokeWidth="1.3"
				/>
			) : (
				<path
					d="M3 2l0 21 5.5-5.2 3.6 8.2 3.4-1.5-3.6-8 7.6-.4z"
					fill="#fff"
					stroke="#000"
					strokeWidth="1.4"
					strokeLinejoin="round"
				/>
			)}
		</svg>
	);
}

/** Selection rectangle with square corner handles (the canvas's blue). */
export function Selection({ x, y, w, h, label, colour = K.select, handles = true, a = 1, dashed }) {
	const hs = 8;
	return (
		<div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: a }}>
			<div
				style={{
					position: "absolute",
					inset: 0,
					border: `1.5px ${dashed ? "dashed" : "solid"} ${rgbs(colour)}`,
				}}
			/>
			{handles
				? [
						[0, 0],
						[w, 0],
						[0, h],
						[w, h],
					].map(([hx, hy]) => (
						<div
							key={`${hx}-${hy}`}
							style={{
								position: "absolute",
								left: hx - hs / 2,
								top: hy - hs / 2,
								width: hs,
								height: hs,
								background: "#fff",
								border: `1.5px solid ${rgbs(colour)}`,
								boxSizing: "border-box",
							}}
						/>
					))
				: null}
			{label ? (
				<T x={0} y={-20} size={12.5} colour={colour} weight={500}>
					{label}
				</T>
			) : null}
		</div>
	);
}

// ── image stand-ins (slots) ───────────────────────────────────────────────

/**
 * <Picture> — an image slot. With `src` (an image path from the scene's
 * `images` map) it shows the image, object-fit cover. Without, a drawn
 * stand-in in the slot's `kind`:
 *   turbine  a wind turbine at night under an accent glow (the dashboards)
 *   warm     a warm low-key still life (the site's photos)
 *   field    a dusk landscape
 *   steam    a cup with a soft highlight
 */
export function Picture({ w, h, kind = "turbine", accent = [60, 220, 120], src, r = 0, seed = 1 }) {
	if (src)
		return (
			<div
				style={{ position: "relative", width: w, height: h, borderRadius: r, overflow: "hidden" }}
			>
				<img
					src={src}
					alt=""
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						objectFit: "cover",
					}}
				/>
			</div>
		);
	const g = accent;
	let body = null;
	if (kind === "turbine") {
		const cx = w * (0.5 + 0.06 * Math.sin(seed));
		const top = h * 0.2;
		const hub = [cx, top + h * 0.06];
		const L = h * 0.32;
		const blades = [0, 120, 240].map((d) => {
			const r0 = ((d + seed * 23) * Math.PI) / 180;
			return `M${hub[0]} ${hub[1]}L${hub[0] + Math.cos(r0) * L} ${hub[1] + Math.sin(r0) * L}`;
		});
		body = (
			<svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
				<title>turbine</title>
				<defs>
					<radialGradient id={`tg${seed}`} cx="50%" cy="88%" r="60%">
						<stop offset="0" stopColor={rgbs(g, 0.85)} />
						<stop offset="0.35" stopColor={rgbs(g, 0.25)} />
						<stop offset="1" stopColor="rgba(0,0,0,0)" />
					</radialGradient>
				</defs>
				<rect width={w} height={h} fill="rgb(6,8,10)" />
				<rect width={w} height={h} fill={`url(#tg${seed})`} />
				{[0.18, 0.82].map((fx, i) => (
					<g key={fx} opacity={0.35}>
						<path
							d={`M${w * fx} ${h} L${w * fx + 2} ${h * 0.55}`}
							stroke="rgb(140,150,160)"
							strokeWidth={2}
						/>
						<circle cx={w * fx + 2} cy={h * 0.55} r={2} fill={rgbs(g)} opacity={i ? 0.8 : 0.5} />
					</g>
				))}
				<path
					d={`M${cx - 4} ${h * 0.92} L${hub[0] - 1.5} ${hub[1]} L${hub[0] + 1.5} ${hub[1]} L${cx + 4} ${h * 0.92}Z`}
					fill="rgb(214,222,226)"
				/>
				{blades.map((d) => (
					<path
						key={d}
						d={d}
						stroke="rgb(230,236,238)"
						strokeWidth={h * 0.018}
						strokeLinecap="round"
					/>
				))}
				<circle cx={hub[0]} cy={hub[1]} r={h * 0.016} fill="rgb(240,244,246)" />
				<ellipse cx={cx} cy={h * 0.93} rx={w * 0.22} ry={h * 0.05} fill={rgbs(g, 0.55)} />
			</svg>
		);
	} else {
		const palettes = {
			warm: ["rgb(58,34,18)", "rgb(160,98,44)", "rgb(232,180,110)"],
			field: ["rgb(40,52,70)", "rgb(170,120,96)", "rgb(236,196,150)"],
			steam: ["rgb(30,20,14)", "rgb(120,74,36)", "rgb(240,200,140)"],
			light: ["rgb(222,224,230)", "rgb(196,200,214)", "rgb(250,250,252)"],
		};
		const p = palettes[kind] ?? palettes.warm;
		body = (
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: `radial-gradient(ellipse 55% 45% at ${30 + ((seed * 37) % 40)}% ${45 + ((seed * 13) % 25)}%, ${p[2]}, ${p[1]} 38%, ${p[0]} 80%)`,
				}}
			/>
		);
	}
	return (
		<div
			style={{
				position: "relative",
				width: w,
				height: h,
				borderRadius: r,
				overflow: "hidden",
				background: "#000",
			}}
		>
			{body}
		</div>
	);
}

// ── the editor chrome (native px; measured on f360, s ~1.00) ──────────────

/**
 * <Window> — the app window: 1776x999, radius 12, a 1 px light outline, the
 * titlebar (traffic lights at x 18/37/56, y 18; sidebar/files/history/+ at
 * x 88/114/140/166; centred document title at x ~812; "Export code" and the
 * agent status at the right). `children` draw the window body in native px.
 * With `video` (a ref callback from video-sources) the whole window shows
 * the recording instead: the slot path.
 */
export function Window({ children, doc = "untitled.rowan", video = null, dimLights = false }) {
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: WIN_W,
				height: WIN_H,
				borderRadius: 12,
				overflow: "hidden",
				background: rgbs(K.canvas),
				boxShadow: `0 0 0 1px ${rgbs([70, 70, 70])}`,
			}}
		>
			{video ? (
				<div ref={video} style={{ position: "absolute", inset: 0 }} />
			) : (
				<>
					{children}
					<TitleBar doc={doc} dimLights={dimLights} />
				</>
			)}
		</div>
	);
}

export function TitleBar({ doc, dimLights }) {
	const lights = dimLights ? [K.faint, K.faint, K.faint] : [K.red, K.amber, K.green];
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: WIN_W,
				height: 36,
				background: rgbs(K.title),
				borderBottom: `1px solid ${rgbs([36, 36, 36])}`,
			}}
		>
			{lights.map((c, i) => (
				<div
					key={18 + i * 19}
					style={{
						position: "absolute",
						left: 18 + i * 19 - 6,
						top: 18 - 6,
						width: 12,
						height: 12,
						borderRadius: 6,
						background: rgbs(c, dimLights ? 0.5 : 1),
					}}
				/>
			))}
			{["sidebar", "files", "folder", "plus"].map((n, i) => (
				<Icon key={n} name={n} x={88 + i * 26} y={18} size={15} colour={K.text} a={0.62} />
			))}
			<div
				style={{
					position: "absolute",
					left: 812 - 200,
					width: 400,
					top: 10,
					textAlign: "center",
					font: `600 12.5px ${UI}`,
					color: rgbs(K.text, 0.8),
				}}
			>
				<span
					style={{
						display: "inline-block",
						width: 14,
						height: 14,
						borderRadius: 3,
						background: rgbs([226, 120, 74]),
						verticalAlign: -2,
						marginRight: 7,
					}}
				/>
				{doc}
				<span style={{ fontWeight: 400, color: rgbs(K.dim, 0.9) }}> — Edited</span>
			</div>
			<Icon name="code" x={1462} y={18} size={13} colour={K.text} a={0.6} />
			<T x={1472} y={11} size={10.5} colour={K.text} alpha={0.66} font={MONO}>
				Export code
			</T>
			<Icon name="spark" x={1596} y={18} size={12} colour={K.text} a={0.65} />
			<T x={1608} y={11} size={10.5} colour={K.text} alpha={0.66} font={MONO}>
				Agent connected
			</T>
			<Icon name="circle" x={1726} y={18} size={13} colour={K.text} a={0.45} />
			<Icon name="sun" x={1760} y={18} size={14} colour={K.text} a={0.6} />
		</div>
	);
}

/** The floating tool rail: card x 8..40, icons on x 24 from y 59. */
export function ToolRail({ y = 46, extra = true }) {
	const names = ["pointer", "rect", "chevron", "text", "frame", "note", "hand", "component"];
	if (extra) names.push("keyboard", "sliders");
	const ys = [];
	let yy = y + 13;
	for (const n of names) {
		ys.push([n, yy]);
		yy += n === "rect" ? 18 : n === "chevron" ? 22 : 30;
	}
	return (
		<>
			<Box x={8} y={y} w={32} h={yy - y - 6} r={8} fill={[24, 24, 24]} stroke={[40, 40, 40]} />
			<Box x={10} y={y + 2} w={28} h={24} r={6} fill={[44, 44, 44]} />
			{ys.map(([n, iy]) => (
				<Icon
					key={n}
					name={n}
					x={24}
					y={iy}
					size={n === "chevron" ? 11 : 15}
					colour={K.text}
					a={n === "pointer" ? 0.95 : 0.72}
				/>
			))}
		</>
	);
}

/**
 * <PropsPanel> — the right properties panel (x 1580..1776): layer header,
 * Context, Alignment, Position, Flex Layout, Padding, Dimensions,
 * Appearance, Fill, Stroke, Effects (section heads at the measured y).
 * `light` repaints it for the light-theme flip.
 */
export function PropsPanel({
	head = "Frame",
	fill = "#0C0C0C",
	w = 1440,
	h = 900,
	x0 = 1580,
	swatch,
	light = false,
	themeVal = "Dark",
}) {
	const X = 12;
	const ink = light ? [30, 30, 30] : K.text;
	const fld = light ? [236, 236, 236] : K.field;
	const sec = (y, label) => (
		<>
			<Box x={0} y={y - 10} w={196} h={1} fill={light ? [222, 222, 222] : K.line} />
			<T x={X} y={y} size={11} colour={ink} alpha={0.78} weight={500}>
				{label}
			</T>
		</>
	);
	const F = ({ x, y, label, value, fw = 84 }) => (
		<Box x={x} y={y} w={fw} h={20} r={4} fill={fld}>
			{label ? (
				<T x={6} y={3.5} size={10} colour={K.dim}>
					{label}
				</T>
			) : null}
			<T x={label ? 18 : 6} y={3.5} size={10} colour={ink} alpha={0.86}>
				{value}
			</T>
		</Box>
	);
	return (
		<div
			style={{
				position: "absolute",
				left: x0,
				top: 36,
				width: WIN_W - x0,
				height: WIN_H - 36,
				background: rgbs(light ? [250, 250, 250] : K.panel),
				borderLeft: `1px solid ${rgbs(light ? [222, 222, 222] : K.line)}`,
			}}
		>
			<Icon name="frame" x={X + 6} y={21} size={12} colour={ink} a={0.7} />
			<T x={X + 18} y={14} size={11.5} colour={ink} alpha={0.88} weight={500}>
				{head}
			</T>
			<Icon name="diamond" x={172} y={21} size={12} colour={ink} a={0.6} />
			<Icon name="panel" x={190} y={21} size={12} colour={ink} a={0.6} />
			{sec(52, "Context")}
			<Icon name="chevron" x={186} y={58} size={11} colour={ink} a={0.6} />
			{sec(89, "Alignment")}
			{[0, 1, 2, 3, 4, 5].map((i) => (
				<Box
					key={i}
					x={X + 2 + i * 31}
					y={113}
					w={14}
					h={10}
					r={1}
					stroke={[120, 120, 120]}
					sw={1}
				/>
			))}
			{sec(146, "Position")}
			<F x={X} y={168} label="X" value="0" />
			<F x={X + 92} y={168} label="Y" value="0" />
			<F x={X} y={194} label="R" value="0°" />
			{sec(236, "Flex Layout")}
			<Box x={X} y={258} w={172} h={22} r={5} fill={fld} />
			<Box x={X + 116} y={260} w={54} h={18} r={4} fill={light ? [210, 210, 210] : [70, 70, 70]} />
			<T x={X} y={290} size={10} colour={K.dim}>
				Alignment
			</T>
			<Box x={X} y={304} w={84} h={62} r={5} fill={fld} />
			<Box x={X + 8} y={310} w={6} h={6} r={1} fill={K.select} />
			<T x={X + 104} y={290} size={10} colour={K.dim}>
				Gap
			</T>
			{["0", "Space Between", "Space Around"].map((s, i) => (
				<React.Fragment key={s}>
					<div
						style={{
							position: "absolute",
							left: X + 104,
							top: 308 + i * 22,
							width: 10,
							height: 10,
							borderRadius: 5,
							background: i === 0 ? rgbs(K.select) : light ? "#ccc" : "#fff",
						}}
					/>
					<T x={X + 120} y={306 + i * 22} size={9.5} colour={ink} alpha={0.8}>
						{s}
					</T>
				</React.Fragment>
			))}
			{sec(384, "Padding")}
			<F x={X} y={404} value="0" />
			<F x={X + 92} y={404} value="0" />
			<T x={X} y={432} size={10} colour={K.dim}>
				Dimensions
			</T>
			<F x={X} y={448} label="W" value={String(w)} />
			<F x={X + 92} y={448} label="H" value={String(h)} />
			{[
				["Fill Width", "Fill Height"],
				["Hug Width", "Hug Height"],
				["Clip Content", null],
			].map(([a, b], i) => (
				<React.Fragment key={a}>
					<Box x={X} y={478 + i * 22} w={10} h={10} r={2} stroke={[110, 110, 110]} />
					<T x={X + 16} y={476 + i * 22} size={9.5} colour={ink} alpha={0.78}>
						{a}
					</T>
					{b ? (
						<>
							<Box x={X + 92} y={478 + i * 22} w={10} h={10} r={2} stroke={[110, 110, 110]} />
							<T x={X + 108} y={476 + i * 22} size={9.5} colour={ink} alpha={0.78}>
								{b}
							</T>
						</>
					) : null}
				</React.Fragment>
			))}
			{sec(554, "Appearance")}
			<F x={X} y={576} label="%" value="100" />
			<F x={X + 92} y={576} value="0" />
			{sec(618, "Fill")}
			<Box x={X} y={640} w={172} h={22} r={4} fill={fld}>
				<Box x={5} y={5} w={12} h={12} r={2} fill={swatch ?? [12, 12, 12]} stroke={[90, 90, 90]} />
				<T x={24} y={4} size={10} colour={ink} alpha={0.86}>
					{fill}
				</T>
				<T x={112} y={4} size={10} colour={ink} alpha={0.86}>
					100 %
				</T>
			</Box>
			{sec(686, "Stroke")}
			<Icon name="plus" x={186} y={692} size={11} colour={ink} a={0.6} />
			{sec(726, "Effects")}
			<Icon name="plus" x={186} y={732} size={11} colour={ink} a={0.6} />
			{sec(766, "Theme")}
			{["Default", "Neutral", themeVal].map((v, i) => (
				<Box
					key={`${v}-${i * 3}`}
					x={X}
					y={788 + i * 26}
					w={172}
					h={20}
					r={4}
					fill={fld}
					stroke={light ? [210, 210, 210] : [56, 56, 56]}
				>
					<T x={8} y={3} size={10} colour={ink} alpha={0.86}>
						{v}
					</T>
					<Icon name="chevron" x={160} y={10} size={9} colour={ink} a={0.6} />
				</Box>
			))}
		</div>
	);
}

/** The bottom-right zoom pill: "−  90%  +". */
export function ZoomPill({ pct = 90, x = 1472, y = 964, light = false }) {
	const ink = light ? [30, 30, 30] : K.text;
	return (
		<Box
			x={x}
			y={y}
			w={96}
			h={26}
			r={6}
			fill={light ? [250, 250, 250] : [24, 24, 24]}
			stroke={light ? [220, 220, 220] : [44, 44, 44]}
		>
			<T x={9} y={3} size={13} colour={ink} alpha={0.7}>
				−
			</T>
			<T x={0} w={96} align="center" y={6} size={10.5} colour={ink} alpha={0.85} weight={600}>
				{`${pct}%`}
			</T>
			<T x={78} y={3} size={13} colour={ink} alpha={0.7}>
				+
			</T>
		</Box>
	);
}

/** The collapsed "ask the agent" pill (top-left at the start, bottom-left later). */
export function AskPill({
	x,
	y,
	w = 258,
	text = "Ask Rowan to design…",
	typedText,
	caret,
	h = 36,
}) {
	const live = typedText != null;
	return (
		<Box x={x} y={y} w={w} h={h} r={9} fill={[32, 32, 32]} stroke={[52, 52, 52]}>
			<Icon name="chevron" x={14} y={h / 2} size={10} colour={K.text} a={0.5} />
			<div
				style={{
					position: "absolute",
					left: 28,
					top: h / 2 - 10,
					width: w - 62,
					height: 20,
					overflow: "hidden",
					display: "flex",
					justifyContent: live ? "flex-end" : "flex-start",
					font: `400 13.5px ${UI}`,
					lineHeight: "20px",
					color: rgbs(K.text, live ? 0.92 : 0.5),
					whiteSpace: "nowrap",
				}}
			>
				<span>{live ? typedText : text}</span>
				{caret ? (
					<span
						style={{
							display: "inline-block",
							flex: "0 0 auto",
							width: 1.5,
							height: 16,
							marginTop: 2,
							marginLeft: 1,
							background: rgbs(K.text),
						}}
					/>
				) : null}
			</div>
			<div
				style={{
					position: "absolute",
					right: 8,
					top: h / 2 - 10,
					width: 20,
					height: 20,
					borderRadius: 10,
					background: rgbs([200, 200, 200], live ? 0.9 : 0.35),
				}}
			>
				<Icon name="up" x={10} y={10} size={12} colour={[20, 20, 20]} a={1} sw={2.2} />
			</div>
		</Box>
	);
}

/**
 * <AgentPanel> — the agent conversation card. `items` is a list of
 *   { kind: "user"|"text"|"step"|"thinking"|"todo", text, done, list, doneCount }
 * rendered top-down; the first `n` are visible (the stream). Footer: the
 * "Ask Rowan…" input, model picker, attach icons and close chip.
 */
export function AgentPanel({
	x,
	y,
	w,
	h,
	title = "design a control room…",
	items = [],
	n = 99,
	footer = true,
	spin = false,
}) {
	const rows = [];
	let yy = 40;
	items.slice(0, n).forEach((it, i) => {
		const key = `${i}-${it.kind}`;
		if (it.kind === "user") {
			rows.push(
				<Box key={key} x={52} y={yy} w={w - 64} h={42} r={9} fill={[78, 78, 84]}>
					<div
						style={{
							position: "absolute",
							left: 10,
							top: 6,
							width: w - 84,
							font: `500 11.5px/15px ${UI}`,
							color: rgbs([245, 245, 245]),
							whiteSpace: "normal",
						}}
					>
						{it.text}
					</div>
				</Box>,
			);
			yy += 54;
		} else if (it.kind === "thinking") {
			rows.push(
				<T key={key} x={14} y={yy} size={10.5} colour={K.dim} alpha={0.75}>
					{`✳ ${it.text ?? "Thinking…"}`}
				</T>,
			);
			yy += 22;
		} else if (it.kind === "text") {
			rows.push(
				<div
					key={key}
					style={{
						position: "absolute",
						left: 12,
						top: yy,
						width: w - 26,
						font: `400 11.5px/15px ${UI}`,
						color: rgbs(K.text, 0.9),
						whiteSpace: "normal",
					}}
				>
					{it.text}
				</div>,
			);
			yy += Math.ceil((it.text.length * 6.1) / (w - 26)) * 15 + 12;
		} else if (it.kind === "step") {
			const ix = (it.text.length + 2) * 6.4 + 8;
			rows.push(
				<Box key={key} x={8} y={yy} w={w - 16} h={26} r={6} fill={K.card}>
					<T x={8} y={6} size={11} colour={K.text} alpha={0.88}>
						{it.text}
					</T>
					{it.done === false ? (
						<Icon name="gear" x={ix} y={13} size={10} colour={K.dim} a={0.8} />
					) : (
						<Icon name="check" x={ix} y={13} size={10} colour={K.ok} a={1} sw={2.4} />
					)}
					<Icon name="chevron" x={w - 30} y={13} size={9} colour={K.dim} a={0.5} />
				</Box>,
			);
			yy += 35;
		} else if (it.kind === "todo") {
			const list = it.list ?? [];
			const dc = it.doneCount ?? 0;
			rows.push(
				<div key={key} style={{ position: "absolute", left: 12, top: yy, width: w - 24 }}>
					<T x={0} y={0} size={10.5} colour={K.text} alpha={0.8} weight={500}>
						{`✎ ${it.text}`}
					</T>
					<T x={w - 60} y={0} size={10} colour={K.dim}>
						{`${dc}/${list.length}`}
					</T>
					{list.map((l, j) => (
						<React.Fragment key={l}>
							<div
								style={{
									position: "absolute",
									left: 0,
									top: 20 + j * 13.5,
									width: 8,
									height: 8,
									borderRadius: 4,
									border: `1.2px solid ${rgbs(j < dc ? K.ok : [120, 120, 120])}`,
								}}
							/>
							<T x={14} y={17 + j * 13.5} size={9.5} colour={K.text} alpha={0.66}>
								{l}
							</T>
						</React.Fragment>
					))}
				</div>,
			);
			yy += 26 + list.length * 13.5;
		}
	});
	return (
		<Box x={x} y={y} w={w} h={h} r={10} fill={[30, 30, 30]} stroke={[50, 50, 50]}>
			<Icon name="chevron" x={14} y={20} size={9} colour={K.dim} a={0.7} />
			<T x={24} y={12} size={11.5} colour={K.text} alpha={0.86} weight={500}>
				{title}
			</T>
			{spin ? (
				<Icon name="reload" x={34 + title.length * 6.2} y={20} size={10} colour={K.dim} a={0.7} />
			) : null}
			<Icon name="plus" x={w - 16} y={20} size={11} colour={K.dim} a={0.6} />
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: w,
					height: h - (footer ? 86 : 0),
					overflow: "hidden",
				}}
			>
				{rows}
			</div>
			{footer ? (
				<>
					<Box x={0} y={h - 86} w={w} h={1} fill={K.line} />
					<T x={12} y={h - 72} size={12} colour={K.dim} alpha={0.75}>
						Ask Rowan to design…
					</T>
					<T x={12} y={h - 30} size={10.5} colour={K.text} alpha={0.7}>
						Model 2 ⌄
					</T>
					<Icon name="clip" x={w - 118} y={h - 23} size={11} colour={K.dim} a={0.7} />
					<Icon name="circle" x={w - 96} y={h - 23} size={11} colour={K.dim} a={0.7} />
					<Icon name="circle" x={w - 74} y={h - 23} size={11} colour={K.dim} a={0.5} />
					<div
						style={{
							position: "absolute",
							left: w - 28,
							top: h - 32,
							width: 18,
							height: 18,
							borderRadius: 9,
							background: rgbs([110, 110, 110]),
						}}
					>
						<Icon name="x" x={9} y={9} size={10} colour={[30, 30, 30]} a={1} sw={2.4} />
					</div>
				</>
			) : null}
		</Box>
	);
}

/**
 * <Term> — a terminal window (macOS chrome, mono body). `title`, `lines`
 * (strings or { text, colour }), and an optional welcome box (the agent
 * CLI's banner). Sized in its own px; place it with x/y/w/h.
 */
export function Term({
	x,
	y,
	w,
	h,
	title = "workspace — agent — 83×25",
	banner = true,
	lines = [],
	prompt,
	caret,
	dim = false,
}) {
	const fs = 14.5;
	const lh = fs * 1.38;
	const acc = [96, 200, 190];
	return (
		<Box x={x} y={y} w={w} h={h} r={9} fill={[30, 30, 30]} stroke={[66, 66, 66]}>
			<Box x={0} y={0} w={w} h={28} fill={[44, 44, 44]} />
			{[K.red, K.amber, K.green].map((c, i) => (
				<div
					key={c.join()}
					style={{
						position: "absolute",
						left: 12 + i * 18,
						top: 9,
						width: 11,
						height: 11,
						borderRadius: 6,
						background: rgbs(dim ? [90, 90, 90] : c),
					}}
				/>
			))}
			<T x={0} w={w} align="center" y={6} size={12.5} colour={K.text} alpha={0.82} weight={600}>
				{title}
			</T>
			{banner ? (
				<Box x={8} y={46} w={w - 16} h={Math.min(230, h * 0.42)} stroke={acc} sw={1.5}>
					<T
						x={14}
						y={-2}
						size={fs}
						font={MONO}
						colour={acc}
						style={{ background: "rgb(30,30,30)", padding: "0 6px" }}
					>
						Agent CLI v1.0
					</T>
					<T
						x={0}
						w={w * 0.52}
						align="center"
						y={36}
						size={fs}
						font={MONO}
						weight={700}
						colour={K.text}
					>
						Welcome back!
					</T>
					<svg
						width={64}
						height={44}
						viewBox="0 0 16 11"
						style={{ position: "absolute", left: w * 0.26 - 32, top: 72 }}
					>
						<title>glyph</title>
						<path d="M4 1h8v2h2v4h-2v2H4V7H2V3h2z" fill={rgbs(acc)} />
						<path d="M5 4h2v2H5zM9 4h2v2H9z" fill="rgb(30,30,30)" />
						<path d="M4 9h2v2H4zM10 9h2v2h-2z" fill={rgbs(acc)} />
					</svg>
					<T x={22} y={128} size={fs} font={MONO} colour={K.text} alpha={0.85}>
						Model 2 · Pro
					</T>
					<T
						x={0}
						w={w * 0.52}
						align="center"
						y={150}
						size={fs}
						font={MONO}
						colour={K.text}
						alpha={0.85}
					>
						~/dev/rowan
					</T>
					<Box x={w * 0.52} y={10} w={1.5} h={Math.min(230, h * 0.42) - 24} fill={acc} a={0.7} />
					<T x={w * 0.52 + 14} y={12} size={fs} font={MONO} weight={700} colour={acc}>
						Tips for getting started
					</T>
					<T x={w * 0.52 + 14} y={12 + lh} size={fs} font={MONO} colour={K.text} alpha={0.85}>
						Run /init to set up the project
					</T>
					<Box x={w * 0.52 + 14} y={12 + lh * 2.5} w={w * 0.44} h={1} fill={acc} a={0.5} />
					<T x={w * 0.52 + 14} y={12 + lh * 3} size={fs} font={MONO} weight={700} colour={acc}>
						Recent activity
					</T>
					<T x={w * 0.52 + 14} y={12 + lh * 4} size={fs} font={MONO} colour={K.text} alpha={0.85}>
						No recent activity
					</T>
				</Box>
			) : null}
			{prompt != null ? (
				<>
					<Box
						x={0}
						y={banner ? Math.min(230, h * 0.42) + 64 : 40}
						w={w}
						h={1}
						fill={[80, 80, 80]}
					/>
					<T
						x={10}
						y={(banner ? Math.min(230, h * 0.42) + 64 : 40) + 10}
						size={fs}
						font={MONO}
						colour={K.text}
					>
						{`❯ ${prompt}`}
						{caret ? (
							<span
								style={{
									display: "inline-block",
									width: fs * 0.6,
									height: fs * 1.05,
									background: rgbs(K.text),
									verticalAlign: -2,
									marginLeft: 2,
								}}
							/>
						) : null}
					</T>
					<Box
						x={0}
						y={(banner ? Math.min(230, h * 0.42) + 64 : 40) + 40}
						w={w}
						h={1}
						fill={[80, 80, 80]}
					/>
				</>
			) : null}
			{lines.map((l, i) => {
				const o = typeof l === "string" ? { text: l } : l;
				return (
					<T
						key={`${i}-${o.text}`}
						x={12}
						y={(banner ? Math.min(230, h * 0.42) + 64 : 40) + 50 + i * lh}
						size={fs}
						font={MONO}
						colour={o.colour ?? K.text}
						alpha={o.alpha ?? 0.88}
						weight={o.bold ? 700 : 400}
					>
						{o.text}
					</T>
				);
			})}
		</Box>
	);
}
