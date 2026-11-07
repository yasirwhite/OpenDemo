/**
 * maple-s6.jsx — section s6 presets (f691-f899, 23033-30000 ms): the brand
 * close. One continuous beat on black, so one preset owns it end to end (the
 * cursor runs through every phase and must not hand over between scenes).
 *
 * Measured on the reference's full-decode frames (30 fps clock, stage px):
 *   f691       cut to black: only the arrow cursor, tip (639,369), 55 px box.
 *   f692-f715  the lockup GROWS out of the cursor point: an alt-drag resize
 *              about the box centre (639.25,359.5). Scale is a pure
 *              exponential from f691: s = 1 - 0.79^(f-691) (box width incl.
 *              handles 295,339,370,395,415,430 ... at f695-f700, remaining
 *              to rest x0.79 every frame). The cursor rides the br handle
 *              (tip = br + (0, 12(1-s) - 2.5)) and is PRESSED (55 -> 47 px)
 *              f692-f721, released f722-f723. Box line and handles do not
 *              scale (screen-space chrome).
 *   rest       box line x398-880.5, y321.5-397.5; logo x400-466, y323-390;
 *              "Quiver" ink x502-792, cap 65 (Q 326-391), x-height 50,
 *              baseline 391; light "A" x796-852; the "I" is an I-BEAM
 *              (slab ends) x857-879, y323-391, taller than the caps.
 *              Selection tint over the box: black -> [2,15,23], white ->
 *              [230,245,252] = rgba(select, 0.105) on top of the content.
 *              Box line ~[60,112,158] 1.5-2 px; handles ~7 px white,
 *              blue edge; tl tm tr bl br (tm only while the box is wide:
 *              hidden at <= 237 px, shown at >= 300).
 *   guides     dashed (on ~6, off ~4.6 px), ~2 px, ~[80,121,150]:
 *              horizontal y359.5 from x0 toward the box's left edge,
 *              vertical x640 from y0 toward the box's top edge. They DRAW ON
 *              from the frame edges f692-f708 on the grow's exponential (h
 *              end x 79,146,199,239,271,297 ... ; v end y 55,111,155,189 ...),
 *              reaching the box ~f706-f708. ERASE from the far end inward,
 *              accelerating: h start
 *              x 8,40,83,147,223,339 f716-f721 (ease-in ~p^1.6 over
 *              f715.5-f721.8), v start y 44,110,200 f719-f721 (f718-f721.8).
 *   f725-f734  cursor (released) slides up the right edge from the br handle
 *              to mid-right: tip y 397,393,388,381,374,369,366,364,362,361
 *              (f725-f734, in-out).
 *   f749-f750  press (55 -> 47 px).
 *   f751-f765  COLLAPSE: the cursor drags the right edge in; both edges move
 *              (left 398 -> 601, right 880.5 -> 669.5; centre drifts 639.25
 *              -> 635.25); content is anchored to the box's LEFT edge and
 *              cropped by its right edge, so the logo slides right while the
 *              wordmark is erased. Width remaining x0.635 per frame from
 *              f750.95 (expo-out): 415,403,251,158,102,66,42,27,17,10,6 ...
 *   f766-f775  release, then the cursor drops to (676,441) (in-out; y
 *              361,362,365,372,386,409,427,436,440,441).
 *   f782       deselect = a click on empty canvas (cursor pressed f782, up
 *              by f784): box at ~40% for one frame, tint off; gone f783.
 *              Logo now pure white.
 *   f783-f788  url types on, left-anchored at its final centred position
 *              (x559-721, x-height 430-446, baseline 446): Consolas-class
 *              mono, advance 18.5 px (-> ~33.6 px Consolas), white. Glyphs
 *              pop up from small on the baseline; times decelerate (q u i
 *              by f784, v e r by f785, a f787, i f788).
 *   f793-f800  cursor exits down-right, accelerating x1.68 per frame
 *              (tip 677,443 -> 820,648; gone f801).
 *   f802-f888  dead-still hold.
 *   f889       HARD CUT to pure black [0,0,0] to the end (source frame 1778
 *              is the first all-zero frame): a real beat, not encode noise.
 *              The scene ends there and the ground goes to [0,0,0].
 */
