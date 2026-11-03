/**
 * juniper-s1.jsx — section 1 presets: 0 – 3.933 s (f0–f117 on the 30fps clock).
 *
 * The opener: a title stack ("Introducing Juniper Max", two subtitle lines, a
 * small "Powered by [tile] native code" row) over a trio of phones cropped by
 * the frame bottom, ending on an accelerating push-in that a hard cut ends.
 *
 * Every curve below was traced frame by frame off the reference
 * (ref/f720/fNNNNN.jpg, frame n = n/30 s; numbers in stage px), see
 * .demo-build/nightly/2026-11-03/juniper/sections/s1/notes.md. Tables are
 * [frame, value] pairs relative to an anchor `atMs`, so a retimed beat only
 * moves its anchor.
 *
 *   juniper-title-stack   the four text rows + their entries + the push-in
 *   juniper-phone-trio    three phones settling up, a slow drift, the push-in
 *   juniper-cursor-streak the arrow cursor streaking in on the last frames
 */
import {
	AppTile,
	ArrowCursor,
	FONT,
	GradientText,
	Icon,
	live,
	localMs,
	PhoneFrame,
	Q,
	rgbs,
	ScreenSlot,
} from "./juniper-shared.jsx";

const FRAME_MS = 1000 / 30;

/** Baseline of a line box with line-height = font size (Segoe UI: ascent 1.079, descent 0.251). */
const BASE = 0.914;

/** Piecewise-linear lookup in a [[k, v], ...] table (k ascending); clamps at both ends. */
function tab(points, k) {
	if (!points || !points.length) return 0;
	if (k <= points[0][0]) return points[0][1];
	for (let i = 1; i < points.length; i++) {
		const [k1, v1] = points[i];
		if (k <= k1) {
			const [k0, v0] = points[i - 1];
			return v0 + ((v1 - v0) * (k - k0)) / Math.max(1e-6, k1 - k0);
		}
	}
	return points[points.length - 1][1];
}

/** Frames (30fps clock, fractional) since an anchor, from a scene-relative ms. */
const framesSince = (ms, atMs) => (ms - atMs) / FRAME_MS;

// ── the push-in (shared by the text stack and the phones) ─────────────────

/**
 * Normalised push curve over 14 frames (f103 -> f117). Mean of three
 * independently traced channels (scale from the subtitle width and the left
 * phone's outer edge, text dy, phone dy), each divided by its f117 value:
 * f105 .01, f107 .045, f109 .09, f111 .17, f113 .305, f115 .54, f116 .73,
 * f117 1. Successive ratios ~1.35/frame at the end: an accelerating push that
 * the hard cut at f118 interrupts at full speed.
 */
export const S1_PUSH_CURVE = [
	[0, 0],
	[1, 0.002],
	[2, 0.01],
	[3, 0.022],
	[4, 0.045],
	[5, 0.067],
	[6, 0.09],
	[7, 0.125],
	[8, 0.17],
	[9, 0.233],
	[10, 0.305],
	[11, 0.405],
	[12, 0.54],
	[13, 0.73],
	[14, 1],
];

/**
 * Push state at a scene ms: both groups scale about (originX, originY) by
 * 1 -> scale (1.0885 at f117, from the subtitle width 767 -> 835 and the left
 * phone edge 94 -> 46 about x=640) and translate by dy * g. The text stack goes
 * UP (dy -72) and the phones go DOWN (dy +87): the push opens the gap between
 * them, it is not one rigid transform (measured: centre-phone top 310 -> 393
 * while subtitle line 1 goes 150 -> 60).
 */
function pushAt(push, ms) {
	if (!push) return { g: 0, s: 1, dy: 0 };
	const k = framesSince(ms, push.atMs ?? 0) * (14 / Math.max(1, (push.durMs ?? 467) / FRAME_MS));
	const g = k <= 0 ? 0 : tab(push.curve ?? S1_PUSH_CURVE, k);
	return { g, s: 1 + ((push.scale ?? 1.0885) - 1) * g, dy: (push.dy ?? 0) * g };
}

