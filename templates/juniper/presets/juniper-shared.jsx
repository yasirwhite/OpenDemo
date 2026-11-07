/**
 * juniper-shared.jsx — the vocabulary every juniper preset is built from.
 *
 * Measured off the Rork Max launch film (60.0s, 1920x1080 @60fps; frames
 * resampled to a 30fps clock and scaled to the 1280x720 stage, so stage px =
 * ref px / 1.5; frame n = n/30 s):
 *
 *   GROUND   one flat off-white [254,255,253] almost everywhere (no texture,
 *            no vignette; sampled in the corners on every beat). Two
 *            exceptions: the bento beat sits on a light grey [234,236,233]
 *            (49.73-55.23s) and the "Max" beat blooms a warm peach/coral glow
 *            over the white (5.53-6.03s, section-owned).
 *   TYPE     an SF-class neo-grotesk: headlines semibold (~600) in near-black
 *            [0,1,0]; sub-labels and the subtitle regular (~400). Lines enter
 *            grey and darken while rising. The product tier word "Max" is a
 *            left-to-right yellow [240,218,119] -> orange [228,147,80]
 *            gradient. Inter is used if installed, else Segoe UI.
 *   DEVICES  a phone (orange titanium rim), a watch (dark titanium case,
 *            woven band, orange action button), a tablet (thin dark rim), a TV
 *            (a bare rounded screen) and a headset window (a glass window with
 *            a title bar). Every one is drawn here with a content slot so all
 *            sections share one look. Proportions were measured on the held
 *            frames (phone 9.0s, watch 21.0s, tablet 27.0s, TV 32.0s,
 *            headset 35.0s) and are expressed as fractions of the width.
 *
 * Every export is a pure function of its props / t.
 */
import {
	ArrowUp,
	Bell,
	Bot,
	Box,
	Calendar,
	Camera,
	ChartColumn,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	CircleCheck,
	Code,
	Copy,
	Ellipsis,
	Eye,
	Gamepad2,
	Glasses,
	Heart,
	Hourglass,
	House,
	Layers,
	Link,
	Map as MapIcon,
	MessageCircle,
	Mic,
	Minimize2,
	Nfc,
	Plane,
	Play,
	Plus,
	RefreshCw,
	Rocket,
	ScanEye,
	Smartphone,
	Sparkles,
	Store,
	Tablet,
	Timer,
	Tv,
	Upload,
	Watch,
	Wifi,
} from "lucide-react";
import React from "react";
import { clamp01, easeByName, lerp } from "../../../src/lib/textcards/src/easing.js";

export const FONT = `"Inter Display", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
export const MONO = `"Cascadia Mono", Consolas, "Courier New", monospace`;

export const rgbs = (c, a = 1) =>
	a >= 1
		? `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
		: `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, a).toFixed(4)})`;

/** Measured palette (sample, not invent; sections may override per beat). */
export const Q = {
	// grounds
	ground: [254, 255, 253],
	bento: [234, 236, 233],
	white: [255, 255, 255],
	// type
	ink: [0, 1, 0],
	grey: [138, 140, 137],
	// the tier word's gradient, left -> right (measured on "Max" at 6.0s)
	maxA: [240, 218, 119],
	maxB: [228, 147, 80],
	// the warm bloom behind "Max" at 5.70s (upper-left peach, right coral)
	glowPeach: [250, 215, 170],
	glowCoral: [244, 168, 142],
	// the toggle pill (4.2s off, 5.2s on)
	pillOff: [106, 108, 105],
	pillOffKnob: [60, 62, 59],
	pillOffText: [138, 140, 137],
	pillOn: [141, 133, 120],
	pillOnText: [227, 218, 153],
	knobA: [242, 211, 105],
	knobB: [227, 136, 66],
	// devices
	phoneRim: [228, 138, 92],
	phoneRimHi: [255, 214, 170],
	phoneRimLo: [176, 98, 62],
	watchCase: [58, 55, 52],
	watchBand: [37, 41, 42],
	tabletRim: [96, 98, 95],
	screen: [0, 1, 0],
	// the builder app (dark window at 36-47s)
	appBg: [21, 23, 20],
	appPanel: [25, 27, 24],
	appLine: [37, 39, 36],
	appPill: [44, 46, 43],
	appPillHi: [49, 51, 48],
	appText: [236, 238, 235],
	appMuted: [140, 143, 139],
	appGreen: [53, 115, 29],
	appDot: [74, 222, 128],
};

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

// ── ground ────────────────────────────────────────────────────────────────

/**
 * juniper-ground — a flat ground painted as a scene, so a section can own its
 * ground and cut or dissolve it on the frame the reference does.
 * cfg.keys: [{ at, colour:[r,g,b] }] scene-relative, kf-interpolated (use
 * ease:"hold" for a cut).
 */
