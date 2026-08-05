# Cinematic 3D configs

**Put your configs here.** Everything in this folder is gitignored except
[`examples/`](examples/), so you can keep working configs alongside the code without
committing them.

```bash
node src/lib/cinematic3d/render.mjs src/lib/cinematic3d/configs/my-demo.json 3
```

Paths inside a config (`source`, `output`) are resolved **relative to the config file**,
so from here the repo root is `../../../../`.

## Examples

Example configs for every pipeline live together in the repo's top-level
`examples/` directory, not in here — this directory is only for the working
configs you author, which stay gitignored.

| file | what it shows |
|---|---|
| [`examples/login-demo-3d.json`](../../../../examples/login-demo-3d.json) | the two-scene shape: a 3D opener, then flat 2D for the part that has to stay legible. Renders against `examples/login-demo.mp4`. |
| [`templates/cedar/template.json`](../../../../templates/cedar/template.json) | the text layer that cuts between 3D shots — a full launch film with product slots. See `src/lib/textcards/` and `templates/README.md`. |

Start by copying one:

```bash
cp examples/login-demo-3d.json src/lib/cinematic3d/configs/my-demo.json
```

Then change `source`, `clip` ranges and `duration`. See
[`../README.md`](../README.md) for the field reference and the preset list, and
[`../presets/previews/`](../presets/previews/) for what each preset looks like.

## Quality settings

| field | default | notes |
|---|---|---|
| `fps` | 30 | **match your source recording.** OpenDemo captures at 60; rendering at 30 discards every other frame. |
| `supersample` | 1 | renders at N× and downsamples with lanczos. `2` is the meaningful jump for UI text — MSAA cannot help, because the text is inside a texture rather than on a polygon edge. Costs ~4× render time. |
| `crf` | 17 | x264 quality, lower is better. 15 for a deliverable. |
| `losslessFrames` | off | PNG intermediates instead of JPEG, so the only lossy step is the final encode. A 4K PNG is ~8 MB, so use sparingly. |

`supersample: 2` renders **W×2 by H×2 per worker** — 3840×2160 at 1080p output. That is
a lot of GPU memory: on a memory-starved machine the WebGL context dies and renders pure
black, with no error and the correct frame count. `render.mjs` probes one frame before
committing to a run and refuses to encode a flat-colour film, but if you hit it, drop to
`supersample: 1`, use fewer workers, or free some memory.

The example config uses `fps: 60`, `supersample: 2`, `crf: 15`. Drop to the defaults
while you are iterating on timing — a preview render is roughly 4× faster.

## Cursor

Off unless a scene supplies keyframes. It is worth supplying them: a visible pointer
is what allows a shot to hold still instead of zooming to create motion. See
[the cursor section](../README.md#the-cursor) — short version, move fast, do not
dwell between clicks, and do not change the default colours.
