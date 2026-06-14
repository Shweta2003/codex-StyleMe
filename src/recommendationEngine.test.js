import test from "node:test";
import assert from "node:assert/strict";
import { products } from "../data/products.js";
import { demoProfiles } from "../data/demoProfiles.js";
import { getSimilarProducts, recommendProducts } from "./recommendationEngine.js";

test("returns body and face aware recommendations", () => {
  const maya = demoProfiles.find((profile) => profile.id === "maya");
  const result = recommendProducts({
    products,
    profile: maya,
    preferences: { occasion: "work", budget: 120, styleMood: "classic" },
    limit: 5
  });

  assert.equal(result.products.length, 5);
  assert.equal(result.profileSummary.bodyType, "hourglass");
  assert.ok(result.products.some((product) => product.reasons.join(" ").includes("body")));
});

test("similar products exclude the seed item", () => {
  const similar = getSimilarProducts({
    products,
    seedProductId: "p-cropped-blazer",
    limit: 4
  });

  assert.equal(similar.length, 4);
  assert.ok(similar.every((product) => product.id !== "p-cropped-blazer"));
});

test("budget preference changes ranking pressure", () => {
  const sam = demoProfiles.find((profile) => profile.id === "sam");
  const result = recommendProducts({
    products,
    profile: sam,
    preferences: { occasion: "campus", budget: 50, styleMood: "street" },
    limit: 5
  });

  assert.ok(result.products[0].price <= 110);
  assert.ok(result.products.some((product) => product.occasions.includes("campus")));
});

test("kid profile prioritizes kid-safe school and play products", () => {
  const lina = demoProfiles.find((profile) => profile.id === "lina");
  const result = recommendProducts({
    products,
    profile: lina,
    preferences: { occasion: "school", budget: 60, styleMood: "comfort" },
    limit: 5
  });

  assert.equal(lina.ageGroup, "kid");
  assert.ok(result.products.length > 0);
  assert.ok(result.products.slice(0, 3).every((product) => product.sizeRange.includes("Kids")));
  assert.ok(result.guidance.bodyType.label.includes("Kids"));
});
