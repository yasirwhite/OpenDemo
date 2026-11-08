/**
 * rowan s3 — from design to code to the design system (46.6 -> 73.0s).
 *
 * Measured (camera: take B, a linear push of 0.1218 px/frame on window
 * height from f1041, never reset by the cuts or dips below):
 *   - f1398 a long one-page site (1440 px design, ~4100 tall) at canvas zoom
 *     0.2, native (658, 85); f1420 the canvas zooms (4 frames) to 0.66 on its
 *     second section, a hand cursor swapping the three picture cards.
 *   - f1486 cut: scrolled to the menu section, rows selected one by one.
 *   - f1551-f1561 dip to black. The page at zoom 0.255 (native 201, 88) and
 *     a terminal ON the canvas (native 765, 258, 699x544): the agent CLI,
 *     "turn the selected frame into a React app" typing at ~24.6 chars/s
 *     from f1557. f1570-f1578 the camera punches in x1.37 about frame point
 *     (1471, 781) (both terminal edges fit that anchor to 1 px).
 *   - f1652-f1662 dip. A browser (native 772, 25, 958x960) over the editor
 *     shows the coded page and scrolls it top to bottom f1671-f1715, beside
 *     the terminal's summary (native 411, 437, 359x542).
 *   - f1717-f1731 dip. The design-system page: layers panel (0..196), rail
 *     moved to x 219, a component sheet (286,100 611x896) and three small
 *     dashboards (x 934..1227); one dashboard's dashed purple SLOT selected.
 *   - f1866 the canvas zooms onto that dashboard; the slot fills with table
 *     rows. f1981 a Variables modal; f2026 the canvas zooms to the Theme
 *     menu; f2057 the whole UI flips light for 18 frames; f2075 a mesh
 *     gradient disc whose handles are dragged (to f2189).
 *
 * Content is new: a bakery site ("Linden Bakehouse", pictures are image
 * slots site-1..6), a design system called "bramble".
 */
import React from "react";
import { PointerAt } from "./rowan-s2.jsx";
import {
	AskPill,
	Box,
	CONDENSED,
	Icon,
	K,
	kf,
	Lines,
	MONO,
	Picture,
	PropsPanel,
	rgbs,
	SERIF,
	Selection,
	T,
	Term,
	ToolRail,
	typed,
	UI,
	ZoomPill,
} from "./rowan-shared.jsx";

// ── the site the agent designed (and then coded) ──────────────────────────

/** Copy of the sample site (role product-voice: retarget with the prompt). */
export const SITE = {
	brand: "LINDEN BAKEHOUSE",
	nav: ["STORY", "MENU", "LOCATION", "EVENTS"],
	cta: "ORDER",
	kicker: "EST. 1931 · OLD TOWN · RIVERSIDE",
	hero: ["WARM FROM", "THE OVEN"],
	lede: "A century-old bakehouse for those who know the best things take time.",
	buttons: ["SEE THE MENU", "OUR STORY"],
	s2kicker: "THE CRAFT",
	s2: ["MADE BY", "HAND"],
	cards: ["STONE-MILLED FLOUR", "SLOW PROOF", "WOOD-FIRED OVEN"],
	s3kicker: "THE COUNTER",
	s3: ["MORNING", "SELECTIONS"],
	menu: [
		["RYE & CARAWAY", "6.50"],
		["BRIOCHE ROLL", "3.20"],
		["SOURDOUGH LOAF", "7.80"],
	],
	quote: "“THE KIND OF BAKERY A TOWN IS BUILT AROUND. ARRIVE EARLY.”",
	s5: ["IN THE", "OLD TOWN"],
	s6: "RESERVE A LOAF",
};

const GOLD = [214, 176, 98];
const SITE_H = 4100;

