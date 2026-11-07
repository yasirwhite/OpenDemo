/**
 * willow-s3.jsx — presets for willow section 3: the "I'm your companion /
 * I can do [chips] / I work in your [tabs] +" passage (25.375-31.333s) and
 * the close "Discover a new way to work / Claim your companion today" + end
 * card (76.958-90.0s). One vocabulary for both ranges.
 *
 * All measurements are on the 1280x720 stage (ref px / 1.5), full-decode
 * 24fps frames; notes with per-frame tables live in
 * .demo-build/nightly/2026-10-30/willow/sections/s3/notes.md.
 *
 * Type metrics: FONT resolves to Segoe UI here. With line-height 1 a Segoe
 * line box puts the baseline at 0.914em and the cap height is 0.700em, so
 * the cap CENTRE sits 0.564em below the box top (0.064em below its middle);
 * Georgia (SERIF) baseline 0.849em, cap 0.693em. Everything here positions
 * type by cap centre / baseline using these, so copy of any length reflows
 * horizontally (flex, auto width) without moving vertically.
 *
 * Every render is a pure function of t.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import { FONT, HandCursor, kf, live, localMs, rgbs, SERIF, W } from "./willow-shared.jsx";

const SEG_BASE = 0.914; // Segoe UI baseline from line-box top at line-height 1
const SEG_CAP = 0.7; // Segoe UI cap height
const GEO_BASE = 0.849; // Georgia baseline at line-height 1
const INK = [33, 33, 32]; // kinetic-type ink, measured 26.5-31s and 77-83s

// ── helpers ────────────────────────────────────────────────────────────────

/** Exponential settle: offset `amp` decaying with time constant `tau` ms. */
const settle = (amp, el, tau) => (el < 0 ? amp : amp * Math.exp(-el / Math.max(1, tau)));

/** Piecewise-linear lookup in a sorted [[x, y], ...] table (clamped ends). */
function table(tab, x) {
	if (x <= tab[0][0]) return tab[0][1];
	for (let i = 1; i < tab.length; i++) {
		if (x <= tab[i][0]) {
			const [x0, y0] = tab[i - 1],
				[x1, y1] = tab[i];
			return lerp(y0, y1, (x - x0) / Math.max(1e-6, x1 - x0));
		}
	}
	return tab[tab.length - 1][1];
}

/** Optional on-twos stepping: quantise scene ms onto a `fps` grid anchored
 *  at absolute `phaseMs` (the reference end card animates at 12fps). */
function steppedMs(cfg, t) {
	const ms = t * 1000;
	const st = cfg.step;
	if (!st || !st.fps) return ms - cfg.startMs;
	const p = 1000 / st.fps,
		ph = st.phaseMs ?? cfg.startMs;
	return Math.floor((ms - ph) / p + 1e-6) * p + ph - cfg.startMs;
}

const spanText = (parts, ink) =>
	(Array.isArray(parts) ? parts : [{ text: String(parts ?? "") }]).map((p, i) => (
		<span key={i} style={{ color: rgbs(p.colour ?? ink) }}>
			{p.text}
		</span>
	));

// ── neutral glyphs (no brand marks) ────────────────────────────────────────

/**
 * Icon glyphs drawn on a 24-unit grid, filled with `colour`. Generic shapes
 * only — the reference's third-party/brand icons (Notion, Google Docs, the
 * product mark, Apple/Windows) are replaced by neutral stand-ins.
 */
