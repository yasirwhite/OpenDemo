/**
 * plum-admin-window.jsx — the floating admin-app window of the Breeze
 * reference (S5 overview -> punched stat row, S6 meet-the-agent -> deploy
 * card, S7 deployment & channels table -> click). One rounded window with a
 * measured rect (stage 224,79 848x589, r 9) over the scene ground; interiors
 * drawn at APP px and scaled in. Punches and pans are the per-scene camera.
 * The pointer lives in interior space so it rides every punch.
 */

import React from "react";
import { clamp01, lerp, rgb, easeOut, easeInOut } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";
import {
  PLUM, chan, pop, I, AgentMark, TopBar, SideRail, PageHead, APP_W, TOPBAR_H, SIDEBAR_W,
} from "./plum-shared.jsx";

const WIN = { x: 224, y: 78.7, w: 848, h: 588.7, r: 9 };
const LINE = "#e5e3e1";

// ── S5 measured constants (full-decode of breeze-hubspot.mp4 50.0-57.9s) ────
// Window rect on the 1920x1080 reference: x 311.5, y 78.5, 1296 x 922, r 13.5.
// Stage px = ref/1.5 -> { x 207.67, y 52.33, w 864, h 614.67, r 9 }. The app
// canvas is APP_W (1456) wide, so app px = ref px * 1456/1296 = ref * 1.123457.
const F = 1456 / 1296;               // ref px -> app px
const OV = {
  railW: 58 * F,                     // 65.2  (measured rail 58 ref px)
  headH: 136.5 * F,                  // 153.4 white page-header band
  padL: 38.5 * F,                    // 43.2  content padding inside the rail
  padR: 36.5 * F,                    // 41.0
  riseApp: 36 * F,                   // 40.4  every element rises this far
  riseMs: 400,                       // exp settle, per-frame factor ~0.74
};
const INK = "#1a1e21";
const INK2 = "#333b41";
const INK3 = "#4d565c";
const GREEN = "#00924a";
const RED = "#bd0a3e";
const BTN_LINE = "#1f2326";

/** Rise-into-place: exponential settle, measured 0.74 remaining per frame. */
const rise = (tMs, atMs, travel = OV.riseApp, dur = OV.riseMs) =>
  tMs <= atMs ? travel : travel * Math.exp((-4 * (tMs - atMs)) / dur);
const seen = (tMs, atMs) => tMs >= atMs - 0.001;

// ── pointer (app-space) ───────────────────────────────────────────────────
/**
 * Glyph selection: legacy `glyph` / `glyph2` + `glyphSwitchAtMs` (one switch),
 * or `glyphKeys: [{atMs, glyph, dx, dy}]` for scenes that flip more than once —
 * S6's pointer measures arrow -> hand (3.10s, entering the Deploy button) ->
 * arrow (3.967s, the click; the reference button itself never depresses).
 * `dx`/`dy` shift the drawn glyph so a swap keeps the SAME hotspot: the arrow's
 * hotspot is its top-left, the hand's is the fingertip ~7px in.
 */
