/**
 * Per-post journal page — /[locale]/journal/[slug]
 *
 * Renders a single live post from lib/data/journal.ts.
 * Returns notFound() for drafts, archived posts, and unknown slugs.
 *
 * Body format:
 *   - Lines starting with "## " → <h2> with slugified id + hover anchor
 *   - Lines starting with "### " → <h3> with slugified id + hover anchor
 *   - Remaining text separated by double-newlines → <p> paragraphs
 *
 * No external markdown parser — inline regex only.
 */

import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { t } from '@/lib/translations'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { breadcrumbSchema, toJsonLd } from '@/lib/structured-data'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { findPost, livePosts } from '@/lib/data/journal'
import { ReadingProgress } from '@/components/reading-progress'
import { ShareButtons } from '@/components/share-buttons'
import { JournalToc, type TocItem } from '@/components/journal-toc'
import { JournalCard } from '@/components/journal-card'

const BASE_URL = 'https://alpacasibiza.com'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert heading text to a URL-safe id: lowercase, hyphens, no punctuation. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
}

type BodyBlock =
  | { type: 'h2'; id: string; text: string }
  | { type: 'h3'; id: string; text: string }
  | { type: 'p'; text: string }

/** Parse the body string into typed blocks. */
function parseBody(body: string): { blocks: BodyBlock[]; tocItems: TocItem[] } {
  const blocks: BodyBlock[] = []
  const tocItems: TocItem[] = []

  const chunks = body.split(/\n\n+/).map((c) => c.trim()).filter(Boolean)

  for (const chunk of chunks) {
    if (chunk.startsWith('### ')) {
      const text = chunk.slice(4).trim()
      const id = slugify(text)
      blocks.push({ type: 'h3', id, text })
      tocItems.push({ id, text, level: 3 })
    } else if (chunk.startsWith('## ')) {
      const text = chunk.slice(3).trim()
      const id = slugify(text)
      blocks.push({ type: 'h2', id, text })
      tocItems.push({ id, text, level: 2 })
    } else {
      blocks.push({ type: 'p', text: chunk })
    }
  }

  return { blocks, tocItems }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const post = findPost(slug)
  if (!post) return {}

  const tenant = await getTenant()
  return tenantMetadata(tenant, {
    locale,
    route: `/journal/${slug}`,
    titleOverride: `${post.title} | Alpacas Ibiza Journal`,
    descriptionOverride: post.excerpt,
    openGraphType: 'article',
    articleMeta: {
      publishedTime: post.date,
      modifiedTime: undefined,
      authors: post.author ? [post.author] : undefined,
      tags: [post.category],
    },
  })
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function JournalPostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const translate = t(locale)

  const post = findPost(slug)
  if (!post) notFound()

  const tenant = await getTenant()
  const absoluteUrl = `${tenant.siteUrl}/${locale}/journal/${post.slug}`

  // Related posts — same category, excluding current, max 3
  const related = livePosts(post.category).filter((p) => p.slug !== post.slug).slice(0, 3)

  // Article JSON-LD
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: post.author
      ? { '@type': 'Person', name: post.author }
      : { '@type': 'Organization', name: 'Alpacas Ibiza' },
    // Note: role/url omitted — author is a plain string in lib/data/journal.ts (Rule 5: no invented data)
    publisher: {
      '@type': 'Organization',
      name: 'Alpacas Ibiza',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/images/logo.webp` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/${locale}/journal/${post.slug}` },
    ...(post.heroImage ? { image: `${BASE_URL}${post.heroImage}` } : {}),
  }

  const categoryLabel = post.category.replace(/-/g, ' ')
  const dateLabel = new Date(post.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const { blocks, tocItems } = parseBody(post.body)

  return (
    <main>
      <ReadingProgress />

      {/* JSON-LD: Article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(articleSchema) }}
      />

      {/* JSON-LD: Breadcrumb */}
      <PageBreadcrumbs
        locale={locale}
        homeLabel={translate('nav.home') || 'Home'}
        crumbs={[
          { name: translate('journal.title') || 'Journal', path: 'journal' },
          { name: post.title, path: `journal/${post.slug}` },
        ]}
      />

      {/* Hero image or gradient fallback */}
      {post.heroImage ? (
        <div className="relative w-full aspect-[16/6] overflow-hidden bg-muted">
          <Image
            src={post.heroImage}
            alt={post.heroAlt ?? post.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/60" />
        </div>
      ) : (
        <div className="w-full py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
      )}

      {/* Article content */}
      <div className="max-w-2xl mx-auto px-4 py-12 lg:max-w-2xl">
        {/* Meta */}
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
          {categoryLabel} · {dateLabel}
          {post.readingMinutes != null && ` · ${post.readingMinutes} min read`}
          {post.author && ` · by ${post.author}`}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-6">
          {post.title}
        </h1>

        {/* Excerpt lead */}
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed font-medium">
          {post.excerpt}
        </p>

        {/* TOC — mobile: inline collapsible; desktop: fixed sidebar via component */}
        <JournalToc items={tocItems} />

        {/* Body blocks */}
        <div className="prose prose-neutral max-w-none space-y-5">
          {blocks.map((block, i) => {
            if (block.type === 'h2') {
              return (
                <h2
                  key={i}
                  id={block.id}
                  className="group text-xl font-semibold text-foreground mt-8 mb-3 scroll-mt-24"
                >
                  {block.text}
                  <a
                    href={`#${block.id}`}
                    aria-label={`Link to ${block.text}`}
                    className="ml-2 text-muted-foreground/50 text-base font-normal opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    #
                  </a>
                </h2>
              )
            }
            if (block.type === 'h3') {
              return (
                <h3
                  key={i}
                  id={block.id}
                  className="group text-lg font-semibold text-foreground mt-6 mb-2 scroll-mt-24"
                >
                  {block.text}
                  <a
                    href={`#${block.id}`}
                    aria-label={`Link to ${block.text}`}
                    className="ml-2 text-muted-foreground/50 text-sm font-normal opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    #
                  </a>
                </h3>
              )
            }
            return (
              <p key={i} className="text-foreground/85 leading-relaxed">
                {block.text}
              </p>
            )
          })}
        </div>

        {/* Share buttons */}
        <div className="mt-10 pt-8 border-t border-border">
          <ShareButtons
            url={absoluteUrl}
            title={post.title}
            excerpt={post.excerpt}
            labels={{
              share: translate('share.label') || 'Share',
              copyLink: translate('share.copyLink') || 'Copy link',
              copied: translate('share.copied') || 'Copied!',
              whatsapp: translate('share.whatsapp') || 'Share on WhatsApp',
              twitter: translate('share.twitter') || 'Share on X',
              facebook: translate('share.facebook') || 'Share on Facebook',
            }}
          />
        </div>

        {/* Back link */}
        <div className="mt-6 pt-6 border-t border-border">
          <Link
            href={`/${locale}/journal`}
            className="text-primary font-medium hover:underline text-sm"
          >
            ← {translate('journal.backToJournal') || 'Back to Journal'}
          </Link>
        </div>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="border-t border-border py-12 mt-4">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6 text-foreground">
              {translate('journal.relatedTitle') || 'More from'}{' '}
              <span className="capitalize">{post.category.replace(/-/g, ' ')}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p) => (
                <JournalCard key={p.slug} post={p} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      )}

    </main>
  )
}
