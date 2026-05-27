# Reconciliation — alpaca vs claude-saas-framework

> **🛑 STALE on one claim (caught by 4 follow-up kit-skill agents).** This file says CSF's `modules/multi-tenant-runtime/` is an "empty stub." It is NOT — 6 files exist there (`_types.ts`, `registry.ts`, `tenant.ts`, `example-tenant.ts`, `INSTALL.md`, `ADR.md`) and the CSF version is CANONICAL for the interface; alpaca's is a subset. **Path A is therefore a MERGE, not a fresh extraction.** See `reports/probability-storm/ps-A-B-C-2026-05-27-reconciliation-paths.md` + `reports/matrix-reload/mr-pathA-2026-05-27-multi-tenant-runtime-extraction.md` for the corrected analysis. Estimated effort revised: 3–4h → ~6h (matrix-reload) or ~38h (probability-storm P50). A NEW path (D3, freeze CSF + ship alpaca runtime) is now on the table.

**Generated:** 2026-05-27 late-night
**Trigger:** philosophy-prompting catalog/017 (check sibling projects before scaffolding) fired. The sibling project `C:\Users\cruzb\Projects\claude-saas-framework` (v0.1.1) already covers most of the SaaS-framework scope I built into `alpaca-farm-redesign` tonight.

This file lives in the alpaca project because it documents what to MOVE OUT.

---

## What CSF already has (built 2026-05-27 in parallel with my alpaca work)

```
claude-saas-framework/  v0.1.1, 93 files
├── README.md, ONBOARDING.md (7-phase client playbook), WAKEUP-2026-05-27.md
├── bootstrap.ps1 + bootstrap.sh           ← scaffold a new client from intake YAML
├── templates/                              ← CLAUDE.md / PRACTICES.md / START_HERE.md / CANT_BE_DONE.md (with {{PLACEHOLDERS}})
├── modules/  (7 modules, drag-and-drop)
│   ├── turnstile/                          ← CAPTCHA (fail-open dev / fail-closed prod)
│   ├── resend-mailer/                      ← email with scheduledAt + emailLayout
│   ├── nextauth-admin/                     ← fail-closed admin + 8h JWT
│   ├── i18n-multilocale/                   ← locale prefix + cookie + Accept-Language
│   ├── fareharbor-booking/                 ← booking + availability ISR + webhook
│   ├── google-reviews/                     ← server proxy + fail-graceful badge
│   ├── ga4-gtm/                            ← GA4 + GTM + Consent Mode v2
│   └── multi-tenant-runtime/               ← EMPTY STUB ← ★ this is where tonight's alpaca work belongs ★
├── skills/  philosophy-prompting (15 catalog entries) + agent-teams-config
├── hooks/   005-no-cortex-saves.py + INSTALL.md
├── intake/  client-questionnaire.yaml + samples (alpaca / saas-marketing / consultancy)
└── business/ PITCH.md + PRICING.md (3 monetization sketches) + COMPETITIVE.md + ROADMAP-business.md
```

## What I built tonight in alpaca-farm-redesign (Round 2 of WHEN_YOU_WAKE.md)

```
alpaca-farm-redesign/
├── lib/tenants/                            ← runtime tenant resolution (Round 1)
│   ├── _types.ts, registry.ts, server.ts
│   ├── alpacasibiza.ts, example.ts         ← two concrete tenants
│   ├── theme.ts, metadata.ts, validate.ts
│   └── alpacasibiza-content.ts, example-content.ts
├── lib/integrations/                       ← provider abstraction layer (Round 2)
│   ├── _types.ts, index.ts                 ← TenantProviders bundle factory
│   ├── booking-{fareharbor,manual-inquiry}.ts
│   ├── email-{resend,console-only}.ts
│   ├── captcha-{turnstile,none}.ts
│   ├── analytics-ga4-gtm.ts
│   ├── content{,-types,-static-typescript}.ts
│   ├── map.ts, webhook-secret.ts
│   └── payment{,-manual-mailto,-fareharbor-passthrough,-stripe-direct,-stripe-connect,-mollie}.ts
├── components/tenant-map.tsx
├── specs/saas-framework/001-005.md         ← five Sonnet-agent blueprint docs
└── docs/adr/{010,011,012,013}.md           ← four new ADRs from this work
```

## Overlap analysis

