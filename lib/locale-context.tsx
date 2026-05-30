'use client'

/**
 * LocaleTranslationsProvider + useLocaleT hook.
 *
 * Problem: lib/translations.ts imports all 6 locale JSON files statically
 * (en=68KB, de-fr-es-it-nl ≈37-39KB each = ~253KB raw). Any client component
 * that imports { t } from @/lib/translations drags the entire multi-locale
 * bundle into the client chunk, inflating it to ~212KB (second-largest chunk).
 *
 * Fix: the server layout resolves the current locale's translations once
 * (server-side, no client bundle cost) and injects them through this context.
 * Client components call useLocaleT() instead of importing lib/translations.
 * The JSON data never appears in any client-side chunk.
 *
 * Estimated saving: ~212KB → ~30KB for the shared layout chunk (−182KB).
 *
 * Wire-up:
 *   - Server layout: import { getLocaleTranslations } from @/lib/translations
 *     then wrap children with <LocaleTranslationsProvider data={getLocaleTranslations(locale)}>
 *   - Client components: replace
 *       import { t } from '@/lib/translations'
 *       const tr = t(locale)
 *     with
 *       import { useLocaleT } from '@/lib/locale-context'
 *       const tr = useLocaleT()
 */

import { createContext, useContext } from 'react'

/**
 * Shape of the pre-resolved locale data injected by the server layout.
 * Defined here (client-facing) so locale-context has no imports from
 * lib/translations (which carries the 6-locale JSON bundle).
 * lib/translations re-exports this type for call-site convenience.
 */
export interface LocaleTranslationData {
  locale: string
  /** The locale-specific translation tree. */
  strings: Record<string, unknown>
  /** EN tree for sentinel fallback. */
  en: Record<string, unknown>
}

const LocaleTranslationsContext = createContext<LocaleTranslationData | null>(null)

export function LocaleTranslationsProvider({
  data,
  children,
}: {
  data: LocaleTranslationData
  children: React.ReactNode
}) {
  return (
    <LocaleTranslationsContext.Provider value={data}>
      {children}
    </LocaleTranslationsContext.Provider>
  )
}

function resolve(obj: unknown, keys: string[]): unknown {
  let cur = obj
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

function isSentinel(val: string): boolean {
  return val === '__UNTRANSLATED__' || val.startsWith('__UNTRANSLATED__:')
}

/**
 * Returns a translation function for the current locale — identical call
 * signature to the server-side t(locale) factory from lib/translations.
 *
 * Usage:
 *   const tr = useLocaleT()
 *   tr('nav.tours')              // → "Tours & Visits"
 *   tr('missing.key', 'Fallback') // → "Fallback"
 */
export function useLocaleT(): (key: string, defaultValue?: string) => string {
  const ctx = useContext(LocaleTranslationsContext)

  return (key: string, defaultValue?: string): string => {
    if (!ctx) {
      // Context not wired — return key as last-resort fallback (dev hint).
      return defaultValue ?? key
    }
    const keys = key.split('.')
    const val = resolve(ctx.strings, keys)
    if (typeof val === 'string' && !isSentinel(val)) return val
    // Fallback to English
    const enVal = resolve(ctx.en, keys)
    if (typeof enVal === 'string' && !isSentinel(enVal)) return enVal
    return defaultValue ?? key
  }
}

/**
 * Returns the current locale string from context.
 * Falls back to 'en' if the provider is not wired yet.
 */
export function useLocale(): string {
  const ctx = useContext(LocaleTranslationsContext)
  return ctx?.locale ?? 'en'
}

/**
 * Returns a translation-array function — parity with lib/translations ta(locale).
 */
export function useLocaleTa(): (key: string) => string[] {
  const ctx = useContext(LocaleTranslationsContext)

  return (key: string): string[] => {
    if (!ctx) return []
    const val = resolve(ctx.strings, key.split('.'))
    if (Array.isArray(val)) return val as string[]
    const fallback = resolve(ctx.en, key.split('.'))
    if (Array.isArray(fallback)) return fallback as string[]
    return []
  }
}
