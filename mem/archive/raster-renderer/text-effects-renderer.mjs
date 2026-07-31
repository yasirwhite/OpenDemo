#!/usr/bin/env node
/**
 * text-effects-renderer.mjs
 * OpenDemo — L5: renders kinetic typography from MEASURED effect specs.
 *
 * The counterpart to text-slide.mjs, which could only produce a still image and
 * faked motion by swapping between four of them. Here each glyph is an
 * independently animated sprite driven by the easing curve that was fitted to
 * the reference — opacity, translation, scale, colour and defocus all evaluated
 * per frame from the same code that measured them.
 *
 * Glyph rasterisation reuses ffmpeg drawtext (no browser, no new dependency)
 * and the SAME segmenter used for measurement, so a rendered line is decomposed
 * into glyphs exactly the way a reference line is.
 *
 * Exports: rasterizeLine, renderTextSequence
 */

import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { FFMPEG } from "../../../scripts/video-signature.mjs";
import { segmentGlyphs, makeEasing } from "../../analysis/glyph-motion.mjs";
import { findFont, drawtextFontArg } from "../../../scripts/text-slide.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Glyph rasterisation
// ─────────────────────────────────────────────────────────────────────────────

function escapeDrawtext(s) {
  return s.replace(/\\/g, "").replace(/'/g, "\u2019").replace(/:/g, "\\:").replace(/%/g, "\\%").trim();
}

/**
 * Draws one line of text black-on-white at the target size, then segments it
 * into per-glyph alpha sprites. Alpha comes from the ink map, so antialiased
 * edges survive into the composite instead of being thresholded away.
 */
export function rasterizeLine(text, w, h, opts = {}) {
  const font = findFont();
  if (!font) throw new Error("no usable font found (set OPENDEMO_FONT)");
  const clean = escapeDrawtext(text);
  if (!clean) return null;

  // Match a measured target width when the spec carries one. drawtext's advance
  // width is very close to linear in fontsize, so one corrective pass lands
  // within a couple of pixels — cheaper and more reliable than a search.
  if (opts.targetWidthPx && !opts._noFit) {
    const probeSize = Math.round(Math.min(h / 4.2, (w * 0.88) / (clean.length * 0.52)));
    const probe = rasterizeLine(text, w, h, { ...opts, fontsize: probeSize, _noFit: true });
    if (probe?.sprites?.length) {
      const x0 = Math.min(...probe.sprites.map((s) => s.x));
      const x1 = Math.max(...probe.sprites.map((s) => s.x + s.w));
      const actual = x1 - x0;
      if (actual > 4) {
        const corrected = Math.max(10, Math.min(Math.round(h * 0.9),
          Math.round(probeSize * (opts.targetWidthPx / actual))));
        return rasterizeLine(text, w, h, { ...opts, fontsize: corrected, _noFit: true });
      }
    }
    return probe;
  }

  const fontsize = opts.fontsize ?? Math.round(Math.min(h / 4.2, (w * 0.88) / (clean.length * 0.52)));
  const yExpr = opts.yExpr ?? "(h-text_h)/2";
  const draw = `drawtext=fontfile=${drawtextFontArg(font)}:text='${clean}':fontsize=${fontsize}` +
    `:fontcolor=black:x=(w-text_w)/2:y=${yExpr}`;

  const r = spawnSync(FFMPEG, [
    "-v", "error",
    "-f", "lavfi", "-i", `color=c=white:s=${w}x${h}:d=1`,
    "-vf", draw, "-frames:v", "1", "-pix_fmt", "rgb24", "-f", "rawvideo", "-",
  ], { maxBuffer: w * h * 3 + 65536 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < w * h * 3) return null;

  const buf = Buffer.from(r.stdout.subarray(0, w * h * 3));
  // A clean synthetic raster has no noise floor, so the column threshold can be
  // near zero. The default (tuned for video frames) erodes the tapered edges of
  // round letters, which thins every glyph and fakes extra letter-spacing.
  const seg = segmentGlyphs(buf, w, h, { singleBand: true, glyphFrac: 0.004, mergeGapFrac: 0.012 });
  if (!seg.glyphs.length) return null;

  // Extract each glyph as an alpha sprite (1 = full ink)
  const sprites = seg.glyphs.map((g) => {
    const gw = g.x1 - g.x0, gh = g.y1 - g.y0;
    const alpha = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        alpha[y * gw + x] = seg.ink[(g.y0 + y) * w + (g.x0 + x)];
      }
    }
    return { x: g.x0, y: g.y0, w: gw, h: gh, alpha };
  });
  return { sprites, fontsize };
}

