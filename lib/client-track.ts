'use client'

/**
 * lib/client-track.ts — Client-only thin wrapper around lib/analytics-events.
 *
 * The core taxonomy (lib/analytics-events.ts) is server-safe. This module
 * tags itself 'use client' so React hooks (usePageView) can live alongside
 * the re-exported trackEvent without forcing all importers into client
 * boundaries.
 *
 * Why two files?
 *   - lib/analytics-events.ts can be imported from server components, route
 *     handlers, edge functions — it never crashes server-side.
 *   - lib/client-track.ts is for React components that want the hook ergonomics
 *     (useEffect-based page-view fire on mount).
 *
 * Both expose the same trackEvent — there is no second implementation.
 */

import { useEffect } from 'react'
import {
  trackEvent,
  type EventName,
  type EventParams,
} from './analytics-events'

export { trackEvent }
export type { EventName, EventParams }

/**
 * usePageView — fires a typed page-view event once on mount.
 *
 * Use this for any client page or page-tracker component (see
 * components/adopt/adopt-page-tracker.tsx) that needs to report a page view
 * AFTER the GA4 config tag has run. Server-rendered pages already auto-fire
 * `page_view` via gtag config; this hook is for funnel-specific page events
 * like `adopt_page_viewed` that we want separate from generic page_view.
 *
 * Params are JSON-stringified into the effect's dependency list so a
 * params object reference change doesn't re-fire on every render.
 */
export function usePageView<E extends EventName>(name: E, params: EventParams<E>): void {
  const key = JSON.stringify(params)
  useEffect(() => {
    trackEvent(name, params)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, key])
}
