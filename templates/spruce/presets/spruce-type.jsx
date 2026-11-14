/**
 * spruce type and grounds — the ground layer, the growing word lines, the
 * opening bubble field, braces, the counter with its scribble, the orbs on
 * black, the bloom into the first site, and the brand lockup.
 *
 * Measured (reference px, 1920x1080 @30fps):
 *   - BUBBLES f0-36: ~40 soft spheres (r ~220) on cream, field tinted lilac
 *     top-left -> magenta -> orange bottom-right; the camera pushes 1.0 ->
 *     ~1.55 over f0-36 about the "Today" bubble; f36-46 the field pales to a
 *     faint ring pattern while the label bubble shrinks to a dot.
 *   - LINES: semibold, near-black on cream; words land blurred (~14 px) and
 *     sharpen in ~200 ms; the line re-centres over ~300 ms as it grows.
 *   - TYPED HERO f84-108: the line types at ~1 char/2 frames at ~330 px with
 *     a 48 px gradient caret (lilac -> magenta -> orange), while the camera
 *     pulls back ~3.3x -> 1x.
 *   - BRACES f110-140: two gradient braces (pink top -> blue foot) slide in
 *     from the frame edges, then close in with the line as the camera pulls
 *     back to ~0.75.
 *   - COUNTER f444-492: an oblique heavy number counting up on an ease-out,
 *     over a gradient scribble drawn left -> right with a white dot head.
 *   - ORBS f264-312: two glossy spheres (blue top-right, red bottom-left) on
 *     black with a violet haze; one white word at a time in the centre.
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import {
	Aura,
	E,
	expo,
	fms,
	Grain,
	H,
	hash,
	kf,
	lineLayout,
	localMs,
	P,
	prog,
	RefBox,
	RINGS,
	rgbs,
	SANS,
	Sphere,
	smooth,
	textW,
	W,
	wordIn,
} from "./spruce-shared.jsx";

// ── the ground ────────────────────────────────────────────────────────────

/**
 * Ground keys: {at, base, cx, cy, rx, ry, ringA, grain, set} — `set` names a
 * ring set in RINGS (or pass `rings` on the scene). Blobs: [{c, keys:[{at,x,
 * y,rx,ry,a}]}] soft ellipses over the base.
 */
function Ground(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys ?? [{ at: 0 }], ms);
	const rings = c.rings ?? RINGS[k.set ?? c.set ?? "arc"];
	const ring =
		(k.ringA ?? 1) > 0 && k.rx
			? {
					cx: k.cx ?? 960,
					cy: k.cy ?? 1300,
					rx: k.rx,
					ry: k.ry ?? k.rx,
					rings: rings.map(([col, r, a = 1]) => [col, r * (k.rs ?? 1), a]),
					alphaMul: k.ringA ?? 1,
				}
			: null;
	const blobs = (c.blobs ?? []).map((b) => ({ c: b.c, ...kf(b.keys, ms) }));
	return (
		<RefBox z={c.z ?? 0}>
			<Aura base={k.base ?? P.cream} ring={ring} blobs={blobs} grain={k.grain ?? 0.16} t={t} />
			{k.flash ? (
				<div
					style={{ position: "absolute", inset: 0, background: rgbs(k.flashC ?? P.white, k.flash) }}
				/>
			) : null}
		</RefBox>
	);
}

// ── icons that sit inside a line ──────────────────────────────────────────

function Icon({ kind, size }) {
	const s = size;
	if (kind === "globe")
		return (
			<svg width={s} height={s} viewBox="0 0 40 40">
				<defs>
					<linearGradient id="sp-ig" x1="0" y1="0" x2="1" y2="1">
						<stop offset="0" stopColor="#b36cf0" />
						<stop offset="0.5" stopColor="#ec2b8c" />
						<stop offset="1" stopColor="#f2603a" />
					</linearGradient>
				</defs>
				<circle cx="20" cy="20" r="16.5" fill="none" stroke="url(#sp-ig)" strokeWidth="5" />
				<path
					d="M8 15c5 0 6 5 10 4s3-7 8-6M12 30c2-4 7-3 9-6s5-2 9 1"
					fill="none"
					stroke="url(#sp-ig)"
					strokeWidth="3.4"
					strokeLinecap="round"
				/>
			</svg>
		);
	if (kind === "branch")
		return (
			<svg width={s} height={s} viewBox="0 0 40 40">
				<circle cx="12" cy="9" r="4.5" fill="none" stroke="#fff" strokeWidth="3.4" />
				<circle cx="12" cy="31" r="4.5" fill="none" stroke="#fff" strokeWidth="3.4" />
				<circle cx="29" cy="13" r="4.5" fill="none" stroke="#fff" strokeWidth="3.4" />
				<path d="M12 13.5v13M29 17.5c0 7-17 4-17 9" fill="none" stroke="#fff" strokeWidth="3.4" />
			</svg>
		);
	return null;
}

