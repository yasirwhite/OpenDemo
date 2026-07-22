#!/usr/bin/env node
/**
 * evaluate-mimic.mjs
 * OpenDemo — Local Mimic Evaluation
 *
 * Scores how closely a generated demo video mimics a reference demo video.
 * Runs 100% locally (Node + ffmpeg). No API keys required.
 *
 * Usage:
 *   node evaluate-mimic.mjs <reference-video> <generated-video> [options]
 *
 *   Either argument may be a local file (.mp4/.webm/...) or a
 *   YouTube / yt-dlp-supported URL (downloaded automatically).
 *
 * Options:
 *   --json <file>        Write the full report as JSON
 *   --min-score <0..1>   Exit with code 1 if overall score is below this
 *                        (useful for CI / automated iteration loops)
 *   --sample-fps <n>     Analysis sampling rate (default: 8)
 *   --weights <json>     Override dimension weights, e.g.
 *                        '{"color":0.3,"motion":0.3}'
 *   --quiet              Only print the overall score
 *
 * Dimensions (each 0–1):
 *   color      palette / overall look
 *   motion     animation dynamics (how much moves, and when)
 *   cuts       hard-cut count + timing
 *   structure  layout similarity of time-aligned frames
 *   pacing     duration + active/idle rhythm
 *   events     effect mix (scrolls, pans, animations/zooms, micro-activity)
 *
 * Examples:
 *   node evaluate-mimic.mjs reference.mp4 recordings/abc123.webm
 *   node evaluate-mimic.mjs https://youtu.be/XXXX gen.webm --json report.json --min-score 0.7
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { compareVideos, DEFAULT_WEIGHTS } from "./scripts/video-similarity.mjs";

/** Accepts a local path or any yt-dlp-supported URL; returns a local path. */
async function resolveVideoSource(source, quiet) {
  if (!/^https?:\/\//i.test(source)) return resolve(source);
  const { downloadVideo } = await import("./scripts/frame-extractor.mjs");
  const hash = createHash("md5").update(source).digest("hex").slice(0, 8);
  const dir = join(tmpdir(), `opendemo-eval-${hash}`);
  mkdirSync(dir, { recursive: true });
  if (!quiet) process.stdout.write(`📥 Downloading ${source} ...\n`);
  const { videoPath } = await downloadVideo(source, dir);
  return videoPath;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    reference: null, generated: null,
    json: null, minScore: null, sampleFps: 8, weights: null, quiet: false,
  };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--json": opts.json = args[++i]; break;
      case "--min-score": opts.minScore = parseFloat(args[++i]); break;
      case "--sample-fps": opts.sampleFps = parseFloat(args[++i]); break;
      case "--weights": opts.weights = JSON.parse(args[++i]); break;
      case "--quiet": opts.quiet = true; break;
      case "--help": case "-h": printHelp(); process.exit(0); break;
      default:
        if (!args[i].startsWith("--")) positional.push(args[i]);
    }
  }
  opts.reference = positional[0] || null;
  opts.generated = positional[1] || null;
  return opts;
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           OpenDemo — Local Mimic Evaluation               ║
╚═══════════════════════════════════════════════════════════╝

Scores how closely a generated demo mimics a reference video.
100% local — no API keys required. Needs ffmpeg (bundled).

USAGE:
  node evaluate-mimic.mjs <reference-video> <generated-video> [options]

  Either argument may be a local file (.mp4/.webm/...) or a
  YouTube / yt-dlp-supported URL (downloaded automatically).

OPTIONS:
  --json <file>        Write full report as JSON
  --min-score <0..1>   Exit 1 if overall score below threshold
  --sample-fps <n>     Analysis sampling rate (default: 8)
  --weights <json>     Override weights: '{"color":0.3,"motion":0.3}'
  --quiet              Only print the overall score

DEFAULT WEIGHTS:
  ${JSON.stringify(DEFAULT_WEIGHTS)}

EXAMPLE:
  node evaluate-mimic.mjs ref.mp4 recordings/demo.webm --json report.json
`);
}

function bar(score, width = 20) {
  const filled = Math.round(score * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function log(msg) { process.stdout.write(`${msg}\n`); }

async function main() {
  const opts = parseArgs(process.argv);

  if (!opts.reference || !opts.generated) {
    log("❌ Need two videos: <reference> <generated>\n");
    printHelp();
    process.exit(1);
  }

  if (!opts.quiet) {
    log("═".repeat(55));
    log("🔬 OpenDemo — Local Mimic Evaluation (no API key)");
    log("═".repeat(55));
    log(`📹 Reference : ${opts.reference}`);
    log(`🎬 Generated : ${opts.generated}`);
  }

  const refPath = await resolveVideoSource(opts.reference, opts.quiet);
  const genPath = await resolveVideoSource(opts.generated, opts.quiet);

  if (!opts.quiet) log(`   Analyzing both videos...`);

  const report = await compareVideos(refPath, genPath, {
    sampleFps: opts.sampleFps,
    weights: opts.weights || undefined,
  });

  if (opts.quiet) {
    log(String(report.overall));
  } else {
    log("");
    log(`   Reference: ${(report.reference.durationMs / 1000).toFixed(1)}s, ${report.reference.resolution}, ${report.reference.cuts} cut(s)`);
    log(`   Generated: ${(report.generated.durationMs / 1000).toFixed(1)}s, ${report.generated.resolution}, ${report.generated.cuts} cut(s)`);
    log("");
    log("─".repeat(55));
    for (const [name, d] of Object.entries(report.dimensions)) {
      const w = report.weights[name];
      log(`${name.padEnd(10)} ${bar(d.score)} ${d.score.toFixed(3)}  (weight ${w})`);
      log(`${" ".repeat(11)}${d.explain}`);
    }
    log("─".repeat(55));
    log(`OVERALL    ${bar(report.overall)} ${report.overall.toFixed(3)}`);
    log("─".repeat(55));
    log("\n📋 Notes:");
    for (const n of report.notes) log(`   • ${n}`);
  }

  if (opts.json) {
    const jsonPath = resolve(opts.json);
    writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
    if (!opts.quiet) log(`\n💾 Full report: ${jsonPath}`);
  }

  if (opts.minScore !== null && report.overall < opts.minScore) {
    if (!opts.quiet) log(`\n❌ Overall ${report.overall} < required ${opts.minScore}`);
    process.exit(1);
  }
}

main().catch((err) => {
  process.stdout.write(`\n💥 Evaluation failed: ${err.message}\n`);
  if (err.stack) process.stdout.write(`${err.stack}\n`);
  process.exit(1);
});
