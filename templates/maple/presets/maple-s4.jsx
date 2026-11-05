/**
 * maple-s4.jsx — section s4 presets (f414-f510, 13800-17033 ms): the rolodex.
 *
 * One preset owns the whole beat (cards, flips, the lifted mark and the
 * cursor run through each other, so they must not hand over between scenes).
 * Measured on the reference's full-decode frames (30 fps clock, stage px):
 *
 *   CAMERA     the cards are flat planes in one perspective camera: fitted
 *              from the keystone (top width vs top y of the tilting card,
 *              20 frames, f428-f453) -> perspective 1580 px, origin
 *              (640, 335). Cards are 860 x 484 (radius 15) with their
 *              bottom edge (the hinge) on y602, x210-1070.
 *   f413-f431  RISE: the ember card rises from below, expo-out, scale and
 *              position on ONE exponential: s = 1 - 0.115 r^n, centre y =
 *              360 + 515 r^n, r = 0.785, n = f - 413 (fit residual < 2 px
 *              on top/bottom/width, f413-f430). No motion blur (edge ramp
 *              1-2 px at 93 px/frame). f413 itself is drawn by s3.
 *   f419-f439  TILT: each front card falls toward camera about its hinge,
 *              theta growing x1.27 per frame (ember 28.5 deg @f436; orchid
 *              37 @f445; dawn 34.3 @f453; tuned on the top-edge trace), then 38/48/64 (ember f437-439),
 *              46.5/60 (orchid f446-447), 44/56 (dawn f454-455), with
 *              motion blur (edge ramp ~0.6 x the per-frame travel).
 *   flip       the card goes over the hinge and HANGS below it (ember f440,
 *              theta ~125 from the sliver's edge slope 0.35 px/row; orchid
 *              f448 and dawn f456 pass ~100 first, slope 0.76), then drops
 *              rigidly at 31-32 px/frame (sliver top 604,636,667,698 ...).
 *   back cards each next card waits behind, slightly small, its hinge on the
 *              same line (its bottom must stay hidden), and settles to s 1
 *              (orchid top y145/128/124/116 f436-f439 -> s .944, .979, .98,
 *              .995; dawn top 163/147/128 f446-f448 -> s .907, .95, .985),
 *              starting its own tilt as it becomes the front.
 *   f453-f476  the lagoon card is revealed FLAT (no tilt) and grows about
 *              the frame centre on the film's exponential: s = 1.0965 (1 -
 *              0.176 x 0.79^(f-456)) (widths 777,812,839,860,877 ... 943),
 *              rest x168-1111, y95-625.
 *   f459-f469  the cursor (an up-pointing hollow chevron, 56 px, black
 *              2.5 px edge) rises from below the card, expo-out (tip y 580,
 *              473,403,357,327,303,288,273,267,260) to rest on the mark's top
 *              arm (655,257).
 *   f476-f499  LIFT: the cursor drags the mark up off the card (grip y 253,
 *              248,237,211,132,108,99,94,91,90); the mark HANGS from the
 *              grip like a pendulum (rot +5.7 deg @f480, -4.8 @f488, +0.9
 *              @f495, 0 by f499; centre = grip + R(rot)(-16,104)), with a
 *              soft drop shadow on the card. Knockout = true hole.
 *   f485-f492  the card drops out, accelerating x~2/frame (top +1,4,11,24,
 *              50,99,191,379), heavy vertical blur (ramp ~0.7 x travel).
 *   f495-f496  release: the chevron turns into the regular pointer (rotate
 *              -32 deg, scale 0.82 about the tip).
 *   f499-f510  the mark sinks, accelerating (centre y 195,197,199,202,205,
 *              210,215,224,236,254,282,321) and shrinks to 0.90 with vertical
 *              blur; the pointer leaves up-left (tip 652,86 -> 585,-15).
 */
import React from "react";
import { GradientArt, MapleMark, markGeometry, Q, rgbs } from "./maple-shared.jsx";

// ── camera and card geometry ──────────────────────────────────────────────

