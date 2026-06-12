# DONE — and the only things left are yours

**The website is code-complete and visually complete.** Build green (394 pages). All 26 content pages verified in a real browser: **0 broken images, 0 crashes.** Every hero, every photo slot, every alpaca portrait, the gallery, the shop, the logo, the social-share image — all your own photography, pulled from your live site and **self-hosted** so nothing breaks when you take the old Squarespace site down. Zero dependency on the old CDN.

Nothing below is buildable by me without you. That's the whole list.

---

## 1. SECRET API KEYS — paste into Vercel; every feature is built and waiting

| Feature (already built) | Keys it needs |
|---|---|
| **Payments** (adopt, skein, gifts) | `MOLLIE_API_KEY` + `MOLLIE_WEBHOOK_SECRET` (default) — or Stripe set |
| **Live booking + spots-left** | `FAREHARBOR_APP_KEY`, `FAREHARBOR_USER_KEY`, per-tour `FAREHARBOR_ITEM_*` |
| **Reviews + star rating** | `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACES_PLACE_ID` |
| **Form bot-protection** | `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` |
| **Analytics dashboard** | `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` |
| **Core (required to run safely)** | `RESEND_API_KEY`, `CONTACT_EMAIL`, `NEXTAUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `NEXTAUTH_URL`, `FAREHARBOR_WEBHOOK_SECRET`, `CRON_SECRET` |

Until set, each feature degrades cleanly (mailto fallback, hidden badge, etc.) — no breakage.

---

## 2. ONE DECISION — languages

The site ships **6 languages**; only **English + Dutch** have real copy (the other 4 fall back to English). Either send translations for German/Italian/Spanish/French, or say **"EN + NL only"** and I'll prune the rest.

---

## 3. PRICES NOT PUBLISHED ANYWHERE

These show "On request" / "Contact for pricing" because they aren't on your current site either — only you know them: **Workshops, Romantic Sunset, Family Farm Days, Weddings, Corporate.** (Already set + verified: Tour €30, Yoga €30, Adopt €75/€900, Skein €200.)

---

## 4. OPTIONAL UPGRADES (the site works without these — they just make it sharper)

- **Real product photos** for the shop. The woven-product cards currently use your farm/weaving photos as stand-ins — they look real, but a herd photo isn't literally "a poncho." Swap in actual product shots when you have them.
- **Alpaca bios.** Your live site lists the 14 names + photos but no written bios — so the cards show photo + name. Add a sentence each if you want.
- **Legal text** (Terms/Privacy/Impressum) — then flip `LEGAL_CONTENT_LIVE=true`. Your Dutch terms are on the old site if you want them ported.
- **Press logos**, **real testimonials**, **journal posts** — drop into their data files when ready.

---

*Sections 1–3 are the real blockers, and they're all you. Section 4 is polish. The code is done.*
