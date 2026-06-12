import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { shopCategoryItemListSchema, productSchema, toJsonLd } from '@/lib/structured-data'
import { getOgImage } from '@/lib/og-images'

// Alcaca Oro Negro product photos — sourced from live-site scrape (2026-05-31).
// Self-hosted from the live site (2026-06-06) so they survive the old
// Squarespace site being taken down.
const ALCACA_PHOTO_1 = '/images/shop/alcaca-1.jpg'
const ALCACA_PHOTO_2 = '/images/shop/alcaca-2.jpg'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = await getTranslations()
  const ogImage = getOgImage('alpacas', 'Alcaca Oro Negro – Alpacas Ibiza')
  return {
    title: tr('alcacaPage.metaTitle'),
    description: tr('alcacaPage.metaDescription'),
    alternates: buildLocaleAlternates(locale, 'shop/alcaca'),
    openGraph: {
      title: tr('alcacaPage.metaTitle'),
      description: tr('alcacaPage.metaDescription'),
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
  const translate = await getTranslations()

  const priceOnRequest = translate('shop.priceOnRequest')
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

  // Build #5 — single-product Product schema for Alcaca Oro Negro.
  // Price UNMAPPED (price-on-request); 0 used as placeholder per Rule 5 until owner
  // supplies confirmed price. Schema omits url when price is 0 to avoid misleading signals.
  const alcacaProductSchema = productSchema({
    name: 'Alcaca Oro Negro — Alpaca Manure Compost',
    description: translate('alcacaPage.storyBody') || 'Premium slow-release organic fertiliser from Es Currals alpaca herd. Available in mini, bag and bulk tiers.',
    image: ALCACA_PHOTO_1,
    priceEur: 0,     // OWNER_INPUT_NEEDED: replace 0 with confirmed price per unit
    url: baseUrl,
    availability: 'InStock',
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(itemListSchema) }}
      />
      {/* Build #5 — single-product JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(alcacaProductSchema) }}
      />

      {/* Hero */}
      <section className="relative w-full overflow-hidden min-h-[300px] flex items-center py-20 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/gallery/farm-02.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {translate('alcacaPage.title')}
          </h1>
          <p className="text-lg text-white/85">
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
              alt={translate('alcacaPage.photo1Alt')}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border">
            <Image
              src={ALCACA_PHOTO_2}
              alt={translate('alcacaPage.photo2Alt')}
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
                  {translate('alcacaPage.enquire')}
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
