#!/usr/bin/env node
/**
 * run-demo.mjs
 * Standalone headless cinematic demo runner for OpenScreen.
 *
 * Usage:
 *   node run-demo.mjs [flow.json]        — run a specific flow file
 *   node run-demo.mjs                    — run the built-in Bing demo
 *
 * Cinematic features:
 *   - action: "type"       → character-by-character typewriter effect
 *   - action: "click"      → animated cursor movement to target
 *   - action: "click-zoom" → animated cursor + CSS zoom around target before click + ZoomRegion metadata
 *   - action: "press-enter"→ animated cursor to target, then Enter key
 *   - action: "wait"       → wait for element or timeout
 *   - action: "wait-for-search-results" → waits for URL change
 *   - action: "goto"       → navigate to URL
 *   - action: "assert"     → assert element presence/text
 *
 * Outputs:
 *   - recordings/<hash>.webm           the raw recording
 *   - recordings/<hash>.project.json   OpenScreen project with ZoomRegions pre-authored
 */

import { chromium } from "playwright";
import { mkdirSync, existsSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ────────────────────────────────────────────────
// Chromium path detection
// (Playwright v1.49+ uses headless-shell by default,
//  which cannot record video via CDP. We use full Chromium.)
// ────────────────────────────────────────────────
function getFullChromiumPath() {
  const candidates = [
    join(homedir(), "AppData", "Local", "ms-playwright", "chromium-1228", "chrome-win64", "chrome.exe"),
    join(homedir(), "AppData", "Local", "ms-playwright", "chromium-1229", "chrome-win64", "chrome.exe"),
    join(homedir(), "AppData", "Local", "ms-playwright", "chromium-1230", "chrome-win64", "chrome.exe"),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

// ────────────────────────────────────────────────
// Built-in demo: Bing "chicken wing" search
// Bing works reliably headless; Google hits CAPTCHA
// ────────────────────────────────────────────────
const BING_DEMO_FLOW = {
  baseUrl: "https://www.bing.com",
  credentials: { type: "basic" },
  steps: [
    { action: "goto", target: "https://www.bing.com", timeoutMs: 15000 },
    { action: "wait", target: "#sb_form_q, input[name='q']", timeoutMs: 8000 },
    { action: "type", target: "#sb_form_q, input[name='q']", value: "chicken wing" },
    { action: "wait", timeoutMs: 800 },
    // click-zoom on the search button — agent deems this worth zooming
    { action: "click-zoom", target: "#search_icon, [aria-label='Search'], button[type='submit']", timeoutMs: 5000 },
    { action: "wait-for-search-results" },
    { action: "wait", timeoutMs: 2500 },
  ],
  recording: { width: 1280, height: 720, fps: 60 },
};

// ────────────────────────────────────────────────
// Easing functions
// ────────────────────────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ────────────────────────────────────────────────
// Mouse animation
// ────────────────────────────────────────────────
async function animatedMouseMove(page, fromX, fromY, toX, toY, durationMs = 500) {
  const fps = 60;
  const frameMs = 1000 / fps;
  const steps = Math.max(1, Math.ceil(durationMs / frameMs));

  for (let i = 1; i <= steps; i++) {
    const t = easeInOutCubic(i / steps);
    const x = fromX + (toX - fromX) * t;
    const y = fromY + (toY - fromY) * t;
    await page.mouse.move(x, y);
    // Do NOT await the evaluate call, otherwise the CDP round-trip latency will destroy the 60fps loop timing
    page.evaluate(([cx, cy]) => window.updateVisibleCursor?.(cx, cy), [x, y]).catch(()=>{});
    if (i < steps) {
      await page.waitForTimeout(frameMs);
    }
  }
}

// Cinematic click with zoom removed in favor of attachable zoom property.

// ────────────────────────────────────────────────
// Step executor
// ────────────────────────────────────────────────
const MAX_RETRIES = 2;
const DEFAULT_TIMEOUT = 30000;

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

async function executeStep(page, step, flow, zoomRegions, currentTimeMs) {
  const timeout = step.timeoutMs ?? DEFAULT_TIMEOUT;
  const vp = page.viewportSize() ?? { width: 1280, height: 720 };

  // Helper: resolve first working selector
  async function resolveSelector(selectorStr, state = "visible", timeoutMs = 5000) {
    const sels = selectorStr.split(",").map((s) => s.trim());
    for (const sel of sels) {
      try {
        const el = await page.waitForSelector(sel, { state, timeout: timeoutMs });
        if (el) return { el, sel };
      } catch {
        // try next
      }
    }
    return null;
  }

  if (step.zoom && step.target) {
    const resolved = await resolveSelector(step.target);
    if (resolved) {
      const box = await resolved.el.boundingBox();
      if (box) {
        const focusCx = (box.x + box.width / 2) / vp.width;
        const focusCy = (box.y + box.height / 2) / vp.height;
        const duration = typeof step.zoom === 'object' && step.zoom.durationMs ? step.zoom.durationMs : 1000;
        zoomRegions.push(makeZoomRegion(currentTimeMs(), focusCx, focusCy, duration));
      }
    }
  }

  if (step.zoom && step.target) {
    const resolved = await resolveSelector(step.target);
    if (resolved) {
      const box = await resolved.el.boundingBox();
      if (box) {
        const focusCx = (box.x + box.width / 2) / vp.width;
        const focusCy = (box.y + box.height / 2) / vp.height;
        const duration = typeof step.zoom === 'object' && step.zoom.durationMs ? step.zoom.durationMs : 1000;
        zoomRegions.push(makeZoomRegion(currentTimeMs(), focusCx, focusCy, duration));
      }
    }
  }

  switch (step.action) {
    case "goto": {
      const url = step.target?.startsWith("http")
        ? step.target
        : `${flow.baseUrl}${step.target || ""}`;
      await page.goto(url, { waitUntil: "load", timeout });
      // Wait an extra 0.5s to let the page settle visually before starting movements
      await page.waitForTimeout(500);
      
      // Update Node's mouse pos because the new page might have picked a new random start!
      page._lastMousePos = await page.evaluate(() => {
        return { x: window.__lastCursorX || (window.innerWidth / 2), y: window.__lastCursorY || 80 };
      }).catch(() => null);
      break;
    }

    case "type": {
      if (!step.target) throw new Error("type requires target");
      if (!step.value) throw new Error("type requires value");
      const resolved = await resolveSelector(step.target);
      if (!resolved) throw new Error(`No typeable element: ${step.target}`);

      // Click to focus
      const box = await resolved.el.boundingBox();
      if (box) {
        // Animate cursor to element
        const currentPos = page._lastMousePos ?? { x: vp.width / 2, y: 80 };
        const targetX = box.x + box.width / 2;
        const targetY = box.y + box.height / 2;
        await animatedMouseMove(page, currentPos.x, currentPos.y, targetX, targetY, 400);
        page._lastMousePos = { x: targetX, y: targetY };
      }
      await resolved.el.click();
      const lastMouse = page._lastMousePos || { x: vp.width / 2, y: 80 };
      await page.evaluate(([x, y]) => window.showClickRipple?.(x, y), [lastMouse.x, lastMouse.y]).catch(()=>{});
      await page.waitForTimeout(100);

      // Clear existing value
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Delete");

      // Typewriter effect — character by character
      for (const char of step.value) {
        await page.keyboard.type(char, { delay: 0 });
        // Natural typing speed: 50-110ms per character (~80-120wpm)
        const delay = 50 + Math.random() * 60;
        await page.waitForTimeout(delay);
      }
      break;
    }

    case "click": {
      if (!step.target) throw new Error("click requires target");
      const resolved = await resolveSelector(step.target, "visible", timeout);
      if (!resolved) throw new Error(`No clickable element: ${step.target}`);
      const box = await resolved.el.boundingBox();
      if (box) {
        const targetX = box.x + box.width / 2;
        const targetY = box.y + box.height / 2;
        const currentPos = page._lastMousePos ?? { x: vp.width / 2, y: 80 };
        await animatedMouseMove(page, currentPos.x, currentPos.y, targetX, targetY, 500);
        page._lastMousePos = { x: targetX, y: targetY };
        await page.waitForTimeout(100);
        await page.mouse.click(targetX, targetY);
        await page.evaluate(([x, y]) => window.showClickRipple?.(x, y), [targetX, targetY]).catch(()=>{});
      } else {
        await page.click(resolved.sel);
      }
      await page.waitForTimeout(1200);
      break;
    }



    case "press": {
      if (!step.value) throw new Error("press requires 'value' (e.g. 'Escape', 'Enter')");
      if (step.target) {
        const resolved = await resolveSelector(step.target, "visible", 3000);
        if (!resolved) throw new Error(`No element for press: ${step.target}`);
        await page.press(resolved.sel, step.value);
      } else {
        await page.keyboard.press(step.value);
      }
      await page.waitForTimeout(step.timeoutMs || 500);
      break;
    }
    case "press-enter": {
      if (!step.target) throw new Error("press-enter requires target");
      const resolved = await resolveSelector(step.target, "visible", 3000);
      if (!resolved) throw new Error(`No element for press-enter: ${step.target}`);
      await page.press(resolved.sel, "Enter");
      await page.waitForTimeout(1500);
      break;
    }

    case "wait": {
      if (step.target) {
        const sels = step.target.split(",").map((s) => s.trim());
        // Race all selectors
        let found = false;
        await Promise.race(
          sels.map((sel) =>
            page
              .waitForSelector(sel, { state: "visible", timeout })
              .then(() => { found = true; })
              .catch(() => {})
          )
        );
        await page.waitForTimeout(200);
        if (!found) {
          const url = page.url();
          if (url.includes("q=") || url.includes("/search")) {
            log(`   ℹ️  URL changed to search results, continuing`);
          } else {
            throw new Error(`Element not found: ${step.target}`);
          }
        }
      } else {
        await page.waitForTimeout(step.timeoutMs ?? 1000);
      }
      break;
    }

    case "wait-for-search-results": {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const url = page.url();
        const isSearchPage =
          (url.includes("q=") && !url.match(/\.(com|org|net|io)\/?$/)) ||
          url.includes("/search") ||
          url.includes("search?");
        if (isSearchPage) {
          log(`   ℹ️  Search results: ${url.slice(0, 70)}`);
          await page.waitForTimeout(2500);
          return;
        }
        await page.waitForTimeout(500);
      }
      throw new Error("Timed out waiting for search results");
    }

    case "assert": {
      if (!step.target) throw new Error("assert requires target");
      const el = await page.waitForSelector(step.target, { state: "visible", timeout });
      if (!el) throw new Error(`Assertion failed: ${step.target} not found`);
      if (step.value) {
        const text = await el.textContent();
        if (text !== step.value) {
          throw new Error(`Assertion failed: expected "${step.value}", got "${text}"`);
        }
      }
      break;
    }

    case "scroll": {
      const distance = step.value || "bottom";
      if (step.zoom) {
        const clickTimeMs = currentTimeMs();
        zoomRegions.push(makeClickZoomRegion(clickTimeMs, 0.5, 0.5));
      }
      
      const mode = step.mode || "smooth"; // "smooth" or "linear"
      if (distance === "bottom") {
        const viewportSize = page.viewportSize();
        if (viewportSize) {
          await page.mouse.move(viewportSize.width / 2, viewportSize.height / 2);
        }
        
        const totalScrolls = step.scrolls || 60;
        const totalDistance = step.totalDistance || 6000;
        
        if (mode === "linear") {
          const dy = Math.round(totalDistance / totalScrolls);
          for (let i = 0; i < totalScrolls; i++) {
            await page.mouse.wheel(0, dy);
            await page.waitForTimeout(30);
          }
        } else if (mode === "smooth") {
          // Easing function: cubic ease in-out
          const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          
          let accumulatedDistance = 0;
          for (let i = 1; i <= totalScrolls; i++) {
            const t = i / totalScrolls;
            const currentTotalDistance = Math.round(easeInOutCubic(t) * totalDistance);
            const dy = currentTotalDistance - accumulatedDistance;
            accumulatedDistance = currentTotalDistance;
            
            await page.mouse.wheel(0, dy);
            // Wait ~16ms (1 frame at 60fps) to make the scrolling smooth and continuous
            await page.waitForTimeout(16);
          }
        }
      } else {
        await page.mouse.wheel(0, parseInt(distance));
      }
      await page.waitForTimeout(1000);
      break;
    }

    default:
      throw new Error(`Unknown action: ${step.action}`);
  }
}

async function executeStepWithRetry(page, stepIndex, step, flow, zoomRegions, currentTimeMs) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        log(`  ⚠️  Retrying step ${stepIndex} (attempt ${attempt + 1})...`);
      }
      await executeStep(page, step, flow, zoomRegions, currentTimeMs);
      return true;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        log(`  ❌ Step ${stepIndex} failed: ${err.message}`);
        return false;
      }
      await page.waitForTimeout(800);
    }
  }
  return false;
}