// ── growing word lines ────────────────────────────────────────────────────

/**
 * A line of words that grows word by word and re-centres. Words: [{text, at,
 * mode, colour, icon, scale, weight, gap, outAt}]. `type` makes the WHOLE line
 * type on instead ({at, cps, caret}). `fill` is a CSS gradient for the glyphs
 * (background-clip text). `out` {at, dur, mode: blur|fade|letters}.
 */
function Line(c, t) {
	const ms = localMs(c, t);
	const size = c.size ?? 64;
	const weight = c.weight ?? 600;
	const colour = c.colour ?? P.ink;
	const cx = c.cx ?? 960;
	const cy = c.cy ?? 540;
	let words = (c.words ?? []).map((w) => (typeof w === "string" ? { text: w, at: 0 } : w));
	words = words.map((w) => {
		if (!w.seq) return w;
		let cur = w.text;
		for (const [at, tx] of w.seq) if (ms >= at) cur = tx;
		return { ...w, text: cur, w: textW(w.text, size * (w.scale ?? 1), w.weight ?? weight) };
	});
	let caretX = null;
	if (c.type) {
		// typed line: one word list built from the typed prefix
		const full = c.type.text;
		const n = Math.max(
			0,
			Math.min(full.length, Math.floor(((ms - c.type.at) / 1000) * (c.type.cps ?? 15))),
		);
		const shown = full.slice(0, n);
		words = [
			{
				text: shown,
				at: 0,
				mode: "cut",
				w: textW(shown, size, weight) + (c.tracking ?? -0.035) * size * shown.length,
			},
		];
	}
	const tracking = c.tracking ?? -0.035;
	const lay = lineLayout(words, size, weight, ms, c.recentreMs ?? 320, tracking);
	const width = c.type ? lay.full : lay.width;
	const left =
		c.align === "left" ? cx : cx - width / 2 - (c.type && c.type.caret ? (size * 0.16) / 2 : 0);
	const out = c.out;
	let outO = 1;
	let outBlur = 0;
	if (out && ms >= out.at) {
		const p = prog(ms, out.at, out.at + (out.dur ?? 200));
		if (out.mode === "cut") outO = 0;
		else {
			outO = 1 - smooth(p);
			outBlur = out.mode === "blur" ? p * 16 : 0;
		}
	}
	if (c.shade) c = { ...c, fill: "linear-gradient(180deg,#2a2627 0%,#3c3738 40%,#8c8487 100%)" };
	const fillStyle = c.fill
		? {
				backgroundImage: c.fill,
				WebkitBackgroundClip: "text",
				backgroundClip: "text",
				color: "transparent",
			}
		: null;
	const nodes = words.map((wd, i) => {
		if (!c.type && ms < wd.at) return null;
		const st = c.type
			? { o: 1, blur: 0, dy: 0, sc: 1 }
			: wordIn(wd.mode ?? c.mode ?? "blur", ms, wd.at, wd.dur ?? 220);
		let o = st.o;
		let blur = st.blur;
		if (wd.outAt != null && ms >= wd.outAt) {
			const p = prog(ms, wd.outAt, wd.outAt + (wd.outDur ?? 180));
			o *= 1 - p;
			blur += p * 12;
		}
		if (o <= 0.001) return null;
		const sz = size * (wd.scale ?? 1);
		const col = wd.colour ?? colour;
		const x = left + lay.xs[i].x;
		if (wd.icon)
			return (
				<div
					key={i}
					style={{
						position: "absolute",
						left: x,
						top: cy - sz * 0.42 + st.dy * size,
						opacity: o,
						filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined,
					}}
				>
					<Icon kind={wd.icon} size={sz * 0.9} />
				</div>
			);
		return (
			<div
				key={i}
				style={{
					position: "absolute",
					left: x,
					top: cy - sz * 0.68 + st.dy * size,
					fontWeight: wd.weight ?? weight,
					fontSize: sz,
					fontFamily: SANS,
					fontStyle: wd.italic ? "italic" : undefined,
					letterSpacing: `${tracking}em`,
					lineHeight: 1.3,
					whiteSpace: "pre",
					color: rgbs(col),
					opacity: o,
					transform: st.sc !== 1 ? `scale(${st.sc.toFixed(4)})` : undefined,
					transformOrigin: "50% 60%",
					filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined,
					...(wd.fill || fillStyle
						? {
								backgroundImage: wd.fill ?? c.fill,
								WebkitBackgroundClip: "text",
								backgroundClip: "text",
								color: "transparent",
							}
						: null),
				}}
			>
				{wd.text}
			</div>
		);
	});
	if (c.type && c.type.caret) {
		caretX = left + lay.full + size * 0.05;
		const ca = c.type.caret;
		const on =
			ca.solid ||
			Math.floor(ms / 500) % 2 === 0 ||
			ms < (c.type.at ?? 0) + (c.type.text.length / (c.type.cps ?? 15)) * 1000;
		if (on && (ca.until == null || ms < ca.until))
			nodes.push(
				<div
					key="caret"
					style={{
						position: "absolute",
						left: caretX,
						top: cy - size * 0.5,
						width: size * 0.15,
						height: size * 0.96,
						background: ca.fill ?? "linear-gradient(180deg,#b78cf5 0%,#ec1a7c 45%,#f05a24 100%)",
					}}
				/>,
			);
	}
	return (
		<RefBox z={c.z ?? 10}>
			<div
				style={{
					position: "absolute",
					inset: 0,
					opacity: outO,
					filter: outBlur > 0.3 ? `blur(${outBlur.toFixed(1)}px)` : undefined,
				}}
			>
				{nodes}
			</div>
		</RefBox>
	);
}

