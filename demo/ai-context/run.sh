#!/usr/bin/env bash
# Same prompt, same model, two runs of Claude Code:
#   A  no API context (empty folder, no MCP servers, no web, no file reads)
#   B  the docs site's MCP server only (searchDocs)
# Then score both answers against what the org accepts.
#
# Usage: demo/ai-context/run.sh [model]   (default: sonnet)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
model="${1:-sonnet}"
out="$here/out"
mkdir -p "$out"
prompt="$(cat "$here/prompt.md")"

# An empty working folder, so neither run can read this repo's answers.
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cd "$work"

echo "A: no context..."
claude -p "$prompt" --model "$model" \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --disallowedTools "WebFetch,WebSearch,Bash,Read,Glob,Grep,Write,Edit" \
  > "$out/a-no-context.md"

echo "B: docs MCP..."
claude -p "$prompt Use the loyalty-docs MCP server to look up the API before writing code." --model "$model" \
  --strict-mcp-config --mcp-config "$here/docs-mcp.json" \
  --allowedTools "mcp__loyalty-docs__searchDocs" \
  --disallowedTools "WebFetch,WebSearch,Bash,Read,Glob,Grep,Write,Edit" \
  > "$out/b-docs-mcp.md"

node "$here/score.mjs" "$out/a-no-context.md" "$out/b-docs-mcp.md"
