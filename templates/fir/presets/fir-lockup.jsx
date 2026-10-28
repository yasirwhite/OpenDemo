/**
 * fir-lockup.jsx — the fir template's brand bookends on black.
 *
 * SCENE 1 (0-3.45s) MEASURED off references/walkthrough/fin2.mp4, full decode
 * at 60fps (templates/fir/work/scenes/1/dec60). All 1920-space numbers below
 * are divided by 1.5 for the 1280 stage. NOTE: the reference's GRAPHICS run at
 * 24fps inside the 60fps container (frames repeat 3:2), so every "content
 * frame" time quoted is a display time; only the exit dissolve is authored at
 * 60fps. We render smooth at 60.
 *
 * The mark POPS in — one frame at 1.37x and ~55% opaque, the next at 1.25x and
 * opaque, settling on an exponential (tau 96ms, scale 1.726 extrapolated back
 * to the 500ms start). It is NOT a fade and NOT a symmetric ease.
 *
 * The glyph DRAWS ON while the tile settles: each of the five comb bars scales
 * vertically about its own centre, centre bar first and the outer pair last
 * (50ms stagger, tau 180ms), and the crescent smile is revealed centre-out
 * over 585-855ms. At 0.567s only the middle bar exists, at 0.683s three, at
 * 0.72s five.
 *
 * Then the LOCKUP EXPANDS (1.53-2.10s): the mark slides left 315px@1920 on
 * cubic-bezier(.5,.35,0,.9) while the wordmark slides RIGHTWARD out from
 * behind it — rigid, not a wipe: the 't' ascender tracks 785 -> 861@1920, so
 * the letters themselves travel. Exposed lockup length (mark-left to ink-right)
 * runs 120 -> 748@1920 on cubic-bezier(.1,.35,0,.85) from 1.64s. Emerging
 * letters are soft-edged near the mark (measured alpha 0.10 at +9px, 0.65 at
 * +31px at t=1.817) and hard by the settle, so the mask ramp collapses with
 * the move.
 *
 * The EXIT is the whole layer (black backdrop included) crossfading to reveal
 * the scene beneath: opacity 1 -> 0 LINEAR over 3.152-3.443s (sampled at
 * 60,60: 0 -> 188,186,236 in 18 frames, r^2 essentially 1 on a straight line).
 *
 * Pure function of t. All *Ms cues are SCENE-RELATIVE.
 */
import React from "react";
import { clamp01, lerp, rgb, cubicBezier } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";
import { s } from "./fir-shared.jsx";

/** cubic-bezier is a closure per call; memoise so a 3.5s render is not 200 of them. */
const BEZ = new Map();
const bez = (a) => {
  const k = a.join(",");
  let f = BEZ.get(k);
  if (!f) { f = cubicBezier(a[0], a[1], a[2], a[3]); BEZ.set(k, f); }
  return f;
};

/**
 * The INTERCOM logo — five round-capped comb bars over a crescent smile on a
 * rounded tile. This is NOT the Fin app icon (three bars, half-ellipse mouth,
 * MARK_GEOM_MEASURED in fir-shared.jsx); the two marks coexist in the film and
 * only the bookends draw this one.
 *
 * Geometry measured off f181 (t=3.0s) — NOT off t=1.0, where the glyph is
 * still drawing on: between 1.0 and 1.4 the outer bars still gain 10% and the
 * smile 7%, so a "rest" sampled at 1.0 builds a mark that never finishes.
 * Tile [584.5,465.5]-[705.5,585.5]@1920 (121px), as fractions of tile size:
 *   radius .125 | bar w .0664 pitch .166 (centres at 0, +-.166, +-.332)
 *   bar tops/bottoms  centre .125/.683  mid .146/.658  outer .217/.583
 *     (all three share a centre line at .402)
 *   smile: a round-capped STROKE of width .054S on a parabolic centreline
 *     y = .8394 - .886(x-.5)^2 running x .159 -> .841. Row-by-row the inner
 *     edge fits y = .812 - .944(x-.5)^2 and the outer y = .867 - .828(x-.5)^2
 *     — a constant perpendicular width — and the ends taper over ~3px, which
 *     is a round cap, not a point and not a square cut.
 * `grow` is [outer, mid, centre] 0..1 vertical scale about each bar's own
 * centre; `smile` is the centre-out reveal 0..1.
 */
