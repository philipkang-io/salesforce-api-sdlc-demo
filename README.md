# Salesforce API SDLC demo

Spec-first SDLC automation on the OpenAPI spec that a Salesforce org generates
for itself (REST API OpenAPI generation, beta).

```
Salesforce org ──generate──▶ api/source/openapi.json ──overlay──▶ api/openapi.yaml
                                                                  │
                     PR gate (lint + breaking-change check) ◀─────┤
                     tests against the org (Postman CLI)    ◀─────┤
                     API Catalog evidence + monitor         ◀─────┤
                     Fern docs                              ◀─────┘
```

## Quick start

1. Copy `.env.example` to `.env` and fill in the External Client App's client
   ID and secret and the org's My Domain URL.
2. `make token` checks the connection.
3. `make generate` asks the org for a fresh spec and writes
   `api/source/openapi.json`.

`api/spec-request.json` controls what the org generates: the API version, the
resources, and which sObjects to include.

## Rules

- Never hand-edit `api/source/openapi.json`. It is replaced on every
  regeneration. Fixes go in the overlay.
- Tokens are fetched on demand and never printed or stored.

## Status

Phase 0 of the build plan: the repo skeleton and spec generation. The overlay,
gates, tests, Catalog evidence and Fern docs come next.
