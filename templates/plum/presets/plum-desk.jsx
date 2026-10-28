/**
 * plum-desk.jsx — the physical desk set of the Breeze reference: wooden desk
 * shot from just above, dark-bezel monitor, white keyboard, black padded
 * headset with boom mic, tilted oak photo frame, patterned mug of red tea,
 * mint stress ball with the agent mark, peach sticky pad, spiral notebook +
 * pen. The monitor screen renders a live interior (admin pages, deployed site
 * chat, endcard sweep), drawn as DOM at APP_W x APP_H logical px and scaled
 * into the screen rect.
 *
 * ── measured (2026-09-08, full decode of breeze-hubspot.mp4 frames 0-227,
 *    stage px = frame px / 1.5, scene-1 home framing at camera scale 1.000) ──
 *   bezel outer   frame  (397,223)-(1515,864)   stage (264.7,148.7) 745.3x427.3
 *   screen inner  frame  (415,239.5)-(1496.4,845.5) stage (276.7,159.7) 720.9x404.0
 *   screen is 16:9 to 0.3%; app canvas 1456x816, 1 app px = 0.49512 stage px
 *   monitor is essentially axis-aligned: top edge -0.06 deg, bottom +0.12 deg,
 *   left edge vertical, right edge -0.35 deg, right side 0.5% taller than left
 *   (a <=2 stage px keystone, reproduced with a small perspective rotateY).
 *   prop rects: photo frame is a parallelogram A(-3,61) B(113,131) C(339,37);
 *   ball c(133,176) r43 with the agent mark at (150,183) d33; headset cups
 *   c(159,405) r59 and c(43,536) r46; mug body c(141,117) r84, rim c(156,104)
 *   r61, tea c(149,107) r49; sticky 87px square at c(1133,336) rot +25 deg;
 *   notebook page corner (1071,411) rot +10 deg, spiral down its right edge;
 *   keyboard body (266,629) 504 wide, fn row y 643, number row y 663.
 *
 * All desk camera work (S1 push, S4 pull-back, S8 pull, S9 accelerating dive)
 * is the per-scene `camera` in the config. Interiors carry their own cue
 * channels, all scene-relative ms.
 */

import React from "react";
import { clamp01, lerp, rgb, easeOut, easeInOut, easeIn, settleDecay } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";
import {
  PLUM, CHAT, chan, chanXY, pop, I, Chip, AgentMark, TopBar, SideRail, PageHead,
  ChatThread, Backdrop, APP_W, APP_H, TOPBAR_H, SIDEBAR_W, HEAD_H,
} from "./plum-shared.jsx";
// scene 9 shows the end-card plate inside the monitor before the dive lands it
// full-bleed; both use this one drawing so the 79.500 s join is seamless.
import { EndcardPlate } from "./plum-endcard.jsx";

// ── the set (stage px, measured above) ─────────────────────────────────────
const BEZEL = { x: 264.7, y: 148.7, w: 745.3, h: 427.3, r: 7 };
const SCREEN = { x: 276.7, y: 159.7, w: 720.9, h: 404.0 };
const K = SCREEN.w / APP_W;              // 0.49512 stage px per app px

