/**
 * rowan s2 — the designs the agent produces (14.6 -> 46.6s in the reference),
 * and the artboard every editor beat shows.
 *
 * Measured:
 *   - The artboard sits at native (322, 100), 1200 x 750 (a 1440 x 900 frame
 *     at the canvas's 83%), in EVERY single-design beat f119..f1037: at f440
 *     (s 1.018) it spans ref x 330..1548, at f893 (s 1.107) x 279..1608; both
 *     map back to native x 322. A blue "Generating: …" label sits 12 px above.
 *   - Six finished designs cut in on single frames over one continuous camera
 *     push: f438 orange-accent, f525 yellow-header, f624 serif, f733 the
 *     green one the build beat was making, f891 navy/cyan, f942 lower-case
 *     mono. Each is a sidebar (200 px), a header, four stat tiles, a hero
 *     picture and a side list — the same skeleton re-skinned, which is the
 *     story: many parallel takes on one prompt.
 *   - f1038-f1045 dip to black, then a 2x2 board of four designs (640 x 400
 *     each at native x 209/893, y 73/520), and at f1144 a 3x3 board (405 x
 *     266 at x 184/659/1150, y 76/380/690) mixing dark and light takes.
 *   - f1245 a row of long phone screens (habit tracker variants), and at
 *     f1304 the canvas zooms in (0.13 s whip, the frame flashes to luminance
 *     110 on the white screen) onto three of them, where a row is dragged
 *     and a label edited by hand.
 *
 * None of the reference's designs are copied: the subject here is a wind-
 * farm control room ("Windrow"), drawn from primitives; its pictures are
 * image slots with a drawn turbine stand-in.
 */
import React from "react";
import {
	AgentPanel,
	AskPill,
	Box,
	CONDENSED,
	Icon,
	K,
	kf,
	Lines,
	MONO,
	Picture,
	Pointer,
	PropsPanel,
	rgbs,
	SERIF,
	Selection,
	T,
	ToolRail,
	UI,
	ZoomPill,
} from "./rowan-shared.jsx";

// ── the design system the agent draws in ──────────────────────────────────

/**
 * Six dark takes and two light ones. `title` / `brand` are copy (role
 * product-voice: the product's output, retarget with the prompt).
 */
export const THEMES = {
	green: {
		bg: [9, 10, 9],
		side: [13, 15, 13],
		panel: [17, 19, 17],
		line: [34, 40, 34],
		ink: [236, 240, 236],
		dim: [120, 130, 120],
		accent: [52, 211, 110],
		accentInk: [6, 30, 12],
		head: UI,
		label: MONO,
		brand: "WINDROW",
		title: "TURBINE CONTROL",
		upper: true,
	},
	orange: {
		bg: [14, 14, 16],
		side: [20, 20, 22],
		panel: [24, 24, 27],
		line: [44, 44, 48],
		ink: [240, 240, 240],
		dim: [130, 130, 136],
		accent: [238, 104, 60],
		accentInk: [40, 10, 0],
		head: UI,
		label: UI,
		brand: "MERIDIAN",
		title: "TURBINE CONTROL",
		upper: true,
		heroTile: true,
	},
	yellow: {
		bg: [12, 12, 12],
		side: [18, 18, 18],
		panel: [22, 22, 22],
		line: [42, 42, 42],
		ink: [240, 240, 240],
		dim: [130, 130, 130],
		accent: [246, 214, 40],
		accentInk: [20, 18, 0],
		head: UI,
		label: MONO,
		brand: "WINDROW",
		title: "TURBINE CONTROL",
		upper: true,
		brandBlock: true,
	},
	serif: {
		bg: [16, 16, 18],
		side: [22, 22, 24],
		panel: [26, 26, 29],
		line: [46, 46, 50],
		ink: [238, 236, 232],
		dim: [140, 136, 132],
		accent: [240, 96, 44],
		accentInk: [255, 255, 255],
		head: SERIF,
		label: UI,
		brand: "M E R I D I A N ·",
		title: "Turbine Control",
		upper: false,
		big: true,
	},
	navy: {
		bg: [12, 20, 52],
		bg2: [26, 44, 116],
		side: [14, 24, 60],
		panel: [18, 30, 74],
		line: [40, 60, 130],
		ink: [226, 236, 255],
		dim: [120, 140, 190],
		accent: [52, 210, 240],
		accentInk: [4, 20, 40],
		head: MONO,
		label: MONO,
		brand: "NIMBUS",
		title: "TURBINE_CONTROL",
		upper: true,
	},
	mono: {
		bg: [20, 22, 30],
		side: [24, 26, 36],
		panel: [30, 33, 44],
		line: [52, 56, 76],
		ink: [222, 226, 240],
		dim: [128, 134, 160],
		accent: [74, 214, 120],
		accentInk: [6, 30, 12],
		head: MONO,
		label: MONO,
		brand: "windrow_",
		title: "turbine_control",
		upper: false,
	},
	paper: {
		bg: [250, 250, 250],
		side: [255, 255, 255],
		panel: [242, 242, 244],
		line: [222, 222, 226],
		ink: [16, 16, 18],
		dim: [120, 120, 126],
		accent: [228, 40, 52],
		accentInk: [255, 255, 255],
		head: UI,
		label: UI,
		brand: "Windrow",
		title: "Turbine Control",
		upper: false,
		light: true,
	},
	ink: {
		bg: [255, 255, 255],
		side: [255, 255, 255],
		panel: [16, 16, 16],
		line: [220, 220, 220],
		ink: [12, 12, 12],
		dim: [110, 110, 110],
		accent: [12, 12, 12],
		accentInk: [255, 255, 255],
		head: CONDENSED,
		label: UI,
		brand: "WINDROW",
		title: "TURBINE CONTROL",
		upper: true,
		light: true,
	},
};

