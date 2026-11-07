/**
 * juniper-s5.jsx — section 5 presets: the builder window.
 * Range 36.133 – 47.066s (f1084–f1411 on the 30fps clock), measured on the
 * full-decode frames (juniper/ref/f720). Notes with every number:
 * .demo-build/nightly/2026-11-03/juniper/sections/s5/notes.md
 *
 * Mechanisms (all measured, see notes):
 *   CANVAS  headline + window share one scale about the frame centre: a settle
 *           1.106 -> 1.000 at the cut f1084 (excess decays x0.75/frame, f1084–
 *           f1096) and an accelerating pull-back 1.000 -> 0.906 (f1400–f1411).
 *   LINES   every headline line rises on a true exponential (offset x0.75–0.88
 *           per frame) while its colour decays grey -> ink; exits fade in place.
 *   WINDOW  a 940x602 dark window whose FRAME moves (rect keys: x, y, scale,
 *           measured per frame) and whose CONTENT zooms independently (zoom
 *           1 -> 3.0 about the window's top-right, f1140–f1159, S-curve).
 *           Content is authored in a 3x "C space" (2820x1806) so it stays crisp
 *           at zoom 3; zoom 1 renders it at 1/3.
 *   PHONE   a PhoneFrame whips in from lower right with rotation + directional
 *           blur (offset x~0.55/frame, f1207–f1217), launches an app from an
 *           icon (f1242–f1250) and falls out to lower right (f1308–f1319).
 *   CURSOR  the macOS arrow on dense measured paths; clicks are 2-frame presses.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import {
	AppTile,
	ArrowCursor,
	FONT,
	Icon,
	kf,
	live,
	localMs,
	PhoneFrame,
	PlatformGlyph,
	Q,
	rgbs,
	ScreenSlot,
} from "./juniper-shared.jsx";

const FRAME = 1000 / 30;
const YELLOW = [250, 204, 21];
const POP_BG = [35, 37, 34];
const FIELD = [43, 45, 42];
const EDGE = [57, 59, 56];

// ── shared helpers ────────────────────────────────────────────────────────

/** Exponential settle: d0 * r^n, pulled to exactly 0 at nEnd (no creep). */
function settle(n, d0, r, nEnd = 40) {
	if (n <= 0) return d0;
	if (n >= nEnd) return 0;
	const tail = r ** nEnd;
	return (d0 * (r ** n - tail)) / (1 - tail);
}

/**
 * The shared canvas: one scale about the frame centre applied to the
 * headline and the window together (measured: both scale by the same factor
 * at f1085 and f1410), with a blur that follows the scale velocity.
 */
function canvasStyle(keys, ms) {
	const base = { position: "absolute", inset: 0 };
	if (!keys || !keys.length) return base;
	const k = kf(keys, ms);
	const s = k.s ?? 1;
	// forward difference too, so the cut frame (f1084) carries its motion blur
	const v = Math.max(
		Math.abs(s - (kf(keys, ms - FRAME).s ?? 1)),
		Math.abs((kf(keys, ms + FRAME).s ?? 1) - s),
	);
	return {
		...base,
		transform: `scale(${s.toFixed(5)})`,
		transformOrigin: "640px 360px",
		// blurK per key: the cut-frame settle is motion-blurred (f1084), the end pull-back is not (f1411)
		filter:
			v * (k.blurK ?? 60) > 0.18
				? `blur(${Math.min(3, v * (k.blurK ?? 60)).toFixed(2)}px)`
				: undefined,
	};
}

/** Text widths for the status pill tween (deterministic canvas measure). */
let measureCtx = null;
function textWidth(text, font) {
	if (typeof document === "undefined") return text.length * 13;
	if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
	measureCtx.font = font;
	return measureCtx.measureText(text).width;
}

/** Inline-token text: "on your {glyph} device" -> words + PlatformGlyph. */
function TokenText({ text, size, colour }) {
	const parts = String(text).split(/(\{glyph\})/);
	return parts.map((p, i) =>
		p === "{glyph}" ? (
			<PlatformGlyph
				key={`g${i}`}
				size={size}
				colour={colour}
				style={{
					margin: `0 ${(size * 0.12).toFixed(1)}px`,
					transform: `translateY(${(-size * 0.04).toFixed(1)}px)`,
				}}
			/>
		) : (
			<span key={`t${i}`} style={{ whiteSpace: "pre" }}>
				{p}
			</span>
		),
	);
}

// ── juniper-rise-lines ────────────────────────────────────────────────────

/**
 * Centred headline lines. Each line: { text, baseline, startMs, d0, r, c0, rc,
 * blur0, exitAtMs, exitMs }. Measured (s5): "One click…" virtual start f1082,
 * d0 166 px, r 0.865/frame (offset 124 at the cut f1084, 24 at f1095, 0 by
 * f1111); colour L ~214 -> ink by f1098. Line 2 starts f1098 d0 88 r 0.88.
 * Lines are drawn UNDER the window (line 2 rises out from behind its top
 * edge, f1098–f1103).
 */
