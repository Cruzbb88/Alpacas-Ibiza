import type { Metadata } from 'next'
import { GradientPageHero, PageSection } from '@/components/layout'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { ExperienceCompare } from '@/components/experiences/experience-compare'
import type { ExperienceVibe } from '@/components/experiences/experience-compare'
import { getTranslations } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { getOgImage } from '@/lib/og-images'
import type { Locale } from '@/i18n.config'

/**
 * /[locale]/experiences — landing page that lets visitors compare every
 * Alpacas Ibiza experience at a glance: tours, yoga, workshops, weddings,
 * romantic sunset, family farm days, and corporate team building.
 *
 * Each sub-experience already has its own deep-link page; this index serves
 * the visitor who lands on /experiences without knowing which booking is
 * right for them. ExperienceCompare renders the comparison grid; the row
 * data is built locally so adding/removing an experience is a one-line edit.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const { canonical, languages } = buildLocaleAlternates(locale, 'experiences')
  const ogImage = getOgImage('alpacas', 'Alpacas Ibiza experiences — compare and book')
  return {
    title: 'Experiences | Alpacas Ibiza — Tours, Yoga, Workshops, Weddings',
    description:
      'Compare every Alpacas Ibiza experience: 90-minute farm tours, alpaca yoga, weaving workshops, weddings, romantic sunsets, family days, and corporate team building.',
    alternates: { canonical, languages },
    openGraph: {
      title: 'Experiences — Alpacas Ibiza',
      description: 'Pick the right alpaca experience for you — full comparison.',
      url: canonical,
      images: [ogImage],
    },
    twitter: { card: 'summary_large_image', images: [ogImage.url] },
  }
}

interface ExperienceRowSpec {
  slug: string
  titleKey: string
  oneLinerKey: string
  icon: string
  duration: string
  groupSize: string
  priceFrom: string
  vibe: ExperienceVibe
  vibeLabelKey: string
  includes: string[]
  href: (locale: string) => string
}

const EXPERIENCES: ReadonlyArray<ExperienceRowSpec> = [
  {
    slug: 'tour',
    titleKey: 'experiences.tour.title',
    oneLinerKey: 'experiences.tour.oneLiner',
    icon: '🦙',
    duration: '90 min',
    groupSize: 'Up to 6',
    // €30 — verified live per lib/config.ts TOUR_BASE_PRICE_EUR. Was €45
    // (invented) which contradicted /tours and broke trust on click-through.
    priceFrom: 'From €30 / person',
    vibe: 'classic',
    vibeLabelKey: 'experiences.vibe.classic',
    includes: [
      'Meet the herd of 14 alpacas',
      'Guided walk through the paddocks',
      'Hand-feeding session',
      'Photo opportunity with your favourite alpaca',
    ],
    href: (locale) => `/${locale}/tours`,
  },
  {
    slug: 'yoga',
    titleKey: 'experiences.yoga.title',
    oneLinerKey: 'experiences.yoga.oneLiner',
    icon: '🧘',
    duration: '75 min',
    groupSize: 'Up to 6',
    // €30 — verified live per lib/config.ts YOGA_PRICE_EUR. Was €55
    // (invented) which contradicted /yoga page.
    priceFrom: 'From €30 / person',
    vibe: 'wellness',
    vibeLabelKey: 'experiences.vibe.wellness',
    includes: [
      'Outdoor Hatha yoga in the paddock',
      'Alpacas grazing freely around you',
      'Mat + props provided',
      'Wednesday + Saturday mornings',
    ],
    href: (locale) => `/${locale}/yoga`,
  },
  {
    slug: 'workshops',
    titleKey: 'experiences.workshops.title',
    oneLinerKey: 'experiences.workshops.oneLiner',
    icon: '🧶',
    duration: '3 hours',
    groupSize: 'Up to 8',
    // /workshops page shows "Contact for pricing" — Rule 5 (never invent
    // prices). Was €120 invented; now matches child page.
    priceFrom: 'Contact for pricing',
    vibe: 'creative',
    vibeLabelKey: 'experiences.vibe.creative',
    includes: [
      'Learn to weave on a traditional loom',
      'Spin alpaca fibre into yarn',
      'Take home a small woven piece',
      'Refreshments + farm tour included',
    ],
    href: (locale) => `/${locale}/workshops`,
  },
  {
    slug: 'romantic-sunset',
    titleKey: 'experiences.romantic.title',
    oneLinerKey: 'experiences.romantic.oneLiner',
    icon: '🌅',
    duration: '2 hours',
    groupSize: '2 guests',
    // Was €180 invented (no owner source). Rule 5: never guess.
    priceFrom: 'On request',
    vibe: 'romantic',
    vibeLabelKey: 'experiences.vibe.romantic',
    includes: [
      'Private walk through the paddocks at golden hour',
      'Glass of cava + tapas board',
      'Professional photographer for 30 minutes',
      'Digital photo download',
    ],
    href: (locale) => `/${locale}/experiences/romantic-sunset`,
  },
  {
    slug: 'family-farm-days',
    titleKey: 'experiences.family.title',
    oneLinerKey: 'experiences.family.oneLiner',
    icon: '👨‍👩‍👧‍👦',
    duration: 'Half day',
    groupSize: 'Family group',
    // Was €140 invented (no owner source). Rule 5: never guess.
    priceFrom: 'On request',
    vibe: 'family',
    vibeLabelKey: 'experiences.vibe.family',
    includes: [
      'Hands-on alpaca care + feeding',
      'Mini weaving demo for kids',
      'Farm-fresh snacks',
      'Best for ages 4 and up',
    ],
    href: (locale) => `/${locale}/experiences/family-farm-days`,
  },
  {
    slug: 'weddings',
    titleKey: 'experiences.weddings.title',
    oneLinerKey: 'experiences.weddings.oneLiner',
    icon: '💍',
    duration: 'Bespoke',
    groupSize: 'Up to 80',
    priceFrom: 'On request',
    vibe: 'celebration',
    vibeLabelKey: 'experiences.vibe.celebration',
    includes: [
      'Ceremony venue with the herd as backdrop',
      'Photoshoot with alpacas',
      'Catering coordination',
      'Bespoke alpaca-themed favours',
    ],
    href: (locale) => `/${locale}/weddings`,
  },
  {
    slug: 'corporate',
    titleKey: 'experiences.corporate.title',
    oneLinerKey: 'experiences.corporate.oneLiner',
    icon: '🤝',
    duration: 'Half / full day',
    groupSize: 'Up to 30',
    priceFrom: 'On request',
    vibe: 'corporate',
    vibeLabelKey: 'experiences.vibe.corporate',
    includes: [
      'Team-building activities with the herd',
      'Lunch + coffee breaks',
      'Branded photography',
      'Optional weaving workshop add-on',
    ],
    href: (locale) => `/${locale}/experiences/corporate-team-building`,
  },
] as const

export default async function ExperiencesIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const translate = await getTranslations()

  const rows = EXPERIENCES.map((spec) => ({
    slug: spec.slug,
    icon: spec.icon,
    title: translate(spec.titleKey),
    oneLiner: translate(spec.oneLinerKey),
    duration: spec.duration,
    groupSize: spec.groupSize,
    priceFrom: spec.priceFrom,
    vibe: spec.vibe,
    vibeLabel: translate(spec.vibeLabelKey),
    includes: spec.includes,
    href: spec.href(locale),
    ctaLabel: translate('experiences.compareCta') || 'Learn more',
  }))

  return (
    <main>
      <PageBreadcrumbs
        locale={locale}
        homeLabel={translate('nav.home') || 'Home'}
        crumbs={[
          { name: translate('experiences.indexTitle') || 'Experiences', path: 'experiences' },
        ]}
      />

      <GradientPageHero
        title={translate('experiences.indexTitle') || 'Experiences at Alpacas Ibiza'}
        subtitle={
          translate('experiences.indexSubtitle') ||
          'Seven ways to spend time with the herd at Es Currals. Pick the one that fits your trip.'
        }
      />

      <PageSection width="wide" className="py-12 md:py-16">
        <ExperienceCompare
          heading={translate('experiences.compareHeading') || 'Compare every experience'}
          subheading={
            translate('experiences.compareSubheading') ||
            'Duration, group size, and what\'s included — side by side.'
          }
          rows={rows}
        />
      </PageSection>
    </main>
  )
}
