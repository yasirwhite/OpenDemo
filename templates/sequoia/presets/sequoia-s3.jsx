/**
 * sequoia-s3.jsx — section 3 (21.267-31.733s): the light-ground product
 * statement. Mark + "A browser that gets complex work done" (grey, a blue
 * band, then an ink wave), the "across / websites / accounts / history"
 * staircase, the task panel whose border is drawn by a travelling blue dot,
 * the product new-tab slot, the push-in to the composer, the I-beam click and
 * the typed task, then the chat bubble and the streamed reply.
 *
 * All measurements are on the 1280x720 stage (ref px / 1.5), frame n at
 * t = n/30 s, full-decode frames (sections/s3/notes.md has the traces).
 * Every render is a pure function of t.
 */
import { Box, ChevronDown, Laptop, MessagesSquare, Plus, Search, Shield, Zap } from "lucide-react";
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import { FONT, Icon, kf, live, localMs, Q, rgbs } from "./sequoia-shared.jsx";

const W = 1280;
const H = 720;

// ── helpers ───────────────────────────────────────────────────────────────

/** Linear interpolation through a dense measured table [[ms, v], ...]. */
function table(rows, ms) {
	if (!rows || !rows.length) return 0;
	if (ms <= rows[0][0]) return rows[0][1];
	for (let i = 0; i < rows.length - 1; i++) {
		const [a, va] = rows[i];
		const [b, vb] = rows[i + 1];
		if (ms < b) return lerp(va, vb, (ms - a) / Math.max(1e-6, b - a));
	}
	return rows[rows.length - 1][1];
}

/** Colour ramp through a table [[ms, [r,g,b]], ...]. */
function colourTable(rows, ms) {
	if (ms <= rows[0][0]) return rows[0][1];
	for (let i = 0; i < rows.length - 1; i++) {
		const [a, ca] = rows[i];
		const [b, cb] = rows[i + 1];
		if (ms < b) {
			const p = (ms - a) / Math.max(1e-6, b - a);
			return ca.map((x, j) => lerp(x, cb[j], p));
		}
	}
	return rows[rows.length - 1][1];
}

/** A Lucide component laid out inline (for glyphs the shared Icon map lacks). */
function LIcon({ C, size, colour, stroke = 1.8, style = null }) {
	return (
		<span
			style={{
				display: "inline-flex",
				width: size,
				height: size,
				flex: "0 0 auto",
				...(style ?? {}),
			}}
		>
			<C size={size} color={rgbs(colour)} strokeWidth={stroke} />
		</span>
	);
}

/**
 * A travelling colour front on the stage, as a CSS gradient in STAGE px.
 * Iso-lines are x + y*tan(theta) = c ("x at y = 0"), so a front that reaches
 * lower lines later has a positive theta. stops: [{d, colour, a}], d in the
 * same c units relative to `c`. Painted with background-clip:text,
 * background-size = stage, background-position = -(element origin), so every
 * line and the mark share one field.
 */
function waveCss(theta, c, stops) {
	const th = (theta * Math.PI) / 180;
	const k = Math.cos(th);
	const parts = stops.map((s) => `${rgbs(s.colour, s.a ?? 1)} ${((c + s.d) * k).toFixed(1)}px`);
	return `linear-gradient(${(90 + theta).toFixed(2)}deg, ${parts.join(", ")})`;
}

/** The same front as an SVG userSpaceOnUse gradient (for the mark). */
function WaveDef({ id, theta, c, stops }) {
	const th = (theta * Math.PI) / 180;
	const L = 3000;
	const k = Math.cos(th);
	return (
		<linearGradient
			id={id}
			gradientUnits="userSpaceOnUse"
			x1={0}
			y1={0}
			x2={L * Math.cos(th)}
			y2={L * Math.sin(th)}
		>
			{stops.map((s) => (
				<stop
					key={s.d}
					offset={clamp01(((c + s.d) * k) / L)}
					stopColor={rgbs(s.colour)}
					stopOpacity={s.a ?? 1}
				/>
			))}
		</linearGradient>
	);
}

/**
 * The placeholder mark's geometry (same proportions as SequoiaMark in
 * sequoia-shared.jsx) drawn as SVG children so it can take a gradient paint.
 */
function MarkShapes({ cx, cy, size, paint, stroke = 0.085 }) {
	const sw = size * stroke;
	const r = size / 2 - sw / 2;
	const x0 = cx - size / 2;
	const y0 = cy - size / 2;
	const P = (fx, fy) => `${(x0 + size * fx).toFixed(2)} ${(y0 + size * fy).toFixed(2)}`;
	const d = `M${P(0.5, 0.2)} L${P(0.7, 0.47)} L${P(0.6, 0.47)} L${P(0.74, 0.67)} L${P(0.26, 0.67)} L${P(0.4, 0.47)} L${P(0.3, 0.47)} Z M${P(0.46, 0.67)} L${P(0.54, 0.67)} L${P(0.54, 0.8)} L${P(0.46, 0.8)} Z`;
	return (
		<g>
			<circle cx={cx} cy={cy} r={r} fill="none" stroke={paint} strokeWidth={sw} />
			<path d={d} fill={paint} />
		</g>
	);
}

const fontCss = (size, weight = 600) => `${weight} ${size}px ${FONT}`;
const greyC = (v) => [v, v + 1, v - 1];

// ── 1. title stack ────────────────────────────────────────────────────────

