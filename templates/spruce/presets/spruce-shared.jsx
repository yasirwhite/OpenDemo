/**
 * spruce-shared.jsx — the vocabulary every spruce preset is built from.
 *
 * Measured off an 80.4s aura-gradient launch film for an AI app builder
 * (1920x1080 @30fps; frame n = n/30 s). Everything is authored in REFERENCE
 * PIXELS: a 1920x1080 box laid on the 1280x720 stage and scaled by 1/1.5, so
 * `render.mjs --scale 1.5` gives 1920x1080 with the picture 1:1.
 *
 *   GROUNDS  three families, cut hard between beats:
 *            - cream [246,243,236] with soft pink/orange/lilac auras breathing
 *              in from the frame edges (the claims, the UI close-ups);
 *            - the ARC aura: concentric rings around a centre below the
 *              frame, orange core -> magenta -> pink -> lilac -> blue outer
 *              (the lockup, the big single words);
 *            - black with a violet/magenta haze rising from the bottom edge
 *              (the orbs, the code beats, the end card).
 *            Every aura carries a heavy, per-frame film grain (std ~9/255).
 *   TYPE     one grotesk, semibold, near-black on cream and white on colour;
 *            Segoe UI stands in. Lines grow word by word and RE-CENTRE as they
 *            grow (the visible line's centre eases to the frame centre over
 *            ~300 ms); new words arrive blurred and sharpen in ~200 ms.
 *   UI       drawn stand-ins for the app: a dark chat panel beside a white
 *            preview, buttons and dialogs at punch-in scale, a white hand
 *            cursor with a black outline. Every window takes `src` footage.
 *
 * Every export is a pure function of its props.
 */
import React from "react";
import { clamp01, easeByName, lerp } from "../../../src/lib/textcards/src/easing.js";

// ── type and colour ───────────────────────────────────────────────────────

export const SANS = `"Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif`;
export const MONO = `"Cascadia Mono", Consolas, "Courier New", monospace`;

export const rgbs = (c, a = 1) =>
	a >= 1
		? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
		: `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, a).toFixed(4)})`;

/** Measured palette (medians of flat patches on the reference). */
export const P = {
	cream: [246, 243, 236],
	ink: [17, 17, 17],
	grey: [70, 66, 68],
	white: [255, 255, 255],
	black: [0, 0, 0],
	blue: [70, 120, 245],
	lilac: [196, 130, 240],
	pink: [240, 110, 210],
	magenta: [236, 18, 120],
	red: [238, 40, 70],
	orange: [240, 84, 36],
	violet: [92, 40, 170],
	ui: [37, 99, 235], // primary button blue
	panel: [24, 24, 26],
	panel2: [34, 34, 37],
	line: [228, 228, 232],
};

// ── time ──────────────────────────────────────────────────────────────────

export const FPS = 30;
export const fms = (f) => (f * 1000) / FPS;
export const localMs = (cfg, t) => t * 1000 - (cfg.startMs ?? 0);
export const prog = (ms, a, b) => clamp01((ms - a) / Math.max(1e-6, b - a));
export const E = (name, p, pow) => easeByName(name, pow, (x) => x)(clamp01(p));
export const expo = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * clamp01(p)));
export const smooth = (p) => {
	const x = clamp01(p);
	return x * x * (3 - 2 * x);
};

/**
 * kf(keys, ms) — keyframes over scene-relative `at` (ms). Keys inherit omitted
 * channels from the previous key; `ease` shapes the segment INTO that key
 * (linear default, "hold" jumps). Arrays interpolate per item.
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

/** Typed prefix of `text` at `ms`: `cps` chars/s from `at`. */
export const typed = (text, ms, at, cps = 20) =>
	text.slice(0, Math.max(0, Math.min(text.length, Math.floor(((ms - at) / 1000) * cps))));
export const blinkOn = (ms, period = 500) => Math.floor(Math.max(0, ms) / period) % 2 === 0;

/** Deterministic hash -> [0,1). */
export function hash(n) {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

// ── the reference box ─────────────────────────────────────────────────────

export const W = 1920;
export const H = 1080;

/** Children are laid out in 1920x1080 reference px. */
export function RefBox({ children, z = 1, style }) {
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: W,
				height: H,
				transform: `scale(${(1 / 1.5).toFixed(6)})`,
				transformOrigin: "0 0",
				zIndex: z,
				overflow: "hidden",
				...style,
			}}
		>
			{children}
		</div>
	);
}

