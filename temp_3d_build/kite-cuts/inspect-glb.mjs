// Inspect a .glb: dump JSON chunk summary (meshes, materials, textures, extensions).
import { readFileSync } from "node:fs";

const path = process.argv[2];
const buf = readFileSync(path);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("not a glb");
const total = buf.readUInt32LE(8);
let off = 12, json = null, binLen = 0;
while (off < total) {
  const len = buf.readUInt32LE(off);
  const type = buf.readUInt32LE(off + 4);
  const data = buf.subarray(off + 8, off + 8 + len);
  if (type === 0x4e4f534a) json = JSON.parse(data.toString("utf8"));
  else binLen += len;
  off += 8 + len + ((4 - (len % 4)) % 4);
}
const g = json;
const triCount = (g.meshes || []).reduce((n, m) => n + m.primitives.length, 0);
let verts = 0;
for (const m of g.meshes || [])
  for (const p of m.primitives)
    if (p.attributes.POSITION != null) verts += g.accessors[p.attributes.POSITION].count;

console.log("file            :", path, (buf.length / 1024).toFixed(0) + " KB", "(bin", (binLen / 1024).toFixed(0) + " KB)");
console.log("generator       :", g.asset?.generator);
console.log("extensionsUsed  :", (g.extensionsUsed || []).join(", ") || "none");
console.log("meshes          :", (g.meshes || []).length, " primitives:", triCount, " vertices:", verts);
console.log("materials       :", (g.materials || []).length);
console.log("textures/images :", (g.textures || []).length, "/", (g.images || []).length);
console.log("nodes           :", (g.nodes || []).length);
console.log("animations      :", (g.animations || []).length);
console.log("\n-- nodes --");
(g.nodes || []).forEach((n, i) => {
  const mesh = n.mesh != null ? ` mesh=${n.mesh}(${g.meshes[n.mesh].name || "?"})` : "";
  console.log(`  [${i}] ${n.name || "(unnamed)"}${mesh}${n.children ? " children=" + n.children.join(",") : ""}`);
});
console.log("\n-- materials --");
(g.materials || []).forEach((m, i) => {
  const p = m.pbrMetallicRoughness || {};
  console.log(
    `  [${i}] ${m.name || "(unnamed)"}  base=${JSON.stringify(p.baseColorFactor)} metal=${p.metallicFactor} rough=${p.roughnessFactor}` +
      `${p.baseColorTexture ? " +baseTex" : ""}${p.metallicRoughnessTexture ? " +mrTex" : ""}${m.normalTexture ? " +normal" : ""}`
  );
});
console.log("\n-- images --");
(g.images || []).forEach((im, i) => console.log(`  [${i}] ${im.name || "(unnamed)"} mime=${im.mimeType || "?"}`));
