/**
 * willow-s5.jsx — presets for willow section 5 (49.250s-63.583s, f01182-f01525).
 *
 * Measured off the Strawberry 1.0 launch film's full-decode 1280x720 frames
 * (frame n = n/24 s). Every number cited below is stage px / film frames; the
 * full trace lives in .demo-build/nightly/2026-10-30/willow/sections/s5/notes.md.
 *
 * Beats: chip line ("Transcribe meetings") -> call window with a notetaker pill
 * -> companion + chat-bubble stack -> kinetic "Everyone / on your team / gets a
 * companion" -> four role portraits orbiting, docking into a row over four
 * character-art slots -> everything flies off into the next section.
 *
 * Every render is a pure function of t.
 */
import React from "react";
import { clamp01, lerp, settleDecay } from "../../../src/lib/textcards/src/easing.js";
import { Avatar, FONT, kf, live, localMs, rgbs, W } from "./willow-shared.jsx";

// ── helpers ───────────────────────────────────────────────────────────────

const FRAME = 1000 / 24;
/** Segoe UI (what FONT resolves to here): cap height 0.70em; with
 *  line-height:1 the baseline sits ~1.083em below the line box top (measured). */
const CAP = 0.7;
const BASE = 1.083; // measured: Segoe line box puts the baseline 1.083em down (0.914 predicted from hhea was 17-26px high)
const fsCap = (cap) => cap / CAP;

/** The reference animates several beats ON TWOS (12fps): consecutive frame
 *  pairs are byte-identical. Quantise scene-relative ms to 2-frame steps. */
const twos = (ms, on) => (on ? Math.floor((ms + 1e-3) / (2 * FRAME)) * 2 * FRAME + 0.5 : ms); // +0.5ms so cues authored at exact frame ms fire on their frame
const outPow = (p, n) => 1 - Math.pow(1 - clamp01(p), n);
const inPow = (p, n) => Math.pow(clamp01(p), n);
const inoutPow = (p, n) => {
	const x = clamp01(p);
	return x < 0.5 ? Math.pow(2, n - 1) * Math.pow(x, n) : 1 - Math.pow(-2 * x + 2, n) / 2;
};

/** Linear interpolation through a measured table [[ms, v0, v1, ...], ...]. */
function table(rows, ms) {
	if (!rows || !rows.length) return [];
	if (ms <= rows[0][0]) return rows[0].slice(1);
	const last = rows[rows.length - 1];
	if (ms >= last[0]) return last.slice(1);
	for (let i = 0; i < rows.length - 1; i++) {
		const a = rows[i],
			b = rows[i + 1];
		if (ms >= a[0] && ms < b[0]) {
			const p = (ms - a[0]) / Math.max(1e-6, b[0] - a[0]);
			return a.slice(1).map((v, j) => lerp(v, b[j + 1], p));
		}
	}
	return last.slice(1);
}

/** Absolute text block whose BASELINE lands on y. */
function baselineTop(y, fs) {
	return y - BASE * fs;
}

// ── glyphs (neutral, no third-party marks) ────────────────────────────────

/** Pen-and-line glyph for the chip. rot in deg about the nib; line = written
 *  underline width. */
function PenGlyph({ size = 64, colour = [118, 196, 176], rot = 0, line = 58 }) {
	const c = rgbs(colour);
	const hi = rgbs(colour.map((v) => Math.min(255, v + 34)));
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 64 64"
			style={{ overflow: "visible", display: "block" }}
		>
			<defs>
				<linearGradient id="s5pen" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor={hi} />
					<stop offset="1" stopColor={c} />
				</linearGradient>
			</defs>
			<g
				transform={`rotate(${rot.toFixed(2)} 30 47) translate(30 47) scale(1.22) translate(-30 -47)`}
			>
				<path d="M22 13a8 8 0 0 1 16 0v26l-8 9-8-9Z" fill="url(#s5pen)" />
				<path d="M22 19h16" stroke="rgba(255,255,255,0.85)" strokeWidth="2.6" />
			</g>
			{line > 0.5 ? (
				<rect x={32 - line / 2} y="56" width={line} height="4" rx="2" fill={c} />
			) : null}
		</svg>
	);
}

