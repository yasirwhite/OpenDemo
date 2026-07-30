# Mistakes log — what the human caught, why the model missed it

Written for whoever picks this up next. Every entry is something **the user spotted by eye that
automated measurement either missed or actively got backwards.** The pattern underneath most of them
matters more than the individual fixes.

---

## The three root causes

Nearly every mistake below traces to one of these:

1. **Motion rode the keyframe system when it should have been computed.** Any motion with a
   *constant-rate* or *single-continuous* requirement will jitter if it is expressed as chained
   keyframes with per-segment easing, because each segment boundary is a velocity discontinuity.
2. **A metric was trusted over the frames.** The edge-bbox measure is reliable for a device on a set
   and *unreliable for full-bleed UI*, where it inverted the zoom direction twice.
3. **An implementation limit silently edited the spec.** When something looked hard, it got recorded
   as a "deliberate deviation" instead of as blocked work, and then the report was treated as truth.

---

## Log

### 1. Missed both lid-opening shots
**Caught:** "the laptop opens again around 12s (this is something you seemed to miss)".
**What happened:** The lid open *was* seen at the 3 fps pass and written down. Then the donor MacBook
turned out to merge lid and base into single meshes, a hinge looked infeasible, and it was written into
the model's own report as a "deliberate deviation" — after which the report was treated as ground truth.
The geometry split that fixed it took ~60 lines once actually attempted.
**Why not noticed:** three compounding failures — (a) 1 fps sampling makes a 0.5 s event 0–1 frames, i.e.
structurally invisible; (b) the checklist had no time axis, so a missing *event* could not fail any item;
(c) scoring used one frame per cut, at the midpoint, where the lid is already open.
**Fix:** sample at **≥3× the shortest event** (≥8 fps here). Better: measure a *time-varying signal* per
cut — `h` going 14% → 91% in half a second screams "something opens" without looking at anything.
**Rule:** never downgrade a spec item because of a tooling limit. Log it as blocked; solve or escalate.

### 2. Camera zoomed on every shot
**Caught:** "why is every single frame have zoom on when thats not the case".
**What happened:** measured "reference grows its subject 40–100% within a shot" and applied a push
everywhere. Never measured *what fraction of each shot is moving*. The reference moves fast, briefly,
then rests; ours smeared the move across the full duration (`at: 0` → `at: 1`), which is the definition
of a slow zoom.
**The real surprise:** the reference moves in **10 of 13** shots — *more* than ours did. The problem was
never the count, it was **amplitude and distribution**. Cut 1 was +692% in subject area, spread across
the whole shot.
**Fix:** front-load moves into the first ~third and hold; ease-out not ease-in-out; specify amplitude as
% of subject size, not centimetres.

### 3. Everything rotated the device; the reference rotates the camera
**Caught:** "its always the camera thats moving/rotating as opposed to the device itself".
**Why not noticed:** silhouette measurement cannot distinguish "device rotated 20°" from "camera orbited
20°" — both produce an identical bounding box. It is only visible from parallax against the background
and floor, which was never checked. **No amount of bbox measurement would ever have found this.**
**Fix:** for anything the metric is blind to, ask, or check parallax against fixed set elements.
*(Later refined: scene 1 does want the device rotating. Direction of authority is the user, not a rule.)*

### 4. Scene 3's viewing angle was mirrored
**Caught:** "the reference video I believe has it angled the other direction".
**Why not noticed:** framing was authored from *subject width*, which is symmetric — a camera at −21° and
one at +21° measure identically. Nothing in the pipeline distinguished them, and the frames were only
checked for scale, never for which side the device was seen from.
**Fix:** when scoring a shot, check **which edge recedes**, not just how big the subject is. Left/right
is not recoverable from any size metric.

### 5. Zoom direction inverted — twice — on full-bleed UI
**Caught:** "it zooms in then zooms out then in again... there is no out so thats really weird", and again
on scene 3 "its a massive zoom in then a tiny zoom out not a double zoom".
**What happened:** the edge-bbox density gate (a column counts only if its edge hits exceed 12% of max)
loses the plain wallpaper margins as dense widgets take over the frame. So the **measured box shrinks
while the picture grows**. It reported a zoom-out that did not exist, then reported the push and pull-back
in the wrong order.
**Why not noticed:** the metric was trusted over the frames, twice, after it had already been wrong once.
**Fix:** the bbox measure is **only valid for a device on a set**. For full-bleed 2D, verify against
frames. Also: a content change (a popover appearing) can move the metric with no camera move at all.

