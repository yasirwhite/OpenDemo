#!/usr/bin/env node
/**
 * local-analyzer.mjs
 * Keyless (no API) computer-vision analysis for the mimic pipeline.
 *
 * Replaces the old subtitle-keyword guessing: analyzes the reference video's
 * pixels directly (via video-signature.mjs) and derives demo steps from the
 * temporal segmentation — cuts, scrolls, animations, and micro-activity
 * (typing / cursor interactions).
 *
 * Detection heuristics:
 *   cut                    → page navigation ("goto"), or "click" if it
 *                            directly follows micro-activity (nav click)
 *   scroll segment         → "scroll" with pixel distance estimated from
 *                            the vertical translation of row profiles
 *   micro, long + pulsing  → "type" (typing rhythm: repeated small bursts)
 *   micro, short           → "click" (single localized change)
 *   animation segment      → transition/modal/zoom; becomes a zoom candidate
 *                            on the preceding interaction, or a "wait"
 *   long static            → "wait"
 *
 * Selectors cannot be recovered from pixels alone, so click/type targets are
 * emitted as placeholders with a screen-region hint (e.g. "upper right") in
 * `screenDescription`, plus OCR text and narration when available. Agents
 * adapt them using _mimicMeta.adapterNotes as before.
 *
 * Exports:
 *   localAnalyze(videoPath, subtitleCues, options) → AnalyzedStep[]
 */

import { extractSignature } from "./video-signature.mjs";
import { getSubtitleAtTime, ocrFrame } from "./frame-extractor.mjs";

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Region description helpers
// ─────────────────────────────────────────────────────────────────────────────

function regionPhrase(bbox) {
  if (!bbox) return "unknown region";
  const cx = (bbox.x0 + bbox.x1) / 2;
  const cy = (bbox.y0 + bbox.y1) / 2;
  const horiz = cx < 0.33 ? "left" : cx > 0.66 ? "right" : "center";
  const vert = cy < 0.33 ? "upper" : cy > 0.66 ? "lower" : "middle";
  const phrase = vert === "middle" && horiz === "center" ? "center" : `${vert} ${horiz}`;
  return `${phrase} of the screen (~${Math.round(cx * 100)}% across, ~${Math.round(cy * 100)}% down)`;
}

function bboxSize(bbox) {
  if (!bbox) return 0;
  return (bbox.x1 - bbox.x0) * (bbox.y1 - bbox.y0);
}

/** Find the extracted JPEG frame nearest to a timestamp (for OCR context). */
function nearestFrame(frames, tMs) {
  if (!frames || frames.length === 0) return null;
  let best = frames[0];
  for (const f of frames) {
    if (Math.abs(f.timestampMs - tMs) < Math.abs(best.timestampMs - tMs)) best = f;
  }
  return best;
}

const ocrCache = new Map();
function ocrAt(frames, tMs) {
  const frame = nearestFrame(frames, tMs);
  if (!frame) return "";
  if (!ocrCache.has(frame.filePath)) {
    ocrCache.set(frame.filePath, (ocrFrame(frame.filePath) || "").replace(/\s+/g, " ").trim());
  }
  return ocrCache.get(frame.filePath);
}

