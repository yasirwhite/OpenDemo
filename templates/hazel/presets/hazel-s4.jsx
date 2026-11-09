/**
 * hazel s4 — the output on real things: the four-frame mockup montage and the
 * table of finished work (23.24 -> 28.60s).
 *
 * Measured (reference px at 1280x720, 25fps):
 *   MOCKUPS   f581-639. Hard cuts on a 4-frame clock (f581 f585 f589 f593 f597
 *             f601 f605 f609 f613 f617 f621), the last one (the shirt) held
 *             f623-639 and pulling back toward the table.
 *   TABLE     f640-714. A warm grey-cream ground [226,225,218] lifting to
 *             [229,228,230] in the middle, under thin dark guide lines. A
 *             picture flickers line / colour on a 3-frame clock (f641-656) and
 *             a mono label types beside it. A big mark goes outline then solid
 *             on f659-667. Then the whole table is revealed tile by tile,
 *             the view zooming out in steps (f668, f683, f692).
 */
import React from "react";
import { H, kf, localF, MONO, rgbs, SERIF, Stage, UI } from "./hazel-shared.jsx";
import { Bird, Mockup, SunMark, TileBox } from "./hazel-shared-art.jsx";

const Guide = ({ d }) => <path d={d} fill="none" stroke="rgb(110,110,106)" strokeWidth="1.2" />;

