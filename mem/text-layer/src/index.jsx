/**
 * index.jsx — entry point.
 *
 * Exposes the same contract the 3D scene uses (window.renderAtTime / DURATION /
 * __ready) so both layers can be driven by the same Playwright frame loop.
 * Rendering is flushed synchronously: the driver screenshots immediately after
 * the call returns, so an async commit would capture the previous frame.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { STAGE } from "./theme.js";
import { rgb } from "./easing.js";
import { DURATION, BEATS, beatAt, bgAt } from "./timeline.jsx";
import { makeTimeline } from "./config-timeline.jsx";
import GENERATED_CONFIG from "./_config.generated.js";

// A config supplied at build time (see mem/build.mjs --config) takes over from
// the hand-authored timeline. The hand-authored one stays as the worked
// reference for what good parameter values look like.
const CFG = GENERATED_CONFIG ? makeTimeline(GENERATED_CONFIG) : null;

function Stage({ t }) {
  // Every beat whose window contains t, not just the latest one: the reference
  // OVERLAPS beats — "Remembering is so" is still fading out right-to-left
  // while "yesterday" has already started entering. Rendering one beat at a
  // time turns that crossfade into a hard cut.
  const live = BEATS.filter((b) => t >= b.from && t < b.to);
  const shown = live.length ? live : [beatAt(t)];
  if (CFG) {
    return (
      <div style={{
        position: "relative", width: STAGE.w, height: STAGE.h,
        background: rgb(CFG.bgAt(t)), overflow: "hidden",
      }}>
        {CFG.renderAt(t)}
      </div>
    );
  }
  return (
    <div
      style={{
        position: "relative",
        width: STAGE.w, height: STAGE.h,
        background: rgb(bgAt(t)),
        overflow: "hidden",
      }}
    >
      {shown.map((b, i) => (
        <React.Fragment key={i}>{b.render(t)}</React.Fragment>
      ))}
    </div>
  );
}

const mount = document.getElementById("root");
const root = createRoot(mount);

window.DURATION = CFG ? CFG.DURATION : DURATION;
window.STAGE = STAGE;
window.renderAtTime = function (t) {
  const clamped = Math.max(0, Math.min(window.DURATION - 1e-4, t));
  flushSync(() => root.render(<Stage t={clamped} />));
};

window.renderAtTime(0);
window.__ready = true;
