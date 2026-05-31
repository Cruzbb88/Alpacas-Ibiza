# User Journey Map — Alpacas Ibiza

_Captures every interaction surface. Updated as cycles ship. Separate from FORWARD_PLAN.md (owner queue) and OVERLORD_QUEUE.md (AI queue)._

---

## Legs

### 1. Discovery

| Touchpoint | Surface (file) | What works | Gap |
|---|---|---|---|
| Organic search — homepage | `app/[locale]/page.tsx` | LocalBusiness + WebSite JSON-LD, hreflang, OG image | Hero image pending owner supply |
| Organic search — tours | `app/[locale]/tours/page.tsx` | TouristTrip + FAQPage JSON-LD, OG image | — |
| Organic search — alpacas grid | `app/[locale]/alpacas/page.tsx` | HerdAttraction + LocalBusiness JSON-LD | — |
| Organic search — adopt | `app/[locale]/adopt/page.tsx` | Product/Offer JSON-LD (€75/€900), OG image | — |
| Organic search — journal | `app/[locale]/journal/page.tsx` + `app/journal/rss.xml/route.ts` | RSS feed, per-post JSON-LD | No posts live until owner populates `lib/data/journal.ts` |
| Instagram deep-link / `?ref=` | `app/[locale]/page.tsx` (searchParams.ref) | Referral code `ALPACA-XXXXXX` captured, threads into FareHarbor booking URL | UTM params captured but not forwarded to FH |
| Google Maps / Places embed | `lib/integrations/map.ts` | Falls back to OSM iframe if API key unset | — |
| Google Reviews badge | `components/google-reviews-badge.tsx` + `app/api/google-reviews/route.ts` | Renders null if keys unset | Keys are Tier 2 env |
| Facebook social proof | `app/[locale]/page.tsx` (ReviewCard links) | Reviews surfaced inline, link to FB page | No automated pull from Facebook |
| TripAdvisor review link | `lib/email-templates.ts` `reviewRequestEmailHtml` | Used in post-tour email only | No TripAdvisor badge on site pages |
| Press / media room | `app/[locale]/press/page.tsx` + `app/[locale]/press-kit/page.tsx` | Pages exist | No press data in `lib/data/press.ts` by default |
| Sitemap (SEO crawl) | `app/sitemap-images.xml/route.ts` + `app/sitemap-news.xml/route.ts` | Image + news sitemaps generated | — |

### 2. Consideration

| Touchpoint | Surface (file) | What works | Gap |
|---|---|---|---|
| Alpacas grid (browse herd) | `app/[locale]/alpacas/page.tsx` | Search/filter by personality, colour, breed (`AlpacaSearchFilter`); fun-fact carousel | Personality data mapped for 14 alpacas; photo supply pending |
| Alpaca detail page | `app/[locale]/alpacas/[slug]/page.tsx` | Per-alpaca Animal/AboutPage JSON-LD; Adopt CTA threads `?alpaca=<slug>` | Bio text UNMAPPED until owner confirms |
| Journal post | `app/[locale]/journal/[slug]/page.tsx` | Full post, breadcrumbs, OG | No posts live by default |
| Experiences hub | `app/[locale]/experiences/page.tsx` | `ExperienceCompare` comparison grid across all 7 experience types | — |
| Tour detail | `app/[locale]/tours/page.tsx` | `TourComparison`, FAQ, live availability via FareHarbor adapter, cancellation badge | FAREHARBOR_APP_KEY/USER_KEY Tier 2 |
| Yoga detail | `app/[locale]/yoga/page.tsx` | Price (€30), duration (1h15), max 6 pax, WeeklyEvent schema | FAREHARBOR_ITEM_YOGA env not yet set |
| Workshop detail | `app/[locale]/workshops/page.tsx` | 2-day workshop, HowTo schema | Price/dates UNMAPPED |
| Wedding detail | `app/[locale]/weddings/page.tsx` | Page exists | Pricing/packages UNMAPPED |
| Romantic Sunset detail | `app/[locale]/experiences/romantic-sunset/page.tsx` | Page + BookingButton fail-open | FAREHARBOR_ITEM_ROMANTIC_SUNSET not set |
| Family Farm Days detail | `app/[locale]/experiences/family-farm-days/page.tsx` | Page + BookingButton fail-open | FAREHARBOR_ITEM_FAMILY_FARM_DAYS not set |
| Corporate Team Building | `app/[locale]/experiences/corporate-team-building/page.tsx` | Page exists | Enquiry form only; no booking calendar |
| About / founders story | `app/[locale]/about/page.tsx` | Awards badges, founders bio | Owner photo supply pending |
| Sustainability page | `app/[locale]/sustainability/page.tsx` | Live-site facts used; Alcaca fertilizer | Finca hectares, certification UNMAPPED |
| Weaving studio landing | `app/[locale]/weaving/page.tsx` | Wishfulfilling Weaving story | Studio photos UNMAPPED |
| Woven collection | `app/[locale]/weaving/collection/page.tsx` + `app/[locale]/shop/woven/page.tsx` | Pages exist | SKU/inventory data UNMAPPED |
| Google Reviews wall (adopt) | `components/google-reviews-wall.tsx` | Inline on `/adopt` for trust | Dark until GOOGLE_PLACES_API_KEY set |
| Testimonials wall | `components/testimonials-wall.tsx` | Renders null until `lib/data/testimonials.ts` has `status:'live'` entries | — |
| Events calendar | `components/events-calendar.tsx` | Renders null in prod until `lib/data/events.ts` populated | — |

