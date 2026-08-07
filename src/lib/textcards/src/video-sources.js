/**
 * video-sources.js — real footage inside the animated windows.
 *
 * A media-window (or product-slot) may carry a `src`. The footage then plays
 * INSIDE the window's frame, so it rides every keyframed move the window makes
 * — the rise from the bottom edge, the punch to full-bleed, the slide-and-
 * shrink exit — and is clipped by the window's own radius and lit by its own
 * shadow. A static ffmpeg overlay cannot do that, because the window moves.
 *
 * The determinism discipline is the one src/lib/cinematic3d/render.mjs uses for
 * its screen recordings, and it is not optional here:
 *
 *   - the source time is a PURE FUNCTION of the film clock t (sourceTimeFor),
 *     so frame f always shows the same picture no matter what order the
 *     renderer walks the timeline in;
 *   - nothing ever calls play(). The element is seeked and read;
 *   - the driver AWAITS the seek (prepareVideos) BEFORE renderAtTime, because a
 *     screenshot taken while the decoder is still working shows the PREVIOUS
 *     frame — a tear that is invisible in a single frame and obvious in motion.
 *
 * The <video> elements are created once, outside React, and adopted into
 * whichever window is live via a STABLE ref callback (an inline arrow would be
 * a fresh identity every frame, so React would detach and re-attach the node
 * 25 times a second). They therefore exist before the first seek, which is what
 * lets prepareVideos run ahead of the render that mounts them.
 *
 * Configs without `src` never touch any of this: no elements are created,
 * prepareVideos resolves immediately, and the readiness gate stays synchronous.
 */

// key -> { el, src, from, end, fit, sceneStart, sceneEnd }
const REG = new Map();
const REFS = new Map();

/** Hidden parking spot so an element is in the document before its scene mounts. */
let host = null;
function getHost() {
  if (!host) {
    host = document.createElement("div");
    host.id = "__video_host";
    // Not display:none — a hidden element can have its decode deprioritised.
    // Zero size and clipped keeps it live but invisible.
    host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:0";
    document.body.appendChild(host);
  }
  return host;
}

/**
 * Pull the footage bindings out of a config. A scene binds footage with:
 *
 *   "src":  "file:///c:/.../demo.mp4"     absolute file:// or relative to index.html
 *   "clip": { "from": 2.0, "to": 12.4, "fit": "1x" }
 *   "fill": "cover"                        how the frame maps onto the window rect
 *
 * `fit` maps film time onto source time: "1x" (default) plays at true speed
 * from `from`; "stretch" remaps [from,to] onto the whole scene (a 3s clip held
 * for 6s runs at half speed); "loop" wraps at true speed for scenes longer than
 * the clip.
 */
export function collectVideoSpecs(config) {
  const out = [];
  (config?.scenes ?? []).forEach((sc, i) => {
    if (!sc || !sc.src) return;
    // The scene id is the registry key the preset looks its element up by, so a
    // footage scene must have one. Filling it in here (before any render) keeps
    // an un-id'd scene working instead of silently rendering an empty window.
    if (!sc.id) sc.id = `video-${i}`;
    const clip = sc.clip ?? {};
    out.push({
      key: sc.id,
      src: sc.src,
      from: clip.from ?? 0,
      to: clip.to ?? null,
      fit: clip.fit ?? "1x",
      fill: sc.fill ?? "cover",
      sceneStart: (sc.startMs ?? 0) / 1000,
      sceneEnd: ((sc.startMs ?? 0) + (sc.durationMs ?? 0)) / 1000,
    });
  });
  return out;
}

export function registerVideos(specs) {
  for (const sp of specs) {
    if (REG.has(sp.key)) continue;
    const el = document.createElement("video");
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    el.preload = "auto";
    // NO crossOrigin: a file:// source is an opaque origin, and asking for a
    // CORS fetch makes the load fail silently — loadeddata never fires, the
    // readiness gate falls through on `error`, and the first seek then hangs
    // forever because `seeked` cannot fire on an element with no media.
    // border-radius on the element as well as its container: see the note in
    // MediaWindow. Without it the composited video layer keeps square corners.
    el.style.cssText = `display:block;width:100%;height:100%;border-radius:inherit;`
      + `object-fit:${sp.fill === "contain" ? "contain" : "cover"};`;
    el.src = sp.src;
    getHost().appendChild(el);
    REG.set(sp.key, { ...sp, el });
  }
}

