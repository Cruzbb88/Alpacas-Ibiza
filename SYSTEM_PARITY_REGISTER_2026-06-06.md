# SYSTEM PARITY REGISTER — alpaca-farm-redesign

**Date:** 2026-06-06
**Type:** DELTA / UPDATE over priors — NOT a from-scratch audit
**Priors superseded/extended:** `reports/unified-field-theory/001-2026-05-26-cross-system.md` (UFT, clusters C1–C15) · `reports/crystal-ball/cb-004-2026-05-31-alpaca-coherence-audit.md` (cb-004) · `reports/crystal-ball/cb-003-2026-05-29-coherence-audit.md` (cb-003)
**Scope:** 12 system classes, per-class sibling comparison, drift verdicts. Read against the priors — this register records only what CHANGED, what is STILL open, and what is NEW since 2026-05-27.

---

## 1. What changed since the priors

Of the UFT's 15 clusters, the validation/auth clusters that drove the original audit are now **UNIFIED**: C1 (email-regex) is resolved — `lib/validate-email.ts:isValidEmail` has 20+ wired server callers; C12 (the `tr`/`translate` translation split) is fully resolved because `lib/translations.ts` was deleted outright and the UI runs on next-intl alone (199 call sites / 91 files). What is **STILL OPEN and falsely-claimed-resolved**: UFT C2 (webhook-secret helper) — CLAUDE.md failsafe row 46 says `requireOptionalWebhookSecret` replaced the inline blocks, but `reminder` and `review-request` still carry byte-identical inline copies and the helper has zero callers; and cb-004's #1 referral fork (`createReferralCoupon` vs `generateReferralCode`) is **unchanged and unresolved**, with a newly-discovered THIRD incompatibility (UI guards reject the HMAC codes). What is genuinely **NEW since 2026-05-27**: the entire **PaymentAdapter-vs-PaymentProvider dual dispatch fork** (payment adapters didn't exist at UFT scan time), the **captcha reCAPTCHA duplication**, the **HMAC capability-token triplication**, the **owner-notify Slack-format-sent-to-Discord bug** (which cb-004 incorrectly marked correct), the **email-oracle structural divergences** in `recover-certificate`, and the growth of in-memory `globalThis` singletons from 2 (UFT C10) to 9. Net: the codebase's validation/i18n debt closed, but its **payment, captcha, token, and notify layers forked** as new vendor/SaaS-adapter code landed.

---

## 2. Master Parity Register

Sorted worst-first: `forked-incompatible` > `dead-duplicate` > `drifting` > `parallel-by-design` > `unified`.

| System class | Sibling implementations (count) | Shared abstraction? | Drift status | Prior-report status | Verdict |
|---|---|---|---|---|---|
| Payment provider adapters | 5 adapters + 2 rival dispatchers (`getPaymentAdapter` vs `getProviders`) | Partial — `PaymentProvider` iface exists but a 2nd `PaymentAdapter` system runs parallel | **forked-incompatible** | NEW — not in UFT; cb-004 noted revisions but never named the split. UNCHANGED (live) | **reconcile-fork** |
| Referral systems | 2 (`createReferralCoupon` vs `generateReferralCode`) | NONE — forked | **forked-incompatible** | cb-004 HIGH #1, cb-003 first detected. UNCHANGED / unresolved | **reconcile-fork** |
| Owner-notify channel fan-out | 4 senders (Slack/Telegram/Discord/Generic) | NONE — `sendDiscord` is a Slack clone | **forked-incompatible** | cb-004 marked Discord "correct" (WRONG). WORSE than reported | **reconcile-fork** |
| Translation systems (old vs next-intl) | next-intl + 2 email `switch(locale)` helpers | NONE — forked, but old module deleted | **dead-duplicate** | UFT C12 RESOLVED (module deleted). Superseded | **delete-dead** |
| Captcha provider adapters | 7 (incl. 2 parallel reCAPTCHA impls) | `CaptchaProvider` iface; reCAPTCHA logic duplicated | **drifting** | NEW — UFT silent, cb-004 zero captcha mentions | **add-contract-test** |
| Webhook-secret guards | 5 (factory + helper + 3 inline) | helper + factory exist; both unwired | **drifting** | UFT C2 claimed resolved in CLAUDE.md — FALSE. UNCHANGED | **reconcile-fork** |
| In-memory globalThis stores | 9 singletons across 8 files | NONE — hand-rolled idiom ×6 lib files | **drifting** | UFT C10 = DON'T unify (leave). Verdict holds; count 2→9 | **leave-parallel** |
| HMAC capability-token systems | 4 (3 bearer-token + 1 derivation) | NONE — sign/verify/base64url copy-pasted ×3 | **drifting** | NEW — UFT didn't flag; cb-004 only referral subset | **add-contract-test** |
| Anti-enumeration email-oracle routes | 4 (1 misclassified) | NONE — `{ok:true}` intent, no shared helper | **drifting** | UFT C1/C2/C3 resolved; oracle-closure pattern itself never audited | **add-contract-test** |
| Payment-handler pure functions | 4 handlers + duplicated owner-notify HTML | Partial — emails/tracker/events shared; HTML not | **drifting** | UFT didn't cluster; cb-004 gift-misroute UNCHANGED | **add-contract-test** |
| Validation + input guards | `isValidEmail` + 3 Mollie-ID regex copies + 1 UI regex | `isValidEmail` shared; Mollie-ID regex not | **drifting** | UFT C1 RESOLVED; Mollie-ID regex never flagged | **add-contract-test** |
| Email template builders + mailer | 2 layouts + 2 inline envelopes | `escapeHtml` shared; `emailLayout` vs `retentionEmailLayout` dup (by design) | **parallel-by-design** | UFT FD-1 (contact/commission) UNCHANGED; layout dup postdates priors | **add-contract-test** |

