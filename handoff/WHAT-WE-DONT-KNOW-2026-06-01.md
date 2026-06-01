# What We Don't Know (and why)
**Date:** 2026-06-01
**Purpose:** every untested assumption this build carries, classified by why we don't know, with a concrete probe.

Cruz's frame: "every time you think we're done it is in fact not the case." This doc names the gaps explicitly so the next "are we done?" is grounded in evidence rather than the absence of failure.

---

## Why I keep declaring done prematurely

Four blind spot patterns we've now hit repeatedly:

1. **Code-shaped audits miss missing code.** tsc says "all your code is well-typed" — it cannot say "you should have written a /visit page." (Catalog 019.)
2. **Localhost lies.** No CDN, no HTTPS, no real fonts in production, no real GTM, no real email deliverability, no real Lighthouse. (Captured cycle 10 via runtime audit.)
3. **Subagent reports lie.** Sonnets report "tsc clean" when they only built; runtime regressions surface days later. Cycle-11 next-intl migration looked clean for 24 hours before today's runtime probe found the 3 broken endpoints.
4. **Static probe asymmetry.** I check what I built; I don't check what the parallel AI is editing in the same files concurrently.

---

## Assumptions still untested (ranked by what we'd lose if wrong)

### Critical — would block launch

| # | Assumption | Why we don't know | How to probe | Owner action |
|---|---|---|---|---|
| 1 | **Resend will deliver email to Gmail/Outlook** | No real email has ever been sent from this domain. SPF/DKIM/DMARC at One.com are unconfigured. | Send one real welcome email to a personal Gmail. Check spam/inbox. Run `mail-tester.com`. | Run `docs/runbooks/EMAIL_DNS_SETUP.md` then send a test. |
| 2 | **Stripe Checkout opens in production with our session config** | Stripe SDK has only been touched in tests. Live Test Mode never exercised. | Connect Stripe Test keys to Vercel preview, do one full €0.50 test charge end-to-end. | Provide Stripe Test secret + price ID. |
| 3 | **Mollie SEPA mandate flow works end-to-end** | Mollie sandbox has never been hit. 5-day return window has never been observed. | Same — Mollie test API key + one sandbox SEPA flow. | Provide Mollie API key. |
| 4 | **GA4 / GTM fires only after consent on production HTTPS** | Localhost has no real GTM. Our PECR fix is unverified at runtime. | Deploy to Vercel preview + open with browser DevTools Network tab; verify no _ga cookie until consent. | None — I run this once we have a preview URL. |
| 5 | **Withdrawal-waiver copy is legally sound** | The placeholder we shipped is research-derived but never reviewed by a lawyer. EU Directive 2011/83 Art 16(m) waiver validity hinges on exact wording. | EU consumer-law solicitor review (Spain or Belgium). | Forward `components/legal/withdrawal-waiver-checkbox.tsx` text to legal. |

### High — would degrade launch experience

| # | Assumption | Why we don't know | How to probe | Owner action |
|---|---|---|---|---|
| 6 | **Spectral + Cabin actually load in production** | next/font caches at build. Localhost serves uncached. CDN behavior unverified. | Deploy to Vercel preview; view source on `/en`; confirm font-display:swap and no FOUT. | None. |
| 7 | **Pagefind index builds on Vercel `postbuild`** | Localhost has stale `public/_pagefind` from an old build. Vercel build pipeline may or may not run `postbuild`. | Push to Vercel preview, curl `/_pagefind/pagefind.js` from the preview URL. | None. |
| 8 | **OG images unfurl correctly on Twitter/LinkedIn/Slack** | Localhost can't be unfurled by third parties. Per-alpaca OG works in dev now but unfurl rendering across the 4 major platforms is platform-specific. | Twitter Card Validator + LinkedIn Post Inspector + Facebook Debugger + iMessage paste, against the Vercel preview URL. | None (post-deploy). |
| 9 | **Cookie banner v3 doesn't break on mobile Safari iOS 17+** | Tested in Chrome desktop only. iOS Safari has well-known quirks with vh units, position:fixed, and consent UIs. | Open the Vercel preview on a real iPhone, scroll, tap each banner button. | None. |
| 10 | **`/admin/today` is actually usable on a phone** | Designed responsive. Never opened on a phone. Touch targets fixed but flow not walked. | Install the PWA on a real iPhone or Android, walk through what owner would do each morning. | Owner installs once we deploy. |
| 11 | **next-intl sentinel-replacement works for ARRAYS not just strings** | The fix replaces string sentinels but doesn't recurse through array values. Some translations are array-shaped (FAQ items, benefit lists). | Curl `/es/<page with FAQ>`, grep for "__UNTRANSLATED__" in the body. | None. |
| 12 | **All 14 alpaca pages render** | We migrated 14 bios. Crystal-ball confirmed the data exists. We never curl'd `/en/alpacas/<each-slug>` individually to confirm none 404 or 500. | Curl each of the 14 alpaca slug URLs against localhost + Vercel preview. | None. |

