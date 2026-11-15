/**
 * cypress-shared.jsx — the vocabulary every cypress preset is built from.
 *
 * Measured off a 62.5s "AI joins your video call" feature launch film
 * (1920x1080 @24fps, 1501 frames), sampled on its own 24fps clock and mapped
 * to the 1280x720 stage (stage px = reference px / 1.5). Frame numbers in
 * comments are reference frames, f0 = t 0.
 *
 * The film lives in two worlds and cuts between them on hard frames:
 *
 *   CALL    near-black ground [0,1,0], tiles [21,23,20] with an 8 px radius,
 *           name chips [7,9,6] with a mic glyph. The AI participant is a tile
 *           with a coral blob [208,111,87] that grows a white hand-drawn line
 *           (a sunrise while it talks, a loop while it works) and a status
 *           line under it ("Hey team", "Taking notes...").
 *   CREAM   warm paper [250,249,244]. Serif claims, dark voice bubbles that
 *           transcribe a request word by word, the agent's reply bubble, a
 *           whiteboard with a faint square grid, sticky notes, multiplayer
 *           name-tag cursors, and a small call window docked top-right.
 *
 * Every export is a pure function of its props / t. Nothing animates on a
 * wall clock.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";

// ── type ──────────────────────────────────────────────────────────────────

/** Book serif for claims and the wordmark (the reference uses a text serif). */
export const SERIF = `"Georgia", "Cambria", "Times New Roman", serif`;
/** Interface grotesk for the call UI, bubbles, notes and chat. */
export const SANS = `"Segoe UI", "Inter", system-ui, sans-serif`;
/** Heavy grotesk for whiteboard headings and column titles. */
export const HEAVY = `"Segoe UI", "Inter", system-ui, sans-serif`;
/** Note handwriting is set in the interface sans in the reference, too. */

// ── colour ────────────────────────────────────────────────────────────────

export const rgbs = (c, a = 1) =>
	a >= 1
		? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
		: `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, a).toFixed(4)})`;

export const mix = (a, b, p) => a.map((v, i) => lerp(v, b[i], clamp01(p)));

/** Measured palette (sampled from reference frames, not invented). */
export const P = {
	black: [0, 1, 0], // f100 corner: call ground, chat ground
	tile: [21, 23, 20], // f210 tile body
	chip: [7, 9, 6], // f210 name chip
	chipLine: [14, 16, 13], // f390 chip on a full-frame tile
	coral: [208, 111, 87], // f390 blob core
	paper: [250, 249, 244], // f330 cream ground
	white: [250, 249, 244], // glyph strokes are paper-white, not pure white
	bubble: [21, 23, 20], // f330 voice bubble body
	bubbleRing: [82, 81, 77], // f330 icon ring
	bubbleText: [236, 235, 230],
	bubbleMuted: [118, 118, 112], // words not yet spoken
	replyText: [204, 203, 198],
	ink: [24, 24, 22], // serif claim ink
	gridLine: [232, 231, 226], // whiteboard grid on paper
	// sticky notes, f600
	noteBlue: [193, 226, 243],
	noteLilac: [227, 217, 244],
	notePeach: [248, 211, 193],
	noteYellow: [248, 235, 167],
	noteGreen: [214, 240, 201],
	notePink: [246, 214, 228],
	noteInk: [36, 36, 34],
	end: [214, 18, 30], // call "End" button red
	highlight: [170, 204, 209], // word-swap selection
};

/** Name-tag cursor colours, one per collaborator (label fill). */
export const TAG = {
	blue: [52, 96, 196],
	violet: [104, 70, 196],
	red: [178, 28, 50],
	pink: [196, 64, 112],
	teal: [26, 128, 112],
	coral: [208, 111, 87], // the agent
};

// ── time ──────────────────────────────────────────────────────────────────

export const FPS = 24;

/** Reference frame F at film time t for scene c (c.f0 = its first ref frame). */
export const refFrame = (c, t, f0) => (t * 1000 - c.startMs) * (FPS / 1000) + (c.f0 ?? f0);

export const EASE = {
	l: (p) => p,
	io: (p) => p * p * (3 - 2 * p),
	o: (p) => 1 - (1 - p) * (1 - p),
	o3: (p) => 1 - (1 - p) ** 3,
	o5: (p) => 1 - (1 - p) ** 5,
	i: (p) => p * p,
	i3: (p) => p * p * p,
	sine: (p) => 0.5 - 0.5 * Math.cos(Math.PI * p),
};

/**
 * A measured curve: pts [[frame, value, ease?], ...], piecewise between
 * samples (ease names the segment ENDING at that sample, default linear),
 * held flat outside. Values may be numbers or arrays of numbers.
 */
export function curve(pts, f) {
	if (f <= pts[0][0]) return pts[0][1];
	for (let i = 0; i < pts.length - 1; i++) {
		const [fa, va] = pts[i];
		const [fb, vb, e] = pts[i + 1];
		if (f <= fb) {
			const p = (EASE[e] ?? EASE.l)(clamp01((f - fa) / Math.max(1e-6, fb - fa)));
			return Array.isArray(va) ? va.map((v, k) => lerp(v, vb[k], p)) : lerp(va, vb, p);
		}
	}
	return pts[pts.length - 1][1];
}

/** Deterministic pseudo-random in [0,1) from an integer. */
export const hash = (n) => {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

// ── stage ─────────────────────────────────────────────────────────────────

/** A full-stage layer. Everything a preset draws sits in one of these. */
export function Layer({ z = 10, children, style }) {
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1280,
				height: 720,
				overflow: "hidden",
				zIndex: z,
				...style,
			}}
		>
			{children}
		</div>
	);
}

/**
 * A 2D camera over a "world" drawn in its own px: the world point (cx, cy)
 * lands on stage centre at scale s. Use one per shot; key cx/cy/s with curve().
 */
export function Cam({ cx = 640, cy = 360, s = 1, children, style }) {
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1280,
				height: 720,
				transformOrigin: "0 0",
				transform: `translate(${640 - cx * s}px, ${360 - cy * s}px) scale(${s})`,
				...style,
			}}
		>
			{children}
		</div>
	);
}

let measureCtx = null;
/** Advance width of a string in a CSS font (system fonts, so deterministic). */
export function textWidth(str, font) {
	if (typeof document === "undefined")
		return str.length * 0.5 * Number.parseFloat(font.split("px")[0].split(" ").pop());
	if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
	measureCtx.font = font;
	return measureCtx.measureText(str).width;
}

// ── icons ─────────────────────────────────────────────────────────────────

/** Microphone glyph; `muted` adds the slash (the agent's chip is muted). */
export function MicIcon({ size = 14, colour = P.white, muted = false }) {
	const c = rgbs(colour);
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "none" }}>
			<rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill={c} />
			<path
				d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5"
				stroke={c}
				strokeWidth="2"
				fill="none"
				strokeLinecap="round"
			/>
			{muted ? <path d="M4 3l16 18" stroke={c} strokeWidth="2.2" strokeLinecap="round" /> : null}
		</svg>
	);
}

/**
 * Name chip: dark rounded label with a mic glyph, bottom-left of a tile.
 * Defaults are the f210 close-up chip. The f150 grid chip (86 x 34 for
 * "Claude" at 16 px: mic 8 px in, 9 px gap, 11 px right pad, a ~30% black
 * veil over the tile, [14,16,13] on [21,23,20]) is
 * `bg=[0,0,0] alpha=0.32 padL=7 gap=8 padR=11`.
 */
export function NameChip({
	name,
	k = 1,
	muted = false,
	bg = P.chip,
	opacity = 1,
	alpha = 0.82,
	padL = 10,
	padR = 12,
	gap = 10,
	colour = P.white,
}) {
	return (
		<div
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: gap * k,
				padding: `${7 * k}px ${padR * k}px ${7 * k}px ${padL * k}px`,
				borderRadius: 8 * k,
				background: rgbs(bg, alpha * opacity),
				font: `400 ${16 * k}px ${SANS}`,
				lineHeight: `${20 * k}px`,
				color: rgbs(colour, opacity),
				whiteSpace: "nowrap",
			}}
		>
			<div style={{ opacity }}>
				<MicIcon size={15 * k} muted={muted} colour={P.white} />
			</div>
			{name}
		</div>
	);
}

// ── the call (participant tiles, the control bar) ─────────────────────────