---

## 3. The forks & dead duplicates — deep dive

### 3.1 Referral systems — **forked-incompatible** (LEAD; cb-004 HIGH #1, STILL OPEN)

**Current verified status: UNCHANGED / unresolved.** cb-004 (`reports/crystal-ball/cb-004-2026-05-31-alpaca-coherence-audit.md:64-67`) flagged this as its #1 HIGH finding; cb-003 (`cb-003-2026-05-29:47`) first detected `createReferralCoupon` uncalled and handed it to a parallel AI — **that handoff did not wire it**, and `FORWARD_PLAN.md:371` records the gap as OWNER/DEFER scope v2.

**Siblings & why they diverge (format fork):**
- `lib/payment-handlers-referral.ts:62-74` — `REFERRAL_CODE_PREFIX='ALPACA-'`, `REFERRAL_SUFFIX_LEN=6`, `crypto.randomUUID()`, emits `ALPACA-XXXXXX`.
- `lib/referral-codes.ts:39-42` — `BASE32_ALPHABET`, `REFERRAL_CODE_FORMAT=/^[A-Z0-9]{6}$/`, emits a 6-char HMAC code.

**`createReferralCoupon` is dead:** grep across the project returns ZERO call sites outside its definition (`lib/payment-handlers-referral.ts:83`) and docs (`handoff/OSS_UPGRADE_OPPORTUNITIES.md:45,110`; cb-003:47; cb-004:65,99; `FORWARD_PLAN.md:371`).

**`generateReferralCode`/`verifyReferralCode` is the wired path:** `app/api/checkout/route.ts:10,108,136`; `app/api/checkout/intent/route.ts:11,115`; `app/api/mollie-checkout/route.ts:11,99,112`; `app/api/mollie-checkout/intent/route.ts:137-138`; `app/[locale]/my-adoption/page.tsx:14,103`.

**NEW third incompatibility (not in cb-004):** four UI components validate `referralCode` against `/^ALPACA-[A-Z0-9]{6}$/` — `components/share-buttons.tsx:14`, `components/donor-portal/share-cta.tsx:37`, `components/adopt/referral-applied-banner.tsx:7`, `app/[locale]/share-adoption/page.tsx:30`. The 6-char HMAC code from `generateReferralCode` fails this `ALPACA-`-prefixed guard, so `my-adoption/page.tsx:118-119` sets `?ref=ABCDEF` but all four components strip it. **Attribution is broken end-to-end in the UI layer**, not only discount minting.

**Reconcile action:** removing `createReferralCoupon` cannot break anything (zero callers); align the UI guard regex to the HMAC format `/^[A-Z0-9]{6}$/` to stop silently stripping live codes.
**Risk×Reward:** risk **3/10** (dead path), reward **7/10** (clears a third active incompatibility + restores UI attribution).

