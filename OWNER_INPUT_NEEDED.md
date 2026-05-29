# Owner Input Needed — Alpacas Ibiza Site

**Context**: the site code is ready. These are the things only the owner can confirm, produce, or grant access to. Grouped by priority so you can ask in batches.

> ⚠️ = launch blocker
> 🟡 = needed within a month of launch
> 🟢 = nice-to-have / later

---

## ⚠️ Must confirm BEFORE launch

### Cancellation policy
- Is free cancellation actually **24 hours** before the visit? (Currently showing "Free cancellation up to 24h before your visit" on every Book button.)
- Other possibilities: 48h, 7 days, non-refundable, partial refund with N% fee
- **Must match the FareHarbor booking flow setting exactly** — otherwise guests get mismatched expectations
- Where to display: currently under every "Book Now" CTA. Also needs explicit Terms text.

### Pricing to display as anchor on tour cards
Currently the 4 tour cards just show title + description. Competitors show "from €35/person" as a price anchor before users click — industry data shows this lifts conversion 10-15%.

For each of the 4 tours, we need:
- **Meet the Herd**: starting price per adult? Per child?
- **Weaving Workshop**: price?
- **Farm Experience**: price?
- **Photo Session**: price? (or is this a separate premium package?)
- **Are prices different in peak season vs off-season?**

### Phone contact method — which number?
Currently the footer uses **+32 475 58 65 44** (Belgian). Same number is used for the WhatsApp click-to-chat.

- Is this the owner's Belgian mobile that gets used in Ibiza? (ok if yes)
- Or should there be a Spanish +34 number? If yes, what is it?
- Which number should receive booking inquiries vs support?

### Real photos
Lots of placeholders remain in the codebase. Owner needs to provide:
- Hero image (farm / alpacas close-up) for home page
- Team photos with names + short bios (humanizes the business, big trust lever)
- Tour-specific imagery — one per tour (meet herd, weaving, farm, photo)
- Alpaca "product" photos (if doing photo package)
- Process/lifestyle shots for About page
- Woven item product photography (if shop is live)
- Ideally: one short video clip (15-30 sec) of the farm/alpacas — video heroes lift engagement ~30%

### Privacy Policy & Terms of Service
Current pages are **placeholder/generic text**. GDPR legal risk if not updated.
- Real data collection practices (Resend emails, GA4, FareHarbor bookings, GTM)
- Real cancellation / refund policy language
- Real cookie list (the cookies we actually set)
- Data controller / contact details
- Optional: lawyer review — especially since EU business

### Spanish legal requirements
For a business registered in Spain, the footer needs:
- **CIF** number (Spanish tax ID)
- Registered business name (if different from "Alpacas Ibiza")
- Physical address in full
- Owner's country of operation / residence

---

## 🟡 Needed within a month of launch

### FareHarbor configuration the owner must do
1. **Request External API access** — email `support@fareharbor.com` asking for API app key + user key. This unlocks:
   - Live "X spots left" urgency widget on tour cards
   - Weekly owner digest email with real booking numbers
   - Any future automation
2. **Set up webhooks** — ask FareHarbor support to POST on these events:
   - `booking.created` → `POST /api/reminder` (48h before tour — reminder email)
   - `availability.completed` → `POST /api/review-request` (24h after tour — review request email)
   Include header `x-webhook-secret: <FAREHARBOR_WEBHOOK_SECRET>` (we set this env var)
3. **Item IDs for each tour** — in FareHarbor go to Online Booking → Booking Flows → Default Flow → click each tour. The URL shows `/items/<ID>/`. We need the IDs for:
   - Meet the Herd
   - Weaving Workshop
   - Farm Experience
   - Photo Session
   (Used for per-tour "Book this one" buttons and tour-specific availability.)
4. **Gift card item setup** — FareHarbor → Build → Gift Cards → create gift card offering. Gets embedded on `/gifts` page.
5. **Discount codes** — FareHarbor → Build → Discount Codes. Suggested codes:
   - `RETURN10` (10% off returning guests, referenced in post-tour review email)
   - `FIRSTVISIT` (optional, for first-time visitors from newsletter)

### Content questions

