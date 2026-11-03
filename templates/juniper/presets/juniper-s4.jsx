/**
 * juniper-s4.jsx — section 4 presets.
 * Range: 25.1 – 36.133s (f753–f1083 on the 30fps clock): watch -> tablet,
 * tablet x2, tablet -> TV, TV, TV -> headset window, headset pull-back.
 *
 * Every number below was measured on the full-decode reference frames
 * (ref/f720/fNNNNN.jpg, frame n = n/30 s, stage px = ref px / 1.5); the
 * per-frame tables are sampled one entry per 30fps frame from the transition's
 * first frame `k0` and interpolated linearly between frames. Notes and the raw
 * traces are in .demo-build/nightly/2026-11-03/juniper/sections/s4/notes.md.
 *
 * Two presets:
 *   juniper-device-label  the kinetic device label ("sub-label / for [glyph] Device"):
 *                         side -> top-centre travel, device-word roll (clipped,
 *                         vertical motion blur), sub-label roll-crossfade.
 *   juniper-device-stage  the device frames and their morphs: watch whip-out,
 *                         tablet rise, recede (shrink + drop + fade), grow-in,
 *                         with per-app slot faces.
 * The watch is s3's measured UltraWatch (from juniper-shared.jsx, so the 25100 seam is
 * identical on both sides). Local tablet / TV / headset variants are drawn here
 * because the shared frames differ from the reference in ways that show: tablet
 * ring structure, and the shared frames' drop shadows (the reference has none
 * under any device).
 */
import React from "react";
// the seam watch is the measured UltraWatch (juniper-shared.jsx, s3's measurement), so
// both sides of 25100 draw the identical frame (our own trace of it is in notes.md)
import {
	FONT,
	Icon,
	live,
	PlatformGlyph,
	Q,
	rgbs,
	ScreenSlot,
	ULTRA,
	UltraWatch,
} from "./juniper-shared.jsx";

const FRAME_MS = 1000 / 30;

// ── per-frame curve tables ────────────────────────────────────────────────

/** Linear lookup in a per-frame table at fractional frame k (clamped). */
function tab(arr, k) {
	if (k <= 0) return arr[0];
	const n = arr.length - 1;
	if (k >= n) return arr[n];
	const i = Math.floor(k);
	return arr[i] + (arr[i + 1] - arr[i]) * (k - i);
}
/** Per-frame velocity (units / frame) of a table at fractional frame k. */
const vel = (arr, k) => tab(arr, k + 0.5) - tab(arr, k - 0.5);

/** Label curves (progress 0..1), one entry per 30fps frame from k0. */
const LABEL_CURVES = {
	// side -> top-centre travel of the whole label block, f753 (k0) .. f772:
	// "for" left edge 274 -> 494 and main baseline 384.5 -> 122.5 share one
	// curve (x and y progress agree to +-0.01 every frame) — accelerating over
	// 10 frames, decelerating over 9, midpoint at f763.
	travel: [
		0, 0.004, 0.008, 0.019, 0.03, 0.061, 0.106, 0.167, 0.255, 0.373, 0.5, 0.684, 0.798, 0.867,
		0.916, 0.947, 0.97, 0.985, 0.996, 1,
	],
	// device-word roll, iPad -> TV (k0 f926 .. f942): the old word rises out of a
	// clipped slot while the new one rises in one line pitch (78 px) below it.
	// Old word offset 0,-1,-2,-4,-7,-13,-22,-36 ... new word +23 at f935 -> 0 f942.
	roll: [
		0, 0.013, 0.026, 0.05, 0.09, 0.17, 0.28, 0.46, 0.62, 0.76, 0.83, 0.885, 0.935, 0.96, 0.975,
		0.987, 1,
	],
	// Watch -> iPad roll rides the travel and is quicker (k0 f758): half-way at
	// f763 ("Watch" clipped at its top, "iPad" half in), "iPad" ~+8 px at f764.
	"roll-fast": [0, 0.02, 0.06, 0.12, 0.25, 0.5, 0.85, 0.95, 0.98, 1],
};

