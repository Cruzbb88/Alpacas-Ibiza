#!/usr/bin/env bash
# A11y + Performance audit runner
# Usage: bash tests/audit/run-audit.sh
# Requires: pnpm dev running on port 3000, browser-driver-manager installed

set -e

CHROMEDRIVER="$HOME/.browser-driver-manager/chromedriver/win64-149.0.7827.54/chromedriver-win64/chromedriver.exe"
AXE="npx @axe-core/cli"
LH="npx lighthouse"
OUT="tests/audit"

echo "=== AXE-CORE AUDIT ==="
for route in "en" "en/adopt" "en/alpacas" "en/tours" "de/adopt"; do
  slug=$(echo "$route" | tr '/' '-')
  echo "axe: http://localhost:3000/$route"
  $AXE "http://localhost:3000/$route" \
    --tags wcag2a,wcag2aa,wcag21aa \
    -s "$OUT/axe-${slug}.json" \
    --chromedriver-path "$CHROMEDRIVER" 2>&1 | grep -E "issues detected|Testing complete"
done

echo ""
echo "=== LIGHTHOUSE AUDIT ==="
for route in "en" "en/adopt" "en/alpacas" "en/tours" "de/adopt"; do
  slug=$(echo "$route" | tr '/' '-')
  echo "lh: http://localhost:3000/$route"
  $LH "http://localhost:3000/$route" \
    --chrome-flags="--headless --no-sandbox" \
    --output=json \
    --output-path="$OUT/lh-${slug}.json" \
    --only-categories=performance,accessibility,best-practices,seo \
    --quiet 2>&1 | tail -2
done

echo ""
echo "=== PARSE RESULTS ==="
python3 tests/audit/parse-results.py