/** The page at its 1440 design width. `images` = scene image slots. */
export function Site({ images = {}, w = 1440 }) {
	const k = w / 1440;
	const ink = [236, 232, 224];
	const dim = [150, 144, 134];
	const H = (lines, x, y, size) =>
		lines.map((l, i) => (
			<T
				key={l}
				x={x}
				y={y + i * size * 0.98}
				size={size}
				weight={700}
				font={CONDENSED}
				colour={ink}
				tracking={-0.5}
			>
				{l}
			</T>
		));
	return (
		<div
			style={{
				position: "relative",
				width: w,
				height: SITE_H * k,
				overflow: "hidden",
				background: "rgb(16,14,12)",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1440,
					height: SITE_H,
					transform: `scale(${k})`,
					transformOrigin: "0 0",
				}}
			>
				{/* nav */}
				<Icon name="frame" x={70} y={42} size={22} colour={GOLD} a={1} />
				<T x={92} y={30} size={20} weight={700} colour={ink} font={UI} tracking={3}>
					{SITE.brand}
				</T>
				{SITE.nav.map((s, i) => (
					<T key={s} x={560 + i * 110} y={34} size={12} colour={dim} tracking={3} weight={600}>
						{s}
					</T>
				))}
				<Box x={1240} y={22} w={130} h={44} fill={GOLD}>
					<T
						x={0}
						w={130}
						align="center"
						y={14}
						size={12}
						weight={700}
						colour={[20, 16, 10]}
						tracking={3}
					>
						{SITE.cta}
					</T>
				</Box>
				{/* hero */}
				<div style={{ position: "absolute", left: 640, top: 90 }}>
					<Picture w={800} h={760} kind="warm" src={images["site-1"]} seed={2} />
				</div>
				<div
					style={{
						position: "absolute",
						left: 0,
						top: 90,
						width: 1000,
						height: 760,
						background: "linear-gradient(90deg, rgb(16,14,12) 45%, rgba(16,14,12,0))",
					}}
				/>
				<T x={70} y={300} size={12} colour={dim} tracking={5}>
					{SITE.kicker}
				</T>
				{H(SITE.hero, 66, 340, 128)}
				<div
					style={{
						position: "absolute",
						left: 70,
						top: 620,
						width: 520,
						font: `italic 22px/32px ${SERIF}`,
						color: rgbs(dim),
					}}
				>
					{SITE.lede}
				</div>
				<Box x={70} y={720} w={190} h={60} fill={GOLD}>
					<T
						x={0}
						w={190}
						align="center"
						y={21}
						size={12}
						weight={700}
						colour={[20, 16, 10]}
						tracking={3}
					>
						{SITE.buttons[0]}
					</T>
				</Box>
				<Box x={280} y={720} w={170} h={60} stroke={ink} sw={2}>
					<T x={0} w={170} align="center" y={21} size={12} weight={700} colour={ink} tracking={3}>
						{SITE.buttons[1]}
					</T>
				</Box>
				{/* made by hand */}
				<T x={70} y={960} size={12} colour={dim} tracking={5}>
					{SITE.s2kicker}
				</T>
				{H(SITE.s2, 66, 990, 96)}
				{SITE.cards.map((s, i) => (
					<div key={s} style={{ position: "absolute", left: 70 + i * 440, top: 1240 }}>
						<Picture
							w={420}
							h={330}
							kind={["warm", "steam", "field"][i]}
							src={images[`site-${i + 2}`]}
							seed={i + 4}
						/>
						<Box x={0} y={330} w={420} h={130} fill={[26, 23, 20]}>
							<T x={24} y={24} size={13} weight={700} colour={ink} tracking={2}>
								{s}
							</T>
							<Lines x={24} y={56} w={340} n={3} gap={16} h={5} colour={dim} a={0.5} seed={i} />
						</Box>
					</div>
				))}
				{/* selections */}
				<div style={{ position: "absolute", left: 0, top: 1800 }}>
					<Picture w={720} h={620} kind="steam" src={images["site-5"]} seed={7} />
				</div>
				<T x={800} y={1880} size={12} colour={dim} tracking={5}>
					{SITE.s3kicker}
				</T>
				{H(SITE.s3, 796, 1910, 84)}
				{SITE.menu.map(([n, p], i) => (
					<React.Fragment key={n}>
						<T x={800} y={2120 + i * 72} size={15} weight={700} colour={ink} tracking={2}>
							{n}
						</T>
						<T x={1300} y={2120 + i * 72} size={15} colour={GOLD}>
							{p}
						</T>
						<Box x={800} y={2160 + i * 72} w={560} h={1} fill={[60, 54, 48]} />
					</React.Fragment>
				))}
				{/* quote */}
				<div
					style={{
						position: "absolute",
						left: 0,
						top: 2420,
						width: 1440,
						height: 500,
						background: "radial-gradient(ellipse at 40% 50%, rgb(70,58,48), rgb(24,20,18) 70%)",
					}}
				/>
				<div
					style={{
						position: "absolute",
						left: 220,
						top: 2600,
						width: 1000,
						textAlign: "center",
						font: `700 40px/50px ${CONDENSED}`,
						color: rgbs(ink),
					}}
				>
					{SITE.quote}
				</div>
				{/* location */}
				<Box x={0} y={2920} w={1440} h={700} fill={[20, 18, 16]} />
				{H(SITE.s5, 66, 3060, 84)}
				<Lines x={70} y={3260} w={300} n={4} gap={28} h={7} colour={dim} a={0.5} seed={9} />
				<div style={{ position: "absolute", left: 620, top: 2960 }}>
					<Picture w={820} h={620} kind="field" src={images["site-6"]} seed={8} />
				</div>
				{/* reserve */}
				<T
					x={0}
					w={1440}
					align="center"
					y={3760}
					size={64}
					weight={700}
					font={CONDENSED}
					colour={ink}
				>
					{SITE.s6}
				</T>
				<Box x={560} y={3880} w={150} h={50} fill={GOLD} />
				<Box x={730} y={3880} w={150} h={50} stroke={ink} sw={2} />
			</div>
		</div>
	);
}

