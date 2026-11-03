/**
 * juniper-s6.jsx — section 6 presets (47.066 – 60.0s): the claim
 * "If your device can do it, / Juniper Max can build it", the bento feature
 * grid on its grey ground, and the end card (lines -> mark + url).
 *
 * Measured on the reference's full-decode frames (30fps clock, 1280x720 stage,
 * frame n = n/30 s). Every number below cites the frames it came from; the
 * per-frame traces live in sections/s6/notes.md.
 *
 * Type: Segoe UI stands in for the reference's SF-class grotesk. Sizes are set
 * by CAP HEIGHT (Segoe cap = 0.701em) and the tracking is tightened until the
 * line WIDTH matches too, because SF semibold is ~8% narrower than Segoe at
 * the same cap height.
 */
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import {
	AppTile,
	FONT,
	GradientText,
	Icon,
	JuniperMark,
	kf,
	live,
	localMs,
	PhoneFrame,
	PlatformGlyph,
	Q,
	rgbs,
	ScreenSlot,
	TabletFrame,
	WatchFrame,
} from "./juniper-shared.jsx";

// ── curves (pure) ─────────────────────────────────────────────────────────

const FRAME_MS = 1000 / 30;
const seg = (ms, at, dur) => clamp01((ms - at) / Math.max(1e-6, dur));
/** fraction REMAINING of a power settle: 1 -> 0 as p 0 -> 1. */
const remain = (p, k) => (1 - p) ** k;
/**
 * Asymmetric in-out: accelerate with power `a` up to the peak-velocity point
 * `m`, decelerate with power `b` after it; the join value is solved so the
 * velocity is continuous. Used for the end-card dot travel (peak at 46%).
 */
function asym(p, m = 0.5, a = 2, b = 2) {
	const q = clamp01(p);
	const my = b / (1 - m) / (a / m + b / (1 - m));
	return q < m ? my * (q / m) ** a : 1 - (1 - my) * ((1 - q) / (1 - m)) ** b;
}

// Segoe UI vertical metrics (hhea ascent 1.080em, descent 0.251em): the
// baseline of a line box of height `lh` sits this far below the box top.
const ASC = 1.08;
const DESC = 0.251;
const baselineInBox = (size, lh) => (lh - (ASC + DESC) * size) / 2 + ASC * size;

/** A vertical-only gaussian (motion blur along y). Returns [defs, filterCss]. */
function vblur(id, sy) {
	if (!(sy > 0.05)) return [null, "none"];
	return [
		<svg
			key={`${id}-defs`}
			width={0}
			height={0}
			style={{ position: "absolute" }}
			aria-hidden="true"
		>
			<filter id={id} x="-10%" y="-60%" width="120%" height="220%">
				<feGaussianBlur stdDeviation={`0 ${sy.toFixed(2)}`} />
			</filter>
		</svg>,
		`url(#${id})`,
	];
}

// ── inline copy ───────────────────────────────────────────────────────────

/**
 * A run of copy parts laid out inline: "text", { t, grad }, { glyph: true }
 * (the platform glyph at cap height) or { mark: true } (the brand mark).
 */
function Runs({ parts, size, colour = Q.ink, grad = null, markSize = 0.66, markColour = null }) {
	return (parts ?? []).map((p, i) => {
		const k = `r${i}`;
		if (typeof p === "string") return <span key={k}>{p}</span>;
		if (p.glyph) {
			return (
				<PlatformGlyph
					key={k}
					size={size}
					colour={colour}
					style={{ margin: `0 ${(size * 0.12).toFixed(2)}px`, verticalAlign: "-0.02em" }}
				/>
			);
		}
		if (p.mark) {
			return (
				<JuniperMark
					key={k}
					size={size * markSize}
					colour={markColour ?? colour}
					style={{ margin: `0 ${(size * 0.24).toFixed(2)}px` }}
				/>
			);
		}
		if (p.grad) {
			return (
				<GradientText key={k} from={grad?.[0] ?? Q.maxA} to={grad?.[1] ?? Q.maxB}>
					{p.t}
				</GradientText>
			);
		}
		return <span key={k}>{p.t}</span>;
	});
}

// ══════════════════════════════════════════════════════════════════════════
// 1. juniper-claim-zoom — the two-line claim inside a zooming camera
// ══════════════════════════════════════════════════════════════════════════
//
// Measured f1412–f1493 (47.07–49.77s):
//  * CAMERA: the whole block scales about the frame centre (640,360) — line 1
//    width 970 px at f1412 -> 764 at f1479 (x1.27 -> 1.00) on a fast-then-
//    creeping settle, holds f1479–f1481, then an ACCELERATING push-in
//    (x1.004/frame growing x1.3 per frame) to x1.31 at f1493; f1494 is a cut.
//    Origin solved from both lines' outer edges: y 359–360.
//  * LINES rise inside the scaled block: offset = dy·(1-p)^2.25 over 483 ms
//    (line 1 dy 140 from f1411.2, line 2 dy 135 from f1428.9; layout px) and
//    fade in (opacity = 1-(1-p)^1.6 over 300 ms, starting ~12 ms earlier) —
//    the "enter grey, darken while rising" grammar. Vertical motion blur
//    while rising (f1412 visibly smeared in y only): sy = 0.17·v.
//  * TYPE: cap height 54–55 px at scale 1 ("I" 287–340, "R" 379–433) ->
//    77.5 px Segoe semibold; width 764 -> tracking -0.0255em. Baselines 338 /
//    431 (pitch 93).
//  * PUSH BLUR: f1492–1493 soften with the zoom; blur = 30·dS/frame px.

