/**
 * spruce UI — the drawn product: the site wall, the laptop shots, the glowing
 * prompt pill, the app window (with its views), the button punch-ins, the
 * dialogs, the avatar row, the toolbar close-up, the toggle and the browser.
 *
 * Measured (reference px, 1920x1080 @30fps):
 *   - WALL f564-642: the first site fills the frame inside the opening star,
 *     the camera pulls back x2.27 onto a masonry wall of sites (gaps ~21 px at
 *     that scale), pans and punches into one site, then cuts to it on a
 *     laptop.
 *   - PILL f689-792: a black pill ~480 px tall at the start, glow ~350 px
 *     thick (orange -> red -> magenta -> lilac -> blue -> black); the prompt
 *     types at ~1 char/frame while the camera drifts left; pull-back to ~150
 *     px, a hand presses send, the pill narrows and its text squeezes away,
 *     then it grows into the app window inside the same glow.
 *   - WINDOW: a 1.54:1 editor (dark chat column | white preview). Seen flat
 *     in a glow frame, tilted in perspective (rotateX/Y ~8-14 deg) for the
 *     "after" shots, and at x2.5-3 for the prompt-box close-ups.
 *   - PUNCH-INS: Invite/Publish at ~90 px type on a white card; a dialog at
 *     ~2.2x; the white hand cursor always travels and presses (scale 0.88).
 *
 * Every window takes footage: `src` (an .mp4 of YOUR app) replaces the drawn
 * view and keeps every camera key. Pictures are `images` slots.
 */
import React from "react";
import { clamp01 } from "../../../src/lib/textcards/src/easing.js";
import { videoRef } from "../../../src/lib/textcards/src/video-sources.js";
import {
	Aura,
	blinkOn,
	expo,
	Grain,
	H,
	Hand,
	hash,
	kf,
	localMs,
	MONO,
	NamedCursor,
	RefBox,
	rgbs,
	SANS,
	textW,
	typed,
	W,
} from "./spruce-shared.jsx";

// ── small drawing helpers ─────────────────────────────────────────────────

const box = (x, y, w, h, bg, r = 0, extra = {}) => ({
	position: "absolute",
	left: x,
	top: y,
	width: w,
	height: h,
	background: bg,
	borderRadius: r,
	...extra,
});
const T = (x, y, text, size, colour, weight = 500, extra = {}) => (
	<div
		style={{
			position: "absolute",
			left: x,
			top: y,
			fontWeight: weight,
			fontSize: size,
			fontFamily: SANS,
			color: colour,
			whiteSpace: "pre",
			lineHeight: 1.15,
			...extra,
		}}
	>
		{text}
	</div>
);
const Bar = ({ x, y, w, h = 10, c = "#e8e8ec", r = 5 }) => <div style={box(x, y, w, h, c, r)} />;

/** Soft "photo" stand-in: a gradient tile with a simple subject. */
function Pic({ x, y, w, h, a = [180, 210, 230], b = [120, 150, 200], subject = "blob", r = 10 }) {
	return (
		<div
			style={box(x, y, w, h, `linear-gradient(160deg, ${rgbs(a)}, ${rgbs(b)})`, r, {
				overflow: "hidden",
			})}
		>
			{subject === "person" ? (
				<>
					<div style={box(w * 0.36, h * 0.18, w * 0.28, w * 0.28, "rgba(60,40,40,0.55)", "50%")} />
					<div
						style={box(
							w * 0.2,
							h * 0.18 + w * 0.3,
							w * 0.6,
							h,
							"rgba(40,30,30,0.6)",
							`${w * 0.3}px ${w * 0.3}px 0 0`,
						)}
					/>
				</>
			) : subject === "building" ? (
				<>
					<div style={box(w * 0.18, h * 0.3, w * 0.3, h * 0.7, "rgba(255,255,255,0.55)", 4)} />
					<div style={box(w * 0.5, h * 0.12, w * 0.32, h * 0.88, "rgba(255,255,255,0.8)", 4)} />
				</>
			) : (
				<div style={box(w * 0.3, h * 0.25, w * 0.4, h * 0.5, "rgba(255,255,255,0.45)", "40%")} />
			)}
		</div>
	);
}

// ── sites for the wall and the laptops ────────────────────────────────────

