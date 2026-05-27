# Migration Playbook — alpaca-farm-redesign to claude-saas-framework (Tenant #1)

**Date:** 2026-05-27
**Strategy:** INCREMENTAL — treat the framework as a spec, audit alpaca against it, swap one file at a time.
**Rationale:** Alpaca has 11+ done specs whose logic does not exist in framework templates. A regenerate run would discard that work. Incremental preserves every done spec while progressively aligning the file structure.
**Source reports:** uft-002 (270 tenant refs), mr-002 (5-file reload zone, 6 swap steps)
**Intake artifact:** `claude-saas-framework/intake/alpacasibiza.yaml`

---

## CAN'T DO WITHOUT HELP (Cruz's decisions required before Phase 3)

These five questions block owner-facing content and must be resolved before Phase 3 begins. Phase 0–2 can proceed without them.

1. **Incremental vs. regenerate.** This playbook assumes incremental. If the blockers in §Blockers force a regenerate, this playbook is superseded. Cruz decides.

2. **Brand color lock.** Two greens exist: `#556B2F` (olive, 42 code refs, tailwind primary) and `#6da855` (themeColor meta, PWA chrome). They are not the same color. Phase 3 Step 3.3 cannot produce a clean `getTenant().brandColors.primary` until the owner confirms which is canonical. Flag in `OWNER_INPUT_NEEDED.md` before starting Phase 3.

3. **Instagram canonical handle.** `lib/structured-data.ts` uses `@alpacasibiza`; `components/footer.tsx` uses `@wishfulfillingweaving`. The tenant config can hold only one primary. Owner must pick before Phase 3 Step 3.3 touches social fields.

4. **Facebook canonical URL.** Same drift: `facebook.com/alpacasibiza` (schema.org) vs. `facebook.com/people/Es-Currals-Alpacas-Ibiza/100066379310193/` (footer). One must win. Owner decides.

5. **`hello@` inbox fate.** `hello@alpacasibiza.com` appears in 17 locations (7 files + 6 locale JSON sets). If it is an alias that forwards to `info@`, the translations that expose it publicly are misleading and must be cleaned before translation files are wired to the tenant config in Phase 3.

---

## Phase 0 — Verify Framework Readiness

**Goal:** Confirm the framework is at v1.1+, modules are present, and a dry-run bootstrap produces a diff that tells you how far alpaca has drifted from the framework skeleton.

**0.1 — Confirm framework version.**
```powershell
Select-String -Path "C:\Users\cruzb\Projects\claude-saas-framework\bootstrap.ps1" -Pattern "^# v"
```
Expected output contains `# v1.1`. If it says v1.0, apply the bv-001 UTF-8 BOM fix from the bootstrap.ps1 header comment before proceeding.

**0.2 — Confirm required templates are present.**
```powershell
@('CLAUDE.md','PRACTICES.md','START_HERE.md','CANT_BE_DONE.md') | ForEach-Object {
  $p = "C:\Users\cruzb\Projects\claude-saas-framework\templates\$_"
  [PSCustomObject]@{ File=$_; Exists=(Test-Path $p) }
}
```
All four must show `Exists=True`. Any `False` = framework incomplete, stop.

**0.3 — Confirm intake YAML is parseable.**
```powershell
$lines = Get-Content "C:\Users\cruzb\Projects\claude-saas-framework\intake\alpacasibiza.yaml" -Encoding utf8
$lines | Where-Object { $_ -match '^\s*[^#]\S' -and $_ -notmatch '^\s*\w+\s*:\s*' -and $_ -notmatch '^\s*\w+:$' } | Select-Object -First 10
```
Zero output = valid flat key:value pairs. Any output = malformed lines; fix before running bootstrap.

