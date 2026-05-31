import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { shopCategoryItemListSchema, toJsonLd } from '@/lib/structured-data'
import { getOgImage } from '@/lib/og-images'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = await getTranslations()
  const ogImage = getOgImage('alpacas', 'Woven Alpaca Textiles – Wishfulfilling Weaving')
  return {
    title: tr('wovenPage.metaTitle'),
    description: tr('wovenPage.metaDescription'),
    alternates: buildLocaleAlternates(locale, 'shop/woven'),
    openGraph: {
      title: tr('wovenPage.metaTitle'),
      description: tr('wovenPage.metaDescription'),
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage.url],
    },
  }
}

export default async function WovenPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = await getTranslations()

  const priceOnRequest = translate('shop.priceOnRequest')
  // No ecommerce is wired — each product links to the commission enquiry form.
  const products = [
    {
      title: translate('wovenPage.scarf'),
      price: priceOnRequest,
      icon: '🧣',
      slug: 'woven-scarf',
    },
    {
      title: translate('wovenPage.blanket'),
      price: priceOnRequest,
      icon: '🛏️',
      slug: 'woven-blanket',
    },
    {
      title: translate('wovenPage.throw'),
      price: priceOnRequest,
      icon: '🎨',
      slug: 'woven-throw',
    },
    {
      title: translate('wovenPage.cushion'),
      price: priceOnRequest,
      icon: '🏠',
      slug: 'woven-cushion',
    },
    {
      title: translate('wovenPage.wallHanging'),
      price: priceOnRequest,
      icon: '🎭',
      slug: 'woven-wall-hanging',
    },
    {
      title: translate('wovenPage.poncho'),
      price: priceOnRequest,
      icon: '👚',
      slug: 'woven-poncho',
    },
  ]

  const baseUrl = `https://alpacasibiza.com/${locale}/shop/woven`
  const itemListSchema = shopCategoryItemListSchema({
    categoryName: 'Woven Collection',
    baseUrl,
    items: products.map((p) => ({ name: p.title, url: baseUrl })),
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
            {translate('wovenPage.title')}
          </h1>
          <p className="text-lg text-foreground/70">
            {translate('wovenPage.subtitle')}
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, idx) => (
              <div key={idx} className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow">
                <div className="bg-secondary/20 h-48 flex items-center justify-center text-6xl">
                  {product.icon}
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{product.title}</h3>
                  <p className="text-accent font-bold text-xl mb-4">{product.price}</p>
                  {/* No ecommerce wired — routes to commission enquiry form */}
                  <Link
                    href={`/${locale}/shop/commission?product=${product.slug}`}
                    className="block w-full px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-medium transition-colors text-center"
                  >
                    {translate('wovenPage.enquire')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
