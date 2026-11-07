/**
 * sequoia-s4.jsx — section 4 (31.733 – 42.400s): the agent's working trace.
 *
 * Measured off the Aside film (frames resampled to 30fps at 1280x720; every
 * number below is stage px / film frames, see sections/s4/notes.md):
 *
 *   31.733-33.100  "⟲ searching browsing history for" — the line is laid out
 *                  whole and centred (x 176..1097, centre 636) but its words
 *                  pop in one by one (frames 952/954/957/961/965); each word
 *                  arrives 25px right of its slot and settles (25,14,9,7,4..)
 *                  while its colour runs light-cyan -> teal -> black over 8
 *                  frames; the whole line slides from +222px to rest on an
 *                  exponential (x0.83/frame). The history glyph turns ~45deg
 *                  back to upright over the first ~20 frames. Exit 32.83-33.1:
 *                  the line pushes in 1.00 -> 1.12 (accelerating, about its
 *                  centre) while the outer items fade first and "browsing
 *                  history" ~2.5 frames later.
 *   33.167-42.400  one big canvas under a measured camera (sequoia-task-
 *                  timeline): "Credit card ⌄" pops at 0.76x and settles to
 *                  1.0 (x0.78/frame), a teal shimmer crosses it L->R
 *                  (~25px/frame), it darkens grey -> black while the dropdown
 *                  expands on an expo in-out (title -> x 123, chevron -> x
 *                  1157, the chevron turning 180deg CCW), then the canvas
 *                  lifts 221px (expo in-out, 34.47-34.93), three result rows
 *                  pop and settle, a blue dot draws the timeline down, the
 *                  steps pop in below it, a second dot draws the product
 *                  window's outline and a diagonal mask reveals its face, the
 *                  camera scrolls the trace (two eased scrolls + a 90px/s
 *                  drift), the summary streams in word by word, and a third
 *                  dot turns the timeline right while the camera pans after it
 *                  (peak 90px/frame) and climbs to the next section's line.
 *
 * Everything is a pure function of t. Paths with rounded corners are solved
 * analytically, so the dots and the lines they draw can never drift apart.
 */
import { AppWindow, MousePointer2 } from "lucide-react";
import React from "react";
import { clamp01, lerp, settleDecay } from "../../../src/lib/textcards/src/easing.js";
import { BrandGlyph, FONT, Icon, kf, live, localMs, Q, rgbs } from "./sequoia-shared.jsx";

// ── helpers ───────────────────────────────────────────────────────────────

let measureCtx = null;
/** Width of a run of text in px (canvas measureText; deterministic, no t). */
function textWidth(text, font) {
	if (!measureCtx && typeof document !== "undefined")
		measureCtx = document.createElement("canvas").getContext("2d");
	if (!measureCtx) return text.length * 20;
	measureCtx.font = font;
	return measureCtx.measureText(text).width;
}

const mix = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];

/** Piecewise-linear colour ramp: stops [[ms, [r,g,b]], ...]. */
function ramp(stops, ms) {
	if (ms <= stops[0][0]) return stops[0][1];
	for (let i = 0; i < stops.length - 1; i++) {
		const [a, ca] = stops[i];
		const [b, cb] = stops[i + 1];
		if (ms < b) return mix(ca, cb, (ms - a) / Math.max(1e-6, b - a));
	}
	return stops[stops.length - 1][1];
}

/** Scalar keyframe channel: kf keys -> one named value. */
function chan(keys, ms, name, fallback = 0) {
	if (!keys || !keys.length) return fallback;
	const k = kf(keys, ms);
	return k[name] ?? fallback;
}

/**
 * A polyline with rounded corners, solved analytically.
 * points [[x,y],...], radius r -> { d, len, at(s) -> [x,y] }.
 */
