/**
 * saru-endcard.jsx — the film's closing brand plate (saru scene 8).
 *
 * A RECAST of plum-endcard, not a reimplementation: the drawing is plum's own
 * `EndcardPlate`, imported unchanged. What that file measured off a real film —
 * the left-to-right reveal whose soft front NARROWS as the mark lands, the
 * non-linear mask ramp (a mid stop at 0.55 alpha 60% along, because a straight
 * two-stop mask sits ~0.1 low through the middle of every reveal frame), the
 * travelling front-glow that is local to the leading edge, and the full stop
 * that arrives WHITE and warms to the accent as the solid edge crosses it — is
 * exactly the mechanism this scene needs. Three things are new here:
 *
 *   1. plum's `PlumEndcard` never ANIMATES the plate: it draws it settled
 *      (solid defaults to 2, bloom to 0). The reveal lived in scene 9's own
 *      timeline. This preset drives `solid` / `soft` / `bloom` from t, so the
 *      mechanism is reachable from a config.
 *   2. the ground is near-black instead of plum, plus a centred indigo wash —
 *      `endcardGround` is reused for the body and takes the two near-black
 *      stops as `gradA`/`gradB`, so the measured corner lifts and the eased
 *      interior stops still shape it.
 *   3. a SUBLINE under the mark, which plum has no place for.
 *   4. the brand's MONKEY mark stacked above the wordmark, in cream so the line
 *      art reads on a near-black ground, wiped in by the same mask as the type.
 *   5. a pure-black HEAD: the plate's ground itself fades up from black before
 *      the reveal, so the film's last shot cuts in on nothing at all.
 *
 * The plate reads as a bookend to scene 1 (the same "saru" in the same bold
 * geometric sans, on the same near-black, over the same indigo cast), which is
 * why the wordmark defaults match s1-dev.json's rather than plum's.
 *
 * MOTION IS FRONT-LOADED: the mark reveals, the wash lifts with it, the subline
 * fades up, and from ~2.4s the frame is byte-still to the last frame with no
 * fade — the film ends on it. The scene also starts at rest, on a bare ground:
 * at t=0 the reveal's leading edge sits exactly on the mark's left edge, so
 * nothing is half-drawn on the cut in.
 *
 * Pure function of t (seconds, absolute film clock). Design space 1280x720.
 */
import React from "react";
import { clamp01, lerp, easeByName } from "../../../src/lib/textcards/src/easing.js";
import { EndcardPlate } from "../../plum/presets/plum-endcard.jsx";
import { SARU_FONT } from "./saru-icon.jsx";
import { SaruMonkeyMark, MONKEY_ASPECT } from "./saru-mark-tile.jsx";

const s = (ms) => ms / 1000;

// saru palette. The accent is the brand's deep indigo; the ground is the same
// near-black family the app icon's tile is cut from.
const INDIGO = [79, 70, 229];        // #4F46E5
const GROUND_HI = [20, 19, 32];      // light plateau of the plate's ground
const GROUND_LO = [8, 8, 11];        // dark plateau
const SUB_INK = [166, 164, 186];
// The mark's stroke on this plate. The shipped logo is dark brown #554A42 and
// disappears on a near-black ground, so the endcard draws the same artwork in
// the portal's own cream — the colour of templates/saru/assets/saru-monkey-cream.svg,
// which is that recolour kept as a file. The DRAWING is inlined (via
// saru-mark-tile's `SaruMonkeyMark`) rather than <img>-loaded, because a
// renderer that screenshots frame by frame has no second chance at a pending
// asset fetch.
const MARK_CREAM = [247, 244, 237]; // #F7F4ED

