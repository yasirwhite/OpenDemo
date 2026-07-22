# Agent Instructions for OpenDemo

**For exact JSON syntax, supported actions, and code usage, refer to: [USAGE.md](file:///C:/Users/Yasir/Desktop/Code/OpenDemo/USAGE.md)**

Welcome! If you are an AI agent tasked with creating a product demo video, you will use the OpenDemo engine.

**⚠️ CRITICAL NOTE:** The current functionality of OpenDemo is strictly intended for **web demos** only. It uses Playwright to automate headless browsers. It cannot interact with the operating system or native desktop applications.

---

## Template Video Renderer (`render-mimic.mjs`) — USE THIS to mimic a reference video

If the user wants a template video that looks/feels like a reference demo
video (same dimensions, cuts, transitions, animation rhythm), do NOT record a
browser walkthrough — polished demo videos have no cursor. Use the direct
renderer instead (fully local, no API key, no browser):

```bash
node OpenDemo/render-mimic.mjs <reference-video-or-url> --output template.mp4
```

Outputs: `template.mp4` (the video), `template.template.json` (editable
timeline), `template.score.json` (auto-evaluation vs the reference).

**Iteration loop:** edit the `.template.json` (event timing, palettes,
scene images), then:
```bash
node OpenDemo/render-mimic.mjs template.template.json --output template.mp4 --reference <ref>
```
Repeat until the score is acceptable (~0.7+ overall is a good template;
`structure` scores low by design when the product differs).

**Stage-2 personalization:** set `scenes[i].image` to real product
screenshots and adjust palettes — see `_meta.personalization` inside the JSON.

---

## Walkthrough Mimic Pipeline (`mimic-demo.mjs`)

Use this only when the user wants a recorded UI WALKTHROUGH (cursor
movement, typing, clicking a real web app) rather than a template video.

If the user has provided a **reference demo video** (YouTube URL or local file) that they want to replicate for their own product, use the Video Mimic pipeline **instead** of manually writing a JSON config from scratch.

### How It Works (Two-Stage)
1. Downloads the reference video and extracts frames (1 frame every 2s by default)
2. Sends frames to an AI vision model (Gemini / OpenAI / Anthropic) for frame-by-frame interaction analysis
3. **If no vision API key is available, uses keyless local CV analysis** — the
   video's pixels are analyzed directly (cuts, scrolls, typing rhythms, clicks,
   animated transitions). No network or model required.
4. **Stage 1:** outputs a generic template PLUS a generated mock page the
   template targets (via a `serve` block), so it is runnable and scoreable
   with `evaluate-mimic.mjs` immediately — before any personalization.
5. **Stage 2:** an AI assistant personalizes the scored template for a real
   product — a hosted URL, or a **local client repo** served via the flow's
   `serve` block (`{"dir": ...}` for static/built files, `{"command": "npm run dev", ...}`
   for dev servers). run-demo owns the server lifecycle either way.

### Run the Mimic Pipeline
```bash
node OpenDemo/mimic-demo.mjs <youtube-url-or-local-video> \
  --target-url <users-product-url> \
  --output my-demo.json
```

### Key Options
- `--target-url <url>` — the user's product URL (required for useful output)
- `--output <file>` — where to save the template JSON
- `--fps 0.5` — 1 frame every 2 seconds (increase for faster videos)
- `--max-frames 60` — cap total frames analyzed (controls AI cost)
- `--provider gemini|openai|anthropic|text-only` — force a specific AI provider
- `--captions-only` — skip image sending, use subtitles + OCR only (free tier friendly)
- `--keep-frames` — retain extracted frames for debugging

### After Generating the Template
The output JSON contains `_notes` and `_screenHint` fields on each step describing what the AI saw. The template also has a `_mimicMeta.adapterNotes` array explaining exactly what an agent needs to change to adapt the template to the user's product.

**Stage-1 loop (do this FIRST, before touching any product):**
1. `node OpenDemo/run-demo.mjs my-demo.json` — records against the generated mock
2. `node OpenDemo/evaluate-mimic.mjs <reference> OpenDemo/recordings/<hash>.webm`
3. Iterate on the template's timing/order until the score is acceptable

**Stage-2 personalization (after stage 1 scores well):**
1. Read the `_mimicMeta.adapterNotes` in the output file — it is the full contract
2. Point the template at the product: set `baseUrl` (hosted) or a `serve` block
   (local repo), and delete the stage-1 mock `serve` block
3. Replace mock selectors (`#m0`, `#m1`, ...) with real CSS selectors from the
   product's DOM — `_originalTarget`/`_notes`/`_screenHint` say what each step
   showed in the reference and where on screen
4. Replace placeholder values (`<YOUR_VALUE_HERE>`) with real data
5. Re-run and re-score: the same evaluate-mimic loop, same reference video

### Analysis Modes
| Mode | Triggered by | Accuracy |
|---|---|---|
| Vision (Gemini/GPT-4o/Claude) | API key in env | High — model sees actual UI frames |
| **Local CV (default)** | No vision key | Good — pixel-signal analysis, fully offline |
| Text-only | `--captions-only` | Medium — OCR + subtitle narration |

No API key is required. To optionally use a vision model:
```bash
# Windows PowerShell
$env:GEMINI_API_KEY = "your-key-here"
node OpenDemo/mimic-demo.mjs ...
```

---

## Evaluating Mimic Quality (`evaluate-mimic.mjs`)

**After running a mimic template, you MUST score the recording against the
reference video and iterate until the score is acceptable:**

```bash
node OpenDemo/evaluate-mimic.mjs <reference-video-or-url> OpenDemo/recordings/<hash>.webm --json report.json
```

