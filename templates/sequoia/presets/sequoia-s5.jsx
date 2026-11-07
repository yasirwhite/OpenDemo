/**
 * sequoia-s5.jsx — section 5 presets (42.400–53.133s of the Aside launch film).
 *
 * All measurements: full-decode frames resampled to a 30fps clock at the
 * 1280x720 stage (sections/s5/notes.md has the per-frame traces). The section
 * is four mechanisms:
 *
 *   sequoia-spawn-tree    42.40–48.30  ONE world plane under a measured camera:
 *                         the timeline line + blue dot run into a drawn pill
 *                         ("Spawning subagents in parallel", L->R soft reveal +
 *                         travelling shimmer), the outline draws out of the
 *                         dot's fork, a connector leaves the pill's right
 *                         notch, the dot drops down a trunk with a blue comet
 *                         trail, branches + subagent rows pop off the trunk,
 *                         the camera pushes in, rows erase down to one agent
 *                         icon + service glyph, the pair converges, pops 2.3x
 *                         and fades.
 *   sequoia-agent-log     47.55–51.50  a task log on a thin left rule:
 *                         "Inspecting..." shimmer, streamed paragraph (words
 *                         arrive light blue -> blue -> ink), icon rows sliding
 *                         up, streamed result line, measured scroll.
 *   sequoia-chat-reply    51.50–53.13  user bubble rising in on the cut +
 *                         streamed reply, slow 1.5%/s push.
 *   sequoia-disc-grow     52.73–53.13  graphite disc growing out of a point
 *                         (x1.6/frame) while its centre drifts to frame centre.
 *
 * Every render is a pure function of t.
 */
import React from "react";
import { clamp01, easeByName, lerp, mixRgb } from "../../../src/lib/textcards/src/easing.js";
import { BrandGlyph, FONT, Icon, kf, live, localMs, Q, rgbs } from "./sequoia-shared.jsx";

// ── helpers ───────────────────────────────────────────────────────────────

/**
 * tab(rows, ms) — monotone cubic (Fritsch–Carlson) interpolation through a
 * dense MEASURED table [[at, v1, v2, ...], ...]. Used for every traced motion
 * (camera, dot, draw fronts) so measured per-frame samples replay as one
 * C1-smooth curve with no overshoot between samples. Clamps at both ends.
 */
function tab(rows, ms) {
	if (!rows || !rows.length) return [];
	const n = rows.length;
	if (ms <= rows[0][0]) return rows[0].slice(1);
	if (ms >= rows[n - 1][0]) return rows[n - 1].slice(1);
	let i = 0;
	while (i < n - 2 && ms >= rows[i + 1][0]) i++;
	const a = rows[i];
	const b = rows[i + 1];
	const h = b[0] - a[0];
	const u = (ms - a[0]) / h;
	const out = [];
	for (let c = 1; c < a.length; c++) {
		const slope = (j) => (rows[j + 1][c] - rows[j][c]) / (rows[j + 1][0] - rows[j][0]);
		const d = slope(i);
		const tan = (j) => {
			if (j <= 0) return slope(0);
			if (j >= n - 1) return slope(n - 2);
			const s0 = slope(j - 1);
			const s1 = slope(j);
			if (s0 * s1 <= 0) return 0;
			return (2 * s0 * s1) / (s0 + s1);
		};
		const m0 = d === 0 ? 0 : tan(i);
		const m1 = d === 0 ? 0 : tan(i + 1);
		const u2 = u * u;
		const u3 = u2 * u;
		out.push(
			(2 * u3 - 3 * u2 + 1) * a[c] +
				(u3 - 2 * u2 + u) * h * m0 +
				(-2 * u3 + 3 * u2) * b[c] +
				(u3 - u2) * h * m1,
		);
	}
	return out;
}
const tab1 = (rows, ms, dflt = 0) => (rows?.length ? tab(rows, ms)[0] : dflt);

/** 0..1 between two ms marks, with a named ease. */
const ramp = (ms, a, b, ease = "linear", pow) =>
	easeByName(ease, pow, (x) => x)(clamp01((ms - a) / Math.max(1e-6, b - a)));

let measureCtx = null;
/** Deterministic text width (canvas measureText) so layouts reflow with copy. */
function textW(text, size, weight = 500, spacing = 0) {
	if (typeof document === "undefined") return text.length * size * 0.52;
	if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
	measureCtx.font = `${weight} ${size}px ${FONT}`;
	return measureCtx.measureText(text).width + spacing * text.length;
}

/**
 * makePath(pts, r) — a polyline with filleted corners (each corner a cubic
 * matching a circular arc). r: one radius or one per interior corner.
 * Returns the SVG `d`, total length, and pointAt(s) along the curve.
 */
