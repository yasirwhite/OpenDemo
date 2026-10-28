/**
 * saru-northtrail-mark.jsx — the CUSTOMER brand's avatar mark: northtrail.
 *
 * northtrail is the outdoor-apparel shop the film's demo account belongs to, so
 * wherever the film shows northtrail's own avatar (the Instagram post header in
 * S2, the DM thread header in S5) it must be the SAME mark, not a coloured
 * placeholder tile.
 *
 * Spec (director): a white circle carrying a twin-peak glyph in deep green
 * #2F4438, with a hairline ring of the same green so the disc reads on the
 * near-white card chrome it sits on. No indigo — indigo is saru's colour and
 * northtrail is a different brand.
 *
 * Drawn in FRAME space (x,y are the mark's top-left in stage px, `size` its
 * diameter) so it can be laid over a card header at the exact rails that card
 * already uses, without that card's preset having to know about it. Pure
 * function of t; static unless given fade cues.
 */
import React from "react";
import { clamp01 } from "../../../src/lib/textcards/src/easing.js";

const s = (ms) => ms / 1000;

// The glyph, authored in a 100x100 box — geometry COPIED from the same mark as
// drawn on the Instagram post header in S2 (saru-post-card's PeakMark), so the
// brand's avatar is the same shape in both scenes rather than two hand-drawn
// mountains that nearly match. A shorter peak BEHIND on the left, the tall one
// in FRONT on the right, and the front peak carries a white outline so the two
// silhouettes stay separate instead of fusing into one mass at avatar size.
const BACK_PEAK = "35.5,38.5 15.5,71.5 55.5,71.5";
const FRONT_PEAK = "60.5,28.5 36.5,71.5 84.5,71.5";

export const note = "the customer brand's avatar: northtrail's twin-peak mark — a white disc with a hairline deep-green ring carrying a deep-green (#2F4438) twin-peak glyph. Drawn in FRAME space (top-left + diameter) so it can be laid into a card header's existing avatar slot, which is how the DM thread in S5 gets the real brand mark instead of a flat placeholder tile. Static by default; optional fade cues for scenes that bring it on.";

export const nativeMs = 3000;

export function SaruNorthtrailMark({ t, from, to, cfg }) {
  if (t < from || t > to) return null;
  const size = cfg.size ?? 37.3;
  const x = cfg.x ?? 0;
  const y = cfg.y ?? 0;
  const fill = cfg.fill ?? "#ffffff";
  const ink = cfg.ink ?? "#2F4438";
  const ring = cfg.ring ?? "rgba(0,0,0,0.10)";
  const ringW = cfg.ringW ?? 3;        // viewBox units (100-box), so it scales

  let o = cfg.opacity ?? 1;
  if (cfg.inMs != null) o *= clamp01((t - (from + s(cfg.inMs))) / Math.max(1e-6, s(cfg.inFadeMs ?? 220)));
  if (cfg.outMs != null) o *= 1 - clamp01((t - (from + s(cfg.outMs))) / Math.max(1e-6, s(cfg.outFadeMs ?? 260)));
  if (o <= 0.002) return null;

  // Ring LAST and inset by half its width, exactly as S2 draws it: stroking the
  // disc up front would put the hairline under the glyph's base, which at 37px
  // reads as a smudge where the mountains meet the rim.
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size, opacity: o }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
        <circle cx="50" cy="50" r="50" fill={fill} />
        <polygon points={BACK_PEAK} fill={ink} />
        <polygon points={FRONT_PEAK} fill={ink} stroke={fill} strokeWidth="5" strokeLinejoin="round" />
        <circle cx="50" cy="50" r={50 - ringW / 2} fill="none" stroke={ring} strokeWidth={ringW} />
      </svg>
    </div>
  );
}