/** Copy shared by every take (role product-voice; swap with the prompt). */
export const COPY = {
	nav: ["Turbine Control", "Telemetry", "Forecast", "Grid Sync", "Maintenance"],
	status: [
		["UPTIME", "99.97%"],
		["PITCH", "NOMINAL"],
		["YAW", "98.2%"],
		["TEMP", "41°C"],
	],
	stats: [
		["OUTPUT", "42.8 MW"],
		["AVAILABILITY", "98.4%"],
		["ONLINE", "12 / 12"],
		["WIND", "NW 14 KT"],
	],
	list: ["Blade inspection", "Pitch calibration", "Yaw alignment", "Grid handshake", "Load ramp"],
	card: ["READY", "GRID ARMED", "All turbines nominal.", "Sync window opens in", "T-00:04:27"],
	button: "START SYNC",
	crumbs: ["SITES", "NORTH-RIDGE", "CONTROL"],
	sub: "Site: North Ridge · 12 turbines · Grid: 132 kV · Window 14:32 UTC",
	user: ["Control Room", "Shift lead"],
};

/** Build order of the parts (the build beat reveals them in this order). */
export const PARTS = [
	"side",
	"brand",
	"nav",
	"status",
	"card",
	"user",
	"crumbs",
	"title",
	"actions",
	"stats",
	"hero",
	"list",
];

/**
 * <Dashboard> — one take of the design, 1200 x 750 artboard px. `build`
 * (0..PARTS.length, fractional = the next part fading in) reveals parts in
 * order; omitted = complete. `hl` highlights a list row (the green take's
 * checklist ticks over). `pic` is the image slot for the hero picture.
 */
