/**
 * sequoia-s6.jsx — section 6 presets (53.133-66.567s of the reference film).
 *
 * Measured off the full-decode 30fps frames (ref/f720, frame n = n/30 s);
 * every number below is in 1280x720 stage px. The passage is:
 *
 *   1594        the dark circle wipe's last frame (white corners left)
 *   1595-1716   benchmark chart: a glowing cyan line shoots in from the left
 *               and thickens into the lead bar while the camera pulls back
 *               2.08x -> 1.00x, grey bars grow in staggered, labels and
 *               values fade/rise in word by word; slow accelerating
 *               pull-back 1.00 -> 0.85 to the hard cut at 1717
 *   1717-1779   "Anything / you can do / in a (globe) browser" typed + risen
 *               in, then torn apart (words fly off, accelerating) leaving
 *               "(globe) browser"
 *   1780-1996   "(globe) browser" rises to centre -> swaps to mark + "Aside"
 *               -> "Aside / can do it for you" -> deleted to "can do" ->
 *               "can do (icon) sign in" with a drum of grey words that steps
 *               up item by item (accelerating) -> "presentations" deleted
 *               to its icon, which fills in and the camera pushes into it
 *
 * The film's recurring move ("lurch") is NOT a symmetric ease: a slow
 * power-curve lean-in for 4-7 frames, one frame that covers ~40-50% of the
 * travel, then a two-speed exponential settle. Measured on six moves
 * (block re-centre 57.27-57.67s, browser rise 59.47-59.97s, Aside rise
 * 61.10-61.40s, Aside slide 61.47-61.70s, sentence shift 62.43-62.90s,
 * "can do" slide 63.17-63.57s); see lurch().
 *
 * Every render is a pure function of t.
 */
import {
	CreditCard,
	FileText,
	Globe,
	LogIn,
	MessagesSquare,
	PanelsTopLeft,
	Video,
} from "lucide-react";
import React from "react";
import { FONT, kf, live, localMs, Q, rgbs, SequoiaMark } from "./sequoia-shared.jsx";

// ── motion helpers ─────────────────────────────────────────────────────────

/** Monotone cubic (Fritsch-Carlson) through [[x, v], ...] — measured traces. */
function spline(keys, x) {
	const n = keys.length;
	if (!n) return 0;
	if (x <= keys[0][0]) return keys[0][1];
	if (x >= keys[n - 1][0]) return keys[n - 1][1];
	const d = [];
	for (let i = 0; i < n - 1; i++)
		d.push((keys[i + 1][1] - keys[i][1]) / (keys[i + 1][0] - keys[i][0]));
	const m = [d[0]];
	for (let i = 1; i < n - 1; i++) {
		if (d[i - 1] * d[i] <= 0) m.push(0);
		else {
			const h0 = keys[i][0] - keys[i - 1][0];
			const h1 = keys[i + 1][0] - keys[i][0];
			m.push((3 * (h0 + h1)) / ((2 * h1 + h0) / d[i - 1] + (h1 + 2 * h0) / d[i]));
		}
	}
	m.push(d[n - 2]);
	let i = 0;
	while (i < n - 2 && x >= keys[i + 1][0]) i++;
	const h = keys[i + 1][0] - keys[i][0];
	const s = (x - keys[i][0]) / h;
	const s2 = s * s;
	const s3 = s2 * s;
	return (
		(2 * s3 - 3 * s2 + 1) * keys[i][1] +
		(s3 - 2 * s2 + s) * h * m[i] +
		(-2 * s3 + 3 * s2) * keys[i + 1][1] +
		(s3 - s2) * h * m[i + 1]
	);
}

/** Spline one channel out of multi-channel keys [[x, a, b, c], ...]. */
const chan = (keys, j, x) =>
	spline(
		keys.map((k) => [k[0], k[j]]),
		x,
	);

/**
 * lurch — the film's move, 0..1 over ms since its start. A power lean-in
 * reaching `a` at `ta` ms (exponent `pin`), then a two-speed exponential
 * settle: 1 - (1-a)(w e^{-x/t1} + (1-w) e^{-x/t2}). Snaps to 1 once the
 * residual is under 0.2% so holds are byte-still.
 * Fitted to the browser rise (59.47-59.97s): ta 210, a .37, pin 1.8,
 * w .6, t1 13, t2 83 — residual <= 1.5px on a 96px move.
 */
const LURCH = { ta: 210, a: 0.37, pin: 1.8, w: 0.6, t1: 13, t2: 83 };
function lurch(ms, o) {
	const p = { ...LURCH, ...(o ?? {}) };
	if (ms <= 0) return 0;
	if (ms < p.ta) return p.a * (ms / p.ta) ** p.pin;
	const x = ms - p.ta;
	const r = p.w * Math.exp(-x / p.t1) + (1 - p.w) * Math.exp(-x / p.t2);
	const v = 1 - (1 - p.a) * r;
	return 1 - v < 0.002 ? 1 : v;
}

