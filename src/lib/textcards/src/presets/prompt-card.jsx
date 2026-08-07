/**
 * prompt-card.jsx — the Bloom film's generate-loop grammar: a serif question
 * over a white prompt pill (gradient orb icon, placeholder, typed prompt, a
 * "Select Brand" chip with chevron, a dark circular submit arrow), driven by a
 * camera that punches in fast and rests, with a whiteout dropdown close-up in
 * the middle and a defocus exit into a generating state.
 *
 * Measured off three loops of the reference (33.3–53.5s at 10fps):
 *   - home framing: question centred ~y284 (stage px), pill 293..1000 x 94h;
 *   - punch-ins are ≤0.45s and rest between moves; zoom peaks ~4x on the chip;
 *   - the dropdown opens as a WHITEOUT: a white cover fades over the card and
 *     a list floats at the chip's position — chip row, then the brand option
 *     popping into a coloured pill with a check, ghost "New Brand" below; the
 *     list shifts up one row when the option is selected;
 *   - after close the chip label reads the brand; submit pulses when pressed;
 *   - `mode:"generating"` renders the between-states overlay instead: a glassy
 *     magenta orb drifting beside a serif status label that hard-swaps to a
 *     done label.
 *
 * The photographic flower-field ground and floating petals of the reference
 * are NOT rendered here — they are overlay/slot territory.
 *
 * Pure function of t. All times are absolute seconds; the registry offsets
 * scene-relative ms cues before they reach this component.
 * All positions are stage px (1280x720).
 */

import React from "react";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
// Georgia has no lining figures ("HF0" reads "HFo"), so anything that can
// carry digits — brand names, the chip, the typed prompt — leads with a
// serif that does.
const SERIF_UI = "'Times New Roman', Georgia, serif";

// ── camera ──────────────────────────────────────────────────────────────────
// keys: [{at, s, px, py, ease}] — (px,py) is the stage point held at frame
// centre. Fast-out by default so a punch lands hard then rests.
function camAt(t, keys) {
  if (!keys.length) return { s: 1, px: 640, py: 360 };
  if (t <= keys[0].at) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t < b.at) {
      let p = (t - a.at) / Math.max(1e-6, b.at - a.at);
      p = b.ease === "linear" ? p
        : b.ease === "inout" ? 0.5 - 0.5 * Math.cos(Math.PI * p)
        : 1 - Math.pow(1 - p, 3.2);
      return {
        s: a.s + (b.s - a.s) * p,
        px: a.px + (b.px - a.px) * p,
        py: a.py + (b.py - a.py) * p,
      };
    }
  }
  return keys[keys.length - 1];
}