### 3.2 Payment provider adapters — **forked-incompatible** (NEW this pass)

Two independent dispatch systems route the same business action through incompatible contracts:
- **Old:** `lib/payment-vendor.ts:249` `getPaymentAdapter()` → `interface PaymentAdapter { buildAdoptCheckoutUrl() }`.
- **New:** `lib/integrations/index.ts:119` `getProviders()` → `PaymentProvider { createCheckoutSession() }`.

**Active callers of the OLD system:** `app/[locale]/adopt/page.tsx:125`, `app/[locale]/gifts/page.tsx:55`.
**Active caller bypassing BOTH:** `app/api/mollie-checkout/route.ts:158` calls `molliePaymentProvider()` directly.
**Split risk:** Mollie checkout can be activated via `getProviders()` without the adopt page (still on the old dispatcher) knowing.

**Fork 2 — `isAdoptTier` duplicated:** canonical `lib/payment-vendor.ts:43` `isAdoptTier(value: unknown)` (used by 4 checkout routes) vs a private re-definition `lib/integrations/payment-mollie.ts:69` `isAdoptTier(value: string|undefined)` instead of importing the canonical.

**Contract violation (intentional/load-bearing):** `lib/integrations/payment.ts:144` states `createCheckoutSession` "never throws on missing config", but `lib/integrations/payment-stripe-connect.ts:27` throws unconditionally. This is the CLAUDE.md failsafe-map row "stripeConnectPaymentProvider throws on activation" — documented, but it violates the written interface; the other 4 adapters honor fail-quiet.

**Failsafe parity (all 5 agree, fail-CLOSED):** stripe-direct `verifyWebhook:91`, mollie `:305`, stripe-connect `:36` (`{ok:false}`), manual-mailto `:29` (`{ok:false}`), fareharbor-passthrough `:34` (`{ok:false}`).
**Risk×Reward:** risk **6/10**, reward **8/10** — two live callers on the old contract while a third bypasses both.

### 3.3 Owner-notify channel fan-out — **forked-incompatible** (cb-004 mis-marked correct)

`lib/owner-notify.ts` has 4 senders: `sendSlack:69-122`, `sendTelegram:126-159`, `sendDiscord:165-216`, `sendGenericWebhook:220-237`. `sendDiscord` is a near-verbatim copy of `sendSlack`.

**The live bug:** `sendDiscord` sends Slack Block Kit `{text, blocks:[...]}` (`lib/owner-notify.ts:172-201`) to a Discord webhook, which expects `{content, embeds:[...]}`. Discord silently drops `blocks[]` and has no `text` field — notifications arrive empty or fail silently. The file's own comment at `:162-163` documents the correct `{content,embeds}` shape, contradicting the implementation. `sendSlack:77-106` and `sendDiscord:172-201` are structurally identical (only difference: `severityLabel` var at Slack `:90` vs inline `input.severity` at Discord `:185`).

**cb-004 error:** `cb-004:70` marked Discord "Auth/shape correct" — incorrect; status is WORSE than reported.
**Callers:** `lib/payment-handlers.ts:23` imports `notifyOwnerOnEscalation`; live callers `lib/payment-handlers.ts:557` and `:1316` (both fire-and-forget `void`). `OWNER_NOTIFY_DISCORD_URL` (`:259`) is optional and listed unset at `docs/LAUNCH_BLOCKERS.md:36-37`.
**Reconcile action:** rename `text`→`content`, replace `blocks[]` with `embeds:[{description,fields}]` (mechanical).
**Risk×Reward:** risk **3/10**, reward **7/10**.

### 3.4 Translation systems — **dead-duplicate** → delete-dead (UFT C12 RESOLVED)

`lib/translations.ts` is confirmed absent (Glob `lib/translations*` returns nothing); zero `from '@/lib/translations'` imports. next-intl is the sole pipeline (`next-intl.config.ts:1-150`; 199 call sites / 91 files). The only residue is server-side email subject `switch(locale)` blocks: `lib/email-templates.ts:105-119` (reminder, 3 locales), `:113-119` (review-request, 3 locales), `lib/email-templates-retention.ts:129-149` (renewal, 6 locales). No active divergence bug.
**Risk×Reward:** risk **1/10**, reward **2/10** — nothing to reconcile; C12 superseded by completed migration.

