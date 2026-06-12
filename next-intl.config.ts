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
 *
 * Arrays: when BOTH base and override carry an array for the same key, we merge
 * element-by-element so individual sentinel strings inside array items are still
 * replaced with their EN equivalents. If the arrays differ in length (locale has
 * more or fewer items than EN), we fall back to the EN array for that key.
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
      // Both are plain objects — recurse
      out[k] = mergeWithEnBase(baseVal as Messages, overVal as Messages)
    } else if (
      Array.isArray(baseVal) &&
      Array.isArray(overVal) &&
      baseVal.length === overVal.length
    ) {
      // Both are arrays of the same length — merge element-by-element so
      // __UNTRANSLATED__ strings inside array items fall back to EN.
      out[k] = baseVal.map((baseEl: unknown, i: number) => {
        const overEl = (overVal as unknown[])[i]
        if (baseEl !== null && typeof baseEl === 'object' && !Array.isArray(baseEl) &&
            overEl !== null && typeof overEl === 'object' && !Array.isArray(overEl)) {
          return mergeWithEnBase(baseEl as Messages, overEl as Messages)
        }
        return isAbsent(overEl) ? baseEl : overEl
      }) as unknown as Messages
    } else if (Array.isArray(baseVal) && Array.isArray(overVal)) {
      // Arrays of DIFFERENT length → the locale translation is incomplete.
      // Keep the EN base array (out[k] already holds it from the spread above)
      // rather than render a truncated locale list. This is the fallback the
      // doc-comment promises; the old code silently used the shorter array.
    } else if (!isAbsent(overVal)) {
      out[k] = overVal
    } // else keep the EN base value
  }
  return out
}

/**
 * Strip any remaining `__UNTRANSLATED__*` sentinel values from the final
 * message tree (including EN itself, which carries 3 OWNER_INPUT_NEEDED
 * placeholder strings in the legal-disclosure namespace). Sentinels are
 * replaced with empty string so next-intl renders nothing instead of the
 * literal placeholder text.
 *
 * This is a separate pass from mergeWithEnBase so it can be applied to both
 * EN and all other locales after the merge is complete.
 *
 * Arrays: recurse into array elements so sentinels inside array-shaped
 * translation values (FAQ items, benefit lists, cookie lists) are also stripped.
 *
 * Graceful null/0/false: these are valid translated values, not sentinels.
 * - null  → skipped (not a string, not a plain object, not an array — left as-is)
 * - 0     → typeof 'number' → left as-is
 * - false → typeof 'boolean' → left as-is
 */
function stripSentinels(messages: Messages): Messages {
  const out: Messages = Array.isArray(messages)
    ? ([...messages] as unknown as Messages)
    : { ...messages }
  for (const k of Object.keys(out)) {
    const v = out[k]
    if (typeof v === 'string' && v.startsWith('__UNTRANSLATED__')) {
      out[k] = ''
    } else if (typeof v === 'string' && v.includes('OWNER_REVIEW_TRANSLATION')) {
      // Real text carrying a review marker (owner to confirm the copy). Strip
      // the marker before render so it never leaks to visitors; the real text
      // stays. The marker remains in translations/*.json for the owner.
      out[k] = v.replace(/\s*OWNER_REVIEW_TRANSLATION\s*/g, ' ').trim()
    } else if (Array.isArray(v)) {
      // Recurse into array elements
      out[k] = v.map((el: unknown) => {
        if (typeof el === 'string' && el.startsWith('__UNTRANSLATED__')) return ''
        if (typeof el === 'string' && el.includes('OWNER_REVIEW_TRANSLATION')) return el.replace(/\s*OWNER_REVIEW_TRANSLATION\s*/g, ' ').trim()
        if (el !== null && typeof el === 'object' && !Array.isArray(el)) {
          return stripSentinels(el as Messages)
        }
        if (Array.isArray(el)) return (stripSentinels(el as unknown as Messages) as unknown as unknown[])
        return el
      }) as unknown as Messages
    } else if (v !== null && typeof v === 'object') {
      out[k] = stripSentinels(v as Messages)
    }
    // null, number, boolean: left as-is (valid translated values, not sentinels)
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
    messages = stripSentinels(en)
  } else {
    const localeMessages = (await import(`./translations/${locale}.json`)).default as Messages
    messages = stripSentinels(mergeWithEnBase(en, localeMessages))
  }

  return {
    locale,
    messages,
    // Pin the formatting time zone so server-rendered and client-rendered dates
    // agree. Without this, next-intl warns "no timeZone configured" and any
    // Intl date/time output can differ between the Vercel server (UTC) and the
    // visitor's browser, producing a hydration markup mismatch. The business is
    // in Santa Eulària, Ibiza → Europe/Madrid (documented tenant location).
    timeZone: 'Europe/Madrid',
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
