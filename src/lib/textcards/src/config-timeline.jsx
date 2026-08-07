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
import { lerp, clamp01, easeByName, mixRgb, rgb } from "./easing.js";

/**
 * Optional per-scene CAMERA: one smooth scale(+translate) drift applied to the
 * whole scene, so a composition can zoom as a unit without per-element hacks.
 *
 * Measured need (Comet launch film): the dot-field passage zooms IN
 * continuously at ~3-4.5%/s about frame centre for its full 3.25-8.05s
 * (settled words drift outward 4.7-5.8%/s at line-1, 2.9-3.6%/s at line-2,
 * monotonic and roughly linear); the cosmic line contracts ~6%/s for its whole
 * hold; 'Ask more' / 'Understand more' scale-settle ~1.10 -> 1.00 decelerating
 * over 0.64-1.15s while the words hold. All of those are this one channel with
 * different keys.
 *
 *   "camera": { "originX": 640, "originY": 360,
 *               "keys": [ { "atMs": 0,    "scale": 1.00 },
 *                         { "atMs": 4800, "scale": 1.18, "ease": "linear" } ] }
 *
 * keys' atMs are SCENE-RELATIVE ms; each key may set scale / x / y (px
 * translate), omitted channels inherit the previous key; `ease` shapes the
 * segment INTO that key — 'linear' (drifts), 'out'|'expo'|'quint'
 * (scale-settles), 'in'+pow, 'inout'. Pure in t. Scenes without `camera`
 * render exactly as before (no wrapper element at all).
 */
function withCamera(sc, t, el) {
  const cam = sc.camera;
  if (!cam || !cam.keys || !cam.keys.length) return el;

  // Resolve sparse keys (inherit backwards from {scale:1, x:0, y:0}).
  let prev = { t: sc.startMs / 1000, scale: 1, x: 0, y: 0 };
  const keys = cam.keys.map((k) => (prev = {
    t: (sc.startMs + (k.atMs ?? 0)) / 1000,
    scale: k.scale ?? prev.scale, x: k.x ?? prev.x, y: k.y ?? prev.y,
    ease: k.ease, pow: k.pow,
  }));

  let cur = keys[keys.length - 1];
  if (t <= keys[0].t) cur = keys[0];
  else {
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t >= a.t && t < b.t) {
        const e = easeByName(b.ease ?? "linear", b.pow, (p) => p)(
          clamp01((t - a.t) / Math.max(1e-6, b.t - a.t)));
        cur = { scale: lerp(a.scale, b.scale, e), x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) };
        break;
      }
    }
  }

  return (
    <div style={{
      position: "absolute", inset: 0,
      transform: `translate(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px) scale(${cur.scale.toFixed(4)})`,
      transformOrigin: `${cam.originX ?? 640}px ${cam.originY ?? 360}px`,
    }}>
      {el}
    </div>
  );
}

