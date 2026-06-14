import { applyCors, getSimilarPayload, handleOptions, methodNotAllowed, sendJson } from "../src/apiHandlers.js";

export default function handler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }
  applyCors(req, res);

  if (req.method !== "GET") {
    return methodNotAllowed(res);
  }

  const requestUrl = new URL(req.url, `https://${req.headers?.host || "localhost"}`);
  const seedProductId = requestUrl.searchParams.get("seedProductId");
  return sendJson(res, getSimilarPayload(seedProductId));
}