/**
 * Sub-label roll-crossfade (identical at f835, f925, f995 — the app change on
 * the tablet and both device morphs): the old sub rises with an accelerating
 * lift (top 36,35,35,34,33,31,28,24,17,8,2) and fades from k7; the new sub
 * appears at k7 ~28 px low and grey and settles up on a decelerating tail
 * (44,41,39,38,37,37,36 at k10..k16) while darkening to ink by k11.
 */
const SUB_OLD_DY = [0, -1, -1, -2, -3, -5, -8, -12, -19, -28, -34, -40];
const SUB_OLD_OP = [1, 1, 1, 1, 1, 1, 1, 0.89, 0.66, 0.47, 0.26, 0];
const SUB_NEW_DY = [36, 36, 36, 36, 36, 36, 36, 28, 20, 13, 8, 5, 3, 2, 1, 1, 0];
const SUB_NEW_OP = [0, 0, 0, 0, 0, 0, 0, 0.24, 0.45, 0.68, 0.95, 1];

/** Device move curves, one entry per 30fps frame from the move's k0. */
const DEVICE_CURVES = {
	// watch exit (k0 f753): band left edge 740,741,744,751,761,777,800,832,882,
	// 962,1089 -> accelerating ~1.5x per frame; it also sinks 0.083 px per px
	// (band top 73 -> 102 by f763). Width constant (pure translate), heavy
	// horizontal motion blur from f760; then ~110 px/frame while it fades out.
	"whip-right": {
		dx: [0, 1, 4, 11, 21, 37, 60, 92, 142, 222, 349, 460, 570, 680],
		dyPerDx: 0.083,
		// it also fades while it whips: display luminance gives opacity 0.88,
		// 0.68, 0.47 at f761-f763; a faint remnant at the right edge to f765
		op: [1, 1, 1, 1, 1, 1, 1, 1, 0.88, 0.68, 0.47, 0.3, 0.1, 0],
	},
	// tablet entry (k0 f761, invisible): left edge 407,378,340,312,295,284,277,
	// 272,267,265,263,262 from f762 -> scale about a point ~620 px below its
	// centre (centre-y offset tracks 600*(1-s)); opacity 0 -> 1 over f761-f767
	// (rim luminance 213,180,135,82,22,6 at f762-f767, blur-lightened).
	rise: {
		s: [0.55, 0.619, 0.695, 0.795, 0.869, 0.913, 0.942, 0.961, 0.974, 0.987, 0.992, 0.997, 1],
		dy: [270, 229, 189, 122, 78, 49, 32, 20, 11, 7, 3, 1, 0],
		op: [0, 0.2, 0.38, 0.56, 0.74, 0.9, 1],
	},
	// exit that recedes: shrinks and drops, accelerating, fading from k8 —
	// tablet f924 (k0) .. f936 (gone): width 760,758,752,746,734,720,698 then
	// ~658,596,524,468; centre-y +1,+4,+9,+19,+31,+50,+78,+122,+197,+286,+367.
	// The TV exit (k0 f994) follows the same table within 1%.
	recede: {
		s: [1, 0.997, 0.993, 0.986, 0.978, 0.962, 0.944, 0.915, 0.862, 0.78, 0.687, 0.614, 0.55],
		dy: [0, 1, 4, 9, 19, 31, 50, 78, 122, 197, 286, 367, 450],
		op: [1, 1, 1, 1, 1, 1, 1, 1, 0.75, 0.55, 0.38, 0.18, 0],
	},
	// TV entry (k0 f931, invisible): grows about its own centre (643,423),
	// width 556,640,754,844,894,928,950,964,976,982,986,989 from f932;
	// opacity 0.2/frame (sampled 0.20,0.40,0.60,0.80,1.0 at f932-f936).
	grow: {
		s: [0.48, 0.563, 0.647, 0.762, 0.853, 0.904, 0.938, 0.961, 0.975, 0.987, 0.993, 0.997, 1],
		dy: [0],
		op: [0, 0.2, 0.4, 0.6, 0.8, 1],
	},
	// headset window entry (k0 f1001): same grow from a larger start —
	// width 600,652,720,768,798,816,830,839,846,850,852,855 from f1002;
	// opacity 0.19,0.40,0.60,0.80,1.0 at f1002-f1006.
	"grow-window": {
		s: [0.63, 0.7, 0.763, 0.842, 0.898, 0.933, 0.954, 0.971, 0.981, 0.989, 0.994, 0.997, 1],
		dy: [0],
		op: [0, 0.2, 0.4, 0.6, 0.8, 1],
	},
};

