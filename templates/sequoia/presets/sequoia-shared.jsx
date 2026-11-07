/**
 * sequoia-shared.jsx — the vocabulary every sequoia preset is built from.
 *
 * Measured off the Aside launch film (87.5s, 1920x1080 @29.97fps; frames
 * resampled to a 30fps clock and scaled to the 1280x720 stage, so stage px =
 * ref px / 1.5):
 *
 *   GROUNDS  two flat grounds and nothing else: a warm graphite
 *            [38,40,37] (green-cast, G leads R/B by 2) and an off-white
 *            [254,255,253]. No gradient, no texture, no vignette — sampled in
 *            the corners on every beat. They swap by hard cut (66.567s,
 *            79.267s), by a circle wipe (53.0-53.1s) or by a light dissolve
 *            (20.83-21.27s); see the template config.
 *   TYPE     a neo-grotesk (Inter Display class) at weight ~500-600, pure
 *            white [255,255,255] on graphite and near-black [2,4,1] on
 *            off-white. Inter is used if installed, else Segoe UI (shipped
 *            with Windows), so nothing binary.
 *   ICONS    thin-stroke line icons inline with the type (globe, key, history,
 *            lock, eye, eye-off, server, sign-in, messages, video,
 *            presentation) — Lucide's set (lucide-react is already a repo
 *            dependency) matches their weight and corner style.
 *
 * Every export is a pure function of its props / t.
 */
import {
	ArrowUp,
	Asterisk,
	Bot,
	Building2,
	Calendar,
	ChevronDown,
	ChevronUp,
	CirclePlay,
	Clock,
	Compass,
	CreditCard,
	Database,
	Eye,
	EyeOff,
	FileSpreadsheet,
	FileText,
	FolderOpen,
	Ghost,
	Globe,
	HardDrive,
	History,
	KeyRound,
	Lock,
	LogIn,
	Mail,
	MessageCircle,
	MessageSquare,
	MessagesSquare,
	Plus,
	Presentation,
	Search,
	Send,
	Server,
	Sparkle,
	SquareUserRound,
	TreePine,
	Users,
	Video,
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
	dark: [38, 40, 37],
	light: [254, 255, 253],
	white: [255, 255, 255],
	ink: [2, 4, 1],
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
 * sequoia-ground — a flat ground painted as a scene, so a section can own its
 * ground and hard-cut or dissolve it on the frame the reference does.
 * cfg.keys: [{ at, colour:[r,g,b] }] scene-relative, kf-interpolated (use
 * ease:"hold" for a cut).
 */
export function SequoiaGround(cfg, t) {
	if (!live(cfg, t)) return null;
	const k = kf(cfg.keys ?? [{ at: 0, colour: Q.dark }], localMs(cfg, t));
	return <div style={{ position: "absolute", inset: 0, background: rgbs(k.colour ?? Q.dark) }} />;
}

// ── icons ─────────────────────────────────────────────────────────────────

/** The line-icon set, by config-facing name. */
export const ICONS = {
	globe: Globe,
	key: KeyRound,
	history: History,
	lock: Lock,
	eye: Eye,
	"eye-off": EyeOff,
	server: Server,
	drive: HardDrive,
	"sign-in": LogIn,
	messages: MessagesSquare,
	message: MessageSquare,
	chat: MessageCircle,
	video: Video,
	presentation: Presentation,
	ghost: Ghost,
	card: CreditCard,
	"chevron-down": ChevronDown,
	"chevron-up": ChevronUp,
	plus: Plus,
	"arrow-up": ArrowUp,
	search: Search,
	send: Send,
	compass: Compass,
	mail: Mail,
	sparkle: Sparkle,
	asterisk: Asterisk,
	bot: Bot,
	building: Building2,
	calendar: Calendar,
	play: CirclePlay,
	clock: Clock,
	database: Database,
	doc: FileText,
	sheet: FileSpreadsheet,
	folder: FolderOpen,
	user: SquareUserRound,
	users: Users,
	tree: TreePine,
};

/**
 * <Icon name size colour stroke /> — a line icon laid out INLINE (it is a
 * span), so it sits in a flex row of words. `size` is the icon box in px;
 * `stroke` is Lucide's strokeWidth in its 24-unit grid (the reference's icons
 * read ~2.0 at body size).
 */
export function Icon({ name, size = 24, colour = Q.white, stroke = 2, style = null }) {
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

// ── the placeholder brand mark ────────────────────────────────────────────

/**
 * The placeholder product mark: a stroked ring holding a pine glyph. It
 * stands where the reference's circled-glyph mark sits (beside the wordmark,
 * alone on the lockups, as the app icon's face). Same weight as the type.
 * Swap it for the real logo.
 */
export function SequoiaMark({ size = 32, colour = Q.white, stroke = 0.085, style = null }) {
	const sw = size * stroke;
	const r = size / 2 - sw / 2;
	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			style={{ display: "inline-block", flex: "0 0 auto", overflow: "visible", ...(style ?? {}) }}
		>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke={rgbs(colour)}
				strokeWidth={sw}
			/>
			<path
				d={`M${size * 0.5} ${size * 0.2} L${size * 0.7} ${size * 0.47} L${size * 0.6} ${size * 0.47} L${size * 0.74} ${size * 0.67} L${size * 0.26} ${size * 0.67} L${size * 0.4} ${size * 0.47} L${size * 0.3} ${size * 0.47} Z M${size * 0.46} ${size * 0.67} h${size * 0.08} v${size * 0.13} h${-size * 0.08} Z`}
				fill={rgbs(colour)}
			/>
		</svg>
	);
}

/** Mark + wordmark lockup laid out inline (gap and size measured per beat). */
export function Wordmark({
	text = "Sequoia",
	size = 40,
	colour = Q.white,
	weight = 500,
	gap = 0.32,
}) {
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: size * gap,
				font: `${weight} ${size}px ${FONT}`,
				color: rgbs(colour),
				letterSpacing: "-0.02em",
				whiteSpace: "nowrap",
			}}
		>
			<SequoiaMark size={size * 0.86} colour={colour} />
			{text}
		</span>
	);
}