// ────────────────────────────────────────────────
// OpenScreen project file generator
// Produces the exact format consumed by projectPersistence.normalizeProjectEditor()
// The raw .webm is the source; OpenScreen applies background, padding, zoom easing on export.
// ────────────────────────────────────────────────
function generateOpenScreenProject(videoPath, zoomRegions, flow) {
  return {
    // v2 schema expected by projectPersistence.ts
    version: 2,
    media: {
      screenVideoPath: videoPath,
    },
    editor: {
      // Layout
      wallpaper: `/wallpapers/wallpaper${Math.floor(Math.random() * 18) + 1}.jpg`,
      padding: 50,                                // 50% of the 0-100 range → nice margin
      aspectRatio: "16:9",
      cropRegion: { x: 0, y: 0, width: 1, height: 1 },

      // Appearance
      borderRadius: 12,
      shadowIntensity: 0.6,
      showBlur: false,
      showTrimWaveform: true,
      motionBlurAmount: 0.35,

      // Zoom regions authored from click-zoom steps
      zoomRegions,
      autoZoomEnabled: false,   // we've already set manual zooms — don't let auto overwrite
      autoFocusAll: false,

      // Empty regions
      trimRegions: [],
      speedRegions: [],
      annotationRegions: [],

      // Webcam (none for browser demos)
      webcamLayoutPreset: "no-webcam",
      webcamMaskShape: "rectangle",
      webcamMirrored: false,
      webcamReactiveZoom: true,
      webcamSizePreset: 25,
      webcamPosition: null,

      // Cursor
      cursorTheme: "default",

      // Export defaults
      exportQuality: "good",
      exportFormat: "mp4",
      gifFrameRate: 15,
      gifLoop: true,
      gifSizePreset: "medium",
    },
    _meta: {
      generatedBy: "run-demo.mjs",
      generatedAt: new Date().toISOString(),
    },
  };
}

