import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { execSync } from 'child_process';

const ffmpegPath = ffmpegInstaller.path;
execSync(`"${ffmpegPath}" -i kite_official_sample_1.mp4 -vf fps=0.5 official_frame_%02d.png -y`);
console.log('Official Kite frames extracted!');