// ── text measurement ──────────────────────────────────────────────────────

let _ctx = null;
/** Advance width of `text` at `size` px (canvas metrics, same face as CSS). */
export function textW(text, size, weight = 600, family = SANS) {
	if (typeof document === "undefined") return text.length * size * 0.52;
	if (!_ctx) _ctx = document.createElement("canvas").getContext("2d");
	_ctx.font = `${weight} ${size}px ${family}`;
	return _ctx.measureText(text).width;
}

// ── grain ─────────────────────────────────────────────────────────────────

let _grain = null;
/** A 256px tile of seeded mono noise, built once. */
function grainTile() {
	if (_grain || typeof document === "undefined") return _grain;
	const c = document.createElement("canvas");
	c.width = 256;
	c.height = 256;
	const g = c.getContext("2d");
	const img = g.createImageData(256, 256);
	let s = 1234567;
	for (let i = 0; i < 256 * 256; i++) {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		const v = (s >> 8) & 255;
		img.data[i * 4] = v;
		img.data[i * 4 + 1] = v;
		img.data[i * 4 + 2] = v;
		img.data[i * 4 + 3] = 255;
	}
	g.putImageData(img, 0, 0);
	_grain = c.toDataURL("image/png");
	return _grain;
}

/** Film grain: the tile jumps to a new offset every frame (pure in t). */
export function Grain({ t, alpha = 0.16, blend = "overlay", z = 30 }) {
	const tile = grainTile();
	if (!tile || alpha <= 0) return null;
	const f = Math.round(t * FPS);
	const ox = Math.floor(hash(f) * 256);
	const oy = Math.floor(hash(f + 91.3) * 256);
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: W,
				height: H,
				backgroundImage: `url(${tile})`,
				backgroundSize: "256px 256px",
				backgroundPosition: `${ox}px ${oy}px`,
				opacity: alpha,
				mixBlendMode: blend,
				zIndex: z,
				pointerEvents: "none",
			}}
		/>
	);
}

// ── auras ─────────────────────────────────────────────────────────────────

/**
 * Concentric ring gradient. `rings` [[colour, r]] — r in px from the centre
 * along the VERTICAL axis (x uses r * rx/ry). Outside the last ring the last
 * colour holds.
 */
export function ringGradient({ cx, cy, rx, ry, rings, alphaMul = 1 }) {
	const stops = rings
		.map(([c, r, a = 1]) => `${rgbs(c, a * alphaMul)} ${((r / ry) * 100).toFixed(2)}%`)
		.join(", ");
	return `radial-gradient(ellipse ${rx.toFixed(1)}px ${ry.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, ${stops})`;
}

/**
 * Named ring sets, radii in px from the centre along the vertical axis,
 * sampled down the centre column of the reference (centre ~ (960, 1250),
 * ellipse aspect ~1.38): arc f240 (the lockup), arc2 f324 (the big word),
 * arc3 f360 (the warm follow-on), heart f2240, dark f1930.
 */
export const RINGS = {
	arc: [
		[[240, 75, 30], 0],
		[[238, 72, 28], 480],
		[[238, 40, 60], 530],
		[[236, 10, 120], 600],
		[[232, 22, 142], 680],
		[[230, 46, 161], 770],
		[[236, 73, 192], 830],
		[[240, 105, 219], 890],
		[[247, 135, 240], 950],
		[[221, 142, 245], 1010],
		[[193, 147, 249], 1070],
		[[153, 143, 252], 1130],
		[[104, 136, 248], 1190],
		[[84, 126, 245], 1250],
		[[70, 120, 245], 1400],
	],
	arc2: [
		[[240, 65, 37], 0],
		[[240, 65, 37], 280],
		[[236, 50, 45], 350],
		[[237, 22, 78], 470],
		[[236, 10, 98], 530],
		[[240, 16, 142], 710],
		[[239, 44, 167], 830],
		[[237, 69, 192], 950],
		[[241, 89, 210], 1010],
		[[228, 103, 215], 1070],
		[[214, 118, 230], 1130],
		[[187, 126, 239], 1190],
		[[157, 133, 242], 1250],
		[[100, 125, 245], 1420],
	],
	arc3: [
		[[248, 180, 150], 0],
		[[246, 165, 125], 450],
		[[237, 135, 94], 550],
		[[237, 87, 44], 700],
		[[235, 65, 34], 850],
		[[233, 38, 55], 970],
		[[235, 12, 89], 1090],
		[[236, 7, 111], 1150],
		[[230, 40, 170], 1350],
	],
	rim: [
		[[246, 243, 236], 0],
		[[246, 243, 236], 640],
		[[248, 214, 226], 820],
		[[244, 150, 196], 960],
		[[240, 120, 120], 1100],
	],
	heart: [
		[[244, 96, 52], 0],
		[[244, 96, 70], 140],
		[[236, 50, 150], 330],
		[[200, 80, 230], 470],
		[[98, 96, 240], 620],
		[[130, 140, 245], 760],
		[[180, 180, 250], 900],
	],
	dark: [
		[[150, 40, 120], 0],
		[[90, 30, 120], 260],
		[[40, 20, 70], 520],
		[[8, 6, 14], 760],
		[[0, 0, 0], 900],
	],
};

