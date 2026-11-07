/**
 * willow-s1.jsx — presets for willow section 1, the overture (film 0.000-12.208s).
 *
 * Measured off the Strawberry 1.0 launch film, full-decode frames f00000-f00292
 * at the 1280x720 stage (notes: .demo-build/nightly/2026-10-30/willow/sections/s1/notes.md).
 *
 * The type language of this section is ELASTIC: letters and lines enter with
 * squash-and-stretch (scaleY overshoots to ~1.066 while scaleX gives way, then
 * settles), newly typed letters "hop" (dip up ~0.09-0.16em and fall back), a
 * pastel highlight runs across freshly typed letters and hands back to ink, and
 * whole blocks re-lay by scale/slide. One general preset carries all of it
 * (willow-kinetic-type); the rest are the overture's grounds, character slots,
 * wordmark and the crew pill that hands over to S2.
 *
 * Every render is a pure function of t.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import { Avatar, FONT, Halftone, kf, live, localMs, rgbs, SERIF, W } from "./willow-shared.jsx";

// ── text measurement (canvas measureText carries the font's kerning) ───────

const MEASURE = new Map();
let CTX = null;
function measure(font, s) {
	const k = font + "|" + s;
	if (MEASURE.has(k)) return MEASURE.get(k);
	if (!CTX) CTX = document.createElement("canvas").getContext("2d");
	CTX.font = font;
	const w = CTX.measureText(s).width;
	MEASURE.set(k, w);
	return w;
}

/** Normalise `lines` (strings or [{text, colour}] spans) into letter records. */
function buildLetters(cfg) {
	const size = cfg.size ?? 100;
	const weight = cfg.weight ?? 650;
	const family = cfg.family ?? FONT;
	const style = cfg.italic ? "italic " : "";
	const font = `${style}${weight} ${size}px ${family}`;
	const ink = cfg.colour ?? W.ink;
	const lines = (cfg.lines ?? []).map((ln) => (typeof ln === "string" ? [{ text: ln }] : ln));
	const out = [];
	let li = 0,
		word = 0;
	lines.forEach((spans, lineIdx) => {
		const text = spans.map((s) => s.text).join("");
		const colours = [];
		spans.forEach((s) => {
			for (const _ of s.text) colours.push(s.colour ?? ink);
		});
		let prevSpace = true;
		let spaces = 0;
		[...text].forEach((ch, ci) => {
			const prefix = [...text].slice(0, ci).join("");
			const x = measure(font, prefix);
			const w = measure(font, prefix + ch) - x;
			if (ch === " ") {
				spaces++;
				prevSpace = true;
				return;
			}
			if (prevSpace && ci > 0) word++;
			prevSpace = false;
			out.push({ ch, x, w, ci, line: lineIdx, word, li: li++, spaces, colour: colours[ci] });
		});
		word++;
	});
	const lineInfo = lines.map((spans, i) => {
		const text = spans.map((s) => s.text).join("");
		return {
			width: measure(font, text),
			n: [...text].length,
			nSpaces: [...text].filter((c) => c === " ").length,
		};
	});
	return { letters: out, lineInfo, font, size, weight, family, style };
}

/** Resolve a letter-range spec to a predicate. */
function inRange(r, L) {
	if (r == null || r === "all") return true;
	if (typeof r === "string") {
		const [k, v] = r.split(":");
		const n = Number(v);
		if (k === "line") return L.line === n;
		if (k === "word") return L.word === n;
		return true;
	}
	if (Array.isArray(r)) return L.li >= r[0] && L.li <= r[1];
	if (typeof r === "object") {
		if (r.line != null && L.line !== r.line) return false;
		if (r.word != null && L.word !== r.word) return false;
		if (r.from != null && L.li < r.from) return false;
		if (r.to != null && L.li > r.to) return false;
		return true;
	}
	return true;
}

/** Per-letter time: explicit `times` (extrapolated by the last step) or at + k*step. */
function letterTime(spec, k) {
	if (spec == null) return -Infinity;
	if (typeof spec === "number") return spec;
	if (Array.isArray(spec.times) && spec.times.length) {
		const T = spec.times;
		if (k < T.length) return T[k];
		const step = spec.step ?? (T.length > 1 ? T[T.length - 1] - T[T.length - 2] : 0);
		return T[T.length - 1] + (k - T.length + 1) * step;
	}
	return (spec.at ?? 0) + k * (spec.step ?? 0);
}