export function JuniperGround(cfg, t) {
	if (!live(cfg, t)) return null;
	const k = kf(cfg.keys ?? [{ at: 0, colour: Q.ground }], localMs(cfg, t));
	return <div style={{ position: "absolute", inset: 0, background: rgbs(k.colour ?? Q.ground) }} />;
}

// ── icons ─────────────────────────────────────────────────────────────────

/** The line-icon set (Lucide), by config-facing name. */
export const ICONS = {
	"arrow-up": ArrowUp,
	bell: Bell,
	bot: Bot,
	box: Box,
	calendar: Calendar,
	camera: Camera,
	chart: ChartColumn,
	check: Check,
	"check-circle": CircleCheck,
	"chevron-down": ChevronDown,
	"chevron-left": ChevronLeft,
	"chevron-right": ChevronRight,
	code: Code,
	copy: Copy,
	ellipsis: Ellipsis,
	eye: Eye,
	gamepad: Gamepad2,
	glasses: Glasses,
	heart: Heart,
	hourglass: Hourglass,
	house: House,
	layers: Layers,
	link: Link,
	map: MapIcon,
	message: MessageCircle,
	mic: Mic,
	minimize: Minimize2,
	nfc: Nfc,
	plane: Plane,
	play: Play,
	plus: Plus,
	refresh: RefreshCw,
	rocket: Rocket,
	"scan-eye": ScanEye,
	phone: Smartphone,
	sparkles: Sparkles,
	store: Store,
	tablet: Tablet,
	timer: Timer,
	tv: Tv,
	upload: Upload,
	watch: Watch,
	wifi: Wifi,
};

/**
 * <Icon name size colour stroke /> — a line icon laid out INLINE (a span), so
 * it sits in a flex row of words. `size` is the icon box in px; `stroke` is
 * Lucide's strokeWidth in its 24-unit grid.
 */
export function Icon({ name, size = 24, colour = Q.ink, stroke = 2, style = null }) {
	const C = ICONS[name];
	if (!C) return null;
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
			<C size={size} color={rgbs(colour)} strokeWidth={stroke} absoluteStrokeWidth={false} />
		</span>
	);
}

// ── the placeholder brand ─────────────────────────────────────────────────

/**
 * The placeholder product mark. The reference's mark is a plain filled dot
 * (it sits inline in "with ● Rork Max" and alone on the end card), so Juniper's
 * is a filled berry disc with the juniper berry's three-point crown carved
 * near its top. At inline sizes it reads as a dot, like the reference. `cut`
 * is the carve colour (the ground behind it). Swap it for the real logo.
 */
export function JuniperMark({ size = 32, colour = Q.ink, cut = Q.ground, style = null }) {
	const c = size / 2;
	const r = size / 2;
	const arm = size * 0.11;
	const cy = size * 0.3;
	const sw = Math.max(0.8, size * 0.055);
	const arms = [-90, 30, 150].map((deg) => {
		const a = (deg * Math.PI) / 180;
		return `M${c} ${cy} L${(c + Math.cos(a) * arm).toFixed(2)} ${(cy + Math.sin(a) * arm).toFixed(2)}`;
	});
	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			style={{ display: "inline-block", flex: "0 0 auto", overflow: "visible", ...(style ?? {}) }}
		>
			<circle cx={c} cy={c} r={r} fill={rgbs(colour)} />
			<path d={arms.join(" ")} stroke={rgbs(cut)} strokeWidth={sw} strokeLinecap="round" />
		</svg>
	);
}

/**
 * <GradientText> — text filled with the tier word's left-to-right gradient
 * (yellow [240,218,119] -> orange [228,147,80], measured on "Max" at 6.0s).
 * Inline, so it sits inside a line of ink words.
 */
export function GradientText({ children, from = Q.maxA, to = Q.maxB, style = null }) {
	return (
		<span
			style={{
				backgroundImage: `linear-gradient(90deg, ${rgbs(from)}, ${rgbs(to)})`,
				WebkitBackgroundClip: "text",
				backgroundClip: "text",
				color: "transparent",
				WebkitTextFillColor: "transparent",
				...(style ?? {}),
			}}
		>
			{children}
		</span>
	);
}

/**
 * Lockup: [mark] Juniper [Max]. `mark` false drops the mark (the title beat
 * "Introducing Rork Max" has none); `tier` is the gradient tier word ("" to
 * drop it). Gap and size are measured per beat by the section.
 */
export function Wordmark({
	text = "Juniper",
	tier = "Max",
	size = 40,
	colour = Q.ink,
	weight = 600,
	mark = true,
	markScale = 0.74,
	gap = 0.26,
}) {
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: size * gap,
				font: `${weight} ${size}px ${FONT}`,
				color: rgbs(colour),
				letterSpacing: "-0.01em",
				whiteSpace: "nowrap",
			}}
		>
			{mark ? <JuniperMark size={size * markScale} colour={colour} /> : null}
			<span>
				{text}
				{tier ? (
					<>
						{" "}
						<GradientText>{tier}</GradientText>
					</>
				) : null}
			</span>
		</span>
	);
}

