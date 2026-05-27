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
import { t } from '@/lib/translations'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { localBusinessSchema, toJsonLd } from '@/lib/structured-data'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { GradientPageHero, PageSection, OwnerConfirmBanner } from '@/components/layout'
import { JournalCard } from '@/components/journal-card'
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

export default async function JournalPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = t(locale)

  const schema = localBusinessSchema()
  const postsExist = hasLivePosts()
  const allPosts = livePosts()

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
      />

      {postsExist ? (
        <PageSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allPosts.map((post) => (
              <JournalCard key={post.slug} post={post} locale={locale} />
            ))}
          </div>
        </PageSection>
      ) : (
        /* ── Empty state — shown publicly until owner supplies posts ── */
        <PageSection>
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
