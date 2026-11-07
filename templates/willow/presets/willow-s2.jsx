/**
 * willow-s2.jsx — presets for willow section 2 (film 12.208s – 25.375s,
 * frames f00293–f00608 of the Strawberry 1.0 reference; measurements in
 * .demo-build/nightly/2026-10-30/willow/sections/s2/notes.md).
 *
 * The section is one long "ask -> agent does the work" demo:
 *   willow-ask-window       the brand's new-tab page in a browser window: camera
 *                           pull-back, cut to a close-up on the composer while the
 *                           prompt types on, zoom back out, click send, pan away.
 *   willow-char-slot        a keyed character-art slot (mascot positions are
 *                           measured bboxes; the art itself is the user's).
 *   willow-bubble           a keyed speech bubble ("I've got you!", "I'm your …").
 *   willow-agent-window     the agent's own browser: new-tab page slides down into
 *                           frame, "+" opens a tab, camera pulls out to the window;
 *                           the third-party page inside is a slot.
 *   willow-outreach-cards   the drawn message card that types itself, the cursor
 *                           clicks Send, then a stack of cards cycling faster and
 *                           faster, then the stack shrinks away.
 *   willow-calendar-window  a browser window with a calendar slot, breathing and
 *                           dropping out, with a fanned stack of profile cards
 *                           that lands in it.
 *
 * Every render is a pure function of t. Camera keys everywhere use the same
 * convention: screen = s * design + (dx, dy), keyed with kf() on the scene clock;
 * the dense keys in the configs are per-frame fits of the reference (see notes).
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import {
	AgentCursor,
	Avatar,
	CARD_SHADOW,
	FONT,
	HandCursor,
	kf,
	live,
	localMs,
	rgbs,
	SERIF,
	W,
} from "./willow-shared.jsx";

// ── shared bits ───────────────────────────────────────────────────────────

/** scene clock; `clockOffsetMs` lets one actor be split into two scenes (for z-order,
 *  which follows startMs) without re-timing its keys. */
const lms = (cfg, t) => localMs(cfg, t) + (cfg.clockOffsetMs ?? 0);

const camAt = (keys, ms) => {
	const k = kf(keys ?? [{ at: 0, s: 1, dx: 0, dy: 0 }], ms);
	return { s: k.s ?? 1, dx: k.dx ?? 0, dy: k.dy ?? 0 };
};
const World = ({ c, children, opacity = 1 }) => (
	<div
		style={{
			position: "absolute",
			left: 0,
			top: 0,
			width: 1280,
			height: 720,
			transformOrigin: "0 0",
			transform: `translate(${c.dx.toFixed(3)}px,${c.dy.toFixed(3)}px) scale(${c.s.toFixed(5)})`,
			opacity,
		}}
	>
		{children}
	</div>
);
const Abs = ({ x, y, w, h, style, children }) => (
	<div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>
		{children}
	</div>
);
/** step a keyed integer (chars typed, card index): value of the last key passed */
const stepKeys = (keys, ms, field = "n") => {
	let v = 0;
	for (const k of keys ?? []) if (ms >= k.at) v = k[field];
	return v;
};
/** press amount 0..1 for [{at, dur}] presses (a quick dip and release) */
const pressAt = (presses, ms) => {
	let p = 0;
	for (const pr of presses ?? []) {
		const u = (ms - pr.at) / (pr.dur ?? 160);
		if (u >= 0 && u <= 1) p = Math.max(p, Math.sin(Math.PI * u));
	}
	return p;
};

/** Neutral glyph tiles — the stand-ins for every third-party / brand tab icon. */
function TabIcon({ kind, size }) {
	const s = size;
	if (kind === "grid") {
		// a generic 3x3 diamond of grey dots — the new-tab icon
		const dots = [];
		for (let i = 0; i < 3; i++)
			for (let j = 0; j < 3; j++) {
				const cx = s / 2 + (i - j) * s * 0.2,
					cy = s / 2 + (i + j - 2) * s * 0.2;
				dots.push(
					<circle
						key={`${i}${j}`}
						cx={cx}
						cy={cy}
						r={s * 0.085}
						fill={(i + j) % 2 ? "#9a9a9a" : "#6f6f6f"}
					/>,
				);
			}
		return (
			<svg width={s} height={s} style={{ flex: "none" }}>
				{dots}
			</svg>
		);
	}
	const col = kind === "li" ? "#1467c2" : kind === "cal" ? "#3d82e8" : "#8a8f98";
	return (
		<div
			style={{
				width: s,
				height: s,
				borderRadius: s * 0.2,
				background: col,
				flex: "none",
				position: "relative",
			}}
		>
			{kind === "cal" ? (
				<div
					style={{
						position: "absolute",
						left: s * 0.2,
						right: s * 0.2,
						top: s * 0.22,
						height: s * 0.14,
						background: "rgba(255,255,255,0.9)",
						borderRadius: 1,
					}}
				/>
			) : null}
			<div
				style={{
					position: "absolute",
					left: s * 0.24,
					top: s * (kind === "cal" ? 0.5 : 0.3),
					width: s * 0.16,
					height: s * (kind === "cal" ? 0.22 : 0.42),
					background: "#fff",
					borderRadius: 1,
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: s * 0.5,
					top: s * (kind === "cal" ? 0.5 : 0.42),
					width: s * 0.26,
					height: s * (kind === "cal" ? 0.22 : 0.3),
					background: "#fff",
					borderRadius: 1,
				}}
			/>
		</div>
	);
}

/**
 * Generic browser window (white rounded frame, traffic lights, tabs, "+").
 * Metrics are measured on the 960px-wide ask window (f310) and scale with
 * u = w/960: radius 20u, title bar 61u, content inset 10u, lights at
 * 30/56/82u (r 7.5u) 36u below the top, first tab 125u in, tab 36u tall,
 * active tab >=166u wide, "+" 25u after the last tab. Checked against the
 * agent window (932px, f447) and the calendar window (816px, f566).
 */
