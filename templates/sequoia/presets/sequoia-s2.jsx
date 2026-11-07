/**
 * sequoia-s2.jsx — section 2 presets (film clock 10.200 – 21.267s).
 *
 * Measured off the reference at 1280x720 / 30fps (frame n = n/30s; numbers
 * below are stage px). Full trace in .demo-build/.../sections/s2/notes.md.
 *
 *   sequoia-refusal-chat   "Then," + a dark composer that swooshes in from the
 *                          right with the line typed in word by word, a second
 *                          pan that pushes "Then," out, the line deleted word
 *                          by word while the composer shrinks to "Ask AI...",
 *                          the question + refusal rows stacking above it, the
 *                          dock scaling in, a hand cursor dragging the AI app
 *                          out of the dock and the whole chat following it
 *                          into the trash like a rope. Ends on the hand
 *                          clicking the product's dock icon.
 *   sequoia-type-center    one centred word typed on letter by letter
 *                          ("Introducing"), recentring on every letter.
 *   sequoia-light-curtain  the product icon un-minimises (reverse genie) into
 *                          a full-frame fluted-glass "light curtain", the
 *                          wordmark fades in letter by letter behind the glass,
 *                          punches up, settles, then everything washes to the
 *                          off-white ground.
 *
 * All three are pure functions of t. The spring "rope" is a fixed-step
 * simulation integrated from its start time on every call (deterministic).
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import { AppTile, FONT, HandCursor, Icon, kf, live, localMs, Q, rgbs } from "./sequoia-shared.jsx";

// ── helpers ──────────────────────────────────────────────────────────────

/**
 * Monotone cubic (Fritsch–Carlson) through measured [x, y] samples. Used for
 * the swoosh pans and the composer resize, whose per-frame curves were read
 * straight off the reference (asymmetric: slow start, a 1-2 frame velocity
 * peak, long exponential tail) — no named ease fits them.
 */
function mono(pts) {
	const n = pts.length;
	const xs = pts.map((p) => p[0]);
	const ys = pts.map((p) => p[1]);
	const d = [];
	for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-9, xs[i + 1] - xs[i]));
	const m = new Array(n);
	m[0] = d[0] ?? 0;
	m[n - 1] = d[n - 2] ?? 0;
	for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
	for (let i = 0; i < n - 1; i++) {
		if (d[i] === 0) {
			m[i] = 0;
			m[i + 1] = 0;
			continue;
		}
		const a = m[i] / d[i];
		const b = m[i + 1] / d[i];
		const h = a * a + b * b;
		if (h > 9) {
			const tau = 3 / Math.sqrt(h);
			m[i] = tau * a * d[i];
			m[i + 1] = tau * b * d[i];
		}
	}
	return (x) => {
		if (x <= xs[0]) return ys[0];
		if (x >= xs[n - 1]) return ys[n - 1];
		let i = 0;
		while (i < n - 2 && x > xs[i + 1]) i++;
		const h = xs[i + 1] - xs[i];
		const s = (x - xs[i]) / h;
		const s2 = s * s;
		const s3 = s2 * s;
		return (
			(2 * s3 - 3 * s2 + 1) * ys[i] +
			(s3 - 2 * s2 + s) * h * m[i] +
			(-2 * s3 + 3 * s2) * ys[i + 1] +
			(s3 - s2) * h * m[i + 1]
		);
	};
}

/**
 * Word deletion starts (scene ms): each word greys for one frame and is gone
 * 30ms later — they 13.233, stop 13.267, when 13.300, it 13.367, gets 13.400,
 * real 13.433 (film s, measured gone-frames).
 */
const DELETE_MS = [3003, 3037, 3070, 3137, 3170, 3203];

/** Absolute film seconds -> ms relative to a scene starting at `base` s. */
const rel = (base) => (pts) => pts.map(([s, v]) => [Math.round(s * 1000 - base * 1000), v]);
const R2 = rel(10.2);

const ramp = (ms, a, b) => clamp01((ms - a) / Math.max(1e-6, b - a));
const smooth = (p) => p * p * (3 - 2 * p);
const mix = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));

/** Deterministic hash -> [0,1). */
const hash = (i, seed = 1) => {
	const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
	return x - Math.floor(x);
};

// ── measured tables (film seconds -> stage px), section 2 ────────────────

/** "Then" T-left. Enters +42px/opacity 0 at 10.20, settles by 10.53 (exp). */
const LEAD_IN = R2([
	[10.2, 583],
	[10.233, 570],
	[10.267, 556],
	[10.3, 550],
	[10.333, 547],
	[10.367, 545],
	[10.4, 543],
	[10.467, 542],
	[10.533, 541],
]);
/** Pan 1, 11.10 -> 12.03: "Then" 541 -> 91 (peak 75px/frame at 11.52). */
const LEAD_PAN1 = R2([
	[11.067, 541],
	[11.1, 540],
	[11.133, 539],
	[11.167, 537],
	[11.2, 534],
	[11.233, 530],
	[11.267, 525],
	[11.3, 519],
	[11.333, 511],
	[11.367, 501],
	[11.4, 487],
	[11.433, 469],
	[11.467, 444],
	[11.5, 403],
	[11.533, 328],
	[11.567, 243],
	[11.6, 196],
	[11.633, 168],
	[11.667, 148],
	[11.7, 134],
	[11.733, 123],
	[11.767, 115],
	[11.8, 108],
	[11.833, 103],
	[11.867, 99],
	[11.9, 96],
	[11.933, 94],
	[11.967, 92],
	[12.0, 91],
	[12.033, 90],
]);
/** Composer left edge, pan 1 (enters from x=1280, 198px/frame peak at 11.52). */
const COMP_PAN1 = R2([
	[11.1, 1282],
	[11.133, 1271],
	[11.167, 1265],
	[11.2, 1258],
	[11.233, 1248],
	[11.267, 1236],
	[11.3, 1222],
	[11.333, 1204],
	[11.367, 1180],
	[11.4, 1150],
	[11.433, 1109],
	[11.467, 1049],
	[11.5, 946],
	[11.533, 748],
	[11.567, 606],
	[11.6, 533],
	[11.633, 487],
	[11.667, 454],
	[11.7, 429],
	[11.733, 410],
	[11.767, 395],
	[11.8, 383],
	[11.833, 374],
	[11.867, 367],
	[11.9, 362],
	[11.933, 358],
	[11.967, 355],
	[12.0, 353],
	[12.033, 352],
]);
/** Composer left edge, pan 2, 12.27 -> 13.07: 352 -> 242 (centred). */
const COMP_PAN2 = R2([
	[12.267, 352],
	[12.3, 351],
	[12.367, 350],
	[12.4, 349],
	[12.433, 348],
	[12.467, 346],
	[12.5, 344],
	[12.533, 341],
	[12.567, 337],
	[12.6, 332],
	[12.633, 324],
	[12.667, 312],
	[12.7, 291],
	[12.733, 274],
	[12.767, 265],
	[12.8, 259],
	[12.833, 255],
	[12.867, 252],
	[12.9, 249],
	[12.933, 248],
	[12.967, 246],
	[13.0, 245],
	[13.033, 244],
	[13.1, 242],
]);
/** Composer top while the line is deleted: 320 -> 555 (13.10 -> 13.93). */
const COMP_SHRINK = R2([
	[13.1, 320],
	[13.133, 322],
	[13.167, 324],
	[13.2, 326],
	[13.233, 330],
	[13.267, 334],
	[13.3, 339],
	[13.333, 346],
	[13.367, 356],
	[13.4, 370],
	[13.433, 392],
	[13.467, 430],
	[13.5, 472],
	[13.533, 496],
	[13.567, 512],
	[13.6, 522],
	[13.633, 530],
	[13.667, 536],
	[13.7, 540],
	[13.733, 544],
	[13.767, 546],
	[13.8, 549],
	[13.833, 550],
	[13.867, 551],
	[13.9, 552],
	[13.933, 553],
]);
/** Whole stack lifts as the dock arrives: composer top 553 -> 386 (15.07 -> 15.63). */
const STACK_RISE = R2([
	[15.067, 0],
	[15.1, -1],
	[15.133, -3],
	[15.167, -5],
	[15.2, -8],
	[15.233, -13],
	[15.267, -21],
	[15.3, -32],
	[15.333, -51],
	[15.367, -86],
	[15.4, -119],
	[15.433, -137],
	[15.467, -148],
	[15.5, -155],
	[15.533, -160],
	[15.567, -163],
	[15.6, -165],
	[15.633, -167],
]);

