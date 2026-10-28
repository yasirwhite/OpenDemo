/**
 * plum-shared.jsx — shared drawing kit for the `plum` template presets.
 *
 * Everything here was measured off the Breeze Customer Agent reference film
 * (1920x1080 @30fps; stage px = frame px / 1.5). The admin chrome is drawn in
 * an "app canvas" of APP_W x APP_H logical px and scaled to fit whichever
 * surface shows it (desk monitor, floating window), so one drawing serves all
 * framings. Pure functions of t throughout — no CSS animation.
 *
 * Chrome geometry re-measured 2026-09-08 by rectifying the S1 monitor screen
 * to the app canvas (work/scenes/1/appcrop.mjs): screen 1456x816, top bar 48,
 * side rail 66, page header 155 tall with the tab underline at y 152.
 */

import React from "react";
import { clamp01, lerp, rgb, easeByName, easeOut, easeInOut } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";

// ── measured palette (sampled from rectified frames, see work/scenes/1) ────
export const PLUM = {
  topbar: [72, 3, 48],          // top bar plum
  topbarSearch: [94, 0, 66],    // search pill fill
  sidebar: [78, 10, 55],        // left rail
  pageBg: [249, 249, 247],      // admin page ground
  card: [255, 255, 255],
  cardLine: [222, 221, 219],
  fieldLine: [201, 207, 211],   // textarea / input border
  ink: [51, 56, 60],            // heading ink (measured neutral, not blue)
  inkSoft: [93, 100, 105],
  inkFaint: [138, 145, 150],
  lavBtn: [219, 201, 223],      // "Test <agent>" button fill
  lavBtnInk: [86, 32, 70],
  chipGreen: [45, 165, 108],    // solid pill, white label
  chipGreenInk: [255, 255, 255],
  chipBlue: [58, 135, 205],     // solid pill, white label
  chipBlueInk: [255, 255, 255],
  darkBtn: [45, 62, 80],        // "Deploy TitanAssist" dark slab button
  chartPink: [242, 178, 184],
  chartPinkFill: [250, 224, 227],
  green: [0, 145, 111],
  red: [199, 70, 66],
};

export const CHAT = {
  header: [6, 67, 62],          // TitanAssist header forest green
  cust: [14, 74, 70],           // customer bubble (slightly lighter than header)
  custInk: [255, 255, 255],
  bot: [240, 240, 240],
  botInk: [45, 55, 60],
  card: [255, 255, 255],
  time: [150, 155, 158],
  ground: [250, 250, 249],
  link: [110, 32, 80],
};

// ── channels ───────────────────────────────────────────────────────────────
/** Resolve {atMs, v, ease, pow} keys at scene-relative tMs. Holds outside. */
export function chan(keys, tMs, dflt = 0) {
  if (!keys || !keys.length) return dflt;
  if (tMs <= keys[0].atMs) return keys[0].v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (tMs < b.atMs) {
      const p = clamp01((tMs - a.atMs) / Math.max(1e-6, b.atMs - a.atMs));
      return lerp(a.v, b.v, easeByName(b.ease, b.pow, easeInOut)(p));
    }
  }
  return keys[keys.length - 1].v;
}

/** Same, for keys carrying both x and y ({atMs, x, y, ease, pow}). */
export function chanXY(keys, tMs, dflt = [0, 0]) {
  if (!keys || !keys.length) return dflt;
  if (tMs <= keys[0].atMs) return [keys[0].x, keys[0].y];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (tMs < b.atMs) {
      const p = easeByName(b.ease, b.pow, easeInOut)(clamp01((tMs - a.atMs) / Math.max(1e-6, b.atMs - a.atMs)));
      return [lerp(a.x, b.x, p), lerp(a.y, b.y, p)];
    }
  }
  const l = keys[keys.length - 1];
  return [l.x, l.y];
}

