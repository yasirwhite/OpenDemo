/**
 * maple-s2.jsx — section s2 (film f121-f268, 4033-8967 ms): the mark under
 * construction. Three beats, one preset each, all measured on the 30 fps
 * clock off ref/f720 (frame n = n/30 s; numbers are STAGE px, 1280x720):
 *
 *   maple-wire-closeup  f121-f180  black. Extreme close-up of the hexagon's
 *                       lower half as thin grey wireframe: strokes draw on
 *                       f120-f125 (outer clockwise from the top vertex, inner
 *                       from the arrowhead tip), a decelerating push-in about
 *                       (640.5,590) (scale 1 -> 1.505, two-term exponential,
 *                       fit residual < 0.8 px), white anchor dots pop f129-f132,
 *                       every vertex splits into a fillet f151.5-f170.
 *   maple-node-mark     f181-f240  black. The whole mark: white outline, blue
 *                       anchor nodes on every fillet, a decelerating pull-back
 *                       about the frame centre (403 -> 294 px wide). Cursor
 *                       flies in from the lower right (expo-out), clicks at f187
 *                       (navy fill), a hatch sweeps lower-right -> upper-left
 *                       f198-f212, the cursor whips out of the top f207-f215.
 *   maple-hue-scrub     f241-f268  black. Cut to a mesh-gradient fill (true
 *                       hole), a faint halo ring expands and fades, the mark
 *                       rises 52 px while a rainbow hue slider rises from below,
 *                       the knob is dragged right (expo-out) and the fill jumps
 *                       to a new gradient state every 3-4 frames.
 *
 * Every render is a pure function of t. Curves are written on the FILM frame
 * clock (f = frame0 + localMs * 30 / 1000) so the comments read against the
 * reference frames; retime a beat by moving its scene, not its curves.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import {
	ArrowCursor,
	live,
	localMs,
	MARK,
	MapleMark,
	markGeometry,
	Q,
	rgbs,
	roundedPath,
} from "./maple-shared.jsx";

/** Film frame for a scene whose first frame is cfg.frame0. */
const frameOf = (cfg, t, f0) => (cfg.frame0 ?? f0) + (localMs(cfg, t) * 30) / 1000;
const ABS = { position: "absolute", left: 0, top: 0 };

/**
 * A cursor with motion blur: the shared arrowhead drawn at n points spread
 * along a trailing smear vector. `path(f)` returns the TIP [x, y] or null when
 * off stage. The smear defaults to the path over the last `shutter` frames;
 * `smear(f, speed)` overrides it (the entry smear f183-f190 trails
 * horizontally to the right, ~1.4x the per-frame speed capped at 50 px,
 * although the move is mostly vertical). `trail` keeps the glyph solid and
 * fades the smear behind it (the entry: the reference's cursor body stays
 * solid white f183-f190 with a streak off its right side); without it every
 * copy is equal weight (the exit f208-f214 reads as an all-grey smear).
 * `scale` shrinks the glyph: the reference's cursor is ~74 px (tip -> right
 * wing) free and ~56 px while the button is held (f196-f200, and the whole
 * slider drag f243-f268), so ArrowCursor `size` 100 free, x0.75-0.8 held.
 * `rotate` (deg, clockwise about the tip): the cursor turns ~38 deg to point
 * up before the exit (f203-f205).
 */
function BlurCursor({
	path,
	f,
	size = 100,
	shutter = 0.7,
	smear = null,
	scale = 1,
	trail = false,
	rotate = 0,
}) {
	const p0 = path(f);
	if (!p0) return null;
	const pb = path(f - 1) ?? p0;
	const speed = Math.hypot(p0[0] - pb[0], p0[1] - pb[1]);
	let v = smear ? smear(f, speed) : null;
	if (!v) {
		const p1 = path(f - shutter) ?? p0;
		v = [p1[0] - p0[0], p1[1] - p0[1]];
	}
	const len = Math.hypot(v[0], v[1]);
	const n = len < 6 ? 1 : Math.min(16, Math.ceil(len / 3));
	const out = [];
	for (let i = 0; i < n; i++) {
		const u = n === 1 ? 0 : i / (n - 1);
		const x = p0[0] + v[0] * u;
		const y = p0[1] + v[1] * u;
		out.push(
			<ArrowCursor
				key={i}
				x={x}
				y={y}
				size={size * scale}
				rotate={rotate}
				opacity={trail ? (i === 0 ? 1 : (0.5 * (1 - u)) / Math.sqrt(n)) : 1 / n}
				shadow={n === 1 || (trail && i === 0)}
			/>,
		);
	}
	return <>{out}</>;
}

/** Piecewise-linear lookup in a dense [[f, v], ...] table (measured per frame). */
function table(rows, f) {
	if (f <= rows[0][0]) return rows[0][1];
	for (let i = 0; i < rows.length - 1; i++) {
		const [fa, va] = rows[i];
		const [fb, vb] = rows[i + 1];
		if (f < fb) {
			const p = (f - fa) / (fb - fa);
			return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], p)) : lerp(va, vb, p);
		}
	}
	return rows[rows.length - 1][1];
}

// ── beat 1: wireframe close-up (f121-f180) ────────────────────────────────

/**
 * Push-in, measured f123-f180 off the hexagon's centre line and right
 * vertical edge (half-width 509.5 -> 767 px): a fixed origin (640.5, 590)
 * reproduces both edges to 0.4 px, so it is ONE scale about that point,
 * s = 1.5735 - 0.2333 e^-(f-123)/17 - 0.3402 e^-(f-123)/33 (fit residual
 * < 0.8 px per frame; s 1.00 f123, 1.24 f136, 1.40 f150, 1.47 f165, 1.505 f180).
 * At s = 1 the hexagon is 1019 px wide, its bottom vertex at (475.5, 569.5).
 */
const WIRE = { w0: 1019, bx0: 475.5, by0: 569.5, ox: 640.5, oy: 590 };
const wireScale = (f) =>
	1.5735 - 0.2333 * Math.exp(-(f - 123) / 17) - 0.3402 * Math.exp(-(f - 123) / 33);
/** Fillet radius (mark units): bottom-vertex dot pair 25.8 px apart f154 -> 59.5
 * f180; per mark unit that is R = 14.5 (1 - 0.79^(f - 151.5)). */
