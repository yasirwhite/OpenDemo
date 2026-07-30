// Solve camera DISTANCE for a target subject width, so the cut list can be
// authored in the same units the reference was measured in (subject width % of
// frame). Binary search over distance, measuring the rendered frame each step.
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { readFileSync, writeFileSync } from "node:fs";

const targets = JSON.parse(readFileSync(process.argv[2], "utf8"));
const outPath = process.argv[3];

const { server, port } = await serve(8742);
const browser = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 480, height: 300 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
await page.goto(`http://127.0.0.1:${port}/temp_3d_build/kite-cuts/scene3.html?w=1280&h=720`);
await page.waitForFunction("window.__ready === true", { timeout: 120000 });

const results = {};
for (const t of targets) {
  let lo = t.lo ?? 12, hi = t.hi ?? 320, best = null;
  for (let it = 0; it < 22; it++) {
    const mid = (lo + hi) / 2;
    const cfg = { ...t.cfg, cam: { ...t.cfg.cam, dist: mid } };
    const m = await page.evaluate((c) => { window.renderCustom(c); return window.measureFrame(); }, cfg);
    if (!best || Math.abs(m.w - t.targetW) < Math.abs(best.m.w - t.targetW)) best = { dist: mid, m };
    if (m.w === 0) { hi = mid; continue; }         // subject off-frame -> pull in
    if (m.w > t.targetW) lo = mid; else hi = mid;  // wider than wanted -> move back
    if (Math.abs(m.w - t.targetW) < 0.35) break;
  }
  results[t.name] = { dist: +best.dist.toFixed(1), got: best.m, want: t.targetW };
  console.log(
    `${t.name.padEnd(22)} want w=${String(t.targetW).padStart(5)}  got w=${String(best.m.w).padStart(6)} ` +
      `h=${String(best.m.h).padStart(6)} cx=${String(best.m.cx).padStart(6)}  dist=${best.dist.toFixed(1)}`
  );
}
writeFileSync(outPath, JSON.stringify(results, null, 1));
console.log("\nwrote", outPath);
await browser.close();
server.close();
