/**
 * sequoia-s7.jsx — section 7 (66.567-87.533s): the privacy / locality /
 * passwords / bring-your-own-model passage and the end card.
 *
 * Measured off the Aside launch film (full-decode frames on a 30fps clock at
 * the 1280x720 stage; notes in .demo-build/.../sections/s7/notes.md). The
 * whole passage is ONE type size — x-height 49-50px on both grounds — set as
 * single-line rows of words that cut, slide, settle and swap. Almost nothing
 * fades: words appear and vanish on a single frame and MOVE (expo settles,
 * accelerating exits); the only fades are the "Bring your own" words
 * (grey -> white over 3 frames) and the "your"/"work" pair dimming to grey.
 *
 *   sequoia-kinetic   rows of tokens (words, inline line icons, the mark,
 *                     app tiles, a password field) laid out by flex so other
 *                     copy reflows; every row and token carries sparse
 *                     keyframes (offset, scale, opacity, blur, colour,
 *                     gap), hard visibility windows, typed reveals and a
 *                     seeded glyph scramble. Optional hand cursor.
 *   sequoia-laptop    the "Data never leaves your device" device: a drawn
 *                     open laptop whose screen is a product slot, rising,
 *                     pulling back, then cut to the closed lid seen from
 *                     above, which shrinks and leaves upward.
 *
 * Both are pure functions of t.
 */
import {
	Aperture,
	Asterisk,
	Bot,
	CircleSlash2,
	Eye,
	EyeOff,
	KeyRound,
	Sparkle,
} from "lucide-react";
import React from "react";
import { clamp01 } from "../../../src/lib/textcards/src/easing.js";
import { AppTile, FONT, Icon, kf, live, localMs, Q, rgbs, SequoiaMark } from "./sequoia-shared.jsx";

// Segoe UI metrics at line-height 1 (calibrated against rendered frames):
// baseline sits BASE em below the line box top, x-height is XH em.
const BASE = 0.905;
const XH = 0.5;

/** Extra line icons used only here (generic glyphs; never real marks). */
const LOCAL_ICONS = {
	"model-asterisk": Asterisk,
	"model-slash": CircleSlash2,
	"model-star": Sparkle,
	"model-bot": Bot,
	"model-knot": Aperture,
	eye: Eye,
	"eye-off": EyeOff,
	key: KeyRound,
};

const inWin = (o, ms) => (o.from == null || ms >= o.from) && (o.to == null || ms < o.to);
const collapsedAt = (o, ms) =>
	(o.collapse === true || o.collapse === "before") && o.from != null && ms < o.from
		? true
		: o.collapse === true && o.to != null && ms >= o.to;

/** Step lookup for [[ms, value], ...] lists (typed counts, mask counts). */
function step(list, ms, dflt) {
	if (!list || !list.length) return dflt;
	let v = dflt;
	for (const [at, n] of list) if (ms >= at) v = n;
	return v;
}

/** Deterministic hash -> [0,1). */
function hash01(a, b) {
	let h = (a * 374761393 + b * 668265263) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	h ^= h >>> 16;
	return ((h >>> 0) % 100000) / 100000;
}

const SCRAMBLE = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789$%&+:;,.<>}{]#@?!=";

/**
 * Glyph scramble: the first `resolved` chars are the real text, the rest are
 * seeded garbage re-rolled every `everyMs`. Length always equals the text.
 */
function scrambleText(text, sc, ms) {
	const n = step(sc.resolve, ms, 0);
	if (n >= text.length) return text;
	const tick = Math.floor(Math.max(0, ms) / (sc.everyMs ?? 67));
	let out = text.slice(0, n);
	for (let i = n; i < text.length; i++) {
		out += SCRAMBLE[Math.floor(hash01(tick * 31 + (sc.seed ?? 7), i) * SCRAMBLE.length)];
	}
	return out;
}

/** Lock with a shackle that can drop (0 = open-high, 1 = closed). */
function LockGlyph({ size, colour, stroke = 2, close = 1 }) {
	const lift = (1 - clamp01(close)) * 3.2;
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ overflow: "visible" }}>
			<rect
				x="4"
				y="11"
				width="16"
				height="11"
				rx="2.5"
				stroke={rgbs(colour)}
				strokeWidth={stroke}
			/>
			<path
				d={`M8 11 V${7 - lift} a4 4 0 0 1 8 0 V11`}
				stroke={rgbs(colour)}
				strokeWidth={stroke}
				strokeLinecap="round"
			/>
			<circle cx="12" cy="16.4" r="1.1" fill={rgbs(colour)} />
		</svg>
	);
}

