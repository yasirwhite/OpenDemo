/**
 * juniper-s3.jsx — section 3 presets.
 * Range: 7.8 – 25.1s (f234–f752): phone comps x4 (hard cuts of slot + sub-label),
 * phone -> watch morph (f585–f604), watch comps x2 (cut f673), static watch hold.
 *
 * All measurements are on the 30fps / 1280x720 reference frames (frame n = n/30 s);
 * tables are indexed in frames relative to a per-beat anchor so they replay the
 * measured per-frame values exactly at 30fps and interpolate linearly between.
 *
 *   juniper-side-label   the kinetic left label ("sub" over "for [glyph] Device"):
 *                        sub-label roll-crossfades on app cuts, device-word roll on
 *                        device morphs, line re-aligns to the new word width.
 *   juniper-phone-comp   PhoneFrame at the measured rect with its slow settle drift,
 *                        slot hard cuts with the white screen flash, and the
 *                        accelerating whip-out to the right (scale-down, fade, h-blur).
 *   juniper-watch-comp   a measured "Ultra" watch (local corrected WatchFrame variant,
 *                        `UltraWatch`), entering by fade + scale-up in place behind the
 *                        departing phone, slot hard cuts with the white flash.
 */
import React from "react";
import {
	FONT,
	live,
	localMs,
	PhoneFrame,
	PlatformGlyph,
	Q,
	rgbs,
	ScreenSlot,
	ULTRA,
	UltraWatch,
} from "./juniper-shared.jsx";

const FMS = 1000 / 30; // one reference frame in ms
const STAGE_W = 1280;

/** Piecewise-linear lookup in a measured table [[u, v], ...] (u ascending), clamped. */
function tab(pts, u) {
	if (u <= pts[0][0]) return pts[0][1];
	const n = pts.length;
	if (u >= pts[n - 1][0]) return pts[n - 1][1];
	for (let i = 0; i < n - 1; i++) {
		const [u0, v0] = pts[i];
		const [u1, v1] = pts[i + 1];
		if (u >= u0 && u < u1) return v0 + ((v1 - v0) * (u - u0)) / (u1 - u0);
	}
	return pts[n - 1][1];
}

/** Speed of a table at u in units per frame (central difference). */
const speed = (pts, u) => Math.abs(tab(pts, u + 0.5) - tab(pts, u - 0.5));

/**
 * Directional gaussian blur (motion blur) through an inline SVG filter — CSS blur()
 * is isotropic, the reference smears along the motion axis only.
 */
function MotionBlur({ id, sx = 0, sy = 0, children, style = null }) {
	const on = sx > 0.05 || sy > 0.05;
	return (
		<>
			{on ? (
				<svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
					<defs>
						<filter
							id={id}
							x="-80%"
							y="-80%"
							width="260%"
							height="260%"
							colorInterpolationFilters="sRGB"
						>
							<feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} />
						</filter>
					</defs>
				</svg>
			) : null}
			<div
				style={{
					position: "absolute",
					inset: 0,
					filter: on ? `url(#${id})` : "none",
					...(style ?? {}),
				}}
			>
				{children}
			</div>
		</>
	);
}

// ── text measuring (canvas: deterministic, no layout pass) ──────────────────

const widthCache = new Map();
function textWidth(text, font, letterSpacingPx) {
	const key = `${font}|${letterSpacingPx}|${text}`;
	const hit = widthCache.get(key);
	if (hit != null) return hit;
	let w = text.length * 0.55 * 68;
	if (typeof document !== "undefined") {
		const ctx = document.createElement("canvas").getContext("2d");
		ctx.font = font;
		w = ctx.measureText(text).width + letterSpacingPx * text.length;
	}
	widthCache.set(key, w);
	return w;
}

// ── juniper-side-label ──────────────────────────────────────────────────────

