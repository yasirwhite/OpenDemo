/**
 * laurel s3 — the composer (f148 -> f307, 4.90 -> 10.23s in the reference).
 *
 * Measured (stage px):
 *   - THREAD f149-f160: a pink, then red, beaded thread runs from the pill's
 *     right end (x 842) to the frame edge on the pill's centre line.
 *   - WEDGE f160-f186: the thread opens into a torn-paper wedge whose apex
 *     runs left past the frame (x 840 f162, ~560 f168, ~30 f174, off by
 *     f177) while it opens to a half-angle past 90 deg. Its inside is the
 *     lilac ground [195,180,230]; its arms are torn bands: red, yellow and
 *     pink above, red and pink below. Off-white outside.
 *   - LILAC GROUND: ruled lines every ~98 px (ending x ~1035), loose
 *     pencil lines fanning from the bottom right, a charcoal brush stroke
 *     from the top-left corner, a column of tiny vertical type at the right
 *     edge.
 *   - HEADING + CARD: fade in f159-f168 at scale .76 about (640, 300); a
 *     glyph flies out of the ribbon (40,324 at f159) to the heading
 *     (f168); f182-f190 the group pops to scale 1: heading baseline 148,
 *     left 388, ~74 px serif; card 122-1161 x 247-484, r ~34; text 30 px
 *     sans from x 168, baselines 312/356; chrome row centred y 419.
 *   - TYPING f182-f220 (~2.4 units/frame) with the tinted tail; held to
 *     f280; deleted back to front f277-f293 (~5 units/frame) while the
 *     chrome (f283-f289) and the heading (f284-f292) fade.
 *   - EXIT f291-f306: the lilac fades to off-white (f291-f299) and the card
 *     slides 60 px left and fades, handing its text line to laurel-line.
 */
import React from "react";
import { curve, L, Layer, mix, refFrame, rgbs, SANS, SERIF, Typed } from "./laurel-shared.jsx";

// [frame, apexX, interior half-angle deg, band unit deg]
const WEDGE = [
	[148, [842, 0.08, 0.12]],
	[150, [842, 0.15, 0.25]],
	[156, [842, 0.3, 0.35]],
	[160, [842, 0.6, 0.6]],
	[164, [840, 2.5, 3]],
	[167, [740, 6, 6], "i"],
	[170, [560, 10, 8]],
	[173, [300, 16, 10]],
	[176, [30, 28, 12]],
	[179, [-60, 45, 14]],
	[182, [-160, 60, 14]],
	[185, [-330, 74, 14]],
	[188, [-700, 88, 14]],
];
const THREAD_LEN = [
	[148, 0],
	[150, 1, "o"],
];
const GROUP_S = [
	[159, 0.76],
	[180, 0.78],
	[182, 0.8],
	[186, 0.95, "o"],
	[190, 0.99],
	[194, 1],
];
const HEAD_A = [
	[159, 0.15],
	[162, 0.7],
	[165, 1],
	[282, 1],
	[291, 0],
];
const CARD_A = [
	[159, 0],
	[162, 0.35],
	[166, 0.85],
	[168, 1],
	[304, 1],
	[309, 0],
];
// The card collapses leftwards at the end: [left, right] edges (f298-f309).
const CARD_X = [
	[293, [122, 1161]],
	[298, [64, 1104], "o"],
	[301, [0, 990]],
	[304, [-20, 838]],
	[307, [-30, 528]],
	[309, [-30, 300]],
];
const CHROME_A = [
	[170, 0],
	[174, 1],
	[283, 1],
	[289, 0],
];
const GLYPH_OFF = [
	[159, [-351, 161, -160]],
	[162, [-181, 17, -70], "o"],
	[165, [-27, -3, -10], "o"],
	[168, [0, 0, 0], "o"],
];
const LILAC_A = [
	[292, 1],
	[300, 0, "io"],
];
// ...while its right edge pulls in from the frame edge (f292-f296).
const LILAC_WIPE = [
	[292, 0],
	[296, 250, "o"],
];