function makePath(pts, r) {
	const P = pts.map((p) => ({ x: p[0], y: p[1] }));
	const radii = Array.isArray(r) ? r : P.map(() => r ?? 0);
	const pieces = [];
	let cur = P[0];
	for (let i = 1; i < P.length; i++) {
		const p = P[i];
		if (i < P.length - 1) {
			const nx = P[i + 1];
			const ul = Math.hypot(p.x - cur.x, p.y - cur.y) || 1;
			const vl = Math.hypot(nx.x - p.x, nx.y - p.y) || 1;
			const u = { x: (p.x - cur.x) / ul, y: (p.y - cur.y) / ul };
			const v = { x: (nx.x - p.x) / vl, y: (nx.y - p.y) / vl };
			const theta = Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y)));
			const rr = radii[i - 1] ?? 0;
			const d = Math.min(rr * Math.tan(theta / 2), ul * 0.999, vl * 0.5);
			if (d > 0.01 && theta > 0.01) {
				const A = { x: p.x - u.x * d, y: p.y - u.y * d };
				const B = { x: p.x + v.x * d, y: p.y + v.y * d };
				const k = (4 / 3) * Math.tan(theta / 4) * (d / Math.tan(theta / 2));
				pieces.push({ type: "L", b: A });
				pieces.push({
					type: "C",
					a: A,
					c1: { x: A.x + u.x * k, y: A.y + u.y * k },
					c2: { x: B.x - v.x * k, y: B.y - v.y * k },
					b: B,
				});
				cur = B;
				continue;
			}
		}
		pieces.push({ type: "L", b: p });
		cur = p;
	}
	const samp = [{ x: P[0].x, y: P[0].y, s: 0 }];
	let d = `M${P[0].x.toFixed(2)} ${P[0].y.toFixed(2)}`;
	let s = 0;
	const push = (q) => {
		const l = samp[samp.length - 1];
		s += Math.hypot(q.x - l.x, q.y - l.y);
		samp.push({ x: q.x, y: q.y, s });
	};
	for (const pc of pieces) {
		if (pc.type === "L") {
			d += ` L${pc.b.x.toFixed(2)} ${pc.b.y.toFixed(2)}`;
			push(pc.b);
		} else {
			d += ` C${pc.c1.x.toFixed(2)} ${pc.c1.y.toFixed(2)} ${pc.c2.x.toFixed(2)} ${pc.c2.y.toFixed(2)} ${pc.b.x.toFixed(2)} ${pc.b.y.toFixed(2)}`;
			for (let k = 1; k <= 16; k++) {
				const tt = k / 16;
				const mt = 1 - tt;
				push({
					x:
						mt * mt * mt * pc.a.x +
						3 * mt * mt * tt * pc.c1.x +
						3 * mt * tt * tt * pc.c2.x +
						tt * tt * tt * pc.b.x,
					y:
						mt * mt * mt * pc.a.y +
						3 * mt * mt * tt * pc.c1.y +
						3 * mt * tt * tt * pc.c2.y +
						tt * tt * tt * pc.b.y,
				});
			}
		}
	}
	const len = s;
	const pointAt = (q) => {
		const qq = Math.max(0, Math.min(len, q));
		let lo = 0;
		let hi = samp.length - 1;
		while (hi - lo > 1) {
			const mid = (lo + hi) >> 1;
			if (samp[mid].s <= qq) lo = mid;
			else hi = mid;
		}
		const a = samp[lo];
		const b = samp[hi];
		const f = b.s > a.s ? (qq - a.s) / (b.s - a.s) : 0;
		return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) };
	};
	return { d, len, pointAt };
}

/**
 * A trunk branch: leaves the trunk at (x, y - h) on a long cubic (not a circular
 * fillet — measured 45.8s: 4px out after 10px down, 22px out after 34px, level
 * at 48px down / 55px out) and runs on horizontally to x + len.
 */
function branchPath(x, y, h, w, len) {
	const p0 = { x, y: y - h };
	const c1 = { x: x + w * 0.04, y: y - h * 0.4 };
	const c2 = { x: x + w * 0.62, y };
	const p1 = { x: x + w, y };
	let s = 0;
	let last = p0;
	for (let k = 1; k <= 24; k++) {
		const t = k / 24;
		const mt = 1 - t;
		const q = {
			x: mt * mt * mt * p0.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p1.x,
			y: mt * mt * mt * p0.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p1.y,
		};
		s += Math.hypot(q.x - last.x, q.y - last.y);
		last = q;
	}
	return {
		d: `M${p0.x} ${p0.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p1.x} ${p1.y} L${x + len} ${y}`,
		len: s + (len - w),
	};
}

/** A stroked path drawn from s0 to s1 (world units). */
function Stroke({ path, s0 = 0, s1, colour, width = 1.5, opacity = 1, gradId = null }) {
	const a = Math.max(0, s0);
	const b = Math.min(path.len, s1 ?? path.len);
	if (b - a <= 0.05 || opacity <= 0.002) return null;
	return (
		<path
			d={path.d}
			fill="none"
			stroke={gradId ? `url(#${gradId})` : rgbs(colour)}
			strokeWidth={width}
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeDasharray={`0 ${a.toFixed(2)} ${(b - a).toFixed(2)} ${(path.len + 1000).toFixed(0)}`}
			opacity={opacity}
		/>
	);
}

/**
 * The reference's subagent icon: a rounded dome (flat foot, rounded lower
 * corners) with two short vertical eyes — drawn, not Lucide's wavy ghost.
 */
