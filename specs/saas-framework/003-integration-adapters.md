# 003 — Integration Adapters (Phase 3)

**Status:** DESIGN — awaiting GO on §5 payment default + §7 data-store choice  
**Word budget:** ~1 400  
**Recon base:** `lib/config.ts`, `lib/mailer.ts`, `lib/turnstile.ts`, `lib/webhook-router.ts`, `lib/booking-schedule-store.ts`, `lib/rate-limit.ts`, `lib/validate-env.ts`, `lib/payment-vendor.ts`, `lib/analytics.ts`, `lib/route-helpers.ts`, `app/api/availability/route.ts`, `app/api/google-reviews/route.ts`

---

## 1. Provider taxonomy

Every interface MUST carry a JSDoc `@failsafe` tag that states its contract. Wording maps to the CLAUDE.md failsafe map.

| Provider class | Core operations | Tenant config keys | Failsafe contract |
|---|---|---|---|
| `BookingProvider` | `embedUrl(opts?)`, `itemUrl(itemId?)`, `listItems()`, `availability(dateRange)`, `verifyWebhook(req)` | `shortname`, `appKey`, `userKey`, `webhookSecret` | `availability` → 503 if keys unset (current: `route.ts:11-19`). `verifyWebhook` → **fail-CLOSED** (current: `adr/003`). `embedUrl` → fall back to base calendar if item ID missing (current: `config.ts:73-80`). |
| `EmailProvider` | `sendEmail(opts: SendEmailOptions)`, `cancelScheduled(id)` | `apiKey`, `fromDomain` | **THROW on error** — no silent fail (current: `mailer.ts:40-42`). Caller catches → 500. |
| `CaptchaProvider` | `verify(token, remoteIp?)` | `siteKey` (public), `secretKey` (server) | **Fail-OPEN in dev, fail-CLOSED in prod on network error** (current: `turnstile.ts:51-54`). Fail-OPEN if secret unset (current: `turnstile.ts:27-34`). |
| `AnalyticsProvider` | `pageView(name, props?)`, `trackEvent(name, props?)`, `conversionEvent(name, props?)` | `containerId` (public, hardcoded ok) | **Silent** — never block user action (current: `analytics.ts:48`). |
| `ReviewsProvider` | `fetchSummary(placeId)` → `ReviewSummary \| { configured: false }` | `apiKey`, `placeId` | **`{configured:false}`** if keys unset (current: `google-reviews/route.ts:33-37`). |
| `PaymentProvider` *(new)* | `createCheckoutSession(tier, metadata)`, `handleWebhook(req)`, `refund(sessionId)`, `buildUrl(tier)` | `publishableKey`, `secretKey`, `priceIds`, `webhookSecret` | **Fail-OPEN** if keys unset → return `null` → caller falls back to mailto (current: `payment-vendor.ts:61-70`). |
| `WebhookSecretProvider` | `requireSecret(req)` → `NextResponse \| null` | `secret` per-tenant | Booking route: **fail-CLOSED** (return 503, `adr/003`). Non-booking routes: **fail-OPEN** (current: `route-helpers.ts:17-25`). |
| `MapProvider` | `embedUrl(lat, lng)`, `placeIdLookup(address)` | optional `apiKey` | **OSM iframe fallback** if no key — never throw, never blank. |
| `ContentProvider` *(new)* | `listAnimals()`, `listExperiences()`, `listProducts()` | `source: 'local' \| 'cms' \| 'api'` | Return `UNMAPPED` sentinel if source yields no data — never return empty array silently. |

---

## 2. Concrete adapters per provider class

### BookingProvider
| Adapter | Maps to | Status |
|---|---|---|
| `FareHarborBookingProvider` | Current `config.ts` URL builder + `availability/route.ts` | **Default** — extract as-is |
| `BokunBookingProvider` | Bokun Widgets API (EU/Nordic market) | **Stub** — interface only |
| `EmailInquiryBookingProvider` | No external system — renders contact form CTA | **NoOp** — no API calls |

### EmailProvider
| Adapter | Maps to | Status |
|---|---|---|
| `ResendEmailProvider` | Current `lib/mailer.ts` | **Default** — rename, wrap |
| `MailgunEmailProvider` | Mailgun `/messages` REST API | **Stub** |
| `NoOpEmailProvider` | `console.log` — local dev / CI only | **NoOp** |

### CaptchaProvider
| Adapter | Maps to | Status |
|---|---|---|
| `TurnstileCaptchaProvider` | Current `lib/turnstile.ts` | **Default** — extract |
| `RecaptchaV3Provider` | Google reCAPTCHA v3 verify endpoint | **Stub** |
| `NoOpCaptchaProvider` | Always returns `{ok:true}` | **NoOp** (same as current dev path) |