/**
 * Directional motion blur: an SVG Gaussian with separate x / y deviations,
 * referenced from a CSS filter. sigma = k * max(0, speed - free) in px per
 * frame; measured on the centre phone's top edge: f114 ~0, f116 ~2.5,
 * f117 ~4.5 px edge spread (speed 11 / 17 / 23 px per frame).
 */
function blurDefs(id, sx, sy) {
	if (sx < 0.05 && sy < 0.05) return null;
	return (
		<svg width={0} height={0} style={{ position: "absolute" }} aria-hidden="true">
			<filter id={id} x="-20%" y="-20%" width="140%" height="140%">
				<feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} />
			</filter>
		</svg>
	);
}
const blurOf = (k, free, v) => Math.max(0, k * (Math.abs(v) - free));

// ── juniper-title-stack ───────────────────────────────────────────────────

/** Title "Introducing Rork Max": invisible at f0, opacity +0.2/frame to 1 at f5 (ink sum 0 .19 .39 .60 .80 1.0). */
export const TITLE_FADE = [
	[0, 0],
	[5, 1],
];
/** Title rise: band top 146 132 120 109 101 94 88 83 79 76 73 71 69 69 68 (f1–f15), rest 68 -> px below rest. */
export const TITLE_RISE = [
	[0, 92],
	[1, 78],
	[2, 64],
	[3, 52],
	[4, 41],
	[5, 33],
	[6, 26],
	[7, 20],
	[8, 15],
	[9, 11],
	[10, 8],
	[11, 5],
	[12, 3],
	[13, 1],
	[15, 0],
];
/** Subtitle 1 opacity from f20: ink sum .04 .09 .15 .23 .30 .39 .49 .58 .69 .81 (f21–f30), then a slow tail to 1 by ~f42. */
export const SUB1_FADE = [
	[0, 0],
	[1, 0.04],
	[2, 0.09],
	[3, 0.15],
	[4, 0.23],
	[5, 0.3],
	[6, 0.39],
	[7, 0.49],
	[8, 0.58],
	[9, 0.69],
	[10, 0.81],
	[11, 0.82],
	[12, 0.85],
	[13, 0.87],
	[14, 0.89],
	[15, 0.91],
	[16, 0.93],
	[17, 0.95],
	[20, 0.99],
	[22, 1],
];
/** Subtitle 1 rise from f21: top 188 183 179 176 174 171 168 166 164 162 161 159 158 156 155 154 153 … 150 (f45). */
export const SUB1_RISE = [
	[0, 43],
	[1, 38],
	[2, 33],
	[3, 29],
	[4, 26],
	[5, 24],
	[6, 21],
	[7, 18],
	[8, 16],
	[9, 14],
	[10, 12],
	[11, 11],
	[12, 9],
	[13, 8],
	[14, 6],
	[15, 5],
	[16, 4],
	[17, 3],
	[19, 2],
	[21, 1],
	[24, 0],
];
/** Subtitle 2 opacity from f36: decelerating, .09 .18 .26 .33 .40 .45 .52 .56 .61 (f37–f45) … .79 f50, .91 f55, .97 f60. */
export const SUB2_FADE = [
	[0, 0],
	[1, 0.091],
	[2, 0.175],
	[3, 0.262],
	[4, 0.327],
	[5, 0.4],
	[6, 0.454],
	[7, 0.515],
	[8, 0.56],
	[9, 0.611],
	[10, 0.656],
	[11, 0.692],
	[12, 0.729],
	[13, 0.765],
	[14, 0.791],
	[15, 0.822],
	[16, 0.845],
	[17, 0.872],
	[18, 0.893],
	[19, 0.911],
	[20, 0.932],
	[22, 0.958],
	[24, 0.972],
	[27, 0.992],
	[30, 1],
];
/** Subtitle 2 rise from f36: top 258 252 246 241 237 233 229 226 223 220 217 215 213 211 209 207 206 204 … 197 (f63); ~x0.895/frame. */
export const SUB2_RISE = [
	[0, 68],
	[1, 61],
	[2, 55],
	[3, 49],
	[4, 44],
	[5, 40],
	[6, 36],
	[7, 32],
	[8, 29],
	[9, 26],
	[10, 23],
	[11, 20],
	[12, 18],
	[13, 16],
	[14, 14],
	[15, 12],
	[16, 10],
	[17, 9],
	[18, 7],
	[19, 6],
	[20, 5],
	[21, 4],
	[22, 3],
	[23, 2],
	[25, 1],
	[27, 0],
];
/**
 * "Powered by [tile] Swift": a per-word blur-in, one curve shifted per word
 * (k = frames after the row anchor f44). Opacity from the ink sum of
 * "Powered": .36 f50, .44 f52, .53 f54, .60 f56, .68 f58, .73 f60, .79 f62,
 * .84 f64, .89 f66, .92 f68, .95 f70, .98 f72; "by" is the same curve +4
 * frames, "Swift" +8 (checked: by .36 f54, .64 f60, .86 f68; Swift .45 f60,
 * .77 f68, .92 f74). Blur from the edge energy / ink ratio: ~.15 until f56,
 * .29 f60, .50 f64, .79 f68, .92 f72, 1 f76 for "Powered".
 */
