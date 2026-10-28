/**
 * saru-mark-tile.jsx — the REAL Saru app tile as a stage element.
 *
 * A light-grey rounded square carrying the brand's monkey mark. This replaces
 * the black "s" tile the first cut used: the shipped product's icon is the
 * line-art monkey on a pale ground, never a letterform, so any scene that has
 * to show "Saru" as a thing on the stage draws THIS.
 *
 * The mark is the artwork from templates/saru/assets/saru-monkey-logo.svg,
 * inlined rather than <img>-loaded so a frame can never screenshot ahead of a
 * pending asset fetch — a renderer that walks the timeline frame by frame has
 * no second chance at a missed load. The source file's viewBox is a wide
 * 1536x1024 with the ink floating inside it; the numbers below are that ink's
 * measured bounds (geometry PLUS stroke half-widths), so the tile insets the
 * DRAWN mark and not the artboard's empty margin.
 *
 * Same sparse-key channel set as saru-icon (x / y / scale / opacity), scaling
 * about the tile CENTRE, so this drops into a flow diagram on the same clock as
 * the emoji nodes around it and a pulse never shifts the node it sits on.
 * Node LABELS are not drawn here — the flow layer owns those. Pure function of t.
 */
import React from "react";
import { clamp01, rgb } from "../../../src/lib/textcards/src/easing.js";
import { kv, absKeys, s } from "./saru-icon.jsx";

/** Measured ink bounds of saru-monkey-logo.svg, stroke included. */
export const MONKEY_INK = { x: 327.85, y: 102.18, w: 879.36, h: 820.52 };
export const MONKEY_ASPECT = MONKEY_INK.w / MONKEY_INK.h; // 1.0717, a shade wide

/** The brand's line-art monkey, drawn at `w` px wide. Height follows the art. */
export function SaruMonkeyMark({ w = 96, colour = [85, 74, 66], opacity = 1 }) {
  const h = w / MONKEY_ASPECT;
  const stroke = rgb(colour);
  return (
    <svg
      width={w} height={h} viewBox={`${MONKEY_INK.x} ${MONKEY_INK.y} ${MONKEY_INK.w} ${MONKEY_INK.h}`}
      preserveAspectRatio="xMidYMid meet" style={{ display: "block", opacity }} aria-hidden="true"
    >
      <g fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M480 344 C548 194 693 117 823 141 C969 167 1078 269 1107 383" strokeWidth={69} />
        <path d="M610 824 C485 816 388 740 366 644 C348 568 378 493 442 459 C506 424 577 447 607 495 C636 542 620 599 578 618 C548 632 521 628 510 621" strokeWidth={66} />
        <path
          d="M1080 530
             C1079 451 1031 381 958 365
             C884 349 808 385 779 451
             C748 522 771 588 830 638
             C897 694 936 759 932 850
             C928 917 978 905 1024 890
             C1112 861 1172 793 1184 715
             C1196 635 1159 568 1080 530 Z"
          strokeWidth={42}
        />
        <path d="M882 523 C911 480 962 476 990 516" strokeWidth={25} />
        <path d="M1088 594 L1104 611" strokeWidth={27} />
        <path d="M963 665 C1009 730 1090 749 1165 719" strokeWidth={25} />
      </g>
    </svg>
  );
}

/**
 * The tile, so other saru scenes can drop the icon into their own layouts (a
 * top-bar mark, an endcard lockup) without going through a scene.
 *
 * `markFrac` is the mark's WIDTH as a fraction of the tile — the inset is
 * whatever is left over. `border` is the hairline's width in px at scale 1 and
 * is scaled with the tile, so a pulsing tile stays self-similar instead of
 * growing a fattening outline. Sized border-box, so the border eats INTO the
 * tile and the node's footprint is exactly `size`.
 */
export function SaruTile({
  size = 150, base = size, bg = [236, 236, 236], radius = 0.235,
  markColour = [85, 74, 66], markFrac = 0.64, border = 2, borderColour = [85, 74, 66],
  borderAlpha = 0.16,
}) {
  const k = base > 0 ? size / base : 1;
  const bw = Math.max(0, border * k);
  const [br, bg2, bb] = borderColour;
  return (
    <div style={{
      width: size, height: size, boxSizing: "border-box",
      borderRadius: size * radius, background: rgb(bg),
      border: bw > 0 ? `${bw.toFixed(2)}px solid rgba(${Math.round(br)}, ${Math.round(bg2)}, ${Math.round(bb)}, ${borderAlpha})` : "none",
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    }}>
      <SaruMonkeyMark w={size * markFrac} colour={markColour} />
    </div>
  );
}

export function SaruMarkTile({ t, from, to, cfg }) {
  if (t < from || t > to) return null;
  const inS = cfg.inMs != null ? from + s(cfg.inMs) : null;
  const outS = cfg.outMs != null ? from + s(cfg.outMs) : null;
  let o = 1;
  if (inS != null) o *= clamp01((t - inS) / s(cfg.inFadeMs ?? 220));
  if (outS != null) o *= 1 - clamp01((t - outS) / s(cfg.outFadeMs ?? 260));
  if (o <= 0.004) return null;

  const st = kv(absKeys(cfg.startMs ?? 0, cfg.keys ?? []), t,
    { x: cfg.x ?? 640, y: cfg.y ?? 360, scale: 1, opacity: 1 });
  const O = o * (st.opacity ?? 1);
  if (O <= 0.004) return null;

  const base = cfg.size ?? 150;
  const size = base * (st.scale ?? 1);
  return (
    <div style={{ position: "absolute", left: st.x - size / 2, top: st.y - size / 2, opacity: O }}>
      <SaruTile
        size={size} base={base} bg={cfg.bg} radius={cfg.radius}
        markColour={cfg.markColour} markFrac={cfg.markFrac}
        border={cfg.border} borderColour={cfg.borderColour} borderAlpha={cfg.borderAlpha}
      />
    </div>
  );
}

export const note =
  "the real Saru app tile as a stage element: a LIGHT-GREY rounded tile carrying the brand's line-art monkey mark (the artwork inlined from templates/saru/assets/saru-monkey-logo.svg, inset by its measured ink bounds rather than its wide artboard). Keyed on the same sparse x/y/scale/opacity channels as saru-icon and scaled about the tile CENTRE, so it pops in, pulses and sits inside a flow diagram on the same clock as the nodes around it.";
export const nativeMs = 3000;
