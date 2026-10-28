/**
 * saru-rules-card.jsx — the operator's rules card (saru scene 3).
 *
 * The fir chat card's CHROME with a settings body instead of a thread: same
 * floating white panel (radius, drop shadow, 73.3px header with a back chevron,
 * a brand tile, a title and a sub-label), and under it a stack of rule rows.
 *
 * REDESIGN (v2). The first cut wrote each rule as a SENTENCE with a toggle
 * ("Reply window — 9am to 9pm" + a switch), which read as three paragraphs of
 * settings copy and made the card the busiest thing in the film. A rule here is
 * now a NAME and a VALUE and nothing else:
 *
 *     [icon]  Daily cap                                    ( 25/day )
 *
 * a small line icon and a short label on the left rail, a value CHIP — rounded
 * pill, light warm ground, ink text — on the right rail. No switches: a toggle
 * says "this is on/off", and the point of the beat is what the rule SAYS, not
 * that it is enabled. The icons are drawn as strokes rather than set as emoji
 * so the row furniture is in the same line-art language as the monkey mark and
 * the card carries no colour it did not choose.
 *
 * PALETTE: the real portal's, not the film's. Ink #554a42, secondary #786f68 /
 * #8d8179, brick accent #b65243 — the indigo the first cut used is banned
 * inside portal UI. The header tile is the shipped app icon (light grey ground,
 * line-art monkey) via SaruTile, never the black "s" letterform.
 *
 * `grow` keeps the panel exactly as tall as the rules it holds, so the card
 * opens under each rule as it lands instead of showing an empty white void
 * while it fills. Rows arrive one at a time, front-loaded, and the frame is
 * dead still from the last landing to the last frame.
 *
 * Row copy is rendered VERBATIM from `label` and `chip`.
 *
 * Pure function of t (seconds, absolute film clock). Design space 1280x720.
 */
import React from "react";
import { clamp01, rgb, easeByName } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";
import { s, kv, absKeys } from "../../fir/presets/fir-shared.jsx";
import { SaruTile } from "./saru-mark-tile.jsx";

// Real Saru portal palette.
const INK = [85, 74, 66];        // #554a42
const MUTED = [120, 111, 104];   // #786f68
const FAINT = [141, 129, 121];   // #8d8179
const BRICK = [182, 82, 67];     // #b65243

/** Card chrome measured on fir-chat-card (stage px at 1280x720). */
const CHROME = {
  headerH: 73.3, chevronX: 30.6, chevronY: 28.7,
  tileX: 77.3, tileY: 19.3, tileSize: 37.3,
  titleX: 127.5, titleY: 15.8, titleSize: 18.3,
  subX: 128.7, subY: 40.6, subSize: 14.7,
};

/**
 * A rule's icon: one 20px line glyph per rule kind, stroked in the same weight
 * so the three read as one set. The fader knobs are FILLED with the card's own
 * background so the track does not show through them — the alternative, gapping
 * each track around its knob, breaks up at this size.
 */
function RuleIcon({ kind, size = 20, colour = MUTED, width = 1.8, bgFill = "#fdfdfd" }) {
  const g = {
    fill: "none", stroke: rgb(colour), strokeWidth: width,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: "block" }} aria-hidden="true">
      {/* clock, hands at nine — the reply window */}
      {kind === "clock" && (
        <g {...g}>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 5.5 L10 10 L6.1 10" />
        </g>
      )}
      {/* the no-entry sign — what saru stays out of */}
      {kind === "skip" && (
        <g {...g}>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M4.9 4.9 L15.1 15.1" />
        </g>
      )}
      {/* two faders — a dialled-in limit. Sized to the same 15px optical box as
          the two circles above, or it reads as a lighter mark in the set. */}
      {kind === "cap" && (
        <g {...g}>
          <path d="M2.5 5.6 L17.5 5.6" />
          <circle cx="12.9" cy="5.6" r="2.9" fill={bgFill} />
          <path d="M2.5 14.4 L17.5 14.4" />
          <circle cx="7.1" cy="14.4" r="2.9" fill={bgFill} />
        </g>
      )}
    </svg>
  );
}

