#!/usr/bin/env node
/**
 * roundtrip-check.mjs
 * OpenDemo — L6: does the renderer actually produce the motion it was given?
 *
 * Runs the full measurement pipeline over our OWN rendered video and compares
 * the recovered effect specs against the specs we rendered from. This is a
 * closed loop: measure(reference) → render → measure(render) → diff. If the
 * recovered easing shape, duration and effect name match what went in, the
 * renderer is faithful; if they do not, the gap is a rendering bug rather than
 * a taste disagreement.
 *
 * It also compares the pacing vocabulary of the render against the reference,
 * which is the part that catches "every animation rides the same curve".
 *
 * Usage:
 *   node scripts/roundtrip-check.mjs <script.json> <effects.json> <rendered.mp4>
 *        [--reference-effects effects.json] [--out roundtrip.json]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeVideo, makeEasing } from "./glyph-motion.mjs";
import { classify } from "./effect-classifier.mjs";

const SHAPE_TS = [0.15, 0.35, 0.5, 0.65, 0.85];
const shapeVec = (e) => (e ? SHAPE_TS.map(makeEasing(e.family, e.params)) : null);
const shapeDist = (a, b) => {
  if (!a || !b) return null;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.round(Math.sqrt(s / a.length) * 1000) / 1000;
};
const round3 = (v) => (v == null ? null : Math.round(v * 1000) / 1000);

function nearest(list, t, maxDelta) {
  let best = null, bd = Infinity;
  for (const e of list) {
    const d = Math.abs(e.tMs - t);
    if (d < bd) { bd = d; best = e; }
  }
  return bd <= maxDelta ? best : null;
}

export async function roundtrip(scriptPath, effectsPath, renderedPath, opts = {}) {
  const log = opts.log || (() => {});
  const script = JSON.parse(readFileSync(resolve(scriptPath), "utf8"));
  const source = JSON.parse(readFileSync(resolve(effectsPath), "utf8"));

  log(`🔬 Measuring the render (${renderedPath})...`);
  const report = await analyzeVideo(resolve(renderedPath), { log: () => {} });
  const recovered = classify(report);
  log(`   recovered ${recovered.effects.length} effect(s) from the render`);

  const rows = [];
  for (const shot of script.shots) {
    if (shot.effectAt == null) continue;
    const src = nearest(source.effects, shot.effectAt, 1500);
    if (!src) continue;
    // The animation starts at the shot boundary in our render.
    const got = nearest(recovered.effects, shot.tMs, 1200);

    const row = {
      text: shot.text,
      shotMs: shot.tMs,
      expected: { effect: src.effect, durationMs: src.durationMs },
      recovered: got ? { effect: got.effect, durationMs: got.durationMs, tMs: got.tMs } : null,
      matched: !!got,
    };
    if (got) {
      row.effectMatch = got.effect === src.effect;
      row.durationErrorMs = got.durationMs - src.durationMs;
      row.channels = {};
      for (const key of ["opacity", "translate", "scale", "focus", "colour"]) {
        const a = src.params?.[key]?.easing, b = got.params?.[key]?.easing;
        if (!a) continue;
        row.channels[key] = {
          expected: a.family,
          recovered: b ? b.family : null,
          shapeDistance: b ? shapeDist(shapeVec(a), shapeVec(b)) : null,
        };
      }
    }
    rows.push(row);
  }

  const matchedRows = rows.filter((r) => r.matched);
  const dists = matchedRows.flatMap((r) => Object.values(r.channels).map((c) => c.shapeDistance).filter((v) => v != null));

  // Channel recall/precision, not effect-name agreement, is the metric that
  // matters: the renderer consumes `params` and never reads `effect`. The name
  // is a one-word summary that flips between neighbouring categories on a
  // single channel crossing a confidence threshold, so it jitters even while
  // the underlying channel sets and curves converge.
  let hit = 0, expTotal = 0, recTotal = 0;
  for (const r of matchedRows) {
    const exp = Object.keys(r.channels);
    const rec = exp.filter((k) => r.channels[k].recovered != null);
    hit += rec.length; expTotal += exp.length;
    recTotal += Object.keys(r.recoveredParams || {}).length || rec.length;
  }

  const summary = {
    shots: rows.length,
    matched: matchedRows.length,
    channelRecall: round3(hit / Math.max(1, expTotal)),
    channelsExpected: expTotal,
    channelsRecovered: hit,
    effectNameAgreement: round3(matchedRows.filter((r) => r.effectMatch).length / Math.max(1, matchedRows.length)),
    medianShapeDistance: dists.length ? round3([...dists].sort((a, b) => a - b)[dists.length >> 1]) : null,
    medianDurationErrorMs: matchedRows.length
      ? Math.round([...matchedRows.map((r) => Math.abs(r.durationErrorMs))].sort((a, b) => a - b)[matchedRows.length >> 1])
      : null,
  };

  const pacingDiff = {
    reference: {
      easingShapeSpread: source.pacing.easingShapeSpread,
      naiveEasingShare: source.pacing.naiveEasingShare,
      moveHoldRatio: source.pacing.moveHoldRatio,
      sharpEditShare: source.pacing.sharpEditShare,
      burstWidthMedian: source.pacing.burstWidthFrames.median,
    },
    render: {
      easingShapeSpread: recovered.pacing.easingShapeSpread,
      naiveEasingShare: recovered.pacing.naiveEasingShare,
      moveHoldRatio: recovered.pacing.moveHoldRatio,
      sharpEditShare: recovered.pacing.sharpEditShare,
      burstWidthMedian: recovered.pacing.burstWidthFrames.median,
    },
  };

  return { summary, pacingDiff, rows, recovered };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log("Usage: node scripts/roundtrip-check.mjs <script.json> <effects.json> <rendered.mp4> [--out roundtrip.json]");
    process.exit(1);
  }
  let out = "roundtrip.json";
  for (let i = 3; i < args.length; i++) if (args[i] === "--out") out = args[++i];

  const log = (m) => process.stdout.write(`${m}\n`);
  log("═".repeat(70));
  log("🔁 OpenDemo — render round-trip check (L6)");
  log("═".repeat(70));

  const r = await roundtrip(args[0], args[1], args[2], { log });
  writeFileSync(resolve(out), JSON.stringify({ summary: r.summary, pacingDiff: r.pacingDiff, rows: r.rows }, null, 2), "utf8");

  log("\n   text                 expected → recovered           dur err   shape dist");
  log("   " + "─".repeat(72));
  for (const row of r.rows) {
    if (!row.matched) { log(`   ${row.text.padEnd(20)} ${row.expected.effect} → (not detected)`); continue; }
    const ds = Object.values(row.channels).map((c) => c.shapeDistance).filter((v) => v != null);
    const med = ds.length ? ds.sort((a, b) => a - b)[ds.length >> 1] : null;
    log(`   ${row.text.padEnd(20)} ${row.expected.effect.padEnd(14)} → ${String(row.recovered.effect).padEnd(14)} ` +
        `${String(row.durationErrorMs).padStart(6)}ms  ${med == null ? "-" : med}`);
  }

  const s = r.summary;
  log("\n" + "─".repeat(70));
  log(`matched ${s.matched}/${s.shots} shots`);
  log(`CHANNEL RECALL ${s.channelRecall}  (${s.channelsRecovered}/${s.channelsExpected} measured channels reproduced)`);
  log(`effect-name agreement ${s.effectNameAgreement}  (informational — the renderer reads params, not the name)`);
  log(`median easing shape distance ${s.medianShapeDistance}  (0 = identical curve)`);
  log(`median |duration error| ${s.medianDurationErrorMs}ms`);
  log("\n   pacing vocabulary        reference    render");
  const pd = r.pacingDiff;
  for (const k of Object.keys(pd.reference)) {
    log(`   ${k.padEnd(22)} ${String(pd.reference[k]).padStart(9)} ${String(pd.render[k]).padStart(9)}`);
  }
  log(`\n💾 ${resolve(out)}`);
}

if (process.argv[1]?.endsWith("roundtrip-check.mjs")) {
  main().catch((e) => { console.error(`💥 ${e.message}\n${e.stack}`); process.exit(1); });
}
