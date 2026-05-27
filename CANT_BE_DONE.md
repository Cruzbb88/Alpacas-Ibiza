# Genuine Limits — Things Not To Re-Attempt

Each entry cites the specific session and what's missing. The point: future sessions stop trying these from a single-session local read, and route them to the owner / a setup step / a deployment instead.

**Format:** see [.claude/skills/philosophy-prompting/SKILL.md](.claude/skills/philosophy-prompting/SKILL.md) "CAN'T_BE_DONE.md format" section.

---

## Limit: Cortex history queries
- **Captured:** 2026-05-26
- **Why it can't be done:** Project rule `feedback_no_cortex_saves` forbids using Cortex. Skills that depend on stored memories (crystal-ball L3 Decision Pattern Predictor, task-radar, brainstorm history, decision-decay tracking) lose statistical grounding without it.
- **What to do instead:** Run skills in degraded local-file mode. Treat their cross-session intelligence outputs as estimates, not statistics.
- **Re-check trigger:** Owner lifts the no-Cortex policy for this project, OR a local-file Cortex shim is built (≈50 LOC).

## Limit: Live runtime verification of GA4 / GTM events
- **Captured:** 2026-05-26
- **Why it can't be done:** Requires production deploy + GTM Preview mode + browser-side gtag observation. Single-session local read can confirm script tags + IDs exist; cannot confirm events fire.
- **What to do instead:** Verify code shape (IDs present, scripts loaded, consent gate wired). Document "live verification deferred to staging deploy."
- **Re-check trigger:** First Vercel preview deploy + owner opens GTM Preview mode + tag fires confirmed.

## Limit: FareHarbor API operations (availability, item IDs, booking export)
- **Captured:** 2026-05-26
- **Why it can't be done:** Requires FareHarbor Pro plan API credentials (`FAREHARBOR_APP_KEY`, `FAREHARBOR_USER_KEY`). Public embed (FLOW=1257173 shortname=alpacasibiza) is the only readable surface.
- **What to do instead:** Build code paths that fail-quiet when credentials absent (already the pattern at `app/api/availability/route.ts:11-19` and `app/api/google-reviews/route.ts:41-46`). Document the credential need in OWNER_INPUT_NEEDED.md ⚠️.
- **Re-check trigger:** Owner emails `support@fareharbor.com` requesting API access; keys provisioned and added to `.env.local`.

## Limit: Admin credential exposure check on deployed environment
- **Captured:** 2026-05-26
- **Why it can't be done:** Requires Vercel dashboard read access. Default `ADMIN_USERNAME=admin / ADMIN_PASSWORD=password` is hard-coded as a fallback per `INTEGRATION_STATUS_2026-04-20.md:13` — only the deployed env vars determine whether prod is safe.
- **What to do instead:** Code already throws unsafe-default warnings at startup via `lib/validate-env.ts`. Block deploys via a CI check that fails when prod env has the literal "password" string. Surface as an OWNER_INPUT ⚠️ item until verified.
- **Re-check trigger:** Owner shares a redacted env-var inventory from Vercel dashboard, OR a pre-deploy hook is added.

## Limit: Exact hex/font values from live site or competitors
- **Captured:** 2026-05-26
- **Why it can't be done:** alpacasibiza.com (Squarespace), canmarti.com, atzaro.com all bundle CSS via injected stylesheets that WebFetch cannot resolve. `themeColor` and `:root` variables in static HTML are unreachable.
- **What to do instead:** Sample what is readable (favicon URL, og:image, og:type signals); for hex values, defer to owner or instruct owner to run DevTools color picker. Capture in `OWNER_INPUT_NEEDED.md`.
- **Re-check trigger:** Owner pastes 3-5 hex values from their brand spec, OR a Playwright-style headless browser session becomes available.