export function Dashboard({
	theme = "green",
	build = 99,
	w = 1200,
	h = 750,
	hl = 1,
	pic,
	seed = 1,
}) {
	const th = typeof theme === "string" ? THEMES[theme] : theme;
	const show = (part) => {
		const i = PARTS.indexOf(part);
		return Math.max(0, Math.min(1, build - i));
	};
	const up = (s) => (th.upper ? s.toUpperCase() : s);
	const A = th.accent;
	const sx = w / 1200;
	const sy = h / 750;
	const op = (p) => ({ opacity: p });
	// item i of a group of n arrives at its own slice of the group's window
	const stag = (part, i, n) => Math.max(0, Math.min(1, show(part) * n - i));
	return (
		<div
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: 1200,
				height: 750,
				transform: `scale(${sx}, ${sy})`,
				transformOrigin: "0 0",
				background: th.bg2
					? `linear-gradient(180deg, ${rgbs(th.bg)} 0%, ${rgbs(th.bg2)} 100%)`
					: rgbs(th.bg),
				overflow: "hidden",
			}}
		>
			{/* sidebar */}
			<div style={op(show("side"))}>
				<Box x={0} y={0} w={200} h={750} fill={th.side} />
				<Box x={200} y={0} w={1} h={750} fill={th.line} />
			</div>
			<div style={op(show("brand"))}>
				{th.brandBlock ? <Box x={0} y={0} w={200} h={62} fill={A} /> : null}
				<Box
					x={18}
					y={18}
					w={26}
					h={26}
					r={th.light ? 13 : 4}
					fill={th.brandBlock ? th.accentInk : A}
				>
					<Icon
						name="spark"
						x={13}
						y={13}
						size={14}
						colour={th.brandBlock ? A : th.accentInk}
						a={1}
						sw={2.2}
					/>
				</Box>
				<T
					x={54}
					y={21}
					size={15}
					weight={700}
					font={th.label === MONO ? MONO : UI}
					colour={th.brandBlock ? th.accentInk : th.ink}
					tracking={1}
				>
					{th.brand}
				</T>
			</div>
			<div style={op(Math.min(1, show("nav") * 4))}>
				<T x={18} y={80} size={9.5} font={MONO} colour={A} alpha={0.85} tracking={1}>
					{"// "}
					{up("Mission control").replace("MISSION CONTROL", "OPERATIONS")}
				</T>
				{COPY.nav.map((s, i) => (
					<div key={s} style={op(stag("nav", i, 5))}>
						{i === 0 ? <Box x={6} y={98 + i * 35} w={188} h={30} r={4} fill={A} a={0.14} /> : null}
						{i === 0 ? <Box x={6} y={98} w={2} h={30} fill={A} /> : null}
						<Icon
							name={i === 0 ? "circle" : "frame"}
							x={28}
							y={113 + i * 35}
							size={11}
							colour={i === 0 ? A : th.dim}
							a={0.9}
						/>
						<T
							x={42}
							y={105 + i * 35}
							size={11.5}
							font={th.label}
							colour={i === 0 ? th.ink : th.dim}
						>
							{s}
						</T>
					</div>
				))}
			</div>
			<div style={op(show("status"))}>
				<Box x={0} y={290} w={200} h={1} fill={th.line} />
				<T x={18} y={304} size={9.5} font={MONO} colour={A} alpha={0.85} tracking={1}>
					{"// SYSTEM STATUS"}
				</T>
				{COPY.status.map(([k, v], i) => (
					<React.Fragment key={k}>
						<T x={18} y={326 + i * 18} size={9} font={MONO} colour={th.dim}>
							{k}
						</T>
						<T
							x={120}
							w={64}
							align="right"
							y={326 + i * 18}
							size={9}
							font={MONO}
							colour={i === 3 ? [240, 110, 80] : i === 1 ? A : th.ink}
						>
							{v}
						</T>
					</React.Fragment>
				))}
			</div>
			<div style={op(show("card"))}>
				<Box x={14} y={548} w={172} h={140} r={4} stroke={A} sw={1} fill={A} a={0.05} />
				<Box x={24} y={560} w={40} h={16} r={2} fill={A} a={0.2} />
				<T x={29} y={562} size={8.5} font={MONO} colour={A} weight={700}>
					{COPY.card[0]}
				</T>
				<T x={72} y={562} size={9.5} font={MONO} colour={th.ink} weight={700}>
					{COPY.card[1]}
				</T>
				<T x={24} y={588} size={9} font={MONO} colour={th.dim}>
					{COPY.card[2]}
				</T>
				<T x={24} y={601} size={9} font={MONO} colour={th.dim}>
					{COPY.card[3]}
				</T>
				<T x={24} y={614} size={9} font={MONO} colour={th.dim}>
					{COPY.card[4]}
				</T>
				<Box x={24} y={644} w={152} h={28} r={3} fill={A}>
					<T
						x={0}
						w={152}
						align="center"
						y={8}
						size={9.5}
						font={MONO}
						weight={700}
						colour={th.accentInk}
					>
						{`▷ ${COPY.button}`}
					</T>
				</Box>
			</div>
			<div style={op(show("user"))}>
				<Box x={0} y={700} w={200} h={1} fill={th.line} />
				<Box x={16} y={712} w={26} h={26} r={3} fill={th.panel} stroke={th.line} />
				<T x={22} y={720} size={8} font={MONO} colour={th.dim}>
					CR
				</T>
				<T x={50} y={712} size={11} font={th.label} colour={th.ink} weight={600}>
					{COPY.user[0]}
				</T>
				<T x={50} y={727} size={9} font={th.label} colour={th.dim}>
					{COPY.user[1]}
				</T>
			</div>
			{/* main column */}
			<div style={op(show("crumbs"))}>
				{COPY.crumbs.map((s, i) => (
					<Box
						key={s}
						x={232 + i * 80}
						y={26}
						w={i === 1 ? 92 : 64}
						h={16}
						r={2}
						stroke={i === 2 ? A : th.line}
						style={{ left: 232 + [0, 72, 172][i] }}
					>
						<T
							x={0}
							w={i === 1 ? 92 : 64}
							align="center"
							y={2}
							size={8.5}
							font={MONO}
							colour={i === 2 ? th.ink : th.dim}
						>
							{s}
						</T>
					</Box>
				))}
				<Icon name="bell" x={1130} y={34} size={13} colour={th.dim} a={0.8} />
				<Box x={1150} y={22} w={26} h={26} r={3} stroke={th.line} />
			</div>
			<div style={op(show("title"))}>
				<T
					x={232}
					y={th.big ? 66 : 74}
					size={th.big ? 30 : 24}
					weight={th.head === SERIF ? 400 : 700}
					font={th.head}
					colour={th.ink}
					tracking={th.head === MONO ? 0 : 0.5}
				>
					{th.title}
				</T>
				<T x={232} y={110} size={9.5} font={th.label} colour={th.dim}>
					{COPY.sub}
				</T>
			</div>
			<div style={op(show("actions"))}>
				<Box x={980} y={78} w={72} h={24} r={3} stroke={th.line}>
					<T x={0} w={72} align="center" y={6} size={9} font={MONO} colour={th.dim}>
						EXPORT
					</T>
				</Box>
				<Box x={1062} y={78} w={112} h={24} r={3} fill={A}>
					<T
						x={0}
						w={112}
						align="center"
						y={6}
						size={9}
						font={MONO}
						weight={700}
						colour={th.accentInk}
					>
						◆ ALL SYSTEMS
					</T>
				</Box>
			</div>
			<div>
				{COPY.stats.map(([k, v], i) => {
					const hot = th.heroTile && i === 0;
					return (
						<Box
							key={k}
							x={232 + i * 238}
							y={140}
							w={226}
							h={104}
							r={3}
							fill={hot ? A : th.panel}
							stroke={hot ? null : th.line}
							style={op(stag("stats", i, 4))}
						>
							<T
								x={14}
								y={14}
								size={9}
								font={MONO}
								colour={hot ? th.accentInk : th.dim}
								tracking={1}
							>
								{k}
							</T>
							<T
								x={14}
								y={38}
								size={30}
								weight={700}
								font={th.head === SERIF ? UI : th.head}
								colour={hot ? th.accentInk : i === 3 ? A : th.ink}
							>
								{v}
							</T>
							<T x={14} y={82} size={8.5} font={MONO} colour={hot ? th.accentInk : A} alpha={0.85}>
								{["▲ +4.1% vs plan", "● nominal", "● all on", "● gusting 19"][i]}
							</T>
						</Box>
					);
				})}
			</div>
			<div style={op(show("hero"))}>
				<Box x={232} y={262} w={632} h={466} r={3} fill={th.panel} stroke={th.line}>
					<T x={16} y={14} size={9.5} font={MONO} colour={th.ink} weight={700} tracking={1}>
						{up("Turbine status")}
					</T>
					<T x={560} y={14} size={8.5} font={MONO} colour={A}>
						LIVE FEED
					</T>
					<div style={{ position: "absolute", left: 16, top: 42 }}>
						<Picture w={600} h={408} kind="turbine" accent={A} src={pic} seed={seed} />
					</div>
				</Box>
			</div>
			<div style={op(show("list"))}>
				<Box x={878} y={262} w={296} h={466} r={3} fill={th.panel} stroke={th.line}>
					<T x={16} y={14} size={9.5} font={MONO} colour={th.ink} weight={700} tracking={1}>
						{up("Startup sequence")}
					</T>
					<T x={226} y={14} size={8.5} font={MONO} colour={A}>
						VIEW ALL
					</T>
					{COPY.list.map((s, i) => {
						const done = i < hl;
						const cur = i === hl;
						return (
							<Box
								key={s}
								x={12}
								y={44 + i * 52}
								w={272}
								h={44}
								r={3}
								fill={cur ? A : th.bg}
								a={cur ? 0.12 : 1}
								stroke={cur ? A : th.line}
								style={op(stag("list", i, 5))}
							>
								<Box
									x={10}
									y={10}
									w={24}
									h={24}
									r={3}
									fill={done || cur ? A : th.panel}
									a={done ? 1 : 0.5}
								>
									{done ? (
										<Icon
											name="check"
											x={12}
											y={12}
											size={14}
											colour={th.accentInk}
											a={1}
											sw={2.6}
										/>
									) : null}
								</Box>
								<T x={44} y={9} size={11} font={th.label} colour={th.ink} weight={600}>
									{s}
								</T>
								<T x={44} y={25} size={8.5} font={MONO} colour={th.dim}>
									{done ? "Complete · 14:02" : cur ? "In progress" : "Queued"}
								</T>
								<T x={226} y={15} size={8} font={MONO} colour={done ? A : th.dim} weight={700}>
									{done ? "DONE" : cur ? "NEXT" : "—"}
								</T>
							</Box>
						);
					})}
				</Box>
			</div>
		</div>
	);
}

