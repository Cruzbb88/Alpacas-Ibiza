# Personalization intake registry

Hand me any piece of data and this file tells us **exactly where it goes**,
**what format it needs**, and **how we know it worked**. No piece of your
data has an ambiguous home anymore.

Format of every row:
- **Slot** — the name of the thing
- **Goes in** — exact file / env var / dashboard
- **Format** — what the value must look like
- **Unlocks** — what turns on once it's filled
- **Verify** — how we confirm it took

When you give me data, I match it to a slot, apply it, and run the Verify
step. If something doesn't match a slot here, that's a gap and I add the slot.

---

## 1. Secrets & keys (Vercel env vars — NEVER commit)

These are set in Vercel Project Settings → Environment Variables, or in
`.env.local` for local dev. I can scaffold `.env.local`; the real values are
yours to paste.

### Tier 1 — site breaks / unsafe without these

| Slot | Goes in | Format | Unlocks | Verify |
|---|---|---|---|---|
| `RESEND_API_KEY` | Vercel env | `re_...` | All outbound email | Test welcome email arrives |
| `CONTACT_EMAIL` | Vercel env | email | Reply-to + owner fallback | Appears as reply-to |
| `OWNER_EMAIL` | Vercel env | email | MRR digest + alerts recipient | Monday digest arrives |
| `NEXTAUTH_SECRET` | Vercel env | 32+ random chars | Admin login + token signing | Admin login works |
| `NEXTAUTH_URL` | Vercel env | `https://alpacasibiza.com` | Admin auth callback | No login redirect loop |
| `ADMIN_USERNAME` | Vercel env | string | Admin login | `/admin/login` accepts it |
| `ADMIN_PASSWORD` | Vercel env | strong string | Admin login | `/admin/login` accepts it |
| `CRON_SECRET` | Vercel env | 32+ random chars | All cron routes (digests, milestones, quarterly) | Cron returns 200 not 401 |
| `FAREHARBOR_WEBHOOK_SECRET` | Vercel env | shared secret | Booking reminder/review crons | Webhook accepts delivery |

### Tier 2 — payments (pick Mollie OR Stripe; Mollie is default per ADR 019)

| Slot | Goes in | Format | Unlocks | Verify |
|---|---|---|---|---|
| `PAYMENT_VENDOR` | Vercel env | `mollie` or `stripe` | Activates the chosen processor | Checkout 303s, not mailto |
| `MOLLIE_API_KEY` | Vercel env | `live_...` / `test_...` | Mollie checkout + webhooks | `/api/mollie-checkout?tier=monthly` → 303 |
| `MOLLIE_WEBHOOK_SECRET` | Vercel env | 32+ hex | Mollie webhook auth | Mollie dashboard delivery = 200 |
| `MOLLIE_PROFILE_ID` | Vercel env | `pfl_...` | Embedded Mollie Components | Card field renders inline |
| `STRIPE_SECRET_KEY` | Vercel env | `sk_...` | Stripe checkout (fallback path) | Checkout 303s |
| `STRIPE_WEBHOOK_SECRET` | Vercel env | `whsec_...` | Stripe webhook auth | Stripe CLI test = 200 |
| `STRIPE_ADOPT_PRICE_ID_MONTHLY` | Vercel env | `price_...` | Stripe monthly tier | Monthly checkout works |
| `STRIPE_ADOPT_PRICE_ID_YEARLY` | Vercel env | `price_...` | Stripe yearly tier | Yearly checkout works |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel env | `pk_...` | Embedded Stripe Elements | Card field renders inline |
| `CHECKOUT_MODE` | Vercel env | `hosted` (default) or `embedded` | Flips to inline checkout | Adopt page shows card field |

### Tier 2 — infrastructure (activates dormant features)

| Slot | Goes in | Format | Unlocks | Verify |
|---|---|---|---|---|
| `DATABASE_URL` | Vercel env | `postgres://...` (Neon/Supabase free) | DB persistence, event replay, DB-backed admin | Subs page shows "Source: DB" |
| `BLOB_READ_WRITE_TOKEN` | Vercel env | `vercel_blob_...` | Alpaca photo upload | Upload succeeds, photo shows |
| `RESEND_WEBHOOK_SECRET` | Vercel env | `whsec_...` | Bounce/complaint suppression | Resend test event = 200 |

