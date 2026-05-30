/**
 * Press Kit page — Alpacas Ibiza
 *
 * Provides downloadable assets for journalists, photographers, and partners.
 *
 * OWNER INPUT NEEDED — all four asset categories are UNMAPPED until the owner
 * drops the files into public/press/ and flips the enabled flag below.
 * See public/press/.gitkeep for the drop-target directory.
 *
 * Fail-quiet: each card shows a "Coming soon" badge when its asset is not yet
 * available. No invented URLs — null/UNMAPPED safe default throughout.
 *
 * Rule 5 absolute: DO NOT invent press URLs.
 */

import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { PressLogos } from '@/components/press-logos'
import { OwnerConfirmBanner } from '@/components/layout/owner-confirm-banner'
import { GradientPageHero } from '@/components/layout/gradient-page-hero'
import { PageSection } from '@/components/layout/page-section'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { getOgImage } from '@/lib/og-images'

// ── Asset registry ────────────────────────────────────────────────────────────
// Set `enabled: true` AND provide `url` once the owner uploads the file to
// public/press/. Never invent a URL — leave enabled: false and url: null
// until the file physically exists.

interface PressAsset {
  id: string
  enabled: boolean
  url: string | null
}

const PRESS_ASSETS = {
  logoPack:   { id: 'logo-pack',   enabled: false, url: null } satisfies PressAsset,
  photos:     { id: 'photos',      enabled: false, url: null } satisfies PressAsset,
  factSheet:  { id: 'fact-sheet',  enabled: false, url: null } satisfies PressAsset,
  founderBio: { id: 'founder-bio', enabled: false, url: null } satisfies PressAsset,
  // When owner uploads, change to:
  //   logoPack:   { id: 'logo-pack',   enabled: true, url: '/press/logo-pack.zip' },
  //   photos:     { id: 'photos',      enabled: true, url: '/press/photos.zip' },
  //   factSheet:  { id: 'fact-sheet',  enabled: true, url: '/press/fact-sheet.pdf' },
  //   founderBio: { id: 'founder-bio', enabled: true, url: '/press/founder-bio.pdf' },
} as const

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = t(locale as Locale)
  const alts = buildLocaleAlternates(locale, 'press-kit')
  const ogImage = getOgImage('press-kit', 'Press Kit – Alpacas Ibiza')
  return {
    title: tr('pressKit.meta.title') || 'Press Kit | Alpacas Ibiza',
    description:
      tr('pressKit.meta.description') ||
      'Download the official Alpacas Ibiza press kit — logo pack, hi-res photos, fact sheet, and founder bio for journalists and media partners.',
    robots: { index: false, follow: true },
    alternates: alts,
    openGraph: {
      title: tr('pressKit.meta.title') || 'Press Kit | Alpacas Ibiza',
      description:
        tr('pressKit.meta.description') ||
        'Download the official Alpacas Ibiza press kit — logo pack, hi-res photos, fact sheet, and founder bio.',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage.url],
    },
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface AssetCardProps {
  title: string
  body: string
  cta: string
  asset: PressAsset
  comingSoonLabel: string
}

