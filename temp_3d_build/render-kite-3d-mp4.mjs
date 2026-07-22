import { chromium } from 'playwright';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Rendering Genuine 3D WebGL Mesh & Camera Orbit MP4 Video...');
  
  const recDir = path.resolve('./recordings_3d');
  if (fs.existsSync(recDir)) {
    fs.readdirSync(recDir).forEach(f => fs.unlinkSync(path.join(recDir, f)));
  } else {
    fs.mkdirSync(recDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=default']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: recDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  await page.goto('http://localhost:8080/render-kite-3d.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Wait for Three.js to initialize and render first frame (~2 seconds)
  await page.waitForTimeout(2000);
  console.log('3D WebGL Canvas loaded. Recording 12s of camera orbit...');

  // Record 14 seconds total (first 2s are init, then 12s of smooth 3D animation)
  await page.waitForTimeout(14000);

  await context.close();
  await browser.close();

  const webmFiles = fs.readdirSync(recDir).filter(f => f.endsWith('.webm'));
  if (webmFiles.length === 0) {
    throw new Error('No webm video recorded!');
  }

  const inputWebm = path.join(recDir, webmFiles[0]);
  const outputMp4 = path.resolve(process.cwd(), 'kite-3d-render.mp4');
  const outputMp4Alias = path.resolve(process.cwd(), 'demo-3d-render.mp4');

  const ffmpegPath = ffmpegInstaller.path;
  console.log(`Converting ${inputWebm} to high-quality MP4 (${outputMp4})...`);
  
  execSync(`"${ffmpegPath}" -ss 2 -i "${inputWebm}" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p "${outputMp4}" -y`);
  execSync(`"${ffmpegPath}" -ss 2 -i "${inputWebm}" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p "${outputMp4Alias}" -y`);

  console.log('3D MP4 Video successfully rendered!');
}

main().catch(err => {
  console.error('Error rendering 3D MP4:', err);
  process.exit(1);
});
