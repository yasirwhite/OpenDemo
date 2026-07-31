/**
 * index.jsx — entry point for the text-card renderer.
 *
 * Exposes the same contract the 3D scene uses (window.renderAtTime / DURATION /
 * __ready) so both layers can be driven by one frame loop.
 *
 * Rendering is flushed synchronously: the driver screenshots immediately after
 * the call returns, so an async commit would capture the previous frame.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { STAGE } from "./theme.js";
import { rgb } from "./easing.js";
import { makeTimeline } from "./config-timeline.jsx";
import CONFIG from "./_config.generated.js";

if (!CONFIG) {
  throw new Error("No config baked in. Build with: node src/lib/textcards/build.mjs --config <file.json>");
}
const TL = makeTimeline(CONFIG);

function Stage({ t }) {
  return (
    <div style={{
      position: "relative", width: STAGE.w, height: STAGE.h,
      background: rgb(TL.bgAt(t)), overflow: "hidden",
    }}>
      {TL.renderAt(t)}
    </div>
  );
}

const root = createRoot(document.getElementById("root"));

window.DURATION = TL.DURATION;
window.STAGE = STAGE;
window.renderAtTime = function (t) {
  flushSync(() => root.render(<Stage t={Math.max(0, Math.min(TL.DURATION - 1e-4, t))} />));
};

window.renderAtTime(0);
window.__ready = true;