const css = (c, a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a.toFixed(3)})`;

/**
 * The centred indigo wash. Screen-blended, so it is pure ADDED light: it lifts
 * the near-black ground toward indigo and leaves the white wordmark at 255
 * untouched (screen against white is white), which a normal-blend tint over the
 * type could not do. It rides the reveal so the plate brightens as the mark
 * lands, then holds.
 */
function Wash({ w, h, g, a }) {
  if (a <= 0.004) return null;
  const c = g.colour ?? INDIGO;
  const peak = (g.alpha ?? 0.30) * a;
  return (
    <div style={{
      position: "absolute", left: 0, top: 0, width: w, height: h,
      mixBlendMode: "screen", pointerEvents: "none",
      background: `radial-gradient(ellipse ${((g.rx ?? 0.60) * 100).toFixed(1)}% ${((g.ry ?? 0.56) * 100).toFixed(1)}%`
        + ` at ${((g.cx ?? 0.5) * 100).toFixed(1)}% ${((g.cy ?? 0.47) * 100).toFixed(1)}%,`
        + ` ${css(c, peak)} 0%, ${css(c, peak * 0.52)} 40%, ${css(c, peak * 0.16)} 72%, ${css(c, 0)} 100%)`,
    }} />
  );
}

export function SaruEndcard({ t, from, to, cfg }) {
  if (t < from - 0.001 || t > to + 0.001) return null;
  const w = cfg.width ?? 1280, h = cfg.height ?? 720;
  const rel = t - from;

  const wm = cfg.wordmark ?? {};
  const rv = cfg.reveal ?? {};
  const sub = cfg.sub ?? {};
  const glow = cfg.glow ?? {};
  const mk = cfg.mark ?? {};
  const blk = cfg.black ?? {};

  // ── the reveal ────────────────────────────────────────────────────────────
  // `solid` is the x (fraction of plate width) at which the mark is fully
  // opaque and it fades to nothing `soft` further right, so solid+soft is the
  // LEADING edge. Starting with the leading edge on the mark's left edge is
  // what makes frame 0 a clean, empty ground.
  const rAt = s(rv.atMs ?? 380), rDur = s(rv.durMs ?? 940);
  const rp = easeByName(rv.ease ?? "out", rv.pow)(clamp01((rel - rAt) / Math.max(1e-6, rDur)));
  const done = rel >= rAt + rDur;
  const solid = done ? 2 : lerp(rv.solidFrom ?? 0.215, rv.solidTo ?? 0.720, rp);
  const soft = lerp(rv.softFrom ?? 0.165, rv.softTo ?? 0.050, rp);
  // Bloom holds while the front is crossing the mark and decays once the mark
  // has LANDED — which is earlier than the end of the reveal, because the last
  // stretch of the wipe is the ramp clearing empty ground to the right of the
  // stop and changes nothing on screen. Keying the decay to the end of the
  // reveal instead leaves the settled mark glowing for a beat after it is
  // finished, which reads as a lag. Settled, the plate carries no halo at all.
  const bAt = s(rv.bloomOutAtMs ?? ((rv.atMs ?? 380) + (rv.durMs ?? 940)));
  const bloom = 1 - clamp01((rel - bAt) / Math.max(1e-6, s(rv.bloomOutMs ?? 320)));

  // ── the subline ───────────────────────────────────────────────────────────
  const sAt = s(sub.atMs ?? 1800), sFade = s(sub.fadeMs ?? 620);
  const sp = clamp01((rel - sAt) / Math.max(1e-6, sFade));
  const subA = sp;
  const subDy = (sub.riseDy ?? 14) * (1 - easeByName(sub.ease ?? "out", sub.pow)(sp));

  const gAt = s(glow.atMs ?? 380), gDur = s(glow.durMs ?? 1100);
  const washA = easeByName(glow.ease ?? "out", glow.pow)(clamp01((rel - gAt) / Math.max(1e-6, gDur)));

  // ── the black head ────────────────────────────────────────────────────────
  // The film's last shot opens on PURE black, not on the plate's ground: the
  // near-black gradient is already a picture (a lit centre, dark corners), and
  // cutting straight to it lands the eye on something before the mark has
  // arrived. So the plate is held under an opaque black for `holdMs`, then that
  // black lifts over `fadeMs` and the ground breathes in ahead of the reveal.
  // Sits directly on the plate, under everything the reveal draws.
  const kHold = s(blk.holdMs ?? 0), kFade = s(blk.fadeMs ?? 0);
  const blackA = kFade > 0 || kHold > 0
    ? 1 - easeByName(blk.ease ?? "inout", blk.pow)(clamp01((rel - kHold) / Math.max(1e-6, kFade)))
    : 0;

  // ── the mark ──────────────────────────────────────────────────────────────
  // The monkey rides the SAME wipe as the wordmark below it, so the lockup
  // resolves as one left-to-right sweep rather than as two events. plum's plate
  // owns its own copy of this mask (it is that file's measured non-linear ramp:
  // a mid stop at 0.55 alpha 60% along, because a straight two-stop mask sits
  // ~0.1 low through the middle of every reveal frame); it is restated here
  // rather than exported, so the plum preset stays untouched. Percentages are
  // relative to the masked box, so the mark's layer is the FULL plate.
  const masked = solid < 1;
  const markMask = masked
    ? `linear-gradient(90deg, #000 ${(solid * 100).toFixed(2)}%,`
      + ` rgba(0,0,0,0.55) ${((solid + 0.60 * soft) * 100).toFixed(2)}%,`
      + ` rgba(0,0,0,0) ${((solid + soft) * 100).toFixed(2)}%)`
    : undefined;
  const markW = mk.w ?? 104;
  const markH = markW / MONKEY_ASPECT;
  // Same halo law as the wordmark: a small residual once settled, lifted while
  // the front is crossing. drop-shadow rather than text-shadow because the mark
  // is stroked artwork, so the glow follows the line and not a box.
  const m1 = 0.05 + 0.18 * bloom, m2 = 0.02 + 0.10 * bloom;
  const markGlow = `drop-shadow(0 0 ${(markW * 0.10).toFixed(1)}px rgba(255,255,255,${m1.toFixed(3)}))`
    + ` drop-shadow(0 0 ${(markW * 0.30).toFixed(1)}px rgba(255,255,255,${m2.toFixed(3)}))`;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", isolation: "isolate" }}>
      <EndcardPlate
        w={w} h={h}
        wordmark={wm.text ?? "saru"}
        dot={wm.dot ?? INDIGO}
        gradA={cfg.gradA ?? GROUND_HI}
        gradB={cfg.gradB ?? GROUND_LO}
        solid={solid} soft={soft} bloom={bloom}
        dotX={wm.dotX ?? 0.600}
        sizeK={wm.sizeK ?? 0.1047}
        dyK={wm.dyK ?? -0.0390}
        dxK={wm.dxK ?? 0}
        track={wm.track ?? 0}
        weight={wm.weight ?? 700}
        font={wm.font ?? SARU_FONT}
      />
      {blackA > 0.002 ? (
        <div style={{
          position: "absolute", left: 0, top: 0, width: w, height: h,
          background: "#000", opacity: blackA, pointerEvents: "none",
        }} />
      ) : null}
      {mk.show === false ? null : (
        <div style={{ position: "absolute", inset: 0, WebkitMaskImage: markMask, maskImage: markMask }}>
          <div style={{
            position: "absolute",
            left: (mk.cx ?? 637) - markW / 2,
            top: (mk.cy ?? 196) - markH / 2,
            filter: markGlow,
          }}>
            <SaruMonkeyMark w={markW} colour={mk.colour ?? MARK_CREAM} />
          </div>
        </div>
      )}
      <Wash w={w} h={h} g={glow} a={washA} />
      {subA > 0.004 ? (
        <div style={{
          position: "absolute", left: 0, top: (sub.y ?? 452) + subDy, width: w,
          textAlign: "center", opacity: subA,
          fontFamily: sub.font ?? SARU_FONT,
          fontSize: sub.size ?? 29,
          fontWeight: sub.weight ?? 400,
          letterSpacing: `${sub.track ?? 0.018}em`,
          color: css(sub.colour ?? SUB_INK, 1),
          whiteSpace: "nowrap",
        }}>{sub.text ?? ""}</div>
      ) : null}
    </div>
  );
}

export const note = "the film's closing brand plate: plum-endcard's measured reveal mechanism (soft front that narrows as the mark lands, travelling front-glow, full stop that arrives white and warms to the accent) recast onto a near-black ground with a centred indigo wash, the brand's monkey mark in cream stacked above the wordmark, and a subline under it. Opens on pure black, resolves the whole lockup under ONE left-to-right wipe, then holds byte-still to the last frame with no fade out — the film ends on it.";
export const nativeMs = 6000;
