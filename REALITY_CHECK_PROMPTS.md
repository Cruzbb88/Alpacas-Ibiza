# Reality Check — Re-runnable Prompts

These are the three parallel Sonnet agent prompts that produced `REALITY_CHECK.md`. Fan them out together (same message, three Agent calls), then synthesize with Opus.

**Rule of thumb:** Sonnet for scans, Opus for synthesis (per memory `feedback_model_selection`).

---

## Agent 1 — Live site crawl

**Description:** Crawl live alpacasibiza.com fully
**Type:** general-purpose
**Model:** sonnet

```
You are profiling the LIVE alpaca farm website at https://www.alpacasibiza.com/ so I can diff it against a Next.js redesign that's being built locally.

Crawl every page you can reach from the homepage (About/Wie zijn wij, What We Do, Media, Weaving Informatie, Weaving Collection, Alpacas pages, Activities subpages — Weddings, Adoption, Yoga, Workshops, Business incentives, Contact, both language versions). Use WebFetch on each URL.

For each page record (in markdown):
- URL
- Page purpose in one line
- Primary language(s) and whether a translation exists
- Headline + sub-headline copy (verbatim, short)
- Main CTAs (text + destination)
- Content sections present
- Any product, price, or e-commerce element
- Any booking widget / FareHarbor presence (capture iframe URL if visible)
- Any forms

Then at the end, give a global summary section:
- Platform (Squarespace confirmed, but note any plugins/widgets — Mailchimp, FareHarbor, embedded shop, etc.)
- Language strategy: which is primary, what's translated vs not
- Conversion model: what does this site actually push (bookings? newsletter? inquiries?)
- Activity taxonomy: full list of distinct activities/experiences offered
- Products: is there ANY e-commerce, or only experiences? Any mention of alpaca manure / Alcaca / "Oro Negro"?
- Trust signals visible (testimonials, press, partners, certifications)
- Notable absences (no shop? no pricing? no team page?)

Be concrete and verbatim where possible. Report under 1500 words.
```

---

## Agent 2 — Competitor profile

**Description:** Find & profile area competitors
**Type:** general-purpose
**Model:** sonnet

```
You are scouting competitor / peer websites for an Ibiza alpaca farm (alpacasibiza.com) so we can pressure-test the assumptions in a Next.js redesign we're building.

Use WebSearch + WebFetch to find and profile 8-12 sites across these buckets:
1. Other alpaca farms in Spain or nearby (Mallorca, mainland Spain, southern France, Portugal). 2-3 sites.
2. Alpaca/llama farms internationally that have strong e-commerce (UK, US, Netherlands, Germany). 2-3 sites — we want to see what mature alpaca e-commerce looks like.
3. Ibiza agritourism / farm experience sites (anything offering tours, yoga, weddings, workshops on the island). 2-3 sites.
4. Sites selling alpaca manure / "Oro Negro" / poo pellets as a product. 1-2 sites — does anyone actually run this as a real e-commerce category?

For each site capture (in markdown, one block per site):
- Name + URL
- Platform if detectable
- Primary language(s) and translation strategy
- Top-level nav
- Conversion model: bookings? product sales? leads? donations? mix?
- E-commerce presence: none / single product / full catalog / which platform
- Booking system if any (FareHarbor / Bokun / native / etc)
- Pricing transparency
- Activities offered
- Standout pages or features worth stealing
- One-line takeaway

At the end, give a synthesis section:
- Common patterns across peers
- Outliers worth studying
- Does anyone successfully sell alpaca manure direct-to-consumer? If yes, how is it packaged/priced?
- Language strategy norms in this niche
- Platform norms

Be specific with real URLs. Report under 2000 words.
```

---

## Agent 3 — Local assumption audit

**Description:** Audit redesign's encoded assumptions
**Type:** Explore
**Model:** sonnet

```
Audit a local Next.js redesign at C:\Users\cruzb\projects\alpaca-farm-redesign and extract the ASSUMPTIONS it encodes about the business.

Read these specifically:
- README.md, INTEGRATION_CHECKLIST.md, PROJECT_SUMMARY.md, MULTILINGUAL_SUMMARY.md, I18N_SETUP.md, TRANSLATION_GUIDE.md, QUICK_REFERENCE.md
- i18n.config.ts, middleware.ts
- app/layout.tsx, app/page.tsx
- Every route page.tsx under app/
- components/header.tsx, footer.tsx, hero.tsx, choice-paths.tsx
- translations/ directory contents

Produce a single markdown report titled "Redesign Assumptions" documenting:

1. Pages & routes — full list
2. Languages — configured, default, which have translation files
3. Conversion model — what is pushed, in what priority order. Quote README verbatim.
4. E-commerce assumptions — what products, what prices appear in code
5. Activity taxonomy — what activities are mentioned
6. Hero copy & value prop — verbatim
7. Trust signals — testimonials, certifications, ratings hardcoded
8. Third-party integrations in code — FareHarbor, Stripe, GA4, SendGrid, Supabase — distinguish "placeholder/scaffolded" vs "actually wired up"
9. Hardcoded business facts — location, contact info, team names, what's filled vs placeholder

Be verbatim with quotes and file:line refs. Report under 1500 words.
```

---

## Synthesis step (Opus)

After all three Sonnet agents return, Opus produces `REALITY_CHECK.md` by:

1. Diffing redesign **routes** against live-site routes (find missing pages, invented pages, renamed pages)
2. Diffing redesign **pricing** against live + competitor prices (flag UNMAPPED where redesign has prices and live has none)
3. Diffing **language strategy** (configured vs. live primary vs. peer norms)
4. Diffing **conversion priority order** (README vs. home page render vs. live site)
5. Reconciling **integration status** (docs claims vs. code reality)
6. Tagging each gap 🔴 Blocker / 🟡 Decision / 🟢 Cosmetic
7. Ending with a numbered "needs owner decision" list

Don't pad. The synthesis exists to surface what San/Bart needs to decide — not to summarize the inputs.
