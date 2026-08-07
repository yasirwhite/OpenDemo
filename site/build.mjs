// Static generator for the OpenDemo gallery (GitHub Pages).
// Reads templates/index.json + showcase/index.json + templates/<slug>/previews/,
// writes _site/. No dependencies; run from the repo root: node site/build.mjs

import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const OUT = join(ROOT, "_site");
const REPO_URL = "https://github.com/yasirwhite/OpenDemo";

const templates = JSON.parse(readFileSync(join(ROOT, "templates/index.json"), "utf8")).templates;
const showcase = JSON.parse(readFileSync(join(ROOT, "showcase/index.json"), "utf8")).entries;

const CATEGORIES = [
  ["oss-demo", "Open-source product demos"],
  ["landing-page", "Landing page videos"],
  ["launch-video", "Launch videos"],
  ["product-tour", "Product tours"],
];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const secs = (ms) => (ms / 1000).toFixed(0) + "s";

const promptFor = (t) =>
  `Clone ${REPO_URL} and build it (npm install && npm run build). Then read templates/README.md and create a launch video for my product using the "${t.slug}" template (templates/${t.slug}/), replacing the product slots and role-tagged copy with my app: <describe your app here>.`;

const previewsOf = (slug) => {
  const dir = join(ROOT, "templates", slug, "previews");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
};

const CSS = `
*{box-sizing:border-box}
:root{--bg:#0a0a0c;--panel:#111114;--line:#232329;--ink:#f4f4f5;--sub:#9d9da8;--faint:#6a6a75;--accent:#7c6cf5;--card:#131318}
html{scroll-behavior:smooth;scroll-padding-top:1.5rem}
body{margin:0;font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;background:var(--bg);color:var(--ink);display:flex;min-height:100vh}
a{color:inherit;text-decoration:none}
aside{width:232px;flex-shrink:0;border-right:1px solid var(--line);padding:1.5rem 1rem;position:sticky;top:0;height:100vh;overflow-y:auto}
.brand{display:flex;align-items:center;gap:.5rem;font-weight:700;font-size:1.05rem;padding:0 .5rem;margin-bottom:1.75rem}
.brand img.dot{width:24px;height:24px;object-fit:contain;flex-shrink:0}
.navlabel{font-size:.68rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);padding:.5rem .5rem .35rem;margin-top:.75rem}
.nav a{display:flex;justify-content:space-between;align-items:center;padding:.42rem .5rem;border-radius:8px;color:var(--sub);font-size:.9rem}
.nav a:hover{background:var(--panel);color:var(--ink)}
.count{font-size:.7rem;color:var(--faint);background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:.02rem .45rem}
.count.soon{font-size:.65rem;letter-spacing:.03em}
main{flex:1;min-width:0;padding:2.5rem 2.75rem 4rem;max-width:1160px}
h1{font-size:1.9rem;letter-spacing:-.02em;margin:0 0 .3rem}
h2{font-size:1.15rem;letter-spacing:-.01em;margin:3rem 0 1rem;scroll-margin-top:1.5rem}
.sub{color:var(--sub);margin:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;margin-top:1.25rem}
.tcard{display:block;width:100%;text-align:left;font:inherit;color:inherit;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card);cursor:pointer;padding:0;transition:border-color .15s,transform .15s}
.tcard:hover{border-color:var(--accent);transform:translateY(-2px)}
.thumb{aspect-ratio:16/9;width:100%;object-fit:cover;display:block;background:#1c1a28}
.thumb.ph{display:flex;align-items:center;justify-content:center;color:var(--faint);font-size:2rem;font-weight:700}
.tbody{padding:.85rem 1rem 1rem}
.tname{font-weight:600}
.tmeta{font-size:.8rem;color:var(--sub);margin-top:.15rem}
.soonbox{border:1px dashed var(--line);border-radius:14px;padding:2.25rem;text-align:center;color:var(--faint);margin-top:1.25rem}
.soonbox strong{display:block;color:var(--sub);font-weight:600;margin-bottom:.2rem}
footer{margin-top:4rem;padding-top:1.25rem;border-top:1px solid var(--line);font-size:.82rem;color:var(--faint)}
footer a{color:var(--sub)}footer a:hover{color:var(--ink)}
/* overlay */
.ovl{position:fixed;inset:0;background:rgba(5,5,8,.72);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;padding:1.25rem;z-index:10}
.ovl.open{display:flex}
.dlg{background:var(--panel);border:1px solid var(--line);border-radius:16px;max-width:640px;width:100%;max-height:92vh;overflow-y:auto;position:relative}
.dlg .x{position:absolute;top:.6rem;right:.6rem;background:rgba(10,10,12,.6);border:1px solid var(--line);color:var(--sub);border-radius:99px;width:30px;height:30px;cursor:pointer;font-size:.95rem;line-height:1;z-index:2}
.dlg .x:hover{color:var(--ink)}
.carousel{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:0;border-radius:16px 16px 0 0}
.carousel img{width:100%;flex-shrink:0;scroll-snap-align:center;aspect-ratio:16/9;object-fit:cover;display:block}
.dots{display:flex;gap:.4rem;justify-content:center;padding:.6rem 0 0}
.dots span{width:7px;height:7px;border-radius:99px;background:var(--line);cursor:pointer;transition:background .2s,transform .2s}
.dots span.on{background:var(--accent);transform:scale(1.25)}
.dbody{padding:.75rem 1.5rem 1.5rem}
.dbody h3{margin:.5rem 0 .75rem;font-size:1.05rem}
pre.prompt{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:1rem;white-space:pre-wrap;word-break:break-word;font-size:.85rem;line-height:1.55;color:var(--sub);margin:0 0 .9rem}
button.copy{background:var(--accent);color:#fff;border:0;border-radius:9px;padding:.55rem 1.15rem;font-size:.9rem;font-weight:600;cursor:pointer}
button.copy:hover{filter:brightness(1.1)}
@media(max-width:820px){aside{display:none}main{padding:1.75rem 1.25rem 3rem}}
`;

