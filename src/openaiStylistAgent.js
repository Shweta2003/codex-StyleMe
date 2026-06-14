import { recommendProducts } from "./recommendationEngine.js";

const OUTPUT_CONTRACT = {
  assistantNote: "One concise paragraph for the shopper.",
  styleDiagnosis: ["Short, body-positive styling observations."],
  recommendedIds: ["Product IDs from the static catalog only."],
  outfitIdeas: [
    {
      title: "Outfit name",
      productIds: ["Product IDs from the static catalog only."],
      reason: "Why this outfit works for body type, face shape, and preferences."
    }
  ],
  avoid: ["Gentle fit cautions, never body-shaming."],
  confidence: "demo"
};

export async function buildOpenAIRecommendations({
  profile,
  preferences,
  products,
  seedProductId,
  heuristic
}) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  let Agent;
  let run;
  let tool;
  let z;

  try {
    ({ Agent, run, tool } = await import("@openai/agents"));
    ({ z } = await import("zod"));
  } catch (error) {
    console.warn("OpenAI Agents SDK unavailable. Falling back to heuristics.", error.message);
    return null;
  }

  const rankStaticCatalog = tool({
    name: "rank_static_catalog",
    description:
      "Rank the local static fashion catalog for the selected demo shopper. Returns product IDs, scores, and reasons. Use this before making recommendations.",
    parameters: z.object({
      limit: z.number().min(3).max(12).default(9)
    }),
    async execute({ limit }) {
      return recommendProducts({
        products,
        profile,
        preferences,
        seedProductId,
        limit
      });
    }
  });

  const agent = new Agent({
    name: "Fit commerce stylist",
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    instructions: [
      "You are a commerce fashion stylist for a demo storefront.",
      "Use the rank_static_catalog tool before recommending products.",
      "Recommend only product IDs present in tool results. Never invent products, brands, sizes, discounts, or APIs.",
      "Use body-positive language. Do not say clothing hides, fixes, disguises, or corrects a body.",
      "Respect these prototype limits: no uploads, no real segmentation, no real ecommerce API, no authentication.",
      "Return JSON only. No markdown fences."
    ].join(" "),
    tools: [rankStaticCatalog]
  });

  const prompt = {
    task: "Create a recommendation plan for this shopper and static catalog.",
    outputContract: OUTPUT_CONTRACT,
    selectedProfile: profile,
    preferences,
    clickedSeedProductId: seedProductId || null,
    localHeuristicTopProducts: heuristic.products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      score: product.score,
      reasons: product.reasons
    }))
  };

  try {
    const result = await run(agent, JSON.stringify(prompt));
    return normalizeAgentOutput(result.finalOutput, heuristic);
  } catch (error) {
    console.warn("OpenAI agent failed. Falling back to heuristics.", error.message);
    return null;
  }
}

function normalizeAgentOutput(finalOutput, heuristic) {
  const parsed = parseJson(finalOutput);
  if (!parsed) {
    return null;
  }

  const allowedIds = new Set(heuristic.products.map((product) => product.id));
  const recommendedIds = uniqueStrings(parsed.recommendedIds).filter((id) => allowedIds.has(id));
  const orderedIds = recommendedIds.length
    ? recommendedIds
    : heuristic.products.map((product) => product.id);
  const orderedProducts = [
    ...orderedIds
      .map((id) => heuristic.products.find((product) => product.id === id))
      .filter(Boolean),
    ...heuristic.products.filter((product) => !orderedIds.includes(product.id))
  ];

  return {
    source: "openai-agent",
    assistantNote:
      typeof parsed.assistantNote === "string"
        ? parsed.assistantNote
        : "I found a grounded set of options from the static demo catalog.",
    styleDiagnosis: uniqueStrings(parsed.styleDiagnosis).slice(0, 4),
    outfitIdeas: normalizeOutfits(parsed.outfitIdeas, allowedIds).slice(0, 3),
    avoid: uniqueStrings(parsed.avoid).slice(0, 3),
    products: orderedProducts,
    guidance: heuristic.guidance,
    profileSummary: heuristic.profileSummary,
    similarTo: heuristic.similarTo
  };
}

function normalizeOutfits(outfits, allowedIds) {
  if (!Array.isArray(outfits)) {
    return [];
  }

  return outfits
    .map((outfit) => ({
      title: typeof outfit.title === "string" ? outfit.title : "Styled set",
      productIds: uniqueStrings(outfit.productIds).filter((id) => allowedIds.has(id)),
      reason: typeof outfit.reason === "string" ? outfit.reason : ""
    }))
    .filter((outfit) => outfit.productIds.length);
}

function uniqueStrings(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()))];
}

function parseJson(value) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