// ── desk ground ────────────────────────────────────────────────────────────
function Wood() {
  // measured wood: rgb(86,56,38) in the monitor's shadow, rgb(108,76,56) open,
  // rgb(144,116,97) at the lit far right. Grain runs near-horizontal (-0.6 deg)
  // and is soft — the reference reads as figure, never as ruled lines.
  const grain = [];
  const ys = [-18, 14, 34, 68, 96, 122, 158, 186, 212, 246, 272, 300, 336, 364, 392, 428,
    456, 484, 518, 548, 578, 612, 642, 672, 704];
  for (let i = 0; i < ys.length; i++) {
    const w = i % 4 === 0 ? 2.4 : i % 3 === 0 ? 1.6 : 1.0;
    grain.push(
      <div key={"g" + i} style={{
        position: "absolute", left: -60, width: 1420, top: ys[i], height: w,
        background: `rgba(40,22,11,${(0.055 + (i % 5) * 0.022).toFixed(3)})`,
        transform: "rotate(-0.6deg)", filter: "blur(2.6px)",
      }} />
    );
  }
  const streaks = [[-30, 26, 640, 30], [520, 88, 760, 34], [60, 222, 520, 30], [700, 288, 640, 26],
  [-20, 380, 700, 32], [640, 452, 700, 28], [90, 540, 620, 26], [560, 630, 780, 34], [180, 690, 700, 30]];
  return (
    <div style={{ position: "absolute", inset: -40, background: "#6a4832", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(94deg, #7c583f 0%, #6e4b35 26%, #5f3f2c 52%, #6d4a34 78%, #866044 100%)" }} />
      {streaks.map((s, i) => (
        <div key={"s" + i} style={{
          position: "absolute", left: s[0] + 40, top: s[1] + 40, width: s[2], height: s[3],
          background: i % 2 ? "rgba(132,100,74,0.22)" : "rgba(46,27,15,0.26)",
          borderRadius: s[3], filter: "blur(9px)", transform: "rotate(-0.6deg)",
        }} />
      ))}
      <div style={{ position: "absolute", inset: 40 }}>{grain}</div>
      {/* lighting: lifted at the right and the upper left, sunk around the monitor */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 80% at 100% 48%, rgba(255,224,188,0.26), rgba(255,224,188,0) 64%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(38% 44% at 6% 12%, rgba(255,226,192,0.16), rgba(255,226,192,0) 70%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(46% 40% at 50% 20%, rgba(20,9,3,0.10), rgba(20,9,3,0) 74%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(150% 118% at 50% 52%, rgba(0,0,0,0) 40%, rgba(14,6,2,0.44) 100%)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 500, height: 340, background: "radial-gradient(64% 74% at 8% 12%, rgba(8,3,1,0.9), rgba(8,3,1,0) 76%)" }} />
      {/* soft contact shadow the monitor casts on the desk */}
      <div style={{ position: "absolute", left: 268, top: 208, width: 780, height: 420, borderRadius: 30, background: "rgba(14,6,2,0.34)", filter: "blur(34px)" }} />
    </div>
  );
}

// ── props ──────────────────────────────────────────────────────────────────

/**
 * Oak photo frame, top-left, seen obliquely. Measured corners (stage px):
 * left (-3.3,61.3) bottom (113.3,130.7) right (339.3,36.7) top (222.7,-32.7).
 * That is a parallelogram, so one affine matrix places a plain rectangle.
 */
function PhotoFrame() {
  const W = 203.6 / 1.5, H = 367.2 / 1.5;   // 135.7 x 244.8 (the frame's own plane)
  const mat = 20, ph = 13;
  // four people on grass; y0 is the head top as a fraction of the photo height
  const figs = [
    { x: 0.16, w: 0.15, y0: 0.30, torso: "#4a5f7a", legs: "#2f3a4e" },
    { x: 0.35, w: 0.16, y0: 0.34, torso: "#a45d5c", legs: "#333a4c" },
    { x: 0.52, w: 0.19, y0: 0.16, torso: "#77879a", legs: "#39435a" },
    { x: 0.72, w: 0.16, y0: 0.30, torso: "#8b8f96", legs: "#2b3448" },
  ];
  return (
    <div style={{
      position: "absolute", left: 0, top: 0, width: W, height: H,
      transform: "matrix(0.8596, 0.5108, -0.9232, 0.3840, 222.7, -32.7)", transformOrigin: "0 0",
      background: "linear-gradient(102deg, #c4a674 0%, #b79666 46%, #a98959 100%)",
      boxShadow: "0 15px 24px rgba(18,8,3,0.52)",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(196deg, rgba(255,242,214,0.16), rgba(84,58,24,0.14) 66%)" }} />
      <div style={{ position: "absolute", inset: mat, background: "#e2ded4", boxShadow: "inset 0 0 4px rgba(80,60,30,0.30)" }}>
        <div style={{ position: "absolute", inset: ph, overflow: "hidden", background: "linear-gradient(180deg,#5c7b3c 0%, #6d8e44 44%, #82a054 100%)", filter: "blur(0.7px)" }}>
          <div style={{ position: "absolute", left: -8, right: -8, top: -6, height: "38%", background: "linear-gradient(180deg,#33481f,#546f2d)", filter: "blur(2.2px)" }} />
          <div style={{ position: "absolute", left: "4%", top: "-10%", width: "30%", height: "34%", borderRadius: "50%", background: "#3f5624", filter: "blur(2.4px)" }} />
          <div style={{ position: "absolute", left: "56%", top: "-14%", width: "38%", height: "36%", borderRadius: "50%", background: "#39511f", filter: "blur(2.4px)" }} />
          {figs.map((f, i) => {
            const L = `${f.x * 100}%`, Wp = `${f.w * 100}%`;
            const headH = f.w * 0.62;
            return (
              <React.Fragment key={i}>
                <div style={{ position: "absolute", left: `${(f.x + f.w * 0.26) * 100}%`, top: `${f.y0 * 100}%`, width: `${f.w * 48}%`, height: `${headH * 100}%`, borderRadius: "50%", background: "#d5a681" }} />
                <div style={{ position: "absolute", left: L, top: `${(f.y0 + headH * 0.85) * 100}%`, width: Wp, height: `${(0.62 - f.y0) * 100}%`, background: f.torso, borderRadius: "34% 34% 6% 6%" }} />
                <div style={{ position: "absolute", left: `${(f.x + f.w * 0.16) * 100}%`, top: "60%", width: `${f.w * 68}%`, height: "42%", background: f.legs, borderRadius: "6% 6% 2% 2%" }} />
              </React.Fragment>
            );
          })}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", background: "linear-gradient(180deg, rgba(120,150,80,0) , rgba(140,168,96,0.55))" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(200deg, rgba(255,250,235,0.14), rgba(0,0,0,0.12) 72%)" }} />
        </div>
      </div>
    </div>
  );
}

/** Mint stress ball with the agent mark printed low-right of centre. */
function StressBall() {
  const cx = 133.3, cy = 176, r = 42.7;
  return (
    <div style={{ position: "absolute", left: cx - r, top: cy - r, width: r * 2, height: r * 2 }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "radial-gradient(circle at 38% 32%, #52b294 0%, #3ba184 40%, #2c8a6d 72%, #196b53 100%)",
        boxShadow: "0 11px 17px rgba(16,8,3,0.48), inset -6px -8px 16px rgba(9,54,40,0.35)",
      }} />
      <div style={{ position: "absolute", left: r * 0.18, top: r * 0.2, width: r * 0.62, height: r * 0.44, borderRadius: "50%", background: "rgba(200,244,226,0.26)", filter: "blur(5px)" }} />
      <div style={{ position: "absolute", left: cx + 16.7 - (cx - r) - 16.5, top: cy + 7.3 - (cy - r) - 16.5, transform: "rotate(-7deg)" }}>
        <AgentMark size={33} ring={[36, 38, 40]} />
      </div>
      <div style={{
        position: "absolute", left: r * 1.06, top: r * 1.46, fontFamily: FONT, fontSize: 7,
        fontWeight: 700, letterSpacing: 0.6, color: "rgba(255,255,255,0.85)", transform: "rotate(-6deg)",
      }}>Titan</div>
    </div>
  );
}

/**
 * Black over-ear headset lying on its side. Measured (stage px): the band
 * enters off-frame at (0,253) and runs to the top of the right cup at
 * (137,353); right cup c(159,405) r59 with a glossy housing over its lower
 * half; second cup c(43,536) rx43 ry50; boom mic curves from (170,447) to a
 * capsule at (100,578).
 */
function Headset() {
  const cup = (cx, cy, rx, ry, rot, gloss) => (
    <React.Fragment key={cx}>
      <div style={{
        position: "absolute", left: cx - rx, top: cy - ry, width: rx * 2, height: ry * 2, borderRadius: "50%",
        background: "radial-gradient(circle at 42% 24%, #17181b 0%, #0e0f11 34%, #060607 74%, #030304 100%)",
        boxShadow: "0 14px 24px rgba(10,5,2,0.6)", transform: `rotate(${rot}deg)`,
      }} />
      {/* cushion ring */}
      <div style={{
        position: "absolute", left: cx - rx * 0.86, top: cy - ry * 0.86, width: rx * 1.72, height: ry * 1.72,
        borderRadius: "50%", border: `${(rx * 0.13).toFixed(1)}px solid rgba(46,48,54,0.45)`, transform: `rotate(${rot}deg)`,
      }} />
      {gloss ? (
        <div style={{
          position: "absolute", left: cx - rx * 0.80, top: cy - ry * 0.16, width: rx * 1.56, height: ry * 1.04,
          borderRadius: "42% 46% 52% 50%", transform: `rotate(${rot}deg)`,
          background: "linear-gradient(154deg, #222429 0%, #131418 34%, #08090b 78%, #040405 100%)",
        }} />
      ) : null}
      <div style={{
        position: "absolute", left: cx - rx * 0.52, top: cy - ry * 0.74, width: rx * 0.86, height: ry * 0.30,
        borderRadius: "50%", background: "rgba(150,158,168,0.16)", filter: "blur(3.6px)", transform: `rotate(${rot - 16}deg)`,
      }} />
    </React.Fragment>
  );
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 320, height: 660 }}>
      <svg width="320" height="660" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {/* headband: enters off-frame top-left, runs down to the cup yoke */}
        <path d="M -30 260 Q 62 246 152 364" stroke="#08090b" strokeWidth="23" strokeLinecap="round" fill="none" opacity="0.5" transform="translate(3,8)" />
        <path d="M -30 258 Q 62 246 152 364" stroke="#131417" strokeWidth="21" strokeLinecap="round" fill="none" />
        <path d="M -30 265 Q 62 253 148 368" stroke="#33121d" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.55" />
        <path d="M -30 251 Q 62 239 150 358" stroke="#2b2e33" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
      </svg>
      {cup(159.3, 405.3, 59.3, 59.3, -8, true)}
      {cup(42.7, 535.7, 42.7, 50.3, -14, false)}
      <svg width="320" height="660" style={{ position: "absolute", left: 0, top: 0 }}>
        {/* boom mic: bows slightly right on its way down to the capsule */}
        <path d="M 172 448 Q 152 500 106 573" stroke="#15161a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <rect x="94" y="562" width="26" height="12" rx="6" fill="#1b1d20" transform="rotate(58 107 568)" />
      </svg>
    </div>
  );
}

/**
 * Patterned white mug of red tea, handle to the lower right. Measured (stage
 * px): body c(1137.7,112) rx 75.7 ry 68.7; rim ring c(1156.3,104) r 61.7; tea
 * c(1149,107) rx 48 ry 50; handle ring at (1203..1248, 127..173). The tally
 * dashes only show on the left crescent that the rim does not cover.
 */