function BrowserWindow({
	x,
	y,
	w,
	h,
	tabs = [],
	face = [248, 247, 243],
	inner = [254, 255, 253],
	shadow,
	children,
	innerStyle,
	tabX = 125,
	tabMinW = 0,
}) {
	const u = w / 960;
	const titleH = 61 * u,
		inset = 10 * u;
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: w,
				height: h,
				borderRadius: 20 * u,
				background: rgbs(face),
				boxShadow:
					shadow ??
					`0 ${18 * u}px ${56 * u}px rgba(60,48,36,0.11), 0 ${2 * u}px ${8 * u}px rgba(60,48,36,0.05)`,
			}}
		>
			{[
				[234, 72, 93],
				[240, 200, 20],
				[61, 205, 91],
			].map((c, i) => (
				<div
					key={i}
					style={{
						position: "absolute",
						left: (30 + 26 * i - 7.5) * u,
						top: (36 - 7.5) * u,
						width: 15 * u,
						height: 15 * u,
						borderRadius: "50%",
						background: rgbs(c),
					}}
				/>
			))}
			<div
				style={{
					position: "absolute",
					left: tabX * u,
					top: 18 * u,
					height: 36 * u,
					display: "flex",
					alignItems: "center",
					gap: 6 * u,
				}}
			>
				{tabs.map((tb, i) => (
					<div
						key={i}
						style={{
							height: 36 * u,
							minWidth: tb.active ? tabMinW * u : undefined,
							boxSizing: "border-box",
							padding: `0 ${(tb.active ? 50 : 22) * u}px 0 ${14 * u}px`,
							display: "flex",
							alignItems: "center",
							gap: 8 * u,
							borderRadius: 8 * u,
							background: tb.active ? "#fff" : "transparent",
							boxShadow: tb.active ? `0 ${2 * u}px ${6 * u}px rgba(40,50,70,0.07)` : undefined,
							opacity: tb.opacity ?? 1,
						}}
					>
						<TabIcon kind={tb.icon ?? "grid"} size={17 * u} />
						<span
							style={{ font: `400 ${15 * u}px ${FONT}`, color: "#1b1b1b", whiteSpace: "nowrap" }}
						>
							{tb.label}
						</span>
					</div>
				))}
				<svg width={22 * u} height={22 * u} viewBox="0 0 22 22" style={{ marginLeft: 12 * u }}>
					<path d="M11 3.5v15M3.5 11h15" stroke="#111" strokeWidth="2" strokeLinecap="round" />
				</svg>
			</div>
			<div
				style={{
					position: "absolute",
					left: inset,
					top: titleH,
					right: inset,
					bottom: inset,
					background: rgbs(inner),
					borderRadius: 6 * u,
					overflow: "hidden",
					...innerStyle,
				}}
			>
				{children}
			</div>
		</div>
	);
}

/** A dashed placeholder interior — only for genuinely empty footage areas. */
function SlotFace({
	label,
	face = [246, 248, 250],
	ink = [150, 160, 172],
	fontPx = 15,
	radius = 10,
	dashed = true,
}) {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: rgbs(face),
				borderRadius: radius,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					position: "absolute",
					inset: 10,
					borderRadius: Math.max(0, radius - 4),
					border: dashed ? `1.5px dashed ${rgbs(ink, 0.55)}` : undefined,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					textAlign: "center",
					font: `500 ${fontPx}px ${FONT}`,
					color: rgbs(ink),
					letterSpacing: "0.01em",
					padding: 8,
				}}
			>
				{label}
			</div>
		</div>
	);
}