function MailGlyph({ s = 30, colour = [224, 92, 82] }) {
	return (
		<svg width={s} height={s} viewBox="0 0 30 30" style={{ display: "block" }}>
			<rect
				x="3"
				y="7"
				width="24"
				height="17"
				rx="3.5"
				fill="none"
				stroke={rgbs(colour)}
				strokeWidth="3"
			/>
			<path
				d="M4.5 9.5 15 17l10.5-7.5"
				fill="none"
				stroke={rgbs([236, 170, 60])}
				strokeWidth="3"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}
function CrmGlyph({ s = 30, colour = [236, 104, 62] }) {
	// a generic contact-card glyph (not a vendor mark)
	return (
		<svg width={s} height={s} viewBox="0 0 30 30" style={{ display: "block" }}>
			<circle cx="15" cy="11" r="5" fill={rgbs(colour)} />
			<path d="M5.5 25c1.2-5 5-7.5 9.5-7.5s8.3 2.5 9.5 7.5Z" fill={rgbs(colour)} />
		</svg>
	);
}
function CalGlyph({ s = 30, colour = [240, 186, 36] }) {
	return (
		<svg width={s} height={s} viewBox="0 0 30 30" style={{ display: "block" }}>
			<rect x="4" y="6.5" width="22" height="19" rx="4" fill={rgbs(colour)} />
			<rect x="4" y="6.5" width="22" height="6" rx="3" fill={rgbs(colour.map((v) => v * 0.86))} />
			<rect x="9" y="3.5" width="3" height="6" rx="1.5" fill={rgbs(colour.map((v) => v * 0.8))} />
			<rect x="18" y="3.5" width="3" height="6" rx="1.5" fill={rgbs(colour.map((v) => v * 0.8))} />
			<rect x="9" y="16" width="5" height="4.5" rx="1" fill="#fff" />
		</svg>
	);
}
const GLYPHS = { mail: MailGlyph, crm: CrmGlyph, calendar: CalGlyph };

// ── 1. willow-chip-line ───────────────────────────────────────────────────

/**
 * "Transcribe meetings" (f1182-1215). Measured: centred line, chip x224-719
 * (496x110, radius 14, fill [233,242,237]) holding a pen glyph + accent word
 * ([122,192,177], cap 55px 329->384), then the plain word ([44,44,44] core,
 * baseline 384) 23px right of the chip. Animated ON TWOS. Chip rises 23px
 * -> 0 (expo settle, ~0.65s) from the cut; the word pops at +4f (f1186) 19px
 * low and settles over ~0.88s. Pen swings -35° -> 0 -> +40° over 0.5s while
 * its written underline grows 0 -> 58px. Exit: whole line lifts 3px (f1212)
 * then 8px (f1214), accelerating, into the hard cut at f1216.
 */
function ChipLine(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = twos(localMs(cfg, t), cfg.twos ?? true);
	const cap = cfg.capPx ?? 55;
	const fs = fsCap(cap);
	const chip = cfg.chip ?? {};
	const words = cfg.words ?? [];
	const rise = (at, r) => (ms < at ? null : r.dy * settleDecay(ms, at, r.durMs));
	const chipAt = chip.atMs ?? 0;
	const chipDy = rise(chipAt, chip.rise ?? { dy: 23, durMs: 650 });
	const ex = cfg.exit;
	const exDy = ex && ms > ex.atMs ? -ex.dy * inPow((ms - ex.atMs) / ex.durMs, ex.pow ?? 1.5) : 0;
	const pen = kf(
		chip.penKeys ?? [
			{ at: 0, rot: -35, line: 0 },
			{ at: 83, rot: 0, line: 28 },
			{ at: 167, rot: 5, line: 40 },
			{ at: 250, rot: 15, line: 45 },
			{ at: 333, rot: 25, line: 50 },
			{ at: 417, rot: 35, line: 55 },
			{ at: 500, rot: 40, line: 58 },
		],
		ms - chipAt,
	);
	const lh = Math.round(fs * 1.0);
	const H = chip.h ?? 110;
	// the row is laid out once (hidden items keep their space) so later words
	// never re-centre the line — the reference's chip does not move when
	// "meetings" arrives.
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: (cfg.y ?? 359.5) - H / 2,
				width: 1280,
				height: H,
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				gap: cfg.gap ?? 23,
				transform: `translateY(${exDy.toFixed(2)}px)`,
				font: `${cfg.weight ?? 700} ${fs.toFixed(2)}px ${FONT}`,
				letterSpacing: cfg.tracking ?? "-0.03em",
				whiteSpace: "nowrap",
			}}
		>
			<div
				style={{
					visibility: chipDy == null ? "hidden" : "visible",
					transform: `translateY(${(chipDy ?? 0).toFixed(2)}px)`,
					height: H,
					display: "flex",
					alignItems: "center",
					padding: `0 ${chip.padR ?? 22}px 0 ${chip.padL ?? 30}px`,
					gap: chip.iconGap ?? 27,
					borderRadius: chip.radius ?? 14,
					background: rgbs(chip.fill ?? [233, 242, 237]),
				}}
			>
				{chip.icon === false ? null : (
					<div style={{ width: chip.iconPx ?? 70, height: chip.iconPx ?? 70, marginTop: 2 }}>
						<PenGlyph
							size={chip.iconPx ?? 70}
							colour={chip.iconColour ?? [116, 196, 174]}
							rot={pen.rot ?? 40}
							line={pen.line ?? 58}
						/>
					</div>
				)}
				<span
					style={{
						color: rgbs(chip.ink ?? [122, 194, 176]),
						lineHeight: `${lh}px`,
						position: "relative",
						top: cfg.textDy ?? -9.5,
					}}
				>
					{chip.text ?? "Transcribe"}
				</span>
			</div>
			{words.map((w, i) => {
				const dy = rise(w.atMs ?? 0, w.rise ?? cfg.wordRise ?? { dy: 19, durMs: 880 });
				return (
					<span
						key={i}
						style={{
							visibility: dy == null ? "hidden" : "visible",
							transform: `translateY(${((dy ?? 0) + (cfg.textDy ?? -9.5)).toFixed(2)}px)`,
							display: "inline-block",
							color: rgbs(w.colour ?? [40, 40, 40]),
							lineHeight: `${lh}px`,
						}}
					>
						{w.text}
					</span>
				);
			})}
		</div>
	);
}

// ── 2. willow-call-window ─────────────────────────────────────────────────

