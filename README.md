# OpenDemo

Toolkit allowing your coding agents to make videos. Free, runs locally, no API keys.

![OpenDemo launch film](./examples/opendemo-launch.gif)

*Written, animated and rendered by OpenDemo itself.*

## One prompt

Paste this into Claude Code, Codex or Cursor:

```text
Clone github.com/yasirwhite/OpenDemo and use it to make a launch video for my app
```

Your agent sets it up, records your app, edits the video and hands you an .mp4.

![Launch videos made with OpenDemo for proschi, syntaxia and on-record](./examples/merged-showcase.gif)

*Made with OpenDemo and merged into the READMEs of [proschi](https://github.com/gvart/proschi), [syntaxia](https://github.com/EbadShelby/syntaxia-dev) and [on-record](https://github.com/CarsonGodwin/on-record).*

---

## More

**README GIF:** add "and a GIF for my README" to the prompt.

**Setting it up yourself:** `npm install` then `npm run build`, once.

**For AI agents:** read [AGENT_README.md](./AGENT_README.md).

**Human footage and motion graphics:** the experimental [Kino handoff](./docs/kino-handoff.md)
exports portable media bundles and imports editable cuts, speed changes and an
optional presenter into a native Kino timeline.
Use [fast section previews](./docs/kino-previews.md) to rerender an existing Kino
edit at low resolution/FPS without exporting or uploading the source again.

<!-- traffic:start -->
## Stats

| | |
|---|---|
| **Unique cloners** | 514 |
| **Last updated** | 2026-11-09 |
<!-- traffic:end -->

## Acknowledgements

OpenDemo builds on the archived OpenScreen project. Thank you to its creator, Siddharth Vaddem, for the foundation of the rendering pipeline.

The experimental editing integration uses [Kino](https://github.com/bayshores/kino),
created by bayshores and the Kino contributors.

## License

This integration branch is distributed under [AGPL-3.0-only](./LICENSE).
The original OpenDemo MIT notice and applicable upstream rights are preserved in
[LICENSES](./LICENSES/README.md). Earlier MIT releases retain their MIT grant.