/** Send-arrow circle */
const SendCircle = ({ x, y, r, colour }) => (
	<div
		style={{
			position: "absolute",
			left: x - r,
			top: y - r,
			width: 2 * r,
			height: 2 * r,
			borderRadius: "50%",
			background: rgbs(colour),
		}}
	>
		<svg
			width={2 * r}
			height={2 * r}
			viewBox="0 0 46 46"
			style={{ position: "absolute", left: 0, top: 0 }}
		>
			<path
				d="M23 33V13M15 21l8-8 8 8"
				stroke="#fff"
				strokeWidth="2.6"
				fill="none"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	</div>
);
const Plus = ({ x, y, size, colour = "#111", sw = 2 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 22 22"
		style={{ position: "absolute", left: x - size / 2, top: y - size / 2 }}
	>
		<path d="M11 2v18M2 11h18" stroke={colour} strokeWidth={sw} strokeLinecap="round" />
	</svg>
);

/** Brand mark placeholder: a small cluster of rounded squares (swap for the real mark). */
function MarkGlyph({ size, colour = [222, 74, 56], accent = [214, 196, 48] }) {
	const s = size,
		q = s * 0.2;
	const cells = [
		[0, -1],
		[-1, 0],
		[1, 0],
		[0, 1],
		[0, 0],
		[-1, 1],
		[1, 1],
		[0, 2],
	];
	return (
		<svg
			width={s}
			height={s * 1.2}
			viewBox={`${-s / 2} ${-s * 0.55} ${s} ${s * 1.2}`}
			style={{ flex: "none", overflow: "visible" }}
		>
			<rect x={-q / 2} y={-s * 0.55} width={q} height={q} rx={q * 0.2} fill={rgbs(accent)} />
			{cells.map(([i, j], k) => (
				<circle
					key={k}
					cx={i * q * 1.15}
					cy={-s * 0.1 + j * q * 1.15}
					r={q * 0.5}
					fill={rgbs(colour)}
				/>
			))}
		</svg>
	);
}

/**
 * The human pointing hand, anchored at its visual CENTRE with an explicit
 * visible height (the shared HandCursor scales by size twice, so it is hard to
 * key against measured hand bboxes). Same path and outline as HandCursor.
 */
function Hand({ x, y, h, press = 0, opacity = 1 }) {
	const k = (h / 29.5) * (1 - 0.08 * clamp01(press));
	return (
		<svg
			width={38 * k}
			height={38 * k}
			viewBox="0 0 38 38"
			style={{
				position: "absolute",
				left: x - 14 * k,
				top: y - 17 * k,
				opacity,
				overflow: "visible",
				filter: `drop-shadow(0px ${(1.2 * k).toFixed(2)}px ${(1.2 * k).toFixed(2)}px rgba(0,0,0,0.25))`,
			}}
		>
			<path
				d="M11 2.5c1.45 0 2.45 1.05 2.45 2.45V12.3l.35-.1c1.3-.38 2.55.3 2.9 1.45l.1.3c1.2-.38 2.5.25 2.9 1.35l.1.3c1.2-.3 2.4.4 2.7 1.5.6 2.2.9 4.35.6 6.45-.32 2.3-1.3 4.2-2.6 5.9V31.6H10.6v-2.35c-1.6-1.6-3.6-4-5.4-6.7-.9-1.3-.6-2.95.6-3.75 1.1-.7 2.5-.4 3.3.6l1.5 1.9V4.95C10.6 3.55 9.6 2.5 11 2.5Z"
				fill="#fff"
				stroke="#111"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path
				d="M13.5 12.4v6.2M16.9 14.1v5M20 15.7v4.1"
				stroke="#111"
				strokeWidth="1.2"
				strokeLinecap="round"
			/>
		</svg>
	);
}

// ── 1. ask window ─────────────────────────────────────────────────────────

/*
 * Design space = the f310 framing (camera s=1): window 158..1118 x 69..651,
 * face [248,247,243], content [254,255,253] from 169..1108 x 130..640.
 * Pill 463..802 x 232..296 [244,241,236]; "Ask" cap 342..369 (Georgia ~39px),
 * wordmark 475..805 centred on x=640, cap centre y≈356; composer 373..903 x
 * 409..532, r 32, border [229,230,232]; text at x 399, 21px; "+" (406,494);
 * send circle (862,495) r 23 [102,152,179].
 */
function AskWindow(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = lms(cfg, t);
	const c = camAt(cfg.cam, ms);
	const L = {
		win: [158, 69, 960, 582],
		pill: [463, 232, 339, 64],
		comp: [373, 409, 530, 123],
		...(cfg.layout ?? {}),
	};
	const n = stepKeys(cfg.typeKeys, ms);
	const prompt = (cfg.prompt ?? "").slice(0, n);
	const showPh = ms < (cfg.placeholderOffAt ?? 0) && n === 0;
	const caretOn = (cfg.caret ?? []).some(([a, b]) => ms >= a && ms < b);
	const sendP = pressAt(cfg.sendPress, ms);
	const sendCol = [102, 152, 179].map((v, i) => lerp(v, [70, 112, 140][i], sendP));
	const cur = kf(cfg.cursor ?? [], ms);
	const curP = pressAt(cfg.cursorPress, ms);
	const [cx, cy, cw, ch] = L.comp;
	const [px0, py, pw0, ph] = L.pill;
	const pw = kf(cfg.pillW ?? [{ at: 0, w: pw0 }], ms).w ?? pw0; // the row closes up when a companion leaves
	const px = px0 + (pw0 - pw) / 2;
	return (
		<World c={c}>
			{ms < (cfg.windowUntil ?? 1e9) ? (
				<BrowserWindow
					x={L.win[0]}
					y={L.win[1]}
					w={L.win[2]}
					h={L.win[3]}
					shadow="0 26px 70px rgba(70,50,30,0.15), 0 3px 10px rgba(70,50,30,0.05)"
					tabMinW={166}
					tabs={[{ label: cfg.tabLabel ?? "New Tab", icon: "grid", active: true }]}
				/>
			) : null}
			{/* companion row: character-art slot inside a drawn pill */}
			<Abs
				x={px}
				y={py}
				w={pw}
				h={ph}
				style={{ borderRadius: ph / 2, background: rgbs([244, 241, 236]) }}
			>
				<div
					style={{
						position: "absolute",
						left: 12,
						top: 7,
						right: 48,
						bottom: 7,
						borderRadius: 25,
						border: `1px dashed ${rgbs([190, 180, 170])}`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						font: `500 10px ${FONT}`,
						color: rgbs([150, 140, 130]),
						letterSpacing: "0.02em",
					}}
				>
					{cfg.pillLabel ?? "character art — companion row"}
				</div>
				<Plus x={pw - 26} y={ph / 2} size={20} colour={rgbs([208, 203, 198])} sw={2.2} />
			</Abs>
			{/* "Ask [mark] Brand" serif lockup, centred on the window */}
			<div
				style={{
					position: "absolute",
					left: 0,
					width: 1280,
					top: 326,
					height: 60,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 12,
				}}
			>
				<span style={{ font: `400 41px ${SERIF}`, color: "#222", letterSpacing: "-0.01em" }}>
					{cfg.ask ?? "Ask"}
				</span>
				<MarkGlyph size={60} />
				<span style={{ font: `400 41px ${SERIF}`, color: "#222", letterSpacing: "-0.01em" }}>
					{cfg.brand ?? "Strawberry"}
				</span>
			</div>
			{/* composer card */}
			<Abs
				x={cx}
				y={cy}
				w={cw}
				h={ch}
				style={{
					borderRadius: 32,
					background: "#fff",
					border: `1.5px solid ${rgbs([228, 229, 232])}`,
					boxSizing: "border-box",
					boxShadow: "0 10px 22px rgba(30,40,60,0.08), 0 2px 5px rgba(30,40,60,0.04)",
				}}
			>
				<div
					style={{
						position: "absolute",
						left: 24,
						top: 12,
						right: 60,
						font: `400 ${cfg.promptPx ?? 24}px ${FONT}`,
						whiteSpace: "nowrap",
						letterSpacing: "-0.015em",
					}}
				>
					{showPh ? (
						<span style={{ color: rgbs([168, 168, 168]) }}>
							{cfg.placeholder ?? "Ask Strawberry..."}
						</span>
					) : (
						<span style={{ color: "#141414" }}>
							{prompt}
							{caretOn ? (
								<span
									style={{
										display: "inline-block",
										width: 2,
										height: 22,
										marginLeft: 1,
										background: "#141414",
										verticalAlign: "-4px",
									}}
								/>
							) : null}
						</span>
					)}
				</div>
				<Plus x={33} y={85} size={22} />
				<SendCircle x={489} y={86} r={23} colour={sendCol} />
			</Abs>
			{cur.x != null && (cur.opacity ?? 1) > 0 ? (
				<Hand
					x={cur.x}
					y={cur.y}
					h={(cfg.handH ?? 52) * Math.pow(c.s, -0.3)}
					press={curP}
					opacity={cur.opacity ?? 1}
				/>
			) : null}
		</World>
	);
}

// ── 2. character slot ─────────────────────────────────────────────────────

/** keys: [{at, x, y, w, h, rot, opacity}] — (x,y) is the bbox CENTRE in screen px. */
function CharSlot(cfg, t) {
	if (!live(cfg, t)) return null;
	const k = kf(cfg.keys, lms(cfg, t));
	if ((k.opacity ?? 1) <= 0.001 || !k.w) return null;
	const small = Math.min(k.w, k.h) < 90;
	return (
		<div
			style={{
				position: "absolute",
				left: k.x - k.w / 2,
				top: k.y - k.h / 2,
				width: k.w,
				height: k.h,
				transform: `rotate(${(k.rot ?? 0).toFixed(2)}deg)`,
				opacity: k.opacity ?? 1,
				borderRadius: Math.min(k.w, k.h) * 0.28,
				background: rgbs(cfg.face ?? [228, 236, 246], cfg.faceAlpha ?? 0.9),
				border: `1.5px dashed ${rgbs(cfg.ink ?? [120, 145, 180], 0.6)}`,
				boxSizing: "border-box",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				textAlign: "center",
				font: `600 ${small ? 9 : 13}px ${FONT}`,
				color: rgbs(cfg.ink ?? [110, 135, 170]),
				padding: 6,
				overflow: "hidden",
			}}
		>
			{small ? "art" : (cfg.label ?? "character art")}
		</div>
	);
}

// ── 3. speech bubble ──────────────────────────────────────────────────────

/**
 * keys: [{at, x, y, rot, scale, opacity}] — (x,y) is the body CENTRE.
 * spans: [{text, colour}] laid out inline (auto width: padX each side);
 * tail: "bl" (bottom-left, pointing down-left) or "bl-down".
 */
function Bubble(cfg, t) {
	if (!live(cfg, t)) return null;
	const k = kf(cfg.keys, lms(cfg, t));
	if ((k.opacity ?? 1) <= 0.001) return null;
	const fs = cfg.fontPx ?? 42,
		h = cfg.h ?? 150,
		padX = cfg.padX ?? 42,
		r = cfg.radius ?? 34;
	const fill = rgbs(cfg.fill ?? [231, 241, 243]);
	const tail = cfg.tail ?? { x: 0.07, w: 34, h: 26, dir: "left" };
	const icon = cfg.icon ? (
		<svg
			width={fs * 0.82}
			height={fs * 0.82}
			viewBox="0 0 24 24"
			style={{ marginLeft: fs * 0.24, flex: "none" }}
		>
			<circle cx="9" cy="8" r="4.2" fill={rgbs(cfg.icon.colour ?? [120, 170, 225])} />
			<path
				d="M1.8 20.5c0-4.2 3.2-7 7.2-7s7.2 2.8 7.2 7z"
				fill={rgbs(cfg.icon.colour ?? [120, 170, 225])}
			/>
			<circle cx="16.5" cy="9" r="3.4" fill={rgbs(cfg.icon.colour ?? [120, 170, 225])} />
			<path
				d="M17.5 13.6c2.9.3 5 2.6 5 6.1h-4.4c0-2.3-.6-4.4-2.2-5.8z"
				fill={rgbs(cfg.icon.colour ?? [120, 170, 225])}
			/>
		</svg>
	) : null;
	return (
		<div
			style={{
				position: "absolute",
				left: k.x,
				top: k.y,
				width: 0,
				height: 0,
				opacity: k.opacity ?? 1,
				transform: `rotate(${(k.rot ?? 0).toFixed(2)}deg) scale(${(k.scale ?? 1).toFixed(4)})`,
			}}
		>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					transform: "translate(-50%,-50%)",
					height: h,
					boxSizing: "border-box",
					padding: `0 ${padX}px`,
					borderRadius: r,
					background: fill,
					display: "flex",
					alignItems: "center",
					whiteSpace: "nowrap",
					font: `${cfg.weight ?? 500} ${fs}px ${FONT}`,
					letterSpacing: cfg.tracking ?? "-0.02em",
				}}
			>
				{(cfg.spans ?? [{ text: cfg.text ?? "" }]).map((s, i) => (
					<span key={i} style={{ color: rgbs(s.colour ?? [24, 26, 28]), whiteSpace: "pre" }}>
						{s.text}
					</span>
				))}
				{icon}
				<svg
					width={tail.w}
					height={tail.h}
					viewBox="0 0 34 26"
					style={{
						position: "absolute",
						left: `calc(${(tail.x * 100).toFixed(2)}% + ${tail.dx ?? 0}px)`,
						bottom: -tail.h + 1,
					}}
				>
					<path d={tail.dir === "right" ? "M0 0H34L22 26Z" : "M0 0H34L10 26Z"} fill={fill} />
				</svg>
			</div>
		</div>
	);
}

