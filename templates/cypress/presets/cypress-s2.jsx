/**
 * cypress s2 — the agent starts a whiteboard and the team fills it
 * (reference f355 -> f708, 14.79 -> 29.54 s; s3 cuts in at f709).
 *
 * Three presets, all pure functions of t, keyed in reference frames:
 *
 *   cypress-tile-iris   f355-f419  the agent's tile full frame, pushing in;
 *                       "Taking notes..." swaps to "Starting whiteboard";
 *                       the loop ribbon travels, then erases; a PIXEL IRIS
 *                       (42.67 px cells) opens the whiteboard from (618,341)
 *                       while the blob shrinks in 3-frame steps to a dot.
 *   cypress-whiteboard  f405-f619  the board as a WORLD under one camera:
 *                       grid draws on, claim 1, the dot becomes the agent's
 *                       cursor tag, the docked call window, the sticker, the
 *                       typed heading, 17 sticky notes typed by five name-tag
 *                       cursors and the viewer's pointer, a pan and a push.
 *   cypress-claim-voice f620-f708  cream claim 2, then the voice bubble
 *                       transcribing Voice 2 word by word.
 *
 * Coordinates: stage px (1280 x 720 = reference px / 1.5). The whiteboard
 * WORLD is the stage at f604 (camera scale 1, pan 0). Everything measured in
 * stage px at frame F is mapped back to world with the camera at F (see
 * toWorld), so all cursor tables below are in measured stage px.
 */
import React from "react";
import { clamp01 } from "../../../src/lib/textcards/src/easing.js";
import {
	AgentTile,
	CallMini,
	curve,
	GridGround,
	HEAVY,
	hash,
	Layer,
	mix,
	NameTag,
	P,
	Pointer,
	refFrame,
	rgbs,
	SANS,
	SERIF,
	Sticker,
	Sticky,
	stickyPop,
	TAG,
	TAG_GROW,
	VoiceBubble,
	WorkLoop,
	wordColours,
} from "./cypress-shared.jsx";

// ── shared bits of this section ───────────────────────────────────────────

/*
 * A serif claim line arriving (claim 1 f422/f425, claim 2 f620/f624): it
 * lands at ~36% opacity ~27 px low and settles up on a decaying step while
 * it darkens (rows 337->330->324->320->317->315->314 f422-f428).
 */
const CLAIM_IN_A = [
	[0, 0.3],
	[1, 0.5],
	[2, 0.62],
	[3, 0.72],
	[4, 0.8],
	[5, 0.86],
	[6, 0.91],
	[7, 0.95],
	[9, 1],
];
const CLAIM_IN_DY = [
	[0, 27],
	[1, 20],
	[2, 14],
	[3, 10],
	[4, 7],
	[5, 5],
	[6, 4],
	[7, 3],
	[8, 2],
	[10, 1],
	[14, 0],
];

function ClaimLine({
	text,
	cx,
	top,
	size,
	age,
	out = 1,
	lift = 0,
	ink = P.ink,
	track = 2,
	stroke = 0.55,
}) {
	if (age < 0) return null;
	const a = curve(CLAIM_IN_A, age) * out;
	if (a <= 0.002) return null;
	const dy = curve(CLAIM_IN_DY, age);
	return (
		<div
			style={{
				position: "absolute",
				left: cx - 700,
				width: 1400,
				top: top - size * 0.1 + dy + lift,
				textAlign: "center",
				font: `400 ${size}px ${SERIF}`,
				WebkitTextStroke: `${stroke}px ${rgbs(ink, a)}`,
				lineHeight: `${size}px`,
				letterSpacing: track,
				color: rgbs(ink, a),
				whiteSpace: "nowrap",
			}}
		>
			{text}
		</div>
	);
}

// ── 1. the tile and the pixel iris ────────────────────────────────────────

/*
 * Tile world = the stage at f355 (hard cut in from the title card): the tile
 * is 938 x 539 at (172,89) on black, radius ~16, chip 190 x 79 at (210,518).
 * The camera pushes in about (641,358): tile width 938 f355, 1078 f356, 1101,
 * 1133, 1143, 1148 f360 ... 1203 f370, 1230 f382, 1261 f391, 1279 f399, then
 * (blob size) 1.41x f405 accelerating to ~2.1x f419 under the iris.
 */
const T_O = [641, 358];
const TILE_GROUND = [11, 13, 10]; // f355-f399 around the tile (not the call's pure black)
const T_S = [
	[355, 1],
	[356, 1.149],
	[357, 1.174],
	[358, 1.208],
	[359, 1.219],
	[360, 1.224],
	[361, 1.239],
	[362, 1.244],
	[363, 1.256],
	[365, 1.27],
	[367, 1.275],
	[369, 1.282],
	[372, 1.29],
	[376, 1.296],
	[380, 1.308],
	[384, 1.322],
	[388, 1.335],
	[392, 1.346],
	[396, 1.358],
	[399, 1.364],
	[402, 1.386],
	[405, 1.413],
	[406, 1.43],
	[407, 1.45],
	[408, 1.48],
	[409, 1.51],
	[410, 1.55],
	[411, 1.6],
	[412, 1.65],
	[413, 1.7],
	[414, 1.76],
	[415, 1.8],
	[416, 1.86],
	[417, 1.92],
	[418, 2.0],
	[419, 2.1],
];
/*
 * The loop glyph in tile world (f380): ribbon span 438..823 on baseline
 * 330.5 (half-span 192.5), blob centre (644,299) r ~84 (coral bbox 184 f355),
 * stroke ~14. The ribbon erases from its left end f401-f411 (left end at
 * u -0.8 f402, -0.42 f406 (loop still whole), 0 f408, +0.8 f410), the right
 * end trims f410.
 */
const RIB_U0 = [
	[400, -1],
	[401, -0.9],
	[402, -0.8],
	[404, -0.75],
	[405, -0.6],
	[406, -0.42],
	[407, -0.15],
	[408, 0.02],
	[409, 0.6],
	[410, 0.8],
	[411, 1],
];
/* Ribbon shape for the full-frame tile (loops ~0.75 of the half-span tall, near upright). */
const RIBBON = { lambda: 0.75, A: 0.38, H: 0.66, lean: 0.08, envCut: 0.2, envPow: 0.8 };
const RIB_U1 = [
	[409, 1],
	[410, 0.9],
];
/*
 * The blob shrinks in 3-frame STEPS under the iris (pixel feel), while the
 * push keeps growing it ~3%/frame between steps: coral width 263 f406, 246
 * f407, 256 f409, 218 f410, 232 f412, 171 f413, 175 f415, 86 f416, 93 f418,
 * 52 f419, then the 22 px dot f420 (the board's agent cursor takes over).
 */
