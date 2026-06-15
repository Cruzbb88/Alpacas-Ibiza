---
report_type: "crystal-ball-premortem"
report_number: 8
date: "2026-06-15"
project: "alpaca-farm-redesign"
subject: "In-house booking engine money-path PRE-MORTEM (launch failure)"
scope: "newly-built in-house tour booking engine (reserve→pay→confirm→email) weighted; open SEO/a11y/perf blockers secondary"
failure_modes_identified: 5
highest_probability_failure: "Vendor/webhook config mismatch → paid-but-not-honored orphan (no auto-refund fires)"
highest_probability_pct: 60
critical_gaps: 4
decision_debt_items: 5
trend: "second_premortem (prior premortem cb-006 of the UNBUILT design scored 72/100 BUILD-gated; this is the post-build money-path pre-mortem)"
weighting: "booking-engine money-path (newest+riskiest) heavily weighted; open launch blockers lower weight"
note_numbering: "Requested filename cb-007 collides with an existing cb-007 coherence-audit + cb-006 premortem already on disk for 2026-06-15. Filed under the requested name per task; the next strictly-free sequence number is cb-008. report_number kept at 7 per task spec."
---

# Crystal Ball — Pre-Mortem #007 — In-house booking engine money-path

**Method (cb-007):** Assume alpacasibiza.com's redesign **failed at launch**. Walk back from the
smoking crater to the top 5 most likely causes, weighted toward the **newly-built in-house booking
engine** (newest code, money path, highest blast radius). Every claim is checked against source
`file:line`; where a guard already exists it is **credited** and the risk is lowered accordingly.

**Risk score:** `Failure Risk = Frequency × Severity(1–10) × (1/DetectionEase)` where DetectionEase
1 = easy-catch in CI/review, 10 = silent-until-prod. Frequency expressed as a 0–1 likelihood over the
first ~90 days of live bookings.

**Historical basis (Cortex hook-blocked — project retrospective docs used as the proxy, per task):**
- cb-006 premortem `reports/crystal-ball/cb-006-2026-06-15-inhouse-booking-premortem.md` — the 7 money/concurrency invariants F1–F7.
- cb-007 coherence audit `reports/crystal-ball/cb-007-2026-06-15-inhouse-booking-coherence-audit.md` — flagged **FM1 vendor/webhook config orphan as "the one true go-live gate"** (operational, no in-code net).
- cb-006 coherence audit `reports/crystal-ball/cb-006-2026-06-13-alpaca-coherence-audit.md` #1 — locale thin-content gate half-applied.
- spec-011 `specs/todo/011-inhouse-booking-engine.md` §I — deferred hardening list (line 93: hold-spam DoS).
- `WHY-MY-AUDITS-MISS.md` / CLAUDE.md failsafe map — the project's own "what static checks miss" ledger (runtime-not-tsc, config-trap, owner-data-vs-code).
- Catalog 020 (`tsc-green ≠ works`) + 022 (`audit ownership before applying`) from MEMORY.md.

---

## Verdict up front

The **code** of the money path is, by this codebase's standards, **unusually well-defended** — the
cb-006 F1–F7 invariants are implemented and most are unit-tested. **handle-booking-paid IS
idempotent** at two independent layers (see F-scores below). The launch will **not** be killed by an
oversell bug or a double-confirm in the happy path.

What kills the launch is **everything around the verified-correct core**: a webhook the owner never
registered (orphan paid bookings with no auto-refund), an **untested DB-transaction layer** whose
correctness is asserted only on the *pure* state machine, the **deferred hold-DoS** that lets a
2-IP bot pad-lock small slots, and the **open SEO blocker** (half-applied locale gate) that can
demote the whole domain. Money-path verdict: **launch-safe ONLY if the FM1 webhook gate is closed
operationally + a reconciliation net is added; NOT launch-safe as a fire-and-forget deploy.**

---

## Top 5 Failure Reasons

### 🔴 F1 — Vendor/webhook config mismatch → guest pays, seat never confirmed, NO auto-refund fires
**Risk Score: 0.6 × 9 × (1/9) ≈ 5.4 — HIGHEST**