function Mug() {
  const BX = 1137.7, BY = 112, BRX = 75.7, BRY = 68.7;
  const dashes = [];
  for (let ring = 0; ring < 4; ring++) {
    const f = 0.60 + ring * 0.125;
    for (let i = 0; i < 9; i++) {
      const a = (96 + i * 17.5 + ring * 7) * Math.PI / 180;
      const x = BX + Math.cos(a) * BRX * f, y = BY + Math.sin(a) * BRY * f;
      dashes.push(<div key={ring + "-" + i} style={{
        position: "absolute", left: x, top: y, width: 2.2, height: 6.4, borderRadius: 1,
        background: "rgba(34,34,36,0.92)", transform: `rotate(${(a * 180 / Math.PI + 100).toFixed(1)}deg)`,
      }} />);
    }
  }
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1280, height: 320, pointerEvents: "none" }}>
      <div style={{
        position: "absolute", left: 1188, top: 118, width: 44, height: 45,
        borderRadius: "50%", border: "12px solid #bab1a7", borderLeftColor: "transparent",
        transform: "rotate(-14deg)", boxShadow: "3px 7px 12px rgba(16,8,3,0.42)",
      }} />
      <div style={{
        position: "absolute", left: BX - BRX, top: BY - BRY, width: BRX * 2, height: BRY * 2, borderRadius: "50%",
        background: "radial-gradient(circle at 52% 22%, #cfc8bf 0%, #a49b91 44%, #675e54 100%)",
        boxShadow: "0 13px 22px rgba(16,8,3,0.48)",
      }} />
      {dashes}
      <div style={{
        position: "absolute", left: 1156.3 - 59, top: 104 - 59, width: 118, height: 118, borderRadius: "50%",
        background: "radial-gradient(circle at 44% 24%, #dcd5cd 0%, #c3bcb3 62%, #8f867c 100%)",
      }} />
      <div style={{
        position: "absolute", left: 1149 - 49, top: 110 - 49, width: 98, height: 98, borderRadius: "50%",
        background: "radial-gradient(circle at 46% 28%, #74100f 0%, #4d0709 46%, #260103 100%)",
        boxShadow: "inset 0 3px 7px rgba(0,0,0,0.5)",
      }} />
      <div style={{ position: "absolute", left: 1122, top: 72, width: 32, height: 15, borderRadius: "50%", background: "rgba(255,216,198,0.15)", transform: "rotate(-26deg)", filter: "blur(2.4px)" }} />
    </div>
  );
}

/** Peach sticky pad, square, rotated +25 deg. */
function Sticky() {
  const s = 87.3;
  return (
    <div style={{ position: "absolute", left: 1133 - s / 2, top: 335.7 - s / 2, width: s, height: s, transform: "rotate(25deg)" }}>
      <div style={{ position: "absolute", left: -5, top: 4, width: s, height: s, background: "#c9714f", borderRadius: 2 }} />
      <div style={{ position: "absolute", left: -2.5, top: 2, width: s, height: s, background: "#e08a63", borderRadius: 2 }} />
      <div style={{
        position: "absolute", inset: 0, borderRadius: 2,
        background: "linear-gradient(150deg, #f6ad8d 0%, #f1a180 52%, #e6906c 100%)",
        boxShadow: "0 9px 15px rgba(16,8,3,0.42)",
      }} />
    </div>
  );
}

/** Spiral notebook with a silver pen resting on the page. */
function Notebook() {
  // page local space: origin at the measured top-left corner, rotated +10 deg.
  // Spiral rings run down the page's right edge (local x 195), pitch 20.
  const rings = [];
  for (let i = 0; i < 15; i++) {
    rings.push(<div key={i} style={{
      position: "absolute", left: 193 - i * 0.5, top: 2 + i * 20, width: 24, height: 8.5,
      borderRadius: 4.2, border: "2.4px solid #121214", borderBottomColor: "rgba(24,24,26,0.30)",
      transform: "rotate(-2deg)",
    }} />);
  }
  const penH = 205;
  return (
    <div style={{ position: "absolute", left: 1070.7, top: 410.7, width: 320, height: 400, transform: "rotate(10deg)", transformOrigin: "0 0" }}>
      {/* back cover, visible past the spiral in the frame's bottom-right corner */}
      <div style={{
        position: "absolute", left: 186, top: -14, width: 134, height: 414,
        background: "linear-gradient(150deg,#e0e3e4 0%, #d8dcdd 46%, #cbcfd0 100%)",
      }} />
      <div style={{
        position: "absolute", left: 0, top: 0, width: 215, height: 400,
        background: "linear-gradient(150deg,#d9dcdc 0%, #d2d5d6 40%, #c3c7c8 100%)",
        boxShadow: "0 10px 20px rgba(16,8,3,0.42)",
      }} />
      <div style={{ position: "absolute", left: 176, top: 0, width: 34, height: 400, background: "linear-gradient(90deg, rgba(116,120,122,0.14), rgba(116,120,122,0))" }} />
      {rings}
      {/* pen from local (136,63) to (89,263): lean -13.2 deg about its top */}
      <div style={{ position: "absolute", left: 132.5, top: 63, width: 7, height: penH, borderRadius: 3.5, transform: "rotate(-13.2deg)", transformOrigin: "50% 0%", background: "linear-gradient(98deg,#eceeee 0%, #cbcfce 46%, #8e9393 100%)", boxShadow: "5px 6px 9px rgba(30,30,30,0.20)" }} />
      <div style={{ position: "absolute", left: 132.5, top: 63, width: 7, height: 34, borderRadius: "3.5px 3.5px 0 0", transform: "rotate(-13.2deg)", transformOrigin: "50% 0%", background: "linear-gradient(98deg,#d3e2d8,#a3bfb1)" }} />
      <div style={{ position: "absolute", left: 136.5, top: 56, width: 5, height: 20, borderRadius: 2.5, transform: "rotate(-13.2deg)", transformOrigin: "50% 350%", background: "#f6f7f6" }} />
      <div style={{ position: "absolute", left: 132.5, top: 63 + penH - 22, width: 7, height: 22, borderRadius: "0 0 3.5px 3.5px", transform: "rotate(-13.2deg)", transformOrigin: `50% ${(-(penH - 22) / 22 * 100).toFixed(0)}%`, background: "linear-gradient(98deg,#bacfc4,#8ea89b)" }} />
    </div>
  );
}