const wireRadius = (f) => (f < 151.5 ? 0 : 14.5 * (1 - 0.79 ** (f - 151.5)));
/** Anchor dots pop f129-f132 (lit-pixel counts 12, 37, 53, 65+; ~11.5 px
 * settled) -> 1 - 0.45^(f - 128.3). */
const dotScale = (f) => (f < 128.3 ? 0 : 1 - 0.45 ** (f - 128.3));

function WireCloseupView({ cfg, f }) {
	const s = wireScale(f);
	const W = WIRE.w0 * s;
	const H = (W * 460) / 384;
	const bx = WIRE.ox + (WIRE.bx0 - WIRE.ox) * s;
	const by = WIRE.oy + (WIRE.by0 - WIRE.oy) * s;
	const left = bx - W / 2;
	// shiftY: the Maple arrowhead's wings sit higher in the mark than the
	// reference's inner corner, so the framing drops 24 px to keep the inner
	// fillet on screen through f180 (the reference's sits at y 51-72 there).
	const top = by - H + (cfg.shiftY ?? 24);
	const R = wireRadius(f);
	const g = markGeometry({ width: W, variant: "main", radius: R, pad: 0 });
	// Acute wing tips: a 0.22x inner fillet gives a dot pair about the size of
	// the reference's inner-corner pair (MapleMark's 0.6x would retract the tip
	// ~100 px off the top of frame by f165).
	const inner = [roundedPath(MARK.arrow, R * (cfg.innerRadius ?? 0.22), W / MARK.w, 0, 0)];
	// Draw-on. Outer path (top vertex, clockwise): head on the right vertical's
	// screen-top at f122 and 25% down the lower-right edge, past the lower-left
	// edge by f124 -> 0.167 of the perimeter per frame from f119.75. Inner path
	// (arrowhead tip -> right wing -> notch -> left wing): ~290 px/frame like the
	// reference's inner strokes -> 0.174 per frame from f120.8, done by f126.
	const dOuter = clamp01((f - 119.75) * 0.167);
	const dInner = clamp01((f - 120.8) * 0.174);
	const dash = (p) => (p < 1 ? { strokeDasharray: `${Math.max(0, p)} 2` } : {});
	// Two greys: the strokes run ~245 at the upper left to ~100 at the lower
	// right in SCREEN space (f125: lower-left edge 254 -> 128 toward the bottom
	// vertex, lower-right edge ~110, right vertical 156 -> 113 downward).
	const gid = `${cfg.id}-wg`;
	const lw = cfg.lineWidth ?? 3;
	const dot = (cfg.dotSize ?? 11.5) * dotScale(f);
	const anchors = [...g.outer.anchors, ...inner.flatMap((i) => i.anchors)];
	const strokeProps = {
		fill: "none",
		stroke: `url(#${gid})`,
		strokeWidth: lw,
		pathLength: 1,
		strokeLinejoin: "round",
	};
	return (
		<svg width={1280} height={720} style={ABS}>
			<defs>
				<linearGradient
					id={gid}
					gradientUnits="userSpaceOnUse"
					x1={60 - left}
					y1={150 - top}
					x2={330 - left}
					y2={700 - top}
				>
					<stop offset={0} stopColor={rgbs(cfg.lineBright ?? [255, 255, 255])} />
					<stop offset={1} stopColor={rgbs(cfg.lineDim ?? [104, 104, 104])} />
				</linearGradient>
			</defs>
			<g transform={`translate(${left.toFixed(3)} ${top.toFixed(3)})`}>
				<path d={g.outer.d} {...strokeProps} {...dash(dOuter)} />
				{inner.map((i, n) => (
					<path key={n} d={i.d} {...strokeProps} {...dash(dInner)} />
				))}
				{dot > 0.3
					? anchors.map(([x, y], n) => (
							<circle key={n} cx={x} cy={y} r={dot / 2} fill={rgbs(Q.pure)} />
						))
					: null}
			</g>
		</svg>
	);
}

// ── beat 2: node mark, navy fill, hatch, cursor (f181-f240) ───────────────

/** Pull-back about the frame centre, measured on the vertical edges (left edge
 * x 438 f181 -> 492.5 f240, centre 639.5): W = 282 + 121 e^-(f-181)/25.25
 * (403 f181, 340 f200, 314 f215, 294 f240; residual < 0.6 px). */
const nodeWidth = (f) => 282 + 121 * Math.exp(-(f - 181) / 25.25);
/** Hatch sweep progress (mask offset from the lower-right corner). Target:
 * the reference's hatched share of the fill per frame (4% f199, 13%, 24%,
 * 32%, 40%, 49%, 58%, 67%, 74%, 81%, 90% f209, 96%, 100% f211), inverted
 * through this mark's own coverage curve (measured on our render; pass 3 within
 * 0.02 except f209-f210, where the exiting cursor occludes the count). */
const HATCH = [
	[198.5, 0.19],
	[199, 0.241],
	[200, 0.305],
	[201, 0.37],
	[202, 0.414],
	[203, 0.465],
	[204, 0.529],
	[205, 0.591],
	[206, 0.643],
	[207, 0.689],
	[208, 0.737],
	[209, 0.79],
	[210, 0.83],
	[211, 0.86],
	[212, 1],
];
/**
 * Cursor tip path. Entry f181-f202.6: expo-out from the lower right onto the
 * lower-right flank, measured on the cursor body (858,682 f183 -> 800,500
 * f187 -> 771,438 f198): x 767 + 158 * 0.72^(f-181), y 437 + 486 *
 * 0.71^(f-181), mapped to the tip by `tipOffset` (calibrated -6,-8 on
 * f190-f202). It then stays put while it turns to point up (f203-f205: the
 * reference's body bbox slides left 766 -> 750 from the turn alone). Exit
 * f207-f215 (tip, measured where it clears the mark: 701,115 f211; 689,51
 * f212; 680,1 f213): up and out of the top, ~90 px/frame at f209-f210.
 */
const CURSOR_EXIT = [
	[207, [761, 429]],
	[208, [745, 370]],
	[209, [729, 287]],
	[210, [714, 197]],
	[211, [701, 115]],
	[212, [689, 51]],
	[213, [680, 1]],
	[214, [672, -45]],
	[215, [665, -85]],
	[216, [658, -120]],
];
const entry = (f, d) => [
	767 + 158 * 0.72 ** (f - 181) + d[0],
	437 + 486 * 0.71 ** (f - 181) + d[1],
];
function nodeCursor(f, d) {
	if (f <= 202.6) return entry(f, d);
	if (f <= 207) {
		const p = entry(202.6, d);
		const e = clamp01(f - 206);
		return [lerp(p[0], CURSOR_EXIT[0][1][0], e), lerp(p[1], CURSOR_EXIT[0][1][1], e)];
	}
	if (f <= 216) return table(CURSOR_EXIT, f);
	return null;
}