/**
 * CamStandIn — drawn stand-in for a webcam feed when no `photo` is given:
 * a soft room-tone wall with a lit side, and a blurred head-and-shoulders
 * silhouette that breathes a little with `f`. Everything is proportional
 * to w, so a tile can reflow through any size. Colours are per person.
 */
export function CamStandIn({
	w,
	h,
	room = [96, 84, 76],
	skin = [196, 150, 122],
	shirt = [52, 56, 66],
	hair = [58, 44, 36],
	f = 0,
	seed = 0,
	side = 1,
}) {
	const bob = Math.sin(f * 0.07 + seed * 1.7) * 0.006 * w;
	const sway = Math.sin(f * 0.045 + seed * 2.9) * 0.01 * w;
	const hx = w * 0.5 + sway;
	const hy = h * 0.44 + bob;
	const hr = w * 0.118;
	const lit = mix(room, [250, 244, 232], 0.5);
	const dark = mix(room, [8, 8, 8], 0.6);
	const blur = Math.max(0.6, w * 0.004);
	const win = side > 0 ? { left: w * 0.7, width: w * 0.24 } : { left: w * 0.06, width: w * 0.22 };
	const door = side > 0 ? { left: w * 0.04, width: w * 0.16 } : { left: w * 0.74, width: w * 0.17 };
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				overflow: "hidden",
				background: `linear-gradient(180deg, ${rgbs(mix(room, lit, 0.3))} 0%, ${rgbs(room)} 50%, ${rgbs(dark)} 100%)`,
			}}
		>
			{/* room: a lit window on one side, a darker door / shelf on the other */}
			<div
				style={{
					position: "absolute",
					...win,
					top: h * 0.08,
					height: h * 0.55,
					background: rgbs(lit, 0.8),
					filter: `blur(${blur * 3}px)`,
				}}
			/>
			<div
				style={{
					position: "absolute",
					...door,
					top: h * 0.14,
					height: h * 0.9,
					background: rgbs(mix(room, [0, 0, 0], 0.3), 0.7),
					filter: `blur(${blur * 2}px)`,
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					top: 0,
					height: h * 0.1,
					background: rgbs(mix(room, [0, 0, 0], 0.25), 0.6),
					filter: `blur(${blur * 2}px)`,
				}}
			/>
			{/* shoulders */}
			<div
				style={{
					position: "absolute",
					left: hx - w * 0.38,
					top: hy + hr * 1.3,
					width: w * 0.76,
					height: h * 0.8,
					borderRadius: "46% 46% 0 0 / 34% 34% 0 0",
					background: `linear-gradient(180deg, ${rgbs(mix(shirt, lit, 0.1))}, ${rgbs(mix(shirt, [0, 0, 0], 0.4))})`,
					filter: `blur(${blur}px)`,
				}}
			/>
			{/* neck */}
			<div
				style={{
					position: "absolute",
					left: hx - hr * 0.4,
					top: hy + hr * 0.75,
					width: hr * 0.8,
					height: hr * 0.75,
					borderRadius: "0 0 40% 40%",
					background: rgbs(mix(skin, [0, 0, 0], 0.22)),
					filter: `blur(${blur}px)`,
				}}
			/>
			{/* head */}
			<div
				style={{
					position: "absolute",
					left: hx - hr,
					top: hy - hr * 1.2,
					width: hr * 2,
					height: hr * 2.32,
					borderRadius: "47% 47% 44% 44% / 40% 40% 60% 60%",
					background: `radial-gradient(ellipse at ${side > 0 ? 60 : 40}% 40%, ${rgbs(mix(skin, [255, 242, 228], 0.2))}, ${rgbs(skin)} 55%, ${rgbs(mix(skin, [0, 0, 0], 0.32))})`,
					filter: `blur(${blur}px)`,
				}}
			/>
			{/* hair */}
			<div
				style={{
					position: "absolute",
					left: hx - hr * 1.08,
					top: hy - hr * 1.34,
					width: hr * 2.16,
					height: hr * 1.0,
					borderRadius: "50% 50% 22% 22% / 78% 78% 22% 22%",
					background: rgbs(hair),
					filter: `blur(${blur}px)`,
				}}
			/>
			<div
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.3) 100%)",
				}}
			/>
		</div>
	);
}

/**
 * PersonTile — one participant in the call grid, drawn at w x h (world px).
 * Camera on: the `photo` image slot (cover-cropped), else a CamStandIn.
 * Camera off: the tile body with a round avatar (0.236 x w, f60/f150) —
 * `avatarSrc` image slot, else initials on `tone`. Name chip bottom-left
 * (14 px in, 16 px up, fixed size as the tile reflows), and `speak` 0..1 is
 * the active-speaker ring: 3 px paper-white inside the edge (f150 June).
 */
export function PersonTile({
	w,
	h,
	name,
	photo,
	camOff = false,
	avatarSrc,
	muted = false,
	tone = [120, 130, 150],
	room,
	skin,
	shirt,
	hair,
	side,
	f = 0,
	seed = 0,
	speak = 0,
	radius = 8,
	opacity = 1,
	chipK = 1,
}) {
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: w,
				height: h,
				borderRadius: radius,
				overflow: "hidden",
				background: rgbs(P.tile),
				opacity,
			}}
		>
			{camOff ? (
				<div
					style={{
						position: "absolute",
						left: w / 2,
						top: h / 2,
						transform: "translate(-50%,-50%)",
					}}
				>
					<Avatar size={w * 0.236} name={name} src={avatarSrc} tone={tone} />
				</div>
			) : photo ? (
				<img
					src={photo}
					style={{ position: "absolute", left: 0, top: 0, width: w, height: h, objectFit: "cover" }}
				/>
			) : (
				<CamStandIn
					w={w}
					h={h}
					room={room}
					skin={skin}
					shirt={shirt}
					hair={hair}
					f={f}
					seed={seed}
					side={side}
				/>
			)}
			<div style={{ position: "absolute", left: 14 * chipK, bottom: 16 * chipK }}>
				<NameChip
					name={name}
					k={chipK}
					muted={muted}
					bg={[0, 0, 0]}
					alpha={0.32}
					padL={7}
					gap={8}
					padR={11}
					colour={[226, 226, 221]}
				/>
			</div>
			{speak > 0 ? (
				<div
					style={{
						position: "absolute",
						inset: 0,
						borderRadius: radius,
						boxShadow: `inset 0 0 0 3px ${rgbs([250, 252, 247], clamp01(speak))}`,
					}}
				/>
			) : null}
		</div>
	);
}

/**
 * SlotOutline — the dashed placeholder a new tile draws before it fills
 * (f121-f128): 7/5 px dashes, 1.5 px, warm grey, traced CLOCKWISE from
 * just under the top-right corner (down the right side first). `draw` 0..1.
 */
export function SlotOutline({
	w,
	h,
	draw = 1,
	radius = 8,
	colour = [196, 190, 186],
	opacity = 1,
	id = "slot",
}) {
	const r = radius;
	const d = `M${w} ${r + 2} L${w} ${h - r} Q${w} ${h} ${w - r} ${h} L${r} ${h} Q0 ${h} 0 ${h - r} L0 ${r} Q0 0 ${r} 0 L${w - r} 0 Q${w} 0 ${w} ${r}`;
	const p = clamp01(draw);
	if (p <= 0 || opacity <= 0) return null;
	return (
		<svg
			width={w}
			height={h}
			viewBox={`-2 -2 ${w + 4} ${h + 4}`}
			style={{ position: "absolute", left: -2, top: -2, overflow: "visible", opacity }}
		>
			<mask
				id={`${id}-m`}
				maskUnits="userSpaceOnUse"
				x={-10}
				y={-10}
				width={w + 20}
				height={h + 20}
			>
				<path
					d={d}
					pathLength={1}
					stroke="white"
					strokeWidth={6}
					fill="none"
					strokeDasharray={`${p} 2`}
				/>
			</mask>
			<path
				d={d}
				stroke={rgbs(colour)}
				strokeWidth={1.5}
				fill="none"
				strokeDasharray="7 5"
				mask={`url(#${id}-m)`}
			/>
		</svg>
	);
}

