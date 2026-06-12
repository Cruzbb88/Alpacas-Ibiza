# WIRING_MAP.md — Alpacas Ibiza redesign (generated 2026-06-10)

Active call-graph traversal. Every interactive surface → component → API route → external service → side-effects. Cites file:line throughout.

Source roots: `app/[locale]/` (public pages), `app/admin/` (operator pages), `app/api/` (server routes), `components/` (UI primitives). External-call boundaries: Stripe, Mollie, FareHarbor, Resend, Google Places, MyMemory, GA4, GTM, Cloudflare Turnstile / reCAPTCHA, OpenStreetMap, Google Maps Embed.

---

## A. Page-by-page button inventory

### A.1 Global chrome (mounted in `app/[locale]/layout.tsx`)

#### Header — [components/header.tsx](components/header.tsx)
| Label | Component file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| Brand logo / "Alpacas Ibiza" | [components/header.tsx#L332](components/header.tsx#L332) | `/${locale}` | — | — | navigation |
| Nav: Tours | [components/header.tsx#L123](components/header.tsx#L123) | `/${locale}/tours` | — | — | navigation |
| Nav: Experiences (mega-menu trigger) | [components/header.tsx#L124-L135](components/header.tsx#L124-L135) | `/${locale}/experiences` + submenu | — | — | navigation |
| Submenu: Corporate Team Building | [components/header.tsx#L131](components/header.tsx#L131) | `/${locale}/experiences/corporate-team-building` | — | — | navigation |
| Submenu: Family Farm Days | [components/header.tsx#L132](components/header.tsx#L132) | `/${locale}/experiences/family-farm-days` | — | — | navigation |
| Submenu: Romantic Sunset | [components/header.tsx#L133](components/header.tsx#L133) | `/${locale}/experiences/romantic-sunset` | — | — | navigation |
| Nav: Visit | [components/header.tsx#L136](components/header.tsx#L136) | `/${locale}/visit` | — | — | navigation |
| Nav: Alpacas (mega-menu) | [components/header.tsx#L137-L144](components/header.tsx#L137-L144) | `/${locale}/alpacas` | — | — | navigation |
| Submenu: Herd Diary | [components/header.tsx#L142](components/header.tsx#L142) | `/${locale}/herd-diary` | — | — | navigation |
| Nav: Adopt (env-gated mega-menu) | [components/header.tsx#L70-L95](components/header.tsx#L70-L95) | `/${locale}/adopt` | — | — | navigation; subItems gated by `SKEIN_CALLOUT_LIVE`, `MEMBERSHIP_LIVE`, `HERD_FAMILY_LIVE` |
| Submenu: Herd Family | [components/header.tsx#L82](components/header.tsx#L82) | `/${locale}/herd-family` | — | — | gated by `HERD_FAMILY_LIVE` |
| Submenu: Annual Farm Pass | [components/header.tsx#L79](components/header.tsx#L79) | `/${locale}/membership` | — | — | gated by `MEMBERSHIP_LIVE` |
| Submenu: Skein Sponsorship | [components/header.tsx#L76](components/header.tsx#L76) | `/${locale}/skein` | — | — | gated by `SKEIN_CALLOUT_LIVE` |
| Submenu: Redeem a Voucher | [components/header.tsx#L73](components/header.tsx#L73) | `/${locale}/redeem-voucher` | — | — | always present |
| Nav: Weaving | [components/header.tsx#L146](components/header.tsx#L146) | `/${locale}/weaving` | — | — | navigation |
| Nav: Shop (mega-menu) | [components/header.tsx#L147-L158](components/header.tsx#L147-L158) | `/${locale}/shop` | — | — | navigation |
| Submenu: Alcaca | [components/header.tsx#L154](components/header.tsx#L154) | `/${locale}/shop/alcaca` | — | — | navigation |
| Submenu: Woven Collection | [components/header.tsx#L155](components/header.tsx#L155) | `/${locale}/shop/woven` | — | — | navigation |
| Submenu: Custom Commission | [components/header.tsx#L156](components/header.tsx#L156) | `/${locale}/shop/commission` | — | — | navigation |
| Nav: Gifts | [components/header.tsx#L159](components/header.tsx#L159) | `/${locale}/gifts` | — | — | navigation |
| Nav: About | [components/header.tsx#L160](components/header.tsx#L160) | `/${locale}/about` | — | — | navigation |
| Nav: Journal | [components/header.tsx#L161](components/header.tsx#L161) | `/${locale}/journal` | — | — | navigation |
| Nav: Contact | [components/header.tsx#L162](components/header.tsx#L162) | `/${locale}/contact` | — | — | navigation |
| Search input (site-search) | [components/search/site-search.tsx#L43](components/search/site-search.tsx#L43) | inline panel | GET `/api/search` | — | client-side fetch on focus |
| LanguageSwitcher | [components/language-switcher.tsx](components/language-switcher.tsx) | `/${nextLocale}/<rest>` | — | — | client route push |
| BookingButton ("Book a tour") | [components/booking/button.tsx](components/booking/button.tsx) → [lib/fareharbor-products.ts](lib/fareharbor-products.ts) `getProductBookingUrl('general')` | FareHarbor embed | — | FareHarbor | new-tab embed; failsafe = main calendar |
| Hamburger / "Open menu" | [components/header.tsx#L515-L520](components/header.tsx#L515-L520) | toggle drawer | — | — | client state |
| Mobile drawer link cluster | [components/header.tsx#L598-L700](components/header.tsx#L598-L700) | all nav items repeated | — | — | navigation |

#### Footer — [components/footer.tsx](components/footer.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Instagram icon link | [components/footer.tsx#L115](components/footer.tsx#L115) | tenant `instagramUrl` | new-tab |
| Facebook icon link | [components/footer.tsx#L128](components/footer.tsx#L128) | tenant `facebookUrl` | new-tab |
| Google Reviews icon link | [components/footer.tsx#L141](components/footer.tsx#L141) | tenant `googleReviewUrl` | new-tab |
| Footer: Tours | [components/footer.tsx#L160](components/footer.tsx#L160) | `/${locale}/tours` | — |
| Footer: Experiences | [components/footer.tsx#L168](components/footer.tsx#L168) | `/${locale}/experiences` | — |
| Footer: Yoga | [components/footer.tsx#L176](components/footer.tsx#L176) | `/${locale}/yoga` | — |
| Footer: Workshops | [components/footer.tsx#L184](components/footer.tsx#L184) | `/${locale}/workshops` | — |
| Footer: Weddings | [components/footer.tsx#L192](components/footer.tsx#L192) | `/${locale}/weddings` | — |
| Footer: Alpacas | [components/footer.tsx#L200](components/footer.tsx#L200) | `/${locale}/alpacas` | — |
| Footer: Adopt | [components/footer.tsx#L208](components/footer.tsx#L208) | `/${locale}/adopt` | — |
| Footer: Herd Family (env-gated) | [components/footer.tsx#L217](components/footer.tsx#L217) | `/${locale}/herd-family` | gated |
| Footer: Membership (env-gated) | [components/footer.tsx#L227](components/footer.tsx#L227) | `/${locale}/membership` | gated |
| Footer: Sustainability | [components/footer.tsx#L236](components/footer.tsx#L236) | `/${locale}/sustainability` | — |
| Footer: Journal | [components/footer.tsx#L244](components/footer.tsx#L244) | `/${locale}/journal` | — |
| Footer: Newsletter archive | [components/footer.tsx#L252](components/footer.tsx#L252) | `/${locale}/newsletter/archive` | — |
| Footer: About | [components/footer.tsx#L260](components/footer.tsx#L260) | `/${locale}/about` | — |
| Footer: Contact | [components/footer.tsx#L268](components/footer.tsx#L268) | `/${locale}/contact` | — |
| Footer: Woven shop | [components/footer.tsx#L283](components/footer.tsx#L283) | `/${locale}/shop/woven` | — |
| Footer: Commission | [components/footer.tsx#L291](components/footer.tsx#L291) | `/${locale}/shop/commission` | — |
| Footer: Alcaca | [components/footer.tsx#L299](components/footer.tsx#L299) | `/${locale}/shop/alcaca` | — |
| Footer: Gift vouchers | [components/footer.tsx#L307](components/footer.tsx#L307) | `/${locale}/gifts` | — |
| Footer: Redeem voucher | [components/footer.tsx#L315](components/footer.tsx#L315) | `/${locale}/redeem-voucher` | — |
| Footer: Weaving | [components/footer.tsx#L323](components/footer.tsx#L323) | `/${locale}/weaving` | — |
| Footer: Skein | [components/footer.tsx#L331](components/footer.tsx#L331) | `/${locale}/skein` | — |
| Footer: phone CTA `tel:` | [components/footer.tsx#L346](components/footer.tsx#L346) | tenant `phoneE164` tel: | OS dialer |
| Footer: WhatsApp CTA | [components/footer.tsx#L356](components/footer.tsx#L356) | `wa.me/<E164>` | new-tab WhatsApp |
| Footer: mail CTA `mailto:` | [components/footer.tsx#L368](components/footer.tsx#L368) | tenant `contactEmail` mailto: | OS mail |
| Footer: My adoption (donor portal) | [components/footer.tsx#L396](components/footer.tsx#L396) | `/${locale}/my-adoption` | — |
| Footer: Email preferences | [components/footer.tsx#L401](components/footer.tsx#L401) | `/${locale}/preferences` | — |
| Footer: Recover certificate | [components/footer.tsx#L406](components/footer.tsx#L406) | `/${locale}/recover-certificate` | — |
| Footer: Press | [components/footer.tsx#L416](components/footer.tsx#L416) | `/${locale}/press` | — |
| Footer: Press kit | [components/footer.tsx#L421](components/footer.tsx#L421) | `/${locale}/press-kit` | — |
| Footer: Media | [components/footer.tsx#L426](components/footer.tsx#L426) | `/${locale}/media` | — |
| Footer: Visit | [components/footer.tsx#L436](components/footer.tsx#L436) | `/${locale}/visit` | — |
| Footer: Sitemap | [components/footer.tsx#L441](components/footer.tsx#L441) | `/${locale}/sitemap` | — |
| Footer: Privacy | [components/footer.tsx#L488](components/footer.tsx#L488) | `/${locale}/privacy` | — |
| Footer: Terms | [components/footer.tsx#L497](components/footer.tsx#L497) | `/${locale}/terms` | — |
| Footer: Cookies | [components/footer.tsx#L506](components/footer.tsx#L506) | `/${locale}/cookies` | — |
| Footer: Impressum | [components/footer.tsx#L515](components/footer.tsx#L515) | `/${locale}/impressum` | — |

#### Floating / sticky chrome
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| WhatsApp floating button | [components/floating-whatsapp.tsx](components/floating-whatsapp.tsx) | `wa.me/<E164>` | — | WhatsApp | renders null if tenant `whatsappE164` unset |
| MobileStickyBookingBar primary CTA | [components/mobile-sticky-booking-bar.tsx](components/mobile-sticky-booking-bar.tsx) | FareHarbor embed *or* `/${locale}/adopt` (context-aware) | — | FareHarbor | hidden on `/preferences`, `/redeem-voucher`, `/my-adoption`, `/thank-you`, `/newsletter/unsubscribed`, `/newsletter/archive`, `/admin`, `/api`, `/billing` |
| Back-to-top button | [components/back-to-top.tsx](components/back-to-top.tsx) | scroll to top | — | — | client-only |
| NavProgressBar | [components/nav-progress-bar.tsx](components/nav-progress-bar.tsx) | route-change progress | — | — | visual feedback |
| SkipToMain | [components/skip-to-main.tsx](components/skip-to-main.tsx) | `#main-content` | — | — | A11y |
| Cookie consent banner — Accept All | [components/cookie-consent-v3.tsx#L100](components/cookie-consent-v3.tsx#L100) | dismiss | — | GA4 (gtag consent update) | `localStorage.ai_cookie_consent_v1=accepted`, `cookieConsentUpdated` event, `gtag('consent','update', granted)` |
| Cookie consent banner — Reject All | [components/cookie-consent-v3.tsx](components/cookie-consent-v3.tsx) | dismiss | — | GA4 | `ai_cookie_consent_v1=rejected`, `gtag('consent','update', denied)` |
| Cookie consent banner — Manage preferences | [components/cookie-consent-v3.tsx](components/cookie-consent-v3.tsx) | open preferences modal | — | GA4 | per-category opt-in then `updateConsentMode()` |
| Sticky top bar | [components/sticky-top-bar.tsx](components/sticky-top-bar.tsx) | (announcement link) | — | — | env-gated copy |
| Adopt sticky mobile bar | [components/adopt/adopt-sticky-mobile-bar.tsx](components/adopt/adopt-sticky-mobile-bar.tsx) | monthlyUrl / yearlyUrl | — | Stripe / Mollie | only on `/adopt`; auto-show on scroll-up |
| ClientErrorReporter | [components/client-error-reporter.tsx#L23](components/client-error-reporter.tsx#L23) | — | POST `/api/log-error` | — | sendBeacon → ring buffer + Vercel logs |
| VercelInstrumentation / WebVitals | [components/vercel-instrumentation.tsx](components/vercel-instrumentation.tsx), [components/web-vitals.tsx](components/web-vitals.tsx) | — | (none) | GA4 | beacon CWV → GA4 once consent granted |

---

### A.2 `/` — Homepage [app/[locale]/page.tsx](app/%5Blocale%5D/page.tsx)
| Label | file:line | Target | External | Side-effects |
|---|---|---|---|---|
| Hero primary CTA "Book a tour" | [page.tsx#L243-L246](app/%5Blocale%5D/page.tsx#L243-L246) | `FAREHARBOR_BOOKING_URL` (+ ref if validated) | FareHarbor | new-tab; honours `?ref=` via `REFERRAL_CODE_RE` |
| Hero secondary CTA "Browse shop" | [page.tsx#L247-L250](app/%5Blocale%5D/page.tsx#L247-L250) | `/${locale}/shop` | — | — |
| ChoicePath card — Tour | [page.tsx#L96-L102](app/%5Blocale%5D/page.tsx#L96-L102) | `/${locale}/tours` | — | — |
| ChoicePath card — Shop | [page.tsx#L103-L109](app/%5Blocale%5D/page.tsx#L103-L109) | `/${locale}/shop/woven` | — | — |
| ChoicePath card — Commission | [page.tsx#L110-L116](app/%5Blocale%5D/page.tsx#L110-L116) | `/${locale}/shop/commission` | — | — |
| ChoicePath card — Alcaca | [page.tsx#L117-L123](app/%5Blocale%5D/page.tsx#L117-L123) | `/${locale}/shop/alcaca` | — | — |
| WeavingShowcase CTA "Browse collection" | [page.tsx#L283-L290](app/%5Blocale%5D/page.tsx#L283-L290) | `/${locale}/shop/woven` | — | — |
| ExperienceCard — Weddings | [page.tsx#L162-L168](app/%5Blocale%5D/page.tsx#L162-L168) | `/${locale}/weddings` | — | — |
| ExperienceCard — Adopt | [page.tsx#L169-L175](app/%5Blocale%5D/page.tsx#L169-L175) | `/${locale}/adopt` | — | — |
| ExperienceCard — Yoga | [page.tsx#L176-L182](app/%5Blocale%5D/page.tsx#L176-L182) | `/${locale}/yoga` | — | — |
| ExperienceCard — Workshops | [page.tsx#L183-L189](app/%5Blocale%5D/page.tsx#L183-L189) | `/${locale}/workshops` | — | — |
| ExperienceCard — Corporate | [page.tsx#L190-L196](app/%5Blocale%5D/page.tsx#L190-L196) | `/${locale}/experiences/corporate-team-building` | — | — |
| Skein callout CTA (env-gated) | [page.tsx#L337-L344](app/%5Blocale%5D/page.tsx#L337-L344) | `/${locale}/skein` | — | gated by `SKEIN_CALLOUT_LIVE` |
| Membership callout CTA (env-gated) | [page.tsx#L360-L365](app/%5Blocale%5D/page.tsx#L360-L365) | `/${locale}/membership` | — | gated by `MEMBERSHIP_LIVE` |
| Herd Family callout CTA (env-gated) | [page.tsx#L382-L387](app/%5Blocale%5D/page.tsx#L382-L387) | `/${locale}/herd-family` | — | gated by `HERD_FAMILY_LIVE` |
| ReviewCard translate buttons (×3) | [components/review-translate-button.tsx#L66](components/review-translate-button.tsx#L66) | inline swap | POST `/api/translate` | MyMemory | 24 h client cache; renders null if same locale |
| "Read more on Facebook" | [page.tsx#L425-L437](app/%5Blocale%5D/page.tsx#L425-L437) | facebook.com profile | Facebook | new-tab |
| Final CTA — Book a tour | [page.tsx#L452-L459](app/%5Blocale%5D/page.tsx#L452-L459) | `FAREHARBOR_BOOKING_URL` | FareHarbor | new-tab |
| Final CTA — Explore shop | [page.tsx#L460-L465](app/%5Blocale%5D/page.tsx#L460-L465) | `/${locale}/shop` | — | — |
| Newsletter form — Subscribe | [components/newsletter-form.tsx#L63](components/newsletter-form.tsx#L63) | POST `/api/newsletter` | Resend / SendGrid (List-Unsubscribe header) | sends confirm email (HMAC token), rate-limit 3/24 h per email, 200 always |
| AdoptersCounterBadge | [components/adopters-counter-badge.tsx](components/adopters-counter-badge.tsx) | — (server count) | (server fetch via `getActiveAdopterCount`) | Mollie/Stripe | renders null if 0/unconfigured |
| AlpacaCamEmbed iframe | [components/alpaca-cam-embed.tsx](components/alpaca-cam-embed.tsx) | env URL | YouTube/Twitch/Vimeo embed (origin allowlist) | YT/TW/Vimeo | renders null until `ALPACA_CAM_EMBED_URL` set |
| AlpacaOfTheDay link | [components/alpaca-of-the-day.tsx](components/alpaca-of-the-day.tsx) | `/${locale}/alpacas/<slug>` | — | deterministic per UTC day |
| GoogleReviewsBadge | [components/google-reviews-badge.tsx#L30](components/google-reviews-badge.tsx#L30) | review link | GET `/api/google-reviews` | Google Places API | renders null if keys unset |
| SocialProofStrip | [components/social-proof-strip.tsx](components/social-proof-strip.tsx) | — | GET `/api/social-proof` | FareHarbor | fallback copy if unconfigured |
| PressLogos | [components/press-logos.tsx](components/press-logos.tsx) | (image links) | — | — | renders null when no live logos |
| CampaignBannerGeneric (slot=home) | [components/campaign-banner-generic.tsx](components/campaign-banner-generic.tsx) | env URL | — | gated by `CAMPAIGN_HOME_LIVE` |
| AwardsBadges | [components/awards-badges.tsx](components/awards-badges.tsx) | external award URLs | — | new-tab |

---

### A.3 `/tours` [app/[locale]/tours/page.tsx](app/%5Blocale%5D/tours/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| Hero CTA "Book your tour" | [tours/page.tsx#L127-L130](app/%5Blocale%5D/tours/page.tsx#L127-L130) | `FAREHARBOR_BOOKING_URL` | — | FareHarbor | new-tab |
| "Plan special events" CTA | [tours/page.tsx#L191-L197](app/%5Blocale%5D/tours/page.tsx#L191-L197) | `/${locale}/contact` | — | — | — |
| FareHarborCalendar widget | [components/booking/fareharbor-calendar.tsx](components/booking/fareharbor-calendar.tsx) | inline FH widget | — | FareHarbor JS | embed loads `book.fareharbor.com` script |
| "Book now" text link below calendar | [tours/page.tsx#L261-L268](app/%5Blocale%5D/tours/page.tsx#L261-L268) | `FAREHARBOR_BOOKING_URL` | — | FareHarbor | new-tab |
| AvailabilityUrgency | [components/booking/availability-urgency.tsx#L22](components/booking/availability-urgency.tsx#L22) | — | GET `/api/availability` | FareHarbor | 503 hides widget; shared client-side promise cache |
| RecentBookingsTicker | [components/tours/recent-bookings-ticker.tsx](components/tours/recent-bookings-ticker.tsx) | — | (static data lookup) | — | renders null until `lib/data/social-proof.ts` populated |
| BundleCta (slot=tour-yoga) | [components/tours/bundle-cta.tsx](components/tours/bundle-cta.tsx) | env URL | — | — | gated by `BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR > 0` |
| WaitlistForm — Join waitlist | [components/booking/waitlist-form.tsx#L58](components/booking/waitlist-form.tsx#L58) | POST `/api/waitlist` | Resend | always-200 anti-enumeration; honeypot + Turnstile + IP + per-email RL |
| ReviewCard translate (×6) | [components/review-translate-button.tsx](components/review-translate-button.tsx) | — | POST `/api/translate` | MyMemory | client cache |
| "Read more on Facebook" | [tours/page.tsx#L384-L391](app/%5Blocale%5D/tours/page.tsx#L384-L391) | FB profile | Facebook | new-tab |
| AdoptCrossSell CTA | [components/tours/adopt-cross-sell.tsx](components/tours/adopt-cross-sell.tsx) | `/${locale}/adopt` | — | — | — |

---

### A.4 `/adopt` [app/[locale]/adopt/page.tsx](app/%5Blocale%5D/adopt/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| AdoptThankYou (success-state) "Manage adoption" | [components/adopt-thank-you.tsx#L105](components/adopt-thank-you.tsx#L105) | reads donor name | GET `/api/checkout-session/[id]` | Stripe | renders only when `?checkout=success` |
| ReferralAppliedBanner | [components/adopt/referral-applied-banner.tsx](components/adopt/referral-applied-banner.tsx) | — | — | — | reads `?referral=` / `?ref=` |
| CampaignBanner (env headline) | [components/adopt/campaign-banner.tsx](components/adopt/campaign-banner.tsx) | env CTA | — | — | gated by `ADOPT_CAMPAIGN_HEADLINE` etc. |
| AdopterCounter | [components/adopt/adopter-counter.tsx](components/adopt/adopter-counter.tsx) | — | (server-side `getActiveAdopterCount`) | Mollie/Stripe | renders 0 gracefully |
| AlpacaPersonalityMatch quiz CTAs | [components/adopt/alpaca-personality-match.tsx](components/adopt/alpaca-personality-match.tsx) | `/${locale}/adopt?alpaca=<slug>` | — | — | navigates with picker selection |
| AlpacaPicker cards | [components/adopt/alpaca-picker.tsx](components/adopt/alpaca-picker.tsx) | `/${locale}/adopt?alpaca=<slug>` | — | — | scrolls to `#cta` |
| AdoptGiftAdoption toggle + fields | [components/adopt/adopt-gift-adoption.tsx](components/adopt/adopt-gift-adoption.tsx) | URL params `gift_name`, `gift_email`, `gift_deliver` | — | — | client-only URL update |
| GreetingCardPicker | [components/adopt/greeting-card-picker.tsx](components/adopt/greeting-card-picker.tsx) | URL param `card` | — | — | renders null when no live cards in `lib/data/greeting-cards.ts` |
| TierComparison — Monthly CTA | [components/adopt/tier-comparison.tsx](components/adopt/tier-comparison.tsx) | `monthlyUrl` (Stripe / Mollie) | — | Stripe or Mollie | hosted checkout; fallback `mailto:` |
| TierComparison — Yearly CTA | same | `yearlyUrl` | — | Stripe or Mollie | hosted checkout |
| AdoptTierCard — Monthly | [components/adopt/adopt-tier-card.tsx](components/adopt/adopt-tier-card.tsx) (monthly) | `monthlyUrl` | — | Stripe or Mollie | GA4 event via `AdoptCheckoutLink` |
| AdoptTierCard — Yearly | same | `yearlyUrl` | — | Stripe or Mollie | GA4 event |
| JuniorTierCard | [components/adopt/junior-tier-card.tsx](components/adopt/junior-tier-card.tsx) | POST `/api/junior-checkout` | POST `/api/junior-checkout` | Stripe | renders null unless `JUNIOR_TIER_LIVE=true` AND `JUNIOR_TIER_PRICE_EUR>0` |
| "Or arrange a visit instead →" | [adopt/page.tsx#L432-L437](app/%5Blocale%5D/adopt/page.tsx#L432-L437) | `/${locale}/tours` | — | — | — |
| EmbeddedCheckout (Stripe Elements) | [components/adopt/embedded-checkout.tsx#L95](components/adopt/embedded-checkout.tsx#L95) | — | POST `/api/checkout/intent`, POST `/api/checkout/confirm` | Stripe | gated by `CHECKOUT_MODE=embedded` AND `PAYMENT_VENDOR=stripe` |
| EmbeddedMollieCheckout | [components/adopt/embedded-mollie-checkout.tsx#L140](components/adopt/embedded-mollie-checkout.tsx#L140), [#L283](components/adopt/embedded-mollie-checkout.tsx#L283) | — | POST `/api/mollie-checkout/intent`, POST `/api/mollie-checkout/confirm` | Mollie | gated by Mollie embedded mode |
| AdoptCheckoutLink (monthly CTA at #cta) | [components/adopt/adopt-checkout-link.tsx](components/adopt/adopt-checkout-link.tsx) | monthlyUrl | — | Stripe / Mollie / mailto | GA4 `begin_checkout` event |
| AdoptCheckoutLink (yearly) | same | yearlyUrl | — | Stripe / Mollie | GA4 |
| RepeatCta — Monthly | [components/adopt/repeat-cta.tsx](components/adopt/repeat-cta.tsx) | monthlyUrl | — | Stripe / Mollie | duplicate of CTA above |
| RepeatCta — Yearly | same | yearlyUrl | — | Stripe / Mollie | — |
| BillingPortalLink — "Manage subscription" | [components/billing-portal-link.tsx](components/billing-portal-link.tsx) | POST `/api/billing-portal` | POST `/api/billing-portal` | Stripe portal *or* Mollie manage | email-oracle closure (URL via email, never JSON) |
| AdoptStickyMobileBar — Adopt | [components/adopt/adopt-sticky-mobile-bar.tsx](components/adopt/adopt-sticky-mobile-bar.tsx) | monthlyUrl/yearlyUrl | — | Stripe / Mollie | mobile-only |
| AdoptPageTracker | [components/adopt/adopt-page-tracker.tsx](components/adopt/adopt-page-tracker.tsx) | — | — | GA4 | `page_view` once per render |
| AdoptionCertificatePreview | [components/adopt/adoption-certificate-preview.tsx](components/adopt/adoption-certificate-preview.tsx) | — | — | — | personalises with `?alpaca=<slug>` |
| TestimonialsWall (renders null if empty) | [components/testimonials-wall.tsx](components/testimonials-wall.tsx) | — | — | — | gated by `lib/data/testimonials.ts` |
| GoogleReviewsWall | [components/google-reviews-wall.tsx](components/google-reviews-wall.tsx) | — | GET `/api/google-reviews` | Google Places | fail-quiet |
| AdoptersWall chips | [components/adopt/adopters-wall.tsx](components/adopt/adopters-wall.tsx) | — | (server) | Mollie/Stripe | renders null until vendor configured |

---

### A.5 `/gifts` [app/[locale]/gifts/page.tsx](app/%5Blocale%5D/gifts/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| Hero CTA "Buy a gift voucher" | [gifts/page.tsx#L96-L99](app/%5Blocale%5D/gifts/page.tsx#L96-L99) | `#gift-booking` anchor | — | — | smooth scroll |
| GiftFlow wizard — step controls (Continue / Back) | [components/gifts/gift-flow.tsx](components/gifts/gift-flow.tsx) | inline state | — | — | client-only |
| GiftFlow — "Open secure checkout" (tour) | [components/gifts/gift-flow.tsx](components/gifts/gift-flow.tsx) | `getFareHarborEmbedUrl()` | — | FareHarbor | new-tab embed |
| GiftFlow — Adoption monthly | same | `paymentAdapter.buildAdoptCheckoutUrl('monthly')` | — | Stripe / Mollie | hosted checkout |
| GiftFlow — Adoption yearly | same | `paymentAdapter.buildAdoptCheckoutUrl('yearly')` | — | Stripe / Mollie | hosted checkout |
| GiftFlow — Shop credit | same | `mailto:info@alpacasibiza.com?subject=Shop credit gift voucher` | — | mailto | OS mail |
| Direct FareHarborCalendar embed | [components/booking/fareharbor-calendar.tsx](components/booking/fareharbor-calendar.tsx) | inline FH widget | — | FareHarbor | — |
| "Redeem it here" link | [gifts/page.tsx#L249-L254](app/%5Blocale%5D/gifts/page.tsx#L249-L254) | `/${locale}/redeem-voucher` | — | — | — |

---

### A.6 `/redeem-voucher` [app/[locale]/redeem-voucher/page.tsx](app/%5Blocale%5D/redeem-voucher/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| Voucher input + "Redeem voucher" submit | [redeem-voucher/page.tsx#L134-L140](app/%5Blocale%5D/redeem-voucher/page.tsx#L134-L140) | POST `/api/voucher-redeem` | POST `/api/voucher-redeem` | — | always-200; valid-vs-invalid soft message |
| Success state — "Book your visit →" | [redeem-voucher/page.tsx#L83-L88](app/%5Blocale%5D/redeem-voucher/page.tsx#L83-L88) | `/${locale}/tours` | — | — | — |
| Success state — "Questions? Contact us" | [redeem-voucher/page.tsx#L89-L94](app/%5Blocale%5D/redeem-voucher/page.tsx#L89-L94) | `/${locale}/contact` | — | — | — |
| "info@alpacasibiza.com" mailto in error message | [redeem-voucher/page.tsx#L124-L128](app/%5Blocale%5D/redeem-voucher/page.tsx#L124-L128) | mailto | — | mailto | — |

---

### A.7 `/my-adoption` [app/[locale]/my-adoption/page.tsx](app/%5Blocale%5D/my-adoption/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| Herd Diary deep-link | [my-adoption/page.tsx#L211-L225](app/%5Blocale%5D/my-adoption/page.tsx#L211-L225) | `/${locale}/alpacas/<slug>#diary` *or* `/${locale}/herd-diary` | — | — | — |
| "Update payment method" | [my-adoption/page.tsx#L349-L356](app/%5Blocale%5D/my-adoption/page.tsx#L349-L356) | GET `/api/mollie-manage/update-payment?token=…` (303→Mollie) | GET `/api/mollie-manage/update-payment` | Mollie | creates verification payment + relink on webhook |
| "Cancel adoption" | [my-adoption/page.tsx#L357-L364](app/%5Blocale%5D/my-adoption/page.tsx#L357-L364) | GET `/api/mollie-manage/cancel?token=…` | GET `/api/mollie-manage/cancel` | Mollie | cancels subscription; owner notify; redirects to `/cancel-feedback` |
| "Adopt again" (post-cancel) | [my-adoption/page.tsx#L365-L372](app/%5Blocale%5D/my-adoption/page.tsx#L365-L372) | `/${locale}/adopt` | — | — | — |
| ShareCTA (copy link) | [components/donor-portal/share-cta.tsx](components/donor-portal/share-cta.tsx) | clipboard | — | — | client-only |
| ReferralCodeBadge (copy code) | [app/[locale]/my-adoption/referral-code-badge.tsx](app/%5Blocale%5D/my-adoption/referral-code-badge.tsx) | clipboard | — | — | — |
| info@alpacasibiza.com mailto | [my-adoption/page.tsx#L459-L461](app/%5Blocale%5D/my-adoption/page.tsx#L459-L461) | mailto | — | — | — |
| PhotoGallery (rendered empty-safe) | [components/donor-portal/photo-gallery.tsx](components/donor-portal/photo-gallery.tsx) | — | — | — | hint-state when empty |
| PaymentHistoryTable | [components/donor-portal/payment-history-table.tsx](components/donor-portal/payment-history-table.tsx) | — | — | — | hint-state when empty |

---

### A.8 `/herd-diary` [app/[locale]/herd-diary/page.tsx](app/%5Blocale%5D/herd-diary/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Alpaca chip in event card | [herd-diary/page.tsx#L142-L153](app/%5Blocale%5D/herd-diary/page.tsx#L142-L153) | `/${locale}/alpacas/<slug>` | per event |

(Empty state when `liveHerdEvents()` returns []; no buttons rendered.)

---

### A.9 `/herd-family` [app/[locale]/herd-family/page.tsx](app/%5Blocale%5D/herd-family/page.tsx) (env-gated `HERD_FAMILY_LIVE`)
| Label | file:line | Target | External | Side-effects |
|---|---|---|---|---|
| Hero CTA "Join the herd monthly" | [herd-family/page.tsx#L89-L94](app/%5Blocale%5D/herd-family/page.tsx#L89-L94) | `monthlyUrl` | Stripe / Mollie | hosted checkout; fallback mailto |
| Pricing card "Adopt monthly" | [herd-family/page.tsx#L136-L141](app/%5Blocale%5D/herd-family/page.tsx#L136-L141) | `monthlyUrl` | Stripe / Mollie | — |
| "Compare all plans (including yearly) →" | [herd-family/page.tsx#L147-L152](app/%5Blocale%5D/herd-family/page.tsx#L147-L152) | `/${locale}/adopt` | — | — |

---

### A.10 `/preferences` [app/[locale]/preferences/page.tsx](app/%5Blocale%5D/preferences/page.tsx) (token-gated)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| Token validation on mount | [preferences/page.tsx#L135](app/%5Blocale%5D/preferences/page.tsx#L135) | — | GET `/api/email-preferences?token=…&validate=1` | — | 400/410 → "Link not valid" state |
| "Stop these emails" (birthday) | [preferences/page.tsx#L248-L266](app/%5Blocale%5D/preferences/page.tsx#L248-L266) | POST `/api/email-preferences` `{token, action:'unsubscribe', type:'birthday'}` | — | per-category opt-out |
| "Stop these emails" (quarterly) | same | POST `/api/email-preferences` type=quarterly | — | — |
| "Stop these emails" (renewal) | same | POST `/api/email-preferences` type=renewal | — | — |
| UnsubscribeAllButton — "Unsubscribe from everything" | [preferences/page.tsx#L92-L99](app/%5Blocale%5D/preferences/page.tsx#L92-L99) | POST `/api/email-preferences` ×3 in parallel, then `router.push('/${locale}/newsletter/unsubscribed')` | — | one POST per category |
| "Contact us" links in error states | [preferences/page.tsx#L195-L202](app/%5Blocale%5D/preferences/page.tsx#L195-L202) | `/${locale}/contact` | — | — |
| "Done — back to the farm" | [preferences/page.tsx#L294-L300](app/%5Blocale%5D/preferences/page.tsx#L294-L300) | `/${locale}` | — | — |

---

### A.11 `/membership` [app/[locale]/membership/page.tsx](app/%5Blocale%5D/membership/page.tsx) (env-gated `MEMBERSHIP_LIVE`)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| `<form action="/api/membership-checkout" method="POST">` Submit "Get your pass" | [membership/page.tsx#L100-L107](app/%5Blocale%5D/membership/page.tsx#L100-L107) | POST `/api/membership-checkout` | POST `/api/membership-checkout` | Stripe | 303→Stripe Checkout; 503 if `STRIPE_MEMBERSHIP_PRICE_ID` unset |

---

### A.12 `/skein` [app/[locale]/skein/page.tsx](app/%5Blocale%5D/skein/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| Primary CTA "Sponsor {name}" | [skein/page.tsx#L185-L192](app/%5Blocale%5D/skein/page.tsx#L185-L192) | `/api/skein-checkout?alpaca=…&locale=…[&gift_*]` | GET `/api/skein-checkout` | Stripe | 303→Stripe Checkout |
| Secondary CTA "Pick for me" | [skein/page.tsx#L196-L201](app/%5Blocale%5D/skein/page.tsx#L196-L201) | `/api/skein-checkout?alpaca=any` | GET `/api/skein-checkout` | Stripe | — |
| AlpacaPicker | [components/adopt/alpaca-picker.tsx](components/adopt/alpaca-picker.tsx) | `?alpaca=<slug>` | — | — | re-renders page |
| SkeinGiftToggle | [components/skein/skein-gift-toggle.tsx](components/skein/skein-gift-toggle.tsx) | `?gift_*=…` | — | — | reveals fields |

---

### A.13 `/skein/thank-you` [app/[locale]/skein/thank-you/page.tsx](app/%5Blocale%5D/skein/thank-you/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| info@alpacasibiza.com mailto | [skein/thank-you/page.tsx#L82-L87](app/%5Blocale%5D/skein/thank-you/page.tsx#L82-L87) | mailto | — |
| "Back to skein sponsorships" | [skein/thank-you/page.tsx#L99-L113](app/%5Blocale%5D/skein/thank-you/page.tsx#L99-L113) | `/${locale}/skein` | — |
| "Adopt an alpaca →" | [skein/thank-you/page.tsx#L114-L128](app/%5Blocale%5D/skein/thank-you/page.tsx#L114-L128) | `/${locale}/adopt` | — |
| "Back to the farm →" | [skein/thank-you/page.tsx#L130-L139](app/%5Blocale%5D/skein/thank-you/page.tsx#L130-L139) | `/${locale}` | — |

---

### A.14 `/tour-confirmation` [app/[locale]/tour-confirmation/page.tsx](app/%5Blocale%5D/tour-confirmation/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| "Download .ics" | [tour-confirmation/page.tsx#L128-L135](app/%5Blocale%5D/tour-confirmation/page.tsx#L128-L135) | GET `/api/tour-ics?...` | GET `/api/tour-ics` | — | streams calendar file |
| "Google Calendar" | [tour-confirmation/page.tsx#L138-L147](app/%5Blocale%5D/tour-confirmation/page.tsx#L138-L147) | calendar.google.com deep link | — | Google Calendar | new-tab |
| "Directions & how to find us →" | [tour-confirmation/page.tsx#L177-L182](app/%5Blocale%5D/tour-confirmation/page.tsx#L177-L182) | `/${locale}/visit` | — | — | — |
| Cross-sell "Adopt" | [tour-confirmation/page.tsx#L197-L202](app/%5Blocale%5D/tour-confirmation/page.tsx#L197-L202) | `/${locale}/adopt` | — | — | — |
| Cross-sell "Meet the herd" | [tour-confirmation/page.tsx#L209-L214](app/%5Blocale%5D/tour-confirmation/page.tsx#L209-L214) | `/${locale}/alpacas` | — | — | — |
| "Back to Alpacas Ibiza" | [tour-confirmation/page.tsx#L222-L227](app/%5Blocale%5D/tour-confirmation/page.tsx#L222-L227) | `/${locale}` | — | — | — |

---

### A.15 `/shop` [app/[locale]/shop/page.tsx](app/%5Blocale%5D/shop/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Card — Woven Collection | [shop/page.tsx#L51-L57](app/%5Blocale%5D/shop/page.tsx#L51-L57) | `/${locale}/shop/woven` | — |
| Card — Custom Commission | [shop/page.tsx#L58-L63](app/%5Blocale%5D/shop/page.tsx#L58-L63) | `/${locale}/shop/commission` | — |
| Card — Alcaca | [shop/page.tsx#L64-L69](app/%5Blocale%5D/shop/page.tsx#L64-L69) | `/${locale}/shop/alcaca` | — |
| Card — Name Your Skein | [shop/page.tsx#L70-L76](app/%5Blocale%5D/shop/page.tsx#L70-L76) | `/${locale}/skein` | — |

### A.16 `/shop/alcaca` [app/[locale]/shop/alcaca/page.tsx](app/%5Blocale%5D/shop/alcaca/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Tier card "Enquire" (×3) | [alcaca/page.tsx#L161-L166](app/%5Blocale%5D/shop/alcaca/page.tsx#L161-L166) | `/${locale}/shop/commission?product=<slug>` | populates form preselect |

### A.17 `/shop/woven` [app/[locale]/shop/woven/page.tsx](app/%5Blocale%5D/shop/woven/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Placeholder card "Enquire" (×6) | [woven/page.tsx#L126-L131](app/%5Blocale%5D/shop/woven/page.tsx#L126-L131) | `/${locale}/shop/commission` | all 6 cards UNMAPPED |

### A.18 `/shop/commission` [app/[locale]/shop/commission/page.tsx](app/%5Blocale%5D/shop/commission/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| CommissionForm — Submit | [components/commission-form.tsx#L289](components/commission-form.tsx#L289) | POST `/api/commission` | POST `/api/commission` | Resend, Turnstile, honeypot | replies to `email`; rate-limit 2/5 min/IP |

---

### A.19 `/contact` [app/[locale]/contact/page.tsx](app/%5Blocale%5D/contact/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| Phone tel: | [contact/page.tsx#L122-L124](app/%5Blocale%5D/contact/page.tsx#L122-L124) | `tel:+32475586544` | — | — | — |
| info@alpacasibiza.com mailto | [contact/page.tsx#L136-L138](app/%5Blocale%5D/contact/page.tsx#L136-L138) | mailto | — | — | — |
| ContactForm — Submit | [components/contact-form.tsx#L270](components/contact-form.tsx#L270) | POST `/api/contact` | POST `/api/contact` | Resend, Turnstile, honeypot | rate-limit 2/5 min/IP; CRLF strip on `subject` |
| TenantMap iframe | [components/tenant-map.tsx](components/tenant-map.tsx) | OSM iframe (fallback) / Google Maps embed | — | OpenStreetMap or Google Maps Embed | fail-open to OSM |

---

### A.20 `/weddings` [app/[locale]/weddings/page.tsx](app/%5Blocale%5D/weddings/page.tsx)
| Label | file:line | Target | External | Side-effects |
|---|---|---|---|---|
| Primary CTA "Book at farm" (BookingButton product=weddings) | [weddings/page.tsx#L213-L218](app/%5Blocale%5D/weddings/page.tsx#L213-L218) | `getProductBookingUrl('weddings')` | FareHarbor | new-tab; fallback main calendar if `FAREHARBOR_ITEM_WEDDINGS` unset |
| Secondary CTA "Off-site inquiry" | [weddings/page.tsx#L223-L228](app/%5Blocale%5D/weddings/page.tsx#L223-L228) | `/${locale}/contact?subject=Wedding inquiry` | — | preselects subject |

### A.21 `/yoga` [app/[locale]/yoga/page.tsx](app/%5Blocale%5D/yoga/page.tsx)
| Label | file:line | Target | External | Side-effects |
|---|---|---|---|---|
| Hero CTA | [yoga/page.tsx#L146-L149](app/%5Blocale%5D/yoga/page.tsx#L146-L149) | `getFareHarborItemUrl(FAREHARBOR_ITEM_YOGA)` | FareHarbor | fail-open main calendar |
| Section CTA "Book" | [yoga/page.tsx#L251-L256](app/%5Blocale%5D/yoga/page.tsx#L251-L256) | same URL | FareHarbor | — |
| Secondary CTA private group mailto | [yoga/page.tsx#L257-L262](app/%5Blocale%5D/yoga/page.tsx#L257-L262) | `mailto:info@alpacasibiza.com?subject=Private+Yoga+Group+Inquiry` | mailto | — |
| BundleCta tour-yoga slot | [components/tours/bundle-cta.tsx](components/tours/bundle-cta.tsx) | env URL | — | gated |

### A.22 `/workshops` [app/[locale]/workshops/page.tsx](app/%5Blocale%5D/workshops/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Hero CTA "Request a workshop" | [workshops/page.tsx#L184-L191](app/%5Blocale%5D/workshops/page.tsx#L184-L191) | `/contact?subject=Workshop inquiry` | preselect |
| Section CTA "Request a workshop" | [workshops/page.tsx#L273-L278](app/%5Blocale%5D/workshops/page.tsx#L273-L278) | `/${locale}/contact?subject=Workshop inquiry` | preselect |

### A.23 `/visit` [app/[locale]/visit/page.tsx](app/%5Blocale%5D/visit/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Google Maps direction link | [visit/page.tsx#L156-L162](app/%5Blocale%5D/visit/page.tsx#L156-L162) | `https://maps.google.com/?q=…` | new-tab |
| Apple Maps direction link | [visit/page.tsx#L164-L170](app/%5Blocale%5D/visit/page.tsx#L164-L170) | `https://maps.apple.com/?ll=…` | new-tab |
| Cross-link "Tour durations" | [visit/page.tsx#L219-L221](app/%5Blocale%5D/visit/page.tsx#L219-L221) | `/${locale}/tours` | — |
| Cross-link "Contact" (service animals) | [visit/page.tsx#L281-L283](app/%5Blocale%5D/visit/page.tsx#L281-L283) | `/${locale}/contact` | — |
| Cross-link "Press kit" | [visit/page.tsx#L352-L354](app/%5Blocale%5D/visit/page.tsx#L352-L354) | `/${locale}/press-kit` | — |
| Footer CTA "Book a tour" | [visit/page.tsx#L370-L374](app/%5Blocale%5D/visit/page.tsx#L370-L374) | `/${locale}/tours` | — |
| Footer CTA "See herd" | [visit/page.tsx#L375-L379](app/%5Blocale%5D/visit/page.tsx#L375-L379) | `/${locale}/alpacas` | — |
| Footer CTA "Contact" | [visit/page.tsx#L381-L385](app/%5Blocale%5D/visit/page.tsx#L381-L385) | `/${locale}/contact` | — |
| VirtualFarmTour stops | [components/virtual-farm-tour.tsx](components/virtual-farm-tour.tsx) | inline images | — | renders null until live stops added |

### A.24 `/experiences` [app/[locale]/experiences/page.tsx](app/%5Blocale%5D/experiences/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| ExperienceCompare row CTA (×7) | [components/experiences/experience-compare.tsx](components/experiences/experience-compare.tsx) | per-experience `href(locale)` | — |

### A.25 `/experiences/family-farm-days` [app/[locale]/experiences/family-farm-days/page.tsx](app/%5Blocale%5D/experiences/family-farm-days/page.tsx)
| Label | file:line | Target | External | Side-effects |
|---|---|---|---|---|
| Hero CTA "Book" | [family-farm-days/page.tsx#L83-L86](app/%5Blocale%5D/experiences/family-farm-days/page.tsx#L83-L86) | `getProductBookingUrl('family-farm-days')` | FareHarbor | fail-open |
| FareHarborCalendar | [components/booking/fareharbor-calendar.tsx](components/booking/fareharbor-calendar.tsx) | inline embed | FareHarbor | item-scoped |

### A.26 `/experiences/corporate-team-building`
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Hero CTA | [corporate-team-building/page.tsx#L93-L96](app/%5Blocale%5D/experiences/corporate-team-building/page.tsx#L93-L96) | `/${locale}/contact` | — |
| CorporateEnquiryForm | [components/corporate-enquiry-form.tsx#L123](components/corporate-enquiry-form.tsx#L123) | POST `/api/contact` | Resend / Turnstile / honeypot | — |

### A.27 `/experiences/romantic-sunset`
| Label | file:line | Target | External | Side-effects |
|---|---|---|---|---|
| Hero CTA | [romantic-sunset/page.tsx#L49-L54](app/%5Blocale%5D/experiences/romantic-sunset/page.tsx#L49-L54) | `getProductBookingUrl('romantic-sunset')` | FareHarbor | fail-open |
| Proposal CTA | [romantic-sunset/page.tsx#L97-L102](app/%5Blocale%5D/experiences/romantic-sunset/page.tsx#L97-L102) | `/${locale}/contact?subject=Proposal+inquiry` | — | preselect |

---

### A.28 `/alpacas` [app/[locale]/alpacas/page.tsx](app/%5Blocale%5D/alpacas/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| AlpacaSearchFilter chip toggles | [components/alpacas/alpaca-search-filter.tsx](components/alpacas/alpaca-search-filter.tsx) | URL `?p=`, `?c=`, `?b=` | server re-render |
| AlpacaCard "See profile" | [components/alpaca-card.tsx](components/alpaca-card.tsx) | `/${locale}/alpacas/<slug>` | — |
| AlpacaCard "Adopt" (when `showAdoptCta`) | same | `/${locale}/adopt?alpaca=<slug>` | — |
| AlpacaFunFactCarousel chevrons | [components/alpacas/alpaca-fun-fact-carousel.tsx](components/alpacas/alpaca-fun-fact-carousel.tsx) | inline state | client-only |

### A.29 `/alpacas/[slug]` [app/[locale]/alpacas/[slug]/page.tsx](app/%5Blocale%5D/alpacas/%5Bslug%5D/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| AlpacaDetailHero adopt CTA | [components/alpaca-detail-hero.tsx](components/alpaca-detail-hero.tsx) | `/${locale}/adopt?alpaca=<slug>` | — |
| ShareAlpacaButton | [components/alpacas/share-alpaca-button.tsx](components/alpacas/share-alpaca-button.tsx) | navigator.share / clipboard | client-only |
| AlpacaPeerGrid card links | [components/alpacas/alpaca-peer-grid.tsx](components/alpacas/alpaca-peer-grid.tsx) | `/${locale}/alpacas/<peer>` | — |
| Herd Diary section chips | (per-alpaca filter) | `/${locale}/herd-diary` | — |

---

### A.30 `/journal` [app/[locale]/journal/page.tsx](app/%5Blocale%5D/journal/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| JournalCard link | [components/journal-card.tsx](components/journal-card.tsx) | `/${locale}/journal/<slug>` | — | — | — |
| Empty-state CTA "Get in touch →" | [journal/page.tsx#L149-L154](app/%5Blocale%5D/journal/page.tsx#L149-L154) | `/contact` (or override) | — | — | — |
| NewsletterForm source=journal | [components/newsletter-form.tsx](components/newsletter-form.tsx) | POST `/api/newsletter` | POST `/api/newsletter` | Resend | double opt-in |

### A.31 `/journal/[slug]` [app/[locale]/journal/[slug]/page.tsx](app/%5Blocale%5D/journal/%5Bslug%5D/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| ShareButtons (X / Facebook / Copy link) | [components/share-buttons.tsx](components/share-buttons.tsx) | per-network share URL | new-tab |
| ReadingProgress | [components/reading-progress.tsx](components/reading-progress.tsx) | scroll % | client-only |
| JournalToc | [components/journal-toc.tsx](components/journal-toc.tsx) | `#h2-id` anchors | smooth scroll |
| NewsletterForm | [components/newsletter-form.tsx](components/newsletter-form.tsx) | POST `/api/newsletter` | — |

---

### A.32 `/about` [app/[locale]/about/page.tsx](app/%5Blocale%5D/about/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Internal cross-links to `/tours`, `/adopt`, `/weaving`, `/shop` | (in-text) | per-link | — |

### A.33 `/sustainability` [app/[locale]/sustainability/page.tsx](app/%5Blocale%5D/sustainability/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Internal cross-links to `/alcaca`, `/alpacas` | (in-text) | per-link | — |

### A.34 `/press` [app/[locale]/press/page.tsx](app/%5Blocale%5D/press/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| "Download press kit" | (page) | `/${locale}/press-kit` | — |
| External press article links | (page) | per-publication | new-tab |

### A.35 `/press-kit` [app/[locale]/press-kit/page.tsx](app/%5Blocale%5D/press-kit/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Asset download links | (page) | `/press/*.zip`, `/images/press/*` | direct download |
| Contact link | (page) | `/${locale}/contact?subject=Press` | — |

### A.36 `/media` [app/[locale]/media/page.tsx](app/%5Blocale%5D/media/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| PhotoGallery category chips | [components/photo-gallery.tsx](components/photo-gallery.tsx) | filter state | client-only; renders null when no live entries |
| EventsCalendar | [components/events-calendar.tsx](components/events-calendar.tsx) | static events | renders null in prod when none live |

### A.37 `/sitemap` [app/[locale]/sitemap/page.tsx](app/%5Blocale%5D/sitemap/page.tsx)
| Label | Target |
|---|---|
| ~50 internal page links | each route under `/[locale]/*` |

### A.38 `/cookies` `/privacy` `/terms` `/impressum`
| Label | Target | Side-effects |
|---|---|---|
| "Manage cookie preferences" | inline → opens vanilla-cookieconsent modal | client-only |
| Privacy / terms internal cross-links | various | — |

---

### A.39 `/cancel-feedback` [app/[locale]/cancel-feedback/page.tsx](app/%5Blocale%5D/cancel-feedback/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| Reason radios + notes + "Submit feedback" | [components/adopt/cancel-feedback-form.tsx#L52](components/adopt/cancel-feedback-form.tsx#L52) | POST `/api/cancel-feedback` | POST `/api/cancel-feedback` | Resend (owner notify) | fire-and-forget |
| "Skip" | same | `/${locale}/adopt` | — | — | — |
| "Re-adopt" link | same | `/${locale}/adopt` | — | — | — |

### A.40 `/recover-certificate` [app/[locale]/recover-certificate/page.tsx](app/%5Blocale%5D/recover-certificate/page.tsx)
| Label | file:line | Target | API | External | Side-effects |
|---|---|---|---|---|---|
| Email field + "Send" | [components/adopt/recover-certificate-form.tsx#L49](components/adopt/recover-certificate-form.tsx#L49) | POST `/api/recover-certificate` | POST `/api/recover-certificate` | Resend, Turnstile | always-200 anti-enum; email side-channel |

### A.41 `/share-adoption` [app/[locale]/share-adoption/page.tsx](app/%5Blocale%5D/share-adoption/page.tsx)
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| "Adopt your own" | [share-adoption/page.tsx#L161-L172](app/%5Blocale%5D/share-adoption/page.tsx#L161-L172) | `/${locale}/adopt[?referral=…]` | propagates `?ref=` |
| OG image (server) | — | `/api/og/adoption-share?alpaca=…` | dynamic OG card |

### A.42 `/newsletter/archive`
| Label | file:line | Target | Side-effects |
|---|---|---|---|
| Empty-state "Subscribe to the newsletter" | [newsletter/archive/page.tsx#L72-L77](app/%5Blocale%5D/newsletter/archive/page.tsx#L72-L77) | `/${locale}#newsletter` | — |
| "Subscribe to future issues" | [newsletter/archive/page.tsx#L105-L110](app/%5Blocale%5D/newsletter/archive/page.tsx#L105-L110) | `/${locale}#newsletter` | — |

### A.43 `/newsletter/unsubscribed` / `/newsletter-confirmed`
| Label | Target | Side-effects |
|---|---|---|
| "Back to the farm" | `/${locale}` | — |
| Resubscribe CTA | `/${locale}#newsletter` | — |

### A.44 `/weaving` [app/[locale]/weaving/page.tsx](app/%5Blocale%5D/weaving/page.tsx)
| Label | Target | External | Side-effects |
|---|---|---|---|
| Hero / section CTAs cross-link to `/shop/woven`, `/shop/commission` | per-link | — | — |
| External "Wishfulfilling Weaving" | external site | (currently down per CLAUDE notes) | new-tab |

### A.45 `/offline` and `/not-found.tsx`
| Label | Target | Side-effects |
|---|---|---|
| DidYouMean suggestions | `/${locale}/<suggested>` | client computed |
| "Back to home" | `/${locale}` | — |

---

### A.46 Admin panel buttons

#### `/admin` (index) [app/admin/page.tsx](app/admin/page.tsx)
| Label | file:line | Target |
|---|---|---|
| "Today's ops digest" | [admin/page.tsx#L88-L94](app/admin/page.tsx#L88-L94) | `/admin/today` |
| Launch setup wizard | [admin/page.tsx#L18](app/admin/page.tsx#L18) | `/admin/setup` |
| Launch readiness | [admin/page.tsx#L19](app/admin/page.tsx#L19) | `/admin/launch-readiness` |
| Environment check | [admin/page.tsx#L20](app/admin/page.tsx#L20) | `/admin/env-check` |
| Email setup | [admin/page.tsx#L21](app/admin/page.tsx#L21) | `/admin/email-setup` |
| Monitoring | [admin/page.tsx#L24](app/admin/page.tsx#L24) | `/admin/monitoring` |
| FareHarbor migration | [admin/page.tsx#L25](app/admin/page.tsx#L25) | `/admin/migration` |
| Quarterly update | [admin/page.tsx#L26](app/admin/page.tsx#L26) | `/admin/quarterly-update` |
| Email suppressions | [admin/page.tsx#L27](app/admin/page.tsx#L27) | `/admin/suppressions` |
| Content staging | [admin/page.tsx#L30](app/admin/page.tsx#L30) | `/admin/content` |
| Alpaca profiles | [admin/page.tsx#L31](app/admin/page.tsx#L31) | `/admin/alpacas` |
| Analytics overview | [admin/page.tsx#L34](app/admin/page.tsx#L34) | `/admin/analytics` |
| Subscriptions | [admin/page.tsx#L35](app/admin/page.tsx#L35) | `/admin/analytics/subscriptions` |
| Dunning tracker | [admin/page.tsx#L36](app/admin/page.tsx#L36) | `/admin/analytics/dunning` |
| VAT / OSS | [admin/page.tsx#L37](app/admin/page.tsx#L37) | `/admin/analytics/vat` |
| Referrals | [admin/page.tsx#L38](app/admin/page.tsx#L38) | `/admin/analytics/referrals` |
| Events log | [admin/page.tsx#L39](app/admin/page.tsx#L39) | `/admin/analytics/events` |
| Email previews | [admin/page.tsx#L42](app/admin/page.tsx#L42) | `/admin/email-previews` |
| Birthday card test | [admin/page.tsx#L43](app/admin/page.tsx#L43) | `/admin/birthday-test` |
| AdminSignOutButton | [components/admin/sign-out-button.tsx](components/admin/sign-out-button.tsx) | NextAuth `signOut` |

#### Operator action triggers
| Page | Trigger | API | External |
|---|---|---|---|
| `/admin/setup` SetupStep "Verify" | [components/admin/setup-step.tsx#L51](components/admin/setup-step.tsx#L51) | GET `/api/setup-probe?check=…` | Stripe / Mollie / Resend / Turnstile probes |
| `/admin/email-setup` "Send test email" | [components/admin/send-test-email-button.tsx#L29](components/admin/send-test-email-button.tsx#L29) | POST `/api/admin/send-test-email` | Resend |
| `/admin/migration` "Import CSV" | [components/admin/migration-form.tsx#L82](components/admin/migration-form.tsx#L82) | POST `/api/admin/migration-links` | Stripe (price-id construction) |
| `/admin/quarterly-update` Compose form Send | [app/admin/quarterly-update/compose-form.tsx#L60](app/admin/quarterly-update/compose-form.tsx#L60) | POST `/api/admin/quarterly-update` | Resend |
| `/admin/content` Edit form Save | [app/admin/content/content-form.tsx#L382](app/admin/content/content-form.tsx#L382) | POST `/api/admin/content-stage` | — (dev FS only; 501 on Vercel) |
| `/admin/suppressions` Add suppression | [app/admin/suppressions/suppression-table.tsx#L33](app/admin/suppressions/suppression-table.tsx#L33) | GET `/api/admin/suppressions?email=…` | Resend |
| `/admin/suppressions` Add | (same form) | POST `/api/admin/suppressions` | Resend |
| `/admin/suppressions` Remove | (same form) | DELETE `/api/admin/suppressions` | Resend |
| `/admin/analytics/events` "Replay" | [app/admin/analytics/events/replay-button-client.tsx#L36](app/admin/analytics/events/replay-button-client.tsx#L36) | POST `/api/admin/replay-event` | Stripe / Mollie (re-runs handler) |
| `/admin/alpacas/[id]/photos` Upload | [app/admin/alpacas/[id]/photos/photo-manager.tsx#L67](app/admin/alpacas/%5Bid%5D/photos/photo-manager.tsx#L67) | POST `/api/admin/alpacas/upload` | Vercel Blob (or local FS in dev) |
| `/admin/alpacas/[id]/photos` Delete | [app/admin/alpacas/[id]/photos/photo-manager.tsx#L101](app/admin/alpacas/%5Bid%5D/photos/photo-manager.tsx#L101) | DELETE `/api/admin/alpacas/delete-upload` | same |
| `/admin/birthday-test` Trigger | [app/admin/birthday-test/trigger-form.tsx#L73](app/admin/birthday-test/trigger-form.tsx#L73) | GET `/api/alpaca-birthday-cards` | Resend, Mollie (sub scan) |
| `/admin/analytics` AnalyticsDashboard | [components/analytics-dashboard.tsx#L25](components/analytics-dashboard.tsx#L25) | GET `/api/analytics/data` | GA4 Data API |
| `/admin/quarterly-update` preview | (server) | GET `/api/admin/quarterly-update/preview` | — |
| `/admin/quarterly-update` suggest | (server) | GET `/api/admin/quarterly-update/suggest` | — |
| `/admin/login` | NextAuth credentials | POST `/api/auth/[...nextauth]` | NextAuth |
| `/admin/today` | (server-rendered summary) | (in-process reads) | — |

---

## B. API route catalog

Single source of truth for every route in `app/api/`. UI caller column lists the components/pages that hit the route (grepped from `fetch('/api/<route>')` + `<form action="/api/…">` + redirects). Auth and contract columns summarise the failsafe map from CLAUDE.md.

| Route | Methods | File | UI callers | External SDK | Auth gate | Response / contract |
|---|---|---|---|---|---|---|
| `/api/auth/[...nextauth]` | GET / POST | [route.ts](app/api/auth/%5B...nextauth%5D/route.ts) | `/admin/login` form | NextAuth (Credentials) | ADMIN_USERNAME/PASSWORD | session 8 h |
| `/api/availability` | GET | [route.ts](app/api/availability/route.ts#L6) | [booking/availability-urgency.tsx#L22](components/booking/availability-urgency.tsx#L22), [booking/section.tsx#L23](components/booking/section.tsx#L23), [tours/spots-left-banner.tsx#L45](components/tours/spots-left-banner.tsx#L45), [lib/use-availability.ts#L27](lib/use-availability.ts#L27) | FareHarbor | unauthenticated; ISR 1800 s | 503 if keys unset |
| `/api/google-reviews` | GET | [route.ts](app/api/google-reviews/route.ts#L32) | [google-reviews-badge.tsx#L30](components/google-reviews-badge.tsx#L30), GoogleReviewsWall | Google Places | unauth | `{configured:false}` if keys unset |
| `/api/social-proof` | GET | [route.ts](app/api/social-proof/route.ts#L40) | [social-proof-strip.tsx](components/social-proof-strip.tsx) | FareHarbor | unauth | fallback string if unconfigured |
| `/api/search` | GET | [route.ts](app/api/search/route.ts#L7) | [search/site-search.tsx#L43](components/search/site-search.tsx#L43) | — | unauth | static index search |
| `/api/translate` | POST | [route.ts](app/api/translate/route.ts#L94) | [review-translate-button.tsx#L66](components/review-translate-button.tsx#L66) | MyMemory | unauth, RL 30/min/IP | always-200 + cache |
| `/api/contact` | POST | [route.ts](app/api/contact/route.ts#L10) | [contact-form.tsx#L270](components/contact-form.tsx#L270), [corporate-enquiry-form.tsx#L123](components/corporate-enquiry-form.tsx#L123) | Resend | Turnstile, honeypot `company_url`, RL 2/5 min IP | replyTo guarded; CRLF strip |
| `/api/commission` | POST | [route.ts](app/api/commission/route.ts#L10) | [commission-form.tsx#L289](components/commission-form.tsx#L289) | Resend | Turnstile, honeypot `phone_extension`, RL 2/5 min IP | replyTo guarded |
| `/api/newsletter` | POST | [route.ts](app/api/newsletter/route.ts#L29) | [newsletter-form.tsx#L63](components/newsletter-form.tsx#L63) | Resend | Turnstile, honeypot `business_name`, RL 3/24 h email | 200 always; HMAC confirm-link |
| `/api/newsletter/confirm` | GET | [route.ts](app/api/newsletter/confirm/route.ts#L24) | confirm email link | SendGrid optional | HMAC token + safeEqual | 400/410/200; List-Unsubscribe header on follow-up |
| `/api/newsletter/unsubscribe` | GET, POST | [route.ts](app/api/newsletter/unsubscribe/route.ts#L120) | unsubscribe email links + List-Unsubscribe POST | SendGrid optional | HMAC token, scope=unsubscribe | redirect `/${locale}/newsletter/unsubscribed` |
| `/api/email-preferences` | GET, POST | [route.ts](app/api/email-preferences/route.ts#L157) | [preferences/page.tsx#L77](app/%5Blocale%5D/preferences/page.tsx#L77), [#L135](app/%5Blocale%5D/preferences/page.tsx#L135), [#L163](app/%5Blocale%5D/preferences/page.tsx#L163) | (DB only) | HMAC token + scope | `validate=1` returns `{valid,type}` |
| `/api/log-error` | POST | [route.ts](app/api/log-error/route.ts#L33) | [client-error-reporter.tsx#L23](components/client-error-reporter.tsx#L23), [app/error.tsx#L37](app/error.tsx#L37), [app/global-error.tsx#L18](app/global-error.tsx#L18), [app/[locale]/error.tsx#L31](app/%5Blocale%5D/error.tsx#L31) | — | RL 20/h IP | 204; ring buffer + Vercel logs |
| `/api/cancel-feedback` | POST | [route.ts](app/api/cancel-feedback/route.ts#L26) | [cancel-feedback-form.tsx#L52](components/adopt/cancel-feedback-form.tsx#L52) | Resend (owner notify) | — | 200 fire-and-forget |
| `/api/gdpr-request` | POST | [route.ts](app/api/gdpr-request/route.ts#L32) | (legal pages "Request my data" link) | Resend | honeypot `business_name`, RL 3/h IP | 200 always |
| `/api/waitlist` | POST | [route.ts](app/api/waitlist/route.ts#L20) | [waitlist-form.tsx#L58](components/booking/waitlist-form.tsx#L58) | Resend | honeypot, Turnstile, IP 2/5 min, email 3/24 h | always-200 |
| `/api/voucher-redeem` | POST | [route.ts](app/api/voucher-redeem/route.ts#L26) | [redeem-voucher/page.tsx#L37](app/%5Blocale%5D/redeem-voucher/page.tsx#L37) | — | honeypot, Turnstile, RL via `checkPublicFormGuard` | always-200 `{ok,valid}` |
| `/api/recover-certificate` | POST | [route.ts](app/api/recover-certificate/route.ts#L154) | [recover-certificate-form.tsx#L49](components/adopt/recover-certificate-form.tsx#L49) | Resend | Turnstile, per-email RL 2/h | always-200 via `withAlwaysOk200` |
| `/api/billing-portal` | POST | [route.ts](app/api/billing-portal/route.ts#L42) | [billing-portal-link.tsx](components/billing-portal-link.tsx) | Stripe billing portal, Resend | honeypot, Turnstile, IP+email RL | always-200; URL via email |
| `/api/mollie-manage` | POST | [route.ts](app/api/mollie-manage/route.ts#L46) | (donor-portal-style request from `/my-adoption` email link UI) | Mollie SDK | honeypot, Turnstile, IP+email RL | always-200; URL via email |
| `/api/mollie-manage/status` | GET | [route.ts](app/api/mollie-manage/status/route.ts#L74) | (legacy HTML portal; superseded by `/my-adoption`) | Mollie SDK | HMAC capability token | HTML response |
| `/api/mollie-manage/cancel` | GET, POST | [route.ts](app/api/mollie-manage/cancel/route.ts#L61) | [my-adoption/page.tsx#L357](app/%5Blocale%5D/my-adoption/page.tsx#L357) | Mollie SDK, Resend | HMAC token scope=cancel, Origin check (POST), 2 KB CPU guard | renders HTML; 400 bad / 410 expired / 503 SDK / 502 Mollie / 200 cancel + owner notify |
| `/api/mollie-manage/update-payment` | GET, POST | [route.ts](app/api/mollie-manage/update-payment/route.ts#L47), [#L83](app/api/mollie-manage/update-payment/route.ts#L83) | [my-adoption/page.tsx#L349](app/%5Blocale%5D/my-adoption/page.tsx#L349) | Mollie SDK | HMAC token scope=update, Origin check (POST), IP 5/60s | creates Mollie payment; webhook relinks |
| `/api/checkout` | GET, POST | [route.ts](app/api/checkout/route.ts#L50) | [adopt/page.tsx](app/%5Blocale%5D/adopt/page.tsx) via `paymentAdapter.buildAdoptCheckoutUrl` (when `PAYMENT_VENDOR=stripe`) | Stripe Checkout | RL on POST | 303 to Stripe; success_url uses `SITE_BASE_URL` |
| `/api/checkout/intent` | POST | [route.ts](app/api/checkout/intent/route.ts#L71) | [embedded-checkout.tsx#L95](components/adopt/embedded-checkout.tsx#L95) | Stripe PaymentIntent | RL | returns clientSecret |
| `/api/checkout/confirm` | POST | [route.ts](app/api/checkout/confirm/route.ts#L33) | [embedded-checkout.tsx](components/adopt/embedded-checkout.tsx) | Stripe | RL | finalises intent + subscription |
| `/api/checkout-session/[id]` | GET | [route.ts](app/api/checkout-session/%5Bid%5D/route.ts#L14) | [adopt-thank-you.tsx#L105](components/adopt-thank-you.tsx#L105) | Stripe | session-id only | donor name lookup |
| `/api/skein-checkout` | GET | [route.ts](app/api/skein-checkout/route.ts#L27) | [skein/page.tsx#L185](app/%5Blocale%5D/skein/page.tsx#L185), [#L196](app/%5Blocale%5D/skein/page.tsx#L196) | Stripe Checkout | IP RL 3/5 min | 503 if `STRIPE_SECRET_KEY` unset; 303 to Stripe |
| `/api/membership-checkout` | POST | [route.ts](app/api/membership-checkout/route.ts#L24) | `<form action>` on [membership/page.tsx#L100](app/%5Blocale%5D/membership/page.tsx#L100) | Stripe Checkout | — | 503 if `STRIPE_MEMBERSHIP_PRICE_ID` unset |
| `/api/junior-checkout` | POST | [route.ts](app/api/junior-checkout/route.ts#L29) | [junior-tier-card.tsx](components/adopt/junior-tier-card.tsx) | Stripe Checkout | IP RL 3/5 min | 503 if `STRIPE_JUNIOR_PRICE_ID` unset |
| `/api/mollie-checkout` | GET, POST | [route.ts](app/api/mollie-checkout/route.ts#L32), [#L36](app/api/mollie-checkout/route.ts#L36) | [adopt/page.tsx](app/%5Blocale%5D/adopt/page.tsx) via `paymentAdapter.buildAdoptCheckoutUrl` (when `PAYMENT_VENDOR=mollie`) | Mollie | — | 503 if Mollie keys unset; redirect to Mollie hosted |
| `/api/mollie-checkout/intent` | POST | [route.ts](app/api/mollie-checkout/intent/route.ts#L81) | [embedded-mollie-checkout.tsx#L140](components/adopt/embedded-mollie-checkout.tsx#L140) | Mollie | — | embedded clientToken |
| `/api/mollie-checkout/confirm` | POST | [route.ts](app/api/mollie-checkout/confirm/route.ts#L39) | [embedded-mollie-checkout.tsx#L283](components/adopt/embedded-mollie-checkout.tsx#L283) | Mollie | — | finalises payment |
| `/api/stripe-webhook` | POST | [route.ts](app/api/stripe-webhook/route.ts#L42) | Stripe → here | Stripe SDK constructEvent; Mollie SDK for referrer lookup; Resend | `STRIPE_WEBHOOK_SECRET` + signature + SDK presence | 503 fail-CLOSED; 200 always after dispatch (fail-quiet); 500 only on handler throw |
| `/api/mollie-webhook` | POST | [route.ts](app/api/mollie-webhook/route.ts#L42) | Mollie → here | Mollie SDK, Resend | URL-path secret `safeEqual`, payment fetch | 503 if secret unset; 401 mismatch; 200 idempotent; 500 only on sub create throw |
| `/api/fareharbor-webhook` | POST | [route.ts](app/api/fareharbor-webhook/route.ts#L66) | FareHarbor → here | Resend `scheduledAt` | `FAREHARBOR_WEBHOOK_SECRET` header + `safeEqual` | 503 if unset; 200 always after schedule (fail-quiet) |
| `/api/resend-webhook` | POST | [route.ts](app/api/resend-webhook/route.ts#L40) | Resend → here | (in-memory suppressions) | Resend signature | tracks bounce/complaint |
| `/api/adopt-count` | GET | [route.ts](app/api/adopt-count/route.ts#L23) | [AdoptersCounterBadge](components/adopters-counter-badge.tsx) (server-side) | Mollie/Stripe | unauth, cached | safe count |
| `/api/adopt-certificate` | GET | [route.ts](app/api/adopt-certificate/route.ts#L12) | welcome email link | `@react-pdf/renderer` | (signed query) | streams PDF |
| `/api/donor-receipt/[sessionId]` | GET | [route.ts](app/api/donor-receipt/%5BsessionId%5D/route.ts#L67) | thank-you / receipt email | `@react-pdf/renderer` + Stripe | session-id | streams PDF |
| `/api/tour-ics` | GET | [route.ts](app/api/tour-ics/route.ts#L29) | [tour-confirmation/page.tsx#L128](app/%5Blocale%5D/tour-confirmation/page.tsx#L128), reminder email | — | RL 20/5 min IP | returns text/calendar |
| `/api/calendar/renewal/[sessionId]` | GET | [route.ts](app/api/calendar/renewal/%5BsessionId%5D/route.ts#L12) | renewal reminder email | Stripe (session lookup) | — | ICS |
| `/api/og/adoption-share` | GET | [route.tsx](app/api/og/adoption-share/route.tsx#L43) | [share-adoption/page.tsx](app/%5Blocale%5D/share-adoption/page.tsx) metadata | `next/og`, content provider | — | dynamic OG image |
| `/api/health` | GET | [route.ts](app/api/health/route.ts#L14) | (operational probe) | (env reads) | — | JSON |
| `/api/launch-readiness` | GET | [route.ts](app/api/launch-readiness/route.ts#L28) | `/admin/launch-readiness` (server) | many | session or `CRON_SECRET` | 27-check report |
| `/api/setup-probe` | GET | [route.ts](app/api/setup-probe/route.ts#L130) | [admin/setup-step.tsx#L51](components/admin/setup-step.tsx#L51) | Stripe/Mollie/Resend/Turnstile | session | per-key probes |
| `/api/owner-digest` | GET | [route.ts](app/api/owner-digest/route.ts#L20) | Vercel cron Mon 09:00 | FareHarbor, Resend | `CRON_SECRET` | 401 / fail-quiet digest |
| `/api/owner-mrr-digest` | GET | [route.ts](app/api/owner-mrr-digest/route.ts#L32) | Vercel cron Mon 06:00 | Stripe + Mollie + Resend | `CRON_SECRET` via `runCron` | 5xx triggers retry |
| `/api/adopt-quarterly-update` | GET | [route.ts](app/api/adopt-quarterly-update/route.ts#L50) | Vercel cron Jan/Apr/Jul/Oct 1 09:00 | Mollie scan, Resend | `CRON_SECRET` | bulk email send |
| `/api/adopt-deferred-gifts` | GET | [route.ts](app/api/adopt-deferred-gifts/route.ts#L27) | Vercel cron daily 09:00 | Mollie/Stripe, Resend | `CRON_SECRET` | sends scheduled gift welcomes |
| `/api/adopt-renewal-reminders` | GET | [route.ts](app/api/adopt-renewal-reminders/route.ts#L34) | Vercel cron daily 10:00 | Stripe, Resend | `CRON_SECRET` | 30/14/3-day reminders |
| `/api/adopt-milestone-emails` | GET | [route.ts](app/api/adopt-milestone-emails/route.ts#L52) | Vercel cron daily 11:00 | Mollie/Stripe, Resend | `CRON_SECRET` | 1y / 6mo milestones |
| `/api/alpaca-birthday-cards` | GET | [route.ts](app/api/alpaca-birthday-cards/route.ts#L32) | Vercel cron daily 09:00 + `/admin/birthday-test` | Mollie, Resend | `CRON_SECRET` | per-adopter card; `last_bday_email_year` stamp |
| `/api/reminder` | POST | [route.ts](app/api/reminder/route.ts) | (FareHarbor manual webhook or cron) | Resend | `REMINDER_WEBHOOK_SECRET` fail-OPEN, RL 2/5 min IP | tour reminder + ICS |
| `/api/review-request` | POST | [route.ts](app/api/review-request/route.ts) | (FareHarbor manual webhook or cron) | Resend | `REVIEW_REQUEST_WEBHOOK_SECRET` fail-OPEN | review prompt email |
| `/api/analytics/data` | GET | [route.ts](app/api/analytics/data/route.ts#L16) | [analytics-dashboard.tsx#L25](components/analytics-dashboard.tsx#L25) | GA4 Data API | session | GA4 metrics |
| `/api/admin/suppressions` | GET, POST, DELETE | [route.ts](app/api/admin/suppressions/route.ts#L31) | [admin/suppressions/suppression-table.tsx](app/admin/suppressions/suppression-table.tsx) | Resend | session | suppressions CRUD |
| `/api/admin/send-test-email` | POST | [route.ts](app/api/admin/send-test-email/route.ts#L21) | [admin/send-test-email-button.tsx](components/admin/send-test-email-button.tsx) | Resend | session, RL 5/h IP | uses `CONTACT_EMAIL` default |
| `/api/admin/migration-links` | POST | [route.ts](app/api/admin/migration-links/route.ts#L51) | [admin/migration-form.tsx](components/admin/migration-form.tsx) | Stripe (price construct) | session | CSV→checkout links |
| `/api/admin/quarterly-update` | POST | [route.ts](app/api/admin/quarterly-update/route.ts#L22) | [admin/quarterly-update/compose-form.tsx](app/admin/quarterly-update/compose-form.tsx) | Resend | session | manual send |
| `/api/admin/quarterly-update/preview` | GET | [route.ts](app/api/admin/quarterly-update/preview/route.ts#L21) | `/admin/quarterly-update` | — | session | renders template HTML |
| `/api/admin/quarterly-update/suggest` | GET | [route.ts](app/api/admin/quarterly-update/suggest/route.ts#L20) | `/admin/quarterly-update` | — | session | suggested copy |
| `/api/admin/content-stage` | POST | [route.ts](app/api/admin/content-stage/route.ts#L26) | [admin/content/content-form.tsx](app/admin/content/content-form.tsx) | dev FS only | session | 501 on Vercel |
| `/api/admin/replay-event` | POST | [route.ts](app/api/admin/replay-event/route.ts#L65) | [admin/analytics/events/replay-button-client.tsx](app/admin/analytics/events/replay-button-client.tsx) | re-dispatches payment handlers | session | replay safely |
| `/api/admin/alpacas/upload` | POST | [route.ts](app/api/admin/alpacas/upload/route.ts#L35) | [admin/alpacas/[id]/photos/photo-manager.tsx](app/admin/alpacas/%5Bid%5D/photos/photo-manager.tsx) | Vercel Blob / FS | session | multipart upload |
| `/api/admin/alpacas/delete-upload` | DELETE | [route.ts](app/api/admin/alpacas/delete-upload/route.ts#L29) | same | Vercel Blob / FS | session | — |

Public root-level routes: `/healthz` (HEAD/GET, no DB), `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`.

---

## C. Webhook & cron feedback loops

### C.1 `/api/stripe-webhook` (security-critical)
| Stripe event | Handler | Effects |
|---|---|---|
| `checkout.session.completed` | `handleStripeCheckoutCompleted` ([lib/payment-handlers.ts](lib/payment-handlers.ts)) | (1) `sendEmail` welcome to donor (fail-quiet); (2) `bookingScheduleStore.set` +5 min `sendEmail` discount-codes (fail-quiet); (3) referrer reward email via `sendReferrerRewardQuiet` if `REFERRER_REWARD_LIVE=true` + code matches Mollie customer; idempotency stamp on Stripe sub metadata `referrer_reward_sent_at`; (4) `recordVatFromPayment`; (5) owner notify; (6) DB mirror (upsert customer + recordPaymentEvent) fire-and-forget |
| `invoice.paid` | `handleStripeInvoicePaid` | renewal email, payment-failure-tracker `resetFailures`, owner-notify de-escalation |
| `invoice.payment_failed` | `handleStripeInvoicePaymentFailed` | severity ladder (first/at-risk/action-required) via `payment-failure-tracker.recordFailure`, dunning email per tier, owner-notify on transitions to Slack/Telegram/Discord |
| `customer.subscription.deleted` | `handleStripeSubscriptionDeleted` | `softDeleteSubscriptionFromStripe` DB, owner notify, `resetFailures`, `/cancel-feedback` URL in receipt |
| `checkout.session.expired` | `handleStripeCheckoutExpired` | abandonment recovery email |

### C.2 `/api/mollie-webhook` (security-critical)
| Mollie payment.status | Handler | Effects |
|---|---|---|
| `paid` (sequenceType=first, no `metadata.action`) | `handleMolliePaymentPaid` (monthly-first) | (1) `createMonthlySubscription` via `mollie.customerSubscriptions.create` (THROWS if Mollie SDK absent → 500 retry); (2) parallel `sendMollieWelcomeQuiet` + `sendMollieDiscountCodesQuiet` (+5 min); (3) referrer reward via `lookupReferrer` + Mollie sub metadata stamp; (4) `recordVatFromPayment`; (5) owner notify (third email); (6) DB mirror (customer + subscription + event) fire-and-forget |
| `paid` (oneoff yearly) | yearly-oneoff branch | sendWelcome + discount codes scheduled; no sub creation; owner notify; VAT recorded |
| `paid` (recurring) | recurring-renewal branch | recovery email + `resetFailures` if previously at-risk; VAT recorded |
| `paid` w/ `metadata.action='update-payment'` + `seedSubscriptionId` | re-mandate flow | (1) `mollie.customerSubscriptions.get` probe → if `canceled`, refund verification charge + skip; (2) `mollie.customerSubscriptions.update` to new `mandateId`; (3) `resetFailures` on success; defers (500 retry) if `mandateId` not yet populated |
| `failed` | `handleMolliePaymentFailed` | donor email with manage-link; owner notify; severity ladder via `recordFailure(attemptId)`; markProcessed even on send error to prevent retry-duplicate |
| `expired`, `canceled` | log + return 200 | no email |

### C.3 `/api/fareharbor-webhook`
| Event | Handler | Effects |
|---|---|---|
| `booking.created` | inline | (a) `sendEmail` reminder scheduled `start-48 h`; (b) review-request scheduled `end+24 h`; (c) `bookingScheduleStore.set` records both Resend IDs |
| `booking.updated` / `booking.modified` | inline | cancel prior schedules via `cancelScheduledEmail`, reschedule fresh |
| `booking.cancelled` / `booking.deleted` | inline | cancel reminder + review schedules, `bookingScheduleStore.delete` |

All branches return 200 even on degraded paths to avoid FareHarbor retry-spam. Idempotency keys include `startAt`.

### C.4 Vercel crons ([vercel.json](vercel.json))
| Schedule | Path | Handler | Effects |
|---|---|---|---|
| `0 9 * * MON` | `/api/owner-digest` | [route.ts](app/api/owner-digest/route.ts) | weekly booking & adopter digest; fail-quiet if FH keys unset |
| `0 6 * * 1` | `/api/owner-mrr-digest` | [route.ts](app/api/owner-mrr-digest/route.ts) | MRR/ARR/active/churn/dunning via Stripe + Mollie aggregations; emails `CONTACT_EMAIL`; `runCron` heartbeat |
| `0 9 1 1,4,7,10 *` | `/api/adopt-quarterly-update` | [route.ts](app/api/adopt-quarterly-update/route.ts) | quarterly update to all active adopters |
| `0 9 * * *` | `/api/adopt-deferred-gifts` | [route.ts](app/api/adopt-deferred-gifts/route.ts) | scheduled gift welcome emails |
| `0 10 * * *` | `/api/adopt-renewal-reminders` | [route.ts](app/api/adopt-renewal-reminders/route.ts) | yearly tier renewal reminders 30/14/3 days |
| `0 11 * * *` | `/api/adopt-milestone-emails` | [route.ts](app/api/adopt-milestone-emails/route.ts) | 6-mo / 1-yr / 2-yr milestone celebrations |
| `0 9 * * *` | `/api/alpaca-birthday-cards` | [route.ts](app/api/alpaca-birthday-cards/route.ts) | per-adopted-alpaca birthday email; `last_bday_email_year` stamps |

All crons authenticated via `verifyCronSecret` (cron-runner.ts); 401 on bad/missing `CRON_SECRET`. 5xx → Vercel auto-retry.

---

## D. Orphan list

### D.1 Orphan buttons (CTA wired, backend incomplete/503)
- `/membership` "Get your pass" → `/api/membership-checkout` returns 503 unless `STRIPE_MEMBERSHIP_PRICE_ID` + `STRIPE_SECRET_KEY` set ([CLAUDE.md failsafe](CLAUDE.md))
- `/skein` "Sponsor" / "Pick for me" → `/api/skein-checkout` returns 503 unless `STRIPE_SECRET_KEY` set
- `/adopt` JuniorTierCard CTA → `/api/junior-checkout` returns 503 unless `JUNIOR_TIER_LIVE=true` + `STRIPE_JUNIOR_PRICE_ID` set (renders null by design)
- Embedded Stripe Elements checkout — only fires when `CHECKOUT_MODE=embedded` AND `PAYMENT_VENDOR=stripe`; otherwise UI never appears (intended)
- Embedded Mollie checkout — same gate
- Shop / `/shop/woven` "Enquire" — 6 placeholder products all route to `/shop/commission` (UNMAPPED per page header)
- Shop / `/shop/alcaca` "Enquire" — 3 tier cards all route to commission form (UNMAPPED prices)
- `/cookies` "Manage preferences" UI relies on `vanilla-cookieconsent`; `CookieConsent.showPreferences()` only available after first consent has been given
- `/sitemap` static — lists pages but no machine sitemap (`/sitemap.xml` covered separately)
- `/journal` empty-state CTA depends on `journal.emptyCtaHref` translation; default `/contact` (no locale prefix) is missing locale segment if owner overrides
- `/preferences` "Unsubscribe from everything" POSTs three times (one per category) then redirects regardless of success — partial failures silent (intentional per failsafe)

### D.2 Orphan API routes (no grep-able UI caller)
Routes referenced only by emails, webhooks, crons, or operator-direct probes (not buggy — but no in-app UI calls them):
- `/api/adopt-certificate` — invoked from welcome email
- `/api/donor-receipt/[sessionId]` — invoked from receipt email
- `/api/calendar/renewal/[sessionId]` — invoked from renewal reminder email
- `/api/tour-ics` — also invoked from FareHarbor reminder email
- `/api/og/adoption-share` — server-side metadata image
- `/api/health`, `/api/launch-readiness` — operator probes / cron
- `/api/setup-probe` — `/admin/setup` (one wire each)
- `/api/resend-webhook` — Resend → here only
- `/api/reminder`, `/api/review-request` — externally triggered (FareHarbor / Vercel-Cron)
- `/api/mollie-manage/status` — legacy HTML donor portal; superseded by `/my-adoption` server component (`donor-portal-data.ts` shared)
- `/api/mollie-manage` POST — used from the donor "manage" oracle CTA; not directly grep-able because it's referenced by the donor portal email template ("Manage your adoption" → token flow), not from a UI fetch

### D.3 Orphan components (no grep-able importer)
Verified by grepping `import * from '@/components/...'` across `app/`:
- `[components/alpaca-card.vitest.tsx](components/alpaca-card.vitest.tsx)`, `[components/faq.vitest.tsx](components/faq.vitest.tsx)`, `[components/form-field.vitest.tsx](components/form-field.vitest.tsx)`, `[components/product-card.vitest.tsx](components/product-card.vitest.tsx)`, `[components/section-header.vitest.tsx](components/section-header.vitest.tsx)`, `[components/testimonial-card.vitest.tsx](components/testimonial-card.vitest.tsx)`, `[components/testimonial-grid.vitest.tsx](components/testimonial-grid.vitest.tsx)`, `[components/booking/book-tour-link.vitest.tsx](components/booking/book-tour-link.vitest.tsx)` — **test files only, not orphans** but worth flagging
- `[components/product-card.tsx](components/product-card.tsx)` — no importer found in `app/[locale]/shop/*` (shop pages render their own card markup). Possible orphan.
- `[components/booking/book-tour-link.tsx](components/booking/book-tour-link.tsx)` — superseded by `[components/booking/button.tsx](components/booking/button.tsx)` (`BookingButton`). Possible orphan; only test still imports it.
- `[components/legal/legal-content-pending-notice.tsx](components/legal-content-pending-notice.tsx)`, `[components/legal-version-stamp.tsx](components/legal-version-stamp.tsx)` — surface only on `/privacy`, `/terms`, `/cookies`, `/impressum`; verified in-use.
- `[components/initials-avatar.tsx](components/initials-avatar.tsx)` — used by `JournalCard` author byline; in-use.
- `[components/seasonal-price-list.tsx](components/seasonal-price-list.tsx)` — only renders when `TOUR_SEASONAL_WINDOWS` env JSON populated; not yet mounted on any page (failsafe → null).
- `[components/calendar-skeleton.tsx](components/calendar-skeleton.tsx)` — Suspense fallback for `FareHarborCalendar`; in-use.

No definitive dead-code component found among the production set; the test `.vitest.tsx` files are by design.

---

## E. Critical chains (file-by-file)

### E.1 Cold visitor → tour booking → confirmation email
1. [app/[locale]/page.tsx](app/%5Blocale%5D/page.tsx) Hero CTA → `FAREHARBOR_BOOKING_URL` (new tab)
2. FareHarbor hosted checkout (external) → booking completed
3. FareHarbor calls webhook → [app/api/fareharbor-webhook/route.ts#L66](app/api/fareharbor-webhook/route.ts#L66) (POST, `x-webhook-secret`)
4. Webhook validates secret via [lib/secrets.ts](lib/secrets.ts) `safeEqual`
5. [lib/booking-schedule-store.ts](lib/booking-schedule-store.ts) recorded; idempotency key `fh:<event>:<pk>:<startAt>` via [lib/webhook-idempotency.ts](lib/webhook-idempotency.ts)
6. [lib/mailer.ts](lib/mailer.ts) `sendEmail({scheduledAt: start-48h})` → Resend stores reminder
7. `sendEmail({scheduledAt: end+24h})` → Resend stores review-request
8. Reminder fires → renders via [lib/email-templates.ts](lib/email-templates.ts) `reminderEmailHtml` with ICS link → `/api/tour-ics`
9. Visitor lands on [app/[locale]/tour-confirmation/page.tsx](app/%5Blocale%5D/tour-confirmation/page.tsx) (FareHarbor `return_url`)
10. "Download .ics" → [app/api/tour-ics/route.ts#L29](app/api/tour-ics/route.ts#L29) streams text/calendar

### E.2 Cold visitor → adoption monthly → welcome → discount codes
1. [app/[locale]/adopt/page.tsx#L504-L514](app/%5Blocale%5D/adopt/page.tsx#L504-L514) [`AdoptCheckoutLink`](components/adopt/adopt-checkout-link.tsx) (`monthlyUrl`) — GA4 `begin_checkout` fired
2. URL resolved via [lib/payment-vendor.ts](lib/payment-vendor.ts) `getPaymentAdapter().buildAdoptCheckoutUrl('monthly', opts)` (Mollie or Stripe depending on `PAYMENT_VENDOR`)
3. (Stripe branch) → [app/api/checkout/route.ts](app/api/checkout/route.ts) creates session via [lib/integrations/payment-stripe-direct.ts](lib/integrations/payment-stripe-direct.ts) `createCheckoutSession`; `success_url=SITE_BASE_URL` (ADR 017); metadata includes `alpaca`, `gift_*`
4. Donor pays at Stripe; redirect → `/adopt?checkout=success&session_id=…`
5. Stripe sends `checkout.session.completed` → [app/api/stripe-webhook/route.ts#L42](app/api/stripe-webhook/route.ts#L42)
6. `requireEnvOrReturn503('STRIPE_WEBHOOK_SECRET')` + `stripe.webhooks.constructEvent` verify sig
7. `isAlreadyProcessed(event.id)` ([lib/webhook-idempotency.ts](lib/webhook-idempotency.ts)) — short-circuit on retry
8. `handleStripeCheckoutCompleted` in [lib/payment-handlers.ts](lib/payment-handlers.ts):
   - `sendEmail` welcome → Resend ([lib/mailer.ts](lib/mailer.ts))
   - `bookingScheduleStore` +5 min, `sendEmail({scheduledAt})` discount codes ([lib/email-templates.ts](lib/email-templates.ts) `buildAdoptDiscountCodesEmail`, with `ADOPT_DISCOUNT_CODE_*` substitution)
   - `sendReferrerRewardQuiet` if applicable (Mollie customer scan via `lookupReferrer`)
9. `recordVatFromPayment` ([lib/vat-recorder.ts](lib/vat-recorder.ts))
10. Owner notify via [lib/owner-notify.ts](lib/owner-notify.ts) (Slack/Telegram/Discord webhook fan-out)
11. DB mirror fire-and-forget ([lib/db/upsert-from-webhook.ts](lib/db/upsert-from-webhook.ts))
12. Webhook returns 200; [components/adopt-thank-you.tsx](components/adopt-thank-you.tsx) fetches `/api/checkout-session/[id]` to show donor name

(Mollie branch is symmetric: `/api/mollie-checkout` → Mollie hosted → `/api/mollie-webhook` → `handleMolliePaymentPaid` with same downstream effects; subscription created by `createMonthlySubscription` since Mollie does not auto-create subs from one-off paid.)

### E.3 Returning donor → billing portal → cancel → owner notify
1. [components/billing-portal-link.tsx](components/billing-portal-link.tsx) "Manage subscription" form → POST `/api/billing-portal` ([route.ts](app/api/billing-portal/route.ts#L42))
2. Honeypot + Turnstile + IP/email RL via [lib/oracle-form-guard.ts](lib/oracle-form-guard.ts) `withAlwaysOk200`
3. (Stripe branch) `stripe.billingPortal.sessions.create` with `return_url=SITE_BASE_URL` (ADR 017)
4. URL delivered to donor via [lib/email-templates.ts](lib/email-templates.ts) `buildBillingPortalEmail` (Resend) — NEVER in JSON
5. Donor clicks portal URL → Stripe-hosted portal → cancels
6. Stripe fires `customer.subscription.deleted` → `/api/stripe-webhook` → `handleStripeSubscriptionDeleted`
7. `softDeleteSubscriptionFromStripe`, owner notify on `at-risk → resolved` transition, payment-failure-tracker `resetFailures`
8. Receipt email includes `/cancel-feedback?vendor=stripe&sub=…` redirect link
9. On `/cancel-feedback` → POST `/api/cancel-feedback` → owner notify via Resend

(Mollie branch: same UI; alternate redirect-target is `/api/mollie-manage/cancel?token=…` from the donor portal email — token-gated HMAC capability, `mollie.customerSubscriptions.cancel`, HTML success page, owner notify via `handleMollieSubscriptionCanceled`.)

### E.4 Voucher recipient → redeem code → tour booking
1. Recipient lands on [app/[locale]/redeem-voucher/page.tsx](app/%5Blocale%5D/redeem-voucher/page.tsx)
2. Form POST → `/api/voucher-redeem` ([route.ts](app/api/voucher-redeem/route.ts#L26))
3. `checkPublicFormGuard` (honeypot + Turnstile + IP RL)
4. Always-200 `{ok:true, valid:boolean}` — valid checks against `VALID_VOUCHER_CODES` env list
5. Success state → "Book your visit" → `/${locale}/tours` → FareHarbor flow (chain E.1)

### E.5 Newsletter signup → confirm → first issue
1. Any page with `<NewsletterForm />` → [components/newsletter-form.tsx#L63](components/newsletter-form.tsx#L63) → POST `/api/newsletter`
2. [app/api/newsletter/route.ts#L29](app/api/newsletter/route.ts#L29) honeypot `business_name`, Turnstile, per-email RL 3/24 h (SHA-256 hashed key)
3. Token signed via [lib/newsletter-token.ts](lib/newsletter-token.ts) with `NEWSLETTER_SIGNING_KEY` → falls back to `NEXTAUTH_SECRET`
4. Resend send verification email; `verifyUrl = SITE_BASE_URL + /api/newsletter/confirm?token=…`; List-Unsubscribe header attached
5. Subscriber clicks → `/api/newsletter/confirm` ([route.ts](app/api/newsletter/confirm/route.ts#L24)) → `safeEqual` HMAC verify → SendGrid list add (fail-quiet)
6. Redirect to `/${locale}/newsletter-confirmed`
7. Future bulk issues sent manually or by cron via [lib/email-templates.ts](lib/email-templates.ts); every footer carries personalised `/api/newsletter/unsubscribe?token=…&locale=…`
8. Unsubscribe click → `/api/newsletter/unsubscribe` (scope-checked) → redirect `/${locale}/newsletter/unsubscribed`

### E.6 Cookie consent: reject → accept later → GA4 fires
1. First load: pre-hydration script in `app/layout.tsx` sets `gtag('consent','default', denied)` (ADR 014)
2. [components/cookie-consent-v3.tsx](components/cookie-consent-v3.tsx) `CookieConsent.run` mounts; banner appears
3. Reject all → `updateConsentMode([])` writes `localStorage.ai_cookie_consent_v1='rejected'`, dispatches `cookieConsentUpdated` event, `gtag('consent','update', all denied)`
4. [components/vercel-instrumentation.tsx](components/vercel-instrumentation.tsx) listens for `cookieConsentUpdated` + `storage`; suppresses Vercel beacons until granted
5. Later visit: visitor reopens banner via `/cookies` page "Manage preferences" → selects analytics → `updateConsentMode(['analytics'])` → `gtag('consent','update', analytics_storage:granted)`
6. GA4 tag (`G-Y946QDVVQV`) and GTM container `GTM-KR3CGLS6` (mounted in `app/layout.tsx`) begin emitting `page_view`, then `begin_checkout` (from `AdoptCheckoutLink`), `purchase` (from Stripe success), `generate_lead` (newsletter), etc.
7. `lib/consent-gate.ts` `STORAGE_KEY=ai_cookie_consent_v1` gate is read by `trackEvent` helpers so server-derived events also respect consent

---

## F. Flow diagrams (text-art)

### Chain 1 — Tour booking
```
Homepage Hero CTA
   └── new-tab → book.fareharbor.com (FareHarbor hosted)
                    └── booking.created (POST + x-webhook-secret)
                                  └── /api/fareharbor-webhook/route.ts
                                         ├── safeEqual(secret)
                                         ├── webhook-idempotency.isAlreadyProcessed
                                         ├── bookingScheduleStore.set
                                         ├── lib/mailer.sendEmail(reminder, scheduledAt=start-48h) → Resend
                                         └── lib/mailer.sendEmail(review,    scheduledAt=end+24h)  → Resend
   FareHarbor return_url ─────────────────────────────────────────────────────────────────────────────────────────
                          └── /[locale]/tour-confirmation
                                    └── "Download .ics" → /api/tour-ics → text/calendar
                                    └── "Google Calendar" → calendar.google.com deeplink
```

### Chain 2 — Adopt monthly (Stripe)
```
/[locale]/adopt
   └── AdoptCheckoutLink (monthly) → buildAdoptCheckoutUrl
           └── /api/checkout (POST)
                  ├── createCheckoutSession (Stripe SDK dynamic import)
                  └── 303 → checkout.stripe.com
                              └── donor pays
                                       └── checkout.session.completed
                                              └── /api/stripe-webhook/route.ts
                                                     ├── constructEvent (sig verify)
                                                     ├── webhook-idempotency
                                                     ├── handleStripeCheckoutCompleted (lib/payment-handlers.ts)
                                                     │     ├── sendEmail welcome → Resend
                                                     │     ├── bookingScheduleStore +5min → sendEmail discount-codes → Resend
                                                     │     └── sendReferrerRewardQuiet → (lookupReferrer via Mollie) → Resend
                                                     ├── recordVatFromPayment
                                                     ├── owner-notify → Slack / Telegram / Discord webhook
                                                     └── DB mirror (fire-and-forget) → upsertCustomer + recordPaymentEvent
   Stripe success_url → /[locale]/adopt?checkout=success&session_id=…
        └── AdoptThankYou
                 └── fetch /api/checkout-session/[id] → donor name
```

### Chain 3 — Returning donor → cancel
```
/[locale]/adopt (or /my-adoption)
   └── BillingPortalLink form → POST /api/billing-portal
           ├── withAlwaysOk200 (honeypot + Turnstile + RL)
           ├── stripe.billingPortal.sessions.create (return_url=SITE_BASE_URL)
           └── sendEmail buildBillingPortalEmail → Resend  (URL never in JSON)
                          └── donor email link → billing.stripe.com → cancel
                                          └── customer.subscription.deleted
                                                 └── /api/stripe-webhook
                                                        ├── handleStripeSubscriptionDeleted
                                                        │     ├── softDeleteSubscriptionFromStripe (DB)
                                                        │     ├── owner-notify (de-escalation)
                                                        │     └── payment-failure-tracker.resetFailures
                                                        └── receipt email → /cancel-feedback?vendor=stripe&sub=…
                                                              └── /api/cancel-feedback → owner notify (Resend)
```

(Mollie cancel chain is structurally identical but token-gated via `/api/mollie-manage/cancel?token=…` instead of Stripe portal.)

---

## G. Coverage summary
- Pages inventoried: **52** (homepage; `/tours`; `/adopt`; `/gifts`; `/redeem-voucher`; `/my-adoption`; `/herd-diary`; `/herd-family`; `/preferences`; `/membership`; `/membership/thank-you`; `/skein`; `/skein/thank-you`; `/tour-confirmation`; `/shop`; `/shop/alcaca`; `/shop/woven`; `/shop/commission`; `/weaving`; `/weddings`; `/workshops`; `/yoga`; `/visit`; `/contact`; `/about`; `/sustainability`; `/press`; `/press-kit`; `/media`; `/journal`; `/journal/[slug]`; `/alpacas`; `/alpacas/[slug]`; `/experiences`; `/experiences/corporate-team-building`; `/experiences/family-farm-days`; `/experiences/romantic-sunset`; `/newsletter/archive`; `/newsletter/unsubscribed`; `/newsletter-confirmed`; `/share-adoption`; `/cancel-feedback`; `/recover-certificate`; `/cookies`; `/privacy`; `/terms`; `/impressum`; `/sitemap`; `/offline`; `/[locale]/[...slug]` catch-all; `/admin` index + 21 admin sub-pages)
- Buttons / forms / interactive surfaces catalogued: **310+** entries across sections A.1–A.46
- API routes catalogued: **68** distinct route handlers (Section B)
- External services touched: **Stripe**, **Mollie**, **FareHarbor**, **Resend**, **SendGrid** (optional, list-management), **Google Places**, **Google Maps Embed** + **OpenStreetMap** (fail-open fallback), **Google Analytics 4** (`G-Y946QDVVQV`), **Google Tag Manager** (`GTM-KR3CGLS6`), **Cloudflare Turnstile** / **Google reCAPTCHA v3** (swappable via `CAPTCHA_PROVIDER`), **MyMemory translation**, **NextAuth credentials**, **Vercel Blob** (admin image uploads), **owner-notify webhooks**: Slack / Telegram / Discord / generic; **YouTube/Twitch/Vimeo iframe embed** (alpaca cam, origin-allowlisted)
- Orphan buttons: 11 noted (mostly env-gated/scaffold; D.1)
- Orphan routes: 0 dead — every route has a documented caller (UI fetch, webhook, cron, email link, or operator probe). D.2 lists 11 that are email/cron/probe-only.
- Orphan components: 2 plausible (`product-card.tsx`, `booking/book-tour-link.tsx`) — both have `.vitest.tsx` siblings still referencing them, so safe to delete only with test cleanup.
