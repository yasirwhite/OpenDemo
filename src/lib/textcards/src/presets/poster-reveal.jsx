/**
 * poster-reveal.jsx — a procedurally drawn brand poster plus the reveal that
 * brings it on screen. Asset-free: the artwork is type, a gradient wash and an
 * inline SVG mark, so a film can show "the thing the product just generated"
 * without shipping a binary.
 *
 * WHY THIS EXISTS
 * The generate-loop grammar (prompt card → "Generating" → the finished asset)
 * needs a finished asset. Standing in a photograph means licensing a photograph
 * and re-cropping it per beat; drawing it means one preset renders the same
 * identity at any rect, at any aspect, at any reveal fraction.
 *
 * THE REVEAL, MEASURED
 * Read off the reference at 25fps over three beats (37.9-40.9, 45.8-47.08,
 * 51.9-53.9). Two mechanisms, and they are NOT what they look like at a glance:
 *
 *   mosaic  The picture does not sit still behind a wipe. Its TOP EDGE rises
 *           into place while a blocky dissolve front descends through it, and
 *           the content translates 1:1 with that top edge (verified by a
 *           shift search: best-fit dy tracks the top edge to within 4px at
 *           scale 1.000, so there is no zoom and no vertical squash). Model it
 *           as a mask over a static picture and the content sits still, which
 *           is the tell that it is wrong.
 *             - the rise is a pure exponential settle: the offset above rest
 *               falls by x0.805 every frame (tau 0.185s -> settleDecay with
 *               dur ~738ms), from ~390 stage px below, landing within a pixel
 *               ~0.8s later.
 *             - the front is a per-COLUMN position, not a straight line. Each
 *               column runs ahead or behind by up to half a band, quantised to
 *               a tile grid, which is what makes the edge read as vertical
 *               streaks of blocks rather than a ragged line. Tile ~26x30 stage
 *               px, band ~90 stage px deep.
 *             - the front's progress is close to a smoothstep on beat 2 and
 *               close to linear on beat 3, so it is authored as `frontKeys`
 *               (measured fraction-complete checkpoints) rather than forced
 *               into one curve.
 *
 *   blur    The slower variant: the picture arrives oversized and defocused and
 *           resolves in place — scale ~1.24 -> 1.00 on the same exponential
 *           settle, blur clearing alongside. No front, no occluders.
 *
 * Both end the same way: an accelerating pull-back about frame centre that is
 * CUT MID-FLIGHT (measured s at the cut: 0.72-0.79, never a rest value).
 *
 * OCCLUDERS, NOT MASKS
 * The dissolve is drawn as ground-coloured rectangles ON TOP of the poster
 * rather than as an SVG mask, because the ground behind these beats is a flat
 * near-white and the reference's front is visibly ground-coloured blocks eating
 * into the picture. It also keeps the whole thing to plain divs, so it survives
 * being screenshotted out of order with no mask/clip-path support questions.
 *
 * Pure function of t. All times arrive as absolute seconds; the registry
 * offsets scene-relative ms cues before they reach this component. All
 * positions are stage px (1280x720).
 */

import React from "react";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const rgb = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
const rgba = (c, a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const lerp = (a, b, p) => a + (b - a) * p;

// Deterministic value noise. Math.random() is forbidden here: the renderer
// visits frames out of order, so a re-rolled tile pattern would flicker.
const hash = (a, b, seed) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The clipping box runs this far past the poster's bottom, and the dissolve's
 * ground fill runs with it.
 *
 * Without it the box's bottom clip edge sits at a FRACTIONAL device row while
 * the poster rides its rise, and Chromium blends that row against the backdrop
 * — a 1px hairline at ~30 levels below the ground, sweeping up the frame and
 * flickering as the subpixel phase changes. Measured on the 46s beat at 46.12
 * (row 718 = [222,221,223] against a [252,252,253] ground). Rounding the
 * translate to whole pixels would kill it too, but that quantises a rise the
 * reference runs smoothly.
 */
const BLEED = 24;

/**
 * Fraction of a settle still to run.
 *
 * Default is easing.js's settleDecay shape, exp(-4u), RENORMALISED to land on
 * exactly zero at u=1. The bare exponential is right for the body of the mosaic
 * beats' rise (offset x0.805 per frame, straight in log space for eight frames)
 * but wrong at the end: the reference lands dead on its rest position at 46.60
 * and 52.76, while exp(-4u) is still ~5 stage px short and creeping. Removing
 * the terminal value fixes the tail without disturbing the body — refitting
 * beat 2 with it takes the top-edge residual from a peak of 4.7 stage px to 1.1.
 *
 * `pow` switches to (1-u)^pow instead. The blur-in beat needs that: its scale
 * offset falls 0.242 -> 0.172 -> 0.097 -> 0.009 at dt 0.65/1.05/1.45/2.05s,
 * and those ratios ACCELERATE, so no exponential fits — but (1-u)^1.227 over
 * 2.15s matches all four to within 0.007.
 */
const E4 = Math.exp(-4);
const decay = (u, pow) => {
  if (u <= 0) return 1;
  if (u >= 1) return 0;
  if (pow) return Math.pow(1 - u, pow);
  return (Math.exp(-4 * u) - E4) / (1 - E4);
};
const smoothstep = (u) => u * u * (3 - 2 * u);

/**
 * Fraction of the picture revealed at time t.
 * `keys` (measured checkpoints, [{at, f}] in absolute seconds) wins when
 * present; otherwise a smoothstep over [at, at+dur].
 */
function frontAt(t, at, dur, keys) {
  if (keys && keys.length) {
    if (t <= keys[0].at) return keys[0].f ?? 0;
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t < b.at) return lerp(a.f, b.f, (t - a.at) / Math.max(1e-6, b.at - a.at));
    }
    return keys[keys.length - 1].f;
  }
  return smoothstep(clamp01((t - at) / Math.max(1e-6, dur)));
}

