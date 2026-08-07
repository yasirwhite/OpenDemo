/**
 * domain-input.jsx — Bloom's "Enter Domain" beat, built rather than slotted.
 *
 * Two skins of ONE layout, because the reference proves they are one object:
 *
 *   mode "input"   watercolour flower-field ground; a globe chip + bold serif
 *                  "Enter Domain"; a wide white glass pill with a soft
 *                  magenta/violet orb as its bullet, a grey serif placeholder
 *                  that fades out, the domain typed in near-black serif, and a
 *                  dark circular submit button with a white up-arrow.
 *   mode "submit"  the SAME pill on black, filled flat purple, its submit
 *                  button reduced to a thin white ring + arrow, with a broad
 *                  specular gloss sweeping along it.
 *
 * Measured off ref.mp4 4.60-7.90s (25fps, 1920x1080 -> stage px = ref x 2/3).
 * Every default below is a measurement, in stage px at CAMERA SCALE 1:
 *
 *   pill            ref l315 t510 r1618 b698  ->  210.0, 340.0, 869.3 x 126.0
 *                   corner radius = h/2 = 63.0 (it is a true pill)
 *   orb centre      ref (401,605) r45         ->  (267.3, 403.3) r 30.0
 *   globe centre    ref (353.5,437) r20       ->  (235.7, 291.3) r 13.3
 *   label ink left  ref 407, baseline 452.5   ->  271.3, baseline 301.7
 *                   cap height ref 29 -> 19.3 -> Georgia bold 28px
 *   placeholder     ink left ref 471, baseline 623, x-height 26
 *                                             ->  314.0, baseline 415.3, 36px
 *   submit centre   ref (1525.5,603) r45      ->  (1017.0, 402.0) r 30.0
 *   submit ring     (dark skin) ref r83 @ s2.032 -> r 27.2, same centre
 *
 * The punch-in, the left whip and the submit beat's expo settle live in each
 * scene's `camera` block (origin 257.5,443 — the zoom is about the ORB, not
 * frame centre; that origin is what makes a 1.00 -> 2.03 scale reproduce the
 * measured landmark tracks). Nothing here animates position: this component is
 * a pure function of t and the camera does the moving.
 *
 * All *Ms cues are SCENE-RELATIVE; the registry offsets them.
 */

import React from "react";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";

/**
 * Absolutely-positioned text placed by its TYPOGRAPHIC BASELINE.
 *
 * `top` + translateY(-100%) puts the LINE BOX's bottom on the anchor, not the
 * baseline — for Georgia at line-height 1 that is 0.150em low in the bold face
 * and 0.203em low in the regular, which is 4-7 stage px of silent error at
 * these sizes and twice that once the camera has punched in. `baselineEm` is
 * that gap, measured per face off a render, so `baseline` means what it says.
 *
 * `scaleX` compresses the advance widths about the left edge. The reference's
 * face is a more condensed serif than anything installed: sized to the measured
 * cap/x-height, Georgia sets "Enter Domain" 11% wide and "domain.com" 5% wide.
 * Sizing DOWN to fix the width would miss the measured cap height instead, so
 * the size carries the vertical metric and scaleX carries the horizontal one.
 */
const BaselineText = ({ x, baseline, size, baselineEm = 0.151, scaleX = 1, style, children }) => (
  <span style={{
    position: "absolute", left: x, top: baseline + size * baselineEm,
    fontSize: size, lineHeight: 1, whiteSpace: "nowrap",
    transformOrigin: "0 0",
    transform: `translateY(-100%)${scaleX !== 1 ? ` scaleX(${scaleX})` : ""}`,
    ...style,
  }}>
    {children}
  </span>
);

/** Linear interpolation through [{at, ...}] keys on one numeric channel. */
function keyAt(keys, t, field, dflt) {
  if (!keys || !keys.length) return dflt;
  if (t <= keys[0].at) return keys[0][field] ?? dflt;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t < b.at) {
      const p = clamp01((t - a.at) / Math.max(1e-6, b.at - a.at));
      const av = a[field] ?? dflt, bv = b[field] ?? dflt;
      return av + (bv - av) * p;
    }
  }
  return keys[keys.length - 1][field] ?? dflt;
}

