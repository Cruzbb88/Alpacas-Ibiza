import { getRequestConfig } from 'next-intl/server'
import { i18nConfig } from './i18n.config'
import enMessages from './translations/en.json'

type Messages = Record<string, unknown>

/**
 * A locale value is "absent" — and should fall back to the EN base — when it is
 * missing entirely OR carries an `__UNTRANSLATED__` sentinel (the migration left
 * 100+ of these in de/it/es/fr). Without this, next-intl would render either the
 * raw dot-key or the literal sentinel string to users.
 */
function isAbsent(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.startsWith('__UNTRANSLATED__'))
  )
}

/**
 * Deep-merge the locale's messages ON TOP of the EN base. Every key the locale
 * actually translates wins; every key it lacks (or sentinels) falls through to
 * the English copy. The result is a COMPLETE message tree for every locale, so a
 * non-EN visitor sees real translations where they exist and clean English
 * everywhere else — never a raw `namespace.key` or `__UNTRANSLATED__:` string.
 */
function mergeWithEnBase(base: Messages, override: Messages): Messages {
  const out: Messages = Array.isArray(base) ? ([...base] as unknown as Messages) : { ...base }
  for (const k of Object.keys(base)) {
    const baseVal = base[k]
    const overVal = (override as Messages)?.[k]
    if (
      baseVal !== null &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal) &&
      overVal !== null &&
      typeof overVal === 'object' &&
      !Array.isArray(overVal)
    ) {
      out[k] = mergeWithEnBase(baseVal as Messages, overVal as Messages)
    } else if (!isAbsent(overVal)) {
      out[k] = overVal
    } // else keep the EN base value
  }
  return out
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale =
    i18nConfig.locales.includes(requested as (typeof i18nConfig.locales)[number])
      ? (requested as string)
      : i18nConfig.defaultLocale

  const en = enMessages as Messages
  let messages: Messages
  if (locale === 'en') {
    messages = en
  } else {
    const localeMessages = (await import(`./translations/${locale}.json`)).default as Messages
    messages = mergeWithEnBase(en, localeMessages)
  }

  return {
    locale,
    messages,
    getMessageFallback({ namespace, key, error }) {
      // Reached only when a key is absent from BOTH the locale AND the EN base —
      // a genuinely undefined key. Surface it loudly in dev; show the dot-key in
      // prod so it's visible-but-not-crashing rather than silently empty.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[next-intl] missing key (absent in EN too): ${namespace ? `${namespace}.` : ''}${key} — ${error.message}`)
      }
      return namespace ? `${namespace}.${key}` : key
    },
  }
})