export const ROW_FADE = [
	[0, 0],
	[2, 0.1],
	[4, 0.22],
	[6, 0.36],
	[8, 0.44],
	[10, 0.53],
	[12, 0.6],
	[14, 0.68],
	[16, 0.73],
	[18, 0.79],
	[20, 0.84],
	[22, 0.89],
	[24, 0.92],
	[26, 0.95],
	[28, 0.98],
	[30, 0.99],
	[34, 1],
];
export const ROW_BLUR = [
	[0, 6],
	[8, 5.2],
	[12, 4.4],
	[16, 3.3],
	[18, 2.6],
	[20, 1.8],
	[22, 1.2],
	[24, 0.7],
	[26, 0.45],
	[28, 0.28],
	[30, 0.12],
	[32, 0],
];
/** The tile body arrives late and nearly sharp: ink .12 f60, .22 f64, .41 f66, .58 f68, .75 f70, .92 f72, 1 f74 (k from f44). */
export const TILE_FADE = [
	[14, 0],
	[16, 0.12],
	[18, 0.14],
	[20, 0.22],
	[22, 0.41],
	[24, 0.58],
	[26, 0.75],
	[28, 0.92],
	[30, 1],
];
export const TILE_BLUR = [
	[16, 2.2],
	[22, 1.2],
	[26, 0.5],
	[29, 0],
];

const STACK_DEFAULTS = {
	lines: [],
	row: null,
	colour: Q.ink,
	push: null,
	blurK: 0.3,
	blurFree: 8,
};

/** Named measured tables, so a config can say "fade":"SUB1_FADE" instead of repeating numbers. */
const TABLES = {
	TITLE_FADE,
	TITLE_RISE,
	SUB1_FADE,
	SUB1_RISE,
	SUB2_FADE,
	SUB2_RISE,
	ROW_FADE,
	ROW_BLUR,
	TILE_FADE,
	TILE_BLUR,
};
const T = (v, d) => (typeof v === "string" ? (TABLES[v] ?? d) : (v ?? d));

/** One centred line: `text` plus an optional gradient tier word, its baseline at `baseline`. */
function StackLine({ line, colour, ms }) {
	const size = line.size ?? 46;
	const k = framesSince(ms, line.atMs ?? 0);
	const op = tab(T(line.fade, [[0, 1]]), k);
	const dy = tab(T(line.rise, [[0, 0]]), k);
	if (op <= 0.001) return null;
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				right: 0,
				top: (line.baseline ?? 100) - BASE * size,
				height: size,
				textAlign: "center",
				whiteSpace: "nowrap",
				// the font shorthand resets line-height, so it must come first
				font: `${line.weight ?? 400} ${size}px ${FONT}`,
				lineHeight: `${size}px`,
				letterSpacing: line.tracking ?? "-0.025em",
				color: rgbs(line.colour ?? colour),
				opacity: op,
				transform: `translateY(${dy.toFixed(2)}px)`,
			}}
		>
			{line.text}
			{line.tier ? (
				<>
					{" "}
					<GradientText>{line.tier}</GradientText>
				</>
			) : null}
		</div>
	);
}

