/**
 * site-page.jsx — a stylised marketing WEBSITE, drawn as artwork.
 *
 * WHY THIS EXISTS
 * The launch film needs to show "here is the site we are reading" before any
 * screen recording of a real product exists. Standing in a screenshot means a
 * binary asset tied to one brand at one crop; drawing it means one preset can
 * render any invented brand's marketing page, at any scroll position, as a
 * pure function of t.
 *
 * STRUCTURE, not brand — modelled on the reference's shape (a maker-marketplace
 * homepage: inspector rail, nav, hero with a headline + search/CTA, a feature
 * row, a loop/flywheel diagram, a centred claim, a product grid, decorative
 * brand stickers, and pale-blue "selection" boxes sweeping over the hero to
 * sell "this page is being READ, not browsed"). None of the copy, colours or
 * marks below reference any real company; the brand is `Lantern`, invented for
 * this template, and every word is config-driven so a different scene can swap
 * it wholesale.
 *
 * LAYOUT MODEL
 * The page is drawn as one tall document (nav + hero + `sections`, stacked
 * top to bottom, each section's height fixed per `kind` unless overridden by
 * `h`) and the visible 1280x720 frame is a window onto it: the sidebar rail is
 * fixed, the rest translates by -scroll.y(t). `scroll` is a keyed channel
 * (same shape as the camera/front channels elsewhere in this preset family —
 * see prompt-card's camAt / poster-reveal's frontAt) so the film can retime
 * the read without touching this file.
 *
 * SELECTION HIGHLIGHT
 * The hero headline is split into words; each word is wrapped in its own
 * relatively-positioned span carrying an absolutely-positioned highlight box
 * sized to `inset:0` of that span. That sizes the box off the word's own
 * rendered width with no text-measurement code — the same trick prompt-card
 * uses for its scattering question words. Boxes sweep in staggered, ease in,
 * and then hold (no fade-out): the page scrolling the hero out of frame is
 * what "clears" the selection, exactly as it would for a real extractor.
 *
 * Pure function of t. All positions are stage px in a 1280x720 design space.
 * Sub-object cues (`scroll[].atMs`, `highlight.atMs`, ...) are SCENE-RELATIVE
 * ms, converted once at the top via tMs = (t - from) * 1000.
 */

import React from "react";
import { clamp01, lerp, rgb, mixRgb, easeByName, easeOut, easeInOut } from "../easing.js";
import { FONT } from "../theme.js";

// ── fixed, non-brand chrome ─────────────────────────────────────────────────
// Not part of the params surface: neutral UI ink/hairline the reference uses
// regardless of brand, plus two extra decorative tints (feature-card art,
// stickers) so the page doesn't read as a two-colour poster.
const MUTED = [107, 104, 117]; // #6B6875
const HAIRLINE = [232, 228, 220]; // #E8E4DC
const MINT = [47, 207, 166];
const LILAC = [183, 156, 255];

const NAV_LINKS = ["Discover", "Guides", "Pricing", "Features", "About"];

// ── small drawn icons ───────────────────────────────────────────────────────

const Magnifier = ({ size = 15, colour }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: "block", flex: "none" }}>
    <circle cx="8.5" cy="8.5" r="6.2" fill="none" stroke={colour} strokeWidth="1.8" />
    <line x1="13.1" y1="13.1" x2="18" y2="18" stroke={colour} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const Chevron = ({ size = 12, colour, dir = "right" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block", flex: "none" }}
    transform={dir === "left" ? "rotate(180)" : undefined}>
    <path d="M5 2.5 L11 8 L5 13.5" fill="none" stroke={colour} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// The wordmark glyph and the loop's centre emblem share one shape — a lantern
// body with a flame — so the brand mark repeats without a second asset.
const LanternGlyph = ({ size = 22, flame, body }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "none" }}>
    <path d="M12 2.5c2.2 2.6 3.4 4.6 3.4 6.4a3.4 3.4 0 1 1-6.8 0c0-1.8 1.2-3.8 3.4-6.4Z" fill={rgb(flame)} />
    <rect x="7" y="10.5" width="10" height="9" rx="2.4" fill={rgb(body)} />
    <rect x="10.4" y="19.5" width="3.2" height="2.2" rx="1" fill={rgb(body)} />
  </svg>
);

