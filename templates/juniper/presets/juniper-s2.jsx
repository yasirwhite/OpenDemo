/**
 * juniper-s2.jsx — section 2 presets (3.933 – 7.8 s, film frames f118–f233).
 *
 * The "tier switch" beat: a grey toggle pill is clicked on, the knob slides
 * and warms, the pill dissolves into a warm bloom that births a glowing
 * "Max", the bloom drains and "Max" settles into the tier gradient; then six
 * word flashes, the last of which ("for [glyph]") zooms down into the device
 * side label while the device word rolls up and the phone whips in.
 *
 * All numbers were measured on the full-decode 30 fps frames (stage px =
 * reference px / 1.5; frame n = n/30 s). Tables keyed by "local frames" are
 * frames since the scene's own start (scene startMs sits on a film frame), so
 * a table entry [6, x] in a scene that starts on f164 is film frame f170.
 *
 * Every render is a pure function of t.
 */
import React from "react";
import {
	ArrowCursor,
	FONT,
	GradientText,
	JuniperMark,
	live,
	localMs,
	PhoneFrame,
	PlatformGlyph,
	Q,
	rgbs,
	ScreenSlot,
} from "./juniper-shared.jsx";

// ── helpers ───────────────────────────────────────────────────────────────

const FMS = 1000 / 30;
/** Frames since the scene started (float). */
const lframe = (cfg, t) => localMs(cfg, t) / FMS;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const mix = (a, b, p) => a + (b - a) * p;
const mixC = (a, b, p) => a.map((v, i) => v + (b[i] - v) * p);

/** Piecewise-linear lookup in a measured [[frame, value], ...] table (clamped). */
function lut(table, f) {
	if (f <= table[0][0]) return table[0][1];
	for (let i = 0; i < table.length - 1; i++) {
		const [f0, v0] = table[i];
		const [f1, v1] = table[i + 1];
		if (f < f1) return mix(v0, v1, (f - f0) / (f1 - f0));
	}
	return table[table.length - 1][1];
}
/** Per-frame speed of a table value around f (units / frame). */
const speed = (table, f) => Math.abs(lut(table, f + 0.5) - lut(table, f - 0.5));

/**
 * Font metrics and run widths. Canvas is the only way to measure text, but the
 * answer depends solely on (text, size, weight, tracking), so this stays a pure
 * function of t and is cached. Fallbacks are Segoe UI's own ratios.
 */
let _ctx = null;
const _mc = new Map();
function ctx2d() {
	try {
		_ctx = _ctx ?? document.createElement("canvas").getContext("2d");
	} catch {
		_ctx = null;
	}
	return _ctx;
}
function metrics(size, weight = 600) {
	const key = `${size}|${weight}`;
	const hit = _mc.get(key);
	if (hit) return hit;
	let m = { fA: size * 1.079, fD: size * 0.251, cap: size * 0.7, xh: size * 0.5 };
	const c = ctx2d();
	if (c) {
		c.font = `${weight} ${size}px ${FONT}`;
		const H = c.measureText("H");
		const x = c.measureText("x");
		if (H.fontBoundingBoxAscent > 0 && H.actualBoundingBoxAscent > 0)
			m = {
				fA: H.fontBoundingBoxAscent,
				fD: H.fontBoundingBoxDescent,
				cap: H.actualBoundingBoxAscent,
				xh: x.actualBoundingBoxAscent,
			};
	}
	_mc.set(key, m);
	return m;
}
/** Baseline offset from the top of a lineHeight:1 box. */
const baseIn = (size, weight) => {
	const m = metrics(size, weight);
	return size / 2 + (m.fA - m.fD) / 2;
};
const _wc = new Map();
function textW(text, size, weight = 600, trackEm = 0) {
	const key = `${text}|${size}|${weight}|${trackEm}`;
	const hit = _wc.get(key);
	if (hit != null) return hit;
	let w = size * 0.55 * [...text].length;
	const c = ctx2d();
	if (c) {
		c.font = `${weight} ${size}px ${FONT}`;
		const mw = c.measureText(text).width;
		if (mw > 0) w = mw;
	}
	w += trackEm * size * [...text].length;
	_wc.set(key, w);
	return w;
}

/**
 * How far to move a translateX(-50%) text box so its INK (not its advance) is
 * centred: Segoe's side bearings differ per word ("Max" sat 8 px right).
 */
function inkShift(text, size, weight = 600, trackEm = 0) {
	const c = ctx2d();
	if (!c) return 0;
	c.font = `${weight} ${size}px ${FONT}`;
	const m = c.measureText(text);
	const n = [...text].length;
	const ls = trackEm * size;
	const boxW = m.width + n * ls;
	const inkC = (-m.actualBoundingBoxLeft + m.actualBoundingBoxRight + (n - 1) * ls) / 2;
	return Number.isFinite(inkC) ? boxW / 2 - inkC : 0;
}

/**
 * Directional (motion) blur: an SVG gaussian with separate x / y deviations,
 * applied to a full-frame, untransformed wrapper so the deviations are in
 * screen px. Off below half a pixel.
 */
