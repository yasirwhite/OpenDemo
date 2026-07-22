#!/usr/bin/env node
/**
 * video-signature.mjs
 * Pure Node + ffmpeg visual-signal extraction. No API keys, no native deps.
 *
 * Decodes a video into a low-resolution RGB frame stream and derives a
 * "signature": per-frame color/structure descriptors plus a temporal
 * segmentation (cuts, scrolls, pans, animations/zooms, micro-activity).
 *
 * Used by:
 *   - scripts/video-similarity.mjs  (local evaluation of mimic quality)
 *   - scripts/local-analyzer.mjs    (keyless step detection for mimic-demo)
 *
 * Exports:
 *   extractSignature(videoPath, opts) → Signature
 *   getVideoMeta(videoPath)           → { durationMs, width, height, fps }
 *
 * Signature:
 *   {
 *     videoPath, durationMs, width, height,
 *     sampleFps, frameW, frameH,
 *     frames: [{ tMs, gray: Uint8Array, hist: Float32Array(64), dhash: BigInt }],
 *     diffs:  [{ tMs, energy, coverage, vShift, hShift, bbox }],
 *     cuts:   [tMs, ...],
 *     segments: [{ type: "static"|"micro"|"scroll"|"pan"|"animation"|, startMs, endMs,
 *                  energy, coverage, vShift, hShift, bbox, pulses }],
 *   }
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

// ─────────────────────────────────────────────────────────────────────────────
// ffmpeg / ffprobe discovery (bundled npm binary preferred, system fallback)
// ─────────────────────────────────────────────────────────────────────────────

function findFfmpeg() {
  try {
    const req = createRequire(import.meta.url);
    const inst = req("@ffmpeg-installer/ffmpeg");
    if (inst?.path && existsSync(inst.path)) return inst.path;
  } catch { /* not installed */ }
  return "ffmpeg";
}

