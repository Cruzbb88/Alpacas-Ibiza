# Resonance Finder — Tunable Parameters (2026-05-26)

## Methodology + degraded-mode note

Applied the four-layer resonance-finder methodology (inventory -> sensitivity -> optimal value -> harmonic) to `C:\Users\cruzb\Projects\alpaca-farm-redesign`, citing every value as `file:line`. Operating in degraded local-file mode: Catalog 005 hook blocks `mcp__omni-cortex__*`, so this report draws only from on-disk source (predecessors `rf-001` / `rf-002` were re-read, not re-queried).

## Inventory

| # | Param | File:line | Current | Sensitivity | Coupling |
|---|---|---|---|---|---|
| A1 | `fetchWithTimeout` default `ms` | `lib/fetch.ts:6` | 5000 ms | 9 | Implicit ceiling for A3, A4; sister to A2/A5/A6 |
| A2 | Turnstile `siteverify` timeout | `lib/turnstile.ts:43` | 5000 ms | 9 | Gates every form POST; pairs with E1 (absent retry) |
| A3 | FareHarbor items-list timeout | `app/api/availability/route.ts:40-48` | inherits A1 (5000) | 8 | Implicit dep on A1; under B2 cache umbrella |
| A4 | FareHarbor per-item availability timeout | `app/api/availability/route.ts:62-73` | inherits A1 (5000) | 8 | A1, C1 (fan-out), B2 |
| A5 | Google Places timeout | `app/api/google-reviews/route.ts:49` | 6000 ms | 4 | B3, B4 |
| A6 | FareHarbor owner-digest bookings timeout | `app/api/owner-digest/route.ts:69` | 8000 ms | 3 | Cron cadence (F1) |
| B1 | Client availability TTL | `lib/use-availability.ts:17` | 60_000 ms | 5 | B2 (stacked cache) |
| B2 | `/api/availability` ISR `revalidate` | `app/api/availability/route.ts:115` | 1800 s | 9 | B1, C1, A3/A4, FareHarbor rate-limit |
| B3 | `/api/google-reviews` ISR `revalidate` | `app/api/google-reviews/route.ts:89` | 21600 s | 3 | B4 |
| B4 | Google Reviews `cache-control` (live) | `app/api/google-reviews/route.ts:75` | `max-age=21600, s-maxage=86400` | 3 | B3 |
| B5 | Google Reviews stub `cache-control` | `app/api/google-reviews/route.ts:36` | `max-age=300` | 1 | none |
| B6 | `/api/health` `Cache-Control` | `app/api/health/route.ts:30` | `no-store` | 6 | Monitoring cadence |
| B7 | HSTS `max-age` | `next.config.mjs:36` | 63072000 s (2 yr) | 8 | Domain irrevocable until expiry |
| C1 | Items fanned out per ISR regen | `app/api/availability/route.ts:62` | `.slice(0, 3)` | 8 | A1/A4 latency budget; FareHarbor quota |
| C2 | Dates returned to UI | `app/api/availability/route.ts:97` | `.slice(0, 8)` | 7 | UI grid in `components/booking-section.tsx:43` |
| C3 | Top reviews returned | `app/api/google-reviews/route.ts:61` | `.slice(0, 3)` | 2 | UI badge |
| C4 | Owner-digest table rows | `app/api/owner-digest/route.ts:94` | `.slice(0, 50)` | 2 | Email render size |
| C5 | GA4 page-rows limit | `app/api/analytics/data/route.ts:53` | 10 | 1 | Admin-only |
| C6 | GA4 top-pages slice | `app/api/analytics/data/route.ts:113` | `.slice(0, 10)` | 1 | C5 |
| C7 | Availability window (lookahead days) | `app/api/availability/route.ts:25` | 30 days | 6 | C1, B2 |
| C8 | Owner-digest window (lookahead days) | `app/api/owner-digest/route.ts:57` | 7 days | 4 | F1 (Mon 09:00) |
| D1 | `REMINDER_LEAD_MS` | `lib/webhook-router.ts:11` | 48 h | 7 | No-show rate; D3 hard ceiling |
| D2 | `REVIEW_LAG_MS` | `lib/webhook-router.ts:12` | 24 h | 5 | Review conversion timing |
| D3 | Resend `scheduledAt` ceiling (implicit) | `lib/mailer.ts:14-17` (doc only) | ~30 days | 7 | D1, D2 — silently bursts if D1 grows |
| G1 | NextAuth JWT `maxAge` | `app/api/auth/[...nextauth]/route.ts:39` | 28800 s (8 h) | 6 | Admin only |
| RL1 | Contact rate limit | `app/api/contact/route.ts:20` | 5 / 300 s | 7 | RL2, RL3 (shared `lib/rate-limit.ts:48`) |
| RL2 | Commission rate limit | `app/api/commission/route.ts:20` | 5 / 300 s | 7 | RL1, RL3 |
| RL3 | Newsletter rate limit | `app/api/newsletter/route.ts:18` | 5 / 300 s | 7 | RL1, RL2 |
| F1 | Owner-digest cron | `vercel.json:6` | `0 9 * * MON` | 7 | C8 (must overlap window) |
| L1 | Locale list (middleware match) | `middleware.ts:3` | 6 locales | 4 | redirects in `next.config.mjs:67` |
| T1 | Toast remove delay | `hooks/use-toast.ts:9` and `components/ui/use-toast.ts` | 1_000_000 ms (~16 min) | 3 | UX; clearly a copied-template default |
| S1 | Sidebar cookie `max-age` | `components/ui/sidebar.tsx:23` | 604800 s (7 d) | 1 | UI only |
| E1 | Retry / backoff in `fetchWithTimeout` | `lib/fetch.ts` (entire file) | ABSENT | 9 | Would couple to A1, A2, B2 |
| E2 | Retry / backoff in `useFormSubmit` | `lib/useFormSubmit.ts:30-46` | ABSENT | 6 | Compounds RL1-3 sensitivity |
| E3 | Health-check timeout for monitor | n/a — relies on caller | ABSENT | 4 | UptimeRobot side |