// ── the editor around a design ────────────────────────────────────────────

/** The agent conversation the build and variant beats show (product-voice). */
export const TALK = [
	{ kind: "user", text: "design a control room for a wind farm with moody night photos" },
	{ kind: "text", text: "I'll design a control room for the wind farm. First the style guide." },
	{ kind: "step", text: "Checking guidelines" },
	{ kind: "text", text: "Now the specific style guide for this industrial, night-shift look." },
	{ kind: "step", text: "Picked a style guide" },
	{
		kind: "text",
		text: "Got it. Building the control room with a terminal-inspired layout, accent on status.",
	},
	{ kind: "step", text: "Design" },
	{ kind: "step", text: "Design" },
	{ kind: "step", text: "Design" },
	{ kind: "step", text: "Design" },
	{ kind: "step", text: "Design" },
	{ kind: "step", text: "Design" },
	{ kind: "step", text: "Design" },
	{ kind: "step", text: "Designing…", done: false },
];

export const TODO = [
	"Sidebar navigation with site sections",
	"System status panel with telemetry",
	"Header with sync controls",
	"Turbine metrics cards row",
	"Turbine picture with night photo",
	"Startup sequence panel",
	"Sync window countdown",
];

/**
 * Editor with one design on the canvas: tool rail, the agent panel along the
 * left, the props panel, the artboard at (322, 100) with its "Generating"
 * label and selection, and the zoom pill.
 */
