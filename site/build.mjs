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

// preview images: templates/<slug>/previews/*.jpg -> _site/assets/<slug>/
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
.brand .dot{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#e8483a,#7c6cf5);flex-shrink:0}
.navlabel{font-size:.68rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);padding:.5rem .5rem .35rem;margin-top:.75rem}
.nav a{display:flex;justify-content:space-between;align-items:center;padding:.42rem .5rem;border-radius:8px;color:var(--sub);font-size:.9rem}
.nav a:hover{background:var(--panel);color:var(--ink)}
.count{font-size:.7rem;color:var(--faint);background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:.02rem .45rem}
.count.soon{font-size:.65rem;letter-spacing:.03em}
main{flex:1;min-width:0;padding:2.5rem 2.75rem 4rem;max-width:1160px}
h1{font-size:1.9rem;letter-spacing:-.02em;margin:0 0 .3rem}
h2{font-size:1.15rem;letter-spacing:-.01em;margin:3rem 0 1rem;scroll-margin-top:1.5rem}
.sub{color:var(--sub);max-width:56ch;margin:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;margin-top:1.25rem}
.tcard{display:block;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card);transition:border-color .15s,transform .15s}
.tcard:hover{border-color:var(--accent);transform:translateY(-2px)}
.thumb{aspect-ratio:16/9;width:100%;object-fit:cover;display:block;background:#1c1a28}
.thumb.ph{display:flex;align-items:center;justify-content:center;color:var(--faint);font-size:2rem;font-weight:700}
.tbody{padding:.85rem 1rem 1rem}
.tname{font-weight:600}
.tmeta{font-size:.8rem;color:var(--sub);margin-top:.15rem}
.tags{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.6rem}
.tag{font-size:.7rem;padding:.08rem .5rem;border:1px solid var(--line);border-radius:99px;color:var(--sub)}
.soonbox{border:1px dashed var(--line);border-radius:14px;padding:2.25rem;text-align:center;color:var(--faint);margin-top:1.25rem}
.soonbox strong{display:block;color:var(--sub);font-weight:600;margin-bottom:.2rem}
.crumb{font-size:.85rem;color:var(--sub);display:inline-block;margin-bottom:1.25rem}
.crumb:hover{color:var(--ink)}
.strip{display:grid;grid-template-columns:1fr 1fr;gap:.9rem;margin:1.5rem 0}
.strip img{width:100%;border-radius:12px;border:1px solid var(--line);display:block}
pre.prompt{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:1.1rem;white-space:pre-wrap;word-break:break-word;font-size:.87rem;line-height:1.55;color:var(--sub)}
button.copy{background:var(--accent);color:#fff;border:0;border-radius:9px;padding:.55rem 1.15rem;font-size:.9rem;font-weight:600;cursor:pointer}
button.copy:hover{filter:brightness(1.1)}
.meta{font-size:.85rem;color:var(--sub)}
footer{margin-top:4rem;padding-top:1.25rem;border-top:1px solid var(--line);font-size:.82rem;color:var(--faint)}
footer a{color:var(--sub)}footer a:hover{color:var(--ink)}
@media(max-width:820px){aside{display:none}main{padding:1.75rem 1.25rem 3rem}.strip{grid-template-columns:1fr}}
`;

const sidebar = (root) => {
  const cats = CATEGORIES.map(([slug, label]) => {
    const n = showcase.filter((e) => e.category === slug).length;
    return `<a href="${root}#${slug}">${esc(label)} ${n ? `<span class="count">${n}</span>` : `<span class="count soon">soon</span>`}</a>`;
  }).join("");
  return `<aside>
  <a class="brand" href="${root}"><span class="dot"></span>OpenDemo</a>
  <nav class="nav">
    <div class="navlabel">Library</div>
    <a href="${root}#templates">Templates <span class="count">${templates.length}</span></a>
    <div class="navlabel">Showcase</div>
    ${cats}
    <div class="navlabel">Resources</div>
    <a href="${REPO_URL}">GitHub ↗</a>
    <a href="${REPO_URL}/blob/main/templates/README.md">How templates work ↗</a>
    <a href="${REPO_URL}/blob/main/AGENT_README.md">Agent instructions ↗</a>
  </nav>
</aside>`;
};

const page = (title, body, root) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body>${sidebar(root)}<main>${body}
<footer><a href="${REPO_URL}">OpenDemo</a> is free and open source — no cloud services, no API keys. Made a video? PR an entry to <a href="${REPO_URL}/blob/main/showcase/index.json"><code>showcase/index.json</code></a>.</footer>
</main></body></html>`;

const templateCard = (t, root) => {
  const prev = previewsOf(t.slug);
  const img = prev.length
    ? `<img class="thumb" loading="lazy" src="${root}assets/${esc(t.slug)}/${esc(prev[0])}" alt="${esc(t.name)} preview">`
    : `<div class="thumb ph">${esc(t.name[0])}</div>`;
  return `<a class="tcard" href="${root}templates/${esc(t.slug)}/">${img}
  <div class="tbody"><div class="tname">${esc(t.name)}</div>
  <div class="tmeta">${esc(t.style)} · ${secs(t.durationMs)} · ${t.slots} slot${t.slots === 1 ? "" : "s"}</div>
  <div class="tags">${(t.tags || []).slice(0, 4).map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div></div></a>`;
};

const showcaseCard = (e) => `
<div class="tcard"><div class="tbody">
  <div class="tname">${esc(e.title)}</div>
  <div class="tmeta">${e.repo ? `<a href="${esc(e.repo)}" style="color:var(--accent)">project repo</a>` : ""}${e.videoUrl ? ` · <a href="${esc(e.videoUrl)}" style="color:var(--accent)">watch</a>` : ""}${e.templates?.length ? ` · ${e.templates.map(esc).join(", ")}` : ""}</div>
  ${e.note ? `<div class="tmeta">${esc(e.note)}</div>` : ""}
</div></div>`;

const comingSoon = (what) => `<div class="soonbox"><strong>Coming soon</strong>${esc(what)}</div>`;

// ---- build ----
mkdirSync(OUT, { recursive: true });

// assets
for (const t of templates) {
  const prev = previewsOf(t.slug);
  if (!prev.length) continue;
  const dir = join(OUT, "assets", t.slug);
  mkdirSync(dir, { recursive: true });
  for (const f of prev) copyFileSync(join(ROOT, "templates", t.slug, "previews", f), join(dir, f));
}

// index
let home = `<h1>Video templates for your product</h1>
<p class="sub">Complete launch films with product-shaped holes. Pick a template, copy its prompt into the AI you already use, and it drops your product in — no cloud services, no API keys.</p>
<h2 id="templates">Templates</h2>
<div class="grid">${templates.map((t) => templateCard(t, "")).join("")}</div>`;

for (const [slug, label] of CATEGORIES) {
  const entries = showcase.filter((e) => e.category === slug);
  home += `<h2 id="${slug}">${esc(label)}</h2>`;
  home += entries.length
    ? `<div class="grid">${entries.map(showcaseCard).join("")}</div>`
    : comingSoon(`Videos made with OpenDemo in this category will appear here.`);
}
writeFileSync(join(OUT, "index.html"), page("OpenDemo — video templates", home, ""));

// template detail pages
for (const t of templates) {
  const prev = previewsOf(t.slug);
  const made = showcase.filter((e) => (e.templates || []).includes(t.slug));
  const root = "../../";
  const body = `<a class="crumb" href="${root}">← All templates</a>
<h1>${esc(t.name)}</h1>
<p class="meta">${esc(t.style)} · ${secs(t.durationMs)} · ${t.fps} fps · ${esc(t.aspect)} · ${t.slots} product slot${t.slots === 1 ? "" : "s"}${t.bpm ? ` · ${t.bpm} BPM grid` : ""} · derived from ${esc(t.derivedFrom)}</p>
<div class="tags">${(t.tags || []).map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div>
${prev.length ? `<div class="strip">${prev.map((f) => `<img loading="lazy" src="${root}assets/${esc(t.slug)}/${esc(f)}" alt="${esc(t.name)} frame">`).join("")}</div>` : ""}
<h2>Use this template</h2>
<p class="sub">Copy this prompt into your AI assistant:</p>
<pre class="prompt" id="p">${esc(promptFor(t))}</pre>
<p><button class="copy" onclick="navigator.clipboard.writeText(document.getElementById('p').textContent).then(()=>{this.textContent='Copied ✓';setTimeout(()=>this.textContent='Copy prompt',1500)})">Copy prompt</button>
<a class="meta" style="margin-left:.9rem" href="${REPO_URL}/blob/main/templates/${esc(t.config)}">view config ↗</a></p>
<h2>Made with ${esc(t.name)}</h2>
${made.length ? `<div class="grid">${made.map(showcaseCard).join("")}</div>` : comingSoon(`Public videos built on ${t.name} will appear here.`)}`;
  const dir = join(OUT, "templates", t.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(`${t.name} — OpenDemo template`, body, root));
}

console.log(`built _site: index + ${templates.length} template page(s), ${showcase.length} showcase entr${showcase.length === 1 ? "y" : "ies"}, previews: ${templates.map((t) => `${t.slug}:${previewsOf(t.slug).length}`).join(" ")}`);
