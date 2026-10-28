/**
 * plum-endcard.jsx — the closing brand plate: a plum ground with the white
 * "Spotlight" wordmark and an orange full stop.
 *
 * Scene 9 shows this plate TWICE at two different sizes: first inside the
 * monitor (the wash dissolves the chat page into it, then the camera dives
 * into the screen), then full-bleed after the screen fills the frame at
 * 79.500 s. `EndcardPlate` is the single drawing both use, so the join at the
 * cut is seamless — everything is expressed as a fraction of the plate's own
 * width/height.
 *
 * ── measured (2026-09-08, full decode of breeze-hubspot.mp4 76.9-82.0 s at
 *    1920x1080; frame f0001 = t 76.900, f%04d k -> t = 76.900 + (k-1)/30) ──
 *  GROUND. Sampled on a 9x8 grid of the settled full-bleed card (k120):
 *    light plateau rgb(108,38,75) over the whole bottom-left (x<=700,y>=720),
 *    dark plateau rgb(50,6,33) at the top-right (x 1500-1740, y 20-120).
 *    Iso-lines are CURVED (a 44 deg linear gradient fits the local slope but
 *    puts (960,1060) and (700,720) in the wrong order), so the ground is an
 *    ellipse radial from below-left of frame: centre (-200,1500), radii
 *    2343 x 2151 px, light out to r=52%, dark at r=100%, with two interior
 *    stops that carry the measured ease (u = 0.25 at 61%, 0.52 at 72%,
 *    0.80 at 85%).  RMS over the 72 samples ~4 rgb units.
 *  WORDMARK. Settled white bbox (k86..k153, byte-identical) x 533-1336,
 *    y 444-643 at threshold 185; core (threshold 250) y 447-640, so cap top
 *    447, baseline ~595, descender bottom 640: cap 148, x-height 108,
 *    descender 45 -> ~0.91 em tall, and the mark including the orange stop
 *    spans x 533-1381, centred on 957 (frame centre 960).
 *  STOP. rgb(227,55,7), a disc ~32 px across at the settled size.
 *  GLOW. Settled there is almost none — 36-60 px above the ascenders the
 *    ground is at its ambient value and 2 px off the ink it is only +8 — so
 *    the halo belongs entirely to the reveal, where it lifts the ground +17
 *    to +31 lum above the letters (77.767) before decaying away.
 *  REVEAL. Left-to-right, measured as per-column alpha = (peak - ground) /
 *    (255 - ground) from work/scenes/9/reveal.mjs, then read off as the
 *    alpha=0.95 (solid) and alpha=0.05 (leading) edges. Solid runs 0.372 of
 *    the plate width at 77.433 -> 0.478 at 77.533 -> 0.567 at 77.667 -> 0.625
 *    at 77.800 -> 0.680 at 77.967, past the stop by 78.133; the ramp ahead of
 *    it NARROWS 0.25 -> 0.05 as the mark lands, and its alpha profile is
 *    convex (0.65 / 0.42 / 0.32 / 0.04 at 45 / 71 / 85 / 98 percent along).
 *  The plate itself never moves: k84..k153 are byte-identical and the film
 *    ENDS on this frame at 82.0 with no fade.
 */

import React from "react";
import { rgb, clamp01 } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";

// measured ground stops: u is the fraction from the light plateau to the dark
const GRAD = [
  [0.520, [108, 38, 75]],
  [0.610, [94, 30, 65]],
  [0.720, [78, 21, 53]],
  [0.850, [62, 12, 41]],
  [1.000, [50, 6, 33]],
];

/**
 * The ground. One ellipse radial from below-left carries the body of it, but
 * no single radial (and no linear gradient either) puts the TOP-LEFT and the
 * BOTTOM-RIGHT corners where the reference has them — both read lighter than
 * any centre-from-one-corner model allows, by up to 22 rgb units at
 * (1900,1060). Two corner lifts toward the light plum fix exactly that; their
 * alphas were solved point by point off the 9x8 grid.
 */
export function endcardGround(a, b) {
  const A = a ?? [108, 38, 75], B = b ?? [50, 6, 33];
  const mix = (u) => rgb([0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * u)));
  const uOf = (c) => (108 - c[0]) / 58;
  const stops = GRAD.map(([p, c]) => `${mix(uOf(c))} ${(p * 100).toFixed(1)}%`);
  const lift = (al) => `rgba(${A[0]},${A[1]},${A[2]},${al})`;
  return [
    `radial-gradient(36.0% 30.0% at 0% 0%, ${lift(0.68)} 0%, ${lift(0)} 100%)`,
    `radial-gradient(34.0% 90.0% at 100% 100%, ${lift(0.45)} 0%, ${lift(0)} 100%)`,
    `radial-gradient(ellipse 122.0% 199.2% at -10.4% 138.9%, ${stops.join(", ")})`,
  ].join(", ");
}

/**
 * The plate. Everything scales with w/h so the in-monitor copy and the
 * full-bleed copy are the same picture at two sizes.
 *   reveal  0..1  left-to-right wipe of the mark (>=1 = fully resolved)
 *   bloom   0..1  extra glow, 1 during the wash, 0 once settled
 */
