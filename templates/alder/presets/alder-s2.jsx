/**
 * alder s2 — the horizon-plate montage (1.24s -> 15.96s in the reference).
 *
 * One scene per plate. A plate is a still: a SKY above a curved EDGE and a
 * textured BODY below it. The reference's plates are macro photographs (a
 * dish rim, a leaf, a loaf, lace, a fungus gill...); here each is an IMAGE
 * SLOT clipped to the body (`src`), and with no image it is filled by a
 * generated texture stack that carries the same colour, value and edge
 * character, so the rhythm of the cut reads the same.
 *
 * Measured (per plate, at the plate's 3rd frame, ref -> stage px x4/3):
 *   edge apex y at frame centre: 335-371 for 31 of 36 plates (median 355);
 *   sag (edge drop 640 px out): 45-270;
 *   cut lengths: 1.04, 1.04, 0.44, 0.24, 0.24, 0.52, 0.60, 0.52, 0.56, 0.60,
 *   0.52, 0.56, 0.60 | 0.32, 0.40, 0.32, 0.44, 0.48 | 0.32, 0.40, 0.32, 0.32,
 *   0.44 | 0.28, 0.24, 0.32, 0.32, 0.28, 0.32, 0.24, 0.28, 0.28, 0.28, 0.24,
 *   0.20, 0.20 s — the montage accelerates from ~0.55s to ~0.25s per cut.
 */
import React from "react";
import { arcGeom, bodyPath, edgePoints, ptsPath, rgbs, rng, skyPath } from "./alder-shared.jsx";

const s = (ms) => ms / 1000;

/** fractal noise mapped through a 2-4 colour table. */
function NoiseLayer({ id, L }) {
	const pal = L.colours ?? [
		[0, 0, 0],
		[255, 255, 255],
	];
	const tab = (k) => pal.map((c) => (c[k] / 255).toFixed(4)).join(" ");
	const c = L.contrast ?? 1.6;
	const b = 0.5 - 0.5 * c;
	const fx = L.freq?.[0] ?? L.freq ?? 0.01;
	const fy = L.freq?.[1] ?? L.freq ?? 0.01;
	return (
		<>
			<filter
				colorInterpolationFilters="sRGB"
				id={id}
				x="-40"
				y="-800"
				width="1360"
				height="2300"
				filterUnits="userSpaceOnUse"
			>
				<feTurbulence
					type={L.turbulence ? "turbulence" : "fractalNoise"}
					baseFrequency={`${fx} ${fy}`}
					numOctaves={L.octaves ?? 4}
					seed={L.seed ?? 1}
				/>
				<feColorMatrix
					type="matrix"
					values={`${c} 0 0 0 ${b}  ${c} 0 0 0 ${b}  ${c} 0 0 0 ${b}  0 0 0 0 1`}
				/>
				<feComponentTransfer>
					<feFuncR type="table" tableValues={tab(0)} />
					<feFuncG type="table" tableValues={tab(1)} />
					<feFuncB type="table" tableValues={tab(2)} />
				</feComponentTransfer>
				{L.blur ? <feGaussianBlur stdDeviation={L.blur} /> : null}
			</filter>
			<rect x="-40" y="-800" width="1360" height="2300" filter={`url(#${id})`} />
		</>
	);
}

