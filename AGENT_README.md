# Agent Instructions for OpenDemo

**For exact JSON syntax, supported actions, and code usage, refer to: [USAGE.md](file:///C:/Users/Yasir/Desktop/Code/OpenDemo/USAGE.md)**

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