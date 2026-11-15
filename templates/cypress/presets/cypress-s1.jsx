/**
 * cypress s1 — the call fills up, the agent joins and says hello, the title
 * card and the first request (reference f0 -> f354, 0 -> 14.79 s; the cut
 * to s2 is f355).
 *
 * Every number below is measured off the reference frames (stage px =
 * reference px / 1.5, f = reference frame at 24 fps). Three shots:
 *
 *   f0-f178   CALL GRID on [0,1,0]. One world in stage px. Tiles reflow as
 *             people join: each tile LERPS its rect old -> new on an o3
 *             ease (no cuts — the scene-detect "cuts" at f6/f14/f24/f32 are
 *             these reflows), newcomers FADE IN in place over ~2 frames,
 *             later joiners draw on top. Tile aspect 0.729,
 *             gaps 7 px, radius 8. At f121 a 7th slot traces a dashed
 *             outline clockwise, fills dark (f129-f135), and the agent's
 *             coral blob pops in (f143-f149, overshoot to f160), lifts and
 *             shrinks on threes (f167-f176) and becomes a dome on a horizon
 *             that starts drawing at f177.
 *   f179-f225 HARD CUT to a close-up: the SAME world under a camera centred
 *             on the agent tile (world 943.4, 460) at x2.097, creeping in
 *             linearly (+0.0054/f) and accelerating into the cut (x2.548 by
 *             f225). The glyph animates ON TWOS: the horizon finishes
 *             drawing (f195), the dome settles, "Hey team" fades in
 *             (f185-f188), rays grow centre -> inner -> outer (f201-f213).
 *   f226-f354 HARD CUT to cream: serif title centred, words fading in one
 *             frame apart and rising ~23 px into place; a centred zoom that
 *             CONTINUES the close-up's push through the cut (x0.684 at f226,
 *             decelerating to a 1%/10 f creep, accelerating again from f340).
 *             The voice bubble slides up/fades in top-right at f250 and
 *             transcribes; the reply bubble rises in bottom-left at f306.
 *             From f336 the bubbles scale faster than the title (x1.285 vs
 *             x1.071 at f354): they fly at the camera into the cut.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import {
	AgentGlyph,
	CallBar,
	Cam,
	curve,
	EASE,
	Layer,
	NameChip,
	P,
	PersonTile,
	ReplyBubble,
	refFrame,
	rgbs,
	SANS,
	SERIF,
	SlotOutline,
	textWidth,
	VoiceBubble,
	wordColours,
	words,
} from "./cypress-shared.jsx";

// ── the call grid ─────────────────────────────────────────────────────────

/** Layouts [x, y, w, h] per participant index (0..5 people, 6 the agent). */
const R = (x, y, w = 325, h = 237) => [x, y, w, h];
const S = (x, y) => [x, y, 300, 219];
const LAYOUTS = [
	{ 0: [170, 110, 630, 421] }, // f0: the solo tile, already shrinking
	{ 0: [146, 138, 490, 357], 1: [643, 139, 490, 357] }, // f4
	{ 0: R(146, 214), 1: R(478, 214), 2: R(809, 214) }, // f11
	{ 0: R(312, 92), 1: R(643, 92), 2: R(312, 336), 3: R(643, 336) }, // f21
	{ 0: R(146, 92), 1: R(478, 92), 2: R(809, 92), 3: R(312, 336), 4: R(643, 336) }, // f29
	{ 0: R(146, 92), 1: R(478, 92), 2: R(809, 92), 3: R(146, 336), 4: R(478, 336), 5: R(809, 336) }, // f37
	{
		0: S(30, 125),
		1: S(337, 125),
		2: S(643, 125),
		3: S(950, 125),
		4: S(183, 351),
		5: S(490, 351),
		6: S(797, 351),
	}, // f121
];
/**
 * Reflows: start frame, duration, o3. Fitted to the tracked tile edges:
 * You's width 630,546,..,492 (f0-f3); 488,429,373,346,332,327 (f5-f10);
 * You's x 147,175,235,271,291,303,309 (f13-f19); 308,250,194,166,153,148
 * (f23-f28); Teo's x 309,250,194,167,153,148 (f31-f36); You's x
 * 146,137,103,73,56,44,37,33,31,30 (f112-f121).
 */