/** The single-bay drive glyph that sits before "locally,". */
function DriveGlyph({ size, colour, stroke = 2 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<rect
				x="2.5"
				y="4"
				width="19"
				height="16"
				rx="4"
				stroke={rgbs(colour)}
				strokeWidth={stroke}
			/>
			<path d="M2.5 12 H21.5" stroke={rgbs(colour)} strokeWidth={stroke} />
			<circle cx="6.6" cy="8" r="1.05" fill={rgbs(colour)} />
			<circle cx="6.6" cy="16" r="1.05" fill={rgbs(colour)} />
		</svg>
	);
}

/** A generic 12-spoke burst (stand-in for an AI-model mark; not any real logo). */
function BurstGlyph({ size, colour, stroke = 1.6 }) {
	const spokes = [];
	for (let i = 0; i < 12; i++) {
		const a = (i * Math.PI) / 6 + Math.PI / 12;
		const r0 = i % 2 ? 2.2 : 1.4;
		spokes.push(
			<path
				key={i}
				d={`M${(12 + Math.cos(a) * r0).toFixed(2)} ${(12 + Math.sin(a) * r0).toFixed(2)} L${(12 + Math.cos(a) * 10).toFixed(2)} ${(12 + Math.sin(a) * 10).toFixed(2)}`}
			/>,
		);
	}
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke={rgbs(colour)}
			strokeWidth={stroke}
			strokeLinecap="round"
		>
			{spokes}
		</svg>
	);
}

function IconAny({ name, size, colour, stroke, close }) {
	if (name === "lock")
		return <LockGlyph size={size} colour={colour} stroke={stroke} close={close} />;
	if (name === "drive-bay") return <DriveGlyph size={size} colour={colour} stroke={stroke} />;
	if (name === "model-burst") return <BurstGlyph size={size} colour={colour} stroke={stroke} />;
	if (name === "model-star")
		return <Sparkle size={size} color={rgbs(colour)} fill={rgbs(colour)} strokeWidth={stroke} />;
	const C = LOCAL_ICONS[name];
	if (C) return <C size={size} color={rgbs(colour)} strokeWidth={stroke} />;
	return <Icon name={name} size={size} colour={colour} stroke={stroke} />;
}

/**
 * The password field: white pill, hairline border, soft drop shadow (measured
 * 77.0s: 128px tall, text and eye grey [114,116,113], border L240, shadow
 * darkest L227 just under the edge fading out over ~60px). Text can be masked
 * to `*` (mask count keyed), eye swaps to eye-off at `offAt`.
 */
function Field({ f, ms, size }) {
	const masked = step(f.mask, ms, null);
	const off = f.offAt != null && ms >= f.offAt;
	const grey = f.colour ?? [114, 116, 113];
	const h = f.h ?? 128;
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				height: h,
				padding: `0 ${f.padR ?? 30}px 0 ${f.padL ?? 24}px`,
				gap: f.iconGap ?? 44,
				borderRadius: f.radius ?? 22,
				background: "#fff",
				border: "1.5px solid rgba(0,0,0,0.075)",
				boxShadow:
					"0 40px 52px rgba(20,24,20,0.10), 0 12px 20px rgba(20,24,20,0.055), 0 2px 4px rgba(20,24,20,0.04)",
				color: rgbs(grey),
				whiteSpace: "pre",
				boxSizing: "border-box",
			}}
		>
			<span style={{ position: "relative", display: "inline-flex" }}>
				<span style={{ visibility: masked == null ? "visible" : "hidden" }}>{f.text}</span>
				{masked == null ? null : (
					<span
						style={{
							position: "absolute",
							left: f.maskX ?? 0,
							top: 0,
							bottom: 0,
							display: "flex",
							alignItems: "center",
							fontSize: size * (f.maskScale ?? 0.6),
							lineHeight: 1,
						}}
					>
						{Array.from({ length: f.text.length }, (_, i) => (
							<span
								key={i}
								style={{
									display: "inline-block",
									width: f.maskPitch ?? 43,
									textAlign: "center",
									visibility: i < masked ? "visible" : "hidden",
									transform: `translateY(${f.maskDy ?? 8}px)`,
								}}
							>
								*
							</span>
						))}
					</span>
				)}
			</span>
			<IconAny
				name={off ? "eye-off" : "eye"}
				size={f.eye ?? 56}
				colour={grey}
				stroke={f.eyeStroke ?? 1.9}
			/>
		</span>
	);
}