### 3.5 Webhook-secret guards — **drifting** (UFT C2 falsely marked resolved)

`lib/route-helpers.ts:17` `requireOptionalWebhookSecret` (fail-OPEN) is defined but **never imported by `reminder` or `review-request`**. Both still carry byte-identical inline blocks: `app/api/reminder/route.ts:39-45` and `app/api/review-request/route.ts:34-40`. `app/api/fareharbor-webhook/route.ts:70-82` keeps its own inline **fail-CLOSED** guard (UFT C3, explicitly deferred). The factory `lib/integrations/webhook-secret.ts:57-92` `makeWebhookSecretProvider` has zero callers (only self-referencing JSDoc at `:16`). Correct-pattern routes (different helper): `stripe-webhook/route.ts:46-47` and `mollie-webhook/route.ts:45-46` use `requireEnvOrReturn503`. **CLAUDE.md failsafe row 46 claims `requireOptionalWebhookSecret` replaced the inline blocks — contradicted by current file content.**
**Risk×Reward:** risk **4/10**, reward **6/10** — closes a real drift class and corrects a false "resolved" claim.

### 3.6 Captcha provider adapters — **drifting** (NEW)

Two parallel reCAPTCHA v3 impls with no shared helper: `lib/turnstile.ts:65` `RECAPTCHA_VERIFY_URL` vs `lib/integrations/captcha-recaptcha.ts:19` `VERIFY_URL` (identical); `lib/turnstile.ts:91` `minScore` parse mirrors `captcha-recaptcha.ts:52`; error path `lib/turnstile.ts:101-103` mirrors `captcha-recaptcha.ts:63-65`. Currently byte-identical → no active bug; risk is future silent divergence. The turnstile adapter delegates cleanly (`captcha-turnstile.ts:20` → `verifyTurnstile()`), and the integration-layer reCAPTCHA adapter is **unreachable** — all 6 routes import `verifyTurnstile` from `lib/turnstile.ts` directly (`contact:3`, `commission:3`, `billing-portal:6`, `mollie-manage:6`, `newsletter:17`, `gdpr-request:3`); execution flows `verifyTurnstile → verifyHumanToken → verifyViaRecaptcha` (`lib/turnstile.ts:133`), bypassing `recaptchaCaptchaProvider`.
**Risk×Reward:** risk **2/10**, reward **4/10** — contract test (~20 lines) asserting identical outputs.

### 3.7 HMAC capability-token systems — **drifting** (NEW)

Three bearer-token files copy-paste `getSigningKey()` (`NEWSLETTER_SIGNING_KEY`→`NEXTAUTH_SECRET` fallback), `toBase64Url`/`fromBase64Url`, and the HMAC-SHA256 loop: `newsletter-token.ts:22-29/31-43`, `mollie-manage-token.ts:22-28/30-42`, `email-preferences-token.ts:36-41/44-56` (`referral-codes.ts:52-58` shares only key text, used for derivation). **Guard drift:** `newsletter-token.ts:65/68` and `mollie-manage-token.ts:116/122` use named `MAX_TOKEN_BYTES` + `!token` falsy check; `email-preferences-token.ts:87/126` inlines literal `2048` twice and omits the `!token` guard. Scope guard present in all three (`:91`/`:135`/`:107`). Drift is cosmetic today, not exploitable. All three wired to live callers (newsletter routes; mollie-manage routes + `lib/donor-portal-data.ts:288/365/368`; email-preferences route). Named siblings `recover-certificate` and `share-adoption` do NOT use HMAC (plain params / public page).
**Risk×Reward:** risk **3/10**, reward **4/10** — contract test on guard behavior.

### 3.8 Anti-enumeration email-oracle routes — **drifting**

Three real oracle routes reimplement the `{ok:true}` 200 closure independently; `newsletter` is **misclassified** (double-opt-in signup, returns 400/429/500). `billing-portal:45` and `mollie-manage:44` share `const GENERIC_OK = () => NextResponse.json({ ok:true }, {status:200})` (factory) + `attachRequestId`. **`recover-certificate` diverges three ways:** (1) `:41` `const ALWAYS_OK = NextResponse.json({ ok:true })` — singleton constant reused by reference; (2) **no Turnstile** — imports only `isValidEmail, rateLimit, getClientIp, detectHoneypot, sendEmail, SITE_BASE_URL, buildCertificateRecoveryEmail, importStripe, getMollieClient` (`:29-37`), exposing the Stripe+Mollie customer scan to unauthenticated bots; (3) **no per-email rate-limit** — only IP rate-limit (`:158`, 3/15min), whereas `billing-portal:86` and `mollie-manage:88` add `rateLimitByEmail({limit:2, windowMs:1h})`. CLAUDE.md failsafe claims `recover-certificate` "mirrors billing-portal email-oracle closure pattern" — code does not deliver parity.
**Risk×Reward:** risk **4/10**, reward **6/10**.

