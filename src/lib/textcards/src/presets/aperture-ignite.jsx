/**
 * aperture-ignite.jsx — the closer: ONE SUN reveals the aperture, one glass
 * shard at a time.
 *
 * The brief, in the human's words: "one sun revealing each glass shard at a
 * time... then it has OpenDemo as text next to it". So this is not a logo that
 * fades up on a starfield. A single body of light is born over the outro's
 * rotating star field, takes a lap around the ring the mark will occupy, and
 * every shard it passes swings out of nothing behind it. When the lap closes
 * the sun falls into the hollow and stays there as the mark's core, the group
 * slides left, and the wordmark rises in beside it.
 *
 * Optionally the light then LEAVES: set `sunFadeAtMs` and the settled sun goes
 * out from the inside once the wordmark has landed, ending the film on the
 * glass and the type alone. See "the light's departure" below for why it is
 * three retirements and not one fade, and for what the glass keeps.
 *
 * It inherits two things on purpose:
 *
 *   - THE MARK. bladeShape/rot2/ringColour come from aperture-fold.jsx, so the
 *     six shards here are the same six pieces the film opens with, at the same
 *     twist and the same seam width. Re-deriving the geometry locally is how a
 *     logo ends up with two slightly different versions of itself in one film.
 *   - THE REVEAL. A shard is revealed by rolling out of edge-on (zero width),
 *     never by a fade — the same rule the opener is built on. A cross-fade here
 *     would read as the shard being pasted over the sun rather than drawn out
 *     of it, which is the exact failure star-lockup.jsx was written to kill.
 *
 * SYNC. The sun's angle is a smooth monotone function of t, and each shard's
 * ignition time is SOLVED from it by bisection — not scheduled independently.
 * Scheduling both from the same table is the obvious approach and it drifts:
 * any change to the orbit easing then leaves the sun lighting shards it has
 * not reached yet, which is the one thing this beat cannot survive. Bisection
 * on a monotone curve is exact to 1e-5 in 24 iterations and stays a pure
 * function of t.
 *
 * DEPTH. The orbit is not a compass circle. The sun's ring radius and its own
 * radius both ride one sine — it swells and moves out as it comes toward
 * camera, tucks and shrinks as it goes behind — and its bloom is drawn UNDER
 * the glass while its core is drawn OVER. That fixed layering is deliberate:
 * swapping the whole sun front-to-back as it crosses reads as a one-frame pop,
 * while bloom-under/core-over is stable, physically sensible, and still lets
 * the shards visibly sit in front of the light on the far half of the lap.
 *
 * Everything is a pure function of `t`. No Math.random, no wall clock.
 */

import React from "react";
import { clamp01, lerp, at, mixRgb, easeOut, easeOutQuint, easeInOut } from "../easing.js";
import { FONT } from "../theme.js";
import { capMetrics } from "../effects.jsx";
import { bladeShape, rot2, ringColour } from "./aperture-fold.jsx";
import { runWidth } from "./star-lockup.jsx";