const REFLOWS = [
	[0, 4],
	[5.2, 5.7],
	[13.4, 7.4],
	[23.2, 5.5],
	[31.2, 5.5],
	[112.9, 7.9],
];
/** Newcomers fade in at their target rect (f1 Ines dim, f2 full; f8-f10 Marcus; ...). */
const JOIN = { 1: [0.4, 2.4], 2: [7.6, 10], 3: [16.5, 18.5], 4: [24.6, 27], 5: [33.4, 35.6] };
/** Active-speaker ring: [who, on-from, on-full, off-from, off-gone] (edge brightness 234/253, 208/116). */
const SPEAK = [
	[3, 27, 29, 44.5, 46.5],
	[0, 74, 76, 92.5, 94],
	[2, 94, 96, 110.5, 112],
	[4, 131, 133.5, 155.5, 157],
	[5, 156, 158, 177, 178.9],
];

function tileRect(i, f) {
	let k = 0;
	for (let j = 0; j < REFLOWS.length; j++) if (f >= REFLOWS[j][0]) k = j;
	const [s, d] = REFLOWS[k];
	const to = LAYOUTS[k + 1];
	if (!to[i]) return null;
	const from = LAYOUTS[k][i] ?? to[i];
	const p = EASE.o3(clamp01((f - s) / d));
	return {
		r: from.map((v, n) => lerp(v, to[i][n], p)),
		travel: p < 1 ? Math.hypot(to[i][0] - from[0], to[i][1] - from[1]) : 0,
	};
}

/** Default people: the fictional team (cam-off people in the reference slots 1 and 3). */
const PEOPLE = [
	{
		name: "You",
		room: [132, 96, 70],
		skin: [214, 170, 140],
		shirt: [30, 34, 44],
		hair: [96, 88, 80],
		side: 1,
	},
	{ name: "Priya", camOff: true, muted: true, tone: [86, 74, 92] },
	{
		name: "Jonah",
		room: [170, 174, 172],
		skin: [205, 160, 130],
		shirt: [176, 146, 116],
		hair: [74, 50, 36],
		side: -1,
	},
	{ name: "Luis", camOff: true, tone: [118, 186, 196] },
	{
		name: "Dee",
		room: [168, 176, 170],
		skin: [224, 190, 164],
		shirt: [196, 200, 214],
		hair: [44, 32, 28],
		side: 1,
	},
	{
		name: "Sam",
		room: [190, 174, 146],
		skin: [212, 166, 140],
		shirt: [122, 88, 62],
		hair: [62, 52, 46],
		side: -1,
	},
];