// Sub-label swap on an app cut, u = frames from the swap anchor (the frame where
// both labels sit at ~55% — the cut frame for f413/f504/f673, f323.4 for f324,
// f593.6 inside the device morph). Measured on the sub-label ink tops (rest y298):
// old rises accelerating (f405..f414: 0,-1,-2,-3,-4,-6,-10,-15,-23,-31) and fades
// (min-lum 1 -> 55 -> 114 -> 160 -> gone); new rises in from +23 below, decaying
// (+23,+17,+11,+7,+5,+3,+2,+1,+1,0) while fading in (169 -> 111 -> 56 -> 1).
const SUB_OLD_DY = [
	[-8, 0],
	[-7, -1],
	[-6, -2],
	[-5, -3],
	[-4, -4],
	[-3, -6],
	[-2, -10],
	[-1, -15],
	[0, -23],
	[1, -31],
	[2, -39],
];
const SUB_OLD_OP = [
	[-2, 1],
	[-1, 0.78],
	[0, 0.55],
	[1, 0.3],
	[2, 0],
];
const SUB_NEW_DY = [
	[-2, 28],
	[-1, 23],
	[0, 17],
	[1, 11],
	[2, 7],
	[3, 5],
	[4, 3],
	[5, 2],
	[6, 1],
	[7, 1],
	[9, 0],
];
const SUB_NEW_OP = [
	[-2, 0],
	[-1, 0.33],
	[0, 0.56],
	[1, 0.8],
	[2, 1],
];

// Device-word roll, u = frames from the roll anchor (f593 in the reference). Ink
// tops of the main word (rest y335/337): "iPhone" f586..f593 -1,-2,-3,-5,-9,-13,-21,
// -33 (accelerating up), "Watch" f592..f603 +55,+44,+30,+19,+13,+8,+5,+3,+2,+1,+1,0
// (decaying up from below; the table sits ~5 px below those smeared ink tops so that
// our own smear lands on them, checked per frame f593-f599). Both are clipped to a window from 16 px above the main
// line's ink top to 17 px below its baseline (iPhone clipped flat at y319, Watch at
// y401) and smeared vertically by their own speed.
const WORD_OLD_DY = [
	[-8, 0],
	[-7, -1],
	[-6, -2],
	[-5, -3],
	[-4, -5],
	[-3, -9],
	[-2, -13],
	[-1, -21],
	[0, -33],
	[1, -50],
	[2, -72],
	[3, -98],
];
const WORD_NEW_DY = [
	[-3, 92],
	[-2, 68],
	[-1, 58],
	[0, 49],
	[1, 35],
	[2, 24],
	[3, 17],
	[4, 11],
	[5, 7],
	[6, 4.5],
	[7, 3],
	[8, 2],
	[9, 1],
	[11, 0],
];
// "for" + glyph slide right as the word slot narrows (main line is right-aligned at
// ink x620): "for" ink left f588..f600 264,265,265,265,266,268,270,271,272,273,273,273,274.
const WORD_SHIFT = [
	[-5, 0],
	[-4, 0.1],
	[-2, 0.1],
	[-1, 0.2],
	[0, 0.4],
	[1, 0.6],
	[2, 0.7],
	[3, 0.8],
	[4, 0.9],
	[6, 0.9],
	[7, 1],
];

// Calibration of Segoe UI box -> ink (measured on our own render, see notes.md):
// with line-height = font size, the baseline sits at BASE_EM of the font size
// below the line-box top.
const BASE_EM = 0.914;

function SubText({ text, size, colour, cx, top, dy, op, blur, id }) {
	if (op <= 0.001) return null;
	return (
		<MotionBlur id={id} sy={blur}>
			<div
				style={{
					position: "absolute",
					left: cx - 600,
					width: 1200,
					top: top + dy,
					textAlign: "center",
					font: `400 ${size}px ${FONT}`,
					lineHeight: `${size}px`,
					letterSpacing: "-0.005em",
					whiteSpace: "nowrap",
					color: rgbs(colour),
					opacity: op,
				}}
			>
				{text}
			</div>
		</MotionBlur>
	);
}

