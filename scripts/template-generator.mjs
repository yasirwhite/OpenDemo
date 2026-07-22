#!/usr/bin/env node
/**
 * template-generator.mjs
 * Converts AI-analyzed demo steps into a valid OpenDemo JSON template.
 *
 * The output is a ready-to-run OpenDemo flow JSON that:
 *   - Has baseUrl set to the user's target product URL
 *   - Contains mirrored steps from the source video
 *   - Includes a _meta block with provenance info
 *   - Applies intelligent zoom heuristics
 *   - Handles selector adaptation notes for agents
 *
 * Exports:
 *   generateTemplate(analyzedSteps, options) → OpenDemoFlow
 *   saveTemplate(flow, outputPath)
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Main generator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {import('./ai-analyzer.mjs').AnalyzedStep[]} analyzedSteps
 * @param {{
 *   targetUrl: string,
 *   sourceUrl?: string,
 *   videoTitle?: string,
 *   provider?: string,
 *   model?: string,
 *   width?: number,
 *   height?: number,
 *   fps?: number,
 * }} options
 * @returns {OpenDemoFlow}
 */
export function generateTemplate(analyzedSteps, options = {}) {
  const {
    targetUrl = "http://localhost:3000",
    sourceUrl = "",
    videoTitle = "Untitled Demo",
    provider = "unknown",
    model = "unknown",
    width = 1280,
    height = 720,
    fps = 60,
  } = options;

  // Apply zoom budget: max 3 zoom regions for the whole demo
  const steps = applyZoomBudget(analyzedSteps);

  // Convert AI steps → OpenDemo steps (mock selectors when stage-1 mock exists)
  const mock = options.mock || null;
  const openDemoSteps = steps.map((step) => convertStep(step, targetUrl, mock));

  // Inject a small wait at the start (lets page fully render before first action)
  openDemoSteps.unshift({ action: "wait", timeoutMs: 1000 });

  // Trim trailing wait steps
  while (openDemoSteps.length > 1 && openDemoSteps[openDemoSteps.length - 1].action === "wait") {
    openDemoSteps.pop();
  }

  // Add a final wait so the last action is visible in the recording
  openDemoSteps.push({ action: "wait", timeoutMs: 2000 });

  const flow = {
    // OpenDemo required fields
    baseUrl: normalizeBaseUrl(targetUrl),
    recording: {
      width,
      height,
      fps,
      timeLapseWaitSegments: true,
      timeLapseSpeedFactor: 4.0,
    },
    // Stage 1: serve the generated mock so the template runs (and can be
    // scored) immediately. Stage 2 replaces/removes this.
    ...(mock?.relDir ? { serve: { dir: mock.relDir } } : {}),
    steps: openDemoSteps,

    // Provenance metadata — not used by run-demo.mjs but preserved for agents
    _mimicMeta: {
      stage: mock ? "1-generic-mock" : "1-generic",
      sourceVideoUrl: sourceUrl,
      sourceVideoTitle: videoTitle,
      analyzedBy: `${provider}/${model}`,
      generatedAt: new Date().toISOString(),
      originalStepCount: analyzedSteps.length,
      ...(mock?.relDir ? { mockDir: mock.relDir } : {}),
      adapterNotes: buildAdapterNotes(analyzedSteps, targetUrl, mock, sourceUrl),
    },
  };

  return flow;
}

/**
 * Save the template to a file.
 */
