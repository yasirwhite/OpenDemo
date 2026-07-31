#!/usr/bin/env node
/**
 * transcribe-a.mjs — VARIANT A (word-level) kinetic-typography transcript labeler.
 *
 * Produces a time-aligned transcript of hero text animation at WORD granularity
 * from a product-demo video, using only ffmpeg/ffprobe/tesseract subprocesses.
 *
 * Pipeline:
 *   1. coarse : 15fps 160x90 pass -> hard cuts + active motion windows
 *   2. ocr    : settled/mid-window frames -> tesseract word boxes (2.5x upscale),
 *               HERO vs EMBEDDED gating (size + local bg uniformity + sibling stats)
 *   3. track  : per-word native-fps template tracking (NCC, +/-30px search) backwards
 *               (births: from/to, direction, mode, easing, revealStyle) and forwards
 *               (exits: fade-out / slide-out)
 *   4. emit   : transcript.json + captions.srt + cues.json
 *   5. render : annotated.mp4 (ffmpeg drawtext burn-in, filter script file)
 *
 * Stages are resumable (cache in $OUT/cache). `node transcribe-a.mjs all` runs everything.
 * Env: VIDEO (input path), OUT (output dir, default /tmp/variantA)
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const VIDEO = process.env.VIDEO || "/sessions/nifty-vigilant-heisenberg/mnt/OpenDemo/reference/mem-reference.mp4";
const OUT = process.env.OUT || "/tmp/variantA";
const CACHE = join(OUT, "cache");
mkdirSync(CACHE, { recursive: true });

const FW = 640, FH = 360;          // native analysis resolution
const OCR_UP = 2.5;                // upscale factor for tesseract
const HERO_MIN_H = 0.035 * FH;     // ~12.6 px minimum hero word height (spec)
const BUDGET_MS = 28000;           // per-invocation work budget (stages resume)
const WALL0 = Date.now();
const budgetLeft = () => Date.now() - WALL0 < BUDGET_MS;

// ───────────────────────── subprocess helpers ─────────────────────────
function run(cmd, args) {
  const r = spawnSync(cmd, args, { maxBuffer: 1 << 29 });
  if (r.status !== 0) {
    throw new Error(`${cmd} failed (${args.slice(0, 8).join(" ")}): ${r.stderr ? r.stderr.toString().slice(-400) : r.error}`);
  }
  return r;
}

function getMeta() {
  const r = run("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", VIDEO]);
  const info = JSON.parse(r.stdout.toString());
  const vs = info.streams.find((s) => s.codec_type === "video");
  const [n, d] = String(vs.avg_frame_rate || "30/1").split("/").map(Number);
  return {
    width: vs.width, height: vs.height, fps: n / d,
    durationMs: Math.round(parseFloat(vs.duration || info.format.duration) * 1000),
  };
}

function decodeRaw(ssMs, durMs, fps, w, h, pix = "gray") {
  const args = ["-v", "error"];
  if (ssMs > 0) args.push("-ss", (ssMs / 1000).toFixed(3));
  args.push("-t", (durMs / 1000).toFixed(3), "-i", VIDEO,
    "-vf", `fps=${fps},scale=${w}:${h}:flags=area`,
    "-pix_fmt", pix, "-f", "rawvideo", "-");
  const r = run("ffmpeg", args);
  const buf = r.stdout;
  const fb = w * h * (pix === "rgb24" ? 3 : 1);
  const n = Math.floor(buf.length / fb);
  const frames = [];
  for (let i = 0; i < n; i++) frames.push(new Uint8Array(buf.buffer, buf.byteOffset + i * fb, fb));
  return frames;
}

function grabRGB(tMs) {
  return decodeRaw(Math.max(0, tMs), 120, 30, FW, FH, "rgb24")[0];
}

function grayFromRGB(rgb) {
  const g = new Uint8Array(FW * FH);
  for (let i = 0, p = 0; i < g.length; i++, p += 3) g[i] = (rgb[p] * 77 + rgb[p + 1] * 151 + rgb[p + 2] * 28) >> 8;
  return g;
}

// ───────────────────────── small utils ─────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const median = (arr) => { const a = [...arr].sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; };
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

// ═════════════════════════ STAGE: coarse ═════════════════════════
function rgbHist(rgb, w, h) {
  const hist = new Float32Array(64); const n = w * h;
  for (let i = 0, p = 0; i < n; i++, p += 3) hist[((rgb[p] >> 6) << 4) | ((rgb[p + 1] >> 6) << 2) | (rgb[p + 2] >> 6)]++;
  for (let i = 0; i < 64; i++) hist[i] /= n;
  return hist;
}
function histChiSq(a, b) {
  let d = 0;
  for (let i = 0; i < 64; i++) { const s = a[i] + b[i]; if (s > 0) d += ((a[i] - b[i]) ** 2) / s; }
  return d / 2;
}
function graySmall(rgb, w, h) {
  const g = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < g.length; i++, p += 3) g[i] = (rgb[p] * 77 + rgb[p + 1] * 151 + rgb[p + 2] * 28) >> 8;
  return g;
}
function analyzePair(a, b, w, h) {
  let sum = 0, changed = 0;
  for (let i = 0; i < w * h; i++) {
    const d = Math.abs(a[i] - b[i]); sum += d;
    if (d > 15) changed++;
  }
  return { energy: sum / (w * h * 255), coverage: changed / (w * h) };
}

function stageCoarse() {
  const meta = getMeta();
  const sfps = 15, cw = 160, ch = 90;
  const rgbFrames = decodeRaw(0, meta.durationMs + 500, sfps, cw, ch, "rgb24");
  const grays = rgbFrames.map((f) => graySmall(f, cw, ch));
  const hists = rgbFrames.map((f) => rgbHist(f, cw, ch));
  const step = 1000 / sfps;
  const diffs = [];
  for (let i = 0; i + 1 < grays.length; i++) {
    const d = analyzePair(grays[i], grays[i + 1], cw, ch);
    diffs.push({ tMs: Math.round((i + 1) * step), ...d, histD: histChiSq(hists[i], hists[i + 1]) });
  }
  const medE = median(diffs.map((d) => d.energy));
  const cuts = [];
  for (let i = 0; i < diffs.length; i++) {
    const d = diffs[i];
    const lo = Math.max(0, i - 4), hi = Math.min(diffs.length, i + 5);
    const win = diffs.slice(lo, hi).filter((_, k) => lo + k !== i).map((x) => x.energy).sort((a, b) => a - b);
    const locMed = win[win.length >> 1] || 0;
    if (d.energy > Math.max(0.10, locMed * 5) && d.histD > 0.18 && d.coverage > 0.45) {
      if (!cuts.length || d.tMs - cuts[cuts.length - 1] > 400) cuts.push(d.tMs);
    }
  }
  const thr = Math.max(0.0015, medE * 4);
  const act = diffs.map((d) => d.coverage > 0.004 || d.energy > thr);
  const windows = [];
  let cur = null;
  for (let i = 0; i < diffs.length; i++) {
    if (act[i]) {
      const t = diffs[i].tMs;
      if (cur && t - cur.endMs <= 260) cur.endMs = t;
      else { if (cur) windows.push(cur); cur = { startMs: Math.max(0, t - step), endMs: t }; }
    }
  }
  if (cur) windows.push(cur);
  const wins = windows
    .filter((w) => w.endMs - w.startMs >= 50 || cuts.some((c) => Math.abs(c - w.endMs) < 150))
    .map((w, i) => ({ id: i, ...w }));
  const statics = [];
  let prevEnd = 0;
  for (const w of wins) {
    if (w.startMs - prevEnd >= 1500) statics.push({ startMs: prevEnd, endMs: w.startMs });
    prevEnd = Math.max(prevEnd, w.endMs);
  }
  if (meta.durationMs - prevEnd >= 1500) statics.push({ startMs: prevEnd, endMs: meta.durationMs });
  const coarse = {
    meta, cuts, windows: wins, statics, medianEnergy: medE,
    diffs: diffs.map((d) => ({ t: d.tMs, e: +d.energy.toFixed(5) })),
  };
  writeFileSync(join(CACHE, "coarse.json"), JSON.stringify(coarse));
  console.log(`coarse: ${wins.length} windows, ${cuts.length} cuts (${cuts.map((c) => (c / 1000).toFixed(2)).join(", ")}), ${statics.length} statics`);
  console.log("DONE coarse");
}

// ═════════════════════════ STAGE: ocr ═════════════════════════
/** Snapshot times: after each window (settled) + inside long windows at low-energy lulls. */
function snapshotTimes(coarse) {
  const { meta, windows, diffs } = coarse;
  const times = [];
  const first = windows.length ? windows[0].startMs : meta.durationMs;
  times.push({ tMs: Math.max(30, Math.min(200, first - 40)), windowId: -1, kind: "init" });
  const lowestNear = (t) => {
    let best = t, bestE = Infinity;
    for (const d of diffs) if (Math.abs(d.t - t) <= 350 && d.e < bestE) { bestE = d.e; best = d.t; }
    return best;
  };
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    if (w.endMs - w.startMs > 1500) {
      for (let t = w.startMs + 500; t < w.endMs - 400; t += 700) {
        times.push({ tMs: lowestNear(t), windowId: w.id, kind: "mid" });
      }
    }
    let settle = w.endMs + 150;
    if (i + 1 < windows.length) settle = Math.min(settle, windows[i + 1].startMs - 40);
    settle = Math.min(settle, meta.durationMs - 80);
    times.push({ tMs: Math.round(settle), windowId: w.id, kind: "settle" });
  }
  times.sort((a, b) => a.tMs - b.tMs);
  const out = [];
  for (const s of times) {
    if (out.length && s.tMs - out[out.length - 1].tMs < 250) {
      if (s.kind === "settle") out[out.length - 1] = s; // prefer settle snapshots
      continue;
    }
    out.push(s);
  }
  return out;
}