/** A drawn landing page at (w,h). kind: hero | summit | serif | stats | portrait | health | estate | ledger | calendar | northpeak */
export function Site({ kind, w, h, images = {} }) {
	const u = w / 1920; // authored on a 1920-wide page
	const s = (v) => v * u;
	const img = (name, x, y, ww, hh, fb) =>
		images[name] ? (
			<img alt="" src={images[name]} style={box(x, y, ww, hh, "none", 0, { objectFit: "cover" })} />
		) : (
			fb
		);
	const nav = (dark, brand) => (
		<>
			{T(s(70), s(34), brand, s(30), dark ? "#fff" : "#111", 700)}
			{["Home", "About", "Features", "Pricing", "Contact"].map((n, i) => (
				<React.Fragment key={n}>
					{T(s(760 + i * 120), s(40), n, s(20), dark ? "rgba(255,255,255,0.7)" : "#555", 500)}
				</React.Fragment>
			))}
			<div
				style={box(s(1650), s(28), s(190), s(52), dark ? "rgba(255,255,255,0.12)" : "#111", s(26))}
			/>
		</>
	);
	let body = null;
	if (kind === "hero") {
		body = (
			<div style={box(0, 0, w, h, "#130a2e")}>
				<div
					style={box(
						-s(400),
						s(560),
						s(2720),
						s(1400),
						"radial-gradient(ellipse 50% 38% at 50% 8%, #8a4cf0 0%, #4a1fa8 30%, #1a0b3d 62%, rgba(19,10,46,0) 75%)",
						"50%",
					)}
				/>
				<div
					style={box(-s(300), s(600), s(2520), s(900), "none", "50%", {
						borderTop: `${s(4)}px solid rgba(190,150,255,0.8)`,
					})}
				/>
				{nav(true, "✦ Orbitly")}
				{T(0, s(400), "Think Further,", s(84), "#fff", 400, { width: w, textAlign: "center" })}
				{T(0, s(500), "Build Brighter", s(84), "#a78bfa", 400, { width: w, textAlign: "center" })}
				{["Northwind", "Quanta", "Fieldbox", "Lumio", "Parcel"].map((n, i) => (
					<React.Fragment key={n}>
						{T(s(260 + i * 300), s(980), n, s(26), "rgba(255,255,255,0.8)", 600)}
					</React.Fragment>
				))}
			</div>
		);
	} else if (kind === "summit") {
		body = (
			<div style={box(0, 0, w, h, "#fff")}>
				{nav(false, "▲ summit")}
				{T(s(40), s(110), "Summit", s(470), "#e8322b", 800, { letterSpacing: "-0.05em" })}
				{img(
					"product",
					s(640),
					s(260),
					s(760),
					s(560),
					<>
						<div
							style={box(
								s(780),
								s(330),
								s(420),
								s(470),
								"linear-gradient(180deg,#5a5f66,#2b2f35)",
								s(90),
							)}
						/>
						<div style={box(s(840), s(250), s(300), s(140), "#3a3f45", s(70))} />
						<div style={box(s(820), s(560), s(360), s(120), "#e8322b", s(30))} />
					</>,
				)}
				{T(s(70), s(800), "Trail-ready packs", s(30), "#111", 700)}
				<Bar x={s(70)} y={s(850)} w={s(380)} h={s(12)} c="#ccc" />
				<Bar x={s(70)} y={s(875)} w={s(320)} h={s(12)} c="#ddd" />
				<div style={box(s(1560), s(760), s(150), s(110), "#f1c40f", s(8))} />
				<div style={box(s(1730), s(760), s(150), s(110), "#d0d4d9", s(8))} />
			</div>
		);
	} else if (kind === "serif") {
		body = (
			<div style={box(0, 0, w, h, "#fbfaf7")}>
				{T(s(60), s(40), "Atelier Nord", s(30), "#111", 600)}
				{T(s(60), s(260), "Designing", s(240), "#111", 400, {
					fontFamily: "Georgia, serif",
					letterSpacing: "-0.04em",
				})}
				{T(s(260), s(520), "Interiors", s(240), "#111", 400, {
					fontFamily: "Georgia, serif",
					fontStyle: "italic",
					letterSpacing: "-0.04em",
				})}
				<div style={box(s(90), s(560), s(110), s(110), "#3b82f6", "50%")} />
				{img(
					"serif",
					s(1360),
					s(60),
					s(500),
					s(360),
					<Pic
						x={s(1360)}
						y={s(60)}
						w={s(500)}
						h={s(360)}
						a={[200, 190, 180]}
						b={[120, 110, 100]}
						subject="building"
					/>,
				)}
			</div>
		);
	} else if (kind === "stats") {
		body = (
			<div style={box(0, 0, w, h, "#0d0d10")}>
				<div style={box(s(820), s(120), s(520), s(440), "#3b82f6", s(8))}>
					{T(s(30), s(30), "Web design and\ndevelopment", s(44), "#fff", 500)}
					{T(s(30), s(280), "57%", s(110), "#fff", 500)}
				</div>
				<div style={box(s(80), s(500), s(560), s(460), "#f6f08a", s(8))}>
					{T(s(30), s(30), "Brand\nstrategy", s(44), "#111", 500)}
					{T(s(30), s(290), "43%", s(110), "#111", 500)}
				</div>
			</div>
		);
	} else if (kind === "portrait") {
		body = (
			<div style={box(0, 0, w, h, "linear-gradient(120deg,#d7d5d2,#b9b6b2)")}>
				{img(
					"portrait",
					s(1000),
					0,
					s(920),
					h,
					<Pic
						x={s(1000)}
						y={0}
						w={s(920)}
						h={h}
						a={[210, 200, 195]}
						b={[150, 130, 120]}
						subject="person"
						r={0}
					/>,
				)}
				{T(s(120), s(380), "MIRA\nVOSS", s(230), "rgba(255,255,255,0.92)", 300, {
					letterSpacing: "0.12em",
					lineHeight: 0.95,
				})}
			</div>
		);
	} else if (kind === "health") {
		body = (
			<div style={box(0, 0, w, h, "#f7f9fc")}>
				{T(s(60), s(40), "⚕ Wellnest", s(32), "#2563eb", 700)}
				{T(s(60), s(170), "Good morning, Iris!", s(64), "#1d4ed8", 600)}
				<div
					style={box(s(60), s(300), s(900), s(500), "#fff", s(16), {
						border: `${s(2)}px solid #e5e7eb`,
					})}
				>
					<svg width={s(900)} height={s(500)} style={{ position: "absolute", left: 0, top: 0 }}>
						<path
							d={`M${s(40)} ${s(380)} C ${s(200)} ${s(150)}, ${s(360)} ${s(420)}, ${s(520)} ${s(220)} S ${s(760)} ${s(160)}, ${s(860)} ${s(260)}`}
							fill="none"
							stroke="#3b82f6"
							strokeWidth={s(6)}
						/>
					</svg>
				</div>
				<div style={box(s(1020), s(300), s(420), s(500), "#3b82f6", s(20))} />
				{T(s(1500), s(320), "85%", s(90), "#111", 600)}
			</div>
		);
	} else if (kind === "estate") {
		body = (
			<div style={box(0, 0, w, h, "#eef3f8")}>
				{T(s(60), s(40), "DreamNest", s(32), "#0f172a", 700)}
				{img(
					"estate",
					s(900),
					s(140),
					s(960),
					s(900),
					<Pic
						x={s(900)}
						y={s(140)}
						w={s(960)}
						h={s(900)}
						a={[150, 200, 230]}
						b={[80, 140, 170]}
						subject="building"
						r={s(20)}
					/>,
				)}
				{T(s(60), s(300), "Find Your\nNext Home", s(190), "#1e3a5f", 800, { lineHeight: 0.95 })}
			</div>
		);
	} else if (kind === "ledger") {
		body = (
			<div style={box(0, 0, w, h, "#fff")}>
				{T(s(60), s(40), "Ledgerly", s(30), "#111", 700)}
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						style={box(s(60 + i * 620), s(140), s(580), s(380), "#f8fafc", s(14), {
							border: `${s(2)}px solid #eef0f4`,
						})}
					>
						{T(
							s(30),
							s(30),
							["Total income", "Total property", "Sales analytics"][i],
							s(28),
							"#555",
							500,
						)}
						{T(s(30), s(90), ["$500,000", "500", "$150,000"][i], s(56), "#111", 600)}
					</div>
				))}
				<div
					style={box(s(1300), s(600), s(260), s(260), "none", "50%", {
						border: `${s(30)}px solid #22c55e`,
						borderRightColor: "#e5e7eb",
					})}
				/>
			</div>
		);
	} else if (kind === "calendar") {
		body = (
			<div style={box(0, 0, w, h, "#fff")}>
				{Array.from({ length: 35 }).map((_, i) => (
					<div
						key={i}
						style={box(
							s(80 + (i % 7) * 250),
							s(80 + Math.floor(i / 7) * 190),
							s(200),
							s(150),
							i === 17 ? "#7dd3fc" : "#f1f5f9",
							s(12),
						)}
					/>
				))}
			</div>
		);
	} else if (kind === "northpeak") {
		body = (
			<div style={box(0, 0, w, h, "#fff")}>
				{T(s(80), s(50), "◆ Northpeak", s(44), "#111", 700)}
				{["About Us", "Features", "Pricing"].map((n, i) => (
					<React.Fragment key={n}>
						{T(s(1200 + i * 190), s(62), n, s(26), "#444", 500)}
					</React.Fragment>
				))}
				<div style={box(s(1730), s(46), s(140), s(60), "#111", s(30))} />
				{T(s(80), s(300), "Climb", s(150), "#111", 600, { letterSpacing: "-0.03em" })}
				{T(s(80), s(460), "Higher", s(150), "#111", 600, { letterSpacing: "-0.03em" })}
				{T(s(80), s(620), "Together", s(150), "#111", 600, { letterSpacing: "-0.03em" })}
				<div style={box(s(80), s(840), s(220), s(70), "#111", s(35))} />
				{img(
					"portrait",
					s(1080),
					s(200),
					s(640),
					s(740),
					<div
						style={box(
							s(1080),
							s(200),
							s(640),
							s(740),
							"linear-gradient(160deg,#f0a07a,#e2603e)",
							s(24),
							{ overflow: "hidden" },
						)}
					>
						<div style={box(s(220), s(140), s(220), s(260), "#3a2420", "50%")} />
						<div style={box(s(120), s(400), s(420), s(500), "#1f2a24", s(160))} />
					</div>,
				)}
				<div style={box(s(1000), s(720), s(300), s(150), "#14532d", s(16))}>
					{T(s(26), s(60), "$48K USD", s(40), "#fff", 600)}
				</div>
			</div>
		);
	} else {
		body = <div style={box(0, 0, w, h, "#f4f4f5")} />;
	}
	return (
		<div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, overflow: "hidden" }}>
			{body}
		</div>
	);
}

// ── the wall ──────────────────────────────────────────────────────────────

/** Masonry around the hero (hero = 1920x1080 at the origin, gap 48). */
const WALL = [
	{ kind: "hero", x: 0, y: 0, w: 1920, h: 1080 },
	{ kind: "serif", x: -1300, y: -620, w: 1252, h: 900 },
	{ kind: "stats", x: -1300, y: 328, w: 1252, h: 1100 },
	{ kind: "ledger", x: -1300, y: 1476, w: 1252, h: 640 },
	{ kind: "calendar", x: 0, y: -900, w: 1920, h: 852 },
	{ kind: "summit", x: 0, y: 1128, w: 1920, h: 1080 },
	{ kind: "portrait", x: 1968, y: -900, w: 1252, h: 1100 },
	{ kind: "health", x: 1968, y: 248, w: 1252, h: 1000 },
	{ kind: "estate", x: 1968, y: 1296, w: 1252, h: 900 },
	{ kind: "ledger", x: -2600, y: -300, w: 1252, h: 900 },
	{ kind: "portrait", x: -2600, y: 648, w: 1252, h: 1100 },
	{ kind: "calendar", x: 3268, y: -200, w: 1252, h: 900 },
	{ kind: "stats", x: 3268, y: 748, w: 1252, h: 900 },
	{ kind: "health", x: -1300, y: 2164, w: 1252, h: 900 },
	{ kind: "serif", x: 1968, y: 2244, w: 1252, h: 900 },
	{ kind: "estate", x: 0, y: 2256, w: 1920, h: 900 },
];

function starClip(cx, cy, R, pinch = 0.2, rot = 0.21) {
	const pt = (a, r) => [cx + r * Math.cos(a + rot), cy + r * Math.sin(a + rot)];
	const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
	let d = "";
	for (let i = 0; i < 4; i++) {
		const a0 = (i * Math.PI) / 2 - Math.PI / 2;
		if (i === 0) d += `M ${f(pt(a0, R))} `;
		d += `Q ${f(pt(a0 + Math.PI / 4, R * pinch))} ${f(pt(a0 + Math.PI / 2, R))} `;
	}
	return `path('${d}Z')`;
}

/**
 * keys {at, s, x, y, star} — the camera: canvas point (x, y) sits at the frame
 * centre at scale s (hero = 1920x1080 at the origin). `star` > 0 clips the
 * shot to the opening sparkle of that radius.
 */
