# Skill Roadmap — Alpacas Ibiza Next.js Site
**Report:** sr-001 | **Date:** 2026-05-26 | **Project:** alpaca-farm-redesign

## Project Context
Next.js 16 / Tailwind / shadcn marketing & booking site for an Ibiza alpaca farm.
4 conversion streams: tour bookings (FareHarbor), e-commerce (manure/woven), commissions, and newsletter.
Active execution plan with 5 open code tracks (A1–A5). Multilingual (6 locales). Deployed to Vercel.

---

## Summary Counts
| Tier | Count |
|---|---|
| Essential | 7 |
| Recommended | 10 |
| Optional | 10 |
| N/A | 9 |
| **Total** | **36** |

---

## Classification Table

| Skill | Tier | Reason | Suggested First Invocation |
|---|---|---|---|
| **build** | Essential | Core build pipeline for implementing PLAN.md tracks A1–A5 (price fix, dead routes, alpaca profiles). | `/build` against PLAN.md Track A3 — delete dead non-localized routes |
| **quick-plan** | Essential | PLAN.md already exists but Track B–D items need spec decomposition before coding. | `/quick-plan` to spec the FareHarbor live-availability widget (Track B) |
| **exploding-pen** | Essential | Site has documented gaps: hardcoded `reviewCount:127`, no central tour price constant, duplicate routes. Gap scanner will find more micro-fixes. | `/exploding-pen scan` on `lib/` and `app/[locale]/` |
| **performance-optimizer** | Essential | Next.js 16 with 6 locales and multiple external API calls (FareHarbor, GA4, Google Places). Critical path analysis needed before production launch. | `/performance-optimizer` on `app/api/availability/route.ts` |
| **architecture-decision-tracker** | Essential | CLAUDE.md already has an ADR at `docs/adr/001-resend-scheduled-sends.md`. Multiple open tradeoffs (in-memory store, GTM strategy, language priority). Needs systematic ADR tracking. | `/architecture-decision-tracker` audit to formalize existing decisions + open questions from OWNER_INPUT_NEEDED.md |
| **ci-fix** | Essential | Vercel deploy pipeline is active. Failing builds block the owner from going live. | `/ci-fix` after next failed Vercel deploy |
| **task-radar** | Essential | PLAN.md has 5 tracks + OWNER_INPUT_NEEDED.md items in flight. Eisenhower classification needed to prioritize what ships before launch. | `/task-radar` L2 deep scan on project |
| **brainstorm** | Recommended | Conversion rate optimization and new features (Adopt-a-Paca, press page, alpaca profiles) are in OWNER_INPUT_NEEDED.md. Brainstorm before building. | `/brainstorm` on individual alpaca profile page UX |
| **crystal-ball** | Recommended | Multiple architectural bets in flight: in-memory booking store, 6-locale middleware, FareHarbor embed. Pre-mortem before launch. | `/crystal-ball premortem` before go-live |
| **site-assets** | Recommended | Live Dutch site (`alpacasibiza.nl`) has brand assets, real farm photos, and alpaca names not yet in redesign. Extraction needed. | `/site-assets https://www.alpacasibiza.nl` |
| **devtools-extract** | Recommended | FareHarbor admin portal and Google Reviews dashboard are authenticated — console scripts can pull live data for seeding. | `/devtools-extract` for FareHarbor item IDs to populate `lib/config.ts` |
| **meeting-to-specs** | Recommended | OWNER_INPUT_NEEDED.md contains ~20 open questions that need to become specs once answered. | `/meeting-to-specs` on OWNER_INPUT_NEEDED.md after owner response |
| **unified-field-theory** | Recommended | 6 parallel translation files + duplicate non-localized routes + 3 divergent integration docs = unification debt. | `/unified-field-theory` on `translations/` vs `app/[locale]/` vs dead `app/shop/*` |
| **probability-storm** | Recommended | Key strategic bet: FareHarbor embed vs custom booking. Viability check before deep integration work. | `/probability-storm` on FareHarbor live-availability feature vs static CTA fallback |
| **proposal-builder** | Recommended | If the site is a client project, a deployment/launch proposal for the farm owner would be valuable. | `/proposal-builder` from PLAN.md + PROJECT_SUMMARY.md |
| **collab-handoff** | Recommended | Active handoff between sessions is documented in PRACTICES.md. Structured export/import helps continuity. | `/handoff export` at end of each work session |
| **matrix-reload** | Recommended | Dead non-localized routes (A3), stale docs (A4), and the in-memory booking store are candidates for surgical rebuild zones. | `/matrix-reload` scoped to `app/shop/*` dead routes |
| **agent-teams** | Optional | Useful if Tracks A1–A5 are parallelized. Single-developer context makes this less urgent than tools above. | `/agent-teams` when executing 3+ PLAN.md tracks simultaneously |
| **resonance-finder** | Optional | Timeout values in `lib/fetch.ts` (5-6s AbortController), GA4 poll intervals, and form debounce are tunable. | `/resonance-finder` on `lib/fetch.ts` + `lib/analytics.ts` |
| **skill-creator** | Optional | Only needed if a new project-specific skill is required. | When a recurring workflow pattern emerges that no existing skill covers |
| **gigafactory** | Optional | Could scaffold translation file generators or product data factories. | `/gigafactory` to build alpaca-profile data scaffold |
| **file-factory** | Optional | Useful for generating owner-facing docs (integration guide as DOCX, pricing sheet as XLSX). | `/file-factory` to create owner DOCX from INTEGRATION_CHECKLIST.md |
| **sipoc** | Optional | Could map the commission request → fulfillment process for documentation. | `/sipoc` on the 6-step commission flow |
| **sop-gen** | Optional | Could document deployment runbook or content update procedures for the farm owner. | `/sop-gen` to create a "How to update pricing" SOP for the owner |
| **weekly-digest** | Optional | Useful once the site is live and generating GA4 + FareHarbor data to summarize. | `/weekly-digest` post-launch for booking + traffic summary |
| **kit-sync** | Optional | If any skills are customized for this project, push changes back to the kit. | `/kit-sync scan` after any skill customization |
| **airtable-enhanced** | N/A | No Airtable in the stack. Email/booking flows use Resend + FareHarbor, not Airtable. | — |
| **billing-reconciler** | N/A | No time-tracking or billing data in this project. | — |
| **data-pipeline** | N/A | No ETL pipeline. Content is static JSON/translation files. | — |
| **memory** | N/A | Omni-Cortex disabled per project constraints. | — |
| **portfolio-health** | N/A | Omni-Cortex required for cross-project aggregation; not available here. | — |
| **scorm** | N/A | No e-learning content in scope. | — |
| **saas-blueprint-skill** | N/A | Site is already built; SaaS blueprint is for greenfield multi-tenant design. | — |
| **video-transcript-extractor** | N/A | No video content to extract. | — |
| **youtube-bulk** | N/A | No YouTube content in scope. | — |
| **skill-roadmap** | N/A | This document is the output of skill-roadmap — already run. | — |

---

## Top 5 Essential Skills — Recommended Execution Order

1. **task-radar** — Triage PLAN.md + OWNER_INPUT_NEEDED.md before any coding.
2. **build** — Execute Track A3 (delete dead routes) immediately; unblocks clean CI.
3. **exploding-pen** — Scan for micro-gaps alongside build work; cheap signal.
4. **architecture-decision-tracker** — Formalize open ADRs before GTM/FareHarbor decisions lock in.
5. **performance-optimizer** — Run before go-live to validate the multi-locale + API call stack.