// ── letters scattering in (the "creating" beat) ───────────────────────────

/** Letters arrive from the middle outward, each blurred with a small y bob. */
function Letters(c, t) {
	const ms = localMs(c, t);
	const text = c.text ?? "creating";
	const size = c.size ?? 96;
	const weight = c.weight ?? 600;
	const full = textW(text, size, weight);
	const left = (c.cx ?? 960) - full / 2;
	const mid = (text.length - 1) / 2;
	let x = 0;
	const nodes = [];
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		const w = textW(ch, size, weight);
		const order = Math.abs(i - mid) + hash(i * 3.1) * 0.8;
		const at = (c.at ?? 0) + order * (c.stepMs ?? 45);
		const p = prog(ms, at, at + (c.dur ?? 260));
		const e = expo(p);
		const bob = (1 - e) * size * 0.28 * (hash(i + 7) > 0.5 ? 1 : -1);
		const o = ms < at ? 0 : clamp01(p * 2.2);
		nodes.push(
			<div
				key={i}
				style={{
					position: "absolute",
					left: left + x,
					top: (c.cy ?? 540) - size * 0.68 + bob,
					fontWeight: weight,
					fontSize: size,
					fontFamily: SANS,
					color: rgbs(c.colour ?? P.grey),
					opacity: o,
					filter: e < 0.97 ? `blur(${((1 - e) * 10).toFixed(1)}px)` : undefined,
					whiteSpace: "pre",
					lineHeight: 1.3,
				}}
			>
				{ch}
			</div>,
		);
		x += w;
	}
	return <RefBox z={c.z ?? 10}>{nodes}</RefBox>;
}

// ── the opening bubble field ──────────────────────────────────────────────

const mixC = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];

/** Field colour by position: lilac/blue top-left -> magenta -> orange bottom-right. */
function fieldColour(x, y) {
	const d = clamp01((x / W) * 0.45 + (y / H) * 0.75);
	if (d < 0.35) return mixC([150, 130, 245], [236, 90, 200], d / 0.35);
	if (d < 0.7) return mixC([236, 90, 200], [232, 40, 130], (d - 0.35) / 0.35);
	return mixC([232, 40, 130], [240, 104, 60], (d - 0.7) / 0.3);
}