export const S4_PRESETS = {
	"hazel-mockups": {
		note: "The mark on real objects, cut hard on a four-frame clock. `items` [{at, kind, src, tint, pose}]: `kind` names the drawn mockup (card, fibre, shoe, tag, pocket, kraft, mug, cap, phone, knit), `src` drops a photo in its place. The last item is held and pulls back with `outKeys`.",
		nativeMs: 2360,
		params: {
			items: ["array", "-", "[{at (frames), kind|src, tint, pose}] slots mockup-1..11"],
			outKeys: ["array", "-", "[{at, s}] pull-back of the last mockup"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const items = c.items ?? [];
			let cur = items[0];
			for (const it of items) if (f >= it.at) cur = it;
			const isLast = cur === items[items.length - 1];
			const s = isLast ? (kf(c.outKeys ?? [{ at: 0, s: 1 }], f).s ?? 1) : 1;
			return (
				<Stage z={2} bg={[238, 238, 234]}>
					<div
						style={{
							position: "absolute",
							inset: 0,
							transform: `scale(${s.toFixed(4)})`,
							transformOrigin: "40% 50%",
						}}
					>
						{cur.src ? (
							<img alt="" src={cur.src} style={{ width: 1280, height: 720, objectFit: "cover" }} />
						) : (
							<Mockup kind={cur.kind} tint={cur.tint} pose={cur.pose} />
						)}
					</div>
				</Stage>
			);
		},
	},

	"hazel-table": {
		note: "A warm table with thin guide lines where finished work collects: a line/colour flicker tile (`flicker`), a mono label typing, the big mark going outline then solid (`markAt`), then `tiles` [{at, out, x, y, w, h, art|src, label}] popping on while `camKeys` zoom out in steps. Everything sits on the table plane, so the camera moves it as one.",
		nativeMs: 3000,
		params: {
			flicker: ["object", "-", "{from, to, x, y, w, h, period}"],
			label: ["object", "-", "{at, x, y, name, sub}"],
			markAt: ["number", "19", "frame the big mark appears"],
			markOut: ["number", "28", "frame the big mark leaves"],
			tiles: ["array", "-", "[{at,out,x,y,w,h,art,src,label}]"],
			camKeys: ["array", "-", "[{at, s}] view scale (frames)"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const s = kf(c.camKeys ?? [{ at: 0, s: 1 }], f).s ?? 1;
			const flick = c.flicker;
			const showFlick = flick && f >= flick.from && f < flick.to;
			const colourOn = showFlick && Math.floor((f - flick.from) / (flick.period ?? 3)) % 2 === 1;
			const lab = c.label;
			const markAt = c.markAt ?? 19;
			const markOut = c.markOut ?? 28;
			const showMark = f >= markAt && f < markOut;
			const markLine = f < markAt + 4;
			const typed = lab
				? Math.min(Math.floor(Math.max(0, f - lab.at) * 1.8), lab.sub.length + lab.name.length)
				: 0;
			const nameN = lab ? Math.min(lab.name.length, typed) : 0;
			const subN = lab ? Math.max(0, typed - lab.name.length) : 0;
			return (
				<Stage
					z={2}
					style={{
						background:
							"radial-gradient(ellipse 58% 62% at 50% 46%, rgb(232,231,229) 0%, rgb(222,221,215) 100%)",
					}}
				>
					<div
						style={{
							position: "absolute",
							inset: 0,
							transform: `scale(${s.toFixed(4)})`,
							transformOrigin: "640px 360px",
						}}
					>
						<svg
							width="1280"
							height="720"
							style={{ position: "absolute", inset: 0, overflow: "visible" }}
						>
							<Guide d="M30 12 L130 -160" />
							<Guide d="M84 720 L84 -200" />
							<Guide d="M84 200 L470 -220" />
							<Guide d="M1120 -40 L1138 540" />
							<Guide d="M420 700 L1060 56" />
						</svg>
						{(c.tiles ?? []).map((tile) => {
							if (f < tile.at || (tile.out != null && f >= tile.out)) return null;
							if (tile.block) {
								return (
									<div
										key={`${tile.at}-${tile.x}`}
										style={{
											position: "absolute",
											left: tile.x,
											top: tile.y,
											width: tile.w,
											font: `400 ${tile.size ?? 11}px/1.3 ${UI}`,
											color: "rgb(70,70,72)",
										}}
									>
										<div
											style={{
												font: `700 ${tile.titleSize ?? (tile.size ?? 11) * 1.4}px ${UI}`,
												color: "rgb(30,30,34)",
												marginBottom: 2,
											}}
										>
											{tile.title}
										</div>
										{tile.block}
									</div>
								);
							}
							return <TileBox key={`${tile.at}-${tile.x}-${tile.y}`} {...tile} />;
						})}
						{showFlick && (
							<TileBox
								x={flick.x}
								y={flick.y}
								w={flick.w}
								h={flick.h}
								art={colourOn ? (flick.art ?? "lighthouse") : "sceneLine"}
							/>
						)}
						{lab && f >= lab.at && (lab.out == null || f < lab.out) && (
							<div
								style={{
									position: "absolute",
									left: lab.x,
									top: lab.y,
									font: `700 ${lab.size ?? 44}px ${MONO}`,
									color: rgbs(H.ink),
									whiteSpace: "pre",
								}}
							>
								{lab.name.slice(0, nameN)}
								<div
									style={{
										font: `400 ${(lab.size ?? 44) * 0.55}px ${MONO}`,
										marginTop: 4,
										color: rgbs([86, 88, 96]),
									}}
								>
									{lab.sub.slice(0, subN)}
								</div>
							</div>
						)}
						{showMark && (
							<svg width="1280" height="720" style={{ position: "absolute", inset: 0 }}>
								{markLine ? (
									<>
										<rect x="460" y="180" width="360" height="360" fill="#fff" />
										<SunMark cx={640} cy={360} r={170} line />
									</>
								) : (
									<SunMark cx={640} cy={360} r={180} ink={[26, 26, 28]} gap={[226, 225, 218]} />
								)}
							</svg>
						)}
						{c.digit && f >= c.digit.at && (
							<svg
								width="1280"
								height="720"
								style={{ position: "absolute", inset: 0, overflow: "visible" }}
							>
								<text
									x={c.digit.x}
									y={c.digit.y}
									textAnchor="middle"
									fill="none"
									stroke="rgb(100,100,98)"
									strokeWidth="1.4"
									strokeDasharray="5200 5200"
									strokeDashoffset={
										(1 - Math.min(1, (f - c.digit.at) / (c.digit.dur ?? 12))) * 5200
									}
									style={{ font: `400 ${c.digit.size ?? 900}px ${SERIF}` }}
								>
									{c.digit.text}
								</text>
							</svg>
						)}
						{(c.arrows ?? []).map((a) =>
							f >= a.at && (a.out == null || f < a.out) ? (
								<svg key={a.x} width="1280" height="720" style={{ position: "absolute", inset: 0 }}>
									<path
										d={`M${a.x} ${a.y} h60 m-22 -22 l22 22 l-22 22`}
										fill="none"
										stroke="rgb(26,26,28)"
										strokeWidth="2.4"
									/>
								</svg>
							) : null,
						)}
					</div>
				</Stage>
			);
		},
	},
};

export { Bird };
