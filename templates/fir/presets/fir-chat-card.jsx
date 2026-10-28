/**
 * fir-chat-card.jsx — the floating agent chat card (the fir template's hero UI).
 *
 * One scene owns the card across both demo scenarios: it rises in from the
 * bottom with a damped spring, holds, slides right when the film splits,
 * clears its thread, plays a second scenario, then accelerates up and out
 * with motion blur. Items are laid out at MEASURED card-local y positions
 * (720p design space) and pop in with a short scale+fade. Any item can POP
 * OUT: it grows out of the thread to a frame-space rect at proportionally
 * larger type (the film's emphasis move), optionally swapping its copy
 * through several languages, then returns.
 *
 * All geometry below is measured off references/walkthrough/fin2.mp4 at 1920
 * and divided by 1.5 for the 1280x720 stage. See templates/fir/work/scenes/2/
 * for the traces (t10-t17, p1-p7).
 *
 * Pure function of t.
 */
import React from "react";
import { clamp01, lerp, rgb, easeByName } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";
import { s, kv, absKeys, Mark, MARK_GEOM_MEASURED } from "./fir-shared.jsx";

// measured: bubble text rgb(24,24,22); grey bubble rgb(240,240,238);
// secondary label rgb(122,122,120); brand blue rgb(48,57,240).
const INK = [24, 24, 22];
const GREY = [240, 240, 238];
const GREY_TEXT = [122, 122, 120];
const BLUE = [48, 57, 240];

// Measured type/box metrics, stage px, for the in-card size (16.7px body).
// padV/padH/radius are absolute at scale 1 and scale with a popout.
// blockSkew: the reference's copy block sits ~8 stage px right of the bubble's
// geometric centre in BOTH the in-card and the popped state (ink centres 1003.5
// vs box 996, and 986.5 vs 974.5 @1920) — a constant, so it does not scale.
const TYPE = { size: 16.7, lineH: 1.4, padV: 20.4, padH: 24, radius: 15, tracking: "0.022em", blockSkew: 5.3 };

const mergeType = (cfg) => ({ ...TYPE, ...(cfg?.type ?? {}) });

/**
 * Item entry: a short scale+fade pop, anchored at the corner the reference
 * grows from (bot bubbles grow down from their top-left, the user bubble from
 * its top-right, the map up from its bottom-left). 60fps measurement puts most
 * of these at 3-5 frames; the answer bubble and map are slower (0.18-0.23s).
 */
function itemEnter(t, atS, durS, fromScale, fadeS) {
  const p = easeByName("out")(clamp01((t - atS) / Math.max(1e-6, durS)));
  // The short pops reach full opacity before their scale settles; the two slow
  // entries (answer bubble, map) keep fading well past their geometry — at 6.66
  // the reference has both near full size but around half opacity.
  const o = fadeS != null ? clamp01((t - atS) / fadeS) : Math.min(1, p * 1.6);
  return { o, scale: lerp(fromScale, 1, p) };
}

function Para({ p }) {
  // Line breaks in this film are AUTHORED, not reflowed: every measured line in
  // the reference is set to its own width and the longest ones deliberately
  // overrun the bubble's symmetric padding (the answer bubble's bold line is
  // 294 stage px inside a 284px padding box, and the popped Spanish line is
  // 486 inside 445). So "pre" is the default and a config must opt IN to
  // wrapping with `wrap: true` — otherwise a font-metric difference silently
  // adds a line and the box grows.
  const text = p.text ?? "";
  return (
    <div style={{ fontWeight: p.bold ? 700 : 400, whiteSpace: p.wrap ? "pre-wrap" : "pre",
      letterSpacing: p.tracking }}>{text}</div>
  );
}

function Paras({ item, inkO }) {
  const body = (item.paras ?? [{ text: item.text, wrap: item.wrap }]).map((p, i) => <Para key={i} p={p} />);
  return inkO != null && inkO < 0.999 ? <div style={{ opacity: inkO }}>{body}</div> : body;
}