function renderSideLabel(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const size = cfg.size ?? 67;
	const subSize = cfg.subSize ?? 25;
	const ink = cfg.colour ?? Q.ink;
	const right = cfg.right ?? 620; // main-line ink right edge
	const baseline = cfg.baseline ?? 384; // main-line baseline
	const subBaseline = cfg.subBaseline ?? 315.5; // sub-label baseline
	const ls = -0.015 * size;
	const mainFont = `600 ${size}px ${FONT}`;
	const rsb = cfg.rsb ?? 2; // right side bearing + trailing letter-spacing of the word (px)
	const gapWord = cfg.gapWord ?? 0.235 * size; // glyph box -> word box
	const gapLead = cfg.gapLead ?? 0.25 * size; // lead box -> glyph box
	const words = cfg.words ?? [{ at: 0, text: "iPhone" }];
	const subs = cfg.subs ?? [{ at: 0, text: "" }];
	const lineTop = baseline - BASE_EM * size;
	const subTop = subBaseline - BASE_EM * subSize;

	// ── device word (roll) ──
	let wi = 0;
	for (let i = 1; i < words.length; i++) if (ms >= words[i].at - 9 * FMS) wi = i;
	const wu = wi > 0 ? (ms - words[wi].at) / FMS : 99;
	const rolling = wi > 0 && wu < 11;
	const wNew = textWidth(words[wi].text, mainFont, ls);
	const wOld = rolling ? textWidth(words[wi - 1].text, mainFont, ls) : wNew;
	const shift = rolling ? tab(WORD_SHIFT, wu) : 1;
	const slotW = wOld + (wNew - wOld) * shift;
	const slotRight = right + rsb;
	const slotLeft = slotRight - slotW;
	const glyphW = size * 0.58;
	const glyphRight = slotLeft - gapWord;
	const leadRight = glyphRight - glyphW - gapLead;
	const clipTop = baseline - 0.73 * size - 16;
	const clipBot = baseline + 17;

	const wordLayer = (text, dy, key) => {
		const v = rolling ? speed(key === "old" ? WORD_OLD_DY : WORD_NEW_DY, wu) : 0;
		return (
			<MotionBlur key={key} id={`${cfg.id ?? "s3l"}-w${key}`} sy={v * 0.35}>
				<div
					style={{
						position: "absolute",
						left: 0,
						top: lineTop - clipTop + dy,
						font: mainFont,
						lineHeight: `${size}px`,
						letterSpacing: `${ls}px`,
						whiteSpace: "nowrap",
						color: rgbs(ink),
					}}
				>
					{text}
				</div>
			</MotionBlur>
		);
	};

	// ── sub-label (roll-crossfade) ──
	let si = 0;
	for (let i = 1; i < subs.length; i++) if (ms >= subs[i].at - 9 * FMS) si = i;
	const su = si > 0 ? (ms - subs[si].at) / FMS : 99;
	const swapping = si > 0 && su < 10;
	const lineCx = (leadRight - textWidth(cfg.lead ?? "for", mainFont, ls) + slotRight) / 2;
	const subCx = cfg.subAlign === "line" ? lineCx : (cfg.subCx ?? 442.5);
	const subColour = cfg.subColour ?? ink;
	const idp = cfg.id ?? "s3l";

	return (
		<div style={{ position: "absolute", inset: 0 }}>
			{swapping ? (
				<>
					<SubText
						id={`${idp}-so`}
						text={subs[si - 1].text}
						size={subSize}
						colour={subColour}
						cx={subCx}
						top={subTop}
						dy={tab(SUB_OLD_DY, su)}
						op={tab(SUB_OLD_OP, su)}
						blur={speed(SUB_OLD_DY, su) * 0.3}
					/>
					<SubText
						id={`${idp}-sn`}
						text={subs[si].text}
						size={subSize}
						colour={subColour}
						cx={subCx}
						top={subTop}
						dy={tab(SUB_NEW_DY, su)}
						op={tab(SUB_NEW_OP, su)}
						blur={speed(SUB_NEW_DY, su) * 0.3}
					/>
				</>
			) : (
				<SubText
					id={`${idp}-s`}
					text={subs[si].text}
					size={subSize}
					colour={subColour}
					cx={subCx}
					top={subTop}
					dy={0}
					op={1}
					blur={0}
				/>
			)}
			{/* lead word, right-aligned to the glyph */}
			<div
				style={{
					position: "absolute",
					right: STAGE_W - leadRight,
					top: lineTop,
					font: mainFont,
					lineHeight: `${size}px`,
					letterSpacing: `${ls}px`,
					whiteSpace: "nowrap",
					color: rgbs(ink),
				}}
			>
				{cfg.lead ?? "for"}
			</div>
			{cfg.glyph === false ? null : (
				<div
					style={{
						position: "absolute",
						left: glyphRight - glyphW,
						top: baseline - size * 0.66 - (cfg.glyphLift ?? 0.0) * size,
						lineHeight: 0,
					}}
				>
					<PlatformGlyph size={size} colour={ink} />
				</div>
			)}
			{/* device word in its clip window */}
			<div
				style={{
					position: "absolute",
					left: slotLeft,
					top: clipTop,
					width: Math.max(wOld, wNew) + 40,
					height: clipBot - clipTop,
					overflow: "hidden",
				}}
			>
				{rolling ? (
					<>
						{wu < 4 ? wordLayer(words[wi - 1].text, tab(WORD_OLD_DY, wu), "old") : null}
						{wu > -4 ? wordLayer(words[wi].text, tab(WORD_NEW_DY, wu), "new") : null}
					</>
				) : (
					wordLayer(words[wi].text, 0, "cur")
				)}
			</div>
		</div>
	);
}