/**
 * <PlatformGlyph> — the neutral stand-in for the platform-vendor logo the
 * reference sets inline in "for  iPhone", "on your  device", "For any
 * device": a filled rounded tile with a small four-point spark cut out, sized to the cap height
 * of the line it sits in (`size` = font size of that line).
 */
export function PlatformGlyph({ size = 68, colour = Q.ink, style = null }) {
	// sized like the reference glyph: ~cap height tall (measured 0.68em at 9.0s)
	const h = size * 0.66;
	const w = size * 0.58;
	const r = w * 0.32;
	const cx = w / 2;
	const cy = h / 2;
	const a = w * 0.2;
	const b = w * 0.05;
	return (
		<svg
			width={w}
			height={h}
			viewBox={`0 0 ${w} ${h}`}
			style={{ display: "inline-block", flex: "0 0 auto", overflow: "visible", ...(style ?? {}) }}
		>
			<rect x={0} y={0} width={w} height={h} rx={r} fill={rgbs(colour)} />
			<path
				d={`M${cx} ${cy - a} L${cx + b} ${cy - b} L${cx + a} ${cy} L${cx + b} ${cy + b} L${cx} ${cy + a} L${cx - b} ${cy + b} L${cx - a} ${cy} L${cx - b} ${cy - b} Z`}
				fill={rgbs(Q.ground)}
			/>
		</svg>
	);
}

/**
 * <DeviceLabel> — the kinetic side label of the device comps: a small regular
 * sub-label centred over "for [glyph] Device" in semibold. Measured at 9.0s:
 * main line cap/ascender block 50 px (font ~68), sub-label ~25 px regular,
 * sub baseline ~19 px above the main line's top. Pure layout; the section
 * animates it (roll, blur, swap) with its own transforms.
 */
export function DeviceLabel({
	sub = "",
	device = "Phone",
	lead = "for",
	size = 68,
	subSize = 25,
	gap = 0.13,
	colour = Q.ink,
	subColour = Q.ink,
	subOpacity = 1,
	glyph = true,
}) {
	return (
		<div
			style={{
				display: "inline-flex",
				flexDirection: "column",
				alignItems: "center",
				whiteSpace: "nowrap",
				fontFamily: FONT,
				color: rgbs(colour),
			}}
		>
			<div
				style={{
					font: `400 ${subSize}px ${FONT}`,
					color: rgbs(subColour),
					opacity: subOpacity,
					marginBottom: size * gap,
					letterSpacing: "-0.005em",
				}}
			>
				{sub}
			</div>
			<div
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: size * 0.2,
					font: `600 ${size}px ${FONT}`,
					lineHeight: 1,
					letterSpacing: "-0.015em",
				}}
			>
				<span>{lead}</span>
				{glyph ? <PlatformGlyph size={size} colour={colour} /> : null}
				<span>{device}</span>
			</div>
		</div>
	);
}

// ── tiles ─────────────────────────────────────────────────────────────────

/**
 * Neutral app-icon tile: a rounded square in a colour family with a white
 * line glyph. Stands in for every third-party icon (home-screen grid, the
 * "Powered by" language badge, bento icons). Never a real mark.
 */
export function AppTile({
	size = 48,
	bg = [64, 120, 240],
	bg2 = null,
	icon = "sparkles",
	fg = Q.white,
	radius = 0.225,
	letter = null,
	style = null,
}) {
	const top = bg2 ? bg : bg.map((v) => Math.min(255, v + 22));
	const bot = bg2 ?? bg.map((v) => Math.max(0, v - 18));
	return (
		<div
			style={{
				position: "relative",
				width: size,
				height: size,
				borderRadius: size * radius,
				background: `linear-gradient(180deg, ${rgbs(top)}, ${rgbs(bot)})`,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flex: "0 0 auto",
				...(style ?? {}),
			}}
		>
			{letter ? (
				<span style={{ font: `700 ${size * 0.5}px ${FONT}`, color: rgbs(fg), lineHeight: 1 }}>
					{letter}
				</span>
			) : (
				<Icon name={icon} size={size * 0.56} colour={fg} stroke={2.1} />
			)}
		</div>
	);
}

/**
 * <BrandGlyph letter bg fg size /> — neutral stand-in for a third-party logo
 * shown inline in a line of text: a small rounded square with one letter.
 */
export function BrandGlyph({
	letter = "A",
	bg = [64, 120, 240],
	fg = Q.white,
	size = 18,
	radius = 0.22,
}) {
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				width: size,
				height: size,
				borderRadius: size * radius,
				background: rgbs(bg),
				color: rgbs(fg),
				font: `700 ${(size * 0.66).toFixed(1)}px ${FONT}`,
				lineHeight: 1,
				flex: "0 0 auto",
			}}
		>
			{letter}
		</span>
	);
}