/** The delivery-tracking map card: white stepper strip, road plan, white pill. */
function MapCard({ w, h, u, item }) {
  const strip = 25.3 * u;           // 38 @1920
  const steps = item.steps ?? ["Order placed", "In transit", "Out for delivery", "Delivered"];
  const active = item.activeStep ?? 2;
  const bodyH = h - strip;
  return (
    <div style={{ width: w, height: h, borderRadius: 9 * u, overflow: "hidden", position: "relative", fontFamily: FONT, background: "#fff" }}>
      <svg width={w} height={bodyH} viewBox="0 0 332 136" preserveAspectRatio="none"
        style={{ position: "absolute", left: 0, top: strip }}>
        <rect width="332" height="136" fill="#f1efeb" />
        {/* water sweeping down the right third (measured: blue-grey #a9c6d9) */}
        <path d="M206,-4 C224,22 248,34 262,60 C276,88 272,114 264,140 L340,140 L340,-4 Z" fill="#a9c6d9" />
        <path d="M262,60 C286,62 310,54 340,44 L340,86 C312,92 286,88 266,84 Z" fill="#a9c6d9" />
        {/* parks */}
        <g fill="#d8e8cd">
          <rect x="-4" y="26" width="52" height="26" rx="3" />
          <rect x="150" y="98" width="58" height="38" rx="3" />
          <rect x="98" y="-4" width="46" height="22" rx="3" />
        </g>
        {/* pale blocks */}
        <g fill="#fbfaf8">
          <rect x="6" y="60" width="56" height="26" rx="2" />
          <rect x="98" y="26" width="58" height="30" rx="2" />
          <rect x="8" y="98" width="52" height="30" rx="2" />
          <rect x="186" y="18" width="34" height="26" rx="2" />
          <rect x="98" y="66" width="54" height="24" rx="2" />
        </g>
        {/* roads */}
        <g stroke="#c3cdd7" fill="none" strokeLinecap="round">
          <path d="M-6,58 L246,50" strokeWidth="13" />
          <path d="M-6,94 L214,88" strokeWidth="8" />
          <path d="M72,-6 L86,140" strokeWidth="9" />
          <path d="M168,-6 L184,140" strokeWidth="6" />
          <path d="M-6,20 L200,12" strokeWidth="6" />
          <path d="M186,16 L262,60" strokeWidth="5" />
          <path d="M-6,122 L150,116" strokeWidth="5" />
        </g>
        {/* place markers */}
        <g>
          <circle cx="30" cy="40" r="2.6" fill="#e0a04a" />
          <circle cx="132" cy="20" r="2.6" fill="#6f93e0" />
          <circle cx="44" cy="110" r="2.6" fill="#63a877" />
          <circle cx="222" cy="74" r="2.6" fill="#cf7d78" />
          <circle cx="176" cy="104" r="2.6" fill="#9aa0a6" />
        </g>
        {/* route + destination pin */}
        <path d="M244,20 L188,44 L104,66" stroke={rgb(BLUE)} strokeWidth="2.8" fill="none"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.72" />
        <circle cx="244" cy="20" r="4" fill={rgb(BLUE)} opacity="0.85" />
        <circle cx="104" cy="66" r="5" fill={rgb(BLUE)} stroke="#fff" strokeWidth="2" />
      </svg>
      {/* status stepper */}
      <div style={{
        position: "absolute", left: 0, top: 0, width: w, height: strip, background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: `0 ${17 * u}px`, boxSizing: "border-box",
        fontSize: 9.3 * u, whiteSpace: "nowrap",
      }}>
        {steps.map((label, i) => (
          <span key={i} style={i === active ? {
            background: "#dee7fb", color: rgb([56, 88, 205]), fontWeight: 700,
            borderRadius: 999, padding: `${3.4 * u}px ${8 * u}px`,
          } : {
            display: "flex", alignItems: "center", gap: 3 * u,
            color: i < active ? "#bdbdbb" : "#3a3a38", fontWeight: i > active ? 600 : 400,
          }}>
            {i < active && <span style={{
              display: "inline-block", width: 7 * u, height: 7 * u, borderRadius: 1.4 * u,
              border: `${1.2 * u}px solid #cdcdcb`,
            }} />}
            {label}
          </span>
        ))}
      </div>
      {/* open-in-app pill: white, blue label */}
      <div style={{
        position: "absolute", left: "50%", bottom: 14 * u, transform: "translateX(-50%)",
        background: "#fff", color: rgb([46, 62, 226]), fontSize: 14.8 * u, fontWeight: 700,
        lineHeight: 1.2, padding: `${6 * u}px ${11.3 * u}px`, borderRadius: 999, whiteSpace: "nowrap",
        boxShadow: `0 ${1.5 * u}px ${5 * u}px rgba(20,20,40,0.16)`,
      }}>{item.pill ?? "Open in App"}</div>
    </div>
  );
}

