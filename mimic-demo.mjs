#!/usr/bin/env node
/**
 * mimic-demo.mjs
 * OpenDemo — Video Mimic Pipeline
 *
 * Watches a product demo video (YouTube or local file), extracts frames,
 * sends them to an AI model for frame-by-frame analysis, and generates
 * a reusable OpenDemo JSON template that mimics the demo's flow.
 *
 * Usage:
 *   node mimic-demo.mjs <youtube-url-or-local-video> [options]
 *
 * Options:
 *   --target-url <url>     Your product's base URL (default: http://localhost:3000)
 *   --output <file>        Output JSON file path (default: ./mimic-output.json)
 *   --fps <n>              Frames per second to sample (default: 0.5)
 *   --model <name>         AI model name override
 *   --provider <name>      AI provider: gemini | openai | anthropic | text-only
 *   --api-key <key>        Override API key (else reads from env)
 *   --max-frames <n>       Cap total frames (default: 60)
 *   --captions-only        Use only subtitle text, skip images
 *   --keep-frames          Don't delete extracted frames after analysis
 *   --frames-dir <path>    Custom directory for extracted frames
 *
 * Environment variables (checked in priority order):
 *   GEMINI_API_KEY         → Gemini 2.0 Flash (vision)
 *   OPENAI_API_KEY         → GPT-4o (vision)
 *   ANTHROPIC_API_KEY      → Claude 3.5 Sonnet (vision)
 *   (none)                 → Local CV analysis (keyless, no network)
 *
 * Examples:
 *   # Analyze a YouTube video and generate a template for your product
 *   node mimic-demo.mjs https://youtu.be/XXXXX --target-url https://myapp.com --output my-demo.json
 *
 *   # Use a local video file
 *   node mimic-demo.mjs ./reference-demo.mp4 --target-url http://localhost:3000
 *
 *   # Force text-only mode (no vision API needed)
 *   node mimic-demo.mjs https://youtu.be/XXXXX --captions-only --output my-demo.json
 *
 *   # Run the generated template
 *   node run-demo.mjs my-demo.json
 */

import { existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { resolve, join, basename, dirname } from "node:path";
import { tmpdir, homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// Imports (lazy to give good error messages if module is broken)
// ─────────────────────────────────────────────────────────────────────────────

async function loadModules() {
  const { downloadVideo, extractFrames, parseSubtitles } = await import(
    "./scripts/frame-extractor.mjs"
  );
  const { analyzeFrames, detectProvider } = await import(
    "./scripts/ai-analyzer.mjs"
  );
  const { generateTemplate, saveTemplate } = await import(
    "./scripts/template-generator.mjs"
  );
  return { downloadVideo, extractFrames, parseSubtitles, analyzeFrames, detectProvider, generateTemplate, saveTemplate };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI argument parser
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    source: null,
    targetUrl: "http://localhost:3000",
    output: "./mimic-output.json",
    fps: 0.5,
    model: null,
    provider: null,
    apiKey: null,
    maxFrames: 60,
    captionsOnly: false,
    keepFrames: false,
    framesDir: null,
    mock: true,
    mockDir: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--target-url": opts.targetUrl = args[++i]; break;
      case "--output": opts.output = args[++i]; break;
      case "--fps": opts.fps = parseFloat(args[++i]); break;
      case "--model": opts.model = args[++i]; break;
      case "--provider": opts.provider = args[++i]; break;
      case "--api-key": opts.apiKey = args[++i]; break;
      case "--max-frames": opts.maxFrames = parseInt(args[++i]); break;
      case "--captions-only": opts.captionsOnly = true; break;
      case "--keep-frames": opts.keepFrames = true; break;
      case "--frames-dir": opts.framesDir = args[++i]; break;
      case "--no-mock": opts.mock = false; break;
      case "--mock-dir": opts.mockDir = args[++i]; break;
      case "--help": case "-h": printHelp(); process.exit(0); break;
      default:
        if (!arg.startsWith("--") && !opts.source) {
          opts.source = arg;
        }
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║              OpenDemo — Video Mimic Pipeline              ║
╚═══════════════════════════════════════════════════════════╝

Analyzes a product demo video frame-by-frame and generates a
reusable OpenDemo JSON template that mimics the demo's flow.

USAGE:
  node mimic-demo.mjs <video-url-or-path> [options]

SOURCE:
  <url>          YouTube URL, any yt-dlp-supported URL
  <path>         Local video file (.mp4, .webm, .mov, etc.)

OPTIONS:
  --target-url <url>     Your product's base URL
                         (default: http://localhost:3000)
  --output <file>        Output JSON file path
                         (default: ./mimic-output.json)
  --fps <n>              Frames per second to sample
                         (default: 0.5 = 1 frame every 2s)
  --model <name>         AI model name (e.g. gemini-2.0-flash)
  --provider <name>      gemini | openai | anthropic | local | text-only
                         ("local" = keyless CV analysis, the default
                          when no API key is set)
  --api-key <key>        Override API key from environment
  --max-frames <n>       Cap total frames extracted (default: 60)
  --captions-only        Use only subtitles, skip image analysis
  --keep-frames          Keep extracted frames after analysis
  --frames-dir <path>    Custom frames output directory
  --no-mock              Skip stage-1 mock page generation
  --mock-dir <path>      Where to write the mock (default: <output>-mock/)

ENV VARIABLES:
  GEMINI_API_KEY         Enables Gemini vision analysis
  OPENAI_API_KEY         Enables GPT-4o vision analysis
  ANTHROPIC_API_KEY      Enables Claude vision analysis

EXAMPLES:
  # Analyze a YouTube video
  node mimic-demo.mjs https://youtu.be/XXXXX \\
    --target-url https://myapp.com \\
    --output my-demo.json

  # Local video, force Gemini
  node mimic-demo.mjs ./demo.mp4 \\
    --provider gemini \\
    --target-url http://localhost:3000

  # No API key needed (captions/OCR only)
  node mimic-demo.mjs https://youtu.be/XXXXX --captions-only

  # Run the generated template
  node run-demo.mjs my-demo.json
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Logger
// ─────────────────────────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function divider(char = "─", len = 55) {
  log(char.repeat(len));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv);

  if (!opts.source) {
    log("❌ No video source provided.\n");
    printHelp();
    process.exit(1);
  }

  divider("═");
  log("🎬 OpenDemo — Video Mimic Pipeline");
  divider("═");
  log(`📹 Source  : ${opts.source}`);
  log(`🎯 Target  : ${opts.targetUrl}`);
  log(`💾 Output  : ${opts.output}`);
  log(`📊 FPS     : ${opts.fps} (max ${opts.maxFrames} frames)`);
  divider();

  // Load modules
  let modules;
  try {
    modules = await loadModules();
  } catch (err) {
    log(`❌ Failed to load pipeline modules: ${err.message}`);
    log(`   Make sure you are running from the OpenDemo directory.`);
    process.exit(1);
  }

  const {
    downloadVideo, extractFrames, parseSubtitles,
    analyzeFrames, detectProvider, generateTemplate, saveTemplate,
  } = modules;

  // ── Step 1: Prepare work directory ──────────────────────────────────────────
  const sourceHash = createHash("md5").update(opts.source).digest("hex").slice(0, 8);
  const workDir = join(tmpdir(), `opendemo-mimic-${sourceHash}`);
  const framesDir = opts.framesDir
    ? resolve(opts.framesDir)
    : join(workDir, "frames");

  mkdirSync(workDir, { recursive: true });
  mkdirSync(framesDir, { recursive: true });

  log(`\n📁 Work directory: ${workDir}`);

  // ── Step 2: Get the video ────────────────────────────────────────────────────
  let videoPath;
  let subtitlePath = null;
  let videoTitle = "Demo Video";

  const isLocalFile = opts.source.startsWith("/") ||
    opts.source.startsWith("./") ||
    opts.source.startsWith(".\\") ||
    opts.source.match(/^[A-Za-z]:\\/);

  if (isLocalFile) {
    videoPath = resolve(opts.source);
    if (!existsSync(videoPath)) {
      log(`❌ Local video file not found: ${videoPath}`);
      process.exit(1);
    }
    videoTitle = basename(videoPath, ".mp4").replace(/\.[^.]+$/, "");
    log(`\n📂 Using local video: ${videoPath}`);

    // Look for subtitles alongside the video
    const candidates = [
      videoPath.replace(/\.[^.]+$/, ".vtt"),
      videoPath.replace(/\.[^.]+$/, ".en.vtt"),
      videoPath.replace(/\.[^.]+$/, ".srt"),
    ];
    subtitlePath = candidates.find(existsSync) || null;
    if (subtitlePath) log(`   Found subtitles: ${subtitlePath}`);

  } else {
    // YouTube / remote URL
    try {
      const downloaded = await downloadVideo(opts.source, workDir);
      videoPath = downloaded.videoPath;
      subtitlePath = downloaded.subtitlePath;
      videoTitle = downloaded.title;
    } catch (err) {
      log(`\n❌ Video download failed: ${err.message}`);
      if (err.message.includes("yt-dlp")) {
        log(`\n💡 Install yt-dlp:`);
        log(`   Windows : winget install yt-dlp.yt-dlp`);
        log(`   macOS   : brew install yt-dlp`);
        log(`   pip     : pip install yt-dlp`);
      }
      process.exit(1);
    }
  }

  // ── Step 3: Extract frames ───────────────────────────────────────────────────
  let frames;
  try {
    frames = extractFrames(videoPath, framesDir, opts.fps, opts.maxFrames);
  } catch (err) {
    log(`\n❌ Frame extraction failed: ${err.message}`);
    process.exit(1);
  }

  if (frames.length === 0) {
    log(`\n❌ No frames were extracted. Check that ffmpeg is accessible.`);
    process.exit(1);
  }

  // ── Step 4: Parse subtitles ──────────────────────────────────────────────────
  const subtitleCues = subtitlePath ? parseSubtitles(subtitlePath) : [];
  if (subtitleCues.length > 0) {
    log(`\n📝 Loaded ${subtitleCues.length} subtitle cue(s)`);
  }

  // ── Step 5: AI analysis ──────────────────────────────────────────────────────
  const provider = opts.provider || detectProvider();
  const apiKey = opts.apiKey || getApiKeyFromEnv(provider);

  if (provider === "local") {
    log(`\n🧮 No AI vision API key found — using keyless local CV analysis.`);
    log(`   The video's pixels are analyzed directly (cuts, scrolls, typing,`);
    log(`   clicks, animations). No network or model required.`);
    log(`   Optionally set GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY`);
    log(`   for semantic selector guesses on top of this.`);
  } else if (provider === "text-only") {
    log(`\n⚠️  Text-only mode (OCR + subtitles only).`);
  }

  let analyzedSteps;
  try {
    analyzedSteps = await analyzeFrames(frames, subtitleCues, {
      provider,
      model: opts.model,
      apiKey,
      captionsOnly: opts.captionsOnly,
      targetUrl: opts.targetUrl,
      videoTitle,
      sourceUrl: opts.source,
      videoPath, // enables keyless local CV analysis
    });
  } catch (err) {
    log(`\n❌ AI analysis failed: ${err.message}`);
    process.exit(1);
  }

  if (analyzedSteps.length === 0) {
    log(`\n⚠️  AI returned no steps. The video may be too short or subtitles may be missing.`);
    log(`   Try increasing --fps or providing --captions-only with a narrated video.`);
    process.exit(1);
  }

  // ── Step 6: Generate stage-1 mock page (runnable + scoreable) ────────────────
  let mock = null;
  if (opts.mock) {
    log(`\n🏗️  Generating stage-1 mock page...`);
    const { generateMock } = await import("./scripts/mock-generator.mjs");
    const outputBase = resolve(opts.output).replace(/\.json$/i, "");
    const mockOut = opts.mockDir ? resolve(opts.mockDir) : `${outputBase}-mock`;
    try {
      const generated = await generateMock(analyzedSteps, {
        videoPath,
        outputDir: mockOut,
      });
      const relDir = `./${basename(mockOut)}`; // template sits next to the mock dir
      mock = { selectorMap: generated.selectorMap, relDir };
      log(`   ✅ Mock: ${mockOut} (${generated.sceneCount} scene(s))`);
      log(`   The template targets the mock, so stage 1 is immediately runnable + scoreable.`);
    } catch (err) {
      log(`   ⚠️  Mock generation failed (${err.message}) — template will use placeholders.`);
    }
  }

  // ── Step 7: Generate template ─────────────────────────────────────────────────
  log(`\n🔧 Generating OpenDemo template...`);

  const flow = generateTemplate(analyzedSteps, {
    targetUrl: opts.targetUrl,
    sourceUrl: opts.source,
    videoTitle,
    provider,
    model: opts.model || getDefaultModel(provider),
    mock,
  });

  const outputPath = saveTemplate(flow, opts.output);

  // ── Step 7: Cleanup ──────────────────────────────────────────────────────────
  if (!opts.keepFrames) {
    try {
      rmSync(framesDir, { recursive: true, force: true });
    } catch { /* ignore cleanup errors */ }
  } else {
    log(`\n🖼️  Frames kept at: ${framesDir}`);
  }

  // Clean up downloaded video (not the frames dir if kept)
  if (!isLocalFile) {
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }

  // ── Step 8: Summary ──────────────────────────────────────────────────────────
  divider("═");
  log(`✅ Template generated!`);
  divider("═");
  log(`📄 Output     : ${outputPath}`);
  log(`📊 Steps      : ${flow.steps.length} (from ${analyzedSteps.length} analyzed)`);
  log(`🤖 Analyzed by: ${provider}/${opts.model || getDefaultModel(provider)}`);
  log(`🎯 Target URL : ${opts.targetUrl}`);
  divider();
  if (mock) {
    log(`\n📋 STAGE 1 — score the generic template against the reference:`);
    log(`   node run-demo.mjs ${opts.output}`);
    log(`   node evaluate-mimic.mjs ${opts.source} recordings/<hash>.webm`);
    log(`   Iterate on ${opts.output} (timing/order) until the score is acceptable.`);
    log(`\n📋 STAGE 2 — personalization (AI assistant):`);
    log(`   Adapt the template to a real product (URL or local repo via "serve"),`);
    log(`   following _mimicMeta.adapterNotes, then re-run and re-score.`);
  } else {
    log(`\n📋 Next steps:`);
    log(`   1. Open ${opts.output} and review the generated steps`);
    log(`   2. Update CSS selectors to match your product's DOM`);
    log(`   3. Fill in any <YOUR_VALUE_HERE> placeholders`);
    log(`   4. Run: node run-demo.mjs ${opts.output}`);
  }
  log(`\n💡 Tip: An AI agent can read the _mimicMeta.adapterNotes field`);
  log(`        to understand exactly what needs to be adapted.`);
  divider("═");
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function getApiKeyFromEnv(provider) {
  switch (provider) {
    case "gemini": return process.env.GEMINI_API_KEY || "";
    case "openai": return process.env.OPENAI_API_KEY || "";
    case "anthropic": return process.env.ANTHROPIC_API_KEY || "";
    default: return "";
  }
}

function getDefaultModel(provider) {
  switch (provider) {
    case "gemini": return "gemini-2.0-flash";
    case "openai": return "gpt-4o";
    case "anthropic": return "claude-3-5-sonnet-20241022";
    case "local": return "local-cv";
    default: return "text-only";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

main().catch((err) => {
  process.stdout.write(`\n💥 Fatal error: ${err.message}\n`);
  if (err.stack) process.stdout.write(`${err.stack}\n`);
  process.exit(1);
});