/**
 * willow-kinetic-type — the overture's type engine.
 *
 * Layout: `lines` laid in a layout space whose origin is the first line's
 * baseline; each line centred on x=0 (align "centre") or starting at x=0
 * ("left"); `leading` px between baselines. Kerning comes from measureText.
 *
 * Block `keys` (scene-relative ms, kf): {x, y, s, sx, sy, rot, op, track, gap}
 * place the layout origin at screen (x,y) scaled by s. `track` adds px between
 * letters, `gap` adds px per space — both re-centre the line (plans' spread,
 * the line-2 word gaps at 11.0s).
 *
 * Per-letter channels:
 *   type   {at, step} | {times:[...]}  — letter k (in its range) appears then.
 *   hl     [{range, colour, on:{...}, off:{...} | dur}] — colour window per letter.
 *   pops   [{range, at:{...}, keys:[{at:τms, sy, dy(em)}], k}] — squash/stretch
 *          and hop curves on each letter's own clock; sx = sy^-k.
 *   slide  [{range, at, amp, tau0, tauStep}] — dx = amp*exp(-(t-at)/tau_i):
 *          letters arriving from the right, leftmost settling first (goals).
 *   groups [{range, keys:[{at, dx, dy, sx, sy, op}]}] — a range (line/word)
 *          moving as a unit, scaled about its own baseline centre.
 */