/** 0->1 progress of an event at atMs lasting durMs (ease-out by default). */
export const pop = (tMs, atMs, durMs = 320, ease = easeOut) =>
  ease(clamp01((tMs - atMs) / Math.max(1, durMs)));

// ── icons (drawn, no assets) ───────────────────────────────────────────────
export const I = {
  search: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 20 20"><circle cx="8.6" cy="8.6" r="5.6" fill="none" stroke={col} strokeWidth="1.9" /><line x1="12.9" y1="12.9" x2="17.6" y2="17.6" stroke={col} strokeWidth="1.9" strokeLinecap="round" /></svg>),
  clip: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 20 20"><path d="M13.5 5.5 7.6 11.4a2.6 2.6 0 0 0 3.7 3.7l6-6a4.2 4.2 0 0 0-6-6l-6.4 6.5a5.9 5.9 0 0 0 8.3 8.3l5.2-5.2" fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" transform="scale(0.82) translate(2,2)" /></svg>),
  send: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 20 20"><path d="M3 10.5 17 3.4 13.6 17l-4.2-4.6Zm6.4 1.9L17 3.4" fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" /></svg>),
  chevDown: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 16 16"><path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  sortArrows: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 16 16"><path d="M5.4 6.4 8 3.6l2.6 2.8M5.4 9.6 8 12.4l2.6-2.8" fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  spark: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 20 20"><path d="M10 2.4 11.7 8l5.6 1.8-5.6 1.8L10 17.2 8.3 11.6 2.7 9.8 8.3 8Z" fill={col} /></svg>),
  gear: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 20 20"><circle cx="10" cy="10" r="3" fill="none" stroke={col} strokeWidth="1.6" /><path d="M10 2.8v2.4M10 14.8v2.4M2.8 10h2.4M14.8 10h2.4M4.9 4.9l1.7 1.7M13.4 13.4l1.7 1.7M15.1 4.9l-1.7 1.7M6.6 13.4l-1.7 1.7" stroke={col} strokeWidth="1.6" strokeLinecap="round" /></svg>),
  bell: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 20 20"><path d="M10 3a5 5 0 0 1 5 5v3.4l1.4 2.6H3.6L5 11.4V8a5 5 0 0 1 5-5Zm-1.6 12.4a1.7 1.7 0 0 0 3.2 0" fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" /></svg>),
  question: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.4" fill="none" stroke={col} strokeWidth="1.5" /><path d="M7.8 8.1a2.3 2.3 0 1 1 3.4 2c-.8.5-1.2.9-1.2 1.8" fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="14.2" r="0.9" fill={col} /></svg>),
  phone: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 20 20"><path d="M5 3.5c.8-.8 2-.7 2.6.2l1 1.6c.5.8.3 1.8-.4 2.4l-.6.5c.6 1.4 1.8 2.6 3.2 3.2l.5-.6c.6-.7 1.6-.9 2.4-.4l1.6 1c.9.6 1 1.8.2 2.6l-.9.9c-.7.7-1.8 1-2.8.6C8 14.1 5.9 12 4.5 8.2c-.4-1-.1-2.1.6-2.8Z" fill="none" stroke={col} strokeWidth="1.5" /></svg>),
  shop: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 20 20"><path d="M4 7h12l-.8 9H4.8Zm3 0a3 3 0 0 1 6 0" fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" /></svg>),
  lifebuoy: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.2" fill="none" stroke={col} strokeWidth="1.5" /><circle cx="10" cy="10" r="3" fill="none" stroke={col} strokeWidth="1.5" /><path d="M10 2.8v4.2M10 13v4.2M2.8 10h4.2M13 10h4.2" stroke={col} strokeWidth="1.2" /></svg>),
  plus: (s, col) => (
    <svg width={s} height={s} viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.6" fill="none" stroke={col} strokeWidth="1.4" /><path d="M10 6.4v7.2M6.4 10h7.2" stroke={col} strokeWidth="1.5" strokeLinecap="round" /></svg>),
};