// ── dock icon ("light curtain" tile) and curtain texture ─────────────────

/**
 * The curtain texture, measured at 19.5s: a vertical colour ramp (sampled
 * down x=680..760), a coloured horizontal light profile (rows 100-200, per
 * channel, multiplied) and 14 fluted-glass bands of 91.4px whose brightness
 * ramps up across each band (x0.72 -> x1.0 multiply). Returned as CSS
 * background layers so it can be squeezed into dock tiles and genie strips.
 */
const CURTAIN_V = [
	[0, [166, 207, 216]],
	[4, [163, 205, 214]],
	[8, [151, 199, 211]],
	[14, [137, 191, 205]],
	[21, [117, 179, 197]],
	[28, [96, 163, 184]],
	[35, [74, 144, 171]],
	[42, [55, 122, 152]],
	[49, [42, 99, 130]],
	[56, [33, 78, 110]],
	[62, [26, 60, 89]],
	[69, [19, 42, 66]],
	[76, [12, 30, 45]],
	[83, [8, 21, 33]],
	[90, [6, 17, 25]],
	[100, [4, 12, 18]],
];
const CURTAIN_H = [
	[0, [0.34, 0.53, 0.65]],
	[5, [0.45, 0.62, 0.72]],
	[10, [0.49, 0.67, 0.75]],
	[15, [0.57, 0.73, 0.8]],
	[20, [0.76, 0.84, 0.88]],
	[25, [0.84, 0.88, 0.91]],
	[30, [0.83, 0.87, 0.9]],
	[35, [0.74, 0.83, 0.87]],
	[40, [0.9, 0.91, 0.93]],
	[45, [0.95, 0.95, 0.96]],
	[50, [0.94, 0.97, 0.97]],
	[55, [0.99, 1, 1]],
	[60, [0.97, 1, 1]],
	[65, [0.85, 0.96, 0.98]],
	[70, [0.82, 0.95, 0.97]],
	[75, [0.77, 0.93, 0.96]],
	[80, [0.69, 0.89, 0.93]],
	[85, [0.6, 0.83, 0.89]],
	[90, [0.55, 0.79, 0.85]],
	[100, [0.5, 0.74, 0.8]],
];
function curtainLayers(bands = 14, seed = 3) {
	const v = `linear-gradient(180deg, ${CURTAIN_V.map(([p, c]) => `${rgbs(c)} ${p}%`).join(", ")})`;
	const h = `linear-gradient(90deg, ${CURTAIN_H.map(([p, c]) => `${rgbs(c.map((x) => Math.min(255, x * 255)))} ${p}%`).join(", ")})`;
	const st = [];
	for (let i = 0; i < bands; i++) {
		const a = (i / bands) * 100;
		const b = ((i + 1) / bands) * 100;
		const lo = 212 + Math.round(hash(i, seed) * 20);
		st.push(
			`rgb(${lo},${lo},${lo}) ${a.toFixed(3)}%`,
			`rgb(255,255,255) ${(b - 0.05).toFixed(3)}%`,
		);
	}
	const f = `linear-gradient(90deg, ${st.join(", ")})`;
	return { image: `${f}, ${h}, ${v}`, blend: "multiply, multiply, normal" };
}
const CURTAIN = curtainLayers();
const CURTAIN_TILE = curtainLayers(4, 5);

function CurtainTile({ size, radius = 0.225 }) {
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: size * radius,
				backgroundImage: CURTAIN_TILE.image,
				backgroundBlendMode: CURTAIN_TILE.blend,
				backgroundSize: "100% 100%",
				boxShadow: `0 ${size * 0.03}px ${size * 0.08}px rgba(0,0,0,0.35)`,
			}}
		/>
	);
}

function DockIcon({ kind, size }) {
	if (kind === "curtain") return <CurtainTile size={size} />;
	return <AppTile kind={kind} size={size} />;
}

