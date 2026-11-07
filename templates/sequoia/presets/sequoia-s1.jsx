/**
 * sequoia-s1.jsx — section 1 (0 – 10.2s of the film): the rivals' opener.
 *
 * Measured off the Aside launch film, full-decode frames on a 30fps clock at
 * the 1280x720 stage (frame n = n/30 s). Notes, per-frame traces and the
 * PASS/PARTIAL table live in .demo-build/.../sequoia/sections/s1/notes.md.
 *
 *   sequoia-search-type     0 – 4.07s  search pill: I-beam lands, two push-ins
 *                                      onto the pill's LEFT edge, typed words,
 *                                      three whip-pans past rival app tiles,
 *                                      accelerating lift into a hard cut.
 *   sequoia-word-flow       words that fade up grey, rise into place, flash
 *                           blue and settle white; exit one by one sliding
 *                           left. Used for "They promised…" and "Instead…".
 *   sequoia-trash-dock      4.07 – 7.49s the tiles tossed into a glass bin, the
 *                           bin's glass tile, the shrink into a dock that grows
 *                           its icons, hand hover + click.
 *   sequoia-button-cascade  7.49 – 9.08s "Connect App +" glass cards fanning,
 *                           dragged, spawning everywhere; camera tilts away.
 *   sequoia-letter-rise     8.85 – 10.2s "buttons..." letters spring up.
 *
 * Every render is a pure function of t.
 */
import React from "react";
import { backOut, clamp01, cubicBezier, lerp } from "../../../src/lib/textcards/src/easing.js";
import { AppTile, FONT, HandCursor, Icon, live, localMs, Q, rgbs } from "./sequoia-shared.jsx";

// ── helpers ───────────────────────────────────────────────────────────────

const BZ = new Map();
/** memoised cubic-bezier easing from a [x1,y1,x2,y2] array */
function bz(c) {
	const k = c.join(",");
	let f = BZ.get(k);
	if (!f) {
		f = cubicBezier(c[0], c[1], c[2], c[3]);
		BZ.set(k, f);
	}
	return f;
}
/** eased progress of a segment [at, at+dur] (ms) */
const seg = (ms, at, dur, curve) => {
	const p = clamp01((ms - at) / Math.max(1e-6, dur));
	return curve ? bz(curve)(p) : p;
};
const mix = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
const easeOut3 = (p) => 1 - (1 - clamp01(p)) ** 3;

/** piecewise keys [{at, ...}] -> value of `ch` at ms; segment shaped by the
 * TARGET key's `curve` (bezier array) or linear. Holds outside the range. */
function keyed(keys, ms, ch) {
	if (ms <= keys[0].at) return keys[0][ch];
	for (let i = 1; i < keys.length; i++) {
		const a = keys[i - 1];
		const b = keys[i];
		if (ms < b.at) {
			const p = seg(ms, a.at, b.at - a.at, b.curve);
			return Array.isArray(a[ch]) ? mix(a[ch], b[ch], p) : lerp(a[ch], b[ch], p);
		}
	}
	return keys[keys.length - 1][ch];
}

let MEASURE = null;
/** deterministic text advance width via canvas (same font string as CSS) */
function textW(text, font, letterSpacingPx = 0) {
	MEASURE = MEASURE ?? document.createElement("canvas").getContext("2d");
	MEASURE.font = font;
	return MEASURE.measureText(text).width + letterSpacingPx * text.length;
}

const STAGE = { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" };
const BLUE = [30, 145, 196];

// ── cursors drawn locally (the reference's are larger than the shared ones) ─

/**
 * The macOS text I-beam as the reference draws it on this beat: a white
 * stroked beam with curled serifs and a centre tick, thin dark outline. `h` is
 * its height in the units of whatever space it is rendered in.
 */
function IBeam({ h, colour = [250, 250, 250], outline = [40, 42, 40], shadow = false }) {
	const d =
		"M-17 -47 Q-3 -49 0 -39 Q3 -49 17 -47 M0 -39 V39 M-17 47 Q-3 49 0 39 Q3 49 17 47 M-8 1 H8";
	return (
		<svg
			width={(h * 48) / 108}
			height={h}
			viewBox="-24 -54 48 108"
			style={{ position: "absolute", left: (-h * 24) / 108, top: -h / 2, overflow: "visible" }}
		>
			{shadow ? (
				<path d={d} fill="none" stroke="rgb(14,15,14)" strokeWidth={11} strokeLinecap="round" />
			) : (
				<>
					<path d={d} fill="none" stroke={rgbs(outline)} strokeWidth={10.4} strokeLinecap="round" />
					<path d={d} fill="none" stroke={rgbs(colour)} strokeWidth={7.2} strokeLinecap="round" />
				</>
			)}
		</svg>
	);
}

/**
 * The shared HandCursor's own `size` scaling does not take effect in the
 * stage (it renders at its 32px base), so scale it from a wrapper: (x,y) is
 * the fingertip, `size` the glyph height in stage px (~92-95 measured, f205).
 */
function Hand({ x, y, size, press = 0 }) {
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				transformOrigin: "0 0",
				transform: `scale(${(size / 32).toFixed(4)})`,
			}}
		>
			<HandCursor x={0} y={0} size={32} press={press} />
		</div>
	);
}

// ── sequoia-search-type ───────────────────────────────────────────────────