/** White low-profile keyboard, bottom-centre, cropped by the frame edge. */
function Keyboard() {
  const L = 266, T = 629.3, W = 504;
  const kx = 272 - L, pitch = 35.6;
  const fnLabels = ["Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Del"];
  const numLabels = ["~", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"];
  const qLabels = ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"];
  const key = (i, top, h, w, label, fs) => (
    <div key={top + "-" + i} style={{
      position: "absolute", left: kx + i * pitch, top, width: w, height: h, borderRadius: 3.4,
      background: "linear-gradient(180deg,#dedbd9,#d0cdcb)",
      boxShadow: "0 1.2px 0 rgba(140,137,135,0.85)",
      display: "flex", alignItems: "center", justifyContent: label.length > 2 ? "flex-start" : "center",
      paddingLeft: label.length > 2 ? 4 : 0, fontFamily: FONT, fontSize: fs, color: "#adaaa8", fontWeight: 500,
    }}>{label}</div>
  );
  const rows = [];
  for (let i = 0; i < 14; i++) rows.push(key(i, 13.4, 15.3, 30, fnLabels[i], 5.2));
  for (let i = 0; i < 13; i++) rows.push(key(i, 33.4, 28, 30, numLabels[i], 6.4));
  rows.push(key(13, 33.4, 28, 44, "Backspace", 5.6));
  rows.push(key(0, 67.4, 28, 44, "Tab", 5.6));
  for (let i = 1; i < 14; i++) rows.push(<div key={"q" + i} style={{
    position: "absolute", left: kx + 16 + i * pitch, top: 67.4, width: 30, height: 28, borderRadius: 3.4,
    background: "linear-gradient(180deg,#dedbd9,#d0cdcb)", boxShadow: "0 1.2px 0 rgba(140,137,135,0.85)",
    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 8.6, color: "#a5a2a0", fontWeight: 500,
  }}>{qLabels[i]}</div>);
  return (
    <div style={{
      position: "absolute", left: L, top: T, width: W, height: 130, borderRadius: "7px 7px 3px 3px",
      background: "linear-gradient(180deg,#dedad8 0%, #d4d0ce 58%, #c6c2c0 100%)",
      boxShadow: "0 12px 26px rgba(16,8,3,0.5)", overflow: "hidden", transform: "rotate(0.2deg)", opacity: 0.999,
    }}>
      {rows}
    </div>
  );
}

// ── interiors (drawn at APP px, scaled by K into the screen) ───────────────

const S = { pageBg: rgb(PLUM.pageBg), card: "#fff", line: rgb(PLUM.cardLine) };

/** Mouse pointer drawn in app space (the reference's cursor sits on the page). */
function Pointer({ x, y, size = 34 }) {
  return (
    <svg width={size} height={size * 1.35} viewBox="0 0 20 27" style={{ position: "absolute", left: x, top: y }}>
      <path d="M1 0.6 1 21.4 6.3 16.4 9.7 24.6 13.6 22.9 10.3 15 17.3 14.6Z" fill="#17181a" stroke="#f6f6f6" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

// ── goals page (scene 1) ──────────────────────────────────────────────────
// every measurement below is app px from the screen's top-left, home scroll 0.
const G = {
  navX: 126, navTop: 223, navPitch: 40, navFont: 15.5,
  pillX: 116, pillW: 251, pillPad: 9,
  headX: 390, headTop: 215, headFont: 21,
  cardX: 392, cardW: 1016,
  titleDY: 18, instrDY: 67, descDY: 86, taDY: 116, taH: 64,
  actionsDY: 208, listDY: 247, rowH: 91, rowGap: 17,
  padX: 24,
};

function GoalCard({ top, title, instrDesc, instr, actions, handoffs }) {
  const rows = [];
  let y = G.listDY;
  actions.forEach((a, i) => { rows.push({ ...a, y: y + i * (G.rowH + G.rowGap) }); });
  y += actions.length * (G.rowH + G.rowGap);
  const addActionY = y;
  const handoffLabelY = addActionY + 30 + 17;
  const handoffTop = handoffLabelY + 34;
  const hrows = handoffs.map((h, i) => ({ ...h, y: handoffTop + i * (G.rowH + G.rowGap) }));
  const cardH = handoffTop + handoffs.length * (G.rowH + G.rowGap) + 30 + 20;
  const Row = ({ r }) => (
    <div style={{ position: "absolute", left: G.padX, top: r.y, width: G.cardW - G.padX * 2, height: G.rowH, border: `1px solid ${S.line}`, borderRadius: 6, background: "#fff" }}>
      <div style={{ position: "absolute", left: 18, top: 18, fontSize: 17.3, fontWeight: 700, color: rgb(PLUM.ink), letterSpacing: 0.1 }}>{r.title}</div>
      <div style={{ position: "absolute", left: 19, top: 39, fontSize: 17.1, fontWeight: 400, color: rgb(PLUM.inkSoft) }}>{r.sub}</div>
      {r.chip ? <div style={{ position: "absolute", right: 19, top: 35 }}><Chip kind={r.chip} /></div> : null}
    </div>
  );
  const Ghost = ({ top: gy, label }) => (
    <div style={{ position: "absolute", left: G.padX, top: gy, height: 30, border: `1px solid #c9ced1`, borderRadius: 4, padding: "0 13px", display: "flex", alignItems: "center", fontSize: 12.5, fontWeight: 600, color: rgb(PLUM.inkSoft), background: "#fff" }}>{label}</div>
  );
  return (
    <div style={{ position: "absolute", left: G.cardX, top, width: G.cardW, height: cardH, border: `1px solid ${S.line}`, borderRadius: 8, background: "#fff" }}>
      <div style={{ position: "absolute", left: G.padX, top: G.titleDY, display: "flex", alignItems: "center", gap: 7 }}>
        {I.chevDown(17, rgb(PLUM.ink))}
        <span style={{ fontSize: 22, fontWeight: 700, color: rgb(PLUM.ink), letterSpacing: 0.1 }}>{title}</span>
      </div>
      <div style={{ position: "absolute", left: G.padX, top: G.instrDY, fontSize: 15.2, fontWeight: 700, color: rgb(PLUM.ink) }}>Instructions</div>
      <div style={{ position: "absolute", left: G.padX + 1, top: G.descDY, fontSize: 13.5, fontWeight: 600, color: rgb(PLUM.inkFaint), whiteSpace: "nowrap" }}>{instrDesc}</div>
      <div style={{ position: "absolute", left: G.padX, top: G.taDY, width: G.cardW - G.padX * 2 - 34, height: G.taH, border: `1px solid ${rgb(PLUM.fieldLine)}`, borderRadius: 4, background: "#fff", padding: "6px 12px", fontSize: 15.5, lineHeight: "25px", color: rgb(PLUM.inkSoft), overflow: "hidden" }}>{instr}</div>
      <div style={{ position: "absolute", left: G.padX, top: G.actionsDY, fontSize: 15.2, fontWeight: 700, color: rgb(PLUM.ink) }}>Actions</div>
      {rows.map((r, i) => <Row key={i} r={r} />)}
      <Ghost top={addActionY} label="Add action" />
      <div style={{ position: "absolute", left: G.padX, top: handoffLabelY, fontSize: 15.2, fontWeight: 700, color: rgb(PLUM.ink) }}>Handoffs</div>
      {hrows.map((r, i) => <Row key={"h" + i} r={r} />)}
      <Ghost top={handoffTop + handoffs.length * (G.rowH + G.rowGap)} label="Add handoff" />
    </div>
  );
}

/**
 * Measured cues: nav items pop in at 0/133/200/300/400 ms, the "Agent goals"
 * heading at 300 ms, the Generate-leads card at 467 ms; every block arrives
 * opaque, translated +64 app px, and settles exponentially (tau 140 ms — the
 * reference's per-frame residual decays x0.794/frame, dead flat by ~1.3 s).
 * Then one scroll of 744.5 app px from 1.30 s to 5.80 s (easeInOut pow 1.7
 * fits the measured cumulative trace to 11 px of 745), then a dead hold.
 */
function GoalsInterior(d, tMs) {
  const t = tMs / 1000;
  const scroll = d.scrollRamp
    ? d.scrollRamp.dist * easeInOut(clamp01((tMs - d.scrollRamp.atMs) / d.scrollRamp.durMs), d.scrollRamp.pow ?? 1.7)
    : chan(d.scrollKeys, tMs, 0);
  const enterMs = d.enterMs ?? 560;
  const rise = d.riseY ?? 64;
  // per-block entry: null when not yet present, else its current y offset
  const blk = (atMs) => (tMs < atMs ? null : rise * settleDecay(t, atMs / 1000, enterMs / 1000));
  const cue = d.cues ?? {};
  const navAt = cue.nav ?? [0, 133, 200, 300, 400];
  const headAt = cue.head ?? 300;
  const cardAt = cue.card ?? 467;
  const navItems = d.navItems ?? ["Agent Identity", "Knowledge sources", "Handoff rules", "Agent goals", "Deployment & channels"];
  const activeIdx = d.activeNav ?? 3;
  const g = d.goals ?? {};
  const cur = d.cursor;
  const [cx, cy] = cur ? chanXY(cur.keys, tMs, [0, 0]) : [0, 0];
  const VP = TOPBAR_H + HEAD_H;             // 203 — top of the scrolling area
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: APP_W, height: APP_H, background: "#fff", fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: SIDEBAR_W, top: TOPBAR_H, right: 0 }}>
        <PageHead title={d.title ?? "Customer Agent"} active={1} testLabel={d.testLabel ?? "Test TitanAssist"} />
      </div>
      <div style={{ position: "absolute", left: SIDEBAR_W, right: 0, top: VP, bottom: 0, background: S.pageBg, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -SIDEBAR_W, top: -VP, width: APP_W, transform: `translateY(${(-scroll).toFixed(2)}px)` }}>
          {navItems.map((n, i) => {
            const o = blk(navAt[i] ?? 0);
            if (o === null) return null;
            const top = G.navTop + i * G.navPitch;
            const act = i === activeIdx;
            return (
              <React.Fragment key={i}>
                {act ? <div style={{ position: "absolute", left: G.pillX, top: top - 7 + o, width: G.pillW, height: 38, background: "#f0f0ef", borderLeft: `3px solid ${rgb(PLUM.lavBtnInk)}` }} /> : null}
                <div style={{ position: "absolute", left: G.navX, top: top + o, fontSize: G.navFont, fontWeight: act ? 600 : 400, color: rgb(act ? PLUM.ink : PLUM.inkSoft) }}>{n}</div>
              </React.Fragment>
            );
          })}
          {blk(headAt) === null ? null : (
            <div style={{ position: "absolute", left: G.headX, top: G.headTop + blk(headAt), fontSize: G.headFont, fontWeight: 700, color: rgb(PLUM.ink), letterSpacing: 0.1 }}>{g.pageTitle ?? "Agent goals"}</div>
          )}
          {blk(cardAt) === null ? null : (
            <div style={{ position: "absolute", left: 0, top: blk(cardAt), width: APP_W }}>
              <GoalCard
                top={264}
                title={g.title1 ?? "Generate leads"}
                instrDesc={g.instrDesc1 ?? "Specific instructions for how the Concierge should handle sales conversations, lead qualification, and sales specific customer interactions"}
                instr={g.instr1 ?? "Focus on understanding the prospect's business challenges and current solutions. Use consultative selling approach with open-ended questions. Always qualify budget, authority, need, and timeline before proposing solutions."}
                actions={g.actions1 ?? [
                  { title: "Lead qualification", sub: "Fit & intent signals", chip: "Published" },
                  { title: "Discovery conversation", sub: "Needs assessment process", chip: "Draft" },
                  { title: "Product Demo scheduling", sub: "Calendar integration workflow", chip: "Published" },
                ]}
                handoffs={g.handoffs1 ?? [{ title: "Human escalation", sub: "Customer requests to speak to a human" }]}
              />
              <GoalCard
                top={1096}
                title={g.title2 ?? "Resolve issues"}
                instrDesc={g.instrDesc2 ?? "Specific instructions for how the Concierge should handle support conversations."}
                instr={g.instr2 ?? "Respond to customer inquiries clearly, empathetically, and accurately, while personalizing the interaction. Ensure privacy, avoid collecting sensitive data, and always aim to resolve the issue or guide the customer to the next best step."}
                actions={g.actions2 ?? [{ title: "Password reset", sub: "Process for resetting an account password", chip: "Published" }]}
                handoffs={g.handoffs2 ?? [{ title: "Human escalation", sub: "Customer requests to speak to a human" }]}
              />
            </div>
          )}
        </div>
      </div>
      {cur ? <Pointer x={cx} y={cy} size={cur.size ?? 34} /> : null}
    </div>
  );
}

