import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Downloading official Kite video samples directly from https://kite.video/ ...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const sampleUrls = [
    'https://kite.video/new-samples/kite-recording.mp4',
    'https://kite.video/samples/demo.mp4',
    'https://kite.video/samples/3d-mockup.mp4'
  ];

  for (let i = 0; i < sampleUrls.length; i++) {
    const url = sampleUrls[i];
    const filename = `kite_official_sample_${i + 1}.mp4`;
    console.log(`Downloading ${url}...`);
    try {
      const resp = await page.request.get(url);
      if (resp.ok()) {
        const body = await resp.body();
        fs.writeFileSync(filename, body);
        console.log(`SUCCESS: Downloaded ${filename} (${body.length} bytes)`);
      } else {
        console.log(`HTTP ${resp.status()} for ${url}`);
      }
    } catch (e) {
      console.error(`Failed ${url}:`, e.message);
    }
  }

  await browser.close();
}

main().catch(console.error);
