// Minimal static file server rooted at the repo root, so scene2.html can import
// three's ES modules from /node_modules/ (file:// blocks module imports via CORS).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = normalize(join(import.meta.dirname, "..", ".."));
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json",
  ".wasm": "application/wasm", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".hdr": "image/vnd.radiance", ".svg": "image/svg+xml",
};

export function serve(port = 8731) {
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent(req.url.split("?")[0]);
      const path = normalize(join(ROOT, url));
      if (!path.startsWith(ROOT)) { res.writeHead(403).end("forbidden"); return; }
      const s = await stat(path);
      if (s.isDirectory()) { res.writeHead(404).end("dir"); return; }
      const body = await readFile(path);
      res.writeHead(200, {
        "Content-Type": MIME[extname(path).toLowerCase()] || "application/octet-stream",
        "Content-Length": body.length,
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, port })));
}

if (import.meta.filename === process.argv[1]) {
  const { port } = await serve(Number(process.argv[2]) || 8731);
  console.log(`serving ${ROOT} at http://127.0.0.1:${port}/`);
}
