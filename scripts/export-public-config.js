import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, "public", "config.js");

const config = {
  API_BASE_URL: process.env.CLIENT_API_BASE_URL || ""
};

await writeFile(
  target,
  `window.APP_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
  "utf8"
);

console.log(`Wrote ${target}`);
