#!/usr/bin/env bash
# Direct HTTP status check on every public page.
# Faster + more reliable than Playwright for the basic "does it render" gate.
# Usage: bash scripts/check-pages.sh

PAGES=(
  "/en"
  "/en/about"
  "/en/adopt"
  "/en/alpacas"
  "/en/alpacas/barbarella"
  "/en/contact"
  "/en/cookies"
  "/en/experiences"
  "/en/experiences/corporate-team-building"
  "/en/experiences/family-farm-days"
  "/en/experiences/romantic-sunset"
  "/en/gifts"
  "/en/impressum"
  "/en/journal"
  "/en/media"
  "/en/newsletter-confirmed"
  "/en/newsletter/unsubscribed"
  "/en/offline"
  "/en/press"
  "/en/press-kit"
  "/en/privacy"
  "/en/share-adoption?alpaca=barbarella"
  "/en/shop"
  "/en/shop/alcaca"
  "/en/shop/commission"
  "/en/shop/woven"
  "/en/sitemap"
  "/en/sustainability"
  "/en/terms"
  "/en/tours"
  "/en/weddings"
  "/en/workshops"
  "/en/yoga"
  "/healthz"
)

BASE="${1:-http://localhost:3000}"
PASS=0
FAIL=0
FAIL_LIST=()

for path in "${PAGES[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${path}")
  if [ "$status" = "200" ]; then
    printf "  \033[32m✓\033[0m %3d  %s\n" "$status" "$path"
    PASS=$((PASS + 1))
  else
    printf "  \033[31m✗\033[0m %3d  %s\n" "$status" "$path"
    FAIL=$((FAIL + 1))
    FAIL_LIST+=("${status} ${path}")
  fi
done

echo ""
echo "─────────────────────────────"
echo "  Pass: $PASS / $((PASS + FAIL))"
echo "  Fail: $FAIL"
if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Failures:"
  for f in "${FAIL_LIST[@]}"; do
    echo "  $f"
  done
  exit 1
fi