// ── the mark ────────────────────────────────────────────────────────────────
// OpenDemo's logomark, inline so it takes the poster's colours: the repo's
// logo.svg doorway-and-parcel on the site's brand gradient (#e8483a -> #7c6cf5).
const Mark = ({ size, a, b, ink, src }) => (src ? (
  // A supplied brand mark wins: a poster inside a TEMPLATE belongs to whatever
  // brand the film is retargeted to, and the inline glyph below is only the
  // fallback for a poster nobody has given a mark to.
  <img src={src} alt="" width={size} height={size}
    style={{ display: "block", flex: "none", width: `${size}px`, height: `${size}px`, objectFit: "contain" }} />
) : (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: "block", flex: "none" }}>
    <defs>
      <linearGradient id="od-mark-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={rgb(a)} />
        <stop offset="100%" stopColor={rgb(b)} />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="15" fill="url(#od-mark-g)" />
    <path d="M20 46V25a12 12 0 0 1 24 0v21" fill="none" stroke={rgb(ink)}
      strokeWidth="4.5" strokeLinecap="round" />
    <circle cx="38" cy="34" r="2.4" fill={rgb(ink)} />
    <rect x="25.5" y="40" width="13" height="10" rx="2" fill={rgb(ink)} />
    {/* the parcel's tape. Without it the parcel and the step below merge into
        one white blob at the 32-44px the poster actually shows the mark at. */}
    <path d="M32 40v10" stroke={rgb(a)} strokeWidth="2" />
    <rect x="14" y="50" width="36" height="4" rx="2" fill={rgb(ink)} />
  </svg>
));

/**
 * The poster's one graphic device: the logomark's doorway blown up to poster
 * scale and cropped by the frame. A 16:9 poster with type in the lower-left is
 * two thirds empty otherwise, and an empty third reads as an unfinished
 * layout rather than as space. Derived from the mark, so it needs no new
 * vocabulary — and being an outline it survives sitting behind the headline.
 */
const Arch = ({ w, h, a, b, cx, cy, r, sw, foot, opacity }) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    <defs>
      <linearGradient id="od-arch-g" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor={rgb(a)} />
        <stop offset="100%" stopColor={rgb(b)} />
      </linearGradient>
    </defs>
    <path
      d={`M ${cx - r} ${foot} L ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} L ${cx + r} ${foot}`}
      fill="none" stroke="url(#od-arch-g)" strokeWidth={sw}
      strokeLinecap="round" opacity={opacity} />
  </svg>
);

// ── the artwork ─────────────────────────────────────────────────────────────
/**
 * Drawn from parameters, never measured off anything: header lockup top-left,
 * headline set tight and bottom-weighted, a hairline, a caption. Bottom-weighted
 * copy with the lockup at the TOP is deliberate — the reveal runs top-down, so
 * the brand is legible from the first third of the wipe and the headline lands
 * as the front clears it.
 */
