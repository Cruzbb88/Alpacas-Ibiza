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
    //
    // ── Origin inventory (keep in sync with every external resource) ──────────
    //
    // SCRIPTS (script-src)
    //   www.googletagmanager.com  — GA4 gtag.js + FareHarbor GTM container (app/layout.tsx)
    //   www.google-analytics.com  — legacy GA4 tag helper
    //   fareharbor.com            — FareHarbor booking embed API (app/layout.tsx Script lazyOnload)
    //   *.fareharbor.com          — FareHarbor subdomains (integration kit, CDN)
    //   challenges.cloudflare.com — Cloudflare Turnstile CAPTCHA widget JS
    //   js.stripe.com             — Stripe.js (loaded by @stripe/stripe-js in embedded-checkout.tsx)
    //   js.mollie.com             — Mollie Components JS (loaded via next/script in embedded-mollie-checkout.tsx)
    //   va.vercel-scripts.com     — Vercel Analytics + SpeedInsights script (vercel-instrumentation.tsx)
    //
    // STYLES (style-src)
    //   fonts.googleapis.com      — Google Fonts CSS (next/font/google Geist + Playfair Display)
    //
    // IMAGES (img-src)
    //   https:                    — broad allowance covers: og-images, fareharbor item photos,
    //                               tile.openstreetmap.org (OSM map tiles inside OSM iframe),
    //                               dipr2nuwo661l.cloudfront.net (FareHarbor CloudFront CDN)
    //
    // FONTS (font-src)
    //   fonts.gstatic.com         — Google Fonts binary files
    //
    // CONNECT (connect-src / XHR / fetch / beacon)
    //   www.googletagmanager.com      — GTM config fetch
    //   www.google-analytics.com      — GA4 hit endpoint (older)
    //   region1.google-analytics.com  — GA4 regional measurement protocol endpoint (confirmed via Lighthouse audit)
    //   *.fareharbor.com              — FareHarbor availability API + webhook callbacks
    //   api.resend.com                — Resend email API (server-side only, belt-and-suspenders)
    //   places.googleapis.com         — Google Places API (google-reviews-badge.tsx)
    //   challenges.cloudflare.com     — Turnstile token verification
    //   api.stripe.com                — Stripe REST API (payment-stripe-direct.ts)
    //   api.mollie.com                — Mollie REST API (payment-mollie.ts)
    //   va.vercel-scripts.com         — Vercel Analytics + SpeedInsights beacon endpoint
    //
    // FRAMES (frame-src)
    //   www.googletagmanager.com  — GTM noscript iframe fallback (app/layout.tsx)
    //   fareharbor.com            — FareHarbor booking lightframe
    //   *.fareharbor.com          — FareHarbor subdomains
    //   challenges.cloudflare.com — Turnstile widget iframe
    //   www.openstreetmap.org     — OSM embed iframe (lib/integrations/map.ts osm-iframe)
    //   www.google.com            — Google Maps embed iframe (lib/integrations/map.ts google-embed,
    //                               active only when GOOGLE_MAPS_EMBED_API_KEY is set; fail-open to OSM)
    //   js.stripe.com             — Stripe Elements iframe (embedded-checkout.tsx PaymentElement)
    //
    // FORM-ACTION
    //   checkout.stripe.com       — Stripe Hosted Checkout redirect target
    // ──────────────────────────────────────────────────────────────────────────
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://fareharbor.com https://*.fareharbor.com https://challenges.cloudflare.com https://js.stripe.com https://js.mollie.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://*.fareharbor.com https://api.resend.com https://places.googleapis.com https://challenges.cloudflare.com https://api.stripe.com https://api.mollie.com https://va.vercel-scripts.com",
      "frame-src 'self' https://www.googletagmanager.com https://fareharbor.com https://*.fareharbor.com https://challenges.cloudflare.com https://www.openstreetmap.org https://www.google.com https://js.stripe.com",
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