**What happened.** Owner sets `PAYMENT_VENDOR=mollie` (ADR-019 default; `booking-payment.ts:42`) but
registers (or leaves) only the *Stripe* webhook at the processor — or sets `stripe` and registers
Mollie — or never registers the booking webhook URL at all. The guest completes checkout on the
hosted page. The seat is held `pending`. **No webhook arrives.** `handleBookingPaid` never runs, so
`confirmBooking` never runs — and the **auto-refund only fires inside `confirmBooking`'s
"unhonorable" branch** (`store.ts:183`, `confirm-payment.ts:68`). A confirm that never executes
can never decide-to-refund. At 20 min the `releaseExpiredHolds` cron (`store.ts:263`) reaps the
hold and restores the seat — but **the money is gone and the customer has nothing.** Worst money
outcome possible: charged, no seat, no refund, no alert.

**Historical basis.** cb-007 coherence audit FM1 names this *verbatim* as "the one true go-live gate
… operational (deploy config), not a code defect … no auto-refund (refund only fires on an
un-honorable confirm, which never runs)." This is the project's own most-recent finding, un-actioned.
Reinforced by `WHY-MY-AUDITS-MISS.md` config-trap class and catalog-022 (configure-the-owner).

**Why current design wouldn't catch it.** `tsc`, `next build`, and all unit tests pass — the code is
correct; the *deployment* is mis-wired (catalog-020: tsc-green ≠ works). There is **no in-code
reconciliation net**: nothing scans for `pending` bookings that never reached a terminal state. The
owner-alert paths in `handle-booking-paid.ts:72` only fire when a webhook *does* arrive for an
unmatched booking — a webhook that **never arrives** trips nothing.

**Mitigation (CODE-DOABLE, highest priority).** Add a reconciliation cron: query bookings `pending`
AND `created_at < now − 2h` AND `holdExpiresAt < now` (so the customer had time to pay and the hold
already lapsed) → `notifyOwnerAlert('Possible orphaned paid booking — verify at processor')`. This
catches the orphan **regardless of webhook config**. Plus a launch checklist gate: after setting
`PAYMENT_VENDOR`, register the matching webhook URL and fire ONE real test booking end-to-end. (Owner
action for the registration; code for the net.)

---

### 🔴 F2 — The DB-transaction store has ZERO integration tests — a Drizzle/SQL regression ships silently
**Risk Score: 0.45 × 8 × (1/8) = 3.6**

**What happened.** A future edit to `store.ts` (or a Drizzle/driver bump) subtly breaks the atomic
conditional decrement, the SQL-guarded `status='pending'` transition, or the `GREATEST(...,0)`
restore — and **no test fails**, because the only tests are on the *pure* `store-logic.ts` state
machine. Oversell, double-restore, or lost-hold returns; first noticed when a real tour is oversold.

**Historical basis.** Glob of `lib/booking/*.test.ts` returns exactly four files —
`store-logic.test.ts`, `format-slot.test.ts`, `confirm-payment.test.ts`, `confirm-email.test.ts`.
**There is no `store.test.ts`.** The most concurrency-critical file — `store.ts`, holding the
`reserveSlot` transaction (`:104-133`), the SQL-guarded confirm (`:191-217`), the exactly-once
cancel (`:245-256`) — has no integration coverage. This is the exact blind-spot class in
`WHY-MY-AUDITS-MISS.md` ("code-shaped not journey-shaped audits; trust-without-verify") and
`CANT_BE_DONE.md` (E2E deferred → needs a live DB).

**Why current design wouldn't catch it.** The pure state-machine tests (`store-logic.test.ts`)
exhaustively verify `decideConfirm`/`decideCancel`/`seatsLeft`/`isHoldExpired` — but those are the
*decisions*, not the *SQL that enforces them concurrently*. The `WHERE bookedCount+party<=capacity`
guard, the unique-index idempotency race (`store.ts:140-149`), and the `ne(status,'cancelled')`
cancel guard are **only exercised against a real Postgres** — which CI never spins up.

**Mitigation (CODE-DOABLE).** Add a transactional integration test against an ephemeral Postgres
(testcontainers or a throwaway Neon branch): two concurrent `reserveSlot` calls on a 1-seat slot
(exactly one wins); double `confirmBooking` with same vs different `paymentRef`; double
`cancelBooking` asserts capacity restored exactly once; `releaseExpiredHolds` restores a lapsed hold
once. This is the single highest-value test gap in the money path.

