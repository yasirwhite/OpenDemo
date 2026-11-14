/**
 * laurel-shared.jsx — the vocabulary every laurel preset is built from.
 *
 * Measured off a 21.0s feature-drop film (1920x1080 @30fps, 630 frames),
 * sampled on its own 30fps clock and mapped to the 1280x720 stage (stage px =
 * ref px / 1.5). Frame numbers in comments are reference frames, f1 = t 0.
 *
 * The film is ONE object carried through every beat: a dark VOICE PILL with
 * a row of green level bars. It knocks a row of keycaps off the frame, drops
 * to the bottom of the screen and stays there while the words it hears are
 * typed above it, until a hard cut to the brand card.
 *
 *   GROUND   warm off-white [245,246,242] (f20, f330 corners).
 *   KEYS     keycaps seen slightly from above: a flat top face flush with the
 *            cap's top edge and a skirt showing 49 px below it. Lime face
 *            [208,235,73] on an olive printed skirt; grey face [211,212,210]
 *            on a [186,187,185] skirt. 213 px tall, 186-306 px wide, 10 px
 *            apart, skirts printed with oversized type and line art.
 *   PILL     402x162 capsule [44,46,40] (f110), 9 level bars 27 px apart in
 *            [120,208,5], a green glow while it is big; shrinks to 240x98 at
 *            the bottom (f190 on) and keeps its bars moving to the end.
 *   TYPE     every line is TYPED, left-anchored at its final layout, and the
 *            newest characters are tinted (pink -> lilac -> blue -> green ->
 *            olive across the line) before they settle to ink.
 *
 * Every export is a pure function of its props / t.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";

// ── type ──────────────────────────────────────────────────────────────────

/** Book serif for headings and claims (the reference uses a text serif). */
export const SERIF = `"Georgia", "Cambria", "Times New Roman", serif`;
/** Interface sans for the composer and fine print. */
export const SANS = `"Segoe UI", "Inter", system-ui, sans-serif`;
/** Marker hand for the title word. Ink Free ships with Windows 10+. */
export const HAND = `"Ink Free", "Segoe Print", "Comic Sans MS", cursive`;
/** Key legend inside the composer text. */
export const MONO = `"Consolas", "SFMono-Regular", "Menlo", monospace`;
/** Heavy rounded grotesk for the wordmark. */
export const WORD = `"Segoe UI", "Inter", system-ui, sans-serif`;

// ── colour ────────────────────────────────────────────────────────────────

export const rgbs = (c, a = 1) =>
	a >= 1
		? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
		: `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, a).toFixed(4)})`;

export const mix = (a, b, p) => a.map((v, i) => lerp(v, b[i], clamp01(p)));

/** Measured palette (sampled, not invented). */
export const L = {
	ground: [245, 246, 242], // f20 corner
	ink: [24, 25, 23], // f500 serif claim core
	limeFace: [208, 235, 73], // f60 (290,300)
	limeSkirt: [128, 142, 64], // f60 skirt between prints
	limePrint: [58, 64, 30],
	greyFace: [211, 212, 210], // f60 (480,300)
	greySkirt: [186, 187, 185], // f60 (480,440)
	greyPrint: [44, 46, 44],
	pill: [44, 46, 40], // f110 (600,360)
	pillRim: [62, 64, 58],
	bar: [120, 208, 5], // f230 bar cores
	glow: [124, 206, 22],
	lavender: [195, 180, 230], // f230 (700,40)
	card: [251, 249, 252], // f230 (640,300)
	endLime: [176, 203, 75], // f600 corner
	coral: [226, 112, 80],
	fine: [104, 104, 102], // f500 fine print
};

/** Tint of a newly typed character by its position along the line. */
const TAIL = [
	[0, [232, 112, 196]],
	[0.3, [178, 146, 232]],
	[0.55, [96, 146, 226]],
	[0.8, [104, 186, 60]],
	[1, [168, 176, 52]],
];
export function tailColour(p) {
	const q = clamp01(p);
	for (let i = 0; i < TAIL.length - 1; i++) {
		const [a, ca] = TAIL[i];
		const [b, cb] = TAIL[i + 1];
		if (q <= b) return mix(ca, cb, (q - a) / (b - a));
	}
	return TAIL[TAIL.length - 1][1];
}