function Wall(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const s = k.s ?? 1;
	const cx = k.x ?? 960;
	const cy = k.y ?? 540;
	const tx = 960 - cx * s;
	const ty = 540 - cy * s;
	const cards = (c.cards ?? WALL).filter((cd) => {
		const L = tx + cd.x * s;
		const Tp = ty + cd.y * s;
		return L < W && L + cd.w * s > 0 && Tp < H && Tp + cd.h * s > 0;
	});
	const clip =
		(k.star ?? 0) > 0 && k.star < 3000 ? starClip(960, 540, k.star, k.pinch ?? 0.2) : undefined;
	return (
		<RefBox z={c.z ?? 8}>
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: "#0b0614",
					clipPath: clip,
					WebkitClipPath: clip,
				}}
			>
				{cards.map((cd, i) => (
					<div
						key={i}
						style={{
							position: "absolute",
							left: tx + cd.x * s,
							top: ty + cd.y * s,
							width: cd.w,
							height: cd.h,
							transform: `scale(${s.toFixed(5)})`,
							transformOrigin: "0 0",
							borderRadius: 10 / Math.max(0.2, s),
							overflow: "hidden",
						}}
					>
						<Site kind={cd.kind} w={cd.w} h={cd.h} images={c.images?.[cd.kind] ?? {}} />
					</div>
				))}
			</div>
		</RefBox>
	);
}

// ── laptops ───────────────────────────────────────────────────────────────

/**
 * A laptop at 3/4 view on a set. setting: rock (dark mono stone) | desk
 * (warm wall, wood desk, a plant). keys {at, s, x, y}. `image` replaces the
 * whole shot with a photo slot; `site` names the page on its screen.
 */
function Laptop(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys ?? [{ at: 0, s: 1 }], ms);
	const s = k.s ?? 1;
	const rock = (c.setting ?? "rock") === "rock";
	if (c.image)
		return (
			<RefBox z={c.z ?? 8}>
				<img
					alt=""
					src={c.image}
					style={{
						position: "absolute",
						inset: 0,
						width: W,
						height: H,
						objectFit: "cover",
						transform: `scale(${s})`,
					}}
				/>
			</RefBox>
		);
	const set = rock ? (
		<>
			<div
				style={box(
					-200,
					-200,
					W + 400,
					H + 400,
					"linear-gradient(180deg,#8d8d8d 0%,#6f6f6f 45%,#3e3e3e 100%)",
				)}
			/>
			<div
				style={box(
					-300,
					620,
					2600,
					900,
					"radial-gradient(ellipse 60% 50% at 40% 40%, #5a5a5a 0%, #2c2c2c 60%, #1b1b1b 100%)",
					"45% 55% 0 0",
				)}
			/>
			<div
				style={box(
					1250,
					520,
					1100,
					800,
					"radial-gradient(ellipse 50% 50% at 50% 50%, #4a4a4a, #262626 70%)",
					"50% 40% 0 0",
				)}
			/>
		</>
	) : (
		<>
			<div
				style={box(
					-200,
					-200,
					W + 400,
					H + 400,
					"linear-gradient(180deg,#efe9e2 0%,#e6ddd3 60%,#d9cec2 100%)",
				)}
			/>
			<div
				style={box(
					-100,
					-80,
					900,
					700,
					"radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,255,255,0.7), rgba(255,255,255,0))",
				)}
			/>
			<div style={box(-200, 840, W + 400, 440, "linear-gradient(180deg,#9b6b48,#6e4a31)")} />
			<div
				style={box(
					1460,
					340,
					240,
					500,
					"linear-gradient(180deg,#d9d2c8,#bfb6aa)",
					"45% 45% 30% 30%",
				)}
			/>
			{[0, 1, 2, 3, 4, 5].map((i) => (
				<div
					key={i}
					style={box(1450 + Math.cos(i * 1.7) * 120, 110 + i * 40, 260, 70, "#4b5e3b", "60% 0", {
						transform: `rotate(${-40 + i * 22}deg)`,
						opacity: 0.85,
					})}
				/>
			))}
			<div style={box(140, 380, 120, 470, "linear-gradient(90deg,#cfcac3,#f4f1ec,#bdb7af)", 20)} />
		</>
	);
	const sw = 1180;
	const sh = 740;
	return (
		<RefBox z={c.z ?? 8}>
			<div
				style={{
					position: "absolute",
					inset: 0,
					transform: `translate(${k.x ?? 0}px,${k.y ?? 0}px) scale(${s.toFixed(4)})`,
					transformOrigin: "960px 540px",
				}}
			>
				{set}
				<div
					style={{
						position: "absolute",
						left: rock ? 470 : 400,
						top: rock ? 150 : 160,
						width: sw,
						height: sh + 300,
						perspective: 2600,
					}}
				>
					<div
						style={{
							position: "absolute",
							left: 0,
							top: 0,
							width: sw,
							height: sh,
							background: "#0c0c0d",
							borderRadius: 26,
							padding: 22,
							boxSizing: "border-box",
							transform: `rotateY(${c.yaw ?? 24}deg) rotateX(${c.pitch ?? 6}deg)`,
							transformOrigin: "50% 100%",
							boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
						}}
					>
						<div
							style={{
								position: "relative",
								width: sw - 44,
								height: sh - 44,
								borderRadius: 8,
								overflow: "hidden",
							}}
						>
							<Site kind={c.site ?? "summit"} w={sw - 44} h={sh - 44} images={c.images ?? {}} />
						</div>
					</div>
					<div
						style={{
							position: "absolute",
							left: -40,
							top: sh - 6,
							width: sw + 80,
							height: 300,
							background: "linear-gradient(180deg,#3a3a3c,#1d1d1f)",
							borderRadius: "0 0 30px 30px",
							transform: `rotateY(${c.yaw ?? 24}deg) rotateX(72deg)`,
							transformOrigin: "50% 0%",
						}}
					>
						<div
							style={box(
								110,
								30,
								sw - 140,
								170,
								"repeating-linear-gradient(90deg,#141415 0 54px,#2a2a2c 54px 60px)",
								10,
							)}
						/>
					</div>
				</div>
			</div>
			<Grain t={t} alpha={0.06} />
		</RefBox>
	);
}

// ── glow ──────────────────────────────────────────────────────────────────

/**
 * The layered aura around a rounded rect (pill or window), thickness G. Built
 * from the rect's exact distance field — four linear bands and four radial
 * corners — rather than box-shadow, whose software blur breaks into visible
 * nine-patch seams at these radii.
 */
const GLOW_RINGS = [
	[[244, 104, 40], 0, 1],
	[[242, 90, 34], 0.2, 1],
	[[238, 50, 56], 0.4, 1],
	[[236, 34, 120], 0.56, 1],
	[[230, 80, 200], 0.68, 1],
	[[176, 110, 245], 0.8, 1],
	[[90, 100, 245], 0.92, 0.95],
	[[40, 40, 140], 1.06, 0.45],
	[[0, 0, 0], 1.22, 0],
];
function GlowRect({ w, h, r, G, a = 1 }) {
	const rc = Math.min(r, w / 2, h / 2);
	const iw = Math.max(0, w - 2 * rc);
	const ih = Math.max(0, h - 2 * rc);
	const ext = rc + G * 1.22;
	const stops = (unit) =>
		GLOW_RINGS.map(
			([c, d, al]) => `${rgbs(c, al * a)} ${(((rc + d * G) / unit) * 100).toFixed(3)}%`,
		).join(", ");
	const lin = (dir) => `linear-gradient(${dir}, ${stops(ext)})`;
	const rad = (at) => `radial-gradient(circle ${ext.toFixed(1)}px at ${at}, ${stops(ext)})`;
	const o = 0.6; // overlap to hide anti-aliased joins
	return (
		<div
			style={{ position: "absolute", left: 0, top: 0, width: w, height: h, pointerEvents: "none" }}
		>
			<div style={box(rc - o, rc - ext, iw + 2 * o, ext, lin("to top"))} />
			<div style={box(rc - o, h - rc, iw + 2 * o, ext, lin("to bottom"))} />
			<div style={box(rc - ext, rc - o, ext, ih + 2 * o, lin("to left"))} />
			<div style={box(w - rc, rc - o, ext, ih + 2 * o, lin("to right"))} />
			<div style={box(rc - ext, rc - ext, ext + o, ext + o, rad("100% 100%"))} />
			<div style={box(w - rc - o, rc - ext, ext + o, ext + o, rad(`${o}px 100%`))} />
			<div style={box(rc - ext, h - rc - o, ext + o, ext + o, rad(`100% ${o}px`))} />
			<div style={box(w - rc - o, h - rc - o, ext + o, ext + o, rad(`${o}px ${o}px`))} />
		</div>
	);
}

// ── the prompt pill ───────────────────────────────────────────────────────

/**
 * keys {at, cx, cy, w, h, G, sq (text squeeze 1..0), btn, r} — the pill in
 * frame px. `type` {text, at, cps} types the prompt over a placeholder.
 * `hand` keys {at, x, y, press, a}.
 */