/** concentric bands parallel to the edge (agate, a dish wall, growth rings). */
function RingsLayer({ id, L, geom }) {
	const pal = L.colours ?? [
		[0, 0, 0],
		[255, 255, 255],
	];
	const period = L.period ?? 40;
	const r = rng(L.seed ?? 3);
	const n = 1200 / period + 2;
	const rings = [];
	let d = L.offset ?? 0;
	for (let i = 0; i < n * 3 && d < 1300; i++) {
		const w = period * (0.35 + r() * (L.jitter ?? 0.9));
		rings.push(
			<circle
				key={i}
				cx={geom.ax}
				cy={geom.cy}
				r={Math.max(1, geom.R - d - w / 2)}
				fill="none"
				stroke={rgbs(pal[i % pal.length])}
				strokeWidth={w * (L.fillRatio ?? 0.55)}
				opacity={L.ringAlpha ?? 1}
			/>,
		);
		d += w;
	}
	return (
		<>
			{L.blur ? (
				<filter
					colorInterpolationFilters="sRGB"
					id={id}
					x="-10%"
					y="-10%"
					width="120%"
					height="120%"
				>
					<feGaussianBlur stdDeviation={L.blur} />
				</filter>
			) : null}
			<g filter={L.blur ? `url(#${id})` : undefined}>{rings}</g>
		</>
	);
}

/** lines fanning from the disc's centre (veins, gills, spokes). */
function SpokesLayer({ id, L, geom }) {
	const r = rng(L.seed ?? 5);
	const n = L.count ?? 60;
	const half = Math.asin(Math.min(1, 760 / geom.R));
	const lines = [];
	for (let i = 0; i < n; i++) {
		const a = -half + ((i + 0.5 + (r() - 0.5) * (L.jitter ?? 0.6)) / n) * 2 * half;
		const r0 = geom.R - (L.depth ?? 1400);
		const r1 = geom.R + 4;
		const x0 = geom.ax + Math.sin(a) * r0;
		const y0 = geom.cy - Math.cos(a) * r0;
		const x1 = geom.ax + Math.sin(a) * r1;
		const y1 = geom.cy - Math.cos(a) * r1;
		const w = (L.width ?? 3) * (0.5 + r());
		lines.push(
			<line
				key={i}
				x1={x0}
				y1={y0}
				x2={x1}
				y2={y1}
				stroke={rgbs((L.colours ?? [[0, 0, 0]])[i % (L.colours?.length ?? 1)])}
				strokeWidth={w}
				opacity={(L.alpha ?? 1) * (0.55 + 0.45 * r())}
			/>,
		);
	}
	return (
		<>
			{L.blur ? (
				<filter
					colorInterpolationFilters="sRGB"
					id={id}
					x="-10%"
					y="-10%"
					width="120%"
					height="120%"
				>
					<feGaussianBlur stdDeviation={L.blur} />
				</filter>
			) : null}
			<g filter={L.blur ? `url(#${id})` : undefined}>{lines}</g>
		</>
	);
}

/** seeded straight strokes (chalk construction lines, a sketch, a blueprint). */
function LinesLayer({ L }) {
	const r = rng(L.seed ?? 9);
	const n = L.count ?? 20;
	const out = [];
	const box = L.box ?? [-40, 0, 1320, 720];
	for (let i = 0; i < n; i++) {
		const x = box[0] + r() * (box[2] - box[0]);
		const y = box[1] + r() * (box[3] - box[1]);
		const ang = ((L.angle ?? 0) + (r() - 0.5) * (L.spread ?? 180)) * (Math.PI / 180);
		const len = (L.length ?? 400) * (0.4 + r());
		const w = (L.width ?? 3) * (0.6 + 0.8 * r());
		out.push(
			<line
				key={i}
				x1={x - (Math.cos(ang) * len) / 2}
				y1={y - (Math.sin(ang) * len) / 2}
				x2={x + (Math.cos(ang) * len) / 2}
				y2={y + (Math.sin(ang) * len) / 2}
				stroke={rgbs((L.colours ?? [[255, 255, 255]])[i % (L.colours?.length ?? 1)])}
				strokeWidth={w}
				strokeLinecap="round"
				opacity={L.alpha ?? 1}
			/>,
		);
	}
	return <g>{out}</g>;
}

