/**
 * aperture-fold.jsx — a brand mark assembling itself out of rotating blades.
 *
 * The opener. N flat blades arrive EDGE-ON (zero width, so they are revealed by
 * their own rotation rather than by a fade), swing in around the mark centre,
 * un-foreshorten, and interlock into a faceted aperture ring with a hollow
 * middle.
 *
 * Measured against the Comet launch film's opening fold (0.00–3.20s, 25fps),
 * which is the quality bar rather than the design:
 *
 *   - ink appears at t=0.24 as a 21px sliver 111px tall — the mark does NOT
 *     fade up, it rotates out of nothing at full height. That is why every
 *     blade here starts at `rollFromDeg` (90° = exactly edge-on) instead of at
 *     opacity 0.
 *   - the fan is over in ~480ms (width 21 -> 125px) and is heavily front-
 *     loaded: ~76% of the width is gained in the first 40% of the travel. Fast
 *     attack, long creep — memReveal/expoOut territory, never a symmetric S.
 *   - width is NOT monotonic. It runs 119 -> 108 -> 94 -> 80 -> 92 -> 125:
 *     blades swing PAST their resting angle and come back. Reproduced here by
 *     putting a third of the blades on backOut for their orbit.
 *   - then it HOLDS: w = 118..127 (±3%) for the next 1.3s. The assemble is
 *     short and the stillness afterwards is what makes it land.
 *
 * Everything is a pure function of `t`. The 3D is solved in JS — each blade is
 * a planar quad, rotated about its own radial/tangential/normal axes, orbited
 * about the mark centre, then perspective-projected to SVG polygon points — so
 * the geometry does not depend on a browser's 3D rasteriser and two renders of
 * the same frame are identical. No Math.random, no wall clock.
 */

import React from "react";
import {
  clamp01, lerp, at, rgb, mixRgb,
  easeOut, easeOutQuint, expoOut, memReveal, backOut,
} from "../easing.js";
import { STAGE, FONT, C } from "../theme.js";

const DEG = Math.PI / 180;

/** Rotate the pair (a,b) by r radians. Used for each of the three blade axes. */
export const rot2 = (a, b, r) => {
  const c = Math.cos(r), s = Math.sin(r);
  return [a * c - b * s, a * s + b * c];
};

/**
 * The measured exponential settle, NORMALISED to reach exactly 1 at p=1.
 * `settleDecay` deliberately never clamps — over a fixed window it still has
 * e^-4 (1.83%) left — which is right for a settle that runs forever but wrong
 * for a channel that must ARRIVE: blades riding the raw curve come to rest 1.6%
 * off-radius and the assembled ring is permanently irregular.
 */
const EXP_SETTLE = (() => {
  const k = 1 - Math.exp(-4);
  return (p) => (1 - Math.exp(-4 * p)) / k;
})();

/**
 * PER-CHANNEL CURVE TABLES — the anti-"generated" measure.
 *
 * The reference's easing-shape spread is 0.41 and ~1% of its curves are a
 * plain ease-in-out. So no two channels here share a curve and no two adjacent
 * blades ride the same one: a blade's curve for each channel is picked by
 * i % 3, and the tables differ per channel. `orbit` deliberately includes a
 * backOut so a third of the blades overshoot their slot and settle back, which
 * is what makes the assembled silhouette breathe instead of inflating — the
 * reference's fold loses width three frames running for exactly this reason.
 *
 * `roll` is the ONE channel that must not be front-loaded. It is the reveal:
 * a blade at 90° has zero width, so however long the roll spends near 90° is
 * how long the piece is legible as a turning edge. On memReveal that was over
 * within ~50ms and the blades simply appeared full-size and slid — so roll gets
 * the gentlest curves here AND rides a longer window (`rollSlow`).
 */
const powOut = (n) => (p) => 1 - Math.pow(1 - p, n);

const CURVE = {
  roll:   [powOut(1.8), powOut(2.4), powOut(3.2)],
  orbit:  [easeOutQuint, (p) => backOut(p, 1.5), expoOut],
  radius: [EXP_SETTLE, easeOut, easeOutQuint],
  spin:   [easeOut, memReveal, (p) => backOut(p, 1.05)],
  depth:  [expoOut, easeOutQuint, memReveal],
};
/** Per-blade duration spread, so the phases never line back up. */
const DUR_MUL = [1.0, 0.86, 1.14];
/** Per-blade pitch bias — breaks the uniformity of the tilt-in. */
const PITCH_MUL = [1, -0.7, 0.45];