// ── 4. agent browser ──────────────────────────────────────────────────────

/*
 * Design space = the f447 framing (camera s=1): window 165..1097 x 86..649
 * (932x563), chrome [246,250,251], content [253,255,252]. Phase A (before
 * `pageCutAt`): the brand's new-tab page drawn faint — companion row, a
 * heading, a composer with a prompt (it reads as a ghost under the camera
 * move). Phase B: the third-party page is a slot (product footage).
 */
function AgentWindow(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = lms(cfg, t);
	const c = camAt(cfg.cam, ms);
	const [wx, wy, ww, wh] = cfg.win ?? [165, 86, 932, 563];
	const u = ww / 960;
	const pageB = ms >= (cfg.pageCutAt ?? 1e9);
	const tabs = pageB
		? [
				{ label: cfg.tab1 ?? "New Tab", icon: "grid" },
				{ label: cfg.tab2 ?? "Connections", icon: "li", active: true },
			]
		: [{ label: cfg.tab1 ?? "New Tab", icon: "grid", active: true }];
	const ghost = cfg.ghostAlpha ?? 0.42;
	const cur = kf(cfg.cursor ?? [], ms);
	const curP = pressAt(cfg.cursorPress, ms);
	const sx = c.s * (cur.x ?? 0) + c.dx,
		sy = c.s * (cur.y ?? 0) + c.dy;
	return (
		<>
			<World c={c}>
				<BrowserWindow
					x={wx}
					y={wy}
					w={ww}
					h={wh}
					tabs={tabs}
					tabX={113}
					face={[246, 250, 251]}
					inner={[253, 255, 252]}
					shadow={`0 ${16 * u}px ${54 * u}px rgba(40,70,90,0.10), 0 ${2 * u}px ${6 * u}px rgba(40,70,90,0.05)`}
				>
					{pageB ? (
						<SlotFace
							label={cfg.slotLabel ?? "product footage — people search results"}
							face={[253, 255, 252]}
							radius={6}
						/>
					) : (
						<div style={{ position: "absolute", inset: 0, opacity: ghost }}>
							{/* companion row (character-art slot) */}
							<div
								style={{
									position: "absolute",
									left: (ww - 20 * u) / 2 - 170 * u,
									top: 60 * u,
									width: 340 * u,
									height: 62 * u,
									borderRadius: 31 * u,
									background: rgbs([238, 238, 240]),
								}}
							>
								<div
									style={{
										position: "absolute",
										inset: 8 * u,
										borderRadius: 24 * u,
										border: `1px dashed ${rgbs([180, 180, 190])}`,
									}}
								/>
							</div>
							<div
								style={{
									position: "absolute",
									left: 0,
									right: 0,
									top: 145 * u,
									textAlign: "center",
									font: `700 ${32 * u}px ${FONT}`,
									color: rgbs([150, 150, 150]),
									letterSpacing: "-0.02em",
									whiteSpace: "nowrap",
								}}
							>
								{cfg.heading ?? "What are we working on today?"}
							</div>
							<div
								style={{
									position: "absolute",
									left: 212 * u,
									right: 212 * u,
									top: 280 * u,
									height: 112 * u,
									borderRadius: 30 * u,
									background: "#fff",
									border: `1.5px solid ${rgbs([226, 228, 232])}`,
									boxShadow: "0 8px 20px rgba(30,40,60,0.06)",
								}}
							>
								<div
									style={{
										position: "absolute",
										left: 24 * u,
										top: 18 * u,
										font: `400 ${24 * u}px ${FONT}`,
										color: rgbs([60, 60, 60]),
										whiteSpace: "nowrap",
									}}
								>
									{cfg.ghostPrompt ?? "Book me 100 calls"}
								</div>
								<Plus x={34 * u} y={80 * u} size={20 * u} colour="#555" />
							</div>
						</div>
					)}
				</BrowserWindow>
			</World>
			{cur.x != null ? (
				<AgentCursor
					x={sx}
					y={sy}
					size={(cfg.cursorSize ?? 48) * Math.pow(c.s, 0.18) * (1 - 0.1 * curP)}
					colour={cfg.cursorColour ?? [76, 165, 206]}
					rot={cur.rot ?? 0}
					opacity={cur.opacity ?? 1}
				/>
			) : null}
		</>
	);
}

