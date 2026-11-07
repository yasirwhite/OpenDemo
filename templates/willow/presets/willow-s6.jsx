/**
 * willow-s6.jsx — presets for willow section 6 (63.583s – 76.958s of the
 * Strawberry launch film). Every render is a pure function of t.
 *
 * Measured off full-decode 1280x720 frames f01526–f01846 (notes in
 * .demo-build/nightly/2026-10-30/willow/sections/s6/notes.md). Most motion
 * here is carried by DENSE measured keys (one per source frame, the film's
 * own 20fps cadence) interpolated linearly — the reference curves are
 * asymmetric (slow ramp, violent middle, long settle) and a named ease
 * misplaces their peak.
 *
 *   willow-library      a library/drive window drawn generically (header, tab
 *                       pills, avatar stack, folder grid | empty grid | 3x2
 *                       document cards) under ONE layer camera, with role-tagged
 *                       agent cursors that drag chip/slide groups.
 *   willow-counter-type kinetic counter copy: a ticking number word inside a
 *                       one/two-line block, words that pop in place, scale
 *                       about a fixed anchor from a measured table.
 *   willow-glyph-cloud  a cloud of neutral app-glyph tiles (third-party logos
 *                       replaced) with depth parallax on a field zoom.
 *   willow-quote-stack  a cover-flow stack of testimonial cards advanced by a
 *                       progress channel, front card "lift", depth blur, camera.
 *   willow-avatar-grid  pastel avatar tiles popping in from the centre on a
 *                       receding lattice (character heads -> neutral tiles).
 */
import React from "react";
import { clamp01, lerp } from "../../../src/lib/textcards/src/easing.js";
import { Avatar, FONT, kf, live, localMs, rgbs, W } from "./willow-shared.jsx";

// ── small helpers ─────────────────────────────────────────────────────────

const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const easeOutCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
/** linear interpolation over [{at, v}] (scene ms), clamped at both ends */
function table(keys, ms, ch = "v", dflt = 0) {
	if (!keys || !keys.length) return dflt;
	const k = kf(keys, ms);
	return k[ch] ?? dflt;
}

// ── agent cursor (role-tagged arrow) ──────────────────────────────────────

/**
 * Measured at f1541/f1606: a navigation-arrow kite ~33px across with a 2.5px
 * white rim and a soft drop, filled with the role colour going lighter toward
 * the tail; the tag (rounded, white 21px label) hangs ~50px below the TIP,
 * left-aligned to it for a normal arrow (tip up-left) and right-aligned for a
 * mirrored one (tip up-right). Tag colours: Founder [132,148,192], Sales
 * [214,112,116], Product [138,199,161], Marketing [188,148,230].
 */
export function RoleCursor({ x, y, colour, label, flip = false, size = 1, opacity = 1, id = "c" }) {
	const light = mix(colour, [255, 255, 255], 0.42);
	const gid = `s6g-${id}`;
	return (
		<div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, opacity }}>
			<svg
				width={48}
				height={48}
				viewBox="-4 -4 48 48"
				style={{
					position: "absolute",
					left: -4,
					top: -4,
					overflow: "visible",
					transform: `scale(${flip ? -size : size},${size})`,
					transformOrigin: "4px 4px",
					filter: "drop-shadow(0 2px 3px rgba(20,20,40,0.25))",
				}}
			>
				<defs>
					<linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
						<stop offset="0" stopColor={rgbs(colour)} />
						<stop offset="1" stopColor={rgbs(light)} />
					</linearGradient>
				</defs>
				<path
					d="M0 0 L37 15 L19 19 L15 37 Z"
					fill={`url(#${gid})`}
					stroke="#fff"
					strokeWidth="2.6"
					strokeLinejoin="round"
				/>
			</svg>
			{label ? (
				<div
					style={{
						position: "absolute",
						top: 50 * size,
						...(flip ? { right: 2 * size } : { left: 2 * size }),
						padding: `${4 * size}px ${11 * size}px ${5 * size}px`,
						borderRadius: 7 * size,
						background: rgbs(colour),
						color: "#fff",
						whiteSpace: "nowrap",
						font: `500 ${22 * size}px ${FONT}`,
						lineHeight: `${26 * size}px`,
						letterSpacing: "0.005em",
						boxShadow: `0 ${2 * size}px ${6 * size}px rgba(30,30,60,0.16)`,
					}}
				>
					{label}
				</div>
			) : null}
		</div>
	);
}

// ── library window pieces (layer space = the window at rest, 1280x720) ────

const ICON_BLUE = [84, 164, 222];
const CARD_GREY = [241, 243, 240];