// ── scroll channel ──────────────────────────────────────────────────────────
// Piecewise between {atMs, y, ease, pow} keys, same shape as camAt/frontAt in
// the sibling presets. Empty/omitted keys hold the page at the top (y=0) —
// the documented default — so a harness that hasn't authored a scroll yet
// still renders a coherent, if static, page.
function scrollAt(keys, tMs) {
  if (!keys || !keys.length) return 0;
  if (tMs <= keys[0].atMs) return keys[0].y;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (tMs < b.atMs) {
      const p = clamp01((tMs - a.atMs) / Math.max(1e-6, b.atMs - a.atMs));
      const ease = easeByName(b.ease, b.pow, easeInOut);
      return lerp(a.y, b.y, ease(p));
    }
  }
  return keys[keys.length - 1].y;
}

// Fraction (0..1, holds at 1) a word-highlight box has swept in. `durMs` is
// the length of ONE word's own attack; `staggerMs` offsets each successive
// word's start, which is what reads as a left-to-right sweep rather than a
// simultaneous flash.
function highlightOpacity(tMs, cfg, index) {
  if (!cfg || cfg.atMs == null) return 0;
  const start = cfg.atMs + index * (cfg.staggerMs ?? 70);
  const dur = Math.max(1, cfg.durMs ?? 260);
  return easeOut(clamp01((tMs - start) / dur));
}

// ── section layout ──────────────────────────────────────────────────────────
// Fixed default heights per `kind`; a section's own `h` overrides. Keeping
// this a flat lookup (rather than measuring content) is what lets `scroll`
// be authored against known pixel bounds.
const DEFAULT_H = { cards: 400, loop: 420, claim: 260, grid: 420, strip: 200 };
const NAV_H = 68;

function layout(hero, sections) {
  let cursor = NAV_H + (hero ? 560 : 0);
  const heroTop = NAV_H;
  const laid = (sections ?? []).map((sec) => {
    const h = sec.h ?? DEFAULT_H[sec.kind] ?? 320;
    const top = cursor;
    cursor += h;
    return { ...sec, top, h };
  });
  const docH = cursor + 160; // bottom pad so the closing drift has somewhere to go
  return { heroTop, heroH: hero ? 560 : 0, sections: laid, docH };
}

// ── nav ──────────────────────────────────────────────────────────────────────