const BLOB_STEP = (fi) =>
	fi < 407
		? 1
		: fi < 410
			? 0.922
			: fi < 413
				? 0.764
				: fi < 416
					? 0.547
					: fi < 419
						? 0.251
						: fi < 420
							? 0.135
							: 0;
/* Blob centre on stage once the iris runs (it drifts down-right as it shrinks). */
const BLOB_C = [
	[405, [643, 277]],
	[407, [644, 273]],
	[408, [644, 273]],
	[409, [647, 274]],
	[410, [649, 277]],
	[412, [648, 279]],
	[413, [651, 283]],
	[415, [653, 284]],
	[416, [655, 290]],
	[418, [657, 291]],
	[419, [658, 293]],
];
/*
 * PIXEL IRIS: cells of 42.67 px (= 64 ref px) on the stage grid. A cell is
 * paper once its centre is within R(f-1) cells of the iris centre (cell
 * coords 14.5, 8.0 = stage 618.7, 341.3), half paper (the grey ring, 50%
 * paper over the tile = [135,135,132]) within R(f). R from the row extents:
 * f409 4.4, f410 5.6, f411 7.3, f412 8.5, f413 10.3, f414 12.3, f415 14.3,
 * f416 16.3 ... the last corner cells turn f418-f419. One ring per frame.
 */
const IRIS_R = [
	[405, 0],
	[406, 0.8],
	[407, 1.7],
	[408, 3.0],
	[409, 4.4],
	[410, 5.6],
	[411, 7.3],
	[412, 8.5],
	[413, 10.3],
	[414, 12.3],
	[415, 14.3],
	[416, 16.3],
	[417, 16.9],
	[418, 17.3],
	[419, 17.8],
	[420, 19],
];
const CELL = 1280 / 30;

function irisCells(fi) {
	const R = curve(IRIS_R, fi);
	const Rp = R - 1; // the half-paper ring is one cell deep (row extents: paper(f) = ring(f) - 1 cell)
	let hole = "";
	let grey = "";
	for (let j = 0; j < 17; j++)
		for (let i = 0; i < 30; i++) {
			const d = Math.hypot(i + 0.5 - 14.5, j + 0.5 - 8);
			const x = i * CELL;
			const y = j * CELL;
			if (d <= Rp && Rp > 0.05)
				hole += `M${x.toFixed(2)} ${y.toFixed(2)}h${CELL.toFixed(3)}v${CELL.toFixed(3)}h${(-CELL).toFixed(3)}Z`;
			else if (d <= R && R > 0.05)
				grey += `M${x.toFixed(2)} ${y.toFixed(2)}h${CELL.toFixed(3)}v${CELL.toFixed(3)}h${(-CELL).toFixed(3)}Z`;
		}
	return { hole, grey };
}

/* Status swap (f366-f372): the old line fades and lifts ~9 px over f366-f368;
 * the new one rises ~22 px into place word by word, one frame apart. */
const ST1_A = [
	[365, 1],
	[366, 0.95],
	[367, 0.78],
	[368, 0.46],
	[368.95, 0.3],
	[369, 0],
];
const ST1_DY = [
	[365, 0],
	[366, -2.5],
	[367, -5],
	[368, -9],
];
const ST2_A = [
	[0, 0.62],
	[1, 0.78],
	[2, 0.9],
	[3, 1],
];
const ST2_DY = [
	[0, 22],
	[1, 15],
	[2, 9.5],
	[3, 6],
	[5, 3],
	[7, 0],
];

function tileIris(c, t) {
	const f = refFrame(c, t, 355) + 0.01; // +0.01: frame t=N/24 lands on N, not N-1e-9
	const fi = Math.floor(f + 1e-6);
	const S = curve(T_S, f);
	const status1 = c.status1 ?? "Taking notes...";
	const status2 = c.status2 ?? "Starting whiteboard";
	const name = c.agentName ?? "Cypress";
	const ph = f * 0.06;
	const { hole, grey } = fi >= 405 ? irisCells(fi) : { hole: "", grey: "" };
	const clip = hole ? `path(evenodd, "M0 0H1280V720H0Z${hole}")` : undefined;
	const tileXf = {
		position: "absolute",
		left: 0,
		top: 0,
		width: 1280,
		height: 720,
		transformOrigin: `${T_O[0]}px ${T_O[1]}px`,
		transform: `scale(${S})`,
	};
	const a1 = curve(ST1_A, f);
	const w2 = status2.split(" ");
	const step = BLOB_STEP(fi);
	const blobStage = f < 405 ? null : curve(BLOB_C, f);
	return (
		<Layer z={30} style={{ background: "transparent" }}>
			{/* the dark tile (clipped by the iris) */}
			<div
				style={{ position: "absolute", inset: 0, background: rgbs(TILE_GROUND), clipPath: clip }}
			>
				<div style={tileXf}>
					<div style={{ position: "absolute", left: 172, top: 89 }}>
						<AgentTile w={938} h={539} k={1.14} name={name} status="" radius={16} />
					</div>
					{a1 > 0 ? (
						<div
							style={{
								position: "absolute",
								left: 0,
								width: 1282,
								top: 415 - 8.5 + curve(ST1_DY, f),
								textAlign: "center",
								font: `400 40px ${SANS}`,
								lineHeight: "40px",
								color: rgbs(P.white, a1),
								whiteSpace: "nowrap",
							}}
						>
							{status1}
						</div>
					) : null}
					{f >= 369 ? (
						<div
							style={{
								position: "absolute",
								left: 0,
								width: 1282,
								top: 419 - 8.5,
								textAlign: "center",
								font: `400 40px ${SANS}`,
								lineHeight: "40px",
								color: rgbs(P.white),
								whiteSpace: "nowrap",
							}}
						>
							{w2.map((w, i) => {
								const age = f - 369 - i;
								return (
									<span
										key={i}
										style={{
											display: "inline-block",
											opacity: age < 0 ? 0 : curve(ST2_A, age),
											transform: `translateY(${age < 0 ? 22 : curve(ST2_DY, age)}px)`,
										}}
									>
										{w}
										{i < w2.length - 1 ? " " : ""}
									</span>
								);
							})}
						</div>
					) : null}
				</div>
				{grey ? (
					<svg width="1280" height="720" style={{ position: "absolute", left: 0, top: 0 }}>
						<path d={grey} fill={rgbs(P.paper)} fillOpacity={0.5} shapeRendering="crispEdges" />
					</svg>
				) : null}
			</div>
			{/* the glyph rides over the iris (never clipped); the ribbon stays above the blob */}
			{blobStage && step > 0 ? (
				<div style={{ position: "absolute", left: blobStage[0], top: blobStage[1] }}>
					<WorkLoop
						line={false}
						blobR={84 * S * step}
						blobDx={0}
						blobDy={0}
						phase={ph}
						amp={0.035}
					/>
				</div>
			) : null}
			<div style={tileXf}>
				<div style={{ position: "absolute", left: 630.5, top: 330.5 }}>
					<WorkLoop
						hw={192.5}
						f={f}
						u0={curve(RIB_U0, f)}
						u1={curve(RIB_U1, f)}
						blob={!blobStage}
						blobR={84}
						blobDx={13.5}
						blobDy={-31.5}
						stroke={14}
						phase={ph}
						amp={0.035}
						ribbon={RIBBON}
					/>
				</div>
			</div>
		</Layer>
	);
}

