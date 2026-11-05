/**
 * maple-s5.jsx — section s5 presets (f511-f690, 17033-23033 ms): the mockup
 * montage, the "add a wordmark" prompt card, the outline wordmark and the
 * font flash.
 *
 * Measured on the reference's full-decode frames (30 fps clock, stage px):
 *   f511-f570  8 mockup photos, a hard cut every 6 frames (f511 517 523 529
 *              535 541 547 553; the billboard holds f553-f570, static: no
 *              push, diff <= 0.6). The variation mark sits at the SAME screen
 *              spot on every photo: centre (639,360), 183 px wide x 206 tall
 *              (rounding ~80 mark units), knockout a true hole. f517 is an
 *              INSET: the coffee photo covers x129-1149, y0-706 and the
 *              brochure (f511) still shows round it.
 *   f571       cut to white + dot grid (pitch 53.4 x 64, rows y = 41 + 64k,
 *              columns x = 641 + 53.4k; dots ~[228]). The grid layer settles
 *              on its own: scale 1.21 -> 1 about (641,360) with a 15 deg
 *              top-back tilt, x0.795/frame (row x-pitch 60.8,59.5,58.3,57.4 ...
 *              53.34 f592).
 *   f571-f590  the prompt card enters on its OWN 3D transform (fitted on the
 *              send button, tile and card-bottom shadow, P 2000, origin
 *              640.5,360.5): translateY 242 x0.76^n, scale 1 + 0.257 x0.76^n,
 *              rotateX 48 (1 - n/16)^1.5 deg (n = f - 571), and a horizontal-
 *              only blur sigma 4.1 x0.76^n (button edge ramp 8,6,5,4,3,3,2 px
 *              f572-f578, vertical ramp sharp).
 *   rest       card x138-1142, y224-495 (radius ~26), white, 1 px border and a
 *              soft shadow below (-29 levels at y496, gone by y520); tile
 *              x166-249, y252-335 (radius 13, black) with the white blades
 *              mark; send button x1025-1121, y376-473 ([28,88,236] ->
 *              [27,84,227]); text left x177, baseline 428.5, Segoe UI 42.8 px
 *              (cap 29.5, "What do you want to generate?" 597 px wide).
 *   f569-f586  placeholder glyph wave: glyphs settle left to right
 *              (decelerating: ~6 by f572, 16 by f576, 21 f578, 25 f580, all
 *              by f586), each rising ~28 px from below, blurred and faint.
 *   f575-f586  tile fades in (lum 190,147,112,85,63,47,34,23,16,10,4,2: x0.765).
 *   f602       placeholder fades (blurred), gone f603.
 *   f603-f629  "Add a wordmark to this logo" types on, ~1 glyph/frame with
 *              doubles; each glyph pops in small and blurred on its first
 *              frame, full on the next (schedule TYPE_AT). No caret.
 *   f630-f635  click: the card turns ~4.5 deg about Y (left side forward,
 *              tile 166 -> 152, button 1073 -> 1052); button presses (96 ->
 *              70 px f632-f633, gradient inverted) and releases f634-f635.
 *   f634       cut: ground grey [192] fading x0.79/frame to black by f654;
 *              grid dots jump +75 and drift up (-104.5 + 179.5 x0.8^(f-634))
 *              while their opacity falls x0.76/frame.
 *   f635-f646  card exits up: dy = -520 (1 - 0.785^(f-635.4)) with a CW turn
 *              2.1 (1 - 0.72^(f-635.4)) deg (bottom edge slope .017 .021 .024
 *              .025 .028 .029 f637-f644).
 *   f634-f652  under it: the white blades mark (210 px, centre y 359.5)
 *              slides out left, x = -207 + 505 x0.91^(f-636), with a
 *              horizontal motion smear; the outline "lorem" (a bold grotesk
 *              outline, Arial Bold 245 px, -2.5 px tracking, 2 px white, ink
 *              627 x 175, baseline 447) pans left on its own curve: ink left
 *              x = 325 + 148 x0.872^(f-637); its LAST glyph draws on as a
 *              stroke f637.7-f647.5.
 *   f661       the outline ghost: filled 25% white under the first flash face.
 *   f661-f690  font flash, a hard cut every 3 frames, white, centred on
 *              x639.5: blackletter "Lorem" (x290-989, y238-492), heavy rounded
 *              "Lorem" (217-1062, 273-470), serif caps "LOREM" (237-1042,
 *              cap 302-474), serif "lorem" (255-1024, 234-466), techno caps
 *              "LOREM" (211-1068, 321-463), grotesk bold "lorem" (327-952,
 *              275-447: the outline face filled), round geometric "Lorem"
 *              (209-1070, 252-468), then blackletter, rounded, serif caps.
 */
import React from "react";
import { clamp01, easeByName, lerp } from "../../../src/lib/textcards/src/easing.js";
import { FONT, GEO, ImageSlot, MARK, Q, rgbs, roundedPath, SLOTS } from "./maple-shared.jsx";

const outC = easeByName("out", 3, (x) => x);
const ABS = { position: "absolute", left: 0, top: 0 };

/** Film frame (30 fps clock) of a scene at t; frame0 = film frame at startMs. */
const filmFrame = (cfg, t, f0) => (cfg.frame0 ?? f0) + (t * 1000 - cfg.startMs) * 0.03;
const isLive = (cfg, t) => t * 1000 >= cfg.startMs && t * 1000 < cfg.startMs + cfg.durationMs;

/** Piecewise-linear lookup over [[frame, value], ...]. */
function table(rows, f) {
	if (f <= rows[0][0]) return rows[0][1];
	for (let i = 1; i < rows.length; i++) {
		if (f <= rows[i][0]) {
			const [f0, v0] = rows[i - 1];
			const [f1, v1] = rows[i];
			return lerp(v0, v1, (f - f0) / (f1 - f0));
		}
	}
	return rows[rows.length - 1][1];
}
/** Remaining fraction r^(f - f0), 1 before f0. */
const decay = (f, f0, r) => (f <= f0 ? 1 : r ** (f - f0));

// Text metrics through a shared 2D canvas (system fonts, so deterministic).
const metricCache = new Map();
function measure(font, text, spacing = 0) {
	const key = `${font}|${spacing}|${text}`;
	if (!metricCache.has(key)) {
		if (!globalThis.__mapleS5Ctx)
			globalThis.__mapleS5Ctx = document.createElement("canvas").getContext("2d");
		const c = globalThis.__mapleS5Ctx;
		c.font = font;
		c.letterSpacing = `${spacing}px`;
		const m = c.measureText(text);
		c.letterSpacing = "0px";
		metricCache.set(key, {
			w: m.width,
			left: m.actualBoundingBoxLeft,
			right: m.actualBoundingBoxRight,
			asc: m.actualBoundingBoxAscent,
			desc: m.actualBoundingBoxDescent,
			fasc: m.fontBoundingBoxAscent,
		});
	}
	return metricCache.get(key);
}