---

### 🟠 F3 — Hold-spam DoS: a 2-IP bot pad-locks every small slot without paying a cent
**Risk Score: 0.35 × 7 × (1/6) ≈ 2.9**

**What happened.** An abuser (or a competitor) scripts `POST /api/booking/reserve` from 2–3 IPs.
Each IP gets 10 reserves / 5 min (`reserve/route.ts:47`). On a 10-seat slot, two IPs hold every seat
for 20 min, re-fire as holds expire, and the tour shows **sold out to real customers indefinitely** —
no payment ever required. Inventory is denied; revenue silently drops to zero with no error anywhere.

**Historical basis.** spec-011 §I **line 93, explicitly deferred**: *"Hold-spam DoS — per-IP
in-memory rate limit (ADR-011) isn't shared across serverless instances; a 2-IP bot can hold out a
10-seat slot. Needs a durable cap for small slots."* The task's inventory note flagged this as a
known deferred limit; it is confirmed un-built. ADR-011 itself documents the in-memory rate-limit as
process-scoped and not cross-instance.

**Why current design wouldn't catch it.** The per-IP cap is real (`reserve/route.ts:47`) and the hold
TTL + cleanup cron are real (`store.ts:263`, `vercel.json` `*/15`) — but the rate limit is
**in-memory and per-serverless-instance** (ADR-011), so it neither bounds total holds across
instances nor caps per-*slot* concurrency. No alert fires on "slot fully held but unpaid for N
cycles." It looks like organic sell-out.

**Mitigation (CODE-DOABLE, medium).** Cap concurrent *unpaid pending holds per slot* as a fraction of
capacity (e.g. reject a new hold when `pending_holds_for_slot ≥ capacity` AND the requester has no
prior paid booking), enforced in the `reserveSlot` transaction (durable, cross-instance — it's a DB
count, not an in-memory map). Lower-effort interim: alert the owner when a slot has been 100% held
with 0 confirmations across 2+ cleanup cycles.

---

### 🟠 F4 — Locale thin-content gate is HALF-APPLIED → Google demotes the whole domain (incl. en/nl)
**Risk Score: 0.5 × 7 × (1/7) = 3.5**

**What happened.** Four ~30%-translated locales (de/it/es/fr) ship indexable. `i18n.config.ts:23`
defines `indexableLocales:['en','nl']` to gate them out of sitemap/robots/hreflang — but **nothing
consumes it.** `app/sitemap.ts` iterates `i18nConfig.locales` (all 6) for both URLs *and* hreflang
alternates (`sitemap.ts:48,57,68,77,86,95`); `app/robots.ts` has no per-locale disallow. Google sees
4× near-duplicate thin-content locales, demotes them, **and drags en/nl down with them.** Organic
traffic — the launch's whole point — never materializes.

**Historical basis.** cb-006 coherence audit #1 (`reports/crystal-ball/cb-006-2026-06-13`). Confirmed
this run: grep for `indexableLocales` returns only the definition file, cb-006, and
`SITE_DATA_EXTRACT.md` — **zero functional consumers.** seo-001 + loc-quality-001 (cited inside
`i18n.config.ts:21`) already graded only en/nl as shippable.

