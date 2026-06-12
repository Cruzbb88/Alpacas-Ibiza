/**
 * Journal index page — /[locale]/journal
 *
 * Renders live posts from lib/data/journal.ts in a 3-column card grid,
 * newest-first. Fail-quiet: shows a "coming soon" empty state when no
 * posts are live. Owner activates by editing lib/data/journal.ts only —
 * no other file needed.
 *
 * Nav placement: NOT added to header.tsx. Owner decides after first posts land.
 */

import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { localBusinessSchema, toJsonLd } from '@/lib/structured-data'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { GradientPageHero, PageSection, OwnerConfirmBanner } from '@/components/layout'
import { JournalCard } from '@/components/journal-card'
import { NewsletterForm } from '@/components/newsletter-form'
import { livePosts, hasLivePosts } from '@/lib/data/journal'

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const tenant = await getTenant()
  const base = tenantMetadata(tenant, {
    locale,
    route: '/journal',
    titleOverride: 'Journal | Alpacas Ibiza — Es Currals Farm',
    descriptionOverride:
      'Stories from the farm — life with the alpaca herd, weaving rhythms, seasonal notes, and recipes from Es Currals Ibiza.',
  })
  return {
    ...base,
    alternates: {
      ...base.alternates,
      types: {
        'application/rss+xml': `${tenant.siteUrl}/journal/rss.xml`,
      },
    },
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function JournalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ q?: string }>
}) {
  const { locale } = await params
  const { q } = await searchParams
  const translate = await getTranslations()

  const schema = localBusinessSchema()
  const postsExist = hasLivePosts()
  const allPosts = livePosts()

  // ── ?q= filtering (server-side, for Google sitelinks search box) ─────────
  // q comes URL-decoded from Next; lowercased for case-insensitive match.
  // Never injected raw into HTML — only used for array filter + display label.
  const searchQuery = q?.trim() ?? ''
  const searchLower = searchQuery.toLowerCase()
  const filteredPosts = searchLower
    ? allPosts.filter((p) => {
        const haystack = `${p.title} ${p.body} ${p.excerpt} ${p.category} ${p.author ?? ''}`.toLowerCase()
        return haystack.includes(searchLower)
      })
    : allPosts

  return (
    <main>
      {/* JSON-LD: LocalBusiness */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
      />

      <PageBreadcrumbs
        locale={locale}
        homeLabel={translate('nav.home') || 'Home'}
        crumbs={[
          {
            name: translate('journal.title') || 'Journal',
            path: 'journal',
          },
        ]}
      />

      {/* Hero */}
      <GradientPageHero
        title={translate('journal.title') || 'Journal'}
        subtitle={
          translate('journal.subtitle') ||
          'Stories from the farm — life with the herd, weaving rhythms, seasonal notes.'
        }
        backgroundImage="/images/gallery/herd-chicas.jpg"
      />

      {postsExist ? (
        <PageSection>
          {/* ── Search result header ── */}
          {searchQuery && (
            <div className="mb-6">
              {filteredPosts.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Searched for: <span className="font-medium text-foreground">{searchQuery}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No results for{' '}
                  <span className="font-medium text-foreground">{searchQuery}</span> — showing all posts.
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(filteredPosts.length > 0 ? filteredPosts : allPosts).map((post) => (
              <JournalCard key={post.slug} post={post} locale={locale} />
            ))}
          </div>
        </PageSection>
      ) : (
        /* ── Empty state — shown publicly until owner supplies posts ── */
        <PageSection>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mb-4">
              No results for{' '}
              <span className="font-medium text-foreground">{searchQuery}</span>.
            </p>
          )}
          <div className="py-16 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {translate('journal.emptyTitle') || 'Stories coming soon'}
            </h2>
            <p className="text-foreground/70 max-w-md mx-auto mb-6">
              {translate('journal.emptyBody') ||
                'Follow us on Instagram for updates while we get the journal ready.'}
            </p>
            <a
              href={translate('journal.emptyCtaHref') || '/contact'}
              className="inline-block text-primary font-medium hover:underline"
            >
              {translate('journal.emptyCtaLabel') || 'Get in touch →'}
            </a>
          </div>
        </PageSection>
      )}

      {/* Newsletter cross-sell — journal readers are warm subscribe leads.
          Mirrors the homepage section; same keys, same client form (double opt-in). */}
      <section className="w-full py-12 md:py-16 px-4 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {translate('newsletter.title')}
            </h2>
            <p className="text-sm text-foreground/70">
              {translate('newsletter.subtitle')}
            </p>
          </div>
          <NewsletterForm locale={locale} source="journal" />
        </div>
      </section>

      {/* Owner-confirm banner — dev/staging only, hidden in production */}
      <OwnerConfirmBanner
        heading={translate('journal.ownerConfirmHeader') || 'Owner: add posts to activate'}
        body={
          translate('journal.ownerConfirmBody') ||
          "Add entries to lib/data/journal.ts with status: 'live'. Drop hero images at public/images/journal/<slug>.webp. Empty state shows publicly until then."
        }
        variant="banner"
      />
    </main>
  )
}
