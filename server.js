import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyCors,
  getBootstrapPayload,
  getRecommendationsPayload,
  getSimilarPayload,
  handleOptions,
  methodNotAllowed,
  readJson,
  sendJson
} from "./src/apiHandlers.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
loadDotEnv(join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 5173);
const publicDir = join(__dirname, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (req, res) => {
  try {
    if (handleOptions(req, res)) {
      return;
    }
    applyCors(req, res);

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
      return sendJson(res, getBootstrapPayload());
    }

    if (req.method === "POST" && url.pathname === "/api/recommendations") {
      const body = await readJson(req);
      return sendJson(res, await getRecommendationsPayload(body));
    }

    if (req.method === "GET" && url.pathname === "/api/similar") {
      const seedProductId = url.searchParams.get("seedProductId");
      return sendJson(res, getSimilarPayload(seedProductId));
    }

    if (req.method === "GET") {
      return serveStatic(url.pathname, res);
    }

    methodNotAllowed(res);
  } catch (error) {
    console.error(error);
    sendJson(res, { error: "Unexpected server error" }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`AI Fit Stylist running at http://localhost:${PORT}`);
});

async function serveStatic(pathname, res) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const unsafePath = normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, unsafePath);

  if (!filePath.startsWith(publicDir)) {
    return sendJson(res, { error: "Not found" }, 404);
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(content);
  } catch {
    sendJson(res, { error: "Not found" }, 404);
  }
}

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
    }
  }
}