function ringStats(gray, box, m0 = 3, m1 = 9) {
  const x0 = clamp(Math.round(box.x) - m1, 0, FW - 1), x1 = clamp(Math.round(box.x + box.w) + m1, 0, FW - 1);
  const y0 = clamp(Math.round(box.y) - m1, 0, FH - 1), y1 = clamp(Math.round(box.y + box.h) + m1, 0, FH - 1);
  const ix0 = Math.round(box.x) - m0, ix1 = Math.round(box.x + box.w) + m0;
  const iy0 = Math.round(box.y) - m0, iy1 = Math.round(box.y + box.h) + m0;
  const px = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x >= ix0 && x <= ix1 && y >= iy0 && y <= iy1) continue;
    px.push(gray[y * FW + x]);
  }
  if (!px.length) return { med: 255, uniformFrac: 0 };
  const med = median(px);
  let n = 0;
  for (const v of px) if (Math.abs(v - med) <= 25) n++;
  return { med, uniformFrac: n / px.length };
}

function inkStats(gray, box, bg, thr = 45) {
  const x0 = clamp(Math.round(box.x), 0, FW - 1), y0 = clamp(Math.round(box.y), 0, FH - 1);
  const x1 = clamp(Math.round(box.x + box.w), 0, FW), y1 = clamp(Math.round(box.y + box.h), 0, FH);
  let count = 0, minX = 1e9, maxX = -1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (Math.abs(gray[y * FW + x] - bg) > thr) { count++; if (x < minX) minX = x; if (x > maxX) maxX = x; }
  }
  return { count, extent: maxX >= minX ? maxX - minX + 1 : 0 };
}

