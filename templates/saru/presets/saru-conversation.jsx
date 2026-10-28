/**
 * saru-conversation.jsx — the Saru operator portal, ONE conversation open.
 * S7 of the saru product film ("Take over anytime.").
 *
 * Same admin-window language as the rest of the film: one rounded app window
 * floating on the cream ground, saru top bar + left nav, everything a pure
 * function of t. The window rect, top bar, side nav, palette and caption rail
 * are the ones saru-dashboard.jsx (S6) uses, so S6 -> S7 cuts without the
 * chrome moving; only the BODY differs.
 *
 * Palette is the REAL Saru portal: cream ground #F7F4ED, ink #554A42,
 * secondary #786F68 / #8D8179, brick accent #B65243 (deep #7C3128 / #6F3029),
 * sage #496D53. No indigo anywhere in this window — the film's #4F46E5 lives
 * only in the Instagram-side scenes and the film grounds/captions.
 *
 * The mark: templates/saru/assets/saru-monkey-logo.svg, inlined here (the
 * bundle cannot fetch files at render time) with a tightened viewBox around
 * the drawn bbox so it sits square inside the top-bar tile. Stroke colour is
 * a prop, so the same geometry serves dark-on-light and light-on-dark.
 *
 * The three beats it plays, in order:
 *   1. the pointer walks to the response-mode control and CLICKS "Human"
 *      (glyph arrow -> hand entering the control, back to arrow on the click —
 *      the plum pointer convention); the knob slides Agent -> Human and the
 *      thread badge flips "Agent replying" -> brick "You're replying";
 *   2. the pointer clicks the COMPOSER, a brick focus ring lands on it, and a
 *      human reply types out character by character; the pointer clicks Send
 *      and the bubble lands in the thread;
 *   3. a skipped-comment chip rises in under the card, under a fading brick
 *      wash.
 * Everything else — the thread itself — is composed and DEAD STILL from frame
 * 0, so the cut delivers it and the only motion belongs to the beat at hand.
 */

import React from "react";
import { clamp01, lerp, easeOut, easeInOut } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";
import { I, chan } from "../../plum/presets/plum-shared.jsx";
import { SaruTile } from "./saru-mark-tile.jsx";

// ── palette (the real Saru portal) ────────────────────────────────────────
const BRICK = "#B65243";
const BRICK_DEEP = "#7C3128";
const BRICK_DEEPER = "#6F3029";
const BRICK_WASH = "#F3E4DE";
const SAGE = "#496D53";
const INK = "#554A42";
const INK2 = "#6A5F57";
const MUTED = "#786F68";
const FAINT = "#8D8179";
const LINE = "#E4DCD0";
const LINE_SOFT = "#EFE8DC";
const CARD = "#ffffff";
const PANE = "#FBF9F4";
const NAV_BG = "#FCFAF5";
const TRACK = "#EDE6DA";
const BUBBLE_IN = "#F1EBE0";

// ── window + interior geometry (stage px, 1280x720) ───────────────────────
const WIN = { x: 88, y: 40, w: 1104, h: 570, r: 14 };
const TOPBAR_H = 46;
const NAV_W = 216;
const PAD = 32;
const CONTENT_X = NAV_W + PAD;              // 248 window-local
const CONTENT_W = WIN.w - NAV_W - PAD * 2;  // 824
const CONTENT_R = CONTENT_X + CONTENT_W;    // 1072

const BACK_Y = 58;                          // "All conversations" row
const HEAD_Y = 78;                          // avatar / handle / control row
const AVA = 36;
const CTRL_W = 282, CTRL_H = 38, CTRL_PAD = 4;
const SEG_W = (CTRL_W - CTRL_PAD * 2) / 3;  // 91.33
const CTRL_X = CONTENT_R - CTRL_W;          // 790
const RULE_Y = 138;                         // divider under the header
const CARD_Y = 156, CARD_H = 332;           // thread card 156..488
const CARD_HEAD_H = 40;
const BUBBLE_PAD = 20;
const MSG_TOP = CARD_HEAD_H + 10;           // first bubble's top, card-local
const COMP_H = 58;                          // composer row, card-local bottom
const COMP_Y = CARD_H - COMP_H;             // 274
const FIELD_H = 42, FIELD_Y = COMP_Y + 8;   // 282..324
const SEND_W = 78, SEND_H = 34;
const SEND_X = CONTENT_W - BUBBLE_PAD - SEND_W;   // 726
const FIELD_X = BUBBLE_PAD;                       // 20
const FIELD_W = SEND_X - 12 - FIELD_X;            // 694
const CHIP_Y = 504;                         // skipped-comment chip 504..546