const curveOf = (dict, c) => (typeof c === "string" ? dict[c] : c);

/**
 * The closing pull-back on the headset window (f1068 -> the f1084 cut): the
 * whole comp (window + label) scales about (643,361), accelerating —
 * window width 855,852,852,850,848,844,841,836,831,824,814,800,781 over
 * f1071-f1083, i.e. 1-s = 0.103 * p^3 across f1068-f1084. Drawn as a
 * composited layer (will-change) rather than through the scene `camera`:
 * a repainted, fractionally scaled subtree left 1-px ghost edges of earlier
 * frames on the ground when frames were rendered in sequence.
 * cfg.pullback: {fromMs, toMs, to, pow, originX, originY} (absolute ms).
 */
function withPullback(cfg, ms, node) {
	const pb = cfg.pullback;
	const p = pb ? Math.min(1, Math.max(0, (ms - pb.fromMs) / (pb.toMs - pb.fromMs))) : 0;
	const s = pb ? 1 - (1 - (pb.to ?? 1)) * p ** (pb.pow ?? 3) : 1;
	// no layer / transform at rest, so the static beats rasterise exactly like
	// the neighbouring sections' (the 25100 seam is pixel-identical with s3)
	const moving = s < 1;
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				willChange: moving ? "transform" : "auto",
				transform: moving ? `scale(${s.toFixed(5)})` : "none",
				transformOrigin: pb ? `${pb.originX ?? 640}px ${pb.originY ?? 360}px` : "50% 50%",
			}}
		>
			{node}
		</div>
	);
}

// ── directional blur (SVG filter on an HTML box) ──────────────────────────

/**
 * <Blurred id sx sy angle w h> — anisotropic Gaussian blur (motion blur).
 * Renders a w x h box centred on its parent's origin. `angle` (deg) rotates
 * the blur axis: the box is rotated, blurred along its own x, and the content
 * counter-rotated, so a diagonal move smears along its path.
 */
function Blurred({ id, sx = 0, sy = 0, angle = 0, w, h, children }) {
	const box = { position: "absolute", left: -w / 2, top: -h / 2, width: w, height: h };
	if (sx < 0.3 && sy < 0.3) return <div style={box}>{children}</div>;
	const rot = (a) => (a ? `rotate(${a.toFixed(3)}deg)` : "none");
	return (
		<>
			<svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
				<defs>
					<filter
						id={id}
						x="-0.25"
						y="-0.25"
						width="1.5"
						height="1.5"
						colorInterpolationFilters="sRGB"
					>
						<feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} />
					</filter>
				</defs>
			</svg>
			<div
				style={{ ...box, transform: rot(angle), transformOrigin: "50% 50%", filter: `url(#${id})` }}
			>
				<div
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						width: w,
						height: h,
						transform: rot(-angle),
						transformOrigin: "50% 50%",
					}}
				>
					{children}
				</div>
			</div>
		</>
	);
}

// ── text metrics (canvas; deterministic, no time dependence) ──────────────

let _ctx = null;
const metricCache = new Map();
function ctx2d() {
	if (!_ctx && typeof document !== "undefined")
		_ctx = document.createElement("canvas").getContext("2d");
	return _ctx;
}
/** Advance width of `text` in the juniper face, plus CSS letter-spacing `ls` px per glyph. */
function textW(text, weight, size, ls = 0) {
	const key = `w|${weight}|${size}|${ls}|${text}`;
	if (metricCache.has(key)) return metricCache.get(key);
	const c = ctx2d();
	let w = text.length * size * 0.55;
	if (c) {
		c.font = `${weight} ${size}px ${FONT}`;
		w = c.measureText(text).width;
	}
	w += ls * text.length;
	metricCache.set(key, w);
	return w;
}
/**
 * Segoe UI box -> ink calibration shared with s3's side label: with
 * line-height = font size the baseline sits BASE_EM x size below the line top.
 */
const BASE_EM = 0.914;

// ── juniper-device-label ──────────────────────────────────────────────────

