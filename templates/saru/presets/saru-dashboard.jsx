/**
 * saru-dashboard.jsx — the Saru operator portal, S6 of the saru product film
 * ("Minutes later, it's in your dashboard.").
 *
 * Cast from the verified plum admin-window language: one rounded app window
 * floating on an off-white ground with a soft drop shadow, left nav + main
 * pane, everything drawn as a pure function of t (no CSS animation). The plum
 * interiors themselves could not carry this shot — `channels` has a table but
 * hard-coded channel columns and no metric tiles or row insertion, `overview`
 * has a stat row but no table — so the interior is drawn here while the shared
 * keyframe/easing kit (chan, pop, I, FONT) is imported from plum-shared.
 *
 * Two things this preset does that plum-admin-window does not:
 *   1. The camera lives INSIDE the preset (cfg.view) so the caption layer can
 *      stay pinned and unscaled while the window pushes in. Keys are
 *      {atMs, scale, focusX, focusY}: the stage point (focusX,focusY) is
 *      mapped to frame centre at that scale, so scale 1 + focus (640,360) is
 *      the identity rest pose.
 *   2. A table row can be INSERTED at the top (cfg.table.newRow): the row's
 *      height grows from 0 while its content slides down out from under the
 *      header, so the existing rows are pushed down by the layout itself.
 *
 * Brand: the REAL Saru operator portal — cream ground, white top bar carrying
 * the monkey mark and a brick lowercase "saru" wordmark, brick #b65243 as the
 * primary accent and sage #496d53 as the positive. No indigo lives in here.
 */

import React from "react";
import { clamp01, lerp, easeOut, easeInOut } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";
import { I } from "../../plum/presets/plum-shared.jsx";
// The brand's line-art monkey, shared with the tile preset so the mark is the
// SAME artwork in every saru scene rather than a second copy that can drift.
import { SaruMonkeyMark } from "./saru-mark-tile.jsx";

// ── palette (sampled from the real Saru dashboard app) ────────────────────
const BRICK = "#b65243";       // primary accent
const BRICK_DEEP = "#7c3128";  // deep variant — chip ink on a brick wash
const BRICK_WASH = "#F5E4E0";  // warm cream-brick tint
const SAGE = "#496d53";        // success / positive
const SAGE_WASH = "#E4EDE5";
const INK = "#554a42";
const INK2 = "#786f68";
const MUTED = "#8d8179";
const FAINT = "#A79C93";
const LINE = "#E7DFD2";
const LINE_SOFT = "#F0E9DE";
const CARD = "#ffffff";
const PANE = "#FBF9F4";        // portal cream, a half-step off the film ground
const NAV_BG = "#FDFBF7";
const TOPBAR_BG = "#ffffff";

const CHIP = {
  sage: { bg: SAGE_WASH, ink: SAGE },
  brick: { bg: BRICK_WASH, ink: BRICK_DEEP },
  neutral: { bg: "#EFE9DF", ink: INK2 },
  green: { bg: SAGE_WASH, ink: SAGE },
  amber: { bg: "#F6E9D7", ink: "#8A5A1B" },
  slate: { bg: "#ECE6DC", ink: MUTED },
};

// ── window + interior geometry (stage px, 1280x720) ───────────────────────
const WIN = { x: 88, y: 40, w: 1104, h: 570, r: 14 };
const TOPBAR_H = 46;
const NAV_W = 216;
const PAD = 32;
const CONTENT_X = NAV_W + PAD;              // 248 window-local
const CONTENT_W = WIN.w - NAV_W - PAD * 2;  // 824

const TITLE_Y = 66;
const TILE_Y = 108, TILE_H = 88, TILE_GAP = 18;
const TILE_W = (CONTENT_W - TILE_GAP * 2) / 3;
const TAB_Y = 224, TH_H = 42, ROW_H = 54;
const COLS = [0, 258, 480, 724];            // Contact | Status | Email | Updated
const CELL_PAD = 18;

// ── beat clock (scene-relative ms) ────────────────────────────────────────
const T = {
  capIn: 900, capInDur: 430,
  capOut: 6300, capOutDur: 380,
  rowIn: 2900, rowInDur: 560,
  washOut: 3500, washOutDur: 780,
  pulse: 4300, pulseDur: 640,
  tick: 5300, tickDur: 420,
  plusIn: 5300, plusRiseDur: 760, plusOut: 5850, plusOutDur: 380,
};

