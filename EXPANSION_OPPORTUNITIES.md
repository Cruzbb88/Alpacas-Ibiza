# Expansion Opportunities — 2026-06-06

Discovery pass across `app/[locale]/`, `components/`, `lib/`, and `app/api/`.
Competitor categories surveyed mentally: UK/NL alpaca walk farms, GetYourGuide/Viator
listing norms, WWF/Donkey Sanctuary sponsor sites, boutique EU eco-retreats (Can Martí,
Atzaró, Alpagas du Maquis).

---

## High-leverage (build now, no owner data needed)

1. **Adopt FAQ → JSON-LD FAQPage** — The adopt page renders 7 FAQ items via `<Faq>` but
   never emits a `<script type="application/ld+json">` FAQPage schema block. Tours, weddings,
   corporate, and family-farm-days pages already do this via `faqPageSchema()`. Adding it to
   `/adopt` is a one-line import + one `<script>` tag; rich results in Google SERPs ("adoption"
   queries) are the direct payoff — zero owner input required.
   Files: `app/[locale]/adopt/page.tsx`
   Size: **S**

2. **Referral count shown to donor in My Adoption portal** — The admin referrals dashboard
   (`app/admin/analytics/referrals/`) already groups and ranks subscriptions by
   `metadata.referredBy`. The donor portal shows the referral code but never shows how many
   people used it. Fetching that count server-side (same Mollie iterate the admin page does,
   filtered to the donor's own code) and surfacing "You've brought in N friends" closes the
   gamification loop that competitor sponsor programs (Patreon, Memberful) exploit for
   retention. No owner content needed.
   Files: `app/[locale]/my-adoption/page.tsx`, `lib/adopters/` (new helper)
   Size: **S**

3. **Add-to-Calendar button on tour booking confirmation** — `lib/calendar/ics.ts` exists and
   builds RFC 5545 `.ics` files. `components/adopt-thank-you.tsx` already links
   `/api/calendar/renewal/[sessionId]` for adoption renewals. The tour booking confirmation flow
   has no equivalent. Exposing an `.ics` download on the post-booking page (and optionally in the
   FareHarbor post-booking email) mirrors what GetYourGuide and Viator inject on every booking
   receipt. The ICS builder is already tested and generic.
   Files: `app/api/calendar/tour/[bookingId]/route.ts` (new), wire into post-booking thank-you
   Size: **S**

4. **Seasonal campaign banner env-gate (generalised)** — `SKEIN_CALLOUT_LIVE=true` already
   toggles the skein shearing callout on the homepage. The same env-gate pattern applied to the
   tours page and the adopt page would let the owner flip short-lived promos (Christmas gift
   adoption, summer surge pricing, spring shearing) without a deploy. A generic
   `<CampaignBanner>` component already exists at `components/adopt/campaign-banner.tsx` —
   it just needs a `CAMPAIGN_*` env family and wiring into tours + home alongside the existing
   skein slot.
   Files: `components/campaign-banner-generic.tsx` (thin wrapper), `app/[locale]/tours/page.tsx`,
   `app/[locale]/page.tsx`
   Size: **S**

5. **Live alpaca cam embed slot** — Can Martí, UK alpaca walk farms, and US hobby farms
   commonly embed a YouTube Live iframe as a "watch the herd" widget. The site has no live
   video surface. A `<LiveAlpacaCam>` component that renders an iframe when
   `NEXT_PUBLIC_ALPACA_CAM_URL` is set (and `null` otherwise) costs ~30 lines. The owner
   fills the env var with their YouTube/Webcam URL; no fake content ships before they do.
   Files: `components/live-alpaca-cam.tsx`, `app/[locale]/alpacas/page.tsx` (slot)
   Size: **S**

6. **FAQ schema on adopt + shop + skein pages** — `faqPageSchema()` + `toJsonLd()` exist.
   The adopt, shop, and skein pages all have FAQ-shaped content (adopt has 7 Q&A pairs
   already in i18n keys; skein has common questions in copy). Emitting FAQPage JSON-LD
   on all three adds rich results with no content change. Tours already does this.
   Files: `app/[locale]/adopt/page.tsx`, `app/[locale]/shop/page.tsx`,
   `app/[locale]/skein/page.tsx`
   Size: **S** (three pages, one import each)

---

## Medium-leverage (worth doing, may need small owner input)

7. **Virtual farm tour scaffold (360° / slideshow)** — Boutique EU eco-retreats (Can Martí,
   Atzaró) and several UK alpaca farms use a guided photo sequence as a "virtual tour" that
   converts fence-sitters who cannot visit. A `<VirtualFarmTour>` component rendering a
   fullscreen photo carousel with overlaid waypoint labels can be built against a static
   data array in `lib/data/media.ts` (already has `status: 'live' | 'draft'` gating). Owner
   supplies photos and waypoint names; the scaffold ships empty (fails-quiet like `PhotoGallery`).
   Files: `components/virtual-farm-tour.tsx`, `app/[locale]/visit/page.tsx`, `lib/data/media.ts`
   (new `virtualTour` array)
   Size: **M**

8. **Tour bundle / experience package pricing** — GetYourGuide and Viator both surface
   "Tour + Adoption" or "Walk + Yoga" combo offers at a discount. The site has
   `components/experiences/experience-compare.tsx` and `components/tour-comparison.tsx` but
   no mechanism for a bundle price. An admin-controlled `BUNDLE_*` env family (same pattern
   as `ADOPT_DISCOUNT_CODE_*`) could expose a "Book both and save €X" CTA on the tours and
   yoga pages. Needs owner confirmation of the offer, but the wiring is pure code.
   Files: `lib/config.ts` (add bundle constants), `components/tours/bundle-cta.tsx` (new),
   `app/[locale]/tours/page.tsx`, `app/[locale]/yoga/page.tsx`
   Size: **M**

9. **Newsletter archive page** — The newsletter confirmed + unsubscribed routes exist
   (`app/[locale]/newsletter-confirmed/`, `app/[locale]/newsletter/unsubscribed/`) but there
   is no public archive of past issues. Substack, Beehiiv, and boutique eco-retreat brands
   (Can Martí uses Mailchimp with a public archive link) all surface past issues as SEO-indexed
   content. A static `/newsletter/archive` page backed by `lib/data/journal-posts.ts` shape
   (or a new `lib/data/newsletter-issues.ts`) would let the owner publish issue summaries as
   evergreen content. Needs owner to supply at least one issue before value is visible.
   Files: `app/[locale]/newsletter/archive/page.tsx` (new), `lib/data/newsletter-issues.ts`
   (new data file)
   Size: **M**

10. **Waitlist / "notify me" for sold-out tours** — FareHarbor returns `0` availability on
    sold-out dates. `components/booking/availability-urgency.tsx` and
    `lib/use-availability.ts` already consume availability data. Adding a lightweight "Join
    waitlist" form (email + preferred date) that POSTs to a new `/api/waitlist` route (stores
    in DB or emails owner) mirrors the Viator and GetYourGuide pattern. Owner gets a warm
    lead list; user gets a confirmation email. Requires at least `CONTACT_EMAIL` (already
    Tier 1) — no new integrations.
    Files: `app/api/waitlist/route.ts` (new), `components/booking/waitlist-form.tsx` (new),
    `app/[locale]/tours/page.tsx`
    Size: **M**

