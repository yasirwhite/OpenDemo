/**
 * alder-shared.jsx — the vocabulary every alder preset is built from.
 *
 * Measured off a 20.0s launch film (1920x1080 @25fps), sampled on its own
 * 25fps clock and mapped to the 1280x720 stage (stage px = ref px / 1.5).
 * The film is ONE idea repeated: every shot is the curved edge of something
 * (a planet, a dish, a leaf, a plate, a page), framed so that its edge lies
 * across the middle of the frame as a horizon. Hard cuts land on that edge.
 *
 *   HORIZON  the bookend. A planet limb: dark ground below a thin orange line,
 *            then peach, grey-blue and a wide blue haze dissolving into a
 *            navy sky [14,19,22]. Limb radius ~3750 stage px (46 px of sag
 *            587 px off centre). Edge at y 344 in the opening, y 889 (below
 *            frame, only the haze shows) under the end titles.
 *   PLATES   the montage. 36 shots, each a texture plate whose curved edge
 *            sits at y 335-370 at frame centre (median 355); sag at the frame
 *            sides runs 45-270 px. Cuts every 0.24-1.04s, accelerating.
 *            Plates hold still (only grain moves), except one frieze that
 *            slides sideways.
 *   LINE     a three-beat line of serif type stands just ABOVE the edge,
 *            centred, one word-group per run of plates. The type is re-set on
 *            every cut: it holds dead still inside a plate and steps larger
 *            at each cut (46 -> 154 px over 7.3s), and later plates bend it
 *            to the plate's curvature.
 *   TITLES   name card, then wordmark, white serif centred at y ~335 over the
 *            haze; the whole card then pans up 545 px on an accelerating S
 *            and lands exactly on the opening frame, so the film loops.
 *
 * Every export is a pure function of its props / t.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";

// ── type ──────────────────────────────────────────────────────────────────

/** A book serif with a calm, slightly wide lowercase. Georgia is installed
 *  everywhere; drop a webfont into the stage to match a brand face. */
export const SERIF = `"Georgia", "Cambria", "Times New Roman", serif`;

// ── colour ────────────────────────────────────────────────────────────────

export const rgbs = (c, a = 1) =>
	a >= 1
		? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
		: `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, a).toFixed(4)})`;

export const mix = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));

/** Measured palette (sample, not invent). */
export const A = {
	sky: [14, 19, 22], // end-card sky, f410 rows 0-200
	ink: [238, 234, 226], // the line on dark plates (f229 "There's" core)
	inkDark: [24, 22, 20], // the line on pale plates (f359)
	title: [242, 242, 240], // name card / wordmark (f410)
};

/**
 * The limb profile: colour by distance d ABOVE the edge, in STAGE px (ref
 * 960-wide px x 4/3). Sampled down the centre column of f490 (edge at ref
 * y 452) and f001 (ground below the edge). The opening and the end-card are
 * the same profile at different heights (profile match error 1.1-1.8/255).
 */
export const LIMB = [
	[-323, [17, 22, 18]],
	[-189, [21, 23, 20]],
	[-109, [24, 24, 22]],
	[-56, [35, 27, 25]],
	[-21, [48, 30, 30]],
	[-5, [66, 31, 25]],
	[0, [120, 48, 29]],
	[11, [192, 67, 33]],
	[27, [208, 110, 45]],
	[43, [210, 143, 72]],
	[59, [184, 140, 101]],
	[75, [166, 135, 119]],
	[91, [152, 136, 131]],
	[107, [133, 133, 137]],
	[123, [118, 133, 140]],
	[139, [106, 131, 141]],
	[171, [104, 131, 140]],
	[187, [103, 132, 142]],
	[203, [91, 127, 141]],
	[219, [77, 114, 132]],
	[235, [62, 99, 117]],
	[251, [49, 83, 100]],
	[267, [36, 68, 84]],
	[283, [27, 54, 67]],
	[299, [22, 44, 58]],
	[315, [20, 37, 46]],
	[331, [20, 33, 40]],
	[363, [18, 27, 33]],
	[395, [17, 25, 28]],
	[443, [18, 23, 26]],
	[523, [17, 22, 24]],
	[603, [14, 19, 22]],
];

// ── deterministic randomness ──────────────────────────────────────────────

