#!/usr/bin/env node
/**
 * effect-classifier.mjs
 * OpenDemo — L3: measured motion → named effects with concrete parameters.
 *
 * Consumes glyph-motion.json (L1/L2 measurements) and decides which effect
 * from a fixed vocabulary reproduces each observed animation, carrying the
 * MEASURED numbers through: real displacement in px, real colour endpoints,
 * real easing family and coefficients, real stagger in ms.
 *
 * This is the step that makes the whole approach different from asking a model
 * to "animate the text like the reference". The model never picks the effect;
 * the measurement does, and the parameters are transcribed, not invented.
 *
 * Output (effects.json) is the contract the renderer consumes.
 *
 * Usage:
 *   node scripts/effect-classifier.mjs glyph-motion.json --out effects.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { makeEasing } from "./glyph-motion.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Confidence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A channel is trustworthy in proportion to how well the curve fit it and how
 * many points it was fitted over. Everything downstream gates on this, so a
 * noisy channel degrades to "no opinion" rather than to a confident wrong one.
 */
function confidenceOf(ch) {
  if (!ch?.fit) return 0;
  const fitQuality = Math.max(0, Math.min(1, (0.25 - ch.fit.best.rmse) / 0.25));
  const sampleWeight = Math.min(1, ch.nSamples / 10);
  return Math.round(fitQuality * sampleWeight * 100) / 100;
}

const MIN_CONF = 0.4;