/**
 * Measured layout (f753 side, f800 top): main line semibold, cap height 47 px
 * (font 67, tracking -0.015em); sub-label regular (font 25, as s3); the sub
 * baseline sits 68.5 px above the main baseline. Side layout = s3's at the
 * 25100 seam: main line right-aligned (box right 622 = ink 620 + bearing),
 * baseline 384, sub centred at x442.5. Top layout: block centred x~637 (sub
 * ink centres 638.5-639 on all four top-centre beats), baseline 122.5. Box
 * gaps "for" -> glyph 0.25em, glyph -> word 0.235em (ink gaps 18 / 20 px).
 * A layout is {cx | right, baseline, subCx?}.
 */
function DeviceLabelStage(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = t * 1000;
	const size = cfg.size ?? 67;
	const subSize = cfg.subSize ?? 25;
	const capH = size * (cfg.capRatio ?? 0.7);
	const subDrop = cfg.subDrop ?? 68.5; // main baseline -> sub baseline
	const ls = (cfg.tracking ?? -0.015) * size;
	const subLs = (cfg.subTracking ?? -0.005) * subSize;
	const pitch = cfg.pitch ?? 78;
	const clipTop = cfg.clipTop ?? 22;
	const clipBottom = cfg.clipBottom ?? 18;
	const layouts = cfg.layouts ?? {
		side: { right: 622, baseline: 384, subCx: 442.5 },
		top: { cx: 637, baseline: 122.5 },
	};
	const ink = cfg.colour ?? Q.ink;
	const lead = cfg.lead ?? "for";
	const gap1 = size * (cfg.gapGlyph ?? 0.25);
	const gap2 = size * (cfg.gapWord ?? 0.235);
	const glyphW = size * 0.58;

	const states = cfg.states ?? [];
	if (!states.length) return null;
	let layoutA = states[0].layout ?? "side";
	let layoutB = layoutA;
	let travelK0 = null;
	let travelCurve = LABEL_CURVES.travel;
	let word = { old: states[0].device, cur: states[0].device, k0: null, curve: LABEL_CURVES.roll };
	let sub = { old: states[0].sub, cur: states[0].sub, k0: null };
	for (let i = 1; i < states.length; i++) {
		const s = states[i];
		const at = s.atMs ?? 0;
		if (ms < at) break;
		if (s.layout && s.layout !== layoutB) {
			layoutA = layoutB;
			layoutB = s.layout;
			travelK0 = s.travelMs ?? at;
			travelCurve = curveOf(LABEL_CURVES, s.travelCurve ?? "travel");
		}
		if (s.device != null && s.device !== word.cur) {
			word = {
				old: word.cur,
				cur: s.device,
				k0: s.wordMs ?? at,
				curve: curveOf(LABEL_CURVES, s.wordCurve ?? "roll"),
			};
		}
		if (s.sub != null && s.sub !== sub.cur) sub = { old: sub.cur, cur: s.sub, k0: s.subMs ?? at };
	}

	const kOf = (k0) => (ms - k0) / FRAME_MS;
	// block travel (side -> top)
	const kt = travelK0 == null ? 0 : kOf(travelK0);
	const T = travelK0 == null ? 1 : tab(travelCurve, kt);
	// device-word roll
	const kw = word.k0 == null ? 0 : kOf(word.k0);
	const P = word.k0 == null ? 1 : tab(word.curve, kw);
	const dP = word.k0 == null ? 0 : vel(word.curve, kw);
	const wOld = textW(word.old ?? "", 600, size, ls);
	const wCur = textW(word.cur ?? "", 600, size, ls);
	const wFor = textW(lead, 600, size, ls);
	// the line re-aligns on the rolling width (left edge 494 -> 515 over the
	// iPad -> TV roll, following the roll curve)
	const W = wFor + gap1 + glyphW + gap2 + wOld + (wCur - wOld) * P;
	const LA = layouts[layoutA];
	const LB = layouts[layoutB];
	const cxOf = (L) => L.cx ?? L.right - W / 2;
	const cxA = cxOf(LA);
	const cxB = cxOf(LB);
	const cx = cxA + (cxB - cxA) * T;
	const base = LA.baseline + (LB.baseline - LA.baseline) * T;
	const subDxA = (LA.subCx ?? cxA) - cxA;
	const subDxB = (LB.subCx ?? cxB) - cxB;
	const subDx = subDxA + (subDxB - subDxA) * T;
	const dT = travelK0 == null ? 0 : vel(travelCurve, kt);
	const vx = (cxB - cxA) * dT;
	const vy = (LB.baseline - LA.baseline) * dT;
	const vTravel = Math.hypot(vx, vy);
	const left = -W / 2;
	const wordX = left + wFor + gap1 + glyphW + gap2;
	// sub roll
	const ks = sub.k0 == null ? 1e9 : kOf(sub.k0);

	const mainText = (txt, x, y, key) => (
		<div
			key={key}
			style={{
				position: "absolute",
				left: x,
				top: y - BASE_EM * size,
				font: `600 ${size}px ${FONT}`,
				lineHeight: `${size}px`,
				letterSpacing: `${ls}px`,
				whiteSpace: "nowrap",
				color: rgbs(ink),
			}}
		>
			{txt}
		</div>
	);
	const subText = (txt, dy, op, key) => (
		<div
			key={key}
			style={{
				position: "absolute",
				left: subDx - 500,
				width: 1000,
				top: -subDrop + dy - BASE_EM * subSize,
				textAlign: "center",
				font: `400 ${subSize}px ${FONT}`,
				lineHeight: `${subSize}px`,
				letterSpacing: `${subLs}px`,
				whiteSpace: "nowrap",
				color: rgbs(ink),
				opacity: op,
			}}
		>
			{txt}
		</div>
	);

	let subs;
	if (sub.k0 == null || ks >= SUB_NEW_DY.length - 1) subs = subText(sub.cur, 0, 1, "s");
	else if (ks < 0) subs = subText(sub.old, 0, 1, "s");
	else {
		const oo = tab(SUB_OLD_OP, ks);
		const no = tab(SUB_NEW_OP, ks);
		subs = (
			<>
				{oo > 0 ? subText(sub.old, tab(SUB_OLD_DY, ks), oo, "so") : null}
				{no > 0 ? subText(sub.cur, tab(SUB_NEW_DY, ks), no, "sn") : null}
			</>
		);
	}

	// device-word slot: clipped band [capTop - clipTop, baseline + clipBottom]
	const slotTop = -capH - clipTop;
	const slotH = capH + clipTop + clipBottom;
	const slotW = Math.max(wOld, wCur) + 40;
	const vWord = pitch * Math.abs(dP);
	const wordLayer = (
		<div
			style={{
				position: "absolute",
				left: wordX - 20,
				top: slotTop,
				width: slotW,
				height: slotH,
				overflow: "hidden",
			}}
		>
			<div style={{ position: "absolute", left: slotW / 2, top: -slotTop }}>
				<Blurred
					id={`${cfg.id ?? "s4l"}-w`}
					sy={(cfg.rollBlur ?? 0.2) * vWord}
					w={slotW}
					h={size * 5}
				>
					<div style={{ position: "absolute", left: 20, top: size * 2.5 }}>
						{P < 1 ? mainText(word.old, 0, -pitch * P, "o") : null}
						{P > 0 ? mainText(word.cur, 0, pitch * (1 - P), "n") : null}
					</div>
				</Blurred>
			</div>
		</div>
	);

	const block = (
		<>
			{subs}
			{mainText(lead, left, 0, "lead")}
			<div style={{ position: "absolute", left: left + wFor + gap1, top: -size * 0.66 }}>
				<PlatformGlyph size={size} colour={ink} />
			</div>
			{wordLayer}
		</>
	);

	const angle = vTravel > 0.5 ? (Math.atan2(vy, vx) * 180) / Math.PI : 0;
	return withPullback(
		cfg,
		ms,
		<div
			style={{
				position: "absolute",
				left: cx,
				top: base,
				willChange: T > 0 && T < 1 ? "transform" : "auto",
			}}
		>
			<Blurred
				id={`${cfg.id ?? "s4l"}-t`}
				sx={(cfg.travelBlur ?? 0.16) * vTravel}
				angle={angle}
				w={1000}
				h={1000}
			>
				<div style={{ position: "absolute", left: 500, top: 500 }}>{block}</div>
			</Blurred>
		</div>,
	);
}

