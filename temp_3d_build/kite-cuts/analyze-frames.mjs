// Measure framing per frame instead of eyeballing it.
//
// For every sampled frame this reports:
//   cut detection  - mean abs diff vs the previous frame (a spike is a cut)
//   background     - estimated from the frame border, plus how much of the frame
//                    is background at all ("emptiness"). Near-zero emptiness means
//                    a full-bleed 2D composite rather than a device on a set.
//   subject        - bbox / centroid / area / principal-axis angle of whatever is
//                    NOT background. This is the framing signal: how big the device
//                    is, where it sits in frame, and how it is rotated in-plane.
//
// Usage: node analyze-frames.mjs <globDir> <prefix> <fps> <out.json>
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];              // e.g. temp_3d_build/ref/frames
const servedDir = process.argv[3];        // e.g. /temp_3d_build/ref/frames
const fps = Number(process.argv[4] || 4);
const out = process.argv[5];

const files = readdirSync(join(process.cwd(), dir)).filter((f) => /\.(jpg|png)$/i.test(f)).sort();
console.log(`analyzing ${files.length} frames from ${dir}`);

const { server, port } = await serve(8737);
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 300, height: 200 } });
await page.goto(`http://127.0.0.1:${port}/temp_3d_build/kite-cuts/compare-shell.html`);

const results = await page.evaluate(
  async ({ base, files, fps }) => {
    const load = (src) =>
      new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => rej(new Error("load " + src));
        im.src = src;
      });

    const c = document.createElement("canvas");
    const g = c.getContext("2d", { willReadFrequently: true });
    const out = [];
    let prev = null;

    for (let i = 0; i < files.length; i++) {
      const im = await load(base + "/" + files[i]);
      const W = (c.width = im.width), H = (c.height = im.height);
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, W, H).data;

      const lum = new Float32Array(W * H);
      for (let p = 0, q = 0; p < d.length; p += 4, q++) {
        lum[q] = 0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2];
      }

      // --- background estimate from a border ring -------------------------
      const ring = [];
      const bw = Math.max(2, Math.round(W * 0.02));
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (x < bw || x >= W - bw || y < bw || y >= H - bw) ring.push(lum[y * W + x]);
        }
      }
      ring.sort((a, b) => a - b);
      const bgLum = ring[Math.floor(ring.length / 2)];
      // spread of the border ring: a busy border means content runs to the edge
      const ringLo = ring[Math.floor(ring.length * 0.1)];
      const ringHi = ring[Math.floor(ring.length * 0.9)];
      const borderSpread = ringHi - ringLo;

      // --- subject mask = pixels that differ from the background ----------
      const TH = 26;
      let minX = W, minY = H, maxX = -1, maxY = -1, n = 0;
      let sx = 0, sy = 0;
      const mask = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const q = y * W + x;
          if (Math.abs(lum[q] - bgLum) > TH) {
            mask[q] = 1; n++;
            sx += x; sy += y;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }

      let rec = { i, t: +(i / fps).toFixed(3), bgLum: +bgLum.toFixed(1), borderSpread: +borderSpread.toFixed(1) };
      if (n > W * H * 0.002) {
        const cx = sx / n, cy = sy / n;
        // principal axis of the mask -> in-plane rotation
        let mxx = 0, myy = 0, mxy = 0;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            if (!mask[y * W + x]) continue;
            const dx = x - cx, dy = y - cy;
            mxx += dx * dx; myy += dy * dy; mxy += dx * dy;
          }
        }
        mxx /= n; myy /= n; mxy /= n;
        const angle = 0.5 * Math.atan2(2 * mxy, mxx - myy) * (180 / Math.PI);
        Object.assign(rec, {
          areaPct: +((100 * n) / (W * H)).toFixed(2),
          bboxPctW: +((100 * (maxX - minX + 1)) / W).toFixed(1),
          bboxPctH: +((100 * (maxY - minY + 1)) / H).toFixed(1),
          cxPct: +((100 * cx) / W).toFixed(1),          // 50 = centred
          cyPct: +((100 * cy) / H).toFixed(1),
          leftPct: +((100 * minX) / W).toFixed(1),
          rightPct: +((100 * maxX) / W).toFixed(1),
          topPct: +((100 * minY) / H).toFixed(1),
          botPct: +((100 * maxY) / H).toFixed(1),
          axisDeg: +angle.toFixed(1),
        });
      } else {
        Object.assign(rec, { areaPct: 0, note: "no subject (uniform frame)" });
      }

      // --- temporal diff (cut detection) ----------------------------------
      if (prev) {
        let s = 0;
        for (let q = 0; q < lum.length; q++) s += Math.abs(lum[q] - prev[q]);
        rec.diff = +(s / lum.length).toFixed(2);
      } else rec.diff = 0;
      prev = lum;
      out.push(rec);
    }
    return out;
  },
  { base: servedDir, files, fps }
);

writeFileSync(out, JSON.stringify(results, null, 1));
console.log(`wrote ${out} (${results.length} frames)`);
await browser.close();
server.close();
