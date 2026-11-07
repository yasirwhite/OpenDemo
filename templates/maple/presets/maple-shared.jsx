/**
 * maple-shared.jsx — the vocabulary every maple preset is built from.
 *
 * Measured off the QuiverAI "Arrow 1.0" launch film (30.0s, 1920x1080 @60fps;
 * frames resampled to a 30fps clock at the 1280x720 stage, so stage px = ref
 * px / 1.5; frame n = n/30 s). Frame numbers below are on that clock.
 *
 *   GROUNDS  two flat values cutting hard: white [253,255,252] and black
 *            [0,1,0] (corner samples f30, f100, f215). Two fades: white->black
 *            f414-f423 and grey [192]->black f634-f647 (s4 / s5 own them).
 *   THE MARK the film's protagonist is a vector mark shown as outline, trace,
 *            wireframe with anchor nodes and fillets, navy fill, hatch,
 *            gradient fill, solid white on a gradient, app icon and card art.
 *            The reference's is a pointy-top hexagon (272x325 at f100, edge
 *            slope 0.60 from its own SVG code "M196.5 1.75L391.5 118.75")
 *            with a cube-fold knockout. Maple's is ORIGINAL: the same hexagon
 *            construction (it is plain geometry) with an up-pointing
 *            arrowhead ("samara") knockout whose notch edges run parallel to
 *            the hexagon's lower edges. Two variations replace the reference's
 *            tri-blade and cube: "blades" (three samara blades) and "cube".
 *   LOGO     the brand lockup / end card use a different glyph in the
 *            reference (its company logo, not the hexagon). Maple's is
 *            `MapleLogo`: a leaf with an arrowhead knockout. Original.
 *   CHROME   macOS-style arrowhead pointer (white fill, black edge; 50 px at
 *            f290), light-blue selection box (~1.5 px [40,140,225]) with
 *            ~13 px white square handles (f290), anchor nodes (white ring,
 *            blue core [20,150,245], ~9 px at f215), blue caret [0,147,252]
 *            and blue send button [28,86,231].
 *
 * Every export is a pure function of its props / t.
 */
import React from "react";
import { clamp01, easeByName, lerp } from "../../../src/lib/textcards/src/easing.js";

// ── type ──────────────────────────────────────────────────────────────────