function Smear({ id, sx = 0, sy = 0, style = null, children }) {
	const on = sx > 0.5 || sy > 0.5;
	return (
		<>
			{on ? (
				<svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
					<defs>
						<filter
							id={id}
							x="-50%"
							y="-50%"
							width="200%"
							height="200%"
							colorInterpolationFilters="sRGB"
						>
							<feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} />
						</filter>
					</defs>
				</svg>
			) : null}
			<div
				style={{
					position: "absolute",
					inset: 0,
					...(style ?? {}),
					filter: on ? `url(#${id})` : "none",
				}}
			>
				{children}
			</div>
		</>
	);
}

/** A single line of text whose BASELINE sits at y, left edge (or centre) at x. */
function Line({
	x,
	y,
	text,
	size,
	weight = 600,
	colour = Q.ink,
	track = -0.015,
	centre = false,
	style = null,
}) {
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y - baseIn(size, weight),
				font: `${weight} ${size}px ${FONT}`,
				lineHeight: 1,
				letterSpacing: `${track}em`,
				whiteSpace: "nowrap",
				color: rgbs(colour),
				transform: centre ? "translateX(-50%)" : "none",
				...(style ?? {}),
			}}
		>
			{text}
		</div>
	);
}

// ── 1. toggle pill (f118–f168) ────────────────────────────────────────────

// Camera settle after the hard cut: the pill group grows 0.930 -> 1.000 about
// the frame centre, expo-out (residual x0.75 per frame), measured on the pill
// body width 502 -> 540 px over f118-f128.
const PILL_ZOOM_IN = [
	[0, 0.9296],
	[1, 0.948],
	[2, 0.963],
	[3, 0.97],
	[4, 0.978],
	[5, 0.985],
	[6, 0.989],
	[7, 0.9926],
	[8, 0.996],
	[9, 0.998],
	[10, 1],
];
// Exit f165-f168: grows with ACCELERATING scale (1.033, 1.126, 1.28, 1.485,
// measured body width), fades (0.94, 0.68, 0.28, 0) and defocuses.
const PILL_ZOOM_OUT = [
	[46, 1],
	[47, 1.033],
	[48, 1.126],
	[49, 1.28],
	[50, 1.485],
	[51, 1.74],
];
const PILL_FADE = [
	[47, 1],
	[48, 0.94],
	[49, 0.68],
	[50, 0.28],
	[51, 0],
];
const PILL_BLUR = [
	[46.5, 0],
	[47, 0.4],
	[48, 1.2],
	[49, 2.5],
	[50, 4.5],
];
// Cursor tip (screen px). f116/f117 are s1's streak frames (kept so the
// shutter samples at f118 trail correctly); f118-f130 measured, expo-out,
// x settles before y; rests on the knob from f130.
const CURSOR_X = [
	[-2, 870],
	[-1, 792],
	[0, 688],
	[1, 612],
	[2, 560],
	[3, 526],
	[4, 502],
	[5, 483],
	[6, 472],
	[7, 464],
	[8, 458],
	[9, 455],
	[10, 453],
	[11, 452],
	[12, 451],
];
const CURSOR_Y = [
	[-2, 680],
	[-1, 642],
	[0, 578],
	[1, 528],
	[2, 487],
	[3, 455],
	[4, 428],
	[5, 408],
	[6, 390],
	[7, 376],
	[8, 365],
	[9, 358],
	[10, 351],
	[11, 345],
	[12, 340],
];
// press on f130 (glyph shrinks), then the cursor fades out f132-f137 while
// the knob starts to move (measured on the arrow's white fill).
const CURSOR_PRESS = [
	[11.4, 0],
	[12, 1],
];
const CURSOR_FADE = [
	// the streaking arrow reads half-transparent on its first frames after the cut
	[0, 0.4],
	[1, 0.55],
	[2, 0.8],
	[3, 1],
	[13, 1],
	[14, 0.8],
	[15, 0.6],
	[16, 0.45],
	[17, 0.3],
	[18, 0.18],
	[19, 0.06],
	[20, 0],
];
// Knob travel as a fraction of (pill width - 176): measured knob centre x
// 461 -> 824 px (f135 -> f148) on a 540 px pill. EASE-IN (per-frame steps
// 12, 9.5, 12.5, 15, 16.5, 19, 24.5, 28, 34, 40, 49.5, 61) into a hard stop at
// f148, a 14 px overshoot to f153 and a slow 8.5 px settle back to f164.
const KNOB = [
	[17, 0],
	[18, 12],
	[19, 21.5],
	[20, 34],
	[21, 49],
	[22, 65.5],
	[23, 84.5],
	[24, 109],
	[25, 137],
	[26, 171],
	[27, 211],
	[28, 260.5],
	[29, 321.5],
	[30, 363],
	[31, 368.5],
	[32, 372],
	[33, 374.5],
	[34, 376.5],
	[35, 377],
	[38, 377],
	[40, 375.5],
	[42, 373.5],
	[44, 371],
	[46, 368.5],
].map(([f, v]) => [f, v / 363]);
// The warm knob cross-fades over the dark one f136-f142.
const KNOB_WARM = [
	[18, 0],
	[19, 0.1],
	[20, 0.3],
	[21, 0.5],
	[22, 0.7],
	[23, 0.9],
	[24, 1],
];
// The label slides from its off slot (right of the knob) to its on slot (left
// of the knob) with the knob, lagging and settling later (measured "R" left
// edge 572 -> 435 px, f136 -> f155).
const TEXT_SLIDE = [
	[17, 0],
	[18, 0.02],
	[22, 0.17],
	[26, 0.45],
	[27, 0.56],
	[28, 0.69],
	[29, 0.83],
	[30, 0.94],
	[31, 0.96],
	[32, 0.975],
	[34, 0.99],
	[37, 1],
];

