#!/usr/bin/env node
/**
 * ai-analyzer.mjs
 * AI provider abstraction for frame-by-frame demo video analysis.
 *
 * Supports:
 *   - Gemini (google.generativeai REST API) — vision + text
 *   - OpenAI (openai REST API) — vision + text
 *   - Anthropic Claude (anthropic REST API) — vision + text
 *   - Text-only fallback — OCR + subtitles, no images required
 *
 * Exports:
 *   analyzeFrames(frames, subtitleCues, options) → AnalyzedStep[]
 *
 * AnalyzedStep:
 *   {
 *     timestampMs: number,
 *     action: "goto" | "click" | "type" | "scroll" | "wait",
 *     target?: string,       // CSS selector or URL path
 *     value?: string,        // for "type" actions
 *     zoom?: boolean,        // true if this is a key focal point
 *     notes: string,         // human description of what's happening
 *     screenDescription?: string, // what the AI saw on screen at this frame
 *   }
 */

import { readFileSync } from "node:fs";
import { getSubtitleAtTime, frameToBase64, ocrFrame } from "./frame-extractor.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

/**
 * Auto-detect which AI provider to use based on available environment variables.
 */
export function detectProvider() {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "local"; // keyless local computer-vision analysis (local-analyzer.mjs)
}

/**
 * Main entry point. Analyzes frames and returns structured demo steps.
 *
 * @param {Array<{filePath: string, timestampMs: number, frameIndex: number}>} frames
 * @param {Array<{startMs: number, endMs: number, text: string}>} subtitleCues
 * @param {{
 *   provider?: string,
 *   model?: string,
 *   apiKey?: string,
 *   captionsOnly?: boolean,
 *   targetUrl?: string,
 *   videoTitle?: string,
 *   sourceUrl?: string,
 * }} options
 * @returns {Promise<AnalyzedStep[]>}
 */
export async function analyzeFrames(frames, subtitleCues, options = {}) {
  const provider = options.provider || detectProvider();
  const apiKey = options.apiKey || getApiKey(provider);

  log(`\n🤖 Analysis — Provider: ${provider.toUpperCase()}`);
  if (provider !== "text-only" && provider !== "local") {
    log(`   Model: ${options.model || getDefaultModel(provider)}`);
    log(`   Frames: ${frames.length}`);
  }

  // Keyless local computer-vision analysis (default when no API key is set).
  // Reads the video pixels directly — no model, no network.
  if (provider === "local" && !options.captionsOnly) {
    if (!options.videoPath) {
      log(`   ⚠️  Local analysis needs options.videoPath — falling back to text-only.`);
      return textOnlyAnalysis(frames, subtitleCues, options);
    }
    const { localAnalyze } = await import("./local-analyzer.mjs");
    return localAnalyze(options.videoPath, subtitleCues, {
      frames,
      targetUrl: options.targetUrl,
    });
  }

  if (provider === "local" || provider === "text-only" || options.captionsOnly) {
    return textOnlyAnalysis(frames, subtitleCues, options);
  }

  // Vision analysis: batch frames to avoid token limits
  const BATCH_SIZE = 6; // send 6 frames at a time
  const allSteps = [];

  for (let i = 0; i < frames.length; i += BATCH_SIZE) {
    const batch = frames.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(frames.length / BATCH_SIZE);
    log(`   Batch ${batchNum}/${totalBatches} (frames ${i + 1}–${Math.min(i + BATCH_SIZE, frames.length)})...`);

    let batchSteps;
    try {
      switch (provider) {
        case "gemini":
          batchSteps = await geminiAnalyzeBatch(batch, subtitleCues, options, apiKey);
          break;
        case "openai":
          batchSteps = await openaiAnalyzeBatch(batch, subtitleCues, options, apiKey);
          break;
        case "anthropic":
          batchSteps = await anthropicAnalyzeBatch(batch, subtitleCues, options, apiKey);
          break;
        default:
          batchSteps = await textOnlyBatchAnalysis(batch, subtitleCues, options);
      }
      allSteps.push(...batchSteps);
      log(`     ✅ Got ${batchSteps.length} step(s) from this batch`);
    } catch (err) {
      log(`     ⚠️  Batch failed: ${err.message} — using text-only fallback`);
      const fallback = await textOnlyBatchAnalysis(batch, subtitleCues, options);
      allSteps.push(...fallback);
    }

    // Rate limit buffer
    if (i + BATCH_SIZE < frames.length) {
      await sleep(500);
    }
  }

  // Deduplicate and sort by timestamp
  const deduped = deduplicateSteps(allSteps);
  log(`\n✅ Analysis complete — ${deduped.length} demo steps identified`);
  return deduped;
}