// ─────────────────────────────────────────────────────────────────────────────
// Compositing primitives
// ─────────────────────────────────────────────────────────────────────────────

/** Separable box blur on an alpha sprite — the defocus half of "blur-in". */
function blurAlpha(alpha, w, h, radius) {
  if (radius < 0.5) return alpha;
  const r = Math.max(1, Math.round(radius));
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const norm = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += alpha[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc * norm;
      const add = alpha[y * w + Math.min(w - 1, x + r + 1)];
      const sub = alpha[y * w + Math.min(w - 1, Math.max(0, x - r))];
      acc += add - sub;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * norm;
      const add = tmp[Math.min(h - 1, y + r + 1) * w + x];
      const sub = tmp[Math.min(h - 1, Math.max(0, y - r)) * w + x];
      acc += add - sub;
    }
  }
  return out;
}

/**
 * Alpha-composites a sprite centred on (cx, cy) with scale and colour.
 *
 * Takes a CENTRE rather than a top-left because scaling a line of type has to
 * happen about a shared anchor: growing each glyph around its own centre leaves
 * the word exactly as wide as it started, so the scale is invisible in the
 * frame and unrecoverable by measurement.
 */
function compositeSprite(frame, W, H, sprite, alpha, cx, cy, colour, opacity, scale) {
  const { w: sw, h: sh } = sprite;
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const dx0 = Math.round(cx - dw / 2), dy0 = Math.round(cy - dh / 2);
  const [cr, cg, cb] = colour;

  for (let y = 0; y < dh; y++) {
    const fy = dy0 + y;
    if (fy < 0 || fy >= H) continue;
    const sy = Math.min(sh - 1, Math.floor((y / dh) * sh));
    for (let x = 0; x < dw; x++) {
      const fx = dx0 + x;
      if (fx < 0 || fx >= W) continue;
      const sx = Math.min(sw - 1, Math.floor((x / dw) * sw));
      const a = alpha[sy * sw + sx] * opacity;
      if (a <= 0.002) continue;
      const p = (fy * W + fx) * 3;
      const ia = 1 - a;
      frame[p] = frame[p] * ia + cr * a;
      frame[p + 1] = frame[p + 1] * ia + cg * a;
      frame[p + 2] = frame[p + 2] * ia + cb * a;
    }
  }
}

const lerp = (a, b, t) => a + (b - a) * t;

// ─────────────────────────────────────────────────────────────────────────────
// Effect application
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-glyph state at time t, from an effect spec. Every quantity here is read
 * from the measurement — nothing is a rendering-time default.
 */
