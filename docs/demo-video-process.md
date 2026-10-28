# The multi-agent demo-video creation process

How OpenDemo templates and launch films actually get made. This is the working
process behind cedar, birch, aspen, fir and the OpenDemo launch film itself —
written down so the next machine (or the next agent) can run it without
rediscovering it. The orchestrator is a single coordinating model; all heavy
build work goes to subagents (Opus-class for anything visual).

## 0. The shape of the pipeline

```
scout → vet → measure → divide → build in parallel → assemble →
human review gate → iterate → templatify → gallery → (music as a post step)
```

Nothing ships from inside the pipeline. The human watches a side-by-side
deliverable and says yes or no at the review gate. Only after a yes does
anything reach `templates/` or the gallery, and only then do the misses get
written into `docs/reference-matching.md` so the next clone starts smarter.

## 1. Scouting references

- Source: launch-video showcases (e.g. launchgallery.video), looking for
  high-engagement product launch films. Engagement is tracked per candidate in
  `references/launch-scouting.json` with accept/reject reasons.
- Rejection rules learned the hard way:
  - **Human-dominant footage is out** — if most sampled frames are live-action
    people, the film can't be recreated by a renderer. Sample ~10 frames and
    count; don't trust the thumbnail.
  - **Feature demonstrations are not launch videos.** A launch film sells a
    story; a feature demo documents behavior. One cloned "launch video" turned
    out to be a feature demonstration and the template had to be scrapped.
  - Avoid films whose appeal is the brand rather than the craft (likes because
    it's a famous product, not because the film teaches anything reusable).
- The reference video gets fetched to `references/media/` (gitignored — never
  committed) and the human eyeballs the chosen reference's frames before any
  cloning starts.

## 2. Measuring, not vibing

Cloning works by **measurement, not impression**. Before any preset is written:

- Decode the reference to frames (`work/decode/<beat>/f####.jpg` per section).
- Measure per element: positions, sizes, font metrics, rotation rates, glow
  radii, easing shapes, zoom velocities (%/s about which origin), entry/exit
  timings to the frame.
- Write the numbers into the template's `reference-notes.md`. Presets then
  implement the numbers, and comments in the preset cite the measurement
  ("zooms IN continuously at ~3-4.5%/s about frame centre").
- A/B against the reference at the reference's own frame size. "Looks close"
  at a glance is not a pass; overlay or side-by-side at matched dimensions is.

## 3. Division of labor (the thing that made the first film work)

Split by *competence*, not by scene:

- **One agent owns typography, SVG, cuts and transitions.** The same agent
  replaces real product shots and stock photos with `[product demonstration
  here]` slots instead of trying to recreate content — slots are the point of
  a template.
- **Separate agents own 3D/cinematic recreations** (product shots, camera
  moves, starfields, particle work).
- **Separate agents own media windows** — keypoint-animated frames that play
  screen recordings with deterministic per-frame seeking.
- The orchestrator combines the parts at the end. Agents never share a
  mutable build: each builds in a **private stage directory with a config
  marker**, because two agents writing one `dist/bundle.js` is a race that
  produces silently wrong renders.

## 4. Iteration loop

- Renders are **draft-quality by default**; the full master render happens
  only on an explicit human call.
- Every iteration produces a **side-by-side deliverable** (reference | ours).
  The human always sees it before anything is accepted.
- Feedback is given in measured terms where possible ("text drifts upward
  into place — it should rise from below with an ease-out"; "the sun should
  finish fading by the time the logo reaches its final position").
- The orchestrator does not fix visuals by hand. Fixes are briefed to an
  Opus subagent with the measured defect, the file list, and the acceptance
  check. Lazy agents get their work re-briefed to a fresh subagent rather
  than patched around.

## 5. Operational rules for agent fleets

Earned through failure, each one:

- **Status = the agent's own transcript tail + mtimes of files it owns.**
  Process CPU and shared-directory activity are not evidence — cancelled
  workflows leave zombie subagents writing to the same places.
- A denied tool call (even a `cd`) can kill a whole workflow **silently**.
  Any long job gets a liveness watchdog (newest mtime across its transcript
  and output dirs, ~10 min staleness → investigate, never guess "working").
- Stopping a task does not reliably kill in-flight subagents; assume zombies
  for up to ~25 minutes and never interpret their writes as progress.
- Agents build in private stages; the orchestrator verifies a config marker
  before accepting a bundle as the agent's own output.

## 6. Templatifying

Once a film passes the gate:

- Strip the product: real shots become labelled `product-slot` scenes that
  render placeholder boxes; copy becomes role-tagged placeholder copy with a
  worked example (each template demos a fictional product named after the
  template's tree).
- The template ships as `templates/<slug>/`: `template.json` (the full worked
  config), `presets/*.jsx` (the measured preset implementations),
  `README.md` + `reference-notes.md` (what was measured, what to retarget),
  screenshots for the gallery.
- Register it in `templates/index.json`; the gallery site is generated from
  that registry (`site/build.mjs`) and deployed by Pages CI. The gallery is
  for humans; agents use the cloned repo directly and never the website.
- Naming: trees (cedar, birch, aspen, fir, …). The convention lives in the
  engineering-conventions doc.

## 7. Music is a post step

Timing edits and music are kept strictly separate from the visual build:

- The film is cut silent first. Music comes after the video is accepted,
  per `docs/music-sync.md` — recover the track's grid (BPM + downbeat) from
  the audio itself, then retime `startMs` values onto bar lines with varied
  whole-bar gaps. Never trust a BPM you read somewhere over one you measured
  from the actual track, and verify any grid at both ends of the film —
  real recordings drift.
- Derived audio events (whooshes on window entries, dips released on cuts)
  are generated from the config's keyframes, so the grid must be right
  before any of them are placed.
- The soundtrack fades with the final visual fade; sound effects are
  config-derived, not hand-placed.

## 8. Lessons index

- `docs/reference-matching.md` — accumulated misses and the principles that
  fixed them. Updated only after the human accepts a film, with what was
  missing from that build.
- `docs/music-sync.md` — the grid-recovery and retiming method, including
  the octave/alias traps and chance-fair scoring.
- `templates/README.md` — story principles: a launch film is a story (hook →
  claims → proof → lockup), not a feature list; keep demos within the
  template's own theme.