// ─────────────────────────────────────────────────────────────────────────────
// System prompt (shared across providers)
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(options) {
  return `You are a product demo analyst. Your job is to watch frames from a software product demo video and describe what UI interactions are happening so they can be replicated programmatically.

${options.sourceUrl ? `The source video is: ${options.sourceUrl}` : ""}
${options.videoTitle ? `Video title: ${options.videoTitle}` : ""}
${options.targetUrl ? `The user's product lives at: ${options.targetUrl}` : ""}

For EACH frame batch you receive, respond with a JSON array of demo steps. Each step must match this schema:

[
  {
    "timestampMs": <number — milliseconds from video start>,
    "action": <"goto" | "click" | "type" | "scroll" | "wait" | "hover">,
    "target": <CSS selector or URL path — best guess based on what you see>,
    "value": <string — only for "type" or "scroll" actions>,
    "zoom": <true if this is a major focal point like a CTA or key feature — otherwise omit>,
    "notes": <1-2 sentence description of what's happening on screen>,
    "screenDescription": <describe what the UI looks like at this moment>
  }
]

Rules:
- Return ONLY valid JSON. No markdown, no explanation outside the array.
- If multiple frames show the same ongoing interaction, collapse them into one step.
- For "goto" actions, set "target" to the URL path (e.g. "/dashboard", "/settings").
- For "click" actions, describe the button/link in "target" as a descriptive CSS selector or aria label (e.g. "#create-btn", "[aria-label='New Campaign']", ".submit-button").
- For "type" actions, set "value" to the exact text being typed if visible, or a placeholder like "<user types search query>" if not clearly visible.
- Set "zoom": true only for the 2-3 most important interactions in the entire video (primary CTAs, key feature reveals).
- If nothing significant happens between frames, emit a single "wait" step.
- Timestamps must correspond to when the action starts in the video.`;
}

function buildUserPromptForBatch(batch, subtitleCues) {
  const frameDescriptions = batch.map((frame) => {
    const subtitle = getSubtitleAtTime(subtitleCues, frame.timestampMs);
    return `Frame at ${(frame.timestampMs / 1000).toFixed(1)}s${subtitle ? ` — narrator says: "${subtitle}"` : ""}`;
  });

  return `Analyze the following ${batch.length} video frames in sequence:\n${frameDescriptions.join("\n")}\n\nReturn a JSON array of demo steps for these frames.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini
// ─────────────────────────────────────────────────────────────────────────────

async function geminiAnalyzeBatch(batch, subtitleCues, options, apiKey) {
  const model = options.model || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build content parts: alternating image and text
  const parts = [];

  // System context at the start
  parts.push({ text: buildSystemPrompt(options) });

  for (const frame of batch) {
    const subtitle = getSubtitleAtTime(subtitleCues, frame.timestampMs);
    parts.push({
      text: `Frame at ${(frame.timestampMs / 1000).toFixed(1)}s:${subtitle ? ` (narrator: "${subtitle}")` : ""}`,
    });
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: frameToBase64(frame.filePath),
      },
    });
  }

  parts.push({ text: "Return the JSON array of demo steps for these frames:" });

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  return parseAiResponse(text, batch);
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI
// ─────────────────────────────────────────────────────────────────────────────

