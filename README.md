# AI Fit Stylist Demo

This is a scratch website prototype for a commerce fashion assistant. It uses:

- Pre-selected demo shopper images and profile metadata.
- A static product catalog.
- Heuristic matching for body type, face shape, age group, style, occasion, budget, and "similar item" discovery.
- AI based image analysis.
- Optional OpenAI Agents SDK integration on the backend.
- Optional uploaded-photo analysis through the OpenAI Responses API with image input.

It intentionally does not include live image uploads, real body segmentation, live marketplace APIs, authentication, or user personalization storage.

## Run locally

```powershell
npm install
Copy-Item .env.example .env
# Add your real OPENAI_API_KEY in .env for AI agent mode.
npm start
```

Open `http://localhost:5173`.

The app still runs without an API key. In that case it returns local heuristic recommendations and marks the response as `heuristic`.

## OpenAI setup

The backend uses `@openai/agents` when `OPENAI_API_KEY` is present. The default model is `gpt-5.5`; set `OPENAI_MODEL=gpt-5.4-mini` if you want a lower-latency demo profile.
Uploaded-photo analysis uses `OPENAI_VISION_MODEL` when present, otherwise it reuses `OPENAI_MODEL`.

The stylist agent is grounded through one tool:

- `rank_static_catalog`: calls the local recommendation engine and returns eligible products from the static catalog.

The agent is instructed to avoid inventing products, avoid body-shaming language, and return JSON that the UI can render.

The upload endpoint is:

```text
POST /api/analyze-image
```

It accepts a compressed Base64 image data URL plus user-entered preferences. If OpenAI image analysis is unavailable, it falls back to preference-based recommendations.

## Important files

- `server.js`: plain Node server and API routes.
- `src/recommendationEngine.js`: deterministic scoring, similar-product matching, and style guidance.
- `src/openaiStylistAgent.js`: optional OpenAI Agents SDK integration.
- `data/products.js`: static catalog.
- `data/demoProfiles.js`: pre-selected shoppers and mock analysis metadata.
- `public/app.js`: storefront interactions.
- `public/styles.css`: ecommerce-style UI.

## Test

```powershell
npm test
```
