/**
 * Consent gate — reads the cookie-consent state and exposes a `hasAnalyticsConsent()`
 * check that callers (analytics-events, trackEvent) use to decide whether to fire.
 *
 * Per EU PECR (Privacy and Electronic Communications Regulations), analytics
 * cookies require affirmative consent before they may be set. Today GA4 is
 * loaded site-wide; cookie-consent.tsx surfaces a Consent Mode v2 banner that
 * stores the donor's choice in localStorage. But analytics-events.ts fires
 * gtag('event', …) calls unconditionally — those calls inherit the granted/denied
 * state from Consent Mode, but the gtag.js script itself still loads and
 * still sets first-party cookies (the `_ga` one is set on first page load).
 *
 * This gate is the belt-and-braces second layer: callers check it BEFORE
 * dispatching custom events so:
 *   1. We don't pollute GA4 reports with events from un-consented users
 *      (their data would arrive at GA4 marked denied + thrown away anyway,
 *      but we save the network round-trip)
 *   2. Future per-event consent surfaces (e.g. a "remember my checkout
 *      preference" toggle) have a hook
 *
 * Server-safe: when `typeof window === 'undefined'` this returns `true`
 * (server has no consent state; the actual cookie write happens client-side
 * later). The browser code is the only place consent really matters.
 *
 * Implementation notes:
 *   - The consent storage key must match cookie-consent.tsx exactly.
 *   - When the consent has never been answered (null), we return false —
 *     fail-CLOSED. PECR requires affirmative consent; absence ≠ consent.
 *   - Reading localStorage in some browsers throws (Safari private mode);
 *     we treat throw as "no consent" via the catch.
 */

const STORAGE_KEY = 'ai_cookie_consent_v1'

/**
 * True when the user has affirmatively granted consent for analytics.
 *
 * - Server-side: returns `true` (no client state to honor; events that fire
 *   server-side, e.g. from API routes via `gtag`, are not subject to PECR
 *   client-side cookie rules).
 * - Client-side, consent === 'accepted': true.
 * - Client-side, consent === 'rejected' or null (never answered): false.
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'accepted'
  } catch {
    return false
  }
}

/**
 * Synchronous shim for components that want a server-rendered placeholder
 * before the client-side check runs. Server returns `true` so SSR-rendered
 * tracker components don't no-op for one hydration tick; client-side
 * verification happens in the consumer's useEffect.
 */
export function getServerConsentDefault(): boolean {
  return typeof window === 'undefined'
}