/**
 * riseRem — REMAINING fraction (1 -> 0) of a word's rise into place. Measured
 * on "do" (57.77-58.27s: +33px, 21, 15, 12, 9, 7, 6, 5, 4, 3 ...) and "in a"
 * (58.00-58.40s: +36, 22, 16, 13, 10, 8, 7, 6, 5 ...): a fast drop and a long
 * tail, 0.4 e^{-n/0.8} + 0.6 e^{-n/5.2} in frames.
 */
const RISE = { w: 0.4, t1: 27, t2: 170 };
function riseRem(ms, o) {
	const p = { ...RISE, ...(o ?? {}) };
	if (ms <= 0) return 1;
	const r = p.w * Math.exp(-ms / p.t1) + (1 - p.w) * Math.exp(-ms / p.t2);
	return r < 0.003 ? 0 : r;
}

/** Accelerating 0..1 (exits): (x/dur)^pow, clamped. */
const accel = (ms, dur, pow = 2.6) => (ms <= 0 ? 0 : ms >= dur ? 1 : (ms / dur) ** pow);
/** Symmetric S, each half raised to pow. */
const inout = (ms, dur, pow = 2.5) => {
	if (ms <= 0) return 0;
	if (ms >= dur) return 1;
	const t = ms / dur;
	return t < 0.5 ? 2 ** (pow - 1) * t ** pow : 1 - (-2 * t + 2) ** pow / 2;
};

// ── type measurement (deterministic canvas metrics, same font as the SVG) ──

let _ctx = null;
const _mcache = new Map();
function measure(text, size, weight = 600) {
	const key = `${weight}|${size}|${text}`;
	const hit = _mcache.get(key);
	if (hit != null) return hit;
	if (!_ctx && typeof document !== "undefined")
		_ctx = document.createElement("canvas").getContext("2d");
	let w = text.length * size * 0.55;
	if (_ctx) {
		_ctx.font = `${weight} ${size}px ${FONT}`;
		w = _ctx.measureText(text).width;
	}
	_mcache.set(key, w);
	return w;
}

// ── glyphs ─────────────────────────────────────────────────────────────────

const LUCIDE = {
	globe: Globe,
	"sign-in": LogIn,
	messages: MessagesSquare,
	card: CreditCard,
	video: Video,
	doc: FileText,
	sheet: PanelsTopLeft,
};

/**
 * Two glyphs drawn locally (24-unit grid, round caps): "tools" (a desk cup
 * holding a pencil and a ruler — the reference's "company internal tools"
 * icon) and "presentation" (a board on a rod with a presenter in front),
 * which also has a FILLED form for the push-in (65.57s on: board solid,
 * presenter solid, a ground-coloured ring cut around the presenter).
 */
function LocalGlyph({ name, size, colour, stroke, filled = false }) {
	const c = rgbs(colour);
	if (name === "tools") {
		return (
			<svg
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill="none"
				stroke={c}
				strokeWidth={stroke}
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{ display: "block", overflow: "visible" }}
			>
				<path d="M2.6 12.2h18.8V19a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2z" />
				<path d="M7.2 12.2V6l2.3-3.2L11.8 6v6.2" />
				<path d="M14.6 12.2V4.1a1.2 1.2 0 0 1 1.2-1.2h1.8a1.2 1.2 0 0 1 1.2 1.2v8.1" />
			</svg>
		);
	}
	if (name === "presentation") {
		if (filled) {
			return (
				<svg
					width={size}
					height={size}
					viewBox="0 -0.32 24 24"
					style={{ display: "block", overflow: "visible" }}
				>
					<defs>
						<mask
							id="sq6-pres-mask"
							maskUnits="userSpaceOnUse"
							x="-2"
							y="-2"
							width="28"
							height="28"
						>
							<rect x="-2" y="-2" width="28" height="28" fill="#fff" />
							<circle cx="17.94" cy="11.2" r="5.28" fill="#000" />
							<path d="M10.6 24v-4.8c0-4.2 3.2-6.9 7.34-6.9s7.36 2.7 7.36 6.9V24z" fill="#000" />
						</mask>
					</defs>
					<g fill={c} mask="url(#sq6-pres-mask)">
						<rect x="0.55" y="2.95" width="20.55" height="2.1" rx="1.05" />
						<circle cx="10.96" cy="3.1" r="1.2" />
						<rect x="1.62" y="3.98" width="18.64" height="14" />
						<circle cx="20.7" cy="5.6" r="1" />
						<rect x="0.55" y="16.1" width="10.15" height="2.1" rx="1.05" />
					</g>
					<circle cx="17.94" cy="11.2" r="3.2" fill={c} />
					<rect x="16.7" y="13.2" width="2.5" height="2.2" fill={c} />
					<path
						d="M12.65 20.6v-1.2c0-3.1 2.35-5.2 5.29-5.2s5.26 2.1 5.26 5.2v1.2a.8.8 0 0 1-.8.8H13.45a.8.8 0 0 1-.8-.8z"
						fill={c}
					/>
				</svg>
			);
		}
		return (
			<svg
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill="none"
				stroke={c}
				strokeWidth={stroke}
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{ display: "block", overflow: "visible" }}
			>
				<path d="M1.85 4.4H19.6" />
				<path d="M10.9 3v1.4" />
				<path d="M19.6 4.4v1.2" />
				<path d="M1.85 4.4V18h6.8" />
				<circle cx="18.1" cy="12.4" r="2.1" />
				<path d="M14.1 20.8c0-2.6 1.8-4.1 4.03-4.1s4.02 1.5 4.02 4.1z" />
			</svg>
		);
	}
	return null;
}

