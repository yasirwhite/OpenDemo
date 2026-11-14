/**
 * hazel s6 — the close: loader lines, two claims and the wordmark
 * (33.84 -> 43.84s).
 *
 * Measured (reference px at 1280x720, 25fps):
 *   LOADER f850-890. White [252,252,250]. One centred status line rolling up
 *          through three strings on a ~14-frame clock, with a spinner; lines
 *          overlap briefly in the swaps, then fade.
 *   CLAIM  f890-955. Line blur-in left to right over ~24 frames (x 505-775 at
 *          30px), held; tiles pop around it on f920-945 and leave by f950.
 *   SWAP   f958-1019. Second claim fades up on a warmer ground [249,249,245];
 *          the end phrase cuts through three faces (f980-1006, ~8 frames each)
 *          and back to the regular line.
 *   MARK   f1020-1096. Cross-fade (about 4 frames) to the wordmark, y 360.
 */
import React from "react";
import { StatusLine } from "./hazel-s5.jsx";
import { CONDENSED, DISPLAY, H, localF, prog, rgbs, Stage, UI } from "./hazel-shared.jsx";
import { NutGlyph, TileBox } from "./hazel-shared-art.jsx";

const FACES = {
	italic: { font: "italic 800 52px Georgia, serif", ls: -0.5 },
	heavy: { font: `900 52px ${DISPLAY}`, ls: 0 },
	condensed: { font: `700 60px ${CONDENSED}`, ls: 0.5 },
};

export const S6_PRESETS = {
	"hazel-loader": {
		note: "A blank frame with a single status line rolling up through `items`, with a spinner, before the close. Role product-voice.",
		nativeMs: 1640,
		params: {
			items: ["array", "-", "three status strings"],
			period: ["number", "14", "frames per line"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			return (
				<Stage z={2} bg={[252, 252, 250]}>
					<StatusLine
						f={f}
						x={330}
						y={330}
						items={c.items ?? []}
						period={c.period ?? 14}
						size={46}
						colour={H.loaderGrey}
						fadeOutAt={c.fadeOutAt ?? 36}
					/>
				</Stage>
			);
		},
	},

	"hazel-claim": {
		note: "One centred line that blurs in left to right, held; `tiles` [{at, out, x, y, w, h, art|src}] pop around it. Keep it to one short outcome sentence.",
		nativeMs: 2640,
		params: {
			text: ["string", "-", "the claim (role brand)"],
			tiles: ["array", "-", "tiles around the line"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const text = c.text ?? "";
			const dur = (c.durationMs ?? 2640) / 40;
			const words = text.split(" ");
			const fadeOut = 1 - prog(f, dur - 6, 6, "linear");
			const outBlur = f > dur - 6 ? (f - (dur - 6)) * 1.1 : 0;
			return (
				<Stage z={2} bg={[252, 252, 250]}>
					<div
						style={{
							position: "absolute",
							left: 0,
							width: 1280,
							top: 330,
							textAlign: "center",
							font: `500 50px ${UI}`,
							color: rgbs(H.claim),
							opacity: fadeOut,
							filter: outBlur ? `blur(${outBlur.toFixed(2)}px)` : undefined,
						}}
					>
						{words.map((w, i) => {
							const a = i * 3;
							const p = prog(f, a, 10);
							return (
								<span
									key={`${w}${i}`}
									style={{
										opacity: p,
										filter: p < 1 ? `blur(${((1 - p) * 8).toFixed(2)}px)` : undefined,
										marginRight: 9,
										display: "inline-block",
									}}
								>
									{w}
								</span>
							);
						})}
					</div>
					{(c.tiles ?? []).map((tile) => {
						if (f < tile.at || (tile.out != null && f >= tile.out)) return null;
						return (
							<TileBox
								key={`${tile.at}-${tile.x}`}
								{...tile}
								scale={0.9 + 0.1 * Math.min(1, (f - tile.at) / 3)}
							/>
						);
					})}
				</Stage>
			);
		},
	},

	"hazel-swap-line": {
		note: "Second claim on a warmer ground with the end phrase cut through three faces on a stepped clock, then back to the regular line. `tail` is the phrase, `swaps` [{from, to, face}] the cuts (faces: italic, heavy, condensed).",
		nativeMs: 2480,
		params: {
			lead: ["string", "-", "first part of the line (role brand)"],
			tail: ["string", "-", "the phrase that changes face (role brand)"],
			swaps: ["array", "-", "[{from, to, face}] frames"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const swap = (c.swaps ?? []).find((s) => f >= s.from && f < s.to);
			const face = swap ? FACES[swap.face] : { font: `500 50px ${UI}`, ls: 0 };
			const dur = (c.durationMs ?? 2480) / 40;
			const a = prog(f, 0, 6, "linear") * (1 - prog(f, dur - 4, 4, "linear"));
			return (
				<Stage z={2} bg={[249, 249, 245]}>
					<div
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							top: 330,
							textAlign: "center",
							opacity: a,
							whiteSpace: "pre",
							color: rgbs(H.claim),
						}}
					>
						<span style={{ font: `500 50px ${UI}` }}>{c.lead}</span>
						<span
							style={{
								font: face.font,
								letterSpacing: face.ls,
								color: swap ? "rgb(24,24,28)" : rgbs(H.claim),
							}}
						>
							{c.tail}
						</span>
					</div>
				</Stage>
			);
		},
	},

	"hazel-wordmark": {
		note: "The close: the glyph and wordmark in the middle of a white frame, cross-fading up over a few frames and holding to the last frame. Bookends the film's opening label.",
		nativeMs: 3040,
		params: {
			name: ["string", "Filbert", "wordmark (role brand)"],
			fadeFrames: ["number", "4", "cross-fade frames"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const a = prog(f, 0, c.fadeFrames ?? 4, "linear");
			const name = c.name ?? "Filbert";
			return (
				<Stage z={2} bg={[252, 252, 252]}>
					<div
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							top: 314,
							textAlign: "center",
							opacity: a,
							whiteSpace: "pre",
						}}
					>
						<svg width="64" height="86" style={{ verticalAlign: "-16px", marginRight: 20 }}>
							<NutGlyph x={4} y={14} size={58} fill={[30, 32, 38]} />
						</svg>
						<span style={{ font: `600 72px ${UI}`, color: "rgb(30,32,38)" }}>
							{name.slice(0, 4)}
						</span>
						<span style={{ font: `300 72px ${UI}`, color: "rgb(30,32,38)" }}>{name.slice(4)}</span>
					</div>
				</Stage>
			);
		},
	},
};