**Why current design wouldn't catch it.** The constant *exists* and *reads* correct, so a glance at
the config says "handled." `tsc`/build pass — an unused export is not an error (catalog-020 again;
catalog-021 Chesterton's-fence inverse: the fence was *built but never connected*). Only a runtime
sitemap fetch + a "does anything import this?" check surfaces it.

**Mitigation (CODE-DOABLE).** Wire `indexableLocales` into the 3 consumers: filter
`i18nConfig.locales → indexableLocales` in `app/sitemap.ts` (URL loop AND the hreflang alternate
maps), add a per-locale `disallow` for non-indexable locales in `app/robots.ts`, and emit hreflang
`alternates` only for indexable locales in the layout. One constant, three call-sites — the config
comment already promises this is the single reversible edit.

---

### 🟠 F5 — Async-payment (SEPA/iDEAL) settle never arrives → hold reaped before the charge clears
**Risk Score: 0.3 × 7 × (1/7) = 2.1**

**What happened.** A guest pays by SEPA/iDEAL/Bancontact (Mollie default vendor). The charge settles
*days* later via `payment.paid` (Mollie) / `checkout.session.async_payment_succeeded` (Stripe). The
design extends the hold to +7d on the pending/open event (`store.ts:402` `extendHoldForAsyncPayment`,
wired at `stripe-webhook:301-303`, `mollie-webhook:138-139`). **But** if the *interim* pending
webhook is missed/mis-routed (same root as F1) the extend never fires, the 20-min cleanup cron reaps
the seat, and when the late `paid` arrives the booking is `cancelled` → `decideConfirm` returns
`refund:'cancelled'` (`store-logic.ts:54`). Best case the guest is auto-refunded (money-safe!) but
**loses the seat they paid for**; worst case (F1 vendor mismatch) the late `paid` also never arrives
and it's a silent orphan.

**Historical basis.** spec-011 §C + the cb-006 F4/async note; the extend-hold mechanism is built and
credited — but its correctness is **entirely dependent on webhook delivery**, inheriting F1's fragility.
No `store.test.ts` exercises the extend path (F2 overlap).

**Why current design wouldn't catch it.** The extend code is correct and present; the failure is
again **delivery, not logic.** Async settle is the lowest-frequency path, so it's the least likely to
be caught in a single test booking (which will almost certainly use a card, settling instantly).

**Mitigation.** Covered transitively by F1's reconciliation cron (it catches any non-terminal
`pending` past a deadline, async included) — but **extend the deadline window** for bookings whose
last-seen event was an async-pending so the net doesn't false-positive on a legitimately-extended
7-day hold. Plus: include one SEPA/iDEAL test booking in the launch checklist, not just a card.

---

## Credited guards (lowered the scores above — verified present)

