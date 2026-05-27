/**
 * Shared locale-alternates helper for sub-page generateMetadata functions.
 *
 * Usage:
 *   const alts = buildLocaleAlternates('tours')
 *   // → { canonical: 'https://alpacasibiza.com/en/tours',
 *   //     languages: { en: '…/en/tours', de: '…/de/tours', …, 'x-default': '…/en/tours' } }
 *
 * Rules:
 * - `path` must NOT have a leading slash (e.g. 'tours', 'contact', 'adopt').
 * - Absolute URLs are built from SITE_BASE_URL so they work in any environment.
 * - 'x-default' always points to the defaultLocale URL per Google hreflang spec.
 */

import { i18nConfig } from '@/i18n.config'
import { SITE_BASE_URL } from '@/lib/config'

export interface LocaleAlternates {
  canonical: string
  languages: Record<string, string>
}

/**
 * Build canonical + hreflang languages (including x-default) for a given
 * locale and sub-page path.
 *
 * @param locale  - Active locale for this page render (e.g. 'de').
 * @param path    - Page path WITHOUT leading slash (e.g. 'tours', 'contact').
 *                  Pass '' for the locale root page.
 */
export function buildLocaleAlternates(locale: string, path: string): LocaleAlternates {
  const base = SITE_BASE_URL.replace(/\/$/, '')
  const segment = path ? `/${path}` : ''

  const canonical = `${base}/${locale}${segment}`

  const languages: Record<string, string> = Object.fromEntries(
    i18nConfig.locales.map((l) => [l, `${base}/${l}${segment}`])
  )
  // x-default → default locale URL per Google hreflang spec
  languages['x-default'] = `${base}/${i18nConfig.defaultLocale}${segment}`

  return { canonical, languages }
}