function claimRender(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const size = cfg.size ?? 77.5;
	const pitch = cfg.pitch ?? 93;
	const lh = pitch;
	const base0 = cfg.baselineY ?? 338;
	const rise = { dy: 140, durMs: 483, pow: 2.25, blurK: 0.17, ...(cfg.rise ?? {}) };
	const fade = { durMs: 300, pow: 1.6, leadMs: 12, ...(cfg.fade ?? {}) };
	const camKeys = cfg.camera ?? [{ at: 0, scale: 1 }];
	const S = kf(camKeys, ms).scale ?? 1;
	const dS = Math.abs(
		(kf(camKeys, ms + FRAME_MS / 2).scale ?? 1) - (kf(camKeys, ms - FRAME_MS / 2).scale ?? 1),
	);
	const pushBlur = Math.max(0, (cfg.pushBlurK ?? 30) * dS - (cfg.pushBlurFloor ?? 0.6));
	const ox = cfg.originX ?? 640;
	const oy = cfg.originY ?? 360;
	const defs = [];
	const lines = (cfg.lines ?? []).map((ln, i) => {
		const dy = ln.dy ?? rise.dy;
		const p = seg(ms, ln.atMs, rise.durMs);
		const off = ms < ln.atMs ? dy : dy * remain(p, rise.pow);
		const vel =
			p > 0 && p < 1 ? ((dy * rise.pow) / (rise.durMs / FRAME_MS)) * remain(p, rise.pow - 1) : 0;
		const op =
			ms < ln.atMs - fade.leadMs
				? 0
				: 1 - remain(seg(ms, ln.atMs - fade.leadMs, fade.durMs), fade.pow);
		const [d, filter] = vblur(`${cfg.id ?? "claim"}-vb${i}`, rise.blurK * vel);
		if (d) defs.push(d);
		const top = base0 + i * pitch - baselineInBox(size, lh);
		return (
			<div
				key={`l${i}`}
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					top,
					height: lh,
					lineHeight: `${lh}px`,
					textAlign: "center",
					whiteSpace: "pre",
					font: `${cfg.weight ?? 600} ${size}px ${FONT}`,
					letterSpacing: `${cfg.tracking ?? -0.0255}em`,
					color: rgbs(cfg.colour ?? Q.ink),
					opacity: op,
					transform: `translate(${ln.dx ?? 0}px, ${off.toFixed(2)}px)`,
					filter,
				}}
			>
				<Runs parts={ln.parts} size={size} grad={cfg.grad} />
			</div>
		);
	});
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				transform: `scale(${S.toFixed(5)})`,
				transformOrigin: `${ox}px ${oy}px`,
				filter: pushBlur > 0.05 ? `blur(${pushBlur.toFixed(2)}px)` : "none",
			}}
		>
			{defs}
			{lines}
		</div>
	);
}

// ══════════════════════════════════════════════════════════════════════════
// 2. juniper-bento — the feature grid on the grey ground
// ══════════════════════════════════════════════════════════════════════════
//
// Measured at the settled hold (f1508–f1644, 50.27–54.80s):
//  * GRID rect x75.5–1204, y77.5–642 (cards [254,255,253] on [234,236,233],
//    corner radius ~19, no visible shadow). Column gutters 12 / 14 / 10.5 /
//    10, row gutters 8. Three columns: A 366 wide (device family 180.5 tall,
//    Camera word 107.5, Dynamic Island 193 | Siri 164 at 260.5), BC 378.5
//    (AR 159.5 | 3D Games 205 at 180.5, iMessage 185, Animations 182.5),
//    DE 361.5 (NFC/Screen Time over HealthKit/HomeKit 86.5+86, Widgets 252,
//    Background Tasks 115.5). Laid out as a FLEX TREE (sizes are grow weights)
//    so copy reflows inside each card: titles wrap, side titles push icons.
//  * TYPE: card titles cap 14 px -> 20 px semibold; title cap top 20.5 px
//    below the card top. Gradient words cap 28 px -> 40 px, tracking -0.06em
//    (width "Camera & Vision AI" 295), gradient [236,200,80] -> [208,116,60]
//    (sampled on the letters).
//  * ENTRY f1493–f1508: scale 0.70 -> 1 about the frame centre on a cubic
//    settle (1-S = 0.30·(1-p)^3.2 over 550 ms: 0.759 at f1494, 0.942 at f1499,
//    0.998 at f1507), opacity 0.43 / 0.63 / 0.85 / 1 at f1494–1497, soft blur
//    while fast (blur = 70·dS - 0.9 px).
//  * EXIT f1644–f1657: accelerating shrink (1-S = 0.108·p^2.8 over 467 ms:
//    0.99 at f1650, 0.912 at f1657), content stays opaque; f1658 hard cut.
//  * LIVING: the orb churns (blobs rotating at different rates), the orange
//    strands flow, the robot bobs ±1.5 px on a ~2.7 s period (f1508–f1644).

const BENTO_GRAD = [
	[236, 200, 80],
	[208, 116, 60],
];

/** Flex tree: { dir: "row"|"col", gap|gaps, size, kids:[...] } or { card, size }. */
function Tree({ node, cards, ms, card }) {
	if (node.card) {
		return (
			<div style={{ flex: `${node.size ?? 1} 1 0px`, minWidth: 0, minHeight: 0, display: "flex" }}>
				<Card spec={cards[node.card] ?? { type: "blank" }} ms={ms} look={card} />
			</div>
		);
	}
	const row = node.dir === "row";
	const kids = node.kids ?? [];
	const out = [];
	kids.forEach((k, i) => {
		if (i > 0) {
			const g = node.gaps?.[i - 1] ?? node.gap ?? 10;
			out.push(<div key={`g${i}`} style={{ flex: `0 0 ${g}px` }} />);
		}
		out.push(<Tree key={`n${i}`} node={k} cards={cards} ms={ms} card={card} />);
	});
	return (
		<div
			style={{
				flex: `${node.size ?? 1} 1 0px`,
				minWidth: 0,
				minHeight: 0,
				display: "flex",
				flexDirection: row ? "row" : "column",
			}}
		>
			{out}
		</div>
	);
}

const TITLE_SIZE = 20;

function Title({ parts, size = TITLE_SIZE, align = "center", style = null }) {
	return (
		<div
			style={{
				font: `600 ${size}px ${FONT}`,
				lineHeight: `${(size * 1.2).toFixed(1)}px`,
				letterSpacing: "-0.012em",
				color: rgbs(Q.ink),
				textAlign: align,
				whiteSpace: "pre-line",
				...(style ?? {}),
			}}
		>
			<Runs parts={parts} size={size} />
		</div>
	);
}

const asParts = (x) => (Array.isArray(x) ? x : [x ?? ""]);