function FolderGlyph({ cx, cy, s = 1 }) {
	return (
		<svg
			width={34 * s}
			height={30 * s}
			viewBox="0 0 34 30"
			style={{ position: "absolute", left: cx - 17 * s, top: cy - 15 * s }}
		>
			<path
				d="M3.5 6.5a3 3 0 0 1 3-3h7l3.4 3.6h10.6a3 3 0 0 1 3 3v13.4a3 3 0 0 1-3 3H6.5a3 3 0 0 1-3-3Z"
				fill="none"
				stroke={rgbs(ICON_BLUE)}
				strokeWidth="2.7"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** generic app glyph inside a small tile — the neutral stand-in for a brand icon */
function Glyph({ kind = "disc", colour = [120, 132, 196], size = 20, colours = null }) {
	const c = rgbs(colour);
	const s = size;
	const box = { position: "relative", width: s, height: s, flex: "none" };
	if (kind === "dots") {
		const cs = colours ?? [
			[224, 30, 90],
			[54, 197, 240],
			[46, 182, 125],
			[236, 178, 46],
		];
		return (
			<div style={box}>
				{cs.map((q, i) => (
					<div
						key={i}
						style={{
							position: "absolute",
							width: s * 0.36,
							height: s * 0.36,
							borderRadius: "50%",
							background: rgbs(q),
							left: (i % 2) * s * 0.52 + s * 0.06,
							top: Math.floor(i / 2) * s * 0.52 + s * 0.06,
						}}
					/>
				))}
			</div>
		);
	}
	if (kind === "ring")
		return (
			<div
				style={{
					...box,
					borderRadius: "50%",
					boxSizing: "border-box",
					border: `${s * 0.17}px solid ${c}`,
				}}
			/>
		);
	if (kind === "bars") {
		return (
			<div
				style={{
					...box,
					display: "flex",
					alignItems: "flex-end",
					gap: s * 0.1,
					justifyContent: "center",
				}}
			>
				{[0.55, 0.9, 0.7].map((h, i) => (
					<div
						key={i}
						style={{ width: s * 0.22, height: s * h, borderRadius: s * 0.06, background: c }}
					/>
				))}
			</div>
		);
	}
	if (kind === "doc") {
		return (
			<div style={{ ...box, display: "flex", justifyContent: "center" }}>
				<div
					style={{
						width: s * 0.72,
						height: s,
						borderRadius: s * 0.1,
						background: c,
						position: "relative",
					}}
				>
					{[0.42, 0.6].map((y, i) => (
						<div
							key={i}
							style={{
								position: "absolute",
								left: s * 0.16,
								top: s * y,
								width: s * 0.4,
								height: s * 0.07,
								background: "rgba(255,255,255,0.9)",
								borderRadius: 2,
							}}
						/>
					))}
				</div>
			</div>
		);
	}
	if (kind === "env") {
		return (
			<div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center" }}>
				<svg width={s} height={s * 0.78} viewBox="0 0 20 15.6">
					<rect
						x="1.5"
						y="1.5"
						width="17"
						height="12.6"
						rx="2.2"
						fill="none"
						stroke={c}
						strokeWidth="2.4"
					/>
					<path
						d="M3 3.5 L10 9 L17 3.5"
						fill="none"
						stroke={c}
						strokeWidth="2.2"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				</svg>
			</div>
		);
	}
	if (kind === "sheet") {
		return (
			<div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center" }}>
				<div
					style={{
						width: s,
						height: s * 0.74,
						borderRadius: s * 0.12,
						background: c,
						position: "relative",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: s * 0.14,
							right: s * 0.14,
							top: s * 0.42,
							height: s * 0.08,
							background: "rgba(255,255,255,0.9)",
						}}
					/>
				</div>
			</div>
		);
	}
	if (kind === "slide") {
		return (
			<div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center" }}>
				<div
					style={{
						width: s,
						height: s * 0.8,
						borderRadius: s * 0.14,
						background: c,
						position: "relative",
					}}
				>
					<div
						style={{
							position: "absolute",
							left: s * 0.18,
							right: s * 0.18,
							top: s * 0.2,
							bottom: s * 0.2,
							borderRadius: s * 0.05,
							background: "rgba(255,255,255,0.85)",
						}}
					/>
				</div>
			</div>
		);
	}
	if (kind === "tri") {
		return (
			<svg width={s} height={s} viewBox="0 0 20 20" style={{ flex: "none" }}>
				<path
					d="M10 2 L18.5 17 L1.5 17 Z"
					fill={c}
					stroke={c}
					strokeWidth="2"
					strokeLinejoin="round"
				/>
			</svg>
		);
	}
	if (kind === "heart") {
		return (
			<svg width={s} height={s} viewBox="0 0 20 20" style={{ flex: "none" }}>
				<path
					d="M10 17.5 C3 12.5 1.5 9.5 1.5 6.8 A4.3 4.3 0 0 1 10 5 A4.3 4.3 0 0 1 18.5 6.8 C18.5 9.5 17 12.5 10 17.5Z"
					fill={c}
				/>
			</svg>
		);
	}
	if (kind === "play") {
		return (
			<div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center" }}>
				<div
					style={{
						width: s,
						height: s * 0.7,
						borderRadius: s * 0.2,
						background: c,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<svg width={s * 0.36} height={s * 0.36} viewBox="0 0 10 10">
						<path d="M2 1 L9 5 L2 9Z" fill="#fff" />
					</svg>
				</div>
			</div>
		);
	}
	if (kind === "square") return <div style={{ ...box, borderRadius: s * 0.24, background: c }} />;
	return <div style={{ ...box, borderRadius: "50%", background: c }} />; // disc
}

function Chip({ x, y, w = 208, h = 58, rot = 0, title, sub, icon = "disc", colour, opacity = 1 }) {
	return (
		<div
			style={{
				position: "absolute",
				left: x - w / 2,
				top: y - h / 2,
				width: w,
				height: h,
				opacity,
				transform: `rotate(${rot}deg)`,
				borderRadius: 12,
				background: "#fff",
				boxShadow: "0 8px 22px rgba(40,30,70,0.12), 0 1px 4px rgba(40,30,70,0.08)",
				display: "flex",
				alignItems: "center",
				gap: 10,
				padding: "0 14px",
				boxSizing: "border-box",
				overflow: "hidden",
			}}
		>
			<Glyph kind={icon} colour={colour} size={24} />
			<div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
				<div style={{ font: `600 13.5px ${FONT}`, color: "rgb(28,28,30)", whiteSpace: "nowrap" }}>
					{title}
				</div>
				<div
					style={{
						font: `400 13px ${FONT}`,
						color: "rgb(120,122,128)",
						whiteSpace: "nowrap",
						marginTop: 1,
					}}
				>
					{sub}
				</div>
			</div>
		</div>
	);
}

/** a slide/poster card as a drawn generic: warm fill, a mark, a short headline */
function SlideCard({
	x,
	y,
	w = 148,
	h = 160,
	rot = 0,
	fill = [250, 211, 190],
	ink = [236, 108, 60],
	text = "",
	opacity = 1,
	mark = true,
}) {
	return (
		<div
			style={{
				position: "absolute",
				left: x - w / 2,
				top: y - h / 2,
				width: w,
				height: h,
				opacity,
				transform: `rotate(${rot}deg)`,
				borderRadius: 12,
				background: rgbs(fill),
				overflow: "hidden",
				boxShadow: "0 8px 22px rgba(120,60,30,0.16)",
				boxSizing: "border-box",
				padding: "14px 14px",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 8,
			}}
		>
			{mark ? (
				<div
					style={{
						width: 16,
						height: 16,
						borderRadius: 4,
						border: `2.5px solid ${rgbs(ink)}`,
						flex: "none",
						marginTop: 4,
					}}
				/>
			) : null}
			<div
				style={{
					font: `700 ${Math.round(w * 0.135)}px ${FONT}`,
					color: rgbs(ink),
					textAlign: "center",
					lineHeight: 1.0,
					letterSpacing: "-0.02em",
				}}
			>
				{text}
			</div>
		</div>
	);
}

/** document thumbnail skeletons for the campaign cards (generic, drawn) */
function Thumb({ kind, w, h, accent = [236, 108, 60], title = "" }) {
	const line = (wd, key, mt = 6, c = [214, 216, 220]) => (
		<div
			key={key}
			style={{ width: wd, height: 4, borderRadius: 2, background: rgbs(c), marginTop: mt }}
		/>
	);
	const base = { position: "absolute", inset: 0, overflow: "hidden", boxSizing: "border-box" };
	if (kind === "sheet") {
		const cols = 5,
			rows = 9,
			cw = (w - 20) / cols,
			rh = 11;
		return (
			<div style={{ ...base, padding: "10px 10px" }}>
				{Array.from({ length: rows }).map((_, r) => (
					<div
						key={r}
						style={{ display: "flex", height: rh, borderBottom: "1px solid rgb(228,230,232)" }}
					>
						{Array.from({ length: cols }).map((__, c2) => (
							<div
								key={c2}
								style={{
									width: cw,
									borderRight: "1px solid rgb(228,230,232)",
									boxSizing: "border-box",
									background:
										r === 1 && c2 < 4
											? rgbs(
													[
														[205, 214, 240],
														[240, 206, 206],
														[226, 214, 240],
														[206, 232, 206],
													][c2],
												)
											: "transparent",
									padding: "3px 3px",
								}}
							>
								{r > 1 && r < 7 ? (
									<div
										style={{
											height: 3,
											width: cw * 0.6,
											background: "rgb(200,202,206)",
											borderRadius: 1,
										}}
									/>
								) : null}
							</div>
						))}
					</div>
				))}
			</div>
		);
	}
	if (kind === "chart") {
		const bars = [
			[0.84, [242, 140, 120]],
			[0.76, [178, 160, 236]],
			[0.69, [150, 214, 168]],
			[0.63, [170, 206, 240]],
			[0.58, [236, 232, 160]],
			[0.42, [232, 170, 220]],
		];
		return (
			<div style={{ ...base, padding: "10px 12px" }}>
				<div style={{ font: `500 12px ${FONT}`, color: "rgb(40,40,44)" }}>{title}</div>
				{line(w * 0.45, "l", 5)}
				<div
					style={{
						position: "absolute",
						left: 12,
						right: 12,
						bottom: 0,
						height: h * 0.62,
						display: "flex",
						alignItems: "flex-end",
						gap: 8,
					}}
				>
					{bars.map(([v, c], i) => (
						<div
							key={i}
							style={{
								flex: 1,
								height: `${v * 100}%`,
								background: `linear-gradient(${rgbs(c)}, ${rgbs(mix(c, [255, 255, 255], 0.35))})`,
								borderRadius: "4px 4px 0 0",
							}}
						/>
					))}
				</div>
			</div>
		);
	}
	if (kind === "slide") {
		return (
			<div
				style={{
					...base,
					background: "rgb(250,220,204)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 6,
				}}
			>
				<div
					style={{ width: 16, height: 16, borderRadius: 4, border: `2.5px solid ${rgbs(accent)}` }}
				/>
				<div
					style={{
						font: `700 22px ${FONT}`,
						color: rgbs(accent),
						textAlign: "center",
						lineHeight: 1.0,
						letterSpacing: "-0.02em",
						maxWidth: w * 0.6,
					}}
				>
					{title}
				</div>
			</div>
		);
	}
	// doc / email: title + text lines
	return (
		<div style={{ ...base, padding: kind === "email" ? "34px 12px" : "10px 12px" }}>
			{title ? (
				<div style={{ font: `700 12px ${FONT}`, color: "rgb(30,30,34)", whiteSpace: "nowrap" }}>
					{title}
				</div>
			) : null}
			{[0.9, 0.7, 0.82, 0.6, 0.88, 0.76, 0.5, 0.84, 0.66].map((f, i) =>
				line(f * (w - 24), i, i === 3 ? 10 : 5),
			)}
		</div>
	);
}

/** The window itself, drawn in layer space. */
function LibraryWindow({ L }) {
	const f = L.frame ?? { x: 151, y: 63, w: 978, h: 560 };
	const p = L.panel ?? { x: 165, y: 77, w: 950, h: 532 };
	const mode = L.mode ?? "folders";
	const g = L.grid ?? {};
	const tabs = L.tabs ?? ["Artifacts", "Projects", "Companion files", "All files"];
	const avatars = L.avatars ?? [
		{ c1: [214, 190, 160], c2: [150, 120, 96] },
		{ c1: [240, 170, 170], c2: [190, 90, 100] },
		{ c1: [170, 200, 160], c2: [90, 130, 90] },
		{ c1: [240, 214, 170], c2: [190, 150, 110] },
	];
	const isCampaign = mode === "campaign";
	const cols = g.cols ?? (isCampaign ? 3 : 4);
	const rows = g.rows ?? 2;
	const gx = g.x ?? 192,
		gy = g.y ?? (isCampaign ? 163 : 196);
	const px = g.px ?? (isCampaign ? 306 : 227),
		py = g.py ?? (isCampaign ? 223 : 193);
	const cw = g.w ?? (isCampaign ? 283 : 216),
		ch = g.h ?? (isCampaign ? 199 : 181);
	const cells = [];
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const i = r * cols + c;
			const x = gx + c * px,
				y = gy + r * py;
			if (mode === "empty") {
				cells.push(
					<div
						key={i}
						style={{
							position: "absolute",
							left: x,
							top: y,
							width: cw,
							height: ch,
							borderRadius: 12,
							border: "1.5px dashed rgb(222,222,224)",
							boxSizing: "border-box",
						}}
					/>,
				);
			} else if (mode === "folders") {
				const fo = (L.folders ?? [])[i] ?? { name: "" };
				cells.push(
					<div
						key={i}
						style={{
							position: "absolute",
							left: x,
							top: y,
							width: cw,
							height: ch,
							borderRadius: 14,
							background: rgbs(CARD_GREY),
						}}
					>
						<div
							style={{
								position: "absolute",
								left: 10,
								top: 17,
								width: cw - 20,
								height: 112,
								borderRadius: 14,
								background: "rgb(254,255,253)",
							}}
						/>
						<div
							style={{
								position: "absolute",
								left: cw / 2 - 27,
								top: 17 + 56 - 27,
								width: 54,
								height: 54,
								borderRadius: 12,
								background: rgbs(CARD_GREY),
							}}
						/>
						<FolderGlyph cx={cw / 2} cy={17 + 56} s={1.12} />
						<div
							style={{
								position: "absolute",
								left: 10,
								top: 135,
								font: `600 18px ${FONT}`,
								color: "rgb(24,24,26)",
								whiteSpace: "nowrap",
								lineHeight: "22px",
							}}
						>
							{fo.name}
						</div>
						<div
							style={{
								position: "absolute",
								left: 10,
								top: 157,
								font: `400 13.5px ${FONT}`,
								color: "rgb(130,132,129)",
								whiteSpace: "nowrap",
								lineHeight: "16px",
							}}
						>
							{fo.sub ?? L.sub ?? "in My Drive"}
						</div>
						<div
							style={{
								position: "absolute",
								left: cw - 22,
								top: 145,
								width: 4,
								display: "flex",
								flexDirection: "column",
								gap: 2.6,
							}}
						>
							{[0, 1, 2].map((k) => (
								<div
									key={k}
									style={{ width: 4, height: 4, borderRadius: 2, background: "rgb(80,80,84)" }}
								/>
							))}
						</div>
					</div>,
				);
			} else {
				const cd = (L.cards ?? [])[i] ?? { label: "" };
				cells.push(
					<div
						key={i}
						style={{
							position: "absolute",
							left: x,
							top: y,
							width: cw,
							height: ch,
							borderRadius: 14,
							background: rgbs([241, 242, 240]),
						}}
					>
						<div
							style={{
								position: "absolute",
								left: 15,
								top: 12,
								width: cw - 30,
								height: 145,
								borderRadius: 10,
								background: "#fff",
								overflow: "hidden",
							}}
						>
							<Thumb kind={cd.thumb ?? "doc"} w={cw - 30} h={145} title={cd.thumbTitle ?? ""} />
						</div>
						<div
							style={{
								position: "absolute",
								left: 15,
								top: 166,
								height: 26,
								right: 12,
								display: "flex",
								alignItems: "center",
								gap: 9,
							}}
						>
							<Glyph kind={cd.icon ?? "doc"} colour={cd.iconColour ?? [66, 133, 244]} size={20} />
							<div
								style={{
									font: `400 18px ${FONT}`,
									color: "rgb(24,24,26)",
									whiteSpace: "nowrap",
									flex: 1,
								}}
							>
								{cd.label}
							</div>
							<div
								style={{
									width: 22,
									height: 22,
									borderRadius: 11,
									flex: "none",
									background: `linear-gradient(140deg, ${rgbs(cd.av1 ?? [190, 170, 150])}, ${rgbs(cd.av2 ?? [120, 100, 90])})`,
								}}
							/>
						</div>
					</div>,
				);
			}
		}
	}
	return (
		<>
			<div
				style={{
					position: "absolute",
					left: f.x,
					top: f.y,
					width: f.w,
					height: f.h,
					borderRadius: 30,
					background: "rgb(244,242,247)",
					boxShadow: "0 18px 50px rgba(70,50,110,0.10), 0 3px 10px rgba(70,50,110,0.05)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: p.x,
					top: p.y,
					width: p.w,
					height: p.h,
					borderRadius: 20,
					background: "rgb(254,255,254)",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						position: "absolute",
						left: 27,
						top: 27,
						height: 40,
						right: 27,
						display: "flex",
						alignItems: "center",
					}}
				>
					<div
						style={{
							font: `600 ${isCampaign ? 21 : 20}px ${FONT}`,
							color: "rgb(24,24,26)",
							whiteSpace: "nowrap",
							marginRight: isCampaign ? 14 : 30,
							letterSpacing: "-0.005em",
						}}
					>
						{L.title ?? "Library"}
					</div>
					<div
						style={{
							height: 40,
							borderRadius: 20,
							background: rgbs(CARD_GREY),
							display: "flex",
							alignItems: "center",
							padding: "0 8px",
							gap: 6,
						}}
					>
						{tabs.map((tb, i) => (
							<div
								key={i}
								style={{
									font: `${i === (L.activeTab ?? 1) ? 600 : 500} 13.5px ${FONT}`,
									color: i === (L.activeTab ?? 1) ? "rgb(24,24,26)" : "rgb(112,114,118)",
									padding: "6px 14px",
									borderRadius: 14,
									whiteSpace: "nowrap",
									background: i === (L.activeTab ?? 1) ? "#fff" : "transparent",
									boxShadow: i === (L.activeTab ?? 1) ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
								}}
							>
								{tb}
							</div>
						))}
					</div>
					<div style={{ flex: 1 }} />
					<div style={{ position: "relative", width: 40 + 35 * (avatars.length - 1), height: 40 }}>
						{avatars.map((a, i) => (
							<div
								key={i}
								style={{
									position: "absolute",
									left: i * 35,
									top: 0,
									width: 40,
									height: 40,
									borderRadius: 20,
									background: `linear-gradient(140deg, ${rgbs(a.c1)}, ${rgbs(a.c2)})`,
									boxShadow: "0 0 0 2px #fff",
								}}
							/>
						))}
					</div>
				</div>
				{!isCampaign ? (
					<div
						style={{
							position: "absolute",
							left: 29,
							top: 88,
							display: "flex",
							alignItems: "center",
							gap: 9,
						}}
					>
						<svg width="12" height="8" viewBox="0 0 12 8">
							<path
								d="M1.5 1.5 L6 6 L10.5 1.5"
								fill="none"
								stroke="rgb(30,30,32)"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						<div style={{ font: `600 15px ${FONT}`, color: "rgb(30,30,32)", whiteSpace: "nowrap" }}>
							{L.section ?? "Suggested folders"}
						</div>
					</div>
				) : null}
			</div>
			<div style={{ position: "absolute", left: 0, top: 0 }}>{cells}</div>
		</>
	);
}

/**
 * willow-library — the drive/library beat. Everything is drawn in LAYER space
 * (the window at rest) and one camera maps layer -> screen:
 *   screen = (x, y) + (P - pivot) * s
 * Cursors ride the same camera for position but grow only s^cursorExp
 * (measured: the Founder tag grew 1.52x while the window punched 3.21x,
 * 64.2–65.1s => exponent 0.37).
 */
function LibraryScene(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const cam = kf(cfg.camera ?? [{ at: 0, s: 1, x: 640, y: 360 }], ms);
	const pv = cfg.pivot ?? [640, 360];
	const s = cam.s ?? 1,
		cx = cam.x ?? pv[0],
		cy = cam.y ?? pv[1];
	const toScreen = (P) => [cx + (P[0] - pv[0]) * s, cy + (P[1] - pv[1]) * s];
	const cexp = cfg.cursorExp ?? 0.37;
	// measured cursor growth (tag width) when given; else camera^exp
	const csz = cfg.cursorScale ? table(cfg.cursorScale, ms, "c", 1) : Math.pow(s, cexp);
	const layer = (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1280,
				height: 720,
				transformOrigin: "0 0",
				transform: `translate(${cx.toFixed(3)}px,${cy.toFixed(3)}px) scale(${s.toFixed(5)}) translate(${(-pv[0]).toFixed(3)}px,${(-pv[1]).toFixed(3)}px)`,
			}}
		>
			<LibraryWindow L={cfg.layout ?? {}} />
		</div>
	);
	const cursors = (cfg.cursors ?? []).map((c, i) => {
		if (c.fromMs != null && ms < c.fromMs - 0.5) return null;
		const k = kf(c.keys ?? [{ at: 0, x: 0, y: 0 }], ms);
		const P = toScreen([k.x, k.y]);
		const sz = (c.size ?? 1) * csz;
		const op = k.opacity ?? 1;
		// chips ride the cursor rigidly, in layer units scaled like the window
		const chips = (c.chips ?? []).map((ch, j) => {
			const q = toScreen([k.x + ch.dx, k.y + ch.dy]);
			const node =
				ch.kind === "slide" ? (
					<SlideCard
						x={0}
						y={0}
						w={ch.w}
						h={ch.h}
						rot={ch.rot ?? 0}
						fill={ch.fill}
						ink={ch.ink}
						text={ch.text ?? ""}
						mark={ch.mark ?? true}
					/>
				) : (
					<Chip
						x={0}
						y={0}
						w={ch.w}
						h={ch.h}
						rot={ch.rot ?? 0}
						title={ch.title}
						sub={ch.sub}
						icon={ch.icon}
						colour={ch.colour}
					/>
				);
			return (
				<div
					key={j}
					style={{
						position: "absolute",
						left: q[0],
						top: q[1],
						width: 0,
						height: 0,
						transform: `scale(${s.toFixed(5)})`,
						transformOrigin: "0 0",
						opacity: op,
					}}
				>
					{node}
				</div>
			);
		});
		return (
			<React.Fragment key={i}>
				{chips}
				<RoleCursor
					id={`${cfg.id}-${i}`}
					x={P[0]}
					y={P[1]}
					colour={c.colour}
					label={c.label}
					flip={!!c.flip}
					size={sz}
					opacity={op}
				/>
			</React.Fragment>
		);
	});
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			{layer}
			{cursors}
		</div>
	);
}

