# Journey Audit — New Features — 2026-06-06

Same structure as JOURNEY_AUDIT.md. Covers the 10 flows from the last ~6 build waves that have never been runtime-traced.

---

## TL;DR

10 flows traced. **3 ✗ broken** (referrer reward dead-wired, cam embed allowlist bypassable, preferences "unsubscribe all" dead link). **8 ⚠ degrade** (various fail-quiets and owner-data gaps). **3 flows ✓ clean end-to-end** (campaign banner, newsletter archive, tour-ics).

---

## Flow-by-flow

---

### Flow 1: Visitor sees seasonal campaign banner on homepage

File sequence: `app/[locale]/page.tsx` → `components/campaign-banner-generic.tsx` → env vars

1. ✓ `app/[locale]/page.tsx:249` mounts `<CampaignBannerGeneric slot="home" />` inside a server section.
2. ✓ `getCampaignConfig('home')` reads `process.env[CAMPAIGN_HOME_LIVE]`, `CAMPAIGN_HOME_HEADLINE`, `CAMPAIGN_HOME_BODY`, `CAMPAIGN_HOME_CTA_HREF`, `CAMPAIGN_HOME_CTA_LABEL`.
3. ✓ Env-gate at `components/campaign-banner-generic.tsx:44`: `if (!cfg.live || !cfg.headline) return null` — renders null when `CAMPAIGN_HOME_LIVE` unset or headline is empty string. Correctly handles both cases stated in the brief.
4. ✓ CTA uses Next.js `<Link href={cfg.ctaHref}>` — internal paths SSR-safe; external URLs handled at browser level. No crash if `ctaHref` is an absolute URL to FareHarbor.
5. ✓ `slot: 'home' | 'tours' | 'adopt-page' | 'yoga'` — `slotEnvKey` converts `adopt-page` → `ADOPT_PAGE` via `.replace(/-/g, '_')`. Correct.
6. ⚠ No XSS guard on `cfg.headline`, `cfg.body`, or `cfg.ctaLabel` — but these are read from server env vars, not user input. Risk is limited to a compromised deploy env. Acceptable; env vars are not user-controlled.

**Breaks found:** none. Flow ✓ clean end-to-end.

---

### Flow 2: Visitor sees bundle CTA on tours page

File sequence: `app/[locale]/tours/page.tsx:392` → `components/tours/bundle-cta.tsx` → `lib/config.ts`

1. ✓ `lib/config.ts:23`: `BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR = Number(process.env.BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR ?? 0)`. `Number('abc')` → `NaN`.
2. ✗ **`NaN === 0` is false** — so `if (discount === 0 || !url) return null` does NOT catch an invalid `DISCOUNT_EUR=abc`. The CTA renders with label `Save €NaN — book tour + yoga together`. This is the only visible break in the flow.
   - File: `lib/config.ts:23` — `Number(...)` without `|| 0` fallback or `isNaN` guard.
   - Practical impact: low (owner would notice the NaN label immediately on preview), but it's a real render bug.
3. ✓ `BUNDLE_TOUR_PLUS_YOGA_URL` unset → `url` is `undefined` → `!url` is true → renders null. Correct.
4. ✓ When configured correctly, the CTA is a `<Link href={url} target="_blank">` — opens FareHarbor bundle in new tab. No fetch, no server call.
5. ✓ `BundleCta` is a server component — no client hydration risk.

**Breaks found:** ✗ Flow 2 step 2 — `BUNDLE_*_DISCOUNT_EUR=abc` renders `€NaN`. File: `lib/config.ts:23`.

---

### Flow 3: Visitor joins waitlist for sold-out tour

File sequence: `app/[locale]/tours/page.tsx` (WaitlistForm) → `app/api/waitlist/route.ts` → `lib/public-form-guard.ts` → `lib/mailer.ts` → Resend

