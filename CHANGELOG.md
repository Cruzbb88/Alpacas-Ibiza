# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.0] — 2026-05-27

### Added
- Specs shipped: 009 (mailer Promise.race timeout), 010 (webhook owner-alert)
- ADRs 010–014: CSP report-only + GTM unsafe-inline, in-memory rate-limit vs KV, content-provider abstraction, payment-provider defaults, GA4 afterInteractive (supersedes 006)
- `AlpacaCard` factory + 14 catalog entries; `TestimonialCard` + `TestimonialGrid`
- `FAQ` accordion, `SectionHeader`, `FormField` extractions, `BookTourLink` consistency pass
- Hero LCP `<Image>` with `priority` + explicit `sizes`; `ProductCard` a11y attributes
- `AnalyticsDashboard` a11y labels + i18n keys
- 14 component docs with `## Keyboard interactions` tables
- 4 error/loading routes (`tours`, `contact`, `alpacas`, `shop`) + per-route `loading.tsx`
- Error boundary with observability flush to `/api/log-error`
- `BookingSection` skeleton grid; tour-card inline pricing (€30/person)
- GitHub Actions CI workflow (lint → type-check → build → test)
- 13-page hreflang migration helper script
- i18n key gap audit: 284 missing keys now marked `__UNTRANSLATED__:` sentinel
- Philosophy-prompting catalog references wired in `.claude/` skills

### Fixed
- XSS: `escapeHtml()` applied to all user-controlled fields in contact + commission email routes
- Admin auth fail-closed + 8h JWT expiry enforced
- FareHarbor adapter extracted out of route handler (111 → 79 LOC)
- `revalidate=1800` correctly placed on availability route (was shadowed)
- CRLF subject-header injection sanitized in mailer
- `replyTo` validated against 2+ char TLD regex before dispatch
- Captcha-pow `skipped:` prefix token blocked in prod (was only blocked in dev)
- Tenant header spoofing closed on admin routes
- Open-redirect on Stripe checkout closed via allowlist
- Turnstile widget `onToken` memoized; script tag cleaned up on unmount
- `fareharbor-calendar` stale-closure fixed (ref swap, not state capture)
- Dead non-localized routes deleted (spec 004)
- 7 `'use client'` over-declarations stripped from server components

### Security
- `no-omni-cortex` lint hook enforced via Husky pre-commit
- Failsafe map expanded 13 → 17 rows (all P0 API routes covered)
- Security review verdict: **APPROVED** — 1 medium advisory (rate-limit on `/api/google-reviews`) documented, deferred to KV milestone

### Changed
- ADR-014 supersedes ADR-006: GA4 loads `afterInteractive`, not `beforeInteractive`
- 9 ADRs (001–009) codify load-bearing decisions carried forward from April session
- i18n silent EN fallback replaced by `__UNTRANSLATED__:` sentinel for 284 keys
- `package.json` version bumped 1.0.1 → 1.2.0

### Known Issues
- `bootstrap.sh` Linux path unvalidated (Windows-only tested)
- 11 sub-pages still missing `buildLocaleAlternates` hreflang tags
- FareHarbor API keys not provisioned — Tier 2 stub fallbacks active
- 6 P0 launch gaps remain owner-blocked (see `OWNER_INPUT_NEEDED.md`)

---

## [1.0.1] — 2026-04-21

### Fixed
- Revert to simple `package.json` version label

---

## [1.0.0] — 2026-04-21

### Added
- FareHarbor webhook pipeline: `booking.created/updated/cancelled` → Resend `scheduledAt`
- Owner-input checklist (`OWNER_INPUT_NEEDED.md`)
- Shared email templates (`lib/email-templates.ts`), `escapeHtml`, `timingSafeEqual`
- Cloudflare Turnstile CAPTCHA on contact / commission / newsletter
- `/api/review-request`, `/api/reminder`, `/api/owner-digest` automation endpoints
- `CancellationBadge`, `AvailabilityUrgency`, `GoogleReviewsBadge` conversion components
- `/gifts` page with FareHarbor gift-card embed
- GDPR Consent Mode v2 + `CookieConsent` component
- Skip-to-main-content link (WCAG 2.1 A)
- Breadcrumb JSON-LD (`lib/structured-data.ts` + `PageBreadcrumbs` component)
- ADR-001 (Resend scheduled sends)

### Fixed
- FareHarbor calendar uses real script-embed API (flow 1257173) replacing stub
- `fetchWithTimeout` (5 s) replaces bare `fetch()` across availability + webhooks
- GTM deduplication: removed GTM-NJRGZPGS, kept FareHarbor's GTM-KR3CGLS6 only

---

## [0.x] — 2026-02-11

Initial i18n scaffold, FareHarbor widget, design overhaul, SEO/sitemap, contact/commission forms.
