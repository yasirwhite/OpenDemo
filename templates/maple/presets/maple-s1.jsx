/**
 * maple-s1.jsx — section s1 (film f0-f120, 0-4033 ms): from a pencil sketch
 * to a clean vector. Three beats, one preset each, measured on the 30 fps
 * clock off ref/f720 (frame n = n/30 s; numbers are STAGE px, 1280x720):
 *
 *   maple-sketch-canvas  f0-f60  white. A full-bleed photo of the mark
 *                        sketched in pencil on a dot-grid notebook pulls back
 *                        into a light canvas-app window (toolbar chips, "50%"
 *                        pill, "</>" chip, dot grid). The window + photo frame
 *                        are ONE group scaled 1.405 -> 1 about the photo
 *                        centre; the photo content zooms on the same curve but
 *                        less (1 -> 0.759, so it ends 1.067x "cover"-cropped).
 *                        A blue vector trace runs round the hexagon f4-f38 and
 *                        the knockout f20-f47; the mark's own SVG source
 *                        drifts left as translucent monospace code (f22-f60),
 *                        tokens landing on a focus plane, then most of them
 *                        handing over to a blurred near plane (x1.42, faster
 *                        drift) while a few stay sharp.
 *   maple-comet-outline  f61-f90  black. Dim outline; two white comets on the
 *                        hexagon and two on the knockout glide and decelerate,
 *                        the mark pushes in 0.87 -> 1 (f62-f70), the comets
 *                        relax into soft highlights.
 *   maple-iso-outline    f91-f120 white. The mark as a black 2 px outline over
 *                        an isometric dashed construction grid. Dead still.
 *
 * Every render is a pure function of t. Curves are written on the FILM frame
 * clock (f = frame0 + localMs * 30 / 1000) so the comments read against the
 * reference frames; retime a beat by moving its scene, not its curves.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import { FONT, ImageSlot, live, localMs, MARK, MapleMark, MONO, Q, rgbs } from "./maple-shared.jsx";

const frameOf = (cfg, t, f0) => (cfg.frame0 ?? f0) + (localMs(cfg, t) * 30) / 1000;
const ABS = { position: "absolute", left: 0, top: 0 };

/** Piecewise-linear lookup in a [[frame, value], ...] table (clamped). */
function tab(table, f) {
	if (f <= table[0][0]) return table[0][1];
	for (let i = 1; i < table.length; i++) {
		if (f <= table[i][0]) {
			const [fa, va] = table[i - 1];
			const [fb, vb] = table[i];
			return lerp(va, vb, (f - fa) / (fb - fa));
		}
	}
	return table[table.length - 1][1];
}

const pts2d = (P, close = true) =>
	`M${P.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}${close ? "Z" : ""}`;

/** Mark vertices in px for a mark of width w centred at (cx, cy). */
function markPts(w, cx, cy) {
	const k = w / MARK.w;
	const ox = cx - (MARK.w * k) / 2;
	const oy = cy - (MARK.h * k) / 2;
	const sc = ([x, y]) => [ox + x * k, oy + y * k];
	return { hex: MARK.hex.map(sc), arrow: MARK.arrow.map(sc), k };
}

// ── beat 1: the sketch photo, the canvas window, the trace, the code ────────

// Pull-back (photo frame width 1280 -> 911 = remaining r, measured every
// frame f2-f32): r = 0.78 * 0.82^(f-3), a pure exponential that starts at
// f1.75 (f0 = f1 exactly). Content scale c = 0.759 + 0.241 r follows the same
// r (residual <= 0.01). The group centre drops 360 -> 376.25 on its own,
// quicker exponential: ry = 0.8^(f-1).
const pullR = (f) => (f < 1.75 ? 1 : 0.78 * 0.82 ** (f - 3));
const pullRy = (f) => (f < 1 ? 1 : 0.8 ** (f - 1));

// Settled layout (f30-f60): photo x184.5-1095.5, y120-632.5 (911 x 512.5,
// centre 640,376.25); window outer x44.5-1234.5, y32.5-680.5; inner canvas
// panel x58.5-1221.5, y47-668 ([242,244,241], 13.25 px dot grid).
const PHOTO = { x: 184.5, y: 120, w: 911, h: 512.5 };
const PC = [PHOTO.x + PHOTO.w / 2, PHOTO.y + PHOTO.h / 2];
const WIN = { x: 44.5, y: 32.5, w: 1190, h: 648 };
const PANEL = { x: 58.5, y: 47, w: 1163, h: 621 };

// The sketch, in photo-content coordinates (= f0 stage px): the trace's
// hexagon settles at x546.5-733.5 (187 px centre-line) round the photo centre,
// i.e. 246.4 px at content scale 1.
const SK = { cx: 640, cy: 360.3, w: 246.4 };