const F0 = 414; // film frame at scene start (13800 ms)
const PERSP = 1580; // fitted perspective distance (px)
const PO_X = 640;
const PO_Y = 335; // fitted perspective origin y
const CW = 860; // stack card (f430-f453)
const CH = 484;
const HINGE = 602; // bottom edge of every card at rest
const CR = 15; // corner radius (16 on the 943 px lagoon card)
const MARK_FRAC = 0.223; // mark width / card width (192 / 860, 210 / 943)
const HERO_SCALE = 1.0965; // lagoon card at rest vs the stack (943 / 860)

// Card art: local refinements of the shared GRADIENTS (same format), from the
// reference's flat-ish card frames (9-point medians + reading the shapes):
//   ember  f424: pink [236,92,132] top-left, red-orange [234,77,85]/[234,94,76]
//          left/lower-left with a lighter coral wedge in the bottom-left corner,
//          magenta [199,83,165] centre, violet [152,112,210] top-right with a
//          faint light wedge, indigo [81,71,163] lower right, lilac streak
//          lower centre-right. (Shared spec: dusky top-left corner and a big
//          lilac swoosh read wrong on the card.)
//   orchid f442: purple [141,49,179] left, a sharp-edged near-white swoosh from
//          the top edge at x~35% curving to the right edge at y~55%, a lighter
//          lilac diagonal band to the lower right, warm rose at the lower-left edge.
//   dawn   f452: blue [50,100,197] top band, pale cyan-blue [143,190,220] left,
//          a soft cream band across the centre, peach [232,173,137] low centre
//          with orange-red below it, blue [53,130,212] mid-right.
//   lagoon f470: teal [84,178,190] top, slate-blue [55,85,120] left third
//          (deepest lower-left [59,86,108]), a narrow red flame [215,75,80] at
//          x~28% rising from the bottom to mid-height, mint [200,217,210]
//          centre, aqua [129,199,201] right, pale [155,205,206] lower right.
// exported: s3 draws the ember card's first sliver at f413 from the same art
export const CARD_ART = {
	ember: {
		base: [100, [236, 92, 128], [206, 76, 158], [146, 84, 214], [98, 72, 186]],
		blobs: [
			[2, 0, 42, 50, [238, 98, 138], 0.95],
			[8, 72, 52, 62, [234, 74, 66], 1],
			[54, 48, 26, 38, [200, 82, 168], 0.55],
			[84, 18, 26, 40, [150, 96, 216], 0.8],
			[94, 80, 24, 46, [74, 62, 152], 0.95],
			[70, 92, 10, 34, [192, 132, 226], 0.55],
			[100, -6, 10, 26, [196, 160, 232], 0.6],
		],
		swoosh: [-14, 116, 40, 30, [242, 142, 122], 0.7],
	},
	orchid: {
		base: [110, [146, 56, 196], [150, 70, 208], [190, 140, 232]],
		blobs: [
			[14, 40, 40, 60, [138, 50, 192], 1],
			[82, 82, 34, 26, [188, 134, 234], 0.85],
			[96, 30, 34, 50, [208, 172, 240], 1],
			[-2, 100, 12, 26, [232, 156, 128], 0.8],
		],
		swoosh: [100, -30, 68, 85, [242, 234, 250], 0.78],
	},
	dawn: {
		base: [180, [48, 100, 198], [120, 166, 216], [150, 186, 224]],
		blobs: [
			[6, 68, 26, 46, [143, 192, 228], 0.95],
			[98, 52, 22, 46, [48, 122, 212], 0.9],
			[92, 98, 24, 26, [95, 175, 225], 0.9],
			[38, 56, 44, 24, [240, 236, 226], 0.85],
			[46, 92, 40, 36, [238, 176, 138], 1],
			[62, 104, 20, 26, [232, 112, 90], 0.95],
			[50, -8, 92, 30, [45, 96, 196], 1],
		],
		swoosh: null,
	},
	lagoon: {
		base: [180, [84, 178, 190], [176, 210, 206], [156, 204, 205]],
		blobs: [
			[58, 64, 34, 40, [206, 219, 210], 1],
			[98, 70, 25, 45, [128, 198, 200], 0.85],
			[10, 80, 34, 56, [62, 98, 128], 1],
			[6, 62, 22, 30, [62, 102, 134], 0.9],
			[-4, 104, 24, 34, [58, 84, 104], 1],
			[42, 90, 11, 36, [236, 180, 150], 0.8],
			[29, 100, 13, 56, [222, 70, 80], 1],
			[29, 96, 9, 46, [226, 68, 78], 1],
			[50, -8, 92, 30, [84, 178, 190], 1],
		],
		swoosh: null,
	},
};