### 6. "Holds" that were not holds
**Caught:** "why is it constantly zooming... this jittery zoom shit doesnt look good".
**What happened:** hold segments were written as `0.950 → 0.962` and `1.420 → 1.440`, with `y` drifting
0.000 → 0.005 → 0.008 → 0.006 → 0.004 throughout. **Zero frames were ever actually still**, so the two
real zooms read as jerks inside constant drift.
**Fix:** a hold must be *byte-identical* values on both keys. Verified by dumping the rendered curve:
`d/frame = 0.00000`, 43% of the shot dead flat. Pin unused axes to 0 — micro-drift reads as jitter.

### 7. Rotation speed varied
**Caught:** "it seems like at some points the rotation like slows down or speeds up when it should be constant".
**What happened:** device yaw shared keyframes with the camera and inherited its easing, so cut 1 ran
**9.0°/s then 6.5°/s** while cuts 2–3 ran **4.1°/s**.
**Fix:** compute rotation analytically from elapsed *seconds* — `yaw = from + dir × rate × elapsed` —
completely outside the keyframe system. Immune to clip length and to retiming.

### 8. Lid opening jittered
**Caught:** "why is the laptop opening jittery?"
**What happened:** the lid ran through **two chained ease-out segments** (`0.05→0.34`, `0.34→0.46`).
Ease-out decelerates to near-zero at the end of a span, so the lid slowed almost to a stop mid-open and
then restarted. The camera dolly had the same split and jittered in sympathy.
**Fix:** one analytic span (`lidOpen: {from, to, startAt, endAt, ease}`). Same shape as the rotation fix.

### 9. Device rotated about the wrong pivot
**Caught:** "the camera must remain looking at the center of the screen... more like a pivot about the center".
**What happened:** yaw rotated about the model origin, which sits at the base. The display is ~17 cm
behind that axis, so the screen swung through an arc instead of turning in place.
**Fix:** rotate about the screen centre — `pos += P − R(θ)·P` — and aim the camera at the same point.
Also recompute the pivot at the *working* lid angle, not the donor's native one.

### 10. Global fix flattened a per-scene value
**Caught:** "isnt the laptop in this clip supposed to lean back a bit?"
**What happened:** an earlier note ("leaning too far back") was fixed by changing the lid angle
**globally** 110° → 95°. That was right for scene 1 and wrong for scene 3, which genuinely reclines more.
**Fix:** per-cut `lidOpen.to`. Scene 1 = 95°, scene 3 = 106°.
**Rule:** before applying a fix globally, check whether the value legitimately differs per scene.

### 11. Background flashed white
**Caught:** "at the very beginning the background is white before it switches to black".
**What happened:** three's **clear colour persists between renders**. `raw2d` draws an ortho overlay scene
with no background of its own, so after a white/sky scene the buffer cleared *light*. Because two workers
pick up frames in whatever order they finish, whether a frame came out black or white was
**non-deterministic**.
**Fix:** `renderer.setClearColor(0x000000, 1)` every frame. Also hide the fade quad by default — its
opacity was being set *after* the render, so a stale dissolve could bleed into the next content pass.
**Rule:** with parallel workers, any renderer state that persists across frames is a determinism bug.

### 12. Cursor popped in from nowhere
**Caught:** "then the cursor shows up what the fuck is up with that".
**What happened:** the cursor was parented to `macRoot`, but after the lid split the screen lives inside
`lidPivot`. So it hung in mid-air where the screen *would end up*, and the lid swung to meet it.
**Fix:** parent to the lid, and gate visibility on lid angle.

### 13. The punch-ins cut to a different object
**Caught:** "the 2nd two clips aren't even using the same laptop render. it should literally be the same
asset just zoomed in".
**What happened:** scene 3's two punches were authored with `device: "screen"` — the bare floating
display built for scene 2 — instead of `device: "macbook"`. So a shot that should push *into* the laptop
was cutting to a different object that merely showed the same texture.
**Why not noticed:** every check being run was about **framing** — subject width, centroid, pan rate. None
of them look at *what the subject is*. Two different objects showing the same screen texture at the same
size score identically on all of them. The bezel and notch were the only visual tell and nothing was
looking for them.
**Fix:** cuts 5 and 6 are now the same MacBook at the same lid angle, just much closer.
**Rule:** when a shot is meant to be a push-in on the previous shot, assert it is the **same device**, not
just a matching framing. Identity is not measured by any of the framing metrics.

