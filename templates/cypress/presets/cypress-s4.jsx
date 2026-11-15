/**
 * cypress s4 — the notes doc, the word-swap line and the end card
 * (reference f1137 -> f1500, 47.375 -> 62.54 s).
 *
 * Three beats, each a pure function of t keyed in reference frames:
 *
 *   cypress-notes-doc   f1137-f1244  A docs-app meeting-notes page on white.
 *                       The agent's tag + text caret lands before the first
 *                       heading, opens a line, types "Next steps", and an
 *                       embedded launch-plan card grows into the gap with a
 *                       soft coral glow while a Gantt chart streams in. A
 *                       2D camera then pushes in to 1.5x on the card, holds,
 *                       and the page whips up under a vertical motion blur.
 *   cypress-swap-line   f1245-f1411  Hard cut to cream. A serif line rises in
 *                       word by word under vertical motion blur; the agent's
 *                       tag pops out of a caret after the first word, selects
 *                       it, and the word is REPLACED on hard cuts while the
 *                       line re-centres; selection clears, the tag folds
 *                       back, a viewer cursor arrives with a reaction bubble,
 *                       and the line fades out word by word, left to right.
 *   cypress-endcard     f1412-f1500  A coral dot blooms into the mark, which
 *                       swells and slides left while the serif wordmark
 *                       types on beside it; the lockup lands centred.
 *
 * Stage px = reference px / 1.5. Measurements below cite reference frames.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import {
	AgentTag,
	curve,
	Layer,
	Mark,
	mix,
	P,
	Pointer,
	refFrame,
	rgbs,
	SANS,
	SERIF,
	TAG,
	textWidth,
} from "./cypress-shared.jsx";

// ── small helpers ─────────────────────────────────────────────────────────

/** Greedy word wrap with measured widths. */
function wrap(text, font, maxW, ls = 0) {
	const out = [];
	let line = "";
	for (const w of String(text).split(/\s+/)) {
		const next = line ? `${line} ${w}` : w;
		if (line && textWidth(next, font) + ls * next.length > maxW) {
			out.push(line);
			line = w;
		} else line = next;
	}
	if (line) out.push(line);
	return out;
}

/**
 * Streaming text: `p` characters have arrived; the last `n` of them are still
 * fading in and carry a coral tint (f1172 "Launch Plan": the leading letters
 * are pale coral, the settled ones ink). Chars not yet arrived keep layout.
 */
function Stream({ text, p, n = 6, colour, tint = P.coral }) {
	const s = String(text);
	if (p >= s.length + n) return <span style={{ color: rgbs(colour) }}>{s}</span>;
	const solid = Math.max(0, Math.min(s.length, Math.floor(p - n)));
	const tail = [];
	for (let i = solid; i < s.length; i++) {
		const a = clamp01((p - i) / n);
		tail.push(
			<span key={i} style={{ color: rgbs(mix(tint, colour, a), a) }}>
				{s[i]}
			</span>,
		);
	}
	return (
		<span>
			<span style={{ color: rgbs(colour) }}>{s.slice(0, solid)}</span>
			{tail}
		</span>
	);
}
/** Arrived-char count for a stream running f0 -> f1 (frames). */
const sp = (f, f0, f1, len, n = 6) => clamp01((f - f0) / Math.max(0.01, f1 - f0)) * (len + n);

// ── the doc ───────────────────────────────────────────────────────────────

const PAGE = [254, 255, 253]; // f1150 page white
const CARD_BG = [253, 250, 243]; // f1178 card body
const GREEN = [36, 100, 65]; // f1225 ship bars, title
const PURPLE = [76, 54, 152]; // f1225 Today pill
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DOC_DEFAULTS = {
	tabTitle: "Winter special brainstorm | Meeting notes",
	boardTab: "Winter special whiteboard",
	docTitle: "Winter special brainstorm | Meeting notes",
	date: "Nov 10, 2026",
	author: "@Maya",
	agentName: "Cypress",
	heading: "Next steps",
	sections: [
		{
			h1: "Summary",
			body: "The team brainstormed 17 ideas for this year’s winter special. Cypress sorted them from easiest to hardest to make, and the vote went to Black Sesame Blizzard from the Medium column. Its one new ingredient is black sesame paste, which comes from one small-batch supplier, so locking in supply comes first.",
		},
		{
			h1: "Agenda",
			bullets: [
				"Pick this year’s winter special",
				"Sort the ideas from easiest to hardest, then vote",
				"Plan the launch",
			],
		},
		{ h1: "Cypress’s notes" },
		{
			h2: "Decisions",
			bullets: [
				"Black Sesame Blizzard is this year’s winter special.",
				"Churro Latte is the backup if the sesame order falls through.",
				"Lingonberry Tonic is out: lingonberries ship in 10–14 days, too late for the holiday.",
			],
		},
		{
			h2: "Open questions",
			bullets: [
				"How many cups for the first week? Priya’s pre-order forecast lands Thu Nov 12.",
				"Same cup sleeve as last year, or new art?",
			],
		},
		{
			h2: "Parked for next year",
			bullets: [
				"A savory line: toast specials, brown butter, brûlée",
				"Matcha mocha, once we can keep the foam stable",
			],
		},
	],
	cardEyebrow: "LITTLE EMBER COFFEE",
	cardTitle: "Black Sesame Blizzard Launch Plan",
	cardNote:
		"Everything from Nov 16 on waits on the black sesame. The syrup and the menu card run side by side, and both must finish before launch on Nov 20.",
	month: "NOVEMBER 2026",
	firstDay: 10,
	firstWeekday: 2, // Nov 10 2026 is a Tuesday
	todayLabel: "Today",
	prepDays: 3, // columns tinted pink (f1225: 10-12)
	waitDay: 6, // dashed "waits on" column (f1225: Mon 16)
	rows: [
		{ section: "PREP", colour: [178, 75, 110] },
		{
			task: "Lock flavor",
			owner: "Maya",
			tone: [169, 116, 36],
			decided: 0,
			label: "Decided today",
		},
		{ task: "Lock pricing", owner: "Jonah", tone: [53, 99, 187], bar: [0, 1] },
		{ task: "Pre-order forecast", owner: "Priya", tone: [133, 113, 200], bar: [1, 2] },
		{ task: "Recipe test", owner: "Noor", tone: [85, 112, 157], bar: [1, 2] },
		{ task: "Place sesame order", owner: "Dee", tone: [26, 135, 104], bar: [2, 2] },
		{ section: "ON THE ROAD", colour: [110, 110, 104] },
		{
			task: "Sesame in transit",
			owner: "Supplier",
			tone: [136, 137, 132],
			bar: [2, 5],
			kind: "transit",
		},
		{ section: "ROAST AND SHIP", colour: [40, 110, 75] },
		{ task: "Sesame arrives", owner: "Dee", tone: [32, 132, 106], milestone: 6, label: "Portland" },
		{ task: "Batch syrup", owner: "Sam", tone: [179, 80, 51], bar: [7, 9], kind: "ship" },
		{ task: "Menu card", owner: "Luis", tone: [180, 53, 120], bar: [7, 8], kind: "ship" },
		{ task: "Launch in cafés", owner: "Kit", tone: [78, 134, 73], bar: [10, 11], kind: "launch" },
	],
};