const DEG = Math.PI / 180;
const rgba = (c, a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const rgbs = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
const eIn = (p, k = 2.4) => Math.pow(clamp01(p), k);
/** Symmetric S used for the lap. Monotone, which the bisection below needs. */
const smooth = (p) => { const q = clamp01(p); return q * q * (3 - 2 * q); };

/**
 * The shard roll, per shard. This is the ONE channel that must not be
 * front-loaded, and aperture-fold measured why: a shard at 90deg has zero
 * width, so however long the roll spends near 90deg is how long the piece is
 * legible as a turning edge rather than as a shape that appeared. On
 * easeOutQuint — the obvious pick, because it lands with exactly zero velocity
 * — the first 25fps frame after ignition is already 47% rolled and the shard
 * arrives two thirds of its final width; it reads as popping in beside the sun
 * instead of being drawn out of it. powOut in the 2.0-3.2 band is the same
 * answer aperture-fold reached, it still lands with zero velocity, and picking
 * by i % 3 keeps two adjacent shards off the same curve.
 */
const ROLL = [(p) => 1 - Math.pow(1 - p, 2.0),
              (p) => 1 - Math.pow(1 - p, 2.6),
              (p) => 1 - Math.pow(1 - p, 3.2)];

/**
 * Invert a monotone easing on [0,1]. 24 bisections is 6e-8 — far finer than
 * the 40ms frame the answer is used to place, and it costs nothing because
 * there are only `blades` of them per frame.
 */
function invert(f, y) {
  let lo = 0, hi = 1;
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < y) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function ApertureIgnite({
  t, from, to,
  // ── the mark ──
  blades = 6, size = 260, hole = 0.46, gap = 0.94, twistDeg = 14, rotDeg = -90,
  cx = 640, cy = 352, lockX = 640,
  colours = [[74, 108, 240], [124, 92, 200]],
  glassAlpha = 0.5, edgeAlpha = 0.9, edgeW = 1.7, bloom = 0.58,
  // ── the sun ──
  sun = [255, 252, 244], sunWarm = [255, 214, 150],
  sparkR = 1.8, peakR = 34, sunR = 17, coreR = 12,
  orbitWobble = 0.13, sunDepth = 0.24, trail = 0.62, tailDeg = 74, flare = 0.4,
  restGlow = 0.82,
  // ── copy ──
  text = "OpenDemo", boldFrom = 4, wordSize = 62, tracking = -0.016,
  weightLight = 300, weightBold = 640, font = null, word = [240, 238, 246],
  markGap = 0.3, lockSize = null,
  // ── timing (scene-relative ms) ──
  igniteAtMs = 0, igniteDurMs = 330, peakHoldMs = 70, condenseDurMs = 300,
  orbitAtMs = 400, orbitDurMs = 2620, leadDeg = 16, trailDeg = 60,
  shardDurMs = 340, shardHotMs = 420,
  fallAtMs = 3020, fallDurMs = 500,
  slideAtMs = 3380, slideDurMs = 720,
  wordAtMs = 3580, wordDurMs = 760, wordRise = 15,
  sunFadeAtMs = null, sunFadeDurMs = 780, sunFadeCore = 0.72, sunSoak = 0.18,
}) {
  if (t < from - 0.001 || t > to + 0.001) return null;
  const T = (ms) => from + ms / 1000;
  const n = Math.max(3, Math.round(blades));
  const R = size / 2;
  const holeR = R * clamp01(hole);
  const { rMid, pts } = bladeShape(R, holeR, n, gap, twistDeg);

  // ── the lap ───────────────────────────────────────────────────────────────
  // The sun enters `leadDeg` before the first shard's slot and leaves
  // `trailDeg` past the last one; with 6 slots 60deg apart and trailDeg 60 the
  // span is exactly 360 + leadDeg, so the sun finishes the lap back at the
  // shard it started on. The closure is the point — it is what makes the lap
  // read as one gesture rather than as a sweep that stopped.
  const spanDeg = leadDeg + (n - 1) * (360 / n) + trailDeg;
  const orbP = at(t, T(orbitAtMs), orbitDurMs / 1000);
  const orbE = smooth(orbP);
  const rot = rotDeg * DEG;
  const sunAng = rot - leadDeg * DEG + spanDeg * DEG * orbE;

  // Each shard's ignition, SOLVED from the same curve the sun rides.
  const shardAt = [];
  for (let i = 0; i < n; i++) {
    shardAt.push(orbitAtMs + orbitDurMs * invert(smooth, (leadDeg + i * (360 / n)) / spanDeg));
  }

  // ── the sun's own envelope ────────────────────────────────────────────────
  // One radius curve end to end: spark -> peak -> orbit radius -> core. It is
  // never re-created, so there is no frame where the light changes identity.
  const igP = at(t, T(igniteAtMs), igniteDurMs / 1000);
  const coP = at(t, T(igniteAtMs + igniteDurMs + peakHoldMs), condenseDurMs / 1000);
  const fallP = at(t, T(fallAtMs), fallDurMs / 1000);
  const swell = lerp(sparkR, peakR, smooth(igP));
  const orbitR = coP <= 0 ? swell : lerp(peakR, sunR, easeOut(coP));
  // Depth: one sine drives the orbit radius, the sun's own size and its
  // brightness together. Driving them separately is what makes a fake-3D orbit
  // look like a sticker sliding around a circle.
  const depth = Math.sin(2 * Math.PI * orbE + 0.4);
  const ringR = rMid * (1 + orbitWobble * depth) * (1 - fallP * fallP);
  const rNow = orbitR * (1 + sunDepth * depth) * lerp(1, coreR / Math.max(1e-3, sunR), easeOut(fallP));
  const born = clamp01(igP * 6);

  // ── the light's departure ─────────────────────────────────────────────────
  // The sun does not have to stay as the mark's core. With `sunFadeAtMs` set it
  // settles into the hollow, holds there, and then goes out, so the beat ends
  // on the glass aperture and the wordmark alone. Unset (the default) it stays,
  // and every expression below multiplies by exactly 1.
  //
  // It goes out from the INSIDE. Three radii already draw this light — core
  // disc, bloom, wide halo — and they are retired in that order across one
  // window, so the point dissolves outward into its own halo and the halo is
  // what settles away last. One curve for all three is the obvious version and
  // it reads as a dimmer being turned down; retiring them in order reads as the
  // light being absorbed by the thing it is sitting in, which is the note. Each
  // stage is the same smoothstep the lap rides, so the fade leaves and arrives
  // with zero velocity — there is no frame on which the hollow changes state.
  const fadeK = (frac) => (sunFadeAtMs == null ? 0
    : smooth(at(t, T(sunFadeAtMs), (sunFadeDurMs * frac) / 1000)));
  const cf = Math.min(1, Math.max(0.05, sunFadeCore));
  const kCore = 1 - fadeK(cf);
  const kBloom = 1 - fadeK((cf + 1) / 2);
  const kWide = 1 - fadeK(1);
  // What the glass KEEPS. The hollow going dark while the shards stay exactly
  // as they were is the "suddenly empty" failure: the wide halo has been
  // lighting the facets from the middle for two seconds, so removing it is a
  // change to the SHARDS as much as to the hollow, and the mark would end the
  // film dimmer than it played. Lifting the glass's own bloom — the blurred
  // copy of the shards under themselves, which is already *the light the sun
  // left in them* — by a fraction of what the halo takes away hands that light
  // over rather than dropping it, and it HOLDS after the fade instead of
  // decaying, because the point is that the glass now has it.
  const soak = sunSoak * fadeK(1);

  // ── lockup geometry ───────────────────────────────────────────────────────
  const ff = font ?? FONT;
  const chars = [...text];
  const lightTxt = chars.slice(0, Math.max(0, boldFrom)).join("");
  const boldTxt = chars.slice(Math.max(0, boldFrom)).join("");
  const wordW = (lightTxt ? runWidth(lightTxt, wordSize, weightLight, ff, tracking) : 0)
    + (boldTxt ? runWidth(boldTxt, wordSize, weightBold, ff, tracking) : 0);
  // The mark resolves at frame centre and only THEN makes room. Sliding first
  // would put the whole reveal off-centre for the sake of type that has not
  // arrived yet.
  // easeInOut, not the ease-OUT a lockup slide normally gets. An ease-out has
  // its maximum velocity at p=0, and this slide leaves a mark that has been
  // dead still for the best part of a second: measured, the group stepped 21px
  // on the slide's first frame out of frames that had been moving 0.3px. That
  // reads as a snap, not as a move. The S costs nothing here because there is
  // no incoming motion to match — the mark is stationary at both ends.
  const slideP = wordW > 0 ? easeInOut(at(t, T(slideAtMs), slideDurMs / 1000), 2.2) : 0;

  // THE REVEAL'S SIZE IS NOT THE LOCKUP'S SIZE. `size` is what the aperture is
  // built at — a mark that has the frame to itself for three seconds and has to
  // carry it. Measured off ink on OpenDemo's own ending, a 260px mark beside
  // 67px type stands 4.74x the wordmark's cap height and carries 2.5x its ink
  // mass, and type at that disadvantage reads as a caption rather than as the
  // other half of a lockup. `lockSize` is the diameter the mark settles AT, and
  // the group re-centres itself on lockX from the settled width.
  //
  // It rides slideP, which is the point: the same S that carries the mark left
  // carries it down, so the shrink is not a new beat but a property of a move
  // the film already has. Scheduling it separately would give the eye two
  // things happening to one object at two different times. Because slideP is 0
  // until slideAtMs, the whole ignition — the lap, every shard, the fall into
  // the hollow — is untouched at any lockSize, and null (the default) is 1
  // everywhere and multiplies out to exactly the geometry above.
  //
  // The SUN is deliberately not scaled by it. Its radius comes off its own
  // envelope, never off markScale, so the light keeps the size it has always
  // had while the glass around it closes in. That is the right way round: the
  // sun is going out across this same window, so what the eye follows is the
  // light leaving, not the light being shrunk.
  const lockScale = lockSize == null ? 1 : Math.max(0.05, lockSize / Math.max(1e-3, size));
  const lockK = lerp(1, lockScale, slideP);
  // markGap stays a fraction of the mark's LIVE diameter, so the gap the eye
  // sees closes with the mark instead of the type drifting away from it.
  const gapPx = size * markGap * lockK;
  const restMark = size * lockScale, restGap = size * markGap * lockScale;
  const totalW = restMark + (wordW > 0 ? restGap + wordW : 0);
  const restCx = lockX - totalW / 2 + restMark / 2;
  const MX = lerp(cx, restCx, slideP);
  const MY = cy;

  // ── whole-mark settle ─────────────────────────────────────────────────────
  // Rides the reveal rather than following it, for the reason aperture-fold
  // documents: a settle that starts when the last shard lands is continuous in
  // position but steps to a non-zero angular velocity on one frame.
  //
  // SCALE ONLY. aperture-fold also unscrews a rotation offset, and that cannot
  // be borrowed here: the sun's angle is computed from `rot`, so any rotation
  // riding on top of the shards puts them a couple of degrees off the light
  // that is supposed to be creating them. Scale is safe because the sun's own
  // orbit radius is multiplied by the same factor, so the light and the shard
  // it is opening stay locked together.
  const rem = 1 - easeOutQuint(at(t, from, (orbitAtMs + orbitDurMs) / 1000));
  const markRot = rot;
  // The settle and the lockup shrink are the same channel — one number reaches
  // the shards and the sun's orbit radius, so the light and the shard it is
  // opening can never come apart. They never overlap in time either: `rem` is
  // spent by the end of the lap and `lockK` does not leave 1 until the slide.
  const markScale = (1 + 0.045 * rem) * lockK;

  // ── project the shards ────────────────────────────────────────────────────
  const solved = [];
  for (let i = 0; i < n; i++) {
    const sp = at(t, T(shardAt[i]), shardDurMs / 1000);
    if (sp <= 0) continue;
    // Roll out of edge-on — see ROLL above for why this curve and not a quint.
    // It still lands with exactly zero velocity, so a shard that has arrived is
    // genuinely still while its neighbours are opening; on a decaying
    // exponential the settled ones keep creeping a fraction of a pixel and the
    // whole ring re-rasterises every frame.
    const roll = (1 - ROLL[i % 3](sp)) * 90 * DEG;
    const ang = markRot + (i / n) * 2 * Math.PI;
    const proj = [];
    for (const [px, py] of pts) {
      let X = px, Y = py, Z = 0;
      [Y, Z] = rot2(Y, Z, roll);
      X += rMid;
      [X, Y] = rot2(X, Y, ang);
      proj.push([MX + X * markScale, MY + Y * markScale]);
    }
    const base = ringColour(colours, i / n);
    // The ignition heat is a separate, longer decay than the roll: the shard
    // finishes opening while it is still cooling, so the moment it locks is
    // not also the moment it changes colour.
    const heat = 1 - eIn(at(t, T(shardAt[i]), shardHotMs / 1000), 1.7);
    solved.push({
      i,
      d: proj.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(" "),
      fill: mixRgb(base, sun, 0.42 * heat),
      heat,
      // A shard that is still nearly edge-on is a sliver a pixel or two wide;
      // stroking it at full width welds the sliver shut into a bright needle.
      open: clamp01(sp / 0.22),
    });
  }

  // ── the light ─────────────────────────────────────────────────────────────
  // FLARE: the sun pulses as it spends itself on each shard. Six bumps, one per
  // ignition, so the lap has a rhythm instead of being a bead sliding round at
  // constant brightness — and the pulse is what makes the shard read as having
  // been PAID FOR out of the light rather than merely revealed near it. Summed
  // rather than maxed so two ignitions close together brighten more than one,
  // which is what the eased cadence produces in the middle of the lap.
  let pulse = 0;
  if (flare > 0) {
    for (let i = 0; i < n; i++) {
      const u = ((t - T(shardAt[i])) * 1000) / (shardHotMs * 0.42);
      if (u > -3 && u < 3) pulse += Math.exp(-u * u);
    }
  }
  const flareK = 1 + flare * Math.min(1.4, pulse);

  const orbR = ringR * markScale;
  const sx = MX + Math.cos(sunAng) * orbR;
  const sy = MY + Math.sin(sunAng) * orbR;
  const energy = lerp(1, restGlow, easeOut(fallP)) * born;
  const bloomA = (0.9 * energy * kBloom).toFixed(3);
  const wideA = (0.4 * energy * kWide).toFixed(3);
  const disc = (r, a, css) => (
    <div style={{
      position: "absolute",
      left: `${(sx - r).toFixed(1)}px`, top: `${(sy - r).toFixed(1)}px`,
      width: `${(r * 2).toFixed(1)}px`, height: `${(r * 2).toFixed(1)}px`,
      borderRadius: "50%", opacity: a, background: css,
    }} />
  );

  // The trail is the arc the sun has ALREADY covered. Without it the sun has no
  // history and the lap reads as six unrelated flashes; with it the eye is
  // carried round the ring and the shards read as being left behind.
  //
  // Drawn as SEGMENTS, not as one dash with a gradient stroke. An SVG gradient
  // resolves in the element's bounding box — for a circle that is a straight
  // left-to-right ramp across the whole disc, so the fade runs across the
  // frame instead of along the arc, and at the tail's own angle it can be at
  // full strength while the head is transparent. Five constant-alpha segments
  // give the falloff the gradient cannot, and the head segment sits exactly
  // under the sun so there is no seam.
  //
  // The radius is the sun's LIVE orbit radius, not the resting one: the orbit
  // breathes by orbitWobble and then spirals in, and a fixed-radius trail
  // detaches from the sun by up to 13% of the ring exactly when the eye is on
  // it. Only the head is guaranteed to match, which is where it matters.
  //
  // It is drawn OVER the glass (see the render below), and short. Under the
  // glass it is invisible by construction: the arc the sun has already covered
  // is precisely the arc that now has shards standing on it, and the trail sat
  // at the shards' mid-radius. Over the glass and kept to a stub it stops
  // being a drawn orbit line and becomes the sun's own wake.
  const trailEls = [];
  if (trail > 0 && orbE > 0 && orbE < 1) {
    const circ = 2 * Math.PI * orbR;
    const headDeg = spanDeg * orbE;
    const arcDeg = Math.min(tailDeg, headDeg);
    const SEG = 5;
    const a = (trail * energy * (1 - fallP)).toFixed(3);
    for (let k = 0; k < SEG; k++) {
      const d1 = headDeg - (arcDeg * k) / SEG;
      const d0 = headDeg - (arcDeg * (k + 1)) / SEG;
      const len = (circ * (d1 - d0)) / 360;
      const off = (circ * d0) / 360;
      trailEls.push(
        <circle key={`tr${k}`} cx={MX} cy={MY} r={orbR.toFixed(2)} fill="none"
          stroke={rgba(mixRgb(sun, sunWarm, 0.3 + 0.14 * k), (0.9 * Math.pow(1 - k / SEG, 1.7)).toFixed(3))}
          strokeWidth={(3.6 * (1 - (0.55 * k) / SEG)).toFixed(2)} strokeLinecap="round"
          transform={`rotate(${(rotDeg - leadDeg).toFixed(3)} ${MX.toFixed(2)} ${MY.toFixed(2)})`}
          strokeDasharray={`${len.toFixed(2)} ${(circ + 1).toFixed(2)}`}
          strokeDashoffset={`${(-off).toFixed(2)}`}
          opacity={a} style={{ filter: "blur(2.6px)" }} />
      );
    }
  }

  const glassEls = solved.map((b) => (
    <polygon key={b.i} points={b.d} fill={rgba(b.fill, glassAlpha + 0.38 * b.heat)} />
  ));

  // ── wordmark ──────────────────────────────────────────────────────────────
  let wordEl = null;
  if (wordW > 0) {
    // ONE curve for opacity and rise. Running memReveal on top of an eased
    // progress double front-loads it: memReveal(easeOut(1/19)) is 0.48, so the
    // wordmark landed at half opacity on its very first frame — a flash rather
    // than a fade, and the largest single-frame ink jump in the whole beat.
    // memReveal is a fast attack meant for RAW progress.
    const wP = easeOut(at(t, T(wordAtMs), wordDurMs / 1000));
    if (wP > 0.004) {
      // A line box centres on ascent/descent, not on the cap, so type aligned
      // to the mark's centre sits low by capMetrics.dy.
      const { dy } = capMetrics(wordSize);
      wordEl = (
        <div style={{
          position: "absolute",
          left: `${(MX + (size / 2) * lockK + gapPx).toFixed(1)}px`,
          top: `${(MY - wordSize * 0.5).toFixed(1)}px`,
          transform: `translateY(${(dy + wordRise * (1 - wP)).toFixed(2)}px)`,
          opacity: wP.toFixed(3),
          fontFamily: ff, fontSize: `${wordSize}px`, lineHeight: 1,
          letterSpacing: `${tracking}em`, whiteSpace: "pre", color: rgbs(word),
        }}>
          <span style={{ fontWeight: weightLight }}>{lightTxt}</span>
          <span style={{ fontWeight: weightBold }}>{boldTxt}</span>
        </div>
      );
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* bloom UNDER the glass — see the header note on layering. Only the
          BLOOM takes the flare: pumping the core disc as well makes the sun
          itself change size six times, which reads as the light stuttering
          rather than as it discharging. */}
      {disc(rNow * 5.4 * flareK, wideA,
        `radial-gradient(circle, ${rgba(sun, 0.26)} 0%, ${rgba(sunWarm, 0.11)} 28%, ${rgba(sunWarm, 0)} 64%)`)}
      {disc(rNow * 2.5 * flareK, bloomA,
        `radial-gradient(circle, ${rgba(sun, 0.95)} 0%, ${rgba(sun, 0.5)} 22%, ${rgba(sunWarm, 0.15)} 46%, ${rgba(sunWarm, 0)} 76%)`)}

      <svg width="1280" height="720" viewBox="0 0 1280 720"
        style={{ position: "absolute", left: 0, top: 0 }}>
        {/* The glass's own bloom: the shards again, blurred, under themselves.
            On black this is what stops the facets reading as flat vector fill —
            it is the light the sun left in them. */}
        {bloom > 0 && solved.length > 0 && (
          <g style={{ filter: `blur(${(size * 0.055 * lockK).toFixed(1)}px)` }}
            opacity={Math.min(1, bloom * (1 + soak)).toFixed(3)}>
            {glassEls}
          </g>
        )}
        {glassEls}
        {solved.map((b) => (
          <polygon key={`e${b.i}`} points={b.d} fill="none"
            stroke={rgba(mixRgb(b.fill, sun, 0.55 + 0.45 * b.heat), (edgeAlpha * b.open).toFixed(3))}
            strokeWidth={(edgeW * (1 + 1.6 * b.heat)).toFixed(2)}
            strokeLinejoin="round" />
        ))}
        {/* the wake, OVER the glass */}
        {trailEls}
      </svg>

      {/* the sun's core, OVER the glass */}
      {disc(rNow, (energy * kCore).toFixed(3), rgbs(sun))}
      {wordEl}
    </div>
  );
}
