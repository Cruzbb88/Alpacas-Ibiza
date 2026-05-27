import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = t(locale)
  return {
    title: tr('alcacaPage.title'),
    alternates: buildLocaleAlternates(locale, 'shop/alcaca'),
  }
}

export default async function AlcacaPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = t(locale)

  const products = [
    {
      name: translate('alcacaPage.sample'),
      price: '€15',
      icon: '🌱',
    },
    {
      name: translate('alcacaPage.bulk'),
      price: '€45',
      icon: '📦',
    },
    {
      name: translate('alcacaPage.wholesale'),
      price: '€140',
      icon: '🌍',
    },
  ]

  return (
    <>
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
                <button className="w-full px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-medium transition-colors">
                  {translate('alcacaPage.orderNow')}
                </button>
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
