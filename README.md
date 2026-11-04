# OpenDemo

Build exciting demos for free using your own AI. No cloud services or API keys: clone OpenDemo and prompt the model you already use.

![OpenDemo launch film](./examples/opendemo-launch.gif)

*Written, animated and rendered by OpenDemo itself.*

## Usage

Copy this prompt into your AI assistant and swap in your own app:

```text
Use OpenDemo to generate a video of my new AI recipe app, ChefBot, showing the user onboarding flow.
```

Your AI asks which kind of demo you want, records your app, edits the video and hands you an .mp4.

## Two kinds of demo

- **Simple walkthrough:** a clean, auto-zoomed screen recording. Good for docs, onboarding and feature tours.
- **Launch video** *(alpha)*: your recording inside 3D product shots, cut with animated text. Good for Product Hunt, YouTube and launch day.

## Changing the video

Ask your AI to make the change, or open OpenDemo's built-in editor. Your AI can give you the exact command; it looks like `node OpenDemo/run-demo.mjs <DEMO.json>`.

## Setup

Run these once, before your first demo:

```bash
npm install
npm run build
```

## For AI agents

Read [AGENT_README.md](./AGENT_README.md) for how to write the config and make a demo.

<!-- traffic:start -->
## Stats

| | |
|---|---|
| **Unique cloners** | 435 |
| **Last updated** | 2026-11-04 |
<!-- traffic:end -->

## Acknowledgements

OpenDemo builds on the archived OpenScreen project. Thank you to its creator, Siddarth Vaddem, for the foundation of the rendering pipeline.