/*
 * sequoia-title-stack — mark + a centred stack of lines (21.267-23.333).
 * Measured:
 *  - mark descends from under a clip edge (y 252): bottom 258 -> 389,
 *    offsets 131,111,88,61,40,28,20,15,12,9,7,5 (21.267-21.633), a ~linear
 *    drop for 0.1s then an expo settle; centre (435,342), 91px.
 *  - lines enter ~60px low and settle x0.72/frame (tau ~0.1s), first visible
 *    21.433 / 21.933 / 22.033 / 22.133, fading in over ~0.15s.
 *  - the block re-centres on the mark as lines arrive: line-1 cap top
 *    313 -> 176 between 21.75 and 22.7 (table blockP), peak 23px/frame at 22.0.
 *  - colour: grey [158,160,158]; a blue band [110,150,166] crosses at
 *    ~30px/frame with iso-lines tilted 42deg (lower lines later); an ink front
 *    tilted 34.6deg passes 22.30-22.90 through a blue-grey ramp ~360px wide;
 *    exit 23.033-23.333 ink -> grey -> ground in place.
 */
function TitleStack(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const lines = cfg.lines ?? ["A browser", "that gets", "complex", "work done"];
	const F = cfg.fontSize ?? 92;
	const LH = cfg.pitch ?? 91;
	const textX = cfg.textX ?? 507;
	const n = lines.length;
	const centre = cfg.centreY ?? 340;
	const mark = cfg.mark ?? { x: 435, y: 342, size: 91, clipTop: 252 };

	// block re-centring: alone the first line is centred; full block centred.
	const p = table(cfg.blockP ?? [[0, 1]], ms);
	const blockTop = centre - LH / 2 - ((n - 1) * LH * p) / 2;

	// colour field
	const grey = cfg.grey ?? [158, 160, 158];
	const ink = cfg.ink ?? Q.ink;
	const band = cfg.band ?? {};
	const bandC = table(band.c ?? [[0, -3000]], ms);
	const bandW = band.w ?? 115;
	const bandCol = band.colour ?? [110, 150, 166];
	const bandStops = [
		{ d: -bandW, colour: bandCol, a: 0 },
		{ d: -bandW * 0.5, colour: bandCol, a: 0.55 },
		{ d: 0, colour: bandCol, a: 1 },
		{ d: bandW * 0.5, colour: bandCol, a: 0.55 },
		{ d: bandW, colour: bandCol, a: 0 },
	];
	const wave = cfg.wave ?? {};
	const waveC = table(wave.c ?? [[0, -3000]], ms);
	const waveStops = wave.stops ?? [
		{ d: -180, colour: ink, a: 1 },
		{ d: -90, colour: [50, 68, 74], a: 1 },
		{ d: 0, colour: [98, 122, 130], a: 1 },
		{ d: 90, colour: [138, 152, 156], a: 1 },
		{ d: 180, colour: [150, 156, 156], a: 0 },
	];
	const exit = cfg.exit ?? null;
	const exitCol = exit && ms >= exit[0][0] ? colourTable(exit, ms) : null;

	const bandTheta = band.theta ?? 42;
	const waveTheta = wave.theta ?? 34.6;
	const layersCss = exitCol
		? `linear-gradient(${rgbs(exitCol)}, ${rgbs(exitCol)})`
		: [
				waveCss(waveTheta, waveC, waveStops),
				waveCss(bandTheta, bandC, bandStops),
				`linear-gradient(${rgbs(grey)}, ${rgbs(grey)})`,
			].join(", ");

	// line entries
	const rise = cfg.rise ?? { dy: 62, tauMs: 95, fadeMs: 150 };
	const atMs = cfg.lineAtMs ?? [133, 633, 733, 833];

	// mark entry
	const mdy = kf(mark.keys ?? [{ at: 0, dy: 0 }], ms).dy ?? 0;
	const my = mark.y + mdy;

	const id = `${cfg.id ?? "s3t"}`;
	return (
		<div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
			<svg
				width={W}
				height={H}
				viewBox={`0 0 ${W} ${H}`}
				style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
			>
				<defs>
					<clipPath id={`${id}-mc`}>
						<rect x={0} y={mark.clipTop ?? 0} width={W} height={H} />
					</clipPath>
					{exitCol ? null : (
						<>
							<WaveDef id={`${id}-band`} theta={bandTheta} c={bandC} stops={bandStops} />
							<WaveDef id={`${id}-wave`} theta={waveTheta} c={waveC} stops={waveStops} />
						</>
					)}
				</defs>
				<g clipPath={`url(#${id}-mc)`}>
					{exitCol ? (
						<MarkShapes cx={mark.x} cy={my} size={mark.size} paint={rgbs(exitCol)} />
					) : (
						<>
							<MarkShapes cx={mark.x} cy={my} size={mark.size} paint={rgbs(grey)} />
							<MarkShapes cx={mark.x} cy={my} size={mark.size} paint={`url(#${id}-band)`} />
							<MarkShapes cx={mark.x} cy={my} size={mark.size} paint={`url(#${id}-wave)`} />
						</>
					)}
				</g>
			</svg>
			{lines.map((txt, i) => {
				const a0 = atMs[i] ?? atMs[atMs.length - 1];
				if (ms < a0) return null;
				const age = ms - a0;
				const dy = rise.dy * Math.exp(-age / rise.tauMs);
				const fade = Array.isArray(rise.fadeMs) ? (rise.fadeMs[i] ?? rise.fadeMs[0]) : rise.fadeMs;
				const op = clamp01(age / fade);
				const top = blockTop + i * LH + dy;
				return (
					<div
						key={txt}
						style={{
							position: "absolute",
							left: textX,
							top,
							paddingBottom: LH * 0.5,
							font: fontCss(F, cfg.weight ?? 600),
							lineHeight: `${LH}px`,
							letterSpacing: cfg.tracking ?? "-0.01em",
							whiteSpace: "nowrap",
							color: "transparent",
							opacity: op,
							backgroundImage: layersCss,
							backgroundSize: `${W}px ${H}px`,
							backgroundPosition: `${(-textX).toFixed(2)}px ${(-top).toFixed(2)}px`,
							backgroundRepeat: "no-repeat",
							WebkitBackgroundClip: "text",
							backgroundClip: "text",
						}}
					>
						{txt}
					</div>
				);
			})}
		</div>
	);
}

