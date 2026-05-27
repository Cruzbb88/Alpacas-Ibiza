---
report_id: mr-pathA-2026-05-27-multi-tenant-runtime-extraction
mode: deep
project: alpaca-farm-redesign → claude-saas-framework/modules/multi-tenant-runtime
date: 2026-05-27
catalogs_applied: [005-no-cortex, 010-prefetch-read, 011-rule-eleven-cite, 016-verify-output, 017-sibling-check]
layers_run: [L1, L2, L3, L4, L5]
write_targets: alpaca-farm-redesign/reports/** only
csf_writes: NONE (planning only)
---

# MR-PathA — multi-tenant-runtime extraction PLAN (no execution)

SCOPE CREEP ALERT — the reload zone boundary is a HARD LINE. Files INSIDE: analyze, copy, swap, delete after green. Files OUTSIDE (`lib/validate-env.ts`, `lib/mailer.ts`, `lib/turnstile.ts`, `lib/secrets.ts`, `lib/html.ts`, `lib/fetch.ts`, all `app/api/*`, `components/*` except `tenant-map.tsx`): DO NOT MOVE in Path A.

## 1. PRE-DISPATCH READ summary

Read (catalog 010): `RECONCILIATION-2026-05-27.md`, `lib/integrations/_types.ts`, `lib/integrations/index.ts`, the 20 files in `lib/integrations/`, the 11 files in `lib/tenants/`, `payment.ts` + `payment-stripe-direct.ts`, the 3 cross-boundary callers (`booking-fareharbor`, `email-resend`, `captcha-turnstile`), ADRs 012+013, the existing CSF `modules/multi-tenant-runtime/` stub (6 files — `_types.ts`, `registry.ts`, `tenant.ts`, `example-tenant.ts`, `INSTALL.md`, `ADR.md`), CSF `modules/fareharbor-booking/INSTALL.md` (shape convention), and `ls modules/` (15 modules — confirms `_interfaces`, `payments`, `stripe-payments`, `resend-mailer`, `turnstile`, `booking-provider` exist as peers).

Key finding from PRE-DISPATCH: **the CSF stub is NOT empty** — it already ships a canonical `Tenant` interface (broader than alpaca's: `fareHarbor?` optional, `tier?`, `contentModule?`), a working `registry.ts` (`Map<string,Tenant>` + `registerTenant`/`lookupByHost`/`lookupBySlug`), a strict `tenant.ts` (`getTenant`/`getTenantSync` with `DEFAULT_TENANT_SLUG` fallback), and a complete ADR.md justifying frozen-readonly + module-not-core + single-interface. **Path A is therefore a MERGE, not a fresh extraction.** Alpaca's `lib/tenants/_types.ts` is a SUBSET of the CSF interface; alpaca's `registry.ts` is functionally identical. Net-new from alpaca = the 20 `lib/integrations/*` files + `theme.ts`/`metadata.ts`/`validate.ts` + 2 tenant samples + `tenant-map.tsx` + 4 ADRs + 7 test suites.

## 2. Pain map (current state, L1)

| File / cluster | Pain signal | Severity |
|---|---|---|
| `lib/integrations/index.ts` | Slug-switch on `tenant.slug` for content provider — hard-codes alpaca-specific tenants in framework code. Will grow O(N). | High (ADR-012 flags this) |
| `lib/integrations/payment-stripe-connect.ts` | Throws on activation (regulatory failsafe). Per-project decision baked into "framework" code. | Med (must be configurable per-tenant in CSF) |
| `lib/integrations/booking-fareharbor.ts` | Reaches across to `@/lib/validate-env` + `@/lib/fetch`. Cross-boundary. | Med |
| `lib/integrations/email-resend.ts` | Reaches across to `@/lib/mailer`. Mailer hardcodes `from` address (commented in file). | Med |
| `lib/integrations/captcha-turnstile.ts` | Reaches across to `@/lib/turnstile`. | Med |
| `lib/tenants/alpacasibiza*.ts`, `example*.ts` | Tenant-specific data living next to framework code. Must become `samples/`. | Med |
| `lib/tenants/_types.ts` | Subset of CSF stub's `Tenant`. Two interfaces will drift if both kept. | **HIGH (drift risk)** |
| 7 test suites in `lib/*.test.ts` | Run via `node:test`; will need same runner in CSF, otherwise lose coverage. | Med |
| Bug-density observation | Zero bugs filed against these files in the reconciliation; pain is **architectural**, not behavioral. | Composite L1 score: 72/100 (clear clusters, no live defects) |

## 3. Reload zone boundary (explicit file list, L2)

**INSIDE the zone — moves to CSF:**

```
lib/integrations/ (20 files)
  _types.ts, index.ts
  booking-fareharbor.ts, booking-manual-inquiry.ts
  email-resend.ts, email-console-only.ts
  captcha-turnstile.ts, captcha-none.ts
  analytics-ga4-gtm.ts
  content.ts, content-types.ts, content-static-typescript.ts
  map.ts, webhook-secret.ts
  payment.ts, payment-manual-mailto.ts, payment-fareharbor-passthrough.ts,
  payment-stripe-direct.ts, payment-stripe-connect.ts, payment-mollie.ts
lib/tenants/ (only the framework-shaped pieces — NOT _types.ts/registry.ts/server.ts which already exist in CSF stub)
  theme.ts, metadata.ts, validate.ts                  → modules/multi-tenant-runtime/lib/tenants/
  alpacasibiza.ts, alpacasibiza-content.ts            → samples/
  example.ts, example-content.ts                      → samples/ (rename example-vineyard.ts)
  registry.test.ts                                    → tests/
components/tenant-map.tsx                              → modules/multi-tenant-runtime/components/
docs/adr/010-csp-report-only-with-gtm-unsafe-inline.md → modules/multi-tenant-runtime/docs/adr/
docs/adr/011-in-memory-rate-limit-vs-kv.md             → modules/multi-tenant-runtime/docs/adr/
docs/adr/012-content-provider-abstraction.md           → modules/multi-tenant-runtime/docs/adr/
docs/adr/013-payment-provider-defaults-manual-mailto.md→ modules/multi-tenant-runtime/docs/adr/
lib/*.test.ts (7 selected) → tests/  (payment-providers, content-providers, map-providers, webhook-secret, tenant-validate, tenant-theme, tenant-metadata)
```

**OUTSIDE the zone — stays in alpaca, exposed as interface dependencies (see §4):**
`lib/validate-env.ts`, `lib/mailer.ts`, `lib/turnstile.ts`, `lib/secrets.ts`, `lib/html.ts`, `lib/fetch.ts`, all `app/api/*` routes, all `components/*` except `tenant-map.tsx`, `lib/payment-vendor.ts` (legacy parallel adapter).

**MERGE conflicts to resolve before Step 1:**
- `lib/tenants/_types.ts` vs CSF stub's `_types.ts` — CSF version is **canonical**; alpaca version drops. Alpaca's `payment?: TenantPayment` field already matches CSF.
- `lib/tenants/registry.ts` vs CSF stub's `registry.ts` — CSF version is **canonical** (alpaca's content is functionally a subset).
- `lib/tenants/server.ts` vs CSF stub's `tenant.ts` — CSF version is **canonical** (stricter, has `DEFAULT_TENANT_SLUG`).
- ADRs 010+011 already concern alpaca-specific routes (CSP + rate-limit); they should likely stay in alpaca or be split. **Flag for Cruz** (see §10).

## 4. Cross-boundary interface contracts (L3)

The integrations files import 6 alpaca helpers. Each has a CSF peer module that must provide an equivalent. The contract becomes: **multi-tenant-runtime declares peer-module dependencies in INSTALL.md**; CSF's bootstrap.ps1 wires them in.

| Alpaca helper | Used by | Contract | CSF peer module that must provide it | Gap? |
|---|---|---|---|---|
| `lib/validate-env.ts` `isSet(name)` | `booking-fareharbor.ts` | `(envKey: string) => boolean` | none — generic utility; add as `modules/multi-tenant-runtime/lib/env.ts` | **GAP — add it inside the module (zero-cost helper)** |
| `lib/mailer.ts` `sendEmail`, `cancelScheduledEmail` | `email-resend.ts` | `send({to,subject,html,replyTo?,scheduledAt?}) → {id:string\|null}`; `cancelScheduled(id) → boolean` | `modules/resend-mailer/` | OK — module exists; INSTALL must require `from` address be lifted out of mailer to be tenant-driven (mailer currently hardcodes `from`) |
| `lib/turnstile.ts` `verifyTurnstile` | `captcha-turnstile.ts` | `(token, remoteIp?) → {ok:true} \| {ok:false,reason}` | `modules/turnstile/` | OK |
| `lib/secrets.ts` `safeEqual` | `webhook-secret.ts` | timing-safe string compare | none yet — re-export from `_interfaces` or add helper inside module | **GAP — flag** |
| `lib/html.ts` `escapeHtml` | not directly used by integrations; used by mailer | n/a inside zone | n/a | n/a |
| `lib/fetch.ts` `fetchWithTimeout` | `booking-fareharbor.ts`, `analytics-ga4-gtm.ts` | `(url, init?) → Response` with AbortController 5-6s | none yet — add as `modules/multi-tenant-runtime/lib/fetch.ts` (15-line helper) | **GAP — add inside module** |

**Cross-module contract (CSF-side):** the existing `modules/_interfaces/` is the right place to hoist `BookingProvider`, `EmailProvider`, `CaptchaProvider`, `AnalyticsProvider`, `MapProvider`, `ContentProvider`, `PaymentProvider`, `TenantProviders` so that `modules/fareharbor-booking`, `modules/resend-mailer`, `modules/turnstile`, `modules/stripe-payments` all implement against the same types. **Path A may want to extract `_types.ts` to `modules/_interfaces/providers.ts` rather than burying it inside multi-tenant-runtime.** Flagged for Cruz (§10).

## 5. Target architecture (L4)

```
claude-saas-framework/modules/multi-tenant-runtime/
├── README.md                    (extend the stub: add what this absorbed from alpaca + cite mr-pathA)
├── INSTALL.md                   (extend: add provider wiring + peer-module list)
├── ADR.md                       (existing, unchanged)
├── docs/adr/
│   ├── 010-csp-report-only-with-gtm-unsafe-inline.md   (or stays in alpaca — see §10)
│   ├── 011-in-memory-rate-limit-vs-kv.md               (or stays in alpaca — see §10)
│   ├── 012-content-provider-abstraction.md             (moves; rewrite "alpaca" → "framework")
│   └── 013-payment-provider-defaults-manual-mailto.md  (moves; rewrite "alpaca" → "framework")
├── lib/
│   ├── tenants/
│   │   ├── _types.ts            (CSF stub — UNCHANGED; canonical)
│   │   ├── registry.ts          (CSF stub — UNCHANGED)
│   │   ├── tenant.ts            (CSF stub — UNCHANGED; replaces alpaca lib/tenants/server.ts)
│   │   ├── theme.ts             (moved from alpaca)
│   │   ├── metadata.ts          (moved from alpaca)
│   │   └── validate.ts          (moved from alpaca)
│   ├── integrations/
│   │   ├── _types.ts            (provider bundle interfaces; rewrites @/lib/tenants/_types → ./tenants/_types)
│   │   ├── index.ts             (getProviders factory; tenant-slug switch becomes registry-driven via tenant.contentModule)
│   │   ├── booking-fareharbor.ts, booking-manual-inquiry.ts
│   │   ├── email-resend.ts, email-console-only.ts
│   │   ├── captcha-turnstile.ts, captcha-none.ts
│   │   ├── analytics-ga4-gtm.ts
│   │   ├── map.ts, webhook-secret.ts
│   │   ├── payment.ts + 5 payment adapters
│   ├── content/
│   │   ├── _types.ts            (renamed from content-types.ts)
│   │   ├── content.ts           (ContentProvider interface)
│   │   └── content-static-typescript.ts  (default adapter)
│   ├── env.ts                   (NEW — provides isSet; closes GAP)
│   └── fetch.ts                 (NEW — provides fetchWithTimeout; closes GAP)
├── components/
│   └── tenant-map.tsx
├── samples/
│   ├── alpacasibiza.ts + alpacasibiza-content.ts   (canonical reference tenant)
│   └── example-vineyard.ts + example-content.ts    (proves the non-FareHarbor path)
└── tests/
    ├── registry.test.ts                            (moved)
    ├── payment-providers.test.ts                   (moved)
    ├── content-providers.test.ts                   (moved)
    ├── map-providers.test.ts                       (moved)
    ├── webhook-secret.test.ts                      (moved)
    ├── tenant-validate.test.ts                     (moved)
    ├── tenant-theme.test.ts                        (moved)
    └── tenant-metadata.test.ts                     (moved)
```

**INSTALL.md additions:** drop-in path is `modules/multi-tenant-runtime/` → `lib/tenants/` + `lib/integrations/` + `lib/content/` + `components/tenant-map.tsx` in the consuming project. Peer modules required: `modules/resend-mailer` (provides `lib/mailer.ts`), `modules/turnstile` (provides `lib/turnstile.ts`). Mailer must expose tenant-driven `from`.

## 6. 5-step hot-swap plan with rollback (L5)

**Pre-flight (do BEFORE Step 1):** Cruz approval on §10 STOP items. Take alpaca branch `pre-pathA-2026-05-27`. Run `npm test` in alpaca — must be green at baseline. CSF must be at a known commit.

| Step | Action | Where | Reversibility |
|---|---|---|---|
| **1. COPY** (not move) all files in §3 INSIDE list into CSF target paths. Rewrite imports: `@/lib/tenants/_types` → `../tenants/_types` (relative inside module); `@/lib/validate-env` → `../env`; `@/lib/fetch` → `../fetch`; `@/lib/mailer` → declare as peer dep in INSTALL.md (do not import). Rewrite ADR file paths inside the moved ADRs. Alpaca **unchanged** — still works, still 239/239. | CSF only | Trivial: `git checkout main -- modules/multi-tenant-runtime/` on CSF, or just `rm -rf` the additions. Alpaca untouched. |
| **2. UPDATE** CSF module's `README.md` + `INSTALL.md` to reflect new contents + peer-module wiring + failsafe map. Add `tests/README.md` documenting `node --test` runner. Run CSF tests in isolation (`cd modules/multi-tenant-runtime && node --test tests/`) — must pass standalone. | CSF only | Trivial: revert docs commit. |
| **3. ADD ALIAS** in alpaca `tsconfig.json`: `"@/multi-tenant-runtime/*": ["../claude-saas-framework/modules/multi-tenant-runtime/*"]` (or whatever path convention the other modules use — verify by reading 2-3 of CSF's modules' INSTALL.md; `fareharbor-booking/INSTALL.md` shows `@/lib/...` aliasing). DO NOT yet change any alpaca import. Run `npm test` — must still be 239/239 (no behavior change). | alpaca only (config) | Trivial: `git checkout tsconfig.json`. |
| **4. SWITCH IMPORTS** in alpaca, ONE FILE AT A TIME, from `@/lib/integrations/...` → `@/multi-tenant-runtime/lib/integrations/...` (and same for tenants/content). After EACH file: `npm test`. If green, continue. If red, revert that one file. Helpers (`@/lib/validate-env`, `@/lib/mailer`, `@/lib/turnstile`) STAY in alpaca — the module imports them via the peer-dep contract that bootstrap wires. | alpaca only | Per-file: `git checkout <file>`. Full step: `git revert` the import-switch commit. |
| **5. DELETE** the now-duplicate alpaca files (`lib/integrations/`, the moved subset of `lib/tenants/`, the 4 ADRs if owner agreed in §10, the 7 tests). Run `npm test` — final green confirms the swap. | alpaca only | `git revert` the delete commit OR `git checkout HEAD~1 -- lib/integrations/ lib/tenants/`. |

**Rule 11 invocation:** every claim in this plan that "alpaca still works" is conditional on `npm test` being green after each step. Plan does not assume green; plan REQUIRES green as gate.

## 7. Risk table (per step)

| Step | Blast radius | Reversibility | Highest risk | Detection signal |
|---|---|---|---|---|
| 1 (COPY) | CSF only | Trivial (rm) | None — additive | `node --test` in CSF module fails |
| 2 (docs) | CSF only | Trivial | Stale failsafe map | Cruz review |
| 3 (alias) | alpaca tsconfig | Trivial | Module resolution miss on Vercel | `npm run build` |
| 4 (imports) | alpaca runtime | Per-file revert | **`@/lib/mailer` `from` hardcode bites email-resend adapter at runtime, not test-time** | `node --test` green but prod sends emails from wrong address |
| 5 (delete) | **IRREVERSIBLE inside the commit** but `git revert` works | git-based | Hidden alpaca file still importing from a deleted path; tsc passes but a route 500s | `npm run build` + `npm test` + `curl /api/...` smoke |

**Step 5 is the only irreversible-feeling step**, and only because deletes feel scary. `git revert` is the same single command as any other step.

**Highest blast radius: Step 4**, because it touches alpaca runtime imports in many files. Mitigation: one file at a time, test between each.

## 8. Estimated total effort

| Step | Hours |
|---|---|
| Pre-flight (branch, baseline test, Cruz GO on §10) | 0.5 |
| Step 1 (copy 30 files + rewrite imports) | 1.5 |
| Step 2 (docs + standalone tests) | 0.75 |
| Step 3 (tsconfig alias + verify build) | 0.25 |
| Step 4 (switch 15 alpaca import sites, test between each) | 1.5 |
| Step 5 (delete + final test + smoke) | 0.5 |
| Buffer for the GAP closures (`env.ts`, `fetch.ts`, `secrets` helper) | 0.75 |
| **Total** | **~5.75 h** (vs reconciliation estimate of 3-4 h — the merge with the existing CSF stub adds ~2 h) |

## 9. Single most likely failure mode + early detection

**Failure:** Alpaca `email-resend.ts` adapter delegates to `@/lib/mailer.ts`, which **hardcodes the from address** (commented in the file: "Multi-tenant migration: lift `from` into mailer's options"). After Step 4, the adapter lives in CSF, but the mailer is still in alpaca and still hardcoded — so multi-tenant deployments from any other project that drops in this module will send all email from `noreply@alpacasibiza.com`. Tests do not catch this because they mock the mailer.

**Early detection (before Step 5):**
1. Add a test in `tests/email-resend.test.ts` that asserts the adapter passes a `from` derived from `tenant.noreplyEmail ?? tenant.contactEmail` into the mailer call.
2. That test FAILS today against current `lib/mailer.ts` — surfaces the gap BEFORE alpaca files are deleted.
3. Resolution: lift `from` into mailer options as part of Step 1 (it's a one-line `sendEmail` signature change in alpaca; CSF's `resend-mailer` module already accepts `from`).

## 10. STOP — needs Cruz's GO before any step executes

1. **ADRs 010 + 011** — these document CSP-Report-Only and in-memory rate-limit. Both concern alpaca app/api routes, NOT the multi-tenant-runtime module. Do they move to CSF, stay in alpaca, or duplicate? Default proposed: **stay in alpaca**; only 012+013 move.
2. **Provider interfaces in `modules/_interfaces/` vs inside multi-tenant-runtime** — should `BookingProvider`/`EmailProvider`/etc. go to `modules/_interfaces/providers.ts` (so other CSF modules can implement against them) OR stay inside `multi-tenant-runtime/lib/integrations/_types.ts`? Default proposed: **stay inside multi-tenant-runtime** for Path A; refactor to `_interfaces` is a separate Path-A.1 if Cruz wants the unification CSF's `_interfaces` implies.
3. **`payment-stripe-connect.ts` throw-guard** — currently hardcoded for "DEFER UNTIL TENANT #1 SIGNS." In CSF, this becomes a per-tenant config knob (Cruz's tenant has it; other CSF consumers may not need the guard). Default proposed: **keep the throw-guard as the framework default**; tenants opt IN via `tenant.payment.kind === 'stripe-connect'` AND a separate `STRIPE_CONNECT_ACTIVATED=true` env gate.
4. **Mailer `from` lift** — Step 1 requires editing alpaca's `lib/mailer.ts` to accept `from`. That is technically OUTSIDE the reload zone. Tiny change (one parameter) but it violates the §1 SCOPE CREEP boundary. Default proposed: **accept this one boundary crossing**, since the alternative (duplicate mailer logic inside the module) is worse.
5. **Test runner** — alpaca uses `node:test`. Does CSF's `multi-tenant-runtime` module standardize on `node --test`, vitest, or jest? Stub has no tests yet. Default proposed: **`node --test`** (matches alpaca, zero new deps).
6. **Rename `lib/tenants/server.ts`** — alpaca calls it `server.ts`; CSF stub already has `tenant.ts`. Alpaca callers of `server.ts` need to switch. Default proposed: **adopt CSF's `tenant.ts`**; treat alpaca `server.ts` as a deletion target in Step 5.

**Do NOT execute Step 1 until Cruz confirms items 1-6** (or accepts the proposed defaults).

---

## Catalog 016 verify

Report path: `C:\Users\cruzb\Projects\alpaca-farm-redesign\reports\matrix-reload\mr-pathA-2026-05-27-multi-tenant-runtime-extraction.md`
Existence check at end of run (see post-write Glob).

---

**Composite L1-L5 score (deep mode, equal 20% weights):** L1 72 (clear clusters, no live defects) + L2 82 (boundary clean except mailer `from`) + L3 70 (3 GAPs — env/fetch/secrets helpers missing in CSF, mailer `from` debt) + L4 85 (target shape already half-built in CSF stub) + L5 78 (5 reversible steps, Step 4 highest blast radius) = **77.4 / 100 — Good. Pain well-mapped, zone cleanly isolatable, proceed after Cruz GO on §10.**

Word count (body, excluding YAML + this footer): ~1480.
