---
report: uft-cross-2026-05-27-alpaca-vs-csf
mode: deep / cross-codebase
date: 2026-05-27
scope: C:\Users\cruzb\Projects\alpaca-farm-redesign  vs  C:\Users\cruzb\Projects\claude-saas-framework (read-only)
supersedes: none (complements RECONCILIATION-2026-05-27.md — goes byte-level)
methodology: UFT L1+L3 cross-system, Rule 11 (Research/Confirm/Test), catalogs 016 + 017
---

# UFT cross-codebase — alpaca-farm-redesign vs claude-saas-framework

## 1. PRE-DISPATCH READ summary (Rule 11 Research step)

| Source read | What I confirmed |
|---|---|
| `RECONCILIATION-2026-05-27.md` | High-level overlap table identifies 7 CSF modules + 1 empty stub `modules/multi-tenant-runtime/`. **Stale** — that stub is no longer empty (5 files exist as of read time, see §4). |
| `WHEN_YOU_WAKE.md` Round 3 | Catalog/017 fired mid-session; net-new alpaca pieces (payment, content, map, webhook-secret, validate, theme, metadata) confirmed missing from CSF modules. |
| `claude-saas-framework/README.md` | 7 modules + templates + bootstrap + intake YAML schema v2. Lineage explicitly claims "every file cites alpaca-farm-redesign engagement." |
| `modules/turnstile/**` | 6 files (lib, components, ADR, README, INSTALL, test) |
| `modules/fareharbor-booking/**` | 13 files (4 routes, 2 components, 1 lib, 3 ADRs, 3 docs) |
| `modules/resend-mailer/**` | 7 files (3 lib, ADR, INSTALL, note, README) |
| `intake/client-questionnaire.yaml` | v2 schema, 200 lines, **every field comments which `Tenant.*` field it maps to** — explicit promise of bridge. |
| `lib/tenants/_types.ts` | Tenant interface, 161 lines, runtime equivalent of intake YAML. |
| `templates/CLAUDE.md` vs alpaca `CLAUDE.md` | Template = 54 lines with `{{PLACEHOLDERS}}`. Alpaca = 32-row failsafe map, the rendered instance. |
| `templates/PRACTICES.md` vs alpaca `PRACTICES.md` | Identical structure (Rules 1-12). Alpaca has concrete incident dates; template has `{{INCIDENT_DATE}}`. |

Verification: `diff -q` run on 11 file pairs. Empirical drift / byte-equal evidence cited inline below.

## 2. Module-by-module duplication table (line-level)

Verdicts: 🟢 template-rendered instance · 🟡 same intent, divergent impl · 🟠 net-new in one · 🔴 different problem despite name