/** The agent brand mark: a cog ring with a hard-hat robot face (drawn). */
export function AgentMark({ size = 40, ring = [255, 255, 255], face = [173, 186, 194], hat = [226, 100, 48] }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
      <circle cx="20" cy="20" r="19" fill={rgb(ring)} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <rect key={i} x="17.6" y="-0.5" width="4.8" height="5" rx="1.2" fill="#3c4a52"
          transform={`rotate(${(a * 180 / Math.PI).toFixed(1)} 20 20)`} />;
      })}
      <circle cx="20" cy="20" r="14.5" fill="#3c4a52" />
      <circle cx="20" cy="20" r="12.2" fill={rgb(face)} />
      <path d="M12.5 17.5a7.5 7.5 0 0 1 15 0Z" fill={rgb(hat)} />
      <rect x="11.4" y="16.6" width="17.2" height="2.4" rx="1.2" fill={rgb(hat)} />
      <circle cx="15.8" cy="22.4" r="1.7" fill="#26333b" />
      <circle cx="24.2" cy="22.4" r="1.7" fill="#26333b" />
      <path d="M15.5 26.4c1.4 1.6 7.6 1.6 9 0" fill="none" stroke="#26333b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── admin chrome, drawn at APP px and scaled by the caller ────────────────
export const APP_W = 1456;   // logical app canvas width  (screen 16:9)
export const APP_H = 816;    // logical app canvas height
export const TOPBAR_H = 48;  // measured plum bar height
export const SIDEBAR_W = 66; // measured left rail width
export const HEAD_H = 155;   // measured page header (title + tabs + rule)