function NodeMarkView({ cfg, f }) {
	const W = nodeWidth(f);
	const hp = table(HATCH, f);
	const filled = f >= (cfg.clickFrame ?? 187);
	const d = cfg.tipOffset ?? [-6, -8];
	// press-and-hold for the hatch drag: 0.75x f194.5-f196.5, held, released by
	// f201.5; then the turn to point up, 0 -> 38 deg f202.8-f205 (ease-out).
	const hold = Math.min(clamp01((f - 194.5) / 2), clamp01(201.5 - f));
	const turn = 38 * (1 - (1 - clamp01((f - 202.8) / 2.2)) ** 2);
	return (
		<div style={{ ...ABS, width: 1280, height: 720 }}>
			<MapleMark
				width={W}
				cx={cfg.cx ?? 639.5}
				cy={cfg.cy ?? 359.5}
				radius={cfg.radius ?? 14.6}
				stroke={Q.pure}
				strokeWidth={cfg.lineWidth ?? 2.4}
				fill={filled ? (cfg.fill ?? Q.navy) : null}
				hatch={
					filled && f >= 198.2
						? {
								colour: cfg.hatchColour ?? Q.hatch,
								pitch: W * 0.0342,
								width: 2.6,
								angle: 60,
								progress: hp,
								soft: 0.012,
							}
						: null
				}
				anchors="node"
				anchorSize={cfg.nodeSize ?? 11}
			/>
			<BlurCursor
				path={(q) => nodeCursor(q, d)}
				f={f}
				size={cfg.cursorSize ?? 100}
				scale={1 - 0.25 * hold}
				rotate={turn}
				trail={f <= 200}
				smear={(q, speed) => (q <= 200 ? [Math.min(1.4 * speed, 50), 0] : null)}
			/>
		</div>
	);
}

// ── beat 3: gradient fill + hue slider scrub (f241-f268) ──────────────────

/**
 * The fill states, sampled off the reference (f241 A, f245 B, f249 C, f252 D,
 * f256 E, f260 F, f263 G; f267 returns to A): a 16 x 19 colour grid over the
 * 288 x 345 mark box (cell medians inside the hexagon, the reference's own
 * knockout filled from its neighbours), drawn as blurred cells = a smooth mesh
 * gradient. Row strings are 16 rrggbb cells, top row first.
 */