// ── cursors ───────────────────────────────────────────────────────────────

/**
 * The macOS arrow pointer the reference uses (pill at 3.97-4.4s, builder
 * window 38.5-46.7s): white fill, black outline. (x,y) is the TIP; `size`
 * is the glyph height in stage px. `press` 0..1 shrinks it ~8% for a click.
 */
export function ArrowCursor({ x, y, size = 26, press = 0, opacity = 1 }) {
	const s = (size / 24) * (1 - 0.08 * clamp01(press));
	return (
		<svg
			width={24}
			height={24}
			viewBox="0 0 24 24"
			style={{
				position: "absolute",
				left: x - 4,
				top: y - 2,
				opacity,
				overflow: "visible",
				transform: `scale(${s.toFixed(4)})`,
				transformOrigin: "4px 2px",
				filter: "drop-shadow(0px 1px 1.2px rgba(0,0,0,0.3))",
			}}
		>
			<path
				d="M4 2 L4 19.2 L8.3 15.3 L11.1 21.6 L14 20.4 L11.3 14.2 L17.2 14.2 Z"
				fill="#fff"
				stroke="#000"
				strokeWidth="1.3"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/**
 * The macOS pointing hand: white fill, black outline, soft shadow. (x,y) is
 * the FINGERTIP; `size` is the glyph height in stage px.
 */
export function HandCursor({ x, y, size = 30, press = 0, opacity = 1 }) {
	const s = size / 32;
	const sq = 1 - 0.08 * clamp01(press);
	return (
		<svg
			width={38}
			height={38}
			viewBox="0 0 38 38"
			style={{
				position: "absolute",
				left: x - 11,
				top: y - 2.5,
				opacity,
				overflow: "visible",
				transform: `scale(${(s * sq).toFixed(4)})`,
				transformOrigin: "11px 2.5px",
				filter: "drop-shadow(0px 1.5px 1.5px rgba(0,0,0,0.28))",
			}}
		>
			<path
				d="M11 2.5c1.45 0 2.45 1.05 2.45 2.45V12.3l.35-.1c1.3-.38 2.55.3 2.9 1.45l.1.3c1.2-.38 2.5.25 2.9 1.35l.1.3c1.2-.3 2.4.4 2.7 1.5.6 2.2.9 4.35.6 6.45-.32 2.3-1.3 4.2-2.6 5.9V31.6H10.6v-2.35c-1.6-1.6-3.6-4-5.4-6.7-.9-1.3-.6-2.95.6-3.75 1.1-.7 2.5-.4 3.3.6l1.5 1.9V4.95C10.6 3.55 9.6 2.5 11 2.5Z"
				fill="#fff"
				stroke="#111"
				strokeWidth="1.7"
				strokeLinejoin="round"
			/>
			<path
				d="M13.5 12.4v6.2M16.9 14.1v5M20 15.7v4.1"
				stroke="#111"
				strokeWidth="1.3"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Soft shadow under floating cards / windows on the off-white ground. */
export const CARD_SHADOW = "0 14px 36px rgba(20,24,20,0.10), 0 2px 8px rgba(20,24,20,0.06)";

// ── screen slot ───────────────────────────────────────────────────────────

/**
 * <ScreenSlot> — the product slot that fills a device screen or a window
 * area where the reference shows app footage. A flat face (dark by default:
 * every device screen in the film is dark-bezelled) with a short centred
 * label such as "product UI — 3D runner game". `face` overrides the fill
 * (pass a CSS background); `tone` "light" flips the label colour.
 */
export function ScreenSlot({ label = "", face = null, tone = "dark", labelSize = 13 }) {
	const bg =
		face ??
		(tone === "light"
			? "linear-gradient(160deg, rgb(236,240,246), rgb(246,232,238))"
			: "linear-gradient(160deg, rgb(34,38,46), rgb(18,20,24))");
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: bg,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				textAlign: "center",
				padding: 12,
				font: `500 ${labelSize}px ${FONT}`,
				color: tone === "light" ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.5)",
				lineHeight: 1.3,
			}}
		>
			{label}
		</div>
	);
}

// ── device frames (pure, with a content slot) ─────────────────────────────
//
// Each frame is a block of the given `width` (height follows the measured
// ratio) laid out at (0,0) of its parent: position / scale / blur it with a
// wrapper transform in the section. `children` is the screen content and is
// clipped to the screen shape; omit it to get a ScreenSlot carrying
// `slotLabel`. Screen rects are exported (`*_SCREEN`) as width fractions so
// sections can place content or measure against them.

