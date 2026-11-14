/**
 * hazel s1 — the sky pill, the "is live" panel wipe and the three split
 * screens (0 -> 7.52s).
 *
 * Measured (reference px at 1280x720, 25fps):
 *   SKY PILL  f0-5 and again f330-391. Label pill x 470-810, y 310-410
 *             (f3, radius 8, white at ~20%); the second time it scales 1.00 ->
 *             1.14 linearly under a thick blue S-curve whose left run sits at
 *             y 620 and right run at y 360 (f360).
 *   LIVE LINE f6-66. White ground. A pale panel (y 120-566) slides left along
 *             the line, x 830 at f7 -> 480 at f64, decelerating. The line's
 *             dark copy is CLIPPED to the panel, so the panel edge reveals it
 *             right to left. Tiles arrive on f7, f10 and f16.
 *   SPLITS    three halves, x = 640 on a hard edge: icons + app window f67-107,
 *             halftone + dock tile f108-144, technical drawing + sheet
 *             f145-187. Left pane strokes draw on through each hold; the right
 *             pane holds still.
 */
import React from "react";
import {
	Abs,
	Anchor,
	H,
	kf,
	localF,
	MONO,
	prog,
	rgbs,
	Sky,
	Stage,
	UI,
	WipeText,
} from "./hazel-shared.jsx";
import {
	Bird,
	CAMERA_PATHS,
	DrawSet,
	HalftoneBird,
	Icon,
	NutGlyph,
	TileBox,
	WindowIcon,
} from "./hazel-shared-art.jsx";

/** The corner bug on the split screens: glyph plus a bracketed mono name. */
export function CornerChip({ name = "Filbert 2.0", colour = [150, 150, 152] }) {
	return (
		<Abs x={76} y={680} w={260} h={20}>
			<svg width="18" height="18" style={{ position: "absolute", left: 0, top: 0 }}>
				<NutGlyph size={16} fill={[96, 96, 100]} />
			</svg>
			<div
				style={{
					position: "absolute",
					left: 36,
					top: 1,
					font: `400 12px ${MONO}`,
					color: rgbs(colour),
					whiteSpace: "pre",
				}}
			>
				{`[${name}]`}
			</div>
		</Abs>
	);
}

// ── sky pill ──────────────────────────────────────────────────────────────

function BracketCurve() {
	return (
		<svg width="1280" height="720" style={{ position: "absolute", inset: 0 }}>
			<path
				d="M26 50 V400 C 26 560 90 630 230 666 C 400 672 700 670 894 668 C 1040 650 1120 440 1230 404 C 1250 400 1266 400 1280 400"
				fill="none"
				stroke="rgba(255,255,255,0.42)"
				strokeWidth="1.6"
			/>
			<Anchor x={102} y={606} r={9} />
			<Anchor x={894} y={668} r={9} />
			<Anchor x={1230} y={405} r={9} />
		</svg>
	);
}

function SCurve({ p, width = 3 }) {
	const d = "M-10 620 H560 C 860 620 880 362 1124 360 H1290";
	return (
		<svg width="1280" height="720" style={{ position: "absolute", inset: 0 }}>
			<path
				d={d}
				fill="none"
				stroke={rgbs([58, 150, 236])}
				strokeWidth={width}
				pathLength="1"
				strokeDasharray="1 1"
				strokeDashoffset={1 - p}
			/>
			{p > 0.5 && (
				<g opacity={Math.min(1, (p - 0.5) * 4)}>
					<line
						x1="580"
						y1="620"
						x2="800"
						y2="620"
						stroke="rgba(255,255,255,0.7)"
						strokeWidth="1"
					/>
					<line
						x1="980"
						y1="360"
						x2="1124"
						y2="360"
						stroke="rgba(255,255,255,0.7)"
						strokeWidth="1"
					/>
					<rect x="796" y="616" width="7" height="7" fill="#fff" />
					<rect x="976" y="356" width="7" height="7" fill="#fff" />
					<circle cx="1124" cy="360" r="3.6" fill="rgb(58,150,236)" stroke="#fff" strokeWidth="1" />
					<circle cx="586" cy="620" r="3.6" fill="rgb(58,150,236)" stroke="#fff" strokeWidth="1" />
					<circle cx="64" cy="620" r="3.2" fill="rgb(58,150,236)" />
				</g>
			)}
		</svg>
	);
}

