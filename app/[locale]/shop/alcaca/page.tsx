import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { shopCategoryItemListSchema, toJsonLd } from '@/lib/structured-data'
import { getOgImage } from '@/lib/og-images'

// Alcaca Oro Negro product photos — sourced from live-site scrape (2026-05-31).
// Owner can re-host these on the redesign CDN later; Squarespace URLs are publicly accessible for now.
const ALCACA_PHOTO_1 =
  'https://images.squarespace-cdn.com/content/v1/63f5dee81e8cfc3a0d2638e3/a2939e9d-3939-49d2-be00-c67bc1251d7f/alcaca2-scaled.jpg'
const ALCACA_PHOTO_2 =
  'https://images.squarespace-cdn.com/content/v1/63f5dee81e8cfc3a0d2638e3/8c00eff7-8898-43b4-bc8b-aa95073ccc79/alcaca-scaled-e1657007564818.jpg'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = t(locale)
  const ogImage = getOgImage('alpacas', 'Alcaca Oro Negro – Alpacas Ibiza')
  return {
    title: tr('alcacaPage.metaTitle', 'Alcaca Oro Negro | Alpaca Manure Fertilizer – Alpacas Ibiza'),
    description: tr(
      'alcacaPage.metaDescription',
      'Alcaca Oro Negro is natural alpaca-manure fertilizer from Es Currals, Ibiza. Called "black gold" in the Andes — odorless, ready-to-use, available from 125 g mini-bags to bulk orders.',
    ),
    alternates: buildLocaleAlternates(locale, 'shop/alcaca'),
    openGraph: {
      title: tr('alcacaPage.metaTitle', 'Alcaca Oro Negro | Alpaca Manure Fertilizer – Alpacas Ibiza'),
      description: tr(
        'alcacaPage.metaDescription',
        'Alcaca Oro Negro is natural alpaca-manure fertilizer from Es Currals, Ibiza. Called "black gold" in the Andes — odorless, ready-to-use, available from 125 g mini-bags to bulk orders.',
      ),
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage.url],
    },
  }
}

export default async function AlcacaPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = t(locale)

  const priceOnRequest = translate('shop.priceOnRequest', 'Contact for pricing')
  // TODO OWNER_INPUT_NEEDED: confirm current Alcaca Oro Negro prices for each size tier.
  // Scrape recorded size tiers (125 g → bulk) but no specific prices.
  // All tiers currently show price-on-request with mailto CTA.
  const products = [
    {
      name: translate('alcacaPage.miniTier'),
      price: priceOnRequest,
      icon: '🌱',
      slug: 'alcaca-sample',
    },
    {
      name: translate('alcacaPage.bagTier'),
      price: priceOnRequest,
      icon: '📦',
      slug: 'alcaca-bulk',
    },
    {
      name: translate('alcacaPage.bulkTier'),
      price: priceOnRequest,
      icon: '🌍',
      slug: 'alcaca-wholesale',
    },
  ]

  const baseUrl = `https://alpacasibiza.com/${locale}/shop/alcaca`
  const itemListSchema = shopCategoryItemListSchema({
    categoryName: 'Alcaca Oro Negro',
    baseUrl,
    items: products.map((p) => ({ name: p.name, url: baseUrl })),
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(itemListSchema) }}
      />

      {/* Hero */}
      <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {translate('alcacaPage.title')}
          </h1>
          <p className="text-lg text-foreground/70">
            {translate('alcacaPage.subtitle')}
          </p>
        </div>
      </section>

      {/* Product photos */}
      <section className="w-full py-10 px-4 bg-background">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border">
            <Image
              src={ALCACA_PHOTO_1}
              alt={translate('alcacaPage.photo1Alt', 'Alcaca Oro Negro — alpaca manure fertilizer bags')}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border">
            <Image
              src={ALCACA_PHOTO_2}
              alt={translate('alcacaPage.photo2Alt', 'Alcaca Oro Negro — close-up of the product')}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* Origin story */}
      <section className="w-full py-10 px-4 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {translate('alcacaPage.storyTitle')}
          </h2>
          <p className="text-foreground/70 leading-relaxed">
            {translate('alcacaPage.storyBody')}
          </p>
        </div>
      </section>

      {/* Tier cards + enquiry */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {products.map((product, idx) => (
              <div key={idx} className="bg-card rounded-lg border border-border p-8 text-center hover:border-accent transition-colors">
                <div className="text-5xl mb-4">{product.icon}</div>
                <h3 className="text-xl font-bold text-foreground mb-2">{product.name}</h3>
                <p className="text-accent font-bold text-2xl mb-6">{product.price}</p>
                {/* No ecommerce wired — routes to commission enquiry form */}
                <Link
                  href={`/${locale}/shop/commission?product=${product.slug}`}
                  className="block w-full px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-medium transition-colors text-center"
                >
                  {translate('alcacaPage.enquire', 'Enquire')}
                </Link>
              </div>
            ))}
          </div>

          {/* Benefits */}
          <div className="bg-card rounded-lg border border-border p-8 md:p-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {translate('alcacaPage.whyTitle')}
            </h2>
            <ul className="space-y-4 text-foreground/70">
              <li className="flex gap-3">
                <span className="text-accent">✓</span>
                <span>{translate('alcacaPage.benefit1')}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent">✓</span>
                <span>{translate('alcacaPage.benefit2')}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent">✓</span>
                <span>{translate('alcacaPage.benefit3')}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent">✓</span>
                <span>{translate('alcacaPage.benefit4')}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