function AgentIcon({ size = 36, colour = [160, 162, 159], stroke = 2.2 }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			style={{ display: "block", overflow: "visible" }}
		>
			<path
				d="M2.5 19.3 V13.5 A9.5 9.5 0 0 1 21.5 13.5 V19.3 A2.2 2.2 0 0 1 19.3 21.5 H4.7 A2.2 2.2 0 0 1 2.5 19.3 Z"
				fill="none"
				stroke={rgbs(colour)}
				strokeWidth={stroke}
				strokeLinejoin="round"
			/>
			<path
				d="M9.9 12.4 V15.2 M14.1 12.4 V15.2"
				stroke={rgbs(colour)}
				strokeWidth={stroke * 1.05}
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Row/service glyph: neutral letter tile (or a bare letter when bg is null). */
function ServiceGlyph({ g, size }) {
	if (!g) return null;
	if (g.bg)
		return (
			<BrandGlyph
				letter={g.letter ?? "A"}
				bg={g.bg}
				fg={g.fg ?? Q.white}
				size={size}
				radius={g.radius ?? 0.1}
			/>
		);
	return (
		<span
			style={{
				display: "inline-flex",
				width: size,
				height: size,
				alignItems: "center",
				justifyContent: "center",
				font: `700 ${(size * 0.95).toFixed(1)}px ${FONT}`,
				color: rgbs(g.fg ?? Q.ink),
				lineHeight: 1,
			}}
		>
			{g.letter}
		</span>
	);
}

/**
 * Text coloured by a horizontal gradient (base colour + one soft band at
 * band.x ± band.w, px along the text) and optionally masked (CSS mask).
 */
function GradText({
	text,
	size,
	weight = 500,
	colour,
	band = null,
	mask = null,
	spacing = 0,
	style = null,
}) {
	const base = rgbs(colour);
	const st = {
		display: "inline-block",
		whiteSpace: "pre",
		font: `${weight} ${size}px ${FONT}`,
		letterSpacing: spacing ? `${spacing}px` : undefined,
		lineHeight: 1,
		// vertical padding so background-clip:text also paints descenders
		padding: "0.3em 0",
		margin: "-0.3em 0",
		color: band ? "transparent" : base,
		...(style ?? {}),
	};
	if (band) {
		const c = rgbs(band.colour);
		st.backgroundImage = `linear-gradient(90deg, ${base} 0px, ${base} ${(band.x - band.w).toFixed(1)}px, ${c} ${band.x.toFixed(1)}px, ${base} ${(band.x + band.w).toFixed(1)}px, ${base} 100%)`;
		st.WebkitBackgroundClip = "text";
		st.backgroundClip = "text";
	}
	if (mask) {
		st.WebkitMaskImage = mask;
		st.maskImage = mask;
	}
	return <span style={st}>{text}</span>;
}

/** CSS mask: opaque on [a, b] with soft feathers fa / fb (px). */
function spanMask(a, b, fa = 0, fb = 0) {
	const p = (v) => `${v.toFixed(1)}px`;
	return `linear-gradient(90deg, transparent ${p(a - fa)}, #000 ${p(a)}, #000 ${p(b)}, transparent ${p(b + fb)})`;
}

// ── 1. spawn tree ─────────────────────────────────────────────────────────

/**
 * sequoia-spawn-tree — see file header. World coordinates = stage px of the
 * reference frame at 43.000s (1290) at scale 1; `camera` rows are
 * [ms, worldX at frame centre, worldY at frame centre, scale].
 */
function SpawnTree(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const C = { line: [228, 230, 227], dot: [12, 140, 192], ...(cfg.colours ?? {}) };
	const lw = cfg.lineWidth ?? 1.5;

	// pill layout (auto width from copy)
	const pl = cfg.pill;
	const tw = textW(pl.text, pl.size, pl.weight ?? 500, pl.spacing ?? 0);
	const pRight = pl.x + pl.padL + tw + pl.padR;
	const dxCopy = pRight - (pl.refRight ?? pRight); // re-anchors everything right of the pill
	const notch = pl.notchR ?? 20;
	const top = pl.y - pl.h / 2;
	const bot = pl.y + pl.h / 2;
	const trunkX = pRight + (cfg.trunkDx ?? 126);

	// camera (measured table) + copy-length compensation
	const camAt = (m) => {
		const [x, y, s] = tab(cfg.camera, m);
		return [x + dxCopy * ramp(m, cfg.copyShift?.[0] ?? 900, cfg.copyShift?.[1] ?? 1500), y, s];
	};
	const [cx, cy, sc] = camAt(ms);

	// paths
	const main = makePath(cfg.main.pts, cfg.main.r);
	const half = (yEdge) =>
		makePath(
			[
				[pl.x - notch, pl.y],
				[pl.x, pl.y],
				[pl.x, yEdge],
				[pRight, yEdge],
				[pRight, pl.y],
				[pRight + notch, pl.y],
			],
			[notch, pl.r, pl.r, notch],
		);
	const halfTop = half(top);
	const halfBot = half(bot);
	const conn = makePath(
		[
			[pRight + notch, pl.y],
			[trunkX, pl.y],
			[trunkX, pl.y + (cfg.trunkLen ?? 2600)],
		],
		cfg.connR ?? 25,
	);

	// dots / draw fronts
	const mainS = tab1(cfg.mainDot.s, ms);
	const cd = cfg.connDot;
	const cdStart = cd.s[0][0];
	const connDotS = tab1(cd.s, ms);
	const connDraw = Math.max(tab1(cfg.connDraw, ms, 0), ms >= cdStart ? connDotS : 0);
	const pillP = tab1(pl.draw, ms, 0);
	const wireFade = 1 - ramp(ms, cfg.wireFade?.[0] ?? 1e9, cfg.wireFade?.[1] ?? 1e9);

	const svg = [];
	svg.push(
		<Stroke key="main" path={main} s1={mainS} colour={C.line} width={lw} opacity={wireFade} />,
	);
	if (pillP > 0) {
		svg.push(
			<Stroke
				key="ht"
				path={halfTop}
				s1={halfTop.len * pillP}
				colour={C.line}
				width={lw}
				opacity={wireFade}
			/>,
		);
		svg.push(
			<Stroke
				key="hb"
				path={halfBot}
				s1={halfBot.len * pillP}
				colour={C.line}
				width={lw}
				opacity={wireFade}
			/>,
		);
	}
	if (connDraw > 0)
		svg.push(
			<Stroke key="conn" path={conn} s1={connDraw} colour={C.line} width={lw} opacity={wireFade} />,
		);

	// comet trail behind the trunk dot (line grey -> blue), strength from speed
	const tr = cd.trail;
	if (tr && ms >= cdStart) {
		const v = tab1(cd.s, ms + 16.7) - tab1(cd.s, ms - 16.7); // world px per 30fps frame
		const k = clamp01((v - (tr.vMin ?? 12)) / ((tr.vFull ?? 35) - (tr.vMin ?? 12))) * wireFade;
		if (k > 0.01) {
			const head = conn.pointAt(connDotS);
			const tail = conn.pointAt(connDotS - tr.len);
			svg.push(
				<linearGradient
					key="tg"
					id="s5-trail"
					gradientUnits="userSpaceOnUse"
					x1={tail.x}
					y1={tail.y}
					x2={head.x}
					y2={head.y + 0.01}
				>
					<stop offset="0" stopColor={rgbs(tr.colour)} stopOpacity="0" />
					<stop offset="0.5" stopColor={rgbs(tr.colour)} stopOpacity={(0.8 * k).toFixed(3)} />
					<stop offset="0.85" stopColor={rgbs(tr.colour)} stopOpacity={k.toFixed(3)} />
					<stop offset="1" stopColor={rgbs(tr.colour)} stopOpacity={(0.7 * k).toFixed(3)} />
				</linearGradient>,
			);
			svg.push(
				<Stroke
					key="trail"
					path={conn}
					s0={connDotS - tr.len}
					s1={connDotS}
					width={tr.width ?? 2}
					gradId="s5-trail"
				/>,
			);
		}
	}

	// branches
	const rows = cfg.rows ?? [];
	const R = cfg.row;
	rows.forEach((row, i) => {
		const ry = R.y0 + i * R.dy;
		const bp = branchPath(trunkX, ry + R.branchDy, R.branchH, R.branchW, R.branchLen);
		const bd = ramp(ms, row.at - R.branchLead, row.at - R.branchLead + R.branchMs, "out");
		if (bd > 0) {
			// measured 45.8s: ink [229] at the trunk, [240-244] where it turns, [245] -> 0 along the tail
			const gid = `s5-br${i}`;
			svg.push(
				<linearGradient
					key={`bg${i}`}
					id={gid}
					gradientUnits="userSpaceOnUse"
					x1={trunkX}
					y1="0"
					x2={trunkX + R.branchLen}
					y2="0"
				>
					<stop offset="0" stopColor={rgbs(C.line)} stopOpacity="1" />
					<stop offset="0.45" stopColor={rgbs(C.line)} stopOpacity="0.45" />
					<stop offset="0.75" stopColor={rgbs(C.line)} stopOpacity="0.35" />
					<stop offset="1" stopColor={rgbs(C.line)} stopOpacity="0" />
				</linearGradient>,
			);
			svg.push(
				<Stroke
					key={`br${i}`}
					path={bp}
					s1={bp.len * bd}
					width={lw}
					gradId={gid}
					opacity={wireFade}
				/>,
			);
		}
	});

	// line-work parallax during the push-in: measured 45.8–47.0s the trunk and
	// branches lag the rows by +51px x (s-1) on screen (rows zoom about x=362,
	// the line layer about x=311).
	const par =
		(cfg.lineParallax
			? (cfg.lineParallax * Math.max(0, Math.min(sc, cfg.lineParallaxMaxS ?? 1.59) - 1)) / sc
			: 0) + (cfg.lineDrift ? (kf(cfg.lineDrift, ms).dx ?? 0) : 0);
	const els = [
		<svg
			key="wire"
			width="1"
			height="1"
			style={{ position: "absolute", left: par, top: 0, overflow: "visible" }}
		>
			{svg}
		</svg>,
	];

	// pill copy: soft L->R reveal + travelling shimmer band
	const textX = pl.x + pl.padL;
	const rv = pl.reveal;
	if (ms >= rv.at - 50) {
		const front = (ms - rv.at) * (rv.speed / 1000) + (rv.startDx ?? 0);
		const sh = pl.shimmer;
		// a faint cool tint rides the reveal front (measured 43.00s: half-revealed
		// glyphs read [206,212,212], bluer than the settled grey)
		let band = rv.tint
			? { x: front - rv.feather * 0.5, w: rv.feather * 0.7, colour: rv.tint }
			: { x: -9999, w: 1, colour: pl.colour };
		if (sh && ms >= sh.at) {
			const p = clamp01(((ms - sh.at) % sh.period) / sh.sweep);
			if (p < 1)
				band = {
					x: lerp(-sh.w, tw + sh.w, easeByName("inout", 2.2)(p)),
					w: sh.w,
					colour: sh.colour,
				};
		}
		els.push(
			<div
				key="ptext"
				style={{
					position: "absolute",
					left: textX,
					top: pl.y - pl.size / 2 + (pl.textDy ?? 0),
					opacity: wireFade,
				}}
			>
				<GradText
					text={pl.text}
					size={pl.size}
					weight={pl.weight ?? 500}
					spacing={pl.spacing ?? 0}
					colour={pl.colour}
					band={band}
					mask={spanMask(-200, front - rv.feather, 0, rv.feather)}
				/>
			</div>,
		);
	}

	// subagent rows
	const col = cfg.collapse;
	const focus = col?.focus ?? 0;
	rows.forEach((row, i) => {
		if (ms < row.at) return;
		const ry = R.y0 + i * R.dy;
		const f = (ms - row.at) / 33.333;
		const gx0 = trunkX + R.dx + R.slideDx * R.slideDecay ** f;
		const labelW = textW(row.label, R.size, R.labelWeight, R.spacing ?? 0);
		const taskW = textW(row.task, R.size, R.taskWeight, R.spacing ?? 0);
		const lx = gx0 + R.icon + R.gap1;
		const glx = lx + labelW + R.gap2;
		const tx = glx + R.glyph + R.gap3;
		let opacity = 1;
		let gxx = gx0;
		let glxx = glx;
		let labelMask = null;
		let taskMask = null;
		let showLabel = true;
		let showTask = true;
		let iconCol = R.iconColour;
		if (col && i !== focus) opacity = 1 - ramp(ms, col.othersOut[0], col.othersOut[1], "inout");
		else if (col) {
			// label erases L->R, task erases R->L, then icon + glyph meet at frame centre
			const le = ramp(ms, col.labelErase[0], col.labelErase[1]);
			labelMask = spanMask(le * (labelW + 60) - 30, labelW + 400, 30, 0);
			showLabel = le < 1;
			const te = ramp(ms, col.taskErase[0], col.taskErase[1]);
			taskMask = spanMask(-400, taskW - te * (taskW + 60) + 30, 0, 30);
			showTask = te < 1;
			const centre = camAt(col.meetAt)[0];
			const gap = col.gap ?? 21.4;
			gxx = lerp(gx0, centre - gap / 2 - R.icon, tab1(col.iconMove, ms, 0));
			glxx = lerp(glx, centre + gap / 2, tab1(col.glyphMove, ms, 0));
			if (col.iconTint) iconCol = kf(col.iconTint, ms).c ?? iconCol;
			opacity = 1 - ramp(ms, col.pairOut[0], col.pairOut[1]);
		}
		if (opacity <= 0.002) return;
		const band = R.labelBand
			? { x: R.labelBand.at * labelW, w: R.labelBand.w * labelW, colour: R.labelBand.colour }
			: null;
		els.push(
			<div key={`row${i}`} style={{ position: "absolute", left: 0, top: 0, opacity }}>
				<div style={{ position: "absolute", left: gxx, top: ry - R.icon / 2 + (R.iconDy ?? 0) }}>
					<AgentIcon size={R.icon} colour={iconCol} stroke={R.iconStroke ?? 2.2} />
				</div>
				{showLabel ? (
					<div style={{ position: "absolute", left: lx, top: ry - R.size / 2 + (R.textDy ?? 0) }}>
						<GradText
							text={row.label}
							size={R.size}
							weight={R.labelWeight}
							spacing={R.spacing ?? 0}
							colour={R.labelColour}
							band={band}
							mask={labelMask}
						/>
					</div>
				) : null}
				<div style={{ position: "absolute", left: glxx, top: ry - R.glyph / 2 + (R.glyphDy ?? 0) }}>
					<ServiceGlyph g={row.glyph} size={R.glyph} />
				</div>
				{showTask ? (
					<div style={{ position: "absolute", left: tx, top: ry - R.size / 2 + (R.textDy ?? 0) }}>
						<GradText
							text={row.task}
							size={R.size}
							weight={R.taskWeight}
							spacing={R.spacing ?? 0}
							colour={R.taskColour}
							mask={taskMask}
						/>
					</div>
				) : null}
			</div>,
		);
	});

	// dots (above text)
	const dotEl = (key, p, scale, opacity) => {
		if (scale <= 0.01 || opacity <= 0.01) return null;
		const d = (cfg.dotSize ?? 10) * scale;
		return (
			<div
				key={key}
				style={{
					position: "absolute",
					left: p.x - d / 2,
					top: p.y - d / 2,
					width: d,
					height: d,
					borderRadius: "50%",
					background: rgbs(C.dot),
					opacity,
					boxShadow: `0 0 0 ${(2 * scale).toFixed(2)}px rgba(255,255,255,0.95), 0 ${(11 * scale).toFixed(1)}px ${(9 * scale).toFixed(1)}px ${scale.toFixed(1)}px rgba(40,112,146,0.30)`,
				}}
			/>
		);
	};
	els.push(
		dotEl(
			"mdot",
			main.pointAt(mainS),
			kf(cfg.mainDot.keys ?? [{ at: 0, sc: 1 }], ms).sc ?? 1,
			wireFade,
		),
	);
	if (ms >= cdStart - 40)
		els.push(
			dotEl(
				"cdot",
				conn.pointAt(connDotS),
				kf(cd.keys ?? [{ at: 0, sc: 1 }], ms).sc ?? 1,
				wireFade,
			),
		);

	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 0,
					height: 0,
					transformOrigin: "0 0",
					transform: `translate(640px, 360px) scale(${sc.toFixed(5)}) translate(${(-cx).toFixed(2)}px, ${(-cy).toFixed(2)}px)`,
				}}
			>
				{els}
			</div>
		</div>
	);
}