const TILE_DEFAULTS = [
	{ kind: "photo", bg: [209, 239, 215], c1: [120, 170, 130], c2: [60, 110, 80], initials: "AK" },
	{ kind: "letter", bg: [211, 184, 237], dot: [149, 80, 215], halo: [224, 204, 245], letter: "D" },
	{ kind: "letter", bg: [252, 241, 194], dot: [244, 196, 12], letter: "T" },
	{ kind: "photo", bg: [232, 196, 180], c1: [196, 140, 110], c2: [110, 70, 50], initials: "MO" },
	{ kind: "letter", bg: [211, 227, 250], dot: [72, 134, 236], letter: "J" },
	{ kind: "photo", bg: [246, 205, 208], c1: [236, 190, 160], c2: [190, 130, 110], initials: "LS" },
];

/** Equaliser bars, deterministic in ms. */
function Bars({ ms, n = 5, h = 26, w = 4, gap = 3, colour = [64, 206, 104] }) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap, height: h }}>
			{Array.from({ length: n }, (_, i) => {
				const v = 0.35 + 0.65 * Math.abs(Math.sin(ms / (95 + i * 23) + i * 1.7));
				return (
					<div
						key={i}
						style={{
							width: w,
							height: Math.max(w, h * v),
							borderRadius: w / 2,
							background: rgbs(colour),
						}}
					/>
				);
			})}
		</div>
	);
}

/**
 * Notetaker pill. Measured (window-relative = stage px at rest):
 * appears f1220 as a VERTICAL capsule 57x108 centred (1031.5,346), 29px low,
 * rises with a small overshoot (-4 at f1225) and holds; f1235-1242 the whole
 * capsule rotates 90° CCW about its centre (inout cubic); f1244-1250 it grows
 * symmetrically to 286 wide (quart-out) while "Taking notes…" fades in
 * left-to-right inside its clip (f1247-1252).
 */
function NotetakerPill({ ms, cfg }) {
	const p = cfg ?? {};
	const at = p.atMs ?? 167;
	if (ms < at) return null;
	const cx = p.x ?? 1031.5,
		cy = p.y ?? 346;
	const thick = p.thick ?? 57,
		short = p.short ?? 108,
		long = p.long ?? 286;
	const rel = ms - at;
	const dy = table(
		p.riseKeys ?? [
			[0, 29],
			[42, 20],
			[83, 12],
			[125, 1],
			[167, -2],
			[208, -4],
			[250, -3],
			[292, -2],
			[333, -1],
			[375, 0],
		],
		rel,
	)[0];
	const rotAt = p.rotateAtMs ?? 813,
		rotDur = p.rotateDurMs ?? 271;
	const rot = 90 * (1 - inoutPow((ms - rotAt) / rotDur, 3)); // 90 = vertical
	const grAt = p.growAtMs ?? 1183,
		grDur = p.growDurMs ?? 233;
	const g = outPow((ms - grAt) / grDur, 4);
	const Wd = lerp(short, long, g);
	const txAt = p.textAtMs ?? 1292,
		txDur = p.textDurMs ?? 210;
	const tx = clamp01((ms - txAt) / txDur);
	const av = p.avatar ?? { c1: [178, 150, 240], c2: [116, 78, 200] };
	return (
		<div
			style={{
				position: "absolute",
				left: cx - Wd / 2,
				top: cy - thick / 2 + dy,
				width: Wd,
				height: thick,
				borderRadius: thick / 2,
				background: rgbs(p.fill ?? [8, 8, 8]),
				overflow: "hidden",
				transform: `rotate(${rot.toFixed(2)}deg)`,
				transformOrigin: "50% 50%",
				boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: (p.padL ?? 36) - 18,
					top: thick / 2 - 18,
					transform: `rotate(${(-rot).toFixed(2)}deg)`,
				}}
			>
				<div
					style={{
						width: 36,
						height: 36,
						borderRadius: "50%",
						background: `linear-gradient(150deg, ${rgbs(av.c1)}, ${rgbs(av.c2)})`,
					}}
				/>
			</div>
			<div
				style={{
					position: "absolute",
					left: (p.padL ?? 36) + 26,
					top: thick / 2 - 13,
					transform: `rotate(${(-rot).toFixed(2)}deg)`,
				}}
			>
				<Bars ms={ms} />
			</div>
			<div
				style={{
					position: "absolute",
					left: (p.padL ?? 36) + 64,
					top: 0,
					height: thick,
					display: "flex",
					alignItems: "center",
					color: "#fff",
					font: `500 ${p.fontPx ?? 19}px ${FONT}`,
					whiteSpace: "nowrap",
					opacity: tx,
					WebkitMaskImage: `linear-gradient(90deg, #000 ${(tx * 140 - 40).toFixed(1)}%, transparent ${(tx * 140).toFixed(1)}%)`,
				}}
			>
				{p.text ?? "Taking notes..."}
			</div>
		</div>
	);
}

/**
 * The call window (f1216-1280). Drawn generically: a frosted browser frame
 * (x150-1130, y62-656, radius 22) around a white content panel (x162-1118,
 * y128-644) with a 3x2 grid of participant tiles (215x176, radius 14, at
 * x312/537/768, y157/346), avatar / letter discs d96, an emoji pill and a call
 * toolbar. Motion: enters on the hard cut 113px low and settles up (quart-ish
 * out, 113,62,41,27,11,6,3,0 over f1216-1223); holds; exit f1273-1280 shrinks
 * 1.00 -> 0.913 about (640,386), accelerating, into the cut at f1281. The
 * notetaker pill rides the window.
 */