const BAR_ICON = {
	mic: (c) => (
		<>
			<rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill={c} />
			<path
				d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5"
				stroke={c}
				strokeWidth="2"
				fill="none"
				strokeLinecap="round"
			/>
		</>
	),
	cam: (c) => (
		<>
			<rect x="1.5" y="5.5" width="14" height="13" rx="2.5" fill={c} />
			<path d="M16.5 10.5l6-3.5v10l-6-3.5z" fill={c} />
		</>
	),
	share: (c) => (
		<>
			<rect x="2" y="3" width="20" height="14" rx="2" fill={c} />
			<path d="M10 7.2v5.6l4.6-2.8z" fill="#2a2c29" />
			<rect x="7" y="19.5" width="10" height="2" rx="1" fill={c} />
		</>
	),
	chat: (c) => (
		<>
			<path
				d="M3 4.5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-4 3v-3H3a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z"
				fill="none"
				stroke={c}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path
				d="M10 16.5h6l4 3v-3h1a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-2.5"
				fill="none"
				stroke={c}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
		</>
	),
	gear: (c) => (
		<>
			<path
				d="M12 1.8l2 .4.5 2.6 1.6.9 2.5-.9 1.4 1.5-.9 2.5.9 1.6 2.6.5.4 2-.4 2-2.6.5-.9 1.6.9 2.5-1.4 1.5-2.5-.9-1.6.9-.5 2.6-2 .4-2-.4-.5-2.6-1.6-.9-2.5.9-1.4-1.5.9-2.5-.9-1.6-2.6-.5-.4-2 .4-2 2.6-.5.9-1.6-.9-2.5 1.4-1.5 2.5.9 1.6-.9.5-2.6z"
				fill={c}
			/>
			<circle cx="12" cy="12" r="3.6" fill="#2a2c29" />
		</>
	),
	end: (c) => (
		<>
			<circle cx="12" cy="12" r="10" fill={c} />
			<path
				d="M8.4 8.4l7.2 7.2M15.6 8.4l-7.2 7.2"
				stroke="#c90003"
				strokeWidth="2.2"
				strokeLinecap="round"
			/>
		</>
	),
};

/**
 * CallBar — the call's bottom control bar (f150): a [21,23,20] band from
 * y 632, six 106 x 53 buttons on a 120 px pitch starting x 287, y 651,
 * [42,44,41] with a red [201,0,3] last button; 20 px icon + 16 px label.
 * `labels` retitles the buttons (UI copy).
 */
export function CallBar({
	y = 632,
	labels = ["Mute", "Off", "Share", "Chat", "Settings", "End"],
	opacity = 1,
}) {
	const icons = ["mic", "cam", "share", "chat", "gear", "end"];
	const txt = rgbs([226, 226, 222]);
	return (
		<div
			style={{
				position: "absolute",
				left: -400,
				top: y,
				width: 2080,
				height: 400,
				background: rgbs(P.tile),
				opacity,
			}}
		>
			{labels.map((l, i) => (
				<div
					key={i}
					style={{
						position: "absolute",
						left: 400 + 287 + 120 * i,
						top: 19,
						width: 106,
						height: 53,
						borderRadius: 8,
						background: i === labels.length - 1 ? rgbs(P.end) : rgbs([42, 44, 41]),
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 11,
						font: `400 16px ${SANS}`,
						color: i === labels.length - 1 ? "rgb(250,240,240)" : txt,
					}}
				>
					<svg
						width={21}
						height={21}
						viewBox="0 0 24 24"
						style={{ display: "block", flex: "none" }}
					>
						{BAR_ICON[icons[i] ?? "mic"](i === labels.length - 1 ? "rgb(250,246,246)" : txt)}
					</svg>
					{l}
				</div>
			))}
		</div>
	);
}

// ── the agent ─────────────────────────────────────────────────────────────

/**
 * The agent's blob: a coral disc whose outline wobbles (it reads as hand-cut
 * paper, never a perfect circle). `phase` drives the wobble, `r` its radius.
 */
export function blobPath(cx, cy, r, phase = 0, amp = 0.07) {
	const n = 64;
	let d = "";
	for (let i = 0; i <= n; i++) {
		const a = (i / n) * Math.PI * 2;
		const w =
			1 +
			amp * Math.sin(3 * a + phase * 1.3) +
			amp * 0.6 * Math.sin(2 * a - phase * 0.9 + 1.1) +
			amp * 0.35 * Math.sin(5 * a + phase * 0.7 + 2.3);
		const x = cx + Math.cos(a) * r * w;
		const y = cy + Math.sin(a) * r * w;
		d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
	}
	return `${d}Z`;
}

/** The white hand-drawn loop line the agent "draws" while it works. */
export const LOOP_PATH =
	"M-1.00 0.30 C-0.80 0.32 -0.62 0.30 -0.52 0.22 C-0.45 0.16 -0.55 0.08 -0.60 0.18 C-0.64 0.26 -0.52 0.32 -0.38 0.26 C-0.22 0.18 -0.14 -0.10 -0.12 -0.30 C-0.10 -0.52 -0.30 -0.52 -0.30 -0.30 C-0.30 -0.06 -0.12 0.24 0.06 0.24 C0.22 0.24 0.30 0.04 0.32 -0.14 C0.34 -0.34 0.16 -0.34 0.16 -0.14 C0.16 0.08 0.36 0.28 0.58 0.28 C0.74 0.28 0.86 0.30 1.00 0.30";

/** The sunrise glyph's horizon stroke (a gentle wave, measured f215: ±0.045). */
export const HORIZON_PATH = "M-1 0.03 C-0.62 -0.05 -0.3 0.07 0.02 0.035 C0.36 0 0.62 -0.05 1 -0.01";

/**
 * Sunrise rays, measured f215 in units of the horizon width (133 world px),
 * pivot at the horizon centre: [angle deg, inner radius, length, group].
 * Groups grow in order: the centre ray (f201), the inner pair (f205), the
 * outer pair (f207), each from a dot near the disc outward to full by ~f211.
 */
const SUN_RAYS = [
	[90, 0.305, 0.177, 0],
	[124, 0.296, 0.143, 1],
	[56, 0.296, 0.143, 1],
	[159, 0.276, 0.188, 2],
	[21, 0.276, 0.188, 2],
];

/**
 * AgentGlyph — coral blob plus white line art, drawn in a box of `size` px
 * (the line spans the full width, the blob is ~0.48 of it).
 *   kind "blob"   just the wobbling disc (the agent's idle tile)
 *   kind "loop"   disc + the looping line, drawn on by `draw` 0..1
 *   kind "sun"    sunrise: a disc on a wavy horizon + five rays
 * `phase` (radians) keeps the blob alive; drive it from the frame number.
 *
 * Sun extras (all in units of `size` = the horizon width; measured f179-f215):
 *   discR   disc radius (default 0.208 x blobScale)
 *   discX/discY  disc centre relative to the horizon centre, +y down
 *                (default 0.034 / 0.03: the disc sits a little right, sunk)
 *   clip    cut the disc flat at y = clipAt (default true / 0.022); false
 *           draws the whole wobbling blob (the f143-f172 idle state)
 *   amp     disc wobble amplitude (default 0.04)
 *   horizon 0..1 draws the horizon on left to right (default 1)
 *   rays    0..1 grows all rays in their measured order (default 1), or
 *   rayP    [c, innerL, innerR, outerL, outerR] per-ray 0..1 (<=0 hidden)
 *   rayStroke  ray width (default 0.045; horizon `stroke` default 0.062)
 * The svg box is size x 0.6 size; the horizon centre sits at (0.5, 0.72) of it.
 */
