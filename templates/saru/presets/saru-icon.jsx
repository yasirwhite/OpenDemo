/**
 * saru-icon.jsx — the Saru app icon as a stage element.
 *
 * A near-black rounded square carrying the brand's lowercase "s" in a bold
 * geometric sans. This is the one piece of Saru brand furniture no fir/plum
 * preset can draw: fir's `markTile` is hard-wired to the Intercom three-bar
 * face, plum's `AgentMark` to a ringed avatar, and neither takes a letterform.
 *
 * Deliberately narrow: ONE tile, positioned by centre, with the same sparse-key
 * channel set the fir flow layer uses (x / y / scale / opacity) so an icon can
 * pop in, pulse and sit inside a flow diagram on the same clock as the emoji
 * nodes around it. Node LABELS are not drawn here — the flow layer already owns
 * those, and keeping them in one place is what makes three labels share a
 * baseline. Pure function of t.
 */
import React from "react";
import { clamp01, lerp, easeByName, rgb } from "../../../src/lib/textcards/src/easing.js";

export const s = (ms) => ms / 1000;

/**
 * Sparse-key interpolator: keys [{t, ...channels, ease, pow}]; omitted channels
 * inherit the previous key, so a hold is two keys with nothing changed, and
 * `ease` shapes the segment INTO that key. Same contract as the fir layer's —
 * copied rather than imported so the saru template stands on its own.
 */
export function kv(keys, t, defaults = {}) {
  if (!keys || !keys.length) return { ...defaults };
  const filled = [];
  let acc = { ...defaults, ...keys[0] };
  for (const k of keys) { acc = { ...acc, ...k }; filled.push({ ...acc }); }
  if (t <= filled[0].t) return filled[0];
  for (let i = 1; i < filled.length; i++) {
    if (t <= filled[i].t) {
      const a = filled[i - 1], b = filled[i];
      const p = easeByName(b.ease, b.pow, easeByName("linear"))(clamp01((t - a.t) / Math.max(1e-6, b.t - a.t)));
      const out = { ...b };
      for (const ch of Object.keys(b)) {
        if (ch === "t" || ch === "ease" || ch === "pow") continue;
        if (typeof b[ch] === "number" && typeof a[ch] === "number") out[ch] = lerp(a[ch], b[ch], p);
      }
      return out;
    }
  }
  return filled[filled.length - 1];
}

/** Map config keys [{atMs,...}] to absolute-seconds keys [{t,...}]. */
export const absKeys = (startMs, keys) =>
  (keys ?? []).map((k) => { const { atMs, ...rest } = k; return { t: s(startMs + (atMs ?? 0)), ...rest }; });

/**
 * The brand's geometric stack. Century Gothic is the true geometric of the
 * three and is what the film renders with on this machine; the rest are
 * fallbacks so the letterform degrades to a plain sans rather than to a serif.
 */
export const SARU_FONT = `"Century Gothic","Futura","Segoe UI",system-ui,sans-serif`;

/**
 * The tile itself, so other saru scenes can drop the icon into their own
 * layouts (a header avatar, an endcard lockup) without going through a scene.
 * `glyph` is the cap size as a fraction of the tile, `dy` an optical nudge —
 * a lowercase "s" sits on the x-height and centres a shade low on its box.
 */
export function SaruMark({
  size = 150, bg = [13, 13, 16], fg = [255, 255, 255], radius = 0.235,
  letter = "s", font = SARU_FONT, weight = 700, glyph = 0.62, dx = 0, dy = 0,
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * radius, background: rgb(bg),
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    }}>
      <div style={{
        fontFamily: font, fontSize: size * glyph, fontWeight: weight, lineHeight: 1,
        color: rgb(fg), letterSpacing: "-0.02em",
        transform: `translate(${(dx * size).toFixed(2)}px, ${(dy * size).toFixed(2)}px)`,
      }}>{letter}</div>
    </div>
  );
}

export function SaruIcon({ t, from, to, cfg }) {
  if (t < from || t > to) return null;
  const inS = cfg.inMs != null ? from + s(cfg.inMs) : null;
  const outS = cfg.outMs != null ? from + s(cfg.outMs) : null;
  let o = 1;
  if (inS != null) o *= clamp01((t - inS) / s(cfg.inFadeMs ?? 220));
  if (outS != null) o *= 1 - clamp01((t - outS) / s(cfg.outFadeMs ?? 260));
  if (o <= 0.004) return null;

  const st = kv(absKeys(cfg.startMs ?? 0, cfg.keys ?? []), t,
    { x: cfg.x ?? 640, y: cfg.y ?? 360, scale: 1, opacity: 1 });
  const O = o * (st.opacity ?? 1);
  if (O <= 0.004) return null;

  // Scale about the tile's CENTRE, so a pulse grows the icon out of its resting
  // position in every direction and the node it sits on never shifts.
  const base = cfg.size ?? 150;
  const size = base * (st.scale ?? 1);
  return (
    <div style={{ position: "absolute", left: st.x - size / 2, top: st.y - size / 2, opacity: O }}>
      <SaruMark
        size={size} bg={cfg.bg} fg={cfg.fg} radius={cfg.radius}
        letter={cfg.letter} font={cfg.font} weight={cfg.weight}
        glyph={cfg.glyph} dx={cfg.dx} dy={cfg.dy}
      />
    </div>
  );
}