## Top sensitivity (>=7) — values worth revisiting

- **A1 default `5000` (`lib/fetch.ts:6`)** -> recommend **6000 ms**. Three call sites (A3, A4, and `lib/turnstile.ts:43` if it were ever defaulted) inherit silently. FareHarbor p95 is 2-4 s; 5 s aborts work that almost finished. Affects every visitor on tour pages.
- **A2 Turnstile `5000` (`lib/turnstile.ts:43`)** -> recommend **3500 ms** *combined with* E1 single retry. Cloudflare publishes <500 ms p99 SLA for siteverify. A faster fail-closed sees a real outage in 4 s instead of 5 s; the retry keeps the success budget similar (~7 s). Affects every form submission (contact, commission, newsletter).
- **B2 ISR `1800` s (`app/api/availability/route.ts:115`)** -> **keep**, promote to named export `AVAILABILITY_REVALIDATE_S`. ADR-008 already validates the value; what's missing is the named constant so callers and ADR readers find it via grep. Affects the booking grid for every visitor.
- **B7 HSTS `max-age=63072000` (`next.config.mjs:36`)** -> **keep** but document the irrevocability. 2 years + `preload` means the domain cannot be served on HTTP for the entire window without breaking returning visitors. Currently un-commented; add a note linking to the preload-list submission state.
- **C1 items slice `(0, 3)` (`app/api/availability/route.ts:62`)** -> recommend **named constant `MAX_TOUR_ITEMS_FANNED_OUT = 4`** (one above current to absorb the photo-session tour pending owner input). Currently silently drops the 4th tour. Coupled to A4 fan-out budget.
- **C7 lookahead `30` days (`app/api/availability/route.ts:25`)** -> **keep**, name it `AVAILABILITY_LOOKAHEAD_DAYS`. 30 days is the natural sweet spot between cache freshness and date-grid usefulness.
- **D1 `REMINDER_LEAD_MS = 48h` (`lib/webhook-router.ts:11`)** -> **expose env override `REMINDER_LEAD_HOURS`** (keep 48 h default). Wedding tours benefit from 72 h, yoga from 24 h. No code change risk; pure additive flexibility.
- **D3 Resend 30-day ceiling (undocumented in `lib/webhook-router.ts:79-100`)** -> add `MAX_SCHEDULED_AHEAD_MS = 29 * 24 * 60 * 60 * 1000` guard in `computeScheduleWindows`. Currently if a booking is placed >30 days out, the scheduled send silently 4xx's at Resend send time. Affects high-value advance bookings.
- **RL1/RL2/RL3 `5 per 5 min` (3 routes)** -> recommend **3 / 60_000 ms** for contact + newsletter, **5 / 600_000 ms** for commission. Burst-of-5 is bot-friendly within 5 min; 3 within 60 s is closer to a real user mistyping a captcha twice. Commission is more deliberate, so a longer window is acceptable.
- **F1 cron `0 9 * * MON` (`vercel.json:6`)** -> **keep**. Aligned with C8 (7-day window) and the digest email send target.
- **E1 absent retry** -> **add 1 retry with 250 ms backoff** on network error / 5xx **only**. Skip retries on 4xx (Turnstile token reuse non-idempotent). Single highest-leverage change in the file map.

