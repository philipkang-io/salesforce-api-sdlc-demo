#!/usr/bin/env node
// Run the smoke collection against the Salesforce org with the Postman CLI.
//
// Credentials come from .env locally or from CI secrets, and are passed to the
// CLI as environment variables (never printed). Extra arguments go to
// `postman collection run`, e.g. --report-events in CI.
//
// The default collection is the file the Postman Git integration syncs with the
// workspace (see .postman/config.json), so the repo and the cloud run the same tests.
//
// Usage: node scripts/run-smoke.mjs [collection id or path] [postman collection run options]
import path from "node:path";
import { spawn } from "node:child_process";
import { loadEnv, repoRoot, requireEnv } from "./lib/env.mjs";

const args = process.argv.slice(2);
const collection =
  args[0] && !args[0].startsWith("-")
    ? args.shift()
    : path.join(
        repoRoot,
        "postman",
        "collections",
        "Salesforce sObjects Smoke_52509354-dec5cd76-b18a-4efd-bf52-92b0c085b1f6.postman_collection.json",
      );

const { SF_MY_DOMAIN, SF_CLIENT_ID, SF_CLIENT_SECRET } = requireEnv(loadEnv(), [
  "SF_MY_DOMAIN",
  "SF_CLIENT_ID",
  "SF_CLIENT_SECRET",
]);

const code = await new Promise((resolve) => {
  const child = spawn(
    "postman",
    [
      "collection",
      "run",
      collection,
      "--env-var",
      `sfMyDomain=${SF_MY_DOMAIN.replace(/\/$/, "")}`,
      "--env-var",
      `sfClientId=${SF_CLIENT_ID}`,
      "--env-var",
      `sfClientSecret=${SF_CLIENT_SECRET}`,
      ...args,
    ],
    { stdio: "inherit" },
  );
  child.once("error", (error) => {
    console.error(`run-smoke: could not start the Postman CLI: ${error.message}`);
    resolve(1);
  });
  child.once("exit", (exitCode, signal) => resolve(exitCode ?? (signal ? 1 : 0)));
});
process.exitCode = code;