export function Glyph({ kind, size = 64, colour = INK, bg = null }) {
	const c = rgbs(colour);
	const k = bg ? rgbs(bg) : "#fff";
	const sw = {
		stroke: c,
		strokeWidth: 2.6,
		fill: "none",
		strokeLinecap: "round",
		strokeLinejoin: "round",
	};
	let body;
	switch (kind) {
		case "receipt":
			body = (
				<path
					d="M5 2.5h11a3 3 0 0 1 3 3V21l-2.4-1.6L14 21l-2.6-1.6L8.8 21l-2.4-1.6L4 21V3.5a1 1 0 0 1 1-1Z M16.5 2.5h1.8a2.2 2.2 0 0 1 2.2 2.2V8h-4Z"
					fill={c}
				/>
			);
			break;
		case "search":
			body = (
				<g {...sw} strokeWidth={2.8}>
					<circle cx="10.5" cy="10.5" r="6.8" />
					<path d="M15.6 15.6 21 21" />
				</g>
			);
			break;
		case "pie":
			body = (
				<g>
					<path d="M11 3.2A8.8 8.8 0 1 0 20.8 13H11Z" fill={c} />
					<path d="M13.2 1.6A9 9 0 0 1 22.4 10.8h-9.2Z" fill={c} />
				</g>
			);
			break;
		case "card":
			body = (
				<g>
					<rect x="2" y="4" width="20" height="16" rx="3.4" fill={c} />
					<circle cx="8" cy="10.5" r="2.4" fill={k} />
					<path d="M4.8 16.6c.6-2 1.8-2.9 3.2-2.9s2.6.9 3.2 2.9Z" fill={k} />
					<rect x="13" y="8.6" width="6" height="1.9" rx=".9" fill={k} />
					<rect x="13" y="12.6" width="4.6" height="1.9" rx=".9" fill={k} />
				</g>
			);
			break;
		case "people":
			body = (
				<g fill={c}>
					<circle cx="9" cy="7.2" r="4.4" />
					<path d="M1.2 19.6c0-4.2 3.5-6.8 7.8-6.8s7.8 2.6 7.8 6.8a1.6 1.6 0 0 1-1.6 1.6H2.8a1.6 1.6 0 0 1-1.6-1.6Z" />
					<circle cx="17.4" cy="8.6" r="3.3" />
					<path d="M18.4 21.2h2.8a1.6 1.6 0 0 0 1.6-1.6c0-3.3-2.5-5.4-5.4-5.6 1.3 1.4 2 3.2 2 5.3Z" />
				</g>
			);
			break;
		case "dollar":
			body = (
				<g>
					<rect x="2" y="2" width="20" height="20" rx="5" fill={c} />
					<text
						x="12"
						y="17.6"
						textAnchor="middle"
						fontSize="15"
						fontWeight="700"
						fontFamily="Segoe UI, Arial"
						fill={k}
					>
						$
					</text>
				</g>
			);
			break;
		case "wand":
			body = (
				<g>
					<path d="M4 20 15.5 8.5" stroke={c} strokeWidth="3.2" strokeLinecap="round" />
					<path
						d="M17.5 2.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9Z M9 2.8l.6 1.4 1.4.6-1.4.6L9 6.8l-.6-1.4L7 4.8l1.4-.6Z M20.4 11.2l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z"
						fill={c}
					/>
				</g>
			);
			break;
		case "code":
			body = (
				<g>
					<rect x="2" y="2" width="20" height="20" rx="5" fill={c} />
					<path
						d="M9.6 8.4 6 12l3.6 3.6M14.4 8.4 18 12l-3.6 3.6"
						stroke={k}
						strokeWidth="2.2"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</g>
			);
			break;
		case "pen":
			body = (
				<g>
					<path
						d="M3 21l1.1-4.6L15.6 4.9a2.3 2.3 0 0 1 3.3 0l.2.2a2.3 2.3 0 0 1 0 3.3L7.6 19.9Z"
						fill={c}
					/>
					<rect x="2.5" y="21" width="19" height="1.9" rx=".9" fill={c} />
				</g>
			);
			break;
		case "clipboard":
			body = (
				<g>
					<rect x="3.5" y="4" width="17" height="18.5" rx="3.6" fill={c} />
					<rect
						x="8"
						y="1.8"
						width="8"
						height="4.4"
						rx="1.6"
						fill={c}
						stroke={k}
						strokeWidth="1.4"
					/>
					<rect x="7.4" y="11" width="9.2" height="1.9" rx=".9" fill={k} />
					<rect x="7.4" y="15.2" width="9.2" height="1.9" rx=".9" fill={k} />
				</g>
			);
			break;
		case "tabs":
			body = (
				<g>
					<rect x="2" y="6.5" width="20" height="14.5" rx="3" fill={c} />
					<path d="M3.5 7.5V5.5a2.5 2.5 0 0 1 2.5-2.5h5a2.5 2.5 0 0 1 2.5 2.5v2" fill={c} />
					<rect x="14.4" y="4" width="6.6" height="3.4" rx="1.6" fill={c} opacity=".55" />
				</g>
			);
			break;
		case "grid":
			body = (
				<g>
					<rect
						x="2.4"
						y="2.4"
						width="19.2"
						height="19.2"
						rx="4.4"
						fill="none"
						stroke={c}
						strokeWidth="2.2"
					/>
					<rect x="6.4" y="6.4" width="4.6" height="4.6" rx="1.2" fill={c} />
					<rect x="13" y="6.4" width="4.6" height="4.6" rx="1.2" fill={c} />
					<rect x="6.4" y="13" width="4.6" height="4.6" rx="1.2" fill={c} />
					<rect x="13" y="13" width="4.6" height="4.6" rx="1.2" fill={c} />
				</g>
			);
			break;
		case "doc":
			body = (
				<g>
					<path
						d="M5.5 1.5h9l5 5V21a1.6 1.6 0 0 1-1.6 1.6H5.5A1.6 1.6 0 0 1 3.9 21V3.1a1.6 1.6 0 0 1 1.6-1.6Z"
						fill={c}
					/>
					<path d="M14.5 1.5v3.4a1.6 1.6 0 0 0 1.6 1.6h3.4Z" fill={k} opacity=".55" />
					<rect x="7.2" y="12" width="9.4" height="1.7" rx=".8" fill={k} />
					<rect x="7.2" y="15.6" width="6.4" height="1.7" rx=".8" fill={k} />
				</g>
			);
			break;
		case "laptop":
			body = (
				<g>
					<rect
						x="4"
						y="5"
						width="16"
						height="11"
						rx="1.6"
						fill="none"
						stroke={c}
						strokeWidth="2"
					/>
					<path d="M1.5 18.2h21l-1 1.8h-19Z" fill={c} />
				</g>
			);
			break;
		case "window":
			body = (
				<g>
					<rect
						x="2.5"
						y="4"
						width="19"
						height="16"
						rx="2.4"
						fill="none"
						stroke={c}
						strokeWidth="2"
					/>
					<path d="M2.5 8.6h19" stroke={c} strokeWidth="2" />
					<circle cx="5.4" cy="6.3" r=".9" fill={c} />
					<circle cx="8" cy="6.3" r=".9" fill={c} />
				</g>
			);
			break;
		case "dot":
		default:
			body = <circle cx="12" cy="12" r="8" fill={c} />;
	}
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			style={{ display: "block", flex: "none", overflow: "visible" }}
		>
			{body}
		</svg>
	);
}

