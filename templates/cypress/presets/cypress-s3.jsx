/**
 * cypress s3 — the sort, the votes and the chat (f709 -> f1136, 29.54 -> 47.37 s).
 *
 * Three presets, measured frame by frame off the reference (24 fps, stage px =
 * reference px / 1.5, frame numbers are reference frames):
 *
 *   cypress-organize-tile  f709-f756  the agent's call tile punches in to full
 *                                     frame, "Organizing ideas" fades in word by
 *                                     word, the blob breathes and a looping line
 *                                     writes itself across it; hard cut at f757.
 *   cypress-sort-board     f757-f943  the whiteboard: a fast pull-back while the
 *                                     agent drags every note into three column
 *                                     panels, then the camera tilts up to the
 *                                     heading, the call window docks top right
 *                                     and collaborators stamp votes; the board
 *                                     then whips up (vertical motion blur) and
 *                                     reveals the chat on black below it.
 *   cypress-chat-stack     f941-f1136 the chat thread on black, framed big: each
 *                                     new message fades up at the bottom while
 *                                     the stack scrolls; a cut to the request,
 *                                     the agent's "On it." and a shrink-away.
 *
 * Every copy string and image slot is a scene field.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import * as SH from "./cypress-shared.jsx";
import {
	AgentBadge,
	Avatar,
	blobPath,
	curve,
	EASE,
	HEAVY,
	Layer,
	mix,
	NameChip,
	NameTag,
	P,
	refFrame,
	rgbs,
	SANS,
	Sticky,
	TAG,
	textWidth,
} from "./cypress-shared.jsx";

// ═══════════════════════════════════════════════════════════════════════════
// 1. cypress-organize-tile  (f709 - f756)
// ═══════════════════════════════════════════════════════════════════════════
//
// Measured (stage px):
//  - Ground outside the tile [18,20,17]; tile body [21,23,20]; chip [14,16,13].
//  - f709 is a hard cut IN to the tile already mid-zoom: tile 933 x 536 centred
//    (639.5,359). It is a camera push on one tile of world size 1262 x 725
//    (aspect 1.741, reached f741-f747), centre (640,359). Tile width / 1262:
//    f709 .739, f710 .853, f711 .883, f712 .904 ... ease-out to 1.000 at f741,
//    holds, then eases back out from f748 (.998) to .958 at f756 (the next
//    shot cuts in at f757).
//  - Blob (coral [208,111,87]) in tile/world px, bbox diameter + centre y:
//    231 @349 (f709-710) rises to 285 by f715 while the status line appears;
//    snaps smaller on its 12 fps morph (188 f716, 155 f720 when the line starts)
//    and grows back to ~208 by f736 as the line is drawn. Centre x ~658.
//    The glyph animates ON TWOS (values repeat in frame pairs).
//  - Status "Organizing ideas": white, centred, cap top y 433 (world), 390 px
//    wide. Word 1 fades in f709->f711, word 2 f711->f714 (it starts ~3 px low).
//  - Chip: world box 59-314 x 575-679 (radius ~20), muted mic + "Claude" ~44 px.
//  - The loop line (white, ~13 px stroke, baseline y 322) writes itself left to
//    right from x 427 (head x: 497 f720, 643 f722, 717 f726, 798 f728, 818
//    f732, 842 f734, 857 f738, 860 f744) while its loops TRAVEL: a curl is born
//    at the left end and grows into a full loop as it drifts right, the middle
//    loop drifts right (610 f726 -> 709 f756) and the right curl shrinks away
//    in place (h 77 f728 -> 19 f742 -> gone f744). Loop tops measured per frame.

const TILE_W = 1262;
const TILE_H = 725;
const TILE_CY = 359;
const TILE_S = [
	[709, 0.739],
	[710, 0.853],
	[711, 0.883],
	[712, 0.904],
	[713, 0.918],
	[714, 0.93],
	[715, 0.937],
	[716, 0.945],
	[717, 0.95],
	[718, 0.956],
	[719, 0.962],
	[720, 0.968],
	[722, 0.973],
	[724, 0.98],
	[726, 0.983],
	[728, 0.988],
	[730, 0.992],
	[733, 0.995],
	[736, 0.997],
	[741, 1],
	[747, 1],
	[748, 0.998],
	[750, 0.995],
	[752, 0.993],
	[753, 0.987],
	[754, 0.98],
	[755, 0.973],
	[756, 0.958],
	[757, 0.94],
];
// [frame, diameter, centre y] in world px (measured stage / tile scale).
const BLOB = [
	[709, 231, 349.5],
	[710, 232, 350],
	[711, 231, 328],
	[712, 230, 305],
	[713, 231, 296],
	[714, 225, 289],
	[715, 225, 285],
	[716, 188, 282],
	[718, 188, 280],
	[719, 188, 279],
	[720, 155, 279],
	[722, 170, 279],
	[724, 170, 279],
	[726, 188, 279],
	[728, 199, 279],
	[730, 199, 280],
	[732, 204, 281],
	[734, 207, 281],
	[736, 208, 281],
	[742, 208, 279],
	[748, 207, 277],
	[756, 207, 280],
];
// Coil: measured in STAGE px at s~0.97-1; converted to world with the tile scale.
const COIL_HEAD = [
	[719.9, 427],
	[720, 497],
	[721, 497],
	[722, 643],
	[724, 646],
	[726, 717],
	[728, 798],
	[730, 806],
	[732, 818],
	[734, 842],
	[736, 854],
	[738, 857],
	[744, 860],
];
// Loops: [frame, centre x, top y of the stroke] (stage px, on twos).
const LOOP_A = [
	[721, 492, 322],
	[722, 491, 303],
	[724, 488, 292],
	[726, 485, 288],
	[728, 479, 280],
	[730, 479, 273],
	[732, 476, 258],
	[734, 479, 245],
	[736, 480, 233],
	[738, 485, 226],
	[740, 492, 216],
	[742, 499, 206],
	[744, 509, 192],
	[746, 520, 187],
	[748, 533, 189],
	[750, 545, 189],
	[752, 547, 191],
	[754, 553, 190],
	[756, 562, 193],
];
const LOOP_B = [
	[722, 634, 244],
	[724, 612, 196],
	[726, 611, 190],
	[728, 618, 187],
	[730, 628, 192],
	[732, 634, 191],
	[734, 645, 191],
	[736, 651, 186],
	[738, 649, 188],
	[740, 657, 186],
	[742, 664, 192],
	[744, 669, 186],
	[746, 676, 185],
	[748, 682, 185],
	[750, 693, 184],
	[752, 696, 190],
	[754, 700, 190],
	[756, 709, 193],
];
const LOOP_C = [
	[727, 787, 322],
	[728, 787, 245],
	[730, 790, 248],
	[732, 792, 260],
	[734, 791, 270],
	[736, 790, 280],
	[738, 788, 289],
	[740, 787, 296],
	[742, 789, 303],
	[744, 789, 322],
];
const COIL_BASE = 322; // stroke centre line (stage)
const COIL_STROKE = 13;

/** Loop height from a measured top-of-stroke y. */
const loopH = (top) => Math.max(0, COIL_BASE - (top + COIL_STROKE / 2));

/**
 * The travelling coil: a baseline from xL to the draw head, with "l" loops
 * inserted as excursions. Each loop occupies a window of the baseline
 * parameter u; inside it the pen rises, turns back over the top and comes down
 * crossing its own up-stroke (x = u + R sin 2πp, y = -h sin² πp).
 */