/** Outline length (px) of one glyph: edge pixels of its raster x1.12 (the
 * diagonal correction; fitted on the f641-f646 draw-on), cached. Drives the stroke draw-on of the last glyph
 * ('m' in Arial Bold 245 px: ~1110 px). */
function outlineLength(font, ch) {
	const key = `ol|${font}|${ch}`;
	if (!metricCache.has(key)) {
		const m = measure(font, ch);
		const w = Math.ceil(m.left + m.right + 8);
		const h = Math.ceil(m.asc + m.desc + 8);
		const cv = document.createElement("canvas");
		cv.width = w;
		cv.height = h;
		const c = cv.getContext("2d");
		c.font = font;
		c.fillStyle = "#fff";
		c.fillText(ch, 4 + m.left, 4 + m.asc);
		const px = c.getImageData(0, 0, w, h).data;
		const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] > 127;
		let n = 0;
		for (let y = 0; y < h; y++)
			for (let x = 0; x < w; x++)
				if (on(x, y) && !(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1))) n++;
		metricCache.set(key, Math.max(1, n * 1.12));
	}
	return metricCache.get(key);
}

const sid = (s) => s.replace(/[^a-zA-Z0-9_-]/g, "");

/**
 * The variation mark as the montage / tile / lockup show it: a heavily
 * rounded hexagon (~80 mark units: 183 x 206 px at f511, 210 x 237 at
 * f646) with the samara-blades knockout. Own geometry call because
 * MapleMark ties the blade rounding to the hexagon's (0.7x), which would
 * melt the blades at this radius. knockout null = a true hole.
 */
function BladesMark({
	cx,
	cy,
	width,
	radius = 80,
	inner = 10,
	colour = Q.pure,
	gradient = null,
	knockout = null,
	opacity = 1,
	blurX = 0,
}) {
	const uid = sid(React.useId());
	const k = width / MARK.w;
	const pad = 4 + blurX * 3;
	const outer = roundedPath(MARK.hex, radius, k, pad, pad);
	const blades = roundedPath(MARK.blades[0], inner, k, pad, pad);
	const W = width + pad * 2;
	const H = MARK.h * k + pad * 2;
	let paint = rgbs(colour);
	let defs = null;
	if (gradient) {
		const a = (((gradient.angle ?? 180) - 90) * Math.PI) / 180;
		const dx = Math.cos(a) / 2;
		const dy = Math.sin(a) / 2;
		defs = (
			<linearGradient id={`${uid}g`} x1={0.5 - dx} y1={0.5 - dy} x2={0.5 + dx} y2={0.5 + dy}>
				{gradient.stops.map(([p, c], i) => (
					<stop key={i} offset={p} stopColor={rgbs(c)} />
				))}
			</linearGradient>
		);
		paint = `url(#${uid}g)`;
	}
	return (
		<svg
			width={W}
			height={H}
			style={{
				position: "absolute",
				left: cx - W / 2,
				top: cy - H / 2,
				opacity,
				overflow: "visible",
			}}
		>
			<defs>
				{defs}
				{blurX > 0.05 ? (
					<filter id={`${uid}b`} x="-50%" y="-10%" width="200%" height="120%">
						<feGaussianBlur stdDeviation={`${blurX.toFixed(2)} 0`} />
					</filter>
				) : null}
			</defs>
			<g filter={blurX > 0.05 ? `url(#${uid}b)` : undefined}>
				<path d={`${outer.d} ${blades.d}`} fill={paint} fillRule="evenodd" />
				{knockout ? <path d={blades.d} fill={rgbs(knockout)} /> : null}
			</g>
		</svg>
	);
}

// ── s5a: the mockup montage (f511-f570) ───────────────────────────────────

// Placeholder washes: 8 x 5 cell medians of each reference photo (mark box
// excluded; hex, rows split by ' | '), drawn heavily blurred, so an empty slot carries the photo's
// tonal layout (light/dark masses) instead of a flat grey. A real photo
// (`srcs`) replaces it.
const WASH_HEX = {
	"mockup-1":
		"966641 53352b 5da6b2 59a2ad 5299a3 4d939a 565539 865c3f | 161815 20221f 67adb5 62a8af 5b9ea6 55989f 544d33 8a5b3d | 151714 1f211f 7eb3b8 7aafb4 69a2a7 619da1 5a4b31 673d29 | 1b1c14 212320 9eb9ba 96b3b4 85aaab 70a0a3 61452d 70472d | 472c1f 1b1d1a adbcb8 a8b8b6 9ab1af 7ea2a2 6b462e 865436",
	"mockup-2":
		"0c0e0b 101413 3f4242 424342 524e4a 58534c 857360 5e564d | 15140f 1c1d1b 7d878a d6c9bc b7ada3 78786c 6b635b 655442 | 858b8c 8c97a3 a4b6c1 d7dbdc a08e7d 787a7b 8e7d6e 69543d | 707b82 7a7f84 807973 d3d6d8 a9a097 938272 caac88 6a533c | 07100f 0a1213 443d37 817f7d 695f53 816c58 947a5e 4d4135",
	"mockup-3":
		"898683 d8dfda 999080 b09282 938e83 b7b4ab d9deda 482f1f | 37251b b3b6b1 221710 2f1d14 342115 442e20 dee4e4 3e241b | 2e1f16 32271e 110d0b 100c0a 2d1911 382519 dce4e3 4c271a | 282118 7d5940 5e331d 6e422a 694530 1b1f12 d8e1de 3d2016 | 654835 9c7658 9a7555 9d7957 936f50 514331 d9e1dd 090a0b",
	"mockup-4":
		"3f7771 226a72 131512 121411 121411 353310 bdbdb3 c6c7cd | 3d413b 367e83 121412 121411 111310 252911 bbbbc1 a4a9ad | 5b4f45 4c8485 111411 111310 0f110e 251310 5f503b 534e44 | 7f8378 5a8688 121412 111310 10120f 111311 6b635c 58544d | 6b675c 5b8484 111311 111310 111310 5b554a 66605b 605c57",
	"mockup-5":
		"99aeb0 d8ba9d e0c8b6 f4f7f4 f3f5f2 dfc8bb debd9a 81654f | 6e5847 99785d e6d0cb f6f8f5 f6f8f5 f2f4f1 ddbc98 debd9a | 3a2b21 69503e d7d5d2 f5f7f4 f6f8f5 f2f4f1 e1bf9b dab793 | 191b17 664d3a d6d8d5 e1e3e0 f6f8f5 f2f4f1 dfbb94 e2c19c | 282528 5f4736 c9cbc7 dee0dd e4e6e3 eff2ee dcb78e e1be97",
	"mockup-6":
		"e9b597 a96854 b06a5c 151714 30322f 464845 2e312e 1f231f | c9886a 480e06 571b0e 4b241f 4f504e 515350 272b27 151915 | 975d47 381107 120101 060504 4e504d 515350 2f322e 3e423e | 522e22 3e2319 200102 2f302e 515350 474a48 3d413e 303431 | f6fbf7 4a3530 45332c 393b3a 515350 464947 3d423e 363a38",
	"mockup-7":
		"2c261e baaaa5 f4e5e0 f9ede8 f8ede8 a48673 af8065 3c2514 | 2d2820 b1a09c f0dfdb f8e9e5 f6ebe7 e6d5cc 886042 5e3a25 | 2d2820 a89994 ebdbd7 f2e3df f7e8e3 e7d5ce 5c3821 4d2f1b | 2d281f a2938e e5d6d3 f3e5e2 f6e7e2 e2d1ca 4a2b18 402813 | 2f2a22 9f908b e0d2cf f4e5e1 f5e6e0 e0d1ca 3f2612 37210e",
	"mockup-8":
		"626c5e 878362 46422a 2b2e23 252821 1a1c19 1a1f1e 161c1d | 5f675a efefe2 edeee1 eff0e3 f2f3e6 f3f3e6 f4f4ea 1b1f20 | 1c201f d4d4ca d3d3c9 e1e0d4 f0f1e3 edeee0 eeeddf 1b1d1c | 232a2d c2c3ba c9c9c0 d1d0c4 e3e0d4 e9e6da ebe9dd 151819 | 1f292e 323b3f 3b4346 3d4548 3a4245 394244 303b42 1b232a",
};
const WASH = Object.fromEntries(
	Object.entries(WASH_HEX).map(([k, v]) => [
		k,
		v
			.split(" | ")
			.map((row) =>
				row.split(" ").map((h) => [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16))),
			),
	]),
);