/** Placeholder brand mark (the template's logo slot): three coral petals and
 *  a small leaf, drawn — NOT the reference product's mark. */
function PlaceholderMark({ size = 74, colour = [234, 84, 62], leaf = [190, 205, 60] }) {
	const c = rgbs(colour);
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			style={{ display: "block", overflow: "visible" }}
		>
			<circle cx="12" cy="7.6" r="4.4" fill={c} />
			<circle cx="7.3" cy="15.4" r="4.4" fill={c} />
			<circle cx="16.7" cy="15.4" r="4.4" fill={c} />
			<path d="M12 1.2c2.6.2 4 1.4 4.2 3.4-2.4.1-3.8-1-4.2-3.4Z" fill={rgbs(leaf)} />
		</svg>
	);
}

// ── willow-speech-bubble ───────────────────────────────────────────────────

/**
 * A rounded speech bubble with a downward tail, text spans and an optional
 * trailing glyph. Measured 25.375-26.458s: box (253,100)-(972,251) i.e.
 * 719x151, radius ~48, fill [231,241,243]; tail a right-angled wedge whose
 * vertical right edge sits 147px in from the bubble's left, 30px tall;
 * "I'm your" ink [27,31,30] / "companion" [131,182,229], cap 49-50px,
 * medium weight; people glyph ~44px in the accent colour. The box is a flex
 * row, so the width follows the copy (x = left edge, y = top edge).
 */
function SpeechBubble(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const k = kf(cfg.keys ?? [{ at: 0 }], ms);
	const op = k.opacity ?? 1;
	if (op <= 0.001) return null;
	const fs = cfg.fontSize ?? 71;
	const h = cfg.h ?? 151;
	const tail = cfg.tail ?? { x: 112, w: 35, h: 30 };
	const fill = rgbs(cfg.fill ?? [231, 241, 243]);
	return (
		<div
			style={{
				position: "absolute",
				left: cfg.x ?? 253,
				top: cfg.y ?? 100,
				opacity: op,
				transform: `translate(${k.dx ?? 0}px, ${k.dy ?? 0}px) scale(${k.scale ?? 1})`,
				transformOrigin: `${tail.x + tail.w}px ${h + tail.h}px`,
			}}
		>
			<div
				style={{
					height: h,
					boxSizing: "border-box",
					padding: `0 ${cfg.padR ?? 50}px 0 ${cfg.padL ?? 50}px`,
					background: fill,
					borderRadius: cfg.radius ?? 48,
					display: "flex",
					alignItems: "center",
					gap: cfg.iconGap ?? 22,
					whiteSpace: "nowrap",
					font: `${cfg.weight ?? 500} ${fs}px ${FONT}`,
					letterSpacing: `${cfg.tracking ?? -0.02}em`,
					lineHeight: 1,
				}}
			>
				<span style={{ transform: `translateY(${(-0.064 * fs).toFixed(2)}px)` }}>
					{spanText(
						cfg.parts ?? [{ text: "I'm your " }, { text: "companion", colour: [131, 182, 229] }],
						cfg.ink ?? [27, 31, 30],
					)}
				</span>
				{cfg.icon !== null ? (
					<Glyph
						kind={cfg.icon ?? "people"}
						size={cfg.iconSize ?? 46}
						colour={cfg.iconColour ?? [131, 182, 229]}
					/>
				) : null}
			</div>
			<svg
				width={tail.w + 4}
				height={tail.h + 2}
				style={{ position: "absolute", left: tail.x, top: h - 1, overflow: "visible" }}
			>
				<path
					d={`M0 0 L${tail.w} 0 L${tail.w} ${tail.h} Q${tail.w - 2} ${tail.h - 3} ${tail.w * 0.15} ${tail.h * 0.2} Z`}
					fill={fill}
				/>
			</svg>
		</div>
	);
}

// ── willow-mascot-slot ────────────────────────────────────────────────────────

/**
 * The template's character-art slot (the reference's 3D mascots are product
 * art and are NOT drawn): a light rounded placeholder whose bbox follows the
 * measured motion of the character — fly-ins, landings, hover pops, exits.
 * keys: [{at, cx, cy, w, h, scale, rot, opacity, oy, ease, pow}], (cx,cy) the
 * rect centre at scale 1; scale/rot pivot at (cx, top + oy*h) — oy defaults
 * to 0.6 (the hover pops measured 80.1-80.8s grow -24px at the head and
 * +15px at the feet).
 */
function ArtSlot(cfg, t) {
	if (!live(cfg, t)) return null;
	const k = kf(cfg.keys ?? [{ at: 0 }], localMs(cfg, t));
	const op = k.opacity ?? 1;
	if (op <= 0.001) return null;
	const w = k.w ?? 200,
		h = k.h ?? 400;
	const cx = k.cx ?? 640,
		cy = k.cy ?? 360;
	const oy = k.oy ?? cfg.oy ?? 0.6;
	const tint = cfg.tint ?? [214, 226, 238];
	const face = cfg.face ?? [236, 241, 247];
	return (
		<div
			style={{
				position: "absolute",
				left: cx - w / 2,
				top: cy - h / 2,
				width: w,
				height: h,
				opacity: op,
				transform: `rotate(${(k.rot ?? 0).toFixed(3)}deg) scale(${(k.scale ?? 1).toFixed(5)})`,
				transformOrigin: `${w / 2}px ${oy * h}px`,
				boxSizing: "border-box",
				borderRadius: cfg.radius ?? Math.min(w, h) * 0.22,
				background: `linear-gradient(180deg, ${rgbs(face)}, ${rgbs(tint)})`,
				border: `2px dashed ${rgbs(cfg.edge ?? [170, 186, 204])}`,
				display: "flex",
				alignItems: cfg.labelAlign ?? "center",
				justifyContent: "center",
				paddingTop: cfg.labelPad ?? 0,
			}}
		>
			{cfg.label ? (
				<div
					style={{
						font: `600 ${cfg.labelSize ?? 15}px ${FONT}`,
						color: rgbs(cfg.labelColour ?? [110, 126, 146]),
						textAlign: "center",
						lineHeight: 1.25,
						padding: "0 10px",
						maxWidth: w - 16,
					}}
				>
					{cfg.label}
				</div>
			) : null}
		</div>
	);
}

