import { spawn } from "node:child_process";

const port = 5273;
const child = spawn(process.execPath, ["server.js"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    PORT: String(port)
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk;
});
child.stderr.on("data", (chunk) => {
  output += chunk;
});

try {
  await waitForServer(port);
  const bootstrap = await fetchJson(`http://127.0.0.1:${port}/api/bootstrap`);
  if (!Array.isArray(bootstrap.profiles) || bootstrap.profiles.length < 4) {
    throw new Error("Expected demo profiles from /api/bootstrap");
  }
  if (!Array.isArray(bootstrap.products) || bootstrap.products.length < 12) {
    throw new Error("Expected product catalog from /api/bootstrap");
  }

  const recommendations = await fetchJson(`http://127.0.0.1:${port}/api/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profileId: "maya",
      preferences: {
        occasion: "work",
        styleMood: "classic",
        fit: "balanced",
        budget: 120
      }
    })
  });

  if (!Array.isArray(recommendations.products) || !recommendations.products.length) {
    throw new Error("Expected recommendations from /api/recommendations");
  }

  console.log("Smoke test passed");
} finally {
  child.kill();
}

async function waitForServer(targetPort) {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early: ${output}`);
    }

    try {
      await fetchJson(`http://127.0.0.1:${targetPort}/api/bootstrap`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  throw new Error(`Server did not start: ${output}`);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}
