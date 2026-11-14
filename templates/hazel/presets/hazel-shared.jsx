/**
 * hazel-shared.jsx — timing, colour and chrome shared by every hazel preset.
 *
 * Measured off a 43.8s launch film for a vector-graphics model (1280x720 @25fps;
 * frame n = n * 40 ms, 0-based). The film is authored directly in reference
 * pixels on the 1280x720 stage and rendered with `--scale 1.5` for 1920x1080.
 *
 * Every export is a pure function of its props: no wall clock, no CSS
 * transitions. The drawn art lives in hazel-shared-art.jsx.
 */
import React from "react";
import { clamp01, easeByName, lerp } from "../../../src/lib/textcards/src/easing.js";

export { clamp01, lerp };

// ── type and colour ───────────────────────────────────────────────────────

export const UI = `"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
export const MONO = `"JetBrains Mono", "Cascadia Mono", Consolas, "Courier New", monospace`;
export const SERIF = `Georgia, "Times New Roman", serif`;
export const DISPLAY = `"Bahnschrift", "Segoe UI", sans-serif`;
export const CONDENSED = `"Bahnschrift Condensed", Impact, "Arial Narrow", sans-serif`;

export const rgbs = (c, a = 1) =>
	a >= 1
		? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
		: `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, a).toFixed(4)})`;

/** Measured colours (6x6 px medians from the reference frames named). */
export const H = {
	white: [253, 253, 253],
	paper: [246, 246, 246], // split-screen left pane, drum ground (f90, f240)
	panel: [232, 241, 248], // the pale panel behind the opening line (f40)
	gridLine: [221, 234, 245],
	cyan: [112, 188, 220], // line-art stroke (f90)
	ink: [36, 42, 61], // selected drum word (f240)
	greyWord: [205, 206, 208],
	dock: [36, 40, 47],
	navy: [35, 59, 106],
	blueLeft: [122, 164, 226], // right pane behind the app window (f90)
	tile: [20, 72, 196], // the app tile
	code: [58, 60, 54], // code panel (f410)
	codeText: [214, 212, 196],
	line: [122, 164, 226], // pen-tool outline
	node: [76, 128, 212],
	royal: [8, 16, 196], // the filled frames of the strip (f572)
	table: [226, 225, 218], // table ground (f660, centre lift to 229)
	green: [52, 168, 96],
	send: [44, 108, 230],
	loaderGrey: [120, 120, 118],
	claim: [54, 56, 60],
};

// ── time ──────────────────────────────────────────────────────────────────

export const FPS = 25;
export const fms = (f) => (f * 1000) / FPS;
export const localMs = (cfg, t) => t * 1000 - (cfg.startMs ?? 0);
export const localF = (cfg, t) => (t * 1000 - (cfg.startMs ?? 0)) / 40;

/** Sparse keys over scene-relative `at` (frames); omitted channels inherit. */
export function kf(keys, at) {
	if (!keys || !keys.length) return {};
	const res = [];
	let prev = {};
	for (const k of keys) {
		const cur = { ...prev, ...k };
		res.push(cur);
		prev = cur;
	}
	if (at <= res[0].at) return res[0];
	const last = res[res.length - 1];
	if (at >= last.at) return last;
	for (let i = 0; i < res.length - 1; i++) {
		const a = res[i];
		const b = res[i + 1];
		if (at >= a.at && at < b.at) {
			if (keys[i + 1].ease === "hold") return a;
			const p = clamp01((at - a.at) / Math.max(1e-6, b.at - a.at));
			const e = easeByName(keys[i + 1].ease ?? "linear", keys[i + 1].pow, (x) => x)(p);
			const o = {};
			for (const n of Object.keys(b)) {
				if (n === "at" || n === "ease" || n === "pow") continue;
				const va = a[n];
				const vb = b[n];
				o[n] = typeof va === "number" && typeof vb === "number" ? lerp(va, vb, e) : vb;
			}
			return o;
		}
	}
	return last;
}

/** Progress of a beat in frames: 0 before `at`, 1 after `at + dur`. */
export const prog = (f, at, dur, ease = "out", pow) =>
	easeByName(ease, pow, (x) => x)(clamp01((f - at) / Math.max(1e-6, dur)));

/** Hard window helper: is frame f inside [a, b)? */
export const inW = (f, a, b) => f >= a && (b == null || f < b);

// ── stage ─────────────────────────────────────────────────────────────────

export function Stage({ z = 1, bg, children, style }) {
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1280,
				height: 720,
				overflow: "hidden",
				background: bg ? rgbs(bg) : undefined,
				zIndex: z,
				...style,
			}}
		>
			{children}
		</div>
	);
}

export function Abs({ x, y, w, h, children, style }) {
	return (
		<div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>
			{children}
		</div>
	);
}

/** Pale dot grid on the pen-tool canvases (pitch and alpha measured on f516). */
export function DotGrid({ pitch = 48, colour = [172, 186, 208], alpha = 0.34, r = 1.4 }) {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				backgroundImage: `radial-gradient(circle, ${rgbs(colour, alpha)} ${r}px, rgba(255,255,255,0) ${r + 0.6}px)`,
				backgroundSize: `${pitch}px ${pitch}px`,
				backgroundPosition: "20px 16px",
			}}
		/>
	);
}

// ── sky ───────────────────────────────────────────────────────────────────

/**
 * The film's one gradient: blue with diagonal pale streaks, sampled at f3 and
 * f360. Streaks drift very slowly (about 1 px per frame on the brightest band).
 */
export function Sky({ f = 0, opacity = 1, drift = 1 }) {
	const bands = [
		{ y: 120, h: 130, a: 0.34, c: [226, 232, 238], r: -14, v: 0.9 },
		{ y: 300, h: 110, a: 0.62, c: [214, 218, 224], r: -16, v: 0.7 },
		{ y: 480, h: 150, a: 0.74, c: [206, 208, 212], r: -15, v: 0.55 },
		{ y: -20, h: 110, a: 0.3, c: [150, 190, 232], r: -12, v: 0.4 },
	];
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity }}>
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"linear-gradient(165deg, rgb(78,128,192) 0%, rgb(104,152,208) 34%, rgb(138,170,206) 62%, rgb(70,126,192) 100%)",
				}}
			/>
			{bands.map((b) => (
				<div
					key={b.y}
					style={{
						position: "absolute",
						left: -300,
						top: b.y + f * drift * b.v * 0.5,
						width: 1900,
						height: b.h,
						background: rgbs(b.c, b.a),
						transform: `rotate(${b.r}deg)`,
						filter: "blur(46px)",
					}}
				/>
			))}
			<div
				style={{
					position: "absolute",
					left: 880,
					top: 620,
					width: 620,
					height: 260,
					borderRadius: "50%",
					background: "rgb(60,118,196)",
					filter: "blur(60px)",
					opacity: 0.9,
				}}
			/>
		</div>
	);
}

// ── image slots ───────────────────────────────────────────────────────────

/** An image slot: the user's picture when `src` is set, else the drawn stand-in. */
export function Slot({ src, children }) {
	if (src) {
		return (
			<img
				alt=""
				src={src}
				style={{
					position: "absolute",
					inset: 0,
					width: "100%",
					height: "100%",
					objectFit: "cover",
				}}
			/>
		);
	}
	return children;
}

// ── chrome ────────────────────────────────────────────────────────────────

/** A hard-edged selection box with four corner handles, the drum's marker. */
export function SelectionBox({ x, y, w, h, colour = [120, 176, 226], a = 1 }) {
	const hs = 8;
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: w,
				height: h,
				boxSizing: "border-box",
				border: `2px solid ${rgbs(colour, a)}`,
			}}
		>
			{[
				[-hs / 2 - 1, -hs / 2 - 1],
				[w - hs / 2 - 1, -hs / 2 - 1],
				[-hs / 2 - 1, h - hs / 2 - 1],
				[w - hs / 2 - 1, h - hs / 2 - 1],
			].map(([cx, cy]) => (
				<div
					key={`${cx}-${cy}`}
					style={{
						position: "absolute",
						left: cx,
						top: cy,
						width: hs,
						height: hs,
						background: "#fff",
						border: `1.5px solid ${rgbs(colour, a)}`,
						boxSizing: "border-box",
					}}
				/>
			))}
		</div>
	);
}

/** A circular anchor handle (white with a coloured ring, f3). */
export function Anchor({ x, y, r = 5, ring = [58, 134, 226], fill = [255, 255, 255], a = 1 }) {
	return (
		<circle
			cx={x}
			cy={y}
			r={r}
			fill={rgbs(fill, a)}
			stroke={rgbs(ring, a)}
			strokeWidth={Math.max(1, r * 0.45)}
		/>
	);
}

/** Text mask reveal: dark copy clipped to a moving rectangle over a pale copy. */
export function WipeText({ x, y, text, size, weight = 500, pale, dark, wipeX, font = UI }) {
	const base = {
		position: "absolute",
		left: x,
		top: y,
		font: `${weight} ${size}px ${font}`,
		lineHeight: `${size * 1.2}px`,
		whiteSpace: "pre",
	};
	return (
		<>
			<div style={{ ...base, color: rgbs(pale) }}>{text}</div>
			<div
				style={{
					...base,
					color: rgbs(dark),
					clipPath: `inset(-20px -2000px -20px ${Math.max(0, wipeX - x)}px)`,
				}}
			>
				{text}
			</div>
		</>
	);
}