// ── 2. word staircase ─────────────────────────────────────────────────────

/*
 * sequoia-word-staircase — "across" + icon rows (23.333-25.6).
 * Measured:
 *  - head enters 23.4 at +58px, settles x0.8/frame (tau 0.15s), colour
 *    [188,221,236] -> [100,138,150] -> [55,75,80] -> ink by 23.73.
 *  - head alone sits centred (x-height box 381-430); 23.9-24.7 it climbs to
 *    its slot (top 250) with a burst at 24.03-24.1 (table headP).
 *  - rows pop in at 24.2 at their final y, already ink, displaced sideways
 *    (websites +145, accounts -145, history +49) and converge on one measured
 *    per-frame curve (conv: 1, .50, .37, .30, .23, .19, ...).
 *  - everything is clipped at the sidebar divider (x 377).
 *  - exit: each word accelerates left (x1.75-2.2 per frame) and is cut:
 *    head 25.333 -> 25.533, rows 25.4 -> 25.6.
 */
function WordStaircase(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const F = cfg.fontSize ?? 96;
	const LH = cfg.pitch ?? 90;
	const x0 = cfg.x ?? 444;
	const clipX = cfg.clipLeft ?? 377;
	const head = cfg.head ?? { text: "across" };
	const rows = cfg.rows ?? [];
	const ink = cfg.ink ?? Q.ink;
	const iconK = cfg.iconScale ?? 0.82;
	const gap = cfg.iconGap ?? 0.2;

	const slotTop = cfg.top ?? 230; // line-box top of the head in the final layout
	const aloneTop = cfg.aloneTop ?? 361;
	const hp = table(cfg.headP ?? [[0, 1]], ms);
	const hRise = cfg.headRise ?? { atMs: 67, dy: 58, tauMs: 150 };
	const hAge = ms - hRise.atMs;
	const headDy = hAge >= 0 ? hRise.dy * Math.exp(-hAge / hRise.tauMs) : 0;
	const headCol = colourTable(cfg.headColour ?? [[0, ink]], ms);
	const conv = cfg.conv ?? [1, 0];
	const rowsAt = cfg.rowsAtMs ?? 867;

	const exitDx = (e) => {
		if (!e || ms < e.atMs) return 0;
		const nf = ((ms - e.atMs) / 1000) * 30;
		return -(e.a ?? 1) * (Math.pow(e.r ?? 2, nf) - 1);
	};
	const cut = (e) => e && ms >= e.cutMs;
	const rowStyle = (left, top) => ({
		position: "absolute",
		left: left - clipX,
		top,
		height: LH,
		display: "flex",
		alignItems: "center",
		gap: F * gap,
		font: fontCss(F, cfg.weight ?? 600),
		lineHeight: `${LH}px`,
		letterSpacing: cfg.tracking ?? "-0.01em",
		whiteSpace: "nowrap",
	});

	const items = [];
	if (ms >= hRise.atMs && !cut(head.exit)) {
		const top = lerp(aloneTop, slotTop, hp) + headDy;
		items.push(
			<div key="head" style={rowStyle(x0 + (head.indent ?? 0) + exitDx(head.exit), top)}>
				<span style={{ color: rgbs(headCol) }}>{head.text}</span>
			</div>,
		);
	}
	if (ms >= rowsAt) {
		const nf = ((ms - rowsAt) / 1000) * 30;
		const i0 = Math.min(conv.length - 1, Math.floor(nf));
		const f = i0 >= conv.length - 1 ? conv[conv.length - 1] : lerp(conv[i0], conv[i0 + 1], nf - i0);
		const rowsTop = cfg.rowsTop ?? slotTop + LH;
		rows.forEach((r, i) => {
			if (cut(r.exit)) return;
			const top = rowsTop + i * LH;
			const dx = (r.dx ?? 0) * f + exitDx(r.exit);
			items.push(
				<div key={r.text} style={rowStyle(x0 + (r.indent ?? 0) + dx, top)}>
					{r.icon ? (
						<Icon
							name={r.icon}
							size={F * (r.iconScale ?? iconK)}
							colour={ink}
							stroke={cfg.iconStroke ?? 2.3}
							style={{ marginTop: F * (cfg.iconDrop ?? 0.04) }}
						/>
					) : null}
					<span style={{ color: rgbs(ink) }}>{r.text}</span>
				</div>,
			);
		});
	}
	return (
		<div
			style={{ position: "absolute", left: clipX, top: 0, right: 0, bottom: 0, overflow: "hidden" }}
		>
			{items}
		</div>
	);
}

// ── 3. task panel ─────────────────────────────────────────────────────────

/**
 * The macOS text I-beam as the reference draws it: black, serifed, a thin
 * white keyline, and a far-offset soft ghost (the "lifted" cursor shadow).
 * (x,y) is the centre, h the height, rot in degrees (negative = top leans left).
 */