/** Any s6 glyph by name. */
function Glyph({ name, size, colour = Q.white, stroke = 2.2, filled = false }) {
	const L = LUCIDE[name];
	if (L)
		return (
			<L
				size={size}
				color={rgbs(colour)}
				strokeWidth={stroke}
				style={{ display: "block", overflow: "visible" }}
			/>
		);
	return <LocalGlyph name={name} size={size} colour={colour} stroke={stroke} filled={filled} />;
}

/** Absolutely placed glyph box (left, top in stage px), optional scale about its centre. */
function GlyphAt({
	name,
	x,
	y,
	size,
	scale = 1,
	colour,
	stroke,
	filled,
	mark = false,
	opacity = 1,
}) {
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: size,
				height: size,
				opacity,
				transform: scale !== 1 ? `scale(${scale.toFixed(4)})` : undefined,
				transformOrigin: "50% 50%",
			}}
		>
			{mark ? (
				<SequoiaMark
					size={size * 0.905}
					colour={colour}
					style={{ position: "absolute", left: size * 0.0475, top: size * 0.0475 }}
				/>
			) : (
				<Glyph name={name} size={size} colour={colour} stroke={stroke} filled={filled} />
			)}
		</div>
	);
}

/** One run of text with its BASELINE at y (an SVG text in a full-frame svg). */
function TextRun({ text, x, y, size, weight, colour, opacity = 1 }) {
	return (
		<svg
			width={1280}
			height={720}
			style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity }}
		>
			<text
				x={x}
				y={y}
				fill={rgbs(colour)}
				style={{ font: `${weight} ${size}px ${FONT}`, whiteSpace: "pre" }}
			>
				{text}
			</text>
		</svg>
	);
}

// ── circle wipe tail ──────────────────────────────────────────────────────

/**
 * sequoia-circle-wipe — a ground-coloured disc growing over the other
 * ground. s6 owns one frame of it: at 53.133s (frame 1594) the s5 wipe is
 * still a disc at (625,368) r~700 with off-white corners; fully dark at
 * 53.167 (circle-fitted dark edge: r 554 -> 647 -> 700 over 1592-1594).
 */
function CircleWipe(cfg, t) {
	if (!live(cfg, t)) return null;
	const k = kf(cfg.keys ?? [{ at: 0, cx: 640, cy: 360, r: 800 }], localMs(cfg, t));
	return (
		<div
			style={{
				position: "absolute",
				left: k.cx - k.r,
				top: k.cy - k.r,
				width: k.r * 2,
				height: k.r * 2,
				borderRadius: "50%",
				background: rgbs(cfg.colour ?? Q.dark),
			}}
		/>
	);
}

// ── benchmark chart ───────────────────────────────────────────────────────

/** Word/char token entering: dim + low (+ right for digits), settling in ~4 frames. */
function tokStyle(ms, at, o = {}) {
	if (ms < at) return { opacity: 0 };
	const r = Math.exp(-(ms - at) / (o.tau ?? 45));
	const op = 1 - (1 - (o.from ?? 0.3)) * r;
	const dy = (o.dy ?? 0.2) * r;
	const dx = (o.dx ?? 0) * r;
	return { opacity: op, transform: `translate(${dx.toFixed(3)}em, ${dy.toFixed(3)}em)` };
}

/**
 * sequoia-bench-chart — the benchmark bar chart (53.13-57.23s).
 * Canvas = the layout at 54.933s (frame 1648, camera 1.000): bars from x 117,
 * top 250 + 80i, 60 tall, radius 8; title / subtitle 30px (cap 21) at
 * baselines 159 / 197; labels 24px in from the bar, values right-aligned at
 * 1164. The camera (one matrix on the whole canvas) is the measured trace:
 * 2.08x before 53.4s, an expo-out pull-back about ~(515,303) to 1.00 at
 * 54.93s (bar pitch and bar width measured every frame), then a slow
 * ACCELERATING pull-back to 0.849 at 57.20s (0.0014/f -> 0.0095/f).
 * The lead bar's own entry (a thin glowing line from the left that
 * thickens 5 -> 60 canvas px and rises 50px into its slot) is `lead`.
 */
