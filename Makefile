# One command surface for local work and CI. Run `make help`.

.DEFAULT_GOAL := help
.PHONY: help setup token generate

help: ## List targets
	@awk 'BEGIN{FS=":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-10s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Install dependencies
	@command -v npm >/dev/null || { echo "make setup needs Node 20+ and npm: https://nodejs.org" >&2; exit 1; }
	npm install --no-audit --no-fund

token: ## Check the Salesforce connection (the token is never printed)
	@npm run --silent token

generate: ## Regenerate api/source/openapi.json from the Salesforce org
	@npm run --silent generate
