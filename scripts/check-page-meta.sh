#!/usr/bin/env bash
# Per-page meta tag audit — title length, description presence, og:image,
# canonical, hreflang. Run against a live dev server.
# Usage: bash scripts/check-page-meta.sh [BASE_URL]

PAGES=(
  "/en"
  "/en/about"
  "/en/adopt"
  "/en/alpacas"
  "/en/contact"
  "/en/experiences"
  "/en/gifts"
  "/en/impressum"
  "/en/journal"
  "/en/media"
  "/en/shop"
  "/en/sustainability"
  "/en/tours"
  "/en/weddings"
  "/en/workshops"
  "/en/yoga"
)

BASE="${1:-http://localhost:3000}"
WARN=0
for path in "${PAGES[@]}"; do
  html=$(curl -s "${BASE}${path}")
  title=$(echo "$html" | grep -oE '<title>[^<]+' | sed 's/<title>//' | head -1)
  desc=$(echo "$html" | grep -oE '<meta name="description" content="[^"]+' | sed 's/.*content="//' | head -1)
  og_image=$(echo "$html" | grep -oE '<meta property="og:image" content="[^"]+' | sed 's/.*content="//' | head -1)
  canonical=$(echo "$html" | grep -oE '<link rel="canonical" href="[^"]+' | sed 's/.*href="//' | head -1)
  hreflang_count=$(echo "$html" | grep -c 'hreflang=')

  printf "\n\033[1m%s\033[0m\n" "$path"
  # Title length check
  tlen=${#title}
  if [ "$tlen" -lt 30 ]; then printf "  \033[33m⚠\033[0m title too short (%d chars): \"%s\"\n" "$tlen" "$title"; WARN=$((WARN+1))
  elif [ "$tlen" -gt 60 ]; then printf "  \033[33m⚠\033[0m title too long (%d chars): \"%s\"\n" "$tlen" "$title"; WARN=$((WARN+1))
  else printf "  \033[32m✓\033[0m title %d chars: \"%s\"\n" "$tlen" "$title"; fi

  # Description
  dlen=${#desc}
  if [ -z "$desc" ]; then printf "  \033[31m✗\033[0m no description meta\n"; WARN=$((WARN+1))
  elif [ "$dlen" -gt 160 ]; then printf "  \033[33m⚠\033[0m description %d chars (>160 truncates in SERP)\n" "$dlen"; WARN=$((WARN+1))
  elif [ "$dlen" -lt 50 ]; then printf "  \033[33m⚠\033[0m description %d chars (<50 thin)\n" "$dlen"; WARN=$((WARN+1))
  else printf "  \033[32m✓\033[0m description %d chars\n" "$dlen"; fi

  # OG image
  if [ -z "$og_image" ]; then printf "  \033[31m✗\033[0m no og:image\n"; WARN=$((WARN+1))
  else printf "  \033[32m✓\033[0m og:image: %s\n" "${og_image:0:60}..."; fi

  # Canonical
  if [ -z "$canonical" ]; then printf "  \033[33m⚠\033[0m no canonical\n"; WARN=$((WARN+1))
  else printf "  \033[32m✓\033[0m canonical present\n"; fi

  # Hreflang — 6 locales × {self+alternate+x-default} = 7 expected minimum
  if [ "$hreflang_count" -lt 6 ]; then printf "  \033[33m⚠\033[0m only %d hreflang tags (expected ≥6 for 6 locales)\n" "$hreflang_count"; WARN=$((WARN+1))
  else printf "  \033[32m✓\033[0m %d hreflang tags\n" "$hreflang_count"; fi
done

echo ""
echo "─────────────────────────────"
echo "  Warnings: $WARN"