// ── presets ───────────────────────────────────────────────────────────────

export const S1_PRESETS = {
	"hazel-sky-pill": {
		note: "The sky gradient with a frosted label pill (film's only colour field). `curve` 'bracket' for the opening's thin handle path, 'scurve' for the thick blue easing curve that draws on at the mid-film beat. `keys` [{at (frames), a, s}] animate the pill's opacity and scale.",
		nativeMs: 2480,
		params: {
			label: ["string", "Filbert 2.0", "pill text (role brand)"],
			curve: ["string", "bracket", "bracket | scurve"],
			keys: ["array", "[{at:0,a:1,s:1}]", "pill opacity / scale"],
			drawFrames: ["number", "36", "curve draw-on length (frames)"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const k = kf(c.keys ?? [{ at: 0, a: 1, s: 1 }], f);
			const skyA = c.fadeIn ? prog(f, 0, c.fadeIn, "inout") : 1;
			return (
				<Stage z={c.z ?? 2}>
					<Sky f={f + (c.skyOffset ?? 0)} opacity={skyA} />
					{c.curve === "scurve" ? (
						<SCurve p={prog(f, 0, c.drawFrames ?? 36, "inout")} />
					) : (
						<BracketCurve />
					)}
					<div
						style={{
							position: "absolute",
							left: 470,
							top: 310,
							width: 340,
							height: 100,
							borderRadius: 8,
							background: "rgba(255,255,255,0.22)",
							boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "rgba(255,255,255,0.94)",
							font: `500 54px ${UI}`,
							opacity: k.a ?? 1,
							transform: `scale(${(k.s ?? 1).toFixed(4)})`,
						}}
					>
						{c.label ?? "Filbert 2.0"}
					</div>
				</Stage>
			);
		},
	},

	"hazel-live-line": {
		note: "White ground; a pale grid panel slides left along one centred line, and the line's dark copy is clipped to the panel so the panel edge reveals it. `tiles` [{at, x, y, w, h, art|src}] pop on and stay. Every position is reference px.",
		nativeMs: 2440,
		params: {
			text: ["string", "Filbert 2.0 is live", "the line (role brand)"],
			tiles: ["array", "-", "[{at,x,y,w,h,art,src}]"],
			panelKeys: ["array", "measured", "[{at,x}] panel left edge (frames)"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const panelX = kf(
				c.panelKeys ?? [
					{ at: 0, x: 830 },
					{ at: 7, x: 770, ease: "linear" },
					{ at: 16, x: 685 },
					{ at: 28, x: 600 },
					{ at: 40, x: 540 },
					{ at: 61, x: 486 },
				],
				f,
			).x;
			const text = c.text ?? "Filbert 2.0 is live";
			const size = 46;
			const lineW = text.length * size * 0.452;
			const x = 640 - lineW / 2;
			const gridX = panelX + 40;
			return (
				<Stage z={2} bg={H.white}>
					<div
						style={{
							position: "absolute",
							left: gridX,
							top: 0,
							right: 0,
							bottom: 0,
							backgroundImage: `linear-gradient(${rgbs(H.gridLine)} 1px, rgba(0,0,0,0) 1px), linear-gradient(90deg, ${rgbs(H.gridLine)} 1px, rgba(0,0,0,0) 1px)`,
							backgroundSize: "62px 62px",
						}}
					/>
					<div
						style={{
							position: "absolute",
							left: panelX,
							top: 120,
							right: 0,
							height: 446,
							background: rgbs(H.panel, 0.72),
						}}
					/>
					<WipeText
						x={x}
						y={330}
						text={text}
						size={size}
						pale={[208, 224, 242]}
						dark={[38, 42, 52]}
						wipeX={panelX}
					/>
					{(c.tiles ?? []).map((tile) =>
						f >= tile.at ? (
							<TileBox
								key={`${tile.x}-${tile.y}`}
								{...tile}
								scale={1 + 0.2 * (1 - prog(f, tile.at, 3))}
							/>
						) : null,
					)}
					<svg width="1280" height="720" style={{ position: "absolute", inset: 0 }}>
						<HalftoneBird x={100} y={132} w={146} pitch={6} r={2.6} fill={[80, 100, 190]} />
					</svg>
					<Abs
						x={40}
						y={640}
						w={72}
						h={50}
						style={{ background: rgbs([226, 224, 245]), borderRadius: 2 }}
					>
						<div
							style={{ font: `400 12px ${MONO}`, color: rgbs([136, 130, 176]), padding: "6px 8px" }}
						>
							[2.0]
						</div>
					</Abs>
				</Stage>
			);
		},
	},

	"hazel-split": {
		note: "A split screen on a hard x=640 edge. Left is a pale pane whose art strokes on through the hold: `left` 'icons' | 'halftone' | 'camera'. Right holds still: `right` 'window' (a travel app window on blue, with `rows`), 'dock' (a dock with the app tile), 'sheet' (an instruction sheet; `src` swaps in a photo).",
		nativeMs: 1640,
		params: {
			left: ["string", "icons", "icons | halftone | camera"],
			right: ["string", "window", "window | dock | sheet"],
			rows: ["array", "-", "[{icon,label}] rows of the app window"],
			name: ["string", "Filbert 2.0", "corner chip name"],
			src: ["string", "-", "image for the right pane instead of the drawing"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const dur = (c.durationMs ?? 1640) / 40;
			const p = prog(f, 1, dur * 0.82, "out", 2);
			const left = c.left ?? "icons";
			const right = c.right ?? "window";
			return (
				<Stage z={2} bg={H.paper}>
					<svg width="640" height="720" style={{ position: "absolute", left: 0, top: 0 }}>
						{left === "icons" && (
							<g>
								<Icon name="compass" x={-22} y={-34} size={166} p={p} width={1.8} />
								<Icon name="tent" x={268} y={-26} size={174} p={p} width={1.8} />
								<Icon name="pin" x={566} y={-20} size={140} p={p} width={1.8} />
								<Icon name="bike" x={-16} y={236} size={186} p={p} width={1.8} />
								<Icon name="tram" x={330} y={246} size={136} p={p * 0.96} width={1.8} />
								<Icon name="flask" x={562} y={240} size={132} p={p * 0.9} width={1.8} />
								<Icon name="lantern" x={328} y={440} size={142} p={p * 0.86} width={1.8} />
							</g>
						)}
						{left === "halftone" && (
							<HalftoneBird
								x={52}
								y={-8}
								w={576}
								build={p}
								pitch={7.4}
								r={3.3}
								stroke={[96, 184, 214]}
							/>
						)}
						{left === "camera" && (
							<g transform="translate(20 0)">
								<DrawSet paths={CAMERA_PATHS} p={p} width={1.9} stagger={0.65} />
							</g>
						)}
					</svg>
					<div
						style={{
							position: "absolute",
							left: 640,
							top: 0,
							width: 640,
							height: 720,
							overflow: "hidden",
						}}
					>
						{right === "window" && <AppWindow rows={c.rows} f={f} />}
						{right === "dock" && <Dock />}
						{right === "sheet" && <Sheet src={c.src} f={f} />}
					</div>
					<CornerChip name={c.name} />
				</Stage>
			);
		},
	},
};

function AppWindow({ rows, f }) {
	const list = rows ?? [
		{ icon: "pin", label: "Trail Maps" },
		{ icon: "tent", label: "Campsites" },
		{ icon: "compass", label: "Routes" },
	];
	return (
		<div style={{ position: "absolute", inset: 0, background: rgbs(H.blueLeft) }}>
			<div
				style={{
					position: "absolute",
					left: 170 - f * 0.03,
					top: 46,
					width: 600,
					height: 720,
					background: rgbs([252, 252, 250]),
					borderRadius: 26,
					boxShadow: "0 6px 24px rgba(40,60,120,0.2)",
				}}
			>
				{["#ec4f66", "#f5c04a", "#3ec566"].map((col, i) => (
					<div
						key={col}
						style={{
							position: "absolute",
							left: 30 + i * 37,
							top: 26,
							width: 24,
							height: 24,
							borderRadius: 12,
							background: col,
						}}
					/>
				))}
				<div
					style={{
						position: "absolute",
						left: 28,
						top: 140,
						font: `400 26px ${UI}`,
						color: rgbs([180, 180, 180]),
					}}
				>
					Outdoors
				</div>
				{list.map((r, i) => (
					<div
						key={r.label}
						style={{
							position: "absolute",
							left: 52,
							top: 178 + i * 100,
							height: 84,
							display: "flex",
							alignItems: "center",
						}}
					>
						<svg width="66" height="66" style={{ marginRight: 24 }}>
							<WindowIcon name={r.icon} x={2} y={2} size={62} />
						</svg>
						<span style={{ font: `400 58px ${UI}`, color: rgbs([38, 40, 46]), whiteSpace: "pre" }}>
							{r.label}
						</span>
					</div>
				))}
				<div
					style={{
						position: "absolute",
						left: 52,
						top: 572,
						display: "flex",
						alignItems: "center",
					}}
				>
					<svg width="66" height="66" style={{ marginRight: 24 }}>
						<WindowIcon name="flask" x={2} y={2} size={62} />
					</svg>
					<span style={{ font: `400 58px ${UI}`, color: rgbs([38, 40, 46]) }}>Settings</span>
				</div>
			</div>
		</div>
	);
}

function Dock() {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: `linear-gradient(180deg, rgb(58,85,116) 0 104px, ${rgbs(H.navy)} 104px)`,
			}}
		>
			<div
				style={{
					position: "absolute",
					left: -30,
					top: 104,
					width: 700,
					height: 520,
					background: rgbs(H.dock),
					boxShadow: "inset 0 2px 0 rgba(255,255,255,0.18), inset 0 -3px 0 rgba(255,255,255,0.1)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: -180,
					top: 200,
					width: 240,
					height: 320,
					borderRadius: 44,
					background: "#fff",
				}}
			>
				<div
					style={{ height: 76, background: rgbs([226, 72, 62]), borderRadius: "44px 44px 0 0" }}
				/>
			</div>
			<div
				style={{
					position: "absolute",
					left: 590,
					top: 200,
					width: 240,
					height: 320,
					borderRadius: 44,
					background: "#fff",
				}}
			>
				<div
					style={{ height: 76, background: rgbs([245, 200, 74]), borderRadius: "44px 44px 0 0" }}
				/>
				{[0, 1, 2, 3, 4].map((i) => (
					<div
						key={i}
						style={{ height: 2, margin: "28px 16px 0", background: "rgba(0,0,0,0.12)" }}
					/>
				))}
			</div>
			<div
				style={{
					position: "absolute",
					left: 172,
					top: 202,
					width: 320,
					height: 320,
					borderRadius: 66,
					background: `linear-gradient(160deg, rgb(26,88,214), ${rgbs(H.tile)})`,
					boxShadow: "0 12px 34px rgba(0,0,0,0.35)",
				}}
			>
				<svg width="320" height="320">
					<HalftoneBird x={18} y={26} w={288} pitch={3.6} r={1.5} fill={[250, 250, 255]} />
				</svg>
			</div>
		</div>
	);
}