function KineticType(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const B = kf(cfg.keys ?? [{ at: 0 }], ms);
	const lay = buildLetters(cfg);
	// `cx` condenses the face horizontally (advances AND glyphs): Segoe UI is
	// ~6-9% wider than the reference's Inter Display at equal cap height.
	const cxf = cfg.cx ?? 1;
	if (cxf !== 1) {
		for (const L of lay.letters) {
			L.x *= cxf;
			L.w *= cxf;
		}
		for (const li of lay.lineInfo) li.width *= cxf;
	}
	const leading = cfg.leading ?? lay.size * 1.2;
	const align = cfg.align ?? "centre";
	const track = (B.track ?? 0) + (cfg.ls ?? 0) * (cfg.size ?? 100);
	const gap = B.gap ?? 0;
	const em = lay.size;

	// per-line effective width (with track/gap) for centring
	const gapOn = (line) => (cfg.gapLines ? cfg.gapLines.includes(line) : true);
	const lineW = lay.lineInfo.map(
		(li, i) => li.width + track * Math.max(0, li.n - 1) + (gapOn(i) ? gap * li.nSpaces : 0),
	);

	// per-range ordinal of each letter (k), computed per spec on demand
	const ordinal = (range, L) => {
		let k = 0;
		for (const M of lay.letters) {
			if (M === L) return k;
			if (inRange(range, M)) k++;
		}
		return k;
	};

	// group bboxes in layout space (for scale-about-centre)
	const groups = (cfg.groups ?? []).map((g) => {
		const members = lay.letters.filter((L) => inRange(g.range, L));
		return { g, members: new Set(members), v: kf(g.keys ?? [{ at: 0 }], ms) };
	});

	const typeSpecs = Array.isArray(cfg.type)
		? cfg.type
		: cfg.type
			? [{ range: "all", ...cfg.type }]
			: [];

	const els = [];
	for (const L of lay.letters) {
		// visibility (type-on)
		let visible = true;
		for (const ts of typeSpecs) {
			if (!inRange(ts.range ?? "all", L)) continue;
			const k = ordinal(ts.range ?? "all", L);
			if (ms < letterTime(ts, k)) visible = false;
		}
		if (!visible) continue;

		const lineOff = align === "centre" ? -lineW[L.line] / 2 : 0;
		let x = lineOff + L.x + track * L.ci + (gapOn(L.line) ? gap * L.spaces : 0);
		let y = L.line * leading;
		let sx = cxf,
			sy = 1,
			dx = 0,
			dy = 0,
			op = 1,
			sk = 0;
		let colour = L.colour;

		// highlight windows
		for (const h of cfg.hl ?? []) {
			if (!inRange(h.range, L)) continue;
			const k = ordinal(h.range, L);
			const on = letterTime(h.on, k);
			const off = h.off != null ? letterTime(h.off, k) : on + (h.dur ?? 167);
			if (ms >= on && ms < off) colour = h.colour;
		}

		// pops (letter's own clock)
		for (const p of cfg.pops ?? []) {
			if (!inRange(p.range, L)) continue;
			const k = ordinal(p.range, L);
			const t0 = letterTime(p.at, k);
			const v = kf(p.keys, ms - t0);
			const amp = p.amp ?? 1;
			if (v.sy != null) {
				const s = 1 + (v.sy - 1) * amp;
				sy *= s;
				sx *= Math.pow(s, -(p.k ?? 1));
			}
			if (v.dy != null) dy += v.dy * em * amp;
		}

		// slides
		for (const sl of cfg.slide ?? []) {
			if (!inRange(sl.range, L)) continue;
			const k = ordinal(sl.range, L);
			const tau = Math.max(1, (sl.tau0 ?? 40) + k * (sl.tauStep ?? 0));
			const amp = (sl.amp ?? 0) + k * (sl.ampStep ?? 0);
			const cur = ms < sl.at ? amp : amp * Math.exp(-(ms - sl.at) / tau);
			dx += cur;
			if (sl.skew && amp) sk += sl.skew * (cur / amp);
		}

		// groups: move/scale about the group's baseline centre
		for (const G of groups) {
			if (!G.members.has(L)) continue;
			const v = G.v;
			const mem = [...G.members];
			const gx0 = Math.min(
				...mem.map(
					(M) =>
						(align === "centre" ? -lineW[M.line] / 2 : 0) +
						M.x +
						track * M.ci +
						(gapOn(M.line) ? gap * M.spaces : 0),
				),
			);
			const gx1 = Math.max(
				...mem.map(
					(M) =>
						(align === "centre" ? -lineW[M.line] / 2 : 0) +
						M.x +
						M.w +
						track * M.ci +
						(gapOn(M.line) ? gap * M.spaces : 0),
				),
			);
			const gcx = (gx0 + gx1) / 2;
			const gcy = Math.max(...mem.map((M) => M.line * leading));
			const gsx = v.sx ?? 1,
				gsy = v.sy ?? 1;
			const lcx = x + L.w / 2;
			x = gcx + (lcx - gcx) * gsx - L.w / 2 + (v.dx ?? 0);
			y = gcy + (y - gcy) * gsy + (v.dy ?? 0);
			sx *= gsx;
			sy *= gsy;
			op *= v.op ?? 1;
			sk += v.skew ?? 0;
		}

		x += dx;
		y += dy;
		if (op <= 0.001) continue;
		const cx = x + L.w / 2;
		const xNat = cx - L.w / cxf / 2; // glyph drawn at natural width, centred on cx, then condensed
		els.push(
			<text
				key={L.li}
				x={xNat.toFixed(2)}
				y={y.toFixed(2)}
				fill={rgbs(colour)}
				opacity={op < 1 ? op.toFixed(3) : undefined}
				transform={
					sx !== 1 || sy !== 1 || sk !== 0
						? `translate(${cx.toFixed(2)} ${y.toFixed(2)})${sk ? ` skewX(${(-sk).toFixed(3)})` : ""} scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${(-cx).toFixed(2)} ${(-y).toFixed(2)})`
						: undefined
				}
			>
				{L.ch}
			</text>,
		);
	}

	const s = B.s ?? 1;
	const bop = B.op ?? 1;
	if (bop <= 0.001) return null;
	return (
		<svg
			width="1280"
			height="720"
			viewBox="0 0 1280 720"
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				overflow: "visible",
				opacity: bop < 1 ? bop : undefined,
			}}
		>
			<g
				transform={`translate(${(B.x ?? 640).toFixed(2)} ${(B.y ?? 360).toFixed(2)}) rotate(${(B.rot ?? 0).toFixed(3)}) scale(${(s * (B.sx ?? 1)).toFixed(5)} ${(s * (B.sy ?? 1)).toFixed(5)})`}
				style={{ font: lay.font, fontKerning: "none", letterSpacing: 0 }}
			>
				{els}
			</g>
		</svg>
	);
}