function IBeam({ x, y, h, rot = 0, opacity = 1, shadow = null }) {
	if (h <= 0.5 || opacity <= 0) return null;
	const w = h * 0.36;
	const sw = Math.max(1, h * 0.055);
	const d = `M${-w / 2} ${-h / 2} C${-w * 0.15} ${-h / 2} 0 ${-h * 0.46} 0 ${-h * 0.38} C0 ${-h * 0.46} ${w * 0.15} ${-h / 2} ${w / 2} ${-h / 2} M0 ${-h * 0.38} L0 ${h * 0.38} M${-w * 0.28} ${h * 0.02} L${w * 0.28} ${h * 0.02} M${-w / 2} ${h / 2} C${-w * 0.15} ${h / 2} 0 ${h * 0.46} 0 ${h * 0.38} C0 ${h * 0.46} ${w * 0.15} ${h / 2} ${w / 2} ${h / 2}`;
	const pad = h * 0.2 + 6;
	const one = (dx, dy, col, outline, blur, alpha) => (
		<svg
			width={w + pad * 2}
			height={h + pad * 2}
			viewBox={`${-w / 2 - pad} ${-h / 2 - pad} ${w + pad * 2} ${h + pad * 2}`}
			style={{
				position: "absolute",
				left: x + dx - w / 2 - pad,
				top: y + dy - h / 2 - pad,
				overflow: "visible",
				opacity: alpha,
				transform: `rotate(${rot.toFixed(2)}deg)`,
				filter: blur ? `blur(${blur}px)` : undefined,
			}}
		>
			{outline ? (
				<path
					d={d}
					fill="none"
					stroke="#fff"
					strokeWidth={sw + 2.4}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			) : null}
			<path
				d={d}
				fill="none"
				stroke={col}
				strokeWidth={sw}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
	return (
		<>
			{shadow
				? one(shadow.dx, shadow.dy, "#000", false, shadow.blur, opacity * shadow.alpha)
				: null}
			{one(0, 0, "#0b0b0b", true, 0, opacity)}
		</>
	);
}

/** Drawn composer, authored at its final (zoomed) scale in stage px. */
function Composer({ c, text, placeholder, ui }) {
	const g = (v) => rgbs(v);
	const iconCol = [112, 114, 112];
	const chev = (
		<LIcon
			C={ChevronDown}
			size={15}
			colour={[200, 201, 199]}
			stroke={2}
			style={{ marginLeft: 6, marginTop: 2 }}
		/>
	);
	const chip = (C, label) => (
		<span style={{ display: "inline-flex", alignItems: "center" }}>
			{C ? (
				<LIcon C={C} size={20} colour={iconCol} stroke={1.8} style={{ marginRight: 7 }} />
			) : null}
			<span>{label}</span>
			{chev}
		</span>
	);
	const x = c.x ?? 138;
	const y = c.y ?? 304;
	const w = c.w ?? 1003;
	const h = c.h ?? 74;
	return (
		<>
			<svg
				width={W}
				height={H}
				viewBox={`0 0 ${W} ${H}`}
				style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
			>
				<MarkShapes
					cx={c.markX ?? 641}
					cy={c.markY ?? 210}
					size={c.markSize ?? 84}
					paint={g(c.markColour ?? [221, 222, 220])}
				/>
			</svg>
			<div
				style={{
					position: "absolute",
					left: x,
					top: y,
					width: w,
					height: h,
					boxSizing: "border-box",
					borderRadius: c.radius ?? 26,
					background: "#fff",
					border: "1px solid rgb(222,223,221)",
					boxShadow:
						c.shadow ??
						"0 2px 4px rgba(20,22,20,0.06), 0 26px 46px -6px rgba(20,22,20,0.11), 0 70px 90px -18px rgba(20,22,20,0.13)",
					display: "flex",
					alignItems: "center",
					paddingLeft: 30,
					paddingRight: 13,
					font: fontCss(c.fontSize ?? 24, 400),
					letterSpacing: c.tracking ?? "0",
					whiteSpace: "nowrap",
				}}
			>
				<span
					style={{
						flex: "1 1 auto",
						color: g(text ? (c.ink ?? [24, 25, 24]) : [150, 151, 150]),
						overflow: "hidden",
					}}
				>
					{text || placeholder}
				</span>
				<span
					style={{
						display: "inline-flex",
						alignItems: "center",
						height: 32,
						padding: "0 10px",
						borderRadius: 8,
						background: g([241, 242, 240]),
						color: g([30, 31, 30]),
						font: fontCss(17, 400),
						marginLeft: 16,
					}}
				>
					{ui.tab ?? "Tab"}
				</span>
				<span style={{ color: g([128, 129, 128]), font: fontCss(19, 400), marginLeft: 11 }}>
					{ui.toSwitch ?? "to switch"}
				</span>
				<span
					style={{
						display: "inline-flex",
						alignItems: "center",
						height: 50,
						boxSizing: "border-box",
						padding: 3,
						borderRadius: 17,
						background: g([243, 244, 242]),
						marginLeft: 16,
					}}
				>
					<span style={{ padding: "0 15px", color: g([104, 105, 104]) }}>
						{ui.search ?? "Search"}
					</span>
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							height: 42,
							boxSizing: "border-box",
							padding: "0 15px",
							borderRadius: 13,
							background: "#fff",
							border: "1px solid rgb(224,225,223)",
							color: g([10, 11, 10]),
						}}
					>
						{ui.askAi ?? "Ask AI"}
					</span>
				</span>
			</div>
			<div
				style={{
					position: "absolute",
					left: x + 21,
					width: w - 38,
					top: y + 91,
					height: 28,
					display: "flex",
					alignItems: "center",
					font: fontCss(20, 400),
					color: g(iconCol),
					whiteSpace: "nowrap",
				}}
			>
				<LIcon C={Plus} size={22} colour={iconCol} stroke={1.7} style={{ marginRight: 20 }} />
				{chip(Laptop, ui.local ?? "Local")}
				<span style={{ width: 30 }} />
				{chip(Shield, ui.guard ?? "Guard")}
				<span style={{ flex: "1 1 auto" }} />
				{chip(null, ui.model ?? "GPT-5.5")}
				<span style={{ width: 28 }} />
				{chip(null, ui.effort ?? "High")}
			</div>
		</>
	);
}

