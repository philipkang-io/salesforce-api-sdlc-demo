// Shared helpers: repo root, .env loading, and required-variable checks.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadEnv(root = repoRoot) {
  const envPath = path.join(root, ".env");
  const out = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  // Real environment (CI secrets) wins over .env values.
  return { ...out, ...process.env };
}

export function requireEnv(env, names) {
  const missing = names.filter((name) => !env[name]);
  if (missing.length) {
    console.error(`missing ${missing.join(", ")} (set them in .env locally, or as CI secrets)`);
    process.exit(2);
  }
  return Object.fromEntries(names.map((name) => [name, env[name]]));
}
