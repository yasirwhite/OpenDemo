import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.setContent("<canvas id=c width=64 height=64></canvas>");
const info = await page.evaluate(() => {
  const gl = document.getElementById("c").getContext("webgl2");
  if (!gl) return { ok: false, why: "no webgl2" };
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    ok: true,
    vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