/** The page placed on the canvas at zoom z, top-left (x, y), with a label. */
function SiteOnCanvas({ x, y, z, images, label = "Linden Bakehouse - Bold", clipH = 990, sel }) {
	return (
		<>
			<T x={x} y={y - 18} size={11.5} colour={K.select} weight={500}>
				{label}
			</T>
			<div
				style={{
					position: "absolute",
					left: x,
					top: y,
					width: 1440 * z,
					height: Math.max(0, clipH - y),
					overflow: "hidden",
				}}
			>
				<Site images={images} w={1440 * z} />
			</div>
			<Selection
				x={x}
				y={y}
				w={1440 * z}
				h={Math.min(SITE_H * z, clipH - y + 40)}
				handles={false}
			/>
			{sel ? <Selection {...sel} /> : null}
		</>
	);
}

// ── views ─────────────────────────────────────────────────────────────────

/** f1398-f1551: the page on the canvas; c.zoomKeys {z,x,y} and a selection. */
function site(ms, c) {
	const z = kf(c.zoomKeys ?? [{ at: 0, z: 0.198, x: 658, y: 85 }], ms);
	const sel = c.selKeys ? kf(c.selKeys, ms) : null;
	return (
		<>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 36,
					width: 1580,
					height: 963,
					overflow: "hidden",
				}}
			>
				<div style={{ position: "absolute", left: 0, top: -36 }}>
					<T x={z.x} y={z.y - 18} size={11.5} colour={K.select} weight={500}>
						Linden Bakehouse - Bold
					</T>
					<div style={{ position: "absolute", left: z.x, top: z.y }}>
						<Site images={c.images} w={1440 * z.z} />
					</div>
					{sel && sel.w ? <Selection x={sel.x} y={sel.y} w={sel.w} h={sel.h} handles /> : null}
				</div>
			</div>
			<ToolRail y={46} extra />
			<PropsPanel head="Linden Bakehouse" fill="#100E0C" w={1440} h={4100} />
			<AskPill x={14} y={950} w={250} h={30} />
			<ZoomPill pct={Math.round(z.z * 100)} />
			{c.pointer ? <PointerAt c={c} ms={ms} /> : null}
		</>
	);
}

/** f1561-f1652: "design to code" — the agent CLI on the canvas beside the page. */
function code(ms, c) {
	const txt = c.text ?? "turn the selected frame into a React app with an API";
	const shown = typed(txt, ms, c.typeAt ?? -130, c.cps ?? 24.6);
	const run = ms > (c.runAt ?? 2200);
	return (
		<>
			<ToolRail y={46} extra />
			<SiteOnCanvas x={201} y={88} z={0.255} images={c.images} clipH={999} />
			<Term
				x={765}
				y={258}
				w={699}
				h={544}
				title="workspace — agent — linden-bakehouse — 107×37"
				prompt={run ? txt : shown}
				caret={!run}
				lines={
					run
						? [
								{ text: "✻ Baking… (esc to interrupt)", colour: [96, 200, 190] },
								{ text: "" },
								{ text: "? for shortcuts", alpha: 0.5 },
							]
						: [{ text: "? for shortcuts", alpha: 0.5 }]
				}
			/>
			<PropsPanel head="Linden Bakehouse" fill="#0D0D0D" w={1440} h={4100} />
			<AskPill x={14} y={950} w={250} h={30} />
			<ZoomPill pct={26} />
		</>
	);
}