/** 0..1 across [at, at+dur], shaped by `ease`. Holds at the ends. */
const ramp = (tMs, at, dur, ease = easeOut) => ease(clamp01((tMs - at) / Math.max(1, dur)));
/** One symmetric 0->1->0 swell across [at, at+dur]. */
const swell = (tMs, at, dur) => {
  const u = clamp01((tMs - at) / Math.max(1, dur));
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u);
};

// ── nav icons (drawn, 20x20 viewbox like plum's kit) ──────────────────────
const NAV_ICONS = {
  chat: (c) => <path d="M3.4 5.4a2 2 0 0 1 2-2h9.2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8.2L4.6 16.4v-3H5.4a2 2 0 0 1-2-2Z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />,
  rules: (c) => <g><path d="M3.6 6.4h12.8M3.6 13.6h12.8" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><circle cx="7.6" cy="6.4" r="2.1" fill="#fff" stroke={c} strokeWidth="1.5" /><circle cx="12.4" cy="13.6" r="2.1" fill="#fff" stroke={c} strokeWidth="1.5" /></g>,
  contacts: (c) => <g><circle cx="10" cy="7.4" r="2.9" fill="none" stroke={c} strokeWidth="1.5" /><path d="M4.4 16.2a5.6 5.6 0 0 1 11.2 0" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></g>,
  reports: (c) => <path d="M4.4 16.2V10m3.9 6.2V5.2m3.9 11v-3.6m3.9 3.6V7.8" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />,
};
const NavGlyph = ({ k, s, c }) => (
  <svg width={s} height={s} viewBox="0 0 20 20" style={{ display: "block" }}>{NAV_ICONS[k](c)}</svg>
);