// ── time ──────────────────────────────────────────────────────────────────

/** Reference frame F at film time t for scene c (c.f0 = its first ref frame). */
export const refFrame = (c, t, f0) => (t * 1000 - c.startMs) * 0.03 + (c.f0 ?? f0);

const EASE = {
	l: (p) => p,
	io: (p) => p * p * (3 - 2 * p),
	o: (p) => 1 - (1 - p) * (1 - p),
	o3: (p) => 1 - (1 - p) ** 3,
	i: (p) => p * p,
};

/**
 * A measured curve: pts [[frame, value, ease?], ...], piecewise between
 * samples (ease names the segment ENDING at that sample, default linear),
 * held flat outside. Values may be numbers or arrays of numbers.
 */
export function curve(pts, f) {
	if (f <= pts[0][0]) return pts[0][1];
	for (let i = 0; i < pts.length - 1; i++) {
		const [fa, va] = pts[i];
		const [fb, vb, e] = pts[i + 1];
		if (f <= fb) {
			const p = (EASE[e] ?? EASE.l)(clamp01((f - fa) / Math.max(1e-6, fb - fa)));
			return Array.isArray(va) ? va.map((v, k) => lerp(v, vb[k], p)) : lerp(va, vb, p);
		}
	}
	return pts[pts.length - 1][1];
}