function Pointer({ cur, tMs }) {
  if (!cur || !cur.keys || !cur.keys.length) return null;
  const kx = cur.keys.map((k) => ({ atMs: k.atMs, v: k.x, ease: k.ease ?? "inout" }));
  const ky = cur.keys.map((k) => ({ atMs: k.atMs, v: k.y, ease: k.ease ?? "inout" }));
  const x = chan(kx, tMs, cur.keys[0].x), y = chan(ky, tMs, cur.keys[0].y);
  let press = 0;
  if (cur.press) press = chan(cur.press.map((p) => ({ atMs: p.atMs, v: p.amount, ease: "linear" })), tMs, 0);
  const s = (cur.size ?? 26) * (1 - press * 0.12);
  let gdx = 0, gdy = 0;
  let glyph = (cur.glyphSwitchAtMs != null && tMs >= cur.glyphSwitchAtMs) ? (cur.glyph2 ?? "hand") : (cur.glyph ?? "arrow");
  if (cur.glyphKeys && cur.glyphKeys.length) {
    let g = cur.glyphKeys[0];
    for (const k of cur.glyphKeys) if (tMs >= k.atMs) g = k;
    glyph = g.glyph; gdx = g.dx ?? 0; gdy = g.dy ?? 0;
  }
  const dx = press * 2 + gdx, dy = press * 2 + gdy;
  if (glyph === "hand") {
    return (
      <svg width={s * 1.47} height={s * 1.45} viewBox="0 0 24 28" style={{ position: "absolute", left: x + dx, top: y + dy, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.22))" }}>
        <path d="M9 2.6c1 0 1.8.8 1.8 1.8v7l1.2.2V9.2c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6v2.8l1.2.3v-2c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v2.7l1 .4c.8.3 1.3 1.2 1.1 2l-1.2 5.6a4 4 0 0 1-3.9 3.2H11a4 4 0 0 1-3.2-1.6l-4.4-5.8c-.5-.7-.4-1.7.3-2.2.7-.6 1.7-.5 2.3.2l1.2 1.4V4.4c0-1 .8-1.8 1.8-1.8Z" fill="#fff" stroke="#111315" strokeWidth="1.5" strokeLinejoin="round" />
        {/* the reference hand carries three knuckle creases across the fingers */}
        <path d="M12.6 14.2v3.8M15.5 14.6v3.6M18.4 15.2v3.2" stroke="#111315" strokeWidth="1.05" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (glyph === "arrow2") {
    // Drawn from the reference's own corner measurements, not from a rotation:
    // f0127 blob is 60x62 frame px at the 2.565x punch (= 23.4 x 24.2 ref px),
    // tip at the bbox top-left, bottom-left point 7.8 ref right / 24.4 down of
    // the tip, right point 24.4 right / 12.3 down. A straight-up arrow reads
    // far too thin, and rotating one swings its tail LEFT of the tip, which the
    // reference never does.
    return (
      <svg width={s} height={s} viewBox="0 0 27 27" style={{ position: "absolute", left: x + dx, top: y + dy }}>
        <path d="M1.9 1.9 L8 25.4 L13.2 18.6 L25.2 14.1 Z" fill="none" stroke="#fff" strokeWidth="4.6" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M1.9 1.9 L8 25.4 L13.2 18.6 L25.2 14.1 Z" fill="#111315" stroke="#111315" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s * 1.5} viewBox="0 0 12 19" style={{ position: "absolute", left: x + dx, top: y + dy, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}>
      <path d="M1 1 L1 15.4 L4.4 12.2 L6.6 17.4 L9 16.4 L6.9 11.3 L11.3 11.3 Z" fill="#161819" stroke="#fff" strokeWidth="1.1" />
    </svg>
  );
}

// ── overview interior (S5) ────────────────────────────────────────────────
// Every number below is a full-decode measurement of the reference, converted
// ref px -> app px with F. See work/scenes/5/ for the probe output.

const OVI = {
  home: (s, c) => <path d="M2.6 9.6 10 3l7.4 6.6M4.8 8.6V17h10.4V8.6" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />,
  bmk: (s, c) => <path d="M5.6 3.2h8.8v13.6L10 13.2 5.6 16.8Z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />,
  personbox: (s, c) => <g><rect x="3.2" y="4" width="13.6" height="12" rx="1.8" fill="none" stroke={c} strokeWidth="1.5" /><circle cx="10" cy="8.6" r="1.9" fill="none" stroke={c} strokeWidth="1.4" /><path d="M6.8 13.6a3.4 3.4 0 0 1 6.4 0" fill="none" stroke={c} strokeWidth="1.4" /></g>,
  mega: (s, c) => <path d="M3.4 8.2v3.6l8.4 3.6V4.6Zm8.4-2.2 4.4-2v12l-4.4-2" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />,
  ticket: (s, c) => <g><rect x="2.8" y="5" width="14.4" height="10" rx="1.6" fill="none" stroke={c} strokeWidth="1.5" /><path d="M6.2 8.2h7.6M6.2 11.4h4.6" stroke={c} strokeWidth="1.4" strokeLinecap="round" /></g>,
  list: (s, c) => <g><rect x="4" y="3.4" width="12" height="13.2" rx="1.6" fill="none" stroke={c} strokeWidth="1.5" /><path d="M7 7.4h6M7 10.4h6M7 13.4h4" stroke={c} strokeWidth="1.4" strokeLinecap="round" /></g>,
  wallet: (s, c) => <g><rect x="2.8" y="5.4" width="14.4" height="9.6" rx="1.8" fill="none" stroke={c} strokeWidth="1.5" /><circle cx="13.6" cy="10.2" r="1.2" fill={c} /></g>,
  bell: (s, c) => <path d="M10 3.4a4.6 4.6 0 0 1 4.6 4.6v3.2l1.3 2.4H4.1l1.3-2.4V8A4.6 4.6 0 0 1 10 3.4Zm-1.5 11.6a1.6 1.6 0 0 0 3 0" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />,
  db: (s, c) => <g><ellipse cx="10" cy="5.6" rx="6.2" ry="2.4" fill="none" stroke={c} strokeWidth="1.5" /><path d="M3.8 5.6v8.8c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4V5.6M3.8 10c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4" fill="none" stroke={c} strokeWidth="1.5" /></g>,
  org: (s, c) => <g><circle cx="10" cy="5.4" r="2.2" fill="none" stroke={c} strokeWidth="1.5" /><circle cx="5.2" cy="14.6" r="2.2" fill="none" stroke={c} strokeWidth="1.5" /><circle cx="14.8" cy="14.6" r="2.2" fill="none" stroke={c} strokeWidth="1.5" /><path d="M10 7.6v2.6m0 0-3.6 2.4M10 10.2l3.6 2.4" stroke={c} strokeWidth="1.4" /></g>,
  bars: (s, c) => <path d="M4 16.4V9.6m4 6.8V4.8m4 11.6v-5.2m4 5.2V7.2" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />,
  spark: (s, c) => <path d="M10 2.6 11.6 8 17 9.6 11.6 11.2 10 16.6 8.4 11.2 3 9.6 8.4 8Z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />,
  codebox: (s, c) => <g><rect x="3" y="4.4" width="14" height="11.2" rx="2" fill="none" stroke={c} strokeWidth="1.5" /><path d="m8.2 8-2 2 2 2m3.6-4 2 2-2 2" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></g>,
  chevbox: (s, c) => <g><rect x="3" y="4.4" width="14" height="11.2" rx="2" fill="none" stroke={c} strokeWidth="1.5" /><path d="m8.4 7.6 2.6 2.4-2.6 2.4" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></g>,
  people: (s, c) => <g><circle cx="8" cy="7.4" r="2.7" fill="none" stroke={c} strokeWidth="1.5" /><path d="M2.8 16a5.2 5.2 0 0 1 10.4 0" fill="none" stroke={c} strokeWidth="1.5" /><path d="M13.4 5.2a2.5 2.5 0 0 1 0 4.6M14.6 16a5 5 0 0 0-1.6-3.6" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" /></g>,
  doc: (s, c) => <g><rect x="3.4" y="3.6" width="13.2" height="12.8" rx="1.8" fill="none" stroke={c} strokeWidth="1.5" /><path d="M6.4 7.4h7.2M6.4 10.2h7.2M6.4 13h4.4" stroke={c} strokeWidth="1.4" strokeLinecap="round" /></g>,
  plusline: (s, c) => <path d="M10 3.6v12.8M3.6 10h12.8" stroke={c} strokeWidth="1.7" strokeLinecap="round" />,
  cal: (s, c) => <g><rect x="3" y="4.6" width="14" height="12" rx="1.8" fill="none" stroke={c} strokeWidth="1.5" /><path d="M3 8.4h14M6.6 3.2v2.8M13.4 3.2v2.8" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></g>,
  phone2: (s, c) => <path d="M5.2 3.6c.8-.8 2-.7 2.6.2l1 1.6c.5.8.3 1.8-.4 2.4l-.6.5c.6 1.4 1.8 2.6 3.2 3.2l.5-.6c.6-.7 1.6-.9 2.4-.4l1.6 1c.9.6 1 1.8.2 2.6l-.9.9c-.7.7-1.8 1-2.8.6C8.2 14.2 6 12 4.6 8.3c-.4-1-.1-2.1.6-2.8Z" fill="none" stroke={c} strokeWidth="1.5" />,
  mail2: (s, c) => <g><rect x="2.8" y="4.8" width="14.4" height="10.4" rx="1.6" fill="none" stroke={c} strokeWidth="1.5" /><path d="m3.4 5.8 6.6 5.2 6.6-5.2" fill="none" stroke={c} strokeWidth="1.5" /></g>,
};
const Gl = ({ k, s, c }) => (
  <svg width={s} height={s} viewBox="0 0 20 20" style={{ display: "block" }}>{OVI[k](s, c)}</svg>
);

/** Left rail, measured: 58 ref wide, icon pitch ~46.7 ref, one pinned bottom. */
function OvRail({ h }) {
  const col = "rgba(255,255,255,0.82)";
  const size = 19 * F;
  // icon centres in app px measured from the rail top (ref y - 118.5) * F
  const ys = [30.5, 77.5, 137.5, 185.5, 231.5, 277.5, 324.5, 371.5, 418.5, 462.5, 513.5, 570.5, 617.5].map((v) => v * F);
  const glyphs = ["home", "bmk", "personbox", "mega", "ticket", "list", "wallet", "bell", "db", "org", "bars", "spark", "codebox"];
  return (
    <div style={{ position: "absolute", left: 0, top: TOPBAR_H, width: OV.railW, height: h - TOPBAR_H, background: "rgb(66,0,42)", overflow: "hidden" }}>
      {ys.map((y, i) => (
        <div key={i} style={{ position: "absolute", left: (OV.railW - size) / 2, top: y - size / 2 }}>
          <Gl k={glyphs[i]} s={size} c={col} />
        </div>
      ))}
      <div style={{ position: "absolute", left: OV.railW * 0.22, width: OV.railW * 0.56, top: 108.5 * F, height: 1.4, background: "rgba(255,255,255,0.45)" }} />
      <div style={{ position: "absolute", left: (OV.railW - size) / 2, top: 849.5 * F - size / 2 }}>
        <Gl k="chevbox" s={size} c={col} />
      </div>
    </div>
  );
}

/** Page header band: title + Test button + tab row. Measured heights. */
function OvHead({ title, tabs, active, testLabel }) {
  const padL = 41.5 * F, padR = 44.5 * F;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: OV.headH, background: "#fff", fontFamily: FONT }}>
      <div style={{ position: "absolute", left: padL, top: 49.5, fontSize: 21.6, lineHeight: "27px", fontWeight: 600, color: INK, letterSpacing: 0.1 }}>{title}</div>
      <div style={{ position: "absolute", right: padR, top: 46.4, height: 39.3, display: "flex", alignItems: "center", padding: "0 17px", background: rgb(PLUM.lavBtn), color: rgb(PLUM.lavBtnInk), fontSize: 15, fontWeight: 600, borderRadius: 4 }}>{testLabel}</div>
      <div style={{ position: "absolute", left: padL + 0.6, top: 116.7, display: "flex" }}>
        {tabs.map((tb, i) => (
          <div key={i} style={{ padding: "0 28px", fontSize: 16.3, lineHeight: "22px", fontWeight: i === active ? 600 : 400, color: i === active ? INK : INK3, borderBottom: `3.9px solid ${i === active ? INK : "transparent"}`, paddingBottom: 12.4 }}>{tb}</div>
        ))}
      </div>
    </div>
  );
}