const HUE_MESH = {
	A: [
		"c3afebc1ace7bea4e0bea5e0baa1dcb097d2a991c99c85bb9a86baa791c4a994c5796c935951725950726b527775537a",
		"c3afebc3afebc2ace7bea4e0bfa6e0bba3ddb097d2b097ceb29acea994c5887aa25852735950726a527774537a77537a",
		"c5b4eec3afebc3b0eac3aee8bea4e0c0a7e1bfaae0c2aee1c6aedec4aedc58557459507267537770537977537a81557d",
		"c7b8f0c6b6eec3afebc3b0eac7b5ebcab9eacdbbebd0bcecd3bdecd6bcea675f8064557869537877537a81567d8c577f",
		"c8bef3c7b8f0c8baf0cbbef0cec2f2d1c4f2d5c6f3d8c6f3dcc6f3e1c6f47a6a8d705e80755a7d80587e8c577f9a5980",
		"c7c0f5c9c2f4ccc6f4cfc8f5d3c9f7d6caf8d7caf7d8c7f4dec7f4e5c9f68c76997d66888060838c5d82995a83a9597f",
		"cac8f7cccaf9ceccf8d1cdf8d4ccf8d5cbf8d6caf8d7caf7e5c9f6b89fc89d85a9866e8d8d6889976285a85f84b45d80",
		"cacdf9cccefacfcef9d1cffad3cefad4ccf8d5cbf7d6caf6d5c1eeb9a0c8866e8d946e8e996e8da4698ab26585be617d",
		"c9cef9ccd0fbcdd0f9d0cef9d2cdf9d4ccf8d6caf6d9c8f6dcc5f6c0a8d39c7291a67493a67493af6e8dbd6986c9637c",
		"c7cef9cacff9cccefacfcefad0ccf9d3caf8d9c8f7dcc5f6ddc4f5ddc4f5b17a97b27a97b27a98b9728ec86c84d16679",
		"c6ccfac8ccf9cbcdf9cccbf7cec8f7d2c5f6d7c3f5dec2f5dec2f4dbb6e3c385a1bd7f9bbd7f9ac5778fcf7083d86a76",
		"c6caf8c6caf8c7c8f7c9c6f6ccc3f6d1c2f6d8c0f3dfbff2e0bff2dfb0d8d394b1cb88a2c8849ed07b8fd87383e16c75",
		"c0c6f6c2c5f6c4c3f5c6c1f5cabef4d0bbf3d7baf1e2bbf0e6baeae6aed0dfa2c2d394b1d489a1d98091e07884e57178",
		"bdc3f4bfc0f3bfbdf2c3bbf2cab9f2d0b7f2d7b8efe9baedeebae4ecb5d8e1a6c8db98b5dc8da4e08493e57c86e87579",
		"bdbff2babaf0bdb7f1c2b5f1c9b3f1d1b3f0dbb5eef6bde7f6bce2f0b6dae9a8c8e49bb8e492a6e88996eb8189e87b83",
		"babaf0bcb7f0bcb3efc0afeec8aeefd1afece8b6eaf5bbe3f7b9dff2b5d8efaac8eca0b8eb96a7ec8d9aea8893eb8189",
		"bbb7f0bcb3efbeb1eec3aeeec9aaecd3abebf2b8e5f5b8dff6b8ddf5b3d4f3abc9f0a2b8ed99acec92a0ec8d9aeb8792",
		"bcb3efbdb2efc2afeec9aaecceaaece0b1e8f3b6e3f4b6ddf6b4d6f6b0cff4acc9f2a6c0f0a2b8ed96a8ec8f9dec8d9a",
		"bcb2efc1b0eec9aaecccaaecdbafe9f3b6e3f4b5def4b3daf4afd1f5b1d2f6b0cff3a9c4f1a4bcf0a2b8ed95a6ec8e9c",
	],
	B: [
		"f5a2e1f5a3d9f4a3caf4a2c8f49fbef498adf391a0f38992f3868df48c96f48e9af192a2f094a6ef93a6e592bbdf90c6",
		"f5a2e2f5a3e0f5a3d8f4a3caf4a2c6f49ebdf498adf293a1f4909bf48e9af294a4f094a6ef93a6e692bae091c4de90c7",
		"f69ee3f5a2e2f5a4def5a4d6f4a3caf5a1c2f59ebaf49cb1f49bacf499aaf296a6ef93a6e894b8e292c2de90c7d88dd2",
		"f69ae5f69fe3f5a2e2f5a5d9f6a6d4f6a7ccf6a7c6f5a6c3f5a5bff6a3baf19fb7ec99b8e594bdde90c7d88fd2d189dc",
		"f594e3f69ae5f6a0e3f7a9dff7acdbf7afd7f5afd3f5afcff6aecbf3abc8f0a6c6eaa1cbe299ced993d4d189dccc86de",
		"f58ee2f595e3f6a1e5f6ade4f6b3e0f7b6e0f7b5ddf6b0d2f4aecdf1aed2eeaad8e7a4dbe19fdcd796dfcf8adfc580df",
		"f38adff594e2f6a2e6f7b1e8f7b7e6f6b6e2f7b6def7b5ddf1aed2f0acd5eba9dae4a7e1dfa1e1d595e0cb88ddc27fdc",
		"f38addf594e0f6a2e3f6b0e6f5b8e8f4b7e7f3b8e8f2bae8f1b4dfecaddbe4a7e1dda1e1db9fe2d294dfc887dbbd7dd9",
		"f48ad9f496ddf6a3e0f6ade4f4b5e7f4b7e7f2bae8f0b7e7efb7e7eaafe5da9fe0d69cdfd79ce0ce91dcc285d6b679d2",
		"f48cd4f396d5f29fdbf1a5deefaae2efafe5efb5e6efb7e7ebb0e6e9ace4d098ddd198ddd098dcc68fd9ba82d2ad76cb",
		"f28ccdf193d1ed96d3ea98d5e898d9e699dce49ce0e7a9e5e19de0d897ddc894daca94dacb95dbc08bd6b37dcea472c4",
		"ee86c6e987c7e587c7e284cade82cbd97dced478d0ce78d3d27ed4c376d5c492d9c391d8c390d8b788d0ac7bca9c6ebf",
		"e87ebce37bbbdf76beda72bed46cbfce66c2c85fc3c05ac5bc5acaaa4ed2b66fd6c492d9bb8cd4b084cea277c6936aba",
		"e271afdd6db1d867b2d361b2cc59b2c754b7bf51bcba4cc1b24ccaaa4ccfab51d4bd8edab386d4a67fcc9a73c28866b6",
		"dd6aadd860a6d259a6cd53a7c74facc14ab3ba49bbb448c5ac48cea749d3a24cd4a054d8ad81d4a07acb9471c2926ebe",
		"d860a6d259a4cd51a1c94ba3c348a8bd47b7b448c3ae48cea648d4a048d49d4ad59a4dd79f71d69d77ce9b76c99471c2",
		"d259a4cd51a1cb4ea2c64ba7c147afb849c0af4bcaa949d1a24ad49c4ad5984ad5964bd59b60d49e74d29d77ce9975c8",
		"cd51a1cc50a2c84ca6c147afbc48b8b54ac2ad4ccfa64ad29d4bd4984ad6984ad5974ad5964bd59b66d29e76d09d77ce",
		"cc50a1c84da6c147afbf48b3b849bead4ccfa74bd2a24cd49d4cd69b4bd5984ad6974ad5964bd5964bd59b67d19d76cf",
	],
	C: [
		"ef628cef6592ee699ced6a9cec6da1eb73aaeb75aded78b4ea78b5e571aee06ba9d65ca4d053a3cf51a3c74aa9c247ad",
		"ef628cef638dee6592ee699cec6a9deb6da1eb73aae873aae570abe06ba9d85da3d255a2cf51a3c84ba8c347acc147ae",
		"ef5f86ef628cee648eee6693ee699ceb6c9ee86ca0e4699fe064a0db609fd459a2cf51a3c94ba5c548a9c147aebb49b9",
		"ef5c81ef5f86ef628cee6590ec6693e86594e46295df5f96da5895d55396d1519acc4b9ec948a4c147aebc49b8b44bc4",
		"ee5a7aef5c81ee5f85ec6087e96089e55e8ae05a8adc5588d8518bd44d8fd04a92cc479bc647a6be49b7b44bc4b14bc9",
		"ef5876ed5a78eb5c7be95a7de5597ee1567edd5381dc5588d64f8bd24a89d0488fcc4799c249afbb4cbdb34cc7ac4bd1",
		"ec566deb566fe95771e75473e25477e15479df547fdd5381d24a89d1498ccd4994c74aa1c24bb1b94dbdb34fcaaa4ed3",
		"ea5463e95366e65269e45168e14e6be04c6ade4867dd4669d94978d0498ac74aa1c24caec14cb2b94fbeb250caab4fd4",
		"ea515be94f5ce54e5fe34d5fe14b64de4965dd4669dc4667db4668d4477ac34dacc14eb2c04eb2bb50bfb351caab52d4",
		"e94d53e74d52e64c57e34a57e1485cdf485fdd4764db4668dc4666dc4667c250b0c250b0c24fb1bc52beb554cbaf55d4",
		"e94c4ae84a4be6494ee44851e34855e14758df465ddc4665dc4665d74971c552a7c352aec352aebd55beb858cab058d4",
		"e84a43e74843e64847e6474be3474ee24552e04657dd4763dd4762d64b76c95298c553a6c354abbf58bbb85bc7b35dd3",
		"ea4839e8473ce7473ee64743e54746e34649e14652de475ddc4862d44c7ad04e88c95298c655a6c15ab7bb5ec5b560d2",
		"eb4c35e94832e94638e8473be7473de54744e2474cdf4756dc4960d64a73d14d81ce5193c856a3c25cb4be60c3b863ce",
		"eb4f39ed5943ec4831ea4731e84735e6473ee34747e14850db495cd94b6dd44e7dcf528dc957a0c55cb1c061c1bd61c6",
		"ed5943ec533eec5746eb5341e94830e74834e44740e24849de4956da4b68d44f78d0538aca589bc65caac45eb4c061c1",
		"ec5642ec5746ec5544ea513ee95243e74e39e54739e24744de4852da4c60d64f71d25283cc5694c85aa2c65caac35eb5",
		"ec5746ec5645eb5443e95243e8503ee64d3de44c3ee3483ddf494cdb4b58d74e6bd4507ad25283cb5899c75ba6c65caa",
		"ec5645eb5544e95243e85140e74f3fe44c3ee34a3de1493ce04742de494ddb4b58d64f70d3517ed25283cb589bc65ca8",
	],
	D: [
		"c0c1f7c3c5f8c8cbf9c8ccf9cacdfacecffbd0cffad2cff9d3cef9d2cdf9d3cbf8d8c7f7dcc5f6ddc4f6e9c1f2f0c0f0",
		"c0c0f7c1c2f8c3c5f8c8cbf9c8ccf9cacdfacecffbcfcefad0cdf9d3cbf8d6c8f7dac6f6ddc4f6e8c1f2efc0f0f1c0ef",
		"beb9f5c0c0f7c2c4f8c4c7f9c8cbf9c9cdf9cbcdf9cccdf9cfccf9d3c9f8d7c7f7ddc4f6e5c1f3ecc0f1f1c0efe6b4de",
		"bcb1f3bebaf5c0c0f7c3c7f9c6cafac8cbf9c9cbf8cbcaf7ccc8f5d1c4f6d6c3f5ddc1f5e8c0f3f1c0efe8b6e0d8a6cc",
		"b9a9f0bcb1f3bebcf6c0c3f6c4c9f8c6c9f7c6c8f5c9c5f7ccc3f6d0c1f5d7bff5dfbef3edbeeef0bbe6d8a6ccd9a2c5",
		"b69eedb9acf1bbb9f4bfc2f6c0c5f5c2c5f6c5c4f6c8c5f6cec1f5d1bcf3d7baf2e1bbf1f5beecf0b8e0dda6cbd599b8",
		"b398edb6a7eeb9b7f2bcbff3bfc2f4bfc2f4c4c4f6c5c4f6d1bcf3d4bbf2dcbaf1e9b9edf7bde7f0b7dde5a8cbdd9cb8",
		"b094eab3a7edb7b7f0b8bcf1b7b9efb9b6efb8afecbbadedc5b4f0d5b7f0e9b9edf3bbe6f6bce3f4b7dcecabcbe7a0bb",
		"ab93e8b1a9edb3b6eeb3b5eeb5b3eeb5b1ebbbadedbbaaebbda8ebccadecf2b9e3f6b9e0f6b9e0f5b6d8f1abc9eea3bb",
		"a899e9acadebadb1ebadafeab0abecb1aaebb8a9eabda8ebbea6eabea6ebf6b5dbf6b6dbf7b6dcf5b3d4f4acc8f3a3ba",
		"a6a5e8a7a9e7a7a8e8a8a6e9aba5e9b0a4eab6a3eabfa4eabea4eacaa5e5f4b0d7f6b2d6f6b2d6f5afcdf5a9c2f3a3b8",
		"a1a1e5a1a1e5a0a0e7a49fe6a89ee7ae9ee7b69ee8bd9feabd9fe9d2a3e3efadd8f3aed3f4add1f4a9c7f3a3bdf29db3",
		"9a9ae19a99e29c98e3a097e4a697e5ac97e6b599e6bc9ae7c29ae7dca0e3e5a6deefadd8f3aacdf1a5c4f29fbaf19ab1",
		"9190de928fdf968fe09d8fe2a48fe1ab91e4b392e5bb94e7c495e5d399e4e6a8e2eca9d8eda6cdeea2c5ee9dbcee98b5",
		"908dde8e89de9388df9a89e0a08ae0a98ce2b28ee4bb90e4c792e5cf96e4e1a0e2e6a3dae8a0cee89ec8e99abfec9abb",
		"8e89de9187de9384de9682de9e85dfa886e0af88e1ba8ae1c38de3cc91e5da98e3e29ddde49dd7e69acde89bc7e99abf",
		"9187de9384de9483de9982de9c7edea57fdeac82e0b785e1be87e2c88ae3d190e2db97dfe29bd8e59cd2e69acde89ac6",
		"9384de9484de9782de9c7edea07edea67fdfaa7ddfb47fdfbc82e1c485e2ce8ee2d694e0db97dfe29ad6e69bd0e69acd",
		"9384de9682de9c7ede9e7edea37edeaa7ddfb07ddfb17cdfb97ddfbe81e1c485e2d18fe1d895e0db97dfe299d4e69ace",
	],
	E: [
		"ae63bfab5dc6a452d2a251d39f4ed59949d69747d69545d79644d69745d69846d79947d69948d59948d59a4ad79b4bd8",
		"af64bdae62c0aa5bc8a452d2a150d49e4dd69949d69847d69846d59846d79948d69948d59948d59a4ad79b4bd89b4cd8",
		"b56cb4af64bdad5fc4a959cba452d29e4ed79e4cd89c4ad89b48d79948d89948d59948d59a4ad79a4bd79b4cd89c4cd8",
		"bc74a9b56bb6af64bdab5acba753d3a453d6a250d6a14ed79e4bd79c4ad79b4ad79b4ad79a4ad69b4cd89c4cd89d4cd8",
		"c07d9fbc74a9b368bbb05fcaac59d1a855d6a653d6a350d6a14dd59e4bd69d4ad79b4ad79b4ad79c4bd89d4cd89d4bd8",
		"c78a8ebe7aa6b76ebbb362c9b05dd0af59d3aa55d3a551d5a04dd59e4dd49d4bd49c49d69c49d69b49d79b4ad79e4cd9",
		"ca8f8ac17fa4bb72b8b868c5b561cfb15dcfac57d3aa55d39e4dd49e4cd49c4ad49b48d19a47d39a47d39b48d59b49d7",
		"ce9589c584a2bf77b7bb6cc4b867c7b966c9ba65c7b059cba953cda14dd09b48d19a46d19a46d29946d29946d49945d6",
		"d09c84c9899dc37cb3c072c0be6ac6ba65c7b960c5b55bc4b258c4aa53c89945cf9844cf9844cf9743ce9643d09743d4",
		"d4a282cd9096c681aec576bbc36ec1bf66c4b85ec4b258c4b258c2b258c29641cb9641cb9741cc943fcd933ecd933ecf",
		"d7a87dd09792cc87a7c87bb6c772bcc16abdb960beb258c0b258bfa950bd923cc4943ec7943ec7913cc88f3acb8e39cd",
		"daaf7ad49e8cd18ca1ce80adcb76b5c46cb6bb60b9b157b8b157b9a047b78f39bb903ac1913bc38d38c38b36c68a35c9",
		"ddb574d9a589d5939ad284a6cf78abc86daebc61b0b156b2aa4fb1943bb19039b58f39bb8c35be8933bf8631c1842fc3",
		"e0bc6fdcaa81d99892d6899ed37aa3ca6ea5bd5fa9af52aba348aa953eaf9238b38c34b78730b7832bb97f29bc7e27bf",
		"deb179deae7cdc9d89da8d95d67e98ca6f9abb5d9fac4fa39d42a59439a98c33ac862eaf8129b37d24b47822b77c26bb",
		"deae7cdea483dfa083de908ad9808ecb6e90b85a95a74b99983d9c8b32a18229a47d23a9761eab741caf7821b37822b7",
		"dea681dfa083de9886dc8c88da8084ca6c86b454899f438e8d3393802699761d9d6e19a2751ea9751dad741caf7720b3",
		"dfa083df9c85dd9185da8084d27685c16485ac4f8094398580288c711c90751e9a721ba06e19a2731caa741cae741caf",
		"df9e84dd9384da8084d67b84c66a83ac4f80973d82862e80741e8577218b711c90721c9b701aa16e19a2721baa741cae",
	],
	F: [
		"b998eca989e98b6ee4866ae4745be25543de483bde3b35de3a34db4235db4635da4d35d75135d65135d55534cc5733c8",
		"bb9aecb796eba687e88b6ee48166e46f57e15543de483add4537db4635da4e36d85036d65135d55534cd5733c85733c7",
		"c6a6ecbb9aecb292eaa282e78b6ee4775de3654de05940de523adb5137da5036d85135d55634ce5734ca5733c75a32c4",
		"d1b3edc5a5ecbb9aecaa8ae99678e48766e47857e16b48e0623fdc5d39d95c37d65a36d15734cd5733c75c33c55c31c0",
		"d9baefd1b3edc3a1ebb391eaa580e99570e58860e47c52e17346dd6c3eda683ad86537d46336ce6034c85c31c05f32be",
		"e2c5f1d8b7efcba7ecbe98ebae87e9a378e69669e48358e27446dc7643da753dd9703bd46c39d06936c96333c05f31b9",
		"e4c8f2d9bbf0ceaceec39debb890eaad83e89c70e59669e47643da7640da753ed77a3dd6783bd27238ca6d36c36933bb",
		"e6c9f3ddbff1d3b2f0c9a4ecc496ebbf92eabd8ce8ba87e69d6ae2844ddb7a3dd6823fd5843ed47e3cce7939c67436c0",
		"e7ccf2dfc2f2d7b6f0cda8eec59becc090eaba87e6bb85e8b881e7a46be28b45d89146d89146d88a40d2833ecc7f3ac5",
		"e8cff4e2c5f3dbbbf1d2adf0cca2eec496ecbf88eab881e7bc84e8bc85e89e53dc9e52dc9e4fdc9a49d89346d38f44cd",
		"e9d0f4e5c9f3ddbdf2d7b2f0d0a7f0ca9cedc591eabf87e9bf89e9c18be9b16ee3ab62e1ac61e1aa5cdfa759dca355db",
		"ead4f6e7ccf4e0c1f2dbb8f1d5aef0d0a4efcb9becc794eac794eac794eac28ae8b979e6b775e5b470e4b26ce2b06ae1",
		"ebd8f7e8d1f6e2c8f4dec0f2dab7f2d7aef1d1a7f0cea1eccda0eccb9decc896ebc28ae8be85e8bc80e7bb7ee6ba7ae6",
		"ebddf7e8d7f6e5cff6e0c6f4debff2dab9f2d6b2f1d3abefd1a8efcea0edc99aecc795eac591eac38de9c289e8c087e8",
		"e9daf6e8daf6e5d5f6e2cdf4dfc6f2ddc0f2d9b9f2d8b2f1d2aef0d0a7efcea3eecc9eedc99becc798eac693eac38ce9",
		"e8daf6e6d7f6e6d7f6e3d1f6e0caf3dec3f3dabef1d7b9f2d4b4f1d3adf2d1aaf0cea5edcca1edc99cecc798ebc693ea",
		"e7d8f6e6d7f6e4d4f6e2cff5dfcbf4ddc6f3dbc0f3d8bbf1d5b6f2d3b0f2d0adf0cea9efcca3edca9eecc99cecc798eb",
		"e6d7f6e5d6f6e3d1f5dfcbf4dec8f4dcc4f3dbc0f3d8bbf1d6b6f1d3b2f1d1aef0cfabf0cea9efcba2edca9decc99cec",
		"e6d6f6e3d2f5dfcbf4decaf4ddc6f3dbc0f3d9bcf1d7baf0d5b7f1d5b5f1d3b2f1d0adf0ceaaefcea9efcba1edc99dec",
	],
	G: [
		"be92b1bb88a6b67792b87590bd6f8ac26681c9627bca5e78d75972dd5867e4545bea5152ed4f4eee4f50eb4e4ee94d4e",
		"bf94b3be90b0bb87a4b67792ba738ec06e87c26681cf6077dc5b69e4545be95152ec4e4cee4f50eb4e4eea4d4ee94d4e",
		"cea0c4bf94b3bc8cacbb83a0b67792bf6f89ca6a7fd66372e15c63e75454eb4e49ee4f50ec4e4dea4e4ee94d4ee84b4c",
		"deaed6cd9fc2bf94b3b985a5be7c97ca738ad46c7ede656fe35e60e85751eb5045ec4e4aeb4e4de94d4ee84b4be74a4b",
		"e8b4dcdeaed6cb9abec58aa8c98097d3788bda707fe16a6fe66260ea5a52ec5345eb4c41eb4d46e94b49e74a4be74948",
		"f4bee8e4b0d6d49dbdd090aad4849adb7b8bdd7480e06c74e7615eeb5e55ed5949ec513eeb4a3de94a41e84844e64848",
		"f4bbe3e9b0d6dca1c1d895acd98b9fdc8394dc7886dd7480eb5e55ec5c4fec5848ee5944ea4a36e94838e8473ce7463f",
		"f4b9e1efb2d4e5a3c2e298aee690a2e78c99eb878eea8489ea7374ee6257ee5944ee5844ef5d48ec4a36ea4732e84736",
		"f6b9ddf2b1d2eca6c0eb9ab0ed92a0ec8a94ea8489ef8387f28082f0736eee5e4cef6150f06250ee5e4bed5942ea4932",
		"f7b7d9f4b0cef2a6c2f19cb2f195a2f18b95f1868af28082f28182f18183ee6457ee6557ef6558ed6152ec5c4ceb5945",
		"f5b1d4f6adcaf4a6bdf49db0f496a2f48e99f1878bf18283f08184ee7c80eb6964ec675dec675ceb6358ea5e52ea5a4d",
		"f4adccf3a8c4f2a3b8f29aadf194a0f18b97ef868eee8287ef8287ea7982e76d74e96a68ea6963e9645fe86058e75c55",
		"f2a8c9f2a3c1f09eb5f097abef92a3ef8b99ef8592ee818bea7e8ae47484e5717de76d74e7696ce46667e56061e35d5c",
		"f0a5c7f0a1c1ee9cb6ef96adee90a6ed8a9deb8697ea8090e67c8ee47787e47280e46e7ae36974e2656ee16168e25e63",
		"eea1c4eb9dc3ea98baea93b2e98daae789a3e5849de67e97e27b92e3768be07286df6d80e0697adf6575df616fe16069",
		"eb9dc3e999bee695bce48fb8e38bb1e286abe182a4e07e9ddf7a97df7591dd718bdb6d87dc6981db657bde6475df616f",
		"e999bfe695bce592bae38eb7e089b6de85b1dd80a9db7da2db789dda739ada7092d86c8cda6a84dc677edb657bdd6375",
		"e695bce694bbe490b9e089b6df87b4dd83b0d97cafd778aad674a5d4719fd87096d96e8fd86c8cda6882db667cdb657b",
		"e694bce490b9e089b6e088b5dd84b2d97cafd678add274afd072aad372a5d4719fd76f94d86d8ed86c8cda6881db667c",
	],
};