// ── counter type ──────────────────────────────────────────────────────────

function fmtCount(v, c) {
	const step = c.step ?? 1;
	const q = Math.floor(v / step + 1e-6) * step;
	return q.toFixed(c.decimals ?? 0);
}

/**
 * willow-counter-type — measured on "Works on 1.4 -> 1.8 billion websites"
 * (68.375–70.1s) and "200k -> 267k companions already created" (74.333–76.958s):
 *  - the block scales about a FIXED anchor from a dense table (the companions
 *    block grows from its line gap: line-1 descender and line-2 ascender stay
 *    pinned at y=366 while it scales .63 -> 1.0 -> 1.14);
 *  - the number word ticks (floor to `step`) along `count` keys;
 *  - later lines/words pop in place on their frame (no fade, measured);
 *  - `dy` keys translate the block (pre-scale) for the reflow when line 2
 *    arrives.
 * lines: [{ baseline (px from anchor at scale 1), atMs, words: [{ text, accent, count, atMs }] }]
 */
function CounterType(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const s = table(cfg.scale, ms, "s", 1);
	const dy = table(cfg.dy, ms, "dy", 0);
	const val = table(cfg.count?.keys, ms, "v", 0);
	const [ax, ay] = cfg.anchor ?? [640, 360];
	const size = cfg.size ?? 88;
	const weight = cfg.weight ?? 650;
	const ink = cfg.ink ?? [44, 44, 45];
	const acc = cfg.accent ?? [
		[242, 148, 130],
		[236, 112, 94],
	];
	const track = cfg.tracking ?? "-0.025em";
	const accentStyle = {
		background: `linear-gradient(180deg, ${rgbs(acc[0])} 20%, ${rgbs(acc[1])} 85%)`,
		WebkitBackgroundClip: "text",
		backgroundClip: "text",
		color: "transparent",
		// the clip only paints inside the span's box: pad it so descenders and
		// ascenders keep their fill (measured: the 'p' of companions reaches y=365)
		padding: "0.22em 0",
		margin: "-0.22em 0",
	};
	const lines = (cfg.lines ?? []).map((ln, i) => {
		if (ln.atMs != null && ms < ln.atMs) return null;
		// Lay the WHOLE line out (so popped words land in their final place) and
		// hide words that have not arrived yet.
		const words = (ln.words ?? []).map((w, j) => {
			const shown = w.atMs == null || ms >= w.atMs;
			const text = w.count
				? `${cfg.count?.prefix ?? ""}${fmtCount(val, cfg.count ?? {})}${cfg.count?.suffix ?? ""}`
				: w.text;
			return (
				<span
					key={j}
					style={{
						...(w.accent ? accentStyle : { color: rgbs(ink) }),
						visibility: shown ? "visible" : "hidden",
						whiteSpace: "pre",
					}}
				>
					{text}
				</span>
			);
		});
		return (
			// with line-height 1em Segoe's baseline sits ~0.1em above the box bottom
			// (rendered 8.5px high at 88px against the measured baseline)
			<div
				key={i}
				style={{
					position: "absolute",
					left: -2000,
					width: 4000,
					top: ln.baseline + dy - size * (cfg.baselineEm ?? 0.9),
					height: size * 1.3,
					display: "flex",
					justifyContent: "center",
					alignItems: "baseline",
				}}
			>
				<div
					style={{
						font: `${weight} ${size}px ${FONT}`,
						lineHeight: `${size}px`,
						letterSpacing: track,
						whiteSpace: "pre",
						height: size,
						display: "flex",
						alignItems: "baseline",
					}}
				>
					{words}
				</div>
			</div>
		);
	});
	return (
		<div
			style={{
				position: "absolute",
				left: ax,
				top: ay,
				width: 0,
				height: 0,
				transform: `scale(${s.toFixed(5)})`,
				transformOrigin: "0 0",
			}}
		>
			{lines}
		</div>
	);
}