function Nav({ pageW, name, ctaLabel, ink, paper, hairline, accent }) {
  return (
    <div style={{
      position: "absolute", left: 0, top: 0, width: pageW, height: NAV_H,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px", boxSizing: "border-box",
      borderBottom: `1px solid ${rgb(hairline)}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LanternGlyph size={20} flame={accent} body={ink} />
          <span style={{
            fontSize: 19, fontWeight: 700, color: rgb(ink), letterSpacing: "-0.02em",
          }}>{name}</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: mix(paper, ink, 0.05), borderRadius: 999,
          padding: "3px 10px 3px 8px",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: rgb(accent) }} />
          <span style={{ fontSize: 10.5, fontWeight: 600, color: rgb(MUTED) }}>New</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        {NAV_LINKS.map((l) => (
          <span key={l} style={{ fontSize: 12.5, fontWeight: 500, color: mix(ink, paper, 0.28) }}>{l}</span>
        ))}
        <span style={{ fontSize: 12.5, fontWeight: 500, color: mix(ink, paper, 0.28) }}>Log in</span>
        <div style={{
          background: rgb(ink), color: rgb(paper), borderRadius: 999,
          padding: "8px 16px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap",
        }}>{ctaLabel}</div>
      </div>
    </div>
  );
}

const mix = (a, b, p) => rgb(mixRgb(a, b, p));

// ── hero ─────────────────────────────────────────────────────────────────────

function Hero({ pageW, top, height, hero, ink, paper, accent, hairline, highlight, tMs }) {
  const lines = hero.lines?.length ? hero.lines : ["From first idea to first sale."];
  let wordIndex = -1;

  return (
    <div style={{
      position: "absolute", left: 0, top, width: pageW, height,
      display: "flex", flexDirection: "column", alignItems: "center",
      textAlign: "center", paddingTop: 58, boxSizing: "border-box",
    }}>
      {hero.eyebrow && (
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          color: rgb(accent), marginBottom: 14,
        }}>{hero.eyebrow}</span>
      )}

      {/* headline — one flex row per line, each word individually spanned so
          its highlight box can size itself off the word's own rendered box */}
      <div style={{ maxWidth: 720 }}>
        {lines.map((line, li) => (
          <div key={li} style={{
            display: "flex", justifyContent: "center", flexWrap: "wrap",
            fontSize: 46, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.12,
            color: rgb(ink),
          }}>
            {line.split(" ").map((w, wi) => {
              wordIndex += 1;
              const hl = highlightOpacity(tMs, highlight, wordIndex) * (highlight?.alpha ?? 0.55);
              const hlColour = highlight?.colour ?? [151, 194, 255];
              return (
                <span key={wi} style={{ position: "relative", padding: "0 3px", whiteSpace: "pre" }}>
                  {hl > 0.004 && (
                    <span style={{
                      position: "absolute", inset: "2px 0px", borderRadius: 3,
                      background: rgb(hlColour), opacity: hl,
                    }} />
                  )}
                  <span style={{ position: "relative" }}>{w}</span>
                  {wi < line.split(" ").length - 1 ? " " : ""}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {hero.body && (
        <p style={{
          maxWidth: 460, marginTop: 18, marginBottom: 0,
          fontSize: 14, lineHeight: 1.55, color: rgb(MUTED), fontWeight: 400,
        }}>{hero.body}</p>
      )}

      {(hero.cta || hero.search) && (
        <div style={{ display: "flex", alignItems: "stretch", gap: 10, marginTop: 26 }}>
          {hero.cta && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              background: rgb(ink), color: rgb(paper), borderRadius: 9,
              padding: "0 22px", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap",
            }}>{hero.cta.label ?? "Start selling"}</div>
          )}
          {hero.search && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              border: `1px solid ${rgb(hairline)}`, borderRadius: 9,
              padding: "0 14px", minWidth: 230,
              background: rgb([255, 255, 255]),
            }}>
              <span style={{ fontSize: 13, color: mix(ink, paper, 0.42), flex: 1, textAlign: "left" }}>
                {hero.search.placeholder ?? "Search the market…"}
              </span>
              <Magnifier size={14} colour={mix(ink, paper, 0.42)} />
            </div>
          )}
        </div>
      )}

      {hero.note && (
        <span style={{ marginTop: 16, fontSize: 10.5, color: mix(ink, paper, 0.55) }}>{hero.note}</span>
      )}
    </div>
  );
}

// ── sections ─────────────────────────────────────────────────────────────────

function CardArt({ accent, accent2 }) {
  // A stand-in "product screenshot": a rounded panel with a coloured media
  // block and two text bars, reading as UI without being any real UI.
  return (
    <div style={{
      width: "100%", height: 132, borderRadius: 10, background: mix(accent, [255, 255, 255], 0.72),
      padding: 14, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ width: "58%", height: 10, borderRadius: 3, background: rgb(mixRgb(accent, [20, 16, 25], 0.15)) }} />
      <div style={{
        flex: 1, borderRadius: 8, background: rgb(accent2),
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 0, height: 0, marginLeft: 3,
            borderTop: "7px solid transparent", borderBottom: "7px solid transparent",
            borderLeft: `10px solid ${rgb(accent2)}`,
          }} />
        </div>
      </div>
    </div>
  );
}

function CardsSection({ pageW, top, h, sec, P }) {
  const items = sec.items?.length ? sec.items : [
    { heading: "Sell anything", art: true },
    { heading: "Make your own way", body: "Whether you need more balance, flexibility, or just a different gig, we make it easy to chart a new path." },
  ];
  return (
    <div style={{
      position: "absolute", left: 0, top, width: pageW, height: h,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 20,
      padding: "0 60px", boxSizing: "border-box",
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          flex: 1, maxWidth: 300, minHeight: 300,
          border: `1px solid ${rgb(P.hairline)}`, borderRadius: 14,
          padding: 20, boxSizing: "border-box",
          display: "flex", flexDirection: "column", gap: 12,
          background: rgb([255, 255, 255]),
        }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: rgb(P.ink) }}>{it.heading}</span>
          {it.body && (
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: rgb(MUTED) }}>{it.body}</p>
          )}
          {it.art && <CardArt accent={i % 2 ? P.accent2 : P.accent} accent2={i % 2 ? MINT : LILAC} />}
        </div>
      ))}
    </div>
  );
}

// The loop's four compass labels, matching the reference's racetrack-with-
// arrows flywheel: top row reads left-to-right, bottom row right-to-left, so
// following the chevrons traces one continuous cycle.
function LoopSection({ pageW, top, h, sec, P }) {
  const labels = sec.labels?.length ? sec.labels : [
    "The Lantern Loop", "Start small", "Learn quickly", "Get better together",
  ];
  const [tl, tr, br, bl] = labels;
  const trackW = 640, trackH = 190;
  const accent = sec.accent ?? P.accent;
  const Label = ({ text }) => (
    <span style={{
      fontSize: 12.5, fontWeight: 700, color: rgb(mixRgb(P.ink, accent, 0.0)),
      background: rgb([255, 255, 255]), padding: "5px 10px", borderRadius: 7,
      whiteSpace: "nowrap",
    }}>{text}</span>
  );
  return (
    <div style={{
      position: "absolute", left: 0, top, width: pageW, height: h,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        position: "relative", width: trackW, height: trackH,
        borderRadius: trackH / 2, background: rgb(mixRgb(accent, [255, 255, 255], 0.14)),
      }}>
        {/* emblem, centred on the track */}
        <div style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          width: 56, height: 56, borderRadius: "50%", background: rgb([255, 255, 255]),
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 18px rgba(20,16,25,0.12)",
        }}>
          <LanternGlyph size={26} flame={P.accent} body={P.ink} />
        </div>

        {/* top row */}
        <div style={{ position: "absolute", left: 34, top: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <Label text={tl} /><Chevron colour={rgb(P.ink)} />
        </div>
        <div style={{ position: "absolute", right: 34, top: 18 }}>
          <Label text={tr} />
        </div>
        {/* bottom row */}
        <div style={{ position: "absolute", right: 34, bottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <Chevron colour={rgb(P.ink)} dir="left" /><Label text={br} />
        </div>
        <div style={{ position: "absolute", left: 34, bottom: 18 }}>
          <Label text={bl} />
        </div>
      </div>
    </div>
  );
}

function ClaimSection({ pageW, top, h, sec, P }) {
  const lines = sec.lines?.length ? sec.lines
    : ["We want you to try things, lots of things,", "and find out what works."];
  return (
    <div style={{
      position: "absolute", left: 0, top, width: pageW, height: h,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center", gap: 22, padding: "0 60px", boxSizing: "border-box",
    }}>
      <div>
        {lines.map((l, i) => (
          <div key={i} style={{
            fontSize: 24, fontWeight: 700, lineHeight: 1.4, letterSpacing: "-0.01em",
            color: rgb(P.ink),
          }}>{l}</div>
        ))}
      </div>
      {sec.cta && (
        <div style={{
          background: rgb(P.ink), color: rgb(P.paper), borderRadius: 9,
          padding: "10px 22px", fontSize: 13, fontWeight: 600,
        }}>{sec.cta.label ?? "Find out how"}</div>
      )}
    </div>
  );
}

function GridSection({ pageW, top, h, sec, P }) {
  const tints = [P.accent, P.accent2, MINT, LILAC];
  const items = sec.items?.length ? sec.items : Array.from({ length: 8 }, (_, i) => ({
    label: `Listing ${i + 1}`,
  }));
  return (
    <div style={{
      position: "absolute", left: 0, top, width: pageW, height: h,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 60px", boxSizing: "border-box",
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16,
        width: "100%", maxWidth: 880,
      }}>
        {items.slice(0, 8).map((it, i) => (
          <div key={i} style={{
            border: `1px solid ${rgb(P.hairline)}`, borderRadius: 10, overflow: "hidden",
            background: rgb([255, 255, 255]),
          }}>
            <div style={{ height: 64, background: rgb(mixRgb(tints[i % tints.length], [255, 255, 255], 0.5)) }} />
            <div style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: rgb(P.ink) }}>{it.label ?? "Listing"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StripSection({ pageW, top, h, sec, P }) {
  const tiles = sec.tiles?.length ? sec.tiles : [P.accent, P.accent2, MINT, LILAC, P.accent, MINT];
  return (
    <div style={{
      position: "absolute", left: 0, top, width: pageW, height: h,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 31, fontWeight: 700, color: rgb(P.ink), letterSpacing: "-0.01em" }}>{sec.stat ?? "$2,140,880"}</span>
        <span style={{ fontSize: 13, color: rgb(MUTED) }}>{sec.label ?? "paid out to makers"}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {tiles.slice(0, 8).map((c, i) => (
          <div key={i} style={{
            width: 26, height: 26, borderRadius: "50%",
            background: rgb(Array.isArray(c) ? mixRgb(c, [255, 255, 255], 0.25) : c),
            border: "2px solid #fff", boxShadow: "0 1px 3px rgba(20,16,25,0.15)", marginLeft: i ? -10 : 0,
          }} />
        ))}
      </div>
    </div>
  );
}

const SECTION_RENDERERS = {
  cards: CardsSection, loop: LoopSection, claim: ClaimSection, grid: GridSection, strip: StripSection,
};

// ── stickers ─────────────────────────────────────────────────────────────────
// Positioned in PAGE-document space (not frame space) so a sticker parked
// near a lower section scrolls with it, the way the reference's badges track
// specific content rather than sitting fixed over the viewport.

function Sticker({ s, P }) {
  const r = s.r ?? 34;
  const rot = s.rot ?? 0;
  if (s.kind === "blob") {
    return (
      <div style={{
        position: "absolute", left: s.x - r, top: s.y - r, width: r * 2, height: r * 2,
        borderRadius: "68% 32% 71% 29% / 38% 58% 42% 62%",
        background: rgb(mixRgb(s.colour ?? P.accent2, [255, 255, 255], 0.2)),
        opacity: 0.85, transform: `rotate(${rot}deg)`,
      }} />
    );
  }
  // "coin" — a tilted embossed disc carrying the brand initial.
  const initial = (P.name || "L").slice(0, 1).toUpperCase();
  return (
    <div style={{
      position: "absolute", left: s.x - r, top: s.y - r, width: r * 2, height: r * 2,
      borderRadius: "50%", transform: `rotate(${rot}deg)`,
      background: `radial-gradient(circle at 35% 30%, ${rgb(mixRgb(s.colour ?? P.accent, [255, 255, 255], 0.25))} 0%, ${rgb(s.colour ?? P.accent)} 55%, ${rgb(mixRgb(s.colour ?? P.accent, [20, 16, 25], 0.25))} 100%)`,
      boxShadow: "0 8px 20px rgba(20,16,25,0.18)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{
        fontSize: r * 0.85, fontWeight: 700, color: rgb(P.ink), transform: `rotate(${-rot}deg)`,
      }}>{initial}</span>
    </div>
  );
}

// ── sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ w, sidebar, brandDomain, tSec }) {
  const orb = sidebar.orb ?? {};
  const breathe = 1 + 0.05 * Math.sin(tSec * 1.6);
  return (
    <div style={{
      position: "absolute", left: 0, top: 0, width: w, height: 720,
      background: "#ffffff", borderRight: `1px solid ${rgb(HAIRLINE)}`,
    }}>
      <div style={{
        position: "absolute", left: 32, top: 79, right: 32,
        background: rgb([242, 240, 236]), borderRadius: 9,
        padding: "9px 14px", fontSize: 12.5, color: rgb([70, 66, 76]), fontWeight: 500,
      }}>{sidebar.domain ?? brandDomain}</div>

      <div style={{ position: "absolute", left: 32, top: 296, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%", transform: `scale(${breathe.toFixed(3)})`,
          background: `radial-gradient(circle at 35% 30%, ${rgb(mixRgb(orb.colour ?? [255, 107, 90], [255, 255, 255], 0.35))} 0%, ${rgb(orb.colour ?? [255, 107, 90])} 70%)`,
        }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: rgb([46, 42, 56]) }}>
          {sidebar.status ?? "Building Brand Kit"}
        </span>
      </div>
    </div>
  );
}

// ── the component ────────────────────────────────────────────────────────────

export function SitePage({ t, from, to, cfg = {} }) {
  if (t < from - 0.001 || t > to + 0.001) return null;
  const tMs = (t - from) * 1000;
  const tSec = t - from;

  const brand = cfg.brand ?? {};
  const P = {
    name: brand.name ?? "Lantern",
    domain: brand.domain ?? "lantern.com",
    accent: brand.accent ?? [255, 197, 61],
    accent2: brand.accent2 ?? [255, 107, 90],
    ink: brand.ink ?? [20, 16, 25],
    paper: brand.paper ?? [255, 253, 247],
    hairline: HAIRLINE,
  };
  const font = cfg.font ?? FONT;

  const railW = cfg.sidebar ? (cfg.sidebar.w ?? 307) : 0;
  const pageW = 1280 - railW;

  const { heroTop, heroH, sections, docH } = layout(cfg.hero, cfg.sections);
  const maxScroll = Math.max(0, docH - 720);
  const y = Math.min(scrollAt(cfg.scroll, tMs), maxScroll);

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      background: rgb(P.paper), fontFamily: font,
    }}>
      {cfg.sidebar && <Sidebar w={railW} sidebar={cfg.sidebar} brandDomain={P.domain} tSec={tSec} />}

      <div style={{ position: "absolute", left: railW, top: 0, width: pageW, height: 720, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: -y, width: pageW, height: docH }}>
          <Nav pageW={pageW} name={P.name} ink={P.ink} paper={P.paper} hairline={P.hairline}
            accent={P.accent} ctaLabel={cfg.hero?.cta?.label ?? "Start selling"} />

          {cfg.hero && (
            <Hero pageW={pageW} top={heroTop} height={heroH} hero={cfg.hero}
              ink={P.ink} paper={P.paper} accent={P.accent} hairline={P.hairline}
              highlight={cfg.highlight} tMs={tMs} />
          )}

          {sections.map((sec, i) => {
            const Renderer = SECTION_RENDERERS[sec.kind];
            if (!Renderer) return null;
            return <Renderer key={i} pageW={pageW} top={sec.top} h={sec.h} sec={sec} P={P} />;
          })}

          {(cfg.stickers ?? []).map((s, i) => <Sticker key={i} s={s} P={P} />)}
        </div>
      </div>
    </div>
  );
}
