// Compose a labelled MINE | REFERENCE comparison grid.
// Usage: node compare.mjs <out.png> <pairsJson>
//   pairsJson: [{label, mine:"/served/path.png", ref:"/served/path.png"}, ...]
import { chromium } from "playwright";
import { serve } from "../serve.mjs";
import { writeFileSync } from "node:fs";

const out = process.argv[2];
const pairs = JSON.parse(process.argv[3]);
const CW = 520, CH = 293, LAB = 26, PAD = 6;

const { server, port } = await serve(8736);
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
await page.goto(`http://127.0.0.1:${port}/src/lib/cinematic3d/tools/compare-shell.html`);

const dataUrl = await page.evaluate(
  async ({ pairs, CW, CH, LAB, PAD }) => {
    const load = (src) =>
      new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => rej(new Error("load failed: " + src));
        im.src = src;
      });
    const rows = pairs.length;
    const c = document.createElement("canvas");
    c.width = PAD + (CW + PAD) * 2;
    c.height = PAD + (CH + LAB + PAD) * rows;
    const g = c.getContext("2d");
    g.fillStyle = "#101014";
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < rows; i++) {
      const p = pairs[i];
      const y = PAD + i * (CH + LAB + PAD);
      const cols = [["MINE — " + p.label, p.mine], ["REFERENCE — " + p.label, p.ref]];
      for (let k = 0; k < 2; k++) {
        const x = PAD + k * (CW + PAD);
        g.fillStyle = k === 0 ? "#2b6cb0" : "#3f4451";
        g.fillRect(x, y, CW, LAB);
        g.fillStyle = "#fff";
        g.font = "600 14px system-ui,sans-serif";
        g.fillText(cols[k][0], x + 8, y + 18);
        try {
          const im = await load(cols[k][1]);
          g.drawImage(im, x, y + LAB, CW, CH);
        } catch (e) {
          g.fillStyle = "#7a1f1f";
          g.fillRect(x, y + LAB, CW, CH);
          g.fillStyle = "#fff";
          g.fillText(String(e.message).slice(0, 70), x + 8, y + LAB + 24);
        }
      }
    }
    return c.toDataURL("image/png");
  },
  { pairs, CW, CH, LAB, PAD }
);

writeFileSync(out, Buffer.from(dataUrl.split(",")[1], "base64"));
console.log("wrote", out, `(${pairs.length} pairs)`);
await browser.close();
server.close();