function Pill(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const w = k.w ?? 1100;
	const h = k.h ?? 150;
	const x = (k.cx ?? 960) - w / 2;
	const y = (k.cy ?? 540) - h / 2;
	const G = k.G ?? h * 0.8;
	const fs = (k.fh ?? h) * (c.fontK ?? 0.21);
	const tp = c.type ?? { text: "", at: 0 };
	const shown = typed(tp.text, ms, tp.at, tp.cps ?? 30);
	const sq = k.sq ?? 1;
	const hand = c.hand ? kf(c.hand, ms) : null;
	const bt = h * 0.42;
	return (
		<RefBox z={c.z ?? 10}>
			<div style={{ position: "absolute", inset: 0, background: "#000" }} />
			<div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
				<GlowRect w={w} h={h} r={Math.min(h / 2, k.r ?? h / 2)} G={G} a={k.glowA ?? 1} />
			</div>
			<div style={box(x, y, w, h, "#000", Math.min(h / 2, k.r ?? h / 2), { overflow: "hidden" })}>
				<div
					style={{
						position: "absolute",
						left: (k.fh ?? h) * 0.42,
						top: h / 2 - fs * 0.62,
						fontWeight: 400,
						fontSize: fs,
						fontFamily: SANS,
						color: shown ? "#fff" : "rgba(255,255,255,0.55)",
						whiteSpace: "pre",
						lineHeight: 1.2,
						transform: `scaleX(${Math.max(0.02, sq).toFixed(3)})`,
						transformOrigin: "0 50%",
						opacity: k.textA ?? 1,
					}}
				>
					{shown || c.placeholder || "Ask Spruce to build…"}
					{shown && shown.length < tp.text.length ? "|" : ""}
				</div>
				{(k.btn ?? 0) > 0 ? (
					<div
						style={box(w - h * 0.5 - bt / 2, h / 2 - bt / 2, bt, bt, "#3a3a3c", "50%", {
							opacity: k.btn,
						})}
					>
						<div style={box(bt * 0.32, bt * 0.32, bt * 0.36, bt * 0.36, "#ec2b6c", "50%")} />
					</div>
				) : null}
			</div>
			{hand && (hand.a ?? 1) > 0 ? (
				<Hand x={hand.x} y={hand.y} s={hand.s ?? 1} press={hand.press ?? 0} alpha={hand.a ?? 1} />
			) : null}
			<Grain t={t} alpha={0.12} />
		</RefBox>
	);
}

// ── the app window ────────────────────────────────────────────────────────

export const WIN = { w: 1540, h: 1000 };

function ChatPanel({
	w,
	h,
	msgs = [],
	input = "",
	placeholder = "Ask Spruce…",
	chip = "Select",
	chipOn = false,
	caret = false,
}) {
	return (
		<div style={box(0, 0, w, h, "#19191b")}>
			{msgs.map((m, i) => (
				<div key={i}>
					{m.user ? (
						<div style={box(w - 30 - m.w, m.y, m.w, 44, "#2c2c30", 12)}>
							{T(16, 11, m.text, 17, "#ddd", 500)}
						</div>
					) : (
						<>
							{T(26, m.y, m.title ?? "Spruce", 17, "#fff", 600)}
							{(m.lines ?? [0.9, 0.82, 0.86, 0.5]).map((l, j) => (
								<Bar key={j} x={26} y={m.y + 34 + j * 22} w={(w - 60) * l} h={9} c="#5a5a60" />
							))}
						</>
					)}
				</div>
			))}
			<div style={box(16, h - 132, w - 32, 116, "#232326", 16, { border: "1.5px solid #34343a" })}>
				{T(20, 16, input || placeholder, 18, input ? "#f2f2f2" : "#8d8d94", 400, {
					width: w - 72,
					whiteSpace: "pre-wrap",
				})}
				{caret ? (
					<div style={box(20 + textW(input.split("\n").pop(), 18, 400) + 2, 16, 2, 22, "#fff")} />
				) : null}
				{T(20, 74, "+", 22, "#aaa", 400)}
				{T(52, 76, "▣ Attach", 15, "#bbb", 500)}
				<div style={box(140, 70, 92, 30, chipOn ? "#2563eb" : "transparent", 8)}>
					{T(10, 6, `◎ ${chip}`, 15, chipOn ? "#fff" : "#bbb", 500)}
				</div>
				{T(246, 76, "⇄ Mode ⌄", 15, "#bbb", 500)}
				<div style={box(w - 32 - 46, 70, 30, 30, "#d4d4d8", "50%")} />
			</div>
		</div>
	);
}