// ── glyph cloud ───────────────────────────────────────────────────────────

/**
 * willow-glyph-cloud — "works on N websites": app tiles scattered round the
 * copy. Measured (68.4–70.1s): the field recedes on a decaying zoom
 * (84px tile offset factor 1.35 -> 1.0, per-frame ratio ~0.885, settled by
 * 69.8s) with DEPTH PARALLAX — a tile's offset factor is 1 + (size/84)(S-1),
 * bigger (nearer) tiles travel more (Teams 100px moved 1.23x what YouTube
 * 84px did) — then contracts accelerating into the cut (S .998 -> .94 over
 * 69.92–70.08s). Tile size follows the offset factor ^0.6.
 * tiles: [{x, y, size, kind, colour, colours, opacity}] at S = 1.
 */
function GlyphCloud(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const S = table(cfg.field, ms, "s", 1);
	const [ox, oy] = cfg.origin ?? [640, 360];
	const ref = cfg.refSize ?? 84;
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			{(cfg.tiles ?? []).map((tl, i) => {
				const k = 1 + (tl.size / ref) * (S - 1);
				const x = ox + (tl.x - ox) * k,
					y = oy + (tl.y - oy) * k;
				const sz = tl.size * Math.pow(Math.max(0.05, k), 0.6);
				return (
					<div
						key={i}
						style={{
							position: "absolute",
							left: x - sz / 2,
							top: y - sz / 2,
							width: sz,
							height: sz,
							opacity: tl.opacity ?? 1,
							borderRadius: sz * 0.24,
							background: "#fff",
							boxShadow: `0 ${sz * 0.06}px ${sz * 0.2}px rgba(60,50,40,0.13), 0 0 ${sz * 0.03}px rgba(60,50,40,0.08)`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Glyph kind={tl.kind} colour={tl.colour} colours={tl.colours} size={sz * 0.5} />
					</div>
				);
			})}
		</div>
	);
}

// ── quote stack ───────────────────────────────────────────────────────────

function QuoteMark({ size = 52, colour = [232, 92, 70] }) {
	// generic brand-mark stand-in: a rounded diamond with a small cut-out
	return (
		<svg width={size} height={size} viewBox="0 0 20 20">
			<rect
				x="4.2"
				y="4.2"
				width="11.6"
				height="11.6"
				rx="2.6"
				transform="rotate(45 10 10)"
				fill={rgbs(colour)}
			/>
			<rect x="8" y="8" width="4" height="4" rx="1" transform="rotate(45 10 10)" fill="#fff" />
		</svg>
	);
}

/**
 * One testimonial card at its natural size (measured f1725, front & lifted):
 * 732x480, radius 36; quote 40px/600 lines 48px apart from x=60, first
 * baseline 170 from top, ink [42,28,31]; hairline divider at 300; avatar 96px
 * at (106,374); name 37px/700 at x=177 baseline 366; title 29px/400
 * [58,51,51] baseline 405; mark 52px at (648,85).
 */
function QuoteCard({ q, w = 732, h = 480 }) {
	return (
		<div
			style={{
				position: "absolute",
				left: -w / 2,
				top: -h / 2,
				width: w,
				height: h,
				borderRadius: 36,
				background: "rgb(254,255,253)",
				boxShadow: "0 22px 60px rgba(90,60,130,0.10), 0 4px 14px rgba(90,60,130,0.06)",
				overflow: "hidden",
			}}
		>
			<div style={{ position: "absolute", left: 622, top: 59 }}>
				<QuoteMark />
			</div>
			<div
				style={{
					position: "absolute",
					left: 60,
					top: 170 - 38,
					width: 640,
					height: 148,
					display: "flex",
					flexDirection: "column",
					justifyContent: "flex-start",
				}}
			>
				<div
					style={{
						font: `600 40.5px ${FONT}`,
						lineHeight: "48px",
						color: "rgb(42,28,31)",
						letterSpacing: "0em",
						whiteSpace: "pre-line",
					}}
				>
					{q.quote}
				</div>
			</div>
			<div
				style={{
					position: "absolute",
					left: 60,
					right: 60,
					top: 300,
					height: 1.5,
					background: "rgb(242,243,241)",
				}}
			/>
			<Avatar
				x={106}
				y={374}
				d={96}
				c1={q.c1 ?? [236, 206, 170]}
				c2={q.c2 ?? [180, 140, 110]}
				initials={q.initials ?? ""}
			/>
			<div
				style={{
					position: "absolute",
					left: 177,
					top: 366 - 33,
					font: `700 37px ${FONT}`,
					lineHeight: "40px",
					color: "rgb(42,28,31)",
					whiteSpace: "nowrap",
				}}
			>
				{q.name}
			</div>
			<div
				style={{
					position: "absolute",
					left: 177,
					top: 405 - 27,
					font: `400 29px ${FONT}`,
					lineHeight: "34px",
					color: "rgb(58,51,51)",
					whiteSpace: "nowrap",
					letterSpacing: "0.005em",
				}}
			>
				{q.title}
			</div>
		</div>
	);
}

const STACK_SLOTS = [
	// k, cx, cy, scale, blur — measured at f1725 (front lifted to 1.0 there)
	{ k: -3, cx: 205, cy: 352, s: 0.53, blur: 3, op: 0 },
	{ k: -2, cx: 301, cy: 352, s: 0.644, blur: 2.2, op: 1 },
	{ k: -1, cx: 433, cy: 351, s: 0.746, blur: 1.3, op: 1 },
	{ k: 0, cx: 640, cy: 350, s: 0.89, blur: 0, op: 1 },
	{ k: 1, cx: 880, cy: 349, s: 0.723, blur: 1.3, op: 1 },
	{ k: 2, cx: 1006, cy: 351, s: 0.556, blur: 2.2, op: 1 },
	{ k: 3, cx: 1100, cy: 352, s: 0.45, blur: 3, op: 0 },
];
function slotAt(k) {
	const a = STACK_SLOTS;
	if (k <= a[0].k) return a[0];
	if (k >= a[a.length - 1].k) return a[a.length - 1];
	const i = Math.floor(k - a[0].k);
	const A = a[i],
		B = a[Math.min(a.length - 1, i + 1)],
		f = k - A.k;
	// between the front and its neighbours the card keeps its size longer than
	// its position (measured 72.21–72.42s: Amanda at k=-.29 still .88, k=-.57
	// .84; Johan at k=+.26 already .90) — scale follows |k|^2 there.
	let fs = f;
	if (A.k === -1 && B.k === 0) fs = 1 - Math.pow(1 - f, 2);
	if (A.k === 0 && B.k === 1) fs = f * f;
	return {
		cx: lerp(A.cx, B.cx, f),
		cy: lerp(A.cy, B.cy, f),
		s: lerp(A.s, B.s, fs),
		blur: lerp(A.blur, B.blur, f),
		op: lerp(A.op, B.op, f),
	};
}

/**
 * willow-quote-stack — cover-flow testimonials (70.125–74.29s).
 * `progress` keys move every card through the slots (card i sits at slot
 * i - p); measured advance 72.17–72.79s is a symmetric in/out over ~0.6s with
 * the z-swap at mid-travel. A card arriving at front sits at .89 and LIFTS to
 * the full card (1.0) on its own `liftAtMs`: ~80% in 5 frames (cubic-out)
 * then a slow linear tail (Amanda from 70.79s, top edge 135->117 in 4 frames,
 * ->111 by 71.88s; Johan from 72.63s, slower). The lift collapses within 0.1
 * slot when the card leaves. Back cards carry a light depth blur. The camera
 * carries the entry zoom (1.2 -> 1.0 over 70.13–70.42s) and the exit (shrink
 * to .83 by 74.29s, accelerating, blurring).
 */
function QuoteStack(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const p = table(cfg.progress, ms, "p", 0);
	const cam = kf(cfg.camera ?? [{ at: 0, s: 1, x: 0, y: 0, blur: 0 }], ms);
	const cs = cam.s ?? 1,
		cxo = cam.x ?? 0,
		cyo = cam.y ?? 0,
		cblur = cam.blur ?? 0;
	const lift = cfg.liftTo ?? 1.0;
	const cards = (cfg.cards ?? [])
		.map((q, i) => {
			const k = i - p;
			if (k < -3.2 || k > 3.2) return null;
			const sl = slotAt(k);
			let sc = sl.s;
			if (q.liftAtMs != null && Math.abs(k) < 0.1) {
				// fast cubic-out part (liftAmp of the lift over liftDurMs) + a slow
				// linear tail to the full card over liftTailMs (Amanda: .8 of the lift
				// in 5 frames, the rest over the next ~20)
				const amp = q.liftAmp ?? 0.8;
				const lp = clamp01((ms - q.liftAtMs) / (q.liftDurMs ?? 210));
				const tp = clamp01((ms - q.liftAtMs) / (q.liftTailMs ?? 1080));
				const le = amp * (1 - Math.pow(1 - lp, 3)) + (1 - amp) * tp;
				// the lift collapses within 0.1 slot of leaving the front (measured
				// 72.17–72.29s: .983 -> .90 by p = +0.1)
				const near = 1 - Math.abs(k) / 0.1;
				sc = sl.s + (lift - STACK_SLOTS[3].s) * le * near;
			}
			return { i, k, q, sl, sc };
		})
		.filter(Boolean);
	// draw far first: larger |k| underneath
	cards.sort((a, b) => Math.abs(b.k) - Math.abs(a.k));
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				overflow: "hidden",
				filter: cblur > 0.05 ? `blur(${cblur.toFixed(2)}px)` : undefined,
			}}
		>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1280,
					height: 720,
					transformOrigin: "640px 350px",
					transform: `translate(${cxo.toFixed(2)}px,${cyo.toFixed(2)}px) scale(${cs.toFixed(5)})`,
				}}
			>
				{cards.map(({ i, q, sl, sc }) => (
					<div
						key={i}
						style={{
							position: "absolute",
							left: sl.cx,
							top: sl.cy,
							width: 0,
							height: 0,
							opacity: sl.op,
							transform: `scale(${sc.toFixed(5)})`,
							filter:
								sl.blur > 0.1 ? `blur(${(sl.blur / Math.max(0.3, sc)).toFixed(2)}px)` : undefined,
						}}
					>
						<QuoteCard q={q} />
					</div>
				))}
			</div>
		</div>
	);
}

