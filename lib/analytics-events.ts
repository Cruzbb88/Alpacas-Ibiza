/**
 * lib/analytics-events.ts — Typed GA4 event catalog for the adopt funnel.
 *
 * Why this module exists
 * ──────────────────────
 * GA4 + GTM are loaded site-wide via app/layout.tsx (ADR 014 + 006). Until now,
 * the only custom events fired were `scroll_depth`, `outbound_click`,
 * `file_download` (lib/analytics-engagement.ts). The adopt funnel was a black
 * box: we could see /adopt sessions in GA but not which tier was selected, which
 * alpaca, or where donors dropped off. This module fixes that with a strictly
 * typed event taxonomy.
 *
 * Design rules — DO NOT WEAKEN
 *   1. All params are primitive (string / number / boolean / null). GA4 silently
 *      rejects nested objects and the developer never sees the event.
 *   2. NO PII. Donor email / name / Stripe customer ID NEVER appear here. Only
 *      locale, tier, alpaca slug (already public), and boolean flags.
 *   3. Server-safe. typeof window === 'undefined' → silent no-op. The same
 *      module is importable from server components without crashing.
 *   4. Defensive. If window.gtag is missing (Consent Mode v2 denied, cold load,
 *      ad-blocker), fall back to window.dataLayer.push so GTM container can
 *      still pick the event up later. If even dataLayer is gone, swallow.
 *   5. Never throws. React event handlers calling trackEvent must never break
 *      the UI if analytics is broken.
 *
 * Companion files:
 *   - lib/client-track.ts        client-only re-export + usePageView hook
 *   - lib/analytics-events.test.ts unit tests (node --test)
 */

// ── Event categories ────────────────────────────────────────────────────────
// Used in GA4 reports to filter events by funnel stage without remembering
// every event name.
export type EventCategory =
  | 'adopt_funnel'
  | 'gift_funnel'
  | 'checkout'
  | 'engagement'

// ── Param shape per event ───────────────────────────────────────────────────
// All values primitive. `null` is allowed where a field is legitimately absent
// (e.g. no alpaca picked) so consumers can distinguish "not selected" from
// "missing data".
export interface EventParamsMap {
  adopt_page_viewed: {
    locale: string
  }
  adopt_tier_selected: {
    tier: 'monthly' | 'yearly'
    source: 'card' | 'sticky' | 'cta' | 'repeat'
  }
  adopt_alpaca_picked: {
    alpaca_slug: string | null
    position: number
  }
  adopt_gift_toggled: {
    enabled: boolean
  }
  adopt_gift_fields_completed: {
    has_send_date: boolean
    has_message: boolean
  }
  adopt_checkout_started: {
    tier: 'monthly' | 'yearly'
    alpaca_slug: string | null
    processor: 'stripe' | 'mollie' | 'mailto' | 'fareharbor' | 'unknown'
    is_gift: boolean
  }
  adopt_checkout_succeeded: {
    tier: 'monthly' | 'yearly'
  }
  adopt_checkout_cancelled: {
    tier: 'monthly' | 'yearly'
  }
  // Embedded-checkout funnel resolution (Stage 1-2 migration). Fires only when
  // CHECKOUT_MODE=embedded is active; hosted-redirect path leaves these dark.
  adopt_payment_field_focused: Record<string, never>
  adopt_payment_confirmed: {
    tier: 'monthly' | 'yearly'
    processor: 'stripe'
  }
  newsletter_signup_attempted: {
    source: string
  }
  newsletter_signup_succeeded: {
    source: string
  }
}

export type EventName = keyof EventParamsMap
export type EventParams<E extends EventName> = EventParamsMap[E]

// ── Category lookup ─────────────────────────────────────────────────────────
// Filed alongside the param map (not on the wire) so GA4 reports can filter
// by category without us pushing `category` into every event payload.
export const EVENT_CATEGORY: Record<EventName, EventCategory> = {
  adopt_page_viewed: 'adopt_funnel',
  adopt_tier_selected: 'adopt_funnel',
  adopt_alpaca_picked: 'adopt_funnel',
  adopt_gift_toggled: 'gift_funnel',
  adopt_gift_fields_completed: 'gift_funnel',
  adopt_checkout_started: 'checkout',
  adopt_checkout_succeeded: 'checkout',
  adopt_checkout_cancelled: 'checkout',
  adopt_payment_field_focused: 'checkout',
  adopt_payment_confirmed: 'checkout',
  newsletter_signup_attempted: 'engagement',
  newsletter_signup_succeeded: 'engagement',
}

// ── gtag / dataLayer minimal types ──────────────────────────────────────────
// We don't want to widen the global Window type; everything goes through a
// narrow `unknown` cast at the call site.
type GtagFn = (command: string, eventName: string, params: Record<string, unknown>) => void
type DataLayerPush = (entry: Record<string, unknown>) => void

interface AnalyticsWindow {
  gtag?: unknown
  dataLayer?: { push?: unknown } | unknown
}

import { hasAnalyticsConsent } from './consent-gate.ts'

function getAnalyticsWindow(): AnalyticsWindow | null {
  if (typeof window === 'undefined') return null
  return window as unknown as AnalyticsWindow
}

/**
 * trackEvent — the only public way to push a custom event into GA4 / GTM.
 *
 * Behaviour:
 *   - Server-side (no window): silent no-op.
 *   - window.gtag is a function: call it directly (preferred — config tag
 *     already configured per ADR 006/014).
 *   - window.gtag missing but window.dataLayer.push exists: push the raw event
 *     onto the dataLayer so GTM picks it up via Custom Event triggers.
 *   - Neither available: swallow. We will not crash a checkout flow because
 *     analytics is unreachable.
 *
 * Wrapped in try/catch end-to-end so a malformed gtag implementation can't
 * break onClick handlers.
 */
export function trackEvent<E extends EventName>(name: E, params: EventParams<E>): void {
  const w = getAnalyticsWindow()
  if (!w) return

  // Consent gate (PECR): callers may fire trackEvent unconditionally; we
  // check the cookie-consent state here and silently no-op when the user
  // hasn't affirmatively consented. Defensive belt-and-braces — the
  // existing Consent Mode v2 in cookie-consent.tsx already gates the GA
  // pixel itself, this gate prevents the network round-trip too.
  if (!hasAnalyticsConsent()) return

  // Add category as a regular param so GA4 reports can filter on it.
  const enrichedParams: Record<string, unknown> = {
    ...params,
    event_category: EVENT_CATEGORY[name],
  }

  try {
    if (typeof w.gtag === 'function') {
      ;(w.gtag as GtagFn)('event', name, enrichedParams)
      return
    }

    const dl = w.dataLayer as { push?: unknown } | undefined
    if (dl && typeof dl.push === 'function') {
      ;(dl.push as DataLayerPush)({ event: name, ...enrichedParams })
      return
    }
    // Neither path available — silent. GA4 / GTM script may not have loaded yet.
  } catch {
    // Never let analytics break the page.
  }
}
