import { chromium } from "playwright";
import { serve } from "./serve.mjs";

const model = process.argv[2];
const topN = Number(process.argv[3] || 14);
const { server, port } = await serve(8733);

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => console.log("CONSOLE:", m.type(), m.text()));
page.on("requestfailed", (r) => console.log("REQFAIL:", r.url().slice(0, 120), r.failure()?.errorText));
await page.goto(`http://127.0.0.1:${port}/temp_3d_build/kite-cuts/probe-model.html?model=${encodeURIComponent(model)}`);
await page.waitForFunction("window.__ready === true", { timeout: 60000 });
const r = await page.evaluate("window.__result");

if (r.error) console.log("ERROR:", r.error);
else {
  console.log("whole size :", r.whole.size.join(" x "), " min", r.whole.min.join(","), " max", r.whole.max.join(","));
  console.log("meshes     :", r.count, " (top", topN, "by face area)");
  for (const p of r.parts.slice(0, topN)) {
    console.log(
      `  ${p.name.padEnd(20)} size=${p.size.join("x").padEnd(24)} c=${p.center.join(",").padEnd(22)}` +
        ` area=${String(p.faceArea).padEnd(9)} flat=${String(p.flat).padEnd(8)} v=${String(p.verts).padEnd(7)}` +
        ` col=${p.color} m=${p.metal} r=${p.rough}${p.hasMap ? " MAP" : ""}${p.emissive && p.emissive !== "000000" ? " EMIS:" + p.emissive : ""}`
    );
  }
}
await browser.close();
server.close();