/** Blurred cell wash, w x h (cells stretched over the box). */
function Wash({ grid, w, h, blur = 46 }) {
	const uid = sid(React.useId());
	const cw = w / grid[0].length;
	const ch = h / grid.length;
	return (
		<svg width={w} height={h} style={{ ...ABS, display: "block" }}>
			<filter id={`${uid}w`} x="0" y="0" width="100%" height="100%">
				<feGaussianBlur stdDeviation={blur} edgeMode="duplicate" />
			</filter>
			<g filter={`url(#${uid}w)`}>
				{grid.flatMap((row, r) =>
					row.map((c, i) => (
						<rect
							key={`${r}-${i}`}
							x={i * cw}
							y={r * ch}
							width={cw + 0.5}
							height={ch + 0.5}
							fill={rgbs(c)}
						/>
					)),
				)}
			</g>
		</svg>
	);
}

/** The placeholder's own small corner caption (the centred ImageSlot label
 * would sit under the composited mark). */
function SlotCaption({ text, dark }) {
	const col = dark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.5)";
	return (
		<div
			style={{
				position: "absolute",
				left: 18,
				bottom: 18,
				display: "flex",
				alignItems: "center",
				gap: 7,
				font: `500 13px ${FONT}`,
				color: col,
				whiteSpace: "nowrap",
			}}
		>
			<svg width={16} height={16} viewBox="0 0 24 24" fill="none">
				<rect x="3" y="4" width="18" height="16" rx="2.5" stroke={col} strokeWidth="1.8" />
				<circle cx="9" cy="10" r="1.8" stroke={col} strokeWidth="1.8" />
				<path
					d="M4 18l5.5-5 4 3.5 3-2.5 3.5 3"
					stroke={col}
					strokeWidth="1.8"
					strokeLinejoin="round"
				/>
			</svg>
			{text}
		</div>
	);
}

/**
 * Per-mockup layout, measured on each photo's first frame. `rect` = slot box
 * on stage (full frame unless inset). `mark` = the composited variation mark
 * (all centred (639,360), 183 px). `texts` = the strings the photo carries:
 * `i` indexes the slot's strings; sizes from the measured ink widths (m1
 * "Lorem" 67, "Arrow * QuiverAI" 176, "THE" 345 at cap ~125; m3 "Lorem" 150
 * and 53; m4 38 / 36; m8 "LOREM" 365 at cap 76, credit 121). `smalls` = the
 * little logo marks beside a "Lorem".
 */
const MOCKUPS = [
	{
		slot: "mockup-1",
		at: 511,
		mark: { colour: [250, 252, 250] },
		smalls: [{ cx: 329.5, cy: 42.5, w: 40, colour: [250, 252, 250] }],
		texts: [
			{ i: 0, x: 369, base: 51, size: 24, colour: [250, 252, 250] },
			{ i: 1, x: 958, base: 47, size: 23.6, weight: 300, colour: [232, 240, 238], anchor: "end" },
			{
				i: 2,
				x: 642.5,
				base: 755,
				size: 175,
				weight: 700,
				family: "Arial, sans-serif",
				colour: [242, 247, 245],
				anchor: "middle",
				ls: -2,
			},
		],
	},
	{
		slot: "mockup-2",
		at: 517,
		rect: [129, 0, 1021, 707],
		under: 0, // the brochure photo stays visible round the inset
		mark: { colour: [22, 22, 22] },
		texts: [],
	},
	{
		slot: "mockup-3",
		at: 523,
		mark: { colour: [244, 246, 244], opacity: 0.94 },
		smalls: [{ cx: 85.5, cy: 140, w: 33, colour: [244, 246, 244] }],
		texts: [
			{ i: 0, x: 640, base: 538, size: 54, weight: 300, colour: [244, 246, 244], anchor: "middle" },
			{ i: 0, x: 116, base: 147, size: 19, colour: [244, 246, 244] },
		],
	},
	{
		slot: "mockup-4",
		at: 529,
		mark: { colour: [232, 234, 231] },
		texts: [
			{ i: 0, x: 639, base: 66, size: 13.6, colour: [205, 207, 204], anchor: "middle" },
			{ i: 1, x: 640, base: 664, size: 13.5, colour: [205, 207, 204], anchor: "middle" },
		],
	},
	{
		slot: "mockup-5",
		at: 535,
		mark: {
			gradient: {
				angle: 205,
				stops: [
					[0, [96, 186, 200]],
					[0.42, [150, 178, 196]],
					[0.62, [226, 112, 140]],
					[1, [222, 214, 208]],
				],
			},
		},
		texts: [],
	},
	{
		slot: "mockup-6",
		at: 541,
		mark: { colour: [240, 242, 240] },
		texts: [{ i: 0, x: 1233, base: 267, size: 21, colour: [215, 218, 215] }],
	},
	{
		slot: "mockup-7",
		at: 547,
		mark: { colour: [18, 18, 18] },
		texts: [],
	},
	{
		slot: "mockup-8",
		at: 553,
		mark: { colour: [24, 24, 24] },
		texts: [
			{ i: 0, x: 329.5, base: 398, size: 109, weight: 700, colour: [20, 20, 20], anchor: "middle" },
			{ i: 1, x: 948.5, base: 398, size: 109, weight: 700, colour: [20, 20, 20], anchor: "middle" },
			{ i: 2, x: 1140, base: 206, size: 16.2, colour: [45, 45, 45], anchor: "end" },
		],
	},
];