export function AgentGlyph({
	size = 200,
	kind = "loop",
	draw = 1,
	rays = 1,
	phase = 0,
	blobScale = 1,
	stroke,
	id = "ag",
	opacity = 1,
	discR,
	discX = 0.034,
	discY = 0.03,
	clip = true,
	clipAt = 0.022,
	amp,
	horizon = 1,
	rayP,
	rayStroke,
}) {
	const h = size * 0.6;
	const sw = stroke ?? size * 0.052;
	const r = size * 0.24 * blobScale;
	const white = rgbs(P.white);
	const coral = rgbs(P.coral);
	if (kind === "blob") {
		return (
			<svg
				width={size}
				height={size}
				viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
				style={{ overflow: "visible", opacity }}
			>
				<path d={blobPath(0, 0, size * 0.48 * blobScale, phase, amp ?? 0.07)} fill={coral} />
			</svg>
		);
	}
	if (kind === "sun") {
		const u = size;
		const sr = (discR ?? 0.208 * blobScale) * u;
		const hsw = stroke ?? u * 0.062;
		const rsw = rayStroke !== undefined ? rayStroke * u : (stroke ?? u * 0.045);
		const rp = rayP ?? SUN_RAYS.map(([, , , g]) => clamp01(rays * 1.75 - g * 0.375));
		const hp = clamp01(horizon);
		return (
			<svg
				width={size}
				height={h}
				viewBox={`${-size / 2} ${-h * 0.72} ${size} ${h}`}
				style={{ overflow: "visible", opacity }}
			>
				<clipPath id={`${id}-c`}>
					<rect x={-size * 2} y={-size * 2} width={size * 4} height={size * 2 + clipAt * u} />
				</clipPath>
				{sr > 0.2 ? (
					<path
						d={blobPath(discX * u, discY * u, sr, phase, amp ?? 0.04)}
						fill={coral}
						clipPath={clip ? `url(#${id}-c)` : undefined}
					/>
				) : null}
				{SUN_RAYS.map(([ang, r0, len, g], i) => {
					const gp = rp[i] ?? 0;
					if (gp <= 0) return null;
					const a = (ang * Math.PI) / 180;
					const e = 1 - (1 - clamp01(gp)) ** 2;
					const ri = lerp(0.263, r0, e) * u;
					const ro = lerp(0.263, r0 + len, e) * u;
					return (
						<line
							key={i}
							x1={Math.cos(a) * ri}
							y1={-Math.sin(a) * ri}
							x2={Math.cos(a) * ro}
							y2={-Math.sin(a) * ro}
							stroke={white}
							strokeWidth={rsw}
							strokeLinecap="round"
						/>
					);
				})}
				{hp > 0 ? (
					<path
						d={HORIZON_PATH}
						transform={`scale(${size / 2})`}
						pathLength={1}
						stroke={white}
						strokeWidth={hsw / (size / 2)}
						strokeLinecap="round"
						fill="none"
						strokeDasharray={hp >= 1 ? undefined : `${hp} 2`}
					/>
				) : null}
			</svg>
		);
	}
	// loop
	const len = 7.2; // approximate path length in path units (scaled below)
	return (
		<svg
			width={size}
			height={h}
			viewBox={`${-size / 2} ${-h / 2} ${size} ${h}`}
			style={{ overflow: "visible", opacity }}
		>
			<path d={blobPath(size * 0.02, size * 0.02, r, phase)} fill={coral} />
			<path
				d={LOOP_PATH}
				transform={`scale(${size / 2})`}
				stroke={white}
				strokeWidth={sw / (size / 2)}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				strokeDasharray={`${len} ${len}`}
				strokeDashoffset={len * (1 - clamp01(draw))}
			/>
		</svg>
	);
}

/**
 * AgentTile — the agent's call tile: dark body, glyph at ~42% height, status
 * line under it, muted name chip bottom-left. Drawn at w x h; `k` scales the
 * type and chip (k=1 is the f210 close-up: status 36 px, chip 188 px wide).
 */
export function AgentTile({
	w,
	h,
	k = 1,
	name = "Cypress",
	status = "",
	statusOpacity = 1,
	glyph,
	radius = 14,
	bg = P.tile,
	chipBg = P.chip,
}) {
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: w,
				height: h,
				borderRadius: radius,
				background: rgbs(bg),
				overflow: "hidden",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: w / 2,
					top: h * 0.42,
					transform: "translate(-50%,-50%)",
				}}
			>
				{glyph}
			</div>
			{status ? (
				<div
					style={{
						position: "absolute",
						left: 0,
						width: w,
						top: h * 0.42 + 56 * k,
						textAlign: "center",
						font: `400 ${36 * k}px ${SANS}`,
						color: rgbs(P.white, statusOpacity),
						whiteSpace: "nowrap",
					}}
				>
					{status}
				</div>
			) : null}
			<div style={{ position: "absolute", left: 32 * k, bottom: 32 * k }}>
				<NameChip name={name} k={1.75 * k} muted bg={chipBg} />
			</div>
		</div>
	);
}

// ── bubbles ───────────────────────────────────────────────────────────────

/** Split copy into words, keeping trailing spaces on each word. */
export const words = (s) => s.match(/\S+\s*/g) ?? [];

/**
 * Per-word colours for a transcript that arrives word by word (f250-f293):
 * word i is absent before at[i], lands MUTED, then ramps to `full` over
 * `ramp` frames (measured 2-3). `accent` {i: [idx...], until} paints those
 * words coral until frame `until` (the wake word "Claude," f250-f270), and
 * they fade to `full` over 1.5 frames after it.
 */
export function wordColours(
	n,
	f,
	at,
	{ ramp = 2.5, muted = P.bubbleMuted, full = P.bubbleText, accent } = {},
) {
	const out = [];
	for (let i = 0; i < n; i++) {
		const a = at[i] ?? at[at.length - 1] ?? 0;
		if (f < a) {
			out.push(null);
			continue;
		}
		let c = mix(muted, full, (f - a - 0.5) / ramp);
		if (accent && accent.i.includes(i)) {
			const back = clamp01((f - accent.until) / 1.5);
			c = mix(mix(muted, accent.colour ?? P.coral, (f - a - 0.5) / ramp), c, back);
		}
		out.push(c);
	}
	return out;
}

/**
 * VoiceBubble — the dark transcript card. `shown` words are full white, the
 * next `ghost` words are muted (still being heard), the rest are not drawn.
 * `colours` (array, one [r,g,b] or null per word) overrides shown/ghost:
 * null words take NO space, so lines reflow as the reference's do.
 * `icon` "wave" shows level bars (listening), "dots" shows four dots (sent).
 * `height` fixes the card height and centres the text block (the reference
 * card is 614 x 156 from its first frame, one line or two).
 * Base geometry (k=1) is f330: 614 x 156 card, 22 px radius, 33 px type.
 */
export function VoiceBubble({
	text,
	shown = 1e9,
	ghost = 0,
	icon = "wave",
	k = 1,
	width = 614,
	height,
	f = 0,
	opacity = 1,
	colours,
}) {
	const ws = words(text);
	const icx = 81 * k;
	return (
		<div
			style={{
				position: "relative",
				width: width * k,
				minHeight: 108 * k,
				height: height ? height * k : undefined,
				padding: `${22 * k}px ${28 * k}px ${22 * k}px ${155 * k}px`,
				boxSizing: "border-box",
				borderRadius: 22 * k,
				background: rgbs(P.bubble),
				boxShadow: `0 ${6 * k}px ${18 * k}px rgba(0,0,0,0.18)`,
				font: `400 ${34 * k}px ${SANS}`,
				letterSpacing: 1.4 * k, // the reference sans is wider than Segoe UI: "Hey Claude, can you start" = 430 px
				lineHeight: `${48 * k}px`,
				color: rgbs(P.bubbleText),
				opacity,
				display: height ? "flex" : "block",
				alignItems: "center",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: icx - 42 * k,
					top: "50%",
					marginTop: -42 * k,
					width: 84 * k,
					height: 84 * k,
					borderRadius: "50%",
					background: rgbs(P.bubbleRing),
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<div
					style={{
						width: 70 * k,
						height: 70 * k,
						borderRadius: "50%",
						background: rgbs(P.paper),
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: icon === "dots" ? 4 * k : 4 * k,
					}}
				>
					{icon === "dots"
						? [0, 1, 2, 3].map((i) => (
								<div
									key={i}
									style={{
										width: 7 * k,
										height: 7 * k,
										borderRadius: "50%",
										background: rgbs(P.bubble),
									}}
								/>
							))
						: [0, 1, 2, 3].map((i) => {
								const lv = 0.45 + 0.55 * Math.abs(Math.sin(f * 0.55 + i * 1.7));
								return (
									<div
										key={i}
										style={{
											width: 5 * k,
											height: 26 * k * lv,
											borderRadius: 3 * k,
											background: rgbs(P.bubble),
										}}
									/>
								);
							})}
				</div>
			</div>
			<div>
				{colours
					? ws.map((w, i) =>
							colours[i] ? (
								<span key={i} style={{ color: rgbs(colours[i]) }}>
									{w}
								</span>
							) : null,
						)
					: ws.map((w, i) =>
							i < shown ? (
								<span key={i}>{w}</span>
							) : i < shown + ghost ? (
								<span key={i} style={{ color: rgbs(P.bubbleMuted) }}>
									{w}
								</span>
							) : (
								<span key={i} style={{ visibility: "hidden" }}>
									{w}
								</span>
							),
						)}
			</div>
		</div>
	);
}

/** The agent's mark inside a coral disc (placeholder mark; `src` swaps it). */
export function AgentBadge({ size = 76, src, colour = P.coral }) {
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: "50%",
				background: rgbs(colour),
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flex: "none",
			}}
		>
			{src ? (
				<img src={src} style={{ width: size * 0.6, height: size * 0.6, objectFit: "contain" }} />
			) : (
				<Mark size={size * 0.56} colour={P.white} />
			)}
		</div>
	);
}

