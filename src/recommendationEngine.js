const bodyGuidance = {
  hourglass: {
    label: "Hourglass balance",
    tips: [
      "Define the waist with wrap shapes, belts, or clean tucks.",
      "Keep fabric close enough to show shape while still allowing movement."
    ],
    favoredCuts: ["wrap", "belted", "high-rise", "semi-fitted", "tailored"]
  },
  rectangle: {
    label: "Rectangle balance",
    tips: [
      "Use cropped layers, texture, and waist breaks to create dimension.",
      "Structured overshirts, blazers, and tapered bottoms add shape quickly."
    ],
    favoredCuts: ["cropped", "structured", "layered", "tapered", "textured"]
  },
  oval: {
    label: "Oval balance",
    tips: [
      "Open-front layers, vertical lines, and soft structure create a clean line.",
      "Semi-fitted pieces usually look sharper than clingy or boxy extremes."
    ],
    favoredCuts: ["open-front", "vertical", "v-neck", "longline", "semi-fitted"]
  },
  triangle: {
    label: "Triangle balance",
    tips: [
      "Draw interest upward with neckline detail, polished tops, and light layers.",
      "A-line and fluid bottoms keep movement comfortable and balanced."
    ],
    favoredCuts: ["a-line", "textured", "v-neck", "wrap", "fluid"]
  },
  "inverted-triangle": {
    label: "Inverted triangle balance",
    tips: [
      "Add movement below the waist with wide-leg or fluid bottoms.",
      "Softer necklines can balance a strong shoulder line."
    ],
    favoredCuts: ["wide-leg", "fluid", "open-collar", "soft", "high-rise"]
  },
  athletic: {
    label: "Athletic balance",
    tips: [
      "Layer texture and relaxed structure to add visual interest.",
      "Tapered bottoms and overshirts keep the silhouette sharp."
    ],
    favoredCuts: ["textured", "tapered", "relaxed", "layered", "straight"]
  },
  petite: {
    label: "Petite balance",
    tips: [
      "Cropped jackets, high-rise bottoms, and tonal outfits keep proportions crisp.",
      "Avoid unnecessary bulk where a shorter line would work."
    ],
    favoredCuts: ["cropped", "high-rise", "monochrome", "platform", "straight-leg"]
  },
  tall: {
    label: "Tall balance",
    tips: [
      "Longline layers, wide-leg trousers, and bold texture suit a longer frame.",
      "Break up vertical space with layers or contrast when the outfit needs energy."
    ],
    favoredCuts: ["longline", "wide-leg", "textured", "straight-leg", "layered"]
  },
  kid: {
    label: "Kids comfort fit",
    tips: [
      "Prioritize washable fabrics, easy fastenings, and room for movement.",
      "Keep styling age-appropriate and activity-ready instead of focusing on body shape."
    ],
    favoredCuts: ["easy-care", "washable", "pull-on", "easy-strap", "relaxed", "supportive"]
  }
};

const faceGuidance = {
  oval: {
    label: "Oval face",
    tips: [
      "Most necklines work well; keep the outfit balanced around your strongest feature.",
      "Use accessories to echo the outfit mood rather than correct the face shape."
    ],
    favoredCuts: ["open-collar", "soft", "v-neck", "neck-detail"]
  },
  round: {
    label: "Round face",
    tips: [
      "V-necks, open collars, and vertical earrings can lengthen the face line.",
      "Angular accessories add contrast when the outfit feels too soft."
    ],
    favoredCuts: ["v-neck", "open-front", "vertical", "angular", "open-collar"]
  },
  square: {
    label: "Square face",
    tips: [
      "Soft collars, scarves, and curved accessories balance angular features.",
      "Textured knits can soften sharp tailoring."
    ],
    favoredCuts: ["soft", "neck-detail", "camp-collar", "textured", "rounded"]
  },
  heart: {
    label: "Heart face",
    tips: [
      "Open necklines and soft details keep the upper half light.",
      "Cropped layers and balanced accessories work well around the jawline."
    ],
    favoredCuts: ["cropped", "open-collar", "soft", "neck-detail", "a-line"]
  },
  diamond: {
    label: "Diamond face",
    tips: [
      "Open necklines and shoulder detail balance cheekbone width.",
      "Long vertical layers make the styling feel composed."
    ],
    favoredCuts: ["open-front", "v-neck", "vertical", "structured"]
  },
  oblong: {
    label: "Oblong face",
    tips: [
      "Collars, texture, and shorter neck details can balance face length.",
      "Use horizontal breaks in the outfit when everything feels too vertical."
    ],
    favoredCuts: ["camp-collar", "textured", "neck-detail", "cropped"]
  }
};