/** Sample a colour ramp around a closed ring (wraps, so blade N-1 meets 0). */
export function ringColour(stops, u) {
  const m = stops.length;
  if (m === 1) return stops[0];
  const pos = u * m;
  const i = Math.floor(pos) % m;
  return mixRgb(stops[i], stops[(i + 1) % m], pos - Math.floor(pos));
}

/**
 * One blade's resting outline, in its own frame:
 *   local x = radial offset from the blade's mid-radius, local y = tangential.
 *
 * A wedge cut from the ring between `holeR` and `R`: its outer and inner edges
 * are straight chords (so the silhouette is faceted, not a circle), narrowed to
 * `gap` of its sector so neighbours leave a hairline seam — the seams are what
 * let the mark read as ASSEMBLED rather than as one drawn ring.
 *
 * The pinwheel comes from ROTATING the inner edge by `twist` about the mark
 * centre, not from sliding it tangentially. The slide is the obvious way to
 * write this and it is wrong: it leaves each blade's inner corner poking
 * holeR*tan(twist) into its neighbour's sector, so the seams come out uneven
 * and the six pieces stop reading as one repeated shape. Rotating keeps every
 * blade congruent and every seam identical, because adjacent inner edges still
 * meet at the same angle they would have without the twist.
 */
export function bladeShape(R, holeR, n, gap, twistDeg) {
  const half = (Math.PI / n) * gap;
  const twist = twistDeg * DEG;
  const rMid = (R + holeR) / 2;
  const polar = (r, a) => [r * Math.cos(a) - rMid, r * Math.sin(a)];
  return {
    rMid,
    pts: [
      polar(R, -half),
      polar(R, +half),
      polar(holeR, +half + twist),
      polar(holeR, -half + twist),
    ],
  };
}

