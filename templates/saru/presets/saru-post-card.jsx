/**
 * saru-post-card.jsx — the Instagram post + the stranger's comment.
 *
 * The saru film opens on a brand's post floating over the indigo ground; a
 * comment card slides in beneath it and then ENLARGES TOWARD CAMERA — the same
 * emphasis move fir-chat-card makes with a popped bubble (grow a thread item
 * out to a frame-space rect at proportionally larger type), reused here for a
 * card that lives on the ground rather than inside a chat thread.
 *
 * Chrome is fir-chat-card's: an off-white rounded card on a soft blue-cast
 * shadow, near-black ink, a hairline divider, 700-weight handles. Nothing here
 * edits fir — `s`/`kv`/`absKeys` are imported from fir-shared, which is the
 * same sparse-key interpolator every fir scene keys its motion with.
 *
 * Pure function of t (seconds, absolute film clock). Design space 1280x720.
 */
import React from "react";
import { clamp01, lerp, rgb, easeByName } from "../../../src/lib/textcards/src/easing.js";
import { FONT } from "../../../src/lib/textcards/src/theme.js";
import { s, kv, absKeys } from "../../fir/presets/fir-shared.jsx";
import { NORTHTRAIL_POST, NORTHTRAIL_POST_GROUND } from "../assets/northtrail-post.data.js";

const INK = [22, 22, 27];
const SUB = [132, 132, 142];
const CARD = "#fdfdfd";
const HAIR = "rgba(0,0,0,0.075)";

/**
 * The post's picture: a REAL product photograph of the jacket the caption is
 * selling, not drawn art — a brand's feed is the one thing in this film the
 * viewer has seen ten thousand of, and a vector mountain reads as a diagram the
 * instant it sits next to real Instagram chrome.
 *
 * The picture is a 4:5 frame (the aspect the shot is composed and archived at,
 * beside this file as northtrail-post.jpg) shown through the post's SQUARE
 * window, so it covers and `focus` picks which band of it survives the crop.
 * Inlined as a data URI by the asset module: a frame-by-frame renderer gets no
 * second chance at a pending fetch. `ground` is the picture's own mean colour,
 * painted under it, so even a missed decode is a colour block and never white.
 */
function Photo({ w, src, ground, focus }) {
  return (
    <div style={{ width: w, height: w, overflow: "hidden", background: ground, position: "relative" }}>
      <img
        src={src} alt="" width={w} height={w} decoding="sync"
        style={{ display: "block", width: w, height: w, objectFit: "cover", objectPosition: focus }}
      />
    </div>
  );
}

/**
 * The @northtrail brand mark: a white avatar disc carrying a minimal twin-peak
 * glyph in the brand's deep green. Two overlapping triangles on one ground
 * line — the front peak is drawn with a white keyline so the overlap still
 * separates at 28px, which is the only size this is ever seen at. Flat fills,
 * no gradients: a tiny mark survives on shape alone.
 */
function PeakMark({ d, ink = "#2F4438", ring = "rgba(0,0,0,0.10)" }) {
  return (
    <svg width={d} height={d} viewBox="0 0 100 100" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="50" fill="#ffffff" />
      <polygon points="35.5,34.5 15.5,67.5 55.5,67.5" fill={ink} />
      <polygon points="60.5,24.5 36.5,67.5 84.5,67.5" fill={ink}
        stroke="#ffffff" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="48.5" fill="none" stroke={ring} strokeWidth="3" />
    </svg>
  );
}

/** A two-tone avatar disc — the brand's, or the stranger's plain dot. */
function Disc({ d, id, c1, c2, ring }) {
  return (
    <svg width={d} height={d} viewBox="0 0 100 100" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`${id}-d`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={ring ? 47 : 50} fill={`url(#${id}-d)`} />
      {ring && <circle cx="50" cy="50" r="47" fill="none" stroke="#ffffff" strokeWidth="5" opacity="0.85" />}
    </svg>
  );
}

/** Spans on one authored line — line breaks are authored, never reflowed. */
function Line({ spans, size, lh, colour }) {
  return (
    <div style={{ fontSize: size, lineHeight: lh, color: rgb(colour), whiteSpace: "pre" }}>
      {spans.map((sp, i) => (
        <span key={i} style={{ fontWeight: sp.bold ? 700 : 400, color: sp.colour ? rgb(sp.colour) : undefined }}>
          {sp.text}
        </span>
      ))}
    </div>
  );
}