### 3. Decision

| Touchpoint | Surface (file) | What works | Gap |
|---|---|---|---|
| Tier comparison (adopt) | `components/adopt/tier-comparison.tsx` | Monthly (€75) vs Yearly (€900), 7-feature comparison table, CTA links | — |
| Alpaca personality quiz | `components/adopt/alpaca-personality-match.tsx` | 3-question quiz → recommended alpaca slug → `?alpaca=<slug>` | — |
| Alpaca picker | `components/adopt/alpaca-picker.tsx` | Visual grid pick; "Pick for me" random; slug threads to checkout | — |
| Gift flow wizard | `components/gifts/gift-flow.tsx` on `app/[locale]/gifts/page.tsx` | 3 gift types: tour, adoption-monthly, adoption-yearly; threads `gift_name`/`gift_email`/`gift_deliver` into URL | Shop-credit gift type falls back to mailto until Stripe SKU created |
| Tour comparison table | `components/tour-comparison.tsx` on `app/[locale]/tours/page.tsx` | Structured tour type comparison | — |
| Adopt adopter counter | `components/adopt/adopter-counter.tsx` | Live count vs 14-alpaca cap from Mollie/Stripe | Shows 0 until payment vendor configured |
| Campaign banner | `components/adopt/campaign-banner.tsx` | Auto-expiry on `ADOPT_CAMPAIGN_END_DATE`; renders null if unset | Owner must set env vars to activate |
| Referral discount banner | `components/adopt/referral-applied-banner.tsx` | Shown when `?referral=ALPACA-XXXXXX` is in URL | — |
| Trust signals strip | `components/adopt/trust-signals.tsx` | Secure payments, cancel-anytime, responsive support, receipt | — |
| Availability urgency widget | `components/booking/availability-urgency.tsx` | Shows spots-left on tours | Hidden when FH keys unset |
| Contact form | `app/[locale]/contact/page.tsx` + `app/api/contact/route.ts` | Turnstile, honeypot, rate-limit, sends email | — |

### 4. Purchase

