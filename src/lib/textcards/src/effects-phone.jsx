/**
 * effects-phone.jsx — a produced in-film phone UI: drawn device frame with a
 * styled chat thread inside (bubbles, streaming serif replies, tool-result
 * cards, a hand-drawn thinking mark, a composer that types on).
 *
 * Measured off the Anthropic "Claude mobile" launch film (July 2025): a cream
 * device on a warm beige set, serif product voice, sans user voice, salmon
 * marks. Geometry below is in the 1280x720 stage space; the film's 1920x1080
 * measurements were scaled by 2/3.
 *
 * Everything is a PURE function of t, like every other effect in this layer.
 * All cue times arrive here as ABSOLUTE seconds (the preset registry offsets
 * scene-relative ms cues by the scene start, same contract as RevealLine).
 */

import React from "react";
import { clamp01, at, lerp, easeOut, easeIn, expoOut, memReveal, backOut, rgb } from "./easing.js";
import { PhoneIntro } from "./effects-phone-intro.jsx";

const SANS = `"Segoe UI", "Inter", system-ui, -apple-system, sans-serif`;
const SERIF = `Georgia, "Iowan Old Style", "Times New Roman", serif`;

// Palette measured off the reference frames (see birch prep notes).
export const PHONE_C = {
  body: [239, 239, 229],    // device rim + user bubble
  screen: [250, 249, 245],  // app ground
  card: [255, 255, 255],
  ink: [23, 23, 19],
  inkMuted: [107, 106, 98], // quoted email body inside cards
  label: [57, 58, 53],      // tiny sender label
  placeholder: [138, 138, 138],
  divider: [236, 236, 232],
  salmon: [206, 111, 89],   // marks, send button, spinner
};

// ── tiny drawn glyphs ────────────────────────────────────────────────────────

/** Hand-drawn-ish asterisk / spinner mark. mode: "asterisk" | "burst" | "dots" */
function Mark({ size = 34, mode = "asterisk", rot = 0, colour = PHONE_C.salmon }) {
  const cx = size / 2, cy = size / 2, col = rgb(colour);
  const kids = [];
  if (mode === "asterisk") {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const jig = 1 + 0.14 * Math.sin(i * 2.7); // uneven spoke lengths: drawn, not set
      const r0 = size * 0.10, r1 = size * 0.46 * jig;
      kids.push(<line key={i}
        x1={cx + r0 * Math.cos(a)} y1={cy + r0 * Math.sin(a)}
        x2={cx + r1 * Math.cos(a)} y2={cy + r1 * Math.sin(a)}
        stroke={col} strokeWidth={size * 0.085} strokeLinecap="round" />);
    }
  } else if (mode === "burst") {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.1 * Math.sin(i * 3.1);
      const r0 = size * 0.28, r1 = size * 0.48 * (1 + 0.1 * Math.sin(i * 1.9));
      kids.push(<line key={i}
        x1={cx + r0 * Math.cos(a)} y1={cy + r0 * Math.sin(a)}
        x2={cx + r1 * Math.cos(a)} y2={cy + r1 * Math.sin(a)}
        stroke={col} strokeWidth={size * 0.07} strokeLinecap="round" />);
    }
  } else { // dots
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const r = size * 0.42;
      kids.push(<circle key={i} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)}
        r={size * 0.065} fill={col} />);
    }
  }
  return (
    <svg width={size} height={size} style={{ display: "block", transform: `rotate(${rot}deg)` }}>
      {kids}
    </svg>
  );
}

function CalendarIcon({ size = 17, colour = PHONE_C.ink }) {
  const col = rgb(colour);
  return (
    <svg width={size} height={size} viewBox="0 0 17 17" style={{ display: "block" }}>
      <rect x="1.5" y="3" width="14" height="12.5" rx="2.5" fill="none" stroke={col} strokeWidth="1.6" />
      <line x1="5" y1="1.2" x2="5" y2="4.4" stroke={col} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="1.2" x2="12" y2="4.4" stroke={col} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="1.5" y1="7" x2="15.5" y2="7" stroke={col} strokeWidth="1.4" />
    </svg>
  );
}