/** f1662-f1717: the coded page in a browser, scrolling, beside the summary. */
function browser(ms, c) {
	const sc = kf(c.scrollKeys ?? [{ at: 0, y: 0 }], ms).y;
	const bw = 958;
	const bz = (bw - 20) / 1440;
	const summary = [
		{ text: "Frontend (React + Vite)", bold: true },
		"src/",
		"├─ app/",
		"│  ├─ styles.css   # tokens & fonts",
		"│  ├─ layout.tsx   # root layout",
		"│  └─ page.tsx     # main page",
		"└─ components/",
		"   ├─ Header.tsx   # logo, nav, order",
		"   ├─ Hero.tsx     # WARM FROM THE OVEN",
		"   ├─ Craft.tsx    # 3 cards",
		"   ├─ Menu.tsx     # selections & prices",
		"   ├─ Quote.tsx",
		"   └─ Location.tsx",
		{ text: "Backend (Node + TypeScript)", bold: true },
		"server/index.ts  # REST API",
		"  GET  /api/menu",
		"  POST /api/orders",
		{ text: "Running", bold: true },
		{ text: "- Frontend: http://localhost:5173", colour: [96, 200, 190] },
		{ text: "- API:      http://localhost:8787", colour: [96, 200, 190] },
	];
	return (
		<>
			<ToolRail y={46} extra />
			<SiteOnCanvas
				x={182}
				y={78}
				z={0.35}
				images={c.images}
				clipH={999}
				sel={{ x: 182, y: 78 + 28, w: 504, h: 280 }}
			/>
			<div
				style={{
					position: "absolute",
					left: 411,
					top: 437,
					transform: "scale(0.82)",
					transformOrigin: "0 0",
				}}
			>
				<Term
					x={0}
					y={0}
					w={438}
					h={661}
					banner={false}
					title="workspace — Site Summary — agent"
					lines={summary}
					dim
				/>
			</div>
			<PropsPanel head="Linden Bakehouse" />
			<AskPill x={14} y={956} w={250} h={30} />
			{/* the browser */}
			<Box
				x={772}
				y={25}
				w={bw}
				h={960}
				r={10}
				fill={[18, 16, 14]}
				stroke={[70, 70, 70]}
				style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
			>
				<Box x={0} y={0} w={bw} h={46} fill={[40, 40, 40]} />
				{[K.red, K.amber, K.green].map((col, i) => (
					<div
						key={col.join()}
						style={{
							position: "absolute",
							left: 16 + i * 19,
							top: 17,
							width: 12,
							height: 12,
							borderRadius: 6,
							background: rgbs(col),
						}}
					/>
				))}
				<Icon name="sidebar" x={98} y={23} size={15} colour={K.text} a={0.6} />
				<Icon name="chevron" x={156} y={23} size={12} colour={K.text} a={0.4} />
				<Box x={300} y={10} w={400} h={26} r={6} fill={[54, 54, 54]}>
					<T x={0} w={400} align="center" y={5} size={12} colour={K.text} alpha={0.85}>
						localhost
					</T>
				</Box>
				<Icon name="reload" x={682} y={23} size={12} colour={K.text} a={0.6} />
				<Icon name="share" x={882} y={22} size={14} colour={K.text} a={0.6} />
				<Icon name="plus" x={914} y={22} size={14} colour={K.text} a={0.6} />
				<div
					style={{
						position: "absolute",
						left: 10,
						top: 46,
						width: bw - 20,
						height: 914,
						overflow: "hidden",
					}}
				>
					<div style={{ position: "absolute", left: 0, top: -sc * bz }}>
						<Site images={c.images} w={bw - 20} />
					</div>
				</div>
			</Box>
			{c.pointer ? <PointerAt c={c} ms={ms} /> : null}
		</>
	);
}

// ── the design system ─────────────────────────────────────────────────────

const PURPLE = [76, 52, 120];
const ORANGE = [236, 140, 40];

