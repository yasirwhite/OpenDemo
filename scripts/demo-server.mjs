#!/usr/bin/env node
/**
 * demo-server.mjs
 * Zero-dependency serving for demo targets, so run-demo.mjs can record
 * against local content without anything running beforehand.
 *
 * Two modes, chosen by the flow JSON's "serve" block:
 *
 *   "serve": { "dir": "./my-mock" }
 *       Static file server (plain node:http) for a folder of HTML/built
 *       assets. Relative paths resolve against the flow file's directory.
 *
 *   "serve": { "command": "npm run dev", "cwd": "../client-repo", "port": 5173,
 *              "readyPath": "/", "readyTimeoutMs": 90000 }
 *       Launches the client's own dev server, polls the port until it
 *       responds, and kills the whole process tree on close.
 *
 * Exports:
 *   startServe(spec, baseDir, log) → { url, close() }
 *   startStaticServer(dir, port?)  → { url, port, close() }
 *   startCommandServer(spec, baseDir, log) → { url, close() }
 */

import { createServer } from "node:http";
import { request as httpRequest } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, extname, normalize, sep } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

// ─────────────────────────────────────────────────────────────────────────────
// Static file server
// ─────────────────────────────────────────────────────────────────────────────

export function startStaticServer(dir, preferredPort = 0) {
  const root = resolve(dir);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return Promise.reject(new Error(`serve.dir is not a directory: ${root}`));
  }

  const server = createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0].split("#")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";

      // Resolve and confine to root (no path traversal)
      let filePath = normalize(join(root, urlPath));
      if (!filePath.startsWith(root + sep) && filePath !== root) {
        res.writeHead(403); res.end("Forbidden"); return;
      }

      // SPA-style fallbacks: /foo → /foo.html → /foo/index.html → /index.html
      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        const candidates = [
          `${filePath}.html`,
          join(filePath, "index.html"),
          join(root, "index.html"),
        ];
        filePath = candidates.find((c) => existsSync(c) && statSync(c).isFile()) || null;
      }

      if (!filePath) {
        res.writeHead(404); res.end("Not found"); return;
      }

      const body = readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch (err) {
      res.writeHead(500); res.end(String(err.message));
    }
  });

  return new Promise((resolvePromise, reject) => {
    server.on("error", reject);
    server.listen(preferredPort, "127.0.0.1", () => {
      const port = server.address().port;
      resolvePromise({
        url: `http://127.0.0.1:${port}`,
        port,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Managed dev-server command
// ─────────────────────────────────────────────────────────────────────────────

function pollUrl(url, timeoutMs, intervalMs = 500) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolvePromise, reject) => {
    const attempt = () => {
      const req = httpRequest(url, { method: "GET", timeout: 3000 }, (res) => {
        res.resume();
        resolvePromise(); // any HTTP response means the server is up
      });
      req.on("error", retry);
      req.on("timeout", () => { req.destroy(); retry(); });
      req.end();
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Dev server did not respond within ${timeoutMs}ms`));
      } else {
        setTimeout(attempt, intervalMs);
      }
    };
    attempt();
  });
}

function killTree(child) {
  if (!child || child.killed) return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      // Negative PID kills the whole process group (child started detached)
      try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
    }
  } catch { /* already gone */ }
}

export async function startCommandServer(spec, baseDir, log = () => {}) {
  const { command, port, cwd, readyPath = "/", readyTimeoutMs = 90000, env = {} } = spec;
  if (!command) throw new Error('serve.command is required (e.g. "npm run dev")');
  if (!port) throw new Error("serve.port is required when using serve.command");

  const workDir = cwd ? resolve(baseDir, cwd) : baseDir;
  log(`   Starting dev server: ${command}  (cwd: ${workDir})`);

  const child = spawn(command, {
    shell: true,
    cwd: workDir,
    env: { ...process.env, ...env },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let exited = false;
  child.on("exit", () => { exited = true; });
  // Surface server output at low volume (first lines help debugging)
  let lines = 0;
  const echo = (d) => {
    if (lines < 15) { log(`   [dev-server] ${String(d).trim().split("\n")[0]}`); lines++; }
  };
  child.stdout.on("data", echo);
  child.stderr.on("data", echo);

  const url = `http://127.0.0.1:${port}`;
  try {
    await pollUrl(`${url}${readyPath}`, readyTimeoutMs);
  } catch (err) {
    killTree(child);
    throw new Error(`${err.message}${exited ? " (process exited early — check the command)" : ""}`);
  }
  log(`   Dev server ready at ${url}`);

  return {
    url,
    close: () => { killTree(child); },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{dir?: string, command?: string, port?: number, cwd?: string,
 *          readyPath?: string, readyTimeoutMs?: number}} spec
 * @param {string} baseDir - directory the flow JSON lives in (for relative paths)
 */
export async function startServe(spec, baseDir, log = () => {}) {
  if (spec.dir) {
    const dir = resolve(baseDir, spec.dir);
    const server = await startStaticServer(dir, spec.port || 0);
    log(`   Static server: ${dir} → ${server.url}`);
    return server;
  }
  if (spec.command) {
    return startCommandServer(spec, baseDir, log);
  }
  throw new Error('Flow "serve" block needs either "dir" or "command"');
}
