/**
 * hazel s2 — the word drum (7.52 -> 13.20s).
 *
 * Measured (reference px at 1280x720, 25fps):
 *   One centred column of words, pitch 132 px, selected word centred y 354
 *   (first two beats) then y 538 is the same row after the camera settles —
 *   in the reference the column is a single strip and the selection marker is
 *   fixed; the words roll under it. Selected word ink [36,42,61], others
 *   [205,206,208] on [245,245,245].
 *   The strip rolls fast through f188-211 (four words, heavy motion blur),
 *   holds on the first selection f212-251, steps one word in ~4 frames to the
 *   second (f254-277) and again to the third (f281-327), then rolls away while
 *   the frame dissolves to the sky (f328-336).
 *   Tiles pop in on a stepped scale (3 frames) around the column for each
 *   stop and leave with it.
 */
import React from "react";
import { H, kf, localF, rgbs, SelectionBox, Stage, UI } from "./hazel-shared.jsx";
import { Icon, TileBox } from "./hazel-shared-art.jsx";

const PITCH = 132;
const CENTRE_Y = 354;

export const S2_PRESETS = {
	"hazel-drum": {
		note: "The product's scope as a rolling word column under a fixed selection box. `words` is the strip, `rollKeys` [{at, i}] scroll it (i = strip index on the marker, fractions roll), `stops` give each selected word's box width and its tiles [{at, out, x, y, w, h, art|src}]. The roll blurs the strip while it moves; the box always hugs the settled word.",
		nativeMs: 5680,
		params: {
			words: ["array", "-", "strip of words, top to bottom (role feature)"],
			rollKeys: ["array", "-", "[{at (frames), i, ease}]"],
			stops: ["array", "-", "[{at, out, word, boxW, tiles}]"],
			iconRows: ["array", "-", "icons flanking the column on the 'Icons' stop"],
		},
		render: (c, t) => {
			const f = localF(c, t);
			const words = c.words ?? [];
			const rk = c.rollKeys ?? [];
			const i0 = kf(rk, f).i ?? 0;
			const i1 = kf(rk, f + 0.5).i ?? i0;
			const speed = Math.abs(i1 - i0) * 2 * PITCH; // px per frame
			const blur = Math.min(7, speed * 0.1);
			const stop = (c.stops ?? []).find((s) => f >= s.at && f < s.out);
			const box = stop ?? (c.stops ?? []).find((s) => f < s.at) ?? (c.stops ?? [])[0];
			const boxW = box?.boxW ?? 500;
			const settled = stop && speed < 2;
			return (
				<Stage z={2} bg={[245, 245, 245]}>
					<div
						style={{
							position: "absolute",
							inset: 0,
							filter: blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : undefined,
						}}
					>
						{words.map((word, i) => {
							const y = CENTRE_Y + (i - i0) * PITCH;
							if (y < -80 || y > 800) return null;
							const onMarker = Math.abs(i - i0) < 0.5;
							return (
								<div
									key={`${word}-${i}`}
									style={{
										position: "absolute",
										left: 0,
										width: 1280,
										top: y - 44,
										textAlign: "center",
										font: `${onMarker ? 700 : 500} ${onMarker ? 78 : 66}px ${UI}`,
										lineHeight: "88px",
										color: onMarker ? rgbs(H.ink) : rgbs(H.greyWord),
										whiteSpace: "pre",
									}}
								>
									{word}
								</div>
							);
						})}
					</div>
					{f < (c.durationMs ?? 5680) / 40 && (
						<SelectionBox
							x={640 - boxW / 2}
							y={CENTRE_Y - 60}
							w={boxW}
							h={120}
							a={settled ? 1 : 0.9}
						/>
					)}
					{(c.stops ?? []).flatMap((s) =>
						(s.tiles ?? []).map((tile) => {
							if (f < tile.at || f >= s.out + 5) return null;
							// Tiles ride the strip: once the column leaves this stop they
							// scroll up with it and fade (f250-253 in the reference).
							const stopI = kf(c.rollKeys ?? [], s.at + 6).i ?? 0;
							const off = Math.max(0, (i0 - stopI) * PITCH);
							const pop = Math.min(1, (f - tile.at) / 3);
							const a = Math.max(0, Math.min(1, pop * 1.4) * (1 - off / PITCH));
							return (
								<TileBox
									key={`${s.at}-${tile.x}-${tile.y}`}
									{...tile}
									y={tile.y - off}
									opacity={a}
									scale={0.92 + 0.08 * pop}
									blur={off > 0 ? 2.5 : 0}
								/>
							);
						}),
					)}
					{(c.iconRows ?? []).map((row) => {
						if (f < row.at || f >= row.out) return null;
						const { y, size, xs, names } = row;
						return (
							<svg key={row.y} width="1280" height="720" style={{ position: "absolute", inset: 0 }}>
								{names.map((n, i) => (
									<Icon
										key={`${n}${xs[i]}`}
										name={n}
										x={xs[i] - size / 2}
										y={y - size / 2}
										size={size}
										stroke={row.colour ?? [31, 56, 96]}
										width={row.width ?? 2.6}
										stagger={0}
										p={Math.min(1, (f - row.at) / 3)}
									/>
								))}
							</svg>
						);
					})}
				</Stage>
			);
		},
	},
};