// ── bubble metrics (fixed, so the thread never reflows) ───────────────────
const B_FONT = 14, B_LINEH = 20, B_PADV = 10, B_PADH = 14, B_GAP = 11, B_MAXW = 460;

/** 0..1 across [at, at+dur], shaped by `ease`. Holds at the ends. */
const ramp = (tMs, at, dur, ease = easeOut) => ease(clamp01((tMs - at) / Math.max(1, dur)));
/** One symmetric 0->1->0 swell across [at, at+dur]. */
const swell = (tMs, at, dur) => {
  const u = clamp01((tMs - at) / Math.max(1, dur));
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u);
};

// ── nav icons (identical set to saru-dashboard) ───────────────────────────
const NAV_ICONS = {
  chat: (c) => <path d="M3.4 5.4a2 2 0 0 1 2-2h9.2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8.2L4.6 16.4v-3H5.4a2 2 0 0 1-2-2Z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />,
  rules: (c) => <g><path d="M3.6 6.4h12.8M3.6 13.6h12.8" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><circle cx="7.6" cy="6.4" r="2.1" fill="#fff" stroke={c} strokeWidth="1.5" /><circle cx="12.4" cy="13.6" r="2.1" fill="#fff" stroke={c} strokeWidth="1.5" /></g>,
  contacts: (c) => <g><circle cx="10" cy="7.4" r="2.9" fill="none" stroke={c} strokeWidth="1.5" /><path d="M4.4 16.2a5.6 5.6 0 0 1 11.2 0" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></g>,
  reports: (c) => <path d="M4.4 16.2V10m3.9 6.2V5.2m3.9 11v-3.6m3.9 3.6V7.8" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />,
};
const NavGlyph = ({ k, s, c }) => (
  <svg width={s} height={s} viewBox="0 0 20 20" style={{ display: "block" }}>{NAV_ICONS[k](c)}</svg>
);