/*
 * sequoia-task-panel — 21.4-29.933. One world canvas under one camera.
 *  - tracer: a blue dot draws the panel's left border upward from (163,640)
 *    and turns the r=26 corner onto the top border (y 95), decelerating to
 *    x 1076 by 23.87 (arc-length table tracer.s, peak 73px/frame at the
 *    corner). Trail grey [227], blue [116,162,180] for ~190px behind the
 *    dot; the left border fades toward the bottom (233 at y150 -> ground at
 *    y650).
 *  - sidebar divider (x 375) grows down from the top border 22.62-23.27.
 *  - wireframe sidebar fades in 22.2-22.45; a blue shimmer passes ~every
 *    1.5s; at 25.3-25.6 it hands over to the product slot (chrome + slot).
 *  - camera 26.13-27.2: scale 1 -> 1.925 about (1110,270), slow-in, peak at
 *    26.63, expo settle (table camera.s). Task area fades 26.7-26.93.
 *  - I-beam 27.1-28.1 (measured centre/size/tilt tables), typing
 *    27.967-28.967, composer lifts (ease-in, ~-27px) 29.45-29.933 and cuts.
 */
function TaskPanel(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const tr = cfg.tracer ?? {};
	const left = tr.left ?? 163;
	const topY = tr.top ?? 95;
	const r = tr.radius ?? 26;
	const startY = tr.startY ?? 640;
	const vert = startY - (topY + r);
	const arc = (Math.PI * r) / 2;
	const s = table(tr.s ?? [[0, 0]], ms);
	const pointAt = (ss) => {
		if (ss <= vert) return [left, startY - ss];
		if (ss <= vert + arc) {
			const a = (ss - vert) / r;
			return [left + r - r * Math.cos(a), topY + r - r * Math.sin(a)];
		}
		return [left + r + (ss - vert - arc), topY];
	};
	const [dotX, dotY] = pointAt(s);
	const dotOp = clamp01(table(tr.dotOpacity ?? [[0, 1]], ms));
	const pathTo = (ss) => {
		const d = `M${left} ${startY}`;
		if (ss <= vert) return `${d} L${left} ${(startY - ss).toFixed(2)}`;
		const d2 = `${d} L${left} ${topY + r}`;
		if (ss <= vert + arc) {
			const [px, py] = pointAt(ss);
			return `${d2} A${r} ${r} 0 0 1 ${px.toFixed(2)} ${py.toFixed(2)}`;
		}
		return `${d2} A${r} ${r} 0 0 1 ${left + r} ${topY} L${(left + r + (ss - vert - arc)).toFixed(2)} ${topY}`;
	};
	const fullOp = clamp01(table(cfg.fullBorder ?? [[0, 0]], ms));

	// camera
	const cam = cfg.camera ?? {};
	const sc = table(cam.s ?? [[0, 1]], ms);
	const ox = cam.ox ?? 1110.3;
	const oy = cam.oy ?? 270;
	const sF = cam.final ?? 1.925;
	const tx = ox * (1 - sc);
	const ty = oy * (1 - sc);
	const txF = ox * (1 - sF);
	const tyF = oy * (1 - sF);

	// sidebar wireframe + shimmer
	const side = cfg.sidebar ?? {};
	const sideOp = clamp01(table(side.opacity ?? [[0, 0]], ms));
	const shimmer = side.shimmer ?? {};
	const shimCol = shimmer.colour ?? [110, 165, 195];
	const shim = (x, y) => {
		let a = 0;
		for (const c0 of shimmer.cycles ?? []) {
			const pos = (shimmer.from ?? 250) + ((shimmer.speed ?? 330) * (ms - c0)) / 1000;
			const u = y + 0.5 * (x - 184) - pos;
			const sg = shimmer.sigma ?? 60;
			a = Math.max(a, Math.exp(-(u * u) / (2 * sg * sg)));
		}
		return a;
	};
	const mix = (c0, c1, a) => c0.map((v, j) => lerp(v, c1[j], a));
	const divLen = table(cfg.divider ?? [[0, 0]], ms);

	// product slot + composer opacities, lift
	const slotOp = clamp01(table(cfg.slotOpacity ?? [[0, 0]], ms));
	const compOp = clamp01(table(cfg.composerOpacity ?? [[0, 0]], ms));
	const tasksOp = clamp01(table(cfg.tasksOpacity ?? [[0, 0]], ms));
	const lift = table(cfg.lift ?? [[0, 0]], ms);

	// typing
	const typed = cfg.typed ?? "";
	const nChars = Math.floor(table(cfg.typeChars ?? [[0, 0]], ms) + 1e-6);
	const text = typed.slice(0, Math.max(0, Math.min(typed.length, nChars)));

	// cursor (stage coords, not under the camera — it arrives after the push)
	const cur = cfg.cursor ?? null;
	let cursorEl = null;
	if (cur && ms >= cur.fromMs && ms < cur.toMs) {
		cursorEl = (
			<IBeam
				x={table(cur.x, ms)}
				y={table(cur.y, ms)}
				h={table(cur.h, ms)}
				rot={table(cur.rot ?? [[0, 0]], ms)}
				opacity={clamp01(table(cur.opacity ?? [[0, 1]], ms))}
				shadow={cur.shadow ?? { dx: 85, dy: 86, blur: 2.6, alpha: 0.2 }}
			/>
		);
	}

	const ui = cfg.ui ?? {};
	const sideItems = cfg.sideItems ?? [
		{ C: MessagesSquare, text: "Tasks" },
		{ C: Zap, text: "Routines" },
		{ C: Box, text: "Customize" },
	];
	const sideIcons = [MessagesSquare, Zap, Box];
	const skel = side.skeleton ?? [148, 120, 137, 97];
	const skelBase = [236, 237, 235];
	const skelTint = [205, 228, 240];

	const placeholderBox = (x, y, w, h, label) => (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: w,
				height: h,
				boxSizing: "border-box",
				border: "1.2px dashed rgba(120,124,120,0.45)",
				borderRadius: 10,
				background: "rgba(236,238,235,0.55)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				font: fontCss(12, 500),
				color: rgbs(greyC(128)),
				textAlign: "center",
				padding: 8,
			}}
		>
			{label}
		</div>
	);

	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: W,
					height: H,
					transformOrigin: "0 0",
					transform: `translate(${tx.toFixed(3)}px, ${(ty + lift).toFixed(3)}px) scale(${sc.toFixed(5)})`,
				}}
			>
				{/* product slot: window face, generic chrome, two placeholder areas */}
				{slotOp > 0 ? (
					<div style={{ position: "absolute", inset: 0, opacity: slotOp }}>
						{[
							[176, [237, 106, 94]],
							[194, [245, 191, 79]],
							[212, [98, 197, 85]],
						].map(([x, c]) => (
							<div
								key={x}
								style={{
									position: "absolute",
									left: x - 5.5,
									top: 108.5,
									width: 11,
									height: 11,
									borderRadius: 6,
									background: rgbs(c),
								}}
							/>
						))}
						<div
							style={{
								position: "absolute",
								left: 373,
								top: topY,
								width: 1,
								height: 700,
								background: rgbs(greyC(236)),
							}}
						/>
						<div
							style={{
								position: "absolute",
								left: 442,
								top: 104,
								height: 20,
								display: "flex",
								alignItems: "center",
								gap: 12,
								font: fontCss(12.5, 400),
								color: rgbs(greyC(105)),
							}}
						>
							<LIcon C={Search} size={14} colour={[150, 151, 150]} stroke={1.8} />
							<span>{ui.urlBar ?? "Search or type a URL"}</span>
						</div>
						{placeholderBox(
							170,
							132,
							194,
							390,
							cfg.slotLabelSidebar ?? "product UI — sidebar: bookmarks & tabs",
						)}
						<div style={{ position: "absolute", inset: 0, opacity: tasksOp }}>
							{placeholderBox(
								547,
								385,
								640,
								244,
								cfg.slotLabel ?? "product UI — new tab with ongoing tasks",
							)}
						</div>
					</div>
				) : null}

				{/* wireframe sidebar */}
				{sideOp > 0 ? (
					<div style={{ position: "absolute", inset: 0, opacity: sideOp }}>
						<div
							style={{
								position: "absolute",
								left: 184,
								top: 266,
								font: fontCss(11, 500),
								color: rgbs(greyC(178)),
							}}
						>
							{cfg.brandLabel ?? "Aside"}
						</div>
						{sideItems.map((it, i) => {
							const y = 302 + i * 36;
							const col = mix([86, 88, 86], shimCol, 0.8 * shim(200, y));
							return (
								<div
									key={it.text}
									style={{
										position: "absolute",
										left: 183,
										top: y - 11,
										height: 22,
										display: "flex",
										alignItems: "center",
										gap: 9,
										font: fontCss(15, 400),
										color: rgbs(col),
									}}
								>
									<LIcon C={it.C ?? sideIcons[i % 3]} size={16} colour={col} stroke={1.7} />
									<span>{it.text}</span>
								</div>
							);
						})}
						<div
							style={{
								position: "absolute",
								left: 184,
								top: 412,
								width: 88,
								height: 6,
								borderRadius: 3,
								background: rgbs(mix(skelBase, skelTint, shim(230, 415))),
							}}
						/>
						{skel.map((len, i) => {
							const y = 452 + i * 30;
							return (
								<React.Fragment key={y}>
									<div
										style={{
											position: "absolute",
											left: 184,
											top: y - 8,
											width: 16,
											height: 16,
											borderRadius: 4,
											background: rgbs(mix(skelBase, skelTint, shim(192, y))),
										}}
									/>
									<div
										style={{
											position: "absolute",
											left: 209,
											top: y - 3.5,
											width: len,
											height: 7,
											borderRadius: 4,
											background: `linear-gradient(90deg, ${rgbs(mix(skelBase, skelTint, shim(220, y)))}, ${rgbs(mix(skelBase, skelTint, shim(209 + len, y)))})`,
										}}
									/>
								</React.Fragment>
							);
						})}
					</div>
				) : null}

				{/* panel border, tracer trail, divider */}
				<svg
					width={W}
					height={H}
					viewBox={`0 0 ${W} ${H}`}
					style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
				>
					<defs>
						<linearGradient
							id="s3p-fadeY"
							gradientUnits="userSpaceOnUse"
							x1={0}
							y1={150}
							x2={0}
							y2={650}
						>
							<stop offset={0} stopColor="#fff" stopOpacity={1} />
							<stop offset={1} stopColor="#fff" stopOpacity={0} />
						</linearGradient>
						<mask
							id="s3p-mask"
							maskUnits="userSpaceOnUse"
							x={-200}
							y={-200}
							width={2400}
							height={1400}
						>
							<rect x={-200} y={-200} width={2400} height={350} fill="#fff" />
							<rect x={-200} y={150} width={2400} height={1100} fill="url(#s3p-fadeY)" />
						</mask>
						<linearGradient
							id="s3p-divG"
							gradientUnits="userSpaceOnUse"
							x1={0}
							y1={topY}
							x2={0}
							y2={topY + 400}
						>
							<stop offset={0} stopColor={rgbs(greyC(229))} stopOpacity={1} />
							<stop offset={0.8} stopColor={rgbs(greyC(240))} stopOpacity={1} />
							<stop offset={1} stopColor={rgbs(greyC(240))} stopOpacity={0} />
						</linearGradient>
					</defs>
					<g mask="url(#s3p-mask)">
						{s > 0 ? (
							<path
								d={pathTo(s)}
								fill="none"
								stroke={rgbs(greyC(227))}
								strokeWidth={2}
								strokeLinecap="round"
							/>
						) : null}
						{s > 0 ? (
							<path
								d={pathTo(s)}
								fill="none"
								stroke="rgb(116,162,180)"
								strokeWidth={2}
								strokeDasharray={`0 ${Math.max(0, s - 190).toFixed(1)} 190 99999`}
								opacity={0.9 * dotOp}
							/>
						) : null}
						{fullOp > 0 ? (
							<path
								d={`M${left} ${startY} L${left} ${topY + r} A${r} ${r} 0 0 1 ${left + r} ${topY} L1500 ${topY}`}
								fill="none"
								stroke={rgbs(greyC(227))}
								strokeWidth={2}
								opacity={fullOp}
							/>
						) : null}
					</g>
					{divLen > 0 ? (
						<rect x={374.5} y={topY} width={1.6} height={divLen} fill="url(#s3p-divG)" />
					) : null}
				</svg>
				{s > 0 && dotOp > 0 ? (
					<div
						style={{
							position: "absolute",
							left: dotX - 8,
							top: dotY - 8,
							width: 16,
							height: 16,
							borderRadius: 8,
							background: "#fff",
							opacity: dotOp,
							boxShadow: "0 3px 7px rgba(10,40,60,0.22)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<div
							style={{ width: 10, height: 10, borderRadius: 5, background: "rgb(15,142,196)" }}
						/>
					</div>
				) : null}

				{/* composer group — authored at final (zoomed) scale */}
				{compOp > 0 ? (
					<div
						style={{
							position: "absolute",
							left: 0,
							top: 0,
							width: W,
							height: H,
							opacity: compOp,
							transformOrigin: "0 0",
							transform: `scale(${(1 / sF).toFixed(6)}) translate(${(-txF).toFixed(3)}px, ${(-tyF).toFixed(3)}px)`,
						}}
					>
						<Composer
							c={cfg.composer ?? {}}
							text={text}
							placeholder={ui.placeholder ?? "Ask AI a task, @ for context"}
							ui={ui}
						/>
					</div>
				) : null}
			</div>
			{cursorEl}
		</div>
	);
}