/**
 * ReplyBubble — the agent answering: coral badge, name line, reply text.
 * Base geometry (k=1) is f330: 574 x 204 card, name 28 px, text 33 px.
 * `colours` (one [r,g,b] or null per word) streams the reply in like the
 * reference (f306 line one lands muted, f308 the last word, full by f312);
 * null words keep their space here so the card never reflows.
 */
export function ReplyBubble({
	name = "Cypress",
	text,
	k = 1,
	width = 574,
	height,
	opacity = 1,
	textOpacity = 1,
	markSrc,
	colours,
}) {
	const ws = words(text);
	return (
		<div
			style={{
				position: "relative",
				width: width * k,
				height: height ? height * k : undefined,
				padding: `${26 * k}px ${26 * k}px ${26 * k}px ${140 * k}px`,
				boxSizing: "border-box",
				borderRadius: 22 * k,
				background: rgbs(P.bubble),
				boxShadow: `0 ${6 * k}px ${18 * k}px rgba(0,0,0,0.18)`,
				opacity,
			}}
		>
			<div style={{ position: "absolute", left: 34 * k, top: 38 * k }}>
				<AgentBadge size={76 * k} src={markSrc} />
			</div>
			<div
				style={{
					font: `400 ${28 * k}px ${SANS}`,
					letterSpacing: 1.1 * k,
					color: rgbs(P.white),
					lineHeight: `${40 * k}px`,
				}}
			>
				{name}
			</div>
			<div
				style={{
					font: `400 ${34 * k}px ${SANS}`,
					letterSpacing: 1.4 * k,
					color: rgbs(P.replyText, textOpacity),
					lineHeight: `${48 * k}px`,
				}}
			>
				{colours
					? ws.map((w, i) => (
							<span
								key={i}
								style={
									colours[i] ? { color: rgbs(colours[i], textOpacity) } : { visibility: "hidden" }
								}
							>
								{w}
							</span>
						))
					: text}
			</div>
		</div>
	);
}

// ── the placeholder brand mark ────────────────────────────────────────────

/**
 * Mark — the placeholder brand mark: a six-petal rounded bloom. It is a
 * stand-in for the product's own mark (every preset that draws it also
 * takes a `markSrc` image slot). `spin` rotates it (degrees), `grow` 0..1
 * extends the petals from the centre dot. `src` swaps in an image mark
 * (it gets the same spin, and `grow` scales it up from the centre).
 * The ink spans ~0.93 x size (petal tips at r 0.51 of a 1.1 box).
 */
export function Mark({ size = 40, colour = P.coral, spin = 0, grow = 1, src }) {
	const g = clamp01(grow);
	if (src)
		return (
			<img
				src={src}
				style={{
					display: "block",
					width: size,
					height: size,
					objectFit: "contain",
					transform: `rotate(${spin}deg) scale(${0.3 + 0.7 * g})`,
				}}
			/>
		);
	const petals = [];
	for (let i = 0; i < 6; i++) {
		const a = i * 60 + spin;
		petals.push(
			<ellipse
				key={i}
				cx={0}
				cy={-0.27 * g}
				rx={0.13 * Math.max(0.35, g)}
				ry={0.24 * g}
				transform={`rotate(${a})`}
				fill={rgbs(colour)}
			/>,
		);
	}
	return (
		<svg
			width={size}
			height={size}
			viewBox="-0.55 -0.55 1.1 1.1"
			style={{ display: "block", overflow: "visible" }}
		>
			{petals}
			<circle r={0.12 + 0.02 * (1 - g)} fill={rgbs(colour)} />
		</svg>
	);
}

// ── whiteboard ────────────────────────────────────────────────────────────
// Owned by s2 (f355-f708). Measured at stage scale (stage px = ref px / 1.5),
// world px = stage px at camera scale 1 (f496-f604 of the reference).

/**
 * The whiteboard ground: paper with a faint square grid, in world px.
 * The reference grid is 42.67 px (= 64 ref px), lines [236,235,231] ~1.6 px,
 * sampled f490. `ox`/`oy` put a line through that world coordinate.
 */
export function GridGround({
	x = -2000,
	y = -2000,
	w = 6000,
	h = 5000,
	cell = 40,
	line = P.gridLine,
	bg = P.paper,
	ox = 0,
	oy = 0,
	lineW = 1,
}) {
	const l = rgbs(line);
	const px = (((ox - x) % cell) + cell) % cell;
	const py = (((oy - y) % cell) + cell) % cell;
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: w,
				height: h,
				background: rgbs(bg),
				backgroundImage: `linear-gradient(${l} ${lineW}px, transparent ${lineW}px), linear-gradient(90deg, ${l} ${lineW}px, transparent ${lineW}px)`,
				backgroundSize: `${cell}px ${cell}px`,
				backgroundPosition: `${px - lineW / 2}px ${py - lineW / 2}px`,
			}}
		/>
	);
}

/**
 * foldPolys — a square sheet w x h with one corner folded over along a 45°
 * line `a` px in from that corner. Returns CSS polygon() strings for the
 * front (what is left of the face) and the flap (the folded-back corner,
 * which lands mirrored inside the sheet). corner: "br" | "bl" | "tr" | "tl".
 * a = 0 is flat; a = min(w,h) folds the sheet in half along its diagonal.
 */
