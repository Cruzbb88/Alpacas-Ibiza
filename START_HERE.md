# START HERE — Alpacas Ibiza Redesign

**One sentence:** A Next.js 16 conversion-focused redesign of alpacasibiza.com (premium Ibiza alpaca farm — tours, weaving studio, alpaca manure), built around four conversion paths and integrated with FareHarbor, Resend, Cloudflare Turnstile, and Google Analytics.

**Last updated:** 2026-05-26 (this session)

---

## Read in this order

Each doc has one job. Read top-down; don't skip to the code.

| # | Doc | Job |
|---|---|---|
| 1 | [README.md](README.md) | Marketing-facing overview: brand, pages, design system |
| 2 | [PRACTICES.md](PRACTICES.md) | **12 rules of conduct** for any agent working here. Pre-flight checks. Append protocol. |
| 3 | [CLAUDE.md](CLAUDE.md) | In-code failsafe map (file:line) + env-var deploy tiers. Code-adjacent reference. |
| 4 | [PLAN.md](PLAN.md) | Execution plan: Track A (done) / B (input-blocked) / C (input-blocked) |
| 5 | [OWNER_INPUT_NEEDED.md](OWNER_INPUT_NEEDED.md) | ⚠️/🟡/🟢 items waiting on the farm owner |
| 6 | [CANT_BE_DONE.md](CANT_BE_DONE.md) | **10 hard limits** of the current toolchain — read before dispatching audit agents |
| 7 | [REALITY_CHECK.md](REALITY_CHECK.md) | Redesign vs. live site vs. competitors (audit verdicts) |
| 8 | [INTEGRATION_STATUS_2026-04-20.md](INTEGRATION_STATUS_2026-04-20.md) | Integration matrix — 🟢 LIVE / 🟡 PENDING / ⚪ N/A |
| 9 | [VERIFICATION_RESULTS.md](VERIFICATION_RESULTS.md) | Audit-finding verdicts (12/13 PROVEN with file:line) |

**If a claim in any doc contradicts the code, code wins.** PRACTICES Rule 9.

---

## What's done

### Architecture decisions ([docs/adr/](docs/adr/))

9 ADRs codify the load-bearing choices. Read these before proposing changes that contradict them.