function roundedPath(points, r) {
	const pcs = [];
	let cur = points[0];
	for (let i = 1; i < points.length; i++) {
		const p = points[i];
		const prev = points[i - 1];
		const next = points[i + 1];
		const ux = p[0] - prev[0];
		const uy = p[1] - prev[1];
		const ul = Math.hypot(ux, uy) || 1;
		let end = p;
		let arc = null;
		if (next) {
			const vx = next[0] - p[0];
			const vy = next[1] - p[1];
			const vl = Math.hypot(vx, vy) || 1;
			const cos = (ux * vx + uy * vy) / (ul * vl);
			const th = Math.acos(Math.max(-1, Math.min(1, cos)));
			if (th > 1e-4) {
				const rr = Math.min(r, Math.min(ul, vl) / 2 / Math.tan(th / 2));
				const tl = rr * Math.tan(th / 2);
				const a = [p[0] - (ux / ul) * tl, p[1] - (uy / ul) * tl];
				const b = [p[0] + (vx / vl) * tl, p[1] + (vy / vl) * tl];
				const sgn = ux * vy - uy * vx > 0 ? 1 : -1;
				const c = [a[0] + (-uy / ul) * sgn * rr, a[1] + (ux / ul) * sgn * rr];
				const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
				arc = { type: "A", c, r: rr, a0, dir: sgn, th, len: rr * th, to: b };
				end = a;
			}
		}
		pcs.push({ type: "L", from: cur, to: end, len: Math.hypot(end[0] - cur[0], end[1] - cur[1]) });
		if (arc) {
			pcs.push(arc);
			cur = arc.to;
		} else cur = end;
	}
	let d = `M${points[0][0]} ${points[0][1]}`;
	let len = 0;
	for (const pc of pcs) {
		if (pc.type === "L") d += ` L${pc.to[0].toFixed(2)} ${pc.to[1].toFixed(2)}`;
		else
			d += ` A${pc.r.toFixed(2)} ${pc.r.toFixed(2)} 0 0 ${pc.dir > 0 ? 1 : 0} ${pc.to[0].toFixed(2)} ${pc.to[1].toFixed(2)}`;
		len += pc.len;
	}
	const at = (s) => {
		let rem = Math.max(0, s);
		for (let i = 0; i < pcs.length; i++) {
			const pc = pcs[i];
			if (rem <= pc.len || i === pcs.length - 1) {
				const q = pc.len > 0 ? Math.min(1, rem / pc.len) : 0;
				if (pc.type === "L") return [lerp(pc.from[0], pc.to[0], q), lerp(pc.from[1], pc.to[1], q)];
				const ang = pc.a0 + pc.dir * pc.th * q;
				return [pc.c[0] + pc.r * Math.cos(ang), pc.c[1] + pc.r * Math.sin(ang)];
			}
			rem -= pc.len;
		}
		return points[points.length - 1];
	};
	return { d, len, at };
}

const pathCache = new Map();
function cachedPath(points, r) {
	const key = JSON.stringify([points, r]);
	if (!pathCache.has(key)) pathCache.set(key, roundedPath(points, r));
	return pathCache.get(key);
}

// ── the timeline dot (blue core, white ring, soft blue glow below) ────────

function TimelineDot({ x, y, size = 11, colour = [17, 138, 195], opacity = 1, scale = 1 }) {
	if (opacity <= 0.001 || scale <= 0.001) return null;
	return (
		<div
			style={{
				position: "absolute",
				left: x - size / 2,
				top: y - size / 2,
				width: size,
				height: size,
				borderRadius: "50%",
				background: rgbs(colour),
				boxShadow: "0 0 0 2px rgb(255,255,255), 0 9px 9px 1px rgba(70,140,190,0.30)",
				transform: `scale(${scale.toFixed(3)})`,
				opacity,
			}}
		/>
	);
}

// ── preset 1: the word chain ──────────────────────────────────────────────

/**
 * sequoia-word-chain — an icon + words laid out whole and centred; the items
 * pop in one by one (each sliding in from +slide.dx and running a colour
 * ramp) while the line as a group settles from an offset; optional push-in
 * exit with per-item fade timing.
 */
