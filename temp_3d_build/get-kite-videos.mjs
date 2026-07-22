import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Extracting video URLs from https://kite.video/ ...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const videoUrls = new Set();

  page.on('response', response => {
    const url = response.url();
    if (url.includes('.mp4') || url.includes('.webm') || url.includes('video')) {
      console.log('Found video network stream:', url);
      videoUrls.add(url);
    }
  });

  await page.goto('https://kite.video/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Extract video src attributes from DOM
  const domVideos = await page.evaluate(() => {
    const vids = Array.from(document.querySelectorAll('video, source'));
    return vids.map(v => v.src || v.getAttribute('src')).filter(Boolean);
  });

  domVideos.forEach(v => videoUrls.add(v));

  console.log('\n--- ALL FOUND KITE VIDEO URLS ---');
  console.log(Array.from(videoUrls));

  // Download the primary video files
  let count = 0;
  for (const url of videoUrls) {
    if (url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('/static/media/') || url.includes('cdn')) {
      count++;
      const filename = `kite_official_${count}.mp4`;
      console.log(`Downloading ${url} -> ${filename} ...`);
      try {
        const response = await page.request.get(url);
        fs.writeFileSync(filename, await response.body());
        console.log(`Downloaded ${filename} (${fs.statSync(filename).size} bytes)`);
      } catch (err) {
        console.error(`Failed to download ${url}:`, err);
      }
    }
  }

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