export function SaruRulesCard({ t, from, to, cfg }) {
  if (t < from || t > to) return null;
  const card = cfg.card ?? {};
  const W = card.w ?? 560, H = card.h ?? 306, X = card.x ?? 360, Y = card.y ?? 146;
  const R = card.radius ?? 14;
  const cardBg = card.bg ?? "#fdfdfd";
  // Optional whole-card motion, same channel names as fir-chat-card.
  const st = kv(absKeys(cfg.startMs, card.keys ?? []), t, { dx: 0, dy: 0, opacity: 1 });
  if (st.opacity <= 0.003) return null;

  const col = {
    ink: INK, muted: MUTED, icon: MUTED, accent: BRICK,
    divider: INK, chipBg: INK, chipInk: INK, ...(cfg.colours ?? {}),
  };
  const lay = {
    headerH: CHROME.headerH, padH: 28, bodyPadTop: 15, rowH: 68,
    iconSize: 20, iconGap: 15,
    chipH: 30, chipPadH: 13, chipRadius: 15, chipAlpha: 0.075,
    ...(cfg.layout ?? {}),
  };
  const ty = {
    row: 21, chip: 17, title: CHROME.titleSize, sub: CHROME.subSize, ...(cfg.type ?? {}),
  };
  const header = cfg.header ?? {};
  const rows = cfg.rows ?? [];
  const bodyTop = lay.headerH + lay.bodyPadTop;

  // `grow` (default on): the panel is only as tall as the rules it holds and
  // GROWS by one row-height as each rule lands, so the card never shows the
  // dead white void a fixed-height settings card has while it is filling. The
  // growth LEADS its row by `growLeadMs` and is a shade quicker than the row's
  // fade, so the box is already there when the label appears instead of
  // clipping it — the panel opens, then the rule lands in it. The configured
  // card height `H` is the FINAL height, so the resting frame is unchanged
  // whichever way this is set.
  const grow = cfg.grow !== false;
  const padBottom = Math.max(0, H - (bodyTop + lay.rowH * rows.length));
  const grown = rows.reduce((acc, r) => {
    const g0 = from + s((r.atMs ?? 0) - (r.growLeadMs ?? cfg.growLeadMs ?? 90));
    return acc + easeByName("out")(clamp01((t - g0) / Math.max(1e-6, s(r.growMs ?? cfg.growMs ?? 230))));
  }, 0);
  const cardH = grow ? bodyTop + lay.rowH * grown + padBottom : H;

  const rowEls = rows.map((r, i) => {
    const atS = from + s(r.atMs ?? 0);
    if (t < atS) return null;
    // entry: a short fade + rise. No scale — 21px type scaling reads as a
    // softness artefact at this size, and the row is a UI element, not a pop.
    const e = easeByName("out")(clamp01((t - atS) / Math.max(1e-6, s(r.enterMs ?? 300))));
    const dy = (r.enterDy ?? 10) * (1 - e);
    const o = clamp01(e * 1.3);

    // The chip settles a beat behind its label, so the eye reads the RULE and
    // then the VALUE inside one landing. Scaled about its right edge, so the
    // right rail never moves.
    const cAt = atS + s(r.chipDelayMs ?? cfg.chipDelayMs ?? 100);
    const ce = easeByName("out")(clamp01((t - cAt) / Math.max(1e-6, s(r.chipMs ?? cfg.chipMs ?? 240))));
    const cScale = 0.94 + 0.06 * ce;

    const top = bodyTop + i * lay.rowH;
    return (
      <div key={i} style={{ position: "absolute", left: 0, right: 0, top: top + dy, height: lay.rowH, opacity: o }}>
        {i > 0 && (
          <div style={{
            position: "absolute", left: lay.padH, right: lay.padH, top: 0, height: 1,
            background: `rgba(${col.divider[0]},${col.divider[1]},${col.divider[2]},0.10)`,
          }} />
        )}
        {/* left rail: icon + label, on one optical baseline */}
        <div style={{
          position: "absolute", left: lay.padH, top: 0, height: lay.rowH,
          display: "flex", alignItems: "center", gap: lay.iconGap,
        }}>
          <RuleIcon kind={r.icon} size={lay.iconSize} colour={col.icon}
            width={r.iconWidth ?? lay.iconWidth ?? 1.8} bgFill={cardBg} />
          <div style={{
            fontFamily: FONT, fontSize: ty.row, fontWeight: 600, lineHeight: 1.2,
            letterSpacing: "-0.006em", color: rgb(col.ink), whiteSpace: "pre",
          }}>{r.label ?? ""}</div>
        </div>
        {/* right rail: the value chip */}
        <div style={{
          position: "absolute", right: lay.padH, top: (lay.rowH - lay.chipH) / 2,
          height: lay.chipH, display: "flex", alignItems: "center",
          padding: `0 ${lay.chipPadH}px`, borderRadius: lay.chipRadius,
          background: `rgba(${col.chipBg[0]},${col.chipBg[1]},${col.chipBg[2]},${lay.chipAlpha})`,
          fontFamily: FONT, fontSize: ty.chip, fontWeight: 600, lineHeight: 1,
          letterSpacing: "-0.004em", color: rgb(col.chipInk), whiteSpace: "pre",
          opacity: ce, transform: `scale(${cScale.toFixed(4)})`, transformOrigin: "100% 50%",
        }}>{r.chip ?? ""}</div>
      </div>
    );
  });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: st.opacity }}>
      <div style={{
        position: "absolute", left: X + st.dx, top: Y + st.dy, width: W, height: cardH,
        background: cardBg, borderRadius: R, overflow: "hidden",
        boxShadow: card.shadow ?? "0 10px 34px rgba(24,20,70,0.14)",
      }}>
        {/* header — fir-chat-card's measured chrome */}
        <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: lay.headerH, fontFamily: FONT }}>
          <svg width="10" height="16.7" viewBox="0 0 12 20"
            style={{ position: "absolute", left: CHROME.chevronX, top: CHROME.chevronY }}>
            <path d="M10 2 L3 10 L10 18" fill="none" stroke={rgb(header.chevron ?? col.accent)}
              strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ position: "absolute", left: CHROME.tileX, top: CHROME.tileY }}>
            {/* the shipped app icon: light-grey tile, line-art monkey. Shared
                with every other saru scene through SaruTile so the mark is one
                drawing everywhere it appears. */}
            <SaruTile
              size={CHROME.tileSize} base={CHROME.tileSize}
              bg={header.tileBg ?? [236, 236, 236]}
              radius={header.tileRadius ?? 0.235}
              markColour={header.tileMark ?? INK}
              markFrac={header.tileMarkFrac ?? 0.72}
              border={header.tileBorder ?? 1.2}
              borderColour={header.tileBorderColour ?? INK}
              borderAlpha={header.tileBorderAlpha ?? 0.18}
            />
          </div>
          <div style={{
            position: "absolute", left: CHROME.titleX, top: CHROME.titleY, fontSize: ty.title,
            fontWeight: 700, lineHeight: 1, color: rgb(col.ink), letterSpacing: "-0.012em",
          }}>{header.title}</div>
          <div style={{
            position: "absolute", left: CHROME.subX, top: CHROME.subY, fontSize: ty.sub,
            lineHeight: "18px", color: rgb(col.muted),
          }}>{header.sub}</div>
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0, height: 1,
            background: `rgba(${col.divider[0]},${col.divider[1]},${col.divider[2]},0.12)`,
          }} />
        </div>
        {rowEls}
      </div>
    </div>
  );
}