function Bubbles(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys ?? [{ at: 0, s: 1, pale: 0, lab: 1 }], ms);
	const s = k.s ?? 1;
	const pale = k.pale ?? 0;
	const fx = c.focusX ?? 860;
	const fy = c.focusY ?? 470;
	const pitchX = 480;
	const pitchY = 410;
	const nodes = [];
	for (let row = -3; row < 6; row++) {
		for (let col = -3; col < 7; col++) {
			const bx =
				col * pitchX +
				(Math.abs(row) % 2 ? pitchX / 2 : 0) +
				(c.focusX ?? 860) -
				2 * pitchX +
				(hash(row * 13 + col) - 0.5) * 70;
			const by = row * pitchY + (c.focusY ?? 470) - pitchY + (hash(row * 7 + col * 3) - 0.5) * 60;
			const isLabel = row === 1 && col === 2;
			const r0 =
				(isLabel ? 208 : 186 + hash(row * 5 + col * 11) * 36) * (isLabel ? (k.lab ?? 1) : 1);
			// camera about the focus point
			const x = fx + (bx - fx) * s;
			const y = fy + (by - fy) * s;
			const r = r0 * s;
			if (x + r < -40 || x - r > W + 40 || y + r < -40 || y - r > H + 40) continue;
			let col0 = fieldColour(x, y);
			if (isLabel) col0 = [236, 40, 140];
			const fade = isLabel ? 0 : pale;
			const top = mixC(mixC(col0, [255, 200, 240], 0.25), P.cream, fade * 0.85);
			const bot = mixC(col0, P.cream, fade * 0.85);
			nodes.push(
				<Sphere
					key={`${row}-${col}`}
					x={x}
					y={y}
					r={r}
					top={top}
					bottom={bot}
					rimA={0.7 * (1 - fade)}
					soft={0.035 + fade * 0.06}
				>
					{isLabel && (k.labA ?? 1) > 0.01 ? (
						<div
							style={{
								position: "absolute",
								inset: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontWeight: 600,
								fontSize: (c.labelSize ?? 46) * s * (k.lab ?? 1),
								fontFamily: SANS,
								color: "#fff",
								opacity: k.labA ?? 1,
							}}
						>
							{c.label ?? "Today"}
						</div>
					) : null}
				</Sphere>,
			);
		}
	}
	return (
		<RefBox z={c.z ?? 5}>
			<div style={{ position: "absolute", inset: 0, opacity: k.a ?? 1 }}>{nodes}</div>
		</RefBox>
	);
}

// ── braces ────────────────────────────────────────────────────────────────

function Braces(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const size = c.size ?? 520;
	const fill = c.fill ?? "linear-gradient(180deg,#f06eb6 0%,#ec4fc0 45%,#9a74f0 78%,#6f86f5 100%)";
	const brace = (ch, x) => (
		<div
			style={{
				position: "absolute",
				left: x,
				top: (c.cy ?? 540) - size * 0.66,
				fontWeight: 600,
				fontSize: size,
				fontFamily: SANS,
				lineHeight: 1.3,
				backgroundImage: fill,
				WebkitBackgroundClip: "text",
				backgroundClip: "text",
				color: "transparent",
				opacity: k.a ?? 1,
				filter: `drop-shadow(0 0 ${(size * 0.02).toFixed(1)}px rgba(255,236,224,0.9))`,
				transform: "translateX(-50%)",
			}}
		>
			{ch}
		</div>
	);
	const gap = k.gap ?? 700;
	return (
		<RefBox z={c.z ?? 9}>
			{brace("{", 960 - gap)}
			{brace("}", 960 + gap)}
		</RefBox>
	);
}

// ── the counter and its scribble ──────────────────────────────────────────

const fmt = (n) => Math.round(n).toLocaleString("en-US");