// ── 4. chat bubble + streamed reply ───────────────────────────────────────

/*
 * sequoia-task-chat — 29.933-31.733.
 *  - hard cut in at 29.933: user bubble (bg [236,238,235], r16, 30px type,
 *    pitch 39) in the right column, already opaque; the group rises 55 -> 0px
 *    (fast first frame, then x0.88/frame) and zooms ~2.5%/s about (659,250).
 *  - the reply streams word by word 30.30-30.60; each word arrives light blue
 *    [172,214,230] and darkens through blue to [38,40,38] in ~0.17s.
 *  - exit 31.367-31.667: slide left on an accelerating curve and fade.
 */
function ChatReply(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const F = cfg.fontSize ?? 30;
	const LH = cfg.pitch ?? 39;
	const dy = table(cfg.rise ?? [[0, 0]], ms);
	const s = cfg.zoom ? table(cfg.zoom, ms) : 1 + ((cfg.zoomPerS ?? 0.025) * Math.max(0, ms)) / 1000;
	const exX = table(cfg.exitX ?? [[0, 0]], ms);
	const op = clamp01(table(cfg.opacity ?? [[0, 1]], ms));
	const o = cfg.origin ?? [659, 250];
	const b = cfg.bubble ?? {};
	// "\n" is an authored line break; it is not a word and takes no time slot.
	const tokens = (cfg.reply ?? "").replace(/\n/g, " \n ").split(" ").filter(Boolean);
	const nWords = tokens.filter((w) => w !== "\n").length;
	const times = cfg.wordAtMs ?? Array.from({ length: nWords }, (_, i) => 367 + i * 25);
	const ramp = cfg.wordColour ?? [
		[0, [172, 214, 230]],
		[33, [104, 160, 186]],
		[67, [70, 112, 128]],
		[100, [52, 70, 76]],
		[167, [38, 40, 38]],
	];
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				opacity: op,
				transformOrigin: `${o[0]}px ${o[1]}px`,
				transform: `translate(${exX.toFixed(2)}px, 0px) scale(${s.toFixed(5)}) translate(0px, ${dy.toFixed(2)}px)`,
			}}
		>
			<div
				style={{
					position: "absolute",
					right: W - (b.right ?? 1150),
					top: b.top ?? 186,
					maxWidth: b.maxW ?? 491,
					boxSizing: "border-box",
					padding: `${b.padY ?? 21}px ${b.padX ?? 23}px`,
					borderRadius: b.radius ?? 16,
					background: rgbs(b.bg ?? [236, 238, 235]),
					font: fontCss(F, cfg.weight ?? 400),
					letterSpacing: cfg.tracking ?? "0",
					lineHeight: `${LH}px`,
					color: rgbs(b.ink ?? [40, 42, 40]),
					whiteSpace: "pre-line",
				}}
			>
				{cfg.userText ?? ""}
			</div>
			<div
				style={{
					position: "absolute",
					left: cfg.replyX ?? 128,
					top: cfg.replyY ?? 351,
					width: cfg.replyW ?? 660,
					font: fontCss(F, cfg.weight ?? 400),
					letterSpacing: cfg.tracking ?? "0",
					lineHeight: `${LH}px`,
					whiteSpace: "pre-line",
				}}
			>
				{(() => {
					let wi = -1;
					return tokens.map((wd, k) => {
						if (wd === "\n") return <br key={`br${k}`} />;
						wi += 1;
						const a = times[wi] ?? times[times.length - 1];
						if (ms < a) return null;
						const next = tokens[k + 1];
						return (
							<span key={`${k}-${wd}`} style={{ color: rgbs(colourTable(ramp, ms - a)) }}>
								{wd}
								{next && next !== "\n" ? " " : ""}
							</span>
						);
					});
				})()}
			</div>
		</div>
	);
}