export function foldPolys(w, h, a, corner = "br") {
	const A = Math.max(0, Math.min(a, Math.min(w, h) * 0.999));
	const map = ([x, y]) => [
		corner === "bl" || corner === "tl" ? w - x : x,
		corner === "tr" || corner === "tl" ? h - y : y,
	];
	const poly = (pts) =>
		`polygon(${pts
			.map(map)
			.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`)
			.join(", ")})`;
	return {
		front: poly([
			[0, 0],
			[w, 0],
			[w, h - A],
			[w - A, h],
			[0, h],
		]),
		flap: poly([
			[w, h - A],
			[w - A, h],
			[w - A, h - A],
		]),
		a: A,
	};
}

/**
 * stickyPop — how a note lands, by `age` in frames since its first visible
 * frame (measured f529-f534 "Caramel apple", f535-f540 "French silk"):
 * it appears 16% oversized with its bottom-right corner folded far back
 * (fold line ~62% of the side), snaps to ~104% with a 27% fold next frame,
 * dips under 100% at age 3 and settles with the resting 10% curl by age 6.
 * Returns { scale, fold } (fold as a fraction of the note side).
 */
export function stickyPop(age) {
	if (age < 0) return { scale: 0, fold: 0, visible: false };
	const pts = [
		[0, 1.16, 0.62],
		[1, 1.06, 0.27],
		[2, 1.035, 0.2],
		[3, 0.985, 0.145],
		[4, 0.995, 0.12],
		[5, 1.0, 0.11],
		[6, 1.0, 0.1],
	];
	const sc = curve(
		pts.map(([f, s]) => [f, s]),
		age,
	);
	const fold = curve(
		pts.map(([f, , d]) => [f, d]),
		age,
	);
	return { scale: sc, fold, visible: true };
}

/**
 * Sticky — one note in world px (156 x 156 in the f604 board):
 * colour fill, a curled bottom-right corner (flap a shade darker with a soft
 * shadow), text top-left typed to `chars` with an optional caret, author
 * line bottom-left. Old API kept: `pop` 0..1 scales it in from 0.6 with
 * overshoot. New: `scale` and `fold` (px, or a 0..1 fraction of w) override
 * the pop; `caretColour`, `authorFont`, `textTop`, `ink` restyle it.
 */
export function Sticky({
	x,
	y,
	w = 150,
	h = 150,
	colour,
	text = "",
	chars = 1e9,
	author = "",
	pop = 1,
	rot = 0,
	caret = false,
	font = 15,
	z = 1,
	opacity = 1,
	scale,
	fold,
	caretColour = P.noteInk,
	authorFont = 9.5,
	textTop = 13,
	textLeft = 15,
	ink = P.noteInk,
	shadow = true,
	children,
}) {
	const p = clamp01(pop);
	if (p <= 0 && scale === undefined) return null;
	const s = scale ?? 0.6 + 0.4 * (1 - (1 - p) ** 3) + 0.06 * Math.sin(Math.PI * p) * (1 - p);
	const fpx = fold === undefined ? 14 : fold <= 1 ? fold * w : fold;
	const fp = foldPolys(w, h, fpx, "br");
	const flapC = mix(colour, [70, 78, 88], 0.26);
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: w,
				height: h,
				transform: `rotate(${rot}deg) scale(${s})`,
				transformOrigin: "50% 50%",
				opacity: (scale === undefined ? Math.min(1, p * 3) : 1) * opacity,
				zIndex: z,
				filter: shadow ? "drop-shadow(0px 1.5px 1.5px rgba(40,40,30,0.10))" : undefined,
			}}
		>
			<div
				style={{ position: "absolute", inset: 0, background: rgbs(colour), clipPath: fp.front }}
			/>
			{fp.a > 0.5 ? (
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: `linear-gradient(135deg, ${rgbs(mix(flapC, colour, 0.35))} ${((1 - fp.a / (w + h)) * 100).toFixed(1)}%, ${rgbs(flapC)} 100%)`,
						clipPath: fp.flap,
					}}
				/>
			) : null}
			<div
				style={{
					position: "absolute",
					left: textLeft,
					top: textTop,
					right: 7,
					font: `400 ${font}px ${SANS}`,
					lineHeight: 1.25,
					color: rgbs(ink),
					overflowWrap: "break-word",
				}}
			>
				{text.slice(0, Math.max(0, Math.floor(chars)))}
				{caret ? (
					<span style={{ borderLeft: `1.5px solid ${rgbs(caretColour)}`, marginLeft: 1 }} />
				) : null}
			</div>
			{author ? (
				<div
					style={{
						position: "absolute",
						left: textLeft,
						bottom: 10,
						font: `400 ${authorFont}px ${SANS}`,
						color: rgbs(ink, 0.5),
					}}
				>
					{author}
				</div>
			) : null}
			{children}
		</div>
	);
}

/** The plain arrow pointer (the viewer's own cursor), tip at (0,0). */
export function Pointer({
	size = 22,
	colour = [10, 10, 10],
	outline = [255, 255, 255],
	opacity = 1,
}) {
	return (
		<svg
			width={size}
			height={size * 1.4}
			viewBox="0 0 20 28"
			style={{ display: "block", overflow: "visible", opacity }}
		>
			<path
				d="M1 1 L1 22 L6.5 16.8 L10.2 25.5 L13.6 24 L9.9 15.4 L17 15.2 Z"
				fill={rgbs(colour)}
				stroke={rgbs(outline)}
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Measured name-tag pill growth by frames after the dot appears (f536-f544 "Marcus" 8/16/50/74/79 px, f526-f536 "Vinny" 7/9/20/56/64/67 px). */
export const TAG_GROW = [
	[0, 0],
	[1, 0.03],
	[2, 0.1],
	[3, 0.22],
	[4, 0.42],
	[5, 0.65],
	[6, 0.85],
	[7, 0.96],
	[8, 1],
];

/**
 * NameTag — a collaborator's cursor: a small filled arrowhead and a coloured
 * label pill offset down-right of the tip (pill top-left = tip + (10,13),
 * measured f604). Tip at the element's origin. Pill 28 px tall, 16 px type.
 * `grow` 0..1 grows the pill out of a `dot` px disc anchored at its
 * top-left (how every tag arrives, f536-f544; the agent's dot is the shrunk
 * blob, 22 px, f420-f427). `arrowOpacity` fades the arrowhead alone,
 * `arrowK` scales it (the board's arrows are ~1.35x, f531).
 */
export function NameTag({
	name,
	colour,
	k = 1,
	opacity = 1,
	labelOpacity = 1,
	grow = 1,
	dot = 6,
	arrowOpacity = 1,
	font = 16,
	arrowK = 1,
}) {
	const g = clamp01(grow);
	const fullW = textWidth(name, `400 ${font * k}px ${SANS}`) + 18 * k;
	const fullH = 28 * k;
	const pw = lerp(dot, fullW, g);
	const ph = lerp(dot, fullH, Math.min(1, g * 1.6));
	return (
		<div style={{ position: "absolute", left: 0, top: 0, opacity }}>
			{arrowOpacity > 0 ? (
				<svg
					width={14 * k * arrowK}
					height={14 * k * arrowK}
					viewBox="0 0 14 14"
					style={{
						position: "absolute",
						left: -1 * k * arrowK,
						top: -1 * k * arrowK,
						overflow: "visible",
						opacity: arrowOpacity,
					}}
				>
					<path
						d="M1 1 L13 5.2 L7.4 7.4 L5.2 13 Z"
						fill={rgbs(colour)}
						stroke="white"
						strokeWidth="1.2"
						strokeLinejoin="round"
					/>
				</svg>
			) : null}
			{g > 0 || dot > 0 ? (
				<div
					style={{
						position: "absolute",
						left: 10 * k,
						top: 13 * k,
						width: pw,
						height: ph,
						borderRadius: lerp(dot / 2, 5 * k, g),
						background: rgbs(colour),
						overflow: "hidden",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: 9 * k,
							top: 0,
							height: fullH,
							lineHeight: `${fullH}px`,
							font: `400 ${font * k}px ${SANS}`,
							color: rgbs([255, 255, 255], labelOpacity * clamp01((g - 0.25) / 0.4)),
							whiteSpace: "nowrap",
						}}
					>
						{name}
					</div>
				</div>
			) : null}
		</div>
	);
}

/** The agent's own tag: a coral label with the name and no arrow (text cursor). */
export function AgentTag({ name = "Cypress", k = 1, opacity = 1 }) {
	return (
		<div
			style={{
				display: "inline-block",
				padding: `${2 * k}px ${7 * k}px ${3 * k}px`,
				borderRadius: 5 * k,
				background: rgbs(P.coral),
				font: `600 ${12 * k}px ${SANS}`,
				color: "white",
				whiteSpace: "nowrap",
				opacity,
			}}
		>
			{name}
		</div>
	);
}

/** A participant avatar for image slots: photo if `src`, else drawn initials. */
export function Avatar({ size = 60, name = "?", src, tone = [120, 130, 150], ring }) {
	const border = ring ? `${Math.max(1, size * 0.06)}px solid ${rgbs(ring)}` : undefined;
	if (src)
		return (
			<img
				src={src}
				style={{
					width: size,
					height: size,
					borderRadius: "50%",
					objectFit: "cover",
					display: "block",
					border,
					boxSizing: "border-box",
				}}
			/>
		);
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: "50%",
				background: rgbs(tone),
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				font: `600 ${size * 0.4}px ${SANS}`,
				color: "rgba(255,255,255,0.92)",
				border,
				boxSizing: "border-box",
			}}
		>
			{name.slice(0, 1).toUpperCase()}
		</div>
	);
}

// ── the working loop (a travelling ribbon) ────────────────────────────────

/**
 * ribbonPath — the agent's "working" line, f355-f410: a white stroke whose
 * loops travel left to right THROUGH a fixed span, growing out of the
 * straight left end, peaking mid-span and flattening into the right end
 * (a prolate cycloid under a cosine envelope, NOT a fixed drawing). Units:
 * the span is x -1..1 on the baseline y 0, +y down. Only carrier positions
 * u0..u1 are drawn (u0 > -1 erases from the left, f401-f411; u1 < 1 draws
 * on from the left, the docked window f476-f486).
 *   f       frame (the loops advance nu cycles per frame)
 *   lambda  loop spacing (0.75 measured f380-f400)
 *   A, H    loop back-swing and height at full envelope (0.35, 0.58)
 *   lean    loops lean right by lean x height (0.25)
 *   envCut  envelope floor: the ends stay straight where cos(pi u/2) < envCut
 */
export function ribbonPath({
	u0 = -1,
	u1 = 1,
	f = 0,
	lambda = 0.75,
	A = 0.35,
	H = 0.58,
	lean = 0.25,
	nu = 0.0214,
	envPow = 1.2,
	envCut = 0,
	phase0 = 0,
	n = 420,
}) {
	const a = Math.max(-1, u0);
	const b = Math.min(1, u1);
	if (b <= a) return "";
	let d = "";
	const steps = Math.max(2, Math.ceil(n * ((b - a) / 2)));
	for (let i = 0; i <= steps; i++) {
		const u = a + ((b - a) * i) / steps;
		const env = clamp01((Math.cos((Math.PI * u) / 2) - envCut) / (1 - envCut)) ** envPow;
		const ph = 2 * Math.PI * (u / lambda - nu * f) + phase0;
		const yy = -H * env * (1 - Math.cos(ph)) * 0.5;
		const xx = u + A * env * Math.sin(ph) - lean * yy;
		d += `${i ? "L" : "M"}${xx.toFixed(4)} ${yy.toFixed(4)}`;
	}
	return d;
}

/**
 * WorkLoop — the coral blob with the travelling ribbon over it, drawn around
 * the ribbon's baseline centre (the element's origin). `hw` is the ribbon
 * half-span in px; the blob sits at (blobDx, blobDy) from that centre with
 * radius blobR (f380: hw 192.5, blob +13.5/-31.5, r 82, stroke 14).
 * `blob` false draws the line only; `line` false the blob only.
 */
export function WorkLoop({
	hw = 192.5,
	f = 0,
	u0 = -1,
	u1 = 1,
	blobR = 82,
	blobDx = 13.5,
	blobDy = -31.5,
	stroke = 14,
	phase = 0,
	amp = 0.07,
	blob = true,
	line = true,
	ribbon = {},
	opacity = 1,
}) {
	const d = line ? ribbonPath({ u0, u1, f, ...ribbon }) : "";
	const R = Math.max(hw, blobR * 1.3) * 1.6;
	return (
		<svg
			width={2 * R}
			height={2 * R}
			viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`}
			style={{ position: "absolute", left: -R, top: -R, overflow: "visible", opacity }}
		>
			{blob && blobR > 0.3 ? (
				<path d={blobPath(blobDx, blobDy, blobR, phase, amp)} fill={rgbs(P.coral)} />
			) : null}
			{d ? (
				<path
					d={d}
					transform={`scale(${hw})`}
					stroke={rgbs(P.white)}
					strokeWidth={stroke / hw}
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="none"
				/>
			) : null}
		</svg>
	);
}