import { clamp01, easeByName, lerp } from "../../../src/lib/textcards/src/easing.js";
import {
	ArrowCursor,
	CURSOR_CAL,
	GEO,
	MapleLogo,
	MONO,
	Q,
	rgbs,
	SelectionBox,
} from "./maple-shared.jsx";

const FONT_LIGHT = `"Segoe UI Light", "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif`;
// ArrowCursor's black edge eats into its white fill (round joins at acute
// tips), so on black only ~15.15 of its 24 units read as white and the white
// tip sits (2.46, 2.05) units inside the path tip (measured on our render).
// The reference's white cursor is 55 px (f691, f740, f791). Sizes here are
// VISIBLE white extents (calibration shared as CURSOR_CAL).
const CURSOR_WHITE_UNITS = CURSOR_CAL.whiteUnits;
const CURSOR_TIP_INSET = CURSOR_CAL.tipInset;
const inOut = easeByName("inout", 3, (x) => x);
const outQ = easeByName("out", 2, (x) => x);

// Text metrics through a shared 2D canvas (system fonts, so deterministic).
const metricCache = new Map();
function ctx2d() {
	if (!globalThis.__mapleS6Ctx)
		globalThis.__mapleS6Ctx = document.createElement("canvas").getContext("2d");
	return globalThis.__mapleS6Ctx;
}
/** Ink depth below the baseline (descenders), px. */
function descent(font, text) {
	const key = `d|${font}|${text}`;
	if (!metricCache.has(key)) {
		const c = ctx2d();
		c.font = font;
		metricCache.set(key, Math.max(0, c.measureText(text).actualBoundingBoxDescent));
	}
	return metricCache.get(key);
}
function advance(font, text) {
	const key = `a|${font}|${text}`;
	if (!metricCache.has(key)) {
		const c = ctx2d();
		c.font = font;
		metricCache.set(key, c.measureText(text).width);
	}
	return metricCache.get(key);
}
/** Font px whose cap height (H ascent) is `cap` px. */
function sizeForCap(weight, family, cap) {
	const key = `c|${weight}|${family}`;
	if (!metricCache.has(key)) {
		const c = ctx2d();
		c.font = `${weight} 100px ${family}`;
		metricCache.set(key, c.measureText("H").actualBoundingBoxAscent / 100);
	}
	return cap / metricCache.get(key);
}
/** Font px whose monospace advance is `adv` px. */
function sizeForAdvance(family, adv) {
	return (adv * 100) / advance(`400 100px ${family}`, "0");
}

/** The lockup's I-beam "I" (f720: 22 x 69 px, slab ends, ~3.5 px stem). */
function IBeamGlyph({ x, top, w, h, sw, colour }) {
	return (
		<path
			d={`M${x} ${top + sw / 2}H${x + w}M${x + w / 2} ${top + sw / 2}V${top + h - sw / 2}M${x} ${top + h - sw / 2}H${x + w}`}
			stroke={rgbs(colour)}
			strokeWidth={sw}
			fill="none"
		/>
	);
}

/** A dashed guide whose dash phase is pinned to the frame edge it runs from,
 * so erasing it from the far end never makes the dashes crawl. */
function DashGuide({ horizontal = false, at, from, to, colour, width, dash }) {
	if (to - from < 0.5) return null;
	const d = horizontal ? `M${from} ${at}H${to}` : `M${at} ${from}V${to}`;
	return (
		<path
			d={d}
			stroke={rgbs(colour)}
			strokeWidth={width}
			strokeDasharray={dash.join(" ")}
			strokeDashoffset={-from}
			fill="none"
		/>
	);
}