// ── 2. agent log ──────────────────────────────────────────────────────────

/** Lay words out with greedy wrapping; ci = character index of each word. */
function streamWords(text, size, weight, wrap, spacing = 0) {
	const space = textW(" ", size, weight, spacing);
	const out = [];
	let x = 0;
	let line = 0;
	let ci = 0;
	for (const w of text.split(" ")) {
		const ww = textW(w, size, weight, spacing);
		if (x > 0 && x + ww > wrap) {
			x = 0;
			line++;
		}
		out.push({ w, x, line, ci });
		x += ww + space;
		ci += w.length + 1;
	}
	return out;
}

/**
 * Streamed text on a character clock (`cps`): each word arrives light blue
 * (fading up over lag[0] ms), holds blue until lag[1], then turns ink by
 * lag[2] — measured 48.70–48.97s: ink trails the head by ~2 frames.
 */
function StreamText({
	text,
	size,
	weight,
	spacing = 0,
	wrap,
	lineH,
	at,
	cps,
	chars,
	ms,
	colours,
	lag,
}) {
	// arrival of character index ci: inverse of the measured [[ms, nChars]] table
	// (piecewise linear), or a constant `cps` clock from `at`.
	const arrive = (ci) => {
		if (!chars) return at + (ci / cps) * 1000;
		for (let i = 1; i < chars.length; i++) {
			const [m0, n0] = chars[i - 1];
			const [m1, n1] = chars[i];
			if (ci <= n1) return n1 > n0 ? lerp(m0, m1, clamp01((ci - n0) / (n1 - n0))) : m0;
		}
		return 1e9;
	};
	return (
		<>
			{streamWords(text, size, weight, wrap, spacing).map((wd) => {
				const age = ms - arrive(wd.ci + 1);
				if (age < 0) return null;
				let c = colours.blue;
				let o = 1;
				if (age < lag[0]) {
					c = colours.fresh;
					o = 0.55 + 0.45 * clamp01(age / lag[0]);
				} else if (age >= lag[1])
					c = mixRgb(colours.blue, colours.ink, clamp01((age - lag[1]) / (lag[2] - lag[1])));
				return (
					<span
						key={wd.ci}
						style={{
							position: "absolute",
							left: wd.x,
							top: wd.line * lineH,
							font: `${weight} ${size}px ${FONT}`,
							letterSpacing: spacing ? `${spacing}px` : undefined,
							lineHeight: 1,
							whiteSpace: "pre",
							color: rgbs(c),
							opacity: o,
						}}
					>
						{wd.w}
					</span>
				);
			})}
		</>
	);
}