function RiseLines(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const size = cfg.size ?? 70;
	const ink = cfg.ink ?? Q.ink;
	const asc = cfg.ascent ?? 0.914; // Segoe UI baseline in a line-height:1 box
	return (
		<div style={canvasStyle(cfg.canvas, ms)}>
			{(cfg.lines ?? []).map((ln, i) => {
				const st = ln.startMs ?? 0;
				if (ms < st) return null;
				const n = (ms - st) / FRAME;
				const dy = settle(n, ln.d0 ?? 80, ln.r ?? 0.87, ln.nEnd ?? 40);
				const cAmt = settle(n, 1, ln.rc ?? 0.84, 30);
				const c0 = ln.c0 ?? 170;
				const col = ink.map((v) => v + (c0 - v) * cAmt);
				let op = clamp01((n + 1) / Math.max(0.001, ln.fadeInFrames ?? 1));
				if (ln.exitAtMs != null && ms >= ln.exitAtMs) {
					op *= 1 - clamp01((ms - ln.exitAtMs) / (ln.exitMs ?? 150));
				}
				if (op <= 0.001) return null;
				const blur = (ln.blur0 ?? 0) * settle(n, 1, 0.7, 12);
				return (
					<div
						key={`${i}-${ln.text}`}
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							top: (ln.baseline ?? 120) - size * asc + dy,
							height: size,
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							font: `600 ${size}px ${FONT}`,
							lineHeight: 1,
							letterSpacing: cfg.tracking ?? "-0.012em",
							color: rgbs(col),
							opacity: op,
							filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
							whiteSpace: "nowrap",
						}}
					>
						<TokenText text={ln.text} size={size} colour={col} />
					</div>
				);
			})}
		</div>
	);
}

// ── builder window: drawn pieces (all in C space = 3x window px) ──────────

const C_W = 2820;
const C_H = 1806;
const PILL = rgbs([40, 42, 39]);
const PILL2 = rgbs([44, 46, 43]);

function Pill({ children, bg = PILL, h = 67, px = 24, gap = 12, radius = 15, style = null }) {
	return (
		<div
			style={{
				height: h,
				padding: `0 ${px}px`,
				display: "flex",
				alignItems: "center",
				gap,
				borderRadius: radius,
				background: bg,
				flex: "0 0 auto",
				...(style ?? {}),
			}}
		>
			{children}
		</div>
	);
}

function Dot({ colour, size = 14, opacity = 1 }) {
	return (
		<span
			style={{
				width: size,
				height: size,
				borderRadius: size,
				background: rgbs(colour),
				opacity,
				flex: "0 0 auto",
				display: "inline-block",
			}}
		/>
	);
}

/** Top toolbar: chat header (left), preview segmented control, avatar/Share/Publish/more (right). */
function Toolbar({ p }) {
	const txt = rgbs(Q.appText);
	return (
		<>
			{/* chat-panel header: measured zoom-1 at y283, x186 (C 48) */}
			<div
				style={{
					position: "absolute",
					left: 40,
					top: 18,
					height: 58,
					display: "flex",
					alignItems: "center",
					gap: 16,
					font: `600 31px ${FONT}`,
					color: txt,
					whiteSpace: "nowrap",
				}}
			>
				<Icon name="chevron-left" size={30} colour={Q.appText} stroke={2.4} />
				<span>{p.title ?? "Elegant Productivity App"}</span>
				<Icon name="chevron-down" size={24} colour={Q.appMuted} stroke={2.4} />
			</div>
			<div
				style={{
					position: "absolute",
					left: 922,
					top: 34,
					width: 32,
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-end",
					gap: 6,
				}}
			>
				{[32, 32, 22].map((w, i) => (
					<span key={i} style={{ width: w, height: 3, background: txt, borderRadius: 2 }} />
				))}
			</div>
			{/* segmented: code | Preview | chart  (zoom-1: x519, 535-602, 614) */}
			<div
				style={{
					position: "absolute",
					left: 1030,
					top: 16,
					height: 56,
					display: "flex",
					alignItems: "center",
					gap: 18,
				}}
			>
				<Icon name="code" size={30} colour={Q.appMuted} stroke={2.2} />
				<div
					style={{
						height: 54,
						padding: "0 22px",
						borderRadius: 14,
						background: rgbs([44, 46, 43]),
						display: "flex",
						alignItems: "center",
						gap: 12,
						font: `500 27px ${FONT}`,
						color: txt,
					}}
				>
					<Icon name="eye" size={28} colour={Q.appText} stroke={2.2} />
					<span>{p.preview ?? "Preview"}</span>
				</div>
				<Icon name="chart" size={30} colour={Q.appMuted} stroke={2.2} />
			</div>
			{/* right group — zoomed measures: avatar x602-670, Share 681-795,
			    Publish 810-992, more 1007-1080 (screen) -> right margin 30 C,
			    pills y 4.5–71.5 C, h 67 */}
			<div
				style={{
					position: "absolute",
					right: 30,
					top: 4.5,
					height: 67,
					display: "flex",
					alignItems: "center",
					gap: 15,
					font: `500 26px ${FONT}`,
					color: txt,
					whiteSpace: "nowrap",
				}}
			>
				<div
					style={{
						width: 70,
						height: 70,
						borderRadius: 70,
						background: `radial-gradient(circle at 50% 45%, rgb(86,148,64), ${rgbs(Q.appGreen)})`,
						boxShadow: "inset 0 0 0 3px rgb(47,120,41), 0 0 0 1.5px rgba(80,170,60,0.35)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						font: `500 30px ${FONT}`,
						color: "#fff",
						marginRight: -6,
					}}
				>
					{p.avatar ?? "G"}
				</div>
				<Pill px={22}>{p.share ?? "Share"}</Pill>
				<Pill px={26} bg={rgbs(Q.ground)} style={{ color: "rgb(24,26,23)", gap: 14 }}>
					<Icon name="upload" size={30} colour={[24, 26, 23]} stroke={2.2} />
					<span>{p.publish ?? "Publish"}</span>
				</Pill>
				<Pill px={21}>
					<Icon name="ellipsis" size={32} colour={Q.appText} stroke={2.6} />
				</Pill>
			</div>
			{/* hairline under the toolbar (zoomed y354-356 -> C 81.5) */}
			<div
				style={{
					position: "absolute",
					left: 984,
					right: 0,
					top: 81,
					height: 3,
					background: rgbs([37, 39, 36]),
				}}
			/>
		</>
	);
}