const ST = {
	// rest framing, stage px (measured f0: fill x 226-1053, y 329-390)
	pill: { x: 226, y: 329.5, w: 827, h: 61, r: 18 },
	padX: 25.8, // placeholder + typed text start (f0 "S" at x 251.8)
	phSize: 20.7, // placeholder cap 14.5px
	segSize: 17, // "Search | Ask AI" cap 11.3px (Segoe's cap is short)
	typeSize: 22.3, // typed text cap 16px in pill space (100px at 6.25x); Segoe runs wide, so a hair under
	typeAtMs: 1300, // "W" first on f39
	typeStepMs: 41, // "d" lands f49
	typeFadeMs: 200, // newest glyphs cyan, white ~6 frames later
	typeBlue: [96, 182, 212],
	clearAtMs: 1267, // placeholder gone f38
	glowAtMs: 1150,
	glowMs: 380,
	// push-ins are on LOG scale, origin = the pill's left edge, vertical centre
	push1: { at: 453, dur: 672, to: 2.03, curve: [0.846, 0.207, 0.066, 0.959] },
	push2: { at: 1128, dur: 657, to: 6.25, curve: [0.642, 0.287, 0.223, 1.004], dx: 37 },
	// whip-pans: centre a span of the row (text start / icon i edges) at centreX
	pans: [
		{ at: 1848, dur: 402, curve: [0.87, 0.159, 0.167, 0.997], from: "text", to: 0, centreX: 685.5 },
		{ at: 2346, dur: 496, curve: [0.647, 0.302, 0, 0.983], from: 0, to: 1, centreX: 650.75 },
		{ at: 2915, dur: 390, curve: [0.641, 0.215, 0, 0.97], from: 0, to: 2, centreX: 633 },
	],
	icons: ["dawn", "navy", "ember"],
	iconSize: 50.8, // 317px at 6.25x
	iconGap: 10.4, // tiles every 382.5px at 6.25x
	iconLead: 15.4, // text end -> first tile
	iconEnterMs: [1843, 2472, 3020], // each tile slides in from the right…
	iconSlide: 40, // …from +40 pill px (250 screen px)…
	iconTauMs: 115, // …on a true exponential (x0.74/frame)
	// accelerating lift into the cut: y = -A (e^{k (t-at)} - 1), screen px
	lift: { at: 3633, k: 9.18, pill: 0.72, icons: 1.32 },
	cursor: {
		at: 520,
		from: [512, 472],
		to: [302, 366],
		move: { at: 550, dur: 479, curve: [0.736, 0.458, 0.132, 0.903] },
		h: 81, // pill px (163px at 2.02x)
		rot0: -55,
		scale0: 0.45,
		pressAt: 1100,
		outAt: 1167,
		outMs: 66,
	},
};

function SearchType(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const P = { ...ST, ...cfg };
	const pill = { ...ST.pill, ...(cfg.pill ?? {}) };
	const cur = { ...ST.cursor, ...(cfg.cursor ?? {}) };
	const typed = cfg.typed ?? "We killed";
	const placeholder = cfg.placeholder ?? "Search for...";
	const segments = cfg.segments ?? ["Search", "Ask AI"];
	const O = [pill.x, pill.y + pill.h / 2];

	// camera: two log-scale pushes, then pans (tx), then the lift (ty)
	const l1 = Math.log(P.push1.to);
	const l2 = Math.log(P.push2.to);
	const p2 = seg(ms, P.push2.at, P.push2.dur, P.push2.curve);
	const s = Math.exp(l1 * seg(ms, P.push1.at, P.push1.dur, P.push1.curve) + (l2 - l1) * p2);
	let tx = P.push2.dx * p2;

	const typeFont = `500 ${P.typeSize}px ${FONT}`;
	const textX0 = pill.x + P.padX;
	const tw = textW(typed, typeFont, -0.02 * P.typeSize);
	const iconL = (i) => textX0 + tw + P.iconLead + i * (P.iconSize + P.iconGap);
	const edge = (a, right) => (a === "text" ? textX0 : iconL(a) + (right ? P.iconSize : 0));
	for (const pan of P.pans) {
		const c = (edge(pan.from, false) + edge(pan.to, true)) / 2;
		const target = pan.centreX - O[0] - (c - O[0]) * P.push2.to;
		tx = lerp(tx, target, seg(ms, pan.at, pan.dur, pan.curve));
	}
	const liftE = ms > P.lift.at ? Math.exp((P.lift.k * (ms - P.lift.at)) / 1000) - 1 : 0;
	const ty = -P.lift.pill * liftE;
	const iconLiftPill = (-P.lift.icons * liftE) / s;

	const glow = seg(ms, P.glowAtMs, P.glowMs, [0.3, 0, 0.3, 1]);
	const world = {
		position: "absolute",
		left: 0,
		top: 0,
		width: 1280,
		height: 720,
		transformOrigin: `${O[0]}px ${O[1]}px`,
		transform: `translate(${tx.toFixed(3)}px, ${ty.toFixed(3)}px) scale(${s.toFixed(5)})`,
	};

	// typed glyphs: newest cyan, fading to white
	const chars = [...typed].map((ch, i) => {
		const at = P.typeAtMs + i * P.typeStepMs;
		const vis = ms >= at;
		const f = clamp01((ms - at) / P.typeFadeMs) ** 1.2;
		return (
			<span
				key={i}
				style={{
					visibility: vis ? "visible" : "hidden",
					color: rgbs(mix(P.typeBlue, Q.white, f)),
					whiteSpace: "pre",
				}}
			>
				{ch}
			</span>
		);
	});

	// cursor (pill space: it rides the camera like the reference's does)
	let cursorEl = null;
	if (ms >= cur.at && ms < cur.outAt + cur.outMs) {
		const cp = seg(ms, cur.move.at, cur.move.dur, cur.move.curve);
		const x = lerp(cur.from[0], cur.to[0], cp);
		const y = lerp(cur.from[1], cur.to[1], cp);
		const rot = cur.rot0 * (1 - cp) ** 0.8;
		const pop = easeOut3((ms - cur.at) / 90);
		const sc = (cur.scale0 + (1 - cur.scale0) * cp ** 0.7) * pop;
		const press =
			ms >= cur.pressAt ? 1 - 0.12 * Math.sin(Math.PI * clamp01((ms - cur.pressAt) / 90)) : 1;
		const op = clamp01((ms - cur.at) / 50) * (1 - clamp01((ms - cur.outAt) / cur.outMs));
		const sh = 85 - 40 * cp; // the shadow converges as the beam lands
		const tf = (ox, oy) => ({
			position: "absolute",
			left: x + ox,
			top: y + oy,
			opacity: op,
			transform: `rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)}, ${(sc * press).toFixed(4)})`,
		});
		cursorEl = (
			<>
				<div style={{ ...tf(sh * 0.53, sh * 0.55), filter: "blur(3px)", opacity: op * 0.55 }}>
					<IBeam h={cur.h} shadow />
				</div>
				<div style={tf(0, 0)}>
					<IBeam h={cur.h} />
				</div>
			</>
		);
	}

	const segH = 39;
	const segR = 12;
	return (
		<div style={STAGE}>
			<div style={world}>
				<div
					style={{
						position: "absolute",
						left: pill.x,
						top: pill.y,
						width: pill.w,
						height: pill.h,
						borderRadius: pill.r,
						boxSizing: "border-box",
						background: "linear-gradient(90deg, rgb(46,50,48), rgb(50,54,55))",
						border: "0.7px solid rgba(160,190,200,0.16)",
						boxShadow: `0 1.6px 2px rgba(0,0,0,0.30), 0 -2px 9px rgba(70,150,165,0.12), 0 0 ${9 + 4 * glow}px ${2 * glow}px rgba(60,145,175,${(0.17 * glow).toFixed(3)})`,
					}}
				/>
				{ms < P.clearAtMs ? (
					<div
						style={{
							position: "absolute",
							left: textX0,
							top: pill.y,
							height: pill.h,
							display: "flex",
							alignItems: "center",
							font: `400 ${P.phSize}px ${FONT}`,
							color: "rgb(160,163,159)",
							whiteSpace: "pre",
						}}
					>
						{placeholder}
					</div>
				) : null}
				<div
					style={{
						position: "absolute",
						right: 1280 - (pill.x + pill.w - 9),
						top: O[1] - segH / 2,
						height: segH,
						borderRadius: segR,
						background: "rgb(31,33,31)",
						display: "flex",
						alignItems: "center",
						padding: "0 3.5px 0 13px",
						gap: 11,
						font: `400 ${P.segSize}px ${FONT}`,
						whiteSpace: "pre",
					}}
				>
					{segments.map((sg, i) => (
						<span
							key={sg}
							style={
								i === (cfg.segActive ?? segments.length - 1)
									? {
											color: "rgb(250,250,250)",
											background: "rgb(57,60,58)",
											border: "0.6px solid rgba(255,255,255,0.08)",
											borderRadius: 10,
											height: 32,
											display: "flex",
											alignItems: "center",
											padding: "0 13px",
										}
									: { color: "rgb(150,152,148)" }
							}
						>
							{sg}
						</span>
					))}
				</div>
				<div
					style={{
						position: "absolute",
						left: textX0,
						top: pill.y,
						height: pill.h,
						display: "flex",
						alignItems: "center",
						font: typeFont,
						letterSpacing: "-0.02em",
					}}
				>
					{chars}
				</div>
				{P.icons.map((kind, i) => {
					const te = P.iconEnterMs[i] ?? 1e9;
					if (ms < te) return null;
					const off = P.iconSlide * Math.exp(-(ms - te) / P.iconTauMs);
					return (
						<div
							key={kind + i}
							style={{
								position: "absolute",
								left: iconL(i) + off,
								top: O[1] - P.iconSize / 2 + iconLiftPill,
							}}
						>
							<AppTile kind={kind} size={P.iconSize} />
						</div>
					);
				})}
				{cursorEl}
			</div>
		</div>
	);
}

