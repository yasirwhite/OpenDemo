# OpenDemo and Kino integration review

## Working change

OpenDemo now exports recordings and editable cut/speed decisions into a portable
media bundle. The bridge imports that bundle as native Kino layers and optionally
adds a separate human presenter track. Long edits are split across native scenes.
Kino remains the editor and compositor; OpenDemo remains the capture engine.

No existing production assets, original OpenDemo working tree, repository admin
access or default branch settings are changed by this branch.

## Licensing and credit

This branch moves the combined OpenDemo distribution and new integration code to
AGPL-3.0-only, matching Kino. It preserves the original OpenDemo MIT notice in
`LICENSES/OpenDemo-MIT.txt` and does not revoke existing MIT grants. Full details
are in `LICENSES/README.md`.

Thank you to **bayshores and the Kino contributors** for
[Kino](https://github.com/bayshores/kino), and to **Siddharth Vaddem** for the
OpenScreen foundation. These are source credits, not an assertion that anyone
endorsed this implementation or finalized a merger.

## Review agenda

1. Agree which project owns capture, timeline semantics, motion graphics and UI.
2. Review the portable manifest and native scene split behavior against real footage.
3. Decide whether to keep the bridge or move to a shared engine/package boundary.
4. Add cursor telemetry and supported OpenDemo visual settings with rendered parity tests.
5. Agree contributor credit and maintainership separately from this code change.

The API baseline is Kino commit `b3ac7ecc312776a824f098599ed2b885e7dc905f`, schema 6.
No Kino source, reference videos or generated user footage are included in this PR.
