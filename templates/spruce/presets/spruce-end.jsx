/**
 * spruce end — the closing aura shaped like the brand mark, and the end card.
 *
 * Measured (reference px, 1920x1080 @30fps):
 *   - MARK AURA f2167-2280: a cream frame with a blurred, mark-shaped glow
 *     rising in from the bottom (blue rim, magenta band, orange core); it
 *     settles low-centre by f2190 and the frame turns blue-violet around it;
 *     the warm core swells f2230-2270, then the whole mark shrinks back to
 *     show cream corners at f2274 before the cut.
 *   - END CARD f2280-2412 on black with a magenta/orange haze along the
 *     bottom edge: the gradient mark arrives blurred and large and settles
 *     small (f2280-2298), the wordmark reveals beside it letter by letter
 *     (f2304-2316), holds, and is replaced by the url alone (f2350).
 */
import React from "react";
import { clamp01 } from "../../../src/lib/textcards/src/easing.js";
import {
	expo,
	Grain,
	kf,
	localMs,
	prog,
	RefBox,
	rgbs,
	SANS,
	smooth,
	textW,
} from "./spruce-shared.jsx";
import { markPath } from "./spruce-type.jsx";

/** A blurred copy of the mark shape at (cx, cy), size, colour, blur. */
function BlurMark({ cx, cy, size, colour, blur, alpha = 1 }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			style={{
				position: "absolute",
				left: cx - size / 2,
				top: cy - size / 2,
				overflow: "visible",
				filter: `blur(${blur.toFixed(1)}px)`,
				opacity: alpha,
			}}
		>
			<path d={markPath(0, 0, 1)} fill={rgbs(colour)} />
		</svg>
	);
}

/** keys {at, y (mark centre), s (mark size px), core (0..1 warm core), sky (0..1 cream -> violet field)} */
function EndAura(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const y = k.y ?? 640;
	const s = k.s ?? 1500;
	const core = k.core ?? 0.5;
	const sky = k.sky ?? 1;
	const field = [
		[246, 243, 236],
		[150, 150, 245],
	];
	const base = field[0].map((v, i) => v + (field[1][i] - v) * sky);
	return (
		<RefBox z={c.z ?? 0}>
			<div style={{ position: "absolute", inset: 0, background: rgbs(base) }} />
			<div
				style={{
					position: "absolute",
					inset: 0,
					transform: `scaleX(${(k.sx ?? 1.7).toFixed(3)})`,
					transformOrigin: "960px 540px",
				}}
			>
				<BlurMark cx={960} cy={y} size={s * 1.25} colour={[96, 92, 240]} blur={s * 0.09} />
				<BlurMark
					cx={960}
					cy={y + s * 0.05}
					size={s * 0.95}
					colour={[226, 60, 196]}
					blur={s * 0.08}
				/>
				<BlurMark
					cx={960}
					cy={y + s * 0.12}
					size={s * (0.5 + 0.3 * core)}
					colour={[244, 92, 52]}
					blur={s * 0.07}
					alpha={0.4 + 0.6 * core}
				/>
			</div>
			<Grain t={t} alpha={0.2} />
		</RefBox>
	);
}