/** The small credit row: words and one tile, each blurring in on its own delay. */
function StackRow({ row, colour, ms }) {
	const size = row.size ?? 23;
	const k0 = framesSince(ms, row.atMs ?? 0);
	if (k0 <= 0) return null;
	const fade = T(row.fade, ROW_FADE);
	const blur = T(row.blur, ROW_BLUR);
	const items = row.items ?? [];
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				right: 0,
				top: (row.baseline ?? 282) - BASE * size,
				height: size,
				display: "flex",
				justifyContent: "center",
				alignItems: "flex-start",
				gap: row.gap ?? 7,
				font: `${row.weight ?? 400} ${size}px ${FONT}`,
				lineHeight: `${size}px`,
				letterSpacing: row.tracking ?? "0em",
				color: rgbs(row.colour ?? colour),
				whiteSpace: "nowrap",
			}}
		>
			{items.map((it, i) => {
				const k = k0 - (it.delay ?? 0);
				if (it.tile) {
					const ts = it.tile.size ?? 26;
					const top = BASE * size - (it.tile.above ?? 21);
					const tOp = tab(T(it.tile.fade, TILE_FADE), k0);
					const tBl = tab(T(it.tile.blur, TILE_BLUR), k0);
					// before the body lands, its glyph shows faintly in the tile colour (ref f52–f62)
					const gOp = Math.min(0.35, tab(fade, k)) * (1 - tOp);
					return (
						<span
							key={`t${i}`}
							style={{
								position: "relative",
								width: ts,
								height: ts,
								marginTop: top,
								marginLeft: it.ml ?? 0,
								flex: "0 0 auto",
							}}
						>
							{gOp > 0.003 ? (
								<span
									style={{
										position: "absolute",
										inset: 0,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										opacity: gOp,
										filter: `blur(${tab(blur, k).toFixed(2)}px)`,
									}}
								>
									<Icon
										name={it.tile.icon ?? "code"}
										size={ts * 0.62}
										colour={it.tile.bg}
										stroke={2.4}
									/>
								</span>
							) : null}
							{tOp > 0.003 ? (
								<span
									style={{
										position: "absolute",
										inset: 0,
										opacity: tOp,
										filter: tBl > 0.05 ? `blur(${tBl.toFixed(2)}px)` : "none",
									}}
								>
									<AppTile
										size={ts}
										bg={it.tile.bg}
										icon={it.tile.icon ?? "code"}
										radius={it.tile.radius ?? 0.24}
									/>
								</span>
							) : null}
						</span>
					);
				}
				const op = tab(fade, k);
				const bl = tab(blur, k);
				return (
					<span
						key={`w${i}`}
						style={{
							display: "inline-block",
							marginLeft: it.ml ?? 0,
							opacity: op,
							filter: bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : "none",
						}}
					>
						{it.text}
					</span>
				);
			})}
		</div>
	);
}

function renderTitleStack(cfg, t) {
	if (!live(cfg, t)) return null;
	const c = { ...STACK_DEFAULTS, ...cfg };
	const ms = localMs(cfg, t);
	const push = c.push ? { dy: -72, originX: 640, originY: 360, ...c.push } : null;
	const p = pushAt(push, ms);
	const p0 = pushAt(push, ms - FRAME_MS);
	// speed measured at the subtitle (y ~200) and at the frame's side edge (x ~560 from centre)
	const ref = c.blurY ?? 200;
	const oy = push?.originY ?? 360;
	const vy = p.dy - p0.dy + (p.s - p0.s) * (ref - oy);
	const vx = (p.s - p0.s) * 560;
	const fid = `s1-stack-blur-${cfg.id ?? "x"}`;
	const sy = blurOf(c.blurK, c.blurFree, vy);
	const sx = blurOf(c.blurK, c.blurFree, vx);
	const defs = blurDefs(fid, sx, sy);
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				transform: p.g > 0 ? `translateY(${p.dy.toFixed(3)}px) scale(${p.s.toFixed(5)})` : "none",
				transformOrigin: `${push?.originX ?? 640}px ${oy}px`,
				filter: defs ? `url(#${fid})` : "none",
			}}
		>
			{defs}
			{c.lines.map((line, i) => (
				<StackLine key={line.key ?? i} line={line} colour={c.colour} ms={ms} />
			))}
			{c.row ? <StackRow row={c.row} colour={c.colour} ms={ms} /> : null}
		</div>
	);
}

