import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { getToken } from 'next-auth/jwt'
import { i18nConfig } from './i18n.config'

const intlMiddleware = createMiddleware({
  locales: [...i18nConfig.locales],
  defaultLocale: i18nConfig.defaultLocale,
  localePrefix: 'always', // matches current /en/... pattern
  localeDetection: true,
})

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Admin auth gate — runs at Edge before the intl middleware so the redirect
  // is an HTTP 307 (seen by curl/scrapers without JS), not an RSC navigation
  // instruction that only executes inside the React runtime.
  //
  // Excluded from the gate:
  //   /admin/login          — the login page itself
  //   *.webmanifest         — iOS Add-to-Home-Screen manifest (must be public)
  if (
    pathname.startsWith('/admin') &&
    pathname !== '/admin/login' &&
    !pathname.endsWith('.webmanifest')
  ) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      // callbackUrl intentionally omitted: the login form hardcodes redirect to
      // /admin/analytics and ignores it. Forwarding it only enables phishing via
      // a crafted admin login URL (open-redirect).
      return NextResponse.redirect(loginUrl, 307)
    }
    // Token present — let Next.js render the page normally (no intl needed for /admin).
    return NextResponse.next()
  }

  return intlMiddleware(req)
}

export const config = {
  // Added /admin/:path* so the middleware runs on every admin route.
  // Preserves all original exclusions: API routes, Next internals, static files,
  // og/healthz/manifest/robots/sitemap/pagefind.
  matcher: [
    '/admin/:path*',
    '/((?!api|_next|admin|og|healthz|favicon\\.ico|apple-icon|icon|.*\\.webmanifest|robots\\.txt|sitemap.*\\.xml|_pagefind).*)',
  ],
}
