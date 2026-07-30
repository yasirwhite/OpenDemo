// Minimal static file server rooted at the repo root, so scene.html can import
// three's ES modules from /node_modules/ (file:// blocks module imports via CORS).
//
// Range requests are NOT optional here. A media element served a plain 200 with
// no `Accept-Ranges` treats the resource as non-seekable: assigning
// `video.currentTime` silently does nothing, `seeked` fires anyway, and every
// frame renders whatever was decoded first. That looks exactly like a still
// screenshot pasted on the device — which is what it did.
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = normalize(join(import.meta.dirname, "..", "..", ".."));  // repo root
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json",
  ".wasm": "application/wasm", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".hdr": "image/vnd.radiance", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
};

export function serve(port = 8731) {
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent(req.url.split("?")[0]);
      const path = normalize(join(ROOT, url));
      if (!path.startsWith(ROOT)) { res.writeHead(403).end("forbidden"); return; }
      const s = await stat(path);
      if (s.isDirectory()) { res.writeHead(404).end("dir"); return; }
      const type = MIME[extname(path).toLowerCase()] || "application/octet-stream";

      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      if (range) {
        const [, a, b] = range;
        const start = a === "" ? s.size - Number(b) : Number(a);
        const end = a === "" || b === "" ? s.size - 1 : Math.min(Number(b), s.size - 1);
        if (!(start >= 0 && start <= end && end < s.size)) {
          res.writeHead(416, { "Content-Range": `bytes */${s.size}` }).end();
          return;
        }
        res.writeHead(206, {
          "Content-Type": type,
          "Content-Length": end - start + 1,
          "Content-Range": `bytes ${start}-${end}/${s.size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
        });
        createReadStream(path, { start, end }).pipe(res);
        return;
      }

      const body = await readFile(path);
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": body.length,
        "Accept-Ranges": "bytes",
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