/** Linear interpolation over [[f, ...values]] keys (clamped at both ends). */
function track(keys, f) {
	if (f <= keys[0][0]) return keys[0].slice(1);
	const last = keys[keys.length - 1];
	if (f >= last[0]) return last.slice(1);
	for (let i = 0; i < keys.length - 1; i++) {
		const a = keys[i];
		const b = keys[i + 1];
		if (f >= a[0] && f < b[0]) {
			const p = (f - a[0]) / (b[0] - a[0]);
			return a.slice(1).map((v, j) => v + (b[j + 1] - v) * p);
		}
	}
	return last.slice(1);
}

// ── the deck timeline (film frames) ───────────────────────────────────────
//
// A card state is { s, ty, th }: scale about its hinge centre (640, 602),
// hinge translation in y, and the forward tilt about the hinge (deg; >90 =
// hanging below it). Linear between integer frames, so the sub-frame motion
// blur samples sit on the measured path.

const tiltExp = (th0, f0, f) => th0 * 1.27 ** (f - f0);

// The rise (s3 draws f413 from the same function; see riseState()).
const RISE = { r: 0.785, a: 0.115, b: 515, f0: 413 };

/**
 * Ember card rise at film frame f (>= 413): { s, ty, th } in the hinge frame,
 * plus the screen rect of the (untilted) card. Exported so s3 can draw the
 * f413 sliver from the same numbers.
 */
export function riseState(f) {
	const p = RISE.r ** (f - RISE.f0);
	const s = 1 - RISE.a * p;
	const cy = 360 + RISE.b * p;
	return {
		s,
		ty: cy + (CH / 2) * s - HINGE,
		th: 0,
		rect: { x: 640 - (CW / 2) * s, y: cy - (CH / 2) * s, w: CW * s, h: CH * s, r: CR * s },
	};
}

function emberState(f) {
	if (f <= 436) {
		const r = riseState(f);
		return { s: r.s, ty: r.ty, th: f >= 419 ? tiltExp(28.5, 436, f) : 0 };
	}
	const [th, ty] = track(
		[
			[436, 28.5, 0],
			[437, 38, 0],
			[438, 48, 0],
			[439, 64, 0],
			[440, 125, 0],
			[441, 125, 32],
			[442, 125, 64],
			[443, 125, 96],
			[444, 125, 128],
		],
		f,
	);
	return { s: 1, ty, th };
}

function orchidState(f) {
	if (f < 440) {
		const [s, ty, th] = track(
			[
				[435, 0.9, 0, 0],
				[436, 0.944, 0, 0],
				[437, 0.979, 0, 1],
				[438, 0.98, 0, 4.8],
				[439, 0.995, 0, 8.6],
				[440, 1, 0, tiltExp(37, 445, 440)],
			],
			f,
		);
		return { s, ty, th };
	}
	if (f <= 445) return { s: 1, ty: 0, th: tiltExp(37, 445, f) };
	const [th, ty] = track(
		[
			[445, 37, 0],
			[446, 46.5, 0],
			[447, 60, 0],
			[448, 100, 0],
			[449, 125, 32],
			[450, 125, 63],
			[451, 125, 95],
			[452, 125, 127],
		],
		f,
	);
	return { s: 1, ty, th };
}

function dawnState(f) {
	if (f < 450) {
		const [s, ty, th] = track(
			[
				[445, 0.8, 0, 0],
				[446, 0.907, 0, 0],
				[447, 0.95, 0, 8],
				[448, 0.985, 0, 10.5],
				[449, 0.995, 0, 13],
				[450, 0.998, 0, tiltExp(34.3, 453, 450)],
			],
			f,
		);
		return { s, ty, th };
	}
	if (f <= 453) return { s: f < 451 ? 0.998 : 1, ty: 0, th: tiltExp(34.3, 453, f) };
	const [th, ty] = track(
		[
			[453, 34.3, 0],
			[454, 44, 0],
			[455, 56, 0],
			[456, 100, 0],
			[457, 125, 17],
			[458, 125, 48],
			[459, 125, 79],
			[460, 125, 110],
			[461, 125, 141],
		],
		f,
	);
	return { s: 1, ty, th };
}

