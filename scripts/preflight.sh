#!/usr/bin/env bash
# Pre-deploy preflight — run BEFORE `vercel deploy --prod` to catch broken state locally.
#
# Each check is independent. Failures don't auto-abort; you see the full report,
# then decide what to fix.
#
# Usage: bash scripts/preflight.sh

set +e  # don't abort on first failure — we want the full report

fail=0
warn=0

echo "═══════════════════════════════════════════════"
echo "Alpacas Ibiza — Pre-deploy preflight"
echo "═══════════════════════════════════════════════"
echo ""

# ── 1. Build ──────────────────────────────────────────────────────────────────
echo "[1/8] pnpm build..."
if pnpm build > /tmp/preflight-build.log 2>&1; then
  echo "      ✅ build green"
else
  echo "      ❌ BUILD FAILED — see /tmp/preflight-build.log"
  tail -20 /tmp/preflight-build.log
  fail=$((fail + 1))
fi

# ── 2. Tests ──────────────────────────────────────────────────────────────────
echo "[2/8] pnpm test..."
if pnpm test > /tmp/preflight-test.log 2>&1; then
  passing=$(grep -E "# pass" /tmp/preflight-test.log | tail -1 | awk '{print $NF}')
  echo "      ✅ tests pass ($passing)"
else
  failing=$(grep -E "# fail" /tmp/preflight-test.log | tail -1 | awk '{print $NF}')
  echo "      ❌ $failing TEST(S) FAILED — see /tmp/preflight-test.log"
  fail=$((fail + 1))
fi

# ── 3. Type check ─────────────────────────────────────────────────────────────
echo "[3/8] pnpm typecheck..."
if pnpm typecheck > /tmp/preflight-tsc.log 2>&1; then
  echo "      ✅ tsc clean"
else
  errs=$(grep -c "error TS" /tmp/preflight-tsc.log)
  echo "      ⚠️  $errs TS errors — see /tmp/preflight-tsc.log"
  echo "          (next.config.mjs has ignoreBuildErrors:true so this won't block deploy)"
  warn=$((warn + 1))
fi

# ── 4. Untracked files ────────────────────────────────────────────────────────
echo "[4/8] git status..."
untracked=$(git status --short | grep -c "^??")
modified=$(git status --short | grep -c "^.M")
if [ "$untracked" -eq 0 ] && [ "$modified" -eq 0 ]; then
  echo "      ✅ working tree clean"
else
  echo "      ⚠️  $untracked untracked, $modified modified"
  echo "          Vercel only deploys what's committed. Run git add + commit first."
  warn=$((warn + 1))
fi

# ── 5. .env.local NOT committed ───────────────────────────────────────────────
echo "[5/8] secrets check..."
if git ls-files | grep -q "^\.env\.local$"; then
  echo "      ❌ .env.local IS TRACKED IN GIT — REMOVE IMMEDIATELY"
  echo "          run: git rm --cached .env.local && git commit -m 'fix: untrack .env.local'"
  fail=$((fail + 1))
elif grep -qE "^\.env(\*)?(\.[a-z]+)?\.local$" .gitignore 2>/dev/null; then
  echo "      ✅ .env.local is gitignored (matched pattern in .gitignore)"
else
  echo "      ⚠️  .env.local not in .gitignore — add it"
  warn=$((warn + 1))
fi

# ── 6. Required Tier-1 env documentation ──────────────────────────────────────
echo "[6/8] env documentation..."
REQUIRED=("RESEND_API_KEY" "NEXTAUTH_SECRET" "NEXTAUTH_URL" "ADMIN_USERNAME" "ADMIN_PASSWORD" "FAREHARBOR_WEBHOOK_SECRET" "CRON_SECRET" "CONTACT_EMAIL")
missing_docs=()
for var in "${REQUIRED[@]}"; do
  if ! grep -q "^${var}=" .env.local.example; then
    missing_docs+=("$var")
  fi
done
if [ ${#missing_docs[@]} -eq 0 ]; then
  echo "      ✅ all 8 Tier-1 vars in .env.local.example"
else
  echo "      ❌ missing from .env.local.example: ${missing_docs[*]}"
  fail=$((fail + 1))
fi

# ── 7. next.config.mjs security headers present ───────────────────────────────
echo "[7/8] security headers..."
if grep -q "Strict-Transport-Security" next.config.mjs && \
   grep -q "X-Frame-Options" next.config.mjs && \
   grep -q "Content-Security-Policy" next.config.mjs; then
  echo "      ✅ HSTS + X-Frame + CSP present in next.config.mjs"
else
  echo "      ❌ security headers MISSING from next.config.mjs"
  fail=$((fail + 1))
fi

# ── 8. Failsafe map row count (sanity check) ──────────────────────────────────
echo "[8/8] CLAUDE.md failsafe map..."
if [ -f CLAUDE.md ]; then
  rows=$(grep -c "^| " CLAUDE.md)
  if [ "$rows" -ge 20 ]; then
    echo "      ✅ failsafe map has $rows rows"
  else
    echo "      ⚠️  failsafe map only $rows rows — check for accidental truncation"
    warn=$((warn + 1))
  fi
else
  echo "      ⚠️  CLAUDE.md missing"
  warn=$((warn + 1))
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
if [ "$fail" -eq 0 ] && [ "$warn" -eq 0 ]; then
  echo "✅ READY TO DEPLOY — all checks passed"
  exit 0
elif [ "$fail" -eq 0 ]; then
  echo "⚠️  DEPLOY-WITH-CAUTION — $warn warning(s); no blockers"
  exit 0
else
  echo "❌ DO NOT DEPLOY — $fail failure(s), $warn warning(s)"
  echo ""
  echo "Logs:"
  echo "  /tmp/preflight-build.log"
  echo "  /tmp/preflight-test.log"
  echo "  /tmp/preflight-tsc.log"
  exit 1
fi
