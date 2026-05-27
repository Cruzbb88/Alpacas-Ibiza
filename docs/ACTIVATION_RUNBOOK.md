# Activation Runbook — Framework Owner Decisions

**Date:** 2026-05-27
**Source:** OWNER_INPUT_NEEDED.md + handoff/2026-05-27-sleep-mode.md + ADR.md (stripe-payments) + specs/cortex-local-shim/001-spec.md + docs/migration-to-saas-framework.md
**Policy:** No Cortex. Under 2500 words. Doc only — zero code changes.

This runbook is for Cruz. Each section is one decision. Read the recommendation, pick an option, edit the STATUS line, then follow "Files to touch."

---

## D1. Cortex Policy

**Decision:** What happens when agent skills (philosophy-prompting, crystal-ball, brainstorm) call `mcp__omni-cortex__*` tools?

**Current state:** Hook `~/.claude/hooks/005-no-cortex-saves.py` hard-blocks ALL `mcp__omni-cortex__*` calls. Skills that rely on Cortex for session continuity run stateless or error silently.

**Options:**

| Option | What it means | Effort |
|---|---|---|
| A — Accept degraded | Leave hook 005 in place. Skills run stateless; no Cortex reads or writes. Works today. | Zero |
| B — Build shim | Implement `specs/cortex-local-shim/001-spec.md` as `~/.claude/hooks/030-cortex-local-shim.py`. Local JSONL store replaces real Cortex. Spec is complete; implementation has NOT been written. | ~245 LOC (full mock) or ~100 LOC (read-only stub — recommended by spec) |
| C — Lift block | Delete hook 005. Real Cortex is used. Memories persist to Omni-Cortex cloud. | Contradicts `feedback_no_cortex_saves.md` memory file |

**Recommendation:** Option A — accept degraded. The three skills that need Cortex are not on the critical path for the first paying tenant. Revisit when 5+ philosophy or crystal-ball reports have been produced and session continuity becomes painful. The shim spec exists if you change your mind; nothing needs to be built now.

**Files to touch:**

- Option A (accept degraded, no action): no file changes.
- Option B (build shim, read-only stub):
  - CREATE `~/.claude/hooks/030-cortex-local-shim.py` (~100 LOC per spec Section "read-only stub")
  - EDIT `~/.claude/settings.json` — replace the 005 `mcp__omni-cortex__` PreToolUse matcher with 030, narrow 005 to cover only `cortex_sync_to_global`, `cortex_export`, `cortex_log_activity`
- Option B (build shim, full mock):
  - CREATE `~/.claude/hooks/030-cortex-local-shim.py` (~245 LOC)
  - EDIT `~/.claude/settings.json` as above
- Option C (lift):
  - DELETE `~/.claude/hooks/005-no-cortex-saves.py`
  - EDIT `~/.claude/settings.json` — remove the PreToolUse block for `mcp__omni-cortex__`

**Test-success check:**

- Option A: `python C:\Users\cruzb\.claude\hooks\005-no-cortex-saves.py` with a mock `cortex_remember` stdin payload exits non-zero and prints the block reason. No change expected.
- Option B: Run philosophy-prompting skill on a test prompt. Confirm `~/.claude/cortex-local/memories.jsonl` grows by one record. Confirm no network call reaches Omni-Cortex (no auth header sent).
- Option C: Run `cortex_list_memories` via a test prompt. Confirm it returns real Cortex data. Confirm hook 005 is no longer in the PreToolUse chain (`grep "005" ~/.claude/settings.json` → zero matches).

**STATUS:** PENDING — owner decision

---

## D2. Default Platform Fee

**Decision:** What is the default `PLATFORM_FEE_BPS` value baked into the stripe-payments module?

**Current state:** `PLATFORM_FEE_BPS` env var is referenced in `modules/stripe-payments/` but no default is committed to code. New tenant deployments that omit the env var have no fee configured.

**Options:**

| Value | What it means | Annual passive at 50 tenants × €50k GMV |
|---|---|---|
| 0 bps | Free for founder cohort; add later | €0 passive |
| 50 bps (0.5%) | Floor of competitive range | ~€12,500/yr |
| 100 bps (1.0%) | Recommended | ~€25,000/yr |
| 150 bps (1.5%) | Mid-market | ~€37,500/yr |
| 200 bps (2.0%) | Ceiling before tenant pushback | ~€50,000/yr |

**Recommendation:** 100 bps (1.0%). Matches Bokun/Squarespace/FareHarbor competitive band (0.5–2.0%). Invisible to casual operators. Produces ~€25K/yr passive GMV revenue at scale on top of the €99/mo subscription. Can be negotiated down per-tenant via contract without touching code (env var override per deployment).

