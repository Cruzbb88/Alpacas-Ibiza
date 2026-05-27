/**
 * MapProvider — abstraction over map embedding strategies.
 *
 * Supported kinds:
 *   osm-iframe      — OpenStreetMap embed, no API key required (fail-open by design)
 *   google-embed    — Google Maps iframe embed; requires GOOGLE_MAPS_EMBED_API_KEY.
 *                     Falls back to osm-iframe if the key is unset.
 *
 * Failsafe contract: embedUrl() and linkUrl() MUST always return a usable URL.
 * The google-embed adapter falls back to osm-iframe rather than throwing or returning
 * an empty string. No adapter should ever error on missing credentials.
 *
 * Usage:
 *   import { makeMapProvider } from '@/lib/integrations/map'
 *   const provider = makeMapProvider()
 *   provider.embedUrl({ lat: 38.9861, lng: 1.5228 })
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type MapProviderKind = 'osm-iframe' | 'google-embed'

export interface MapProvider {
  readonly kind: MapProviderKind

  /**
   * URL to use as the iframe `src`. Always returns a usable URL.
   * @param opts.zoom  Zoom level, default 14.
   */
  embedUrl(opts: { lat: number; lng: number; zoom?: number }): string

  /**
   * External link URL (for "View larger map →" anchors).
   * @param opts.query  Human-readable search query (e.g. "Alpacas Ibiza, Santa Eulària").
   */
  linkUrl(opts: { lat: number; lng: number; query: string }): string
}

// ── OSM adapter ───────────────────────────────────────────────────────────────

/**
 * OpenStreetMap embed — no credentials required.
 *
 * embedUrl: https://www.openstreetmap.org/export/embed.html
 * linkUrl:  https://www.openstreetmap.org/
 *
 * The bbox is computed as ±0.04° lat / ±0.04° lng around the pin — the same
 * padding used in the hardcoded contact page URL (1.4828…1.5628, 38.9661…39.0061
 * around the 38.9861,1.5228 pin).
 */
function osmIframeProvider(): MapProvider {
  return {
    kind: 'osm-iframe',

    embedUrl({ lat, lng, zoom = 14 }) {
      const pad = 0.04
      const bbox = [lng - pad, lat - pad, lng + pad, lat + pad]
        .map(n => n.toFixed(4))
        .join('%2C')
      const marker = `${lat}%2C${lng}`
      return (
        `https://www.openstreetmap.org/export/embed.html` +
        `?bbox=${bbox}&layer=mapnik&marker=${marker}&zoom=${zoom}`
      )
    },

    linkUrl({ lat, lng, query }) {
      const zoom = 14
      // OSM ignores the query param but Google-style links use it.
      // We encode it for forward-compat; OSM uses mlat/mlon for the pin.
      const q = encodeURIComponent(query)
      return (
        `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}` +
        `#map=${zoom}/${lat}/${lng}&q=${q}`
      )
    },
  }
}

// ── Google Maps embed adapter ─────────────────────────────────────────────────

/**
 * Google Maps Embed API adapter.
 *
 * Requires GOOGLE_MAPS_EMBED_API_KEY. If the env var is unset at call-time,
 * falls back to the osm-iframe adapter (fail-open).
 *
 * embedUrl: https://www.google.com/maps/embed/v1/place?key=…&q=…&center=…&zoom=…
 * linkUrl:  https://www.google.com/maps/search/?api=1&query=…
 */
function googleEmbedProvider(): MapProvider {
  const fallback = osmIframeProvider()

  return {
    kind: 'google-embed',

    embedUrl(opts) {
      const apiKey = process.env.GOOGLE_MAPS_EMBED_API_KEY
      if (!apiKey) {
        // No key — fall back to OSM to keep the map visible.
        return fallback.embedUrl(opts)
      }
      const { lat, lng, zoom = 14 } = opts
      const center = encodeURIComponent(`${lat},${lng}`)
      return (
        `https://www.google.com/maps/embed/v1/view` +
        `?key=${apiKey}&center=${center}&zoom=${zoom}&maptype=roadmap`
      )
    },

    linkUrl({ lat, lng, query }) {
      const q = encodeURIComponent(query)
      return `https://www.google.com/maps/search/?api=1&query=${q}&ll=${lat},${lng}`
    },
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Return the best available MapProvider.
 *
 * - Passing `kind: 'google-embed'` selects Google; falls back to OSM if key missing.
 * - Default (no argument) selects `osm-iframe` — always works with no credentials.
 */
export function makeMapProvider(kind: MapProviderKind = 'osm-iframe'): MapProvider {
  if (kind === 'google-embed') return googleEmbedProvider()
  return osmIframeProvider()
}