// The hero (lagoon) card: flat, grows about the frame centre, then drops.
const HERO_DROP = [
	[484, 0],
	[485, 1],
	[486, 4],
	[487, 11],
	[488, 24],
	[489, 50],
	[490, 99],
	[491, 191],
	[492, 379],
	[493, 700],
];

function lagoonState(f) {
	const s = HERO_SCALE * (1 - 0.176 * 0.79 ** (f - 456));
	const [drop] = track(HERO_DROP, f);
	return { s, ty: 360 + (CH / 2) * s - HINGE + drop, th: 0 };
}

// Visible windows (film frames) and where each card may motion-blur.
const DECK = [
	// back to front (DOM order = paint order)
	{ key: "lagoon", from: 453, to: 493, state: lagoonState, blur: (f) => f > 484 },
	{ key: "dawn", from: 445, to: 461, state: dawnState, blur: (f) => f > 452.5 },
	{ key: "orchid", from: 435, to: 452.5, state: orchidState, blur: (f) => f > 444.5 },
	{ key: "ember", from: 413, to: 444, state: emberState, blur: (f) => f > 435.5 },
];

/** Screen y of a card's top edge (sets the blur sample count). */
function topY(st) {
	const h = CH * st.s;
	const a = (st.th * Math.PI) / 180;
	const yw = HINGE + st.ty - h * Math.cos(a);
	const z = h * Math.sin(a);
	return PO_Y + ((yw - PO_Y) * PERSP) / Math.max(1, PERSP - z);
}

// ── the lifted mark and the cursor ────────────────────────────────────────

// Mark centre / rotation (deg, + = clockwise) / scale, measured f476-f510
// (white-ink centroid and side-edge slope; the hero card centre is (640,360),
// the measured centroid sits 1.2 px lower, so keys are shifted by -1.2).
const MARK_KEYS = [
	[475, 640, 360, 0, 1],
	[476, 639.9, 356.1, 0, 1],
	[477, 639.7, 350.5, 0, 1],
	[478, 639.3, 340.2, 0.1, 1],
	[479, 633.6, 312.6, 3.6, 1],
	[480, 628.1, 232.4, 5.7, 1],
	[481, 629.9, 209.6, 4.7, 1],
	[482, 632.8, 200.7, 3.2, 1],
	[483, 636.2, 195.9, 1.5, 1],
	[484, 639.4, 193.9, -0.4, 1],
	[485, 642.5, 193.2, -1.9, 1],
	[486, 645.0, 193.3, -3.4, 1],
	[487, 647.0, 193.4, -4.4, 1],
	[488, 647.9, 193.3, -4.8, 1],
	[489, 647.4, 192.8, -4.5, 1],
	[490, 645.8, 192.5, -4.0, 1],
	[491, 643.9, 192.9, -2.7, 1],
	[492, 641.7, 192.9, -1.6, 1],
	[493, 639.7, 192.7, -0.7, 1],
	[494, 638.2, 192.5, 0.3, 1],
	[495, 636.8, 193.2, 0.9, 1],
	[496, 636.8, 193.3, 0.9, 1],
	[497, 637.2, 193.2, 0.5, 1],
	[498, 637.6, 193.4, 0.3, 1],
	[499, 638.1, 194.0, 0, 1],
	[500, 638.2, 195.4, 0, 1],
	[501, 638.3, 197.7, 0, 0.995],
	[502, 638.3, 200.5, 0, 0.995],
	[503, 638.3, 204.1, 0, 0.995],
	[504, 638.8, 208.3, 0, 0.986],
	[505, 639.3, 213.9, 0, 0.986],
	[506, 639.5, 222.6, 0, 0.976],
	[507, 639.5, 234.7, 0, 0.966],
	[508, 639.7, 253.2, 0, 0.952],
	[509, 639.7, 280.9, 0, 0.933],
	[510, 640.3, 320.1, 0, 0.9],
	[511, 640.3, 375, 0, 0.86],
];
// Grip: cursor tip relative to the mark centre at rot 0 (f470: tip 655,257
// vs centre 639,361).
const GRIP = [16, -104];

