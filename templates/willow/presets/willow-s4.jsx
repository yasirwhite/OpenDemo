/**
 * willow-s4.jsx — presets for willow section 4 (31.333–49.250s of the reference,
 * frames f00752–f01181): "works in your apps" → the Chat button → the prompt →
 * the team picks it up → the deck fills in → "Meeting starting now".
 *
 * Every number below was measured off full-decode 1280x720 frames (frame n =
 * n/24 s); the per-frame tables live in the section config (dense keys) and the
 * measurement notes in .demo-build/nightly/2026-10-30/willow/sections/s4/notes.md.
 *
 * The section is ONE drawn browser window seen at several framings, plus two
 * close-up compositions of its chat panel and a toast:
 *
 *   willow-s4-browser  the window: bezel, chrome bar, tabs, brand "Chat" pill,
 *                      a new-tab page (glyph tiles + "Ask <brand>" composer) or
 *                      an app page (footage SLOT + optional drawn chat sidebar),
 *                      agent cursors over the slot, all under one camera
 *                      (s, dx, dy about frame centre: p' = C + d + s(p - C)).
 *   willow-s4-chat     the chat panel in close-up: the composer typing beat
 *                      (phase "composer") and the thread beat (phase "thread":
 *                      user bubble, agent reply, status rows typing on).
 *   willow-s4-toast    the dark "Meeting starting now" toast with its button.
 *   willow-s4-hand     the human pointing hand on keyed paths (press = click).
 *
 * Third-party app screens are SLOTS (dashed placeholder) — the template's place
 * for the user's own product footage. Third-party logos are neutral glyph tiles;
 * mascots/people are Avatars. Every render is a pure function of t.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import {
	AgentCursor,
	Avatar,
	FONT,
	HandCursor,
	kf,
	live,
	localMs,
	rgbs,
	SERIF,
	W,
} from "./willow-shared.jsx";

// ── measured palette (sampled, f788 / f850 / f900 / f1040 / f1170) ─────────
const P = {
	bezel: [250, 249, 246], // window rim (f788 x133..143 [247,246,241]; lighter on the zoomed beats)
	chrome: [253, 254, 252], // tab bar (f788 [250,249,245], f813 zoomed [253,255,253])
	page: [255, 255, 253], // white page
	ink: [24, 24, 24],
	tabInk: [34, 34, 34],
	pill: [239, 239, 237], // "Chat" pill fill (f788 x1027..1109)
	slotFace: [247, 250, 252], // app area (the Slides canvas is [247,251,252])
	bubble: [242, 243, 241], // user bubble (f900)
	status: [96, 96, 96], // status-row text (f1000)
	hair: [226, 228, 231], // composer / chip borders
	send: [120, 76, 63], // send button (f850 c(1015,491))
	sendPress: [150, 112, 100], // pressed (f872–875 the button lightens)
	sendBlue: [107, 155, 196], // new-tab composer send (f760)
	toast: [28, 30, 27], // toast fill (f1170)
	toastRim: [108, 110, 105],
	red: [237, 85, 80],
	amber: [245, 190, 40],
	green: [80, 195, 90],
};

/** Camera wrapper: p' = (640,360) + (dx,dy) + s * (p - (640,360)). */
function Cam({ s = 1, dx = 0, dy = 0, children }) {
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1280,
				height: 720,
				transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${s.toFixed(5)})`,
				transformOrigin: "640px 360px",
			}}
		>
			{children}
		</div>
	);
}
/**
 * Hand with a VISUAL height h (px, fingertip to wrist) and the fingertip on (x,y).
 * Compensates the shared HandCursor, whose svg is sized by `size` AND then CSS-
 * scaled by size/32 (visual height = 0.02872*size^2, tip drifts right) — see report.
 */
export function Hand({ x, y, h = 50, press = 0, opacity = 1 }) {
	const sz = Math.sqrt(h / 0.02872),
		k = sz / 32;
	const fx = 11 - 22 * k + 0.3474 * k * sz,
		fy = 2.5 - 5 * k + 0.0789 * k * sz;
	return <HandCursor x={x - fx} y={y - fy} size={sz} press={press} opacity={opacity} />;
}
const camPt = (c, x, y) => [
	640 + (c.dx ?? 0) + (c.s ?? 1) * (x - 640),
	360 + (c.dy ?? 0) + (c.s ?? 1) * (y - 360),
];

// ── glyphs ─────────────────────────────────────────────────────────────────

/** Generic brand mark (placeholder for the product's own mark): a small
 *  diamond of coral dots with a lime bud — sized/coloured like the reference
 *  mark so it sits where it sat, but not that mark. */
export function BrandMark({ size = 16 }) {
	const c = rgbs([226, 80, 60]);
	const pts = [
		[10, 2.6],
		[6.3, 6.3],
		[13.7, 6.3],
		[2.6, 10],
		[10, 10],
		[17.4, 10],
		[6.3, 13.7],
		[13.7, 13.7],
		[10, 17.4],
	];
	return (
		<svg width={size} height={size} viewBox="0 0 20 20" style={{ display: "block", flex: "none" }}>
			{pts.map(([x, y], i) => (
				<circle key={i} cx={x} cy={y} r={i === 4 ? 2.4 : 2.1} fill={c} />
			))}
		</svg>
	);
}

/** Neutral app glyphs (tab icons and status chips) — no real marks. */
export function AppGlyph({ kind = "newtab", size = 18 }) {
	const s = size;
	if (kind === "newtab") {
		return (
			<svg width={s} height={s} viewBox="0 0 20 20" style={{ display: "block", flex: "none" }}>
				{[
					[10, 3],
					[6.5, 6.5],
					[13.5, 6.5],
					[3, 10],
					[10, 10],
					[17, 10],
					[6.5, 13.5],
					[13.5, 13.5],
					[10, 17],
				].map(([x, y], i) => (
					<circle key={i} cx={x} cy={y} r="1.9" fill={rgbs([120, 120, 120])} />
				))}
			</svg>
		);
	}
	if (kind === "notes") {
		return (
			<svg width={s} height={s} viewBox="0 0 20 20" style={{ display: "block", flex: "none" }}>
				<rect
					x="2.5"
					y="2.5"
					width="15"
					height="15"
					rx="2.5"
					fill="#fff"
					stroke="#111"
					strokeWidth="2"
				/>
				<path
					d="M6.5 7h7M6.5 10h7M6.5 13h4.5"
					stroke="#111"
					strokeWidth="1.6"
					strokeLinecap="round"
				/>
			</svg>
		);
	}
	if (kind === "doc") {
		return (
			<svg width={s} height={s} viewBox="0 0 20 20" style={{ display: "block", flex: "none" }}>
				<path
					d="M4.5 1.5h7.5l4.5 4.5v11.5a1.5 1.5 0 0 1-1.5 1.5h-10.5a1.5 1.5 0 0 1-1.5-1.5v-14.5a1.5 1.5 0 0 1 1.5-1.5Z"
					fill={rgbs([66, 133, 244])}
				/>
				<path d="M12 1.5v4.5h4.5Z" fill={rgbs([160, 195, 250])} />
				<path d="M6.5 11h7M6.5 14h7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
			</svg>
		);
	}
	if (kind === "slides") {
		return (
			<svg width={s} height={s} viewBox="0 0 20 20" style={{ display: "block", flex: "none" }}>
				<rect x="1.5" y="3.5" width="17" height="13.5" rx="3" fill={rgbs([248, 196, 20])} />
				<rect
					x="4.6"
					y="6.6"
					width="10.8"
					height="7.3"
					rx="1"
					fill="none"
					stroke="#fff"
					strokeWidth="1.8"
				/>
			</svg>
		);
	}
	if (kind === "video") {
		return (
			<svg width={s} height={s} viewBox="0 0 40 32" style={{ display: "block", flex: "none" }}>
				<defs>
					<linearGradient id="s4vg" x1="0" y1="0" x2="1" y2="1">
						<stop offset="0" stopColor={rgbs([255, 214, 40])} />
						<stop offset="1" stopColor={rgbs([246, 186, 18])} />
					</linearGradient>
				</defs>
				<rect x="0" y="0" width="28" height="32" rx="7" fill="url(#s4vg)" />
				<path d="M27 11 L40 4 V28 L27 21 Z" fill={rgbs([244, 170, 20])} />
				<circle cx="6" cy="25.5" r="3" fill="#fff" />
			</svg>
		);
	}
	return null;
}

// ── shared pieces ──────────────────────────────────────────────────────────

function TrafficLights({ x, y, gap = 27, r = 7.5 }) {
	return [P.red, P.amber, P.green].map((c, i) => (
		<div
			key={i}
			style={{
				position: "absolute",
				left: x + i * gap - r,
				top: y - r,
				width: r * 2,
				height: r * 2,
				borderRadius: "50%",
				background: rgbs(c),
			}}
		/>
	));
}

/** Tab strip: inactive = glyph + label, active = fixed-width white pill
 *  (175px measured on all three framings), "+" 42px after the last item. */
function Tabs({ x, cy, tabs, font = 15, plus = true }) {
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: cy - 19,
				height: 38,
				display: "flex",
				alignItems: "center",
				gap: 37,
			}}
		>
			{tabs.map((tb, i) => (
				<div
					key={i}
					style={{
						display: "flex",
						alignItems: "center",
						gap: 7,
						height: 38,
						...(tb.active
							? {
									width: tb.w ?? 175,
									boxSizing: "border-box",
									padding: "0 12px",
									background: "#fff",
									borderRadius: 8,
									boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
									marginLeft: -12,
									marginRight: -12,
								}
							: {}),
					}}
				>
					<AppGlyph kind={tb.glyph} size={font + 3} />
					<span
						style={{
							font: `400 ${font}px ${FONT}`,
							color: rgbs(P.tabInk),
							whiteSpace: "nowrap",
							letterSpacing: "-0.01em",
						}}
					>
						{tb.label}
					</span>
				</div>
			))}
			{plus ? (
				<svg width="18" height="18" viewBox="0 0 18 18" style={{ marginLeft: 4 }}>
					<path d="M9 2v14M2 9h14" stroke="#111" strokeWidth="2" strokeLinecap="round" />
				</svg>
			) : null}
		</div>
	);
}

/** Dashed placeholder for product footage (same idiom as media-window). */
function Slot({
	x,
	y,
	w,
	h,
	label,
	face = P.slotFace,
	radius = 0,
	veil = 0,
	labelAt = null,
	labelSize = null,
}) {
	const fs = labelSize ?? Math.max(9, Math.min(22, h * 0.045));
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: w,
				height: h,
				background: rgbs(face),
				borderRadius: radius,
				overflow: "hidden",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{label ? (
				<div
					style={{
						...(labelAt
							? {
									position: "absolute",
									left: labelAt[0],
									top: labelAt[1],
									transform: "translate(-50%,-50%)",
								}
							: {}),
						border: `2px dashed ${rgbs([196, 202, 210])}`,
						borderRadius: 10,
						padding: `${(fs * 0.9).toFixed(0)}px ${(fs * 1.6).toFixed(0)}px`,
						font: `450 ${fs.toFixed(1)}px ${FONT}`,
						color: rgbs([130, 138, 150]),
						letterSpacing: "-0.01em",
						whiteSpace: "nowrap",
					}}
				>
					[ {label} ]
				</div>
			) : null}
			{veil > 0 ? (
				<div style={{ position: "absolute", inset: 0, background: rgbs([252, 253, 254], veil) }} />
			) : null}
		</div>
	);
}

/** The agent "team" chip: white rounded square with a soft rim and an Avatar
 *  (stand-in for the mascot art). */
function TeamChip({ x, y, d, c1, c2, glyph = null, z = 0 }) {
	const r = d * 0.235;
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: d,
				height: d,
				borderRadius: r,
				background: "#fff",
				boxShadow: `0 0 0 ${Math.max(1, d * 0.011).toFixed(2)}px ${rgbs([228, 228, 228])}, 0 ${(d * 0.02).toFixed(2)}px ${(d * 0.06).toFixed(2)}px rgba(0,0,0,0.06)`,
				zIndex: z,
			}}
		>
			{glyph ? (
				<div style={{ position: "absolute", left: d * 0.2, top: d * 0.2 }}>
					<AppGlyph kind={glyph} size={d * 0.6} />
				</div>
			) : (
				<Avatar x={d / 2} y={d / 2} d={d * 0.62} c1={c1} c2={c2} />
			)}
		</div>
	);
}

const TEAM = [
	{ c1: [196, 170, 245], c2: [140, 110, 220] }, // purple companion
	{ c1: [150, 190, 235], c2: [80, 120, 180] }, // blue companion
	{ c1: [196, 232, 120], c2: [110, 170, 80] }, // green companion
];
const BEAR = { c1: [214, 150, 112], c2: [128, 78, 58] }; // the user's agent (brown)

// Text that types on: first n characters (n may be fractional — floor).
const typed = (s, n) => s.slice(0, Math.max(0, Math.min(s.length, Math.floor(n + 1e-6))));

// ── willow-s4-browser ──────────────────────────────────────────────────────

function NewTabPage({ cfg, ms, w }) {
	const nt = cfg.newtab ?? {};
	const g = kf(nt.tileKeys ?? [{ at: 0, dx: 0, dy: 0, s: 1, rot: 0 }], ms);
	const cx = w / 2;
	// tile layout, window-relative at rest (f763: blue doc bbox 521..665 x 72..270)
	const tiles = (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: w,
				height: 330,
				transform: `translate(${(g.dx ?? 0).toFixed(2)}px, ${(g.dy ?? 0).toFixed(2)}px) rotate(${(g.rot ?? 0).toFixed(2)}deg) scale(${(g.s ?? 1).toFixed(4)})`,
				transformOrigin: `${cx}px 140px`,
			}}
		>
			{/* companions pill — character-art slot (f752: 515..762 x 300..372) */}
			<div
				style={{
					position: "absolute",
					left: 377,
					top: 173,
					width: 247,
					height: 72,
					borderRadius: 36,
					background: rgbs([240, 240, 238]),
					display: "flex",
					alignItems: "flex-end",
					justifyContent: "center",
					paddingBottom: 8,
					boxSizing: "border-box",
				}}
			>
				<span
					style={{
						font: `500 11px ${FONT}`,
						color: rgbs([150, 150, 150]),
						letterSpacing: "0.02em",
					}}
				>
					character art — team
				</span>
			</div>
			{/* notes tile: white face, heavy black rim + extruded side (f760 403..530 x 78..265, ~-18deg) */}
			<div
				style={{
					position: "absolute",
					left: 270,
					top: 52,
					width: 118,
					height: 132,
					transform: "rotate(-18deg)",
				}}
			>
				<div
					style={{
						position: "absolute",
						left: 12,
						top: 14,
						width: 108,
						height: 122,
						borderRadius: 14,
						background: "#111",
					}}
				/>
				<div
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						width: 108,
						height: 122,
						borderRadius: 14,
						background: "#fff",
						border: "7px solid #111",
						boxSizing: "border-box",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: 22,
							top: 30,
							width: 52,
							height: 9,
							borderRadius: 5,
							background: "#111",
						}}
					/>
					<div
						style={{
							position: "absolute",
							left: 22,
							top: 50,
							width: 52,
							height: 9,
							borderRadius: 5,
							background: "#111",
						}}
					/>
					<div
						style={{
							position: "absolute",
							left: 22,
							top: 70,
							width: 34,
							height: 9,
							borderRadius: 5,
							background: "#111",
						}}
					/>
				</div>
			</div>
			{/* doc tile: blue->violet page with folded corner (f760 525..669 x 74..272) */}
			<div
				style={{
					position: "absolute",
					left: 389,
					top: 21,
					width: 140,
					height: 196,
					transform: "rotate(-3deg)",
					filter: "drop-shadow(0 6px 10px rgba(40,60,140,0.18))",
				}}
			>
				<svg width="140" height="196" viewBox="0 0 140 196">
					<defs>
						<linearGradient id="s4doc" x1="0" y1="0" x2="0.3" y2="1">
							<stop offset="0" stopColor={rgbs([58, 128, 246])} />
							<stop offset="0.65" stopColor={rgbs([90, 130, 244])} />
							<stop offset="1" stopColor={rgbs([170, 120, 236])} />
						</linearGradient>
					</defs>
					<path
						d="M16 0H92L140 48V180A16 16 0 0 1 124 196H16A16 16 0 0 1 0 180V16A16 16 0 0 1 16 0Z"
						fill="url(#s4doc)"
					/>
					<path d="M92 0V36A12 12 0 0 0 104 48H140Z" fill={rgbs([140, 186, 250])} />
					<rect x="34" y="114" width="60" height="13" rx="6.5" fill="#fff" />
					<rect x="34" y="140" width="60" height="13" rx="6.5" fill="#fff" />
				</svg>
			</div>
			{/* slides tile: yellow with white frame and a warm underside (f760 620..815 x 122..300, ~-12deg) */}
			<div
				style={{
					position: "absolute",
					left: 490,
					top: 82,
					width: 168,
					height: 142,
					transform: "rotate(-12deg)",
				}}
			>
				<div
					style={{
						position: "absolute",
						left: 6,
						top: 12,
						width: 168,
						height: 142,
						borderRadius: 26,
						background: "linear-gradient(135deg, rgb(250,170,60), rgb(240,120,170))",
					}}
				/>
				<div
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						width: 168,
						height: 142,
						borderRadius: 26,
						background: "linear-gradient(160deg, rgb(255,222,40), rgb(248,190,10))",
						boxShadow: "inset 0 2px 0 rgba(255,255,255,0.5)",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: 30,
							top: 33,
							width: 108,
							height: 72,
							borderRadius: 6,
							border: "11px solid #fff",
							boxSizing: "border-box",
						}}
					/>
				</div>
			</div>
		</div>
	);
	// heading "Ask <mark> Brand" (f760: cap 28px, baseline y 382 -> rel 329)
	return (
		<>
			{tiles}
			<div
				style={{
					position: "absolute",
					left: 0,
					width: w,
					top: 329 - 39,
					display: "flex",
					justifyContent: "center",
					alignItems: "baseline",
					gap: 10,
					lineHeight: "40px",
				}}
			>
				<span
					style={{
						font: `400 40px/40px ${FONT}`,
						color: rgbs([36, 36, 36]),
						letterSpacing: "-0.02em",
					}}
				>
					{nt.heading ?? "Ask"}
				</span>
				<span style={{ display: "inline-block", width: 50, height: 40, position: "relative" }}>
					<span style={{ position: "absolute", left: 4, top: -1 }}>
						<BrandMark size={48} />
					</span>
				</span>
				<span
					style={{
						font: `400 43px/40px ${SERIF}`,
						color: rgbs([36, 36, 36]),
						letterSpacing: "-0.01em",
					}}
				>
					{nt.brand ?? "Strawberry"}
				</span>
			</div>
			{/* composer (f760: 363..916 x 410..538 -> rel 225..778 x 357..485) */}
			<div
				style={{
					position: "absolute",
					left: 225,
					top: 357,
					width: 553,
					height: 128,
					borderRadius: 30,
					background: "#fff",
					boxShadow: `0 0 0 1.5px ${rgbs([228, 232, 236])}, 0 8px 18px rgba(30,30,60,0.07)`,
				}}
			>
				<div
					style={{
						position: "absolute",
						left: 23,
						top: 21,
						lineHeight: 1,
						font: `400 29px/1 ${FONT}`,
						color: rgbs([178, 178, 178]),
						letterSpacing: "-0.015em",
						whiteSpace: "nowrap",
					}}
				>
					{nt.placeholder ?? "Ask Strawberry..."}
				</div>
				<svg
					width="22"
					height="22"
					viewBox="0 0 22 22"
					style={{ position: "absolute", left: 23, top: 78 }}
				>
					<path d="M11 1v20M1 11h20" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
				</svg>
				<div
					style={{
						position: "absolute",
						left: 486,
						top: 66,
						width: 48,
						height: 48,
						borderRadius: 24,
						background: rgbs(P.sendBlue),
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<svg width="22" height="22" viewBox="0 0 22 22">
						<path
							d="M11 18V4M4.5 10.5L11 4l6.5 6.5"
							stroke="#fff"
							strokeWidth="2.4"
							fill="none"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>
			</div>
		</>
	);
}

/** The drawn chat sidebar (f1040: x 850..1118 of a 152..1129 window). Local
 *  coords are sidebar-relative (0,0 = its top-left at y=128). */
function Sidebar({ sb, w, h }) {
	const t = sb.text ?? {};
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: w,
				height: h,
				background: "#fff",
				borderLeft: `1px solid ${rgbs([234, 236, 238])}`,
				boxSizing: "border-box",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: 11,
					top: 9,
					display: "flex",
					alignItems: "center",
					gap: 6,
				}}
			>
				<BrandMark size={13} />
				<span style={{ font: `600 11.5px ${FONT}`, color: rgbs(P.ink), letterSpacing: "-0.01em" }}>
					{t.header ?? "Research deck"}
				</span>
			</div>
			<svg
				width="12"
				height="12"
				viewBox="0 0 12 12"
				style={{ position: "absolute", left: 245, top: 10 }}
			>
				<path d="M2 2l8 8M10 2l-8 8" stroke="#222" strokeWidth="1.5" strokeLinecap="round" />
			</svg>
			{/* user bubble 932..1104 x 192..238 */}
			<div
				style={{
					position: "absolute",
					right: 14,
					top: 64,
					width: 172,
					minHeight: 46,
					boxSizing: "border-box",
					padding: "7px 14px 8px 20px",
					borderRadius: 23,
					background: rgbs(P.bubble),
					font: `500 12.5px/16px ${FONT}`,
					color: rgbs(P.ink),
					letterSpacing: "-0.01em",
				}}
			>
				{t.prompt}
			</div>
			<Avatar x={41} y={128} d={26} c1={BEAR.c1} c2={BEAR.c2} />
			<div
				style={{
					position: "absolute",
					left: 32,
					top: 150,
					font: `400 12px ${FONT}`,
					color: rgbs(P.ink),
					letterSpacing: "-0.01em",
					whiteSpace: "nowrap",
				}}
			>
				{t.reply}
			</div>
			{TEAM.map((c, i) => (
				<TeamChip key={i} x={28 + i * 30} y={178} d={30} c1={c.c1} c2={c.c2} z={i} />
			))}
			<TeamChip x={28} y={218} d={32} glyph="slides" />
			<div
				style={{
					position: "absolute",
					left: 67,
					top: 226,
					font: `400 12px ${FONT}`,
					color: rgbs(P.status),
					letterSpacing: "-0.01em",
					whiteSpace: "nowrap",
				}}
			>
				{t.status}
			</div>
			{/* composer 862..1106 x 578..636 */}
			<div
				style={{
					position: "absolute",
					left: 12,
					top: 450,
					width: 244,
					height: 58,
					borderRadius: 14,
					background: "#fff",
					boxShadow: `0 0 0 1px ${rgbs(P.hair)}`,
				}}
			>
				<div
					style={{
						position: "absolute",
						left: 10,
						top: 8,
						font: `400 13px ${FONT}`,
						color: rgbs([120, 120, 120]),
						whiteSpace: "nowrap",
					}}
				>
					{t.followup ?? "Ask a follow-up..."}
				</div>
				<svg
					width="10"
					height="10"
					viewBox="0 0 10 10"
					style={{ position: "absolute", left: 10, top: 34 }}
				>
					<path d="M5 0.5v9M0.5 5h9" stroke="#111" strokeWidth="1.3" />
				</svg>
				<div
					style={{
						position: "absolute",
						left: 166,
						top: 30,
						width: 34,
						height: 18,
						borderRadius: 9,
						background: rgbs([242, 242, 240]),
					}}
				>
					<Avatar x={11} y={9} d={14} c1={BEAR.c1} c2={BEAR.c2} />
				</div>
				<div
					style={{
						position: "absolute",
						left: 216,
						top: 30,
						width: 19,
						height: 19,
						borderRadius: 10,
						background: rgbs(P.send),
					}}
				/>
			</div>
		</div>
	);
}

function BrowserRender(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const r = cfg.rect ?? { x: 133, y: 53, w: 1013, h: 614 };
	const bz = cfg.bezel ?? 10;
	const chromeH = cfg.chromeH ?? 55;
	const cam = kf(cfg.cam ?? [{ at: 0, s: 1, dx: 0, dy: 0 }], ms);
	const rise = kf(cfg.riseKeys ?? [{ at: 0, y: 0 }], ms).y ?? 0;
	const innerW = r.w - bz * 2,
		innerH = r.h - bz * 2;
	const pageTop = chromeH; // inner-relative
	const sbW = cfg.sidebar ? (cfg.sidebar.w ?? 268) : 0;
	const app = cfg.app ?? {};
	const shadowK = cfg.shadow ?? 1;

	const win = (
		<div
			style={{
				position: "absolute",
				left: r.x,
				top: r.y + rise,
				width: r.w,
				height: r.h,
				borderRadius: cfg.radius ?? 22,
				background: rgbs(P.bezel),
				boxShadow: `0 0 0 1px rgba(120,80,70,${(0.07 * shadowK).toFixed(3)}), 0 2px 7px rgba(120,70,60,${(0.1 * shadowK).toFixed(3)})`,
			}}
		>
			<div
				style={{
					position: "absolute",
					left: bz,
					top: bz,
					width: innerW,
					height: innerH,
					borderRadius: (cfg.radius ?? 22) - 7,
					overflow: "hidden",
					background: rgbs(P.page),
				}}
			>
				{/* chrome bar */}
				<div
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						width: innerW,
						height: chromeH,
						background: rgbs(P.chrome),
					}}
				/>
				<TrafficLights x={21} y={chromeH / 2 + 1} />
				<Tabs x={cfg.tabsX ?? 120} cy={chromeH / 2 + 1} tabs={cfg.tabs ?? []} />
				{cfg.pill ? (
					<div
						style={{
							position: "absolute",
							right: cfg.pill.right ?? 27,
							top: chromeH / 2 + 1 - 22.5,
							height: 45,
							padding: "0 17px 0 15px",
							borderRadius: 10,
							background: rgbs(P.pill),
							display: "flex",
							alignItems: "center",
							gap: 5,
						}}
					>
						<BrandMark size={14} />
						<span
							style={{ font: `500 16px ${FONT}`, color: rgbs(P.ink), letterSpacing: "-0.01em" }}
						>
							{cfg.pill.label ?? "Chat"}
						</span>
					</div>
				) : null}
				{/* page */}
				<div
					style={{
						position: "absolute",
						left: 0,
						top: pageTop,
						width: innerW,
						height: innerH - pageTop,
					}}
				>
					{cfg.mode === "newtab" ? (
						<div
							style={{
								position: "absolute",
								left: -bz,
								top: -(pageTop + bz),
								width: r.w,
								height: r.h,
							}}
						>
							<NewTabPage cfg={cfg} ms={ms} w={r.w} />
						</div>
					) : (
						<>
							<Slot
								x={0}
								y={0}
								w={app.slotW ?? innerW - sbW}
								h={innerH - pageTop}
								label={app.slotLabel ?? "app footage"}
								veil={app.veil ?? 0}
								labelAt={app.labelAt ?? null}
								labelSize={app.labelSize ?? null}
							/>
							{app.strip ? (
								<div
									style={{
										position: "absolute",
										left: app.slotW,
										top: 0,
										width: app.strip,
										height: innerH - pageTop,
										background: rgbs([249, 250, 252]),
									}}
								/>
							) : null}
							{cfg.sidebar ? (
								<div style={{ position: "absolute", left: innerW - sbW, top: 0 }}>
									<Sidebar sb={cfg.sidebar} w={sbW} h={innerH - pageTop} />
								</div>
							) : null}
						</>
					)}
				</div>
			</div>
		</div>
	);

	// Agent cursors ride the window (home-frame coords), drawn under the camera.
	const agents = (cfg.agents ?? []).map((a, i) => {
		const k = kf(a.keys, ms);
		if ((k.o ?? 1) <= 0.001) return null;
		return (
			<AgentCursor
				key={i}
				x={k.x}
				y={k.y}
				size={a.size ?? 40}
				colour={a.colour}
				rot={k.rot ?? 0}
				opacity={k.o ?? 1}
			/>
		);
	});

	// The hand rides the camera position-wise but keeps its own size.
	let hand = null;
	if (cfg.hand) {
		const hk = kf(cfg.hand, ms);
		if ((hk.o ?? 1) > 0.001) {
			const [hx, hy] = camPt(cam, hk.x, hk.y);
			hand = <Hand x={hx} y={hy} h={hk.size ?? 47} press={hk.press ?? 0} opacity={hk.o ?? 1} />;
		}
	}

	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			<Cam s={cam.s} dx={cam.dx} dy={cam.dy}>
				{win}
				{agents}
			</Cam>
			{hand}
		</div>
	);
}

// ── willow-s4-chat (close-up panel) ────────────────────────────────────────

function caretOn(cfg, ms) {
	// caret: solid while typing; after the last key 6 frames off, then 8 on / 8 off (f849–f881)
	const c = cfg.caret ?? {};
	const f = (ms * 24) / 1000;
	if (f < (c.doneF ?? 0)) return true;
	if (f < (c.blinkF ?? 0)) return false;
	return Math.floor((f - (c.blinkF ?? 0)) / 8) % 2 === 0;
}

function ComposerCloseup(cfg, ms) {
	const tx = cfg.text ?? {};
	const pan = kf(cfg.pan ?? [{ at: 0, y: 0 }], ms).y ?? 0;
	const n = kf(cfg.typeKeys ?? [{ at: 0, n: 999 }], ms).n ?? 999;
	const press = kf(cfg.sendPress ?? [{ at: 0, p: 0 }], ms).p ?? 0;
	const shown = typed(tx.prompt ?? "", n);
	const sendC = [0, 1, 2].map((i) => lerp(P.send[i], P.sendPress[i], press));
	return (
		<div style={{ position: "absolute", inset: 0, transform: `translateY(${pan.toFixed(2)}px)` }}>
			{/* window corner: bezel 40px (inner 1128 x 598 -> outer 1168 x 638) */}
			<div
				style={{
					position: "absolute",
					left: -200,
					top: -800,
					width: 1368,
					height: 1438,
					borderRadius: 64,
					background: rgbs(P.bezel),
					boxShadow: "0 0 0 1px rgba(120,80,70,0.07), 0 4px 22px rgba(120,70,60,0.14)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: -200,
					top: -800,
					width: 1328,
					height: 1398,
					borderRadius: "0 0 46px 0",
					background: rgbs(P.page),
				}}
			/>
			{/* composer 176..1086 x 243..560, r 52, 2px hairline */}
			<div
				style={{
					position: "absolute",
					left: 176,
					top: 243,
					width: 910,
					height: 317,
					boxSizing: "border-box",
					borderRadius: 54,
					border: `2px solid ${rgbs(P.hair)}`,
					background: "#fff",
				}}
			>
				<div
					style={{
						position: "absolute",
						left: 40,
						top: 54,
						font: `600 48.5px/48.5px ${FONT}`,
						color: rgbs(P.ink),
						letterSpacing: "-0.04em",
						whiteSpace: "nowrap",
						display: "flex",
						alignItems: "center",
					}}
				>
					<span>{shown}</span>
					{caretOn(cfg, ms) ? (
						<span
							style={{
								display: "inline-block",
								width: 3,
								height: 50,
								marginLeft: 3,
								background: rgbs(P.ink),
							}}
						/>
					) : null}
				</div>
				<svg
					width="34"
					height="34"
					viewBox="0 0 34 34"
					style={{ position: "absolute", left: 39, top: 228 }}
				>
					<path d="M17 2v30M2 17h30" stroke="#111" strokeWidth="3.2" strokeLinecap="round" />
				</svg>
				{/* agent chip 818..950 x 450..532 */}
				<div
					style={{
						position: "absolute",
						left: 640,
						top: 205,
						width: 134,
						height: 82,
						borderRadius: 41,
						background: rgbs([242, 242, 240]),
					}}
				>
					<Avatar x={52} y={41} d={56} c1={BEAR.c1} c2={BEAR.c2} />
					<svg
						width="16"
						height="26"
						viewBox="0 0 16 26"
						style={{ position: "absolute", left: 96, top: 28 }}
					>
						<path
							d="M3 9l5-5 5 5M3 17l5 5 5-5"
							stroke={rgbs([150, 150, 150])}
							strokeWidth="2"
							fill="none"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>
				{/* send c(1015,491) d79 */}
				<div
					style={{
						position: "absolute",
						left: 798,
						top: 207,
						width: 79,
						height: 79,
						borderRadius: 40,
						background: rgbs(sendC),
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<svg width="40" height="40" viewBox="0 0 40 40">
						<path
							d="M20 33V8M8.5 19.5L20 8l11.5 11.5"
							stroke="#fff"
							strokeWidth="4"
							fill="none"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>
			</div>
		</div>
	);
}

/** Shimmer: a light band sweeping left->right through grey status text. */
function Shimmer({ text, style, x }) {
	if (x == null) return <span style={{ ...style }}>{text}</span>;
	const g = `linear-gradient(90deg, ${rgbs(P.status)} 0px, ${rgbs(P.status)} ${(x - 90).toFixed(0)}px, ${rgbs([214, 214, 214])} ${x.toFixed(0)}px, ${rgbs(P.status)} ${(x + 90).toFixed(0)}px, ${rgbs(P.status)} 4000px)`;
	return (
		<span
			style={{
				...style,
				color: "transparent",
				backgroundImage: g,
				WebkitBackgroundClip: "text",
				backgroundClip: "text",
			}}
		>
			{text}
		</span>
	);
}

function ThreadCloseup(cfg, ms) {
	const tx = cfg.text ?? {};
	const scroll = kf(cfg.scroll ?? [{ at: 0, y: 0 }], ms).y ?? 0;
	const cam = kf(cfg.cam ?? [{ at: 0, s: 1, dx: 0, dy: 0 }], ms);
	const bub = kf(cfg.bubbleKeys ?? [{ at: 0, o: 1, dy: 0 }], ms);
	const rep = kf(cfg.replyKeys ?? [{ at: 0, o: 1, dx: 0 }], ms);
	const rows = cfg.rows ?? [];
	const ROW0 = cfg.row0Y ?? 602,
		PITCH = cfg.rowPitch ?? 194,
		CHIP = 137,
		CPITCH = 125;
	const textStyle = {
		font: `400 54px ${FONT}`,
		letterSpacing: "-0.05em",
		whiteSpace: "nowrap",
		lineHeight: "64px",
	};
	return (
		<div style={{ position: "absolute", inset: 0, background: rgbs(P.page) }}>
			<Cam s={cam.s} dx={cam.dx} dy={cam.dy}>
				<div
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						width: 1280,
						height: 720,
						transform: `translateY(${scroll.toFixed(2)}px)`,
					}}
				>
					{(bub.o ?? 1) > 0.001 ? (
						<div
							style={{
								position: "absolute",
								right: 1280 - 1162,
								top: 88 + (bub.dy ?? 0),
								width: 666,
								minHeight: 213,
								boxSizing: "border-box",
								padding: "40px 40px 45px 42px",
								borderRadius: 60,
								background: rgbs(P.bubble),
								opacity: bub.o ?? 1,
								font: `500 53px/64px ${FONT}`,
								color: rgbs(P.ink),
								letterSpacing: "-0.04em",
							}}
						>
							{tx.prompt}
						</div>
					) : null}
					{(rep.o ?? 1) > 0.001 ? (
						<>
							<Avatar x={162} y={378} d={112} c1={BEAR.c1} c2={BEAR.c2} opacity={rep.o ?? 1} />
							<div
								style={{
									position: "absolute",
									left: 118 + (rep.dx ?? 0),
									top: 470,
									color: rgbs(P.ink),
									opacity: rep.o ?? 1,
									...textStyle,
									font: `400 53px ${FONT}`,
								}}
							>
								{tx.reply}
							</div>
						</>
					) : null}
					{rows.map((row, i) => {
						// separate channels: o/chips/label step on hold keys, n types on linearly,
						// the newest chip drops in, the shimmer sweeps.
						const k = kf(row.keys, ms);
						if ((k.o ?? 0) <= 0.001) return null;
						const y = ROW0 + i * PITCH;
						const chips = Math.round(k.chips ?? 1);
						const chipDrop = row.dropKeys ? (kf(row.dropKeys, ms).drop ?? 0) : 0;
						const nShown = row.nKeys ? (kf(row.nKeys, ms).n ?? 999) : 999;
						const shimX = row.shimKeys ? kf(row.shimKeys, ms).shim : null;
						const chipEls = [];
						for (let c = 0; c < chips; c++) {
							const last = c === chips - 1;
							chipEls.push(
								<div
									key={c}
									style={{
										position: "absolute",
										left: 98 + c * CPITCH,
										top: y + (last ? chipDrop : 0),
										transform:
											last && chipDrop ? `scale(${(1 - chipDrop * 0.004).toFixed(4)})` : undefined,
									}}
								>
									<TeamChip
										x={0}
										y={0}
										d={CHIP}
										c1={TEAM[(row.team ?? 0) + c]?.c1}
										c2={TEAM[(row.team ?? 0) + c]?.c2}
										glyph={row.glyph}
										z={c}
									/>
								</div>,
							);
						}
						const label = row.labels
							? row.labels[Math.min(row.labels.length - 1, Math.round(k.label ?? 0))]
							: row.label;
						const shownL = typed(label ?? "", nShown);
						const textX = 98 + (chips - 1) * CPITCH + CHIP + 44;
						return (
							<div key={i} style={{ opacity: k.o ?? 1 }}>
								{chipEls}
								<div
									style={{
										position: "absolute",
										left: textX,
										top: y + 29,
										...textStyle,
										font: `400 53px ${FONT}`,
										color: rgbs(P.status),
									}}
								>
									<Shimmer
										text={shownL}
										style={{}}
										x={shimX != null && shimX > -900 ? shimX : null}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</Cam>
		</div>
	);
}

function ChatRender(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	if (cfg.phase === "composer")
		return (
			<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
				{ComposerCloseup(cfg, ms)}
			</div>
		);
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			{ThreadCloseup(cfg, ms)}
		</div>
	);
}

// ── willow-s4-toast ────────────────────────────────────────────────────────

function ToastRender(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const k = kf(cfg.keys ?? [{ at: 0, s: 1, dy: 0, o: 1 }], ms);
	if ((k.o ?? 1) <= 0.001) return null;
	const pr = kf(cfg.press ?? [{ at: 0, p: 0 }], ms).p ?? 0;
	const tx = cfg.text ?? {};
	// f1170: rim 263..993 x 263..536, fill [28,30,27]; button 298..652 x 421..501
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				transform: `translateY(${(k.dy ?? 0).toFixed(2)}px) scale(${(k.s ?? 1).toFixed(4)})`,
				transformOrigin: "990px 400px",
				opacity: k.o ?? 1,
			}}
		>
			<div
				style={{
					position: "absolute",
					left: 263,
					top: 263,
					width: 730,
					height: 273,
					boxSizing: "border-box",
					borderRadius: 62,
					background: rgbs(P.toast),
					border: `2.5px solid ${rgbs(P.toastRim)}`,
					boxShadow: "0 14px 34px rgba(0,0,0,0.22), 0 3px 8px rgba(0,0,0,0.12)",
				}}
			>
				<div style={{ position: "absolute", left: 37, top: 47 }}>
					<AppGlyph kind="video" size={88} />
				</div>
				<div
					style={{
						position: "absolute",
						left: 164,
						top: 34,
						font: `600 34px ${FONT}`,
						color: "#fff",
						letterSpacing: "-0.015em",
						whiteSpace: "nowrap",
					}}
				>
					{tx.title ?? "Meeting starting now"}
				</div>
				<div
					style={{
						position: "absolute",
						left: 164,
						top: 80,
						font: `400 34px ${FONT}`,
						color: rgbs([138, 138, 136]),
						letterSpacing: "-0.01em",
						whiteSpace: "nowrap",
					}}
				>
					{tx.sub ?? "Video call · abc-defg-hij"}
				</div>
				<div style={{ position: "absolute", left: 664, top: 50, display: "flex", gap: 5 }}>
					{[0, 1, 2].map((i) => (
						<div
							key={i}
							style={{ width: 6, height: 6, borderRadius: 3, background: rgbs([150, 150, 150]) }}
						/>
					))}
				</div>
				<div
					style={{
						position: "absolute",
						left: 33,
						top: 156,
						height: 80,
						padding: "0 28px 0 18px",
						borderRadius: 18,
						background: "#fff",
						display: "flex",
						alignItems: "center",
						gap: 14,
						transform: `scale(${(1 - 0.018 * pr).toFixed(4)})`,
						transformOrigin: "30% 50%",
					}}
				>
					<div style={{ position: "relative", width: 54, height: 54 }}>
						<Avatar x={27} y={27} d={50} c1={[176, 150, 230]} c2={[110, 80, 190]} />
					</div>
					<span
						style={{
							font: `600 35px ${FONT}`,
							color: rgbs(P.ink),
							letterSpacing: "-0.015em",
							whiteSpace: "nowrap",
						}}
					>
						{tx.button ?? "Join and record"}
					</span>
				</div>
			</div>
		</div>
	);
}

// ── willow-s4-hand ─────────────────────────────────────────────────────────

function HandRender(cfg, t) {
	if (!live(cfg, t)) return null;
	const k = kf(cfg.keys ?? [], localMs(cfg, t));
	if ((k.o ?? 1) <= 0.001 || k.x == null) return null;
	return <Hand x={k.x} y={k.y} h={k.size ?? 50} press={k.press ?? 0} opacity={k.o ?? 1} />;
}

export const S4_PRESETS = {
	"willow-s4-browser": {
		note: "willow S4: a drawn browser window (rim, tab bar with neutral glyph tabs, brand 'Chat' pill) holding a new-tab page (glyph tiles + 'Ask <brand>' composer) or an app page (dashed footage SLOT + optional drawn chat sidebar), with agent cursors and a hand, all under one keyed camera {s,dx,dy} about frame centre. Measured on Strawberry 31.3-49.2s: home rects 1004x609 / 1013x614 / 977x592, 10px rim, 55px chrome; punch to the Chat pill 1.00->3.00 about (1282,-44) over f794-f812 (slow-in, fast-through, decelerating out); pull-back 2.75->1.00 on twos over f1019-f1035.",
		nativeMs: 4000,
		params: {
			mode: ["string", "app", "'newtab' | 'app'"],
			rect: ["object", "{x,y,w,h}", "window outer rect at camera 1.0"],
			tabs: ["array", "[]", "[{glyph:'newtab'|'notes'|'doc'|'slides', label, active}]"],
			pill: ["object", "null", "{label:'Chat'} brand pill at the right of the tab bar"],
			cam: [
				"array",
				"[{at:0,s:1,dx:0,dy:0}]",
				"scene-relative camera keys (kf; 'hold' for on-twos steps)",
			],
			riseKeys: ["array", "[{at:0,y:0}]", "window-only vertical offset keys (the new-tab rise)"],
			newtab: ["object", "{}", "{heading, brand, placeholder, tileKeys:[{at,dx,dy,s,rot}]}"],
			app: ["object", "{}", "{slotLabel, slotW, veil}"],
			sidebar: ["object", "null", "{w:268, text:{header,prompt,reply,status,followup}}"],
			agents: ["array", "[]", "[{colour, size, keys:[{at,x,y,rot,o}]}] home-frame coords"],
			hand: [
				"array",
				"null",
				"hand keys [{at,x,y,size,press,o}] in home-frame coords (rides the camera)",
			],
		},
		render: BrowserRender,
	},
	"willow-s4-chat": {
		note: "willow S4: the chat panel in close-up. phase 'composer': the window's bottom-right corner (40px rim) with the prompt composer (910x317, r54) — prompt types on (~35px/frame, f829-f849), caret blinks 8/8 frames, send presses on the click frames; pan settles up 114px over 13 frames. phase 'thread': full-bleed white — user bubble rises in (67px, x0.6/frame), agent avatar + reply slides in 17px, status rows with stacked team chips type on (~1.3-1.8 chars/frame), a light shimmer sweeps the live row; scroll keys and a slow zoom-out camera.",
		nativeMs: 5700,
		params: {
			phase: ["string", "thread", "'composer' | 'thread'"],
			text: ["object", "{}", "{prompt, reply}"],
			typeKeys: ["array", "", "composer: [{at,n}] characters shown"],
			caret: ["object", "{}", "composer: {doneF, blinkF} scene-relative frames"],
			pan: ["array", "", "composer: [{at,y}] vertical offset"],
			sendPress: ["array", "", "composer: [{at,p}] 0..1 pressed"],
			bubbleKeys: ["array", "", "thread: [{at,o,dy}]"],
			replyKeys: ["array", "", "thread: [{at,o,dx}]"],
			rows: [
				"array",
				"[]",
				"thread: [{labels:[...], team, glyph, keys:[{at,o,chips,label}] (hold), nKeys:[{at,n}], dropKeys:[{at,drop}], shimKeys:[{at,shim}]}]",
			],
			scroll: ["array", "", "thread: [{at,y}] content offset"],
			cam: ["array", "", "thread: [{at,s,dx,dy}] camera about frame centre"],
		},
		render: ChatRender,
	},
	"willow-s4-toast": {
		note: "willow S4: dark rounded notification toast (730x273, r62, [28,30,27] with a grey rim) — neutral video glyph, bold title, grey meta line, '•••', white action pill with an avatar. Enters on f1149 at 0.967 scale 40px low and settles up over 6 frames about its right edge; the action pill dips 1.8% while pressed.",
		nativeMs: 1400,
		params: {
			text: ["object", "{}", "{title, sub, button}"],
			keys: ["array", "", "[{at,s,dy,o}]"],
			press: ["array", "", "[{at,p}] button press 0..1"],
		},
		render: ToastRender,
	},
	"willow-s4-hand": {
		note: "willow S4: the human pointing hand on keyed screen-space paths; press 0..1 squashes it for a click.",
		nativeMs: 2000,
		params: { keys: ["array", "[]", "[{at,x,y,size,press,o,ease}]"] },
		render: HandRender,
	},
};
