# One command surface for local work and CI. Run `make help`.

.DEFAULT_GOAL := help
.PHONY: help setup token generate build build-check lint compat check smoke cleanup

help: ## List targets
	@awk 'BEGIN{FS=":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Install dependencies
	@command -v npm >/dev/null || { echo "make setup needs Node 20+ and npm: https://nodejs.org" >&2; exit 1; }
	npm ci --no-audit --no-fund

token: ## Check the Salesforce connection (the token is never printed)
	@npm run --silent token

generate: ## Regenerate api/source/openapi.json from the Salesforce org
	@npm run --silent generate

build: ## Build api/openapi.yaml from the generated spec plus the overlays
	@npm run --silent build

build-check: ## Fail if api/openapi.yaml is out of date
	@npm run --silent build-check

lint: ## Postman governance lint of api/openapi.yaml (fails on errors)
	@command -v postman >/dev/null || { echo "make lint needs the Postman CLI: https://learning.postman.com/docs/postman-cli/postman-cli-installation/" >&2; exit 1; }
	postman spec lint api/openapi.yaml --no-report-events

compat: ## Fail if api/openapi.yaml breaks the approved baseline
	@npm run --silent compat

check: build-check lint compat ## Everything the PR gate runs
	@echo "check passed"

smoke: ## Run the smoke collection against the Salesforce org (creates and deletes one test record)
	@npm run --silent smoke -- --no-report-events

cleanup: ## Delete SDLC-Demo-* test records left behind by a failed run
	@npm run --silent cleanup