### Medium — would frustrate but not block

| # | Assumption | Why we don't know | How to probe |
|---|---|---|---|
| 13 | **Donor PDF receipt renders readably across PDF viewers** | Generated only in localhost dev. Acrobat / Preview / iOS Files / Android PDF viewers each render react-pdf slightly differently. | Generate one against the Vercel preview, open in 3 viewers. |
| 14 | **The 27 URL 301 redirects all fire** | Configured in next.config.mjs. Never curl-verified individually. | A small shell script: curl each of the 27 redirect sources, assert 301 + correct Location header. |
| 15 | **next-intl plural rules render correctly in es/de/fr/it** | We added ICU plurals for 5 keys, but Spanish/German/French/Italian have specific grammar rules (Spanish has only `one`/`other`, German has separate datives, etc.). Untested visually. | Visit /es/alpacas, /de/alpacas, /fr/alpacas, /it/alpacas with different filter counts; eyeball plurals. |
| 16 | **The 17 owner-content placeholders genuinely render hidden in production** | We have `[UNMAPPED]` markers everywhere. Some components conditionally hide; others render the literal marker. Inconsistency unverified. | Curl every page, grep for "UNMAPPED" and "TODO". |
| 17 | **The cycle-12 fixer's "EN has 3 unfilled __UNTRANSLATED__ in legal-disclosure namespace" claim** | Sonnet found this and "fixed" by replacing with empty strings. We never verified what page actually consumes those keys, or whether empty strings render as blank label-value rows on impressum/cookies. | Curl /en/impressum + /en/cookies, look for blank label rows. |
| 18 | **Vercel cron pings hit our routes correctly** | 7 cron entries in vercel.json. None have been hit by Vercel's actual cron infrastructure. | Deploy to Vercel preview, watch Vercel logs for the next 24h, see if any cron fires. |
| 19 | **Skein-checkout `mode: 'payment'` works alongside the adopt subscription** | Both routes use the same Stripe SDK but different modes. We've never had both fire in the same session. | Stripe Test Mode: skein checkout, then back, then adopt checkout. Watch for state interference. |
| 20 | **Birthday cron emails won't accidentally fire on first run** | All 14 alpacas have null birthDate. Cron will scan, find 0 matches, return `{emailsSent: 0}`. We trust this — but the metadata idempotency stamp logic hasn't been tested with real subs. | Owner provides 1 real birth date, sim cron via /admin/birthday-test on that day, verify exactly 1 email sent. |

### Low — would be a polish bug nobody cares about

| # | Assumption | Why we don't know |
|---|---|---|
| 21 | The mobile PWA install prompt appears on Android | We added the manifest but iOS and Android have different install heuristics |
| 22 | Spectral renders italics — we declared the italic style in next/font but haven't visually verified italic prose anywhere |
| 23 | The recover-certificate route's anti-enumeration timing is constant enough to defeat a timing attack |
| 24 | Dynamic OG with very long Spanish/German titles wraps gracefully without overflow |
| 25 | The 8KB cookieconsent JS doesn't push the homepage over a Lighthouse perf threshold |

---

## What I'm explicitly NOT claiming

- **The site is launch-ready.** It's only as launch-ready as Resend + Stripe + Mollie + DNS being configured. Until those land we can't even probe most of the critical row.
- **Every page works.** I claim every page COMPILES. I have not curl-walked all 58 routes today.
- **The translations are correct.** Dutch is verbatim from owner. English is our translation (warm-tone craft business). Other 4 locales are sentinels-replaced-by-EN now, but untested for layout-fit (German text is ~30% longer than English; might break component layouts).
- **No regression from the next-intl migration beyond the 3 we caught.** I only probed 11 surfaces this round. The other ~40 page-routes weren't curl'd individually.

---

## The honest next move

Pre-deploy: nothing more from me genuinely adds confidence. We've hit static-analysis saturation.

The single highest-value next move is **Vercel preview deploy**. Of the 25 assumptions above, **8 become verifiable the moment we have a preview URL** (rows 4, 6, 7, 8, 9, 17, 18, 21, 22, 25) and **5 become verifiable as soon as Stripe Test keys are in** (rows 2, 3, 11, 12, 19). That's 13 of 25 — over half — unblocked by one deploy and a Stripe test-key paste.

Items that still need a human regardless of deploy: 1 (Resend send), 5 (lawyer review of waiver), 10 (real-phone walk), 13 (PDF in 3 viewers), 14 (redirect curl script — I can write this without a deploy), 15 (locale plurals — needs a native speaker eyeball), 20 (owner provides 1 birth date), 23-24 (deferred polish).

If you want me to keep building without a deploy, the things still worth doing are: (14) write the redirect-verifier script, (16) the placeholder-render audit across all 58 routes, and (11) verify next-intl sentinel-replacement handles arrays. Three tight pieces of code-shaped work. Beyond that, more building is filler per catalog 018.
