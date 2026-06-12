'use client'

import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'

/**
 * Client-side next-intl provider with crash-proof error handling.
 *
 * next-intl's CLIENT `useTranslations` THROWS `MISSING_MESSAGE` by default.
 * Because the header/nav are client components rendered inside the locale
 * layout, a single missing key throws during hydration and the whole page
 * falls through to the error boundary ("Something went wrong") — every route.
 *
 * The SERVER request config (next-intl.config.ts) already degrades missing
 * keys via getMessageFallback, but the client provider needs the SAME
 * resilience. onError/getMessageFallback are functions and cannot be passed
 * from the server layout (not serializable), so they live here in a client
 * component instead.
 */
export function IntlClientProvider({
  locale,
  messages,
  children,
}: {
  locale: string
  messages: Record<string, unknown>
  children: ReactNode
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        // A missing key must NEVER crash the page on the client. Swallow it;
        // getMessageFallback below supplies a visible string instead.
        if (error.code === 'MISSING_MESSAGE') return
        // eslint-disable-next-line no-console
        console.error(error)
      }}
      getMessageFallback={({ namespace, key }) =>
        namespace ? `${namespace}.${key}` : key
      }
    >
      {children}
    </NextIntlClientProvider>
  )
}
