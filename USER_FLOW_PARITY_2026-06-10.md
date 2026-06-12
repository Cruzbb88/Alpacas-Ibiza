# User-flow parity — redesign vs the live site (alpacasibiza.com)
**Audited 2026-06-10.** Every primary flow traced in code + verified against the running dev server (HTTP status), and compared to the live/official site (the real "competitor" + source of truth).

## Headline
- **Coverage:** the redesign covers **every flow the live site offers, plus more.** No live-site flow is missing.
- **Every nav link and page route returns 200** — no code-level dead-ends.
- The remaining "broken" items are **owner env-config, not code** (Resend domain, payment keys, FareHarbor item IDs) — all already in [OWNER_DATA_LEDGER_2026-06-10.md](OWNER_DATA_LEDGER_2026-06-10.md).
- **Fixed this pass:** direct FareHarbor booking links were dropping `flow=1257173`; now they match the live booking link exactly.

## The core difference (intentional, per ADR-021)
The **live site funnels everything through one path**: every offering (tours, adopt, yoga, weddings, even "contact") is a **"Plan je bezoek"** button → `https://fareharbor.com/embeds/book/alpacasibiza/?full-items=yes&flow=1257173`, or an email to `info@alpacasibiza.com`. No contact form, no online adopt checkout, no phone/WhatsApp — it's an appointment-only private farm.

The **redesign is a superset**: per-product booking, an on-site **Stripe/Mollie adoption checkout**, contact/enquiry forms, a shop enquiry flow, and a gift-wizard. The adopt-checkout divergence is **owner-confirmed** ([docs/adr/021-fareharbor-replaced-by-stripe-mollie.md](docs/adr/021-fareharbor-replaced-by-stripe-mollie.md): owner said 2026-05-30 "we will be replacing FareHarbour").

## Flow-by-flow

| Flow | Live site | Redesign | Verdict |
|---|---|---|---|
| Book tour | "Plan je bezoek" → FareHarbor flow 1257173 | Book CTA → FareHarbor (now `…?full-items=yes&flow=1257173`) | ✅ parity (flow id fixed this pass) |
| Yoga | same FareHarbor link | BookingButton → FareHarbor (item id unset → main calendar) | ✅ equivalent; deep-links when owner sets `FAREHARBOR_ITEM_YOGA` |
| Weaving workshop | FareHarbor / email | CTA → `/contact?subject=Workshop` (on-request) | ✅ acceptable variant |
| Adopt | FareHarbor "Plan je bezoek" | On-site Stripe/Mollie checkout (mailto fallback until keys set) | ⬆️ upgrade (ADR-021); owner sets payment keys |
| Weddings | FareHarbor / email | BookingButton + `/contact?subject=Wedding` | ✅ superset |
| Shop (woven/alcaca) | "Onze collectie" info + email | Enquire/Order → `/shop/commission` form | ⬆️ superset |
| Gifts | (none distinct) | Gift wizard → FareHarbor / mailto | ⬆️ new |
| Corporate | `/business-incentives…` + email | Page + FareHarbor calendar + enquiry form | ⬆️ superset |
| Contact | email only | Contact form → `/api/contact` | ⬆️ superset (form 500s until Resend domain verified — owner) |
| Newsletter | (none) | Double-opt-in form → `/api/newsletter` (200) | ⬆️ new |

## Owner-config gaps that affect flows (not code bugs — already in the ledger)
1. **Contact + corporate enquiry forms → 500** — `/api/contact` throws because Resend rejects the send (sender domain `alpacasibiza.com` not verified, or placeholder key). Fix = verify Resend domain. Until then, every form-based flow fails to deliver.
2. **Adopt checkout → mailto fallback** — `MOLLIE_API_KEY` / `STRIPE_SECRET_KEY` unset → no live checkout. Owner sets payment keys.
3. **All `FAREHARBOR_ITEM_*` unset** — every booking falls back to the main calendar (same as the live site's single link). Functionally fine; owner sets item IDs to deep-link per activity.

## Fixed this pass (code, no owner)
- `getFareHarborEmbedUrl()` ([lib/config.ts](lib/config.ts)) now appends `flow=${NEXT_PUBLIC_FAREHARBOR_FLOW_ID || '1257173'}`. The env var and tenant `flowId` already existed but the URL builder ignored them, so tour/yoga/weddings Book links diverged from the live booking flow. Verified at runtime: `…/alpacasibiza/?full-items=yes&flow=1257173`. Test updated (`lib/fareharbor-products.test.ts`); 846 tests green.