/** Which state shows on film frame f (1-frame recolours f245, f249, f252, f256,
 * f260, f263, f267 as the knob scrubs). */
const HUE_STEPS = [
	[241, "A"],
	[245, "B"],
	[249, "C"],
	[252, "D"],
	[256, "E"],
	[260, "F"],
	[263, "G"],
	[267, "A"],
];
const hueState = (f, steps) => {
	let s = steps[0][1];
	for (const [at, n] of steps) if (f >= at) s = n;
	return s;
};
const hexRgb = (h) => [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));

/** Mesh fill: grid cells (+2 clamped cells of margin) under a Gaussian blur. */
function MeshCells({ rows, x, y, w, h, blur }) {
	const ny = rows.length;
	const nx = rows[0].length / 6;
	const cw = w / nx;
	const ch = h / ny;
	const out = [];
	for (let j = -2; j < ny + 2; j++) {
		const row = rows[Math.min(ny - 1, Math.max(0, j))];
		for (let i = -2; i < nx + 2; i++) {
			const ci = Math.min(nx - 1, Math.max(0, i)) * 6;
			out.push(
				<rect
					key={`${i},${j}`}
					x={x + i * cw - 0.5}
					y={y + j * ch - 0.5}
					width={cw + 1}
					height={ch + 1}
					fill={rgbs(hexRgb(row.slice(ci, ci + 6)))}
				/>,
			);
		}
	}
	return <g filter={blur}>{out}</g>;
}