/**
 * Reporting dashboard (S4, 40.400-50.000 s). Every number here is measured off
 * the full decode in work/scenes/4 (dec/d0001.. = film frame n where
 * t = (n+1198)/30), not estimated.
 *
 * The page scrolls as ONE piece under the top bar — the page head travels with
 * it (at 45.0 s the "Customer agent" head is gone while the rail and bar stay).
 * Layout, app px in page space (y = 0 at the app top, so the head is 48..203):
 *   "Reporting" 391,225 · left nav pill 117..368 y 261 h 38, 2nd item y 303
 *   overview card 391..1408 y 261..605; tiles y 369 h 182, x 432/749/1066 w 301
 *   Service 391..887 and Sales 912..1408, y 629..1093; 201x135 tiles, gaps 15/8
 *   "Conversations Resolved" card y 1120; plot x 459..1370, 12 points on a
 *   75.6 pitch, gridlines 57.5 apart from y 1250, series baseline y 1497
 *
 * Cues (scene-relative ms, from single-frame appearance times):
 *   nav 85 / 185 · overview card 350 · tiles 465 / 565 / 670 (each pops and
 *   starts its own count) · Service card 1020, its tiles 1450 · Sales card
 *   1720, its tiles 2050. Blocks arrive opaque, translated +56 app px, and
 *   settle exponentially — the measured residual decays x0.80/frame at 30 fps,
 *   i.e. enterMs 600.
 *
 * Counts: one shared 1700 ms ramp, ease-out pow 3.02, staggered by the tile
 * starts above. Fitted against 16 sampled frames per series it reproduces
 * 8/15/21/27/33/40/46/51/56/59/62/64/65/66/67/68 % and 0/6,008/11,601/…/53,948
 * to within one displayed unit (rmse 0.25 % and 237 of 53,948).
 *
 * Scroll: one eased move of 594 app px starting 3225 ms over 3510 ms,
 * easeInOut pow 1.5 — fits the registered per-frame trace to 1.6 px of 590 —
 * then a dead hold (frames 47.33-50.0 register as byte-identical).
 *
 * Chart: the series grows out of its baseline (each point interpolates from
 * y 1497 to its value, markers stay round) from 6080 ms over 3730 ms, ease-out
 * pow 2.9. Fitted against the per-column pink top edge of 11 frames, rms 1.7 px
 * — a uniform translate model fits 2-3x worse. It is still arriving at the cut.
 */
