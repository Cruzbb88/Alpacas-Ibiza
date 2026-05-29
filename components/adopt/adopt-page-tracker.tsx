'use client'

/**
 * AdoptPageTracker — fires the `adopt_page_viewed` GA4 event when the
 * /[locale]/adopt page mounts.
 *
 * Why a dedicated client component?
 *   - app/[locale]/adopt/page.tsx is a server component (async, async params).
 *   - useEffect / window.gtag are client-only.
 *   - This component renders nothing — pure side-effect wrapper.
 *
 * NOT fired on the success / cancelled states (those have their own
 * `adopt_checkout_succeeded` / `adopt_checkout_cancelled` events emitted
 * by AdoptThankYou). The parent page should only render this tracker when
 * the marketing content is showing.
 */

import { usePageView } from '@/lib/client-track'

interface AdoptPageTrackerProps {
  locale: string
}

export function AdoptPageTracker({ locale }: AdoptPageTrackerProps) {
  usePageView('adopt_page_viewed', { locale })
  return null
}
