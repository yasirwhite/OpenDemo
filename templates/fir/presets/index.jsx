/**
 * fir preset registry — the presets the `fir` template is built out of.
 *
 * Registered into the shared textcards registry by one additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render. All are pure functions of t.
 */
import React from "react";
import { FirGround } from "./fir-ground.jsx";
import { FirLockup } from "./fir-lockup.jsx";
import { FirChatCard } from "./fir-chat-card.jsx";
import { FirEmojiFlow } from "./fir-emoji-flow.jsx";

const sec = (ms) => ms / 1000;

export const FIR_PRESETS = {
  "fir-ground": {
    note: "fir's layered ground: grainy lavender with slowly drifting pale bands, right-anchored panels (painterly landscape approximation / flat white) whose left edge is keyframed, and inset border highlights that pop on and off around a panel. One scene usually spans the whole mid-film.",
    nativeMs: 59000,
    params: {
      base: ["rgb", [134, 127, 232], "the lavender base"],
      bandColour: ["rgb", [201, 196, 250], "colour of the drifting pale bands"],
      bands: ["array", "3 measured bands", "[{y,h,alpha,driftPxPerSec}]"],
      grainAlpha: ["number", 0.05, "static grain overlay opacity"],
      profile: ["array|null", null, "[[yStagePx,[r,g,b]],...] — the ground as a MEASURED vertical ramp instead of base+bands (a triangular band cannot hold the reference's 220px flat plateau). Present -> replaces base/bandColour/bands entirely."],
      profileDriftPxPerSec: ["number", 0, "slides the whole `profile` ramp down the frame"],
      profileFadeX: ["object|null", null, "{x0,x1,minAlpha} — the measured `profile` is the LEFT edge's column; its pale top/bottom bands decay rightward in the reference (x560 stage reads the dark mid colour where the left edge is pale). Masks the profile layer from alpha 1 at x0 to minAlpha at x1 over a flat `base` fill. Omitted -> the old single-layer profile."],
      grainDarkAlpha: ["number", 0, "opacity of a DARK turbulence layer drawn under the panels — the reference grain is bidirectional; the white grain layer alone can only lighten. 0 = off (previous output)."],
      panels: ["array", [], "[{id,type:'painterly'|'flat',colour,palette,anchor:'right'|'left',fromMs,toMs,edgeKeys:[{atMs,x,ease,pow}]}] — right-anchored, left edge keyed in stage px. A painterly palette also takes `stops` ([[percent,[r,g,b]],...], the measured vertical ramp) and `blobs` ([{left|right,top|bottom,width,height,colour,blur,opacity}], replacing the four default blurred ellipses)."],
      borders: ["array", [], "[{rect:[x0,y0,x1,y1],colour,thickness,inset,radius,inMs,outMs,fadeInMs,fadeOutMs}] — inset stroke highlights. inMs..inMs+fadeInMs ramps opacity 0->1 linearly, outMs..outMs+fadeOutMs ramps 1->0; fadeInMs/fadeOutMs default 0 = instant on/off. Geometry never animates."],
    },
    render: (c, t) => <FirGround t={t} from={sec(c.startMs)} to={sec(c.startMs + c.durationMs)} cfg={c} />,
  },
  "fir-lockup": {
    note: "brand bookend on black: the INTERCOM mark (five comb bars + crescent smile, drawn locally in fir-lockup.jsx — NOT the 3-bar Fin icon) pops in oversized and settles on an exponential while its bars and smile draw on, then the lockup expands: the mark slides left while the wordmark slides rightward out from behind it through a soft edge that hardens as it settles. Optionally the whole layer (black backdrop included) crossfades away to reveal the scene beneath.",
    nativeMs: 3450,
    params: {
      markSize: ["number", 80.2, "mark size at rest, stage px (120.5@1920)"],
      cx: ["number", 639.7, "mark centre x before the lockup expands"],
      cy: ["number", 350.2, "mark centre y"],
      enter: ["object", "{atMs,mode:'pop'|'shrink',fromScale,tauMs,bez,durMs,originY,fadeAtMs,fadeMs}",
        "arrival: scale decays from fromScale to 1 with time constant tauMs, or on cubic-bezier `bez` over `durMs` when given (the outro's shrink is measurably not an exponential); `originY` moves the scale pivot off the tile centre (fraction of the mark's height, 0.5 = centre); opacity ramps over fadeMs from fadeAtMs"],
      glyph: ["object", "{barStaggerMs,barTauMs,barPow,bez,durMs,barDelaysMs,smileAtMs,smileMs,smileBez}",
        "glyph draw-on, relative to enter.atMs: bars scale vertically about their own centres (centre bar first, outer pair last) on a stretched exponential or, with `bez`+`durMs`, on a cubic-bezier; `durMs` may be [centre,mid,outer] and `barDelaysMs` [centre,mid,outer] replaces the even stagger when the pairs do not come in on a beat; then the smile reveals centre-out over smileMs, linearly or on `smileBez`"],
      slide: ["object", "{atMs,durMs,bez}", "the mark's leftward move to lockupLeft; bez is a cubic-bezier [x1,y1,x2,y2]"],
      wordmark: ["object", "{text,font,size,weight,tracking,baseline,inkWidth,inkDx,atMs,durMs,bez,rampPx,rampHoldP,colour,strokePx,reveal,gapPx}",
        "the wordmark and its slide-out; the exposed lockup length runs markSize -> lockupRight-lockupLeft on `bez`, and the mask ramp collapses as it settles (`rampHoldP` holds it at full width until that progress first). `reveal:'head'` swaps the mechanism: instead of a rigid wordmark sliding right out from behind the mark (END first, the opener), the wordmark is pinned `gapPx` right of the mark and a soft-edged window opens rightward over it (START first, the outro)"],
      lockupLeft: ["number", 390.0, "measured left edge of the final lockup"],
      lockupRight: ["number", 888.3, "measured right edge of the final lockup"],
      fadeOutAtMs: ["number|null", null, "when the whole layer starts crossfading away"],
      fadeOutMs: ["number|null", null, "crossfade duration (linear — measured, not eased)"],
      markBg: ["rgb", [255, 255, 255], "mark tile colour"],
      markFg: ["rgb", [0, 0, 0], "mark glyph colour"],
      markRadius: ["number", 0.125, "tile corner radius as a fraction of markSize"],
      bgColour: ["rgb", [0, 0, 0], "the plate behind the mark"],
    },
    render: (c, t) => <FirLockup t={t} from={sec(c.startMs)} to={sec(c.startMs + c.durationMs)} cfg={c} />,
  },
  "fir-chat-card": {
    note: "the floating agent chat card: rises in with an overshoot, holds, slides right at the split, clears its thread, plays a second scenario, exits up with motion blur. Items sit at measured card-local y positions; any item can POP OUT to a frame-space rect at larger type (optionally swapping languages) then return.",
    nativeMs: 27900,
    params: {
      card: ["object", "{x,y,w,h,radius,keys:[{atMs,dx,dy,blur,opacity,ease,pow}]}", "home rect + motion keys"],
      header: ["object", "{name,sub,chip}", "card header copy"],
      mark: ["object", "{bg,fg}", "brand mark colours (header avatar + message avatars)"],
      type: ["object", "{size,lineH,padV,padH,radius,tracking,blockSkew}", "per-scene overrides of the measured type/box metrics (scene 3 measures lineH 1.47 and blockSkew 0)"],
      layout: ["object", "{headerH,bubbleX,gutterX,avatarSize,rightPad}", "card-local rails"],
      items: ["array", [], "[{kind:'user'|'bot'|'thinking'|'answercard'|'map'|'pills', y, x, w, atMs, enterMs, enterFrom, hideAtMs, hideFadeMs, text|paras, size, colour, rightPad, avatar, avatarY, avatarFace:'grin'|'think', avatarAtMs, avatarInMs, avatarAnimAtMs, avatarHideAtMs, avatarFadeMs, avatarKeepOnPop, footerPadV, source, footer, options}] — avatarAnimAtMs runs the measured 3-bar THINKING WAVE (0.94s cycle, right bar leading) instead of a static loader glyph — rightPad overrides layout.rightPad for one right-aligned item; avatarKeepOnPop keeps the avatar in the thread while the item is popped out; footerPadV is the answercard footer row's vertical padding in stage px"],
      popouts: ["array", [], "[{itemIndex, rect:[x,y,w,(h)], srcW, srcH, shadow:{dy,blur,alpha}, langs:[{outAtMs,inAtMs,text|paras}], langFadeMs, keys:[{atMs,p,ease,pow}]}] — `keys` drive the 0..1 grow/hold/return progress; `shadow` overrides the default drop-shadow reach (scene 3 measures only ~8px@1920 of dark band around a popped bubble)"],
    },
    render: (c, t) => <FirChatCard t={t} from={sec(c.startMs)} to={sec(c.startMs + c.durationMs)} cfg={c} />,
  },
  "fir-emoji-flow": {
    note: "the persistent flow-diagram layer: emoji nodes, the agent mark tile (animated mouth, bottom-anchored pulse), routing tile, labels, growing connectors/arrows, dashed harness paths, a bold elbow pick-arrow, and person emojis that crossfade identities and spread from grid to column. Declarative elements with sparse keys.",
    nativeMs: 44900,
    params: {
      elements: ["array", [], "[{kind:'emoji'|'markTile'|'routeTile'|'label'|'line'|'arrow'|'elbow'|'dash'|'person', keys:[{atMs,x,y,scale,opacity,tip,rise,head,reveal}], inMs,outMs, ...kind fields}] — 'elbow' takes {x0,y0,yTop,x1,thickness,headW,headH,cornerR,soft,mode:'fill'|'ghost',ghostColour,ghostWidth,dash} and draws ONE outline either filled or dash-stroked; 'routeTile' takes a `reveal` channel + revealSoft for its soft left-to-right wipe"],
    },
    render: (c, t) => <FirEmojiFlow t={t} from={sec(c.startMs)} to={sec(c.startMs + c.durationMs)} cfg={c} />,
  },
};