// Blue trace draw-on, fraction of the outline traced (pixel cover of the
// blue mask mapped onto the perimeter, every frame f4-f38). One head, from the
// upper-right vertex clockwise (down the right side first); slow f4-f16,
// fastest f20-f22 (~0.095/frame), easing out by f38.
const TRACE_OUTER = [
	[3.5, 0],
	[4, 0.005],
	[5, 0.013],
	[6, 0.022],
	[7, 0.03],
	[8, 0.037],
	[9, 0.045],
	[10, 0.06],
	[11, 0.07],
	[12, 0.087],
	[13, 0.102],
	[14, 0.125],
	[15, 0.15],
	[16, 0.182],
	[17, 0.223],
	[18, 0.27],
	[19, 0.335],
	[20, 0.415],
	[21, 0.507],
	[22, 0.603],
	[23, 0.682],
	[24, 0.745],
	[25, 0.795],
	[26, 0.83],
	[27, 0.86],
	[28, 0.89],
	[29, 0.91],
	[30, 0.93],
	[31, 0.945],
	[32, 0.955],
	[33, 0.964],
	[34, 0.975],
	[35, 0.983],
	[36, 0.989],
	[37, 0.995],
	[38, 1],
];
// Knockout trace (inner blue pixel count / final): a stub at the inner left
// corner f21-f26, then the rest f27-f47.
const TRACE_INNER = [
	[20.3, 0],
	[21, 0.012],
	[23, 0.02],
	[25, 0.033],
	[26, 0.047],
	[27, 0.059],
	[28, 0.074],
	[29, 0.092],
	[30, 0.111],
	[31, 0.143],
	[32, 0.178],
	[33, 0.21],
	[34, 0.255],
	[35, 0.315],
	[36, 0.388],
	[37, 0.471],
	[38, 0.593],
	[39, 0.68],
	[40, 0.749],
	[41, 0.807],
	[42, 0.86],
	[43, 0.89],
	[44, 0.92],
	[45, 0.959],
	[46, 0.99],
	[47, 1],
];

// Page tone across the notebook (column medians of f0, rows 30-200 and
// 560-700), as [x, grey] stops: left page 199 -> 138 into the gutter, right
// page 145 -> 189 -> 165 (+6 lift: the medians sit above the bright lower half), page-edge band ~110 at x968-977, desk ~56.
const LEFT_PAGE = [
	[0, 205],
	[60, 201],
	[120, 194],
	[160, 186],
	[200, 173],
	[240, 161],
	[280, 147],
	[320, 144],
];
const RIGHT_PAGE = [
	[326, 151],
	[350, 176],
	[374, 183],
	[398, 194],
	[446, 194],
	[494, 188],
	[542, 179],
	[590, 172],
	[640, 171],
	[760, 173],
	[806, 174],
	[880, 171],
	[930, 167],
	[960, 168],
];
const grey = (v, a = 1) => rgbs([v - 2, v, v - 3], a);

function pageGradient(id, stops, x0, x1) {
	return (
		<linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x0} y1={0} x2={x1} y2={0}>
			{stops.map(([x, v]) => (
				<stop key={x} offset={(x - x0) / (x1 - x0)} stopColor={grey(v)} />
			))}
		</linearGradient>
	);
}

/** A pencil line: the stroke plus a fainter second pass, slightly overshot. */
function pencilEdge(a, b, key, w) {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const l = Math.hypot(dx, dy);
	const ux = dx / l;
	const uy = dy / l;
	const o = 3;
	const A = [a[0] - ux * o, a[1] - uy * o];
	const B = [b[0] + ux * o, b[1] + uy * o];
	const n = [-uy * 1.1, ux * 1.1];
	return (
		<g key={key}>
			<path d={`M${A[0]} ${A[1]}L${B[0]} ${B[1]}`} stroke={grey(112, 0.9)} strokeWidth={w} />
			<path
				d={`M${A[0] + n[0]} ${A[1] + n[1]}L${B[0] + n[0] * 0.4} ${B[1] + n[1] * 0.4}`}
				stroke={grey(118, 0.5)}
				strokeWidth={w * 0.8}
			/>
		</g>
	);
}

/**
 * The "photo": a pencil sketch of the mark on a dot-grid notebook with a dark
 * desk at the right and a pen lower right (f0). Drawn in f0 stage px.
 */
