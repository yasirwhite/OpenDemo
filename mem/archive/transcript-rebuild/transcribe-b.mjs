#!/usr/bin/env node
/**
 * transcribe-b.mjs — VARIANT B: letter-level kinetic-typography transcriber.
 * Emits schemaVersion 2 (variant "B3-letter" — B2 plus emit-level data-quality
 * passes: ghost/debris gating, stale-sighting dedupe, fragment merging,
 * conflict retiming, exit-track repair, settled-frame word recovery): per-letter settled OCR boxes
 * (authoritative geometry, least-squares baseline-regularized), per-letter
 * t1/fontPx/baseline + fromOffset, inferred letters for failed tracks (never
 * dropped), per-group visibleUntilMs, and style copied onto text-exits. See
 * the _schema block written into transcript.json.
 *
 * Produces a time-aligned transcript of hero text animation at LETTER
 * granularity, grouped upward into simultaneous / staggered reveal groups
 * only where the measured birth times support it.
 *
 * Pure Node + ffmpeg/ffprobe/tesseract subprocesses. No deps, no network.
 *
 * Pipeline stages (state persisted in WORK dir so long runs can be chunked):
 *   keyframes      coarse 15fps activity pass + keyframe extraction (~0.64s grid)
 *   ocr [a b]      tesseract tsv+makebox per keyframe (char boxes, 2.5x upscale)
 *   states         hero-gate words, build text-instance timeline across keyframes
 *   track [a b]    native-fps per-letter template back/forward tracking
 *   emit           cluster letter births -> events, transcript.json + captions.srt
 *   render         burn group captions into annotated.mp4
 *   all            run everything sequentially
 *
 * usage: node transcribe-b.mjs <stage> [args] [--video path] [--work dir]
 */
import { spawn, spawnSync, execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const argv = process.argv.slice(2);
function opt(name, dflt) {
  const i = argv.indexOf("--" + name);
  return i >= 0 ? argv[i + 1] : dflt;
}
import { fileURLToPath } from "node:url";
const __dir = path.dirname(fileURLToPath(import.meta.url));
const VIDEO = opt("video", path.join(__dir, "reference/mem-reference.mp4"));
const WORK = opt("work", "/tmp/variantB/work");
const OUTDIR = opt("out", "/tmp/variantB");
fs.mkdirSync(WORK, { recursive: true });

// ── tunables ────────────────────────────────────────────────────────────────
const KF_MS = 640;              // keyframe grid
const OCR_SCALE = 2.5;          // upscale for tesseract
const NW = 640, NH = 360;       // native track resolution
const HERO_MIN_CHAR_H = 0.035;  // fraction of frame height
const MIN_WORD_CONF = 55;
const BG_RING_STD_MAX = 30;     // local background uniformity gate
const ACT_THR = 12;             // pixel delta counted as changed (coarse)
const ACT_COV = 0.006;          // coverage → "active"
const BACKTRACK_MS = 2400;      // how far before first sighting we decode
const FWD_MS = 2200;            // exit forward decode
const ALIVE_R = 0.50, ALIVE_A = 0.18;
const CLUSTER_GAP_MS = 120;     // birth-time gap that splits letter groups
const SIMUL_STD_MS = 18;        // below this std → simultaneous group

// ── subprocess helpers ──────────────────────────────────────────────────────
function ff(args) {
  const r = spawnSync("ffmpeg", ["-v", "error", ...args], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error("ffmpeg failed: " + args.join(" ") + "\n" + r.stderr);
  return r;
}
function ffRaw(args) {
  const r = spawnSync("ffmpeg", ["-v", "error", ...args, "-f", "rawvideo", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error("ffmpeg raw failed\n" + r.stderr);
  return r.stdout;
}
function getMeta() {
  const r = spawnSync("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", VIDEO], { encoding: "utf8" });
  const info = JSON.parse(r.stdout);
  const vs = info.streams.find(s => s.codec_type === "video");
  const [n, d] = vs.avg_frame_rate.split("/").map(Number);
  return {
    width: vs.width, height: vs.height, fps: n / d,
    durationMs: Math.round(parseFloat(vs.duration ?? info.format.duration) * 1000),
  };
}
const J = (f) => JSON.parse(fs.readFileSync(path.join(WORK, f), "utf8"));
const W = (f, o) => fs.writeFileSync(path.join(WORK, f), JSON.stringify(o, null, 1));

// ── grayscale frame store ───────────────────────────────────────────────────
function decodeGraySeq(t0Ms, t1Ms, fpsExpr) {
  const dur = (t1Ms - t0Ms) / 1000;
  const vf = `${fpsExpr ? `fps=${fpsExpr},` : ""}scale=${NW}:${NH}:flags=bilinear,format=gray`;
  const buf = ffRaw(["-ss", (t0Ms / 1000).toFixed(3), "-i", VIDEO, "-t", dur.toFixed(3), "-vf", vf, "-pix_fmt", "gray"]);
  const n = Math.floor(buf.length / (NW * NH));
  const frames = [];
  for (let i = 0; i < n; i++) frames.push(new Uint8Array(buf.buffer, buf.byteOffset + i * NW * NH, NW * NH));
  return frames;
}

// ── STAGE: keyframes ────────────────────────────────────────────────────────
async function stageKeyframes() {
  const meta = getMeta();
  // 1) coarse activity @15fps 160x90
  const cw = 160, ch = 90;
  const buf = ffRaw(["-i", VIDEO, "-vf", `fps=15,scale=${cw}:${ch}:flags=area,format=gray`, "-pix_fmt", "gray"]);
  const nf = Math.floor(buf.length / (cw * ch));
  const activity = [];
  const cuts = [];
  for (let i = 1; i < nf; i++) {
    const a = i * cw * ch, b = (i - 1) * cw * ch;
    let changed = 0, sum = 0;
    for (let p = 0; p < cw * ch; p++) {
      const d = Math.abs(buf[a + p] - buf[b + p]);
      sum += d; if (d > ACT_THR) changed++;
    }
    const cov = changed / (cw * ch), e = sum / (cw * ch * 255);
    const t = Math.round(i * 1000 / 15);
    activity.push({ t, cov: +cov.toFixed(4), e: +e.toFixed(4) });
  }
  // hard cut = isolated energy spike (sharp onset), not a fast-motion ramp
  for (let i = 1; i < activity.length; i++) {
    const s = activity[i], p = activity[i - 1];
    if (s.e > 0.25 && s.cov > 0.6 && s.e >= 2.2 * p.e) cuts.push(s.t);
  }
  // merge adjacent cut frames
  const mergedCuts = [];
  for (const c of cuts) if (!mergedCuts.length || c - mergedCuts[mergedCuts.length - 1] > 200) mergedCuts.push(c);
  // 2) keyframes: OCR pngs + native gray + native rgb
  const kfDir = path.join(WORK, "kf");
  fs.mkdirSync(kfDir, { recursive: true });
  const fpsK = 1000 / KF_MS;
  ff(["-i", VIDEO, "-vf", `fps=${fpsK},scale=${NW * OCR_SCALE}:${NH * OCR_SCALE}:flags=lanczos,unsharp=5:5:0.8`, "-y", path.join(kfDir, "kf_%04d.png")]);
  const grayBuf = ffRaw(["-i", VIDEO, "-vf", `fps=${fpsK},scale=${NW}:${NH}:flags=bilinear,format=gray`, "-pix_fmt", "gray"]);
  fs.writeFileSync(path.join(WORK, "kf.gray"), grayBuf);
  const rgbBuf = ffRaw(["-i", VIDEO, "-vf", `fps=${fpsK},scale=${NW}:${NH}:flags=bilinear`, "-pix_fmt", "rgb24"]);
  fs.writeFileSync(path.join(WORK, "kf.rgb"), rgbBuf);
  const nKF = fs.readdirSync(kfDir).filter(f => f.endsWith(".png")).length;
  W("meta.json", { meta, nKF, kfMs: KF_MS, cuts: mergedCuts });
  W("activity.json", activity);
  console.log(`keyframes: ${nKF} KFs, ${activity.length} activity samples, cuts=${JSON.stringify(mergedCuts)}`);
}

const kfTime = (i) => i * KF_MS; // kf index 0-based → ms
function kfGray(i) {
  const fd = fs.openSync(path.join(WORK, "kf.gray"), "r");
  const b = Buffer.alloc(NW * NH);
  fs.readSync(fd, b, 0, NW * NH, i * NW * NH);
  fs.closeSync(fd);
  return new Uint8Array(b);
}
function kfRgb(i) {
  const fd = fs.openSync(path.join(WORK, "kf.rgb"), "r");
  const b = Buffer.alloc(NW * NH * 3);
  fs.readSync(fd, b, 0, NW * NH * 3, i * NW * NH * 3);
  fs.closeSync(fd);
  return b;
}

// ── STAGE: ocr ──────────────────────────────────────────────────────────────
function runTesseract(png, base) {
  execFileSync("tesseract", [png, base, "tsv", "makebox"], { stdio: ["ignore", "ignore", "ignore"] });
  const tsv = fs.readFileSync(base + ".tsv", "utf8");
  const box = fs.readFileSync(base + ".box", "utf8");
  const words = [];
  for (const line of tsv.split("\n")) {
    const c = line.split("\t");
    if (c[0] !== "5" || !c[11] || !c[11].trim()) continue;
    words.push({
      x: +c[6] / OCR_SCALE, y: +c[7] / OCR_SCALE,
      w: +c[8] / OCR_SCALE, h: +c[9] / OCR_SCALE,
      conf: +c[10], text: c[11].trim(),
    });
  }
  const chars = [];
  const H = NH * OCR_SCALE;
  for (const line of box.split("\n")) {
    const p = line.split(" ");
    if (p.length < 6) continue;
    const [ch, x0, y0, x1, y1] = [p[0], +p[1], +p[2], +p[3], +p[4]];
    chars.push({
      ch,
      x: x0 / OCR_SCALE, y: (H - y1) / OCR_SCALE,
      w: (x1 - x0) / OCR_SCALE, h: (y1 - y0) / OCR_SCALE,
    });
  }
  return { words, chars };
}

async function stageOcr(a, b) {
  const { nKF } = J("meta.json");
  const from = a ?? 0, to = Math.min(b ?? nKF - 1, nKF - 1);
  const ocrDir = path.join(WORK, "ocr");
  fs.mkdirSync(ocrDir, { recursive: true });
  for (let i = from; i <= to; i++) {
    const out = path.join(ocrDir, `kf_${i}.json`);
    if (fs.existsSync(out)) continue;
    const png = path.join(WORK, "kf", `kf_${String(i + 1).padStart(4, "0")}.png`);
    let res = runTesseract(png, path.join(WORK, "tmpocr"));
    let inverted = false;
    // dark-frame fallback (light text on dark bg, e.g. glowing "Deep Search")
    const g = kfGray(i);
    let mean = 0; for (let p = 0; p < g.length; p += 7) mean += g[p];
    mean /= Math.ceil(g.length / 7);
    if (mean < 115 && res.words.filter(w => w.conf > 50).length === 0) {
      const inv = path.join(WORK, "tmp_inv.png");
      ff(["-i", png, "-vf", "negate", "-y", inv]);
      res = runTesseract(inv, path.join(WORK, "tmpocr"));
      inverted = true;
    }
    // colored-pill/backdrop fallback: tesseract's binarizer fails on tinted text chips
    if (res.words.filter(w => w.conf > 50).length === 0) {
      const gpng = path.join(WORK, "tmp_gray.png");
      ff(["-i", png, "-vf", "format=gray,eq=contrast=1.6", "-y", gpng]);
      const res2 = runTesseract(gpng, path.join(WORK, "tmpocr"));
      if (res2.words.filter(w => w.conf > 50).length > 0) res = res2;
    }
    fs.writeFileSync(out, JSON.stringify({ ...res, inverted, meanGray: Math.round(mean) }));
    if (i % 10 === 0) console.log("ocr", i);
  }
  console.log(`ocr done ${from}..${to}`);
}

// ── STAGE: states (hero gate + instance timeline) ───────────────────────────
function ringStd(gray, bx) {
  // std of a 3px ring around the bbox (background uniformity)
  const m = 3;
  const x0 = Math.max(0, Math.round(bx.x - m)), y0 = Math.max(0, Math.round(bx.y - m));
  const x1 = Math.min(NW - 1, Math.round(bx.x + bx.w + m)), y1 = Math.min(NH - 1, Math.round(bx.y + bx.h + m));
  const ix0 = Math.round(bx.x), iy0 = Math.round(bx.y), ix1 = Math.round(bx.x + bx.w), iy1 = Math.round(bx.y + bx.h);
  let s = 0, s2 = 0, n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x >= ix0 && x <= ix1 && y >= iy0 && y <= iy1) continue;
    const v = gray[y * NW + x]; s += v; s2 += v * v; n++;
  }
  if (!n) return 999;
  const mu = s / n;
  return Math.sqrt(Math.max(0, s2 / n - mu * mu));
}

/** robust: fraction of ring pixels far from the ring median (decor-tolerant). */
function ringOutlierFrac(gray, bx) {
  const m = 3;
  const x0 = Math.max(0, Math.round(bx.x - m)), y0 = Math.max(0, Math.round(bx.y - m));
  const x1 = Math.min(NW - 1, Math.round(bx.x + bx.w + m)), y1 = Math.min(NH - 1, Math.round(bx.y + bx.h + m));
  const ix0 = Math.round(bx.x), iy0 = Math.round(bx.y), ix1 = Math.round(bx.x + bx.w), iy1 = Math.round(bx.y + bx.h);
  const vals = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x >= ix0 && x <= ix1 && y >= iy0 && y <= iy1) continue;
    vals.push(gray[y * NW + x]);
  }
  if (!vals.length) return 1;
  vals.sort((a, b) => a - b);
  const med = vals[vals.length >> 1];
  let out = 0;
  for (const v of vals) if (Math.abs(v - med) > 25) out++;
  return out / vals.length;
}

