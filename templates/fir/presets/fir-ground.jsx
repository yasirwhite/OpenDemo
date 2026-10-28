/**
 * fir-ground.jsx — the fir template's layered ground.
 *
 * One scene paints, in order: a grainy two-colour ground with slowly drifting
 * pale bands (the film's ambient motion), optional right-anchored PANELS whose
 * left edge is keyframed (a painterly landscape approximation, and a flat
 * white panel that wipes in over it and later slides right), and optional
 * inset BORDER highlights that pop on and off around a panel region.
 *
 * Pure function of t; the grain is a static SVG turbulence layer (subtle).
 */
import React from "react";
import { clamp01, lerp, rgb } from "../../../src/lib/textcards/src/easing.js";
import { s, kv, absKeys } from "./fir-shared.jsx";

/**
 * `profile` (optional) — the ground as a MEASURED vertical colour ramp instead
 * of base + triangular bands: [[yStagePx, [r,g,b]], ...]. Sampled down the
 * lavender at x 20-100 stage on fin2 f0301 (t=29.5), the ground is not three
 * soft stripes: it holds a flat pale (186,182,239) from the top to y=220, drops
 * over ~30px to (137,130,238) and holds that to y=627, then rises back to
 * (188,179,232) at the bottom edge. A triangular band cannot hold a 220px
 * plateau, which is why the guessed bands read as a different picture.
 * `driftPxPerSec` slides the whole ramp. Omitted -> the old bands path, exactly.
 */
function profileCss(profile, drift, t) {
  const dy = (drift ?? 0) * t;
  return "linear-gradient(180deg, " +
    profile.map(([y, c]) => `${rgb(c)} ${(y + dy).toFixed(1)}px`).join(", ") + ")";
}

function bandsCss(base, bandColour, bandsCfg, t) {
  // Each band: soft horizontal stripe, centre drifting slowly. Deterministic.
  const stops = [];
  for (const b of bandsCfg) {
    const y = ((b.y + (b.driftPxPerSec ?? 0) * t) % 900 + 900) % 900 - 90; // wrap within a margin
    stops.push({ y, h: b.h, a: b.alpha ?? 0.35 });
  }
  stops.sort((a, b) => a.y - b.y);
  const layers = stops.map((st) =>
    `linear-gradient(180deg, rgba(0,0,0,0) ${(st.y - st.h / 2).toFixed(1)}px, ` +
    `rgba(${bandColour[0]},${bandColour[1]},${bandColour[2]},${st.a}) ${st.y.toFixed(1)}px, ` +
    `rgba(0,0,0,0) ${(st.y + st.h / 2).toFixed(1)}px)`);
  return layers.join(", ") + `, linear-gradient(180deg, ${rgb(base)}, ${rgb(base)})`;
}

const GRAIN = // static turbulence tile, tiled over the frame at low alpha
  "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.7 0.7 0.7 0 0'/></filter>` +
    // `#n`, not `%23n`: the whole string goes through encodeURIComponent below,
    // so a pre-escaped %23 comes out as %2523 and the browser parses a filter
    // reference to `%23n`, which resolves to nothing. Chromium then draws the
    // rect UNFILTERED — i.e. a solid BLACK tile — and the "grain" became a flat
    // 5% black wash over the whole frame (measured: the white panel rendered
    // 242,242,242 where fin2 has 254-255).
    `<rect width='240' height='240' filter='url(#n)'/></svg>`);

// Dark counterpart (different seed): the reference's grain is BIDIRECTIONAL
// (+/-25 per channel where the white-alpha layer above can only lighten). This
// layer is drawn UNDER the panels, so the flat white panel stays the clean
// 254-255 the reference shows while the lavender gets both polarities.
const GRAIN_DARK =
  "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>` +
    `<filter id='d'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='23' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.7 0.7 0.7 0 0'/></filter>` +
    `<rect width='240' height='240' filter='url(#d)'/></svg>`);