function LayersPanel({ light }) {
	const ink = light ? [30, 30, 30] : K.text;
	const rows = [
		["frame", "dashboard-league"],
		["rect", "Prompt"],
		["frame", "dashboard-sales"],
		["rect", "Prompt"],
		["frame", "dashboard-utility"],
		["diamond", "Sidebar", 1],
		["frame", "Frame 1", 1],
		["diamond", "Table", 1, true],
		["rect", "Prompt"],
		["frame", "bramble: design system components"],
	];
	return (
		<Box
			x={0}
			y={36}
			w={196}
			h={963}
			fill={light ? [250, 250, 250] : K.panel}
			style={{ borderRight: `1px solid ${rgbs(light ? [222, 222, 222] : K.line)}` }}
		>
			<T x={4} y={8} size={10.5} colour={K.dim}>
				Layers
			</T>
			{rows.map(([ic, s, ind, on], i) => (
				<React.Fragment key={`${s}-${i * 2}`}>
					{on ? (
						<Box
							x={0}
							y={34 + i * 26}
							w={196}
							h={24}
							fill={light ? [228, 228, 236] : [44, 44, 50]}
						/>
					) : null}
					<Icon
						name={ic}
						x={12 + (ind ? 12 : 0)}
						y={46 + i * 26}
						size={11}
						colour={ic === "diamond" ? [150, 120, 240] : ink}
						a={0.75}
					/>
					<T
						x={26 + (ind ? 12 : 0)}
						y={39 + i * 26}
						size={11}
						colour={ic === "diamond" ? [160, 130, 250] : ink}
						alpha={0.85}
					>
						{s}
					</T>
				</React.Fragment>
			))}
		</Box>
	);
}

/** A component sheet: rows of buttons, inputs, alerts, purple slots. */
function ComponentSheet({ w = 611, h = 896, light }) {
	const card = light ? [252, 250, 255] : [16, 16, 18];
	const slot = light ? [236, 214, 240] : PURPLE;
	return (
		<Box x={0} y={0} w={w} h={h} fill={card}>
			{[0, 1, 2, 3].map((i) => (
				<Box
					key={`a${i}`}
					x={40}
					y={110 + i * 34}
					w={130}
					h={26}
					r={3}
					fill={
						[
							[40, 40, 70],
							[30, 60, 40],
							[80, 50, 20],
							[80, 24, 24],
						][i]
					}
					a={light ? 0.15 : 0.9}
				/>
			))}
			<Lines
				x={40}
				y={50}
				w={120}
				n={4}
				gap={14}
				h={3}
				colour={light ? [120, 120, 120] : [130, 130, 130]}
				a={0.6}
			/>
			{[0, 1, 2, 3].map((r) =>
				[0, 1, 2, 3].map((q) => (
					<Box
						key={`b${r}${q}`}
						x={40 + q * 34}
						y={440 + r * 18}
						w={28}
						h={10}
						r={5}
						fill={r < 2 ? ORANGE : [230, 70, 50]}
						a={q === 3 ? 1 : 0.85}
					/>
				)),
			)}
			<Box x={40} y={540} w={80} h={56} r={2} fill={slot} />
			<Box x={210} y={40} w={46} h={14} r={2} fill={slot} />
			<Box x={210} y={180} w={210} h={60} r={2} fill={slot} />
			<Box x={210} y={250} w={210} h={6} r={2} fill={slot} />
			<Box x={210} y={372} w={210} h={50} r={2} fill={slot} />
			<Box x={210} y={512} w={56} h={110} r={2} fill={slot} />
			{[0, 1, 2].map((i) => (
				<React.Fragment key={`m${i}`}>
					<T x={460} y={44 + i * 76} size={8} colour={light ? [40, 40, 40] : K.text} weight={600}>
						Modal Title
					</T>
					<Box x={460} y={60 + i * 76} w={80} h={14} r={2} fill={slot} />
					<Box x={460} y={80 + i * 76} w={36} h={10} r={5} fill={ORANGE} />
					<Box
						x={502}
						y={80 + i * 76}
						w={36}
						h={10}
						r={5}
						stroke={light ? [160, 160, 160] : [90, 90, 90]}
					/>
				</React.Fragment>
			))}
			<Lines
				x={460}
				y={300}
				w={110}
				n={14}
				gap={22}
				h={3}
				colour={light ? [140, 140, 140] : [110, 110, 110]}
				a={0.5}
				seed={4}
			/>
			<Lines
				x={210}
				y={640}
				w={160}
				n={8}
				gap={26}
				h={3}
				colour={light ? [140, 140, 140] : [110, 110, 110]}
				a={0.5}
				seed={6}
			/>
		</Box>
	);
}