- **handle-booking-paid IS idempotent — YES, at two layers.** Webhook layer: `isAlreadyProcessed`/
  `markProcessed` (`app/api/stripe-webhook/route.ts:85,471`; `app/api/mollie-webhook/route.ts:85,142`;
  Mollie keys on `mollie:{id}:{status}` so failed≠paid aren't conflated, `:84`). Store layer:
  `decideConfirm` returns `already_confirmed` on same `paymentRef` (`store-logic.ts:49-52`) AND the
  confirm UPDATE is SQL-guarded to `status='pending'` so a concurrent second confirm matches 0 rows
  and re-decides on committed state (`store.ts:191-217`). A duplicate/retried webhook **cannot**
  double-confirm or double-charge. This is why no failure mode above is "double-booking on retry."
- **No-oversell on concurrent reserve.** Single atomic conditional UPDATE
  `bookedCount+party<=capacity` (`store.ts:106-118`) — two concurrent reserves cannot both win.
- **Money-safety (paid-but-unhonorable → refund) is real, not just logged.** `confirm-payment.ts:68-78`
  actually calls the injected vendor `refund(paymentRef)`; `logRefundDecision` (`store.ts:42`) is an
  *additional* structured log, not the whole mechanism. Vendor refunds carry idempotency keys
  (`stripe-webhook:125` `booking-refund-${bookingId}`). `confirm-payment.test.ts:42-69` proves refund
  fires exactly once per reason and survives a throwing refund fn. **The task's worry that
  `logRefundDecision` "just logs" is unfounded — it refunds.**
- **Fail-closed on no-DB / engine-off.** `getDb()` null → `reserveSlot` returns `unavailable`
  (`store.ts:71`), checkout 503 (`checkout/route.ts:34`), adapter availability `[]`
  (`inhouse-adapter.ts:58`). No fake availability, no unpersistable holds (cb-006 F3 honored).
- **Reserve idempotency partly built.** `idempotencyKey` accepted (`reserve/route.ts:86`), sent by the
  client per-attempt (`slot-picker.tsx:42,62,69`), and backed by a unique index
  (`bookings_idempotency_key_unique`, schema `:251`) with a 23505-race recovery (`store.ts:140-149`).
  cb-007 audit's FM2 ("reserve has no idempotency") is now **partially obsolete** — a key-bearing
  retry is deduped. (Residual: a retry WITHOUT a key, or cross-instance, still double-holds — narrow.)
- **DST correctness built + tested.** `format-slot.ts` uses `Intl` with explicit `Europe/Madrid`;
  `confirm-email.test.ts:48-54` asserts a winter 09:00Z and summer 08:00Z both render 10:00 Ibiza.
  cb-006 F4 retired.
- **Checkout pre-charge gates.** `checkout/route.ts:74-87` refuses non-`pending` (409 ALREADY_RESOLVED)
  and expired holds (409 HOLD_EXPIRED) before creating any charge.
- **Components are wired, not dead.** `SlotPicker` → `app/[locale]/tours/book/page.tsx`; `SlotManager`
  → `app/admin/slots/page.tsx` (verified — addresses the CLAUDE.md "check component wiring" rule).

---

## Critical Gaps (ranked by cost-of-delay)

| # | Gap | Impact | Discovery stage if unfixed | Fix now | Fix later | Confidence |
|---|-----|--------|----------------------------|---------|-----------|------------|
| G1 | No reconciliation net for orphaned `pending` bookings (F1) | 90% | production (paid, no seat) | ~3h | days + chargebacks | High |
| G2 | No integration test on `store.ts` DB transactions (F2) | 70% | production (oversell on regression) | ~4h | a real oversold tour | High |
| G3 | `indexableLocales` defined, zero consumers (F4) | 60% | weeks post-launch (ranking drop) | ~2h | months of lost organic | High |
| G4 | No durable per-slot hold cap (F3) | 40% | production (silent sell-out) | ~3h | revenue starvation | Medium |

---

## Decision Debt (deferred decisions now overdue at launch)

1. **Webhook-registration runbook (F1).** ADR-019 picks Mollie default but no doc forces "register the
   matching booking webhook + fire one test booking." Operational debt with the highest blast radius.
2. **`store.test.ts` integration coverage (F2/G2).** Deferred per `CANT_BE_DONE.md` (needs live DB) —
   but the money path makes "we can't easily test it" an unacceptable resting state.
3. **Hold-DoS durable cap (F3).** spec-011 §I line 93 — explicitly punted; launch makes it live.
4. **Locale-gate wiring (F4).** cb-006 #1, still open across two crystal-ball cycles → decision-decay.
5. **VAT/IVA on tour price (cb-007 FM5).** Price charged is net; a physical EU tour is taxable at
   delivery. Owner/accountant decision — unchanged, still open.

---

## Prevention Recommendations (prioritized)

**CODE-DOABLE now (do before launch):**
1. **[F1/G1] Orphan-booking reconciliation cron** — alert owner on `pending` bookings stuck past a
   deadline. Single highest-value mitigation; closes the #1 failure regardless of webhook config.
2. **[F2/G2] `store.test.ts`** — concurrent reserve / double confirm / double cancel / expired-hold
   release against an ephemeral Postgres. Closes the largest test blind-spot in the money path.
3. **[F4/G3] Wire `indexableLocales`** into `app/sitemap.ts` (URLs + hreflang), `app/robots.ts`
   (per-locale disallow), and layout hreflang. One constant, three call-sites.
4. **[F3/G4] Per-slot durable hold cap** in the `reserveSlot` transaction (DB count, cross-instance).

**OWNER / DECISION (cannot be coded around):**
- **[F1] Register the booking webhook** at the live processor matching `PAYMENT_VENDOR`, then run ONE
  card test booking AND ONE SEPA/iDEAL test booking end-to-end. The single go-live gate.
- **[F5] Decide async-payment policy** — confirm the 7-day extended-hold window is acceptable for
  SEPA settle vs. seat scarcity.
- **[Decision Debt #5] VAT/IVA** — owner + accountant set whether displayed price is gross or net.

---

## Score basis & trend

cb-006 pre-mortem scored the **unbuilt** design 72/100 (BUILD, gated on 7 invariants). The invariants
were built and verified (cb-007 audit, 87/100). This pre-mortem confirms the **core money logic is
sound and idempotent** — so the residual launch risk has **migrated out of the code and into
deployment-config + test-coverage + SEO wiring**. The crater, if it comes, reads: *"the booking math
was right; the webhook was never registered, nothing watched for the orphans it created, and Google
demoted us anyway."* Highest probability failure: **F1 (≈60%, risk 5.4)** — fully preventable with
one cron + one runbook line.