### Tier 2 — owner alerting (at least one)

| Slot | Goes in | Format | Unlocks | Verify |
|---|---|---|---|---|
| `OWNER_SLACK_WEBHOOK_URL` | Vercel env | `https://hooks.slack.com/...` | Dunning escalation → Slack | Fake at-risk event pings Slack |
| `OWNER_TELEGRAM_BOT_TOKEN` + `OWNER_TELEGRAM_CHAT_ID` | Vercel env | bot token + chat id | Dunning escalation → Telegram | Test message arrives |
| `OWNER_GENERIC_WEBHOOK_URL` | Vercel env | any HTTPS endpoint | Dunning escalation → custom | Endpoint receives POST |

### Tier 2 — cron monitoring (Healthchecks.io free tier, 4 URLs)

| Slot | Goes in | Format | Unlocks | Verify |
|---|---|---|---|---|
| `HEARTBEAT_OWNER_DIGEST_URL` | Vercel env | `https://hc-ping.com/<uuid>` | Owner-digest deadman | Check turns green Monday |
| `HEARTBEAT_OWNER_MRR_DIGEST_URL` | Vercel env | `https://hc-ping.com/<uuid>` | MRR-digest deadman | Check turns green Monday |
| `HEARTBEAT_ADOPT_QUARTERLY_UPDATE_URL` | Vercel env | `https://hc-ping.com/<uuid>` | Quarterly-cron deadman | Green on Jan/Apr/Jul/Oct 1 |
| `HEARTBEAT_ADOPT_MILESTONE_EMAILS_URL` | Vercel env | `https://hc-ping.com/<uuid>` | Milestone-cron deadman | Green daily |

### Tier 2 — optional integrations (feature stays dark until set)