function Artwork({
  w, h, pad, bg, ink, sub, accentA, accentB,
  wordmark, lines, headSize, headWeight, headTrack, headLead,
  caption, capSize, markSize, markSrc, glow, rule, font, arch,
}) {
  // Arch geometry: springs from a point ~62% down the poster, radius set off
  // the SHORT side so it stays an arch rather than a lozenge at any aspect,
  // pushed right so the headline sits in the clear and the arch bleeds off the
  // right and bottom edges.
  const aR = Math.min(w, h) * (arch?.r ?? 0.40);
  const aCx = w * (arch?.cx ?? 0.78);
  const aCy = h * (arch?.cy ?? 0.62);
  const aSw = Math.min(w, h) * (arch?.sw ?? 0.055);
  // Legs run off the bottom edge by default. A portrait poster has no clear
  // side to bleed into — the headline is in the way — so `foot` lets the arch
  // stop short and sit ABOVE the type instead of striking through it.
  const aFoot = h * (arch?.foot ?? 1.0) + aSw;
  return (
    <div style={{
      position: "absolute", left: 0, top: 0, width: `${w}px`, height: `${h}px`,
      background: rgb(bg),
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: `${pad}px`, boxSizing: "border-box", overflow: "hidden",
    }}>
      {/* wash — two soft brand lights, so the ground has depth without an image */}
      {glow && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background:
            `radial-gradient(${w * 0.85}px ${h * 0.8}px at 76% 14%, ${rgba(accentB, 0.42)} 0%, ${rgba(accentB, 0.10)} 45%, ${rgba(accentB, 0)} 72%),`
            + `radial-gradient(${w * 0.75}px ${h * 0.85}px at 12% 96%, ${rgba(accentA, 0.30)} 0%, ${rgba(accentA, 0.07)} 46%, ${rgba(accentA, 0)} 74%)`,
        }} />
      )}

      {arch !== false && (
        <Arch w={w} h={h} a={accentA} b={accentB}
          cx={aCx} cy={aCy} r={aR} sw={aSw} foot={aFoot}
          opacity={arch?.opacity ?? 0.85} />
      )}

      {/* header lockup */}
      <div style={{
        position: "relative", display: "flex", alignItems: "center",
        gap: `${markSize * 0.42}px`,
      }}>
        <Mark size={markSize} a={accentA} b={accentB} ink={ink} src={markSrc} />
        <span style={{
          fontFamily: font, fontSize: `${markSize * 0.66}px`, fontWeight: 600,
          color: rgb(ink), letterSpacing: "-0.02em", whiteSpace: "nowrap",
          lineHeight: 1,
        }}>
          {wordmark}
        </span>
      </div>

      {/* headline + rule + caption */}
      <div style={{ position: "relative" }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            fontFamily: font, fontSize: `${headSize}px`, fontWeight: headWeight,
            color: rgb(ink), letterSpacing: `${headTrack}em`, lineHeight: headLead,
            whiteSpace: "nowrap",
          }}>
            {line}
          </div>
        ))}
        {rule && (
          <div style={{
            height: 1, background: rgba(ink, 0.22),
            marginTop: `${capSize * 1.15}px`, marginBottom: `${capSize * 0.85}px`,
          }} />
        )}
        {caption && (
          <div style={{
            fontFamily: font, fontSize: `${capSize}px`, fontWeight: 450,
            color: rgb(sub), letterSpacing: "0.01em", whiteSpace: "nowrap",
          }}>
            {caption}
          </div>
        )}
      </div>
    </div>
  );
}

// ── the component ───────────────────────────────────────────────────────────

