# Ready for GO — one sheet, one puzzle piece per row

**Generated:** 2026-05-27 morning · **Site state:** `pnpm build` ✅ · `pnpm test` ✅ 239/239 · 22 routes live · 0 unpushed bugs.

> The framework + every alpaca page is built. What follows is everything that needs YOUR call. Each row has a **default**, an **override action**, and what's **unlocked** if answered. Accept-all-defaults is a valid path — the site ships either way.

---

## Decisions (binary/multi-choice — fastest to answer)

| # | Question | Default | To override | Unlocks |
|---|---|---|---|---|
| **D1** | Reconciliation path A/B/C/D3 (alpaca runtime vs claude-saas-framework) | **D3** (freeze CSF v0.1.1 + ship alpaca as the SaaS) — per probability-storm Monte Carlo, dominates A/B/C on reversibility 8/10 | Tell me "Path A" (merge ~6h), "Path B" (keep separate ~30min docs), or "Path C" (pick one) | All G1-G8 below collapse to whichever path you pick |
| **D2** | Tenant axis (G1) | **All-of-the-above** (subdomain + path + custom CNAME) — same dev cost as one | `tenant.hosts` in `lib/tenants/alpacasibiza.ts` controls which hostnames map | Multi-tenant routing |
| **D3** | Data store (G2) | **JSON-file-per-tenant now, Vercel KV at tenant 30+** — matches ADR 001/011 ladder | Say "Vercel KV now" or "Postgres" if you want to skip the file phase | Tenant registration, secret storage, rate-limit shared state |
| **D4** | Platform billing model (G4) | **Flat monthly tiers** €29 / €79 / €199 (anchored against Wix/Squarespace/Bokun) | Say "per-booking commission" or "hybrid"; flat is simpler to ship | Stripe Billing integration |
| **D5** | Payment provider per tenant (G5) | **Stripe Connect Standard** for clients · `manual-mailto` as zero-config default for tenant 1 | The `stripe-connect` adapter THROWS until you flip the guard in `lib/integrations/payment-stripe-connect.ts` (CLAUDE.md row 36) | Onboarding tenants who need real checkout |
| **D6** | FareHarbor relationship (G6) | **Passthrough only for v1** — keep FareHarbor as booking engine; native replacement is 6-12 month build | Say "native replace" only if you want to invest in that build | Tenant onboarding without FareHarbor TOS engagement |
| **D7** | Language strategy (alpaca) | **Drop IT + FR** until visitor data justifies; default locale stays `en` (international SEO) | Edit `i18n.config.ts` `locales` array | Cleaner sitemap + less translation maintenance |
| **D8** | GTM container (alpaca) | **Single FH container `GTM-KR3CGLS6`** (current state, per c436555 commit) | Edit `app/layout.tsx` to add `GTM-NJRGZPGS` if you want your own primary | Conversion attribution choice |
| **D9** | Adopt-a-Paca pricing | **€75/mo or €900/yr prepaid** (matches live site Tier 2) | Edit `app/[locale]/adopt/page.tsx` price block + Stripe price IDs | Adopt page becomes live revenue |
| **D10** | Cancellation policy text | **"Free cancellation 24h before visit"** (current copy) — must match FareHarbor flow setting | Edit `components/cancellation-badge.tsx` if FH says different | Removes guest-expectation mismatch risk |

---

## Content paste-ins (drop real values into these files; framework handles the rest)

| # | What | Where to paste | UNMAPPED today |
|---|---|---|---|
| **C1** | Founder names + bios + photos | `lib/tenants/alpacasibiza.ts` (extend with `team?: TeamMember[]`) AND `app/[locale]/about/page.tsx` (currently first-names only) | San + Bart surnames; founding year; team bio text |
| **C2** | 14 alpaca bios + portrait photos | `lib/data/alpacas.ts` — fill `bio: string` and `image: string` for each | All 14 entries have `bio: null, image: null` |
| **C3** | Press logos + article URLs | `lib/data/press.ts` — 6 outlets, fill `logoUrl` + `articleUrl` for each | All 6 entries have both null (page auto-upgrades when you fill them) |
| **C4** | Per-tour pricing (4 tour cards) | `OWNER_INPUT_NEEDED.md` lines 19-27 → then paste into `translations/en.json` `tours.*.price` keys | Meet the Herd / Weaving / Farm / Photo — all UNMAPPED |
| **C5** | Yoga details: instructor name, start time, what to bring | `translations/en.json` `yoga.*` keys + a `lib/data/yoga.ts` if you want it as data | 6 UNMAPPED slots in OWNER_INPUT_NEEDED |
| **C6** | Wedding details: prices, alpaca count, travel radius, photographer policy | `translations/en.json` `weddings.*` keys | 9 UNMAPPED slots (page renders "Contact for details" everywhere today) |
| **C7** | Workshop details: price, group size, off-season months | `translations/en.json` `workshops.*` keys | 6 UNMAPPED slots |
| **C8** | Real photos: hero, logo, OG default, team, alpaca portraits | Drop files into `public/images/` matching the paths in tenant config; structured-data + OG image rows auto-light up | 0 photos in `public/images/` today; pages use CSS placeholders preserving layout |
| **C9** | Privacy / Terms / Cookies real legal text | `app/[locale]/{privacy,terms,cookies}/page.tsx` — replace placeholder content (dev-only banner currently visible) | All 3 pages are GDPR-risk placeholders |
| **C10** | Spanish legal: CIF, registered name, full address | `lib/tenants/alpacasibiza.ts` extend; footer reads from tenant | CIF + legal name missing |
| **C11** | Phone number confirmation | `lib/tenants/alpacasibiza.ts` `phoneE164` + `whatsappE164` (currently +32 Belgian — confirm vs Spanish +34) | Either confirm current or paste Spanish number |
| **C12** | Founders + sustainability claims that need verification | `app/[locale]/sustainability/page.tsx` — finca size in hectares UNMAPPED | The "22 natural shades" claim was removed; finca size still UNMAPPED |