/** seeded discs (cells, bubbles, lace eyelets, droplets, sparkle). */
function CellsLayer({ L, geom }) {
	const r = rng(L.seed ?? 11);
	const n = L.count ?? 80;
	const out = [];
	const rr = L.r ?? [6, 30];
	const below = L.region !== "sky" && L.region !== "all";
	for (let i = 0; i < n; i++) {
		const x = -20 + r() * 1320;
		const top = below ? geom.yAt(x) + (L.inset ?? 0) : (L.box?.[1] ?? 0);
		const bot = L.depth != null ? top + L.depth : 760;
		const y = top + (L.bias ? r() ** L.bias : r()) * (bot - top);
		const rad = rr[0] + r() * (rr[1] - rr[0]);
		out.push(
			<circle
				key={i}
				cx={x}
				cy={y}
				r={rad}
				fill={L.fill ? rgbs(L.fill[i % L.fill.length]) : "none"}
				stroke={L.stroke ? rgbs(L.stroke) : "none"}
				strokeWidth={L.strokeWidth ?? 2}
				opacity={(L.alpha ?? 1) * (L.alphaJitter ? 1 - L.alphaJitter * r() : 1)}
			/>,
		);
	}
	return <g>{out}</g>;
}

/** seeded flat shapes (collage cut-outs). */
function BlobsLayer({ L, geom }) {
	const r = rng(L.seed ?? 13);
	const n = L.count ?? 14;
	const out = [];
	for (let i = 0; i < n; i++) {
		const bx = L.box;
		const x = bx ? bx[0] + r() * (bx[2] - bx[0]) : -40 + r() * 1360;
		const y = bx ? bx[1] + r() * (bx[3] - bx[1]) : geom.yAt(x) + 10 + r() * 380;
		const w = 60 + r() * (L.size ?? 240);
		const h = 60 + r() * (L.size ?? 240);
		const rot = (r() - 0.5) * 60;
		const round = r() < 0.4;
		const c = rgbs((L.colours ?? [[200, 60, 60]])[i % (L.colours?.length ?? 1)]);
		out.push(
			round ? (
				<ellipse
					key={i}
					cx={x}
					cy={y}
					rx={w / 2}
					ry={h / 2}
					fill={c}
					transform={`rotate(${rot} ${x} ${y})`}
				/>
			) : (
				<rect
					key={i}
					x={x - w / 2}
					y={y - h / 2}
					width={w}
					height={h}
					rx={r() * 30}
					fill={c}
					transform={`rotate(${rot} ${x} ${y})`}
				/>
			),
		);
	}
	return <g>{out}</g>;
}

/** vertical bands, cycling a palette (thermal camera, wood grain end-on). */
function StripesLayer({ id, L }) {
	const r = rng(L.seed ?? 17);
	const pal = L.colours ?? [
		[0, 0, 0],
		[255, 255, 255],
	];
	const out = [];
	let x = -40;
	let i = 0;
	while (x < 1320) {
		const w = (L.width ?? 40) * (0.5 + r());
		out.push(
			<rect key={i} x={x} y={-800} width={w + 1} height={2300} fill={rgbs(pal[i % pal.length])} />,
		);
		x += w;
		i++;
	}
	return (
		<>
			{L.blur ? (
				<filter
					colorInterpolationFilters="sRGB"
					id={id}
					x="-10%"
					y="-10%"
					width="120%"
					height="120%"
				>
					<feGaussianBlur stdDeviation={L.blur} />
				</filter>
			) : null}
			<g filter={L.blur ? `url(#${id})` : undefined}>{out}</g>
		</>
	);
}

/** short strokes laid along a direction (engraving, sketch hatching, fur). */
function HatchLayer({ L, geom }) {
	const r = rng(L.seed ?? 19);
	const n = L.count ?? 400;
	const out = [];
	for (let i = 0; i < n; i++) {
		const x = -40 + r() * 1360;
		const top = geom.yAt(x);
		const y = top + r() * (L.depth ?? 400);
		const a = ((L.angle ?? 90) + (r() - 0.5) * (L.spread ?? 20)) * (Math.PI / 180);
		const len = (L.length ?? 30) * (0.4 + r());
		out.push(
			<line
				key={i}
				x1={x}
				y1={y}
				x2={x + Math.cos(a) * len}
				y2={y + Math.sin(a) * len}
				stroke={rgbs((L.colours ?? [[0, 0, 0]])[i % (L.colours?.length ?? 1)])}
				strokeWidth={(L.width ?? 2) * (0.5 + r())}
				strokeLinecap="round"
				opacity={L.alpha ?? 1}
			/>,
		);
	}
	return <g>{out}</g>;
}