/** Deterministic 0..1 hash. */
export const hash = (n) => {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

// ── marks ─────────────────────────────────────────────────────────────────

/**
 * The placeholder brand mark: one brushed stroke drawing a laurel leaf
 * (stem, left edge to the tip, right edge back, midrib). `p` 0..1 draws it
 * on along its own length. Replace it with your own mark via `markSrc`.
 */
const LEAF = "M24 90 C30 82 35 77 41 71 C27 52 40 24 82 13 C82 46 66 70 41 71 C51 59 60 46 70 30";

export function LaurelMark({ size, p = 1, colour = L.ink, weight = 9.5, id = "lm", src }) {
	if (src) {
		return (
			<img
				alt=""
				src={src}
				style={{
					width: size,
					height: size,
					objectFit: "contain",
					opacity: clamp01(p * 4),
					display: "block",
				}}
			/>
		);
	}
	const off = 1 - clamp01(p);
	return (
		<svg
			width={size}
			height={size}
			viewBox="9 5 88 88"
			style={{ display: "block", overflow: "visible" }}
		>
			<defs>
				<filter id={`${id}-rough`} x="-10%" y="-10%" width="120%" height="120%">
					<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
					<feDisplacementMap in="SourceGraphic" scale="1.1" />
				</filter>
			</defs>
			<path
				d={LEAF}
				pathLength={1}
				fill="none"
				stroke={rgbs(colour)}
				strokeWidth={weight}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeDasharray="1 1"
				strokeDashoffset={off}
				filter={`url(#${id}-rough)`}
				opacity={off >= 0.999 ? 0 : 1}
			/>
		</svg>
	);
}

// ── keycaps ───────────────────────────────────────────────────────────────

/** Skirt print: oversized type and line art bleeding off the cap (f60). */
function SkirtPrint({ w, h, colour, seed }) {
	const glyphs = ["e", "n", "a", "r", "t", "o"];
	const items = [];
	for (let k = 0; k < 3; k++) {
		const r = hash(seed * 7 + k);
		items.push(
			<div
				key={`g${k}`}
				style={{
					position: "absolute",
					left: -20 + r * w * 0.8,
					top: h * (0.25 + 0.3 * hash(seed + k * 3.1)),
					font: `400 ${150 + 60 * hash(seed + k)}px ${SERIF}`,
					lineHeight: 1,
					color: rgbs(colour, 0.78),
					transform: `rotate(${(hash(seed * 3 + k) - 0.5) * 70}deg)`,
				}}
			>
				{glyphs[Math.floor(hash(seed * 11 + k) * glyphs.length)]}
			</div>,
		);
	}
	const lines = [];
	for (let k = 0; k < 4; k++) {
		const x1 = hash(seed + k * 5.3) * w;
		const x2 = hash(seed + k * 9.1) * w;
		lines.push(
			<line
				key={`l${k}`}
				x1={x1}
				y1={0}
				x2={x2}
				y2={h}
				stroke={rgbs(colour, 0.55)}
				strokeWidth={1.2}
			/>,
		);
	}
	return (
		<>
			<svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
				{lines}
			</svg>
			{items}
		</>
	);
}

/**
 * One keycap. (cx, top) place the cap's top edge centre; w x h its outline.
 * The top face is flush with the top edge, inset 14 px each side and 77% of
 * the height, so 49 px of printed skirt shows below it (f60).
 */
export function Keycap({
	cx,
	top,
	w,
	h = 213,
	kind = "grey",
	rot = 0,
	blur = 0,
	seed = 1,
	children,
}) {
	const lime = kind === "lime";
	const face = lime ? L.limeFace : L.greyFace;
	const skirt = lime ? L.limeSkirt : L.greySkirt;
	const print = lime ? L.limePrint : L.greyPrint;
	const fh = Math.round(h * 0.77);
	return (
		<div
			style={{
				position: "absolute",
				left: cx - w / 2,
				top,
				width: w,
				height: h,
				borderRadius: 38,
				overflow: "hidden",
				background: rgbs(skirt),
				transform: rot ? `rotate(${rot.toFixed(2)}deg)` : undefined,
				filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
			}}
		>
			<SkirtPrint w={w} h={h} colour={print} seed={seed} />
			<div
				style={{
					position: "absolute",
					left: 14,
					top: 0,
					width: w - 29,
					height: fh,
					borderRadius: 32,
					background: `linear-gradient(180deg, ${rgbs(mix(face, [255, 255, 255], 0.08))} 0%, ${rgbs(face)} 60%, ${rgbs(mix(face, [0, 0, 0], 0.04))} 100%)`,
					boxShadow: `0 6px 10px ${rgbs([0, 0, 0], 0.16)}`,
				}}
			>
				{children}
			</div>
		</div>
	);
}

// ── the pill ──────────────────────────────────────────────────────────────

/** Level of bar i at frame f, 0..1: a few beating sines, deterministic. */
export function barLevel(i, f) {
	const a = Math.sin(f * 0.61 + i * 1.73) * 0.5 + 0.5;
	const b = Math.sin(f * 0.37 + i * 2.91 + 1.3) * 0.5 + 0.5;
	const c = Math.sin(f * 1.13 + i * 0.77 + 2.1) * 0.5 + 0.5;
	const env = 1 - Math.abs(i - 4) / 4.6; // centre bars run taller
	const v = (0.45 * a + 0.35 * b + 0.2 * c) * env;
	return v < 0.18 ? 0 : clamp01((v - 0.18) / 0.62);
}

/**
 * The voice pill, centred on (cx, cy) at scale s (s 1 = 402x162, f110).
 * `glow` 0..1 is the green halo of the big state. Bars live on frame f.
 */
export function Pill({ cx, cy, s, glow = 0, f, opacity = 1 }) {
	const w = 402 * s;
	const h = 162 * s;
	const bars = [];
	for (let i = 0; i < 9; i++) {
		const lv = barLevel(i, f);
		const bh = (11 + lv * 46) * s;
		bars.push(
			<div
				key={i}
				style={{
					position: "absolute",
					left: w / 2 + (i - 4) * 27 * s - 5.5 * s,
					top: h / 2 - bh / 2,
					width: 11 * s,
					height: bh,
					borderRadius: 6 * s,
					background: rgbs(L.bar),
				}}
			/>,
		);
	}
	return (
		<div
			style={{
				position: "absolute",
				left: cx - w / 2,
				top: cy - h / 2,
				width: w,
				height: h,
				borderRadius: h / 2,
				background: `linear-gradient(180deg, ${rgbs(mix(L.pill, [255, 255, 255], 0.035))}, ${rgbs(L.pill)})`,
				boxShadow: [
					`inset 0 0 0 ${(2 * s).toFixed(2)}px ${rgbs(L.pillRim)}`,
					glow > 0.004
						? `0 0 ${(84 * s * (0.75 + 0.25 * glow)).toFixed(1)}px ${(26 * s * glow).toFixed(1)}px ${rgbs(L.glow, Math.min(1, 0.9 * glow))}`
						: `0 ${(4 * s).toFixed(1)}px ${(10 * s).toFixed(1)}px ${rgbs([0, 0, 0], 0.12)}`,
				].join(", "),
				opacity,
			}}
		>
			{bars}
		</div>
	);
}

/**
 * The sound ribbon: a dotted level line streaming in from the left edge and
 * running into the pill's left end (f124 on). `front` is how far it has
 * reached; bars scroll right at `speed` px/frame.
 */
export function Ribbon({ y, x1, front, s, f, colour, opacity = 1, speed = 5 }) {
	const sp = 30 * s; // 30 px apart beside the big pill (f150), 18 beside the small one (f230)
	const flow = f * speed;
	const k0 = Math.floor(flow / sp);
	const bars = [];
	const right = Math.min(front, x1);
	for (let k = 0; k < 90; k++) {
		const x = x1 - 10 * s - (k * sp - (flow % sp));
		if (x < -10) break;
		if (x > right) continue;
		const id = k0 - k;
		const r = hash(id * 1.37);
		const bh = r < 0.55 ? 10 * s : (14 + (r - 0.55) * 80) * s;
		bars.push(
			<div
				key={id}
				style={{
					position: "absolute",
					left: x - 4.2 * s,
					top: y - bh / 2,
					width: 8.4 * s,
					height: bh,
					borderRadius: 4.2 * s,
					background: rgbs(colour),
				}}
			/>,
		);
	}
	return <div style={{ position: "absolute", inset: 0, opacity }}>{bars}</div>;
}

// ── typed text ────────────────────────────────────────────────────────────

/**
 * Split copy into typing units: one per character, except `[...]` which is
 * one inline KEY CHIP (e.g. "Hold [fn] and talk").
 */
export function units(text) {
	const out = [];
	const re = /\[([^\]]+)\]/g;
	let last = 0;
	let m = re.exec(text);
	while (m) {
		for (const ch of text.slice(last, m.index)) out.push({ ch });
		out.push({ chip: m[1] });
		last = m.index + m[0].length;
		m = re.exec(text);
	}
	for (const ch of text.slice(last)) out.push({ ch });
	return out;
}

