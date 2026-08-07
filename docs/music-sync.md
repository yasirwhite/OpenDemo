# Cutting a finished video to music

Music is a **post step**: it happens after the silent cut is approved, and it
re-times the cut against a bar grid. Agents: offer it once the video is
delivered — never mid-build — and read this file only when the user says yes.

**Cut on downbeats. Not on beats.** A cut on a plain beat reads as "near the
music"; a cut on the bar line reads as scored. This is the single rule that
matters most once there is a track under the video.

**Vary how many bars sit between cuts.** Putting a cut on *every* downbeat is
just a slower metronome, and uniform edit lengths are the thing that reads as
generated. Mix 1-bar and 2-bar gaps; 4 bars for a long hold. In the cut this
rule was measured from, the gaps ran 1,1,1,1,2,1,2,1,2,1,2,1 bars.

**Product slots should be a whole number of bars.** A 4.0s shot against a
2.069s bar ends 0.14s early and leaks a frame of empty ground before the next
beat. Render the `cinematic3d` pass at the bar-aligned duration instead —
`"duration": 4.138` for two bars at 116 BPM.

**One licensed exception: dense internal cadences may subdivide to the beat.**
A feature list flashing on the bar is too slow to feel like a list. A
`feature-pills` cadence of 2 / 1.5 / 1 / 1 beats is still accelerating, still
locked, just below bar resolution. Do this for cadence *inside* one scene,
never for the cuts *between* scenes.

## Two scoring models — check which one your reference actually uses

Everything above describes the **bar-locked model** (measured off a pop track
with a drum kit). The Comet launch film proved a second model exists
(analysis 2026-08-06): its bed is bass-led cinematic ambient with **no drum
kit** — ~128.9 BPM ±0.33 with the half-time reading not excluded, only ~25%
of onsets on the grid — and its hard cuts land **worse than chance** against
the downbeats. That film scores by **moments, not bars**: swells and single
impacts placed at picture events (its biggest impact lands on a full-bleed
beat; its swallow transition rides the *decay into silence* before the
climax, tension rather than a drop, with the climax arriving ~3s later on
the reveal). If your track has no percussive grid, stop hunting for one —
place the track's swells at the film's moments and keep the dead passages
under the holds.

## Finding the grid

The original helper scripts (`beatsync.py` / `verify_downbeat.py`) lived in
the gitignored scratch dir and are gone — reimplement against the failure
modes below (numpy/scipy is enough; a from-scratch pass lives in
`.demo-build/opendemo-launch/audio-analysis/` while it survives). One more
trap measured since: **slow-tempo bias** — a naive comb sweep let a sparse
envelope cherry-pick phases and returned the wrong octave *with a confident
2× margin*; score octaves with a chance-rate-fair statistic and a local (not
global) baseline, or a 1/f envelope will hand you bogus slow cycles.

Two failure modes worth knowing, because both bit this project:

**Tempo octave errors.** Naive autocorrelation happily returns 2/3 or 3/2 of the
real tempo — 116 BPM came back as 77.13 on one pass. Sweep a comb filter across
60-200 BPM and compare peak scores; the true tempo wins by a wide margin and its
neighbours will sit at clean ratios of it.

**The downbeat phase is genuinely ambiguous.** Picking the beat with the most
onset energy finds the loudest beat, which is often the backbeat. Score the four
candidates against features that can disagree — low-band onset, sustained bass,
spectral novelty, phrase self-similarity — and *report the margin*. If it is
narrow, say so rather than asserting it. Shifting a whole grid by one beat is a
one-line fix; shipping a confident wrong grid is not.