/** mulberry32: a seeded PRNG, so every texture is identical on every frame. */
export function rng(seed) {
	let a = (seed * 2654435761) >>> 0 || 1;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Smooth 1D value noise in [-1, 1], seeded. */
export function noise1(seed) {
	const r = rng(seed);
	const N = 512;
	const v = Array.from({ length: N }, () => r() * 2 - 1);
	return (x) => {
		const i = Math.floor(x);
		const f = x - i;
		const a = v[((i % N) + N) % N];
		const b = v[(((i + 1) % N) + N) % N];
		const s = f * f * (3 - 2 * f);
		return a + (b - a) * s;
	};
}

/** Film-clock ms for frame time t, rounded to the microsecond: f/fps*1000 is
 *  not exact in binary, and a step keyed on a cut must land ON that frame. */
export const msOf = (t) => Math.round(t * 1e6) / 1e3;

// ── keyed values ──────────────────────────────────────────────────────────

/**
 * Monotone cubic (Fritsch-Carlson) through [[ms, v], ...]. Used for measured
 * trajectories (the end-card pan was sampled every frame and is replayed as a
 * curve, not approximated by a named ease). Clamps outside the keys.
 */
export function curveAt(keys, ms) {
	if (!keys || !keys.length) return 0;
	if (ms <= keys[0][0]) return keys[0][1];
	const n = keys.length;
	if (ms >= keys[n - 1][0]) return keys[n - 1][1];
	const xs = keys.map((k) => k[0]);
	const ys = keys.map((k) => k[1]);
	const d = [];
	for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
	const m = [d[0]];
	for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
	m.push(d[n - 2]);
	for (let i = 0; i < n - 1; i++) {
		if (d[i] === 0) {
			m[i] = 0;
			m[i + 1] = 0;
			continue;
		}
		const a = m[i] / d[i];
		const b = m[i + 1] / d[i];
		const s = a * a + b * b;
		if (s > 9) {
			const k = 3 / Math.sqrt(s);
			m[i] = k * a * d[i];
			m[i + 1] = k * b * d[i];
		}
	}
	let i = 0;
	while (ms > xs[i + 1]) i++;
	const h = xs[i + 1] - xs[i];
	const u = (ms - xs[i]) / h;
	const u2 = u * u;
	const u3 = u2 * u;
	return (
		(2 * u3 - 3 * u2 + 1) * ys[i] +
		(u3 - 2 * u2 + u) * h * m[i] +
		(-2 * u3 + 3 * u2) * ys[i + 1] +
		(u3 - u2) * h * m[i + 1]
	);
}

/** The step whose atMs is the latest <= ms (hard-cut state lists). */
export function stepAt(steps, ms) {
	let cur = null;
	for (const s of steps ?? []) if (ms >= (s.atMs ?? 0)) cur = s;
	return cur;
}

/** Stage-px offset of the end card (scene-relative ms from 15.96s), measured
 *  from the limb edge's per-frame position (ref 960-px y -> x4/3, minus the
 *  opening's 258). */
export const END_PAN = [
	[0, 545.3],
	[2240, 545.3],
	[2400, 538.7],
	[2560, 530.7],
	[2720, 516.0],
	[2880, 496.0],
	[3040, 468.0],
	[3200, 429.3],
	[3360, 370.7],
	[3440, 340.0],
	[3520, 302.7],
	[3600, 258.7],
	[3680, 206.7],
	[3760, 146.7],
	[3840, 84.0],
	[3920, 32.0],
	[3960, 13.3],
	[4000, 4.0],
	[4040, 0],
];

// ── the arc ───────────────────────────────────────────────────────────────

/**
 * A plate's edge: a circle of radius R whose top is at (ax, ay). `sag` (the
 * measured quantity: how far below the apex the edge meets the frame side,
 * 640 px out) converts to R = (640^2 + sag^2) / (2 sag).
 */
export function arcGeom({ ax = 640, ay = 355, sag = 90 }) {
	const s = Math.max(1, sag);
	const R = (640 * 640 + s * s) / (2 * s);
	return {
		ax,
		ay,
		R,
		cy: ay + R,
		yAt: (x) => ay + R - Math.sqrt(Math.max(0, R * R - (x - ax) * (x - ax))),
	};
}

/**
 * The plate edge as a polyline, with an optional profile on top of the arc:
 *   smooth  — the arc itself
 *   rough   — value-noise relief (crumbs, torn paper, a mountain ridge)
 *   bumps   — beads standing on the rim (droplets, cells, studs)
 *   scallop — a run of shallow half-discs (lace, a pie crust, pottery)
 *   fur     — dense fine spikes (seed fluff, frost, bristle)
 * Returns points [x, y] from x=-40 to x=1320; y grows downward. Relief is
 * applied along the vertical, which on these radii (>= 800 px) is
 * indistinguishable from the normal.
 */
export function edgePoints(geom, edge = {}) {
	const style = edge.style ?? "smooth";
	const amp = edge.amp ?? 0;
	const step = 4;
	const pts = [];
	const n1 = noise1(edge.seed ?? 7);
	const n2 = noise1((edge.seed ?? 7) + 101);
	const r = rng((edge.seed ?? 7) + 7);
	const period = edge.period ?? 60;
	const spikes = style === "fur" ? Array.from({ length: 2000 }, () => r()) : null;
	for (let x = -40; x <= 1320; x += style === "fur" ? 2 : step) {
		let y = geom.yAt(x);
		if (style === "rough") {
			const f = edge.freq ?? 0.02;
			y -= amp * (0.65 * n1(x * f) + 0.35 * n2(x * f * 3.1));
		} else if (style === "scallop") {
			const ph = (((x + (edge.phase ?? 0)) % period) + period) % period;
			const u = ph / period;
			y -= amp * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2));
		} else if (style === "fur") {
			const k = Math.floor((x + 40) / 2);
			y -= amp * (0.35 + 0.65 * spikes[k % spikes.length] ** 2) * (0.6 + 0.4 * n1(x * 0.01));
		}
		if (style === "rough" || style === "fur") y += 0;
		pts.push([x, y]);
	}
	return pts;
}