function Card({ spec, ms, look }) {
	const pad = look.titleTop ?? 14.3;
	const box = {
		position: "relative",
		flex: "1 1 auto",
		minWidth: 0,
		minHeight: 0,
		borderRadius: look.radius ?? 19,
		background: rgbs(look.fill ?? Q.ground),
		overflow: "hidden",
		display: "flex",
		flexDirection: "column",
		alignItems: "stretch",
	};
	const title = spec.title ? (
		<Title parts={asParts(spec.title)} style={{ padding: `${pad}px 14px 0` }} />
	) : null;
	const art = (node, style = null) => (
		<div
			style={{
				position: "relative",
				flex: "1 1 auto",
				minHeight: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				...(style ?? {}),
			}}
		>
			{node}
		</div>
	);
	switch (spec.type) {
		case "devices":
			return (
				<div style={box}>
					{title}
					{art(<DeviceFamily spec={spec} />, { alignItems: "flex-end", paddingBottom: 23 })}
				</div>
			);
		case "icon":
			return (
				<div style={box}>
					{title}
					{art(spec.art === "robot" ? <Robot ms={ms} /> : <LayersIcon spec={spec} />, {
						alignItems: "flex-start",
						paddingTop: spec.art === "robot" ? 8 : 18,
					})}
				</div>
			);
		case "side":
			return (
				<div
					style={{
						...box,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "0 16px 0 19px",
						gap: 10,
					}}
				>
					<Title parts={asParts(spec.title)} align={spec.titleAlign ?? "left"} />
					<SideArt spec={spec} />
				</div>
			);
		case "word":
			return (
				<div style={{ ...box, alignItems: "center", justifyContent: "center", padding: "0 18px" }}>
					<BigWord text={spec.text} size={spec.size} />
				</div>
			);
		case "chat-game":
			return (
				<div
					style={{
						...box,
						flexDirection: "row",
						alignItems: "center",
						padding: "0 16px 0 14px",
						gap: 10,
					}}
				>
					<div style={{ flex: "1 1 0px", minWidth: 0, display: "flex", justifyContent: "center" }}>
						<BigWord text={spec.text} size={spec.size} diagonal />
					</div>
					<ChatGame spec={spec} />
				</div>
			);
		case "widgets":
			return (
				<div style={box}>
					{title}
					<WidgetsArt spec={spec} />
				</div>
			);
		case "phones":
			return (
				<div style={box}>
					{title}
					<PhoneFan spec={spec} />
				</div>
			);
		case "orb":
			return (
				<div style={box}>
					{title}
					{art(<Orb ms={ms} size={spec.orbSize ?? 106} />, { paddingBottom: 6 })}
				</div>
			);
		case "waves":
			return (
				<div style={box}>
					{title}
					<Waves ms={ms} spec={spec} />
				</div>
			);
		default:
			return <div style={box}>{title}</div>;
	}
}

/** Big gradient word(s): cap 28 px -> 40 px, wraps inside its card. */
function BigWord({ text, size = 40, diagonal = false }) {
	const g = BENTO_GRAD;
	return (
		<div
			style={{
				font: `600 ${size}px ${FONT}`,
				lineHeight: `${(size * 1.04).toFixed(1)}px`,
				letterSpacing: "-0.06em",
				textAlign: "center",
				backgroundImage: `linear-gradient(${diagonal ? 125 : 90}deg, ${rgbs(g[0])}, ${rgbs(g[1])})`,
				WebkitBackgroundClip: "text",
				backgroundClip: "text",
				color: "transparent",
				WebkitTextFillColor: "transparent",
				paddingBottom: size * 0.12,
			}}
		>
			{text}
		</div>
	);
}

// ── card art (all drawn; no third-party marks) ────────────────────────────

/** The device family: goggles, laptop, tablet, phone, watch (group 271x99, f1560). */
function DeviceFamily({ spec }) {
	// wallpaper-toned slot faces (the reference screens read as colourful app screens)
	const slot = (label, face) => <ScreenSlot label={label ?? ""} face={face} labelSize={7} />;
	return (
		<div style={{ position: "relative", width: 271, height: 99 }}>
			{/* laptop: screen 130x80 + base */}
			<div style={{ position: "absolute", left: 59, top: 2, width: 132, height: 82 }}>
				<div
					style={{
						position: "absolute",
						inset: 0,
						borderRadius: "7px 7px 2px 2px",
						background: "rgb(28,29,31)",
						padding: 3,
					}}
				>
					<div
						style={{
							position: "relative",
							width: "100%",
							height: "100%",
							borderRadius: 4,
							overflow: "hidden",
						}}
					>
						{slot(
							spec.slots?.laptop,
							"linear-gradient(150deg, rgb(150,160,230), rgb(236,178,150) 60%, rgb(110,120,200))",
						)}
					</div>
				</div>
			</div>
			<div
				style={{
					position: "absolute",
					left: 49,
					top: 84,
					width: 152,
					height: 6,
					borderRadius: "1px 1px 6px 6px",
					background: "linear-gradient(180deg, rgb(208,210,214), rgb(150,152,156))",
				}}
			/>
			{/* tablet */}
			<div style={{ position: "absolute", left: 141, top: 24 }}>
				<TabletFrame width={104}>
					{slot(
						spec.slots?.tablet,
						"linear-gradient(160deg, rgb(70,160,240), rgb(140,110,230) 70%, rgb(230,120,170))",
					)}
				</TabletFrame>
			</div>
			{/* phone */}
			<div style={{ position: "absolute", left: 229, top: 36 }}>
				<PhoneFrame width={30} island={false}>
					{slot(spec.slots?.phone, "linear-gradient(170deg, rgb(244,244,248), rgb(210,214,228))")}
				</PhoneFrame>
			</div>
			{/* watch */}
			<div style={{ position: "absolute", left: 252, top: 64 }}>
				<WatchFrame width={19} showBand>
					{slot("", "linear-gradient(170deg, rgb(40,44,60), rgb(14,14,20))")}
				</WatchFrame>
			</div>
			{/* goggles (headset), in front at the left */}
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 62,
					width: 74,
					height: 36,
					borderRadius: "22px 22px 18px 18px / 18px 18px 18px 18px",
					background:
						"radial-gradient(120% 90% at 30% 25%, rgb(96,98,108) 0%, rgb(22,22,26) 45%, rgb(8,8,10) 100%)",
					boxShadow: "0 3px 6px rgba(0,0,0,0.25)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 8,
					top: 66,
					width: 58,
					height: 10,
					borderRadius: 8,
					background: "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0))",
				}}
			/>
		</div>
	);
}