function ocrFrame(tMs, tag) {
  const png = join(CACHE, `snap_${tag}.png`);
  run("ffmpeg", ["-v", "error", "-ss", (tMs / 1000).toFixed(3), "-i", VIDEO, "-frames:v", "1",
    "-vf", `scale=${FW * OCR_UP}:${FH * OCR_UP}:flags=lanczos,unsharp=5:5:0.8`, "-y", png]);
  const base = join(CACHE, `snap_${tag}`);
  run("tesseract", [png, base, "tsv"]);
  const tsv = readFileSync(base + ".tsv", "utf8").split("\n");
  const words = [];
  for (const line of tsv.slice(1)) {
    const c = line.split("\t");
    if (c.length < 12 || c[0] !== "5") continue;
    const text = c[11].trim();
    const conf = parseFloat(c[10]);
    if (!text || conf < 0) continue;
    words.push({
      text, conf,
      x: r1(+c[6] / OCR_UP), y: r1(+c[7] / OCR_UP), w: r1(+c[8] / OCR_UP), h: r1(+c[9] / OCR_UP),
      line: `${c[2]}-${c[3]}-${c[4]}`,
    });
  }
  return words;
}

/**
 * HERO vs EMBEDDED gate.
 *  - candidate: confident word, height >= 3.5% of frame height, locally uniform bg ring
 *  - frame is "embedded-UI-like" when it has many text words (>=12) or the median
 *    candidate height is small (<24px) -> only giant words (>=40px) pass.
 */
function gateAndStyle(words, rgb) {
  const gray = grayFromRGB(rgb);
  const textWords = words.filter((w) => w.conf > 55 && /[A-Za-z0-9]/.test(w.text) && w.h >= 6);
  const candidates = [];
  for (const w of words) {
    w.hero = false;
    if (w.conf < 55 || !/[A-Za-z0-9]/.test(w.text)) continue;
    if (/[\[\]{}|\\_=<>#@~^]/.test(w.text)) continue;
    if (w.h < HERO_MIN_H || w.w < 4 || w.h > 120) continue;
    const ring = ringStats(gray, w);
    if (ring.uniformFrac < 0.72) continue;
    w._ring = ring;
    candidates.push(w);
  }
  const medH = median(candidates.map((w) => w.h));
  const demoLike = textWords.length >= 12 || (candidates.length > 0 && medH < 24);
  for (const w of candidates) {
    if (demoLike && w.h < 40) continue;
    w.hero = true;
    const bg = w._ring.med;
    const x0 = clamp(Math.round(w.x), 0, FW - 1), y0 = clamp(Math.round(w.y), 0, FH - 1);
    const x1 = clamp(Math.round(w.x + w.w), 0, FW), y1 = clamp(Math.round(w.y + w.h), 0, FH);
    let rs = 0, gs = 0, bs = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (Math.abs(gray[y * FW + x] - bg) > 45) { const p = (y * FW + x) * 3; rs += rgb[p]; gs += rgb[p + 1]; bs += rgb[p + 2]; n++; }
    }
    const density = n / Math.max(1, (x1 - x0) * (y1 - y0));
    w.style = {
      colorRGB: n ? [Math.round(rs / n), Math.round(gs / n), Math.round(bs / n)] : [0, 0, 0],
      glyphHeightPx: w.h,
      weightEstimate: density < 0.16 ? "light" : density < 0.30 ? "regular" : "bold",
      anchor: { x: Math.round(w.x), y: Math.round(w.y + w.h) },
      align: "left",
    };
  }
  const lines = {};
  for (const w of words) { if (w.hero) (lines[w.line] ||= []).push(w); delete w._ring; }
  for (const key of Object.keys(lines)) {
    const ws = lines[key];
    const lx0 = Math.min(...ws.map((w) => w.x)), lx1 = Math.max(...ws.map((w) => w.x + w.w));
    const cx = (lx0 + lx1) / 2;
    const align = Math.abs(cx - FW / 2) < 35 ? "center" : lx0 < FW * 0.22 ? "left" : "right";
    for (const w of ws) w.style.align = align;
  }
  return { demoLike, textWordCount: textWords.length, medCandH: medH };
}

function stageOcr() {
  const coarse = JSON.parse(readFileSync(join(CACHE, "coarse.json"), "utf8"));
  const snaps = snapshotTimes(coarse);
  writeFileSync(join(CACHE, "snaptimes.json"), JSON.stringify(snaps, null, 1));
  let done = 0;
  for (let i = 0; i < snaps.length; i++) {
    const f = join(CACHE, `snapdata_${i}.json`);
    if (existsSync(f)) { done++; continue; }
    if (!budgetLeft()) { console.log(`CONTINUE ocr (${done}/${snaps.length})`); return; }
    const s = snaps[i];
    const words = ocrFrame(s.tMs, String(i).padStart(3, "0"));
    const rgb = grabRGB(s.tMs);
    const gate = gateAndStyle(words, rgb);
    writeFileSync(f, JSON.stringify({ ...s, idx: i, ...gate, words }, null, 1));
    done++;
  }
  console.log(`ocr: ${done}/${snaps.length} snapshots`);
  console.log("DONE ocr");
}

// ═════════════════════════ STAGE: track ═════════════════════════
const normText = (t) => t.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");

function editDist(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => { const r = new Array(n + 1).fill(0); r[0] = i; return r; });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}
/** Same word identity, tolerant to OCR noise and progressive typing (prefix growth). */
function sameWord(a, b) {
  if (a === b) return true;
  if (a.startsWith(b) || b.startsWith(a)) return true;
  return editDist(a, b) <= (Math.min(a.length, b.length) >= 5 ? 2 : 1);
}