/**
 * Interior of an item at a given scale. `sc` multiplies the measured metrics,
 * so the same component draws the in-card item and its popped-out twin.
 */
function ItemBody({ item, sc, ty, width, mark, inkO, minH }) {
  const size = (item.size ?? ty.size) * sc;
  const padV = ty.padV * sc, padH = ty.padH * sc;
  const radius = ty.radius; // measured: the corner radius does NOT scale with a popout
  const lh = ty.lineH;
  if (item.kind === "user" || item.kind === "bot") {
    return (
      <div style={{
        background: item.kind === "user" ? rgb(item.colour ?? BLUE) : rgb(GREY),
        color: item.kind === "user" ? "#fff" : rgb(INK),
        fontSize: size, lineHeight: lh, fontFamily: FONT, letterSpacing: ty.tracking,
        padding: `${padV}px ${padH - (ty.blockSkew ?? 0)}px ${padV}px ${padH + (ty.blockSkew ?? 0)}px`,
        borderRadius: radius,
        width: width != null ? width - padH * 2 : "max-content",
        minHeight: minH != null ? Math.max(0, minH - padV * 2) : undefined,
        // The copy block is CENTRED in the box, not left-aligned: the popped
        // bubble holds one rect while Spanish/German set ~40px@1920 wider than
        // English and overrun it SYMMETRICALLY (ink lefts 640/615/621/619 for
        // EN/ES/DE/ZH inside the same 584..1365 box), and the returned Chinese
        // lands at 769 in a 747..1245 card bubble = exactly centred.
        display: "flex", justifyContent: "center",
      }}><div><Paras item={item} inkO={inkO} /></div></div>
    );
  }
  if (item.kind === "thinking") {
    // measured: plain dark text on the card, no bubble behind it
    return (
      <div style={{
        color: rgb(item.colour ?? INK), fontSize: size, lineHeight: lh,
        fontFamily: FONT, whiteSpace: "nowrap", letterSpacing: ty.tracking,
      }}>{item.text ?? "Thinking..."}</div>
    );
  }
  if (item.kind === "map") {
    const w = width ?? 332, h = (item.h ?? 161.3) * (w / 332);
    return <MapCard w={w} h={h} u={w / 332} item={item} />;
  }
  if (item.kind === "answercard") {
    const divider = "1px solid rgba(0,0,0,0.07)";
    return (
      <div style={{
        background: rgb(GREY), color: rgb(INK), fontSize: size, lineHeight: lh,
        borderRadius: radius, fontFamily: FONT, overflow: "hidden",
        width: width ?? 332,
      }}>
        <div style={{ padding: `${padV}px ${padH}px ${padV * 0.55}px` }}>
          <Paras item={item} inkO={inkO} />
          {item.source && <>
            <div style={{ color: rgb(GREY_TEXT), marginTop: padV * 0.6 }}>{item.source.label ?? "Source"}</div>
            <div style={{ display: "flex", alignItems: "center", marginTop: padV * 0.18, paddingBottom: padV * 0.4 }}>
              <div style={{ flex: 1 }}>{item.source.title}</div>
              <div style={{ color: rgb(BLUE), fontWeight: 600, transform: "scaleY(1.4)" }}>›</div>
            </div>
          </>}
        </div>
        {item.footer && (
          <div style={{
            // MEASURED (fin2 f193, answer card at rest): the AI/Answer footer
            // row is 80px @1920 tall around a 24px chip, i.e. ~18.7 stage of
            // padding each side — well over padV*0.5. `footerPadV` (stage px at
            // scale 1) sets it; omitted, it is the old padV*0.5 exactly.
            borderTop: divider, background: "rgba(0,0,0,0.016)", display: "flex",
            alignItems: "center", padding: `${(item.footerPadV ?? ty.padV * 0.5) * sc}px ${padH}px`, gap: size * 0.5,
          }}>
            <span style={{
              background: rgb([103, 103, 103]), color: "#fff", fontWeight: 700,
              fontSize: size * 0.62, borderRadius: size * 0.22, padding: `${size * 0.1}px ${size * 0.26}px`,
              letterSpacing: "0.02em",
            }}>{item.footer.chip ?? "AI"}</span>
            <span style={{ color: rgb(GREY_TEXT), flex: 1 }}>{item.footer.label ?? "Answer"}</span>
            <span style={{
              color: rgb(GREY_TEXT), border: `1.4px solid ${rgb([150, 150, 148])}`, borderRadius: "50%",
              width: size * 0.78, height: size * 0.78, fontSize: size * 0.56, display: "flex",
              alignItems: "center", justifyContent: "center", fontStyle: "italic", fontFamily: "Georgia,serif",
            }}>i</span>
          </div>
        )}
      </div>
    );
  }
  if (item.kind === "pills") {
    return (
      <div style={{ display: "flex", gap: size * 0.78, fontFamily: FONT }}>
        {(item.options ?? []).map((o, i) => (
          <div key={i} style={{
            background: rgb([228, 227, 249]), color: rgb([73, 70, 225]), fontSize: size,
            padding: `${size * 0.5}px ${size * 1.0}px`, borderRadius: size * 0.55,
          }}>{o}</div>
        ))}
      </div>
    );
  }
  return null;
}