| Slot | Goes in | Unlocks |
|---|---|---|
| `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel env | Bot protection on forms |
| `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_PLACE_ID` | Vercel env | Live Google review badge |
| `GA4_PROPERTY_ID` + `GA4_CLIENT_EMAIL` + `GA4_PRIVATE_KEY` | Vercel env | Admin analytics dashboard |
| `GOOGLE_MAPS_EMBED_API_KEY` | Vercel env | Google map (else OSM fallback) |
| `FAREHARBOR_APP_KEY` + `FAREHARBOR_USER_KEY` | Vercel env | Live spots-left widget |
| `ADOPT_DISCOUNT_CODE_WEAVING_10` + `ADOPT_DISCOUNT_CODE_FARMSHOP_15` | Vercel env | Real codes in welcome email |
| `ADOPT_CAMPAIGN_HEADLINE` + `ADOPT_CAMPAIGN_END_DATE` (+`_SUBLINE`) | Vercel env | Time-limited campaign banner |
| `NEWSLETTER_SIGNING_KEY` | Vercel env | Independent newsletter token rotation (else uses NEXTAUTH_SECRET) |

### Pricing overrides (optional — defaults are live-verified)

| Slot | Default | Goes in |
|---|---|---|
| `ADOPT_PRICE_MONTHLY_EUR` | 75 | Vercel env (staging tests only) |
| `ADOPT_PRICE_YEARLY_EUR` | 900 | Vercel env (staging tests only) |
| `YOGA_PRICE_EUR` | 30 | Vercel env |

---

## 2. Content (lives in code/data files — I edit these for you)

| Slot | Goes in | Format | Unlocks | Verify |
|---|---|---|---|---|
| Alpaca bios | `lib/tenants/alpacasibiza-content.ts` `animals[]` | `bio: "..."` per animal, or `localizedBio: {en,nl,de,...}` | Bio on `/alpacas/[slug]` + portal | Renders, no "coming soon" |
| Alpaca photos (static) | `public/images/alpacas/<id>.webp` + `image:` field | webp/jpg path | Hero photo on cards + portal | Image loads |
| Alpaca gallery (static) | same file, `gallery: [{src,alt},...]` | array of `{src,alt}` | Photo grid on portal | Grid populates |
| Alpaca gallery (uploaded) | Admin `/admin/alpacas/[id]/photos` | drag-drop image ≤5MB | Same grid, runtime | Upload → appears |
| Quarterly farm news | Admin `/admin/quarterly-update` | inline HTML | Quarterly email body + portal "sneak peek" | Preview renders |
| Legal text (Privacy/Terms/Cookies) | `translations/{locale}.json` `privacy.*`/`terms.*`/`cookies.*` + `LEGAL_CONTENT_LIVE=true` | per-section strings | Real legal pages | Page shows text, not amber notice |
| Impressum company details | `translations/en.json` `impressum.companyNameValue`/`registeredAddressValue`/`taxIdValue` | legal name, address, CIF | Compliant legal-notice page | Page shows real details |
| Journal posts | `lib/data/journal.ts` `status:'live'` | post objects | `/journal` index + posts | "Stories coming soon" disappears |
| Events | `lib/data/events.ts` | event objects | Events calendar | Calendar populates |
| Media/photos | `lib/data/media.ts` `status:'live'` | media entries | Photo galleries | Galleries populate |
| FareHarbor item IDs | `FAREHARBOR_ITEM_*` env vars | FH item ID strings | Per-tour Book buttons | Button → specific tour |
| Discount codes | env vars (above) | code strings | Welcome email shows real codes | Email shows code not placeholder |

---

## 3. Translations (de / it / es / nl / fr — need a translator or you)

These all exist as `__UNTRANSLATED__: <english>` sentinels right now, so the
app falls back to English. Replacing the sentinel with real copy localizes
that surface. I can apply any translations you provide.

| Slot | Goes in | Count | Unlocks |
|---|---|---|---|
| Portal labels | `translations/{de,it,es,nl,fr}.json` `portal.*` | 22 keys + 4 error titles | Native-language donor portal |
| Welcome subjects | `lib/email-templates.ts` (inline) | 4 already done EN; de/it/es/nl/fr live | Localized welcome subject |
| Legal namespaces | `translations/{locale}.json` `privacy/terms/cookies/impressum.*` | full pages | Localized legal pages |
| Consent UX | `translations/{locale}.json` `legal.*` | 7 keys | Localized consent copy |
| `adopt.gift.*` | `translations/nl.json` (NL is a stub) | 13 keys | NL gift flow not in English |
| Marketing pages | `translations/{locale}.json` various | ~139 keys total | Fully localized site |

NL is the most incomplete (39% missing per the i18n audit). EN/de/it/es/fr
are at parity on the core flows.

---

## 4. DNS (you set these at your domain registrar — I can't)

| Slot | Goes in | Format | Unlocks | Verify |
|---|---|---|---|---|
| SPF record | DNS TXT on alpacasibiza.com | `v=spf1 include:_spf.resend.com ~all` | Email not spam-foldered | `dig TXT alpacasibiza.com` |
| DKIM record | DNS TXT (Resend provides) | base64 key | Email authentication | Resend dashboard green |
| DMARC record | DNS TXT `_dmarc.alpacasibiza.com` | `v=DMARC1; p=quarantine; rua=...` | Gmail 2026 bulk-sender pass | `dig TXT _dmarc...` |

---

## 5. External dashboards (you sign up, paste the result into a slot above)

| Service | Why | Produces | Paste into |
|---|---|---|---|
| Neon / Supabase | Free Postgres | connection string | `DATABASE_URL` |
| Healthchecks.io | Cron deadman | 4 ping URLs | `HEARTBEAT_*` |
| UptimeRobot | Uptime alert | (points at `/healthz`) | — (external) |
| Resend → Webhooks | Bounce suppression | signing secret | `RESEND_WEBHOOK_SECRET` |
| Resend → Domains | Sender auth | DNS records | DNS (section 4) |
| Mollie → Dashboard | Live payments | API key, profile ID, webhook | `MOLLIE_*` |
| Vercel → Blob | Photo storage | RW token | `BLOB_READ_WRITE_TOKEN` |
| Mollie/Stripe webhook URL | Receive events | (register our URL) | their dashboard |

---

## The intake protocol

When you hand me data:
1. I find its row here.
2. I apply it (edit file, or scaffold the env var into `.env.local` + tell you
   to set it in Vercel for prod — I never commit secrets).
3. I run the **Verify** step where it can run locally (tsc, test, render).
4. I update `LAUNCH_SCORECARD.md` — flip that system from DATA-BLOCKED to
   CODE-DONE or LAUNCH-READY.
5. If your data doesn't match any row, that's a missing slot — I add it.

Give me the data in any form (a paste, a screenshot, a file). I'll route it.