// ── sequoia-word-flow ─────────────────────────────────────────────────────

/**
 * Lines of words laid out centred (final layout from frame one, so nothing
 * reflows). Each word: appears at `at` fading up from the ground (fadeMs),
 * travelling from (dx0, dy0) toward (0, dyHold) on an exponential (tau); at
 * `hl` it flashes BLUE (1 frame up, ~2 held, ~2 down) and hops the rest of the
 * way home; at `out` it slides left and fades (exit.dx, exit.ms). The whole
 * block follows `blockKeys` (y offsets, bezier per key).
 */
function wordState(w, ms, D) {
	const at = w.at ?? 0;
	if (ms < at) return null;
	const fadeMs = w.fadeMs ?? D.fadeMs;
	const tau = w.tau ?? D.tau;
	const dx0 = w.dx0 ?? D.dx0;
	const dy0 = w.dy0 ?? D.dy0;
	const hold = w.dyHold ?? (w.hl != null ? D.dyHold : 0);
	const k = Math.exp(-(ms - at) / tau);
	let dx = dx0 * k;
	let dy = hold + (dy0 - hold) * k;
	let col = mix(Q.dark, Q.white, clamp01((ms - at) / fadeMs));
	if (w.hl != null) {
		const h0 = w.hl - D.hlUp;
		if (ms >= h0) {
			const dyAt = hold + (dy0 - hold) * Math.exp(-(h0 - at) / tau);
			dy = dyAt * Math.exp(-(ms - h0) / D.hopTau);
		}
		const up = clamp01((ms - h0) / D.hlUp);
		const down = clamp01((ms - (w.hl + D.hlHold)) / D.hlDown);
		const b = up * (1 - down);
		if (b > 0) col = mix(col, w.hlColour ?? D.hlColour, b);
	}
	let op = 1;
	if (w.out != null && ms >= w.out) {
		const p = clamp01((ms - w.out) / (w.outMs ?? D.exit.ms));
		if (p >= 1) return null;
		dx += D.exit.dx * p ** D.exit.pow;
		col = mix(col, D.exit.colour, clamp01(p * 1.6));
		op = (1 - p) ** 1.1;
	}
	return { dx, dy, col, op };
}

const WF = {
	size: 91.5, // cap 65px measured on "They" (142 -> 207); widths matched on line 2
	weight: 500,
	pitch: 96, // line pitch
	letterSpacing: -0.012, // em
	wordGap: 0.19, // em (ref word gaps 23-27px)
	centreX: 640,
	capTop: 142, // first line's cap top at block offset 0
	fadeMs: 150,
	tau: 100,
	dx0: 0,
	dy0: 0,
	dyHold: 18,
	hopTau: 30,
	hlUp: 33,
	hlHold: 67,
	hlDown: 67,
	hlColour: BLUE,
	exit: { ms: 200, dx: -150, pow: 1.2, colour: [150, 152, 150] },
};

