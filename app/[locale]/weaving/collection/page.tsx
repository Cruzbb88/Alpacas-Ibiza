/**
 * Wishfulfilling Weaving — Collection page
 *
 * UNMAPPED: All 6 product cards are placeholders. Owner must provide:
 *   - Real product names, photos, and pricing
 *   - Preferred enquiry flow (mailto or /commission)
 *
 * Pattern: 6-card grid with UNMAPPED placeholders, enquire CTA → mailto or /commission.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n.config'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { GradientPageHero, PageSection, OwnerConfirmBanner } from '@/components/layout'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { getOgImage } from '@/lib/og-images'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const tenant = await getTenant()
  const base = tenantMetadata(tenant, {
    locale,
    route: '/weaving/collection',
    titleOverride: 'Weaving Collection | Wishfulfilling Weaving — Alpacas Ibiza',
    descriptionOverride:
      'Handcrafted textiles from our studio at Es Currals, Ibiza. Scarves, wraps, and woven pieces made from alpaca fleece. Enquire for availability and pricing.',
  })
  const ogImage = getOgImage('weaving/collection', 'Weaving Collection — Alpacas Ibiza')
  return {
    ...base,
    openGraph: { ...base.openGraph, images: [ogImage] },
    twitter: { ...base.twitter, images: [ogImage.url] },
  }
}

/** 6 placeholder product cards — all UNMAPPED, owner must supply real data */
const PLACEHOLDER_PRODUCTS = [1, 2, 3, 4, 5, 6] as const

export default async function WeavingCollectionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const tr = await getTranslations()

  return (
    <main>
      <PageBreadcrumbs
        locale={locale}
        homeLabel={tr('nav.home') || 'Home'}
        crumbs={[
          { name: tr('nav.weaving') || 'Weaving', path: 'weaving' },
          { name: tr('weaving.collectionTitle') || 'Collection', path: 'weaving/collection' },
        ]}
      />

      <GradientPageHero
        title={tr('weaving.collectionTitle')}
        subtitle={tr('weaving.collectionSubhead')}
      />

      {/* Product grid — UNMAPPED placeholders */}
      <PageSection width="wide">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLACEHOLDER_PRODUCTS.map((n) => (
            <Card key={n} className="flex flex-col">
              <CardHeader className="p-0">
                {/* Photo placeholder */}
                <div className="aspect-square rounded-t-lg bg-muted border-b border-border flex items-center justify-center">
                  {process.env.NODE_ENV !== 'production' ? (
                    <p className="text-xs font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mx-4 text-center">
                      [UNMAPPED — product photo {n}]
                    </p>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-4">
                <CardTitle className="text-base mb-1">
                  {process.env.NODE_ENV !== 'production'
                    ? `[UNMAPPED — product name ${n}]`
                    : tr('weaving.priceOnRequest')}
                </CardTitle>
                <CardDescription>
                  {tr('weaving.priceOnRequest')}
                </CardDescription>
              </CardContent>
              <CardFooter className="flex gap-2 flex-wrap">
                <Link
                  href={`mailto:info@alpacasibiza.com?subject=Weaving%20enquiry%20—%20product%20${n}`}
                  className="inline-block rounded-md bg-primary text-primary-foreground px-4 py-2 text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  {tr('weaving.enquireCta')}
                </Link>
                <Link
                  href={`/${locale}/shop/commission`}
                  className="inline-block rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {tr('weaving.commissionCta')}
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </PageSection>

      {/* Back to weaving */}
      <PageSection width="narrow" borderTop className="py-10" innerClassName="text-center">
        <Link
          href={`/${locale}/weaving`}
          className="inline-block rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          ← {tr('nav.weaving')}
        </Link>
      </PageSection>

      <OwnerConfirmBanner
        heading={tr('weaving.ownerConfirmHeader')}
        body={tr('weaving.ownerConfirmBody')}
        items={[
          '[UNMAPPED] All 6 product cards — provide name, photo (public/images/weaving/), and price for each',
          '[UNMAPPED] Enquiry flow — confirm mailto:info@alpacasibiza.com or route to /commission',
          '[UNMAPPED] Add real product count — current scaffold has 6 placeholder slots',
        ]}
      />
    </main>
  )
}
