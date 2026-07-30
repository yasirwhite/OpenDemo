// Edge-based zoom map.
//
// The luminance mask used earlier conflates CONTENT brightness with geometry —
// a locked camera reads as a huge move the moment a screen dims. Edges don't
// care how bright the content is, only that structure exists, so the bounding
// box of edge energy tracks the actual framing.
//
// Usage: node zoommap.mjs <dir> <servedDir> <fps> <out.json>
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2], servedDir = process.argv[3];
const fps = Number(process.argv[4] || 10), out = process.argv[5];
const files = readdirSync(join(process.cwd(), dir)).filter((f) => /\.(jpg|png)$/i.test(f)).sort();

const { server, port } = await serve(8738);
const browser = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 300, height: 200 } });
await page.goto(`http://127.0.0.1:${port}/temp_3d_build/kite-cuts/compare-shell.html`);
console.log(`zoom-mapping ${files.length} frames`);

const rows = await page.evaluate(
  async ({ base, files, fps }) => {
    const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(src)); im.src = src; });
    const c = document.createElement("canvas");
    const g = c.getContext("2d", { willReadFrequently: true });
    const out = [];
    let prevLum = null;
    for (let i = 0; i < files.length; i++) {
      const im = await load(base + "/" + files[i]);
      const W = (c.width = im.width), H = (c.height = im.height);
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, W, H).data;
      const lum = new Float32Array(W * H);
      for (let p = 0, q = 0; p < d.length; p += 4, q++) lum[q] = 0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2];

      // gradient magnitude
      const TH = 18;
      let minX = W, minY = H, maxX = -1, maxY = -1, n = 0, sx = 0, sy = 0;
      // column / row edge profiles let us find where structure actually starts
      const colHits = new Int32Array(W), rowHits = new Int32Array(H);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const q = y * W + x;
          const gx = Math.abs(lum[q + 1] - lum[q - 1]);
          const gy = Math.abs(lum[q + W] - lum[q - W]);
          if (gx + gy > TH) {
            n++; sx += x; sy += y; colHits[x]++; rowHits[y]++;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      const rec = { i, t: +(i / fps).toFixed(2) };
      if (n > 400) {
        // robust extent: ignore the outer 1.5% of edge mass so stray pixels
        // (dust, compression noise) do not stretch the box
        const maxCol = Math.max(...colHits), maxRow = Math.max(...rowHits);
        const cMin = maxCol * 0.12, rMin = maxRow * 0.12;
        let l = 0, r = W - 1, tp = 0, bt = H - 1;
        for (let x = 0; x < W; x++) if (colHits[x] > cMin) { l = x; break; }
        for (let x = W - 1; x >= 0; x--) if (colHits[x] > cMin) { r = x; break; }
        for (let y = 0; y < H; y++) if (rowHits[y] > rMin) { tp = y; break; }
        for (let y = H - 1; y >= 0; y--) if (rowHits[y] > rMin) { bt = y; break; }
        Object.assign(rec, {
          w: +((100 * (r - l)) / W).toFixed(1),
          h: +((100 * (bt - tp)) / H).toFixed(1),
          cx: +((100 * (sx / n)) / W).toFixed(1),
          cy: +((100 * (sy / n)) / H).toFixed(1),
          l: +((100 * l) / W).toFixed(1), r: +((100 * r) / W).toFixed(1),
          tp: +((100 * tp) / H).toFixed(1), bt: +((100 * bt) / H).toFixed(1),
          edge: +((100 * n) / (W * H)).toFixed(2),
        });
      } else Object.assign(rec, { w: 0, h: 0, cx: 50, cy: 50, edge: 0 });

      if (prevLum) { let s = 0; for (let q = 0; q < lum.length; q++) s += Math.abs(lum[q] - prevLum[q]); rec.diff = +(s / lum.length).toFixed(2); }
      else rec.diff = 0;
      prevLum = lum;
      out.push(rec);
    }
    return out;
  },
  { base: servedDir, files, fps }
);

writeFileSync(out, JSON.stringify(rows, null, 0));
console.log("wrote", out);
await browser.close();
server.close();