// ── 2. the whiteboard world ───────────────────────────────────────────────

/*
 * Camera. One zoom S about O (636-640, 345-360 measured; one point used)
 * moves EVERYTHING (board and docked window): grid 40.0 px f424 -> 42.6
 * f490 (claim width 535 f432 -> 559 f484), held at 1 f496-f604, then a push
 * that accelerates into the cut (heading right edge 970 f604, 973 f610,
 * 980 f615, 990 f618, 996 f619). A board-only vertical PAN (the window
 * stays put) scrolls the board up 77 px: sticker centre y 212 f497, 199
 * f504, 168 f508, 157 f512, 148 f520, 142 f540, 136 f600, 135 f604.
 */
const O = [638, 355];
const B_S = [
	[405, 0.888],
	[418, 0.921],
	[424, 0.9375],
	[430, 0.954],
	[436, 0.961],
	[442, 0.966],
	[448, 0.97],
	[454, 0.977],
	[460, 0.982],
	[466, 0.987],
	[472, 0.991],
	[478, 0.994],
	[484, 0.996],
	[490, 0.998],
	[496, 1],
	[604, 1],
	[606, 1.003],
	[608, 1.006],
	[610, 1.009],
	[612, 1.015],
	[614, 1.024],
	[616, 1.039],
	[618, 1.061],
	[619, 1.079],
	[620, 1.1],
];
const B_DY = [
	[497, 77],
	[500, 75],
	[501, 74],
	[502, 71],
	[503, 68],
	[504, 64],
	[505, 56],
	[506, 46],
	[507, 39],
	[508, 33],
	[509, 29],
	[510, 26],
	[511, 24],
	[512, 22],
	[514, 18],
	[516, 16],
	[520, 13],
	[524, 11],
	[528, 10],
	[532, 9],
	[536, 8],
	[540, 7],
	[560, 4],
	[580, 2],
	[600, 1],
	[604, 0],
];
const camS = (f) => curve(B_S, f);
const camDY = (f) => curve(B_DY, f);
/** Stage px measured at frame f -> board world px. */
const toWorld = (f, x, y) => {
	const s = camS(f);
	return [O[0] + (x - O[0]) / s, O[1] + (y - O[1]) / s - camDY(f)];
};
const worldKeys = (pts) => pts.map(([f, x, y]) => [f, toWorld(f, x, y)]);

/*
 * Grid draw-on f409-f441: every grid line is cut into runs of 2-6 cells that
 * draw on from one end over 3-5 frames, starting at hashed times (sparse
 * long runs f414, most verticals by f424, the full grid by f440).
 * World grid: 42.67 px, lines through x 0 and y 8.33 (stage y 0 at f490).
 */
const GRID = 1280 / 30;
const GRID_OY = 8.333;
const GRID_SEGS = (() => {
	const segs = [];
	let id = 0;
	const add = (vert, pos, from, to) => {
		let a = from;
		while (a < to) {
			const len = (2 + Math.floor(hash(id * 3.1 + 7) * 5)) * GRID;
			const b = Math.min(to, a + len);
			const st = 409 + 29 * hash(id * 1.7 + 0.3) ** 1.15 + (vert ? 0 : 2.5);
			segs.push({
				vert,
				pos,
				a,
				b,
				st,
				dur: 3 + 2 * hash(id + 0.9),
				dir: hash(id * 5.3) < 0.5 ? 1 : -1,
			});
			a = b;
			id++;
		}
	};
	for (let k = -4; k <= 36; k++) add(true, k * GRID, GRID_OY - 6 * GRID, GRID_OY + 20 * GRID);
	for (let j = -6; j <= 20; j++) add(false, GRID_OY + j * GRID, -4 * GRID, 36 * GRID);
	return segs;
})();
const GRID_LINE = [236, 235, 231];

function GridDraw({ f }) {
	if (f >= 442)
		return (
			<GridGround
				x={-400}
				y={-400}
				w={2200}
				h={1500}
				cell={GRID}
				ox={0}
				oy={GRID_OY}
				line={GRID_LINE}
				lineW={1.6}
			/>
		);
	const l = rgbs(GRID_LINE);
	return (
		<>
			<div
				style={{
					position: "absolute",
					left: -400,
					top: -400,
					width: 2200,
					height: 1500,
					background: rgbs(P.paper),
				}}
			/>
			{GRID_SEGS.map((s, i) => {
				const p = clamp01((f - s.st) / s.dur);
				if (p <= 0) return null;
				const len = (s.b - s.a) * (1 - (1 - p) ** 2);
				const start = s.dir > 0 ? s.a : s.b - len;
				return s.vert ? (
					<div
						key={i}
						style={{
							position: "absolute",
							left: s.pos - 0.8,
							top: start,
							width: 1.6,
							height: len,
							background: l,
						}}
					/>
				) : (
					<div
						key={i}
						style={{
							position: "absolute",
							top: s.pos - 0.8,
							left: start,
							height: 1.6,
							width: len,
							background: l,
						}}
					/>
				);
			})}
		</>
	);
}