function findFfprobe() {
  try {
    const req = createRequire(import.meta.url);
    const inst = req("@ffmpeg-installer/ffmpeg");
    if (inst?.path) {
      const dir = inst.path.replace(/ffmpeg(\.exe)?$/, "");
      const probe = join(dir, process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
      if (existsSync(probe)) return probe;
    }
  } catch { /* ignore */ }
  return "ffprobe";
}

export const FFMPEG = findFfmpeg();
export const FFPROBE = findFfprobe();

// ─────────────────────────────────────────────────────────────────────────────
// Video metadata
// ─────────────────────────────────────────────────────────────────────────────

export function getVideoMeta(videoPath) {
  const result = spawnSync(
    FFPROBE,
    ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", videoPath],
    { encoding: "utf8" }
  );
  let durationMs = 0, width = 1280, height = 720, fps = 30;
  if (result.status === 0) {
    try {
      const info = JSON.parse(result.stdout);
      const vs = (info.streams || []).find((s) => s.codec_type === "video");
      if (vs) {
        width = vs.width || width;
        height = vs.height || height;
        const [num, den] = String(vs.avg_frame_rate || "30/1").split("/").map(Number);
        if (num && den) fps = num / den;
        if (vs.duration) durationMs = Math.round(parseFloat(vs.duration) * 1000);
      }
      if (!durationMs && info.format?.duration) {
        durationMs = Math.round(parseFloat(info.format.duration) * 1000);
      }
    } catch { /* fall through */ }
  }
  // webm often lacks duration in ffprobe format section — decode-count fallback
  if (!durationMs) {
    const r = spawnSync(FFMPEG, ["-i", videoPath, "-f", "null", "-"], {
      encoding: "utf8", stdio: ["ignore", "ignore", "pipe"],
    });
    const m = r.stderr?.match(/time=(\d+):(\d+):(\d+\.?\d*)/g);
    if (m && m.length) {
      const last = m[m.length - 1].match(/time=(\d+):(\d+):(\d+\.?\d*)/);
      if (last) {
        durationMs = Math.round(
          (parseInt(last[1]) * 3600 + parseInt(last[2]) * 60 + parseFloat(last[3])) * 1000
        );
      }
    }
  }
  return { durationMs: durationMs || 1, width, height, fps };
}

// ─────────────────────────────────────────────────────────────────────────────
// Raw frame decoding (rgb24, downscaled, fixed sample rate)
// ─────────────────────────────────────────────────────────────────────────────

function decodeFrames(videoPath, sampleFps, w, h) {
  return new Promise((resolvePromise, reject) => {
    const args = [
      "-v", "error",
      "-i", videoPath,
      "-vf", `fps=${sampleFps},scale=${w}:${h}:flags=area`,
      "-pix_fmt", "rgb24",
      "-f", "rawvideo",
      "-",
    ];
    const proc = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    let stderr = "";
    proc.stdout.on("data", (c) => chunks.push(c));
    proc.stderr.on("data", (c) => { stderr += c; });
    proc.on("error", (err) => reject(new Error(`ffmpeg spawn failed: ${err.message}`)));
    proc.on("close", (code) => {
      const buf = Buffer.concat(chunks);
      const frameBytes = w * h * 3;
      const n = Math.floor(buf.length / frameBytes);
      if (n === 0) {
        reject(new Error(`ffmpeg decoded 0 frames from ${videoPath}: ${stderr.slice(-300)}`));
        return;
      }
      resolvePromise({ buf, frameCount: n, frameBytes });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-frame descriptors
// ─────────────────────────────────────────────────────────────────────────────

function grayFromRgb(buf, offset, w, h) {
  const gray = new Uint8Array(w * h);
  for (let i = 0, p = offset; i < w * h; i++, p += 3) {
    gray[i] = (buf[p] * 77 + buf[p + 1] * 151 + buf[p + 2] * 28) >> 8;
  }
  return gray;
}

/** 4x4x4 RGB histogram, L1-normalized. */
function rgbHist(buf, offset, w, h) {
  const hist = new Float32Array(64);
  const n = w * h;
  for (let i = 0, p = offset; i < n; i++, p += 3) {
    const r = buf[p] >> 6, g = buf[p + 1] >> 6, b = buf[p + 2] >> 6;
    hist[(r << 4) | (g << 2) | b]++;
  }
  for (let i = 0; i < 64; i++) hist[i] /= n;
  return hist;
}

/** 64-bit dHash from a gray frame (resampled to 9x8, horizontal gradient). */
function dhash(gray, w, h) {
  const gw = 9, gh = 8;
  const cell = new Float64Array(gw * gh);
  const cnt = new Float64Array(gw * gh);
  for (let y = 0; y < h; y++) {
    const gy = Math.min(gh - 1, Math.floor((y * gh) / h));
    for (let x = 0; x < w; x++) {
      const gx = Math.min(gw - 1, Math.floor((x * gw) / w));
      cell[gy * gw + gx] += gray[y * w + x];
      cnt[gy * gw + gx]++;
    }
  }
  let hash = 0n;
  let bit = 0n;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw - 1; x++) {
      const a = cell[y * gw + x] / (cnt[y * gw + x] || 1);
      const b = cell[y * gw + x + 1] / (cnt[y * gw + x + 1] || 1);
      if (a > b) hash |= 1n << bit;
      bit++;
    }
  }
  return hash;
}

/**
 * Fraction of pixels near the frame's dominant brightness — a whitespace /
 * content-density measure. Text-slide frames score high (~0.85+); dense UI
 * frames score much lower.
 */
function bgShareOf(gray) {
  const hist = new Uint32Array(32); // 8-level buckets
  for (let i = 0; i < gray.length; i++) hist[gray[i] >> 3]++;
  let modeBucket = 0;
  for (let b = 1; b < 32; b++) if (hist[b] > hist[modeBucket]) modeBucket = b;
  const lo = (modeBucket << 3) - 20;
  const hi = (modeBucket << 3) + 28;
  let n = 0;
  for (let i = 0; i < gray.length; i++) if (gray[i] >= lo && gray[i] <= hi) n++;
  return n / gray.length;
}

export function hammingDistance64(a, b) {
  let x = a ^ b;
  let count = 0;
  while (x) {
    x &= x - 1n;
    count++;
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame-pair analysis
// ─────────────────────────────────────────────────────────────────────────────

const DIFF_THRESHOLD = 15; // pixel |delta| considered "changed"

function rowMeans(gray, w, h) {
  const rows = new Float64Array(h);
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = 0; x < w; x++) s += gray[y * w + x];
    rows[y] = s / w;
  }
  return rows;
}

function colMeans(gray, w, h) {
  const cols = new Float64Array(w);
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = 0; y < h; y++) s += gray[y * w + x];
    cols[x] = s / h;
  }
  return cols;
}

/** Best 1-D shift (in cells) minimizing profile L1 distance. Returns 0 if shifting doesn't help. */
function bestShift(profA, profB, maxShift) {
  const n = profA.length;
  let bestS = 0;
  let bestD = Infinity;
  let zeroD = 0;
  for (let s = -maxShift; s <= maxShift; s++) {
    let d = 0, cnt = 0;
    for (let i = 0; i < n; i++) {
      const j = i + s;
      if (j < 0 || j >= n) continue;
      d += Math.abs(profA[i] - profB[j]);
      cnt++;
    }
    d /= cnt || 1;
    if (s === 0) zeroD = d;
    if (d < bestD) { bestD = d; bestS = s; }
  }
  // Require a meaningful improvement over no-shift to claim translation
  if (zeroD > 0 && bestD < zeroD * 0.7 && Math.abs(bestS) >= 1) return bestS;
  return 0;
}

function analyzePair(grayA, grayB, w, h) {
  let sum = 0;
  let changed = 0;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const d = Math.abs(grayA[i] - grayB[i]);
      sum += d;
      if (d > DIFF_THRESHOLD) {
        changed++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const n = w * h;
  const energy = sum / (n * 255);
  const coverage = changed / n;
  const bbox = maxX >= 0
    ? { x0: minX / w, y0: minY / h, x1: (maxX + 1) / w, y1: (maxY + 1) / h }
    : null;

  let vShift = 0, hShift = 0;
  if (coverage > 0.2) {
    vShift = bestShift(rowMeans(grayA, w, h), rowMeans(grayB, w, h), Math.floor(h / 3));
    hShift = bestShift(colMeans(grayA, w, h), colMeans(grayB, w, h), Math.floor(w / 3));
  }
  return { energy, coverage, vShift, hShift, bbox };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cut detection + segmentation
// ─────────────────────────────────────────────────────────────────────────────

function histChiSq(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    const s = a[i] + b[i];
    if (s > 0) d += ((a[i] - b[i]) * (a[i] - b[i])) / s;
  }
  return d / 2; // 0..1
}

function detectCuts(frames, diffs) {
  const cuts = [];
  const energies = diffs.map((d) => d.energy);
  for (let i = 0; i < diffs.length; i++) {
    const d = diffs[i];
    // Rolling local median (window of 9, excluding self)
    const lo = Math.max(0, i - 4), hi = Math.min(energies.length, i + 5);
    const win = energies.slice(lo, hi).filter((_, k) => lo + k !== i).sort((a, b) => a - b);
    const median = win[Math.floor(win.length / 2)] || 0;

    const histD = histChiSq(frames[i].hist, frames[i + 1].hist);
    const isSpike = d.energy > Math.max(0.10, median * 5);
    const isHistJump = histD > 0.18;
    const isTranslation = Math.abs(d.vShift) >= 1 || Math.abs(d.hShift) >= 1;

    if (isSpike && isHistJump && !isTranslation && d.coverage > 0.45) {
      // Debounce: no two cuts within 400ms
      if (cuts.length === 0 || d.tMs - cuts[cuts.length - 1] > 400) {
        cuts.push(d.tMs);
      }
    }
  }
  return cuts;
}

const MICRO_ENERGY_MIN = 0.0015;

/**
 * Adaptive noise floor: heavily compressed videos (vpx/gif) have constant
 * low-level pixel churn. Threshold = max(fixed minimum, 4x median energy).
 */
function computeMicroThreshold(diffs) {
  const energies = diffs.map((d) => d.energy).sort((a, b) => a - b);
  const median = energies[Math.floor(energies.length / 2)] || 0;
  return Math.max(MICRO_ENERGY_MIN, median * 4);
}

function classifyDiff(d, cutsSet, microThreshold) {
  if (cutsSet.has(d.tMs)) return "cut";
  if (Math.abs(d.vShift) >= 1 && d.coverage > 0.25) return "scroll";
  if (Math.abs(d.hShift) >= 1 && d.coverage > 0.25) return "pan";
  if (d.coverage > 0.25) return "animation";
  if (d.energy > microThreshold) return "micro";
  return "static";
}

function buildSegments(diffs, cuts, sampleFps, microThreshold = MICRO_ENERGY_MIN) {
  const cutsSet = new Set(cuts);
  const frameMs = 1000 / sampleFps;
  const segments = [];
  let current = null;

  const flush = () => {
    if (current) {
      current.energy /= current.n;
      current.coverage /= current.n;
      segments.push(current);
      current = null;
    }
  };

  for (const d of diffs) {
    const type = classifyDiff(d, cutsSet, microThreshold);
    if (type === "cut") {
      flush();
      segments.push({
        type: "cut", startMs: d.tMs, endMs: d.tMs + frameMs,
        energy: d.energy, coverage: d.coverage, vShift: 0, hShift: 0,
        bbox: d.bbox, pulses: 1, n: 1,
      });
      continue;
    }
    if (current && current.type === type) {
      current.endMs = d.tMs + frameMs;
      current.energy += d.energy;
      current.coverage += d.coverage;
      current.vShift += d.vShift;
      current.hShift += d.hShift;
      current.n++;
      if (d.bbox) current.bbox = unionBbox(current.bbox, d.bbox);
      // Pulse: activity rising from near-zero (used to spot typing rhythm)
      if (d.energy > microThreshold && current._lastEnergy <= microThreshold) current.pulses++;
      current._lastEnergy = d.energy;
    } else {
      flush();
      current = {
        type, startMs: d.tMs, endMs: d.tMs + frameMs,
        energy: d.energy, coverage: d.coverage,
        vShift: d.vShift, hShift: d.hShift,
        bbox: d.bbox, pulses: d.energy > microThreshold ? 1 : 0,
        n: 1, _lastEnergy: d.energy,
      };
    }
  }
  flush();

  for (const s of segments) delete s._lastEnergy;

  // Smoothing: a continuous motion briefly interrupted for a single sample is
  // one event, not two. Merge A-gap-B where A/B share a type and the gap is
  // at most ~1.5 samples (never across cuts).
  const gapMax = (1000 / sampleFps) * 1.6;
  let mergedSomething = true;
  while (mergedSomething) {
    mergedSomething = false;
    for (let i = 0; i + 2 < segments.length; i++) {
      const [a, b, c] = [segments[i], segments[i + 1], segments[i + 2]];
      if (a.type === c.type && a.type !== "static" && a.type !== "cut" &&
          b.type !== "cut" && b.endMs - b.startMs <= gapMax) {
        a.endMs = c.endMs;
        a.energy = (a.energy * a.n + c.energy * c.n) / (a.n + c.n);
        a.coverage = (a.coverage * a.n + c.coverage * c.n) / (a.n + c.n);
        a.vShift += c.vShift;
        a.hShift += c.hShift;
        a.pulses += c.pulses;
        a.n += c.n;
        if (c.bbox) a.bbox = a.bbox ? {
          x0: Math.min(a.bbox.x0, c.bbox.x0), y0: Math.min(a.bbox.y0, c.bbox.y0),
          x1: Math.max(a.bbox.x1, c.bbox.x1), y1: Math.max(a.bbox.y1, c.bbox.y1),
        } : c.bbox;
        segments.splice(i + 1, 2);
        mergedSomething = true;
        break;
      }
    }
  }
  return segments;
}

function unionBbox(a, b) {
  if (!a) return b;
  if (!b) return a;
  return {
    x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} videoPath
 * @param {{ sampleFps?: number, frameW?: number, frameH?: number, keepGray?: boolean }} opts
 */
export async function extractSignature(videoPath, opts = {}) {
  const sampleFps = opts.sampleFps ?? 8;
  const frameW = opts.frameW ?? 64;
  const frameH = opts.frameH ?? 36;

  if (!existsSync(videoPath)) {
    throw new Error(`Video not found: ${videoPath}`);
  }

  const meta = getVideoMeta(videoPath);
  const { buf, frameCount, frameBytes } = await decodeFrames(videoPath, sampleFps, frameW, frameH);

  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const offset = i * frameBytes;
    const gray = grayFromRgb(buf, offset, frameW, frameH);
    frames.push({
      tMs: Math.round((i / sampleFps) * 1000),
      gray,
      hist: rgbHist(buf, offset, frameW, frameH),
      dhash: dhash(gray, frameW, frameH),
      bgShare: bgShareOf(gray),
    });
  }

  const diffs = [];
  for (let i = 0; i < frames.length - 1; i++) {
    const pair = analyzePair(frames[i].gray, frames[i + 1].gray, frameW, frameH);
    diffs.push({ tMs: frames[i + 1].tMs, ...pair });
  }

  const cuts = detectCuts(frames, diffs);
  const microThreshold = computeMicroThreshold(diffs);
  const segments = buildSegments(diffs, cuts, sampleFps, microThreshold);

  if (!opts.keepGray) {
    for (const f of frames) delete f.gray;
  }

  return {
    videoPath,
    durationMs: meta.durationMs,
    width: meta.width,
    height: meta.height,
    sampleFps,
    frameW,
    frameH,
    frames,
    diffs,
    cuts,
    segments,
    microThreshold,
  };
}