/** A small dashboard with a sidebar and a component SLOT (or table rows). */
function SlotDashboard({ w, h, filled = 0, light, dashed = true }) {
	const bg = light ? [255, 255, 255] : [16, 16, 18];
	const slot = light ? [236, 214, 240] : PURPLE;
	const k = w / 300;
	return (
		<Box x={0} y={0} w={w} h={h} fill={bg}>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 300,
					height: h / k,
					transform: `scale(${k})`,
					transformOrigin: "0 0",
				}}
			>
				<div
					style={{
						position: "absolute",
						left: 10,
						top: 10,
						width: 8,
						height: 8,
						borderRadius: 4,
						background: rgbs(ORANGE),
					}}
				/>
				<T x={22} y={8} size={6} colour={ORANGE} weight={700}>
					BRAMBLE
				</T>
				<Box x={10} y={26} w={52} h={140} r={1} fill={slot} />
				<T x={10} y={174} size={4.5} colour={light ? [60, 60, 60] : K.dim}>
					Jo Doe
				</T>
				{filled > 0 ? (
					[0, 1, 2, 3, 4, 5].map((i) => (
						<Box
							key={i}
							x={70}
							y={30 + i * 11}
							w={220}
							h={i < 2 ? 7 : 8}
							r={1}
							fill={slot}
							a={Math.min(1, Math.max(0, filled * 6 - i))}
							style={i === 0 ? { display: "flex" } : null}
						/>
					))
				) : (
					<Box x={70} y={30} w={220} h={64} r={1} fill={slot} />
				)}
			</div>
			{dashed && filled <= 0 ? (
				<Selection x={70 * k} y={30 * k} w={220 * k} h={64 * k} dashed />
			) : null}
		</Box>
	);
}

/**
 * f1724-f1980: "components with slots". c.zoomKeys {z, x, y} zoom the
 * canvas (z 1 = the overview; the f1866 punch is about 3.1x onto the
 * utility dashboard); c.fillKeys {f} fills the slot with table rows.
 */
function components(ms, c, light = false) {
	const z = kf(c.zoomKeys ?? [{ at: 0, z: 1, x: 0, y: 0 }], ms);
	const fill = kf(c.fillKeys ?? [{ at: 0, f: 0 }], ms).f;
	const ink = light ? [30, 30, 30] : K.text;
	return (
		<>
			<div
				style={{
					position: "absolute",
					left: 196,
					top: 36,
					width: 1384,
					height: 963,
					overflow: "hidden",
					background: rgbs(light ? [246, 246, 246] : K.canvas),
				}}
			>
				<div
					style={{
						position: "absolute",
						left: z.x - 196,
						top: z.y - 36,
						transform: `scale(${z.z})`,
						transformOrigin: "0 0",
					}}
				>
					<T x={286} y={82} size={11} colour={ink} alpha={0.85}>
						bramble: design system components
					</T>
					<div style={{ position: "absolute", left: 286, top: 100 }}>
						<ComponentSheet light={light} />
					</div>
					{["dashboard-utility", "dashboard-sales", "dashboard-league"].map((s, i) => (
						<React.Fragment key={s}>
							<Box
								x={934}
								y={88 + i * 300}
								w={82}
								h={44}
								r={2}
								fill={light ? [235, 244, 255] : [214, 230, 250]}
							>
								<Lines
									x={6}
									y={8}
									w={66}
									n={3}
									gap={7}
									h={2}
									colour={[60, 80, 120]}
									a={0.6}
									seed={i}
								/>
							</Box>
							<T x={934} y={136 + i * 300} size={10.5} colour={ink} alpha={0.9}>
								{s}
							</T>
							<div style={{ position: "absolute", left: 934, top: 154 + i * 300 }}>
								{i === 0 ? (
									<SlotDashboard w={294} h={184} filled={fill} light={light} />
								) : (
									<Box x={0} y={0} w={294} h={150} fill={light ? [255, 255, 255] : [16, 16, 18]} />
								)}
							</div>
						</React.Fragment>
					))}
				</div>
			</div>
			<LayersPanel light={light} />
			<div style={{ position: "absolute", left: 195, top: 0 }}>
				<ToolRail y={46} extra />
			</div>
			<PropsPanel
				head="◇ Table"
				fill="--background"
				light={light}
				themeVal={light ? "Light" : "Dark"}
				swatch={light ? [255, 255, 255] : [16, 16, 18]}
				w={1024}
				h={300}
			/>
			<AskPill x={203} y={958} w={250} h={30} />
			<ZoomPill pct={Math.round(22 * z.z)} light={light} />
			{c.pointer ? <PointerAt c={c} ms={ms} /> : null}
		</>
	);
}

