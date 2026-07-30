// Download the reference films listed in references.json.
//
//   node references/fetch.mjs           # everything missing
//   node references/fetch.mjs kite      # one
//   node references/fetch.mjs --check   # verify what is already on disk
//
// The media is deliberately not committed. These are tens of megabytes each and
// nobody cloning OpenDemo to record a demo needs them — they are inputs to the
// camera-matching work in docs/reference-matching.md, not to the product.
import { createHash } from "node:crypto";
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const HERE = import.meta.dirname;
const manifest = JSON.parse(readFileSync(join(HERE, "references.json"), "utf8"));
const MEDIA = join(HERE, manifest.dir);

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const only = args.filter((a) => !a.startsWith("--"));
const list = manifest.references.filter((r) => !only.length || only.includes(r.id));
if (!list.length) {
  console.error(`no reference matched. have: ${manifest.references.map((r) => r.id).join(", ")}`);
  process.exit(1);
}

mkdirSync(MEDIA, { recursive: true });
const md5 = (buf) => createHash("md5").update(buf).digest("hex");
let failed = 0;

for (const r of list) {
  const path = join(MEDIA, r.file);
  if (existsSync(path)) {
    const got = md5(readFileSync(path));
    const ok = got === r.md5;
    console.log(`${ok ? "ok    " : "STALE "} ${r.id.padEnd(10)} ${r.file}  ${(statSync(path).size / 1e6).toFixed(1)} MB`);
    if (!ok) console.log(`         expected md5 ${r.md5}, got ${got}`);
    if (ok || checkOnly) { if (!ok) failed++; continue; }
  } else if (checkOnly) {
    console.log(`MISSING ${r.id.padEnd(10)} ${r.file}   -> node references/fetch.mjs ${r.id}`);
    failed++;
    continue;
  }

  console.log(`fetch  ${r.id.padEnd(10)} ${r.url}`);
  const res = await fetch(r.url);
  if (!res.ok) {
    console.error(`         HTTP ${res.status} — fetch it manually and drop it at ${path}`);
    failed++;
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const got = md5(buf);
  if (got !== r.md5) {
    // Not fatal: the source may legitimately have been re-encoded. But the
    // measurements in docs/reference-matching.md were taken against r.md5, so
    // anything derived from a different file needs re-checking.
    console.warn(`         WARNING md5 mismatch (expected ${r.md5}, got ${got}) — the film may have changed upstream`);
  }
  writeFileSync(path, buf);
  console.log(`         wrote ${path}  ${(buf.length / 1e6).toFixed(1)} MB`);
}

process.exit(failed ? 1 : 0);