// ── avatar grid ───────────────────────────────────────────────────────────

/**
 * willow-avatar-grid — the "N already created" crowd (74.6–76.96s). Tiles sit
 * on a lattice centred (645,376), pitch 111.5px at g=1; the lattice recedes on
 * a measured table (g 1.10 at 75.0s -> 1.0 at 76.25s, then accelerating to
 * .866 by 76.92s). Each tile pops in place over ~0.42s (scale .45 -> 1,
 * cubic-out, opacity linear: first-visible to full took 10-14 frames) on its own frame, spreading outward from the centre.
 * tiles: [{x, y, size, colour, opacity, atMs, empty}] at g = 1. Heads are
 * character art in the reference: here a neutral pastel tile with a generic
 * head-and-shoulders mark (the template's slot for the user's avatars).
 */
function AvatarGrid(cfg, t) {
	if (!live(cfg, t)) return null;
	const ms = localMs(cfg, t);
	const g = table(cfg.lattice, ms, "g", 1);
	const [ox, oy] = cfg.origin ?? [645, 376];
	const dur = cfg.popMs ?? 420;
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			{(cfg.tiles ?? []).map((tl, i) => {
				const a = clamp01((ms - (tl.atMs ?? 0)) / dur);
				if (a <= 0) return null;
				const pop = 0.45 + 0.55 * easeOutCubic(a);
				const op = (tl.opacity ?? 1) * a;
				const x = ox + (tl.x - ox) * g,
					y = oy + (tl.y - oy) * g;
				const sz = tl.size * g * pop;
				const bg = tl.colour ?? [236, 226, 246];
				const deep = mix(bg, [70, 60, 90], 0.42);
				const face = mix(bg, [255, 255, 255], 0.35);
				return (
					<div
						key={i}
						style={{
							position: "absolute",
							left: x - sz / 2,
							top: y - sz / 2,
							width: sz,
							height: sz,
							opacity: op,
							borderRadius: sz * 0.2,
							background: rgbs(tl.empty ? [250, 244, 241] : bg),
							overflow: "hidden",
						}}
					>
						{tl.empty ? null : (
							<>
								<div
									style={{
										position: "absolute",
										left: sz * 0.2,
										right: sz * 0.2,
										bottom: -sz * 0.12,
										height: sz * 0.36,
										borderRadius: `${sz * 0.2}px ${sz * 0.2}px 0 0`,
										background: rgbs(deep),
									}}
								/>
								<div
									style={{
										position: "absolute",
										left: sz * 0.29,
										top: sz * 0.18,
										width: sz * 0.42,
										height: sz * 0.46,
										borderRadius: "46%",
										background: rgbs(face),
										boxShadow: `inset 0 ${sz * 0.06}px 0 ${rgbs(deep)}`,
									}}
								/>
							</>
						)}
					</div>
				);
			})}
		</div>
	);
}