// ── local device frames ───────────────────────────────────────────────────

/** Named slot faces (CSS backgrounds sampled from each app's mean colours). */
const FACES = {
	// watch retro 3D game (s3's face at the seam: navy sky over a brown floor)
	"watch-game":
		"linear-gradient(180deg, rgb(26,28,44) 0%, rgb(40,40,54) 45%, rgb(54,46,30) 75%, rgb(44,36,22) 100%)",
	// tablet notebook app (whiteboard) — screen [254,249,243]
	light: "rgb(254,249,243)",
	// AR planner camera view — mean [142,114,99], top [121,99,74], bottom [155,127,106]
	ar: "linear-gradient(180deg, rgb(121,99,74), rgb(142,113,92) 55%, rgb(160,134,114))",
	// TV movie picker — black with a maroon vignette at the edges ([40,2,10])
	tv: "radial-gradient(ellipse 62% 70% at 50% 46%, rgb(14,12,12) 0%, rgb(4,2,4) 60%, rgb(40,3,12) 100%)",
	// headset passthrough — [90,73,52] top half, [69,58,43] bottom half
	passthrough: "linear-gradient(180deg, rgb(92,75,53), rgb(84,68,48) 50%, rgb(62,52,40))",
};
const faceOf = (f) => FACES[f] ?? f ?? null;