// Agent tag + caret flying in, top-left of the tag (f1137-f1152, coral bbox).
const TAG_X = [
	[1137, 327],
	[1138, 342],
	[1139, 348],
	[1140, 352],
	[1141, 354],
	[1142, 356],
	[1143, 357],
	[1144, 358],
	[1145, 359],
	[1146, 359],
	[1147, 360],
	[1150, 360],
	[1151, 361],
];
const TAG_Y = [
	[1137, 258],
	[1138, 221],
	[1139, 202],
	[1140, 190],
	[1141, 180],
	[1142, 173],
	[1143, 168],
	[1144, 163],
	[1145, 160],
	[1146, 157],
	[1147, 154],
	[1148, 152],
	[1149, 151],
	[1150, 150],
	[1151, 149],
	[1152, 148],
];
// tag width 184 -> 48 px (f1137 -> f1151): scale of the tag+caret unit
const TAG_S = [
	[1137, 3.86],
	[1138, 2.77],
	[1139, 2.14],
	[1140, 1.8],
	[1141, 1.6],
	[1142, 1.45],
	[1143, 1.32],
	[1144, 1.24],
	[1145, 1.17],
	[1146, 1.13],
	[1147, 1.09],
	[1148, 1.07],
	[1149, 1.05],
	[1150, 1.04],
	[1151, 1.0],
];
// "Next steps" typed: share of its width written (tag x 361 -> 452, f1161-f1174)
const TYPE = [
	[1161, 0.02],
	[1162, 0.2],
	[1163, 0.29],
	[1164, 0.42],
	[1165, 0.48],
	[1167, 0.53],
	[1168, 0.6],
	[1170, 0.67],
	[1171, 0.78],
	[1172, 0.91],
	[1174, 1],
];
// the tag tucks down-left into the caret f1175-f1180 (visible right edge 498 -> 461, top 148 -> 163)
const TUCK = [
	[1175, 0],
	[1176, 0.06],
	[1177, 0.17],
	[1178, 0.42],
	[1179, 0.77],
	[1180, 1],
];
// Content below the new line is pushed down by d (Summary heading top - 170):
// the line opens f1156-f1160 (28 px), then the card's space opens f1161-f1186.
// After that the card keeps growing (406 -> 432 as the last rows land) INTO
// the gap above Summary (f1238: card bottom -> Summary 67 world px, not 89).
const CARD_H = [
	[1186, 406],
	[1189, 408],
	[1198, 432],
];
const PUSH = [
	[1155, 0],
	[1156, 2],
	[1157, 6],
	[1158, 11],
	[1159, 18],
	[1160, 28],
	[1161, 41],
	[1162, 59],
	[1163, 84],
	[1164, 117],
	[1165, 161],
	[1166, 216],
	[1167, 274],
	[1168, 325],
	[1169, 366],
	[1170, 398],
	[1171, 424],
	[1172, 444],
	[1173, 460],
	[1174, 474],
	[1175, 484],
	[1176, 493],
	[1177, 501],
	[1178, 506],
	[1179, 511],
	[1180, 514],
	[1181, 517],
	[1182, 519],
	[1184, 521],
	[1186, 523],
	[1200, 526],
];
// Camera: s, and the screen position (X, Y) of the "Next steps" cap top-left
// (world 363,170). s from (Today centre - heading left)/208.7, f1192-f1217.
const CAM_S = [
	[1183, 1],
	[1186, 1.005],
	[1188, 1.02],
	[1189, 1.04],
	[1190, 1.07],
	[1191, 1.12],
	[1192, 1.19],
	[1193, 1.3],
	[1194, 1.36],
	[1195, 1.39],
	[1196, 1.416],
	[1197, 1.428],
	[1198, 1.437],
	[1199, 1.449],
	[1200, 1.457],
	[1202, 1.466],
	[1204, 1.473],
	[1206, 1.481],
	[1208, 1.485],
	[1210, 1.492],
	[1213, 1.495],
	[1217, 1.5],
];
const CAM_X = [
	[1187, 363],
	[1188, 355],
	[1189, 350],
	[1190, 343],
	[1191, 332],
	[1192, 310],
	[1193, 280],
	[1194, 263],
	[1195, 255],
	[1196, 249],
	[1197, 246],
	[1198, 243],
	[1199, 240],
	[1200, 238],
	[1202, 235],
	[1204, 233],
	[1206, 231],
	[1208, 230],
	[1210, 228],
	[1213, 227],
	[1217, 226],
];
const CAM_Y = [
	[1183, 170],
	[1184, 169],
	[1185, 167],
	[1186, 165],
	[1187, 163],
	[1188, 159],
	[1189, 154],
	[1190, 145],
	[1191, 131],
	[1192, 110],
	[1193, 75],
	[1194, 57],
	[1195, 46],
	[1196, 40],
	[1197, 36],
	[1198, 32],
	[1199, 30],
	[1200, 27],
	[1202, 24],
	[1204, 21],
	[1206, 19],
	[1208, 17],
	[1210, 16],
	[1213, 15],
	[1216, 14],
	[1220, 13],
];
// The page then whips up (Today pill y 226 -> 16, f1227-f1240; extrapolated to the cut).
const SCROLL = [
	[1227, 0],
	[1228, 3],
	[1229, 4],
	[1230, 7],
	[1231, 11],
	[1232, 17],
	[1233, 27],
	[1234, 40],
	[1235, 55],
	[1236, 77],
	[1237, 100],
	[1238, 132],
	[1239, 172],
	[1240, 215],
	[1241, 275],
	[1242, 360],
	[1243, 480],
	[1244, 640],
	[1245, 840],
];

/** Card build clock (frames) for the Gantt, read off f1164-f1216. */
function cardTimes(rows) {
	const T = { rows: [] };
	let k = 0;
	for (const r of rows) {
		if (r.section) {
			T.rows.push({ label: 1184 + k * 1.75 - 1.5 }); // f1192 ON THE ROAD, f1194 BAKE AND SHIP
			continue;
		}
		T.rows.push({
			dot: 1182.5 + k * 0.9, // f1184: four dots; f1190: all ten
			task: 1184 + k * 1.75, // f1184 "Lock"; f1200 "Deliver to sto"
			owner: 1184 + k * 0.9,
		});
		k++;
	}
	return T;
}

