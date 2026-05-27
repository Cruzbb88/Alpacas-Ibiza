/**
 * Manual-inquiry BookingProvider adapter.
 *
 * For tenants WITHOUT a booking system. "Book Now" links land on the contact
 * page with a pre-filled subject. availability() always returns
 * { configured: false } — the UI shows the static CTA instead of a calendar.
 *
 * Failsafe: fail-quiet by definition (this IS the fallback).
 */

import type { BookingProvider } from './_types'
import type { Tenant } from '@/lib/tenants/_types'

export function manualInquiryBookingProvider(tenant: Tenant): BookingProvider {
  const contactPath = `${tenant.siteUrl}/${tenant.defaultLocale}/contact`

  return {
    kind: 'manual-inquiry',
    embedUrl(): string {
      return `${contactPath}?subject=${encodeURIComponent('Booking inquiry')}`
    },
    itemUrl(itemId: string | undefined): string {
      const subject = itemId
        ? `Booking inquiry — ${itemId}`
        : 'Booking inquiry'
      return `${contactPath}?subject=${encodeURIComponent(subject)}`
    },
    async availability() {
      return { configured: false, reason: 'manual-inquiry tenant — no live availability' }
    },
  }
}
