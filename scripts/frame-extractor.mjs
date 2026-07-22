#!/usr/bin/env node
/**
 * frame-extractor.mjs
 * Utilities for the mimic-demo pipeline.
 *
 * Responsibilities:
 *   1. downloadVideo(url, destDir)       — yt-dlp → local .mp4 + optional subtitles
 *   2. extractFrames(videoPath, destDir, fps, maxFrames) — ffmpeg → JPEG frames
 *   3. parseSubtitles(vttOrSrtPath)      — returns [{timeMs, text}]
 *   4. ocrFrame(imagePath)               — tesseract OCR (best-effort, may return "")
 *   5. getVideoDuration(videoPath)       — returns seconds via ffprobe
 */

import { execSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { createRequire } from "node:module";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

/**
 * Try to locate an ffmpeg executable.
 * Prefers the @ffmpeg-installer/ffmpeg npm package so we don't need a system install.
 */
function findFfmpeg() {
  // 1) Try the npm-bundled binary (already a dep of OpenScreen)
  try {
    const req = createRequire(import.meta.url);
    const ffmpegInstaller = req("@ffmpeg-installer/ffmpeg");
    if (ffmpegInstaller?.path && existsSync(ffmpegInstaller.path)) {
      return ffmpegInstaller.path;
    }
  } catch { /* not installed */ }

  // 2) Fall back to system ffmpeg
  return "ffmpeg";
}

/**
 * Try to locate an ffprobe executable alongside the bundled ffmpeg.
 */
function findFfprobe() {
  try {
    const req = createRequire(import.meta.url);
    const ffmpegInstaller = req("@ffmpeg-installer/ffmpeg");
    if (ffmpegInstaller?.path) {
      // ffprobe is typically in the same directory as ffmpeg
      const dir = ffmpegInstaller.path.replace(/ffmpeg(\.exe)?$/, "");
      const probe = join(dir, process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
      if (existsSync(probe)) return probe;
    }
  } catch { /* ignore */ }
  return "ffprobe";
}

const FFMPEG = findFfmpeg();
const FFPROBE = findFfprobe();

// ─────────────────────────────────────────────────────────────────────────────
// 1. Download video via yt-dlp
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Downloads a video (YouTube or any yt-dlp-supported URL) into destDir.
 * Also tries to download auto-generated subtitles (en).
 *
 * @returns {{ videoPath: string, subtitlePath: string|null, title: string }}
 */
export async function downloadVideo(url, destDir) {
  mkdirSync(destDir, { recursive: true });

  log(`📥 Downloading video: ${url}`);
  log(`   Destination: ${destDir}`);

  // Check yt-dlp is available
  const ytdlpCheck = spawnSync("yt-dlp", ["--version"], { encoding: "utf8" });
  if (ytdlpCheck.error) {
    throw new Error(
      "yt-dlp not found. Install it with: pip install yt-dlp  OR  winget install yt-dlp.yt-dlp"
    );
  }

  const outputTemplate = join(destDir, "%(title)s.%(ext)s");

  // Download best video (capped at 720p to keep files manageable)
  // Also download auto-subtitles
  const ytdlpArgs = [
    url,
    "--output", outputTemplate,
    // Prefer progressive mp4 (no merge step needed); fall back to merged,
    // then to whatever is available.
    "--format", "best[height<=720][ext=mp4]/bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]/best",
    "--merge-output-format", "mp4",
    // yt-dlp needs ffmpeg for merging; point it at the bundled binary so a
    // system install is never required.
    "--ffmpeg-location", FFMPEG,
    "--write-auto-sub",
    "--sub-lang", "en",
    "--sub-format", "vtt",
    "--no-playlist",
    "--no-warnings",
  ];

  log(`   Running yt-dlp...`);
  const result = spawnSync("yt-dlp", ytdlpArgs, {
    encoding: "utf8",
    cwd: destDir,
  });

  if (result.status !== 0) {
    const errMsg = result.stderr?.trim() || "unknown error";
    throw new Error(`yt-dlp failed: ${errMsg}`);
  }

  // Find the downloaded mp4
  const files = readdirSync(destDir);
  const videoFile = files.find((f) => f.endsWith(".mp4") || f.endsWith(".webm") || f.endsWith(".mkv"));
  if (!videoFile) {
    throw new Error("yt-dlp completed but no video file found in output directory.");
  }
  const videoPath = join(destDir, videoFile);
  const title = basename(videoFile, ".mp4").replace(/\.[^.]+$/, "");

  // Find subtitle file (.vtt or .srt)
  const subFile = files.find(
    (f) => f.endsWith(".vtt") || f.endsWith(".srt") || f.endsWith(".en.vtt")
  );
  const subtitlePath = subFile ? join(destDir, subFile) : null;

  log(`   ✅ Video: ${videoPath}`);
  if (subtitlePath) {
    log(`   ✅ Subtitles: ${subtitlePath}`);
  } else {
    log(`   ℹ️  No subtitles found (text-only mode will rely on OCR only)`);
  }

  return { videoPath, subtitlePath, title };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Extract frames via ffmpeg
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts JPEG frames from a video at a given FPS rate.
 * Returns an array of { filePath, timestampMs } objects sorted by time.
 *
 * @param {string} videoPath - path to the local video file
 * @param {string} framesDir - output directory for frames
 * @param {number} fps       - frames per second to sample (e.g. 0.5 = 1 frame every 2s)
 * @param {number} maxFrames - cap total frames extracted
 */
export function extractFrames(videoPath, framesDir, fps = 0.5, maxFrames = 60) {
  mkdirSync(framesDir, { recursive: true });

  log(`\n🎞️  Extracting frames at ${fps}fps (max ${maxFrames} frames)...`);

  // Get duration first so we can calculate actual frame count
  const duration = getVideoDuration(videoPath);
  const estimatedFrames = Math.ceil(duration * fps);
  const actualFps = estimatedFrames > maxFrames ? maxFrames / duration : fps;

  log(`   Video duration: ${duration.toFixed(1)}s — sampling at ${actualFps.toFixed(3)}fps`);

  const outputPattern = join(framesDir, "frame_%04d.jpg");

  // -vf fps=N/1 selects frames at the given rate
  // -q:v 2 = high quality JPEG
  const ffmpegArgs = [
    "-y",
    "-i", videoPath,
    "-vf", `fps=${actualFps}`,
    "-q:v", "2",
    "-frames:v", String(maxFrames),
    outputPattern,
  ];

  const result = spawnSync(FFMPEG, ffmpegArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    // ffmpeg writes to stderr even on success; check if files exist before failing
    const frameFiles = readdirSync(framesDir).filter((f) => f.startsWith("frame_"));
    if (frameFiles.length === 0) {
      throw new Error(`ffmpeg frame extraction failed: ${result.stderr?.slice(-500)}`);
    }
  }

  // Enumerate frames and compute timestamps
  const frameFiles = readdirSync(framesDir)
    .filter((f) => f.match(/^frame_\d+\.jpg$/))
    .sort();

  const intervalMs = (1 / actualFps) * 1000;
  const frames = frameFiles.map((file, idx) => ({
    filePath: join(framesDir, file),
    timestampMs: Math.round(idx * intervalMs),
    frameIndex: idx,
  }));

  log(`   ✅ Extracted ${frames.length} frames`);
  return frames;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Get video duration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the duration of a video file in seconds using ffprobe.
 */
export function getVideoDuration(videoPath) {
  try {
    const result = spawnSync(
      FFPROBE,
      [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        videoPath,
      ],
      { encoding: "utf8" }
    );
    if (result.status === 0) {
      const info = JSON.parse(result.stdout);
      return parseFloat(info?.format?.duration ?? "60");
    }
  } catch { /* fall through */ }

  // Fallback: use ffmpeg -i (parses from stderr)
  try {
    const result = spawnSync(FFMPEG, ["-i", videoPath], {
      encoding: "utf8",
      stdio: ["ignore", "ignore", "pipe"],
    });
    const match = result.stderr?.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
    if (match) {
      const [, h, m, s] = match;
      return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
    }
  } catch { /* ignore */ }

  return 60; // safe fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Parse subtitles (.vtt or .srt)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a WebVTT or SRT subtitle file into an array of timed cues.
 * @returns {{ startMs: number, endMs: number, text: string }[]}
 */
export function parseSubtitles(subtitlePath) {
  if (!subtitlePath || !existsSync(subtitlePath)) return [];

  const raw = readFileSync(subtitlePath, "utf8");
  const cues = [];

  if (subtitlePath.endsWith(".vtt")) {
    // WebVTT format
    const blocks = raw.split(/\n\n+/);
    for (const block of blocks) {
      const lines = block.trim().split("\n");
      // Find the timestamp line: 00:00:00.000 --> 00:00:00.000
      const tsLine = lines.find((l) => l.includes("-->"));
      if (!tsLine) continue;

      const [startStr, endStr] = tsLine.split("-->").map((s) => s.trim().split(" ")[0]);
      const startMs = parseTimestamp(startStr);
      const endMs = parseTimestamp(endStr);

      const text = lines
        .filter((l) => !l.includes("-->") && !l.match(/^\d+$/) && l !== "WEBVTT")
        .join(" ")
        .replace(/<[^>]+>/g, "") // strip HTML tags
        .trim();

      if (text) cues.push({ startMs, endMs, text });
    }
  } else if (subtitlePath.endsWith(".srt")) {
    // SRT format
    const blocks = raw.split(/\n\n+/);
    for (const block of blocks) {
      const lines = block.trim().split("\n");
      const tsLine = lines.find((l) => l.includes("-->"));
      if (!tsLine) continue;

      const [startStr, endStr] = tsLine.split("-->").map((s) => s.trim());
      const startMs = parseTimestamp(startStr.replace(",", "."));
      const endMs = parseTimestamp(endStr.replace(",", "."));

      const text = lines
        .filter((l) => !l.includes("-->") && !l.match(/^\d+$/))
        .join(" ")
        .trim();

      if (text) cues.push({ startMs, endMs, text });
    }
  }

  return cues;
}

/**
 * Given a subtitle cue array, find the subtitle text active at a given timestamp.
 */
export function getSubtitleAtTime(cues, timeMs, windowMs = 3000) {
  const relevant = cues.filter(
    (c) => c.startMs <= timeMs + windowMs && c.endMs >= timeMs - windowMs
  );
  return relevant.map((c) => c.text).join(" ").trim();
}

// Parses "HH:MM:SS.mmm" or "MM:SS.mmm" → milliseconds
function parseTimestamp(ts) {
  const parts = ts.trim().split(":");
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return Math.round((parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s)) * 1000);
  } else if (parts.length === 2) {
    const [m, s] = parts;
    return Math.round((parseInt(m) * 60 + parseFloat(s)) * 1000);
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. OCR a frame (tesseract, best-effort)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs tesseract OCR on a single JPEG frame.
 * Returns extracted text, or "" if tesseract is not installed.
 */
export function ocrFrame(imagePath) {
  // Check if tesseract is available (cache result)
  if (ocrFrame._available === undefined) {
    const check = spawnSync("tesseract", ["--version"], { encoding: "utf8" });
    ocrFrame._available = !check.error;
    if (!ocrFrame._available) {
      log("   ℹ️  tesseract not found — OCR disabled (install tesseract for text-only mode)");
    }
  }
  if (!ocrFrame._available) return "";

  const outputBase = imagePath.replace(/\.jpg$/, "_ocr");
  const result = spawnSync(
    "tesseract",
    [imagePath, outputBase, "--psm", "3", "-l", "eng"],
    { encoding: "utf8" }
  );

  const txtPath = `${outputBase}.txt`;
  if (existsSync(txtPath)) {
    const text = readFileSync(txtPath, "utf8").trim();
    // Clean up
    try { spawnSync("del", [txtPath], { shell: true }); } catch { }
    return text;
  }
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Read a frame as base64
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads a JPEG frame and returns it as a base64 string.
 */
export function frameToBase64(filePath) {
  const buf = readFileSync(filePath);
  return buf.toString("base64");
}
