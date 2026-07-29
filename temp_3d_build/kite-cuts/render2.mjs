// GPU frame grabber for scene2.html.
//   node render2.mjs sample            -> sample/ : start+mid+end of every cut
//   node render2.mjs full [workers]    -> frames2/: every frame at 30 fps
// Deterministic: each frame is produced by window.renderAtTime(t), no rAF clock.
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const mode = process.argv[2] || "sample";
const WORKERS = Math.max(1, parseInt(process.argv[3] || "2"));
const RESUME = process.argv[4] === "resume";
const FPS = 30;
const W = +(process.env.RW || 1920), H = +(process.env.RH || 1080);
const SS = +(process.env.RSS || 1);

const here = import.meta.dirname;
const outDir = join(here, mode === "full" ? "frames2" : "sample");
if (existsSync(outDir) && !RESUME) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const { server, port } = await serve(8734);
const url = `http://127.0.0.1:${port}/temp_3d_build/kite-cuts/scene2.html?w=${W}&h=${H}&ss=${SS}`;

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage", "--force-device-scale-factor=1",
  ],
});

async function makePage(quiet = false) {
  const page = await browser.newPage({ viewport: { width: Math.ceil(W / 2), height: Math.ceil(H / 2) } });
  if (!quiet) {
    page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
    page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text()); });
  }
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction("window.__ready === true", { timeout: 120000 });
  return page;
}

const probe = await makePage();
const DURATION = await probe.evaluate("window.DURATION");
const CUT_TABLE = await probe.evaluate("window.CUT_TABLE");
console.log(`DURATION=${DURATION}s  ${W}x${H}  ss=${SS}  mode=${mode}`);

const grab = async (page, t, quality) =>
  page.evaluate(
    ([tt, q]) => {
      window.renderAtTime(tt);
      const c = document.querySelector("canvas");
      return q ? c.toDataURL("image/jpeg", q) : c.toDataURL("image/png");
    },
    [t, quality]
  );

if (mode === "sample") {
  let i = 0;
  const shots = [];
  for (const c of CUT_TABLE) {
    for (const [tag, f] of [["a", 0.06], ["b", 0.5], ["c", 0.94]]) {
      shots.push({ t: c.start + c.dur * f, name: `${String(i).padStart(2, "0")}_${c.name}_${tag}` });
    }
    i++;
  }
  for (const s of shots) {
    const du = await grab(probe, s.t, 0);
    writeFileSync(join(outDir, `${s.name}.png`), Buffer.from(du.split(",")[1], "base64"));
  }
  console.log(`sample frames: ${shots.length} -> ${outDir}`);
  console.log(CUT_TABLE.map((c) => `  ${c.start.toFixed(2).padStart(6)}  ${c.dur.toFixed(2)}s  ${c.name} [${c.motion}]`).join("\n"));
  await browser.close(); server.close(); process.exit(0);
}

const total = Math.round(DURATION * FPS);
const pages = [probe];
for (let k = 1; k < WORKERS; k++) pages.push(await makePage(true));

let next = 0, done = 0;
const started = Date.now();
async function worker(page) {
  for (;;) {
    const f = next++;
    if (f >= total) break;
    const fp = join(outDir, `f_${String(f).padStart(4, "0")}.jpg`);
    if (RESUME && existsSync(fp)) { done++; continue; }
    const du = await grab(page, f / FPS, 0.95);
    writeFileSync(fp, Buffer.from(du.split(",")[1], "base64"));
    done++;
    if (done % 30 === 0) {
      const rate = done / ((Date.now() - started) / 1000);
      console.log(`  ${done}/${total}  ${rate.toFixed(1)} fps  ETA ${((total - done) / rate).toFixed(0)}s`);
    }
  }
}
await Promise.all(pages.map(worker));
console.log(`full frames: ${done}/${total} in ${((Date.now() - started) / 1000).toFixed(0)}s -> ${outDir}`);
await browser.close();
server.close();