// ── screen content: slot cuts + white flash ─────────────────────────────────

// White screen flash after every app cut, u = frames from the cut. Measured as the
// screen's mean-luminance excess over its settled value, normalised to white:
// f413 1.00,.66,.51,.39,.30,.23,.17,.13,.10,.07,.04,.03,.01; f673 .96,.62,.50,.40,
// .33,.27,.22,.12,.09,.06,.03,.02; f324 / f504 start at .76 (first frame already
// partly faded) then follow the same decay.
const FLASH = [
	[1, 0.6],
	[2, 0.46],
	[3, 0.36],
	[4, 0.28],
	[5, 0.21],
	[6, 0.16],
	[7, 0.12],
	[8, 0.09],
	[9, 0.06],
	[10, 0.04],
	[11, 0.02],
	[12, 0.01],
	[13, 0],
];

const appIndex = (apps, ms) => {
	let ai = 0;
	for (let i = 1; i < apps.length; i++) if (ms >= apps[i].at - 0.5) ai = i;
	return ai;
};

/** White level over the screen at scene ms (0 outside a cut's decay). */
function flashAt(apps, ms) {
	const ai = appIndex(apps, ms);
	const app = apps[ai];
	const u = (ms - app.at) / FMS;
	if (ai === 0 || app.flash == null || u >= 13) return 0;
	return u < 1 ? app.flash + (0.6 - app.flash) * Math.max(0, u) : tab(FLASH, u);
}

/** The flash is screen footage, so it covers everything inside the bezel (incl. the island). */
function FlashLayer({ level, inset = 0, radius = 0 }) {
	if (level <= 0.001) return null;
	return (
		<div
			style={{
				position: "absolute",
				inset,
				borderRadius: radius,
				background: rgbs(Q.white),
				opacity: level,
			}}
		/>
	);
}

function ScreenContent({ apps, ms, labelSize = 13 }) {
	const app = apps[appIndex(apps, ms)];
	return <ScreenSlot label={app.slot ?? ""} face={app.face ?? null} labelSize={labelSize} />;
}

// ── juniper-phone-comp ──────────────────────────────────────────────────────

// Whip-out to the right, u = frames from the exit anchor (f585). Phone centre x
// (ink bbox, rest 823.5): f585 +2.5, +7, +16, +29, +48, +75.5, +116 (f591), then
// extrapolated on the measured x1.55/frame ratio (left edge 1105 at f594, gone by
// f596). Height 670 -> 668, 664, 660, 654, 645, 631, 611, 577 (f593): scale about
// the phone centre. Visible ghosting from f592 (opacity). H-smear: sharp at f588 (13 px/f),
// soft at f591 (40 px/f), icons still legible at f593: sigma ~0.09 x (speed - 8).
const EXIT_DX = [
	[-2, 0],
	[-1, 0.5],
	[0, 2.5],
	[1, 7],
	[2, 16],
	[3, 29],
	[4, 48],
	[5, 75.5],
	[6, 116],
	[7, 180],
	[8, 280],
	[9, 430],
	[10, 650],
	[11, 900],
];
const EXIT_SCALE = [
	[0, 1],
	[1, 0.997],
	[2, 0.991],
	[3, 0.985],
	[4, 0.976],
	[5, 0.963],
	[6, 0.942],
	[7, 0.912],
	[8, 0.861],
	[9, 0.8],
	[10, 0.74],
];
const EXIT_OP = [
	[6, 1],
	[7, 0.85],
	[8, 0.6],
	[9, 0.35],
	[10, 0.1],
	[11, 0],
];