const Chevron = ({ size = 16, colour = "#3a3733" }) => (
  <svg width={size} height={size * 0.6} viewBox="0 0 16 9" style={{ display: "block" }}>
    <path d="M1.5 1.5 L8 7.5 L14.5 1.5" fill="none" stroke={colour}
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Check = ({ size = 30, colour = "#1c1a1e" }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" style={{ display: "block" }}>
    <path d="M5 19 L14 28 L29 7" fill="none" stroke={colour}
      strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowUp = ({ size = 26, colour = "#f4f2f5" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M12 20 L12 5 M5.5 11 L12 4.5 L18.5 11" fill="none" stroke={colour}
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Orb = ({ x, y, r, glow = false }) => (
  <div style={{
    position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2,
    borderRadius: "50%",
    background: "radial-gradient(circle at 38% 32%, #ea9ade 0%, #cb46be 42%, #99189f 72%, #75108a 100%)",
    boxShadow: glow ? "0 4px 22px rgba(190,40,180,0.30)" : "0 1px 6px rgba(120,20,120,0.18)",
    filter: "saturate(0.92)",
  }} />
);

// ── the card ────────────────────────────────────────────────────────────────

export function PromptCard({
  t, from, to,
  mode = "card",
  // card mode
  cam = [],
  blurInDur = 0.5,
  exitAt = null, exitDur = 0.3, exitBlur = 14,
  question = null,      // {words:[{text, at, fromScale, fromDy}], size, y}
  placeholder = "Generate anything...",
  typed = null,         // {text, typeAt, cps}
  brand = "",
  dropdown = null,      // {openAt, selectAt, closeAt, option, colour, textColour}
  pressAt = null,
  ink = [28, 24, 32],
  // Pill height in stage px. The pill is a STADIUM — its corner radius is
  // always half its height — and it stays centred on the y=393 control line
  // that the orb, prompt text, chip and submit arrow all sit on, so changing
  // this moves only the pill's own top/bottom edge and its rounding. The
  // default 94 reproduces the original hard-coded box byte for byte; the
  // reference measures 99-100 across all three generate loops (r 50).
  pillH = 94,
  // generating mode
  orb = null,           // {x, y, r}
  label = "Generating", doneLabel = "Done!", doneAt = null,
  inDur = 0.2, outDur = 0.25,
}) {
  if (t < from - 0.001 || t > to + 0.001) return null;

  // ── generating overlay ──
  if (mode === "generating") {
    const o = clamp01((t - from) / inDur) * (1 - clamp01((t - (to - outDur)) / outDur));
    if (o <= 0.004) return null;
    const ox = (orb?.x ?? 720) + 7 * Math.sin((t - from) * 1.7);
    const oy = (orb?.y ?? 476) + 9 * Math.sin((t - from) * 2.2 + 1.1);
    const r = orb?.r ?? 37;
    const text = doneAt != null && t >= doneAt ? doneLabel : label;
    return (
      <div style={{ position: "absolute", inset: 0, opacity: o }}>
        <Orb x={ox} y={oy} r={r} glow />
        <span style={{
          position: "absolute", left: ox + r + 26, top: oy, transform: "translateY(-54%)",
          fontFamily: SERIF, fontSize: 36, fontWeight: 500, color: rgb(ink),
          letterSpacing: "-0.01em", whiteSpace: "nowrap",
        }}>
          {text}
        </span>
      </div>
    );
  }

  // ── card mode ──
  const { s, px, py } = camAt(t, cam);
  const tx = 640 - s * px, ty = 360 - s * py;

  const inE = clamp01((t - from) / blurInDur);
  let blur = 14 * Math.pow(1 - inE, 1.5);
  let alpha = 0.12 + 0.88 * inE;
  if (exitAt != null) {
    const e = clamp01((t - exitAt) / exitDur);
    blur = Math.max(blur, exitBlur * e);
    alpha *= 1 - Math.pow(e, 1.4);
  }
  if (alpha <= 0.004) return null;

  // typed prompt
  const typedN = typed && t >= typed.typeAt
    ? Math.min([...typed.text].length, Math.floor((t - typed.typeAt) * typed.cps) + 1)
    : 0;
  const typedStr = typed ? [...typed.text].slice(0, typedN).join("") : "";
  const phO = typed ? 1 - clamp01((t - typed.typeAt) / 0.2) : 1;

  // dropdown state
  const dd = dropdown ?? {};
  const covIn = dd.openAt != null ? clamp01((t - dd.openAt) / 0.22) : 0;
  const covOut = dd.closeAt != null ? clamp01((t - dd.closeAt) / 0.3) : 0;
  const cov = covIn * (1 - covOut);
  const selE = dd.selectAt != null ? clamp01((t - dd.selectAt) / 0.28) : 0;
  const selPop = 1 - Math.pow(1 - selE, 3);
  const listShift = -108 * selPop;
  const chipLabel = dd.closeAt != null && t >= dd.closeAt ? brand : "Select Brand";

  // submit pulse
  const pp = pressAt != null ? clamp01((t - pressAt) / 0.22) : 0;
  const pulse = 1 - 0.12 * Math.sin(Math.PI * pp);

  const qSize = question?.size ?? 42;
  const qY = question?.y ?? 284;

  return (
    <div style={{
      position: "absolute", inset: 0, opacity: alpha,
      filter: blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : "none",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`,
        transformOrigin: "0 0",
      }}>

        {/* question — words scatter in and settle onto one centred row */}
        {question && (
          <div style={{
            position: "absolute", left: 0, right: 0, top: qY - qSize * 0.72,
            display: "flex", justifyContent: "center", alignItems: "baseline",
          }}>
            {question.words.map((w, i) => {
              const p = clamp01((t - w.at) / 0.45);
              const e = 1 - Math.pow(1 - p, 3);
              const sc = (w.fromScale ?? 1.15) + (1 - (w.fromScale ?? 1.15)) * e;
              const dy = (w.fromDy ?? 26) * (1 - e);
              return (
                <span key={i} style={{
                  fontFamily: SERIF, fontSize: qSize, fontWeight: 500,
                  color: rgb(ink), letterSpacing: "-0.01em", whiteSpace: "pre",
                  display: "inline-block",
                  opacity: clamp01(p * 1.8),
                  transform: `translateY(${(-dy).toFixed(1)}px) scale(${sc.toFixed(3)})`,
                  transformOrigin: "50% 100%",
                }}>
                  {w.text + (i < question.words.length - 1 ? " " : "")}
                </span>
              );
            })}
          </div>
        )}

        {/* pill */}
        <div style={{
          position: "absolute", left: 293, top: 393 - pillH / 2, width: 707, height: pillH,
          borderRadius: pillH / 2,
          background: "linear-gradient(100deg, #f1f7f1 0%, #ffffff 34%, #fdfcfe 100%)",
          boxShadow: "0 16px 38px rgba(120,100,160,0.20), 0 2px 6px rgba(120,100,160,0.10)",
        }} />
        <Orb x={336} y={393} r={25} />
        {/* placeholder / typed prompt */}
        {phO > 0.004 && typedN === 0 && (
          <span style={{
            position: "absolute", left: 374, top: 393, transform: "translateY(-54%)",
            fontFamily: SERIF, fontSize: 30, fontWeight: 430, fontStyle: "normal",
            color: "#a49e9a", letterSpacing: "0", whiteSpace: "nowrap", opacity: phO,
          }}>
            {placeholder}
          </span>
        )}
        {typedN > 0 && (
          <span style={{
            position: "absolute", left: 374, top: 393, transform: "translateY(-54%)",
            fontFamily: SERIF_UI, fontSize: 31, fontWeight: 460,
            color: rgb(ink), letterSpacing: "-0.01em", whiteSpace: "nowrap",
          }}>
            {typedStr}
          </span>
        )}
        {/* Select Brand chip */}
        <div style={{
          position: "absolute", left: 760, top: 363, width: 153, height: 60,
          borderRadius: 14, background: "#efeeec",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
        }}>
          <span style={{
            fontFamily: SERIF_UI, fontSize: 23, fontWeight: 500, color: "#3a3733",
            letterSpacing: "-0.01em", whiteSpace: "nowrap",
          }}>
            {chipLabel}
          </span>
          <Chevron size={15} />
        </div>
        {/* submit */}
        <div style={{
          position: "absolute", left: 952 - 27, top: 393 - 27, width: 54, height: 54,
          borderRadius: "50%", background: "#47433f",
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${pulse.toFixed(3)})`,
        }}>
          <ArrowUp size={28} />
        </div>

        {/* dropdown whiteout + floating list, in card coords at the chip */}
        {cov > 0.004 && (
          <>
            <div style={{
              position: "absolute", inset: -2400,
              background: "#fdfdfe", opacity: cov,
            }} />
            <div style={{
              position: "absolute", left: 836, top: 393,
              opacity: cov,
              transform: `translateY(${listShift.toFixed(1)}px)`,
            }}>
              {/* row 0: the chip — slab before select, ghost text after.
                  The crossfade is SNAPPY (both variants full-strength for at
                  most ~3 frames) or the two sizes double-print. */}
              <div style={{ position: "absolute", left: 0, top: 0, transform: "translate(-50%,-50%)" }}>
                <div style={{
                  width: 200, height: 62, borderRadius: 15, background: "#efeeec",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                  opacity: 1 - clamp01(selPop * 2.5),
                  boxShadow: "0 8px 22px rgba(90,80,110,0.12)",
                }}>
                  <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: "#3a3733" }}>
                    Select Brand
                  </span>
                  <Chevron size={15} />
                </div>
                <span style={{
                  position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
                  fontFamily: SERIF, fontSize: 32, fontWeight: 500, color: "#c9c4cd",
                  whiteSpace: "nowrap", opacity: clamp01((selPop - 0.55) * 2.5),
                  textShadow: "0 1px 0 #fff",
                }}>
                  Select Brand
                </span>
              </div>
              {/* row 1: the option — plain grey, pops into a coloured pill
                  sized to its content so any brand name works untuned */}
              <div style={{ position: "absolute", left: 0, top: 108, transform: "translate(-50%,-50%)" }}>
                <span style={{
                  position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
                  fontFamily: SERIF_UI, fontSize: 34, fontWeight: 500, color: "#bcb7c0",
                  whiteSpace: "nowrap", opacity: 1 - clamp01(selPop * 2.5),
                }}>
                  {dd.option}
                </span>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 52,
                  height: 84, borderRadius: 21, padding: "0 34px",
                  minWidth: 220, boxSizing: "border-box",
                  justifyContent: "space-between",
                  background: rgb(dd.colour ?? [243, 120, 226]),
                  opacity: clamp01(selPop * 1.6),
                  transform: `translate(-50%,-50%) scale(${(1.12 - 0.12 * selPop).toFixed(3)})`,
                  position: "absolute", left: "50%", top: "50%",
                  boxShadow: "0 10px 30px rgba(120,60,130,0.18)",
                }}>
                  <span style={{
                    fontFamily: SERIF_UI, fontSize: 34, fontWeight: 550,
                    color: rgb(dd.textColour ?? [26, 22, 28]), whiteSpace: "nowrap",
                  }}>
                    {dd.option}
                  </span>
                  <Check size={30} />
                </div>
              </div>
              {/* row 2: New Brand ghost, appears with the selection */}
              <span style={{
                position: "absolute", left: 0, top: 216, transform: "translate(-50%,-50%)",
                fontFamily: SERIF, fontSize: 34, fontWeight: 500, color: "#cdc8d1",
                whiteSpace: "nowrap", opacity: clamp01((selPop - 0.4) * 1.8),
                textShadow: "0 1px 0 #fff",
              }}>
                New Brand
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