// ── app tiles (neutral stand-ins for third-party app icons) ───────────────

/**
 * Neutral app-icon tiles. The reference shows real third-party icons (other
 * browsers, AI assistants, Safari, Mail); a template must not, so each is a
 * rounded tile in a similar colour family carrying a generic glyph.
 * kinds: "dawn" (white tile, warm gradient orb), "navy" (navy tile, paper
 * plane), "ember" (orange tile, asterisk), "compass" (blue, compass),
 * "mail" (blue, envelope), "spark" (white, gradient sparkle),
 * "sequoia" (the product's own icon: graphite glass tile with the mark),
 * "trash" (the dock's translucent bin).
 */
export function AppTile({ kind = "dawn", size = 64, style = null, opacity = 1 }) {
	const rad = size * 0.225;
	const base = {
		position: "relative",
		width: size,
		height: size,
		borderRadius: rad,
		flex: "0 0 auto",
		overflow: "hidden",
		opacity,
		boxShadow: `0 ${size * 0.04}px ${size * 0.1}px rgba(0,0,0,0.28)`,
		...(style ?? {}),
	};
	const centre = {
		position: "absolute",
		inset: 0,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	};
	const g = (name, colour, k = 0.55, stroke = 2) => (
		<div style={centre}>
			<Icon name={name} size={size * k} colour={colour} stroke={stroke} />
		</div>
	);
	switch (kind) {
		case "dawn":
			return (
				<div style={{ ...base, background: "linear-gradient(180deg,#fdfdff,#e9ecf3)" }}>
					<div
						style={{
							position: "absolute",
							left: size * 0.2,
							top: size * 0.2,
							width: size * 0.6,
							height: size * 0.6,
							borderRadius: "50%",
							background:
								"linear-gradient(180deg,#5b8ee6 0%,#9cc3f0 30%,#f5d34f 62%,#f08a3c 82%,#e8456e 100%)",
						}}
					/>
				</div>
			);
		case "navy":
			return (
				<div
					style={{ ...base, background: "radial-gradient(circle at 50% 40%,#2f4fa8,#18245a 75%)" }}
				>
					{g("send", [235, 242, 255], 0.5, 2.4)}
				</div>
			);
		case "ember":
			return (
				<div style={{ ...base, background: "linear-gradient(180deg,#ec7a57,#d9573b)" }}>
					{g("asterisk", [255, 240, 232], 0.62, 2.2)}
				</div>
			);
		case "compass":
			return (
				<div style={{ ...base, background: "linear-gradient(180deg,#f7f9fc,#dfe6ef)" }}>
					{g("compass", [38, 128, 235], 0.7, 1.6)}
				</div>
			);
		case "mail":
			return (
				<div style={{ ...base, background: "linear-gradient(180deg,#3fa2fb,#1166e8)" }}>
					{g("mail", [255, 255, 255], 0.6, 1.8)}
				</div>
			);
		case "spark":
			return (
				<div style={{ ...base, background: "linear-gradient(180deg,#ffffff,#eef1f6)" }}>
					<div style={centre}>
						<svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24">
							<defs>
								<linearGradient id="sq-spark" x1="0" y1="0" x2="1" y2="1">
									<stop offset="0" stopColor="#4f8df7" />
									<stop offset="0.5" stopColor="#a463f2" />
									<stop offset="1" stopColor="#f2655b" />
								</linearGradient>
							</defs>
							<path
								d="M12 1.5 C12.9 7.6 16.4 11.1 22.5 12 C16.4 12.9 12.9 16.4 12 22.5 C11.1 16.4 7.6 12.9 1.5 12 C7.6 11.1 11.1 7.6 12 1.5 Z"
								fill="url(#sq-spark)"
							/>
						</svg>
					</div>
				</div>
			);
		case "sequoia":
			return (
				<div
					style={{
						...base,
						background: "linear-gradient(180deg,#4a5d66 0%,#22343c 55%,#0f1d24 100%)",
						boxShadow: `inset 0 ${size * 0.02}px ${size * 0.03}px rgba(255,255,255,0.35), 0 ${size * 0.04}px ${size * 0.1}px rgba(0,0,0,0.3)`,
					}}
				>
					<div style={centre}>
						<SequoiaMark size={size * 0.56} colour={[226, 238, 242]} />
					</div>
				</div>
			);
		case "trash":
			return (
				<div style={{ ...base, overflow: "visible", boxShadow: "none" }}>
					<div
						style={{
							position: "absolute",
							left: size * 0.16,
							top: size * 0.18,
							width: size * 0.68,
							height: size * 0.78,
							borderRadius: `${size * 0.05}px ${size * 0.05}px ${size * 0.12}px ${size * 0.12}px`,
							background: "linear-gradient(180deg,rgba(40,42,46,0.9),rgba(14,15,17,0.95))",
							border: `${Math.max(1, size * 0.02)}px solid rgba(200,205,215,0.35)`,
						}}
					/>
					<div
						style={{
							position: "absolute",
							left: size * 0.12,
							top: size * 0.12,
							width: size * 0.76,
							height: size * 0.1,
							borderRadius: size * 0.05,
							background: "linear-gradient(180deg,#d9dde3,#8a9099)",
						}}
					/>
				</div>
			);
		default:
			return <div style={{ ...base, background: "#888" }} />;
	}
}