/** UI and prompts: an Inter-class grotesk (S3 prompt ~84 px, S5 card ~22 px). */
export const FONT = `"Inter Display", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
/** Geometric sans (lockup "Maple", outline "lorem"): Century Gothic is installed. */
export const GEO = `"Century Gothic", "Futura", "Avenir Next", "Segoe UI", sans-serif`;
/** Monospace: the S1 SVG-code drift (~40 px cap) and the end-card url (~16 px). */
export const MONO = `"Cascadia Mono", "SF Mono", Consolas, "Courier New", monospace`;

export const rgbs = (c, a = 1) =>
	a >= 1
		? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
		: `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, a).toFixed(4)})`;

export const mix = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));

// ── palette ───────────────────────────────────────────────────────────────

/** Measured palette (sample, not invent; sections may override per beat). */
export const Q = {
	// grounds (corner medians: f30 / f100 white, f75 / f215 black)
	white: [253, 255, 252],
	black: [0, 1, 0],
	pure: [255, 255, 255],
	fadeGrey: [192, 192, 192], // S5 f634 cut-to-grey before the fade to black
	// ink and construction lines
	ink: [20, 20, 20], // outline on white f100, prompt type f330
	outlineDim: [60, 60, 60], // dim outline under the glow trails f61-f90
	gridLine: [225, 227, 224], // isometric dashed grid f91-f120
	wireBright: [230, 230, 230], // S2 close-up lines f121-f180
	wireMid: [130, 130, 130],
	canvas: [240, 241, 239], // S1 canvas-window ground
	dotGrid: [214, 216, 213], // dot grids (S1 window, S5 prompt card)
	placeholder: [120, 120, 120], // "What should Maple draw?" f571-f602
	// the construction blues
	trace: [29, 124, 220], // S1 blue vector trace f12-f45
	navy: [6, 61, 108], // S2 fill, median f195 [6,59,99] / f215 [6,61,108]
	hatch: [45, 145, 224], // S2 hatch line peaks f215 [45,145,223]
	select: [40, 140, 225], // selection box line f290 ([36,130,202]..[54,122,197] anti-aliased)
	nodeCore: [20, 150, 245], // anchor-node centre f215 [21,155,252] / [13,155,241]
	caret: [0, 147, 252], // S3 caret f314
	uiBlue: [28, 86, 231], // send buttons S3 / S5
	// colour on the mark
	pinkCut: [221, 74, 109], // knockout on the S3 gradient f269 (f250 [223,71,92])
	blush: [236, 214, 240], // S2 gradient-fill light end (white -> lilac/pink)
	blushDeep: [212, 79, 139], // S2 gradient-fill pink f250 median
};

// ── keyframes ─────────────────────────────────────────────────────────────

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
/** Film frame (30 fps clock) -> ms, for comments-to-config parity. */
export const fms = (f) => (f * 1000) / 30;

// ── ground ────────────────────────────────────────────────────────────────

/**
 * maple-ground — a flat ground painted as a scene, so a section owns its
 * ground and cuts it on the frame the reference does. cfg.keys:
 * [{ at, colour:[r,g,b], ease? }] scene-relative, kf-interpolated. Cuts are
 * ease:"hold" (the film's grounds cut hard: f61 black, f91 white, f121
 * black ...); fades are a plain eased segment (f414-f423 white->black is
 * near-linear-out: corner 195,130,93,67,46,31,18,10,3,0 -> ease "out").
 */
export function MapleGround(cfg, t) {
	if (!live(cfg, t)) return null;
	const k = kf(cfg.keys ?? [{ at: 0, colour: Q.black }], localMs(cfg, t));
	return <div style={{ position: "absolute", inset: 0, background: rgbs(k.colour ?? Q.black) }} />;
}

// ── the Maple mark: geometry ──────────────────────────────────────────────
//
// Mark units: the hexagon is 384 wide x 460 tall (ratio 1.198; the
// reference's outline is 272x325 = 1.195 at f100), pointy-top, edge slope
// 115/192 = 0.599 (reference SVG: 117/195 = 0.600). Everything below is in
// those units and scaled to the rendered `width` (k = width / 384).

const HEX = [
	[192, 0],
	[384, 115],
	[384, 345],
	[192, 460],
	[0, 345],
	[0, 115],
];
// Arrowhead ("samara") knockout: tip, right wing, notch, left wing. Flanks
// at ~60 deg, notch edges at slope 0.6 = parallel to the hexagon's lower
// edges (an isometric rhyme, so it sits on the S1 construction grid).
const ARROW = [
	[192, 134],
	[306, 330],
	[192, 262],
	[78, 330],
];
const CENTRE = [192, 230];

// Variation A: a three-armed samara star knockout (stand-in for the
// reference's tri-blade, f437-f505): arm tips 150 units out at -90/30/150
// deg, valleys 46 units out between them, flanks slightly bowed by a
// shoulder point so the arms read as seed wings, not a plain star.
const BLADES = [
	(() => {
		const pt = (deg, r) => {
			const a = (deg * Math.PI) / 180;
			return [CENTRE[0] + Math.cos(a) * r, CENTRE[1] + Math.sin(a) * r];
		};
		const out = [];
		for (const d of [-90, 30, 150]) {
			out.push(pt(d - 26, 92), pt(d, 150), pt(d + 26, 92), pt(d + 60, 46));
		}
		return out;
	})(),
];
// Variation B: isometric cube, centre vertex at the hexagon's centre.
const CUBE_FACES = [
	[HEX[0], HEX[1], CENTRE, HEX[5]],
	[HEX[5], CENTRE, HEX[3], HEX[4]],
	[CENTRE, HEX[1], HEX[2], HEX[3]],
];
const CUBE_EDGES = [
	[CENTRE, HEX[1]],
	[CENTRE, HEX[3]],
	[CENTRE, HEX[5]],
];

/** Raw mark geometry in mark units (for code, tests, custom drawing). */
export const MARK = {
	w: 384,
	h: 460,
	hex: HEX,
	arrow: ARROW,
	blades: BLADES,
	cubeFaces: CUBE_FACES,
	centre: CENTRE,
};

const f2 = (n) => (Math.round(n * 100) / 100).toString();

/**
 * Rounded polygon: each vertex becomes two tangent points joined by an arc
 * of radius r (the S2 "corner rounding": f150-f180 each vertex splits into
 * two anchor dots joined by a fillet). r = 0 gives the sharp polygon and one
 * anchor per vertex. Returns { d, anchors:[[x,y]...], pts }. The path starts
 * just after the LAST vertex and runs through vertex 0 first (for the
 * hexagon: from the upper-left vertex, clockwise via the top).
 */
export function roundedPath(pts, r = 0, k = 1, ox = 0, oy = 0) {
	const P = pts.map(([x, y]) => [ox + x * k, oy + y * k]);
	const n = P.length;
	const R = Math.max(0, r * k);
	if (R < 0.01) {
		const d = `M${P.map(([x, y]) => `${f2(x)} ${f2(y)}`).join("L")}Z`;
		return { d, anchors: P, pts: P };
	}
	const segs = [];
	const anchors = [];
	for (let i = 0; i < n; i++) {
		const p = P[i];
		const a = P[(i - 1 + n) % n];
		const b = P[(i + 1) % n];
		const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
		const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
		const u1 = [(a[0] - p[0]) / la, (a[1] - p[1]) / la];
		const u2 = [(b[0] - p[0]) / lb, (b[1] - p[1]) / lb];
		const cos = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]));
		const th = Math.acos(cos);
		let dd = R / Math.tan(th / 2);
		dd = Math.min(dd, la * 0.45, lb * 0.45);
		const rr = dd * Math.tan(th / 2);
		const t1 = [p[0] + u1[0] * dd, p[1] + u1[1] * dd];
		const t2 = [p[0] + u2[0] * dd, p[1] + u2[1] * dd];
		const cross = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]);
		const sweep = cross > 0 ? 1 : 0;
		segs.push({ t1, t2, rr, sweep });
		anchors.push(t1, t2);
	}
	const last = segs[n - 1];
	let d = `M${f2(last.t2[0])} ${f2(last.t2[1])}`;
	for (const s of segs) {
		d += `L${f2(s.t1[0])} ${f2(s.t1[1])}A${f2(s.rr)} ${f2(s.rr)} 0 0 ${s.sweep} ${f2(s.t2[0])} ${f2(s.t2[1])}`;
	}
	return { d: `${d}Z`, anchors, pts: P };
}

/**
 * markGeometry({ width, variant, radius, pad }) — the mark in STAGE px,
 * origin at the hexagon's top-left (plus `pad`). `radius` is in mark units
 * (384 = full width; px = radius * width / 384). Returns
 * { width, height, k, outer, inner:[...], faces, edges, centre } where outer /
 * inner items are { d, anchors, pts }. Use it for custom drawing (glow
 * trails, code text, per-anchor animation).
 */
export function markGeometry({ width = 272, variant = "main", radius = 0, pad = 0 } = {}) {
	const k = width / MARK.w;
	const parts = markParts(variant, radius, k, pad, pad);
	const sc = ([x, y]) => [pad + x * k, pad + y * k];
	return {
		width,
		height: MARK.h * k,
		k,
		outer: parts.outer,
		inner: parts.inner,
		faces: variant === "cube" ? CUBE_FACES.map((f) => f.map(sc)) : [],
		edges: variant === "cube" ? CUBE_EDGES.map((e) => e.map(sc)) : [],
		centre: sc(CENTRE),
	};
}

// Inner shapes round a little tighter than the hexagon (S3 white mark f290);
// the blades are always slightly rounded so they read as seed wings.
function markParts(variant, radius, k, ox, oy) {
	const rp = (pts, r) => roundedPath(pts, r, k, ox, oy);
	let inner = [];
	if (variant === "main") inner = [rp(ARROW, radius * 0.6)];
	else if (variant === "blades") inner = BLADES.map((b) => rp(b, Math.max(radius, 12) * 0.7));
	return { outer: rp(HEX, radius), inner };
}

/**
 * The mark's own SVG source, line by line — the S1 code drift must show REAL
 * code (copy deck), so it is generated from the geometry above (mark units,
 * offset by 8,4 into a 400x468 viewBox). Main variant, sharp corners:
 *   <path d="M200 4L392 119L392 349L200 464L8 349L8 119Z" .../>
 *   <path d="M200 138L314 334L200 266L86 334Z" .../>
 */
export function markSvgCode({ variant = "main", radius = 0 } = {}) {
	const parts = markParts(variant, radius, 1, 8, 4);
	const lines = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 468" fill="none">'];
	lines.push(`<path d="${parts.outer.d}" stroke="#141414" stroke-width="3"/>`);
	for (const i of parts.inner) lines.push(`<path d="${i.d}" stroke="#141414" stroke-width="3"/>`);
	if (variant === "cube") {
		const c = [CENTRE[0] + 8, CENTRE[1] + 4];
		const e = CUBE_EDGES.map(([, b]) => `M${c[0]} ${c[1]}L${b[0] + 8} ${b[1] + 4}`).join("");
		lines.push(`<path d="${e}" stroke="#141414" stroke-width="3"/>`);
	}
	lines.push("</svg>");
	return lines;
}

// ── the Maple mark: component ─────────────────────────────────────────────

const sid = (s) => s.replace(/[^a-zA-Z0-9_-]/g, "");

/** One anchor, as SVG. kind "dot" (S2 close-up white dot, ~5 px at f132) or
 * "node" (white ring + blue core, ~9 px outer at f215). */
export function anchorSvg(
	x,
	y,
	{ kind = "node", size = 9, scale = 1, colour = Q.pure, core = Q.nodeCore, key } = {},
) {
	const r = (size / 2) * scale;
	if (r <= 0.05) return null;
	if (kind === "dot") return <circle key={key} cx={x} cy={y} r={r} fill={rgbs(colour)} />;
	return (
		<g key={key}>
			<circle cx={x} cy={y} r={r} fill={rgbs(colour)} />
			<circle cx={x} cy={y} r={r * 0.62} fill={rgbs(core)} />
		</g>
	);
}

/**
 * <MapleMark> — the hero mark in any construction state. A block `width` x
 * height (height = width * 460/384); pass `cx`/`cy` to centre it absolutely
 * at a stage point instead. All pixel props are STAGE px at this width.
 *
 *   variant      "main" (arrowhead knockout) | "blades" (variation A) | "cube" (B)
 *   radius       fillet in mark units (0 = sharp; the S3 white mark ~22)
 *   stroke       outline colour or null; strokeWidth px (~2.2 at f100, ~2 at f215);
 *                strokeOpacity; draw 0..1 (or [outer, inner]) draws the
 *                path on from its start; dash {array, offset} (pathLength 1
 *                units) overrides draw for trails/comets
 *   fill         solid fill colour or null; fillOpacity
 *   fillGradient {angle (CSS deg), stops:[[p,[r,g,b]],...]} linear fill
 *   knockout     colour painted into the knockout; null = a true hole
 *   hatch        {colour, pitch, width, angle, progress, soft} diagonal hatch
 *                clipped to the fill area (f198-f212: lines at ~60 deg, ~11 px
 *                perpendicular pitch at width 326, ~3 px wide); progress 0..1
 *                sweeps it in from the lower right to the upper left
 *   faces        cube only: [top, left, right] colours (default from fill)
 *   anchors      null | "dot" | "node"; anchorSize px; anchorScale 0..1;
 *                anchorOpacity
 *   pad          px of room around the hexagon for strokes/nodes (default 8)
 */
export function MapleMark({
	width = 272,
	variant = "main",
	radius = 0,
	stroke = null,
	strokeWidth = 2,
	strokeOpacity = 1,
	draw = 1,
	dash = null,
	fill = null,
	fillOpacity = 1,
	fillGradient = null,
	knockout = null,
	hatch = null,
	faces = null,
	anchors = null,
	anchorSize = 10,
	anchorScale = 1,
	anchorOpacity = 1,
	pad = 8,
	cx = null,
	cy = null,
	opacity = 1,
	style = null,
}) {
	const uid = sid(React.useId());
	const g = markGeometry({ width, variant, radius, pad });
	const W = width + pad * 2;
	const H = g.height + pad * 2;
	const area = [g.outer.d, ...g.inner.map((i) => i.d)].join(" ");
	const fillPaint = fillGradient ? `url(#${uid}g)` : fill ? rgbs(fill) : null;
	const [dOuter, dInner] = Array.isArray(draw) ? draw : [draw, draw];
	const dashFor = (p) =>
		dash
			? { strokeDasharray: dash.array, strokeDashoffset: dash.offset ?? 0 }
			: p < 1
				? { strokeDasharray: `${Math.max(0, p)} 2`, strokeDashoffset: 0 }
				: {};
	const strokeProps = (p) => ({
		fill: "none",
		stroke: rgbs(stroke),
		strokeWidth,
		strokeOpacity,
		strokeLinejoin: "round",
		strokeLinecap: "round",
		pathLength: 1,
		...dashFor(p),
	});
	let gradEl = null;
	if (fillGradient) {
		const a = (((fillGradient.angle ?? 180) - 90) * Math.PI) / 180;
		const dx = Math.cos(a) / 2;
		const dy = Math.sin(a) / 2;
		gradEl = (
			<linearGradient id={`${uid}g`} x1={0.5 - dx} y1={0.5 - dy} x2={0.5 + dx} y2={0.5 + dy}>
				{fillGradient.stops.map(([p, c], i) => (
					<stop key={i} offset={p} stopColor={rgbs(c)} />
				))}
			</linearGradient>
		);
	}
	let hatchEls = null;
	if (hatch && (hatch.progress ?? 1) > 0) {
		const pitch = hatch.pitch ?? width * 0.033;
		const lw = hatch.width ?? Math.max(1, width * 0.009);
		const ang = hatch.angle ?? 60; // from horizontal, rising to the right
		const prog = clamp01(hatch.progress ?? 1);
		const soft = hatch.soft ?? 0.04;
		hatchEls = (
			<>
				<pattern
					id={`${uid}h`}
					patternUnits="userSpaceOnUse"
					width={pitch}
					height={pitch}
					patternTransform={`rotate(${90 - ang})`}
				>
					<rect
						x={(pitch - lw) / 2}
						y={0}
						width={lw}
						height={pitch}
						fill={rgbs(hatch.colour ?? Q.hatch)}
					/>
				</pattern>
				<linearGradient id={`${uid}hm`} gradientUnits="userSpaceOnUse" x1={W} y1={H} x2={0} y2={0}>
					<stop offset={Math.max(0, prog - soft)} stopColor="#fff" />
					<stop offset={Math.min(1, prog + 0.0001)} stopColor="#000" />
				</linearGradient>
				<mask id={`${uid}m`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
					<rect x={0} y={0} width={W} height={H} fill={prog >= 1 ? "#fff" : `url(#${uid}hm)`} />
				</mask>
			</>
		);
	}
	const faceCols =
		faces ?? (fill ? [fill, mix(fill, Q.black, 0.1), mix(fill, Q.black, 0.2)] : null);
	const anchorList = anchors ? [...g.outer.anchors, ...g.inner.flatMap((i) => i.anchors)] : [];
	if (anchors && variant === "cube") anchorList.push(g.centre);
	const positioned =
		cx != null && cy != null
			? { position: "absolute", left: cx - W / 2, top: cy - H / 2 }
			: { display: "block" };
	return (
		<svg
			width={W}
			height={H}
			viewBox={`0 0 ${f2(W)} ${f2(H)}`}
			style={{ overflow: "visible", opacity, ...positioned, ...(style ?? {}) }}
		>
			<defs>
				{gradEl}
				{hatchEls}
				<clipPath id={`${uid}c`}>
					<path d={g.outer.d} />
				</clipPath>
			</defs>
			{fillPaint && variant !== "cube" ? (
				<path d={area} fill={fillPaint} fillRule="evenodd" fillOpacity={fillOpacity} />
			) : null}
			{faceCols && variant === "cube" ? (
				<g clipPath={`url(#${uid}c)`} opacity={fillOpacity}>
					{g.faces.map((f, i) => (
						<path
							key={i}
							d={`M${f.map(([x, y]) => `${f2(x)} ${f2(y)}`).join("L")}Z`}
							fill={rgbs(faceCols[i])}
							stroke={rgbs(faceCols[i])}
							strokeWidth={0.6}
						/>
					))}
				</g>
			) : null}
			{knockout ? g.inner.map((i, n) => <path key={n} d={i.d} fill={rgbs(knockout)} />) : null}
			{hatchEls ? (
				<path
					d={area}
					fillRule="evenodd"
					fill={`url(#${uid}h)`}
					mask={`url(#${uid}m)`}
					opacity={hatch.opacity ?? 1}
				/>
			) : null}
			{stroke ? (
				<g>
					<path d={g.outer.d} {...strokeProps(dOuter)} />
					{g.inner.map((i, n) => (
						<path key={n} d={i.d} {...strokeProps(dInner)} />
					))}
					{g.edges.map(([a, b], n) => (
						<path
							key={`e${n}`}
							d={`M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}`}
							{...strokeProps(dInner)}
						/>
					))}
				</g>
			) : null}
			{anchors ? (
				<g opacity={anchorOpacity}>
					{anchorList.map(([x, y], n) =>
						anchorSvg(x, y, { kind: anchors, size: anchorSize, scale: anchorScale, key: n }),
					)}
				</g>
			) : null}
		</svg>
	);
}

// ── the brand logo + lockup ───────────────────────────────────────────────

/**
 * <MapleLogo> — Maple's own glyph for the lockup (f692-f750) and the end
 * card (f783-f899), where the reference shows its company logo (a different
 * glyph from the hexagon). Original: a leaf (two round corners, two tight
 * ones) with an arrowhead knockout pointing to the leaf's tip. `size` is the
 * glyph's box (the end-card glyph is ~70 px, the lockup's ~65 px).
 * `cut` = knockout colour; null keeps a true hole.
 */
export function MapleLogo({ size = 70, colour = Q.pure, cut = null, style = null }) {
	const big = 46;
	const sm = 7;
	const leaf = `M${big} 0H${100 - sm}A${sm} ${sm} 0 0 1 100 ${sm}V${100 - big}A${big} ${big} 0 0 1 ${100 - big} 100H${sm}A${sm} ${sm} 0 0 1 0 ${100 - sm}V${big}A${big} ${big} 0 0 1 ${big} 0Z`;
	// arrowhead pointing +x (tip, wing, notch, wing), rotated -45 deg about (50,50)
	const ah = [
		[25, 0],
		[-15, 19],
		[-6, 0],
		[-15, -19],
	];
	const c = Math.SQRT1_2;
	const pts = ah.map(([x, y]) => [50 + 2 + x * c + y * c, 50 - 2 - x * c + y * c]);
	const arrow = `M${pts.map(([x, y]) => `${f2(x)} ${f2(y)}`).join("L")}Z`;
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			style={{ display: "inline-block", flex: "0 0 auto", overflow: "visible", ...(style ?? {}) }}
		>
			<path
				d={cut ? leaf : `${leaf} ${arrow}`}
				fill={rgbs(colour)}
				fillRule="evenodd"
				strokeLinejoin="round"
			/>
			{cut ? (
				<path
					d={arrow}
					fill={rgbs(cut)}
					stroke={rgbs(cut)}
					strokeWidth={2}
					strokeLinejoin="round"
				/>
			) : null}
		</svg>
	);
}

