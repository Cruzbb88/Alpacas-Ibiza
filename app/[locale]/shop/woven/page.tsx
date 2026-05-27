import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { shopCategoryItemListSchema, toJsonLd } from '@/lib/structured-data'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = t(locale)
  return {
    title: tr('wovenPage.title'),
    alternates: buildLocaleAlternates(locale, 'shop/woven'),
  }
}

export default async function WovenPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = t(locale)

  const products = [
    {
      title: translate('wovenPage.scarf'),
      price: '€45',
      icon: '🧣',
    },
    {
      title: translate('wovenPage.blanket'),
      price: '€180',
      icon: '🛏️',
    },
    {
      title: translate('wovenPage.throw'),
      price: '€95',
      icon: '🎨',
    },
    {
      title: translate('wovenPage.cushion'),
      price: '€65',
      icon: '🏠',
    },
    {
      title: translate('wovenPage.wallHanging'),
      price: '€150',
      icon: '🎭',
    },
    {
      title: translate('wovenPage.poncho'),
      price: '€120',
      icon: '👚',
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
                  <button className="w-full px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-medium transition-colors">
                    {translate('wovenPage.addToCart')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