export function EditorWithDesign({
	ms,
	c,
	theme,
	build,
	hl,
	pic,
	items,
	n,
	todoDone,
	label,
	panelY = 252,
}) {
	const ab = c.artboard ?? { x: 322, y: 100, w: 1200, h: 750 };
	const talk = items ?? TALK;
	return (
		<>
			<ToolRail y={46} extra={false} />
			<AgentPanel
				x={4}
				y={panelY}
				w={300}
				h={994 - panelY}
				items={[
					...talk.slice(0, n ?? talk.length),
					{ kind: "todo", text: "Rowan it out", list: TODO, doneCount: todoDone ?? 2 },
				]}
				spin
			/>
			<div style={{ position: "absolute", left: ab.x, top: ab.y, width: ab.w, height: ab.h }}>
				<Dashboard
					theme={theme}
					build={build}
					w={ab.w}
					h={ab.h}
					hl={hl}
					pic={pic}
					seed={c.seed ?? 1}
				/>
			</div>
			<Selection
				x={ab.x}
				y={ab.y}
				w={ab.w}
				h={ab.h}
				label={label ?? "✦ Generating: Turbine Control Room"}
			/>
			{c.props === false ? null : (
				<PropsPanel head="Turbine Control Ro" swatch={THEMES[theme]?.bg} fill="#0A0B0A" />
			)}
			<ZoomPill pct={90} x={1472} y={964} />
			{c.pointer ? <PointerAt c={c} ms={ms} /> : null}
		</>
	);
}