export const ptsPath = (pts) =>
	pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");

/** The body region (below the edge) as a closed path. */
export const bodyPath = (pts) => `${ptsPath(pts)}L1320 1500L-40 1500Z`;
/** The sky region (above the edge) as a closed path. */
export const skyPath = (pts) => `${ptsPath(pts)}L1320 -800L-40 -800Z`;

// ── the limb ──────────────────────────────────────────────────────────────

/**
 * The planet limb used at both ends of the film. `edgeY` is where the limb's
 * top crosses frame centre, `R` its radius; `glow` stretches the haze above
 * d=60 (the opening breathes outward ~15% over its 1.24s); `blur` softens it.
 * Drawn as one radial gradient centred on the planet, so every band follows
 * the curvature exactly.
 */
export function Limb({
	id,
	edgeY = 344,
	R = 3750,
	ax = 640,
	glow = 1,
	blur = 0,
	tint = 0.6,
	dy = 0,
}) {
	const cy = edgeY + R + dy;
	const dmax = 900;
	const stretch = (d) => (d > 60 ? 60 + (d - 60) * glow : d);
	const rOuter = R + stretch(dmax);
	const stops = LIMB.map(([d, c]) => [(R + stretch(d)) / rOuter, c]);
	stops.push([1, A.sky]);
	return (
		<svg
			width="1280"
			height="720"
			viewBox="0 0 1280 720"
			style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
		>
			<defs>
				<radialGradient id={`${id}-limb`} gradientUnits="userSpaceOnUse" cx={ax} cy={cy} r={rOuter}>
					{stops.map(([o, c], i) => (
						<stop key={i} offset={clamp01(o).toFixed(6)} stopColor={rgbs(c)} />
					))}
				</radialGradient>
				{/* Off-axis the bands shift: warmer and brighter to the left,
				    cooler and purpler to the right (f001 x=60 vs x=900). */}
				<linearGradient
					id={`${id}-tint`}
					x1="0"
					y1="0"
					x2="1280"
					y2="0"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0" stopColor="rgb(255,214,150)" stopOpacity={0.1 * tint} />
					<stop offset="0.5" stopColor="rgb(255,214,150)" stopOpacity="0" />
					<stop offset="0.5" stopColor="rgb(150,110,170)" stopOpacity="0" />
					<stop offset="1" stopColor="rgb(150,110,170)" stopOpacity={0.16 * tint} />
				</linearGradient>
				{blur > 0 ? (
					<filter
						colorInterpolationFilters="sRGB"
						id={`${id}-blur`}
						x="-10%"
						y="-50%"
						width="120%"
						height="200%"
					>
						<feGaussianBlur stdDeviation={blur} />
					</filter>
				) : null}
			</defs>
			<g filter={blur > 0 ? `url(#${id}-blur)` : undefined}>
				<rect x="-200" y="-1200" width="1680" height="3200" fill={`url(#${id}-limb)`} />
				<circle
					cx={ax}
					cy={cy}
					r={R + 150}
					fill={`url(#${id}-tint)`}
					style={{ mixBlendMode: "soft-light" }}
				/>
			</g>
		</svg>
	);
}

// ── grain ─────────────────────────────────────────────────────────────────

/**
 * Film grain over everything: fractal noise re-seeded once per source frame
 * (25 fps), blended soft-light. The reference is visibly grainy on every flat
 * area (sky std ~2.5/255 on the end card); without it the rebuild's flat
 * grounds read as digital.
 */
export function Grain({ id, t, amount = 0.22, fps = 25, freq = 0.9 }) {
	const seed = 1 + Math.floor(t * fps + 1e-6);
	return (
		<svg
			width="1280"
			height="720"
			viewBox="0 0 1280 720"
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				mixBlendMode: "soft-light",
				opacity: amount,
				zIndex: 20,
			}}
		>
			<defs>
				<filter
					colorInterpolationFilters="sRGB"
					id={`${id}-g`}
					x="0"
					y="0"
					width="1280"
					height="720"
					filterUnits="userSpaceOnUse"
				>
					<feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="1" seed={seed} />
					<feColorMatrix type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" />
				</filter>
			</defs>
			<rect x="0" y="0" width="1280" height="720" filter={`url(#${id}-g)`} />
		</svg>
	);
}

// ── the mark ──────────────────────────────────────────────────────────────

/**
 * Alder's mark (original): a disc cut by its own horizon — the film's one
 * shape, as a glyph. A ring, a filled lower segment, and a gap between them.
 */
export function AlderMark({ size = 30, colour = A.title }) {
	const s = size;
	return (
		<svg
			width={s}
			height={s}
			viewBox="0 0 100 100"
			style={{ display: "block", overflow: "visible" }}
		>
			<circle cx="50" cy="50" r="42" fill="none" stroke={rgbs(colour)} strokeWidth="9" />
			<path
				d="M14 60 Q50 48 86 60 A42 42 0 0 1 14 60Z"
				fill={rgbs(colour)}
				transform="translate(0 2)"
			/>
		</svg>
	);
}
