# AI Fit Stylist Demo

This is a scratch website prototype for a commerce fashion assistant. It uses:

- Pre-selected demo shopper images and profile metadata.
- A static product catalog.
- Heuristic matching for body type, face shape, age group, style, occasion, budget, and "similar item" discovery.
- Optional OpenAI Agents SDK integration on the backend.

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

The stylist agent is grounded through one tool:

- `rank_static_catalog`: calls the local recommendation engine and returns eligible products from the static catalog.

The agent is instructed to avoid inventing products, avoid body-shaming language, and return JSON that the UI can render.

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

## Host client and server separately

The frontend can be hosted as a static site, while `server.js` runs as a separate Node backend.

Backend environment:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5.5
PORT=5173
ALLOWED_ORIGIN=https://your-client-site.netlify.app
```

Client build environment:

```env
CLIENT_API_BASE_URL=https://your-backend-host.example.com
```

Build the static client:

```powershell
npm run build:client
```

Deploy the `public` folder to Netlify or Vercel. For Vercel backend hosting, deploy the full project and use the `api/` serverless functions instead of `server.js`.

Vercel backend settings:

```text
Framework Preset: Other
Root Directory: ./
Install Command: npm install
Build Command: leave empty
Output Directory: leave empty / N/A
```

Vercel backend environment:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5.5
ALLOWED_ORIGIN=https://your-client-site.netlify.app
```

After deployment, your backend URLs are:

```text
https://your-vercel-backend.vercel.app/api/bootstrap
https://your-vercel-backend.vercel.app/api/recommendations
https://your-vercel-backend.vercel.app/api/similar
```