function TogglePill(cfg, t) {
	if (!live(cfg, t)) return null;
	const f = lframe(cfg, t);
	const text = cfg.text ?? "Juniper Max";
	const fs = cfg.textSize ?? 63; // cap 44 px (332-376) / Segoe cap 0.70
	const cx = cfg.cx ?? 639.5;
	const cy = cfg.cy ?? 359.5;
	const H = cfg.height ?? 180; // measured y270-449
	const tw = textW(text, fs, 600, -0.01);
	// measured: 540 px pill around a 263 px label -> label + 277
	const W = Math.max(cfg.minWidth ?? 0, tw + 277);
	const L = cx - W / 2;
	const T = cy - H / 2;
	const KD = 144; // knob diameter (x389-533)
	const kInsetL = 19; // off knob inset from the pill's left end
	const k = lut(KNOB, f);
	const kx = L + 91 + k * (W - 176); // knob centre
	const ky = cy - 1;
	const on = clamp01(k); // pill + text colour follow the knob
	const warm = lut(KNOB_WARM, f);
	const tp = lut(TEXT_SLIDE, f);
	const txOff = L + kInsetL + KD + 39;
	const txOn = L + 67;
	const tx = mix(txOff, txOn, tp);
	const baseY = cfg.baseline ?? 376;
	const zoom = f < 30 ? lut(PILL_ZOOM_IN, f) : lut(PILL_ZOOM_OUT, f);
	const fade = lut(PILL_FADE, f);
	const blur = lut(PILL_BLUR, f);
	const pillC = mixC(Q.pillOff, Q.pillOn, on);
	const kv = speed(KNOB, f) * (W - 176); // knob px / frame
	const tv = speed(TEXT_SLIDE, f) * (txOff - txOn); // label px / frame
	const glyphOff = [133, 135, 132];
	const glyphOn = [136, 72, 26];
	// cursor: 8 shutter samples over the last half frame, composited 1, 1/2,
	// 1/3 ... so they AVERAGE (the reference's ghosted streak at f118-f121).
	const N = 8;
	const cur = [];
	for (let i = 0; i < N; i++) {
		const fi = f - (0.5 * i) / (N - 1);
		cur.push(
			<div key={i} style={{ position: "absolute", inset: 0, opacity: 1 / (i + 1) }}>
				<ArrowCursor
					x={lut(CURSOR_X, fi)}
					y={lut(CURSOR_Y, fi)}
					size={cfg.cursorSize ?? 64}
					press={lut(CURSOR_PRESS, f)}
				/>
			</div>,
		);
	}
	const label = (colour) => (
		<Line x={tx} y={baseY} text={text} size={fs} track={-0.01} colour={colour} />
	);
	const uid = cfg.id ?? "s2-pill";
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				transformOrigin: `${cx}px ${cy}px`,
				transform: `scale(${zoom.toFixed(5)})`,
				opacity: fade,
				filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none",
			}}
		>
			{/* pill body: flat fill, soft inner shadow on the upper edge */}
			<div
				style={{
					position: "absolute",
					left: L,
					top: T,
					width: W,
					height: H,
					borderRadius: H / 2,
					background: rgbs(pillC),
					boxShadow: "inset 0 5px 9px rgba(0,0,0,0.15), inset 2px 0 4px rgba(0,0,0,0.06)",
				}}
			/>
			{/* label: one run sliding left; cream where the knob has passed, grey ahead of it */}
			<Smear id={`${uid}-tx`} sx={tv * 0.15}>
				<div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${1280 - kx}px 0 0)` }}>
					{label(Q.pillOnText)}
				</div>
				<div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${kx}px)` }}>
					{label(Q.pillOffText)}
				</div>
			</Smear>
			{/* knob: dark -> warm gradient cross-fade, horizontal smear while it flies */}
			<Smear id={`${uid}-kn`} sx={kv * 0.18}>
				<div
					style={{
						position: "absolute",
						left: kx - KD / 2,
						top: ky - KD / 2,
						width: KD,
						height: KD,
						borderRadius: KD / 2,
						background: rgbs(Q.pillOffKnob),
						boxShadow: `${(2 * warm).toFixed(2)}px ${(4 * warm).toFixed(2)}px ${(7 * warm).toFixed(2)}px rgba(60,40,20,${(0.35 * warm).toFixed(3)})`,
					}}
				>
					<div
						style={{
							position: "absolute",
							inset: 0,
							borderRadius: KD / 2,
							opacity: warm,
							background: `linear-gradient(90deg, ${rgbs(Q.knobA)}, ${rgbs(Q.knobB)})`,
						}}
					/>
					<div
						style={{
							position: "absolute",
							inset: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<JuniperMark
							size={KD * 0.4}
							colour={mixC(glyphOff, glyphOn, warm)}
							cut={mixC(Q.pillOffKnob, mixC(Q.knobA, Q.knobB, 0.5), warm)}
						/>
					</div>
				</div>
			</Smear>
			<div style={{ position: "absolute", inset: 0, opacity: lut(CURSOR_FADE, f) }}>{cur}</div>
		</div>
	);
}