// ── tinted ground (dreams / plans / goals) ─────────────────────────────────

/**
 * The tinted beats are NOT a flat tint with glows on top: sampled at 1.875s,
 * 2.29s, 2.75s the field is the tint ([243,247,250] dreams) while the
 * bottom-left and top-right corners are near-white [254,255,253] with soft
 * ~100px edges, and the halftone sits OVER both — dots in the white corners
 * read tint-dark ([233,239,244]), weak dots inside the field read lighter than
 * it (they are lerped from white). So: tint, then two blurred white corner
 * fields, then the halftone with base = white. Corner shapes traced from the
 * 50% contour: bottom-left (0,440)…(760,720), top-right (800,0)…(1280,130).
 */
const CORNER_BL =
	"M-200,380 L0,425 L120,488 L240,528 L360,560 L440,584 L520,620 L600,660 L680,698 L770,740 L-200,900 Z";
const CORNER_TR = "M640,-200 L700,-40 L820,8 L980,46 L1120,84 L1260,122 L1480,160 L1480,-200 Z";

function TintGround(cfg, t) {
	if (!live(cfg, t)) return null;
	const k = kf(cfg.keys ?? [{ at: 0 }], localMs(cfg, t));
	const field = k.field ?? [243, 247, 250];
	const white = k.white ?? [254, 255, 253];
	const dot = k.dot ?? [230, 237, 243];
	const blur = cfg.edgeBlur ?? 42;
	const id = `s1tint-${cfg.id ?? "g"}`;
	return (
		<div style={{ position: "absolute", inset: 0, background: rgbs(field), overflow: "hidden" }}>
			<svg
				width="1280"
				height="720"
				viewBox="0 0 1280 720"
				style={{ position: "absolute", left: 0, top: 0 }}
			>
				<defs>
					<filter id={id} x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur stdDeviation={blur} />
					</filter>
				</defs>
				<g filter={`url(#${id})`} fill={rgbs(white)}>
					<path d={CORNER_BL} />
					<path d={CORNER_TR} />
				</g>
			</svg>
			<Halftone base={white} dot={dot} strength={k.strength ?? 1} />
		</div>
	);
}

// ── character slots ────────────────────────────────────────────────────────

/**
 * willow-mascot-pass — where the user's mascot / hero character art goes. Each
 * item is one character's bbox, keyed {at, x, y (centre), w, h, rot, op}
 * scene-relative, traced from the reference's character passes. Light face,
 * no shadow (the art has none), a faint per-character tint so the three read
 * apart, and a short label.
 */