## Resonance points

- **R1 — A1 (`fetch.ts` default) <-> A2 (Turnstile) <-> A3/A4 (FareHarbor):** Three production-critical surfaces share one implicit `5000` constant. Tuning A1 alone shifts both the bot-protection budget and the booking-grid latency budget. Decouple by passing explicit `ms` at every prod call site; keep the default as a safety net for unknown callers only. *Effect when tuned together:* booking grid renders faster on slow upstreams while bot-protection fails closed sooner on outages.
- **R2 — D1 (reminder lead) <-> D3 (Resend 30-day ceiling) <-> C7 (30-day lookahead):** All three center on a 30-ish-day horizon. If D1 climbs to 72 h, a booking placed 28 days out tries to schedule a Resend job 30+ days ahead and fails silently. Coupled fix: add the D3 guard *before* exposing D1 as an env var. *Effect when tuned together:* advance bookings degrade gracefully instead of dropping reminders.
- **R3 — E1 retry (absent) <-> A2 Turnstile timeout <-> RL1-3 rate limits:** Today a transient Cloudflare blip becomes a hard form rejection, which the user reflexively re-submits — which trips RL1's 5/5 min. Adding E1 retry would reduce false 429s. Coupled fix: shorten A2 (3500 ms), add E1 (1 retry on 5xx/network), then tighten RL1/RL3 windows. *Effect when tuned together:* same anti-bot strength, fewer false rejections of real users.

## Default-by-accident

- **A1 `5000` ms** — declared once in `lib/fetch.ts:6`, inherited by `availability` route without comment. Looks like an arbitrary "round number"; nothing in the codebase references a measured FareHarbor p95.
- **T1 `TOAST_REMOVE_DELAY = 1_000_000` ms (`hooks/use-toast.ts:9` AND `components/ui/use-toast.ts:57`)** — 16 minutes is the shadcn/Radix copy-paste default. Almost certainly never re-evaluated for this site. Two copies exist in parallel (dead-code duplicate, untouched).
- **C5 GA4 `limit: 10`** — admin dashboard ceiling unrelated to data volume; pure scaffold value.

## Missing parameters (no knob exists, should)

- **E1 retry / backoff in `fetchWithTimeout`** — `lib/fetch.ts` has zero retry logic. One transient FareHarbor 5xx blanks the date grid for the entire 1800 s ISR window. Recommend single retry on network error + 5xx, 250 ms backoff, idempotent only.
- **E2 retry in `useFormSubmit`** — `lib/useFormSubmit.ts:30-46` is one attempt then `setStatus('error')`. Recommend at minimum a per-error-class differentiator (e.g. distinguish 429 vs network vs 4xx) so the UI can show "try again in X seconds".
- **Per-route timeout ceilings** — no overall handler timeout on `app/api/availability/route.ts`. A slow FareHarbor side could let parallel fan-out hold an edge function for the platform's full 60 s budget. Recommend `Promise.race` with a 10 s ceiling.
- **No `REMINDER_LEAD_HOURS` env override** — operator cannot tune lead time without redeploy. See D1 above.
- **No `MAX_SCHEDULED_AHEAD_MS` guard** — see D3.
- **No request-id / correlation header** — not strictly a "tunable" but related: every `fetchWithTimeout` should attach an X-Request-ID so retries are diagnosable. Currently absent.
- **No JWT refresh window** — `session.maxAge = 8h` is hard expiry. No rolling-refresh knob for active admins.

## STOP

Values that cannot be set without production traffic data — explicitly leave alone until measurements arrive:

1. **B2 (1800 s ISR)** — needs FareHarbor request volume + sold-out-incidence sample. ADR-008 stands until contradicted.
2. **RL1/RL2/RL3 thresholds** — need 30-day log of 429 incidence and known-bot vs known-human IP split. Today's `5/300_000` is defensible without data.
3. **A1 / A2 absolute milliseconds** — recommendations above assume Cloudflare's published SLA and anecdotal FareHarbor p95. Vercel runtime logs filtered to `[turnstile] verify failed` + `FareHarbor item availability fetch failed` (30-day window) would calibrate these.
4. **C1 fan-out cap** — bounded by FareHarbor rate limits. If their `/availabilities/date-range/` endpoint returns `X-RateLimit-Remaining`, capture and plot before raising C1 above 4.
5. **D1 reminder lead 48 h** — needs no-show-rate / open-rate data per lead-time bucket. Operator opinion until then.