function contextNote(subtitleCues, frames, tMs) {
  const parts = [];
  const sub = getSubtitleAtTime(subtitleCues, tMs);
  if (sub) parts.push(`narrator: "${sub.slice(0, 160)}"`);
  const ocr = ocrAt(frames, tMs);
  if (ocr) parts.push(`screen text: "${ocr.slice(0, 120)}"`);
  return parts.join(" | ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main analysis
// ─────────────────────────────────────────────────────────────────────────────

const TYPING_MIN_MS = 600;
const TYPING_MIN_PULSES = 3;
const WAIT_MIN_MS = 2000;
const CLICK_CUT_WINDOW_MS = 1500;

/**
 * @param {string} videoPath - the reference video file
 * @param {Array} subtitleCues - parsed subtitle cues (may be empty)
 * @param {{ frames?: Array, targetUrl?: string, sampleFps?: number }} options
 *        options.frames: the JPEG frames extracted by the mimic pipeline
 *        (used only for OCR context; analysis reads the video directly)
 * @returns {Promise<import('./ai-analyzer.mjs').AnalyzedStep[]>}
 */
export async function localAnalyze(videoPath, subtitleCues = [], options = {}) {
  log(`\n🧮 Local CV analysis (no API key) — reading video signals...`);

  const sig = await extractSignature(videoPath, {
    sampleFps: options.sampleFps ?? 12,
  });

  log(`   ${sig.frames.length} sampled frames, ${sig.cuts.length} cut(s), ${sig.segments.length} segment(s)`);

  const steps = [];
  const frames = options.frames || [];

  // Opening navigation
  steps.push({
    timestampMs: 0,
    action: "goto",
    target: "/",
    notes: "Demo opens on the initial page." +
      (contextNote(subtitleCues, frames, 0) ? ` (${contextNote(subtitleCues, frames, 0)})` : ""),
    screenDescription: `First frame of the reference video. ${ocrAt(frames, 0) ? `Visible text: "${ocrAt(frames, 0).slice(0, 150)}"` : ""}`.trim(),
  });

  const segs = sig.segments;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const dur = s.endMs - s.startMs;
    const ctx = contextNote(subtitleCues, frames, s.startMs);
    const region = regionPhrase(s.bbox);

    switch (s.type) {
      case "cut": {
        // A hard cut right after micro-activity = the user clicked something
        // that navigated. Otherwise it's an edit-cut / direct navigation.
        const prev = lastActiveBefore(segs, i);
        const followsInteraction =
          prev && prev.type === "micro" && s.startMs - prev.endMs <= CLICK_CUT_WINDOW_MS;
        if (followsInteraction) {
          steps.push({
            timestampMs: s.startMs,
            action: "click",
            target: "<SELECTOR_OF_NAVIGATION_TRIGGER>",
            region: prev.bbox
              ? { x: (prev.bbox.x0 + prev.bbox.x1) / 2, y: (prev.bbox.y0 + prev.bbox.y1) / 2 }
              : undefined,
            zoom: true, // navigating interactions are strong focal-point candidates
            notes: `Interaction in the ${regionPhrase(prev.bbox)} caused a full page change.${ctx ? ` (${ctx})` : ""}`,
            screenDescription: `Screen changed completely at ${(s.startMs / 1000).toFixed(1)}s — likely navigation triggered by a click in the ${regionPhrase(prev.bbox)}.`,
          });
        } else {
          steps.push({
            timestampMs: s.startMs,
            action: "goto",
            target: "/",
            notes: `Hard cut to a different page/scene at ${(s.startMs / 1000).toFixed(1)}s.${ctx ? ` (${ctx})` : ""}`,
            screenDescription: `New scene after cut. ${ocrAt(frames, s.endMs + 500) ? `Visible text: "${ocrAt(frames, s.endMs + 500).slice(0, 150)}"` : ""}`.trim(),
          });
        }
        break;
      }

      case "scroll": {
        // vShift is summed over sampled frames in signature cells; convert to source px
        const cellPx = sig.height / sig.frameH;
        const px = Math.round(Math.abs(s.vShift) * cellPx);
        if (px < 40) break; // ignore jitter
        steps.push({
          timestampMs: s.startMs,
          action: "scroll",
          value: String(Math.min(px, 4000) * Math.sign(s.vShift || 1)),
          notes: `Page scrolls ${s.vShift > 0 ? "down" : "up"} ~${px}px over ${(dur / 1000).toFixed(1)}s.${ctx ? ` (${ctx})` : ""}`,
        });
        break;
      }

      case "micro": {
        if (s._consumed) break;
        // Merge this micro segment with following micro segments that are
        // separated only by very short (<300ms) transitions — zoom punch-ins
        // and sub-sample artifacts must not split a typing run.
        let endMs = s.endMs;
        for (let j = i + 1; j < segs.length - 1; j += 2) {
          const gap = segs[j];
          const next = segs[j + 1];
          if (gap.type !== "micro" && gap.endMs - gap.startMs < 300 && next.type === "micro") {
            gap._consumed = true;
            next._consumed = true;
            endMs = next.endMs;
          } else break;
        }

        const mp = microProfile(sig.diffs, { startMs: s.startMs, endMs });
        const sampleMs = 1000 / sig.sampleFps;
        const runs = stableRuns(mp.centers);
        let emitted = 0;
        for (const run of runs) {
          if (emitted >= 4) break; // safety cap per segment
          const runDur = run.endMs - run.startMs + sampleMs;
          const where = runPhrase(run);
          if (runDur >= TYPING_MIN_MS) {
            steps.push({
              timestampMs: run.startMs,
              action: "type",
              target: "<SELECTOR_OF_INPUT_FIELD>",
              region: runCenter(run),
              value: "<YOUR_VALUE_HERE>",
              notes: `Sustained localized activity for ${(runDur / 1000).toFixed(1)}s in the ${where} — consistent with text entry.${ctx ? ` (${ctx})` : ""}`,
              screenDescription: `Small changes staying concentrated in the ${where}.`,
            });
            emitted++;
          } else if (runDur >= 2 * sampleMs - 1 && run.centers.length >= 2) {
            steps.push({
              timestampMs: run.startMs,
              action: "click",
              target: "<SELECTOR_OF_CLICKED_ELEMENT>",
              region: runCenter(run),
              notes: `Brief localized change in the ${where} — likely a click or hover.${ctx ? ` (${ctx})` : ""}`,
              screenDescription: `Small UI change in the ${where}.`,
            });
            emitted++;
          }
          // single-sample runs = cursor traveling; skipped
        }

        // Fallback: an isolated blip (e.g. a click ripple caught on one
        // sampled frame) still counts as a click.
        if (emitted === 0 && mp.centers.length >= 1 && endMs - s.startMs >= 120) {
          steps.push({
            timestampMs: s.startMs,
            action: "click",
            target: "<SELECTOR_OF_CLICKED_ELEMENT>",
            region: mp.centers.length ? { x: mp.meanX, y: mp.meanY } : undefined,
            notes: `Brief localized change in the ${centerPhrase(mp)} — likely a click or hover.${ctx ? ` (${ctx})` : ""}`,
            screenDescription: `Small UI change in the ${centerPhrase(mp)}.`,
          });
        }
        break;
      }

      case "animation": {
        if (s._consumed) break;
        // Sustained large change without translation: modal, expansion, zoom,
        // or animated transition. Attach as zoom candidate to previous
        // interaction; otherwise represent the dwell.
        const prevStep = steps[steps.length - 1];
        if (prevStep && (prevStep.action === "click" || prevStep.action === "type") &&
          s.startMs - prevStep.timestampMs <= 3000) {
          prevStep.zoom = true;
          prevStep.notes += ` Triggered a ${(dur / 1000).toFixed(1)}s animated transition (modal/expansion/zoom).`;
        } else if (dur >= 500) {
          steps.push({
            timestampMs: s.startMs,
            action: "wait",
            value: String(Math.min(Math.round(dur), 5000)),
            notes: `Animated transition for ${(dur / 1000).toFixed(1)}s (modal, zoom, or content change).${ctx ? ` (${ctx})` : ""}`,
          });
        }
        break;
      }

      case "pan": {
        if (s._consumed || dur < 400) break; // sub-sample artifact (typing/zoom), not a real pan
        steps.push({
          timestampMs: s.startMs,
          action: "wait",
          value: String(Math.min(Math.round(dur), 3000)),
          notes: `Horizontal movement (carousel/pan) observed — OpenDemo has no pan action; represented as a pause.${ctx ? ` (${ctx})` : ""}`,
        });
        break;
      }

      case "static": {
        if (dur >= WAIT_MIN_MS) {
          steps.push({
            timestampMs: s.startMs,
            action: "wait",
            value: String(Math.min(Math.round(dur), 5000)),
            notes: `Viewer dwells on this screen for ${(dur / 1000).toFixed(1)}s.${ctx ? ` (${ctx})` : ""}`,
          });
        }
        break;
      }
    }
  }

  const typed = steps.filter((s) => s.action === "type").length;
  const clicks = steps.filter((s) => s.action === "click").length;
  const scrolls = steps.filter((s) => s.action === "scroll").length;
  log(`   ✅ Derived ${steps.length} steps — ${clicks} click(s), ${typed} type(s), ${scrolls} scroll(s), ${sig.cuts.length} cut(s)`);

  return steps;
}

/**
 * Analyze the per-frame change centers inside a micro segment.
 * Typing keeps change concentrated in one spot (chars appear at a slowly
 * advancing x); cursor movement makes the change center travel across
 * the screen.
 */
function microProfile(diffs, seg) {
  const centers = [];
  for (const d of diffs) {
    if (d.tMs < seg.startMs || d.tMs > seg.endMs || !d.bbox) continue;
    centers.push({
      x: (d.bbox.x0 + d.bbox.x1) / 2,
      y: (d.bbox.y0 + d.bbox.y1) / 2,
      tMs: d.tMs,
    });
  }
  if (centers.length === 0) return { spread: 0, travel: 0, centers };
  const mx = centers.reduce((s, c) => s + c.x, 0) / centers.length;
  const my = centers.reduce((s, c) => s + c.y, 0) / centers.length;
  const spread = Math.sqrt(
    centers.reduce((s, c) => s + (c.x - mx) ** 2 + (c.y - my) ** 2, 0) / centers.length
  );
  let travel = 0;
  for (let i = 1; i < centers.length; i++) {
    travel += Math.hypot(centers[i].x - centers[i - 1].x, centers[i].y - centers[i - 1].y);
  }
  return { spread, travel, centers, meanX: mx, meanY: my };
}

/**
 * Split a sequence of change centers into "stable runs": consecutive centers
 * that stay within jumpThresh of each other. A long stable run = typing /
 * sustained interaction at one spot; travel between runs = cursor movement.
 */
function stableRuns(centers, jumpThresh = 0.12) {
  const runs = [];
  let run = null;
  for (const c of centers) {
    if (run && Math.hypot(c.x - run.last.x, c.y - run.last.y) <= jumpThresh) {
      run.centers.push(c);
      run.last = c;
      run.endMs = c.tMs;
    } else {
      if (run) runs.push(run);
      run = { centers: [c], last: c, startMs: c.tMs, endMs: c.tMs };
    }
  }
  if (run) runs.push(run);
  return runs;
}

function runCenter(run) {
  return {
    x: run.centers.reduce((s, c) => s + c.x, 0) / run.centers.length,
    y: run.centers.reduce((s, c) => s + c.y, 0) / run.centers.length,
  };
}

function runPhrase(run) {
  const { x: cx, y: cy } = runCenter(run);
  const horiz = cx < 0.33 ? "left" : cx > 0.66 ? "right" : "center";
  const vert = cy < 0.33 ? "upper" : cy > 0.66 ? "lower" : "middle";
  const phrase = vert === "middle" && horiz === "center" ? "center" : `${vert} ${horiz}`;
  return `${phrase} of the screen (~${Math.round(cx * 100)}% across, ~${Math.round(cy * 100)}% down)`;
}

function centerPhrase(mp) {
  if (!mp.centers || mp.centers.length === 0) return "unknown region";
  const last = mp.centers[mp.centers.length - 1];
  const horiz = last.x < 0.33 ? "left" : last.x > 0.66 ? "right" : "center";
  const vert = last.y < 0.33 ? "upper" : last.y > 0.66 ? "lower" : "middle";
  const phrase = vert === "middle" && horiz === "center" ? "center" : `${vert} ${horiz}`;
  return `${phrase} of the screen (~${Math.round(last.x * 100)}% across, ~${Math.round(last.y * 100)}% down)`;
}

/** Last non-static segment strictly before index i. */
function lastActiveBefore(segs, i) {
  for (let j = i - 1; j >= 0; j--) {
    if (segs[j].type !== "static") return segs[j];
  }
  return null;
}
