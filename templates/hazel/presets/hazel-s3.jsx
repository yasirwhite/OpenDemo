/**
 * hazel s3 — vector construction: code over a drawing, letterforms drawn point
 * by point, the mark's outline, and the four-frame strip (15.68 -> 23.24s).
 *
 * Measured (reference px at 1280x720, 25fps):
 *   CODE      f392-441. White ground; the line art fills x 134-1146 and strokes
 *             on across the first 24 frames. Dark panel x 324-956, y 184-536
 *             ([58,60,54], radius 8) on top. Colour blooms out of a point at
 *             the top of the picture from f416, whole picture by f436. Code
 *             types one line, then pours in and scrolls.
 *   LETTERS   f442-497. Faint dot grid. One word in a light serif italic,
 *             stroked on letter by letter at a very large size (stems run the
 *             frame height) while the camera pulls back to the whole word by
 *             f476. The bottom bar rises at f476; a caption enters top right
 *             at f494.
 *   OUTLINE   f498-537. The hero mark's outline strokes on from the head with
 *             anchors at the on-curve points, the frame pulling back slowly.
 *   STRIP     f538-580. A chat bubble top right, then four frames of a motion
 *             cycle, each stroking on pale then filling royal blue, one at a
 *             time (f538, f548, f558, f566).
 */
import React from "react";
import {
	clamp01,
	DotGrid,
	H,
	kf,
	localF,
	MONO,
	prog,
	rgbs,
	SERIF,
	Stage,
	UI,
} from "./hazel-shared.jsx";
import { BIRD_POSES, birdPath, SceneColour, SceneLine } from "./hazel-shared-art.jsx";

// ── code panel text ───────────────────────────────────────────────────────

const STYLE_LINES = [
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1012 720">',
	"  <style>",
	"    .ln-12 {",
	"      fill:none;",
	"      stroke:#6AACAF;",
	"      stroke-width:0.15;",
	"      stroke-linecap:round;",
	"      stroke-linejoin:round;",
	"    }",
	"    .ln-30 {",
	"      fill:none;",
	"      stroke:#867D93;",
	"      stroke-width:0.5;",
	"    }",
	"  </style>",
];

/** A stream of path-data lines. Deterministic, seeded by line index. */
function pathLine(i) {
	const r = (n) => ((i * 7919 + n * 104729) % 9973) / 9973;
	const nums = [];
	for (let k = 0; k < 13; k++) nums.push(`${Math.floor(r(k) * 900)}.${Math.floor(r(k + 40) * 90)}`);
	return `  <path class="ln-12" d="M${nums[0]} ${nums[1]}C${nums.slice(2, 8).join(" ")}S${nums.slice(8, 12).join(" ")}Z"/>`;
}

function CodePanel({ f }) {
	const typed = Math.floor(clamp01(f / 14) * STYLE_LINES[0].length);
	const lines = [];
	lines.push(STYLE_LINES[0].slice(0, typed));
	const pour = Math.floor(Math.max(0, f - 12) * 0.9);
	for (let i = 1; i < STYLE_LINES.length && i <= pour; i++) lines.push(STYLE_LINES[i]);
	for (let i = 0; i < Math.max(0, pour - STYLE_LINES.length + 1) * 2; i++) lines.push(pathLine(i));
	const lineH = 15;
	const visible = 21;
	const start = Math.max(0, lines.length - visible);
	return (
		<div
			style={{
				position: "absolute",
				left: 324,
				top: 184,
				width: 632,
				height: 352,
				borderRadius: 8,
				background: rgbs(H.code),
				overflow: "hidden",
				boxShadow: "0 8px 30px rgba(20,30,40,0.25)",
			}}
		>
			<div style={{ position: "absolute", left: 24, top: 16 }}>
				{lines.slice(start).map((l, i) => (
					<div
						key={`${start + i}`}
						style={{
							height: lineH,
							font: `400 12px/${lineH}px ${MONO}`,
							color: rgbs(H.codeText),
							whiteSpace: "pre",
						}}
					>
						{l}
					</div>
				))}
			</div>
		</div>
	);
}