/** Closed "grab" hand used while dragging (the reference swaps the pointer for it). */
function GrabCursor({ x, y, size = 46, opacity = 1 }) {
	const s = size / 32;
	return (
		<svg
			width={38}
			height={38}
			viewBox="0 0 38 38"
			style={{
				position: "absolute",
				left: x - 15,
				top: y - 8,
				opacity,
				overflow: "visible",
				transform: `scale(${s.toFixed(4)})`,
				transformOrigin: "15px 8px",
				filter: "drop-shadow(0px 1.5px 1.5px rgba(0,0,0,0.28))",
			}}
		>
			<path
				d="M9.5 12.5c0-1.4 1-2.4 2.3-2.4s2.2.9 2.3 2.1c.2-1.3 1.2-2.2 2.4-2.2 1.3 0 2.3 1 2.3 2.4.3-1.1 1.2-1.9 2.4-1.9 1.3 0 2.3 1 2.3 2.4v1.2c.4-.9 1.2-1.4 2.1-1.4 1.3 0 2.2 1 2.2 2.4v6.2c0 4.6-3.3 8.4-8.2 8.4h-2.3c-3 0-4.9-1.3-6.6-3.6l-3.4-4.6c-.8-1.1-.6-2.5.4-3.2 1-.7 2.3-.5 3.1.4l.7.8Z"
				fill="#fff"
				stroke="#111"
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>
			<path
				d="M14.1 12.3v4.6M18.8 12.3v4.6M23.5 13.2v4"
				stroke="#111"
				strokeWidth="1.2"
				strokeLinecap="round"
			/>
		</svg>
	);
}

// ── sequoia-refusal-chat ─────────────────────────────────────────────────

const RC_DEFAULTS = {
	lead: "Then",
	leadPunct: ",",
	line: "they stop when it gets real",
	placeholder: "Ask AI...",
	question: "Why did you stop?",
	rows: [
		"I can’t do that",
		"Please approve action",
		"I can’t sign in to websites",
		"I can’t do sensitive tasks",
	],
	dock: ["curtain", "compass", "spark", "mail"],
	dragIndex: 2,
	openIndex: 0,
	bigSize: 91,
	smallSize: 28.5,
	weight: 600,
	smallWeight: 500,
};

/** Spring-chain rope: composer then rows bottom->top, each chasing the one before. */
/**
 * Spring rope, integrated at a fixed step from the drag start (deterministic).
 * Element 0 (the collapsing composer) chases the dragged tile; each row chases
 * the element below it at its rest offset (the stack is dragged up-right and
 * tilts, measured 16.8-17.0s). From its queue time each row instead chases a
 * point running along a common chute into the bin (ease-in), so the rows pour
 * in one after another around the same arc (measured 17.3-17.85s).
 */
function ropeSim(ms, leader, rest, opts) {
	const { t0, dt, k0, c0, kChain, cChain, kPath, cPath, collapse, queue, chute } = opts;
	const n = rest.length;
	const p = rest.map((r) => [r[0], r[1]]);
	const v = rest.map(() => [0, 0]);
	const end = Math.max(t0, ms);
	const L0 = leader(t0);
	for (let t = t0; t < end; t += dt) {
		const L = leader(t);
		const col = collapse(t);
		for (let i = 0; i < n; i++) {
			let tgt;
			let k;
			let c;
			if (i === 0) {
				tgt = [L[0] + (rest[0][0] - L0[0]) * col, L[1] + (rest[0][1] - L0[1]) * col];
				k = k0;
				c = c0;
			} else {
				const chain = [
					p[i - 1][0] + rest[i][0] - rest[i - 1][0],
					p[i - 1][1] + rest[i][1] - rest[i - 1][1],
				];
				const [qs, qd] = queue(i);
				const w = smooth(ramp(t, qs, qs + 160));
				const u = ramp(t, qs, qs + qd) ** 1.55;
				const pt = chute(u);
				tgt = [lerp(chain[0], pt[0], w), lerp(chain[1], pt[1], w)];
				k = lerp(kChain, kPath, w);
				c = lerp(cChain, cPath, w);
			}
			v[i][0] += (k * (tgt[0] - p[i][0]) - c * v[i][0]) * dt;
			v[i][1] += (k * (tgt[1] - p[i][1]) - c * v[i][1]) * dt;
			p[i][0] += v[i][0] * dt;
			p[i][1] += v[i][1] * dt;
		}
	}
	return { p, v };
}

/** The chute rows pour along (stage px), read off 17.3 / 17.6 / 17.8s. */
const CHUTE_X = mono([
	[0, 545],
	[0.18, 650],
	[0.36, 760],
	[0.54, 820],
	[0.72, 842],
	[0.86, 849],
	[1, 850],
]);
const CHUTE_Y = mono([
	[0, 215],
	[0.18, 222],
	[0.36, 260],
	[0.54, 330],
	[0.72, 420],
	[0.86, 510],
	[1, 610],
]);
const chute = (u) => [CHUTE_X(u), CHUTE_Y(u)];