/** Phone — measured at 9.0s: 326 x 670 stage px. */
export const PHONE = {
	ratio: 670 / 326,
	radius: 0.168, // outer corner, x width
	rim: 0.016, // orange titanium band
	bezel: 0.022, // black glass border
	islandW: 0.276,
	islandH: 0.078,
	islandTop: 0.068,
};

export function PhoneFrame({
	width = 326,
	children = null,
	slotLabel = "product UI",
	rim = Q.phoneRim,
	rimHi = Q.phoneRimHi,
	rimLo = Q.phoneRimLo,
	island = true,
	shadow = true,
}) {
	const w = width;
	const h = w * PHONE.ratio;
	const R = w * PHONE.radius;
	const rimW = w * PHONE.rim;
	const inset = rimW + w * PHONE.bezel;
	const btn = (side, top, len) => (
		<div
			style={{
				position: "absolute",
				[side]: -w * 0.009,
				top: h * top,
				width: w * 0.012,
				height: h * len,
				borderRadius: w * 0.006,
				background: rgbs(rimLo),
			}}
		/>
	);
	return (
		<div style={{ position: "relative", width: w, height: h }}>
			{btn("left", 0.19, 0.045)}
			{btn("left", 0.26, 0.08)}
			{btn("left", 0.36, 0.08)}
			{btn("right", 0.3, 0.12)}
			<div
				style={{
					position: "absolute",
					inset: 0,
					borderRadius: R,
					background: `linear-gradient(135deg, ${rgbs(rimHi)} 0%, ${rgbs(rim)} 22%, ${rgbs(rimLo)} 55%, ${rgbs(rim)} 80%, ${rgbs(rimHi)} 100%)`,
					boxShadow: shadow ? "0 18px 40px rgba(20,20,20,0.16)" : "none",
				}}
			/>
			<div
				style={{
					position: "absolute",
					inset: rimW,
					borderRadius: R - rimW,
					background: rgbs(Q.screen),
				}}
			/>
			<div
				style={{
					position: "absolute",
					inset,
					borderRadius: R - inset,
					overflow: "hidden",
					background: rgbs(Q.screen),
				}}
			>
				{children ?? <ScreenSlot label={slotLabel} />}
			</div>
			{island ? (
				<div
					style={{
						position: "absolute",
						left: (w - w * PHONE.islandW) / 2,
						top: w * PHONE.islandTop,
						width: w * PHONE.islandW,
						height: w * PHONE.islandH,
						borderRadius: w * PHONE.islandH,
						background: "#000",
					}}
				/>
			) : null}
		</div>
	);
}

/** Watch — measured at 21.0s: case 304 x 380, band 198 wide, display inset 16. */
export const WATCH = {
	ratio: 380 / 304, // case h / w
	radius: 0.27, // case corner, x case width
	inset: 0.053, // titanium edge -> display
	screenRadius: 0.22,
	bandW: 0.65, // band width, x case width
	bandLen: 0.33, // visible band above and below the case, x case width
};

export function WatchFrame({
	width = 304,
	children = null,
	slotLabel = "product UI",
	caseColour = Q.watchCase,
	band = Q.watchBand,
	action = Q.phoneRim,
	showBand = true,
}) {
	const w = width;
	const h = w * WATCH.ratio;
	const bl = w * WATCH.bandLen;
	const bw = w * WATCH.bandW;
	const ins = w * WATCH.inset;
	const weave =
		"repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 2px, rgba(0,0,0,0.12) 2px 4px)";
	return (
		<div style={{ position: "relative", width: w, height: h + (showBand ? bl * 2 : 0) }}>
			{showBand ? (
				<>
					<div
						style={{
							position: "absolute",
							left: (w - bw) / 2,
							top: 0,
							width: bw,
							height: bl + w * 0.08,
							borderRadius: `${w * 0.05}px ${w * 0.05}px 0 0`,
							background: `${weave}, ${rgbs(band)}`,
						}}
					/>
					<div
						style={{
							position: "absolute",
							left: (w - bw) / 2,
							top: bl + h - w * 0.08,
							width: bw,
							height: bl + w * 0.08,
							borderRadius: `0 0 ${w * 0.05}px ${w * 0.05}px`,
							background: `${weave}, ${rgbs(band)}`,
						}}
					/>
				</>
			) : null}
			<div style={{ position: "absolute", left: 0, top: showBand ? bl : 0, width: w, height: h }}>
				{/* action button (left, orange) */}
				<div
					style={{
						position: "absolute",
						left: -w * 0.026,
						top: h * 0.36,
						width: w * 0.03,
						height: h * 0.2,
						borderRadius: w * 0.012,
						background: rgbs(action),
					}}
				/>
				{/* crown + side button (right) */}
				<div
					style={{
						position: "absolute",
						right: -w * 0.1,
						top: h * 0.26,
						width: w * 0.11,
						height: h * 0.17,
						borderRadius: w * 0.025,
						background: `repeating-linear-gradient(0deg, ${rgbs(caseColour)} 0 3px, rgb(30,30,30) 3px 5px)`,
					}}
				/>
				<div
					style={{
						position: "absolute",
						right: -w * 0.035,
						top: h * 0.52,
						width: w * 0.04,
						height: h * 0.18,
						borderRadius: w * 0.012,
						background: rgbs(caseColour),
					}}
				/>
				<div
					style={{
						position: "absolute",
						inset: 0,
						borderRadius: w * WATCH.radius,
						background: `linear-gradient(140deg, rgb(110,106,102), ${rgbs(caseColour)} 30%, rgb(30,29,28) 70%, rgb(92,88,84))`,
						boxShadow: "0 16px 36px rgba(20,20,20,0.18)",
					}}
				/>
				<div
					style={{
						position: "absolute",
						inset: ins,
						borderRadius: w * WATCH.screenRadius,
						overflow: "hidden",
						background: rgbs(Q.screen),
					}}
				>
					{children ?? <ScreenSlot label={slotLabel} />}
				</div>
			</div>
		</div>
	);
}