async function openaiAnalyzeBatch(batch, subtitleCues, options, apiKey) {
  const model = options.model || "gpt-4o";
  const url = "https://api.openai.com/v1/chat/completions";

  const userContentParts = [];

  for (const frame of batch) {
    const subtitle = getSubtitleAtTime(subtitleCues, frame.timestampMs);
    userContentParts.push({
      type: "text",
      text: `Frame at ${(frame.timestampMs / 1000).toFixed(1)}s:${subtitle ? ` (narrator: "${subtitle}")` : ""}`,
    });
    userContentParts.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${frameToBase64(frame.filePath)}`,
        detail: "low", // use "low" to reduce token cost; still good enough for UI analysis
      },
    });
  }

  userContentParts.push({
    type: "text",
    text: "Return the JSON array of demo steps for these frames.",
  });

  const body = {
    model,
    messages: [
      { role: "system", content: buildSystemPrompt(options) },
      { role: "user", content: userContentParts },
    ],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "[]";
  return parseAiResponse(text, batch);
}

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic Claude
// ─────────────────────────────────────────────────────────────────────────────

async function anthropicAnalyzeBatch(batch, subtitleCues, options, apiKey) {
  const model = options.model || "claude-3-5-sonnet-20241022";
  const url = "https://api.anthropic.com/v1/messages";

  const userContentParts = [];

  for (const frame of batch) {
    const subtitle = getSubtitleAtTime(subtitleCues, frame.timestampMs);
    userContentParts.push({
      type: "text",
      text: `Frame at ${(frame.timestampMs / 1000).toFixed(1)}s:${subtitle ? ` (narrator: "${subtitle}")` : ""}`,
    });
    userContentParts.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: frameToBase64(frame.filePath),
      },
    });
  }

  userContentParts.push({
    type: "text",
    text: 'Return ONLY a valid JSON array of demo steps. Start your response with "[" and end with "]".',
  });

  const body = {
    model,
    max_tokens: 4096,
    system: buildSystemPrompt(options),
    messages: [{ role: "user", content: userContentParts }],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text || "[]";
  return parseAiResponse(text, batch);
}

// ─────────────────────────────────────────────────────────────────────────────
// Text-only fallback (no images)
// ─────────────────────────────────────────────────────────────────────────────

async function textOnlyAnalysis(frames, subtitleCues, options) {
  log("   📝 Text-only mode: using OCR + subtitles");

  const allSteps = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < frames.length; i += BATCH_SIZE) {
    const batch = frames.slice(i, i + BATCH_SIZE);
    const steps = await textOnlyBatchAnalysis(batch, subtitleCues, options);
    allSteps.push(...steps);
  }

  return deduplicateSteps(allSteps);
}

async function textOnlyBatchAnalysis(batch, subtitleCues, options) {
  const provider = options.provider || detectProvider();

  // Build a text description of each frame
  const frameDescriptions = batch.map((frame) => {
    const subtitle = getSubtitleAtTime(subtitleCues, frame.timestampMs);
    const ocr = ocrFrame(frame.filePath);

    const parts = [`[${(frame.timestampMs / 1000).toFixed(1)}s]`];
    if (subtitle) parts.push(`Narrator: "${subtitle}"`);
    if (ocr) parts.push(`Screen text: ${ocr.slice(0, 300)}`);

    return parts.join(" | ");
  });

  const prompt = `${buildSystemPrompt(options)}

Analyze this transcript of a product demo video (no images available):

${frameDescriptions.join("\n")}

Return a JSON array of demo steps.`;

  // If we have a text model available, use it
  if (provider === "gemini" || options.apiKey || process.env.GEMINI_API_KEY) {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    const model = options.model || "gemini-2.0-flash";

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        return parseAiResponse(text, batch);
      }
    } catch { /* fall through */ }
  }

  // Absolute fallback: synthesize basic steps from subtitles alone
  return synthesizeFromSubtitles(batch, subtitleCues);
}

// ─────────────────────────────────────────────────────────────────────────────
// Subtitle-only synthesizer (last resort)
// ─────────────────────────────────────────────────────────────────────────────

function synthesizeFromSubtitles(frames, subtitleCues) {
  const steps = [];
  let lastSubtitle = "";

  for (const frame of frames) {
    const subtitle = getSubtitleAtTime(subtitleCues, frame.timestampMs);
    if (!subtitle || subtitle === lastSubtitle) {
      steps.push({
        timestampMs: frame.timestampMs,
        action: "wait",
        value: "1000",
        notes: subtitle || "No action identified at this timestamp",
      });
      continue;
    }
    lastSubtitle = subtitle;

    // Heuristic: detect common demo patterns in narration
    const lower = subtitle.toLowerCase();
    if (lower.includes("click") || lower.includes("press") || lower.includes("select")) {
      steps.push({
        timestampMs: frame.timestampMs,
        action: "click",
        target: "button, [role='button']",
        notes: subtitle,
        zoom: lower.includes("create") || lower.includes("submit") || lower.includes("send"),
      });
    } else if (lower.includes("type") || lower.includes("enter") || lower.includes("search") || lower.includes("input")) {
      steps.push({
        timestampMs: frame.timestampMs,
        action: "type",
        target: "input, textarea",
        value: "<text from video>",
        notes: subtitle,
      });
    } else if (lower.includes("navigate") || lower.includes("go to") || lower.includes("open")) {
      steps.push({
        timestampMs: frame.timestampMs,
        action: "goto",
        target: "/",
        notes: subtitle,
      });
    } else if (lower.includes("scroll") || lower.includes("down") || lower.includes("up")) {
      steps.push({
        timestampMs: frame.timestampMs,
        action: "scroll",
        value: "500",
        notes: subtitle,
      });
    } else {
      steps.push({
        timestampMs: frame.timestampMs,
        action: "wait",
        value: "1500",
        notes: subtitle,
      });
    }
  }

  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response parser
// ─────────────────────────────────────────────────────────────────────────────

function parseAiResponse(text, frames) {
  try {
    // Strip markdown code fences if present
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");

    // Handle OpenAI json_object wrapper e.g. {"steps": [...]}
    const parsed = JSON.parse(cleaned);
    const array = Array.isArray(parsed) ? parsed : (parsed.steps || parsed.actions || Object.values(parsed)[0]);

    if (!Array.isArray(array)) {
      log(`     ⚠️  AI returned non-array: ${cleaned.slice(0, 100)}`);
      return [];
    }

    // Normalize and validate each step
    return array
      .filter((s) => s && typeof s === "object" && s.action)
      .map((s) => ({
        timestampMs: typeof s.timestampMs === "number" ? s.timestampMs : (frames[0]?.timestampMs || 0),
        action: normalizeAction(s.action),
        target: s.target || undefined,
        value: s.value || undefined,
        zoom: s.zoom === true ? true : undefined,
        region: s.region || undefined,
        notes: s.notes || s.description || "",
        screenDescription: s.screenDescription || undefined,
      }));
  } catch (err) {
    log(`     ⚠️  Failed to parse AI response: ${err.message}`);
    log(`     Raw: ${text.slice(0, 200)}`);
    return [];
  }
}

function normalizeAction(action) {
  const map = {
    "navigate": "goto",
    "navigation": "goto",
    "open": "goto",
    "tap": "click",
    "press": "click",
    "input": "type",
    "fill": "type",
    "write": "type",
    "pause": "wait",
    "delay": "wait",
  };
  return map[action?.toLowerCase()] || action?.toLowerCase() || "wait";
}

// ─────────────────────────────────────────────────────────────────────────────
// Deduplication: merge consecutive identical actions
// ─────────────────────────────────────────────────────────────────────────────

function deduplicateSteps(steps) {
  if (steps.length === 0) return [];

  const sorted = [...steps].sort((a, b) => a.timestampMs - b.timestampMs);
  const result = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1];
    const curr = sorted[i];

    // Merge consecutive waits
    if (prev.action === "wait" && curr.action === "wait" && curr.timestampMs - prev.timestampMs < 3000) {
      prev.value = String(
        Math.max(parseInt(prev.value || "1000"), parseInt(curr.value || "1000"))
      );
      continue;
    }

    // Merge identical consecutive clicks on same target
    if (prev.action === curr.action && prev.target === curr.target && curr.timestampMs - prev.timestampMs < 2000) {
      continue;
    }

    result.push(curr);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function getApiKey(provider) {
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