function EnvelopeIcon({ size = 17, colour = PHONE_C.ink }) {
  const col = rgb(colour);
  return (
    <svg width={size + 3} height={size} viewBox="0 0 20 17" style={{ display: "block" }}>
      <rect x="1.5" y="2.5" width="17" height="12" rx="2.2" fill="none" stroke={col} strokeWidth="1.6" />
      <polyline points="2.5,4 10,10 17.5,4" fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Drawn emphasis strokes radiating around a UI element — the film flashes
 *  these around "Send email". Grows over ~140ms, holds, fades by +560ms. */
function StrokeBurst({ t, atS, colour = PHONE_C.salmon }) {
  const g = easeOut(at(t, atS, 0.14));
  const fade = 1 - clamp01(at(t, atS + 0.38, 0.18));
  if (g <= 0.004 || fade <= 0.004) return null;
  const rays = [
    [180, 62, 100], [152, 55, 88], [128, 55, 88], [104, 55, 88], [82, 55, 88],
    [58, 55, 88], [34, 55, 88], [8, 62, 100], [242, 55, 84], [268, 55, 84], [294, 55, 84],
  ];
  return (
    <svg width="420" height="200" viewBox="-210 -100 420 200" style={{
      position: "absolute", left: "50%", top: "50%", marginLeft: -210, marginTop: -90,
      overflow: "visible", opacity: fade, pointerEvents: "none",
    }}>
      {rays.map(([ang, r0, r1], i) => {
        const a = (ang * Math.PI) / 180;
        const r2 = r0 + (r1 - r0) * g;
        return (
          <line key={i}
            x1={(Math.cos(a) * r0 * 1.9).toFixed(1)} y1={(-Math.sin(a) * r0 * 0.62).toFixed(1)}
            x2={(Math.cos(a) * r2 * 1.9).toFixed(1)} y2={(-Math.sin(a) * r2 * 0.62).toFixed(1)}
            stroke={rgb(colour)} strokeWidth={6} strokeLinecap="round" />
        );
      })}
    </svg>
  );
}

function Chevron({ dir = "left", size = 15, colour = PHONE_C.ink, sw = 2.2 }) {
  const p = dir === "left" ? "M10,2 L4,7.5 L10,13" : "M4,5 L7.5,10 L11,5";
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" style={{ display: "block" }}>
      <path d={p} fill="none" stroke={rgb(colour)} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NewChatIcon({ size = 26, colour = PHONE_C.label }) {
  const col = rgb(colour);
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" style={{ display: "block" }}>
      <path d="M13 3 a10 10 0 1 1 -7.6 3.5 L4 21.5 l4.6-1.6 A10 10 0 0 0 13 23"
        fill="none" stroke={col} strokeWidth="1.7" transform="rotate(-8 13 13)" />
      <line x1="13" y1="9.5" x2="13" y2="16.5" stroke={col} strokeWidth="1.7" strokeLinecap="round" />
      <line x1="9.5" y1="13" x2="16.5" y2="13" stroke={col} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

// Composer toolbar glyphs, deliberately simplified to read at 1280x720.
function ToolbarIcons({ left, ink }) {
  const col = rgb(ink);
  if (left) return (
    <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
      <svg width="22" height="22" viewBox="0 0 22 22">
        <line x1="11" y1="3.5" x2="11" y2="18.5" stroke={col} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="3.5" y1="11" x2="18.5" y2="11" stroke={col} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <svg width="22" height="22" viewBox="0 0 22 22">
        <line x1="4" y1="7.5" x2="18" y2="7.5" stroke={col} strokeWidth="1.7" strokeLinecap="round" />
        <line x1="4" y1="14.5" x2="18" y2="14.5" stroke={col} strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="8" cy="7.5" r="2.4" fill="#fff" stroke={col} strokeWidth="1.7" />
        <circle cx="14" cy="14.5" r="2.4" fill="#fff" stroke={col} strokeWidth="1.7" />
      </svg>
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="10" cy="10" r="7" fill="none" stroke={col} strokeWidth="1.6" />
        <line x1="15.2" y1="15.2" x2="20" y2="20" stroke={col} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M7.5 10 L10 7.5 L12.5 10 M10 7.8 L10 12.6" fill="none" stroke={col} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
  return (
    <svg width="22" height="22" viewBox="0 0 22 22">
      <rect x="8.2" y="3" width="5.6" height="10.5" rx="2.8" fill="none" stroke={col} strokeWidth="1.7" />
      <path d="M4.5 11 a6.5 6.5 0 0 0 13 0 M11 17.5 L11 20" fill="none" stroke={col} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

// ── flow items ───────────────────────────────────────────────────────────────

/** Words revealed left-to-right; unrevealed words are not laid out at all. */
function StreamText({ t, atS, streamS, text, style }) {
  if (t < atS) return null;
  const words = text.split(" ");
  const step = streamS > 0 ? streamS / words.length : 0;
  const shown = [];
  for (let i = 0; i < words.length; i++) {
    const wAt = atS + i * step;
    if (t < wAt) break;
    const o = clamp01(at(t, wAt, 0.14));
    shown.push(<span key={i} style={{ opacity: 0.25 + 0.75 * o }}>{words[i] + (i < words.length - 1 ? " " : "")}</span>);
  }
  if (!shown.length) return null;
  return <div style={style}>{shown}</div>;
}

function rowReveal(t, atS) {
  const k = memReveal(at(t, atS, 0.26));
  return { opacity: k, transform: `translateY(${(8 * (1 - k)).toFixed(2)}px)` };
}

function CardRow({ t, row, m, serifBody }) {
  if (t < row._atS) return null;
  const rv = rowReveal(t, row._atS);
  const C = PHONE_C;
  if (row.type === "cardHeader") return (
    <div style={{ ...rv }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 4px 14px" }}>
        {row.icon === "envelope" ? <EnvelopeIcon /> : <CalendarIcon />}
        <span style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, color: rgb(C.ink), letterSpacing: "0.01em" }}>{row.text}</span>
      </div>
      <div style={{ height: 1, background: rgb(C.divider), margin: "0 -18px" }} />
    </div>
  );
  if (row.type === "fieldLabel") return (
    <div style={{ ...rv, fontFamily: SANS, fontSize: 19, color: "rgb(112,112,112)", padding: "14px 4px 0" }}>{row.text}</div>
  );
  if (row.type === "title") return (
    <div style={{ ...rv, fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: rgb(C.ink), padding: "18px 4px 0" }}>{row.text}</div>
  );
  if (row.type === "body") return (
    <div style={{ ...rv, fontFamily: SERIF, fontSize: serifBody, lineHeight: 1.26, letterSpacing: "-0.012em", whiteSpace: "pre-line", color: rgb(row.muted ? C.inkMuted : C.ink), padding: "8px 4px 0" }}>{row.text}</div>
  );
  if (row.type === "bullet") return (
    <div style={{ ...rv, display: "flex", gap: 12, fontFamily: SERIF, fontSize: serifBody, lineHeight: 1.26, letterSpacing: "-0.012em", color: rgb(row.muted === false ? C.ink : C.inkMuted), padding: "3px 4px 0 14px" }}>
      <span style={{ fontSize: serifBody * 0.7, paddingTop: 3 }}>•</span><span>{row.text}</span>
    </div>
  );
  if (row.type === "kv") return (
    <div style={{ ...rv, fontFamily: SERIF, fontSize: serifBody, color: rgb(C.ink), padding: "16px 4px 0" }}>
      <span style={{ fontWeight: 700 }}>{row.k}</span>&nbsp;&nbsp;<span>{row.v}</span>
    </div>
  );
  if (row.type === "button") {
    const enabled = row._enableS == null || t >= row._enableS;
    const col = enabled ? C.ink : [175, 173, 165];
    return (
      <div style={{ ...rv, margin: "16px -18px 0" }}>
        <div style={{ height: 1, background: rgb(C.divider) }} />
        <div style={{ textAlign: "center", padding: "17px 0 17px", fontFamily: SANS, fontSize: 21, fontWeight: 600, color: rgb(col), position: "relative" }}>
          {row.text}
          {row._burstS != null && <StrokeBurst t={t} atS={row._burstS} />}
        </div>
      </div>
    );
  }
  return null;
}

// Fixed scatter measured off the reference confetti burst (dx from content
// left, dy from the anchor line).
const CONFETTI = [
  [57, -27], [95, 58], [168, 69], [225, -103], [231, 70], [308, -102],
  [335, 48], [365, -41], [104, -97], [349, 63], [33, 10], [393, 3],
];

function Confetti({ t, atS, durS }) {
  if (t < atS || t > atS + durS + 0.3) return null;
  return (
    <div style={{ position: "relative", height: 0 }}>
      {CONFETTI.map(([dx, dy], i) => {
        const a = atS + i * 0.022;
        const pop = backOut(at(t, a, 0.2));
        const fade = 1 - easeIn(at(t, a + durS * 0.6, durS * 0.4), 2);
        if (t < a || fade <= 0.01) return null;
        const r = 3.2 * (0.7 + 0.5 * Math.abs(Math.sin(i * 2.3)));
        return <div key={i} style={{
          position: "absolute", left: dx, top: dy - 22,
          width: r * 2, height: r * 2, borderRadius: r,
          background: rgb(PHONE_C.salmon),
          opacity: fade, transform: `scale(${pop.toFixed(3)})`,
        }} />;
      })}
    </div>
  );
}

// ── the device ───────────────────────────────────────────────────────────────

/**
 * cfg fields (all *S are ABSOLUTE seconds, converted from scene-relative ms by
 * the preset registry):
 *   scroll: [{atS, y, durS, ease}]  content offset keys, px in stage space
 *   items:  flow items, see kinds in the registry note
 *   composer: {placeholder, text, typeAtS, cps, hideAtS, sendAtS}
 */
export function PhoneChat({ t, from, to, cfg }) {
  if (t < from - 0.001 || t > to + 0.001) return null;
  const C = PHONE_C;
  const serifBody = 20.5;

  // device geometry (stage px), measured: phone x 398..882, screen inset 15,
  // top 52, both run off the bottom of frame.
  const px = 398, pw = 484, py = 52;
  const sx = px + 15, sw = pw - 30, sy = py + 15;
  const contentX = 20, contentW = sw - 40; // 433..850 abs
  const headerH = 78; // from screen top; content fades under it

  // scroll offset
  const keys = cfg.scroll ?? [];
  let scrollY = keys.length ? keys[0].y : 0;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t >= k.atS) { scrollY = k.y; continue; }
    const prev = keys[i - 1];
    const dur = k.durS ?? 0.5;
    if (t > k.atS - dur) {
      const p = at(t, k.atS - dur, dur);
      const e = k.ease === "inout" ? (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
        : k.ease === "expo" ? expoOut(p) : easeOut(p);
      scrollY = lerp(prev.y, k.y, e);
    }
    break;
  }

  // chrome (header + composer) fade-in, for scenes that open on the drawn intro
  const chromeO = cfg.chromeAtS != null ? clamp01(at(t, cfg.chromeAtS, 0.3)) : 1;

  // composer
  const cm = cfg.composer;
  let composer = null;
  if (cm) {
    const gone = cm.hideAtS != null ? at(t, cm.hideAtS, 0.45) : 0;
    const dy = easeIn(gone, 2.6) * 190;
    if (gone < 1) {
      const typed = cm.typeAtS != null && t >= cm.typeAtS
        ? cm.text.slice(0, Math.floor((t - cm.typeAtS) * (cm.cps ?? 30)))
        : "";
      const done = typed.length >= cm.text.length;
      const phO = cm.typeAtS != null ? 1 - clamp01(at(t, cm.typeAtS - 0.45, 0.35)) : 1;
      // The panel grows upward as typing starts (measured: top 538 -> 446).
      const idleTop = cm.idleTop ?? 522;
      const cTop = lerp(idleTop, cm.typingTop ?? idleTop,
        cm.typeAtS != null ? expoOut(at(t, cm.typeAtS - 0.1, 0.25)) : 0);
      composer = (
        <div style={{
          position: "absolute", left: 4, width: sw - 8, top: cTop.toFixed(1) + "px", height: 720 - sy - cTop + 30,
          background: "#fff", borderRadius: "22px 22px 0 0",
          boxShadow: "0 -4px 24px rgba(60,50,30,0.06)",
          transform: `translateY(${dy.toFixed(1)}px)`, opacity: chromeO,
        }}>
          <div style={{ padding: "20px 18px 0", fontFamily: SANS, fontSize: 20, lineHeight: 1.32, color: rgb(C.ink), minHeight: 56 }}>
            {typed.length === 0
              ? <span style={{ color: rgb(C.placeholder), opacity: phO }}>{cm.placeholder}</span>
              : <>
                  {typed}
                  {!done || t < (cm.hideAtS ?? 1e9) ? <span style={{
                    display: "inline-block", width: 2, height: 20, background: rgb(C.ink),
                    verticalAlign: "-3px", marginLeft: 1,
                  }} /> : null}
                </>}
          </div>
          <div style={{
            position: "absolute", left: 18, right: 16,
            top: cm.iconRowY != null ? (cm.iconRowY - cTop).toFixed(1) + "px" : 92,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <ToolbarIcons left ink={C.label} />
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <ToolbarIcons left={false} ink={C.label} />
              {typed.length === 0 ? (
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#1d1d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    {[4, 8, 12, 16].map((x, i) => {
                      const h = [8, 14, 11, 6][i];
                      return <line key={i} x1={x} y1={10 - h / 2} x2={x} y2={10 + h / 2} stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />;
                    })}
                  </svg>
                </div>
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 20, background: rgb(C.salmon), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path d="M9 15 L9 3.5 M4.5 8 L9 3.5 L13.5 8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  // flow items
  const flow = (cfg.items ?? []).map((it, idx) => {
    if (it._atS != null && t < it._atS) return null;
    if (it._hideS != null && t >= it._hideS) return null;
    const key = it.id ?? idx;
    if (it.kind === "gap") return <div key={key} style={{ height: it.h }} />;
    if (it.kind === "label") return (
      <div key={key} style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: rgb(C.label), margin: "0 0 8px 2px", ...rowReveal(t, it._atS ?? from) }}>{it.text}</div>
    );
    if (it.kind === "bubble") return (
      <div key={key} style={{
        background: rgb(C.body), borderRadius: 16, padding: "13px 15px",
        margin: "0 -6px 22px",
        fontFamily: SANS, fontSize: 19, letterSpacing: "-0.02em", lineHeight: 1.34, color: rgb(C.ink),
        ...rowReveal(t, it._atS ?? from),
      }}>{it.text}</div>
    );
    if (it.kind === "paragraph") return (
      <StreamText key={key} t={t} atS={it._atS ?? from} streamS={it._streamS ?? 0} text={it.text}
        style={{ fontFamily: SERIF, fontSize: it.size ?? 22, lineHeight: 1.26, color: rgb(C.ink), marginBottom: 17, paddingLeft: 2, paddingRight: 4, maxWidth: it.w ?? undefined }} />
    );
    if (it.kind === "card") {
      const rows = (it.rows ?? []).filter((r) => t >= r._atS);
      if (!rows.length) return null;
      return (
        <div key={key} style={{
          background: rgb(C.card), borderRadius: 15, margin: "-10px -6px 22px",
          padding: "2px 18px 0", boxShadow: "0 6px 18px rgba(60,50,30,0.07)",
          overflow: "hidden", ...rowReveal(t, rows[0]._atS),
        }}>
          {rows.map((r, i) => <CardRow key={i} t={t} row={r} serifBody={serifBody} />)}
          {rows[rows.length - 1].type !== "button" ? <div style={{ height: 16 }} /> : null}
        </div>
      );
    }
    if (it.kind === "confetti") return <Confetti key={key} t={t} atS={it._atS} durS={it._durS ?? 1.0} />;
    if (it.kind === "mark") {
      const thinking = it._thinkUntilS != null && t < it._thinkUntilS;
      const ph = Math.floor(((t - (it._atS ?? from)) * 2.4) % 3);
      const mode = thinking ? (it.cycle === false ? "asterisk" : ["asterisk", "burst", "dots"][ph]) : "asterisk";
      const rot = thinking ? ((t * 55) % 360) : 0;
      return (
        <div key={key} style={{ margin: "6px 0 0 6px", ...rowReveal(t, it._atS ?? from) }}>
          <Mark mode={mode} rot={rot} />
        </div>
      );
    }
    return null;
  });

  // With a drawn intro the clean device only materialises as the outline fades;
  // the paper slab (same colour as the screen) sits underneath meanwhile.
  const deviceO = cfg.intro ? clamp01(at(t, cfg.intro.fadeAtS, 0.35)) : 1;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* hand-drawn opener: paper slab + self-drawing outline + hand */}
      {cfg.intro && (
        <PhoneIntro t={t} base={from}
          handAt={cfg.intro.handAtS} handExitAt={cfg.intro.handExitAtS}
          drawAt={cfg.intro.drawAtS} drawDur={cfg.intro.drawDurS}
          fadeAt={cfg.intro.fadeAtS} />
      )}
      {/* device body */}
      <div style={{
        position: "absolute", left: px, top: py, width: pw, height: 720 - py + 40,
        background: rgb(C.body), borderRadius: "60px 60px 0 0",
        boxShadow: "0 18px 60px rgba(90,75,55,0.18)", opacity: deviceO,
      }} />
      {/* screen */}
      <div style={{
        position: "absolute", left: sx, top: sy, width: sw, height: 720 - sy,
        background: `rgba(${C.screen[0]},${C.screen[1]},${C.screen[2]},${deviceO.toFixed(3)})`,
        borderRadius: "46px 46px 0 0", overflow: "hidden",
      }}>
        {/* scrolling thread */}
        <div style={{
          position: "absolute", left: contentX, width: contentW,
          top: headerH, bottom: 0, overflow: "visible",
        }}>
          <div style={{ transform: `translateY(${(-scrollY).toFixed(1)}px)` }}>
            {flow}
          </div>
        </div>
        {/* header occluder + fade */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: headerH - 14, background: rgb(C.screen) }} />
        <div style={{
          position: "absolute", left: 0, right: 0, top: headerH - 14, height: 16,
          background: `linear-gradient(${rgb(C.screen)}, rgba(250,249,245,0))`,
        }} />
        {/* greeting — centred serif welcome under a drawn mark, until it hides */}
        {cfg.greeting && (() => {
          const g = cfg.greeting;
          const inK = memReveal(at(t, g.atS ?? from, 0.35));
          const in2K = memReveal(at(t, (g.atS ?? from) + 0.15, 0.35));
          const outK = g.hideAtS != null ? clamp01(at(t, g.hideAtS, 0.15)) : 0;
          if (inK <= 0.004 || outK >= 1) return null;
          return (
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, opacity: 1 - outK }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 237, display: "flex", justifyContent: "center", opacity: inK }}>
                <Mark size={52} mode="asterisk" />
              </div>
              <div style={{
                position: "absolute", left: 0, right: 0, top: 301, textAlign: "center",
                fontFamily: SERIF, fontSize: 32, lineHeight: "40px", color: rgb(C.ink), opacity: inK,
              }}>{g.line1}</div>
              <div style={{
                position: "absolute", left: 0, right: 0, top: 341, textAlign: "center",
                fontFamily: SERIF, fontSize: 32, lineHeight: "40px", color: rgb(C.ink), opacity: in2K,
              }}>{g.line2}</div>
            </div>
          );
        })()}
        {/* header */}
        <div style={{ position: "absolute", left: 20, right: 20, top: 30, display: "flex", alignItems: "center", opacity: chromeO }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, width: 150 }}>
            <Chevron dir="left" size={17} />
            <span style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, color: rgb(C.ink) }}>Chats</span>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 7 }}>
            <span style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 700, color: rgb(C.ink) }}>{cfg.title ?? "Assistant"}</span>
            <span style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 400, color: rgb([70, 68, 60]), whiteSpace: "nowrap" }}>{cfg.subtitle ?? ""}</span>
            <span style={{ paddingLeft: 2, alignSelf: "center" }}><Chevron dir="down" size={13} colour={[70, 68, 60]} /></span>
          </div>
          <div style={{ width: 150, display: "flex", justifyContent: "flex-end" }}>
            <NewChatIcon />
          </div>
        </div>
        {composer}
      </div>
    </div>
  );
}