function SketchPhoto({ uid, sketch }) {
	const { hex, arrow } = markPts(sketch.w, sketch.cx, sketch.cy);
	const area = `${pts2d(hex)} ${pts2d(arrow)}`;
	// the hatching: soft pencil strokes at ~62 deg, heavier on the right
	const hatch = [];
	for (let i = -50; i < 86; i++) {
		const x = 470 + i * 3.5;
		hatch.push(
			<path
				key={i}
				d={`M${x} 540L${x + 190} 180`}
				stroke={grey(
					112,
					(0.26 + 0.16 * Math.sin(i * 1.7) ** 2) *
						(0.5 + 0.6 * clamp01((x + 95 - sketch.cx + sketch.w / 2) / sketch.w)),
				)}
				strokeWidth={1.3}
			/>,
		);
	}
	return (
		<svg width={1280} height={720} viewBox="0 0 1280 720" style={{ ...ABS, display: "block" }}>
			<defs>
				{pageGradient(`${uid}lp`, LEFT_PAGE, 0, 330)}
				{pageGradient(`${uid}rp`, RIGHT_PAGE, 326, 968)}
				<linearGradient id={`${uid}v`} x1={0} y1={0} x2={0} y2={1}>
					<stop offset={0} stopColor="rgba(0,0,0,0.05)" />
					<stop offset={0.35} stopColor="rgba(0,0,0,0)" />
					<stop offset={1} stopColor="rgba(255,255,255,0.12)" />
				</linearGradient>
				<linearGradient id={`${uid}g`} x1={0} y1={0} x2={1} y2={0}>
					<stop offset={0} stopColor="rgba(0,0,0,0)" />
					<stop offset={0.75} stopColor="rgba(0,0,0,0.07)" />
					<stop offset={1} stopColor="rgba(0,0,0,0.16)" />
				</linearGradient>
				<pattern
					id={`${uid}d`}
					patternUnits="userSpaceOnUse"
					width={26}
					height={26.7}
					x={7}
					y={2.5}
				>
					<circle cx={13} cy={13.35} r={1.25} fill={grey(132, 0.6)} />
				</pattern>
				<filter id={`${uid}w`} x={0} y={0} width="100%" height="100%">
					<feTurbulence type="fractalNoise" baseFrequency="0.0035 0.06" numOctaves="3" seed="7" />
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<clipPath id={`${uid}k`}>
					<path d={area} clipRule="evenodd" />
				</clipPath>
			</defs>
			{/* desk: dark wood, grain = seeded turbulence stretched along x */}
			<rect x={0} y={0} width={1280} height={720} fill={grey(56)} />
			<rect x={940} y={0} width={340} height={720} filter={`url(#${uid}w)`} opacity={0.13} />
			{/* page-edge band and the pages */}
			<path d="M958 0H980L997 720H974Z" fill={grey(112)} />
			<path d="M0 0H322L338 720H0Z" fill={`url(#${uid}lp)`} />
			<path d="M322 0H968L984 720H338Z" fill={`url(#${uid}rp)`} />
			<path d="M262 0H322L338 720H276Z" fill={`url(#${uid}g)`} />
			<path d="M322 0L338 720" stroke={grey(132)} strokeWidth={2} />
			<path d="M0 0H968L984 720H0Z" fill={`url(#${uid}d)`} />
			<path d="M0 0H968L984 720H0Z" fill={`url(#${uid}v)`} />
			{/* the sketch: pencil hatching between the hexagon and the knockout */}
			<g clipPath={`url(#${uid}k)`}>{hatch}</g>
			<g fill="none" strokeLinecap="round">
				{hex.map((p, i) => pencilEdge(p, hex[(i + 1) % hex.length], `h${i}`, 3))}
				{arrow.map((p, i) => pencilEdge(p, arrow[(i + 1) % arrow.length], `a${i}`, 2.8))}
			</g>
			{/* the pen, lower right on the desk */}
			<g strokeLinecap="round">
				<path d="M1310 330L1212 506" stroke="rgb(12,13,12)" strokeWidth={27} />
				<path d="M1300 338L1214 492" stroke="rgb(60,62,60)" strokeWidth={4} opacity={0.7} />
				<path d="M1212 506L1186 548" stroke="rgb(128,130,127)" strokeWidth={17} />
				<path d="M1208 504L1190 534" stroke="rgb(186,188,185)" strokeWidth={3} />
				<path d="M1186 548L1163 582" stroke="rgb(96,98,95)" strokeWidth={6} />
			</g>
		</svg>
	);
}