function WordChain(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const size = cfg.size ?? 66;
	const weight = cfg.weight ?? 500;
	const ink = cfg.colour ?? Q.ink;
	const words = cfg.words ?? [];
	const at = cfg.atMs ?? [];
	const iconOn = cfg.icon ? 1 : 0;
	const n = words.length + iconOn;
	const rampStops = cfg.colourRamp ?? [[0, ink]];
	const slide = cfg.slide ?? { dx: 25, durMs: 330 };
	const groupDx = chan(cfg.groupKeys, ms, "dx", 0);
	const ex = cfg.exit;
	const scale = ex ? chan(ex.scaleKeys, ms, "scale", 1) : 1;

	const items = [];
	for (let i = 0; i < n; i++) {
		const isIcon = iconOn && i === 0;
		const a = at[i] ?? 0;
		const shown = ms >= a;
		const since = ms - a;
		let op = shown ? 1 : 0;
		const f = ex?.fade?.[i];
		if (f) op *= 1 - clamp01((ms - f.startMs) / Math.max(1, f.durMs)) ** (f.pow ?? 1);
		if (isIcon) {
			const rot = cfg.iconSpin ? chan(cfg.iconSpin.keys, since, "deg", 0) : 0;
			items.push(
				<span
					key="icon"
					style={{
						display: "inline-flex",
						opacity: op,
						transform: `translateY(${cfg.iconDy ?? 0}px) rotate(${rot.toFixed(2)}deg)`,
						marginRight: cfg.iconGap ?? 0,
					}}
				>
					<Icon
						name={cfg.icon}
						size={cfg.iconSize ?? size * 0.82}
						colour={ink}
						stroke={cfg.iconStroke ?? 2.2}
					/>
				</span>,
			);
		} else {
			const dx = shown ? slide.dx * settleDecay(since, 0, slide.durMs) : 0;
			items.push(
				<span
					key={`w${i}`}
					style={{
						display: "inline-flex",
						opacity: op,
						color: rgbs(ramp(rampStops, since)),
						transform: `translateX(${dx.toFixed(2)}px)`,
					}}
				>
					{words[i - iconOn]}
				</span>,
			);
		}
	}
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			<div
				style={{
					position: "absolute",
					left: cfg.centerX ?? 640,
					top: cfg.centerY ?? 360,
					transform: `translate(-50%,-50%) translateX(${groupDx.toFixed(2)}px) scale(${scale.toFixed(4)})`,
					transformOrigin: "50% 50%",
					display: "flex",
					alignItems: "center",
					gap: cfg.gap ?? 20,
					whiteSpace: "nowrap",
					font: `${weight} ${size}px ${FONT}`,
					letterSpacing: cfg.letterSpacing ?? "0em",
					lineHeight: 1,
				}}
			>
				{items}
			</div>
		</div>
	);
}

// ── preset 2: the task timeline (one canvas under a measured camera) ──────

const GREY = [112, 114, 111];
const ICON_GREY = [106, 108, 105];

function RowIcon({ icon, size }) {
	if (!icon) return null;
	const col = rgbs(icon.colour ?? ICON_GREY);
	if (icon.kind === "glyph")
		return (
			<BrandGlyph
				letter={icon.letter ?? "A"}
				bg={icon.bg ?? [17, 94, 183]}
				fg={icon.fg ?? Q.white}
				size={size}
				radius={icon.radius ?? 0.28}
			/>
		);
	if (icon.kind === "md")
		return (
			<span
				style={{
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					width: size,
					height: size * 0.76,
					borderRadius: size * 0.16,
					background: col,
					color: "#fff",
					font: `700 ${(size * 0.42).toFixed(1)}px ${FONT}`,
					letterSpacing: "-0.02em",
					flex: "0 0 auto",
				}}
			>
				{icon.text ?? "M↓"}
			</span>
		);
	if (icon.kind === "window")
		return (
			<span style={{ display: "inline-flex", flex: "0 0 auto" }}>
				<AppWindow size={size} color={col} strokeWidth={icon.stroke ?? 2} />
			</span>
		);
	if (icon.kind === "pointer")
		return (
			<span style={{ display: "inline-flex", flex: "0 0 auto" }}>
				<MousePointer2 size={size} color={col} fill={col} strokeWidth={icon.stroke ?? 2} />
			</span>
		);
	return (
		<Icon
			name={icon.name ?? "key"}
			size={size}
			colour={icon.colour ?? ICON_GREY}
			stroke={icon.stroke ?? 1.9}
		/>
	);
}