/** a band of a repeating motif riding parallel to the edge (a meander, a frieze). */
function BandLayer({ L, geom, t }) {
	const off = L.offset ?? 30; // depth of the band's centre below the edge
	const h = L.height ?? 40;
	const per = L.period ?? 60;
	const drift = (L.driftPxPerS ?? 0) * t;
	const out = [];
	const c = rgbs((L.colours ?? [[30, 60, 60]])[0]);
	for (let x = -per * 2 + (drift % per); x < 1320 + per; x += per) {
		const y = geom.yAt(x + per / 2) + off;
		if (L.motif === "dash") {
			out.push(<rect key={x} x={x} y={y - h / 2} width={per * 0.55} height={h} fill={c} />);
		} else {
			// a key/meander unit: an open square spiral drawn as a polyline
			const u = per / 4;
			const d = `M${x} ${y + h / 2}L${x} ${y - h / 2}L${x + 3 * u} ${y - h / 2}L${x + 3 * u} ${y + h / 4}L${x + u} ${y + h / 4}L${x + u} ${y - h / 6}L${x + 2 * u} ${y - h / 6}`;
			out.push(<path key={x} d={d} fill="none" stroke={c} strokeWidth={L.width ?? 6} />);
		}
	}
	return <g>{out}</g>;
}

/** discs strung along the rim itself (droplets, bubbles, stitch holes). */
function BeadsLayer({ L, geom }) {
	const r = rng(L.seed ?? 23);
	const out = [];
	const gap = L.gap ?? [40, 120];
	const rr = L.r ?? [8, 26];
	let x = -30 + r() * gap[0];
	let i = 0;
	while (x < 1310) {
		const rad = rr[0] + r() * (rr[1] - rr[0]);
		const y = geom.yAt(x) + (L.offset ?? 0) - (L.sit ? rad * L.sit : 0);
		const c = (L.fill ?? [[200, 60, 40]])[i % (L.fill?.length ?? 1)];
		out.push(
			<g key={i} opacity={L.alpha ?? 1}>
				<circle
					cx={x}
					cy={y}
					r={rad}
					fill={rgbs(c)}
					stroke={L.stroke ? rgbs(L.stroke) : "none"}
					strokeWidth={L.strokeWidth ?? 1.5}
				/>
				{L.shine ? (
					<circle
						cx={x - rad * 0.3}
						cy={y - rad * 0.35}
						r={rad * 0.28}
						fill={rgbs(L.shine)}
						opacity="0.55"
					/>
				) : null}
			</g>,
		);
		x += rad * 2 + gap[0] + r() * (gap[1] - gap[0]);
		i++;
	}
	return <g>{out}</g>;
}

function Layer({ id, L, geom, t }) {
	switch (L.kind) {
		case "beads":
			return <BeadsLayer L={L} geom={geom} />;
		case "noise":
			return <NoiseLayer id={id} L={L} />;
		case "rings":
			return <RingsLayer id={id} L={L} geom={geom} />;
		case "spokes":
			return <SpokesLayer id={id} L={L} geom={geom} />;
		case "lines":
			return <LinesLayer L={L} />;
		case "cells":
			return <CellsLayer L={L} geom={geom} />;
		case "blobs":
			return <BlobsLayer L={L} geom={geom} />;
		case "stripes":
			return <StripesLayer id={id} L={L} />;
		case "hatch":
			return <HatchLayer L={L} geom={geom} />;
		case "band":
			return <BandLayer L={L} geom={geom} t={t} />;
		case "fill":
			return <rect x="-40" y="-800" width="1360" height="2300" fill={rgbs(L.colour)} />;
		default:
			return null;
	}
}

