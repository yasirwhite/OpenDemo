// Snapshot clone traffic and render it into the README.
//
//   node .github/scripts/traffic.mjs
//
// GitHub only keeps 14 days of traffic and there is no way to backfill, so this
// merges each run into a JSON file that lives in the repo. Running daily means
// the 14-day windows overlap heavily — a missed run (or several) loses nothing.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.TRAFFIC_TOKEN || process.env.GITHUB_TOKEN;
if (!REPO || !TOKEN) {
  console.error("need GITHUB_REPOSITORY and a token (TRAFFIC_TOKEN or GITHUB_TOKEN)");
  process.exit(1);
}

const STORE = ".github/traffic/clones.json";
const README = "README.md";
const START = "<!-- traffic:start -->";
const END = "<!-- traffic:end -->";

const res = await fetch(`https://api.github.com/repos/${REPO}/traffic/clones`, {
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "opendemo-traffic",
  },
});
if (res.status === 403) {
  // The traffic endpoints need push access. The default GITHUB_TOKEN usually has
  // it via `permissions: contents: write`, but org policy can still refuse.
  console.error(
    "403 from the traffic API. The token lacks push access — create a PAT with the\n" +
    "`repo` scope, save it as a repository secret named TRAFFIC_TOKEN, and the\n" +
    "workflow will prefer it automatically."
  );
  process.exit(1);
}
if (!res.ok) {
  console.error(`traffic API returned ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const { clones = [] } = await res.json();

// ---- merge into the stored history -----------------------------------------
// Keyed by date. A day's counters only grow while that day is in progress and
// are frozen once it passes, so the newest reading for a date always wins.
const history = new Map();
if (existsSync(STORE)) {
  const prev = JSON.parse(readFileSync(STORE, "utf8"));
  for (const [date, v] of Object.entries(prev.days ?? {})) history.set(date, v);
}
let added = 0, revised = 0;
for (const d of clones) {
  const date = d.timestamp.slice(0, 10);
  const prev = history.get(date);
  if (!prev) added++;
  else if (prev.count !== d.count || prev.uniques !== d.uniques) revised++;
  history.set(date, { count: d.count, uniques: d.uniques });
}

const rows = [...history.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const total = rows.reduce((n, [, v]) => n + v.count, 0);
const totalUniq = rows.reduce((n, [, v]) => n + v.uniques, 0);
const stamp = new Date().toISOString().slice(0, 10);

mkdirSync(dirname(STORE), { recursive: true });
writeFileSync(
  STORE,
  JSON.stringify(
    {
      repo: REPO,
      updated: stamp,
      totals: { clones: total, uniques: totalUniq, days: rows.length },
      days: Object.fromEntries(rows),
    },
    null,
    1
  ) + "\n"
);
console.log(`${rows.length} days on record (+${added} new, ${revised} revised)`);

// ---- render the README block ------------------------------------------------
// Deliberately minimal: unique cloners is the only metric that matters here.
// The full per-day history still accumulates in the JSON store.
const block = `${START}
## Clone stats

| | |
|---|---|
| **Unique cloners** | ${totalUniq} |
| **Last updated** | ${stamp} |
${END}`;

let readme = readFileSync(README, "utf8");
if (readme.includes(START) && readme.includes(END)) {
  readme = readme.slice(0, readme.indexOf(START)) + block + readme.slice(readme.indexOf(END) + END.length);
} else {
  readme = readme.trimEnd() + "\n\n" + block + "\n";
}
writeFileSync(README, readme);
console.log(`README updated — ${total} clones, ${totalUniq} unique, ${rows.length} days`);
