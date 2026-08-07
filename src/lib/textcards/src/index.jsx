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
import { collectVideoSpecs, registerVideos, hasVideos, videosReady, prepareVideos } from "./video-sources.js";
import CONFIG from "./_config.generated.js";

if (!CONFIG) {
  throw new Error("No config baked in. Build with: node src/lib/textcards/build.mjs --config <file.json>");
}
// Footage sources are created BEFORE the timeline renders, so the driver can
// seek a window's video on the same frame the window first appears.
registerVideos(collectVideoSpecs(CONFIG));

// Static image assets scenes point at (window watermarks). An <img> that has
// not decoded yet paints nothing, and the frame a window ENTERS on is exactly
// the frame the browser would still be fetching it — one frame of the film
// missing its brand mark, invisible in a contact sheet. Same discipline as the
// footage gate: fetch up front, hold __ready until they are decoded. Configs
// with no watermarks create no elements and resolve immediately.
// Collected by WALKING each scene rather than by reading one known field: a
// watermark is no longer the only place a config names an image (a drifting
// brand mark, a logo lockup's markSvg and a drawn interior's artwork are all
// images now), and a preset added later would silently miss the gate. Anything
// under a `src`/`markSvg` key with an image extension counts; footage (.mp4) is
// deliberately excluded — video-sources.js owns that and has its own gate.
const IMAGE_RE = /\.(png|svg|jpe?g|webp|gif)(\?.*)?$/i;
function collectImages(node, out) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) { for (const v of node) collectImages(v, out); return out; }
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === "string") {
      if ((k === "src" || k === "markSvg" || k === "markSrc") && IMAGE_RE.test(v)) out.add(v);
    } else collectImages(v, out);
  }
  return out;
}
const IMAGE_SRCS = [...collectImages(CONFIG.scenes ?? [], new Set())];
const IMAGES = IMAGE_SRCS.map((src) => { const i = new Image(); i.src = src; return i; });
const imagesReady = () => Promise.all(IMAGES.map((i) => (
  i.complete
    ? Promise.resolve()
    : new Promise((res) => { i.onload = res; i.onerror = res; })
)));

const TL = makeTimeline(CONFIG);

function Stage({ t }) {
  return (
    <div style={{
      position: "relative", width: STAGE.w, height: STAGE.h,
      background: TL.bgCssAt(t), overflow: "hidden",
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

// Seek-before-draw. Configs with no footage keep the synchronous contract
// exactly as before: no elements, so this resolves without yielding.
window.prepareFrame = (t) => prepareVideos(t);
// Lets the driver skip the compositor wait entirely for footage-free configs.
window.__hasVideo = hasVideos();

window.renderAtTime(0);
if (hasVideos() || IMAGES.length) {
  // Hold __ready until every source has a decoded first frame, or frame 0 is a
  // black window and the film opens on a hole.
  Promise.all([videosReady(), imagesReady()]).then(async () => {
    await prepareVideos(0);
    window.renderAtTime(0);
    window.__ready = true;
  });
} else {
  window.__ready = true;
}