/** Preview content per view (the white page inside the window). */
function Preview({ view, w, h, ms, c }) {
	if (view === "studio" || view === "studio2") {
		const side = view === "studio2";
		const pw = side ? w - 330 : w;
		const cw = (pw - 190) / 4;
		return (
			<div style={box(0, 0, w, h, "#fff")}>
				{T(28, 22, "Studio Flow.", 22, "#111", 800)}
				<div style={box(210, 18, 300, 34, "#f4f4f5", 17)}>
					{T(16, 8, "⌕  Find a class…", 14, "#999", 400)}
				</div>
				{["Home", "Classes", "Teachers", "Pricing"].map((n, i) => (
					<React.Fragment key={n}>
						{T(28, 100 + i * 38, n, 15, i === 1 ? "#111" : "#888", 500)}
					</React.Fragment>
				))}
				<div
					style={box(
						160,
						80,
						pw - 190,
						250,
						"linear-gradient(120deg,#c7d2fe 0%,#e0e7ff 40%,#ccfbf1 100%)",
						18,
					)}
				>
					{T(36, 50, "Find Your\nFlow Today", 40, "#111827", 600)}
					<div style={box(36, 170, 130, 38, "#0f766e", 19)}>
						{T(28, 10, "Book now", 15, "#fff", 600)}
					</div>
					<div
						style={box(pw - 520, 30, 220, 190, "linear-gradient(160deg,#a7f3d0,#5eead4)", "50%")}
					/>
				</div>
				{T(160, 360, "Popular classes", 20, "#111", 700)}
				{["Vinyasa", "Yin", "Power", "Breath"].map((n, i) => (
					<div
						key={n}
						style={box(160 + i * cw, 400, cw - 16, 34, i === 0 ? "#111" : "#f4f4f5", 17)}
					>
						{T(18, 8, n, 14, i === 0 ? "#fff" : "#555", 500)}
					</div>
				))}
				{[0, 1, 2, 3].map((i) => (
					<div
						key={i}
						style={box(
							160 + i * cw,
							456,
							cw - 16,
							230,
							["#fde68a", "#fbcfe8", "#bae6fd", "#ddd6fe"][i],
							14,
						)}
					>
						<div style={box(30, 40, cw - 76, 120, "rgba(255,255,255,0.55)", 60)} />
					</div>
				))}
				{side ? (
					<div
						style={box(w - 310, 80, 290, h - 110, "#fafafa", 16, { border: "1.5px solid #eee" })}
					>
						<div style={box(110, 24, 70, 70, "linear-gradient(160deg,#fcd5b5,#f59e7a)", "50%")} />
						{T(0, 104, "Ana Ruiz", 18, "#111", 700, { width: 290, textAlign: "center" })}
						{T(0, 130, "Member since 2024", 13, "#888", 400, { width: 290, textAlign: "center" })}
						{[
							"Mon  7:00  Vinyasa",
							"Tue  18:30  Yin",
							"Thu  12:00  Power",
							"Sat  9:00  Breath",
						].map((r, i) => (
							<div
								key={r}
								style={box(18, 176 + i * 52, 254, 42, i === 1 ? "#ede9fe" : "#fff", 10, {
									border: "1px solid #eee",
								})}
							>
								{T(14, 12, r, 13, "#333", 500)}
								{T(200, 12, `${[4, 2, 7, 5][i]} left`, 12, "#7c3aed", 600)}
							</div>
						))}
						<div style={box(18, h - 240, 254, 96, "linear-gradient(120deg,#a78bfa,#f472b6)", 14)}>
							{T(16, 14, "Classes this month", 13, "#fff", 500)}
							{T(16, 40, "18", 34, "#fff", 700)}
						</div>
					</div>
				) : null}
			</div>
		);
	}
	if (view === "dashboard" || view === "insights") {
		const ins = view === "insights";
		return (
			<div style={box(0, 0, w, h, ins ? "#f5f7fb" : "#fff")}>
				{T(28, 24, ins ? "Insights" : "Dashboard", 28, "#111", 700)}
				<div style={box(220, 22, 280, 36, "#f1f5f9", 18)}>
					{T(16, 9, "⌕  Search", 14, "#999", 400)}
				</div>
				{ins ? (
					<>
						<div style={box(28, 90, 300, 300, "linear-gradient(160deg,#3b82f6,#60a5fa)", 18)}>
							{T(24, 24, "Workforce", 20, "#fff", 600)}
							{T(24, 180, "1,256", 64, "#fff", 600)}
						</div>
						<div style={box(348, 90, 300, 300, "#fff", 18)}>
							{T(24, 24, "Hires", 20, "#333", 600)}
							{[0.4, 0.6, 0.8, 0.55, 0.9].map((v, i) => (
								<div
									key={i}
									style={box(
										30 + i * 52,
										270 - 180 * v,
										34,
										180 * v,
										"linear-gradient(180deg,#60a5fa,#2563eb)",
										6,
									)}
								/>
							))}
						</div>
						<div style={box(668, 90, 320, 300, "#fff", 18)}>
							{T(24, 24, "Payroll", 20, "#333", 600)}
							<div
								style={box(90, 90, 150, 150, "none", "50%", {
									border: "16px solid #3b82f6",
									borderLeftColor: "#e5e7eb",
									boxSizing: "border-box",
								})}
							/>
							{T(115, 152, "$210K", 22, "#111", 700)}
						</div>
						<div style={box(28, 410, 960, h - 440, "#fff", 18)}>
							{[0, 1, 2, 3].map((i) => (
								<Bar key={i} x={30} y={40 + i * 50} w={880 - i * 90} h={14} c="#e5e7eb" />
							))}
						</div>
					</>
				) : (
					<>
						<div style={box(28, 90, 420, 360, "#fafafa", 16, { border: "1.5px solid #eee" })}>
							{T(20, 18, "Expenses", 18, "#111", 600)}
							<svg
								width="220"
								height="220"
								style={{ position: "absolute", left: 30, top: 80 }}
								viewBox="0 0 42 42"
							>
								{[
									["#2563eb", 0, 35],
									["#f97316", 35, 25],
									["#111827", 60, 25],
									["#e11d48", 85, 15],
								].map(([col, off, len]) => (
									<circle
										key={col}
										cx="21"
										cy="21"
										r="15.9"
										fill="none"
										stroke={col}
										strokeWidth="6"
										strokeDasharray={`${len} ${100 - len}`}
										strokeDashoffset={25 - off}
									/>
								))}
							</svg>
							{["Rent", "Food", "Travel"].map((n, i) => (
								<React.Fragment key={n}>
									{T(280, 110 + i * 40, `● ${n}`, 15, "#555", 500)}
								</React.Fragment>
							))}
						</div>
						<div style={box(468, 90, 520, 360, "#fafafa", 16, { border: "1.5px solid #eee" })}>
							{T(20, 18, "Balance", 18, "#111", 600)}
							{T(20, 54, "$39,600.00", 26, "#111", 700)}
							<svg width="480" height="220" style={{ position: "absolute", left: 20, top: 120 }}>
								<path
									d="M0 150 C 40 60, 70 200, 110 120 S 170 30, 210 140 S 270 200, 310 90 S 380 160, 470 60"
									fill="none"
									stroke="#111"
									strokeWidth="3"
								/>
							</svg>
						</div>
						<div style={box(28, 470, 420, h - 500, "#fafafa", 16, { border: "1.5px solid #eee" })}>
							{[0.5, 0.75, 0.45, 0.9].map((v, i) => (
								<div
									key={i}
									style={box(
										40 + i * 90,
										(h - 520) * (1 - v),
										60,
										(h - 520) * v - 20,
										i === 3 ? "#c4b5fd" : "#0f5132",
										8,
									)}
								/>
							))}
						</div>
						<div style={box(468, 470, 520, h - 500, "#fafafa", 16, { border: "1.5px solid #eee" })}>
							{T(30, 30, "$86.32", 40, "#111", 700)}
							{T(30, 100, "91.7%", 40, "#111", 700)}
							{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
								<div
									key={i}
									style={box(
										260 + i * 28,
										150 - (hash(i) * 100 + 20),
										14,
										hash(i) * 100 + 20,
										"#f87171",
										4,
									)}
								/>
							))}
						</div>
					</>
				)}
			</div>
		);
	}
	if (view === "site") {
		// the visual-edit page: heading is c.heading, or retyped via headingType
		const ht = c.headingType
			? typed(c.headingType.text, ms, c.headingType.at, c.headingType.cps ?? 14)
			: null;
		const lines = (ht ?? c.heading ?? "Good Coffee.\nGood Mornings.").split("\n");
		const tint = c.tintAt != null && ms >= c.tintAt;
		const panel = c.panelAt != null && ms >= c.panelAt;
		return (
			<div style={box(0, 0, w, h, "#fff")}>
				<div style={box(0, 0, w, 6, "linear-gradient(90deg,#6366f1,#ec4899,#f97316,#eab308)")} />
				{T(40, 30, "HALFMOON", 20, "#111", 800, { letterSpacing: "0.08em" })}
				{["Home", "Menu", "About", "Visit"].map((n, i) => (
					<React.Fragment key={n}>{T(w * 0.36 + i * 100, 34, n, 15, "#555", 500)}</React.Fragment>
				))}
				<div style={box(w - 180, 26, 140, 36, "none", 18, { border: "1.5px solid #111" })}>
					{T(26, 8, "Order now", 14, "#111", 600)}
				</div>
				{panel ? (
					<div style={box(w * 0.07, h * 0.16, 110, 30, "#0ea5e9", 6)}>
						{T(14, 6, "Heading", 15, "#fff", 600)}
					</div>
				) : null}
				<div
					style={box(w * 0.07, h * 0.22, w * 0.6, 220, "transparent", 4, {
						border: panel ? "2px solid #7dd3fc" : "2px solid transparent",
					})}
				>
					{lines.map((ln, i) => (
						<React.Fragment key={i}>
							{T(20, 14 + i * 96, ln, 84, i === 1 && tint ? "#5b21b6" : "#111", 700, {
								letterSpacing: "-0.03em",
								background:
									i === 1 && c.selectAt != null && ms >= c.selectAt && !tint
										? "rgba(96,165,250,0.35)"
										: undefined,
							})}
						</React.Fragment>
					))}
				</div>
				{T(
					w * 0.07 + 20,
					h * 0.22 + 240,
					"Small-batch roasts and slow mornings, two blocks from the river.",
					18,
					"#666",
					400,
				)}
				<div style={box(w * 0.07 + 20, h * 0.22 + 300, 360, 52, "#f4f4f5", 26)} />
				<div
					style={box(w * 0.07 + 300, h * 0.22 + 306, 120, 40, "none", 20, {
						border: "2px solid #ec4899",
					})}
				>
					{T(18, 10, "Get notified", 13, "#111", 600)}
				</div>
				{panel ? (
					<div
						style={box(w * 0.67, h * 0.12, 330, 470, "#1c1c1f", 14, {
							boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
						})}
					>
						{T(20, 18, "⊤ Edit Text", 16, "#fff", 600)}
						{[
							["Content", lines[0] || "…"],
							["Margin", "32   32"],
							["Padding", "24   24"],
							["Text size", "Large"],
							["Weight", "Bold"],
						].map(([a, b], i) => (
							<div key={a}>
								{T(20, 64 + i * 56, a, 13, "#9a9aa2", 500)}
								<div style={box(120, 56 + i * 56, 190, 34, "#2b2b30", 8)}>
									{T(12, 9, b, 13, "#eee", 500)}
								</div>
							</div>
						))}
						{T(20, 352, "Align", 13, "#9a9aa2", 500)}
						{[0, 1, 2, 3].map((i) => (
							<div
								key={i}
								style={box(120 + i * 48, 344, 40, 32, i === 0 ? "#2563eb" : "#2b2b30", 6)}
							/>
						))}
						<div style={box(130, 412, 80, 34, "#2b2b30", 8)}>
							{T(12, 9, "Discard", 13, "#eee", 500)}
						</div>
						<div style={box(222, 412, 88, 34, "#2563eb", 8)}>
							{T(24, 9, "Save", 13, "#fff", 600)}
						</div>
					</div>
				) : null}
				{c.paletteAt != null && ms >= c.paletteAt ? (
					<div style={box(w * 0.015, h * 0.2, 170, 300, "#1c1c1f", 12)}>
						{["#6366f1", "#22c55e", "#ec4899", "#f97316"].map((col, r) =>
							[0, 1, 2, 3, 4].map((i) => (
								<div
									key={`${r}-${i}`}
									style={box(14 + i * 30, 30 + r * 64, 24, 24, col, 5, {
										opacity: 0.45 + i * 0.13,
									})}
								/>
							)),
						)}
					</div>
				) : null}
				<div
					style={box(
						w * 0.12,
						h * 0.72,
						w * 0.5,
						h * 0.4,
						"linear-gradient(180deg,#fdf2f8,#fff)",
						18,
						{ border: "1.5px solid #f1e4ec" },
					)}
				/>
			</div>
		);
	}
	return <div style={box(0, 0, w, h, "#fff")} />;
}

function CodeView({ w, h }) {
	const cols = ["#c084fc", "#93c5fd", "#86efac", "#fca5a5", "#e5e7eb"];
	return (
		<div style={box(0, 0, w, h, "#121214")}>
			<div style={box(0, 0, 230, h, "#18181b")}>
				{[
					"src",
					"  components",
					"    Hero.tsx",
					"    Nav.tsx",
					"  pages",
					"    index.tsx",
					"  styles.css",
					"package.json",
				].map((n, i) => (
					<React.Fragment key={n}>
						{T(18, 20 + i * 30, n, 14, i === 2 ? "#fff" : "#9ca3af", 500, { fontFamily: MONO })}
					</React.Fragment>
				))}
			</div>
			{Array.from({ length: 34 }).map((_, i) => {
				const ind = Math.floor(hash(i * 3.3) * 4);
				return (
					<div
						key={i}
						style={{
							position: "absolute",
							left: 260,
							top: 20 + i * 26,
							width: w - 280,
							height: 20,
						}}
					>
						{T(0, 0, String(i + 1).padStart(2, " "), 14, "#4b5563", 400, { fontFamily: MONO })}
						{[0, 1, 2].map((j) => (
							<div
								key={j}
								style={box(
									50 + ind * 24 + j * 150 + hash(i * 11 + j) * 30,
									4,
									30 + hash(i * 7 + j) * 110,
									12,
									cols[((i + j) * 7) % 5],
									3,
									{ opacity: 0.85 },
								)}
							/>
						))}
					</div>
				);
			})}
		</div>
	);
}

