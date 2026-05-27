/**
 * FareHarbor BookingProvider adapter.
 *
 * Wraps the existing functions in lib/config.ts (FAREHARBOR_BOOKING_URL,
 * getFareHarborItemUrl) and the availability route logic so they conform to
 * the BookingProvider interface.
 *
 * Failsafe: fail-quiet. embedUrl/itemUrl always return a usable URL.
 * availability() returns { configured: false } when API keys are missing.
 */

import type { BookingProvider } from './_types'
import type { Tenant } from '@/lib/tenants/_types'
import { fetchWithTimeout } from '@/lib/fetch'
import { isSet } from '@/lib/validate-env'

export function fareHarborBookingProvider(tenant: Tenant): BookingProvider {
  const shortname = tenant.fareHarbor.shortname

  function embedUrl(opts?: { fullItems?: boolean }): string {
    const params: string[] = []
    if (opts?.fullItems) params.push('full-items=yes')
    const query = params.length ? `?${params.join('&')}` : ''
    return `https://fareharbor.com/embeds/book/${shortname}/${query}`
  }

  function itemUrl(itemId: string | undefined, opts?: { fullItems?: boolean }): string {
    const base = embedUrl(opts)
    if (!itemId) return base
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}items=${encodeURIComponent(itemId)}`
  }

  async function availability(opts: {
    fromIso: string
    toIso: string
    maxItems?: number
  }): Promise<
    | { configured: false; reason: string }
    | { configured: true; dates: ReadonlyArray<{ date: string; capacity: number; startTime: string }> }
  > {
    // Credentials live in env — keep them out of the Tenant interface (secrets).
    if (!isSet('FAREHARBOR_APP_KEY') || !isSet('FAREHARBOR_USER_KEY')) {
      return { configured: false, reason: 'FAREHARBOR_APP_KEY/USER_KEY not configured' }
    }
    const appKey = process.env.FAREHARBOR_APP_KEY!
    const userKey = process.env.FAREHARBOR_USER_KEY!

    try {
      const itemsRes = await fetchWithTimeout(
        `https://fareharbor.com/api/external/v1/companies/${shortname}/items/`,
        { headers: { 'X-FareHarbor-API-App': appKey, 'X-FareHarbor-API-User': userKey } },
      )
      if (!itemsRes.ok) {
        return { configured: false, reason: `items returned ${itemsRes.status}` }
      }
      const itemsData = (await itemsRes.json()) as { items?: Array<{ pk: number | string }> }
      const itemPks = (itemsData.items ?? []).map((i) => i.pk).slice(0, opts.maxItems ?? 3)

      const fromDate = opts.fromIso.split('T')[0]
      const toDate = opts.toIso.split('T')[0]

      const results = await Promise.allSettled(
        itemPks.map((pk) =>
          fetchWithTimeout(
            `https://fareharbor.com/api/external/v1/companies/${shortname}/items/${pk}/minimal/availabilities/date-range/${fromDate}/${toDate}/`,
            { headers: { 'X-FareHarbor-API-App': appKey, 'X-FareHarbor-API-User': userKey } },
          ).then((r) => (r.ok ? r.json() : null)),
        ),
      )

      const dates: Array<{ date: string; capacity: number; startTime: string }> = []
      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue
        const avails = (r.value as { availabilities?: Array<{ start_at: string; capacity: number }> })
          .availabilities ?? []
        for (const a of avails) {
          if (a.capacity > 0) {
            dates.push({ date: a.start_at.split('T')[0], capacity: a.capacity, startTime: a.start_at })
          }
        }
      }
      // Dedupe by date + sort
      const unique = Array.from(new Map(dates.map((d) => [d.date, d])).values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )
      return { configured: true, dates: unique.slice(0, 8) }
    } catch (err) {
      console.error('[fareHarborBookingProvider] availability error:', err)
      return { configured: false, reason: 'fetch failed' }
    }
  }

  return {
    kind: 'fareharbor',
    embedUrl,
    itemUrl,
    availability,
  }
}
