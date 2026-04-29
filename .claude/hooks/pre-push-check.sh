#!/usr/bin/env bash
set -euo pipefail

# Read the Bash tool input from stdin and extract the command string.
input=$(cat)
cmd=$(echo "$input" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('command', ''))
" 2>/dev/null || echo "")

# Only intercept git push invocations.
if ! echo "$cmd" | grep -qE 'git\s+push'; then
  exit 0
fi

echo "=== Pre-push checks ==="
echo ""

echo "1/3  lint..."
npm run lint
echo "✓  lint passed"
echo ""

echo "2/3  unit tests..."
npm test
echo "✓  unit tests passed"
echo ""

echo "3/3  e2e tests..."
npm run test:e2e
echo "✓  e2e tests passed"
echo ""

echo "All checks passed — proceeding with push."
