#!/usr/bin/env bash
# Claude Code "Stop" hook: runs every time Claude finishes a reply.
# If Claude changed files, it: builds the app -> commits -> pulls the latest
# main from GitHub -> pushes to main. Vercel then deploys the live site.
#
# Safety:
#  - Nothing is pushed if the build fails. The error goes back to Claude
#    (exit 2) so it fixes it and tries again, up to 3 times in a row.
#  - Conflicts with newer GitHub changes (e.g. Lovable) are handed to Claude
#    to resolve instead of being overwritten.
#  - Only publishes from the "main" branch.
# Turn off temporarily by creating an empty file .claude/autopublish.off

set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}" || exit 0

INPUT="$(cat || true)"
say()  { printf '{"systemMessage": %s}\n' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/^/"/; s/$/"/' | tr -d '\n')"; }
fail() { echo "$1" >&2; exit 2; }   # exit 2 = Claude sees the message and keeps working

[ -f .claude/autopublish.off ] && { say "Auto-publish is off (.claude/autopublish.off exists)."; exit 0; }

GITDIR="$(git rev-parse --git-dir)"
ATTEMPTS_FILE="$GITDIR/auto-publish-attempts"

# Don't interfere with an in-progress merge/rebase Claude is working on.
if [ -d "$GITDIR/rebase-merge" ] || [ -d "$GITDIR/rebase-apply" ] || [ -f "$GITDIR/MERGE_HEAD" ]; then
  fail "Auto-publish: a git merge/rebase is still in progress. Finish it (resolve conflicts, then git add -A && GIT_EDITOR=true git rebase --continue) so the change can be published."
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch -q origin main 2>/dev/null || true
CHANGED="$(git status --porcelain)"
AHEAD="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"

# Nothing to publish.
if [ -z "$CHANGED" ] && [ "$AHEAD" = "0" ]; then rm -f "$ATTEMPTS_FILE"; exit 0; fi

if [ "$BRANCH" != "main" ]; then
  say "Auto-publish skipped: you're on branch '$BRANCH'. The live site deploys from main."
  exit 0
fi

# Loop guard: give Claude up to 3 tries to fix a failing build/conflict.
N=$(( $(cat "$ATTEMPTS_FILE" 2>/dev/null || echo 0) + 1 ))
echo "$N" > "$ATTEMPTS_FILE"
if [ "$N" -gt 3 ]; then
  rm -f "$ATTEMPTS_FILE"
  say "Auto-publish gave up after 3 attempts. Your changes are saved locally but NOT live. Ask Claude to fix the build, then it will publish again."
  exit 0
fi

# 1. Build check (install packages first if needed).
if [ ! -d node_modules ] || [ package.json -nt node_modules ] || [ package-lock.json -nt node_modules ]; then
  npm install --no-audit --no-fund >/dev/null 2>&1 || fail "Auto-publish: npm install failed. Run it to see the error and fix it."
  touch node_modules
fi
if ! BUILD_LOG="$(npm run build 2>&1)"; then
  fail "Auto-publish: the build FAILED, so nothing was pushed. Fix these errors:
$(printf '%s\n' "$BUILD_LOG" | grep -iE 'error|failed|✘|x ' | grep -v browserslist | head -40)"
fi

# 2. Commit.
if [ -n "$CHANGED" ]; then
  FILES="$(git status --porcelain | awk '{print $NF}' | sed 's#.*/##' | sort -u | head -6 | paste -sd, - | sed 's/,/, /g')"
  git add -A
  git commit -q -m "Update via Claude: ${FILES}" || fail "Auto-publish: git commit failed."
fi

# 3. Bring in newer GitHub changes (Lovable, teammates) before pushing.
BEFORE_PULL="$(git rev-parse HEAD)"
if ! git pull -q --rebase origin main 2>/dev/null; then
  CONFLICTS="$(git diff --name-only --diff-filter=U | head -20)"
  fail "Auto-publish: your change conflicts with newer commits on GitHub in:
$CONFLICTS
Resolve the conflict markers in those files, then run: git add -A && GIT_EDITOR=true git rebase --continue"
fi

# Re-check the build only if the pull brought in new code.
if [ "$(git rev-parse HEAD)" != "$BEFORE_PULL" ] && ! npm run build >/dev/null 2>&1; then
  fail "Auto-publish: the build fails after merging the latest GitHub changes. Run npm run build and fix the errors."
fi

# 4. Push -> Vercel deploys.
if ! PUSH_LOG="$(git push -q origin main 2>&1)"; then
  fail "Auto-publish: git push failed:
$PUSH_LOG"
fi

rm -f "$ATTEMPTS_FILE"
say "Published to GitHub main ($(git log -1 --format=%h)). Vercel will update https://lead-inventory-leaditsupport.vercel.app in 1-3 minutes."
exit 0