- **001** Resend `scheduledAt` for delayed tour emails (no queue, no new infra)
- **002** Turnstile fail-open dev / fail-closed prod (asymmetric by design)
- **003** Webhook secret fail-closed (opposite of Turnstile — deliberate)
- **004** Alcaca shop email-only, no Stripe (matches live business model)
- **005** 6 locales, `en` default, GB flag (practical shorthand)
- **006** GA4 `beforeInteractive` (chosen after 3 failed approaches — don't revert)
- **007** Admin login fail-closed when ADMIN_USERNAME/PASSWORD unset + 8h JWT
- **008** Availability ISR cache 1800s (not 7200) for booking freshness
- **009** Client-side `/api/availability` dedup via promise cache (60s TTL)

### Specs shipped ([specs/done/](specs/done/))

| Spec | What it locks in |
|---|---|
| [001 tour price single source](specs/done/001-tour-price-single-source.md) | `TOUR_BASE_PRICE_EUR = 30` in `lib/config.ts`; structured-data + cards read from it |
| [004 dead routes cleanup](specs/done/004-dead-routes-cleanup.md) | `app/shop/*`, `app/about`, `app/contact` deleted; middleware redirects to `[locale]` |
| [006 structured-data integrity](specs/done/006-structured-data-integrity.md) | `aggregateRating` is conditional (only emits with real Google review data) |
| [007 form-handler dedup](specs/done/007-form-handler-dedup.md) | `useFormSubmit` hook + `emailLayout()` used by contact, commission, owner-digest |

### Code shipped this session

- **XSS escape** on `app/api/contact/route.ts` + `app/api/commission/route.ts` (via `lib/html#escapeHtml`)
- **Admin auth hardened** in `app/api/auth/[...nextauth]/route.ts`: no default creds, 8h JWT
- **FareHarbor freshness**: `/api/availability` cache 7200s → 1800s; `lib/use-availability.ts` dedupes client fetches in `booking-section.tsx` + `availability-urgency.tsx`

---

## What's in flight

### Specs in [specs/todo/](specs/todo/)

| Spec | Priority | Blocker |
|---|---|---|
| [002 GDPR legal content](specs/todo/002-legal-content-gdpr.md) | P0 | Owner — needs real Privacy/Terms/Cookies text |
| [003 Adopt-a-Paca page](specs/todo/003-adopt-a-paca-page.md) | P0 | Owner — needs €75/mo benefits + 14 alpaca bios |
| [005 locale strategy](specs/todo/005-locale-strategy.md) | P0 | Owner — `en` vs `nl` default? Prune IT/FR? |
| [008 image optimization](specs/todo/008-perf-image-optimization.md) | P1 | None — safely doable. Removes `images.unoptimized: true` in `next.config.mjs` |

### Roadmap ([specs/roadmaps/ROADMAP-skill-execution.md](specs/roadmaps/ROADMAP-skill-execution.md))

**12/18 complete.** Waves 0–4 done; Wave 5 (handoff + kit-sync) still open. W3.3 gigafactory (alpaca card factory) blocked on owner bios.

### Reports ([reports/](reports/))

11 audit/analysis reports from this and prior sessions. Each lives in `reports/<skill-name>/`. Newest first:

- [crystal-ball](reports/crystal-ball/) — 71/100 design coherence audit
- [exploding-pen](reports/exploding-pen/) — micro-fix gap scan
- [matrix-reload](reports/matrix-reload/) — verdict: incremental sufficient, no reload zone
- [unified-field-theory](reports/unified-field-theory/) — duplicate-pattern clusters
- [performance-optimizer](reports/performance-optimizer/) — critical path bottlenecks
- [resonance-finder](reports/resonance-finder/) — 5 high-sensitivity knobs
- [task-radar](reports/task-radar/) — Eisenhower matrix, 8 Q1 launch-blockers
- [skill-roadmap](reports/skill-roadmap/) — 36-skill applicability classification
- [site-assets](reports/site-assets/) — live + competitor brand audits
- [devtools-extract](reports/devtools-extract/) — FareHarbor admin scrape template
- [wave-1-synthesis](reports/wave-1-synthesis-2026-05-26.md) — cross-skill consolidation

---

## What's hard-blocked

[CANT_BE_DONE.md](CANT_BE_DONE.md) — 10 entries. Each has an explicit re-check trigger. **Do not dispatch agents to retry these.** Highlights:

- Live runtime GA4/GTM events (needs deploy)
- FareHarbor API operations (needs Pro plan + keys)
- Exact hex/font values from competitors (CSS is bundled & opaque)
- Lighthouse/Core Web Vitals scores (needs deployed URL)
- Decision-decay scoring (needs N≥5 prior Cortex sessions)

---

## Don't redo this

[~/.claude/skills/philosophy-prompting/catalog/](../../.claude/skills/philosophy-prompting/catalog/) — **15 catalog entries** (1 enforced via hook, 3 in testing, 11 pending). Each captures a recurring AI failure mode with a reproducible test prompt. Read entries whose `Test` prompt resembles your task before acting.

Entries to know:

- **004** Read existing docs before auditing (the rule THIS document supports)
- **005** No Omni-Cortex saves — **enforced by hook**, blocks all `mcp__omni-cortex__*` tool calls
- **008** Re-read files after cross-tool modifications (linter / IDE / user edits during your task)
- **009–015** Migrated 2026-05-26 from retired project-local skill: 009 verify-with-parallel-agents · 010 never-invent-data · 011 preflight-gate · 012 audit-finding-is-a-claim · 013 mtime-is-not-truth · 014 sonnet-for-scans-opus-for-synthesis · 015 kit-skills-not-vibes

---

## How to pick up

For a fresh agent / new contributor, the entry point is:

1. Read **this file**. Then read [PRACTICES.md](PRACTICES.md).
2. Run `git status` + `git log --oneline -10`. Note any uncommitted work.
3. Check [specs/todo/](specs/todo/) — pick a spec whose `depends_on:` is `[]` and whose `priority` matches the moment.
4. **Before any work**, re-verify the spec's premises against current code (Rule 12 of PRACTICES). 4 of 8 specs this session were already done.
5. Run the existing `dev` server (it's usually already up on port 3000); check `dev_output.txt` for state.
6. If the work touches a Tier-1 env var (see [CLAUDE.md](CLAUDE.md)), confirm with the owner first.

**Next concrete unblocked work (no owner dependency):** [spec 008 image optimization](specs/todo/008-perf-image-optimization.md) — flip `images.unoptimized: true → false` in `next.config.mjs`, add `remotePatterns` for any external image hosts, smoke-test on `/en` and `/en/tours`.
