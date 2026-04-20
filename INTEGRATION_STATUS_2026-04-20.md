# Integration Status — Alpacas Ibiza site (2026-04-20)

## Status matrix

| Integration | Status | What's wired | What's missing | Blocker |
|---|---|---|---|---|
| **Email (Resend)** | 🟢 LIVE | Contact/Commission/Newsletter forms → /api/* → Resend → `info@alpacasibiza.com` | Nothing | none |
| **FareHarbor booking embed** | 🟢 LIVE | Calendar on /tours, FLOW=1257173, shortname=alpacasibiza, 720p30 replay settings applied | Tour item IDs (4) — optional polish | none |
| **GTM — primary** | 🟢 LIVE | `GTM-NJRGZPGS` in layout.tsx | Nothing | none |
| **GTM — FareHarbor** | 🟢 LIVE | `GTM-KR3CGLS6` in layout.tsx (just added, Prove green) | Nothing | none |
| **GA4 front-end tracking** | 🟢 LIVE | `G-Y946QDVVQV` in layout.tsx, window.gtag available, `trackEvent()` helper in lib/analytics.ts | Hook calls not yet placed in all components | Optional — events fire generically |
| **Owner analytics dashboard** | 🟡 BUILT-not-WIRED | `/admin/login`, `/admin/analytics` pages + `/api/analytics/data` route exist | **GA4 service account credentials not set** (GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY) | Needs GA4 service account |
| **Admin auth** | 🔴 UNSAFE | NextAuth CredentialsProvider configured at /api/auth/[...nextauth] | **Falls back to `admin`/`password`** defaults if env unset | MUST set ADMIN_USERNAME + ADMIN_PASSWORD before any deploy |
| **FareHarbor Availability API** | 🟡 STUB | /api/availability route exists with timeout + per-item-failure gadgets | No API credentials (requires Pro plan) | Wait for FareHarbor to grant API access OR skip |
| **i18n** | 🟢 LIVE | 6 locales (en/de/it/es/nl/fr), middleware routing | Nothing | none |
| **E-commerce (Shop)** | ⚪ N/A | Static pages only — all purchasing routed through FareHarbor | No cart/Stripe/Shopify integration | By design; shop purchases go through FareHarbor items |
| **Database** | ⚪ N/A | None | No DB layer planned | By design; form data → email only |
| **SEO (JSON-LD schema)** | 🔴 MISSING | Organization/LocalBusiness schema not emitted | Schema injection in layout/page | Add JSON-LD scripts |
| **Deployment** | 🔴 NOT DEPLOYED | No Vercel/Netlify config; tunnel-only for testing | Push to Vercel + add env vars | Deploy when ready |

**Legend**: 🟢 LIVE | 🟡 partial/needs config | 🔴 blocker | ⚪ N/A by design

## How the OWNER views statistics

**Path exists — needs credentials.** The build already includes:

1. `/admin/login` — NextAuth login form
2. `/admin/analytics` — protected page rendering `AnalyticsDashboard`
3. `/api/analytics/data` — server route calls Google Analytics Data API (v1 Beta) for last 30 days: users, sessions, pageviews, bounce rate, top pages

**To turn it on, you need to:**

1. **Create a Google Cloud service account** with "Viewer" role on the GA4 property
2. Add to `.env.local`:
   ```
   GA4_PROPERTY_ID=<numeric id from GA4 Admin → Property Settings>
   GA4_CLIENT_EMAIL=<service-account-name>@<project>.iam.gserviceaccount.com
   GA4_PRIVATE_KEY=<full PEM private key — keep the \n characters literal>
   ```
3. Set admin login:
   ```
   ADMIN_USERNAME=<a real username>
   ADMIN_PASSWORD=<a strong password>
   ```
4. Owner visits `https://alpacasibiza.com/admin/login` → signs in → sees dashboard

**Alternative (simpler) path:** instead of the custom dashboard, just **invite the owner to GA4 directly**:
- GA4 → Admin → Account Access Management → Add user (owner's email) with "Viewer" role
- Owner logs into https://analytics.google.com with their Google account
- They see the full native GA4 dashboard (more data + filters than your custom one)

**Recommendation**: use GA4 native access for speed to launch. Keep the custom dashboard as a branded alternative later.

## Priority next actions

1. **Set ADMIN_USERNAME + ADMIN_PASSWORD** in `.env.local` NOW (unsafe defaults in place)
2. **Grab FareHarbor item IDs** (the 4 tours) and fill .env.local TODO lines — enables per-tour Book Now buttons
3. **Decide**: GA4 native access OR fill in GA4 service account credentials for custom dashboard
4. **Commit the 4 uncommitted files** so deploy is possible
5. **Deploy to Vercel** (recommended) — auto-connects to GitHub, env vars pasted in dashboard
6. **JSON-LD schema** — add Organization + LocalBusiness + Event schema to layout for SEO

## Everything already working

- ✅ Tours page with real FareHarbor calendar embed
- ✅ All 3 forms send emails (contact, commission, newsletter)
- ✅ 6-locale i18n routing
- ✅ Both GTM containers firing
- ✅ GA4 front-end pixel firing
- ✅ Error-recovery gadgets (4/5 injected — timeout, parallel failure tolerance, script fallback, abort-on-unmount)
- ✅ Sitemap.xml + robots.ts generated
- ✅ OpenGraph + alternate language links in metadata

## What owner CAN see / CANNOT see right now

| Data | Where owner sees it | Status |
|---|---|---|
| Tour bookings | FareHarbor dashboard (login with alpacasibiza account) | 🟢 live via FareHarbor |
| Booking revenue | FareHarbor dashboard | 🟢 live via FareHarbor |
| Site traffic / pageviews | GA4 (needs invite) OR /admin/analytics (needs credentials) | 🟡 needs setup (one of two paths) |
| Contact form submissions | Email inbox at info@alpacasibiza.com | 🟢 live |
| Commission inquiries | Email inbox | 🟢 live |
| Newsletter signups | Email inbox (and optionally SendGrid list) | 🟢 live |
| Conversions in GTM | GTM-KR3CGLS6 container (FareHarbor sees these) | 🟢 just installed |