/** f1981-f2056: the Variables modal, then the zoom onto the Theme menu. */
function variables(ms, c, light = false) {
	const z = kf(c.zoomKeys ?? [{ at: 0, z: 1, x: 0, y: 0 }], ms);
	const cols = ["Name", "Default", "Red", "Orange", "Green", "Blue", "Violet"];
	const rows = [
		"--accent",
		"--accent-foreground",
		"--background",
		"--border",
		"--card",
		"--card-foreground",
		"--destructive",
		"--input",
		"--muted",
		"--popover",
		"--primary",
		"--ring",
		"--secondary",
		"--sidebar",
		"--success",
		"--warning",
		"--chart-1",
	];
	const sw = [
		[236, 140, 40],
		[230, 60, 60],
		[240, 150, 40],
		[60, 190, 90],
		[60, 120, 240],
		[150, 90, 240],
	];
	const menu = !light && ms > (c.menuAt ?? 1e9);
	return (
		<>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1776,
					height: 999,
					transform: `translate(${z.x}px, ${z.y}px) scale(${z.z})`,
					transformOrigin: "0 0",
				}}
			>
				{components(0, { fillKeys: [{ at: 0, f: 1 }] }, light)}
				{menu ? (
					<Box x={1600} y={36 + 840} w={160} h={70} r={6} fill={[36, 36, 36]} stroke={[60, 60, 60]}>
						<T x={14} y={10} size={11} colour={K.text}>
							Light
						</T>
						<Box x={4} y={36} w={152} h={26} r={4} fill={[54, 54, 54]} />
						<T x={14} y={41} size={11} colour={K.text}>
							Dark
						</T>
						<Icon name="check" x={140} y={49} size={11} colour={K.text} a={0.9} />
					</Box>
				) : null}
			</div>
			{c.modal !== false ? (
				<Box
					x={c.mx ?? 15}
					y={c.my ?? 36}
					w={605}
					h={760}
					r={8}
					fill={[30, 30, 30]}
					stroke={[62, 62, 62]}
					style={{ opacity: z.modal ?? 1, boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }}
				>
					<T x={12} y={10} size={11} colour={K.text} weight={600}>
						Variables
					</T>
					<T x={78} y={10} size={11} colour={K.dim}>
						Themes
					</T>
					<Icon name="x" x={588} y={18} size={11} colour={K.dim} a={0.8} />
					{cols.map((s, i) => (
						<T key={s} x={12 + (i === 0 ? 0 : 150 + (i - 1) * 74)} y={42} size={10} colour={K.dim}>
							{s}
						</T>
					))}
					{rows.map((r, j) => (
						<React.Fragment key={r}>
							<Box x={0} y={62 + j * 40} w={605} h={1} fill={K.line} />
							<T x={12} y={74 + j * 40} size={10.5} colour={K.text} alpha={0.85} font={MONO}>
								{r}
							</T>
							{sw.map((col, i) => (
								<React.Fragment key={col.join()}>
									<Box
										x={150 + i * 74}
										y={74 + j * 40}
										w={12}
										h={12}
										r={2}
										fill={j % 3 === 2 ? [250, 250, 250] : col}
										a={j % 3 === 1 ? 0.35 : 1}
									/>
									<T
										x={166 + i * 74}
										y={74 + j * 40}
										size={9}
										colour={K.text}
										alpha={0.7}
										font={MONO}
									>
										{`#${((col[0] << 16) | (col[1] << 8) | col[2]).toString(16).toUpperCase().slice(0, 6)}`}
									</T>
								</React.Fragment>
							))}
						</React.Fragment>
					))}
				</Box>
			) : null}
			{c.pointer ? <PointerAt c={c} ms={ms} /> : null}
		</>
	);
}

/** f2057-f2074: the same page with the whole UI flipped to the light theme. */
function light(ms, c) {
	return variables(ms, c, true);
}