// Chevron cursor tip, entering from below (f459-f470), expo-out.
const CURSOR_IN = [
	[458, 598, 760],
	[459, 608, 580],
	[460, 619, 473],
	[461, 635, 403],
	[462, 640, 357],
	[463, 645, 327],
	[464, 648, 303],
	[465, 651, 288],
	[466, 653, 273],
	[467, 656, 267],
	[468, 654, 260],
	[469, 655, 258],
	[470, 656, 257],
];
// After release: pointer tip, then the exit up-left (f505-f510).
const CURSOR_OUT = [
	[494, 654, 88.8],
	[496, 654, 89],
	[502, 654, 89],
	[504, 653, 89],
	[505, 652, 86],
	[506, 648, 81],
	[507, 641, 66],
	[508, 629, 46],
	[509, 607, 11],
	[510, 585, -15],
	[511, 560, -45],
];

function rotate([x, y], deg) {
	const a = (deg * Math.PI) / 180;
	return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}

function markState(f) {
	const [cx, cy, rot, sc] = track(MARK_KEYS, f);
	return { cx, cy, rot, sc };
}

function cursorState(f) {
	if (f < 458 || f >= 511) return null;
	if (f < 470) {
		const [x, y] = track(CURSOR_IN, f);
		return { x, y, rot: 0, sc: 1 };
	}
	if (f < 476) return { x: 656, y: 257, rot: 0, sc: 1 };
	if (f <= 494) {
		const m = markState(f);
		const g = rotate([GRIP[0] * m.sc, GRIP[1] * m.sc], m.rot);
		return { x: m.cx + g[0], y: m.cy + g[1], rot: 0, sc: 1 };
	}
	const [x, y] = track(CURSOR_OUT, f);
	// release: chevron -> regular pointer (rotate -32 deg, x0.82 about the tip)
	const [rot, sc] = track(
		[
			[494, 0, 1],
			[496, -32, 0.82],
		],
		f,
	);
	return { x, y, rot, sc };
}

// ── drawing ───────────────────────────────────────────────────────────────

/** The drag cursor: an up-pointing hollow chevron (f470: tip (0,0), wings
 * (+-28, 55), notch (0, 31); white, black 2.5 px edge). Rotated -32 deg and
 * scaled 0.82 it is the regular pointer (f497-f510). (x, y) = tip. */
function Chevron({ x, y, rot = 0, sc = 1 }) {
	return (
		<svg
			width={2}
			height={2}
			style={{
				position: "absolute",
				left: x,
				top: y,
				overflow: "visible",
				transform: `rotate(${rot.toFixed(3)}deg) scale(${sc.toFixed(4)})`,
				transformOrigin: "0 0",
			}}
		>
			<path
				d="M0 0L28 55L0 31L-28 55Z"
				fill={rgbs(Q.pure)}
				stroke="#000"
				strokeWidth={2.5}
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** The cube variation (dawn card, f450): top and right faces solid, the left
 * face a translucent pane inside a white frame. */
function CubeMark({ width, colour = Q.pure }) {
	const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
	const pad = 4;
	const g = markGeometry({ width, variant: "cube", pad });
	const W = width + pad * 2;
	const H = g.height + pad * 2;
	const poly = (pts) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`;
	const fw = width * 0.034;
	const solid = { fill: rgbs(colour), stroke: rgbs(colour), strokeWidth: 0.8 };
	return (
		<svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
			<defs>
				<clipPath id={`${uid}l`}>
					<path d={poly(g.faces[1])} />
				</clipPath>
			</defs>
			<path d={poly(g.faces[0])} {...solid} />
			<path d={poly(g.faces[2])} {...solid} />
			<path
				d={poly(g.faces[1])}
				fill={rgbs(colour, 0.42)}
				stroke={rgbs(colour)}
				strokeWidth={fw * 2}
				clipPath={`url(#${uid}l)`}
			/>
		</svg>
	);
}

function CardMark({ card, width }) {
	if (card.variant === "cube") return <CubeMark width={width} />;
	return (
		<MapleMark
			width={width}
			variant={card.variant}
			radius={card.radius ?? 26}
			fill={Q.pure}
			pad={4}
		/>
	);
}

/** One card in the fitted perspective camera (a full-frame layer). */
function CardLayer({ card, st, withMark, grain }) {
	const s = st.s.toFixed(5);
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				perspective: `${PERSP}px`,
				perspectiveOrigin: `${PO_X}px ${PO_Y}px`,
			}}
		>
			<div
				style={{
					position: "absolute",
					left: PO_X - CW / 2,
					top: HINGE - CH,
					width: CW,
					height: CH,
					transformOrigin: `${CW / 2}px ${CH}px`,
					transform: `translateY(${st.ty.toFixed(3)}px) scale3d(${s},${s},${s}) rotateX(${(-st.th).toFixed(3)}deg)`,
				}}
			>
				<GradientArt
					name={card.art}
					spec={card.spec ?? CARD_ART[card.art] ?? null}
					width={CW}
					height={CH}
					radius={CR}
					grain={grain}
					seed={card.seed ?? 3}
				>
					{withMark ? <CardMark card={card} width={CW * MARK_FRAC} /> : null}
				</GradientArt>
			</div>
		</div>
	);
}