/** Cluster hero-word sightings across snapshots into word lifetimes (1-snapshot OCR-gap tolerance). */
function buildClusters(snaps) {
  const clusters = [];
  const active = [];
  for (let i = 0; i < snaps.length; i++) {
    for (const w of snaps[i].words) {
      if (!w.hero) continue;
      const key = normText(w.text);
      if (!key) continue;
      let best = null;
      for (const c of active) {
        if (i - c.lastSeen > 2 || !sameWord(c.key, key)) continue;
        const lw = c.sightings[c.sightings.length - 1].w;
        if (Math.abs(lw.x - w.x) < 35 && Math.abs(lw.y - w.y) < 25) { best = c; break; }
      }
      if (best) {
        best.lastSeen = i;
        best.sightings.push({ i, w });
        if (key.length > best.key.length) best.key = key;
      } else {
        const c = { key, firstSeen: i, lastSeen: i, sightings: [{ i, w }] };
        clusters.push(c); active.push(c);
      }
    }
    for (let k = active.length - 1; k >= 0; k--) if (i - active[k].lastSeen > 2) active.splice(k, 1);
  }
  // absorption pass: short-lived prefix clusters (typed text growing around a center)
  for (let a = clusters.length - 1; a >= 0; a--) {
    const A = clusters[a];
    if (A.sightings.length > 2) continue;
    for (const B of clusters) {
      if (B === A || B.key.length <= A.key.length) continue;
      if (!(B.key.startsWith(A.key) || editDist(A.key, B.key.slice(0, A.key.length)) <= 1)) continue;
      if (B.firstSeen - A.lastSeen > 2 || B.firstSeen <= A.firstSeen) continue;
      const aw = A.sightings[A.sightings.length - 1].w, bw = B.sightings[0].w;
      if (Math.abs(aw.x - bw.x) > 100 || Math.abs(aw.y - bw.y) > 30) continue;
      B.sightings = [...A.sightings, ...B.sightings];
      B.firstSeen = Math.min(A.firstSeen, B.firstSeen);
      clusters.splice(a, 1);
      break;
    }
  }
  for (const c of clusters) {
    let bestW = c.sightings[0].w, growthSnap = c.sightings[0].i;
    for (const s of c.sightings) if (normText(s.w.text).length > normText(bestW.text).length) { bestW = s.w; growthSnap = s.i; }
    c.bestW = bestW;
    c.growthSnap = growthSnap;
    c.grew = normText(bestW.text).length >= normText(c.sightings[0].w.text).length + 2;
  }
  return clusters;
}

function makeTemplate(frame, box) {
  const x0 = clamp(Math.round(box.x) - 2, 0, FW - 5), y0 = clamp(Math.round(box.y) - 2, 0, FH - 5);
  const tw = clamp(Math.round(box.w) + 4, 4, FW - x0), th = clamp(Math.round(box.h) + 4, 4, FH - y0);
  const offs = [], vals = [];
  for (let yy = 0; yy < th; yy += 2) for (let xx = 0; xx < tw; xx += 2) {
    offs.push(yy * FW + xx); vals.push(frame[(y0 + yy) * FW + x0 + xx]);
  }
  const n = vals.length;
  let s = 0, s2 = 0;
  for (const v of vals) { s += v; s2 += v * v; }
  const mean = s / n, std = Math.sqrt(Math.max(0, s2 / n - mean * mean));
  return { x0, y0, tw, th, offs, vals, n, mean, std };
}

function evalAt(frame, tpl, px, py) {
  let sw = 0, sw2 = 0, dot = 0;
  const base = py * FW + px;
  for (let i = 0; i < tpl.n; i++) {
    const v = frame[base + tpl.offs[i]];
    sw += v; sw2 += v * v; dot += v * tpl.vals[i];
  }
  const mw = sw / tpl.n;
  const stdw = Math.sqrt(Math.max(0, sw2 / tpl.n - mw * mw));
  const ncc = stdw > 0.5 && tpl.std > 0.5 ? (dot / tpl.n - mw * tpl.mean) / (stdw * tpl.std) : 0;
  return { ncc, stdRatio: tpl.std > 0.5 ? stdw / tpl.std : 0 };
}

function searchNCC(frame, tpl, cx, cy, range = 30) {
  let best = null;
  const tryPos = (px, py) => {
    px = clamp(px, 0, FW - tpl.tw); py = clamp(py, 0, FH - tpl.th);
    const r = evalAt(frame, tpl, px, py);
    if (!best || r.ncc > best.ncc) best = { x: px, y: py, ...r };
  };
  for (let dy = -range; dy <= range; dy += 3) for (let dx = -range; dx <= range; dx += 3) tryPos(cx + dx, cy + dy);
  const bx = best.x, by = best.y;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) tryPos(bx + dx, by + dy);
  return best;
}

