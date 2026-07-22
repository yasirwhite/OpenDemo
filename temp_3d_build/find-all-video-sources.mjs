import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Inspecting kite.video DOM and network requests for video URLs...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const mediaUrls = new Set();

  page.on('response', async res => {
    const u = res.url();
    const contentType = res.headers()['content-type'] || '';
    if (u.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i) || contentType.includes('video')) {
      console.log('Media request found:', u);
      mediaUrls.add(u);
    }
  });

  await page.goto('https://kite.video/', { waitUntil: 'networkidle' });

  // Scroll down to trigger lazy loading of hero video and feature demo videos
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });

  await page.waitForTimeout(3000);

  const sources = await page.evaluate(() => {
    const urls = [];
    document.querySelectorAll('video, source, iframe').forEach(el => {
      if (el.src) urls.push(el.src);
      if (el.dataset && el.dataset.src) urls.push(el.dataset.src);
      const srcAttr = el.getAttribute('src');
      if (srcAttr) urls.push(srcAttr);
    });
    return urls;
  });

  sources.forEach(s => {
    if (s.startsWith('/')) s = 'https://kite.video' + s;
    mediaUrls.add(s);
  });

  console.log('--- ALL DETECTED MEDIA URLS ---');
  const arr = Array.from(mediaUrls);
  console.log(arr);

  let idx = 0;
  for (const url of arr) {
    if (url.startsWith('http')) {
      idx++;
      const filename = `kite_official_${idx}.mp4`;
      console.log(`Downloading ${url} to ${filename}...`);
      try {
        const resp = await page.request.get(url);
        if (resp.ok()) {
          fs.writeFileSync(filename, await resp.body());
          console.log(`Successfully saved ${filename} (${fs.statSync(filename).size} bytes)`);
        }
      } catch (err) {
        console.error(`Error downloading ${url}:`, err.message);
      }
    }
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