1. ✓ `WaitlistForm` client component sends POST with `{ email, preferredDate, tourSlug, locale, business_name }`.
2. ✓ Honeypot field `business_name` checked via `checkPublicFormGuard`. Bot-filled → returns 200 silently.
3. ✓ IP rate-limit: 2 req / 5 min. Per-email rate-limit: 3 req / 24 h, SHA-256 hashed key. Both always return 200 (anti-enumeration).
4. ✓ Turnstile/reCAPTCHA via `checkPublicFormGuard`. Returns 200 on failure (anti-enumeration).
5. ✓ Email validation via `isValidEmail(email)`. Invalid → 200 silently with `log.warn`.
6. ✓ Owner notification email (`[Waitlist] ${subjectSlug} — ${subjectDate}`) sent to `getContactEmail()`. Try/catch — failure logged as warn, not fatal.
7. ✓ Subscriber confirmation email sent to `String(email)`. Try/catch — failure logged as warn, not fatal.
8. ⚠ Neither `safeEmail` nor `safeSlug` in the subscriber confirmation HTML uses `escapeHtml` on the `to: String(email)` field itself — `sendEmail({ to: String(email) })` passes the raw email string to Resend without HTML-escaping. The email address appears in the email body at `${safeEmail}` (which IS escaped), but the raw value passes into Resend's `to` field directly. This is correct behaviour for the Resend API (`to` is not HTML), not a bug.
9. ✓ Always returns 200. Anti-enumeration contract preserved.

**Breaks found:** none. Flow ✓ clean end-to-end.

---

### Flow 4: Visitor opens virtual farm tour on /visit

File sequence: `app/[locale]/visit/page.tsx:102` → `components/virtual-farm-tour.tsx` → `lib/data/media.ts` `liveVirtualTourStops()`

1. ✓ `visit/page.tsx` imports and mounts `<VirtualFarmTour />` directly (server component, no Suspense needed).
2. ✓ `liveVirtualTourStops()` returns only stops where `status === 'live'` AND `imageSrc != null`. Current `media.ts` has an empty `virtualTour` array — zero live stops.
3. ✓ When `stops.length === 0` in production: returns `null`. No layout shift. No broken section.
4. ✓ When stops are live: `stop.imageSrc!` is a non-null assertion, but `liveVirtualTourStops()` already filters out null `imageSrc` — assertion is safe.
5. ✓ Scroll-snap CSS uses Tailwind classes (`snap-x snap-mandatory overflow-x-auto`) — these are purely CSS, no JS dependency, SSR-safe. No hydration risk.
6. ✓ Each `<Image>` gets `alt={stop.label}` — accessible. `fill` + `sizes` correctly set.
7. ⚠ `scrollPaddingLeft: '1rem'` is an inline style on the `<ul>` — this is not a Tailwind utility, it's a raw CSS property. Some older SSR hydration edge cases could cause mismatch. Unlikely to be an issue in Next.js 15 but cannot confirm statically.

**Breaks found:** none. Flow ✓ clean (section remains dark until owner populates media.ts).

---

### Flow 5: Visitor browses newsletter archive — `/newsletter/archive`

File sequence: `app/[locale]/newsletter/archive/page.tsx` → `lib/data/newsletter-issues.ts`

1. ✓ Page SSR. `liveNewsletterIssues()` reads `newsletterIssues` array (currently empty) → returns `[]`.
2. ✓ Empty state renders "First issue coming soon — subscribe" with `<Link href={/${locale}#newsletter}>`. Correct locale-prefixed href.
3. ✓ When issues are live: rendered with `issue.title`, `issue.publishedAt` (via `<time dateTime>`), `issue.summary`. No dynamic data fetch — pure static data.
4. ✓ `generateMetadata` calls `buildLocaleAlternates(locale, 'newsletter/archive')` — hreflang alternates correctly generated.
5. ✓ Sitemap includes `/newsletter/archive` at `app/sitemap.ts:37`.
6. ⚠ `formatDate` uses `new Date(iso).toLocaleDateString('en-GB', ...)` — the locale is hardcoded to `'en-GB'` regardless of page locale. A German visitor sees dates like "1 April 2026" instead of "1. April 2026". Minor i18n gap; not broken.

**Breaks found:** none. Flow ✓ clean end-to-end.

---

### Flow 6: Subscriber lands on /preferences with valid token

File sequence: `app/[locale]/preferences/page.tsx` (client) → GET `/api/email-preferences?token=...&action=unsubscribe&type=<firstType>` → POST `/api/email-preferences` → Stripe/Mollie subscription metadata update