| Question | Why it matters |
|---|---|
| Cancellation policy text (full legal) | Terms page |
| Real bio + photo for each team member | About page; conversion |
| Actual tour duration, capacity per tour, minimum age | Display on tour cards |
| Languages the team speaks | Trust signal for international visitors |
| Directions from Ibiza airport / towns | Pre-visit reminder email + About page |
| Parking availability, accessibility notes | Reduces day-of support inbound |
| What to wear / bring — your official list | Pre-visit reminder email |
| Dietary/allergy considerations | If there's a snack/meal component |

### Analytics owner access
Two paths — **pick one**:

**Option A** (easier): Invite the owner to GA4 directly.
- Log into analytics.google.com with the site's Google account
- Admin → Account Access Management → Add user
- Enter owner's email, role: "Viewer"
- Owner logs into analytics.google.com with their own Google account → sees full native dashboard

**Option B** (branded in-site admin): Set up GA4 service account and use our custom `/admin/analytics` page.
- Cloud console → create service account with "Viewer" role on the GA4 property
- Generate JSON key, extract client_email + private_key
- Set env vars: `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`
- Also set `ADMIN_USERNAME` + `ADMIN_PASSWORD` (currently unsafe defaults `admin`/`password`)
- Owner visits `alpacasibiza.com/admin/login`

### Google reviews integration
The `GoogleReviewsBadge` component is built but needs:
- **Google Places API key** — https://console.cloud.google.com/google/maps-apis/credentials → enable "Places API (New)"
- **Google Business Profile Place ID** — https://developers.google.com/maps/documentation/places/web-service/place-id → search "Alpacas Ibiza" → copy the ID
- Set env: `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACES_PLACE_ID`
- Once set, live 4.x★ + review count shows up on tours page

### Vercel deployment
- Vercel account connected to the GitHub repo
- Environment variables pasted into Vercel dashboard (everything from `.env.local.example`)
- Custom domain `alpacasibiza.com` pointed at Vercel
- **Set strong `ADMIN_USERNAME` + `ADMIN_PASSWORD`** before going live (currently defaults are `admin`/`password`)

### Resend domain verification
Right now emails go from Resend's default domain. For production:
- Verify `alpacasibiza.com` in Resend dashboard
- Add DKIM/SPF DNS records (Resend provides them, owner pastes into domain registrar)
- Change `from` addresses in routes to `hello@alpacasibiza.com`

