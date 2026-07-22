#!/usr/bin/env node
/**
 * text-slide.mjs
 * Renders kinetic-typography-style text slides (big centered text on a clean
 * background) as raw rgb24 buffers, via ffmpeg drawtext. Used by
 * video-renderer.mjs for "text" beats — the dominant content class of
 * polished product demo videos.
 *
 * Exports:
 *   renderTextSlide({ text, w, h, bg, fg, accentWord, accent }) → Buffer|null
 *   findFont() → string|null
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { FFMPEG } from "./video-signature.mjs";

let cachedFont;

export function findFont() {
  if (cachedFont !== undefined) return cachedFont;
  const candidates = [
    process.env.OPENDEMO_FONT,
    // Windows
    "C:\\Windows\\Fonts\\segoeuib.ttf",
    "C:\\Windows\\Fonts\\segoeui.ttf",
    "C:\\Windows\\Fonts\\arialbd.ttf",
    "C:\\Windows\\Fonts\\arial.ttf",
    // Linux
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    // macOS
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial.ttf",
  ].filter(Boolean);
  cachedFont = candidates.find((p) => existsSync(p)) || null;
  return cachedFont;
}

function hex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `0x${c(r)}${c(g)}${c(b)}`;
}

function escapeDrawtext(s) {
  return s
    .replace(/[^\w\s.,!?''\-&+]/g, "")
    .replace(/\\/g, "")
    .replace(/'/g, "’")
    .replace(/:/g, "\\:")
    .trim();
}

/**
 * Renders a text slide once. Returns rgb24 Buffer (w*h*3) or null on failure.
 * Long text wraps onto up to 3 lines.
 */
export function renderTextSlide({ text, w, h, bg, fg }) {
  const font = findFont();
  if (!font) return null;
  const clean = escapeDrawtext(text || "");
  if (!clean) return null;

  // Wrap into lines of roughly equal length (max 3)
  const words = clean.split(/\s+/).slice(0, 14);
  const lines = [];
  const perLine = Math.ceil(words.length / Math.min(3, Math.ceil(words.length / 4)));
  for (let i = 0; i < words.length; i += perLine) {
    lines.push(words.slice(i, i + perLine).join(" "));
  }

  const longest = Math.max(...lines.map((l) => l.length));
  const fontsize = Math.max(14, Math.min(Math.round(h / 6), Math.round((w * 0.86) / (longest * 0.54))));
  const lineGap = Math.round(fontsize * 1.35);
  const blockH = lineGap * lines.length;

  const fontPath = font.replace(/\\/g, "/").replace(/^([A-Za-z]):\//, "$1\\\\:/");
  const draws = lines.map((line, i) => {
    const y = `(h-${blockH})/2+${i * lineGap}`;
    return `drawtext=fontfile='${fontPath}':text='${line}':fontsize=${fontsize}:fontcolor=${hex(fg)}:x=(w-text_w)/2:y=${y}`;
  });

  const r = spawnSync(FFMPEG, [
    "-v", "error",
    "-f", "lavfi", "-i", `color=c=${hex(bg)}:s=${w}x${h}:d=1`,
    "-vf", draws.join(","),
    "-frames:v", "1",
    "-pix_fmt", "rgb24", "-f", "rawvideo", "-",
  ], { maxBuffer: w * h * 3 + 65536 });

  if (r.status === 0 && r.stdout?.length >= w * h * 3) return r.stdout.subarray(0, w * h * 3);
  return null;
}