function DocChrome({ c }) {
	const ink = rgbs([40, 40, 38]);
	// active tab sized to its label (f1150: 6-236 for a 184 px label)
	const tabW = textWidth(c.tabTitle, `400 13px ${SANS}`) + 46;
	const t2 = 6 + tabW + 11;
	return (
		<>
			{/* tab bar (y 0-34) */}
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1280,
					height: 34,
					borderBottom: `1px solid ${rgbs([234, 236, 233])}`,
					boxSizing: "border-box",
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 6,
					top: 5,
					width: tabW,
					height: 23,
					borderRadius: 6,
					background: rgbs([229, 231, 228]),
				}}
			/>
			<svg
				width="10"
				height="12"
				viewBox="0 0 10 12"
				style={{ position: "absolute", left: 14, top: 10 }}
			>
				<path
					d="M1.5 1.5h4.5l2.5 2.5v6.5h-7z"
					fill="none"
					stroke={rgbs([80, 110, 150])}
					strokeWidth="1.1"
					strokeLinejoin="round"
				/>
			</svg>
			<div
				style={{
					position: "absolute",
					left: 30,
					top: 8,
					font: `400 13px ${SANS}`,
					color: ink,
					whiteSpace: "nowrap",
				}}
			>
				{c.tabTitle}
			</div>
			<div
				style={{
					position: "absolute",
					left: t2,
					top: 8,
					width: 14,
					height: 14,
					borderRadius: 3,
					background: rgbs([239, 236, 247]),
				}}
			>
				<svg width="14" height="14" viewBox="0 0 14 14">
					<circle cx="5" cy="7" r="2" fill="none" stroke={rgbs([120, 90, 200])} strokeWidth="1" />
					<circle cx="9.5" cy="5" r="1.4" fill={rgbs([120, 90, 200])} />
					<circle cx="9.5" cy="9.5" r="1.4" fill={rgbs([120, 90, 200])} />
				</svg>
			</div>
			<div
				style={{
					position: "absolute",
					left: t2 + 18,
					top: 8,
					font: `400 13px ${SANS}`,
					color: rgbs([110, 110, 106]),
					whiteSpace: "nowrap",
				}}
			>
				{c.boardTab}
			</div>
			<svg
				width="12"
				height="12"
				viewBox="0 0 12 12"
				style={{ position: "absolute", left: 1232, top: 10 }}
			>
				<path d="M7 1h4v4M11 1L7 5M5 11H1V7M1 11l4-4" fill="none" stroke={ink} strokeWidth="1.3" />
			</svg>
			<div
				style={{
					position: "absolute",
					left: 1258,
					top: 10,
					width: 12,
					height: 11,
					border: `1.4px solid ${ink}`,
					borderRadius: 3,
					boxSizing: "border-box",
				}}
			>
				<div
					style={{
						position: "absolute",
						right: 1.5,
						top: 2,
						width: 1.6,
						height: 4,
						background: ink,
					}}
				/>
			</div>
			{/* breadcrumb bar (y 35-70) */}
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 70,
					width: 1280,
					height: 1,
					background: rgbs([236, 238, 235]),
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 13,
					top: 45,
					font: `400 13px ${SANS}`,
					color: ink,
					whiteSpace: "nowrap",
				}}
			>
				{c.docTitle}
				<span
					style={{
						display: "inline-block",
						marginLeft: 8,
						transform: "translateY(-2px) rotate(45deg)",
						width: 5,
						height: 5,
						borderRight: `1.3px solid ${ink}`,
						borderBottom: `1.3px solid ${ink}`,
					}}
				/>
			</div>
			<svg
				width="12"
				height="12"
				viewBox="0 0 12 12"
				style={{ position: "absolute", left: 1222, top: 47 }}
			>
				<path
					d="M6 8V1.5M3.5 4L6 1.5L8.5 4M1.5 7v3.5h9V7"
					fill="none"
					stroke={ink}
					strokeWidth="1.2"
				/>
			</svg>
			<div
				style={{ position: "absolute", left: 1238, top: 45, font: `400 13px ${SANS}`, color: ink }}
			>
				Share
			</div>
			{/* side buttons */}
			<div
				style={{
					position: "absolute",
					left: 8,
					top: 80,
					width: 32,
					height: 32,
					borderRadius: 7,
					border: `1px solid ${rgbs([234, 235, 232])}`,
					boxSizing: "border-box",
					boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
				}}
			>
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						style={{
							position: "absolute",
							left: 10,
							top: 10 + i * 4.5,
							width: i === 1 ? 7 : 10,
							height: 1.4,
							background: ink,
						}}
					/>
				))}
			</div>
			<div
				style={{
					position: "absolute",
					left: 1127,
					top: 80,
					width: 145,
					height: 32,
					borderRadius: 9,
					border: `1px solid ${rgbs([234, 235, 232])}`,
					boxSizing: "border-box",
					boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
					font: `400 13px ${SANS}`,
					color: ink,
				}}
			>
				<svg
					width="11"
					height="11"
					viewBox="0 0 11 11"
					style={{ position: "absolute", left: 11, top: 10 }}
				>
					<path
						d="M1.5 9.5l1-3 5-5 2 2-5 5z"
						fill="none"
						stroke={ink}
						strokeWidth="1.1"
						strokeLinejoin="round"
					/>
				</svg>
				<div style={{ position: "absolute", left: 26, top: 7 }}>Editing</div>
				<div style={{ position: "absolute", left: 92, top: 7 }}>100%</div>
				{[76, 130].map((x) => (
					<span
						key={x}
						style={{
							position: "absolute",
							left: x,
							top: 11,
							transform: "rotate(45deg)",
							width: 4.5,
							height: 4.5,
							borderRight: `1.2px solid ${ink}`,
							borderBottom: `1.2px solid ${ink}`,
						}}
					/>
				))}
			</div>
			<div
				style={{
					position: "absolute",
					left: 1273,
					top: 155,
					width: 5,
					height: 310,
					borderRadius: 3,
					background: rgbs([206, 208, 205]),
				}}
			/>
		</>
	);
}

/** The doc body below the inserted block, laid out from the f1137 flow. */
function DocFlow({ sections, top }) {
	const out = [];
	const ink = rgbs([30, 30, 28]);
	const bodyFont = `400 14px ${SANS}`;
	let y = top; // centre of the current line
	let prev = null; // "h1" | "h2" | "line"
	let k = 0;
	const H = (txt, size, cy) =>
		out.push(
			<div
				key={k++}
				style={{
					position: "absolute",
					left: 363,
					top: cy - size * 0.62,
					font: `400 ${size}px ${SERIF}`,
					letterSpacing: -0.4,
					color: ink,
					whiteSpace: "nowrap",
					lineHeight: 1.2,
				}}
			>
				{txt}
			</div>,
		);
	const L = (txt, cy, bullet) => {
		if (bullet)
			out.push(
				<div
					key={k++}
					style={{
						position: "absolute",
						left: 371,
						top: cy - 2.5,
						width: 5,
						height: 5,
						borderRadius: 3,
						background: ink,
					}}
				/>,
			);
		out.push(
			<div
				key={k++}
				style={{
					position: "absolute",
					left: bullet ? 389 : 363,
					top: cy - 10,
					font: bodyFont,
					lineHeight: "20px",
					color: ink,
					whiteSpace: "nowrap",
				}}
			>
				{txt}
			</div>,
		);
	};
	for (const s of sections) {
		if (s.h1) {
			if (prev) y += prev === "line" ? 42 : 32;
			H(s.h1, 22, y);
			prev = "h1";
		} else if (s.h2) {
			if (prev) y += prev === "line" ? 34 : 32;
			H(s.h2, 17.5, y);
			prev = "h2";
		}
		const lines = s.body
			? wrap(s.body, bodyFont, 537).map((l) => [l, false])
			: (s.bullets ?? []).map((b) => [b, true]);
		lines.forEach(([l, b], i) => {
			y += i === 0 ? (prev === "h1" ? 28 : 27) : 18.7;
			L(l, y, b);
		});
		if (lines.length) prev = "line";
	}
	return <>{out}</>;
}

