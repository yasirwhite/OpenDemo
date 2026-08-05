# Proposal: composite build principles (division of labor)

**Status: recorded, deliberately NOT adopted.** The nightly runbook does not
reference this document on purpose — we want to see what unguided runs
converge on before prescribing a method. Do not follow this unless the
runbook explicitly links here.

How the first product (the mem-derived template that became `cedar`) was
actually made:

- **One model owned the text layer end to end** — text animations, SVG marks,
  cuts and transitions. Crucially, where the reference showed real product
  shots or stock footage, that model did **not** try to recreate them: it
  replaced them with explicit `[product demonstration here]` slots and kept
  moving. That is where `product-slot` came from.
- **Separate models owned the 3D recreation** — the device renders, camera
  matching, studio sets — working against the same reference independently.
- **The layers were combined at the end** (overlay compositing), not built
  interleaved.

Why it worked: each model held one visual grammar in context at a time, and
the text model's refusal to recreate footage kept it from burning effort on
the layer another model owned.

If nightly runs plateau below this quality, promote this into
`docs/runbooks/nightly-template-expansion.md` step 4 as the prescribed
decomposition (text/transitions vs 3D/footage, slots for what you don't own,
composite last) and compare the before/after.