/**
 * Second row: home | Live • ⟳ | ▶ <status> •. Zoomed (screen) at f1200: home
 * x568-627, Live 643-827, status 841-1078, y371-430 -> C top 98.5, h 60,
 * right margin 32. The status pill keeps a min label width (Signing and
 * Installing share one width, 237 px); "Peter's iPhone" widens it to 307.
 * Label changes: text crossfade over 6 frames, width tween over 15 frames
 * (measured f1171–f1186).
 */
function StatusRow({ p, ms }) {
	const keys = p.status ?? [{ at: 0, label: "Peter's iPhone", dot: "green" }];
	let i = 0;
	for (let k = 0; k < keys.length; k++) if (ms >= keys[k].at) i = k;
	const cur = keys[i];
	const prev = i > 0 ? keys[i - 1] : cur;
	const dt = ms - cur.at;
	const xf = i > 0 ? clamp01(dt / (cur.fadeMs ?? p.statusFadeMs ?? 200)) : 1;
	const wf = i > 0 ? 1 - (1 - clamp01(dt / (cur.widthMs ?? p.statusWidthMs ?? 500))) ** 3 : 1;
	const font = `500 26px ${FONT}`;
	const minW = p.statusMinW ?? 116;
	const wOf = (l) => Math.max(minW, textWidth(l, font));
	const lw = lerp(wOf(prev.label), wOf(cur.label), wf);
	const dotCol = (d) => (d === "yellow" ? YELLOW : Q.appDot);
	const txt = rgbs(Q.appText);
	const divider = (m) => (
		<span
			style={{ width: 2, height: 30, background: rgbs([70, 72, 69]), margin: m, flex: "0 0 auto" }}
		/>
	);
	const label = (l, op) => (
		<span
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				bottom: 0,
				display: "flex",
				alignItems: "center",
				opacity: op,
				whiteSpace: "nowrap",
			}}
		>
			{l}
		</span>
	);
	return (
		<div
			style={{
				position: "absolute",
				right: 32,
				top: 98.5,
				height: 60,
				display: "flex",
				alignItems: "center",
				gap: 15,
				font,
				color: txt,
			}}
		>
			<Pill h={60} px={15} bg={PILL2} radius={13}>
				<Icon name="house" size={28} colour={Q.appText} stroke={2.2} />
			</Pill>
			<Pill h={60} px={22} bg={PILL2} radius={13} gap={0}>
				<span>{p.live ?? "Live"}</span>
				<span style={{ width: 18 }} />
				<Dot colour={Q.appDot} />
				{divider("0 18px 0 24px")}
				<Icon name="refresh" size={28} colour={Q.appText} stroke={2.2} />
			</Pill>
			<Pill
				h={60}
				px={0}
				bg={PILL2}
				radius={13}
				gap={0}
				style={{ paddingLeft: 33, paddingRight: 18 }}
			>
				<svg width="22" height="24" viewBox="0 0 22 24" style={{ flex: "0 0 auto" }}>
					<path d="M2 1.5 L20.5 12 L2 22.5 Z" fill={txt} />
				</svg>
				{divider("0 20px 0 24px")}
				<span style={{ position: "relative", width: lw, height: 60, display: "inline-block" }}>
					{xf < 1 ? label(prev.label, 1 - xf) : null}
					{label(cur.label, xf)}
				</span>
				<span style={{ width: 10 }} />
				<span
					style={{
						position: "relative",
						width: 14,
						height: 14,
						display: "inline-block",
						flex: "0 0 auto",
					}}
				>
					<span style={{ position: "absolute", inset: 0, display: "flex" }}>
						<Dot colour={dotCol(prev.dot)} opacity={1 - xf} />
					</span>
					<span style={{ position: "absolute", inset: 0, display: "flex" }}>
						<Dot colour={dotCol(cur.dot)} opacity={xf} />
					</span>
				</span>
			</Pill>
		</div>
	);
}