/**
 * <Aura> — a full-frame ground: base fill + one ring gradient + optional
 * extra blobs (radial ellipses fading to transparent) + grain.
 */
export function Aura({ base = P.cream, ring, blobs = [], grain = 0.16, t = 0, z = 0 }) {
	const layers = [];
	for (const b of blobs) {
		const a = b.a ?? 1;
		if (a <= 0) continue;
		layers.push(
			`radial-gradient(ellipse ${b.rx}px ${b.ry ?? b.rx}px at ${b.x}px ${b.y}px, ${rgbs(b.c, a)} 0%, ${rgbs(
				b.c,
				a * 0.55,
			)} ${(b.core ?? 0.35) * 100}%, ${rgbs(b.c, 0)} 100%)`,
		);
	}
	if (ring) layers.push(ringGradient(ring));
	return (
		<div style={{ position: "absolute", inset: 0, zIndex: z }}>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: W,
					height: H,
					background: layers.length ? `${layers.join(", ")}, ${rgbs(base)}` : rgbs(base),
				}}
			/>
			<Grain t={t} alpha={grain} />
		</div>
	);
}

// ── spheres ───────────────────────────────────────────────────────────────

/**
 * A soft glossy sphere: body gradient (top colour -> bottom colour), a thin
 * pale rim light inside the top edge and a feathered silhouette (`soft` =
 * feather as a fraction of r).
 */
export function Sphere({
	x,
	y,
	r,
	top,
	bottom,
	rim = [255, 236, 214],
	rimA = 0.8,
	soft = 0.04,
	alpha = 1,
	children,
}) {
	const d = r * 2;
	const feather = Math.max(0.5, 100 - soft * 100);
	const mask = `radial-gradient(circle ${r.toFixed(1)}px at 50% 50%, #000 ${(feather - soft * 100).toFixed(1)}%, transparent 100%)`;
	return (
		<div
			style={{
				position: "absolute",
				left: x - r,
				top: y - r,
				width: d,
				height: d,
				borderRadius: "50%",
				opacity: alpha,
				background: `radial-gradient(ellipse ${(r * 1.3).toFixed(1)}px ${(r * 1.5).toFixed(1)}px at 50% 0%, ${rgbs(top)} 0%, ${rgbs(
					top,
				)} 30%, ${rgbs(bottom)} 100%)`,
				boxShadow: `inset 0 ${(r * 0.035).toFixed(1)}px ${(r * 0.03).toFixed(1)}px ${rgbs(rim, rimA)}`,
				WebkitMaskImage: mask,
				maskImage: mask,
			}}
		>
			{children}
		</div>
	);
}

// ── cursors ───────────────────────────────────────────────────────────────

