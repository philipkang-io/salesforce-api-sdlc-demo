#!/usr/bin/env node
// Salesforce access token via the OAuth 2.0 client credentials flow of the
// External Client App. The token is never printed or written to disk.
//
// Import getToken() from other scripts, or run directly to check the connection:
//   node scripts/sf-token.mjs
// --copy puts the token on the macOS clipboard (pbcopy) without displaying it,
// for pasting into an API Explorer such as the docs site's "Try it".
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadEnv, requireEnv } from "./lib/env.mjs";

export async function getToken(env = loadEnv()) {
  const { SF_CLIENT_ID, SF_CLIENT_SECRET, SF_MY_DOMAIN } = requireEnv(env, [
    "SF_CLIENT_ID",
    "SF_CLIENT_SECRET",
    "SF_MY_DOMAIN",
  ]);
  const response = await fetch(`${SF_MY_DOMAIN.replace(/\/$/, "")}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: SF_CLIENT_ID,
      client_secret: SF_CLIENT_SECRET,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(`token request failed: HTTP ${response.status} ${body.error ?? ""} ${body.error_description ?? ""}`.trim());
  }
  return { accessToken: body.access_token, instanceUrl: body.instance_url, scope: body.scope };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { accessToken, instanceUrl, scope } = await getToken();
    if (process.argv.includes("--copy")) {
      const copied = spawnSync("pbcopy", { input: accessToken });
      if (copied.status !== 0) throw new Error("pbcopy failed; --copy needs macOS");
      console.log(`sf-token: token copied to the clipboard (instance ${instanceUrl}, valid about 2 hours)`);
    } else {
      console.log(`sf-token: ok (instance ${instanceUrl}, scope "${scope}")`);
    }
  } catch (error) {
    console.error(`sf-token: ${error.message}`);
    process.exit(1);
  }
}