### 3.9 Payment-handler pure functions — **drifting**

Shared: welcome email / `recordFailure`/`resetFailures` / `notifyOwnerOnEscalation` / `emit`. NOT shared: owner-notification HTML — `buildOwnerAdoptionNotificationHtml` (Stripe, `:374-423`) vs `sendMollieOwnerNotifyQuiet` (Mollie, `:1104-1168`), parallel tables differing only by vendor label/amount. **Discount-codes asymmetry:** Stripe fires `buildAdoptDiscountCodesEmail` (`:297-304`, `codesScheduled` at `:102`); Mollie has no `codesScheduled` (`:815-826`), copy at `:1160` says "discount-codes follow within 48h" (manual). **Gift-misroute (cb-004 UNCHANGED):** both `isGiftPurchase` (Stripe `:218`) and `isGiftWelcome` (Mollie `:1062`) gate on `giftRecipientEmail !== null && giftMessage !== null`, so a name+email-only gift routes welcome to buyer. All 7 handlers wired (`stripe-webhook:116,186,203,234`; `mollie-webhook:107,238`; `mollie-manage/cancel:158`).
**Risk×Reward:** risk **4/10**, reward **7/10**.

### 3.10 Validation + input guards — **drifting** (UFT C1 resolved; Mollie-ID regex new)

`isValidEmail` (`lib/validate-email.ts:6-9`) now has 20+ callers (C1 RESOLVED). One residual UI-only inline regex `components/gifts/gift-flow.tsx:108` (server path covered by `lib/gift-fields.ts:67`). **NEW: Mollie payment-ID regex drift** — canonical `lib/integrations/payment-mollie.ts:326` `/^(tr|sub)_[A-Za-z0-9]+$/`; `app/api/mollie-checkout/confirm/route.ts:74` matches it; but `app/api/donor-receipt/[sessionId]/route.ts:17` `MOLLIE_PAYMENT_RE = /^tr_[A-Za-z0-9]+$/` drops `sub_`, so a subscription ID silently fails `classifyId` (returns null, not `mollie`).
**Risk×Reward:** risk **4/10**, reward **6/10** — add `sub_` branch + contract test.

### 3.11 In-memory globalThis stores — **drifting** but LEAVE (UFT C10 verdict holds)

9 singletons across 8 files, all hand-rolling `g.__key ?? new T()`; no shared get/set/delete contract (value types: `Map<string,number[]>`, `Map<string,CounterEntry>`, `Map<number,Map<string,Agg>>`, `BookingScheduleStore` class, `MailerAuditEntry[]`). **Only actionable delta over C10:** `lib/mailer.ts:43-44` uses unconditional `if (!globalForAudit.__mailerAuditBuffer)` (pins in production too), while every other store uses `if (process.env.NODE_ENV !== 'production')` (`rate-limit:35`, `webhook-idempotency:26`, `booking-schedule-store:57`, `payment-failure-tracker:44`, `vat-tracker:70`). The comment at `mailer.ts:38` calls it "the same pattern" — it is not (new drift, post-dates both reports). On Vercel serverless the behavioral difference is nil. `cancel-feedback` (`route.ts:60-64`) has NO globalThis store (log-only) — it was mistakenly listed in the brief.
**Risk×Reward:** risk **3/10**, reward **2/10** — **leave-parallel** (count grew 2→9 but C10 still correct).

---

## 4. Healthy parallels — LEAVE ALONE (anti-churn)