/** Which language state is live inside a popout, and its crossfade opacity. */
/** The last language a popout has swapped IN by time t. It persists after the
 *  bubble returns to the thread (see the item render). */
function settledLang(pop, from, t) {
  const langs = pop.langs ?? [];
  let live = null;
  for (let k = 1; k < langs.length; k++) if (t >= from + s(langs[k].inAtMs)) live = langs[k];
  return live;
}

function liveLang(pop, from, t) {
  const langs = pop.langs ?? [];
  if (langs.length < 2) return { item: langs[0] ?? null, o: 1 };
  const fade = s(pop.langFadeMs ?? 115);
  let idx = 0, o = 1;
  for (let k = 1; k < langs.length; k++) {
    const outAt = from + s(langs[k].outAtMs);
    const inAt = from + s(langs[k].inAtMs);
    if (t < outAt) break;
    if (t < outAt + fade) { idx = k - 1; o = 1 - (t - outAt) / fade; break; }
    if (t < inAt) { idx = k - 1; o = 0; break; }
    idx = k;
    o = clamp01((t - inAt) / fade);
  }
  return { item: langs[idx], o: clamp01(o) };
}

export function FirChatCard({ t, from, to, cfg }) {
  if (t < from || t > to) return null;
  const card = cfg.card ?? {};
  const W = card.w ?? 468.7, H = card.h ?? 700, X = card.x ?? 418.7, Y = card.y ?? 53.3;
  const R = card.radius ?? 14;
  const st = kv(absKeys(cfg.startMs, card.keys ?? []), t, { dx: 0, dy: 0, blur: 0, blurY: 0, opacity: 1 });
  if (st.opacity <= 0.003) return null;
  const mark = cfg.mark ?? { bg: [17, 17, 17], fg: [255, 255, 255] };
  const ty = mergeType(cfg);
  const lay = {
    headerH: 73.3, bubbleX: 79.3, gutterX: 23.3, avatarSize: 41.3, rightPad: 30,
    ...(cfg.layout ?? {}),
  };
  const items = cfg.items ?? [];
  const popouts = cfg.popouts ?? [];

  // whole-thread fade-out (measured 16.80 -> 17.16 film-absolute: 360ms, linear)
  let threadO = 1;
  if (cfg.threadFade) {
    const f0 = from + s(cfg.threadFade.atMs);
    threadO = 1 - clamp01((t - f0) / Math.max(1e-6, s(cfg.threadFade.durMs ?? 360)));
    if (threadO <= 0.002) threadO = 0;
  }

  const popState = popouts.map((pop) => {
    const keys = absKeys(cfg.startMs, pop.keys ?? []);
    const p = keys.length ? clamp01(kv(keys, t, { p: 0 }).p) : 0;
    const first = keys.length ? keys[0].t : Infinity;
    const last = keys.length ? keys[keys.length - 1].t : -Infinity;
    return { pop, p, live: t >= first && (t <= last || p > 0.0005) };
  });

  const renderedItems = items.map((it, idx) => {
    const atS = from + s(it.atMs ?? 0);
    if (t < atS) return null;
    let clearO = 1;
    if (it.hideAtMs != null) {
      const f = s(it.hideFadeMs ?? 60);
      clearO = 1 - clamp01((t - (from + s(it.hideAtMs))) / f);
      if (clearO <= 0) return null;
    }
    const ps = popState.find((q) => q.pop.itemIndex === idx);
    // The popout layer draws the item instead. EXCEPT its avatar when
    // `avatarKeepOnPop` is set: measured on the "I'm on it!" pop (fin2
    // 28.69-30.48), the avatar tile stays at 1119..1181 x 963..1027 @1920 the
    // whole time while only the bubble grows — the bubble's popped left edge
    // (1183) clears the avatar, so it never gets covered the way the two
    // earlier, wider popouts cover theirs.
    const popped = !!(ps && ps.live);
    if (popped && !it.avatarKeepOnPop) return null;
    // A popout's last language PERSISTS in the thread after the bubble returns:
    // the reference card still holds the Chinese copy from 16.6 until the thread
    // fades at 16.8-17.16 (f0169 ink 769..1225 = the ZH block, card-centred).
    const settled = ps && ps.pop.langs ? settledLang(ps.pop, from, t) : null;
    const body = settled ? { ...it, ...settled } : it;

    const en = itemEnter(t, atS, s(it.enterMs ?? 90), it.enterFrom ?? 0.86, it.fadeMs != null ? s(it.fadeMs) : null);
    const right = it.kind === "user" || it.kind === "pills";
    const origin = it.anchor ?? (right ? "top right" : it.kind === "map" ? "bottom left" : "top left");
    let avO = 0;
    if (it.avatar) {
      // avatarAtMs lets an avatar arrive later than its item (the answer/map
      // group's avatar lands at 6.77, 0.25s after the map starts drawing).
      avO = it.avatarAtMs != null
        ? clamp01((t - (from + s(it.avatarAtMs))) / s(it.avatarInMs ?? 120))
        : 1;
      if (it.avatarHideAtMs != null) avO = Math.min(avO, 1 - clamp01((t - (from + s(it.avatarHideAtMs))) / s(it.avatarFadeMs ?? 70)));
      avO = clamp01(avO) * (it.avatarAtMs != null ? 1 : en.o);
    }
    return (
      <div key={idx} style={{ position: "absolute", top: it.y, left: 0, right: 0, opacity: en.o * clearO }}>
        {!popped && <div style={{
          position: "absolute", top: 0, opacity: threadO,
          ...(right ? { right: it.rightPad ?? lay.rightPad } : { left: it.x ?? lay.bubbleX }),
          transform: `scale(${en.scale})`, transformOrigin: origin,
        }}>
          <ItemBody item={body} sc={1} ty={ty} width={it.w} mark={mark} />
        </div>}
        {it.avatar && avO > 0.002 && (
          <div style={{ position: "absolute", left: lay.gutterX, top: it.avatarY ?? 0, opacity: avO }}>
            <Mark size={lay.avatarSize} bg={mark.bg} fg={mark.fg} geom={MARK_GEOM_MEASURED}
              mouth={it.avatarFace === "think" ? "none" : "grin"}
              face={it.avatarFace ?? "grin"}
              thinkT={it.avatarAnimAtMs != null ? t - (from + s(it.avatarAnimAtMs)) : null} />
          </div>
        )}
      </div>
    );
  });

  // ---- popout layers (frame space, so they escape the card) ----
  const popLayers = popState.map(({ pop, p, live }, i) => {
    if (!live) return null;
    const it = items[pop.itemIndex];
    if (!it) return null;
    const right = it.kind === "user";
    const srcW = pop.srcW ?? it.w ?? 300;
    const srcX = X + st.dx + (right ? W - (it.rightPad ?? lay.rightPad) - srcW : (it.x ?? lay.bubbleX));
    const srcY = Y + st.dy + lay.headerH + it.y;
    const [dx, dy, dw, dh] = pop.rect;
    const x = lerp(srcX, dx, p), y = lerp(srcY, dy, p), w = lerp(srcW, dw, p);
    const sc = w / srcW;
    // the reference's popped bubble is a FIXED box: the 2-line Chinese state
    // sits top-aligned in the same rect the 3-line states fill (langswap trace,
    // outL constant at [584,420..678] through every swap).
    const minH = pop.srcH != null && dh != null ? lerp(pop.srcH, dh, p) : undefined;
    const lang = pop.langs && pop.langs.length ? liveLang(pop, from, t) : null;
    const body = lang && lang.item ? { ...it, ...lang.item } : it;
    // `shadow` {dy,blur,alpha} overrides the default reach. Measured on the
    // scene-3 popouts (fin2 f151/f223 vruns): the dark band around a popped
    // bubble is only ~8px @1920 = 5.3 stage deep, so the default 14 draws a
    // visible halo where the reference has a tight edge.
    const shc = pop.shadow ?? { dy: 3, blur: 14, alpha: 0.16 };
    const sh = shc.alpha * p;
    return (
      <div key={"pop" + i} style={{
        position: "absolute", left: x, top: y, width: w, opacity: st.opacity * threadO,
        filter: `drop-shadow(0 ${shc.dy * p}px ${shc.blur * p}px rgba(24,20,70,${sh}))`,
      }}>
        <ItemBody item={body} sc={sc} ty={ty} width={w} mark={mark} inkO={lang ? lang.o : 1} minH={minH} />
      </div>
    );
  });

  const header = cfg.header ?? { name: "Fin", sub: "Agent", chip: "AI" };
  // The reference is shot with a real shutter, so the card's 105 stage-px/frame
  // rise smears vertically (its header mark is a ~53px streak at t=3.50).
  // `blurY` keys a Y-ONLY gaussian; `blur` stays the isotropic channel.
  const fid = `firBlurY-${cfg.id ?? "card"}`;
  const fx = [];
  if (st.blurY > 0.25) fx.push(`url(#${fid})`);
  if (st.blur > 0.3) fx.push(`blur(${st.blur.toFixed(1)}px)`);
  return (
    <div style={{ position: "absolute", inset: 0, filter: fx.length ? fx.join(" ") : "none", opacity: st.opacity }}>
      {st.blurY > 0.25 && (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <filter id={fid} x="-25%" y="-80%" width="150%" height="260%">
            <feGaussianBlur stdDeviation={`0 ${st.blurY.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <div style={{
        position: "absolute", left: X + st.dx, top: Y + st.dy, width: W, height: H,
        background: "#fdfdfd", borderRadius: R, overflow: "hidden",
        boxShadow: "0 10px 34px rgba(24,20,70,0.14)",
      }}>
        {/* header — measured card-local geometry */}
        <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: lay.headerH, fontFamily: FONT }}>
          {/* measured: ink bbox 8 x 15.3 stage at card-local (32,29.3) */}
          <svg width="10" height="16.7" viewBox="0 0 12 20" style={{ position: "absolute", left: 30.6, top: 28.7 }}>
            <path d="M10 2 L3 10 L10 18" fill="none" stroke={rgb(header.chevron ?? BLUE)} strokeWidth="3.4"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ position: "absolute", left: 77.3, top: 19.3 }}>
            <Mark size={37.3} bg={header.markBg ?? mark.bg} fg={header.markFg ?? mark.fg} geom={MARK_GEOM_MEASURED} mouth="grin" />
          </div>
          <div style={{
            position: "absolute", left: 127.5, top: 15.8, fontSize: 18.3, fontWeight: 700,
            lineHeight: 1, color: rgb([20, 20, 20]),
          }}>{header.name}</div>
          <div style={{ position: "absolute", left: 128.7, top: 40.6, display: "flex", alignItems: "center", gap: 5.3 }}>
            <span style={{
              background: rgb([103, 103, 103]), color: "#fff", fontWeight: 700, fontSize: 10,
              lineHeight: "18px", height: 18, borderRadius: 3.3, padding: "0 5px", letterSpacing: "0.04em",
            }}>{header.chip ?? "AI"}</span>
            <span style={{ fontSize: 14.7, lineHeight: "18px", color: rgb(GREY_TEXT) }}>{header.sub}</span>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: "rgba(0,0,0,0.07)" }} />
        </div>
        {/* thread */}
        {/* threadFade dims each item BODY, not this container: the reference's
            last bot avatar survives the 16.8-17.16 fade and is still on the
            empty card at 17.16 (f0173). */}
        <div style={{ position: "absolute", left: 0, top: lay.headerH, right: 0, bottom: 0 }}>
          {renderedItems}
        </div>
      </div>
      {popLayers}
    </div>
  );
}