/** The white pointing-hand cursor with a black outline (tip at x,y). */
export function Hand({ x, y, s = 1, press = 0, alpha = 1, z = 60 }) {
	const k = s * (1 - press * 0.12);
	return (
		<svg
			width={64 * k}
			height={72 * k}
			viewBox="0 0 64 72"
			style={{
				position: "absolute",
				left: x - 21 * k,
				top: y - 2 * k,
				opacity: alpha,
				zIndex: z,
				overflow: "visible",
				filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.25))",
			}}
		>
			<path
				d="M21 4c-3.5 0-6 2.6-6 6v28l-4.6-4.4c-2.6-2.4-6.6-2.2-8.8.5-2 2.4-1.7 5.8.4 8L18 59c3.8 4.6 8.8 9 16.6 9H40c11 0 18-8 18-19V33c0-3.4-2.5-6-5.8-6-1.5 0-2.8.5-3.8 1.4-.9-2.3-3.1-3.9-5.6-3.9-1.7 0-3.2.7-4.3 1.8-1-2.2-3.1-3.7-5.6-3.7-1.4 0-2.6.4-3.6 1.1V10c0-3.4-2.6-6-6-6z"
				fill="#fff"
				stroke="#000"
				strokeWidth="3.2"
				strokeLinejoin="round"
			/>
			<path d="M33 37v14M42 37v14M51 37v13" stroke="#000" strokeWidth="2.6" strokeLinecap="round" />
		</svg>
	);
}

/** A collaborator's arrow cursor with a name tag. */
export function NamedCursor({ x, y, name, colour, s = 1, alpha = 1, z = 55 }) {
	return (
		<div style={{ position: "absolute", left: x, top: y, opacity: alpha, zIndex: z }}>
			<svg
				width={30 * s}
				height={30 * s}
				viewBox="0 0 30 30"
				style={{ position: "absolute", left: 0, top: 0 }}
			>
				<path d="M2 2 L26 12 L15 15 L11 27 Z" fill={rgbs(colour)} />
			</svg>
			<div
				style={{
					position: "absolute",
					left: 24 * s,
					top: 22 * s,
					padding: `${4 * s}px ${12 * s}px`,
					borderRadius: 999,
					background: rgbs(colour),
					color: "#fff",
					fontWeight: 600,
					fontSize: 17 * s,
					fontFamily: SANS,
					whiteSpace: "nowrap",
				}}
			>
				{name}
			</div>
		</div>
	);
}

// ── word lines ────────────────────────────────────────────────────────────

/**
 * Layout of a growing line: words [{text, at, gap?}] at `size`. Returns each
 * word's x (relative to the line's left edge) and the eased line width at ms
 * (the RE-CENTRING the reference does as words land: the visible width eases
 * toward the new width over `recentreMs` on an expo-out).
 */
export function lineLayout(words, size, weight, ms, recentreMs = 320, tracking = 0) {
	const sp = textW(" ", size, weight) + tracking * size;
	let x = 0;
	let w = 0;
	const xs = [];
	for (let i = 0; i < words.length; i++) {
		const wd = words[i];
		const ww =
			wd.w ??
			textW(wd.text, size * (wd.scale ?? 1), wd.weight ?? weight) +
				tracking * size * (wd.scale ?? 1) * wd.text.length;
		if (i > 0) x += sp * (wd.gap ?? 1);
		xs.push({ x, w: ww });
		const p = expo(prog(ms, wd.at, wd.at + recentreMs));
		const prevRight = i > 0 ? xs[i - 1].x + xs[i - 1].w : 0;
		w += (x + ww - prevRight) * (i === 0 ? p || (ms >= wd.at ? 1 : 0) : p);
		x += ww;
	}
	return { xs, width: w, full: x };
}

/** One word's entry state at ms (scene-relative): opacity, blur, dy, scale. */
export function wordIn(mode, ms, at, dur = 220) {
	const p = prog(ms, at, at + dur);
	if (ms < at) return { o: 0, blur: 0, dy: 0, sc: 1 };
	switch (mode) {
		case "cut":
			return { o: 1, blur: 0, dy: 0, sc: 1 };
		case "drop": {
			const e = expo(p);
			return { o: clamp01(p * 2.5), blur: (1 - e) * 6, dy: (1 - e) * 0.35, sc: 1 };
		}
		case "rise": {
			const e = expo(p);
			return { o: clamp01(p * 2.5), blur: (1 - e) * 8, dy: -(1 - e) * 0.3, sc: 1 };
		}
		case "ghost": {
			// arrives pale and blurred, sharpens and darkens late
			const e = smooth(p);
			return { o: 0.25 + 0.75 * e, blur: (1 - e) * 10, dy: 0, sc: 1 };
		}
		default: {
			const e = expo(p);
			return { o: clamp01(p * 2), blur: (1 - e) * 14, dy: 0, sc: 1 + (1 - e) * 0.06 };
		}
	}
}