/** Entry state of a popped item at scene ms -> {on, dy}. */
function popState(item, ms) {
	if (ms < (item.atMs ?? 0)) return { on: false, dy: 0 };
	if (item.dyKeys) return { on: true, dy: chan(item.dyKeys, ms, "dy", 0) };
	if (item.dy)
		return { on: true, dy: item.dy * settleDecay(ms, item.atMs ?? 0, item.settleMs ?? 400) };
	return { on: true, dy: 0 };
}

function Header(h, ms) {
	const size = h.size ?? 92;
	const font = `${h.weight ?? 500} ${size}px ${FONT}`;
	const tw = textWidth(h.text, font);
	const chev = h.chevron ?? {};
	const chevW = chev.w ?? 54;
	const chevH = chev.h ?? 27;
	const sw = chev.stroke ?? 4.6;
	const gap = h.gap ?? 60;
	const p = chan(h.expandKeys, ms, "p", 0);
	const ox = h.collapsedCx ?? 650;
	const g0 = ox - (tw + gap + chevW) / 2;
	const titleL = lerp(g0, h.x0 ?? 123, p);
	const chevL = lerp(g0 + tw + gap, (h.x1 ?? 1157) - chevW, p);
	const cy = h.cy ?? 138;
	const s = chan(h.scaleKeys, ms, "scale", 1);
	const rot = chan(h.rotKeys, ms, "deg", 0);
	const col = kf(h.colourKeys ?? [{ at: 0, colour: Q.ink }], ms).colour ?? Q.ink;
	// shimmer: a teal band travelling L->R in SCREEN x (camera x is 0 here)
	const sh = h.shimmer;
	let textStyle = { color: rgbs(col) };
	let chevCol = col;
	if (sh && ms >= sh.fromMs && ms <= sh.toMs) {
		const bx = lerp(sh.x0, sh.x1, (ms - sh.fromMs) / Math.max(1, sh.toMs - sh.fromMs));
		const toLocal = (x) => ox + (x - ox) / s - titleL;
		const hw = sh.halfWidth ?? 120;
		const c0 = rgbs(col);
		const c1 = rgbs(mix(col, sh.colour, sh.strength ?? 1));
		textStyle = {
			color: "transparent",
			backgroundImage: `linear-gradient(90deg, ${c0} ${toLocal(bx - hw).toFixed(1)}px, ${c1} ${toLocal(bx).toFixed(1)}px, ${c0} ${toLocal(bx + hw).toFixed(1)}px)`,
			WebkitBackgroundClip: "text",
			backgroundClip: "text",
		};
		const sx = ox + (chevL + chevW / 2 - ox) * s;
		chevCol = mix(col, sh.colour, (sh.strength ?? 1) * Math.max(0, 1 - Math.abs(sx - bx) / hw));
	}
	return (
		<div
			key="header"
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1280,
				height: 0,
				transform: `scale(${s.toFixed(4)})`,
				transformOrigin: `${ox}px ${cy}px`,
			}}
		>
			<div
				style={{
					position: "absolute",
					left: titleL,
					top: cy,
					transform: "translateY(-50%)",
					font,
					lineHeight: 1.1,
					whiteSpace: "nowrap",
					...textStyle,
				}}
			>
				{h.text}
			</div>
			<svg
				width={chevW}
				height={chevW}
				viewBox={`0 0 ${chevW} ${chevW}`}
				style={{
					position: "absolute",
					left: chevL,
					top: cy - chevW / 2 + (chev.dy ?? 0),
					overflow: "visible",
					transform: `rotate(${(-rot).toFixed(2)}deg)`,
					transformOrigin: "50% 50%",
				}}
			>
				<polyline
					points={`${sw / 2},${(chevW - chevH) / 2} ${chevW / 2},${(chevW + chevH) / 2} ${chevW - sw / 2},${(chevW - chevH) / 2}`}
					fill="none"
					stroke={rgbs(chevCol)}
					strokeWidth={sw}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}