function coilPath(xL, head, loops, base) {
	let d = "";
	const step = 2;
	for (let u = xL; u <= head + 1e-6; u += step) {
		let x = u;
		let y = base;
		for (const L of loops) {
			if (L.h <= 0.5) continue;
			const w = 34 + 0.3 * L.h; // footprint on the baseline
			const p = (u - (L.c - w / 2)) / w;
			if (p > 0 && p < 1) {
				const R = w * (0.3 + 0.0016 * L.h);
				x = u + R * Math.sin(2 * Math.PI * p);
				y = base - L.h * Math.sin(Math.PI * p) ** 2;
			}
		}
		d += `${d ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
	}
	return d;
}

function OrganizeTile(c, t) {
	const f = refFrame(c, t, 709) + 1e-3;
	const f2 = Math.floor(f / 2) * 2; // the glyph is animated on twos
	const s = curve(TILE_S, f);
	const status = c.status ?? "Organizing ideas";
	const name = c.agentName ?? "Cypress";
	const ws = status.split(" ");
	const w1 = ws[0];
	const w2 = ws.slice(1).join(" ");
	const op1 = curve(
		[
			[709.4, 0],
			[710, 0.75],
			[711, 1],
		],
		f,
	);
	const op2 = curve(
		[
			[711.4, 0],
			[712, 0.82],
			[713, 0.95],
			[714, 1],
		],
		f,
	);
	const dy2 = curve(
		[
			[711.4, 4],
			[714, 0, "o"],
		],
		f,
	);
	const [bd, bcy] = curve(
		BLOB.map(([fr, d0, y0]) => [fr, [d0, y0]]),
		f2,
	);
	const sc2 = Math.max(0.5, curve(TILE_S, f2));
	const toW = (x) => 640 + (x - 640) / sc2;
	const toWy = (y) => TILE_CY + (y - TILE_CY) / sc2;
	const head = f >= 720 ? toW(curve(COIL_HEAD, f2)) : null;
	const loops = [LOOP_A, LOOP_B, LOOP_C]
		.filter((L) => f2 >= L[0][0])
		.map((L) => {
			const [cx, top] = curve(
				L.map(([fr, x, y]) => [fr, [x, y]]),
				f2,
			);
			return { c: toW(cx), h: loopH(top) / sc2 };
		});
	const xL = toW(
		curve(
			[
				[720, 434],
				[722, 432],
				[728, 428],
			],
			f2,
		),
	);
	const base = toWy(COIL_BASE);
	const font = `400 ${c.statusSize ?? 52}px ${SANS}`;
	const wA = textWidth(`${w1} `, font);
	const wAll = textWidth(status, font);
	const x0 = 640 - wAll / 2;
	const tl = 640 - TILE_W / 2;
	const tt = TILE_CY - TILE_H / 2;
	return (
		<Layer z={20} style={{ background: rgbs([18, 20, 17]) }}>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1280,
					height: 720,
					transformOrigin: `640px ${TILE_CY}px`,
					transform: `scale(${s})`,
				}}
			>
				<div
					style={{
						position: "absolute",
						left: tl,
						top: tt,
						width: TILE_W,
						height: TILE_H,
						borderRadius: 16,
						background: rgbs(P.tile),
					}}
				/>
				<svg
					width={1280}
					height={720}
					style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
				>
					<path d={blobPath(658, bcy, bd / 2 / 1.06, f2 * 0.45, 0.05)} fill={rgbs(P.coral)} />
					{head != null ? (
						<path
							d={coilPath(xL, head, loops, base)}
							stroke={rgbs(P.white)}
							strokeWidth={COIL_STROKE}
							strokeLinecap="round"
							strokeLinejoin="round"
							fill="none"
						/>
					) : null}
				</svg>
				<div
					style={{
						position: "absolute",
						left: x0,
						top: 414,
						font,
						whiteSpace: "pre",
						color: rgbs(P.white, op1),
					}}
				>
					{w1}
				</div>
				<div
					style={{
						position: "absolute",
						left: x0 + wA,
						top: 414 + dy2,
						font,
						whiteSpace: "pre",
						color: rgbs(P.white, op2),
					}}
				>
					{w2}
				</div>
				<div style={{ position: "absolute", left: tl + 50, top: tt + 578.5 }}>
					<NameChip name={name} k={2.62} muted bg={[14, 16, 13]} />
				</div>
			</div>
		</Layer>
	);
}

/**
 * Vertical motion-blur sigma (px) for a scroll of v stage px/frame, read off
 * the whip frames: ~2 at 40 (f940), ~3 at 45 (f953), ~9 at 56 (f951), ~14 at
 * 64 (f950), ~20 at 78 (f941), saturating ~26 at the 300+ px/frame peak.
 */
const whipBlur = (v) => (v < 20 ? 0 : 26 / (1 + Math.exp(-(v - 62) / 9)));

// ═══════════════════════════════════════════════════════════════════════════
// 3. cypress-chat-stack  (f941 - f1136)
// ═══════════════════════════════════════════════════════════════════════════
//
// Measured (stage px), ground [0,1,0]:
//  - Cards x 220-1060 (840 wide), body [21,23,20], radius ~22. Avatar 106 px
//    circle centred (card.left+97, card.top+101) — top-aligned, not centred.
//    Name ~600 white, cap top card.top+53; body [220,221,218], first cap top
//    card.top+113, line pitch 65. Heights: 1 line 204, 2 lines 269, 3 lines 334
//    (204 + 65 per extra line). Gap between cards 33.
//  - Whip in (f941-f962): the thread arrives from below at ~340 px/frame
//    under vertical motion blur and settles exponentially (Teo top 472 f951,
//    416, 366, 327, 295, 270, 248, 232, 219, 209, 203, 200, 198 f963).
//  - Each new message (Dee f988, Sam f1014, agent f1047) is ONE step profile:
//    the stack scrolls with progress r=1..11 = .008 .038 .122 .409 .717 .839
//    .907 .949 .975 .992 1 (r = frames after the step's start), and the new
//    card rides in from below, late and fading: offset/opacity r4 +200/.14,
//    r5 +114/.38, r6 +75/.57, r7 +42/.81, r8 +10/1, r9 +2; its text lags the
//    card by ~2 frames. Scrolls: 238 (f988), 269 (f1014), 250 (f1047).
//  - f1080-f1088 the stack eases up (3,7,12,22,34,51,76 px), HARD CUT to two
//    black frames (f1089-1090), then the request card alone fades up (f1091
//    .29, .67, 1) rising 150 -> 51 (f1106) on an exponential.
//  - The agent's reply fades in below it WITHOUT a scroll: f1111 .29 +32 px,
//    f1112 .67 +16, f1113 1 +10, then +6 +4 +2 +1 0 (f1118). Top 448.
//  - f1125-f1136 everything accelerates up (1,2,5,8,14,21,32,45,66,94,141)
//    while the reply card shrinks away toward a chip: scale 1 -> .745 (top-left
//    anchored) and its width hugs inward (x .707 by f1136). Next shot f1137.

const CH = {
	x: 220,
	w: 840,
	gap: 33,
	h1: 204,
	pitch: 65,
	av: 106,
	textX: 189,
	nameTop: 53,
	bodyTop: 113,
};
const CH_NAME = 37;
const CH_BODY = 44;
const CH_TEXT_W = 610;
const STEP = [0, 0.008, 0.038, 0.122, 0.409, 0.717, 0.839, 0.907, 0.949, 0.975, 0.992, 1];
const stepP = (r) =>
	r <= 0 ? 0 : r >= 11 ? 1 : lerp(STEP[Math.floor(r)], STEP[Math.ceil(r)], r - Math.floor(r));
const NEW_IN = [
	[3, 290, 0],
	[4, 200, 0.14],
	[5, 114, 0.38],
	[6, 75, 0.57],
	[7, 42, 0.81],
	[8, 10, 1],
	[9, 2, 1],
	[10, 0, 1],
];
// Whip-in: Teo-card top (stage) per frame; f941-950 extrapolated from the
// measured settle (velocity x ~1.17 per frame back in time) to meet the
// paper edge the board shows (f941 625, f942 280).
const OFF_IN = [
	[940, 2604],
	[941, 2526],
	[942, 2181],
	[943, 1801],
	[944, 1471],
	[945, 1201],
	[946, 991],
	[947, 831],
	[948, 706],
	[949, 611],
	[950, 536],
	[951, 472],
	[952, 416],
	[953, 366],
	[954, 327],
	[955, 295],
	[956, 270],
	[957, 248],
	[958, 232],
	[959, 219],
	[960, 209],
	[961, 203],
	[962, 200],
	[963, 198],
];
/** Distance from the whiteboard's paper bottom to the first thread card's top. */
export const CHAT_PAPER_GAP = 1901;
const PAGE2_IN = [
	[1090.5, 150],
	[1091, 150],
	[1092, 125],
	[1093, 105],
	[1094, 92],
	[1095, 83],
	[1096, 76],
	[1097, 71],
	[1098, 66],
	[1099, 63],
	[1100, 60],
	[1101, 58],
	[1102, 56],
	[1103, 54],
	[1104, 53],
	[1105, 52],
	[1106, 51],
];
const PAGE2_OP = [
	[1090.5, 0],
	[1091, 0.29],
	[1092, 0.67],
	[1093, 1],
];
const REPLY_IN = [
	[1110.5, 40, 0],
	[1111, 32, 0.29],
	[1112, 16, 0.67],
	[1113, 10, 1],
	[1114, 6, 1],
	[1115, 4, 1],
	[1116, 2, 1],
	[1117, 1, 1],
	[1118, 0, 1],
];
const OUT_UP = [
	[1125, 0],
	[1126, -1],
	[1127, -2],
	[1128, -5],
	[1129, -8],
	[1130, -14],
	[1131, -21],
	[1132, -32],
	[1133, -45],
	[1134, -66],
	[1135, -94],
	[1136, -141],
	[1137, -205],
];
const OUT_K = [
	[1128, 1],
	[1129, 0.99],
	[1130, 0.98],
	[1131, 0.97],
	[1132, 0.96],
	[1133, 0.93],
	[1134, 0.9],
	[1135, 0.85],
	[1136, 0.745],
	[1137, 0.62],
];
const OUT_W = [
	[1130, 1],
	[1131, 0.99],
	[1132, 0.965],
	[1133, 0.94],
	[1134, 0.887],
	[1135, 0.808],
	[1136, 0.707],
	[1137, 0.6],
];
const PRE_CUT = [
	[1080, 0],
	[1081, 0],
	[1082, 3],
	[1083, 7],
	[1084, 12],
	[1085, 22],
	[1086, 34],
	[1087, 51],
	[1088, 76],
	[1089, 110],
];

/** Greedy word wrap of styled runs into lines of at most maxW px ("\n" forces a break). */
function wrapRuns(runs, font, maxW) {
	const lines = [[]];
	let w = 0;
	for (const run of runs) {
		const parts = run.text.split("\n");
		parts.forEach((part, pi) => {
			if (pi > 0) {
				lines.push([]);
				w = 0;
			}
			for (const word of part.match(/\S+\s*/g) ?? []) {
				const ww = textWidth(word, font);
				const trimmed = textWidth(word.trimEnd(), font);
				if (w > 0 && w + trimmed > maxW) {
					lines.push([]);
					w = 0;
				}
				lines[lines.length - 1].push({ ...run, text: word });
				w += ww;
			}
		});
	}
	return lines.filter((l, i) => l.length || i === 0);
}

const bodyFont = (k = 1) => `400 ${CH_BODY * k}px ${SANS}`;
const nameFont = (k = 1) => `600 ${CH_NAME * k}px ${SANS}`;

function msgLines(m) {
	const runs = [{ text: m.text ?? "" }];
	if (m.link)
		runs.push(
			{ text: `${m.text ? "\n" : ""}${m.linkLabel ?? "Source: "}` },
			{ text: m.link, link: true },
		);
	return wrapRuns(runs, bodyFont(), CH_TEXT_W);
}

/** One chat card at (x, y), k-scaled from its top-left, width factor wf. */
function ChatCard({ m, x, y, k = 1, wf = 1, opacity = 1, textOpacity = 1, agent }) {
	const lines = m._lines ?? msgLines(m);
	const h = (CH.h1 + CH.pitch * (lines.length - 1)) * k;
	const av = CH.av * k;
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: CH.w * k * wf,
				height: h,
				borderRadius: 22 * k,
				background: rgbs(P.tile),
				opacity,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: (97 - 53) * k,
					top: (101 - 53) * k,
					width: av,
					height: av,
				}}
			>
				{m.agent ? (
					<AgentBadge size={av} src={agent?.markSrc} />
				) : (
					<Avatar size={av} name={m.name} src={m.photo} tone={m.tone ?? [96, 104, 118]} />
				)}
			</div>
			<div
				style={{
					position: "absolute",
					left: CH.textX * k,
					top: (CH.nameTop - 10) * k,
					font: nameFont(k),
					lineHeight: `${46 * k}px`,
					color: rgbs([250, 250, 248], textOpacity),
					whiteSpace: "pre",
				}}
			>
				{m.name}
			</div>
			{lines.map((ln, i) => (
				<div
					key={i}
					style={{
						position: "absolute",
						left: CH.textX * k,
						top: (CH.bodyTop - 14 + CH.pitch * i) * k,
						font: bodyFont(k),
						lineHeight: `${56 * k}px`,
						whiteSpace: "pre",
						color: rgbs([220, 221, 218], textOpacity),
					}}
				>
					{ln.map((r, j) => (
						<span
							key={j}
							style={
								r.link
									? {
											color: rgbs([102, 157, 222], textOpacity),
											textDecoration: "underline",
											textDecorationThickness: 2 * k,
											textUnderlineOffset: 6 * k,
										}
									: null
							}
						>
							{r.text}
						</span>
					))}
				</div>
			))}
		</div>
	);
}

const DEFAULT_PEOPLE = {
	Luis: { tone: [196, 64, 112] },
	Dee: { tone: [26, 128, 112] },
	Sam: { tone: [178, 28, 50] },
	You: { tone: [120, 104, 82] },
	Maya: { tone: [120, 104, 82] },
};

function chatModel(c) {
	const agentName = c.agentName ?? "Cypress";
	const people = { ...DEFAULT_PEOPLE, ...(c.people ?? {}) };
	const person = (name, extra) => ({ ...(people[name] ?? {}), ...extra, name });
	const history = (
		c.history ?? [
			{ text: "Sorted all 17 ideas from easiest to hardest to make." },
			{
				text: "Easiest builds on drinks we already make. Hardest needs tricky sourcing or new equipment.",
			},
			{ text: "Stamp your votes on the board and I'll tally them." },
		]
	).map((m) => ({ name: agentName, agent: true, ...m }));
	const link = {
		name: agentName,
		agent: true,
		text: "The roaster notes say black sesame ships in 10-14 days.",
		linkLabel: "Source: ",
		link: "notes.example.com/\n.../ember-winter-sourcing",
		...(c.linkCard ?? {}),
	};
	const thread = (
		c.thread ?? [
			{ name: "Luis", text: "Looks like we have a winner. Black sesame it is!" },
			{ name: "Dee", text: "YESSS!!!" },
			{ name: "Sam", text: "My espresso machine approves" },
			{ agent: true, text: "Brew-tiful choice" },
		]
	).map((m) => (m.agent ? { name: agentName, ...m } : person(m.name, m)));
	const request = person(c.request?.name ?? "You", {
		text: "Ok Cypress, plan next steps so we can launch by December",
		...(c.request ?? {}),
	});
	const reply = { name: agentName, agent: true, text: "On it.", ...(c.reply ?? {}) };
	for (const m of [...history, link, ...thread, request, reply]) m._lines = msgLines(m);
	const hOf = (m) => CH.h1 + CH.pitch * (m._lines.length - 1);
	// page-1 world: first thread card top = 0
	const pos = [];
	let y = 0;
	thread.forEach((m) => {
		pos.push({ m, y });
		y += hOf(m) + CH.gap;
	});
	let yb = -CH.gap;
	const above = [link, ...history.slice().reverse()].map((m) => {
		const top = yb - hOf(m);
		yb = top - CH.gap;
		return { m, y: top };
	});
	return { thread: pos, above, request, reply, hOf };
}

// Step start frames (the frame before the first moving one) and the measured
// scroll for the reference's card heights; ours add any height difference.
const STEP_START = [988, 1014, 1047];
const STEP_REF = [
	{ amt: 238, h: 204 },
	{ amt: 269, h: 269 },
	{ amt: 250, h: 204 },
];
function stepAmount(model, i) {
	const nm = model.thread[i + 1];
	return nm ? STEP_REF[i].amt + (model.hOf(nm.m) - STEP_REF[i].h) : 0;
}
function chatOff(model, f) {
	if (f <= 963) return curve(OFF_IN, f);
	let off = 198;
	STEP_START.forEach((s, i) => {
		off -= stepAmount(model, i) * stepP(f - s);
	});
	return off - curve(PRE_CUT, f);
}

function ChatStack(c, t) {
	const f = refFrame(c, t, 941) + 1e-3;
	const model = chatModel(c);
	const agent = { markSrc: c.markSrc };
	const black = rgbs(P.black);
	if (f >= 1089 && f < 1090.5) return <Layer z={30} style={{ background: black }} />;
	if (f >= 1090.5) {
		// page 2: the request alone, then the reply below it, then away
		const up = curve(OUT_UP, f);
		const yReq = curve(PAGE2_IN, f) + up;
		const opReq = curve(PAGE2_OP, f);
		const [rdy, rop] = curve(
			REPLY_IN.map(([fr, a, b]) => [fr, [a, b]]),
			f,
		);
		const k = curve(OUT_K, f);
		const wf = curve(OUT_W, f);
		const replyTop = yReq + model.hOf(model.request) + 64;
		return (
			<Layer z={30} style={{ background: black }}>
				<ChatCard m={model.request} x={CH.x} y={yReq} opacity={opReq} agent={agent} />
				{f >= 1110.5 ? (
					<ChatCard
						m={model.reply}
						x={CH.x + (1 - k) * 30}
						y={replyTop + rdy}
						k={k}
						wf={wf}
						opacity={rop}
						agent={agent}
					/>
				) : null}
			</Layer>
		);
	}
	// vertical motion blur during the whip, from the scroll velocity
	const v = f < 964 ? Math.abs(curve(OFF_IN, f - 1) - curve(OFF_IN, f)) : 0;
	const blur = whipBlur(v);
	const off = chatOff(model, f);
	const cards = [];
	model.above.forEach(({ m, y }, i) => {
		if (y + off < 760 && y + off + 900 > -40)
			cards.push(<ChatCard key={`a${i}`} m={m} x={CH.x} y={y + off} agent={agent} />);
	});
	model.thread.forEach(({ m, y }, i) => {
		if (i === 0) {
			cards.push(<ChatCard key="t0" m={m} x={CH.x} y={y + off} agent={agent} />);
			return;
		}
		const r = f - STEP_START[i - 1];
		if (r <= 3) return;
		const [dy, op] = curve(
			NEW_IN.map(([rr, a, b]) => [rr, [a, b]]),
			r,
		);
		const textOp = clamp01((r - 5.5) / 4.5);
		cards.push(
			<ChatCard
				key={`t${i}`}
				m={m}
				x={CH.x}
				y={off + y + dy}
				opacity={op}
				textOpacity={textOp}
				agent={agent}
			/>,
		);
	});
	return (
		<Layer z={30} style={{ background: black }}>
			<svg width="0" height="0" style={{ position: "absolute" }}>
				<filter id="s3chatvb" x="-5%" y="-50%" width="110%" height="200%">
					<feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} />
				</filter>
			</svg>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1280,
					height: 720,
					filter: blur > 0.3 ? "url(#s3chatvb)" : "none",
				}}
			>
				{cards}
			</div>
		</Layer>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. cypress-sort-board  (f757 - f943)
// ═══════════════════════════════════════════════════════════════════════════
//
// WORLD = the f830 frame (camera scale 1, centre 640,360). The camera was
// solved per frame by SIFT registration chained from f830 (similarity fit,
// moving notes rejected by RANSAC; a 40 px alias at f792/793 corrected by
// hand) and is used AS MEASURED (CAM below, [frame, scale, cx, cy]):
//  - f757 hard cut in at 1.559x, pulling back on a fast ease-out (1.31 f760,
//    1.11 f770, 1.05 f781, 1.02 f800, 1.00 f830) about ~(639,364);
//  - f830-f866 it pulls further back and tilts up to the heading (s .881,
//    centre 727,274), f866-f905 pushes in and pans right onto columns 2-3
//    (s 1.039, centre 812.6,261), creeping to f930;
//  - f931-f940 it accelerates DOWN the page (cy 261 -> 390) and f941-f943
//    the paper (bottom edge world y 721) whips off the top at up to ~345
//    px/frame, vertical motion blur, onto the chat on black below.
// Grid: 42.5 px cells, ~3 px lines [236] on paper [250,249,244], lines at
// x = 42 + 42.5n, y = 17 + 42.5n. Panels [241,240,235] 366 x 568 at
// x 67 / 455 / 843, y 79, radius ~18. Column notes 140 px at
// x {104,256} + 388c, y {179,331,483}; scattered notes ~155 px (x1.107).
// Note moves (template-tracked per frame against the f830 slots):
//  col 1 f764-f792, col 2 f786-f807, col 3 f800-f822; each panel's settled
//  notes SNAP sideways when the panel re-lays out (panel 1 +40 -> 0 at f793,
//  panel 2 -14 / +19 / 0 at f804 / f812, panel 3 +41 -> 0 at f816).
// Headers type on (1: f783-789 title, f787-793 sub; 2: f797-805, f803-811;
// 3: f810-817, f815-823). Collaborator cursors pop in f815-f834, the call
// window docks f840-f845 (scale .6 -> 1 from its top edge, fading in) and
// shows a check mark f845-f875 (rays f857-f866) before the working loop.
// Vote stamps pop (1.45x -> 1 over ~4 frames) at their measured world spots
// (read off f910: e.g. thumbs-up on the green note at 782,244 f856, +1 on
// the green note 777,179 f901, a big thumbs-down carried by Jonah's cursor
// from f891 at 1087,444).

const CAM = [
	[757, 1.5587, 639.3, 363.6],
	[758, 1.4494, 639.3, 363.6],
	[759, 1.3651, 639.3, 363.7],
	[760, 1.3079, 639.3, 363.7],
	[761, 1.2665, 639.3, 363.8],
	[762, 1.2346, 639.3, 363.8],
	[763, 1.209, 639.3, 363.8],
	[764, 1.1877, 639.3, 363.8],
	[765, 1.1696, 639.3, 363.8],
	[766, 1.1541, 639.4, 363.9],
	[767, 1.1406, 639.4, 363.9],
	[768, 1.1287, 639.4, 364.0],
	[769, 1.1182, 639.4, 364.0],
	[770, 1.1087, 639.4, 364.0],
	[771, 1.1003, 639.4, 364.0],
	[772, 1.0926, 639.4, 364.0],
	[773, 1.0859, 639.4, 364.1],
	[774, 1.0798, 639.4, 364.1],
	[775, 1.0742, 639.4, 364.1],
	[776, 1.0692, 639.4, 364.1],
	[777, 1.0648, 639.5, 364.2],
	[778, 1.0607, 639.5, 364.2],
	[779, 1.0569, 639.4, 364.2],
	[780, 1.0537, 639.5, 364.2],
	[781, 1.0505, 639.4, 364.3],
	[782, 1.0474, 639.3, 364.3],
	[783, 1.0441, 639.0, 364.3],
	[784, 1.042, 639.0, 364.3],
	[785, 1.0402, 639.0, 364.3],
	[786, 1.0385, 639.0, 364.2],
	[787, 1.0371, 639.0, 364.2],
	[788, 1.0358, 639.0, 364.2],
	[789, 1.0345, 639.0, 364.2],
	[790, 1.0336, 638.9, 364.2],
	[791, 1.0323, 638.9, 364.2],
	[792, 1.0307, 639.1, 364.1],
	[793, 1.0294, 639.1, 364.3],
	[794, 1.0279, 639.2, 364.4],
	[795, 1.0266, 639.2, 364.4],
	[796, 1.0252, 639.2, 364.4],
	[797, 1.0239, 639.2, 364.5],
	[798, 1.0229, 639.2, 364.3],
	[799, 1.0218, 639.3, 364.3],
	[800, 1.0205, 639.1, 364.5],
	[801, 1.0194, 639.1, 364.5],
	[802, 1.0179, 639.2, 364.6],
	[803, 1.0169, 639.2, 364.6],
	[804, 1.0177, 638.9, 362.4],
	[805, 1.0166, 638.8, 362.5],
	[806, 1.0157, 638.7, 362.5],
	[807, 1.0147, 638.6, 362.5],
	[808, 1.0141, 638.5, 362.4],
	[809, 1.0131, 638.5, 362.4],
	[810, 1.0121, 638.4, 362.4],
	[811, 1.0111, 638.4, 362.4],
	[812, 1.0115, 637.9, 362.2],
	[813, 1.0106, 637.9, 362.2],
	[814, 1.01, 637.9, 362.0],
	[815, 1.0094, 637.9, 361.9],
	[816, 1.0087, 637.9, 361.9],
	[817, 1.0079, 637.9, 361.9],
	[818, 1.0072, 637.9, 361.9],
	[819, 1.0067, 637.9, 361.9],
	[820, 1.0063, 637.9, 361.8],
	[821, 1.0058, 637.9, 361.8],
	[822, 1.0054, 637.9, 361.8],
	[823, 1.005, 637.9, 361.8],
	[824, 1.0047, 637.9, 361.8],
	[825, 1.0042, 638.0, 361.8],
	[826, 1.0036, 638.1, 361.7],
	[827, 1.0029, 638.4, 361.5],
	[828, 1.0022, 638.8, 361.1],
	[829, 1.0011, 639.3, 360.7],
	[830, 1.0, 640.0, 360.0],
	[831, 0.9986, 640.9, 359.2],
	[832, 0.9968, 642.0, 358.1],
	[833, 0.9944, 643.5, 356.7],
	[834, 0.9915, 645.4, 354.8],
	[835, 0.9877, 647.9, 352.4],
	[836, 0.9828, 651.1, 349.2],
	[837, 0.976, 655.6, 344.8],
	[838, 0.9668, 661.9, 338.6],
	[839, 0.9544, 670.4, 330.2],
	[840, 0.9406, 680.2, 320.5],
	[841, 0.9288, 688.8, 312.0],
	[842, 0.9196, 695.7, 305.2],
	[843, 0.9126, 701.0, 300.0],
	[844, 0.9071, 705.3, 295.7],
	[845, 0.9026, 708.8, 292.3],
	[846, 0.8989, 711.7, 289.4],
	[847, 0.8957, 714.2, 286.9],
	[848, 0.8931, 716.3, 284.8],
	[849, 0.8908, 718.2, 283.0],
	[850, 0.8889, 719.7, 281.5],
	[851, 0.8872, 721.1, 280.1],
	[852, 0.8858, 722.3, 279.0],
	[853, 0.8849, 723.1, 278.1],
	[854, 0.8841, 723.8, 277.3],
	[855, 0.8834, 724.4, 276.6],
	[856, 0.8829, 725.0, 276.0],
	[857, 0.8824, 725.4, 275.5],
	[858, 0.882, 725.8, 275.1],
	[859, 0.8816, 726.1, 274.8],
	[860, 0.8814, 726.3, 274.5],
	[861, 0.8812, 726.5, 274.3],
	[862, 0.8811, 726.6, 274.1],
	[863, 0.881, 726.6, 274.0],
	[864, 0.8809, 726.7, 274.0],
	[865, 0.8811, 726.8, 274.0],
	[866, 0.8816, 727.1, 273.9],
	[867, 0.8824, 727.6, 273.8],
	[868, 0.8837, 728.4, 273.7],
	[869, 0.8856, 729.7, 273.5],
	[870, 0.8883, 731.4, 273.3],
	[871, 0.8921, 733.9, 272.9],
	[872, 0.8974, 737.3, 272.4],
	[873, 0.9051, 742.1, 271.7],
	[874, 0.9166, 749.2, 270.6],
	[875, 0.9327, 758.8, 269.2],
	[876, 0.9505, 769.0, 267.6],
	[877, 0.9654, 777.3, 266.4],
	[878, 0.9768, 783.5, 265.5],
	[879, 0.9857, 788.2, 264.8],
	[880, 0.9928, 792.0, 264.3],
	[881, 0.9987, 795.0, 263.8],
	[882, 1.0036, 797.5, 263.5],
	[883, 1.008, 799.6, 263.0],
	[884, 1.0117, 801.4, 262.8],
	[885, 1.0149, 803.0, 262.5],
	[886, 1.0177, 804.4, 262.3],
	[887, 1.0201, 805.6, 262.1],
	[888, 1.0223, 806.6, 262.0],
	[889, 1.0242, 807.5, 261.8],
	[890, 1.0259, 808.4, 261.7],
	[891, 1.0274, 809.1, 261.6],
	[892, 1.0287, 809.7, 261.5],
	[893, 1.0298, 810.3, 261.4],
	[894, 1.0308, 810.7, 261.3],
	[895, 1.0318, 811.1, 261.3],
	[896, 1.0326, 811.4, 261.2],
	[897, 1.0334, 811.7, 261.2],
	[898, 1.034, 811.9, 261.2],
	[899, 1.0347, 812.1, 261.2],
	[900, 1.0353, 812.2, 261.1],
	[901, 1.0358, 812.3, 261.1],
	[902, 1.0363, 812.4, 261.1],
	[903, 1.0368, 812.5, 261.1],
	[904, 1.0371, 812.6, 261.1],
	[905, 1.0375, 812.6, 261.1],
	[906, 1.0378, 812.6, 261.1],
	[907, 1.0381, 812.6, 261.1],
	[908, 1.0383, 812.6, 261.1],
	[909, 1.0385, 812.6, 261.1],
	[910, 1.0387, 812.6, 261.1],
	[911, 1.0389, 812.6, 261.1],
	[912, 1.039, 812.6, 261.1],
	[913, 1.039, 812.6, 261.1],
	[914, 1.0391, 812.6, 261.1],
	[915, 1.0392, 812.6, 261.1],
	[916, 1.0392, 812.6, 261.1],
	[917, 1.0393, 812.6, 261.1],
	[918, 1.0393, 812.6, 261.1],
	[919, 1.0392, 812.6, 261.1],
	[920, 1.0392, 812.7, 261.1],
	[921, 1.0391, 812.8, 261.1],
	[922, 1.0391, 812.8, 261.1],
	[923, 1.0391, 812.9, 261.1],
	[924, 1.0391, 813.0, 261.1],
	[925, 1.0391, 813.1, 261.1],
	[926, 1.0391, 813.2, 261.0],
	[927, 1.0391, 813.4, 261.0],
	[928, 1.0391, 813.6, 261.0],
	[929, 1.0392, 813.8, 260.9],
	[930, 1.0392, 814.1, 260.9],
	[931, 1.0393, 814.5, 261.5],
	[932, 1.0394, 814.9, 263.6],
	[933, 1.0394, 814.9, 267.5],
	[934, 1.0394, 814.9, 273.4],
	[935, 1.0394, 814.8, 281.8],
	[936, 1.0394, 814.8, 292.9],
	[937, 1.0394, 814.7, 307.7],
	[938, 1.0394, 814.6, 327.2],
	[939, 1.0393, 814.5, 353.4],
	[940, 1.0396, 814.3, 390.0],
];
const camAt = (f) => {
	if (f <= CAM[0][0]) return CAM[0].slice(1);
	if (f >= CAM[CAM.length - 1][0]) return CAM[CAM.length - 1].slice(1);
	const i = Math.floor(f) - CAM[0][0];
	const a = CAM[i];
	const b = CAM[i + 1];
	const p = f - a[0];
	return [lerp(a[1], b[1], p), lerp(a[2], b[2], p), lerp(a[3], b[3], p)];
};
// Paper bottom on stage during the whip (f940 703 measured, f941 625, f942
// ~280; the chat's own whip-in continues it).
const PAPER_BOTTOM_W = 721;
const PAPER_STAGE = [
	[940, 703],
	[941, 625],
	[942, 280],
	[943, -100],
	[944, -470],
];

const PANEL_X = [67, 455, 843];
const PANEL_Y = 79;
const PANEL_W = 366;
const PANEL_H = 568;
const PANEL_C = [241, 240, 235];
// Panel lateral offset over time (re-layout snaps) and fade-in.
const PANEL_DX = [
	[
		[792.99, 40],
		[793, 0],
	],
	[
		[803.99, -14],
		[804, 19],
		[811.99, 19],
		[812, 0],
	],
	[
		[815.99, 41],
		[816, 0],
	],
];
const PANEL_IN = [773.5, 791.5, 806];
const HEAD_T = [
	[783, 789, 787, 793],
	[797, 805, 803, 811],
	[810, 817, 815, 823],
];

// The 17 notes (the same board S2 builds): [colour key, author, text, column, row, k, path keys].
// Path keys [frame, x, y, ease?] are absolute world top-lefts (measured).
const NOTE_COLOUR = {
	blue: P.noteBlue,
	lilac: P.noteLilac,
	peach: P.notePeach,
	yellow: P.noteYellow,
	green: P.noteGreen,
	pink: P.notePink,
};
const NOTES = [
	// column 1 (pre-f793 slots at +40)
	[
		"pink",
		"Luis",
		"Spiced mocha?",
		0,
		0,
		0,
		[
			[764, 95, 405],
			[772, 150, 318, "io"],
			[781, 144, 179, "o"],
			[792.99, 144, 179],
			[793, 104, 179],
		],
	],
	[
		"pink",
		"Luis",
		"Mint mocha?",
		0,
		0,
		1,
		[
			[768, 98, 555],
			[773, 130, 473, "i"],
			[779, 259, 223],
			[782, 296, 179, "o"],
			[792.99, 296, 179],
			[793, 256, 179],
		],
	],
	[
		"blue",
		"Jonah",
		"Maple oat latte",
		0,
		1,
		0,
		[
			[778, 165, 255],
			[785, 144, 331, "io"],
			[792.99, 144, 331],
			[793, 104, 331],
		],
	],
	[
		"blue",
		"Jonah",
		"Honey cardamom",
		0,
		1,
		1,
		[
			[777, 115, 335],
			[782, 196, 310, "i"],
			[785, 260, 314],
			[789, 296, 331, "o"],
			[792.99, 296, 331],
			[793, 256, 331],
		],
	],
	[
		"blue",
		"Jonah",
		"Cinnamon cold foam",
		0,
		2,
		0,
		[
			[781, 340, 250],
			[787, 175, 440, "io"],
			[792, 145, 483, "o"],
			[792.99, 145, 483],
			[793, 104, 483],
		],
	],
	[
		"yellow",
		"Maya",
		"Toasted marshmallow mocha",
		0,
		2,
		1,
		[
			[783, 505, 472],
			[789, 388, 456, "i"],
			[792, 321, 465],
			[793, 272, 470],
			[798, 256, 483, "o"],
		],
	],
	// column 2 (slots -14 until f804, +19 until f812)
	[
		"pink",
		"Luis",
		"Matcha mocha?",
		1,
		0,
		0,
		[
			[786, 297, 520],
			[792, 473, 181, "io"],
			[793, 478, 179, "o"],
			[803.99, 478, 179],
			[804, 511, 179],
			[811.99, 511, 179],
			[812, 492, 179],
		],
	],
	[
		"green",
		"Dee",
		"BLACK SESAME BLIZZARD",
		1,
		0,
		1,
		[
			[786, 942, 521],
			[789, 863, 418, "i"],
			[790, 798, 344],
			[795, 640, 185],
			[798, 630, 179, "o"],
			[803.99, 630, 179],
			[804, 663, 179],
			[811.99, 663, 179],
			[812, 644, 179],
		],
	],
	[
		"green",
		"Dee",
		"CHURRO LATTE",
		1,
		1,
		0,
		[
			[788, 822, 573],
			[790, 782, 531, "i"],
			[792, 651, 431],
			[794, 547, 364],
			[797, 478, 331, "o"],
			[803.99, 478, 331],
			[804, 511, 331],
			[811.99, 511, 331],
			[812, 492, 331],
		],
	],
	[
		"lilac",
		"Priya",
		"French vanilla please",
		1,
		1,
		1,
		[
			[795, 651, 287],
			[803, 630, 331, "io"],
			[803.99, 630, 331],
			[804, 663, 331],
			[811.99, 663, 331],
			[812, 644, 331],
		],
	],
	[
		"lilac",
		"Priya",
		"Grandma's chai",
		1,
		2,
		0,
		[
			[794, 618, 140],
			[799, 491, 425, "i"],
			[803, 478, 470, "o"],
			[803.99, 478, 470],
			[804, 511, 476],
			[807, 511, 483, "o"],
			[811.99, 511, 483],
			[812, 492, 483],
		],
	],
	[
		"yellow",
		"Maya",
		"Lingonberry tonic",
		1,
		2,
		1,
		[
			[798, 580, 640],
			[803, 626, 484, "io"],
			[803.99, 630, 483],
			[804, 663, 483],
			[811.99, 663, 483],
			[812, 644, 483],
		],
	],
	// column 3 (slots +41 until f816)
	[
		"blue",
		"Jonah",
		"Fig & cinnamon",
		2,
		0,
		0,
		[
			[800, 411, 302],
			[803, 565, 242, "i"],
			[804, 652, 217],
			[805, 742, 197],
			[806, 815, 183],
			[807, 864, 175],
			[808, 895, 175],
			[810, 921, 179, "o"],
			[815.99, 921, 179],
			[816, 880, 179],
		],
	],
	[
		"yellow",
		"Maya",
		"Brown butter, but make it brûlée",
		2,
		0,
		1,
		[
			[803, 650, 455],
			[808, 1025, 191, "io"],
			[810, 1062, 179, "o"],
			[811, 1073, 179],
			[815.99, 1073, 179],
			[816, 1032, 179],
		],
	],
	[
		"peach",
		"Sam",
		"Gingerbread everything!!!",
		2,
		1,
		0,
		[
			[804, 1003, 239],
			[809, 925, 304, "io"],
			[813, 921, 331, "o"],
			[815.99, 921, 331],
			[816, 880, 331],
		],
	],
	[
		"peach",
		"Sam",
		"Eggnog cortado!!",
		2,
		1,
		1,
		[
			[805, 836, 329],
			[809, 1022, 310, "io"],
			[811, 1053, 318],
			[814, 1068, 327, "o"],
			[815.99, 1073, 331],
			[816, 1032, 331],
		],
	],
	[
		"peach",
		"Sam",
		"Pumpkin bread latte!!!",
		2,
		2,
		0,
		[
			[809, 865, 201],
			[813, 914, 453, "io"],
			[815, 916, 467, "o"],
			[815.99, 917, 470],
			[816, 879, 472],
			[818, 880, 478],
			[822, 880, 483, "o"],
		],
	],
];
// Scattered notes are 155 px, column notes 140 px: scale with move progress.
const NOTE_SCATTER = 155 / 140;

// Collaborator cursors: [name, tag colour, appear frame, label top-left keys].
const CURSORS = [
	[
		"Sam",
		TAG.red,
		815,
		[
			[815, 204, 472],
			[840, 204, 472],
			[844, 217, 472],
			[848, 222, 475],
			[852, 256, 479],
			[856, 316, 482],
			[860, 345, 489],
			[864, 355, 489],
			[884, 355, 489],
			[890, 345, 489],
		],
	],
	[
		"Luis",
		TAG.pink,
		819,
		[
			[819, 616, 494],
			[876, 616, 494],
			[880, 618, 486],
			[884, 632, 463],
			[888, 652, 420],
			[892, 679, 365],
			[896, 689, 331],
			[904, 705, 308],
		],
	],
	[
		"Priya",
		TAG.violet,
		822,
		[
			[822, 795, 294],
			[892, 795, 294],
			[896, 823, 287],
			[904, 887, 273],
			[916, 900, 268],
		],
	],
	[
		"Dee",
		TAG.teal,
		826,
		[
			[826, 397, 225],
			[880, 401, 235],
			[888, 440, 290],
			[896, 476, 337],
			[904, 510, 384],
			[916, 515, 392],
		],
	],
	[
		"Jonah",
		TAG.blue,
		834,
		[
			[834, 1105, 315],
			[868, 1111, 316],
			[872, 1118, 341],
			[876, 1123, 381],
			[880, 1131, 402],
			[888, 1135, 412],
			[892, 1137, 415],
			[896, 1132, 408],
		],
	],
];

// Vote stamps (world centre, pop frame, kind, size).
const STAMPS = [
	[594, 460, 833, "heart", 34],
	[180, 450, 837, "plus", 40],
	[1077, 280, 844, "heart", 34],
	[381, 186, 848, "bulb", 40],
	[206, 252, 854, "plusone", 40],
	[782, 244, 856, "thumbup", 42],
	[208, 410, 860, "heart", 34],
	[535, 588, 864, "smile", 36],
	[603, 576, 868, "plusone", 40],
	[1152, 278, 870, "thumbup", 42],
	[613, 386, 875, "plusone", 40],
	[1021, 550, 875, "thumbdown", 44],
	[551, 439, 879, "smile", 36],
	[329, 439, 886, "bulb", 40],
	[724, 250, 891, "plus", 42],
	[777, 179, 901, "plusone", 40],
	[668, 258, 907, "hearts", 46],
];

const STAMP_INK = "#2b2722";
const MUSTARD = "#d9a43b";
/** A vote stamp drawn centred on its origin, `size` px tall. */
function Stamp({ kind, size = 40 }) {
	const s = size;
	const common = {
		stroke: STAMP_INK,
		strokeWidth: 2.4,
		strokeLinejoin: "round",
		strokeLinecap: "round",
	};
	let body;
	if (kind === "heart" || kind === "hearts") {
		const heart = (dx, dy, k) => (
			<path
				key={`${dx}${dy}`}
				transform={`translate(${dx} ${dy}) scale(${k})`}
				d="M0 9 C-3 6 -11 1 -11 -5 C-11 -10 -5 -12 0 -6 C5 -12 11 -10 11 -5 C11 1 3 6 0 9 Z"
				fill="#c8323a"
				{...common}
				strokeWidth={2.4 / k}
			/>
		);
		body = kind === "hearts" ? [heart(-6, 2, 0.95), heart(6, -4, 0.85)] : heart(0, 0, 1.1);
	} else if (kind === "plus") {
		body = (
			<path
				d="M-4.5 -13 H4.5 V-4.5 H13 V4.5 H4.5 V13 H-4.5 V4.5 H-13 V-4.5 H-4.5 Z"
				fill="#7d9a5a"
				{...common}
			/>
		);
	} else if (kind === "plusone") {
		body = (
			<g>
				<path
					d="M-14 -2.5 H-9.5 V-7 H-5.5 V-2.5 H-1 V1.5 H-5.5 V6 H-9.5 V1.5 H-14 Z"
					fill="#8fb2dc"
					{...common}
					strokeWidth={1.8}
				/>
				<path
					d="M3 -6 L8.5 -11 H12 V9 H7.5 V-4 L4.5 -1.5 Z"
					fill="#8fb2dc"
					{...common}
					strokeWidth={1.8}
				/>
			</g>
		);
	} else if (kind === "thumbup" || kind === "thumbdown") {
		body = (
			<g transform={kind === "thumbdown" ? "scale(1 -1)" : undefined}>
				<path d="M-11 -2 H-5 V12 H-11 Z" fill={MUSTARD} {...common} />
				<path
					d="M-5 -1 C-1 -4 1 -9 1 -12 C1 -15 5 -15 6 -11 C7 -8 6 -5 5 -3 H11 C14 -3 15 0 13.5 2 C15 3.5 14.5 6 12.5 6.5 C13.5 8 13 10.5 10.5 11 C11 13 9.5 13.5 8 13.5 H-5 Z"
					fill={MUSTARD}
					{...common}
				/>
			</g>
		);
	} else if (kind === "smile") {
		body = (
			<g>
				<circle r="12.5" fill={MUSTARD} {...common} />
				<path d="M-6.5 1.5 C-4 8 4 8 6.5 1.5 Z" fill="#fff" {...common} strokeWidth={1.6} />
				<path
					d="M-6 -4 Q-4 -6.5 -2 -4 M2 -4 Q4 -6.5 6 -4"
					fill="none"
					{...common}
					strokeWidth={1.8}
				/>
			</g>
		);
	} else {
		// light bulb with a burst
		body = (
			<g>
				<path
					d="M0 -13 L2.5 -9 L7 -11 L6.5 -6.5 L11 -5 L7.5 -2 L10 2 L5.5 2.5 L5 7 H-5 L-5.5 2.5 L-10 2 L-7.5 -2 L-11 -5 L-6.5 -6.5 L-7 -11 L-2.5 -9 Z"
					fill={MUSTARD}
					{...common}
					strokeWidth={1.8}
				/>
				<path
					d="M-4.5 7 H4.5 V11 C4.5 13 2.5 14 0 14 C-2.5 14 -4.5 13 -4.5 11 Z"
					fill="#f2efe6"
					{...common}
					strokeWidth={1.8}
				/>
			</g>
		);
	}
	return (
		<svg
			width={s}
			height={s}
			viewBox="-16 -16 32 32"
			style={{ position: "absolute", left: -s / 2, top: -s / 2, overflow: "visible" }}
		>
			{body}
		</svg>
	);
}
const stampPop = (age) =>
	curve(
		[
			[0, 1.45],
			[1, 1.25],
			[2, 1.08],
			[3, 0.98],
			[4, 1],
		],
		age,
	);

/** The check mark the agent's docked tile shows when the sort is done. */
function CallCheck({ f }) {
	const draw = curve(
		[
			[844.5, 0],
			[846, 0.35],
			[848, 0.8],
			[850, 1, "o"],
		],
		f,
	);
	const rays = curve(
		[
			[856.5, 0],
			[858, 0.6],
			[861, 1],
			[866, 1],
		],
		f,
	);
	const rayOp = curve(
		[
			[856.5, 0],
			[857.5, 1],
			[864, 1],
			[867, 0],
		],
		f,
	);
	const op = curve(
		[
			[873, 1],
			[876, 0],
		],
		f,
	);
	const L = 40;
	return (
		<svg
			width="80"
			height="80"
			viewBox="-40 -40 80 80"
			style={{ position: "absolute", left: -40, top: -40, overflow: "visible", opacity: op }}
		>
			<path
				d="M-11 1 L-3.5 8.5 L12 -8"
				stroke="white"
				strokeWidth="5"
				fill="none"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeDasharray={`${L} ${L}`}
				strokeDashoffset={L * (1 - draw)}
			/>
			{rayOp > 0
				? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
						const a = (i / 8) * Math.PI * 2 + 0.3;
						const r0 = 24 + 6 * rays;
						const r1 = r0 + 7;
						return (
							<line
								key={i}
								x1={Math.cos(a) * r0}
								y1={Math.sin(a) * r0}
								x2={Math.cos(a) * r1}
								y2={Math.sin(a) * r1}
								stroke="white"
								strokeWidth="3"
								strokeLinecap="round"
								opacity={rayOp}
							/>
						);
					})
				: null}
		</svg>
	);
}

function wrapLabel(text, n) {
	return text.slice(0, Math.max(0, Math.floor(n)));
}

function SortBoard(c, t) {
	const f = refFrame(c, t, 757) + 1e-3;
	let [s, cx, cy] = camAt(Math.min(f, 940));
	// the whip: the paper keeps going up with the chat underneath
	let paperStage = (PAPER_BOTTOM_W - cy) * s + 360;
	if (f > 940) {
		paperStage = curve(PAPER_STAGE, f);
		cy = PAPER_BOTTOM_W - (paperStage - 360) / s;
	}
	if (paperStage < -40) return null;
	const [, , cyA] = camAt(Math.min(f, 940));
	const [, , cyB] = camAt(Math.max(757, Math.min(f - 1, 940)));
	let v = Math.abs(cyA - cyB) * s;
	if (f > 940) v = Math.abs(curve(PAPER_STAGE, f - 1) - curve(PAPER_STAGE, f));
	const blur = whipBlur(v);

	const notesCfg = c.notes ?? NOTES.map(([col, author, text]) => ({ colour: col, author, text }));
	const cols = c.columns ?? [
		{ title: "1  Easiest", sub: "Builds on drinks we already make" },
		{ title: "2  Medium", sub: "One new syrup or technique" },
		{ title: "3  Hardest", sub: "Tricky sourcing or new equipment" },
	];
	const agentName = c.agentName ?? "Cypress";
	const cursorNames = c.cursorNames ?? {};

	// panels
	const panels = PANEL_X.map((px, i) => {
		const op = clamp01((f - PANEL_IN[i]) / 2.5);
		if (op <= 0) return null;
		const dx = curve(PANEL_DX[i], f);
		const [t0, t1, s0, s1] = HEAD_T[i];
		const col = cols[i] ?? {};
		const title = col.title ?? "";
		const sub = col.sub ?? "";
		const nT = clamp01((f - t0) / (t1 - t0)) * title.length;
		const nS = clamp01((f - s0) / (s1 - s0)) * sub.length;
		return (
			<div
				key={`p${i}`}
				style={{
					position: "absolute",
					left: px + dx,
					top: PANEL_Y,
					width: PANEL_W,
					height: PANEL_H,
					borderRadius: 18,
					background: rgbs(PANEL_C),
					opacity: op,
				}}
			>
				<div
					style={{
						position: "absolute",
						left: 25,
						top: 18,
						font: `500 33px ${HEAVY}`,
						lineHeight: "44px",
						color: rgbs([30, 30, 28]),
						whiteSpace: "pre",
					}}
				>
					{wrapLabel(title, nT)}
				</div>
				<div
					style={{
						position: "absolute",
						left: 25,
						top: 61,
						font: `400 16px ${SANS}`,
						lineHeight: "22px",
						color: rgbs([40, 40, 38]),
						whiteSpace: "pre",
					}}
				>
					{wrapLabel(sub, nS)}
				</div>
			</div>
		);
	});

	// notes
	let agentAt = null;
	let agentStart = -1;
	const notes = NOTES.map((n, i) => {
		const cfg = notesCfg[i] ?? {};
		const keys = n[6];
		const [x, y] = curve(
			keys.map(([fr, kx, ky, e]) => [fr, [kx, ky], e]),
			f,
		);
		// progress through the main move -> size
		const mStart = keys[0][0];
		const mEnd = keys.find((k, j) => j > 0 && k[3] === "o")?.[0] ?? keys[keys.length - 1][0];
		const pr = clamp01((f - mStart) / Math.max(1, mEnd - mStart));
		const sc = lerp(NOTE_SCATTER, 1, EASE.io(pr));
		const moving = f > mStart && f < mEnd;
		if (moving && mStart > agentStart) {
			agentStart = mStart;
			agentAt = [x + 70 * sc + 6, y + 70 * sc + 22];
		}
		const z = moving ? 30 + i : f >= mEnd ? 10 + i : 2 + i;
		const colour = NOTE_COLOUR[cfg.colour ?? n[0]] ?? cfg.colour ?? P.noteBlue;
		return (
			<div
				key={`n${i}`}
				style={{
					position: "absolute",
					left: x,
					top: y,
					width: 140,
					height: 140,
					transform: `scale(${sc})`,
					transformOrigin: "0 0",
					zIndex: z,
				}}
			>
				<Sticky
					x={0}
					y={0}
					w={140}
					h={140}
					colour={colour}
					text={cfg.text ?? n[2]}
					author={cfg.author ?? n[1]}
					font={13}
					scale={1}
					fold={0.085}
					authorFont={8}
					textTop={12}
					textLeft={14}
				/>
				{moving ? (
					<div
						style={{
							position: "absolute",
							inset: -1,
							border: `1.5px solid ${rgbs(mix(colour, [60, 60, 70], 0.45))}`,
							borderRadius: 1,
						}}
					/>
				) : null}
			</div>
		);
	});
	// the agent's cursor rides the most recently grabbed note; it parks after the sort and fades
	const agentOp = curve(
		[
			[823, 1],
			[830, 1],
			[832, 0],
		],
		f,
	);
	if (!agentAt) {
		const last = NOTES[16][6];
		agentAt =
			f < 764 ? [370, 520] : [last[last.length - 1][1] + 120, last[last.length - 1][2] + 110];
	}

	// collaborator cursors
	const cursors = CURSORS.map(([nm, colour, at, keys], i) => {
		const age = f - at;
		if (age < 0) return null;
		const [lx, ly] = curve(
			keys.map(([fr, kx, ky]) => [fr, [kx, ky]]),
			f,
		);
		const g = curve(
			SH.TAG_GROW ?? [
				[0, 0],
				[8, 1],
			],
			age,
		);
		return (
			<div key={`c${i}`} style={{ position: "absolute", left: lx - 10, top: ly - 13, zIndex: 60 }}>
				<NameTag name={cursorNames[nm] ?? nm} colour={colour} k={1.05} grow={g} />
			</div>
		);
	});

	// stamps
	const stamps = STAMPS.map(([sx, sy, at, kind, size], i) => {
		const age = f - at;
		if (age < 0) return null;
		return (
			<div
				key={`s${i}`}
				style={{
					position: "absolute",
					left: sx,
					top: sy,
					transform: `scale(${stampPop(age)})`,
					zIndex: 50,
				}}
			>
				<Stamp kind={kind} size={size} />
			</div>
		);
	});
	// Jonah carries a big thumbs-down from f891 (it rides just left of his tag)
	let bigThumb = null;
	if (f >= 890) {
		const [lx, ly] = curve(
			CURSORS[4][3].map(([fr, kx, ky]) => [fr, [kx, ky]]),
			f,
		);
		bigThumb = (
			<div
				style={{
					position: "absolute",
					left: lx - 50,
					top: ly + 36,
					transform: `scale(${stampPop(f - 890)})`,
					zIndex: 55,
				}}
			>
				<Stamp kind="thumbdown" size={84} />
			</div>
		);
	}

	const Sticker = SH.Sticker;
	const heading = c.heading ?? "What’s our winter special this year?";
	const board = (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1280,
				height: 720,
				transformOrigin: "0 0",
				transform: `translate(${640 - cx * s}px, ${360 - cy * s}px) scale(${s})`,
			}}
		>
			<div
				style={{
					position: "absolute",
					left: -2500,
					top: -2500,
					width: 6500,
					height: 2500 + PAPER_BOTTOM_W,
					background: rgbs(P.paper),
					backgroundImage: `linear-gradient(${rgbs([236, 235, 230])} 2.6px, transparent 2.6px), linear-gradient(90deg, ${rgbs([236, 235, 230])} 2.6px, transparent 2.6px)`,
					backgroundSize: "42.5px 42.5px",
					backgroundPosition: `${(2500 + 42 - 1.3) % 42.5}px ${(2500 + 17 - 1.3) % 42.5}px`,
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 339,
					top: -84,
					font: `800 44px ${HEAVY}`,
					lineHeight: "56px",
					letterSpacing: -0.5,
					color: rgbs([52, 50, 46]),
					whiteSpace: "pre",
				}}
			>
				{heading}
			</div>
			{Sticker ? (
				<div style={{ position: "absolute", left: 226, top: -42, zIndex: 3 }}>
					<Sticker size={180} rot={-14} src={c.stickerSrc} id="s3stk" />
				</div>
			) : null}
			{panels}
			{notes}
			{stamps}
			{bigThumb}
			{cursors}
			{agentOp > 0 ? (
				<div
					style={{
						position: "absolute",
						left: agentAt[0],
						top: agentAt[1],
						zIndex: 70,
						opacity: agentOp,
					}}
				>
					<NameTag name={agentName} colour={P.coral} k={1.05} />
				</div>
			) : null}
		</div>
	);

	// docked call window (screen space; rides the page during the whip)
	let call = null;
	if (f >= 839.5 && SH.CallMini) {
		const se = curve(
			[
				[839.5, 0.6],
				[840, 0.6],
				[841, 0.69],
				[842, 0.78],
				[843, 0.9],
				[844, 0.97],
				[845, 1],
			],
			f,
		);
		const op = curve(
			[
				[839.5, 0],
				[840, 0.45],
				[841, 0.8],
				[842, 1],
			],
			f,
		);
		const H = 314;
		const [, , cy930] = camAt(930);
		const drift = f > 930 ? (cy - cy930) * s : 0;
		const top = 27 - drift - (H / 2) * (1 - se);
		const loopP = curve(
			[
				[876, 0],
				[878, 0.08],
				[890, 1, "o"],
			],
			f,
		);
		call = (
			<div style={{ position: "absolute", left: 0, top: 0, width: 1280, height: 720, zIndex: 80 }}>
				<SH.CallMini
					x={1027.5}
					y={top}
					scale={se}
					opacity={op}
					expand={1}
					name={agentName}
					f={f}
					loop={loopP}
					participants={c.participants}
				/>
				{f >= 844.5 && f < 876 ? (
					<div style={{ position: "absolute", left: 1027.5 + 6 + 107, top: top + 29 + 60 }}>
						<CallCheck f={f} />
					</div>
				) : null}
			</div>
		);
	}
	return (
		<Layer z={40} style={{ background: "transparent" }}>
			<svg width="0" height="0" style={{ position: "absolute" }}>
				<filter id="s3boardvb" x="-5%" y="-50%" width="110%" height="200%">
					<feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} />
				</filter>
			</svg>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1280,
					height: 720,
					filter: blur > 0.3 ? "url(#s3boardvb)" : "none",
				}}
			>
				{board}
				{call}
			</div>
		</Layer>
	);
}

export const S3_PRESETS = {
	"cypress-organize-tile": {
		note: "The agent's call tile filling the frame while it works: a camera push onto the tile (hard cut in mid-zoom, ease-out, eased back out at the end), the status fading in word by word, the coral blob breathing on twos and a white line that writes itself left to right while its loops travel through the blob. f709-f756.",
		nativeMs: 2000,
		params: {
			status: ["string", "Organizing ideas", "agent status line (product-voice)"],
			agentName: ["string", "Cypress", "agent name on the chip (brand)"],
			statusSize: ["number", "52", "status font px"],
			f0: ["number", "709", "reference frame the scene starts on"],
		},
		render: OrganizeTile,
	},
	"cypress-chat-stack": {
		note: "The chat thread on black, framed big (840 px cards): it whips in from below under vertical motion blur and settles; each new message scrolls the stack on one measured step while the new card rides up late and fades in; a hard cut to the request alone, the agent's reply fading in under it, and the reply shrinking toward a chip as everything accelerates away. f941-f1136. history, linkCard, thread, request, reply and people (photo slot per name) are all fields.",
		nativeMs: 8167,
		params: {
			agentName: ["string", "Cypress", "agent display name (brand)"],
			markSrc: ["string", "-", "image slot: the agent badge mark"],
			people: [
				"object",
				"{Luis:{photo,tone},...}",
				"image slots: avatar photo per participant (drawn initial fallback)",
			],
			history: [
				"array",
				"3 agent messages",
				"agent messages that scroll past during the whip (product-voice)",
			],
			linkCard: ["object", "{text, linkLabel, link}", "the agent's source card (product-voice)"],
			thread: [
				"array",
				"Luis / Dee / Sam / agent",
				"messages that arrive one by one (user-voice / product-voice)",
			],
			request: ["object", "{name:'You', text}", "the user's request (user-voice)"],
			reply: ["object", "{text:'On it.'}", "the agent's reply (product-voice)"],
			f0: ["number", "941", "reference frame the scene starts on"],
		},
		render: ChatStack,
	},
	"cypress-sort-board": {
		note: "The whiteboard sort and vote, on the measured camera: a hard cut in close, a fast pull-back while every note is dragged (agent cursor riding the grabbed note) into three column panels that type their headers and snap as they re-lay out; collaborator cursors pop in, the camera tilts up to the heading and the brand sticker, the call window docks top right with a check mark, and vote stamps pop onto notes; then the paper whips up off the top under vertical motion blur to reveal the chat below. f757-f943. notes / columns / heading / stickerSrc / participants / cursorNames are fields.",
		nativeMs: 7792,
		params: {
			heading: ["string", "What’s our winter special this year?", "board heading (feature)"],
			columns: ["array", "[{title,sub}] x3", "column titles and sub-lines (feature)"],
			notes: [
				"array",
				"17 x {text, author, colour}",
				"sticky notes in reference slot order (user-voice)",
			],
			agentName: ["string", "Cypress", "the agent cursor label (brand)"],
			cursorNames: ["object", "{}", "rename collaborator cursors {Sam:'...'}"],
			stickerSrc: ["string", "-", "image slot: the brand sticker art"],
			participants: ["array", "CALL_PEOPLE", "image slots: docked call window avatars"],
			f0: ["number", "757", "reference frame the scene starts on"],
		},
		render: SortBoard,
	},
};