// ── 2. warm bloom (f164–f181) ─────────────────────────────────────────────

// Peak field (f172), least-squares fit to a 128x72 grid of the frame (rms 2.8
// /255): a 130.7deg peach -> coral ramp under an elliptical pink-white edge.
const BLOOM_RAMP = [
	[[255, 248, 223], 0],
	[[248, 198, 149], 34.7],
	[[247, 189, 146], 44],
	[[241, 156, 131], 78.2],
	[[238, 138, 112], 100],
];
const BLOOM_EDGE = {
	colour: [253, 237, 245],
	cx: 606,
	cy: 345,
	rx: 759,
	ry: 598,
	r0: 67.2,
	r1: 127.3,
};
// Field opacity per frame, fitted on the whole frame against the peak field
// (f164 .. f181): rises 7 frames, peaks f172, drains 9 frames.
const BLOOM_A = [
	[0, 0],
	[1, 0.01],
	[2, 0.072],
	[3, 0.155],
	[4, 0.277],
	[5, 0.425],
	[6, 0.621],
	[7, 0.948],
	[8, 1],
	[9, 0.721],
	[10, 0.542],
	[11, 0.403],
	[12, 0.29],
	[13, 0.196],
	[14, 0.117],
	[15, 0.057],
	[16, 0.016],
	[17, 0],
];

function WarmBloom(cfg, t) {
	if (!live(cfg, t)) return null;
	const a = lut(cfg.curve ?? BLOOM_A, lframe(cfg, t)) * (cfg.strength ?? 1);
	if (a <= 0.001) return null;
	const ramp = (cfg.ramp ?? BLOOM_RAMP).map(([c, p]) => `${rgbs(c)} ${p}%`).join(", ");
	const e = cfg.edge ?? BLOOM_EDGE;
	const es = [0, 0.25, 0.5, 0.75, 1]
		.map(
			(u) =>
				`${rgbs(e.colour, Math.max(0.0001, u * u * (3 - 2 * u)))} ${(e.r0 + u * (e.r1 - e.r0)).toFixed(2)}%`,
		)
		.join(", ");
	// Partial opacities read pinker than a scaled peak (fit residual G -4.8,
	// B +2.2 at a = 0.6): a flat pink veil peaking mid-rise / mid-drain.
	const pink = cfg.pink ?? [246, 195, 215];
	const pv = 0.75 * a * (1 - a);
	return (
		<>
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: a,
					background: `radial-gradient(ellipse ${e.rx}px ${e.ry}px at ${e.cx}px ${e.cy}px, ${es}), linear-gradient(${cfg.angle ?? 130.7}deg, ${ramp})`,
				}}
			/>
			{pv > 0.002 ? (
				<div
					style={{
						position: "absolute",
						inset: 0,
						opacity: pv,
						background: `linear-gradient(100deg, ${rgbs(pink, 0)} 5%, ${rgbs(pink)} 60%)`,
					}}
				/>
			) : null}
		</>
	);
}

// ── 3. the glowing tier word (f168–f181) ──────────────────────────────────

// Scale vs. the settled word (390 px wide, cap 283-436): 0.54 (f169), 0.68,
// 0.87, 1.0 (f172) — grows out of the dissolving pill, then a slow drift-back.
const MAX_SCALE = [
	[0, 0.42],
	[1, 0.541],
	[2, 0.677],
	[3, 0.874],
	[4, 0.985],
	[5, 0.995],
	[7, 0.995],
	[13, 0.988],
];
const MAX_DY = [
	[1, -4],
	[2, -3],
	[3, -1.5],
	[4, 0],
];
const MAX_WHITE = [
	[0, 0],
	[0.6, 1],
	[4, 1],
	[5, 0.85],
	[6, 0.4],
	[7, 0.1],
	[8, 0],
];
const MAX_GLOW = [
	[0.5, 0.6],
	[1, 0.7],
	[2, 0.8],
	[3, 1],
	[4, 1],
	[5, 0.7],
	[6, 0.35],
	[7, 0.1],
	[8, 0],
];
// gradient fill opacity (B channel on the M's top-left, raised ~0.1 after a
// visual pass at f175) and its clearing blur
const MAX_GRAD = [
	[5, 0],
	[6, 0.2],
	[7, 0.45],
	[8, 0.68],
	[9, 0.84],
	[10, 0.93],
	[11, 0.97],
	[12, 0.99],
	[13, 1],
];
const MAX_GBLUR = [
	[6, 4],
	[7, 2.5],
	[8, 1.2],
	[9, 0.5],
	[10, 0],
];

