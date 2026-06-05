#!/usr/bin/env bash
# classify-suspect.sh — Chesterton's Fence classifier (philosophy catalog 021).
#
# Before calling any artifact "dead / useless / broken / leave-alone", run this.
# It traces WHY the artifact exists and prints evidence for each load-bearing
# path. You then read the evidence and pick (a)-(e); the script never guesses
# disposition for you — it just makes the determination cheap.
#
# Usage:
#   bash scripts/classify-suspect.sh <symbol-or-basename>
#   bash scripts/classify-suspect.sh getActiveAdopterCount
#   bash scripts/classify-suspect.sh social-proof
#   bash scripts/classify-suspect.sh skein-checkout
#
# Genuinely-useless bar (ALL must hold): removing it changes observable
# behavior in NONE of {build, test, runtime, a spec/ADR}, AND every section
# below is empty.

set -uo pipefail
S="${1:?usage: classify-suspect.sh <symbol-or-basename>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

hr(){ printf '\n\033[1m── %s ──\033[0m\n' "$1"; }
hits(){ if [ -s "$1" ]; then cat "$1"; else echo "  (none)"; fi; }
tmp(){ mktemp 2>/dev/null || echo "/tmp/cs.$$"; }

echo "Classifying suspect: \"$S\""
echo "Root: $ROOT"

hr "(b1) STATIC CALLERS — imports / direct references in source"
t=$(tmp); grep -rIn --include=*.ts --include=*.tsx --include=*.mjs --include=*.js \
  -e "$S" app/ components/ lib/ 2>/dev/null \
  | grep -vE "(\.test\.|/__|node_modules)" | head -25 > "$t"; hits "$t"

hr "(b2) DYNAMIC / STRING-KEYED refs — config maps, JSON, YAML, env-gated"
t=$(tmp); grep -rIn --include=*.json --include=*.yaml --include=*.yml --include=*.ts \
  -e "\"$S\"" -e "'$S'" -e "$S" \
  lib/ app/ vercel.json 2>/dev/null | grep -iE "(switch|case|registry|map|provider|vendor|\"$S\"|'$S')" | head -15 > "$t"; hits "$t"

hr "(b3) EXTERNAL TRIGGERS — vercel.json crons + webhook/api routes"
t=$(tmp); { grep -nE "$S|path\"" vercel.json 2>/dev/null | grep -i "$S";
            ls app/api 2>/dev/null | grep -i "$S" | sed 's/^/  api route: /'; } > "$t"; hits "$t"

hr "(b4) NEXT FRAMEWORK CONVENTIONS — file-routing / metadata exports"
t=$(tmp); {
  find app -iname "*$S*" 2>/dev/null | grep -E "(page|route|layout|loading|error|not-found|opengraph-image|icon|sitemap|robots|manifest|template|default)\.(tsx?|ts)$" | sed 's/^/  convention file: /'
  grep -rIn -e "generateStaticParams" -e "generateMetadata" -e "generateImageMetadata" $(grep -rIl "$S" app/ 2>/dev/null | head -10) 2>/dev/null | head -8
} > "$t"; hits "$t"

hr "(c) INTENTIONAL EMPTY-STATE / FAILSAFE — Rule-5 / renders null by design"
t=$(tmp); grep -rIn -e "$S" $(grep -rIl "$S" components/ lib/ app/ 2>/dev/null | head -10) 2>/dev/null \
  | grep -iE "(OWNER_INPUT|UNMAPPED|Rule 5|renders? null|fail-?quiet|fail-?open|fail-?closed|empty.?state|coming soon|hasLive|status: 'live')" | head -10 > "$t"; hits "$t"

hr "(d) MID-BUILD by another process — recent uncommitted / WIP markers"
t=$(tmp); { git status --short 2>/dev/null | grep -i "$S";
            grep -rIn -e "$S" -e "TODO\|WIP\|FIXME\|in-progress" $(git status --short 2>/dev/null | awk '{print $2}' | grep -i "$S" | head -5) 2>/dev/null | head -8; } > "$t"; hits "$t"

hr "(spec) MENTIONED IN A SPEC / ADR / PRACTICES / FORWARD_PLAN"
t=$(tmp); grep -rIn "$S" docs/adr/ specs/ PRACTICES.md CLAUDE.md FORWARD_PLAN.md JOURNEY_MAP.md 2>/dev/null | head -10 > "$t"; hits "$t"

hr "(test) UNIT UNDER TEST"
t=$(tmp); grep -rIn "$S" lib/*.test.* app/**/*.test.* 2>/dev/null | head -8 > "$t"; hits "$t"

echo
echo "─────────────────────────────────────────────"
echo "VERDICT GUIDE — read the evidence above, then classify:"
echo "  every section (none)        → (a) genuinely dead → remove (verify: build+test+grep stay green)"
echo "  b1/b2/b3/b4 has hits        → (b) load-bearing → wire or keep, do NOT remove"
echo "  (c) has hits                → (c) intentional inert → leave + document"
echo "  (d) has hits                → (d) mid-build → complete or isolate, do NOT revert"
echo "  (spec) names a failsafe     → (e) supposed to no-op → keep"
echo "Disposition is YOURS to assign from this evidence — never from appearance alone."
