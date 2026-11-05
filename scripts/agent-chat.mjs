#!/usr/bin/env node
// Talk to an Agentforce agent through the Agent API: start a session, send each
// question in turn (one multi-turn conversation), print the agent's replies,
// then end the session.
//
// The agent ID comes from SF_AGENT_ID, or is looked up by label (default
// "Loyalty Assistant"). The Agent API needs an Agentforce Service Agent that is
// active, and a token with the sfap_api and chatbot_api scopes.
//
// Usage: node scripts/agent-chat.mjs "What tier is member M-1001?" ["How many points?" ...]
import { randomUUID } from "node:crypto";
import { loadEnv } from "./lib/env.mjs";
import { getToken } from "./sf-token.mjs";

const AGENT_API = "https://api.salesforce.com/einstein/ai-agent/v1";
const questions = process.argv.slice(2);
if (questions.length === 0) {
  console.error('usage: agent-chat.mjs "question" ["follow-up" ...]');
  process.exit(2);
}

const env = loadEnv();
const { accessToken, instanceUrl, scope } = await getToken(env);
for (const needed of ["sfap_api", "chatbot_api"]) {
  if (!scope?.split(" ").includes(needed)) {
    console.error(`agent-chat: the token has no ${needed} scope (has "${scope}"). Add it to the External Client App.`);
    process.exit(1);
  }
}
const auth = { Authorization: `Bearer ${accessToken}` };

async function call(method, url, body, extraHeaders = {}) {
  const response = await fetch(url, {
    method,
    headers: { ...auth, "Content-Type": "application/json", ...extraHeaders },
    body: body && JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`agent-chat: ${method} ${url.replace(AGENT_API, "")} -> HTTP ${response.status} ${text.slice(0, 400) || "(empty body)"}`);
    process.exit(1);
  }
  return text ? JSON.parse(text) : {};
}

let agentId = env.SF_AGENT_ID;
if (!agentId) {
  const label = env.SF_AGENT_LABEL ?? "Loyalty Assistant";
  const soql = `SELECT Id, DeveloperName, MasterLabel FROM BotDefinition WHERE MasterLabel = '${label.replace(/'/g, "\\'")}'`;
  const { records } = await call("GET", `${instanceUrl}/services/data/v68.0/query?q=${encodeURIComponent(soql)}`);
  if (!records?.length) {
    console.error(`agent-chat: no agent labelled "${label}" (set SF_AGENT_ID or SF_AGENT_LABEL)`);
    process.exit(1);
  }
  agentId = records[0].Id;
  console.log(`agent-chat: agent "${records[0].MasterLabel}" (${agentId})`);
}

const session = await call("POST", `${AGENT_API}/agents/${agentId}/sessions`, {
  externalSessionKey: randomUUID(),
  instanceConfig: { endpoint: (env.SF_MY_DOMAIN ?? instanceUrl).replace(/\/$/, "") },
  streamingCapabilities: { chunkTypes: ["Text"] },
  bypassUser: true,
});
const sessionId = session.sessionId;
for (const m of session.messages ?? []) console.log(`agent: ${m.message}`);

try {
  let sequenceId = 1;
  for (const question of questions) {
    console.log(`\nyou:   ${question}`);
    const reply = await call("POST", `${AGENT_API}/sessions/${sessionId}/messages`, {
      message: { sequenceId: sequenceId++, type: "Text", text: question },
    });
    for (const m of reply.messages ?? []) console.log(`agent: ${m.message ?? JSON.stringify(m)}`);
  }
} finally {
  await call("DELETE", `${AGENT_API}/sessions/${sessionId}`, undefined, { "x-session-end-reason": "UserRequest" });
  console.log("\nagent-chat: session ended");
}