### AnalyticsProvider
| Adapter | Maps to | Status |
|---|---|---|
| `GTagAnalyticsProvider` | Current `lib/analytics.ts` `window.gtag` calls | **Default** |
| `PlausibleAnalyticsProvider` | Plausible Events API | **Stub** |
| `NoOpAnalyticsProvider` | `console.log` | **NoOp** |

### ReviewsProvider
| Adapter | Maps to | Status |
|---|---|---|
| `GooglePlacesReviewsProvider` | Current `app/api/google-reviews/route.ts` | **Default** |
| `TrustpilotReviewsProvider` | Trustpilot Business Units API | **Stub** |
| `NoOpReviewsProvider` | Returns `{configured:false}` | **NoOp** |

### PaymentProvider
| Adapter | Maps to | Status |
|---|---|---|
| `StripePaymentProvider` | Stripe Checkout Sessions API | **Recommended default** (see §5) |
| `MolliePaymentProvider` | Mollie Orders API | **Stub** — EU/Bancontact/iDEAL |
| `FareHarborPaymentProvider` | FareHarbor booking embed (no separate payment) | **Pass-through** (current default) |
| `ManualPaymentProvider` | mailto fallback, no checkout | **NoOp** (current `payment-vendor.ts` mailto adapter) |

### WebhookSecretProvider
| Adapter | Maps to | Status |
|---|---|---|
| `SharedSecretWebhookProvider` | Current `lib/secrets.ts safeEqual()` + `route-helpers.ts` | **Default** |
| `HmacWebhookProvider` | HMAC-SHA256 signature verify (Stripe/Bokun style) | **Stub** |

### MapProvider
| Adapter | Maps to | Status |
|---|---|---|
| `GoogleMapsProvider` | Google Maps Embed API | **Stub** |
| `OsmMapProvider` | OpenStreetMap iframe (no key required) | **NoOp / Default fallback** |

### ContentProvider
| Adapter | Maps to | Status |
|---|---|---|
| `LocalContentProvider` | `lib/data/alpacas.ts`, `lib/data/press.ts` | **Default** |
| `SanityContentProvider` | Sanity GROQ API | **Stub** |
| `UnmappedContentProvider` | Returns `UNMAPPED` sentinel | **NoOp** |

---

## 3. Provider registry + tenant resolution

Pseudo-code only.

```typescript
// tenant.config.json (file-based in Phase 3)
{
  "tenantId": "alpacasibiza",
  "booking":  { "provider": "fareharbor",  "shortname": "alpacasibiza", "appKey": "...", "userKey": "..." },
  "email":    { "provider": "resend",       "apiKey": "...", "fromDomain": "alpacasibiza.com" },
  "captcha":  { "provider": "turnstile",    "siteKey": "...", "secretKey": "..." },
  "payment":  { "provider": "stripe",       "publishableKey": "...", "secretKey": "...", "webhookSecret": "..." },
  "reviews":  { "provider": "google",       "apiKey": "...", "placeId": "..." },
  "map":      { "provider": "osm" },
  "content":  { "provider": "local" }
}

// runtime resolution — providers/registry.ts
function getBookingProvider(tenant: TenantConfig): BookingProvider {
  switch (tenant.booking.provider) {
    case 'fareharbor': return new FareHarborBookingProvider(tenant.booking)
    case 'bokun':      return new BokunBookingProvider(tenant.booking)
    default:           return new EmailInquiryBookingProvider()
  }
}
```

**Where do credentials live?**  
Phase 3: `tenant.config.json` files committed per-tenant (never in source for production — loaded from `TENANT_CONFIG_PATH` env var pointing at a secrets mount). Phase 4 upgrade: Vercel KV or Postgres (same upgrade path as `booking-schedule-store.ts` ADR 011).

Single-tenant = `tenant.config.json` for `tenantId: "alpacasibiza"` with env vars as today. Zero breaking change.

---

## 4. Migration strategy from current code