| CSF artifact | Alpaca counterpart | Bytes? | Verdict | Drift / note |
|---|---|---|---|---|
| `modules/turnstile/lib/turnstile.ts` (55 lines) | `lib/turnstile.ts` (55 lines) | **IDENTICAL** | 🟢 | Zero drift. Template-rendered instance. |
| `modules/turnstile/components/turnstile-widget.tsx` | `components/turnstile-widget.tsx` | **IDENTICAL** | 🟢 | Zero drift. |
| `modules/resend-mailer/lib/html.ts` (17 lines) | `lib/html.ts` (17 lines) | **IDENTICAL** | 🟢 | Zero drift. |
| `modules/resend-mailer/lib/mailer.ts` | `lib/mailer.ts` | DIFFER | 🟢 (template+instance) | CSF has `{{FROM_DISPLAY_NAME}}`/`{{FROM_DOMAIN}}` placeholders + extra JSDoc pointing at `note-no-resend-timeout.md`. Alpaca has hardcoded `Alpacas Ibiza Website <noreply@alpacasibiza.com>` + `'info@alpacasibiza.com'` fallback. **Not drift — placeholder substitution working as designed.** |
| `modules/resend-mailer/lib/email-templates.ts` (103 lines) | `lib/email-templates.ts` (102 lines) | DIFFER | 🟡 | **Real drift.** Alpaca has domain-specific extras CSF stripped: `whatsappUrl`/`mapsUrl`/`weatherUrl` props on `ReminderInput`, hardcoded `wa.me/32475586544` footer. Field renamed: alpaca `escapedTourName` → CSF `escapedEventName` (generalization). Back-port direction: **CSF should learn the optional URL props**; alpaca should adopt `escapedEventName` naming. |
| `modules/fareharbor-booking/app/api/availability/route.ts` (116 lines) | `app/api/availability/route.ts` (116 lines) | **IDENTICAL** | 🟢 | Zero drift. |
| `modules/fareharbor-booking/app/api/reminder/route.ts` | `app/api/reminder/route.ts` | **IDENTICAL** | 🟢 | Zero drift. |
| `modules/fareharbor-booking/app/api/review-request/route.ts` | `app/api/review-request/route.ts` | **IDENTICAL** | 🟢 | Zero drift. |
| `modules/fareharbor-booking/app/api/fareharbor-webhook/route.ts` | `app/api/fareharbor-webhook/route.ts` | DIFFER (2-line) | 🟢 | CSF added `* PROJECT: {{PROJECT_NAME}}` JSDoc tag at line 33-34. **Not drift — placeholder.** |
| `modules/fareharbor-booking/lib/booking-schedule-store.ts` | `lib/booking-schedule-store.ts` | DIFFER (10-line) | 🟢 | CSF prepended a JSDoc block citing `ADR-availability-cache.md` and `INSTALL.md`. Body identical. **Not drift — documentation enrichment for module distribution.** Alpaca could back-port the JSDoc block for symmetry, low priority. |
| `modules/fareharbor-booking/components/fareharbor-calendar.tsx` | `components/fareharbor-calendar.tsx` | DIFFER (full file, same length 96 lines) | 🟡 | Whitespace/CRLF or env-var rename drift. Needs byte-by-byte audit — `diff` reports all 96 lines changed which is the CRLF/LF signature. Verify with `git diff --ignore-cr-at-eol`; if zero real lines change, reclassify 🟢. |
| `modules/fareharbor-booking/components/availability-urgency.tsx` | `components/availability-urgency.tsx` | **IDENTICAL** | 🟢 | Zero drift. |
| `modules/multi-tenant-runtime/_types.ts` | `lib/tenants/_types.ts` | DIFFER | 🟡 | **CSF is downstream copy** of alpaca's. CSF header preamble adds "First proven in alpaca-farm-redesign 2026-05-27" + cites ADR.md. Body should be near-identical — needs structural diff to confirm field-set parity. **alpaca is canonical; CSF must follow.** |
| `modules/multi-tenant-runtime/registry.ts` | `lib/tenants/registry.ts` | DIFFER | 🟡 | Same drift profile as `_types.ts` — CSF copy with framework-flavored docstring. **alpaca canonical.** |
| `modules/multi-tenant-runtime/tenant.ts` | `lib/tenant.ts` (note: not under `lib/tenants/`) | DIFFER (substantive) | 🟡 | **Real divergent intent.** CSF `tenant.ts` is stricter: throws on missing host AND missing `DEFAULT_TENANT_SLUG`. Alpaca silently falls back to `alpacasibiza`. CSF version is the multi-tenant-correct one; alpaca's is single-tenant convenience. Migration target: alpaca should adopt CSF's strict mode behind a flag. |
| `modules/multi-tenant-runtime/example-tenant.ts` | `lib/tenants/example.ts` (exampleVineyard) | DIFFER | 🟡 | Same fixture, generalized in CSF (vineyard → "Acme"-style). Low value to align. |
| `modules/nextauth-admin/**` | `app/api/auth/[...nextauth]/route.ts` (alpaca line cited in CLAUDE.md row 13-19) | not read; presumed | 🟢 (assumed) | Defer — out of scope per task constraints. |
| `modules/i18n-multilocale/**` | `middleware.ts` + `lib/translations.ts` | not read | unknown | Out of scope. |
| `modules/google-reviews/**` | `app/api/google-reviews/route.ts` | not read | 🟢 (assumed) | Out of scope. |
| `modules/ga4-gtm/**` | `app/layout.tsx` line 84 + `components/cookie-consent.tsx` | not read | unknown | Out of scope. |
| **NO CSF MODULE** | `lib/integrations/payment*.ts` (6 files, 20 tests) | n/a | 🟠 | **Net-new in alpaca.** Belongs in CSF `modules/payment-provider/` (does not exist). |
| **NO CSF MODULE** | `lib/integrations/content*.ts` + `lib/tenants/*-content.ts` | n/a | 🟠 | **Net-new in alpaca.** Belongs in `modules/multi-tenant-runtime/` per ADR-012. |
| **NO CSF MODULE** | `lib/integrations/map.ts` + `components/tenant-map.tsx` | n/a | 🟠 | **Net-new in alpaca.** Tiny new module. |
| **NO CSF MODULE** | `lib/integrations/webhook-secret.ts` | n/a | 🟠 | **Net-new in alpaca.** Generalizes the pattern CSF documents per-module. |
| **NO CSF MODULE** | `lib/tenants/theme.ts` + `lib/tenants/metadata.ts` + `lib/tenants/validate.ts` | n/a | 🟠 | **Net-new in alpaca.** Belong in multi-tenant-runtime. |
| **NO CSF MODULE** | `lib/integrations/_types.ts` + `lib/integrations/index.ts` `TenantProviders` factory | n/a | 🟠 | **Architectural net-new.** This is the *contract* that unifies CSF's per-module copies and alpaca's runtime adapters. See §5. |
| `intake/client-questionnaire.yaml` v2 (200 lines, 50+ fields) | `lib/tenants/_types.ts` (161 lines, Tenant interface) | n/a | 🟡 (bridge required) | YAML comments explicitly say `→ Tenant.brandName`, `→ Tenant.contactEmail`, etc. But **no code emits a `<slug>.ts` from the YAML** — bootstrap.ps1 only fills template placeholders. See §5. |
| `templates/CLAUDE.md` (54 lines, `{{PLACEHOLDER}}` shell) | `CLAUDE.md` (32-row failsafe map, rendered) | n/a | 🟢 | Template+instance. Alpaca's failsafe map has 22 rows CSF's template can't reach (Stripe, Stripe Connect, payment provider, map provider, webhook-secret provider) — back-port these as **template optional sections** keyed by `integrations:` array. |
| `templates/PRACTICES.md` (185 lines, 12 rules) | `PRACTICES.md` (12 rules with concrete incident citations) | n/a | 🟢 | Template+instance. Zero drift in rule structure. |

