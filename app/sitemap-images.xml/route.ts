/**
 * Google image sitemap — /sitemap-images.xml
 *
 * Follows the Google Image Sitemap extension spec:
 *   https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 *
 * Strategy:
 *  - Mirrors the canonical page list from app/sitemap.ts (one entry per locale × route).
 *  - For journal posts with a heroImage, attaches an <image:image> block.
 *  - For every /{locale} homepage, references the Edge-generated global OG image.
 *  - Per-post OG images (Edge-generated) are included for all live journal posts.
 *  - Pages with no known image are still emitted without <image:image> children —
 *    useful for completeness and future-proofing when images land.
 *
 * Failsafes:
 *  - Empty posts array → only static pages emitted (no journal image blocks).
 *  - XML-escapes every interpolated string via xmlEsc().
 *  - Returns application/xml; on any unexpected error falls back to an empty
 *    but well-formed document rather than crashing the server.
 */

import { i18nConfig } from '@/i18n.config'
import { SITE_BASE_URL } from '@/lib/config'
import { livePosts } from '@/lib/data/journal'

// ── Next.js route config ───────────────────────────────────────────────────────

export const dynamic = 'force-static'
export const revalidate = 86400 // 24 h

// ── Static routes (mirrored from app/sitemap.ts) ──────────────────────────────

const STATIC_ROUTES = [
    '',           // homepage
    '/tours',
    '/about',
    '/contact',
    '/shop',
    '/shop/woven',
    '/shop/commission',
    '/shop/alcaca',
    '/experiences/corporate-team-building',
    '/experiences/romantic-sunset',
    '/experiences/family-farm-days',
    '/weddings',
    '/workshops',
    '/gifts',
    '/yoga',
    '/press',
    '/media',
    '/journal',
    '/privacy',
    '/terms',
    '/cookies',
]

// ── XML helpers ────────────────────────────────────────────────────────────────

/** XML-escape a string so interpolated values cannot break the document. */
function xmlEsc(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function imageBlock(loc: string, title?: string): string {
    const titleLine = title
        ? `\n      <image:title>${xmlEsc(title)}</image:title>`
        : ''
    return `    <image:image>\n      <image:loc>${xmlEsc(loc)}</image:loc>${titleLine}\n    </image:image>`
}

function urlEntry(loc: string, images: string[]): string {
    const imageXml = images.length > 0 ? '\n' + images.join('\n') + '\n' : ''
    return `  <url>\n    <loc>${xmlEsc(loc)}</loc>${imageXml}  </url>`
}

// ── GET handler ────────────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
    try {
        const entries: string[] = []

        for (const locale of i18nConfig.locales) {
            // Static routes
            for (const route of STATIC_ROUTES) {
                const pageLoc = `${SITE_BASE_URL}/${locale}${route}`
                const images: string[] = []

                if (route === '') {
                    // Homepage — reference the global OG image (Edge-generated, always present)
                    images.push(
                        imageBlock(
                            `${SITE_BASE_URL}/${locale}/opengraph-image`,
                            'Alpacas Ibiza — The very first alpaca farm on Ibiza',
                        )
                    )
                }

                entries.push(urlEntry(pageLoc, images))
            }

            // Live journal posts
            for (const post of livePosts()) {
                const pageLoc = `${SITE_BASE_URL}/${locale}/journal/${post.slug}`
                const images: string[] = []

                // Owner-provided hero image (may be null until uploaded)
                if (post.heroImage) {
                    const absImage = post.heroImage.startsWith('http')
                        ? post.heroImage
                        : `${SITE_BASE_URL}${post.heroImage}`
                    images.push(imageBlock(absImage, post.heroAlt ?? post.title))
                }

                // Edge-generated per-post OG image (always available once route exists)
                images.push(
                    imageBlock(
                        `${SITE_BASE_URL}/${locale}/journal/${post.slug}/opengraph-image`,
                        post.title,
                    )
                )

                entries.push(urlEntry(pageLoc, images))
            }
        }

        const xml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset',
            '  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
            '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
            ...entries,
            '</urlset>',
        ].join('\n')

        return new Response(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
        })
    } catch {
        // Failsafe: return a well-formed empty document rather than crashing.
        const empty = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
            '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
            '</urlset>',
        ].join('\n')
        return new Response(empty, {
            status: 200,
            headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        })
    }
}
