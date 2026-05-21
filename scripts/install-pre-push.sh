#!/usr/bin/env bash
# Install the open-silong pre-push hook into .git/hooks/pre-push.
#
# What the hook does (in order):
#   1. rr-sync drift nag — non-blocking
#   2. sc-git ci (typecheck + relevant tests) — blocks push on fail
#   3. self-hosted Convex auto-deploy — only when convex/ changed AND
#      .env.local exposes CONVEX_SELF_HOSTED_URL + _ADMIN_KEY. Backend
#      lands before frontend so the Dokploy rebuild after this push
#      never gets ahead of the schema.
#
# Run once per fresh clone:
#     bash scripts/install-pre-push.sh
#
# Idempotent — re-runs replace the hook in place.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "❌ not inside a git repo"
  exit 1
fi

HOOK_PATH="$REPO_ROOT/.git/hooks/pre-push"

cat > "$HOOK_PATH" <<'HOOK'
#!/usr/bin/env bash
# sc-git pre-push: rr-sync nag + local CI + self-hosted Convex auto-deploy
# Source of truth: scripts/install-pre-push.sh (re-run to update).
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"

# Guard 1 — rr-sync drift nag (non-blocking)
node "$REPO_ROOT/scripts/rr-sync-status.mjs" --nag 2>&1 || true

# Guard 2 — local CI (blocking).
#   If you use the optional sc-git toolkit, set SC_GIT_CI to the path of
#   its `ci.js`; otherwise this falls back to `pnpm typecheck && pnpm test`.
if [ -n "${SC_GIT_CI:-}" ] && [ -f "$SC_GIT_CI" ]; then
  node "$SC_GIT_CI" || {
    echo ""
    echo "❌ sc-git ci failed. push blocked."
    echo "   override (NOT recommended): git push --no-verify"
    exit 1
  }
else
  pnpm typecheck && pnpm test --reporter=dot || {
    echo ""
    echo "❌ local CI failed (typecheck or test). push blocked."
    echo "   override (NOT recommended): git push --no-verify"
    exit 1
  }
fi

# Guard 3 — self-hosted Convex auto-deploy (silent no-op if not configured)
if [ -d convex ] && [ -f .env.local ] \
   && grep -q "^CONVEX_SELF_HOSTED_URL=" .env.local 2>/dev/null \
   && grep -q "^CONVEX_SELF_HOSTED_ADMIN_KEY=" .env.local 2>/dev/null; then
  LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null || true)
  REMOTE_SHA=$(git rev-parse origin/main 2>/dev/null || echo "")
  if [ -n "$REMOTE_SHA" ] && [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
    CONVEX_DIFF=$(git diff --name-only "$REMOTE_SHA"..HEAD -- convex/ 2>/dev/null || true)
    if [ -n "$CONVEX_DIFF" ]; then
      echo ""
      echo "▶ sc-git: convex/ changed → auto-deploy self-hosted Convex FIRST"
      set -a; . ./.env.local; set +a
      # CONVEX_DEPLOYMENT (local-dev pointer) conflicts with the
      # CONVEX_SELF_HOSTED_* pair the deploy command needs.
      unset CONVEX_DEPLOYMENT
      pnpm exec convex deploy --yes || {
        echo ""
        echo "❌ Convex self-hosted deploy failed. push aborted."
        echo "   Fix Convex deploy first; do NOT --no-verify (frontend would land ahead of backend)."
        exit 1
      }
      echo "✓ Convex deploy complete. Continuing push."
    fi
  fi
fi
HOOK

chmod +x "$HOOK_PATH"
echo "✓ installed $HOOK_PATH"

# Diagnostics — flag if convex auto-deploy is set up but env keys missing.
if [ -d "$REPO_ROOT/convex" ] && [ -f "$REPO_ROOT/.env.local" ]; then
  MISSING=""
  grep -q "^CONVEX_SELF_HOSTED_URL=" "$REPO_ROOT/.env.local" || MISSING="$MISSING CONVEX_SELF_HOSTED_URL"
  grep -q "^CONVEX_SELF_HOSTED_ADMIN_KEY=" "$REPO_ROOT/.env.local" || MISSING="$MISSING CONVEX_SELF_HOSTED_ADMIN_KEY"
  if [ -n "$MISSING" ]; then
    echo ""
    echo "ℹ convex/ exists but .env.local is missing:$MISSING"
    echo "  Add them to enable backend auto-deploy on push. Without"
    echo "  these vars guard 3 silently skips and you must deploy"
    echo "  Convex manually."
  fi
fi