function CallWindow(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const m = kf(
		cfg.keys ?? [
			{ at: 0, dy: 113, s: 1 },
			{ at: 292, dy: 0, ease: "quint" },
			{ at: 2369, s: 1 },
			{ at: 2667, s: 0.913, ease: "in", pow: 3.2 },
		],
		ms,
	);
	const tiles = cfg.tiles ?? TILE_DEFAULTS;
	const tabText = cfg.tabText ?? "Meeting";
	const TX = [312, 537, 768],
		TY = [157, 346];
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				transform: `translateY(${(m.dy ?? 0).toFixed(2)}px) scale(${(m.s ?? 1).toFixed(4)})`,
				transformOrigin: "640px 386px",
			}}
		>
			{/* frame */}
			<div
				style={{
					position: "absolute",
					left: 150,
					top: 62,
					width: 980,
					height: 594,
					borderRadius: 22,
					background: "rgba(250,253,250,0.72)",
					border: "1px solid rgba(30,80,50,0.07)",
					boxShadow: "0 26px 60px rgba(60,130,90,0.13), 0 4px 12px rgba(60,130,90,0.06)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 151,
					top: 63,
					width: 978,
					height: 64,
					borderRadius: "21px 21px 0 0",
					background: rgbs([249, 251, 246]),
				}}
			/>
			{[
				[182, [237, 95, 87]],
				[207, [246, 190, 47]],
				[234, [96, 200, 90]],
			].map(([x, c]) => (
				<div
					key={x}
					style={{
						position: "absolute",
						left: x - 8,
						top: 93,
						width: 16,
						height: 16,
						borderRadius: "50%",
						background: rgbs(c),
					}}
				/>
			))}
			<div
				style={{
					position: "absolute",
					left: 262,
					top: 89,
					display: "flex",
					alignItems: "center",
					gap: 7,
					font: `400 15px ${FONT}`,
					color: "#222",
				}}
			>
				<svg width="16" height="16" viewBox="0 0 16 16">
					{[
						[8, 2],
						[3, 8],
						[13, 8],
						[8, 14],
						[8, 8],
					].map(([x, y], i) => (
						<circle key={i} cx={x} cy={y} r="2.2" fill="#8a8a8a" />
					))}
				</svg>
				New Tab
			</div>
			<div
				style={{
					position: "absolute",
					left: 394,
					top: 81,
					width: 171,
					height: 39,
					borderRadius: 10,
					background: "#fff",
					boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
					display: "flex",
					alignItems: "center",
					gap: 9,
					paddingLeft: 13,
					font: `400 15px ${FONT}`,
					color: "#222",
					boxSizing: "border-box",
				}}
			>
				<svg width="20" height="14" viewBox="0 0 20 14">
					<rect x="0" y="1" width="13" height="12" rx="2.5" fill={rgbs([246, 196, 30])} />
					<path d="M13 5.5 19 2v10l-6-3.5Z" fill={rgbs([246, 196, 30])} />
				</svg>
				{tabText}
			</div>
			<div
				style={{
					position: "absolute",
					left: 598,
					top: 86,
					font: `300 24px ${FONT}`,
					color: "#222",
				}}
			>
				+
			</div>
			{/* content */}
			<div
				style={{
					position: "absolute",
					left: 162,
					top: 128,
					width: 956,
					height: 516,
					borderRadius: "0 0 16px 16px",
					background: rgbs([254, 255, 253]),
				}}
			/>
			{tiles.slice(0, 6).map((tl, i) => {
				const x = TX[i % 3],
					y = TY[Math.floor(i / 3)];
				return (
					<div
						key={i}
						style={{
							position: "absolute",
							left: x,
							top: y,
							width: 215,
							height: 176,
							borderRadius: 14,
							background: rgbs(tl.bg),
						}}
					>
						{tl.kind === "letter" ? (
							<>
								{tl.halo ? (
									<div
										style={{
											position: "absolute",
											left: 107.5 - 60,
											top: 88 - 60,
											width: 120,
											height: 120,
											borderRadius: "50%",
											background: rgbs(tl.halo),
										}}
									/>
								) : null}
								<div
									style={{
										position: "absolute",
										left: 107.5 - 48,
										top: 88 - 48,
										width: 96,
										height: 96,
										borderRadius: "50%",
										background: rgbs(tl.dot),
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "#fff",
										font: `400 44px ${FONT}`,
									}}
								>
									{tl.letter}
								</div>
							</>
						) : (
							<Avatar x={107.5} y={88} d={96} c1={tl.c1} c2={tl.c2} initials={tl.initials ?? ""} />
						)}
					</div>
				);
			})}
			{/* reactions pill + status dot */}
			<div
				style={{
					position: "absolute",
					left: 446,
					top: 538,
					width: 205,
					height: 27,
					borderRadius: 14,
					background: rgbs([238, 239, 240]),
					display: "flex",
					alignItems: "center",
					justifyContent: "space-evenly",
				}}
			>
				{[
					[236, 120, 150],
					[246, 196, 60],
					[240, 150, 70],
					[246, 196, 60],
					[246, 196, 60],
					[246, 186, 60],
					[246, 196, 60],
					[236, 186, 70],
					[246, 196, 60],
				].map((c, i) => (
					<div
						key={i}
						style={{ width: 15, height: 15, borderRadius: "50%", background: rgbs(c) }}
					/>
				))}
			</div>
			<div
				style={{
					position: "absolute",
					left: 829,
					top: 545,
					width: 13,
					height: 13,
					borderRadius: "50%",
					background: rgbs([249, 202, 44]),
				}}
			/>
			{/* toolbar */}
			{[
				{ x: 446, w: 59, bg: [236, 238, 240], dot: { x: 490, c: [16, 16, 16] } },
				{ x: 514, w: 61, bg: [236, 170, 172] },
				{ x: 584, w: 33, bg: [236, 238, 240] },
				{ x: 630, w: 37, bg: [190, 210, 248] },
				{ x: 676, w: 38, bg: [236, 238, 240] },
				{ x: 722, w: 38, bg: [236, 238, 240] },
				{ x: 768, w: 14, bg: [236, 238, 240] },
				{ x: 800, w: 50, bg: [204, 64, 62] },
			].map((b, i) => (
				<React.Fragment key={i}>
					<div
						style={{
							position: "absolute",
							left: b.x,
							top: 573,
							width: b.w,
							height: 34,
							borderRadius: 17,
							background: rgbs(b.bg),
						}}
					/>
					{b.dot ? (
						<div
							style={{
								position: "absolute",
								left: b.dot.x - 16,
								top: 574,
								width: 32,
								height: 32,
								borderRadius: "50%",
								background: rgbs(b.dot.c),
							}}
						/>
					) : null}
				</React.Fragment>
			))}
			<NotetakerPill ms={ms} cfg={cfg.pill} />
		</div>
	);
}