/**
 * <Lockup> — [MapleLogo] Maple **AI**-style lockup (reference f700-f750:
 * bold geometric name + light suffix, logo ~0.88x the cap-to-baseline
 * height, gap ~37 px at a ~75 px line). Laid out with flex so other names
 * reflow. `size` = font px of the name. `caret` adds the I-beam after the
 * suffix (s6 animates it).
 */
export function Lockup({
	name = "Maple",
	suffix = "AI",
	size = 72,
	colour = Q.pure,
	logo = true,
	logoScale = 0.9,
	gap = 0.5,
	suffixWeight = 300,
	suffixFont = FONT,
	caret = false,
	style = null,
}) {
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: size * gap,
				color: rgbs(colour),
				whiteSpace: "nowrap",
				lineHeight: 1,
				...(style ?? {}),
			}}
		>
			{logo ? <MapleLogo size={size * logoScale} colour={colour} /> : null}
			<span style={{ display: "inline-flex", alignItems: "baseline" }}>
				<span style={{ font: `700 ${size}px ${GEO}`, letterSpacing: "-0.01em" }}>{name}</span>
				{suffix ? (
					<span
						style={{ font: `${suffixWeight} ${size}px ${suffixFont}`, letterSpacing: "0.01em" }}
					>
						{suffix}
					</span>
				) : null}
				{caret ? (
					<IBeam height={size * 0.78} colour={colour} style={{ marginLeft: size * 0.06 }} />
				) : null}
			</span>
		</span>
	);
}