/** The embedded launch-plan card, local px (= world px; f1225 screen / 1.5). */
function PlanCard({ c, f, h }) {
	const rows = c.rows;
	const T = cardTimes(rows);
	const col = (i) => 208.7 + 25.93 * i; // day column centres (f1225: 539 + 38.9 i screen)
	const nDays = c.nDays ?? 12;
	const panelH = Math.max(0, h - 95);
	const titleFont = `700 17.5px ${SANS}`;
	const titleLines = wrap(c.cardTitle, titleFont, 205);
	const noteFont = `400 8.7px ${SANS}`;
	const noteLines = wrap(c.cardNote, noteFont, 228);
	const els = [];
	const add = (e) => els.push(React.cloneElement(e, { key: els.length }));

	// eyebrow + title + note (f1166-f1190)
	add(
		<div
			style={{
				position: "absolute",
				left: 20,
				top: 15,
				font: `700 7.4px ${SANS}`,
				letterSpacing: 0.9,
				whiteSpace: "nowrap",
			}}
		>
			<Stream
				text={c.cardEyebrow}
				p={sp(f, 1165.5, 1168, c.cardEyebrow.length)}
				colour={[60, 110, 80]}
			/>
		</div>,
	);
	let tf = 1167;
	titleLines.forEach((l, i) => {
		const dur = Math.max(1.5, l.length * 0.13); // f1168 "Huck", f1172 "...Launch Pl"
		add(
			<div
				style={{
					position: "absolute",
					left: 20,
					top: 26 + i * 19.4,
					font: titleFont,
					lineHeight: "22px",
					letterSpacing: -0.2,
					whiteSpace: "nowrap",
				}}
			>
				<Stream text={l} p={sp(f, tf, tf + dur, l.length, 8)} colour={GREEN} />
			</div>,
		);
		tf += dur + 0.4;
	});
	let nf = 1172;
	noteLines.forEach((l, i) => {
		const dur = 6.5;
		add(
			<div
				style={{
					position: "absolute",
					left: 287,
					top: 24 + i * 12.6,
					font: noteFont,
					lineHeight: "12px",
					whiteSpace: "nowrap",
				}}
			>
				<Stream text={l} p={sp(f, nf, nf + dur, l.length, 8)} colour={[85, 85, 80]} />
			</div>,
		);
		nf += dur + 0.5;
	});

	// the chart panel (f1169 faint, f1172 set)
	const pa = curve(
		[
			[1168, 0],
			[1171, 1],
		],
		f,
	);
	const panel = [];
	const padd = (e) => panel.push(React.cloneElement(e, { key: panel.length }));
	padd(
		<div
			style={{
				position: "absolute",
				left: 151,
				width: 400,
				top: 86,
				textAlign: "center",
				font: `700 7.3px ${SANS}`,
				letterSpacing: 0.8,
				whiteSpace: "nowrap",
			}}
		>
			<Stream text={c.month} p={sp(f, 1176, 1179, c.month.length)} colour={[70, 70, 66]} />
		</div>,
	);
	// column bands grow down, staggered left -> right (f1186-f1203 staircase)
	const bandTop = 129.3;
	const bandBot = Math.min(399.3, 76 + panelH - 13.7);
	for (let i = 0; i < nDays; i++) {
		const g = curve(
			[
				[1186.5 + 0.9 * i, 0],
				[1194 + 0.9 * i, 1, "o"],
			],
			f,
		);
		if (g <= 0) continue;
		const tone =
			i < c.prepDays ? [251, 239, 241] : i < c.waitDay ? [244, 243, 238] : [238, 245, 237];
		padd(
			<div
				style={{
					position: "absolute",
					left: col(i) - 11.3,
					top: bandTop,
					width: 22.6,
					height: Math.max(6, (bandBot - bandTop) * g),
					borderRadius: 6,
					background: rgbs(tone),
				}}
			/>,
		);
	}
	// day headers stream left -> right (Today f1178, Wed f1179 ... Sat f1191)
	for (let i = 0; i < nDays; i++) {
		const a = curve(
			[
				[1177.6 + 1.1 * i, 0],
				[1179.6 + 1.1 * i, 1],
			],
			f,
		);
		if (a <= 0) continue;
		const isToday = i === 0;
		const name = isToday ? c.todayLabel : WEEK[(c.firstWeekday + i) % 7];
		const num = c.firstDay + i;
		const numCol = i === c.waitDay ? [40, 115, 80] : [30, 30, 28];
		padd(
			<div
				style={{
					position: "absolute",
					left: col(i) - 15,
					width: 30,
					top: 99.5,
					textAlign: "center",
					font: `${isToday ? 700 : 400} 6.8px ${SANS}`,
					color: rgbs(isToday ? PURPLE : [90, 90, 86], a),
					whiteSpace: "nowrap",
				}}
			>
				{name}
			</div>,
		);
		if (isToday) {
			const pop = curve(
				[
					[1185.5, 0],
					[1187.5, 1.12, "o"],
					[1189, 1],
				],
				f,
			);
			padd(
				<div
					style={{
						position: "absolute",
						left: col(i) - 8.7,
						top: 116.7 - 8.7,
						width: 17.4,
						height: 17.4,
						borderRadius: 9,
						background: rgbs(PURPLE, Math.min(1, pop)),
						transform: `scale(${Math.max(0.5, pop)})`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						font: `600 9px ${SANS}`,
						color: rgbs(pop > 0.3 ? [255, 255, 255] : PURPLE, a),
						border: pop < 0.3 ? `0.8px solid ${rgbs(PURPLE, a * 0.5)}` : "none",
						boxSizing: "border-box",
					}}
				>
					{num}
				</div>,
			);
		} else
			padd(
				<div
					style={{
						position: "absolute",
						left: col(i) - 15,
						width: 30,
						top: 110.5,
						textAlign: "center",
						font: `500 9.3px ${SANS}`,
						color: rgbs(numCol, a),
					}}
				>
					{num}
				</div>,
			);
	}
	// TASK / OWNER (f1181)
	const ha = curve(
		[
			[1180.5, 0],
			[1182, 1],
		],
		f,
	);
	padd(
		<div
			style={{
				position: "absolute",
				left: 33.3,
				top: 113,
				font: `600 7.2px ${SANS}`,
				letterSpacing: 0.7,
				color: rgbs([80, 80, 76], ha),
			}}
		>
			TASK
		</div>,
	);
	padd(
		<div
			style={{
				position: "absolute",
				left: 132,
				top: 113,
				font: `600 7.2px ${SANS}`,
				letterSpacing: 0.7,
				color: rgbs([80, 80, 76], ha),
			}}
		>
			OWNER
		</div>,
	);

	// rows (f1225: PREP 140, rows 158..238 step 20, divider 252, next label 263 ...)
	let y = 140;
	let prevRow = false;
	const rowY = [];
	rows.forEach((r, ri) => {
		if (r.section) {
			if (prevRow) {
				const dy = y + 13.7;
				const g = curve(
					[
						[T.rows[ri].label - 2, 0],
						[T.rows[ri].label + 4, 1, "o"],
					],
					f,
				);
				padd(
					<div
						style={{
							position: "absolute",
							left: 33.3,
							top: dy,
							width: 473 * g,
							height: 0.8,
							background: rgbs([234, 231, 222]),
						}}
					/>,
				);
				y = dy + 12.3;
			}
			rowY.push(y);
			padd(
				<div
					style={{
						position: "absolute",
						left: 33.3,
						top: y - 5,
						font: `700 7.2px ${SANS}`,
						letterSpacing: 0.8,
						whiteSpace: "nowrap",
					}}
				>
					<Stream
						text={r.section}
						p={sp(f, T.rows[ri].label, T.rows[ri].label + 2.5, r.section.length)}
						colour={r.colour ?? [110, 110, 104]}
					/>
				</div>,
			);
			y += 18.3;
			prevRow = false;
			return;
		}
		if (prevRow) y += 20;
		rowY.push(y);
		const t = T.rows[ri];
		padd(
			<div
				style={{
					position: "absolute",
					left: 33.3,
					top: y - 7,
					font: `400 9.7px ${SANS}`,
					whiteSpace: "nowrap",
				}}
			>
				<Stream
					text={r.task}
					p={sp(f, t.task, t.task + 2.5, r.task.length)}
					colour={[30, 30, 28]}
				/>
			</div>,
		);
		const dp = curve(
			[
				[t.dot, 0],
				[t.dot + 1.2, 1.15, "o"],
				[t.dot + 2.2, 1],
			],
			f,
		);
		if (dp > 0)
			padd(
				<div
					style={{
						position: "absolute",
						left: 138.7 - 6,
						top: y - 6,
						width: 12,
						height: 12,
						borderRadius: 6,
						background: rgbs(r.tone ?? [120, 120, 120]),
						transform: `scale(${dp})`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						font: `600 6px ${SANS}`,
						color: "white",
					}}
				>
					{(r.owner ?? "?").slice(0, 1).toUpperCase()}
				</div>,
			);
		padd(
			<div
				style={{
					position: "absolute",
					left: 149.3,
					top: y - 6.3,
					font: `400 8.7px ${SANS}`,
					whiteSpace: "nowrap",
				}}
			>
				<Stream
					text={r.owner ?? ""}
					p={sp(f, t.owner + 1.5, t.owner + 3.5, (r.owner ?? "").length)}
					colour={[70, 70, 66]}
				/>
			</div>,
		);
		prevRow = true;
	});

	// Today line (f1188-f1192) and the dashed wait line (f1196-f1199)
	const tl = curve(
		[
			[1187.5, 0],
			[1192, 1, "o"],
		],
		f,
	);
	padd(
		<div
			style={{
				position: "absolute",
				left: col(0) - 0.6,
				top: 125.4,
				width: 1.3,
				height: (bandBot - 125.4) * tl,
				background: rgbs([96, 70, 180]),
			}}
		/>,
	);
	const wl = curve(
		[
			[1196.8, 0],
			[1200, 1, "o"],
		],
		f,
	);
	padd(
		<div
			style={{
				position: "absolute",
				left: col(c.waitDay) - 0.5,
				top: bandTop,
				width: 0,
				height: (bandBot - bandTop) * wl,
				borderLeft: `1px dashed ${rgbs([50, 120, 85])}`,
			}}
		/>,
	);

	// bars, markers, links
	const barL = (dd) => col(dd) - 11.3;
	const barR = (dd) => col(dd) + 11.3;
	const svg = [];
	const sadd = (e) => svg.push(React.cloneElement(e, { key: svg.length }));
	const head = (x, yy, dir) => {
		const s = 2.6;
		const pts =
			dir === "r"
				? `${x},${yy} ${x - s * 1.4},${yy - s} ${x - s * 1.4},${yy + s}`
				: `${x},${yy} ${x - s},${yy - s * 1.4} ${x + s},${yy - s * 1.4}`;
		return <polygon points={pts} fill={rgbs(GREEN)} />;
	};
	let pinkK = 0;
	let shipK = 0;
	let milestone = null;
	let transit = null;
	const ships = [];
	let launch = null;
	rows.forEach((r, ri) => {
		if (r.section) return;
		const yy = rowY[ri];
		if (r.decided !== undefined) {
			const g = curve(
				[
					[1187.5, 0],
					[1189, 1.2, "o"],
					[1190, 1],
				],
				f,
			);
			if (g > 0)
				padd(
					<div
						style={{
							position: "absolute",
							left: col(r.decided) - 5,
							top: yy - 5,
							width: 10,
							height: 10,
							transform: `rotate(45deg) scale(${g})`,
							background: rgbs([214, 125, 152]),
							borderRadius: 1.5,
						}}
					>
						<svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: "rotate(-45deg)" }}>
							<path d="M3 5.2l1.4 1.4L7 3.8" fill="none" stroke="white" strokeWidth="1.2" />
						</svg>
					</div>,
				);
			padd(
				<div
					style={{
						position: "absolute",
						left: col(r.decided) + 11.5,
						top: yy - 6.5,
						font: `600 8.7px ${SANS}`,
						whiteSpace: "nowrap",
					}}
				>
					<Stream
						text={r.label ?? ""}
						p={sp(f, 1189, 1191.5, (r.label ?? "").length)}
						colour={[196, 95, 128]}
					/>
				</div>,
			);
		}
		if (r.bar) {
			const [d0, d1] = r.bar;
			const x0 = barL(d0);
			const w = barR(d1) - x0;
			let t0;
			let style;
			if (r.kind === "transit") {
				t0 = 1193.3;
				transit = { x1: x0 + w, y: yy };
				style = {
					background: `repeating-linear-gradient(135deg, ${rgbs([228, 225, 214])} 0 3px, ${rgbs([212, 207, 194])} 3px 4.5px)`,
					border: `0.7px solid ${rgbs([196, 192, 180])}`,
				};
			} else if (r.kind === "ship" || r.kind === "launch") {
				t0 = r.kind === "launch" ? 1212 : 1203 + shipK++ * 1.2;
				style = { background: rgbs(GREEN) };
				if (r.kind === "ship") ships.push({ x0, x1: x0 + w, y: yy });
				else launch = { x0, x1: x0 + w, y: yy };
			} else {
				t0 = 1190 + pinkK++ * 1.0;
				style = {
					background: rgbs([236, 190, 201]),
					border: `0.7px solid ${rgbs([218, 158, 176])}`,
				};
			}
			const g = curve(
				[
					[t0, 0],
					[t0 + 3.5, 1, "o3"],
				],
				f,
			);
			if (g > 0)
				padd(
					<div
						style={{
							position: "absolute",
							left: x0,
							top: yy - 6.7,
							width: Math.max(13.4 * Math.min(1, g * 3), w * g),
							height: 13.4,
							borderRadius: 7,
							boxSizing: "border-box",
							opacity: Math.min(1, g * 4),
							...style,
						}}
					/>,
				);
		}
		if (r.milestone !== undefined) milestone = { x: col(r.milestone), y: yy, r };
	});
	if (transit && milestone) {
		// transit end -> down -> right into the milestone (f1197-f1200)
		const g = curve(
			[
				[1196.5, 0],
				[1199.5, 1],
			],
			f,
		);
		const xA = transit.x1 - 5;
		const len = (milestone.y - (transit.y + 6.7) + milestone.x - 7.5 - xA) * g;
		if (g > 0) {
			sadd(
				<path
					d={`M${xA} ${transit.y + 6.7} V${milestone.y} H${milestone.x - 7.5}`}
					fill="none"
					stroke={rgbs(GREEN)}
					strokeWidth="0.9"
					strokeDasharray={`${len} 999`}
				/>,
			);
			if (g >= 1) sadd(head(milestone.x - 7, milestone.y, "r"));
		}
	}
	if (milestone) {
		const g = curve(
			[
				[1199, 0],
				[1200.5, 1.18, "o"],
				[1201.5, 1],
			],
			f,
		);
		const m = milestone;
		if (g > 0)
			padd(
				<svg
					width="24"
					height="24"
					viewBox="-12 -12 24 24"
					style={{
						position: "absolute",
						left: m.x - 12,
						top: m.y - 13,
						overflow: "visible",
						transform: `scale(${g})`,
					}}
				>
					<path d="M2 -7 C4 -11 8 -11 9 -10 C8 -7 5 -6 2 -7Z" fill={rgbs([70, 150, 80])} />
					{[
						[-3.6, 1.2],
						[3.6, 1.2],
						[0, -3.4],
					].map(([x, yy], i) => (
						<ellipse
							key={i}
							cx={x}
							cy={yy}
							rx="3.1"
							ry="4"
							transform={`rotate(${(i - 1) * 25} ${x} ${yy})`}
							fill={rgbs([46, 32, 40])}
						/>
					))}
				</svg>,
			);
		padd(
			<div
				style={{
					position: "absolute",
					left: m.x + 12,
					top: m.y - 6.5,
					font: `700 8.7px ${SANS}`,
					whiteSpace: "nowrap",
				}}
			>
				<Stream
					text={m.r.label ?? ""}
					p={sp(f, 1200, 1202.5, (m.r.label ?? "").length)}
					colour={GREEN}
				/>
			</div>,
		);
		// milestone -> each ship bar (f1201-f1204)
		ships.forEach((s, i) => {
			const g2 = curve(
				[
					[1201 + i * 1.2, 0],
					[1203.5 + i * 1.2, 1],
				],
				f,
			);
			if (g2 <= 0) return;
			const L = s.y - (m.y + 6) + (s.x0 - 1.5 - m.x);
			sadd(
				<path
					d={`M${m.x} ${m.y + 6} V${s.y} H${s.x0 - 1.5}`}
					fill="none"
					stroke={rgbs(GREEN)}
					strokeWidth="0.9"
					strokeDasharray={`${L * g2} 999`}
				/>,
			);
			if (g2 >= 1) sadd(head(s.x0 - 1, s.y, "r"));
		});
	}
	if (launch && ships.length) {
		// ship bars -> join -> down into the launch bar (f1208-f1212)
		const jx = launch.x0 + 6;
		ships.forEach((s, i) => {
			const g3 = curve(
				[
					[1207.5 + i, 0],
					[1210.5 + i, 1],
				],
				f,
			);
			if (g3 <= 0) return;
			const L = jx - s.x1 + (launch.y - 7.5 - s.y);
			sadd(
				<path
					d={`M${s.x1} ${s.y} H${jx} V${launch.y - 7.5}`}
					fill="none"
					stroke={rgbs(GREEN)}
					strokeWidth="0.9"
					strokeDasharray={`${L * g3} 999`}
				/>,
			);
			if (g3 >= 1 && i === 0) sadd(head(jx, launch.y - 7, "d"));
		});
	}
	return (
		<>
			{els}
			<div
				style={{
					position: "absolute",
					left: 20,
					top: 76,
					width: 500,
					height: panelH,
					borderRadius: 8,
					background: rgbs(PAGE),
					border: `0.8px solid ${rgbs([238, 235, 228])}`,
					boxSizing: "border-box",
					opacity: pa,
					overflow: "hidden",
				}}
			>
				<div style={{ position: "absolute", left: -20, top: -76, width: 540, height: 500 }}>
					{panel}
					<svg
						width="540"
						height="500"
						style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
					>
						{svg}
					</svg>
				</div>
			</div>
		</>
	);
}

