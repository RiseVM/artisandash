#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install npm dependencies. Using `npm install` (not `npm ci`) so the install
# layer is cached across sessions and is idempotent.
npm install --no-audit --no-fund --no-progress
