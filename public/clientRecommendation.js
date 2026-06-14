(function () {
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

  function recommend({ profiles, products, profileId, preferences, seedProductId }) {
    const profile = profiles.find((item) => item.id === profileId) ?? profiles[0];
    const normalized = normalizePreferences(preferences, profile);
    const guidance = getStyleGuidance(profile);
    const seed = products.find((product) => product.id === seedProductId);
    const ranked = products
      .map((product) => scoreProduct(product, profile, normalized, guidance, seed))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
      .slice(0, 9)
      .map((item) => ({
        ...compactProduct(item.product),
        score: item.score,
        reasons: item.reasons.slice(0, 4),
        badges: displayBadges(item.badges).slice(0, 4)
      }));

    return {
      source: "static-demo",
      model: null,
      preferences: normalized,
      guidance,
      profileSummary: profile,
      similarTo: seed ? compactProduct(seed) : null,
      products: ranked,
      assistantNote: buildLocalNote(profile, ranked),
      styleDiagnosis: [guidance.bodyType.tips[0], guidance.faceShape.tips[0], guidance.age],
      outfitIdeas: buildLocalOutfits(ranked),
      avoid: [
        "Avoid choosing size only from the label; compare garment measurements when available.",
        "Avoid over-indexing on body type; occasion, comfort, and personal taste should still lead."
      ]
    };
  }

  function getStyleGuidance(profile) {
    return {
      bodyType: bodyGuidance[profile.bodyType] ?? bodyGuidance.rectangle,
      faceShape: faceGuidance[profile.faceShape] ?? faceGuidance.oval,
      age: ageGuidance[profile.ageGroup] ?? ageGuidance.adult,
      fitGoal: profile.mockAnalysis?.fitGoal ?? "find pieces that support the shopper's stated style goal"
    };
  }

  function scoreProduct(product, profile, preferences, guidance, seed) {
    const reasons = [];
    const badges = [product.category];
    let score = 4;

    if (product.gender.includes(profile.genderPresentation) || product.gender.includes("all")) {
      score += 8;
      reasons.push("Matches the selected gender presentation.");
    } else {
      score -= 5;
    }

    if (product.ageGroups.includes(profile.ageGroup)) {
      score += 4;
      badges.push(profile.ageGroup === "kid" ? "kids" : "age fit");
    }

    if (product.bodyTypes.includes(profile.bodyType)) {
      score += 10;
      reasons.push(`Works well for ${guidance.bodyType.label.toLowerCase()}.`);
      badges.push(profile.bodyType === "kid" ? "comfort fit" : "body match");
    }

    if (product.faceShapes.includes(profile.faceShape)) {
      score += 7;
      reasons.push(`Complements a ${guidance.faceShape.label.toLowerCase()}.`);
      if (profile.ageGroup !== "kid") {
        badges.push("face match");
      }
    }

    score += overlap(product.cuts, guidance.bodyType.favoredCuts) * 3;
    score += overlap(product.cuts, guidance.faceShape.favoredCuts) * 2;

    if (product.occasions.includes(preferences.occasion)) {
      score += 7;
      badges.push(preferences.occasion);
      reasons.push(`Ready for ${preferences.occasion} styling.`);
    }

    const desiredStyles = normalizeList([
      ...profile.styleWords,
      ...(preferenceStyleMap[preferences.styleMood] ?? [])
    ]);
    const styleMatches = intersection(product.styles, desiredStyles);
    if (styleMatches.length) {
      score += styleMatches.length * 4;
      reasons.push("Matches the preferred style direction.");
      badges.push(styleMatches[0]);
    }

    const colorMatches = intersection(product.colors, preferences.colors);
    if (colorMatches.length) {
      score += colorMatches.length * 2;
      badges.push(`${colorMatches[0]} palette`);
    }

    if (
      preferences.fit === "structured" &&
      product.cuts.some((cut) => ["structured", "tailored", "tapered"].includes(cut))
    ) {
      score += 5;
      reasons.push("Leans structured for a sharper fit.");
      badges.push("structured");
    }

    if (
      preferences.fit === "relaxed" &&
      product.cuts.some((cut) => ["relaxed", "fluid", "open-front"].includes(cut))
    ) {
      score += 5;
      reasons.push("Keeps the outfit relaxed and comfortable.");
      badges.push("relaxed");
    }

    if (product.price <= preferences.budget) {
      score += 5;
      badges.push("in budget");
    } else if (product.price > preferences.budget * 1.35) {
      score -= 7;
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
        if (similarity >= 5) {
          badges.push("similar pick");
        }
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

  function normalizePreferences(preferences, profile) {
    return {
      occasion: choose(preferences.occasion, ["work", "weekend", "date", "event", "campus", "travel", "school", "play", "family"], profile.defaultOccasion),
      styleMood: choose(preferences.styleMood, ["classic", "street", "work", "comfort", "bold"], "classic"),
      fit: choose(preferences.fit, ["balanced", "structured", "relaxed"], "balanced"),
      budget: clamp(Number(preferences.budget), 30, 250, profile.defaultBudget),
      colors: Array.isArray(preferences.colors) ? preferences.colors.slice(0, 5) : profile.defaultPalette,
      notes: typeof preferences.notes === "string" ? preferences.notes.slice(0, 500) : ""
    };
  }

  function buildLocalNote(profile, ranked) {
    const top = ranked[0];
    return top
      ? `For ${profile.name}, I would start with ${top.name} because it lines up with the selected body balance, face shape, occasion, and budget signals in the static catalog.`
      : `I could not find a confident match for ${profile.name} in the demo catalog.`;
  }

  function buildLocalOutfits(recommendedProducts) {
    const firstSet = recommendedProducts
      .filter((product) => ["top", "bottom", "jacket", "shoe", "accessory"].includes(product.category))
      .slice(0, 3);
    const secondSet = recommendedProducts.filter((product) => product.category !== "accessory").slice(1, 4);
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

  function compactProduct(product) {
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

  function overlap(a = [], b = []) {
    const bSet = new Set(normalizeList(b));
    return normalizeList(a).filter((item) => bSet.has(item)).length;
  }

  function intersection(a = [], b = []) {
    const bSet = new Set(normalizeList(b));
    return normalizeList(a).filter((item) => bSet.has(item));
  }

  function normalizeList(items = []) {
    return items.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  }

  function displayBadges(badges = []) {
    return [...new Set(badges)]
      .filter(Boolean)
      .sort((a, b) => badgePriority(a) - badgePriority(b));
  }

  function badgePriority(badge) {
    const value = String(badge).toLowerCase();
    const categoryBadges = new Set(["dress", "jacket", "bottom", "top", "accessory", "set", "shoe"]);
    const occasionBadges = new Set(["work", "weekend", "date", "event", "campus", "travel", "school", "play", "family"]);
    const styleBadges = new Set([
      "polished",
      "minimal",
      "elegant",
      "streetwear",
      "playful",
      "comfortable",
      "utility",
      "smart casual",
      "structured",
      "easy-care"
    ]);

    if (categoryBadges.has(value)) return 0;
    if (occasionBadges.has(value)) return 1;
    if (styleBadges.has(value)) return 2;
    if (value.includes("palette")) return 3;
    if (["structured", "relaxed", "comfort fit", "kids"].includes(value)) return 4;
    if (value === "in budget") return 5;
    if (value.includes("match") || value === "age fit") return 6;
    if (value.includes("similar")) return 7;
    return 8;
  }

  function choose(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function clamp(value, min, max, fallback) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }

  window.CLIENT_RECOMMENDER = { recommend };
})();