function BenchChart(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const L = {
		x: 117,
		titleBase: 159,
		subBase: 197,
		top: 250,
		barH: 60,
		pitch: 80,
		maxW: 943,
		valueRight: 1164,
		pad: 24,
		font: 30,
		...(cfg.layout ?? {}),
	};
	const cam = cfg.camera ?? [[0, 1, 0, 0]];
	const s = chan(cam, 1, ms);
	const tx = chan(cam, 2, ms);
	const ty = chan(cam, 3, ms);
	const weight = cfg.weight ?? 600;
	const grey = cfg.greyAlpha ?? 0.5;
	const T = cfg.text ?? {};
	const rows = cfg.rows ?? [];
	const lead = cfg.lead ?? [[0, L.x + L.maxW, L.top + L.barH / 2, L.barH]];
	const glow = cfg.glow ?? [53, 196, 240];
	const words = (str) => (str ?? "").split(" ").filter(Boolean);

	const head = (list, at, stagger, colour, base, key) => (
		<div
			key={key}
			style={{
				position: "absolute",
				left: L.x - 3,
				top: base - L.font * 0.93,
				display: "flex",
				gap: `0 ${(L.font * 0.27).toFixed(2)}px`,
				font: `${weight} ${L.font}px ${FONT}`,
				lineHeight: `${L.font * 1.2}px`,
				color: colour,
				whiteSpace: "nowrap",
			}}
		>
			{list.map((w, i) => (
				<span
					key={`${w}-${i}`}
					style={{ display: "inline-block", ...tokStyle(ms, at + i * stagger) }}
				>
					{w}
				</span>
			))}
		</div>
	);

	// the lead bar renders LAST so its glow washes over the grey rows (they read cyan-tinted
	// next to it: [52,67,70] under the lead vs [50,52,49] further down at 55.0s)
	const bars = rows.map((row, i) => {
		let width;
		let y = L.top + i * L.pitch;
		let h = L.barH;
		if (i === 0) {
			const R = chan(lead, 1, ms);
			const cy = chan(lead, 2, ms);
			h = chan(lead, 3, ms);
			width = Math.max(0, R - L.x);
			y = cy - h / 2;
		} else {
			const g = row.grow ?? {};
			width = (row.fill ?? 1) * L.maxW * lurch(ms - (g.at ?? 0), g);
			if (width <= 0.5) return null;
		}
		const hi = !!row.highlight;
		return (
			<div
				key={`bar-${i}`}
				style={{
					position: "absolute",
					left: L.x,
					top: y,
					width,
					height: h,
					borderRadius: Math.min(8, h / 2, width / 2),
					background: hi
						? "linear-gradient(90deg, rgb(50,178,230) 0%, rgb(53,193,236) 55%, rgb(55,206,238) 100%)"
						: rgbs(cfg.barColour ?? [52, 54, 51]),
					boxShadow: hi
						? `0 0 14px 1px ${rgbs(glow, 0.55)}, 0 0 46px 6px ${rgbs(glow, 0.22)}, 0 0 110px 24px ${rgbs(glow, 0.07)}, 0 0 260px 70px ${rgbs(glow, 0.05)}`
						: "0 2px 6px rgba(0,0,0,0.12)",
				}}
			/>
		);
	});

	// the thin line's head carries its own halo while the bar is still a line
	// (53.10-53.40s: a ~40px cyan bloom at the tip, gone once it thickens)
	const fl = cfg.flare ? chan(cfg.flare, 1, ms) : 0;
	const flare =
		fl > 0.003 ? (
			<div
				key="flare"
				style={{
					position: "absolute",
					left: chan(lead, 1, ms) - (cfg.flareR ?? 26),
					top: chan(lead, 2, ms) - (cfg.flareR ?? 26),
					width: (cfg.flareR ?? 26) * 2,
					height: (cfg.flareR ?? 26) * 2,
					borderRadius: "50%",
					background: `radial-gradient(circle, ${rgbs(glow, fl)} 0%, ${rgbs(glow, fl * 0.4)} 30%, ${rgbs(glow, fl * 0.12)} 62%, ${rgbs(glow, 0)} 100%)`,
				}}
			/>
		) : null;

	// a broad flat cyan haze around the line while it is still thin (53.20-53.97s:
	// ground lifts to [37,45,47] over most of the frame, gone by 54.07s)
	const hz = cfg.haze ? chan(cfg.haze, 1, ms) : 0;
	const haze =
		hz > 0.002 ? (
			<div
				key="haze"
				style={{
					position: "absolute",
					left: L.x - 260,
					width: L.maxW + 620,
					top: chan(lead, 2, ms) - 150,
					height: 300,
					background: `radial-gradient(closest-side, ${rgbs(glow, hz)} 0%, ${rgbs(glow, hz)} 62%, ${rgbs(glow, 0)} 100%)`,
				}}
			/>
		) : null;

	const labels = rows.map((row, i) => {
		const top = L.top + i * L.pitch;
		const at = (T.rowsAt ?? [])[i] ?? 0;
		const st = T.wordStagger ?? 133;
		const toks = [
			...words(row.name).map((w) => ({ w, grey: false })),
			...(row.sep ? [{ w: row.sep, grey: false, sep: true }] : []),
			...words(row.suffix).map((w) => ({ w, grey: true })),
		];
		const vAt = at + (T.valueDelay ?? 67);
		const cst = T.charStagger ?? 100;
		const valueCol = row.highlight ? rgbs(cfg.valueAccent ?? [94, 192, 248]) : rgbs(Q.white);
		return (
			<React.Fragment key={`lab-${i}`}>
				<div
					style={{
						position: "absolute",
						left: L.x + L.pad,
						top,
						height: L.barH,
						display: "flex",
						alignItems: "center",
						font: `${weight} ${L.font}px ${FONT}`,
						color: rgbs(Q.white),
						whiteSpace: "nowrap",
					}}
				>
					{toks.map((tk, j) => (
						<span
							key={`${tk.w}-${j}`}
							style={{
								display: "inline-block",
								marginLeft:
									j === 0
										? 0
										: tk.sep
											? L.font * 0.1
											: toks[j - 1].sep
												? L.font * 0.12
												: L.font * 0.27,
								color: tk.grey ? `rgba(255,255,255,${grey})` : undefined,
								fontWeight: tk.sep ? 300 : undefined,
								...tokStyle(ms, at + j * st),
							}}
						>
							{tk.w}
						</span>
					))}
				</div>
				<div
					style={{
						position: "absolute",
						right: 1280 - L.valueRight,
						top,
						height: L.barH,
						display: "flex",
						alignItems: "center",
						font: `${weight} ${L.font}px ${FONT}`,
						color: valueCol,
						whiteSpace: "nowrap",
					}}
				>
					{[...(row.value ?? "")].map((ch, j) => (
						<span
							key={`${ch}-${j}`}
							style={{ display: "inline-block", ...tokStyle(ms, vAt + j * cst, { dx: 0.3 }) }}
						>
							{ch}
						</span>
					))}
				</div>
			</React.Fragment>
		);
	});

	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1280,
				height: 720,
				transformOrigin: "0 0",
				transform: `matrix(${s.toFixed(5)},0,0,${s.toFixed(5)},${tx.toFixed(3)},${ty.toFixed(3)})`,
			}}
		>
			{haze}
			{flare}
			{bars.slice(1)}
			{bars[0]}
			{head(
				words(cfg.title),
				T.titleAt ?? 0,
				T.titleStagger ?? 133,
				rgbs(Q.white),
				L.titleBase,
				"title",
			)}
			{head(
				words(cfg.subtitle),
				T.subAt ?? 0,
				T.subStagger ?? 50,
				`rgba(255,255,255,${cfg.subAlpha ?? 0.54})`,
				L.subBase,
				"sub",
			)}
			{labels}
		</div>
	);
}

