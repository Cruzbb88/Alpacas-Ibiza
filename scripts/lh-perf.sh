#!/usr/bin/env bash
# Real Lighthouse perf/a11y/seo/best-practices for the REDESIGN's own pages.
# MUST run against a PRODUCTION server (next build && next start), NOT next dev —
# dev is unminified with HMR overhead so its perf score is meaningless. a11y/seo/
# best-practices are valid on either, but we run all four against prod for honesty.
#   BASE=http://localhost:3100 bash scripts/lh-perf.sh
export CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE="${BASE:-http://localhost:3100}"
OUT="reports/performance-optimizer/redesign-lh-2026-06-13.md"
PAGES=( "home:/en" "adopt:/en/adopt" "tours:/en/tours" "gifts:/en/gifts" "alpacas:/en/alpacas" "shop:/en/shop" "contact:/en/contact" )
{
  echo "# Redesign — real Lighthouse scores (production build, mobile)"
  echo ""
  echo "**Date:** 2026-06-13 · **Tool:** Lighthouse 12.8.2 mobile, against \`next build && next start\` (production) at $BASE. · Competitor bar (perf-competitor-bench): sector perf 36–60, LCP 6.9–15.8s, none 'good'."
  echo ""
  echo "| Page | Perf | A11y | Best-Pract | SEO | LCP s | CLS | TBT ms |"
  echo "|---|---|---|---|---|---|---|---|"
} > "$OUT"
for entry in "${PAGES[@]}"; do
  name="${entry%%:*}"; path="${entry##*:}"
  echo ">> $name $BASE$path" >&2
  tmp="/tmp/lhp_$name.json"
  npx --no-install lighthouse "$BASE$path" \
    --only-categories=performance,accessibility,best-practices,seo \
    --form-factor=mobile --screenEmulation.mobile \
    --output=json --output-path="$tmp" \
    --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
    --max-wait-for-load=45000 --quiet 2>/dev/null
  python3 - "$name" "$OUT" "$tmp" << 'PY'
import json,sys
name,out,tmp=sys.argv[1:4]
try:
    d=json.load(open(tmp,encoding="utf-8")); c=d["categories"]; a=d["audits"]
    def sc(k):
        v=c.get(k,{}).get("score")
        return int(v*100) if v is not None else "n/a"
    row=f"| {name} | {sc('performance')} | {sc('accessibility')} | {sc('best-practices')} | {sc('seo')} | {a['largest-contentful-paint']['numericValue']/1000:.1f} | {a['cumulative-layout-shift']['numericValue']:.3f} | {int(a['total-blocking-time']['numericValue'])} |"
except Exception as e:
    row=f"| {name} | FAILED ({type(e).__name__}) | – | – | – | – | – | – |"
open(out,"a",encoding="utf-8").write(row+"\n")
PY
done
{
  echo ""
  echo "**Read vs the competitor bench:** if the redesign lands LCP <2.5s + perf >=90 here, it is 3-5x faster than every competitor measured (sector best was Spring Farm 60 / LCP 8.9s). If perf is low, the power core per po-001 is the uncached getActiveAdopterCount on /adopt SSR — fix that first."
} >> "$OUT"
echo "WROTE $OUT"; cat "$OUT"
