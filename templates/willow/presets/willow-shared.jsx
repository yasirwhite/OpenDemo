/**
 * willow-shared.jsx — the vocabulary every willow preset is built from.
 *
 * Measured off the Strawberry 1.0 launch film (90.0s, 1920x1080 @24fps,
 * full-decode frames scaled to the 1280x720 stage; stage px = ref px / 1.5):
 *
 *   GROUND   a near-white field (default [255,254,250]) under a HALFTONE grid of
 *            alternating shapes — circle, diamond, square — at a 27.07px pitch
 *            (40.6px in the 1080 master, autocorrelation peaks 41/81/122/162).
 *            Shape type cycles with (col + row) % 3: 0 circle, 1 diamond,
 *            2 square. The grid is STATIC: frame-to-frame registration across a
 *            1.7s hold finds a 0,0 shift (err 0.05/255).
 *            Shapes are ~13.5px across (20px in 1080) whatever their strength;
 *            what fades is CONTRAST, not size. The contrast field is the same
 *            in every beat sampled (0.2s, 2.0s, 29s, 58s, 77s): heavy in the
 *            top-right and bottom-left corners, a full-strength top row, fading
 *            diagonally to a clear centre. It is embedded below (MASK) as
 *            measured per cell at 58.0s, 0..9 = contrast / p97 contrast.
 *            Full-strength shapes sit ~6/255 under the ground on the cream
 *            beats ([249,246,242] on [255,254,250]) and pick up the beat's tint
 *            on the tinted ones (dreams [238,243,248] on [244,247,250], slides
 *            [248,231,227] on [252,237,232], meetings [235,248,239] on
 *            [242,253,245], testimonials [234,222,243] on [249,241,244]).
 *   TYPE     a heavy neo-grotesk (Inter Display class) in near-black with one
 *            pastel accent per beat; the wordmark is a serif. Inter is used if
 *            installed, else Segoe UI (shipped with Windows), so nothing binary.
 *
 * Every export is a pure function of t.
 */
import React from "react";
import { clamp01, easeByName, lerp } from "../../../src/lib/textcards/src/easing.js";