// ── shared big-type layout ─────────────────────────────────────────────────

/** Width of a token: optional leading icon box + space, then its text. */
function tokWidth(tok, P, text) {
	const sp = measure(" ", P.size, P.weight);
	const tw = text ? measure(text, P.size, P.weight) : 0;
	return (tok.icon ? P.size * P.iconK + (text ? sp + P.iconGap : 0) : 0) + tw;
}

/** Draw one token at pen x (left), baseline y. */
function drawTok(key, tok, text, x, y, P) {
	const sp = measure(" ", P.size, P.weight);
	const box = P.size * P.iconK;
	const out = [];
	let pen = x;
	if (tok.icon) {
		out.push(
			<GlyphAt
				key={`${key}-i`}
				name={tok.icon}
				mark={tok.icon === "mark"}
				x={pen}
				y={y - P.iconLift - box / 2}
				size={box}
				colour={P.colour}
				stroke={P.stroke}
			/>,
		);
		pen += box + sp + P.iconGap;
	}
	if (text)
		out.push(
			<TextRun
				key={`${key}-t`}
				text={text}
				x={pen}
				y={y}
				size={P.size}
				weight={P.weight}
				colour={P.colour}
			/>,
		);
	return out;
}

// iconGap: the space after an inline icon is 7px tighter than a word space (measured 29px glyph-to-glyph at 58.7s)
const TYPE = {
	size: 90,
	weight: 600,
	colour: Q.white,
	iconK: 0.93,
	iconLift: 31.5,
	iconGap: -7,
	stroke: 2,
	centreX: 640,
};

// ── type stack ("Anything you can do in a browser") ───────────────────────