const RP = {
  navX: 117, navW: 255,
  cardX: 391, cardW: 1017,
  h1: { x: 391, y: 216, size: 22 },
  nav: { y: 258, h: 38, y2: 304, size: 16 },
  perf: { y: 261, h: 344, titleX: 431, titleY: 297, titleSize: 23 },
  tile: { y: 369, h: 182, w: 301, xs: [432, 749, 1066], label: 16, value: 40, delta: 14 },
  grid: {
    y: 629, h: 464, w: 496, xs: [391, 912], title: 23, pad: 41,
    rowY: [762, 912], tileW: 201, tileH: 135, tileDx: 216,
    dateY: 714, btn: { dx: 356, w: 101, h: 38, y: 705 },
  },
  chart: {
    y: 1120, h: 560, titleY: 1129, subY: 1159, legY: 1192,
    plotX: 459, plotW: 911, gridY: 1250, gridStep: 57.5, gridN: 5, base: 1497,
    xs: [510, 585, 660, 737, 812, 887, 964, 1039, 1114, 1191, 1266, 1342],
    ys: [1403, 1368, 1378, 1361, 1382, 1406, 1391, 1377, 1332, 1334, 1321, 1381],
  },
};

const fmtInt = (n) => Math.round(n).toLocaleString("en-US");

/** Boxed metric tile: page-bg fill, hairline border, vertically centred stack. */
function StatTile({ x, y, w, h, label, value, delta, deltaCol = PLUM.green, up = true, ls = 16, vs = 40, ds = 14 }) {
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box",
      border: `1px solid ${S.line}`, borderRadius: 6, background: rgb(PLUM.pageBg),
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ fontSize: ls, color: rgb(PLUM.inkSoft), textAlign: "center", lineHeight: 1.3, maxWidth: w - 26 }}>{label}</div>
      <div style={{ fontSize: vs, fontWeight: 700, color: rgb(PLUM.ink), marginTop: vs * 0.26, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: -0.4 }}>{value}</div>
      <div style={{ fontSize: ds, color: rgb(deltaCol), fontWeight: 600, marginTop: ds * 0.62, lineHeight: 1 }}>
        <span style={{ fontSize: ds * 0.95, marginRight: 5 }}>{up ? "▲" : "▼"}</span>{delta}
      </div>
    </div>
  );
}

/** Service / Sales metric card: title, kebab, date row, Export, tile grid. */
function MetricGrid({ x, title, tiles, tilesIn }) {
  const g = RP.grid;
  return (
    <div style={{ position: "absolute", left: x, top: g.y, width: g.w, height: g.h, boxSizing: "border-box", border: `1px solid ${S.line}`, borderRadius: 8, background: "#fff" }}>
      <div style={{ position: "absolute", left: g.pad, top: 18, fontSize: g.title, fontWeight: 600, color: rgb(PLUM.ink) }}>{title}</div>
      <div style={{ position: "absolute", left: g.w - g.pad - 30, top: 18, width: 30, height: 30, border: `1px solid ${S.line}`, borderRadius: 5, color: rgb(PLUM.inkFaint), fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>⋮</div>
      <div style={{ position: "absolute", left: g.pad, top: g.dateY - g.y, fontSize: 15, color: rgb(PLUM.inkSoft) }}>
        Date: <b style={{ color: rgb(PLUM.ink) }}>In the last 30 days</b> <span style={{ fontSize: 13, marginLeft: 3 }}>▾</span>
      </div>
      <div style={{
        position: "absolute", left: g.btn.dx, top: g.btn.y - g.y, width: g.btn.w, height: g.btn.h,
        border: `1px solid ${rgb(PLUM.fieldLine)}`, borderRadius: 5, fontSize: 15, fontWeight: 700,
        color: rgb(PLUM.ink), display: "flex", alignItems: "center", justifyContent: "center",
      }}>Export</div>
      {tilesIn === null ? null : tiles.map((tl, i) => (
        <StatTile
          key={i} x={g.pad + 1 + (i % 2) * g.tileDx} y={g.rowY[Math.floor(i / 2)] - g.y + tilesIn}
          w={g.tileW} h={g.tileH} ls={15} vs={26} ds={13} {...tl}
        />
      ))}
    </div>
  );
}

/** The pink area series, growing out of its baseline. Markers stay circular. */
function ChartSeries({ p }) {
  const c = RP.chart;
  const top = c.gridY - 30, h = c.base - top + 46;
  const pts = c.xs.map((x, i) => [x - c.plotX, c.base - (c.base - c.ys[i]) * p - top]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fy = (c.base - top).toFixed(1);
  return (
    <svg width={c.plotW} height={h} style={{ position: "absolute", left: c.plotX, top }}>
      <path d={`${line} L${pts[pts.length - 1][0].toFixed(1)},${fy} L${pts[0][0].toFixed(1)},${fy} Z`} fill={rgb(PLUM.chartPinkFill)} />
      <path d={line} fill="none" stroke={rgb(PLUM.chartPink)} strokeWidth="3" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill="#fff" stroke={rgb(PLUM.chartPink)} strokeWidth="2.6" />)}
    </svg>
  );
}

function ReportingInterior(d, tMs) {
  const t = tMs / 1000;
  const c = RP.chart, g = RP.grid;
  const cue = d.cues ?? {};
  const enterMs = d.enterMs ?? 600;
  const rise = d.riseY ?? 56;
  const blk = (atMs) => (tMs < atMs ? null : rise * settleDecay(t, atMs / 1000, enterMs / 1000));

  const sc = d.scrollRamp ?? { atMs: 3225, durMs: 3510, dist: 594, pow: 1.5 };
  const scroll = sc.dist * easeInOut(clamp01((tMs - sc.atMs) / sc.durMs), sc.pow);

  // three staggered counts on one shared ramp
  const cnt = d.count ?? { atMs: [465, 565, 670], durMs: 1710, pow: 3.02 };
  const kAt = (i) => 1 - Math.pow(1 - clamp01((tMs - cnt.atMs[i]) / cnt.durMs), cnt.pow);
  const m = d.metrics ?? {};
  const vals = [
    `${Math.round((m.resolution ?? 68) * kAt(0))}%`,
    `${Math.round((m.handoff ?? 10) * kAt(1))}%`,
    fmtInt((m.conversations ?? 53948) * kAt(2)),
  ];

  const ch = d.chartRamp ?? { atMs: 6080, durMs: 3730, pow: 2.9 };
  const cp = 1 - Math.pow(1 - clamp01((tMs - ch.atMs) / ch.durMs), ch.pow);

  const navAt = cue.nav ?? [85, 185];
  const perfAt = cue.perf ?? 350;
  const svcAt = cue.service ?? 1020, svcTilesAt = cue.serviceTiles ?? 1450;
  const salAt = cue.sales ?? 1720, salTilesAt = cue.salesTiles ?? 2050;
  const perfIn = blk(perfAt), svcIn = blk(svcAt), salIn = blk(salAt);
  const svcTilesIn = blk(svcTilesAt), salTilesIn = blk(salTilesAt);
  const VP = TOPBAR_H + HEAD_H;

  const svcTiles = [
    { label: "Time to first reply", value: m.firstReply ?? "1 sec", delta: "0.3%", up: true },
    { label: "Time to resolution", value: m.resolutionTime ?? "12 mins", delta: "2%" },
    { label: "Total conversations handled", value: m.handled ?? "20,478", delta: "14%" },
    { label: "Topics handled", value: m.topics ?? "28", delta: "5%" },
  ];
  const salTiles = [
    { label: "Meetings booked", value: m.meetings ?? "47", delta: "12%" },
    { label: "Leads generated", value: m.leads ?? "29", delta: "8%" },
    { label: "Revenue booked", value: m.revenue ?? "$103,489", delta: "20%" },
  ];

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: APP_W, height: APP_H, background: rgb(PLUM.pageBg), fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: SIDEBAR_W, right: 0, top: TOPBAR_H, bottom: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -SIDEBAR_W, top: -TOPBAR_H, width: APP_W, transform: `translateY(${(-scroll).toFixed(2)}px)` }}>
          {/* the page head scrolls with the page */}
          <div style={{ position: "absolute", left: SIDEBAR_W, top: TOPBAR_H, right: 0 }}>
            <PageHead title={d.title ?? "Customer agent"} active={2} testLabel={d.testLabel ?? "Test TitanAssist"} />
          </div>
          <div style={{ position: "absolute", left: SIDEBAR_W, top: VP, right: 0, height: 2400, background: rgb(PLUM.pageBg) }} />

          <div style={{ position: "absolute", left: RP.h1.x, top: RP.h1.y, fontSize: RP.h1.size, fontWeight: 700, color: rgb(PLUM.ink), letterSpacing: 0.1 }}>
            {d.pageTitle ?? "Reporting"}
          </div>

          {blk(navAt[0]) === null ? null : (
            <React.Fragment>
              <div style={{ position: "absolute", left: RP.navX, top: RP.nav.y + blk(navAt[0]), width: RP.navW, height: RP.nav.h, background: "#f0f0ef", borderLeft: `3px solid ${rgb(PLUM.lavBtnInk)}` }} />
              <div style={{ position: "absolute", left: RP.navX + 15, top: RP.nav.y + 5 + blk(navAt[0]), fontSize: RP.nav.size, fontWeight: 600, color: rgb(PLUM.ink) }}>Reports</div>
            </React.Fragment>
          )}
          {blk(navAt[1]) === null ? null : (
            <div style={{ position: "absolute", left: RP.navX + 15, top: RP.nav.y2 + blk(navAt[1]), fontSize: RP.nav.size, color: rgb(PLUM.inkSoft) }}>Coaching signals</div>
          )}

          {perfIn === null ? null : (
            <div style={{ position: "absolute", left: RP.cardX, top: RP.perf.y + perfIn, width: RP.cardW, height: RP.perf.h, boxSizing: "border-box", border: `1px solid ${S.line}`, borderRadius: 8, background: "#fff" }}>
              <div style={{ position: "absolute", left: RP.perf.titleX - RP.cardX, top: RP.perf.titleY - RP.perf.y, fontSize: RP.perf.titleSize, fontWeight: 600, color: rgb(PLUM.ink) }}>
                {d.overviewTitle ?? "Performance overview"}
              </div>
              {[["Resolution rate", "5%"], ["Handoff rate", "2%"], ["Total # of conversations", "16%"]].map((lb, i) => (
                blk(cnt.atMs[i]) === null ? null : (
                  <StatTile
                    key={i} x={RP.tile.xs[i] - RP.cardX} y={RP.tile.y - RP.perf.y + blk(cnt.atMs[i])}
                    w={RP.tile.w} h={RP.tile.h} label={lb[0]} value={vals[i]} delta={lb[1]}
                    ls={RP.tile.label} vs={RP.tile.value} ds={RP.tile.delta}
                  />
                )
              ))}
            </div>
          )}

          {svcIn === null ? null : (
            <div style={{ position: "absolute", left: 0, top: svcIn, width: APP_W }}>
              <MetricGrid x={g.xs[0]} title="Service metrics" tiles={svcTiles} tilesIn={svcTilesIn === null ? null : svcTilesIn - svcIn} />
            </div>
          )}
          {salIn === null ? null : (
            <div style={{ position: "absolute", left: 0, top: salIn, width: APP_W }}>
              <MetricGrid x={g.xs[1]} title="Sales metrics" tiles={salTiles} tilesIn={salTilesIn === null ? null : salTilesIn - salIn} />
            </div>
          )}

          <div style={{ position: "absolute", left: RP.cardX, top: c.y, width: RP.cardW, height: c.h, boxSizing: "border-box", border: `1px solid ${S.line}`, borderRadius: 8, background: "#fff" }} />
          <div style={{ position: "absolute", left: RP.cardX + 42, top: c.titleY, fontSize: 20, fontWeight: 600, color: rgb(PLUM.ink) }}>
            {d.chartTitle ?? "Conversations Resolved"}
          </div>
          <div style={{ position: "absolute", left: RP.cardX + 42, top: c.subY, width: 960, fontSize: 13, color: rgb(PLUM.inkFaint) }}>
            {d.chartSub ?? "Number of customer issues resolved by TitanAssist over time, highlighting its effectiveness in handling problems autonomously."}
          </div>
          <div style={{ position: "absolute", left: RP.cardX + 42, top: c.legY, fontSize: 13.5, color: rgb(PLUM.inkSoft), display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: rgb(PLUM.chartPink), display: "inline-block" }} />Tickets
          </div>
          <div style={{
            position: "absolute", left: RP.cardX + 5, top: 1412, fontSize: 13, color: rgb(PLUM.inkSoft),
            transform: "rotate(-90deg)", transformOrigin: "0 0", whiteSpace: "nowrap",
          }}>Tickets resolved</div>
          {Array.from({ length: c.gridN }).map((_, i) => (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: c.plotX, top: c.gridY + i * c.gridStep, width: c.plotW, height: 1, background: "#eeecea" }} />
              <div style={{ position: "absolute", left: c.plotX - 26, top: c.gridY + i * c.gridStep - 8, fontSize: 13, color: rgb(PLUM.inkFaint) }}>#</div>
            </React.Fragment>
          ))}
          <ChartSeries p={cp} />
        </div>
      </div>
    </div>
  );
}