export const S3_PRESETS = {
	"sequoia-title-stack": {
		note: "Mark + a centred stack of lines on the light ground: the mark drops in from under a clip edge, lines rise in one by one while the block re-centres on the mark, a blue band then an ink wave (tilted fronts in stage space) recolour mark and type together; the exit greys out in place. Measured 21.267-23.333.",
		nativeMs: 2067,
		params: {
			lines: ["array", '["A browser","that gets","complex","work done"]', "the stacked lines"],
			fontSize: ["number", 92, "px (cap height 64 measured)"],
			pitch: ["number", 91, "line pitch px"],
			textX: ["number", 507, "left edge of the lines"],
			centreY: ["number", 340, "vertical centre the block settles on"],
			mark: ["object", "{x,y,size,clipTop,keys:[{at,dy,ease}]}", "mark centre/size and its entry"],
			lineAtMs: ["array", "[133,633,733,833]", "scene ms each line starts rising"],
			blockP: ["array", "[[ms,p]]", "measured re-centring progress 0..1"],
			band: ["object", "{c:[[ms,x]],w,theta,colour}", "blue band front"],
			wave: ["object", "{c:[[ms,x]],theta,stops}", "ink front"],
			exit: ["array", "[[ms,[r,g,b]]]", "solid colour ramp for the exit"],
		},
		render: TitleStack,
	},
	"sequoia-word-staircase": {
		note: "A head word that rises in light-blue -> ink, then climbs to its slot as icon rows pop in displaced sideways and converge into a staircase; clipped at a panel divider; each word exits by accelerating left and cutting. Measured 23.333-25.6.",
		nativeMs: 2267,
		params: {
			head: ["object", '{text:"across", exit:{atMs,a,r,cutMs}}', "the head word"],
			rows: [
				"array",
				"[{icon,text,indent,dx,exit}]",
				"rows; indent from x, dx = entry displacement",
			],
			fontSize: ["number", 96, "px"],
			pitch: ["number", 90, "row pitch"],
			x: ["number", 444, "head left edge"],
			top: ["number", 230, "head line-box top in the final layout"],
			aloneTop: ["number", 361, "head line-box top while alone"],
			headP: ["array", "[[ms,p]]", "climb progress"],
			conv: ["array", "[1,...]", "per-frame convergence curve"],
			clipLeft: ["number", 377, "clip x (sidebar divider)"],
		},
		render: WordStaircase,
	},
	"sequoia-task-panel": {
		note: "The task panel as one world under one camera: a blue dot draws the panel border, the sidebar divider grows, a wireframe sidebar shimmers and hands over to the product new-tab slot; the camera pushes ~1.93x into the drawn composer, an I-beam flies in tilting with its velocity and clicks, the task types, and the composer lifts out. Measured 21.4-29.933.",
		nativeMs: 8533,
		params: {
			tracer: ["object", "{left,top,radius,startY,s:[[ms,px]],dotOpacity}", "dot arc-length table"],
			camera: ["object", "{s:[[ms,scale]],ox,oy,final}", "push-in"],
			sidebar: ["object", "{opacity,shimmer,skeleton}", "wireframe sidebar"],
			composer: ["object", "{x,y,w,h,radius,markX,markY,markSize}", "composer rect at final scale"],
			typed: ["string", "", "the typed task"],
			typeChars: ["array", "[[ms,n]]", "characters visible"],
			cursor: ["object", "{fromMs,toMs,x,y,h,rot,opacity}", "I-beam tables"],
			ui: [
				"object",
				"{placeholder,tab,toSwitch,search,askAi,local,guard,model,effort,urlBar}",
				"UI copy",
			],
			slotLabel: ["string", "product UI — new tab with ongoing tasks", "placeholder label"],
		},
		render: TaskPanel,
	},
	"sequoia-task-chat": {
		note: "Chat beat: the user's bubble (cut in) and the product's reply streamed word by word, each word arriving light blue and darkening; the group rises and slowly zooms, then slides left and fades. Measured 29.933-31.733.",
		nativeMs: 1800,
		params: {
			userText: ["string", "", "bubble copy"],
			reply: ["string", "", "streamed reply"],
			wordAtMs: ["array", "[ms,...]", "scene ms each word appears"],
			rise: ["array", "[[ms,dy]]", "rise table"],
			zoomPerS: ["number", 0.025, "slow zoom rate about origin (when no zoom table)"],
			zoom: ["array|null", null, "[[ms,scale]] zoom table about origin (overrides zoomPerS)"],
			exitX: ["array", "[[ms,dx]]", "exit slide"],
			opacity: ["array", "[[ms,a]]", "group opacity"],
		},
		render: ChatReply,
	},
};