function Counter(c, t) {
	const ms = localMs(c, t);
	const p = E("out", prog(ms, c.countAt ?? 0, c.countEnd ?? 1500), 3);
	const v = lerp(c.from ?? 20000, c.to ?? 50000, p);
	const size = c.size ?? 300;
	const draw = smooth(prog(ms, c.drawAt ?? 0, c.drawEnd ?? 1500));
	const path =
		c.path ??
		"M -40 960 C 160 880, 330 840, 470 900 S 650 1060, 760 990 S 900 700, 1000 640 S 1090 600, 1120 610";
	const len = c.pathLen ?? 1500;
	// approximate head position by sampling the path in the DOM-free way: use
	// an SVG <path> and getPointAtLength when available
	let head = null;
	if (typeof document !== "undefined") {
		const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
		el.setAttribute("d", path);
		const L = el.getTotalLength();
		head = el.getPointAtLength(L * draw);
	}
	const blur = (1 - expo(prog(ms, c.countAt ?? 0, (c.countAt ?? 0) + 260))) * 10;
	return (
		<RefBox z={c.z ?? 10}>
			<svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
				<defs>
					<linearGradient id="sp-scr" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0" stopColor="#6f7cf5" />
						<stop offset="0.35" stopColor="#e85bd0" />
						<stop offset="0.7" stopColor="#ec1a6c" />
						<stop offset="1" stopColor="#f2643a" />
					</linearGradient>
				</defs>
				<path
					d={path}
					fill="none"
					stroke="url(#sp-scr)"
					strokeWidth={c.stroke ?? 16}
					strokeLinecap="round"
					strokeDasharray={`${len} ${len}`}
					strokeDashoffset={len * (1 - draw)}
					pathLength={len}
				/>
				{head && draw > 0.01 ? (
					<circle cx={head.x} cy={head.y} r={c.dot ?? 22} fill="#fff" opacity="0.95" />
				) : null}
			</svg>
			<div
				style={{
					position: "absolute",
					left: 0,
					width: W,
					top: (c.cy ?? 480) - size * 0.66,
					textAlign: "center",
					fontWeight: 800,
					fontSize: size,
					fontFamily: SANS,
					fontStyle: "italic",
					letterSpacing: "-0.04em",
					lineHeight: 1.3,
					backgroundImage: "linear-gradient(180deg,#2c2829 0%,#3a3536 45%,#7a7274 100%)",
					WebkitBackgroundClip: "text",
					backgroundClip: "text",
					color: "transparent",
					opacity: clamp01(prog(ms, c.countAt ?? 0, (c.countAt ?? 0) + 120)),
					filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined,
				}}
			>
				{fmt(v)}
			</div>
		</RefBox>
	);
}

// ── orbs on black ─────────────────────────────────────────────────────────

function Orbs(c, t) {
	const ms = localMs(c, t);
	const a = kf(c.orbA ?? [{ at: 0, x: 1270, y: -170, r: 420 }], ms);
	const b = kf(c.orbB ?? [{ at: 0, x: 640, y: 1260, r: 380 }], ms);
	const words = c.words ?? [];
	let cur = null;
	for (const w of words) if (ms >= w.at) cur = w;
	return (
		<RefBox z={c.z ?? 6}>
			<Aura
				base={[2, 2, 6]}
				ring={{ cx: 960, cy: 1250, rx: 1300, ry: 700, rings: RINGS.dark }}
				blobs={[{ c: [60, 40, 140], x: 1500, y: 1100, rx: 700, ry: 420, a: 0.55 }]}
				grain={0.12}
				t={t}
			/>
			<Sphere
				x={a.x}
				y={a.y}
				r={a.r}
				top={[130, 160, 250]}
				bottom={[58, 66, 236]}
				rim={[210, 220, 255]}
				rimA={0.6}
				soft={0.012}
			/>
			<Sphere
				x={b.x}
				y={b.y}
				r={b.r}
				top={[240, 28, 64]}
				bottom={[232, 80, 180]}
				rim={[255, 190, 210]}
				rimA={0.7}
				soft={0.012}
			/>
			{cur ? (
				<div
					style={{
						position: "absolute",
						left: 0,
						width: W,
						top: (c.cy ?? 540) - 44,
						textAlign: "center",
						fontWeight: 600,
						fontSize: cur.size ?? c.size ?? 60,
						fontFamily: SANS,
						color: "#fff",
						lineHeight: 1.3,
						letterSpacing: "-0.01em",
					}}
				>
					{cur.text}
				</div>
			) : null}
			<Grain t={t} alpha={0.1} />
		</RefBox>
	);
}

