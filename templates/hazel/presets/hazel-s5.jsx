/**
 * hazel s5 — prompt, generation, and the result on stamps (28.60 -> 33.84s).
 *
 * Measured (reference px at 1280x720, 25fps):
 *   COMPOSER  f715-756. A white app panel x 64-978 on a sky band, its last chat
 *             turn scrolled top. Thumbnail card x 90-360, y 194-460. Composer
 *             x 90-950, y 490-650, radius 20. Prompt types 1 char per frame
 *             from f718. A flat picture bleeds off the right edge, x 1144+.
 *   GENERATE  f757-813. The prompt moves up into the panel, a status line
 *             rolls ("sketching" etc.) on a ~9-frame clock and the picture on
 *             the right builds in layers: ground, pot, stems, blooms. Variant
 *             cuts at f791, f799, f808; each adds a thumbnail.
 *   STAMPS    f814-845. Eight full-frame cuts on a 4-frame clock: a motif on a
 *             perforated stamp over kraft or white paper, with postmarks.
 */
import React from "react";
import { DotGrid, H, localF, rgbs, Sky, Stage, UI } from "./hazel-shared.jsx";
import { NutGlyph, Stamp, TileBox, Vase } from "./hazel-shared-art.jsx";

function Panel({ children, x = 64, w = 914, top = -20, bottom = 680 }) {
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top,
				width: w,
				height: bottom - top,
				background: "#fff",
				borderRadius: 26,
				boxShadow: "0 10px 40px rgba(40,70,120,0.18)",
			}}
		>
			{children}
		</div>
	);
}

const Brand = ({ name, colour }) => (
	<span style={{ font: `500 26px ${UI}`, color: colour ?? "rgb(50,52,60)" }}>{name}</span>
);

function Composer({ x, y, w, h, text, brand, caret }) {
	return (
		<div
			style={{
				position: "absolute",
				left: x,
				top: y,
				width: w,
				height: h,
				borderRadius: 20,
				border: "1.5px solid rgb(232,232,236)",
				background: "#fff",
				boxSizing: "border-box",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: 30,
					top: 28,
					font: `400 26px ${UI}`,
					color: "rgb(50,52,60)",
					whiteSpace: "pre",
				}}
			>
				{text}
				{caret ? <span style={{ color: rgbs(H.send) }}>|</span> : null}
			</div>
			<div
				style={{
					position: "absolute",
					left: 30,
					bottom: 16,
					font: `300 32px ${UI}`,
					color: "rgb(70,72,80)",
				}}
			>
				+
			</div>
			<div style={{ position: "absolute", right: 84, bottom: 26 }}>
				<Brand name={brand} />
			</div>
			<div
				style={{
					position: "absolute",
					right: 18,
					bottom: 16,
					width: 52,
					height: 48,
					borderRadius: 10,
					background: rgbs(H.send),
					color: "#fff",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					font: `500 28px ${UI}`,
				}}
			>
				↑
			</div>
		</div>
	);
}

/** Up-rolling status line with a spinner glyph. */
function StatusLine({
	f,
	x,
	y,
	items,
	period,
	size = 20,
	colour = H.loaderGrey,
	spin = true,
	fadeOutAt,
}) {
	const i = Math.min(items.length - 1, Math.floor(f / period));
	const q = f - i * period;
	const t = Math.min(1, q / 4);
	const out = fadeOutAt != null && f >= fadeOutAt ? Math.max(0, 1 - (f - fadeOutAt) / 5) : 1;
	const rise = (1 - t) * 18;
	return (
		<div style={{ position: "absolute", left: x, top: y, height: 30, opacity: out }}>
			{spin && (
				<svg
					width={size + 6}
					height={size + 6}
					viewBox="0 0 22 22"
					style={{
						position: "absolute",
						left: -(size + 14),
						top: 4 + (size - 22) * 0.22,
						transform: `rotate(${(f * 28) % 360}deg)`,
					}}
				>
					<path
						d="M11 2 A9 9 0 1 1 3 7"
						fill="none"
						stroke={rgbs(colour)}
						strokeWidth="1.8"
						strokeLinecap="round"
					/>
				</svg>
			)}
			<div
				style={{
					font: `500 ${size}px ${UI}`,
					color: rgbs(colour),
					whiteSpace: "pre",
					transform: `translateY(${rise.toFixed(2)}px)`,
					opacity: t,
				}}
			>
				{items[i]}
			</div>
		</div>
	);
}

export { StatusLine };