// ── design-tool chrome ────────────────────────────────────────────────────

/** <IBeam> — the thin text-insertion I-beam after the lockup's suffix (f700). */
export function IBeam({ height = 56, colour = Q.pure, width = 1.6, opacity = 1, style = null }) {
	const w = height * 0.28;
	return (
		<svg
			width={w}
			height={height}
			viewBox={`0 0 ${f2(w)} ${f2(height)}`}
			style={{
				display: "inline-block",
				flex: "0 0 auto",
				opacity,
				overflow: "visible",
				...(style ?? {}),
			}}
		>
			<path
				d={`M0 ${width / 2}H${f2(w)}M${f2(w / 2)} ${width / 2}V${f2(height - width / 2)}M0 ${f2(height - width / 2)}H${f2(w)}`}
				stroke={rgbs(colour)}
				strokeWidth={width}
				fill="none"
			/>
		</svg>
	);
}

/**
 * The arrowhead pointer (f181-f214, f269-f300, f360-f413, f460-f505,
 * f691-f800): a delta with a notch, white fill + black edge on dark /
 * gradient grounds (f290, ~50 px), grey on white (s3: pass fill/edge).
 * Measured at f290 relative to the tip: right wing (48,17), bottom wing
 * (17,49), notch (19,20). (x,y) is the TIP; `size` = box px (24-unit glyph).
 * `press` 0..1 shrinks it ~10% for a click. `blur` px for whips. `rotate`
 * (deg, clockwise about the tip; s2 turns it ~38 deg at f203-f205).
 *
 * Visible size is NOT `size`: see CURSOR_CAL. The round-joined 1.9-unit edge
 * eats into the acute tips, so tip -> right-wing reads ~0.70-0.74 x size
 * (s2: size 64 -> 44.5 px, size 100 -> the reference's 74 px), and on black only ~15.15 of the 24 units
 * read as white fill, with the white tip (2.46, 2.05) units inside the path
 * tip (s6). To hit a measured visible extent E, pass size = E / CURSOR_CAL.span
 * (edge-to-edge) or scale by E / CURSOR_CAL.whiteUnits (white fill only).
 */
