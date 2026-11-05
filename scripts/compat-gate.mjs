#!/usr/bin/env node
// Compatibility gate: compare the working OpenAPI spec with the approved baseline
// under changes-rules.yaml and exit non-zero when anything is breaking.
//
// Documentation-only edits (descriptions, summaries, tags, examples) are advisory
// under changes-rules.yaml. A deliberate breaking change has to update
// api/baseline/openapi.yaml in the same pull request, which makes the break visible
// to reviewers instead of slipping through.
//
// Usage: node scripts/compat-gate.mjs [baseline.yaml] [candidate.yaml]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { repoRoot } from "./lib/env.mjs";

const tool = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "openapi-changes.cmd" : "openapi-changes",
);
if (!fs.existsSync(tool)) {
  console.error(
    `compat-gate: ${tool} is missing. \`make setup\` installs it (the postinstall script downloads the binary from github.com).`,
  );
  process.exit(2);
}

const baseline = path.resolve(process.argv[2] ?? path.join(repoRoot, "api", "baseline", "openapi.yaml"));
const candidate = path.resolve(process.argv[3] ?? path.join(repoRoot, "api", "openapi.yaml"));
const rules = path.join(repoRoot, "changes-rules.yaml");

const result = spawnSync(
  tool,
  ["report", "--reproducible", "--no-color", "--config", rules, baseline, candidate],
  { cwd: repoRoot, encoding: "utf8" },
);
if (result.error) throw result.error;
if (!result.stdout.trim()) {
  console.error(`compat-gate: openapi-changes returned no report: ${result.stderr.trim()}`);
  process.exit(2);
}

const breaking = [];
const walk = (value) => {
  if (Array.isArray(value)) return value.forEach(walk);
  if (!value || typeof value !== "object") return;
  if (value.breaking === true) breaking.push(value);
  Object.values(value).forEach(walk);
};
walk(JSON.parse(result.stdout));

const rel = (file) => path.relative(repoRoot, file) || file;
if (breaking.length === 0) {
  console.log(`compat-gate: no breaking changes between ${rel(baseline)} and ${rel(candidate)}`);
  process.exit(0);
}

console.error(`compat-gate: ${breaking.length} breaking change${breaking.length === 1 ? "" : "s"} against ${rel(baseline)}`);
const lines = breaking.map((change) => {
  const what = [change.changeText, change.property].filter(Boolean).join(" ");
  const detail = change.original !== undefined ? ` (was: ${JSON.stringify(change.original)})` : "";
  return `${what} at ${change.path}${detail}`;
});
for (const line of lines) {
  console.error(`  BREAKING  ${line}`);
  if (process.env.GITHUB_ACTIONS) console.error(`::error title=Breaking API change::${line}`);
}
console.error("compat-gate: update api/baseline/openapi.yaml in this pull request if the break is intended and approved.");

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Compatibility gate: blocked\n\n${lines.map((line) => `- ${line}`).join("\n")}\n\nUpdate \`api/baseline/openapi.yaml\` in this pull request if the break is intended and approved.\n`,
  );
}
process.exit(1);
