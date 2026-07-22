# OpenDemo JSON Configuration Guide

OpenDemo uses Playwright to script browser interactions and record them into cinematic, smooth product demos. You will write a JSON configuration file specifying the actions you want to take, and then you will execute the `run-demo.mjs` script.

## Writing the JSON Configuration

You must create a `.json` file that defines the viewport, recording settings, and the array of steps to execute.

### Base Structure:
```json
{
  "baseUrl": "http://localhost:3000",
  "recording": {
    "width": 1280,
    "height": 720,
    "fps": 120,
    "timeLapseWaitSegments": true,
    "timeLapseSpeedFactor": 4.0
  },
  "steps": [
    { "action": "goto", "target": "/dashboard" },
    { "action": "wait", "timeoutMs": 1500 },
    { "action": "click", "target": "#submit_btn", "zoom": { "durationMs": 1500 } },
    { "action": "type", "target": "#username", "value": "test_user", "durationMs": 600 }
  ]
}
```

### Supported Actions:
- `goto`: Navigates to the given target URL.
- `click`: Clicks the element at the `target` CSS selector. It will smoothly animate the mouse, auto-scroll the page if necessary, and execute the click.
- `type`: Types the `value` into the `target` CSS selector. Supports an optional `durationMs` window (default `1000`ms) so typing speed dynamically scales to finish within the window. Playwright natively clears existing text and types with a brisk, human-like typewriter effect. **Do NOT put a redundant `click` or `wait` step right before `type`.**
- `scroll`: Scrolls the page. Supports a `mode: "smooth"` parameter for interpolated smooth scrolling.
- `wait`: Pauses execution for `timeoutMs`. Useful for letting animations or network requests settle.

### Attaching Zoom:
You can attach a `zoom` property to any `click` or `type` step to create a cinematic punch-in.
- Example: `"zoom": true` (defaults to 1400ms duration)
- Example: `"zoom": { "durationMs": 1000 }`
- **Selective Zooming:** Do NOT attach zooms to every action! Only use zooms on major focal points or core feature demonstrations.

---

## Serving Local Targets (the "serve" block)

A flow can target local content with nothing running beforehand. Add a
`serve` block and run-demo starts (and stops) the server itself; the served
URL overrides `baseUrl` for that run:

```json
// Folder of static or built files (built-in zero-dep file server)
"serve": { "dir": "../client-repo/dist" }

// Client repo that needs its own dev server
"serve": { "command": "npm run dev", "cwd": "../client-repo", "port": 5173,
           "readyPath": "/", "readyTimeoutMs": 90000 }
```

This means a demo target can be a hosted URL, a folder of HTML, a built SPA,
or a full dev-served repo — no manual server babysitting.

---

## Template Videos (render-mimic.mjs) — RECOMMENDED for mimicking reference videos

To produce a template .mp4 that closely mimics a reference demo video
(dimensions, cuts, transitions, animation rhythm), use the direct renderer.
No browser, no cursor walkthrough, no API keys:

```bash
# Stage 1: analyze the reference and render the template video
node render-mimic.mjs https://youtu.be/XXXX --output template.mp4
#   → template.mp4                 the rendered template video
#   → template.template.json      the EDITABLE timeline (scenes, palettes,
#                                  cuts, transitions, pulses, scrolls, pans)
#   → template.score.json         automatic similarity report vs the reference

# Iterate: edit the JSON (timing, colors, events), re-render, re-score
node render-mimic.mjs template.template.json --output template.mp4 --reference <ref>
```

**Stage 2 personalization (AI assistants):** edit the template JSON —
set `scenes[i].image` to product screenshots (auto-scaled), adjust
`bg`/`panel`/`accent` to brand colors, tweak timeline events — then re-render
and re-score against the same reference. `_meta.personalization` in the JSON
is the machine-readable contract.

The template's content comes from the reference itself: sparse beats become
clean text slides using the reference's OCR'd words (progressive word-reveal),
dense beats use the reference's own keyframes as backgrounds. Both live in
`<output>-assets/` and the template JSON — edit words, swap images, retime.

The evaluator scores 7 dimensions (including `density` — whitespace/content
density, which catches "cluttered wireframe vs clean slides") and reports a
per-segment breakdown (8 windows) so you can iterate on the WORST part of the
video. Calibration on a real YouTube product demo (Mem): rendered templates
score ~0.70 (cuts 1.0, color 0.95, density 0.81) and are visually the same
class of video; the old walkthrough approach scored 0.42 and looked nothing
like it. Known OCR limitation: stylized display fonts can misread — beat.text
is editable, fix words in the template JSON.

---

## Video Mimic Mode — Walkthrough Pipeline (mimic-demo.mjs)

Use this OLDER pipeline when you want a Playwright-recorded WALKTHROUGH of an
actual product UI (cursor, typing, clicks) rather than a motion-graphics
template video.

Instead of writing a JSON config from scratch, you can analyze a reference demo video and generate a template automatically:

```bash
node mimic-demo.mjs <youtube-url-or-local-video> [options]
```

**Stage 1 — generic, scoreable template.** `mimic-demo.mjs` outputs:
- `<output>.json` — the template, with steps mirroring the reference's flow and pacing
- `<output>-mock/` — a generated mock page (palette-matched scenes, inputs and
  buttons at the detected screen regions, transitions where the reference had
  animations). The template's selectors point at the mock and a `serve` block
  serves it, so **stage 1 runs and scores immediately, no product needed**:

```bash
node run-demo.mjs my-demo.json
node evaluate-mimic.mjs <reference> recordings/<hash>.webm
```

Iterate on the template (timing, order, waits) until the score is acceptable.
The scored template is the deliverable of stage 1.

**Stage 2 — personalization (by an AI assistant).** The assistant adapts the
scored template to a real product: replaces mock selectors with real DOM
selectors, sets `baseUrl` (hosted app) or a `serve` block (local client repo),
fills real values, keeps step order and waits. Then re-run + re-score against
the same reference. `_mimicMeta.adapterNotes` in the template is the full
machine-readable contract for this step.

### Mimic Options
```
--target-url <url>     Your product's base URL (default: http://localhost:3000)
--output <file>        Output JSON path (default: ./mimic-output.json)
--fps <n>              Frames per second to extract (default: 0.5)
--max-frames <n>       Cap total frames analyzed (default: 60)
--provider <name>      gemini | openai | anthropic | text-only
--model <name>         Override AI model name
--api-key <key>        Override API key (else reads from env)
--captions-only        Text-only mode: subtitles + OCR, no image sending
--keep-frames          Retain extracted frames for debugging
--frames-dir <path>    Custom frames output directory
--no-mock              Skip stage-1 mock generation (template placeholders only)
--mock-dir <path>      Where to write the mock (default: <output>-mock/)
```

### Example
```bash
# Analyze a YouTube reference video and generate a template for your product
node mimic-demo.mjs https://www.youtube.com/watch?v=XXXXXXX \
  --target-url https://myapp.com \
  --output my-product-demo.json

# Run the adapted template
node run-demo.mjs my-product-demo.json
```

### Analysis Modes
| Mode | When | Quality |
|---|---|---|
| **Vision** | `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY` is set | High — model sees UI frames and guesses selectors |
| **Local CV** (default) | No API key found | Good — video pixels analyzed directly, no network |
| **Text-only** | `--captions-only` | Medium — OCR + subtitles only |

Vision mode sends each extracted frame as a base64 image to the model.
**Local CV mode needs no API key at all**: it reads the video's pixels and
detects cuts, scrolls, typing rhythms, clicks, and animated transitions
(zooms/modals) from frame-to-frame change signals. Selectors are emitted as
placeholders with screen-region hints (plus OCR text if tesseract is
installed) for an agent to fill in.

### The Output Template
The generated JSON is a standard OpenDemo flow file with extra `_notes`, `_screenHint`, and `_mimicMeta` fields providing context. An AI agent should:
1. Read `_mimicMeta.adapterNotes` to understand what needs changing
2. Inspect your product's DOM to update CSS selectors
3. Fill in `<YOUR_VALUE_HERE>` type-step placeholders
4. Remove `_` prefixed fields before running (they are documentation only)

---

## Evaluating Mimic Quality (Local, No API Key)

After running a generated template, score how closely the recording mimics
the reference video:

```bash
node evaluate-mimic.mjs <reference-video-or-url> <generated-video> [options]
```

Both arguments accept local files (`.mp4`, `.webm`, `.gif`, ...) or
YouTube/yt-dlp URLs. Everything runs locally via ffmpeg — no API keys.

### Scored Dimensions (each 0–1)
| Dimension | What it measures | Default weight |
|---|---|---|
| `color` | Palette / overall look (global + timeline histograms) | 0.20 |
| `motion` | Animation dynamics — how much moves, and when | 0.25 |
| `cuts` | Hard-cut count + timing alignment | 0.15 |
| `structure` | Layout similarity of time-aligned frames (dHash) | 0.10 |
| `pacing` | Duration ratio + active/idle rhythm | 0.10 |
| `events` | Effect mix: scrolls, pans, animations/zooms, micro-activity | 0.20 |

### Options
```
--json <file>        Write the full report as JSON
--min-score <0..1>   Exit code 1 if overall score is below (for CI loops)
--sample-fps <n>     Analysis sampling rate (default: 8)
--weights <json>     Override weights, e.g. '{"color":0.3,"motion":0.3}'
--quiet              Only print the overall score
```

### Score Interpretation (calibrated on test videos)
- `1.00` — identical video
- `>= 0.90` — same demo re-rendered (e.g. GIF vs mp4 scores ~0.93)
- `0.80–0.90` — faithful mimic with encoding/timing drift
- `0.45–0.65` — partial mimic (e.g. only half the flow reproduced)
- `< 0.35` — unrelated content

### Iteration Loop
```bash
# 1. Generate template from reference (keyless local CV analysis)
node mimic-demo.mjs https://youtu.be/XXXX --target-url http://localhost:3000 --output demo.json

# 2. Adapt selectors/values in demo.json (see _mimicMeta.adapterNotes)

# 3. Record
node run-demo.mjs demo.json

# 4. Score against the reference; iterate on demo.json until it passes
node evaluate-mimic.mjs https://youtu.be/XXXX recordings/<hash>.webm --json report.json --min-score 0.7
```
The JSON report's `notes` array names the weakest dimensions — use it to
decide what to fix (timing, missing scrolls, palette, missing transitions).
