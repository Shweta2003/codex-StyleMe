import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { demoProfiles } from "./data/demoProfiles.js";
import { products } from "./data/products.js";
import { buildOpenAIRecommendations } from "./src/openaiStylistAgent.js";
import { getSimilarProducts, recommendProducts } from "./src/recommendationEngine.js";

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
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
      return sendJson(res, {
        profiles: demoProfiles,
        products,
        hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.OPENAI_MODEL || "gpt-5.5"
      });
    }

    if (req.method === "POST" && url.pathname === "/api/recommendations") {
      const body = await readJson(req);
      return sendJson(res, await handleRecommendations(body));
    }

    if (req.method === "GET" && url.pathname === "/api/similar") {
      const seedProductId = url.searchParams.get("seedProductId");
      return sendJson(res, {
        products: getSimilarProducts({ products, seedProductId, limit: 8 })
      });
    }

    if (req.method === "GET") {
      return serveStatic(url.pathname, res);
    }

    sendJson(res, { error: "Method not allowed" }, 405);
  } catch (error) {
    console.error(error);
    sendJson(res, { error: "Unexpected server error" }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`AI Fit Stylist running at http://localhost:${PORT}`);
});

async function handleRecommendations(body) {
  const profile = demoProfiles.find((item) => item.id === body.profileId) ?? demoProfiles[0];
  const preferences = normalizePreferences(body.preferences ?? {}, profile);
  const seedProductId = typeof body.seedProductId === "string" ? body.seedProductId : undefined;

  const heuristic = recommendProducts({
    products,
    profile,
    preferences,
    seedProductId,
    limit: 9
  });

  const ai = await buildOpenAIRecommendations({
    profile,
    preferences,
    products,
    seedProductId,
    heuristic
  });

  if (ai) {
    return {
      ...ai,
      source: "openai-agent",
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      preferences
    };
  }

  return {
    ...heuristic,
    source: "heuristic",
    model: null,
    preferences,
    assistantNote: buildLocalNote(profile, heuristic),
    styleDiagnosis: [
      heuristic.guidance.bodyType.tips[0],
      heuristic.guidance.faceShape.tips[0],
      heuristic.guidance.age
    ],
    outfitIdeas: buildLocalOutfits(heuristic.products),
    avoid: [
      "Avoid choosing size only from the label; compare garment measurements when available.",
      "Avoid over-indexing on body type; occasion, comfort, and personal taste should still lead."
    ]
  };
}

function normalizePreferences(preferences, profile) {
  return {
    occasion: normalizeChoice(preferences.occasion, ["work", "weekend", "date", "event", "campus", "travel", "school", "play", "family"], profile.defaultOccasion),
    styleMood: normalizeChoice(preferences.styleMood, ["classic", "street", "work", "comfort", "bold"], "classic"),
    fit: normalizeChoice(preferences.fit, ["balanced", "structured", "relaxed"], "balanced"),
    budget: clampNumber(preferences.budget, 30, 250, profile.defaultBudget),
    colors: Array.isArray(preferences.colors) ? preferences.colors.slice(0, 5) : profile.defaultPalette,
    notes: typeof preferences.notes === "string" ? preferences.notes.slice(0, 500) : ""
  };
}

function buildLocalNote(profile, result) {
  const top = result.products[0];
  if (!top) {
    return `I could not find a confident match for ${profile.name} in the demo catalog.`;
  }
  return `For ${profile.name}, I would start with ${top.name} because it lines up with the selected body balance, face shape, occasion, and budget signals in the static catalog.`;
}

function buildLocalOutfits(recommendedProducts) {
  const top = recommendedProducts.slice(0, 6);
  const firstSet = top.filter((product) => ["top", "bottom", "jacket", "shoe", "accessory"].includes(product.category)).slice(0, 3);
  const secondSet = top.filter((product) => product.category !== "accessory").slice(1, 4);

  return [
    {
      title: "Balanced daily set",
      productIds: firstSet.map((product) => product.id),
      reason: "Uses the highest scoring pieces to create a practical outfit from the static catalog."
    },
    {
      title: "Alternate styling path",
      productIds: secondSet.map((product) => product.id),
      reason: "Keeps the same fit logic while changing the silhouette and mood."
    }
  ].filter((outfit) => outfit.productIds.length);
}

function normalizeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

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

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        req.destroy(new Error("Request too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
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
