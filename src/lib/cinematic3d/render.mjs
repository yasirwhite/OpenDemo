// Cinematic 3D renderer.
//
//   node src/lib/cinematic3d/render.mjs <config.json> [workers]
//
// Reads a cinematic3d config, renders every frame on the GPU via headless
// Chromium, and encodes an MP4. Deterministic: each frame comes from
// prepareFrame(t) + renderAtTime(t), never from a playback clock, so the output
// is identical regardless of worker count or machine speed.
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { PRESET_NATIVE_MS, buildCuts } from "./presets/index.js";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve, relative, sep } from "node:path";

const configPath = process.argv[2];
if (!configPath) {
  console.error("usage: node render.mjs <config.json> [workers]");
  process.exit(1);
}
const WORKERS = Math.max(1, parseInt(process.argv[3] || "2"));
const config = JSON.parse(readFileSync(configPath, "utf8"));

const REPO = resolve(import.meta.dirname, "..", "..", "..");
const toServed = (p) => "/" + relative(REPO, resolve(dirname(configPath), p)).split(sep).join("/");

const W = config.width ?? 1920, H = config.height ?? 1080, FPS = config.fps ?? 30;

// Quality knobs. Defaults are the fast-preview settings; the example configs raise
// them. `supersample` renders at N x the output size and lets ffmpeg downsample with
// lanczos — real antialiasing on UI text, which the GPU's MSAA does not touch because
// the text is inside a texture, not on a polygon edge.
const SS = Math.max(1, Math.min(3, config.supersample ?? 1));
const CRF = config.crf ?? 17;
const MIN_CUT_S = 0.6;   // below this a cut stops registering as a shot
// PNG intermediates are opt-in, not automatic with supersampling: a 4K PNG is ~8 MB,
// so a 60fps minute would be ~30 GB of temp files. At ss>=2 the lanczos downsample
// averages JPEG noise away, so q=0.98 JPEG is visually free and 5x smaller.
const LOSSLESS_FRAMES = config.losslessFrames ?? false;
const JPEG_Q = SS > 1 ? 0.98 : 0.95;
const EXT = LOSSLESS_FRAMES ? "png" : "jpg";
const out = resolve(dirname(configPath), config.output ?? "cinematic-3d.mp4");
const tmp = join(dirname(out), ".cinematic3d-frames");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

// the page fetches the config itself, so hand it a served copy with paths rewritten
const servedConfig = { ...config };
if (config.source) servedConfig.source = toServed(config.source);
const servedConfigPath = join(dirname(out), ".cinematic3d-config.json");
writeFileSync(servedConfigPath, JSON.stringify(servedConfig));

const { server, port } = await serve(8760);
const url =
  `http://127.0.0.1:${port}/src/lib/cinematic3d/scene.html` +
  `?w=${W}&h=${H}&ss=${SS}&config=${encodeURIComponent(toServed(servedConfigPath))}`;

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist",
         "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
});

async function makePage(verbose) {
  const page = await browser.newPage({ viewport: { width: Math.ceil(W / 2), height: Math.ceil(H / 2) } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  if (verbose) page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text()); });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction("window.__ready === true", { timeout: 120000 });
  return page;
}

const probe = await makePage(true);
const DURATION = await probe.evaluate("window.DURATION");
const total = Math.round(DURATION * FPS);
console.log(
  `cinematic3d: ${DURATION.toFixed(2)}s  ${W}x${H} @ ${FPS}fps  = ${total} frames` +
  `  [ss ${SS}x -> renders ${W * SS}x${H * SS}, ${EXT}${LOSSLESS_FRAMES ? "" : " q" + JPEG_Q} frames, crf ${CRF}]`
);
if (config.source) console.log(`  source: ${config.source}`);