/**
 * sequoia-type-stack — centred lines of big type that build up and then tear
 * apart (57.23-59.33s). Measured: line 1 TYPES at 0,100,167,233,300,367,433,
 * 533ms and stays centred on its visible letters; later tokens appear whole
 * and RISE (+31..36px, fast drop + long tail, riseRem) into lines laid out
 * for their full content. The block starts 85px low (one line, centred) and
 * lurches up when line 2 lands. Exits are per token: accelerating slides
 * (in a: -71px over 167ms ^2.7; you can: -19px; do: +23px; Anything: -23px)
 * and a hard vanish; the last line re-centres on what is left (lurch).
 */
function TypeStack(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const P = { ...TYPE, ...(cfg.type ?? {}) };
	const sp = measure(" ", P.size, P.weight);
	const blk = cfg.block ?? null;
	const blockDy = blk ? (blk.from ?? 0) * (1 - lurch(ms - (blk.at ?? 0), blk)) : 0;
	const out = [];
	(cfg.lines ?? []).forEach((line, li) => {
		const toks = line.tokens ?? [];
		const byVis = line.centre === "visible";
		const vis = toks.map((tk) => {
			if (tk.typeMs) {
				const n = tk.typeMs.filter((m) => ms >= m).length;
				return n > 0 ? tk.text.slice(0, n) : null;
			}
			return ms >= (tk.at ?? 0) ? tk.text : null;
		});
		const widths = toks.map((tk, i) => tokWidth(tk, P, byVis ? (vis[i] ?? "") : tk.text));
		const counted = toks.map((_, i) => !byVis || vis[i] != null);
		const n = counted.filter(Boolean).length;
		const W = widths.reduce((a, w, i) => a + (counted[i] ? w : 0), 0) + sp * Math.max(0, n - 1);
		const xs = [];
		let pen = P.centreX - W / 2;
		toks.forEach((_, i) => {
			xs.push(pen);
			if (counted[i]) pen += widths[i] + sp;
		});
		// re-centre on the tokens that remain once `without` have flown off
		let shift = 0;
		if (line.recentre) {
			const rc = line.recentre;
			const keep = toks.map((_, i) => i).filter((i) => !(rc.without ?? []).includes(i));
			const kl = xs[keep[0]];
			const kr = xs[keep[keep.length - 1]] + widths[keep[keep.length - 1]];
			shift = (P.centreX - (kl + kr) / 2) * lurch(ms - rc.at, rc);
		}
		toks.forEach((tk, i) => {
			const text = vis[i];
			if (text == null) return;
			const ex = tk.exit;
			if (ex && ms >= ex.hideAt) return;
			// tokens that fly off are not carried by the re-centre; `dx` is a per-line optical nudge
			let dx = (line.dx ?? 0) + ((line.recentre?.without ?? []).includes(i) ? 0 : shift);
			let dy = blockDy;
			if (tk.rise) dy += tk.rise * riseRem(ms - (tk.at ?? 0), tk.riseShape);
			if (ex) {
				const e = accel(ms - ex.at, ex.dur ?? 167, ex.pow ?? 2.6);
				dx += (ex.dx ?? 0) * e;
				dy += (ex.dy ?? 0) * e;
			}
			out.push(...drawTok(`l${li}t${i}`, tk, text, xs[i] + dx, line.base + dy, P));
		});
	});
	return <div style={{ position: "absolute", inset: 0 }}>{out}</div>;
}

// ── can-do drum ───────────────────────────────────────────────────────────

/** `text` after deleting one non-space char at each time in `times` (trailing spaces trimmed). */
function deleted(text, times, ms) {
	const n = times.filter((m) => ms >= m).length;
	let s = text;
	for (let k = 0; k < n && s.length; k++)
		s = s.replace(/\s+$/, "").slice(0, -1).replace(/\s+$/, "");
	return s;
}

/**
 * sequoia-cando-drum — 59.33-66.57s: the lockup that survives the type stack
 * rises to centre, swaps its icon+word for the brand mark+name, steps up a
 * line for the claim, the claim deletes back to its stem, the stem slides
 * left and a word DRUM rolls through what the product can do (hard steps at
 * accelerating intervals: 433, 233, 200, 133, 133, 67, 67ms), then the last
 * word deletes back to its icon and the camera pushes into it (measured scale
 * trace; the icon swaps to its filled form on the push's first frame).
 */