/** Every default is a measurement (see the header); rf = frames after f691. */
const BRAND_CLOSE_DEFAULTS = {
	name: "Maple",
	suffix: "AI",
	ibeam: "replace-I",
	url: "maple.example",
	colour: Q.pure,
	urlColour: [250, 252, 250],
	capPx: 65,
	suffixWeight: 300,
	logoPx: 67,
	logoTop: 323,
	logoGap: 36,
	suffixGap: 1,
	beamGap: 3,
	beamW: 22,
	beamH: 68,
	beamStroke: 3.4,
	padL: 2,
	padR: 1.5,
	padRCollapsed: -3.5,
	baseline: 391,
	boxTop: 321.5,
	boxH: 76,
	descPad: 3,
	cx: 639.25,
	endShiftX: -4,
	boxColour: [80, 138, 200],
	boxLine: 1.4,
	handlePx: 13,
	tmMinWidth: 260,
	tintAlpha: 0.105,
	guideColour: [74, 116, 160],
	guideWidth: 1.8,
	guideDash: [6, 4.6],
	guideX: 640,
	hEraseFrom: 24.5,
	vEraseFrom: 27,
	eraseTo: 30.8,
	guideErasePow: 1.6,
	guideLagH: 1.015,
	guideLagV: 1.05,
	growBase: 0.79,
	collapseAt: 59.95,
	collapseBase: 0.635,
	deselectAt: 91,
	cursorPx: 55,
	pressedScale: 0.855,
	cursorLag: 12,
	release1: 31,
	slideFrom: 32.5,
	slideTo: 42.5,
	press2: 58,
	release2: 75,
	dropTo: 84,
	restTip: [676, 441],
	exitFrom: 101.6,
	exitA: 3.2,
	exitBase: 1.68,
	exitSlope: 1.44,
	urlAdvance: 18.5,
	// the reference's mono is a touch lighter than Consolas Regular (stem
	// ~3.0 vs ~3.3 px at f850): a ground-coloured stroke over the fill thins
	// each stem (1.2 read too thin on the assembled film: ink 545 vs 864)
	urlThin: 0.5,
	urlThinColour: Q.black,
	urlCx: 640,
	urlBaseline: 446,
	typeFrom: 92.3,
	typeFramesPer8: 4.3,
	typePow: 1.6,
	popFrames: 1.6,
	popFrom: 0.35,
};

