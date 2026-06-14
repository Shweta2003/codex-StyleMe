import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { demoProfiles } from "../data/demoProfiles.js";
import { products } from "../data/products.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, "public", "demoData.js");

const payload = {
  profiles: demoProfiles,
  products,
  hasOpenAIKey: false,
  model: "static-demo"
};

await writeFile(
  target,
  `window.DEMO_DATA = ${JSON.stringify(payload, null, 2)};\n`,
  "utf8"
);

console.log(`Wrote ${target}`);