/** Left chat panel: generic copy blocks in the measured layout (zoom-1 x185, lines ~12.4 px). */
function ChatPanel({ p }) {
	const blocks = p.chat ?? [];
	const txt = rgbs([218, 220, 217]);
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 84,
				width: 984,
				bottom: 0,
				background: rgbs([28, 30, 27]),
				borderRight: `3px solid ${rgbs([37, 39, 36])}`,
				padding: "26px 30px 0 45px",
				boxSizing: "border-box",
				font: `400 28px ${FONT}`,
				lineHeight: "37.5px",
				color: txt,
				overflow: "hidden",
			}}
		>
			{blocks.map((b, i) => {
				if (b.box) {
					return (
						<div
							key={i}
							style={{
								margin: "20px -15px 0 -10px",
								padding: "14px 20px",
								background: rgbs([40, 42, 39]),
								borderRadius: 14,
							}}
						>
							<div style={{ display: "flex", justifyContent: "space-between", fontWeight: 500 }}>
								<span>{b.box}</span>
								<Icon name="chevron-right" size={24} colour={Q.appMuted} />
							</div>
							{(b.files ?? []).map((f, j) => (
								<div
									key={j}
									style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 7 }}
								>
									<Dot colour={[236, 238, 235]} size={15} />
									<span>{b.verb ?? "Edited"}</span>
									<span
										style={{
											background: rgbs([50, 52, 49]),
											color: rgbs(Q.appMuted),
											padding: "0 6px",
											borderRadius: 5,
										}}
									>
										{f}
									</span>
								</div>
							))}
						</div>
					);
				}
				if (b.h) {
					return (
						<div key={i} style={{ fontWeight: 600, marginTop: b.mt ?? 14, color: rgbs(Q.appText) }}>
							{b.h}
						</div>
					);
				}
				if (b.li) {
					return (
						<div key={i} style={{ display: "flex", marginTop: b.mt ?? 0, paddingLeft: 21 }}>
							<span style={{ width: 24, flex: "0 0 auto" }}>•</span>
							<span>{b.li}</span>
						</div>
					);
				}
				return (
					<div key={i} style={{ marginTop: b.mt ?? 0 }}>
						{b.p}
					</div>
				);
			})}
		</div>
	);
}

/**
 * The preview phone in the right pane: a bare light screen with a thin dark
 * outline (zoom-1 x706-903, top y374 -> C 1608-2199, top 321, radius ~84),
 * island 195 x 52 C at C y342. App footage = a light ScreenSlot.
 */
function PreviewPhone({ p }) {
	const w = 591;
	return (
		<div
			style={{
				position: "absolute",
				left: 1608,
				top: 321,
				width: w,
				height: w * 2.08,
				borderRadius: 86,
				background: rgbs([30, 32, 29]),
				padding: 7,
				boxSizing: "border-box",
			}}
		>
			<div
				style={{
					position: "relative",
					width: "100%",
					height: "100%",
					borderRadius: 80,
					overflow: "hidden",
				}}
			>
				<ScreenSlot
					tone="light"
					labelSize={30}
					label={p.previewSlot ?? "product UI — productivity app"}
					face="linear-gradient(115deg, rgb(219,236,246) 0%, rgb(238,236,248) 45%, rgb(246,224,236) 100%)"
				/>
				<div
					style={{
						position: "absolute",
						left: (w - 14 - 195) / 2,
						top: 14,
						width: 195,
						height: 52,
						borderRadius: 52,
						background: "#000",
					}}
				/>
				<div
					style={{
						position: "absolute",
						right: 46,
						top: 28,
						display: "flex",
						alignItems: "center",
						gap: 14,
					}}
				>
					<Icon name="wifi" size={30} colour={[20, 20, 20]} stroke={2.6} />
					<span style={{ width: 34, height: 15, borderRadius: 5, background: "rgb(20,20,20)" }} />
				</div>
			</div>
		</div>
	);
}

/** Install toast (phase B measure: C x2296-2786, y470-567, border [38], fill = window). */
function Toast({ p, ms }) {
	const at = p.toastAtMs;
	if (at == null || ms < at) return null;
	let op = clamp01((ms - at) / 90);
	if (p.toastOutMs != null && ms >= p.toastOutMs) op *= 1 - clamp01((ms - p.toastOutMs) / 130);
	if (op <= 0) return null;
	// text rises ~50 C px (39 screen at 0.782) on an x0.8/frame exponential, f1245–f1258
	const rise = settle((ms - at) / FRAME, p.toastRise ?? 50, 0.8, 25);
	return (
		<div
			style={{
				position: "absolute",
				left: 2296,
				top: 470 + rise,
				width: 490,
				minHeight: 97,
				boxSizing: "border-box",
				padding: "12px 24px 12px 20px",
				borderRadius: 16,
				border: `2.5px solid ${rgbs([42, 44, 41])}`,
				background: rgbs(Q.appBg),
				display: "flex",
				alignItems: "center",
				gap: 16,
				font: `400 19px ${FONT}`,
				lineHeight: "26px",
				color: rgbs(Q.appText),
				opacity: op,
			}}
		>
			<span
				style={{
					width: 24,
					height: 24,
					borderRadius: 24,
					background: rgbs([223, 225, 222]),
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flex: "0 0 auto",
				}}
			>
				<Icon name="check" size={16} colour={Q.appBg} stroke={3.4} />
			</span>
			<span>{p.toast ?? "Elegant Productivity App installed on Peter's iPhone"}</span>
		</div>
	);
}