/**
 * The editor window. keys {at, x, y, s, rx, ry, rz, a, ca} (centre in frame
 * px, scale, tilt degrees, opacity, content opacity); `glowKeys` {at, G, a}
 * draws the aura frame; `view` picks the preview (studio | studio2 |
 * dashboard | insights | site | code); `chat` {msgs, chipOn}; `chatType`
 * types into the composer. `src` footage replaces the window contents.
 */
function Window(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const ww = c.w ?? WIN.w;
	const wh = c.h ?? WIN.h;
	const s = k.s ?? 1;
	const chatW = c.view === "code" ? 0 : (c.chatW ?? 420);
	const bar = 46;
	const gk = c.glowKeys ? kf(c.glowKeys, ms) : null;
	const chatIn = c.chatType
		? typed(c.chatType.text, ms, c.chatType.at, c.chatType.cps ?? 30)
		: (c.chat?.input ?? "");
	const hand = c.hand ? kf(c.hand, ms) : null;
	const cursors = (c.cursors ?? []).map((cu) => ({ ...cu, ...kf(cu.keys, ms) }));
	const content = c.src ? (
		<div
			ref={videoRef(c.id)}
			style={{ position: "absolute", inset: 0, borderRadius: 14, overflow: "hidden" }}
		/>
	) : (
		<>
			<div style={box(0, 0, ww, bar, "#141416")}>
				{T(18, 13, `◆ ${c.app ?? "Studio Flow"}  ⌄`, 16, "#eee", 600)}
				{T(ww * 0.5 - 30, 14, "▭ Home ⌄", 15, "#bbb", 500)}
				<div style={box(ww - 190, 9, 80, 28, "#2c2c30", 7)}>
					{T(18, 6, "Invite", 14, "#eee", 500)}
				</div>
				<div style={box(ww - 100, 9, 86, 28, "#2563eb", 7)}>
					{T(14, 6, "Publish", 14, "#fff", 600)}
				</div>
			</div>
			{chatW > 0 ? (
				<div style={box(0, bar, chatW, wh - bar, "#19191b")}>
					<ChatPanel
						w={chatW}
						h={wh - bar}
						msgs={
							c.chat?.msgs ?? [
								{ user: true, text: "Add a booking page", w: 200, y: 20 },
								{ y: 90 },
								{ y: 230, lines: [0.85, 0.7] },
							]
						}
						input={chatIn}
						caret={!!c.chatType && chatIn.length < c.chatType.text.length}
						chipOn={c.chat?.chipOn}
					/>
				</div>
			) : null}
			<div
				style={box(
					chatW + (chatW ? 10 : 0),
					bar + (chatW ? 10 : 0),
					ww - chatW - (chatW ? 20 : 0),
					wh - bar - (chatW ? 20 : 0),
					"#fff",
					chatW ? 12 : 0,
					{ overflow: "hidden" },
				)}
			>
				{c.view === "code" ? (
					<CodeView w={ww} h={wh - bar} />
				) : (
					<Preview
						view={c.view ?? "studio"}
						w={ww - chatW - (chatW ? 20 : 0)}
						h={wh - bar - (chatW ? 20 : 0)}
						ms={ms}
						c={c}
					/>
				)}
			</div>
		</>
	);
	return (
		<RefBox z={c.z ?? 10}>
			{c.ground ? (
				<Aura
					base={c.ground.base ?? [0, 0, 0]}
					ring={c.ground.ring}
					blobs={c.ground.blobs ?? []}
					grain={c.ground.grain ?? 0.14}
					t={t}
				/>
			) : null}
			<div
				style={{
					position: "absolute",
					inset: 0,
					perspective: c.perspective ?? 2400,
					perspectiveOrigin: "960px 540px",
				}}
			>
				<div
					style={{
						position: "absolute",
						left: (k.x ?? 960) - ww / 2,
						top: (k.y ?? 540) - wh / 2,
						width: ww,
						height: wh,
						transform: `scale(${s.toFixed(4)}) rotateX(${(k.rx ?? 0).toFixed(2)}deg) rotateY(${(k.ry ?? 0).toFixed(2)}deg) rotateZ(${(k.rz ?? 0).toFixed(2)}deg)`,
						transformOrigin: "50% 50%",
						opacity: k.a ?? 1,
					}}
				>
					{gk ? <GlowRect w={ww} h={wh} r={18} G={gk.G ?? 300} a={gk.a ?? 1} /> : null}
					<div
						style={box(0, 0, ww, wh, "#0e0e10", 18, {
							overflow: "hidden",
							border: "2px solid #2a2a2e",
							boxShadow: gk ? undefined : "0 30px 80px rgba(0,0,0,0.25)",
						})}
					>
						<div style={{ position: "absolute", inset: 0, opacity: k.ca ?? 1 }}>{content}</div>
					</div>
					{cursors.map((cu) => (
						<NamedCursor
							key={cu.name}
							x={cu.x}
							y={cu.y}
							name={cu.name}
							colour={cu.colour}
							s={1.2}
							alpha={cu.a ?? 1}
						/>
					))}
				</div>
			</div>
			{hand && (hand.a ?? 1) > 0 ? (
				<Hand x={hand.x} y={hand.y} s={hand.s ?? 1.4} press={hand.press ?? 0} alpha={hand.a ?? 1} />
			) : null}
			{c.grain ? <Grain t={t} alpha={c.grain} /> : null}
		</RefBox>
	);
}

// ── button punch-in ───────────────────────────────────────────────────────

/** Invite + Publish on a white card at punch-in scale. keys {at, x, y, s}; hand keys. */
function Buttons(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const s = k.s ?? 1;
	const hand = c.hand ? kf(c.hand, ms) : null;
	const hot = c.hot ?? "Invite";
	const pressHot = hand ? (hand.press ?? 0) : 0;
	return (
		<RefBox z={c.z ?? 10}>
			<div
				style={{
					position: "absolute",
					left: k.x ?? 960,
					top: k.y ?? 540,
					transform: `scale(${s.toFixed(4)})`,
					transformOrigin: "0 0",
				}}
			>
				<div
					style={box(-520, -150, 1500, 900, "#fbfaf8", 40, {
						boxShadow: "0 30px 80px rgba(150,80,90,0.12)",
					})}
				/>
				<div style={box(-430, 80, 1500, 760, "transparent", 30, { border: "3px solid #f0ece8" })} />
				<div
					style={box(
						-120,
						-60,
						230,
						100,
						hot === "Invite" && pressHot > 0.2 ? "#e4e4e7" : "#f1f1f3",
						18,
					)}
				>
					{T(0, 22, "Invite", 46, "#222", 500, { width: 230, textAlign: "center" })}
				</div>
				<div
					style={box(
						140,
						-60,
						270,
						100,
						hot === "Publish" && pressHot > 0.2 ? "#1d4ed8" : "#2563eb",
						18,
					)}
				>
					{T(0, 22, "Publish", 46, "#fff", 600, { width: 270, textAlign: "center" })}
				</div>
			</div>
			{hand && (hand.a ?? 1) > 0 ? (
				<Hand x={hand.x} y={hand.y} s={hand.s ?? 1.6} press={hand.press ?? 0} alpha={hand.a ?? 1} />
			) : null}
		</RefBox>
	);
}

// ── dialogs ───────────────────────────────────────────────────────────────

/**
 * kind invite: title, email typed, members list. kind publish: domain field
 * whose value cycles through `domains` [{at, text}] (each typed), Publish and
 * Manage buttons. keys {at, x, y, s, rz}; hand keys.
 */