function MockupTexts({ texts, strings }) {
	return (
		<svg width={1280} height={720} style={{ ...ABS, overflow: "visible" }}>
			{texts.map((tx, n) => {
				const s = (strings[tx.i] ?? "").replace(/…$/, "");
				if (!s) return null;
				return (
					<text
						key={n}
						x={tx.x}
						y={tx.base}
						fill={rgbs(tx.colour)}
						fontFamily={tx.family ?? FONT}
						fontSize={tx.size}
						fontWeight={tx.weight ?? 400}
						letterSpacing={tx.ls ?? 0}
						textAnchor={tx.anchor ?? "start"}
					>
						{s}
					</text>
				);
			})}
		</svg>
	);
}

function MockupLayer({ m, cfg }) {
	const [x, y, w, h] = m.rect ?? [0, 0, 1280, 720];
	const src = cfg.srcs?.[m.slot] ?? null;
	const strings = cfg.strings?.[m.slot] ?? SLOTS[m.slot]?.strings ?? [];
	const grid = WASH[m.slot];
	const centre = grid ? grid[2][3] : [128, 128, 128];
	const corner = grid ? grid[grid.length - 1][0] : [128, 128, 128];
	const dark = corner[0] + corner[1] + corner[2] < 380;
	const mk = m.mark;
	return (
		<div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden" }}>
			<ImageSlot
				slot={m.slot}
				src={src}
				label=" "
				width={w}
				height={h}
				style={src ? null : { background: rgbs(centre) }}
			>
				{src ? null : (
					<>
						{grid ? <Wash grid={grid} w={w} h={h} /> : null}
						<SlotCaption
							text={cfg.labels?.[m.slot] ?? SLOTS[m.slot]?.label ?? m.slot}
							dark={dark}
						/>
					</>
				)}
				<div style={{ position: "absolute", left: -x, top: -y, width: 1280, height: 720 }}>
					<BladesMark
						cx={cfg.markX ?? 639}
						cy={cfg.markY ?? 360}
						width={cfg.markPx ?? 183}
						radius={cfg.markRadius ?? 80}
						colour={mk.colour ?? Q.pure}
						gradient={mk.gradient ?? null}
						opacity={mk.opacity ?? 1}
						knockout={src ? null : centre}
					/>
					{(m.smalls ?? []).map((s, n) => (
						<BladesMark
							key={n}
							cx={s.cx}
							cy={s.cy}
							width={s.w}
							radius={80}
							colour={s.colour}
							knockout={src ? null : centre}
						/>
					))}
					<MockupTexts texts={m.texts} strings={strings} />
				</div>
			</ImageSlot>
		</div>
	);
}

function mockupMontage(cfg, t) {
	if (!isLive(cfg, t)) return null;
	// +0.02: a cut frame lands on the new photo despite float error
	const f = filmFrame(cfg, t, 510.99) + 0.02;
	let idx = -1;
	for (let i = 0; i < MOCKUPS.length; i++) if (f >= MOCKUPS[i].at) idx = i;
	if (idx < 0) return null;
	const cur = MOCKUPS[idx];
	const layers = cur.under != null ? [MOCKUPS[cur.under], cur] : [cur];
	return (
		<div style={{ ...ABS, width: 1280, height: 720, overflow: "hidden" }}>
			{layers.map((m) => (
				<MockupLayer key={m.slot} m={m} cfg={cfg} />
			))}
		</div>
	);
}

// ── s5b: the prompt card (f571-f646) ──────────────────────────────────────

const CARD = { x: 138, y: 224, w: 1004, h: 271, r: 26 };
const ORIGIN = [640.5, 360.5];
const TILE = { x: 166, y: 252, s: 83, r: 13, mark: 38 };
const BTN = { x: 1025, y: 376, s: 97, r: 21 };
const TEXT = { x: 177, base: 428.5, size: 42.8 };
const GRID = { px: 53.375, py: 64, x0: 641, y0: 41, dot: 2.3, big: 4.2 };

/** Settle frame of placeholder glyph u (0 = first, 1 = last), measured f572-f586. */
const WAVE = [
	[0, 572.5],
	[0.214, 575],
	[0.393, 577],
	[0.571, 579],
	[0.714, 580.8],
	[0.857, 582.6],
	[0.929, 584.3],
	[1, 586],
];
/** Appear frame per typed glyph ("Add a wordmark to this logo", ink right
 * edges per frame f603-f629). Other strings are resampled by position. */
const TYPE_AT = [
	602.6, 604.6, 606.6, 608.6, 608.6, 610.2, 610.2, 611.1, 611.6, 612.2, 612.9, 613.2, 614, 615,
	615.6, 615.6, 616.1, 617.6, 617.6, 618.2, 619, 619.6, 621.6, 621.6, 622.6, 624.6, 625.9,
];

function entrance(f) {
	const n = Math.max(0, f - 571);
	const p = 0.76 ** n;
	const th = f >= 587 ? 0 : 48 * (1 - n / 16) ** 1.5;
	return { ty: 242 * p, s: 1 + 0.257 * p, rx: th, blur: f < 584 ? 4.1 * p : 0 };
}