export function ApertureFold({
  t, from, to,
  blades = 6, size = 240, x = 0, y = 0,
  hole = 0.46, gap = 0.94, twistDeg = 14, rotDeg = 0,
  colours = [C.blue, C.violet],
  shadeAmount = 0.22, shadeTo = [14, 12, 30],
  shadow = { dx: 0, dy: 9, blur: 16, alpha: 0.16 },
  assembleMs = 1150, staggerMs = 75, pairSkewMs = 26,
  orbitFromDeg = -68, spreadFrom = 1.45, rollFromDeg = 90, rollSlow = 1.45,
  pitchFromDeg = -32, spinFromDeg = 26, zFrom = -260, persp = 900,
  settleMs = null, settleRotDeg = -7, settleScale = 1.05,
  core = null, label = null, dive = null,
}) {
  if (t < from - 0.001 || t > to + 0.001) return null;

  const n = Math.max(3, Math.round(blades));
  const R = size / 2;
  const holeR = R * clamp01(hole);
  const { rMid, pts } = bladeShape(R, holeR, n, gap, twistDeg);
  const cx = STAGE.w / 2 + x, cy = STAGE.h / 2 + y;

  // ── per-blade phase ───────────────────────────────────────────────────────
  // Mirrored stagger: slot = ring distance from blade 0, so the two halves of
  // the ring converge together instead of a single hand sweeping round. The
  // second blade of each mirrored pair is nudged by pairSkewMs so the symmetry
  // is not machine-exact — the reference's fan is symmetric but never paired to
  // the frame.
  const delayMs = (i) => Math.min(i, n - i) * staggerMs + (i > n / 2 ? pairSkewMs : 0);
  const durMs = (i) => assembleMs * DUR_MUL[i % 3];

  // The mark is not "assembled" when the last blade reaches its slot but when
  // the last blade is FLAT — the roll runs `rollSlow` longer than the travel,
  // so a piece arrives still turning and finishes folding in place.
  let assembleEndMs = 0;
  for (let i = 0; i < n; i++) {
    assembleEndMs = Math.max(assembleEndMs, delayMs(i) + durMs(i) * Math.max(1, rollSlow));
  }

  // ── whole-mark settle ─────────────────────────────────────────────────────
  // The ring arrives over-rotated and slightly oversized and screws itself
  // closed as it assembles — one continuous gesture with the blades, not a
  // second move layered on top.
  //
  // The obvious way to write this is to start the settle when the LAST blade
  // lands. Don't: the mark then sits perfectly still and, on one frame, begins
  // rotating at ~15°/s. It is continuous in position but not in velocity, and
  // that corner is visible as a kick — it shows up as the largest second-
  // difference in the whole clip. Riding the assemble window instead means the
  // offset is already decaying while the blades are still invisible, so there
  // is no onset to see. easeOutQuint lands with EXACTLY zero velocity (its
  // derivative is 5(1-p)^4), which a raw exponential settle does not.
  const settleWinMs = settleMs ?? assembleEndMs;
  const rem = 1 - easeOutQuint(at(t, from, settleWinMs / 1000));
  let markRot = rotDeg * DEG + settleRotDeg * DEG * rem;
  const markScale = 1 + (settleScale - 1) * rem;

  // ── THE DIVE ──────────────────────────────────────────────────────────────
  // Optional closing move: the locked mark enlarges, spins up, and the camera
  // flies THROUGH the hollow. Entirely gated on `dive` — with it null every
  // value below is 0/1 and the projection is the one this preset always had.
  //
  // The magnification is driven DIRECTLY, and the camera z is then solved from
  // it, rather than the other way round. Dollying z on a fixed curve is the
  // obvious way to write this and it is wrong twice over: the on-screen size
  // is persp/(persp-z), which is nearly flat until z is most of the way to the
  // lens and then goes vertical in the last two frames — measured against the
  // reference's dive (frames 73-82 at 25fps, mark width 60 -> 1400px) that is
  // an entirely different shape, and it puts the whole move in three frames.
  // Solving z from M(p) = exp(ln(mag)*p^magPow) instead gives a constant-ish
  // RELATIVE growth that steepens, which is what the reference measures
  // (per-frame ratio 1.17 climbing to 2.33), and p^magPow with magPow>1 has
  // zero derivative at p=0 — so the dive begins from the dead hold with no
  // velocity step. A plain easeIn would start moving on its first frame.
  //
  // Because kk = persp/(persp - z) and z = persp*(1 - 1/M), a vertex sitting
  // in the mark plane projects at exactly M. Vertices pushed off that plane
  // (`splayZ`, and the tilt) are magnified by M as well — that is the whole
  // parallax budget, and it is why splayZ can be single-digit px and still
  // separate the blades violently once M is large.
  let diveP = 0, diveMag = 1, camZ = 0, tiltR = 0, splayZ = 0, bearX = 0, bearY = 0;
  if (dive) {
    diveP = at(t, from + (dive.atMs ?? 0) / 1000, Math.max(0.001, (dive.durMs ?? 520) / 1000));
    const mag = dive.mag ?? 26;
    // MAGNIFICATION SHAPE. With `magMix` absent this is the single power the
    // preset has always used and every existing config renders unchanged.
    //
    // `magMix` blends in a second, much steeper power. Measured against the
    // reference's own dive (29 pictures, f52-f82; the source is 24fps pulled up
    // to 25, so every 25th frame is a repeat and has to be dropped before any
    // of this is measurable): the reference creeps at 1.2%/picture through the
    // first third and finishes at 78%/picture. No single p^k describes that —
    // the k that reproduces the ending is ~11 and predicts essentially zero
    // growth for the first half, and the best single-power fit leaves an rms of
    // 0.079 ln-units. Two powers, one carrying the creep and one the blowup,
    // fit the same 29 pictures to 0.0079 — ten times closer.
    //
    // Both exponents must be > 1. Then d/dp of the sum is strictly increasing
    // on (0,1], so the per-frame growth rate cannot ease out ANYWHERE by
    // construction — which is the whole point of the channel. A dive is a
    // buildup, not an animation that plays: it has to be picking up speed on
    // the frame the cut lands, not arriving.
    const magShape = dive.magMix
      ? (1 - dive.magMix) * Math.pow(diveP, dive.magPow ?? 1.9)
        + dive.magMix * Math.pow(diveP, dive.magPow2 ?? 8)
      : Math.pow(diveP, dive.magPow ?? 1.9);
    diveMag = Math.exp(Math.log(mag) * magShape);
    camZ = persp * (1 - 1 / diveMag);
    // The tilt RETURNS to zero. Holding it would mean flying through a ring
    // presented edge-on, where the near half crosses the lens while the far
    // half is still a third of the way out and the hollow never squares up on
    // the frame — there is then no frame that reads as "inside", only one that
    // reads as "past". Rising and falling gives the 3/4 view that sells the
    // depth in the middle of the move and a square-on hollow at the exit.
    //
    // The exponent must be > 1. sin(pi*p^0.8) peaks earlier, which is the more
    // attractive shape, but p^0.8 has an infinite derivative at p=0: measured
    // frame to frame the tilt then opens 8.3deg on the dive's FIRST frame and
    // 7.0deg on its second, i.e. it leaves the dead hold already at cruising
    // angular speed. That velocity step is the same corner the whole-mark
    // settle above is written to avoid. At 1.25 the first three frames are
    // 2.4 / 4.5 / 6.3deg — an onset instead of a start.
    //
    // `tiltReturn: false` drops the return and lands the full tilt at p=1
    // instead of at the midpoint. Use it when the dive is a CRASH rather than a
    // fly-through: the return is an ease-out, and while its effect on apparent
    // size is small it is not nothing — the lay-back foreshortens the ring, so
    // a tilt that is coming back UNDOES growth for the frames it runs over, and
    // on a dive tuned to accelerate to the last frame that shows up as a dent
    // in the measured frame-to-frame magnification exactly where there must not
    // be one. `tiltPow` alone (leaving the return) just moves the peak later.
    const tiltShape = Math.PI * Math.pow(diveP, dive.tiltPow ?? 1.25);
    tiltR = (dive.tiltDeg ?? -46) * DEG
      * Math.sin((dive.tiltReturn ?? true) ? tiltShape : tiltShape / 2);
    // splayZ has a hard ceiling: the nearest vertex sits at persp/mag - splayZ
    // from the lens, so anything at or past persp/mag - persp*0.02 hits the
    // clamp below and that blade's growth STALLS for a frame while its
    // neighbours keep coming — a pop, exactly where the move is most exposed.
    // Keep splayZ < persp/mag - persp*0.02 (8px at persp 900, mag 30).
    splayZ = (dive.splayZ ?? 8) * Math.pow(diveP, 1.5);
    // The spin is deliberately LESS back-loaded than the growth (1.25 vs the
    // ~2 the magnification wants). Magnification is near-flat for the first
    // third of any dive — that is what a dive is — so if the spin is on the
    // same shape those frames carry no information at all and the move reads
    // as a dead hold followed by three frames of explosion. The tumble is what
    // makes the early dive legible; the growth is what finishes it.
    markRot += (dive.spinDeg ?? 330) * DEG * Math.pow(diveP, dive.spinPow ?? 1.25);

    // ── CRASH BEARING ───────────────────────────────────────────────────────
    // Without this the lens flies up the ring's axis: the hollow's centre is
    // the fixed point of the growth, so the mark opens symmetrically around
    // frame centre and every blade leaves through its own corner at the same
    // moment. Measured against the reference that is the wrong shape — the
    // reference's dive registers as a similarity about a fixed point at
    // (661, 370), i.e. 23px off frame centre on a 26.6deg bearing, held to
    // within a few px for the whole move. It is aiming slightly PAST the
    // middle, and that is what makes one piece of the mark rush the lens while
    // the opposite piece slides away.
    //
    // `bearR` is that offset as a fraction of the outer radius and `bearBlade`
    // picks WHICH blade it aims at: the direction is that blade's own ring
    // angle, sampled at `bearAtP` of the dive, so with bearAtP 1 the named
    // blade is sitting on the lens axis on the last frame before the cut.
    // Sampling once and freezing is deliberate — a bearing that tracked the
    // spinning blade would move the fixed point, and then the whole frame
    // swims instead of the mark opening out of a fixed hole.
    //
    // Implemented as a screen-space offset of b*(M-1), NOT by translating the
    // geometry. For a vertex in the mark plane the projection is exactly M, so
    // subtracting b*(M-1) makes the screen map `centre + b + (v-b)*M`: a pure
    // scale about `centre + b`. That is the fixed point, exactly, on every
    // frame, and at M=1 it is identically zero — so this cannot perturb the
    // assemble. Deliberately NOT carried through the tilt: the bearing is where
    // the LENS is aimed, not a piece of geometry, and running it through the
    // tilt would push it past the near-clip at high mag and make the whole
    // frame jump on the clamp.
    //
    // Keep bearR below `hole` — beyond that the aim point is inside a blade
    // rather than in the hollow, and the exit frame can never clear: the
    // nearest ink sits (hole - bearR)*R*M from centre, which is what has to
    // exceed the frame's corner radius for the cut to land on a bare plate.
    if (dive.bearR) {
      const bq = dive.bearAtP ?? 1;
      const bAng = rotDeg * DEG
        + (dive.spinDeg ?? 330) * DEG * Math.pow(bq, dive.spinPow ?? 1.25)
        + ((dive.bearBlade ?? 0) / n) * 2 * Math.PI;
      const bR = dive.bearR * R * (diveMag - 1) * markScale;
      bearX = bR * Math.cos(bAng);
      bearY = bR * Math.sin(bAng);
    }
  }
  const diveOn = dive ? diveP : 0;
  const bearing = bearX !== 0 || bearY !== 0;

  // ── project every blade ───────────────────────────────────────────────────
  const solved = [];
  for (let i = 0; i < n; i++) {
    const p = at(t, from + delayMs(i) / 1000, durMs(i) / 1000);
    if (p <= 0) continue;                      // still edge-on and off-radius

    const k = i % 3;
    const eRoll = CURVE.roll[k](at(t, from + delayMs(i) / 1000, (durMs(i) * rollSlow) / 1000));
    const eOrbit = CURVE.orbit[(k + 1) % 3](p);
    const eRadius = CURVE.radius[(k + 2) % 3](p);
    const eSpin = CURVE.spin[k](p);
    const eDepth = CURVE.depth[(k + 2) % 3](p);

    const roll = (1 - eRoll) * rollFromDeg * DEG;
    const pitch = (1 - eDepth) * pitchFromDeg * PITCH_MUL[k] * DEG;
    const spin = (1 - eSpin) * spinFromDeg * (i % 2 ? -1 : 1) * DEG;
    const rScale = lerp(spreadFrom, 1, eRadius);
    const zOff = lerp(zFrom, 0, eDepth);
    const ang = markRot + (i / n) * 2 * Math.PI + (1 - eOrbit) * orbitFromDeg * DEG;

    // Per-blade depth split for the dive. cos(2*slot) is a SADDLE: it sums to
    // zero over the ring, so the mark does not drift toward or away from the
    // lens as a whole while the blades separate. A per-index table (1/-0.6/...)
    // is the easy version and it has a non-zero mean, which reads as the mark
    // lurching forward at the moment the splay opens.
    const splay = splayZ * Math.cos(2 * (i / n) * 2 * Math.PI + 0.7);

    const proj = [];
    let zSum = 0;
    for (const [px, py] of pts) {
      let X = px, Y = py, Z = 0;
      [X, Y] = rot2(X, Y, spin);      // spin in the blade's own plane
      [Y, Z] = rot2(Y, Z, roll);      // roll about the radial axis -> edge-on
      [Z, X] = rot2(Z, X, pitch);     // pitch about the tangential axis
      X += rMid * rScale;             // out to the blade's ring radius
      [X, Y] = rot2(X, Y, ang);       // orbit about the mark centre
      Z += zOff;
      if (dive) {
        [Y, Z] = rot2(Y, Z, tiltR);   // lay the whole ring back, then level it
        Z += camZ + splay;            // ...and fly the lens into the hollow
      }
      // Clamped so a vertex can never cross the lens and re-project inverted.
      // At rest Z is in [zFrom, 0], so persp - Z is 900..1160 and this is the
      // bare subtraction it always was.
      const kk = persp / Math.max(persp * 0.02, persp - Z);
      // Branched rather than always subtracting, so a config without a bearing
      // goes down the identical arithmetic it always did.
      if (bearing) proj.push([cx + X * kk * markScale - bearX, cy + Y * kk * markScale - bearY]);
      else proj.push([cx + X * kk * markScale, cy + Y * kk * markScale]);
      zSum += Z;
    }

    // How square-on to camera the blade is, for the tonal shift as it turns
    // away from the light. This is the z of the face normal after roll and
    // pitch; the orbit is a rotation about z and so cannot change it.
    const facing = Math.abs(Math.cos(roll) * Math.cos(pitch));

    const base = ringColour(colours, i / n);
    solved.push({
      i,
      z: zSum / pts.length,
      d: proj.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(" "),
      fill: rgb(mixRgb(base, shadeTo, shadeAmount * (1 - facing))),
    });
  }

  // Painter's algorithm: furthest first. Every blade lands at z=0, so at rest
  // this is a total tie and the stable sort falls back to ring order — the
  // resting mark never flickers between draw orders.
  solved.sort((a, b) => a.z - b.z || a.i - b.i);

  // ── core ──────────────────────────────────────────────────────────────────
  let coreEl = null;
  if (core) {
    const cp = at(t, from + (core.atMs ?? assembleEndMs * 0.72) / 1000, (core.durMs ?? 520) / 1000);
    if (cp > 0) {
      const cr = R * (core.r ?? 0.16) * backOut(cp, 1.5) * markScale;
      if (cr > 0.2) {
        coreEl = <circle cx={cx} cy={cy} r={cr.toFixed(2)} fill={rgb(core.colour ?? C.ink)} />;
      }
    }
  }

  const body = (
    <>
      {solved.map((b) => <polygon key={b.i} points={b.d} fill={b.fill} />)}
      {coreEl}
    </>
  );

  // ── label ─────────────────────────────────────────────────────────────────
  // Optional wordmark under the mark: fades up and settles from below, so an
  // opener is one scene rather than a mark scene plus a text scene.
  let labelEl = null;
  if (label && label.text) {
    const lAt = from + (label.atMs ?? assembleEndMs * 0.9) / 1000;
    const lp = at(t, lAt, (label.durMs ?? 620) / 1000);
    if (lp > 0) {
      // The text presets rise on `settleDecay`, which never clamps — right for
      // a word entering under a passage that keeps moving, wrong here. This
      // opener ends on a dead hold, and a rise that is still creeping 0.4px
      // when the hold starts re-rasterises the type every few frames: the whole
      // clip's motion alternates between exactly 0 and one flipped pixel row.
      // easeOutQuint ARRIVES, so the hold is genuinely frame-identical.
      const riseRem = 1 - easeOutQuint(at(t, lAt, (label.riseDurMs ?? 700) / 1000));
      labelEl = (
        <div style={{
          position: "absolute", left: 0, right: 0,
          top: `${cy + R * 1.25 + (label.dy ?? 0)}px`,
          textAlign: "center",
          font: `${label.weight ?? 500} ${label.size ?? 34}px ${label.font ?? FONT}`,
          letterSpacing: `${label.tracking ?? 0.02}em`,
          color: rgb(label.colour ?? C.ink),
          opacity: memReveal(lp).toFixed(3),
          transform: `translateY(${((label.riseDy ?? 18) * riseRem).toFixed(2)}px)`,
        }}>{label.text}</div>
      );
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={STAGE.w} height={STAGE.h} viewBox={`0 0 ${STAGE.w} ${STAGE.h}`}
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {/* Drop shadow: the same blades again, offset and blurred, under the
            mark. The reference's fold sits on a soft contact shadow and without
            one the pieces read as printed on the ground rather than turning
            above it. Opacity tracks the fold so nothing casts before it exists. */}
        {/* The contact shadow is killed in the first fifth of the dive: it is a
            shadow cast on the GROUND the mark was resting on, and once the mark
            is flying at the lens there is no ground under it. Left alive it
            scales with the blades — a hard dark duplicate offset by a fixed 9px
            with a fixed 16px blur, which at 26x reads as a printing misregister
            rather than as contact. Multiplying by 1 when `dive` is null.

            The ramp is p^1.7 rather than linear for the same reason the tilt is:
            the shadow sits BELOW the mark, so retiring it moves the ink
            centroid up. On a linear ramp that started at full rate the measured
            centroid stepped 1.85px on the dive's first frame from a hold that
            had been flat to 0.05px, and total ink dipped 2% before it began to
            grow — the move visibly twitches before it starts. */}
        {shadow && shadow.alpha > 0 && (
          <g transform={`translate(${shadow.dx ?? 0} ${shadow.dy ?? 12})`}
            opacity={(shadow.alpha * at(t, from, Math.max(0.001, assembleEndMs * 0.0007))
              * (1 - Math.min(1, Math.pow(diveOn * 2, 1.7)))).toFixed(3)}
            style={{ filter: `blur(${shadow.blur ?? 20}px)` }}>
            {solved.map((b) => <polygon key={b.i} points={b.d} fill={rgb(shadow.colour ?? shadeTo)} />)}
          </g>
        )}
        {body}
      </svg>
      {labelEl}
    </div>
  );
}
