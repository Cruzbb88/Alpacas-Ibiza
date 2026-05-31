/**
 * Wishfulfilling Weaving — landing page
 *
 * UNMAPPED (all must be confirmed by owner before launch):
 *   - Studio history text
 *   - Process step details (shearing season, washing, spinning)
 *   - All three photo slots (studio interior, loom in action, finished scarves)
 *
 * Live-site facts used:
 *   - "Wishfulfilling Weaving" brand name — verified on alpacasibiza.com
 *   - Traditional wooden loom, San as weaver — verified on live site + about page
 *   - Es Currals finca location — verified
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n.config'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { GradientPageHero, PageSection, OwnerConfirmBanner } from '@/components/layout'
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
    route: '/weaving',
    titleOverride: 'Wishfulfilling Weaving | Alpacas Ibiza — Handwoven Scarves from Es Currals',
    descriptionOverride:
      "Handwoven scarves made from our alpaca herd's fleece on a traditional wooden loom at Es Currals, Ibiza. Studio by San of Wishfulfilling Weaving.",
  })
  const ogImage = getOgImage('weaving', 'Wishfulfilling Weaving — Studio at Es Currals')
  return {
    ...base,
    openGraph: { ...base.openGraph, images: [ogImage] },
    twitter: { ...base.twitter, images: [ogImage.url] },
  }
}

const PROCESS_STEPS = [
  { stepKey: 'processStep1Title', bodyKey: 'processStep1Body' },
  { stepKey: 'processStep2Title', bodyKey: 'processStep2Body' },
  { stepKey: 'processStep3Title', bodyKey: 'processStep3Body' },
  { stepKey: 'processStep4Title', bodyKey: 'processStep4Body' },
] as const

export default async function WeavingPage({
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
        crumbs={[{ name: tr('nav.weaving') || 'Weaving', path: 'weaving' }]}
      />

      {/* Hero */}
      <GradientPageHero
        title={tr('weaving.title')}
        subtitle={tr('weaving.subhead')}
      />

      {/* Photo placeholders */}
      <PageSection width="wide">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: tr('weaving.photoStudio') || '[UNMAPPED — studio interior photo]' },
            { label: tr('weaving.photoLoom') || '[UNMAPPED — loom in action photo]' },
            { label: tr('weaving.photoScarves') || '[UNMAPPED — finished scarves photo]' },
          ].map((photo, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-lg bg-muted border border-border flex items-center justify-center"
            >
              {process.env.NODE_ENV !== 'production' ? (
                <p className="text-xs font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-center mx-4">
                  {photo.label}
                </p>
              ) : (
                <span className="sr-only">{photo.label}</span>
              )}
            </div>
          ))}
        </div>
      </PageSection>

      {/* Studio history — UNMAPPED */}
      <PageSection width="narrow">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          {tr('weaving.studioHistoryTitle')}
        </h2>
        {process.env.NODE_ENV !== 'production' ? (
          <p className="text-xs font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            {tr('weaving.studioHistoryBody') || '[UNMAPPED — owner to provide studio history and background]'}
          </p>
        ) : (
          <p className="text-foreground/70 text-sm leading-relaxed">
            {tr('weaving.studioHistoryBody')}
          </p>
        )}
      </PageSection>

      {/* Process steps */}
      <PageSection bg="muted" width="narrow" className="py-12">
        <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
          {tr('weaving.processTitle')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
          {PROCESS_STEPS.map(({ stepKey, bodyKey }) => (
            <div key={stepKey} className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {tr(`weaving.${stepKey}`)}
              </h3>
              {process.env.NODE_ENV !== 'production' ? (
                <p className="text-xs font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  {tr(`weaving.${bodyKey}`)}
                </p>
              ) : (
                <p className="text-sm text-foreground/70">
                  {tr(`weaving.${bodyKey}`)}
                </p>
              )}
            </div>
          ))}
        </div>
      </PageSection>

      {/* CTAs */}
      <PageSection width="narrow" borderTop className="py-14" innerClassName="text-center">
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href={`/${locale}/weaving/collection`}
            className="inline-block rounded-lg bg-primary text-primary-foreground px-8 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {tr('weaving.collectionCta')}
          </Link>
          <Link
            href={`/${locale}/shop/commission`}
            className="inline-block rounded-lg border border-border px-8 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            {tr('weaving.commissionCta')}
          </Link>
        </div>
      </PageSection>

      {/* Cross-sell: yoga + workshops */}
      <PageSection bg="muted" width="narrow" className="py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {tr('weaving.crossSellYogaTitle')}
            </h3>
            <p className="text-sm text-foreground/70 mb-4">
              {tr('weaving.crossSellYogaBody')}
            </p>
            <Link
              href={`/${locale}/yoga`}
              className="text-sm font-medium text-accent hover:underline"
            >
              {tr('paths.learnMore')} →
            </Link>
          </div>
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {tr('weaving.crossSellWorkshopsTitle')}
            </h3>
            <p className="text-sm text-foreground/70 mb-4">
              {tr('weaving.crossSellWorkshopsBody')}
            </p>
            <Link
              href={`/${locale}/workshops`}
              className="text-sm font-medium text-accent hover:underline"
            >
              {tr('paths.learnMore')} →
            </Link>
          </div>
        </div>
      </PageSection>

      {/* Owner confirm banner */}
      <OwnerConfirmBanner
        heading={tr('weaving.ownerConfirmHeader')}
        body={tr('weaving.ownerConfirmBody')}
        items={[
          '[UNMAPPED] Studio history — provide founding story and background text',
          '[UNMAPPED] Process steps — confirm shearing season, washing, spinning details',
          '[UNMAPPED] Studio interior photo — provide for hero photo slot 1',
          '[UNMAPPED] Loom in action photo — provide for hero photo slot 2',
          '[UNMAPPED] Finished scarves photo — provide for hero photo slot 3',
        ]}
      />
    </main>
  )
}