/**
 * f2075-f2189: a mesh-gradient disc on a black frame with its control grid;
 * a hand drags handles and the colours swirl. c.dragKeys {a} 0..1 drives it.
 */
function gradient(ms, c) {
	const a = kf(c.dragKeys ?? [{ at: 0, a: 0 }], ms).a;
	const cx = c.cx ?? 782;
	const cy = c.cy ?? 491;
	const R = c.r ?? 267;
	const c0 = [
		[250, 140, 90],
		[150, 90, 240],
		[60, 200, 230],
		[240, 60, 120],
		[250, 220, 120],
		[255, 255, 255],
	];
	// measured: pastel at f2080, then the colours are shuffled (f2120+) to
	// cyan / crimson / near-black / amber with hard swirls (f2150, f2189)
	const c1 = [
		[40, 190, 210],
		[150, 10, 30],
		[10, 10, 14],
		[230, 20, 110],
		[240, 190, 90],
		[250, 250, 250],
	];
	const mixK = Math.max(0, Math.min(1, (a - 0.35) / 0.25));
	const cols = c0.map((col, i) => col.map((v, j) => v + (c1[i][j] - v) * mixK));
	const blob = (i, ph) => {
		const ang = ph + a * (2.4 + i * 0.9) + i * 1.3;
		const rr = R * (0.35 + 0.25 * Math.sin(a * 3 + i));
		return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr];
	};
	const grads = cols
		.map((col, i) => {
			const [x, y] = blob(i, 0.4);
			return `radial-gradient(circle at ${x - (cx - R)}px ${y - (cy - R)}px, ${rgbs(col, 0.95)} 0px, ${rgbs(col, 0)} ${R * (0.9 - i * 0.07)}px)`;
		})
		.join(", ");
	const hp = [];
	for (let i = 0; i < 5; i++)
		for (let j = 0; j < 5; j++) hp.push([cx - R + (i * 2 * R) / 4, cy - R + (j * 2 * R) / 4]);
	const hand = kf(c.pointer ?? [{ at: 0, x: cx + 10, y: cy - 60 }], ms);
	return (
		<>
			<ToolRail y={46} extra={false} />
			<T x={119} y={60} size={10} colour={K.text} alpha={0.75}>
				Mesh Gradient
			</T>
			<Box x={119} y={80} w={1333} h={797} fill={[10, 10, 10]} />
			<div
				style={{
					position: "absolute",
					left: cx - R,
					top: cy - R,
					width: 2 * R,
					height: 2 * R,
					borderRadius: R,
					overflow: "hidden",
					background: `${grads}, ${rgbs([240 - 150 * mixK, 120 - 100 * mixK, 150 - 110 * mixK])}`,
				}}
			/>
			{hp.map(([x, y], i) => (
				<div
					key={`${x}-${y}`}
					style={{
						position: "absolute",
						left: x - 4,
						top: y - 4,
						width: 8,
						height: 8,
						borderRadius: 4,
						border: `1.5px solid ${rgbs(i % 6 === 0 ? [250, 160, 80] : i % 4 === 1 ? [150, 110, 250] : [255, 255, 255])}`,
						opacity: 0.9,
					}}
				/>
			))}
			<Box x={1341} y={253} w={218} h={525} r={8} fill={[28, 28, 28]} stroke={[60, 60, 60]}>
				<T x={12} y={10} size={10} colour={K.text}>
					Mesh
				</T>
				{[0, 1, 2, 3].map((r) =>
					[0, 1, 2, 3].map((q) => (
						<Box
							key={`${r}${q}`}
							x={12 + q * 18}
							y={110 + r * 18}
							w={15}
							h={15}
							r={2}
							fill={cols[(r * 4 + q + Math.floor(a * 6)) % cols.length]}
						/>
					)),
				)}
				<Lines x={12} y={200} w={140} n={5} gap={22} h={4} colour={[140, 140, 140]} a={0.6} />
			</Box>
			<PropsPanel head="Ellipse" fill="#F07896" swatch={[240, 120, 150]} w={600} h={600} />
			<ZoomPill pct={120} />
			<div style={{ position: "absolute", left: 0, top: 0 }}>
				<PointerAt c={{ pointer: [{ at: 0, x: hand.x, y: hand.y, hand: true }] }} ms={0} />
			</div>
		</>
	);
}

export const S3_VIEWS = { site, code, browser, components, variables, light, gradient };