// ── 3. willow-bubble-stack ────────────────────────────────────────────────

/**
 * Chat bubbles stacking beside the companion (f1281-1383). ON TWOS.
 * Measured: white bubbles (radius 22, thin shadow rim), left edge x550,
 * regular-weight text cap 35px (font ~50px), line pitch 52; single-line
 * bubbles 108 tall (cap top 36 below the bubble top), two-line 140 (pads 18).
 * Gap ~30. The stack is centred on y~303 until its bottom would pass y~455,
 * then bottom-pinned. A new bubble pops in at full opacity ~35px LOW of its
 * slot, closes that in ~2 frames and dips ~8px (sin dip over 0.42s); the
 * stack scrolls to its new layout on a measured S (starts ~0.17s before the
 * bubble appears, 48% done on its first frame, done ~0.33s after).
 */
function bubbleHeight(b, cfg) {
	const n = b.lines.length;
	return n > 1
		? (cfg.padYMulti ?? 18) * 2 + n * (cfg.lineH ?? 52)
		: (cfg.padY ?? 28) * 2 + (cfg.lineH ?? 52);
}
function BubbleStack(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = twos(localMs(cfg, t), cfg.twos ?? true);
	const bubbles = cfg.bubbles ?? [];
	const gap = cfg.gap ?? 30;
	const hs = bubbles.map((b) => bubbleHeight(b, cfg));
	const topFor = (n) => {
		const total = hs.slice(0, n).reduce((a, b) => a + b, 0) + gap * Math.max(0, n - 1);
		let top = (cfg.anchorY ?? 303) - total / 2;
		if (top + total > (cfg.maxBottom ?? 455)) top = (cfg.maxBottom ?? 455) - total;
		return top;
	};
	const curve = cfg.scrollCurve ?? [
		[-200, 0],
		[-167, 0.04],
		[-83, 0.13],
		[0, 0.48],
		[83, 0.84],
		[167, 0.95],
		[250, 0.98],
		[333, 1],
	];
	let Y = topFor(1);
	for (let i = 1; i < bubbles.length; i++) {
		Y += (topFor(i + 1) - topFor(i)) * table(curve, ms - bubbles[i].atMs)[0];
	}
	const fs = fsCap(cfg.capPx ?? 35);
	const lineH = cfg.lineH ?? 52;
	let acc = 0;
	return (
		<div style={{ position: "absolute", inset: 0 }}>
			{bubbles.map((b, i) => {
				const y0 = acc;
				acc += hs[i] + gap;
				if (ms < b.atMs) return null;
				const tau = ms - b.atMs;
				const A = b.popDy ?? cfg.popDy ?? 34;
				const dip = cfg.dip ?? 8,
					dipMs = cfg.dipMs ?? 420;
				const off =
					A * Math.exp(-tau / 25) - (tau < dipMs ? dip * Math.sin((Math.PI * tau) / dipMs) : 0);
				const multi = b.lines.length > 1;
				const padTop = multi ? (cfg.padYMulti ?? 18) : (cfg.padY ?? 28);
				const G = b.glyph ? GLYPHS[b.glyph] : null;
				return (
					<div
						key={i}
						style={{
							position: "absolute",
							left: cfg.x ?? 550,
							top: Y + y0 + off,
							height: hs[i],
							padding: `0 ${cfg.padX ?? 30}px`,
							boxSizing: "border-box",
							borderRadius: cfg.radius ?? 22,
							background: "#fff",
							boxShadow: "0 1px 1px rgba(40,70,50,0.10), 0 4px 10px rgba(40,70,50,0.07)",
							font: `${cfg.weight ?? 400} ${fs.toFixed(2)}px ${FONT}`,
							letterSpacing: cfg.tracking ?? "-0.035em",
							whiteSpace: "nowrap",
						}}
					>
						<div
							style={{
								position: "relative",
								top: padTop + (cfg.textDy ?? 4),
								lineHeight: `${lineH}px`,
							}}
						>
							{b.lines.map((ln, j) => (
								<div key={j} style={{ display: "flex", alignItems: "center", height: lineH }}>
									{ln.map((seg, k) => (
										<span
											key={k}
											style={{
												color: rgbs(
													seg.accent ? (b.accent ?? [145, 92, 205]) : (cfg.ink ?? [14, 14, 14]),
												),
												whiteSpace: "pre",
											}}
										>
											{seg.text}
										</span>
									))}
									{G && j === b.lines.length - 1 ? (
										<span style={{ marginLeft: 8, display: "inline-block" }}>
											<G s={cfg.glyphPx ?? 36} />
										</span>
									) : null}
								</div>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}

// ── 4. willow-word-lines ──────────────────────────────────────────────────

/**
 * Centred kinetic lines whose words reveal on cues inside a FIXED final
 * layout (later words never re-centre earlier ones). Per word: optional
 * slide-in from the right (dx decaying exponentially). Per line: optional
 * rise (dy held, then exponential) and an accelerating sideways exit. Group:
 * an oversized settle (s = 1 + min(hold-1, amp·e^(-t/tau))), a linear drift
 * and an accelerating shrink exit (rate doubling every `doubleMs`).
 *
 * Measured on the "Everyone" passage (f1384-1449):
 *  - "Everyone" alone, cap 103: lands at 2.03x for 2 frames, then excess
 *    decays x0.55-0.6/frame (tau ~69ms) to 1.00 by ~f1394.
 *  - Re-lay at f1398: "Everyone" cap 71 over "on your team" (pitch 100);
 *    line 1 rises 24px, line 2 52px (held 1 frame, tau ~52ms); words of line
 *    2 pop at +0/+4/+6 frames; slow zoom-out ~2.4%/s; exit f1419-1424 both
 *    lines slide LEFT (ease-in cubic, 25px / 38px — line 2 leads).
 *  - Hard cut f1425 "gets a companion" (x-height 51, baseline 386): words at
 *    +0/+2/+5 frames, each sliding in from the right 36/25/25px (x0.6/frame);
 *    exit f1445-1449 shrinks about the centre, rate doubling per frame
 *    (0.987, 0.974, 0.95, 0.91, 0.83) into the cut.
 */
function WordLines(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = twos(localMs(cfg, t), cfg.twos ?? false);
	const g = cfg.group ?? {};
	let s = 1;
	if (g.settle) {
		const st = g.settle;
		s *=
			1 +
			Math.min(
				(st.hold ?? 2) - 1,
				(st.amp ?? 1) * Math.exp(-(ms - (st.atMs ?? 0)) / (st.tauMs ?? 70)),
			);
	}
	if (g.drift) s *= kf(g.drift, ms).s ?? 1;
	if (g.exit && ms > g.exit.atMs) {
		const n = (ms - g.exit.atMs) / (g.exit.doubleMs ?? FRAME);
		s *= Math.max(0, 1 - (g.exit.k ?? 0.0065) * (Math.pow(2, n) - 1));
	}
	const ox = g.originX ?? 640,
		oy = g.originY ?? 360;
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				transform: `scale(${s.toFixed(5)})`,
				transformOrigin: `${ox}px ${oy}px`,
			}}
		>
			{(cfg.lines ?? []).map((ln, li) => {
				const fs = fsCap(ln.capPx ?? cfg.capPx ?? 70);
				let dy = 0,
					dx = 0;
				if (ln.rise) {
					const r = ln.rise;
					dy = r.dy * Math.min(1, Math.exp(-(ms - (r.holdMs ?? 0)) / (r.tauMs ?? 52)));
				}
				if (ln.exit && ms > ln.exit.atMs)
					dx = ln.exit.dx * inPow((ms - ln.exit.atMs) / ln.exit.durMs, ln.exit.pow ?? 3);
				return (
					<div
						key={li}
						style={{
							position: "absolute",
							left: 0,
							width: 1280,
							top: baselineTop(ln.baselineY, fs),
							lineHeight: 1,
							textAlign: "center",
							whiteSpace: "nowrap",
							font: `${ln.weight ?? cfg.weight ?? 700} ${fs.toFixed(2)}px ${FONT}`,
							letterSpacing: ln.tracking ?? cfg.tracking ?? "-0.045em",
							wordSpacing: ln.wordSpacing ?? cfg.wordSpacing ?? "-0.05em",
							color: rgbs(ln.colour ?? [35, 35, 35]),
							transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`,
						}}
					>
						{ln.words.map((w, wi) => {
							const on = ms >= (w.atMs ?? 0);
							const sx =
								on && w.slideDx ? w.slideDx * Math.exp(-(ms - w.atMs) / (w.slideTauMs ?? 80)) : 0;
							return (
								<React.Fragment key={wi}>
									<span
										style={{
											display: "inline-block",
											visibility: on ? "visible" : "hidden",
											transform: sx ? `translateX(${sx.toFixed(2)}px)` : undefined,
											color: w.colour ? rgbs(w.colour) : undefined,
										}}
									>
										{w.text}
									</span>
									{wi < ln.words.length - 1 ? " " : null}
								</React.Fragment>
							);
						})}
					</div>
				);
			})}
		</div>
	);
}

// ── 5. willow-orbit-row ───────────────────────────────────────────────────

/**
 * Four role portraits (circle photo + coloured role tag) that spin in as a
 * cluster, dock into a row, then fly off the top. Measured f1450-1518 on the
 * tag centroids:
 *  - ORBIT about (638,362) (circle centres), 90° apart, CLOCKWISE: theta
 *    -144° on the cut, 25°/frame decelerating to ~4°/frame by f1466 and
 *    re-accelerating into the hand-off (table `orbit.theta`). Two radius sets:
 *    the pair on one diagonal grows 133->243, the other 181->171 (table).
 *  - DOCK: each item blends from its live orbit position to its row slot on a
 *    pow-4/5 ease-out (Founder f1474.3 ->, Sales 1475.3, Marketing 1477,
 *    Product 1479.3; 0.58-0.67s), the circle shrinking 226 -> 125 px; the tag
 *    shrinks with it to ~0.66 and then regrows to ~0.95 over ~0.33s.
 *  - EXIT f1510-1518: the row lifts off the top, accelerating (0,-5,-10,-19,
 *    -32,-50,-82,-157 px/frame-steps), x fixed, no scale.
 */
function OrbitRow(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const o = cfg.orbit ?? {};
	const cx = o.cx ?? 638,
		cy = o.cy ?? 362;
	const [theta] = table(o.theta, ms);
	const [rA, rB] = table(o.radius, ms);
	const D = cfg.d ?? 226;
	const ex = cfg.exit ?? {
		atMs: 2083,
		keys: [
			[0, 0],
			[42, -5],
			[83, -10],
			[167, -19],
			[208, -32],
			[250, -50],
			[292, -82],
			[333, -157],
			[417, -460],
		],
	};
	const exDy = ms > ex.atMs ? table(ex.keys, ms - ex.atMs)[0] : 0;
	const items = cfg.items ?? [];
	// render back-to-front: later items in the list on top
	return (
		<div style={{ position: "absolute", inset: 0 }}>
			{items.map((it, i) => {
				const a = (((theta ?? 0) + (it.phase ?? i * 90)) * Math.PI) / 180;
				const r = it.set === "b" ? rB : rA;
				const ox = cx + r * Math.cos(a),
					oy = cy + r * Math.sin(a);
				const w = outPow((ms - it.departMs) / it.dockMs, it.pow ?? 5);
				const x = lerp(ox, it.rowX, w),
					y = lerp(oy, it.rowY, w) + exDy;
				const sc = lerp(1, cfg.rowScale ?? 0.553, w);
				const rec = outPow(
					(ms - it.departMs - (cfg.tagRecoverDelayMs ?? 195)) / (cfg.tagRecoverMs ?? 330),
					2,
				);
				const ts = sc + ((cfg.tagRowScale ?? 0.95) - sc) * rec;
				const d = D * sc;
				const tagOff = (D / 2) * sc * 0.94 + ((1 - sc) / (1 - (cfg.rowScale ?? 0.553))) * 9.7;
				return (
					<React.Fragment key={i}>
						<div
							style={{
								position: "absolute",
								left: x - d / 2,
								top: y - d / 2,
								width: d,
								height: d,
								borderRadius: "50%",
								background: rgbs(it.ring ?? [220, 232, 222]),
							}}
						/>
						<Avatar
							x={x}
							y={y + d * 0.04}
							d={d * 0.9}
							c1={it.c1}
							c2={it.c2}
							initials={it.initials ?? ""}
						/>
						<div
							style={{
								position: "absolute",
								left: x,
								top: y + tagOff,
								transform: `translate(-50%,-50%) scale(${ts.toFixed(4)})`,
								height: cfg.tagH ?? 46,
								padding: `0 ${cfg.tagPadX ?? 14}px`,
								borderRadius: cfg.tagRadius ?? 10,
								background: rgbs(it.tag),
								color: "#fff",
								display: "flex",
								alignItems: "center",
								font: `500 ${cfg.tagFontPx ?? 29}px ${FONT}`,
								whiteSpace: "nowrap",
								letterSpacing: "-0.005em",
							}}
						>
							{it.label}
						</div>
					</React.Fragment>
				);
			})}
		</div>
	);
}

// ── 6. willow-art-slot ────────────────────────────────────────────────────

/**
 * A character-art SLOT: the template's placeholder for the user's mascot
 * art. A light tinted face with a dashed rim and a small label, no shadow
 * (the reference's characters cast none). keys (scene-relative, kf):
 * {at, x, y (centre), w, h, rot, sx, sy, opacity, ease, pow}. Ships with the
 * measured bbox motion of the character it stands in for.
 */
function ArtSlot(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = twos(localMs(cfg, t), cfg.twos ?? false);
	const k = kf(cfg.keys ?? [{ at: 0, x: 640, y: 360, w: 300, h: 400 }], ms);
	const wv = k.w ?? 300,
		hv = k.h ?? 400;
	const tint = cfg.tint ?? [180, 160, 230];
	if ((k.opacity ?? 1) <= 0.001) return null;
	return (
		<div
			style={{
				position: "absolute",
				left: (k.x ?? 640) - wv / 2,
				top: (k.y ?? 360) - hv / 2,
				width: wv,
				height: hv,
				transform: `rotate(${(k.rot ?? 0).toFixed(2)}deg) scale(${(k.sx ?? 1).toFixed(4)}, ${(k.sy ?? 1).toFixed(4)})`,
				transformOrigin: cfg.origin ?? "50% 100%",
				opacity: k.opacity ?? 1,
				borderRadius: cfg.radius ?? 36,
				background: rgbs(tint, cfg.faceAlpha ?? 0.3),
				border: `2px dashed ${rgbs(
					tint.map((v) => v * 0.7),
					0.55,
				)}`,
				boxSizing: "border-box",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				textAlign: "center",
				color: rgbs(tint.map((v) => v * 0.45)),
				font: `500 ${cfg.labelPx ?? 15}px ${FONT}`,
				padding: 10,
			}}
		>
			{cfg.label ?? "character art"}
		</div>
	);
}

// ── registry ──────────────────────────────────────────────────────────────

export const S5_PRESETS = {
	"willow-chip-line": {
		note: "A centred line whose first word sits in a tinted CHIP with an animated pen glyph, followed by plain words that pop in later inside a fixed layout. Rise-into-place per element (expo settle), optional accelerating lift exit, animated on twos. 'Transcribe meetings'.",
		nativeMs: 1417,
		params: {
			y: ["number", 359.5, "chip centre y"],
			capPx: ["number", 55, "cap height of the line (px)"],
			chip: [
				"object",
				"{text, ink, fill, icon, h:110, radius:14, padL, padR, iconGap, rise:{dy,durMs}, penKeys}",
				"the chip and its pen glyph",
			],
			words: [
				"array",
				"[{text, atMs, colour, rise}]",
				"plain words after the chip, scene-relative cues",
			],
			exit: ["object|null", "{atMs, durMs, dy, pow}", "accelerating lift before the cut"],
			twos: ["bool", true, "quantise motion to 12fps steps (the reference's)"],
		},
		render: ChipLine,
	},
	"willow-call-window": {
		note: "A generic video-call browser window (frosted frame, tab bar, 3x2 participant grid of avatar/letter tiles, reactions pill, toolbar) with a dark notetaker pill that appears as a vertical capsule, rotates flat and grows to show its status text. Window rises in on the cut and shrinks out on an accelerating ease.",
		nativeMs: 2708,
		params: {
			keys: ["array", "[{at,dy,s,ease,pow}]", "window motion (translateY + scale about 640,386)"],
			tiles: [
				"array",
				"6 tiles",
				"[{kind:'photo'|'letter', bg, c1, c2, initials, dot, halo, letter}]",
			],
			tabText: ["string", "Meeting", "active tab label"],
			pill: [
				"object",
				"{atMs, x, y, text, rotateAtMs, growAtMs, textAtMs, ...}",
				"the notetaker pill",
			],
		},
		render: CallWindow,
	},
	"willow-bubble-stack": {
		note: "White chat bubbles stacking up beside a character: each pops in low, snaps up and dips; the stack re-centres / bottom-pins on a measured S-curve. Accent spans and a trailing neutral glyph (mail / crm / calendar) per bubble. On twos.",
		nativeMs: 4292,
		params: {
			x: ["number", 550, "bubble left edge"],
			anchorY: ["number", 303, "stack centre while it fits"],
			maxBottom: ["number", 455, "stack bottom once it overflows"],
			bubbles: [
				"array",
				"[{atMs, lines:[[{text, accent}]], accent:[r,g,b], glyph}]",
				"bubbles in order",
			],
			capPx: ["number", 35, "text cap height"],
		},
		render: BubbleStack,
	},
	"willow-word-lines": {
		note: "Centred kinetic lines with words revealing on cues inside a fixed layout; per-word slide-in, per-line rise and sideways exit, group oversize-settle / drift / accelerating shrink. The 'Everyone on your team gets a companion' relay.",
		nativeMs: 1042,
		params: {
			lines: [
				"array",
				"[{baselineY, capPx, colour, weight, words:[{text, atMs, slideDx, slideTauMs, colour}], rise:{dy,holdMs,tauMs}, exit:{atMs,durMs,dx,pow}}]",
				"the lines",
			],
			group: [
				"object",
				"{settle:{hold,amp,tauMs,atMs}, drift:[kf keys {at,s}], exit:{atMs,k,doubleMs}, originX, originY}",
				"whole-group scale channels",
			],
			twos: ["bool", false, "quantise to 12fps"],
		},
		render: WordLines,
	},
	"willow-orbit-row": {
		note: "Portrait circles with role tags that spin in as an orbiting cluster (measured angle/radius tables), dock one by one into a row (shrinking, tags dip and regrow), then lift off the top accelerating.",
		nativeMs: 3167,
		params: {
			orbit: ["object", "{cx, cy, theta:[[ms,deg]], radius:[[ms,rA,rB]]}", "measured orbit tables"],
			items: [
				"array",
				"[{label, tag, ring, c1, c2, initials, phase, set:'a'|'b', rowX, rowY, departMs, dockMs, pow}]",
				"the portraits",
			],
			exit: ["object", "{atMs, keys:[[ms,dy]]}", "lift-off"],
		},
		render: OrbitRow,
	},
	"willow-art-slot": {
		note: "Placeholder SLOT for character/mascot art: tinted dashed face + label, no shadow, with keyframed bbox motion (x,y,w,h,rot,sx,sy,opacity) measured off the character it stands in for.",
		nativeMs: 2000,
		params: {
			keys: ["array", "[{at,x,y,w,h,rot,sx,sy,opacity,ease,pow}]", "bbox motion, centre coords"],
			label: ["string", "character art", "what goes here"],
			tint: ["rgb", [180, 160, 230], "face tint"],
			origin: ["string", "50% 100%", "transform origin for rot/scale"],
		},
		render: ArtSlot,
	},
};
