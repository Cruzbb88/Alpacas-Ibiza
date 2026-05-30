/**
 * Alpacas Ibiza service worker — offline shell only.
 *
 * Strategy:
 *   - HTML navigation: network-first with cache fallback (so users see fresh content
 *     when online, cached when offline; no stale-page risk)
 *   - Static assets (_next/static/*, /icon, /apple-icon, /og images): cache-first
 *   - Everything else: passthrough (no caching)
 *
 * No background sync. No push notifications. Minimal surface = minimal risk.
 *
 * Versioned cache name: bump CACHE_VERSION when shipping a new offline shell
 * so the activate event purges old caches.
 */

const CACHE_VERSION = 'alpacas-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const HTML_CACHE = `${CACHE_VERSION}-html`

// The offline page lives under the [locale] segment: /en/offline, /de/offline, etc.
// Use the default locale (/en/offline) as the pre-cached fallback. The middleware
// would redirect /offline → /en/offline (302) making cache.add() store under the
// wrong key; pointing directly at /en/offline avoids that mismatch.
const OFFLINE_FALLBACK_URL = '/en/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(HTML_CACHE)
      try {
        // Pre-cache the offline fallback so it's always available.
        await cache.add(new Request(OFFLINE_FALLBACK_URL, { cache: 'no-cache' }))
      } catch (e) {
        // If /offline isn't shipped yet, skip without failing install.
      }
      self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((n) => !n.startsWith(CACHE_VERSION))
          .map((n) => caches.delete(n)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Only handle GET; let everything else pass through.
  if (req.method !== 'GET') return

  // Skip cross-origin (FareHarbor, Google, etc.) — let the browser handle.
  if (url.origin !== self.location.origin) return

  // Skip API routes (would break SSR + Stripe webhooks + dynamic data)
  if (url.pathname.startsWith('/api/')) return

  // Skip auth + admin paths
  if (url.pathname.startsWith('/admin')) return

  // HTML navigation requests → network-first
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          // Update cache in background; only cache 200s
          if (fresh.ok) {
            const cache = await caches.open(HTML_CACHE)
            cache.put(req, fresh.clone()).catch(() => {})
          }
          return fresh
        } catch {
          // Offline — try cache, then offline fallback
          const cache = await caches.open(HTML_CACHE)
          const cached = await cache.match(req)
          if (cached) return cached
          const fallback = await cache.match(OFFLINE_FALLBACK_URL)
          if (fallback) return fallback
          return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
        }
      })(),
    )
    return
  }

  // Static assets (CSS, JS chunks, fonts, OG images) → cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon') ||
    url.pathname.startsWith('/apple-icon') ||
    url.pathname.startsWith('/opengraph-image') ||
    url.pathname.match(/\.(woff2?|ttf|otf|css|js)$/)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE)
        const cached = await cache.match(req)
        if (cached) return cached
        try {
          const fresh = await fetch(req)
          if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {})
          return fresh
        } catch {
          return new Response('', { status: 504 })
        }
      })(),
    )
  }
})