/** Stacked isometric layers (the AR card's tile, measured 77x84 at x495,y147). */
function LayersIcon({ spec }) {
	const layer = (dy, a, b) => (
		<div
			style={{
				position: "absolute",
				left: 8,
				top: 20 + dy,
				width: 61,
				height: 61,
				borderRadius: 14,
				background: `linear-gradient(135deg, ${a}, ${b})`,
				transform: "scaleY(0.62) rotate(45deg)",
				boxShadow: "0 2px 3px rgba(20,40,120,0.25)",
			}}
		/>
	);
	return (
		<div style={{ position: "relative", width: 77, height: 84 }}>
			{layer(16, "rgb(60,110,230)", "rgb(40,70,190)")}
			{layer(8, "rgb(110,150,245)", "rgb(80,120,230)")}
			{layer(0, "rgb(120,200,250)", "rgb(240,120,190)")}
			<div
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					top: 22,
					display: "flex",
					justifyContent: "center",
				}}
			>
				<Icon name={spec.glyph ?? "scan-eye"} size={30} colour={Q.white} stroke={2.4} />
			</div>
		</div>
	);
}

/** The game robot (80x114 at x690,y126), drawn; bobs ±1.5 px, arms sway. */
function Robot({ ms }) {
	const ph = (ms / 2700) * Math.PI * 2;
	const bob = Math.sin(ph) * 1.5;
	const sway = Math.sin(ph + 0.8) * 4;
	const white = "linear-gradient(160deg, rgb(255,255,255), rgb(214,218,226))";
	const blue = "linear-gradient(160deg, rgb(110,170,255), rgb(40,110,230))";
	const eye = "rgb(170,235,255)";
	const abs = (s) => ({ position: "absolute", ...s });
	const arm = (side) => (
		<div
			style={abs({
				top: 66,
				[side]: 2,
				width: 16,
				height: 40,
				transformOrigin: "50% 0",
				transform: `rotate(${side === "left" ? sway : -sway}deg)`,
			})}
		>
			<div style={abs({ left: 6, top: 0, width: 5, height: 22, background: "rgb(150,154,162)" })} />
			<div
				style={abs({ left: 1, top: 16, width: 15, height: 13, borderRadius: 5, background: blue })}
			/>
			<div
				style={abs({
					left: 2,
					top: 28,
					width: 13,
					height: 10,
					borderRadius: "0 0 7px 7px",
					border: "3px solid rgb(150,154,162)",
					borderTop: "none",
				})}
			/>
		</div>
	);
	return (
		<div
			style={{
				position: "relative",
				width: 80,
				height: 114,
				transform: `translateY(${bob.toFixed(2)}px)`,
			}}
		>
			<div style={abs({ left: 38, top: 6, width: 4, height: 8, background: "rgb(170,176,186)" })} />
			<div
				style={abs({ left: 34, top: 0, width: 12, height: 12, borderRadius: 6, background: blue })}
			/>
			<div
				style={abs({ left: 8, top: 26, width: 10, height: 20, borderRadius: 5, background: blue })}
			/>
			<div
				style={abs({ right: 8, top: 26, width: 10, height: 20, borderRadius: 5, background: blue })}
			/>
			<div
				style={abs({
					left: 14,
					top: 12,
					width: 52,
					height: 44,
					borderRadius: 16,
					background: white,
				})}
			/>
			<div
				style={abs({
					left: 20,
					top: 20,
					width: 40,
					height: 26,
					borderRadius: 11,
					background: "linear-gradient(180deg, rgb(28,34,52), rgb(8,10,20))",
				})}
			/>
			<div
				style={abs({ left: 27, top: 27, width: 8, height: 8, borderRadius: 4, background: eye })}
			/>
			<div
				style={abs({ left: 45, top: 27, width: 8, height: 8, borderRadius: 4, background: eye })}
			/>
			<div
				style={abs({
					left: 33,
					top: 35,
					width: 14,
					height: 6,
					borderRadius: "0 0 7px 7px",
					border: `2px solid ${eye}`,
					borderTop: "none",
				})}
			/>
			<div
				style={abs({
					left: 22,
					top: 58,
					width: 36,
					height: 34,
					borderRadius: 12,
					background: white,
				})}
			/>
			{arm("left")}
			{arm("right")}
		</div>
	);
}