/** keys {at, ms (mark size), mb (mark blur)}; lettersAt, urlAt. */
function EndCard(c, t) {
	const ms = localMs(c, t);
	const k = kf(c.keys, ms);
	const name = c.name ?? "Spruce";
	const size = c.size ?? 112;
	const msz = k.ms ?? 120;
	const nameW = textW(name, size, 700) - 0.03 * size * name.length;
	const gap = size * 0.2;
	const lettersOn = c.lettersAt != null && ms >= c.lettersAt;
	const total = lettersOn ? msz * 0.9 + gap + nameW : 0;
	const lp = expo(prog(ms, c.lettersAt ?? 0, (c.lettersAt ?? 0) + 260));
	const shift = (total / 2) * lp;
	const urlOn = c.urlAt != null && ms >= c.urlAt;
	let x = 0;
	const letters = [];
	for (let i = 0; i < name.length; i++) {
		const at = (c.lettersAt ?? 0) + i * (c.stepMs ?? 40);
		const p = prog(ms, at, at + 220);
		const w = textW(name[i], size, 700) - 0.03 * size;
		letters.push(
			<span
				key={i}
				style={{
					position: "absolute",
					left: x,
					top: 0,
					opacity: ms < at ? 0 : clamp01(p * 2),
					filter: p < 0.97 ? `blur(${((1 - expo(p)) * 10).toFixed(1)}px)` : undefined,
				}}
			>
				{name[i]}
			</span>,
		);
		x += w;
	}
	return (
		<RefBox z={c.z ?? 12}>
			<div style={{ position: "absolute", inset: 0, background: "#000" }} />
			<div
				style={{
					position: "absolute",
					inset: 0,
					background: [
						"radial-gradient(ellipse 420px 260px at 0px 1080px, rgba(214,30,110,0.85) 0%, rgba(200,40,60,0.35) 45%, rgba(0,0,0,0) 100%)",
						"radial-gradient(ellipse 420px 260px at 1920px 1080px, rgba(214,30,110,0.85) 0%, rgba(200,40,60,0.35) 45%, rgba(0,0,0,0) 100%)",
						"radial-gradient(ellipse 360px 120px at 960px 0px, rgba(220,90,40,0.55) 0%, rgba(0,0,0,0) 100%)",
						"radial-gradient(ellipse 360px 110px at 960px 1080px, rgba(220,60,80,0.5) 0%, rgba(0,0,0,0) 100%)",
					].join(", "),
				}}
			/>
			{!urlOn ? (
				<>
					<svg
						width={msz}
						height={msz}
						viewBox="0 0 100 100"
						style={{
							position: "absolute",
							left: 960 - msz / 2 - shift,
							top: 540 - msz / 2,
							overflow: "visible",
							filter: (k.mb ?? 0) > 0.3 ? `blur(${k.mb.toFixed(1)}px)` : undefined,
						}}
					>
						<defs>
							<linearGradient id="sp-end-mk" x1="0" y1="0" x2="1" y2="1">
								<stop offset="0" stopColor="#f2643a" />
								<stop offset="0.5" stopColor="#ec1a7c" />
								<stop offset="1" stopColor="#6f7cf5" />
							</linearGradient>
						</defs>
						<path d={markPath(0, 0, 1)} fill="url(#sp-end-mk)" />
					</svg>
					{lettersOn ? (
						<div
							style={{
								position: "absolute",
								left: 960 - shift + msz * 0.9 - msz / 2 + gap,
								top: 540 - size * 0.68,
								fontWeight: 700,
								fontSize: size,
								fontFamily: SANS,
								letterSpacing: "-0.03em",
								lineHeight: 1.3,
								color: "#f4f4f5",
								whiteSpace: "pre",
							}}
						>
							{letters}
						</div>
					) : null}
				</>
			) : (
				<div
					style={{
						position: "absolute",
						left: 0,
						width: 1920,
						top: 540 - 26,
						textAlign: "center",
						fontWeight: 600,
						fontSize: c.urlSize ?? 40,
						fontFamily: SANS,
						color: "#fff",
						opacity: smooth(prog(ms, c.urlAt, c.urlAt + 120)),
					}}
				>
					{c.url ?? "spruce.example"}
				</div>
			)}
			<Grain t={t} alpha={0.08} />
		</RefBox>
	);
}

export const END_PRESETS = {
	"spruce-endaura": {
		note: "The closing ground: a blurred aura shaped like the brand mark (blue rim, magenta band, orange core) rising into a cream frame that turns violet around it. keys {at, y, s (size px), core (warm core 0..1), sky (0 cream .. 1 violet)}. Put spruce-line copy over it.",
		nativeMs: 3800,
		params: { keys: ["array", "-", "aura keys"] },
		render: EndAura,
	},
	"spruce-endcard": {
		note: "The end card on black with a warm haze at the bottom edge: the gradient mark settles from large+blurred (keys {at, ms, mb}), the wordmark reveals beside it letter by letter (lettersAt) as the pair re-centres, then the url alone (urlAt).",
		nativeMs: 4400,
		params: {
			name: ["string", "Spruce", "wordmark"],
			url: ["string", "spruce.example", "the url (role brand)"],
		},
		render: EndCard,
	},
};