// Playback rate per scene. A film that runs at 1x and then drops to 0.6x for the
// last shot reads as broken even when every shot is individually fine — the
// change of speed is what the eye catches, not the speed. Report it, and say so
// when the scenes disagree.
const rates = [];
const retimed = [];
for (const s of config.scenes ?? []) {
  const dur = s.duration ?? 6;
  const clipLen = s.clip && s.clip.to != null ? s.clip.to - s.clip.from : null;
  const rate = s.clip?.fit === "loop" ? 1 : clipLen ? clipLen / dur : null;
  if (rate != null) rates.push(rate);

  // Multi-cut presets rescale their sub-cuts proportionally, so a short scene can
  // squeeze one down to a handful of frames — that reads as a jump, not a cut.
  // Single-cut presets have nothing to squeeze and retime perfectly happily, so
  // warn on the actual symptom (a too-short cut) rather than on deviation itself.
  const native = (PRESET_NATIVE_MS[s.preset] ?? 0) / 1000;
  let shortest = null;
  try {
    const cuts = buildCuts({ scenes: [{ ...s, duration: dur }] }).cuts;
    if (cuts.length > 1) shortest = Math.min(...cuts.map((c) => c.durationMs / 1000));
  } catch { /* buildCuts already threw for the real render; nothing to add here */ }
  if (shortest != null && shortest < MIN_CUT_S) retimed.push({ preset: s.preset, dur, native, shortest });

  console.log(
    `  - ${s.preset.padEnd(20)} ${String(dur).padStart(5)}s` +
    (s.clip ? `  clip ${s.clip.from}-${s.clip.to ?? "end"}s` : "") +
    (rate != null ? `  ${rate.toFixed(2)}x${s.clip?.fit === "loop" ? " (loop)" : ""}` : "")
  );
}
for (const r of retimed) {
  console.log(
    `\n  ! ${r.preset} at ${r.dur}s leaves its shortest cut at ${r.shortest.toFixed(2)}s ` +
    `(${Math.round(r.shortest * FPS)} frames).\n` +
    `    Under ~${MIN_CUT_S}s a cut reads as a jump rather than a shot — there is not enough\n` +
    `    time to register what changed. This preset is tuned at ${r.native}s; give it that,\n` +
    `    or use a single-cut preset for a scene this short.`
  );
}
if (retimed.length) console.log("");
if (rates.length > 1) {
  const lo = Math.min(...rates), hi = Math.max(...rates);
  if (hi / lo > 1.15) {
    console.log(
      `\n  ! scenes play at different speeds (${lo.toFixed(2)}x - ${hi.toFixed(2)}x).\n` +
      `    A speed change mid-film is more noticeable than the speed itself. Either set\n` +
      `    every scene's duration equal to its clip length, or scale them all by the same\n` +
      `    factor. Use "fit": "loop" for a scene that must outlast its footage.\n`
    );
  }
}

// A WebGL context that is lost, or starved of memory at high supersample, renders
// PURE BLACK without raising anything: no page error, no exception, correct frame
// count. Probe one frame mid-film and refuse to spend minutes encoding a black film.
{
  const t = DURATION / 2;
  const stats = await probe.evaluate(async (tt) => {
    if (window.prepareFrame) await window.prepareFrame(tt);
    window.renderAtTime(tt);
    const c = document.querySelector("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    const s = document.createElement("canvas");
    s.width = 64; s.height = 36;
    const g = s.getContext("2d");
    g.drawImage(c, 0, 0, s.width, s.height);
    const d = g.getImageData(0, 0, s.width, s.height).data;
    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return { min, max, lost: gl ? gl.isContextLost() : null };
  }, t);
  if (stats.lost || stats.max - stats.min < 4) {
    await browser.close();
    server.close();
    throw new Error(
      `cinematic3d: the probe frame at ${t.toFixed(2)}s is a flat colour ` +
      `(luma ${stats.min}-${stats.max}${stats.lost ? ", context LOST" : ""}).
` +
      `  The GPU context is not producing an image. At supersample ${SS} this renders ` +
      `${W * SS}x${H * SS}
  per worker, which needs a lot of memory — try supersample 1, ` +
      `fewer workers, or free some up.`
    );
  }
}

const pages = [probe];
for (let i = 1; i < WORKERS; i++) pages.push(await makePage(false));

let next = 0, done = 0;
const t0 = Date.now();
await Promise.all(pages.map(async (page) => {
  for (;;) {
    const f = next++;
    if (f >= total) break;
    const t = f / FPS;
    const du = await page.evaluate(async ([tt, lossless, q]) => {
      if (window.prepareFrame) await window.prepareFrame(tt);   // seek before drawing
      window.renderAtTime(tt);
      const c = document.querySelector("canvas");
      return lossless ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", q);
    }, [t, LOSSLESS_FRAMES, JPEG_Q]);
    writeFileSync(join(tmp, `f_${String(f).padStart(5, "0")}.${EXT}`), Buffer.from(du.split(",")[1], "base64"));
    done++;
    if (done % 60 === 0) {
      const rate = done / ((Date.now() - t0) / 1000);
      console.log(`  ${done}/${total}  ${rate.toFixed(1)} fps  ETA ${((total - done) / rate).toFixed(0)}s`);
    }
  }
}));
await browser.close();
server.close();

execFileSync("ffmpeg", [
  "-y", "-v", "error", "-framerate", String(FPS),
  "-i", join(tmp, `f_%05d.${EXT}`),
  // downsample the supersampled frames here rather than in the browser — lanczos
  // beats the GPU's box filter, and it is the step that sharpens UI text
  ...(SS > 1 ? ["-vf", `scale=${W}:${H}:flags=lanczos`] : []),
  "-c:v", "libx264", "-preset", "slow", "-crf", String(CRF),
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
], { stdio: "inherit" });

rmSync(tmp, { recursive: true, force: true });
rmSync(servedConfigPath, { force: true });
console.log(`\ncinematic3d -> ${out}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
