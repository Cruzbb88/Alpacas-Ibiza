# DNS cutover — Squarespace → Vercel

The moment-of-truth checklist. **Squarespace site goes dark** the moment DNS propagates. Don't run this until the Vercel deploy is verified working at its `*.vercel.app` URL.

Time at desk: ~15 min. DNS propagation: 5 min – 24 h (most users see Vercel within 1 hour).

---

## Prerequisite checks (run before touching DNS)

Every line MUST be ✅ before proceeding. If any is red, stop.

- [ ] **Vercel preview URL works end-to-end** — home / tours / journal / contact form submission / `/api/health` 200 / sitemap valid XML
- [ ] **All Tier 1 env vars set** in Vercel Production environment (`RESEND_API_KEY`, `CONTACT_EMAIL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `FAREHARBOR_WEBHOOK_SECRET`, `CRON_SECRET`)
- [ ] **NEXTAUTH_URL = `https://alpacasibiza.com`** (no trailing slash, no `www.`) — otherwise admin login redirect breaks
- [ ] **A test booking** submitted via FareHarbor calendar shows up in your inbox via `/api/contact` test message
- [ ] **Old Squarespace site has been backed up** — go to Squarespace settings → Export. Saves a `.xml` you can re-import if cutover fails catastrophically.
- [ ] **Email forwarding still works** — `info@alpacasibiza.com` mailbox is at your DNS-host or external provider (Google Workspace, Microsoft 365, Fastmail), NOT inside Squarespace. If it's inside Squarespace email hosting, you LOSE email when DNS flips. Check [admin.google.com](https://admin.google.com) or wherever your inbox lives. **If email is inside Squarespace, do not cut over — migrate email first.**

---

## Complete DNS records reference

All records you need at your DNS host (One.com, Squarespace DNS, GoDaddy, Cloudflare — wherever your DNS is managed). Add the Resend rows BEFORE cutover to ensure email works from day one.

| Type | Host / Name | Value | TTL | Purpose |
|---|---|---|---|---|
| `A` | `@` (apex) | `76.76.21.21` | 3600 | Vercel hosting |
| `CNAME` | `www` | `cname.vercel-dns.com` | 3600 | Vercel www redirect |
| `MX` | `@` | (keep existing — do NOT change) | — | Email delivery |
| `TXT` | `@` | `v=spf1 include:_spf.resend.com -all` | 3600 | Resend SPF (replaces or merges with existing SPF) |
| `CNAME` | `resend._domainkey` | `resend._domainkey.resend.com` (Resend provides the exact CNAME target in their dashboard) | 3600 | Resend DKIM signing |
| `TXT` | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:info@alpacasibiza.com` | 3600 | DMARC — bounces quarantined, reports to owner |

**How to get the exact Resend DKIM CNAME value:** Resend dashboard → Domains → Add Domain → `alpacasibiza.com` → Resend shows you all 3 records with exact copy-paste values. Use those — do not guess. The SPF and DMARC values above are stable public Resend values.

**SPF note:** If your DNS already has a `v=spf1` TXT record on `@` (common with Google Workspace), you must MERGE them — only one SPF record is allowed per name. Combine: `v=spf1 include:_spf.resend.com include:_spf.google.com ~all`.

**One.com specific steps:**
1. Log in → Domains → DNS settings for `alpacasibiza.com`
2. Under "A records" → delete the existing A record(s) → add new A record: `@` / `76.76.21.21`
3. Under "CNAME records" → delete the existing `www` CNAME → add: `www` / `cname.vercel-dns.com`
4. Under "TXT records" → add SPF, DMARC
5. Under "CNAME records" → add `resend._domainkey` / (value from Resend dashboard)
6. **Do NOT touch** your MX records — those control your email inbox

---

## Phase A — Add custom domain in Vercel

1. Vercel project → **Settings** → **Domains** → **Add**
2. Type `alpacasibiza.com` → **Add**
3. Type `www.alpacasibiza.com` → **Add** (Vercel will offer to redirect www→apex or vice versa — pick **apex preferred** for SEO; both work)
4. Vercel shows you 2 DNS records to add at your DNS host:
   - `A @ 76.76.21.21` (apex domain)
   - `CNAME www cname.vercel-dns.com` (www subdomain)
5. **Leave that Vercel tab open** — you'll come back to verify

---

## Phase B — Update DNS records

This depends on where your DNS is hosted. Most common case: DNS is inside Squarespace itself (managed by their dashboard). Less common: GoDaddy / Cloudflare / your registrar.

### B.1 If DNS is inside Squarespace

1. Log into Squarespace → **Settings** → **Domains** → `alpacasibiza.com` → **DNS Settings**
2. **Find existing `A` records** pointing to `198.49.23.x` / `198.185.159.x` → **delete them all**
3. Add new `A` record:
   - Host: `@` (or empty)
   - Type: `A`
   - Value: `76.76.21.21`
   - TTL: leave default (1 hour)
4. Find existing `CNAME www` → **delete**
5. Add new `CNAME www`:
   - Host: `www`
   - Type: `CNAME`
   - Value: `cname.vercel-dns.com`
   - TTL: default
6. **Keep all `MX`, `TXT` SPF, `TXT` DKIM, `TXT` DMARC records** — those control your email and must stay.

### B.2 If DNS is at GoDaddy / Cloudflare / Namecheap / etc.

Same idea — log into the registrar's DNS dashboard, delete the Squarespace A + CNAME records, add the Vercel ones above. The Squarespace dashboard for your domain may show DNS but the records actually live at the registrar — Vercel's docs show this clearly: [vercel.com/docs/projects/domains](https://vercel.com/docs/projects/domains/working-with-domains).

### B.3 Important: do NOT touch

- Any `MX` record (`@ → google.com / aspmx.l.google.com / etc.`) — email routing
- Any `TXT` record starting with `v=spf1` — email anti-spoofing
- Any `TXT` record under `_dmarc` or `default._domainkey` — email signing
- Any subdomain CNAMEs you actively use (e.g. `blog.alpacasibiza.com`, `mail.alpacasibiza.com`)

---

## Phase C — Wait for propagation + verify

1. Check DNS propagation status: [dnschecker.org/?domain=alpacasibiza.com&type=A](https://dnschecker.org/?domain=alpacasibiza.com&type=A) — wait for all 8+ global DNS servers to show `76.76.21.21`
2. In Vercel domain page, the "Pending" status next to `alpacasibiza.com` becomes **Valid Configuration** → green checkmark
3. Vercel auto-issues SSL cert (Let's Encrypt) — takes 30-60 sec after DNS validates
4. Open `https://alpacasibiza.com` in **incognito mode** — should show the new Next.js site, not Squarespace
5. Check `Server:` header: `curl -sI https://alpacasibiza.com | grep -i server` should show `Server: Vercel` (was `Squarespace`)

---

## Phase D — Post-cutover hygiene (within 1 hour)

1. **Update FareHarbor webhook URL** — Phase 4 in [`DEPLOY_VERCEL.md`](DEPLOY_VERCEL.md) — change from preview URL to `https://alpacasibiza.com/api/fareharbor-webhook`
2. **Update Stripe webhook URL** (if Stripe is set up) — Stripe Dashboard → Developers → Webhooks → endpoint → edit URL → `https://alpacasibiza.com/api/stripe-webhook`
3. **Test live form** — submit contact form once via real browser; confirm email arrives
4. **Run Lighthouse** in Chrome DevTools (or PageSpeed Insights [pagespeed.web.dev/?url=https%3A%2F%2Falpacasibiza.com](https://pagespeed.web.dev/?url=https%3A%2F%2Falpacasibiza.com)) — Core Web Vitals should be green
5. **Submit sitemap to Google** — [search.google.com/search-console](https://search.google.com/search-console) → Sitemaps → submit `https://alpacasibiza.com/sitemap.xml` (and `sitemap-news.xml`)
6. **Add property to Bing Webmaster** if you care about Bing — [bing.com/webmasters](https://www.bing.com/webmasters)
7. **Note old Squarespace site as backup** — log into Squarespace → cancel auto-renew or leave it running 30 days as fallback. If something catastrophic happens, point DNS back. Squarespace billing keeps the site on standby.

---

## Rollback (if it goes wrong within 1 hour)

The DNS change is reversible if Squarespace is still paid.

1. Go back to your DNS host
2. Delete the new `A 76.76.21.21` + `CNAME www cname.vercel-dns.com`
3. Restore the old Squarespace records:
   - `A @ 198.49.23.144`
   - `A @ 198.49.23.145`
   - `A @ 198.185.159.144`
   - `A @ 198.185.159.145`
   - `CNAME www ext-cust.squarespace.com`
4. Wait 5–60 min for propagation
5. Site is back on Squarespace — figure out the Vercel issue offline

After 30 days on Vercel without issues, you can stop paying Squarespace.

---

## What this site does that Squarespace doesn't (for the reverse-buyer's-remorse moment)

- Real per-tour booking deep-links (`/api/checkout?tour=meet-herd`)
- Adopt-a-Paca subscription via Stripe (recurring, RFC-8058 one-click unsubscribe)
- 6-locale i18n with hreflang
- 18 ADRs documenting load-bearing choices
- Per-page JSON-LD (Organization, LocalBusiness, TouristTrip, Event, FAQ, HowTo, Service, BlogPosting, Person, BreadcrumbList, WebSite/SearchAction, TouristAttraction, AggregateOffer)
- ICS calendar attachments on booking reminders + Google Calendar link
- Service worker offline shell + PWA installable
- 572 unit tests
- GDPR data export/deletion endpoint (`/api/gdpr-request`)
- View Transitions API for SPA-feel nav
- Real Core Web Vitals reporting to GA4

Squarespace doesn't ship any of this.