// ── willow-word-line ───────────────────────────────────────────────────────

/**
 * Centred kinetic line(s) whose words appear IN PLACE (hidden words keep
 * their layout space, so the line never re-lays horizontally) and rise into
 * position on an exponential settle; the whole block carries one transform
 * keyed in `keys` (scale about (ox,oy), dx/dy) for zoom-settles, re-lays and
 * exits. Measured uses:
 *  - "I work" 28.667s: "I" enters +89px and settles x0.6/frame (tau 82ms);
 *    "work" +4 frames, +28px; exit 29.29-29.63s slides left ACCELERATING
 *    (-1,-2,-4,-8,-15,-26,-48px), hard cut.
 *  - "Discover" 76.958s: 4.19x -> 3.1x decelerating over 0.3s, creeps to
 *    2.72x, whips to 1.20x in ONE frame (77.71s) and lands 1.05, 1.013, 1.0;
 *    second line words +8px rise; block re-lays up 36px then 180px.
 *  - "Claim your" 80.79s: 1.17x -> 1.0 about its top edge, x0.6/frame.
 * cfg: x (centre or left with align:"left"), y (cap centre of line 1),
 * fontSize, weight, tracking (em), lineGap (baseline pitch px), ink,
 * lines: [[{text, colour, atMs, rise, tauMs}]], keys: [{at, scale, dx, dy,
 * opacity, ox, oy, ease}].
 */
