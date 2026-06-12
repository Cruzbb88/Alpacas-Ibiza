# Deploy to Vercel — owner playbook

Step-by-step for first-time deploy of `behnker/Alpacas-Ibiza` to Vercel. **Don't point DNS yet** — that's a separate doc ([`DNS_CUTOVER.md`](DNS_CUTOVER.md)).

Time estimate: ~30 min if all third-party accounts are ready. Longer if you're still creating Stripe / Resend / Turnstile accounts (see Phase 0 below).

---

## Phase 0 — Third-party accounts (do these BEFORE Vercel)

These each take 5–15 min. Each one unlocks one feature. Site deploys without any of them — features fail-quiet until set.

| # | Account | Time | Unlocks | Link |
|---|---|---|---|---|
| 0.1 | Vercel | 2 min | Hosting | [vercel.com/signup](https://vercel.com/signup) |
| 0.2 | Resend | 5 min | Sending email from `noreply@alpacasibiza.com` | [resend.com/signup](https://resend.com/signup) |
| 0.3 | Cloudflare Turnstile | 5 min | Bot protection on forms | [dash.cloudflare.com](https://dash.cloudflare.com/?to=/:account/turnstile) → Turnstile → Add Site |
| 0.4 | FareHarbor Pro API access | 1–3 days wait | Live "X spots left" + weekly digest | Email [support@fareharbor.com](mailto:support@fareharbor.com) asking for External API |
| 0.5 | Google Cloud (Places + GA4) | 10 min | Live Google Reviews badge + service-account access to GA4 | [console.cloud.google.com](https://console.cloud.google.com) |
| 0.6 | Stripe | 10 min | Adopt-a-Paca checkout (only if you want online checkout) | [stripe.com/register](https://stripe.com/register) |
| 0.7 | Mollie | 10 min | Alternative EU/Bancontact processor (optional) | [mollie.com/dashboard/signup](https://www.mollie.com/dashboard/signup) |
| 0.8 | GitHub account access | already done | Pushes trigger deploys | `behnker/Alpacas-Ibiza` confirmed |

**You can skip 0.4–0.7 on first deploy** — the site ships with all features fail-quiet. Add later as accounts come up.

---

## Phase 1 — Connect Vercel to GitHub repo

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → search `Alpacas-Ibiza`
3. If prompted, install the **Vercel GitHub App** on `behnker` namespace
4. Pick the repo, click **Import**
5. Framework Preset: should auto-detect **Next.js**
6. Root Directory: leave blank (the repo root is the project root)
7. Build & Output Settings:
   - Build command: leave default (`next build`)
   - Output directory: leave default (`.next`)
   - Install command: change to `pnpm install` (the repo uses pnpm; Vercel auto-detects from `pnpm-lock.yaml` but worth being explicit)
8. **Don't click Deploy yet** — first paste env vars in Phase 2 so the first deploy works

---

## Phase 2 — Environment variables (paste into Vercel before first deploy)

Vercel: project → **Settings** → **Environment Variables** → **Add New**.

For each row below: paste the value, select **all 3 environments** (Production, Preview, Development) unless noted, click **Save**.

### Required-for-launch (Tier 1)

| Variable | Value | Where to get it | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | [resend.com/api-keys](https://resend.com/api-keys) → Create API Key | Domain unverified at this point is OK — emails will send from Resend's shared domain until DKIM verified |
| `CONTACT_EMAIL` | `info@alpacasibiza.com` | (your business inbox) | All form submissions route here |
| `NEXTAUTH_SECRET` | output of `openssl rand -hex 32` | Run `openssl rand -hex 32` in your terminal — produces a 64-char hex string | Used for JWT signing on admin login |
| `NEXTAUTH_URL` | `https://alpacasibiza.com` | (your final domain) | Will fail-quiet on preview URLs |
| `ADMIN_USERNAME` | (your pick) | — | Used to sign in at `/admin/login` |
| `ADMIN_PASSWORD` | (a strong password) | Generate at [1password.com/password-generator](https://1password.com/password-generator/) — 24+ chars | Hashed in transit only |
| `FAREHARBOR_WEBHOOK_SECRET` | `openssl rand -hex 32` | Same generator | Set the same value in FareHarbor dashboard's webhook config — see Phase 4 |
| `CRON_SECRET` | `openssl rand -hex 32` | Same generator | Protects `/api/owner-digest` from public access |

### Tier 2 (graceful degradation — site works without)

| Variable | Where to get | Unlocks |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site config | Form CAPTCHA |
| `TURNSTILE_SECRET_KEY` | same | server-side verify |
| `FAREHARBOR_APP_KEY` | FareHarbor support email response | Live availability widget |
| `FAREHARBOR_USER_KEY` | same | same |
| `FAREHARBOR_ITEM_TOUR_MEET_HERD` | FareHarbor dashboard → Items → copy numeric ID | Per-tour Book buttons |
| `FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP` | same | |
| `FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE` | same | |
| `FAREHARBOR_ITEM_TOUR_PHOTO_SESSION` | same | |
| `FAREHARBOR_ITEM_YOGA` | same — create a yoga item first | Yoga page direct booking |
| `GA4_PROPERTY_ID` | GA4 Admin → Property settings → Property ID | Admin analytics dashboard |
| `GA4_CLIENT_EMAIL` | GCP service account JSON | same |
| `GA4_PRIVATE_KEY` | same JSON — **paste with literal `\n` chars** | same — Vercel preserves them |
| `GOOGLE_PLACES_API_KEY` | [GCP Maps Platform → Credentials](https://console.cloud.google.com/google/maps-apis/credentials) | Live Google Reviews badge |
| `GOOGLE_PLACES_PLACE_ID` | [Place ID finder](https://developers.google.com/maps/documentation/places/web-service/place-id) | same |
| `PAYMENT_VENDOR` | `mollie` (recommended, default per ADR 019) or `stripe` | Selects payment adapter — if unset, adopt CTA falls back to mailto |
| `STRIPE_SECRET_KEY` | [stripe.com/dashboard/apikeys](https://dashboard.stripe.com/apikeys) | Adopt-a-Paca checkout |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → endpoint signing secret | webhook signature verification |
| `STRIPE_ADOPT_PRICE_ID_MONTHLY` | Stripe Dashboard → Products → Adopt-a-Paca → Pricing | recurring sub |
| `STRIPE_ADOPT_PRICE_ID_YEARLY` | same | yearly prepay |
| `ADOPT_DISCOUNT_CODE_WEAVING_10` | (your code) | renders in welcome email |
| `ADOPT_DISCOUNT_CODE_FARMSHOP_15` | (your code) | same |
| `NEXT_PUBLIC_SITE_URL` | leave blank in prod; for preview deploys you may set it to override the canonical domain | OG URLs / sitemap |

**Reference**: every env var is documented inline in [`.env.local.example`](.env.local.example). The list above is the authoritative subset that Vercel needs.

---

## Phase 3 — First deploy (preview)

1. Back in the Vercel project page, click **Deploy**
2. Wait ~2 min — first build is slower
3. Vercel gives you a preview URL like `alpacasibiza-{hash}-{team}.vercel.app`
4. Click it. Confirm:
   - Home renders (Hero + 4 paths)
   - `/en/tours` loads + FareHarbor calendar shows
   - `/en/alpacas` lists 14 named alpacas
   - `/en/journal` index + at least 1 post link works
   - `/api/health` returns `{ ok: true, ... }`
   - `/sitemap.xml` returns valid XML
   - `/robots.txt` says `Disallow: /` (correct on preview — production allows)
5. Submit the contact form with a test message — confirm it arrives at `CONTACT_EMAIL`

If any of the above fails, click **Functions** tab in Vercel → check route logs. Most likely cause: a Tier 1 env var typo.

---

## Phase 4 — FareHarbor webhook wiring (after first preview is live)

FareHarbor needs to know which URL to POST to when bookings happen.

1. Log into FareHarbor dashboard
2. **Integrations** → **Webhooks** → **Add Webhook**
3. URL: `https://<your-vercel-preview-url>/api/fareharbor-webhook`
4. Events: select `booking.created`, `booking.updated`, `booking.cancelled`
5. Add header: `x-webhook-secret: <FAREHARBOR_WEBHOOK_SECRET-value-from-Phase-2>`
6. Save
7. Trigger a test booking through FareHarbor → confirm Vercel logs show the webhook POST

After you switch DNS to production (next doc), update the webhook URL to `https://alpacasibiza.com/api/fareharbor-webhook`.

---

## Phase 5 — Cron jobs (auto-enabled on Vercel Pro tier)

The repo already has [`vercel.json`](vercel.json) with **7 crons**:

| Path | Schedule | What it sends |
|---|---|---|
| `/api/owner-digest` | Mon 09:00 UTC | Weekly booking/revenue digest |
| `/api/owner-mrr-digest` | Mon 06:00 UTC | MRR/ARR/dunning summary |
| `/api/adopt-quarterly-update` | 1 Jan/Apr/Jul/Oct 09:00 UTC | Quarterly farm-news email to all adopters |
| `/api/adopt-deferred-gifts` | Daily 09:00 UTC | Processes gift adoptions on their delivery date |
| `/api/adopt-renewal-reminders` | Daily 10:00 UTC | 7-day renewal reminder to annual adopters |
| `/api/adopt-milestone-emails` | Daily 11:00 UTC | Milestone celebrations (6-month, 1-year, etc.) |
| `/api/alpaca-birthday-cards` | Daily 09:00 UTC | Birthday cards for adopter's chosen alpaca |

**Important:** Vercel Hobby plan is limited to **2 crons**. With 7 crons configured, the excess 5 will silently never fire on Hobby. **Upgrade to Vercel Pro** (or confirm you are already on Pro) before relying on the quarterly, gifts, renewal-reminder, milestone, or birthday-card crons.

Vercel auto-detects crons from `vercel.json`. No manual setup needed beyond the plan check.

To trigger any cron manually for testing:

```
curl 'https://<your-vercel-url>/api/owner-digest?secret=<CRON_SECRET>'
```

---

## What I cannot do for you

- Run `vercel login` (requires your Vercel account auth)
- Generate your secrets (must be entropy you control)
- Click "Add domain" in Vercel — DNS cutover is the moment Squarespace dies, see [`DNS_CUTOVER.md`](DNS_CUTOVER.md)
- Approve the Vercel GitHub App on `behnker` org (one-time consent)

---

## What I've prepared for you in this repo

- All 18+ env vars documented in `.env.local.example`
- 5 failsafe modes (Tier 1 errors loudly, Tier 2 fails quietly + warns) — see `lib/validate-env.ts` boot check
- `vercel.json` cron config (no edits needed)
- `next.config.mjs` security headers (CSP Report-Only, HSTS, X-Frame, etc.)
- Image set: `app/icon.tsx` + `apple-icon.tsx` + `icon-maskable.tsx` (no static files needed — Edge renders)
- Robots dynamic: production allows + sitemap; preview disallows all
- `/api/health` for uptime monitoring
- `/sitemap.xml`, `/sitemap-news.xml`, `/manifest.webmanifest`, `/journal/rss.xml` all auto-generated

When DNS cutover happens, all of this lights up at once. No additional code work needed.