// ── letterforms ───────────────────────────────────────────────────────────

/**
 * Advances and on-curve anchors for the demo word, read off the installed
 * italic serif at authoring time (numbers only; no outlines are embedded).
 */
const GLYPHS = [
	{
		ch: "f",
		adv: 0.3286,
		pts: [
			[0.242, 0.433],
			[-0.093, -0.217],
			[-0.05, -0.177],
			[0.15, 0.433],
			[0.065, 0.477],
			[0.167, 0.51],
			[0.411, 0.756],
			[0.368, 0.716],
			[0.251, 0.477],
			[0.363, 0.433],
		],
	},
	{
		ch: "l",
		adv: 0.2852,
		pts: [
			[0.293, 0.749],
			[0.157, 0.161],
			[0.197, 0.045],
			[0.255, 0.053],
			[0.127, -0.01],
			[0.056, 0.114],
			[0.174, 0.628],
			[0.158, 0.706],
			[0.1, 0.715],
			[0.288, 0.756],
		],
	},
	{
		ch: "a",
		adv: 0.5728,
		pts: [
			[0.34, 0.064],
			[0.276, 0.017],
			[0.034, 0.176],
			[0.314, 0.493],
			[0.52, 0.485],
			[0.451, 0.163],
			[0.536, 0.025],
			[0.41, 0.373],
			[0.322, 0.458],
			[0.135, 0.175],
			[0.223, 0.041],
		],
	},
	{
		ch: "i",
		adv: 0.2974,
		pts: [
			[0.269, 0.053],
			[0.144, -0.01],
			[0.074, 0.114],
			[0.137, 0.392],
			[0.036, 0.428],
			[0.159, 0.493],
			[0.228, 0.368],
			[0.216, 0.045],
			[0.304, 0.677],
			[0.18, 0.673],
		],
	},
	{
		ch: "r",
		adv: 0.4614,
		pts: [
			[0.466, 0.413],
			[0.401, 0.329],
			[0.349, 0.371],
			[0.371, 0.442],
			[0.225, 0.35],
			[0.146, 0],
			[0.055, 0],
			[0.138, 0.386],
			[0.092, 0.432],
			[0.164, 0.487],
			[0.239, 0.402],
			[0.39, 0.493],
		],
	},
];

function LetterDraw({ f, em = 660, baseY = 540, x0 = 20 }) {
	let pen = x0;
	const lineCol = rgbs([150, 176, 214]);
	const n = GLYPHS.length;
	return (
		<svg width="1280" height="720" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
			{GLYPHS.map((g, i) => {
				const x = pen;
				pen += g.adv * em;
				// Letters start 6 frames apart and each takes ~14 frames.
				const a = i * 6;
				const p = prog(f, a, 14, "inout");
				const nodeP = clamp01((f - a) / 16);
				const dash = 3200;
				return (
					<g key={g.ch}>
						<text
							x={x}
							y={baseY}
							fill="none"
							stroke={lineCol}
							strokeWidth={1.3}
							strokeDasharray={`${dash} ${dash}`}
							strokeDashoffset={(1 - p) * dash}
							style={{ font: `italic 400 ${em}px ${SERIF}` }}
						>
							{g.ch}
						</text>
						{g.pts.map(([px, py], j) =>
							nodeP * g.pts.length > j ? (
								<circle
									key={`${j}-${px}`}
									cx={x + px * em}
									cy={baseY - py * em}
									r={2.8}
									fill={rgbs([120, 156, 214])}
								/>
							) : null,
						)}
						{i === n ? null : null}
					</g>
				);
			})}
		</svg>
	);
}

// ── the outline and the strip ─────────────────────────────────────────────