function ResultRow(r, i, ms, rs) {
	const st = popState(r, ms);
	if (!st.on) return null;
	const iconX = rs.iconX ?? 126;
	return (
		<div
			key={`row${i}`}
			style={{
				position: "absolute",
				left: iconX,
				width: (rs.rightX ?? 1155) - iconX,
				top: r.y + st.dy,
				transform: "translateY(-50%)",
				display: "flex",
				alignItems: "center",
				font: `${rs.weight ?? 500} ${rs.size ?? 33}px ${FONT}`,
				lineHeight: 1.2,
				whiteSpace: "nowrap",
				color: rgbs(rs.ink ?? Q.ink),
			}}
		>
			<span style={{ width: (rs.textX ?? 182) - iconX, display: "inline-flex", flex: "0 0 auto" }}>
				<RowIcon icon={r.icon} size={rs.iconSize ?? 35} />
			</span>
			<span
				style={{
					display: "inline-flex",
					gap: rs.wordGap ?? 11,
					flex: "1 1 auto",
					minWidth: 0,
					overflow: "hidden",
				}}
			>
				{(r.parts ?? []).map((pt, j) => (
					<span
						key={j}
						style={{
							color: rgbs(pt.grey ? (rs.grey ?? GREY) : (rs.ink ?? Q.ink)),
							margin: pt.bar ? `0 ${rs.barPad ?? 4}px` : 0,
						}}
					>
						{pt.text}
					</span>
				))}
			</span>
			<span style={{ flex: "0 0 auto", marginLeft: 16 }}>{r.right}</span>
		</div>
	);
}

function Step(sp, i, ms, ss) {
	const st = popState(sp, ms);
	if (!st.on) return null;
	const iconX = ss.iconX ?? 60;
	return (
		<div
			key={`step${i}`}
			style={{
				position: "absolute",
				left: iconX,
				top: sp.y + st.dy,
				transform: "translateY(-50%)",
				display: "flex",
				alignItems: "center",
				font: `${ss.weight ?? 400} ${ss.size ?? 32}px ${FONT}`,
				lineHeight: 1.2,
				whiteSpace: "nowrap",
				color: rgbs(sp.grey ? (ss.grey ?? [104, 106, 103]) : (ss.ink ?? Q.ink)),
			}}
		>
			<span style={{ width: (ss.textX ?? 123) - iconX, display: "inline-flex", flex: "0 0 auto" }}>
				<RowIcon icon={sp.icon} size={sp.iconSize ?? ss.iconSize ?? 36} />
			</span>
			<span>{sp.text}</span>
			{sp.chevron ? (
				<svg
					width={28}
					height={16}
					viewBox="0 0 28 16"
					style={{ marginLeft: ss.chevGap ?? 30, overflow: "visible" }}
				>
					<polyline
						points="2,2 14,14 26,2"
						fill="none"
						stroke={rgbs(ss.chevColour ?? [110, 112, 109])}
						strokeWidth={2.6}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			) : null}
		</div>
	);
}

function Paragraph(pg, ms) {
	const words = (pg.text ?? "").split(/\s+/).filter(Boolean);
	const at = pg.wordAtMs ?? [];
	const base = pg.colour ?? [30, 31, 29];
	const stops = pg.colourRamp ?? [[0, base]];
	return (
		<div
			key="para"
			style={{
				position: "absolute",
				left: pg.x ?? 64,
				top: pg.y ?? 0,
				width: pg.width ?? 1000,
				font: `${pg.weight ?? 400} ${pg.size ?? 31}px ${FONT}`,
				lineHeight: `${pg.lineHeight ?? 37}px`,
				color: rgbs(base),
			}}
		>
			{words.map((w, i) => {
				const a = at[i];
				const on = a != null && ms >= a;
				return (
					<span
						key={i}
						style={{ opacity: on ? 1 : 0, color: on ? rgbs(ramp(stops, ms - a)) : undefined }}
					>
						{w}
						{i < words.length - 1 ? " " : ""}
					</span>
				);
			})}
		</div>
	);
}