function Token({ tok, ms, size, rowColour, defaultGap, first }) {
	// Outside its window a token is either removed from the flow (collapse)
	// or kept as an invisible placeholder of its full size, so neighbours do
	// not jump. collapse: true = both sides, "before" = only before `from`.
	if (collapsedAt(tok, ms)) return null;
	const hidden = !inWin(tok, ms);
	const k = kf(tok.keys ?? [{ at: 0 }], ms);
	const dx = k.dx ?? 0;
	const dy = k.dy ?? 0;
	const sc = k.sc ?? 1;
	const op = k.op ?? 1;
	const blur = k.blur ?? 0;
	const col = k.col ?? tok.colour ?? rowColour;
	const gap = first ? (k.gap ?? 0) : (k.gap ?? tok.gap ?? defaultGap);
	let body;
	const lift = tok.lift ?? 0;
	// Icons, the mark and tiles sit in a box exactly one x-height tall whose
	// bottom is the baseline, so a tall glyph never pushes the row's baseline
	// down; the glyph is centred on the x-height (lift moves it off-centre).
	const centred = (box, el) => (
		<span style={{ position: "relative", display: "inline-flex", width: box, height: XH * size }}>
			<span style={{ position: "absolute", left: 0, top: (XH * size - box) / 2, display: "flex" }}>
				{el}
			</span>
		</span>
	);
	if (tok.icon) {
		const box = tok.box ?? size * 0.62;
		body = centred(
			box,
			<IconAny
				name={tok.icon}
				size={box}
				colour={col}
				stroke={tok.stroke ?? 2}
				close={k.close ?? 1}
			/>,
		);
	} else if (tok.mark) {
		const box = tok.box ?? size * 0.6;
		body = centred(box, <SequoiaMark size={box} colour={col} />);
	} else if (tok.tile) {
		const box = tok.box ?? 104;
		body = centred(box, <AppTile kind={tok.tile} size={box} />);
	} else if (tok.darktile) {
		// The product's own app tile on graphite (measured 82.3s): a flat
		// 159px rounded square a shade under the ground ([28,30,27]) carrying
		// the mark at ~0.64 of its width in light grey.
		const box = tok.box ?? 159;
		const d = tok.darktile;
		body = centred(
			box,
			<span
				style={{
					position: "relative",
					width: box,
					height: box,
					borderRadius: box * (d.radius ?? 0.23),
					background: rgbs(d.colour ?? [28, 30, 27]),
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<SequoiaMark size={box * (d.mark ?? 0.64)} colour={d.markColour ?? [206, 208, 205]} />
			</span>,
		);
	} else if (tok.field) {
		// The field is centred on the x-height in a one-x-height box so its
		// 128px height never moves the row's baseline.
		body = (
			<span
				style={{
					display: "inline-flex",
					alignItems: "center",
					height: XH * size,
					overflow: "visible",
				}}
			>
				<Field f={tok.field} ms={ms} size={size} />
			</span>
		);
	} else {
		let text = tok.text ?? "";
		if (tok.type) text = text.slice(0, step(tok.type, ms, 0));
		if (tok.scramble) text = scrambleText(text, tok.scramble, ms);
		body = text;
	}
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "baseline",
				whiteSpace: "pre",
				marginLeft: gap,
				color: rgbs(col),
				opacity: clamp01(op),
				visibility: hidden ? "hidden" : undefined,
				transform: `translate(${dx.toFixed(2)}px, ${(dy + lift).toFixed(2)}px) scale(${sc.toFixed(4)})`,
				transformOrigin: "50% 50%",
				filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
				clipPath: tok.clipLeft != null ? `inset(-60% -60% -60% ${tok.clipLeft}px)` : undefined,
			}}
		>
			{body}
		</span>
	);
}

function Row({ row, ms, size, weight, colour, tracking }) {
	if (!inWin(row, ms)) return null;
	const k = kf(row.keys ?? [{ at: 0 }], ms);
	const s = row.size ?? size;
	const x = (row.x ?? 640) + (k.dx ?? 0);
	const y = (row.y ?? 360) + (k.dy ?? 0);
	const ax = row.ax ?? 0.5;
	const sc = k.sc ?? 1;
	const defaultGap = row.gap ?? s * 0.255;
	const toks = row.tokens ?? [];
	let firstShown = true;
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y - BASE * s,
				display: "flex",
				alignItems: "baseline",
				whiteSpace: "pre",
				font: `${row.weight ?? weight} ${s}px ${FONT}`,
				lineHeight: 1,
				letterSpacing: `${row.tracking ?? tracking}em`,
				opacity: clamp01(k.op ?? 1),
				transform: `translateX(${(-ax * 100).toFixed(2)}%) scale(${sc.toFixed(4)})`,
				transformOrigin: `${(ax * 100).toFixed(1)}% ${(BASE * 100).toFixed(1)}%`,
				clipPath: row.clip ? `inset(${row.clip})` : undefined,
			}}
		>
			{/* zero-width text strut: gives icon-only rows a real text baseline */}
			<span style={{ width: 0, overflow: "hidden" }}>{"​"}</span>
			{toks.map((tok, i) => {
				const kept = !collapsedAt(tok, ms);
				const first = firstShown && kept;
				if (kept) firstShown = false;
				return (
					<Token
						key={tok.id ?? i}
						tok={tok}
						ms={ms}
						size={s}
						rowColour={row.colour ?? colour}
						defaultGap={defaultGap}
						first={first}
					/>
				);
			})}
		</div>
	);
}