/** Tablet (landscape) — measured at 27.0s: 763 x 527, rim 9 + bezel 4. */
export const TABLET = {
	ratio: 527 / 763,
	radius: 0.052,
	rim: 0.012,
	bezel: 0.006,
};

export function TabletFrame({
	width = 763,
	children = null,
	slotLabel = "product UI",
	rim = Q.tabletRim,
	tone = "dark",
}) {
	const w = width;
	const h = w * TABLET.ratio;
	const R = w * TABLET.radius;
	const rimW = w * TABLET.rim;
	const inset = rimW + w * TABLET.bezel;
	return (
		<div style={{ position: "relative", width: w, height: h }}>
			{[0.1, 0.15].map((f) => (
				<div
					key={f}
					style={{
						position: "absolute",
						left: w * f,
						top: -w * 0.003,
						width: w * 0.042,
						height: w * 0.006,
						borderRadius: w * 0.003,
						background: rgbs(rim),
					}}
				/>
			))}
			<div
				style={{
					position: "absolute",
					inset: 0,
					borderRadius: R,
					background: `linear-gradient(180deg, rgb(150,152,149), ${rgbs(rim)} 30%, rgb(56,58,55))`,
					boxShadow: "0 16px 38px rgba(20,20,20,0.14)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					inset: rimW,
					borderRadius: R - rimW,
					background: rgbs(Q.screen),
				}}
			/>
			<div
				style={{
					position: "absolute",
					inset,
					borderRadius: R - inset,
					overflow: "hidden",
					background: rgbs(Q.screen),
				}}
			>
				{children ?? <ScreenSlot label={slotLabel} tone={tone} />}
			</div>
		</div>
	);
}

/** TV — measured at 32.0s: a bare 16:9 screen, 989 x 555, corner ~18. */
export const TV = { ratio: 555 / 989, radius: 0.018 };

export function TvFrame({ width = 989, children = null, slotLabel = "product UI" }) {
	const w = width;
	return (
		<div
			style={{
				position: "relative",
				width: w,
				height: w * TV.ratio,
				borderRadius: w * TV.radius,
				overflow: "hidden",
				background: rgbs(Q.screen),
				boxShadow: "0 16px 40px rgba(20,20,20,0.14)",
			}}
		>
			{children ?? <ScreenSlot label={slotLabel} />}
		</div>
	);
}

/**
 * Headset window — a glass app window floating in the headset's view;
 * measured at 35.0s: 855 x 545, corner ~34, a 60px title band with a centred
 * bold white title, a round back button left and a round collapse button
 * right (translucent white). Content runs full-bleed under the title band.
 */
export const HEADSET = { ratio: 545 / 855, radius: 0.04, bar: 0.07 };

export function HeadsetWindow({
	width = 855,
	title = "My VR game",
	children = null,
	slotLabel = "product UI",
}) {
	const w = width;
	const h = w * HEADSET.ratio;
	const bar = w * HEADSET.bar;
	const btn = w * 0.033;
	const roundBtn = (side, icon) => (
		<div
			style={{
				position: "absolute",
				[side]: w * 0.02,
				top: (bar - btn) / 2,
				width: btn,
				height: btn,
				borderRadius: btn,
				background: "rgba(255,255,255,0.32)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<Icon name={icon} size={btn * 0.6} colour={Q.white} stroke={2.4} />
		</div>
	);
	return (
		<div
			style={{
				position: "relative",
				width: w,
				height: h,
				borderRadius: w * HEADSET.radius,
				overflow: "hidden",
				background: "rgb(60,52,44)",
				boxShadow: "0 16px 40px rgba(20,20,20,0.14)",
			}}
		>
			{children ?? <ScreenSlot label={slotLabel} />}
			<div
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					top: 0,
					height: bar,
					background: "linear-gradient(180deg, rgba(0,0,0,0.26), rgba(0,0,0,0.12))",
					borderBottom: "1px solid rgba(255,255,255,0.18)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					font: `700 ${w * 0.021}px ${FONT}`,
					color: "#fff",
				}}
			>
				{title}
			</div>
			{roundBtn("left", "chevron-left")}
			{roundBtn("right", "minimize")}
		</div>
	);
}

