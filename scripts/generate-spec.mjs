#!/usr/bin/env node
// Ask the Salesforce org to generate its own OpenAPI 3 spec (REST API OpenAPI
// generation, beta) and save it to api/source/openapi.json.
//
// The request comes from api/spec-request.json. The job is asynchronous:
// POST the request, poll the job until it completes, then download the results.
// Salesforce keeps the results for 48 hours.
//
// Salesforce does not return object keys in a stable order, so keys are sorted
// before saving. A diff in api/source/openapi.json is then always a real change.
//
// Never hand-edit api/source/openapi.json; fixes belong in the overlay.
//
// Usage: node scripts/generate-spec.mjs [output path]
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib/env.mjs";
import { getToken } from "./sf-token.mjs";

const POLL_MS = 3000;
const TIMEOUT_MS = 180000;

const request = JSON.parse(fs.readFileSync(path.join(repoRoot, "api", "spec-request.json"), "utf8"));
const output = path.resolve(process.argv[2] ?? path.join(repoRoot, "api", "source", "openapi.json"));

const { accessToken, instanceUrl } = await getToken();
const base = `${instanceUrl}/services/data/${request.apiVersion}/async/specifications/oas3`;
const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

async function call(url, init = {}) {
  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    console.error(`generate-spec: HTTP ${response.status} from ${url.replace(instanceUrl, "")}: ${text.slice(0, 500)}`);
    process.exit(1);
  }
  return JSON.parse(text);
}

const started = Date.now();
const job = await call(base, { method: "POST", body: JSON.stringify(request.body) });
console.log(`generate-spec: job ${job.id} submitted (${request.body.sobjects.include.join(", ")})`);

let status = job.apiTaskStatus;
while (status !== "COMPLETED") {
  if (["FAILED", "ERROR", "CANCELLED"].includes(status)) {
    console.error(`generate-spec: job ${job.id} ended with status ${status}`);
    process.exit(1);
  }
  if (Date.now() - started > TIMEOUT_MS) {
    console.error(`generate-spec: job ${job.id} still ${status} after ${TIMEOUT_MS / 1000}s`);
    process.exit(1);
  }
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  status = (await call(`${base}/${job.id}`)).apiTaskStatus;
}

const sortKeys = (value) =>
  Array.isArray(value)
    ? value.map(sortKeys)
    : value && typeof value === "object"
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]))
      : value;

const spec = sortKeys(await call(`${base}/${job.id}/results`));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(spec, null, 2)}\n`);

const operations = Object.values(spec.paths ?? {}).flatMap((item) =>
  Object.keys(item).filter((key) => ["get", "put", "post", "patch", "delete"].includes(key)),
);
console.log(
  `generate-spec: wrote ${path.relative(repoRoot, output)} in ${((Date.now() - started) / 1000).toFixed(1)}s: ` +
    `OpenAPI ${spec.openapi}, ${Object.keys(spec.paths ?? {}).length} paths, ${operations.length} operations, ` +
    `${Object.keys(spec.components?.schemas ?? {}).length} schemas`,
);