export const CURSOR_CAL = { span: 0.72, whiteUnits: 15.15, tipInset: [2.46, 2.05] };

export function ArrowCursor({
	x,
	y,
	size = 44,
	fill = Q.pure,
	edge = [0, 0, 0],
	press = 0,
	opacity = 1,
	blur = 0,
	shadow = true,
	rotate = 0,
}) {
	const s = (size / 24) * (1 - 0.1 * clamp01(press));
	const turn = rotate ? `rotate(${rotate.toFixed(3)}deg) ` : "";
	const filters = [];
	if (shadow) filters.push("drop-shadow(0px 1px 1.5px rgba(0,0,0,0.28))");
	if (blur > 0) filters.push(`blur(${blur}px)`);
	return (
		<svg
			width={24}
			height={24}
			viewBox="0 0 24 24"
			style={{
				position: "absolute",
				left: x - 1.5,
				top: y - 1.5,
				opacity,
				overflow: "visible",
				transform: `${turn}scale(${s.toFixed(4)})`,
				transformOrigin: "1.5px 1.5px",
				filter: filters.length ? filters.join(" ") : undefined,
			}}
		>
			<path
				d="M1.5 1.5L23 9.4L10.6 10.6L9.4 23Z"
				fill={rgbs(fill)}
				stroke={rgbs(edge)}
				strokeWidth="1.9"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

const HANDLE_POS = {
	tl: [0, 0],
	tm: [0.5, 0],
	tr: [1, 0],
	ml: [0, 0.5],
	mr: [1, 0.5],
	bl: [0, 1],
	bm: [0.5, 1],
	br: [1, 1],
};

/**
 * <SelectionBox> — thin light-blue box with square white handles (f269-f300
 * resize: line ~1.5 px, handles ~13 px with a 1.5 px blue border; f692-f782
 * lockup: corners + top-middle). Absolute at (x,y) w x h in stage px.
 * `handles`: list of tl tm tr ml mr bl bm br.
 */
export function SelectionBox({
	x,
	y,
	w,
	h,
	colour = Q.select,
	line = 1.5,
	handle = 13,
	handles = ["tl", "tr", "bl", "br"],
	handleFill = Q.pure,
	opacity = 1,
}) {
	const pad = handle;
	return (
		<svg
			width={w + pad * 2}
			height={h + pad * 2}
			style={{ position: "absolute", left: x - pad, top: y - pad, opacity, overflow: "visible" }}
		>
			<rect
				x={pad}
				y={pad}
				width={Math.max(0, w)}
				height={Math.max(0, h)}
				fill="none"
				stroke={rgbs(colour)}
				strokeWidth={line}
			/>
			{handles.map((hn) => {
				const p = HANDLE_POS[hn];
				if (!p) return null;
				return (
					<rect
						key={hn}
						x={pad + p[0] * w - handle / 2}
						y={pad + p[1] * h - handle / 2}
						width={handle}
						height={handle}
						fill={rgbs(handleFill)}
						stroke={rgbs(colour)}
						strokeWidth={line}
					/>
				);
			})}
		</svg>
	);
}

/** <AnchorNode> — one anchor point, absolutely placed (see anchorSvg). */
export function AnchorNode({ x, y, kind = "node", size = 10, scale = 1, opacity = 1 }) {
	const s = size + 2;
	return (
		<svg
			width={s}
			height={s}
			style={{
				position: "absolute",
				left: x - s / 2,
				top: y - s / 2,
				opacity,
				overflow: "visible",
			}}
		>
			{anchorSvg(s / 2, s / 2, { kind, size, scale })}
		</svg>
	);
}

/**
 * <Guide> — a construction guide line in stage px (f692-f720: a dotted
 * horizontal into the lockup's centre line + a thin vertical above the mark,
 * both ~[60,70,90]). `dash` [on, off] px or null for solid; `draw` 0..1
 * grows it from (x1,y1).
 */
export function Guide({
	x1,
	y1,
	x2,
	y2,
	colour = [60, 70, 90],
	width = 1,
	dash = [2, 3],
	draw = 1,
	opacity = 1,
}) {
	const ex = lerp(x1, x2, clamp01(draw));
	const ey = lerp(y1, y2, clamp01(draw));
	return (
		<svg
			width={1}
			height={1}
			style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity }}
		>
			<line
				x1={x1}
				y1={y1}
				x2={ex}
				y2={ey}
				stroke={rgbs(colour)}
				strokeWidth={width}
				strokeDasharray={dash ? dash.join(" ") : undefined}
			/>
		</svg>
	);
}

