import { chromium } from 'playwright';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🎬 Starting Frame-by-Frame Deterministic 3D WebGL MP4 Render (Zero-Lag)...');
  
  const framesDir = path.resolve('./temp_3d_build/raw_frames');
  if (fs.existsSync(framesDir)) {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(framesDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  await page.goto('http://localhost:8080/render-kite-3d.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  const fps = 30;
  const durationSec = 12;
  const totalFrames = fps * durationSec; // 360 frames

  console.log(`📸 Rendering ${totalFrames} high-res 3D frames at ${fps} FPS...`);

  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps;
    await page.evaluate((timestamp) => {
      window.renderAtTime(timestamp);
    }, t);

    const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });

    if ((i + 1) % 60 === 0 || i === totalFrames - 1) {
      console.log(`   Rendered ${i + 1}/${totalFrames} frames (${Math.round(((i + 1) / totalFrames) * 100)}%)`);
    }
  }

  await browser.close();

  const outputMp4 = path.resolve(process.cwd(), 'kite-3d-render.mp4');
  const outputMp4Alias = path.resolve(process.cwd(), 'demo-3d-render.mp4');
  const ffmpegPath = ffmpegInstaller.path;

  console.log(`🎥 Encoding silky smooth 30 FPS MP4 video with FFmpeg...`);
  
  const ffmpegCmd = `"${ffmpegPath}" -framerate ${fps} -i "${framesDir}/frame_%04d.png" -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p "${outputMp4}" -y`;
  execSync(ffmpegCmd);

  fs.copyFileSync(outputMp4, outputMp4Alias);

  console.log('✅ 3D MP4 Video successfully rendered & saved to demo-3d-render.mp4!');
}

main().catch(err => {
  console.error('❌ Error rendering 3D MP4:', err);
  process.exit(1);
});