// Rim cross-section measured at f240/f300/f450 (outside -> in, 1 px steps): copper
// [196,112,75] -> [247,166,121] -> highlight [255,200,165] -> [174,136,117] ->
// dark brown [74,52,41] -> [42,31,27] -> black bezel. The shared PhoneFrame rim is
// a flat diagonal gradient; this overlay adds the inner highlight line and the
// brown inner lip on top of it (local; see the report).
const RIM = { rim: [206, 124, 84], hi: [236, 160, 116], lo: [186, 108, 72] };

function RimProfile({ w }) {
	const R = w * 0.168;
	const ring = (inset, width, colour) => (
		<div
			style={{
				position: "absolute",
				inset,
				borderRadius: R - inset,
				border: `${width}px solid ${colour}`,
				pointerEvents: "none",
			}}
		/>
	);
	return (
		<>
			{ring(2.6, 2, "rgba(255,204,166,0.95)")}
			{ring(4.8, 2.2, "rgba(96,64,48,0.95)")}
		</>
	);
}

function renderPhoneComp(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const w = cfg.width ?? 326;
	const h = w * (670 / 326);
	// settle drift carried over from the whip-in: rim x 659.7 (f234) -> 661.5 (f300)
	// -> 662.6 (f348) -> 663.0 (f396) -> 663.3 (f468+): exponential, tau ~80 frames.
	const drift = cfg.drift ?? { amp: 3.6, tau: 80 };
	const uf = ms / FMS;
	const x0 = (cfg.x ?? 658) + drift.amp * (1 - Math.exp(-uf / drift.tau));
	const y0 = cfg.y ?? 25;
	let dx = 0;
	let sc = 1;
	let op = 1;
	let bl = 0;
	if (cfg.exitAt != null) {
		const u = (ms - cfg.exitAt) / FMS;
		dx = tab(EXIT_DX, u);
		sc = tab(EXIT_SCALE, u);
		op = tab(EXIT_OP, u);
		bl = Math.max(0, speed(EXIT_DX, u) - 8) * 0.09;
	}
	if (op <= 0.001) return null;
	const apps = cfg.apps ?? [{ at: 0, slot: "product UI" }];
	return (
		<div style={{ position: "absolute", inset: 0, opacity: op }}>
			<MotionBlur id={`${cfg.id ?? "s3p"}-hb`} sx={bl}>
				<div
					style={{
						position: "absolute",
						left: x0 + dx,
						top: y0,
						width: w,
						height: h,
						transform: `scale(${sc.toFixed(4)})`,
						transformOrigin: "50% 50%",
					}}
				>
					<PhoneFrame width={w} shadow={false} rim={RIM.rim} rimHi={RIM.hi} rimLo={RIM.lo}>
						<ScreenContent apps={apps} ms={ms} />
					</PhoneFrame>
					<RimProfile w={w} />
					{/* white flash measured at f413: rim 663-667, dark lip to 674, white from 675 (inset 12) */}
					<FlashLayer level={flashAt(apps, ms)} inset={w * 0.038} radius={w * (0.168 - 0.038)} />
				</div>
			</MotionBlur>
		</div>
	);
}

// ── juniper-watch-comp ──────────────────────────────────────────────────────

// Entry in place behind the departing phone, u = frames from the entry anchor
// (f592). Display-centre luminance gives opacity 0 (f591), .19, .40, .60, .80, 1.0
// (f596) — a linear ramp. Ink bbox stays centred at x849.5–850 while its half-width
// grows 124,135,148,157,163,167,170,171.5,173,174 (f592..f601) and height 535 ->
// 575: scale .71,.78,.85,.90,.93,.955,.975,.985,.99,.995 -> 1 by f604.
const ENTER_OP = [
	[-1, 0],
	[0, 0.2],
	[1, 0.4],
	[2, 0.6],
	[3, 0.8],
	[4, 1],
];
const ENTER_SCALE = [
	[0, 0.71],
	[1, 0.78],
	[2, 0.85],
	[3, 0.9],
	[4, 0.93],
	[5, 0.955],
	[6, 0.975],
	[7, 0.985],
	[8, 0.99],
	[9, 0.995],
	[10, 0.997],
	[12, 1],
];
const ENTER_BLUR = [
	[0, 3],
	[1, 2],
	[2, 1.2],
	[3, 0.6],
	[4, 0],
];