function trackTemplate(frames, tpl, startIdx, dir, t0Ms, stepMs, settleBg) {
  const recs = [];
  let cx = tpl.x0, cy = tpl.y0, misses = 0;
  for (let i = startIdx; i >= 0 && i < frames.length; i += dir) {
    const b = searchNCC(frames[i], tpl, cx, cy, 30);
    const valid = b.ncc >= 0.45 && b.stdRatio >= 0.12;
    if (valid) {
      misses = 0; cx = b.x; cy = b.y;
      const ink = inkStats(frames[i], { x: b.x, y: b.y, w: tpl.tw, h: tpl.th }, settleBg);
      recs.push({ i, t: Math.round(t0Ms + i * stepMs), x: b.x, y: b.y, ncc: r2(b.ncc), alpha: r2(clamp(b.stdRatio, 0, 1)), ink: ink.count, ext: ink.extent });
    } else if (++misses >= 3) break;
  }
  recs.sort((a, b) => a.t - b.t);
  return recs;
}

function dirName(dx, dy) {
  if (Math.hypot(dx, dy) < 6) return "none";
  if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? "up" : "down";
  return dx < 0 ? "left" : "right";
}

function curveFrom(recs, tStart, tEnd, getP) {
  if (tEnd - tStart < 80 || recs.length < 4) return "linear";
  const tMid = (tStart + tEnd) / 2;
  let bestR = recs[0];
  for (const r of recs) if (Math.abs(r.t - tMid) < Math.abs(bestR.t - tMid)) bestR = r;
  const p = getP(bestR);
  return p > 0.62 ? "ease-out" : p < 0.38 ? "ease-in" : "linear";
}

function analyzeEnter(recs, stepMs) {
  const last = recs[recs.length - 1];
  const settleX = last.x, settleY = last.y;
  const birth = recs[0];
  const distTotal = Math.hypot(settleX - birth.x, settleY - birth.y);
  let endIdx = recs.length - 1;
  for (let k = 0; k < recs.length; k++) {
    let ok = true;
    for (let j = k; j < recs.length; j++) {
      if (Math.hypot(recs[j].x - settleX, recs[j].y - settleY) > 2 || recs[j].alpha < 0.78) { ok = false; break; }
    }
    if (ok) { endIdx = k; break; }
  }
  const tEnd = recs[endIdx].t;
  const revealMs = Math.max(stepMs, tEnd - birth.t);
  const nHead = Math.max(1, Math.ceil(recs.length * 0.2));
  const alphaStart = recs.slice(0, nHead).reduce((s, r) => s + r.alpha, 0) / nHead;
  const slide = distTotal >= 6;
  const fade = alphaStart < 0.55;
  const mode = slide && fade ? "slide+fade" : slide ? "slide" : fade ? "fade" : revealMs <= 110 ? "pop" : "fade";
  const direction = dirName(settleX - birth.x, settleY - birth.y);
  const curve = curveFrom(recs, birth.t, tEnd, (r) =>
    slide ? 1 - Math.hypot(r.x - settleX, r.y - settleY) / Math.max(1, distTotal)
          : (r.alpha - alphaStart) / Math.max(0.05, 1 - alphaStart));
  let revealStyle = "instant";
  const finalExt = Math.max(1, last.ext), finalInk = Math.max(1, last.ink);
  if (revealMs >= 250) {
    const tProbe = birth.t + revealMs * 0.35;
    let pr = recs[0];
    for (const r of recs) if (Math.abs(r.t - tProbe) < Math.abs(pr.t - tProbe)) pr = r;
    const extRatio = pr.ext / finalExt, inkRatio = pr.ink / finalInk;
    if ((extRatio < 0.65 && pr.alpha > 0.45) || (inkRatio < 0.5 && pr.alpha > 0.6)) revealStyle = "progressive";
  }
  return {
    t0: birth.t, t1: tEnd,
    from: { x: birth.x, y: birth.y, alpha: r2(alphaStart) },
    to: { x: settleX, y: settleY, alpha: 1 },
    motion: { mode, direction, distancePx: Math.round(distTotal), curve, revealStyle },
    trackQ: r2(recs.reduce((s, r) => s + r.ncc, 0) / recs.length),
    reachedStart: recs[0].i <= 1 && recs[0].ncc > 0.65 && recs[0].alpha > 0.85,
  };
}

function analyzeExit(recs, stepMs) {
  const start = recs[0], last = recs[recs.length - 1];
  const distTotal = Math.hypot(last.x - start.x, last.y - start.y);
  let mi = 0;
  for (let k = 0; k < recs.length; k++) {
    if (Math.hypot(recs[k].x - start.x, recs[k].y - start.y) > 3 || recs[k].alpha < 0.8) { mi = k; break; }
    mi = k;
  }
  const nTail = Math.max(1, Math.ceil(recs.length * 0.2));
  const alphaEnd = recs.slice(-nTail).reduce((s, r) => s + r.alpha, 0) / nTail;
  const death = last.t + stepMs;
  const slide = distTotal >= 6;
  const fade = alphaEnd < 0.6;
  const durMs = death - recs[mi].t;
  const mode = slide && fade ? "slide+fade" : slide ? "slide" : fade ? "fade" : durMs <= 110 ? "pop" : "fade";
  const curve = curveFrom(recs.slice(mi), recs[mi].t, death, (r) =>
    slide ? Math.hypot(r.x - start.x, r.y - start.y) / Math.max(1, distTotal) : (1 - r.alpha) / Math.max(0.05, 1 - alphaEnd));
  return {
    t0: recs[mi].t, t1: Math.round(death),
    from: { x: start.x, y: start.y, alpha: 1 },
    to: { x: last.x, y: last.y, alpha: r2(clamp(alphaEnd, 0, 1)) },
    motion: { mode, direction: dirName(last.x - start.x, last.y - start.y), distancePx: Math.round(distTotal), curve, revealStyle: "instant" },
    trackQ: r2(recs.reduce((s, r) => s + r.ncc, 0) / recs.length),
  };
}

