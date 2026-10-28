/**
 * plum-chat-wide.jsx — the WIDE desktop chat passage (Breeze reference S3,
 * 16.833 -> 40.400s).
 *
 * S2 shows a narrow mobile-format widget; S3 shows a much taller desktop one
 * and holds it for 23.5 seconds while the camera pulls back. Everything here
 * is measured off full-decode frames (1920x1080@30; stage px = frame px / 1.5):
 *
 *   widget      504 x 914 stage px at (392, 45.83); header 110; radius 8
 *               (left edge 587.8, right 1343.8 frame px at camera scale 1)
 *   type        body 19.6px, baseline pitch 30.2, -0.2px tracking (tracking is
 *               what puts the line BREAKS back where the reference has them:
 *               "You'll find product specs," measures 195.5 thread px); bubble
 *               315 wide with 25px side padding (text column 265); paragraph
 *               break = one extra pitch; bubble padding 14 / 12 and a 14px
 *               time line 15.6 below the last line — a 3-line bubble measures
 *               149 stage px tall, an 8-line-plus-2-breaks bubble 360
 *   layout      thread padding-left 35 (avatar), bubble indent 82.9;
 *               avatar+label row 20.8 tall, shown ONLY when the side changes
 *               (consecutive bot messages run on); gaps 12.4 bot->customer,
 *               24.4 customer->bot, 15.5 same side
 *   header      mark 51 dia at (29.7, 20); name 20.5 bold; sub 16 — the
 *               header content sits HIGH in the band, not centred
 *   composer    442 x 59 pill, 52 above the widget bottom
 *   colours     header rgb(5,67,62), customer bubble rgb(18,76,72),
 *               bot bubble rgb(240,240,240), page ground rgb(249,249,247)
 *
 * MOTION owned here (the camera pull-back is the per-scene `camera`):
 *   panelKeys   the widget's page-space translateY. Measured as a CONSTANT
 *               -6.626 stage px/s from the punch-out at 18.700 to the cut at
 *               40.400 — one unbroken linear key, never chained. Decomposing
 *               the frames into "pure scale about (640,368) + this page drift"
 *               is what makes the measured trace constant; a camera y-pan
 *               instead reads as a decelerating -6.7 -> -4.1 px/s and is wrong.
 *   scrollKeys  thread scroll, nine eased in-out steps (measured symmetric
 *               about their diff-peak, 0.83-1.40s each, 120-340px).
 *   messages    each pops at full opacity and RISES 43.9 stage px into place
 *               with an exponential settle (measured x0.79 per frame at 30fps,
 *               tau 0.141s => settle window 0.566s). No fade: the bubble is
 *               fully opaque on its first frame.
 *
 * Pure function of t — no CSS animation, no wall clock.
 */

import React from "react";
import { AgentMark, chan, CHAT } from "./plum-shared.jsx";
import { rgb, clamp01, settleDecay } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";

const WIDE = {
  header: [5, 67, 62],
  cust: [18, 76, 72],
  bot: [240, 240, 240],
  botInk: [45, 55, 60],
  time: [150, 155, 158],
  ground: [248, 248, 246],
  link: [110, 32, 80],
};

/** One line: a string, or an array of `string | {t, b?, link?}` segments. */
function Line({ parts, bot }) {
  if (typeof parts === "string") return <>{parts}</>;
  return (
    <>
      {parts.map((p, i) => {
        if (typeof p === "string") return <React.Fragment key={i}>{p}</React.Fragment>;
        const style = {};
        if (p.b) style.fontWeight = 600;
        if (p.link) {
          style.fontWeight = 700;
          style.color = bot ? rgb(WIDE.link) : "#fff";
          style.textDecoration = "underline";
        } else if (p.plum) {
          style.fontWeight = 700;
          style.color = bot ? rgb(WIDE.link) : "#fff";
        }
        return <span key={i} style={style}>{p.t}</span>;
      })}
    </>
  );
}

/**
 * The blurred out-of-focus page behind the widget.
 *
 * NOTE the size: the camera pulls back to 0.688, so the visible page area
 * grows to 1860 x 1046 stage px centred on (640, 368) — x -290..1570,
 * y -155..891. A page painted at stage size (1280x720) with overflow:hidden
 * shrinks into the middle of the frame instead of revealing more of itself,
 * which is exactly the failure this covers.
 */
