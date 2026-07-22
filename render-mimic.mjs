#!/usr/bin/env node
/**
 * render-mimic.mjs
 * OpenDemo — Template Video Renderer (no browser, no walkthrough)
 *
 * Produces a template .mp4 that mimics a reference demo video's dimensions,
 * cuts, transitions, and animation rhythm. 100% local: analysis and rendering
 * use ffmpeg + pure JS. No API keys, no Playwright.
 *
 * Usage:
 *   # Stage 1: analyze a reference and render the template video
 *   node render-mimic.mjs <reference-video-or-url> --output template.mp4
 *     → writes template.mp4 AND template.template.json (editable timeline)
 *     → automatically scores template.mp4 against the reference
 *
 *   # Re-render after editing the template JSON (iteration / stage 2)
 *   node render-mimic.mjs template.template.json --output template.mp4 \
 *     [--reference <video>]   (re-scores if given)
 *
 * Options:
 *   --output <file.mp4>    Output video path (default: ./mimic-template.mp4)
 *   --fps <n>              Render framerate (default: 30)
 *   --max-duration <sec>   Cap template duration
 *   --reference <video>    Reference to score against (auto-set in analyze mode)
 *   --no-score             Skip the evaluation step
 */

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

function log(msg) { process.stdout.write(`${msg}\n`); }

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { source: null, output: "./mimic-template.mp4", fps: 30, maxDuration: null, reference: null, score: true };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--output": opts.output = args[++i]; break;
      case "--fps": opts.fps = parseFloat(args[++i]); break;
      case "--max-duration": opts.maxDuration = parseFloat(args[++i]); break;
      case "--reference": opts.reference = args[++i]; break;
      case "--no-score": opts.score = false; break;
      case "--help": case "-h": printHelp(); process.exit(0); break;
      default: if (!args[i].startsWith("--") && !opts.source) opts.source = args[i];
    }
  }
  return opts;
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║      OpenDemo — Template Video Renderer (keyless)         ║
╚═══════════════════════════════════════════════════════════╝

Renders a template .mp4 mimicking a reference demo video's dimensions,
cuts, transitions and animation rhythm. No browser, no API keys.

USAGE:
  node render-mimic.mjs <reference-video-or-url> --output template.mp4
  node render-mimic.mjs <template.json> --output out.mp4 [--reference ref.mp4]

OPTIONS:
  --output <file.mp4>    Output video (default: ./mimic-template.mp4)
  --fps <n>              Render framerate (default: 30)
  --max-duration <sec>   Cap template duration
  --reference <video>    Reference to score against
  --no-score             Skip evaluation

The editable timeline is saved as <output>.template.json — edit it
(colors, scene images, event timing) and re-render.
`);
}

async function resolveVideoSource(source) {
  if (!/^https?:\/\//i.test(source)) return resolve(source);
  const { downloadVideo } = await import("./scripts/frame-extractor.mjs");
  const hash = createHash("md5").update(source).digest("hex").slice(0, 8);
  const dir = join(tmpdir(), `opendemo-render-${hash}`);
  mkdirSync(dir, { recursive: true });
  log(`📥 Downloading ${source} ...`);
  const { videoPath } = await downloadVideo(source, dir);
  return videoPath;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.source) { printHelp(); process.exit(1); }

  log("═".repeat(55));
  log("🎬 OpenDemo — Template Video Renderer (no API key)");
  log("═".repeat(55));

  const { renderTemplate } = await import("./scripts/video-renderer.mjs");

  let template;
  let templateDir = process.cwd();
  let templatePath = null;

  if (opts.source.endsWith(".json")) {
    // Re-render an edited template
    templatePath = resolve(opts.source);
    template = JSON.parse(readFileSync(templatePath, "utf8"));
    templateDir = dirname(templatePath);
    if (opts.fps !== 30) template.video.fps = opts.fps;
    log(`📄 Template : ${opts.source}`);
  } else {
    // Analyze a reference video
    const refPath = await resolveVideoSource(opts.source);
    opts.reference = opts.reference || refPath;
    log(`📹 Reference: ${refPath}`);
    log(`🔬 Analyzing reference (local CV)...`);
    const { extractTemplate } = await import("./scripts/timeline-extractor.mjs");
    const assetsDir = resolve(opts.output.replace(/\.mp4$/i, "") + "-assets");
    template = await extractTemplate(refPath, {
      fps: opts.fps,
      maxDurationMs: opts.maxDuration ? opts.maxDuration * 1000 : undefined,
      assetsDir,
    });
    templatePath = resolve(opts.output.replace(/\.mp4$/i, "") + ".template.json");
    writeFileSync(templatePath, JSON.stringify(template, null, 2), "utf8");
    templateDir = dirname(templatePath);
    log(`   ${template.scenes.length} scene(s), ${template.timeline.length} timeline event(s)`);
    log(`📝 Editable template: ${templatePath}`);
  }

  log(`\n🖌️  Rendering ${template.video.width}x${template.video.height} @ ${template.video.fps}fps, ${(template.video.durationMs / 1000).toFixed(1)}s...`);
  const outPath = await renderTemplate(template, opts.output, { log, templateDir });
  log(`✅ Video: ${outPath}`);

  if (opts.score && opts.reference) {
    log(`\n🔬 Scoring against reference...`);
    const { compareVideos } = await import("./scripts/video-similarity.mjs");
    const refPath = await resolveVideoSource(opts.reference);
    const report = await compareVideos(refPath, outPath, {});
    log("─".repeat(55));
    for (const [name, d] of Object.entries(report.dimensions)) {
      log(`${name.padEnd(10)} ${d.score.toFixed(3)}  ${d.explain}`);
    }
    log("─".repeat(55));
    log(`OVERALL    ${report.overall.toFixed(3)}`);
    const reportPath = outPath.replace(/\.mp4$/i, "") + ".score.json";
    writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    log(`💾 Report: ${reportPath}`);
    if (templatePath) {
      log(`\n💡 Iterate: edit ${templatePath} then re-render:`);
      log(`   node render-mimic.mjs ${templatePath} --output ${opts.output} --reference ${opts.reference}`);
    }
  }
}

main().catch((err) => {
  process.stdout.write(`\n💥 Render failed: ${err.message}\n`);
  if (err.stack) process.stdout.write(`${err.stack}\n`);
  process.exit(1);
});