/**
 * Deployed website chat (S8, 68.333-77.233 s, and the plate under S9's wash).
 *
 * Measured on the full decode in work/scenes/8 (camera + content both removed
 * by work/scenes/8/stab.mjs, so every number below is app px on the screen at
 * the scene's first frame):
 *
 *   ZOOM. The screen CONTENT carries its own zoom-out on top of the camera
 *   pull — the widget's teal header is 454.15 app px wide at t0 and 411.4 at
 *   t 8.97, while the tracked monitor screen only shrinks by the camera's
 *   0.887. Uniform, LINEAR in t at 1.07146 %/s, about content (706.6, 402.2);
 *   fitted over 260 frames the residual is <=0.7 px on every edge. `zoom.c`
 *   pins a constant value (S9's frozen plate); `zoom.rate` runs it from tMs.
 *
 *   PAGE. A blurred site behind the widget: ground rgb(250,250,248) with white
 *   rounded tiles, a full-width band down to y 133, then two rows (182-522,
 *   576-) split by a gutter at x 114-167. Right of x~960 the page is bare
 *   ground; the darkening from 250 to 222 at the widget's edge is the widget's
 *   own shadow, measured to fall off over ~170 px.
 *
 *   WIDGET. x 503 y 20, 454 x 820 (its bottom is below the screen until the
 *   pull reveals it), header 98 tall, fontPx 18 (line box 27 exactly).
 *   Messages pop with NO fade, translated +45 px, settling exponentially
 *   (x0.78/frame -> tau 134 ms), at 100 / 1000 / 1900 / 3233 / 5167 / 6933 ms.
 *   Arriving bubbles are hidden behind an opaque bar 114 px above the card
 *   bottom until the scroll lifts them out.
 */