function Dialog(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const s = k.s ?? 1;
	const hand = c.hand ? kf(c.hand, ms) : null;
	const inv = (c.kind ?? "invite") === "invite";
	let field = "";
	if (inv) field = c.email ? typed(c.email.text, ms, c.email.at, c.email.cps ?? 28) : "";
	else
		for (const d of c.domains ?? []) if (ms >= d.at) field = typed(d.text, ms, d.at, d.cps ?? 40);
	const dw = 560;
	const dh = inv ? 360 : 300;
	return (
		<RefBox z={c.z ?? 10}>
			<div
				style={{
					position: "absolute",
					left: (k.x ?? 960) - dw / 2,
					top: (k.y ?? 540) - dh / 2,
					width: dw,
					height: dh,
					transform: `scale(${s.toFixed(4)}) rotate(${(k.rz ?? 0).toFixed(2)}deg)`,
					transformOrigin: "50% 50%",
				}}
			>
				<div
					style={box(0, 0, dw, dh, "#fff", 16, {
						boxShadow: "0 24px 60px rgba(120,60,80,0.18)",
						border: "1.5px solid #eee",
					})}
				>
					{inv ? (
						<>
							{T(28, 24, "Invite", 22, "#111", 700)}
							<div style={box(28, 72, 380, 44, "#fafafa", 10, { border: "1.5px solid #e5e5e5" })}>
								{T(14, 12, field || "name@email.com", 16, field ? "#333" : "#aaa", 400)}
							</div>
							<div style={box(420, 72, 112, 44, "#f1f1f3", 10)}>
								{T(0, 12, "Invite", 16, "#111", 600, { width: 112, textAlign: "center" })}
							</div>
							{(
								c.members ?? [
									["Ana (You)", "Owner"],
									["Theo", "Editor"],
									["Maya", "Editor"],
								]
							).map(([n, r], i) => (
								<div key={n}>
									<div
										style={box(
											28,
											142 + i * 66,
											36,
											36,
											[
												"linear-gradient(160deg,#fcd5b5,#f59e7a)",
												"linear-gradient(160deg,#c7d2fe,#818cf8)",
												"linear-gradient(160deg,#fbcfe8,#f472b6)",
											][i % 3],
											"50%",
										)}
									/>
									{T(78, 150 + i * 66, n, 17, "#222", 600)}
									{T(430, 150 + i * 66, `${r} ⌄`, 15, "#666", 500)}
								</div>
							))}
						</>
					) : (
						<>
							{T(28, 24, "Publish", 22, "#111", 700)}
							{T(28, 62, "Publish your project to these\ndomains:", 18, "#666", 400)}
							<div style={box(28, 138, 500, 44, "#fff", 10)}>
								{T(0, 10, "⊕", 20, "#555", 400)}
								{T(34, 12, field, 18, "#222", 500)}
								{T(470, 10, "↗", 18, "#555", 500)}
							</div>
							<div style={box(28, 208, 120, 46, "#2563eb", 10)}>
								{T(0, 13, "Publish", 17, "#fff", 600, { width: 120, textAlign: "center" })}
							</div>
							<div style={box(170, 208, 200, 46, "#fff", 10)}>
								{T(0, 13, "Manage domains", 17, "#333", 600, { width: 200, textAlign: "center" })}
							</div>
						</>
					)}
				</div>
			</div>
			{hand && (hand.a ?? 1) > 0 ? (
				<Hand x={hand.x} y={hand.y} s={hand.s ?? 1.3} press={hand.press ?? 0} alpha={hand.a ?? 1} />
			) : null}
		</RefBox>
	);
}

// ── avatars and the toolbar ───────────────────────────────────────────────

const AV = [
	["#fcd5b5", "#e8956b"],
	["#c7a17a", "#7c5434"],
	["#fde2c4", "#d99a6c"],
	["#e8b896", "#a86b47"],
	["#f5d0b0", "#c98a5e"],
];

function Avatar({ x, y, d, i, images }) {
	const [a, b] = AV[i % AV.length];
	return (
		<div
			style={box(x - d / 2, y - d / 2, d, d, "#fff", "50%", {
				overflow: "hidden",
				boxShadow: "0 0 0 4px #fbfaf8",
			})}
		>
			{images?.[`avatar-${i + 1}`] ? (
				<img
					alt=""
					src={images[`avatar-${i + 1}`]}
					style={{ width: d, height: d, objectFit: "cover" }}
				/>
			) : (
				<div
					style={box(
						0,
						0,
						d,
						d,
						`linear-gradient(160deg, ${["#fde68a", "#bfdbfe", "#fbcfe8", "#bbf7d0", "#ddd6fe"][i % 5]}, #fff)`,
					)}
				>
					<div
						style={box(
							d * 0.3,
							d * 0.2,
							d * 0.4,
							d * 0.44,
							`linear-gradient(160deg, ${a}, ${b})`,
							"50%",
						)}
					/>
					<div
						style={box(
							d * 0.16,
							d * 0.62,
							d * 0.68,
							d * 0.6,
							`linear-gradient(160deg, ${b}, #555)`,
							"50% 50% 0 0",
						)}
					/>
				</div>
			)}
		</div>
	);
}

/**
 * keys {at, n (avatars shown, fractional = popping in), d (diameter), x, y,
 * overlap (0..1), bar (0..1 toolbar strip fades in), s}.
 */
function Avatars(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const n = k.n ?? 5;
	const d = k.d ?? 160;
	const ov = k.overlap ?? 0.2;
	const step = d * (1 - ov);
	const count = Math.ceil(n);
	const total = d + step * (count - 1);
	const x0 = (k.x ?? 960) - total / 2 + d / 2;
	const s = k.s ?? 1;
	return (
		<RefBox z={c.z ?? 10}>
			<div
				style={{
					position: "absolute",
					inset: 0,
					transform: `scale(${s.toFixed(4)})`,
					transformOrigin: `${k.x ?? 960}px ${k.y ?? 540}px`,
				}}
			>
				{(k.bar ?? 0) > 0 ? (
					<div
						style={box(-200, (k.y ?? 540) - d * 0.9, 2400, d * 1.8, "#fff", 0, {
							opacity: k.bar,
							boxShadow: "0 10px 40px rgba(150,80,90,0.08)",
						})}
					>
						{T(330, d * 0.55, "⟳", d * 0.5, "#333", 400)}
						{T(1440, d * 0.62, "Invite", d * 0.42, "#222", 500)}
						<div style={box(1740, d * 0.5, 400, d * 0.8, "#2563eb", 14)} />
					</div>
				) : null}
				{Array.from({ length: count }).map((_, i) => {
					const pop = clamp01(n - i);
					const e = expo(pop);
					if (pop <= 0) return null;
					return (
						<div
							key={i}
							style={{
								position: "absolute",
								left: 0,
								top: 0,
								opacity: clamp01(pop * 3),
								transform: `scale(${(0.6 + 0.4 * e).toFixed(3)})`,
								transformOrigin: `${x0 + i * step}px ${k.y ?? 540}px`,
							}}
						>
							<Avatar x={x0 + i * step} y={k.y ?? 540} d={d} i={i} images={c.images} />
						</div>
					);
				})}
			</div>
		</RefBox>
	);
}

/** The composer toolbar at punch-in scale: placeholder, Attach, the mode chip, Mode. keys {at, x, y, s, rz}; hand. */
function Toolbar(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const s = k.s ?? 1;
	const hand = c.hand ? kf(c.hand, ms) : null;
	const caret = blinkOn(ms, 500);
	const on = c.onAt == null || ms >= c.onAt;
	const ph = c.placeholder ?? "Ask Spruce…";
	return (
		<RefBox z={c.z ?? 10}>
			<div
				style={{
					position: "absolute",
					left: k.x ?? 960,
					top: k.y ?? 540,
					transform: `scale(${s.toFixed(4)}) rotate(${(k.rz ?? 0).toFixed(2)}deg)`,
					transformOrigin: "0 0",
				}}
			>
				<div
					style={box(-60, -120, 1600, 330, "#1f1f22", 34, {
						boxShadow: "0 30px 90px rgba(0,0,0,0.25)",
					})}
				/>
				{T(0, -84, ph, 46, "#f4f4f5", 400)}
				{caret ? <div style={box(textW(ph, 46, 400) + 6, -80, 4, 54, "#fff")} /> : null}
				{T(0, 30, "+", 52, "#aaa", 300)}
				{T(70, 36, "▣ Attach", 40, "#d4d4d8", 500)}
				<div style={box(270, 22, 210, 70, on ? "#2563eb" : "transparent", 14)}>
					{T(20, 13, `◎ ${c.chip ?? "Select"}`, 40, on ? "#fff" : "#d4d4d8", 500)}
				</div>
				{T(510, 36, "⇄ Mode ⌄", 40, "#d4d4d8", 500)}
			</div>
			{hand && (hand.a ?? 1) > 0 ? (
				<Hand x={hand.x} y={hand.y} s={hand.s ?? 1.5} press={hand.press ?? 0} alpha={hand.a ?? 1} />
			) : null}
		</RefBox>
	);
}