function Slot(sl, ms) {
	if (ms < (sl.atMs ?? 0)) return null;
	const P = chan(sl.revealKeys, ms, "p", 1e6);
	const W = sl.revealWidth ?? 875;
	const k = sl.slope ?? 0.95;
	const ang = (Math.atan2(1, -k) * 180) / Math.PI;
	const f = 1 / Math.hypot(1, k);
	const mask = `linear-gradient(${ang.toFixed(2)}deg, rgba(0,0,0,1) ${((P - W / 2) * f).toFixed(1)}px, rgba(0,0,0,0) ${((P + W / 2) * f).toFixed(1)}px)`;
	return (
		<div
			key="slot"
			style={{
				position: "absolute",
				left: sl.x,
				top: sl.y,
				width: sl.w,
				height: sl.h,
				boxSizing: "border-box",
				borderRadius: sl.radius ?? 40,
				border: `${sl.borderW ?? 1.5}px solid ${rgbs(sl.border ?? [215, 217, 214])}`,
				background: rgbs(sl.face ?? [255, 255, 255]),
				WebkitMaskImage: mask,
				maskImage: mask,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<span
				style={{
					font: `500 ${sl.labelSize ?? 18}px ${FONT}`,
					color: rgbs(sl.labelColour ?? [150, 152, 149]),
				}}
			>
				{sl.label}
			</span>
		</div>
	);
}

function Trail(tr, i, ms) {
	if (ms < (tr.atMs ?? 0)) return null;
	const path = cachedPath(tr.points, tr.radius ?? 27);
	const s = chan(tr.keys, ms, "s", 0);
	const from = tr.lineFrom ?? 0;
	const op = chan(tr.opacityKeys, ms, "o", 1);
	const sc = chan(tr.scaleKeys, ms, "k", 1);
	const big = (path.len + 100).toFixed(0);
	const width = tr.width ?? 1.6;
	const tail = tr.tail;
	const segs = [];
	if (tail && s > from) {
		for (let j = 0; j < 3; j++) {
			const a = Math.max(from, s - (tail.len * (3 - j)) / 3);
			const b = Math.max(from, s - (tail.len * (2 - j)) / 3);
			if (b > a)
				segs.push(
					<path
						key={j}
						d={path.d}
						fill="none"
						stroke={rgbs(tail.colour ?? [120, 178, 212])}
						strokeOpacity={((j + 1) / 3) * (tail.opacity ?? 1) * op * sc}
						strokeWidth={width}
						strokeDasharray={`0 ${a.toFixed(2)} ${(b - a).toFixed(2)} ${big}`}
					/>,
				);
		}
	}
	const [dx, dy] = path.at(s);
	return (
		<React.Fragment key={`trail${i}`}>
			<svg
				width={1}
				height={1}
				style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
			>
				<path
					d={path.d}
					fill="none"
					stroke={rgbs(tr.colour ?? [232, 234, 231])}
					strokeWidth={width}
					strokeDasharray={`0 ${from.toFixed(2)} ${Math.max(0, s - from).toFixed(2)} ${big}`}
				/>
				{segs}
			</svg>
			{tr.dot === false ? null : <TimelineDot x={dx} y={dy} opacity={op} scale={sc} />}
		</React.Fragment>
	);
}

function TaskTimeline(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const cam = kf(cfg.cam ?? [{ at: 0, x: 0, y: 0 }], ms);
	const els = [];
	for (const [i, sg] of (cfg.segments ?? []).entries()) {
		if (ms < (sg.atMs ?? 0)) continue;
		const w = sg.w ?? 1.6;
		const grow = sg.durMs ? clamp01((ms - (sg.atMs ?? 0)) / sg.durMs) : 1;
		els.push(
			<div
				key={`seg${i}`}
				style={{
					position: "absolute",
					left: sg.x - w / 2,
					top: sg.y0,
					width: w,
					height: (sg.y1 - sg.y0) * grow,
					background: rgbs(sg.colour ?? [232, 234, 231]),
				}}
			/>,
		);
	}
	if (cfg.slot) els.push(Slot(cfg.slot, ms));
	for (const [i, tr] of (cfg.trails ?? []).entries()) els.push(Trail(tr, i, ms));
	if (cfg.header) els.push(Header(cfg.header, ms));
	const rs = cfg.rowStyle ?? {};
	for (const [i, r] of (cfg.rows ?? []).entries()) els.push(ResultRow(r, i, ms, rs));
	const ss = cfg.stepStyle ?? {};
	for (const [i, sp] of (cfg.steps ?? []).entries()) els.push(Step(sp, i, ms, ss));
	if (cfg.paragraph && ms >= (cfg.paragraph.wordAtMs?.[0] ?? 0))
		els.push(Paragraph(cfg.paragraph, ms));
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1280,
					height: 720,
					transform: `translate(${(cam.x ?? 0).toFixed(2)}px, ${(cam.y ?? 0).toFixed(2)}px)`,
				}}
			>
				{els}
			</div>
		</div>
	);
}