export function saveTemplate(flow, outputPath) {
  const absPath = resolve(outputPath);
  writeFileSync(absPath, JSON.stringify(flow, null, 2), "utf8");
  return absPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step converter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a single AI-analyzed step to an OpenDemo step object.
 */
function convertStep(step, targetUrl, mock) {
  const mockEntry = mock?.selectorMap?.get(step);

  switch (step.action) {
    case "goto": {
      const url = mockEntry?.gotoTarget ?? resolveUrl(step.target, targetUrl);
      return {
        action: "goto",
        target: url,
        // Annotation for agents about what the original demo showed
        ...(step.notes ? { _notes: step.notes } : {}),
      };
    }

    case "click": {
      const s = {
        action: "click",
        target: mockEntry?.target ?? (step.target || "button"),
        ...(mockEntry && step.target ? { _originalTarget: step.target } : {}),
        ...(step.notes ? { _notes: step.notes } : {}),
        ...(step.screenDescription ? { _screenHint: step.screenDescription } : {}),
      };
      if (step.zoom) {
        s.zoom = { durationMs: 1200 };
      }
      return s;
    }

    case "type": {
      const value = mockEntry?.value ?? (step.value || "<YOUR_VALUE_HERE>");
      const s = {
        action: "type",
        target: mockEntry?.target ?? (step.target || "input"),
        value,
        durationMs: estimateTypingDuration(value),
        ...(mockEntry && step.target ? { _originalTarget: step.target } : {}),
        ...(step.notes ? { _notes: step.notes } : {}),
      };
      if (step.zoom) {
        s.zoom = { durationMs: 1200 };
      }
      return s;
    }

    case "scroll": {
      const distance = parseInt(step.value) || 500;
      return {
        action: "scroll",
        value: String(Math.abs(distance)),
        mode: "smooth",
        ...(step.notes ? { _notes: step.notes } : {}),
      };
    }

    case "hover": {
      // OpenDemo doesn't have hover — convert to a slow mouse move via click with no actual effect
      // We represent it as a wait (nearest supported action)
      return {
        action: "wait",
        timeoutMs: 800,
        _notes: `Originally a hover: ${step.notes || step.target}`,
      };
    }

    case "wait":
    default: {
      const ms = parseInt(step.value) || 1500;
      return {
        action: "wait",
        timeoutMs: Math.min(Math.max(ms, 300), 5000), // clamp 300ms–5s
        ...(step.notes ? { _notes: step.notes } : {}),
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Zoom budget: limit to 3 zooms max, prioritize by importance
// ─────────────────────────────────────────────────────────────────────────────

function applyZoomBudget(steps) {
  const MAX_ZOOMS = 3;

  // Count existing explicit zooms from AI
  const aiZooms = steps.filter((s) => s.zoom === true);

  if (aiZooms.length <= MAX_ZOOMS) {
    return steps; // AI was conservative enough
  }

  // Score each step to pick the best MAX_ZOOMS to zoom
  const scored = steps.map((step) => ({
    step,
    score: zoomImportanceScore(step),
  }));

  scored.sort((a, b) => b.score - a.score);
  const topSteps = new Set(scored.slice(0, MAX_ZOOMS).map((s) => s.step));

  // Mutate zoom in place — step object identity must be preserved because
  // the stage-1 mock selectorMap is keyed by these exact objects.
  for (const step of steps) {
    step.zoom = topSteps.has(step) ? true : undefined;
  }
  return steps;
}

function zoomImportanceScore(step) {
  if (step.action !== "click" && step.action !== "type") return 0;

  let score = 0;
  const notes = (step.notes || "").toLowerCase();
  const target = (step.target || "").toLowerCase();

  // High-value keywords
  if (/create|submit|send|publish|launch|start|generate|save/.test(notes)) score += 10;
  if (/primary|cta|main|hero/.test(notes)) score += 8;
  if (/button|btn|submit/.test(target)) score += 5;
  if (/key feature|core feature|main feature/.test(notes)) score += 7;

  // Lower value
  if (/click|tap|press/.test(notes)) score += 2;
  if (/input|search|filter/.test(notes)) score += 1;

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL resolution
// ─────────────────────────────────────────────────────────────────────────────

function resolveUrl(target, baseUrl) {
  if (!target) return baseUrl || "/";

  // Already a full URL
  if (target.startsWith("http://") || target.startsWith("https://")) {
    // Replace the origin with the target URL's origin
    try {
      const targetOrigin = new URL(baseUrl).origin;
      const originalUrl = new URL(target);
      return `${targetOrigin}${originalUrl.pathname}${originalUrl.search}`;
    } catch {
      return target;
    }
  }

  // Relative path — just return as-is (OpenDemo will prepend baseUrl)
  if (target.startsWith("/")) return target;

  return `/${target}`;
}

function normalizeBaseUrl(url) {
  if (!url) return "http://localhost:3000";
  // Strip trailing slash
  return url.replace(/\/$/, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter notes for agents
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates human-readable notes about what an agent needs to adapt
 * to make the template work with the user's specific product.
 */
function buildAdapterNotes(steps, targetUrl, mock, sourceUrl) {
  const notes = [];

  // Count step types
  const clickCount = steps.filter((s) => s.action === "click").length;
  const typeCount = steps.filter((s) => s.action === "type").length;
  const gotoCount = steps.filter((s) => s.action === "goto").length;

  notes.push(`This template was generated by analyzing a reference demo video.`);
  notes.push(`It contains ${steps.length} steps: ${gotoCount} navigations, ${clickCount} clicks, ${typeCount} text inputs.`);
  notes.push(``);

  if (mock) {
    notes.push(`STAGE 1 (current): the template targets a generated mock page (see "serve" block)`);
    notes.push(`so it can be recorded and scored immediately, with no product involved:`);
    notes.push(`    node run-demo.mjs <this-file>`);
    notes.push(`    node evaluate-mimic.mjs ${sourceUrl || "<reference-video>"} recordings/<hash>.webm`);
    notes.push(`Iterate on step timing/order in this file until the score is acceptable.`);
    notes.push(``);
    notes.push(`STAGE 2 (personalization) — an AI assistant adapts this template to a real product:`);
  } else {
    notes.push(`PERSONALIZATION — an AI assistant adapts this template to a real product:`);
  }
  notes.push(`  1. Point it at the product:`);
  notes.push(`     - Hosted/running app: set "baseUrl" and DELETE the "serve" block.`);
  notes.push(`     - Local repo, static/built files: "serve": { "dir": "../client-repo/dist" }`);
  notes.push(`     - Local repo, dev server: "serve": { "command": "npm run dev", "cwd": "../client-repo", "port": 5173 }`);
  notes.push(`  2. Replace every "target" with a real CSS selector from the product's DOM`);
  notes.push(`     ("_originalTarget", "_notes" and "_screenHint" describe what the reference showed`);
  notes.push(`      and WHERE on screen it happened — use them to pick equivalent elements).`);
  notes.push(`  3. Replace "goto" targets with real URL paths, and type-step "value"s with real data.`);
  notes.push(`  4. Keep the step ORDER and the "wait" timings — they reproduce the reference's pacing,`);
  notes.push(`     which is what evaluate-mimic.mjs scores.`);
  notes.push(`  5. Re-run and re-score after personalizing:`);
  notes.push(`     node run-demo.mjs <personalized-file> && node evaluate-mimic.mjs <reference> recordings/<hash>.webm`);

  const placeholders = steps.filter((s) => s.value === "<YOUR_VALUE_HERE>" || s.value?.includes("<YOUR_"));
  if (placeholders.length > 0) {
    notes.push(`  6. Fill in ${placeholders.length} placeholder value(s) in type steps.`);
  }
  notes.push(`Target product: ${targetUrl}`);

  return notes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function estimateTypingDuration(value) {
  if (!value || value.includes("<")) return 1000;
  // Roughly 80ms per character gives a natural typing feel
  return Math.max(400, Math.min(value.length * 80, 3000));
}
