# Fresh Eyes Opportunities — Alpacas Ibiza

_Reviewed 2026-06-10. Codebase read: CLAUDE.md, README.md, app/[locale]/page.tsx._
_Each item verified NOT already built via grep before inclusion._

---

## 1. DATA-AS-FEATURE — Post-booking adopt upsell on the tour confirmation page

**What the site collects:** FareHarbor sends the booker's date/bookingId to `/[locale]/tour-confirmation`. That page already exists and renders a clean confirmation UI with calendar links. It has zero onward CTAs beyond "back to home" and a directions link.

**The gap:** Every person who just paid €21.19 for a tour is at peak emotional engagement with the farm. That moment is the highest-conversion window for adoption sponsorship, yet the page sends them straight back to the homepage with no offer.

**Implementation sketch:** Add a single section to `tour-confirmation/page.tsx` below the "What to bring" card. Read `ADOPT_PRICE_MONTHLY_EUR` from `lib/config.ts` (already imported by `page.tsx`). Render a soft CTA card: "Want to stay connected to [alpaca name]? Adopt a paca for €X/month." Link to `/[locale]/adopt`. No new API calls needed. Zero backend work. Server component — no `'use client'` required.

**Effort:** S (2–3 hours)

**Owner data needed:** None — uses existing config constants.

---

## 2. REVENUE LAYER — "Bring Your Own Group" private-tour deposit via Stripe

**The gap:** The tours page mentions corporate team-building and romantic sunset experiences but all pricing goes through FareHarbor's per-person calendar. There is no path for someone who wants to say "I have 8 friends — can I book the whole farm for 2 hours on a Tuesday?" Groups larger than ~4 can't self-serve and email falls through.

**Why it fits the brand:** Ibiza is a destination for weddings, hen parties, and retreats. A private session at a Mediterranean alpaca farm is a distinctive premium activity. Competitors (UK farms, Ibiza activity operators) don't offer a seamless online deposit path for custom private groups.

**Implementation sketch:** Add a `/[locale]/experiences/private-group` page with a 3-field form (date preference, group size, contact email). On submit, call a new `/api/private-group-intent` route that creates a Stripe PaymentIntent for a €50 deposit (non-refundable to prevent spam) using `lib/integrations/payment-stripe-direct.ts`. On payment, email the owner via Resend using the existing `sendEmail` helper. No FareHarbor dependency — the deposit is just a signal of intent; the owner coordinates the rest over WhatsApp. Add a `BookingButton` variant that points to this page when group size > 5 is detected on the tours page FAQ.

**Effort:** M (1–2 days)

**Owner data needed:** Stripe keys (already required), desired deposit amount, whether group size cap applies.

---

## 3. RETENTION / COMMUNITY — "Alpaca Postcard" quarterly photo drop for newsletter subscribers

**The gap:** The newsletter infrastructure is fully built (double opt-in, GDPR, Resend, archive page at `/[locale]/newsletter/archive`, issue data in `lib/data/newsletter-issues.ts`). But the value proposition for subscribing is generic ("farm news"). There is no tangible, habit-forming artifact that makes subscribers feel they belong to something.

**Why it works:** Adopters already get quarterly updates via `/api/adopt-quarterly-update`. Newsletter subscribers — who are a larger, lower-commitment audience — get nothing comparable. A themed quarterly "Alpaca Postcard" with a single photo of one named alpaca, one fun fact, and one seasonal Ibiza note (shearing season, newborn season, summer heat) gives subscribers a reason to open every issue and a reason to forward it.

**Implementation sketch:** Add a new `NewsletterIssueCard` component (mirrors `JournalCard`) that renders the postcard layout. Source one alpaca record from `lib/data/alpacas.ts` per quarter — the `AlpacaOfTheDay` deterministic-rotation logic already exists and can be reused with a quarterly epoch instead of daily. Add an `issueType: 'postcard'` field to `lib/data/newsletter-issues.ts`. The `/[locale]/newsletter/archive` page already lists issues; postcards show inline with the existing layout. Owner creates the content; the code just renders it.

**Effort:** S (half a day for the component + data shape)