function pick(el, key, minRange = 0) {
  const ch = el.channels[key];
  if (!ch) return null;
  const conf = confidenceOf(ch);
  if (conf < MIN_CONF) return null;
  if (Math.abs(ch.range) < minRange) return null;
  return { ...ch, confidence: conf };
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect vocabulary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deliberately small. Each entry is something a renderer can implement exactly,
 * and each is distinguishable from the others by the measurements alone — a
 * vocabulary with two effects that produce identical measurements would make
 * the classification arbitrary.
 */
export const EFFECTS = {
  "cut-in": "appears in a single frame, no transition",
  "fade": "opacity only",
  "slide": "translation only, already opaque",
  "slide-fade": "translation plus opacity",
  "blur-in": "defocus resolving to sharp, with opacity",
  "scale-fade": "scale plus opacity",
  "recolour": "colour travels, opacity static",
  "colour-resolve": "colour travels while opacity rises",
  "unclassified": "no channel passed confidence",
};

function classifyElement(el) {
  const ink = pick(el, "alpha", 0.25);
  const dx = pick(el, "dx", 3);
  const dy = pick(el, "dy", 3);
  const colour = pick(el, "colour", 0.2);

  // Geometry channels bottom out at zero when the glyph is simply ABSENT, not
  // when it is genuinely scaled to nothing or infinitely defocused. Passing
  // those degenerate values through produced a shot rendered as scattered
  // blocks: scale starting at 0 and blur at maximum. A start value that low
  // means the channel measured absence, so it carries no geometry.
  const geomFloor = 0.08;
  const usable = (ch) => (ch && ch.startValue > geomFloor && ch.startValue < 4 ? ch : null);
  const sharp = usable(pick(el, "sharp", 0.25));
  const spread = usable(pick(el, "spread", 0.15));

  const move = (dx?.confidence ?? 0) >= (dy?.confidence ?? 0) ? dx : dy;
  const moveAxis = move === dx ? "x" : "y";

  let effect = "unclassified";
  let driver = null;

  if (move && ink) { effect = "slide-fade"; driver = ink; }
  else if (move) { effect = "slide"; driver = move; }
  else if (sharp && ink) { effect = "blur-in"; driver = sharp; }
  else if (spread && ink) { effect = "scale-fade"; driver = spread; }
  else if (colour && ink) { effect = "colour-resolve"; driver = colour; }
  else if (colour) { effect = "recolour"; driver = colour; }
  else if (ink) { effect = ink.fit.best.family === "step" ? "cut-in" : "fade"; driver = ink; }

  // Each channel carries its own duration and onset. Collapsing them onto a
  // single per-event duration is what made the renderer's output measure ~400ms
  // short on every shot: a colour that resolves over 900ms and an opacity that
  // lands in 250ms are two different envelopes, not one.
  const params = {};
  const t = (ch) => ({ durationMs: Math.round(ch.durationMs), onsetFrame: ch.onsetFrame });
  if (ink) params.opacity = { from: round3(ink.startValue), to: round3(ink.settleValue), ...t(ink), easing: easingOf(ink), confidence: ink.confidence };
  if (move) params.translate = { axis: moveAxis, fromPx: round3(-move.range), ...t(move), easing: easingOf(move), confidence: move.confidence };
  if (sharp) params.focus = { fromRelSharpness: round3(sharp.startValue), ...t(sharp), easing: easingOf(sharp), confidence: sharp.confidence };
  if (spread) params.scale = { fromRel: round3(spread.startValue), ...t(spread), easing: easingOf(spread), confidence: spread.confidence };
  if (colour) params.colour = { from: colour.fromRgb, to: colour.toRgb, distance: colour.distance, ...t(colour), easing: easingOf(colour), confidence: colour.confidence };

  return {
    effect,
    box: el.box,
    onsetFrame: el.onsetFrame,
    durationMs: driver ? Math.round(driver.durationMs) : null,
    overshoot: driver ? driver.overshoot : null,
    confidence: driver ? driver.confidence : 0,
    params,
  };
}

function easingOf(ch) {
  return {
    family: ch.fit.best.family,
    params: ch.fit.best.params,
    rmse: ch.fit.best.rmse,
    gainVsNaive: ch.fit.gainVsNaive,
  };
}

const round3 = (v) => Math.round(v * 1000) / 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Aggregation to an event-level effect spec
// ─────────────────────────────────────────────────────────────────────────────

function medianOf(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[s.length >> 1];
}

function modeOf(arr) {
  const c = {};
  for (const v of arr) c[v] = (c[v] || 0) + 1;
  let best = null, n = -1;
  for (const [k, v] of Object.entries(c)) if (v > n) { n = v; best = k; }
  return { value: best, count: n, total: arr.length };
}

/**
 * Collapses per-glyph classifications into one effect for the event. Elements
 * that failed classification are excluded from the vote but still counted, so
 * a low agreement ratio is visible rather than hidden.
 */
function aggregate(ev) {
  const els = ev.elements.map(classifyElement);
  const classified = els.filter((e) => e.effect !== "unclassified" && e.confidence >= MIN_CONF);
  if (!classified.length) return null;

  const vote = modeOf(classified.map((e) => e.effect));
  const winners = classified.filter((e) => e.effect === vote.value);

  // The vote decides the effect NAME, but parameters are aggregated over every
  // element that measured the channel confidently — including elements whose
  // own label differs. Restricting parameters to vote winners silently drops
  // the glyphs at the extremes of a spatial colour ramp, which are exactly the
  // ones that define it.
  const contributors = els.filter((e) => Object.keys(e.params).length > 0);
  const params = {};
  const keys = new Set(contributors.flatMap((e) => Object.keys(e.params)));
  for (const key of keys) {
    const entries = contributors.map((e) => e.params[key]).filter(Boolean);
    if (entries.length < Math.max(1, Math.floor(contributors.length * 0.35))) continue;
    const famVote = modeOf(entries.map((p) => p.easing.family));
    const sameFam = entries.filter((p) => p.easing.family === famVote.value);
    const nParams = sameFam[0].easing.params.length;
    const medParams = [];
    for (let i = 0; i < nParams; i++) medParams.push(round3(medianOf(sameFam.map((p) => p.easing.params[i]))));

    const agg = {
      easing: {
        family: famVote.value,
        params: medParams,
        agreement: round3(famVote.count / famVote.total),
        medianRmse: round3(medianOf(sameFam.map((p) => p.easing.rmse))),
        medianGainVsNaive: round3(medianOf(sameFam.map((p) => p.easing.gainVsNaive))),
      },
      confidence: round3(medianOf(entries.map((p) => p.confidence))),
      durationMs: Math.round(medianOf(entries.map((p) => p.durationMs).filter((v) => v != null)) ?? 0) || undefined,
      onsetFrame: medianOf(entries.map((p) => p.onsetFrame).filter((v) => v != null)) ?? undefined,
    };
    if (key === "opacity") { agg.from = round3(medianOf(entries.map((p) => p.from))); agg.to = round3(medianOf(entries.map((p) => p.to))); }
    if (key === "translate") { agg.axis = modeOf(entries.map((p) => p.axis)).value; agg.fromPx = round3(medianOf(entries.map((p) => p.fromPx))); }
    if (key === "scale") agg.fromRel = round3(medianOf(entries.map((p) => p.fromRel)));
    if (key === "focus") agg.fromRelSharpness = round3(medianOf(entries.map((p) => p.fromRelSharpness)));
    if (key === "colour") {
      // Colour endpoints are per-glyph by nature (mem ramps them across the
      // word), so keep the per-element list alongside the aggregate.
      agg.perElement = contributors.filter((e) => e.params.colour)
        .sort((a, b) => a.box.x - b.box.x)
        .map((e) => ({ x: e.box.x, from: e.params.colour.from, to: e.params.colour.to }));
      agg.medianDistance = Math.round(medianOf(entries.map((p) => p.distance)));
      agg.spatialRamp = detectSpatialRamp(agg.perElement);
    }
    params[key] = agg;
  }

  return {
    tMs: Math.round(ev.burst.startMs),
    durationMs: Math.round(medianOf(winners.map((e) => e.durationMs).filter(Boolean)) ?? ev.burst.endMs - ev.burst.startMs),
    burstFrames: ev.burst.frames,
    burstKind: ev.burst.kind,
    effect: vote.value,
    agreement: round3(vote.count / vote.total),
    elementsTotal: ev.elements.length,
    elementsClassified: classified.length,
    confidence: round3(medianOf(winners.map((e) => e.confidence))),
    overshoot: round3(medianOf(winners.map((e) => e.overshoot).filter((v) => v != null)) ?? 0),
    stagger: ev.stagger,
    params,
    layout: ev.layout,
    bg: ev.bg,
  };
}

/**
 * Is the settled colour a spatial ramp across the line (a gradient baked into
 * the text) rather than one flat colour? mem does this constantly and it is a
 * large part of why its typography reads as designed.
 */
function detectSpatialRamp(perElement) {
  if (!perElement || perElement.length < 4) return null;
  const sorted = [...perElement].sort((a, b) => a.x - b.x);
  const first = sorted[0].to, last = sorted[sorted.length - 1].to;
  const span = Math.hypot(last[0] - first[0], last[1] - first[1], last[2] - first[2]);
  if (span < 40) return null;
  // Monotonic along the dominant component?
  const comp = [0, 1, 2].reduce((bi, i) => (Math.abs(last[i] - first[i]) > Math.abs(last[bi] - first[bi]) ? i : bi), 0);
  const vals = sorted.map((e) => e.to[comp]);
  let mono = 0;
  for (let i = 1; i < vals.length; i++) if (Math.sign(vals[i] - vals[i - 1]) === Math.sign(last[comp] - first[comp])) mono++;
  return {
    fromRgb: first, toRgb: last, span: Math.round(span),
    monotonicity: round3(mono / (vals.length - 1)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pacing vocabulary — the macro half
// ─────────────────────────────────────────────────────────────────────────────

const SHAPE_TS = [0.15, 0.35, 0.5, 0.65, 0.85];

/** Samples a fitted easing at fixed points — a label-free descriptor of shape. */
function shapeVector(family, params) {
  const fn = makeEasing(family, params);
  return SHAPE_TS.map((t) => fn(t));
}

function shapeDistance(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s / a.length);
}

/**
 * Spread = mean pairwise distance between curve shapes. A video whose every
 * animation rides one easing scores ~0 no matter how many family labels the
 * fitter assigned. naiveShare = fraction of curves indistinguishable from CSS
 * ease-in-out, the default a guess falls back to.
 */
function easingShapeStats(shapes) {
  if (shapes.length < 2) return { spread: 0, naiveShare: 0 };
  const naive = shapeVector("cubic-bezier", [0.42, 0, 0.58, 1]);
  const naiveShare = shapes.filter((s) => shapeDistance(s, naive) < 0.06).length / shapes.length;

  // Sample pairs rather than all O(n²) when the set is large.
  const maxPairs = 20000;
  let sum = 0, n = 0;
  const stride = Math.max(1, Math.floor(Math.sqrt((shapes.length * shapes.length) / maxPairs)));
  for (let i = 0; i < shapes.length; i += stride) {
    for (let j = i + 1; j < shapes.length; j += stride) { sum += shapeDistance(shapes[i], shapes[j]); n++; }
  }
  return { spread: round3(n ? sum / n : 0), naiveShare: round3(naiveShare) };
}

/**
 * Summarises how VARIED the motion is. The reddit-diagnosed "AI look" is
 * uniformity: one easing family, one edit width, constant motion. These three
 * numbers make that measurable instead of a matter of taste.
 */
export function pacingVocabulary(report, specs) {
  const fams = {};
  const shapes = [];
  for (const ev of report.events) {
    for (const el of ev.elements) {
      for (const ch of Object.values(el.channels)) {
        if (confidenceOf(ch) < MIN_CONF) continue;
        fams[ch.fit.best.family] = (fams[ch.fit.best.family] || 0) + 1;
        shapes.push(shapeVector(ch.fit.best.family, ch.fit.best.params));
      }
    }
  }
  const total = Object.values(fams).reduce((a, b) => a + b, 0) || 1;
  const shares = Object.values(fams).map((v) => v / total);
  // Normalised Shannon entropy over easing families: 1 = maximally varied.
  const entropy = -shares.reduce((a, p) => a + (p > 0 ? p * Math.log(p) : 0), 0);
  const maxEnt = Math.log(Math.max(2, Object.keys(fams).length));

  const effectCounts = {};
  for (const s of specs) effectCounts[s.effect] = (effectCounts[s.effect] || 0) + 1;

  const shapeStats = easingShapeStats(shapes);

  return {
    easingFamilies: fams,
    easingVariety: round3(entropy / maxEnt),
    dominantEasingShare: round3(Math.max(...shares, 0)),
    // Family labels undercount variety (two very different cubic-beziers share
    // a label), so shape spread is the metric that actually answers "is every
    // animation in this video riding the same curve?"
    easingShapeSpread: shapeStats.spread,
    naiveEasingShare: shapeStats.naiveShare,
    effectCounts,
    moveHoldRatio: report.pacing.moveHoldRatio,
    burstKinds: report.pacing.burstKinds,
    burstWidthFrames: report.pacing.burstWidthFrames,
    holdMs: report.pacing.holdMs,
    // Fraction of edits that are instantaneous or near-instantaneous. Generated
    // sequences trend to zero here; hand-cut ones do not.
    sharpEditShare: round3(
      ((report.pacing.burstKinds.cut || 0) + (report.pacing.burstKinds.snap || 0)) /
        Math.max(1, report.pacing.burstCount)
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export function classify(report) {
  const specs = [];
  for (const ev of report.events) {
    if (ev.contentClass !== "text" || !ev.elements.length) continue;
    const spec = aggregate(ev);
    if (spec) specs.push(spec);
  }
  specs.sort((a, b) => a.tMs - b.tMs);
  return {
    _meta: { kind: "opendemo-effect-spec", source: report._meta.source, fps: report._meta.fps, size: report._meta.size },
    vocabulary: EFFECTS,
    pacing: pacingVocabulary(report, specs),
    effects: specs,
  };
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log("Usage: node scripts/effect-classifier.mjs <glyph-motion.json> [--out effects.json]");
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(resolve(args[0]), "utf8"));
  let out = "effects.json";
  for (let i = 1; i < args.length; i++) if (args[i] === "--out") out = args[++i];

  const result = classify(report);
  writeFileSync(resolve(out), JSON.stringify(result, null, 2), "utf8");

  const log = (m) => process.stdout.write(`${m}\n`);
  log("═".repeat(64));
  log("🎯 OpenDemo — effect classification (L3)");
  log("═".repeat(64));
  log(`${result.effects.length} classified effect(s) from ${report.events.length} event(s)\n`);
  log("   t(s)   dur  frames kind          effect          agree conf  stagger");
  log("   " + "─".repeat(74));
  for (const s of result.effects) {
    const st = s.stagger && s.stagger.order !== "simultaneous"
      ? `${s.stagger.order} ${s.stagger.medianMs}ms` : (s.stagger ? "simultaneous" : "-");
    log(`   ${(s.tMs / 1000).toFixed(2).padStart(5)} ${String(s.durationMs).padStart(5)}ms ${String(s.burstFrames).padStart(3)}f ` +
        `${s.burstKind.padEnd(14)} ${s.effect.padEnd(15)} ${String(s.agreement).padStart(4)} ${String(s.confidence).padStart(4)}  ${st}`);
  }
  const p = result.pacing;
  log("\n" + "─".repeat(64));
  log(`easing variety   ${p.easingVariety}  (1.0 = maximally varied; dominant family ${(p.dominantEasingShare * 100).toFixed(0)}%)`);
  log(`easing shape     spread ${p.easingShapeSpread}  ·  ${(p.naiveEasingShare * 100).toFixed(0)}% of curves match plain ease-in-out`);
  log(`sharp-edit share ${p.sharpEditShare}  (cuts+snaps / all edits)`);
  log(`move/hold ratio  ${p.moveHoldRatio}  (fraction of the video in motion)`);
  log(`edit widths      median ${p.burstWidthFrames.median}f, mad ${p.burstWidthFrames.mad}f, range ${p.burstWidthFrames.min}-${p.burstWidthFrames.max}f`);
  log(`easing families  ${JSON.stringify(p.easingFamilies)}`);
  log(`effects          ${JSON.stringify(p.effectCounts)}`);
  log(`\n💾 ${resolve(out)}`);
}

if (process.argv[1]?.endsWith("effect-classifier.mjs")) main();