/**
 * <BrandGlyph letter bg fg size /> — neutral stand-in for a third-party
 * service logo shown inline in UI rows (the reference's LinkedIn / Netflix /
 * Amazon / bank marks): a small rounded square in the service's colour family
 * with a single letter. Never a real mark.
 */
export function BrandGlyph({
	letter = "A",
	bg = [10, 102, 194],
	fg = Q.white,
	size = 18,
	radius = 0.18,
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
				font: `700 ${(size * 0.68).toFixed(1)}px ${FONT}`,
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
 * The macOS pointing hand: white fill, black outline, soft shadow. (x,y) is
 * the FINGERTIP; `size` is the glyph height in stage px (no double scaling).
 * `press` 0..1 squashes it ~8% for the click.
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

/** The macOS text I-beam. (x,y) is its CENTRE; `size` is its height. */
export function IBeamCursor({ x, y, size = 22, opacity = 1, colour = [250, 250, 250] }) {
	const h = size;
	const w = size * 0.42;
	return (
		<svg
			width={w + 4}
			height={h + 4}
			viewBox={`${-w / 2 - 2} ${-h / 2 - 2} ${w + 4} ${h + 4}`}
			style={{
				position: "absolute",
				left: x - w / 2 - 2,
				top: y - h / 2 - 2,
				opacity,
				overflow: "visible",
			}}
		>
			<path
				d={`M${-w / 2} ${-h / 2} Q0 ${-h / 2} 0 ${-h / 2 + h * 0.12} Q0 ${-h / 2} ${w / 2} ${-h / 2} M0 ${-h / 2 + h * 0.12} V${h / 2 - h * 0.12} M${-w / 2} ${h / 2} Q0 ${h / 2} 0 ${h / 2 - h * 0.12} Q0 ${h / 2} ${w / 2} ${h / 2}`}
				fill="none"
				stroke="#111"
				strokeWidth={size * 0.16}
				strokeLinecap="round"
			/>
			<path
				d={`M${-w / 2} ${-h / 2} Q0 ${-h / 2} 0 ${-h / 2 + h * 0.12} Q0 ${-h / 2} ${w / 2} ${-h / 2} M0 ${-h / 2 + h * 0.12} V${h / 2 - h * 0.12} M${-w / 2} ${h / 2} Q0 ${h / 2} 0 ${h / 2 - h * 0.12} Q0 ${h / 2} ${w / 2} ${h / 2}`}
				fill="none"
				stroke={rgbs(colour)}
				strokeWidth={size * 0.07}
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Soft shadow under floating UI on the off-white ground. */
export const CARD_SHADOW = "0 12px 32px rgba(20,24,20,0.08), 0 2px 6px rgba(20,24,20,0.05)";