| Touchpoint | Surface (file) | What works | Gap |
|---|---|---|---|
| FareHarbor embedded calendar | `components/booking/fareharbor-calendar.tsx` on `/tours`, `/gifts` | iFrame embed of FH booking flow; fails-open to base calendar | Item IDs (per-tour) need FAREHARBOR_ITEM_* env vars |
| FareHarbor sticky booking bar | `components/booking/sticky-booking-bar.tsx` | Mobile sticky CTA | — |
| Mollie checkout (hosted) | `app/api/mollie-checkout/route.ts` + `app/api/mollie-checkout/intent/route.ts` | Monthly subscription + yearly one-off; redirects to Mollie-hosted page | MOLLIE_API_KEY + MOLLIE_WEBHOOK_SECRET Tier 2 |
| Stripe checkout (hosted) | `app/api/checkout/route.ts` + `app/api/checkout/intent/route.ts` | Stripe Checkout session; success URL uses SITE_BASE_URL (no open-redirect) | STRIPE_SECRET_KEY Tier 2; PAYMENT_VENDOR=stripe required |
| Embedded Stripe Checkout | `components/adopt/embedded-checkout.tsx` | Stage-2 additive; renders when CHECKOUT_MODE=embedded + PAYMENT_VENDOR=stripe | Hosted CTAs stay visible during additive rollout |
| Mollie manage link email (portal request) | `app/api/mollie-manage/route.ts` | Email-oracle: always 200, URL sent to inbox | Requires MOLLIE_API_KEY |
| Adopt mailto fallback CTA | `lib/payment-vendor.ts` `ADOPT_FALLBACK_MAILTO` | Shown when PAYMENT_VENDOR unset | Not a true purchase path |
| Commission form | `app/[locale]/shop/commission/page.tsx` + `app/api/commission/route.ts` | Turnstile, honeypot, rate-limit, sanitised email; sends to CONTACT_EMAIL | No price negotiation in-flow |
| Alcaca fertilizer shop | `app/[locale]/shop/alcaca/page.tsx` | Page exists | No e-commerce; contact-to-buy only |
| Gift voucher (adopt tier) | `app/[locale]/gifts/page.tsx` → `app/[locale]/adopt/page.tsx` | `gift_name`/`gift_email`/`gift_deliver` URL params threaded to checkout | — |

### 5. Post-purchase (transactional + onboarding)

| Touchpoint | Surface (file) | What works | Gap |
|---|---|---|---|
| Stripe welcome email | `app/api/stripe-webhook/route.ts` → `lib/payment-handlers.ts` `handleStripeCheckoutCompleted()` | `welcomeAdoptionEmailHtml()` sent on `checkout.session.completed`; alpaca name + tier in subject | Fail-quiet; logged on miss |
| Mollie welcome email | `app/api/mollie-webhook/route.ts` → `lib/payment-handlers.ts` `handleMolliePaymentPaid()` | Same template; monthly-first fires sub+welcome in parallel; yearly-oneoff welcome only | Fail-quiet |
| Discount codes email | `lib/email-templates.ts` `buildAdoptDiscountCodesEmail()` | Scheduled +5 min after welcome via Resend `scheduledAt`; weaving 10% + farm shop 15% | Shows placeholder "codes arriving within 48h" until ADOPT_DISCOUNT_CODE_* env vars set |
| Adoption certificate (PDF) | `app/api/adopt-certificate/route.ts` + `components/adopt/certificate-pdf.tsx` | Digital certificate generated; preview on `/adopt` page | — |
| Certificate preview on adopt page | `components/adopt/adoption-certificate-preview.tsx` | Personalized with alpaca name when picker used | — |
| Stripe thank-you screen | `components/adopt-thank-you.tsx` on `app/[locale]/adopt/page.tsx` | Shown on `?checkout=success`; hides marketing content | — |
| Mollie return / SEPA-pending screen | Same `AdoptThankYou` component | SEPA-pending state handled; SEPA settles 1-5 business days | — |
| Owner notification (new adoption) | `lib/payment-handlers.ts` `handleMolliePaymentPaid()` + Stripe equivalent | Email to CONTACT_EMAIL summarising tier/amount/alpaca/donor | Fail-quiet |
| Deferred gift dispatch | `app/api/adopt-deferred-gifts/route.ts` | Daily cron 09:00 UTC — finds gift_send_date = today, dispatches welcome to recipient | Shell only; welcome-send logic uses same handler |
| Newsletter double opt-in | `app/api/newsletter/route.ts` + `app/api/newsletter/confirm/route.ts` | HMAC-signed token, stateless, 90-day TTL; confirmed at `/newsletter-confirmed` | — |