function CharSlot(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
			{(cfg.items ?? []).map((it, i) => {
				const v = kf(it.keys ?? [], ms);
				if (!it.keys?.length || (v.op ?? 1) <= 0.001) return null;
				if (it.from != null && ms < it.from) return null;
				if (it.to != null && ms >= it.to) return null;
				const w = v.w ?? 300,
					h = v.h ?? 500;
				const tint = it.tint ?? [150, 140, 200];
				const r = Math.min(w, h) * (it.radius ?? 0.22);
				const fs = Math.max(10, Math.min(17, w * 0.075));
				return (
					<div
						key={i}
						style={{
							position: "absolute",
							left: (v.x ?? 640) - w / 2,
							top: (v.y ?? 360) - h / 2,
							width: w,
							height: h,
							transform: v.rot ? `rotate(${v.rot.toFixed(2)}deg)` : undefined,
							borderRadius: r,
							opacity: v.op ?? 1,
							background: `linear-gradient(170deg, ${rgbs(tint, 0.3)}, ${rgbs(tint, 0.16)}), ${rgbs([250, 249, 246])}`,
							border: `${Math.max(1, Math.min(2, w / 160)).toFixed(2)}px dashed ${rgbs(tint, 0.75)}`,
							boxSizing: "border-box",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						{it.label && w > 70 ? (
							<div
								style={{
									font: `500 ${fs.toFixed(1)}px/1.25 ${FONT}`,
									color: rgbs(tint.map((c) => c * 0.55)),
									textAlign: "center",
									padding: 6,
								}}
							>
								{it.label}
							</div>
						) : null}
					</div>
				);
			})}
		</div>
	);
}

// ── wordmark ───────────────────────────────────────────────────────────────

/**
 * willow-wordmark — serif wordmark with a drawn placeholder mark (NOT the
 * reference's logo): a centre tile, four diagonal dots and a leaf, assembling
 * in the reference's three stages (centre 6.04-6.17s, diagonals 6.21-6.38s,
 * leaf 6.29-6.46s; each grows from a point, expo-out). Text rises 46px -> 0
 * over 6.04-6.42s (deltas -18,-11,-6,-4,-3,-1.. = x0.6/frame). `keys` move the
 * whole lockup ({dy, op}); `textKeys` move only the text ({dy}).
 */
function Wordmark(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const G = kf(cfg.keys ?? [{ at: 0 }], ms);
	const T = kf(cfg.textKeys ?? [{ at: 0 }], ms);
	const size = cfg.size ?? 129;
	const font = `${cfg.weight ?? 400} ${size}px ${cfg.family ?? SERIF}`;
	const mark = cfg.mark ?? {};
	const mc = mark.colour ?? [222, 80, 54];
	const lc = mark.leaf ?? [208, 206, 56];
	const ms_ = mark.size ?? 137;
	const mx = mark.x ?? 318,
		my = mark.y ?? 371;
	const grow = (st) => {
		if (!st) return 1;
		const p = clamp01((ms - st[0]) / Math.max(1, st[1] - st[0]));
		return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
	};
	const stages = mark.stages ?? {};
	const g0 = ms < (stages.centre?.[0] ?? -1e9) ? 0 : grow(stages.centre);
	const g1 = ms < (stages.diag?.[0] ?? -1e9) ? 0 : grow(stages.diag);
	const g2 = ms < (stages.leaf?.[0] ?? -1e9) ? 0 : grow(stages.leaf);
	const u = ms_ / 137;
	const sq = 30 * u,
		dd = 34 * u,
		off = 38 * u,
		lf = 32 * u;
	const tx = cfg.textX ?? 423,
		ty = cfg.baseline ?? 416;
	return (
		<svg
			width="1280"
			height="720"
			viewBox="0 0 1280 720"
			style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: G.op ?? 1 }}
		>
			<g transform={`translate(0 ${(G.dy ?? 0).toFixed(2)})`}>
				{cfg.showMark !== false ? (
					<g>
						{g0 > 0 ? (
							<rect
								x={mx - (sq * g0) / 2}
								y={my - (sq * g0) / 2}
								width={sq * g0}
								height={sq * g0}
								fill={rgbs(mc)}
							/>
						) : null}
						{g1 > 0
							? [
									[-1, -1],
									[1, -1],
									[-1, 1],
									[1, 1],
								].map(([a, b], i) => (
									<circle
										key={i}
										cx={mx + a * off}
										cy={my + b * off}
										r={(dd / 2) * g1}
										fill={rgbs(mc)}
									/>
								))
							: null}
						{g2 > 0 ? (
							<rect
								x={mx - (lf * g2) / 2}
								y={my - 1.85 * off - (lf * g2) / 2}
								width={lf * g2}
								height={lf * g2}
								rx={lf * 0.18}
								fill={rgbs(lc)}
							/>
						) : null}
					</g>
				) : null}
				<text
					x={tx}
					y={ty + (T.dy ?? 0)}
					style={{ font, letterSpacing: `${cfg.ls ?? 0}em` }}
					fill={rgbs(cfg.colour ?? [24, 24, 22])}
				>
					{cfg.text ?? "Willow"}
				</text>
			</g>
		</svg>
	);
}

// ── crew pill (the companion roster that hands over to S2) ─────────────────