/**
 * sequoia-agent-log — the task log after the subagent dive. A column at
 * x = cfg.x; `scroll` is [[ms, paragraph top y]] (measured). Items: rule
 * (drawn top->down), status ("Inspecting..."), paragraph (streamed), rows
 * (icon + text, slide up), result (streamed). Item y's are relative to the
 * paragraph top.
 */
function AgentLog(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const P = tab1(cfg.scroll, ms);
	const x = cfg.x;
	const ruleX = cfg.ruleX ?? x - 0.5;
	const lc = cfg.lineColour ?? [229, 231, 228];
	const T = cfg.type;
	const els = [];

	const ru = cfg.rule;
	const rp = tab1(ru.draw, ms, 0);
	if (rp > 0) {
		const y0 = P + ru.top;
		const h = Math.max(0, (ru.bottom - ru.top) * rp);
		els.push(
			<div
				key="rule"
				style={{
					position: "absolute",
					left: ruleX - 0.75,
					top: y0,
					width: 1.5,
					height: h,
					background: `linear-gradient(180deg, ${rgbs(lc, 0)} 0px, ${rgbs(lc)} ${ru.fadeTop ?? 10}px, ${rgbs(lc)} 100%)`,
				}}
			/>,
		);
	}

	const st = cfg.status;
	if (st && ms >= st.in[0] && ms < st.out[1]) {
		const w = textW(st.text, T.size, T.weight, T.spacing ?? 0);
		const rin = ramp(ms, st.in[0], st.in[1]);
		const rout = ramp(ms, st.out[0], st.out[1]);
		const band =
			ms >= st.shimmer[0] && ms <= st.shimmer[1]
				? {
						x: lerp(-st.bandW, w + st.bandW, ramp(ms, st.shimmer[0], st.shimmer[1])),
						w: st.bandW,
						colour: st.shimmerColour,
					}
				: { x: -9999, w: 1, colour: st.colour };
		els.push(
			<div key="status" style={{ position: "absolute", left: x, top: P + (st.dy ?? 0) }}>
				<GradText
					text={st.text}
					size={T.size}
					weight={T.weight}
					spacing={T.spacing ?? 0}
					colour={st.colour}
					band={band}
					mask={spanMask(rout * (w + 80) - 40, rin * (w + 80) - 40, 40, 40)}
				/>
			</div>,
		);
	}

	const colours = cfg.stream;
	const lag = cfg.streamLag ?? [34, 67, 120];
	const pa = cfg.paragraph;
	if (ms >= pa.at)
		els.push(
			<div key="para" style={{ position: "absolute", left: x, top: P }}>
				<StreamText
					text={pa.text}
					size={T.size}
					weight={T.weight}
					spacing={T.spacing ?? 0}
					wrap={cfg.wrap}
					lineH={T.lineH}
					at={pa.at}
					cps={pa.cps}
					chars={pa.chars}
					ms={ms}
					colours={colours}
					lag={lag}
				/>
			</div>,
		);

	const seg = cfg.segment;
	(cfg.rows ?? []).forEach((row, i) => {
		if (ms < row.at) return;
		const dy = cfg.rowRise * cfg.rowDecay ** ((ms - row.at) / 33.333);
		els.push(
			<div
				key={`seg${i}`}
				style={{
					position: "absolute",
					left: ruleX - 0.75,
					top: P + row.segY + dy,
					width: 1.5,
					height: seg,
					background: rgbs(lc),
				}}
			/>,
		);
		els.push(
			<div
				key={`row${i}`}
				style={{
					position: "absolute",
					left: x + cfg.iconDx,
					top: P + row.y + dy,
					display: "flex",
					alignItems: "center",
					height: T.size,
				}}
			>
				<span
					style={{
						display: "inline-flex",
						width: cfg.iconBox,
						justifyContent: "center",
						transform: `translateY(${cfg.iconDy ?? 0}px)`,
					}}
				>
					{row.icon === "agent" ? (
						<AgentIcon size={cfg.iconSize} colour={cfg.iconColour} stroke={2.0} />
					) : (
						<Icon name={row.icon} size={cfg.iconSize} colour={cfg.iconColour} stroke={2.0} />
					)}
				</span>
				<span
					style={{
						marginLeft: cfg.iconGap,
						font: `${T.weight} ${T.size}px ${FONT}`,
						letterSpacing: `${T.spacing ?? 0}px`,
						whiteSpace: "pre",
						color: rgbs(cfg.ink),
						lineHeight: 1,
					}}
				>
					{row.text}
				</span>
			</div>,
		);
	});

	const re = cfg.result;
	// the result's lead-in segment appears with the row above it (measured 49.8s)
	if (re && ms >= (re.segAt ?? re.at)) {
		const sdy = re.segAt != null ? cfg.rowRise * cfg.rowDecay ** ((ms - re.segAt) / 33.333) : 0;
		els.push(
			<div
				key="segR"
				style={{
					position: "absolute",
					left: ruleX - 0.75,
					top: P + re.segY + sdy,
					width: 1.5,
					height: seg,
					background: rgbs(lc),
				}}
			/>,
		);
	}
	if (re && ms >= re.at) {
		els.push(
			<div key="res" style={{ position: "absolute", left: x, top: P + re.y }}>
				<StreamText
					text={re.text}
					size={T.size}
					weight={T.weight}
					spacing={T.spacing ?? 0}
					wrap={4000}
					lineH={T.lineH}
					at={re.at}
					cps={re.cps}
					chars={re.chars}
					ms={ms}
					colours={colours}
					lag={lag}
				/>
			</div>,
		);
	}
	// T.stroke: a hairline text stroke (inherited) that brings Segoe 400 up to the
	// reference's ~500 ink weight (measured 12% less ink without it at 50.9s)
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				overflow: "hidden",
				WebkitTextStroke: `${T.stroke ?? 0}px`,
			}}
		>
			{els}
		</div>
	);
}