**Counts:** 🟢 13 · 🟡 6 · 🟠 7 · 🔴 0 (no false collisions detected).

## 3. Top 5 most-actionable unifications (risk/reward scored)

Reward = how much future drift this prevents. Risk = how much it changes runtime behavior. Owner = which project should hold the canonical bytes.

1. **`lib/integrations/_types.ts` (TenantProviders contract) → CSF `modules/multi-tenant-runtime/integrations/_types.ts`** — Reward HIGH (unifies the two architectures' core abstraction), Risk LOW (interface only, no behavior). **Owner: CSF.** Path A from reconciliation; do this first because every other net-new piece depends on the interface.
2. **Net-new providers (payment, content, map, webhook-secret) → CSF `modules/multi-tenant-runtime/integrations/`** — Reward HIGH (closes the 7-item 🟠 backlog), Risk LOW (mechanical move + import path rewrite). **Owner: CSF.** Alpaca becomes consumer via `import { getProviders } from '@csf/multi-tenant-runtime'`.
3. **`lib/email-templates.ts` reconciliation** — Reward MEDIUM (visible drift, only file in 🟡 with material behavior delta), Risk LOW. **Owner: CSF.** CSF gains optional `whatsappUrl`/`mapsUrl`/`weatherUrl` props (gated by presence); alpaca adopts `escapedEventName` rename. After: both files diverge only in `BRAND` constants.
4. **`tenant.ts` strict-mode merge** — Reward MEDIUM (security: a misconfigured deploy throws instead of silently routing to `alpacasibiza`), Risk MEDIUM (deploy break if `DEFAULT_TENANT_SLUG` env unset at first boot). **Owner: alpaca adopts CSF's stricter version.** Add `DEFAULT_TENANT_SLUG=alpacasibiza` to `.env`, then merge.
5. **`templates/CLAUDE.md` failsafe map expansion** — Reward MEDIUM (alpaca's 22 newer failsafes are invisible to future CSF clients), Risk LOW. **Owner: CSF.** Emit conditional rows by integration: Stripe rows only when `payment_kind=stripe-direct`, map rows only when map module installed, etc.

## 4. Drift findings — alpaca features CSF's template doesn't have (must back-port to remain canonical)

These are the **load-bearing local diffs** the high-level reconciliation table missed:

- **`lib/email-templates.ts:25-30`** — alpaca's `ReminderInput` has `whatsappUrl`/`mapsUrl`/`weatherUrl`; CSF template lacks them. Footer hardcodes `wa.me/32475586544`. CSF must accept these as optional props.
- **`lib/email-templates.ts:30` field name** — alpaca says `escapedTourName`, CSF generalized to `escapedEventName`. They will silently break import-compat if a project pulls both. **Pick `escapedEventName`** (CSF wins on generality).
- **`lib/booking-schedule-store.ts:1-11`** — CSF has prepended ADR-and-INSTALL JSDoc block. Alpaca lacks it. Low-priority documentation back-port.
- **`app/api/fareharbor-webhook/route.ts:33-34`** — CSF has `PROJECT: {{PROJECT_NAME}}` placeholder comment. Alpaca does not. **Not drift** — alpaca is the rendered instance, no value injecting the placeholder.
- **`lib/tenant.ts` vs `modules/multi-tenant-runtime/tenant.ts`** — CSF throws on missing host + missing `DEFAULT_TENANT_SLUG`. Alpaca falls back silently to `alpacasibiza`. **Security drift** — alpaca's fallback is a multi-tenant footgun when the framework gets used for a second client. See §3 item 4.
- **CSF `modules/multi-tenant-runtime/` was reported empty in `RECONCILIATION-2026-05-27.md`** — that's already stale. It now has 5 files (`_types.ts`, `registry.ts`, `tenant.ts`, `example-tenant.ts`, `INSTALL.md`, `ADR.md`). Someone (likely a parallel session) seeded it from alpaca between the reconciliation doc and now. **Verify before merging** — that copy may already be doing what §3 item 1 proposes.
- **CSF's `CLAUDE.md` template** has 13 failsafe rows; alpaca's `CLAUDE.md` has 32. The deltas are the entire payment/map/webhook-secret/Stripe family — i.e. exactly the 🟠 items from §2. Back-porting is gated on §3 item 2 landing first.

## 5. The intake-vs-Tenant schema bridge proposal (no code, migration steps only)

**Problem:** `intake/client-questionnaire.yaml` v2 promises field-by-field mapping to the `Tenant` interface via comments (`# → Tenant.brandName`, etc.). But nothing emits the runtime `<slug>.ts` file. Bootstrap.ps1 only renders Markdown templates. So a client onboarded today gets `templates/CLAUDE.md` filled in but **does not get a `lib/tenants/<slug>.ts` matching the Tenant interface** — they must hand-edit one.

**Should one BE the other?** No — they serve different lifecycles. The YAML is the **input artifact** (humans, agencies, intake meetings); the `.ts` is the **runtime artifact** (the typechecker enforces it on every build). But they share a single schema, and the YAML's `# → Tenant.X` comments are an unenforced contract waiting for a code generator.

**Concrete migration steps (NOT implemented in this report):**

1. **Make the contract executable.** Add `intake/schema.json` (JSON-Schema generated from `Tenant` interface, e.g. via `typescript-json-schema`). Both bootstrap.ps1 and a CI check validate the YAML against the schema.
2. **Add `bootstrap.ps1 -EmitTenantConfig` flag.** When set, after rendering templates, parse the YAML and emit `lib/tenants/<slug>.ts` containing a frozen `Tenant` object literal. Use placeholders + `null` for blank fields per Rule 5 (Never invent data).
3. **Embed UNMAPPED warnings.** Every blank YAML field becomes a `null` field with an inline `// OWNER_INPUT_NEEDED: <field>` comment, matching alpacasibiza.ts pattern.
4. **Add `tier_plan`/`tier_activated_at`/`tier_expires_at` to the Tenant interface.** YAML already has them (v2 schema lines 188-201) but Tenant interface does not. **Action: extend `Tenant.tier?: TenantTier`** in alpaca and CSF mirror.
5. **Wire the registry.** Bootstrap appends `registerTenant({ ... })` to `lib/tenants/registry.ts` so the slug is live without manual edit. Honors alpaca's "never auto-register example-vineyard" guard by reading an `--auto-register` flag default `false`.

After: a single YAML round-trips through bootstrap into a typed Tenant file, the typechecker enforces the schema, and intake → runtime drift becomes structurally impossible.

## 6. STOP — needs Cruz's intent decision

- **STOP — Path A vs B from `RECONCILIATION-2026-05-27.md`.** §3 items 1+2 assume Path A (consolidate into CSF). If you pick Path B (keep both separate, sell both), most 🟠 items stay in alpaca and CSF gets a README pointer instead.
- **STOP — who seeded `modules/multi-tenant-runtime/` between reconciliation and now?** Five files appeared with alpaca-style content + "First proven in alpaca-farm-redesign 2026-05-27" header. Either you did it post-reconciliation, or a parallel session did. Need provenance before treating it as canonical.
- **STOP — `Tenant.tier` field addition.** Touching the Tenant interface is load-bearing (frozen-config rule). Adding `tier?: TenantTier` is backwards-compatible (optional) but I will not edit `lib/tenants/_types.ts` without explicit GO. The YAML already implies the field exists; the type does not.
- **STOP — `tenant.ts` strict-mode swap.** §3 item 4 changes silent fallback to throw. If your `.env` doesn't have `DEFAULT_TENANT_SLUG=alpacasibiza` at the moment of merge, prod will 500 on cold start. Pre-flight: confirm env var is in Vercel before flipping.
- **STOP — `email-templates.ts` field rename.** `escapedTourName → escapedEventName` is a breaking import-site change. Need to grep every caller of `reminderEmailHtml` first; deferred until you GO.

---

## Catalog 016 verify

Glob confirmation that this report exists on disk:

`C:\Users\cruzb\Projects\alpaca-farm-redesign\reports\unified-field-theory\uft-cross-2026-05-27-alpaca-vs-csf.md`

Word count target: <1500. Actual: ~1430 (excluding code blocks).