/** A pointer keyed in native px: c.pointer = [{at, x, y, hand?}]. */
export function PointerAt({ c, ms }) {
	const p = kf(c.pointer, ms);
	if (p.hide) return null;
	return <Pointer x={p.x} y={p.y} hand={p.hand} />;
}

// ── views ─────────────────────────────────────────────────────────────────

/** One finished take: c.theme, c.hl keys [{at, hl}], c.build keys. */
function variant(ms, c) {
	const hl = c.hlKeys ? kf(c.hlKeys, ms).hl : (c.hl ?? 1);
	const build = c.buildKeys ? kf(c.buildKeys, ms).build : 99;
	return (
		<EditorWithDesign
			ms={ms}
			c={c}
			theme={c.theme ?? "green"}
			build={build}
			hl={Math.floor(hl)}
			pic={c.images?.hero}
			todoDone={c.todoDone ?? 5}
		/>
	);
}

/** A board of takes: c.cells = [{x, y, w, h, theme, label}] in native px. */
function board(ms, c) {
	const sel = c.selKeys ? kf(c.selKeys, ms).sel : -1;
	return (
		<>
			<ToolRail y={46} extra />
			{(c.cells ?? []).map((cell, i) => (
				<React.Fragment key={`${cell.x}-${cell.y}`}>
					<T x={cell.x} y={cell.y - 15} size={c.labelSize ?? 9.5} colour={K.select} weight={500}>
						{cell.label ?? "✦ Generating: Turbine Control Room"}
					</T>
					<div
						style={{
							position: "absolute",
							left: cell.x,
							top: cell.y,
							width: cell.w,
							height: cell.h,
							overflow: "hidden",
						}}
					>
						<Dashboard
							theme={cell.theme}
							w={cell.w}
							h={cell.h}
							hl={cell.hl ?? 2}
							pic={c.images?.[`cell-${i + 1}`]}
							seed={i + 2}
						/>
					</div>
					{Math.round(sel) === i ? (
						<Selection x={cell.x} y={cell.y} w={cell.w} h={cell.h} handles />
					) : null}
				</React.Fragment>
			))}
			<PropsPanel head="Turbine Control Ro" />
			<AskPill x={14} y={950} w={250} h={30} />
			<ZoomPill pct={c.pct ?? 38} />
			{c.pointer ? <PointerAt c={c} ms={ms} /> : null}
		</>
	);
}

// ── habit-tracker phone screens (the mobile board) ────────────────────────

