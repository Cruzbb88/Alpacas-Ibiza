/**
 * RSS 2.0 feed — /journal/rss.xml
 *
 * Locale-agnostic URL; canonical post links use /en/journal/<slug>.
 * Built with plain string templating — no rss package needed.
 * ISR: revalidated every hour via force-static + Cache-Control header.
 *
 * Failsafe: if JOURNAL_POSTS is empty the feed is valid XML with zero <item>
 * elements. Never returns invalid XML.
 */

import { getDefaultTenant } from '@/lib/tenants/server'
import { listJournalPostsNewest } from '@/lib/data/journal-posts'

export const dynamic = 'force-static'

// ── XML escape helper ─────────────────────────────────────────────────────────
// Replaces the 5 predefined XML entities. Applied to every interpolated string.
// Keeps the resulting document well-formed even if post titles/excerpts contain
// raw ampersands, angle brackets, or quotes.
function xmlEsc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ── RFC 822 date helper ───────────────────────────────────────────────────────
// toUTCString() produces RFC 7231 format which is compatible with RSS pubDate.
function toRfc822(isoDate: string): string {
  return new Date(isoDate).toUTCString()
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  const tenant = getDefaultTenant()
  const posts = listJournalPostsNewest()

  const siteUrl = tenant.siteUrl   // e.g. https://alpacasibiza.com
  const feedUrl = `${siteUrl}/journal/rss.xml`
  const channelLink = `${siteUrl}/en/journal`
  const contactEmail = tenant.contactEmail  // info@alpacasibiza.com
  const brandName = xmlEsc(tenant.brandName)

  const lastBuildDate =
    posts.length > 0
      ? toRfc822(posts[0].publishedAt)  // newest post sets the build date
      : new Date().toUTCString()

  const items = posts
    .map((post) => {
      const postUrl = `${siteUrl}/en/journal/${post.slug}`
      const authorField = `${xmlEsc(contactEmail)} (${xmlEsc(post.author.name)})`
      return `
    <item>
      <title>${xmlEsc(post.title)}</title>
      <link>${xmlEsc(postUrl)}</link>
      <guid isPermaLink="true">${xmlEsc(postUrl)}</guid>
      <pubDate>${toRfc822(post.publishedAt)}</pubDate>
      <description><![CDATA[${post.excerpt}]]></description>
      <author>${authorField}</author>
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${brandName} Journal</title>
    <link>${xmlEsc(channelLink)}</link>
    <description>${xmlEsc(`Stories from Es Currals — life with the alpaca herd, weaving rhythms, and seasonal notes from ${tenant.brandName}.`)}</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link rel="self" type="application/rss+xml" href="${xmlEsc(feedUrl)}" />
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600',
    },
  })
}