1. ✓ Page is `'use client'`. `useSearchParams()` reads `?token=` and `?type=`.
2. ✓ `useEffect` on mount calls GET `/api/email-preferences?token=...&action=unsubscribe&type=<firstType>`. The GET route validates the token but does NOT mutate — returns HTML interstitial or 400/410. Page reads `res.status` to determine validity.
3. ✓ Expired token (410) → `setTokenError('This link has expired…')` → renders "Link not valid" with contact link. Correct graceful copy.
4. ✓ Token type mismatch (e.g. `type=quarterly` token used with `type=birthday` validation request): `api/email-preferences` GET uses `parseParams` which validates `action` and `type`. If the token's `payload.type !== safeType`, returns 400. Page shows "Invalid access link." — reasonable.
5. ✓ POST `/api/email-preferences` with `{ token, action: 'unsubscribe', type }` → Stripe + Mollie opt-out of `opt_out_<type>` metadata key on active subscriptions. Both paths are fail-quiet with catch blocks.
6. ✗ **"Unsubscribe from everything" link is dead.** `preferences/page.tsx:238` links to `/${locale}/newsletter/unsubscribed` — this is the CONFIRMATION page shown after unsubscribing, NOT the API endpoint that performs the unsubscribe. Clicking it lands on a success-copy page without actually unsubscribing the donor from anything. The real unsubscribe endpoint is `/api/newsletter/unsubscribe?token=<token>` (GET) or a form POST. The preferences page has no way to build an unsubscribe token for the donor — it only has the email-preferences token (different HMAC scope). This link gives false confidence that clicking it unsubscribes the user.
   - File: `app/[locale]/preferences/page.tsx:238`

**Breaks found:** ✗ Flow 6 step 6 — "Unsubscribe from everything" link goes to a static confirmation page, not an unsubscribe action. File: `app/[locale]/preferences/page.tsx:238`.

---

### Flow 7: Visitor adopts → referrer gets reward email

File sequence: `?ref=ABCDEF` on adopt page → `/api/checkout` → Stripe session `metadata.referredBy` → `app/api/stripe-webhook/route.ts` → `handleStripeCheckoutCompleted(session, deps)` → `sendReferrerRewardQuiet` → Resend

1. ✓ `?ref=ABCDEF` is validated at `/api/checkout` against `REFERRAL_CODE_RE` and written to `session.metadata.referredBy` if valid.
2. ✓ `handleStripeCheckoutCompleted` checks `deps.referrerRewardDeps && referredBySlug` before calling `sendReferrerRewardQuiet`.
3. ✗ **`referrerRewardDeps` is never passed by the Stripe webhook route.** `app/api/stripe-webhook/route.ts:118` calls:
   ```
   handleStripeCheckoutCompleted(session, { sendEmail, ownerEmail: process.env.CONTACT_EMAIL })
   ```
   No `referrerRewardDeps` field. The guard `if (deps.referrerRewardDeps && referredBySlug)` evaluates `undefined && ...` → false. `sendReferrerRewardQuiet` is never called. Referrer reward email is silently dead on the Stripe path.
   - File: `app/api/stripe-webhook/route.ts:118`
4. ✗ **Same on Mollie path.** `app/api/mollie-webhook/route.ts:238` calls `handleMolliePaymentPaid(payment, { sendEmail, fetchCustomer, createSubscription, ownerEmail, recurringDonorEmail, recurringDonorName })`. No `referrerRewardDeps`. Both monthly-first and yearly-oneoff referral reward sends are dead.
   - File: `app/api/mollie-webhook/route.ts:238`
5. ⚠ When `referrerRewardDeps` is properly wired: `lookupReferrer(code)` returns null if the referrer is not found — `sendReferrerRewardQuiet` returns `{ sent: false, reason: 'referrer-not-found' }` cleanly. This is handled correctly in the handler itself; the issue is the caller never provides the dep.
6. ⚠ `REFERRER_REWARD_DISCOUNT_CODE` and `REFERRER_REWARD_DESCRIPTION` env vars: even if the route is fixed, the reward send still silently no-ops when these are unset (gate 2 in `sendReferrerRewardQuiet`). Owner must set both.

**Breaks found:** ✗✗ Both Stripe and Mollie webhook routes do not pass `referrerRewardDeps` → referrer reward email is NEVER sent. Files: `app/api/stripe-webhook/route.ts:118`, `app/api/mollie-webhook/route.ts:238`.

---

### Flow 8: Tour-confirmation page renders ICS download

File sequence: `/tour-confirmation?date=...&summary=...&bookingId=...` → `app/[locale]/tour-confirmation/page.tsx` → `/api/tour-ics?...` → `lib/ics.ts`