11. **Donor referral credit / discount reward** — The referral code is tracked in Mollie
    metadata and surfaced in the admin dashboard, but there is no actual reward for the
    referrer. WWF, Donkey Sanctuary, and Memberful all offer a discount month or voucher
    when a referral converts. The infrastructure is complete (code generation, metadata write,
    admin ranking). A discount-code send to the referrer on `checkout.session.completed` /
    `payment.paid` (when `metadata.referredBy` is non-null) closes the loop. Needs owner to
    decide the reward value; the email + code delivery path already exists via
    `buildAdoptDiscountCodesEmail`.
    Files: `lib/payment-handlers.ts` (new branch), `lib/email-templates.ts` (new template)
    Size: **M**

---

## Low-leverage / deferrable

12. **Email preference centre page** — `/api/email-preferences` exists and is token-gated, but
    there is no public `/preferences` page. Every Memberful and Substack account has one.
    Low-leverage because the current email volume is low (welcome, milestone, quarterly,
    birthday, renewal) and unsubscribe already works. Worth doing when the newsletter list
    grows above ~500 subscribers.
    Files: `app/[locale]/preferences/page.tsx` (new)
    Size: **M**

13. **Alpaca name-search / filter on herd page** — `components/alpacas/alpaca-search-filter.tsx`
    exists but the herd roster is small (14 animals). The filter only pays off when the herd
    exceeds ~30 entries or the adoption page links to individual profiles with distinct
    personalities (the `alpaca-personality-match.tsx` component already scaffolds this).
    Deferrable until herd data is owner-confirmed and photos are supplied.
    Size: **S** (component exists, just needs wiring)