const ChevLeft = ({ s, c }) => (
  <svg width={s} height={s} viewBox="0 0 20 20" style={{ display: "block" }}>
    <path d="M12 5 7 10l5 5" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "routed onward" — a line that turns and drops into an arrow head. */
const RouteGlyph = ({ s, c }) => (
  <svg width={s} height={s} viewBox="0 0 20 20" style={{ display: "block" }}>
    <path d="M3.4 6.2h6.2a3.4 3.4 0 0 1 3.4 3.4v4.2" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" />
    <path d="m10.4 11.6 2.6 2.8 2.6-2.8" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── pointer (stage space; the plum glyphs and click convention) ───────────
function Pointer({ cur, tMs }) {
  if (!cur || !cur.keys || !cur.keys.length) return null;
  const x = chan(cur.keys.map((k) => ({ atMs: k.atMs, v: k.x, ease: k.ease ?? "inout" })), tMs, cur.keys[0].x);
  const y = chan(cur.keys.map((k) => ({ atMs: k.atMs, v: k.y, ease: k.ease ?? "inout" })), tMs, cur.keys[0].y);
  const press = cur.press
    ? chan(cur.press.map((p) => ({ atMs: p.atMs, v: p.amount, ease: "linear" })), tMs, 0)
    : 0;
  const s = (cur.size ?? 26) * (1 - press * 0.12);

  let glyph = cur.glyph ?? "arrow", gdx = 0, gdy = 0;
  if (cur.glyphKeys && cur.glyphKeys.length) {
    let g = cur.glyphKeys[0];
    for (const k of cur.glyphKeys) if (tMs >= k.atMs) g = k;
    glyph = g.glyph; gdx = g.dx ?? 0; gdy = g.dy ?? 0;
  }
  const dx = press * 2 + gdx, dy = press * 2 + gdy;

  if (glyph === "hand") {
    return (
      <svg width={s * 1.47} height={s * 1.45} viewBox="0 0 24 28" style={{ position: "absolute", left: x + dx, top: y + dy, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.22))" }}>
        <path d="M9 2.6c1 0 1.8.8 1.8 1.8v7l1.2.2V9.2c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6v2.8l1.2.3v-2c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v2.7l1 .4c.8.3 1.3 1.2 1.1 2l-1.2 5.6a4 4 0 0 1-3.9 3.2H11a4 4 0 0 1-3.2-1.6l-4.4-5.8c-.5-.7-.4-1.7.3-2.2.7-.6 1.7-.5 2.3.2l1.2 1.4V4.4c0-1 .8-1.8 1.8-1.8Z" fill="#fff" stroke="#2A231E" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12.6 14.2v3.8M15.5 14.6v3.6M18.4 15.2v3.2" stroke="#2A231E" strokeWidth="1.05" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s * 1.5} viewBox="0 0 12 19" style={{ position: "absolute", left: x + dx, top: y + dy, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}>
      <path d="M1 1 L1 15.4 L4.4 12.2 L6.6 17.4 L9 16.4 L6.9 11.3 L11.3 11.3 Z" fill="#2A231E" stroke="#fff" strokeWidth="1.1" />
    </svg>
  );
}

// ── chrome ────────────────────────────────────────────────────────────────
function TopBar({ wordmark, initials }) {
  return (
    <div style={{
      position: "absolute", left: 0, top: 0, width: WIN.w, height: TOPBAR_H,
      background: "#ffffff", borderBottom: `1px solid ${LINE}`, boxSizing: "border-box",
    }}>
      {/* the shipped app tile, drawn by the shared SaruTile so every scene's
          mark is the same object */}
      <div style={{ position: "absolute", left: 22, top: 8 }}>
        <SaruTile size={30} radius={0.28} markFrac={0.7} border={1} borderAlpha={0.18} />
      </div>
      <div style={{
        position: "absolute", left: 61, top: 11, fontSize: 21, lineHeight: "24px",
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
            <NavGlyph k={n.ic} s={19} c={on ? BRICK : "#96897E"} />
            <span style={{ fontSize: 15, fontWeight: on ? 700 : 500, color: on ? BRICK_DEEP : INK2 }}>{n.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── the response-mode control ─────────────────────────────────────────────
/**
 * A three-up segmented control. The knob is the brick accent and its position
 * is ONE continuous channel (`sel`, in segment units), so the slide is the
 * whole state change — labels light by proximity to the knob, which means the
 * type crossfades exactly in step with the block passing under it.
 */
function ModeControl({ label, segments, sel }) {
  const knobX = CTRL_PAD + sel * SEG_W;
  return (
    <>
      <div style={{
        position: "absolute", left: CTRL_X, top: BACK_Y - 1, width: CTRL_W,
        textAlign: "right", fontSize: 12.5, fontWeight: 700, letterSpacing: 0.35, color: FAINT,
      }}>{label}</div>
      <div style={{
        position: "absolute", left: CTRL_X, top: HEAD_Y, width: CTRL_W, height: CTRL_H,
        borderRadius: 10, background: TRACK, border: `1px solid ${LINE}`, boxSizing: "border-box",
      }}>
        <div style={{
          position: "absolute", left: knobX, top: CTRL_PAD, width: SEG_W, height: CTRL_H - CTRL_PAD * 2 - 2,
          borderRadius: 8, background: BRICK, boxShadow: "0 2px 7px rgba(182,82,67,0.34)",
        }} />
        {segments.map((sg, i) => {
          const on = clamp01(1 - Math.abs(sel - i));
          return (
            <div key={i} style={{
              position: "absolute", left: CTRL_PAD + i * SEG_W, top: 0, width: SEG_W, height: CTRL_H - 2,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ position: "absolute", fontSize: 14, fontWeight: 600, color: MUTED, opacity: 1 - on }}>{sg}</span>
              <span style={{ position: "absolute", fontSize: 14, fontWeight: 700, color: "#ffffff", opacity: on }}>{sg}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── the thread ────────────────────────────────────────────────────────────
function Badge({ text, tone, style }) {
  const on = tone === "on";
  return (
    <div style={{
      height: 26, borderRadius: 999, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 7,
      background: on ? BRICK : TRACK, color: on ? "#ffffff" : MUTED,
      fontSize: 13.5, fontWeight: on ? 700 : 600, whiteSpace: "nowrap", boxSizing: "border-box",
      ...style,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: on ? "#ffffff" : "#A79A8F" }} />
      {text}
    </div>
  );
}

function Bubble({ b, style }) {
  const inbound = b.side === "in";
  return (
    <div style={{ display: "flex", justifyContent: inbound ? "flex-start" : "flex-end", ...style }}>
      <div style={{
        maxWidth: B_MAXW, padding: `${B_PADV}px ${B_PADH}px`, boxSizing: "border-box",
        background: inbound ? BUBBLE_IN : BRICK, color: inbound ? INK : "#ffffff",
        fontSize: B_FONT, lineHeight: `${B_LINEH}px`, fontWeight: 500, letterSpacing: -0.05,
        borderRadius: 14,
        borderBottomLeftRadius: inbound ? 5 : 14,
        borderBottomRightRadius: inbound ? 14 : 5,
      }}>
        {(b.lines ?? []).map((ln, i) => <div key={i}>{ln}</div>)}
      </div>
    </div>
  );
}

// ── the composer ──────────────────────────────────────────────────────────
/**
 * A real reply box: it takes FOCUS on a click (brick ring), a human types into
 * it character by character (graphemes, so the emoji never splits), and Send
 * lights only once there is something to send. On send the field empties and
 * the ring lets go — the message itself lands in the thread above.
 */
function Composer({ comp, tMs }) {
  const chars = Array.from(comp.text ?? "");
  const typeAt = comp.typeAtMs ?? 1e9, typeDur = comp.typeMs ?? 3600;
  const sendAt = comp.sendAtMs ?? 1e9;
  const focusAt = comp.focusAtMs ?? 1e9;

  const focusIn = ramp(tMs, focusAt, comp.focusMs ?? 280, easeOut);
  const focusOut = ramp(tMs, comp.blurAtMs ?? (sendAt + 200), comp.blurMs ?? 300, easeInOut);
  const focus = clamp01(focusIn - focusOut);

  const sent = tMs >= sendAt;
  const n = sent ? 0 : Math.round(chars.length * clamp01((tMs - typeAt) / Math.max(1, typeDur)));
  const shown = chars.slice(0, n).join("");
  const has = shown.length > 0;

  // Solid while the keys are moving, blinking while the field just waits.
  const typing = tMs >= typeAt && tMs < typeAt + typeDur;
  const caretOn = focus > 0.5 && (typing || Math.floor((tMs - focusAt) / 530) % 2 === 0);

  // Send wakes on the first character and lets go a beat after the click.
  const live = clamp01(ramp(tMs, typeAt, 220, easeOut) - ramp(tMs, sendAt + 70, 230, easeInOut));
  const punch = 1 - 0.045 * swell(tMs, sendAt - 50, 260);

  const caret = caretOn ? (
    <span style={{
      display: "inline-block", width: 1.6, height: 17,
      background: INK, borderRadius: 1,
    }} />
  ) : null;

  return (
    <div style={{
      position: "absolute", left: 0, top: COMP_Y, width: "100%", height: COMP_H,
      borderTop: `1px solid ${LINE_SOFT}`, boxSizing: "border-box",
    }}>
      <div style={{
        position: "absolute", left: FIELD_X, top: 8, width: FIELD_W, height: FIELD_H,
        borderRadius: 10, boxSizing: "border-box",
        background: focus > 0.02 ? "#ffffff" : "#FCFAF6",
        border: `1px solid ${focus > 0.02 ? BRICK : LINE}`,
        boxShadow: focus > 0.02 ? `0 0 0 ${(3 * focus).toFixed(2)}px rgba(182,82,67,${(0.20 * focus).toFixed(3)})` : "none",
      }}>
        <div style={{
          position: "absolute", left: 14, top: 0, right: 14, height: FIELD_H,
          display: "flex", alignItems: "center",
          fontSize: 14, fontWeight: 500, letterSpacing: -0.05, whiteSpace: "pre",
          color: has ? INK : FAINT,
        }}>
          {/* An empty field carries the caret at position 0, ahead of the
              placeholder — a caret trailing placeholder type reads as text. */}
          {has ? null : caret}
          <span style={{ marginLeft: has ? 0 : 1.5 }}>{has ? shown : (comp.placeholder ?? "")}</span>
          {has ? <span style={{ marginLeft: 1.5, display: "inline-flex" }}>{caret}</span> : null}
        </div>
      </div>

      <div style={{
        position: "absolute", left: SEND_X, top: 12, width: SEND_W, height: SEND_H,
        borderRadius: 9, boxSizing: "border-box",
        background: live > 0 ? BRICK : TRACK,
        opacity: live > 0 ? 1 : 1,
        transform: `scale(${punch.toFixed(4)})`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ position: "absolute", fontSize: 13.5, fontWeight: 700, color: FAINT, opacity: 1 - live }}>{comp.send ?? "Send"}</span>
        <span style={{ position: "absolute", fontSize: 13.5, fontWeight: 700, color: "#ffffff", opacity: live }}>{comp.send ?? "Send"}</span>
      </div>
    </div>
  );
}

function ThreadCard({ thread, comp, tMs }) {
  const f = thread.flip ?? {};
  const at = f.atMs ?? 1e9, dur = f.durMs ?? 280;
  const g = ramp(tMs, at, dur, easeOut);
  const bump = 1 + 0.055 * swell(tMs, at, dur + 120);

  const bubbles = thread.bubbles ?? [];
  const reply = thread.reply;
  const rp = reply ? ramp(tMs, reply.atMs ?? 1e9, reply.inMs ?? 290, easeOut) : 0;

  return (
    <div style={{
      position: "absolute", left: CONTENT_X, top: CARD_Y, width: CONTENT_W, height: CARD_H,
      background: CARD, border: `1px solid ${LINE}`, borderRadius: 10, boxSizing: "border-box", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: CARD_HEAD_H, borderBottom: `1px solid ${LINE_SOFT}` }}>
        <div style={{ position: "absolute", left: 18, top: 7, height: 26 }}>
          <Badge text={thread.badgeBefore} tone="off" style={{ position: "absolute", left: 0, top: 0, opacity: 1 - g }} />
          <Badge text={thread.badgeAfter} tone="on" style={{
            position: "absolute", left: 0, top: 0, opacity: g,
            transform: `scale(${bump.toFixed(4)})`, transformOrigin: "0% 50%",
          }} />
        </div>
        <div style={{ position: "absolute", right: 18, top: 12, fontSize: 12.5, color: FAINT, fontWeight: 500 }}>{thread.time}</div>
      </div>

      {/* Top-anchored: the reply's slot is reserved from frame 0, so when it
          lands nothing above it moves. */}
      <div style={{
        position: "absolute", left: BUBBLE_PAD, right: BUBBLE_PAD, top: MSG_TOP,
        display: "flex", flexDirection: "column", gap: B_GAP,
      }}>
        {bubbles.map((b, i) => <Bubble key={i} b={b} />)}
        {reply ? (
          <Bubble b={{ side: "out", lines: reply.lines }} style={{
            opacity: rp, transform: `translateY(${(10 * (1 - rp)).toFixed(2)}px)`,
          }} />
        ) : null}
      </div>

      {comp ? <Composer comp={comp} tMs={tMs} /> : null}
    </div>
  );
}

// ── the skipped-comment chip ──────────────────────────────────────────────
function SkipChip({ skip, tMs }) {
  const at = skip.atMs ?? 1e9;
  const inDur = skip.inMs ?? 460;
  const a = ramp(tMs, at, inDur, easeOut);
  if (a <= 0.002) return null;
  const dy = lerp(14, 0, a);
  const wash = 0.10 * (1 - ramp(tMs, at + inDur, skip.washMs ?? 780, easeInOut));

  return (
    <div style={{
      position: "absolute", left: CONTENT_X, top: CHIP_Y + dy, height: 42,
      display: "inline-flex", alignItems: "center", gap: 11, paddingLeft: 17, paddingRight: 19,
      background: CARD, border: `1px solid ${LINE}`, borderRadius: 9, boxSizing: "border-box",
      opacity: a, overflow: "hidden",
      boxShadow: "0 2px 8px rgba(85,74,66,0.07)",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: BRICK }} />
      <div style={{ position: "absolute", inset: 0, background: `rgba(182,82,67,${wash.toFixed(3)})` }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}><RouteGlyph s={18} c={BRICK} /></div>
      <div style={{ position: "relative", fontSize: 15, fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>{skip.text}</div>
    </div>
  );
}

// ── camera (inside the preset so the caption can stay pinned) ─────────────
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
export function SaruConversation(cfg, t) {
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
  const head = cfg.header ?? {};
  const mode = cfg.mode ?? {};
  const thread = cfg.thread ?? {};
  const skip = cfg.skip;

  // The selection is one channel in segment units: 0 = first segment.
  const sel = chan([
    { atMs: mode.atMs ?? 1e9, v: mode.from ?? 0 },
    { atMs: (mode.atMs ?? 1e9) + (mode.durMs ?? 340), v: mode.to ?? 0, ease: "inout" },
  ], tMs, mode.from ?? 0);

  const cap = cfg.caption;
  const cin = cap ? ramp(tMs, cap.inAtMs ?? 900, cap.inMs ?? 440, easeOut) : 0;
  const cout = cap && cap.outAtMs != null ? ramp(tMs, cap.outAtMs, cap.outMs ?? 380, easeInOut) : 0;
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

          {/* page header: back row, contact, response-mode control */}
          <div style={{ position: "absolute", left: CONTENT_X, top: BACK_Y - 2, display: "flex", alignItems: "center", gap: 3 }}>
            <ChevLeft s={15} c={FAINT} />
            <span style={{ fontSize: 13, fontWeight: 500, color: MUTED }}>{head.back}</span>
          </div>
          <div style={{
            position: "absolute", left: CONTENT_X, top: HEAD_Y, width: AVA, height: AVA, borderRadius: AVA / 2,
            background: head.tint ?? BRICK_WASH, color: head.tintInk ?? BRICK_DEEPER,
            fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
          }}>{head.initial}</div>
          <div style={{
            position: "absolute", left: CONTENT_X + AVA + 13, top: HEAD_Y - 2,
            fontSize: 21, fontWeight: 700, color: INK, letterSpacing: -0.3,
          }}>{head.handle}</div>
          <div style={{
            position: "absolute", left: CONTENT_X + AVA + 13, top: HEAD_Y + 24,
            fontSize: 13.5, fontWeight: 500, color: MUTED,
          }}>{head.sub}</div>
          <ModeControl label={mode.label ?? "Response mode"} segments={mode.segments ?? []} sel={sel} />

          <div style={{ position: "absolute", left: CONTENT_X, top: RULE_Y, width: CONTENT_W, height: 1, background: LINE }} />

          <ThreadCard thread={thread} comp={cfg.composer} tMs={tMs} />
          {skip ? <SkipChip skip={skip} tMs={tMs} /> : null}
        </div>

        <Pointer cur={cfg.cursor} tMs={tMs} />
      </div>

      {cap && capA > 0.002 ? (
        <div style={{
          position: "absolute", left: 0, right: 0, top: (cap.y ?? 646) + capDy,
          textAlign: "center", opacity: capA,
          fontSize: cap.size ?? 27, fontWeight: 500, color: cap.colour ?? "#16181C", letterSpacing: -0.2,
        }}>{cap.text}</div>
      ) : null}
    </div>
  );
}

export const note = "Saru operator portal with ONE conversation open, in the real portal palette (cream ground, brick accent, monkey mark in a light-grey tile beside the lowercase wordmark): the same floating window chrome as saru-dashboard over a thread card — response-mode segmented control [Agent | Copilot | Human] top-right, a thread badge that flips when the operator takes over, a COMPOSER at the foot of the card that takes focus and types a human reply out character by character before Send lands it in the thread, and a skipped-comment chip that rises in underneath. A stage-space pointer does all three clicks. Camera (cfg.view) lives inside the preset so the caption stays pinned.";
export const nativeMs = 12000;