/** Exact shutter average of n sub-frame renders: additive layers at 1/n in
 * an isolated group (the premultiplied sum is the average). children(o) gets
 * the sample offset o in -0.5..0.5 (x shutter). vblur (px) adds a vertical-only
 * Gaussian to each sample so a long sweep reads as a smear, not n copies. */
function Accumulate({ n, vblur = 0, children }) {
	const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
	if (n <= 1) return children(0);
	const out = [];
	for (let i = 0; i < n; i++) {
		out.push(
			<div
				key={i}
				style={{
					position: "absolute",
					inset: 0,
					opacity: 1 / n,
					mixBlendMode: "plus-lighter",
					filter: vblur > 0.3 ? `url(#${uid}v)` : undefined,
				}}
			>
				{children((i + 0.5) / n - 0.5)}
			</div>,
		);
	}
	return (
		<div style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
			{vblur > 0.3 ? (
				<svg width={0} height={0} style={{ position: "absolute" }}>
					<filter id={`${uid}v`} x="-5%" y="-20%" width="110%" height="140%">
						<feGaussianBlur stdDeviation={`0 ${vblur.toFixed(2)}`} />
					</filter>
				</svg>
			) : null}
			{out}
		</div>
	);
}

const ROLODEX_DEFAULTS = {
	cards: [
		{ art: "ember", variant: "main", radius: 26 },
		{ art: "orchid", variant: "blades", radius: 4 },
		{ art: "dawn", variant: "cube" },
		{ art: "lagoon", variant: "blades", radius: 26 },
	],
	shutter: 0.6, // frames (edge ramps on the flips / drop / sink ~0.6-0.7 x travel)
	liftShutter: 0.35, // the lift whip f479-f481 is sharper (ramp ~0.2-0.35 x travel)
	shadow: [-6, 22, 16, 0.38], // lifted mark: dx, dy, blur, alpha
	grain: 0.12,
};

