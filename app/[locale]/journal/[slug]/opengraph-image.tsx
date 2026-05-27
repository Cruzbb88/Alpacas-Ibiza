/**
 * Per-post OG image — /[locale]/journal/[slug]/opengraph-image
 *
 * Next.js Metadata Route (Edge runtime) that generates a 1200×630 PNG for each
 * journal post. Picked up automatically by Next.js as the opengraph-image for
 * that route — no explicit metadata.openGraph.images entry required.
 *
 * Design:
 *   - Dark-olive #556B2F background / cream #F5F5DC text (matches favicon + brand)
 *   - Brand "A" monogram block top-left + "Alpacas Ibiza · Journal" label
 *   - Post title at 72px (56px for titles > 70 chars)
 *   - Footer: author · reading time · date
 *
 * Failsafe:
 *   - If findPost() returns null → renders generic branded image (no 404/500).
 *   - All assets are inline divs — no external fetch, no font load.
 *
 * Edge runtime — no Node APIs (no process, no fs).
 */

import { ImageResponse } from 'next/og'
import { findPost } from '@/lib/data/journal'

// ── Next.js metadata route config ─────────────────────────────────────────────

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Static alt — per Next.js metadata route convention, alt must be a string export.
export const alt = 'Es Currals Alpacas Ibiza — journal post'

// ── Image generator ────────────────────────────────────────────────────────────

export default async function PostOgImage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { slug } = await params
  const post = findPost(slug)

  const title = post?.title ?? 'Alpacas Ibiza — Journal'
  const author = post?.author ?? 'Es Currals team'
  const minutes = post?.readingMinutes ?? null
  const date = post
    ? new Date(post.date).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  return new ImageResponse(
    (
      <div
        style={{
          background: '#556B2F',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          color: '#F5F5DC',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top brand block */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, opacity: 0.85 }}>
          <div
            style={{
              background: '#F5F5DC',
              color: '#556B2F',
              fontWeight: 700,
              width: 56,
              height: 56,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 20,
              fontSize: 36,
            }}
          >
            A
          </div>
          <span>Alpacas Ibiza · Journal</span>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1
            style={{
              fontSize: title.length > 70 ? 56 : 72,
              fontWeight: 800,
              lineHeight: 1.05,
              margin: 0,
              maxWidth: 1000,
            }}
          >
            {title}
          </h1>
        </div>

        {/* Footer meta */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, opacity: 0.8 }}>
          <span>{author}</span>
          {minutes != null && <span style={{ margin: '0 16px' }}>·</span>}
          {minutes != null && <span>{minutes} min read</span>}
          {date && <span style={{ margin: '0 16px' }}>·</span>}
          {date && <span>{date}</span>}
        </div>
      </div>
    ),
    { ...size },
  )
}
