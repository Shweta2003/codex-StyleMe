import { applyCors, getBootstrapPayload, handleOptions, methodNotAllowed, sendJson } from "../src/apiHandlers.js";

export default function handler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }
  applyCors(req, res);

  if (req.method !== "GET") {
    return methodNotAllowed(res);
  }

  return sendJson(res, getBootstrapPayload());
}