export const S4_PRESETS = {
	"sequoia-word-chain": {
		note: "A thinking line ('⟲ searching browsing history for'): an icon + words laid out whole and centred, popping in one by one — each word slides in from +slide.dx and runs a light-cyan -> black colour ramp — while the whole line settles from a group offset; the icon turns back upright; optional push-in exit (scale keys about the line centre) with per-item fade timing (outer items first).",
		nativeMs: 1400,
		params: {
			icon: ["string", "history", "shared Icon name shown before the words (omit for none)"],
			words: ["array", "[]", "the words, in order"],
			atMs: ["array", "[]", "scene ms each item pops in (icon first when present)"],
			size: ["number", 66, "font px"],
			weight: ["number", 500, "font weight"],
			gap: ["number", 20, "px between items"],
			centerX: ["number", 640, "line centre x (stage px)"],
			centerY: ["number", 360, "line centre y (stage px)"],
			groupKeys: ["array", "[]", "kf keys {at, dx}: whole-line x offset (the recentring slide)"],
			slide: ["object", "{dx:25,durMs:330}", "per-word entry offset + exponential settle"],
			colourRamp: ["array", "[[0,ink]]", "[[msSinceAppear,[r,g,b]],...] per-word colour run"],
			iconSpin: ["object", "{keys:[{at,deg}]}", "icon rotation since it appears (deg, CW+)"],
			iconDy: ["number", 0, "icon vertical nudge (px) to sit on the x-height centre"],
			letterSpacing: ["string", "0em", "tracking (the reference grotesk is tighter than Segoe UI)"],
			exit: ["object", "{scaleKeys,fade:[{startMs,durMs,pow}]}", "push-in exit and per-item fades"],
		},
		render: WordChain,
	},
	"sequoia-task-timeline": {
		note: "The agent's task trace as ONE canvas under a measured camera: a dropdown header ('Credit card ⌄') that pops small, settles, shimmers, darkens and expands (chevron turning 180deg); result rows that pop and settle; steps (icon + label, optional chevron); a product-window slot whose outline is drawn by a dot and whose face is revealed by a diagonal mask; a streamed summary paragraph; timeline lines drawn by blue dots travelling rounded-corner paths. Positions are canvas px; cam keys {at,x,y} move the canvas.",
		nativeMs: 9250,
		params: {
			cam: [
				"array",
				"[{at:0,x:0,y:0}]",
				"kf keys: canvas offset on screen (measured per frame where it moves)",
			],
			header: [
				"object",
				"{text,size,weight,x0,x1,cy,collapsedCx,gap,chevron,scaleKeys,expandKeys,rotKeys,colourKeys,shimmer}",
				"the dropdown header",
			],
			rows: ["array", "[]", "{y,atMs,dyKeys|dy,icon,parts:[{text,grey,bar}],right}"],
			rowStyle: ["object", "{}", "size, weight, iconX, textX, rightX, iconSize, grey"],
			steps: ["array", "[]", "{y,atMs,dy,settleMs,icon,text,grey,chevron}"],
			stepStyle: ["object", "{}", "size, weight, iconX, textX, iconSize"],
			slot: [
				"object",
				"{x,y,w,h,radius,label,revealKeys}",
				"product window placeholder + diagonal reveal",
			],
			trails: [
				"array",
				"[]",
				"{points,radius,lineFrom,atMs,keys:[{at,s}],scaleKeys:[{at,k}] (the dot grows in / shrinks out),opacityKeys:[{at,o}],tail}",
			],
			segments: ["array", "[]", "{x,y0,y1,atMs}: static timeline pieces"],
			paragraph: [
				"object",
				"{text,x,y,width,size,lineHeight,wordAtMs,colourRamp}",
				"the streamed summary",
			],
		},
		render: TaskTimeline,
	},
};