function Painterly({ palette }) {
  // A soft landscape approximation: vertical field gradient + a few big
  // blurred blobs (pale sky left, teal right, olive foreground). Measured
  // stops off the reference; honest caveat: flat gradient art, not a painting.
  const p = palette ?? {
    sky: [200, 216, 208], skyPale: [242, 249, 231], teal: [140, 168, 172],
    field: [166, 190, 184], olive: [146, 152, 128], dark: [98, 117, 111],
  };
  // `stops` (optional) replaces the 5-stop default with a MEASURED vertical
  // profile: [[percent, [r,g,b]], ...]. Sampled on fin2 f0301 (t=29.5) in the
  // panel's own columns (x 975-1030 and 1830-1900), the landscape is not a
  // smooth 5-stop ramp — it holds a grey-green sky to ~66%, drops through a
  // dark horizon band at ~73%, flashes a bright yellow-green field edge at
  // ~77% and settles into olive. Omitting `stops` keeps the old ramp exactly.
  const ramp = p.stops
    ? p.stops.map(([pc, c]) => `${rgb(c)} ${pc}%`).join(", ")
    : `${rgb(p.sky)} 0%, ${rgb(p.field)} 42%, ${rgb(p.field)} 62%, ${rgb(p.olive)} 82%, ${rgb(p.dark)} 100%`;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(180deg, ${ramp})`,
      }} />
      {(p.blobs ?? [
        { left: "-12%", top: "-8%", width: "55%", height: "38%", colour: p.skyPale, blur: 38, opacity: 0.85 },
        { right: "-10%", top: "-6%", width: "48%", height: "40%", colour: p.teal, blur: 44, opacity: 0.7 },
        { left: "8%", top: "40%", width: "70%", height: "18%", colour: p.skyPale, blur: 30, opacity: 0.45 },
        { left: "-6%", bottom: "-10%", width: "60%", height: "30%", colour: p.dark, blur: 36, opacity: 0.6 },
      ]).map((b, i) => (
        <div key={i} style={{
          position: "absolute", left: b.left, right: b.right, top: b.top, bottom: b.bottom,
          width: b.width, height: b.height, background: rgb(b.colour),
          filter: `blur(${b.blur ?? 36}px)`, opacity: b.opacity ?? 0.6, borderRadius: "50%",
        }} />
      ))}
    </div>
  );
}

export function FirGround({ t, from, to, cfg }) {
  if (t < from || t > to) return null;
  const base = cfg.base ?? [134, 127, 232];
  const bandColour = cfg.bandColour ?? [201, 196, 250];
  const bands = cfg.bands ?? [
    { y: 90, h: 210, alpha: 0.5, driftPxPerSec: 7 },
    { y: 420, h: 260, alpha: 0.34, driftPxPerSec: 5 },
    { y: 660, h: 200, alpha: 0.42, driftPxPerSec: 8.5 },
  ];
  const panels = (cfg.panels ?? []).map((p) => {
    const fromS = s(p.fromMs ?? 0) + from, toS = p.toMs != null ? s(p.toMs) + from : to;
    if (t < fromS || t > toS) return null;
    const st = kv(absKeys((cfg.startMs ?? 0), p.edgeKeys ?? []), t, { x: 1280 });
    const x = st.x;
    if (x >= 1279) return null;
    return (
      <div key={p.id ?? p.type} style={{ position: "absolute", left: x, top: 0, width: 1280 - x, height: 720, overflow: "hidden" }}>
        {p.type === "painterly"
          // anchor "right" (default) keeps the art pinned to the frame edge, so a
          // rising left edge WIPES it away. anchor "left" pins the art to the
          // moving edge, so it is PUSHED off — which is what the reference does at
          // 30.81-31.32 (frame texture cross-correlates at +33px when the edge has
          // moved 27px, r=0.92; a wipe would correlate at 0).
          ? <div style={{ position: "absolute", ...(p.anchor === "left" ? { left: 0 } : { right: 0 }), top: 0, width: 646, height: 720 }}><Painterly palette={p.palette} /></div>
          : <div style={{ position: "absolute", inset: 0, background: rgb(p.colour ?? [255, 255, 255]) }} />}
      </div>
    );
  });
  const borders = (cfg.borders ?? []).map((b, i) => {
    const inS = from + s(b.inMs), outS = from + s(b.outMs);
    // Measured (fin2 59.0-62.1s): the platform-highlight borders do NOT pop —
    // each one ramps its opacity LINEARLY over exactly 18 frames @60fps (300ms)
    // and its stroke geometry is constant the whole way (the full 27px width is
    // already there at alpha 0.48), so this is an opacity fade, not a wipe or a
    // grow. `fadeInMs`/`fadeOutMs` default to 0, which is the instant on/off
    // step this used to do, byte for byte.
    const fi = s(b.fadeInMs ?? 0), fo = s(b.fadeOutMs ?? 0);
    const aIn = fi > 0 ? clamp01((t - inS) / fi) : (t >= inS ? 1 : 0);
    const aOut = fo > 0 ? 1 - clamp01((t - outS) / fo) : (t > outS ? 0 : 1);
    const a = aIn * aOut;
    if (a <= 0.004) return null;
    const th = b.thickness ?? 16.7, inset = b.inset ?? 2.7;
    const [x0, y0, x1, y1] = b.rect;
    return (
      <div key={i} style={{
        position: "absolute", left: x0 + inset, top: y0 + inset,
        width: x1 - x0 - inset * 2, height: y1 - y0 - inset * 2,
        border: `${th}px solid ${rgb(b.colour)}`, boxSizing: "border-box",
        borderRadius: b.radius ?? 2, opacity: a,
      }} />
    );
  });
  // `profileFadeX` {x0, x1, minAlpha} (optional): the measured `profile` is the
  // ground's LEFT-EDGE column only — sampled against fin2 at x560-600 stage,
  // the pale top plateau and pale bottom band decay toward the right (ref
  // ~[140,148,238] at top-right where the left edge reads 185) while the dark
  // mid rows hold. So the profile layer sits over a flat `base` fill and fades
  // horizontally: mask alpha 1 at x0 -> minAlpha at x1, held to the right edge.
  // Omitted -> the single full-strength profile layer, byte for byte.
  const fadeX = cfg.profile && cfg.profileFadeX ? cfg.profileFadeX : null;
  const fadeMask = fadeX
    ? `linear-gradient(90deg, rgba(0,0,0,1) ${fadeX.x0 ?? 0}px, rgba(0,0,0,${fadeX.minAlpha ?? 0.25}) ${fadeX.x1 ?? 620}px)`
    : null;
  const bgCss = cfg.profile
    ? profileCss(cfg.profile, cfg.profileDriftPxPerSec, t - from)
    : bandsCss(base, bandColour, bands, t - from);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {fadeX && <div style={{ position: "absolute", inset: 0, background: rgb(base) }} />}
      <div style={{
        position: "absolute", inset: 0, background: bgCss,
        ...(fadeMask ? { maskImage: fadeMask, WebkitMaskImage: fadeMask } : {}),
      }} />
      {(cfg.grainDarkAlpha ?? 0) > 0 && <div style={{
        position: "absolute", inset: 0, backgroundImage: `url("${GRAIN_DARK}")`,
        backgroundRepeat: "repeat", opacity: cfg.grainDarkAlpha, pointerEvents: "none",
      }} />}
      {panels}
      <div style={{
        position: "absolute", inset: 0, backgroundImage: `url("${GRAIN}")`,
        backgroundRepeat: "repeat", opacity: cfg.grainAlpha ?? 0.05, pointerEvents: "none",
      }} />
      {borders}
    </div>
  );
}