- Runs 100% locally (ffmpeg) — no API key. Accepts local files or YouTube URLs.
- Scores 6 dimensions (color, motion, cuts, structure, pacing, events) plus a
  weighted overall score in 0–1.
- Read the report's `notes` array: it names the weakest dimensions. Fix the
  template accordingly (add missing scrolls/waits, match timing, reproduce
  transitions) and re-run.
- Target **overall >= 0.7** for a good mimic; `--min-score 0.7` makes the exit
  code reflect this so you can loop programmatically.
- `structure` naturally scores lower when mimicking someone else's product —
  judge primarily by motion, pacing, cuts, and events.

---

## How to Create a Demo
You do **not** need to write complex automation scripts or modify the engine code (`run-demo.mjs`). To create a new demo, you simply need to generate a tiny JSON configuration file detailing the steps of the demo.

### 0. Clarify Data Strategy (IMPORTANT)
Before writing any configurations for an existing project, explicitly ask the user whether they would prefer you to:
1. Hit their **live production/staging endpoint** (using their actual login credentials and real data), OR
2. Spin up a **local HTML mockup** with fake data (to prevent sensitive information from appearing in the video).

Wait for their answer before proceeding!

### 1. Create a JSON Configuration OUTSIDE the OpenDemo Directory
To keep the OpenDemo repository clean, you must **always** create your JSON configuration files in a working directory *outside* of the `autoscreen` folder (e.g., `../my-demo.json`). 

*(If you need a template, you can view the examples provided in the `autoscreen/examples/` directory, such as the `local-demo.json` and `dummy-login.html` files!)*

### 2. Zooming & Cinematic Rules
- **Selective Zooming (Avoid Zoom Fatigue):** Do NOT attach zooms to every single action. Only use zooms on major focal points or core feature demonstrations (e.g., primary CTA buttons, form inputs, step toggles). Avoid zooming on utility interactions like navbar switches, back/backspace buttons, or minor edit icons, as excessive zooming disorients viewers and dilutes cinematic impact.
- **Zoom should be used sparingly**, on the MOST IMPORTANT elements that communicate an idea. I.e. creating a campaign. the smaller stuff like tweaking settings doesnt really matter. Things that people need to actually accomplish should be the focus. 
- **Cinematic Timing Recommendation:** Zooms should be timed dynamically around the target action (starting right before interaction and releasing right after completion) rather than triggering while the mouse is moving across offscreen space. Configure durations (e.g. `800` to `1200`) to match the action flow smoothly.
- **MOST IMPORTANT NOTE:** If you press a button to interact with a feature of the app, explore that feature until the deepest action you can perform within feature, tweak settings, make edits etc, and save or send or perform final actions before going back and demonstrating other features.

### 3. Run the Engine (REQUIRED)
Do **NOT** just stop after writing the JSON configuration! It is your responsibility to execute the engine yourself on behalf of the user to generate the video. Run the engine using Node.js and pass your JSON file as the argument from outside the directory:
```bash
node autoscreen/run-demo.mjs my-demo.json
```

The engine will automatically spin up a headless browser, execute your instructions, and export the final polished video. When it finishes, a UI toast notification will automatically pop up on the user's screen with the final result.

**⚠️ IMPORTANT:** Do NOT kill the background task (e.g., `node run-demo.mjs`) once it finishes generating the video. The process must stay alive so the user can interact with the mini UI toast notification that pops up on their screen.

### 4. Copy the Video and Notify the User (REQUIRED)
After the final `.mp4` video has been exported in the `OpenDemo/recordings` directory:
1. **Copy the final `.mp4` video** from `recordings/` into the user's target source directory (the project you are currently operating in).
2. **Explicitly tell the user the exact absolute file path** of the newly generated video (e.g., `C:\Users\...` or wherever you saved it in their project directory). Never just share a broken markdown link without pointing out exactly where the real `.mp4` file lives on their machine!

## Agent Context & Architecture
To save time during complex workflows, be aware of the following:

- **Architecture Map**: The actual Playwright execution loop and recording logic lives in `run-demo.mjs`, while the overlay Toast UI and video preview functionality lives in `electron/main.ts` and the `src/` React folder.
- **Video Mimic Pipeline**: Frame extraction in `scripts/frame-extractor.mjs`, AI analysis in `scripts/ai-analyzer.mjs`, template generation in `scripts/template-generator.mjs`, orchestrated by `mimic-demo.mjs`.
- **Deep, Realistic Workflows (AVOID LAZY SHORTCUTS)**: Never produce superficial demos that open a view or form, perform a single minor action, and immediately cancel/back out. A compelling demo must feel authentic and complete:
  - If filling a form (e.g. creating a resource, adding a new item, or configuring parameters), fill in multiple relevant fields/toggles and **actually hit Save/Submit** to complete the action.
  - If opening an interactive tool (e.g. chat console, reply dialog, or feedback form), type a realistic response, click Send/Submit, and wait for the message state to update or a response animation to trigger.
  - Spend time interacting with settings, pagination, filters, and other controls so the viewer sees the application reacting realistically.
- **Recordings Auto-Cleanup**: The `run-demo.mjs` script automatically deletes the contents of the `recordings/` directory when it starts a new run. If a previous run was not explicitly exported/saved, it will be lost.
- **HUD Minimization**: The OpenScreen UI allows minimizing the HUD bar into a small clapperboard icon using the `-` button on the overlay.

Finally...
After you complete your first JSON instruction, re-review your work and be pessimistic about how it actually accomplishes the workflow.

Question yourself, does this actually demonstrate the most important and core features of the work?
Am I walking through the entire flow and zooming in ONLY on important segments?
Are the actions I'm performing too simple and high level?

After you question yourself and act as a pessimist. Debate potential improvements. And cite for yourself a rule from the above instructions that you are leaning on to further improve the video directing.