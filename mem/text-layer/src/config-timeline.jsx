/**
 * config-timeline.jsx — drives the text layer from a JSON config instead of
 * hand-written JSX.
 *
 * This is the path a model should use: pick presets by slug, give each a start
 * and a duration, fill in the copy. `timeline.jsx` (the hand-authored mem
 * rebuild) stays as the worked reference for what good values look like.
 *
 * A config is:
 *   {
 *     "video":  { "width":1280, "height":720, "fps":60, "durationMs":78500 },
 *     "ground": [ { "fromMs":0, "colour":[255,255,255] }, ... ],
 *     "scenes": [ { "preset":"reveal-line", "startMs":0, "durationMs":2900, ... } ]
 *   }
 *
 * Scenes may OVERLAP. They should, in fact: mem hands over between beats while
 * the outgoing one is still leaving, and rendering one scene at a time turns
 * every crossfade into a cut.
 */

import React from "react";
import { renderScene } from "./presets/index.jsx";
import { C } from "./theme.js";

export function makeTimeline(config) {
  const video = config.video ?? {};
  const scenes = (config.scenes ?? []).slice().sort((a, b) => a.startMs - b.startMs);
  const ground = (config.ground ?? []).slice().sort((a, b) => a.fromMs - b.fromMs);

  const durationMs = video.durationMs
    ?? scenes.reduce((m, s) => Math.max(m, s.startMs + s.durationMs), 0);

  return {
    DURATION: durationMs / 1000,

    bgAt(t) {
      const ms = t * 1000;
      let c = ground.length ? ground[0].colour : C.white;
      for (const g of ground) if (ms >= g.fromMs) c = g.colour;
      return c;
    },

    // Every scene whose window contains t — overlapping handovers are the point.
    liveAt(t) {
      const ms = t * 1000;
      return scenes.filter((s) => ms >= s.startMs - (s.leadMs ?? 0)
                               && ms < s.startMs + s.durationMs + (s.tailMs ?? 0));
    },

    renderAt(t) {
      return this.liveAt(t).map((sc, i) => (
        <React.Fragment key={sc.id ?? i}>{renderScene(sc, t)}</React.Fragment>
      ));
    },
  };
}
