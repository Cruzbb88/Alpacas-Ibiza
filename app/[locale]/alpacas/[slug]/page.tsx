import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AlpacaDetailHero } from '@/components/alpaca-detail-hero'
import { AlpacaPeerGrid } from '@/components/alpacas/alpaca-peer-grid'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { PageSection } from '@/components/layout'
import { t } from '@/lib/translations'
import { toJsonLd } from '@/lib/structured-data'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { getTenant } from '@/lib/tenants/server'
import { getProviders } from '@/lib/integrations'
import { getOgImage } from '@/lib/og-images'
import { SITE_BASE_URL } from '@/lib/config'
import type { Locale } from '@/i18n.config'
import { i18nConfig } from '@/i18n.config'

/**
 * /[locale]/alpacas/[slug] — individual alpaca detail page.
 *
 * Server-rendered for every alpaca in the canonical roster (generateStaticParams).
 * Unknown slugs 404 via Next's notFound(). Content provider resolves the alpaca
 * by id from lib/tenants/<tenant>-content.ts; null fields show UNMAPPED
 * sentinel copy (PRACTICES Rule 5: never invent data).
 *
 * Adopt CTA threads ?alpaca=<slug> into the adopt page, pre-selecting the
 * picker. Picker → URL → checkout route → Stripe/Mollie metadata → webhook
 * → welcome email mentions the donor's adopted alpaca by name.
 *
 * Schema.org: emits an Animal/AboutPage JSON-LD entry tied to the LocalBusiness.
 */

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>
}

export async function generateStaticParams(): Promise<Array<{ locale: string; slug: string }>> {
  const tenant = await getTenant()
  const providers = getProviders(tenant)
  const animals = providers.content.listAnimals()
  return i18nConfig.locales.flatMap((locale) =>
    animals.map((a) => ({ locale, slug: a.id })),
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const tenant = await getTenant()
  const providers = getProviders(tenant)
  const animal = providers.content.listAnimals().find((a) => a.id === slug)
  if (!animal) {
    return { title: 'Alpaca not found' }
  }
  const translate = t(locale)
  // Templates with {name} placeholder so each locale controls word order.
  // Fallback strings are English defaults; non-EN locales should override
  // alpacas.detailTitle / .detailDescriptionWithPersonality / .detailDescription
  // in translations/<locale>.json to avoid English SEO meta on those pages.
  const titleTemplate = translate('alpacas.detailTitle', 'Meet {name} | Alpacas Ibiza')
  const descTemplate = animal.personality != null
    ? translate(
        'alpacas.detailDescriptionWithPersonality',
        '{name} — {personality}. Adopt {name} or visit the herd at Es Currals, Ibiza.',
      )
    : translate(
        'alpacas.detailDescription',
        'Meet {name}, part of the Es Currals herd. Adopt {name} or visit the farm in Ibiza.',
      )
  const interpolate = (tmpl: string): string =>
    tmpl
      .replaceAll('{name}', animal.name)
      .replaceAll('{personality}', animal.personality ?? '')
  const title = interpolate(titleTemplate)
  const description = interpolate(descTemplate)
  const ogImage = getOgImage('alpacas', title)
  const base = tenantMetadata(tenant, {
    locale,
    route: `/alpacas/${slug}`,
    titleOverride: title,
    descriptionOverride: description,
  })
  return {
    ...base,
    openGraph: { ...base.openGraph, images: [ogImage] },
    twitter: { ...base.twitter, images: [ogImage.url] },
  }
}

export default async function AlpacaDetailPage({ params }: PageProps) {
  const { locale, slug } = await params
  const translate = t(locale)

  const tenant = await getTenant()
  const providers = getProviders(tenant)
  const animals = providers.content.listAnimals()
  const animal = animals.find((a) => a.id === slug)
  if (!animal) notFound()

  const hasImage = animal.image != null

  // Schema.org — AboutPage with a Thing main entity (Animal is non-standard;
  // Thing is the safest concrete type Google's Rich Results validator accepts).
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `${animal.name} — Alpacas Ibiza`,
    url: `${SITE_BASE_URL}/${locale}/alpacas/${animal.id}`,
    mainEntity: {
      '@type': 'Thing',
      name: animal.name,
      ...(animal.personality ? { description: animal.personality } : {}),
      ...(hasImage ? { image: animal.image } : {}),
    },
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
      />

      <PageBreadcrumbs
        locale={locale}
        homeLabel={translate('nav.home') || 'Home'}
        crumbs={[
          { name: translate('nav.alpacas') || 'Our Alpacas', path: 'alpacas' },
          { name: animal.name, path: `alpacas/${animal.id}` },
        ]}
      />

      <PageSection bg="default" width="wide" className="py-12">
        <AlpacaDetailHero locale={locale} animal={animal} />
      </PageSection>

      {/* Rest of the herd — small thumbnail grid */}
      <PageSection bg="muted" width="wide" className="py-12 border-t border-border">
        <AlpacaPeerGrid locale={locale} animals={animals} currentSlug={animal.id} />
      </PageSection>
    </main>
  )
}