const ageGuidance = {
  kid: "For kids, rank comfort, safe movement, easy care, and school/play needs above trend details.",
  teen: "Prioritize easy movement, campus-ready layers, and durable pieces.",
  "young-adult": "Balance trend-aware pieces with staples that can work across occasions.",
  adult: "Use polish, fabric quality, and fit consistency to make outfits repeatable.",
  mature: "Look for comfort, drape, and structure that feels refined rather than stiff."
};

const preferenceStyleMap = {
  classic: ["minimal", "polished", "smart casual", "elegant"],
  street: ["streetwear", "playful", "utility"],
  work: ["polished", "minimal", "smart casual", "elegant"],
  comfort: ["comfortable", "minimal", "utility"],
  bold: ["playful", "streetwear", "structured"]
};

export function getStyleGuidance(profile) {
  const body = bodyGuidance[profile.bodyType] ?? bodyGuidance.rectangle;
  const face = faceGuidance[profile.faceShape] ?? faceGuidance.oval;

  return {
    bodyType: body,
    faceShape: face,
    age: ageGuidance[profile.ageGroup] ?? ageGuidance.adult,
    fitGoal: profile.mockAnalysis?.fitGoal ?? "find pieces that support the shopper's stated style goal"
  };
}

export function recommendProducts({
  products,
  profile,
  preferences = {},
  seedProductId,
  limit = 9
}) {
  const guidance = getStyleGuidance(profile);
  const seed = products.find((product) => product.id === seedProductId);
  const scored = products
    .map((product) => scoreProduct(product, profile, preferences, guidance, seed))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, limit);

  return {
    profileSummary: summarizeProfile(profile),
    guidance,
    similarTo: seed ? compactProduct(seed) : null,
    products: scored.map((item) => ({
      ...compactProduct(item.product),
      score: item.score,
      reasons: item.reasons.slice(0, 4),
      badges: item.badges.slice(0, 3)
    }))
  };
}