/** <Caret> — the blue text caret (f314: [0,147,252], 5 x 102 px beside an
 * ~84 px line). Inline-block; size it to the line. */
export function Caret({ height = 102, width = 5, colour = Q.caret, opacity = 1, style = null }) {
	return (
		<span
			style={{
				display: "inline-block",
				width,
				height,
				borderRadius: width / 2,
				background: rgbs(colour),
				opacity,
				flex: "0 0 auto",
				...(style ?? {}),
			}}
		/>
	);
}

/**
 * <SendButton> — blue rounded square with a white up-arrow (S3 f352: ~64 px,
 * radius ~14; S5 card: ~48 px, radius ~10). `press` 0..1 shrinks to 0.75x
 * (S3 click f390-f398). Block; position it in the section.
 */
export function SendButton({
	size = 64,
	radius = null,
	colour = Q.uiBlue,
	press = 0,
	style = null,
}) {
	const r = radius ?? size * 0.22;
	const sc = 1 - 0.25 * clamp01(press);
	const top = mix(colour, Q.pure, 0.12);
	const a = size * 0.5;
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: r,
				background: `linear-gradient(180deg, ${rgbs(top)}, ${rgbs(colour)})`,
				boxShadow: `0 ${size * 0.06}px ${size * 0.16}px rgba(28,86,231,0.28)`,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				transform: `scale(${sc.toFixed(4)})`,
				flex: "0 0 auto",
				...(style ?? {}),
			}}
		>
			<svg width={a} height={a} viewBox="0 0 24 24" fill="none">
				<path
					d="M12 19V5M5.5 11.5L12 5l6.5 6.5"
					stroke="#fff"
					strokeWidth="2.6"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}

/**
 * <DotGrid> — the faint dot texture of the white construction grounds (S1
 * canvas window; S5 prompt ground, 64 px pitch). Absolute, fills its parent.
 */