/*
 * The agent's cursor (coral), measured as its pill's top-left on stage
 * (tip = pill - (10,13)). f420 it is the 22 px dot left by the blob at
 * (641,280); the pill grows rightward out of it f421-f427, glides up-left
 * to rest by the claim (f450), hops to the sticker spot (f486), back up to
 * the heading (f520), dips (f560-f572) and collapses f580-f583.
 */
const AGENT_TIP = [
	[420, 631, 267],
	[422, 631, 265],
	[424, 630, 264],
	[426, 624, 261],
	[428, 607, 254],
	[430, 573, 240],
	[432, 515, 216],
	[434, 455, 192],
	[436, 414, 175],
	[438, 385, 164],
	[440, 365, 156],
	[442, 352, 150],
	[444, 342, 146],
	[446, 336, 143],
	[448, 331, 141],
	[450, 329, 140],
	[452, 328, 140],
	[456, 327, 139],
	[462, 325, 139],
	[464, 322, 141],
	[466, 316, 145],
	[468, 306, 153],
	[470, 287, 169],
	[472, 262, 190],
	[474, 242, 207],
	[476, 228, 218],
	[478, 219, 226],
	[480, 212, 231],
	[482, 208, 235],
	[484, 204, 237],
	[486, 202, 239],
	[488, 201, 239],
	[494, 200, 239],
	[498, 200, 238],
	[500, 200, 236],
	[502, 201, 233],
	[504, 207, 224],
	[506, 227, 202],
	[508, 268, 182],
	[510, 305, 170],
	[512, 327, 162],
	[514, 340, 157],
	[516, 348, 153],
	[518, 352, 151],
	[520, 354, 149],
	[524, 354, 147],
	[532, 354, 145],
	[540, 354, 143],
	[552, 354, 141],
	[558, 355, 141],
	[560, 356, 143],
	[562, 359, 148],
	[564, 361, 153],
	[566, 363, 156],
	[568, 365, 158],
	[572, 366, 160],
	[580, 366, 160],
];
const AGENT_GROW = [
	[420, 0],
	[421, 0.05],
	[422, 0.1],
	[423, 0.2],
	[424, 0.55],
	[425, 0.72],
	[426, 0.85],
	[427, 0.95],
	[428, 1],
	[579, 1],
	[580, 0.82],
	[581, 0.55],
	[582, 0.3],
	[583, 0.08],
];

/*
 * Collaborator cursors (tips on stage). Each enters as a bare arrow, then a
 * dot at the pill's corner grows into the name pill (TAG_GROW, ~8 frames).
 * Ref names -> ours: Vinny->Sam (red), Marcus->Jonah (blue), Ines->Priya
 * (violet), Teo->Luis (pink), June->Dee (teal). The viewer (Maya) is the
 * plain black pointer.
 */
const CURSORS = [
	{
		key: "sam",
		colour: TAG.red,
		arrowFrom: 519,
		dotFrom: 527,
		tip: [
			[520, 965, 460],
			[522, 961, 450],
			[524, 959, 444],
			[526, 957, 440],
			[528, 955, 436],
			[530, 954, 434],
			[532, 953, 432],
			[534, 953, 430],
			[536, 952, 429],
			[538, 952, 427],
			[542, 951, 426],
			[548, 951, 424],
			[554, 951, 423],
			[560, 950, 423],
			[564, 952, 421],
			[566, 953, 419],
			[568, 956, 418],
			[570, 960, 414],
			[572, 966, 409],
			[574, 974, 402],
			[576, 980, 395],
			[578, 986, 391],
			[580, 989, 388],
			[582, 992, 386],
			[584, 993, 384],
			[590, 994, 383],
			[604, 995, 383],
			[608, 996, 383],
			[610, 998, 382],
			[612, 998, 380],
			[614, 999, 376],
			[616, 998, 367],
			[618, 995, 353],
		],
	},
	{
		key: "jonah",
		colour: TAG.blue,
		arrowFrom: 529,
		dotFrom: 535,
		tip: [
			[530, 326, 359],
			[532, 323, 363],
			[534, 317, 374],
			[536, 313, 379],
			[538, 312, 382],
			[540, 311, 384],
			[544, 310, 386],
			[550, 310, 385],
			[556, 310, 383],
			[558, 311, 384],
			[560, 315, 384],
			[562, 322, 384],
			[564, 333, 383],
			[566, 351, 384],
			[568, 380, 385],
			[570, 406, 387],
			[572, 422, 387],
			[574, 430, 387],
			[576, 433, 387],
			[590, 433, 385],
			[600, 432, 385],
			[602, 429, 386],
			[604, 421, 389],
			[606, 410, 393],
			[608, 394, 398],
			[610, 375, 404],
			[612, 356, 410],
			[614, 339, 416],
			[616, 325, 421],
			[618, 310, 425],
		],
	},
	{
		key: "priya",
		colour: TAG.violet,
		arrowFrom: 535,
		dotFrom: 541,
		tip: [
			[536, 702, 369],
			[538, 699, 364],
			[540, 699, 361],
			[542, 698, 358],
			[544, 698, 356],
			[546, 697, 354],
			[548, 697, 352],
			[552, 696, 350],
			[556, 696, 348],
			[558, 695, 347],
			[566, 695, 346],
			[572, 695, 345],
			[582, 695, 344],
			[584, 696, 342],
			[586, 696, 338],
			[588, 697, 332],
			[590, 698, 323],
			[592, 700, 310],
			[594, 702, 292],
			[596, 705, 272],
			[598, 708, 254],
			[600, 710, 239],
			[602, 711, 228],
			[604, 712, 220],
			[606, 713, 214],
			[608, 714, 210],
			[610, 714, 208],
			[612, 715, 206],
			[614, 717, 205],
			[616, 718, 203],
			[618, 719, 200],
		],
	},
	{
		key: "luis",
		colour: TAG.pink,
		arrowFrom: 541,
		dotFrom: 547,
		tip: [
			[542, 233, 622],
			[544, 231, 612],
			[546, 225, 599],
			[548, 223, 591],
			[550, 221, 586],
			[552, 220, 583],
			[554, 219, 581],
			[556, 219, 580],
			[558, 218, 579],
			[564, 218, 578],
			[570, 219, 577],
			[580, 218, 577],
			[582, 219, 576],
			[584, 221, 577],
			[586, 226, 579],
			[588, 236, 582],
			[590, 250, 586],
			[592, 261, 590],
			[594, 269, 592],
			[596, 273, 593],
			[598, 275, 594],
			[600, 276, 594],
			[604, 276, 595],
			[606, 275, 595],
			[608, 274, 596],
			[610, 273, 597],
			[612, 271, 598],
			[614, 268, 600],
			[616, 263, 603],
			[618, 255, 609],
		],
	},
	{
		key: "dee",
		colour: TAG.teal,
		arrowFrom: 547,
		dotFrom: 553,
		tip: [
			[548, 900, 657],
			[550, 898, 655],
			[552, 893, 650],
			[554, 884, 642],
			[556, 879, 637],
			[558, 876, 634],
			[560, 875, 634],
			[562, 874, 633],
			[564, 873, 632],
			[574, 873, 630],
			[576, 874, 630],
			[578, 877, 629],
			[580, 886, 628],
			[582, 902, 625],
			[584, 922, 623],
			[586, 936, 620],
			[588, 946, 619],
			[590, 952, 618],
			[592, 957, 617],
			[594, 960, 616],
			[596, 963, 616],
			[598, 964, 615],
			[600, 965, 615],
			[604, 967, 615],
			[606, 967, 616],
			[608, 968, 617],
			[610, 970, 618],
			[612, 972, 619],
			[614, 975, 622],
			[616, 979, 625],
			[618, 986, 631],
		],
	},
];
/* The viewer's pointer: rises in from below (f500-f516), types the yellow note, slides right (f532-f548), drops (f584-f600). */
const POINTER_TIP = [
	[500, 616, 740],
	[504, 612, 683],
	[508, 605, 635],
	[512, 601, 613],
	[516, 599, 602],
	[520, 598, 596],
	[524, 598, 593],
	[528, 600, 593],
	[532, 609, 595],
	[536, 637, 600],
	[540, 682, 602],
	[544, 699, 598],
	[548, 706, 595],
	[552, 709, 595],
	[572, 709, 592],
	[584, 710, 593],
	[588, 718, 602],
	[592, 733, 619],
	[596, 741, 629],
	[600, 746, 635],
	[604, 748, 637],
	[608, 749, 639],
	[612, 750, 642],
	[616, 753, 648],
	[619, 756, 654],
];