14. **Sustainability / eco page** — REALITY_CHECK.md already flags this as a peer norm gap
    (Atzaró, Can Martí, Alpagas du Maquis all have sustainability nav items). The page is built:
    `app/[locale]/sustainability/page.tsx` and its OG image exist. The gap is content (currently
    placeholder) — not code.
    Size: **S** (content-blocked, not code-blocked)

15. **Awards / certification badges** — `components/awards-badges.tsx` exists. This is
    display-only; no feature gap in the code — it just needs owner-supplied credentials
    to become visible. Deferrable until San/Bart have something to display.
    Size: **XS**

---

## Skipped — already present (proof)

| Feature | File:line |
|---|---|
| Booking calendar (FareHarbor embed) | `components/booking/fareharbor-calendar.tsx` |
| Gift cards | `app/[locale]/gifts/page.tsx`, `components/gifts/gift-flow.tsx` |
| Adoption / sponsorship checkout | `app/[locale]/adopt/page.tsx`, `components/adopt/embedded-mollie-checkout.tsx` |
| Newsletter double opt-in + unsubscribe | `app/api/newsletter/route.ts`, `app/api/newsletter/unsubscribe/route.ts` |
| Cookie consent (vanilla-cookieconsent v3) | `components/cookie-consent-v3.tsx` |
| Press / media page | `app/[locale]/press/page.tsx`, `app/[locale]/media/page.tsx`, `app/[locale]/press-kit/page.tsx` |
| Sitemap + robots | `app/sitemap.ts`, `app/robots.ts` |
| RSS (journal) | `app/feed.xml/route.ts` — verify with `find app -name "*.xml"` if missing |
| OG images per page | `app/[locale]/adopt/opengraph-image.tsx`, `app/[locale]/tours/opengraph-image.tsx`, etc. |
| JSON-LD structured data (multiple types) | `lib/structured-data.ts` — TouristTrip, LocalBusiness, Service, FAQPage, Offer, Wedd. |
| Multi-locale (6 locales) | `i18n.config.ts` |
| PWA manifest + service worker | `app/manifest.ts`, `components/sw-register.tsx` |
| Skip links + ARIA | `components/skip-to-main.tsx`, `aria-*` attrs throughout |
| Cookie / privacy / terms | `app/[locale]/cookies/page.tsx`, `/privacy`, `/terms`, `/impressum` |
| Social proof widget | `components/social-proof-strip.tsx` |
| Initials avatar | `components/initials-avatar.tsx` |
| Donor portal (payment history, photo gallery, share CTA) | `app/[locale]/my-adoption/page.tsx`, `components/donor-portal/` |
| Anniversary / milestone emails (30/180/365/730 day) | `lib/milestones.ts`, `app/api/adopt-milestone-emails/route.ts` |
| Review request email (post-tour, 24h) | `app/api/review-request/route.ts` |
| Referral code generation + admin dashboard | `lib/referral-codes.ts`, `app/admin/analytics/referrals/page.tsx` |
| Skein seasonal sponsorship with env-gate | `app/[locale]/skein/page.tsx`, `SKEIN_CALLOUT_LIVE` in `lib/config.ts` |
| Discount codes email (weaving + farm shop) | `lib/email-templates.ts:buildAdoptDiscountCodesEmail()` |
| Google Maps embed (map provider abstraction) | `lib/integrations/map.ts`, `components/tenant-map.tsx` |
| FAQ schema helper + tests | `lib/structured-data.ts:faqPageSchema()`, `lib/faq-schema.test.ts` |
| ICS calendar builder | `lib/calendar/ics.ts`, `/api/calendar/renewal/[sessionId]` |
| Campaign banner (adopt page) | `components/adopt/campaign-banner.tsx` |