function stageTrack() {
  const coarse = JSON.parse(readFileSync(join(CACHE, "coarse.json"), "utf8"));
  const snaps = JSON.parse(readFileSync(join(CACHE, "snaptimes.json"), "utf8"))
    .map((s, i) => JSON.parse(readFileSync(join(CACHE, `snapdata_${i}.json`), "utf8")));
  const fps = coarse.meta.fps;
  const stepMs = 1000 / fps;
  const cuts = coarse.cuts;
  const clusters = buildClusters(snaps);
  writeFileSync(join(CACHE, "clusters.json"), JSON.stringify(clusters.map((c) => ({
    key: c.key, text: c.bestW.text, grew: c.grew, firstSeen: c.firstSeen, lastSeen: c.lastSeen,
    t0: snaps[c.firstSeen].tMs, t1: snaps[c.lastSeen].tMs,
  })), null, 1));

  // group work per interval
  const nIter = snaps.length;
  for (let i = 0; i < nIter; i++) {
    const outF = join(CACHE, `track_${i}.json`);
    if (existsSync(outF)) continue;
    if (!budgetLeft()) { console.log(`CONTINUE track (${i}/${nIter})`); return; }
    const enters = clusters.filter((c) => c.firstSeen === i);
    const exits = clusters.filter((c) => c.lastSeen === i - 1 && i - 1 < snaps.length - 1);
    const res = { interval: i, windowId: snaps[i].windowId, enters: [], exits: [] };

    if (enters.length) {
      const curT = snaps[i].tMs;
      const prevT = i > 0 ? snaps[i - 1].tMs : 0;
      let dStart = Math.max(0, prevT - 60);
      let extend = 0;
      let frames, settleIdx;
      let pend = enters.map((c) => ({ c, done: false }));
      while (true) {
        frames = decodeRaw(dStart, curT - dStart + 150, fps, FW, FH, "gray");
        settleIdx = clamp(Math.round((curT - dStart) / stepMs), 0, frames.length - 1);
        let needExtend = false;
        for (const p of pend) {
          if (p.done) continue;
          const w = p.c.sightings[0].w;
          const tpl = makeTemplate(frames[settleIdx], w);
          if (tpl.std < 8) { p.done = true; continue; }
          const bg = ringStats(frames[settleIdx], w).med;
          const recs = trackTemplate(frames, tpl, settleIdx, -1, dStart, stepMs, bg);
          if (!recs.length) { p.done = true; continue; }
          const a = analyzeEnter(recs, stepMs);
          if (a.reachedStart && dStart > 0 && extend < 3) { needExtend = true; continue; }
          if (cuts.some((cc) => Math.abs(cc - a.t0) < 130) && a.motion.distancePx < 6) {
            a.motion.mode = "pop"; a.motion.curve = "linear"; a.motion.revealStyle = "instant";
          }
          const bw = p.c.bestW || w;
          if (p.c.grew) {
            a.motion.revealStyle = "progressive";
            a.t1 = Math.max(a.t1, snaps[p.c.growthSnap].tMs);
          }
          const conf = a.reachedStart ? bw.conf * 0.6 : bw.conf;
          res.enters.push({ text: bw.text, conf, box: { x: bw.x, y: bw.y, w: bw.w, h: bw.h }, style: bw.style || w.style, ...a });
          p.done = true;
        }
        if (!needExtend || extend >= 3) break;
        extend++;
        dStart = Math.max(0, dStart - 2000);
      }
    }
    if (exits.length) {
      const prevT = snaps[i - 1].tMs;
      let dEnd = snaps[i].tMs + 150;
      let extend = 0;
      let pend = exits.map((c) => ({ c, done: false }));
      while (true) {
        const dStart = Math.max(0, prevT - 40);
        const frames = decodeRaw(dStart, Math.min(dEnd - dStart, 12000), fps, FW, FH, "gray");
        let needExtend = false;
        for (const p of pend) {
          if (p.done) continue;
          const w = p.c.sightings[p.c.sightings.length - 1].w;
          const tpl = makeTemplate(frames[0], w);
          if (tpl.std < 8) { p.done = true; continue; }
          const bg = ringStats(frames[0], w).med;
          const recs = trackTemplate(frames, tpl, 0, 1, dStart, stepMs, bg);
          if (!recs.length) { p.done = true; continue; }
          const lastR = recs[recs.length - 1];
          const survives = lastR.i >= frames.length - 2 && lastR.ncc > 0.6 && lastR.alpha > 0.7;
          if (survives) {
            if (extend < 2 && dEnd - dStart < 11000) { needExtend = true; continue; }
            p.done = true; continue; // still visible; OCR lost it — drop exit (limitation)
          }
          const a = analyzeExit(recs, stepMs);
          p.done = true;
          if (cuts.some((cc) => Math.abs(cc - a.t1) < 150)) continue; // explained by hard cut
          const bw = p.c.bestW || w;
          res.exits.push({ text: bw.text, conf: w.conf, box: { x: w.x, y: w.y, w: w.w, h: w.h }, style: bw.style || w.style, ...a });
        }
        if (!needExtend || extend >= 2) break;
        extend++;
        dEnd += 2500;
      }
    }
    writeFileSync(outF, JSON.stringify(res, null, 1));
  }
  console.log(`track: ${clusters.length} word clusters across ${snaps.length} snapshots`);
  console.log("DONE track");
}

