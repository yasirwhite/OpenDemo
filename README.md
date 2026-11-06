# OpenDemo

Your coding agent makes your launch video. Free, runs locally, no API keys.

## One prompt

Paste this into Claude Code, Codex or Cursor:

```text
Clone github.com/yasirwhite/OpenDemo and use it to make a launch video for my app at https://myapp.dev
```

Your agent sets it up, records your app, edits the video and hands you an .mp4.

![Launch videos made with OpenDemo for proschi, syntaxia and on-record](./examples/merged-showcase.gif)

*Made with OpenDemo and merged into the READMEs of [proschi](https://github.com/gvart/proschi), [syntaxia](https://github.com/EbadShelby/syntaxia-dev) and [on-record](https://github.com/CarsonGodwin/on-record).*

---

## More

**Templates** *(alpha)*: pick a look from the [template gallery](https://yasirwhite.github.io/OpenDemo/) and copy its prompt. Your recording goes inside 3D product shots, cut with animated text. Good for Product Hunt, Show HN and X.

![OpenDemo launch film](./examples/opendemo-launch.gif)

*Written, animated and rendered by OpenDemo itself.*

**README GIF:** add "and a GIF for my README" to the prompt.

**Changes:** ask your agent, or open the built-in editor with `node OpenDemo/run-demo.mjs <DEMO.json>`.

**What it records:** web apps, local or deployed. Everything runs on your machine.

**Setting it up yourself:** `npm install` then `npm run build`, once.

**For AI agents:** read [AGENT_README.md](./AGENT_README.md).

<!-- traffic:start -->
## Stats

| | |
|---|---|
| **Unique cloners** | 447 |
| **Last updated** | 2026-11-05 |
<!-- traffic:end -->

## Acknowledgements

OpenDemo builds on the archived OpenScreen project. Thank you to its creator, Siddarth Vaddem, for the foundation of the rendering pipeline.