export function hasVideos() { return REG.size > 0; }

export function getVideoEl(key) { return REG.get(key)?.el ?? null; }

/**
 * Stable per-key ref callback. React keeps the same identity across renders, so
 * the node is adopted once on mount rather than moved every frame.
 */
export function videoRef(key) {
  if (!REFS.has(key)) {
    REFS.set(key, (node) => {
      const e = getVideoEl(key);
      if (node && e && e.parentNode !== node) node.appendChild(e);
    });
  }
  return REFS.get(key);
}

/** Film clock -> source clock. Pure; this is what makes the render repeatable. */
export function sourceTimeFor(key, t) {
  const v = REG.get(key);
  if (!v) return null;
  const dur = Number.isFinite(v.el.duration) ? v.el.duration : null;
  const end = v.to ?? dur ?? v.from;
  const span = Math.max(1e-6, end - v.from);
  const u = t - v.sceneStart;
  if (v.fit === "stretch") {
    const p = Math.min(1, Math.max(0, u / Math.max(1e-6, v.sceneEnd - v.sceneStart)));
    return v.from + span * p;
  }
  if (v.fit === "loop") return v.from + ((u % span) + span) % span;
  return v.from + Math.min(span, Math.max(0, u));   // "1x"
}

/**
 * Resolve once every element has a first frame decoded. A source that fails to
 * load is recorded, not swallowed: the alternative is a film that renders a
 * hole where the footage should be and says nothing about it.
 */
export function videosReady() {
  return Promise.all([...REG.values()].map((v) => (
    v.el.readyState >= 2
      ? Promise.resolve()
      : new Promise((res) => {
          const ok = () => { v.el.removeEventListener("loadeddata", ok); res(); };
          const bad = () => {
            v.el.removeEventListener("error", bad);
            v.failed = `could not load ${v.src} (media error ${v.el.error?.code ?? "?"})`;
            res();
          };
          v.el.addEventListener("loadeddata", ok);
          v.el.addEventListener("error", bad);
          setTimeout(() => { if (v.el.readyState < 2) { v.failed = `timed out loading ${v.src}`; res(); } }, 30000);
        })
  ))).then(() => {
    const bad = [...REG.values()].filter((v) => v.failed);
    if (bad.length) throw new Error("textcards: " + bad.map((v) => v.failed).join("; "));
  });
}

/**
 * Seek every live source to the frame this film time needs, and resolve only
 * once the decoder has actually produced it. The driver awaits this BEFORE
 * renderAtTime — see the header note on tearing.
 */
export async function prepareVideos(t) {
  const jobs = [];
  for (const [key, v] of REG) {
    // Seek a little before the scene opens too: the window can mount on the
    // very first frame of its scene, and a source still parked on frame 0
    // would show one wrong picture.
    if (t < v.sceneStart - 0.5 || t > v.sceneEnd + 0.5) continue;
    const st = sourceTimeFor(key, t);
    if (st == null) continue;
    if (Math.abs(v.el.currentTime - st) < 1e-4) continue;
    jobs.push(new Promise((res, rej) => {
      const timer = setTimeout(() => {
        v.el.removeEventListener("seeked", done);
        rej(new Error(`textcards: seek to ${st.toFixed(3)}s in "${v.src}" never completed `
          + `(readyState ${v.el.readyState}). The source is loaded but not seekable.`));
      }, 15000);
      function done() {
        clearTimeout(timer);
        v.el.removeEventListener("seeked", done);
        // A source that is not seekable silently ignores the assignment, fires
        // `seeked` anyway, and paints frame 0 for the whole film. Fail loudly
        // rather than shipping a still.
        if (Math.abs(v.el.currentTime - st) > 0.5) {
          rej(new Error(`textcards: source "${v.src}" is not seekable (asked ${st.toFixed(2)}s, got ${v.el.currentTime.toFixed(2)}s)`));
        } else res();
      }
      v.el.addEventListener("seeked", done);
      v.el.currentTime = st;
    }));
  }
  if (jobs.length) await Promise.all(jobs);
}
