import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n.config'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { AwardsBadges } from '@/components/awards-badges'
import { getOgImage } from '@/lib/og-images'
import { personSchema, toJsonLd } from '@/lib/structured-data'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = await getTranslations()
  const ogImage = getOgImage('about', 'About Alpacas Ibiza – Es Currals Farm')
  return {
    title: tr('about.metaTitle'),
    description:
      "Meet the team and story behind Es Currals, Ibiza's first alpaca farm. Belgian founders Bart & San, the Wishfulfilling Weaving studio, and 14 alpacas.",
    alternates: buildLocaleAlternates(locale, 'about'),
    openGraph: {
      title: tr('about.metaTitle'),
      description:
        "Meet the team and story behind Es Currals, Ibiza's first alpaca farm.",
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage.url],
    },
  }
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = await getTranslations()

  // Founder Person JSON-LD
  // Names + roles verbatim from LIVE_SITE_CONTENT_INVENTORY.md §/wie-zijn-wij H4
  // and Step 4d ("Co-founder & owner"). Rule 5 — no invented values.
  const founderSchemas = [
    personSchema({
      name: 'San De Wilde',
      role: 'Co-founder & owner',
      worksForOrgName: 'Alpacas Ibiza',
    }),
    personSchema({
      name: 'Bart',
      role: 'Co-founder & owner',
      worksForOrgName: 'Alpacas Ibiza',
    }),
  ]

  return (
    <main>
      {/* Founder structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(founderSchemas) }}
      />
      <PageBreadcrumbs
        locale={locale}
        homeLabel={translate('nav.home') || 'Home'}
        crumbs={[{ name: translate('nav.about') || 'About', path: 'about' }]}
      />
      {/* Hero — farm photo self-hosted from the live site (heroes/about.jpg). */}
      <section className="relative w-full py-20 px-4 overflow-hidden min-h-[300px] flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/heroes/about.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {translate('about.title')}
          </h1>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-4xl mx-auto space-y-12">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {translate('about.storyTitle')}
            </h2>
            <p className="text-foreground/70 mb-4">
              {translate('about.storyText')}
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {translate('about.valuesTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: 'welfare', title: translate('about.welfare.title'), description: translate('about.welfare.description') },
                { key: 'sustainability', title: translate('about.sustainability.title'), description: translate('about.sustainability.description') },
                { key: 'quality', title: translate('about.quality.title'), description: translate('about.quality.description') },
                { key: 'community', title: translate('about.community.title'), description: translate('about.community.description') },
              ].map((value, idx) => (
                <div key={idx} className="bg-card rounded-lg border border-border p-6">
                  <h3 className="font-bold text-foreground mb-2">{value.title}</h3>
                  <p className="text-sm text-foreground/70">{value.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {translate('about.weavingTitle')}
            </h2>
            <p className="text-lg text-primary/80 mb-4 italic">
              {translate('about.weavingSubtitle')}
            </p>
            <p className="text-foreground/70 mb-4">
              {translate('about.weavingDescription')}
            </p>
          </div>
        </div>
      </section>
      {/* Awards & Recognition band — all categories, renders null until owner adds entries */}
      <AwardsBadges title={translate('awards.awardsAndRecognition')} />
    </main>
  )
}