/**
 * One horizon plate. Params (all optional except timing):
 *   edge  {ax, ay, sag, style, amp, freq, period, seed}  — the horizon
 *   sky   {colour, colour2, angle, stops}                  — above the edge
 *   body  {colour, colour2, depth}                         — base below the edge
 *   layers [{kind, region:'body'|'sky'|'all', opacity, blend, blur, ...}]
 *   rims  [{colour, width, offset, blur, alpha}]           — lines along the edge
 *   blur  px — whole-plate softness (out-of-focus shots)
 *   src / fit / slot / label — an image clipped to the body (the photo slot)
 *   skySrc — an image for the sky region
 */
export function Plate({ cfg, t }) {
	const id = cfg.id ?? "plate";
	const geom = arcGeom(cfg.edge ?? {});
	const pts = edgePoints(geom, cfg.edge ?? {});
	const sky = cfg.sky ?? { colour: [0, 0, 0] };
	const body = cfg.body ?? { colour: [128, 128, 128] };
	const local = t - s(cfg.startMs ?? 0);
	const layers = cfg.layers ?? [];
	const region = (L) => L.region ?? "body";
	const skyFill = sky.colour2 ? `url(#${id}-skyg)` : rgbs(sky.colour);
	const bodyFill = body.colour2 ? `url(#${id}-bodyg)` : rgbs(body.colour);
	const ang = ((sky.angle ?? 180) - 90) * (Math.PI / 180);
	const rimRefY = geom.ay;
	const render = (L, i) => (
		<g
			key={i}
			opacity={L.opacity ?? 1}
			style={L.blend ? { mixBlendMode: L.blend } : undefined}
			transform={
				L.driftPxPerS && L.kind !== "band"
					? `translate(${(L.driftPxPerS * local).toFixed(2)} 0)`
					: undefined
			}
		>
			<Layer id={`${id}-L${i}`} L={L} geom={geom} t={local} />
		</g>
	);
	return (
		<svg
			width="1280"
			height="720"
			viewBox="0 0 1280 720"
			style={{ position: "absolute", left: 0, top: 0, overflow: "hidden" }}
		>
			<defs>
				<clipPath id={`${id}-body`}>
					<path d={bodyPath(pts)} />
				</clipPath>
				<clipPath id={`${id}-sky`}>
					<path d={skyPath(pts)} />
				</clipPath>
				{sky.colour2 ? (
					<linearGradient
						id={`${id}-skyg`}
						gradientUnits="userSpaceOnUse"
						x1={640 - Math.cos(ang) * 400}
						y1={360 - Math.sin(ang) * 400}
						x2={640 + Math.cos(ang) * 400}
						y2={360 + Math.sin(ang) * 400}
					>
						<stop offset={sky.stops?.[0] ?? 0} stopColor={rgbs(sky.colour)} />
						<stop offset={sky.stops?.[1] ?? 1} stopColor={rgbs(sky.colour2)} />
					</linearGradient>
				) : null}
				{body.colour2 ? (
					<linearGradient
						id={`${id}-bodyg`}
						gradientUnits="userSpaceOnUse"
						x1="0"
						y1={rimRefY}
						x2="0"
						y2={rimRefY + (body.depth ?? 360)}
					>
						<stop offset="0" stopColor={rgbs(body.colour)} />
						<stop offset="1" stopColor={rgbs(body.colour2)} />
					</linearGradient>
				) : null}
				{cfg.blur ? (
					<filter
						colorInterpolationFilters="sRGB"
						id={`${id}-soft`}
						x="-5%"
						y="-5%"
						width="110%"
						height="110%"
					>
						<feGaussianBlur stdDeviation={cfg.blur} />
					</filter>
				) : null}
				{(cfg.rims ?? []).map((rm, i) =>
					rm.blur ? (
						<filter
							colorInterpolationFilters="sRGB"
							key={i}
							id={`${id}-rim${i}`}
							x="-10%"
							y="-50%"
							width="120%"
							height="200%"
						>
							<feGaussianBlur stdDeviation={rm.blur} />
						</filter>
					) : null,
				)}
			</defs>
			<g filter={cfg.blur ? `url(#${id}-soft)` : undefined}>
				<g clipPath={`url(#${id}-sky)`}>
					<rect x="-40" y="-800" width="1360" height="2300" fill={skyFill} />
					{cfg.skySrc ? (
						<image
							href={cfg.skySrc}
							x="0"
							y="0"
							width="1280"
							height="720"
							preserveAspectRatio="xMidYMid slice"
						/>
					) : null}
				</g>
				<g clipPath={`url(#${id}-body)`}>
					<rect x="-40" y="-800" width="1360" height="2300" fill={bodyFill} />
					{cfg.src ? (
						<image
							href={cfg.src}
							x="0"
							y={geom.ay - 40}
							width="1280"
							height={760 - geom.ay + 40}
							preserveAspectRatio={cfg.fit === "contain" ? "xMidYMin meet" : "xMidYMin slice"}
						/>
					) : null}
				</g>
				{/* Layers paint in list order, each clipped to its own region, so a
				    paper grain laid over the whole plate sits UNDER the ink drawn
				    after it. With a photo in the body, body layers are skipped. */}
				{layers.map((L, i) => {
					const rg = region(L);
					if (rg === "body" && cfg.src) return null;
					if (rg === "all") return render(L, i);
					return (
						<g key={i} clipPath={`url(#${id}-${rg})`}>
							{render(L, i)}
						</g>
					);
				})}
				{(cfg.rims ?? []).map((rm, i) => (
					<path
						key={i}
						d={ptsPath(pts.map((p) => [p[0], p[1] + (rm.offset ?? 0)]))}
						fill="none"
						stroke={rgbs(rm.colour)}
						strokeWidth={rm.width ?? 3}
						opacity={rm.alpha ?? 1}
						filter={rm.blur ? `url(#${id}-rim${i})` : undefined}
					/>
				))}
			</g>
		</svg>
	);
}