function MaxWord(cfg, t) {
	if (!live(cfg, t)) return null;
	const f = lframe(cfg, t);
	const text = cfg.text ?? "Max";
	const size = cfg.size ?? 216; // cap 153 px; Segoe runs wider, so width-matched
	const cx = cfg.cx ?? 639.5;
	const capMid = cfg.capMid ?? 359.5;
	const m = metrics(size, 600);
	const base = capMid + m.cap / 2;
	const s = lut(MAX_SCALE, f);
	const dy = lut(MAX_DY, f);
	const wo = lut(MAX_WHITE, f);
	const g = lut(MAX_GLOW, f);
	const go = lut(MAX_GRAD, f);
	const gb = lut(MAX_GBLUR, f);
	const top = base - baseIn(size, 600);
	const left = cx + inkShift(text, size, 600, -0.015);
	const box = (children, style, key = undefined) => (
		<div
			key={key}
			style={{
				position: "absolute",
				left,
				top,
				font: `600 ${size}px ${FONT}`,
				lineHeight: 1,
				letterSpacing: "-0.015em",
				whiteSpace: "nowrap",
				transform: "translateX(-50%)",
				...style,
			}}
		>
			{children}
		</div>
	);
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				transformOrigin: `${cx}px ${capMid}px`,
				transform: `translateY(${dy}px) scale(${s.toFixed(5)})`,
			}}
		>
			{go > 0.001
				? box(<GradientText>{text}</GradientText>, {
						opacity: go,
						filter: gb > 0.05 ? `blur(${gb.toFixed(2)}px)` : "none",
					})
				: null}
			{wo > 0.001 && g > 0.01
				? [22, 22, 40].map((r, i) =>
						box(
							text,
							{
								color: "rgb(255,252,248)",
								opacity: wo * g,
								filter: `blur(${(r * (0.7 + 0.3 * g)).toFixed(1)}px)`,
							},
							`halo${i}`,
						),
					)
				: null}
			{wo > 0.001
				? box(text, {
						color: "#fff",
						opacity: wo,
						// a broad white halo, near-opaque at the letters, ~60 px reach at the peak
						textShadow: [
							[4, 1],
							[12, 0.95],
							[24, 0.9],
							[45, 0.8],
							[80, 0.6],
						]
							.map(
								([r, al]) =>
									`0 0 ${(r * (0.6 + 0.4 * g)).toFixed(1)}px rgba(255,252,248,${(al * g).toFixed(3)})`,
							)
							.join(", "),
					})
				: null}
		</div>
	);
}

// ── 4. word flashes (f182–f210) ───────────────────────────────────────────

/**
 * Words replacing each other on hard cuts, centred, x-height centred on the
 * frame's middle, under one slow continuous zoom-out (0.25 % per frame,
 * measured: "can" 332 -> 326 px over f182-f188, and the same rate carries on
 * through "make", "beautiful", "real", "apps" into "for" at f211).
 */
function WordFlash(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const words = cfg.words ?? [];
	let w = null;
	for (const it of words) if (ms >= it.atMs) w = it;
	if (!w) return null;
	const f = ms / FMS;
	const size = cfg.size ?? 225;
	const cx = cfg.cx ?? 640;
	const xMid = cfg.xMid ?? 359.5;
	const z = 1 - (cfg.shrinkPerFrame ?? 0.0025) * f;
	const m = metrics(size, 600);
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				transformOrigin: `${cx}px ${xMid}px`,
				transform: `scale(${z.toFixed(5)})`,
			}}
		>
			<Line x={cx} y={xMid + m.xh / 2} text={w.text} size={size} centre />
		</div>
	);
}

// ── 5. "for [glyph] Device" assembly (f211–f233) ──────────────────────────

// Label scale vs. its settled size (measured on "for" width 244 -> 80 px and
// the glyph 123 -> 40 px, which agree frame by frame): the flash-word drift
// (f211-f214), then an S-curve f214 -> f232, fastest at f222-f223.
const LABEL_S = [
	[0, 3.07],
	[1, 3.063],
	[2, 3.056],
	[3, 3.05],
	[4, 3.01],
	[5, 2.99],
	[6, 2.95],
	[7, 2.89],
	[8, 2.81],
	[9, 2.7],
	[10, 2.5],
	[11, 2.19],
	[12, 1.8],
	[13, 1.51],
	[14, 1.34],
	[15, 1.21],
	[16, 1.14],
	[17, 1.087],
	[18, 1.05],
	[19, 1.025],
	[20, 1.0125],
	[21, 1],
];
// Device word rolls up inside its clip window (settled px, downward offset of
// the word): hidden until f219, first sliver f220-f221, fastest f222-f224,
// settled f230. Window = baseline - 0.73em - 16 .. baseline + 17 (the
// measured flat bottom cut, shared with s3's label).
const ROLL = [
	[8, 80],
	[9, 64],
	[10, 54],
	[11, 44],
	[12, 30],
	[13, 18],
	[14, 12],
	[15, 7.5],
	[16, 4],
	[17, 2],
	[18, 0.8],
	[19, 0],
];
// Sub-label fades in f222 -> f228 (measured darkest-pixel 229 -> 18 -> ink).
const SUB_IN = [
	[11, 0],
	[12, 0.1],
	[13, 0.29],
	[14, 0.49],
	[15, 0.69],
	[16, 0.93],
	[17, 1],
];
// Segoe UI: with line-height = font size the baseline sits 0.914 em below the
// line-box top (same calibration as s3's side label).
const BASE_EM = 0.914;