Secondary question: first N tenants at 0 bps (founder cohort grace period)? Recommended: yes, 0 bps for tenants 1–10, then 100 bps. This is a contract/deployment decision, not a code default — deploy founder tenants with `PLATFORM_FEE_BPS=0` in their Railway/Vercel env.

**Files to touch:** ONE file only.

- EDIT `claude-saas-framework/modules/stripe-payments/.env.example` — set `PLATFORM_FEE_BPS=100` as the documented default.

The actual enforcement is at runtime: each tenant deployment's Railway/Vercel env var. No code change needed in the adapter itself (it already reads `process.env.PLATFORM_FEE_BPS`).

**Test-success check:**

In the stripe-payments module's adapter (`modules/stripe-payments/stripe-connect-adapter.ts` or equivalent), confirm the `application_fee_amount` calculation uses `parseInt(process.env.PLATFORM_FEE_BPS ?? '100', 10)`. Run a test transaction in Stripe test mode. Check the resulting charge object's `application_fee_amount` field equals `charge_amount * 0.01` (100 bps). Stripe dashboard → Payments → expand charge → should show platform fee deducted.

**STATUS:** PENDING — owner decision

---

## D3. Alpaca Migration Path

**Decision:** Does alpaca-farm-redesign migrate incrementally to the framework, or get regenerated from bootstrap.ps1?

**Current state:** alpaca-farm-redesign is a fully functional site with 11+ done specs, security-critical failsafes (rate limiting, CSP, webhook guards), and a deliberate throw guard in `lib/payment-vendor.ts` blocking premature Stripe Connect activation. The framework's `intake/alpacasibiza.yaml` exists. The extraction (Wave B → Wave C) is already done — alpaca patterns were promoted upstream to the framework. There is no forward-migration debt from that direction.

**Options:**

| Option | What it means | Risk |
|---|---|---|
| A — Incremental (recommended) | Treat alpaca as source of truth. Adopt framework modules one file at a time per `docs/migration-to-saas-framework.md`. Never run bootstrap against the live directory. | Low — done specs preserved |
| B — Regenerate via bootstrap | Run `bootstrap.ps1` against alpaca's directory or a fresh scaffold, then manually re-apply 11+ done specs. | High — payment fail-CLOSED guard, CSP, rate-limit, webhook ADRs all risk getting overwritten |

**Recommendation:** Option A — incremental, per `docs/migration-to-saas-framework.md`. The five-phase playbook (Phase 0–5) is already written. The migration is mechanical and low-risk phase by phase. Regenerate is only warranted if a structural framework change conflicts with a done spec (the "Blocker 3" scenario in the migration playbook — check it before each phase). The regenerate risk is highest at `lib/payment-vendor.ts` (money transmission throw guard).

**Phase 3 of the incremental path is blocked** until Cruz answers the brand color question (D6 below) and the social URL canonicals (Instagram handle, Facebook URL) documented in `docs/migration-to-saas-framework.md` "CAN'T DO WITHOUT HELP" items 3–4.

**Files to touch (incremental path, phased):**