- **Email template builders + mailer — `parallel-by-design`.** `lib/email-templates-retention.ts:8-10` carries an explicit comment that the duplicated BRAND/`SITE_BASE_URL_INLINE`/`retentionEmailLayout` are intentionally NOT imported "to avoid coupling." `emailLayout` (`email-templates.ts:21-29`) and `retentionEmailLayout` (`:27-35`) produce identical HTML today; `escapeHtml` (`lib/html.ts:12`) is the single shared escaper; `lib/mailer.ts` is the single `sendEmail` surface with no duplication. **Do NOT merge the two layouts** — they evolve in separate template domains. (Only the UFT FD-1 contact/commission inline envelopes at `contact/route.ts:81` + `commission/route.ts:63` remain — cosmetic, not a correctness bug. A contract test asserting layout-output equality is the cheapest guard.)
- **In-memory globalThis stores — leave parallel** (see 3.11). UFT C10's "DON'T unify" verdict is re-confirmed; no `createGlobalStore` factory is warranted. Do not refactor these into a shared base.
- **Failsafe parity across the 5 payment adapters** is correct and should not be touched: all 5 `verifyWebhook` implementations agree on fail-CLOSED. The stripe-connect "throws on activation" is intentional/documented (CLAUDE.md failsafe map) even though it violates the written interface text — that is a contract-text fix, not a behavior fix.
- **Captcha turnstile + none adapters** delegate/trivially mirror canonical logic (`captcha-turnstile.ts:20`, `captcha-none.ts:14`) — leave; only the reCAPTCHA copy drifts.

---

## 5. Bottom line — reconcile order by risk×reward

| # | System class | Risk×Reward | Verdict | Known vs NEW |
|---|---|---|---|---|
| 1 | **Payment provider adapters** (dual dispatch fork) | 6 × 8 | reconcile-fork | **NEW** this pass (UFT pre-dates adapters; cb-004 noted revisions, never named split) |
| 2 | **Referral systems** | 3 × 7 | reconcile-fork | **KNOWN** — cb-004 HIGH #1, cb-003 first detected; UNCHANGED + new 3rd incompatibility |
| 3 | **Owner-notify Discord bug** | 3 × 7 | reconcile-fork | **KNOWN but mis-marked** — cb-004:70 called it correct; actually broken (WORSE) |
| 4 | **Payment-handler pure functions** (gift-misroute + Mollie discount asymmetry) | 4 × 7 | add-contract-test | **KNOWN** — gift-misroute cb-004 L2#2/Gap#4, UNCHANGED |
| 5 | **Webhook-secret guards** | 4 × 6 | reconcile-fork | **KNOWN but falsely-resolved** — UFT C2; CLAUDE.md row 46 claims fixed, code says no |
| 6 | **Email-oracle routes** (recover-certificate: no Turnstile, no per-email RL) | 4 × 6 | add-contract-test | **NEW** at implementation level (C1/C2/C3 resolved; closure pattern never audited) |
| 7 | **Validation guards** (donor-receipt Mollie-ID drops `sub_`) | 4 × 6 | add-contract-test | **NEW** — Mollie-ID regex never flagged (UFT C1 email-only, resolved) |
| 8 | **Captcha reCAPTCHA duplication** | 2 × 4 | add-contract-test | **NEW** — UFT silent, cb-004 zero captcha mentions |
| 9 | **HMAC capability-token systems** | 3 × 4 | add-contract-test | **NEW** — never flagged |
| 10 | **Email template layouts** | 3 × 4 | add-contract-test | partial-KNOWN — FD-1 contact/commission UNCHANGED; layout dup is new, by-design |
| 11 | **Translation email switches** | 1 × 2 | delete-dead | **KNOWN/RESOLVED** — UFT C12 (module deleted), superseded |
| 12 | **globalThis stores** | 3 × 2 | leave-parallel | **KNOWN** — UFT C10 "don't unify" holds; count 2→9 |

**Reconcile first (highest risk×reward, live incompatibility):** (1) the **payment dual-dispatch fork** — two live callers on the old `getPaymentAdapter` contract while `mollie-checkout` bypasses both [NEW]; (2) the **referral fork** — clearing dead `createReferralCoupon` is zero-risk and aligning the UI guard restores end-to-end attribution [KNOWN, cb-004 #1]; (3) the **owner-notify Discord bug** — mechanical Slack→Discord JSON fix [KNOWN, cb-004 mis-marked]. **Correct two false "resolved" records** while reconciling: CLAUDE.md row 46 (webhook-secret) and cb-004:70 (Discord). **Leave alone:** email-template layouts, globalThis stores, the 5-adapter fail-CLOSED parity, and the deleted translation module.