const AGENT_W = worldKeys(AGENT_TIP);
const CURSORS_W = CURSORS.map((c) => ({ ...c, tipW: worldKeys(c.tip) }));
const POINTER_W = worldKeys(POINTER_TIP);

/*
 * Sticky notes, world top-left (156 px square), rotation, first visible frame
 * and typing window (fraction typed on the first frame, frame it completes),
 * mapped 1:1 from the reference's notes by colour/author and slot. Untyped
 * notes land already written (the reference's "pasted" notes).
 */
const NOTE_COLOURS = {
	blue: P.noteBlue,
	lilac: P.noteLilac,
	peach: P.notePeach,
	yellow: P.noteYellow,
	green: P.noteGreen,
	pink: P.notePink,
};
export const S2_NOTES = [
	{
		id: "y1",
		colour: "yellow",
		author: "maya",
		text: "Toasted marshmallow mocha",
		x: 504,
		y: 470,
		rot: 1,
		appear: 514,
		type: [0.2, 532],
	},
	{
		id: "p1",
		colour: "peach",
		author: "sam",
		text: "Gingerbread everything!!!",
		x: 864,
		y: 197,
		rot: -1.5,
		appear: 519,
	},
	{
		id: "b1",
		colour: "blue",
		author: "jonah",
		text: "Maple oat latte",
		x: 174,
		y: 247,
		rot: -0.5,
		appear: 529,
	},
	{
		id: "l2",
		colour: "lilac",
		author: "priya",
		text: "French vanilla please",
		x: 648,
		y: 284,
		rot: 1,
		appear: 535,
		type: [0.22, 556],
	},
	{
		id: "k1",
		colour: "pink",
		author: "luis",
		text: "Spiced mocha?",
		x: 164,
		y: 483,
		rot: 2,
		appear: 543,
		type: [0.25, 564],
	},
	{
		id: "g1",
		colour: "green",
		author: "dee",
		text: "CHURRO LATTE",
		x: 824,
		y: 570,
		rot: -1,
		appear: 549,
		font: 14.5,
	},
	{
		id: "b3",
		colour: "blue",
		author: "jonah",
		text: "Fig & cinnamon",
		x: 410,
		y: 298,
		rot: 0.5,
		appear: 558,
		type: [0.3, 576],
		z: 2,
	},
	{
		id: "p2",
		colour: "peach",
		author: "sam",
		text: "Eggnog cortado!!",
		x: 1006,
		y: 236,
		rot: -1,
		appear: 585,
	},
	{
		id: "y3",
		colour: "yellow",
		author: "maya",
		text: "Lingonberry tonic",
		x: 582,
		y: 635,
		rot: -1,
		appear: 566,
	},
	{
		id: "k2",
		colour: "pink",
		author: "luis",
		text: "Mint mocha?",
		x: 99,
		y: 553,
		rot: 1.5,
		appear: 567,
	},
	{
		id: "b2",
		colour: "blue",
		author: "jonah",
		text: "Honey cardamom",
		x: 342,
		y: 249,
		rot: 0.5,
		appear: 574,
		z: 1,
	},
	{
		id: "p3",
		colour: "peach",
		author: "sam",
		text: "Pumpkin bread latte!!!",
		x: 837,
		y: 326,
		rot: 1,
		appear: 574,
		type: [0.3, 600],
	},
	{
		id: "b4",
		colour: "blue",
		author: "jonah",
		text: "Cinnamon cold foam",
		x: 111,
		y: 331,
		rot: 2,
		appear: 580,
	},
	{
		id: "y2",
		colour: "yellow",
		author: "maya",
		text: "Brown butter, but make it brûlée",
		x: 653,
		y: 455,
		rot: -1.5,
		appear: 581,
	},
	{
		id: "l1",
		colour: "lilac",
		author: "priya",
		text: "Grandma's chai",
		x: 615,
		y: 136,
		rot: 1.5,
		appear: 582,
	},
	{
		id: "k3",
		colour: "pink",
		author: "luis",
		text: "Matcha mocha?",
		x: 300,
		y: 521,
		rot: 1.5,
		appear: 583,
	},
	{
		id: "g2",
		colour: "green",
		author: "dee",
		text: "BLACK SESAME BLIZZARD",
		x: 941,
		y: 520,
		rot: -0.5,
		appear: 589,
		type: [0.25, 612],
	},
];
const PEOPLE = {
	maya: "Maya",
	sam: "Sam",
	jonah: "Jonah",
	priya: "Priya",
	luis: "Luis",
	dee: "Dee",
};