// ── 3. chat reply ─────────────────────────────────────────────────────────

/**
 * sequoia-chat-reply — user bubble right-aligned at bubble.right, rising in
 * on the measured settle table (bubble.rise [[ms, dy]]), streamed reply
 * below, the frame on a slow push (push.keys [{at, s}] about push.origin).
 */
function ChatReply(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const T = cfg.type;
	const b = cfg.bubble;
	const bw = textW(b.text, T.size, T.weight, T.spacing ?? 0) + b.padX * 2;
	const by = b.y + tab1(b.rise, ms, 0);
	const s = kf(cfg.push?.keys ?? [{ at: 0, s: 1 }], ms).s ?? 1;
	const o = cfg.push?.origin ?? [640, 360];
	const rp = cfg.reply;
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				overflow: "hidden",
				WebkitTextStroke: `${T.stroke ?? 0}px`,
			}}
		>
			<div
				style={{
					position: "absolute",
					inset: 0,
					transformOrigin: `${o[0]}px ${o[1]}px`,
					transform: `scale(${s.toFixed(5)})`,
				}}
			>
				<div
					style={{
						position: "absolute",
						left: b.right - bw,
						top: by,
						width: bw,
						height: b.h,
						borderRadius: b.radius,
						background: rgbs(b.fill),
						display: "flex",
						alignItems: "center",
						paddingLeft: b.padX,
						boxSizing: "border-box",
					}}
				>
					<span
						style={{
							font: `${T.weight} ${T.size}px ${FONT}`,
							letterSpacing: `${T.spacing ?? 0}px`,
							color: rgbs(cfg.ink),
							whiteSpace: "pre",
							lineHeight: 1,
							marginTop: b.textDy ?? 0,
						}}
					>
						{b.text}
					</span>
				</div>
				{ms >= rp.at ? (
					<div style={{ position: "absolute", left: rp.x, top: rp.y }}>
						<StreamText
							text={rp.text}
							size={T.size}
							weight={T.weight}
							spacing={T.spacing ?? 0}
							wrap={rp.wrap}
							lineH={T.lineH}
							at={rp.at}
							cps={rp.cps}
							chars={rp.chars}
							ms={ms}
							colours={cfg.stream}
							lag={cfg.streamLag ?? [34, 67, 120]}
						/>
					</div>
				) : null}
			</div>
		</div>
	);
}

