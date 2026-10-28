/**
 * saru preset registry — the presets the `saru` product film is built out of.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx, exactly the way FIR_PRESETS is.
 * Same entry shape as every other preset: note, nativeMs, params, render.
 * All are pure functions of t.
 *
 * Scene agents add their preset here ADDITIVELY — never remove an entry.
 */
import React from "react";
import { SaruPostCard } from "./saru-post-card.jsx";
import { SaruIcon } from "./saru-icon.jsx";
import { SaruRulesCard } from "./saru-rules-card.jsx";
import * as SaruDashboardMod from "./saru-dashboard.jsx";
import * as SaruConversationMod from "./saru-conversation.jsx";
import * as SaruEndcardMod from "./saru-endcard.jsx";
import * as SaruMarkTileMod from "./saru-mark-tile.jsx";
import * as SaruNorthtrailMarkMod from "./saru-northtrail-mark.jsx";

const sec = (ms) => ms / 1000;

export const SARU_PRESETS = {
  "saru-post-card": {
    note: "the film's opening beat: a minimal Instagram post (brand avatar, @handle, full-bleed square window onto a REAL 4:5 product photograph, authored caption block) floating on fir-chat-card's card chrome, with the stranger's comment card sliding up into place beneath it and then ENLARGING TOWARD CAMERA — fir's emphasis move, applied to a card on the ground instead of a bubble in a thread. The post recedes and dims a hair under the enlarged comment so the overlap reads as depth.",
    nativeMs: 7000,
    params: {
      post: ["object", "{x,y,w,radius,headerH,captionH,padH,avatarSize,avatarKind,avatarInk,avatarRing,avatarC1,avatarC2,handle,handleSize,caption,captionSize,captionLineH,captionPadT,photoSrc,photoGround,photoFocus,shadowDy,shadowBlur,shadowAlpha,enter,recedeKeys}",
        "the post card. `caption` is an array of authored LINES, each an array of spans [{text,bold,colour}] — line breaks are authored, never reflowed. The picture is the inlined product photograph from templates/saru/assets/northtrail-post.data.js: `photoFocus` is the CSS objectPosition the SQUARE window crops that 4:5 frame with, `photoSrc`/`photoGround` override the picture and the colour painted under it. `avatarKind` is 'peaks' (default — the @northtrail white disc with its twin-peak glyph, tinted by `avatarInk`) or 'disc' (the old two-tone gradient dot, `avatarC1`/`avatarC2`). `enter` {atMs,durMs,fadeMs,fromScale,fromDy,ease,pow} is OPTIONAL — omit it and the post is at rest from frame 0, which is what lets the scene cut in clean. `recedeKeys` [{atMs,scale,dim,ease,pow}] pushes it back under the emphasis move"],
      comment: ["object", "{x,y,w,radius,padL,padT,padR,padB,avatarSize,avatarGap,avatarC1,avatarC2,handle,handleSize,handleLineH,rowGap,lines,textSize,textLineH,textColour,shadow,shadowGrow,enter,popRect,popKeys}",
        "the stranger's comment. `lines` is an array of authored strings. `enter` {atMs,durMs,fadeMs,fromDy,fromScale,ease,pow} slides it up into place. `popRect` [x,y,w] is the frame-space rect it grows to and `popKeys` [{atMs,p,ease,pow}] drive that 0..1 progress — height follows the content at the same scale, so the type grows with the box"],
    },
    render: (c, t) => <SaruPostCard t={t} from={sec(c.startMs)} to={sec(c.startMs + c.durationMs)} cfg={c} />,
  },

  "saru-dashboard": {
    note: SaruDashboardMod.note,
    nativeMs: SaruDashboardMod.nativeMs,
    params: {
      ground: ["string", "#F7F4ED", "the cream stage ground behind the window"],
      window: ["object", "{x,y,w,h,r}", "the floating app window rect in stage px (default 88,40 1104x570 r14)"],
      wordmark: ["string", "saru", "top-bar wordmark, lowercase geometric sans in Saru brick #b65243, set beside the monkey mark"],
      accountInitials: ["string", "AR", "operator avatar initials in the top bar"],
      nav: ["array", "[{label,ic}]", "left nav items; ic is one of chat|rules|contacts|reports"],
      navActive: ["number", 0, "index of the active nav item (brick-tinted pill)"],
      pageTitle: ["string", "Conversations", "main-pane page title"],
      tiles: ["array", "[{label,value,from}]", "three metric tiles. A tile carrying `from` ROLLS from `from` to `value` like an odometer at the tick beat and floats a sage +1 chip"],
      table: ["object", "{headers,rows,newRow}", "the conversations table. `rows` are the resting rows [{handle,status,tone,email,at,initial,tint,tintInk}]; `newRow` is the SAME shape and slides into the top of the table under a warm cream-brick wash, pushing the rows below down, then pulses its brick-outlined email chip once. tone is sage|brick|neutral|green|amber|slate"],
      caption: ["object", "{text,y,size,colour,outAtMs}", "the on-mute caption line, drawn OUTSIDE the camera so a push-in never drags it off the ground"],
      view: ["array", "{keys:[{atMs,scale,focusX,focusY,ease}]}", "the in-preset camera: the stage point (focusX,focusY) lands on frame centre at that scale, so scale 1 + focus (640,360) is the rest pose"],
    },
    render: SaruDashboardMod.SaruDashboard,
  },

  "saru-icon": {
    note: "the Saru app icon as a stage element: a near-black rounded tile carrying the brand's lowercase 's' in a bold geometric sans. Positioned by CENTRE and keyed on the same sparse x/y/scale/opacity channels the fir flow layer uses, so it can pop in, pulse and sit inside a flow diagram on the same clock as the nodes around it.",
    nativeMs: 3000,
    params: {
      x: ["number", 640, "tile centre x, stage px"],
      y: ["number", 360, "tile centre y, stage px"],
      size: ["number", 150, "tile size at scale 1, stage px"],
      bg: ["rgb", [13, 13, 16], "tile colour"],
      fg: ["rgb", [255, 255, 255], "letter colour"],
      radius: ["number", 0.235, "corner radius as a fraction of size"],
      letter: ["string", "s", "the glyph on the tile"],
      font: ["string", "SARU_FONT", "CSS font stack for the letterform"],
      weight: ["number", 700, "letter weight"],
      glyph: ["number", 0.62, "cap size as a fraction of the tile"],
      dx: ["number", 0, "optical nudge, fraction of size"],
      dy: ["number", 0, "optical nudge, fraction of size"],
      inMs: ["number|null", null, "fade-in cue, scene-relative"],
      inFadeMs: ["number", 220, "fade-in duration"],
      outMs: ["number|null", null, "fade-out cue, scene-relative"],
      outFadeMs: ["number", 260, "fade-out duration"],
      keys: ["array", [], "[{atMs,x,y,scale,opacity,ease,pow}] — sparse keys; scale is about the tile CENTRE so a pulse never shifts the node it sits on"],
    },
    render: (c, t) => <SaruIcon t={t} from={sec(c.startMs)} to={sec(c.startMs + c.durationMs)} cfg={c} />,
  },

  "saru-rules-card": {
    note: "the operator's rules card: fir-chat-card's CHROME (same floating white panel, radius, shadow and 73.3px header with back chevron / brand tile / title / sub-label) with a settings body instead of a thread — a stack of MINIMAL rule rows that arrive one at a time, each row a small line icon plus a short label on the left rail and a value CHIP (rounded pill, light warm ground, ink text) on the right. No switches and no sentences: a rule is a NAME and a VALUE. Header tile is the shipped app icon (light-grey tile, line-art monkey) via SaruTile, and the palette is the real portal's ink/brick — no indigo.",
    nativeMs: 7500,
    params: {
      card: ["object", "{x,y,w,h,radius,bg,shadow,keys:[{atMs,dx,dy,opacity,ease,pow}]}", "the panel rect and optional whole-card motion (same channel names as fir-chat-card)"],
      header: ["object", "{title,sub,chevron,tileBg,tileRadius,tileMark,tileMarkFrac,tileBorder,tileBorderColour,tileBorderAlpha}", "header copy and the monkey tile's colours"],
      colours: ["object", "{ink,muted,icon,accent,divider,chipBg,chipInk}", "palette overrides; defaults are the real portal's ink #554a42 / secondary #786f68 / brick #b65243"],
      layout: ["object", "{headerH,padH,bodyPadTop,rowH,iconSize,iconGap,iconWidth,chipH,chipPadH,chipRadius,chipAlpha}", "card-local rails"],
      type: ["object", "{row,chip,title,sub}", "type sizes"],
      rows: ["array", [], "[{icon:'clock'|'skip'|'cap',label,chip,atMs,enterMs,enterDy,chipDelayMs,chipMs,growLeadMs,growMs}] — `label` and `chip` render VERBATIM; the chip fades and settles `chipDelayMs` behind its label, scaled about its RIGHT edge so the right rail never moves"],
    },
    render: (c, t) => <SaruRulesCard t={t} from={sec(c.startMs)} to={sec(c.startMs + c.durationMs)} cfg={c} />,
  },

  "saru-endcard": {
    note: SaruEndcardMod.note,
    nativeMs: SaruEndcardMod.nativeMs,
    params: {
      gradA: ["rgb", [20, 19, 32], "light plateau of the plate's ground (plum's measured endcardGround, re-stopped near-black)"],
      gradB: ["rgb", [8, 8, 11], "dark plateau of the ground"],
      wordmark: ["object", "{text,dot,dotX,sizeK,dyK,dxK,track,weight,font}",
        "the mark. sizeK/dyK/dxK are fractions of the plate's own width/height, so the plate is resolution-independent. `dot` is the full stop's settled colour (Saru indigo) and `dotX` is where the stop sits across the plate — it only times the stop's WARM from white to that colour as the solid edge crosses it"],
      reveal: ["object", "{atMs,durMs,ease,pow,solidFrom,solidTo,softFrom,softTo,bloomOutMs}",
        "the left-to-right wipe. `solid` is the fully-opaque edge as a fraction of plate width and `soft` the ramp ahead of it, so solidFrom+softFrom is the LEADING edge on frame 0 — put it on the mark's left edge and the scene cuts in on a bare ground. soft narrows across the run, the way the measured reveal does"],
      glow: ["object", "{colour,alpha,rx,ry,cx,cy,atMs,durMs,ease,pow}",
        "the centred indigo wash. Screen-blended, so it is added light only: it lifts the ground and leaves the white wordmark untouched. Rides the reveal, then holds"],
      sub: ["object", "{text,y,size,weight,track,colour,font,atMs,fadeMs,riseDy,ease,pow}",
        "the subline under the mark — the on-mute line the plate closes on. Fades up with a small rise and is dead still after"],
      mark: ["object", "{show,w,cx,cy,colour}",
        "the brand's monkey mark, stacked ABOVE the wordmark. `w`/`cx`/`cy` are the drawn ink's width and centre in stage px (the artboard's empty margin is already discounted). `colour` defaults to the portal cream #F7F4ED — the shipped logo's dark brown is invisible on this ground, which is what templates/saru/assets/saru-monkey-cream.svg exists for. Rides the SAME wipe as the wordmark, so the lockup lands as one sweep"],
      black: ["object", "{holdMs,fadeMs,ease,pow}",
        "the pure-black head. The plate holds under an opaque black for holdMs, then it lifts over fadeMs and the ground breathes in ahead of the reveal — so the film's last shot cuts in on nothing at all rather than on an already-lit gradient"],
    },
    render: (c, t) => <SaruEndcardMod.SaruEndcard t={t} from={sec(c.startMs)} to={sec(c.startMs + c.durationMs)} cfg={c} />,
  },

  "saru-conversation": {
    note: SaruConversationMod.note,
    nativeMs: SaruConversationMod.nativeMs,
    params: {
      ground: ["string", "#F7F4ED", "the cream stage ground behind the window"],
      window: ["object", "{x,y,w,h,r}", "the floating app window rect in stage px — defaults to saru-dashboard's 88,40 1104x570 r14 so S6 and S7 cut without the chrome moving"],
      wordmark: ["string", "saru", "top-bar wordmark, lowercase geometric sans in the brick accent, set beside the monkey mark in its light-grey tile"],
      accountInitials: ["string", "AR", "operator avatar initials in the top bar"],
      nav: ["array", "[{label,ic}]", "left nav items; ic is one of chat|rules|contacts|reports"],
      navActive: ["number", 0, "index of the active nav item (brick-wash pill)"],
      header: ["object", "{back,handle,sub,initial,tint,tintInk}", "the conversation header: back-link label, the contact's handle, the source line under it, and the avatar"],
      mode: ["object", "{label,segments,from,to,atMs,durMs}", "the response-mode segmented control, top-right. `segments` are the authored labels; the brick knob slides from segment `from` to segment `to` over durMs starting at atMs, and each label lights by its proximity to the knob, so the type crossfades exactly in step with the block passing under it"],
      thread: ["object", "{badgeBefore,badgeAfter,time,flip:{atMs,durMs},bubbles,reply}", "the thread card. `bubbles` are [{side:'in'|'out', lines:[...]}] with AUTHORED line breaks, composed and dead still from frame 0; the badge crossfades badgeBefore (grey) -> badgeAfter (brick) at flip.atMs. `reply` {lines,atMs,inMs} is the operator's own message — its slot is reserved from frame 0, so when it fades up nothing above it moves"],
      composer: ["object|null", null, "{placeholder,text,send,focusAtMs,focusMs,typeAtMs,typeMs,sendAtMs,blurAtMs,blurMs} — the reply box at the foot of the card. It takes a brick focus ring at focusAtMs, `text` types out GRAPHEME by grapheme across typeMs (so an emoji never splits), the Send button wakes grey -> brick on the first character, and at sendAtMs the field empties"],
      skip: ["object|null", null, "{text,atMs,inMs,washMs} — the skipped-comment chip that rises in under the thread and settles as its brick wash fades. `text` renders VERBATIM"],
      cursor: ["object", "{size,keys,press,glyphKeys}", "stage-space pointer: `keys` [{atMs,x,y,ease}] is the path, `press` [{atMs,amount}] the click, `glyphKeys` [{atMs,glyph:'arrow'|'hand',dx,dy}] the glyph swaps (plum's convention: hand on entering the control, arrow again ON the click)"],
      caption: ["object", "{text,y,size,colour,inAtMs,inMs,outAtMs,outMs}", "the on-mute caption line, drawn OUTSIDE the camera so a push-in never drags it off the ground"],
      view: ["array", "{keys:[{atMs,scale,focusX,focusY,ease}]}", "the in-preset camera: the stage point (focusX,focusY) lands on frame centre at that scale, so scale 1 + focus (640,360) is the rest pose"],
    },
    render: SaruConversationMod.SaruConversation,
  },

  "saru-mark-tile": {
    note: SaruMarkTileMod.note,
    nativeMs: SaruMarkTileMod.nativeMs,
    params: {
      x: ["number", 640, "tile centre x, stage px"],
      y: ["number", 360, "tile centre y, stage px"],
      size: ["number", 150, "tile size at scale 1, stage px (border-box: the hairline eats in, so this IS the footprint)"],
      bg: ["rgb", [236, 236, 236], "tile colour — the product's light grey"],
      radius: ["number", 0.235, "corner radius as a fraction of size"],
      markColour: ["rgb", [85, 74, 66], "monkey stroke colour (brand ink #554A42)"],
      markFrac: ["number", 0.64, "the mark's WIDTH as a fraction of the tile; the inset is the remainder"],
      border: ["number", 2, "hairline width in px at scale 1, scaled with the tile so a pulse stays self-similar"],
      borderColour: ["rgb", [85, 74, 66], "hairline colour, before alpha"],
      borderAlpha: ["number", 0.16, "hairline alpha — subtle by default"],
      inMs: ["number|null", null, "fade-in cue, scene-relative"],
      inFadeMs: ["number", 220, "fade-in duration"],
      outMs: ["number|null", null, "fade-out cue, scene-relative"],
      outFadeMs: ["number", 260, "fade-out duration"],
      keys: ["array", [], "[{atMs,x,y,scale,opacity,ease,pow}] — sparse keys; scale is about the tile CENTRE so a pulse never shifts the node it sits on"],
    },
    render: (c, t) => <SaruMarkTileMod.SaruMarkTile t={t} from={sec(c.startMs)} to={sec(c.startMs + c.durationMs)} cfg={c} />,
  },

  "saru-northtrail-mark": {
    note: SaruNorthtrailMarkMod.note,
    nativeMs: SaruNorthtrailMarkMod.nativeMs,
    params: {
      x: ["number", 0, "mark's TOP-LEFT x in stage px (frame space, so it drops straight onto a card header's avatar rail)"],
      y: ["number", 0, "mark's TOP-LEFT y in stage px"],
      size: ["number", 37.3, "diameter in stage px"],
      fill: ["string", "#ffffff", "the disc"],
      ink: ["string", "#2F4438", "twin-peak glyph colour — northtrail's deep green"],
      ring: ["string", "rgba(47,68,56,0.26)", "hairline ring, so a white disc still reads on white card chrome"],
      ringW: ["number", 2.4, "ring width in 100-box units, i.e. it scales with `size`"],
      opacity: ["number", 1, "flat opacity"],
      inMs: ["number|null", null, "fade-in cue, scene-relative"],
      inFadeMs: ["number", 220, "fade-in duration"],
      outMs: ["number|null", null, "fade-out cue, scene-relative"],
      outFadeMs: ["number", 260, "fade-out duration"],
    },
    render: (c, t) => <SaruNorthtrailMarkMod.SaruNorthtrailMark t={t} from={sec(c.startMs)} to={sec(c.startMs + c.durationMs)} cfg={c} />,
  },
};