const PHONE_THEMES = [
	{ bg: [12, 12, 12], ink: [240, 240, 240], acc: [214, 250, 80], card: [28, 28, 28] },
	{ bg: [255, 255, 255], ink: [14, 14, 14], acc: [20, 20, 20], card: [242, 242, 242] },
	{ bg: [24, 24, 26], ink: [230, 230, 230], acc: [240, 200, 70], card: [36, 36, 40] },
	{ bg: [20, 20, 20], ink: [236, 236, 236], acc: [80, 220, 120], card: [32, 32, 32] },
	{ bg: [250, 250, 250], ink: [16, 16, 16], acc: [52, 110, 240], card: [238, 238, 240] },
	{ bg: [255, 255, 255], ink: [12, 12, 12], acc: [12, 12, 12], card: [240, 240, 240] },
	{ bg: [16, 16, 18], ink: [236, 236, 236], acc: [250, 250, 250], card: [30, 30, 34] },
	{ bg: [12, 26, 48], ink: [220, 236, 255], acc: [40, 210, 230], card: [20, 40, 70] },
	{ bg: [255, 255, 255], ink: [12, 12, 12], acc: [226, 40, 50], card: [244, 244, 244] },
	{ bg: [20, 20, 20], ink: [236, 236, 236], acc: [250, 90, 60], card: [34, 34, 34] },
];

export const HABITS = [
	"Morning walk",
	"Drink 8 glasses of water",
	"30 min workout",
	"Read 20 pages",
	"Stretch",
];

/** A long mobile screen (390 px wide design, drawn at width w). */
export function Phone({
	w = 160,
	h = 760,
	th = PHONE_THEMES[0],
	seed = 0,
	order = [0, 1, 2, 3],
	edit,
}) {
	const k = w / 390;
	return (
		<div
			style={{
				position: "relative",
				width: w,
				height: h,
				overflow: "hidden",
				background: rgbs(th.bg),
			}}
		>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 390,
					height: h / k,
					transform: `scale(${k})`,
					transformOrigin: "0 0",
				}}
			>
				<T x={24} y={40} size={14} colour={th.ink} alpha={0.6}>
					{["Good morning,", "Hello, Sam", "Today", "Habits"][seed % 4]}
				</T>
				<T x={24} y={62} size={40} weight={800} colour={th.ink}>
					{["Habits", "47", "5/8", "Daily"][seed % 4]}
				</T>
				<T x={300} y={78} size={22} colour={th.ink} alpha={0.7}>
					5/8
				</T>
				{order.map((hi, i) => (
					<Box
						key={HABITS[hi]}
						x={20}
						y={140 + i * 78}
						w={350}
						h={66}
						r={12}
						fill={th.card}
						stroke={i === 0 && seed % 3 === 0 ? th.acc : null}
					>
						<Box x={14} y={20} w={26} h={26} r={13} fill={th.acc} a={hi < 2 ? 1 : 0.25} />
						<T
							x={54}
							y={14}
							size={17}
							weight={600}
							colour={th.ink}
							style={edit === hi ? { textDecoration: "underline" } : null}
						>
							{HABITS[hi]}
						</T>
						<T x={54} y={38} size={12} colour={th.ink} alpha={0.5}>
							{hi < 2 ? "Done · 06:45" : "In progress · 18:32"}
						</T>
					</Box>
				))}
				<T x={24} y={470} size={14} colour={th.ink} alpha={0.6}>
					Week
				</T>
				<T x={300} y={470} size={20} weight={700} colour={th.ink}>
					86%
				</T>
				{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
					<React.Fragment key={`${d}-${i * 7}`}>
						<Box x={22 + i * 50} y={510} w={40} h={52} r={10} fill={i === 5 ? th.acc : th.card} />
						<T
							x={22 + i * 50}
							w={40}
							align="center"
							y={526}
							size={17}
							weight={700}
							colour={i === 5 ? th.bg : th.ink}
						>
							{d}
						</T>
					</React.Fragment>
				))}
				{[0, 1, 2, 3, 4].map((i) => (
					<Box
						key={i}
						x={24}
						y={600 + i * 34}
						w={342 * (0.5 + 0.1 * ((i * 7 + seed) % 5))}
						h={12}
						r={6}
						fill={th.acc}
						a={0.85}
					/>
				))}
				<Box x={20} y={790} w={350} h={160} r={16} fill={th.card} />
				<Lines x={40} y={820} w={300} n={4} gap={22} h={8} colour={th.ink} a={0.25} seed={seed} />
				<Box x={20} y={980} w={170} h={110} r={16} fill={th.acc} a={0.9} />
				<Box x={200} y={980} w={170} h={110} r={16} fill={th.card} />
				<Box x={20} y={1110} w={350} h={220} r={16} fill={th.card} />
				<Lines
					x={40}
					y={1140}
					w={300}
					n={6}
					gap={26}
					h={8}
					colour={th.ink}
					a={0.2}
					seed={seed + 3}
				/>
			</div>
		</div>
	);
}

