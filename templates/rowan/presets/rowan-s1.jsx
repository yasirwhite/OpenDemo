/**
 * rowan s1 — the opening and the build (0 -> 14.6s in the reference), and
 * `rowan-shot`, the one preset every window beat of the film renders with.
 *
 * Measured:
 *   - f0-f29  the agent CLI open in a terminal window ON the canvas (native
 *             457,182 853x560), a prompt typing at ~21 chars/s from f5;
 *             the camera pushes fast and centred: window height 946 -> 1034
 *             (3.04 px/frame, linear).
 *   - f30-f74 hard cut to a close-up of the window's top-left corner: the
 *             collapsed agent pill (native 43,43 258x35) typing the prompt
 *             at ~28 chars/s, the text scrolling left once it fills the pill.
 *             Camera 1.83x -> 2.04x, window corner (133,135) -> (147,150).
 *   - f75     hard cut to the home framing (s 0.947, centred) and the start
 *             of take A, a linear push of 0.1954 px/frame on window height
 *             that runs under every beat to f1037. The prompt is now a chat
 *             card (native 41,41 298x334): the sent bubble and "Thinking…".
 *   - ~f100   the card docks along the left (native 4,252 300x742) and
 *             starts streaming.
 *   - f119    the artboard appears (native 322,100 1200x750, blue selection,
 *             "Generating: …" label) and builds part by part — sidebar,
 *             brand f180, nav, status, card, user, crumbs f360, title,
 *             actions — while the agent's steps tick over.
 */
import React from "react";
import { videoRef } from "../../../src/lib/textcards/src/video-sources.js";
import { EditorWithDesign, S2_VIEWS, TALK } from "./rowan-s2.jsx";
import { S3_VIEWS } from "./rowan-s3.jsx";
import {
	AgentPanel,
	AskPill,
	Backdrop,
	blinkOn,
	camAt,
	kf,
	localMs,
	PropsPanel,
	RefBox,
	T,
	Term,
	ToolRail,
	typed,
	Window,
	World,
	ZoomPill,
} from "./rowan-shared.jsx";

/** The prompt the film is about (role user-voice). */
export const PROMPT = "design a control room for a wind farm with moody night photos";

/** f0-f29: the CLI in a terminal on the canvas. */
function cli(ms, c) {
	const text = c.text ?? "Design a control room for a wind farm";
	const shown = typed(text, ms, c.typeAt ?? 167, c.cps ?? 21);
	return (
		<>
			<ToolRail y={46} extra />
			<AskPill x={43} y={43} w={258} h={35} />
			<Term
				x={457}
				y={182}
				w={853}
				h={560}
				prompt={shown.length ? shown : 'Try "how do I add a page?"'}
				caret={shown.length > 0 || blinkOn(ms)}
			/>
			<PropsPanel head="Frame 1" fill="#FFFFFF" swatch={[255, 255, 255]} w={124} h={112} />
			<ZoomPill pct={100} />
		</>
	);
}

/** f30-f74: the agent pill typing the prompt (close-up). */
function prompt(ms, c) {
	const text = c.text ?? PROMPT;
	const shown = typed(text, ms, c.typeAt ?? -650, c.cps ?? 27.75);
	return (
		<>
			<ToolRail y={46} extra />
			<AskPill x={43} y={43} w={258} h={35} typedText={shown} caret />
			<PropsPanel head="Frame 1" />
		</>
	);
}

/** f75-f118: the sent prompt as a chat card, thinking, then docking left. */
function chat(ms, c) {
	const docked = ms >= (c.dockAt ?? 830);
	const items = [
		{ kind: "user", text: c.text ?? PROMPT },
		{ kind: "thinking", text: "Thinking…" },
	];
	return (
		<>
			<ToolRail y={46} extra={!docked} />
			{docked ? (
				<AgentPanel
					x={4}
					y={385}
					w={300}
					h={609}
					items={[...TALK.slice(0, 1), { kind: "thinking", text: "Thinking…" }]}
					spin
				/>
			) : (
				<AgentPanel
					x={41}
					y={41}
					w={298}
					h={334}
					title="design a control room f…"
					items={items}
					spin
				/>
			)}
			<PropsPanel head="Frame 1" />
			<ZoomPill pct={90} />
		</>
	);
}

/** f119-f437: the artboard building itself while the agent streams. */
function build(ms, c) {
	const b = kf(c.buildKeys ?? [{ at: 0, build: 1 }], ms);
	const n = kf(c.talkKeys ?? [{ at: 0, n: 4 }], ms);
	return (
		<EditorWithDesign
			ms={ms}
			c={c}
			theme={c.theme ?? "green"}
			build={b.build}
			n={Math.floor(n.n)}
			todoDone={Math.floor(b.build / 3)}
			hl={0}
			pic={c.images?.hero}
			panelY={kf(c.panelKeys ?? [{ at: 0, y: 252 }], ms).y}
		/>
	);
}

export const S1_VIEWS = { cli, prompt, chat, build };

const VIEWS = { ...S1_VIEWS, ...S2_VIEWS, ...S3_VIEWS };

export const S1_PRESETS = {
	"rowan-shot": {
		note: "One beat of the rowan film: the app window lying on the contour-ribbon backdrop, framed by a measured camera, its body drawn by a named `view` (cli, prompt, chat, build, variant, board, phones, phone-close, site, code, browser, components, variables, light, gradient). Give it `src` (an .mp4 of YOUR app window, with `clip`) and the recording fills the window instead of the drawn stand-in — chrome, backdrop and camera stay. Camera: `cam` keys [{at, s, cx, cy}] (window centre at frame point cx,cy in reference px, scale s; linear). Pictures inside a view are image slots under `images`.",
		nativeMs: 3000,
		params: {
			view: ["string", "build", "which drawn interior to show"],
			cam: ["array", "[{at:0,s:0.947,cx:906,cy:540}]", "scene-relative camera keys"],
			doc: ["string", "untitled.rowan", "document name in the titlebar"],
			src: ["string", "-", "screen recording of your app window (.mp4) — replaces the drawn view"],
			images: ["object", "-", "image slots by name (hero, cell-N, site-N …)"],
		},
		render: (c, t) => {
			const ms = localMs(c, t);
			const cam = camAt(c.cam, ms);
			const view = VIEWS[c.view];
			const video = c.src ? videoRef(c.id) : null;
			return (
				<RefBox>
					<div
						style={{
							position: "absolute",
							left: -400,
							top: -40,
							width: 2612,
							height: 1160,
							background: "#000",
						}}
					/>
					<World cam={cam}>
						<Backdrop />
						<Window doc={c.doc ?? "windfarm.rowan"} video={video}>
							{view ? view(ms, c) : null}
						</Window>
					</World>
				</RefBox>
			);
		},
	},
};