function BirdOutline({ f, x, y, w }) {
	const k = w / 240;
	const d = birdPath(66, 28);
	const p = prog(f, 0, 16, "inout");
	const nodes = [
		[234, 74],
		[188, 58],
		[158, 70],
		[66, 28],
		[108, 88],
		[56, 110],
		[12, 136],
		[160, 108],
		[8, 80],
	];
	return (
		<g transform={`translate(${x} ${y}) scale(${k})`}>
			<path
				d={d}
				fill="none"
				stroke={rgbs([150, 176, 214])}
				strokeWidth={1.5 / k}
				pathLength="1"
				strokeDasharray="1 1"
				strokeDashoffset={1 - p}
			/>
			{nodes.map(([nx, ny], i) =>
				p * nodes.length > i ? (
					<circle key={`${nx}-${ny}`} cx={nx} cy={ny} r={3 / k} fill={rgbs([120, 156, 214])} />
				) : null,
			)}
		</g>
	);
}

function BottomBar({ f, at, label = "Create Artwork", done = "Done" }) {
	const rise = prog(f, at, 6);
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				right: 0,
				bottom: -46 + rise * 46,
				height: 46,
				background: rgbs([250, 250, 250]),
				borderTop: "1px solid rgb(236,236,236)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "0 22px",
				font: `400 20px ${UI}`,
				color: rgbs([96, 98, 106]),
			}}
		>
			<span>{label}</span>
			<span style={{ color: rgbs(H.green) }}>{done}</span>
		</div>
	);
}