// ── glyphs ──────────────────────────────────────────────────────────────────

/** The globe chip's mark: circle + equator + meridian ellipse. */
const Globe = ({ r, stroke, colour }) => {
  const d = r * 2;
  return (
    <svg width={d} height={d} viewBox="0 0 40 40" style={{ display: "block", overflow: "visible" }}>
      <g fill="none" stroke={colour} strokeWidth={(stroke / r) * 20}>
        <circle cx="20" cy="20" r="18" />
        <line x1="2" y1="20" x2="38" y2="20" />
        <ellipse cx="20" cy="20" rx="8.4" ry="18" />
      </g>
    </svg>
  );
};

/**
 * The submit arrow. Measured on the light skin: 27.3 tall x 20.7 wide inside a
 * 60px button (0.455 / 0.345 of the diameter), stroke 2.3.
 */
const ArrowUp = ({ h, w, stroke, colour }) => (
  <svg width={w} height={h} viewBox="0 0 20 27" style={{ display: "block", overflow: "visible" }}>
    <path d="M10 26 L10 2 M1.6 10.4 L10 1.4 L18.4 10.4"
      fill="none" stroke={colour} strokeWidth={(stroke / w) * 20}
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * The bullet orb. A blurred off-centre radial gradient: measured profile is
 * saturated to r~20 (ref px), falling to ground by r~45, core [153,35,130]
 * magenta with a violet [178,23,178] lobe low-right and an orchid rim upper
 * left — so it is two stacked gradients, not one.
 */
const Orb = ({ x, y, r, blur, hi, mid, lo, violet }) => (
  <div style={{
    position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2,
    borderRadius: "50%",
    background: [
      `radial-gradient(circle at 68% 76%, ${rgba(violet, 0.95)} 0%, ${rgba(violet, 0)} 58%)`,
      `radial-gradient(circle at 34% 30%, ${rgb(hi)} 0%, ${rgb(mid)} 38%, ${rgb(lo)} 82%, ${rgb(lo)} 100%)`,
    ].join(","),
    filter: `blur(${blur}px)`,
  }} />
);

/**
 * The watercolour flower field. NOT a photoreal meadow: a near-white base, a
 * soft lavender wash, a bottom band of small blurred petals (pink / magenta /
 * lilac / cream) that is out of frame once the camera has pushed in, and a
 * `push` layer that ramps up with the punch-in.
 *
 * That last layer is a measurement, not a flourish: magnifying a static ground
 * does NOT reproduce the reference. The frame's top band goes [252,252,253] ->
 * [229,204,246] across the beat — the camera is closing on out-of-focus blooms,
 * so the wash genuinely deepens. `pushKeys` carries that ramp, and it is a pure
 * function of scene-relative ms, so out-of-order renderAtTime is still safe.
 */
const FlowerField = ({ base, haze = [], petals = [], push = [], pushAmount = 0, hazeBlur = 90, petalBlur = 26 }) => {
  const blobs = (list, pad, blur, mul) => (
    <div style={{
      position: "absolute", inset: -pad, filter: `blur(${blur}px)`,
      background: list.map((h) =>
        `radial-gradient(circle ${h.r}px at ${h.x + pad}px ${h.y + pad}px, ${rgba(h.c, h.a * mul)} 0%, ${rgba(h.c, 0)} 100%)`
      ).join(","),
    }} />
  );
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: rgb(base) }}>
      {haze.length > 0 && blobs(haze, 240, hazeBlur, 1)}
      {petals.length > 0 && blobs(petals, 160, petalBlur, 1)}
      {push.length > 0 && pushAmount > 0.004 && blobs(push, 300, hazeBlur, pushAmount)}
    </div>
  );
};

// ── the beat ────────────────────────────────────────────────────────────────