// ── 5. outreach cards ─────────────────────────────────────────────────────

/*
 * Message card at rest (f498): 309..967 x 106..613 (658x507), r 20, white;
 * avatar d122 at (402,198); name bold 27px baseline 297 + shield; title 17px
 * baseline 325; message box 341..937 x 356..520 r 20 [241,247,248], text 20px
 * [85,85,85] line 24.5px from x 365; icon row y 563 (368/422/476/530); Send
 * pill 791..937 x 541..587 [20,106,189]. The card grows from 388px tall to
 * 507px (expo, centred on y≈360) while the message box opens (f454-f477).
 */
const CARD_W = 658,
	CARD_H = 507;
function ShieldIcon({ size, colour = "#222" }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			style={{ flex: "none", marginLeft: size * 0.3 }}
		>
			<path
				d="M12 2.8 4.5 5.6v5.9c0 4.6 3.1 8.4 7.5 9.7 4.4-1.3 7.5-5.1 7.5-9.7V5.6z"
				fill="none"
				stroke={colour}
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path
				d="m8.4 12 2.5 2.5 4.8-5"
				fill="none"
				stroke={colour}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
const ToolIcons = ({ y, x0 = 59, gap = 54 }) => (
	<div style={{ position: "absolute", left: x0 - 12, top: y - 12, display: "flex", gap: gap - 24 }}>
		{["img", "link", "gif", "emo"].map((k) => (
			<svg key={k} width="24" height="24" viewBox="0 0 24 24">
				{k === "img" ? (
					<>
						<rect x="2.5" y="4.5" width="19" height="15" rx="2.5" fill="#333" />
						<path d="m5 17 5-5 3 3 2-2 4 4z" fill="#fff" />
						<circle cx="15.5" cy="9" r="1.8" fill="#fff" />
					</>
				) : null}
				{k === "link" ? (
					<path
						d="M9.5 14.5 14.5 9.5M8 11 5.6 13.4a3.6 3.6 0 0 0 5 5L13 16M16 13l2.4-2.4a3.6 3.6 0 0 0-5-5L11 8"
						fill="none"
						stroke="#333"
						strokeWidth="2.1"
						strokeLinecap="round"
					/>
				) : null}
				{k === "gif" ? (
					<text
						x="12"
						y="16.5"
						textAnchor="middle"
						fontFamily={FONT}
						fontWeight="800"
						fontSize="11"
						fill="#333"
					>
						GIF
					</text>
				) : null}
				{k === "emo" ? (
					<>
						<circle cx="12" cy="12" r="9" fill="none" stroke="#333" strokeWidth="2" />
						<circle cx="9" cy="10" r="1.3" fill="#333" />
						<circle cx="15" cy="10" r="1.3" fill="#333" />
						<path
							d="M8 14.2c1.1 1.6 2.4 2.3 4 2.3s2.9-.7 4-2.3"
							fill="none"
							stroke="#333"
							strokeWidth="1.8"
							strokeLinecap="round"
						/>
					</>
				) : null}
			</svg>
		))}
	</div>
);

function MessageCard({
	p,
	h = CARD_H,
	typed = null,
	msgFull,
	placeholder,
	sendP = 0,
	blueTail = 8,
	caret = false,
}) {
	const grow = CARD_H - h; // message box gives up exactly what the card lacks
	const boxH = 164 - grow;
	const text = typed == null ? null : msgFull.slice(0, typed);
	const dark = text == null ? "" : text.slice(0, Math.max(0, text.length - blueTail));
	const blue = text == null ? "" : text.slice(Math.max(0, text.length - blueTail));
	const sendCol = [20, 106, 189].map((v, i) => lerp(v, [12, 78, 150][i], sendP));
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: CARD_W,
				height: h,
				borderRadius: 20,
				background: rgbs([254, 255, 253]),
				boxShadow: "0 14px 36px rgba(40,70,90,0.10), 0 2px 6px rgba(40,70,90,0.05)",
				overflow: "hidden",
			}}
		>
			<Avatar x={93} y={92} d={122} c1={p.c1} c2={p.c2} initials={p.initials} />
			<div
				style={{
					position: "absolute",
					left: 32,
					top: 162,
					display: "flex",
					alignItems: "center",
					font: `700 27px ${FONT}`,
					color: "#151515",
					letterSpacing: "-0.01em",
					whiteSpace: "nowrap",
				}}
			>
				{p.name}
				<ShieldIcon size={22} />
			</div>
			<div
				style={{
					position: "absolute",
					left: 32,
					top: 203,
					font: `400 17px ${FONT}`,
					color: "#222",
					whiteSpace: "nowrap",
				}}
			>
				{p.title}
			</div>
			<div
				style={{
					position: "absolute",
					left: 32,
					top: 250,
					width: 596,
					height: boxH,
					borderRadius: 20,
					background: rgbs([241, 247, 248]),
				}}
			>
				<div
					style={{
						position: "absolute",
						left: 24,
						top: 18,
						right: 24,
						font: `400 22px ${FONT}`,
						lineHeight: "24.5px",
						color: rgbs([88, 90, 92]),
					}}
				>
					{text == null ? (
						<span style={{ color: rgbs([150, 155, 158]), fontSize: 16 }}>{placeholder}</span>
					) : (
						<>
							{dark}
							<span style={{ color: rgbs([86, 160, 210]) }}>{blue}</span>
							{caret ? (
								<span
									style={{
										display: "inline-block",
										width: 1.6,
										height: 21,
										background: rgbs([60, 150, 210]),
										verticalAlign: "-4px",
									}}
								/>
							) : null}
						</>
					)}
				</div>
			</div>
			<ToolIcons y={h - 50} />
			<div
				style={{
					position: "absolute",
					right: 30,
					bottom: 26,
					height: 46,
					minWidth: 146,
					padding: "0 24px",
					boxSizing: "border-box",
					borderRadius: 23,
					background: rgbs(sendCol),
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					font: `700 19px ${FONT}`,
					color: "#fff",
				}}
			>
				{p.send ?? "Send"}
			</div>
		</div>
	);
}