/** Plum top bar: mark, search pill, icon row, Assistant, account chip. */
export function TopBar({ w = APP_W, searchLabel = "Search HubSpot", account = "CQ Consulting", accountInitials = "CQ" }) {
  const ic = "rgba(255,255,255,0.86)";
  const icons = [I.lifebuoy(16, ic), I.phone(16, ic), I.shop(16, ic), I.question(16, ic), I.gear(16, ic), I.bell(16, ic)];
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: TOPBAR_H, background: rgb(PLUM.topbar), fontFamily: FONT }}>
      <svg width="26" height="26" viewBox="0 0 26 26" style={{ position: "absolute", left: 21, top: 11 }}>
        <circle cx="16" cy="10" r="5.2" fill="none" stroke="#ff5c35" strokeWidth="2.6" />
        <path d="M16 4.8V1.6M10.9 12.9 4.4 19.4M12 8 6 3.4" stroke="#ff5c35" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="4" cy="20" r="2" fill="#ff5c35" /><circle cx="5" cy="2.6" r="1.7" fill="#ff5c35" />
      </svg>
      <div style={{
        position: "absolute", left: 66, top: 11, width: 504, height: 31, borderRadius: 16,
        background: rgb(PLUM.topbarSearch), border: "1px solid rgba(255,255,255,0.30)",
        display: "flex", alignItems: "center", padding: "0 15px", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.84)" }}>{searchLabel}</span>
        {I.search(14, "rgba(255,255,255,0.85)")}
      </div>
      <div style={{
        position: "absolute", left: 585, top: 12, width: 28, height: 28, borderRadius: 14,
        border: "1.4px solid rgba(255,255,255,0.55)", display: "flex", alignItems: "center",
        justifyContent: "center", color: "rgba(255,255,255,0.88)", fontSize: 17, fontWeight: 300,
      }}>+</div>
      <div style={{ position: "absolute", left: w - 552, top: 16, display: "flex", gap: 25 }}>
        {icons.map((el, i) => <div key={i}>{el}</div>)}
      </div>
      <div style={{ position: "absolute", left: w - 291, top: 15, display: "flex", alignItems: "center", gap: 7, color: "#fff", fontSize: 14 }}>
        {I.spark(15, "#f9a97a")}<span>Assistant</span>
      </div>
      <div style={{ position: "absolute", left: w - 164, top: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 12, background: "#b24b7f", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{accountInitials}</div>
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{account}</span>
        {I.chevDown(12, "rgba(255,255,255,0.85)")}
      </div>
    </div>
  );
}

const RAIL_GLYPHS = ["home", "bmk", "dash", "person", "mega", "note", "shop", "out", "bell2", "db", "org", "bars", "spark2", "code"];
function railGlyph(kind, col) {
  const sw = 1.5;
  switch (kind) {
    case "home": return <path d="M3 9.5 10 3l7 6.5M5 8.6V17h10V8.6" fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" />;
    case "bmk": return <path d="M5.5 3h9v14L10 13.4 5.5 17Z" fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" />;
    case "dash": return <path d="M3.5 16.5v-6h3v6Zm5 0v-10h3v10Zm5 0v-4h3v4Z" fill="none" stroke={col} strokeWidth={sw} />;
    case "person": return <g><circle cx="10" cy="7" r="3.2" fill="none" stroke={col} strokeWidth={sw} /><path d="M4.4 17a5.6 5.6 0 0 1 11.2 0" fill="none" stroke={col} strokeWidth={sw} /></g>;
    case "mega": return <path d="M3.5 8.5v3l8 3.5v-10Zm8-2.5 4-2v12l-4-2" fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" />;
    case "note": return <g><rect x="4" y="3.5" width="12" height="13" rx="1.6" fill="none" stroke={col} strokeWidth={sw} /><path d="M7 7.5h6M7 10.5h6M7 13.5h4" stroke={col} strokeWidth={sw} strokeLinecap="round" /></g>;
    case "shop": return <path d="M4 7.5h12l-.8 9H4.8Zm3 0a3 3 0 0 1 6 0" fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" />;
    case "out": return <g><rect x="3.5" y="3.5" width="9" height="13" rx="1.6" fill="none" stroke={col} strokeWidth={sw} /><path d="M12.5 10h5M15.5 7.6 18 10l-2.5 2.4" fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" /></g>;
    case "bell2": return <path d="M10 3.6a4.4 4.4 0 0 1 4.4 4.4v3l1.2 2.3H4.4L5.6 11V8A4.4 4.4 0 0 1 10 3.6Zm-1.4 11a1.5 1.5 0 0 0 2.8 0" fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" />;
    case "db": return <g><ellipse cx="10" cy="5.5" rx="6" ry="2.4" fill="none" stroke={col} strokeWidth={sw} /><path d="M4 5.5v9c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4v-9M4 10c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4" fill="none" stroke={col} strokeWidth={sw} /></g>;
    case "org": return <g><circle cx="10" cy="5.6" r="2.2" fill="none" stroke={col} strokeWidth={sw} /><circle cx="5.4" cy="14.4" r="2.2" fill="none" stroke={col} strokeWidth={sw} /><circle cx="14.6" cy="14.4" r="2.2" fill="none" stroke={col} strokeWidth={sw} /><path d="M10 7.8v2.4m0 0-3.4 2.4M10 10.2l3.4 2.4" stroke={col} strokeWidth={sw} /></g>;
    case "bars": return <path d="M4 16V9m4 7V5m4 11v-5m4 5V7" fill="none" stroke={col} strokeWidth={sw + 0.3} strokeLinecap="round" />;
    case "spark2": return <path d="M10 3.4 11.5 8l4.6 1.5-4.6 1.5L10 15.6 8.5 11 3.9 9.5 8.5 8Z" fill="none" stroke={col} strokeWidth={sw} strokeLinejoin="round" />;
    case "code": return <g><rect x="3.5" y="4.5" width="13" height="11" rx="1.6" fill="none" stroke={col} strokeWidth={sw} /><path d="m8 8-2 2 2 2m4-4 2 2-2 2" fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" /></g>;
    default: return null;
  }
}

/**
 * Plum left rail. Measured icon rows (app px from the screen top): 86, 137,
 * rule 169, then 203..618 on a 51.8 pitch, then a gap and 683, 735.
 */
const RAIL_Y = [86, 137, 203, 255, 306, 358, 410, 463, 514, 566, 618, 683, 735];
export function SideRail({ h = APP_H, count = 13 }) {
  const col = "rgba(255,255,255,0.72)";
  return (
    <div style={{ position: "absolute", left: 0, top: TOPBAR_H, width: SIDEBAR_W, height: h - TOPBAR_H, background: rgb(PLUM.sidebar), overflow: "hidden" }}>
      <div style={{ position: "absolute", left: SIDEBAR_W / 2 - 11, top: 169 - TOPBAR_H, width: 22, height: 1.4, background: "rgba(255,255,255,0.42)" }} />
      {RAIL_Y.slice(0, count).map((y, i) => (
        <svg key={i} width="21" height="21" viewBox="0 0 20 20" style={{ position: "absolute", left: SIDEBAR_W / 2 - 10.5, top: y - TOPBAR_H - 10.5 }}>
          {railGlyph(RAIL_GLYPHS[i], col)}
        </svg>
      ))}
    </div>
  );
}

/**
 * Page header — title, "Test <agent>" button, tab row with active underline.
 * Drawn in its own space whose origin is the page's top-left corner, i.e.
 * screen (SIDEBAR_W, TOPBAR_H). Measured: title left 49 / rows 49-67,
 * button (1197,43) 147x42, tabs at 78/188/304 with the rule at y 152.
 */
export function PageHead({ title = "Customer Agent", tabs = ["Overview", "Manage", "Performance"], active = 1, testLabel = "Test TitanAssist" }) {
  const TX = [73, 183, 299];
  return (
    <div style={{ position: "relative", width: "100%", height: HEAD_H, background: "#fff", fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 49, top: 39, fontSize: 21, fontWeight: 700, color: rgb(PLUM.ink), letterSpacing: 0.2 }}>{title}</div>
      <div style={{
        position: "absolute", left: 1197, top: 43, width: 147, height: 42, borderRadius: 5,
        background: rgb(PLUM.lavBtn), color: rgb(PLUM.lavBtnInk), fontSize: 15.5, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{testLabel}</div>
      {tabs.map((tb, i) => (
        <div key={i} style={{ position: "absolute", left: TX[i] ?? (78 + i * 116), top: 116, fontSize: 17, fontWeight: i === active ? 700 : 400, color: rgb(i === active ? PLUM.ink : PLUM.inkSoft) }}>{tb}</div>
      ))}
      <div style={{ position: "absolute", left: TX[active] - 16, top: 152, width: 111, height: 3, background: rgb(PLUM.ink) }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: HEAD_H - 1, height: 1, background: "#eceae8" }} />
    </div>
  );
}

/** Status chip (Published / Draft) — solid pill, white label. */
export const Chip = ({ kind }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", height: 21, padding: "0 12px", borderRadius: 11,
    background: rgb(kind === "Draft" ? PLUM.chipBlue : PLUM.chipGreen),
    color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: 0.1,
  }}>{kind === "Draft" ? "Draft" : "Published"}</span>
);