/**
 * The post: header (avatar, @handle, overflow dots), full-bleed square photo,
 * authored caption block. Laid out at scale 1 in card-local px; the whole card
 * is transformed as a unit, so nothing here needs a scale factor.
 */
function PostCard({ cfg, id }) {
  const w = cfg.w ?? 356;
  const headerH = cfg.headerH ?? 50;
  const capH = cfg.captionH ?? 70;
  const padH = cfg.padH ?? 16;
  const av = cfg.avatarSize ?? 30;
  const capSize = cfg.captionSize ?? 13.5;
  const capLh = cfg.captionLineH ?? 1.45;
  const lines = cfg.caption ?? [];
  return (
    <div style={{
      width: w, height: headerH + w + capH, background: CARD, borderRadius: cfg.radius ?? 16,
      overflow: "hidden", fontFamily: FONT, position: "relative",
    }}>
      {/* header */}
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: headerH }}>
        <div style={{ position: "absolute", left: padH, top: (headerH - av) / 2 }}>
          {(cfg.avatarKind ?? "peaks") === "peaks"
            ? <PeakMark d={av} ink={cfg.avatarInk} ring={cfg.avatarRing} />
            : <Disc d={av} id={`${id}-brand`} c1={cfg.avatarC1 ?? "#5b7267"} c2={cfg.avatarC2 ?? "#2b3b34"} />}
        </div>
        <div style={{
          position: "absolute", left: padH + av + 11, top: 0, height: headerH,
          display: "flex", alignItems: "center", fontSize: cfg.handleSize ?? 14.2,
          fontWeight: 700, color: rgb(INK), letterSpacing: "-0.004em",
        }}>{cfg.handle ?? "@northtrail"}</div>
        {/* overflow dots */}
        <div style={{
          position: "absolute", right: padH, top: headerH / 2 - 1.5,
          display: "flex", gap: 3.2,
        }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: rgb(SUB) }} />
          ))}
        </div>
      </div>
      {/* square photo window onto the 4:5 product frame */}
      <div style={{ position: "absolute", left: 0, top: headerH, width: w, height: w }}>
        <Photo
          w={w}
          src={cfg.photoSrc ?? NORTHTRAIL_POST}
          ground={cfg.photoGround ?? NORTHTRAIL_POST_GROUND}
          focus={cfg.photoFocus ?? "50% 50%"}
        />
      </div>
      {/* caption */}
      <div style={{
        position: "absolute", left: padH, right: padH, top: headerH + w + (cfg.captionPadT ?? 15),
      }}>
        {lines.map((spans, i) => (
          <Line key={i} spans={spans} size={capSize} lh={capLh} colour={INK} />
        ))}
      </div>
    </div>
  );
}

/**
 * The stranger's comment, drawn at an arbitrary scale `sc` so the same
 * component is both the resting card and its enlarged twin. Every metric is a
 * measured stage px at sc=1 multiplied through — which is what keeps the type
 * proportional to the box as it grows toward camera.
 */