// ═════════════════════════ STAGE: emit ═════════════════════════
function msToSrt(ms) {
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, x = Math.round(ms % 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(x).padStart(3, "0")}`;
}

function stageEmit() {
  const coarse = JSON.parse(readFileSync(join(CACHE, "coarse.json"), "utf8"));
  const snaps = JSON.parse(readFileSync(join(CACHE, "snaptimes.json"), "utf8"))
    .map((s, i) => JSON.parse(readFileSync(join(CACHE, `snapdata_${i}.json`), "utf8")));
  const events = [];
  const intervalHasEvents = new Array(snaps.length).fill(false);
  for (let i = 0; i < snaps.length; i++) {
    const f = join(CACHE, `track_${i}.json`);
    if (!existsSync(f)) continue;
    const tr = JSON.parse(readFileSync(f, "utf8"));
    if (tr.enters.length || tr.exits.length) intervalHasEvents[i] = true;
    for (const e of tr.enters) {
      if (e.text.replace(/[^A-Za-z0-9]/g, "").length <= 1 && e.conf < 85) continue; // single-glyph OCR noise (logo marks etc.)
      events.push({
      type: "text-enter", text: e.text, t0: e.t0, t1: e.t1, from: e.from, to: e.to,
      motion: e.motion, style: e.style, confidence: r2(Math.min(0.99, 0.4 * e.conf / 100 + 0.6 * e.trackQ)),
    }); }
    for (const e of tr.exits) {
      if (e.text.replace(/[^A-Za-z0-9]/g, "").length <= 1 && e.conf < 85) continue;
      events.push({
      type: "text-exit", text: e.text, t0: e.t0, t1: e.t1, from: e.from, to: e.to,
      motion: e.motion, style: e.style, confidence: r2(Math.min(0.99, 0.4 * e.conf / 100 + 0.6 * e.trackQ)),
    }); }
  }
  // product-demo intervals: active stretch with no hero events, no hero words at either end, long enough
  const demoRanges = [];
  for (let i = 1; i < snaps.length; i++) {
    if (intervalHasEvents[i]) continue;
    const heroPrev = snaps[i - 1].words.some((w) => w.hero);
    const heroCur = snaps[i].words.some((w) => w.hero);
    if (heroPrev || heroCur) continue;
    const a = snaps[i - 1].tMs, b = snaps[i].tMs;
    // overlap with active windows
    let activeMs = 0;
    for (const w of coarse.windows) activeMs += Math.max(0, Math.min(b, w.endMs) - Math.max(a, w.startMs));
    if (activeMs >= 600) demoRanges.push({ t0: a, t1: b });
  }
  demoRanges.sort((x, y) => x.t0 - y.t0);
  const demos = [];
  for (const d of demoRanges) {
    const last = demos[demos.length - 1];
    if (last && d.t0 - last.t1 < 900) last.t1 = Math.max(last.t1, d.t1);
    else demos.push({ ...d });
  }
  for (const d of demos) events.push({ type: "product-demonstration", t0: d.t0, t1: d.t1, confidence: 0.7 });
  for (const c of coarse.cuts) events.push({ type: "cut", t: c, t0: c, t1: c, confidence: 0.9 });
  for (const s of coarse.statics) events.push({ type: "static-hold", t0: s.startMs, t1: s.endMs, confidence: 0.85 });
  events.sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
  events.forEach((e, i) => { e.id = `e${String(i + 1).padStart(3, "0")}`; });
  const ordered = events.map((e) => {
    const { id, type, text, t0, t1, t, from, to, motion, style, confidence } = e;
    const o = { id, type };
    if (text !== undefined) o.text = text;
    o.t0 = t0; o.t1 = t1;
    if (t !== undefined) o.t = t;
    if (from) o.from = from;
    if (to) o.to = to;
    if (motion) o.motion = motion;
    if (style) o.style = style;
    o.confidence = confidence;
    return o;
  });
  const transcript = {
    variant: "A-word",
    video: { width: coarse.meta.width, height: coarse.meta.height, fps: r2(coarse.meta.fps), durationMs: coarse.meta.durationMs },
    events: ordered,
  };
  writeFileSync(join(OUT, "transcript.json"), JSON.stringify(transcript, null, 2));

  // ---- caption items ----
  const items = [];
  const textEvents = ordered.filter((e) => e.type === "text-enter" || e.type === "text-exit");
  const used = new Set();
  for (const e of textEvents) {
    if (used.has(e.id)) continue;
    const group = [e];
    used.add(e.id);
    for (const o of textEvents) {
      if (used.has(o.id) || o.type !== e.type) continue;
      if (Math.abs(o.t0 - e.t0) > 550) continue;
      if (o.motion.mode !== e.motion.mode || o.motion.direction !== e.motion.direction) continue;
      group.push(o); used.add(o.id);
    }
    group.sort((a, b) => ((a.to?.y ?? 0) - (b.to?.y ?? 0)) * 4 + ((a.to?.x ?? 0) - (b.to?.x ?? 0)));
    const wordsTxt = group.map((g) => `"${g.text}"`).join(", ");
    const label = group.length === 1 ? `[word ${wordsTxt}]` : `[words ${wordsTxt}]`;
    const dist = Math.round(median(group.map((g) => g.motion.distancePx)));
    const m = e.motion;
    const s = group.length === 1 ? "s" : "";
    let verb;
    if (e.type === "text-enter") {
      if (m.mode === "slide") verb = `slide${s} ${m.direction} ${dist}px into place`;
      else if (m.mode === "slide+fade") verb = `slide${s} ${m.direction} ${dist}px + fade${s} in`;
      else if (m.mode === "fade") verb = `fade${s} in`;
      else verb = `pop${s} in`;
    } else {
      if (m.mode === "slide") verb = `slide${s} out ${m.direction} ${dist}px`;
      else if (m.mode === "slide+fade") verb = `slide${s} out ${m.direction} ${dist}px, fading`;
      else if (m.mode === "fade") verb = `fade${s} out`;
      else verb = `pop${s} out`;
    }
    let line = `${label} ${verb}`;
    if (m.curve !== "linear" && m.mode !== "pop") line += `, ${m.curve}`;
    if (e.type === "text-enter" && m.revealStyle === "progressive") line += `, progressive reveal`;
    const gt0 = Math.min(...group.map((g) => g.t0));
    const gt1 = Math.max(...group.map((g) => g.t1));
    items.push({ t0: gt0, t1: Math.max(gt1, gt0 + 1200), text: line });
  }
  for (const e of ordered) {
    if (e.type === "cut") items.push({ t0: e.t0, t1: e.t0 + 1200, text: "— hard cut —" });
    else if (e.type === "product-demonstration") items.push({ t0: e.t0, t1: Math.max(e.t1, e.t0 + 1200), text: "[product demonstration]" });
    else if (e.type === "static-hold") items.push({ t0: e.t0, t1: Math.max(e.t1, e.t0 + 1200), text: "[static hold]" });
  }
  items.sort((a, b) => a.t0 - b.t0);
  const bps = [...new Set(items.flatMap((i) => [i.t0, i.t1]))].sort((a, b) => a - b);
  let cues = [];
  for (let k = 0; k + 1 < bps.length; k++) {
    const a = bps[k], b = bps[k + 1];
    if (b - a < 40) continue;
    const active = items.filter((i) => i.t0 < b && i.t1 > a).map((i) => i.text);
    if (!active.length) continue;
    const lines = [...new Set(active)];
    const last = cues[cues.length - 1];
    if (last && last.t1 >= a - 1 && JSON.stringify(last.lines) === JSON.stringify(lines)) last.t1 = b;
    else cues.push({ t0: a, t1: b, lines });
  }
  for (let k = 0; k < cues.length; k++) {
    while (cues[k].t1 - cues[k].t0 < 1200 && k + 1 < cues.length && cues[k + 1].t0 - cues[k].t1 < 50) {
      cues[k].t1 = cues[k + 1].t1;
      cues[k].lines = [...new Set([...cues[k].lines, ...cues[k + 1].lines])];
      cues.splice(k + 1, 1);
    }
    if (cues[k].t1 - cues[k].t0 < 1200) cues[k].t1 = cues[k].t0 + 1200;
    if (k + 1 < cues.length && cues[k + 1].t0 < cues[k].t1) cues[k + 1].t0 = cues[k].t1;
  }
  cues = cues.filter((c) => c.t1 - c.t0 > 100);
  for (const c of cues) {
    if (c.lines.length > 3) c.lines = [...c.lines.slice(0, 2), `… +${c.lines.length - 2} more events`];
  }
  const srt = cues.map((c, i) => `${i + 1}\n${msToSrt(c.t0)} --> ${msToSrt(c.t1)}\n${c.lines.join("\n")}\n`).join("\n");
  writeFileSync(join(OUT, "captions.srt"), srt);
  writeFileSync(join(CACHE, "cues.json"), JSON.stringify(cues, null, 1));
  const counts = {};
  for (const e of ordered) counts[e.type] = (counts[e.type] || 0) + 1;
  console.log("events:", JSON.stringify(counts), "cues:", cues.length);
  console.log("DONE emit");
}

// ═════════════════════════ STAGE: render ═════════════════════════
function stageRender() {
  const cues = JSON.parse(readFileSync(join(CACHE, "cues.json"), "utf8"));
  const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  const LH = 19;
  const parts = [];
  let fi = 0;
  for (const cue of cues) {
    const n = cue.lines.length;
    for (let li = 0; li < n; li++) {
      const tf = join(CACHE, `cap_${fi}.txt`);
      writeFileSync(tf, cue.lines[li]);
      const y = FH - 8 - (n - li) * LH;
      parts.push(`drawtext=fontfile=${FONT}:textfile=${tf}:fontsize=15:fontcolor=0x1c1c1c:box=1:boxcolor=0xF7F0E3@0.82:boxborderw=3:x=(w-text_w)/2:y=${y}:enable='between(t,${(cue.t0 / 1000).toFixed(3)},${(cue.t1 / 1000).toFixed(3)})'`);
      fi++;
    }
  }
  const scriptF = join(CACHE, "filter.txt");
  writeFileSync(scriptF, "[0:v]" + parts.join(",") + "[vout]");
  run("ffmpeg", ["-v", "error", "-i", VIDEO, "-filter_complex_script", scriptF,
    "-map", "[vout]", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
    "-c:a", "copy", "-y", join(OUT, "annotated.mp4")]);
  console.log(`render: ${fi} drawtext filters, ${cues.length} cues`);
  console.log("DONE render");
}

// ═════════════════════════ main ═════════════════════════
const stage = process.argv[2] || "all";
try {
  if (stage === "coarse") stageCoarse();
  else if (stage === "ocr") stageOcr();
  else if (stage === "track") stageTrack();
  else if (stage === "emit") stageEmit();
  else if (stage === "render") stageRender();
  else if (stage === "all") {
    if (!existsSync(join(CACHE, "coarse.json"))) stageCoarse();
    stageOcr();
    stageTrack();
    stageEmit();
    stageRender();
  } else { console.error("unknown stage " + stage); process.exit(1); }
} catch (err) {
  console.error("FAIL:", err.message, err.stack ? err.stack.split("\n")[1] : "");
  process.exit(1);
}
