// Render each meaningful scene to its own MP4 in clips/.
// Each clip restarts at t=0 in its own timeline, so it can be reviewed, retimed
// or re-rendered on its own without touching the rest of the film.
//
//   node render-clips.mjs [workers] [sceneId ...]
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { SCENES } from "./scenes.js";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const WORKERS = Math.max(1, parseInt(process.argv[2] || "2"));
const only = process.argv.slice(3);
const FPS = 30, W = 1920, H = 1080;
const here = import.meta.dirname;
const clipsDir = join(here, "clips");
mkdirSync(clipsDir, { recursive: true });

const { server, port } = await serve(8735);
const url = `http://127.0.0.1:${port}/temp_3d_build/kite-cuts/scene3.html?w=${W}&h=${H}` +
  (process.env.DEBUG_MAC === "1" ? "&debugmac=1" : "");
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
async function makePage() {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction("window.__ready === true", { timeout: 120000 });
  return page;
}
const pages = [];
for (let i = 0; i < WORKERS; i++) pages.push(await makePage());

const list = only.length ? SCENES.filter((s) => only.includes(s.id)) : SCENES;
const manifest = [];

for (const sc of list) {
  const tmp = join(clipsDir, `_tmp_${sc.id}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const total = Math.round((sc.t1 - sc.t0) * FPS);
  let next = 0, done = 0;
  const t0 = Date.now();
  await Promise.all(
    pages.map(async (page) => {
      for (;;) {
        const f = next++;
        if (f >= total) break;
        const t = sc.t0 + f / FPS;
        const du = await page.evaluate((tt) => {
          window.renderAtTime(tt);
          return document.querySelector("canvas").toDataURL("image/jpeg", 0.95);
        }, t);
        writeFileSync(join(tmp, `f_${String(f).padStart(4, "0")}.jpg`), Buffer.from(du.split(",")[1], "base64"));
        done++;
      }
    })
  );

  const out = join(clipsDir, `${sc.id}.mp4`);
  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-framerate", String(FPS),
    "-i", join(tmp, "f_%04d.jpg"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "17",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
  ]);
  rmSync(tmp, { recursive: true, force: true });
  const dur = +((sc.t1 - sc.t0).toFixed(2));
  manifest.push({ id: sc.id, title: sc.title, t0: sc.t0, t1: sc.t1, duration: dur, frames: total, file: `${sc.id}.mp4`, slots: sc.slots });
  console.log(`${sc.id.padEnd(22)} ${String(dur).padStart(5)}s  ${String(total).padStart(4)} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

writeFileSync(join(clipsDir, "manifest.json"), JSON.stringify({ fps: FPS, width: W, height: H, clips: manifest }, null, 1));
writeFileSync(
  join(clipsDir, "concat.txt"),
  SCENES.map((s) => `file '${s.id}.mp4'`).join("\n") + "\n"
);
console.log(`\nwrote ${manifest.length} clips + manifest.json + concat.txt -> ${clipsDir}`);
await browser.close();
server.close();