const HEAD_COLOURS = [
	[
		[236, 186, 150],
		[196, 128, 92],
	], // warm
	[
		[200, 236, 150],
		[120, 190, 84],
	], // green
	[
		[236, 150, 160],
		[190, 92, 108],
	], // red
	[
		[196, 168, 246],
		[138, 98, 214],
	], // purple
	[
		[160, 206, 236],
		[86, 146, 196],
	], // blue
	[
		[214, 208, 240],
		[150, 140, 200],
	], // lavender
];

/**
 * willow-crew-pill — a soft grey pill holding a row of neutral Avatar heads and
 * a "+" — the roster the characters collapse into at 11.04s and that grows to
 * six at 11.54s before S2's composer takes it over. keys {at, cx, cy, w, h, n,
 * s, sx, op}: w/h are the pill at s=1 (measured 392x128 with 3 heads, 696x128
 * with 6), n the head count (integer, switches hard), heads spread evenly
 * across the slot left of the "+", so a narrow pill crowds them (11.54s).
 */
function CrewPill(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const v = kf(cfg.keys ?? [{ at: 0 }], ms);
	if ((v.op ?? 1) <= 0.001) return null;
	const s = v.s ?? 1;
	const w = v.w ?? 392,
		h = v.h ?? 128;
	const n = Math.round(v.n ?? 3);
	const heads = cfg.heads ?? HEAD_COLOURS;
	const order = cfg.order ?? [1, 2, 3, 0, 4, 5];
	const visible = n >= 6 ? [0, 1, 2, 3, 4, 5] : order.slice(0, n).sort((a, b) => a - b);
	const pad = h * 0.2,
		plusW = h * 0.42;
	const d = h * 0.64;
	const slot = (w - 2 * pad - plusW) / Math.max(1, visible.length);
	return (
		<div
			style={{
				position: "absolute",
				left: (v.cx ?? 640) - w / 2,
				top: (v.cy ?? 463) - h / 2,
				width: w,
				height: h,
				transform: `scale(${(s * (v.sx ?? 1)).toFixed(4)}, ${s.toFixed(4)})`,
				transformOrigin: "50% 50%",
				opacity: v.op ?? 1,
			}}
		>
			<div
				style={{
					position: "absolute",
					inset: 0,
					borderRadius: h / 2,
					background: rgbs(cfg.colour ?? [244, 241, 236]),
					boxShadow: "0 6px 18px rgba(40,30,20,0.06), 0 1px 3px rgba(40,30,20,0.05)",
				}}
			/>
			{visible.map((hi, i) => {
				const [c1, c2] = heads[hi % heads.length];
				return (
					<Avatar
						key={hi}
						x={pad + slot * (i + 0.5)}
						y={h * 0.5}
						d={d}
						c1={c1}
						c2={c2}
						initials={cfg.initials?.[hi] ?? ""}
					/>
				);
			})}
			<div
				style={{
					position: "absolute",
					left: w - pad - plusW,
					top: 0,
					width: plusW,
					height: h,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: rgbs([196, 192, 186]),
					font: `300 ${(h * 0.42).toFixed(1)}px ${FONT}`,
				}}
			>
				+
			</div>
		</div>
	);
}

// ── browser chrome + composer rising in (11.75-12.17s) ─────────────────────

/**
 * willow-chrome-rise — the generic browser frame arriving around the roster
 * just before S2: the tab strip slides down from the top (bottom edge
 * 45 -> 100px over 11.75-12.17s, decelerating), the composer card rises from
 * the bottom (top edge 718 -> 627 over 11.92-12.17s, accelerating) and the
 * serif "Ask …" heading rises after it (cap top 706 at 12.08s -> 560 at 12.17s).
 * keys {at, strip, card, cardW, head} — strip = strip bottom y, card = card top
 * y, cardW = card width, head = heading cap-top y. Copy: `heading`, `placeholder`.
 */
