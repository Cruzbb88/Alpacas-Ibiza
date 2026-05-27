/**
 * Per-post OG image — /[locale]/journal/[slug]/opengraph-image
 *
 * Next.js Metadata Route (Edge runtime) that generates a 1200×630 PNG for each
 * journal post. Picked up automatically by Next.js as the opengraph-image for
 * that route — no explicit metadata.openGraph.images entry required.
 *
 * Design:
 *   - BRAND_PRIMARY_HEX background / BRAND_SECONDARY_HEX text (mirrors global OG)
 *   - Post title at 60px, "Alpacas Ibiza · Journal" subhead at 24px
 *   - Falls back to the global OG render if the slug is unknown
 *
 * Failsafe:
 *   - If findPost() returns null → renders generic branded image (no 404).
 *   - If ImageResponse itself throws → Next.js edge runtime surfaces a 500;
 *     the page itself is unaffected (OG is separate from the page route).
 */

import { ImageResponse } from 'next/og'
import { BRAND_PRIMARY_HEX, BRAND_SECONDARY_HEX } from '@/lib/brand'
import { findPost } from '@/lib/data/journal'

// ── Next.js metadata route config ─────────────────────────────────────────────

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Static alt — per Next.js metadata route convention, alt must be a string export.
export const alt = 'Alpacas Ibiza Journal post preview image'

// ── Image generator ────────────────────────────────────────────────────────────

export default async function JournalPostOGImage({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>
}) {
    const { slug } = await params
    const post = findPost(slug)

    const title = post?.title ?? 'Alpacas Ibiza'
    const subhead = post ? 'Alpacas Ibiza · Journal' : 'The very first alpaca farm on Ibiza'

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: BRAND_PRIMARY_HEX,
                    color: BRAND_SECONDARY_HEX,
                    fontFamily: 'system-ui, sans-serif',
                    padding: '64px',
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        fontSize: '60px',
                        fontWeight: 700,
                        lineHeight: 1.15,
                        marginBottom: '28px',
                        maxWidth: '1000px',
                    }}
                >
                    {title}
                </div>
                <div
                    style={{
                        fontSize: '24px',
                        fontWeight: 400,
                        opacity: 0.85,
                    }}
                >
                    {subhead}
                </div>
            </div>
        ),
        { ...size }
    )
}