function WordFlow(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const D = { ...WF, ...cfg, exit: { ...WF.exit, ...(cfg.exit ?? {}) } };
	const lines = cfg.lines ?? [];
	const off = cfg.blockKeys ? keyed(cfg.blockKeys, ms, "y") : 0;
	// Segoe UI: ascent 1.079em, content 1.33em; glyph tops render 0.745em above
	// the baseline (measured on our frames: T/b tops sit ~4px above a 0.70em cap)
	const capInLine = (D.pitch - 1.33 * D.size) / 2 + (1.079 - 0.745) * D.size;
	const top = D.capTop - capInLine + off;
	return (
		<div style={STAGE}>
			{lines.map((ln, li) => (
				<div
					key={li}
					style={{
						position: "absolute",
						left: D.centreX - 640,
						width: 1280,
						top: top + li * D.pitch,
						height: D.pitch,
						display: "flex",
						justifyContent: "center",
						gap: `${D.wordGap}em`,
						font: `${D.weight} ${D.size}px/${D.pitch}px ${FONT}`,
						letterSpacing: `${D.letterSpacing}em`,
						whiteSpace: "pre",
					}}
				>
					{ln.map((w, wi) => {
						const st = wordState(w, ms, D);
						return (
							<span
								key={wi}
								style={{
									display: "inline-block",
									visibility: st ? "visible" : "hidden",
									color: st ? rgbs(st.col) : "transparent",
									opacity: st ? st.op : 0,
									transform: st
										? `translate(${st.dx.toFixed(2)}px, ${st.dy.toFixed(2)}px)`
										: "none",
								}}
							>
								{w.text}
							</span>
						);
					})}
				</div>
			))}
		</div>
	);
}

// ── sequoia-trash-dock ────────────────────────────────────────────────────