/** Agent glyph keys, in WORLD px relative to the horizon centre (941.6, 467). */
const G_U = 133; // horizon width (f215: 483-788 stage / 2.288)
// disc radius: pop f143-f149 (bbox 20,44,61,73,79,83,84), settle 77 by f158,
// 74 by f170, then steps on threes 58 (f173) and 42 (f176); close-up dome
// 44 (f179) -> 48 (f182) -> 52 (f185) -> 55 (f188) -> 55.5 (f191+).
const DISC_R = [
	[142.6, 0],
	[143, 10],
	[144, 22],
	[145, 30.5],
	[146, 36.5],
	[147, 39.5],
	[148, 41.5],
	[149, 42],
	[150, 42],
	[151, 41],
	[153, 40.5],
	[155, 39.5],
	[158, 38.5],
	[166, 38.5],
	[170, 37],
	[172, 37],
	[172.5, 29],
	[175, 29],
	[175.5, 21],
	[178, 21],
	[179, 22],
	[182, 24],
	[185, 26.1],
	[188, 27.3],
	[191, 27.7],
];
// disc centre y (+down): blob at 463 world until f166, lifts to 457 by f170,
// dome centre 458 (f176) -> 461 (f179) -> sinks to 471 by f191.
const DISC_Y = [
	[166, -4],
	[167, -5.2],
	[168, -8],
	[169, -9],
	[170, -10],
	[172, -10.7],
	[175, -11],
	[175.5, -9],
	[178, -9],
	[179, -6],
	[182, -3.4],
	[185, 0.3],
	[188, 2.6],
	[191, 4],
];
const CLIP_AT = [
	[175.5, 5],
	[178, 5],
	[179, 3.5],
	[188, 3],
];
// horizon right end: f177 ~897, then 923.8, 944.3, 961.4, 975.9, 987.4,
// 995, 1001.6, 1007, 1008.4 (f179-f195, odd frames) over a 874.7 left end.
const HORIZON = [
	[176.5, 0],
	[177, 0.17],
	[179, 0.37],
	[181, 0.52],
	[183, 0.65],
	[185, 0.76],
	[187, 0.84],
	[189, 0.9],
	[191, 0.95],
	[193, 0.99],
	[195, 1],
];
// rays: the centre ray's tip radius 34.6 (a dot, f201), 38.5, 45.9, 54.6,
// 59.7, 62.1 (f211); the inner pair dots at f205, the outer pair at f207.
const RAY_C = [
	[200.5, -1],
	[201, 0.001],
	[203, 0.072],
	[205, 0.238],
	[207, 0.49],
	[209, 0.735],
	[211, 1],
];
const RAY_I = [
	[204.5, -1],
	[205, 0.001],
	[207, 0.1],
	[209, 0.4],
	[211, 0.85],
	[213, 1],
];
const RAY_O = [
	[206.5, -1],
	[207, 0.001],
	[209, 0.15],
	[211, 0.6],
	[213, 1],
];

/** The glyph animates on twos from the horizon on (f177/178, f179/180 ... hold). */
const onTwos = (f) => {
	if (f < 176.5) return f;
	const fi = Math.floor(f);
	return fi % 2 === 1 ? fi : fi - 1;
};

function AgentSlot({ c, f }) {
	const [x, y, w, h] = LAYOUTS[6][6];
	if (f < 120.5) return null;
	const draw = curve(
		[
			[121, 0],
			[122, 0.12],
			[123, 0.25],
			[124, 0.48],
			[125, 0.66],
			[126, 0.76],
			[127, 0.94],
			[128, 1],
		],
		f,
	);
	const dash = curve(
		[
			[129.5, 1],
			[135, 0],
		],
		f,
	);
	const body = curve(
		[
			[128.5, 0],
			[131, 0.35],
			[133, 0.75],
			[135, 1],
		],
		f,
	);
	const chip = curve(
		[
			[129, 0],
			[136, 1],
		],
		f,
	);
	const fq = onTwos(f);
	const r = curve(DISC_R, fq);
	const clip = fq >= 175.5;
	// the blob pops in semi-opaque (f143 coral reads darker on the tile, full by f147)
	const blobOp = curve(
		[
			[142.6, 0.5],
			[143, 0.6],
			[145, 0.85],
			[147, 1],
		],
		f,
	);
	const hx = 941.6 - x;
	const hy = 467 - y;
	const status = c.status ?? "Hey team";
	const sOp = curve(
		[
			[185, 0],
			[186, 0.45],
			[187, 0.8],
			[188, 1],
		],
		fq,
	);
	return (
		<div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
			<div
				style={{
					position: "absolute",
					inset: 0,
					borderRadius: 8,
					background: rgbs(P.tile),
					opacity: body,
				}}
			/>
			<SlotOutline w={w} h={h} draw={draw} opacity={dash} id="s1slot" colour={[206, 186, 178]} />
			{r > 0 ? (
				<div style={{ position: "absolute", left: hx - G_U / 2, top: hy - G_U * 0.432 }}>
					<AgentGlyph
						kind="sun"
						size={G_U}
						id="s1sun"
						phase={fq * 0.09}
						opacity={blobOp}
						amp={clip ? 0.035 : 0.05}
						discR={r / G_U}
						discX={4.5 / G_U}
						discY={curve(DISC_Y, fq) / G_U}
						clip={clip}
						clipAt={curve(CLIP_AT, fq) / G_U}
						horizon={curve(HORIZON, fq)}
						rayP={[
							curve(RAY_C, fq),
							curve(RAY_I, fq),
							curve(RAY_I, fq),
							curve(RAY_O, fq),
							curve(RAY_O, fq),
						]}
						stroke={8.2}
						rayStroke={5.4 / G_U}
					/>
				</div>
			) : null}
			{sOp > 0 && status ? (
				// f215: "Hey team" centred on world x 943.4, baseline 505, cap 12.2 world px
				<div
					style={{
						position: "absolute",
						left: 943.4 - x - 200,
						width: 400,
						top: 505 - y - 18,
						textAlign: "center",
						font: `400 18px ${SANS}`,
						lineHeight: "24px",
						color: rgbs(P.white, sOp),
						whiteSpace: "nowrap",
					}}
				>
					{status}
				</div>
			) : null}
			<div style={{ position: "absolute", left: 14, bottom: 16, opacity: chip }}>
				<NameChip
					name={c.agentName ?? "Cypress"}
					muted
					bg={[0, 0, 0]}
					alpha={0.32}
					padL={7}
					gap={8}
					padR={11}
					colour={[226, 226, 221]}
				/>
			</div>
		</div>
	);
}

