const allowedBodyTypes = [
  "hourglass",
  "rectangle",
  "oval",
  "triangle",
  "inverted-triangle",
  "athletic",
  "petite",
  "tall",
  "kid"
];

const allowedFaceShapes = ["oval", "round", "square", "heart", "diamond", "oblong"];
const allowedAgeGroups = ["kid", "teen", "young-adult", "adult", "mature"];
const allowedGenderPresentations = ["women", "men", "all", "kids"];
const allowedStyles = [
  "polished",
  "minimal",
  "soft tailoring",
  "smart casual",
  "utility",
  "structured",
  "elegant",
  "comfortable",
  "vertical lines",
  "streetwear",
  "playful",
  "layered",
  "easy-care"
];

export async function analyzeImageToProfile({ imageDataUrl, preferences = {} }) {
  const validationError = validateImageDataUrl(imageDataUrl);
  if (validationError) {
    return {
      source: "image-invalid",
      aiError: {
        code: "invalid-image",
        message: validationError
      },
      profile: buildFallbackProfile(preferences),
      observations: ["The uploaded file could not be analyzed, so the app used preference-based matching."]
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      source: "image-fallback",
      aiError: {
        code: "missing-api-key",
        message: "OPENAI_API_KEY was not available to the server process."
      },
      profile: buildFallbackProfile(preferences),
      observations: ["OpenAI image analysis is not configured, so the app used preference-based matching."]
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-5.5",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildPrompt(preferences)
              },
              {
                type: "input_image",
                image_url: imageDataUrl
              }
            ]
          }
        ],
        max_output_tokens: 900
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status} ${trimError(errorText)}`);
    }

    const payload = await response.json();
    const parsed = parseJson(extractOutputText(payload));
    if (!parsed) {
      throw new Error("The vision response was not valid JSON.");
    }

    return {
      source: "image-openai",
      aiError: null,
      profile: normalizeVisionProfile(parsed, preferences),
      observations: normalizeStringList(parsed.observations).slice(0, 4)
    };
  } catch (error) {
    return {
      source: "image-fallback",
      aiError: {
        code: "image-analysis-failed",
        message: error.message
      },
      profile: buildFallbackProfile(preferences),
      observations: ["Image analysis failed, so the app used preference-based matching."]
    };
  }
}

export function buildFallbackProfile(preferences = {}) {
  const ageGroup = normalizeChoice(preferences.ageGroup, allowedAgeGroups, "adult");
  const genderPresentation = normalizeChoice(
    preferences.genderPresentation,
    allowedGenderPresentations,
    ageGroup === "kid" ? "kids" : "all"
  );
  const styleMood = preferences.styleMood || "comfort";
  const bodyType = ageGroup === "kid" ? "kid" : "rectangle";

  return {
    id: "uploaded",
    name: "Uploaded Photo",
    age: null,
    ageGroup,
    genderPresentation,
    bodyType,
    faceShape: "oval",
    size: "From photo",
    heightBand: ageGroup === "kid" ? "growing" : "unknown",
    undertone: "neutral",
    styleWords: fallbackStyles(styleMood),
    defaultOccasion: preferences.occasion || "weekend",
    defaultBudget: Number(preferences.budget) || 120,
    defaultPalette: normalizeStringList(preferences.colors).length
      ? normalizeStringList(preferences.colors).slice(0, 3)
      : ["black", "cream", "denim"],
    mockAnalysis: {
      shoulderBalance: "estimated",
      waistDefinition: ageGroup === "kid" ? "not used" : "estimated",
      verticalLine: "estimated",
      faceCut: "not analyzed",
      fitGoal: "use the uploaded photo with preference-based styling signals"
    }
  };
}

function buildPrompt(preferences) {
  return [
    "Analyze this fashion image for a shopping recommendation demo.",
    "Return JSON only, with no markdown.",
    "Do not identify the person, name them, or infer identity.",
    "Use the user-provided age group and gender presentation from the text below; do not infer exact age or gender from the image.",
    "Focus on visible styling cues: clothing category, silhouette, colors, formality, layering, and broad styling balance.",
    "For a child age group, avoid body-shape labeling and use bodyType 'kid'.",
    "Allowed bodyType values: hourglass, rectangle, oval, triangle, inverted-triangle, athletic, petite, tall, kid.",
    "Allowed faceShape values: oval, round, square, heart, diamond, oblong. If unclear, use oval.",
    "Allowed styleWords: polished, minimal, soft tailoring, smart casual, utility, structured, elegant, comfortable, vertical lines, streetwear, playful, layered, easy-care.",
    "Allowed color words should match common catalog colors like black, cream, olive, navy, stone, forest, charcoal, plum, silver, denim, white, red, yellow.",
    "JSON shape:",
    JSON.stringify({
      bodyType: "rectangle",
      faceShape: "oval",
      styleWords: ["comfortable", "minimal"],
      defaultPalette: ["black", "cream", "denim"],
      heightBand: "unknown",
      undertone: "neutral",
      shoulderBalance: "estimated",
      waistDefinition: "estimated",
      verticalLine: "estimated",
      faceCut: "estimated oval",
      fitGoal: "short styling goal",
      observations: ["short visible styling observation"]
    }),
    `User-provided preferences: ${JSON.stringify({
      ageGroup: preferences.ageGroup || "adult",
      genderPresentation: preferences.genderPresentation || "all",
      occasion: preferences.occasion || "weekend",
      styleMood: preferences.styleMood || "comfort",
      fit: preferences.fit || "balanced",
      budget: preferences.budget || 120
    })}`
  ].join("\n");
}

function normalizeVisionProfile(raw, preferences) {
  const ageGroup = normalizeChoice(preferences.ageGroup, allowedAgeGroups, "adult");
  const genderPresentation = normalizeChoice(
    preferences.genderPresentation,
    allowedGenderPresentations,
    ageGroup === "kid" ? "kids" : "all"
  );
  const bodyType =
    ageGroup === "kid"
      ? "kid"
      : normalizeChoice(raw.bodyType, allowedBodyTypes.filter((item) => item !== "kid"), "rectangle");
  const styleWords = normalizeStringList(raw.styleWords)
    .filter((item) => allowedStyles.includes(item))
    .slice(0, 4);
  const palette = normalizeStringList(raw.defaultPalette).slice(0, 4);

  return {
    id: "uploaded",
    name: "Uploaded Photo",
    age: null,
    ageGroup,
    genderPresentation,
    bodyType,
    faceShape: normalizeChoice(raw.faceShape, allowedFaceShapes, "oval"),
    size: "From photo",
    heightBand: safeText(raw.heightBand, ageGroup === "kid" ? "growing" : "unknown"),
    undertone: safeText(raw.undertone, "neutral"),
    styleWords: styleWords.length ? styleWords : fallbackStyles(preferences.styleMood),
    defaultOccasion: preferences.occasion || "weekend",
    defaultBudget: Number(preferences.budget) || 120,
    defaultPalette: palette.length ? palette : ["black", "cream", "denim"],
    mockAnalysis: {
      shoulderBalance: safeText(raw.shoulderBalance, "estimated"),
      waistDefinition: ageGroup === "kid" ? "not used" : safeText(raw.waistDefinition, "estimated"),
      verticalLine: safeText(raw.verticalLine, "estimated"),
      faceCut: safeText(raw.faceCut, "estimated"),
      fitGoal: safeText(raw.fitGoal, "use the uploaded photo for style-aware matching")
    }
  };
}

function validateImageDataUrl(value) {
  if (typeof value !== "string") {
    return "Expected a base64 image data URL.";
  }
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(value)) {
    return "Only PNG, JPEG, or WebP image uploads are supported.";
  }
  if (value.length > 4_500_000) {
    return "Image is too large after compression.";
  }
  return null;
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("\n")
    .trim();
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

function normalizeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
}

function safeText(value, fallback) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }
  return value.trim().slice(0, 120);
}

function fallbackStyles(styleMood) {
  if (styleMood === "street") return ["streetwear", "comfortable", "layered"];
  if (styleMood === "bold") return ["playful", "structured", "polished"];
  if (styleMood === "work") return ["polished", "minimal", "smart casual"];
  if (styleMood === "classic") return ["minimal", "polished", "elegant"];
  return ["comfortable", "minimal", "easy-care"];
}

function trimError(value) {
  return String(value).replace(/\s+/g, " ").slice(0, 260);
}