// ── 4. circle wipe ────────────────────────────────────────────────────────

/**
 * sequoia-disc-grow — a flat disc grows out of a point. `radius` rows
 * [[ms, r]] interpolate in LOG space (measured growth x1.55–1.9 per frame);
 * the centre drifts from `origin` to `endCentre` as r / driftR.
 */
function CircleWipe(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	if (ms < cfg.radius[0][0]) return null;
	const r = Math.exp(
		tab1(
			cfg.radius.map((q) => [q[0], Math.log(Math.max(0.01, q[1]))]),
			ms,
		),
	);
	const k = clamp01(r / (cfg.driftR ?? 750));
	const x = lerp(cfg.origin[0], cfg.endCentre?.[0] ?? 640, k);
	const y = lerp(cfg.origin[1], cfg.endCentre?.[1] ?? 360, k);
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			<div
				style={{
					position: "absolute",
					left: x - r,
					top: y - r,
					width: 2 * r,
					height: 2 * r,
					borderRadius: "50%",
					background: rgbs(cfg.colour ?? Q.dark),
				}}
			/>
		</div>
	);
}

export const S5_PRESETS = {
	"sequoia-spawn-tree": {
		note: "s5 42.4–48.3: ONE world plane under a measured camera table — the timeline line + blue dot run into a drawn pill (copy revealed L->R through a soft mask, blue shimmer sweeping every 0.67s), the outline draws out of the dot's fork, a connector leaves the pill's right notch, the dot drops down a trunk with a comet trail, branches + subagent rows pop off it and slide in, the camera pushes 1.0->1.59, the rows erase to one agent icon + service glyph that converge and pop 2.32x, then fade. Pill width follows the copy; geometry right of the pill re-anchors to it.",
		nativeMs: 5900,
		params: {
			camera: [
				"array",
				"[[ms, cx, cy, s]]",
				"measured camera: world point at frame centre + scale (monotone cubic)",
			],
			main: ["object", "{pts, r}", "incoming timeline path (world)"],
			mainDot: [
				"object",
				"{s:[[ms, arc]], keys:[{at, sc}]}",
				"dot along `main` (arc length) + shrink keys",
			],
			pill: [
				"object",
				"{text, x, y, h, r, padL, padR, size, colour, draw:[[ms,p]], reveal, shimmer}",
				"the spawn pill",
			],
			connDraw: ["array", "[[ms, arc]]", "connector draw front before the dot appears"],
			connDot: ["object", "{s, keys, trail}", "dot on the connector/trunk"],
			rows: ["array", "[{at, label, task, glyph:{letter,bg,fg}}]", "subagent rows (pop times)"],
			row: ["object", "layout + branch geometry", "row metrics (world px)"],
			collapse: [
				"object",
				"{focus, othersOut, labelErase, taskErase, iconMove, glyphMove, iconTint, pairOut, meetAt}",
				"the erase-to-pair beat",
			],
			wireFade: ["array", "[ms0, ms1]", "line work + branches fade"],
		},
		render: SpawnTree,
	},
	"sequoia-agent-log": {
		note: "s5 47.55–51.5: an agent task log on a thin left rule — rule draws down, 'Inspecting...' reveals/shimmers/erases, the reply paragraph streams in (words light blue -> blue -> ink), icon rows slide up 40px on an expo settle, the result line streams; the column scrolls on a measured table.",
		nativeMs: 3950,
		params: {
			scroll: ["array", "[[ms, y]]", "paragraph top y over time (measured scroll)"],
			paragraph: ["object", "{text, at, cps}", "streamed product-voice paragraph"],
			rows: ["array", "[{at, icon, text, y, segY}]", "log rows (icon name or 'agent')"],
			result: ["object", "{text, at, cps, y, segY}", "streamed result line"],
		},
		render: AgentLog,
	},
	"sequoia-chat-reply": {
		note: "s5 51.5–53.13: user bubble (right-aligned, rises in on a measured settle) + streamed product reply below; slow 1.5%/s push.",
		nativeMs: 1633,
		params: {
			bubble: ["object", "{text, right, y, h, padX, radius, fill, rise:[[ms,dy]]}", "user bubble"],
			reply: ["object", "{text, x, y, wrap, at, cps}", "streamed reply"],
		},
		render: ChatReply,
	},
	"sequoia-disc-grow": {
		note: "s5 52.73–53.13: a graphite disc grows out of a point (log-space radius table, ~x1.6 per frame) while its centre drifts to frame centre; covers the frame by 53.133.",
		nativeMs: 400,
		params: {
			origin: ["array", "[527,441]", "start point (stage px)"],
			radius: ["array", "[[ms, r]]", "measured radius table"],
			colour: ["array", "[38,40,37]", "disc colour"],
		},
		render: CircleWipe,
	},
};
