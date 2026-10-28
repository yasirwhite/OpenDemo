/**
 * fir-shared.jsx — helpers shared by the fir template's presets.
 *
 * Everything is a pure function of t (seconds, absolute film clock), same
 * contract as every other textcards preset. Design space is 1280x720.
 */
import React from "react";
import { clamp01, lerp, easeByName, rgb } from "../../../src/lib/textcards/src/easing.js";

export const s = (ms) => ms / 1000;

/**
 * Sparse-key interpolator (media-window style): keys [{t, ...channels, ease, pow}],
 * omitted channels inherit the previous key; `ease` shapes the segment INTO
 * that key. Returns the interpolated channel object at time t.
 */
export function kv(keys, t, defaults = {}) {
  if (!keys || !keys.length) return { ...defaults };
  // fill sparse channels forward
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

/** Fade helper: 0 before at, 1 after at+dur (linear). */
export const fadeIn = (t, at, dur = 0.3) => clamp01((t - at) / Math.max(1e-6, dur));

/**
 * The film's brand mark: a rounded tile with a glyph face. Two skins:
 *  - tile: dark tile, light glyph (the agent icon / header avatar)
 *  - card: light tile, dark glyph (the on-black opener mark)
 * Glyph: `bars` vertical bars (hand) + optional smile. The smile MOUTH has
 * states for the flow scenes: 'grin' (closed arc), 'open' (big open arch),
 * 'small' (short open), 'none'.
 * All drawn as SVG so it scales crisply; geometry is fractions of size.
 */
/**
 * Measured mark geometry (scene 4, full-decode frame 32.0s; tile 229px@1920,
 * origin 518.5,394.5). All values are fractions of the tile size:
 *   radius .196 | bar w .083 pitch .181 | outer bars top .194 h .332
 *   middle bar  top .138 h .424 | mouth = flat-top half-ELLIPSE
 *   centred (.502,.670) rx .194 ry .157
 * Passed as `geom` it replaces the hand-guessed default drawing. Omitting
 * `geom` keeps the previous output byte-for-byte, so no other fir scene moves.
 */
export const MARK_GEOM_MEASURED = {
  radius: 0.196, barW: 0.083, barPitch: 0.181, barTop: 0.194, barH: 0.332,
  midTop: 0.138, midH: 0.424, mouthCx: 0.502, mouthCy: 0.670, mouthRx: 0.194, mouthRy: 0.157,
};

export function Mark({ size = 80, bg = [17, 17, 17], fg = [255, 255, 255], radius = 0.27,
  bars = 3, mouth = "grin", mouthOpen = 1, geom = null, face = "grin", thinkT = null, style = {} }) {
  // face "think": the loading glyph the reference shows on the "Thinking..."
  // row (scene 2, 5.83-6.45s) — three vertically centred round-capped bars of
  // decreasing height and width, no mouth. Measured off decode/items60/f109.
  //
  // `thinkT` (seconds since the row appeared) makes it the ANIMATED wave the
  // reference actually plays. Traced per-bar on scene 3's row (fin2 19.48-20.42,
  // tile 61px@1920): all three bars are the SAME width (0.087S) on the same
  // 0.188S pitch as the logo bars, vertically centred at 0.50S, and their
  // heights swing 0.081S <-> 0.443S on a ~0.94s cycle with the RIGHT bar leading
  // the left by 0.13s. A single static frame of that (which is what the
  // decreasing ramp below is) reads as a fixed icon, not a loader.
  if (face === "think" && thinkT != null) {
    // Traced per bar (heights every 2 frames, 19.48-20.42): the cycle is NOT a
    // sine — it holds at both extremes. Bar 1 falls 19.55->19.82, sits at the
    // minimum to 20.03, rises to 20.28, then holds; T ~= 0.94s split
    // 0.287 fall / 0.223 low / 0.266 rise / 0.223 high, and each bar to the
    // RIGHT runs 0.065s ahead of the one to its left.
    const S = size, MIN = 0.081, MAX = 0.443, T = 0.94, LEAD = 0.065;
    const bw = S * 0.087, pitch = S * 0.188, cy = S * 0.50;
    const ss = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
    const bs = [0, 1, 2].map((i) => {
      const ph = (((thinkT + i * LEAD) / T) % 1 + 1) % 1;
      const f = ph < 0.287 ? 1 - ss(ph / 0.287)
        : ph < 0.510 ? 0
          : ph < 0.777 ? ss((ph - 0.510) / 0.267)
            : 1;
      const h = S * (MIN + (MAX - MIN) * f);
      const cx = S * 0.5 + (i - 1) * pitch;
      return <rect key={i} x={cx - bw / 2} y={cy - h / 2} width={bw} height={h} rx={bw / 2} fill={rgb(fg)} />;
    });
    return (
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display: "block", ...style }}>
        <rect x="0" y="0" width={S} height={S} rx={S * ((geom && geom.radius) ?? radius)} fill={rgb(bg)} />
        {bs}
      </svg>
    );
  }
  if (face === "think") {
    const S = size, hs = [0.34, 0.16, 0.075], ws = [0.100, 0.078, 0.065], gap = S * 0.055;
    const total = ws.reduce((a, w) => a + w * S, 0) + gap * (ws.length - 1);
    let x = S * 0.47 - total / 2;
    const bs = ws.map((w, i) => {
      const el = (<rect key={i} x={x} y={S * 0.47 - (S * hs[i]) / 2} width={S * w} height={S * hs[i]}
        rx={(S * Math.min(w, hs[i])) / 2} fill={rgb(fg)} />);
      x += S * w + gap;
      return el;
    });
    return (
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display: "block", ...style }}>
        <rect x="0" y="0" width={S} height={S} rx={S * ((geom && geom.radius) ?? radius)} fill={rgb(bg)} />
        {bs}
      </svg>
    );
  }
  if (geom) return <MarkMeasured size={size} bg={bg} fg={fg} mouth={mouth} mouthOpen={mouthOpen} g={geom} style={style} />;
  const S = size, r = S * radius;
  const barW = S * 0.085, barGap = S * 0.075;
  const totalW = bars * barW + (bars - 1) * barGap;
  const barX0 = (S - totalW) / 2;
  const barTop = S * 0.20;
  const barH = [0.30, 0.38, 0.30]; // middle bar longer
  const els = [];
  for (let i = 0; i < bars; i++) {
    const h = S * (barH[Math.min(i, bars - 1 - i) === 0 ? 0 : 1] ?? 0.32);
    els.push(<rect key={"b" + i} x={barX0 + i * (barW + barGap)} y={barTop}
      width={barW} height={h} rx={barW / 2} fill={rgb(fg)} />);
  }
  // mouth
  if (mouth === "grin") {
    els.push(<path key="m" d={`M ${S * 0.28} ${S * 0.66} Q ${S * 0.5} ${S * (0.66 + 0.14 * mouthOpen)} ${S * 0.72} ${S * 0.66} L ${S * 0.72} ${S * 0.66} Q ${S * 0.5} ${S * (0.66 + 0.30 * mouthOpen)} ${S * 0.28} ${S * 0.66} Z`}
      fill={rgb(fg)} />);
  } else if (mouth === "open") {
    els.push(<path key="m" d={`M ${S * 0.30} ${S * 0.62} Q ${S * 0.5} ${S * 0.58} ${S * 0.70} ${S * 0.62} Q ${S * 0.70} ${S * 0.82} ${S * 0.5} ${S * 0.84} Q ${S * 0.30} ${S * 0.82} ${S * 0.30} ${S * 0.62} Z`}
      fill={rgb(fg)} />);
  } else if (mouth === "small") {
    els.push(<rect key="m" x={S * 0.38} y={S * 0.64} width={S * 0.24} height={S * 0.14} rx={S * 0.07} fill={rgb(fg)} />);
  }
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display: "block", ...style }}>
      <rect x0="0" y="0" width={S} height={S} rx={r} fill={rgb(bg)} />
      {els}
    </svg>
  );
}