/**
 * Tablet (landscape) — measured at f800: 763 x 524 (x262-1024, y162-686),
 * outer radius ~40; edge from outside in: dark line 2 px [41,43,40], light
 * highlight 2 px [145,147,144], dark 2 px [19,21,18], grey band 4 px
 * [62,64,61], black bezel 3 px, screen from 13.5 px. Two top buttons at
 * x+76 and x+114 (32 wide, 3 px proud). No drop shadow (ground is clean at
 * y687+).
 */
function TabletLocal({ width = 763, face, label, wash = 0, tone = "light" }) {
	const k = width / 763;
	const ring = (inset, r, colour) => (
		<div
			style={{
				position: "absolute",
				inset: inset * k,
				borderRadius: r * k,
				background: rgbs(colour),
			}}
		/>
	);
	return (
		<div style={{ position: "relative", width, height: 524 * k }}>
			{[76, 114].map((x) => (
				<div
					key={x}
					style={{
						position: "absolute",
						left: x * k,
						top: -3 * k,
						width: 32 * k,
						height: 6 * k,
						borderRadius: 2 * k,
						background: "rgb(36,38,35)",
					}}
				/>
			))}
			{ring(0, 40, [41, 43, 40])}
			{ring(2, 38, [145, 147, 144])}
			{ring(4, 36, [19, 21, 18])}
			{ring(6, 34, [62, 64, 61])}
			{ring(10, 30, [0, 1, 0])}
			<div
				style={{ position: "absolute", inset: 13.5 * k, borderRadius: 27 * k, overflow: "hidden" }}
			>
				<ScreenSlot label={label} face={faceOf(face)} tone={tone} labelSize={13 * k} />
				{wash > 0 ? (
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: `rgba(254,252,250,${wash.toFixed(4)})`,
						}}
					/>
				) : null}
			</div>
		</div>
	);
}

/** TV — measured at f960: bare screen x149-1137, y146-700 (989 x 555), radius ~18, no shadow. */
function TvLocal({ width = 989, face, label }) {
	const k = width / 989;
	return (
		<div
			style={{
				position: "relative",
				width,
				height: 555 * k,
				borderRadius: 18 * k,
				overflow: "hidden",
			}}
		>
			<ScreenSlot label={label} face={faceOf(face)} labelSize={14 * k} />
		</div>
	);
}

/**
 * Headset window — measured at f1040: x216-1070, y160-704 (855 x 545),
 * radius ~34; footage runs full-bleed under a 59 px title band (hairline at
 * y219, no darkening); bold white title centred (cap ~13 px); round
 * translucent buttons 29 px, 17 px in from each side, centred on y190.
 * No drop shadow.
 */