const MARK_HEX = [
	[192, 0],
	[384, 115],
	[384, 345],
	[192, 460],
	[0, 345],
	[0, 115],
];

/** Mark rises 360 -> 308 (centre y): 22 px on f243 then x0.75/frame
 * (338 f243, 323.5 f245, 315 f248, 310 f252, 308 f257). */
const hueMarkY = (f) =>
	f < 242 ? 360 : 308 + 14 * Math.exp(-(f - 242) * 2.3) + 38 * 0.75 ** (f - 242);
/** Halo ring: half-width 191 f242, 230, 260, 283, 301, 316 f247, 337 f249,
 * 362 f256 -> 144 + 221 (1 - 0.78^(f-241)); line ~4 px, brightness 20 f242
 * decaying x0.78/frame to a faint floor (1-2 levels) that lingers to f268. */
const haloHalf = (f) => 144 + 221 * (1 - 0.78 ** (f - 241));
/** Slider bar top: 735.5 f242 (only the knob's hover disc peeks in, y 709+),
 * 696 f243, ease-out (power 2.45, fit) to 620 by f249
 * (668, 648, 634, 626, 621 measured). */
const sliderTop = (f) => {
	if (f < 243) return lerp(735.5, 696, clamp01(f - 242));
	const p = clamp01((f - 243) / 6);
	return 696 - 76 * (1 - (1 - p) ** 2.45);
};
/** Knob centre x: 560 f243, 605 f245, 653 f248, 693.5 f252, 718.5 f256, 741.5
 * f263, 749.5 f268 -> 755 - 195 * 0.875^(f-243). */