function OutreachCards(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = lms(cfg, t);
	const people = cfg.people ?? [];
	const msgFor = (p) => (cfg.message ?? "").replace("{first}", p.first ?? p.name.split(" ")[0]);
	const idx = stepKeys(cfg.cardKeys, ms, "i"); // index of the top card
	const h = kf(cfg.heightKeys ?? [{ at: 0, h: CARD_H }], ms).h ?? CARD_H;
	const typed =
		idx === 0 && ms >= (cfg.typeFrom ?? 0) ? Math.floor(kf(cfg.typeKeys ?? [], ms).n ?? 0) : null;
	const st = camAt(cfg.stack, ms); // whole-stack transform (the shrink away)
	const fan = kf(cfg.fanKeys ?? [{ at: 0, f: 0 }], ms).f ?? 0;
	const cur = kf(cfg.cursor ?? [], ms);
	const curP = pressAt(cfg.cursorPress, ms);
	const sendP = pressAt(cfg.sendPress, ms);
	const cx = cfg.cx ?? 638,
		cy = cfg.cy ?? 360;
	const cards = [];
	const lo = Math.max(0, idx - (cfg.depth ?? 4));
	for (let i = lo; i <= idx; i++) {
		const p = people[i];
		if (!p) continue;
		const ck = (cfg.cardKeys ?? [])[i] ?? { at: 0 };
		const top = i === idx;
		const age = ms - ck.at;
		// a new card lands with a small rotation settle (measured ~1° over 3 frames)
		const settle = top ? Math.exp(-Math.max(0, age) / 60) : 0;
		const rot = (ck.rot ?? 0) + (ck.rotIn ?? 0) * settle;
		const depth = idx - i;
		const fanRot = fan * (depth % 2 ? -1 : 1) * (4 + depth * 3);
		const hh = top ? h : CARD_H;
		cards.push(
			<div
				key={i}
				style={{
					position: "absolute",
					left: cx - CARD_W / 2 + (ck.dx ?? 0) + fan * (depth % 2 ? -1 : 1) * depth * 10,
					top: cy - hh / 2 + (ck.dy ?? 0),
					width: CARD_W,
					height: hh,
					transform: `rotate(${(rot + fanRot).toFixed(2)}deg)`,
					transformOrigin: "50% 50%",
				}}
			>
				<MessageCard
					p={p}
					h={hh}
					typed={top && idx === 0 ? typed : msgFor(p).length}
					msgFull={msgFor(p)}
					placeholder={cfg.placeholder ?? "Write a message..."}
					sendP={top ? sendP : 0}
					blueTail={top && idx === 0 && typed != null && typed < msgFor(p).length ? 8 : 0}
					caret={top && idx === 0 && typed != null && ms < (cfg.caretOffAt ?? 1e9)}
				/>
			</div>,
		);
	}
	const sx = st.s * (cur.x ?? 0) + st.dx,
		sy = st.s * (cur.y ?? 0) + st.dy;
	return (
		<>
			<World c={st}>{cards}</World>
			{cur.x != null ? (
				<AgentCursor
					x={sx}
					y={sy}
					size={(cfg.cursorSize ?? 48) * (1 - 0.1 * curP)}
					colour={cfg.cursorColour ?? [76, 165, 206]}
					rot={cur.rot ?? 0}
					opacity={cur.opacity ?? 1}
				/>
			) : null}
		</>
	);
}

