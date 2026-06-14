import bootstrapHandler from "../api/bootstrap.js";
import recommendationsHandler from "../api/recommendations.js";
import similarHandler from "../api/similar.js";

const bootstrap = await callHandler(bootstrapHandler, { method: "GET", url: "/api/bootstrap" });
if (!Array.isArray(bootstrap.body.profiles) || !bootstrap.body.profiles.length) {
  throw new Error("Expected profiles from Vercel bootstrap handler");
}

const recommendations = await callHandler(recommendationsHandler, {
  method: "POST",
  url: "/api/recommendations",
  body: {
    profileId: "maya",
    preferences: {
      occasion: "work",
      styleMood: "classic",
      fit: "balanced",
      budget: 120
    }
  }
});
if (!Array.isArray(recommendations.body.products) || !recommendations.body.products.length) {
  throw new Error("Expected products from Vercel recommendations handler");
}

const similar = await callHandler(similarHandler, {
  method: "GET",
  url: "/api/similar?seedProductId=p-wrap-dress"
});
if (!Array.isArray(similar.body.products)) {
  throw new Error("Expected products from Vercel similar handler");
}

console.log("Vercel API smoke test passed");

function callHandler(handler, req) {
  return new Promise((resolve, reject) => {
    const headers = {};
    req.headers = req.headers ?? {};
    const res = {
      statusCode: 200,
      setHeader(key, value) {
        headers[key.toLowerCase()] = value;
      },
      end(raw = "") {
        try {
          resolve({
            statusCode: this.statusCode,
            headers,
            body: raw ? JSON.parse(raw) : null
          });
        } catch (error) {
          reject(error);
        }
      }
    };

    Promise.resolve(handler(req, res)).catch(reject);
  });
}
