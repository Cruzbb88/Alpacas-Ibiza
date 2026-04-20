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

## 🟢 Optional expansion / revenue ideas (no rush)

These came out of my brainstorm. Owner should pick which to pursue — each has a small build cost + ongoing effort trade-off.

| Idea | Owner decision | Effort once decided |
|---|---|---|
| **"Adopt an Alpaca" subscription** (€15/mo, recurring revenue, works off-season) | Pricing, which alpacas, what the monthly update contains (photo? video? newsletter?), how many sponsors per alpaca | 1 page + Stripe subscription (~1 day build) |
| **Photography package (golden hour)** | Pricing, duration, what's included, booked as a separate FareHarbor item? | Just add as a FareHarbor item |
| **Online weaving masterclass** (recorded video, sell globally year-round) | Who teaches it, duration, price, video production | Owner-driven content production |
| **Corporate team-building package** | Day-rate pricing, what's included (lunch? Transport?), min/max group size | Page exists — needs pricing + visuals |
| **School field trips** (off-season revenue) | Per-student pricing, group minimum, date availability | New FareHarbor item + school outreach |
| **Winter weaving workshops** (off-season) | Indoor vs outdoor, schedule, min attendees | Recurring FareHarbor slot |
| **Loyalty program** (visit 3x, get 4th free) | Implement as discount code or stamp card? | FareHarbor discount codes |
| **Instagram UGC campaign** ("Tag us for a chance to win") | Prize, duration, rules | Just a social post |
| **Referral code system** ("Send a friend, both get 10% off") | Tracking mechanism (code per referrer?) | FareHarbor discount codes |
| **Video hero on home page** | Where to source 15-sec clip | ~1 day clip sourcing/editing |
| **Press logos / "Featured in" section** | Which press outlets have covered you? | Owner provides logos with permission |
| **Off-season holiday gift push** | Calendar of Christmas market pop-ups, discount codes, email campaigns | Seasonal content + email sends |

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
