/**
 * brand-sheet.jsx — a brand-kit SPECIMEN SHEET, drawn as artwork.
 *
 * WHY THIS EXISTS
 * media-window's `interior` slot needs "here is everything we pulled out of
 * that site" the moment a launch film cuts to it — there is no real
 * extraction UI to record. This draws the finished document instead: a
 * header, the extracted wordmark, a full-width hex-swatch row, then boxed
 * specimen rows for type, iconography and product cards, all on a plain
 * white sheet. Matches the DENSITY of a real brand-kit export (tight
 * gutters, hairlines, small type) rather than a slide, because the shot
 * shows it for well under 3 seconds and it has to read as one finished
 * artefact at a glance, not as something meant to be read line by line.
 *
 * ASSEMBLY, NOT A STATIC PASTE
 * `reveal` fades+rises each top-level block (header, wordmark, swatch row,
 * then each row in `rows`) in top-down order on a short stagger, so the
 * sheet reads as being BUILT. Header and wordmark carry the lowest indices
 * so they land almost immediately; everything is normally finished well
 * inside a second, which leaves the shot dead still before the outer card's
 * pull-back. `reveal: null` renders the finished sheet with no animation.
 *
 * LAYOUT
 * Every block is positioned in explicit stage px (not auto-flowed), because
 * the sheet must never reflow between frames — the renderer screenshots
 * frames out of order and any layout that depended on accumulated content
 * would jitter. Flexbox is used only WITHIN a fixed-size block, to centre
 * or distribute content whose text width is unknown ahead of render (the
 * header's orb+title group, the swatch row's equal-width chips) — that is
 * ordinary static layout, not a transition, so it stays a pure function of
 * the block's own props.
 *
 * Pure function of t. `t`/`from`/`to` are absolute film-clock seconds; the
 * registry passes the whole scene object as `cfg`, scene-relative ms cues
 * (`reveal.atMs` etc.) are offset against `from` here. All positions are
 * design px on the 1280x720 stage.
 */

import React from "react";
import { at, easeOut, rgb } from "../easing.js";
import { FONT } from "../theme.js";

// Georgia (and its stack) is the only thing installed everywhere that reads
// as a confident editorial serif for the header title — matches the
// reference's "Building Brand Kit" treatment without shipping a webfont.
const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";

const two = (n) => Math.round(n * 100) / 100;

