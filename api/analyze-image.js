import {
  applyCors,
  getImageAnalysisPayload,
  handleOptions,
  methodNotAllowed,
  readJson,
  sendJson
} from "../src/apiHandlers.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }
  applyCors(req, res);

  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  const body = await readJson(req);
  return sendJson(res, await getImageAnalysisPayload(body));
}