/** generic dark app tile with a blue glyph (the dock's browser / mail stand-ins) */
function DarkTile({ size, glyph }) {
	const inner = size * 0.74;
	return (
		<div
			style={{
				position: "relative",
				width: size,
				height: size,
				borderRadius: size * 0.225,
				background: "linear-gradient(180deg, rgb(52,54,57), rgb(30,31,33))",
				boxShadow: "inset 0 1px 1px rgba(255,255,255,0.10), 0 2px 6px rgba(0,0,0,0.35)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{glyph === "compass" ? (
				<div
					style={{
						width: inner,
						height: inner,
						borderRadius: "50%",
						background: "radial-gradient(circle at 50% 35%, rgb(90,178,247), rgb(28,104,214))",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Icon name="compass" size={inner * 0.86} colour={[240, 246, 255]} stroke={1.4} />
				</div>
			) : (
				<div
					style={{
						width: inner,
						height: inner * 0.66,
						borderRadius: size * 0.05,
						background: "linear-gradient(180deg, rgb(72,150,240), rgb(28,90,205))",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Icon name="mail" size={inner * 0.6} colour={[230, 240, 255]} stroke={1.6} />
				</div>
			)}
		</div>
	);
}

/** bin geometry at scale 1 (f150: rim 213 wide, top y 403; body to y 632) */
const BIN = { w: 213, rimH: 36, h: 232, botInset: 25.5, botR: 26 };

function binBodyPath() {
	const { w, rimH, h, botInset, botR } = BIN;
	const y0 = rimH - 3; // the front lip: the body starts under the rim
	const l = botInset;
	const r = w - botInset;
	return `M0 ${y0} L${l - 2} ${h - botR} Q${l} ${h} ${l + botR} ${h} L${r - botR} ${h} Q${r} ${h} ${r + 2} ${h - botR} L${w} ${y0} Z`;
}

const TD = {
	// toss (screen px; measured on shot 2, f122-f145)
	toss: {
		x0: [428, 639, 849],
		y0: 343,
		apex: [185, 168, 183],
		riseAt: 7, // f122 after the cut
		riseTau: 87,
		fallAt: 407, // f134
		fallTau: 99,
		fallC: 5.4,
		size: 122,
		rot: [
			{ to: -18.5, at: 107, dur: 400 },
			{ to: -3, at: 7, dur: 200 },
			{ to: 30, at: 7, dur: 430 },
		],
	},
	// resting inside the bin, bin-local px from the rim's top-centre
	rest: [
		[-33, 47, -7],
		[8, 38, 7],
		[44, 40, 15],
	],
	restScale: 0.9,
	bin: {
		cx: 640,
		rise: { at: 253, dur: 447, from: 740, to: 403, curve: [0.786, 0.304, 0.196, 0.831] },
	},
	shrink: { at: 1980, dur: 220, to: 0.62, curve: [0.45, 0, 0.3, 1] }, // f181-f187
	binCy: 519, // bin scales about its own centre
	tile: [
		{ at: 1720, l: 560, r: 720, top: 440, bot: 600, rad: 50, op: 0 },
		{ at: 1807, l: 460, r: 820, top: 350, bot: 664, rad: 88, op: 1, curve: [0.2, 0.6, 0.3, 1] },
		{ at: 1980, l: 464, r: 816, top: 352, bot: 662, rad: 88, op: 1 },
		{ at: 2200, l: 514, r: 764, top: 410, bot: 614, rad: 62, op: 1, curve: [0.45, 0, 0.3, 1] },
		{ at: 2273, l: 514, r: 764, top: 410, bot: 612, rad: 62, op: 1 },
		{ at: 2600, l: 238, r: 1028, top: 410, bot: 606, rad: 62, op: 1, curve: [0.55, 0, 0.25, 1] },
	],
	binRightInset: 114, // bin centre = dock right - 114 once the dock grows
	dividerGap: 44,
	dockIcons: [
		{ kind: "spark", at: 2373 },
		{ kind: "mail", at: 2440 },
		{ kind: "compass", at: 2490 },
	],
	iconSize: 144,
	iconGap: 39,
	spark: { hoverAt: 2940, hoverMs: 200, hover: 1.2, pressAt: 3270, pressMs: 130, press: 1.08 },
	hand: {
		// glyph ~95px tall over the mail tile (f205), ~130px by the click (f227)
		sizeKeys: [
			{ at: 2940, s: 105 },
			{ at: 3340, s: 140, curve: [0.4, 0, 0.6, 1] },
		],
		at: 2540,
		keys: [
			{ at: 2540, x: 432, y: 412 },
			{ at: 2607, x: 447, y: 418 },
			{ at: 2773, x: 457, y: 425, curve: [0.4, 0, 0.6, 1] },
			{ at: 2940, x: 560, y: 488, curve: [0.4, 0, 0.6, 1] },
			{ at: 3073, x: 670, y: 512, curve: [0.2, 0.5, 0.4, 1] },
			{ at: 3207, x: 690, y: 522, curve: [0.3, 0, 0.5, 1] },
			{ at: 3340, x: 703, y: 550, curve: [0.4, 0, 0.6, 1] },
		],
		pressAt: 3270,
		pressMs: 160,
	},
};

/** the bin: rim + translucent frosted body; `inside` renders between rim-back and body */
function Bin({ inside }) {
	const { w, rimH, h } = BIN;
	const body = binBodyPath();
	return (
		<div style={{ position: "absolute", left: -w / 2, top: 0, width: w, height: h }}>
			<svg
				width={w}
				height={h}
				style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
			>
				<rect
					x={1.5}
					y={1.5}
					width={w - 3}
					height={rimH - 3}
					rx={(rimH - 3) / 2}
					fill="rgb(22,23,22)"
				/>
				<rect
					x={5}
					y={6}
					width={w - 10}
					height={rimH - 12}
					rx={(rimH - 12) / 2}
					fill="rgb(42,44,42)"
				/>
			</svg>
			{inside}
			<div
				style={{
					position: "absolute",
					inset: 0,
					clipPath: `path("${body}")`,
					background:
						"linear-gradient(180deg, rgba(36,38,36,0.86) 0%, rgba(24,25,24,0.9) 55%, rgba(30,31,30,0.92) 100%)",
					backdropFilter: "blur(7px)",
				}}
			/>
			<svg
				width={w}
				height={h}
				style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
			>
				<defs>
					<linearGradient id="s1-bin-edge" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0" stopColor="rgba(150,152,150,0.35)" />
						<stop offset="0.5" stopColor="rgba(150,152,150,0.10)" />
						<stop offset="1" stopColor="rgba(170,172,170,0.40)" />
					</linearGradient>
				</defs>
				<path d={body} fill="none" stroke="url(#s1-bin-edge)" strokeWidth={1.6} />
				<rect
					x={1.5}
					y={1.5}
					width={w - 3}
					height={rimH - 3}
					rx={(rimH - 3) / 2}
					fill="none"
					stroke="rgb(168,170,168)"
					strokeWidth={4.2}
				/>
				<rect
					x={4}
					y={4.5}
					width={w - 8}
					height={rimH - 9}
					rx={(rimH - 9) / 2}
					fill="none"
					stroke="rgba(0,0,0,0.35)"
					strokeWidth={1.2}
				/>
			</svg>
		</div>
	);
}

function TrashDock(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const P = { ...TD, ...cfg };
	const toss = { ...TD.toss, ...(cfg.toss ?? {}) };
	const tossKinds = cfg.tossIcons ?? ["dawn", "navy", "ember"];
	const dockIcons = cfg.dockIcons ?? TD.dockIcons;

	// bin group: rise, then shrink about its centre, then ride the dock's right edge
	const rimTop = lerp(
		P.bin.rise.from,
		P.bin.rise.to,
		seg(ms, P.bin.rise.at, P.bin.rise.dur, P.bin.rise.curve),
	);
	const g = lerp(1, P.shrink.to, seg(ms, P.shrink.at, P.shrink.dur, P.shrink.curve));
	const tileL = keyed(P.tile, ms, "l");
	const tileR = keyed(P.tile, ms, "r");
	const tileT = keyed(P.tile, ms, "top");
	const tileB = keyed(P.tile, ms, "bot");
	const tileRad = keyed(P.tile, ms, "rad");
	const tileOp = keyed(P.tile, ms, "op");
	const dockPhase = ms >= P.tile[4].at;
	const binCx = dockPhase ? Math.max(P.bin.cx, tileR - P.binRightInset) : P.bin.cx;
	// bin-local origin = rim top-centre; scaled about (cx, binCy)
	const binTop = P.binCy + (rimTop - P.binCy) * g;

	// tossed tiles
	const fallE = (m) =>
		m > toss.fallAt ? toss.fallC * (Math.exp((m - toss.fallAt) / toss.fallTau) - 1) : 0;
	const icons = tossKinds.map((kind, i) => {
		const apex = toss.apex[i];
		const rise = (toss.y0 - apex) * Math.exp(-Math.max(0, ms - toss.riseAt) / toss.riseTau);
		const F = fallE(ms);
		const rest = P.rest[i];
		const restY = rimTop + rest[1];
		const q = clamp01(F / Math.max(1, restY - apex));
		const yScreen = Math.min(apex + rise + F, restY);
		const xScreen = lerp(toss.x0[i], P.bin.cx + rest[0], q ** 1.6);
		const r0 = toss.rot[i];
		const rot = lerp(r0.to * easeOut3((ms - r0.at) / r0.dur), rest[2], q);
		const sc = lerp(1, P.restScale, q);
		return { kind, i, landed: q >= 1, x: xScreen, y: yScreen, rot, sc };
	});
	const iconEl = (ic, local) => (
		<div
			key={ic.kind + ic.i}
			style={{
				position: "absolute",
				left: (local ? ic.x - P.bin.cx + BIN.w / 2 : ic.x) - toss.size / 2,
				top: (local ? ic.y - rimTop : ic.y) - toss.size / 2,
				transform: `rotate(${ic.rot.toFixed(2)}deg) scale(${ic.sc.toFixed(4)})`,
			}}
		>
			<AppTile kind={ic.kind} size={toss.size} />
		</div>
	);
	// draw order: ember (back) … dawn (front)
	const order = [2, 1, 0];
	const entered = (ic) => ic.landed || ic.y > rimTop - toss.size * 0.2;
	const inBin = order.map((i) => icons[i]).filter(entered);
	const flying = order.map((i) => icons[i]).filter((ic) => !entered(ic));

	// dock row (right-anchored: bin | divider | icons right-to-left)
	const binW = BIN.w * g;
	const divX = binCx - binW / 2 - P.dividerGap;
	const rowCy = (tileT + tileB) / 2;
	// drawn right-to-left reversed so the first (hovered) tile paints last, on top
	const dockEls = dockPhase
		? dockIcons.map((d, k) => {
				if (ms < d.at) return null;
				const pop = 0.25 + 0.75 * backOut(clamp01((ms - d.at) / 120), 1.2);
				const right = divX - 38 - k * (P.iconSize + P.iconGap);
				let sc = pop;
				if (k === 0) {
					sc *= lerp(1, P.spark.hover, easeOut3((ms - P.spark.hoverAt) / P.spark.hoverMs));
					sc *= lerp(
						1,
						P.spark.press / P.spark.hover,
						easeOut3((ms - P.spark.pressAt) / P.spark.pressMs),
					);
				}
				const tile =
					d.kind === "compass" || d.kind === "mail" ? (
						<DarkTile size={P.iconSize} glyph={d.kind} />
					) : (
						<AppTile kind={d.kind} size={P.iconSize} />
					);
				return (
					<div
						key={d.kind}
						style={{
							position: "absolute",
							left: right - P.iconSize,
							top: rowCy - P.iconSize / 2,
							transform: `scale(${sc.toFixed(4)})`,
							opacity: clamp01((ms - d.at) / 40),
						}}
					>
						{tile}
					</div>
				);
			})
		: null;

	// hand
	let handEl = null;
	if (ms >= P.hand.at) {
		const hx = keyed(P.hand.keys, ms, "x");
		const hy = keyed(P.hand.keys, ms, "y");
		const hs = keyed(P.hand.sizeKeys, ms, "s");
		const pop = easeOut3((ms - P.hand.at) / 110);
		const press = Math.sin(Math.PI * clamp01((ms - P.hand.pressAt) / P.hand.pressMs));
		handEl = <Hand x={hx} y={hy} size={hs * (0.15 + 0.85 * pop)} press={press} />;
	}

	return (
		<div style={STAGE}>
			{tileOp > 0 ? (
				<div
					style={{
						position: "absolute",
						left: tileL,
						top: tileT,
						width: tileR - tileL,
						height: tileB - tileT,
						borderRadius: tileRad,
						opacity: tileOp,
						boxSizing: "border-box",
						background: "rgba(30,32,30,0.80)",
						backdropFilter: "blur(10px)",
						border: "2px solid rgba(78,80,78,0.75)",
					}}
				/>
			) : null}
			{dockPhase ? (
				<div
					style={{
						position: "absolute",
						left: divX,
						top: rowCy - (tileB - tileT) * 0.38,
						width: 1.6,
						height: (tileB - tileT) * 0.76,
						background: "rgba(90,92,90,0.6)",
						opacity: clamp01((ms - P.tile[4].at) / 60),
					}}
				/>
			) : null}
			{dockEls ? [...dockEls].reverse() : null}
			<div
				style={{
					position: "absolute",
					left: binCx,
					top: binTop,
					transformOrigin: "0 0",
					transform: `scale(${g.toFixed(4)})`,
				}}
			>
				<Bin inside={inBin.map((ic) => iconEl(ic, true))} />
			</div>
			{flying.map((ic) => iconEl(ic, false))}
			{handEl}
		</div>
	);
}

// ── sequoia-button-cascade ────────────────────────────────────────────────

/**
 * A frosted "Connect App +" card (f238: 682x190, radius ~48, text cap 52px,
 * text left pad 67, text -> plus 60, plus -> edge 70). Width follows the copy.
 */
function GlassButton({ label, size, plusSize, h, x, y, scale = 1, opacity = 1, blur }) {
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				height: h,
				display: "inline-flex",
				alignItems: "center",
				gap: 58,
				padding: "0 68px 0 66px",
				boxSizing: "border-box",
				borderRadius: h * 0.255,
				background: "rgba(36,38,36,0.55)",
				backdropFilter: `blur(${blur}px)`,
				border: "1.5px solid rgba(255,255,255,0.055)",
				boxShadow: "0 8px 26px rgba(0,0,0,0.20)",
				font: `500 ${size}px ${FONT}`,
				letterSpacing: "-0.012em",
				color: "rgb(252,253,252)",
				whiteSpace: "pre",
				transformOrigin: "50% 50%",
				transform: `scale(${scale.toFixed(4)})`,
				opacity,
			}}
		>
			{label}
			<Icon name="plus" size={plusSize} colour={[252, 253, 252]} stroke={2.3} />
		</div>
	);
}

const BC = {
	label: "Connect App",
	size: 79, // cap 52px on the reference grotesk; Segoe needs a little more
	plusSize: 50,
	h: 190,
	blur: 18, // behind-card text reads as soft grey smears
	// [atMs (scene), x, y, layer, from?] — positions at camera 0, stage px
	cards: [
		{ at: 10, x: 298, y: 413, layer: "front", pop: "swap" },
		{ at: 409, x: 250, y: 355, layer: "back", from: [298, 413] },
		{ at: 459, x: 205, y: 298, layer: "back", from: [250, 355] },
		{ at: 510, x: 157, y: 240, layer: "back", from: [205, 298] },
		{ at: 553, x: 100, y: 178, layer: "back", from: [157, 240] },
		{ at: 560, x: 347, y: 362, layer: "front", from: [298, 413] },
		{ at: 610, x: 395, y: 312, layer: "front", from: [347, 362] },
		{ at: 643, x: 442, y: 259, layer: "front", from: [395, 312] },
		{ at: 683, x: 492, y: 198, layer: "front", from: [442, 259] },
		{ at: 727, x: 546, y: 140, layer: "front", from: [492, 198] },
		{ at: 777, x: 612, y: 92, layer: "front", from: [546, 140] },
		{ at: 810, x: 690, y: 40, layer: "front", from: [612, 92] },
		{ at: 843, x: 760, y: -15, layer: "front", from: [690, 40] },
		{ at: 750, x: 400, y: 70, layer: "front", pop: "spawn" },
		{ at: 860, x: 12, y: 207, layer: "front", pop: "spawn" },
		{ at: 943, x: 505, y: 305, layer: "front", pop: "spawn" },
		{ at: 960, x: 55, y: 380, layer: "front", pop: "spawn" },
		{ at: 1043, x: 585, y: 158, layer: "front", pop: "spawn" },
		{ at: 1077, x: 590, y: 423, layer: "front", pop: "spawn" },
		{ at: 1093, x: 10, y: -47, layer: "front", pop: "spawn" },
		{ at: 1143, x: 60, y: 214, layer: "front", pop: "spawn" },
		{ at: 1177, x: -60, y: 434, layer: "front", pop: "spawn" },
		{ at: 1210, x: 610, y: 384, layer: "front", pop: "spawn" },
	],
	slideMs: 55,
	// camera tilt (screen px): slow drift, then an accelerating power-law pull
	drift: { at: 843, pxPerS: 105 },
	pull: { at: 1110, c: 0.5, n: 2.75 }, // c * (frames since at)^n
	hand: {
		size: 140, // ~125px glyph (f238, f251, f263)
		keys: [
			{ at: 0, x: 705, y: 550 },
			{ at: 377, x: 700, y: 545 },
			{ at: 443, x: 688, y: 515, curve: [0.4, 0, 0.6, 1] },
			{ at: 510, x: 600, y: 450 },
			{ at: 577, x: 515, y: 375, curve: [0.2, 0, 0.5, 1] },
			{ at: 677, x: 560, y: 350, curve: [0.4, 0, 0.6, 1] },
			{ at: 777, x: 735, y: 212, curve: [0.4, 0, 0.6, 1] },
			{ at: 877, x: 707, y: 232, curve: [0.4, 0, 0.6, 1] },
			{ at: 977, x: 487, y: 330, curve: [0.4, 0, 0.6, 1] },
			{ at: 1110, x: 633, y: 305, curve: [0.4, 0, 0.6, 1] },
			{ at: 1277, x: 840, y: 232, curve: [0.4, 0, 0.6, 1] },
			{ at: 1410, x: 835, y: 205, curve: [0.4, 0, 0.6, 1] },
			{ at: 1477, x: 835, y: 40, curve: [0.6, 0, 1, 1] },
			{ at: 1543, x: 835, y: -130 },
		],
	},
};

function ButtonCascade(cfg, t) {
	if (!live(cfg, t)) return null;
	// The film layers scenes by startMs, so the 'back' layer is started BEFORE
	// the text scene it must sit under; `clockMs` keeps its choreography on the
	// absolute moment the cards actually begin.
	const ms = t * 1000 - (cfg.clockMs ?? cfg.startMs);
	if (ms < 0) return null;
	const P = { ...BC, ...cfg };
	const layer = cfg.layer ?? "front";
	const frames = (m) => m / (1000 / 30);
	let ty = 0;
	if (ms > P.drift.at) ty -= (P.drift.pxPerS * (ms - P.drift.at)) / 1000;
	if (ms > P.pull.at) ty -= P.pull.c * frames(ms - P.pull.at) ** P.pull.n;

	const cards = P.cards
		.filter((c) => c.layer === layer && ms >= c.at)
		.map((c, k) => {
			let x = c.x;
			let y = c.y;
			let sc = 1;
			let op = 1;
			if (c.from) {
				const p = easeOut3((ms - c.at) / P.slideMs);
				x = lerp(c.from[0], c.x, p);
				y = lerp(c.from[1], c.y, p);
			} else if (c.pop === "swap") {
				sc = lerp(0.93, 1, easeOut3((ms - c.at) / 90));
			} else if (c.pop === "spawn") {
				const p = clamp01((ms - c.at) / 170);
				sc = 0.86 + 0.14 * backOut(p, 2.2);
				op = clamp01((ms - c.at) / 35);
			}
			return (
				<GlassButton
					key={`${c.at}-${c.x}`}
					label={P.label}
					size={P.size}
					plusSize={P.plusSize}
					h={P.h}
					blur={P.blur}
					x={x}
					y={y + ty}
					scale={sc}
					opacity={op}
				/>
			);
		});
	// back cards stamp out BEHIND: newest paints first. (No z-index anywhere: a
	// positive z-index would lift the cards over the text scene between layers.)
	if (layer === "back") cards.reverse();

	let handEl = null;
	if (layer === "front") {
		const hx = keyed(P.hand.keys, ms, "x");
		const hy = keyed(P.hand.keys, ms, "y");
		handEl = <Hand x={hx} y={hy} size={P.hand.size} />;
	}
	return (
		<div style={STAGE}>
			{cards}
			{handEl}
		</div>
	);
}

// ── sequoia-letter-rise ───────────────────────────────────────────────────

const LR = {
	text: "buttons...",
	size: 93,
	weight: 500,
	letterSpacing: -0.012,
	centreX: 633.5, // f290: 448-819
	capTop: 329,
	at: 17, // "b" starts f266 (scene starts 8850)
	stepMs: 48,
	dotAt: 400, // trailing dots lag: first dot low on f278…
	dotStepMs: 62, // …one every ~2 frames
	riseMs: 570, // crosses the line ~f271.7, settles ~f283
	dy0: 90, // b at +47 on f268, two frames in
	back: 2.0, // ~11px overshoot above the line, f274
	colourMs: 260,
	dim: [50, 60, 62],
	tint: [168, 192, 198],
	exit: { at: 1100, ms: 217, dx: -16, pow: 3 },
};

function LetterRise(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const P = { ...LR, ...cfg, exit: { ...LR.exit, ...(cfg.exit ?? {}) } };
	const capInLine = (1.3 * P.size - 1.33 * P.size) / 2 + (1.079 - 0.745) * P.size;
	const ex = P.exit.dx * clamp01((ms - P.exit.at) / P.exit.ms) ** P.exit.pow;
	return (
		<div style={STAGE}>
			<div
				style={{
					position: "absolute",
					left: P.centreX - 640 + ex,
					width: 1280,
					top: P.capTop - capInLine,
					display: "flex",
					justifyContent: "center",
					font: `${P.weight} ${P.size}px/${1.3 * P.size}px ${FONT}`,
					letterSpacing: `${P.letterSpacing}em`,
					whiteSpace: "pre",
				}}
			>
				{[...P.text].map((ch, i, all) => {
					const nLetters = all.join("").replace(/\.+$/, "").length;
					const at = i < nLetters ? P.at + i * P.stepMs : P.dotAt + (i - nLetters) * P.dotStepMs;
					const p = clamp01((ms - at) / P.riseMs);
					const dy = ms < at ? P.dy0 : P.dy0 * (1 - backOut(p, P.back));
					const c = clamp01((ms - at) / P.colourMs);
					const col = c < 0.6 ? mix(P.dim, P.tint, c / 0.6) : mix(P.tint, Q.white, (c - 0.6) / 0.4);
					return (
						<span
							key={i}
							style={{
								display: "inline-block",
								visibility: ms >= at ? "visible" : "hidden",
								color: rgbs(col),
								transform: `translateY(${dy.toFixed(2)}px)`,
							}}
						>
							{ch}
						</span>
					);
				})}
			</div>
		</div>
	);
}

// ── registry ──────────────────────────────────────────────────────────────

export const S1_PRESETS = {
	"sequoia-search-type": {
		note: "Opening search pill as UI: placeholder + segmented 'Search | Ask AI'; a big I-beam flies in rotating upright and clicks; the camera pushes in twice on LOG scale anchored on the pill's left edge (1x -> 2.03x -> 6.25x); words type on with the newest glyphs cyan; three whip-pans centre text+tile, tiles 1-2, tiles 1-3 while each rival tile slides in on an exponential; an accelerating lift (icons faster than the pill) carries into a hard cut. Camera geometry follows the measured copy width, so other copy re-frames itself.",
		nativeMs: 4060,
		params: {
			placeholder: ["string", "Search for...", "pill placeholder"],
			segments: ["array", '["Search","Ask AI"]', "segmented control, last is active"],
			typed: ["string", "We killed", "typed copy (user-voice)"],
			icons: ["array", '["dawn","navy","ember"]', "AppTile kinds that slide in after the text"],
			iconEnterMs: ["array", "[1843,2472,3020]", "per-tile slide-in start (scene ms)"],
			pans: [
				"array",
				"3 pans",
				"{at,dur,curve,from:'text'|i,to:i,centreX} — centre a span of the row",
			],
			push1: ["object", "{at:453,dur:672,to:2.03}", "first push (log scale, left-edge origin)"],
			push2: ["object", "{at:1128,dur:657,to:6.25,dx:37}", "second push"],
			lift: ["object", "{at:3633,k:9.18,pill:0.72,icons:1.32}", "exponential lift before the cut"],
			typeAtMs: ["number", 1300, "first typed glyph"],
			typeStepMs: ["number", 41, "per glyph"],
		},
		render: SearchType,
	},
	"sequoia-word-flow": {
		note: "Centred lines of big words, final layout fixed from frame one. Each word fades up from the ground travelling from (dx0,dy0) toward (0,dyHold); at `hl` a BLUE flash passes over it and it hops home; it settles white; at `out` it slides left (accelerating) and fades. blockKeys moves the whole block (e.g. making room for new lines). Lines: [[{text,at,hl?,out?,dx0?,dy0?,fadeMs?}]].",
		nativeMs: 2500,
		params: {
			lines: ["array", "[]", "[[{text,at,hl,out}...]...] scene ms"],
			size: ["number", 91.5, "font px (cap 65)"],
			pitch: ["number", 96, "line pitch px"],
			capTop: ["number", 142, "first line cap top at block offset 0"],
			blockKeys: ["array", "none", "[{at,y,curve?}] block y offset"],
			dx0: ["number", 0, "default entry x offset"],
			dy0: ["number", 0, "default entry y offset"],
			exit: ["object", "{ms:200,dx:-150,pow:1.2}", "exit slide"],
		},
		render: WordFlow,
	},
	"sequoia-trash-dock": {
		note: "Three rival tiles tossed up (exponential rise) and dropped (exponential fall) into a frosted bin that rises in from below; a glass tile blooms behind the bin, bin+tile shrink to dock scale, the tile widens into a dock whose icons pop in right-to-left; a hand hovers the spark tile (1.2x) and clicks. Ends on the frame the reference swaps to the 'Connect App' card.",
		nativeMs: 3430,
		params: {
			tossIcons: ["array", '["dawn","navy","ember"]', "AppTile kinds tossed into the bin"],
			dockIcons: ["array", "spark/mail/compass", "[{kind,at}] dock icons right-to-left"],
			hand: ["object", "measured path", "{at,keys:[{at,x,y,curve}],pressAt}"],
		},
		render: TrashDock,
	},
	"sequoia-button-cascade": {
		note: "Frosted 'Connect App +' glass cards (backdrop blur) multiplying: a fan stamps out BEHIND the first card up-left, a dragged chain stamps out in front up-right, then cards spawn everywhere with a springy pop while a hand roams; the camera drifts up then pulls away on an accelerating power law. Render twice: layer 'back' under the text, layer 'front' over it (carries the hand).",
		nativeMs: 1590,
		params: {
			label: ["string", "Connect App", "button copy"],
			layer: ["string", "front", "'back' | 'front'"],
			cards: ["array", "measured", "[{at,x,y,layer,from?|pop}]"],
		},
		render: ButtonCascade,
	},
	"sequoia-letter-rise": {
		note: "A word whose letters spring up one by one from below (backOut overshoot ~11px, crossing the line ~6 frames in), colour dim -> cyan-grey -> white, 48ms apart; leaves with a short accelerating slide left.",
		nativeMs: 1350,
		params: {
			text: ["string", "buttons...", "copy"],
			stepMs: ["number", 48, "per letter"],
			dy0: ["number", 90, "start below the line"],
		},
		render: LetterRise,
	},
};