function WideBackdrop({ tint }) {
  // Measured off the widest framing (t=40.0, scale 0.688) and back-projected to
  // page coordinates: TWO card columns to the LEFT of the widget — page x
  // -290..-43 and 18..388 — and plain ground to its right (the far right of the
  // frame samples 250,249,247, the page itself, with no card edge in it).
  // Rows are 375 tall on a 438 pitch, column A offset ~52 above column B
  // (a masonry page); gaps sample 247,247,245.
  const cards = [];
  for (let r = -2; r <= 3; r++) {
    cards.push([-290, 172.8 + r * 438, 247, 375]);
    cards.push([18, 224.6 + r * 438, 370, 375]);
  }
  return (
    <div style={{
      position: "absolute", left: -700, top: -1000, width: 2600, height: 3000,
      background: rgb(tint), filter: "blur(7px)",
    }}>
      {cards.map(([x, y, w, h]) => (
        <div key={`${x},${y}`} style={{
          position: "absolute", left: x + 700, top: y + 1000, width: w, height: h,
          background: "#ffffff", borderRadius: 16,
        }} />
      ))}
    </div>
  );
}

export function PlumChatWide(cfg, t) {
  const from = cfg.startMs / 1000, to = (cfg.startMs + cfg.durationMs) / 1000;
  if (t < from - 0.001 || t > to + 0.001) return null;
  const tSec = t - from;
  const tMs = tSec * 1000;

  const panelW = cfg.panelW ?? 504;
  const panelH = cfg.panelH ?? 914;
  const panelX = cfg.panelX ?? 392;
  const panelY = cfg.panelY ?? 45.83;
  const headerH = cfg.headerH ?? 110;
  const f = cfg.fontPx ?? 19.6;
  const pitch = cfg.linePitch ?? 30.2;     // measured baseline-to-baseline
  const pad = cfg.pad ?? 35;               // thread left inset (avatar column)
  const indent = cfg.bubbleIndent ?? 82.9; // bot bubble left inset
  const bubW = cfg.bubbleW ?? 315;
  const bubPadX = cfg.bubblePadX ?? 25;
  const track = cfg.letterSpacing ?? -0.2; // trims this face to the reference's advance
                                           // ("You'll find product specs," measures
                                           // 195.5 thread px in the reference)
  const rise = cfg.enterRise ?? 43.9;      // px a new message rises into place
  const settleMs = cfg.enterSettleMs ?? 566;

  const py = chan(cfg.panelKeys, tMs, 0);
  const scrollY = chan(cfg.scrollKeys, tMs, 0);
  const brand = cfg.brand ?? { name: "TitanAssist", sub: "Powered by AI", label: "Titan Assist" };
  const msgs = cfg.messages ?? [];
  const seen = msgs.filter((m) => tMs >= (m.atMs ?? -1e9));

  return (
    <div style={{
      position: "absolute", left: 0, top: 0, width: 1280, height: 720, fontFamily: FONT,
      // ONE page carries both the widget and the blurred backdrop: tracking a
      // backdrop seam across the scene puts it at the same page y as the widget
      // to within 6px, i.e. no parallax between them.
      transform: `translateY(${py.toFixed(2)}px)`,
    }}>
      <WideBackdrop tint={cfg.pageTint ?? WIDE.ground} />

      <div style={{
        position: "absolute", left: panelX, top: panelY,
        width: panelW, height: panelH,
        background: "#fff", borderRadius: cfg.panelRadius ?? 8,
        boxShadow: "0 22px 60px rgba(30,40,44,0.14)", overflow: "hidden",
      }}>
        {/* header — content sits high in the band (measured 20px from the top) */}
        <div style={{
          position: "absolute", left: 0, right: 0, top: 0, height: headerH,
          background: rgb(WIDE.header), zIndex: 3,
        }}>
          <div style={{ position: "absolute", left: 29.7, top: 20, display: "flex", alignItems: "flex-start", gap: 14 }}>
            <AgentMark size={51} />
            <div style={{ marginTop: 4 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 20.5, letterSpacing: 0.15, lineHeight: 1.15 }}>{brand.name}</div>
              <div style={{ color: "rgba(255,255,255,0.9)", fontWeight: 300, fontSize: 16, marginTop: 3, lineHeight: 1.2 }}>{brand.sub}</div>
            </div>
          </div>
        </div>

        {/* thread */}
        <div style={{ position: "absolute", left: 0, right: 0, top: headerH, bottom: 0, overflow: "hidden" }}>
          <div style={{ transform: `translateY(${(-scrollY).toFixed(2)}px)`, paddingTop: 27.3 }}>
            {seen.map((m, i) => {
              const bot = m.who === "bot";
              // The reference repeats the avatar + "Titan Assist" label only when
              // the SIDE changes — a bot message following a bot message runs on.
              const same = i > 0 && seen[i - 1].who === m.who;
              const off = rise * settleDecay(tSec, (m.atMs ?? 0) / 1000, settleMs / 1000);
              return (
                <div key={m.id ?? i} style={{
                  marginTop: i === 0 ? 0 : (m.gapTop ?? (same ? 15.5 : bot ? 24.4 : 12.4)),
                  transform: `translateY(${off.toFixed(2)}px)`,
                }}>
                  {bot && !same ? (
                    <div style={{ position: "relative", height: 20.8, paddingLeft: indent }}>
                      <div style={{ position: "absolute", left: pad, top: 0 }}><AgentMark size={30.5} /></div>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: rgb(WIDE.botInk), lineHeight: "17px" }}>{m.label ?? brand.label}</span>
                    </div>
                  ) : null}
                  <div style={{ display: "flex", justifyContent: bot ? "flex-start" : "flex-end", paddingLeft: bot ? indent : 0, paddingRight: bot ? 0 : 30.3 }}>
                    <div style={{
                      width: bubW, boxSizing: "border-box",
                      background: rgb(bot ? WIDE.bot : WIDE.cust),
                      color: bot ? rgb(WIDE.botInk) : "#fff",
                      borderRadius: 12,
                      padding: `14px ${bubPadX}px 12px`,
                      fontSize: f, lineHeight: `${pitch}px`, letterSpacing: track, fontWeight: 300,
                    }}>
                      {m.lines.map((ln, j) => (
                        <div key={j} style={{ marginTop: j === 0 ? 0 : pitch }}>
                          <Line parts={ln} bot={bot} />
                        </div>
                      ))}
                      <div style={{
                        fontSize: 14, lineHeight: 1.2, letterSpacing: 0,
                        color: bot ? rgb(WIDE.time) : "rgba(255,255,255,0.78)",
                        marginTop: 15.6, textAlign: bot ? "left" : "right",
                      }}>{m.time}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ height: 150 }} />
          </div>
        </div>

        {/* composer */}
        <div style={{
          position: "absolute", left: (panelW - 442) / 2, width: 442, bottom: 52, height: 59,
          borderRadius: 30, border: "1.6px solid #cfd3d4", background: "#fff",
          display: "flex", alignItems: "center", padding: "0 22px", zIndex: 2,
        }}>
          <span style={{ fontSize: 18, color: "#9aa0a3", flex: 1, fontWeight: 300 }}>Write a message</span>
          <svg width="24" height="24" viewBox="0 0 20 20"><path d="M13.5 5.5 7.6 11.4a2.6 2.6 0 0 0 3.7 3.7l6-6a4.2 4.2 0 0 0-6-6l-6.4 6.5a5.9 5.9 0 0 0 8.3 8.3l5.2-5.2" fill="none" stroke="#3f4a4e" strokeWidth="1.6" strokeLinecap="round" transform="scale(0.82) translate(2,2)" /></svg>
          <div style={{ width: 14 }} />
          <svg width="24" height="24" viewBox="0 0 20 20"><path d="M3 10.5 17 3.4 13.6 17l-4.2-4.6Zm6.4 1.9L17 3.4" fill="none" stroke="#3f4a4e" strokeWidth="1.6" strokeLinejoin="round" /></svg>
        </div>
      </div>
    </div>
  );
}

export const note = "Wide desktop chat passage (Breeze S3): 504x914 widget on a blurred page, 12-message support thread with measured rise-and-settle entrances, nine eased scroll steps and a constant page drift. Frame it with the per-scene camera.";
export const nativeMs = 23565;
