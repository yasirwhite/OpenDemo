# OpenDemo

Build exciting demos for free using your own AI

***No cloud services or API keys |*** Just clone `OpenDemo` and prompt the model you already use.

### Demo
![OpenDemo launch film](./examples/opendemo-launch.gif)

*Written, animated and rendered by OpenDemo itself.*

## Usage

**Browse the template gallery: [yasirwhite.github.io/OpenDemo](https://yasirwhite.github.io/OpenDemo/)** —
pick a template and copy the prompt

**OR**

Just ask your AI assistant to build the demo for you.

**Example Prompt:**
```bash
> Use OpenDemo to generate a video of my new AI recipe app, ChefBot, showing the user onboarding flow.
```

The AI will ask which kind of demo you want, generate the config, plan the
video edits, and hand you a polished .mp4

*Build exciting demos for free using your own AI — it records the demo, edits
it, and makes it exciting.*

---

If you (the human) want to make changes:
1) Ask your model to edit the video, or
2) manually edit your video with OpenDemo's built-in editor. 

To use the editor, run the demo command, which you can get by asking your model for it. It will look something like `node OpenDemo/run-demo.mjs <DEMO.json>`

---

## Two kinds of demo

Your AI will ask which one you want before it starts:

**Simple walkthrough** — a clean screen recording of the product, zoomed and
paced automatically. Good for docs, onboarding and feature tours. Stable.

**Exciting launch video** *(alpha)* — your recording placed inside 3D product
shots and cut together with kinetic typography, in the style of a real product
launch film. Good for ProductHunt, YouTube and launch day.

## Installation & Setup
Because OpenDemo's cinematic video rendering engine is heavily powered by a compiled React application running invisibly in the background, you **must** build the project once before the engine can function.

1. Install dependencies: `npm install`
2. Build the engine: `npm run build`

*You only need to do this once. Once built, you can run as many demos as you want!*

## How to use (For AI Agents)
If you are an AI agent attempting to create a demo video using OpenDemo, please carefully read the [AGENT_README.md](./AGENT_README.md) for instructions on how to easily structure your configuration files and generate a new demo.

<!-- traffic:start -->
## Stats

| | |
|---|---|
| **Unique cloners** | 69 |
| **Last updated** | 2026-08-17 |
<!-- traffic:end -->

## Acknowledgements
OpenDemo is built as an automated, agent-native extension of the archived OpenScreen project. A huge thank you to the original OpenScreen creator (Siddarth Vaddem) for laying the foundation of this cinematic rendering pipeline!