const MailGlyph = ({ s, c }) => (
  <svg width={s} height={s} viewBox="0 0 20 20" style={{ display: "block" }}>
    <rect x="2.8" y="4.9" width="14.4" height="10.2" rx="2" fill="none" stroke={c} strokeWidth="1.6" />
    <path d="m3.6 6 6.4 5 6.4-5" fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

// ── chrome ────────────────────────────────────────────────────────────────
function TopBar({ wordmark, initials }) {
  return (
    <div style={{
      position: "absolute", left: 0, top: 0, width: WIN.w, height: TOPBAR_H,
      background: TOPBAR_BG, borderBottom: `1px solid ${LINE}`, boxSizing: "border-box",
    }}>
      {/* mark first, wordmark beside it — the real portal's top-bar lockup */}
      <div style={{ position: "absolute", left: 22, top: 10 }}><SaruMonkeyMark w={27} colour={[85, 74, 66]} /></div>
      <div style={{
        position: "absolute", left: 58, top: 11, fontSize: 21, lineHeight: "24px",
        fontWeight: 800, letterSpacing: -0.4, color: BRICK,
      }}>{wordmark}</div>
      <div style={{ position: "absolute", right: 128, top: 13 }}>{I.search(20, FAINT)}</div>
      <div style={{ position: "absolute", right: 92, top: 13 }}>{I.bell(20, FAINT)}</div>
      <div style={{
        position: "absolute", right: 24, top: 9, width: 28, height: 28, borderRadius: 14,
        background: BRICK_WASH, color: BRICK_DEEP, fontSize: 11.5, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: 0.2,
      }}>{initials}</div>
    </div>
  );
}

function SideNav({ items, active }) {
  const top = 74, pitch = 44;
  return (
    <div style={{
      position: "absolute", left: 0, top: TOPBAR_H, width: NAV_W, bottom: 0,
      background: NAV_BG, borderRight: `1px solid ${LINE}`, boxSizing: "border-box",
    }}>
      {items.map((n, i) => {
        const on = i === active;
        return (
          <div key={i} style={{
            position: "absolute", left: 14, top: top - TOPBAR_H + i * pitch, width: NAV_W - 28, height: 36,
            borderRadius: 8, background: on ? BRICK_WASH : "transparent",
            display: "flex", alignItems: "center", gap: 11, paddingLeft: 12, boxSizing: "border-box",
          }}>
            <NavGlyph k={n.ic} s={19} c={on ? BRICK : "#9A8F86"} />
            <span style={{ fontSize: 15, fontWeight: on ? 700 : 500, color: on ? BRICK_DEEP : INK2 }}>{n.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── metric tiles ──────────────────────────────────────────────────────────
/** The first tile rolls its value like an odometer and floats a "+1" chip. */
function Tiles({ tiles, tMs }) {
  const roll = ramp(tMs, T.tick, T.tickDur, easeInOut);
  const plusRise = ramp(tMs, T.plusIn, T.plusRiseDur, easeOut);
  const plusA = clamp01(ramp(tMs, T.plusIn, 170, easeOut) - ramp(tMs, T.plusOut, T.plusOutDur, easeInOut));
  const VH = 42; // value line box height (clip window for the roll)

  return tiles.map((tl, i) => {
    const x = CONTENT_X + i * (TILE_W + TILE_GAP);
    const rolls = tl.from != null && tl.from !== tl.value;
    return (
      <div key={i} style={{
        position: "absolute", left: x, top: TILE_Y, width: TILE_W, height: TILE_H,
        background: CARD, border: `1px solid ${LINE}`, borderRadius: 10, boxSizing: "border-box",
      }}>
        <div style={{ position: "absolute", left: 18, top: 15, fontSize: 14, fontWeight: 500, color: MUTED }}>{tl.label}</div>
        <div style={{ position: "absolute", left: 18, top: 36, width: TILE_W - 36, height: VH, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: rolls ? -VH * roll : 0 }}>
            {rolls ? (
              <div style={{ height: VH, fontSize: 34, lineHeight: `${VH}px`, fontWeight: 700, color: INK, letterSpacing: -0.6 }}>{tl.from}</div>
            ) : null}
            <div style={{ height: VH, fontSize: 34, lineHeight: `${VH}px`, fontWeight: 700, color: INK, letterSpacing: -0.6 }}>{tl.value}</div>
          </div>
        </div>
        {rolls && plusA > 0.002 ? (
          <div style={{
            // rides beside the digits, inside the value band — rising into the
            // label above it reads as a collision, not as a delta.
            position: "absolute", left: 18 + 66, top: 52 - 14 * plusRise,
            height: 22, borderRadius: 11, padding: "0 9px", background: SAGE_WASH,
            color: SAGE, fontSize: 13, fontWeight: 700, opacity: plusA,
            display: "flex", alignItems: "center",
          }}>+1</div>
        ) : null}
      </div>
    );
  });
}

// ── table ─────────────────────────────────────────────────────────────────
const Avatar = ({ tint, ink, ch }) => (
  <div style={{
    width: 28, height: 28, borderRadius: 14, background: tint, color: ink,
    fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
  }}>{ch}</div>
);

function Row({ r, tMs, isNew }) {
  // The email chip pulses exactly once: a small scale swell plus a ring that
  // expands out of the chip edge and fades.
  const g = isNew ? ramp(tMs, T.pulse, T.pulseDur, (u) => u) : 0;
  const sw = isNew ? swell(tMs, T.pulse, T.pulseDur) : 0;
  const bump = 1 + 0.09 * sw;
  const ring = isNew && g > 0 && g < 1
    ? `0 0 0 ${(14 * g).toFixed(2)}px rgba(182,82,67,${(0.30 * (1 - g)).toFixed(3)})`
    : "none";
  const c = CHIP[r.tone] ?? CHIP.neutral;

  return (
    <div style={{ position: "relative", height: ROW_H, boxSizing: "border-box", borderTop: `1px solid ${LINE_SOFT}` }}>
      {isNew ? <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: BRICK }} /> : null}
      <div style={{ position: "absolute", left: COLS[0] + CELL_PAD, top: 0, bottom: 0, display: "flex", alignItems: "center", gap: 11 }}>
        <Avatar tint={r.tint} ink={r.tintInk} ch={r.initial} />
        <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>{r.handle}</span>
      </div>
      <div style={{ position: "absolute", left: COLS[1] + CELL_PAD, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
        <div style={{
          height: 26, borderRadius: 6, padding: "0 10px", background: c.bg, color: c.ink,
          fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center",
        }}>{r.status}</div>
      </div>
      <div style={{ position: "absolute", left: COLS[2] + CELL_PAD, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
        {r.email ? (
          <div style={{
            height: 28, borderRadius: 7, padding: "0 11px", background: "#FCF2EF",
            border: `1px solid ${BRICK}`, color: BRICK_DEEP, fontSize: 13.5, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 7, boxSizing: "border-box",
            transform: `scale(${bump.toFixed(4)})`, transformOrigin: "0% 50%", boxShadow: ring,
          }}>
            <MailGlyph s={15} c={BRICK} />
            {r.email}
          </div>
        ) : (
          // en dash, not em: the director's em-dash ban covers every human-facing label
          <span style={{ fontSize: 14, color: "#C2B7AB" }}>–</span>
        )}
      </div>
      <div style={{ position: "absolute", left: COLS[3] + CELL_PAD, top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: 13.5, color: MUTED }}>{r.at}</div>
    </div>
  );
}

function Table({ tab, tMs }) {
  const rows = tab.rows ?? [];
  const nr = tab.newRow;
  // Row insertion: the wrapper's height grows 0 -> ROW_H while the row content
  // slides down out from under the header, so the rows below are pushed down
  // by the layout rather than by a second animation.
  const p = nr ? ramp(tMs, T.rowIn, T.rowInDur, easeOut) : 0;
  const washA = nr
    ? 0.11 * (1 - ramp(tMs, T.washOut, T.washOutDur, easeInOut))
    : 0;
  const headers = tab.headers ?? ["Contact", "Status", "Email", "Updated"];

  return (
    <div style={{
      position: "absolute", left: CONTENT_X, top: TAB_Y, width: CONTENT_W,
      background: CARD, border: `1px solid ${LINE}`, borderRadius: 10,
      boxSizing: "border-box", overflow: "hidden",
    }}>
      <div style={{ position: "relative", height: TH_H, background: "#FAF6EE", borderBottom: `1px solid ${LINE}` }}>
        {headers.map((h, i) => (
          <div key={i} style={{
            position: "absolute", left: COLS[i] + CELL_PAD, top: 0, bottom: 0,
            display: "flex", alignItems: "center", fontSize: 12.5, fontWeight: 700,
            letterSpacing: 0.35, color: MUTED,
          }}>{h}</div>
        ))}
      </div>
      {nr ? (
        <div style={{ position: "relative", height: ROW_H * p, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: -(ROW_H * (1 - p)) }}>
            <div style={{ position: "relative", background: `rgba(182,82,67,${washA.toFixed(3)})` }}>
              <Row r={nr} tMs={tMs} isNew />
            </div>
          </div>
        </div>
      ) : null}
      {rows.map((r, i) => <Row key={i} r={r} tMs={tMs} isNew={false} />)}
    </div>
  );
}

// ── camera (inside the preset so the caption can stay pinned) ─────────────
/**
 * Keys: [{atMs, scale, focusX, focusY, ease}]. The stage point (focusX,focusY)
 * lands on frame centre at that scale — so {scale:1, focus:(640,360)} is rest.
 */
function cameraAt(view, tMs, W, H) {
  const keys = view && view.keys && view.keys.length
    ? view.keys
    : [{ atMs: 0, scale: 1, focusX: W / 2, focusY: H / 2 }];
  let prev = { scale: 1, focusX: W / 2, focusY: H / 2 };
  const ks = keys.map((k) => (prev = {
    atMs: k.atMs ?? 0,
    scale: k.scale ?? prev.scale,
    focusX: k.focusX ?? prev.focusX,
    focusY: k.focusY ?? prev.focusY,
    ease: k.ease ?? "inout",
  }));
  let cur = ks[ks.length - 1];
  if (tMs <= ks[0].atMs) cur = ks[0];
  else {
    for (let i = 0; i < ks.length - 1; i++) {
      const a = ks[i], b = ks[i + 1];
      if (tMs < b.atMs) {
        const u = clamp01((tMs - a.atMs) / Math.max(1e-6, b.atMs - a.atMs));
        const e = b.ease === "linear" ? u : b.ease === "out" ? easeOut(u) : easeInOut(u);
        cur = {
          scale: lerp(a.scale, b.scale, e),
          focusX: lerp(a.focusX, b.focusX, e),
          focusY: lerp(a.focusY, b.focusY, e),
        };
        break;
      }
    }
  }
  const s = cur.scale;
  return { s, tx: W / 2 - cur.focusX * s, ty: H / 2 - cur.focusY * s };
}

// ── the preset ────────────────────────────────────────────────────────────
export function SaruDashboard(cfg, t) {
  const from = cfg.startMs / 1000, to = (cfg.startMs + cfg.durationMs) / 1000;
  if (t < from - 0.001 || t > to + 0.001) return null;
  const tMs = (t - from) * 1000;

  const W = cfg.stageW ?? 1280, H = cfg.stageH ?? 720;
  const win = { ...WIN, ...(cfg.window ?? {}) };
  const cam = cameraAt(cfg.view, tMs, W, H);

  const nav = cfg.nav ?? [
    { label: "Conversations", ic: "chat" },
    { label: "Rules", ic: "rules" },
    { label: "Contacts", ic: "contacts" },
    { label: "Reports", ic: "reports" },
  ];
  const tiles = cfg.tiles ?? [];
  const tab = cfg.table ?? {};

  // caption: rises in, holds, lifts away — drawn OUTSIDE the camera so the
  // push-in never drags it off the ground.
  const cap = cfg.caption;
  const cin = ramp(tMs, T.capIn, T.capInDur, easeOut);
  const cout = cap && cap.outAtMs != null ? ramp(tMs, cap.outAtMs, T.capOutDur, easeInOut) : ramp(tMs, T.capOut, T.capOutDur, easeInOut);
  const capA = clamp01(cin - cout);
  const capDy = lerp(16, 0, cin) - 7 * cout;

  return (
    <div style={{ position: "absolute", inset: 0, background: cfg.ground ?? "#F7F4ED", overflow: "hidden", fontFamily: FONT }}>
      <div style={{
        position: "absolute", inset: 0,
        transform: `translate(${cam.tx.toFixed(2)}px, ${cam.ty.toFixed(2)}px) scale(${cam.s.toFixed(4)})`,
        transformOrigin: "0 0",
      }}>
        <div style={{
          position: "absolute", left: win.x, top: win.y, width: win.w, height: win.h,
          borderRadius: win.r, background: PANE, overflow: "hidden",
          boxShadow: cfg.shadow ?? "0 26px 72px rgba(85,74,66,0.16), 0 3px 10px rgba(85,74,66,0.07)",
        }}>
          <TopBar wordmark={cfg.wordmark ?? "saru"} initials={cfg.accountInitials ?? "AR"} />
          <SideNav items={nav} active={cfg.navActive ?? 0} />
          <div style={{
            position: "absolute", left: CONTENT_X, top: TITLE_Y,
            fontSize: 24, fontWeight: 700, color: INK, letterSpacing: -0.3,
          }}>{cfg.pageTitle ?? "Conversations"}</div>
          <Tiles tiles={tiles} tMs={tMs} />
          <Table tab={tab} tMs={tMs} />
        </div>
      </div>

      {cap && capA > 0.002 ? (
        <div style={{
          position: "absolute", left: 0, right: 0, top: (cap.y ?? 644) + capDy,
          textAlign: "center", opacity: capA,
          fontSize: cap.size ?? 27, fontWeight: 500, color: cap.colour ?? INK, letterSpacing: -0.2,
        }}>{cap.text}</div>
      ) : null}
    </div>
  );
}

export const note = "The REAL Saru operator portal: a floating app window on a cream ground (#f7f4ed) — white top bar carrying the monkey mark and a brick lowercase saru wordmark, left nav (Conversations/Rules/Contacts/Reports) with a brick-tinted active pill, three metric tiles whose first value can roll with a floating sage +1, and a conversations table into whose top a NEW row slides in under a warm cream-brick wash carrying a brick-outlined email chip that pulses once. Palette is brick #b65243 / deep #7c3128, sage #496d53, ink #554a42 on warm neutrals; no indigo. Camera (cfg.view) lives inside the preset so the caption layer stays pinned while the window pushes in.";
export const nativeMs = 11000;