function rolodex(cfg, t) {
	const ms = t * 1000 - cfg.startMs;
	if (ms < 0 || ms >= cfg.durationMs) return null;
	const p = { ...ROLODEX_DEFAULTS, ...cfg };
	const f = F0 + (ms * 30) / 1000; // film frame on the reference clock
	const cards = p.cards;
	const byKey = { ember: cards[0], orchid: cards[1], dawn: cards[2], lagoon: cards[3] };
	const sh = p.shutter;

	const deck = [];
	for (const d of DECK) {
		if (f < d.from || f >= d.to) continue;
		const card = byKey[d.key];
		const attached = d.key !== "lagoon" || f < 475.5;
		let n = 1;
		let vb = 0;
		if (d.blur(f)) {
			const travel = Math.abs(topY(d.state(f + sh / 2)) - topY(d.state(f - sh / 2)));
			n = Math.min(14, Math.max(1, Math.ceil(travel / 4)));
			vb = n > 1 ? (travel / n) * 0.5 : 0;
		}
		deck.push(
			<Accumulate key={d.key} n={n} vblur={vb}>
				{(o) => (
					<CardLayer
						card={card}
						st={d.state(f + o * sh)}
						withMark={attached}
						grain={n > 1 ? 0 : p.grain}
					/>
				)}
			</Accumulate>,
		);
	}

	// the lifted mark (from f476); the cursor shares its shutter
	const markW = CW * MARK_FRAC * HERO_SCALE;
	const liftPhase = f >= 478 && f < 482;
	const mSh = liftPhase ? p.liftShutter : sh;
	let mark = null;
	if (f >= 475.5) {
		let nm = 1;
		if (liftPhase || f >= 503) {
			const a = markState(f - mSh / 2);
			const b = markState(f + mSh / 2);
			nm = Math.min(24, Math.max(1, Math.ceil(Math.hypot(b.cx - a.cx, b.cy - a.cy) / 2)));
		}
		const shadowOn = Math.max(0, Math.min(1, (f - 477) / 3));
		const [sdx, sdy, sbl, sal] = p.shadow;
		const filter =
			shadowOn > 0
				? `drop-shadow(${sdx}px ${sdy}px ${sbl}px rgba(0,0,0,${(sal * shadowOn).toFixed(3)}))`
				: undefined;
		mark = (
			<Accumulate n={nm}>
				{(o) => {
					const m = markState(f + o * mSh);
					return (
						<div
							style={{
								position: "absolute",
								left: m.cx,
								top: m.cy,
								width: 0,
								height: 0,
								transform: `rotate(${m.rot.toFixed(3)}deg) scale(${m.sc.toFixed(4)})`,
							}}
						>
							<div
								style={{
									position: "absolute",
									left: 0,
									top: 0,
									transform: "translate(-50%, -50%)",
									filter,
								}}
							>
								<CardMark card={cards[3]} width={markW} />
							</div>
						</div>
					);
				}}
			</Accumulate>
		);
	}

	// cursor: blurred where it travels fast (entry, release turn, exit)
	let cursor = null;
	const c0 = cursorState(f);
	if (c0) {
		const at = (x) => cursorState(Math.min(510.99, Math.max(458, x))) ?? c0;
		const a = at(f - mSh / 2);
		const b = at(f + mSh / 2);
		const travel = Math.hypot(b.x - a.x, b.y - a.y) + Math.abs(b.rot - a.rot) * 0.8;
		const nc = Math.min(24, Math.max(1, Math.ceil(travel / 2)));
		cursor = (
			<Accumulate n={nc}>
				{(o) => {
					const c = at(f + o * mSh);
					return <Chevron x={c.x} y={c.y} rot={c.rot} sc={c.sc} />;
				}}
			</Accumulate>
		);
	}

	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			{deck}
			{mark}
			{cursor}
		</div>
	);
}

export const S4_PRESETS = {
	"maple-rolodex": {
		note: "maple's variations rolodex (f414-f510), one continuous beat: a gradient card rises from below on the film's exponential (expo-out x0.785/frame) while the ground fades to black; each front card falls toward camera about its bottom hinge (tilt x1.27/frame), flips over with motion blur, hangs and drops, revealing the next (4 cards: GradientArt + mark variant each); the last (hero) card is revealed flat and grows to rest; a chevron cursor rises onto its mark and drags the mark up off the card (it swings from the grip like a pendulum, soft shadow); the card drops out with vertical blur; the cursor releases (turns into the pointer) and leaves up-left while the mark sinks and shrinks. Real perspective (CSS 3D, fitted camera); motion blur is an exact sub-frame average. Pair with maple-ground keys for the white->black fade. Retime only as a whole (the timeline is on the reference's frame clock from startMs).",
		nativeMs: 3233,
		params: {
			cards: [
				"array",
				'[{art:"ember",variant:"main"},{art:"orchid",variant:"blades"},{art:"dawn",variant:"cube"},{art:"lagoon",variant:"blades"}]',
				"front to back: GradientArt name + mark variant (+ radius) per card; the 4th is the hero whose mark is lifted",
			],
			shutter: ["number", 0.6, "motion-blur shutter (frames) for flips, drop, sink, cursor"],
			liftShutter: ["number", 0.35, "shutter for the lift whip f478-f481"],
			shadow: ["array", "[-6,22,16,0.38]", "lifted mark drop shadow: dx, dy, blur, alpha"],
			grain: ["number", 0.12, "GradientArt grain on resting cards"],
		},
		render: rolodex,
	},
};
