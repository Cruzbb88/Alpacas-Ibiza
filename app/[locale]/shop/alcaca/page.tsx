import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { shopCategoryItemListSchema, toJsonLd } from '@/lib/structured-data'
import { getOgImage } from '@/lib/og-images'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = t(locale)
  const ogImage = getOgImage('alpacas', 'Alcaca Alpaca Fertilizer – Alpacas Ibiza')
  return {
    title: tr('alcacaPage.metaTitle', 'Alcaca Organic Fertilizer | Alpaca Manure – Alpacas Ibiza'),
    description: tr(
      'alcacaPage.metaDescription',
      'Alcaca is premium organic alpaca-manure fertilizer from Es Currals, Ibiza. Nutrient-rich, chemical-free, and sustainably produced — available in sample, bulk, and wholesale packs.',
    ),
    alternates: buildLocaleAlternates(locale, 'shop/alcaca'),
    openGraph: {
      title: tr('alcacaPage.metaTitle', 'Alcaca Organic Fertilizer | Alpaca Manure – Alpacas Ibiza'),
      description: tr(
        'alcacaPage.metaDescription',
        'Alcaca is premium organic alpaca-manure fertilizer from Es Currals, Ibiza. Nutrient-rich, chemical-free, and sustainably produced — available in sample, bulk, and wholesale packs.',
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
  // No ecommerce is wired — each product links to the commission enquiry form.
  const products = [
    {
      name: translate('alcacaPage.sample'),
      price: priceOnRequest,
      icon: '🌱',
      slug: 'alcaca-sample',
    },
    {
      name: translate('alcacaPage.bulk'),
      price: priceOnRequest,
      icon: '📦',
      slug: 'alcaca-bulk',
    },
    {
      name: translate('alcacaPage.wholesale'),
      price: priceOnRequest,
      icon: '🌍',
      slug: 'alcaca-wholesale',
    },
  ]

  const baseUrl = `https://alpacasibiza.com/${locale}/shop/alcaca`
  const itemListSchema = shopCategoryItemListSchema({
    categoryName: 'Alcaca',
    baseUrl,
    items: products.map((p) => ({ name: p.name, url: baseUrl })),
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(itemListSchema) }}
      />
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
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