| Concern | CSF has it as | I built it as | Verdict |
|---|---|---|---|
| Integration modules (booking/email/captcha/analytics/reviews/i18n) | `modules/<name>/` drop-in copies (with their own README + ADRs + INSTALL.md) | `lib/integrations/<name>.ts` runtime provider adapters | **Different architecture, same concern.** CSF = per-client deploy. Mine = one-deploy-many-tenants. |
| Tenant intake | `intake/client-questionnaire.yaml` (50+ fields) → bootstrap.ps1 generates project | `lib/tenants/<slug>.ts` typed config file | **CSF intake feeds my tenant file format.** Bootstrap could emit a `<slug>.ts` matching `Tenant` type. |
| Business case (pricing/pitch/competitive) | `business/PITCH.md` + `PRICING.md` (3 options) + `COMPETITIVE.md` + `ROADMAP-business.md` | `specs/saas-framework/005-billing-onboarding.md` | **CSF more complete.** My spec is a re-derivation of the same analysis. CSF wins. |
| Templates | `templates/CLAUDE.md`/`PRACTICES.md`/etc with `{{PLACEHOLDERS}}` | The actual filled-in files in alpaca root | **CSF's templates produced my filled-in files.** No duplication; alpaca is a CSF instance. |
| Philosophy-prompting skill | `skills/philosophy-prompting/` (15 catalog entries) | Same skill, already symlinked/installed in `~/.claude/skills/` | **Same skill bundle.** No duplication. |
| `005-no-cortex-saves` hook | `hooks/005-no-cortex-saves.py` | Same hook at `~/.claude/hooks/005-no-cortex-saves.py` | **Same artifact.** No duplication. |
| Payment provider abstraction | NOT IN CSF YET | `lib/integrations/payment*.ts` (5 adapters + interface + tests) | **Net-new value.** CSF doesn't have a payment module; could absorb mine. |
| Content provider abstraction (per-tenant animals/products/team) | NOT IN CSF YET | `lib/integrations/content*.ts` + 5 entity types | **Net-new value.** Belongs in `modules/multi-tenant-runtime/`. |
| Map provider (OSM + Google) | NOT IN CSF YET | `lib/integrations/map.ts` | **Net-new value.** Tiny — could be a module. |
| Webhook-secret abstraction (fail-open + fail-closed) | NOT IN CSF YET | `lib/integrations/webhook-secret.ts` | **Net-new value.** Consolidates a pattern CSF documents per-module. |
| Theme CSS-var builder | NOT IN CSF YET | `lib/tenants/theme.ts` | **Net-new value.** |
| Tenant metadata builder | NOT IN CSF YET | `lib/tenants/metadata.ts` | **Net-new value.** |
| Tenant validate (runtime check) | NOT IN CSF YET | `lib/tenants/validate.ts` | **Net-new value.** |
| End-to-end tenant proof (two tenants, no forking) | NOT IN CSF YET | `alpacasibiza` + `exampleVineyard` round-tripping through `getProviders()` | **Net-new value.** Proves the multi-tenant-runtime model. |

## Conclusion

- **~50% of my night's work is duplicated** by CSF (bootstrap, modules' per-integration scaffolding, templates, business analysis, intake).
- **~50% is net-new value** belonging in `claude-saas-framework/modules/multi-tenant-runtime/` (currently an empty stub directory).

## Recommendation (your call, not mine to execute)

### Path A — Promote multi-tenant-runtime as a CSF module
Move the net-new pieces into `claude-saas-framework/modules/multi-tenant-runtime/`:
- `lib/tenants/*` + `lib/integrations/*` → CSF module's `lib/`
- `components/tenant-map.tsx` → CSF module's `components/`
- Two tenants (`alpacasibiza`, `exampleVineyard`) → become `samples/` showing the bundle in use
- ADRs 010-013 → CSF module's `docs/adr/`
- The runtime provider interface set (BookingProvider / EmailProvider / etc) becomes the **contract that all the per-integration CSF modules can implement** — unifying the two architectures.

Alpaca then imports from CSF instead of holding the provider layer locally.

**Effort:** ~3-4 hours of mechanical moving + reference updates. No new design.

### Path B — Keep both architectures separate
- CSF stays the agency / bootstrap product (one repo per client, drop-in modules).
- Alpaca's `lib/integrations/` stays as the runtime SaaS prototype (one repo, runtime tenant resolution).
- CSF gets a `modules/multi-tenant-runtime/` README pointing at alpaca as the reference implementation.
- Sell BOTH: agency engagements via CSF (high-margin, low-volume), SaaS platform via alpaca-derived runtime (low-margin, high-volume).

**Effort:** ~30 min to write the cross-reference docs.

### Path C — Pick one, deprecate the other
- The market answer depends on whether you want to be an agency or a platform business.
- `business/COMPETITIVE.md` in CSF probably already analyzed this — read it before deciding.

## What I will NOT do without your GO

- I will not move files between projects autonomously
- I will not write to claude-saas-framework from this conversation
- I will not delete anything I built tonight in alpaca

## What I AM doing right now

- Stopping all framework scaffolding in alpaca
- Capturing this reconciliation
- Pointing WHEN_YOU_WAKE.md at this file as the load-bearing decision document

## Recurrence note for catalog/017

This session opened catalog/017 (sibling-project check) BEFORE finishing the multi-tenant scaffolding. The rule fired in time to prevent further duplication. Recurrence log entry should be added: "2026-05-27 alpaca-farm-redesign session — detected mid-session after Wave A completion. Damage: ~50% of Wave A is duplicate scope vs claude-saas-framework. Mitigation: this reconciliation report; no further scaffolding until owner decides Path A/B/C."

---

## Tonight's net-new value (the bits worth keeping regardless of Path A/B/C)

These are designs that exist nowhere in CSF and are worth preserving in whichever project ends up owning them:

1. **PaymentProvider interface** — 5 adapters including `stripe-connect` THROW-GUARDED until tenant #1 signs (regulatory failsafe)
2. **ContentProvider + 5 entity types** — proves the alpaca-vs-vineyard abstraction works
3. **Two-tenant integration test** at `getProviders(tenant)` boundary
4. **ADR-012** (content provider) + **ADR-013** (payment defaults to manual-mailto)
5. **Tenant runtime validation** — slug/hex/email/E.164/locale-consistency checks, never throws
6. **CSS-vars theme injection** with HSL emitter matching the existing `globals.css` `:root` pattern
7. **OSM-iframe map fallback** when no Google Maps API key (peer-norm parity with no $0 cost)

If Path A wins, all of these get promoted into CSF. If Path B wins, they document the runtime architecture.