### Cloudflare Turnstile registration
Free, 5 minutes. Protects contact/commission/newsletter forms from bots.
- Register site at https://dash.cloudflare.com → Turnstile
- Choose "Managed" widget
- Copy **Site Key** (public) → env `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- Copy **Secret Key** (private) → env `TURNSTILE_SECRET_KEY`
- Without these set, forms still work but are unprotected

### Cron service for weekly digest
The `/api/owner-digest` endpoint sends a weekly email. Needs to be triggered by:
- **Vercel Cron** (easiest — `vercel.json` file, free tier supports weekly)
- Or UptimeRobot free plan hitting the URL every Monday 9am
- Pass `?secret=<CRON_SECRET>` in the URL
- Requires the FareHarbor API creds from above to return real data

---

## 🟢 Optional ideas — decide YES / NO + provide answers

Same format as the launch section — each idea is a short block. Owner answers questions → we build.

### "Adopt an Alpaca" monthly subscription
- Yes / No?
- Price per month? (suggested: €15)
- Which alpacas can be sponsored?
- What does a sponsor get each month? (photo? video? email update? plaque on-site?)
- Max sponsors per alpaca?
- Cancellation policy?

### Photography package (golden-hour shoots with alpacas)
- Yes / No?
- Price per session?
- Duration?
- How many guests per session?
- Does owner provide the photographer, or is it BYO?
- Photos delivered how? (digital download? prints?)

### Online weaving masterclass (recorded video, sold globally year-round)
- Yes / No?
- Price per access?
- Who teaches it?
- One-time access or subscription?

### Corporate team-building packages
- Yes / No?
- Day-rate pricing? Per-person pricing?
- What's included (lunch? transport? weaving workshop? farm tour?)
- Min / max group size?
- Off-peak discount for corporate?

### School field trips
- Yes / No?
- Per-student price?
- Minimum group size?
- Which months available?
- Any curriculum/educational tie-in?

### Winter weaving workshops (indoor, off-season)
- Yes / No?
- Price?
- Typical schedule (which months, which days)?
- Indoor only, or weather-permitting outdoor option?

### Loyalty program (visit X, get Y free)
- Yes / No?
- Structure: visit 3×, get 4th free? Other?
- Applies per person, or transferable between people in a group?

### Referral program ("friend gets 10%, you get 10%")
- Yes / No?
- Discount percentage?
- Valid on which tours?
- One-time or unlimited referrals?

### Instagram UGC campaign ("tag us for a chance to win")
- Yes / No?
- Prize? (free tour? product? voucher?)
- How often does it run? (monthly? seasonal?)
- Hashtag to use?

### Video hero on home page
- Yes / No?
- Who shoots the 15-30 sec clip?
- Budget for a videographer, or phone footage OK?

### "Featured in" / press logos section
- Any press coverage so far? (outlet names)
- Got written permission to use their logos?

### Off-season holiday gift push (Nov-Dec)
- Yes / No?
- Which Ibiza markets / pop-ups to attend?
- Send a dedicated gift-voucher email campaign?
- Special discount code for holiday gifting?

---

## Content-creation shopping list (for owner)

For the designer / photographer / owner to produce:

- [ ] Home hero image OR video (1920×1080 min)
- [ ] 4 tour-specific images (one per tour type)
- [ ] Team bios + headshots (2-3 per person: portrait + candid)
- [ ] About page "our story" photos (farm, founding moments)
- [ ] Process photos (alpacas being fed, shearing, weaving in progress)
- [ ] Product photography for shop items (if selling woven goods online)
- [ ] Open Graph image `/public/images/og-default.webp` (1200×630)
- [ ] Logo assets — SVG + PNG 512×512 + favicon
- [ ] Any press coverage / media mentions (logos + permissions)

---

## Quick-reference env vars still to set

```
# Must set before production deploy
ADMIN_USERNAME=<secure username>
ADMIN_PASSWORD=<strong password, 16+ chars>
NEXTAUTH_SECRET=<random 32+ char string>

# Required for Turnstile bot protection (5 min setup)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Required for weekly owner digest cron
CRON_SECRET=<random string, used in the cron URL>

# Required for FareHarbor webhooks (ask FareHarbor support)
FAREHARBOR_WEBHOOK_SECRET=<random string>
FAREHARBOR_APP_KEY=<from FareHarbor support>
FAREHARBOR_USER_KEY=<from FareHarbor support>

# Required for live "X spots left" widget (needs API access above)
# Same keys — already covered above

# Optional — only if using custom analytics dashboard instead of GA4 native
GA4_PROPERTY_ID=
GA4_CLIENT_EMAIL=
GA4_PRIVATE_KEY=

# Optional — only if pulling live Google reviews
GOOGLE_PLACES_API_KEY=
GOOGLE_PLACES_PLACE_ID=
```

---

## Summary: Three conversations to have with the owner

**1. 20-minute call — "confirm these facts"**
- Cancellation policy (duration, partial refund terms)
- Prices per tour, per season
- Phone number to display
- Business legal name + CIF
- Languages team speaks
- Directions + parking

**2. 30-minute working session — "produce these assets"**
- Photos + videos for each page
- Team bios
- Cancellation / terms / privacy policy text (or hire a lawyer)

**3. Async — "grant these accesses"**
- FareHarbor API access request email to `support@fareharbor.com`
- GA4 viewer invite (owner's Google email)
- Cloudflare Turnstile site registration (5 min online)
- Vercel account + domain DNS access
- Resend domain verification
- **Gift adoption end-to-end wiring** — `AdoptGiftAdoption` captures recipient name/email/delivery-date into URL params, but the checkout adapters don't yet thread them into Stripe/Mollie metadata, and the welcome email template doesn't have a "gift" variant. Owner decisions needed: (a) should the certificate show donor or recipient name? (b) does the welcome go to recipient on delivery date, or to donor immediately? (c) does cancellation cascade if the recipient declines? See `handoff/PEER_REVIEW_2026-05-29-mollie-management.md` for context.