const knobX = (f) => 755 - 195 * 0.875 ** (f - 243);

function HueScrubView({ cfg, f }) {
	const W = cfg.width ?? 288;
	const H = (W * 460) / 384;
	const cx = cfg.cx ?? 639.5;
	const cy = hueMarkY(f);
	const R = cfg.radius ?? 18;
	const g = markGeometry({ width: W, variant: "main", radius: R, pad: 0 });
	const ox = cx - W / 2;
	const oy = cy - H / 2;
	const area = [g.outer.d, ...g.inner.map((i) => i.d)].join(" ");
	const mesh = cfg.mesh ?? HUE_MESH;
	const rows = mesh[hueState(f, cfg.steps ?? HUE_STEPS)] ?? mesh.A;
	const id = cfg.id;
	const showHalo = f >= 242;
	const hh = haloHalf(f);
	const halo = showHalo
		? roundedPath(MARK_HEX, R, (2 * hh) / 384, cx - hh, cy - hh * (460 / 384))
		: null;
	const haloA = showHalo ? Math.max(0.085 * 0.78 ** (f - 242), 0.006) : 0;
	const st = sliderTop(f);
	const sx0 = cfg.sliderX0 ?? 458;
	const sx1 = cfg.sliderX1 ?? 821;
	const sh = 17;
	const kx = knobX(f);
	const ky = st + sh / 2;
	return (
		<svg width={1280} height={720} style={ABS}>
			<defs>
				<clipPath id={`${id}-c`}>
					<path d={area} clipRule="evenodd" transform={`translate(${ox} ${oy})`} />
				</clipPath>
				<filter
					id={`${id}-b`}
					filterUnits="userSpaceOnUse"
					x={ox - 60}
					y={oy - 60}
					width={W + 120}
					height={H + 120}
				>
					<feGaussianBlur stdDeviation={cfg.meshBlur ?? 9} />
				</filter>
				<filter id={`${id}-n`} x="0" y="0" width="1" height="1">
					<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={7} />
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<linearGradient id={`${id}-r`} x1={0} y1={0} x2={1} y2={0}>
					{RAINBOW.map((c, i) => (
						<stop key={i} offset={i / 6} stopColor={rgbs(c)} />
					))}
				</linearGradient>
			</defs>
			{halo ? (
				<path
					d={halo.d}
					fill="none"
					stroke={`rgba(255,255,255,${haloA.toFixed(4)})`}
					strokeWidth={4.5}
				/>
			) : null}
			<g clipPath={`url(#${id}-c)`}>
				<MeshCells rows={rows} x={ox} y={oy} w={W} h={H} blur={`url(#${id}-b)`} />
				<rect
					x={ox}
					y={oy}
					width={W}
					height={H}
					filter={`url(#${id}-n)`}
					opacity={cfg.grain ?? 0.1}
					style={{ mixBlendMode: "overlay" }}
				/>
			</g>
			{f >= 242 ? (
				<g>
					<rect x={sx0} y={st} width={sx1 - sx0} height={sh} rx={sh / 2} fill={`url(#${id}-r)`} />
					<circle cx={kx} cy={ky} r={36} fill="rgba(255,255,255,0.2)" />
					<circle cx={kx} cy={ky} r={15} fill={rgbs(Q.pure)} />
				</g>
			) : null}
		</svg>
	);
}