// ── the docked call window ────────────────────────────────────────────────

const ctlIcon = (kind, c) => {
	if (kind === "mic")
		return (
			<svg width="11" height="11" viewBox="0 0 24 24">
				<rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill={c} />
				<path
					d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5"
					stroke={c}
					strokeWidth="2.2"
					fill="none"
					strokeLinecap="round"
				/>
			</svg>
		);
	if (kind === "cam")
		return (
			<svg width="12" height="11" viewBox="0 0 24 22">
				<rect x="1.5" y="5" width="14" height="12" rx="2" fill={c} />
				<path d="M16.5 9.5 L22.5 6 L22.5 16 L16.5 12.5 Z" fill={c} />
			</svg>
		);
	if (kind === "gear")
		return (
			<svg width="11" height="11" viewBox="-12 -12 24 24">
				{[0, 45, 90, 135].map((a) => (
					<rect
						key={a}
						x="-2.6"
						y="-11"
						width="5.2"
						height="22"
						rx="1.2"
						fill={c}
						transform={`rotate(${a})`}
					/>
				))}
				<circle r="7.4" fill={c} />
				<circle r="3.2" fill="#2c2e2b" />
			</svg>
		);
	return (
		<svg width="11" height="11" viewBox="-12 -12 24 24">
			<circle r="10.5" fill={c} />
			<path
				d="M-4 -4 L4 4 M4 -4 L-4 4"
				stroke={rgbs(P.end)}
				strokeWidth="2.6"
				strokeLinecap="round"
			/>
		</svg>
	);
};

/** Default participants of the docked window (image slots; drawn stand-ins). */
export const CALL_PEOPLE = [
	{ name: "Jonah", tone: [150, 112, 92] },
	{ name: "Priya", tone: [92, 78, 70] },
	{ name: "Luis", tone: [70, 72, 70], camOff: true },
	{ name: "Sam", tone: [120, 70, 60] },
	{ name: "Dee", tone: [196, 160, 128] },
	{ name: "Maya", tone: [214, 178, 112] },
];

/**
 * CallMini — the call window docked top-right of the whiteboard (f441-f620),
 * in its own px (w 225; 188 tall collapsed, 314 with the participants panel;
 * measured f484 / f604, x 1027.5 y 27 on stage at camera scale 1):
 *   - black body [0,1,0], 8 px radius, a white close X at (211,14.5)
 *   - the agent tile [21,23,20] at (6,29) 214 x 120 with a muted name chip
 *     and the agent glyph: an idle blob (r 32, tile centre) that shrinks to
 *     the working blob (r 26, y 46) while the ribbon draws on (`loop` 0..1)
 *   - the participants panel (6,155) 214 x 120, revealed by `expand` 0..1:
 *     a row of 19 px avatars (18 px apart, y 50) and "6 others" (y 74)
 *   - the control row: four 31 x 27 buttons (mic, camera, settings, red end)
 * Entry/props: `scale` about the window centre, `roundness` 0..1 morphs the
 * corners from 8 px to a full circle (f441 enters as a ~90 px disc), `blur`
 * px, `opacity`. `shown` = how many avatars have popped (fractional ok),
 * `othersOpacity` the label. `f` drives the blob wobble and ribbon travel.
 * `participants` [{name, src, tone, camOff}] are image slots (photo src).
 * Positioned with its top-left at (x, y).
 */
export function CallMini({
	x = 0,
	y = 0,
	w = 225,
	expand = 1,
	scale = 1,
	opacity = 1,
	roundness = 0,
	blur = 0,
	name = "Cypress",
	f = 0,
	loop = 1,
	blobR,
	blobY,
	participants = CALL_PEOPLE,
	shown = 99,
	othersLabel,
	othersOpacity = 1,
}) {
	const e = clamp01(expand);
	const H = 188 + 126 * e;
	const tileW = w - 11;
	const r = lerp(8, Math.min(w, H) / 2, clamp01(roundness));
	const lp = clamp01(loop);
	const bR = blobR ?? lerp(32, 26, clamp01(lp * 3));
	const bY = blobY ?? lerp(60, 46, clamp01(lp * 3));
	const people = participants ?? CALL_PEOPLE;
	const label = othersLabel ?? `${people.length} others`;
	const n = people.length;
	const btnX0 = (w - (4 * 31 + 3 * 3.5)) / 2;
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: w,
				height: H,
				borderRadius: r,
				background: rgbs(P.black),
				overflow: "hidden",
				transform: `scale(${scale})`,
				transformOrigin: "50% 50%",
				opacity,
				filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
				boxShadow: "0 3px 9px rgba(0,0,0,0.16)",
			}}
		>
			<svg
				width="11"
				height="11"
				viewBox="0 0 11 11"
				style={{ position: "absolute", left: w - 14 - 5.5, top: 9 }}
			>
				<path d="M1 1 L10 10 M10 1 L1 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
			</svg>
			<div
				style={{
					position: "absolute",
					left: 6,
					top: 29,
					width: tileW,
					height: 120,
					borderRadius: 6,
					background: rgbs(P.tile),
					overflow: "hidden",
				}}
			>
				<div style={{ position: "absolute", left: tileW / 2 - 6 - 0.1 * 54.5, top: bY + 11.5 }}>
					<WorkLoop
						hw={54.5}
						f={f}
						u0={-1}
						u1={-1 + 2 * lp}
						blobR={bR}
						blobDx={6 + 0.1 * 54.5}
						blobDy={-11.5}
						stroke={3.6}
						phase={f * 0.11}
						amp={0.06}
						ribbon={{
							lambda: 1.45,
							A: 0.42,
							H: 0.82,
							lean: 0.08,
							nu: 0.016,
							envCut: 0.3,
							envPow: 0.8,
						}}
					/>
				</div>
				<div style={{ position: "absolute", left: 8, bottom: 8 }}>
					<NameChip name={name} k={0.37} muted />
				</div>
			</div>
			{e > 0 ? (
				<div
					style={{
						position: "absolute",
						left: 6,
						top: 155,
						width: tileW,
						height: 120 * e,
						borderRadius: 6,
						background: rgbs(P.tile),
						overflow: "hidden",
					}}
				>
					{e > 0.3 && shown < 0.5 ? (
						<div
							style={{
								position: "absolute",
								left: tileW / 2 - 2.5,
								top: 50 - 2.5,
								width: 5,
								height: 5,
								borderRadius: "50%",
								background: "rgba(255,255,255,0.25)",
							}}
						/>
					) : null}
					{people.map((pp, i) => {
						const g = clamp01(shown - i);
						if (g <= 0) return null;
						const cx = tileW / 2 + (i - (n - 1) / 2) * 18;
						const sz = 19 * (0.6 + 0.4 * g);
						return (
							<div
								key={i}
								style={{
									position: "absolute",
									left: cx - sz / 2,
									top: 50 - sz / 2,
									opacity: g,
									zIndex: i,
								}}
							>
								{pp.camOff && !pp.src ? (
									<div
										style={{
											width: sz,
											height: sz,
											borderRadius: "50%",
											background: rgbs([58, 60, 58]),
											border: `1px solid ${rgbs([90, 92, 90])}`,
											boxSizing: "border-box",
										}}
									/>
								) : (
									<Avatar
										size={sz}
										name={pp.name}
										src={pp.src}
										tone={pp.tone ?? [120, 130, 150]}
										ring={[21, 23, 20]}
									/>
								)}
							</div>
						);
					})}
					<div
						style={{
							position: "absolute",
							left: 0,
							width: tileW,
							top: 74 - 9,
							textAlign: "center",
							font: `400 12px ${SANS}`,
							lineHeight: "18px",
							color: rgbs(P.white, 0.92 * clamp01(othersOpacity)),
						}}
					>
						{label}
					</div>
				</div>
			) : null}
			{["mic", "cam", "gear", "end"].map((k, i) => (
				<div
					key={k}
					style={{
						position: "absolute",
						left: btnX0 + i * 34.5,
						top: H - 5.5 - 27,
						width: 31,
						height: 27,
						borderRadius: 5,
						background: k === "end" ? rgbs(P.end) : rgbs([44, 46, 44]),
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{ctlIcon(k, "white")}
				</div>
			))}
		</div>
	);
}