/**
 * A typed line. Every unit is laid out from the first frame (untyped ones
 * transparent), so wrapping and anchoring are final while it types. Unit i
 * appears at frame at + i * fpc; when `del` is given, units vanish back to
 * front from del.at at del.fpc frames per unit. A new unit is tinted by its
 * position along the line and settles to `ink` over `tail` frames.
 */
export function Typed({ text, f, at, fpc, del, tail = 4, ink = L.ink, style, chipStyle }) {
	const us = units(text);
	const n = us.length;
	const shown = Math.floor((f - at) / fpc) + 1;
	const kept = del ? n - Math.max(0, Math.floor((f - del.at) / del.fpc) + 1) : n;
	return (
		<span style={style}>
			{us.map((u, i) => {
				const visible = i < shown && i < kept;
				const age = f - (at + i * fpc);
				const c = visible ? mix(tailColour(i / Math.max(1, n - 1)), ink, age / tail) : null;
				if (u.chip) {
					return (
						<span
							key={i}
							style={{
								display: "inline-block",
								padding: "0 0.28em",
								margin: "0 0.08em",
								borderRadius: "0.22em",
								background: visible ? rgbs([226, 225, 228]) : "transparent",
								color: visible ? rgbs(c) : "transparent",
								fontFamily: MONO,
								lineHeight: 1.15,
								...chipStyle,
							}}
						>
							{u.chip}
						</span>
					);
				}
				return (
					<span key={i} style={{ color: visible ? rgbs(c) : "transparent" }}>
						{u.ch}
					</span>
				);
			})}
		</span>
	);
}

/** Absolute full-stage layer. */
export function Layer({ z = 10, children, style }) {
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1280,
				height: 720,
				overflow: "hidden",
				zIndex: z,
				...style,
			}}
		>
			{children}
		</div>
	);
}

// ── measuring ─────────────────────────────────────────────────────────────

let measureCtx = null;
/** Advance width of a string in a CSS font (system fonts, so deterministic). */
export function textWidth(str, font) {
	if (typeof document === "undefined")
		return str.length * 0.5 * Number.parseFloat(font.split("px")[0].split(" ").pop());
	if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
	measureCtx.font = font;
	return measureCtx.measureText(str).width;
}
