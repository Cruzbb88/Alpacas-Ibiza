import createMiddleware from 'next-intl/middleware'
import { i18nConfig } from './i18n.config'

export default createMiddleware({
  locales: [...i18nConfig.locales],
  defaultLocale: i18nConfig.defaultLocale,
  localePrefix: 'always', // matches current /en/... pattern
  localeDetection: true,
})

export const config = {
  // Preserve exclusions from our existing middleware.
  // Skips: API routes, Next internals, static files, og/healthz/manifest/robots/sitemap/pagefind.
  matcher: [
    '/((?!api|_next|admin|og|healthz|favicon\\.ico|apple-icon|icon|.*\\.webmanifest|robots\\.txt|sitemap.*\\.xml|_pagefind).*)',
  ],
}