## Limit: Image asset existence in `public/`
- **Captured:** 2026-05-26
- **Why it can't be done:** Tool environment can list filenames but not always confirm visual content; some referenced images (`hero-alpacas.webp`, `sunset-bg.jpg`) are written as placeholders in code with no file backing.
- **What to do instead:** Render UNMAPPED sentinels in components that depend on missing images (e.g. PressLogos's null `logoUrl` pattern). Don't attempt to generate replacement images.
- **Re-check trigger:** Owner drops files into `public/images/` and references in code switch from `null` → URL.
- **LCP note (2026-05-27):** Hero background image missing — UNMAPPED placeholder rendered. Two callers reference `/images/corporate-hero.webp` and `/images/family-hero.webp` (experiences pages). Neither file exists in `public/`. The `<Image>` component in `hero.tsx` now handles the LCP pipeline correctly when a file IS supplied; the component will simply skip the `<Image>` render and fall back to the CSS gradient until the owner drops real files into `public/images/`.

## Limit: Git churn / blame history
- **Captured:** 2026-05-26
- **Why it can't be done:** The `alpaca-farm-redesign` workspace has no `.git/` directory at the session root. `git log --follow` and `git blame` are unavailable. Matrix-reload's "frequently-touched" pain heuristic falls back to file size + complexity proxies only.
- **What to do instead:** Use static signals (LOC, import depth, comment density, hex-vs-token usage) instead of churn. Note the missing churn dimension in matrix-reload reports.
- **Re-check trigger:** `git init` is run + the repo is committed; OR a non-trivial git history is imported from the project's actual origin.

## Limit: DOM-level interaction on authenticated third-party admin (FareHarbor, Stripe, Vercel)
- **Captured:** 2026-05-26
- **Why it can't be done:** Requires owner-only authenticated browser session + DevTools access. Cannot run from a script context.
- **What to do instead:** Generate paste-ready browser console scripts with explicit TODO_SELECTOR markers (see W1.3 `/devtools-extract` template at `reports/devtools-extract/de-001-2026-05-26-fareharbor-bookings.md`). Owner inspects + fills + runs.
- **Re-check trigger:** N/A — this is permanently delegated to owner per security model.

## Limit: Lighthouse / Core Web Vitals measurement
- **Captured:** 2026-05-26
- **Why it can't be done:** Requires deployed URL + Chrome / WebPageTest / GA4 Web Vitals API. Code shape can be inspected (script strategies, image components, font-display); actual FCP/LCP/CLS scores cannot.
- **What to do instead:** Apply known Next.js perf patterns (Spec 008: demote `beforeInteractive`, use `next/image`); document the perf hypothesis; defer measurement to first Vercel preview.
- **Re-check trigger:** Vercel preview deploys + Lighthouse runs in CI on the preview URL.

## Limit: Decision-decay scoring from historical Cortex memories
- **Captured:** 2026-05-26
- **Why it can't be done:** Crystal-ball's L3 Decision Pattern Predictor and decay detection require N≥5 prior sessions in Cortex with decision metadata. No-Cortex policy + first session = zero historical data.
- **What to do instead:** Estimate decay heuristically (date in ADR frontmatter, count of references, recency of related code edits). Mark crystal-ball reports as "decay estimated, not statistical" until histogram exists.
- **Re-check trigger:** 5+ crystal-ball reports exist locally + a local-file shim implements basic decay queries, OR Cortex policy is lifted.

## Limit: Brand-color owner lock (tenant config cannot ship as canonical)
- **Captured:** 2026-05-27
- **Why it can't be done:** The tenant config schema (`tenants/alpacasibiza/config.json`, per sb-001) requires `brand.primaryColor` and `brand.accentColor` as hex values. The live site's Squarespace CSS is unresolvable by WebFetch (see "Exact hex/font values" limit above). Without confirmed hex values, the config cannot be committed as canonical — a placeholder ships and operators copy wrong colors.
- **What to do instead:** Leave `brand.primaryColor: "UNMAPPED"` and `brand.accentColor: "UNMAPPED"` in the tenant config. Do not guess or sample colors from images. Document the gap in OWNER_INPUT_NEEDED.md.
- **Re-check trigger:** Owner pastes confirmed hex values from their brand spec (see "Exact hex/font values" limit above — same trigger).

## Limit: Domain DNS coordination for Vercel cutover
- **Captured:** 2026-05-27
- **Why it can't be done:** Cutting over `alpacasibiza.com` from current Squarespace hosting to Vercel requires the owner to update nameservers or A/CNAME records at their domain registrar. DNS TTL propagation (15 min–48 hr) and Squarespace's live booking state during cutover cannot be managed from a Claude session.
- **What to do instead:** Write a step-by-step cutover runbook (add domain in Vercel → copy DNS records → lower TTL 24h before → switch at low-traffic window → verify cert provisioning). Keep the runbook in `docs/deploy/cutover.md`.
- **Re-check trigger:** Owner confirms DNS records updated and Vercel cert shows "Valid" for `alpacasibiza.com`.

## Limit: Stripe product / price ID creation for Adopt-a-Paca tiers
- **Captured:** 2026-05-27
- **Why it can't be done:** `STRIPE_ADOPT_PRICE_ID_MONTHLY` and `STRIPE_ADOPT_PRICE_ID_YEARLY` must be created in the tenant's Stripe dashboard. The correct amounts are €75/mo or €900/yr (live-verified). Creating live Stripe products requires an authenticated Stripe account session.
- **What to do instead:** Document the exact steps (Stripe Dashboard → Products → Add product → recurring price → copy Price ID → paste into Vercel env var). The code path is fail-open for missing IDs (Checkout returns 503; adopt CTA falls back to mailto). Mark env vars as OWNER_INPUT in CLAUDE.md Tier 2 list (already there).
- **Re-check trigger:** Owner creates the two Stripe Price objects and sets `STRIPE_ADOPT_PRICE_ID_MONTHLY` + `STRIPE_ADOPT_PRICE_ID_YEARLY` in Vercel env vars.

---

## How this list grows

The `philosophy-prompting` skill's `impossible` mode appends to this file. When a session hits a wall, run:

```
/philosophy-prompting impossible <one-line-limit>
```

Required entries: Captured date, Why, What to do instead, Re-check trigger. No entry without all 4.

## How this list shrinks

Re-check triggers are explicit. When a trigger is met (e.g., `git init` is run), the matching entry is moved to a `retired/` section with the resolution date. Don't delete — preserve the institutional memory.