function brandClose(cfg, t) {
	const ms = t * 1000 - cfg.startMs;
	if (ms < 0 || ms >= cfg.durationMs) return null;
	const rf = (ms * 30) / 1000; // scene-relative frames (rf 0 = f691)
	const p = { ...BRAND_CLOSE_DEFAULTS, ...cfg };
	const ink = p.colour;

	// ── lockup layout (rest, unscaled stage px, x relative to the box's left) ──
	const nameSize = sizeForCap(700, GEO, p.capPx);
	const nameFont = `700 ${nameSize.toFixed(2)}px ${GEO}`;
	const sufSize = sizeForCap(p.suffixWeight, FONT_LIGHT, p.capPx);
	const sufFont = `${p.suffixWeight} ${sufSize.toFixed(2)}px ${FONT_LIGHT}`;
	const suffix = p.suffix ?? "";
	const ibeamAsI = p.ibeam === "replace-I" && suffix.endsWith("I");
	const sufText = ibeamAsI ? suffix.slice(0, -1) : suffix;
	const showBeam = p.ibeam === "after" || (p.ibeam === "replace-I" && ibeamAsI);
	const nameX = p.padL + p.logoPx + p.logoGap;
	const nameW = advance(nameFont, p.name);
	const sufX = nameX + nameW + p.suffixGap;
	const sufW = sufText ? advance(sufFont, sufText) : 0;
	const beamX = sufX + sufW + (sufText ? p.beamGap : 0);
	const W0 = (showBeam ? beamX + p.beamW : sufX + sufW) + p.padR;
	const Wf = p.padL + p.logoPx + p.padRCollapsed;
	const cx0 = p.cx;
	// the box hugs the ink: 6.5 px under the baseline in the reference (no
	// descenders in "Quiver"); a name with descenders pushes the bottom down
	const below = Math.max(descent(nameFont, p.name), sufText ? descent(sufFont, sufText) : 0);
	const boxH = Math.max(p.boxH, p.baseline + below + p.descPad - p.boxTop);
	const cy = p.boxTop + boxH / 2;

	// ── grow (f692-f715) and collapse (f751-f765) ──
	const s = rf <= 0 ? 0 : 1 - p.growBase ** rf;
	const g = rf < p.collapseAt ? 1 : p.collapseBase ** (rf - p.collapseAt);
	const W = Wf + (W0 - Wf) * g;
	const cxNow = cx0 + p.endShiftX * (1 - g);
	const L = cxNow - W / 2; // rest-space box left
	// screen-space box (the grow scales about (cx0, cy); chrome stays 1:1)
	const bx = cx0 + s * (L - cx0);
	const bw = s * W;
	const by = cy + s * (p.boxTop - cy);
	const bh = s * boxH;
	const R = bx + bw;
	const deselected = rf >= p.deselectAt;
	const boxAlpha = rf < p.deselectAt - 0.5 ? 1 : rf < p.deselectAt + 0.6 ? 0.4 : 0;
	const tint = rf < p.deselectAt - 0.5;
	const showLockup = s > 0.02;

	// ── guides: DRAW ON from the frame edges f692-f708 on the grow's own
	// exponential (h end x 79,146,199,239,271 ... = 398 * (1 - 1.015*0.79^rf);
	// v end y 55,111,155,189 ... = 321.5 * (1 - 1.05*0.79^rf)), stopping at
	// the box edge; then ERASE from the far end f716-f722 (ease-in) ──
	const ghEnd = Math.min(bx, (cx0 - W / 2) * (1 - p.guideLagH * p.growBase ** rf));
	const gvEnd = Math.min(by, p.boxTop * (1 - p.guideLagV * p.growBase ** rf));
	const eIn = easeByName("in", p.guideErasePow, (x) => x);
	const hp = eIn(clamp01((rf - p.hEraseFrom) / (p.eraseTo - p.hEraseFrom)));
	const vp = eIn(clamp01((rf - p.vEraseFrom) / (p.eraseTo - p.vEraseFrom)));

	// ── cursor: press / release and the tip path ──
	const ramp = (a, b) => clamp01((rf - a) / (b - a));
	let pr;
	if (rf < p.release1) pr = ramp(0.4, 1);
	else if (rf < p.press2) pr = 1 - ramp(p.release1, p.release1 + 1.2);
	else if (rf < p.release2) pr = ramp(p.press2, p.press2 + 1);
	else if (rf < p.deselectAt - 0.5) pr = 1 - ramp(p.release2, p.release2 + 1);
	// the deselect is a click on empty canvas: pressed f782, back up over f783-f784
	else
		pr =
			ramp(p.deselectAt - 0.5, p.deselectAt) * (1 - ramp(p.deselectAt + 0.8, p.deselectAt + 1.8));
	const cSize = p.cursorPx * (1 - (1 - p.pressedScale) * pr);
	const brx = R;
	const bry = by + bh;
	let tip;
	if (rf < p.release1) {
		tip = [brx, bry + p.cursorLag * (1 - s) - 2.5];
	} else if (rf < p.slideFrom) {
		const k = ramp(p.release1, p.release1 + 2);
		tip = [brx + 3.5 * k, bry - 2.5 + k];
	} else if (rf < p.press2) {
		const k = inOut(ramp(p.slideFrom, p.slideTo));
		tip = [lerp(brx + 3.5, brx + 4.5, k), lerp(bry - 1.5, cy + 1.5, k)];
	} else if (rf < p.release2) {
		const k = ramp(p.press2, p.press2 + 1);
		tip = [lerp(R + 4.5, R + 1.5, k), lerp(cy + 1.5, cy - 1, k) + 2.5 * (1 - g)];
	} else {
		const k = inOut(ramp(p.release2 + 0.5, p.dropTo));
		tip = [lerp(R + 1.5, p.restTip[0], k), lerp(cy + 1.5, p.restTip[1], k)];
		if (rf > p.exitFrom) {
			const d = p.exitA * (p.exitBase ** (rf - p.exitFrom) - 1);
			tip = [tip[0] + d, tip[1] + d * p.exitSlope];
		}
	}

	// ── url type-on (f783-f788), left-anchored at its final centred spot ──
	const url = p.url ?? "";
	const urlSize = sizeForAdvance(MONO, p.urlAdvance);
	const urlFont = `400 ${urlSize.toFixed(2)}px ${MONO}`;
	const urlX0 = p.urlCx - advance(urlFont, url) / 2;
	const n = url.length;
	const typeDur = (p.typeFramesPer8 * Math.max(1, n - 1)) / 8;
	const glyphs = [];
	for (let i = 0; i < n; i++) {
		const at =
			p.typeFrom +
			(Array.isArray(p.typeAt) && p.typeAt[i] != null
				? p.typeAt[i]
				: typeDur * (n > 1 ? (i / (n - 1)) ** p.typePow : 0));
		if (rf < at) continue;
		const sc = lerp(p.popFrom, 1, outQ(clamp01((rf - at) / p.popFrames)));
		const x = urlX0 + advance(urlFont, url.slice(0, i));
		const ox = x + advance(urlFont, url[i]) / 2;
		const yb = p.urlBaseline;
		glyphs.push(
			<text
				key={i}
				x={x}
				y={yb}
				transform={
					sc < 1
						? `translate(${ox} ${yb}) scale(${sc.toFixed(4)}) translate(${-ox} ${-yb})`
						: undefined
				}
				style={{
					font: urlFont,
					fill: rgbs(p.urlColour),
					stroke: p.urlThin > 0 ? rgbs(p.urlThinColour) : undefined,
					strokeWidth: p.urlThin > 0 ? p.urlThin : undefined,
				}}
			>
				{url[i]}
			</text>,
		);
	}

	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden", willChange: "transform" }}>
			{showLockup ? (
				<div
					style={{
						position: "absolute",
						inset: 0,
						transform: `scale(${s.toFixed(5)})`,
						transformOrigin: `${cx0}px ${cy}px`,
					}}
				>
					<div
						style={{
							position: "absolute",
							left: L,
							top: 0,
							width: W,
							height: 720,
							overflow: "hidden",
						}}
					>
						<MapleLogo
							size={p.logoPx}
							colour={deselected ? Q.pure : ink}
							style={{ position: "absolute", left: p.padL, top: p.logoTop }}
						/>
						{g > 0.002 ? (
							<svg
								width={W0 + 40}
								height={720}
								textRendering="geometricPrecision"
								style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
							>
								<text x={nameX} y={p.baseline} style={{ font: nameFont, fill: rgbs(ink) }}>
									{p.name}
								</text>
								{sufText ? (
									<text x={sufX} y={p.baseline} style={{ font: sufFont, fill: rgbs(ink) }}>
										{sufText}
									</text>
								) : null}
								{showBeam ? (
									<IBeamGlyph
										x={beamX}
										top={p.baseline - p.beamH}
										w={p.beamW}
										h={p.beamH}
										sw={p.beamStroke}
										colour={ink}
									/>
								) : null}
							</svg>
						) : null}
						{tint ? (
							<div
								style={{
									position: "absolute",
									left: 0,
									top: p.boxTop,
									width: W,
									height: boxH,
									background: rgbs(p.boxColour, p.tintAlpha),
								}}
							/>
						) : null}
					</div>
				</div>
			) : null}
			{showLockup && (hp < 1 || vp < 1) ? (
				<svg width={1280} height={720} style={{ position: "absolute", left: 0, top: 0 }}>
					<DashGuide
						horizontal
						at={cy}
						from={lerp(0, bx, hp)}
						to={ghEnd}
						colour={p.guideColour}
						width={p.guideWidth}
						dash={p.guideDash}
					/>
					<DashGuide
						at={p.guideX}
						from={lerp(0, by, vp)}
						to={gvEnd}
						colour={p.guideColour}
						width={p.guideWidth}
						dash={p.guideDash}
					/>
				</svg>
			) : null}
			{showLockup && boxAlpha > 0 ? (
				<SelectionBox
					x={bx}
					y={by}
					w={bw}
					h={bh}
					colour={p.boxColour}
					line={p.boxLine}
					handle={p.handlePx}
					handles={bw >= p.tmMinWidth ? ["tl", "tm", "tr", "bl", "br"] : ["tl", "tr", "bl", "br"]}
					handleFill={boxAlpha < 1 ? [150, 150, 150] : Q.pure}
					opacity={boxAlpha}
				/>
			) : null}
			{glyphs.length ? (
				<svg
					width={1280}
					height={720}
					textRendering="geometricPrecision"
					style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
				>
					{glyphs}
				</svg>
			) : null}
			{tip[1] < 760 && tip[0] < 1320 ? (
				<div
					style={{
						position: "absolute",
						left: tip[0] - CURSOR_TIP_INSET[0] * (cSize / CURSOR_WHITE_UNITS),
						top: tip[1] - CURSOR_TIP_INSET[1] * (cSize / CURSOR_WHITE_UNITS),
						transform: `scale(${(cSize / CURSOR_WHITE_UNITS).toFixed(4)})`,
						transformOrigin: "0 0",
					}}
				>
					<ArrowCursor x={0} y={0} size={24} shadow={false} />
				</div>
			) : null}
		</div>
	);
}