// ── the bloom: zoom into a letter, a flower, a star that opens the site ───

function flowerPath(cx, cy, R, lobes = 9, amp = 0.16, rot = 0) {
	const pts = [];
	const N = 180;
	for (let i = 0; i <= N; i++) {
		const a = (i / N) * Math.PI * 2 + rot;
		const r = R * (1 + amp * Math.abs(Math.sin((lobes * a) / 2)) ** 0.6 - amp * 0.5);
		pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
	}
	return `M${pts.join("L")}Z`;
}

/** A 4-point sparkle: concave quadratic sides, `pinch` pulls them in. */
function starPath(cx, cy, R, pinch = 0.18, rot = 0) {
	const pt = (a, r) => [cx + r * Math.cos(a + rot), cy + r * Math.sin(a + rot)];
	const f = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
	let d = "";
	for (let i = 0; i < 4; i++) {
		const a0 = (i * Math.PI) / 2 - Math.PI / 2;
		const p0 = pt(a0, R);
		const c = pt(a0 + Math.PI / 4, R * pinch);
		const p1 = pt(a0 + Math.PI / 2, R);
		d += i === 0 ? `M${f(p0)}` : "";
		d += `Q${f(c)} ${f(p1)}`;
	}
	return `${d}Z`;
}

/**
 * keys: {at, letterS, flowerR, flowerA, starR, starA, dark} — the letter (a
 * giant glyph the camera falls into), the scalloped flower and the 4-point
 * star, which darkens and swells until it IS the next shot's ground.
 */
function Bloom(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const letterS = k.letterS ?? 0;
	const dark = k.dark ?? 0;
	const starC = mixC([236, 30, 140], [40, 12, 70], dark);
	return (
		<RefBox z={c.z ?? 8}>
			{(k.groundA ?? 1) > 0 ? (
				<Aura
					base={P.cream}
					ring={{
						cx: 960,
						cy: 600,
						rx: 1100,
						ry: 800,
						rings: [
							[[245, 160, 225], 0],
							[[238, 40, 150], 620],
							[[240, 100, 60], 1000],
						],
					}}
					grain={0.14}
					t={t}
				/>
			) : null}
			{letterS > 0 ? (
				<div
					style={{
						position: "absolute",
						left: 960 + (c.letterDx ?? 40) * letterS,
						top: 540 + (c.letterDy ?? -40) * letterS,
						transform: `translate(-50%,-62%) scale(${letterS.toFixed(4)})`,
						fontWeight: 600,
						fontSize: 400,
						fontFamily: SANS,
						color: rgbs(P.grey),
						lineHeight: 1.3,
					}}
				>
					{c.letter ?? "a"}
				</div>
			) : null}
			<svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
				<defs>
					<radialGradient id="sp-flw" cx="0.5" cy="0.5" r="0.5">
						<stop offset="0" stopColor="#fbeef6" />
						<stop offset="0.55" stopColor="#f6cfe9" />
						<stop offset="0.85" stopColor="#f08fd0" />
						<stop offset="1" stopColor="#ec5bb8" />
					</radialGradient>
				</defs>
				{(k.flowerA ?? 0) > 0 ? (
					<path
						d={flowerPath(960, 540, k.flowerR ?? 500, 9, 0.18, (k.rot ?? 0) * 0.0174)}
						fill="url(#sp-flw)"
						opacity={k.flowerA}
						style={{ filter: `blur(${(k.flowerBlur ?? 18).toFixed(1)}px)` }}
					/>
				) : null}
				{(k.starA ?? 0) > 0 ? (
					<path
						d={starPath(960, 540, k.starR ?? 120, k.pinch ?? 0.16, (k.starRot ?? 0) * 0.0174)}
						fill={rgbs(starC)}
						opacity={k.starA}
					/>
				) : null}
			</svg>
		</RefBox>
	);
}

// ── the brand lockup on the arc aura ──────────────────────────────────────