export const S5_PRESETS = {
	"hazel-composer": {
		note: "The app panel on a sky band, a finished thumbnail above the composer, and a prompt typing at one character per frame. A flat picture (`art` vase id) bleeds off the right edge.",
		nativeMs: 1680,
		params: {
			text: ["string", "-", "the prompt (role user-voice)"],
			brand: ["string", "Filbert 2.0", "model chip"],
			artVase: ["number", "1", "picture id (hazel VASES)"],
			lastTurn: ["string", "-", "end of the previous user turn"],
			src: ["string", "-", "image instead of the drawn picture"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const text = c.text ?? "";
			const typed = Math.max(0, Math.floor(f - 3));
			return (
				<Stage z={2}>
					<Sky f={f + 200} opacity={1} />
					<div
						style={{
							position: "absolute",
							left: 1000,
							top: -20,
							right: -20,
							bottom: -20,
							background: "rgb(249,250,252)",
						}}
					>
						<DotGrid pitch={22} alpha={0.5} r={1} />
					</div>
					<div
						style={{
							position: "absolute",
							left: 1144,
							top: -8,
							width: 180,
							height: 592,
							background: rgbs([245, 245, 172]),
						}}
					>
						{c.src ? (
							<img alt="" src={c.src} style={{ width: 180, height: 592, objectFit: "cover" }} />
						) : null}
					</div>
					<Panel>
						<div
							style={{
								position: "absolute",
								right: 34,
								top: 26,
								maxWidth: 470,
								padding: "8px 24px",
								background: "rgb(244,244,245)",
								borderRadius: 16,
								font: `400 26px/32px ${UI}`,
								color: "rgb(50,52,60)",
							}}
						>
							{c.lastTurn}
						</div>
						<div
							style={{
								position: "absolute",
								left: 26,
								top: 130,
								display: "flex",
								alignItems: "center",
							}}
						>
							<svg width="28" height="28" style={{ marginRight: 8 }}>
								<NutGlyph size={22} fill={[120, 122, 128]} />
							</svg>
							<span style={{ font: `400 30px ${UI}`, color: "rgb(120,122,128)" }}>Generated ⌄</span>
						</div>
						<div
							style={{
								position: "absolute",
								left: 26,
								top: 214,
								width: 270,
								height: 266,
								borderRadius: 16,
								border: "1.5px solid rgb(232,232,236)",
							}}
						>
							<svg width="200" height="206" style={{ position: "absolute", left: 35, top: 30 }}>
								<Vase id={c.artVase ?? 1} w={200} h={206} />
							</svg>
						</div>
						<Composer
							x={26}
							y={510}
							w={860}
							h={160}
							text={text.slice(0, typed)}
							brand={c.brand ?? "Filbert 2.0"}
							caret={typed < text.length}
						/>
					</Panel>
				</Stage>
			);
		},
	},

	"hazel-generate": {
		note: "The prompt has moved up the panel and the picture builds on the right. `variants` [{at, vase, src}] cut in and each adds a thumbnail to the panel; the status line rolls `status` every `period` frames.",
		nativeMs: 2280,
		params: {
			prompt: ["string", "-", "the prompt, shown small (role user-voice)"],
			status: ["array", "-", "rolling status lines (role product-voice)"],
			period: ["number", "9", "frames per status line"],
			variants: ["array", "-", "[{at, vase, src}] (frames)"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const variants = c.variants ?? [];
			let idx = 0;
			for (let i = 0; i < variants.length; i++) if (f >= variants[i].at) idx = i;
			const cur = variants[idx];
			const grow = idx === 0 ? Math.min(1, (f - cur.at) / 14) : 1;
			const prevV = idx > 0 ? variants[idx - 1] : variants[0];
			return (
				<Stage z={2}>
					<Sky f={f + 260} />
					<div
						style={{
							position: "absolute",
							left: 830,
							top: -20,
							right: -20,
							bottom: -20,
							background: "rgb(249,250,252)",
						}}
					>
						<DotGrid pitch={22} alpha={0.5} r={1} />
					</div>
					<svg width="359" height="494" style={{ position: "absolute", left: 921, top: 64 }}>
						{cur.src ? (
							<image href={cur.src} width="359" height="494" />
						) : (
							<Vase id={cur.vase} w={359} h={494} grow={grow} />
						)}
					</svg>
					<Panel x={102} w={718} bottom={655}>
						<div
							style={{
								position: "absolute",
								left: 36,
								top: -74,
								width: 216,
								height: 216,
								borderRadius: 14,
								border: "1.5px solid rgb(232,232,236)",
							}}
						>
							<svg width="168" height="176" style={{ position: "absolute", left: 24, top: 20 }}>
								<Vase id={prevV.vase} w={168} h={176} grow={1} />
							</svg>
						</div>
						<StatusLine
							f={f}
							x={70}
							y={190}
							items={c.status ?? []}
							period={c.period ?? 9}
							size={26}
							spin
						/>
						<div
							style={{
								position: "absolute",
								left: 36,
								top: 236,
								font: `400 22px ${UI}`,
								color: "rgb(150,152,158)",
							}}
						>
							{c.prompt}
						</div>
						<div
							style={{
								position: "absolute",
								left: 36,
								top: 268,
								width: 216,
								height: 216,
								borderRadius: 14,
								border: "1.5px solid rgb(232,232,236)",
							}}
						>
							<svg width="168" height="176" style={{ position: "absolute", left: 24, top: 20 }}>
								<Vase id={cur.vase} w={168} h={176} grow={grow} />
							</svg>
						</div>
						<div
							style={{
								position: "absolute",
								left: 24,
								right: 24,
								bottom: 16,
								height: 74,
								borderRadius: 16,
								border: "1.5px solid rgb(232,232,236)",
							}}
						>
							<div
								style={{
									position: "absolute",
									left: 20,
									top: 20,
									font: `300 28px ${UI}`,
									color: "rgb(70,72,80)",
								}}
							>
								+
							</div>
							<div style={{ position: "absolute", right: 76, top: 26 }}>
								<Brand name={c.brand ?? "Filbert 2.0"} />
							</div>
							<div
								style={{
									position: "absolute",
									right: 16,
									top: 14,
									width: 46,
									height: 44,
									borderRadius: 10,
									background: rgbs(H.send),
									color: "#fff",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									font: `500 24px ${UI}`,
								}}
							>
								↑
							</div>
						</div>
					</Panel>
				</Stage>
			);
		},
	},

	"hazel-stamps": {
		note: "Eight stamps on a four-frame clock over kraft or white paper. `items` [{at, vase, paper:'kraft'|'white'|'kraft2'|'wood', postmark, x, y, w, src}].",
		nativeMs: 1280,
		params: {
			items: ["array", "-", "[{at, vase, paper, postmark, x, y, w, src}] slots stamp-1..8"],
			caption: ["string", "Filbert Collectors", "stamp caption"],
			tag: ["string", "forma", "bottom-left tag"],
			price: ["string", "85¢", "bottom-right price"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const items = c.items ?? [];
			let cur = items[0];
			for (const it of items) if (f >= it.at) cur = it;
			const paperKind = cur.paper ?? "white";
			const paper = {
				kraft: "radial-gradient(ellipse at 40% 40%, rgb(206,168,116), rgb(182,142,92))",
				kraft2: "radial-gradient(ellipse at 60% 30%, rgb(222,192,146), rgb(204,168,120))",
				white: "linear-gradient(115deg, rgb(244,244,243), rgb(226,226,226))",
				wood: "linear-gradient(115deg, rgb(244,240,232) 0 70%, rgb(204,166,118) 70%)",
			}[paperKind];
			const w = (cur.w ?? 300) * (c.stampScale ?? 1);
			const h = w * 1.32;
			const x = cur.x ?? 640 - w / 2;
			const y = cur.y ?? 360 - h / 2;
			return (
				<Stage z={2} style={{ background: paper }}>
					{cur.fold && (
						<svg width="1280" height="720" style={{ position: "absolute", inset: 0 }}>
							<path
								d="M880 -20 L1080 180 L1300 60"
								fill="rgba(255,255,255,0.5)"
								stroke="rgba(0,0,0,0.07)"
								strokeWidth="2"
							/>
						</svg>
					)}
					<div style={{ position: "absolute", left: x, top: y }}>
						{cur.src ? (
							<img alt="" src={cur.src} style={{ width: w, height: h, objectFit: "cover" }} />
						) : (
							<Stamp vase={cur.vase} w={w} h={h} caption={c.caption} tag={c.tag} price={c.price} />
						)}
					</div>
					{cur.postmark && (
						<svg
							width="1280"
							height="720"
							style={{ position: "absolute", inset: 0, opacity: 0.72 }}
						>
							<g fill="none" stroke="rgb(40,34,30)" strokeWidth="3.4">
								<circle cx={x - 40} cy={y + 90} r="76" />
								<circle cx={x - 40} cy={y + 90} r="48" />
								{[0, 1, 2, 3, 4].map((i) => (
									<path
										key={i}
										d={`M${x + 40} ${y + 40 + i * 28} C ${x + 110} ${y + 16 + i * 28} ${x + 170} ${y + 64 + i * 28} ${x + w + 60} ${y + 40 + i * 28}`}
									/>
								))}
							</g>
						</svg>
					)}
				</Stage>
			);
		},
	},
};

export { TileBox };