/** Hue wheel, the slider's stops (f256 samples: red 458, yellow ~515, green
 * ~563, cyan ~635, blue ~695, magenta ~755, red 821). */
const RAINBOW = [
	[255, 0, 0],
	[255, 255, 0],
	[0, 255, 0],
	[0, 255, 255],
	[0, 0, 255],
	[255, 0, 255],
	[255, 0, 0],
];

/** The cursor rides the knob: tip on the knob centre (f256: tip 718.75,627.5,
 * knob 718.5,628.5). */
const hueCursor = (f) => (f < 242 ? null : [knobX(f) + 0.5, sliderTop(f) + 7.5]);

// ── registry ──────────────────────────────────────────────────────────────

export const S2_PRESETS = {
	"maple-wire-closeup": {
		note: "s2 f121-f180: extreme close-up of the mark's lower half as a grey wireframe on black. Strokes draw on f120-f125, one decelerating push-in (scale 1 -> 1.505 about 640.5,590, measured), white anchor dots pop f129-f132, every corner splits into a growing fillet f151-f170. Curves on the film-frame clock from frame0.",
		nativeMs: 2000,
		params: {
			frame0: ["number", "121", "film frame of the scene's first frame"],
			lineWidth: ["number", "3", "stroke px"],
			shiftY: ["number", "24", "framing offset px (keeps the inner fillet in frame)"],
			innerRadius: ["number", "0.22", "inner fillet as a fraction of the outer"],
			lineBright: ["array", "[255,255,255]", "stroke grey at the upper left"],
			lineDim: ["array", "[104,104,104]", "stroke grey at the lower right"],
			dotSize: ["number", "11.5", "anchor dot diameter px"],
		},
		render: (cfg, t) =>
			live(cfg, t) ? <WireCloseupView key={cfg.id} cfg={cfg} f={frameOf(cfg, t, 121)} /> : null,
	},
	"maple-node-mark": {
		note: "s2 f181-f240: whole mark, white outline + blue anchor nodes on every fillet, decelerating pull-back (403 -> 294 px). Cursor flies in expo-out from the lower right, click f187 = navy fill, hatch sweeps lower-right -> upper-left f198-f212, cursor whips out of the top f207-f215 with motion blur.",
		nativeMs: 2000,
		params: {
			frame0: ["number", "181", "film frame of the scene's first frame"],
			fill: ["array", "[6,61,108]", "fill colour after the click"],
			hatchColour: ["array", "[45,145,224]", "hatch line colour"],
			radius: ["number", "14.6", "fillet radius, mark units"],
			nodeSize: ["number", "11", "anchor node diameter px"],
			cursorSize: ["number", "100", "ArrowCursor size, free (held = x0.75-0.8)"],
			tipOffset: ["array", "[-6,-8]", "cursor tip calibration px"],
		},
		render: (cfg, t) =>
			live(cfg, t) ? <NodeMarkView key={cfg.id} cfg={cfg} f={frameOf(cfg, t, 181)} /> : null,
	},
	"maple-hue-scrub": {
		note: "s2 f241-f268: the mark as a mesh-gradient fill (true-hole knockout), a faint halo ring expanding and fading, the mark rising 52 px while a rainbow hue slider rises from below; the cursor drags the knob right (expo-out) and the fill jumps to a new gradient state every 3-4 frames.",
		nativeMs: 934,
		params: {
			frame0: ["number", "241", "film frame of the scene's first frame"],
			width: ["number", "288", "mark width px"],
			radius: ["number", "18", "fillet radius, mark units"],
			mesh: ["object", "HUE_MESH", "{name: [row strings of rrggbb cells]} fill states"],
			steps: ["array", "HUE_STEPS", "[[film frame, state name], ...] recolour schedule"],
			grain: ["number", "0.1", "film-grain overlay opacity"],
			cursorSize: ["number", "100", "ArrowCursor size, free (held = x0.75-0.8)"],
		},
		render: (cfg, t) => {
			if (!live(cfg, t)) return null;
			const f = frameOf(cfg, t, 241);
			return (
				<React.Fragment key={cfg.id}>
					<HueScrubView cfg={cfg} f={f} />
					<BlurCursor
						path={hueCursor}
						f={f}
						size={cfg.cursorSize ?? 106}
						scale={0.75}
						shutter={0.15}
					/>
				</React.Fragment>
			);
		},
	},
};