function heroWordsOfKF(i) {
  const ocr = JSON.parse(fs.readFileSync(path.join(WORK, "ocr", `kf_${i}.json`), "utf8"));
  const gray = kfGray(i);
  const out = [];
  const smallCount = ocr.words.filter(w => w.conf >= 40 && w.h < 15 && w.h > 4 && /\S/.test(w.text)).length;
  for (const w of ocr.words) {
    if (w.conf < MIN_WORD_CONF) continue;
    if (!/[A-Za-z]/.test(w.text)) continue;                    // must contain a letter
    if (w.text.replace(/[^A-Za-z0-9]/g, "").length <= 3 && w.conf < 78) continue; // junky short reads
    if (/^[A-Z]{2}$/.test(w.text) && w.conf < 90) continue;      // logo glyphs misread as caps
    if (w.x < 2 || w.y < 2 || w.x + w.w > NW - 2) continue;     // clipped at frame edge
    if (w.text.replace(/[^A-Za-z]/g, "").length === 1 && !/[aiAI]/.test(w.text)) continue; // lone consonant = doodle/junk
    // degenerate word box (glow/antialias): rebuild vertical extent from native ink band
    let synthChars = null;
    if (w.h < 8) {
      const x0 = Math.max(0, w.x | 0), x1 = Math.min(NW - 1, (w.x + w.w) | 0);
      const yc = Math.max(0, Math.min(NH - 1, Math.round(w.y)));
      const med = gray[yc * NW + Math.max(0, x0 - 6)];
      let y0 = -1, y1 = -1;
      for (let y = Math.max(0, yc - 40); y <= Math.min(NH - 1, yc + 40); y++) {
        let ink = 0;
        for (let x = x0; x <= x1; x++) if (Math.abs(gray[y * NW + x] - med) > 45) ink++;
        if (ink / (x1 - x0 + 1) > 0.06) { if (y0 < 0) y0 = y; y1 = y; }
      }
      if (y0 >= 0 && y1 - y0 >= 8) {
        w.y = y0; w.h = y1 - y0 + 1;
        const n = w.text.length, cw = w.w / n;
        synthChars = [...w.text].map((ch, k) => ({ ch, x: w.x + k * cw, y: w.y, w: cw, h: w.h }));
      } else continue;
    }
    // chars inside this word bbox
    const chs = synthChars ?? ocr.chars.filter(c =>
      c.x + c.w / 2 >= w.x - 2 && c.x + c.w / 2 <= w.x + w.w + 2 &&
      c.y + c.h / 2 >= w.y - 3 && c.y + c.h / 2 <= w.y + w.h + 3 &&
      c.ch !== "|" && c.ch !== "~");
    if (!chs.length) continue;
    const hs = chs.map(c => c.h).sort((p, q) => p - q);
    const medH = hs[Math.floor(hs.length / 2)];
    if (medH < HERO_MIN_CHAR_H * NH) continue;
    if (ringOutlierFrac(gray, w) > 0.45) continue;   // background not locally uniform
    out.push({ ...w, chars: chs, medH: +medH.toFixed(1), inverted: !!ocr.inverted });
  }
  const allWordCount = ocr.words.filter(x => x.conf >= 40 && /\S/.test(x.text)).length;
  // "busy" frame = embedded product UI (dense sibling text) -> taints its words
  const busy = allWordCount >= 10 || smallCount >= 4 ||
    (allWordCount >= 9 && smallCount >= 1) ||                       // dense chat/phone frame
    (ocr.meanGray >= 120 && ocr.meanGray < 190 && allWordCount >= 2); // photo-collage frame
  return { heroWords: out, allWordCount, smallCount, busy, meanGray: ocr.meanGray, inverted: !!ocr.inverted };
}

async function stageStates() {
  const { nKF } = J("meta.json");
  const perKF = [];
  for (let i = 0; i < nKF; i++) perKF.push(heroWordsOfKF(i));
  // instance timeline
  const open = [], closed = [];
  for (let i = 0; i < nKF; i++) {
    const seen = new Set();
    for (const w of perKF[i].heroWords) {
      let best = null, bestD = 1e9;
      for (const inst of open) {
        if (seen.has(inst)) continue;
        if (inst.text.toLowerCase() !== w.text.toLowerCase()) continue;
        const dx = Math.abs(inst.bbox.x - w.x), dy = Math.abs(inst.bbox.y - w.y);
        const tol = inst.sightings === 1 ? 60 : 16;
        if (dx > tol || dy > tol) continue;
        if (Math.abs(inst.bbox.h - w.h) > inst.bbox.h * 0.4) continue;
        if (dx + dy < bestD) { bestD = dx + dy; best = inst; }
      }
      if (best) {
        best.lastKF = i; best.miss = 0; best.sightings++; best.kfs.push(i);
        best.bbox = { x: w.x, y: w.y, w: w.w, h: w.h };
        if (best.sightings === 2) { best.refKF = i; best.refChars = w.chars; best.refBbox = { ...best.bbox }; }
        seen.add(best);
      } else {
        const inst = {
          text: w.text, firstKF: i, lastKF: i, refKF: i, sightings: 1, miss: 0, kfs: [i],
          bbox: { x: w.x, y: w.y, w: w.w, h: w.h }, refBbox: { x: w.x, y: w.y, w: w.w, h: w.h },
          refChars: w.chars, medH: w.medH, conf: w.conf, inverted: w.inverted,
        };
        open.push(inst); seen.add(inst);
      }
    }
    for (let k = open.length - 1; k >= 0; k--) {
      if (seen.has(open[k])) continue;
      if (++open[k].miss >= 2) { closed.push(open.splice(k, 1)[0]); }
    }
  }
  closed.push(...open);
  let insts = closed.filter(t => !(t.text.length === 1 && t.conf < 75 && t.sightings < 2));
  insts.sort((a, b) => a.firstKF - b.firstKF || a.bbox.x - b.bbox.x);

  // merge same-text instances separated by <=2 KFs (zoom / slide / morph re-detections)
  let mergedSome = true;
  while (mergedSome) {
    mergedSome = false;
    for (let i = 0; i < insts.length && !mergedSome; i++) for (let j = 0; j < insts.length; j++) {
      const a = insts[i], b = insts[j];
      if (a === b || a.text.toLowerCase() !== b.text.toLowerCase()) continue;
      if (b.firstKF < a.lastKF || b.firstKF - a.lastKF > 2) continue;
      // absorb into the better-settled instance (more sightings, else later)
      const keep = b.sightings >= a.sightings ? b : a, drop = keep === b ? a : b;
      keep.firstKF = Math.min(a.firstKF, b.firstKF);
      keep.lastKF = Math.max(a.lastKF, b.lastKF);
      keep.kfs = [...new Set([...a.kfs, ...b.kfs])].sort((x, y) => x - y);
      keep.sightings = keep.kfs.length;
      keep.conf = Math.max(a.conf, b.conf);
      insts.splice(insts.indexOf(drop), 1);
      mergedSome = true;
      break;
    }
  }

  // dedupe spatially-overlapping duplicate reads (keep the better one)
  for (let i = insts.length - 1; i >= 0; i--) for (let j = 0; j < insts.length; j++) {
    if (i === j || !insts[i] || !insts[j]) continue;
    const A = insts[i].bbox, Bx = insts[j].bbox;
    const ox = Math.max(0, Math.min(A.x + A.w, Bx.x + Bx.w) - Math.max(A.x, Bx.x));
    const oy = Math.max(0, Math.min(A.y + A.h, Bx.y + Bx.h) - Math.max(A.y, Bx.y));
    const inter = ox * oy, uni = A.w * A.h + Bx.w * Bx.h - inter;
    const tOverlap = insts[i].firstKF <= insts[j].lastKF + 1 && insts[j].firstKF <= insts[i].lastKF + 1;
    const rel = insts[i].text.toLowerCase().includes(insts[j].text.toLowerCase()) ||
                insts[j].text.toLowerCase().includes(insts[i].text.toLowerCase());
    if (inter / uni > 0.45 && tOverlap && rel) {
      const scoreI = insts[i].sightings * 100 + insts[i].conf, scoreJ = insts[j].sightings * 100 + insts[j].conf;
      if (scoreI < scoreJ) { insts.splice(i, 1); break; }
    }
  }
  // taint: any sighting on a busy (embedded-UI) frame -> whole instance is embedded
  for (const t of insts) t.taint = t.kfs.some(k => perKF[k].busy) ? "busy" : null;
  // co-taint: if >=50% of a frame's instances are tainted, taint the rest of that frame's
  // single-frame instances (stray UI words that slipped through)
  for (let i = 0; i < nKF; i++) {
    const here = insts.filter(t => t.kfs.includes(i));
    if (!here.length) continue;
    const bad = here.filter(t => t.taint).length;
    if (bad / here.length >= 0.5) {
      for (const t of here) if (!t.taint && t.kfs.every(k => {
        const h2 = insts.filter(u => u.kfs.includes(k));
        return h2.filter(u => u.taint).length / h2.length >= 0.5;
      })) t.taint = "co";
    }
  }
  // calendar tokens / bare numbers seen only once = embedded list UI
  for (const t of insts) {
    if (!t.taint && t.sightings <= 1 &&
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Mon|Tue|Wed|Thu|Fri|Sat|Sun|\d{1,4})$/.test(t.text))
      t.taint = "calendar";
  }
  const kept = insts.filter(t => !t.taint);
  kept.forEach((t, k) => t.id = k);
  W("instances.json", kept);
  W("instances-all.json", insts);
  W("perkf.json", perKF.map(p => ({ n: p.heroWords.length, all: p.allWordCount, small: p.smallCount, busy: p.busy, meanGray: p.meanGray, inv: p.inverted, words: p.heroWords.map(w => w.text) })));
  for (const t of kept) console.log(`#${t.id} "${t.text}" kf${t.firstKF}-${t.lastKF} (${(kfTime(t.firstKF) / 1000).toFixed(1)}s-${(kfTime(t.lastKF) / 1000).toFixed(1)}s) x=${t.bbox.x.toFixed(0)} y=${t.bbox.y.toFixed(0)} h=${t.medH} conf=${t.conf} s=${t.sightings}`);
  console.log("kept:", kept.length, "tainted:", insts.length - kept.length);
}

// ── template matching ───────────────────────────────────────────────────────
function cropTemplate(frame, bx) {
  const x0 = Math.max(0, Math.round(bx.x) - 1), y0 = Math.max(0, Math.round(bx.y) - 1);
  const x1 = Math.min(NW, Math.round(bx.x + bx.w) + 1), y1 = Math.min(NH, Math.round(bx.y + bx.h) + 1);
  const tw = x1 - x0, th = y1 - y0;
  if (tw < 3 || th < 3) return null;
  const data = new Float32Array(tw * th);
  let mean = 0;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const v = frame[(y0 + y) * NW + x0 + x];
    data[y * tw + x] = v; mean += v;
  }
  mean /= tw * th;
  let varT = 0;
  for (let i = 0; i < data.length; i++) { data[i] -= mean; varT += data[i] * data[i]; }
  varT /= data.length;
  if (varT < 40) return null; // near-blank template
  return { data, tw, th, x0, y0, varT };
}

/** match template around (cx,cy) with radius r; returns best {x,y,r,alpha} (top-left coords). */
function matchAt(frame, tpl, cx, cy, rad, step = 1) {
  const { data, tw, th } = tpl;
  let best = { x: cx, y: cy, r: -2, alpha: 0 };
  for (let dy = -rad; dy <= rad; dy += step) {
    const py = cy + dy;
    if (py < 0 || py + th > NH) continue;
    for (let dx = -rad; dx <= rad; dx += step) {
      const px = cx + dx;
      if (px < 0 || px + tw > NW) continue;
      // zero-mean correlation
      let sP = 0;
      for (let y = 0; y < th; y++) {
        let row = (py + y) * NW + px;
        for (let x = 0; x < tw; x++) sP += frame[row + x];
      }
      const mP = sP / (tw * th);
      let cov = 0, varP = 0;
      for (let y = 0; y < th; y++) {
        let row = (py + y) * NW + px;
        for (let x = 0; x < tw; x++) {
          const p = frame[row + x] - mP;
          cov += p * data[y * tw + x];
          varP += p * p;
        }
      }
      const n = tw * th;
      const r = cov / (Math.sqrt(tpl.varT * (varP / n)) * n + 1e-6);
      if (r > best.r) {
        best = { x: px, y: py, r, alpha: Math.max(0, Math.min(1.25, (cov / n) / tpl.varT)) };
      }
    }
  }
  return best;
}

/** track template through frames from index i0 in direction dir until dead. */
function trackGlyph(frames, tpl, i0, dir, times) {
  const pts = [];
  let cx = tpl.x0, cy = tpl.y0;
  let missing = 0;
  for (let i = i0; i >= 0 && i < frames.length; i += dir) {
    let m = matchAt(frames[i], tpl, cx, cy, i === i0 ? 4 : 8, 2);
    m = matchAt(frames[i], tpl, m.x, m.y, 2, 1);
    // wide re-search if lost but was alive (fast slides)
    if (m.r < ALIVE_R && missing === 0 && pts.length > 0) {
      const w = matchAt(frames[i], tpl, cx, cy, 30, 3);
      if (w.r > m.r) m = matchAt(frames[i], tpl, w.x, w.y, 3, 1);
    }
    const alive = m.r >= ALIVE_R && m.alpha >= ALIVE_A;
    pts.push({ i, t: times[i], x: m.x, y: m.y, r: +m.r.toFixed(3), alpha: +Math.min(1, m.alpha).toFixed(3), alive });
    if (alive) { cx = m.x; cy = m.y; missing = 0; }
    else if (++missing >= 3) break;
  }
  // trim trailing dead points except one
  while (pts.length > 1 && !pts[pts.length - 1].alive && !pts[pts.length - 2].alive) pts.pop();
  return pts;
}