// ── the brand sticker ─────────────────────────────────────────────────────

const STICKER_INK = [33, 96, 74];

/**
 * Sticker — the brand sticker slapped onto the whiteboard (f485-f494): a
 * square of pink paper (187 px, [235,194,202], rotated -8° at rest) printed
 * with a round badge, two strips of translucent tape over its top corners.
 *   peel  0..1 — the top-left corner folded back (1 = folded along the
 *         diagonal so only the darker back shows; f485 0.95, f486 0.35,
 *         f487 0.25, f488 0.17, f489 0.08, f490 flat)
 *   tape  0..1 — the tape strips land (f491-f494)
 *   src   image slot: replaces the printed badge (square image, cover)
 *   top / bottom — the arched badge lines ("LITTLE EMBER" / "COFFEE"),
 *   tagline — the small line under the mascot.
 * Drawn centred on its origin (the element's (0,0) is the sticker centre).
 */
export function Sticker({
	size = 187,
	rot = -8,
	peel = 0,
	tape = 1,
	src,
	colour = [235, 194, 202],
	back = [214, 150, 164],
	ink = STICKER_INK,
	top = "LITTLE EMBER",
	bottom = "COFFEE",
	tagline = "small batch, big heart",
	opacity = 1,
	id = "stk",
}) {
	const fp = foldPolys(size, size, clamp01(peel) * size, "tl");
	const t = clamp01(tape);
	const inkc = rgbs(ink);
	const art = src ? (
		<img
			src={src}
			style={{ position: "absolute", inset: 0, width: size, height: size, objectFit: "cover" }}
		/>
	) : (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			style={{ position: "absolute", left: 0, top: 0 }}
		>
			<defs>
				<path id={`${id}-top`} d="M 17 52 A 33 33 0 0 1 83 52" />
				<path id={`${id}-bot`} d="M 14 50 A 36 36 0 0 0 86 50" />
			</defs>
			<circle cx="50" cy="50" r="44" fill="none" stroke={inkc} strokeWidth="0.9" opacity="0.55" />
			<text
				fontFamily={HEAVY}
				fontWeight="900"
				fontSize="12.5"
				fill={inkc}
				stroke={rgbs(P.paper)}
				strokeWidth="0.6"
				paintOrder="stroke"
				letterSpacing="0.6"
			>
				<textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
					{top}
				</textPath>
			</text>
			<text
				fontFamily={HEAVY}
				fontWeight="900"
				fontSize="13.5"
				fill={inkc}
				stroke={rgbs(P.paper)}
				strokeWidth="0.6"
				paintOrder="stroke"
				letterSpacing="1.4"
				dy="9"
			>
				<textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">
					{bottom}
				</textPath>
			</text>
			{/* mascot: a smiling cup with a little ember of steam */}
			<path
				d="M50 23 C46 27 53 29 49 34"
				stroke={rgbs(P.coral)}
				strokeWidth="2.2"
				fill="none"
				strokeLinecap="round"
			/>
			<path
				d="M36 37 L64 37 L61 58 C60.5 62 57.5 64 54 64 L46 64 C42.5 64 39.5 62 39 58 Z"
				fill={rgbs(P.paper)}
				stroke={inkc}
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path d="M63.5 41 C70 40 70.5 50 62 51" fill="none" stroke={inkc} strokeWidth="1.8" />
			<circle cx="45.5" cy="47" r="1.5" fill={inkc} />
			<circle cx="54.5" cy="47" r="1.5" fill={inkc} />
			<path
				d="M45.5 52.5 C47.5 55.5 52.5 55.5 54.5 52.5"
				stroke={inkc}
				strokeWidth="1.5"
				fill="none"
				strokeLinecap="round"
			/>
			<path d="M36 37 L64 37" stroke={inkc} strokeWidth="1.8" />
			{[
				[24, 50, -30],
				[76, 50, 30],
			].map(([cx, cy, a], i) => (
				<g key={i} transform={`translate(${cx} ${cy}) rotate(${a})`}>
					<ellipse rx="4.6" ry="6.4" fill={rgbs([150, 92, 60])} stroke={inkc} strokeWidth="1" />
					<path d="M0 -5.6 C-2 -2 2 2 0 5.6" stroke={inkc} strokeWidth="0.9" fill="none" />
				</g>
			))}
			<text
				x="50"
				y="72"
				textAnchor="middle"
				fontFamily={SERIF}
				fontStyle="italic"
				fontSize="4.6"
				fill={inkc}
			>
				{tagline}
			</text>
		</svg>
	);
	const tapeStrip = (cx, cy, ang, k) => (
		<div
			key={k}
			style={{
				position: "absolute",
				left: cx - size * 0.135,
				top: cy - size * 0.0425,
				width: size * 0.27,
				height: size * 0.085,
				background: "rgba(246,243,232,0.78)",
				boxShadow: "0 0 1px rgba(0,0,0,0.08)",
				transform: `rotate(${ang}deg) scale(${0.7 + 0.3 * t})`,
				transformOrigin: "50% 50%",
				opacity: t,
			}}
		/>
	);
	return (
		<div
			style={{
				position: "absolute",
				left: -size / 2,
				top: -size / 2,
				width: size,
				height: size,
				transform: `rotate(${rot}deg)`,
				opacity,
			}}
		>
			<div
				style={{
					position: "absolute",
					inset: 0,
					filter: "drop-shadow(0px 2px 2.5px rgba(40,30,30,0.18))",
				}}
			>
				<div style={{ position: "absolute", inset: 0, clipPath: fp.front }}>
					<div style={{ position: "absolute", inset: 0, background: rgbs(colour) }} />
					<div
						style={{
							position: "absolute",
							inset: size * 0.035,
							border: `${Math.max(1, size * 0.008)}px solid rgba(255,255,255,0.55)`,
						}}
					/>
					{art}
				</div>
				{fp.a > 0.5 ? (
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: `linear-gradient(135deg, ${rgbs(back)} 0%, ${rgbs(mix(back, colour, 0.45))} 100%)`,
							clipPath: fp.flap,
						}}
					/>
				) : null}
			</div>
			{t > 0
				? [
						tapeStrip(size * 0.03, size * 0.03, -45, "a"),
						tapeStrip(size * 0.97, size * 0.03, 45, "b"),
					]
				: null}
		</div>
	);
}