const Outline = ({ label, w, h, fs }) => (
  <div style={{ width: w, height: h, border: `1.2px solid ${BTN_LINE}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs, fontWeight: 500, color: INK, background: "transparent", boxSizing: "border-box" }}>{label}</div>
);

function OverviewInterior(d, tMs) {
  const cards = d.attention ?? [
    { icon: "cal", t: "Customer agent scheduled an", s: "Customer agents chatted with Elsa from BizNiz. Elsa is interested in learning more" },
    { icon: "phone2", t: "Bronze customer Tim Carey is", s: "Time needs help with changing his dates for a training with his consultant, Rachel Avalon" },
    { icon: "mail2", t: "A lead emailed you about pricing", s: "Seth Milchik from Lumon Industries would like to know how the gold package differs" },
    { icon: "bell", t: "Customer Agent conversation", s: "Customer Agent flagged a complex question about enterprise pricing that" },
  ];
  const stats = d.stats ?? [
    { l: "Customer queries", l2: "successfully answered", v: "98.7%", d: "2.3%", up: true },
    { l: "Average time to", l2: "generate a response", v: "1.8s", d: "0.4s", up: false },
    { l: "Average rating from", l2: "customer feedback", v: "4.7/5", d: ".03", up: true },
    { l: "Total conversations", l2: "handled this month", v: "8,243", d: "12%", up: true },
    { l: "Conversations requiring", l2: "human assi...", v: "4.3%", d: "1.2%", up: false },
  ];
  // measured cue onsets (scene-relative ms)
  const C = {
    pickHd: d.pickupAtMs ?? 0,
    pills: d.pillAtMs ?? [267, 367, 467],
    attHd: d.attentionAtMs ?? 567,
    attBtn: d.attBtnAtMs ?? 667,
    attCards: d.attCardsAtMs ?? 867,
    perfHd: d.perfAtMs ?? 1067,
    perfBtn: d.perfBtnAtMs ?? 1133,
    stats: d.statAtMs ?? [1200, 1300, 1400, 1500, 1600],
  };
  // vertical layout, app px from the page-background top
  const Y = { pickHd: 33.8, pills: 85.0, attHd: 192.2, attRow: 200.9, attCards: 249.3, perfHd: 528.1, perfRow: 537.9, stats: 583.2 };
  const pillW = 378 * F, pillGap = 14 * F, pillH = 46 * F;
  const attW = 280 * F, attPitch = 294 * F, attH = 204.5 * F;
  const stW = 221 * F, stPitch = 235.5 * F, stH = 195 * F;
  const btnW = 142 * F, btnH = 28 * F;
  const layer = (atMs, extra = {}) => ({
    position: "absolute", left: 0, right: 0,
    display: seen(tMs, atMs) ? "block" : "none",
    transform: `translateY(${rise(tMs, atMs).toFixed(2)}px)`,
    ...extra,
  });
  return (
    <div style={{ position: "absolute", left: OV.railW, top: TOPBAR_H, right: 0, bottom: 0, background: "#fff", fontFamily: FONT, overflow: "hidden" }}>
      <OvHead title={d.title ?? "Customer Agent"} tabs={d.tabs ?? ["Overview", "Manage", "Analyze"]} active={0} testLabel={d.testLabel ?? "Test TitanAssist"} />
      <div style={{ position: "absolute", left: 0, right: 0, top: OV.headH, bottom: 0, background: "rgb(246,246,244)", overflow: "hidden" }}>
        {/* Pickup where you left off */}
        <div style={layer(C.pickHd, { top: Y.pickHd, left: OV.padL, right: OV.padR })}>
          <div style={{ fontSize: 24.3, lineHeight: "31px", fontWeight: 600, color: INK }}>{d.pickupTitle ?? "Pickup where you left off"}</div>
        </div>
        {[d.pill1 ?? "Finish setting up goals", d.pill2 ?? "Add new content", d.pill3 ?? "Activate a new channel"].map((label, i) => (
          <div key={i} style={layer(C.pills[i], { top: Y.pills, left: OV.padL + i * (pillW + pillGap), right: "auto", width: pillW })}>
            <div style={{ height: pillH, border: "1.2px solid #6d757a", borderRadius: 5, background: "#fff", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 11, padding: "0 17px", fontSize: 18.25, fontWeight: 600, color: INK }}>
              <Gl k={["people", "doc", "plusline"][i]} s={17 * F} c={INK2} />
              {label}
            </div>
          </div>
        ))}
        {/* These conversations needs your attention */}
        <div style={layer(C.attHd, { top: Y.attHd, left: OV.padL, right: "auto" })}>
          <div style={{ fontSize: 24.3, lineHeight: "31px", fontWeight: 600, color: INK }}>{d.attTitle ?? "These conversations needs your attention"}</div>
        </div>
        <div style={layer(C.attBtn, { top: Y.attRow, left: "auto", right: OV.padR, width: btnW })}>
          <Outline label={d.viewAll ?? "View all conversations"} w={btnW} h={btnH} fs={13.5} />
        </div>
        {cards.map((c, i) => (
          <div key={i} style={layer(C.attCards, { top: Y.attCards, left: OV.padL + i * attPitch, right: "auto", width: attW })}>
            <div style={{ position: "relative", height: attH, borderRadius: 7, background: "#fff", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 18, top: 15.7, width: 39.3, height: 39.3, borderRadius: 8, background: "#e9def0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Gl k={c.icon} s={21} c="#6d2f77" />
              </div>
              <div style={{ position: "absolute", left: 18, right: 14, top: 72.0, fontSize: 16.3, lineHeight: "20.5px", fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden" }}>{c.t}</div>
              <div style={{ position: "absolute", left: 18, right: 16, top: 102.3, fontSize: 15.0, lineHeight: "23.6px", color: INK3, height: 74, overflow: "hidden" }}>{c.s}</div>
              <div style={{ position: "absolute", left: 18, top: 179.8 }}><Outline label={d.viewDetails ?? "View details"} w={103} h={32.6} fs={13.5} /></div>
            </div>
          </div>
        ))}
        {/* Agent performance */}
        <div style={layer(C.perfHd, { top: Y.perfHd, left: OV.padL, right: "auto" })}>
          <div style={{ fontSize: 24.3, lineHeight: "31px", fontWeight: 600, color: INK }}>{d.perfTitle ?? "Agent performance"}</div>
        </div>
        <div style={layer(C.perfBtn, { top: Y.perfRow, left: "auto", right: OV.padR, width: btnW })}>
          <Outline label={d.viewAll ?? "View all conversations"} w={btnW} h={btnH} fs={13.5} />
        </div>
        {stats.map((s, i) => (
          <div key={i} style={layer(C.stats[i], { top: Y.stats, left: OV.padL + i * stPitch, right: "auto", width: stW })}>
            <div style={{ height: stH, borderRadius: 7, background: "#fff", textAlign: "center", boxSizing: "border-box" }}>
              <div style={{ paddingTop: 51, fontSize: 15.2, lineHeight: "24.3px", color: INK2 }}>{s.l}<br />{s.l2}</div>
              <div style={{ marginTop: 12.4, fontSize: 32.5, lineHeight: "35px", fontWeight: 500, color: INK }}>{s.v}</div>
              <div style={{ marginTop: 2.6, fontSize: 12.8, lineHeight: "17.9px", fontWeight: 500, color: s.up ? GREEN : RED, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <svg width="11" height="9" viewBox="0 0 11 9"><path d="M5.5 0 11 9H0Z" fill={s.up ? GREEN : RED} /></svg>
                {s.d}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── meet-the-agent interior (S6) ──────────────────────────────────────────
// Every number is a full-decode measurement of breeze-hubspot.mp4 57.900-62.000
// (probes + traces in work/scenes/6/). The reference window sits at ref
// 311.5,79.5 1296x920; MX/MY map "ref px measured from the window's top-left"
// into the app canvas, whose scroller starts at the rail edge (58 ref) and
// under the top bar (39 ref = TOPBAR_H/F).
//
// The whole page scrolls — header band included, there is no sticky header:
// 226 ref px between 0.90s and 3.40s on a symmetric S. That scroll (not the
// camera) is what carries the "Deploy your agent" card up into the punch.
const MX = (refX) => (refX - 58) * F;
const MY = (refY) => (refY - TOPBAR_H / F) * F;
const MS = (n) => n * F;
/** line-box top for a wanted CAP top (system sans: ascent ~0.8em over baseline) */
const capTop = (cap, fs, lh) => cap - (lh - fs) / 2 - 0.2 * fs;

function MeetInterior(d, tMs) {
  // Card copy is authored as the reference's OWN two lines (its wraps, its
  // "Luma"/"Luna" inconsistency) so the break lands where the reference's does
  // instead of depending on the local font's advance widths.
  const gs = d.getStarted ?? [
    { t: "Test your agent", b: "Preview agent", lines: [
      "Test how well your agent can answer your most common inquiries. Upload more",
      "content to improve Luma's accuracy and relevancy."] },
    { t: "Set up human handoffs", b: "Set up handoffs", lines: [
      "Tell us what you want Luma to do when it can't answer a question, so you can",
      "ensure seamless, quality service for your customers."] },
    { t: "Deploy your agent", b: "Deploy agent", lines: [
      "Ready to have Luna start answering live customer inquiries? Assign Luna to a",
      "channel so it can start engaging in conversations."] },
    { t: "Help your agent take action", b: "Set up actions", lines: [
      "Luma can do more than just answer questions—it can complete tasks like",
      "password resets and qualify leads. Set up actions in Roles & Responsvibilities"] },
  ];
  const lines = d.meetLines ?? [
    "TitanAssist works 24/7 to offer your customers instant",
    "and reliable service, freeing up your team to focus",
    "on more complex tasks.",
  ];
  const C = d.cues ?? { h1: 0, body: 100, btn: 233, gs: 367, cards: [400, 500, 600, 700] };
  const scroll = MS(chan(d.scrollKeys ?? [
    { atMs: 0, v: 0 }, { atMs: 900, v: 0 }, { atMs: 3400, v: 226, ease: "inout", pow: 2 },
  ], tMs, 0));

  /** Measured entry. Every block arrives FULLY OPAQUE on its first frame and
   *  settles up: no fade anywhere in this scene (checked f0009/f0013/f0017 —
   *  the body, the dark button and card 1 are all solid on the frame they
   *  first appear). Only the exponential rise carries the arrival. */
  const ent = (atMs, travelRef, fadeMs = 0, dur = 380) => ({
    display: seen(tMs, atMs) ? "block" : "none",
    opacity: fadeMs <= 1 ? 1 : clamp01((tMs - atMs + 33.3) / fadeMs),
    transform: `translateY(${rise(tMs, atMs, MS(travelRef), dur).toFixed(2)}px)`,
  });

  // Card rect / interior: measured on f0038 (row profile) and cross-checked at
  // the 2.565x punch on f0085, which resolves the type to ~0.4 ref px.
  const cardW = MS(550.9), cardH = MS(238.9), padC = MS(35.5);
  const colX = [MX(99.5), MX(663.8)], rowY = [MY(552.8), MY(805.1)];

  const Card = (c, i) => (
    <div key={i} style={{
      position: "absolute", left: colX[i % 2], top: rowY[i < 2 ? 0 : 1], width: cardW, height: cardH,
      background: "#fff", borderRadius: MS(8), border: "1.1px solid #e0e0de", boxSizing: "border-box",
      ...ent(C.cards[i], 14, 0, 340),
    }}>
      <div style={{ position: "absolute", left: padC, top: capTop(MS(45), MS(19), MS(26)), fontSize: MS(19), lineHeight: `${MS(26)}px`, fontWeight: 700, color: INK }}>{c.t}</div>
      <svg width={MS(22.4)} height={MS(22.4)} viewBox="0 0 24 24" style={{ position: "absolute", right: MS(36), top: MS(36) }}>
        <circle cx="12" cy="12" r="11" fill="none" stroke="#c6c6c6" strokeWidth="1.5" />
        <path d="m7.6 12.4 2.9 2.9 5.9-6.1" fill="none" stroke="#c6c6c6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: padC, top: capTop(MS(114.4), MS(13.1), MS(21.9)), width: cardW - 2 * padC, fontSize: MS(13.1), lineHeight: `${MS(21.9)}px`, color: INK3, whiteSpace: "nowrap" }}>
        {c.lines ? c.lines.map((ln, j) => <div key={j}>{ln}</div>) : c.s}
      </div>
      <div style={{ position: "absolute", left: padC, top: MS(186.2), height: MS(28.1), display: "flex", alignItems: "center", padding: `0 ${MS(18.5)}px`, border: `1.1px solid ${BTN_LINE}`, borderRadius: 3.4, fontSize: MS(11.5), fontWeight: 700, color: INK, boxSizing: "border-box" }}>{c.b}</div>
    </div>
  );

  return (
    <div style={{ position: "absolute", left: OV.railW, top: TOPBAR_H, right: 0, bottom: -900, overflow: "hidden", fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 4200, background: "rgb(246,246,244)", transform: `translateY(${(-scroll).toFixed(2)}px)` }}>
        {/* ── page header band (white, scrolls away — no sticky header) ── */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: MY(174), background: "#fff" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: MY(174) - 1.2, height: 1.2, background: "#ecebe9" }} />
        <div style={{ position: "absolute", left: MX(101.4), top: capTop(MY(90.2), MS(19.5), MS(26)), fontSize: MS(19.5), lineHeight: `${MS(26)}px`, fontWeight: 600, color: INK }}>{d.title ?? "Customer Agent"}</div>
        <div style={{ position: "absolute", right: MS(43.5), top: MY(78.5), width: MS(128), height: MS(35.5), borderRadius: 4, background: "#d4bdd7", color: rgb(PLUM.lavBtnInk), fontSize: MS(14), fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{d.testLabel ?? "Test TitanAssist"}</div>
        <div style={{ position: "absolute", left: MX(100.5), top: capTop(MY(144.1), MS(15), MS(22)), display: "flex" }}>
          {(d.tabs ?? ["Overview", "Manage", "Analyze"]).map((tb, i) => (
            <div key={i} style={{ padding: `0 ${MS(24)}px`, paddingBottom: MS(12.6), fontSize: MS(15), lineHeight: `${MS(22)}px`, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? INK : INK3, borderBottom: `${MS(3)}px solid ${i === 0 ? INK : "transparent"}` }}>{tb}</div>
          ))}
        </div>

        {/* ── banner: meet-the-agent copy + the pink Breeze media card ── */}
        <div style={{ position: "absolute", left: MX(103.2), top: capTop(MY(232.5), MS(29.5), MS(40)), fontSize: MS(29.5), letterSpacing: MS(0.73), lineHeight: `${MS(40)}px`, fontWeight: 700, color: INK, whiteSpace: "nowrap", ...ent(C.h1, 35, 1) }}>{d.meetTitle ?? "Meet TitanAssist, your newest teammate"}</div>
        <div style={{ position: "absolute", left: MX(103.2), top: capTop(MY(284.1), MS(18.5), MS(21.5)), fontSize: MS(18.5), lineHeight: `${MS(21.5)}px`, color: INK3, ...ent(C.body, 24) }}>
          {lines.map((ln, i) => <div key={i}>{ln}</div>)}
        </div>
        <div style={{ position: "absolute", left: MX(103.1), top: MY(396.9), height: MS(34.7), borderRadius: 4, background: "#151615", color: "#fff", fontSize: MS(13), fontWeight: 600, display: "flex", alignItems: "center", padding: `0 ${MS(26)}px`, ...ent(C.btn, 24) }}>{d.meetBtn ?? "See how it works"}</div>
        {MediaCard(d)}
        <div style={{ position: "absolute", left: 0, right: 0, top: MY(473.5), height: 1.2, background: "#e9e9e7" }} />

        {/* ── get started grid ── */}
        <div style={{ position: "absolute", left: MX(100.4), top: capTop(MY(520.2), MS(20.5), MS(30)), fontSize: MS(20.5), letterSpacing: MS(0.33), lineHeight: `${MS(30)}px`, fontWeight: 600, color: INK, ...ent(C.gs, 16, 0, 340) }}>{d.gsTitle ?? "Get started"}</div>
        {gs.map(Card)}
      </div>
    </div>
  );
}

/** The pink "Breeze / Customer Agent" video card. Measured ref 443.5 x 251.5. */
function MediaCard(d) {
  const W = MS(443.5), H = MS(251.5);
  return (
    <div style={{
      position: "absolute", left: MX(735), top: MY(197), width: W, height: H,
      borderRadius: MS(10), overflow: "hidden",
      background:
        "radial-gradient(72% 95% at 0% 2%, rgba(233,132,110,0.92) 0%, rgba(233,132,110,0) 60%)," +
        "radial-gradient(78% 78% at 30% 108%, rgba(240,146,206,0.70) 0%, rgba(240,146,206,0) 62%)," +
        "linear-gradient(118deg,#f8dcd4 0%,#fbeae5 44%,#fae5ec 100%)",
    }}>
      <svg width={MS(55)} height={MS(65)} viewBox="0 0 55 65" style={{ position: "absolute", left: MS(118.5), top: MS(81) }}>
        <defs><linearGradient id="p6spk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2795a" /><stop offset="0.55" stopColor="#ec5a35" /><stop offset="1" stopColor="#e0431f" />
        </linearGradient></defs>
        <path d="M27.5 0c1.4 15.6 5.6 24.6 27.5 32.5C33.1 40.4 28.9 49.4 27.5 65 26.1 49.4 21.9 40.4 0 32.5 21.9 24.6 26.1 15.6 27.5 0Z" fill="url(#p6spk)" />
      </svg>
      <div style={{
        position: "absolute", left: MS(187.5), top: capTop(MS(91), MS(48), MS(56)),
        fontSize: MS(48), lineHeight: `${MS(56)}px`, fontWeight: 700, letterSpacing: MS(0.8),
        background: "linear-gradient(94deg,#e8563a 0%,#e0257c 48%,#bb27a8 100%)",
        WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
      }}>{d.videoWord ?? "Breeze"}</div>
      <div style={{ position: "absolute", left: MS(330), top: MS(88), fontSize: MS(10), color: "#a2506d" }}>™</div>
      <div style={{ position: "absolute", left: MS(163.5), top: capTop(MS(141), MS(17), MS(24)), fontSize: MS(17), lineHeight: `${MS(24)}px`, color: "#584b56" }}>{d.videoCaption ?? "Customer Agent"}</div>
      <svg width={MS(77.5)} height={MS(77.5)} viewBox="0 0 78 78" style={{ position: "absolute", left: MS(185.7), top: MS(88.7) }}>
        <circle cx="39" cy="39" r="39" fill="rgba(199,64,42,0.62)" />
        <path d="M31.5 24.5 56 39 31.5 53.5Z" fill="#fff" />
      </svg>
      <div style={{ position: "absolute", left: MS(8.5), top: MS(186), width: MS(57.5), height: MS(57.5), borderRadius: MS(13), overflow: "hidden", border: `${MS(2.4)}px solid #fbe6ef`, boxSizing: "border-box", background: "#e9eef1" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(155deg,#f3f5f6 0%,#e2e9ec 55%,#d3dce1 100%)" }} />
        <div style={{ position: "absolute", left: "62%", top: "12%", width: "30%", height: "40%", background: "#cfd9dd" }} />
        <div style={{ position: "absolute", left: "6%", top: "16%", width: "20%", height: "26%", background: "#dde4e7" }} />
        <div style={{ position: "absolute", left: "33%", top: "20%", width: "34%", height: "38%", borderRadius: "50%", background: "#e3b191" }} />
        <div style={{ position: "absolute", left: "27%", top: "10%", width: "46%", height: "34%", borderRadius: "50% 50% 22% 22%", background: "#3a2a23" }} />
        <div style={{ position: "absolute", left: "24%", top: "30%", width: "12%", height: "34%", borderRadius: "40%", background: "#33241e" }} />
        <div style={{ position: "absolute", left: "64%", top: "30%", width: "12%", height: "34%", borderRadius: "40%", background: "#33241e" }} />
        <div style={{ position: "absolute", left: "20%", top: "60%", width: "60%", height: "44%", borderRadius: "44% 44% 0 0", background: "#f4f2f0" }} />
      </div>
    </div>
  );
}

// ── channels interior (S7) ────────────────────────────────────────────────
// Every number is a full-decode measurement of breeze-hubspot.mp4 62.000-68.333
// (probes and per-frame traces in work/scenes/7/tools/). The window here is the
// S6 window carried on at its creep scale: ref 240,28 1440x1024, so app px =
// (ref - windowOrigin) * 1456/1440. CX/CY below map a measured ref coordinate
// into this interior's own space, whose origin is the page's top-left corner
// (rail right edge, top-bar bottom = ref 304, 71.5).
const CH_RAIL = 65.2;   // rail right edge in app px (ref 304)
const CH_HDR = 44.0;    // top-bar bottom in app px  (ref 71.5) - 4 less than
                        // TOPBAR_H, so the interior's white band trims the bar.
const CG = 1456 / 1440;                       // ref px -> app px
const CX = (refX) => (refX - 240) * CG - CH_RAIL;
const CY = (refY) => (refY - 28) * CG - CH_HDR;
const CS = (n) => n * CG;
/** line-box top for a wanted CAP top (system sans: ascent ~0.8em over baseline) */
const capT = (cap, fs, lh = fs * 1.2) => cap - (lh - fs) / 2 - 0.2 * fs;

const CH = {
  headH: CY(224),                       // white page-header band height
  navX: CX(328), navW: CS(252),         // left nav column
  navTx: CX(337.5), navPitch: CS(39.25),
  navTop: CY(255),                      // cap top of item 1
  hiTop: CY(398), hiH: CS(40),          // active item highlight box
  colX: CX(598),                        // text column (creds pill, h1, caption)
  tabX: CX(603.5), tabW: CS(1027.2),    // table / search pill / button block
  tabTop: CY(426.5), thH: CS(42.2) - 1, rowH: CS(73.8),
  pillY: CY(369), pillH: CS(39),
  btnX: CX(1469), btnW: CS(161),
  cols: [0, CS(451.2), CS(669.5), CS(849.1)],   // column lefts inside the table
  cellPad: CS(25.1),
};
const CH_LINE = "#e3e3e3";     // row separator   (measured 227,227,227)
const CH_BORDER = "#d1cfd2";   // table border    (measured 209,207,210)
const CH_THEAD = "#f6f1f7";    // header row fill (measured 246,241,247)
const CH_COLSEP = "#e5e2e7";   // header column rule
const CH_DARK = "#232324";     // Deploy button   (measured 35,35,36)
const CH_BLUE = "#2d7fcd";     // credits pill    (measured 45,127,205)
const CH_NAVHI = "#e5e5e4";    // active nav item box
const CH_PILLB = "#c1c1bf";    // search pill border

/** Column sort control: two solid triangles, measured 20 app px tall. */
const sortTri = (s) => (
  <svg width={s * 0.62} height={s} viewBox="0 0 10 16" style={{ display: "block" }}>
    <path d="M5 0.6 9.1 5.9H0.9Z" fill="#5c6469" />
    <path d="M5 15.4 0.9 10.1h8.2Z" fill="#5c6469" />
  </svg>
);

const chanIcon = (kind, col, s) => {
  switch (kind) {
    case "chat": return <svg width={s} height={s} viewBox="0 0 20 20"><path d="M3.5 4.5h13v9h-8l-3.4 3v-3H3.5Z" fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" /></svg>;
    case "mail": return <svg width={s} height={s} viewBox="0 0 20 20"><rect x="2.8" y="5" width="14.4" height="10.4" rx="1.4" fill="none" stroke={col} strokeWidth="1.6" /><path d="m3.4 6 6.6 5.2 6.6-5.2" fill="none" stroke={col} strokeWidth="1.6" /></svg>;
    case "call": return <svg width={s} height={s} viewBox="0 0 20 20"><path d="M13.4 5.4 7.5 11.3a2.6 2.6 0 0 0 3.7 3.7l6-6a4.2 4.2 0 0 0-6-6l-6.4 6.5" fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" /></svg>;
    case "wa": return <svg width={s} height={s} viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill={col} /><path d="M6.8 13.4c2.8 1.6 5.4 1 6.2-.6.4-.9-.3-1.4-1-1.7-.5-.2-1 .1-1.3.5-.9-.3-1.9-1.2-2.3-2.1.4-.3.7-.8.5-1.3-.2-.7-.8-1.4-1.7-1-1.6.8-2.2 3.4-.4 6.2Z" fill="#fff" /></svg>;
    case "msgr": return <svg width={s} height={s} viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill={col} /><path d="m5.4 12.6 3.4-3.6 2 1.9 3.8-3.4-3.4 3.7-2.1-1.9Z" fill="#fff" /></svg>;
    default: return null;
  }
};

/**
 * Page header for S7. Same measured geometry as the shared PageHead, but the
 * active-tab underline SLIDES Overview -> Manage: measured on the full decode,
 * the bar leaves Overview at 100 ms and lands on Manage at 233 ms, and the two
 * labels swap weight one frame later (267 ms). PageHead can only hold a fixed
 * `active`, so this stays local to the channels interior.
 */
function ChanHead(d, tMs) {
  const tabs = d.tabs ?? ["Overview", "Manage", "Analyze"];
  const TX = [CX(384) - 2.5, CX(501) - 2.5, CX(609) - 2.5];
  const UL = [CX(359.5), CX(469), CX(578)];
  const slide = chan(d.tabSlideKeys ?? [
    { atMs: 100, v: 0 }, { atMs: 233, v: 1, ease: "inout" },
  ], tMs, 0);
  const boldAt = d.tabBoldAtMs ?? 267;
  const act = tMs >= boldAt ? 1 : 0;
  const fsT = 17, fsTitle = 21;
  return (
    <>
      <div style={{ position: "absolute", left: -CH_RAIL, right: 0, top: -CH_HDR, height: CH.headH + CH_HDR, background: "#fff" }} />
      <div style={{ position: "absolute", left: CX(350) - 2.5, top: capT(CY(122), fsTitle), fontSize: fsTitle, fontWeight: 700, color: rgb(PLUM.ink), letterSpacing: 0.2 }}>{d.title ?? "Customer Agent"}</div>
      <div style={{
        position: "absolute", left: CX(1490), top: CY(116), width: CS(142), height: CS(40),
        borderRadius: 5, background: rgb(PLUM.lavBtn), color: rgb(PLUM.lavBtnInk),
        fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
      }}>{d.testLabel ?? "Test TitanAssist"}</div>
      {tabs.map((tb, i) => (
        <div key={i} style={{ position: "absolute", left: TX[i], top: capT(CY(196), fsT), fontSize: fsT, fontWeight: i === act ? 700 : 400, color: rgb(i === act ? PLUM.ink : PLUM.inkSoft) }}>{tb}</div>
      ))}
      <div style={{ position: "absolute", left: lerp(UL[0], UL[1], slide), top: CY(218), width: CS(124), height: CS(4.5), background: rgb(PLUM.ink) }} />
    </>
  );
}

function ChannelsInterior(d, tMs) {
  const rows = d.rows ?? [
    { c: "Website Chat", role: "Frontline agent", type: "Live chat", ic: "chat", ws: "Marketing Inbox" },
    { c: "Mobile App Chat", role: "Frontline agent", type: "Live chat", ic: "chat", ws: "Help Desk" },
    { c: "info@titangroup.com", role: "After-hours agent", type: "Email", ic: "mail", ws: "Sales Inbox" },
    { c: "help@titangroup.com", role: "After-hours agent", type: "Email", ic: "mail", ws: "Help Desk" },
    { c: "Main Business Line", sub: "+1 (555) 367-9846", role: "Backup agent", type: "Calling", ic: "call", ws: "Help Desk" },
    { c: "Support Line", sub: "+1 (555) 367-0833", role: "After-hours agent", type: "Calling", ic: "call", ws: "Help Desk" },
    { c: "Titan Specialty Equipment Group Support", sub: "+1 (555) 367-9878", role: "Frontline agent", type: "WhatsApp", ic: "wa", ws: "Help Desk" },
    { c: "Titan Specialty Equipment Group Facebook Page", role: "After-hours agent", type: "Messenger", ic: "msgr", ws: "Marketing Inbox" },
  ];
  const navItems = d.navItems ?? ["Agent Identity", "Knowledge sources", "Handoff rules", "Roles & responsibilities", "Deployment & channels"];
  // Measured cue onsets (scene-relative ms) and the measured entry: each block
  // switches on opaque, 27 ref px low, and settles exponentially (0.705 of the
  // remaining offset per frame — fitted on the Deploy button's top edge).
  const C = d.cues ?? {
    nav: [267, 400, 467, 533, 567], creds: 600, h1: 633, cap: 700,
    pill: 733, btn: 733, table: 833,
  };
  const RISE = CS(d.riseRef ?? 27), RDUR = d.riseMs ?? 380;
  // NB: must not carry a `display` key when visible - spreading one would wipe
  // the `display: flex` of the credits pill and the Deploy button.
  const ent = (atMs) => (seen(tMs, atMs)
    ? { transform: `translateY(${rise(tMs, atMs, RISE, RDUR).toFixed(2)}px)` }
    : { display: "none" });

  const th = (label, i) => {
    const w = (i < 3 ? CH.cols[i + 1] : CH.tabW) - CH.cols[i];
    return (
      <div key={i} style={{ position: "absolute", left: CH.cols[i], top: 0, width: w, height: CH.thH }}>
        {i > 0 ? <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 1, background: CH_COLSEP }} /> : null}
        <div style={{ position: "absolute", left: CH.cellPad, top: capT(CS(15.4), 13.9), fontSize: 13.9, fontWeight: 700, color: rgb(PLUM.ink) }}>{label}</div>
        <div style={{ position: "absolute", right: CS(19.4), top: CS(11) }}>{sortTri(CS(20))}</div>
      </div>
    );
  };

  return (
    <div style={{ position: "absolute", left: CH_RAIL, top: CH_HDR, right: 0, bottom: 0, background: rgb([246, 246, 244]), fontFamily: FONT, overflow: "hidden" }}>
      {ChanHead(d, tMs)}

      {/* left nav column */}
      <div style={{ position: "absolute", left: CH.navX, top: CH.hiTop, width: CH.navW, height: CH.hiH, background: CH_NAVHI, ...ent(C.nav[4]) }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: CS(5), background: "#3f4245" }} />
      </div>
      {navItems.map((n, i) => (
        <div key={i} style={{
          position: "absolute", left: CH.navTx, top: capT(CH.navTop + i * CH.navPitch, 15.5),
          fontSize: 15.5, fontWeight: 400, color: i === 4 ? rgb(PLUM.ink) : INK2,
          whiteSpace: "nowrap", ...ent(C.nav[i]),
        }}>{n}</div>
      ))}

      {/* section head */}
      <div style={{
        position: "absolute", left: CH.colX, top: CY(250.5), height: CS(20), borderRadius: CS(10),
        background: CH_BLUE, color: "#fff", fontSize: 11.7, fontWeight: 700, letterSpacing: 0.5,
        display: "flex", alignItems: "center", padding: `0 ${CS(10.5).toFixed(1)}px`, ...ent(C.creds),
      }}>{d.creditsLabel ?? "USES HUBSPOT CREDITS"}</div>
      <div style={{ position: "absolute", left: CH.colX, top: capT(CY(288), 21.8), fontSize: 21.8, fontWeight: 700, color: rgb(PLUM.ink), whiteSpace: "nowrap", ...ent(C.h1) }}>{d.sectionTitle ?? "Deployment and channels"}</div>
      <div style={{ position: "absolute", left: CH.colX, top: capT(CY(336), 17.4), fontSize: 17.4, color: rgb(PLUM.inkSoft), whiteSpace: "nowrap", ...ent(C.cap) }}>{d.caption ?? "Assign your customer agent to manage and respond to all customer interactions on a specific channel."}</div>

      {/* search pill + Deploy button */}
      <div style={{
        position: "absolute", left: CH.tabX, top: CH.pillY, width: CS(300.5), height: CH.pillH,
        borderRadius: CH.pillH / 2, border: `1.4px solid ${CH_PILLB}`, background: "#fff",
        boxSizing: "border-box", ...ent(C.pill),
      }}>
        <div style={{ position: "absolute", left: CS(18.5), top: capT(CS(13.5), 16), fontSize: 16, color: "#8c9195" }}>{d.searchPlaceholder ?? "Search"}</div>
        <div style={{ position: "absolute", right: CS(13.5), top: CS(9.5) }}>{I.search(CS(21), "#4d565c")}</div>
      </div>
      <div style={{
        position: "absolute", left: CH.btnX, top: CH.pillY, width: CH.btnW, height: CH.pillH,
        borderRadius: CS(5), background: CH_DARK, color: "#fff", fontSize: 14.9, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", ...ent(C.btn),
      }}>{d.deployLabel ?? "Deploy TitanAssist"}</div>

      {/* the channels table */}
      <div style={{
        position: "absolute", left: CH.tabX, top: CH.tabTop, width: CH.tabW,
        border: `1px solid ${CH_BORDER}`, borderRadius: CS(6), background: "#fff",
        boxSizing: "border-box", overflow: "hidden", ...ent(C.table),
      }}>
        <div style={{ position: "relative", height: CH.thH, boxSizing: "border-box", background: CH_THEAD, borderBottom: `1px solid ${CH_LINE}` }}>
          {["Channel", "Agent Role", "Type", "Workspace"].map((l, i) => th(l, i))}
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ position: "relative", height: CH.rowH, boxSizing: "border-box", borderBottom: i < rows.length - 1 ? `1px solid ${CH_LINE}` : "none" }}>
            <div style={{ position: "absolute", left: CH.cols[0] + CH.cellPad, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 14.8, lineHeight: `${CS(21)}px`, fontWeight: 700, color: rgb(PLUM.ink) }}>{r.c}</div>
              {r.sub ? <div style={{ fontSize: 12, lineHeight: `${CS(18)}px`, color: rgb(PLUM.inkFaint) }}>{r.sub}</div> : null}
            </div>
            <div style={{ position: "absolute", left: CH.cols[1] + CH.cellPad, top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: 14.8, color: INK2 }}>{r.role}</div>
            <div style={{ position: "absolute", left: CH.cols[2] + CH.cellPad, top: 0, bottom: 0, display: "flex", alignItems: "center", gap: CS(9) }}>
              {chanIcon(r.ic, "#4d565c", CS(19))}
              <span style={{ fontSize: 14.8, color: INK2 }}>{r.type}</span>
            </div>
            <div style={{ position: "absolute", left: CH.cols[3] + CH.cellPad, top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: 14.8, color: INK2 }}>{r.ws}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── the preset ────────────────────────────────────────────────────────────
