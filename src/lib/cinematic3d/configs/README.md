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

| file | what it shows |
|---|---|
| [`examples/login-demo.config.json`](examples/login-demo.config.json) | the two-scene shape: a 3D opener, then flat 2D for the part that has to stay legible. Renders against `examples/login-demo.mp4`. |

Start by copying one:

```bash
cp src/lib/cinematic3d/configs/examples/login-demo.config.json \
   src/lib/cinematic3d/configs/my-demo.json
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
| `losslessFrames` | on when `supersample > 1` | PNG intermediates instead of JPEG, so the only lossy step is the final encode. |

The example config uses `fps: 60`, `supersample: 2`, `crf: 15`. Drop to the defaults
while you are iterating on timing — a preview render is roughly 4× faster.