export function EndcardPlate({
  w, h, wordmark = "Spotlight", dot = [227, 55, 7],
  gradA = [108, 38, 75], gradB = [50, 6, 33],
  solid = 2, soft = 0.24, bloom = 0, dotX = 0.712,
  sizeK = 0.10502, dyK = -0.02792, dxK = 0, track = -0.0235, weight = 600, font = FONT,
}) {
  const size = sizeK * w;
  // `solid` is the x (as a fraction of the plate width) at which the mark is
  // fully opaque; it fades to nothing `soft` further right. solid >= 1 means
  // the mark has fully resolved and the mask comes off entirely.
  // The ramp is NOT linear. Measured alpha across it at 77.467 is 0.65 / 0.42 /
  // 0.32 / 0.04 at 45% / 71% / 85% / 98% of the way, i.e. it holds high and
  // then collapses; a straight two-stop mask sits ~0.1 low through the middle
  // of every reveal frame. A mid stop at 0.55 alpha, 60% along, fits it to
  // within 0.03.
  const masked = solid < 1;
  const mask = masked
    ? `linear-gradient(90deg, #000 ${(solid * 100).toFixed(2)}%,`
      + ` rgba(0,0,0,0.55) ${((solid + 0.60 * soft) * 100).toFixed(2)}%,`
      + ` rgba(0,0,0,0) ${((solid + soft) * 100).toFixed(2)}%)`
    : undefined;
  // The halo is not decoration: during the reveal it is what carries the
  // letters in. In the reference the threshold-185 ink box swells 11% wider
  // and 4% taller at 77.967 than it is once settled at 78.2, and the stop
  // reads WHITE before it resolves to orange — so the bloom grows the radii
  // as well as the alphas, and the stop glows with the letters.
  // Settled, there is essentially NO halo: 36-60 px above the ascenders at
  // 81.0 the ground reads (76,21,52) against an ambient (76,21,52), and 2 px
  // off the ink only +8. What glow there is belongs to the reveal, and it is
  // LOCAL to the front — at 77.767 "Spotlig" is already crisp while the h/t/.
  // are still blooming — so the body carries only a small global lift that
  // decays with `bloom`, and a separate shadow-only layer rides the front.
  const g1 = 0.05 + 0.16 * bloom;          // near halo
  const g2 = 0.02 + 0.09 * bloom;          // wide halo
  const r1 = size * 0.15;
  const r2 = size * 0.42;
  const shadow = `0 0 ${r1.toFixed(1)}px rgba(255,255,255,${g1.toFixed(3)}),`
    + ` 0 0 ${r2.toFixed(1)}px rgba(255,255,255,${g2.toFixed(3)})`;
  const dotShadow = bloom > 0.02 ? shadow : "none";
  const frontShadow = `0 0 ${(size * 0.20).toFixed(1)}px rgba(255,255,255,0.48),`
    + ` 0 0 ${(size * 0.62).toFixed(1)}px rgba(255,255,255,0.24)`;
  const frontMask = masked
    ? `linear-gradient(90deg, rgba(0,0,0,0) ${((solid - 0.14) * 100).toFixed(2)}%,`
      + ` #000 ${((solid - 0.02) * 100).toFixed(2)}%,`
      + ` #000 ${((solid + soft * 0.5) * 100).toFixed(2)}%,`
      + ` rgba(0,0,0,0) ${((solid + soft) * 100).toFixed(2)}%)`
    : undefined;
  const typeStyle = {
    fontFamily: font, fontWeight: weight, fontSize: size,
    letterSpacing: track * size, color: "#fff", whiteSpace: "nowrap",
    transform: `translate(${(dxK * w).toFixed(2)}px, ${(dyK * h).toFixed(2)}px)`,
  };
  const centre = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" };
  // The STOP resolves through WHITE. Its column peaks at luminance 213 at
  // 77.967 and 160 at 77.767, while the settled orange stop is only luminance
  // 88 — so it cannot be the finished stop seen through an opacity wipe. It
  // arrives as a white bloom and warms to orange as the solid edge crosses it
  // (fully orange by 78.133, where the column reads 96 = the settled value).
  const warm = clamp01((solid - (dotX - 0.018)) / 0.05);
  const dotCol = rgb([0, 1, 2].map((i) => Math.round(255 + (dot[i] - 255) * warm)));
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, overflow: "hidden", background: endcardGround(gradA, gradB) }}>
      {masked && bloom > 0.02 ? (
        <div style={{ ...centre, WebkitMaskImage: frontMask, maskImage: frontMask, opacity: bloom }}>
          <div style={{ ...typeStyle, color: "transparent", textShadow: frontShadow }}>
            {wordmark}<span>.</span>
          </div>
        </div>
      ) : null}
      <div style={{ ...centre, WebkitMaskImage: mask, maskImage: mask }}>
        <div style={{ ...typeStyle, textShadow: shadow }}>
          {wordmark}
          <span style={{ color: dotCol, textShadow: warm > 0.98 ? dotShadow : shadow }}>.</span>
        </div>
      </div>
    </div>
  );
}

export function PlumEndcard(cfg, t) {
  const from = cfg.startMs / 1000, to = (cfg.startMs + cfg.durationMs) / 1000;
  if (t < from - 0.001 || t > to + 0.001) return null;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <EndcardPlate
        w={1280} h={720}
        wordmark={cfg.wordmark ?? "Spotlight"}
        dot={cfg.dot ?? [227, 55, 7]}
        gradA={cfg.gradA ?? [108, 38, 75]}
        gradB={cfg.gradB ?? [50, 6, 33]}
        sizeK={cfg.sizeK ?? 0.10502}
        dyK={cfg.dyK ?? -0.02792}
        dxK={cfg.dxK ?? 0}
        track={cfg.track ?? -0.0235}
        weight={cfg.weight ?? 600}
        font={cfg.font ?? FONT}
      />
    </div>
  );
}

export const note = "Full-bleed brand end card: measured plum ellipse-radial ground, glowing white wordmark, orange full stop. Byte-still — the reference holds this frame to the last of the film with no fade.";
export const nativeMs = 2540;