/**
 * The settled layout is s3's side label (`juniper-side-label`) reproduced
 * formula for formula, so the hand-over at 7800 ms is pixel-identical: the
 * device word's box is right-anchored at `right + rsb`, the glyph sits
 * `gapWord` left of it (bottom on the baseline), the lead word `gapLead` left
 * of the glyph; the sub-label is centred on `subCx` (or on the line with
 * subAlign "line") with its baseline on `subBaseline`.
 */
function LabelAssemble(cfg, t) {
	if (!live(cfg, t)) return null;
	const f = lframe(cfg, t);
	const lead = cfg.lead ?? "for";
	const device = cfg.device ?? "Phone";
	const sub = cfg.sub ?? "";
	const size = cfg.size ?? 67;
	const subSize = cfg.subSize ?? 25;
	const right = cfg.right ?? 620;
	const baseline = cfg.baseline ?? 384;
	const subBaseline = cfg.subBaseline ?? 315.5;
	const rsb = cfg.rsb ?? 2;
	const gapWord = cfg.gapWord ?? 0.235 * size;
	const gapLead = cfg.gapLead ?? 0.25 * size;
	const ls = -0.015 * size;
	const mainFont = `600 ${size}px ${FONT}`;
	const devW = textW(device, size, 600, -0.015);
	const leadW = textW(lead, size, 600, -0.015);
	const slotRight = right + rsb;
	const slotLeft = slotRight - devW;
	const glyphW = size * 0.58;
	const glyphRight = slotLeft - gapWord;
	const leadRight = glyphRight - glyphW - gapLead;
	const leadLeft = leadRight - leadW;
	const lineTop = baseline - BASE_EM * size;
	const clipTop = baseline - 0.73 * size - 16;
	const clipBot = baseline + 17;
	const subCx = cfg.subAlign === "line" ? (leadLeft + slotRight) / 2 : (cfg.subCx ?? 442.5);
	const subTop = subBaseline - BASE_EM * subSize;
	// zoom-down: the "for [glyph]" pair's centre travels from `from` to its
	// settled spot on the same eased progress as the scale
	const [fromX, fromY] = cfg.from ?? [640, 340];
	const S0 = 3.05;
	const prog = (ff) => clamp01((S0 - lut(LABEL_S, ff)) / (S0 - 1));
	const S = lut(LABEL_S, f);
	const p = prog(f);
	const ax = (leadLeft + glyphRight) / 2;
	const ay = baseline - metrics(size, 600).cap / 2;
	const qx = mix(fromX, ax, p);
	const qy = mix(fromY, ay, p);
	// horizontal smear from the screen speed of the lead word's left edge; the
	// device word gets extra smear from its own (faster) right end — the
	// reference smears "iPhone" hardest at f223-f225 while "for" stays legible
	const xAt = (ff, x) => mix(fromX, ax, prog(ff)) + lut(LABEL_S, ff) * (x - ax);
	const vx = Math.abs(xAt(f + 0.5, leadLeft) - xAt(f - 0.5, leadLeft));
	const vDev = Math.abs(xAt(f + 0.5, slotRight) - xAt(f - 0.5, slotRight));
	const devSx = Math.max(0, vDev - vx) * 0.1;
	const roll = lut(ROLL, f);
	const rollBlur = speed(ROLL, f) * 0.18;
	const subOp = lut(SUB_IN, f);
	const uid = cfg.id ?? "s2-label";
	const ink = cfg.colour ?? Q.ink;
	const subMid = subBaseline - 0.24 * subSize;
	return (
		<Smear id={`${uid}-mb`} sx={vx * 0.13}>
			{/* the sub-label scales and travels in x with the block, but holds its own
			    settled height (measured: ink centre ~y310 from f223 on, overlapping
			    the still-large "for" while it fades in) */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					transformOrigin: "0 0",
					transform: `translate(${(qx - S * ax).toFixed(2)}px, ${(subMid * (1 - S)).toFixed(2)}px) scale(${S.toFixed(5)})`,
				}}
			>
				{subOp > 0.001 ? (
					<div
						style={{
							position: "absolute",
							left: subCx - 600,
							width: 1200,
							top: subTop,
							textAlign: "center",
							font: `400 ${subSize}px ${FONT}`,
							lineHeight: `${subSize}px`,
							letterSpacing: "-0.005em",
							whiteSpace: "nowrap",
							color: rgbs(ink),
							opacity: subOp,
						}}
					>
						{sub}
					</div>
				) : null}
			</div>
			<div
				style={{
					position: "absolute",
					inset: 0,
					transformOrigin: "0 0",
					transform: `translate(${(qx - S * ax).toFixed(2)}px, ${(qy - S * ay).toFixed(2)}px) scale(${S.toFixed(5)})`,
				}}
			>
				<div
					style={{
						position: "absolute",
						right: 1280 - leadRight,
						top: lineTop,
						font: mainFont,
						lineHeight: `${size}px`,
						letterSpacing: `${ls}px`,
						whiteSpace: "nowrap",
						color: rgbs(ink),
					}}
				>
					{lead}
				</div>
				{cfg.glyph === false ? null : (
					<div
						style={{
							position: "absolute",
							left: glyphRight - glyphW,
							top: baseline - size * 0.66,
							lineHeight: 0,
						}}
					>
						<PlatformGlyph size={size} colour={ink} />
					</div>
				)}
				<div
					style={{
						position: "absolute",
						left: slotLeft,
						top: clipTop,
						width: devW + 40,
						height: clipBot - clipTop,
						overflow: "hidden",
					}}
				>
					<Smear id={`${uid}-roll`} sx={devSx / Math.max(1, S)} sy={rollBlur}>
						<div
							style={{
								position: "absolute",
								left: 0,
								top: lineTop - clipTop + roll,
								font: mainFont,
								lineHeight: `${size}px`,
								letterSpacing: `${ls}px`,
								whiteSpace: "nowrap",
								color: rgbs(ink),
							}}
						>
							{device}
						</div>
					</Smear>
				</div>
			</div>
		</Smear>
	);
}