// ── 6. calendar window + profile card fan ────────────────────────────────

/*
 * Design space = the f566 framing: window 230..1046 x 116..604 (816x488),
 * keyed as a whole by `win` keys {at, cx, cy, s, opacity} (centre + scale,
 * measured per 3 frames f538-f599). Profile cards (base 302x258, r 22,
 * avatar d80, LI badge, name bold 24px, title 21px) fan behind the top card.
 */
function ProfileCard({ p, w = 302, h = 258, badge = true }) {
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: w,
				height: h,
				borderRadius: 22,
				background: rgbs([254, 255, 253]),
				boxShadow: "0 10px 28px rgba(40,70,90,0.10), 0 1px 4px rgba(40,70,90,0.06)",
			}}
		>
			{p ? (
				<>
					<Avatar x={w / 2} y={74} d={82} c1={p.c1} c2={p.c2} initials={p.initials} />
					{badge ? (
						<div
							style={{
								position: "absolute",
								left: w / 2 + 22,
								top: 100,
								width: 18,
								height: 18,
								borderRadius: 4,
								background: "#1467c2",
								border: "2px solid #fff",
							}}
						/>
					) : null}
					<div
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							top: 140,
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							font: `700 24px ${FONT}`,
							color: "#151515",
							letterSpacing: "-0.01em",
							whiteSpace: "nowrap",
						}}
					>
						{p.name}
						<ShieldIcon size={19} />
					</div>
					<div
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							top: 172,
							textAlign: "center",
							font: `400 21px ${FONT}`,
							color: "#222",
							whiteSpace: "nowrap",
						}}
					>
						{p.title}
					</div>
				</>
			) : null}
		</div>
	);
}

function CalendarWindow(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = lms(cfg, t);
	const wk = kf(cfg.win ?? [{ at: 0, cx: 638, cy: 360, s: 1 }], ms);
	const [ww, wh] = cfg.size ?? [816, 488];
	const s = wk.s ?? 1;
	const st = kf(cfg.stack ?? [], ms);
	const cur = kf(cfg.cursor ?? [], ms);
	const curP = pressAt(cfg.cursorPress, ms);
	const u = ww / 960;
	const fan = cfg.fan ?? [-18, -13, -7, 7, 13, 18];
	return (
		<>
			<div
				style={{
					position: "absolute",
					left: wk.cx - ww / 2,
					top: wk.cy - wh / 2,
					width: ww,
					height: wh,
					transform: `scale(${s.toFixed(5)})`,
					transformOrigin: "50% 50%",
					opacity: wk.opacity ?? 1,
				}}
			>
				<BrowserWindow
					x={0}
					y={0}
					w={ww}
					h={wh}
					tabX={113}
					face={[246, 250, 251]}
					inner={[253, 255, 252]}
					shadow={`0 ${16 * u}px ${54 * u}px rgba(40,70,90,0.10), 0 ${2 * u}px ${6 * u}px rgba(40,70,90,0.05)`}
					tabs={[
						{ label: cfg.tab1 ?? "New Tab", icon: "grid" },
						{ label: cfg.tab2 ?? "Connections", icon: "li" },
						{ label: cfg.tab3 ?? "Calendar", icon: "cal", active: true },
					]}
				>
					<SlotFace
						label={cfg.slotLabel ?? "product footage — calendar filling with booked calls"}
						face={[253, 255, 252]}
						radius={6}
					/>
				</BrowserWindow>
			</div>
			{st.x != null && (st.opacity ?? 1) > 0.001 ? (
				<div
					style={{
						position: "absolute",
						left: st.x - 151,
						top: st.y - 129,
						width: 302,
						height: 258,
						opacity: st.opacity ?? 1,
						transform: `rotate(${(st.rot ?? 0).toFixed(2)}deg) scale(${(st.s ?? 1).toFixed(4)})`,
						transformOrigin: "50% 50%",
					}}
				>
					{fan.map((r, i) => (
						<div
							key={i}
							style={{
								position: "absolute",
								left: 0,
								top: 0,
								width: 302,
								height: 258,
								transformOrigin: "50% 100%",
								transform: `translateX(${(r * 2.7 * (st.fan ?? 1)).toFixed(1)}px) rotate(${(r * (st.fan ?? 1)).toFixed(2)}deg)`,
							}}
						>
							<ProfileCard p={null} />
						</div>
					))}
					<ProfileCard p={cfg.person} />
				</div>
			) : null}
			{cur.x != null ? (
				<AgentCursor
					x={cur.x}
					y={cur.y}
					size={(cfg.cursorSize ?? 46) * (1 - 0.1 * curP)}
					colour={cfg.cursorColour ?? [76, 165, 206]}
					rot={cur.rot ?? 0}
					opacity={cur.opacity ?? 1}
				/>
			) : null}
		</>
	);
}

// ── registry ─────────────────────────────────────────────────────────────

