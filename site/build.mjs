// Static generator for the OpenDemo gallery (GitHub Pages).
// Reads templates/index.json + showcase/index.json, writes _site/.
// No dependencies; run from the repo root: node site/build.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const OUT = join(ROOT, "_site");
const REPO_URL = "https://github.com/yasirwhite/OpenDemo";

const templates = JSON.parse(readFileSync(join(ROOT, "templates/index.json"), "utf8")).templates;
const showcase = JSON.parse(readFileSync(join(ROOT, "showcase/index.json"), "utf8")).entries;

const CATEGORY_LABELS = {
  "oss-demo": "Open-source product demos",
  "landing-page": "Landing page videos",
  "launch-video": "Launch videos",
  "product-tour": "Product tours",
};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const secs = (ms) => (ms / 1000).toFixed(0) + "s";

const promptFor = (t) =>
  `Clone ${REPO_URL} and build it (npm install && npm run build). Then read templates/README.md and create a launch video for my product using the "${t.slug}" template (templates/${t.slug}/), replacing the product slots and role-tagged copy with my app: <describe your app here>.`;

const CSS = `
:root{--bg:#faf9f7;--ink:#1c1a28;--sub:#6b6878;--card:#fff;--line:#e6e4ee;--accent:#4f46e5}
@media(prefers-color-scheme:dark){:root{--bg:#16141f;--ink:#eceaf4;--sub:#9a96ac;--card:#201d2c;--line:#322e42;--accent:#8b83f6}}
*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,Segoe UI,sans-serif;background:var(--bg);color:var(--ink)}
main{max-width:960px;margin:0 auto;padding:2.5rem 1.25rem}
h1{font-size:2rem;margin:0 0 .25rem}h2{margin:2.5rem 0 1rem;font-size:1.3rem}
.sub{color:var(--sub)}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.1rem;display:block;color:inherit}
.card:hover{border-color:var(--accent);text-decoration:none}
.tags{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.6rem}
.tag{font-size:.75rem;padding:.1rem .55rem;border:1px solid var(--line);border-radius:99px;color:var(--sub)}
.meta{font-size:.85rem;color:var(--sub);margin-top:.4rem}
pre.prompt{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem;white-space:pre-wrap;word-break:break-word;font-size:.9rem}
button.copy{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:.5rem 1rem;font-size:.9rem;cursor:pointer}
.empty{border:1px dashed var(--line);border-radius:12px;padding:1.5rem;color:var(--sub);text-align:center}
footer{margin-top:3rem;font-size:.85rem;color:var(--sub)}
`;

const page = (title, body, depth = 0) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body><main>${body}
<footer><a href="${REPO_URL}">OpenDemo on GitHub</a> — free, open source, no cloud services. Made-with videos: PR an entry to <code>showcase/index.json</code>.</footer>
</main></body></html>`;

const templateCard = (t) => `
<a class="card" href="templates/${esc(t.slug)}/">
  <strong>${esc(t.name)}</strong>
  <div class="meta">${esc(t.style)} · ${secs(t.durationMs)} · ${t.slots} product slot${t.slots === 1 ? "" : "s"} · ${esc(t.aspect)}</div>
  <div class="tags">${(t.tags || []).map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div>
</a>`;

const showcaseCard = (e) => `
<div class="card">
  <strong>${esc(e.title)}</strong>
  <div class="meta">
    ${e.repo ? `<a href="${esc(e.repo)}">project repo</a>` : ""}
    ${e.videoUrl ? ` · <a href="${esc(e.videoUrl)}">watch</a>` : ""}
    ${e.templates && e.templates.length ? ` · template: ${e.templates.map(esc).join(", ")}` : ""}
  </div>
  ${e.note ? `<div class="meta">${esc(e.note)}</div>` : ""}
</div>`;

// ---- index ----
const byCat = {};
for (const e of showcase) (byCat[e.category] ??= []).push(e);

let home = `<h1>OpenDemo templates</h1>
<p class="sub">Complete launch films with product-shaped holes. Pick one, copy its prompt, and your AI drops your product in — no cloud services, no API keys.</p>
<h2>Templates</h2><div class="grid">${templates.map(templateCard).join("")}</div>`;

for (const [cat, label] of Object.entries(CATEGORY_LABELS)) {
  home += `<h2>${esc(label)}</h2>`;
  home += byCat[cat]?.length
    ? `<div class="grid">${byCat[cat].map(showcaseCard).join("")}</div>`
    : `<div class="empty">Nothing here yet — made one? PR an entry to <code>showcase/index.json</code>.</div>`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "index.html"), page("OpenDemo — video templates", home));

// ---- template detail pages ----
for (const t of templates) {
  const made = showcase.filter((e) => (e.templates || []).includes(t.slug));
  const body = `<p><a href="../../">← all templates</a></p>
<h1>${esc(t.name)}</h1>
<p class="sub">${esc(t.style)} · ${secs(t.durationMs)} · ${t.fps} fps · ${esc(t.aspect)} · ${t.slots} product slot${t.slots === 1 ? "" : "s"}${t.bpm ? ` · ${t.bpm} BPM grid` : ""}</p>
<p class="meta">Derived from ${esc(t.derivedFrom)}. Config: <a href="${REPO_URL}/blob/main/templates/${esc(t.config)}">templates/${esc(t.config)}</a></p>
<div class="tags">${(t.tags || []).map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div>
<h2>Use it</h2>
<p class="sub">Copy this prompt into the AI assistant you already use:</p>
<pre class="prompt" id="p">${esc(promptFor(t))}</pre>
<button class="copy" onclick="navigator.clipboard.writeText(document.getElementById('p').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy prompt',1500)})">Copy prompt</button>
<h2>Made with ${esc(t.name)}</h2>
${made.length ? `<div class="grid">${made.map(showcaseCard).join("")}</div>` : `<div class="empty">No public videos yet — made one? PR an entry to <code>showcase/index.json</code>.</div>`}`;
  const dir = join(OUT, "templates", t.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(`${t.name} — OpenDemo template`, body, 2));
}

console.log(`built _site: index + ${templates.length} template page(s), ${showcase.length} showcase entr${showcase.length === 1 ? "y" : "ies"}`);