function renderWatchComp(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	let op = 1;
	let sc = 1;
	let bl = 0;
	if (cfg.enterAt != null) {
		const u = (ms - cfg.enterAt) / FMS;
		if (u < -1) return null;
		op = tab(ENTER_OP, u);
		sc = tab(ENTER_SCALE, u);
		bl = tab(ENTER_BLUR, u);
	}
	if (op <= 0.001) return null;
	const x = cfg.x ?? 676;
	const y = cfg.y ?? 72;
	const ox = (cfg.originX ?? 850) - x;
	const oy = (cfg.originY ?? 359.5) - y;
	const id = cfg.id ?? "s3w";
	const apps = cfg.apps ?? [{ at: 0, slot: "product UI" }];
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: ULTRA.w,
				height: ULTRA.h,
				opacity: op,
				transform: `scale(${sc.toFixed(4)})`,
				transformOrigin: `${ox}px ${oy}px`,
				filter: bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none",
			}}
		>
			<UltraWatch id={id}>
				<ScreenContent apps={apps} ms={ms} />
				<FlashLayer level={flashAt(apps, ms)} />
			</UltraWatch>
		</div>
	);
}

export const S3_PRESETS = {
	"juniper-side-label": {
		note: "Kinetic side label of the phone/watch comps: a regular sub-label centred over a right-aligned semibold 'for [glyph] Device' line. App cuts roll-crossfade the sub-label (old rises + fades, new rises in from +23 px; measured f405–f423); device morphs roll the device word vertically inside a clip window with motion smear while 'for'+glyph re-align (measured f586–f603). Times are scene-relative ms anchors.",
		nativeMs: 17300,
		params: {
			lead: ["string", "for", "lead word"],
			words: [
				"array",
				"[{at:0,text:'Phone'},{at:11967,text:'Watch'}]",
				"device words; at = roll anchor (old -33 px / new +44 px)",
			],
			subs: ["array", "[{at:0,text:'...'}]", "sub-labels; at = crossfade anchor (both at ~55%)"],
			right: ["number", 620, "main-line ink right edge (px)"],
			baseline: ["number", 384, "main-line baseline (px)"],
			subBaseline: ["number", 315.5, "sub-label baseline (px)"],
			subCx: ["number", 442.5, "sub-label centre x when subAlign is 'fixed'"],
			subAlign: ["string", "fixed", "'fixed' (reference) or 'line' (centre over the main line)"],
			size: ["number", 67, "main font size (ink: iPhone 198 px wide, ascender 49 px)"],
			subSize: ["number", 25, "sub font size"],
		},
		render: renderSideLabel,
	},
	"juniper-phone-comp": {
		note: "Phone comp: shared PhoneFrame (no shadow — the reference has none) at x658,y25 (326x670) with the whip-in's residual settle drift (+3.6 px, tau 80 frames), slot hard cuts each with a white screen flash decaying over ~12 frames, and the accelerating whip-out right (scale 1 -> .86, fade from +7 frames, horizontal smear) anchored at exitAt.",
		nativeMs: 12100,
		params: {
			x: ["number", 658, "frame left at the scene start (px)"],
			y: ["number", 25, "frame top (px)"],
			width: ["number", 326, "frame width"],
			apps: [
				"array",
				"[{at:0,slot,face},{at,slot,face,flash:1}]",
				"slot contents; at = cut (scene ms); flash = white level on the cut frame",
			],
			exitAt: ["number", null, "scene ms of the whip-out anchor (f585)"],
		},
		render: renderPhoneComp,
	},
	"juniper-watch-comp": {
		note: "Watch comp: the measured UltraWatch (juniper-shared.jsx) (bezel ring, tapered woven band, lugs, crown guard, orange action button) at ink bbox x676–1024, y72–647; enters in place (linear fade over 5 frames + scale .71 -> 1 about its centre, soft blur) at enterAt; slot hard cuts with the white screen flash.",
		nativeMs: 5400,
		params: {
			x: ["number", 676, "ink bbox left (px)"],
			y: ["number", 72, "ink bbox top (px)"],
			apps: ["array", "[{at,slot,face,flash}]", "slot contents"],
			enterAt: ["number", null, "scene ms of the entry anchor (f592)"],
		},
		render: renderWatchComp,
	},
};