// ── STAGE: track ────────────────────────────────────────────────────────────
async function stageTrack(a, b) {
  const { meta, cuts } = J("meta.json");
  const insts = J("instances.json");
  const fps = meta.fps;
  // birth batches keyed by refKF window; death batches keyed by lastKF
  const batches = [];
  const byBirth = new Map();
  for (const t of insts) {
    const k = t.firstKF;
    if (!byBirth.has(k)) byBirth.set(k, []);
    byBirth.get(k).push(t);
  }
  for (const [k, list] of [...byBirth.entries()].sort((x, y) => x[0] - y[0]))
    batches.push({ kind: "birth", kf: k, ids: list.map(t => t.id) });
  const byDeath = new Map();
  for (const t of insts) {
    const k = t.lastKF;
    if (!byDeath.has(k)) byDeath.set(k, []);
    byDeath.get(k).push(t);
  }
  for (const [k, list] of [...byDeath.entries()].sort((x, y) => x[0] - y[0]))
    batches.push({ kind: "death", kf: k, ids: list.map(t => t.id) });

  const from = a ?? 0, to = Math.min(b ?? batches.length - 1, batches.length - 1);
  const trkDir = path.join(WORK, "tracks");
  fs.mkdirSync(trkDir, { recursive: true });
  for (let bi = from; bi <= to; bi++) {
    const batch = batches[bi];
    const out = path.join(trkDir, `${batch.kind}_${batch.kf}.json`);
    if (fs.existsSync(out)) continue;
    const members = batch.ids.map(id => insts[id]);
    let t0, t1, refT;
    if (batch.kind === "birth") {
      const maxRef = Math.max(...members.map(m => m.refKF));
      refT = kfTime(maxRef);
      t0 = Math.max(0, kfTime(batch.kf) - BACKTRACK_MS);
      const cutBefore = cuts.filter(c => c < kfTime(batch.kf) - 40).pop();
      if (cutBefore != null) t0 = Math.max(t0, cutBefore + 20);
      t1 = Math.min(meta.durationMs - 40, refT + 150);
    } else {
      refT = kfTime(batch.kf);
      t0 = Math.max(0, refT - 60);
      t1 = Math.min(meta.durationMs - 40, refT + FWD_MS);
      const cutAfter = cuts.find(c => c > refT + 40);
      if (cutAfter != null) t1 = Math.min(t1, cutAfter + 100);
    }
    const frames = decodeGraySeq(t0, t1);
    const times = frames.map((_, i) => Math.round(t0 + i * 1000 / fps));
    // ref frame index = closest to refT
    let ri = 0;
    for (let i = 0; i < times.length; i++) if (Math.abs(times[i] - refT) < Math.abs(times[ri] - refT)) ri = i;
    const result = { kind: batch.kind, kf: batch.kf, t0, t1, glyphs: [] };
    for (const m of members) {
      const chars = batch.kind === "birth" ? m.refChars : m.refChars.map(c => ({
        ...c,
        x: c.x + (m.bbox.x - m.refBbox.x),
        y: c.y + (m.bbox.y - m.refBbox.y),
      }));
      for (const c of chars) {
        const tpl = cropTemplate(frames[ri], c);
        if (!tpl) { result.glyphs.push({ inst: m.id, ch: c.ch, dead: true }); continue; }
        const dir = batch.kind === "birth" ? -1 : 1;
        const pts = trackGlyph(frames, tpl, ri, dir, times);
        result.glyphs.push({ inst: m.id, ch: c.ch, box: { x: tpl.x0, y: tpl.y0, w: tpl.tw, h: tpl.th }, pts });
      }
    }
    fs.writeFileSync(out, JSON.stringify(result));
    console.log(`track ${bi}/${batches.length - 1} ${batch.kind}@kf${batch.kf} (${(t0 / 1000).toFixed(2)}-${(t1 / 1000).toFixed(2)}s) glyphs=${result.glyphs.length}`);
  }
  W("batches.json", batches);
}

// ── letter analysis helpers ─────────────────────────────────────────────────
function analyzeBirthTrack(pts) {
  // pts ordered from ref frame going BACKWARD in time
  if (!pts || !pts.length) return null;
  let run = [];
  let deadStreak = 0;
  for (const p of pts) {
    if (p.alive) { run.push(p); deadStreak = 0; }
    else if (++deadStreak >= 2) break;
  }
  if (!run.length) return null;
  const birth = run[run.length - 1];
  const ref = pts[0];
  const clamped = birth.i === 0; // alive at decode start
  // settle (v2: this is the letter's t1): first frame within ~2px of the settled
  // position at >=0.9 alpha (relative to ref alpha for low-contrast glyphs)
  const fwd = run.slice().reverse(); // chronological
  let settle = fwd[fwd.length - 1];
  for (const p of fwd) {
    if (Math.hypot(p.x - ref.x, p.y - ref.y) <= 2 && p.alpha >= Math.min(0.9, ref.alpha * 0.9)) { settle = p; break; }
  }
  return { birth, settle, ref, fwd, clamped };
}
function classifyMotion(fwd, birth, settle) {
  const dx = settle.x - birth.x, dy = settle.y - birth.y;
  const dist = Math.hypot(dx, dy);
  const dur = settle.t - birth.t;
  const a0 = birth.alpha, a1 = settle.alpha;
  let mode;
  if (dur <= 100) mode = "pop";
  else if (dist < 4) mode = "fade";
  else if (a0 >= 0.55 * a1) mode = "slide";
  else mode = "slide+fade";
  let direction = "none";
  if (dist >= 4) {
    // direction text ENTERS FROM → movement vector is (dx,dy) toward settle
    const h = dx > 0 ? "right" : "left", v = dy > 0 ? "down" : "up";
    if (Math.abs(dx) > 2 * Math.abs(dy)) direction = h;
    else if (Math.abs(dy) > 2 * Math.abs(dx)) direction = v;
    else direction = `${v}-${h}`;
  }
  // easing from mid-progress
  let curve = "linear";
  const span = settle.t - birth.t;
  if (span > 80) {
    const tMid = birth.t + span / 2;
    let pMid = null;
    for (const p of fwd) if (p.t >= tMid) { pMid = p; break; }
    if (pMid) {
      const prog = dist >= 4
        ? Math.hypot(pMid.x - birth.x, pMid.y - birth.y) / (dist || 1)
        : (pMid.alpha - a0) / ((a1 - a0) || 1);
      if (prog > 0.62) curve = "ease-out";
      else if (prog < 0.38) curve = "ease-in";
    }
  }
  return { mode, direction, distancePx: +dist.toFixed(1), curve, durMs: dur };
}

// ── v3 (B3) emit-level data-quality passes ──────────────────────────────────
// Localized transcript-artifact repair applied inside stageEmit:
//  1. ghost-instance gating  (oversized low-conf OCR debris, e.g. giant "ve")
//  2. stale re-sighting dedupe (same glyphs re-emitted from an earlier,
//     pre-settled sighting → keep the longer-lived settled instance)
//  3. birth-cluster fragment merge (one sentence split across part-groups)
//  4. box-conflict retiming (groups tracked to a birth long before their OCR
//     evidence, landing on top of a different group, e.g. cycling chips)
//  5. low-conf debris gating (glyph boxes on top of a higher-conf group)
//  6. exit-track repair (walk-back start detection + death outliers)
//  7. settled-frame missing-word recovery (targeted re-OCR of uncovered ink)

function computeGhostInstances(insts) {
  const ghosts = new Set();
  for (const a of insts) {
    if (a.conf >= 85) continue;
    for (const b of insts) {
      if (b.id === a.id || b.conf < a.conf) continue;
      if (a.firstKF > b.lastKF || b.firstKF > a.lastKF) continue;
      if ((b.text || "").replace(/[^A-Za-z0-9]/g, "").length < 2) continue;
      if (a.medH > 2.2 * b.medH) { ghosts.add(a.id); break; }
    }
  }
  return ghosts;
}

const _lBase = (l) => l.baseline ?? (l.box ? l.box.y + l.box.h : 0);
const _winOf = (ev) => [ev.t0, Math.max(ev.t1, ...ev.letters.map(l => l.t1 ?? ev.t1))];
const _sameLine = (a, b) => Math.abs(_lBase(a) - _lBase(b)) <= 0.7 * Math.max(a.box.h, b.box.h);

/** earliest keyframe at which a temporally-relevant instance (still alive at
 *  or after tMs) shows this char near this box */
function earliestEvidenceKF(insts, ch, box, tMs) {
  let best = Infinity;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  for (const inst of insts) {
    if (inst.firstKF >= best) continue;
    if (tMs != null && kfTime(inst.lastKF) + KF_MS < tMs) continue; // dead long before
    for (const rc of inst.refChars) {
      if (rc.ch !== ch) continue;
      if (Math.abs(rc.x + rc.w / 2 - cx) < 1.2 * Math.max(rc.w, box.w) &&
          Math.abs(rc.y + rc.h / 2 - cy) < 0.9 * Math.max(rc.h, box.h)) { best = inst.firstKF; break; }
    }
  }
  return best;
}
function lettersBBox(ev) {
  let x0 = Infinity, x1 = -Infinity;
  for (const l of ev.letters) if (l.box) { x0 = Math.min(x0, l.box.x); x1 = Math.max(x1, l.box.x + l.box.w); }
  return { x0, x1 };
}
function _boxIoU(a, b) {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (ox <= 0 || oy <= 0) return 0;
  const i = ox * oy;
  return i / (a.w * a.h + b.w * b.h - i);
}

/** rebuild group text from letters: lines by baseline, words by source
 *  instance (_inst), adjacent words joined when the gap is sub-space-width. */
function rebuildTextFromLetters(letters) {
  const withBox = letters.filter(l => l.box);
  if (!withBox.length) return "";
  const medH = medianOf(withBox.map(l => l.box.h)) || 10;
  const sorted = withBox.slice().sort((a, b) => _lBase(a) - _lBase(b));
  const lines = [];
  for (const l of sorted) {
    const cur = lines[lines.length - 1];
    if (cur && Math.abs(_lBase(l) - cur.bl) <= Math.max(8, medH * 0.6)) cur.items.push(l);
    else lines.push({ bl: _lBase(l), items: [l] });
  }
  const lineTexts = [];
  for (const line of lines) {
    const words = new Map();
    for (const l of line.items) {
      const k = l._inst ?? "x" + Math.round(l.box.x / Math.max(8, medH * 2));
      if (!words.has(k)) words.set(k, []);
      words.get(k).push(l);
    }
    const ws = [...words.values()].map(ls => {
      ls.sort((a, b) => a.box.x - b.box.x);
      return { x0: Math.min(...ls.map(l => l.box.x)), x1: Math.max(...ls.map(l => l.box.x + l.box.w)), text: ls.map(l => l.ch).join("") };
    }).sort((a, b) => a.x0 - b.x0);
    let s = "";
    for (let i = 0; i < ws.length; i++) {
      if (i && ws[i].x0 - ws[i - 1].x1 >= Math.max(3, 0.25 * medH)) s += " ";
      s += ws[i].text;
    }
    lineTexts.push(s);
  }
  return lineTexts.join(" ");
}

function classifyPair(A, B) {
  let onLine = 0, conflict = 0; const dup = new Set();
  for (const b of B.letters) {
    if (!b.box) continue;
    const same = A.letters.filter(a => a.box && _sameLine(a, b));
    if (!same.length) continue;
    onLine++;
    const bcx = b.box.x + b.box.w / 2;
    let isDup = false, isConf = false;
    for (const a of same) {
      const acx = a.box.x + a.box.w / 2;
      if (Math.abs(acx - bcx) >= 0.3 * (a.box.w + b.box.w) + 1) continue;
      const hr = b.box.h / a.box.h;
      if (a.ch === b.ch && hr > 0.55 && hr < 1.8) { isDup = true; break; }
      const ov = Math.min(a.box.x + a.box.w, b.box.x + b.box.w) - Math.max(a.box.x, b.box.x);
      if (ov > 0.45 * Math.min(a.box.w, b.box.w)) isConf = true;
    }
    if (isDup) dup.add(b); else if (isConf) conflict++;
  }
  return { onLine, conflict, dup };
}

function mergeGroups(A, B, dupSet, metaOf) {
  const medT0 = medianOf(A.letters.map(l => l.t0)), medT1 = medianOf(A.letters.map(l => l.t1));
  const medDx = Math.round(medianOf(A.letters.map(l => l.fromOffset ? l.fromOffset.dx : 0)));
  const medDy = Math.round(medianOf(A.letters.map(l => l.fromOffset ? l.fromOffset.dy : 0)));
  const medA0 = +medianOf(A.letters.map(l => l.from ? (l.from.alpha ?? 0) : 0)).toFixed(3);
  const wEnd = _winOf(A)[1];
  for (const b of B.letters) {
    if (dupSet.has(b)) continue;
    if (b.t0 < A.t0 - 250 || b.t0 > wEnd + 250) {
      // birth time incompatible with the host cluster: tracking noise — adopt
      // the letter with host-consensus timing/offset and mark it inferred
      b.t0 = Math.round(medT0); b.t1 = Math.round(medT1);
      b.fromOffset = { dx: medDx, dy: medDy };
      b.from = { x: b.box.x + medDx, y: b.box.y + medDy, alpha: medA0 };
      b.to = { x: b.box.x, y: b.box.y, alpha: 1 };
      b.inferred = true;
    }
    A.letters.push(b);
  }
  const medH = medianOf(A.letters.map(l => l.box.h));
  A.letters.sort((a, b) => (Math.abs(_lBase(a) - _lBase(b)) > 0.6 * medH ? _lBase(a) - _lBase(b) : a.box.x - b.box.x));
  A.t0 = Math.min(...A.letters.map(l => l.t0));
  A.t1 = Math.max(...A.letters.map(l => l.t1));
  A.from = { x: Math.min(...A.letters.map(l => l.from.x)), y: Math.min(...A.letters.map(l => l.from.y)) };
  A.to = { x: Math.min(...A.letters.map(l => l.to.x)), y: Math.min(...A.letters.map(l => l.to.y)) };
  A.text = rebuildTextFromLetters(A.letters);
  A.style.fontSizePx = Math.round(medH);
  A.style.anchor = { x: Math.min(A.style.anchor.x, Math.min(...A.letters.map(l => l.box.x))), y: A.style.anchor.y };
  A.confidence = Math.max(A.confidence, B.confidence);
  const ma = metaOf.get(A), mb = metaOf.get(B);
  if (ma && mb) for (const id of mb.instIds) ma.instIds.add(id);
}