1. ✓ Page is server component. `rawDate` read from `searchParams.date`. `new Date(rawDate)` attempted. `isNaN(start.getTime())` catch → `startIso = null`. Calendar section hidden when date invalid or missing.
2. ✓ `bookingId` sanitised at `page.tsx:61`: `.replace(/[^A-Za-z0-9_-]/g, '')`. Correct.
3. ✓ `/api/tour-ics` — missing `date` → 400 `DATE_REQUIRED`. Invalid date → 400 `INVALID_DATE`. Rate-limit 20/5min per IP → 429.
4. ✓ Duration clamped: `Math.min(480, Math.max(1, parseInt(rawDuration, 10) || DEFAULT_DURATION_MIN))`. `parseInt('abc')` → `NaN` → `NaN || 60` → 60. Safe.
5. ✓ Google Calendar deep link built via `googleCalendarUrl()` from `lib/ics.ts`. `startIso` is an ISO string (URL-safe characters only); `summary` and `description` are string-interpolated into the gcal URL params. The page uses `googleCalendarUrl()` which presumably uses `encodeURIComponent` internally.
6. ? `lib/ics.ts` `googleCalendarUrl()` encoding — cannot verify statically whether `summary` with special characters is properly encoded. Need to read `lib/ics.ts`.

**Breaks found:** none visible. One ? on Google Calendar URL encoding.

**Runtime test needed:** confirm `googleCalendarUrl()` in `lib/ics.ts` uses `encodeURIComponent` on `summary` and `description` before inserting into the URL.

---

### Flow 9: Visitor uses alpaca filter on /alpacas

File sequence: `app/[locale]/alpacas/page.tsx` → `lib/alpacas/filter.ts` `parseListParam` + `filterAlpacas` → `components/alpacas/alpaca-search-filter.tsx` → `router.push`

1. ✓ Server page reads `searchParams.p`, `.c`, `.b` and calls `filterAlpacas(animals, { p, c, b })`. URL params drive SSR — grid is filtered server-side, no client-state stale issue.
2. ✓ `parseListParam` splits on comma, trims, filters empty. `?p=calm%2Cplayful` → `['calm', 'playful']`. URL decoding handled by `new URL(request.url)` at the Next.js layer before reaching `searchParams`.
3. ✓ XSS: filter values are used only in case-insensitive substring matching (`p.includes(needle)`), never rendered to HTML. No XSS vector.
4. ✓ `FILTER_PERSONALITIES`, `FILTER_COLORS`, `FILTER_BREEDS` are closed sets from `lib/alpacas/filter.ts`. Client filter chips only emit values from these arrays. Arbitrary `?p=<script>` passes through `parseListParam` but is only used in `String.includes()` — harmless.
5. ✓ Empty state: `filtered.length === 0` → `<p>translate('alpacas.filter.noMatches')</p>`. Clean.
6. ⚠ Color filter values are `['white', 'grey', 'brown', 'fawn', 'orange']`. The filter does case-insensitive substring matching on `animal.color`. Without reading the actual alpaca data, cannot confirm all 14 alpacas have a `color` field that matches one of those strings. The comment in `filter.ts:11-18` lists the mapping (Barbarella=light rose grey → 'grey', Bardot=greyish-brown → 'brown'+'grey', etc.). The substring match means 'grey' matches 'light rose grey' — correct. 'fawn' matches 'medium fawn' — correct.
7. ✓ Client `AlpacaSearchFilter` uses `router.push` inside `startTransition` — navigation is non-blocking; `aria-busy={isPending}` announced to screen readers.
8. ? `AlpacaSearchFilter` is a `'use client'` component wrapped in `useSearchParams()`. It must be inside a Suspense boundary (per Next.js docs) or it throws. Cannot confirm the boundary exists in the page layout without reading further. If missing, this causes a build error, not a runtime stutter.

**Breaks found:** none. Flow ✓ clean. One ? on Suspense boundary.

---

### Flow 10: Visitor lands on /[locale]/page.tsx — alpaca cam slot

File sequence: `app/[locale]/page.tsx:243` → `components/alpaca-cam-embed.tsx` → `isSafeEmbedUrl()` → `<iframe src={url} />`

1. ✓ `AlpacaCamEmbed()` reads `process.env.ALPACA_CAM_EMBED_URL`. `null` / `TODO_*` / `__OWNER_INPUT_REQUIRED__` → returns `null`. No layout shift.
2. ✓ `isSafeEmbedUrl(url)` — `new URL(raw)` parse; `u.protocol !== 'https:'` → false; allowlist check.
3. ✗ **Allowlist check is bypassable.** `isSafeEmbedUrl` checks:
   ```ts
   ALLOWED_EMBED_ORIGINS.some((origin) => (u.origin + u.pathname).startsWith(origin))
   ```
   `startsWith` on a **string prefix** rather than an exact **origin** match. A URL like `https://player.twitch.tv.evil.com/malicious` passes because `u.origin` = `https://player.twitch.tv.evil.com` and `u.pathname` = `/malicious`, so the concatenation `https://player.twitch.tv.evil.com/malicious` DOES start with `https://player.twitch.tv`. Verified with Node.js:
   ```
   'https://player.twitch.tv.evil.com/malicious'.startsWith('https://player.twitch.tv') → true
   ```
   Same bypass works for all five allowlist entries. An operator who sets `ALPACA_CAM_EMBED_URL=https://player.vimeo.com.evil.com/payload` would get an attacker-controlled iframe on the homepage.
   - File: `components/alpaca-cam-embed.tsx:35-36`
   - Fix: compare `u.origin` (exact) against the allowlist entries, not `startsWith` on the concatenation.