/** Hand cursor drawn locally (tip at x,y; glyph height `size`). */
function Hand({ x, y, size, press, opacity }) {
	const s = (size / 34) * (1 - 0.08 * clamp01(press));
	return (
		<svg
			width={30}
			height={34}
			viewBox="0 0 30 34"
			style={{
				position: "absolute",
				left: x - 9.5,
				top: y - 1,
				opacity,
				overflow: "visible",
				transform: `scale(${s.toFixed(4)})`,
				transformOrigin: "9.5px 1px",
			}}
		>
			<path
				d="M9.5 1.2c1.5 0 2.6 1.1 2.6 2.6v8.4c.4-.3 1-.5 1.6-.5 1.2 0 2.1.7 2.5 1.7.4-.3 1-.5 1.6-.5 1.3 0 2.3.9 2.5 2.1.4-.2.8-.3 1.3-.3 1.4 0 2.5 1.1 2.5 2.5v6.2c0 5.4-3.6 9.3-8.6 9.3h-1.3c-3.2 0-5.4-1.4-7.2-4.1L2 20.6c-.8-1.2-.5-2.7.6-3.4 1.1-.7 2.5-.4 3.3.6l1 1.4V3.8c0-1.5 1.1-2.6 2.6-2.6Z"
				fill="#fff"
				stroke="#111"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path
				d="M12.1 12.4v6.4M16.2 13.6v5.2M20.3 15.1v3.9"
				stroke="#111"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** sequoia-kinetic — rows of tokens on one type size. See file header. */
function KineticRows(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const size = cfg.size ?? 100;
	const weight = cfg.weight ?? 500;
	const colour = cfg.colour ?? Q.ink;
	const tracking = cfg.tracking ?? -0.012;
	const cur = cfg.cursor && inWin(cfg.cursor, ms) ? kf(cfg.cursor.keys, ms) : null;
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			{(cfg.rows ?? []).map((row, i) => (
				<Row
					key={row.id ?? i}
					row={row}
					ms={ms}
					size={size}
					weight={weight}
					colour={colour}
					tracking={tracking}
				/>
			))}
			{cur ? (
				<Hand
					x={cur.x}
					y={cur.y}
					size={cfg.cursor.size ?? 60}
					press={cur.press ?? 0}
					opacity={clamp01(cur.op ?? 1)}
				/>
			) : null}
		</div>
	);
}

const LID_GRADIENT =
	"linear-gradient(180deg, rgb(150,150,152) 0%, rgb(103,101,104) 1.6%, rgb(101,99,102) 8%, rgb(92,90,93) 25%, rgb(76,74,77) 42%, rgb(56,54,57) 58%, rgb(37,35,38) 74%, rgb(21,23,20) 87%, rgb(17,19,16) 100%)";

/**
 * sequoia-laptop — the drawn device for "Data never leaves your device".
 * Open laptop (front view) measured 71.2s: bezel 278-1000 x, top 107, 9-10px
 * black bezel, screen 288-990 to y~576, deck 219-1061 x 590-613 y. Keys move
 * the bezel top (`top`, stage px) and scale the device about (640,360)
 * (`sc`). At `lidAt` it CUTS to the closed lid seen from above: a 577x401
 * rounded slab centred on the frame, graphite gradient [102,100,103] ->
 * [17,19,16] by ~85% down (sampled 72.4s), keyed by `lidKeys` (sc, dy).
 */
function Laptop(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const lidAt = cfg.lidAt ?? Number.POSITIVE_INFINITY;
	if (ms >= lidAt) {
		const k = kf(cfg.lidKeys ?? [{ at: 0 }], ms - lidAt);
		const w = cfg.lidW ?? 577;
		const h = cfg.lidH ?? 401;
		return (
			<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
				<div
					style={{
						position: "absolute",
						left: 640 - w / 2,
						top: 360 - h / 2 + (k.dy ?? 0),
						width: w,
						height: h,
						borderRadius: cfg.lidRadius ?? 13,
						background: LID_GRADIENT,
						transform: `scale(${(k.sc ?? 1).toFixed(4)})`,
						transformOrigin: "50% 50%",
					}}
				/>
			</div>
		);
	}
	const k = kf(cfg.keys ?? [{ at: 0, top: 107, sc: 1 }], ms);
	const top = k.top ?? 107;
	const sc = k.sc ?? 1;
	const bw = cfg.bezelW ?? 723;
	const bh = cfg.bezelH ?? 483;
	const deckW = cfg.deckW ?? 843;
	const left = 640 - bw / 2;
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1280,
					height: 720,
					transform: `scale(${sc.toFixed(4)})`,
					transformOrigin: `640px ${(cfg.originY ?? 360).toFixed(1)}px`,
				}}
			>
				<div
					style={{
						position: "absolute",
						left,
						top,
						width: bw,
						height: bh,
						borderRadius: "22px 22px 4px 4px",
						background: "#0b0c0b",
						boxShadow: "inset 0 0 0 1.5px #2a2b2a",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: 10,
							top: 10,
							right: 10,
							bottom: 6,
							borderRadius: "13px 13px 2px 2px",
							background: "rgb(252,252,251)",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								position: "absolute",
								inset: 14,
								border: "1.5px dashed rgba(0,0,0,0.16)",
								borderRadius: 10,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								font: `500 15px ${FONT}`,
								color: "rgba(0,0,0,0.42)",
								letterSpacing: "0.01em",
							}}
						>
							{cfg.label ?? "product UI — new tab with ongoing tasks"}
						</div>
					</div>
				</div>
				<div
					style={{
						position: "absolute",
						left: 640 - deckW / 2,
						top: top + bh + (cfg.deckGap ?? 9),
						width: deckW,
						height: cfg.deckH ?? 22,
						borderRadius: "3px 3px 16px 16px",
						background: "linear-gradient(180deg,#2b2c2e 0%,#1a1b1c 45%,#0d0d0e 100%)",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: deckW / 2 - 64,
							top: 0,
							width: 128,
							height: 7,
							borderRadius: "0 0 8px 8px",
							background: "#3a3b3d",
						}}
					/>
				</div>
			</div>
		</div>
	);
}