export const S6_PRESETS = {
	"maple-brand-close": {
		note: "maple's closer on black (f691-f888): cursor alone, then the [MapleLogo] Name+suffix lockup grows out of the cursor point (alt-drag resize about the box centre, pure exponential x0.79/frame) inside a selection box with dashed construction guides that erase from the frame edge inward; hold; the cursor drags the box's right edge in (expo-out x0.635/frame), cropping the wordmark until only the logo is selected; deselect; the url types on under the logo with popping glyphs; the cursor falls away and the end card holds dead still. End the scene on the hard cut to black (f889). Name/suffix/url reflow (canvas-measured); the suffix's final 'I' is drawn as an I-beam (ibeam 'replace-I'), or append one ('after'), or 'none'.",
		nativeMs: 6600,
		params: {
			name: ["string", "Maple", "bold geometric name (Century Gothic 700, cap 65 px)"],
			suffix: ["string", "AI", "light suffix (Segoe UI Light); '' for none"],
			ibeam: ["string", "replace-I", "'replace-I' | 'after' | 'none'"],
			url: ["string", "maple.example", "end-card url, monospace, advance 18.5 px"],
			capPx: ["number", 65, "cap height of name and suffix"],
			logoPx: ["number", 67, "MapleLogo box px"],
			endShiftX: ["number", -4, "collapsed box centre vs the lockup centre (ref drifts 4 px left)"],
			growBase: ["number", 0.79, "remaining scale kept per frame during the grow"],
			collapseBase: ["number", 0.635, "remaining width kept per frame during the collapse"],
			deselectAt: ["number", 91, "frames after scene start of the deselect (f782)"],
			typeAt: [
				"array",
				"null",
				"optional per-glyph offsets (frames) from typeFrom; ref 'quiver.ai' = [0,0.3,0.7,1.05,1.4,1.7,2.5,3.3,4.3]",
			],
			typeFrom: ["number", 92.3, "first glyph of the url (frames after start)"],
		},
		render: brandClose,
	},
};