function glyphStateAt(spec, glyphIndex, glyphCount, elapsedMs, defaults) {
  const stagger = spec.stagger;
  // Deterministic per-index jitter in [0,1) — same glyph, same offset, every run.
  const jitter01 = (((glyphIndex + 1) * 2654435761) % 1013) / 1013;

  let staggerMs = 0;
  if (stagger && stagger.order === "left-to-right") staggerMs = glyphIndex * Math.abs(stagger.medianMs);
  else if (stagger && stagger.order === "right-to-left") staggerMs = (glyphCount - 1 - glyphIndex) * Math.abs(stagger.medianMs);
  else if (stagger) {
    // "simultaneous" is never literally simultaneous in hand-made motion — the
    // measurement still reports a 100-150ms onset span. Rendering it as perfect
    // lockstep collapses the whole change into one or two frames, which is why
    // the round-trip measured our bursts at 1 frame against the reference's 5.
    staggerMs = jitter01 * (stagger.totalSpanMs || 0);
  }

  const P = spec.params || {};

  // Each channel keeps its own DURATION but not its own start offset. The
  // measured per-channel onsets differ only because differently-shaped curves
  // cross the same 6% threshold at different times — they are an artifact of
  // detection, not real staggered starts. Applying them as delays split one
  // smooth arc into two bursts with a visible lull between, where the reference
  // has a single continuous ramp.
  const ev = (key) => {
    const p = P[key];
    if (!p?.easing) return 0;
    const dur = Math.max(33, p.durationMs || spec.durationMs || 300);
    const local = elapsedMs - staggerMs;
    const raw = local <= 0 ? 0 : local >= dur ? 1 : local / dur;
    return makeEasing(p.easing.family, p.easing.params)(raw);
  };

  const state = {
    opacity: 1, dx: 0, dy: 0, scale: 1, blurPx: 0,
    colour: defaults.colour,
  };

  if (P.opacity) {
    const e = ev("opacity");
    state.opacity = Math.max(0, Math.min(1, lerp(P.opacity.from, P.opacity.to, e)));
  }
  if (P.translate) {
    const e = ev("translate");
    const from = P.translate.fromPx || 0;
    const d = lerp(from, 0, e);
    if (P.translate.axis === "y") state.dy = d; else state.dx = d;
  }
  if (P.scale) {
    const e = ev("scale");
    // Defensive floor: a glyph never legitimately starts at zero size, and a
    // near-zero scale renders as unreadable specks.
    const from = Math.max(0.2, Math.min(3, P.scale.fromRel));
    state.scale = Math.max(0.2, lerp(from, 1, e));
  }
  if (P.focus) {
    // Measured relative sharpness < 1 means the glyph starts defocused.
    const e = ev("focus");
    const startBlur = Math.max(0, (1 - Math.min(1, P.focus.fromRelSharpness)) * (defaults.maxBlurPx ?? 10));
    state.blurPx = Math.max(0, lerp(startBlur, 0, e));
  }
  if (P.colour) {
    const e = ev("colour");
    // Spatial ramp: each glyph gets its own endpoint, interpolated across the
    // line, reproducing gradient-across-the-word typography.
    let from = P.colour.perElement?.[0]?.from || defaults.colour;
    let to = defaults.colour;
    const ramp = P.colour.spatialRamp;
    if (ramp) {
      const f = glyphCount > 1 ? glyphIndex / (glyphCount - 1) : 0;
      to = [0, 1, 2].map((i) => lerp(ramp.fromRgb[i], ramp.toRgb[i], f));
      from = P.colour.perElement?.[0]?.from || from;
    } else if (P.colour.perElement?.length) {
      const pe = P.colour.perElement[Math.min(glyphIndex, P.colour.perElement.length - 1)];
      from = pe.from; to = pe.to;
    }
    state.colour = [0, 1, 2].map((i) => lerp(from[i], to[i], e));
  }
  return state;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sequence rendering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders a full text sequence to mp4.
 *
 * shots: [{ tMs, endMs, text, bg:[r,g,b], colour:[r,g,b], spec }]
 *   spec is an entry from effects.json; a shot with no spec is held static.
 */
export async function renderTextSequence(shots, outPath, opts = {}) {
  const W = opts.width ?? 640, H = opts.height ?? 360;
  const fps = opts.fps ?? 30;
  const durationMs = opts.durationMs ?? Math.max(...shots.map((s) => s.endMs));
  const totalFrames = Math.round((durationMs / 1000) * fps);
  const log = opts.log || (() => {});

  // Pre-rasterise every line once
  for (const s of shots) {
    const lay = s.layout || s.spec?.layout;
    const targetWidthPx = s.fontsize ? null : (lay?.widthFrac ? lay.widthFrac * W : null);
    const yExpr = lay?.cyFrac != null ? `(${Math.round(lay.cyFrac * H)}-text_h/2)` : undefined;
    s._raster = s.text ? rasterizeLine(s.text, W, H, { fontsize: s.fontsize, targetWidthPx, yExpr }) : null;
    if (s.text && !s._raster) log(`   ⚠️  could not rasterise "${s.text}"`);
    s._blurCache = new Map();
    if (s._raster) {
      // Shared scale anchor: the centre of the whole rendered line.
      const sp = s._raster.sprites;
      const x0 = Math.min(...sp.map((p) => p.x)), x1 = Math.max(...sp.map((p) => p.x + p.w));
      const y0 = Math.min(...sp.map((p) => p.y)), y1 = Math.max(...sp.map((p) => p.y + p.h));
      s._anchor = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    }
  }

  const ff = spawn(FFMPEG, [
    "-y", "-v", "error",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-r", String(fps), "-i", "-",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", resolve(outPath),
  ], { stdio: ["pipe", "ignore", "pipe"] });
  let ffErr = "";
  ff.stderr.on("data", (d) => { ffErr += d; });

  const frame = Buffer.alloc(W * H * 3);
  const writeFrame = () => new Promise((res, rej) => {
    if (!ff.stdin.writable) return rej(new Error(`ffmpeg closed early: ${ffErr.slice(-200)}`));
    if (ff.stdin.write(Buffer.from(frame))) res();
    else ff.stdin.once("drain", res);
  });

  log(`   ${totalFrames} frames @ ${W}x${H} ${fps}fps`);

  for (let f = 0; f < totalFrames; f++) {
    const tMs = (f / fps) * 1000;
    const shot = shots.find((s) => tMs >= s.tMs && tMs < s.endMs) || shots[shots.length - 1];

    const bg = shot.bg || [250, 250, 250];
    for (let i = 0; i < W * H; i++) {
      const p = i * 3;
      frame[p] = bg[0]; frame[p + 1] = bg[1]; frame[p + 2] = bg[2];
    }

    if (shot._raster) {
      const sprites = shot._raster.sprites;
      const elapsed = tMs - shot.tMs;
      const defaults = { colour: shot.colour || [30, 30, 40], maxBlurPx: opts.maxBlurPx ?? 12 };

      for (let gi = 0; gi < sprites.length; gi++) {
        const sp = sprites[gi];
        const st = shot.spec
          ? glyphStateAt(shot.spec, gi, sprites.length, elapsed, defaults)
          : { opacity: 1, dx: 0, dy: 0, scale: 1, blurPx: 0, colour: defaults.colour };
        if (st.opacity <= 0.004) continue;

        let alpha = sp.alpha;
        if (st.blurPx >= 0.5) {
          const key = `${gi}:${Math.round(st.blurPx)}`;
          if (!shot._blurCache.has(key)) {
            shot._blurCache.set(key, blurAlpha(sp.alpha, sp.w, sp.h, st.blurPx));
          }
          alpha = shot._blurCache.get(key);
        }
        // Position the glyph's centre relative to the line anchor, scaled — so
        // the whole line grows together rather than each letter in place.
        const anchor = shot._anchor;
        const gcx = sp.x + sp.w / 2, gcy = sp.y + sp.h / 2;
        const cx = anchor.x + (gcx - anchor.x) * st.scale + st.dx;
        const cy = anchor.y + (gcy - anchor.y) * st.scale + st.dy;
        compositeSprite(frame, W, H, sp, alpha, cx, cy, st.colour, st.opacity, st.scale);
      }
    }
    await writeFrame();
  }

  ff.stdin.end();
  await new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}: ${ffErr.slice(-300)}`)))));
  return resolve(outPath);
}