/** The whole call in world (= wide-shot stage) px at reference frame f. */
function CallWorld({ c, f }) {
	const people = (c.people ?? PEOPLE).slice(0, 6).map((p, i) => ({ ...PEOPLE[i], ...p }));
	const tiles = [];
	people.forEach((p, i) => {
		const t = tileRect(i, f);
		if (!t) return;
		const j = JOIN[i];
		const op = j ? EASE.o(clamp01((f - j[0]) / (j[1] - j[0]))) : 1;
		if (op <= 0) return;
		let speak = 0;
		for (const [who, a, b, d, e] of SPEAK)
			if (who === i && f >= a && f <= e)
				speak = Math.min(clamp01((f - a) / (b - a)), 1 - clamp01((f - d) / (e - d)));
		tiles.push({ i, p, t, op, speak });
	});
	// z-order is join order (f24 Teo over Marcus, f114-f116 Teo over Ines/Marcus but under June/Vinny)
	return (
		<>
			{tiles.map(({ i, p, t, op, speak }) => (
				<div key={i} style={{ position: "absolute", left: t.r[0], top: t.r[1] }}>
					<PersonTile {...p} w={t.r[2]} h={t.r[3]} f={f} seed={i} speak={speak} opacity={op} />
				</div>
			))}
			<AgentSlot c={c} f={f} />
			<CallBar labels={c.controls} />
		</>
	);
}

/** Close-up camera (centre fixed on the agent tile; scale from tile width / 299). */
const CU_S = [
	[179, 2.097],
	[190, 2.151],
	[200, 2.211],
	[210, 2.261],
	[215, 2.288],
	[218, 2.304],
	[219, 2.314],
	[220, 2.328],
	[221, 2.348],
	[222, 2.378],
	[223, 2.418],
	[224, 2.472],
	[225, 2.548],
	[226, 2.64],
];

// ── the cream title card and the first exchange ───────────────────────────

