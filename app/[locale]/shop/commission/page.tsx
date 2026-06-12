import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'
import { CommissionForm } from '@/components/commission-form'
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
  const ogImage = getOgImage('alpacas', 'Commission a Custom Woven Piece – Alpacas Ibiza')
  return {
    title: tr('commissionPage.metaTitle'),
    description: tr('commissionPage.metaDescription'),
    alternates: buildLocaleAlternates(locale, 'shop/commission'),
    openGraph: {
      title: tr('commissionPage.metaTitle'),
      description: tr('commissionPage.metaDescription'),
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage.url],
    },
  }
}

export default async function CommissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ product?: string }>
}) {
  const { locale } = await params
  const { product } = await searchParams
  const translate = await getTranslations()

  const formLabels = {
    name: translate('commissionPage.name'),
    email: translate('commissionPage.email'),
    description: translate('commissionPage.description'),
    submit: translate('commissionPage.submit'),
    sending: translate('commissionPage.sending') || 'Sending…',
    success: translate('commissionPage.successMessage') || "Thank you! We'll review your commission and be in touch soon.",
    error: translate('commissionPage.errorMessage') || 'Something went wrong. Please try again.',
  }

  const baseUrl = `https://alpacasibiza.com/${locale}/shop/commission`
  const itemListSchema = shopCategoryItemListSchema({
    categoryName: 'Custom Commissions',
    baseUrl,
    items: [],
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(itemListSchema) }}
      />
      <section className="relative w-full py-20 px-4 overflow-hidden min-h-[300px] flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/gallery/weaving-15.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {translate('commissionPage.title')}
          </h1>
          <p className="text-lg text-white/85 mb-8">
            {translate('commissionPage.subtitle')}
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-lg border border-border p-8 md:p-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {translate('commissionPage.formTitle')}
            </h2>
            <CommissionForm labels={formLabels} locale={locale} defaultProductInterest={product} />
          </div>
        </div>
      </section>
    </>
  )
}

