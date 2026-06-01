import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { getOgImage } from '@/lib/og-images'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = await getTranslations()
  const ogImage = getOgImage('alpacas', 'Alpacas Ibiza Farm Shop – Woven Textiles & Alcaca')
  return {
    title: tr('shop.metaTitle'),
    description: tr('shop.metaDescription'),
    alternates: buildLocaleAlternates(locale, 'shop'),
    openGraph: {
      title: tr('shop.metaTitle'),
      description: tr('shop.metaDescription'),
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage.url],
    },
  }
}

export default async function ShopPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = await getTranslations()

  const shopCategories = [
    {
      title: translate('shop.woven.title'),
      description: translate('shop.woven.description'),
      icon: '🧣',
      href: `/${locale}/shop/woven`,
    },
    {
      title: translate('shop.commission.title'),
      description: translate('shop.commission.description'),
      icon: '✨',
      href: `/${locale}/shop/commission`,
    },
    {
      title: translate('shop.manure.title'),
      description: translate('shop.manure.description'),
      icon: '🌿',
      href: `/${locale}/shop/alcaca`,
    },
    {
      // Skein sponsorship — niche craft product; card in shop but no main nav entry.
      title: 'Name your skein',
      description: 'Sponsor an alpaca\'s spring shearing — receive their spun wool in autumn. €200 · 14 slots/year.',
      icon: '🧶',
      href: `/${locale}/skein`,
    },
  ]

  return (
    <>
      <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {translate('shop.title')}
          </h1>
          <p className="text-lg text-foreground/70">
            {translate('shop.subtitle')}
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {shopCategories.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                className="group bg-card rounded-lg border border-border p-8 hover:border-accent hover:shadow-lg transition-all duration-300"
              >
                <div className="text-5xl mb-4">{category.icon}</div>
                <h2 className="text-2xl font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
                  {category.title}
                </h2>
                <p className="text-foreground/70">{category.description}</p>
                <div className="mt-6 inline-flex items-center text-accent font-medium">
                  {translate('footer.explore')}
                  {' →'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