export const S7_PRESETS = {
	"sequoia-kinetic": {
		note: "sequoia s7's kinetic type engine: rows of tokens (words, inline line icons incl. a closing lock and a drive bay, the mark, app tiles, a password field with eye/eye-off and * mask) laid out by baseline flex so other copy reflows. Rows: {x, y (baseline), ax, keys[{at,dx,dy,sc,op}], from, to, gap, size}. Tokens: {text|icon|mark|tile|field, keys[{at,dx,dy,sc,op,blur,col,gap,close}], from/to (hard cuts), collapse, type:[[ms,n]], scramble:{resolve:[[ms,n]],everyMs,seed}, clipLeft}. Optional cursor {keys[{at,x,y,press,op}], size, from, to}. One type size for the passage (x-height ~50px at size 100). All ms scene-relative.",
		nativeMs: 4000,
		params: {
			size: ["number", 100, "font px (x-height = 0.5em in Segoe UI)"],
			weight: ["number", 500, "font weight"],
			colour: ["rgb", "[2,4,1]", "default ink"],
			tracking: ["number", -0.012, "letter-spacing em"],
			rows: ["array", "[]", "rows of tokens, see note"],
			cursor: ["object|null", null, "{keys:[{at,x,y,press,op}], size, from, to}"],
		},
		render: KineticRows,
	},
	"sequoia-laptop": {
		note: "sequoia s7's device beat: a drawn open laptop (black bezel, screen = labelled product slot, dark deck) keyed by bezel top y + scale about frame centre (rise from the bottom edge, accelerating then expo-settling; accelerating pull-back), then a hard cut at lidAt to the closed lid from above (graphite gradient slab) keyed by lidKeys {sc, dy} (shrinking settle, accelerating exit up). All ms scene-relative.",
		nativeMs: 2400,
		params: {
			keys: ["array", "[{at:0,top:107,sc:1}]", "open-laptop keys: top (bezel top y px), sc"],
			lidAt: ["number", null, "ms of the cut to the closed lid"],
			lidKeys: ["array", "[{at:0,sc:1,dy:0}]", "lid keys, ms relative to lidAt"],
			label: ["string", "product UI — new tab with ongoing tasks", "slot label on the screen"],
		},
		render: Laptop,
	},
};