const sidebar = () => {
  const cats = CATEGORIES.map(([slug, label]) => {
    const n = showcase.filter((e) => e.category === slug).length;
    return `<a href="#${slug}">${esc(label)} ${n ? `<span class="count">${n}</span>` : `<span class="count soon">soon</span>`}</a>`;
  }).join("");
  return `<aside>
  <a class="brand" href="#"><img class="dot" src="assets/opendemo-mark.png" alt="">OpenDemo</a>
  <nav class="nav">
    <div class="navlabel">Library</div>
    <a href="#templates">Templates <span class="count">${templates.length}</span></a>
    <div class="navlabel">Showcase</div>
    ${cats}
    <div class="navlabel">Resources</div>
    <a href="${REPO_URL}">GitHub ↗</a>
    <a href="${REPO_URL}/blob/main/templates/README.md">How templates work ↗</a>
  </nav>
</aside>`;
};

const templateCard = (t) => {
  const prev = previewsOf(t.slug);
  const img = prev.length
    ? `<img class="thumb" loading="lazy" src="assets/${esc(t.slug)}/${esc(prev[0])}" alt="${esc(t.name)} preview">`
    : `<div class="thumb ph">${esc(t.name[0])}</div>`;
  return `<button class="tcard" data-t="${esc(t.slug)}">${img}
  <div class="tbody"><div class="tname">${esc(t.name)}</div>
  <div class="tmeta">${esc(t.style)} · ${secs(t.durationMs)} · ${t.slots} slot${t.slots === 1 ? "" : "s"}</div></div></button>`;
};

const showcaseCard = (e) => {
  const vid = e.videoUrl && /\.mp4($|\?)/.test(e.videoUrl)
    ? `<video class="thumb" src="${esc(e.videoUrl)}" muted loop playsinline preload="metadata" onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0"></video>`
    : "";
  return `
<div class="tcard" style="cursor:default">${vid}<div class="tbody">
  <div class="tname">${esc(e.title)}</div>
  <div class="tmeta">${e.repo ? `<a href="${esc(e.repo)}" style="color:var(--accent)">project repo</a>` : ""}${e.videoUrl ? ` · <a href="${esc(e.videoUrl)}" style="color:var(--accent)">watch</a>` : ""}${e.templates?.length ? ` · ${e.templates.map(esc).join(", ")}` : ""}</div>
  ${e.note ? `<div class="tmeta">${esc(e.note)}</div>` : ""}
</div></div>`;
};

const comingSoon = () => `<div class="soonbox"><strong>Coming soon</strong></div>`;

// ---- build ----
mkdirSync(OUT, { recursive: true });

// the OpenDemo aperture mark (canonical raster lives with the birch template assets)
mkdirSync(join(OUT, "assets"), { recursive: true });
copyFileSync(join(ROOT, "templates/birch/aperture-mark.png"), join(OUT, "assets", "opendemo-mark.png"));

for (const t of templates) {
  const prev = previewsOf(t.slug);
  if (!prev.length) continue;
  const dir = join(OUT, "assets", t.slug);
  mkdirSync(dir, { recursive: true });
  for (const f of prev) copyFileSync(join(ROOT, "templates", t.slug, "previews", f), join(dir, f));
}