// #RGB / #RRGGBB -> [r,g,b]. Swatches normally carry an explicit `colour`
// (see params doc), but a hex-only entry should still render rather than
// come out black, so this is the fallback path, not the primary one.
function parseHex(hex) {
  if (!hex) return [200, 200, 200];
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [200, 200, 200];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const luminance = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

// ── small drawn glyphs for the iconography row ──────────────────────────────
// Abstract, no photos: a blob, a magnifier, a lettered chip, a little
// character silhouette, a sparkle. Fixed paths (no per-frame jitter) because
// nothing here needs motion — only the row's reveal does.

const Blob = ({ size, colour, rot = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
    <path
      d="M20 4 C29 4 36 11 36 20 C36 29 28 36 19 36 C10 36 4 28 5 19 C6 10 12 4 20 4 Z"
      fill={rgb(colour)} transform={`rotate(${rot} 20 20)`} />
  </svg>
);

const Magnifier = ({ size, colour }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
    <circle cx="16" cy="16" r="10" fill="none" stroke={rgb(colour)} strokeWidth="3.4" />
    <line x1="23.5" y1="23.5" x2="33" y2="33" stroke={rgb(colour)} strokeWidth="3.4" strokeLinecap="round" />
  </svg>
);

const Chip = ({ size, colour, ink, mark }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
    <rect x="4" y="11" width="32" height="18" rx="6" fill={rgb(colour)} />
    <text x="20" y="24" textAnchor="middle" fontSize="12" fontWeight="700"
      fontFamily={FONT} fill={rgb(ink)}>{mark}</text>
  </svg>
);

const Avatar = ({ size, colour }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
    <path d="M8 35 C8 25 12 21 20 21 C28 21 32 25 32 35 Z" fill={rgb(colour)} opacity="0.88" />
    <circle cx="20" cy="13" r="7.4" fill={rgb(colour)} />
  </svg>
);

const Spark = ({ size, colour }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
    <path
      d="M20 3 C21 12 28 19 37 20 C28 21 21 28 20 37 C19 28 12 21 3 20 C12 19 19 12 20 3 Z"
      fill={rgb(colour)} />
  </svg>
);

function Glyph({ kind, size, colour, ink, mark }) {
  switch (kind) {
    case "magnifier": return <Magnifier size={size} colour={colour} />;
    case "chip": return <Chip size={size} colour={colour} ink={ink} mark={mark ?? "•"} />;
    case "avatar": return <Avatar size={size} colour={colour} />;
    case "spark": return <Spark size={size} colour={colour} />;
    case "blob2": return <Blob size={size} colour={colour} rot={26} />;
    default: return <Blob size={size} colour={colour} />;
  }
}

const Tile = ({ kind, colour, ink, mark, paper, size = 54 }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.24, flex: "none",
    background: rgb(paper), border: `1px solid rgba(0,0,0,0.08)`,
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <Glyph kind={kind} size={size * 0.62} colour={colour} ink={ink} mark={mark} />
  </div>
);

// ── layout constants (1280x720 design space) ────────────────────────────────
const PAD_X = 66;
const CONTENT_W = 1280 - PAD_X * 2;
const GUTTER = 16;

// Relative weight of each row kind's content height. Rows are NOT given a
// fixed px height — the sheet divides whatever vertical space is left after
// the header/wordmark/swatches among however many rows the scene supplies,
// in these proportions, so adding or dropping a row can never overflow the
// 720px stage or leave a gap at the bottom.
const ROW_WEIGHT = { type: 1.05, icons: 0.6, grid: 1.05, chips: 0.5 };

// ── specimen row renderers — pure, no dependence on t (the enclosing Block
// handles the only per-frame value, the reveal fade/rise) ──────────────────

function TypeRow({ row, w, h, font, ink, slate }) {
  const leftW = Math.round((w - GUTTER) * 0.63);
  const rightW = w - GUTTER - leftW;
  const left = row.left ?? {};
  const right = row.right ?? {};
  const cellStyle = {
    boxSizing: "border-box", height: h, borderRadius: 10,
    border: "1px solid rgba(20,18,28,0.13)", padding: "18px 20px",
  };
  return (
    <div style={{ position: "relative", width: w, height: h, display: "flex", gap: GUTTER, fontFamily: font }}>
      <div style={{ ...cellStyle, width: leftW }}>
        <div style={{
          fontSize: 27, fontWeight: 800, letterSpacing: "-0.015em", color: rgb(ink),
          lineHeight: 1.14, marginBottom: 10,
        }}>
          {left.headline}
        </div>
        <div style={{ fontSize: 13, fontWeight: 400, color: rgb(slate), lineHeight: 1.55, maxWidth: leftW - 40 }}>
          {left.body}
        </div>
      </div>
      <div style={{ ...cellStyle, width: rightW, display: "flex", flexDirection: "column" }}>
        {!!(right.nav && right.nav.length) && (
          <div style={{
            fontSize: 11.5, fontWeight: 600, letterSpacing: "0.02em", color: rgb(ink),
            marginBottom: 16, opacity: 0.82,
          }}>
            {right.nav.join("  ·  ")}
          </div>
        )}
        <div style={{ fontSize: 16, fontWeight: 800, color: rgb(ink), marginBottom: 6 }}>
          {right.heading}
        </div>
        <div style={{ fontSize: 12, fontWeight: 400, color: rgb(slate), lineHeight: 1.5 }}>
          {right.body}
        </div>
      </div>
    </div>
  );
}

function IconsRow({ row, w, h, font, ink, paper }) {
  const cells = row.cells ?? [];
  const cellW = Math.round((w - GUTTER * (cells.length - 1 || 1)) / (cells.length || 1));
  const cellStyle = {
    boxSizing: "border-box", height: h, width: cellW, borderRadius: 10,
    border: "1px solid rgba(20,18,28,0.13)", padding: "0 20px",
    display: "flex", alignItems: "center", gap: 10,
  };
  return (
    <div style={{ width: w, height: h, display: "flex", gap: GUTTER, fontFamily: font }}>
      {cells.map((cell, i) => (
        <div key={i} style={cellStyle}>
          {(cell.tiles ?? []).map((tl, j) => (
            <Tile key={j} kind={tl.kind} colour={tl.colour ?? ink} ink={ink} mark={tl.mark} paper={paper} />
          ))}
        </div>
      ))}
    </div>
  );
}

function GridRow({ row, w, h, font, ink, slate, paper }) {
  const cards = row.cards ?? [];
  const cardW = Math.round((w - GUTTER * (cards.length - 1 || 1)) / (cards.length || 1));
  const cardStyle = {
    boxSizing: "border-box", height: h, width: cardW, borderRadius: 10,
    border: "1px solid rgba(20,18,28,0.13)", padding: 14,
    display: "flex", flexDirection: "column", gap: 10,
  };
  return (
    <div style={{ width: w, height: h, display: "flex", gap: GUTTER, fontFamily: font }}>
      {cards.map((card, i) => {
        const thumbColours = card.thumb?.colours ?? [ink, slate];
        return (
          <div key={i} style={cardStyle}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{
                flex: 1, height: 26, borderRadius: 13, background: "rgba(20,18,28,0.05)",
                display: "flex", alignItems: "center", gap: 6, padding: "0 10px", minWidth: 0,
              }}>
                <Magnifier size={12} colour={slate} />
                <span style={{
                  fontSize: 11, color: rgb(slate), whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {card.search}
                </span>
              </div>
              {card.button && (
                <div style={{
                  height: 26, borderRadius: 13, padding: "0 14px", flex: "none",
                  background: rgb(card.buttonColour ?? [20, 18, 28]),
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                    color: rgb(card.buttonInk ?? [255, 255, 255]),
                  }}>
                    {card.button}
                  </span>
                </div>
              )}
            </div>
            <div style={{
              position: "relative", flex: 1, borderRadius: 8, overflow: "hidden",
              background: `linear-gradient(135deg, ${rgb(thumbColours[0])} 0%, ${rgb(thumbColours[1] ?? thumbColours[0])} 100%)`,
            }}>
              <div style={{ position: "absolute", right: -6, bottom: -8, opacity: 0.5 }}>
                <Blob size={54} colour={paper} rot={-10} />
              </div>
            </div>
            {card.caption && (
              <div style={{ fontSize: 10.5, color: rgb(slate), fontWeight: 500 }}>{card.caption}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChipsRow({ row, w, h, font, ink, slate }) {
  const items = row.items ?? [];
  return (
    <div style={{
      width: w, height: h, borderRadius: 10, border: "1px solid rgba(20,18,28,0.13)",
      boxSizing: "border-box", padding: "0 20px", display: "flex", alignItems: "center", gap: 10,
      fontFamily: font,
    }}>
      {items.map((it, i) => it.type === "field" ? (
        <div key={i} style={{
          height: 30, minWidth: 160, borderRadius: 15, background: "rgba(20,18,28,0.05)",
          display: "flex", alignItems: "center", padding: "0 14px",
        }}>
          <span style={{ fontSize: 11.5, color: rgb(slate) }}>{it.label}</span>
        </div>
      ) : (
        <div key={i} style={{
          height: 30, borderRadius: 15, padding: "0 18px", background: rgb(it.colour ?? ink),
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: rgb(it.textColour ?? [255, 255, 255]) }}>
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function renderRow(row, w, h, font, ink, slate, paper) {
  switch (row.kind) {
    case "type": return <TypeRow row={row} w={w} h={h} font={font} ink={ink} slate={slate} />;
    case "icons": return <IconsRow row={row} w={w} h={h} font={font} ink={ink} paper={paper} />;
    case "grid": return <GridRow row={row} w={w} h={h} font={font} ink={ink} slate={slate} paper={paper} />;
    case "chips": return <ChipsRow row={row} w={w} h={h} font={font} ink={ink} slate={slate} />;
    default: return null;
  }
}

// ── the sheet ────────────────────────────────────────────────────────────────

export function BrandSheet({ t, from, to, cfg = {} }) {
  if (t < from - 0.001 || t > to + 0.001) return null;

  const font = cfg.font ?? FONT;
  const brand = cfg.brand ?? {};
  const ink = brand.ink ?? [20, 18, 28];
  const paper = brand.paper ?? [255, 255, 255];
  // A fixed neutral for captions/body, independent of the brand palette —
  // swatches and thumbnails carry the brand colour, but a document's own
  // running text should stay legible no matter what palette is plugged in.
  const slate = [124, 121, 133];

  const header = cfg.header ?? null;
  const wordmark = cfg.wordmark ?? null;
  const swatches = cfg.swatches ?? [];
  const rows = cfg.rows ?? [];

  const REV = cfg.reveal;
  // Fraction complete (0..1, eased) and the residual rise for reveal block
  // `index`. `reveal: null` means "draw the finished sheet" — used when this
  // preset is exercised as a static frame rather than inside the film.
  function revealAt(index) {
    if (!REV) return { op: 1, dy: 0 };
    const startAt = from + ((REV.atMs ?? 0) + index * (REV.staggerMs ?? 110)) / 1000;
    const p = at(t, startAt, (REV.durMs ?? 260) / 1000);
    const e = easeOut(p);
    return { op: e, dy: two((1 - e) * 16) };
  }

  // Every top-level section: fixed stage-px rect + its own reveal index, so
  // the sheet assembles top-down without ever reflowing between frames.
  const Block = ({ index, x, y, w, h, children }) => {
    const { op, dy } = revealAt(index);
    if (op <= 0.003) return null;
    return (
      <div style={{
        position: "absolute", left: x, top: y, width: w, height: h,
        opacity: op, transform: `translateY(${dy}px)`,
      }}>
        {children}
      </div>
    );
  };

  // ── vertical layout: header / wordmark / swatches / N specimen rows.
  // The rows band is whatever height is LEFT after the fixed-size blocks
  // above it and the bottom margin, split across `rows` by ROW_WEIGHT — so
  // the sheet always lands flush with a clean bottom margin, for 2 rows or
  // 5, instead of relying on hand-tuned px that only fit one exact count. ──
  const headerY = 28, headerH = 62;
  const wordmarkY = headerY + headerH + 8, wordmarkH = 72;
  const swatchY = wordmarkY + wordmarkH + 14, swatchH = 96;
  const rowsTop = swatchY + swatchH + 18;
  const bottomMargin = 24;
  const rowGap = 14;
  const rowWeights = rows.map((r) => ROW_WEIGHT[r.kind] ?? 0.8);
  const weightSum = rowWeights.reduce((a, b) => a + b, 0) || 1;
  const availableH = Math.max(0, 720 - bottomMargin - rowsTop - rowGap * Math.max(0, rows.length - 1));
  let rowY = rowsTop;

  return (
    <div style={{
      position: "absolute", inset: 0, background: rgb(paper), overflow: "hidden", fontFamily: font,
    }}>
      {/* header — soft orb + serif title, centred as a group via flexbox
          because the title's rendered width isn't known ahead of paint */}
      {header && (
        <Block index={0} x={0} y={headerY} w={1280} h={headerH}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, height: "100%" }}>
            {header.orb && (
              <div style={{
                width: (header.orb.r ?? 22) * 2, height: (header.orb.r ?? 22) * 2, borderRadius: "50%",
                background: `radial-gradient(circle at 36% 32%, ${rgb(header.orb.hi ?? [255, 255, 255])} 0%, ${rgb(header.orb.mid ?? ink)} 55%, ${rgb(header.orb.lo ?? ink)} 100%)`,
                filter: "blur(0.6px)",
                boxShadow: `0 3px 14px ${`rgba(${(header.orb.mid ?? ink).join(",")},0.35)`}`,
              }} />
            )}
            <span style={{
              fontFamily: SERIF, fontWeight: 700, fontSize: header.size ?? 32,
              color: rgb(ink), letterSpacing: "-0.005em", whiteSpace: "nowrap",
            }}>
              {header.title}
            </span>
          </div>
        </Block>
      )}

      {/* wordmark — the extracted identity, large and muted so the eye reads
          it as "found", not as this sheet's own heading */}
      {wordmark && (
        <Block index={1} x={0} y={wordmarkY} w={1280} h={wordmarkH}>
          <div style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: font, fontWeight: wordmark.weight ?? 800,
            fontSize: wordmark.size ?? 54, letterSpacing: `${wordmark.tracking ?? -0.02}em`,
            color: rgb(wordmark.colour ?? [150, 148, 160]), whiteSpace: "nowrap",
          }}>
            {wordmark.text}
          </div>
        </Block>
      )}

      {/* palette row — equal-width chips, edge to edge; near-white chips get
          a visible hairline or they vanish against the paper ground */}
      {swatches.length > 0 && (
        <Block index={2} x={PAD_X} y={swatchY} w={CONTENT_W} h={swatchH}>
          <div style={{ display: "flex", gap: 2, width: "100%" }}>
            {swatches.map((sw, i) => {
              const c = sw.colour ?? parseHex(sw.hex);
              const light = luminance(c) > 0.9;
              return (
                <div key={i} style={{ flex: "1 1 0", minWidth: 0 }}>
                  <div style={{
                    height: 58, borderRadius: 8, background: rgb(c),
                    border: light ? "1px solid rgba(20,18,28,0.20)" : "1px solid rgba(20,18,28,0.06)",
                    boxSizing: "border-box",
                  }} />
                  <div style={{
                    marginTop: 7, fontSize: 11, fontWeight: 600, color: rgb(ink),
                    letterSpacing: "0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {sw.hex}
                  </div>
                  {sw.label && (
                    <div style={{
                      marginTop: 1, fontSize: 9.3, fontWeight: 400, color: rgb(slate),
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {sw.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Block>
      )}

      {/* specimen rows — hairline-separated boxed cells: type, iconography,
          product grid (see the row renderers above); order and count come
          straight from `rows`, so the sheet can carry any subset */}
      {rows.map((row, i) => {
        const h = Math.round((availableH * rowWeights[i]) / weightSum);
        const y = rowY;
        rowY = y + h + rowGap;
        return (
          <Block key={i} index={3 + i} x={PAD_X} y={y - 12} w={CONTENT_W} h={h + 12}>
            <div style={{ height: 1, background: "rgba(20,18,28,0.10)", marginBottom: 11 }} />
            {renderRow(row, CONTENT_W, h, font, ink, slate, paper)}
          </Block>
        );
      })}
    </div>
  );
}