/** The row of phone screens (native x0 + i*pitch). */
function phones(ms, c) {
	const sel = c.selKeys ? Math.round(kf(c.selKeys, ms).sel) : -1;
	const n = c.count ?? 10;
	const x0 = c.x0 ?? 70;
	const pitch = c.pitch ?? 158;
	const w = c.w ?? 128;
	const y = c.y ?? 88;
	const h = c.h ?? 740;
	return (
		<>
			<ToolRail y={46} extra />
			{Array.from({ length: n }, (_, i) => (
				<React.Fragment key={`p${i * 3}`}>
					<T x={x0 + i * pitch} y={y - 14} size={7.5} colour={K.dim} alpha={0.8}>
						{`Habit Tracker - ${["Bold", "Calm", "Mono", "Fresh", "Bright", "Ink", "Night", "Ocean", "Signal", "Ember"][i % 10]}`}
					</T>
					<div style={{ position: "absolute", left: x0 + i * pitch, top: y }}>
						<Phone w={w} h={h} th={PHONE_THEMES[i % PHONE_THEMES.length]} seed={i} />
					</div>
					{sel === i ? <Selection x={x0 + i * pitch} y={y} w={w} h={h} /> : null}
				</React.Fragment>
			))}
			<PropsPanel head="Habit Tracker - Oc" />
			<AskPill x={14} y={950} w={250} h={30} />
			<ZoomPill pct={18} />
			{c.pointer ? <PointerAt c={c} ms={ms} /> : null}
		</>
	);
}

/**
 * The canvas zoomed onto three screens (f1304+): a white one cropped at the
 * left, the dark ocean one selected in the middle, a white/red one cropped
 * at the right. `c.zoomKeys` whip the canvas in from the phone row
 * (0.13 s); `c.dragKeys` move one habit row (the drag), `c.editAt` starts the
 * label edit.
 */
function phoneClose(ms, c) {
	const z = c.zoomKeys ? kf(c.zoomKeys, ms) : { z: 1 };
	const drag = c.dragKeys ? kf(c.dragKeys, ms) : { d: 0 };
	const order = drag.d > 0.5 ? [1, 2, 3, 0] : [0, 1, 2, 3];
	const sw = 600;
	const sh = 1600;
	const k = z.z ?? 1;
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
				<div
					style={{
						position: "absolute",
						left: z.x ?? 0,
						top: z.y ?? 0,
						transform: `scale(${k})`,
						transformOrigin: "0 0",
					}}
				>
					<div style={{ position: "absolute", left: -260, top: -20 }}>
						<Phone w={sw} h={sh} th={PHONE_THEMES[1]} seed={2} />
					</div>
					<div style={{ position: "absolute", left: 600, top: -20 }}>
						<Phone
							w={sw}
							h={sh}
							th={PHONE_THEMES[7]}
							seed={3}
							order={order}
							edit={ms > (c.editAt ?? 1e9) ? 3 : undefined}
						/>
					</div>
					<Selection x={600} y={-20} w={sw} h={sh} handles={false} />
					<div style={{ position: "absolute", left: 1460, top: -20 }}>
						<Phone w={sw} h={sh} th={PHONE_THEMES[8]} seed={1} />
					</div>
				</div>
			</div>
			<ToolRail y={46} extra />
			<PropsPanel head="Habit Tracker - Oc" />
			<AskPill x={14} y={950} w={250} h={30} />
			<ZoomPill pct={c.pct ?? 110} />
			{c.pointer ? <PointerAt c={c} ms={ms} /> : null}
		</>
	);
}

export const S2_VIEWS = { variant, board, phones, "phone-close": phoneClose };