function CanDoDrum(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const P = { ...TYPE, ...(cfg.type ?? {}) };
	const sp = measure(" ", P.size, P.weight);
	const box = P.size * P.iconK;
	const out = [];

	// 1. lockup: icon + word, rising, swapping, rising, sliding, leaving
	const K = cfg.lockup ?? {};
	if (!(K.exit && ms >= K.exit.hideAt)) {
		const swapped = ms >= (K.swapAt ?? 1e9);
		const wA = tokWidth({ icon: K.icon }, P, K.word);
		const wB = tokWidth({ icon: "mark" }, P, K.swapWord);
		const leftA = P.centreX - wA / 2;
		const leftB = P.centreX - wB / 2 + (K.slide?.biasX ?? 0);
		const left =
			swapped && K.slide ? leftA + (leftB - leftA) * lurch(ms - K.slide.at, K.slide) : leftA;
		let base = K.base0 ?? 482;
		for (const r of K.rises ?? []) base += (r.to - base) * lurch(ms - r.at, r);
		if (K.exit)
			base += (K.exit.dy ?? 0) * accel(ms - K.exit.at, K.exit.dur ?? 300, K.exit.pow ?? 2.6);
		// icon: shrinks before the swap, the mark pops in after it
		let iscale = 1;
		if (!swapped && K.shrink)
			iscale =
				1 - (1 - K.shrink.to) * accel(ms - K.shrink.at, K.shrink.dur ?? 133, K.shrink.pow ?? 2);
		if (swapped && K.pop)
			iscale = 1 - (1 - K.pop.from) * Math.exp(-(ms - K.swapAt) / (K.pop.tau ?? 45));
		out.push(
			<GlyphAt
				key="lk-i"
				name={K.icon}
				mark={swapped}
				x={left}
				y={base - P.iconLift - box / 2}
				size={box}
				scale={iscale}
				colour={P.colour}
				stroke={P.stroke}
			/>,
		);
		out.push(
			<TextRun
				key="lk-t"
				text={swapped ? K.swapWord : K.word}
				x={left + box + sp + P.iconGap}
				y={base}
				size={P.size}
				weight={P.weight}
				colour={P.colour}
			/>,
		);
	}

	// 2. the claim line, deleted back to its stem; the stem then slides into the drum row
	const S = cfg.sentence ?? {};
	const D = cfg.drum ?? {};
	const O = cfg.outro ?? {};
	const items = D.items ?? [];
	const stem = S.keep ?? "";
	const stemW = measure(stem, P.size, P.weight);
	const dBox = P.size * (D.iconK ?? P.iconK);
	const colX = D.colX ?? P.centreX + 5;
	const dIconLeft = colX - (D.gapR ?? 27) - dBox;
	const rowStemLeft = dIconLeft - (D.gapL ?? 17) - stemW;
	if (ms >= (S.at ?? 1e9) && !(S.exit && ms >= S.exit.hideAt)) {
		const text = deleted(S.text, S.delMs ?? [], ms);
		const left0 = P.centreX - measure(S.text, P.size, P.weight) / 2;
		const stemLeft = P.centreX - stemW / 2 + (S.shift?.biasX ?? 0);
		let left = left0 + (stemLeft - left0) * (S.shift ? lurch(ms - S.shift.at, S.shift) : 0);
		if (S.slide) left += (rowStemLeft - stemLeft) * lurch(ms - S.slide.at, S.slide);
		let base = (S.base ?? 392) + (S.rise ?? 0) * riseRem(ms - S.at, S.riseShape);
		if (S.exit)
			base += (S.exit.dy ?? 0) * accel(ms - S.exit.at, S.exit.dur ?? 133, S.exit.pow ?? 2.6);
		out.push(
			<TextRun
				key="sn"
				text={text}
				x={left}
				y={base}
				size={P.size}
				weight={P.weight}
				colour={P.colour}
			/>,
		);
	}

	// 3. the drum: icon + active item (white) + the rest of the list (grey) below
	if (ms >= (D.at ?? 1e9) && items.length) {
		const steps = D.stepsAt ?? [];
		let active = 0;
		for (let k = 0; k < steps.length; k++) if (ms >= steps[k]) active = k + 1;
		active = Math.min(active, items.length - 1);
		const stepAt = active === 0 ? D.at : steps[active - 1];
		const pitch = D.pitch ?? 91;
		const base = D.base ?? 391;
		const enter = (D.enterDx ?? 0) * Math.exp(-(ms - D.at) / (D.enterTau ?? 90));
		// outro: the group (icon + last word) re-centres on the icon while the word deletes
		const grp = O.recentre
			? inout(ms - O.recentre.at, O.recentre.dur ?? 433, O.recentre.pow ?? 2.5)
			: 0;
		const gdx = (P.centreX + (O.recentre?.biasX ?? 0) - (dIconLeft + dBox / 2)) * grp;
		let y = base;
		items.forEach((item, i) => {
			if (i < active) return;
			const isAct = i === active;
			for (const ln of item.text.split("\n")) {
				const text = isAct && i === items.length - 1 && O.delMs ? deleted(ln, O.delMs, ms) : ln;
				if (text && y < 720 + pitch)
					out.push(
						<TextRun
							key={`d${i}-${y}`}
							text={text}
							x={colX + enter + gdx}
							y={y}
							size={P.size}
							weight={P.weight}
							colour={P.colour}
							opacity={isAct ? 1 : (D.greyAlpha ?? 0.1)}
						/>,
					);
				y += pitch;
			}
		});
		// icon (pops on each step); in the outro it fills and is pushed into
		const pop = 1 - (1 - (D.popFrom ?? 0.88)) * Math.exp(-(ms - stepAt) / (D.popTau ?? 40));
		let scale = pop;
		let cx = dIconLeft + dBox / 2 + gdx + enter * (D.iconEnterK ?? 0.5);
		let filled = false;
		if (O.push && ms >= O.push[0][0]) {
			scale = chan(O.push, 1, ms);
			cx = P.centreX + chan(O.push, 2, ms);
			filled = ms >= (O.filledAt ?? 1e9);
		}
		const cy = base - (D.iconLift ?? 24.5);
		out.push(
			<GlyphAt
				key="d-icon"
				name={items[active].icon}
				x={cx - dBox / 2}
				y={cy - dBox / 2}
				size={dBox}
				scale={scale}
				colour={P.colour}
				stroke={D.stroke ?? 2.2}
				filled={filled}
			/>,
		);
	}
	return <div style={{ position: "absolute", inset: 0 }}>{out}</div>;
}