// ── chat widget ────────────────────────────────────────────────────────────
/**
 * ChatThread — the TitanAssist-style web chat widget, drawn at `w` CSS px.
 * messages: [{who:'bot'|'cust', label, lines:[..], link (index into lines
 *   rendered as bold plum underline), time, atMs, gapTop}]
 * A message exists once tMs >= atMs (appended at full opacity — measured: the
 * reference pops bubbles with no fade and seats them with a thread scroll).
 * scrollY: current thread scroll offset in CSS px (author-keyed).
 */
export function ChatThread({
  w = 504, h = 650, tMs, messages, scrollY = 0,
  brand = { name: "TitanAssist", sub: "Powered by AI", label: "Titan Assist" },
  headerH = 110, radius = 8, fontPx = 13.4, composer = true, shadow = true,
  square = false, metrics = null,
}) {
  const seen = messages.filter((m) => tMs >= (m.atMs ?? -1e9));
  const bubMax0 = Math.round(w * 0.62);
  const pad0 = Math.round(w * 0.055);
  /**
   * Optional measured overrides (scene `metrics`). Every default below
   * reproduces the original hard-coded layout exactly, so scenes that pass no
   * metrics render byte-identically. S2 of the Breeze clone measured a
   * different widget proportion (see templates/plum/work/scenes/2).
   *   labelRowH  height of the bot avatar/label row; the avatar overflows it
   *              (reference: bubble top sits 19px under the block top while
   *              the avatar is 31px tall).
   *   entryDy/entryTau  new-message entrance: block enters translateY(+dy) and
   *              settles exponentially (measured x0.787/frame at 30fps).
   */
  const M = {
    bubMax: bubMax0, pad: pad0, gutter: fontPx * 2.6, avatar: fontPx * 1.9,
    labelRowH: null, labelGap: 8, bubGap: 4, lineGap: fontPx * 1.1, msgGap: 18,
    markSize: headerH * 0.52, headPad: pad0 + 6, headGap: 14, headRaise: 0,
    nameSize: fontPx * 1.5, subSize: fontPx * 1.12, labelSize: fontPx * 0.82,
    timeSize: fontPx * 0.78, bubRadius: 12, lineHeight: 1.65,
    bubPadT: fontPx * 0.75, bubPadX: fontPx * 1.05, bubPadB: fontPx * 0.55,
    timeGap: fontPx * 0.5, tailH: fontPx * (composer ? 6.4 : 2),
    composerH: fontPx * 3.6, composerBottom: pad0 * 0.9, composerPadX: fontPx,
    composerFont: fontPx * 0.95, composerIcon: fontPx * 1.25,
    custBg: CHAT.cust, botBg: CHAT.bot, entryDy: 0, entryTau: 140,
    linkTrack: 0, linkColour: CHAT.link, labelLead: 0, composerBar: 0,
    ...(metrics || {}),
  };
  const pad = M.pad, bubMax = M.bubMax;
  return (
    <div style={{ position: "relative", width: w, height: h, background: rgb(CHAT.card), borderRadius: square ? 0 : radius, boxShadow: shadow ? "0 18px 50px rgba(30,40,44,0.16)" : "none", overflow: "hidden", fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: headerH, background: rgb(CHAT.header), display: "flex", alignItems: "center", gap: M.headGap, padding: `0 ${M.headPad}px`, zIndex: 2 }}>
        <div style={{ marginBottom: M.headRaise * 2, display: "flex" }}><AgentMark size={M.markSize} /></div>
        <div style={{ marginBottom: M.headRaise * 2 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: M.nameSize, letterSpacing: 0.2 }}>{brand.name}</div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 300, fontSize: M.subSize, marginTop: 2 }}>{brand.sub}</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: headerH, bottom: 0, overflow: "hidden" }}>
        <div style={{ transform: `translateY(${(-scrollY).toFixed(2)}px)`, padding: `${pad + 4}px ${pad}px 0` }}>
          {seen.map((m, i) => {
            const bot = m.who === "bot";
            // atMs < 0 marks a message that predates the scene: no entrance.
            const dy = M.entryDy && (m.atMs ?? -1) >= 0
              ? M.entryDy * Math.exp(-Math.max(0, tMs - m.atMs) / M.entryTau) : 0;
            return (
              <div key={i} style={{
                marginTop: i === 0 ? 0 : (m.gapTop ?? M.msgGap),
                transform: dy > 0.02 ? `translateY(${dy.toFixed(2)}px)` : undefined,
              }}>
                {bot && !m.noLabel ? (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: M.labelGap, height: M.labelRowH ?? undefined }}>
                    <AgentMark size={M.avatar} />
                    <span style={{ fontSize: M.labelSize, fontWeight: 700, color: rgb(CHAT.botInk), marginTop: 2 }}>{m.label ?? brand.label}</span>
                  </div>
                ) : null}
                {/* labelLead: the reference seats a bot message's avatar+label a few
                    frames before its bubble appears; 0 keeps both simultaneous. */}
                {M.labelLead > 0 && bot && !m.noLabel && (m.atMs ?? -1) >= 0 && tMs < m.atMs + M.labelLead ? null : (
                <div style={{ display: "flex", justifyContent: bot ? "flex-start" : "flex-end" }}>
                  <div style={{
                    maxWidth: bubMax, marginLeft: bot ? M.gutter : 0,
                    background: rgb(bot ? M.botBg : M.custBg), color: rgb(bot ? CHAT.botInk : CHAT.custInk),
                    borderRadius: M.bubRadius, padding: `${M.bubPadT}px ${M.bubPadX}px ${M.bubPadB}px`,
                    fontSize: fontPx, lineHeight: M.lineHeight, fontWeight: 300, marginTop: bot ? M.bubGap : 0,
                  }}>
                    {m.lines.map((ln, j) => (
                      <div key={j} style={{ marginTop: j === 0 ? 0 : (m.lineGaps ? m.lineGaps[j] ?? M.lineGap : M.lineGap) }}>
                        {m.linkLine === j
                          ? <span>{ln[0]}<span style={{ color: bot ? rgb(M.linkColour) : "#fff", fontWeight: 700, textDecoration: "underline", letterSpacing: M.linkTrack || undefined }}>{ln[1]}</span></span>
                          : ln}
                      </div>
                    ))}
                    <div style={{ fontSize: M.timeSize, color: bot ? rgb(CHAT.time) : "rgba(255,255,255,0.75)", marginTop: M.timeGap, textAlign: bot ? "left" : "right" }}>{m.time}</div>
                  </div>
                </div>)}
              </div>
            );
          })}
          <div style={{ height: M.tailH }} />
        </div>
        {/* Opaque composer footer: the reference hides arriving bubbles behind a
            white bar whose top edge sits composerBar px above the card bottom. */}
        {composer && M.composerBar ? (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: M.composerBar, background: "#fff" }} />
        ) : null}
        {composer ? (
          <div style={{ position: "absolute", left: pad, right: pad, bottom: M.composerBottom, height: M.composerH, borderRadius: M.composerH / 2, border: "1.4px solid #cfd3d4", background: "#fff", display: "flex", alignItems: "center", padding: `0 ${M.composerPadX}px` }}>
            <span style={{ fontSize: M.composerFont, color: "#9aa0a3", flex: 1 }}>Write a message</span>
            {I.clip(M.composerIcon, "#5c6467")}
            <div style={{ width: fontPx * 0.7 }} />
            {I.send(M.composerIcon, "#5c6467")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Soft blurred backdrop tiles (the out-of-focus desktop behind the widget). */
export function Backdrop({ w = 1280, h = 720, y = 0, tint = CHAT.ground, tiles = null, blur = 7, radius = 14, shadow = "0 8px 40px rgba(60,66,70,0.10)" }) {
  // Default tile set = the original hard-coded desktop; `tiles` (array of
  // [x, y, w, h, opacity?]) overrides it. S2 of the Breeze clone measures a
  // single white column on the left over a flat 250,249,247 ground.
  const set = tiles ?? [
    [14, -40, 372, 420], [14, 430, 372, 300], [14, 780, 372, 380],
    [900, -60, 500, 400], [900, 390, 500, 330], [900, 770, 500, 380],
  ];
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h * 2.2, background: rgb(tint), transform: `translateY(${y.toFixed(1)}px)`, filter: `blur(${blur}px)` }}>
      {set.map((t, i) => (
        <div key={i} style={{ position: "absolute", left: t[0], top: t[1], width: t[2], height: t[3], borderRadius: radius, background: "#ffffff", boxShadow: shadow, opacity: t[4] ?? 1 }} />
      ))}
    </div>
  );
}
