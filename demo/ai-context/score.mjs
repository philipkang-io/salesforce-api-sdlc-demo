#!/usr/bin/env node
// Score an AI-written enrollGoldMember() against what the Salesforce org
// actually accepts. Static checks on the generated code; nothing is executed.
//
// Usage: node demo/ai-context/score.mjs <answer.md> [more answers...]
import fs from "node:fs";
import path from "node:path";

const checks = [
  ["Token: client credentials grant", (c) => /grant_type['"]?\s*[,:=]\s*['"]?client_credentials|grant_type=client_credentials/.test(c)],
  ["Token: form-encoded body", (c) => /x-www-form-urlencoded|URLSearchParams/.test(c)],
  ["Endpoint: /services/data/vNN.N/sobjects/Loyalty_Member__c", (c) => /\/services\/data\/v\d+\.\d+\/sobjects\/Loyalty_Member__c\b/.test(c)],
  ["Field: Member_Number__c", (c) => /\bMember_Number__c\b/.test(c)],
  ["Field: Tier__c", (c) => /\bTier__c\b/.test(c)],
  ["Picklist value: exactly \"Gold\"", (c) => /\bTier__c['"]?\s*:\s*['"]Gold['"]/.test(c)],
  ["Reads the new id from the response", (c) => /\.id\b|\[['"]id['"]\]/.test(c)],
];

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: score.mjs <answer.md> [more answers...]");
  process.exit(2);
}

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const code = (text.match(/```(?:ts|typescript)?\n([\s\S]*?)```/) ?? [null, text])[1];
  const results = checks.map(([label, test]) => [label, test(code)]);
  const passed = results.filter(([, ok]) => ok).length;
  console.log(`\n${path.basename(file)}: ${passed}/${checks.length}`);
  for (const [label, ok] of results) console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  const endpoints = [...new Set(code.match(/\/(?:services|api|v\d)[^\s'"`$]*/g) ?? [])];
  if (endpoints.length) console.log(`  endpoints used: ${endpoints.join(", ")}`);
}