// ── 6. phone whip-in (f223–f233) ──────────────────────────────────────────

/**
 * The phone flies in from the right and lands on its comp slot along the
 * measured WHIP_DX curve (expo-out), scale 1 + 0.209 x (offset / 616)
 * (measured height 712, 695, 684, 677, 673 at f227-f231), landing on f234.
 * Horizontal smear tracks the speed (std 0.14 x px/frame).
 */
// The landed phone must be pixel-identical to s3's phone comp, which samples a
// copper rim ([196,112,75] -> [247,166,121] -> highlight [255,200,165] -> dark
// brown lip -> bezel, f240/f300/f450) instead of the shared default, with no
// drop shadow. Same values as juniper-s3.jsx (kept local: sections do not
// import each other).
const PHONE_RIM = { rim: [206, 124, 84], hi: [236, 160, 116], lo: [186, 108, 72] };

function RimProfile({ w }) {
	const R = w * 0.168;
	const ring = (inset, width, colour) => (
		<div
			style={{
				position: "absolute",
				inset,
				borderRadius: R - inset,
				border: `${width}px solid ${colour}`,
				pointerEvents: "none",
			}}
		/>
	);
	return (
		<>
			{ring(2.6, 2, "rgba(255,204,166,0.95)")}
			{ring(4.8, 2.2, "rgba(96,64,48,0.95)")}
		</>
	);
}

// Whip offset (px right of the landed slot) by local frame, scene starting on
// f223 and landing on f234: the phone's first sliver is at the right edge on
// f224, then centre offsets 403, 272.5, 177.5, 112.5, 68.5, 38.5, 18.5, 6.5, 1
// (f225-f233): ~x0.65 per frame (expo-out), braking harder in the last frames.
const WHIP_DX = [
	[0, 900],
	[1, 629],
	[2, 403],
	[3, 272.5],
	[4, 177.5],
	[5, 112.5],
	[6, 68.5],
	[7, 38.5],
	[8, 18.5],
	[9, 6.5],
	[10, 1],
	[11, 0],
];

function PhoneWhip(cfg, t) {
	if (!live(cfg, t)) return null;
	const f = lframe(cfg, t);
	// frames before landing (0 = landed); the measured curve is keyed on it
	const before = (cfg.landFrame ?? 11) - f;
	const lt = (b) => lut(WHIP_DX, 11 - b) * ((cfg.fromDx ?? 616) / 616);
	const w = cfg.width ?? 326;
	const left = cfg.left ?? 659;
	const top = cfg.top ?? 25;
	const dx = lt(before);
	const s = 1 + ((cfg.fromScale ?? 1.209) - 1) * Math.min(1.05, dx / (cfg.fromDx ?? 616));
	const v = Math.abs(lt(before + 0.5) - lt(before - 0.5));
	const uid = cfg.id ?? "s2-phone";
	const rim = cfg.rim ?? PHONE_RIM;
	return (
		<Smear id={`${uid}-mb`} sx={v * 0.14}>
			<div
				style={{
					position: "absolute",
					left,
					top,
					transformOrigin: "50% 50%",
					transform: `translateX(${dx.toFixed(2)}px) scale(${s.toFixed(5)})`,
				}}
			>
				<PhoneFrame
					width={w}
					shadow={cfg.shadow ?? false}
					rim={rim.rim}
					rimHi={rim.hi}
					rimLo={rim.lo}
				>
					<ScreenSlot label={cfg.slotLabel ?? "product UI"} face={cfg.face ?? null} />
				</PhoneFrame>
				{cfg.rimProfile === false ? null : <RimProfile w={w} />}
			</div>
		</Smear>
	);
}