export function PosterReveal({
  t, from, to,
  // rect
  w = 1064, h = 598, cx = 640, cy = 360, radius = 0,
  ground = [253, 253, 253],
  // artwork
  bg = [10, 10, 12], ink = [244, 244, 245], sub = [157, 157, 168],
  accentA = [232, 72, 58], accentB = [124, 108, 245],
  wordmark = "OpenDemo", lines = [], caption = null,
  headSize = null, headWeight = 700, headTrack = -0.035, headLead = 0.94,
  capSize = null, markSize = null, markSrc = null, padFrac = 0.085, pad = null,
  glow = true, rule = true, font = null, arch = null,
  // rise into place
  riseDy = 0, riseAt = null, riseDur = 0.738,
  // reveal
  mode = "mosaic",
  frontAtS = null, frontDur = 1.1, frontKeys = null,
  tileW = 26, tileH = 30, band = 90, streak = 0.8, jitter = 0.5, seed = 7,
  // blur-in / settle
  blurFrom = 0, blurDur = 0.6, blurPow = null,
  scaleFrom = 1, scaleDur = 0.738, scalePow = null, fadeIn = 0,
  // pull-back exit
  outAt = null, outDur = 0.5, outScale = 0.72, outPow = 2.6,
  outFade = 0, outBlur = 0,
}) {
  if (t < from - 0.001 || t > to + 0.001) return null;

  const FONT_ = font ?? `"Segoe UI", "Inter", system-ui, -apple-system, sans-serif`;
  const P = pad ?? Math.min(w, h) * padFrac;
  const HS = headSize ?? h * 0.155;
  const CS = capSize ?? Math.max(9, HS * 0.20);
  const MS = markSize ?? P * 0.86;

  // Rise: the top edge settles onto its rest position on the measured
  // exponential. This translates the whole poster, artwork and occluders
  // together, which is what makes the content track the top edge.
  const rAt = riseAt ?? from;
  const dy = riseDy ? riseDy * decay(Math.max(0, t - rAt) / Math.max(1e-6, riseDur)) : 0;

  // Settle scale (blur mode's oversized arrival) and the pull-back exit, both
  // about frame centre.
  const settle = scaleFrom !== 1
    ? 1 + (scaleFrom - 1) * decay(Math.max(0, t - from) / Math.max(1e-6, scaleDur), scalePow)
    : 1;
  const outP = outAt == null ? 0 : clamp01((t - outAt) / Math.max(1e-6, outDur));
  const outE = Math.pow(outP, outPow);
  const sc = settle * (1 + (outScale - 1) * outE);

  let blur = blurFrom > 0
    ? blurFrom * decay(Math.max(0, t - from) / Math.max(1e-6, blurDur), blurPow)
    : 0;
  blur = Math.max(blur, outBlur * outE);

  let opacity = fadeIn > 0 ? clamp01((t - from) / fadeIn) : 1;
  if (outFade > 0) opacity *= 1 - clamp01(outE * outFade);
  if (opacity <= 0.004 || sc <= 0.002) return null;

  // Mosaic occluders. The front is a fraction of the poster's own height, so it
  // travels with the artwork rather than with the frame.
  const occluders = [];
  if (mode === "mosaic") {
    const f = frontAt(t, frontAtS ?? from, frontDur, frontKeys);
    // Before the front exists there is no picture at all. Without this the
    // scatter band would leak a few tiles onto an otherwise empty frame.
    if (f <= 0) return null;
    const F = f * h;
    // The scatter band TAPERS at both ends, measured: the 90%-to-5% fill depth
    // runs 15 -> 64 -> 73 -> 54 -> 34 ref px across beat 2's reveal. It has to,
    // physically — there is no picture above the top edge to scatter into and
    // none below the bottom edge. Without the taper the reveal never finishes:
    // stray tiles sit on the last rows for the rest of the beat.
    const bEff = band * Math.min(1, Math.max(0, F / band), Math.max(0, (h - F) / band));
    if (bEff > 0.5) {
      const solidTop = F + bEff; // everything below is ground, no per-tile work
      if (solidTop < h) {
        occluders.push(
          <div key="solid" style={{
            position: "absolute", left: 0, top: `${solidTop}px`,
            width: `${w}px`, height: `${h + BLEED - solidTop}px`, background: rgb(ground),
          }} />
        );
      }
      const cols = Math.ceil(w / tileW);
      const r0 = Math.max(0, Math.floor((F - bEff) / tileH));
      const r1 = Math.min(Math.ceil(h / tileH), Math.ceil((F + bEff) / tileH) + 1);
      for (let c = 0; c < cols; c++) {
        // Per-column lead/lag is what makes the edge read as vertical streaks.
        const colOff = (hash(c, 0, seed) - 0.5) * bEff * streak;
        for (let r = r0; r < r1; r++) {
          const mid = r * tileH + tileH / 2;
          const tOff = (hash(c, r + 1, seed) - 0.5) * bEff * jitter;
          if (mid <= F + colOff + tOff) continue; // still picture here
          occluders.push(
            <div key={`${c}-${r}`} style={{
              position: "absolute",
              left: `${c * tileW}px`, top: `${r * tileH}px`,
              width: `${tileW + 1}px`, height: `${tileH + 1}px`,
              background: rgb(ground),
            }} />
          );
        }
      }
    } else if (F < h / 2) {
      // Band collapsed at the top end: nothing revealed below F yet.
      occluders.push(
        <div key="solid" style={{
          position: "absolute", left: 0, top: `${F}px`,
          width: `${w}px`, height: `${h + BLEED - F}px`, background: rgb(ground),
        }} />
      );
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{
        position: "absolute",
        left: `${(cx - w / 2).toFixed(2)}px`, top: `${(cy - h / 2).toFixed(2)}px`,
        width: `${w}px`, height: `${h + BLEED}px`,
        borderRadius: `${radius}px`, overflow: "hidden",
        opacity,
        transform: `translateY(${dy.toFixed(2)}px) scale(${sc.toFixed(4)})`,
        // The poster is centred on the frame, so its own centre IS the frame
        // centre — which is the point the measured pull-back recedes toward.
        // Written out rather than "50% 50%" because the box carries BLEED px of
        // slack below the poster and must not scale about the middle of that.
        transformOrigin: `50% ${(h / 2).toFixed(1)}px`,
        filter: blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : "none",
      }}>
        <Artwork
          w={w} h={h} pad={P} bg={bg} ink={ink} sub={sub}
          accentA={accentA} accentB={accentB}
          wordmark={wordmark} lines={lines} caption={caption}
          headSize={HS} headWeight={headWeight} headTrack={headTrack} headLead={headLead}
          capSize={CS} markSize={MS} markSrc={markSrc} glow={glow} rule={rule} font={FONT_}
          arch={arch}
        />
        {occluders}
      </div>
    </div>
  );
}