/* Heading typing: share of the line typed, ref f518-f538 (33 chars): the
 * caret lands f518, chars come in ~1.7/frame, done f538, caret off f553. */
const HEAD_P = [
	[519, 0],
	[520, 0.03],
	[522, 0.09],
	[524, 0.18],
	[526, 0.36],
	[528, 0.52],
	[530, 0.64],
	[532, 0.76],
	[534, 0.88],
	[536, 0.94],
	[538, 1],
];
const HEAD_INK = [48, 47, 45];

/* Docked window entry (f441-f454): a ~90 px blurred disc at the window
 * centre (1123,128) unfolds into the 225 x 188 window, overshooting ~4%. */
const WIN_SC = [
	[440.9, 0],
	[441, 0.41],
	[442, 0.53],
	[443, 0.7],
	[444, 0.86],
	[445, 0.97],
	[446, 1.03],
	[447, 1.045],
	[448, 1.04],
	[450, 1.025],
	[452, 1.01],
	[454, 1],
];
const WIN_ROUND = [
	[441, 1],
	[442, 0.55],
	[443, 0.35],
	[444, 0.18],
	[445, 0.08],
	[446, 0],
];
const WIN_A = [
	[441, 0.5],
	[442, 0.85],
	[443, 1],
];
const WIN_BLUR = [
	[441, 5],
	[442, 3],
	[443, 1],
	[444, 0],
];
/* The participants panel opens f486-f502 (window 188 -> 314 tall). */
const WIN_EXPAND = [
	[486, 0],
	[487, 0.03],
	[488, 0.15],
	[490, 0.56],
	[492, 0.78],
	[494, 0.88],
	[496, 0.94],
	[498, 0.97],
	[500, 0.99],
	[502, 1],
];
const WIN_SHOWN = [
	[490, 0],
	[492, 2],
	[494, 4],
	[496, 5],
	[498, 6],
];
const WIN_OTHERS = [
	[494, 0],
	[496, 0.4],
	[498, 0.8],
	[500, 1],
];
/* Its agent tile: idle blob until f470, shrinks/raises f470-f478 while the
 * ribbon draws on from the left f476-f486, then works. */
const WIN_BLOB_R = [
	[470, 32],
	[478, 23.5],
	[488, 26],
];
const WIN_BLOB_Y = [
	[470, 60],
	[478, 46],
];
const WIN_LOOP = [
	[476, 0],
	[478, 0.2],
	[482, 0.62],
	[486, 1],
];

/* Sticker: peeled on f485-f490 (top-left corner unfolding), tape f491-f494. */
const STK_PEEL = [
	[485, 0.95],
	[486, 0.35],
	[487, 0.25],
	[488, 0.17],
	[489, 0.08],
	[490, 0],
];
const STK_TAPE = [
	[490, 0],
	[491, 0.3],
	[492, 0.7],
	[493, 0.9],
	[494, 1],
];

/* Claim 1 exit, line 1 first (f497-f507), as the pan starts. */
const C1_OUT1 = [
	[497, 1],
	[499, 0.8],
	[501, 0.5],
	[503, 0.2],
	[504, 0],
];
const C1_OUT2 = [
	[501, 1],
	[503, 0.85],
	[504, 0.72],
	[506, 0.3],
	[507, 0],
];
/* ...and lifts as it goes (line 1 top 297 f498 -> 269 f503 on stage, ~9 px of it the pan). */
const C1_LIFT = [
	[495, 0],
	[497, -2],
	[499, -4],
	[501, -10],
	[503, -19],
	[507, -30],
];

function Heading({ f, text, x, base, size }) {
	if (f < 518) return null;
	const n = text.length;
	const typed = Math.round(curve(HEAD_P, f) * n);
	// frame at which char i (1-based) was typed
	const at = (i) => {
		for (let g = 519; g <= 538; g += 0.25) if (curve(HEAD_P, g) * n >= i - 0.5) return g;
		return 538;
	};
	const caret = f < 553.5;
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: base - size * 0.914,
				font: `700 ${size}px ${HEAVY}`,
				lineHeight: `${size}px`,
				whiteSpace: "nowrap",
				color: rgbs(HEAD_INK),
			}}
		>
			{text
				.slice(0, typed)
				.split("")
				.map((ch, i) => {
					const age = f - at(i + 1);
					return (
						<span key={i} style={{ color: rgbs(mix(P.coral, HEAD_INK, clamp01((age - 0.5) / 3))) }}>
							{ch}
						</span>
					);
				})}
			{caret ? (
				<span
					style={{
						display: "inline-block",
						width: 2.6,
						height: size * 1.02,
						marginLeft: 2,
						verticalAlign: -size * 0.24,
						background: rgbs(P.coral),
					}}
				/>
			) : null}
		</div>
	);
}