function ChromeRise(cfg, t) {
	if (!live(cfg, t)) return null;
	const v = kf(cfg.keys ?? [{ at: 0 }], localMs(cfg, t));
	const strip = v.strip ?? -10;
	const card = v.card ?? 760;
	const cardW = v.cardW ?? 994;
	const head = v.head ?? 760;
	const sh = 100;
	const hs = cfg.headSize ?? 72;
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			{strip > 0 ? (
				<div
					style={{
						position: "absolute",
						left: 0,
						top: strip - sh,
						width: 1280,
						height: sh,
						background: rgbs([249, 248, 244]),
						borderBottom: "1px solid rgba(0,0,0,0.03)",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: -22,
							top: 18,
							width: 304,
							height: 70,
							borderRadius: 12,
							background: "#fff",
							boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
						}}
					>
						<div
							style={{
								position: "absolute",
								left: 14,
								top: 26,
								width: 18,
								height: 18,
								borderRadius: 4,
								background: "repeating-linear-gradient(45deg, #b8b6b2 0 3px, #e4e2de 3px 6px)",
							}}
						/>
						<div
							style={{
								position: "absolute",
								left: 56,
								top: 0,
								height: 70,
								display: "flex",
								alignItems: "center",
								font: `400 25px ${FONT}`,
								color: "#1a1a1a",
							}}
						>
							{cfg.tabLabel ?? "New Tab"}
						</div>
					</div>
					<div
						style={{
							position: "absolute",
							left: 344,
							top: 22,
							font: `300 40px/40px ${FONT}`,
							color: "#1a1a1a",
						}}
					>
						+
					</div>
				</div>
			) : null}
			{head < 740 ? (
				<div
					style={{
						position: "absolute",
						left: 0,
						width: 1280,
						top: head - hs * 0.29,
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						gap: hs * 0.36,
						font: `400 ${hs}px/1 ${SERIF}`,
						color: "#1c1c1a",
					}}
				>
					<span>{cfg.headingLead ?? "Ask"}</span>
					<svg width={hs * 1.2} height={hs * 1.2} viewBox="0 0 120 120">
						<rect x="46" y="46" width="28" height="28" fill={rgbs([222, 80, 54])} />
						{[
							[-1, -1],
							[1, -1],
							[-1, 1],
							[1, 1],
						].map(([a, b], i) => (
							<circle key={i} cx={60 + a * 30} cy={60 + b * 30} r="15" fill={rgbs([222, 80, 54])} />
						))}
						<rect x="46" y="-14" width="28" height="28" rx="5" fill={rgbs([208, 206, 56])} />
					</svg>
					<span>{cfg.headingName ?? "Willow"}</span>
				</div>
			) : null}
			{card < 720 ? (
				<div
					style={{
						position: "absolute",
						left: 637 - cardW / 2,
						top: card,
						width: cardW,
						height: 240,
						borderRadius: 44,
						background: "#fff",
						border: "2px solid rgba(214,214,218,0.9)",
						boxSizing: "border-box",
						boxShadow: "0 8px 24px rgba(30,30,60,0.05)",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: 44,
							top: 22,
							font: `400 50px ${FONT}`,
							color: rgbs([186, 186, 186]),
						}}
					>
						{cfg.placeholder ?? "Ask Willow..."}
					</div>
				</div>
			) : null}
		</div>
	);
}

