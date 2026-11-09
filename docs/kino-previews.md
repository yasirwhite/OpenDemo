# Fast edit previews without rebuilding the handoff

Once `kino:open` has imported a bundle, edit its native Kino project and preview
that same project. `kino:preview` reads its ID from `import-result.json`; it never
re-exports the source, re-uploads media, recreates the timeline or opens a different
active project. Kino handles the render and its existing cache.

```sh
npm run kino:preview -- /path/to/handoff --kino /path/to/kino --scene scene-1 --from 12 --to 20
```

The default is a fast MP4 draft at **12 fps**, capped by Kino's fast preset at a
**640-pixel long edge**, with motion blur and dithering disabled. Use `--fps 6`
for rough timing checks or `--fps 15` for a smoother preview (Kino's fast preset
caps output at 15 fps). Final-quality settings and the saved project are unchanged.

The running Kino server must expose `preview: "fast"`, `from`, and `to` in its
render tool schema. These are provided by the companion
[Kino fast-preview PR #1](https://github.com/bayshores/kino/pull/1), currently on
`yasirwhite:feat/fast-preview-ranges` pending upstream merge.
An older server produces an actionable error **before a render request is sent**;
the bridge never silently falls back to rendering the entire film. Restart your
Kino server after installing a version containing that change. No source-media
extraction or OpenDemo frontend rebuild is required.

## Sections and rerenders

`--from` and `--to` are seconds on one scene's existing timeline, not source-media
offsets. Supply both and one explicit `--scene`; `--scene all` is not valid for a
section. Kino validates the scene duration and snaps the actual interval outward
to the output frame grid. Its response reports the effective interval.

Omit the range to preview the selected whole scene. Use `--scene all` only when you
want each scene rendered separately (Kino's per-job scene limit still applies).
The bridge-created IDs are `scene-1`, `scene-2`, etc.; use the current Kino scene
ID/name/code if you have renamed or restructured the project.

After changing an overlay, rerun the same section command. The same imported
project and media remain in place. Cache reuse depends on Kino's render cache,
the scene/content changes and matching render settings; this command does not
claim that every edited section is cacheable or rewrite the movie itself.

Outputs default to the bundle's `previews` directory. Set `--out` to another
absolute output folder. Put the bundle/output on your media drive when disk space
is limited. Use `--url` for a nondefault server; it must be the same Kino instance
that contains the imported project.

## Check a request or job

```sh
npm run kino:preview -- /path/to/handoff --scene scene-1 --from 12 --to 20 --dry-run
npm run kino:preview -- /path/to/handoff --kino /path/to/kino --job R7
```

`--dry-run` prints the request without connecting to Kino. A normal start returns
a job or an approval state; it does not claim the movie is finished. `--job` checks
the reported job without starting another render. Approval holds and policy
refusals are reported unchanged; this helper never answers, retries or bypasses
them. It does not change Kino's GPU, RAM or parallel-render settings.

Validation in this branch covers request construction, capability negotiation,
status/refusal handling and reuse of the import receipt. No production movie
render was attempted as part of this bridge change.
Set `KINO_PREVIEW_PATH` to the companion Kino checkout when running `test:kino`
to test negotiation against its actual MCP tool schema. That test starts no server
and submits no real render job.