// ── registry ──────────────────────────────────────────────────────────────

export const S2_PRESETS = {
	"juniper-toggle-pill": {
		note: "the tier switch: a grey pill (knob + label) settles after a hard cut, an arrow cursor streaks in and clicks the knob, the knob flies right (ease-in, hard stop, overshoot) and warms, the pill and label warm with it (label slides left, cream behind the knob, grey ahead), hold, then the pill grows, defocuses and dissolves. All timing is measured; text-only params.",
		nativeMs: 1700,
		params: {
			text: ["string", "Juniper Max", "the label inside the pill"],
			textSize: ["number", 63, "label font px (cap 44)"],
			cx: ["number", 639.5, "pill centre x"],
			cy: ["number", 359.5, "pill centre y"],
			height: ["number", 180, "pill height; width = label + 277"],
			baseline: ["number", 376, "label baseline y"],
			cursorSize: ["number", 64, "ArrowCursor size"],
		},
		render: TogglePill,
	},
	"juniper-warm-bloom": {
		note: "the warm bloom behind the tier word: a peach -> coral field with a pink-white elliptical edge (fit to the peak frame, rms 2.8/255) whose opacity rises 7 frames, peaks and drains 9 frames back to the ground. Paint it over the ground, under the pill.",
		nativeMs: 600,
		params: {
			curve: ["array", "BLOOM_A", "[[localFrame, opacity]] table"],
			strength: ["number", 1, "opacity multiplier"],
			angle: ["number", 130.7, "ramp angle (CSS deg)"],
			ramp: ["array", "BLOOM_RAMP", "[[rgb, %]] ramp stops"],
			edge: ["object", "BLOOM_EDGE", "{colour, cx, cy, rx, ry, r0, r1} edge ellipse"],
		},
		render: WarmBloom,
	},
	"juniper-max-word": {
		note: "the tier word born from the bloom: white with a broad glow, growing 0.54 -> 1.0 over 3 frames, then the glow drains and it cross-fades (with a clearing blur) into the yellow -> orange tier gradient.",
		nativeMs: 450,
		params: {
			text: ["string", "Max", "the tier word"],
			size: ["number", 216, "font px (cap ~151, width 390)"],
			cx: ["number", 639.5, "centre x"],
			capMid: ["number", 359.5, "cap-height centre y"],
		},
		render: MaxWord,
	},
	"juniper-word-flash": {
		note: "big single words replacing each other on hard cuts (no fades), centred on the x-height, all under one slow 0.25 %/frame zoom-out.",
		nativeMs: 967,
		params: {
			words: ["array", "[]", "[{text, atMs}] scene-relative cut times"],
			size: ["number", 225, "font px at the scene start"],
			shrinkPerFrame: ["number", 0.0025, "zoom-out per frame"],
			cx: ["number", 640, "centre x"],
			xMid: ["number", 359.5, "x-height centre y"],
		},
		render: WordFlash,
	},
	"juniper-label-assemble": {
		note: "the last flash word 'for [glyph]' (centred, ~3x) zooms down along an S-curve into the device side label while the device word rolls up inside its clip window (vertical smear) and the sub-label fades in. Settles on s3's juniper-side-label layout (same params), so the hand-over is seamless.",
		nativeMs: 767,
		params: {
			lead: ["string", "for", "lead word"],
			device: ["string", "Phone", "device word (rolls up)"],
			sub: ["string", "3D action running game", "sub-label"],
			size: ["number", 67, "settled main-line font px"],
			subSize: ["number", 25, "sub-label font px"],
			right: ["number", 620, "settled main-line ink right edge"],
			baseline: ["number", 384, "settled main baseline y"],
			subBaseline: ["number", 315.5, "settled sub-label baseline y"],
			subAlign: ["string", "fixed", "'fixed' (subCx) or 'line' (centred on the main line)"],
			subCx: ["number", 442.5, "sub-label centre x when fixed"],
			from: ["array", "[640, 340]", "where the for+glyph pair's centre starts (screen px)"],
		},
		render: LabelAssemble,
	},
	"juniper-phone-whip": {
		note: "a phone flying in from the right onto its comp slot: off-frame right and ~1.2x at the start, measured expo-out offset curve over 10 frames, horizontal motion smear from its speed. Lands on landFrame (local).",
		nativeMs: 367,
		params: {
			slotLabel: ["string", "product UI", "screen slot label"],
			face: [
				"string",
				"null",
				"ScreenSlot face (CSS background) — match the next section's first slot",
			],
			rim: ["object", "PHONE_RIM", "{rim, hi, lo} rim colours"],
			shadow: ["boolean", false, "drop shadow under the phone"],
			left: ["number", 659, "settled left (s3 comp x)"],
			top: ["number", 25, "settled top"],
			width: ["number", 326, "phone width"],
			fromDx: ["number", 616, "offset scale (WHIP_DX is measured for 616)"],
			fromScale: ["number", 1.209, "scale at offset = fromDx"],
			landFrame: ["number", 11, "local frame it lands on"],
		},
		render: PhoneWhip,
	},
};