/**
 * Publish popover (C space; f1370: x2241-2794, y86.5-495.5, r22, fill
 * [35,37,34], hairline [50]). Opens f1349.5–f1352 (scale 0.6 -> 0.95 -> 1,
 * blur 8 -> 1.6 -> 0, origin under Publish), collapses f1399–f1403 (scale
 * 1 -> 0.5, blur -> 10, fade).
 */
function Popover({ p, ms }) {
	const o = p.popover;
	if (!o || ms < o.openAtMs) return null;
	const cl = o.closeAtMs ?? 1e9;
	const k = kf(
		[
			{ at: o.openAtMs, s: 0.55, o: 0, b: 8 },
			{ at: o.openAtMs + 17, s: 0.75, o: 0.6, b: 5, ease: "out" },
			{ at: o.openAtMs + 33, s: 0.97, o: 1, b: 1, ease: "out" },
			{ at: o.openAtMs + 67, s: 1, o: 1, b: 0, ease: "out" },
			{ at: cl, s: 1, o: 1, b: 0 },
			{ at: cl + 33, s: 0.9, o: 0.95, b: 3, ease: "in" },
			{ at: cl + 67, s: 0.67, o: 0.75, b: 6, ease: "in" },
			{ at: cl + 100, s: 0.5, o: 0.3, b: 9, ease: "in" },
			{ at: cl + 133, s: 0.45, o: 0, b: 10, ease: "in" },
		],
		ms,
	);
	if (k.o <= 0.002) return null;
	const txt = rgbs(Q.appText);
	const muted = rgbs([140, 143, 139]);
	const tile = (tl) => (
		<div
			style={{
				flex: 1,
				height: 74,
				borderRadius: 14,
				background: rgbs(FIELD),
				boxShadow: `inset 0 0 0 1.5px ${rgbs(EDGE)}`,
				display: "flex",
				alignItems: "center",
				gap: 14,
				padding: "0 16px",
			}}
		>
			<AppTile
				size={28}
				bg={tl.bg ?? [90, 92, 89]}
				icon={tl.icon ?? "store"}
				letter={tl.letter ?? null}
				radius={0.26}
			/>
			<div style={{ display: "flex", flexDirection: "column", gap: 2, whiteSpace: "nowrap" }}>
				<span style={{ font: `500 18.5px ${FONT}`, color: txt }}>{tl.title}</span>
				<span style={{ font: `400 16px ${FONT}`, color: muted }}>{tl.sub}</span>
			</div>
		</div>
	);
	const rule = <span style={{ flex: 1, height: 1.5, background: rgbs([56, 58, 55]) }} />;
	return (
		<div
			style={{
				position: "absolute",
				left: 2241,
				top: 86.5,
				width: 553,
				boxSizing: "border-box",
				padding: "26px 23px 21px",
				borderRadius: 22,
				background: rgbs(POP_BG),
				boxShadow: `inset 0 0 0 1.5px ${rgbs([50, 52, 49])}, 0 18px 40px rgba(0,0,0,0.45)`,
				transform: `scale(${k.s.toFixed(4)})`,
				transformOrigin: `${o.originX ?? 276}px ${o.originY ?? 60}px`,
				opacity: k.o,
				filter: k.b > 0.05 ? `blur(${k.b.toFixed(2)}px)` : undefined,
				color: txt,
			}}
		>
			<div style={{ font: `500 21px ${FONT}`, lineHeight: "26px" }}>
				{o.title ?? "Share with your audience"}
			</div>
			<div style={{ font: `400 16px ${FONT}`, lineHeight: "22px", color: muted, marginTop: 2 }}>
				{o.sub ?? "Anyone with this link can instantly try your app"}
			</div>
			<div
				style={{
					marginTop: 19,
					height: 67,
					borderRadius: 14,
					background: rgbs(FIELD),
					boxShadow: `inset 0 0 0 1.5px ${rgbs([50, 52, 49])}`,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "0 26px 0 21px",
					font: `400 19px ${FONT}`,
				}}
			>
				<span style={{ color: rgbs([222, 224, 221]) }}>{o.url ?? "pokemon-card-app.rork.app"}</span>
				<span style={{ display: "flex", alignItems: "center", gap: 10, font: `500 17px ${FONT}` }}>
					<Icon name="copy" size={20} colour={Q.appText} stroke={2.2} />
					{o.copy ?? "Copy"}
				</span>
			</div>
			<div
				style={{
					marginTop: 13,
					height: 59,
					borderRadius: 14,
					background: rgbs(Q.ground),
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					font: `500 19px ${FONT}`,
					color: "rgb(28,30,27)",
				}}
			>
				{o.cta ?? "Publish 3 changes"}
			</div>
			<div
				style={{
					marginTop: 27,
					display: "flex",
					alignItems: "center",
					gap: 16,
					font: `400 16px ${FONT}`,
					color: muted,
				}}
			>
				{rule}
				<span>{o.stores ?? "App Stores"}</span>
				{rule}
			</div>
			<div style={{ marginTop: 27, display: "flex", gap: 13 }}>
				{(o.tiles ?? []).map((tl, i) => (
					<React.Fragment key={i}>{tile(tl)}</React.Fragment>
				))}
			</div>
		</div>
	);
}