export const S2_PRESETS = {
	"alder-plate": {
		note: "ONE horizon plate of the montage: a sky above a curved edge and a textured body below it, holding still for its cut. The edge's apex sits at y~355 at frame centre on almost every plate (that is the match cut); vary `edge.sag` (45-270), the edge `style` and the colours from cut to cut. Put a real photo in the body with `src` (it is clipped to the edge); with no `src` the `layers` stack generates a stand-in texture (noise, rings, spokes, lines, cells, blobs, stripes, hatch, band). Cut, never dissolve: give consecutive plates abutting startMs/durationMs.",
		nativeMs: 400,
		params: {
			edge: [
				"object",
				"{ax:640, ay:355, sag:90, style:'smooth'}",
				"the horizon: apex x/y, sag 640px out, style smooth|rough|bumps|scallop|fur with amp/freq/period/seed",
			],
			sky: ["object", "{colour:[0,0,0]}", "above the edge; colour2 + angle for a two-tone"],
			body: [
				"object",
				"{colour:[128,128,128]}",
				"base fill below the edge; colour2 + depth ramps away from the rim",
			],
			layers: ["array", "[]", "generated texture stack; each {kind, region, opacity, blend, ...}"],
			rims: [
				"array",
				"[]",
				"strokes along the edge {colour, width, offset, blur, alpha} — rim light, a rainbow fringe",
			],
			blur: ["number", "0", "whole-plate softness"],
			src: ["string", "-", "IMAGE SLOT: a photo clipped to the body (the reference's macro shots)"],
			slot: ["string", "-", "slot id for the image"],
			label: ["string", "-", "what photo belongs here"],
		},
		render: (cfg, t) => <Plate cfg={cfg} t={t} />,
	},
};