**0.4 — Dry-run bootstrap into SCRATCH dir.**
```powershell
$scratch = "$env:TEMP\alpaca-saas-scratch"
Remove-Item $scratch -Recurse -Force -ErrorAction SilentlyContinue
& "C:\Users\cruzb\Projects\claude-saas-framework\bootstrap.ps1" `
  -Name "alpaca-saas-scratch" `
  -Stack next `
  -IntegrationsFile "C:\Users\cruzb\Projects\claude-saas-framework\intake\alpacasibiza.yaml" `
  -OutputDir $env:TEMP
```
Verify bootstrap wrote its four template files:
```powershell
Get-ChildItem "$scratch" -File | Select-Object Name
```
Expected: `CLAUDE.md`, `PRACTICES.md`, `START_HERE.md`, `CANT_BE_DONE.md`, `PLAN.md`, `OWNER_INPUT_NEEDED.md`, `REALITY_CHECK.md`, `VERIFICATION_RESULTS.md`, `docs\adr\0001-bootstrap-decision.md`.

**0.5 — Surface drift between scratch output and alpaca current.**
Compare the framework-generated `CLAUDE.md` against alpaca's live `CLAUDE.md`:
```powershell
Compare-Object `
  (Get-Content "$scratch\CLAUDE.md") `
  (Get-Content "C:\Users\cruzb\Projects\alpaca-farm-redesign\CLAUDE.md")
```
This diff IS the structural gap. Save it:
```powershell
Compare-Object `
  (Get-Content "$scratch\CLAUDE.md") `
  (Get-Content "C:\Users\cruzb\Projects\alpaca-farm-redesign\CLAUDE.md") |
  Out-File "C:\Users\cruzb\Projects\alpaca-farm-redesign\reports\migration-phase0-drift.txt" -Encoding utf8
```
Do not act on this diff yet. It is your baseline.

**Phase 0 gate:** Bootstrap ran without error, draft CLAUDE.md was produced, drift report is saved. No changes to alpaca-farm-redesign.

---

## Phase 1 — Read-Only Module Adoption

**Goal:** Copy framework's `.claude/` modules into alpaca's `.claude/modules/saas-framework/` as a parallel read-only tree. Zero wiring. This lets you diff module behavior against alpaca's existing behavior before touching any alpaca file.

**1.1 — Copy framework modules.**
```powershell
$src  = "C:\Users\cruzb\Projects\claude-saas-framework\.claude"
$dest = "C:\Users\cruzb\Projects\alpaca-farm-redesign\.claude\modules\saas-framework"
if (-not (Test-Path $src)) { Write-Error "No .claude/ in framework — skip or create it first" }
Copy-Item $src $dest -Recurse -Force
```
Verify the copy:
```powershell
Get-ChildItem $dest -Recurse -File | Select-Object -ExpandProperty Name
```