// ── juniper-builder-window ────────────────────────────────────────────────

/**
 * The dark builder window. Frame: 940 x 602, radius 14, fill [21,23,20]; rect
 * keys { at, x, y, s } (top-left + scale; measured per frame in notes).
 * Content zoom keys { at, z } about the window point (940, -2.25) — fitted so
 * Publish (x1011->812), avatar (y280->311) and the preview phone (x903->489)
 * all land at zoom 3.0.
 */
function BuilderWindow(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const rk = cfg.rect ?? [{ at: 0, x: 170, y: 268, s: 1 }];
	const zk = cfg.zoom ?? [{ at: 0, z: 1 }];
	const r = kf(rk, ms);
	const rp = kf(rk, ms - FRAME);
	const z = kf(zk, ms).z ?? 1;
	const zp = kf(zk, ms - FRAME).z ?? 1;
	const ox = 940;
	const oy = cfg.zoomOriginY ?? -2.25;
	const vs = Math.abs(r.s - rp.s) * 900 + Math.abs(r.x - rp.x) * 0.5;
	const winBlur = Math.min(3, vs * 0.06);
	// the reference streaks the window sideways (f1209–f1212): directional blur
	const wfid = `s5win-${cfg.id ?? "w"}`;
	const wOn = winBlur > 0.15;
	const zBlur = Math.min(2.5, Math.abs(z - zp) * 7);
	// Zoom streak (assembly pass): the reference's push-in blur is radial about the zoom
	// origin (f1140–f1150: the far chat panel smears into lines while the toolbar near the
	// origin stays readable). With `zoomStreak: N` the content is drawn N times at zooms
	// spread over the last `zoomShutter` of this frame's travel (default half), each on
	// the window fill, and averaged (copy i at opacity 1/(i+1)); the isotropic blur then
	// drops to 15%. Omitted / 0 = the single isotropic blur, as before.
	const nStreak = cfg.zoomStreak ?? 0;
	const shutter = cfg.zoomShutter ?? 0.5;
	const zs =
		nStreak > 1 && Math.abs(z - zp) > 0.01
			? Array.from({ length: nStreak }, (_, i) => z - (z - zp) * shutter * (1 - i / (nStreak - 1)))
			: [z];
	const isoBlur = zs.length > 1 ? zBlur * 0.15 : zBlur;
	const layer = (zv, i) => (
		<div
			key={i}
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: C_W,
				height: C_H,
				transformOrigin: "0 0",
				transform: `translate(${(ox * (1 - zv)).toFixed(3)}px, ${(oy * (1 - zv)).toFixed(3)}px) scale(${(zv / 3).toFixed(5)})`,
				filter: isoBlur > 0.15 ? `blur(${(isoBlur * 3).toFixed(2)}px)` : undefined,
				opacity: zs.length > 1 && i > 0 ? 1 / (i + 1) : undefined,
				background: zs.length > 1 ? rgbs(Q.appBg) : undefined,
			}}
		>
			<ChatPanel p={cfg} />
			<Toolbar p={cfg} />
			<StatusRow p={cfg} ms={ms} />
			<PreviewPhone p={cfg} />
			<Toast p={cfg} ms={ms} />
			<Popover p={cfg} ms={ms} />
		</div>
	);
	return (
		<div style={canvasStyle(cfg.canvas, ms)}>
			{wOn ? (
				<svg width="0" height="0" style={{ position: "absolute" }}>
					<filter id={wfid} x="-10%" y="-10%" width="120%" height="120%">
						<feGaussianBlur
							stdDeviation={`${(winBlur * 1.6).toFixed(2)} ${(winBlur * 0.45).toFixed(2)}`}
						/>
					</filter>
				</svg>
			) : null}
			<div
				style={{
					position: "absolute",
					left: r.x,
					top: r.y,
					width: 940,
					height: 602,
					transform: `scale(${r.s.toFixed(5)})`,
					transformOrigin: "0 0",
					borderRadius: cfg.radius ?? 14,
					overflow: "hidden",
					background: rgbs(Q.appBg),
					filter: wOn ? `url(#${wfid})` : undefined,
				}}
			>
				{zs.map(layer)}
			</div>
		</div>
	);
}

// ── juniper-install-phone ─────────────────────────────────────────────────

const HOME_TILES = [
	[[234, 67, 53], "message"],
	[[226, 228, 225], "bot"],
	[[205, 208, 214], "sparkles"],
	[[18, 18, 18], "play"],
	[[214, 41, 118], "camera"],
	[[18, 18, 18], "layers"],
	[[37, 211, 102], "message"],
	[[76, 98, 240], "chart"],
	[[0, 196, 204], "sparkles"],
	[[0, 140, 255], "check"],
	[[22, 22, 22], "wifi"],
	[[20, 90, 160], "eye"],
	[[240, 170, 90], "box"],
	[[238, 240, 237], "refresh"],
	[[0, 150, 230], "play"],
	[[30, 140, 70], "calendar"],
	[[20, 40, 90], "map"],
	[[236, 238, 240], "layers"],
	[[66, 133, 244], "copy"],
	[[14, 60, 74], "tv"],
	[[255, 56, 92], "heart"],
	[[226, 30, 40], "bell"],
	[[40, 110, 220], "tablet"],
	[[150, 152, 156], "timer"],
];
const HOME_LABELS = [
	"Mail",
	"Notes",
	"Photos",
	"Clips",
	"Social",
	"Posts",
	"Chat",
	"Groups",
	"Design",
	"Pay",
	"Sounds",
	"Shield",
	"Shop",
	"Assist",
	"Video",
	"Class",
	"Learn",
	"Inbox",
	"Docs",
	"Stream",
	"Stays",
	"Sports",
	"Meet",
	"Focus",
];
const DOCK = [
	[[52, 199, 89], "phone"],
	[[30, 130, 240], "map"],
	[[52, 199, 89], "message"],
	[[250, 60, 80], "play"],
];