/** The spruce mark: a rounded tree of two stacked tiers. */
export function markPath(x, y, s) {
	// authored on a 100x100 box, tip at top
	const P2 = (px, py) => `${(x + px * s).toFixed(1)},${(y + py * s).toFixed(1)}`;
	return `M${P2(50, 4)} C${P2(56, 4)} ${P2(60, 9)} ${P2(63, 14)} L${P2(78, 40)} C${P2(81, 46)} ${P2(77, 52)} ${P2(70, 52)} L${P2(
		66,
		52,
	)} L${P2(90, 80)} C${P2(95, 87)} ${P2(90, 95)} ${P2(82, 95)} L${P2(18, 95)} C${P2(10, 95)} ${P2(5, 87)} ${P2(10, 80)} L${P2(
		34,
		52,
	)} L${P2(30, 52)} C${P2(23, 52)} ${P2(19, 46)} ${P2(22, 40)} L${P2(37, 14)} C${P2(40, 9)} ${P2(44, 4)} ${P2(50, 4)} Z`;
}

export function Mark({ x, y, size, fill = "#fff", id = "m" }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			style={{ position: "absolute", left: x, top: y, overflow: "visible" }}
		>
			{fill.startsWith("url") ? (
				<defs>
					<linearGradient id={`sp-mk-${id}`} x1="0" y1="0" x2="1" y2="1">
						<stop offset="0" stopColor="#f2643a" />
						<stop offset="0.45" stopColor="#ec1a7c" />
						<stop offset="1" stopColor="#6f7cf5" />
					</linearGradient>
				</defs>
			) : null}
			<path
				d={markPath(0, 0, size / 100)}
				fill={fill.startsWith("url") ? `url(#sp-mk-${id})` : fill}
			/>
		</svg>
	);
}

/** Wordmark letters reveal left -> right, blurred; the mark pops then settles. */
function Lockup(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys ?? [{ at: 0, s: 1 }], ms);
	const name = c.name ?? "Spruce";
	const size = c.size ?? 250;
	const weight = 700;
	const markSize = size * 1.0;
	const gap = size * 0.18;
	const nameW = textW(name, size, weight);
	const total = markSize + gap + nameW;
	const left = 960 - total / 2;
	const colour = c.colour ?? P.cream;
	let x = 0;
	const letters = [];
	for (let i = 0; i < name.length; i++) {
		const ch = name[i];
		const w = textW(ch, size, weight);
		const at = (c.lettersAt ?? 0) + i * (c.stepMs ?? 33);
		const p = prog(ms, at, at + 240);
		const e = expo(p);
		letters.push(
			<span
				key={i}
				style={{
					position: "absolute",
					left: x,
					top: 0,
					opacity: ms < at ? 0 : clamp01(p * 2),
					filter: e < 0.97 ? `blur(${((1 - e) * 12).toFixed(1)}px)` : undefined,
				}}
			>
				{ch}
			</span>,
		);
		x += w;
	}
	const mp = expo(prog(ms, c.markAt ?? 0, (c.markAt ?? 0) + 300));
	const morph = smooth(prog(ms, c.morphAt ?? 600, (c.morphAt ?? 600) + 300));
	return (
		<RefBox z={c.z ?? 10}>
			<div
				style={{
					position: "absolute",
					inset: 0,
					transform: `scale(${(k.s ?? 1).toFixed(4)})`,
					transformOrigin: "960px 540px",
				}}
			>
				{/* the mark: a round "seed" that morphs into the tree */}
				<div
					style={{ position: "absolute", left, top: 540 - markSize / 2 - size * 0.02, opacity: mp }}
				>
					<svg
						width={markSize}
						height={markSize}
						viewBox="0 0 100 100"
						style={{ overflow: "visible" }}
					>
						<circle cx="50" cy="52" r={40 * (1 - morph) + 0.01} fill={rgbs(colour)} />
						<path d={markPath(0, 0, 1)} fill={rgbs(colour)} opacity={morph} />
					</svg>
				</div>
				<div
					style={{
						position: "absolute",
						left: left + markSize + gap,
						top: 540 - size * 0.68,
						fontWeight: weight,
						fontSize: size,
						fontFamily: SANS,
						letterSpacing: "-0.03em",
						lineHeight: 1.3,
						color: rgbs(colour),
						whiteSpace: "pre",
					}}
				>
					{letters}
				</div>
			</div>
		</RefBox>
	);
}

