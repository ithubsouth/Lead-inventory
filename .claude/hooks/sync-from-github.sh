#!/usr/bin/env bash
# Claude Code "SessionStart" hook: before you start chatting, bring the local
# folder up to date with GitHub (e.g. changes made in Lovable or by teammates).
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}" || exit 0
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  echo "Note: this folder is on branch '$BRANCH'. The live site deploys from main."
  exit 0
fi
if ! git pull -q --rebase --autostash origin main 2>/dev/null; then
  git rebase --abort >/dev/null 2>&1
  echo "Note: could not auto-update from GitHub (conflict with local edits). Ask Claude to run git pull and resolve it."
  exit 0
fi
if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  npm install --no-audit --no-fund >/dev/null 2>&1 && touch node_modules
fi
echo "Local folder is up to date with GitHub main ($(git log -1 --format='%h %s'))."
exit 0