/**
 * Home screen inside a 276-wide PhoneFrame (measured f1235: icons 40 px,
 * column centres 52/109/167/225, row centres 88…400 step 62.4 phone px; search
 * pill y452; dock y486-544). All tiles are neutral AppTiles.
 */
function HomeScreen({ inset, launch }) {
	const ix = (v) => v - inset;
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "linear-gradient(180deg, rgb(14,16,22), rgb(8,9,12))",
			}}
		>
			<div
				style={{
					position: "absolute",
					inset: 0,
					transform: `scale(${1 + launch * 0.12})`,
					transformOrigin: `${ix(167)}px ${ix(337)}px`,
					filter: launch > 0.01 ? `blur(${(launch * 5).toFixed(2)}px)` : undefined,
					opacity: 1 - launch * 0.6,
				}}
			>
				<div
					style={{
						position: "absolute",
						left: ix(40),
						top: ix(26),
						font: `600 11px ${FONT}`,
						color: "#fff",
					}}
				>
					9:41
				</div>
				{HOME_TILES.map(([bg, icon], i) => {
					const cx = [52, 109, 167, 225][i % 4];
					const cy = 88 + Math.floor(i / 4) * 62.4;
					const light = bg[0] + bg[1] + bg[2] > 600;
					return (
						<div
							key={i}
							style={{
								position: "absolute",
								left: ix(cx - 20),
								top: ix(cy - 20),
								width: 40,
								textAlign: "center",
							}}
						>
							<AppTile size={40} bg={bg} icon={icon} fg={light ? [60, 62, 66] : Q.white} />
							<div
								style={{
									font: `400 7.5px ${FONT}`,
									color: "rgba(255,255,255,0.9)",
									marginTop: 3,
									whiteSpace: "nowrap",
									marginLeft: -10,
									marginRight: -10,
								}}
							>
								{HOME_LABELS[i]}
							</div>
						</div>
					);
				})}
				<div
					style={{
						position: "absolute",
						left: ix(138 - 24),
						top: ix(452),
						width: 48,
						height: 14,
						borderRadius: 7,
						background: "rgba(255,255,255,0.16)",
						font: `400 7px ${FONT}`,
						color: "rgba(255,255,255,0.8)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					Search
				</div>
				<div
					style={{
						position: "absolute",
						left: ix(15),
						top: ix(486),
						width: 246,
						height: 58,
						borderRadius: 26,
						background: "rgba(255,255,255,0.13)",
					}}
				/>
				{DOCK.map(([bg, icon], i) => (
					<div
						key={i}
						style={{ position: "absolute", left: ix([55, 110, 165, 221][i] - 20), top: ix(495) }}
					>
						<AppTile size={40} bg={bg} icon={icon} />
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Phone whip-in / app launch / whip-out. keys { at, dx, dy, rot, s } are
 * offsets from the rest rect (x905, y124, width 276 — measured f1220).
 * Blur follows the per-frame velocity on each axis (SVG directional blur).
 */
function InstallPhone(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const keys = cfg.keys ?? [{ at: 0, dx: 0, dy: 0, rot: 0, s: 1 }];
	const k = kf(keys, ms);
	const kp = kf(keys, ms - FRAME);
	const bx = Math.min(16, Math.abs((k.dx ?? 0) - (kp.dx ?? 0)) * 0.11);
	const by = Math.min(12, Math.abs((k.dy ?? 0) - (kp.dy ?? 0)) * 0.09);
	const w = cfg.width ?? 276;
	const inset = w * 0.038;
	const sw = w - inset * 2;
	const sh = w * (670 / 326) - inset * 2;
	// app launch: dark card grows from the icon (row 5, col 3: phone px 167,337)
	const la = cfg.launchAtMs ?? 1e9;
	const lp = clamp01((ms - la) / 130);
	const le = 1 - (1 - lp) ** 2;
	const appOp = clamp01((ms - la - 70) / 110);
	const card = {
		x: lerp(167 - inset - 20, 0, le),
		y: lerp(337 - inset - 20, 0, le),
		w: lerp(40, sw, le),
		h: lerp(40, sh, le),
		r: lerp(9, w * 0.13, le),
	};
	const fid = `s5blur-${cfg.id ?? "phone"}`;
	const blurOn = bx + by > 0.3;
	return (
		<div style={{ position: "absolute", inset: 0 }}>
			{blurOn ? (
				<svg width="0" height="0" style={{ position: "absolute" }}>
					<filter id={fid} x="-30%" y="-30%" width="160%" height="160%">
						<feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
					</filter>
				</svg>
			) : null}
			<div style={{ position: "absolute", inset: 0, filter: blurOn ? `url(#${fid})` : undefined }}>
				<div
					style={{
						position: "absolute",
						left: (cfg.x ?? 905) + (k.dx ?? 0),
						top: (cfg.y ?? 124) + (k.dy ?? 0),
						transform: `rotate(${(k.rot ?? 0).toFixed(3)}deg) scale(${(k.s ?? 1).toFixed(4)})`,
						transformOrigin: "50% 50%",
					}}
				>
					<PhoneFrame width={w}>
						<HomeScreen inset={inset} launch={lp} />
						{ms >= la ? (
							<div
								style={{
									position: "absolute",
									left: card.x,
									top: card.y,
									width: card.w,
									height: card.h,
									borderRadius: card.r,
									background: "rgb(16,17,20)",
									overflow: "hidden",
								}}
							>
								<div style={{ position: "absolute", inset: 0, opacity: appOp }}>
									<ScreenSlot
										tone="light"
										label={cfg.slotLabel ?? "product UI — productivity app"}
										face="linear-gradient(160deg, rgb(226,236,248) 0%, rgb(240,234,250) 50%, rgb(248,228,238) 100%)"
									/>
								</div>
							</div>
						) : null}
					</PhoneFrame>
				</div>
			</div>
		</div>
	);
}

// ── juniper-s5-cursor ─────────────────────────────────────────────────────

/**
 * Arrow cursor on dense measured keys { at, x, y, o?, press?, size? } (tip
 * coordinates). Measured glyph: ~30 px tall in the Signing beat (f1166),
 * ~40 px tall in the Publish beat (f1396) -> size keys 40 / 52.
 */
function S5Cursor(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const k = kf(cfg.keys ?? [], ms);
	const o = k.o ?? 1;
	if (o <= 0.002 || k.x == null) return null;
	return (
		<ArrowCursor x={k.x} y={k.y} size={k.size ?? cfg.size ?? 36} press={k.press ?? 0} opacity={o} />
	);
}

// ── registry ──────────────────────────────────────────────────────────────

export const S5_PRESETS = {
	"juniper-rise-lines": {
		note: "centred headline lines that rise on a true exponential (offset x r per frame) while darkening grey -> ink, exit by fading in place; inline {glyph} token = PlatformGlyph. Optional `canvas` scale keys about the frame centre (shared with the builder window). Measured s5: 70 px semibold, baselines 120/201, r 0.75-0.88.",
		nativeMs: 4000,
		params: {
			lines: [
				"array",
				"[]",
				"[{text, baseline, startMs, d0, r, c0, rc, blur0, exitAtMs, exitMs}] scene-relative ms",
			],
			size: ["number", "70", "font size px (cap 49, x-height 35 measured)"],
			canvas: ["array", "[]", "[{at, s}] shared canvas scale about (640,360)"],
		},
		render: RiseLines,
	},
	"juniper-builder-window": {
		note: "the dark app-builder window (940x602, r14): chat panel, toolbar (avatar/Share/Publish/more), status row with animated status pill, preview phone slot, install toast, Publish popover. Frame moves on `rect` keys; content zooms on `zoom` keys about the window's top-right; optional shared `canvas` scale.",
		nativeMs: 11000,
		params: {
			rect: ["array", "[{at:0,x:170,y:268,s:1}]", "window top-left + scale keys"],
			zoom: ["array", "[{at:0,z:1}]", "content zoom keys (1..3)"],
			zoomStreak: ["number", "0", "copies averaged over each frame's zoom travel (radial blur)"],
			zoomShutter: ["number", "0.5", "fraction of the frame's zoom travel the streak covers"],
			status: ["array", "[{at:0,label,dot}]", "status pill states (dot green|yellow)"],
			chat: ["array", "[]", "chat blocks: {p}|{h}|{li}|{box,files[]}"],
			toastAtMs: ["number", "null", "toast in (toastOutMs: out)"],
			popover: [
				"object",
				"null",
				"{openAtMs, closeAtMs, title, sub, url, copy, cta, stores, tiles[]}",
			],
			title: ["string", "Elegant Productivity App", "project title"],
			avatar: ["string", "G", "avatar letter"],
		},
		render: BuilderWindow,
	},
	"juniper-install-phone": {
		note: "a PhoneFrame (276 wide, rest x905 y124) with a neutral home-screen grid that whips in/out on {dx,dy,rot,s} keys with per-axis motion blur, then launches the app from an icon into a light product slot.",
		nativeMs: 4000,
		params: {
			keys: ["array", "[]", "offset keys {at,dx,dy,rot,s}"],
			launchAtMs: ["number", "null", "app launch start"],
			slotLabel: ["string", "product UI — productivity app", "installed-app slot label"],
		},
		render: InstallPhone,
	},
	"juniper-s5-cursor": {
		note: "macOS arrow cursor (36 px) on dense measured tip keys {at,x,y,o,press}.",
		nativeMs: 4000,
		params: { keys: ["array", "[]", "tip path keys"], size: ["number", "36", "glyph size"] },
		render: S5Cursor,
	},
};