const R = 40000;
const rad = (d) => (d * Math.PI) / 180;
const ray = (ax, ay, deg) => [ax + R * Math.cos(rad(deg)), ay - R * Math.sin(rad(deg))];
const fan = (ax, ay, a0, a1) => {
	const p0 = ray(ax, ay, a0);
	const p1 = ray(ax, ay, a1);
	return `${ax},${ay} ${p0[0].toFixed(1)},${p0[1].toFixed(1)} ${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
};

/** The lilac ground's line art (f230). */
function LilacArt() {
	const ruled = [];
	for (let k = 0; k < 8; k++) {
		ruled.push(
			<line
				key={`r${k}`}
				x1={0}
				x2={1034}
				y1={10 + k * 98}
				y2={10 + k * 98}
				stroke={rgbs([170, 154, 210])}
				strokeWidth={1.4}
			/>,
		);
	}
	const pencil = [];
	const fanFrom = [
		[1280, 150, 760, 720],
		[1280, 260, 640, 720],
		[1260, 720, 880, 150],
		[1280, 520, 700, 720],
		[1120, 720, 1280, 330],
		[880, 230, 1280, 470],
		[960, 720, 1280, 610],
	];
	fanFrom.forEach(([x1, y1, x2, y2], k) => {
		pencil.push(
			<line
				key={`p${x1}${y1}`}
				x1={x1}
				y1={y1}
				x2={x2}
				y2={y2}
				stroke={rgbs([112, 100, 146], 0.55 + 0.1 * (k % 3))}
				strokeWidth={1.3}
			/>,
		);
	});
	return (
		<>
			<svg width={1280} height={720} style={{ position: "absolute", left: 0, top: 0 }}>
				<defs>
					<filter id="lc-char" x="-20%" y="-20%" width="140%" height="140%">
						<feTurbulence type="fractalNoise" baseFrequency="0.035 0.6" numOctaves="3" seed="4" />
						<feDisplacementMap in="SourceGraphic" scale="18" />
					</filter>
				</defs>
				{ruled}
				{pencil}
				<path
					d="M-40 96 C 60 130, 170 180, 300 238"
					stroke={rgbs([38, 36, 44])}
					strokeWidth={62}
					strokeLinecap="round"
					fill="none"
					filter="url(#lc-char)"
				/>
			</svg>
			<div
				style={{
					position: "absolute",
					left: 1252,
					top: 120,
					width: 600,
					transformOrigin: "0 0",
					transform: "rotate(90deg)",
					font: `400 13px ${SERIF}`,
					lineHeight: "16px",
					color: rgbs([92, 80, 116]),
					whiteSpace: "nowrap",
				}}
			>
				keep talking, it keeps up. every word lands where your cursor is.
				<br />
				no need to slow down for it. it hears you the first time.
			</div>
		</>
	);
}

/** The torn-paper wedge that opens the lilac ground (f160-f186). */
function Wedge({ f, ay }) {
	const [ax, th, b] = curve(WEDGE, f);
	const len = curve(THREAD_LEN, f);
	const right = ax + (1280 - ax) * len + 40;
	const thread = f < 162;
	return (
		<svg
			width={1280}
			height={720}
			style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
		>
			<defs>
				<clipPath id="lc-reach">
					<rect x={-2000} y={-2000} width={right + 2000} height={4720} />
				</clipPath>
				<filter id="lc-torn" x="-5%" y="-5%" width="110%" height="110%">
					<feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="11" />
					<feDisplacementMap in="SourceGraphic" scale={thread ? 3 : 16} />
				</filter>
				<filter id="lc-fibre" x="0" y="0" width="100%" height="100%">
					<feTurbulence type="fractalNoise" baseFrequency="0.012 0.09" numOctaves="4" seed="3" />
					<feColorMatrix
						type="matrix"
						values="0 0 0 0 0.55  0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 1.6 -0.45"
					/>
					<feComposite in2="SourceGraphic" operator="in" />
				</filter>
			</defs>
			<g clipPath="url(#lc-reach)" filter="url(#lc-torn)">
				<polygon points={fan(ax, ay, th + 2.2 * b, th + 3.6 * b)} fill={rgbs([234, 168, 222])} />
				<polygon points={fan(ax, ay, th + 1.3 * b, th + 2.2 * b)} fill={rgbs([218, 198, 104])} />
				<polygon points={fan(ax, ay, th, th + 1.3 * b)} fill={rgbs([186, 64, 44])} />
				<polygon points={fan(ax, ay, th, th + 1.3 * b)} fill="#fff" filter="url(#lc-fibre)" />
				<polygon points={fan(ax, ay, -th - 1.5 * b, -th)} fill={rgbs([186, 64, 44])} />
				<polygon points={fan(ax, ay, -th - 1.5 * b, -th)} fill="#fff" filter="url(#lc-fibre)" />
				<polygon points={fan(ax, ay, -th - 3.1 * b, -th - 1.5 * b)} fill={rgbs([234, 168, 222])} />
				<polygon
					points={fan(ax, ay, th + 3.45 * b, th + 3.75 * b)}
					fill={rgbs([40, 38, 44])}
					opacity={f > 168 ? 1 : 0}
				/>
			</g>
		</svg>
	);
}

/** Small UI glyph standing in for the chat app's own mark: a coral sun. */
function Sun({ size }) {
	const rays = [];
	for (let k = 0; k < 8; k++) {
		const a = (k * Math.PI) / 4;
		rays.push(
			<line
				key={k}
				x1={50 + Math.cos(a) * 26}
				y1={50 + Math.sin(a) * 26}
				x2={50 + Math.cos(a) * 44}
				y2={50 + Math.sin(a) * 44}
				stroke={rgbs(L.coral)}
				strokeWidth={8}
				strokeLinecap="round"
			/>,
		);
	}
	return (
		<svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
			<circle cx={50} cy={50} r={15} fill={rgbs(L.coral)} />
			{rays}
		</svg>
	);
}

export const S3_PRESETS = {
	"laurel-composer": {
		note: "The dictation beat: a thread runs out of the pill and tears open into a paper wedge that sweeps a lilac, line-drawn ground across the frame; a chat composer (greeting heading + card) fades in, pops to full size, and the spoken sentence TYPES into it with a tinted tail, holds, deletes itself, and the card hands its text line to laurel-line as the lilac fades. Times are the reference's frames via `f0` (scene-relative). Keep it BELOW laurel-pill.",
		nativeMs: 5334,
		params: {
			greeting: ["string", "Good morning", "composer heading (role ui-copy)"],
			placeholder: ["string", "Ask anything", "empty-composer hint"],
			text: [
				"string",
				"Hold [fn] and just talk, and Laurel writes down every word you say as clean text",
				"the dictated sentence; [fn] is an inline key chip (role user-voice)",
			],
			chipsLeft: ["array", '["Chat","Notes"]', "chips under the text, left"],
			chipsRight: ["array", '["Fast","Auto"]', "selectors under the text, right"],
			typeFrames: ["number", "38", "frames the sentence takes to type"],
			f0: ["number", "148", "reference frame the scene starts on"],
		},
		render: (c, t) => {
			const f = refFrame(c, t, 148);
			const text = c.text ?? "";
			const n = Math.max(1, text.replace(/\[[^\]]+\]/g, "#").length);
			const fpc = (c.typeFrames ?? 38) / n;
			const s = curve(GROUP_S, f);
			const lilac = curve(LILAC_A, f);
			const wedgeOn = f < 189;
			const [gdx, gdy, grot] = curve(GLYPH_OFF, f);
			const chrome = curve(CHROME_A, f);
			const cardA = curve(CARD_A, f);
			const cardX = curve(CARD_X, f);
			const wipe = curve(LILAC_WIPE, f);
			const headA = curve(HEAD_A, f);
			const typing = f >= 182;
			const chipsL = c.chipsLeft ?? ["Chat", "Notes"];
			const chipsR = c.chipsRight ?? ["Fast", "Auto"];
			return (
				<Layer z={10}>
					{f >= 160 ? (
						<div
							style={{
								position: "absolute",
								inset: 0,
								background: rgbs(L.lavender),
								opacity: lilac,
								clipPath:
									wipe > 0.5
										? `inset(0 ${wipe.toFixed(1)}px 0 0)`
										: wedgeOn
											? (() => {
													const [ax, th] = curve(WEDGE, f);
													const a = ray(ax, 360, th);
													const b = ray(ax, 360, -th);
													// Four points, not three: a triangle's far edge would cut the
													// frame once the wedge opens towards 180 deg.
													return `polygon(${ax}px 360px, ${a[0].toFixed(1)}px ${a[1].toFixed(1)}px, ${(a[0] + R).toFixed(1)}px ${a[1].toFixed(1)}px, ${(b[0] + R).toFixed(1)}px ${b[1].toFixed(1)}px, ${b[0].toFixed(1)}px ${b[1].toFixed(1)}px)`;
												})()
											: undefined,
							}}
						>
							<div style={{ position: "absolute", inset: 0, opacity: lilac * lilac }}>
								<LilacArt />
							</div>
						</div>
					) : null}
					{f >= 148 && wedgeOn ? <Wedge f={f} ay={360} /> : null}
					<div
						style={{
							position: "absolute",
							inset: 0,
							transformOrigin: "640px 300px",
							transform: `scale(${s.toFixed(4)})`,
						}}
					>
						{f >= 159 ? (
							<div style={{ opacity: headA }}>
								<div
									style={{
										position: "absolute",
										left: 262 + gdx,
										top: 70 + gdy,
										transform: `rotate(${grot.toFixed(1)}deg)`,
									}}
								>
									<Sun size={100} />
								</div>
								<div
									style={{
										position: "absolute",
										left: 388,
										top: 148 - 74 * 0.92,
										font: `400 74px ${SERIF}`,
										lineHeight: 1,
										color: rgbs([52, 50, 56]),
										whiteSpace: "nowrap",
									}}
								>
									{c.greeting ?? "Good morning"}
								</div>
							</div>
						) : null}
						{cardA > 0.001 ? (
							<div
								style={{
									position: "absolute",
									left: cardX[0],
									top: 247,
									width: cardX[1] - cardX[0],
									height: 237,
									borderRadius: 34,
									background: rgbs(mix(L.card, [255, 255, 255], 0.3), 0.97),
									boxShadow: `0 10px 30px ${rgbs([60, 40, 100], 0.1)}`,
									opacity: cardA,
								}}
							>
								{!typing ? (
									<div
										style={{
											position: "absolute",
											left: 46,
											top: 40,
											font: `400 22px ${SANS}`,
											color: rgbs([168, 166, 172]),
										}}
									>
										{c.placeholder ?? "Ask anything"}
									</div>
								) : null}
								{typing && f < 294 ? (
									<div
										style={{
											position: "absolute",
											left: 46,
											top: 312 - 247 - 30 * 1.05,
											width: 950,
											font: `400 30px ${SANS}`,
											lineHeight: "44px",
											letterSpacing: -0.2,
										}}
									>
										<Typed
											text={text}
											f={f}
											at={182}
											fpc={fpc}
											del={{ at: 277, fpc: 16 / n }}
											tail={4}
											ink={[30, 30, 32]}
											chipStyle={{ fontSize: 28 }}
										/>
									</div>
								) : null}
								<div
									style={{
										position: "absolute",
										left: 46,
										top: 150,
										right: 46,
										height: 44,
										display: "flex",
										alignItems: "center",
										font: `400 24px ${SANS}`,
										opacity: chrome,
									}}
								>
									<span style={{ color: rgbs([186, 186, 190]), fontSize: 32, marginRight: 18 }}>
										+
									</span>
									{chipsL.map((ch, i) => (
										<span
											key={ch}
											style={{
												padding: "4px 14px",
												marginRight: 8,
												borderRadius: 8,
												border: i === 0 ? `1.5px solid ${rgbs([222, 220, 226])}` : "none",
												color: rgbs(i === 0 ? [74, 72, 78] : [124, 122, 128]),
											}}
										>
											{ch}
										</span>
									))}
									<span style={{ flex: 1 }} />
									{chipsR.map((ch, i) => (
										<span
											key={ch}
											style={{
												marginLeft: 16,
												color: rgbs(i === 0 ? [118, 116, 122] : [172, 170, 176]),
											}}
										>
											{ch}
										</span>
									))}
									<span style={{ marginLeft: 22, color: rgbs([190, 188, 194]), fontSize: 18 }}>
										⌄
									</span>
								</div>
							</div>
						) : null}
					</div>
				</Layer>
			);
		},
	},
};