function postProcessEnterGroups(events, enterMeta, insts) {
  const metaOf = new Map(enterMeta.map(m => [m.ev, m]));
  const enters = () => events.filter(e => e.type === "text-enter" && e.letters && e.letters.length);
  const drop = (ev, why) => {
    const i = events.indexOf(ev); if (i >= 0) events.splice(i, 1);
    const j = enterMeta.findIndex(m => m.ev === ev); if (j >= 0) enterMeta.splice(j, 1);
    console.log(`b3 drop enter ${JSON.stringify(ev.text).slice(0, 44)} @${ev.t0}: ${why}`);
  };
  // pass A: stale re-sightings + fragment merges, to fixpoint
  let changed = true, guard = 0;
  while (changed && guard++ < 60) {
    changed = false;
    // A1: drop groups whose EVERY glyph re-appears (same char & spot, or a
    // near-identical box) in groups that live longer — multiple OCR sightings
    // of the same on-screen text emitted as separate enter events
    for (const B of enters().sort((a, b) => _winOf(a)[1] - _winOf(b)[1])) {
      const bEnd = _winOf(B)[1];
      const others = enters().filter(A => A !== B && _winOf(A)[1] > bEnd - 700 && A.t0 < bEnd + 600);
      if (!others.length) continue;
      const matched = B.letters.every(b => b.box && others.some(A => A.letters.some(a =>
        a.box && _sameLine(a, b) && (
          (a.ch === b.ch &&
            Math.abs((a.box.x + a.box.w / 2) - (b.box.x + b.box.w / 2)) < 1.2 * Math.max(a.box.w, b.box.w) &&
            b.box.h / a.box.h > 0.5 && b.box.h / a.box.h < 2) ||
          (_boxIoU(a.box, b.box) > 0.55 && b.box.h / a.box.h > 0.8 && b.box.h / a.box.h < 1.25)))));
      if (matched) { drop(B, "stale re-sighting of longer-lived group"); changed = true; break; }
    }
    if (changed) continue;
    // A2: merge birth-cluster fragments — same line band, interleaved x-span,
    // complementary (non-conflicting) glyph boxes
    outer:
    for (const A of enters()) for (const B of enters()) {
      if (A === B || B.letters.length > A.letters.length) continue;
      if (!(A.t0 <= _winOf(B)[1] + 800 && B.t0 <= _winOf(A)[1] + 800)) continue;
      const ab = lettersBBox(A), bb = lettersBBox(B);
      const hOv = Math.min(ab.x1, bb.x1) - Math.max(ab.x0, bb.x0);
      if (hOv < 0.5 * Math.max(1, bb.x1 - bb.x0)) continue;
      const cls = classifyPair(A, B);
      if (cls.onLine < 0.7 * B.letters.length) continue;
      if (cls.conflict > 0.3 * B.letters.length) continue;
      const btxt = B.text;
      mergeGroups(A, B, cls.dup, metaOf);
      drop(B, `fragment merged into "${A.text.slice(0, 36)}"`);
      changed = true; break outer;
    }
  }
  // pass B: box-conflicting overlapping groups — the group whose OCR evidence
  // starts later was back-tracked too far (chips replacing each other, typing
  // over a slide); retime it onto its own first-sighting evidence
  const firstKFOf = (ev) => {
    const m = metaOf.get(ev);
    return m && m.instIds.size ? Math.min(...[...m.instIds].map(id => insts[id].firstKF)) : 0;
  };
  const evs = enters();
  for (let i = 0; i < evs.length; i++) for (let j = i + 1; j < evs.length; j++) {
    let A = evs[i], B = evs[j];
    if (!events.includes(A) || !events.includes(B)) continue;
    if (B.letters.length > A.letters.length) { const t = A; A = B; B = t; }
    if (!(A.t0 <= _winOf(B)[1] + 300 && B.t0 <= _winOf(A)[1] + 300)) continue;
    const cls = classifyPair(A, B);
    if (cls.conflict <= 0.3 * B.letters.length) continue;
    const fA = firstKFOf(A), fB = firstKFOf(B);
    const late = fA > fB ? A : fB > fA ? B : null;
    if (!late) continue;
    const target = kfTime(late === A ? fA : fB) - KF_MS / 2;
    const d = Math.round(target - late.t0);
    if (d <= 0) continue;
    for (const l of late.letters) { l.t0 += d; l.t1 = Math.min(l.t1 + d, l.t0 + 400); }
    late.t0 += d; late.t1 = Math.max(...late.letters.map(l => l.t1));
    console.log(`b3 retime ${JSON.stringify(late.text).slice(0, 36)} +${d}ms → first OCR sighting`);
  }
}

// pass C (after visibleUntilMs): low-confidence groups whose glyph boxes sit
// on a co-visible higher-confidence group's glyphs are transition debris
function dropLowConfDebris(events, enterMeta) {
  const enters = () => events.filter(e => e.type === "text-enter" && e.letters && e.letters.length);
  for (const B of enters()) {
    if (B.confidence > 0.62) continue;
    const visB = B.visibleUntilMs ?? _winOf(B)[1];
    const rivals = enters().filter(A => A !== B && A.confidence >= 0.85 &&
      Math.min(A.visibleUntilMs ?? _winOf(A)[1], visB) - Math.max(A.t0, B.t0) > 150);
    if (!rivals.length) continue;
    let clash = 0;
    for (const b of B.letters) {
      if (!b.box) continue;
      let hit = false;
      for (const A of rivals) {
        for (const a of A.letters) {
          if (!a.box) continue;
          const ox = Math.min(a.box.x + a.box.w, b.box.x + b.box.w) - Math.max(a.box.x, b.box.x);
          const oy = Math.min(a.box.y + a.box.h, b.box.y + b.box.h) - Math.max(a.box.y, b.box.y);
          if (ox > 0 && oy > 0 && ox * oy > 0.35 * Math.min(a.box.w * a.box.h, b.box.w * b.box.h)) { hit = true; break; }
        }
        if (hit) break;
      }
      if (hit) clash++;
    }
    if (clash >= Math.max(1, 0.5 * B.letters.length)) {
      const i = events.indexOf(B); if (i >= 0) events.splice(i, 1);
      const j = enterMeta.findIndex(m => m.ev === B); if (j >= 0) enterMeta.splice(j, 1);
      console.log(`b3 drop enter ${JSON.stringify(B.text).slice(0, 44)} @${B.t0}: low-conf debris over higher-conf group`);
    }
  }
}

function dedupeExitEvents(events, exitMeta) {
  const exits = () => events.filter(e => e.type === "text-exit" && e.letters && e.letters.length);
  let changed = true, guard = 0;
  while (changed && guard++ < 8) {
    changed = false;
    for (const B of exits()) {
      for (const A of exits()) {
        if (A === B || A.letters.length < B.letters.length) continue;
        if (!(A.t0 <= B.t1 + 800 && B.t0 <= A.t1 + 800)) continue;
        const matched = B.letters.every(b => b.box && A.letters.some(a =>
          a.box && a.ch === b.ch && _sameLine(a, b) &&
          Math.abs((a.box.x + a.box.w / 2) - (b.box.x + b.box.w / 2)) < 1.2 * Math.max(a.box.w, b.box.w)));
        if (!matched) continue;
        const i = events.indexOf(B); if (i >= 0) events.splice(i, 1);
        const j = exitMeta.findIndex(m => m.ev === B); if (j >= 0) exitMeta.splice(j, 1);
        console.log(`b3 drop exit ${JSON.stringify(B.text).slice(0, 44)} @${B.t0}: duplicate of larger exit`);
        changed = true; break;
      }
      if (changed) break;
    }
  }
}