export function IntercomMark({ size = 80.2, bg = [255, 255, 255], fg = [0, 0, 0],
  grow = [1, 1, 1], smile = 1, radius = 0.125, uid = "fl", style = {} }) {
  const S = size;
  const bw = S * 0.0664, pitch = S * 0.166;
  // [top, bottom] per bar, outward from the centre
  const spans = [[0.1250, 0.6833], [0.1458, 0.6583], [0.2167, 0.5833]];
  const els = [];
  for (let i = -2; i <= 2; i++) {
    const k = Math.abs(i);                 // 0 centre, 1 mid, 2 outer
    const [t0, b0] = spans[k];
    const g = clamp01(grow[2 - k]);        // grow[] is [outer, mid, centre]
    if (g <= 0.02) continue;
    const cy = S * (t0 + b0) / 2, h = S * (b0 - t0) * g;
    els.push(<rect key={"b" + i} x={S * 0.5 + i * pitch - bw / 2} y={cy - h / 2}
      width={bw} height={h} rx={bw / 2} fill={rgb(fg)} />);
  }
  const sm = clamp01(smile);
  const half = S * 0.341, cx = S * 0.5;
  // A CSS `clip-path: inset()` on an SVG child resolves against that child's
  // FILL box, not the viewport, so it would eat the crescent's own width. A
  // clipPath element in user space is the only correct centre-out reveal here.
  const clipId = `${uid}-sm`;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display: "block", ...style }}>
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <rect x={cx - half * sm} y="0" width={2 * half * sm} height={S} />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={S} height={S} rx={S * radius} fill={rgb(bg)} />
      {els}
      {sm > 0.002 && (
        <path clipPath={`url(#${clipId})`}
          d={`M ${cx - half} ${S * 0.7364} Q ${cx} ${S * 0.9424} ${cx + half} ${S * 0.7364}`}
          fill="none" stroke={rgb(fg)} strokeWidth={S * 0.054} strokeLinecap="round" />
      )}
    </svg>
  );
}