function SiteChatInterior(d, tMs) {
  const scrollY = chan(d.scrollKeys, tMs, 0);
  // content zoom: pinned (z.c) or constant-rate from the scene clock
  const z = d.zoom;
  const c = z ? (z.c ?? Math.max(0.05, Math.min(4, 1 - (z.rate ?? 0) * (tMs / 1000)))) : 1;
  const pg = d.page;
  const body = (
    <React.Fragment>
      {pg ? (
        <div style={{
          position: "absolute", left: pg.x ?? -160, top: pg.y ?? -110,
          width: pg.w ?? 1780, height: pg.h ?? 1120,
          background: rgb(pg.ground ?? [250, 250, 248]), filter: `blur(${pg.blur ?? 5}px)`,
        }}>
          {(pg.tiles ?? []).map((tl, i) => (
            <div key={i} style={{
              position: "absolute", left: tl[0], top: tl[1], width: tl[2], height: tl[3],
              background: pg.tile ? rgb(pg.tile) : "#fff", borderRadius: pg.radius ?? 14,
            }} />
          ))}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, opacity: 0.9 }}>
          <Backdrop w={APP_W} h={APP_H} y={-30} tint={[252, 252, 251]} />
        </div>
      )}
      <div style={{
        position: "absolute", left: d.panelX ?? 519, top: d.panelY ?? 50,
        boxShadow: d.panelShadow ?? "0 14px 44px rgba(30,40,44,0.18)", borderRadius: d.radius ?? 8,
      }}>
        <ChatThread
          w={d.panelW ?? 420} h={d.panelH ?? 742} tMs={tMs} scrollY={scrollY}
          messages={d.messages ?? []} brand={d.brand} metrics={d.metrics ?? null}
          headerH={d.headerH ?? 86} fontPx={d.fontPx ?? 13.2} radius={d.radius ?? 8} shadow={false}
        />
      </div>
    </React.Fragment>
  );
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: APP_W, height: APP_H, background: "#fff", fontFamily: FONT, overflow: "hidden" }}>
      {c === 1 ? body : (
        <div style={{
          position: "absolute", left: 0, top: 0, width: APP_W, height: APP_H,
          transform: `scale(${c.toFixed(5)})`,
          transformOrigin: `${(z.ox ?? 728).toFixed(1)}px ${(z.oy ?? 408).toFixed(1)}px`,
        }}>{body}</div>
      )}
    </div>
  );
}

/**
 * The scene-9 outro on the monitor. Measured on the full decode of 76.9-82.0 s
 * (work/scenes/9/): the chat page cross-dissolves into the end-card plate with
 * a SPATIALLY UNIFORM opacity ramp — alpha is 0.48-0.52 everywhere across the
 * screen at t=77.533, so the prior diagonal sweep-wipe was wrong — running
 * LINEAR from t 77.241 to 77.769 (528 ms). The wordmark resolves separately,
 * left to right, finishing ~78.15, well after the ground has landed. The chat
 * underneath is dead still (no scroll, no new messages) through the whole wash.
 */
function SpotlightInterior(d, tMs) {
  const wash = clamp01((tMs - (d.washAtMs ?? 0)) / (d.washMs ?? 528));
  // reveal channels, both as a fraction of the screen width, read straight off
  // the reference's per-column alpha (work/scenes/9/reveal.mjs): `solid` is the
  // fully-opaque edge, `soft` the width of the ramp ahead of it, which narrows
  // as the mark lands.
  const solid = chan(d.solidKeys, tMs, 2);
  const soft = chan(d.softKeys, tMs, 0.24);
  const bloom = clamp01(chan(d.bloomKeys, tMs, 1));
  const under = d.under ? SiteChatInterior(d.under, 1e9) : <div style={{ position: "absolute", inset: 0, background: "#fff" }} />;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: APP_W, height: APP_H, overflow: "hidden" }}>
      {under}
      {/* zIndex must beat the chat header's own z-index:2, or the green header
          paints through the finished wash. */}
      <div style={{ position: "absolute", inset: 0, opacity: wash, zIndex: 5 }}>
        <EndcardPlate
          w={APP_W} h={APP_H}
          wordmark={d.wordmark ?? "Spotlight"}
          dot={d.dot ?? [227, 55, 7]}
          gradA={d.gradA ?? [108, 38, 75]}
          gradB={d.gradB ?? [50, 6, 33]}
          sizeK={d.sizeK ?? 0.10502}
          dyK={d.dyK ?? -0.02792}
          dxK={d.dxK ?? 0}
          track={d.track ?? -0.0235}
          solid={solid} soft={soft} bloom={bloom}
        />
      </div>
    </div>
  );
}

// ── the preset ────────────────────────────────────────────────────────────
export function PlumDesk(cfg, t) {
  const from = cfg.startMs / 1000, to = (cfg.startMs + cfg.durationMs) / 1000;
  if (t < from - 0.001 || t > to + 0.001) return null;
  const tMs = (t - from) * 1000;
  const d = cfg.interior ?? { kind: "goals" };

  let interior = null;
  if (d.kind === "goals") interior = GoalsInterior(d, tMs);
  else if (d.kind === "reporting") interior = ReportingInterior(d, tMs);
  else if (d.kind === "sitechat") interior = SiteChatInterior(d, tMs);
  else if (d.kind === "spotlight") interior = SpotlightInterior(d, tMs);

  const chrome = d.kind === "goals" || d.kind === "reporting";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <Wood />
      <div style={{ position: "absolute", inset: 0, filter: "blur(0.55px)" }}><PhotoFrame /><StressBall /><Headset /><Mug /></div>
      <div style={{ position: "absolute", inset: 0, filter: "blur(0.75px)" }}><Sticky /><Notebook /></div>
      <div style={{ position: "absolute", inset: 0, filter: "blur(1.4px)" }}><Keyboard /></div>
      {/* the monitor: measured keystone is tiny (right side 0.5% taller, right
          edge -0.35 deg), reproduced with a shallow perspective rotateY. */}
      <div style={{
        position: "absolute", left: 0, top: 0, width: 1280, height: 720,
        transform: "perspective(4200px) rotateY(-1.6deg) rotateZ(0.032deg)",
        transformOrigin: `${(BEZEL.x + BEZEL.w / 2).toFixed(1)}px ${(BEZEL.y + BEZEL.h / 2).toFixed(1)}px`,
      }}>
        <div style={{
          position: "absolute", left: BEZEL.x, top: BEZEL.y, width: BEZEL.w, height: BEZEL.h,
          background: "linear-gradient(172deg,#2c2c2e 0%, #232325 44%, #191919 100%)", borderRadius: BEZEL.r,
          boxShadow: "0 20px 46px rgba(12,6,2,0.62), 0 3px 8px rgba(12,6,2,0.5)",
        }} />
        <div style={{ position: "absolute", left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h, overflow: "hidden", background: "#fff", borderRadius: 1.5 }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: APP_W, height: APP_H, transform: `scale(${K})`, transformOrigin: "0 0" }}>
            {interior}
            {chrome ? (
              <>
                <TopBar searchLabel={cfg.searchLabel} account={cfg.account} accountInitials={cfg.accountInitials} />
                <SideRail h={APP_H} />
              </>
            ) : null}
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(114deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0) 26%)", pointerEvents: "none" }} />
        </div>
      </div>
    </div>
  );
}

export const note = "The Breeze desk set: drawn wooden desk with the measured prop dressing (oak photo frame, mint stress ball, padded headset, patterned mug of red tea, peach sticky pad, spiral notebook + pen, white keyboard) around a dark-bezel monitor whose screen renders a live interior. Frame with the per-scene camera.";
export const nativeMs = 7400;