| Current integration | Smallest extract | Stays at route level | Backward-compat guarantee |
|---|---|---|---|
| `lib/config.ts` FareHarbor URLs | Move URL builder into `FareHarborBookingProvider.embedUrl()` + `itemUrl()` | Route imports provider, calls `provider.embedUrl()` | Single-tenant tenant 0 = env vars as today; no URL change |
| `lib/mailer.ts` Resend client | Rename to `ResendEmailProvider`, implement `EmailProvider` interface | Route calls `provider.sendEmail(opts)` | `sendEmail` / `cancelScheduledEmail` signatures unchanged (`mailer.ts:7-18`) |
| `lib/turnstile.ts` verify | Move body into `TurnstileCaptchaProvider.verify()` | Route calls `provider.verify(token, ip)` | Failsafe logic (lines 27-54) preserved verbatim |
| `app/api/availability/route.ts` | Extract FareHarbor HTTP calls into `FareHarborBookingProvider.availability()` | Route calls provider; handles 503 if `null` | `Promise.allSettled` fan-out preserved (`route.ts:61`) |
| `app/api/google-reviews/route.ts` | Wrap in `GooglePlacesReviewsProvider.fetchSummary()` | Route calls provider, returns `{configured:false}` passthrough | ISR revalidate stays at route level (`revalidate=21600`) |
| `lib/payment-vendor.ts` | Already an adapter pattern — promote `PaymentAdapter` to `PaymentProvider` interface | Factory `getPaymentAdapter()` becomes `registry.getPaymentProvider(tenant)` | `buildAdoptCheckoutUrl` → `buildUrl`; same null-return → mailto contract |
| `lib/webhook-router.ts` pure helpers | No change — pure functions stay, `verifyWebhook` lives in `BookingProvider` | Route calls `provider.verifyWebhook(req)` first, then router helpers | `extractBooking`, `computeScheduleWindows`, `validateBookingForScheduling` untouched |

---

## 5. PaymentProvider deep-dive

| Model | Pros | Cons | Verdict |
|---|---|---|---|
| **Stripe Connect Standard** | Tenants own their Stripe account; Cruz takes platform fee via `application_fee_amount`; infinite clients; PCI on Stripe | Onboarding requires tenant to have/create Stripe account | **RECOMMENDED** |
| Stripe Connect Express | Simpler onboarding; Cruz creates accounts | More liability; harder for EU tenants to control payouts | Second choice |
| Mollie Connect | Bancontact, iDEAL, Klarna native; EU-first; lower fees in BE/NL | Smaller ecosystem; less tooling | Add as EU tier-2 alongside Stripe |
| FareHarbor pass-through | Zero payment infra | No platform fee; Cruz earns nothing on transaction | Keep as opt-out |
| Manual / email-only | Zero setup | No revenue | NoOp fallback |

**Recommendation:** Stripe Connect Standard as the `PaymentProvider` default. Cruz acts as platform, each tenant connects their Stripe account. Tenant config shape:

```json
"payment": {
  "provider": "stripe",
  "mode": "connect-standard",
  "connectedAccountId": "acct_xxx",
  "publishableKey": "pk_live_xxx",
  "webhookSecret": "whsec_xxx",
  "platformFeePercent": 5,
  "currency": "eur",
  "priceIds": {
    "adopt-monthly": "price_xxx",
    "adopt-yearly":  "price_xxx",
    "tour-standard": "price_xxx"
  }
}
```

**GO gate:** Cruz picks payment model before `StripePaymentProvider` is scaffolded. Interfaces + stubs can ship without this choice.

---

## 6. Failsafe inheritance

Every provider interface file MUST open with this JSDoc block:

```typescript
/**
 * @failsafe <contract>
 * Valid contracts:
 *   THROW        — caller must catch; used for email (lib/mailer.ts:40-42)
 *   FAIL_CLOSED  — return error/null; security-critical paths (adr/003, turnstile.ts:51-54 prod)
 *   FAIL_OPEN    — return ok/null; dev paths, optional features (turnstile.ts:27-34)
 *   SILENT       — swallow error, never block (analytics.ts:48)
 *   SENTINEL     — return typed sentinel value, never throw (google-reviews/route.ts:33-37, UNMAPPED)
 */
```

All adapters inherit the contract from their interface. Overriding to a weaker contract (e.g. FAIL_CLOSED → FAIL_OPEN on a booking webhook) requires a new ADR.

---

## 7. Phase 3 GO conditions

| Condition | Reversible? | Gate |
|---|---|---|
| Cruz approves provider taxonomy (§1) | Yes — interfaces only | **GO before scaffolding** |
| Cruz picks default payment provider (§5) | Yes — stubs don't commit | **GO before PaymentProvider impl** |
| Interfaces + NoOp adapters scaffolded | Yes | No gate — safe to ship |
| Stub adapters (Bokun, Mailgun, etc.) | Yes | No gate — no side effects |
| Tenant credential storage choice | **IRREVERSIBLE** — migrating away from file-based requires data migration | Gated by Phase 2 data store ADR (KV vs Postgres) |
| `tenant.config.json` schema frozen | **IRREVERSIBLE** — downstream tenants depend on it | GO only after §3 schema approved |

---

*Pattern sources: `lib/booking-schedule-store.ts:28-32` (interface + swap contract), `lib/rate-limit.ts:28-37` (HMR-safe singleton), `lib/payment-vendor.ts:17-28` (adapter pattern already in use), `lib/validate-env.ts:45-50` (`isSet` sentinel guard).*
