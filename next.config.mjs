/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Canonical URL form is no-trailing-slash (matches buildLocaleAlternates output).
  // Without this, both /en/tours and /en/tours/ are reachable; the slashed variant
  // becomes duplicate content with a canonical pointing at the no-slash form.
  // Per i18n route correctness audit 2026-05-29.
  trailingSlash: false,
  async headers() {
    // CSP Report-Only per ADR-010: GTM/GA4 use inline beforeInteractive scripts
    // (ADR-006/014), so a strict CSP would break analytics. Report-Only mode
    // collects violations without blocking. Move to enforcing once nonce-based
    // CSP can replace 'unsafe-inline'.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://fareharbor.com https://*.fareharbor.com https://challenges.cloudflare.com https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://*.fareharbor.com https://api.resend.com https://places.googleapis.com https://challenges.cloudflare.com https://api.stripe.com https://api.mollie.com",
      "frame-src 'self' https://www.googletagmanager.com https://fareharbor.com https://*.fareharbor.com https://challenges.cloudflare.com https://www.openstreetmap.org https://js.stripe.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          // HSTS — 2 years, preload-eligible. Safe since site is HTTPS-only via Vercel.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // SAMEORIGIN — FareHarbor + admin pages iframe within same origin.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Deny sensor APIs; opt out of FLoC/Topics.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          // Report-Only — logs violations to console without breaking the site.
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ]
  },
  async redirects() {
    // --- New site: locale-prefix redirects (bare paths → /en/) ---
    const pages = ['tours', 'about', 'contact', 'shop', 'privacy', 'terms', 'cookies']
    const shopRoutes = ['woven', 'commission', 'alcaca']
    const experienceRoutes = ['corporate-team-building', 'romantic-sunset', 'family-farm-days']

    const localeRedirects = [
      { source: '/', destination: '/en', permanent: true },
      ...pages.map((page) => ({
        source: `/${page}`,
        destination: `/en/${page}`,
        permanent: true,
      })),
      ...shopRoutes.map((route) => ({
        source: `/shop/${route}`,
        destination: `/en/shop/${route}`,
        permanent: true,
      })),
      ...experienceRoutes.map((route) => ({
        source: `/experiences/${route}`,
        destination: `/en/experiences/${route}`,
        permanent: true,
      })),
    ]

    // --- Old Squarespace site: 301 redirects to preserve SEO ---
    // Old site was Dutch-language on Squarespace (www.alpacasibiza.com)
    const alpacaNames = [
      'barbarella', 'avalon', 'bardot', 'chet', 'dusty',
      'fela', 'fonda', 'lewis', 'marron', 'mojo',
      'moloko', 'nelson', 'suki', 'toots',
    ]

    const oldSiteRedirects = [
      // Main pages
      { source: '/home', destination: '/en', permanent: true },
      { source: '/home-1', destination: '/en', permanent: true },
      { source: '/wie-zijn-wij', destination: '/en/about', permanent: true },
      { source: '/wat-doen-wij', destination: '/en/tours', permanent: true },
      { source: '/wat-doen-wij-1', destination: '/en/tours', permanent: true },
      { source: '/alpacas-ibiza', destination: '/en/about', permanent: true },
      { source: '/onze-alpacas', destination: '/en/about', permanent: true },
      { source: '/contact-1', destination: '/en/contact', permanent: true },

      // Services & Experiences
      { source: '/weddings-photoshoots', destination: '/en/experiences/romantic-sunset', permanent: true },
      { source: '/weddings-photoshoots-1', destination: '/en/shop/alcaca', permanent: true },
      { source: '/adopt-a-paca', destination: '/en/tours', permanent: true },
      { source: '/alpaca-yoga', destination: '/en/tours', permanent: true },
      { source: '/alpaca-yoga-1', destination: '/en/tours', permanent: true },
      { source: '/business-incentives-brainstormsessies', destination: '/en/experiences/corporate-team-building', permanent: true },

      // Weaving / Shop
      { source: '/informatie-weaving', destination: '/en/shop/woven', permanent: true },
      { source: '/informatie-weaving-1', destination: '/en/shop/woven', permanent: true },

      // Legal
      { source: '/algemene-voorwaarden', destination: '/en/terms', permanent: true },

      // Individual alpaca pages → About page
      ...alpacaNames.map((name) => ({
        source: `/${name}`,
        destination: '/en/about',
        permanent: true,
      })),
    ]

    const feedRedirect = [
      { source: '/feed.xml', destination: '/journal/rss.xml', permanent: false },
    ]

    return [...feedRedirect, ...localeRedirects, ...oldSiteRedirects]
  },
}

export default nextConfig