function WordLine(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = steppedMs(cfg, t);
	const k = kf(cfg.keys ?? [{ at: 0 }], ms);
	const op = k.opacity ?? 1;
	if (op <= 0.001) return null;
	const fs = cfg.fontSize ?? 107;
	const gap = cfg.lineGap ?? fs * 0.89;
	const y0 = cfg.y ?? 352;
	const base1 = y0 + (SEG_CAP / 2) * fs;
	const ink = cfg.ink ?? INK;
	const align = cfg.align ?? "centre";
	const x = cfg.x ?? 640;
	const ox = k.ox ?? x,
		oy = k.oy ?? y0;
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1280,
				height: 720,
				opacity: op,
				transform: `translate(${(k.dx ?? 0).toFixed(2)}px, ${(k.dy ?? 0).toFixed(2)}px) scale(${(k.scale ?? 1).toFixed(5)})`,
				transformOrigin: `${ox}px ${oy}px`,
			}}
		>
			{(cfg.lines ?? []).map((line, li) => {
				const top = base1 + li * gap - SEG_BASE * fs;
				return (
					<div
						key={li}
						style={{
							position: "absolute",
							top,
							height: fs,
							...(align === "left"
								? { left: x }
								: { left: x - 2000, width: 4000, display: "flex", justifyContent: "center" }),
							whiteSpace: "pre",
							font: `${cfg.weight ?? 700} ${fs}px ${FONT}`,
							lineHeight: 1,
							letterSpacing: `${(cfg.lineTracking ?? [])[li] ?? cfg.tracking ?? -0.035}em`,
							wordSpacing: `${cfg.wordSpacing ?? 0}em`,
						}}
					>
						{line.map((w, wi) => {
							const el = ms - (w.atMs ?? 0);
							const shown = el >= 0;
							const dy = shown ? settle(w.rise ?? 0, el, w.tauMs ?? 82) : 0;
							const dx = shown ? settle(w.riseX ?? 0, el, w.tauMs ?? 82) : 0;
							return (
								<span
									key={wi}
									style={{
										display: "inline-block",
										visibility: shown ? "visible" : "hidden",
										color: rgbs(w.colour ?? ink),
										transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`,
									}}
								>
									{(wi > 0 ? " " : "") + w.text}
								</span>
							);
						})}
					</div>
				);
			})}
		</div>
	);
}

// ── willow-chip-drum ───────────────────────────────────────────────────────

const TINT_FADE = [
	[-3, 0.03],
	[-2, 0.2],
	[-1, 0.67],
	[0, 1],
	[1, 0.67],
	[2, 0.2],
	[3, 0.03],
];
const CARD_FADE = [
	[-2.6, 0],
	[-2, 0.11],
	[-1, 0.25],
	[0, 1],
	[1, 0.45],
	[2, 0.11],
	[2.6, 0],
];

/**
 * "I can do [chip]" / "in your [chip] +": a heavy label followed by a
 * vertical DRUM of chips that rolls upward past the label's line, the chip on
 * the line crisp and the rest fading (and, for the tinted skin, blurring)
 * with distance. The drum position `s` (chip index on the line, fractional
 * while moving) is keyed in `drum` — measured per frame in the reference.
 *
 * skin "tint" (26.458-28.646s): pastel pill chips, h 137, pitch 155, radius
 *   60, LEFT-aligned at the label's right + 72px; icon 70px + 20px gap, text
 *   the label's size (cap 75-76); per-row alpha exp(-0.4 d^2) (1 / .67 / .2
 *   at d = 0/1/2, measured on the chip faces), blur ~0.9 d^2 px.
 * skin "card" (29.646-31.333s): white cards, h 105, pitch 134, radius 15,
 *   CENTRE-aligned in the column, soft shadow, dark text; alpha by signed
 *   distance (above .25, below .45, +-2 .11), a light grey "+" 15px after.
 *
 * Moves: `group` [{at,dx,dy}] the whole row (entry rise / exit lift),
 * `label` [{at,dx,dy}] the label alone, `side` [{at,dx}] the off-line chips
 * (the card drum's chips arrive from the left while the label arrives from
 * the right), `drum` [{at, s}].
 */
function ChipDrum(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const skin = cfg.skin ?? "tint";
	const card = skin === "card";
	const fs = cfg.fontSize ?? 108;
	const ink = cfg.ink ?? INK;
	const pitch = cfg.pitch ?? (card ? 134 : 155);
	const chipH = cfg.chipH ?? (card ? 105 : 137);
	const radius = cfg.radius ?? (card ? 15 : 60);
	const focusY = cfg.focusY ?? 352;
	const fade = cfg.fade ?? (card ? CARD_FADE : TINT_FADE);
	const blurK = cfg.blurK ?? (card ? 0.25 : 0.9);
	const s = kf(cfg.drum ?? [{ at: 0, s: 0 }], ms).s ?? 0;
	const g = kf(cfg.group ?? [{ at: 0 }], ms);
	const lb = kf(cfg.label ?? [{ at: 0 }], ms);
	const sd = kf(cfg.side ?? [{ at: 0 }], ms);
	const gdy = g.dy ?? 0;
	const chips = cfg.chips ?? [];
	const capShift = -0.064 * fs; // put the CAP centre (not the box centre) on the line
	const lineY = focusY + gdy;

	const chipEls = chips.map((c, i) => {
		const d = i - s;
		if (Math.abs(d) > 3.2)
			return <div key={i} style={{ height: chipH, flex: "none", visibility: "hidden" }} />;
		// per-chip vertical alpha ramp in SCREEN space (the reference fades by
		// distance from the line, so one chip carries a gradient across itself)
		const stops = [0, 0.25, 0.5, 0.75, 1].map((f) => {
			const y = d * pitch + (f - 0.5) * chipH;
			const a = clamp01(table(fade, y / pitch));
			return `rgba(0,0,0,${a.toFixed(3)}) ${(f * 100).toFixed(0)}%`;
		});
		const blur = Math.min(cfg.blurMax ?? 4.5, blurK * d * d);
		const near = clamp01(1 - Math.abs(d));
		const dx = (sd.dx ?? 0) * (1 - near);
		const mask = `linear-gradient(180deg, ${stops.join(", ")})`;
		return (
			<div
				key={i}
				style={{
					height: chipH,
					flex: "none",
					boxSizing: "border-box",
					display: "flex",
					alignItems: "center",
					gap: cfg.iconGap ?? (card ? 26 : 20),
					padding: `0 ${cfg.padR ?? (card ? 35 : 36)}px 0 ${cfg.padL ?? (card ? 30 : 34)}px`,
					borderRadius: radius,
					whiteSpace: "nowrap",
					background: rgbs(c.bg ?? (card ? [255, 255, 253] : [235, 240, 247])),
					boxShadow: card
						? (cfg.shadow ?? "0 5px 14px rgba(40,30,20,0.09), 0 0 0 1px rgba(40,30,20,0.04)")
						: "none",
					transform: `translateX(${dx.toFixed(2)}px)`,
					filter: blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : "none",
					// the tint skin fades by a screen-space ramp across each chip; the card
					// skin fades each card uniformly (a mask would also clip its shadow)
					...(card
						? { opacity: clamp01(table(fade, d)) }
						: { WebkitMaskImage: mask, maskImage: mask }),
				}}
			>
				<Glyph
					kind={c.icon ?? "dot"}
					size={cfg.iconSize ?? (card ? 64 : 70)}
					colour={c.iconColour ?? c.fg ?? ink}
					bg={c.bg ?? [255, 255, 255]}
				/>
				<span
					style={{
						font: `${cfg.weight ?? 700} ${fs}px ${FONT}`,
						lineHeight: 1,
						letterSpacing: `${cfg.tracking ?? -0.035}em`,
						color: rgbs(c.fg ?? ink),
						transform: `translateY(${capShift.toFixed(2)}px)`,
					}}
				>
					{c.text}
				</span>
			</div>
		);
	});

	const plus = cfg.plus;
	return (
		<div
			style={{
				position: "absolute",
				left: cfg.labelX ?? 171,
				top: lineY - chipH / 2,
				height: chipH,
				display: "flex",
				alignItems: "center",
				whiteSpace: "nowrap",
				transform: `translateX(${(g.dx ?? 0).toFixed(2)}px)`,
			}}
		>
			<div
				style={{
					font: `${cfg.weight ?? 700} ${fs}px ${FONT}`,
					lineHeight: 1,
					letterSpacing: `${cfg.labelTracking ?? cfg.tracking ?? -0.035}em`,
					color: rgbs(ink),
					flex: "none",
					transform: `translate(${(lb.dx ?? 0).toFixed(2)}px, ${(capShift + (lb.dy ?? 0)).toFixed(2)}px)`,
				}}
			>
				{spanText(cfg.labelParts ?? cfg.labelText ?? "I can do", ink)}
			</div>
			<div style={{ width: cfg.gap ?? 72, flex: "none" }} />
			<div style={{ position: "relative", height: chipH, flex: "none" }}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: card ? "center" : "flex-start",
						gap: pitch - chipH,
						transform: `translateY(${(-s * pitch).toFixed(2)}px)`,
					}}
				>
					{chipEls}
				</div>
			</div>
			{plus ? <div style={{ width: plus.gap ?? 15, flex: "none" }} /> : null}
			{plus ? (
				<svg
					width={plus.size ?? 56}
					height={plus.size ?? 56}
					viewBox="0 0 56 56"
					style={{ flex: "none", transform: `translateY(${plus.dy ?? 8}px)` }}
				>
					<path
						d="M28 4v48M4 28h48"
						stroke={rgbs(plus.colour ?? [212, 207, 204])}
						strokeWidth={plus.stroke ?? 9}
						strokeLinecap="round"
					/>
				</svg>
			) : null}
		</div>
	);
}

// ── willow-hand-path ────────────────────────────────────────────────────────────

/**
 * The human pointing hand on an eased path. keys: [{at, x, y, opacity, ease,
 * pow}] — (x,y) is the FINGERTIP; presses: [{at, dur}] squash the glyph by
 * `squash` (measured 0.86 at 81.63-81.90s: bbox 59x65 -> 51x56) about the
 * fingertip with a quick in/out. glyphH = rendered outline height px:
 * 81 for the hand of 29.8-31.3s, 65 for 80-83s.
 */
function Hand(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const k = kf(cfg.keys ?? [{ at: 0 }], ms);
	const op = k.opacity ?? 1;
	if (op <= 0.001) return null;
	let press = 0;
	for (const p of cfg.presses ?? []) {
		const u = (ms - p.at) / Math.max(1, p.dur ?? 200);
		// quick press (first 25%), hold, release (last 20%)
		if (u >= 0 && u <= 1)
			press = Math.max(press, u < 0.25 ? u / 0.25 : u > 0.8 ? (1 - u) / 0.2 : 1);
	}
	const sq = 1 - (1 - (cfg.squash ?? 0.86)) * clamp01(press);
	const x = k.x ?? 640,
		y = k.y ?? 360;
	// The shared HandCursor scales twice (svg width size*1.2 over a 38-unit
	// viewBox, THEN transform scale(size/32)), so its glyph scale is
	// (size*1.2/38)*(size/32) and its fingertip lands off (x,y) by
	// 11+11s(k-2), 2.5+2.5s(k-2). Solve size from the wanted glyph height
	// (`glyphH`, the 29.1-unit outline) and compensate the tip.
	const g = (cfg.glyphH ?? 65) / 29.1;
	const size = cfg.size ?? Math.sqrt((g * 38 * 32) / 1.2);
	const s = size / 32,
		kk = (size * 1.2) / 38;
	const tipDx = 11 + 11 * s * (kk - 2),
		tipDy = 2.5 + 2.5 * s * (kk - 2);
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1280,
				height: 720,
				transform: `scale(${sq.toFixed(4)})`,
				transformOrigin: `${x.toFixed(2)}px ${y.toFixed(2)}px`,
			}}
		>
			<HandCursor x={x - tipDx} y={y - tipDy} size={size} opacity={op} />
		</div>
	);
}

// ── willow-endcard ─────────────────────────────────────────────────────────

/**
 * The closing card, built not slotted. Measured 82.958-90.0s (animates on
 * twos, `step` {fps:12}): blank ground for 2 frames; serif wordmark rises in
 * (+38px, x0.43 per 2 frames) at 83.04; the mark grows out of a dot (scale
 * .15 -> 1 by 83.54) beside it at 83.125 with "Download now" (+15px); "for
 * free" (coral, +27px) at 83.21; two black store buttons (+15px) at 83.375;
 * at 85.04 the buttons are swapped on ONE frame for a grey URL pill that
 * rises +16px. Holds to the film's last frame.
 * Final rects: mark (441,142)-(514,217); wordmark text (533,155)-(837,216);
 * "Download now" (330,290)-(949,362) near-black; "for free" (486,394)-
 * (785,468) [244,113,89]; buttons (407,557)-(873,627) black r9, 211 + 12 +
 * 244 wide; pill (404,557)-(875,628) [237,229,225] r35, text [122,111,105].
 */
function EndCard(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = steppedMs(cfg, t);
	const T = cfg.times ?? {};
	const tau = cfg.tauMs ?? 100;
	const rise = (at, amp) => (ms < at ? null : settle(amp, ms - at, tau));
	const cx = cfg.cx ?? 640;
	const head = cfg.headSize ?? 96;
	const els = [];

	// wordmark row: mark + serif word, centred as a group
	const wmY = rise(T.word ?? 104, cfg.wordRise ?? 38);
	if (wmY !== null) {
		const mk =
			ms < (T.mark ?? 187)
				? 0
				: kf(
						cfg.markScale ?? [
							{ at: 0, s: 0.15 },
							{ at: 81, s: 0.2, ease: "hold" },
							{ at: 164, s: 0.55, ease: "hold" },
							{ at: 247, s: 0.92, ease: "hold" },
							{ at: 331, s: 0.97, ease: "hold" },
							{ at: 414, s: 1, ease: "hold" },
						],
						ms - (T.mark ?? 187),
					).s;
		const wsz = cfg.wordSize ?? 67;
		const markSz = cfg.markSize ?? 75;
		els.push(
			<div
				key="wm"
				style={{
					position: "absolute",
					left: cx - 2000 + (cfg.wordRowDx ?? 0),
					width: 4000,
					top: (cfg.wordBaseline ?? 201) - GEO_BASE * wsz + wmY,
					height: wsz,
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<div
					style={{
						width: markSz,
						height: markSz,
						flex: "none",
						transform: `translateY(${(cfg.markDy ?? -1.5) - wmY}px) scale(${mk.toFixed(4)})`,
						marginRight: cfg.markGap ?? 19,
					}}
				>
					{cfg.mark === null ? null : <PlaceholderMark size={markSz} />}
				</div>
				<div
					style={{
						font: `400 ${wsz}px ${SERIF}`,
						lineHeight: 1,
						color: rgbs(cfg.wordInk ?? [28, 27, 23]),
						letterSpacing: `${cfg.wordTracking ?? -0.01}em`,
						whiteSpace: "pre",
					}}
				>
					{cfg.wordmark ?? "Strawberry"}
				</div>
			</div>,
		);
	}
	const line = (key, parts, at, amp, baseline, colourDefault) => {
		const dy = rise(at, amp);
		if (dy === null) return;
		els.push(
			<div
				key={key}
				style={{
					position: "absolute",
					left: cx - 2000,
					width: 4000,
					top: baseline - SEG_BASE * head + dy,
					height: head,
					display: "flex",
					justifyContent: "center",
					whiteSpace: "pre",
					font: `${cfg.headWeight ?? 700} ${head}px ${FONT}`,
					lineHeight: 1,
					letterSpacing: `${cfg.headTracking ?? -0.03}em`,
				}}
			>
				{spanText(parts, colourDefault)}
			</div>,
		);
	};
	line(
		"h1",
		cfg.headline ?? "Download now",
		T.head ?? 187,
		cfg.headRise ?? 15,
		cfg.headBaseline ?? 362,
		cfg.headInk ?? [8, 8, 6],
	);
	line(
		"h2",
		cfg.sub ?? [{ text: "for free", colour: [244, 113, 89] }],
		T.sub ?? 271,
		cfg.subRise ?? 27,
		cfg.subBaseline ?? 468,
		cfg.headInk ?? [8, 8, 6],
	);

	const rowTop = cfg.rowTop ?? 557;
	const swapped = ms >= (T.swap ?? 2104);
	if (!swapped) {
		const by = rise(T.buttons ?? 438, cfg.buttonsRise ?? 15);
		if (by !== null) {
			els.push(
				<div
					key="btns"
					style={{
						position: "absolute",
						left: cx - 2000,
						width: 4000,
						top: rowTop + by,
						display: "flex",
						justifyContent: "center",
						gap: cfg.buttonGap ?? 12,
					}}
				>
					{(
						cfg.buttons ?? [
							{ small: "Download for", big: "Mac OS", glyph: "laptop" },
							{ small: "Download for", big: "Windows", glyph: "window" },
						]
					).map((b, i) => (
						<div
							key={i}
							style={{
								height: cfg.buttonH ?? 69,
								boxSizing: "border-box",
								borderRadius: cfg.buttonRadius ?? 9,
								background: rgbs(cfg.buttonFill ?? [3, 2, 0]),
								display: "flex",
								alignItems: "center",
								padding: `0 ${cfg.buttonPadR ?? 31}px 0 ${cfg.buttonPadL ?? 24}px`,
								gap: 12,
								whiteSpace: "nowrap",
							}}
						>
							<Glyph
								kind={b.glyph ?? "laptop"}
								size={cfg.buttonGlyph ?? 38}
								colour={[255, 255, 255]}
								bg={cfg.buttonFill ?? [3, 2, 0]}
							/>
							<div
								style={{ display: "flex", flexDirection: "column", color: "#fff", lineHeight: 1 }}
							>
								<span style={{ font: `400 ${cfg.smallSize ?? 14}px ${FONT}`, marginBottom: 3 }}>
									{b.small}
								</span>
								<span
									style={{ font: `400 ${cfg.bigSize ?? 32}px ${FONT}`, letterSpacing: "-0.01em" }}
								>
									{b.big}
								</span>
							</div>
						</div>
					))}
				</div>,
			);
		}
	} else {
		const py = rise(T.swap ?? 2104, cfg.pillRise ?? 16);
		els.push(
			<div
				key="pill"
				style={{
					position: "absolute",
					left: cx - 2000,
					width: 4000,
					top: rowTop + py,
					display: "flex",
					justifyContent: "center",
				}}
			>
				<div
					style={{
						height: cfg.pillH ?? 71,
						boxSizing: "border-box",
						borderRadius: (cfg.pillH ?? 71) / 2,
						padding: `0 ${cfg.pillPad ?? 47}px`,
						background: rgbs(cfg.pillFill ?? [237, 229, 225]),
						display: "flex",
						alignItems: "center",
						whiteSpace: "nowrap",
						font: `600 ${cfg.pillSize ?? 33}px ${FONT}`,
						letterSpacing: "-0.01em",
						color: rgbs(cfg.pillInk ?? [122, 111, 105]),
					}}
				>
					<span
						style={{ transform: `translateY(${(-0.064 * (cfg.pillSize ?? 33)).toFixed(2)}px)` }}
					>
						{cfg.url ?? "strawberrybrowser.com"}
					</span>
				</div>
			</div>,
		);
	}
	return <div style={{ position: "absolute", inset: 0 }}>{els}</div>;
}

export const S3_PRESETS = {
	"willow-speech-bubble": {
		note: "A rounded speech bubble (fill [231,241,243], r48) with a downward wedge tail, text spans (ink + one accent) and a trailing glyph; flex width follows the copy. keys add opacity/scale/dx/dy (pivot at the tail tip). Measured 25.4-26.5s: 719x151 at (253,100), cap 50px medium.",
		nativeMs: 1100,
		params: {
			x: ["number", 253, "bubble left edge"],
			y: ["number", 100, "bubble top edge"],
			parts: [
				"array",
				"[{text:\"I'm your \"},{text:'companion',colour:[131,182,229]}]",
				"text spans",
			],
			icon: ["string|null", "people", "trailing Glyph kind"],
			fontSize: ["number", 71, "px (cap ~50)"],
			keys: ["array", "[]", "[{at, opacity, scale, dx, dy, ease}]"],
		},
		render: SpeechBubble,
	},
	"willow-mascot-slot": {
		note: "Character-art SLOT (mascot placeholder, not drawn art): a light dashed rounded rect whose centre/size/scale/rotation follow the measured motion of the character. keys [{at,cx,cy,w,h,scale,rot,opacity,oy,ease}], pivot (cx, top+oy*h).",
		nativeMs: 3000,
		params: {
			keys: ["array", "[]", "per-key bbox: cx, cy, w, h, scale, rot, opacity, oy"],
			label: ["string", "character art", "slot label"],
			oy: ["number", 0.6, "pivot as fraction of height"],
		},
		render: ArtSlot,
	},
	"willow-word-line": {
		note: "Centred kinetic line(s): words appear in place and rise on an exponential settle (rise px, tauMs); the block takes keyed scale (about ox,oy) / dx / dy / opacity for zoom-whips, re-lays and accelerating exits. 'I work', 'Discover / a new way to work', 'Claim your / companion today'.",
		nativeMs: 1000,
		params: {
			y: ["number", 352, "cap centre of line 1"],
			fontSize: ["number", 107, "px (Segoe cap 0.70)"],
			lineGap: ["number", "0.89*fontSize", "baseline pitch"],
			lines: ["array", "[]", "[[{text,colour,atMs,rise,tauMs}]]"],
			keys: ["array", "[]", "[{at, scale, dx, dy, opacity, ox, oy, ease}]"],
			step: ["object|null", null, "{fps, phaseMs} on-twos stepping"],
		},
		render: WordLine,
	},
	"willow-chip-drum": {
		note: "Label + a vertical drum of icon chips rolling up past the label's line (slot-machine): line chip crisp, others fading (and blurring on the tinted skin) with distance. skin 'tint' = pastel pills (the capability list), 'card' = white cards with a '+' (tabs/apps/docs). drum [{at,s}] = chip index on the line.",
		nativeMs: 2200,
		params: {
			skin: ["string", "tint", "'tint' | 'card'"],
			labelText: ["string|array", "I can do", "label text or spans"],
			chips: ["array", "[]", "[{text, icon, bg, fg}]"],
			drum: ["array", "[{at:0,s:0}]", "drum position keys"],
			pitch: ["number", "155 | 134", "px between chip centres"],
			focusY: ["number", 352, "line (cap centre) y"],
			group: ["array", "[]", "[{at,dx,dy}] row move"],
			label: ["array", "[]", "[{at,dx,dy}] label-only move"],
			side: ["array", "[]", "[{at,dx}] off-line chip x offset"],
			plus: ["object|null", null, "{size,gap,colour,stroke}"],
		},
		render: ChipDrum,
	},
	"willow-hand-path": {
		note: "The human pointing hand (shared HandCursor) on keyed fingertip paths with press squashes. keys [{at,x,y,opacity,ease}], presses [{at,dur}].",
		nativeMs: 2000,
		params: {
			keys: ["array", "[]", "fingertip path"],
			presses: ["array", "[]", "[{at, dur}]"],
			size: ["number", 80, "HandCursor size"],
			squash: ["number", 0.86, "scale at full press"],
		},
		render: Hand,
	},
	"willow-endcard": {
		note: "Closing card: placeholder mark (logo slot) + serif wordmark, 'Download now' / 'for free' (coral), two black store buttons with neutral glyphs that swap on one frame for a grey URL pill. Elements rise in on an exponential, on twos (step fps 12).",
		nativeMs: 7000,
		params: {
			wordmark: ["string", "Strawberry", "serif wordmark"],
			headline: ["string|array", "Download now", "line 1"],
			sub: ["array", "[{text:'for free',colour:[244,113,89]}]", "line 2"],
			buttons: ["array", "Mac OS / Windows", "[{small,big,glyph}]"],
			url: ["string", "strawberrybrowser.com", "pill text"],
			times: ["object", "{word,mark,head,sub,buttons,swap}", "scene-relative ms"],
			step: ["object|null", "{fps:12}", "on-twos stepping"],
		},
		render: EndCard,
	},
};