function whiteboard(c, t) {
	const f = refFrame(c, t, 405) + 0.01;
	const S = camS(f);
	const DY = camDY(f);
	const cx = (640 - O[0] * (1 - S)) / S;
	const cy = (360 - O[1] * (1 - S) - S * DY) / S;
	const names = { ...PEOPLE, ...(c.people ?? {}) };
	const agentName = c.agentName ?? "Cypress";
	const notes = (c.notes ?? S2_NOTES).map((n) => ({
		...S2_NOTES.find((d) => d.id === n.id),
		...n,
	}));
	const claim = c.claim1 ?? ["Cypress joins your call", "and builds alongside you"];

	// cursors
	const cursorEls = [];
	if (f >= 419 && f < 584) {
		const [ax, ay] = curve(AGENT_W, f);
		cursorEls.push(
			<div key="agent" style={{ position: "absolute", left: ax, top: ay, zIndex: 50 }}>
				<NameTag
					name={agentName}
					colour={P.coral}
					font={17.5}
					arrowK={1.35}
					grow={curve(AGENT_GROW, f)}
					dot={f < 420 ? 0 : 24}
					arrowOpacity={f < 420 ? 0.6 : f >= 583 ? 0 : 1}
				/>
			</div>,
		);
	}
	for (const cu of CURSORS_W) {
		if (f < cu.arrowFrom) continue;
		const [x, y] = curve(cu.tipW, f);
		const g = f < cu.dotFrom ? -1 : curve(TAG_GROW, f - cu.dotFrom);
		cursorEls.push(
			<div key={cu.key} style={{ position: "absolute", left: x, top: y, zIndex: 50 }}>
				<NameTag
					name={names[cu.key] ?? cu.key}
					colour={cu.colour}
					font={17.5}
					arrowK={1.35}
					grow={Math.max(0, g)}
					dot={g < 0 ? 0 : 8}
					opacity={clamp01((f - cu.arrowFrom) / 1.5 + 0.34)}
				/>
			</div>,
		);
	}
	if (f >= 500) {
		const [x, y] = curve(POINTER_W, f);
		cursorEls.push(
			<div key="ptr" style={{ position: "absolute", left: x, top: y, zIndex: 51 }}>
				<Pointer size={17} />
			</div>,
		);
	}

	// notes
	const noteEls = notes
		.filter((n) => f >= n.appear)
		.sort((a, b) => (a.z ?? 3) - (b.z ?? 3) || a.appear - b.appear)
		.map((n) => {
			const pop = stickyPop(Math.floor(f + 1e-6) - n.appear);
			const len = n.text.length;
			let chars = len;
			let caret = false;
			if (n.type) {
				const [p0, end] = n.type;
				const p = clamp01(p0 + ((1 - p0) * (f - n.appear)) / Math.max(1, end - n.appear));
				chars = Math.floor(p * len + 1e-6);
				caret = f <= (n.caretUntil ?? end + 20); // the author's caret stays ~20 frames after the last key
			}
			return (
				<Sticky
					key={n.id}
					x={n.x}
					y={n.y}
					w={156}
					h={156}
					colour={NOTE_COLOURS[n.colour] ?? n.colour}
					text={n.text}
					chars={chars}
					caret={caret}
					author={names[n.author] ?? n.author}
					rot={n.rot ?? 0}
					scale={pop.scale}
					fold={pop.fold}
					font={n.font ?? 16.5}
					ink={[22, 22, 20]}
				/>
			);
		});

	// claim 1 (world, centre x 637, ascender tops 231 / 289)
	const out1 = f < 497 ? 1 : curve(C1_OUT1, f);
	const out2 = f < 499 ? 1 : curve(C1_OUT2, f);

	const winOn = f >= 440.9;

	return (
		<Layer z={10} style={{ background: rgbs(P.paper) }}>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1280,
					height: 720,
					transformOrigin: "0 0",
					transform: `translate(${640 - cx * S}px, ${360 - cy * S}px) scale(${S})`,
				}}
			>
				<GridDraw f={f} />
				{f < 507 ? (
					<>
						<ClaimLine
							text={claim[0]}
							cx={637}
							top={231}
							size={49}
							track={1}
							stroke={0.9}
							age={f - 422}
							out={out1}
							lift={curve(C1_LIFT, f)}
						/>
						<ClaimLine
							text={claim[1]}
							cx={637}
							top={289}
							size={49}
							track={1}
							stroke={0.9}
							age={f - 425}
							out={out2}
							lift={curve(C1_LIFT, f - 2)}
						/>
					</>
				) : null}
				{f >= 485 ? (
					<div style={{ position: "absolute", left: 150.5, top: 132.5 }}>
						<Sticker
							size={187}
							rot={-8}
							peel={curve(STK_PEEL, f)}
							tape={curve(STK_TAPE, f)}
							src={c.stickerSrc}
							top={c.stickerTop ?? "LITTLE EMBER"}
							bottom={c.stickerBottom ?? "COFFEE"}
							tagline={c.stickerTagline ?? "small batch, big heart"}
						/>
					</div>
				) : null}
				<Heading
					f={f}
					text={c.heading ?? "What’s our winter special this year?"}
					x={308}
					base={121}
					size={42}
				/>
				{noteEls}
				{cursorEls}
			</div>
			{winOn ? (
				<div
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						width: 1280,
						height: 720,
						transformOrigin: `${O[0]}px ${O[1]}px`,
						transform: `scale(${S})`,
					}}
				>
					<CallMini
						x={1027.5}
						y={27}
						w={225}
						expand={curve(WIN_EXPAND, f)}
						scale={curve(WIN_SC, f)}
						roundness={curve(WIN_ROUND, f)}
						opacity={curve(WIN_A, f)}
						blur={curve(WIN_BLUR, f)}
						name={agentName}
						f={f}
						loop={curve(WIN_LOOP, f)}
						blobR={curve(WIN_BLOB_R, f)}
						blobY={curve(WIN_BLOB_Y, f)}
						participants={c.participants}
						shown={curve(WIN_SHOWN, f)}
						othersLabel={c.othersLabel}
						othersOpacity={curve(WIN_OTHERS, f)}
					/>
				</div>
			) : null}
		</Layer>
	);
}

// ── 3. claim 2 and the voice bubble ───────────────────────────────────────

/*
 * Hard cut f620 to a darker cream [236,236,226]. A slow zoom about (639,365)
 * runs under the whole beat (claim width 509 f636, 516 f644, 544 f700) and
 * snaps forward into the cut (550 f702, 559 f704, 575 f706, 606 f708).
 * Claim 2 ascender tops 316 / 371 at zoom 1 (41.7 px serif), line 2 four
 * frames behind line 1. The voice bubble (677 x ~154 at zoom 1, left 536,
 * top 54) rises ~39 px from f644 at 59% opacity, settled by f660.
 */