// ── juniper-phone-trio ────────────────────────────────────────────────────

const TRIO_DEFAULTS = {
	// measured rest at f103: centre body x488–791 (304 wide), top 310;
	// sides x94–389 / x890–1185 (296 wide), top 363. Settle residuals at f0
	// (82 / 76 / 58 px) decay x0.877 / x0.88 / x0.89 per frame.
	phones: [],
	anchorMs: 3433.3,
	driftPxPerS: 8.7,
	// the rim reads dark copper in this beat (sampled [110,66,46] at f80), not the bright orange of 9.0s
	rim: [112, 68, 48],
	rimHi: [168, 116, 84],
	rimLo: [74, 44, 32],
	push: null,
	blurK: 0.3,
	blurFree: 8,
};

function renderPhoneTrio(cfg, t) {
	if (!live(cfg, t)) return null;
	const c = { ...TRIO_DEFAULTS, ...cfg };
	const ms = localMs(cfg, t);
	const push = c.push ? { dy: 87.4, originX: 640, originY: 360, ...c.push } : null;
	const settleTop = (ph, m) => {
		const f = Math.max(0, m / FRAME_MS);
		const drift = (c.driftPxPerS * Math.max(0, c.anchorMs - Math.min(m, c.anchorMs))) / 1000;
		return (ph.top ?? 310) + drift + (ph.amp ?? 0) * (ph.decay ?? 0.88) ** f;
	};
	const p = pushAt(push, ms);
	const p0 = pushAt(push, ms - FRAME_MS);
	const oy = push?.originY ?? 360;
	// speed of the reference phone's top edge (settle + drift + push)
	const ref = c.phones[c.blurPhone ?? 1] ?? c.phones[0];
	let vy = 0;
	if (ref) {
		const y1 = oy + p.s * (settleTop(ref, ms) - oy) + p.dy;
		const y0 = oy + p0.s * (settleTop(ref, ms - FRAME_MS) - oy) + p0.dy;
		vy = y1 - y0;
	}
	const vx = (p.s - p0.s) * 560;
	const fid = `s1-trio-blur-${cfg.id ?? "x"}`;
	const sy = blurOf(c.blurK, c.blurFree, vy);
	const sx = blurOf(c.blurK, c.blurFree, vx);
	const defs = blurDefs(fid, sx, sy);
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				transform: p.g > 0 ? `translateY(${p.dy.toFixed(3)}px) scale(${p.s.toFixed(5)})` : "none",
				transformOrigin: `${push?.originX ?? 640}px ${oy}px`,
				filter: defs ? `url(#${fid})` : "none",
			}}
		>
			{defs}
			{c.phones.map((ph, i) => {
				const w = ph.width ?? 304;
				return (
					<div
						key={ph.key ?? i}
						style={{
							position: "absolute",
							left: (ph.cx ?? 640) - w / 2,
							top: settleTop(ph, ms),
						}}
					>
						<PhoneFrame
							width={w}
							rim={c.rim}
							rimHi={c.rimHi}
							rimLo={c.rimLo}
							shadow={ph.shadow ?? true}
						>
							<ScreenSlot
								label={ph.label ?? "product UI"}
								face={ph.face ?? null}
								tone={ph.tone ?? "dark"}
							/>
						</PhoneFrame>
					</div>
				);
			})}
		</div>
	);
}

// ── juniper-cursor-streak ─────────────────────────────────────────────────

