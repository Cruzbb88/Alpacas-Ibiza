# Plugins / third-party integrations — redesign vs the live site
**Audited 2026-06-10.** The live site's integrations were read from its actual served HTML; the redesign's from `lib/validate-env.ts`, `lib/turnstile.ts`, `lib/integrations/`, and CLAUDE.md.

## What the LIVE site actually loads (from its HTML)
| Plugin | Purpose |
|---|---|
| **Squarespace** | CMS / hosting / forms / built-in cookie banner |
| **FareHarbor** | booking **and** payments (one flow, id 1257173); loads GTM `GTM-KR3CGLS6` |
| **Google reCAPTCHA** | form bot protection |
| **Instagram** | social feed / links |

That's it — no Stripe/Mollie (FareHarbor takes the money), no own analytics stack, no Cloudflare.

## What the REDESIGN wires
| Plugin | Status | Notes |
|---|---|---|
| **FareHarbor** | ✅ same | flow 1257173 (parity fixed 2026-06-10); item IDs unset → main calendar |
| **Bot protection** | swappable | `CAPTCHA_PROVIDER` = `turnstile` (default) \| `recaptcha` \| `none`; + honeypot + rate-limit built-in |
| **Stripe** (cards) | NEW | on-site adopt checkout (ADR-021); keys unset → mailto |
| **Mollie** (SEPA) | NEW | default vendor (ADR-019); keys unset → mailto |
| **Resend** | NEW | transactional email; domain unverified → forms 500 |
| **SendGrid** | optional | list management; off until keys set |
| **GA4** `G-Y946QDVVQV` + **GTM** `GTM-KR3CGLS6` | ✅ hardcoded | same FareHarbor container as live |
| **Google Consent Mode v2** + vanilla-cookieconsent | NEW | GDPR consent gating (live relies on Squarespace banner) |
| **GA4 Data API** | optional | branded `/admin/analytics`; needs service account |
| **Google Places** | optional | live review badge; off until key+placeId |
| **Google Maps embed** | optional | → OpenStreetMap fallback (always renders) |
| **Instagram** | ✅ same | links |
| **WhatsApp** floating button | optional | renders null until `whatsappE164` set |
| **Owner alerts** (Slack/Telegram/Discord/webhook) | NEW optional | dunning escalation |
| **Vercel** + `/healthz` | NEW | hosting + uptime probe |

## Verdict
- **Parity:** FareHarbor, GA4/GTM, Instagram — same as live.
- **Superset:** the redesign adds Stripe, Mollie, Resend, Google Places, Maps, consent-mode v2, owner alerts, uptime. All are **owner-key-gated** and fail safe (off/fallback) until configured — already in [OWNER_DATA_LEDGER_2026-06-10.md](OWNER_DATA_LEDGER_2026-06-10.md) §9.

## ⭐ Decision implemented: reuse reCAPTCHA, skip Cloudflare
The live site already runs **Google reCAPTCHA**. The redesign is now wired to reuse it end-to-end:

- **Server** (`lib/turnstile.ts`) already routed all 6 form endpoints through `CAPTCHA_PROVIDER`.
- **Client gap fixed (2026-06-10):** `components/turnstile-widget.tsx` previously generated **Turnstile tokens only** — so picking reCAPTCHA server-side would have left the client sending the wrong token. The widget is now **provider-aware**: it auto-selects reCAPTCHA v3 (invisible, `grecaptcha.execute`, 110 s refresh) when `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set, else Turnstile, else null. The Turnstile path is behaviour-identical; 846 tests + tsc green.
- **Deployment template** (`.env.local.example`) now defaults to:
```
CAPTCHA_PROVIDER=recaptcha
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<reuse the live site's key>
RECAPTCHA_SECRET_KEY=<reuse the live site's key>
```
The owner drops in the reCAPTCHA keys **already used on alpacasibiza.com** — no Cloudflare signup. (Code default stays `turnstile` for the multi-tenant framework; Turnstile remains a drop-in alternative.) Forms still fail-open (work, unprotected + prod warn) if keys are unset.

**Caveat:** the reCAPTCHA scoring round-trip can't be exercised without a real site key (locally the widget renders null, same as Turnstile), but the implementation follows Google's documented reCAPTCHA v3 flow and the Turnstile path is unchanged.