/** Vertical-only motion blur filter (CSS filter on HTML via inline SVG). */
function VBlur({ id, sigma }) {
	return (
		<svg width="0" height="0" style={{ position: "absolute" }}>
			<filter id={id} x="-5%" y="-40%" width="110%" height="180%">
				<feGaussianBlur stdDeviation={`0 ${sigma.toFixed(2)}`} />
			</filter>
		</svg>
	);
}

// ── the word-swap line ────────────────────────────────────────────────────

const LINE_SIZE = 61; // f1300 ascender 'k' 337 -> baseline 383 (46 px) in Georgia
const LINE_FONT = `400 ${LINE_SIZE}px ${SERIF}`;
const LINE_LS = -1.2;
const BASE = 383; // f1300 baseline
// rise offset of each word vs its rest y, by frames since its start (f1246-f1272)
const RISE = [
	[0, 125],
	[0.5, 105],
	[1.5, 79],
	[2.5, 59],
	[3.5, 38],
	[4.5, 30],
	[5.5, 24],
	[6.5, 20],
	[7.5, 17],
	[8.5, 14],
	[9.5, 13],
	[10.5, 11],
	[11.5, 10],
	[12.5, 9],
	[13.5, 8],
	[14.5, 7],
	[16.5, 6],
	[17.5, 5],
	[18.5, 4],
	[21.5, 2],
	[27, 0],
];
const WORD_START = [1244.5, 1247.3, 1250.3, 1251.8, 1252.6, 1253.6];
// The tag POPS out of the caret top as a scale from its bottom-left (f1269
// shows the whole label small; width 33 -> 116 px f1268-f1276) ...
const TAG_POP = [
	[1267.4, 0],
	[1268, 0.28],
	[1269, 0.59],
	[1270, 0.74],
	[1271, 0.84],
	[1272, 0.91],
	[1273, 0.94],
	[1274, 0.97],
	[1275, 0.99],
	[1276, 1],
];
// ... and folds back by SLIDING down-left into the caret, clipped at its x
// (f1348 "laude", f1349 "laud"): e = hidden share of its width (116 -> 22 px
// f1343-f1350), dy = drop of its top (274 -> 323).
const TAG_E = [
	[1343, 0],
	[1344, 0.01],
	[1345, 0.04],
	[1346, 0.1],
	[1347, 0.2],
	[1348, 0.34],
	[1349, 0.55],
	[1350, 0.81],
	[1351, 1],
];
const TAG_DY = [
	[1342, 0],
	[1343, 1],
	[1344, 2],
	[1345, 5],
	[1346, 9],
	[1347, 16],
	[1348, 25],
	[1349, 36],
	[1350, 50],
	[1351, 60],
];
// viewer cursor tip path (f1351-f1372, ink bbox), then the exit drift (f1400-f1411, tip tracked per frame)
const PTR_X = [
	[1351, 640],
	[1352, 590],
	[1354, 514],
	[1356, 457],
	[1358, 425],
	[1360, 406],
	[1362, 395],
	[1364, 388],
	[1366, 384],
	[1368, 382],
	[1370, 381],
	[1372, 380],
];
const PTR_Y = [
	[1351, 735],
	[1352, 690],
	[1354, 616],
	[1356, 560],
	[1358, 521],
	[1360, 492],
	[1362, 470],
	[1364, 453],
	[1366, 441],
	[1368, 432],
	[1370, 427],
	[1372, 422],
];
const EXIT_X = [
	[1400, 0],
	[1402, -4],
	[1404, -15],
	[1405, -25],
	[1406, -37],
	[1407, -55],
	[1408, -82],
	[1409, -127],
	[1410, -217],
	[1411, -356],
];
const EXIT_Y = [
	[1400, 0],
	[1402, 2],
	[1404, 7],
	[1405, 12],
	[1406, 18],
	[1407, 26],
	[1408, 38],
	[1409, 55],
	[1410, 87],
	[1411, 127],
];
// reaction bubble: pop (f1370-f1376) and width per glyph count (68 / 97 / 128)
const BUB_POP = [
	[1369.4, 0],
	[1370, 0.5],
	[1372, 1.08],
	[1374, 1.03],
	[1376, 1],
];
const BUB_W = [
	[1379, 68],
	[1380, 81],
	[1382, 97],
	[1387, 97],
	[1388, 110],
	[1390, 128],
];
const CLAP_AT = [1370, 1380.5, 1388.5];