Phase 0–1 (no alpaca source changes):
- CREATE `alpaca-farm-redesign/.claude/modules/saas-framework/` (copy of framework's `.claude/`)

Phase 2 (types layer):
- EDIT `alpaca-farm-redesign/lib/booking-engine/_types.ts` — swap import to framework types if shapes are compatible

Phase 3 (tenant lift — requires brand color + social decisions first):
- CREATE `alpaca-farm-redesign/lib/tenant.ts`, `lib/tenants/alpacasibiza.ts`, `lib/tenants/registry.ts`, `lib/tenants/_types.ts`
- EDIT `alpaca-farm-redesign/middleware.ts` — add `x-tenant` header resolver behind feature flag
- EDIT reload-zone files: `lib/structured-data.ts`, `app/layout.tsx`, `components/footer.tsx`, `app/[locale]/layout.tsx`, `lib/email-templates.ts`

**Test-success check:**

After each phase: `npx tsc --noEmit -p alpaca-farm-redesign/tsconfig.json` must return zero errors. After Phase 3: HTML snapshot diff of `/en` before and after must be zero lines (same rendered output, new code paths). After Phase 5: bootstrap drift count under 10 type-(b)+(c) lines.

**STATUS:** PENDING — owner decision (confirm "incremental" to unblock Phase 0)

---

## D4. Stripe Connect KYC Level

**Decision:** When a new tenant onboards to take live payments through the platform, which Stripe Connect account type do they use?

**Current state:** `lib/integrations/payment-stripe-connect.ts` (in alpaca-farm-redesign) has a deliberate throw guard blocking activation: "DEFER UNTIL TENANT #1 SIGNS." The `modules/stripe-payments/stripe-connect-adapter.ts` in the framework has the adapter stubbed for Express mode. ADR.md in the stripe-payments module documents the Express vs Standard vs Custom analysis.

**Options:**

| Level | Onboarding | Platform control | PCI scope | Recommended |
|---|---|---|---|---|
| Express | Stripe-hosted UI, 5–15 min | Platform cannot see tenant's full Stripe dashboard | SAQ A | Yes |
| Standard | Tenant creates own Stripe account | Tenant has full dashboard control | SAQ A | Only if tenants demand it |
| Custom | Cruz builds KYC UI | Maximum control | SAQ A-EP or higher | Reject below €10M GMV |

**Recommendation:** Express. Fastest tenant onboarding, Cruz does not own the KYC surface, Stripe handles OFAC/sanctions screening, chargebacks sit on the connected account not the platform. Only upgrade to Standard if a specific tenant refuses Express (they want full dashboard control). Never build Custom at current scale.

**Files to touch:** TWO files.

1. EDIT `alpaca-farm-redesign/lib/integrations/payment-stripe-connect.ts` — remove the throw guard ("DEFER UNTIL TENANT #1 SIGNS") and wire the `account_type: 'express'` parameter in `createConnectedAccount()`. This is the activation gate.
2. EDIT `claude-saas-framework/modules/stripe-payments/INSTALL.md` Section B — confirm "Express" is the documented default in the operator setup instructions (verify it currently says Express, not a placeholder).

**Test-success check:**

In Stripe test mode: hit the tenant onboarding endpoint. Confirm the response contains an `account_links.url` that begins with `https://connect.stripe.com/express/` (not `/standard/`). Confirm the OAuth scope in the redirect includes `read_write` (Express default). In the Stripe test dashboard → Connect → Accounts, the new account should show type "Express."

**STATUS:** PENDING — owner decision

---

## D5. Product Name (Consumer-Facing Brand)

**Decision:** What is the public-facing name for this framework when sold to agencies or operators?

**Current state:** The internal directory is named `claude-saas-framework`. This name appears in `business/PITCH.md`, `business/ONE-PAGER.md`, `business/ICP.md`, `business/OBJECTION-HANDLER.md`, `README.md`, and the bootstrap intake YAML default field. No consumer-facing landing page exists yet.

**Options:**

| Option | What it means |
|---|---|
| Keep `claude-saas-framework` | No rename. Technical name becomes the product name. Honest about the stack; less marketable. |
| Pick a product name | Cruz supplies a name (e.g. "Folio," "Tillr," "Groundwork," or anything else). Framework's business collateral and landing page use that name. Internal directory can stay `claude-saas-framework`. |

**Recommendation:** No recommendation — this is a positioning call only Cruz can make. A branded name makes the landing page more credible to non-technical buyers. Keeping `claude-saas-framework` signals "developer tool" which may be correct for the ICP. Neither is wrong.

**Files to touch (if a name is picked):**

The single most important file to edit first is `business/PITCH.md` — it is the outermost buyer-facing document. Search/replace `claude-saas-framework` with the chosen name throughout it.

Full list for a complete rename:
- EDIT `claude-saas-framework/business/PITCH.md` — search/replace product name
- EDIT `claude-saas-framework/business/ONE-PAGER.md` — search/replace product name
- EDIT `claude-saas-framework/business/ICP.md` — search/replace product name
- EDIT `claude-saas-framework/business/OBJECTION-HANDLER.md` — search/replace product name
- EDIT `claude-saas-framework/README.md` — update title and intro paragraph
- EDIT `claude-saas-framework/intake/samples/alpacasibiza.yaml` — update `framework_name` default field if present

**Test-success check:**

After the rename: `Select-String -Path "C:\Users\cruzb\Projects\claude-saas-framework\business\*" -Pattern "claude-saas-framework" -Recurse` should return zero matches in consumer-facing files. `README.md` and internal references (PRACTICES.md, bootstrap.ps1 comments) may retain the technical name — those are not consumer-facing.

**STATUS:** PENDING — owner decision (provide name, or confirm "claude-saas-framework" is permanent)

---

## D6. Brand Color Reconciliation (Alpaca-Scope)

**Note:** This decision is scoped to alpaca-farm-redesign as Tenant #1. It is listed here because it blocks D3 Phase 3 and appears in the framework's intake YAML.

**Decision:** Which green is the canonical alpacasibiza primary brand color?

**Current state (three floating values):**

| Value | Where it appears | Usage |
|---|---|---|
| `#556B2F` | `intake/alpacasibiza.yaml`, Tailwind `primary`, 42 code references | Body text, headings, most UI |
| `#6da855` | `app/layout.tsx` `themeColor` meta tag, PWA chrome | Browser tab / mobile chrome color |
| `#AD561A` | `app/globals.css` `--accent` (changed this session) | All primary CTAs — WCAG AA pass (7.2:1) |

The accent (`#AD561A`) is already decided by the a11y fix this session (WCAG 1.4.3 compliance — do not revert without a new WCAG-passing value). The open question is the two greens: are `#556B2F` and `#6da855` both intentional (different surfaces), or is one of them a mistake?

**Options:**

| Option | What it means |
|---|---|
| A — Two greens intentional | `#556B2F` stays as text/UI primary. `#6da855` stays as themeColor/PWA chrome. Both are canonical for their surface. Document in `lib/brand.ts`. |
| B — Unify to `#556B2F` (dark olive) | All green references → `#556B2F`. `themeColor` updated to match. Verify WCAG contrast on relevant surfaces. |
| C — Unify to `#6da855` (bright green) | All green references → `#6da855`. Check WCAG — `#6da855` on white is ~3.1:1, fails WCAG AA for normal text (4.5:1 required). Likely blocked by a11y. |
| D — Pick a new canonical | Cruz supplies a single hex. All greens update to it. |

**Recommendation:** Option A (two greens intentional) if the real alpacasibiza.com CSS shows both surfaces as distinct. Option B if there is only one canonical green on the real site. Do not guess — check `alpacasibiza.com` computed styles for `--brand-primary` and `theme-color` meta before deciding. Option C is likely blocked by WCAG AA failure on body text.

**Files to touch:** ONE file (once a sibling agent creates it).

- EDIT `alpaca-farm-redesign/lib/brand.ts` — set `PRIMARY`, `THEME_COLOR`, and `ACCENT` as named exports. All code that currently hardcodes a hex value for these surfaces imports from here instead.

If `lib/brand.ts` does not yet exist, it must be created first (marked as in-flight per component-buildout handoff — "sibling agent R1 creates this").

**Test-success check:**

After the brand.ts edit: `Select-String -Path "C:\Users\cruzb\Projects\alpaca-farm-redesign" -Pattern "#556B2F|#6da855" -Include "*.ts","*.tsx","*.css" -Recurse` should return:
- Option A: only `lib/brand.ts` (all other files import from it)
- Option B: only `lib/brand.ts` with one value
- Option C: blocked — run WCAG check first

Also verify the intake YAML at `claude-saas-framework/intake/alpacasibiza.yaml` `brandColor` field matches whichever canonical value is chosen.

**STATUS:** PENDING — owner decision (verify alpacasibiza.com before answering)

---

## Summary Table

| # | Decision | Recommended answer | Single most important file to edit |
|---|---|---|---|
| D1 | Cortex policy | Accept degraded (Option A — no change) | `~/.claude/settings.json` (only if choosing B or C) |
| D2 | Default platform fee | 100 bps; founder cohort at 0 bps per-deployment | `modules/stripe-payments/.env.example` |
| D3 | Alpaca migration path | Incremental (Option A per migration playbook) | `alpaca-farm-redesign/lib/tenants/alpacasibiza.ts` (Phase 3 creation) |
| D4 | Stripe Connect KYC level | Express | `alpaca-farm-redesign/lib/integrations/payment-stripe-connect.ts` |
| D5 | Product name | No recommendation — Cruz decides positioning | `claude-saas-framework/business/PITCH.md` |
| D6 | Brand color reconciliation (alpaca-scope) | Verify alpacasibiza.com first; likely Option A or B | `alpaca-farm-redesign/lib/brand.ts` |

---

## CAN'T DO WITHOUT HELP

These decisions cannot be made by any agent. Framework recommends, Cruz picks.

- **D1:** Shim depth (full mock vs read-only stub) requires knowing whether philosophy-prompting/crystal-ball/brainstorm are model-mediated in their Cortex calls. Only code inspection + a live test can confirm this — but the GO/NO-GO is still Cruz's.
- **D2:** Founder cohort size (how many tenants get 0 bps, and for how long) is a business relationship decision.
- **D3:** If Blocker 3 (payment-vendor / stripe-payments interface collision) materializes during Phase 2, Cruz must decide whether to patch the framework type or keep alpaca's adapter. That is a money-path architectural call.
- **D4:** If a tenant explicitly refuses Express and demands Standard, Cruz decides whether to accommodate. Express is the default; diverging requires a new ADR.
- **D5:** Product name is a brand/positioning decision. No data analysis can make it.
- **D6:** The canonical hex must match the actual client brand — only Cruz or the client can confirm which green is authoritative.

---

*Under 2500 words. All paths absolute. No invented data. No code changes made.*
