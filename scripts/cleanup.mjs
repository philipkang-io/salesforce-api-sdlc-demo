#!/usr/bin/env node
// Delete any Loyalty_Member__c test records a failed run left behind
// (Name starts with SDLC-Demo-). Real member records are never touched.
//
// Usage: node scripts/cleanup.mjs [--dry-run]
import { getToken } from "./sf-token.mjs";

const dryRun = process.argv.includes("--dry-run");
const { accessToken, instanceUrl } = await getToken();
const api = `${instanceUrl}/services/data/v68.0`;
const headers = { Authorization: `Bearer ${accessToken}` };

const soql = "SELECT Id, Name FROM Loyalty_Member__c WHERE Name LIKE 'SDLC-Demo-%'";
const response = await fetch(`${api}/query?q=${encodeURIComponent(soql)}`, { headers });
if (!response.ok) {
  console.error(`cleanup: query failed: HTTP ${response.status} ${await response.text()}`);
  process.exit(1);
}
const { records } = await response.json();
if (records.length === 0) {
  console.log("cleanup: no SDLC-Demo-* records to delete");
  process.exit(0);
}

for (const record of records) {
  if (dryRun) {
    console.log(`cleanup: would delete ${record.Name} (${record.Id})`);
    continue;
  }
  const res = await fetch(`${api}/sobjects/Loyalty_Member__c/${record.Id}`, { method: "DELETE", headers });
  console.log(`cleanup: ${res.ok ? "deleted" : `FAILED (HTTP ${res.status})`} ${record.Name} (${record.Id})`);
  if (!res.ok) process.exitCode = 1;
}
