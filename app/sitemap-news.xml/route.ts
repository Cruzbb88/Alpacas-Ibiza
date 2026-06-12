/**
 * Google News sitemap — /sitemap-news.xml
 *
 * Protocol: https://support.google.com/news/publisher-center/answer/9606710
 * - Uses the News sitemap schema (xmlns:news)
 * - Articles must be < 2 days old to appear in Google News tab
 * - Older articles still beneficial for sitemap freshness / crawl signals
 * - Max 1000 URLs per Google News sitemap spec
 *
 * Failsafe: empty JOURNAL_POSTS → valid empty <urlset> (Google accepts this).
 * Malformed publishedAt → try/catch per post; bad entries are skipped.
 *
 * ISR: revalidate every 5 minutes for fresh post detection.
 */

import { NextResponse } from 'next/server'
import { JOURNAL_POSTS } from '@/lib/data/journal-posts'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alpacasibiza.com').replace(/\/$/, '')
const PUBLICATION_NAME = 'Alpacas Ibiza Journal'
const PUBLICATION_LANGUAGE = 'en'

// ── XML escape helper ─────────────────────────────────────────────────────────
// Replaces the 5 predefined XML entities. Applied to every interpolated string.
export function xmlEsc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const posts = [...JOURNAL_POSTS]
    .filter((p) => p.status === 'live')
    .sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )

  const items = posts
    .flatMap((post) => {
      try {
        const isoDate = new Date(post.publishedAt).toISOString() // throws on Invalid Date
        const url = `${SITE_URL}/${post.locale}/journal/${post.slug}`
        return [
          `
  <url>
    <loc>${xmlEsc(url)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEsc(PUBLICATION_NAME)}</news:name>
        <news:language>${xmlEsc(PUBLICATION_LANGUAGE)}</news:language>
      </news:publication>
      <news:publication_date>${xmlEsc(isoDate)}</news:publication_date>
      <news:title>${xmlEsc(post.title)}</news:title>
    </news:news>
  </url>`,
        ]
      } catch {
        // Skip posts with malformed publishedAt — keeps the sitemap valid
        console.warn(`[sitemap-news] skipping post "${post.slug}" — invalid publishedAt`)
        return []
      }
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
>${items}
</urlset>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600', // 5 min browser, 10 min CDN
    },
  })
}

// ISR-cached; revalidate every 5 minutes for fresh post detection.
export const revalidate = 300