/** Small toolbar glyphs (frame tool, image, code), drawn. */
function ToolGlyph({ kind }) {
	const ink = "rgb(58,59,58)";
	if (kind === "frame")
		return (
			<svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
				<rect x={1} y={4} width={9} height={9} fill={ink} />
				<path
					d="M1 1.2H12.8V13"
					stroke={ink}
					strokeWidth={1.3}
					strokeDasharray="1.6 1.4"
					fill="none"
				/>
			</svg>
		);
	if (kind === "image")
		return (
			<svg width={15} height={15} viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<rect x="3" y="3" width="18" height="18" rx="3" stroke={ink} strokeWidth="2" />
				<circle cx="9" cy="9" r="2" stroke={ink} strokeWidth="2" />
				<path d="M21 15l-5-5L5 21" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
			</svg>
		);
	return (
		<svg width={16} height={14} viewBox="0 0 16 14" fill="none" aria-hidden="true">
			<path
				d="M4.5 3.5L1 7l3.5 3.5M11.5 3.5L15 7l-3.5 3.5M9.3 1L6.7 13"
				stroke="rgb(30,31,30)"
				strokeWidth={1.6}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

const CHIP = {
	position: "absolute",
	height: 26,
	borderRadius: 6,
	background: "#fff",
	boxShadow: "0 0 0 1px rgba(0,0,0,0.045), 0 1px 2.5px rgba(0,0,0,0.09)",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
};

/** The canvas-app window chrome (settled px; the pull-back scales it). */
function CanvasChrome({ zoom }) {
	return (
		<>
			<div
				style={{
					position: "absolute",
					left: WIN.x,
					top: WIN.y,
					width: WIN.w,
					height: WIN.h,
					borderRadius: 19,
					background: "rgb(248,250,247)",
					boxShadow: "0 0 0 1px rgba(0,0,0,0.055), 0 3px 9px rgba(0,0,0,0.035)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: PANEL.x,
					top: PANEL.y,
					width: PANEL.w,
					height: PANEL.h,
					borderRadius: 10,
					overflow: "hidden",
					background: "rgb(241,243,240)",
					boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.045)",
				}}
			>
				<div
					style={{
						position: "absolute",
						inset: 0,
						backgroundImage: "radial-gradient(circle, rgb(222,224,221) 0.85px, transparent 1.45px)",
						backgroundSize: "13.25px 13.2px",
						backgroundPosition: `${63 - PANEL.x - 6.625}px ${210 - PANEL.y - 6.6}px`,
					}}
				/>
			</div>
			{/* toolbar: frame chip, image chip + "50%" pill, "</>" chip (y58-84) */}
			<div style={{ ...CHIP, left: 69, top: 58, width: 28 }}>
				<ToolGlyph kind="frame" />
			</div>
			<div
				style={{
					...CHIP,
					left: 104,
					top: 58,
					width: 196,
					justifyContent: "flex-start",
					background: "linear-gradient(90deg, #fff 0 28px, rgb(241,243,240) 28px 96px, #fff 96px)",
				}}
			>
				<div style={{ width: 28, display: "flex", justifyContent: "center" }}>
					<ToolGlyph kind="image" />
				</div>
				<div
					style={{
						position: "absolute",
						left: 29,
						right: 0,
						top: 0,
						bottom: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						font: `400 15px ${FONT}`,
						color: "rgb(113,115,112)",
						paddingTop: 1,
					}}
				>
					{zoom}
				</div>
			</div>
			<div style={{ ...CHIP, left: 1182, top: 58, width: 29 }}>
				<ToolGlyph kind="code" />
			</div>
		</>
	);
}

/**
 * The SVG-code drift. Rows sit on a monospace grid (Consolas 61 px, advance
 * 33.3 px, row pitch 112.5, cap tops y82/194.5/307/419.5/532/644.5). Every
 * token is [text, inFrame, outFrame|null, nearFrame|null]. The FOCUS plane
 * drifts left on x = -167.8 + 163 * 0.9391^(f-40) (cell origin; tracked token
 * "1.75L391.5" 875 f22 -> 533 f40 -> 420 f60, fit < 4 px), no scale. The
 * NEAR plane is the same text x1.42 about y 334, blurred, drifting faster:
 * x_near = 1.42 * x_focus + K, K = -1333 + 466 * 0.9391^(f-52) (tracked on a
 * blurred row f46-f58: 482, 378, 284, 200, 126, 60, 2). White, alpha 0.5
 * focus / 0.42 near (normalised excess p90 on paper and desk alike).
 */
function CodeDrift({ f, rows, size, adv, alpha, nearAlpha, nearScale, nearBlur }) {
	const q = 0.9391;
	const F = -167.8 + 163 * q ** (f - 40);
	const K = -1333 + 466 * q ** (f - 52);
	const oy = 334;
	// Consolas advances 0.5498 em; pin the grid to `adv` whatever the size
	const ls = adv - 0.5498 * size;
	const focus = [];
	const near = [];
	for (let r = 0; r < rows.length; r++) {
		const row = rows[r];
		let col = row.col ?? 0;
		const capTop = row.y;
		const ra = row.alpha ?? 1;
		for (let i = 0; i < row.tokens.length; i++) {
			const [text, tin, tout, tnear] = row.tokens[i];
			const x = F + col * adv;
			const aIn = clamp01((f - tin + 1) / 1.5); // ~2/3 on its first frame (f22: 0.48 of 0.55)
			const aOut = tout == null ? 1 : 1 - clamp01((f - tout) / 1.5);
			const a = alpha * ra * aIn * aOut;
			if (a > 0.002 && x < 1240 && x + text.length * adv > 40) {
				focus.push(
					<span
						key={`${r}-${i}`}
						style={{
							position: "absolute",
							left: x,
							top: capTop - size * 0.184,
							font: `400 ${size}px ${MONO}`,
							letterSpacing: ls,
							lineHeight: 1,
							whiteSpace: "pre",
							color: rgbs([255, 255, 255], a),
						}}
					>
						{text}
					</span>,
				);
			}
			if (tnear != null) {
				const an = nearAlpha * ra * clamp01((f - tnear) / 6);
				const xn = nearScale * x + K;
				const yn = oy + (capTop - oy) * nearScale;
				const sz = size * nearScale;
				if (an > 0.002 && xn < 1240 && xn + text.length * adv * nearScale > 40) {
					near.push(
						<span
							key={`${r}-${i}`}
							style={{
								position: "absolute",
								left: xn,
								top: yn - sz * 0.184,
								font: `400 ${sz}px ${MONO}`,
								letterSpacing: ls * nearScale,
								lineHeight: 1,
								whiteSpace: "pre",
								color: rgbs([255, 255, 255], an),
							}}
						>
							{text}
						</span>,
					);
				}
			}
			col += text.length + 1;
		}
	}
	return (
		<div
			style={{
				position: "absolute",
				left: PANEL.x,
				top: PANEL.y,
				width: PANEL.w,
				height: PANEL.h,
				borderRadius: 10,
				overflow: "hidden",
			}}
		>
			<div style={{ ...ABS, left: -PANEL.x, top: -PANEL.y, width: 1280, height: 720 }}>
				<div style={{ ...ABS, width: 1280, height: 720, filter: `blur(${nearBlur}px)` }}>
					{near}
				</div>
				<div style={{ ...ABS, width: 1280, height: 720 }}>{focus}</div>
			</div>
		</div>
	);
}

function SketchCanvasView({ cfg, f }) {
	const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
	const r = pullR(f);
	const ry = pullRy(f);
	const g = 1 + (1280 / PHOTO.w - 1) * r; // window group scale, 1.405 -> 1
	const cAbs = 0.759 + 0.241 * r; // photo content scale vs f0
	const cy = 360 + (PC[1] - 360) * (1 - ry);
	const groupT = `translate(${(640 - g * PC[0]).toFixed(3)}px, ${(cy - g * PC[1]).toFixed(3)}px) scale(${g.toFixed(5)})`;
	const k = cAbs / g; // content scale inside the group
	const sketch = cfg.sketch ?? SK;
	const contentT = `translate(${(PHOTO.w / 2 - 640 * k).toFixed(3)}px, ${(PHOTO.h / 2 - 360 * k).toFixed(3)}px) scale(${k.toFixed(5)})`;
	// trace: outer from the upper-right vertex clockwise; knockout from the
	// left wing via the notch, the right wing and the tip
	const { hex, arrow } = markPts(sketch.w, sketch.cx, sketch.cy);
	const outerD = pts2d([hex[1], hex[2], hex[3], hex[4], hex[5], hex[0], hex[1]], false);
	const innerD = pts2d([arrow[3], arrow[2], arrow[1], arrow[0], arrow[3]], false);
	const po = tab(TRACE_OUTER, f);
	const pi = tab(TRACE_INNER, f);
	const tw = (cfg.traceWidth ?? 2.4) / cAbs;
	const traceCol = rgbs(cfg.traceColour ?? Q.trace);
	const traceProps = (p) => ({
		fill: "none",
		stroke: traceCol,
		strokeWidth: tw,
		strokeLinejoin: "round",
		strokeLinecap: "butt",
		pathLength: 1,
		strokeDasharray: p < 1 ? `${Math.max(0, p).toFixed(5)} 2` : undefined,
	});
	// f2-f5: a thin white keyline rect closing in from inside the photo (its
	// half-height 319.3 f2 -> 305.2 f5, x1.835 wide) with a faint lift inside
	// (+8 levels f2, +2 f3); it meets the shrinking photo edge at ~f5.8.
	let ghost = null;
	if (f >= 1.75 && f < 5.9) {
		const d = f - 2;
		const hh = 319.3 - 3.2 * d - 0.5 * d * d;
		const hw = hh * 1.835;
		if (hh < g * (PHOTO.h / 2) - 1) {
			ghost = (
				<div
					style={{
						position: "absolute",
						left: 640 - hw,
						top: cy - hh,
						width: hw * 2,
						height: hh * 2,
						boxShadow: "inset 0 0 0 1.2px rgba(255,255,255,0.6)",
						background: `rgba(255,255,255,${f < 2.5 ? 0.15 : f < 3.5 ? 0.04 : 0.015})`,
					}}
				/>
			);
		}
	}
	const photo = cfg.photo === "slot" || cfg.src;
	return (
		<div style={{ ...ABS, width: 1280, height: 720, overflow: "hidden" }}>
			<div style={{ ...ABS, width: 1280, height: 720, transformOrigin: "0 0", transform: groupT }}>
				<CanvasChrome zoom={cfg.zoomLabel ?? "50%"} />
				<div
					style={{
						position: "absolute",
						left: PHOTO.x,
						top: PHOTO.y,
						width: PHOTO.w,
						height: PHOTO.h,
						overflow: "hidden",
						background: "rgb(150,150,148)",
					}}
				>
					<div
						style={{
							...ABS,
							width: 1280,
							height: 720,
							transformOrigin: "0 0",
							transform: contentT,
						}}
					>
						{photo ? (
							<ImageSlot
								slot="sketch-photo"
								src={cfg.src ?? null}
								width={1280}
								height={720}
								tone="paper"
								desaturate={cfg.src ? 1 : 0}
							/>
						) : (
							<SketchPhoto uid={uid} sketch={sketch} />
						)}
						{po > 0 ? (
							<svg
								width={1280}
								height={720}
								style={{ ...ABS, overflow: "visible" }}
								aria-hidden="true"
							>
								<path d={outerD} {...traceProps(po)} />
								{pi > 0 ? <path d={innerD} {...traceProps(pi)} /> : null}
							</svg>
						) : null}
					</div>
				</div>
				{f >= 20 ? (
					<CodeDrift
						f={f}
						rows={cfg.rows ?? []}
						size={cfg.codeSize ?? 61}
						adv={cfg.codeAdvance ?? 33.3}
						alpha={cfg.codeAlpha ?? 0.5}
						nearAlpha={cfg.nearAlpha ?? 0.42}
						nearScale={cfg.nearScale ?? 1.42}
						nearBlur={cfg.nearBlur ?? 3.2}
					/>
				) : null}
			</div>
			{ghost}
		</div>
	);
}

// ── beat 2: comets on the dim outline (f61-f90) ─────────────────────────────

// Comet centres as a fraction of the path (kymograph of the outline's
// brightness, every frame f61-f90). Outer path: from the top vertex
// clockwise; the two outer comets sit half a perimeter apart and run
// counter-clockwise, decelerating (0.083/frame -> 0.006/frame).
const COMET_OUTER = [
	[61, 156],
	[62, 136],
	[63, 117],
	[64, 101],
	[65, 90],
	[66, 78],
	[67, 68],
	[68, 58],
	[69, 50],
	[70, 42],
	[71, 34],
	[72, 27],
	[73, 22],
	[74, 17],
	[75, 12],
	[76, 8],
	[77, 5],
	[78, 2],
	[79, 0],
	[80, -1],
	[84, -7],
	[88, -11],
	[90, -14],
].map(([f, v]) => [f, v / 240]);
// Knockout path (from the left wing, clockwise): two comets running
// clockwise, decelerating.
const COMET_INNER_A = [
	[61, 5],
	[62, 16],
	[63, 27],
	[64, 36],
	[65, 44],
	[66, 51],
	[67, 56],
	[68, 61],
	[69, 66],
	[70, 70],
	[71, 75],
	[72, 80],
	[73, 85],
	[74, 88],
	[75, 91],
	[76, 93],
	[80, 97],
	[90, 101],
].map(([f, v]) => [f, v / 120]);
const COMET_INNER_B = [
	[61, 58],
	[63, 75],
	[65, 89],
	[67, 100],
	[69, 110],
	[71, 120],
	[73, 132],
	[74, 135],
	[76, 140],
	[80, 143],
	[90, 147],
].map(([f, v]) => [f, v / 120]);
// Comet profile along the path, px (centre +-core at full, linear ramps to
// 0): f61-f73 a long hot core (~90 px) with short ramps; f74-f80 it relaxes
// into a soft triangle (half-max ~107 px f80, ~94 f90). Bloom fades with it.
const PROFILE = [
	{ at: 61, core: 45, ramp: 34, peak: 1, glow: 0.72 },
	{ at: 68, core: 45, ramp: 34, peak: 1, glow: 1 },
	{ at: 73, core: 45, ramp: 34, peak: 1, glow: 1 },
	{ at: 75, core: 34, ramp: 44, peak: 1, glow: 0.75 },
	{ at: 77, core: 15, ramp: 80, peak: 1, glow: 0.55 },
	{ at: 80, core: 4, ramp: 105, peak: 0.98, glow: 0.36 },
	{ at: 90, core: 2, ramp: 92, peak: 0.92, glow: 0.27 },
];
function profileAt(f) {
	let a = PROFILE[0];
	let b = PROFILE[PROFILE.length - 1];
	for (let i = 1; i < PROFILE.length; i++) {
		if (f <= PROFILE[i].at) {
			a = PROFILE[i - 1];
			b = PROFILE[i];
			break;
		}
	}
	const p = b.at === a.at ? 1 : clamp01((f - a.at) / (b.at - a.at));
	const o = {};
	for (const n of ["core", "ramp", "peak", "glow"]) o[n] = lerp(a[n], b[n], p);
	return o;
}

/** One comet as short dashes of graded opacity on a closed path. */
function comet(d, len, centre, prof, key, width) {
	const span = prof.core + prof.ramp;
	const n = 22;
	const step = (2 * span) / n;
	const out = [];
	for (let i = 0; i < n; i++) {
		const u = -span + (i + 0.5) * step;
		const au = Math.abs(u);
		const a = prof.peak * (au <= prof.core ? 1 : 1 - (au - prof.core) / Math.max(1, prof.ramp));
		if (a <= 0.01) continue;
		const s = (((centre + (u - step / 2) / len) % 1) + 1) % 1;
		const l = (step * 1.04) / len;
		out.push(
			<path
				key={`${key}${i}`}
				d={d}
				fill="none"
				stroke="#fff"
				strokeOpacity={a}
				strokeWidth={width}
				pathLength={1}
				strokeDasharray={`${l.toFixed(5)} ${(1 - l).toFixed(5)}`}
				strokeDashoffset={(-s).toFixed(5)}
			/>,
		);
	}
	return out;
}

const pathLen = (P) =>
	P.reduce(
		(s, p, i) => s + Math.hypot(P[(i + 1) % P.length][0] - p[0], P[(i + 1) % P.length][1] - p[1]),
		0,
	);

function CometOutlineView({ cfg, f }) {
	const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
	// push-in: hexagon width 223 (f61-f62 hold) -> 256.5 by ~f70,
	// 1 - 0.13 * 0.71^(f-62) (vertical-edge and vertex positions per frame)
	const W0 = cfg.width ?? 256.5;
	const W = W0 * (1 - 0.13 * (f >= 62 ? 0.71 ** (f - 62) : 1));
	const cx = cfg.cx ?? 639.75;
	const cy = cfg.cy ?? 359.5;
	const { hex, arrow } = markPts(W, cx, cy);
	const outer = [hex[0], hex[1], hex[2], hex[3], hex[4], hex[5]];
	const inner = [arrow[3], arrow[0], arrow[1], arrow[2]];
	const dO = pts2d(outer);
	const dI = pts2d(inner);
	const lO = pathLen(outer);
	const lI = pathLen(inner);
	const prof = profileAt(f);
	const innerProf = { ...prof, core: prof.core * 0.8, ramp: prof.ramp * 0.8 };
	const s = W / W0;
	const lw = cfg.cometWidth ?? 2.9;
	const cB = tab(COMET_OUTER, f);
	const hots = (w, k) => [
		...comet(dO, lO, cB, prof, `oa${k}`, w),
		...comet(dO, lO, cB + 0.5, prof, `ob${k}`, w),
		...comet(dI, lI, tab(COMET_INNER_A, f), innerProf, `ia${k}`, w),
		...comet(dI, lI, tab(COMET_INNER_B, f), innerProf, `ib${k}`, w),
	];
	const glow = (cfg.glow ?? 1) * prof.glow;
	// bloom: the comets re-drawn THICK and blurred (thick-then-blur keeps the
	// falloff soft, no alpha plateau): a tight halo (5 px stroke, 3 px blur)
	// and a wide one (30 px stroke, 34 px blur), tuned to the reference's
	// off-line energy (region mean 9-12, p90 22-29 f63-f72)
	const bloom = cfg.bloom ?? [0.8, 0.57];
	return (
		<svg width={1280} height={720} style={{ ...ABS, overflow: "visible" }} aria-hidden="true">
			<defs>
				<filter id={`${uid}t`} x="-30%" y="-30%" width="160%" height="160%">
					<feGaussianBlur stdDeviation={3 * s} />
				</filter>
				<filter id={`${uid}w`} x="-80%" y="-80%" width="260%" height="260%">
					<feGaussianBlur stdDeviation={34 * s} />
				</filter>
			</defs>
			<g fill="none" stroke={rgbs(cfg.dim ?? [38, 39, 38])} strokeWidth={1.5}>
				<path d={dO} />
				<path d={dI} />
			</g>
			{glow > 0.01 ? (
				<>
					<g filter={`url(#${uid}w)`} opacity={glow * bloom[1]}>
						{hots(30 * s, "w")}
					</g>
					<g filter={`url(#${uid}t)`} opacity={glow * bloom[0]}>
						{hots(5 * s, "t")}
					</g>
				</>
			) : null}
			<g strokeLinecap="butt">{hots(lw, "c")}</g>
		</svg>
	);
}

// ── beat 3: ink outline on the isometric construction grid (f91-f120) ───────

/**
 * The grid (f100): verticals at 640 +- 0/70/140, horizontals at 360 +-
 * 0/83.5/167 (both full-bleed), two diagonal families at slope +-0.6 with
 * y-intercepts 93 px apart, five each, centred on the frame centre. Dashes
 * 9 on / 8 off, 1 px [~222]. The mark: black 2 px outline, hexagon 271 px
 * wide centred (639.5, 359.5). Nothing moves (diff 0.2 = encode noise).
 */
function IsoOutlineView({ cfg }) {
	const grid = cfg.grid ?? {};
	const cx = grid.cx ?? 640;
	const cy = grid.cy ?? 360;
	const vx = grid.vx ?? [0, 70, 140];
	const hy = grid.hy ?? [0, 83.5, 167];
	const db = grid.diag ?? 93;
	const n = grid.diagN ?? 2;
	const sl = grid.slope ?? 0.6;
	const col = rgbs(grid.colour ?? [220, 222, 219]);
	const dash = grid.dash ?? [9, 8];
	const lines = [];
	const xs = [...new Set(vx.flatMap((v) => [cx - v, cx + v]))];
	const ys = [...new Set(hy.flatMap((v) => [cy - v, cy + v]))];
	for (const x of xs) lines.push(<path key={`v${x}`} d={`M${x} -8V728`} />);
	for (const y of ys) lines.push(<path key={`h${y}`} d={`M-6 ${y}H1290`} />);
	for (let i = -n; i <= n; i++) {
		for (const sg of [1, -1]) {
			const y0 = cy + sg * sl * (-40 - cx) + i * db;
			const y1 = cy + sg * sl * (1320 - cx) + i * db;
			lines.push(<path key={`d${i}${sg}`} d={`M-40 ${y0}L1320 ${y1}`} />);
		}
	}
	return (
		<div style={{ ...ABS, width: 1280, height: 720 }}>
			<svg width={1280} height={720} style={ABS} aria-hidden="true">
				<g fill="none" stroke={col} strokeWidth={1} strokeDasharray={dash.join(" ")}>
					{lines}
				</g>
			</svg>
			<MapleMark
				width={cfg.width ?? 271}
				cx={cfg.cx ?? 639.5}
				cy={cfg.cy ?? 359.5}
				stroke={cfg.ink ?? Q.black}
				strokeWidth={cfg.lineWidth ?? 2.2}
			/>
		</div>
	);
}

export const S1_PRESETS = {
	"maple-sketch-canvas": {
		note: "s1 f0-f60 on white: a pencil sketch of the mark on a notebook (drawn; or the `sketch-photo` slot via `photo:'slot'` / `src`) pulls back into a canvas-app window (one group, 1.405x -> 1, r = 0.78*0.82^(f-3)); the photo content zooms on the same curve to 0.759 (cover crop); a blue trace runs round the hexagon f4-f38 and the knockout f20-f47; the mark's SVG code drifts left as translucent monospace, tokens landing on a focus plane and later handing over to a blurred x1.42 near plane. Curves on the film-frame clock from frame0.",
		nativeMs: 2033,
		params: {
			frame0: ["number", "0", "film frame of the scene's first frame"],
			photo: ["string", "'drawn'", "'drawn' pencil sketch | 'slot' = ImageSlot sketch-photo"],
			src: ["string", "null", "sketch photo path (implies the slot)"],
			zoomLabel: ["string", "'50%'", "toolbar pill"],
			rows: [
				"array",
				"[]",
				"code rows: {y capTop, col, alpha?, tokens:[[text,in,out|null,near|null]]}",
			],
			codeSize: ["number", "61", "focus-plane mono px"],
			codeAdvance: ["number", "33.3", "monospace cell px"],
			codeAlpha: ["number", "0.5", "focus-plane white alpha"],
			nearAlpha: ["number", "0.42", "near-plane white alpha"],
			nearScale: ["number", "1.42", "near plane scale about y 334"],
			nearBlur: ["number", "3.2", "near plane blur px"],
			traceColour: ["array", "[29,124,220]", "trace stroke"],
			traceWidth: ["number", "2.4", "trace px"],
		},
		render: (cfg, t) =>
			live(cfg, t) ? <SketchCanvasView key={cfg.id} cfg={cfg} f={frameOf(cfg, t, 0)} /> : null,
	},
	"maple-comet-outline": {
		note: "s1 f61-f90 on black: the mark as a dim outline pushing in 0.87 -> 1 (f62-f70); two white comets per path glide and decelerate (outer counter-clockwise, half a perimeter apart; knockout clockwise) with bloom, then relax into soft highlights f74-f90. Curves on the film-frame clock from frame0.",
		nativeMs: 1000,
		params: {
			frame0: ["number", "61", "film frame of the scene's first frame"],
			width: ["number", "256.5", "settled hexagon width px"],
			dim: ["array", "[38,39,38]", "base outline"],
			glow: ["number", "1", "bloom multiplier"],
			cometWidth: ["number", "2", "comet stroke px"],
		},
		render: (cfg, t) =>
			live(cfg, t) ? <CometOutlineView key={cfg.id} cfg={cfg} f={frameOf(cfg, t, 61)} /> : null,
	},
	"maple-iso-outline": {
		note: "s1 f91-f120 on white: the mark as a black 2 px outline (271 px) over a full-bleed isometric dashed construction grid (verticals 70 px, horizontals 83.5 px, +-0.6 diagonals). Dead still.",
		nativeMs: 1000,
		params: {
			width: ["number", "271", "hexagon width px"],
			lineWidth: ["number", "2", "outline px"],
			grid: ["object", "{}", "{cx,cy,vx,hy,diag,diagN,slope,colour,dash}"],
		},
		render: (cfg, t) => (live(cfg, t) ? <IsoOutlineView key={cfg.id} cfg={cfg} /> : null),
	},
};
