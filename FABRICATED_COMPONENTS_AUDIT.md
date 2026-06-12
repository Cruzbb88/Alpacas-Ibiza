# Component Defaults + Data Files Fabrication Audit — 2026-06-09

## components/ findings

### CLEAN (no fabricated defaults — data passed in by caller or fail-quiet)
- `components/testimonials-wall.tsx` — no hardcoded quotes; reads from `lib/data/testimonials.ts` (real Facebook reviews) or caller-supplied `items` prop. REAL.
- `components/google-reviews-wall.tsx` — server component; fetches live Places API; returns null when unconfigured. CLEAN.
- `components/awards-badges.tsx` — reads from `lib/data/awards.ts` (empty array, no fake awards); fail-quiet in prod. CLEAN.
- `components/faq.tsx` — pure renderer; no default Q&A data; all content comes from caller props. CLEAN.
- `components/experience-cards.tsx` — pure renderer; no hardcoded experience descriptions. CLEAN.
- `components/hero.tsx` — prop-driven; `trustSignals` is an optional caller prop, no hardcoded values. CLEAN.
- `components/features.tsx` — pure renderer; all content from `items` prop. CLEAN.
- `components/timeline.tsx` — pure renderer; no hardcoded steps. CLEAN.
- `components/tour-comparison.tsx` — pure renderer; "All spec values arrive as props — NO values are hard-coded here." CLEAN.
- `components/social-proof-strip.tsx` — live FareHarbor data; explicit fallback text (no fake numbers) when unconfigured. CLEAN.
- `components/adopt/trust-signals.tsx` — all text props come from caller (i18n); only hardcoded strings are payment-method names (Visa, Mastercard, etc.) — GENERIC.
- `components/adopt/alpaca-personality-match.tsx` — question/answer copy is GENERIC UX quiz text (no business claims). Trait-matching runs against owner-supplied `personality` fields (null = excluded). CLEAN.
- `components/weaving-showcase.tsx` — `badgeText` default `'Handcrafted in Ibiza'` is a factual claim about the weaving studio (production is physically in Ibiza). LOW RISK but unconfirmed by owner.
- `components/alpaca-of-the-day.tsx` — eligibility requires `fun_fact !== null`; fun_fact values come from `lib/tenants/alpacasibiza-content.ts` (migrated verbatim from live site). REAL.

### FABRICATED / NEEDS OWNER REVIEW

**HIGH RISK — visible to customers:**

1. `components/weaving-showcase.tsx` line 325: default `badgeText = 'Handcrafted in Ibiza'` — specific production-location claim with no explicit source citation in the file. LOW risk in practice (weaving studio is confirmed at Es Currals, Ibiza), but no REAL/OWNER_REVIEW_TRANSLATION tag. FABRICATED (unverified default).

---

## lib/data/*.ts findings

### CLEAN
- `lib/data/alpacas.ts` — 14 entries, all `bio: null` ✓, `image` paths set, birthdates: Bardot `2022-01-19`, Chet `2020-11-20`, Toots `2021-02-03` with inline comment "owner to confirm exact day". 11 others `birthDate: null`. NOTE: file is a reference roster only; live UI data is in `lib/tenants/alpacasibiza-content.ts`. Consistent.
- `lib/data/testimonials.ts` — 6 entries, all `rating: null` (UNMAPPED), verbatim from live Facebook reviews per inline comment. REAL.
- `lib/data/events.ts` — empty array `[]`; all examples commented out. CLEAN.
- `lib/data/awards.ts` — empty array `[]`; "DO NOT invent award names" comment. CLEAN.
- `lib/data/press.ts` — 6 entries, all `logoUrl: null`, `status: 'pending'`; fail-quiet. CLEAN.
- `lib/data/newsletter-issues.ts` — empty array `[]`. CLEAN.
- `lib/data/greeting-cards.ts` — empty array `[]` (examples commented out). CLEAN.
- `lib/data/social-proof.ts` — empty array `[]`; comment "Never invent data". CLEAN.
- `lib/data/media.ts` — 9 `status: 'live'` photo entries, captions are descriptive (not marketing copy). virtualTour array: 5 stops, all `status: 'draft'` and `imageSrc: null`. Photos copied from live site per inline comment. REAL (owner's own photography).

### FABRICATED / NEEDS OWNER REVIEW

2. `lib/data/journal.ts` line 71–101: 1 live post present (`spinning-the-first-skein`, `status: 'live'`). The file header says "UNMAPPED — no posts invented. Every entry must be owner-supplied." However the post body includes craft instructions ("Alpaca fibre has no lanolin…", "The two-day weaving and spinning workshop runs in our off-season") that are plausible but NOT traced to an owner-supplied source. Post is attributed to `'San'` (a real founder). PARTIALLY FABRICATED — content authored by AI, published as San's voice without confirmed owner approval.

3. `lib/data/journal-posts.ts` — second journal data file (separate from `journal.ts`). Contains 3 live posts, including:
   - `first-alpaca-farm-on-ibiza`: body mentions "Wishfulfilling Weaving" and claims Es Currals is "in the rural north of the island". Both are verifiable but neither has an explicit OWNER_REVIEW sign-off.
   - `why-we-keep-the-herd-small`: body puts specific operational rationale ("Fourteen alpacas is what Es Currals supports comfortably") in Bart's voice — attributed to `BART` author constant. AI-authored prose in the founder's first-person voice. FABRICATED.
   - `spinning-the-first-skein`: duplicate of the journal.ts post, same AI-authored body in San's voice. FABRICATED.
   All three posts are `status: 'live'` (active production content). None carry an `OWNER_REVIEW` sign-off tag.

4. `lib/data/search-index.ts` line 19: hardcoded snippet `'Hatha yoga sessions at Es Currals. €30, max 6 guests.'` — €30/person is REAL (matches ground truth for Yoga 1.5hr €30), but "max 6 guests" and "Hatha" are unconfirmed. PARTIALLY FABRICATED (yoga capacity/style not in ground truth).

5. `lib/tenants/alpacasibiza-content.ts` — 14 animals with `personality` and `fun_fact` fields set. These were migrated from the live site (Dutch) and auto-translated to English. File has inline `OWNER_REVIEW_TRANSLATION` comments on every entry. The EN translation is not yet confirmed by owner. LOW risk (source is live site), but translation accuracy is UNVERIFIED.

---

## Summary

| Metric | Count |
|---|---|
| Components audited (non-UI) | ~30 |
| Data files audited | 13 |
| **Total fabrications** | **5** |

**HIGH RISK (visible to customers as published content):**
- `lib/data/journal.ts` — 1 live AI-authored post in San's first-person voice (no owner sign-off)
- `lib/data/journal-posts.ts` — 3 live AI-authored posts in founders' first-person voices (no owner sign-off); these are the real data source consumed by the UI
- `lib/data/search-index.ts` line 19 — "Hatha" + "max 6 guests" for yoga unconfirmed

**LOW RISK:**
- `components/weaving-showcase.tsx` — untagged default `badgeText = 'Handcrafted in Ibiza'`
- `lib/tenants/alpacasibiza-content.ts` — EN translations flagged `OWNER_REVIEW_TRANSLATION` but not yet confirmed

**Data files with live seed arrays (should these be empty until owner approves?):**
- `lib/data/journal.ts` — 1 live entry (AI-authored)
- `lib/data/journal-posts.ts` — 3 live entries (AI-authored) — **primary UI data source**
- `lib/data/media.ts` — 9 live photo entries (owner's photos from live site — REAL, low risk)