export function getSimilarProducts({ products, seedProductId, limit = 6 }) {
  const seed = products.find((product) => product.id === seedProductId);
  if (!seed) {
    return [];
  }

  return products
    .filter((product) => product.id !== seed.id)
    .map((product) => ({
      product,
      score:
        overlap(product.styles, seed.styles) * 3 +
        overlap(product.colors, seed.colors) * 2 +
        overlap(product.cuts, seed.cuts) * 2 +
        (product.category === seed.category ? 4 : 0) +
        (Math.abs(product.price - seed.price) <= 30 ? 2 : 0)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => compactProduct(item.product));
}

export function compactProduct(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    sizeRange: product.sizeRange,
    image: product.image,
    description: product.description,
    colors: product.colors,
    styles: product.styles,
    cuts: product.cuts,
    occasions: product.occasions
  };
}

function scoreProduct(product, profile, preferences, guidance, seed) {
  const reasons = [];
  const badges = [];
  let score = 4;

  if (product.gender.includes(profile.genderPresentation) || product.gender.includes("all")) {
    score += 8;
    reasons.push("Matches the selected gender presentation.");
  } else {
    score -= 5;
  }

  if (product.ageGroups.includes(profile.ageGroup)) {
    score += 4;
    badges.push("age-fit");
  }

  if (product.bodyTypes.includes(profile.bodyType)) {
    score += 10;
    reasons.push(`Works well for ${guidance.bodyType.label.toLowerCase()}.`);
    badges.push("body match");
  }

  if (product.faceShapes.includes(profile.faceShape)) {
    score += 7;
    reasons.push(`Complements a ${guidance.faceShape.label.toLowerCase()}.`);
    badges.push("face match");
  }

  const favoredBodyCuts = overlap(product.cuts, guidance.bodyType.favoredCuts);
  if (favoredBodyCuts) {
    score += favoredBodyCuts * 3;
    reasons.push("Uses cuts that support the body-balance goal.");
  }

  const favoredFaceCuts = overlap(product.cuts, guidance.faceShape.favoredCuts);
  if (favoredFaceCuts) {
    score += favoredFaceCuts * 2;
    reasons.push("Adds neckline or accessory detail suited to the face shape.");
  }

  const occasion = preferences.occasion ?? profile.defaultOccasion;
  if (occasion && product.occasions.includes(occasion)) {
    score += 7;
    badges.push(occasion);
    reasons.push(`Ready for ${occasion} styling.`);
  }

  const desiredStyles = getDesiredStyles(profile, preferences);
  const styleMatches = overlap(product.styles, desiredStyles);
  if (styleMatches) {
    score += styleMatches * 4;
    reasons.push("Matches the preferred style direction.");
  }

  const desiredColors = normalizeList(preferences.colors?.length ? preferences.colors : profile.defaultPalette);
  const colorMatches = overlap(product.colors, desiredColors);
  if (colorMatches) {
    score += colorMatches * 2;
    badges.push("palette");
  }

  const fit = preferences.fit;
  if (fit === "structured" && product.cuts.some((cut) => ["structured", "tailored", "tapered"].includes(cut))) {
    score += 5;
    reasons.push("Leans structured for a sharper fit.");
  }
  if (fit === "relaxed" && product.cuts.some((cut) => ["relaxed", "fluid", "open-front"].includes(cut))) {
    score += 5;
    reasons.push("Keeps the outfit relaxed and comfortable.");
  }

  const budget = Number(preferences.budget ?? profile.defaultBudget ?? 120);
  if (Number.isFinite(budget)) {
    if (product.price <= budget) {
      score += 5;
      badges.push("in budget");
    } else if (product.price > budget * 1.35) {
      score -= 7;
    } else {
      score -= 2;
    }
  }

  if (seed && product.id !== seed.id) {
    const similarity =
      overlap(product.styles, seed.styles) * 2 +
      overlap(product.colors, seed.colors) +
      overlap(product.cuts, seed.cuts) +
      (product.category === seed.category ? 5 : 0);
    if (similarity > 0) {
      score += similarity;
      reasons.push(`Similar to ${seed.name}.`);
      badges.push("similar");
    }
  }

  if (product.id === seed?.id) {
    score -= 100;
  }

  return {
    product,
    score,
    reasons: [...new Set(reasons)],
    badges: [...new Set(badges)]
  };
}

function getDesiredStyles(profile, preferences) {
  const moodStyles = preferenceStyleMap[preferences.styleMood] ?? [];
  return normalizeList([...profile.styleWords, ...moodStyles]);
}

function overlap(a = [], b = []) {
  const bSet = new Set(normalizeList(b));
  return normalizeList(a).filter((item) => bSet.has(item)).length;
}

function normalizeList(items = []) {
  return items.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
}

function summarizeProfile(profile) {
  return {
    id: profile.id,
    name: profile.name,
    age: profile.age,
    ageGroup: profile.ageGroup,
    genderPresentation: profile.genderPresentation,
    bodyType: profile.bodyType,
    faceShape: profile.faceShape,
    size: profile.size,
    styleWords: profile.styleWords,
    mockAnalysis: profile.mockAnalysis
  };
}