// ── registry ──────────────────────────────────────────────────────────────

export const S6_PRESETS = {
	"sequoia-circle-wipe": {
		note: "A ground-coloured disc over the other ground — a circle wipe's geometry keyed per frame ({at, cx, cy, r}, kf-interpolated). s6 uses it for the single frame (53.133s) where the s5 wipe still shows off-white corners.",
		nativeMs: 400,
		params: {
			keys: ["array", "[{at:0,cx:640,cy:360,r:800}]", "scene-relative disc keys"],
			colour: ["rgb", [38, 40, 37], "disc colour"],
		},
		render: CircleWipe,
	},
	"sequoia-bench-chart": {
		note: "Benchmark bar chart that sweeps in: the lead bar is a glowing line shooting in from the left and thickening into place under a pull-back camera, grey bars grow in staggered (lurch), title/labels fade+rise in word by word and values digit by digit. Camera + lead entry are measured key traces ([ms, ...] monotone cubic). Measured 53.13-57.23s.",
		nativeMs: 4100,
		params: {
			title: ["string", "Browsing Agent Benchmark", "white heading"],
			subtitle: ["string", "", "grey sub-heading"],
			rows: [
				"array",
				[],
				"[{name, sep?, suffix?, value, fill (0..1 of the lead width), highlight?, grow:{at, ta, a, pin, w, t1, t2}}]",
			],
			camera: ["array", [], "[[ms, scale, tx, ty]] — screen = scale*canvas + t"],
			lead: ["array", [], "[[ms, right, centreY, thickness]] lead-bar entry in canvas px"],
			text: [
				"object",
				{},
				"{titleAt, titleStagger, subAt, subStagger, rowsAt[], wordStagger, valueDelay, charStagger}",
			],
			layout: [
				"object",
				{},
				"{x, titleBase, subBase, top, barH, pitch, maxW, valueRight, pad, font}",
			],
		},
		render: BenchChart,
	},
	"sequoia-type-stack": {
		note: "Centred lines of big type built up token by token — typed letters (centred on what is visible), whole words rising in (fast drop + long tail) — with a block lurch when line 2 lands, then torn apart: per-token accelerating exits + hard vanish, and a line re-centring on what remains. Measured 57.23-59.33s.",
		nativeMs: 2100,
		params: {
			lines: [
				"array",
				[],
				"[{base, dx?, centre:'visible'|'all', tokens:[{text, icon?, at, typeMs?, rise?, exit:{at,dx,dy,dur,pow,hideAt}}], recentre:{at, without[], ...lurch}}]",
			],
			block: ["object", null, "{from (px low), at, ...lurch} — whole block offset"],
			type: ["object", {}, "{size 90, weight 600, iconK .93, iconLift 31.5, centreX 640}"],
		},
		render: TypeStack,
	},
	"sequoia-cando-drum": {
		note: "The 'X can do <drum>' passage: a lockup (icon+word) rises to centre and swaps to mark+brand, a claim line rises under it and deletes back to its stem, the stem slides left and a drum of capabilities steps up (white active item + icon, grey list below), then the last item deletes to its icon which fills and is pushed into (measured scale trace). Measured 59.33-66.57s.",
		nativeMs: 7234,
		params: {
			lockup: [
				"object",
				{},
				"{icon, word, swapWord, swapAt, base0, rises:[{at,to,...lurch}], shrink, pop, slide:{at,biasX,...lurch}, exit:{at,dy,dur,pow,hideAt}}",
			],
			sentence: [
				"object",
				{},
				"{text, keep, at, base, rise, delMs[], shift:{at,biasX,...lurch}, slide:{at,...lurch}, exit}",
			],
			drum: [
				"object",
				{},
				"{at, items:[{icon,text ('\\n' wraps)}], stepsAt[], colX, gapL, gapR, pitch, base, greyAlpha, popFrom, enterDx}",
			],
			outro: [
				"object",
				{},
				"{delMs[], recentre:{at,dur,pow,biasX}, push:[[ms,scale,dxFromCentre]], filledAt}",
			],
		},
		render: CanDoDrum,
	},
};
