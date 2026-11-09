# Editable OpenDemo footage in Kino

OpenDemo captures the product. Kino edits the film: human footage, motion graphics,
overlays and compositing. This bridge produces a portable folder and then a native
Kino document with editable video layers. It leaves the original recording and
OpenDemo project untouched.

## Quick start

Prerequisites: Node 22, `ffprobe` on PATH, and a running
[Kino source checkout](https://github.com/bayshores/kino). Follow Kino's own setup
instructions. The bridge itself needs no additional npm packages. Set
`FFPROBE_PATH` if ffprobe is installed somewhere else.

From OpenDemo:

```sh
npm run kino:export -- /path/to/screen.mp4 --out /path/to/handoff --human /path/to/presenter.mp4
npm run kino:open -- /path/to/handoff --kino /path/to/kino
```

Quote paths containing spaces. Use a new output folder for each export; an existing
folder is never overwritten. In PowerShell, use Windows paths such as
`"C:/Videos/screen.mp4"`. These commands also work directly through
`node scripts/kino/cli.mjs export` and `node scripts/kino/cli.mjs open`.

For an existing `.openscreen` project, export its **raw editable cuts**:

```sh
npm run kino:export -- /path/to/project.openscreen --out /path/to/handoff --accept-visual-loss
```

The bridge removes trimmed intervals and carries speed regions into separate
editable clips. Visual effects are intentionally not guessed. If you want the
exact OpenDemo appearance, export an MP4 from OpenDemo first, then use that MP4
as the input. The recorded appearance is preserved in that file; baked effects
will not become editable Kino effects.

`--human-start 4 --human-offset 12` places the presenter at output second 4,
starting at second 12 of the human recording. The presenter starts as a separate
picture-in-picture layer. Reposition, resize or cut it in Kino. This is not
automatic transcription, sentence editing or background removal. When a presenter
is supplied, screen audio starts muted and presenter audio remains enabled. Both
remain independently editable in Kino; review the mix before export.

## Portability and safety

The bundle contains `manifest.json`, `media/screen.*` and optionally
`media/presenter.*`. Paths are relative, with SHA-256 integrity checks. No original
machine paths, source project, credentials, logs or screenshots are bundled.
Review your actual recording before sharing it: its pixels and audio can contain
private data. The bundle copies whole source files, including footage removed by
trim regions. Use a sanitized exported MP4 if removed sections must not be shared.
The media files are copied, never modified.

Native `.motion` files reference Kino server media IDs. Share the **whole bundle**,
not only `handoff.motion`. Running `kino:open` on the receiving machine uploads
the media again and replaces those IDs for its Kino instance. Each import creates
a new workspace and a new document; it does not overwrite an existing edit.
`import-result.json` records that machine's imported project ID. Reimporting the
bundle does not round-trip edits made later in Kino.

Use `--url http://127.0.0.1:4786` for a different server port. Otherwise Kino's
own connection discovery handles desktop connection files and `MOTION_API_URL`.
Owner tokens use Kino's existing environment mechanism and are never written to
the bundle. Kino approval/refusal responses are surfaced and not bypassed.

Use a dedicated Kino server, or stop other agents/users from opening projects
during import. Kino's active project is server-global; client labels do not isolate
upload ownership. The bridge creates a separate workspace and opens the completed
edit, but cannot prevent another client from switching projects in between calls.
A failed import can leave that workspace or already-uploaded media for inspection.

Validate locally, with no server or upload:

```sh
npm run kino:open -- /path/to/handoff --kino /path/to/kino --validate-only
npm run test:kino
```

Set `KINO_PATH` to your checkout to include the native schema compatibility test
in `test:kino`. Without it, the portable bundle and timing tests run independently
and the optional native test is reported as skipped.
Set `KINO_FFMPEG_TESTS=1` to include the generated rotated-video regression
(requires FFmpeg with `-display_rotation`, plus ffprobe). Set `TEMP`/`TMP` to the
desired scratch drive for generated test footage.

## Conversion boundaries

For low-FPS draft/section rerenders of the already imported project, see
[Fast edit previews](./kino-previews.md). This uses the companion Kino preview API
and does not reimport footage or rebuild the handoff.

- Native Kino scenes are limited to 600 seconds. Long edits are split into scenes,
  with source offsets preserved across each split.
- If speed regions overlap, the first matching region wins, matching OpenDemo's
  playback/audio selection. Avoid overlapping regions for export parity.
- OpenDemo zoom/crop, annotations, 3D camera, wallpaper, borders, shadows and cursor
  overlays are not automatically recreated. Project input reports unsupported
  visual settings and requires `--accept-visual-loss` before exporting raw cuts.
- System-captured cursor pixels stay baked into the video. An editable cursor
  requires a future conversion of OpenDemo's cursor telemetry.
- The optional presenter track is independent of screen trims. Synchronize it
  explicitly or edit it in Kino; source-aligned webcam cut conversion is future work.
- The initial adapter targets Kino document schema 6. Native validation uses the
  installed Kino model and fails if a future incompatible schema changes the API.
- The inspected Kino version accepts 100 MB per imported file. The bridge checks
  its installed `MAX_UPLOAD_BYTES` before creating a workspace or uploading. Large
  raw camera files need shorter selected takes or a smaller compatible copy first.
  Keep originals and a source-timecode map separately. The bridge does not silently
  transcode or reduce their quality; a 35-minute multi-gigabyte MOV is not a direct
  supported import. Exporting a portable bundle still copies the full input file.
- Import success is not render success. A final export and visual/audio review
  are still required; the command deliberately reports `rendered: false`.

## Integration direction

This branch is the first reviewable seam, not a replacement for OpenDemo's editor.
Next useful additions are an editor export action, cursor telemetry conversion,
and a shared overlay/caption authoring interface. Separate capture from editing
so both projects remain independently useful. See `kino-merger-proposal.md` for
the review agenda and attribution.