**1.2 — Diff each module's behavior contract against alpaca's current behavior.**
For each file in `$dest`, open it alongside alpaca's equivalent. The question for each:
- Does alpaca already implement this behavior? (If yes, mark ALIGNED)
- Does alpaca's version diverge in a way that is intentional done-spec behavior? (If yes, mark BLOCKER — see §Blockers)
- Is this framework module additive (alpaca doesn't have it at all)? (If yes, mark ADDITIVE)

Document findings in `alpaca-farm-redesign/docs/module-alignment-audit.md` (create only if useful; otherwise add rows to this doc).

**1.3 — Verify no alpaca file was modified.**
```powershell
git -C "C:\Users\cruzb\Projects\alpaca-farm-redesign" diff --name-only
```
Expected output: zero lines (or only the new `.claude/modules/saas-framework/` tree).

**Phase 1 gate:** Framework modules copied to parallel tree. No alpaca source file was modified. Alignment classification complete.

---

## Phase 2 — Interface Adoption (Types Layer)

**Goal:** Swap alpaca's `lib/booking-engine/_types.ts` (if it exists) to import from the framework's `booking-provider/_types.ts`. This is the lowest-risk structural alignment — types only, no runtime change.

**2.1 — Locate alpaca's current booking types.**
```powershell
Get-ChildItem "C:\Users\cruzb\Projects\alpaca-farm-redesign\lib" -Recurse -Filter "_types.ts" | Select-Object FullName
```
If `lib/booking-engine/_types.ts` does not exist, alpaca has not yet extracted a booking-types module. In that case skip to 2.2 and flag as a schema gap.

**2.2 — Locate framework's booking-provider types.**
```powershell
Get-ChildItem "C:\Users\cruzb\Projects\claude-saas-framework" -Recurse -Filter "_types.ts" | Select-Object FullName
```
If the framework has no `booking-provider/_types.ts`, this step is blocked — the framework schema gap must be filed before this phase can complete.

**2.3 — If both exist: compare the two type shapes.**
Open both files. Check:
- Does the framework's `BookingProvider` / `BookingItem` shape cover everything alpaca's current types require?
- Are there alpaca-specific fields (e.g. FareHarbor `flowId`, `alcaca` item type) that the framework shape is missing?

Any missing field in the framework type = do NOT swap. File a framework schema PR first.

**2.4 — If shapes are compatible: swap the import in alpaca.**
In `lib/booking-engine/_types.ts`, change:
```ts
// before
export interface BookingItem { ... }  // local definition
```
to:
```ts
// after
export type { BookingItem, BookingProvider } from 'C:\...\claude-saas-framework\..._types'
// or, once the framework is an npm package:
// export type { BookingItem, BookingProvider } from '@claude-saas/framework'
```

**2.5 — Verify TypeScript is clean.**
```powershell
npx tsc --noEmit -p "C:\Users\cruzb\Projects\alpaca-farm-redesign\tsconfig.json"
```
Expected: zero errors. Any error = revert the import swap and document the type gap.

**Phase 2 gate:** `tsc --noEmit` passes with zero errors. If skipped (types don't exist yet in either repo), document the gap.

---

## Phase 3 — Config Externalization (The Tenant Lift)

**Goal:** For each of the 27 tenant-config values catalogued in alpacasibiza.ts (verified against uft-002), swap every call site from a hardcoded literal to `getTenant().X`. This is the mr-002 hot-swap plan executed file by file.

**Pre-condition for Phase 3:** CAN'T DO WITHOUT HELP items 2–5 (brand color, Instagram, Facebook, hello@) must be resolved by the owner. Do not start Phase 3 until `OWNER_INPUT_NEEDED.md` marks those items green.

**3.1 — Introduce the tenant primitive (zero behavior change).**
Per mr-002 Step 1:
- Create `lib/tenant.ts`, `lib/tenants/alpacasibiza.ts`, `lib/tenants/registry.ts`, `lib/tenants/_types.ts`.
- Source values from `claude-saas-framework/intake/alpacasibiza.yaml` — every field in the YAML should map to a typed field in the Tenant interface.

Verify:
```powershell
npx tsc --noEmit -p "C:\Users\cruzb\Projects\alpaca-farm-redesign\tsconfig.json"
```
Expected: zero errors.
```powershell
# Confirm getTenant() resolves to alpacasibiza in a unit test or quick script
node -e "const {getTenant} = require('./lib/tenant'); const t = getTenant(); console.log(t.slug === 'alpacasibiza')"
```
Expected: `true`.

**3.2 — Wire tenant via middleware behind feature flag (mr-002 Step 2).**
Modify `middleware.ts` to set `x-tenant` header from host-header lookup against `registry.ts`. Gate the resolver on `NEXT_PUBLIC_TENANT_RESOLVER=enabled`; default is `legacy` (no behavior change).

Verify:
```powershell
# In dev server (npm run dev), curl the home route and inspect response headers
curl -s -D - http://localhost:3000/en -o /dev/null | Select-String "x-tenant"
```
Expected: `x-tenant: alpacasibiza` (when resolver is enabled). No change to response body.

**3.3 — Refactor the five reload-zone files (mr-002 Steps 3–5).**
In order of mr-002 priority:
1. `lib/structured-data.ts` — schema functions accept optional tenant param; default to `getTenant()`.
2. `app/layout.tsx` — convert `metadata` to `generateMetadata()`; read tenant for title, GA4 ID, GTM ID, FareHarbor shortname.
3. `components/footer.tsx` + `app/[locale]/layout.tsx` — footer accepts `tenant` prop from locale layout.
4. `lib/email-templates.ts` + `lib/mailer.ts` — `BRAND` object reads tenant; `DEFAULT_TO` / `FROM_EMAIL` read tenant.

After each file: run `tsc --noEmit` and do an HTML snapshot diff of `/en`:
```powershell
# Capture before (do this ONCE before step 3.3 begins)
curl -s http://localhost:3000/en > "$env:TEMP\alpaca-en-before.html"

# Capture after each zone file swap
curl -s http://localhost:3000/en > "$env:TEMP\alpaca-en-after.html"
Compare-Object (Get-Content "$env:TEMP\alpaca-en-before.html") (Get-Content "$env:TEMP\alpaca-en-after.html")
```
Expected diff: zero lines for pure alpacasibiza tenancy (same values, new code path).

Spec 010 in alpaca's done specs governs the tenant-config externalization. Verify each swapped call site is covered by an existing spec-010 acceptance criterion before closing it.

**3.4 — Watch-list one-line swaps.**
After the five reload-zone files are stable:
- `components/header.tsx` — brand name literal → `getTenant().brandName`
- `components/google-reviews-badge.tsx` — `g.page/r/alpacasibiza` → `getTenant().social.googleReviewUrl`
- `app/[locale]/contact/page.tsx` — phone / email / lat-lng literals → tenant reads
- `lib/payment-vendor.ts` — `info@alpacasibiza.com` mailto fallback → `getTenant().contactEmail`
- `app/sitemap.ts` + `app/robots.ts` — `SITE_BASE_URL` → `getTenant().siteUrl`

Verify after each swap:
```powershell
npx tsc --noEmit -p "C:\Users\cruzb\Projects\alpaca-farm-redesign\tsconfig.json"
```

**3.5 — FareHarbor item IDs.**
All eight item IDs in `alpacasibiza.ts fareHarbor.itemIds` are currently `undefined` (fall-open per `lib/config.ts getFareHarborTourUrl()`). They remain `null` in the intake YAML with `<<OWNER_INPUT_NEEDED>>` tokens. Do NOT invent values. When the owner supplies IDs, update the YAML and then `lib/tenants/alpacasibiza.ts`.

**Phase 3 gate:** `tsc --noEmit` clean. HTML snapshot diff of `/en`, `/nl/tours`, `/de/contact`, `/en/yoga` all zero (same rendered output, new code paths). Spec 010 acceptance criteria verified.

---

## Phase 4 — Verify: Dry-Run Bootstrap Diff

**Goal:** Re-run the Phase 0 dry-run bootstrap and diff its output against alpaca's current state. The diff shrinks with each phase; this is the objective measure of migration progress.

**4.1 — Re-run the dry-run.**
```powershell
$scratch = "$env:TEMP\alpaca-saas-scratch-p4"
Remove-Item $scratch -Recurse -Force -ErrorAction SilentlyContinue
& "C:\Users\cruzb\Projects\claude-saas-framework\bootstrap.ps1" `
  -Name "alpaca-saas-scratch-p4" `
  -Stack next `
  -IntegrationsFile "C:\Users\cruzb\Projects\claude-saas-framework\intake\alpacasibiza.yaml" `
  -OutputDir $env:TEMP
```

**4.2 — Diff against alpaca current.**
```powershell
Compare-Object `
  (Get-Content "$scratch\CLAUDE.md") `
  (Get-Content "C:\Users\cruzb\Projects\alpaca-farm-redesign\CLAUDE.md") |
  Out-File "C:\Users\cruzb\Projects\alpaca-farm-redesign\reports\migration-phase4-drift.txt" -Encoding utf8

(Get-Content "C:\Users\cruzb\Projects\alpaca-farm-redesign\reports\migration-phase4-drift.txt").Count
```
The line count is your remaining work quantity. Target: under 10 lines before Phase 5.

**4.3 — Classify remaining diff lines.**
Each differing line is one of:
- (a) Alpaca has MORE than framework (done-spec additions — correct, not debt)
- (b) Framework has MORE than alpaca (gap — needs adoption)
- (c) Value mismatch (placeholder not substituted or YAML field missing)

Type (a) lines do not need resolution. Type (b) and (c) are the true remaining migration debt.

**Phase 4 gate:** Diff report saved. Remaining type-(b)+(c) lines counted and classified.

---

## Phase 5 — Lock: Declare Framework Alignment

**Goal:** Once the Phase 4 diff is under 10 non-(a) lines, declare alpaca "framework-aligned" with an ADR.

**5.1 — Confirm diff threshold.**
```powershell
$driftCount = (Get-Content "C:\Users\cruzb\Projects\alpaca-farm-redesign\reports\migration-phase4-drift.txt").Count
if ($driftCount -gt 10) { Write-Warning "Drift still $driftCount lines — do not lock yet" }
else { Write-Host "Drift is $driftCount lines — ready to lock" }
```

**5.2 — Write the ADR.**
Create `alpaca-farm-redesign/docs/adr/014-framework-alignment.md`:
```
# ADR 014 — alpaca-farm-redesign aligned to claude-saas-framework (Tenant #1)

**Date:** <date of lock>
**Status:** Accepted

## Context
alpaca-farm-redesign was migrated incrementally from hand-coded single-tenant
to claude-saas-framework alignment per docs/migration-to-saas-framework.md.

## Decision
Declare alpaca-farm-redesign framework-aligned. Tenant config is canonical in
lib/tenants/alpacasibiza.ts. Intake YAML lives in
claude-saas-framework/intake/alpacasibiza.yaml.

## Consequences
- New tenant values are added to alpacasibiza.ts first, then reflected in YAML.
- Structural framework changes require re-running the Phase 4 drift check.
- Translations sweep (brand-noun interpolation) is deferred — see §Blockers.
```

**5.3 — Update CLAUDE.md failsafe map.**
Add a row for `lib/tenants/alpacasibiza.ts` → `getTenant()` as the new failsafe boundary for tenant-specific values.

**5.4 — Final verification.**
```powershell
npx tsc --noEmit -p "C:\Users\cruzb\Projects\alpaca-farm-redesign\tsconfig.json"
```
Expected: zero errors.
```powershell
git -C "C:\Users\cruzb\Projects\alpaca-farm-redesign" diff --stat
```
Review the changed files list. Confirm nothing outside the reload zone and watch list was touched.

**Phase 5 gate:** ADR 014 written. CLAUDE.md updated. `tsc --noEmit` clean. Migration complete.

---

## Blockers — Five Conditions That Force Regenerate Instead of Incremental

**If any of these materialize**, the incremental path collapses and regenerate becomes the only option. Document the finding and surface to Cruz before proceeding.

**Blocker 1 — Done specs containing logic the framework template does not yet have.**
Alpaca has 11+ specs in `specs/done/`. Several (e.g., the payment-provider abstraction in ADR 013, the rate-limiting pattern in ADR 011, the CSP policy in ADR 010, the availability ISR in ADR 008) encode non-trivial architectural decisions. If a framework template regenerates any of these files from scratch, those decisions are lost. The incremental path avoids this by never running bootstrap against an existing directory. The regenerate path forces a manual re-application of every done spec after scaffold. That is not safer — it is more error-prone. **Owner decision:** if framework templates gain new mandatory structure that conflicts with a done spec, a spec-by-spec reconciliation must happen before any regenerate run.

**Blocker 2 — The `philosophy/active/` evidence directory.**
The directory `philosophy/active/` (referenced in earlier session context as "already retired but preserved") may contain decision evidence that informs alpaca's ADR chain. If framework bootstrap creates a fresh `docs/adr/` tree that omits this history, the incremental chain breaks. Verify the directory's current state and whether any ADR references it before Phase 1:
```powershell
Test-Path "C:\Users\cruzb\Projects\alpaca-farm-redesign\philosophy"
Get-ChildItem "C:\Users\cruzb\Projects\alpaca-farm-redesign\philosophy" -Recurse -File | Select-Object FullName
```
If it exists and ADRs reference it, the regenerate path must preserve it explicitly — or it is lost.

**Blocker 3 — `lib/payment-vendor.ts` duplicated in framework's stripe-payments module.**
Alpaca's `lib/payment-vendor.ts` already implements the payment-provider abstraction (two adapters: `stripeDirectAdapter` + `stripeConnectAdapter`, the latter with a deliberate throw guard per CLAUDE.md failsafe map). The framework's stripe-payments module (if present at `claude-saas-framework/modules/stripe-payments/`) may define the same abstraction with a different interface. Verifying compatibility is Phase 2 work, but if the interfaces diverge structurally, the incremental swap (Phase 2 Step 2.3) will block. A regenerate run would overwrite the entire `lib/payment-vendor.ts` with the framework version, losing alpaca's deliberate fail-CLOSED Connect guard. **This is the highest-risk blocker for data integrity (money).** Check for the module:
```powershell
Test-Path "C:\Users\cruzb\Projects\claude-saas-framework\modules\stripe-payments"
```

**Blocker 4 — Hardcoded brand-color inconsistency (`#6da855` vs `#556B2F`) not resolved at intake.**
The YAML preserves both values with `<<OWNER_INPUT_NEEDED>>`. If this question is never answered, the framework intake YAML has two different "primary" colors, which makes any generated CSS or theme file ambiguous. Phase 3 Step 3.3 (app/layout.tsx swap) cannot produce a clean `tenant.brandColors.themeColor` assignment without knowing which value is authoritative for which surface. A regenerate run would face the same ambiguity — it cannot resolve a content decision that only the owner can make. **This blocker applies equally to incremental and regenerate paths.**

**Blocker 5 — Translation files with brand nouns already interpolated.**
Six locale JSON files (`translations/en.json`, `de.json`, `it.json`, `es.json`, `nl.json`, `fr.json`) contain brand-noun literals (`Alpacas Ibiza`, `Es Currals`, `Wishfulfilling Weaving`, `info@alpacasibiza.com`, `hello@alpacasibiza.com`, `San Carlos`, `+32 475 58 65 44`) mixed directly into translatable copy strings (36 occurrences of `Wishfulfilling Weaving` alone). The framework's tenant-token interpolation system (`{{brandName}}`, `{{contact.email}}` etc.) cannot be applied until all six locale files have their brand literals extracted and replaced with tokens. That is a mechanical but large operation (estimated 66 occurrences × 6 locales). If a regenerate run produces fresh, token-aware translation scaffolds, they will be blank — all the existing translations would need to be re-applied by hand into the new token structure. The incremental path defers this as a separate PR (per mr-002 key decision 3), which is lower risk. **The translation sweep is the last non-trivial work item regardless of path chosen.**

---

## Single Biggest "This Might Force Regenerate" Concern

**The payment-vendor / stripe-payments module collision (Blocker 3).** All other blockers are content or config decisions. This one is a structural code conflict involving a security-critical file (`lib/payment-vendor.ts`) that has a deliberate throw guard blocking unlicensed money transmission. If the framework's stripe-payments module defines the same abstraction with a different interface shape, the only way to reconcile without incremental is to regenerate and then manually re-apply the fail-CLOSED Connect guard. If that guard is missed in the re-apply, the Stripe Connect path activates prematurely. That is the failure mode with the highest consequence. Verify Blocker 3's module existence check (above) before starting Phase 2.
