# OpenDemo

**Your coding agent makes your demo video.**

Point Claude Code, Codex or Cursor at your app and get a README GIF or a launch film. Free, runs locally, no API keys.

Built for developers who just shipped something and need to show it, without opening a video editor.

![Demo videos made with OpenDemo and merged into the READMEs of proschi, syntaxia and on-record](./examples/merged-showcase.gif)

*Demos made with OpenDemo and merged into their READMEs by the maintainers of [proschi](https://github.com/gvart/proschi), [syntaxia](https://github.com/EbadShelby/syntaxia-dev) and [on-record](https://github.com/CarsonGodwin/on-record).*

## Make a README GIF for your repo

Paste this into your coding agent and swap in your own app:

```text
Use OpenDemo to make a 20-second README GIF of my app at https://myapp.dev, showing how you create a new project.
```

Your agent records your app in a browser, zooms in on the moments that matter, edits the cut and hands you an .mp4. Ask for a GIF too and it converts one sized for your README.

## Make a launch video for Product Hunt, Show HN or X

Pick a look from the **[template gallery](https://yasirwhite.github.io/OpenDemo/)** and copy its prompt, or ask directly:

```text
Use OpenDemo to make a 30-second launch video for ChefBot, my AI recipe app.
```

Launch videos *(alpha)* put your recording inside 3D product shots, cut with animated text.

![OpenDemo launch film](./examples/opendemo-launch.gif)

*Written, animated and rendered by OpenDemo itself.*

## Works with

Claude Code, Codex, Cursor, or any coding agent that can run commands on your machine. OpenDemo records web apps (anything that runs in a browser, local or deployed). Recording and rendering happen on your machine, so nothing is uploaded and there is nothing to pay for.

## Setup

Run these once, before your first demo:

```bash
npm install
npm run build
```

## Changing the video

Ask your agent to make the change, or open OpenDemo's built-in editor. Your agent can give you the exact command; it looks like `node OpenDemo/run-demo.mjs <DEMO.json>`.

## For AI agents

Read [AGENT_README.md](./AGENT_README.md) for how to write the config and make a demo.

<!-- traffic:start -->
## Stats

| | |
|---|---|
| **Unique cloners** | 447 |
| **Last updated** | 2026-11-05 |
<!-- traffic:end -->

## Acknowledgements

OpenDemo builds on the archived OpenScreen project. Thank you to its creator, Siddarth Vaddem, for the foundation of the rendering pipeline.