// ── the measured "Ultra" watch (s3 + s4; promoted from juniper-s3.jsx) ─────

/**
 * UltraWatch — measured on f640/f720 (stage px, scale 1, origin = ink bbox top-left
 * at x676,y72; whole bbox 348 x 575, incl. crown):
 *   body (dark titanium)   x0–330,  y74–500: lug shoulders 242 wide on top/bottom, then a
 *                          tall corner taper (BODY_LEFT); side walls visible ~12 px
 *   bezel ring (light)     x12–318, y96–476, r80  (the "case 304x380" of BEATS)
 *   display glass (black)  x21–309, y115–459, r74; content slot x35–295, y129–446, r58
 *   band                   x63–267 at the case, tapering to x66–264 at its ends
 *                          (204 -> 198), ends y0 and y575 with r12 corners; woven grey
 *   crown guard / crown    guard x316–343 y176–402; crown x329–348 y204–270 (ridged)
 *   side button            x328–346 y306–396;  action button (orange) x0–8 y276–368
 * The shared WatchFrame (case 1.25:1 with no ring, band 0.65w with no taper, bands
 * 0.33w long) reads squat and long-strapped next to the reference.
 */
// Left wall of the body, measured row by row on f640/f720 (rel x at rel y, bbox
// origin x676,y72): lug shoulder x51 at y78 -> x44 by y96, then the corner tapers
// out 40,34,29,24,20,16,13,10,8,6,4,3,2,1,0 over y114..204. Mirrored about the
// body centre (x165) and about y287 (bottom rows 528..572 measured symmetric).
const BODY_LEFT = [
	[58, 74],
	[52, 76],
	[48, 80],
	[46, 86],
	[45, 92],
	[44, 100],
	[44, 108],
	[40, 114],
	[34, 120],
	[29, 126],
	[24, 132],
	[20, 138],
	[16, 144],
	[13, 150],
	[10, 156],
	[8, 162],
	[6, 168],
	[4, 174],
	[3, 180],
	[2, 186],
	[1, 192],
	[0, 204],
];
const BODY_PATH = (() => {
	const top = BODY_LEFT;
	const bot = [...BODY_LEFT].reverse().map(([x, y]) => [x, 574 - y]);
	const left = [...top, ...bot];
	const right = [...left].reverse().map(([x, y]) => [330 - x, y]);
	return `M${[...left, ...right].map(([x, y]) => `${x} ${y}`).join(" L")} Z`;
})();

export const ULTRA = {
	w: 348,
	h: 575,
	// content area inside the black display glass, measured as the white flash at
	// f673: x711–971, y201–518, corner ~58 (black glass x698–984, y188–530)
	display: { x: 35, y: 129, w: 260, h: 317, r: 58 },
};