/**
 * The mark drawn to the measured geometry above. Three round-capped bars (the
 * middle one longer at BOTH ends, which the guessed version got wrong) and a
 * flat-top half-ellipse mouth. `mouthOpen` scales the mouth's depth only, so a
 * talking pulse stays anchored on its top chord.
 */
function MarkMeasured({ size, bg, fg, mouth, mouthOpen = 1, g, style }) {
  const S = size, els = [];
  const bw = S * g.barW, pitch = S * g.barPitch;
  for (let i = 0; i < 3; i++) {
    const mid = i === 1;
    const cx = S * 0.5 + (i - 1) * pitch;
    const top = S * (mid ? g.midTop : g.barTop);
    const h = S * (mid ? g.midH : g.barH);
    els.push(<rect key={"b" + i} x={cx - bw / 2} y={top} width={bw} height={h} rx={bw / 2} fill={rgb(fg)} />);
  }
  if (mouth !== "none") {
    const cx = S * g.mouthCx, cy = S * g.mouthCy;
    const rx = S * g.mouthRx * (mouth === "small" ? 0.62 : 1);
    const ry = S * g.mouthRy * mouthOpen * (mouth === "open" ? 1.45 : 1);
    els.push(<path key="m" d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy} Z`} fill={rgb(fg)} />);
  }
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display: "block", ...style }}>
      <rect x="0" y="0" width={S} height={S} rx={S * g.radius} fill={rgb(bg)} />
      {els}
    </svg>
  );
}

/**
 * The routing glyph: a light-grey rounded tile carrying a DARK rounded square
 * with a white pill (the eye bar) and a white smile below it — the automation
 * "bot" mark, not a chat bubble. Measured off fin2 f108 (t=54.98), tile
 * [672,421,849,594]@1920, as fractions of the tile size:
 *   tile radius .218 | inner square .243,.249 .508x.502 r.124
 *   eye pill OUTLINE .356,.358 .288x.174, rx half, stroke .052 (a column scan
 *     at x770 reads light-dark-light across it, so it is a ring, not a slab)
 *   smile chord y .600 x .418-.576, control .672, stroke .058, round caps
 * Only the routing scene (49.7-59.2s) draws this, so the earlier chat-bubble
 * drawing had no other caller.
 */
export function RouteTile({ size = 115, bg = [217, 217, 216], fg = [26, 26, 26] }) {
  const S = size, pillH = S * 0.174, pw = S * 0.052;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display: "block" }}>
      <rect x="0" y="0" width={S} height={S} rx={S * 0.218} fill={rgb(bg)} />
      <rect x={S * 0.243} y={S * 0.249} width={S * 0.508} height={S * 0.502} rx={S * 0.124} fill={rgb(fg)} />
      <rect x={S * 0.356 + pw / 2} y={S * 0.358 + pw / 2} width={S * 0.288 - pw} height={pillH - pw}
        rx={(pillH - pw) / 2} fill="none" stroke={rgb(bg)} strokeWidth={pw} />
      <path d={`M ${S * 0.418} ${S * 0.600} Q ${S * 0.500} ${S * 0.672} ${S * 0.576} ${S * 0.600}`}
        fill="none" stroke={rgb(bg)} strokeWidth={S * 0.058} strokeLinecap="round" />
    </svg>
  );
}