/** Title-layer zoom about stage centre, from the title's left edge (640 - x) / 294. */
export const S1_TITLE_ZOOM = [
	[226, 0.684],
	[227, 0.752],
	[228, 0.776],
	[229, 0.796],
	[230, 0.81],
	[231, 0.823],
	[232, 0.83],
	[233, 0.84],
	[234, 0.847],
	[235, 0.854],
	[240, 0.881],
	[245, 0.898],
	[250, 0.908],
	[260, 0.922],
	[270, 0.932],
	[280, 0.942],
	[290, 0.956],
	[300, 0.966],
	[310, 0.976],
	[320, 0.986],
	[330, 1],
	[335, 1.003],
	[340, 1.01],
	[343, 1.014],
	[345, 1.017],
	[347, 1.024],
	[349, 1.031],
	[350, 1.034],
	[351, 1.037],
	[352, 1.044],
	[353, 1.054],
	[354, 1.071],
	[355, 1.09],
];
/** Bubble-layer zoom: rides the title zoom, then outruns it from f336 (voice height 156 -> 171 f348; reply top 467 -> 496 f354). */
const BUBBLE_ZOOM = [
	[336, 1.006],
	[338, 1.019],
	[340, 1.022],
	[342, 1.032],
	[344, 1.045],
	[346, 1.064],
	[347, 1.077],
	[348, 1.096],
	[349, 1.106],
	[350, 1.123],
	[351, 1.15],
	[352, 1.189],
	[353, 1.22],
	[354, 1.285],
	[355, 1.35],
];
const bubbleZoom = (f) => (f < 336 ? curve(S1_TITLE_ZOOM, f) : curve(BUBBLE_ZOOM, f));

// title word 1: alpha .58/.80/.92/1 (f226-f229); word 2: .32/.57/.80/.94/1 (f227-f231);
// rise (world px below rest) 23, 15.7, 11, 7.7, 4.3, 2.3, 0 (f226-f232).
const T_ALPHA0 = [
	[225.4, 0],
	[226, 0.58],
	[227, 0.8],
	[228, 0.92],
	[229, 1],
];
const T_ALPHA1 = [
	[226.4, 0],
	[227, 0.32],
	[228, 0.57],
	[229, 0.8],
	[230, 0.94],
	[231, 1],
];
const T_RISE = [
	[225.4, 27],
	[226, 23],
	[227, 15.7],
	[228, 11],
	[229, 7.7],
	[230, 4.3],
	[231, 2.3],
	[232, 0.5],
	[234, 0],
];

// voice bubble: f250 already 39 px low at alpha .59, then 27.8, 22.6, 18.6,
// 14.9, 12.7, 10.1 (f256), 7.4 (f258), 5.2 (f260), 3 (f262), 0.8 (f265);
// body alpha .72 .78 .82 .85 (f251-f254), .89 (f256), .96 (f260), 1 (f268).
const V_DY = [
	[249.4, 46],
	[250, 39],
	[251, 27.8],
	[252, 22.6],
	[253, 18.6],
	[254, 14.9],
	[255, 12.7],
	[256, 10.1],
	[258, 7.4],
	[260, 5.2],
	[262, 3],
	[265, 0.8],
	[268, 0],
];
const V_OP = [
	[249.4, 0],
	[250, 0.59],
	[251, 0.72],
	[252, 0.78],
	[253, 0.82],
	[254, 0.85],
	[256, 0.89],
	[260, 0.96],
	[268, 1],
];
// reply bubble: hard in at f306 (full alpha) 38.9 px low, 24.4, 19.2, 16,
// 12.9, 11.7, 9.6 (f312), 7.3 (f314), 5 (f316), 3.8, 2.5 (f320), 1.1 (f324).
const R_DY = [
	[306, 38.9],
	[307, 24.4],
	[308, 19.2],
	[309, 16],
	[310, 12.9],
	[311, 11.7],
	[312, 9.6],
	[314, 7.3],
	[316, 5],
	[318, 3.8],
	[320, 2.5],
	[324, 1.1],
	[330, 0],
];

/** Word arrival frames past the end of a measured list keep its last cadence. */
const extendAt = (at, n) => {
	const out = at.slice(0, n);
	while (out.length < n) out.push((out[out.length - 1] ?? 0) + 4);
	return out;
};

// ── presets ──────────────────────────────────────────────────────────────

const PEOPLE_PARAM = [
	"array",
	"6 people",
	"participants in join order: {name, photo (image slot: webcam still), camOff, avatarSrc (image slot), muted, tone, room/skin/shirt/hair (stand-in colours), side}",
];