function HeadsetLocal({ width = 855, face, label, title }) {
	const k = width / 855;
	const bar = 59 * k;
	const btn = 29 * k;
	const roundBtn = (side, icon) => (
		<div
			style={{
				position: "absolute",
				[side]: 17 * k,
				top: (bar - btn) / 2 + 1 * k,
				width: btn,
				height: btn,
				borderRadius: btn,
				background: "rgba(255,255,255,0.3)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<Icon name={icon} size={btn * 0.58} colour={Q.white} stroke={2.4} />
		</div>
	);
	return (
		<div
			style={{
				position: "relative",
				width,
				height: 545 * k,
				borderRadius: 34 * k,
				overflow: "hidden",
			}}
		>
			<ScreenSlot label={label} face={faceOf(face)} labelSize={14 * k} />
			<div
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					top: 0,
					height: bar,
					borderBottom: `${Math.max(0.6, k).toFixed(2)}px solid rgba(255,255,255,0.14)`,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					font: `700 ${19 * k}px ${FONT}`,
					color: "#fff",
					whiteSpace: "nowrap",
				}}
			>
				{title}
			</div>
			{roundBtn("left", "chevron-left")}
			{roundBtn("right", "minimize")}
		</div>
	);
}

/** Rest-state sizes of each device kind (stage px). */
const KIND = {
	watch: { w: ULTRA.w, h: ULTRA.h },
	tablet: { w: 763, h: 524 },
	tv: { w: 989, h: 555 },
	headset: { w: 855, h: 545 },
};

// ── juniper-device-stage ──────────────────────────────────────────────────

/** Scale / offset / opacity / blur of a device under a scale-type curve at frame k. */
function scaleMove(c, k, w, h, blurK) {
	const s = tab(c.s, k);
	const dy = tab(c.dy ?? [0], k);
	const op = tab(c.op ?? [1], k);
	const v = Math.abs(vel(c.s, k)) * Math.max(w, h) * 0.5 + Math.abs(vel(c.dy ?? [0], k));
	const by = blurK * v;
	return { s, dy, op, bx: by * 0.35, by };
}

function DeviceStage(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = t * 1000;
	const out = [];
	(cfg.devices ?? []).forEach((d, i) => {
		const kind = KIND[d.kind] ?? KIND.tablet;
		const w = d.width ?? kind.w;
		const h = kind.h * (w / kind.w);
		// rest position: (x,y) top-left (integers keep the rest frame on the pixel
		// grid), or (cx,cy) centre
		const x0 = d.x ?? (d.cx ?? 640) - w / 2;
		const y0 = d.y ?? (d.cy ?? 360) - h / 2;
		let m = { s: 1, dy: 0, op: 1, bx: 0, by: 0 };
		let dx = 0;
		if (d.enter) {
			const k = (ms - d.enter.atMs) / FRAME_MS;
			if (k < 0) return;
			m = scaleMove(curveOf(DEVICE_CURVES, d.enter.curve ?? "rise"), k, w, h, d.enter.blur ?? 0.1);
		}
		if (d.exit) {
			const c = curveOf(DEVICE_CURVES, d.exit.curve ?? "recede");
			const k = (ms - d.exit.atMs) / FRAME_MS;
			if (k > 0 && c.dx) {
				if (k >= c.dx.length - 1) return;
				dx = tab(c.dx, k);
				// horizontal motion blur grows with the whip (smear ~40 px at f762)
				const bx = (d.exit.blur ?? 0.2) * vel(c.dx, k);
				m = { s: 1, dy: dx * (c.dyPerDx ?? 0), op: tab(c.op ?? [1], k), bx, by: bx * 0.08 };
			} else if (k > 0) {
				m = scaleMove(c, k, w, h, d.exit.blur ?? 0.1);
				if (m.op <= 0) return;
			}
		}
		// active slot (app content) — slots switch on hard cuts at fromMs
		const slots = d.slots ?? [{}];
		let slot = slots[0];
		for (const sl of slots) if (sl.fromMs == null || ms >= sl.fromMs) slot = sl;
		let wash = 0;
		if (slot.washFrom && slot.fromMs != null) {
			// the AR camera view opens from a white wash: screen mean 225,201,188,177
			// ... 145 at f844-f853 against a settled 142 -> wash 0.74 decaying x0.72/frame
			wash = slot.washFrom * 0.72 ** Math.max(0, (ms - slot.fromMs) / FRAME_MS);
			if (wash < 0.004) wash = 0;
		}
		let node;
		if (d.kind === "watch")
			node = (
				<div style={{ transform: `scale(${(w / ULTRA.w).toFixed(5)})`, transformOrigin: "0 0" }}>
					<UltraWatch id={`${cfg.id ?? "s4d"}-uw${i}`}>
						<ScreenSlot label={slot.label} face={faceOf(slot.face)} labelSize={13} />
					</UltraWatch>
				</div>
			);
		else if (d.kind === "tv") node = <TvLocal width={w} face={slot.face} label={slot.label} />;
		else if (d.kind === "headset")
			node = <HeadsetLocal width={w} face={slot.face} label={slot.label} title={d.title ?? ""} />;
		else
			node = (
				<TabletLocal
					width={w}
					face={slot.face}
					label={slot.label}
					wash={wash}
					tone={slot.tone ?? "light"}
				/>
			);
		const pad = 120;
		// moving devices get their own compositing layer (no repaint ghosts)
		const moving = m.s !== 1 || m.dy !== 0 || dx !== 0 || m.op < 1 || m.bx > 0 || m.by > 0;
		out.push(
			<div
				key={d.id ?? i}
				style={{
					position: "absolute",
					left: x0 + dx,
					top: y0 + m.dy,
					width: w,
					height: h,
					opacity: Math.max(0, Math.min(1, m.op)),
					transform: moving ? `scale(${m.s.toFixed(5)})` : "none",
					transformOrigin: "50% 50%",
					willChange: moving ? "transform, opacity" : "auto",
				}}
			>
				<div style={{ position: "absolute", left: w / 2, top: h / 2 }}>
					<Blurred
						id={`${cfg.id ?? "s4d"}-${i}`}
						sx={m.bx}
						sy={m.by}
						w={w + pad * 2}
						h={h + pad * 2}
					>
						<div style={{ position: "absolute", left: pad, top: pad }}>{node}</div>
					</Blurred>
				</div>
			</div>,
		);
	});
	return withPullback(cfg, ms, <>{out}</>);
}