export const S2_PRESETS = {
	"willow-ask-window": {
		note: "The brand's 'Ask' new-tab page inside a browser window, with ONE camera (screen = s*design + d) keyed densely from per-frame fits: pull-back from 1.76x about (638,165) settling in ~0.6s, a cut to a 3.06x close-up on the composer with a decelerating ~200px pan, a 0.5s zoom-out to 1.62x (slow start, peak at 14.35s), hold, then an accelerating pan up (ease-in ~p2.6). Prompt types on via typeKeys (chars shown), placeholder until placeholderOffAt, hand cursor keyed in design px with presses; send circle darkens on sendPress. The companion row is a character-art slot in a drawn pill.",
		nativeMs: 3600,
		params: {
			cam: ["array", [], "[{at, s, dx, dy}] camera keys (scene ms)"],
			prompt: ["string", "Book 100 sales calls", "typed prompt (user-voice)"],
			placeholder: ["string", "Ask Strawberry...", "composer placeholder"],
			ask: ["string", "Ask", "word before the mark"],
			brand: ["string", "Strawberry", "wordmark (serif)"],
			typeKeys: ["array", [], "[{at, n}] characters visible from each key"],
			placeholderOffAt: ["number", 0, "ms the placeholder disappears"],
			caret: ["array", [], "[[fromMs,toMs]] caret visible windows"],
			cursor: ["array", [], "[{at,x,y,opacity,ease}] hand fingertip in design px"],
			cursorPress: ["array", [], "[{at,dur}] hand presses"],
			sendPress: ["array", [], "[{at,dur}] send-circle press flash"],
			pillLabel: ["string", "character art — companion row", "slot label inside the pill"],
		},
		render: AskWindow,
	},
	"willow-char-slot": {
		note: "Character-art slot that follows a measured mascot bbox: keys {at,x,y,w,h,rot,opacity} with (x,y) the bbox centre in screen px. Light face, dashed rim, no shadow — swap in the user's mascot art.",
		nativeMs: 1500,
		params: {
			keys: ["array", [], "[{at,x,y,w,h,rot,opacity,ease}]"],
			label: ["string", "character art", "slot label"],
		},
		render: CharSlot,
	},
	"willow-bubble": {
		note: "A speech bubble (pale blue-grey [231,241,243], r 34, tail bottom-left) with inline spans (one accent colour allowed) and an optional people icon, keyed {at,x,y,rot,scale,opacity} on its centre. Auto-width: copy of any length reflows.",
		nativeMs: 1000,
		params: {
			keys: ["array", [], "[{at,x,y,rot,scale,opacity,ease}]"],
			spans: ["array", [], "[{text, colour}]"],
			fontPx: ["number", 42, "type size"],
			h: ["number", 150, "body height"],
			icon: ["object|null", null, "{colour} people glyph after the text"],
			tail: ["object", "{x:0.07,w:34,h:26}", "tail position (fraction of width) and size"],
		},
		render: Bubble,
	},
	"willow-agent-window": {
		note: "The agent's browser: a drawn window (tabs, traffic lights) under a dense-keyed camera — slides down into frame at 2.95x, '+' opens a second tab (pageCutAt), camera whips and then pulls out to 1.0 in 0.7s with a late peak. Before pageCutAt the brand's new-tab page is drawn as a faint ghost; after it the third-party page is a slot. Agent cursor keyed in DESIGN px (rides the camera) but sized in screen px.",
		nativeMs: 2400,
		params: {
			cam: ["array", [], "[{at,s,dx,dy}]"],
			pageCutAt: ["number", null, "ms the second tab opens"],
			tab1: ["string", "New Tab", ""],
			tab2: ["string", "Connections", "second tab label"],
			heading: ["string", "What are we working on today?", "ghost new-tab heading"],
			ghostPrompt: ["string", "Book me 100 calls", "ghost composer text"],
			cursor: ["array", [], "[{at,x,y,rot}] agent cursor tip, design px"],
			cursorPress: ["array", [], "[{at,dur}]"],
			slotLabel: ["string", "product footage — people search results", ""],
		},
		render: AgentWindow,
	},
	"willow-outreach-cards": {
		note: "The drawn outreach card: avatar, name + shield, title, message box that opens as the card grows (expo), message typing on with the newest ~8 chars in blue and a caret, the agent cursor clicking Send; then cardKeys cut new cards onto a stack (each lands rotated and settles ~1°), cadence accelerating; then `stack` keys shrink the whole stack away and fanKeys spread it.",
		nativeMs: 3500,
		params: {
			people: ["array", [], "[{name, first, title, initials, c1, c2}]"],
			message: ["string", "", "message with {first} placeholder"],
			cardKeys: ["array", [], "[{at, i, rot, rotIn, dx, dy}] one per card"],
			heightKeys: ["array", [], "[{at,h}] top card height (first card grows 388->507)"],
			typeKeys: ["array", [], "[{at,n}] chars typed on the first card (interpolated)"],
			typeFrom: ["number", 0, "ms typing starts (placeholder before)"],
			stack: ["array", [], "[{at,s,dx,dy}] whole-stack transform"],
			fanKeys: ["array", [], "[{at,f}] 0..1 fan-out of the cards below"],
			cursor: ["array", [], "[{at,x,y,rot}] cursor tip in stack (design) px"],
			sendPress: ["array", [], "[{at,dur}]"],
		},
		render: OutreachCards,
	},
	"willow-calendar-window": {
		note: "A browser window holding a calendar slot (third-party footage), keyed by centre+scale (rises in, breathes 1.086->1.0->1.086, then drops out accelerating), with a fanned stack of drawn profile cards in front that drops into it, and the agent cursor (screen px).",
		nativeMs: 2600,
		params: {
			win: ["array", [], "[{at,cx,cy,s,opacity}]"],
			stack: ["array", [], "[{at,x,y,s,rot,fan,opacity}] profile-card stack centre"],
			person: ["object", null, "{name,title,initials,c1,c2} top card"],
			cursor: ["array", [], "[{at,x,y,rot,opacity}] screen px"],
			tab1: ["string", "New Tab", ""],
			tab2: ["string", "Connections", ""],
			tab3: ["string", "Calendar", ""],
		},
		render: CalendarWindow,
	},
};