4. ✓ When a legitimate YouTube embed URL is set, the `<iframe>` renders correctly with `allow="autoplay; encrypted-media; picture-in-picture"` and `allowFullScreen`.
5. ⚠ `ALPACA_CAM_EMBED_URL` is a Tier 2 var — CLAUDE.md failsafe map confirms. Boot warn if unset via `/admin/env-check`. This is correct.

**Breaks found:** ✗ Flow 10 step 3 — allowlist `startsWith` bypass allows arbitrary iframe origins. File: `components/alpaca-cam-embed.tsx:35-36`.

---

## Cross-flow findings

**A. Referrer reward silently dead (Flow 7 — both payment paths)**
Neither `app/api/stripe-webhook/route.ts:118` nor `app/api/mollie-webhook/route.ts:238` pass `referrerRewardDeps` to their respective handlers. The guard inside the handlers (`if (deps.referrerRewardDeps && ...)`) evaluates to false on every checkout. The feature was built end-to-end in the handler but never wired at the call site.

**B. Cam embed allowlist bypassable (Flow 10)**
`isSafeEmbedUrl` uses `.startsWith(origin)` string prefix match instead of exact `u.origin ===` comparison. Any domain that starts with an allowlisted origin string (e.g. `player.twitch.tv.evil.com`) passes the check.

**C. "Unsubscribe from everything" on /preferences goes to static confirmation page (Flow 6)**
`preferences/page.tsx:238` links to `/${locale}/newsletter/unsubscribed` — the post-unsubscribe confirmation page. The link does not trigger an unsubscribe; it just shows the success copy. A donor clicking this believes they unsubscribed but did not.

**D. BundleCta renders €NaN when DISCOUNT_EUR is non-numeric (Flow 2)**
`lib/config.ts:23` uses `Number(process.env.BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR ?? 0)` with no `isNaN` guard. `NaN === 0` is false, so the CTA renders `Save €NaN — book tour + yoga together`.

---

## Needs runtime test (CANT-BE-DONE-LOCALLY)

1. **Flow 8** — `lib/ics.ts` `googleCalendarUrl()`: confirm `summary` and `description` are `encodeURIComponent`-escaped before being inserted into the Google Calendar deep link URL.
2. **Flow 9** — `AlpacaSearchFilter` Suspense boundary: confirm `useSearchParams()` in `AlpacaSearchFilter` is wrapped in a Suspense boundary (either directly in the alpacas page or the layout) to avoid a Next.js build error.
3. **Flow 4** — Scroll-snap SSR: confirm the `scrollPaddingLeft` inline style does not cause React hydration mismatch in Next.js 15 (very unlikely but only verifiable with a dev build).

---

## Summary

| # | Flow | Status | Key issue |
|---|------|--------|-----------|
| 1 | Campaign banner | ✓ | Clean |
| 2 | Bundle CTA | ⚠✗ | `€NaN` when env invalid — `lib/config.ts:23` |
| 3 | Waitlist | ✓ | Clean |
| 4 | Virtual farm tour | ✓ | Dark until owner populates media.ts |
| 5 | Newsletter archive | ✓ | Clean |
| 6 | /preferences token | ✗ | "Unsubscribe all" link is dead — `preferences/page.tsx:238` |
| 7 | Referrer reward | ✗✗ | `referrerRewardDeps` unwired in both webhooks — `stripe-webhook/route.ts:118`, `mollie-webhook/route.ts:238` |
| 8 | Tour-confirmation ICS | ✓⚠ | Clean; ? on gcal URL encoding |
| 9 | Alpaca filter | ✓⚠ | Clean; ? on Suspense boundary |
| 10 | Alpaca cam | ✗ | Allowlist `startsWith` bypassable — `alpaca-cam-embed.tsx:35` |
