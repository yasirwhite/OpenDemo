import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ffmpegPath = ffmpegInstaller.path;
const webmFiles = fs.readdirSync('./recordings_output').filter(f => f.endsWith('.webm'));
if (webmFiles.length > 0) {
  const inputFile = path.join('./recordings_output', webmFiles[0]);
  const outputFile = path.resolve('./demo-3d-render.mp4');
  console.log(`Converting ${inputFile} to ${outputFile}...`);
  execSync(`"${ffmpegPath}" -i "${inputFile}" -c:v libx264 -pix_fmt yuv420p "${outputFile}" -y`);
  console.log('Conversion complete!');
}