// ── v3: settled-frame missing-word recovery ─────────────────────────────────
// OCR occasionally misses a settled word entirely (e.g. "notes" at ~21s/26s,
// "with" right of the circular chips at ~56s, gray "app" at ~71s). For every
// settled hold, scan the text line band for ink columns not covered by any
// emitted glyph box and re-OCR those regions with alternative preprocessing
// (crop + 4x upscale, contrast boost, hard threshold). Only accepts real
// tesseract reads (conf>=60, sane glyph height & baseline) — never fabricates.
function _pgmWrite(file, buf, w, h) {
  fs.writeFileSync(file, Buffer.concat([Buffer.from(`P5\n${w} ${h}\n255\n`), Buffer.from(buf)]));
}
function ocrLineRegion(gray, rx0, ry0, rx1, ry1, thrLut, bgVal = 255) {
  const iw = rx1 - rx0 + 1, ih = ry1 - ry0 + 1;
  if (iw < 6 || ih < 6) return null;
  const PAD = 12; // synthetic background border: crops this tight break tesseract
  const w = iw + 2 * PAD, h = ih + 2 * PAD;
  const crop = Buffer.alloc(w * h, bgVal);
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) crop[(y + PAD) * w + x + PAD] = gray[(ry0 + y) * NW + rx0 + x];
  const SC = 4;
  const pgm = path.join(WORK, "rec_in.pgm"), png = path.join(WORK, "rec_up.png");
  _pgmWrite(pgm, crop, w, h);
  const variants = [
    `scale=${w * SC}:${h * SC}:flags=lanczos`,
    `scale=${w * SC}:${h * SC}:flags=lanczos,eq=contrast=1.6`,
    `scale=${w * SC}:${h * SC}:flags=lanczos,lut=y='if(gt(val,${thrLut}),255,0)'`,
    `scale=${w * SC}:${h * SC}:flags=lanczos,lut=y='if(gt(val,${Math.round(thrLut + (255 - thrLut) * 0.55)}),255,0)'`,
  ];
  for (const vf of variants) {
    try {
      ff(["-i", pgm, "-vf", vf, "-y", png]);
      execFileSync("tesseract", [png, path.join(WORK, "rec_out"), "--psm", "7", "tsv", "makebox"], { stdio: ["ignore", "ignore", "ignore"] });
    } catch { continue; }
    const words = [], chars = [];
    for (const line of fs.readFileSync(path.join(WORK, "rec_out.tsv"), "utf8").split("\n")) {
      const c = line.split("\t");
      if (c[0] !== "5" || !c[11] || !c[11].trim()) continue;
      words.push({ x: rx0 - PAD + +c[6] / SC, y: ry0 - PAD + +c[7] / SC, w: +c[8] / SC, h: +c[9] / SC, conf: +c[10], text: c[11].trim() });
    }
    const H = h * SC;
    for (const line of fs.readFileSync(path.join(WORK, "rec_out.box"), "utf8").split("\n")) {
      const p = line.split(" ");
      if (p.length < 6) continue;
      chars.push({ ch: p[0], x: rx0 - PAD + +p[1] / SC, y: ry0 - PAD + (H - +p[4]) / SC, w: (+p[3] - +p[1]) / SC, h: (+p[4] - +p[2]) / SC });
    }
    if (words.some(wd => wd.conf >= 75 && wd.text.replace(/[^A-Za-z0-9'’\-]/g, "").length >= 3)) return { words, chars };
  }
  return null;
}

async function recoverMissingWords(events, enterMeta) {
  const enters = events.filter(e => e.type === "text-enter" && !e.untracked && e.letters && e.letters.length);
  const probes = new Map();
  for (const ev of enters) {
    const lastT1 = Math.max(...ev.letters.map(l => l.t1));
    const vis = ev.visibleUntilMs ?? lastT1;
    let tp = vis - 130;
    if (tp < lastT1 + 40) tp = Math.round((lastT1 + vis) / 2);
    if (vis - ev.t0 < 250 || tp <= ev.t0 + 60) continue;
    const key = Math.round(tp / 200);
    if (!probes.has(key)) probes.set(key, Math.round(tp));
  }
  let added = 0;
  for (const tp of [...probes.values()].sort((a, b) => a - b)) {
    let frames, framesPrev, framesNext;
    try {
      frames = decodeGraySeq(tp, tp + 67, null);
      framesPrev = decodeGraySeq(Math.max(0, tp - 134), Math.max(67, tp - 67), null);
      framesNext = decodeGraySeq(tp + 100, tp + 167, null);
    } catch { continue; }
    const g = frames[0], gPrev = framesPrev[0], gNext = framesNext[0];
    if (!g) continue;
    const visible = enters.filter(ev => events.includes(ev) && ev.t0 <= tp &&
      tp <= (ev.visibleUntilMs ?? Math.max(...ev.letters.map(l => l.t1))));
    if (!visible.length) continue;
    // cluster all visible letters into text lines
    const lines = [];
    for (const ev of visible) for (const l of ev.letters) {
      if (!l.box) continue;
      const bl = _lBase(l);
      let ln = lines.find(L => Math.abs(L.bl - bl) <= Math.max(6, 0.5 * l.box.h));
      if (!ln) { ln = { bl, evs: [], letters: [] }; lines.push(ln); }
      ln.letters.push(l);
      if (!ln.evs.includes(ev)) ln.evs.push(ev);
    }
    for (const ln of lines) {
      const fontH = medianOf(ln.letters.map(l => l.box.h)) || 12;
      if (fontH < 9) continue;
      // an exit animating across this line at probe time displaces glyph ink —
      // anything "uncovered" here would be re-OCR'd exit debris
      const exitActive = events.some(x => x.type === "text-exit" && x.letters &&
        tp >= x.t0 - 30 && tp <= x.t1 + 60 &&
        x.letters.some(l2 => l2.box && Math.abs((l2.box.y + l2.box.h) - ln.bl) < 0.7 * fontH));
      if (exitActive) continue;
      const styleEv = ln.evs.slice().sort((a, b) => b.letters.length - a.letters.length)[0];
      if (styleEv.confidence < 0.7) continue;
      const baseline = Math.round(medianOf(ln.letters.map(_lBase)));
      const top = Math.min(...ln.letters.map(l => l.box.y));
      const y0 = Math.max(0, Math.round(top - 0.3 * fontH));
      const y1 = Math.min(NH - 1, Math.round(baseline + 0.1 * fontH));
      if (y1 - y0 < 6) continue;
      const bg = styleEv.style?.bgGray ?? 250;
      const [cr, cg, cb] = styleEv.style?.colorRGB ?? [34, 34, 34];
      const inkL = 0.299 * cr + 0.587 * cg + 0.114 * cb;
      const thr = Math.max(26, 0.30 * Math.abs(inkL - bg));
      const covered = new Uint8Array(NW);
      for (const ev of visible) for (const l of ev.letters) {
        if (!l.box) continue;
        const vOv = Math.min(l.box.y + l.box.h, y1) - Math.max(l.box.y, y0);
        if (vOv < Math.min(0.6 * l.box.h, 0.5 * (y1 - y0))) continue; // other-line glyphs must not mask this band
        const a0 = Math.max(0, Math.floor(l.box.x - 3 - 0.2 * l.box.h)), a1 = Math.min(NW - 1, Math.ceil(l.box.x + l.box.w + 3 + 0.2 * l.box.h));
        for (let x = a0; x <= a1; x++) covered[x] = 1;
      }
      const runs = [];
      let cur = null;
      const gapPx = Math.max(7, Math.round(0.42 * fontH));
      for (let x = 4; x < NW - 4; x++) {
        let c = 0;
        for (let y = y0; y <= y1; y++) if (Math.abs(g[y * NW + x] - bg) > thr) c++;
        if (c >= 2 && !covered[x]) {
          if (cur && x - cur.x1 <= gapPx) cur.x1 = x;
          else { cur = { x0: x, x1: x }; runs.push(cur); }
        }
      }
      if (process.env.B3DEBUG) console.log(`b3dbg probe@${tp} line bl=${baseline} fontH=${Math.round(fontH)} runs=${JSON.stringify(runs)}`);
      if (process.env.B3DEBUG && Math.abs(tp - 20874) < 300) {
        let cs = ""; for (let x = 370; x <= 410; x++) cs += covered[x] ? "#" : ".";
        console.log("b3dbg cov370-410:", cs);
        for (const ev of visible) for (const l of ev.letters) if (l.box && l.box.x > 340 && l.box.x < 480) console.log("b3dbg covletter", l.ch, JSON.stringify(l.box), "vOv", Math.min(l.box.y + l.box.h, y1) - Math.max(l.box.y, y0));
      }
      for (const run of runs) {
        if (run.x1 - run.x0 < 0.55 * fontH) continue;
        // grow run edges over sub-threshold antialiased ink (thresholded ink
        // detection clips glyph stems, which breaks tesseract), then add a
        // small clean margin — never bleeding into a covered neighbour glyph
        let mL = 0; while (mL < 10 && run.x0 - mL - 1 >= 0 && !covered[run.x0 - mL - 1]) mL++;
        let mR = 0; while (mR < 10 && run.x1 + mR + 1 < NW && !covered[run.x1 + mR + 1]) mR++;
        const rx0 = Math.max(0, run.x0 - mL), rx1 = Math.min(NW - 1, run.x1 + mR);
        const ry1 = Math.min(NH - 1, Math.round(baseline + 0.3 * fontH));
        const res = ocrLineRegion(g, rx0, Math.max(0, y0 - 2), rx1, ry1, Math.round((bg + inkL) / 2), Math.round(bg));
        if (process.env.B3DEBUG) console.log(`b3dbg region @${tp} x${rx0}-${rx1} y${Math.max(0, y0 - 2)}-${ry1} -> ${res ? res.words.map(w2 => `${JSON.stringify(w2.text)}:${w2.conf}`).join(",") : "null"}`);
        if (!res) continue;
        for (const wd of res.words) {
          if (process.env.B3DEBUG) console.log(`b3dbg cand @${tp} ${JSON.stringify(wd.text)} conf=${wd.conf} box=${Math.round(wd.x)},${Math.round(wd.y)} ${Math.round(wd.w)}x${Math.round(wd.h)}`);
          if (wd.conf < 75) continue;
          const clean = wd.text.replace(/[^A-Za-z0-9'’\-]/g, "");
          if (clean.length < 3 || clean.length / wd.text.length < 0.7) continue;
          // near-time duplicate guard: pixels of a group that is merely not
          // yet (or no longer) marked visible at the probe instant
          const dupNear = events.some(ev2 => ev2.type === "text-enter" && ev2.letters &&
            ev2.t0 <= tp + 1200 && (ev2.visibleUntilMs ?? ev2.t1) >= tp - 1200 &&
            ev2.letters.some(l2 => l2.box && Math.abs(_lBase(l2) - baseline) < 0.7 * fontH &&
              Math.min(l2.box.x + l2.box.w, wd.x + wd.w) - Math.max(l2.box.x, wd.x) > 0.5 * l2.box.w));
          if (dupNear) continue;
          // stability: the word's pixels must be static (settled), not an
          // exit/slide caught mid-flight at the probe instant
          {
            const sx0 = Math.max(0, Math.floor(wd.x)), sx1 = Math.min(NW - 1, Math.ceil(wd.x + wd.w));
            const sy0 = Math.max(0, Math.floor(y0)), sy1 = Math.min(NH - 1, Math.ceil(ry1));
            const diffTo = (go) => {
              if (!go) return Infinity;
              let diff = 0, n = 0;
              for (let yy = sy0; yy <= sy1; yy++) for (let xx = sx0; xx <= sx1; xx++) { diff += Math.abs(g[yy * NW + xx] - go[yy * NW + xx]); n++; }
              return n ? diff / n : Infinity;
            };
            const d = Math.min(diffTo(gPrev), diffTo(gNext));
            if (d > 28) { if (process.env.B3DEBUG) console.log(`b3dbg unstable ${JSON.stringify(wd.text)} @${tp} (${d.toFixed(1)})`); continue; }
            if (d > 16) {
              // slow zoom/recolor scenes never fully settle; accept unless the
              // read looks like a displaced duplicate of a known nearby word
              const cand = wd.text.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
              const dupWord = events.some(ev2 => ev2.type === "text-enter" && typeof ev2.text === "string" &&
                ev2.t0 <= tp + 2500 && (ev2.visibleUntilMs ?? ev2.t1) >= tp - 2500 &&
                ev2.text.toLowerCase().split(/\s+/).some(w2 => {
                  const wclean = w2.replace(/[^a-z0-9]/g, "");
                  return wclean.length >= cand.length && wclean !== cand && (wclean.startsWith(cand) || wclean.endsWith(cand));
                }));
              if (dupWord) { if (process.env.B3DEBUG) console.log(`b3dbg displaced-dup ${JSON.stringify(wd.text)} @${tp} (${d.toFixed(1)})`); continue; }
            }
          }
          const seq = [...wd.text].filter(ch => /^[A-Za-z0-9'’\-.,!?]$/.test(ch)).map(ch => ({ ch }));
          if (seq.length < 2) continue;
          const chs = refineCharBoxes(g,
            { x: wd.x, y: baseline - 1.05 * fontH, w: wd.w, h: 1.35 * fontH }, seq);
          if (!chs) continue; // ink does not support the read: do not fabricate
          const mh = medianOf(chs.map(c => c.h));
          if (mh < 0.45 * fontH || mh > 1.6 * fontH) continue;
          const sit = chs.filter(c => !DESCENDERS.has(c.ch) && !FLOATERS.has(c.ch));
          const wb = medianOf((sit.length ? sit : chs).map(c => c.y + c.h));
          if (Math.abs(wb - baseline) > 0.5 * fontH) continue;
          // host = the line's group horizontally nearest to the recovered word
          const wcx = wd.x + wd.w / 2;
          const host = ln.evs.slice().sort((a, b) => {
            const da = Math.min(...a.letters.filter(l => l.box).map(l => Math.abs(l.box.x + l.box.w / 2 - wcx)));
            const db = Math.min(...b.letters.filter(l => l.box).map(l => Math.abs(l.box.x + l.box.w / 2 - wcx)));
            return da - db;
          })[0];
          const visH = host.visibleUntilMs ?? Math.max(...host.letters.map(l => l.t1));
          // measure when the word actually appeared: bisect on its box ink
          const bx0 = Math.max(0, Math.floor(wd.x)), bx1 = Math.min(NW - 1, Math.ceil(wd.x + wd.w));
          const by0 = Math.max(0, Math.floor(y0)), by1 = Math.min(NH - 1, Math.ceil(ry1));
          const inkOf = (gg) => {
            let c = 0;
            for (let yy = by0; yy <= by1; yy++) for (let xx = bx0; xx <= bx1; xx++) if (Math.abs(gg[yy * NW + xx] - bg) > thr) c++;
            return c;
          };
          const target = 0.7 * inkOf(g);
          let loT = Math.max(0, host.t0 - 300), hiT = tp;
          for (let it = 0; it < 5 && hiT - loT > 120; it++) {
            const mid = Math.round((loT + hiT) / 2);
            let gm = null;
            try { gm = decodeGraySeq(mid, mid + 67, null)[0]; } catch {}
            if (gm && inkOf(gm) >= target) hiT = mid; else loT = mid;
          }
          const t0n = Math.min(hiT, visH - 80);
          const wid = "rec" + (++added);
          const newLs = chs.map((c, k) => {
            const x = Math.round(c.x), yTop = Math.round(c.y);
            const snap = Math.abs((c.y + c.h) - baseline) <= Math.max(1.5, 0.15 * fontH);
            const hh = snap ? Math.max(2, baseline - yTop) : Math.max(2, Math.round(c.h));
            return {
              ch: c.ch, t0: t0n, t1: Math.min(t0n + 250, visH),
              box: { x, y: yTop, w: Math.max(1, Math.round(c.w)), h: hh },
              fontPx: hh, baseline,
              from: { x, y: yTop, alpha: 0 }, to: { x, y: yTop, alpha: 1 },
              fromOffset: { dx: 0, dy: 0 }, inferred: true, recovered: true,
              _inst: wid, _ci: k,
            };
          });
          host.letters.push(...newLs);
          const mAll = medianOf(host.letters.map(l => l.box.h));
          host.letters.sort((a, b) => (Math.abs(_lBase(a) - _lBase(b)) > 0.6 * mAll ? _lBase(a) - _lBase(b) : a.box.x - b.box.x));
          host.t1 = Math.max(host.t1, ...newLs.map(l => l.t1));
          host.text = rebuildTextFromLetters(host.letters);
          console.log(`b3 recovered "${wd.text}" (conf ${wd.conf}) @${tp}ms → "${host.text}"`);
          if (added >= 12) return;
        }
      }
    }
  }
}

// ── STAGE: emit ─────────────────────────────────────────────────────────────
function medianOf(arr) { const s = arr.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; }

// v2: chars whose OCR box bottom is NOT the text baseline
const DESCENDERS = new Set([..."gjpqy"]);
const FLOATERS = new Set([..."'\"-–—*^~`´’‘“”·,;"]);

/**
 * v2 baseline regularization. Input letters carry `sbox` = raw settled-frame OCR
 * char box (float px). Clusters letters into text lines by box bottom, then fits
 * each line's baseline by LEAST SQUARES on the bottoms of baseline-sitting
 * glyphs (descenders/floaters excluded from the fit). Each letter's box bottom
 * is snapped to the fitted line unless it genuinely deviates by more than 15%
 * of the line's glyph height (descenders, apostrophes, superscripts keep their
 * true ink extent). Writes integer `box` = {x, y, w, h} (y = ink top) plus a
 * shared `baseline` per letter.
 */
function regularizeBaselines(letters) {
  const withB = letters.map(l => ({ l, bottom: l.sbox.y + l.sbox.h, cx: l.sbox.x + l.sbox.w / 2 }));
  withB.sort((a, b) => a.bottom - b.bottom);
  const medH = medianOf(letters.map(l => l.sbox.h)) || 10;
  const tol = Math.max(8, medH * 0.5);
  const lines = [];
  for (const wb of withB) {
    const cur = lines[lines.length - 1];
    if (cur && wb.bottom - cur[cur.length - 1].bottom <= tol) cur.push(wb);
    else lines.push([wb]);
  }
  for (const line of lines) {
    const sitters = line.filter(wb => !DESCENDERS.has(wb.l.ch) && !FLOATERS.has(wb.l.ch));
    const fitPts = sitters.length >= 2 ? sitters : line;
    // least-squares fit: bottom = a*cx + b (a capped: baselines are ~horizontal)
    let a = 0, b;
    if (fitPts.length >= 2) {
      const mx = fitPts.reduce((s, p) => s + p.cx, 0) / fitPts.length;
      const my = fitPts.reduce((s, p) => s + p.bottom, 0) / fitPts.length;
      let cov = 0, vx = 0;
      for (const p of fitPts) { cov += (p.cx - mx) * (p.bottom - my); vx += (p.cx - mx) ** 2; }
      a = vx > 1e-6 ? cov / vx : 0;
      if (Math.abs(a) > 0.02) a = 0; // outlier-driven tilt, not a real baseline slope
      b = my - a * mx;
    } else b = fitPts[0].bottom;
    const lineH = medianOf(fitPts.map(p => p.l.sbox.h)) || medH;
    for (const wb of line) {
      const fitted = a * wb.cx + b;
      const bx = wb.l.sbox;
      const x = Math.round(bx.x), y = Math.round(bx.y);
      const dev = Math.abs(wb.bottom - fitted) <= Math.max(1.5, 0.15 * lineH);
      const snap = (DESCENDERS.has(wb.l.ch) || FLOATERS.has(wb.l.ch)) ? dev : true;
      const h = snap ? Math.max(2, Math.round(fitted) - y) : Math.max(2, Math.round(bx.h));
      wb.l.box = { x, y, w: Math.max(1, Math.round(bx.w)), h };
      wb.l.baseline = Math.round(fitted);
    }
  }
}

/**
 * v2: ink-based char box refinement. Tesseract's WORD boxes are precise but its
 * makebox CHAR boxes are frequently garbled (one box spanning two glyphs).
 * Re-segment the word's ink directly: column ink profile inside the word box →
 * glyph clusters (dots/accents merged), clusters mapped to the char sequence by
 * cumulative expected widths (splitting touching glyphs at ink minima), then
 * exact per-char x/y extents from the ink. Returns a refined char array (same
 * order/length) or null when the ink doesn't support the segmentation.
 */
const CHAR_W = (ch) => /[ilj.,'!|:;]/.test(ch) ? 0.42 : /[tfr\-]/.test(ch) ? 0.62 :
  /[mwMW]/.test(ch) ? 1.55 : /[A-Z0-9]/.test(ch) ? 1.15 : 1.0;
function refineCharBoxes(gray, wordBox, chars) {
  const x0 = Math.max(0, Math.floor(wordBox.x) - 2), x1 = Math.min(NW - 1, Math.ceil(wordBox.x + wordBox.w) + 2);
  const y0 = Math.max(0, Math.floor(wordBox.y) - 3), y1 = Math.min(NH - 1, Math.ceil(wordBox.y + wordBox.h) + 3);
  if (x1 - x0 < chars.length * 2 || y1 - y0 < 4) return null;
  // background = median of the box border pixels
  const border = [];
  for (let x = x0; x <= x1; x++) border.push(gray[y0 * NW + x], gray[y1 * NW + x]);
  for (let y = y0; y <= y1; y++) border.push(gray[y * NW + x0], gray[y * NW + x1]);
  border.sort((p, q) => p - q);
  const bg = border[border.length >> 1];
  const W_ = x1 - x0 + 1;
  const prof = new Array(W_).fill(0);
  for (let x = 0; x < W_; x++) {
    let c = 0;
    for (let y = y0; y <= y1; y++) if (Math.abs(gray[y * NW + x0 + x] - bg) > 40) c++;
    prof[x] = c;
  }
  // ink clusters = maximal runs of non-empty columns
  let clusters = [];
  let s = -1;
  for (let i = 0; i < W_; i++) {
    if (prof[i] > 0) { if (s < 0) s = i; }
    else if (s >= 0) { clusters.push([s, i - 1]); s = -1; }
  }
  if (s >= 0) clusters.push([s, W_ - 1]);
  if (!clusters.length) return null;
  // merge slivers (i-dots, accents, noise) into a close neighbor
  let merged = true;
  while (merged && clusters.length > 1) {
    merged = false;
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i][1] - clusters[i][0] + 1 >= 2) continue;
      const gl = i > 0 ? clusters[i][0] - clusters[i - 1][1] : 1e9;
      const gr = i < clusters.length - 1 ? clusters[i + 1][0] - clusters[i][1] : 1e9;
      if (Math.min(gl, gr) > 3) continue; // isolated speck: keep (may be '.' or "'")
      const j = gl <= gr ? i - 1 : i + 1;
      const lo = Math.min(i, j), hi = Math.max(i, j);
      clusters[lo] = [clusters[lo][0], clusters[hi][1]];
      clusters.splice(hi, 1);
      merged = true; break;
    }
  }
  const n = chars.length;
  // too many clusters: merge across the smallest gaps
  while (clusters.length > n) {
    let bi = 1, bgap = 1e9;
    for (let i = 1; i < clusters.length; i++) {
      const g = clusters[i][0] - clusters[i - 1][1];
      if (g < bgap) { bgap = g; bi = i; }
    }
    clusters[bi - 1] = [clusters[bi - 1][0], clusters[bi][1]];
    clusters.splice(bi, 1);
  }
  // assign chars to clusters by cumulative expected width over the total ink span
  const weights = chars.map(c => CHAR_W(c.ch));
  const totW = weights.reduce((p, q) => p + q, 0);
  const inkW = clusters.reduce((p, c) => p + c[1] - c[0] + 1, 0);
  const perCluster = clusters.map(() => []);
  let cum = 0;
  for (let ci = 0; ci < n; ci++) {
    const center = (cum + weights[ci] / 2) / totW * inkW; // position in "ink space"
    cum += weights[ci];
    let acc = 0, pick = clusters.length - 1;
    for (let k = 0; k < clusters.length; k++) {
      const w = clusters[k][1] - clusters[k][0] + 1;
      if (center < acc + w) { pick = k; break; }
      acc += w;
    }
    perCluster[pick].push(ci);
  }
  // chars must stay in order and no cluster may be empty: rebalance from neighbors
  for (let k = 0; k < clusters.length; k++) {
    if (perCluster[k].length) continue;
    for (const dir of [-1, 1]) {
      const j = k + dir;
      if (j >= 0 && j < clusters.length && perCluster[j].length > 1) {
        perCluster[k].push(dir < 0 ? perCluster[j].pop() : perCluster[j].shift());
        break;
      }
    }
    if (!perCluster[k].length) return null;
  }
  // split multi-char clusters at ink minima near expected boundaries
  const out = new Array(n);
  for (let k = 0; k < clusters.length; k++) {
    const idxs = perCluster[k];
    const [ca, cb] = clusters[k];
    const bounds = [ca];
    if (idxs.length > 1) {
      const wsum = idxs.reduce((p, i) => p + weights[i], 0);
      let c2 = 0;
      for (let q = 0; q < idxs.length - 1; q++) {
        c2 += weights[idxs[q]];
        const exp = ca + c2 / wsum * (cb - ca + 1);
        const r = Math.max(2, Math.round((cb - ca + 1) / idxs.length * 0.35));
        let best = Math.round(exp), bv = Infinity;
        for (let x = Math.max(ca + 1, Math.round(exp) - r); x <= Math.min(cb - 1, Math.round(exp) + r); x++)
          if (prof[x] < bv) { bv = prof[x]; best = x; }
        bounds.push(best);
      }
    }
    bounds.push(cb + 1);
    for (let q = 0; q < idxs.length; q++) {
      const ci = idxs[q];
      const gx0 = bounds[q], gx1 = bounds[q + 1] - 1;
      // exact ink extents inside this x-range
      let ty = -1, by = -1, lx = gx1, rx = gx0;
      for (let y = y0; y <= y1; y++) {
        let has = false;
        for (let x = gx0; x <= gx1; x++) if (Math.abs(gray[y * NW + x0 + x] - bg) > 40) {
          has = true;
          if (x < lx) lx = x; if (x > rx) rx = x;
        }
        if (has) { if (ty < 0) ty = y; by = y; }
      }
      if (ty < 0 || rx < lx) return null;
      out[ci] = { ch: chars[ci].ch, x: x0 + lx, y: ty, w: rx - lx + 1, h: by - ty + 1 };
    }
  }
  return out;
}

/**
 * v2: authoritative settled char boxes. The tracking ref frame (2nd sighting)
 * can still be mid-animation, so its char boxes are noisy. Scan the instance's
 * LAST sightings (most settled) for an OCR word whose char sequence contains
 * the tracked glyph sequence, refine the word's char boxes from the frame INK
 * inside the (precise) tsv word box, and score candidates by box sanity.
 * Returns an array aligned with refChars indices, or null (caller falls back
 * to refChars shifted to the last bbox).
 */
const _settledCache = new Map();
function settledCharsOf(inst) {
  if (_settledCache.has(inst.id)) return _settledCache.get(inst.id);
  const want = inst.refChars.map(c => c.ch).join("");
  let best = null, bestScore = -Infinity;
  for (const k of inst.kfs.slice(-4)) {
    let ocr;
    try { ocr = JSON.parse(fs.readFileSync(path.join(WORK, "ocr", `kf_${k}.json`), "utf8")); }
    catch { continue; }
    for (const w of ocr.words) {
      if (w.conf < 40 || !w.text.trim()) continue;
      const a = w.text.trim().toLowerCase(), b = inst.text.toLowerCase();
      if (a !== b && !a.includes(b) && !b.includes(a)) continue;
      if (Math.abs(w.x - inst.bbox.x) > 45 || Math.abs(w.y - inst.bbox.y) > 25) continue;
      const chs = ocr.chars.filter(c =>
        c.x + c.w / 2 >= w.x - 2 && c.x + c.w / 2 <= w.x + w.w + 2 &&
        c.y + c.h / 2 >= w.y - 3 && c.y + c.h / 2 <= w.y + w.h + 3 &&
        c.ch !== "|" && c.ch !== "~");
      const at = chs.map(c => c.ch).join("").indexOf(want);
      if (at < 0) continue;
      const slice = chs.slice(at, at + inst.refChars.length);
      let mono = 2, ovl = 0;
      for (let i = 1; i < slice.length; i++) {
        if (slice[i].x < slice[i - 1].x - 1) mono = 0;
        const o = slice[i - 1].x + slice[i - 1].w - slice[i].x;
        if (o > Math.min(slice[i - 1].w, slice[i].w) * 0.4 + 1) ovl++;
      }
      const hs = slice.map(c => c.h).sort((p, q) => p - q);
      const iqr = hs[Math.floor(hs.length * 0.75)] - hs[Math.floor(hs.length * 0.25)];
      // ink refinement fixes garbled raw boxes, so candidate choice is dominated
      // by how settled the sighting is (proximity to the instance's final bbox)
      const sane = mono > 0 && ovl === 0 && iqr <= hs[hs.length >> 1] * 0.6;
      const score = w.conf / 100 + k * 0.01 + (sane ? 0.3 : 0) -
        (Math.abs(w.x - inst.bbox.x) + Math.abs(w.y - inst.bbox.y)) * 0.2;
      if (score > bestScore) { bestScore = score; best = { k, w, chs, at, slice, sane }; }
    }
  }
  let result = null;
  if (best) {
    // refine the FULL word from ink (precise word box), then take our slice
    const refined = refineCharBoxes(kfGray(best.k), best.w, best.chs);
    if (refined) result = refined.slice(best.at, best.at + inst.refChars.length);
    else if (best.sane) result = best.slice; // raw boxes look sane: keep
  }
  _settledCache.set(inst.id, result);
  return result;
}

function groupStyle(inst, letters) {
  const rgb = kfRgb(inst.refKF);
  const gray = kfGray(inst.refKF);
  const bx = inst.refBbox;
  // bg from ring
  const ringPix = [];
  const m = 3;
  const x0 = Math.max(0, bx.x - m | 0), y0 = Math.max(0, bx.y - m | 0);
  const x1 = Math.min(NW - 1, bx.x + bx.w + m | 0), y1 = Math.min(NH - 1, bx.y + bx.h + m | 0);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x >= bx.x && x <= bx.x + bx.w && y >= bx.y && y <= bx.y + bx.h) continue;
    ringPix.push(gray[y * NW + x]);
  }
  const bgGray = medianOf(ringPix);
  const inks = [[], [], []];
  let inkCount = 0, areaCount = 0;
  for (const L of letters) {
    const b = L.box; if (!b) continue;
    for (let y = Math.max(0, b.y); y < Math.min(NH, b.y + b.h); y++)
      for (let x = Math.max(0, b.x); x < Math.min(NW, b.x + b.w); x++) {
        areaCount++;
        if (Math.abs(gray[y * NW + x] - bgGray) > 45) {
          inkCount++;
          const p = (y * NW + x) * 3;
          inks[0].push(rgb[p]); inks[1].push(rgb[p + 1]); inks[2].push(rgb[p + 2]);
        }
      }
  }
  const colorRGB = inks[0].length ? [medianOf(inks[0]), medianOf(inks[1]), medianOf(inks[2])] : [34, 34, 34];
  const inkFrac = areaCount ? inkCount / areaCount : 0;
  const weightEstimate = inkFrac < 0.24 ? "light" : inkFrac < 0.40 ? "regular" : "bold";
  const cx = bx.x + bx.w / 2;
  const align = Math.abs(cx - NW / 2) < NW * 0.08 ? "center" : cx < NW / 2 ? "left" : "right";
  return {
    colorRGB, glyphHeightPx: +inst.medH.toFixed(1), weightEstimate,
    anchor: { x: Math.round(bx.x), y: Math.round(bx.y + bx.h) }, align,
    bgGray: Math.round(bgGray),
  };
}

async function stageEmit() {
  const { meta, cuts, nKF } = J("meta.json");
  const insts = J("instances.json");
  const activity = J("activity.json");
  const trkDir = path.join(WORK, "tracks");
  const events = [];
  let eid = 0;
  const nid = () => "e" + String(++eid).padStart(3, "0");
  // v3: oversized low-confidence OCR debris (e.g. giant faint "ve" @55s)
  const ghost = computeGhostInstances(insts);
  if (ghost.size) console.log("b3 ghost instances:", [...ghost].map(id => `#${id} ${JSON.stringify(insts[id].text)}`).join(", "));

  // ---- text-enter groups from birth tracks ----
  const enterGroups = [];
  for (const f of fs.readdirSync(trkDir).filter(f => f.startsWith("birth_"))) {
    const trk = JSON.parse(fs.readFileSync(path.join(trkDir, f), "utf8"));
    // per-letter analysis (ci = char index within its word, from glyph order)
    const ciCount = {};
    const letters = [], failed = [];
    for (const g of trk.glyphs) {
      const ci = ciCount[g.inst] = (ciCount[g.inst] ?? -1) + 1;
      if (ghost.has(g.inst)) continue; // v3 ghost gate
      const an = (g.dead || !g.pts) ? null : analyzeBirthTrack(g.pts);
      if (an) letters.push({ inst: g.inst, ch: g.ch, ci, box: g.box, ...an });
      else {
        const rc = insts[g.inst].refChars[ci];
        failed.push({ inst: g.inst, ch: g.ch, ci, box: g.box ?? (rc ? { x: Math.round(rc.x), y: Math.round(rc.y), w: Math.round(rc.w), h: Math.round(rc.h) } : null) });
      }
    }
    if (!letters.length) continue;
    const windowIsBounded = trk.t0 > 30 && !cuts.some(c => Math.abs(c - trk.t0) < 120);
    const clampedFrac = letters.filter(L => L.clamped).length / letters.length;
    const preexisting = windowIsBounded && clampedFrac > 0.7;
    // cluster letters by birth time — adaptive gap (typing cadence varies)
    letters.sort((a, b) => a.birth.t - b.birth.t);
    const gaps = [];
    for (let i = 1; i < letters.length; i++) gaps.push(letters[i].birth.t - letters[i - 1].birth.t);
    const nzGaps = gaps.filter(g => g > 5).sort((a, b) => a - b);
    const medGap = nzGaps.length ? nzGaps[nzGaps.length >> 1] : 0;
    const splitGap = Math.max(CLUSTER_GAP_MS, Math.min(700, medGap * 2.5));
    const clusters = [];
    for (const L of letters) {
      const cur = clusters[clusters.length - 1];
      if (cur && L.birth.t - cur[cur.length - 1].birth.t <= splitGap) cur.push(L);
      else clusters.push([L]);
    }
    // attach failed letters to the cluster holding most of their instance's letters;
    // v2: if the word has no tracked sibling, fall back to the spatially nearest
    // cluster — a letter present in the settled OCR is NEVER dropped.
    for (const F of failed) {
      let best = null, bestN = 0;
      for (const cl of clusters) {
        const n = cl.filter(l => l.inst === F.inst && !l.inferred).length;
        if (n > bestN) { bestN = n; best = cl; }
      }
      if (!best && clusters.length) {
        const rc = insts[F.inst].refChars[F.ci] ?? F.box ?? { x: 0, y: 0 };
        let bd = 1e9;
        for (const cl of clusters) {
          const tracked = cl.filter(l => !l.inferred);
          if (!tracked.length) continue;
          const d = Math.min(...tracked.map(l => Math.hypot(l.settle.x - rc.x, l.settle.y - rc.y)));
          if (d < bd) { bd = d; best = cl; }
        }
      }
      if (best) best.push({ ...F, inferred: true });
    }
    for (const cl of clusters) enterGroups.push({ letters: cl, batchKF: trk.kf, preexisting, clampedFrac });
  }
  enterGroups.sort((a, b) => Math.min(...a.letters.filter(l => !l.inferred).map(l => l.birth.t)) - Math.min(...b.letters.filter(l => !l.inferred).map(l => l.birth.t)));

  const instAlive = new Map();   // inst id -> {t0,t1} (drives demo-span detection)
  const instEmitted = new Map(); // v2: inst id -> letters emitted in enter events
  const enterMeta = [];          // v2: { ev, instIds } for visibleUntilMs resolution
  const exitMeta = [];           // v2: { ev, instIds }
  for (const grp of enterGroups) {
    const L = grp.letters.filter(l => !l.inferred);
    const all = grp.letters;
    const births = L.map(l => l.birth.t);
    const t0 = Math.min(...births);
    for (const l of all) {
      const inst = insts[l.inst];
      const a = instAlive.get(l.inst) ?? { t0: Infinity, t1: -Infinity };
      a.t0 = Math.min(a.t0, t0);
      a.t1 = Math.max(a.t1, kfTime(inst.lastKF) + KF_MS);
      instAlive.set(l.inst, a);
    }
    if (grp.preexisting) continue; // visible before window: not a real (re)entry
    // v2: authoritative settled geometry = settled-frame OCR char boxes, with
    // per-line baseline regularization (tracking noise never perturbs geometry)
    for (const l of all) {
      const inst = insts[l.inst];
      const sc = settledCharsOf(inst);
      let rc = sc && sc[l.ci];
      if (rc) l.sbox = { x: rc.x, y: rc.y, w: rc.w, h: rc.h };
      else {
        rc = inst.refChars[l.ci];
        const dx = inst.bbox.x - inst.refBbox.x, dy = inst.bbox.y - inst.refBbox.y;
        l.sbox = rc ? { x: rc.x + dx, y: rc.y + dy, w: rc.w, h: rc.h } : { ...l.box };
      }
    }
    regularizeBaselines(all); // sets l.box (int, baseline-snapped) + l.baseline
    // stagger analysis
    const mean = births.reduce((s, v) => s + v, 0) / births.length;
    const std = Math.sqrt(births.reduce((s, v) => s + (v - mean) ** 2, 0) / births.length);
    const byX = L.slice().sort((a, b) => a.settle.x - b.settle.x);
    let staggerMs = null, staggerOrder = null;
    if (std > SIMUL_STD_MS && L.length >= 3) {
      const xs = byX.map(l => l.settle.x), ts = byX.map(l => l.birth.t);
      const mx = xs.reduce((s, v) => s + v) / xs.length, mt = ts.reduce((s, v) => s + v) / ts.length;
      let cov = 0, vx = 0, vt = 0;
      for (let i = 0; i < xs.length; i++) { cov += (xs[i] - mx) * (ts[i] - mt); vx += (xs[i] - mx) ** 2; vt += (ts[i] - mt) ** 2; }
      const corr = cov / (Math.sqrt(vx * vt) + 1e-9);
      if (corr > 0.45) staggerOrder = "ltr";
      else if (corr < -0.45) staggerOrder = "rtl";
      const seq = staggerOrder === "rtl" ? byX.slice().reverse() : byX;
      const deltas = [];
      for (let i = 1; i < seq.length; i++) deltas.push(Math.abs(seq[i].birth.t - seq[i - 1].birth.t));
      staggerMs = deltas.length ? Math.round(deltas.reduce((s, v) => s + v) / deltas.length) : null;
      if (staggerMs != null && staggerMs < 8) { staggerMs = null; staggerOrder = null; } // measurement noise
    }
    // text assembly: per instance (reading order), chars in OCR order
    const instIds = [...new Set(all.map(l => l.inst))];
    const parts = instIds.map(id => {
      const ls = all.filter(l => l.inst === id).sort((a, b) => a.ci - b.ci);
      const bx = ls[0].box ?? { x: 0, y: 0 };
      return { id, x: insts[id].refBbox.x, y: insts[id].refBbox.y, text: ls.map(l => l.ch).join(""), n: ls.length };
    }).sort((a, b) => (Math.abs(a.y - b.y) > insts[instIds[0]].medH ? a.y - b.y : a.x - b.x));
    const text = parts.map(p => p.text).join(" ");
    // group motion (majority letter mode)
    const motions = L.map(l => classifyMotion(l.fwd, l.birth, l.settle));
    const pick = (key) => {
      const c = {};
      for (const m of motions) c[m[key]] = (c[m[key]] || 0) + 1;
      return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
    };
    const mode = pick("mode"), direction = pick("direction"), curve = pick("curve");
    const distancePx = +(motions.reduce((s, m) => s + m.distancePx, 0) / motions.length).toFixed(1);
    const durMed = motions.map(m => m.durMs).sort((a, b) => a - b)[motions.length >> 1];
    const mainInst = insts[instIds[0]];
    const rMean = L.reduce((s, l) => s + l.ref.r, 0) / L.length;
    let confidence = 0.5 * (mainInst.conf / 100) + 0.5 * rMean;
    if (grp.clampedFrac > 0.3 || durMed > 1200) confidence *= 0.6; // noisy window (zoom/scale animation)
    confidence = +Math.max(0.2, Math.min(0.97, confidence)).toFixed(2);
    const motion = { mode, direction, distancePx, curve };
    if (staggerMs != null) { motion.staggerMs = staggerMs; if (staggerOrder) motion.staggerOrder = staggerOrder; }
    // ---- v2 per-letter timing; trajectory re-anchored onto the settled OCR box ----
    const durs = L.map(l => l.settle.t - l.birth.t).sort((a, b) => a - b);
    const medDur = durs.length ? Math.max(33, durs[durs.length >> 1]) : 200;
    const medDx = Math.round(medianOf(L.map(l => l.birth.x - l.ref.x))); // group consensus fromOffset
    const medDy = Math.round(medianOf(L.map(l => l.birth.y - l.ref.y)));
    const medA0 = +medianOf(L.map(l => l.birth.alpha)).toFixed(3);
    const ordered = all.slice().sort((a, b) => (a.baseline - b.baseline) || (a.box.x - b.box.x));
    for (const l of ordered) if (!l.inferred) {
      l.T0 = Math.round(l.birth.t);
      l.T1 = Math.round(Math.max(l.settle.t, l.birth.t + 33));
      if (durMed > 1200) l.T1 = Math.min(l.T1, l.T0 + 600); // noisy window: cap
      // v3: poor-correlation back-tracking routinely "finds" births long
      // before the word exists — clamp to the instance's first OCR sighting
      if (l.ref && l.ref.r < 0.5) {
        const lo = kfTime(insts[l.inst].firstKF) - KF_MS / 2;
        if (l.T0 < lo) { l.T0 = Math.round(lo); l.T1 = Math.max(l.T1, l.T0 + 100); }
        l.T1 = Math.min(l.T1, l.T0 + 500); // unreliable settle detection: cap
      }
    }
    // v3: in a low-confidence group, letters "born" well before any OCR
    // evidence of that glyph latched onto other moving content; clamp them
    if (confidence <= 0.62) {
      for (const l of ordered) {
        if (l.inferred || !l.box) continue;
        const ev = earliestEvidenceKF(insts, l.ch, l.box, l.T0);
        if (ev === Infinity) continue;
        const lo = kfTime(ev) - KF_MS / 2;
        if (lo - l.T0 >= 0.5 * KF_MS) {
          l.T0 = Math.round(lo);
          l.T1 = Math.min(Math.max(l.T1, l.T0 + 100), l.T0 + 500);
        }
      }
    }
    // inferred letters: t0 interpolated from tracked stagger-order neighbors
    for (let i = 0; i < ordered.length; i++) {
      const l = ordered[i];
      if (!l.inferred) continue;
      let a = i - 1; while (a >= 0 && ordered[a].inferred) a--;
      let b = i + 1; while (b < ordered.length && ordered[b].inferred) b++;
      const Ln = a >= 0 ? ordered[a] : null, Rn = b < ordered.length ? ordered[b] : null;
      let T0;
      if (Ln && Rn) {
        const span = Rn.box.x - Ln.box.x;
        const f = span > 1 ? (l.box.x - Ln.box.x) / span : 0.5;
        T0 = Ln.T0 + f * (Rn.T0 - Ln.T0);
      } else T0 = Ln ? Ln.T0 : Rn ? Rn.T0 : t0;
      l.T0 = Math.round(T0);
      l.T1 = Math.round(T0 + medDur);
    }
    const letterObjs = ordered.map(l => {
      const dx = l.inferred ? medDx : Math.round(l.birth.x - l.ref.x);
      const dy = l.inferred ? medDy : Math.round(l.birth.y - l.ref.y);
      const o = {
        ch: l.ch, t0: l.T0, t1: l.T1,
        box: l.box,
        fontPx: l.box.h,
        baseline: l.baseline,
        from: { x: l.box.x + dx, y: l.box.y + dy, alpha: l.inferred ? medA0 : l.birth.alpha },
        to: { x: l.box.x, y: l.box.y, alpha: l.inferred ? 1 : +Math.min(1, l.settle.alpha).toFixed(3) },
        fromOffset: { dx, dy },
        _inst: l.inst, _ci: l.ci,
      };
      if (l.inferred) o.inferred = true;
      return o;
    });
    const style = groupStyle(mainInst, ordered);
    style.fontSizePx = Math.round(medianOf(ordered.map(l => l.box.h)));
    const ev = {
      id: nid(), type: "text-enter", text,
      t0: Math.min(...letterObjs.map(l => l.t0)),
      t1: Math.max(...letterObjs.map(l => l.t1)),
      from: { x: Math.min(...letterObjs.map(l => l.from.x)), y: Math.min(...letterObjs.map(l => l.from.y)) },
      to: { x: Math.min(...letterObjs.map(l => l.to.x)), y: Math.min(...letterObjs.map(l => l.to.y)) },
      motion,
      letters: letterObjs,
      style,
      confidence,
      simultaneous: staggerMs == null,
      birthStdMs: Math.round(std),
    };
    events.push(ev);
    enterMeta.push({ ev, instIds: new Set(instIds) });
    for (const l of all) instEmitted.set(l.inst, (instEmitted.get(l.inst) || 0) + 1);
  }

  // v2: instances whose settled-OCR letters made it into NO enter event
  // (untrackable or preexisting-only) — emit an inferred fallback so every
  // letter that exists in the settled OCR appears in the transcript.
  for (const inst of insts) {
    if (instEmitted.get(inst.id)) continue;
    if (ghost.has(inst.id)) continue; // v3 ghost gate
    const t0 = Math.max(0, kfTime(inst.firstKF) - 200);
    const t1 = kfTime(inst.firstKF) + 200;
    if (!instAlive.has(inst.id)) instAlive.set(inst.id, { t0, t1: kfTime(inst.lastKF) + KF_MS });
    const scF = settledCharsOf(inst) ?? inst.refChars;
    const ls = scF.map(c => ({ ch: c.ch, sbox: { x: c.x, y: c.y, w: c.w, h: c.h } }));
    regularizeBaselines(ls);
    ls.sort((a, b) => (a.baseline - b.baseline) || (a.box.x - b.box.x));
    const mid = Math.round((t0 + t1) / 2);
    const style = groupStyle(inst, ls);
    style.fontSizePx = Math.round(medianOf(ls.map(l => l.box.h)));
    const ev = {
      id: nid(), type: "text-enter", text: inst.text,
      t0, t1,
      from: { x: Math.round(inst.refBbox.x), y: Math.round(inst.refBbox.y) },
      to: { x: Math.round(inst.refBbox.x), y: Math.round(inst.refBbox.y) },
      motion: { mode: "fade", direction: "none", distancePx: 0, curve: "linear" },
      letters: ls.map((l, li) => ({
        ch: l.ch, t0: mid, t1, _inst: inst.id, _ci: li,
        box: l.box,
        fontPx: l.box.h,
        baseline: l.baseline,
        from: { x: l.box.x, y: l.box.y, alpha: 0 },
        to: { x: l.box.x, y: l.box.y, alpha: 1 },
        fromOffset: { dx: 0, dy: 0 },
        inferred: true,
      })),
      style,
      confidence: 0.4,
      simultaneous: true,
      untracked: true,
    };
    events.push(ev);
    enterMeta.push({ ev, instIds: new Set([inst.id]) });
    instEmitted.set(inst.id, inst.refChars.length);
  }

  // ---- text-exit from death tracks ----
  for (const f of fs.readdirSync(trkDir).filter(f => f.startsWith("death_"))) {
    const trk = JSON.parse(fs.readFileSync(path.join(trkDir, f), "utf8"));
    const letters = [];
    let aliveAtEnd = 0, total = 0;
    const ciCount = {};
    for (const g of trk.glyphs) {
      const ci = ciCount[g.inst] = (ciCount[g.inst] ?? -1) + 1;
      g.ci = ci;
      if (ghost.has(g.inst)) continue; // v3 ghost gate
      if (g.dead || !g.pts || !g.pts.length) continue;
      total++;
      const run = [];
      let deadStreak = 0;
      for (const p of g.pts) {
        if (p.alive) { run.push(p); deadStreak = 0; }
        else if (++deadStreak >= 2) break;
      }
      if (!run.length) continue;
      const death = run[run.length - 1];
      if (death.i >= g.pts[g.pts.length - 1].i - 1 && g.pts[g.pts.length - 1].alive) aliveAtEnd++;
      // movement start: last point still at settled pos with full alpha
      let start = run[0];
      for (let i = run.length - 1; i >= 0; i--) {
        const p = run[i];
        if (Math.hypot(p.x - run[0].x, p.y - run[0].y) <= 1.6 && p.alpha >= run[0].alpha * 0.85) { start = p; break; }
      }
      letters.push({ inst: g.inst, ch: g.ch, ci: g.ci, box: g.box, start, death, run });
    }
    if (!letters.length || total === 0) continue;
    if (aliveAtEnd / total > 0.6) continue; // never actually left (OCR flicker)
    // v3 exit repair: (a) death outliers = template drifting onto the next
    // scene's glyphs — clamp to the letter-death consensus; (b) the movement-
    // start walk-back often degrades to "right after settle", stretching a
    // ~150-300ms exit over seconds — snap starts to death minus consensus dur
    {
      const dts = letters.map(l => l.death.t).sort((p, q) => p - q);
      const cap = dts[dts.length >> 1] + 350;
      for (const l of letters) if (l.death.t > cap) {
        let best = l.run[l.run.length - 1];
        for (const pt of l.run) if (Math.abs(pt.t - cap) < Math.abs(best.t - cap)) best = pt;
        l.death = { ...best, t: Math.min(best.t, cap) };
      }
      const dursOK = letters.map(l => l.death.t - l.start.t).filter(d => d > 0 && d <= 450);
      const medDur = Math.min(250, Math.max(80, dursOK.length ? medianOf(dursOK) : 150));
      const dm = letters.map(l => l.death.t).sort((p, q) => p - q)[letters.length >> 1];
      const st = dm - medDur;
      for (const l of letters) {
        l.start = { ...l.run[0], t: Math.max(l.run[0].t, st) };
        if (l.death.t < l.start.t + 40) l.death = { ...l.death, t: l.start.t + 40 };
      }
    }
    const instIds = [...new Set(letters.map(l => l.inst))];
    const t0 = Math.min(...letters.map(l => l.start.t));
    const t1 = Math.max(...letters.map(l => l.death.t));
    for (const id of instIds) {
      const a = instAlive.get(id) ?? { t0: kfTime(insts[id].firstKF), t1 };
      a.t1 = Math.max(kfTime(insts[id].lastKF), Math.min(a.t1, t1));
      a.t1 = t1;
      instAlive.set(id, a);
    }
    const motions = letters.map(l => classifyMotion(l.run, l.start, l.death));
    const pick = (key) => {
      const c = {};
      for (const m of motions) c[m[key]] = (c[m[key]] || 0) + 1;
      return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
    };
    const nearCut = cuts.some(c => Math.abs(c - t1) < 120);
    const parts = instIds.map(id => {
      const ls = letters.filter(l => l.inst === id).sort((a, b) => a.ci - b.ci);
      return { x: insts[id].bbox.x, y: insts[id].bbox.y, text: ls.map(l => l.ch).join("") };
    }).sort((a, b) => (Math.abs(a.y - b.y) > 12 ? a.y - b.y : a.x - b.x));
    const ev = {
      id: nid(), type: "text-exit", text: parts.map(p => p.text).join(" "),
      t0: Math.round(t0), t1: Math.round(t1),
      from: { x: Math.round(Math.min(...letters.map(l => l.start.x))), y: Math.round(Math.min(...letters.map(l => l.start.y))) },
      to: { x: Math.round(Math.min(...letters.map(l => l.death.x))), y: Math.round(Math.min(...letters.map(l => l.death.y))) },
      motion: { mode: nearCut ? "pop" : pick("mode"), direction: pick("direction"), distancePx: +(motions.reduce((s, m) => s + m.distancePx, 0) / motions.length).toFixed(1), curve: pick("curve") },
      letters: letters.map(l => ({
        ch: l.ch, t0: Math.round(l.start.t), t1: Math.round(l.death.t), _inst: l.inst,
        ...(l.box ? { box: l.box, fontPx: l.box.h } : {}),
        from: { x: l.start.x, y: l.start.y, alpha: l.start.alpha },
        to: { x: l.death.x, y: l.death.y, alpha: 0 },
      })),
      confidence: nearCut ? 0.6 : 0.75,
      atCut: nearCut || undefined,
    };
    events.push(ev);
    exitMeta.push({ ev, instIds: new Set(instIds) });
  }

  // ---- v3 post passes: stale dedupe, fragment merge, conflict retiming ----
  postProcessEnterGroups(events, enterMeta, insts);
  dedupeExitEvents(events, exitMeta);

  // ---- cuts ----
  for (const c of cuts) events.push({ id: nid(), type: "cut", t0: c, t1: c, confidence: 0.95 });

  // ---- v2: every text-exit carries a style copy from its matching enter ----
  for (const xm of exitMeta) {
    let best = null;
    for (const em of enterMeta) {
      if (!em.ev.style) continue;
      let shares = false;
      for (const id of xm.instIds) if (em.instIds.has(id)) { shares = true; break; }
      if (!shares || em.ev.t0 > xm.ev.t0) continue;
      if (!best || em.ev.t0 > best.ev.t0) best = em;
    }
    if (best) xm.ev.style = { ...best.ev.style };
  }

  // ---- v2: visibleUntilMs — text never silently disappears ----
  // = start of the matching text-exit (shared instance, not earlier than the
  //   enter), else the next hard cut, else scene/video end.
  for (const em of enterMeta) {
    const lastT1 = Math.max(...em.ev.letters.map(l => l.t1 ?? l.t0));
    let v = null, matchedExit = false, matchedX = null;
    for (const xm of exitMeta) {
      if (xm.ev.t0 < em.ev.t0) continue;
      let shares = false;
      for (const id of xm.instIds) if (em.instIds.has(id)) { shares = true; break; }
      if (!shares) continue;
      if (v == null || xm.ev.t0 < v) { v = xm.ev.t0; matchedExit = true; matchedX = xm.ev; }
    }
    // v3: pad the matched exit with enter glyphs the death track missed, so
    // no glyph silently vanishes at visibleUntilMs while its siblings fade
    if (matchedX && matchedX.letters && matchedX.letters.length >= 3) {
      const xs = matchedX.letters;
      const mT0 = medianOf(xs.map(l => l.t0)), mT1 = medianOf(xs.map(l => l.t1));
      const mDx = medianOf(xs.map(l => l.to.x - l.from.x)), mDy = medianOf(xs.map(l => l.to.y - l.from.y));
      for (const L of em.ev.letters) {
        if (!L.box) continue;
        const cx = L.box.x + L.box.w / 2;
        const has = xs.some(x2 => x2.box && Math.abs((x2.box.x + x2.box.w / 2) - cx) < 0.7 * Math.max(x2.box.w, L.box.w) &&
          Math.abs((x2.box.y + x2.box.h) - (L.box.y + L.box.h)) < 0.8 * Math.max(x2.box.h, L.box.h));
        if (has) continue;
        xs.push({
          ch: L.ch, t0: Math.round(mT0), t1: Math.round(mT1), _inst: L._inst,
          box: { ...L.box }, fontPx: L.box.h,
          from: { x: L.box.x, y: L.box.y, alpha: 1 },
          to: { x: L.box.x + Math.round(mDx), y: L.box.y + Math.round(mDy), alpha: 0 },
          inferred: true,
        });
      }
      matchedX.t0 = Math.min(...xs.map(l => l.t0));
      matchedX.t1 = Math.max(...xs.map(l => l.t1));
      if (v != null) v = Math.min(v, matchedX.t0) === matchedX.t0 ? matchedX.t0 : v;
    }
    if (v == null) v = cuts.find(c => c > em.ev.t1) ?? null;
    if (v == null) v = meta.durationMs;
    // no matching exit: never overstay the OCR evidence (last sighting + grid)
    if (!matchedExit) {
      const lastSeen = Math.max(...[...em.instIds].map(id => kfTime(insts[id].lastKF))) + 2 * KF_MS;
      if (v > lastSeen) v = lastSeen;
    }
    em.ev.visibleUntilMs = Math.max(Math.round(v), lastT1 + 33);
  }

  // ---- v3: co-visible low-conf debris gate + settled-frame word recovery ----
  dropLowConfDebris(events, enterMeta);
  await recoverMissingWords(events, enterMeta);

  // ---- hero-alive timeline → product-demo + static-hold ----
  const heroAt = (t) => [...instAlive.values()].some(a => t >= a.t0 - 150 && t <= a.t1 + 150);
  const demoSpans = [];
  let cur = null;
  for (const s of activity) {
    const active = s.cov > ACT_COV * 2;
    if (active && !heroAt(s.t)) {
      if (cur && s.t - cur.t1 < 700) cur.t1 = s.t;
      else { cur = { t0: s.t - 67, t1: s.t }; demoSpans.push(cur); }
    }
  }
  for (const d of demoSpans.filter(d => d.t1 - d.t0 >= 400)) {
    events.push({ id: nid(), type: "product-demonstration", t0: Math.round(d.t0), t1: Math.round(d.t1), confidence: 0.7 });
  }
  // static holds
  let st = null;
  const holds = [];
  for (const s of activity) {
    if (s.cov < 0.012) { if (!st) st = { t0: s.t - 67, t1: s.t }; else st.t1 = s.t; }
    else { if (st && st.t1 - st.t0 >= 1500) holds.push(st); st = null; }
  }
  if (st && st.t1 - st.t0 >= 1500) holds.push(st);
  const demoEvents = events.filter(e => e.type === "product-demonstration");
  for (const h of holds) {
    if (demoEvents.some(d => h.t0 < d.t1 && h.t1 > d.t0 && Math.min(h.t1, d.t1) - Math.max(h.t0, d.t0) > (h.t1 - h.t0) * 0.5)) continue;
    events.push({ id: nid(), type: "static-hold", t0: Math.round(h.t0), t1: Math.round(h.t1), confidence: 0.85 });
  }

  for (const e of events) if (e.letters) for (const l of e.letters) { delete l._inst; delete l._ci; }
  events.sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
  events.forEach((e, i) => e.id = "e" + String(i + 1).padStart(3, "0"));
  const transcript = {
    variant: "B3-letter",
    schemaVersion: 2,
    _schema: {
      coordinateSpace: "pixels in a width x height frame (see video block), origin top-left, x right, y down; all times are ms from video start",
      eventTypes: ["text-enter", "text-exit", "cut", "product-demonstration", "static-hold"],
      "text-enter": {
        "letters[]": "one entry per glyph, sorted top line first then left-to-right; render every glyph independently",
        "letters[].box": "AUTHORITATIVE settled geometry from OCR of the settled frame. x,y = top-left of the glyph ink; w = ink width. Box bottoms are baseline-regularized: each line's baseline is least-squares fitted through baseline-sitting glyph bottoms and box.y+box.h is snapped to it, EXCEPT glyphs that genuinely deviate >15% of glyph height (descenders g j p q y, apostrophes, superscripts) which keep their true ink extent. `letters[].baseline` = the shared fitted line baseline (y px) for every glyph on that line.",
        "letters[].fontPx": "settled box height (== box.h) so per-letter sizing is unambiguous; for overall font size prefer the group's style.fontSizePx",
        "letters[].to": "settled position: to.x==box.x and to.y==box.y ALWAYS, plus settled alpha. Place the glyph's top-left here.",
        "letters[].from": "position+alpha at first appearance, measured by template tracking; from = to + fromOffset",
        "letters[].fromOffset": "{dx,dy} = from minus settled position. Apply as a RELATIVE offset from box.x/box.y; never treat 'from' as authoritative geometry",
        "letters[].t0_t1": "t0 = ms glyph first appears; t1 = ms it reaches the settled position at full alpha. Animate from->to over [t0,t1] with motion.curve, then HOLD at box until visibleUntilMs",
        "letters[].recovered": "true = glyph was invisible to the main OCR pass and recovered by targeted re-OCR of the settled frame (geometry real, timing coarse)",
      "letters[].inferred": "true = tracking failed for this glyph; box is real (settled OCR) but t0/t1 are interpolated from neighboring letters and motion is the group consensus. Render it exactly like its siblings",
        visibleUntilMs: "the text stays on screen at its settled position until this ms (start of its text-exit; if no exit was observed: the next hard cut or the last confirmed OCR sighting, whichever is earlier, else video end). NEVER remove or fade text before this time",
        "style.fontSizePx": "median letter box.h of the group (~cap/ascender height in px); a letter's own optical height is its box.h",
        "style.other": "colorRGB = ink color; bgGray = local background luma; weightEstimate; anchor = left end of baseline; align = horizontal alignment in frame",
        motion: "group consensus: mode (fade|slide|slide+fade|pop), direction of entry movement, distancePx, curve easing, optional staggerMs/staggerOrder (per-letter cascade)",
        untracked: "true = animation was unobserved; timings coarse, geometry still exact"
      },
      "text-exit": "letters leave their settled position at t0 and are fully gone at t1 (per-letter from/to with to.alpha=0, plus box/fontPx of the settled glyph where known); `style` is a copy of the matching text-enter's style; atCut=true means removal coincides with a hard cut",
      rebuildRecipe: "for each text-enter letter: at t0 draw ch at from (alpha from.alpha), animate to box position/full alpha by t1, hold until the group's visibleUntilMs, then apply the matching text-exit animation if one exists"
    },
    video: { width: meta.width, height: meta.height, fps: +meta.fps.toFixed(3), durationMs: meta.durationMs },
    events,
  };
  fs.writeFileSync(path.join(OUTDIR, "transcript.json"), JSON.stringify(transcript, null, 1));
  console.log("events:", events.length, JSON.stringify(events.reduce((m, e) => (m[e.type] = (m[e.type] || 0) + 1, m), {})));
  makeSrt(transcript);
}

// ── SRT + captions ──────────────────────────────────────────────────────────
function srtTime(ms) {
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, x = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(x).padStart(3, "0")}`;
}
function describe(e) {
  const dirWord = (d, out) => ({
    up: out ? "upward" : "rising", down: out ? "downward" : "dropping",
    left: out ? "to the left" : "from the right", right: out ? "to the right" : "from the left",
  })[d] || d;
  if (e.type === "cut") return "[cut] hard cut";
  if (e.type === "product-demonstration") return "[product demo] embedded app footage (not transcribed)";
  if (e.type === "static-hold") return "[hold] static frame";
  const m = e.motion || {};
  const dur = e.t1 - e.t0;
  if (e.type === "text-enter") {
    let how;
    const inPlace = m.distancePx < 8 || m.direction === "none";
    const move = inPlace ? "" : `, each ${m.direction === "up" ? "rising" : m.direction === "down" ? "dropping" : "sliding " + dirWord(m.direction)} ${Math.round(m.distancePx)}px`;
    if (m.staggerMs != null) {
      const ord = m.staggerOrder === "ltr" ? "left-to-right " : m.staggerOrder === "rtl" ? "right-to-left " : "";
      how = `letters cascade in ${ord}~${m.staggerMs}ms apart (${m.mode})${move}, ${m.curve}`;
    } else if (m.mode === "pop") how = `pops in`;
    else if (m.mode === "fade" || inPlace) how = `fades in as one block, ${m.curve}, ${dur}ms`;
    else how = `slides in ${dirWord(m.direction)} ${Math.round(m.distancePx)}px (${m.mode}), ${m.curve}, ${dur}ms`;
    return `[text "${e.text}"] ${how}`;
  }
  if (e.type === "text-exit") {
    if (e.atCut) return `[text "${e.text}"] leaves at hard cut`;
    const how = (m.mode === "fade" || m.distancePx < 8 || m.direction === "none") && m.mode !== "pop" ? `fades out (${dur}ms)` : m.mode === "pop" ? "pops out" : `slides out ${dirWord(m.direction, true)} ${Math.round(m.distancePx)}px (${m.mode}), ${m.curve}`;
    return `[text "${e.text}"] ${how}`;
  }
  return "";
}
function makeSrt(transcript) {
  const cues = [];
  for (const e of transcript.events) {
    if (e.type === "static-hold" && e.t1 - e.t0 < 2000) continue;
    cues.push({ t0: e.t0, t1: Math.max(e.t1, e.t0 + 1200), lines: [describe(e)] });
  }
  cues.sort((a, b) => a.t0 - b.t0);
  // merge overlapping cues (max 3 lines)
  const merged = [];
  for (const c of cues) {
    const last = merged[merged.length - 1];
    if (last && c.t0 < last.t1 - 150 && last.lines.length < 3) {
      last.lines.push(...c.lines);
      last.t1 = Math.max(last.t1, c.t1);
    } else merged.push(c);
  }
  // avoid overlap of consecutive cues
  for (let i = 1; i < merged.length; i++)
    if (merged[i].t0 < merged[i - 1].t1) merged[i - 1].t1 = Math.max(merged[i - 1].t0 + 600, merged[i].t0);
  let out = "";
  merged.forEach((c, i) => {
    out += `${i + 1}\n${srtTime(c.t0)} --> ${srtTime(c.t1)}\n${c.lines.join("\n")}\n\n`;
  });
  fs.writeFileSync(path.join(OUTDIR, "captions.srt"), out);
  W("cues.json", merged);
  console.log("cues:", merged.length);
}

// ── STAGE: render ───────────────────────────────────────────────────────────
function findFont() {
  for (const f of [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  ]) if (fs.existsSync(f)) return f;
  const r = spawnSync("fc-list", [], { encoding: "utf8" });
  const m = (r.stdout || "").split("\n").find(l => /\.ttf/.test(l));
  return m ? m.split(":")[0] : null;
}
async function stageRender() {
  const cues = J("cues.json");
  const font = findFont();
  const capDir = path.join(WORK, "caps");
  fs.mkdirSync(capDir, { recursive: true });
  const filters = [];
  cues.forEach((c, i) => {
    const tf = path.join(capDir, `c${i}.txt`);
    fs.writeFileSync(tf, c.lines.join("\n"));
    filters.push(
      `drawtext=fontfile=${font}:textfile=${tf}:x=(w-text_w)/2:y=h-14-text_h:fontsize=15:line_spacing=4:fontcolor=0x1b1b1b:box=1:boxcolor=0xFFF6E8@0.88:boxborderw=6:enable='between(t,${(c.t0 / 1000).toFixed(3)},${(c.t1 / 1000).toFixed(3)})'`
    );
  });
  const script = path.join(WORK, "filters.txt");
  fs.writeFileSync(script, "[0:v]" + filters.join(",\n") + "[v]");
  ff(["-i", VIDEO, "-filter_complex_script", script, "-map", "[v]", "-map", "0:a?",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "copy",
    "-y", path.join(OUTDIR, "annotated.mp4")]);
  console.log("annotated.mp4 written");
}

// ── dispatch ─────────────────────────────────────────────────────────────────
const stage = argv[0];
const nums = argv.slice(1).filter(x => /^\d+$/.test(x)).map(Number);
const stages = {
  keyframes: stageKeyframes,
  ocr: () => stageOcr(nums[0], nums[1]),
  states: stageStates,
  track: () => stageTrack(nums[0], nums[1]),
  emit: stageEmit,
  render: stageRender,
  all: async () => { await stageKeyframes(); await stageOcr(); await stageStates(); await stageTrack(); await stageEmit(); await stageRender(); },
};
if (!stages[stage]) {
  console.error("usage: transcribe-b.mjs <keyframes|ocr|states|track|emit|render|all> [from to]");
  process.exit(1);
}
await stages[stage]();
// v2 (B2-letter) pipeline end