export function DotGrid({ pitch = 64, dot = 2, colour = Q.dotGrid, x0 = 0, y0 = 0, opacity = 1 }) {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				opacity,
				backgroundImage: `radial-gradient(circle, ${rgbs(colour)} ${dot / 2}px, transparent ${dot / 2 + 0.6}px)`,
				backgroundSize: `${pitch}px ${pitch}px`,
				backgroundPosition: `${x0 - pitch / 2}px ${y0 - pitch / 2}px`,
			}}
		/>
	);
}

// ── gradient art ──────────────────────────────────────────────────────────

/**
 * Mesh-gradient specs for the S3 full-bleed ground and the S4 rolodex cards,
 * built as layered radial blobs over a base ramp. Colours are 9-point
 * samples of the reference frames (card rect, 12 px medians):
 *   ember   S3 f280 / S4 f424: red [236,76,76] left, magenta-pink
 *           [240,119,181] top centre, dusky [92,74,113] top-left corner,
 *           violet [151,81,216] right, lilac [177,132,211] top-right,
 *           coral [243,145,157] lower left, indigo [96,81,173] lower right,
 *           light lilac swoosh top right.
 *   orchid  S4 f442: purple [133,52,193] left/centre, lilac [215,186,239]
 *           upper right with a white diagonal swoosh, rose [186,115,177]
 *           lower left.
 *   dawn    S4 f452: blue [49,102,198] top, white-hot centre [246,248,245],
 *           pale blue [131,186,223] left, peach [232,183,153] lower centre,
 *           blue [52,128,212] right, violet [178,137,203] lower right.
 *   lagoon  S4 f470: teal [84,178,190] top, mint [200,217,210] centre, deep
 *           [56,87,108] lower-left corner, red bleed [213,90,90] lower
 *           left-centre, aqua [126,198,200] right.
 * base: [angle, ...colours] (CSS linear ramp under everything). blobs:
 * [x%, y%, rx%, ry%, colour, alpha], later blobs paint on top. swoosh: one
 * filled soft-edged ellipse (the lighter wedge in a corner) on top of all.
 */
export const GRADIENTS = {
	ember: {
		base: [118, [238, 86, 92], [214, 76, 150], [150, 82, 214], [92, 76, 170]],
		blobs: [
			[30, 62, 34, 46, [232, 66, 58], 0.95],
			[48, -8, 38, 34, [240, 119, 181], 0.85],
			[86, 48, 30, 46, [151, 81, 216], 0.9],
			[-6, -6, 30, 44, [86, 72, 112], 1],
			[-2, 102, 30, 34, [243, 150, 160], 0.95],
			[104, 104, 34, 40, [70, 64, 150], 1],
		],
		swoosh: [112, -24, 34, 62, [208, 164, 232], 0.8],
	},
	orchid: {
		base: [110, [168, 80, 190], [140, 56, 200], [200, 160, 236]],
		blobs: [
			[22, 45, 40, 60, [136, 52, 196], 1],
			[-2, 104, 30, 40, [196, 124, 172], 0.9],
			[88, 30, 38, 50, [214, 184, 239], 0.9],
			[96, 96, 30, 35, [175, 117, 230], 0.8],
		],
		swoosh: [104, -40, 58, 92, [236, 222, 248], 0.92],
	},
	dawn: {
		base: [180, [48, 100, 198], [120, 160, 214], [160, 180, 220]],
		blobs: [
			[52, 54, 34, 24, [246, 248, 245], 1],
			[8, 58, 22, 40, [131, 186, 223], 0.95],
			[42, 104, 34, 32, [236, 182, 150], 1],
			[96, 55, 18, 45, [52, 128, 212], 0.9],
			[82, 102, 22, 26, [178, 137, 203], 0.9],
			[50, -4, 80, 26, [47, 98, 198], 1],
		],
		swoosh: null,
	},
	lagoon: {
		base: [180, [84, 178, 190], [176, 212, 207], [160, 206, 205]],
		blobs: [
			[58, 66, 44, 46, [202, 218, 210], 1],
			[4, 66, 22, 40, [54, 111, 149], 0.95],
			[-4, 104, 28, 40, [52, 82, 104], 1],
			[24, 98, 10, 36, [213, 90, 90], 1],
			[98, 75, 25, 50, [126, 198, 200], 0.8],
			[50, -6, 84, 26, [84, 178, 190], 1],
		],
		swoosh: null,
	},
};

function gradientCss(spec) {
	const layers = [];
	if (spec.swoosh) {
		const [x, y, rx, ry, c, a] = spec.swoosh;
		layers.push(
			`radial-gradient(ellipse ${rx}% ${ry}% at ${x}% ${y}%, ${rgbs(c, a)} 0%, ${rgbs(c, a * 0.85)} 93%, ${rgbs(c, 0)} 100%)`,
		);
	}
	for (const [x, y, rx, ry, c, a] of [...spec.blobs].reverse()) {
		layers.push(
			`radial-gradient(ellipse ${rx}% ${ry}% at ${x}% ${y}%, ${rgbs(c, a)} 0%, ${rgbs(c, a * 0.55)} 45%, ${rgbs(c, 0)} 100%)`,
		);
	}
	const [ang, ...cols] = spec.base;
	layers.push(`linear-gradient(${ang}deg, ${cols.map((c) => rgbs(c)).join(", ")})`);
	return layers.join(", ");
}

/**
 * <GradientArt> — the soft mesh-gradient card / ground (S3 f269 full-bleed,
 * S3 app-icon tile f312, S4 cards f414-f505, mockup art). A block width x
 * height with corner `radius`; `name` picks a GRADIENTS spec (or pass
 * `spec`). `grain` 0..1 adds the film grain (seeded SVG turbulence, so it is
 * deterministic). `children` render centred on top (the mark).
 */