// Build a single ZoomRegion in OpenScreen's format for a click-zoom event.
// Uses the same duration philosophy as the editor's auto-suggest:
//   - Start 500ms before the click (approach / pre-zoom)
//   - Hold for ~3000ms after (long enough to see the result)
//   = total ~3500ms window, centered on the click
function makeZoomRegion(clickTimeMs, focusCx, focusCy, durationMs = 1000) {
  return {
    id: `zoom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    startMs: clickTimeMs,
    endMs: clickTimeMs + durationMs,
    depth: 3,          // OpenScreen depth 3 = 1.8x scale (ZOOM_DEPTH_SCALES)
    customScale: 1.8,  // explicit override matches depth:3 exactly
    focus: {
      cx: Math.max(0.05, Math.min(0.95, focusCx)),
      cy: Math.max(0.05, Math.min(0.95, focusCy)),
    },
    focusMode: "manual",
    source: "auto",   // "auto" = generated, can be promoted to "manual" by editing
  };
}


// ────────────────────────────────────────────────
// Main runner
// ────────────────────────────────────────────────
async function runFlow(flow) {
  const recordingsDir = resolve(__dirname, "recordings");
  if (!existsSync(recordingsDir)) {
    mkdirSync(recordingsDir, { recursive: true });
  } else {
    for (const file of readdirSync(recordingsDir)) {
      if (file.endsWith(".webm") || file.endsWith(".json") || file.endsWith(".mp4") || file.endsWith(".openscreen") || file.endsWith(".gif")) {
        try { rmSync(join(recordingsDir, file), { recursive: true, force: true }); } catch {}
      }
    }
  }

  const executablePath = getFullChromiumPath();
  if (executablePath) {
    log(`🔍 Chromium: ${executablePath}`);
  } else {
    log("⚠️  Full Chromium not found — video recording may fail");
  }

  log("🚀 Launching headless browser...");

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--max-gum-fps=60", // hint Chromium to capture at up to 60fps
    ],
  });

  const context = await browser.newContext({
    viewport: { width: flow.recording.width, height: flow.recording.height },
    recordVideo: {
      dir: recordingsDir,
      size: { width: flow.recording.width, height: flow.recording.height },
    },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });

  await context.addInitScript(() => {
    // We will use localStorage just in case it helps for same-origin, but rely on Node updates for cross-origin
    const rx = Math.floor(Math.random() * (window.innerWidth - 100)) + 50;
    const ry = Math.floor(Math.random() * (window.innerHeight - 100)) + 50;
    const lastX = localStorage.getItem('__cursorX') || rx;
    const lastY = localStorage.getItem('__cursorY') || ry;
    window.__lastCursorX = parseFloat(lastX);
    window.__lastCursorY = parseFloat(lastY);

    document.addEventListener('DOMContentLoaded', () => {
      if (!document.getElementById('__cursorStyles')) {
        const style = document.createElement('style');
        style.id = '__cursorStyles';
        style.innerHTML = `
          .click-ripple {
            position: fixed;
            border-radius: 50%;
            border: 2px solid rgba(0, 150, 255, 0.8);
            background: rgba(0, 150, 255, 0.2);
            pointer-events: none;
            z-index: 2147483646;
            animation: ripple-anim 0.4s ease-out forwards;
            transform: translate(-50%, -50%);
          }
          @keyframes ripple-anim {
            0% { width: 0; height: 0; opacity: 1; }
            100% { width: 40px; height: 40px; opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      if (!window.__visibleCursor) {
        const cursor = document.createElement('div');
        cursor.id = '__visibleCursor';
        cursor.innerHTML = '<svg width="28" height="32" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 28.5L0.5 0.5L23.5 16.5L13.5 19.5L19 30L15.5 32L10 21.5L2.5 28.5Z" fill="black" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>';
        cursor.style.position = 'fixed';
        cursor.style.left = '0px';
        cursor.style.top = '0px';
        cursor.style.width = '28px';
        cursor.style.height = '32px';
        cursor.style.zIndex = '2147483647';
        cursor.style.pointerEvents = 'none';
        cursor.style.transition = 'none';
        cursor.style.transformOrigin = 'top left';
        cursor.style.transform = `translate(${window.__lastCursorX}px, ${window.__lastCursorY}px)`;
        cursor.style.filter = 'drop-shadow(0px 2px 4px rgba(0,0,0,0.4))';
        document.documentElement.appendChild(cursor);
        window.__visibleCursor = cursor;
      }
    });

    window.updateVisibleCursor = (x, y) => {
      window.__lastCursorX = x;
      window.__lastCursorY = y;
      try { localStorage.setItem('__cursorX', x); localStorage.setItem('__cursorY', y); } catch(e){}
      if (window.__visibleCursor) {
        window.__visibleCursor.style.transform = `translate(${x}px, ${y}px)`;
      }
    };

    window.showClickRipple = (x, y) => {
      const ripple = document.createElement('div');
      ripple.className = 'click-ripple';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      document.documentElement.appendChild(ripple);
      setTimeout(() => ripple.remove(), 400);
    };
  });

  const page = await context.newPage();

  log(`🎬 Recording started — ${flow.recording.width}x${flow.recording.height} @ ${flow.recording.fps}fps`);
  log("");

  // Track recording start time for ZoomRegion timestamps
  const startWallClock = Date.now();
  const currentTimeMs = () => Date.now() - startWallClock;

  const zoomRegions = [];
  const speedupSegments = [];
  let failedStep = -1;

  page._lastMousePos = await page.evaluate(() => {
    return { x: window.__lastCursorX || (window.innerWidth / 2), y: window.__lastCursorY || 80 };
  }).catch(() => null);

  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    if (step.action === "login") continue;

    const desc = [step.action, step.target, step.value].filter(Boolean).join(" → ");
    log(`▶  Step ${i}: ${desc}`);

    const isWait = step.action === "wait" || step.action === "wait-for-search-results";
    const waitStartMs = isWait ? currentTimeMs() : 0;

    const ok = await executeStepWithRetry(page, i, step, flow, zoomRegions, currentTimeMs);
    
    if (isWait && ok) {
      const waitEndMs = currentTimeMs();
      if (waitEndMs - waitStartMs > 500) {
        speedupSegments.push({ startMs: waitStartMs, endMs: waitEndMs });
      }
    }

    if (!ok) {
      failedStep = i;
      break;
    }
    log(`   ✅ done`);
  }

  // Get path before close
  const video = page.video();
  const videoPath = video ? await video.path() : undefined;

  await page.close();
  await context.close(); // video written here
  await browser.close();

  if (failedStep !== -1) {
    log(`\n💥 Demo FAILED at step ${failedStep}`);
    if (videoPath) log(`🎥 Partial video: ${videoPath}`);
    return { success: false, videoPath, failedStep };
  }

  let finalVideoPath = videoPath;

  if (flow.recording?.timeLapseWaitSegments && speedupSegments.length > 0 && finalVideoPath) {
    log(`\n⏩ Post-processing video to speed up ${speedupSegments.length} wait segment(s)...`);
    const { execSync } = await import("node:child_process");
    
    let filter = "";
    let concatParts = "";
    let lastTimeSec = 0;
    let partIdx = 0;
    const speedFactor = flow.recording?.timeLapseSpeedFactor || 4.0;
    
    
    for (const seg of speedupSegments) {
      const segStart = (seg.startMs / 1000).toFixed(3);
      const segEnd = (seg.endMs / 1000).toFixed(3);
      
      if (parseFloat(segStart) > lastTimeSec) {
        filter += `[0:v]trim=start=${lastTimeSec}:end=${segStart},setpts=PTS-STARTPTS[v${partIdx}]; `;
        concatParts += `[v${partIdx}]`;
        partIdx++;
      }
      filter += `[0:v]trim=start=${segStart}:end=${segEnd},setpts=${(1/speedFactor).toFixed(3)}*(PTS-STARTPTS)[v${partIdx}]; `;
      concatParts += `[v${partIdx}]`;
      partIdx++;
      lastTimeSec = parseFloat(segEnd);
    }
    filter += `[0:v]trim=start=${lastTimeSec},setpts=PTS-STARTPTS[v${partIdx}]; `;
    concatParts += `[v${partIdx}]`;
    partIdx++;
    filter += `${concatParts}concat=n=${partIdx}:v=1:a=0[out]`;

    const compressedVideoPath = finalVideoPath.replace(".webm", "-spedup.webm");
    
    try {
      execSync(`ffmpeg -y -i "${finalVideoPath}" -filter_complex "${filter}" -map "[out]" -c:v libvpx -crf 10 -b:v 2M "${compressedVideoPath}"`, { stdio: 'ignore' });
      // Adjust zoom regions timestamps
      for (const zr of zoomRegions) {
        let originalMs = zr.startMs;
        let compressedMs = originalMs;
        for (const seg of speedupSegments) {
          if (originalMs <= seg.startMs) continue;
          else if (originalMs <= seg.endMs) {
            const timeInSeg = originalMs - seg.startMs;
            const compressedTimeInSeg = timeInSeg / speedFactor;
            compressedMs -= (timeInSeg - compressedTimeInSeg);
          } else {
            const segDuration = seg.endMs - seg.startMs;
            compressedMs -= (segDuration - (segDuration / speedFactor));
          }
        }
        zr.startMs = compressedMs;
        zr.endMs = zr.startMs + (zr.endMs - zr.startMs); // Adjust endMs similarly
      }
      finalVideoPath = compressedVideoPath;
      log(`   ✅ Video sped up and ${zoomRegions.length} zoom timestamps adjusted.`);
    } catch (e) {
      log(`   ⚠️ FFmpeg speedup failed, falling back to original video. ${e.message}`);
    }
  }

  // Write OpenScreen project file alongside the video
  let projectPath;
  if (finalVideoPath) {
    const project = generateOpenScreenProject(finalVideoPath, zoomRegions, flow);
    const projectFile = finalVideoPath.replace(/\.webm$/, ".openscreen");
    writeFileSync(projectFile, JSON.stringify(project, null, 2), "utf8");
    projectPath = projectFile;
    log(`📄 OpenScreen project: ${projectFile}\n`);
  }

  log(`\n🎉 Demo completed!`);
  log(`🎥 Video: ${finalVideoPath}`);
  if (zoomRegions.length > 0) {
    log(`🔍 ${zoomRegions.length} zoom region(s) authored for OpenScreen editor`);
  }

  return { success: true, videoPath: finalVideoPath, projectPath, zoomRegions };
}