function AssetCard({ title, body, cta, asset, comingSoonLabel }: AssetCardProps) {
  const cardInner = (
    <div className="bg-card rounded-xl border border-border p-6 flex flex-col gap-3 h-full hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-foreground text-base">{title}</h3>
        {!asset.enabled && (
          <span className="shrink-0 text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {comingSoonLabel}
          </span>
        )}
      </div>
      <p className="text-sm text-foreground/70 flex-1">{body}</p>
      {asset.enabled && asset.url !== null ? (
        <span className="text-sm font-semibold text-primary">{cta} →</span>
      ) : (
        <span className="text-xs text-muted-foreground italic">
          {comingSoonLabel}
        </span>
      )}
    </div>
  )

  if (asset.enabled && asset.url !== null) {
    return (
      <a
        href={asset.url}
        download
        className="block h-full"
        aria-label={`${cta}: ${title}`}
      >
        {cardInner}
      </a>
    )
  }

  return <div className="h-full">{cardInner}</div>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PressKitPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const translate = t(locale)

  const comingSoon = translate('pressKit.comingSoonBadge') || 'Coming soon'

  const cards = [
    {
      id: 'logoPack',
      title: translate('pressKit.logoPackTitle') || 'Logo Pack',
      body:
        translate('pressKit.logoPackBody') ||
        'SVG and PNG versions of the Alpacas Ibiza wordmark, icon, and combination mark. Colour and monochrome variants included.',
      cta: translate('pressKit.logoPackCta') || 'Download logo pack',
      asset: PRESS_ASSETS.logoPack,
    },
    {
      id: 'photos',
      title: translate('pressKit.photosTitle') || 'Hi-res Photos',
      body:
        translate('pressKit.photosBody') ||
        'High-resolution farm and alpaca photography. Cleared for editorial and commercial use with attribution.',
      cta: translate('pressKit.photosCta') || 'Download photo archive',
      asset: PRESS_ASSETS.photos,
    },
    {
      id: 'factSheet',
      title: translate('pressKit.factSheetTitle') || 'Fact Sheet',
      body:
        translate('pressKit.factSheetBody') ||
        'One-page PDF with key facts: founding date, herd size, farm location, activity categories, and contact details.',
      cta: translate('pressKit.factSheetCta') || 'Download fact sheet',
      asset: PRESS_ASSETS.factSheet,
    },
    {
      id: 'founderBio',
      title: translate('pressKit.founderBioTitle') || 'Founder Bio',
      body:
        translate('pressKit.founderBioBody') ||
        'Short and long-form biography of the farm founders, suitable for article introductions and speaker profiles.',
      cta: translate('pressKit.founderBioCta') || 'Download founder bio',
      asset: PRESS_ASSETS.founderBio,
    },
  ] as const

  return (
    <main>
      {/* BreadcrumbList JSON-LD */}
      <PageBreadcrumbs
        locale={locale}
        homeLabel={translate('nav.home') || 'Home'}
        crumbs={[
          {
            name: translate('pressKit.title') || 'Press Kit',
            path: 'press-kit',
          },
        ]}
      />

      {/* Hero */}
      <GradientPageHero
        title={translate('pressKit.title') || 'Press Kit'}
        subtitle={
          translate('pressKit.subtitle') ||
          'For journalists, photographers, and partners — assets, fact sheet, and founder bio.'
        }
      />

      {/* Downloadable assets grid */}
      <PageSection bg="default" padding="md" ariaLabel="Downloadable press assets">
        <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
          {translate('pressKit.assetsHeading') || 'Downloadable assets'}
        </h2>
        <p className="text-sm text-center text-muted-foreground mb-10">
          {translate('pressKit.assetsSubheading') ||
            'Files will be available for download once uploaded by the farm team.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <AssetCard key={card.id} {...card} comingSoonLabel={comingSoon} />
          ))}
        </div>
      </PageSection>

      {/* Press inquiries */}
      <PageSection bg="muted" padding="md" ariaLabel="Press inquiries">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {translate('pressKit.inquiriesTitle') || 'Press Inquiries'}
          </h2>
          <p className="text-foreground/70 mb-6">
            {translate('pressKit.inquiriesBody') ||
              'Journalists and media professionals are welcome to reach out for interviews, photography access, or editorial information.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:info@alpacasibiza.com"
              className="inline-block bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-[16px] hover:bg-primary/90 transition-colors"
            >
              {/* UNMAPPED — owner to confirm press@ alias. Using info@ as fallback. */}
              {translate('pressKit.inquiriesCta') || 'Email the press team'}
            </a>
            <a
              href={`/${locale}/contact`}
              className="inline-block border border-primary text-primary font-semibold px-8 py-3 rounded-[16px] hover:bg-primary/5 transition-colors"
            >
              {translate('pressKit.inquiriesContactLink') || 'Use the contact form'}
            </a>
          </div>
        </div>
      </PageSection>

      {/* As featured in */}
      <PageSection bg="default" padding="sm" ariaLabel="As featured in">
        <p className="text-center text-sm uppercase tracking-wider text-foreground/60 mb-4">
          {translate('pressKit.featuredTitle') || 'As featured in'}
        </p>
        <PressLogos />
      </PageSection>

      {/* Dev-only: owner confirmation banner */}
      <OwnerConfirmBanner
        heading={translate('pressKit.ownerConfirmHeader') || 'Owner action required before launch'}
        body={
          translate('pressKit.ownerConfirmBody') ||
          'Upload the following files to public/press/, then flip enabled: true in app/[locale]/press-kit/page.tsx PRESS_ASSETS.'
        }
        items={[
          'public/press/logo-pack.zip — SVG + PNG logo variants',
          'public/press/photos.zip — hi-res editorial photography',
          'public/press/fact-sheet.pdf — one-page fact sheet',
          'public/press/founder-bio.pdf — short + long founder bio',
          'UNMAPPED: confirm press@ email alias (currently falling back to info@alpacasibiza.com)',
        ]}
      />
    </main>
  )
}