export function PlumAdminWindow(cfg, t) {
  const from = cfg.startMs / 1000, to = (cfg.startMs + cfg.durationMs) / 1000;
  if (t < from - 0.001 || t > to + 0.001) return null;
  const tMs = (t - from) * 1000;
  const d = cfg.interior ?? { kind: "overview" };
  const win = { ...WIN, ...(cfg.window ?? {}) };
  const k = win.w / APP_W;
  const appH = win.h / k;

  let interior = null;
  if (d.kind === "overview") interior = OverviewInterior(d, tMs);
  else if (d.kind === "meet") interior = MeetInterior(d, tMs);
  else if (d.kind === "channels") interior = ChannelsInterior(d, tMs);

  // Optional (S5): a full-bleed measured ground behind the window. Oversized so
  // it stays full-bleed through the scene camera's punch/pan.
  const bg = cfg.bg
    ? <div style={{ position: "absolute", left: -6000, top: -6000, right: -6000, bottom: -6000, background: cfg.bg }} />
    : null;

  // Optional (S5): the window's drop shadow measured 240 ref px of blur at
  // alpha 0.29 AND it does NOT scale with the in-scene punch — post-punch the
  // ground falloff below the window is identical in screen px to pre-punch.
  // A camera scale(S) would blow the blur up 2.7x, so draw the shadow on a
  // counter-scaled plate: sized win*S then scale(1/S) => net scale 1 under the
  // camera, so its blur renders at the authored screen px either way.
  const S = cfg.shadowScale && tMs >= (cfg.shadowScaleAtMs ?? 0) ? cfg.shadowScale : 1;
  const shadow = cfg.shadow ?? "0 26px 70px rgba(40,36,44,0.20), 0 6px 18px rgba(40,36,44,0.10)";
  const plate = (
    <div style={{
      position: "absolute",
      left: win.x + win.w / 2 - (win.w * S) / 2, top: win.y + win.h / 2 - (win.h * S) / 2,
      width: win.w * S, height: win.h * S,
      transform: S === 1 ? "none" : `scale(${(1 / S).toFixed(6)})`, transformOrigin: "50% 50%",
      borderRadius: win.r * S, background: "#fff", boxShadow: shadow,
    }} />
  );

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {bg}
      {plate}
      <div style={{ position: "absolute", left: win.x, top: win.y, width: win.w, height: win.h, borderRadius: win.r, background: "#fff", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: APP_W, height: appH, transform: `scale(${k})`, transformOrigin: "0 0" }}>
          <TopBar searchLabel={cfg.searchLabel} account={cfg.account} accountInitials={cfg.accountInitials} />
          {cfg.rail === "measured" ? <OvRail h={appH} /> : <SideRail h={appH} />}
          {interior}
          <Pointer cur={cfg.cursor} tMs={tMs} />
        </div>
      </div>
    </div>
  );
}

export const note = "Floating admin window over a light ground: overview (pickup cards + agent-performance stat row), meet-the-agent (banner + get-started grid), deployment channels table. Punch-ins and pans via the per-scene camera; pointer keys ride in app space.";
export const nativeMs = 7900;