function RefusalChat(cfg, t) {
	if (!live(cfg, t)) return null;
	const P = { ...RC_DEFAULTS, ...cfg };
	const ms = localMs(cfg, t);
	const F = P.bigSize;
	const f = P.smallSize;
	const font = (sz) => `${sz < 40 ? P.smallWeight : P.weight} ${sz}px ${FONT}`;
	const els = [];

	// ── lead word "Then" (+ comma popping on at 11.60) ──
	const leadIn = mono(LEAD_IN);
	const pan1 = mono(LEAD_PAN1);
	const cPan1 = mono(COMP_PAN1);
	const cPan2 = mono(COMP_PAN2);
	// composer left: pan 1 then pan 2 (pan 2 of "Then" = 3.1x the composer's, measured 12.57-12.60)
	const compL = ms < 2067 ? cPan1(ms) : cPan2(ms);
	const leadX = ms < 867 ? leadIn(ms) : ms < 2067 ? pan1(ms) : 90 - 3.1 * (352 - cPan2(ms));
	const leadOp = ramp(ms, 0, 100) * 0.23 + ramp(ms, 0, 40) * 0.77;
	if (ms < 3000 && leadX > -400) {
		els.push(
			<div
				key="lead"
				style={{
					position: "absolute",
					left: leadX,
					top: 329 - 0.214 * F,
					font: font(F),
					lineHeight: 1,
					color: rgbs(Q.white),
					opacity: clamp01(leadOp),
					whiteSpace: "nowrap",
					letterSpacing: "-0.01em",
				}}
			>
				{P.lead}
				<span style={{ opacity: ms >= 1400 ? 1 : 0 }}>{P.leadPunct}</span>
			</div>,
		);
	}

	// ── composer geometry ──
	const shrinkTop = mono(COMP_SHRINK);
	const rise = mono(STACK_RISE);
	const W = 795;
	const baseTop = ms < 2900 ? 320 : shrinkTop(ms);
	const dy = rise(ms);
	let cTop = baseTop + dy;
	const cBot = 685 + dy;
	let cH = cBot - cTop;
	let cL = compL;

	// rope: composer + rows chase the dragged app tile into the trash
	const leaderPts = R2([
		[16.45, 622],
		[16.533, 616],
		[16.6, 620],
		[16.667, 624],
		[16.733, 642],
		[16.8, 709],
		[16.9, 806],
		[17.0, 840],
		[17.1, 850],
		[17.2, 850],
		[17.3, 850],
	]);
	const leaderPtsY = R2([
		[16.45, 604],
		[16.533, 578],
		[16.6, 562],
		[16.667, 545],
		[16.733, 502],
		[16.8, 424],
		[16.9, 425],
		[17.0, 448],
		[17.1, 494],
		[17.2, 538],
		[17.3, 598],
	]);
	const lx = mono(leaderPts);
	const ly = mono(leaderPtsY);
	const leader = (m) => [lx(m), ly(m)];

	// rows layout (rest): pitch 60, pill 52 tall, bottom pill 30 above composer
	const nRows = P.rows.length;
	const rowAt = [
		R2([[14.333, 1]])[0][0],
		R2([[14.6, 1]])[0][0],
		R2([[14.833, 1]])[0][0],
		R2([[15.133, 1]])[0][0],
	];
	const rowShown = (i) =>
		ms >= (P.rowAtMs?.[i] ?? rowAt[i] ?? rowAt[rowAt.length - 1] + (i - 3) * 270);
	const shownCount = P.rows.reduce((a, _, i) => a + (rowShown(i) ? 1 : 0), 0);
	const rowW = P.rows.map((s) => s.length * f * 0.5 + 52); // only for rope rest centres (approx)

	const ropeStart = 6400; // 16.60: the chat only starts to follow here (rest at 16.60, measured)
	const ropeOn = ms >= ropeStart;
	let rope = null;
	if (ropeOn) {
		const restC = [[cL + W / 2, cTop + cH / 2]];
		for (let i = nRows - 1; i >= 0; i--) {
			const k = nRows - 1 - i;
			restC.push([248 + rowW[i] / 2, cTop - 30 - 26 - k * 60]);
		}
		rope = ropeSim(ms, leader, restC, {
			t0: ropeStart,
			dt: 1000 / 240,
			k0: P.ropeK0 ?? 0.00018,
			c0: P.ropeC0 ?? 0.022,
			kChain: 0.0002,
			cChain: 0.026,
			kPath: 0.0005,
			cPath: 0.04,
			collapse: (m) => 1 - smooth(ramp(m, 6400, 6800)),
			// queue: row nearest the composer enters the chute at 16.95s (in by 17.51), the top row last (in by 17.81)
			queue: (j) => [6750 + (j - 1) * 60, 560 + (j - 1) * 40],
			chute,
		});
	}

	// trash mouth (rope sink) — measured 17.3s: rows dive in at x~850, vanish below y~560
	const sink = [850, 585];
	const ropeXform = (i, w0, h0) => {
		const [x, y] = rope.p[i];
		const [vx, vy] = rope.v[i];
		const sp = Math.hypot(vx, vy) * 1000; // px/s
		let ux = vx;
		let uy = vy;
		if (ux < 0) {
			ux = -ux;
			uy = -uy;
		}
		const w = clamp01(sp / 900);
		const ang = sp > 1e-3 ? Math.atan2(uy * w, ux * w + (1 - w) * Math.hypot(ux, uy)) : 0;
		const d = Math.hypot(x - sink[0], y - sink[1]);
		const s = Math.max(0.12, Math.min(1, (d - 10) / 230));
		const gone = y > sink[1] - 20 && d < 60;
		return { x, y, ang: (ang * 180) / Math.PI, s, gone, w0, h0 };
	};

	// ── composer card ──
	if (ms >= 900 && ms < 7700) {
		let tf = "";
		let cw = W;
		let ch = cH;
		let opacity = 1;
		if (ropeOn) {
			// collapses into a ~110x18 bar trailing the tile (16.8: 310x60 at -6deg; 17.0: 110x18)
			const k = smooth(ramp(ms, 6400, 6700));
			cw = lerp(W, 108, k);
			ch = lerp(cH, 18, k);
			const r = ropeXform(0, cw, ch);
			const sc = r.s;
			cL = r.x - cw / 2;
			cTop = r.y - ch / 2;
			tf = `rotate(${(r.ang * smooth(ramp(ms, 6400, 6650))).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
			if (r.gone) opacity = 0;
		}
		const btnK = ropeOn ? 1 - smooth(ramp(ms, 6400, 6700)) : 1;
		els.push(
			<div
				key="comp"
				style={{
					position: "absolute",
					left: cL,
					top: cTop,
					width: cw,
					height: ch,
					borderRadius: Math.min(26, ch / 2),
					background: "linear-gradient(180deg, rgb(24,26,23), rgb(22,24,21))",
					boxShadow:
						"inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.075), 0 14px 34px rgba(0,0,0,0.28)",
					transform: tf,
					opacity,
					overflow: "hidden",
				}}
			>
				{btnK > 0.02 && (
					<>
						<div
							style={{
								position: "absolute",
								left: 7,
								bottom: 9,
								width: 35,
								height: 35,
								borderRadius: "50%",
								background: "rgb(39,41,38)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								opacity: btnK,
							}}
						>
							<Icon name="plus" size={12} colour={[235, 237, 234]} stroke={2.4} />
						</div>
						<div
							style={{
								position: "absolute",
								right: 7,
								bottom: 9,
								width: 35,
								height: 35,
								borderRadius: "50%",
								background: "rgb(39,41,38)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								opacity: btnK,
							}}
						>
							<Icon name="arrow-up" size={12} colour={[235, 237, 234]} stroke={2.6} />
						</div>
					</>
				)}
			</div>,
		);

		// typed line: one word per 2 frames from 11.667, purple -> white in ~0.1s,
		// sliding in from +12px; deleted one per ~frame from 13.20.
		const words = P.line.split(/\s+/).filter(Boolean);
		if (ms < 3300) {
			const lineEls = words.map((wd, i) => {
				const tIn = 1467 + i * 66.7;
				const tOut = (P.deleteMs ?? DELETE_MS)[i] ?? 3203 + (i - 5) * 33;
				const p = ramp(ms, tIn - 15, tIn + 110);
				const e = 1 - (1 - p) ** 2;
				const show = ms >= tIn - 15 && ms < tOut + 30;
				const outP = ramp(ms, tOut, tOut + 30);
				const col = mix([128, 108, 208], [254, 255, 253], e);
				return (
					<span
						key={i}
						style={{
							display: "inline-block",
							marginRight: "0.255em",
							color: rgbs(mix(col, [150, 152, 150], outP)),
							opacity: show ? 1 - outP * 0.5 : 0,
							transform: `translateX(${(12 * (1 - e)).toFixed(2)}px)`,
						}}
					>
						{wd}
					</span>
				);
			});
			els.push(
				<div
					key="line"
					style={{
						position: "absolute",
						left: compL + 45,
						top: 320 + 11,
						width: W - 60,
						font: font(F),
						lineHeight: "93px",
						letterSpacing: "-0.018em",
						display: "flex",
						flexWrap: "wrap",
					}}
				>
					{lineEls}
				</div>,
			);
		}

		// placeholder "Ask" at 13.40, completed "Ask AI..." at 13.63; fades as the composer collapses
		if (ms >= 3165 && btnK > 0.02) {
			const ph = P.placeholder;
			const firstWord = ph.split(" ")[0];
			const nChars =
				ms < 3420
					? firstWord.length
					: Math.min(ph.length, firstWord.length + Math.floor((ms - 3420) / 16));
			els.push(
				<div
					key="ph"
					style={{
						position: "absolute",
						left: cL + 20,
						top: cBot - 101 - 0.214 * f, // anchored to the bottom: cap top = bottom - 101 (14.0s and 15.7s)
						font: font(f),
						lineHeight: 1,
						color: "rgb(166,168,165)",
						whiteSpace: "nowrap",
						opacity: ramp(ms, 3165, 3200) * btnK,
					}}
				>
					{ph.slice(0, nChars)}
				</div>,
			);
		}
	}

	// ── question bubble: in at 13.70 (rises 18px, exp), lifted per row, exits up 15.60-16.0 ──
	if (ms >= 3480 && ms < 5850) {
		const rowsH = shownCount > 0 ? 30 + 52 + (shownCount - 1) * 60 + 55 : 67;
		const settle = 18 * Math.exp(-(ms - 3480) / 110);
		const exitP = ramp(ms, 5400, 5800);
		const qTop = cTop - rowsH + settle - 105 * exitP ** 3;
		els.push(
			<div
				key="q"
				style={{
					position: "absolute",
					right: 1280 - (cL + W),
					top: qTop - 0.214 * f + 2,
					font: font(f),
					lineHeight: 1,
					color: "rgb(171,173,170)",
					whiteSpace: "nowrap",
					opacity: ramp(ms, 3480, 3600),
				}}
			>
				{P.question}
			</div>,
		);
	}

	// ── refusal rows: hard pops at 14.333 / 14.600 / 14.833 / 15.133 ──
	P.rows.forEach((txt, i) => {
		if (!rowShown(i)) return;
		const k = shownCount - 1 - i; // 0 = bottom
		let x = 248;
		let yTop = cTop - 30 - 52 - k * 60;
		let tf = "";
		let op = 1;
		if (ropeOn) {
			const r = ropeXform(1 + (nRows - 1 - i), rowW[i], 52);
			x = r.x - rowW[i] / 2;
			yTop = r.y - 26;
			tf = `rotate(${r.ang.toFixed(2)}deg) scale(${r.s.toFixed(3)})`;
			if (r.gone) op = 0;
		}
		if (ms > 7700) op = 0;
		els.push(
			<div
				key={`row${i}`}
				style={{
					position: "absolute",
					left: x,
					top: yTop,
					height: 52,
					width: ropeOn ? rowW[i] : "auto",
					padding: ropeOn ? 0 : "0 32px 0 20px",
					boxSizing: "border-box",
					display: "flex",
					alignItems: "center",
					justifyContent: ropeOn ? "center" : "flex-start",
					borderRadius: 10,
					background: "rgb(48,50,47)",
					font: font(f),
					color: "rgb(231,233,230)",
					whiteSpace: "nowrap",
					transform: tf,
					opacity: op,
					boxShadow: ropeOn ? "0 6px 16px rgba(0,0,0,0.25)" : "none",
				}}
			>
				{txt}
			</div>,
		);
	});

	// ── dock: width-reveal + icon scale-in 15.40-15.65; drag slot closes 16.55-16.85 ──
	if (ms >= 5180) {
		const e = 1 - (1 - ramp(ms, 5205, 5490)) ** 3.2;
		const eI = 1 - (1 - ramp(ms, 5205, 5440)) ** 2.4;
		const icon = 110;
		const slotK = 1 - smooth(ramp(ms, 6350, 6650));
		const gap = lerp(20, 28, ms < 6350 ? 1 : slotK);
		const iconS = lerp(0.62, 1, eI);
		// hand position drives hover magnification
		const hand = handPos(ms);
		const hoverOn = (ms > 5300 && ms < 6300) || (ms > 8050 && ms < 8700);
		const dockW = (() => {
			let w = 16 + 30;
			P.dock.forEach((_, i) => {
				const isDrag = i === P.dragIndex && ms >= 6250;
				w += isDrag ? Math.max(0, (icon + gap) * slotK) : icon + gap;
			});
			return w + 1 + 22 + icon;
		})();
		const dW = dockW * lerp(0.05, 1, e);
		const dH = 147 * lerp(0.82, 1, eI);
		const dX = 640 - dW / 2;
		const dTop = 610.5 - dH / 2;
		let cx = 640 - dockW / 2 + 16;
		const kids = [];
		P.dock.forEach((kind, i) => {
			const isDrag = i === P.dragIndex && ms >= 6250;
			if (isDrag) {
				cx += Math.max(0, (icon + gap) * slotK);
				return;
			}
			const icx = cx + icon / 2;
			cx += icon + gap;
			let mag = 0;
			if (hoverOn && hand.y > 520) mag = 0.17 * Math.exp(-(((hand.x - icx) / 62) ** 2));
			if (i === P.dragIndex && ms >= 5900 && ms < 6250)
				mag = Math.max(
					mag,
					0.17 -
						0.05 * ramp(ms, 5900, 5935) * (1 - ramp(ms, 5935, 6000)) -
						0.05 * ramp(ms, 6000, 6033),
				);
			if (i === P.openIndex && ms >= 8300) mag = Math.max(mag, 0.26 * ramp(ms, 8300, 8450));
			const s = iconS * (1 + mag);
			kids.push(
				<div
					key={`i${i}`}
					style={{
						position: "absolute",
						left: 640 + (icx - 640) * lerp(0.62, 1, eI) - icon / 2,
						top: 610.5 - icon / 2 - mag * 60,
						transform: `scale(${s.toFixed(4)})`,
						transformOrigin: "50% 100%",
					}}
				>
					<DockIcon kind={kind} size={icon} />
				</div>,
			);
		});
		const sepX = cx - gap + 28;
		const trashX = sepX + 1 + 22;
		kids.push(
			<div
				key="sep"
				style={{
					position: "absolute",
					left: 640 + (sepX - 640) * lerp(0.62, 1, eI),
					top: 553,
					width: 1.5,
					height: 115,
					background: "rgba(255,255,255,0.12)",
				}}
			/>,
		);
		kids.push(
			<div
				key="trash"
				style={{
					position: "absolute",
					left: 640 + (trashX + icon / 2 - 640) * lerp(0.62, 1, eI) - icon / 2,
					top: 610.5 - icon / 2,
					transform: `scale(${iconS})`,
				}}
			>
				<TrashCan size={icon} full={ms > 7050} />
			</div>,
		);
		els.push(
			<div
				key="dockbg"
				style={{
					position: "absolute",
					left: dX,
					top: dTop,
					width: dW,
					height: dH,
					borderRadius: 46,
					background: "rgb(31,33,30)",
					boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.13), 0 10px 30px rgba(0,0,0,0.25)",
				}}
			/>,
		);
		els.push(
			<div
				key="dockicons"
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1280,
					height: 720,
					clipPath: `inset(${dTop}px ${1280 - dX - dW}px ${720 - dTop - dH}px ${dX}px round 46px)`,
				}}
			>
				{kids}
			</div>,
		);
	}

	// ── the dragged app tile (leader) ──
	if (ms >= 6250 && ms < 7080) {
		const [x, y] = leader(ms);
		const sc =
			lerp(1.13, 1.04, smooth(ramp(ms, 6300, 6600))) * (1 - 0.75 * smooth(ramp(ms, 6880, 7060)));
		const rot = kf(
			[
				{ at: 6250, r: 0 },
				{ at: 6400, r: -12, ease: "out" },
				{ at: 6600, r: -3, ease: "inout" },
				{ at: 6800, r: 6, ease: "inout" },
				{ at: 7000, r: 8 },
			],
			ms,
		).r;
		els.push(
			<div
				key="tile"
				style={{
					position: "absolute",
					left: x - 55,
					top: y - 55,
					transform: `rotate(${rot}deg) scale(${sc.toFixed(4)})`,
					opacity: 1 - ramp(ms, 7030, 7080),
				}}
			>
				<DockIcon kind={P.dock[P.dragIndex]} size={110} />
			</div>,
		);
	}

	// ── hand cursor ──
	const hp = handPos(ms);
	if (hp.op > 0) {
		const grab = ms >= 5960 && ms < 7120;
		if (grab) els.push(<GrabCursor key="hand" x={hp.x} y={hp.y} size={58} opacity={hp.op} />);
		else
			els.push(
				<HandCursor key="hand" x={hp.x} y={hp.y} size={68} press={hp.press} opacity={hp.op} />,
			);
	}

	return (
		<div key={cfg.id} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			{els}
		</div>
	);
}

/** Fingertip path (scene ms from 10.2s). Read off frames 15.53-18.8s. */
const HAND_X = mono(
	R2([
		[15.5, 150],
		[15.567, 205],
		[15.633, 240],
		[15.7, 262],
		[15.767, 330],
		[15.833, 470],
		[15.9, 590],
		[15.967, 630],
		[16.033, 640],
		[16.2, 642],
		[16.45, 642],
		[16.533, 636],
		[16.6, 640],
		[16.667, 642],
		[16.733, 662],
		[16.8, 729],
		[16.9, 826],
		[17.0, 860],
		[17.1, 870],
		[17.2, 870],
		[17.3, 870],
		[18.1, 868],
		[18.2, 773],
		[18.3, 580],
		[18.4, 480],
		[18.5, 450],
		[18.6, 442],
		[19.2, 442],
	]),
);
const HAND_Y = mono(
	R2([
		[15.5, 600],
		[15.567, 575],
		[15.633, 590],
		[15.7, 605],
		[15.767, 615],
		[15.833, 625],
		[15.9, 628],
		[15.967, 625],
		[16.033, 620],
		[16.2, 620],
		[16.45, 628],
		[16.533, 612],
		[16.6, 598],
		[16.667, 581],
		[16.733, 538],
		[16.8, 460],
		[16.9, 461],
		[17.0, 484],
		[17.1, 530],
		[17.2, 570],
		[17.3, 590],
		[18.1, 592],
		[18.2, 640],
		[18.3, 650],
		[18.4, 633],
		[18.5, 627],
		[18.6, 625],
		[19.2, 625],
	]),
);
function handPos(ms) {
	const op = ms < 5300 || ms > 8660 ? 0 : ramp(ms, 5300, 5370);
	// click on the AI tile 16.10-16.17; click on the product icon 18.62-18.75
	const press = Math.max(
		ramp(ms, 5880, 5920) * (1 - ramp(ms, 5960, 6000)),
		ramp(ms, 8420, 8460) * (1 - ramp(ms, 8540, 8580)),
	);
	return { x: HAND_X(ms), y: HAND_Y(ms), op, press };
}

/** The dock's bin (glassy dark can; `full` adds the stuffed paper peeking out). */
function TrashCan({ size, full }) {
	return (
		<div style={{ position: "relative", width: size, height: size }}>
			<div
				style={{
					position: "absolute",
					left: size * 0.2,
					top: size * (full ? 0.0 : 0.04),
					width: size * 0.6,
					height: size * (full ? 0.26 : 0.22),
					borderRadius: size * 0.1,
					background: "linear-gradient(90deg,#e8eef5 0%,#3d5a8a 45%,#d5755c 100%)",
					opacity: 0.9,
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: size * 0.14,
					top: size * 0.14,
					width: size * 0.72,
					height: size * 0.82,
					borderRadius: `${size * 0.04}px ${size * 0.04}px ${size * 0.14}px ${size * 0.14}px`,
					background: "linear-gradient(180deg,rgba(50,52,56,0.92),rgba(18,19,21,0.96))",
					boxShadow: `inset 0 ${size * 0.02}px 0 rgba(255,255,255,0.25), inset 0 0 0 1px rgba(200,205,215,0.18)`,
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: size * 0.12,
					top: size * 0.11,
					width: size * 0.76,
					height: size * 0.07,
					borderRadius: size * 0.035,
					background: "linear-gradient(180deg,#c9ced6,#6d737c)",
				}}
			/>
		</div>
	);
}

// ── sequoia-type-center ──────────────────────────────────────────────────

/**
 * A word typed on letter by letter, re-centred on every letter (no caret).
 * "Introducing": I 17.900, n 17.967, t 18.000, r 18.033, o 18.067, d 18.133,
 * u 18.167, c 18.200, i 18.267, n 18.300, g 18.333 — cap 63px, centred x=640,
 * cap top y=320, white, held until the curtain covers it.
 */
function TypeCenter(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const text = cfg.text ?? "Introducing";
	const size = cfg.size ?? 91;
	const times = cfg.charMs ?? null;
	const step = cfg.stepMs ?? 43;
	let n = 0;
	for (let i = 0; i < text.length; i++) {
		const at = times?.[i] ?? i * step;
		if (ms >= at) n = i + 1;
	}
	if (n === 0) return null;
	return (
		<div
			key={cfg.id}
			style={{
				position: "absolute",
				left: 0,
				width: 1280,
				top: (cfg.capTop ?? 320) - 0.214 * size,
				textAlign: "center",
				font: `${cfg.weight ?? 600} ${size}px ${FONT}`,
				lineHeight: 1,
				letterSpacing: cfg.tracking ?? "-0.025em",
				color: rgbs(cfg.colour ?? Q.white),
				whiteSpace: "nowrap",
			}}
		>
			{text.slice(0, n)}
		</div>
	);
}

/** Genie outline keys (film s -> stage px), read off frames 18.85-19.20. */
const GENIE = {
	topY: [
		[18.85, 527],
		[18.867, 474],
		[18.9, 405],
		[18.933, 312],
		[18.967, 200],
		[19.0, 96],
		[19.033, 6],
		[19.067, -60],
		[19.1, -120],
		[19.2, -200],
	],
	topL: [
		[18.85, 373],
		[18.867, 326],
		[18.9, 270],
		[18.933, 190],
		[18.967, 96],
		[19.0, 6],
		[19.033, -40],
		[19.1, -80],
		[19.2, -100],
	],
	topR: [
		[18.85, 503],
		[18.867, 550],
		[18.9, 604],
		[18.933, 680],
		[18.967, 780],
		[19.0, 870],
		[19.033, 950],
		[19.067, 1010],
		[19.1, 1045],
		[19.133, 1095],
		[19.167, 1175],
		[19.2, 1340],
	],
	botY: [
		[18.85, 665],
		[19.0, 665],
		[19.033, 680],
		[19.067, 708],
		[19.1, 722],
		[19.2, 740],
	],
	botL: [
		[18.85, 373],
		[19.0, 373],
		[19.033, 330],
		[19.067, 220],
		[19.1, 110],
		[19.133, -10],
		[19.2, -60],
	],
	botR: [
		[18.85, 503],
		[19.0, 503],
		[19.033, 560],
		[19.067, 650],
		[19.1, 760],
		[19.133, 910],
		[19.167, 1070],
		[19.2, 1340],
	],
};

// ── sequoia-light-curtain ────────────────────────────────────────────────

/**
 * Reverse genie from the dock icon to full frame, measured 18.85-19.20:
 * the shape's top edge rises from the icon (y 545) to the frame top by 19.03,
 * widening first (concave "trumpet" sides) while the bottom stays pinned to the
 * icon; the bottom then widens and drops to the frame edge by 19.20. Rendered
 * as horizontal strips each carrying its squeezed slice of the curtain texture
 * (the flutes visibly converge toward the icon, as in the reference).
 */
function LightCurtain(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const word = cfg.word ?? "Aside";
	const els = [];

	// genie outline, measured per frame 18.867-19.200 (stage px, film s):
	// top edge centre-y, top corners, bottom edge y and bottom corners.
	const G = cfg.genie ?? GENIE;
	const g = (k) => mono(rel(18.85)(G[k]));
	const topY = g("topY")(ms);
	const topL = g("topL")(ms);
	const topR = g("topR")(ms);
	const botY = g("botY")(ms);
	const botL = g("botL")(ms);
	const botR = g("botR")(ms);
	const dome = 0.065 * (topR - topL);
	const full = topY < -150 && botL < -40 && botR > 1320;
	if (!full) {
		const corner = topY + dome;
		// sides leave the top corners horizontally and meet the stem vertically
		const side = (y, top, bot) => {
			// the flare lives in the top ~60%; the stem below it stays near the icon's width
			const vs = clamp01((y - corner) / Math.max(1, botY - corner) / 0.62);
			return bot + (top - bot) * (1 - smooth(vs));
		};
		const poly = [];
		for (let i = 0; i <= 24; i++) {
			const u = i / 24;
			poly.push([lerp(topL, topR, u), topY + dome * (2 * u - 1) ** 2]);
		}
		for (let i = 1; i <= 24; i++) {
			const y = lerp(corner, botY, i / 24);
			poly.push([side(y, topR, botR), y]);
		}
		for (let i = 24; i >= 0; i--) {
			const y = lerp(corner, botY, i / 24);
			poly.push([side(y, topL, botL), y]);
		}
		const clip = `polygon(${poly.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})`;
		const N = 48;
		const strips = [];
		for (let i = 0; i < N; i++) {
			const y0 = lerp(topY, botY, i / N);
			const y1 = lerp(topY, botY, (i + 1) / N);
			const l = Math.min(side(y0, topL, botL), side(y1, topL, botL)) - 2;
			const r = Math.max(side(y0, topR, botR), side(y1, topR, botR)) + 2;
			const w = r - l;
			const fullH = botY - topY;
			// texture keeps (mostly) the top edge's width: the flutes stay near-vertical,
			// converging only slightly into the stem, as in the reference
			const tw = lerp(topR - topL, w, 0.2);
			const tx = (topL + topR) / 2 - tw / 2 + ((l + r) / 2 - (topL + topR) / 2) * 0.2 - l;
			strips.push(
				<div
					key={`s${i}`}
					style={{
						position: "absolute",
						left: l,
						top: y0,
						width: w,
						height: y1 - y0 + 1,
						backgroundImage: CURTAIN.image,
						backgroundBlendMode: CURTAIN.blend,
						backgroundSize: `${tw}px ${fullH}px`,
						backgroundPosition: `${tx}px ${-(y0 - topY)}px`,
						backgroundRepeat: "no-repeat",
					}}
				/>,
			);
		}
		els.push(
			<div
				key="genie"
				style={{
					position: "absolute",
					inset: 0,
					filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.45))",
				}}
			>
				<div style={{ position: "absolute", inset: 0, clipPath: clip }}>{strips}</div>
			</div>,
		);
	} else {
		els.push(
			<div
				key="full"
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage: CURTAIN.image,
					backgroundBlendMode: CURTAIN.blend,
					backgroundSize: "1280px 720px",
				}}
			/>,
		);
	}

	// wordmark behind the flutes: letters fade/blur in 19.13-19.60 at small size,
	// punch up x2.42 by 19.97, settle to x2.81 by 20.8 (widths 230 -> 556 -> 646)
	const wSc = mono(
		cfg.wordScale ??
			rel(18.85)([
				[19.667, 1],
				[19.733, 1.1],
				[19.767, 1.28],
				[19.8, 1.55],
				[19.833, 1.88],
				[19.867, 2.12],
				[19.9, 2.26],
				[19.933, 2.36],
				[19.967, 2.42],
				[20.1, 2.6],
				[20.4, 2.78],
				[20.8, 2.81],
			]),
	);
	const sc = wSc(ms);
	const fade = ramp(ms, cfg.textOutMs?.[0] ?? 2150, cfg.textOutMs?.[1] ?? 2250);
	const baseSize = cfg.wordSize ?? 97;
	const letters = [...word];
	const letterEl = (k) =>
		letters.map((ch, i) => {
			const a = cfg.letterMs?.[i] ?? (cfg.letterStartMs ?? 250) + i * (cfg.letterStepMs ?? 60);
			const lp = ramp(ms, a, a + 170);
			return (
				<span
					key={`${k}-${i}`}
					style={{ opacity: lp, filter: lp < 1 ? `blur(${((1 - lp) * 4).toFixed(2)}px)` : "none" }}
				>
					{ch}
				</span>
			);
		});
	if (ms >= 200 && fade < 1) {
		const bands = 14;
		const bw = 1280 / bands;
		for (let b = 0; b < bands; b++) {
			const off = (hash(b, 9) - 0.5) * 3.5 * sc;
			els.push(
				<div
					key={`wb${b}`}
					style={{
						position: "absolute",
						left: b * bw,
						top: 0,
						width: bw + 0.5,
						height: 720,
						overflow: "hidden",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: -b * bw + off,
							top: (cfg.wordCy ?? 366) - baseSize * 0.6,
							width: 1280,
							textAlign: "center",
							font: `${cfg.weight ?? 600} ${baseSize}px ${FONT}`,
							lineHeight: 1.2,
							letterSpacing: "-0.02em",
							color: rgbs(cfg.wordColour ?? [214, 228, 234]),
							opacity: 0.86 * (1 - fade),
							transform: `scale(${sc.toFixed(4)})`,
							transformOrigin: `${640 - off}px ${baseSize * 0.6}px`,
							whiteSpace: "nowrap",
						}}
					>
						{letterEl(b)}
					</div>
				</div>,
			);
		}
	}

	// wash to the off-white ground: linear white veil 20.80 -> 21.267 (measured per-pixel)
	const wash = ramp(ms, cfg.washMs?.[0] ?? 1950, cfg.washMs?.[1] ?? 2417);
	if (wash > 0)
		els.push(
			<div
				key="wash"
				style={{ position: "absolute", inset: 0, background: rgbs(Q.light), opacity: wash }}
			/>,
		);

	return (
		<div key={cfg.id} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			{els}
		</div>
	);
}

export const S2_PRESETS = {
	"sequoia-refusal-chat": {
		note: "Section 2's continuous chat beat (10.2-19.2s): lead word + a dark composer swooshing in from the right while the line types in word by word (purple->white), second pan pushes the lead word out, the line is deleted word by word as the composer shrinks to its placeholder, a question and refusal rows stack above it, a dock scales in, a hand drags the AI app out of the dock and the composer + rows follow it into the trash as a spring rope; ends with the hand clicking the product icon. All timings measured; scene must start at the measured beat (10200ms) for the tables to line up.",
		nativeMs: 9033,
		params: {
			lead: ["string", "Then", "lead word left of the composer"],
			leadPunct: ["string", ",", "punctuation that pops on at +1400ms"],
			line: [
				"string",
				"they stop when it gets real",
				"the composer line, typed one word per 2 frames",
			],
			placeholder: ["string", "Ask AI...", "composer placeholder after the line is deleted"],
			question: [
				"string",
				"Why did you stop?",
				"the user's question (right-aligned above the rows)",
			],
			rows: ["array", "[4 refusal strings]", "assistant refusal rows, popped in one by one"],
			dock: [
				"array",
				"['curtain','compass','spark','mail']",
				"dock tiles (AppTile kinds; 'curtain' = the product icon)",
			],
			dragIndex: ["number", 2, "which dock tile the hand drags to the trash"],
			deleteMs: [
				"array",
				"[3003,...,3203]",
				"per-word delete starts (scene ms); words past the list continue at 33ms",
			],
			openIndex: ["number", 0, "which dock tile the hand clicks at the end"],
		},
		render: RefusalChat,
	},
	"sequoia-type-center": {
		note: "One centred word typed on letter by letter with no caret, recentring every letter (s2 'Introducing'). charMs gives per-letter times (scene ms), else stepMs cadence.",
		nativeMs: 1000,
		params: {
			text: ["string", "Introducing", "the word"],
			size: ["number", 91, "font px (cap ~63px)"],
			capTop: ["number", 320, "cap-top y"],
			charMs: ["array", "null", "per-letter appear times (scene ms)"],
			stepMs: ["number", 43, "uniform cadence if charMs absent"],
		},
		render: TypeCenter,
	},
	"sequoia-light-curtain": {
		note: "The product reveal: the dock icon un-minimises (reverse genie, strips of a fluted-glass blue curtain) to full frame in ~0.35s, the wordmark fades in letter by letter behind the flutes, punches up x2.4 and settles, then a linear white veil washes everything to the off-white ground. Start it on the click frame + ~0.1s.",
		nativeMs: 2417,
		params: {
			word: ["string", "Aside", "the wordmark revealed on the curtain"],
			genie: [
				"object",
				"GENIE (measured)",
				"outline keys {topY,topL,topR,botY,botL,botR}: [[film s, px]...]; starts on the dock icon's rect, scene must start at 18850",
			],
			wordScale: ["array", "measured", "[[scene ms, scale]...] for the wordmark punch-up"],
			letterMs: [
				"array",
				"null",
				"per-letter fade-in starts (scene ms); else letterStartMs + i*letterStepMs",
			],
			letterStartMs: ["number", 250, "first wordmark letter fade-in (scene ms)"],
			letterStepMs: ["number", 60, "per-letter cadence"],
			textOutMs: ["array", "[2150,2250]", "wordmark fade-out inside the wash"],
			wordSize: ["number", 97, "wordmark font px at its small (pre-punch) size"],
			washMs: ["array", "[1950,2417]", "white veil start/end (scene ms)"],
		},
		render: LightCurtain,
	},
};
