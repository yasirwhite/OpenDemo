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
    "fps": 60
  },
  "steps": [
    { "action": "goto", "target": "/login" },
    { "action": "type", "target": "#username", "value": "test_user" },
    { "action": "click", "target": "#submit_btn" },
    { "action": "click-zoom", "target": ".important-element" }
  ]
}
```

**Supported Actions:**
- `goto`: Navigates to the given target URL (appended to `baseUrl` if relative).
- `type`: Types the `value` into the `target` CSS selector.
- `click`: Clicks the element at the `target` CSS selector.
- `click-zoom`: Clicks the element and creates a cinematic zoom region in the final video.

### 2. Run the Engine (REQUIRED)
Do **NOT** just stop after writing the JSON configuration! It is your responsibility to execute the engine yourself on behalf of the user to generate the video. Run the engine using Node.js and pass your JSON file as the argument from outside the directory:
```bash
node autoscreen/run-demo.mjs my-demo.json
```

The engine will automatically spin up a headless browser, execute your instructions, and export the final polished video. When it finishes, a UI toast notification will automatically pop up on the user's screen with the final result, and your task will be complete!