const data = Object.fromEntries(templates.map((t) => [t.slug, {
  name: t.name,
  prompt: promptFor(t),
  images: previewsOf(t.slug).map((f) => `assets/${t.slug}/${f}`),
}]));

let home = `<h1>OpenDemo templates</h1>
<p class="sub">Choose a template and copy a prompt for your AI assistant to use the template.</p>
<h2 id="templates">Templates</h2>
<div class="grid">${templates.map(templateCard).join("")}</div>`;

for (const [slug, label] of CATEGORIES) {
  const entries = showcase.filter((e) => e.category === slug);
  home += `<h2 id="${slug}">${esc(label)}</h2>`;
  home += entries.length ? `<div class="grid">${entries.map(showcaseCard).join("")}</div>` : comingSoon();
}

const overlay = `
<div class="ovl" id="ovl">
  <div class="dlg" role="dialog" aria-modal="true">
    <button class="x" id="ovl-x" aria-label="Close">✕</button>
    <div class="carousel" id="ovl-imgs"></div>
    <div class="dots" id="ovl-dots"></div>
    <div class="dbody">
      <h3>Copy this prompt to use the template</h3>
      <pre class="prompt" id="ovl-prompt"></pre>
      <button class="copy" id="ovl-copy">Copy prompt</button>
    </div>
  </div>
</div>
<script>
const T=${JSON.stringify(data)};
const ovl=document.getElementById('ovl'),imgs=document.getElementById('ovl-imgs'),
dots=document.getElementById('ovl-dots'),pr=document.getElementById('ovl-prompt'),
cp=document.getElementById('ovl-copy');
let n=0,idx=0,timer=null,paused=false;
const mark=()=>[...dots.children].forEach((d,i)=>d.classList.toggle('on',i===idx));
const goTo=i=>{idx=(i+n)%n;imgs.scrollTo({left:idx*imgs.clientWidth,behavior:'smooth'});mark()};
const play=()=>{stop();if(n>1)timer=setInterval(()=>{if(!paused)goTo(idx+1)},2000)};
const stop=()=>{if(timer){clearInterval(timer);timer=null}};
imgs.addEventListener('scroll',()=>{const i=Math.round(imgs.scrollLeft/imgs.clientWidth);
  if(i!==idx&&i>=0&&i<n){idx=i;mark()}});
imgs.addEventListener('mouseenter',()=>paused=true);
imgs.addEventListener('mouseleave',()=>paused=false);
document.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{
  const t=T[b.dataset.t];if(!t)return;
  n=t.images.length;idx=0;paused=false;
  imgs.innerHTML=t.images.map(s=>'<img src="'+s+'" alt="">').join('');
  dots.innerHTML=n>1?t.images.map((_,i)=>'<span data-i="'+i+'"></span>').join(''):'';
  [...dots.children].forEach(d=>d.addEventListener('click',()=>goTo(+d.dataset.i)));
  pr.textContent=t.prompt;cp.textContent='Copy prompt';
  imgs.scrollLeft=0;mark();ovl.classList.add('open');play();
}));
const close=()=>{ovl.classList.remove('open');stop()};
document.getElementById('ovl-x').addEventListener('click',close);
ovl.addEventListener('click',e=>{if(e.target===ovl)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
cp.addEventListener('click',()=>{navigator.clipboard.writeText(pr.textContent)
  .then(()=>{cp.textContent='Copied ✓';setTimeout(()=>cp.textContent='Copy prompt',1500)})});
// card hover: 2s slideshow through the template's previews
document.querySelectorAll('[data-t]').forEach(b=>{
  const t=T[b.dataset.t],im=b.querySelector('img.thumb');
  if(!t||!im||t.images.length<2)return;
  let i=0,cyc=null;
  b.addEventListener('mouseenter',()=>{t.images.forEach(s=>{(new Image()).src=s});
    cyc=setInterval(()=>{i=(i+1)%t.images.length;im.src=t.images[i]},500)});
  b.addEventListener('mouseleave',()=>{clearInterval(cyc);cyc=null;i=0;im.src=t.images[0]});
});
</script>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenDemo — video templates</title><style>${CSS}</style></head>
<body>${sidebar()}<main>${home}
<footer><a href="${REPO_URL}">OpenDemo</a> is free and open source. Made a video? PR an entry to <a href="${REPO_URL}/blob/main/showcase/index.json"><code>showcase/index.json</code></a>.</footer>
</main>${overlay}</body></html>`;

writeFileSync(join(OUT, "index.html"), html);
console.log(`built _site: single page, ${templates.length} template(s), ${showcase.length} showcase entr${showcase.length === 1 ? "y" : "ies"}, previews: ${templates.map((t) => `${t.slug}:${previewsOf(t.slug).length}`).join(" ")}`);