function CommentCard({ cfg, id, sc }) {
  const w = (cfg.w ?? 356) * sc;
  const padL = (cfg.padL ?? 20) * sc, padT = (cfg.padT ?? 20) * sc;
  const padB = (cfg.padB ?? 15) * sc, padR = (cfg.padR ?? 18) * sc;
  const av = (cfg.avatarSize ?? 30) * sc, gap = (cfg.avatarGap ?? 13) * sc;
  const hSize = (cfg.handleSize ?? 13.5) * sc, hLh = cfg.handleLineH ?? 1.3;
  const tSize = (cfg.textSize ?? 13.8) * sc, tLh = cfg.textLineH ?? 1.42;
  const rowGap = (cfg.rowGap ?? 4) * sc;
  const lines = cfg.lines ?? [];
  return (
    <div style={{
      width: w, background: CARD, borderRadius: (cfg.radius ?? 16) * sc,
      fontFamily: FONT, position: "relative", boxSizing: "border-box",
      padding: `${padT}px ${padR}px ${padB}px ${padL}px`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap }}>
        <div style={{ flex: "0 0 auto", marginTop: hSize * 0.06 }}>
          <Disc d={av} id={`${id}-maya`} c1={cfg.avatarC1 ?? "#d79a72"} c2={cfg.avatarC2 ?? "#a25f45"} />
        </div>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <div style={{
            fontSize: hSize, lineHeight: hLh, fontWeight: 700, color: rgb(INK),
            letterSpacing: "-0.004em", whiteSpace: "pre",
          }}>{cfg.handle ?? "@maya.runs"}</div>
          <div style={{ marginTop: rowGap }}>
            {lines.map((text, i) => (
              <div key={i} style={{
                fontSize: tSize, lineHeight: tLh, color: rgb(cfg.textColour ?? INK), whiteSpace: "pre",
              }}>{text}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SaruPostCard({ t, from, to, cfg }) {
  if (t < from || t > to) return null;
  const id = cfg.id ?? "saru-post";
  const post = cfg.post ?? {};
  const cmt = cfg.comment ?? {};

  // ---- the post: at rest from frame 0 unless it is given an entry ----
  const pe = post.enter;
  let postO = 1, postSc = 1, postDy = 0;
  if (pe) {
    const p = easeByName(pe.ease ?? "out", pe.pow)(clamp01((t - (from + s(pe.atMs ?? 0))) / s(pe.durMs ?? 420)));
    postO = clamp01((t - (from + s(pe.atMs ?? 0))) / s(pe.fadeMs ?? 240));
    postSc = lerp(pe.fromScale ?? 0.96, 1, p);
    postDy = (pe.fromDy ?? 0) * (1 - p);
  }
  // The recede that supports the emphasis move: while the comment comes toward
  // camera the post drops back a hair and dims toward the ground, so the
  // overlap reads as depth rather than as two cards fighting for the frame.
  const rec = kv(absKeys(cfg.startMs, post.recedeKeys ?? []), t, { scale: 1, dim: 1 });
  const postW = post.w ?? 356;
  const postH = (post.headerH ?? 50) + postW + (post.captionH ?? 70);

  // ---- the comment: slide up into place, then grow toward camera ----
  const ce = cmt.enter ?? { atMs: 0, durMs: 1 };
  const ceAt = from + s(ce.atMs ?? 0);
  const ep = easeByName(ce.ease ?? "out", ce.pow)(clamp01((t - ceAt) / s(ce.durMs ?? 520)));
  const cO = clamp01((t - ceAt) / s(ce.fadeMs ?? 220));
  const cDy = (ce.fromDy ?? 44) * (1 - ep);
  const cSc = lerp(ce.fromScale ?? 0.97, 1, ep);

  const popKeys = absKeys(cfg.startMs, cmt.popKeys ?? []);
  const p = popKeys.length ? clamp01(kv(popKeys, t, { p: 0 }).p) : 0;
  const srcW = cmt.w ?? 356;
  const [dx, dy, dw] = cmt.popRect ?? [srcW, cmt.y ?? 0, srcW];
  const cx = lerp(cmt.x ?? 0, dx, p);
  const cy = lerp((cmt.y ?? 0) + cDy, dy, p);
  const cw = lerp(srcW, dw, p);
  const sc = cw / srcW;
  const sh = cmt.shadow ?? { dy: 8, blur: 26, alpha: 0.18 };
  const shBoost = 1 + p * (cmt.shadowGrow ?? 1.6);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {postO > 0.004 && (
        <div style={{
          position: "absolute", left: post.x ?? 462, top: (post.y ?? 24) + postDy,
          opacity: postO * rec.dim,
          transform: `scale(${(postSc * rec.scale).toFixed(4)})`,
          transformOrigin: `${postW / 2}px ${postH / 2}px`,
          filter: `drop-shadow(0 ${post.shadowDy ?? 12}px ${post.shadowBlur ?? 34}px rgba(18,16,54,${post.shadowAlpha ?? 0.26}))`,
        }}>
          <PostCard cfg={post} id={id} />
        </div>
      )}
      {cO > 0.004 && (
        <div style={{
          position: "absolute", left: cx, top: cy, opacity: cO,
          transform: p > 0.0005 ? "none" : `scale(${cSc.toFixed(4)})`,
          transformOrigin: "50% 0%",
          filter: `drop-shadow(0 ${(sh.dy * shBoost).toFixed(1)}px ${(sh.blur * shBoost).toFixed(1)}px rgba(18,16,54,${(sh.alpha).toFixed(3)}))`,
        }}>
          <CommentCard cfg={cmt} id={id} sc={sc} />
        </div>
      )}
    </div>
  );
}
