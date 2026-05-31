import { getRequestConfig } from 'next-intl/server'
import { i18nConfig } from './i18n.config'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale =
    i18nConfig.locales.includes(requested as (typeof i18nConfig.locales)[number])
      ? (requested as string)
      : i18nConfig.defaultLocale

  return {
    locale,
    messages: (await import(`./translations/${locale}.json`)).default,
    getMessageFallback({ namespace, key, error }) {
      // Log missing keys in development so they surface quickly.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[next-intl] missing key: ${namespace ? `${namespace}.` : ''}${key} — ${error.message}`)
      }
      // Return the dot-joined key as the visible string (mirrors old sentinel behaviour).
      const fullKey = namespace ? `${namespace}.${key}` : key
      return fullKey
    },
  }
})