export function makeTimeline(config) {
  const video = config.video ?? {};
  const scenes = (config.scenes ?? []).slice().sort((a, b) => a.startMs - b.startMs);
  const ground = (config.ground ?? []).slice().sort((a, b) => a.fromMs - b.fromMs);

  const durationMs = video.durationMs
    ?? scenes.reduce((m, s) => Math.max(m, s.startMs + s.durationMs), 0);

  // A ground stop resolves to a LAYER. `c1` is the flat / first colour — what
  // bgAt has always returned. `grad` is false for a plain stop, and then every
  // other field is inert and the stage paints a flat rgb() as before.
  const flatGround = (c) => ({ c1: c, c2: c, angle: 180, shape: "linear", p0: 0, p1: 1, grad: false, a: 1 });

  // Measured need (Bloom launch film): the painterly grounds behind the
  // extract cards are NOT flat, and picking their mean throws away the only
  // thing that made them interesting. Sampled in the exposed frame margins:
  // the sunset meadow runs 243,158,104 at the top to 5,1,18 at the bottom with
  // the drop finishing ~72% down; the garden runs dark foliage at the lower
  // LEFT to a bright window at the upper right, a 68deg axis rather than a
  // vertical one (R^2 0.56 against a linear fit); the purple field runs
  // 168,123,249 -> 70,24,150 straight down (no horizontal component at all).
  //
  // So a stop may carry `colour2`, plus optional `angle` (CSS degrees, default
  // 180 = `colour` at the top), `shape` ('linear'|'radial', default linear,
  // radial being centred), and `stops` ([p0,p1] in 0..1, where along the axis
  // each colour lands, default [0,1]). A stop with no `colour2` is flat and
  // renders exactly as it always did.
  const groundStop = (g) => (g.colour2
    ? {
        c1: g.colour, c2: g.colour2,
        angle: g.angle ?? 180,
        shape: g.shape ?? "linear",
        p0: g.stops ? g.stops[0] : 0,
        p1: g.stops ? g.stops[1] : 1,
        grad: true,
        a: 1,
      }
    : flatGround(g.colour));

  const sameShape = (a, b) => a.grad === b.grad
    && (!a.grad || (a.angle === b.angle && a.shape === b.shape && a.p0 === b.p0 && a.p1 === b.p1));

  /** Alpha-composite a channel down a layer stack (topmost first, base opaque). */
  const flatten = (layers, k) => {
    let c = layers[layers.length - 1][k];
    for (let i = layers.length - 2; i >= 0; i--) c = mixRgb(c, layers[i][k], layers[i].a);
    return c;
  };

  // The ground is a STEP by default: at `fromMs` the colour changes on one
  // frame, which is exactly what a hard cut looks like, and most grounds cut.
  //
  // Measured need (Bloom launch film): the extract passage does NOT cut
  // between its painterly grounds — it holds one for a beat and then
  // DISSOLVES to the next over ~0.8s (sunset -> garden 17.12-18.00s, garden
  // -> purple 19.84-20.60s, both an 'inout' S), and a step cannot say that.
  // So an entry may carry `fadeMs` (+ optional `ease`/`pow`, default 'inout')
  // to crossfade from whatever colour was live into its own, across
  // fromMs..fromMs+fadeMs. Entries WITHOUT `fadeMs` step exactly as before,
  // so every existing config renders unchanged.
  //
  // A dissolve between two stops of the SAME geometry (which is every fade a
  // flat ground can have) is just a colour lerp. Between two DIFFERENT
  // geometries it is not: interpolating the angle and the stop positions
  // sweeps the ramp through intermediate shapes neither side has, and measured
  // against the reference that drags the sunset's bright sky down over the
  // whole frame mid-dissolve (dE 118 in the lower margins at 17.60s, where the
  // reference stays dark). The reference is a per-pixel crossfade of two
  // finished paintings, so that is what this does: the incoming ramp is
  // stacked over the outgoing one at alpha `e`. bgAt is unaffected either way
  // — compositing the first colours is the same lerp it always returned.
  const groundAt = (ms) => {
    let layers = [flatGround(ground.length ? ground[0].colour : C.white)];
    for (const g of ground) {
      if (ms < g.fromMs) break;              // sorted, so nothing later applies
      const fade = g.fadeMs ?? 0;
      const to = groundStop(g);
      if (!(fade > 0 && ms < g.fromMs + fade)) { layers = [to]; continue; }
      const e = easeByName(g.ease ?? "inout", g.pow, (p) => p)(
        clamp01((ms - g.fromMs) / fade));
      layers = layers.length === 1 && sameShape(layers[0], to)
        ? [{ ...to, c1: mixRgb(layers[0].c1, to.c1, e), c2: mixRgb(layers[0].c2, to.c2, e) }]
        : [{ ...to, a: e }, ...layers];
    }
    return layers;
  };

  const layerCss = (L) => {
    const col = (c) => (L.a >= 1 ? rgb(c)
      : `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${L.a.toFixed(4)})`);
    const ramp = `${col(L.c1)} ${(L.p0 * 100).toFixed(2)}%, ${col(L.c2)} ${(L.p1 * 100).toFixed(2)}%`;
    return L.shape === "radial"
      ? `radial-gradient(farthest-corner at 50% 50%, ${ramp})`
      : `linear-gradient(${L.angle.toFixed(2)}deg, ${ramp})`;
  };

  return {
    DURATION: durationMs / 1000,

    // The live ground as an rgb triple. For a two-tone stop this is the FIRST
    // colour; anything that wants the whole fill wants bgCssAt.
    bgAt(t) { return flatten(groundAt(t * 1000), "c1"); },

    // The live ground as a CSS background value: a plain `rgb(...)`, byte for
    // byte what the stage painted before, unless a live stop is two-tone.
    bgCssAt(t) {
      const layers = groundAt(t * 1000);
      if (layers.every((L) => !L.grad)) return rgb(flatten(layers, "c1"));
      const base = layers[layers.length - 1];
      const imgs = (base.grad ? layers : layers.slice(0, -1)).map(layerCss).join(", ");
      return base.grad ? imgs : `${imgs}, ${rgb(base.c1)}`;
    },

    // Every scene whose window contains t — overlapping handovers are the point.
    liveAt(t) {
      const ms = t * 1000;
      return scenes.filter((s) => ms >= s.startMs - (s.leadMs ?? 0)
                               && ms < s.startMs + s.durationMs + (s.tailMs ?? 0));
    },

    renderAt(t) {
      return this.liveAt(t).map((sc, i) => (
        <React.Fragment key={sc.id ?? i}>{withCamera(sc, t, renderScene(sc, t))}</React.Fragment>
      ));
    },
  };
}
