import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync, globSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] || "sample";
const fps = 30;
const WORKERS = parseInt(process.argv[3] || "6");

let exe = "";
try { const hits = globSync("/opt/pw-browsers/chromium-*/chrome-linux/chrome"); if (hits.length) exe = hits.sort().reverse()[0]; } catch {}

const outDir = join(__dirname, mode === "full" ? "frames" : "sample");
const resume = process.argv[4] === "resume";
if (existsSync(outDir) && !resume) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const url = "file://" + resolve(__dirname, "scene.html");

const browser = await chromium.launch({
  headless: true,
  executablePath: existsSync(exe) ? exe : undefined,
  args: ["--no-sandbox","--disable-setuid-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--disable-dev-shm-usage"],
});

async function makePage(){
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction("window.__ready === true", { timeout: 30000 });
  return page;
}

const probe = await makePage();
const DURATION = await probe.evaluate("window.DURATION");
console.log("DURATION =", DURATION, "s  fps =", fps, " workers =", WORKERS);

if (mode === "sample") {
  const times = []; for (let t = 0.4; t < DURATION; t += 1.6) times.push(t);
  let i = 0;
  for (const t of times) {
    const du = await probe.evaluate((tt)=>{window.renderAtTime(tt);return document.querySelector('canvas').toDataURL('image/png');}, t);
    writeFileSync(join(outDir, `s_${String(i).padStart(2,"0")}.png`), Buffer.from(du.split(",")[1],"base64"));
    i++;
  }
  console.log("sample frames:", i);
  await browser.close();
  process.exit(0);
}

const total = Math.floor(DURATION * fps);
const pages = [probe];
for (let k=1;k<WORKERS;k++) pages.push(await makePage());

let next = 0, doneCount = 0;
const t0 = Date.now();
async function worker(page, id){
  while(true){
    const f = next++; if (f >= total) break;
    const fp = join(outDir, `f_${String(f).padStart(4,"0")}.jpg`);
    if (resume && existsSync(fp)) { doneCount++; continue; }
    const t = f / fps;
    const du = await page.evaluate((tt)=>{window.renderAtTime(tt);return document.querySelector('canvas').toDataURL('image/jpeg',0.94);}, t);
    writeFileSync(fp, Buffer.from(du.split(",")[1],"base64"));
    doneCount++;
    if (doneCount % 60 === 0) {
      const rate = doneCount/((Date.now()-t0)/1000);
      console.log(`  ${doneCount}/${total}  (${rate.toFixed(1)} fps, ETA ${((total-doneCount)/rate).toFixed(0)}s)`);
    }
  }
}
await Promise.all(pages.map((p,i)=>worker(p,i)));
console.log("full frames:", doneCount, "in", ((Date.now()-t0)/1000).toFixed(0),"s");
await browser.close();
console.log("done ->", outDir);