### 14. Pan rate held constant across very different shot sizes
**Caught:** "the further out the user is pan upward slower. I know I said pan the same speed on all but
they aren't panning all the same. i take that back".
**What happened:** one world-space rate (0.9 cm/s) was used for every cut in the scene. But apparent speed
depends on framing: the same 0.9 cm/s is **6.7% of frame height per second at dist 26 and only 1.7% at
dist 110**. Constant world rate is not constant perceived motion.
**Fix:** rate scales with shot distance — wide 0.45, mid 1.00, tight 1.40 cm/s.
**Rule:** decide whether a rate is meant to be constant in *world* units or in *frame* units, and say
which. They diverge as soon as shot sizes differ. (An earlier instruction to keep spin at one rate was
about world units and still holds — this is a different axis.)

**Also worth noting about this whole sequence:** several corrections came as reversals of earlier
instructions ("I take that back"). That is normal direction, not a contradiction. Record what the current
instruction is and why, rather than treating an earlier one as permanent.

### 15. Applied a scoped instruction outside its scope
**Caught:** "wait you changed #1 I didnt ask you to change that one we're working in #3. #1 was perfect".
**What happened:** the note was "the angle of the camera starts so high in the first segments". Read
"first segments" as *scene 1 and scene 3*, when it meant the **opening segments of scene 3** — the clip
under review. Scene 1 was already approved and got changed anyway.
**Why not noticed:** the ambiguity was noticed and resolved the wrong way, silently. A clip that had
already been signed off was treated as still in scope.
**Fix:** reverted scene 1's four camera keys exactly.
**Rule:** during clip-by-clip review, **only touch the clip under review.** If a note seems to apply more
widely, say so and ask — do not extend it. An approved clip is frozen until the user reopens it.
(This is the second scope error of its kind: see #10, where a per-scene value was fixed globally.)

### 16. A transparent quad punched a box out of the layer behind it
**Caught:** "whats up with the box around the cursor? I noticed it was introduced after the glass layer".
**What happened:** the cursor is a transparent quad, and in three a `transparent: true` material still
has **`depthWrite: true` by default**. So it wrote depth across its whole *rectangle*, including the
fully-transparent pixels. The additive glass drawn afterwards failed the depth test inside that rect,
leaving a box-shaped hole in the reflection.
**Why not noticed:** the cursor had rendered correctly for many passes — nothing was drawn *behind* it,
so its depth footprint was invisible. The bug only surfaced when a second layer was added later. It was
latent the whole time.
**Fix:** `depthWrite: false` on the cursor. Applied even though the glass was then removed, because the
same trap will catch the next layer added over a screen.
**Rule:** any transparent overlay that is not meant to occlude needs `depthWrite: false`. A sprite whose
alpha is mostly zero still occludes over its full quad.

### 17. Built a feature that was not worth its cost
**Caught:** "maybe we should just remove the glass layer or something because it just doesnt look that
good and isnt very noticeable".
**What happened:** screen reflectance was requested, three options were offered, B was chosen and built.
It then read as barely-there — because with the lid near vertical the screen reflects whatever is
*behind the camera*, and a black studio has nothing there. The physics was right; the payoff was not.
**Fix:** disabled, kept as a documented one-line re-enable.
**Rule:** when a visual feature depends on the environment having something to interact with, check that
the environment *does* before building it. Say so up front — "this will only read if we add something for
it to reflect" — rather than delivering something technically correct and visually absent.

---

## Checklist before claiming a shot is done

- [ ] Is every "hold" byte-identical on both keys? Dump the curve and confirm `d/frame == 0`.
- [ ] Is any constant-rate motion computed analytically rather than keyed?
- [ ] Does any motion cross a keyframe boundary mid-move? (velocity discontinuity = jitter)
- [ ] For a full-bleed 2D shot, was the zoom direction confirmed **against frames**, not the bbox?
- [ ] Which edge recedes? (size metrics cannot see left/right)
- [ ] Is this a per-scene value being fixed globally?
- [ ] Does any renderer state persist across frames? (parallel workers make it non-deterministic)
- [ ] Sampling ≥3× the shortest event being judged?
- [ ] Is a push-in actually the SAME asset as the shot before it? (no metric checks identity)
- [ ] Is a rate meant to be constant in world units or frame units? They differ once shot sizes do.
- [ ] Am I only touching the clip under review? Approved clips are frozen.
- [ ] Does every transparent overlay have depthWrite:false? (a mostly-alpha quad still occludes)
