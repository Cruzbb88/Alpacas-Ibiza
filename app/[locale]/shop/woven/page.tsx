/**
 * Shop — Woven Collection (`/shop/woven`)
 *
 * UNMAPPED: the individual woven products are placeholders. The official site
 * (Wishfulfilling Weaving) sells handwoven alpaca textiles made to order, but
 * its product names / photos / prices are not machine-readable (the live
 * collection is JS-gated and wishfulfillingweaving.com is currently down), so
 * we do NOT invent specific products here. Owner must supply real data — same
 * convention as /weaving/collection.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { shopCategoryItemListSchema, productSchema, toJsonLd } from '@/lib/structured-data'
import { getOgImage } from '@/lib/og-images'
import { OwnerConfirmBanner } from '@/components/layout'

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

/** 6 placeholder product slots — all UNMAPPED. Owner supplies real name/photo/price.
 *  (Previously these were 6 AI-invented products — scarf/blanket/throw/cushion/
 *  wall-hanging/poncho — with mismatched gallery photos. Removed: not verifiable
 *  on the official site.) */
const PLACEHOLDER_PRODUCTS = [1, 2, 3, 4, 5, 6] as const

export default async function WovenPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = await getTranslations()

  const priceOnRequest = translate('shop.priceOnRequest')
  const isDev = process.env.NODE_ENV !== 'production'

  const baseUrl = `https://alpacasibiza.com/${locale}/shop/woven`
  // JSON-LD: one honest collection entry, no invented per-product names.
  const itemListSchema = shopCategoryItemListSchema({
    categoryName: 'Woven Collection',
    baseUrl,
    items: [{ name: 'Handwoven alpaca textiles — made to order', url: baseUrl }],
  })

  // Single-product Product schema for the collection. Price UNMAPPED (made to order).
  const wovenProductSchema = productSchema({
    name: 'Wishfulfilling Weaving — Hand-woven Alpaca Textiles',
    description:
      translate('wovenPage.subtitle') ||
      'Hand-woven alpaca textiles crafted to order on traditional wooden looms from Es Currals alpaca wool.',
    image: '/images/gallery/weaving-15.jpg',
    priceEur: 0, // OWNER_INPUT_NEEDED: replace 0 with a real starting price
    brand: 'Wishfulfilling Weaving',
    url: baseUrl,
    availability: 'InStock',
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(wovenProductSchema) }}
      />
      <section className="relative w-full py-20 px-4 overflow-hidden min-h-[300px] flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/gallery/nelson-fibre.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {translate('wovenPage.title')}
          </h1>
          <p className="text-lg text-white/85">
            {translate('wovenPage.subtitle')}
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PLACEHOLDER_PRODUCTS.map((n) => (
              <div key={n} className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 overflow-hidden">
                  {/* Neutral studio photo placeholder — owner supplies real product photos */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/gallery/weaving-15.jpg" alt="" aria-hidden="true" className="w-full h-full object-cover" />
                  {isDev ? (
                    <p className="absolute top-3 left-3 text-xs font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      [UNMAPPED — product photo {n}]
                    </p>
                  ) : null}
                </div>
                <div className="p-6">
                  {/* Dev-only UNMAPPED marker; in production no fake product name
                      is shown — just the honest "price on request" + Enquire. */}
                  {isDev ? (
                    <h3 className="text-lg font-semibold text-foreground mb-2">{`[UNMAPPED — product name ${n}]`}</h3>
                  ) : null}
                  <p className="text-accent font-bold text-xl mb-4">{priceOnRequest}</p>
                  {/* No ecommerce wired — routes to commission enquiry form */}
                  <Link
                    href={`/${locale}/shop/commission`}
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

      <OwnerConfirmBanner
        heading="Woven shop — owner data needed"
        body="These 6 cards are UNMAPPED placeholders. The official Wishfulfilling Weaving products are made to order and not machine-readable, so no products are invented here."
        items={[
          '[UNMAPPED] All 6 product cards — provide real name, photo (public/images/weaving/), and price for each',
          '[UNMAPPED] Real product count — current scaffold has 6 placeholder slots',
          '[UNMAPPED] wovenPage.subtitle translation — confirm it does not list invented products',
        ]}
      />
    </>
  )
}
