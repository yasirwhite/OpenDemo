import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('Launching browser to record 3D MP4 demo...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: './recordings_output',
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  await page.goto('http://localhost:8080/mock-demo.html');
  await page.waitForTimeout(1000);

  // Smooth mouse movement and clicks
  console.log('Performing interactive movements...');
  await page.mouse.move(200, 200, { steps: 20 });
  await page.waitForTimeout(500);

  await page.mouse.move(900, 210, { steps: 25 }); // Hover Export button
  await page.waitForTimeout(400);
  await page.click('button.cta-btn'); // Click button
  await page.waitForTimeout(1000);

  await page.mouse.move(300, 600, { steps: 30 }); // Move over chart
  await page.waitForTimeout(800);

  await page.mouse.move(800, 650, { steps: 25 }); // Move over recent scenes
  await page.waitForTimeout(1200);

  await context.close();
  await browser.close();

  console.log('Video recorded successfully in ./recordings_output!');
}

main().catch(err => {
  console.error('Error rendering MP4:', err);
  process.exit(1);
});
