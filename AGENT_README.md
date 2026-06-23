# Agent Instructions for OpenDemo

Welcome! If you are an AI agent tasked with creating a product demo video, you will use the OpenDemo engine.

**⚠️ CRITICAL NOTE:** The current functionality of OpenDemo is strictly intended for **web demos** only. It uses Playwright to automate headless browsers. It cannot interact with the operating system or native desktop applications. 

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

Create a simple `.json` file with the following structure:
```json
{
  "baseUrl": "https://example.com",
  "recording": {
    "width": 1280,
    "height": 720,
    "fps": 60,
    "timeLapseWaitSegments": true,
    "timeLapseSpeedFactor": 4.0
  },
  "steps": [
    { "action": "goto", "target": "/login" },
    { "action": "type", "target": "#username", "value": "test_user" },
    { "action": "click", "target": "#submit_btn" },
    { "action": "click", "target": ".important-element", "zoom": { "durationMs": 1500 } }
  ]
}
```

**Supported Actions:**
- `goto`: Navigates to the given target URL (appended to `baseUrl` if relative).
- `type`: Types the `value` into the `target` CSS selector.
- `click`: Clicks the element at the `target` CSS selector.
- `scroll`: Scrolls the page. Supports a `mode: "smooth"` parameter for interpolated smooth scrolling.

**Attachable Configurations:**
- `zoom` (boolean | object): Can be attached to **any** action that targets an element (e.g., `click`, `type`, `hover`). It automatically creates a cinematic zoom region centered on the target element.
  - Example: `"zoom": true` (defaults to 1000ms duration)
  - Example: `"zoom": { "durationMs": 1500 }`
  - **Recommendation:** It is highly recommended to explicitly configure zooms to be longer than 1 second (e.g. `1500` or `2000`) for the best visual experience.

**Recording Options:**
- `timeLapseWaitSegments` (boolean): Set to `true` to post-process the video via FFmpeg to speed up any `wait` segments, giving a fast-forward effect instead of jump cuts.
- `timeLapseSpeedFactor` (number): The speed multiplier for wait segments (e.g., `4.0` for 4x speed). Default is 4.0.

### 2. Run the Engine (REQUIRED)
Do **NOT** just stop after writing the JSON configuration! It is your responsibility to execute the engine yourself on behalf of the user to generate the video. Run the engine using Node.js and pass your JSON file as the argument from outside the directory:
```bash
node autoscreen/run-demo.mjs my-demo.json
```

The engine will automatically spin up a headless browser, execute your instructions, and export the final polished video. When it finishes, a UI toast notification will automatically pop up on the user's screen with the final result.

**⚠️ IMPORTANT:** Do NOT kill the background task (e.g., `node run-demo.mjs`) once it finishes generating the video. The process must stay alive so the user can interact with the mini UI toast notification that pops up on their screen.

### 3. Copy the Video and Notify the User (REQUIRED)
After the final `.mp4` video has been exported in the `OpenDemo/recordings` directory:
1. **Copy the final `.mp4` video** from `recordings/` into the user's target source directory (the project you are currently operating in).
2. **Explicitly tell the user the exact absolute file path** of the newly generated video (e.g., `C:\Users\...` or wherever you saved it in their project directory). Never just share a broken markdown link without pointing out exactly where the real `.mp4` file lives on their machine!

## Agent Context & Architecture
To save time during complex workflows, be aware of the following:

- **Architecture Map**: The actual Playwright execution loop and recording logic lives in `run-demo.mjs`, while the overlay Toast UI and video preview functionality lives in `electron/main.ts` and the `src/` React folder.
- **Cross-Project Selector Discovery**: You cannot simply command OpenDemo to "close the note" or "click the last outfit." When creating a JSON flow for a target app, you must read that app's DOM/React source code first to formulate exact, reliable Playwright selectors (like `aria-label`, `text=✕`, or `nth=-1`).
- **Recordings Auto-Cleanup**: The `run-demo.mjs` script automatically deletes the contents of the `recordings/` directory when it starts a new run. If a previous run was not explicitly exported/saved, it will be lost.
- **HUD Minimization**: The OpenScreen UI allows minimizing the HUD bar into a small clapperboard icon using the `-` button on the overlay.