export const S1_PRESETS = {
	"willow-kinetic-type": {
		note: "willow's elastic type engine (S1 overture): lines laid with real kerning, a block transform (x,y,s,sx,sy,rot,op + track/gap re-lays), per-letter type-on, pastel highlight windows that run across fresh letters, squash-stretch/hop pops on each letter's own clock, right-to-left letter slides (leftmost settles first), and range groups (line/word) that move and scale as units. Measured 0-12.2s of the Strawberry film; see sections/s1/notes.md.",
		nativeMs: 3000,
		params: {
			lines: ["array", '["You have"]', "strings or [{text, colour}] spans per line"],
			size: ["number", 100, "font px at s=1 (match by cap height: Segoe cap = 0.70em)"],
			weight: ["number", 650, "font weight"],
			cx: ["number", 1, "horizontal condense of the face (advances and glyphs)"],
			ls: [
				"number",
				0,
				"base letter-spacing in em (Segoe UI needs ~-0.03 to sit as tight as the reference's Inter Display)",
			],
			gapLines: ["array|null", null, "line indices the `gap` channel applies to (default all)"],
			leading: ["number", "1.2*size", "px between baselines"],
			align: [
				"string",
				"centre",
				"centre | left (origin = first baseline, line centre or left edge)",
			],
			keys: [
				"array",
				"[{at:0,x:640,y:360,s:1}]",
				"block transform keys (kf); also op, sx, sy, rot, track, gap",
			],
			type: [
				"object|array",
				null,
				"{at, step} | {times:[]} per letter (letters only, spaces skipped); array of {range,...} for several",
			],
			hl: ["array", "[]", "[{range, colour, on:{at,step}|{times}, off:{...}|dur}]"],
			pops: [
				"array",
				"[]",
				"[{range, at:{at,step}|{times}, keys:[{at, sy, dy}], k, amp}] — dy in em",
			],
			slide: ["array", "[]", "[{range, at, amp, ampStep, tau0, tauStep}]"],
			groups: ["array", "[]", "[{range:'line:N'|'word:N'|[from,to], keys:[{at,dx,dy,sx,sy,op}]}]"],
		},
		render: KineticType,
	},
	"willow-tint-ground": {
		note: "the overture's tinted word-swap grounds (dreams/plans/goals): flat tint field, soft near-white bottom-left and top-right corners, and the halftone drawn OVER both with base=white (so corner dots read tint-dark and weak field dots read lighter than the field). keys {at, field, white, dot, strength}, ease:'hold' for the cuts. Lay it over a willow-ground scene.",
		nativeMs: 1400,
		params: {
			keys: [
				"array",
				"[{at:0, field:[243,247,250], white:[254,255,253], dot:[230,237,243]}]",
				"ground states",
			],
			edgeBlur: ["number", 42, "corner edge softness (gaussian sigma px)"],
		},
		render: TintGround,
	},
	"willow-mascot-pass": {
		note: "slot(s) for the user's character / mascot art, keyed per character {at,x,y,w,h,rot,op} along the reference's measured passes (rise-in, jumps, tumbles, runs, exits). Light tinted face, dashed edge, no shadow, short label.",
		nativeMs: 2000,
		params: {
			items: ["array", "[]", "[{label, tint:[r,g,b], keys:[{at,x,y,w,h,rot,op,ease}], from, to}]"],
		},
		render: CharSlot,
	},
	"willow-wordmark": {
		note: "serif wordmark + drawn placeholder mark assembling in three stages (centre tile, diagonal dots, leaf), text rising 46px into place; keys move the lockup ({dy,op}), textKeys the text only.",
		nativeMs: 1700,
		params: {
			text: ["string", "Willow", "wordmark"],
			size: ["number", 129, "serif px (Georgia cap 0.69em -> 89px cap)"],
			textX: ["number", 423, "text left x"],
			baseline: ["number", 416, "text baseline y"],
			mark: [
				"object",
				"{x:318,y:371,size:137,stages:{centre:[a,b],diag:[a,b],leaf:[a,b]}}",
				"placeholder mark",
			],
			keys: ["array", "[]", "lockup {at,dy,op}"],
			textKeys: ["array", "[]", "text-only {at,dy}"],
		},
		render: Wordmark,
	},
	"willow-crew-pill": {
		note: "the companion roster: a soft grey pill with N neutral Avatar heads and a '+'. keys {at,cx,cy,w,h,n,s,sx,op}; n switches hard (3 -> 6 at 11.54s), a narrow w crowds the heads.",
		nativeMs: 1200,
		params: {
			keys: ["array", "[]", "pill states"],
			heads: ["array", "6 pastel gradient pairs", "[[c1,c2],...] avatar colours"],
			order: ["array", "[1,2,3,0,4,5]", "which heads show first when n<6"],
			initials: ["array|null", null, "optional initials per head"],
		},
		render: CrewPill,
	},
	"willow-chrome-rise": {
		note: "generic browser frame arriving for the S2 handover: tab strip slides down, composer card and serif 'Ask …' heading rise from below. keys {at, strip, card, cardW, head} in px.",
		nativeMs: 500,
		params: {
			keys: ["array", "[]", "edges per key"],
			headingLead: ["string", "Ask", ""],
			headingName: ["string", "Willow", ""],
			placeholder: ["string", "Ask Willow...", ""],
			tabLabel: ["string", "New Tab", ""],
		},
		render: ChromeRise,
	},
};