export const S4_PRESETS = {
	"juniper-device-label": {
		note: "the kinetic device label of the device comps: a regular sub-label over a semibold 'for [glyph] Device' line. `states` is a list of label states; each later state (atMs absolute) may change `layout` (side|top: the whole block travels on the measured accelerate-decelerate curve with motion blur along its path), `device` (the device word rolls up out of a clipped slot by one line pitch with vertical motion blur; the line re-centres on the rolling width) and/or `sub` (old sub lifts and fades, new sub rises in grey -> ink). Measured on the Rork Max film f753-f1012.",
		nativeMs: 11033,
		params: {
			states: [
				"array",
				"[{sub,device,layout}, {atMs, sub?, device?, layout?, subMs?, wordMs?, travelMs?, wordCurve?, travelCurve?}]",
				"label states; ms absolute (film clock)",
			],
			layouts: [
				"object",
				"{side:{right:622,baseline:384,subCx:442.5}, top:{cx:637,baseline:122.5}}",
				"per layout: line centre x (cx) or line right edge (right), main baseline, optional fixed sub centre",
			],
			size: ["number", 67, "main line font px (cap 47)"],
			subSize: ["number", 25, "sub-label font px"],
			subDrop: ["number", 68.5, "main baseline -> sub baseline"],
			pitch: ["number", 78, "device-word roll distance"],
			lead: ["string", "for", "lead word before the glyph"],
			pullback: [
				"object",
				"null",
				"{fromMs, toMs, to, pow, originX, originY}: closing accelerating zoom-out",
			],
		},
		render: DeviceLabelStage,
	},
	"juniper-device-stage": {
		note: "the device frames of the tablet/TV/headset passage and their morphs, drawn without shadows (as measured): `devices` [{kind: watch|tablet|tv|headset, x,y | cx,cy, width, slots:[{fromMs?, label, face, washFrom?}], enter:{atMs, curve: rise|grow|grow-window}, exit:{atMs, curve: whip-right|recede}, title}]. Curves are per-frame tables measured on the Rork Max film (watch whips out right with horizontal blur; tablet rises from below while scaling up; devices recede by shrinking + dropping + fading; TV and headset window grow in about their centres while fading in 0.2/frame).",
		nativeMs: 11033,
		params: {
			devices: ["array", "[]", "device list, ms absolute"],
			pullback: [
				"object",
				"null",
				"{fromMs, toMs, to, pow, originX, originY}: closing accelerating zoom-out",
			],
		},
		render: DeviceStage,
	},
};