export function UltraWatch({ id = "uw", children = null, slotLabel = "product UI" }) {
	const g = (n) => `${id}-${n}`;
	const d = ULTRA.display;
	return (
		<div style={{ position: "relative", width: ULTRA.w, height: ULTRA.h }}>
			<svg
				width={ULTRA.w}
				height={ULTRA.h}
				viewBox={`0 0 ${ULTRA.w} ${ULTRA.h}`}
				style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
				aria-hidden="true"
			>
				<defs>
					<linearGradient id={g("bt")} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="rgb(104,106,107)" />
						<stop offset="0.07" stopColor="rgb(74,77,79)" />
						<stop offset="0.45" stopColor="rgb(60,63,65)" />
						<stop offset="0.8" stopColor="rgb(44,47,48)" />
						<stop offset="1" stopColor="rgb(26,28,29)" />
					</linearGradient>
					<linearGradient id={g("bb")} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="rgb(26,28,29)" />
						<stop offset="0.3" stopColor="rgb(38,41,42)" />
						<stop offset="0.7" stopColor="rgb(56,59,61)" />
						<stop offset="0.93" stopColor="rgb(76,79,80)" />
						<stop offset="1" stopColor="rgb(96,98,99)" />
					</linearGradient>
					<linearGradient id={g("bs")} x1="0" y1="0" x2="1" y2="0">
						<stop offset="0" stopColor="rgba(0,0,0,0.28)" />
						<stop offset="0.12" stopColor="rgba(0,0,0,0)" />
						<stop offset="0.88" stopColor="rgba(0,0,0,0)" />
						<stop offset="1" stopColor="rgba(0,0,0,0.28)" />
					</linearGradient>
					<pattern id={g("wv")} width="6" height="4" patternUnits="userSpaceOnUse">
						<rect x="0" y="0" width="6" height="1.3" fill="rgba(255,255,255,0.12)" />
						<rect x="0" y="2" width="6" height="1.3" fill="rgba(0,0,0,0.22)" />
						<rect x="0" y="0" width="1.2" height="4" fill="rgba(0,0,0,0.12)" />
						<rect x="3" y="0" width="1" height="4" fill="rgba(255,255,255,0.05)" />
					</pattern>
					<linearGradient id={g("body")} x1="0" y1="0" x2="1" y2="0">
						<stop offset="0" stopColor="rgb(24,23,22)" />
						<stop offset="0.025" stopColor="rgb(52,50,48)" />
						<stop offset="0.5" stopColor="rgb(32,31,30)" />
						<stop offset="0.975" stopColor="rgb(52,50,48)" />
						<stop offset="1" stopColor="rgb(24,23,22)" />
					</linearGradient>
					<linearGradient id={g("ring")} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="rgb(120,115,112)" />
						<stop offset="0.06" stopColor="rgb(88,84,81)" />
						<stop offset="0.5" stopColor="rgb(74,71,68)" />
						<stop offset="0.94" stopColor="rgb(82,78,75)" />
						<stop offset="1" stopColor="rgb(102,98,95)" />
					</linearGradient>
					<linearGradient id={g("act")} x1="0" y1="0" x2="1" y2="0">
						<stop offset="0" stopColor="rgb(170,98,52)" />
						<stop offset="0.5" stopColor="rgb(206,129,77)" />
						<stop offset="1" stopColor="rgb(150,86,46)" />
					</linearGradient>
					<pattern id={g("rdg")} width="4" height="3" patternUnits="userSpaceOnUse">
						<rect x="0" y="0" width="4" height="3" fill="rgb(118,116,114)" />
						<rect x="0" y="1.8" width="4" height="1.2" fill="rgb(34,33,32)" />
					</pattern>
				</defs>
				{/* bands (behind everything) */}
				<path
					d="M63 110 L66 12 Q66 0 78 0 L252 0 Q264 0 264 12 L267 110 Z"
					fill={`url(#${g("bt")})`}
				/>
				<path
					d="M63 110 L66 12 Q66 0 78 0 L252 0 Q264 0 264 12 L267 110 Z"
					fill={`url(#${g("wv")})`}
				/>
				<path
					d="M63 110 L66 12 Q66 0 78 0 L252 0 Q264 0 264 12 L267 110 Z"
					fill={`url(#${g("bs")})`}
				/>
				<rect x="91" y="552" width="148" height="23" rx="6" fill={`url(#${g("bb")})`} />
				<rect x="91" y="552" width="148" height="23" rx="6" fill={`url(#${g("wv")})`} />
				<path
					d="M63 466 L267 466 L264 548 Q263 562 249 562 L81 562 Q67 562 66 548 Z"
					fill={`url(#${g("bb")})`}
				/>
				<path
					d="M63 466 L267 466 L264 548 Q263 562 249 562 L81 562 Q67 562 66 548 Z"
					fill={`url(#${g("wv")})`}
				/>
				<path
					d="M63 466 L267 466 L264 548 Q263 562 249 562 L81 562 Q67 562 66 548 Z"
					fill={`url(#${g("bs")})`}
				/>
				{/* crown guard, crown, side button (behind the body's right wall) */}
				<rect x="316" y="176" width="27" height="226" rx="10" fill="rgb(36,35,34)" />
				<rect x="329" y="204" width="14" height="66" rx="3" fill={`url(#${g("rdg")})`} />
				<rect x="342" y="207" width="6" height="60" rx="2.5" fill="rgb(92,91,90)" />
				<rect x="326" y="306" width="20" height="90" rx="5" fill="rgb(70,68,66)" />
				{/* body: measured outline (lug shoulders + tall corner taper), bezel ring, display */}
				<path d={BODY_PATH} fill={`url(#${g("body")})`} />
				<rect x="12" y="96" width="306" height="380" rx="80" fill={`url(#${g("ring")})`} />
				<rect x="21" y="115" width="288" height="344" rx="74" fill="rgb(0,1,0)" />
				{/* action button */}
				<rect x="0" y="276" width="8" height="92" rx="3" fill={`url(#${g("act")})`} />
			</svg>
			<div
				style={{
					position: "absolute",
					left: d.x,
					top: d.y,
					width: d.w,
					height: d.h,
					borderRadius: d.r,
					overflow: "hidden",
					background: rgbs(Q.screen),
				}}
			>
				{children ?? <ScreenSlot label={slotLabel} />}
			</div>
		</div>
	);
}