// ── the end card ──────────────────────────────────────────────────────────

// mark centre x before the lockup move (f1412-f1424), relative to frame centre
const DOT_X = [
	[1412, 26],
	[1413, 20],
	[1414, 11],
	[1417, 4],
	[1420, -1],
	[1424, -7],
];
// share of the way from centre to the lockup position (f1424-f1433)
const LOCK = [
	[1424, 0],
	[1425, 0.13],
	[1426, 0.29],
	[1427, 0.53],
	[1428, 0.76],
	[1429, 0.87],
	[1430, 0.94],
	[1431, 0.98],
	[1433, 1],
];
// ink diameter (f1414-f1440)
const MARK_D = [
	[1414, 42],
	[1416, 44],
	[1417, 62],
	[1418, 76],
	[1424, 79],
	[1425, 90],
	[1426, 104],
	[1430, 100],
	[1433, 86],
	[1436, 78],
	[1440, 76],
];
const MARK_GROW = [
	[1413.5, 0.6],
	[1414, 0.88],
	[1416, 0.9],
	[1418, 1],
];
const MARK_SPIN = [
	[1414, 0],
	[1418, 30, "o"],
	[1424, 48],
	[1427, 85],
	[1432, 112, "o"],
	[1440, 122, "o"],
	[1500, 130],
];
const WORD_SIZE = 88; // f1460 "C" cap 329 -> 391
const WORD_BASE = 391;
const GAP = 19;

