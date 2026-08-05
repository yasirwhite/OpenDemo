# Nightly runbook: template expansion

Runs every day at **19:00** (company close). Goal: grow the template library
by studying successful launch videos and rebuilding their grammar with
OpenDemo's engines. Target **2 new templates a night, hard budget 2 hours** —
parallelize with subagents to hit the time, and if quality and count conflict,
**ship 1 done well rather than 2 done badly.** Never sacrifice quality for
speed.

The operator is an agent. Engineers read the morning report only — assume no
human is available during the run, and leave the repo in a state that needs
minimal human correction.

## 1. Scout

Open https://www.launchgallery.video/ and explore recent successful launches.
Collect candidate launch videos.

**Known blockers (hit on the first run, 2026-08-05):** the site serves plain
HTTP clients a bot challenge (429, Vercel checkpoint). Drive it with a real
browser instead — the repo already ships Playwright (`npx playwright`) — or
fall back to alternate indexes (launchlibrary.xyz worked) and platform
syndication APIs for engagement numbers (`cdn.syndication.twimg.com` /
fxtwitter for X). On some networks `video.twimg.com` downloads need
`curl -4` (IPv6 hangs).

## 2. Vet engagement

For each candidate, find where the video was originally posted (Product Hunt,
X, YouTube, the company's launch page …) and record how much engagement the
launch got — upvotes, views, likes, whatever the source exposes. Low-engagement
videos are exactly what we avoid: we are building high-quality templates, and
engagement is the filter. After vetting a few you will calibrate what "high"
looks like that night; prefer clear standouts.

**Log every video vetted** — accepted or rejected — as an entry in
`references/launch-scouting.json` with title, video URL, source, the metrics
seen, and a verdict + one-line reason. The log is how future nights avoid
re-vetting the same launches; check it before vetting.

## 3. Reject videos we cannot recreate

Skip videos made entirely (or predominantly) of live-action humans — we
rebuild screen UI, product shots, and kinetic type, not people. Incidental
human footage is tolerable if the video's spine is product/typography; a
founder-on-camera film is an automatic reject (logged, so it is not re-vetted).

Pick the top **2** survivors by engagement and distinctiveness from templates
we already have (`templates/index.json`).

## 4. Clone each video, in parallel sections

Register the reference in `references/references.json` (manifest only — media
is never committed; download it to `references/media/`). Then spawn several
subagents, each owning a different **section** of the video, working
frame-by-frame. Point every agent at **`docs/reference-matching.md`** — the
method and the traps live there; the short version is *sample frames densely*,
because nearly every wrong conclusion in this project came from reading a
mid-animation frame as a finished state.

Each section agent mimics its section's effects with the existing engines
(`src/lib/textcards/`, `src/lib/cinematic3d/`), adding new engine presets only
when the film's grammar genuinely is not expressible with what exists.

## 5. Assemble, compare, iterate

Combine the section work into one config, render it, and compare against the
original side by side — frames at matched timestamps, not impressions. Iterate
until the rebuild is **genuinely close**; one render is never the final
render. Keep all scratch (downloads, frames, intermediate renders) in
`.demo-build/nightly/<YYYY-MM-DD>/`.

## 6. Land the template

Add it as `templates/<next-unused-tree-name>/` (naming:
`docs/engineering/conventions.md`) with:
- `template.json` — placeholder copy for a fictional product, roles tagged,
  product slots where the original showed its product;
- `README.md` — provenance (which reference, engagement it had) and what is
  fixed vs replaceable;
- an entry in `templates/index.json` with `style`, `category` and `tags`
  filled in thoughtfully — this metadata is what lets us reorganize the folder
  when there are too many templates for a flat list;
- `previews/` — 3-4 small JPGs (~960w, q3) rendered from the placeholder-copy
  template at its strongest beats (`render.mjs --at <t> --png`, then convert).
  The gallery site shows the first one as the card image, so lead with the
  most characteristic frame.

## 7. Deliverable

Produce a final **side-by-side comparison .mp4** (original | rebuild, hstack)
per template, at `.demo-build/nightly/<YYYY-MM-DD>/<slug>-side-by-side.mp4`.
This is what gets reviewed in the morning — it is the proof of closeness.

## 8. Morning report

Write `docs/runbooks/reports/<YYYY-MM-DD>.md`. **Brief — no yap.** For each
template attempted: reference + engagement, what shipped, the absolute path of
the side-by-side, and an honest caveat list (what is still off, what needs a
human eye). A skipped or failed night still gets a report saying why.

Commit and push: the new `templates/<slug>/` folders, `templates/index.json`,
`references/references.json`, `references/launch-scouting.json`, and the
report. Nothing binary — deliverables and media stay in `.demo-build/` and
`references/media/`.
