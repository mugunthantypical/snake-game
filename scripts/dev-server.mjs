/**
 * Minimal zero-dependency static file server for local development.
 *
 * A real server (rather than opening index.html directly) is required because
 * the game uses ES modules, which browsers refuse to load over file://.
 *
 * Usage: node scripts/dev-server.mjs [port]
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

/**
 * Resolve a URL path to a file inside ROOT, refusing anything that escapes it.
 * @returns {string | null} absolute path, or null if the request is unsafe
 */
function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = normalize(decoded).replace(/^([/\\])+/, "");

  // normalize() collapses "..", so a leading ".." here means an escape attempt.
  if (relative === ".." || relative.startsWith(`..${sep}`)) return null;

  const target = join(ROOT, relative);
  return target.endsWith(sep) || relative === "" ? join(target, "index.html") : target;
}

const server = createServer(async (req, res) => {
  const filePath = resolvePath(req.url === "/" ? "/index.html" : req.url);

  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain" }).end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      // Always revalidate so edits show up on refresh.
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
});

// Bind to loopback only: this server has no auth and is for local dev only.
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Snake dev server running at http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop.");
});
