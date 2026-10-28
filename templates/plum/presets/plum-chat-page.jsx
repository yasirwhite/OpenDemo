/**
 * plum-chat-page.jsx — full-bleed 2D chat passage (Breeze reference S2/S3).
 *
 * A web page seen flat: a soft blurred desktop (Backdrop) with the agent chat
 * widget over it. The widget thread streams messages (appended at full
 * opacity; a smooth ease seats them — measured at 28.0s: no fade, ~0.45s
 * scroll). All framing (the S2 punched-in slice, S3's cut-out and 22-second
 * linear pull-back) is the per-scene `camera` in the config; this preset only
 * owns page-space motion:
 *   panelKeys  — widget translateY keys {atMs, v(px), ease}
 *   scrollKeys — thread scroll offset keys {atMs, v(px), ease}
 * Both in CSS px of the widget's own layout (panelW wide).
 *
 * Measured geometry (stage px = reference frame px / 1.5):
 *   S3 home framing: panel 504x650 at (392, 44); header 110; font 13.4.
 *   S2 slice: the same widget reflowed at panelW 288, camera scale 1.8.
 */

import React from "react";
import { ChatThread, Backdrop, chan, CHAT } from "./plum-shared.jsx";
import { rgb } from "../../../src/lib/textcards/src/easing.js";

export function PlumChatPage(cfg, t) {
  const from = cfg.startMs / 1000, to = (cfg.startMs + cfg.durationMs) / 1000;
  if (t < from - 0.001 || t > to + 0.001) return null;
  const tMs = (t - from) * 1000;

  const panelW = cfg.panelW ?? 504;
  const panelH = cfg.panelH ?? 650;
  const panelX = cfg.panelX ?? 392;
  const panelY0 = cfg.panelY ?? 44;
  const pScale = cfg.panelScale ?? 1;
  const py = chan(cfg.panelKeys, tMs, 0);
  const scrollY = chan(cfg.scrollKeys, tMs, 0);
  const bdY = chan(cfg.backdropKeys, tMs, cfg.backdropY ?? -140);

  const bd = cfg.backdrop ?? null;   // {tint,[tiles],blur,radius,shadow} — optional

  return (
    <div style={{ position: "absolute", inset: 0, background: rgb(cfg.pageTint ?? CHAT.ground), overflow: "hidden" }}>
      <Backdrop
        w={1280} h={720} y={bdY}
        tint={bd?.tint ?? cfg.pageTint ?? CHAT.ground}
        tiles={bd?.tiles ?? null}
        blur={bd?.blur ?? 7}
        radius={bd?.radius ?? 14}
        shadow={bd?.shadow ?? "0 8px 40px rgba(60,66,70,0.10)"}
      />
      <div style={{ position: "absolute", left: panelX, top: panelY0, transform: `translateY(${py.toFixed(2)}px) scale(${pScale})`, transformOrigin: "0 0" }}>
        <ChatThread
          w={panelW} h={panelH} tMs={tMs} scrollY={scrollY}
          messages={cfg.messages ?? []}
          brand={cfg.brand}
          headerH={cfg.headerH ?? 110}
          fontPx={cfg.fontPx ?? 13.4}
          radius={cfg.panelRadius ?? 8}
          composer={cfg.composer ?? true}
          metrics={cfg.metrics ?? null}
        />
      </div>
    </div>
  );
}

export const note = "Full-bleed chat passage: blurred desktop + streaming agent chat widget. Frame it with the per-scene camera; author panelKeys/scrollKeys for page motion.";
export const nativeMs = 9500;
