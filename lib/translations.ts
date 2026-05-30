import type { Locale } from '@/i18n.config'

import en from '@/translations/en.json'
import de from '@/translations/de.json'
import it from '@/translations/it.json'
import es from '@/translations/es.json'
import nl from '@/translations/nl.json'
import fr from '@/translations/fr.json'

const translations: Record<string, Record<string, unknown>> = { en, de, it, es, nl, fr }

function resolve(obj: unknown, keys: string[]): unknown {
  let cur = obj
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

// A sentinel-prefixed value is treated as missing: getTranslation('de', 'adopt.cta', 'Adopt') → EN value or fallback.
function isSentinel(val: string): boolean {
  return val === '__UNTRANSLATED__' || val.startsWith('__UNTRANSLATED__:')
}

export function getTranslation(locale: Locale, key: string, defaultValue = ''): string {
  const keys = key.split('.')
  const val = resolve(translations[locale], keys)
  if (typeof val === 'string' && !isSentinel(val)) return val
  // Fallback to English (skip if also sentinel)
  const enVal = resolve(translations.en, keys)
  if (typeof enVal === 'string' && !isSentinel(enVal)) return enVal
  return defaultValue
}

export function getTranslationArray(locale: Locale, key: string): string[] {
  const val = resolve(translations[locale], key.split('.'))
  if (Array.isArray(val)) return val as string[]
  // Fallback to English
  const fallback = resolve(translations.en, key.split('.'))
  if (Array.isArray(fallback)) return fallback as string[]
  return []
}

export function t(locale: Locale) {
  return (key: string, defaultValue?: string) => getTranslation(locale, key, defaultValue ?? key)
}

export function ta(locale: Locale) {
  return (key: string) => getTranslationArray(locale, key)
}