export function DomainInput({
  t, from, to,
  mode = "input",
  pill = { x: 210, y: 340, w: 869.3, h: 126 },
  pillRadius = null,               // null = h/2, the measured true pill
  orb = { x: 267.3, y: 403.3, r: 30 },
  orbBlur = 7,
  orbHi = [214, 120, 226], orbMid = [166, 33, 132], orbLo = [138, 26, 106],
  orbViolet = [178, 23, 190],
  label = null,                    // {text, globeX, globeY, globeR, chipR, textX, baseline, size, weight, colour, chipColour, chipAlpha, stroke}
  placeholder = null,              // {text, x, baseline, size, colour, fadeAtMs, fadeMs}
  typed = null,                    // {text, x, baseline, size, colour, typeAtMs, cps}
  submit = null,                   // {x, y, r, face, arrowH, arrowW, arrowStroke, arrowColour, ring, ringWidth}
  ground = null,                   // FlowerField props, input skin only
  pillFill = "linear-gradient(97deg, #fbfdfc 0%, #ffffff 42%, #fafcff 100%)",
  pillShadow = "0 16px 34px rgba(120,100,160,0.20), 0 3px 8px rgba(120,100,160,0.10)",
  darkShadow = "0 30px 90px rgba(150,40,240,0.30)",
  backdrop = null,                 // submit skin: {colour, inMs}
  gloss = null,                    // submit skin: {keys:[{atMs,x,w,amount}], angleDeg, rim}
  flash = null,                    // {atMs, durMs, colour, x, y, r, angleDeg} light-leak wipe
  fadeOutAtMs = null, fadeOutMs = 80,
}) {
  if (t < from - 0.001 || t > to + 0.001) return null;
  const ms = (t - from) * 1000;

  const R = pillRadius ?? pill.h / 2;
  const dark = mode === "submit";

  // typed prompt — floor()+1 so character 1 lands exactly on typeAtMs, which is
  // how the reference measures (11 chars, 72ms apart, first on frame 5.40).
  const typedN = typed && ms >= typed.typeAtMs
    ? Math.min([...typed.text].length,
      Math.floor(((ms - typed.typeAtMs) / 1000) * typed.cps) + 1)
    : 0;
  const typedStr = typed ? [...typed.text].slice(0, typedN).join("") : "";

  // placeholder holds, then fades; it is gone well before the first keystroke.
  let phO = placeholder ? 1 : 0;
  if (placeholder && placeholder.fadeAtMs != null) {
    phO = 1 - clamp01((ms - placeholder.fadeAtMs) / Math.max(1, placeholder.fadeMs ?? 80));
  }
  if (typedN > 0) phO = 0;

  const backdropO = backdrop
    ? clamp01(ms / Math.max(1, backdrop.inMs ?? 40))
    : 0;

  const outO = fadeOutAtMs != null
    ? 1 - clamp01((ms - fadeOutAtMs) / Math.max(1, fadeOutMs))
    : 1;
  if (outO <= 0.004) return null;

  const glossX = gloss ? keyAt(gloss.keys, ms, "x", 0) : 0;
  const glossW = gloss ? keyAt(gloss.keys, ms, "w", 200) : 0;
  const glossA = gloss ? keyAt(gloss.keys, ms, "amount", 0) : 0;
  // The fill lands hot and cools to its base purple on the SAME expo the camera
  // settles on (measured tau ~0.22s on both channels) — the landing reads as one
  // event, so this is a channel of the gloss, not a separate fade. It is a RAMP,
  // not a veil: on the landing frames the reference measures [133,46,198] at the
  // pill's left and [229,199,251] at its right, evening out by ~400ms.
  const glossWash = gloss ? keyAt(gloss.keys, ms, "wash", 0) : 0;
  const glossWashR = gloss ? keyAt(gloss.keys, ms, "washR", glossWash) : 0;

  const flashE = flash
    ? clamp01((ms - (flash.atMs ?? 0)) / Math.max(1, flash.durMs ?? 120))
    : 0;
  const flashOn = flash && ms >= (flash.atMs ?? 0) - 0.5 && flashE < 1;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: outO }}>

      {/* ground */}
      {ground && (
        <FlowerField {...ground}
          pushAmount={keyAt(ground.pushKeys, ms, "amount", ground.pushKeys ? 0 : 1)} />
      )}
      {backdrop && backdropO > 0.004 && (
        <div style={{ position: "absolute", inset: -600, background: rgb(backdrop.colour), opacity: backdropO }} />
      )}

      {/* label row: pale chip, globe mark, bold serif caption */}
      {label && (
        <>
          {(label.chipR ?? 0) > 0 && (
            <div style={{
              position: "absolute",
              left: label.globeX - label.chipR, top: label.globeY - label.chipR,
              width: label.chipR * 2, height: label.chipR * 2, borderRadius: "50%",
              background: rgba(label.chipColour ?? [255, 255, 255], label.chipAlpha ?? 0.42),
            }} />
          )}
          <div style={{
            position: "absolute",
            left: label.globeX - label.globeR, top: label.globeY - label.globeR,
          }}>
            <Globe r={label.globeR} stroke={label.stroke ?? 2}
              colour={rgb(label.colour ?? [17, 15, 20])} />
          </div>
          <BaselineText x={label.textX} baseline={label.baseline} size={label.size ?? 28}
            baselineEm={label.baselineEm ?? 0.15} scaleX={label.scaleX ?? 1}
            style={{
              fontFamily: SERIF, fontWeight: label.weight ?? 700,
              color: rgb(label.colour ?? [17, 15, 20]), letterSpacing: "-0.005em",
            }}>
            {label.text}
          </BaselineText>
        </>
      )}

      {/* the pill */}
      <div style={{
        position: "absolute", left: pill.x, top: pill.y, width: pill.w, height: pill.h,
        borderRadius: R, overflow: "hidden",
        background: dark ? rgb(gloss?.base ?? [123, 36, 188]) : pillFill,
        boxShadow: dark ? darkShadow : pillShadow,
      }}>
        {/* specular sweep — screen-fixed in the reference, so its content x is
            keyed to cancel the camera's leftward settle */}
        {dark && (glossWash > 0.004 || glossWashR > 0.004) && (() => {
          // washX0/washX1 are CONTENT x — the ramp is a lighting edge sweeping
          // the pill, not a property of the pill's own extent, and on the
          // landing frames most of the pill is off-frame left.
          const p0 = ((keyAt(gloss.keys, ms, "x0", pill.x) - pill.x) / pill.w) * 100;
          const p1 = ((keyAt(gloss.keys, ms, "x1", pill.x + pill.w) - pill.x) / pill.w) * 100;
          return (
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(90deg, rgba(255,255,255,${glossWash.toFixed(3)}) ${p0.toFixed(2)}%, rgba(255,255,255,${glossWashR.toFixed(3)}) ${p1.toFixed(2)}%)`,
            }} />
          );
        })()}
        {dark && gloss && glossA > 0.004 && (
          <>
            <div style={{
              // gloss.keys carry CONTENT x; this div lives inside the pill, so
              // rebase it — otherwise the band walks off the clip as the pill
              // slides and simply vanishes.
              position: "absolute", top: -pill.h, bottom: -pill.h,
              left: glossX - pill.x - glossW / 2, width: glossW,
              transform: `skewX(${-(gloss.angleDeg ?? 14)}deg)`,
              background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${(glossA * 0.55).toFixed(3)}) 34%, rgba(255,255,255,${glossA.toFixed(3)}) 50%, rgba(255,255,255,${(glossA * 0.55).toFixed(3)}) 66%, rgba(255,255,255,0) 100%)`,
            }} />
            {(gloss.rim ?? 0) > 0 && (
              <div style={{
                position: "absolute", top: 0, height: gloss.rim,
                left: glossX - pill.x - glossW * 0.75, width: glossW * 1.5,
                background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${Math.min(1, glossA * 1.5).toFixed(3)}) 50%, rgba(255,255,255,0) 100%)`,
              }} />
            )}
          </>
        )}
      </div>

      {/* bullet orb */}
      {orb && (
        <Orb x={orb.x} y={orb.y} r={orb.r} blur={orbBlur}
          hi={orbHi} mid={orbMid} lo={orbLo} violet={orbViolet} />
      )}

      {/* placeholder / typed domain */}
      {placeholder && phO > 0.004 && (
        <BaselineText x={placeholder.x} baseline={placeholder.baseline}
          size={placeholder.size ?? 36} baselineEm={placeholder.baselineEm ?? 0.203}
          scaleX={placeholder.scaleX ?? 1}
          style={{
            fontFamily: SERIF, fontWeight: 400,
            color: rgb(placeholder.colour ?? [176, 183, 183]), opacity: phO,
          }}>
          {placeholder.text}
        </BaselineText>
      )}
      {typed && typedN > 0 && (
        <BaselineText x={typed.x} baseline={typed.baseline} size={typed.size ?? 36}
          baselineEm={typed.baselineEm ?? 0.203} scaleX={typed.scaleX ?? 1}
          style={{
            fontFamily: SERIF, fontWeight: 400,
            color: rgb(typed.colour ?? [10, 4, 18]),
          }}>
          {typedStr}
        </BaselineText>
      )}

      {/* submit — a filled disc on the light skin. On the dark skin it is the
          SAME button caught mid-morph: `faceKeys` carries its measured interior
          from the deep violet it lands on to the pale lilac it rests at, while
          the hairline ring fades in over it. */}
      {submit && (() => {
        const fk = submit.faceKeys;
        const face = fk
          ? [keyAt(fk, ms, "r", 0), keyAt(fk, ms, "g", 0), keyAt(fk, ms, "b", 0)]
          : submit.face;
        const faceA = fk ? keyAt(fk, ms, "a", 1) : 1;
        const ringA = fk ? keyAt(fk, ms, "ra", submit.ringAlpha ?? 0.92)
          : (submit.ringAlpha ?? 0.92);
        return (
          <div style={{
            position: "absolute",
            left: submit.x - submit.r, top: submit.y - submit.r,
            width: submit.r * 2, height: submit.r * 2, borderRadius: "50%",
            background: face ? rgba(face, faceA) : "transparent",
            border: submit.ring
              ? `${submit.ringWidth ?? 0.8}px solid ${rgba(submit.ring, ringA)}`
              : "none",
            boxSizing: "border-box",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ArrowUp h={submit.arrowH ?? 27.3} w={submit.arrowW ?? 20.7}
              stroke={submit.arrowStroke ?? 2.3}
              colour={rgb(submit.arrowColour ?? [246, 244, 248])} />
          </div>
        );
      })()}

      {/* The whip's cut. Two layers, because the reference's is two things: a
          hard DARK wedge sweeping down from the top-right corner (the ground
          going black ahead of the pill) and a purple light leak blooming across
          it. The wedge is what makes the frame read as a cut rather than a fade,
          and it arrives first. */}
      {flashOn && flash.wipe && (() => {
        const w = flash.wipe;
        const edge = (w.from ?? 140) + ((w.to ?? 20) - (w.from ?? 140)) * flashE;
        return (
          <div style={{
            // inset 0 (not the bloom's -700): the wedge's gradient stops are
            // percentages, so it has to span a box whose extent is knowable.
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `linear-gradient(${w.deg ?? 52}deg, ${rgba(w.colour ?? [4, 2, 8], 0)} ${(edge - (w.soft ?? 10)).toFixed(1)}%, ${rgba(w.colour ?? [4, 2, 8], 1)} ${edge.toFixed(1)}%)`,
          }} />
        );
      })()}
      {flashOn && (
        <div style={{
          position: "absolute", inset: -700, pointerEvents: "none",
          // ramps IN over inMs then rides the wipe out — the reference's leak
          // is absent at 6.80, mild at 6.84 and blown out at 6.88
          opacity: clamp01((ms - (flash.atMs ?? 0)) / Math.max(1, flash.inMs ?? 1)) * (1 - flashE),
          background: `radial-gradient(circle ${flash.r ?? 900}px at ${(flash.x ?? 1200) + 700 - (flash.travel ?? 0) * flashE}px ${(flash.y ?? 180) + 700}px, ${rgba(flash.core ?? [246, 226, 255], 0.98)} 0%, ${rgba(flash.colour ?? [186, 84, 245], 0.92)} 26%, ${rgba(flash.colour ?? [186, 84, 245], 0.5)} 52%, ${rgba(flash.colour ?? [186, 84, 245], 0)} 78%)`,
        }} />
      )}
    </div>
  );
}
