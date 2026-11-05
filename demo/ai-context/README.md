# AI context comparison

Same prompt, same model, two runs of Claude Code:

| Run | Context | Result (2026-11-05, Sonnet) |
|---|---|---|
| A | None: empty folder, no MCP servers, no web, no file reads | **2/7.** Used Salesforce's Loyalty Management Connect API (`/connect/loyalty/programs/{program}/individual-member-enrollments`), a real product API this org does not use, and noted it "has no tier input". |
| B | The docs site's MCP server (`searchDocs` on sdlc-loyalty-demo.docs.buildwithfern.com) | **7/7.** `POST /services/data/v68.0/sobjects/Loyalty_Member__c` with `Tier__c: "Gold"`. Run against the org, it created a Gold member on the first try. |

Run A is not random guessing. It produced plausible, well-structured code against a real Salesforce API, which is exactly why it is dangerous: it would pass a code review that did not know this org.

## Run it

```bash
make ai-context          # or: demo/ai-context/run.sh [model]
```

- `prompt.md` is the prompt both runs get.
- `docs-mcp.json` connects run B to the docs MCP server.
- `score.mjs` checks each answer against what the org accepts (endpoint, field names, exact picklist value, form-encoded token request). It does not run the code.
- `out/` keeps the recorded answers from the run above, as a fallback for the demo.

Answers vary from run to run. Run A may guess differently each time; the point is that without context it cannot know `Loyalty_Member__c` exists.