export const TYPE_PRESETS = {
	"spruce-ground": {
		note: "spruce's ground: base fill + one concentric ring aura (`set`: arc | rim | heart | dark, or `rings`) centred at (cx, cy) with radii rx/ry, + soft blobs, + per-frame film grain. Keys {at, base, cx, cy, rx, ry, rs, ringA, grain, set, flash}; ease:'hold' for hard cuts.",
		nativeMs: 4000,
		params: {
			keys: [
				"array",
				"[{at:0, base:[246,243,236], set:'rim', cx:960, cy:540, rx:1100, ry:700}]",
				"ground states",
			],
			blobs: ["array", "[]", "[{c, keys:[{at,x,y,rx,ry,a}]}] soft ellipses"],
		},
		render: Ground,
	},
	"spruce-line": {
		note: "A centred line that grows word by word and RE-CENTRES as it grows (words land blurred and sharpen in ~200 ms). words [{text, at, mode: blur|drop|rise|ghost|cut, colour, icon: globe|branch, scale, outAt}]; or `type` {text, at, cps, caret} to type the line on with a gradient caret. `fill` = CSS gradient for the glyphs; `out` {at, dur, mode}. Pair with a scene `camera` for the pull-backs.",
		nativeMs: 1500,
		params: {
			words: ["array", "-", "word cues (role brand)"],
			size: ["number", "64", "px (reference 1920 frame)"],
			colour: ["rgb", "[17,17,17]", "ink"],
			type: ["object", "-", "{text, at, cps, caret:{fill, until}}"],
		},
		render: Line,
	},
	"spruce-letters": {
		note: "One word whose letters arrive from the middle outward, each blurred with a small vertical bob (the reference's 'creating' beat).",
		nativeMs: 900,
		params: {
			text: ["string", "creating", "the word (role brand)"],
			at: ["number", "0", "first letter (ms)"],
		},
		render: Letters,
	},
	"spruce-bubbles": {
		note: "The opening field of soft glossy spheres on cream (lilac top-left -> magenta -> orange), one labelled. keys {at, s (camera about focus), pale (0..1 field fades to ghost rings), lab (label bubble scale), labA, a}.",
		nativeMs: 1600,
		params: {
			label: ["string", "Today", "the labelled bubble's word"],
			keys: ["array", "-", "camera / fade keys"],
		},
		render: Bubbles,
	},
	"spruce-braces": {
		note: "Two gradient braces (pink top -> blue foot) that slide in from the frame edges and close on a line. keys {at, gap (px from centre), a}.",
		nativeMs: 1000,
		params: { keys: ["array", "-", "gap/opacity keys"], size: ["number", "520", "glyph px"] },
		render: Braces,
	},
	"spruce-counter": {
		note: "An oblique heavy number counting up on an ease-out over a gradient scribble drawn left -> right with a white dot head (the community-size beat). from/to, countAt/countEnd, drawAt/drawEnd (scene ms).",
		nativeMs: 1600,
		params: { from: ["number", "20000", "start"], to: ["number", "50000", "end (role brand)"] },
		render: Counter,
	},
	"spruce-orbs": {
		note: "Black ground with a violet haze and two glossy spheres (blue, red) drifting at the frame edges; one white word at a time in the centre. words [{text, at}], orbA/orbB keys {at,x,y,r}.",
		nativeMs: 1600,
		params: { words: ["array", "-", "[{text, at}] (role brand)"] },
		render: Orbs,
	},
	"spruce-bloom": {
		note: "The transition from type into the product: the camera falls into a giant letter, a scalloped pink flower opens with a 4-point star at its heart, and the star darkens and swells to become the next shot's ground. keys {at, letterS, flowerR, flowerA, rot, starR, starA, dark, groundA}.",
		nativeMs: 800,
		params: {
			keys: ["array", "-", "the morph keys"],
			letter: ["string", "a", "the letter fallen into"],
		},
		render: Bloom,
	},
	"spruce-lockup": {
		note: "The brand lockup: a round seed that morphs into the spruce mark (markAt/morphAt) and the wordmark revealing letter by letter (lettersAt, stepMs), blurred to sharp. keys {at, s} scale the group.",
		nativeMs: 1800,
		params: { name: ["string", "Spruce", "wordmark"], size: ["number", "250", "px"] },
		render: Lockup,
	},
};
