import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const tempDir = path.resolve('./temp_3d_build');
fs.readdirSync(tempDir).filter(f => f.startsWith('frame_') && f.endsWith('.png')).forEach(f => fs.unlinkSync(path.join(tempDir, f)));

const ffmpegPath = ffmpegInstaller.path;
const inputMp4 = path.resolve('./kite-3d-render.mp4');
const outPattern = path.join(tempDir, 'frame_%02d.png');

execSync(`"${ffmpegPath}" -i "${inputMp4}" -vf fps=0.5 "${outPattern}" -y`);
console.log('Fresh 3D MacBook frames extracted!');