function SendBtn({ press }) {
	const sc = 1 - 0.24 * clamp01(press);
	const inv = press > 0.5;
	const top = inv ? [27, 82, 224] : [29, 90, 238];
	const bot = inv ? [30, 92, 240] : [27, 82, 224];
	const a = BTN.s * 0.44;
	return (
		<div
			style={{
				position: "absolute",
				left: BTN.x,
				top: BTN.y,
				width: BTN.s,
				height: BTN.s,
				borderRadius: BTN.r,
				background: `linear-gradient(180deg, ${rgbs(top)}, ${rgbs(bot)})`,
				boxShadow: "0 3px 8px rgba(28,86,231,0.22), inset 0 0 0 1px rgba(20,60,190,0.35)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				transform: `scale(${sc.toFixed(4)})`,
				filter: press > 0.05 && press < 0.95 ? "blur(0.6px)" : undefined,
			}}
		>
			<svg width={a} height={a} viewBox="0 0 24 24" fill="none">
				<path
					d="M12 20V4.5M5 11.5L12 4.5l7 7"
					stroke="#fff"
					strokeWidth="1.9"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}

// The line box is the font's own (line-height normal), so its baseline sits
// fontBoundingBoxAscent below the top: place that on the measured baseline.
const lineStyle = (colour) => {
	const font = `400 ${TEXT.size}px ${FONT}`;
	return {
		position: "absolute",
		left: TEXT.x,
		top: TEXT.base - measure(font, "Hg").fasc,
		display: "flex",
		alignItems: "baseline",
		whiteSpace: "pre",
		font,
		lineHeight: "normal",
		color: rgbs(colour),
	};
};

function Placeholder({ text, f }) {
	if (f >= 603) return null;
	const chars = [...text];
	const n = chars.length;
	const fadeOut = f >= 601.6 ? clamp01((603 - f) / 1.4) : 1;
	const outBlur = f >= 601.6 ? 2.2 * (1 - fadeOut) : 0;
	// the whole line keeps sinking into place after the wave (first glyphs'
	// top 15 px low at f574, 11 f576, 9 f578, 6 f581, 2 f585: x0.85/frame)
	const tail = Math.min(16, 15 * 0.85 ** (f - 574));
	return (
		<div
			style={{
				...lineStyle([110, 112, 109]),
				transform: `translateY(${tail.toFixed(2)}px)`,
				opacity: fadeOut,
				filter: outBlur > 0.05 ? `blur(${outBlur.toFixed(2)}px)` : undefined,
			}}
		>
			{chars.map((c, i) => {
				const S = table(WAVE, n > 1 ? i / (n - 1) : 0);
				const q = clamp01(1 - (S - f) / 8);
				const dy = 28 * (1 - q) ** 2;
				const bl = 5.5 * (1 - q) ** 1.4;
				return (
					<span
						key={i}
						style={{
							display: "inline-block",
							transform: dy > 0.05 ? `translateY(${dy.toFixed(2)}px)` : undefined,
							filter: bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : undefined,
							opacity: clamp01(q * 1.25),
						}}
					>
						{c}
					</span>
				);
			})}
		</div>
	);
}

function TypedPrompt({ text, f, schedule }) {
	if (f < 602.5) return null;
	const chars = [...text];
	const n = chars.length;
	const sch = schedule ?? TYPE_AT;
	const rows = sch.map((v, j) => [j / Math.max(1, sch.length - 1), v]);
	const at = (i) => (n === sch.length ? sch[i] : table(rows, n > 1 ? i / (n - 1) : 0));
	return (
		<div style={{ ...lineStyle([6, 7, 6]), left: TEXT.x - 1 }}>
			{chars.map((c, i) => {
				const a = at(i);
				if (f < a) return null;
				const q = clamp01((f - a) / 1.6);
				const s = 0.35 + 0.65 * outC(q);
				const bl = 2.6 * (1 - q);
				return (
					<span
						key={i}
						style={{
							display: "inline-block",
							transformOrigin: "50% 85%",
							transform: q < 1 ? `scale(${s.toFixed(3)})` : undefined,
							filter: bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : undefined,
							opacity: Math.min(1, 0.45 + q),
						}}
					>
						{c}
					</span>
				);
			})}
		</div>
	);
}

function PromptCardView({ cfg, f }) {
	const uid = sid(React.useId());
	const e = entrance(f);
	// click: the card turns about Y (left side forward), measured on the tile
	// and button f629-f634
	const turn = table(
		[
			[629.6, 0],
			[630, 0.29],
			[631, 0.79],
			[632, 0.93],
			[633, 1],
		],
		f,
	);
	// fitted on tile / text / button / card edges at f634 (residual <= 3 px):
	// rotateY 8.5 deg about x1005, scale 0.945, shift -16.7
	const ry = (cfg.turnDeg ?? 8.5) * turn;
	const tx = -16.7 * turn;
	const ts = 1 - 0.055 * turn;
	const tsy = 1 - 0.03 * turn; // vertical: card height at x900 265 of 271
	const exitN = f - 635.4;
	// exit: card bottom at x900 424,325,249,189,142,105,76,53,35,20 (f636-f645)
	const ex = exitN > 0 ? -520 * (1 - 0.785 ** exitN) - 6 * (1 - 0.75 ** Math.max(0, f - 636.5)) : 0;
	const rz = exitN > 0 ? 2.1 * (1 - 0.72 ** exitN) : 0;
	const press = table(
		[
			[629.9, 0],
			[631, 0.25],
			[632, 1],
			[633.2, 1],
			[634, 0.45],
			[635, 0.1],
			[636, 0],
		],
		f,
	);
	const tileA = 1 - decay(f, 574, 0.765);
	const transform = [
		"perspective(2000px)",
		`translate(0px, ${(e.ty + ex).toFixed(2)}px)`,
		rz ? `rotate(${rz.toFixed(3)}deg)` : "",
		e.rx ? `rotateX(${e.rx.toFixed(3)}deg)` : "",
		`scale(${e.s.toFixed(4)})`,
	].join(" ");
	const turnT = turn
		? `perspective(2000px) translateX(${tx.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg) scale(${ts.toFixed(4)}, ${tsy.toFixed(4)})`
		: undefined;
	return (
		<div
			style={{
				...ABS,
				width: 1280,
				height: 720,
				transformOrigin: `${ORIGIN[0]}px ${ORIGIN[1]}px`,
				transform,
				filter: e.blur > 0.05 ? `url(#${uid}hb)` : undefined,
			}}
		>
			<svg width={0} height={0} style={{ position: "absolute" }}>
				<filter id={`${uid}hb`} x="-5%" y="-5%" width="110%" height="110%">
					<feGaussianBlur stdDeviation={`${e.blur.toFixed(2)} 0`} />
				</filter>
			</svg>
			<div
				style={{
					...ABS,
					width: 1280,
					height: 720,
					transformOrigin: "1005px 360.5px",
					transform: turnT,
				}}
			>
				<div
					style={{
						position: "absolute",
						left: CARD.x,
						top: CARD.y,
						width: CARD.w,
						height: CARD.h,
						borderRadius: CARD.r,
						background: rgbs(Q.white),
						boxShadow:
							"0 0 0 1px rgba(0,0,0,0.035), 0 1px 2px rgba(0,0,0,0.12), 0 4px 9px rgba(0,0,0,0.1), 0 10px 22px rgba(0,0,0,0.06)",
					}}
				/>
				<div
					style={{
						position: "absolute",
						left: TILE.x,
						top: TILE.y,
						width: TILE.s,
						height: TILE.s,
						borderRadius: TILE.r,
						background: rgbs(Q.black),
						opacity: tileA,
					}}
				>
					<BladesMark
						cx={TILE.s / 2}
						cy={TILE.s / 2}
						width={TILE.mark}
						radius={80}
						inner={14}
						colour={Q.pure}
					/>
				</div>
				<Placeholder text={cfg.placeholder ?? "What should Maple draw?"} f={f} />
				<TypedPrompt
					text={cfg.prompt ?? "Add a wordmark to this mark"}
					f={f}
					schedule={cfg.typeAt}
				/>
				<SendBtn press={press} />
			</div>
		</div>
	);
}

function DotGridView({ f }) {
	// entrance: own scale + tilt about (641,360), x0.795 / 0.8 per frame
	const n = Math.max(0, f - 571);
	const sg = 1 + 0.21 * 0.795 ** n;
	const tg = 15 * 0.8 ** n;
	// grey phase: dots jump +75 at the f634 cut and drift up; fade x0.76
	let gy = 0;
	if (f >= 633.5) gy = -104.5 + 179.5 * 0.8 ** Math.max(0, f - 634);
	else if (f >= 632.5) gy = -6;
	const op = f >= 634 ? 0.76 ** (f - 634) : 1;
	if (op < 0.01) return null;
	const dc = rgbs([226, 228, 225]);
	const r = GRID.dot / 2;
	const big = [];
	for (const y of [233, 361]) for (const x of [214, 641, 1068]) big.push([x, y]);
	return (
		<div
			style={{
				position: "absolute",
				left: -320,
				top: -200,
				width: 1920,
				height: 1120,
				opacity: op,
				transformOrigin: "961px 560px",
				transform: `perspective(1600px) rotateX(${tg.toFixed(3)}deg) scale(${sg.toFixed(4)})`,
			}}
		>
			<div
				style={{
					position: "absolute",
					inset: 0,
					backgroundImage: `radial-gradient(circle at 50% 50%, ${dc} ${r}px, transparent ${r + 0.7}px)`,
					backgroundSize: `${GRID.px}px ${GRID.py}px`,
					backgroundPosition: `${(320 + GRID.x0 - GRID.px / 2).toFixed(3)}px ${(200 + GRID.y0 + gy - GRID.py / 2).toFixed(3)}px`,
				}}
			/>
			{big.map(([x, y], i) => (
				<div
					key={i}
					style={{
						position: "absolute",
						left: 320 + x - GRID.big / 2,
						top: 200 + y + gy - GRID.big / 2,
						width: GRID.big,
						height: GRID.big,
						borderRadius: GRID.big / 2,
						background: dc,
					}}
				/>
			))}
		</div>
	);
}

function promptCard(cfg, t) {
	if (!isLive(cfg, t)) return null;
	const f = filmFrame(cfg, t, 570.99);
	if (cfg.layer === "grid") return <DotGridView f={f} />;
	return <PromptCardView cfg={cfg} f={f} />;
}

// ── s5c: the outline wordmark (f634-f661) ─────────────────────────────────

const WORD = {
	family: "Arial, Helvetica, sans-serif",
	weight: 700,
	size: 244.8,
	ls: -2.5,
	base: 447,
};

function OutlineWordmark({ cfg, f }) {
	const word = cfg.word ?? "lorem";
	const font = `${WORD.weight} ${WORD.size}px ${WORD.family}`;
	const m = measure(font, word, WORD.ls);
	// ink-left of the word (incl. the 1 px of stroke outside the outline)
	const inkLeft = 325 + 148 * 0.872 ** (f - 637);
	const x0 = inkLeft + 1 + m.left;
	const chars = [...word];
	const head = chars.slice(0, -1).join("");
	const last = chars[chars.length - 1] ?? "";
	const draw = clamp01((f - 637.7) / 9.8);
	const lastLen = outlineLength(font, last);
	const ghost = f >= 660.9;
	const markX = -207 + 505 * 0.91 ** (f - 636);
	const markV = 505 * Math.log(1 / 0.91) * 0.91 ** (f - 636);
	return (
		<>
			{markX > -140 ? (
				<BladesMark
					cx={markX}
					cy={359.5}
					width={210}
					radius={80}
					colour={Q.pure}
					blurX={0.22 * markV}
				/>
			) : null}
			<svg width={1280} height={720} style={{ ...ABS, overflow: "visible" }}>
				<text
					x={x0}
					y={WORD.base}
					fontFamily={WORD.family}
					fontWeight={WORD.weight}
					fontSize={WORD.size}
					letterSpacing={WORD.ls}
					fill={ghost ? "rgba(255,255,255,0.25)" : "none"}
					stroke="#fff"
					strokeWidth={2}
				>
					<tspan>{head}</tspan>
					<tspan strokeDasharray={draw >= 1 ? undefined : `${(draw * lastLen).toFixed(1)} 100000`}>
						{last}
					</tspan>
				</text>
			</svg>
		</>
	);
}

function outlineWordmark(cfg, t) {
	if (!isLive(cfg, t)) return null;
	const f = filmFrame(cfg, t, 570.99);
	// it exists from the f634 cut; the scene starts with the prompt card so the
	// timeline (sorted by startMs) layers the card above it
	if (f < 633.9) return null;
	return <OutlineWordmark cfg={cfg} f={f} />;
}

// ── s5d: the font flash (f661-f690) ───────────────────────────────────────

/**
 * No blackletter face is installed, so the textura "Lorem" (f661, f682) is
 * DRAWN: each glyph is a few broad-nib pen strokes (nib 35 deg, so verticals
 * read thick with diamond heads and feet, rising diagonals hairline),
 * measured on f663: x-height band y318-470 (152 px = 1 unit), stems ~37 px,
 * glyph boxes L 290-469, o 470-599, r 600-699, e 700-799, m 800-989. Units:
 * x and y in band heights, band top 0, baseline 1. Glyphs not in the set
 * fall back to a heavy serif. Strokes: "x,y x,y ..." pen polylines.
 */
const TEXTURA_SRC = {
	L: [
		1.17,
		[
			"0.24,-0.33 0.38,-0.44 0.38,0.8 0.24,0.98",
			"0.38,-0.44 0.64,-0.53 0.88,-0.42 0.8,-0.34",
			"0.02,1.0 0.24,0.94 0.6,1.04 0.86,0.9 1.08,1.02",
			"0.0,0.36 0.14,0.23 0.38,0.3",
		],
	],
	o: [0.86, ["0.4,-0.04 0.15,0.12 0.15,0.88 0.4,1.04", "0.4,-0.04 0.68,0.12 0.68,0.88 0.4,1.04"]],
	r: [0.66, ["0.06,0 0.16,0.11 0.16,0.9 0.28,1.03", "0.16,0.13 0.4,-0.04 0.58,0.08 0.58,0.22"]],
	e: [
		0.66,
		[
			"0.07,0 0.16,0.11 0.16,0.88 0.32,1.03 0.6,0.84",
			"0.16,0.13 0.4,-0.04 0.58,0.1 0.58,0.3 0.18,0.52",
		],
	],
	m: [
		1.25,
		[
			"0.06,0 0.16,0.11 0.16,0.9 0.26,1.02",
			"0.16,0.13 0.4,-0.04 0.6,0.12 0.6,0.9 0.7,1.02",
			"0.6,0.13 0.84,-0.04 1.05,0.12 1.05,0.88 1.14,1.03 1.24,0.95",
		],
	],
};
const TEXTURA = Object.fromEntries(
	Object.entries(TEXTURA_SRC).map(([c, [adv, strokes]]) => [
		c,
		{ adv, strokes: strokes.map((st) => st.split(" ").map((pt) => pt.split(",").map(Number))) },
	]),
);

/** Broad-nib stroke outline: every segment swept by the nib, each quad wound
 * the same way so a single nonzero path unions them without seams. */
function penPath(points, ox, oy, u, nib, angle) {
	const a = (angle * Math.PI) / 180;
	const nx = (Math.cos(a) * nib) / 2;
	const ny = (-Math.sin(a) * nib) / 2;
	const P = points.map(([x, y]) => [ox + x * u, oy + y * u]);
	let d = "";
	for (let i = 0; i < P.length - 1; i++) {
		const [x0, y0] = P[i];
		const [x1, y1] = P[i + 1];
		let q = [
			[x0 - nx, y0 - ny],
			[x0 + nx, y0 + ny],
			[x1 + nx, y1 + ny],
			[x1 - nx, y1 - ny],
		];
		let area = 0;
		for (let k = 0; k < 4; k++) {
			const [ax, ay] = q[k];
			const [bx, by] = q[(k + 1) % 4];
			area += ax * by - bx * ay;
		}
		if (area < 0) q = q.reverse();
		d += `M${q.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
	}
	return d;
}

function TexturaWord({ text, cx, face }) {
	const u = face.unit;
	const chars = [...text];
	const fallbackFont = `700 ${(u * 1.45).toFixed(1)}px ${face.fallback}`;
	const advs = chars.map((c) => (TEXTURA[c] ? TEXTURA[c].adv * u : measure(fallbackFont, c).w));
	const total = advs.reduce((s, v) => s + v, 0);
	let x = cx - total / 2;
	const top = face.base - u;
	const parts = chars.map((c, i) => {
		const g = TEXTURA[c];
		const x0 = x;
		x += advs[i];
		if (g)
			return (
				<path
					key={i}
					d={g.strokes.map((s) => penPath(s, x0, top, u, face.nib, face.angle)).join("")}
					fill="#fff"
					fillRule="nonzero"
				/>
			);
		return (
			<text key={i} x={x0} y={face.base} fill="#fff" style={{ font: fallbackFont }}>
				{c}
			</text>
		);
	});
	return (
		<svg width={1280} height={720} style={{ ...ABS, overflow: "visible" }}>
			{parts}
		</svg>
	);
}

/**
 * The faces, cut every 3 frames from f661. Font faces: family, weight, the
 * glyph whose ink height sets the size (`hChar`, `h` px), letter spacing
 * (px), horizontal scale `sx`, baseline y, optional `stroke` (px of
 * same-colour stroke, `join` round|miter: weight and rounding). Ink widths
 * to match (ref): rounded 846, serif caps 806, serif 770, techno 858,
 * grotesk 626, round geometric 862. `textura` is the drawn blackletter.
 */
const FACES = {
	blackletter: {
		textura: true,
		unit: 148,
		nib: 46,
		angle: 35,
		base: 470,
		fallback: "Cambria, Georgia, serif",
	},
	rounded: {
		family: `"Segoe UI Black", "Arial Black", sans-serif`,
		weight: 900,
		hChar: "L",
		h: 186,
		ls: 11,
		sx: 1,
		base: 464,
		stroke: 4,
		join: "round",
		goo: 7,
	},
	serifCaps: {
		family: `"Book Antiqua", "Palatino Linotype", Palatino, serif`,
		weight: 400,
		hChar: "H",
		h: 166,
		ls: -6,
		sx: 0.96,
		base: 472,
		stroke: 3.5,
		join: "miter",
	},
	serif: {
		family: `"Times New Roman", Times, serif`,
		weight: 400,
		hChar: "l",
		h: 232,
		ls: 2,
		sx: 1,
		base: 466,
	},
	techno: {
		family: `Bahnschrift, "DIN Alternate", "Segoe UI", sans-serif`,
		weight: 400,
		hChar: "H",
		h: 142,
		ls: 4,
		sx: 1.375,
		base: 463,
	},
	grotesk: {
		family: "Arial, Helvetica, sans-serif",
		weight: 700,
		hChar: "l",
		h: 172,
		ls: 2,
		sx: 1,
		base: 447,
	},
	roundGeo: {
		family: GEO,
		hChar: "L",
		h: 203,
		ls: 6,
		sx: 1,
		base: 460,
		weight: 400,
		stroke: 15,
		join: "round",
	},
};

const FLASH = [
	["blackletter", "Lorem"],
	["rounded", "Lorem"],
	["serifCaps", "LOREM"],
	["serif", "lorem"],
	["techno", "LOREM"],
	["grotesk", "lorem"],
	["roundGeo", "Lorem"],
	["blackletter", "Lorem"],
	["rounded", "Lorem"],
	["serifCaps", "LOREM"],
];

function FlashWord({ face, text, cx }) {
	const uid = sid(React.useId());
	if (face.textura) return <TexturaWord text={text} cx={cx} face={face} />;
	const probe = measure(`${face.weight} 100px ${face.family}`, face.hChar);
	const size = (face.h * 100) / Math.max(1, probe.asc);
	const font = `${face.weight} ${size.toFixed(2)}px ${face.family}`;
	const m = measure(font, text, face.ls);
	const x = cx - ((m.left + m.right) / 2 - m.left);
	const tr =
		face.sx !== 1 ? `translate(${cx} 0) scale(${face.sx} 1) translate(${-cx} 0)` : undefined;
	// goo: blur + alpha threshold rounds every corner of a black grotesk into
	// the bubbly display face (counters survive at this size)
	const gooF = face.goo ? (
		<filter id={`${uid}g`} x="-5%" y="-20%" width="110%" height="140%">
			<feGaussianBlur in="SourceAlpha" stdDeviation={face.goo} result="b" />
			<feComponentTransfer in="b" result="t">
				<feFuncA type="linear" slope="14" intercept="-6.5" />
			</feComponentTransfer>
			<feFlood floodColor="#fff" />
			<feComposite in2="t" operator="in" />
		</filter>
	) : null;
	return (
		<svg width={1280} height={720} style={{ ...ABS, overflow: "visible" }}>
			<defs>{gooF}</defs>
			<g transform={tr} filter={gooF ? `url(#${uid}g)` : undefined}>
				<text
					x={x}
					y={face.base}
					fontFamily={face.family}
					fontWeight={face.weight}
					fontSize={size}
					letterSpacing={face.ls}
					fill="#fff"
					stroke={face.stroke ? "#fff" : undefined}
					strokeWidth={face.stroke ?? undefined}
					strokeLinejoin={face.stroke ? (face.join ?? "miter") : undefined}
				>
					{text}
				</text>
			</g>
		</svg>
	);
}

function fontFlash(cfg, t) {
	if (!isLive(cfg, t)) return null;
	const f = filmFrame(cfg, t, 660.99) + 0.02;
	const i = Math.floor((f - 661) / (cfg.everyFrames ?? 3));
	if (i < 0) return null;
	const seq = cfg.sequence ?? FLASH;
	const [faceName, ref] = seq[Math.min(i, seq.length - 1)];
	const text = cfg.words ? cfg.words[Math.min(i, cfg.words.length - 1)] : ref;
	const face = { ...FACES[faceName], ...(cfg.faces?.[faceName] ?? {}) };
	return <FlashWord face={face} text={text} cx={cfg.cx ?? 639.5} />;
}

export const S5_PRESETS = {
	"maple-mockup-montage": {
		note: "maple's mockup montage (f511-f570): eight photo slots (mockup-1..8) cut hard every 6 frames, the last held 18; the variation mark (blades) is composited at the SAME screen spot on every photo (centre 639,360, 183 px, true-hole knockout) with each photo's strings (slot strings from SLOTS, override with `strings`). mockup-2 is an inset (x129-1149, y0-706) over mockup-1. Empty slots show a blurred tonal wash of the reference layout plus a corner caption; pass `srcs` {slot: path} for real photos.",
		nativeMs: 2000,
		params: {
			strings: [
				"object",
				"SLOTS[slot].strings",
				"per-slot strings, e.g. {'mockup-8':['LOREM','LOREM','Samara · Maple']}",
			],
			srcs: ["object", "{}", "per-slot photo paths {slot: src}"],
			markPx: ["number", 183, "mark width (hexagon) on the photos"],
			frame0: ["number", 510.99, "film frame at startMs (the cut table is on the film clock)"],
		},
		render: mockupMontage,
	},
	"maple-prompt-card": {
		note: "maple's 'add a wordmark' prompt card (f571-f646) on the dot-grid canvas. Render it TWICE: layer 'grid' (the dot grid with its own settle and the grey-phase drift/fade; list it right after the ground) and layer 'card' (list it last). The card enters on a 3D settle (translateY, rotateX, scale, horizontal blur; all x0.76/frame), the placeholder rises in as a left-to-right glyph wave, the tile fades in, the placeholder clears (f602), the prompt types on with popping glyphs (f603-f629), the card turns slightly about Y as the send button is pressed (f630-f635), then exits up with a small CW turn (f635-f646). Pair with maple-ground keys (white, then grey [192] x0.79/frame from f634).",
		nativeMs: 2567,
		params: {
			layer: ["string", "card", "'card' | 'grid'"],
			placeholder: ["string", "What should Maple draw?", "card placeholder (product-voice)"],
			prompt: ["string", "Add a wordmark to this mark", "typed prompt (user-voice)"],
			typeAt: [
				"array",
				"null",
				"optional film-frame appear time per prompt glyph (default: the reference's 27-glyph schedule, resampled for other lengths)",
			],
			frame0: ["number", 570.99, "film frame at startMs"],
		},
		render: promptCard,
	},
	"maple-outline-wordmark": {
		note: "maple's outline wordmark (f634-f661): under the exiting prompt card, the white blades mark slides out left with a horizontal smear while the outline wordmark (bold grotesk, 2 px white stroke, no fill) pans left on its own exponential; the word's last glyph draws on as a stroke (f637.7-f647.5). On the scene's last frame (f661) the word is filled 25% white: the ghost under the first font-flash face. List it BEFORE the prompt card so the card covers it.",
		nativeMs: 3033,
		params: {
			word: ["string", "lorem", "the sample client's wordmark (keep 'lorem' or the client's name)"],
			frame0: [
				"number",
				570.99,
				"film frame at startMs (start it WITH the prompt card, f571, listed before it)",
			],
		},
		render: outlineWordmark,
	},
	"maple-font-flash": {
		note: "maple's font flash (f661-f690): the client's word in a new face every 3 frames (hard cuts), white on black, ink-centred on x639.5; ten states over seven faces (blackletter stand-in, heavy rounded via a goo filter on a black grotesk, serif caps, serif, techno caps, grotesk bold, round geometric). Each face is sized by its measured ink height; override faces / sequence / words.",
		nativeMs: 1000,
		params: {
			words: [
				"array",
				"null",
				"per-state text (default Lorem, Lorem, LOREM, lorem, LOREM, lorem, Lorem, Lorem, Lorem, LOREM)",
			],
			sequence: ["array", "FLASH", "[[faceName, text], ...]"],
			faces: ["object", "{}", "per-face overrides (family, weight, h, ls, sx, base, goo)"],
			everyFrames: ["number", 3, "frames per state"],
			frame0: ["number", 660.99, "film frame at startMs"],
		},
		render: fontFlash,
	},
};