export const S4_PRESETS = {
	"cypress-notes-doc": {
		note: "A docs-app meeting-notes page (tab bar, breadcrumb, serif title, date/author chips, Summary/Agenda/notes sections). The agent's tag + caret flies in large and lands before the first heading, opens a line, types `heading`, then an embedded launch-plan card grows into the gap with a coral glow while a Gantt chart streams in (title, month, day columns, owners, bars, a milestone, dependency arrows). The camera pushes in to 1.5x on the card, holds, and the page whips up under a vertical motion blur for a hard cut. All copy and the Gantt rows are fields.",
		nativeMs: 4500,
		params: {
			docTitle: ["string", DOC_DEFAULTS.docTitle, "doc title (role product)"],
			tabTitle: ["string", DOC_DEFAULTS.tabTitle, "active tab label (product)"],
			boardTab: ["string", DOC_DEFAULTS.boardTab, "second tab label (product)"],
			date: ["string", DOC_DEFAULTS.date, "date chip (product)"],
			author: ["string", DOC_DEFAULTS.author, "author chip (product)"],
			agentName: ["string", "Cypress", "agent tag label (brand)"],
			heading: ["string", "Next steps", "the section the agent types (product-voice)"],
			sections: [
				"array",
				"[{h1,body}|{h1,bullets}|{h2,bullets}]",
				"doc body below the inserted block (product)",
			],
			cardEyebrow: ["string", DOC_DEFAULTS.cardEyebrow, "card eyebrow (product)"],
			cardTitle: ["string", DOC_DEFAULTS.cardTitle, "card title, wraps to two lines (feature)"],
			cardNote: ["string", "…", "card side note (product)"],
			month: ["string", "NOVEMBER 2026", "chart month label"],
			firstDay: ["number", "10", "first column's day number (the Today column)"],
			firstWeekday: ["number", "2", "weekday of the first column, 0 = Sun"],
			rows: [
				"array",
				"[{section}|{task,owner,tone,bar:[d0,d1],kind}|{decided,label}|{milestone,label}]",
				"Gantt rows; kind transit/ship/launch picks the bar style and links",
			],
			f0: ["number", "1137", "reference frame the scene starts on"],
		},
		render: (c0, t) => {
			const c = { ...DOC_DEFAULTS, ...c0 };
			const f = refFrame(c0, t, 1137);
			const s = curve(CAM_S, f);
			const scroll = curve(SCROLL, f);
			const ax = curve(CAM_X, f) - 363 * s;
			const ay = curve(CAM_Y, f) - 170 * s - scroll;
			const v = scroll - curve(SCROLL, f - 1);
			const sigma = Math.min(22, v < 34 ? Math.max(0, v - 24) * 0.15 : 1.5 + (v - 34) * 0.5); // f1236 sharp, f1238 soft, f1240+ streaked
			const d = curve(PUSH, f);
			const h = f < 1186 ? Math.max(0, d - 117) : curve(CARD_H, f);
			const headFont = `400 22px ${SERIF}`;
			// tag + caret unit
			const typedW = textWidth(c.heading, headFont) - 0.4 * c.heading.length;
			const frac = f < 1161 ? 0 : curve(TYPE, f);
			let typed = "";
			if (frac > 0)
				for (let i = 1; i <= c.heading.length; i++) {
					if (textWidth(c.heading.slice(0, i), headFont) - 0.4 * i <= frac * typedW + 2)
						typed = c.heading.slice(0, i);
				}
			const typedPx = typed ? textWidth(typed, headFont) - 0.4 * typed.length : 0;
			const us = f < 1151 ? curve(TAG_S, f) : 1;
			const tagK = 0.86 * us;
			const caretX = f < 1161 ? curve(TAG_X, f) : 362 + typedPx;
			const tagTop = curve(TAG_Y, f);
			const tuck = curve(TUCK, f);
			const showTag = f < 1180;
			const cardA = curve(
				[
					[1163, 0],
					[1170, 1],
				],
				f,
			);
			const glow = curve(
				[
					[1164, 0],
					[1171, 1],
					[1189, 1],
					[1194, 0],
				],
				f,
			);
			return (
				<Layer z={20} style={{ background: rgbs(PAGE) }}>
					<VBlur id="s4-docblur" sigma={sigma} />
					<div
						style={{
							position: "absolute",
							inset: 0,
							filter: sigma > 0.3 ? "url(#s4-docblur)" : "none",
						}}
					>
						<div
							style={{
								position: "absolute",
								left: 0,
								top: 0,
								width: 1280,
								height: 720,
								transformOrigin: "0 0",
								transform: `translate(${ax}px, ${ay}px) scale(${s})`,
							}}
						>
							<DocChrome c={c} />
							<div
								style={{
									position: "absolute",
									left: 363,
									top: 102 - 31 * 0.95,
									font: `400 31px ${SERIF}`,
									letterSpacing: -0.8,
									color: rgbs([24, 24, 22]),
									whiteSpace: "nowrap",
									lineHeight: 1.2,
								}}
							>
								{c.docTitle}
							</div>
							<div
								style={{
									position: "absolute",
									left: 365,
									top: 119,
									height: 18,
									padding: "0 6px 0 18px",
									borderRadius: 4,
									background: rgbs([238, 240, 237]),
									font: `400 11px ${SANS}`,
									lineHeight: "18px",
									color: rgbs([70, 70, 68]),
								}}
							>
								<svg
									width="10"
									height="10"
									viewBox="0 0 10 10"
									style={{ position: "absolute", left: 4, top: 4 }}
								>
									<rect
										x="0.8"
										y="1.6"
										width="8.4"
										height="7.6"
										rx="1.3"
										fill="none"
										stroke={rgbs([90, 90, 88])}
										strokeWidth="0.9"
									/>
									<path
										d="M0.8 4h8.4M3 0.6v2M7 0.6v2"
										stroke={rgbs([90, 90, 88])}
										strokeWidth="0.9"
									/>
								</svg>
								{c.date}
							</div>
							<div
								style={{
									position: "absolute",
									left: 449,
									top: 119,
									font: `400 11px ${SANS}`,
									lineHeight: "18px",
									color: rgbs([110, 110, 106]),
								}}
							>
								•
							</div>
							<div
								style={{
									position: "absolute",
									left: 453,
									top: 119,
									height: 18,
									padding: "0 5px",
									borderRadius: 4,
									background: rgbs([238, 240, 237]),
									font: `400 11px ${SANS}`,
									lineHeight: "18px",
									color: rgbs([70, 70, 68]),
								}}
							>
								{c.author}
							</div>
							{/* inserted heading */}
							{typed ? (
								<div
									style={{
										position: "absolute",
										left: 363,
										top: 177 - 22 * 0.62,
										font: headFont,
										letterSpacing: -0.4,
										color: rgbs([24, 24, 22]),
										whiteSpace: "nowrap",
										lineHeight: 1.2,
									}}
								>
									{typed}
								</div>
							) : null}
							{/* pushed body */}
							<div style={{ position: "absolute", left: 0, top: d, width: 1280, height: 2000 }}>
								<DocFlow sections={c.sections} top={177} />
							</div>
							{/* the card */}
							{cardA > 0 ? (
								<div
									style={{
										position: "absolute",
										left: 363,
										top: 198,
										width: 540,
										height: Math.max(8, h),
										borderRadius: 8,
										background: rgbs(CARD_BG),
										border: `0.8px solid ${rgbs([236, 230, 220], 0.9)}`,
										boxSizing: "border-box",
										opacity: cardA,
										overflow: "hidden",
										boxShadow: `0 0 26px 6px rgba(208,111,87,${(0.56 * glow).toFixed(3)}), 0 0 60px 14px rgba(208,111,87,${(0.12 * glow).toFixed(3)})`,
									}}
								>
									<PlanCard c={c} f={f} h={h} />
								</div>
							) : null}
							{/* tag + caret */}
							{showTag ? (
								<>
									<div
										style={{
											position: "absolute",
											left: caretX - 1,
											top: f < 1161 ? tagTop + 19 * Math.pow(us, 0.75) : 167,
											width: 2 * Math.pow(us, 0.6),
											height: 18 * Math.pow(us, 0.75),
											background: rgbs(P.coral),
										}}
									/>
									<div
										style={{
											position: "absolute",
											left: caretX - 1,
											top: tagTop - 4,
											width: 140 * us,
											height: 60 * us,
											overflow: "hidden",
										}}
									>
										<div style={{ position: "absolute", left: -48 * tuck, top: 4 + 16 * tuck }}>
											<AgentTag name={c.agentName} k={tagK} />
										</div>
									</div>
								</>
							) : null}
						</div>
					</div>
				</Layer>
			);
		},
	},

	"cypress-swap-line": {
		note: "Hard cut to cream: a serif line rises in word by word under a vertical motion blur and settles centred. The agent's coral tag pops out of a text caret after the first word, selects it (pale teal), and the first word is REPLACED on hard cuts (`words`, at `swapAt` reference frames) while the line re-centres. The selection clears, the tag folds back into the caret, a viewer's cursor glides in with a blue reaction bubble that fills with `reaction` glyphs, and the line fades out word by word, left to right.",
		nativeMs: 6958,
		params: {
			words: ["array", '["Plan","Sketch","Sort","Work"]', "first-word swaps (brand)"],
			rest: ["string", "as fast as you talk", "the rest of the line (brand)"],
			swapAt: ["array", "[1245,1294,1313,1330]", "reference frames each word takes over"],
			agentName: ["string", "Cypress", "agent tag label (brand)"],
			reaction: ["string", "👏", "reaction glyph in the bubble (user-voice)"],
			f0: ["number", "1245", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 1245);
			const list = c.words ?? ["Plan", "Sketch", "Sort", "Work"];
			const swapAt = c.swapAt ?? [1245, 1294, 1313, 1330];
			let wi = 0;
			for (let i = 0; i < swapAt.length; i++) if (f >= swapAt[i]) wi = i;
			const first = list[Math.min(wi, list.length - 1)];
			const rest = String(c.rest ?? "as fast as you talk").split(/\s+/);
			const all = [first, ...rest];
			const sw = textWidth(" ", LINE_FONT) + LINE_LS;
			const ww = all.map((w) => textWidth(w, LINE_FONT) + LINE_LS * w.length);
			const total = ww.reduce((a, b) => a + b, 0) + sw * (all.length - 1);
			const left = 640 - total / 2;
			const xs = [];
			let x = left;
			for (let i = 0; i < all.length; i++) {
				xs.push(x);
				x += ww[i] + sw;
			}
			const top = BASE - 0.849 * LINE_SIZE;
			const starts = all.map((_, i) =>
				i < WORD_START.length
					? WORD_START[i]
					: WORD_START[WORD_START.length - 1] + (i - WORD_START.length + 1),
			);
			const caretX = xs[0] + ww[0] + 2;
			const tagE = curve(TAG_E, f);
			const tagDy = curve(TAG_DY, f);
			const tagW = textWidth(c.agentName ?? "Cypress", `600 ${12 * 2.15}px ${SANS}`) + 14 * 2.15;
			const caretOn = f >= 1268 && f < 1351;
			const selOn = f >= 1280 && f < 1345;
			const ptrOn = f >= 1351 && f < 1412;
			const px = curve(PTR_X, f) + curve(EXIT_X, f);
			const py = curve(PTR_Y, f) + curve(EXIT_Y, f);
			const bp = curve(BUB_POP, f);
			const bw = f < 1379 ? 68 : curve(BUB_W, f);
			const claps = CLAP_AT.filter((a) => f >= a).length;
			return (
				<Layer z={20} style={{ background: rgbs(P.paper) }}>
					{selOn ? (
						<div
							style={{
								position: "absolute",
								left: xs[0] - 2,
								top: 331,
								width: caretX - xs[0] + 2,
								height: 57,
								background: rgbs(P.highlight),
							}}
						/>
					) : null}
					{all.map((w, i) => {
						const dt = f - starts[i];
						if (dt < 0) return null;
						const off = curve(RISE, dt);
						const vel = curve(RISE, dt - 0.5) - curve(RISE, dt + 0.5);
						const sig = Math.max(0, vel - 2) * 0.5;
						const a = curve(
							[
								[0, 0.25],
								[1, 0.75],
								[2, 1],
							],
							dt,
						);
						const fo = curve(
							[
								[0, 1],
								[0.01, 0.85],
								[1, 0.55],
								[2, 0.35],
								[2.99, 0.3],
								[3, 0],
							],
							f - (1398 + 2 * i),
						);
						if (fo <= 0) return null;
						const id = `s4-w${i}`;
						return (
							<div key={i}>
								{sig > 0.2 ? <VBlur id={id} sigma={sig} /> : null}
								<div
									style={{
										position: "absolute",
										left: xs[i],
										top: top + off,
										font: LINE_FONT,
										letterSpacing: LINE_LS,
										lineHeight: 1,
										color: rgbs(P.ink, a * fo),
										whiteSpace: "nowrap",
										filter: sig > 0.2 ? `url(#${id})` : "none",
									}}
								>
									{w}
								</div>
							</div>
						);
					})}
					{caretOn ? (
						<div
							style={{
								position: "absolute",
								left: caretX - 1.5,
								top: 325,
								width: 3,
								height: 66,
								background: rgbs(P.coral),
							}}
						/>
					) : null}
					{f < 1300 && f >= 1267.4 ? (
						<div
							style={{
								position: "absolute",
								left: caretX - 4,
								top: 318,
								transformOrigin: "0 0",
								transform: `scale(${curve(TAG_POP, f)})`,
							}}
						>
							<div style={{ position: "absolute", left: 0, bottom: 0 }}>
								<AgentTag name={c.agentName ?? "Cypress"} k={2.15} />
							</div>
						</div>
					) : null}
					{f >= 1300 && tagE < 1 ? (
						<div
							style={{
								position: "absolute",
								left: caretX - 4,
								top: 200,
								width: 400,
								height: 191,
								overflow: "hidden",
							}}
						>
							<div style={{ position: "absolute", left: -tagW * tagE, top: 118 - 45 + tagDy }}>
								<AgentTag name={c.agentName ?? "Cypress"} k={2.15} />
							</div>
						</div>
					) : null}
					{ptrOn ? (
						<>
							{bp > 0 ? (
								<div
									style={{
										position: "absolute",
										left: px + 20,
										top: py + 38,
										width: bw,
										height: 55,
										background: rgbs(TAG.blue),
										borderRadius: "6px 27.5px 27.5px 27.5px",
										transformOrigin: "0 0",
										transform: `scale(${bp})`,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: 2,
										overflow: "hidden",
									}}
								>
									{Array.from({ length: claps }, (_, i) => {
										const g = curve(
											[
												[CLAP_AT[i], 0.3],
												[CLAP_AT[i] + 1.5, 1.12, "o"],
												[CLAP_AT[i] + 2.5, 1],
											],
											f,
										);
										return (
											<span
												key={i}
												style={{
													font: `22px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`,
													lineHeight: 1,
													transform: `scale(${g})`,
													display: "inline-block",
												}}
											>
												{c.reaction ?? "👏"}
											</span>
										);
									})}
								</div>
							) : null}
							{/* f1392 cursor ink 20 x 33 px, tip at (380,422) */}
							<div style={{ position: "absolute", left: px - 1.6, top: py - 1.6 }}>
								<Pointer size={32} />
							</div>
						</>
					) : null}
				</Layer>
			);
		},
	},

	"cypress-endcard": {
		note: "The closing lockup on cream: a coral dot blooms into the placeholder mark (spinning as its petals grow), swells and slides left while the serif wordmark types on beside it one letter per frame (each letter lands grey, then ink), so the lockup re-centres behind its own letters. Held to the end. `markSrc` swaps in your own mark.",
		nativeMs: 3709,
		params: {
			word: ["string", "Cypress", "wordmark (brand)"],
			markSrc: ["string", "-", "image slot: your mark (svg/png)"],
			f0: ["number", "1412", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 1412);
			const word = c.word ?? "Cypress";
			const font = `400 ${WORD_SIZE}px ${SERIF}`;
			const ls = -1.6;
			const wordW = textWidth(word, font) + ls * word.length;
			const finalD = 76;
			const lockLeft = 640 - (finalD + GAP + wordW) / 2;
			const finalCx = lockLeft + finalD / 2;
			const cx = f < 1424 ? 640 + curve(DOT_X, f) : lerp(633, finalCx, curve(LOCK, f));
			const cy = 359;
			const D = curve(MARK_D, f);
			const size = D / 0.86; // drawn ink spans ~0.86 of the box at this size
			const n = word.length;
			const typed = Math.max(0, Math.min(n, Math.floor(f - 1428) + 1));
			const wordLeft = finalCx + finalD / 2 + GAP;
			return (
				<Layer z={21} style={{ background: rgbs(P.paper) }}>
					{f < 1414 ? (
						<div
							style={{
								position: "absolute",
								left: cx - 10,
								top: cy - 10,
								width: 20,
								height: 20,
								borderRadius: 10,
								background: rgbs(P.coral),
							}}
						/>
					) : (
						<div style={{ position: "absolute", left: cx - size / 2, top: cy - size / 2 }}>
							<Mark
								size={size}
								spin={curve(MARK_SPIN, f)}
								grow={curve(MARK_GROW, f)}
								src={c.markSrc}
							/>
						</div>
					)}
					{typed > 0 ? (
						<div
							style={{
								position: "absolute",
								left: wordLeft,
								top: WORD_BASE - 0.849 * WORD_SIZE,
								font,
								letterSpacing: ls,
								lineHeight: 1,
								whiteSpace: "nowrap",
							}}
						>
							{word.split("").map((ch, i) => {
								if (i >= typed) return null;
								const a = f - (1428 + i) < 1 ? 0.45 : 1;
								return (
									<span key={i} style={{ color: rgbs(P.ink, a) }}>
										{ch}
									</span>
								);
							})}
						</div>
					) : null}
				</Layer>
			);
		},
	},
};