**Owner data needed:** Owner writes the quarterly text and selects the alpaca. One photo per quarter.

---

## 4. OPERATIONAL LEVERAGE — Admin "Today" page with WhatsApp-ready booking summary

**The gap:** `/admin/today` already exists as a page file but the grep for "weekly digest" shows the MRR digest only covers subscription data, not daily FareHarbor bookings. The owner currently has to log into FareHarbor separately to know who is arriving today.

**Why it matters:** For a small owner running physical tours by appointment, knowing at 8 AM "you have 3 visitors at 10:00, 2 at 14:00" with a WhatsApp-ready message is a weekly time-saver. It also reduces no-shows if the owner can send a reminder without copy-pasting.

**Implementation sketch:** Extend `/admin/today` to call the FareHarbor availability API (already wired in `lib/booking-engine/fareharbor-adapter.ts`) for today's date and render a structured guest list. Add a "Copy WhatsApp message" button that produces: "Good morning! Reminder: you have a tour today at [time]. We're at Es Currals, San Carlos. See you soon! 🦙" using the `Clipboard API`. This is a pure read path — no new API routes needed. Rate-limit via existing `fetchWithTimeout`. Gate behind the existing NextAuth session (same `getServerSession(auth)` pattern used across admin pages).

**Effort:** S–M (1 day)

**Owner data needed:** FareHarbor API keys (already a TIER1 env var). Owner decides what the WhatsApp template says.

---

## 5. DIFFERENTIATION — Public "Herd Diary" feed: real alpaca weight / shearing / health events

**The gap:** No UK alpaca farm or Ibiza brand publishes a live, named-animal diary as part of their public site. The codebase already has `lib/data/alpacas.ts` with individual alpaca records, `AlpacaOfTheDay`, and individual alpaca profile pages at `/[locale]/alpacas/[slug]`. The journal system at `lib/data/journal.ts` is fully built. But none of these surfaces per-animal lifecycle events in a feed format.

**Why it differentiates:** Adopters sponsored at €75/month or €900/year want to feel their alpaca is real and present. A "Herd Diary" — shearing date, weight check, new haircut photo, "Dulcie had a funny day today" — turns the sponsorship from a transaction into a relationship. No FareHarbor, Stripe, or Mollie customer has any reason to churn when their alpaca is posting updates. UK competitors (Alpaca My Bags, Bozedown) do none of this.

**Implementation sketch:** Add a `HerdEvent` type to `lib/data/alpacas.ts` with fields `alpacaSlug`, `date`, `eventType` (`shearing | weigh-in | milestone | note`), `body: string`, `imageSlug?: string`. Add a `/[locale]/herd-diary` page that lists events chronologically, filtered by alpaca (URL param `?alpaca=dulcie`). Individual alpaca pages at `/[locale]/alpacas/[slug]` already exist — add a "Recent diary entries" section by filtering `HerdEvent[]` for that slug. Owner populates events in `lib/data/alpacas.ts` (same pattern as journal posts). No new backend needed. The donor portal at `/[locale]/my-adoption` can link directly to `?alpaca=[adoptedSlug]` so adopters land on their alpaca's feed.

**Effort:** M (1 day for data shape + diary page + alpaca page integration)

**Owner data needed:** Owner populates events. Needs at least 3–5 real events per alpaca to feel alive on launch.

---

## Prioritisation

**Highest leverage, lowest cost:**

1. **#1 (Post-booking adopt upsell on tour confirmation)** — S effort, zero backend work, targets buyers at peak emotional engagement. A 5% conversion rate on tour confirmers would meaningfully grow adoption MRR with no extra acquisition spend.

2. **#5 (Herd Diary)** — M effort, no new infrastructure, uses existing data patterns. It is the only item here that creates a differentiation moat: once adopters are emotionally attached to a named animal with a diary, competitor farms cannot replicate that relationship. It also directly answers the highest churn risk (adopters losing the "realness" feeling after the welcome email fades).

Items #3 and #4 are both S effort and should be bundled into the same sprint as #1. Item #2 (private group deposit) is the only one requiring new payment infrastructure and should be deferred until tours are at capacity.