/** Side-card art: NFC ring, a filled AppTile, or a soft white tile with a filled glyph. */
function SideArt({ spec }) {
	const a = spec.art ?? "tile";
	if (a === "nfc") {
		return (
			<div
				style={{
					flex: "0 0 auto",
					width: 62,
					height: 62,
					borderRadius: 31,
					border: "3px solid rgb(28,132,246)",
					boxSizing: "border-box",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<div
					style={{
						width: 25,
						height: 42,
						borderRadius: 7,
						border: "2.5px solid rgb(28,132,246)",
						background: "rgb(222,238,254)",
					}}
				/>
			</div>
		);
	}
	if (a === "soft") {
		const house = spec.glyph === "house";
		const glyph = house ? (
			<svg width={30} height={30} viewBox="0 0 24 24" aria-hidden="true">
				<path d="M12 2.6 L22 11 L19.6 11 L19.6 21 L4.4 21 L4.4 11 L2 11 Z" fill="rgb(250,170,50)" />
				<rect x="9.6" y="13.2" width="4.8" height="5" rx="1" fill="rgba(255,255,255,0.55)" />
			</svg>
		) : (
			<svg width={28} height={28} viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M12 21 C5 16 2 12.4 2 8.6 C2 5.6 4.3 3.4 7.1 3.4 C9.1 3.4 10.9 4.5 12 6.2 C13.1 4.5 14.9 3.4 16.9 3.4 C19.7 3.4 22 5.6 22 8.6 C22 12.4 19 16 12 21 Z"
					fill="rgb(255,45,96)"
				/>
			</svg>
		);
		return (
			<div
				style={{
					flex: "0 0 auto",
					width: 50,
					height: 50,
					borderRadius: 12,
					background: "linear-gradient(180deg, rgb(255,255,255), rgb(232,233,236))",
					boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
					display: "flex",
					alignItems: house ? "center" : "flex-start",
					justifyContent: house ? "center" : "flex-end",
					padding: house ? 0 : "6px 4px 0 0",
					boxSizing: "border-box",
				}}
			>
				{glyph}
			</div>
		);
	}
	return (
		<AppTile
			size={spec.tileSize ?? 52}
			bg={spec.bg ?? [104, 84, 226]}
			icon={spec.glyph ?? "hourglass"}
		/>
	);
}

/**
 * The chat game card (bubble + game board + caption), drawn. Measured: bubble
 * x712–815 y281–307, board x643–815 y315–437 (f1560).
 */
function ChatGame({ spec }) {
	const ball = (d) => (
		<div
			style={{
				width: d,
				height: d,
				borderRadius: d,
				background: "radial-gradient(circle at 35% 35%, rgb(250,160,80), rgb(214,98,34))",
				position: "relative",
				flex: "0 0 auto",
				overflow: "hidden",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: "48%",
					top: 0,
					bottom: 0,
					width: 1,
					background: "rgba(60,20,0,0.6)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					top: "48%",
					left: 0,
					right: 0,
					height: 1,
					background: "rgba(60,20,0,0.6)",
				}}
			/>
		</div>
	);
	return (
		<div
			style={{
				flex: "0 0 auto",
				width: 173,
				display: "flex",
				flexDirection: "column",
				alignItems: "flex-end",
			}}
		>
			<div
				style={{
					position: "relative",
					background: "rgb(30,136,250)",
					color: "#fff",
					font: `500 12px ${FONT}`,
					lineHeight: "26px",
					padding: "0 11px",
					borderRadius: 13,
					whiteSpace: "nowrap",
					marginBottom: 8,
				}}
			>
				{spec.bubble}
				<div
					style={{
						position: "absolute",
						right: -3,
						bottom: 0,
						width: 10,
						height: 10,
						background: "rgb(30,136,250)",
						borderBottomLeftRadius: 10,
					}}
				/>
			</div>
			<div
				style={{
					position: "relative",
					width: 173,
					borderRadius: 11,
					overflow: "hidden",
					background: "rgb(36,36,38)",
				}}
			>
				<div
					style={{
						position: "relative",
						height: 84,
						background: "linear-gradient(180deg, rgb(190,152,112), rgb(150,112,76))",
					}}
				>
					<div style={{ position: "absolute", left: 5, top: 5 }}>{ball(13)}</div>
					<div
						style={{
							position: "absolute",
							left: 64,
							top: 4,
							width: 44,
							height: 30,
							background: "#fff",
							borderRadius: 2,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<div style={{ width: 16, height: 11, border: "1.5px solid rgb(220,60,60)" }} />
					</div>
					<div
						style={{
							position: "absolute",
							left: 70,
							top: 34,
							width: 32,
							height: 6,
							borderRadius: 4,
							border: "2px solid rgb(240,150,50)",
							boxSizing: "border-box",
						}}
					/>
					<div style={{ position: "absolute", left: 78, top: 52 }}>{ball(16)}</div>
					<div
						style={{
							position: "absolute",
							left: 10,
							top: 56,
							font: `700 18px ${FONT}`,
							color: "#fff",
						}}
					>
						{spec.scoreL ?? "8"}
					</div>
					<div
						style={{
							position: "absolute",
							right: 10,
							top: 56,
							font: `700 18px ${FONT}`,
							color: "#fff",
						}}
					>
						{spec.scoreR ?? "0"}
					</div>
				</div>
				<div style={{ padding: "4px 7px 5px", display: "flex", flexDirection: "column", gap: 1 }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 4,
							font: `600 10.5px ${FONT}`,
							color: "#fff",
						}}
					>
						{ball(10)}
						<span style={{ whiteSpace: "nowrap", overflow: "hidden" }}>{spec.line1}</span>
					</div>
					<div
						style={{
							font: `400 9px ${FONT}`,
							color: "rgba(255,255,255,0.55)",
							whiteSpace: "nowrap",
							overflow: "hidden",
						}}
					>
						{spec.line2}
					</div>
				</div>
			</div>
		</div>
	);
}

/** Widgets card art: a dark widget (166x78 at x861,y385) + a phone (x1042,y313) cropped by the card. */
function WidgetsArt({ spec }) {
	const dots = [0, 1, 2, 3, 4, 5, 6].map((i) => (
		<div
			key={`d${i}`}
			style={{
				width: i % 2 ? 6 : 9,
				height: i % 2 ? 6 : 9,
				borderRadius: 5,
				background: i % 2 ? "rgb(90,84,140)" : "rgb(170,150,250)",
			}}
		/>
	));
	return (
		<div style={{ position: "relative", flex: "1 1 auto" }}>
			<div
				style={{
					position: "absolute",
					left: 19,
					top: 67,
					width: 166,
					height: 78,
					borderRadius: 14,
					background: "rgb(10,10,12)",
					padding: "10px 11px",
					boxSizing: "border-box",
					display: "flex",
					gap: 8,
				}}
			>
				<div style={{ flex: "1 1 0px", display: "flex", flexDirection: "column", gap: 5 }}>
					<div
						style={{ width: 44, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.35)" }}
					/>
					<div
						style={{ width: 70, height: 7, borderRadius: 3, background: "rgba(255,255,255,0.85)" }}
					/>
					<div style={{ flex: "1 1 auto" }} />
					<div style={{ display: "flex", alignItems: "center", gap: 3 }}>{dots}</div>
				</div>
				<div style={{ width: 62, display: "flex", flexDirection: "column", gap: 6 }}>
					<div style={{ height: 30, borderRadius: 6, background: "rgb(34,36,40)" }} />
					<div
						style={{
							alignSelf: "flex-end",
							width: 30,
							height: 7,
							borderRadius: 3,
							background: "rgba(255,255,255,0.8)",
						}}
					/>
				</div>
			</div>
			<div style={{ position: "absolute", left: 199.5, top: 8 }}>
				<PhoneFrame width={155}>
					<ScreenSlot label={spec.slot ?? "product UI"} labelSize={10} />
				</PhoneFrame>
			</div>
		</div>
	);
}

/** Three overlapping phones running off the card's bottom (x76–255, from y459). */
function PhoneFan({ spec }) {
	const face = "linear-gradient(165deg, rgb(150,50,54) 0%, rgb(96,26,32) 55%, rgb(40,70,74) 100%)";
	const rims = [
		[Q.phoneRim, Q.phoneRimHi, Q.phoneRimLo],
		[
			[176, 178, 182],
			[236, 238, 240],
			[120, 122, 126],
		],
		[
			[120, 36, 40],
			[190, 90, 90],
			[70, 20, 24],
		],
	];
	const phones = [
		{ x: -44, top: 16, z: 1, rim: rims[2] },
		{ x: 26, top: 14, z: 2, rim: rims[1] },
		{ x: 92, top: 12, z: 3, rim: rims[0] },
	];
	return (
		<div style={{ position: "relative", flex: "1 1 auto" }}>
			{phones.map((p, i) => (
				<div key={`p${i}`} style={{ position: "absolute", left: p.x, top: p.top, zIndex: p.z }}>
					<PhoneFrame width={92} rim={p.rim[0]} rimHi={p.rim[1]} rimLo={p.rim[2]}>
						<ScreenSlot face={face} label={i === 2 ? (spec.slot ?? "") : ""} labelSize={9} />
					</PhoneFrame>
				</div>
			))}
		</div>
	);
}

/**
 * The voice orb (d≈106 at x293–426 incl. glow, f1560): a dark glass sphere
 * whose coloured lobes rotate at different rates around a white core.
 */
function Orb({ ms, size = 106 }) {
	const s = ms / 1000;
	const lobes = [
		{ c: "rgb(40,230,220)", r: 0.36, w: 0.62, sp: 52, ph: 0 },
		{ c: "rgb(255,40,140)", r: 0.32, w: 0.56, sp: -71, ph: 120 },
		{ c: "rgb(90,120,255)", r: 0.34, w: 0.6, sp: 38, ph: 230 },
		{ c: "rgb(120,255,160)", r: 0.3, w: 0.5, sp: -45, ph: 300 },
	];
	return (
		<div style={{ position: "relative", width: size, height: size }}>
			<div
				style={{
					position: "absolute",
					inset: -size * 0.12,
					borderRadius: "50%",
					background: "radial-gradient(circle, rgba(60,60,90,0.18) 40%, rgba(60,60,90,0) 70%)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					inset: 0,
					borderRadius: "50%",
					overflow: "hidden",
					background: "radial-gradient(circle at 50% 50%, rgb(80,80,110) 0%, rgb(20,20,30) 80%)",
				}}
			>
				{lobes.map((l, i) => {
					const a = l.ph + l.sp * s;
					return (
						<div
							key={`o${i}`}
							style={{
								position: "absolute",
								left: "50%",
								top: "50%",
								width: size * l.w,
								height: size * l.w * 0.8,
								marginLeft: -size * l.w * 0.5,
								marginTop: -size * l.w * 0.4,
								borderRadius: "50%",
								background: l.c,
								filter: `blur(${(size * 0.07).toFixed(1)}px)`,
								transform: `rotate(${a.toFixed(2)}deg) translateX(${(size * l.r * 0.5).toFixed(2)}px)`,
								mixBlendMode: "screen",
								opacity: 1,
							}}
						/>
					);
				})}
				<div
					style={{
						position: "absolute",
						left: "50%",
						top: "50%",
						width: size * 0.58,
						height: size * 0.52,
						marginLeft: -size * 0.29,
						marginTop: -size * 0.26,
						borderRadius: "46% 54% 50% 50%",
						background: "rgba(255,255,255,0.92)",
						filter: `blur(${(size * 0.05).toFixed(1)}px)`,
						transform: `rotate(${(s * -30).toFixed(2)}deg)`,
					}}
				/>
				<div
					style={{
						position: "absolute",
						inset: 0,
						borderRadius: "50%",
						boxShadow: `inset 0 0 ${(size * 0.06).toFixed(1)}px rgba(255,255,255,0.55), inset 0 0 ${(size * 0.18).toFixed(1)}px rgba(0,0,0,0.6)`,
					}}
				/>
			</div>
		</div>
	);
}

/**
 * Flowing orange strands (x455–829, y525–627, f1560): five sines with their
 * own wavelength / amplitude / speed, each with a soft glow copy.
 */
function Waves({ ms, spec }) {
	const W = 380;
	const H = 128;
	const s = ms / 1000;
	const strands = spec.strands ?? [
		{ amp: 30, len: 300, sp: 0.5, ph: 0, y: 60, w: 2.2 },
		{ amp: 18, len: 420, sp: -0.35, ph: 1.2, y: 66, w: 2.6 },
		{ amp: 34, len: 260, sp: 0.42, ph: 2.6, y: 58, w: 1.6 },
		{ amp: 12, len: 520, sp: 0.28, ph: 4.1, y: 70, w: 2.4 },
		{ amp: 24, len: 340, sp: -0.48, ph: 5.0, y: 54, w: 1.4 },
	];
	const path = (k) => {
		const pts = [];
		for (let x = -10; x <= W + 10; x += 8) {
			const env = 0.55 + 0.45 * Math.sin((x / W) * Math.PI);
			const y =
				k.y + k.amp * env * Math.sin((x / k.len) * Math.PI * 2 + k.ph + s * k.sp * Math.PI * 2);
			pts.push(`${x.toFixed(1)},${y.toFixed(2)}`);
		}
		return `M${pts.join(" L")}`;
	};
	return (
		<div style={{ position: "relative", flex: "1 1 auto", overflow: "hidden" }}>
			<svg
				width={W}
				height={H}
				viewBox={`0 0 ${W} ${H}`}
				style={{ position: "absolute", left: "50%", marginLeft: -W / 2, top: 12 }}
				aria-hidden="true"
			>
				<defs>
					<filter id="s6-wave-glow" x="-10%" y="-60%" width="120%" height="220%">
						<feGaussianBlur stdDeviation="7" />
					</filter>
				</defs>
				<g filter="url(#s6-wave-glow)" opacity="0.85">
					{strands.map((k, i) => (
						<path
							key={`gw${i}`}
							d={path(k)}
							fill="none"
							stroke="rgb(250,170,100)"
							strokeWidth={10}
						/>
					))}
				</g>
				{strands.map((k, i) => (
					<path
						key={`w${i}`}
						d={path(k)}
						fill="none"
						stroke="rgb(238,140,60)"
						strokeOpacity={0.85}
						strokeWidth={k.w}
					/>
				))}
			</svg>
		</div>
	);
}

function bentoRender(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const en = {
		atMs: 0,
		durMs: 550,
		fromScale: 0.7,
		pow: 3.2,
		fadeMs: 125,
		fadePow: 0.6,
		blurK: 70,
		blurFloor: 0.9,
		...(cfg.enter ?? {}),
	};
	const ex = { atMs: 1e9, durMs: 467, toScale: 0.892, pow: 2.8, ...(cfg.exit ?? {}) };
	const scaleAt = (m) => {
		const a = 1 - (1 - en.fromScale) * remain(seg(m, en.atMs, en.durMs), en.pow);
		const b = 1 - (1 - ex.toScale) * seg(m, ex.atMs, ex.durMs) ** ex.pow;
		return a * b;
	};
	const S = scaleAt(ms);
	const dS = Math.abs(scaleAt(ms + FRAME_MS / 2) - scaleAt(ms - FRAME_MS / 2));
	const blur = ms < ex.atMs ? Math.max(0, en.blurK * dS - en.blurFloor) : 0;
	const op = seg(ms, en.atMs, en.fadeMs) ** en.fadePow;
	const r = cfg.rect ?? { x: 75.5, y: 77.5, w: 1128.5, h: 564.5 };
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				transform: `scale(${S.toFixed(5)})`,
				transformOrigin: `${cfg.originX ?? 640}px ${cfg.originY ?? 360}px`,
				opacity: op,
				filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: r.x,
					top: r.y,
					width: r.w,
					height: r.h,
					display: "flex",
				}}
			>
				<Tree node={cfg.layout} cards={cfg.cards ?? {}} ms={ms} card={cfg.card ?? {}} />
			</div>
		</div>
	);
}

// ══════════════════════════════════════════════════════════════════════════
// 3. juniper-endcard — "Start the next … / with [mark] Juniper Max" + url,
//    resolving to the mark over the url
// ══════════════════════════════════════════════════════════════════════════
//
// Measured f1658–f1799 (55.27–60.0s):
//  * LINES rise 131 px on (1-p)^2.7 over 1067 ms (line 1 from f1657.5, line
//    2 ten frames later) and fade in 1-(1-p)^1.8 over 600 ms. Cap 47 px ("R"
//    345–391) -> 67 px semibold, tracking -0.0415em (line 1 width 752).
//    Baselines 308.5 / 388.5; no camera move (widths constant).
//  * MARK inline in line 2: d 39.5, centre y 366.9 (21.6 above the baseline),
//    gaps 15 / 9.5 px of margin to the words (glyph runs 15 / 16 px).
//  * URL blurs in in place f1699–f1714 (opacity linear over 470 ms, blur
//    5 px -> 0); x-height 20 px -> 40 px regular, tracking -0.047em,
//    baseline 462.5.
//  * OUTRO: lines shrink about their centres 1 -> 0.94 (ease-in, f1725–1735)
//    and fade 1 -> 0 linearly f1730–f1735; the mark slides from its inline
//    spot to the frame centre while growing 39.5 -> 53 and lifting 7.6 px
//    (f1726–f1754, asymmetric in-out, peak velocity at 46%); the url lifts
//    18 px (f1725.5–f1749, peak at 40%). Hold to the end, no fade.
//    The mark's travel is laid out, not hard-coded: the words either side
//    collapse their track widths with the same curve (grid 0fr trick), so the
//    mark arrives at the centre for any copy length.

function endcardRender(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const size = cfg.size ?? 67;
	const pitch = cfg.pitch ?? 80;
	const base0 = cfg.baselineY ?? 308.5;
	const tracking = cfg.tracking ?? -0.0415;
	const rise = { dy: 131, durMs: 1067, pow: 2.7, ...(cfg.rise ?? {}) };
	const fade = { durMs: 600, pow: 1.8, ...(cfg.fade ?? {}) };
	const out = {
		atMs: 1e9,
		shrinkMs: 333,
		shrinkTo: 0.94,
		shrinkPow: 2,
		fadeAtMs: null,
		fadeMs: 167,
		dotAtMs: null,
		dotMs: 933,
		dotTo: 53,
		dotLift: 7.6,
		urlAtMs: null,
		urlMs: 783,
		urlLift: 18,
		...(cfg.outro ?? {}),
	};
	const fadeAt = out.fadeAtMs ?? out.atMs + 167;
	const dotAt = out.dotAtMs ?? out.atMs + 33;
	const urlAt = out.urlAtMs ?? out.atMs + 16;
	const shrink = 1 - (1 - out.shrinkTo) * seg(ms, out.atMs, out.shrinkMs) ** out.shrinkPow;
	const outOp = 1 - seg(ms, fadeAt, out.fadeMs);
	const q = asym(seg(ms, dotAt, out.dotMs), 0.46, 3, 3.6);
	const lineState = (atMs) => {
		const p = seg(ms, atMs, rise.durMs);
		return {
			off: ms < atMs ? rise.dy : rise.dy * remain(p, rise.pow),
			op: ms < atMs ? 0 : 1 - remain(seg(ms, atMs, fade.durMs), fade.pow),
		};
	};
	const lh = pitch;
	const markD = size * (cfg.markScale ?? 0.59);
	const markColour = cfg.markColour ?? [16, 17, 15];
	const textStyle = {
		font: `${cfg.weight ?? 600} ${size}px ${FONT}`,
		letterSpacing: `${tracking}em`,
		color: rgbs(cfg.colour ?? Q.ink),
		whiteSpace: "pre",
	};
	const lines = (cfg.lines ?? []).map((ln, i) => {
		const st = lineState(ln.atMs ?? 0);
		const top = base0 + i * pitch - baselineInBox(size, lh);
		const wrap = (children, key, collapse = 0) => (
			<span
				key={key}
				style={{
					display: "inline-grid",
					gridTemplateColumns: `${(1 - collapse).toFixed(5)}fr`,
					verticalAlign: "top",
				}}
			>
				<span style={{ minWidth: 0, display: "block" }}>
					<span
						style={{
							display: "inline-block",
							opacity: outOp,
							transform: `scale(${shrink.toFixed(5)})`,
							transformOrigin: "50% 60%",
						}}
					>
						{children}
					</span>
				</span>
			</span>
		);
		const markAt = ln.parts.findIndex((p) => p?.mark);
		let row;
		if (markAt < 0) {
			row = wrap(<Runs parts={ln.parts} size={size} grad={cfg.grad} />, "all");
		} else {
			const lead = ln.parts.slice(0, markAt);
			const rest = ln.parts.slice(markAt + 1);
			const gapL = cfg.markGapL ?? 15;
			const gapR = cfg.markGapR ?? 9.5;
			const d = lerp(markD, out.dotTo, q);
			const dotTravel = (
				<span
					key="mark"
					style={{
						display: "inline-flex",
						width: markD,
						height: lh,
						alignItems: "flex-start",
						justifyContent: "center",
						verticalAlign: "top",
						margin: `0 ${(gapR * (1 - q)).toFixed(2)}px 0 ${(gapL * (1 - q)).toFixed(2)}px`,
					}}
				>
					<span
						style={{
							position: "relative",
							top: baselineInBox(size, lh) - (cfg.markLift ?? 21.6) - markD / 2 - out.dotLift * q,
							width: markD,
							height: markD,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						{cfg.markStyle === "dot" ? (
							<span
								style={{
									width: d,
									height: d,
									borderRadius: "50%",
									background: rgbs(markColour),
									flex: "0 0 auto",
								}}
							/>
						) : (
							<JuniperMark size={d} colour={markColour} />
						)}
					</span>
				</span>
			);
			row = [
				wrap(<Runs parts={lead} size={size} grad={cfg.grad} />, "lead", q),
				dotTravel,
				wrap(<Runs parts={rest} size={size} grad={cfg.grad} />, "rest", q),
			];
		}
		return (
			<div
				key={`l${i}`}
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					top,
					height: lh,
					lineHeight: `${lh}px`,
					display: "flex",
					justifyContent: "center",
					opacity: st.op,
					transform: `translate(${ln.dx ?? 0}px, ${st.off.toFixed(2)}px)`,
					...textStyle,
				}}
			>
				{row}
			</div>
		);
	});
	let url = null;
	if (cfg.url) {
		const u = {
			atMs: 1e9,
			fadeMs: 470,
			blurPx: 5,
			blurMs: 450,
			size: 40,
			baselineY: 462.5,
			tracking: -0.047,
			...cfg.url,
		};
		const pf = seg(ms, u.atMs, u.fadeMs);
		const op = ms < u.atMs ? 0 : pf;
		const bl = u.blurPx * remain(seg(ms, u.atMs, u.blurMs), 2);
		const lift = out.urlLift * asym(seg(ms, urlAt, out.urlMs), 0.4, 2, 2.2);
		const ulh = u.size * 1.4;
		url = (
			<div
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					top: u.baselineY - baselineInBox(u.size, ulh) - lift,
					height: ulh,
					lineHeight: `${ulh}px`,
					textAlign: "center",
					whiteSpace: "pre",
					font: `400 ${u.size}px ${FONT}`,
					letterSpacing: `${u.tracking}em`,
					color: rgbs(u.colour ?? [24, 26, 23]),
					opacity: op,
					filter: bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none",
				}}
			>
				{u.text}
			</div>
		);
	}
	return (
		<div style={{ position: "absolute", inset: 0 }}>
			{lines}
			{url}
		</div>
	);
}

