import { demoProfiles } from "../data/demoProfiles.js";
import { products } from "../data/products.js";
import { buildOpenAIRecommendations, getLastOpenAIError } from "./openaiStylistAgent.js";
import { getSimilarProducts, recommendProducts } from "./recommendationEngine.js";

export function getBootstrapPayload() {
  return {
    profiles: demoProfiles,
    products,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-5.5"
  };
}

export async function getRecommendationsPayload(body = {}) {
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
    aiError: process.env.OPENAI_API_KEY ? getLastOpenAIError() : null,
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

export function getSimilarPayload(seedProductId) {
  return {
    products: getSimilarProducts({ products, seedProductId, limit: 8 })
  };
}

export function applyCors(req, res) {
  const origin = req.headers?.origin;
  if (!origin) {
    return;
  }

  const allowedOrigins = parseAllowedOrigins(
    process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || ""
  );
  const allowAny = allowedOrigins.includes("*");
  if (!allowAny && !allowedOrigins.includes(origin)) {
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", allowAny ? "*" : origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

export function handleOptions(req, res) {
  applyCors(req, res);
  if (req.method !== "OPTIONS") {
    return false;
  }

  res.statusCode = 204;
  res.end();
  return true;
}

export function sendJson(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export function methodNotAllowed(res) {
  sendJson(res, { error: "Method not allowed" }, 405);
}

export function readJson(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  if (typeof req.body === "string") {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.resolve({});
    }
  }

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

function parseAllowedOrigins(value) {
  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}