export function GradientArt({
	name = "ember",
	spec = null,
	width = 940,
	height = 529,
	radius = 16,
	grain = 0.12,
	seed = 3,
	children = null,
	style = null,
}) {
	const g = spec ?? GRADIENTS[name] ?? GRADIENTS.ember;
	const uid = sid(React.useId());
	return (
		<div
			style={{
				position: "relative",
				width,
				height,
				borderRadius: radius,
				overflow: "hidden",
				background: gradientCss(g),
				flex: "0 0 auto",
				...(style ?? {}),
			}}
		>
			{grain > 0 ? (
				<svg
					width={width}
					height={height}
					style={{ position: "absolute", inset: 0, opacity: grain, mixBlendMode: "overlay" }}
				>
					<filter id={`${uid}n`}>
						<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} />
						<feColorMatrix type="saturate" values="0" />
					</filter>
					<rect width={width} height={height} filter={`url(#${uid}n)`} />
				</svg>
			) : null}
			{children ? (
				<div
					style={{
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{children}
				</div>
			) : null}
		</div>
	);
}

// ── image slots ───────────────────────────────────────────────────────────

/**
 * The template's photo slots: the opening sketch photo (f0-f60) and the
 * eight mockup photos (f511-f570, 6 frames each, the last held 18 frames).
 * Labels say what belongs there; `strings` are the copy the reference
 * composites onto the photo (sections may draw them over the slot).
 */
export const SLOTS = {
	"sketch-photo": { label: "photo: hand sketch of your mark on paper", strings: [] },
	"mockup-1": {
		label: "mockup-1: printed brochure / cover",
		strings: ["Lorem", "Samara · Maple", "THE…"],
	},
	"mockup-2": { label: "mockup-2: coffee cup", strings: [] },
	"mockup-3": { label: "mockup-3: shopfront / signage", strings: ["Lorem"] },
	"mockup-4": { label: "mockup-4: street poster", strings: ["Lorem", "Samara"] },
	"mockup-5": { label: "mockup-5: framed print", strings: [] },
	"mockup-6": { label: "mockup-6: packaging", strings: ["Samara"] },
	"mockup-7": { label: "mockup-7: apparel", strings: [] },
	"mockup-8": { label: "mockup-8: billboard", strings: ["LOREM", "LOREM", "Samara · Maple"] },
};

/**
 * <ImageSlot> — a labelled photo slot. With `src` it shows the image
 * (object-fit cover; pass the path under the scene key `src` so the
 * renderer's image gate preloads it). Without, a neutral photographic
 * placeholder (soft vignette, a small picture glyph, the label). `slot`
 * picks the label from SLOTS. Block width x height; `children` overlay it
 * (e.g. a drawn mark composited onto the photo). `labelPosition` "center"
 * (default) or "corner": a small bottom-left caption that stays clear of a
 * mark composited in the middle (the s5 mockups draw the same caption).
 */
export function ImageSlot({
	slot = null,
	label = null,
	src = null,
	width = 1280,
	height = 720,
	radius = 0,
	tone = "warm",
	desaturate = 0,
	children = null,
	style = null,
	labelPosition = "center",
}) {
	const text = label ?? (slot && SLOTS[slot] ? SLOTS[slot].label : "photo");
	const corner = labelPosition === "corner";
	const faces = {
		warm: "radial-gradient(ellipse 90% 80% at 45% 40%, rgb(206,200,190), rgb(150,142,132) 70%, rgb(104,98,92))",
		paper:
			"radial-gradient(ellipse 90% 80% at 45% 45%, rgb(232,232,228), rgb(196,196,192) 75%, rgb(120,116,110))",
		dark: "radial-gradient(ellipse 90% 80% at 50% 40%, rgb(70,72,76), rgb(34,36,40) 70%, rgb(18,19,22))",
	};
	const fs = corner ? 13 : Math.max(11, Math.min(22, width * 0.018));
	return (
		<div
			style={{
				position: "relative",
				width,
				height,
				borderRadius: radius,
				overflow: "hidden",
				background: faces[tone] ?? faces.warm,
				flex: "0 0 auto",
				...(style ?? {}),
			}}
		>
			{src ? (
				<img
					src={src}
					alt=""
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						objectFit: "cover",
						filter: desaturate ? `grayscale(${desaturate})` : undefined,
					}}
				/>
			) : (
				<div
					style={
						corner
							? {
									position: "absolute",
									left: 18,
									bottom: 18,
									display: "flex",
									alignItems: "center",
									gap: 7,
									font: `500 ${fs}px ${FONT}`,
									color: tone === "dark" ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.5)",
									whiteSpace: "nowrap",
								}
							: {
									position: "absolute",
									inset: 0,
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									gap: fs * 0.6,
									font: `500 ${fs}px ${FONT}`,
									color: tone === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)",
									textAlign: "center",
									padding: 16,
								}
					}
				>
					<svg
						width={corner ? 16 : fs * 2}
						height={corner ? 16 : fs * 2}
						viewBox="0 0 24 24"
						fill="none"
						opacity={corner ? 1 : 0.7}
					>
						<rect
							x="3"
							y="4"
							width="18"
							height="16"
							rx="2.5"
							stroke="currentColor"
							strokeWidth="1.6"
						/>
						<circle cx="9" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.6" />
						<path
							d="M4 18l5.5-5 4 3.5 3-2.5 3.5 3"
							stroke="currentColor"
							strokeWidth="1.6"
							strokeLinejoin="round"
						/>
					</svg>
					<span>{text}</span>
				</div>
			)}
			{children ? <div style={{ position: "absolute", inset: 0 }}>{children}</div> : null}
		</div>
	);
}
