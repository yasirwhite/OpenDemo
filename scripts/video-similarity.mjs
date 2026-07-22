#!/usr/bin/env node
/**
 * video-similarity.mjs
 * Local (no API key) similarity scoring between two demo videos.
 *
 * Compares a reference demo video against a generated one across six
 * dimensions, each scored 0–1:
 *
 *   color      — palette / overall look (global + timeline RGB histograms)
 *   motion     — animation dynamics (motion-energy profile shape + level)
 *   cuts       — hard-cut count and normalized timing (matched F1)
 *   structure  — layout similarity (dHash on time-aligned frames)
 *   pacing     — duration ratio + activity/idle rhythm
 *   events     — effect-event mix (scrolls, pans, animations/zooms, micro-activity)
 *
 * Exports:
 *   compareVideos(refPath, genPath, opts)       → Report
 *   compareSignatures(refSig, genSig, opts)     → Report
 *   DEFAULT_WEIGHTS
 */

import { extractSignature, hammingDistance64 } from "./video-signature.mjs";

export const DEFAULT_WEIGHTS = {
  color: 0.18,
  motion: 0.20,
  cuts: 0.12,
  structure: 0.08,
  pacing: 0.08,
  events: 0.16,
  density: 0.18,
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function compareVideos(refPath, genPath, opts = {}) {
  const sigOpts = { sampleFps: opts.sampleFps ?? 8 };
  const [refSig, genSig] = await Promise.all([
    extractSignature(refPath, sigOpts),
    extractSignature(genPath, sigOpts),
  ]);
  return compareSignatures(refSig, genSig, opts);
}

export function compareSignatures(ref, gen, opts = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...(opts.weights || {}) };

  const dimensions = {
    color: scoreColor(ref, gen),
    motion: scoreMotion(ref, gen),
    cuts: scoreCuts(ref, gen),
    structure: scoreStructure(ref, gen),
    pacing: scorePacing(ref, gen),
    events: scoreEvents(ref, gen),
    density: scoreDensity(ref, gen),
  };

  let overall = 0;
  let wSum = 0;
  for (const [k, w] of Object.entries(weights)) {
    if (dimensions[k]) {
      overall += dimensions[k].score * w;
      wSum += w;
    }
  }
  overall = wSum > 0 ? overall / wSum : 0;

  return {
    overall: round3(overall),
    weights,
    dimensions,
    reference: describeSig(ref),
    generated: describeSig(gen),
    segments: perSegmentReport(ref, gen, dimensions),
    notes: buildNotes(dimensions, ref, gen),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension: density (whitespace / content-density profile)
// ─────────────────────────────────────────────────────────────────────────────

function densityProfile(sig, bins) {
  const out = new Float64Array(bins);
  const cnt = new Float64Array(bins);
  const n = sig.frames.length;
  for (let i = 0; i < n; i++) {
    const b = Math.min(bins - 1, Math.floor((i * bins) / n));
    out[b] += sig.frames[i].bgShare ?? 0.5;
    cnt[b]++;
  }
  for (let b = 0; b < bins; b++) out[b] = cnt[b] ? out[b] / cnt[b] : 0.5;
  return out;
}

function scoreDensity(ref, gen) {
  const BINS = 32;
  const a = densityProfile(ref, BINS);
  const b = densityProfile(gen, BINS);
  let diff = 0;
  for (let i = 0; i < BINS; i++) diff += Math.abs(a[i] - b[i]);
  diff /= BINS;
  const score = Math.max(0, 1 - diff * 2.5); // 0.4 mean gap → 0
  const meanA = a.reduce((s, v) => s + v, 0) / BINS;
  const meanB = b.reduce((s, v) => s + v, 0) / BINS;
  return {
    score: round3(score),
    detail: { refMeanBgShare: round3(meanA), genMeanBgShare: round3(meanB), meanProfileGap: round3(diff) },
    explain: `Whitespace/content density: reference frames are ${pct(meanA)} background on average, generated ${pct(meanB)} (timeline gap ${pct(diff)}). Dense clutter vs clean slides shows up here.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-segment report: 8 equal time windows, scored on the local signals.
// Lets an iterating assistant find and fix the WORST part of the video.
// ─────────────────────────────────────────────────────────────────────────────

function perSegmentReport(ref, gen) {
  const SEGS = 8;
  const report = [];
  for (let s = 0; s < SEGS; s++) {
    const rr = [Math.floor((s * ref.frames.length) / SEGS), Math.floor(((s + 1) * ref.frames.length) / SEGS)];
    const gr = [Math.floor((s * gen.frames.length) / SEGS), Math.floor(((s + 1) * gen.frames.length) / SEGS)];

    // color
    const colorSim = histIntersection(avgHist(ref.frames, rr[0], rr[1]), avgHist(gen.frames, gr[0], gr[1]));
    // density
    const dRef = mean(ref.frames.slice(rr[0], rr[1]).map((f) => f.bgShare ?? 0.5));
    const dGen = mean(gen.frames.slice(gr[0], gr[1]).map((f) => f.bgShare ?? 0.5));
    const densitySim = Math.max(0, 1 - Math.abs(dRef - dGen) * 2.5);
    // motion level
    const eRef = mean(ref.diffs.slice(Math.max(0, rr[0] - 1), rr[1]).map((d) => d.energy));
    const eGen = mean(gen.diffs.slice(Math.max(0, gr[0] - 1), gr[1]).map((d) => d.energy));
    const motionSim = eRef === 0 && eGen === 0 ? 1 : Math.min(eRef, eGen) / (Math.max(eRef, eGen) || 1);

    const startMs = Math.round((s / SEGS) * ref.durationMs);
    const endMs = Math.round(((s + 1) / SEGS) * ref.durationMs);
    report.push({
      window: `${(startMs / 1000).toFixed(1)}-${(endMs / 1000).toFixed(1)}s`,
      score: round3(0.4 * colorSim + 0.35 * densitySim + 0.25 * motionSim),
      color: round3(colorSim),
      density: round3(densitySim),
      motion: round3(motionSim),
    });
  }
  return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension: color / looks
// ─────────────────────────────────────────────────────────────────────────────

function histIntersection(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.min(a[i], b[i]);
  return s; // both L1-normalized → 0..1
}

function avgHist(frames, from, to) {
  const acc = new Float64Array(64);
  let n = 0;
  for (let i = from; i < to && i < frames.length; i++) {
    for (let k = 0; k < 64; k++) acc[k] += frames[i].hist[k];
    n++;
  }
  if (n > 0) for (let k = 0; k < 64; k++) acc[k] /= n;
  return acc;
}

function scoreColor(ref, gen) {
  const global = histIntersection(
    avgHist(ref.frames, 0, ref.frames.length),
    avgHist(gen.frames, 0, gen.frames.length)
  );

  // Timeline: 8 normalized-time chunks
  const CHUNKS = 8;
  let timeline = 0;
  for (let c = 0; c < CHUNKS; c++) {
    const rA = chunkRange(ref.frames.length, c, CHUNKS);
    const rB = chunkRange(gen.frames.length, c, CHUNKS);
    timeline += histIntersection(
      avgHist(ref.frames, rA[0], rA[1]),
      avgHist(gen.frames, rB[0], rB[1])
    );
  }
  timeline /= CHUNKS;

  const score = 0.5 * global + 0.5 * timeline;
  return {
    score: round3(score),
    detail: {
      globalPalette: round3(global),
      timelinePalette: round3(timeline),
    },
    explain: `Global palette overlap ${pct(global)}, timeline palette overlap ${pct(timeline)}.`,
  };
}

function chunkRange(n, c, chunks) {
  const start = Math.floor((c * n) / chunks);
  return [start, Math.max(Math.floor(((c + 1) * n) / chunks), start + 1)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension: motion / animation dynamics
// ─────────────────────────────────────────────────────────────────────────────

function resampleProfile(diffs, bins) {
  const out = new Float64Array(bins);
  const cnt = new Float64Array(bins);
  const n = diffs.length;
  for (let i = 0; i < n; i++) {
    const b = Math.min(bins - 1, Math.floor((i * bins) / n));
    out[b] += diffs[i].energy;
    cnt[b]++;
  }
  for (let b = 0; b < bins; b++) out[b] = cnt[b] ? out[b] / cnt[b] : 0;
  return out;
}

function scoreMotion(ref, gen) {
  const BINS = 96;
  const a = resampleProfile(ref.diffs, BINS);
  const b = resampleProfile(gen.diffs, BINS);

  // Shape: total-variation similarity of sum-normalized profiles
  const sumA = a.reduce((s, v) => s + v, 0);
  const sumB = b.reduce((s, v) => s + v, 0);
  let shape;
  if (sumA === 0 && sumB === 0) {
    shape = 1; // both completely static
  } else if (sumA === 0 || sumB === 0) {
    shape = 0;
  } else {
    let l1 = 0;
    for (let i = 0; i < BINS; i++) l1 += Math.abs(a[i] / sumA - b[i] / sumB);
    shape = 1 - 0.5 * l1;
  }

  // Level: overall amount of motion
  const meanA = sumA / BINS;
  const meanB = sumB / BINS;
  const level = meanA === 0 && meanB === 0 ? 1 : Math.min(meanA, meanB) / Math.max(meanA, meanB);

  const score = 0.6 * shape + 0.4 * level;
  return {
    score: round3(score),
    detail: {
      profileShape: round3(shape),
      energyLevel: round3(level),
      refMeanEnergy: round4(meanA),
      genMeanEnergy: round4(meanB),
    },
    explain: `Motion-profile shape match ${pct(shape)}; motion amount ratio ${pct(level)}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension: cuts
// ─────────────────────────────────────────────────────────────────────────────

function scoreCuts(ref, gen) {
  const a = ref.cuts.map((t) => t / ref.durationMs);
  const b = gen.cuts.map((t) => t / gen.durationMs);

  if (a.length === 0 && b.length === 0) {
    return {
      score: 1,
      detail: { refCuts: 0, genCuts: 0, matched: 0 },
      explain: "Neither video contains hard cuts.",
    };
  }

  // Greedy matching within 7.5% of normalized duration
  const TOL = 0.075;
  const used = new Set();
  let matched = 0;
  for (const t of a) {
    let bestJ = -1;
    let bestD = TOL;
    for (let j = 0; j < b.length; j++) {
      if (used.has(j)) continue;
      const d = Math.abs(b[j] - t);
      if (d <= bestD) { bestD = d; bestJ = j; }
    }
    if (bestJ >= 0) { used.add(bestJ); matched++; }
  }

  const precision = b.length ? matched / b.length : 0;
  const recall = a.length ? matched / a.length : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    score: round3(f1),
    detail: { refCuts: a.length, genCuts: b.length, matched, precision: round3(precision), recall: round3(recall) },
    explain: `Reference has ${a.length} cut(s), generated has ${b.length}; ${matched} matched in timing (±7.5% of duration).`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension: structure (layout via dHash at aligned time positions)
// ─────────────────────────────────────────────────────────────────────────────

function scoreStructure(ref, gen) {
  const SAMPLES = 32;
  let sim = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const t = (i + 0.5) / SAMPLES;
    const fa = ref.frames[Math.min(ref.frames.length - 1, Math.floor(t * ref.frames.length))];
    const fb = gen.frames[Math.min(gen.frames.length - 1, Math.floor(t * gen.frames.length))];
    sim += 1 - hammingDistance64(fa.dhash, fb.dhash) / 64;
  }
  sim /= SAMPLES;

  // dHash of unrelated content averages ~0.5 — rescale so 0.5 → 0
  const rescaled = Math.max(0, (sim - 0.5) / 0.5);
  return {
    score: round3(rescaled),
    detail: { rawDhashSimilarity: round3(sim) },
    explain: `Time-aligned layout (dHash) similarity ${pct(sim)} raw (${pct(rescaled)} above chance). Different products naturally score lower here.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension: pacing
// ─────────────────────────────────────────────────────────────────────────────

function activityRatio(sig) {
  let active = 0;
  let total = 0;
  for (const s of sig.segments) {
    const d = s.endMs - s.startMs;
    total += d;
    if (s.type !== "static") active += d;
  }
  return total > 0 ? active / total : 0;
}

function segmentLengths(sig, type) {
  return sig.segments.filter((s) => s.type === type).map((s) => s.endMs - s.startMs);
}

function scorePacing(ref, gen) {
  const durRatio = Math.min(ref.durationMs, gen.durationMs) / Math.max(ref.durationMs, gen.durationMs);

  const actA = activityRatio(ref);
  const actB = activityRatio(gen);
  const actSim = 1 - Math.abs(actA - actB);

  // Idle-dwell rhythm: mean static-segment length
  const idleA = mean(segmentLengths(ref, "static"));
  const idleB = mean(segmentLengths(gen, "static"));
  const idleSim = idleA === 0 && idleB === 0 ? 1 : Math.min(idleA, idleB) / (Math.max(idleA, idleB) || 1);

  const score = 0.4 * durRatio + 0.35 * actSim + 0.25 * idleSim;
  return {
    score: round3(score),
    detail: {
      refDurationMs: ref.durationMs,
      genDurationMs: gen.durationMs,
      durationRatio: round3(durRatio),
      refActivityRatio: round3(actA),
      genActivityRatio: round3(actB),
      meanIdleMsRef: Math.round(idleA),
      meanIdleMsGen: Math.round(idleB),
    },
    explain: `Duration ${(ref.durationMs / 1000).toFixed(1)}s vs ${(gen.durationMs / 1000).toFixed(1)}s (ratio ${pct(durRatio)}); screen-active time ${pct(actA)} vs ${pct(actB)}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension: events (effect mix)
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_TYPES = ["scroll", "pan", "animation", "micro"];
const MIN_EVENT_MS = 120; // one sampled frame at 8fps qualifies (fast transitions)

function countEvents(sig) {
  const counts = { scroll: 0, pan: 0, animation: 0, micro: 0 };
  const durations = { scroll: 0, pan: 0, animation: 0, micro: 0 };
  for (const s of sig.segments) {
    const d = s.endMs - s.startMs;
    if (EVENT_TYPES.includes(s.type) && d >= MIN_EVENT_MS) {
      counts[s.type]++;
      durations[s.type] += d;
    }
  }
  return { counts, durations };
}

function scoreEvents(ref, gen) {
  const a = countEvents(ref);
  const b = countEvents(gen);

  let scoreSum = 0;
  let weightSum = 0;
  const perType = {};
  for (const t of EVENT_TYPES) {
    const maxC = Math.max(a.counts[t], b.counts[t]);
    // Normalize event durations by video duration so length mismatch doesn't bias
    const dA = a.durations[t] / ref.durationMs;
    const dB = b.durations[t] / gen.durationMs;
    const maxD = Math.max(dA, dB);
    const sim = maxC === 0
      ? null
      : 0.5 * (Math.min(a.counts[t], b.counts[t]) / maxC) +
        0.5 * (maxD === 0 ? 1 : Math.min(dA, dB) / maxD);
    perType[t] = {
      ref: a.counts[t], gen: b.counts[t],
      refTimeShare: round3(dA), genTimeShare: round3(dB),
      similarity: sim === null ? null : round3(sim),
    };
    if (sim !== null) {
      const w = Math.max(a.counts[t], 1); // weight by prominence in the reference
      scoreSum += sim * w;
      weightSum += w;
    }
  }
  const score = weightSum > 0 ? scoreSum / weightSum : 1;

  return {
    score: round3(score),
    detail: perType,
    explain: EVENT_TYPES
      .filter((t) => a.counts[t] || b.counts[t])
      .map((t) => `${t}: ${a.counts[t]} ref / ${b.counts[t]} gen (time share ${pct(a.durations[t] / ref.durationMs)} vs ${pct(b.durations[t] / gen.durationMs)})`)
      .join("; ") || "No animation events detected in either video.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Report helpers
// ─────────────────────────────────────────────────────────────────────────────

function describeSig(sig) {
  return {
    path: sig.videoPath,
    durationMs: sig.durationMs,
    resolution: `${sig.width}x${sig.height}`,
    sampledFrames: sig.frames.length,
    cuts: sig.cuts.length,
    events: countEvents(sig).counts,
  };
}
function buildNotes(dim, ref, gen) {
  const notes = [];
  const worst = Object.entries(dim).sort((a, b) => a[1].score - b[1].score);
  for (const [name, d] of worst) {
    if (d.score < 0.6) notes.push(`LOW ${name} (${d.score}): ${d.explain}`);
  }
  if (notes.length === 0) notes.push("All dimensions >= 0.6 - generated demo tracks the reference well.");
  const dr = Math.abs(ref.durationMs - gen.durationMs) / ref.durationMs;
  if (dr > 0.4) notes.push(`Duration differs by ${pct(dr)} - consider matching step timing to the reference.`);
  return notes;
}

function mean(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function round3(v) { return Math.round(v * 1000) / 1000; }
function round4(v) { return Math.round(v * 10000) / 10000; }
function pct(v) { return `${Math.round(v * 100)}%`; }