export function FirLockup({ t, from, to, cfg }) {
  if (t < from || t > to) return null;

  const size = cfg.markSize ?? 80.2;
  const cx = cfg.cx ?? 639.7, cy = cfg.cy ?? 350.2;
  const enter = cfg.enter ?? {};
  const atS = from + s(enter.atMs ?? 500);
  const bgOn = cfg.bg !== false;
  if (t < atS && !bgOn) return null;

  // ---- layer opacity: the whole plate crossfades away at the end ----
  let layerO = 1;
  if (cfg.fadeOutMs != null) {
    layerO = 1 - clamp01((t - (from + s(cfg.fadeOutAtMs ?? 0))) / s(cfg.fadeOutMs));
  }
  if (layerO <= 0) return null;

  // ---- mark arrival ----
  // 'pop'    (opener): oversized + transparent for one frame, exponential settle
  // 'shrink' (outro):  arrives very large and opaque, decaying on a measured
  //                    cubic-bezier (`enter.bez` + `enter.durMs`). The outro's
  //                    shrink is NOT an exponential: it drops 522->362px@1920 on
  //                    its second content frame, where the best-fitting
  //                    exponential still reads 397 (rms 11.5px vs 2.5px for the
  //                    bezier). Omit `bez` and the exponential path is unchanged.
  const el = Math.max(0, t - atS);
  const from0 = enter.mode === "shrink" ? (enter.fromScale ?? 4.42) : (enter.fromScale ?? 1.726);
  const decay = enter.bez
    ? 1 - bez(enter.bez)(clamp01(el / s(enter.durMs ?? 667)))
    : Math.exp(-el / s(enter.tauMs ?? 96));
  const markScale = t < atS ? from0 : 1 + (from0 - 1) * decay;
  // The scale pivot is not always the tile's centre: the outro's mark shrinks
  // about a point 11.8% of the tile below it (measured 552.6 vs a rest centre
  // of 538.5@1920 — a pure-centre scale puts the arrival frame's top edge 52px
  // off). Fraction of the mark's own height; 0.5 = centre.
  const originY = enter.originY ?? 0.5;
  const fadeAt = from + s(enter.fadeAtMs ?? (enter.atMs ?? 500) + 33);
  const markO = clamp01((t - fadeAt) / Math.max(1e-6, s(enter.fadeMs ?? 67)));

  // ---- glyph draw-on: bars from their own centres, then the smile ----
  const gl = cfg.glyph ?? {};
  const barTau = s(gl.barTauMs ?? 180);
  const stag = s(gl.barStaggerMs ?? 60);
  // grow[] is [outer, mid, centre]; the centre bar leads. A stretched
  // exponential (pow 1.15) fits the measured lengths within 3% everywhere; a
  // plain exponential leaves the bars ~3% short through the whole hold.
  const barPow = gl.barPow ?? 1.15;
  // `gl.bez` + `gl.durMs` swap the settle for a measured cubic-bezier — the
  // outro's bars are already 43% grown one content frame after the mark lands,
  // which no exponential (stretched or not) reaches without overshooting the
  // rest of the curve by 3-5%. Absent, the exponential path above is unchanged.
  // `durMs` may be one number or [centre, mid, outer] — the outro's outer pair
  // takes 617ms against the centre bar's 500ms, so one duration leaves the pair
  // 10% short through the middle of the draw-on.
  const barDur = (k) => s(Array.isArray(gl.durMs) ? (gl.durMs[k] ?? gl.durMs[0]) : (gl.durMs ?? 750));
  const growF = gl.bez
    ? (d, k) => (d <= 0 ? 0 : bez(gl.bez)(clamp01(d / barDur(k))))
    : (d) => (d <= 0 ? 0 : 1 - Math.exp(-Math.pow(d / barTau, barPow)));
  // `gl.barDelaysMs` = [centre, mid, outer] when the pairs do NOT come in on an
  // even beat: the outro measures 0 / 34 / 118ms, i.e. the mid pair is almost on
  // top of the centre bar and the outer pair waits nearly three content frames.
  // A single stagger cannot say that — at 34ms the outer pair is already 43%
  // grown on the frame the reference still has it absent.
  // delays[] is [centre, mid, outer]; grow[] is [outer, mid, centre], so the
  // map's k (2,1,0) indexes delays directly.
  const delays = gl.barDelaysMs ?? [0, stag * 1000, 2 * stag * 1000];
  const grow = [2, 1, 0].map((k) => growF(t - (atS + s(delays[k] ?? 0)), k));
  const smAt = atS + s(gl.smileAtMs ?? 85);
  const smileP = clamp01((t - smAt) / Math.max(1e-6, s(gl.smileMs ?? 270)));
  // The centre-out reveal is linear unless `smileBez` says otherwise (the
  // outro's is an S: half the width in the first third, then a long creep).
  const smile = gl.smileBez ? bez(gl.smileBez)(smileP) : smileP;

  // ---- lockup expansion ----
  const sl = cfg.slide ?? {};
  const slideAt = from + s(sl.atMs ?? 1530), slideDur = s(sl.durMs ?? 450);
  const pMark = bez(sl.bez ?? [0.5, 0.35, 0, 0.9])(clamp01((t - slideAt) / slideDur));
  const markLeftRest = cx - size / 2;
  const markLeft = lerp(markLeftRest, cfg.lockupLeft ?? 390.0, pMark);

  const wm = cfg.wordmark ?? {};
  const wordOn = wm.text !== undefined || cfg.wordmark != null;
  const wAt = from + s(wm.atMs ?? 1640), wDur = s(wm.durMs ?? 400);
  const pWord = bez(wm.bez ?? [0.1, 0.35, 0, 0.85])(clamp01((t - wAt) / wDur));
  const inkW = wm.inkWidth ?? 398.7;
  // exposed lockup length, mark-left to ink-right: the mark alone -> the pair
  const lockLen = lerp(size, (cfg.lockupRight ?? 888.3) - (cfg.lockupLeft ?? 390.0), pWord);
  const inkRight = markLeft + lockLen;
  const inkLeft = inkRight - inkW;
  const markRight = markLeft + size;
  // The reveal edge is soft while the letters are moving and hard once settled.
  // `rampHoldP` holds the soft edge at full width until the lockup is that far
  // along and only then collapses it: the outro's edge measures a near-constant
  // 12-13 stage px from p=0.08 to p=0.84 (fade 1040->1054, 1105->1124,
  // 1300->1318 @1920) where a straight (1 - p) has it down to 6 by then.
  const rampHold = wm.rampHoldP ?? 0;
  const ramp = (wm.rampPx ?? 34) * clamp01((1 - pWord) / Math.max(1e-6, 1 - rampHold));

  // Two DIFFERENT reveals, measured — the bookends are not the same move run
  // backwards. Default ("tail"): the wordmark is rigid and slides RIGHTWARD out
  // from behind the mark, so its END clears the mark first (the opener reads
  // "m" -> "com" -> "ercom" -> "intercom", verified on dec60/f105 at 1.733s).
  // "head": the wordmark is pinned `gapPx` right of the mark and a window opens
  // rightward over it, so its START appears first (the outro reads "i" ->
  // "int" -> "interco" -> "intercom", verified on exact/f059,f064,f069). The
  // window's right edge is the same measured lockup length either way.
  const headMode = wm.reveal === "head";
  const textX = headMode ? markRight + (wm.gapPx ?? 0) - (wm.inkDx ?? 0)
    : inkLeft - (wm.inkDx ?? 0);
  const revealW = Math.max(0, inkRight - markRight);
  // The measured soft edge straddles the reveal position (50% alpha lands within
  // 2px@1920 of it at every sampled frame), so the gradient is centred on it,
  // plus 1px of slack so a settled hard edge cannot shave the last letter.
  const maskCss = headMode
    ? `linear-gradient(90deg, rgba(0,0,0,1) ${Math.max(0, revealW - ramp / 2).toFixed(1)}px, rgba(0,0,0,0) ${(revealW + ramp / 2 + 1).toFixed(1)}px)`
    : (ramp > 0.5 ? `linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,1) ${ramp.toFixed(1)}px)` : null);

  return (
    // zIndex 30: scenes stack in startMs order (config-timeline sorts by
    // startMs), so the opener — startMs 0 — would paint UNDER the ground/card
    // scenes it must cover while it crossfades away at 3.15-3.44s. The bookends
    // are always the film's top layer; a z-index here fixes the stacking
    // without touching the shared timeline sort.
    <div style={{ position: "absolute", inset: 0, opacity: layerO.toFixed(4), zIndex: 30 }}>
      {bgOn && <div style={{ position: "absolute", inset: 0, background: rgb(cfg.bgColour ?? [0, 0, 0]) }} />}

      {wordOn && pWord > 0.0005 && (
        <div style={{
          position: "absolute", left: markRight, top: 0,
          width: Math.max(0, 1280 - markRight), height: 720, overflow: "hidden",
          ...(maskCss ? { WebkitMaskImage: maskCss, maskImage: maskCss } : {}),
        }}>
          <svg width={1280} height={720} style={{ position: "absolute", left: -markRight, top: 0, overflow: "visible" }}>
            {/* the reference wordmark's stems measure 21px@1920 against Segoe UI
                Semibold's 18 and Bold's 25; a hairline stroke lands on 21. */}
            <text x={textX.toFixed(2)} y={wm.baseline ?? 391}
              fontFamily={wm.font ?? cfg.font ?? FONT} fontSize={wm.size ?? 110}
              fontWeight={wm.weight ?? 600} letterSpacing={wm.tracking ?? -4.4}
              fill={rgb(wm.colour ?? [255, 255, 255])}
              stroke={wm.strokePx ? rgb(wm.colour ?? [255, 255, 255]) : "none"}
              strokeWidth={wm.strokePx ?? 0} strokeLinejoin="round"
              paintOrder="stroke">{wm.text ?? "intercom"}</text>
          </svg>
        </div>
      )}

      <div style={{
        position: "absolute", left: markLeft, top: cy - size / 2, opacity: markO.toFixed(3),
        transform: `scale(${markScale.toFixed(4)})`,
        transformOrigin: `50% ${(originY * 100).toFixed(2)}%`,
      }}>
        <IntercomMark size={size} bg={cfg.markBg ?? [255, 255, 255]} fg={cfg.markFg ?? [0, 0, 0]}
          radius={cfg.markRadius ?? 0.125} grow={grow} smile={smile} />
      </div>
    </div>
  );
}