export const S1_PRESETS = {
	"cypress-call-grid": {
		note: "A video call filling up: webcam tiles reflow as six people join (rects lerp on an o3 ease, newcomers fade in place, later joiners on top), an active-speaker ring hops between tiles, then a 7th slot traces a dashed outline, fills dark and the agent's coral blob pops in, lifts, shrinks on threes and starts its sunrise horizon. Each person is an image slot (`photo`, or `avatarSrc` when camOff) with a drawn stand-in. Times are reference frames via `f0` (0).",
		nativeMs: 7458,
		params: {
			people: PEOPLE_PARAM,
			agentName: ["string", "Cypress", "the agent's chip name (role product)"],
			controls: ["array", "[Mute, Off, Share, Chat, Settings, End]", "control-bar labels"],
			f0: ["number", "0", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 0);
			return (
				<Layer z={10} style={{ background: rgbs(P.black) }}>
					<CallWorld c={c} f={f} />
				</Layer>
			);
		},
	},

	"cypress-agent-hello": {
		note: "Hard cut to a close-up of the agent's tile (the same call world under a camera centred on it at x2.1, creeping in and accelerating into the next cut): the horizon finishes drawing under a coral dome, the status line fades in, and five rays grow centre -> inner -> outer, all animated on twos. Neighbour tiles stay cropped at the frame edges. Times are reference frames via `f0` (179).",
		nativeMs: 1958,
		params: {
			people: PEOPLE_PARAM,
			agentName: ["string", "Cypress", "the agent's chip name (role product)"],
			status: ["string", "Hey team", "the agent's status line (role product-voice)"],
			f0: ["number", "179", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 179);
			return (
				<Layer z={10} style={{ background: rgbs(P.black) }}>
					<Cam cx={943.4} cy={460} s={curve(CU_S, f)}>
						<CallWorld c={c} f={f} />
					</Cam>
				</Layer>
			);
		},
	},

	"cypress-title-card": {
		note: "Hard cut to cream with the feature name centred in a book serif: words fade in one frame apart while rising ~23 px into place, under a centred zoom that carries the previous shot's push through the cut (x0.68 -> settles -> 1%/10 frames creep -> accelerates into the next cut). Paints the cream ground. Pair with cypress-voice-bubble / cypress-reply-bubble on the same clock. Times are reference frames via `f0` (226).",
		nativeMs: 5375,
		params: {
			title: ["string", "Cypress Meetings", "the feature name (role brand)"],
			ink: ["array", "[19,19,17]", "title colour"],
			size: ["number", "75", "serif size at zoom 1 (f330)"],
			f0: ["number", "226", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 226);
			const k = curve(S1_TITLE_ZOOM, f);
			const size = c.size ?? 75;
			const font = `400 ${size}px ${SERIF}`;
			const ws = words(c.title ?? "Cypress Meetings").map((w) => w.trim());
			const space = textWidth(" ", font);
			const wd = ws.map((w) => textWidth(w, font));
			const total = wd.reduce((a, b) => a + b, 0) + space * (ws.length - 1);
			let x = 640 - total / 2;
			const ink = rgbs(c.ink ?? [19, 19, 17]);
			return (
				<Layer z={10} style={{ background: rgbs(P.paper) }}>
					<Cam cx={640} cy={360} s={k}>
						<svg
							width={1280}
							height={720}
							style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
						>
							{ws.map((w, i) => {
								const fi = i === 0 ? f : f - (i - 1);
								const a = curve(i === 0 ? T_ALPHA0 : T_ALPHA1, fi);
								const dy = curve(T_RISE, f - i);
								const el = (
									// the reference serif is a medium-weight headline cut: Georgia gets a 1.4 px same-ink stroke
									<text
										key={i}
										x={x}
										y={387 + dy}
										style={{ font }}
										fill={ink}
										stroke={ink}
										strokeWidth={1.4}
										strokeLinejoin="round"
										opacity={a}
									>
										{w}
									</text>
								);
								x += wd[i] + space;
								return a > 0 ? el : null;
							})}
						</svg>
					</Cam>
				</Layer>
			);
		},
	},

	"cypress-voice-bubble": {
		note: "The user's spoken request as a dark transcript card, top-right over the title card: it slides up ~39 px and fades in, then transcribes word by word (each word lands muted and brightens over ~2.5 frames; lines reflow as words arrive; the wake word is coral until the next words come). The icon shows level bars while listening and dots once sent. Rides the title card's zoom, then flies at the camera into the cut. Transparent; put it over cypress-title-card on the same clock. Times are reference frames via `f0` (226).",
		nativeMs: 5375,
		params: {
			text: [
				"string",
				"Hey Cypress, can you start a whiteboard please?",
				"the request (role user-voice)",
			],
			wordAt: [
				"array",
				"[249.5,249.5,267,268,276,281,282,290]",
				"reference frame each word arrives",
			],
			accent: ["array", "[1]", "word indices painted coral (the wake word)"],
			accentUntil: ["number", "268.5", "frame the accent fades back to white"],
			enterAt: ["number", "250", "frame the card appears"],
			listenFrom: ["number", "251.5", "frame the icon switches dots -> level bars"],
			sentAt: ["number", "299.5", "frame the icon switches back to dots"],
			f0: ["number", "226", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 226);
			const e = (c.enterAt ?? 250) - 250;
			if (f < 249.4 + e) return null;
			const text = c.text ?? "Hey Cypress, can you start a whiteboard please?";
			const n = words(text).length;
			const at = extendAt(c.wordAt ?? [249.5, 249.5, 267, 268, 276, 281, 282, 290], n);
			const cols = wordColours(n, f, at, {
				ramp: 2.5,
				accent: { i: c.accent ?? [1], until: c.accentUntil ?? 268.5 },
			});
			const icon = f < (c.listenFrom ?? 251.5) || f >= (c.sentAt ?? 299.5) ? "dots" : "wave";
			return (
				<Layer z={12}>
					<Cam cx={640} cy={360} s={bubbleZoom(f)}>
						<div style={{ position: "absolute", left: 600, top: 43.5 + curve(V_DY, f - e) }}>
							<VoiceBubble
								text={text}
								colours={cols}
								icon={icon}
								f={f}
								height={156}
								opacity={curve(V_OP, f - e)}
							/>
						</div>
					</Cam>
				</Layer>
			);
		},
	},

	"cypress-reply-bubble": {
		note: "The agent's answer as a dark card bottom-left over the title card: it cuts in at full opacity ~39 px low and rises into place on an exponential (f306-f330) while its text streams in (the first line lands muted and brightens, the last word follows two frames later). Rides the title card's zoom, then flies at the camera into the cut. `markSrc` is the image slot for the agent's mark. Times are reference frames via `f0` (226).",
		nativeMs: 5375,
		params: {
			name: ["string", "Cypress", "the agent's name (role product)"],
			text: [
				"string",
				"Let’s get this brainstorm brewing.",
				"the agent's reply (role product-voice)",
			],
			wordAt: ["array", "[305.5,305.5,305.5,305.5,307.5]", "reference frame each word arrives"],
			enterAt: ["number", "306", "frame the card cuts in"],
			markSrc: ["string", "-", "image slot: the agent's mark"],
			f0: ["number", "226", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 226);
			const e = (c.enterAt ?? 306) - 306;
			if (f < 306 + e) return null;
			const text = c.text ?? "Let’s get this brainstorm brewing.";
			const n = words(text).length;
			const at = extendAt(c.wordAt ?? [305.5, 305.5, 305.5, 305.5, 307.5], n);
			const cols = wordColours(n, f, at, { ramp: 3, full: P.replyText });
			return (
				<Layer z={13}>
					<Cam cx={640} cy={360} s={bubbleZoom(f)}>
						<div style={{ position: "absolute", left: 58, top: 467 + curve(R_DY, f - e) }}>
							<ReplyBubble
								name={c.name ?? "Cypress"}
								text={text}
								colours={cols}
								height={204}
								markSrc={c.markSrc}
							/>
						</div>
					</Cam>
				</Layer>
			);
		},
	},
};
