/**
 * fir-emoji-flow.jsx — the persistent emoji flow-diagram layer.
 *
 * One scene owns the diagram from the split (17.4s) to the cut-out (62.25s):
 * emoji nodes, the agent mark tile (with animated mouth + a bottom-anchored
 * pulse), a routing tile, labels, a growing connector, a growing bold arrow,
 * dashed harness paths, a bold elbow pick-arrow, and a team of person emojis
 * that crossfade identities and later spread from a 2x2 grid to a column.
 *
 * Elements are declarative in the config; every kind interpolates sparse keys
 * (kv), so a hold is two keys with nothing changed. Pure function of t.
 */
import React from "react";
import { clamp01, lerp, rgb, easeByName } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";
import { s, kv, absKeys, Mark, RouteTile } from "./fir-shared.jsx";

const EMOJI_FONT = `"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;

function opacityAt(el, from, t) {
  const inS = el.inMs != null ? from + s(el.inMs) : null;
  const outS = el.outMs != null ? from + s(el.outMs) : null;
  let o = 1;
  if (inS != null) o *= clamp01((t - inS) / s(el.inFadeMs ?? 250));
  if (outS != null) o *= 1 - clamp01((t - outS) / s(el.outFadeMs ?? 300));
  return o;
}

function EmojiGlyph({ char, size }) {
  return (
    <div style={{
      fontSize: size * 0.86, lineHeight: 1, fontFamily: EMOJI_FONT,
      width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center",
    }}>{char}</div>
  );
}

/**
 * Outline of an elbow arrow: a bar of `th` rising (or falling) from (x,y) to
 * the run centreline `yTo`, turning through centreline radius `R`, running
 * right to `tip`, ending in a head `headW` long and `headH` tall.
 *
 * ONE path serves both skins the reference uses at 53-59s: the picked route is
 * this path FILLED in blue, the three unpicked routes are the SAME path STROKED
 * with a thin dashed grey. Measured off fin2 f108 (t=54.98): body 31px thick,
 * head 59x49, tip x1559, all four routes leaving the routing tile at x745.5 —
 * so the three ghosts' outlines coincide along the riser and read as one
 * bracket, which is exactly what the frame shows.
 */
function elbowOutline({ x, y, yTo, tip, th, headW, headH, R }) {
  const h = th / 2;
  const up = yTo < y;
  const sgn = up ? -1 : 1;
  const Rr = Math.max(0, Math.min(R, Math.abs(yTo - y) - h, tip - x - h));
  const outerY = yTo + sgn * h;        // far side of the run (top when rising)
  const innerY = yTo - sgn * h;
  const turnY = yTo - sgn * Rr;        // where the straight riser ends
  const rOut = Rr + h, rIn = Math.max(0, Rr - h);
  const back = Math.max(x + h, tip - headW);
  const hh = headH / 2;
  const d = [`M ${x - h} ${y}`, `L ${x - h} ${turnY}`];
  if (rOut > 0.5) d.push(`A ${rOut} ${rOut} 0 0 ${up ? 1 : 0} ${x + Rr} ${outerY}`);
  else d.push(`L ${x - h} ${outerY}`);
  d.push(`L ${back} ${outerY}`, `L ${back} ${yTo - hh}`, `L ${tip} ${yTo}`,
    `L ${back} ${yTo + hh}`, `L ${back} ${innerY}`);
  if (rIn > 0.5) d.push(`L ${x + Rr} ${innerY}`, `A ${rIn} ${rIn} 0 0 ${up ? 0 : 1} ${x + h} ${turnY}`);
  else d.push(`L ${x + h} ${innerY}`);
  d.push(`L ${x + h} ${y}`, "Z");
  return d.join(" ");
}

export function FirEmojiFlow({ t, from, to, cfg }) {
  if (t < from || t > to) return null;
  const els = (cfg.elements ?? []).map((el, i) => {
    const o = opacityAt(el, from, t);
    if (o <= 0.004) return null;
    const st = kv(absKeys(cfg.startMs, el.keys ?? []), t, { x: el.x ?? 0, y: el.y ?? 0, scale: 1, opacity: 1 });
    const O = o * (st.opacity ?? 1);
    if (O <= 0.004) return null;

    if (el.kind === "emoji") {
      const size = (el.size ?? 140) * (st.scale ?? 1);
      return (
        <div key={i} style={{ position: "absolute", left: st.x - size / 2, top: st.y - size / 2, opacity: O }}>
          <EmojiGlyph char={el.char} size={size} />
        </div>
      );
    }
    if (el.kind === "markTile") {
      const base = el.size ?? 150.7;
      // anchor "bottom" (default) scales about the tile's bottom edge.
      // anchor "centre" scales about its centre — measured behaviour of the
      // handover-scene pulse (38.00-39.40s): the tile box goes 229->261px@1920
      // while its centre stays on 633,509 to the pixel, so the bottom edge
      // moves DOWN as much as the top moves up.
      const sc = st.scale ?? 1;
      const size = base * sc;
      const mouthKeys = el.mouthKeys ?? [];
      let mouth = el.mouth ?? "grin";
      for (const mk of mouthKeys) { if (t >= from + s(mk.atMs)) mouth = mk.state; }
      const top = el.anchor === "centre" ? st.y - size / 2 : (st.y + base / 2) - size;
      return (
        <div key={i} style={{ position: "absolute", left: st.x - size / 2, top, opacity: O }}>
          <Mark size={size} bg={el.bg ?? [17, 17, 17]} fg={el.fg ?? [255, 255, 255]} radius={el.radius ?? 0.24}
            mouth={mouth} geom={el.glyph ?? null} />
        </div>
      );
    }
    if (el.kind === "routeTile") {
      const size = (el.size ?? 114.7) * (st.scale ?? 1);
      // `reveal` wipes the tile open left-to-right (0..1) behind a SOFT edge.
      // Measured 49.70-49.82: the tile is at full geometry by 49.75 but still
      // translucent, and the ramp reaching full density sweeps left-to-right
      // (x700 hits 218 at 49.767 while x840 is still 187) — so it is a soft
      // wipe plus a global fade, not a hard clip. The blue connector's growth
      // runs straight on into it, and the pair reads as ONE left-to-right zip
      // out of the mark tile.
      const rev = st.reveal != null ? clamp01(st.reveal) : 1;
      const soft = el.revealSoft ?? 45;
      const front = rev * (size + soft);
      const mask = rev >= 1 ? "none"
        : `linear-gradient(90deg, #000 0px, #000 ${Math.max(0, front - soft)}px, transparent ${front}px)`;
      return (
        <div key={i} style={{
          position: "absolute", left: st.x - size / 2, top: st.y - size / 2,
          width: size, height: size, opacity: O,
          maskImage: mask, WebkitMaskImage: mask,
        }}>
          <RouteTile size={size} bg={el.bg ?? [217, 217, 216]} fg={el.fg ?? [26, 26, 26]} />
        </div>
      );
    }
    if (el.kind === "label") {
      return (
        <div key={i} style={{
          position: "absolute", left: st.x - 100, top: st.y, width: 200, textAlign: "center",
          fontFamily: FONT, fontSize: el.size ?? 15.5, fontWeight: 640, color: rgb(el.colour ?? [24, 24, 24]),
          opacity: O,
        }}>{el.text}</div>
      );
    }
    if (el.kind === "line") {
      // horizontal connector: from x0 to xKeys-driven tip, centred on y
      const tip = st.tip ?? el.x1;
      const th = el.thickness ?? 17.3;
      const w = Math.max(0, tip - el.x0);
      return (
        <div key={i} style={{
          position: "absolute", left: el.x0, top: st.y - th / 2, width: w, height: th,
          background: rgb(el.colour ?? [6, 72, 246]), opacity: O,
        }} />
      );
    }
    if (el.kind === "arrow") {
      // horizontal arrow growing to the right, soft leading edge while
      // growing, triangular head fading in as it settles.
      //
      // MEASURED (fin2 31.086-31.480, red channel along the arrow's centreline
      // on full-decode frames): the handover arrow does NOT extend. Its whole
      // geometry x748->1305@1920 is there from the start and a LINEAR ALPHA
      // RAMP 272px@1920 (181 stage) long sweeps across it left to right at a
      // constant 1403 stage px/s — at 31.20 the arrow is already 0.89 opaque at
      // the tile edge and fades to nothing 260px later. `maxTip` pins the true
      // end so `tip` can carry the ramp's alpha-0 edge on past it, and `soft`
      // sets the ramp length. With neither field this is the old growing tip,
      // unchanged.
      const th = el.thickness ?? 17.3;
      const tip = st.tip ?? el.x1;
      const headW = el.headW ?? 24, headH = el.headH ?? 34;
      const col = rgb(el.colour ?? [6, 72, 246]);
      const c0 = el.colour ?? [6, 72, 246];
      const clear = `rgba(${c0[0]},${c0[1]},${c0[2]},0)`;
      const swept = el.maxTip != null || el.soft != null;
      const soft = el.soft ?? 90;
      const end = el.maxTip != null ? el.maxTip : tip;
      const bodyW = Math.max(0, Math.min(tip, end) - el.x0 - headW * (st.head ?? 0));
      // ramp anchored on the sweep edge when swept, on the body end otherwise
      // (the latter reproduces the previous growing-tip render exactly).
      const B0 = swept ? tip - el.x0 : bodyW;
      const A = Math.max(0, B0 - soft), B = Math.max(A + 0.01, B0);
      const fill = (st.head ?? 0) >= 1 && !swept
        ? col
        : `linear-gradient(90deg, ${col} 0px, ${col} ${A}px, ${clear} ${B}px)`;
      return (
        <div key={i} style={{ position: "absolute", left: 0, top: 0, opacity: O }}>
          <div style={{
            position: "absolute", left: el.x0, top: st.y - th / 2, width: bodyW, height: th,
            background: fill,
          }} />
          <svg style={{ position: "absolute", left: el.x0 + bodyW - 1, top: st.y - headH / 2, opacity: st.head ?? 0 }}
            width={headW + 2} height={headH} viewBox={`0 0 ${headW + 2} ${headH}`}>
            <path d={`M0,0 L${headW},${headH / 2} L0,${headH} Z`} fill={col} />
          </svg>
        </div>
      );
    }
    if (el.kind === "elbow") {
      // Routing arrow: rises (or falls) from (x0,y0) to the run centreline
      // yTop, turns through cornerR and runs right to `tip`, ending in a head.
      // mode "fill" = the picked route, solid; mode "ghost" = an unpicked
      // route, the SAME outline stroked thin + dashed (fin2 53.0-59.2s).
      const th = el.thickness ?? 15;
      const col = rgb(el.colour ?? [6, 72, 246]);
      const yTop = el.yTop, x0 = el.x0, y0 = el.y0;
      const ghost = el.mode === "ghost";
      const rise = clamp01(st.rise ?? (ghost ? 1 : 0));
      const headO = clamp01(st.head ?? (ghost ? 1 : 0));
      const tip = st.tip ?? (ghost ? el.x1 : x0);
      // head grows OUT of the bar's end: while headO<1 it is only as tall as
      // the bar and has no length, so the arrow reads as a plain growing bar
      // (measured: fin2's pick-arrow has no head until 53.61, tip lands 53.64)
      const headW = (el.headW ?? 22) * headO;
      const headH = lerp(th, el.headH ?? 30, headO);
      const R = el.cornerR ?? 14;
      if (rise < 1) {
        // still climbing out of the tile: a plain bar, no run yet. Its leading
        // edge travels to the RUN'S OUTER EDGE (yTop -/+ th/2), not to yTop, so
        // the last rise frame and the first elbow frame have the same silhouette.
        const yEnd = lerp(y0, yTop + (yTop < y0 ? -th / 2 : th / 2), rise);
        const top = Math.min(y0, yEnd), h = Math.abs(yEnd - y0);
        return (
          <div key={i} style={{
            position: "absolute", left: x0 - th / 2, top, width: th, height: h,
            background: ghost ? "none" : col,
            border: ghost ? `${el.ghostWidth ?? 1.4}px dashed ${rgb(el.ghostColour ?? [180, 180, 180])}` : "none",
            boxSizing: "border-box", opacity: O,
          }} />
        );
      }
      const d = elbowOutline({ x: x0, y: y0, yTo: yTop, tip: Math.max(tip, x0 + th), th, headW, headH, R });
      const gid = `firelb${i}`;
      // soft leading edge while the bar is still growing
      const soft = el.soft ?? 40;
      const fadeFrom = Math.max(0, (tip - soft - x0) / Math.max(1e-6, tip - x0));
      return (
        <svg key={i} style={{ position: "absolute", left: 0, top: 0, opacity: O }} width={1280} height={720} viewBox="0 0 1280 720">
          {!ghost && headO < 1 && (
            <defs>
              <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={x0} y1="0" x2={tip} y2="0">
                <stop offset={fadeFrom} stopColor={col} stopOpacity="1" />
                <stop offset="1" stopColor={col} stopOpacity={headO} />
              </linearGradient>
            </defs>
          )}
          <path d={d}
            fill={ghost ? "none" : (headO < 1 ? `url(#${gid})` : col)}
            stroke={ghost ? rgb(el.ghostColour ?? [180, 180, 180]) : "none"}
            strokeWidth={ghost ? (el.ghostWidth ?? 1.4) : 0}
            strokeDasharray={ghost ? (el.dash ?? "2 2") : undefined} />
        </svg>
      );
    }
    if (el.kind === "dash") {
      // dashed harness path: polyline through points
      const pts = el.points ?? [];
      const d = pts.map((p, k) => `${k ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
      return (
        <svg key={i} style={{ position: "absolute", left: 0, top: 0, opacity: O }} width={1280} height={720} viewBox="0 0 1280 720">
          <path d={d} fill="none" stroke={rgb(el.colour ?? [168, 166, 246])} strokeWidth={el.thickness ?? 5.3}
            strokeDasharray={el.dash ?? "9 8"} strokeLinejoin="round" />
        </svg>
      );
    }
    if (el.kind === "person") {
      // one team member: emoji identity crossfades through charSets on setKeys
      const size = (el.size ?? 67) * (st.scale ?? 1);
      const sets = el.chars ?? ["🧑‍💻"];
      let idx = 0, xf = 1, prevIdx = 0;
      for (const sk of (el.setKeys ?? [])) {
        const atS = from + s(sk.atMs);
        if (t >= atS) { prevIdx = idx; idx = sk.idx; xf = clamp01((t - atS) / s(sk.fadeMs ?? 400)); }
      }
      return (
        <div key={i} style={{ position: "absolute", left: st.x - size / 2, top: st.y - size / 2, opacity: O }}>
          {xf < 1 && (
            <div style={{ position: "absolute", inset: 0, opacity: 1 - xf }}>
              <EmojiGlyph char={sets[prevIdx]} size={size} />
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, opacity: xf }}>
            <EmojiGlyph char={sets[idx]} size={size} />
          </div>
        </div>
      );
    }
    return null;
  });
  return <div style={{ position: "absolute", inset: 0 }}>{els}</div>;
}