/**
 * The arrow cursor that flies in over the last frames before the cut (it is
 * the next beat's pointer, travelling up-left to the toggle pill): tip at
 * (870,680) f116, (792,642) f117, (688,578) f118, (613,527) f119. Drawn with
 * a smear — `trail` copies spread over the last `shutter` frames of travel.
 */
function renderCursorStreak(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const keys = cfg.keys ?? [];
	if (keys.length < 2) return null;
	const posAt = (m) => {
		if (m <= keys[0].at) return keys[0];
		for (let i = 1; i < keys.length; i++) {
			if (m <= keys[i].at) {
				const a = keys[i - 1];
				const b = keys[i];
				const u = (m - a.at) / Math.max(1e-6, b.at - a.at);
				return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
			}
		}
		return keys[keys.length - 1];
	};
	const n = cfg.trail ?? 6;
	const shutter = (cfg.shutter ?? 0.5) * FRAME_MS;
	const size = cfg.size ?? 64;
	const out = [];
	for (let i = 0; i < n; i++) {
		const u = n === 1 ? 1 : i / (n - 1);
		const q = posAt(ms - shutter * (1 - u));
		out.push(
			<ArrowCursor key={i} x={q.x} y={q.y} size={size} opacity={(cfg.opacity ?? 1) * (1.6 / n)} />,
		);
	}
	return <>{out}</>;
}

// ── registry ──────────────────────────────────────────────────────────────

export const S1_PRESETS = {
	"juniper-title-stack": {
		note: "The opener's centred title stack: `lines` (each {text, tier?, size, weight, baseline, atMs, fade, rise}: a headline that fades in fast while rising ~90 px, subtitle lines that rise in and darken) plus an optional credit `row` ({baseline, size, atMs, items:[{text}|{tile:{bg,icon}}], each with `delay` in frames}) whose words blur in one after another. `push` ({atMs, durMs, scale, dy}) is the accelerating push-in that ends the beat: scale about the frame centre plus an UPWARD drift, motion-blurred by speed. Tables are [frame, value] pairs after each anchor (30fps clock) or the name of a measured table (TITLE_FADE, SUB1_RISE, ...).",
		nativeMs: 3933,
		params: {
			lines: [
				"array",
				"[]",
				"rows of type: {text, tier, size, weight, baseline, atMs, fade, rise}",
			],
			row: [
				"object",
				"null",
				"credit row {baseline, size, atMs, gap, items:[{text, delay}|{tile:{bg,icon}, delay}]}",
			],
			push: ["object", "null", "{atMs, durMs:467, scale:1.0885, dy:-72} — omit for no push"],
			blurK: ["number", "0.3", "motion-blur sigma per px/frame of speed above blurFree (8)"],
		},
		render: renderTitleStack,
	},
	"juniper-phone-trio": {
		note: "Three phones in a row cropped by the frame bottom (centre one higher), rising into place on a per-phone exponential settle with a slow upward drift, then pushed in (scale about the frame centre plus a DOWNWARD drift, so the gap to the text above opens). Screens are product slots (label + optional face). Pair it with juniper-title-stack using the same push anchor.",
		nativeMs: 3933,
		params: {
			phones: [
				"array",
				"[]",
				"{cx, width, top (rest top at anchorMs), amp, decay (per frame), label, face, tone}",
			],
			anchorMs: ["number", "3433.3", "when the drift reaches the rest tops"],
			driftPxPerS: ["number", "8.7", "slow upward drift until anchorMs"],
			push: ["object", "null", "{atMs, durMs:467, scale:1.0885, dy:87.4}"],
		},
		render: renderPhoneTrio,
	},
	"juniper-cursor-streak": {
		note: "An arrow cursor streaking across the frame with a smear trail (several faint copies over the last part of a frame's travel). For a pointer that arrives at speed across a cut; keys are per frame.",
		nativeMs: 70,
		params: {
			keys: ["array", "[]", "[{at, x, y}] scene-relative ms, tip position"],
			size: ["number", "64", "ArrowCursor size"],
			trail: ["number", "6", "smear copies"],
			shutter: ["number", "0.5", "smear length in frames"],
		},
		render: renderCursorStreak,
	},
};
