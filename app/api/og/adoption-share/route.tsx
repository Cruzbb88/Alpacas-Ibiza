/**
 * /api/og/adoption-share?alpaca=<slug>
 *
 * Edge-runtime ImageResponse handler that renders a 1200×630 PNG used as the
 * OG card when a donor shares their adoption link to Instagram / WhatsApp /
 * Twitter / Facebook / etc. Pattern follows the per-post OG image used by
 * `app/[locale]/alpacas/[slug]/opengraph-image.tsx` and the global OG route at
 * `app/og/route.tsx`.
 *
 * Behaviour:
 *   - `?alpaca=<slug>` is sanitised + validated against `findAlpacaName()`.
 *     Unknown / missing → falls back to a generic "I support Alpacas Ibiza"
 *     card so a malformed share link still previews nicely.
 *   - Cache-Control: public, immutable, max-age=31536000. Cards are
 *     deterministic per slug — same slug always yields the same PNG, so we
 *     let CDNs / social-scrapers cache forever (Instagram / Facebook scrape
 *     once and never re-fetch unless the URL changes).
 *
 * Constraints (do not weaken):
 *   - Edge runtime: NO node:* modules, NO pg / drizzle / mollie SDKs.
 *   - No woff2 fonts from /public — edge can't read the FS. System fonts only,
 *     same as the existing OG routes.
 */

import { ImageResponse } from 'next/og'
import { findAlpacaName } from '@/lib/data/alpacas'

export const runtime = 'edge'

const MAX_LEN = 50

/**
 * Strip HTML, collapse newlines, trim, cap length. Mirrors the sanitiser in
 * `app/og/route.tsx`. The query value also passes through `findAlpacaName()`
 * for hard validation against the canonical roster, so this is belt-and-braces
 * for the fallback display path.
 */
function sanitise(raw: string | null): string {
  if (!raw) return ''
  return raw.replace(/<[^>]*>/g, '').replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_LEN)
}

export async function GET(request: Request): Promise<ImageResponse> {
  const url = new URL(request.url)
  const rawSlug = sanitise(url.searchParams.get('alpaca'))
  // Hard validate the slug against the roster. Unknown → null → generic card.
  const alpacaName = findAlpacaName(rawSlug || null)

  const headline = alpacaName
    ? `I adopted ${alpacaName}`
    : 'I support Alpacas Ibiza'
  const subline = alpacaName
    ? 'at Alpacas Ibiza · Es Currals'
    : 'Es Currals · Ibiza'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          // Cream background with subtle olive accent. Brand palette per task brief:
          // primary #556B2F (olive), cream #f5f5dc.
          background: 'linear-gradient(135deg, #f5f5dc 0%, #ecead0 50%, #d9d9a8 100%)',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Top-left brand strip */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 60,
            left: 60,
            fontSize: 22,
            color: '#556B2F',
            letterSpacing: 6,
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Alpacas Ibiza
        </div>

        {/* Alpaca name — the visual hero. Larger when there's a real name to
            announce; smaller-but-still-prominent for the generic fallback. */}
        {alpacaName ? (
          <div
            style={{
              display: 'flex',
              fontSize: 132,
              fontWeight: 700,
              color: '#556B2F',
              textAlign: 'center',
              lineHeight: 1,
              marginBottom: 28,
              maxWidth: 1000,
            }}
          >
            {alpacaName}
          </div>
        ) : (
          <div style={{ display: 'flex', fontSize: 96, marginBottom: 28 }}>🦙</div>
        )}

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            fontSize: 48,
            fontWeight: 600,
            color: '#2E2E2E',
            textAlign: 'center',
            lineHeight: 1.15,
            marginBottom: 16,
            maxWidth: 1000,
          }}
        >
          {headline}
        </div>

        {/* Subline */}
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            color: '#556B2F',
            textAlign: 'center',
          }}
        >
          {subline}
        </div>

        {/* Bottom-right URL */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 60,
            right: 60,
            fontSize: 22,
            color: '#556B2F',
            letterSpacing: 2,
            fontWeight: 600,
          }}
        >
          alpacasibiza.com
        </div>

        {/* Bottom-left llama for vibes */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 50,
            left: 60,
            fontSize: 56,
          }}
        >
          🦙
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // ImageResponse forwards `headers` to the Response. Deterministic per slug
      // → safe to cache aggressively at the edge + downstream social scrapers.
      headers: {
        'Cache-Control': 'public, immutable, max-age=31536000',
      },
    },
  )
}