// ── registry ──────────────────────────────────────────────────────────────

export const S6_PRESETS = {
	"juniper-claim-zoom": {
		note: "Two-line centred claim inside a zooming camera: lines rise (dy·(1-p)^2.25, vertical motion blur) and fade in grey->ink; the block settles from x1.27 on the camera keys, holds, then pushes in accelerating with zoom blur until the scene's hard-cut end. Parts: strings, {t, grad} (tier gradient), {glyph}, {mark}. Measured f1412–f1493.",
		nativeMs: 2717,
		params: {
			lines: [
				"array",
				"[]",
				"[{ parts:[...], atMs, dy?, dx? }] — atMs is the rise start (scene ms; may be < 0 when the cut lands mid-entry); dx shifts a line off centre (the reference sets line 2 20 px left)",
			],
			camera: [
				"array",
				"[{at:0,scale:1}]",
				"kf keys {at, scale} (scene ms), linear between keys; scale about originX/Y",
			],
			size: ["number", 77.5, "font px (cap 54–55 px measured)"],
			tracking: ["number", -0.0255, "letter-spacing em (fits SF widths with Segoe)"],
			baselineY: ["number", 338, "first baseline at scale 1"],
			pitch: ["number", 93, "baseline pitch"],
			rise: [
				"object",
				"{dy:140,durMs:483,pow:2.25,blurK:0.17}",
				"per-line rise + vertical blur gain",
			],
			fade: ["object", "{durMs:300,pow:1.6,leadMs:12}", "per-line fade-in"],
			pushBlurK: ["number", 30, "zoom blur px per unit scale/frame"],
			grad: ["array", "null", "[from,to] override of the tier gradient"],
		},
		render: claimRender,
	},
	"juniper-bento": {
		note: "Feature bento grid as a flex tree of drawn cards (device family, layered AR tile, robot, side cards with tiles, gradient words, chat game, widgets + phone, phone fan, churning orb, flowing strands). Copy reflows inside each card. Enters scaling 0.70->1 (cubic settle) with fade + blur, exits with an accelerating shrink to 0.892. Measured f1493–f1657.",
		nativeMs: 5484,
		params: {
			layout: [
				"object",
				"(see scenes)",
				"flex tree: {dir,gap|gaps,size,kids} / {card,size}; sizes are grow weights (measured px)",
			],
			cards: [
				"object",
				"{}",
				"card specs by id: {type: devices|icon|side|word|chat-game|widgets|phones|orb|waves, title, ...}",
			],
			rect: ["object", "{x:75.5,y:77.5,w:1128.5,h:564.5}", "grid rect at scale 1"],
			card: ["object", "{radius:19,fill:[254,255,253],titleTop:14.3}", "card look"],
			enter: [
				"object",
				"{atMs:0,durMs:550,fromScale:0.7,pow:3.2,fadeMs:125,fadePow:0.6,blurK:70,blurFloor:0.9}",
				"entry",
			],
			exit: ["object", "{atMs,durMs:467,toScale:0.892,pow:2.8}", "exit (scene ms)"],
		},
		render: bentoRender,
	},
	"juniper-endcard": {
		note: "End card: two centred lines rise + fade in, a url blurs in below, then the lines shrink and fade while the inline mark slides to the frame centre and grows, and the url lifts under it. The mark's travel is laid out (word tracks collapse), so any copy length lands it centred. Measured f1658–f1799.",
		nativeMs: 4750,
		params: {
			lines: ["array", "[]", "[{ parts:[..., {mark:true}, ...], atMs, dx? }]"],
			url: ["object", "null", "{ text, atMs, fadeMs:470, blurPx:5, size:40, baselineY:462.5 }"],
			outro: [
				"object",
				"{atMs}",
				"{atMs (shrink start), fadeAtMs, dotAtMs, urlAtMs, dotTo:53, dotLift:7.6, urlLift:18}",
			],
			size: ["number", 67, "font px (cap 47 px)"],
			tracking: ["number", -0.0415, "letter-spacing em"],
			baselineY: ["number", 308.5, "first baseline"],
			pitch: ["number", 80, "baseline pitch"],
			markStyle: ["string", "juniper", "'juniper' (JuniperMark) or 'dot' (plain disc)"],
			markScale: ["number", 0.59, "inline mark diameter / font size (39.5 px at 67)"],
		},
		render: endcardRender,
	},
};