// ────────────────────────────────────────────────
// Entry point
// ────────────────────────────────────────────────
async function main() {
  let flow = BING_DEMO_FLOW;

  if (process.argv[2]) {
    const { readFileSync } = await import("node:fs");
    flow = JSON.parse(readFileSync(resolve(process.argv[2]), "utf8"));
    log(`📂 Loaded flow: ${process.argv[2]}`);
  } else {
    log("📝 Using built-in Bing 'chicken wing' demo");
  }

  log("─".repeat(55));

  // ── Step 1: record the raw browser session ────────────────────────────────
  const result = await runFlow(flow).catch((err) => {
    log(`\n💥 Fatal: ${err.message}`);
    if (err.stack) log(err.stack);
    process.exit(1);
  });

  // Write result summary
  const resultPath = resolve(__dirname, "recordings", "last-result.json");
  writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf8");

  if (!result?.success || !result.videoPath || !result.projectPath) {
    log(`\n💥 Recording failed — skipping OpenScreen render`);
    process.exit(1);
  }

  // ── Step 2: run through OpenScreen's full render pipeline ─────────────────
  // Spawn the built Electron app with HEADLESS_EXPORT_PROJECT pointing to the
  // .project.json we generated. The renderer's headless-export effect will:
  //   1. Load the project (wallpaper, zoom regions, padding, etc.)
  //   2. Run FrameRenderer to composite everything
  //   3. Write the MP4 and send headless-export-done IPC → main quits
  log("\n🎨 Passing through OpenScreen render pipeline...");
  log(`   Source : ${result.videoPath}`);
  log(`   Project: ${result.projectPath}`);

  const { spawn } = await import("node:child_process");
  const { statSync, watchFile } = await import("node:fs");

  // Derive output path: same name as source, with -openscreen.mp4 suffix
  const outputPath = result.videoPath.replace(/\.webm$/, "-openscreen.mp4");

  // Find the Electron binary (packaged app or dev node_modules)
  const electronBin = resolve(__dirname, "node_modules", ".bin", "electron.cmd");
  const electronFallback = resolve(__dirname, "node_modules", ".bin", "electron");
  const electronExe = existsSync(electronBin) ? electronBin : existsSync(electronFallback) ? electronFallback : "electron";

  // The result marker file the main process writes on export-done
  const resultMarkerPath = resolve(__dirname, "recordings", ".headless-export-result.json");
  // Remove any stale marker from a previous run
  try { const { unlinkSync } = await import("node:fs"); unlinkSync(resultMarkerPath); } catch {}

  const electronProc = spawn(
    electronExe,
    ["."],          // load from current dir (reads dist-electron/main.js)
    {
      cwd: __dirname,
      shell: process.platform === "win32",
      env: {
        ...process.env,
        HEADLESS: "true",
        HEADLESS_EXPORT_PROJECT: result.projectPath,
        HEADLESS_EXPORT_OUT: outputPath,
        // Suppress GPU errors in headless mode
        ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  // Wait for OpenScreen to finish (max 3 minutes — enough for typical demos)
  const TIMEOUT_MS = 3 * 60 * 1000;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      electronProc.kill();
      reject(new Error("OpenScreen render timed out after 3 minutes"));
    }, TIMEOUT_MS);

    // Because OpenScreen now transitions to UI mode instead of quitting, we resolve
    // when we see the success marker rather than waiting for process exit.
    electronProc.stdout.on("data", (d) => {
      const line = d.toString().trim();
      if (line) log(`   ${line}`);
      if (line.includes("✅ Export complete")) {
        clearTimeout(timer);
        resolve();
      }
    });

    electronProc.stderr.on("data", (d) => {
      const line = d.toString().trim();
      if (line) log(`   ${line}`);
    });

    electronProc.on("close", (code) => {
      clearTimeout(timer);
      // Only reject if it closed with an error before resolving.
      if (code !== 0 && code !== null) {
        reject(new Error(`OpenScreen exited with code ${code}`));
      }
    });
  });

  // Read the result marker
  let exportedPath = null;
  try {
    const { readFileSync } = await import("node:fs");
    const marker = JSON.parse(readFileSync(resultMarkerPath, "utf8"));
    if (marker.success) exportedPath = marker.outputPath;
  } catch {}

  if (exportedPath && existsSync(exportedPath)) {
    const sizeMb = (statSync(exportedPath).size / 1024 / 1024).toFixed(1);
    log(`\n✨ OpenScreen export complete!`);
    log(`🎥 Polished video (${sizeMb} MB): ${exportedPath}`);
    log(`   (Background, zoom, padding, and shadow all baked in)`);
  } else {
    log(`\n⚠️  OpenScreen render may have failed — check logs above`);
    log(`🎥 Raw recording still available: ${result.videoPath}`);
    log(`📄 Project file: ${result.projectPath}`);
    log(`   (Open the project in OpenScreen to apply visual treatment manually)`);
  }

  log(`\n🛎️ OpenScreen is waiting for your next move!`);
  log(`   (A mini window has popped up in the bottom right corner of your screen)`);
  
  // We do NOT call process.exit(0) here because we want to leave the Node script alive
  // to keep the Electron child process alive (which is now hosting the tray/editor).
}

main();