---

## External account work (sign-ups; can't be done from code)

| # | What | Time | Triggers downstream |
|---|---|---|---|
| **E1** | Vercel project + DNS for `alpacasibiza.com` | ~30 min | Deployment goes live; cron starts firing weekly digest Mondays 9am |
| **E2** | Resend domain verification (DKIM/SPF on `alpacasibiza.com`) | ~10 min | Outbound emails use `noreply@alpacasibiza.com` instead of Resend default |
| **E3** | Cloudflare Turnstile site registration | ~5 min | Forms get bot protection (currently fail-open dev / unprotected prod per CLAUDE.md row 14) |
| **E4** | FareHarbor Pro API access (`support@fareharbor.com`) | ~1-3 days wait | Live "X spots left" widget + weekly digest with real booking numbers |
| **E5** | FareHarbor 4 per-tour item IDs (in their dashboard) | ~10 min | Per-tour Book Now buttons go from generic calendar to specific tour |
| **E6** | GA4 access for owner (invite OR service account) | ~10 min | Owner sees site traffic (either native GA4 dashboard or custom `/admin/analytics`) |
| **E7** | Google Places API key + Place ID | ~15 min | `GoogleReviewsBadge` lights up with live rating |
| **E8** | Stripe account + Connect Standard | ~30 min | Adopt-a-Paca checkout live; future tenants can be onboarded with their own connected accounts |
| **E9** | GitHub repo + push history | ~5 min | Vercel auto-deploy + CI possible |

---

## What's already done (no action needed)

- **22 routes live**: home, about, tours, contact, alpacas, yoga, gifts, shop (+ woven, commission, alcaca), adopt, press, weddings, workshops, sustainability, privacy, terms, cookies, 3 experiences, catch-all
- **Integration scaffolding**: 7 provider classes (Booking · Email · Captcha · Analytics · Map · Content · Payment) with 18+ concrete adapters; runtime tenant-resolution from request host
- **Failsafes**: 26+ rows in CLAUDE.md (Turnstile asymmetric, webhook fail-CLOSED, escapeHtml on email, safeEqual on secrets, fetchWithTimeout everywhere, validateEnv boot check, in-memory rate limit, Stripe-Connect THROW-GUARDED until tenant 1)
- **ADRs**: 11 captured load-bearing decisions (001-011 + 012 Content + 013 Payment defaults)
- **Tests**: 239/239 across rate-limit, validate-email, validate-env, secrets, html, fetch, webhook-router, content-providers, payment-providers, map-providers, webhook-secret, tenant-theme, tenant-metadata, tenant-validate, plus 8 registry tests
- **Two-tenant proof**: `alpacasibiza` + unregistered `exampleVineyard` (burgundy, Toledo, ES+EN locales) both round-trip through `getProviders(tenant)` returning correct adapters
- **Philosophy-prompting**: 17 catalog entries, hook `005-no-cortex-saves` enforced + `010-agent-read-first` advisory
- **WCAG fixes you applied overnight**: `<html lang={locale}>` per-route, pinch-zoom unblocked
- **Catalogs of stale-doc protection**: PRACTICES.md Rule 11 (Research-Confirm-Test), catalog 008 (re-read after cross-tool mods), catalog 016 (verify fan-out outputs), catalog 017 (sibling-project check)

---

## The actual fastest path to launch (45 min if you accept defaults)

1. **Answer D1** (one-word: A / B / C / D3) — I execute the migration/reconciliation immediately
2. **Drop real values** for C2 (14 alpaca bios) + C3 (press logos) + C8 (hero photo + OG image) into the named files
3. **Sign up E1-E3** (Vercel + Resend domain + Turnstile) — site goes live with placeholder banners visibly removed on prod
4. **Defer everything else** to v1.1 — the framework's failsafes ensure missing items render gracefully (price = "Contact us", missing photos = CSS placeholders, missing API keys = features dark)

Everything else can wait. Site ships with the placeholder banners on legal pages (dev-only — invisible in production), graceful fallbacks for every missing integration, and a working tour-booking flow via FareHarbor.

---

## Files where your answers go

| Answer about… | File |
|---|---|
| Tenant facts (name, contact, address, social, FareHarbor) | `lib/tenants/alpacasibiza.ts` |
| Alpaca herd | `lib/data/alpacas.ts` |
| Press coverage | `lib/data/press.ts` |
| Testimonials | `lib/data/testimonials.ts` |
| Per-page copy / prices | `translations/en.json` + `translations/nl.json` |
| Real photos | `public/images/` (any path the tenant config or page references) |
| Env credentials | `.env.local` (template in `.env.local.example`) |
| Legal copy | `app/[locale]/{privacy,terms,cookies}/page.tsx` |

---

## If you want me to act on any single row

Tell me the row number (D1-D10, C1-C12, or E1-E9) and I'll execute the next concrete step. For multi-row batches, give me the row range. For "accept all defaults," say so and I'll write the launch checklist + Vercel-deploy prep.