const Z = [
	[620, 0.967],
	[644, 1],
	[700, 1.054],
	[701, 1.058],
	[702, 1.066],
	[703, 1.074],
	[704, 1.083],
	[705, 1.097],
	[706, 1.114],
	[707, 1.138],
	[708, 1.174],
	[709, 1.22],
];
const BUB_DY = [
	[644, 39],
	[645, 26],
	[646, 21],
	[647, 16],
	[648, 13],
	[649, 10],
	[650, 8],
	[652, 4.5],
	[654, 2],
	[656, 1],
	[660, 0],
];
const BUB_A = [
	[644, 0.59],
	[645, 0.73],
	[646, 0.78],
	[647, 0.82],
	[648, 0.85],
	[649, 0.87],
	[652, 0.9],
	[656, 0.94],
	[660, 0.99],
	[662, 1],
];
/* Word i lands muted at VOICE_AT[i] and whitens over ~2.5 frames; the wake
 * word is coral until f662 (ref "Claude," f644-f662, white by f666). */
const VOICE_AT = [643, 662, 666, 668, 670, 670, 672, 674, 676];

function claimVoice(c, t) {
	const f = refFrame(c, t, 620) + 0.01;
	const z = curve(Z, f);
	const lines = c.claim2 ?? ["So the work starts", "before the meeting ends"];
	const text = c.voice ?? "Cypress, sort these from easiest to hardest to make.";
	const nw = text.match(/\S+\s*/g)?.length ?? 0;
	const at = Array.from(
		{ length: nw },
		(_, i) => VOICE_AT[i] ?? VOICE_AT[VOICE_AT.length - 1] + 2 * (i - VOICE_AT.length + 1),
	);
	const colours = wordColours(nw, f, at, {
		ramp: 2.5,
		accent: { i: [0], until: 662, colour: P.coral },
	});
	return (
		<Layer z={10} style={{ background: rgbs(c.bg ?? [236, 236, 226]) }}>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1280,
					height: 720,
					transformOrigin: "639px 365px",
					transform: `scale(${z})`,
				}}
			>
				<ClaimLine
					text={lines[0]}
					cx={639}
					top={315.8}
					size={46.5}
					track={1}
					stroke={0.9}
					age={f - 620}
				/>
				<ClaimLine
					text={lines[1]}
					cx={639}
					top={370.7}
					size={46.5}
					track={1}
					stroke={0.9}
					age={f - 624}
				/>
				{f >= 644 ? (
					<div style={{ position: "absolute", left: 536, top: 54 + curve(BUB_DY, f) }}>
						<VoiceBubble
							text={text}
							k={0.97}
							width={701}
							height={159}
							colours={colours}
							icon={f < 646 || f >= 696 ? "dots" : "wave"}
							f={f}
							opacity={curve(BUB_A, f)}
						/>
					</div>
				) : null}
			</div>
		</Layer>
	);
}

// ── registry ──────────────────────────────────────────────────────────────

export const S2_PRESETS = {
	"cypress-tile-iris": {
		note: 'The agent\'s tile full frame, pushing in, while its loop ribbon travels and the status swaps ("Taking notes..." -> "Starting whiteboard", word-staggered rise); then the ribbon erases and a stair-stepped PIXEL IRIS of paper (42.67 px cells, one ring per frame, half-paper leading ring) opens the whiteboard underneath as the blob shrinks in 3-frame steps to a dot. Put it on top of `cypress-whiteboard` (it is transparent where the iris has opened). Ref f355-f419.',
		nativeMs: 2708,
		params: {
			agentName: ["string", "Cypress", "agent display name on the chip (role product)"],
			status1: ["string", "Taking notes...", "first status (role product-voice)"],
			status2: ["string", "Starting whiteboard", "second status (role product-voice)"],
			f0: ["number", "355", "reference frame the scene starts on"],
		},
		render: tileIris,
	},
	"cypress-whiteboard": {
		note: "The whiteboard WORLD under one measured camera (zoom about (638,355) + a board-only pan): grid lines draw on, claim 1 rises in, the agent's dot grows into its coral cursor tag, the docked call window unfolds top-right and opens its participants panel, the brand sticker peels on and gets taped, the heading is typed coral-then-ink with a caret, and 17 sticky notes pop in (oversized, corner folded back) one by one, typed by five name-tag cursors and the viewer's pointer; a push into the cut. Every copy string, name and image slot is a field. Ref f405-f619.",
		nativeMs: 8958,
		params: {
			agentName: ["string", "Cypress", "agent cursor + window chip (role product)"],
			claim1: [
				"array",
				'["Cypress joins your call","and builds alongside you"]',
				"two-line serif claim (role brand)",
			],
			heading: [
				"string",
				"What’s our winter special this year?",
				"typed whiteboard heading (role user-voice)",
			],
			notes: [
				"array",
				"S2_NOTES",
				"[{id,text,author,colour,x,y,rot,appear,type:[p0,endFrame]}]; ids y1,p1,b1,l2,k1,g1,b3,p2,y3,k2,b2,p3,b4,y2,l1,k3,g2 merge onto the measured slots (role product)",
			],
			people: [
				"object",
				"{maya,sam,jonah,priya,luis,dee}",
				"collaborator display names (role user-voice)",
			],
			stickerSrc: ["string", "-", "image slot: the brand sticker art (square; role brand)"],
			stickerTop: ["string", "LITTLE EMBER", "drawn sticker, top arc (role brand)"],
			stickerBottom: ["string", "COFFEE", "drawn sticker, bottom arc (role brand)"],
			stickerTagline: ["string", "small batch, big heart", "drawn sticker tagline (role brand)"],
			participants: [
				"array",
				"CALL_PEOPLE",
				"docked window avatars [{name,src,tone,camOff}]; src = photo image slot (role product)",
			],
			othersLabel: ["string", "6 others", "participants label (role product)"],
			f0: ["number", "405", "reference frame the scene starts on"],
		},
		render: whiteboard,
	},
	"cypress-claim-voice": {
		note: "Hard cut to darker cream: claim 2 rises in line by line under a slow zoom that snaps forward into the next cut, then the dark voice bubble rises in and transcribes the request word by word (wake word coral first, words land muted then whiten), icon switching from level bars to dots when it is sent. Ref f620-f708.",
		nativeMs: 3708,
		params: {
			claim2: [
				"array",
				'["So the work starts","before the meeting ends"]',
				"two-line serif claim (role brand)",
			],
			voice: [
				"string",
				"Cypress, sort these from easiest to hardest to make.",
				"the spoken request (role user-voice)",
			],
			bg: ["array", "[236,236,226]", "ground colour"],
			f0: ["number", "620", "reference frame the scene starts on"],
		},
		render: claimVoice,
	},
};