export const S6_PRESETS = {
	"willow-library": {
		note: "A library/drive window drawn generically (glass frame, panel, title + tab pills + avatar stack, 'Suggested folders' + folder grid | dashed empty grid | 3x2 document cards) under ONE layer camera (screen = (x,y) + (P - pivot)*s), plus role-tagged agent cursors that ride the camera and drag chip / slide groups. Measured 63.5–68.33s: drop-in from above, punch 1.0 -> 3.21x into one folder, pull-back, organising.",
		nativeMs: 4800,
		params: {
			layout: [
				"object",
				"{mode:'folders'}",
				"{mode:'folders'|'empty'|'campaign', title, tabs[], activeTab, section, sub, folders:[{name,sub}], cards:[{label, thumb:'sheet'|'email'|'doc'|'chart'|'slide', thumbTitle, icon, iconColour, av1, av2}], avatars:[{c1,c2}]}",
			],
			camera: [
				"array",
				"[{at:0,s:1,x:640,y:360}]",
				"layer camera keys (scene ms): s scale, (x,y) = where the pivot lands on screen. Dense measured keys, linear",
			],
			pivot: ["[x,y]", "[640,360]", "layer point that (x,y) positions"],
			cursors: [
				"array",
				"[]",
				"[{label, colour, flip, size, fromMs, keys:[{at,x,y,opacity}] (LAYER coords of the arrow tip), chips:[{dx,dy,w,h,rot,kind:'chip'|'slide', title, sub, icon, colour, fill, ink, text}]}]",
			],
			cursorExp: [
				"number",
				0.37,
				"cursor size grows camera^exp (measured 1.52x tag for a 3.21x punch)",
			],
			cursorScale: [
				"array|null",
				null,
				"explicit cursor size keys {at, c} — the measured growth overshoots (1.61x mid-punch, relaxing to 1.52x)",
			],
		},
		render: LibraryScene,
	},
	"willow-counter-type": {
		note: "Kinetic counter copy: a ticking number word (floor to step) inside a one/two-line heavy block that scales about a fixed anchor from a dense table; later lines/words pop in place; dy keys reflow the block. Measured on 'Works on 1.4->1.8 billion websites' and '200k->267k companions already created'.",
		nativeMs: 2600,
		params: {
			lines: [
				"array",
				"[]",
				"[{baseline (px from anchor at scale 1), atMs, words:[{text, accent, count, atMs}]}]",
			],
			count: [
				"object",
				"{keys:[{at,v}], decimals:0, step:1, prefix:'', suffix:''}",
				"the ticking value; keys linear (use ease:'hold' for stepped counters)",
			],
			scale: ["array", "[{at:0,s:1}]", "block scale keys about `anchor`"],
			dy: ["array", "[]", "block translate (pre-scale) keys {at, dy}"],
			anchor: ["[x,y]", "[640,360]", "scale origin and baseline reference"],
			size: ["number", 88, "font px at scale 1 (cap 62px => 88px Segoe)"],
			weight: ["number", 650, "font weight"],
			ink: ["rgb", "[44,44,45]", "body colour"],
			accent: [
				"[rgb,rgb]",
				"[[242,148,130],[236,112,94]]",
				"accent words: top->bottom gradient measured on the coral number",
			],
			tracking: ["string", "-0.025em", "letter spacing"],
			baselineEm: [
				"number",
				0.9,
				"distance from the line box top to the baseline in em (font metric; 0.9 for Segoe UI at line-height 1)",
			],
		},
		render: CounterType,
	},
	"willow-glyph-cloud": {
		note: "A cloud of neutral app-glyph tiles (white rounded tiles, coloured generic glyphs — never real marks) around a claim, with a decaying field zoom and depth parallax (offset factor 1 + size/84*(S-1)), then a contraction into the cut.",
		nativeMs: 1750,
		params: {
			tiles: [
				"array",
				"[]",
				"[{x,y,size,kind:'disc'|'ring'|'bars'|'doc'|'env'|'sheet'|'slide'|'tri'|'heart'|'play'|'square'|'dots', colour, colours, opacity}] at S=1",
			],
			field: ["array", "[{at:0,s:1}]", "field zoom S keys (for an 84px tile)"],
			origin: ["[x,y]", "[640,360]", "zoom centre"],
			refSize: ["number", 84, "tile size whose offset factor equals S"],
		},
		render: GlyphCloud,
	},
	"willow-quote-stack": {
		note: "Cover-flow testimonial stack: card i sits at slot i - progress (measured slots: front .89 -> lifted 1.0, sides .75/.72, outer .64/.56 with depth blur 1.3/2.2px), front card lifts on its own cue, camera keys {s,x,y,blur} for the entry zoom, and blurred shrink exit.",
		nativeMs: 4170,
		params: {
			cards: [
				"array",
				"[]",
				"[{quote (\n forces a break; otherwise wraps at 640px), name, title, initials, c1, c2, liftAtMs, liftDurMs, liftAmp, liftTailMs}]",
			],
			progress: ["array", "[{at:0,p:0}]", "stack position keys (dense, linear)"],
			camera: ["array", "[{at:0,s:1,x:0,y:0,blur:0}]", "camera keys about (640,350)"],
			liftTo: ["number", 1.0, "front card scale after its lift"],
		},
		render: QuoteStack,
	},
	"willow-avatar-grid": {
		note: "Pastel avatar tiles popping in (scale .45->1 + linear fade, ~0.42s) outward from the centre on a lattice that recedes on a measured table. Neutral head-and-shoulders marks stand in for character art; `empty` tiles are the faint blank ones.",
		nativeMs: 2600,
		params: {
			tiles: ["array", "[]", "[{x,y,size,colour,opacity,atMs,empty}] at lattice g=1"],
			lattice: ["array", "[{at:0,g:1}]", "lattice scale keys about origin"],
			origin: ["[x,y]", "[645,376]", "lattice centre"],
			popMs: ["number", 420, "per-tile pop duration (scale cubic-out, opacity linear)"],
		},
		render: AvatarGrid,
	},
};