export const S3_PRESETS = {
	"hazel-code-reveal": {
		note: "A line-art illustration strokes on behind a dark code panel, code pours in, then the illustration blooms into colour from a point near the top. The colour is a radial mask with a soft edge.",
		nativeMs: 2000,
		params: {
			colourAt: ["number", "24", "colour bloom start (frames)"],
			colourFrames: ["number", "20", "frames to full colour"],
			src: ["string", "-", "image to reveal instead of the drawn scene"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const at = c.colourAt ?? 24;
			const q = prog(f, at, c.colourFrames ?? 20, "in", 1.4);
			const r = q * 960;
			const soft = 90;
			return (
				<Stage z={2} bg={[255, 255, 255]}>
					<div style={{ position: "absolute", left: 134, top: 0, width: 1012, height: 720 }}>
						<svg width="1012" height="720" style={{ position: "absolute", inset: 0 }}>
							<SceneLine p={prog(f, 1, 26, "out", 1.6)} />
						</svg>
						{q > 0 && (
							<div
								style={{
									position: "absolute",
									inset: 0,
									WebkitMaskImage: `radial-gradient(circle at 506px 64px, #000 ${Math.max(0, r - soft)}px, rgba(0,0,0,0) ${r}px)`,
									maskImage: `radial-gradient(circle at 506px 64px, #000 ${Math.max(0, r - soft)}px, rgba(0,0,0,0) ${r}px)`,
								}}
							>
								{c.src ? (
									<img
										alt=""
										src={c.src}
										style={{ width: 1012, height: 720, objectFit: "cover" }}
									/>
								) : (
									<svg width="1012" height="720">
										<SceneColour />
									</svg>
								)}
							</div>
						)}
					</div>
					<CodePanel f={f} />
				</Stage>
			);
		},
	},

	"hazel-letter-draw": {
		note: "One serif italic word stroked on letter by letter at a huge size, with anchor points, while `camKeys` [{at, s, x}] pull the view back to the whole word. The bottom bar and a caption arrive as the word lands. The word itself is fixed by the anchors table; change it with the table.",
		nativeMs: 2240,
		params: {
			camKeys: ["array", "measured", "[{at, s, x}] view scale and x (frames)"],
			caption: ["string", "-", "one-line caption top right"],
			captionAt: ["number", "52", "caption entry (frames)"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const cam = kf(
				c.camKeys ?? [
					{ at: 0, s: 2.7, x: 150 },
					{ at: 30, s: 2.2, x: -760 },
					{ at: 34, s: 1, x: 0, ease: "out", pow: 2 },
				],
				f,
			);
			return (
				<Stage z={2} bg={[254, 254, 254]}>
					<DotGrid />
					<div
						style={{
							position: "absolute",
							inset: 0,
							transform: `translate(${cam.x.toFixed(2)}px, 0) scale(${cam.s.toFixed(4)})`,
							transformOrigin: "20px 540px",
						}}
					>
						<LetterDraw f={f} />
					</div>
					{f >= (c.captionAt ?? 52) && (
						<div
							style={{
								position: "absolute",
								right: 40,
								top: 8,
								width: 320,
								font: `400 22px ${UI}`,
								lineHeight: "30px",
								color: rgbs([58, 60, 66]),
								background: "rgb(248,248,248)",
								borderRadius: 14,
								padding: "6px 14px",
							}}
						>
							{c.caption}
						</div>
					)}
					<BottomBar f={f} at={34} />
				</Stage>
			);
		},
	},

	"hazel-outline-draw": {
		note: "The hero mark's outline strokes on from the head across a dot grid, with anchors on its points, while the frame slowly pulls back (`camKeys`). A preset for one continuous pen-tool stroke.",
		nativeMs: 1600,
		params: {
			camKeys: ["array", "[{at:0,s:1.8},{at:40,s:1}]", "pull-back keys"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const cam = kf(
				c.camKeys ?? [
					{ at: 0, s: 1.45 },
					{ at: 38, s: 1, ease: "out", pow: 2 },
				],
				f,
			);
			return (
				<Stage z={2} bg={[254, 254, 254]}>
					<DotGrid />
					<div
						style={{
							position: "absolute",
							inset: 0,
							transform: `scale(${cam.s.toFixed(4)})`,
							transformOrigin: "640px 360px",
						}}
					>
						<svg width="1280" height="720" style={{ overflow: "visible" }}>
							<BirdOutline f={f} x={160} y={-30} w={960} />
						</svg>
					</div>
				</Stage>
			);
		},
	},

	"hazel-frame-strip": {
		note: "The output of an animation prompt: a chat bubble top right, then four poses of the mark, each arriving as a pale outline and filling royal blue a few frames later, one at a time. `frames` sets the arrival frames.",
		nativeMs: 1720,
		params: {
			prompt: ["string", "-", "the user's request (role user-voice)"],
			frames: ["array", "[0,10,20,28]", "arrival frame of each pose"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const poses = ["up", "level", "mid", "half"];
			const arrivals = c.frames ?? [0, 10, 20, 28];
			return (
				<Stage z={2} bg={[246, 246, 246]}>
					<div
						style={{
							position: "absolute",
							right: 20,
							top: -16,
							width: 460,
							font: `400 25px ${UI}`,
							lineHeight: "33px",
							color: rgbs([58, 60, 66]),
							background: "rgb(238,238,238)",
							borderRadius: 14,
							padding: "6px 14px",
						}}
					>
						{c.prompt}
					</div>
					<div
						style={{
							position: "absolute",
							left: 50,
							top: 128,
							width: 1000,
							height: 500,
							background: "#fff",
						}}
					/>
					<svg width="1280" height="720" style={{ position: "absolute", inset: 0 }}>
						{poses.map((pose, i) => {
							const at = arrivals[i];
							if (f < at) return null;
							const fillQ = prog(f, at + 4, 3, "linear");
							const x = 110 + i * 240;
							return (
								<g key={pose} transform={`translate(${x} 300) scale(0.9)`}>
									<path
										d={birdPath(BIRD_POSES[pose][0], BIRD_POSES[pose][1])}
										fill={fillQ > 0 ? rgbs(H.royal, fillQ) : "none"}
										stroke={rgbs([104, 150, 236], 1 - fillQ)}
										strokeWidth={3}
										strokeLinejoin="round"
									/>
								</g>
							);
						})}
					</svg>
					<BottomBar f={99} at={0} />
				</Stage>
			);
		},
	},
};