function Sheet({ src, f }) {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: `linear-gradient(95deg, rgb(226,216,196), rgb(226,172,104))`,
			}}
		>
			{src ? (
				<img
					alt=""
					src={src}
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						objectFit: "cover",
					}}
				/>
			) : (
				<div
					style={{
						position: "absolute",
						left: 26,
						top: -4 + Math.sin(f * 0.08) * 1.2,
						width: 556,
						height: 790,
						background: rgbs([244, 244, 246]),
						transform: `rotate(${(0.5 + Math.sin(f * 0.06) * 0.25).toFixed(3)}deg)`,
						boxShadow: "0 6px 26px rgba(70,50,30,0.35)",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: 36,
							top: 44,
							font: `600 25px ${UI}`,
							color: rgbs([40, 42, 48]),
						}}
					>
						<span style={{ color: rgbs([170, 170, 170]), font: `400 18px ${UI}`, marginRight: 8 }}>
							4/16
						</span>
						Loading the film
					</div>
					<svg width="556" height="680" style={{ position: "absolute", left: 0, top: 84 }}>
						<g transform="translate(12 16) scale(0.86)">
							<DrawSet paths={CAMERA_PATHS} p={1} stroke={[40, 42, 48]} width={2.1} stagger={0} />
						</g>
					</svg>
					<div
						style={{
							position: "absolute",
							left: 36,
							top: 668,
							right: 30,
							font: `400 12px ${UI}`,
							color: rgbs([96, 96, 100]),
							columnCount: 3,
							columnGap: 18,
							lineHeight: "16px",
						}}
					>
						Open the back and seat the cartridge on the spool post. Thread the leader across the
						sprocket. Close the back and wind on twice before shooting.
					</div>
				</div>
			)}
		</div>
	);
}

export { Bird };