/** A single control at hero scale: the </> toggle (glows when pressed) or the select target. keys {at, s, glow, x, y}; hand. */
function Toggle(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const s = k.s ?? 1;
	const g = k.glow ?? 0;
	const hand = c.hand ? kf(c.hand, ms) : null;
	const target = c.icon === "target";
	const col = rgbs(c.colour ?? [255, 255, 255]);
	return (
		<RefBox z={c.z ?? 10}>
			{target ? null : (
				<Aura
					base={[0, 0, 0]}
					ring={{
						cx: 960,
						cy: 600,
						rx: 1500,
						ry: 1100,
						rings: [
							[[0, 0, 0], 0],
							[[0, 0, 0], 560],
							[[60, 10, 60], 760],
							[[200, 30, 120], 980],
							[[90, 60, 220], 1100],
						],
					}}
					grain={0.12}
					t={t}
				/>
			)}
			<div
				style={{
					position: "absolute",
					left: k.x ?? 960,
					top: k.y ?? 540,
					transform: `translate(-50%,-50%) scale(${s.toFixed(4)})`,
					opacity: k.a ?? 1,
					filter: (k.blur ?? 0) > 0.3 ? `blur(${k.blur.toFixed(1)}px)` : undefined,
				}}
			>
				{target ? (
					<svg width="300" height="300" viewBox="0 0 100 100" style={{ display: "block" }}>
						<circle cx="50" cy="50" r="30" fill="none" stroke={col} strokeWidth="9" />
						<circle cx="50" cy="50" r="11" fill={col} />
						{[0, 1, 2, 3].map((i) => (
							<rect
								key={i}
								x="45"
								y="2"
								width="10"
								height="16"
								rx="3"
								fill={col}
								transform={`rotate(${i * 90} 50 50)`}
							/>
						))}
					</svg>
				) : (
					<div style={{ position: "relative", width: 260, height: 140 }}>
						<div
							style={box(
								0,
								0,
								260,
								140,
								g > 0
									? `linear-gradient(90deg, rgba(110,124,245,${g}), rgba(236,72,153,${g}))`
									: "#2a2a2e",
								30,
								{
									boxShadow:
										g > 0 ? `0 0 ${60 * g}px ${20 * g}px rgba(236,72,153,${0.5 * g})` : "none",
								},
							)}
						/>
						<div style={box(10 + 110 * clamp01(g * 1.5), 10, 130, 120, "#3a3a3f", 24)}>
							{T(0, 30, "</>", 48, "#fff", 600, {
								width: 130,
								textAlign: "center",
								fontFamily: MONO,
							})}
						</div>
					</div>
				)}
			</div>
			{hand && (hand.a ?? 1) > 0 ? (
				<Hand x={hand.x} y={hand.y} s={hand.s ?? 1.6} press={hand.press ?? 0} alpha={hand.a ?? 1} />
			) : null}
		</RefBox>
	);
}

/** A browser window showing the published site at punch-in scale. keys {at, x, y, s, rz}. */
function Browser(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const s = k.s ?? 1;
	const bw = 1500;
	const bh = 900;
	return (
		<RefBox z={c.z ?? 10}>
			<div
				style={{
					position: "absolute",
					left: (k.x ?? 960) - bw / 2,
					top: (k.y ?? 540) - bh / 2,
					width: bw,
					height: bh,
					transform: `scale(${s.toFixed(4)}) rotate(${(k.rz ?? 0).toFixed(2)}deg)`,
					transformOrigin: "50% 50%",
				}}
			>
				<div
					style={box(0, 0, bw, bh, "#fff", 18, {
						overflow: "hidden",
						boxShadow: "0 30px 80px rgba(120,60,80,0.18)",
					})}
				>
					<div style={box(0, 0, bw, 96, "#f4f4f5")}>
						{["#ff5f57", "#febc2e", "#28c840"].map((col, i) => (
							<div key={col} style={box(24 + i * 26, 20, 16, 16, col, "50%")} />
						))}
						<div style={box(130, 10, 260, 36, "#fff", "10px 10px 0 0")}>
							{T(16, 8, c.tab ?? "Northpeak", 15, "#333", 500)}
						</div>
						{T(24, 58, "←  →  ⟳", 18, "#666", 400)}
						<div style={box(150, 52, 900, 34, "#fff", 17)}>
							{T(18, 8, `https://${c.url ?? "www.northpeak.app"}`, 15, "#555", 400)}
						</div>
					</div>
					<div
						style={{
							position: "absolute",
							left: 0,
							top: 96,
							width: bw,
							height: bh - 96,
							overflow: "hidden",
						}}
					>
						<Site kind={c.site ?? "northpeak"} w={bw} h={bh - 96} images={c.images ?? {}} />
					</div>
				</div>
			</div>
		</RefBox>
	);
}

/** Collaborator cursors over type: [{name, colour, keys:[{at,x,y,a}]}] in frame px. */
function Cursors(c, t) {
	const ms = localMs(c, t);
	return (
		<RefBox z={c.z ?? 12}>
			{(c.cursors ?? []).map((cu) => {
				const k = kf(cu.keys, ms);
				if ((k.a ?? 1) <= 0) return null;
				return (
					<NamedCursor
						key={cu.name}
						x={k.x}
						y={k.y}
						name={cu.name}
						colour={cu.colour}
						s={cu.s ?? 1.6}
						alpha={k.a ?? 1}
					/>
				);
			})}
		</RefBox>
	);
}

export const UI_PRESETS = {
	"spruce-cursors": {
		note: "Named collaborator cursors (arrow + name pill) travelling over the frame: cursors [{name, colour, s, keys:[{at, x, y, a}]}].",
		nativeMs: 1800,
		params: { cursors: ["array", "-", "the cursors (role product-voice)"] },
		render: Cursors,
	},
	"spruce-wall": {
		note: "The first site opening inside the bloom's sparkle (`star` radius), the camera pulling back onto a masonry wall of drawn sites, panning, and punching into one. keys {at, s, x, y, star} — canvas point (x,y) at frame centre, hero = 1920x1080 at the origin. `cards` overrides the wall; `images` {kind: {name: path}} fills picture slots.",
		nativeMs: 2600,
		params: {
			keys: ["array", "-", "camera keys"],
			cards: ["array", "built-in wall", "[{kind, x, y, w, h}]"],
		},
		render: Wall,
	},
	"spruce-laptop": {
		note: "The site on a laptop at 3/4 view: `setting` rock (dark stone) or desk (warm wall, wood, plant), `site` = the page on screen, slow keys {at, s, x, y}. `image` replaces the whole shot with your own product photo.",
		nativeMs: 1600,
		params: {
			setting: ["string", "rock", "rock | desk"],
			image: ["string", "-", "photo slot (replaces the drawn set)"],
		},
		render: Laptop,
	},
	"spruce-pill": {
		note: "The prompt as a black pill inside a thick orange->blue glow: `type` {text, at, cps} over a placeholder, keys {at, cx, cy, w, h, fh, G, sq (text squeeze), btn, r} for the camera drift, pull-back and the squeeze into a small rect; `hand` keys press send.",
		nativeMs: 3400,
		params: {
			type: ["object", "-", "{text, at, cps} (role user-voice)"],
			keys: ["array", "-", "pill geometry keys"],
		},
		render: Pill,
	},
	"spruce-window": {
		note: "The app editor window (dark chat | white preview) — flat in a glow frame (`glowKeys` {at, G, a}), tilted in perspective (keys rx/ry/rz) or at x2.5-3 for close-ups. keys {at, x, y, s, rx, ry, rz, a, ca}. view: studio | studio2 | dashboard | insights | site | code. `chatType` types into the composer; `cursors` [{name, colour, keys}] are collaborators; `ground` draws an aura behind; `src` = your recording.",
		nativeMs: 1600,
		params: {
			view: ["string", "studio", "the preview"],
			keys: ["array", "-", "camera keys"],
			src: ["string", "-", "footage slot (.mp4)"],
		},
		render: Window,
	},
	"spruce-buttons": {
		note: "Invite + Publish on a white card at punch-in scale (46 px type at s 1; the reference reads ~90 px, so s ~2); keys {at, x, y, s}; `hot` names the button the hand presses.",
		nativeMs: 1000,
		params: {
			hot: ["string", "Invite", "Invite | Publish"],
			hand: ["array", "-", "hand keys {at,x,y,press,a}"],
		},
		render: Buttons,
	},
	"spruce-dialog": {
		note: "A white dialog at punch-in scale: kind invite (email typed, member list) or publish (domain field cycling through `domains` [{at, text}], each typed). keys {at, x, y, s, rz}; hand keys.",
		nativeMs: 2000,
		params: {
			kind: ["string", "invite", "invite | publish"],
			domains: ["array", "-", "[{at, text}] (role product-voice)"],
		},
		render: Dialog,
	},
	"spruce-avatars": {
		note: "Collaborator avatars popping in one by one, closing into an overlapping row, then a toolbar strip fading in around them. keys {at, n, d, overlap, bar, s, x, y}. `images` {avatar-1..5}.",
		nativeMs: 1800,
		params: { keys: ["array", "-", "row keys"] },
		render: Avatars,
	},
	"spruce-toolbar": {
		note: "The composer toolbar at punch-in scale (placeholder with caret, Attach, the blue mode chip, Mode); keys {at, x, y, s, rz}; `onAt` lights the chip; hand keys.",
		nativeMs: 1800,
		params: { chip: ["string", "Select", "the mode chip label"] },
		render: Toolbar,
	},
	"spruce-toggle": {
		note: "A single control at hero scale: icon 'code' (a </> toggle on black that slides and glows when pressed) or 'target' (a white select-target glyph; put it over a ground). keys {at, s, glow, x, y}; hand keys.",
		nativeMs: 1400,
		params: { icon: ["string", "code", "code | target"] },
		render: Toggle,
	},
	"spruce-browser": {
		note: "A browser window showing the published site at punch-in scale; keys {at, x, y, s, rz}; `url`, `tab`, `site`.",
		nativeMs: 1600,
		params: { url: ["string", "www.northpeak.app", "address bar"] },
		render: Browser,
	},
};
