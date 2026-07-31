#!/usr/bin/env node
/**
 * mimic-text.mjs
 * OpenDemo — renders a text sequence using effects MEASURED from a reference.
 *
 * Usage:
 *   node mimic-text.mjs <script.json> --effects effects.json --output out.mp4
 *
 * The script supplies the copy and the shot timing; every motion parameter
 * (easing family and coefficients, duration, stagger, colour ramp, defocus)
 * comes from the measured effect spec chosen by `effectAt`. Swapping the copy
 * is the intended way to retarget the template to a different product — the
 * words are disposable, the motion is the asset.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderTextSequence } from "./text-effects-renderer.mjs";

function parseArgs(argv) {
  const args = argv.slice(2);
  const o = { script: null, effects: "effects.json", output: "text-mimic.mp4", baseline: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--effects") o.effects = args[++i];
    else if (args[i] === "--output") o.output = args[++i];
    else if (args[i] === "--baseline") o.baseline = true;
    else if (!args[i].startsWith("--") && !o.script) o.script = args[i];
  }
  return o;
}

function main() {
  const o = parseArgs(process.argv);
  if (!o.script) {
    console.log("Usage: node mimic-text.mjs <script.json> --effects effects.json --output out.mp4 [--baseline]");
    process.exit(1);
  }
  const script = JSON.parse(readFileSync(resolve(o.script), "utf8"));
  const effects = JSON.parse(readFileSync(resolve(o.effects), "utf8"));
  const log = (m) => process.stdout.write(`${m}\n`);

  const byTime = effects.effects;
  const shots = script.shots.map((s) => {
    // Always resolve the spec so palette comes from the same place in both
    // modes — the baseline differs from the measured render ONLY in motion,
    // otherwise the comparison would be confounded by colour.
    let spec = null;
    if (s.effectAt != null) {
      spec = byTime.reduce((best, e) =>
        Math.abs(e.tMs - s.effectAt) < Math.abs((best?.tMs ?? Infinity) - s.effectAt) ? e : best, null);
      if (spec && Math.abs(spec.tMs - s.effectAt) > 1500) spec = null;
    }
    const colour = s.colour
      || spec?.params?.colour?.spatialRamp?.toRgb
      || spec?.params?.colour?.perElement?.[0]?.to
      || [32, 32, 44];
    return {
      tMs: s.tMs, endMs: s.endMs, text: s.text,
      bg: s.bg || spec?.bg || [250, 250, 250],
      colour, fontsize: s.fontsize,
      // Layout is shared with the baseline for the same reason as the palette:
      // the A/B has to isolate motion, not type size.
      layout: spec?.layout,
      spec: o.baseline ? null : spec,
    };
  });

  log("═".repeat(62));
  log(o.baseline
    ? "🎬 OpenDemo — text render (BASELINE: static slides, no measured motion)"
    : "🎬 OpenDemo — text render from MEASURED effects");
  log("═".repeat(62));
  for (const s of shots) {
    log(`   ${(s.tMs / 1000).toFixed(2)}s "${s.text}" → ${s.spec ? `${s.spec.effect} (${s.spec.durationMs}ms, ${describeEasing(s.spec)})` : "static"}`);
  }

  const V = script.video || {};
  renderTextSequence(shots, o.output, {
    width: V.width ?? 640, height: V.height ?? 360, fps: V.fps ?? 30,
    durationMs: V.durationMs, log,
  }).then((p) => {
    log(`✅ ${p}`);
  }).catch((e) => {
    console.error(`💥 ${e.message}\n${e.stack}`);
    process.exit(1);
  });
}

function describeEasing(spec) {
  const parts = [];
  for (const [k, v] of Object.entries(spec.params || {})) {
    if (v.easing) parts.push(`${k}:${v.easing.family}`);
  }
  return parts.join(" ") || "no params";
}

main();