export const FONT = `"Inter Display", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
export const SERIF = `Georgia, "Times New Roman", serif`;
export const MONO = `"Cascadia Mono", Consolas, "Courier New", monospace`;

export const rgbs = (c, a = 1) =>
	a >= 1
		? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
		: `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, a).toFixed(4)})`;

/** Measured palette (sample, not invent; sections may override per beat). */
export const W = {
	cream: [255, 254, 250],
	creamDot: [249, 246, 242],
	ink: [20, 20, 20],
	coral: [240, 113, 93],
	white: [255, 255, 255],
};

/**
 * kf(keys, ms) — sparse keyframes on a scene-relative ms clock.
 * keys: [{ at, ...numeric channels, ease?, pow? }]. Channels omitted on a key
 * inherit the previous key's value; `ease` shapes the segment INTO that key
 * (linear default; out/quint/expo/in/inout/back as in easing.js; "hold" jumps
 * at the key). Arrays (colours) interpolate per component.
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
		const a = res[i],
			b = res[i + 1];
		if (ms >= a.at && ms < b.at) {
			if (b.ease === "hold") return a;
			const p = clamp01((ms - a.at) / Math.max(1e-6, b.at - a.at));
			const e = easeByName(b.ease ?? "linear", b.pow, (x) => x)(p);
			const o = {};
			for (const n of Object.keys(b)) {
				if (n === "at" || n === "ease" || n === "pow") continue;
				const va = a[n],
					vb = b[n];
				if (typeof va === "number" && typeof vb === "number") o[n] = lerp(va, vb, e);
				else if (Array.isArray(va) && Array.isArray(vb) && va.length === vb.length)
					o[n] = va.map((x, j) => lerp(x, vb[j], e));
				else o[n] = e < 1 ? (va ?? vb) : vb;
			}
			return o;
		}
	}
	return last;
}

/** Scene-relative ms for a scene at absolute time t (s). */
export const localMs = (cfg, t) => t * 1000 - cfg.startMs;
/** Is the scene live (startMs <= t < end)? */
export const live = (cfg, t) => t * 1000 >= cfg.startMs && t * 1000 < cfg.startMs + cfg.durationMs;

// ── ground ────────────────────────────────────────────────────────────────

/** Halftone contrast per cell (27 rows x 47 cols), measured at 58.0s. */
const MASK = [
	"34454444444346433466666467678888787888689889898",
	"34333336333344343443443446666666778878888798988",
	"22222322323333333334333434446644686878888887889",
	"21222222322333222232332333334453446676688888788",
	"11111111111111111222323223233333343463666779879",
	"11111101111111111111111122222223333344464676887",
	"00000000000000000111111211111222224333334446677",
	"00000001000000000000000001111111112323333444478",
	"00111011100110000000000000000111111112322233476",
	"00111011110000000000000000000000000000112233336",
	"00000011010000000000000000000000000000112323343",
	"10000011100000000000000000000000000000011112334",
	"20100000000000000000000000000000000000001113333",
	"11111000100000000000000000000000000000000011233",
	"21111111000000000000000000000000000000110011233",
	"23223111110000000000000000000000000000111003113",
	"43323212210000000000000000000000000000111102112",
	"43333322320000000000000000000000000000011000113",
	"66444333330000000000000000000000000000111010112",
	"74433444433333221111000000011111001111111110011",
	"77644364664633322211110000001111111111011110011",
	"88888767666644333223121100000001111111101110011",
	"87887886876644443333221111100000000101101000011",
	"88998878887766434633332222121100000000000000121",
	"98899887878888776343333222111111000000000111132",
	"88888888998877886664434332223111101211111211333",
	"88999999999977888766634434332232212111122222233",
];
const PITCH = 40.6 / 1.5; // 27.07 stage px
const ORIGIN = [7.0 / 1.5, 5.0 / 1.5];
const SHAPE = 20 / 1.5; // bounding size, stage px
const NOISE = 0.12; // cells at <=1/9 are measurement noise

// Shape list is static — built once.
const CELLS = (() => {
	const out = [];
	for (let gy = 0; gy < MASK.length; gy++) {
		for (let gx = 0; gx < MASK[gy].length; gx++) {
			const v = Number(MASK[gy][gx]) / 9;
			const a = clamp01((v - NOISE) / (1 - NOISE));
			if (a <= 0.01) continue;
			out.push({ x: ORIGIN[0] + gx * PITCH, y: ORIGIN[1] + gy * PITCH, a, type: (gx + gy) % 3 });
		}
	}
	return out;
})();

function shapePath({ x, y, type }, s) {
	const h = s / 2;
	if (type === 0)
		return `M${(x - h).toFixed(2)},${y.toFixed(2)}a${h.toFixed(2)},${h.toFixed(2)} 0 1,0 ${s.toFixed(2)},0a${h.toFixed(2)},${h.toFixed(2)} 0 1,0 ${(-s).toFixed(2)},0Z`;
	if (type === 1) {
		const d = h * 1.0;
		return `M${x.toFixed(2)},${(y - d).toFixed(2)}L${(x + d).toFixed(2)},${y.toFixed(2)}L${x.toFixed(2)},${(y + d).toFixed(2)}L${(x - d).toFixed(2)},${y.toFixed(2)}Z`;
	}
	const q = h * 0.86; // squares read the same visual weight at ~86% of the bounding size
	return `M${(x - q).toFixed(2)},${(y - q).toFixed(2)}h${(2 * q).toFixed(2)}v${(2 * q).toFixed(2)}h${(-2 * q).toFixed(2)}Z`;
}

// Bucket shapes by quantised alpha so the SVG is ~10 paths, not ~700 nodes.
const BUCKETS = (() => {
	const b = new Map();
	for (const c of CELLS) {
		const q = Math.round(c.a * 10) / 10;
		if (!b.has(q)) b.set(q, []);
		b.get(q).push(c);
	}
	return [...b.entries()].map(([a, cells]) => ({
		a,
		d: cells.map((c) => shapePath(c, SHAPE)).join(""),
	}));
})();

/**
 * <Halftone> — the measured pattern. `dot` is the colour at full strength,
 * `strength` scales every cell's contrast (0 = gone, 1 = as measured),
 * `scale`/`dx`/`dy` let a scene camera-move the ground with its content.
 */
export function Halftone({ dot = W.creamDot, base = W.cream, strength = 1, opacity = 1 }) {
	if (strength <= 0.001 || opacity <= 0.001) return null;
	return (
		<svg
			width="1280"
			height="720"
			viewBox="0 0 1280 720"
			style={{ position: "absolute", left: 0, top: 0, opacity }}
		>
			{BUCKETS.map(({ a, d }) => {
				const k = clamp01(a * strength);
				// contrast-weighted mix toward the full-strength colour
				const c = [0, 1, 2].map((i) => lerp(base[i], dot[i], k));
				return <path key={a} d={d} fill={rgbs(c)} />;
			})}
		</svg>
	);
}

/**
 * willow-ground — paints a beat's ground: flat base, the halftone, and
 * optional soft white glows (the lighter clouds the tinted beats carry).
 *
 * cfg.keys: [{ at, base:[r,g,b], dot:[r,g,b], strength, glow }] scene-relative,
 * interpolated with kf (use ease:"hold" for a hard cut, which is what most
 * ground changes in the reference are).
 * cfg.glows: [{ x, y, rx, ry, alpha, colour }] static ellipses, alpha scaled
 * by the key's `glow` channel (default 1).
 */
export function WillowGround(cfg, t) {
	if (!live(cfg, t)) return null;
	const k = kf(cfg.keys ?? [{ at: 0 }], localMs(cfg, t));
	const base = k.base ?? W.cream;
	const dot = k.dot ?? W.creamDot;
	const strength = k.strength ?? 1;
	const glowK = k.glow ?? 1;
	return (
		<div style={{ position: "absolute", inset: 0, background: rgbs(base), overflow: "hidden" }}>
			<Halftone dot={dot} base={base} strength={strength} />
			{(cfg.glows ?? []).map((g, i) => (
				<div
					key={i}
					style={{
						position: "absolute",
						left: g.x - g.rx,
						top: g.y - g.ry,
						width: g.rx * 2,
						height: g.ry * 2,
						borderRadius: "50%",
						background: `radial-gradient(closest-side, ${rgbs(g.colour ?? W.white, (g.alpha ?? 0.8) * glowK)}, ${rgbs(g.colour ?? W.white, 0)})`,
						transform: g.rot ? `rotate(${g.rot}deg)` : undefined,
					}}
				/>
			))}
		</div>
	);
}

// ── cursors ───────────────────────────────────────────────────────────────

/**
 * The macOS pointing hand the reference uses for every human click: white
 * fill, near-black outline, soft drop shadow. (x,y) is the FINGERTIP.
 * `press` 0..1 squashes it ~8% for the click.
 */
export function HandCursor({ x, y, size = 30, press = 0, opacity = 1 }) {
	const s = size / 32;
	const sq = 1 - 0.08 * clamp01(press);
	return (
		<svg
			width={size * 1.2}
			height={size * 1.2}
			viewBox="0 0 38 38"
			style={{
				position: "absolute",
				left: x - 11 * s,
				top: y - 2.5 * s,
				opacity,
				overflow: "visible",
				transform: `scale(${(s * sq).toFixed(4)})`,
				transformOrigin: `${11}px ${2.5}px`,
				filter: "drop-shadow(0px 1.5px 1.5px rgba(0,0,0,0.28))",
			}}
		>
			<path
				d="M11 2.5c1.45 0 2.45 1.05 2.45 2.45V12.3l.35-.1c1.3-.38 2.55.3 2.9 1.45l.1.3c1.2-.38 2.5.25 2.9 1.35l.1.3c1.2-.3 2.4.4 2.7 1.5.6 2.2.9 4.35.6 6.45-.32 2.3-1.3 4.2-2.6 5.9V31.6H10.6v-2.35c-1.6-1.6-3.6-4-5.4-6.7-.9-1.3-.6-2.95.6-3.75 1.1-.7 2.5-.4 3.3.6l1.5 1.9V4.95C10.6 3.55 9.6 2.5 11 2.5Z"
				fill="#fff"
				stroke="#111"
				strokeWidth="1.7"
				strokeLinejoin="round"
			/>
			<path
				d="M13.5 12.4v6.2M16.9 14.1v5M20 15.7v4.1"
				stroke="#111"
				strokeWidth="1.3"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/**
 * The agent cursor: a filled arrow (rounded, white rim) with an optional name
 * tag hanging off its tail — the reference colours each agent/role.
 * (x,y) is the TIP.
 */
export function AgentCursor({
	x,
	y,
	size = 26,
	colour = [120, 132, 196],
	label = null,
	labelColour = null,
	opacity = 1,
	rot = 0,
}) {
	const s = size / 26;
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				opacity,
				transform: `rotate(${rot}deg)`,
				transformOrigin: "0 0",
			}}
		>
			<svg
				width={size * 1.3}
				height={size * 1.3}
				viewBox="0 0 34 34"
				style={{
					position: "absolute",
					left: -3 * s,
					top: -3 * s,
					overflow: "visible",
					transform: `scale(${s.toFixed(4)})`,
					transformOrigin: "3px 3px",
					filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.22))",
				}}
			>
				<path
					d="M3 3 L27 11.5 L16.5 15.5 L12.5 26 Z"
					fill={rgbs(colour)}
					stroke="#fff"
					strokeWidth="2.6"
					strokeLinejoin="round"
				/>
			</svg>
			{label ? (
				<div
					style={{
						position: "absolute",
						left: -10 * s,
						top: 22 * s,
						padding: `${3 * s}px ${8 * s}px`,
						borderRadius: 6 * s,
						background: rgbs(labelColour ?? colour),
						color: "#fff",
						font: `500 ${13 * s}px ${FONT}`,
						whiteSpace: "nowrap",
						boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
					}}
				>
					{label}
				</div>
			) : null}
		</div>
	);
}

// ── avatars ───────────────────────────────────────────────────────────────

/** Neutral initials avatar — the stand-in for every person/character photo. */
export function Avatar({
	x,
	y,
	d = 40,
	c1 = [196, 181, 253],
	c2 = [129, 140, 248],
	initials = "",
	ring = null,
	opacity = 1,
}) {
	return (
		<div
			style={{
				position: "absolute",
				left: x - d / 2,
				top: y - d / 2,
				width: d,
				height: d,
				borderRadius: "50%",
				background: `linear-gradient(140deg, ${rgbs(c1)}, ${rgbs(c2)})`,
				opacity,
				boxShadow: ring ? `0 0 0 ${ring.w ?? 3}px ${rgbs(ring.colour ?? W.white)}` : undefined,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				color: "#fff",
				font: `600 ${(d * 0.38).toFixed(1)}px ${FONT}`,
				letterSpacing: "-0.01em",
			}}
		>
			{initials}
		</div>
	);
}

/** Soft card shadow used on every floating white card in the reference. */
export const CARD_SHADOW = "0 10px 30px rgba(30,30,60,0.08), 0 2px 6px rgba(30,30,60,0.05)";