### 6. Engagement (during-relationship)

| Touchpoint | Surface (file) | What works | Gap |
|---|---|---|---|
| 48h pre-tour reminder email | `app/api/fareharbor-webhook/route.ts` (primary) + `app/api/reminder/route.ts` (fallback) | `reminderEmailHtml()`: directions, packing list, ICS attachment, Google Calendar deep-link | Primary path via FH webhook; fallback is owner-triggered |
| 24h post-tour review request | `app/api/fareharbor-webhook/route.ts` (primary) + `app/api/review-request/route.ts` (fallback) | `reviewRequestEmailHtml()`: Google + TripAdvisor links, RETURN10 discount code | Primary path via FH webhook; fallback is manual |
| Donor portal (self-service) | `app/[locale]/my-adoption/page.tsx` | Token-gated; shows adopted alpaca photo/bio, subscription summary, latest quarterly content sneak peek, action buttons | Token delivered via email; no login flow |
| Payment update flow | `app/api/mollie-manage/update-payment/route.ts` | GET interstitial + POST creates new Mollie payment; 5/60s IP rate-limit; blocks link-scanner replay | — |
| Newsletter cadence | `app/api/newsletter/route.ts` + Resend | Double opt-in; List-Unsubscribe headers; unsubscribe at `/newsletter/unsubscribed` | Cadence/content is owner-driven; no auto-send schedule |
| Journal RSS feed | `app/journal/rss.xml/route.ts` | RSS 2.0 feed for subscribers | — |
| Search (journal) | `app/api/search/route.ts` | Full-text search over journal posts | — |

### 7. Retention (proactive)

| Touchpoint | Surface (file) | What works | Gap |
|---|---|---|---|
| Quarterly update email (donors) | `app/api/adopt-quarterly-update/route.ts` | Cron `0 9 1 1,4,7,10 *`; `buildAdoptQuarterlyUpdateEmail()`; per-adopter locale + alpaca name | Admin compose at `/admin/quarterly-update`; content preview on donor portal |
| Renewal reminder email | `app/api/adopt-renewal-reminders/route.ts` | Cron `0 10 * * *`; fires at 14 days before renewal (±1 day); stamps `renewal_reminded` metadata | Covers both Stripe + Mollie |
| Milestone emails (30/180/365/730 days) | `app/api/adopt-milestone-emails/route.ts` | Cron `0 11 * * *`; `buildAdopterMilestoneEmail()`; idempotency stamp | Mollie only at this stage |
| Payment failure dunning (first) | `lib/payment-handlers.ts` `handleMolliePaymentFailed()` + Stripe `invoice.payment_failed` | Donor email (manage-link) + owner notification; severity ladder: first → at-risk → action-required | — |
| Dunning escalation to owner (at-risk / action-required) | `lib/owner-notify.ts` | Slack / Telegram / generic webhook; fires on severity ≥ at-risk; fail-quiet | Owner must set escalation channel env vars |
| Owner weekly MRR digest | `app/api/owner-mrr-digest/route.ts` | Cron `0 6 * * 1`; MRR/ARR/active/new/canceled/churn + dunning summary | Mollie + in-memory dunning tracker |
| Owner ad-hoc digest | `app/api/owner-digest/route.ts` | Cron `0 9 * * MON`; FareHarbor bookings summary | FH keys Tier 2 |
| Donor portal billing portal link | `components/billing-portal-link.tsx` + `app/api/billing-portal/route.ts` | Email-oracle; sends Stripe portal URL to inbox; always 200 | Stripe-side only |
| Mollie manage (cancel / update) | `app/api/mollie-manage/cancel/route.ts` + `app/api/mollie-manage/update-payment/route.ts` | HMAC capability token, 7-day TTL, scope-guarded; HTML success/error; cross-origin blocked | — |
| Billing portal email (manage link) | `lib/email-templates.ts` `buildBillingPortalEmail()` | Sent from email-oracle route; URL never in JSON response | — |
| Abandoned adoption email | `lib/email-templates-retention.ts` `buildAbandonedAdoptionEmail()` | Template exists | No trigger wired; no cart-abandon detection yet |
| Certificate recovery email | `lib/email-templates-retention.ts` `buildCertificateRecoveryEmail()` | Template exists | No trigger wired |
| VAT threshold tracker | `app/admin/analytics/vat/page.tsx` + `lib/vat-tracker.ts` | Per-country EU OSS tracking; admin page surfaces threshold + breakdown | Admin-only; no donor-facing touchpoint |

