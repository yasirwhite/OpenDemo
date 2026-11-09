# Initial bridge validation

Validated on Windows with Node 24.21.0 and FFprobe 9.0.2 against Kino commit
`b3ac7ecc312776a824f098599ed2b885e7dc905f` (native document schema 6).

- `npm run test:kino` with `KINO_PATH` and `KINO_FFMPEG_TESTS=1` set: **26 passed**, including the real Kino
  model test, portable-path/integrity checks, source/timeline bounds, 600-second
  splitting, presenter synchronization and refusal handling.
- A generated 1920x1080 MP4 with a 90-degree display matrix is measured as
  1080x1920; the exported canvas and presenter layer retain that upright aspect.
- Both predictable output filenames reject file symlinks before any server call.
  Windows junctions are rejected too; atomic replacement of an existing hardlink
  leaves the external file unchanged.
- Targeted Biome check: passed for all changed JavaScript and package metadata.
- `git diff --check`: passed.
- Actual CLI export: synthetic 6-second screen MP4 and 8-second portrait MP4,
  presenter placed at output second 1 with source offset 2.
- Actual CLI import: media uploaded to a dedicated local Kino server, native
  document imported, and the final imported project explicitly opened. All video
  assets and server media storage used the dedicated test drive.
- `--validate-only`: returned schema 6, one scene, `uploaded: false`.
- Original MIT notice compared byte-for-byte after line-ending normalization.
  Packaged-app allowlist includes root AGPL and retained MIT notice.

The smoke footage is generated, private to the test directory and not committed.
No user video, source project, server media IDs or credentials are in this branch.

## Not yet verified

No final movie render or pixel/audio parity claim is made by this change. Kino
render execution was unavailable in the surrounding production environment, and
this bridge intentionally did not override that control. The integration's
verified boundary is native import/open, not a finished creative edit.

No packaged desktop binary was built, and macOS/Linux were not exercised.
Node 22 remains the repository's declared runtime; this local run used Node 24.
The optional native-model test lets reviewers repeat schema validation against
their installed Kino checkout without changing their project or uploading media.