### 8. Referral / advocacy

| Touchpoint | Surface (file) | What works | Gap |
|---|---|---|---|
| Referral code (donor portal) | `app/[locale]/my-adoption/referral-code-badge.tsx` | `ALPACA-XXXXXX` deterministic code; share URL with `?ref=<code>`; `referral_link_displayed` GA4 event | Fires once per mount |
| Share adoption page | `app/[locale]/share-adoption/page.tsx` | Public OG page (not token-gated); renders alpaca name + CTA to `/adopt`; referral code threaded via `?ref=` | — |
| Share OG card image | `app/api/og/adoption-share/route.tsx` | Dynamic image with alpaca slug; 1200×630; fallback to generic | — |
| Share CTA in donor portal | `components/donor-portal/share-cta.tsx` | Share button in `/my-adoption` portal | — |
| Referral analytics admin page | `app/admin/analytics/referrals/page.tsx` | Admin view of referral code usage | — |
| Review request return code | `lib/email-templates.ts` `reviewRequestEmailHtml()` | RETURN10 discount code in post-tour email | Code value hardcoded; no dynamic per-referrer code |
| Share buttons (social) | Footer `components/footer.tsx` (`instagramUrl`) | Instagram link in footer | Facebook / TripAdvisor share not in footer |

---

## Missing journeys — proposed builds

| Name | Plug-in (route) | Impact | Effort | Owner data needed? |
|---|---|---|---|---|
| Abandoned adopt cart | trigger on `?checkout=cancelled` + timer | Recover drop-offs; template exists in `buildAbandonedAdoptionEmail` | Low (template + cron) | No |
| Certificate recovery | cron scan donors with no cert sent | Re-engage lapsed cert recipients; template exists | Low (cron trigger) | No |
| Post-workshop follow-up | FH webhook on workshop item ID | Review + upsell after 2-day workshop | Low (reuse review-request) | FAREHARBOR_ITEM_WORKSHOP env var |
| Newsletter campaign send | `/admin` compose page extension | Batch send to newsletter list | Medium | Owner writes content |
| Per-tour discount code | `RETURN10` dynamic per-referrer | Track which reviewer generates bookings | Medium | Owner decides code scheme |

---

## Shipped this cycle (cycle-5 builds)

- (filled in by next commit)

---

## Drop-off heat map

1. **Adopt page → checkout**: payment vendor dark until MOLLIE_API_KEY / STRIPE_SECRET_KEY set — all adopt CTAs fall back to mailto fallback, zero conversion.
2. **Tours page → booking**: FareHarbor availability widget hidden until FAREHARBOR_APP_KEY/USER_KEY set; per-tour Book buttons inactive until FAREHARBOR_ITEM_* env vars set.
3. **Discovery → journal**: zero posts live until owner populates `lib/data/journal.ts`; social proof and SEO content missing.
4. **Post-tour → review**: review-request email fires from FH webhook (correct) but FH webhook secret must be set; manual fallback at `/api/review-request` is the only active path today.
5. **Donor portal → re-adoption**: abandoned adopt + certificate recovery templates exist but have no trigger wired.

---

## Update protocol

When a cycle ships a new feature or removes an old touchpoint, update the matching row here.

1. Find the row by `Surface (file)` — edit in-place; do not add duplicates.
2. Move a "Gap" to "What works" once confirmed in code.
3. Add a row to "Missing journeys" only if a journey is identified but has _no_ code yet.
4. Bump "Shipped this cycle" with a one-liner; clear it at each new cycle start.
5. Keep total rows ≤ 80.
