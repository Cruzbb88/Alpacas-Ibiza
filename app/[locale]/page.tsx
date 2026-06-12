import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Hero } from '@/components/hero'
import { ChoicePaths } from '@/components/choice-paths'
import { Features } from '@/components/features'
import { WeavingShowcase } from '@/components/weaving-showcase'
import { ExperienceCards } from '@/components/experience-cards'
import { ReviewCard } from '@/components/review-card'
import type { Review } from '@/components/review-card'
import { getTranslations } from 'next-intl/server'
import { FAREHARBOR_BOOKING_URL, MEMBERSHIP_LIVE, MEMBERSHIP_PRICE_EUR, SITE_BASE_URL, ADOPT_PRICE_MONTHLY_EUR, HERD_FAMILY_LIVE } from '@/lib/config'
import { REFERRAL_CODE_RE } from '@/lib/referral-codes'
import type { Locale } from '@/i18n.config'
import { NewsletterForm } from '@/components/newsletter-form'
import { AwardsBadges } from '@/components/awards-badges'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { getOgImage } from '@/lib/og-images'
import { GoogleReviewsBadge } from '@/components/google-reviews-badge'
import { localBusinessSchema, toJsonLd } from '@/lib/structured-data'
import { AlpacaOfTheDay } from '@/components/alpaca-of-the-day'
import { AdoptersCounterBadge } from '@/components/adopters-counter-badge'
import { SocialProofStrip } from '@/components/social-proof-strip'
import { AlpacaCamEmbed } from '@/components/alpaca-cam-embed'
import { CampaignBannerGeneric } from '@/components/campaign-banner-generic'
import { PressLogos } from '@/components/press-logos'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const { canonical, languages } = buildLocaleAlternates(locale, '')
  const ogImage = getOgImage('home', 'Alpacas Ibiza – Ibiza\'s first alpaca farm')
  return {
    title: 'Es Currals Alpacas Ibiza | First Alpaca Farm & Weaving Studio',
    description:
      'The very first alpaca farm in Ibiza. Home to Wishfulfilling Weaving — hand-woven scarves on traditional wooden looms using alpaca wool.',
    alternates: { canonical, languages },
    openGraph: {
      title: 'Es Currals Alpacas Ibiza | First Alpaca Farm & Weaving Studio',
      description:
        'The very first alpaca farm in Ibiza. Home to Wishfulfilling Weaving — hand-woven scarves on traditional wooden looms using alpaca wool.',
      url: canonical,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage.url],
    },
  }
}

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ ref?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }>
}) {
  const { locale } = await params
  const { ref } = await searchParams
  const translate = await getTranslations()

  /* ─── UTM / referral passthrough ─── */
  // Validate referral code against the canonical REFERRAL_CODE_RE pattern.
  // Use the shared constant so any format change propagates here automatically.
  const validRef = ref && REFERRAL_CODE_RE.test(ref.toUpperCase()) ? ref.toUpperCase() : undefined
  function bookingHref(): string {
    if (!validRef) return FAREHARBOR_BOOKING_URL
    try {
      const u = new URL(FAREHARBOR_BOOKING_URL)
      u.searchParams.set('ref', validRef)
      return u.toString()
    } catch {
      console.warn('[bookingHref] FAREHARBOR_BOOKING_URL is malformed — returning raw URL', FAREHARBOR_BOOKING_URL)
      return FAREHARBOR_BOOKING_URL
    }
  }
  const primaryBookingUrl = bookingHref()

  /* ─── JSON-LD structured data ─── */
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE_BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_BASE_URL}/${locale}/journal?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  /* ─── Choice Path Cards ─── */
  const pathOptions = [
    {
      icon: '🎒',
      title: translate('paths.tour.title'),
      description: translate('paths.tour.description'),
      href: `/${locale}/tours`,
      cta: translate('paths.bookNow'),
    },
    {
      icon: '🛍️',
      title: translate('paths.shop.title'),
      description: translate('paths.shop.description'),
      href: `/${locale}/shop/woven`,
      cta: translate('paths.browseCollection'),
    },
    {
      icon: '✨',
      title: translate('paths.commission.title'),
      description: translate('paths.commission.description'),
      href: `/${locale}/shop/commission`,
      cta: translate('paths.startProject'),
    },
    {
      icon: '🌿',
      title: translate('paths.alcaca.title'),
      description: translate('paths.alcaca.description'),
      href: `/${locale}/shop/alcaca`,
      cta: translate('paths.learnMore'),
    },
  ]

  /* ─── Why Alpacas Ibiza Features ─── */
  const features = [
    {
      icon: '🏡',
      title: translate('features.farm.title'),
      description: translate('features.farm.description'),
    },
    {
      icon: '🧵',
      title: translate('features.artisan.title'),
      description: translate('features.artisan.description'),
    },
    {
      icon: '🌍',
      title: translate('features.sustainable.title'),
      description: translate('features.sustainable.description'),
    },
    {
      icon: '👥',
      title: translate('features.appointment.title'),
      description: translate('features.appointment.description'),
    },
    {
      icon: '🎯',
      title: translate('features.quality.title'),
      description: translate('features.quality.description'),
    },
    {
      icon: '💚',
      title: translate('features.welfare.title'),
      description: translate('features.welfare.description'),
    },
  ]

  /* ─── Activity Cards (live-site landmark: 5 cards) ─── */
  const experienceCards = [
    {
      icon: '💍',
      title: translate('homepage.activityCards.weddings.title'),
      description: translate('homepage.activityCards.weddings.description'),
      cta: translate('homepage.activityCards.weddings.cta'),
      href: `/${locale}/weddings`,
    },
    {
      icon: '🦙',
      title: translate('homepage.activityCards.adopt.title'),
      description: translate('homepage.activityCards.adopt.description'),
      cta: translate('homepage.activityCards.adopt.cta'),
      href: `/${locale}/adopt`,
    },
    {
      icon: '🧘',
      title: translate('homepage.activityCards.yoga.title'),
      description: translate('homepage.activityCards.yoga.description'),
      cta: translate('homepage.activityCards.yoga.cta'),
      href: `/${locale}/yoga`,
    },
    {
      icon: '🧶',
      title: translate('homepage.activityCards.workshops.title'),
      description: translate('homepage.activityCards.workshops.description'),
      cta: translate('homepage.activityCards.workshops.cta'),
      href: `/${locale}/workshops`,
    },
    {
      icon: '🏢',
      title: translate('homepage.activityCards.business.title'),
      description: translate('homepage.activityCards.business.description'),
      cta: translate('homepage.activityCards.business.cta'),
      href: `/${locale}/experiences/corporate-team-building`,
    },
  ]

  /* ─── Guest Reviews (Social Proof) ─── */
  const reviews: Review[] = [
    {
      name: 'Sue H.',
      date: 'August 2024',
      text: "I visited at the end of August and had a fantastic time! Ibiza has so much to offer in addition to the music and I would highly recommend a visit to see the beautiful Alpacas. You can feed them and learn so much about these amazing animals ❤️.",
      translationKey: 'guestStories.reviews.sue',
      language: 'en',
    },
    {
      name: 'Verena M.',
      date: 'July 2024',
      text: 'Wir haben die süßen, flauschigen Alpakas besucht. Ein super nettes Paar führt euch durch die Alpaka-Gehege mit tollen Informationen über diese Tiere. Man hat die Möglichkeit zu füttern, zu streicheln und sogar einen Alpaka-Kuss zu geben. 🤗🥳',
      translationKey: 'guestStories.reviews.verena',
      language: 'de',
    },
    {
      name: 'Gemma R.',
      date: 'May 2024',
      text: "The experience itself was amazing. Bart was so knowledgeable and friendly and the Alpacas were so sweet. All the Alpacas are very well cared for and adore Bart which shows how much he loves them.",
      translationKey: 'guestStories.reviews.gemma',
      language: 'en',
    },
  ]

  return (
    <main>
      {/* ── JSON-LD structured data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(localBusinessSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(websiteSchema) }}
      />

      {/* ── 1. Hero Section ── */}
      <Hero
        title={translate('hero.title')}
        subtitle={translate('hero.subtitle')}
        eyebrow={translate('hero.eyebrow')}
        backgroundImage="/images/heroes/home.jpg"
        trustSignals={["Ibiza's first alpaca farm", "By appointment in San Carlos"]}
        cta={{
          label: translate('hero.ctaPrimary'),
          href: primaryBookingUrl,
        }}
        secondary={{
          label: translate('hero.ctaSecondary'),
          href: `/${locale}/shop`,
        }}
      />

      {/* ── 1b. Adopters social proof badge — rendered beneath the hero trust bar.
               Server component; returns null when count is 0 / unconfigured.  ── */}
      <div className="w-full flex justify-center py-3 bg-background border-b border-border/50">
        <AdoptersCounterBadge locale={locale} />
      </div>

      {/* ── 1c. Live alpaca cam — env-gated; renders null until owner sets ALPACA_CAM_EMBED_URL.
               Failsafe: see CLAUDE.md failsafe map. No layout shift when unset. ── */}
      <AlpacaCamEmbed />

      {/* ── 1d. Campaign banner (home slot) — env-gated; renders null unless CAMPAIGN_HOME_LIVE=true.
               Failsafe: fail-open — no layout shift when unset. ── */}
      <section className="w-full px-4 py-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <CampaignBannerGeneric slot="home" />
        </div>
      </section>

      {/* ── 1e. Press logos strip — fail-quiet; renders null until owner provides logos.
               Failsafe: see CLAUDE.md failsafe map. No layout shift when unset. ── */}
      <PressLogos title="As featured in" />

      {/* ── 2. Choose Your Path ── */}
      <ChoicePaths
        paths={pathOptions}
        title={translate('homepage.experiences.title')}
        subtitle={translate('homepage.experiences.subtitle')}
      />

      {/* ── 3. Wishfulfilling Weaving Showcase ── */}
      <WeavingShowcase
        title={translate('about.weavingTitle')}
        subtitle={translate('about.weavingSubtitle')}
        description={translate('about.weavingDescription')}
        cta={translate('paths.browseCollection')}
        href={`/${locale}/shop/woven`}
        badgeText={translate('about.handcraftedBadge')}
      />

      {/* ── 3b. Travel Awards Band ── */}
      <AwardsBadges category="travel-award" title={translate('awards.recognizedBy')} />

      {/* ── 3c. Alpaca-of-the-day spotlight — deterministic per UTC day; server component;
               returns null when no animals have both image + fun_fact set.          ── */}
      <AlpacaOfTheDay locale={locale} />

      {/* ── 4. Why Alpacas Ibiza ── */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {translate('features.sectionTitle')}
            </h2>
            <p className="text-foreground/70 max-w-2xl mx-auto">
              {translate('features.sectionSubtitle')}
            </p>
          </div>
          <Features items={features} />
        </div>
      </section>

      {/* ── 4b. Social proof strip — placed BEFORE any Level-5 commitment asks.
               NN/g Hierarchy of Trust: social proof (Level 1-2) must precede
               recurring-subscription callouts (Level 4-5). ── */}
      <section className="w-full py-6 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={null}>
            <SocialProofStrip variant="full" />
          </Suspense>
        </div>
      </section>

      {/* ── 4c. Skein seasonal callout — hidden unless SKEIN_CALLOUT_LIVE=true.
               Failsafe: env var OFF by default; owner flips it on for shearing season.
               See CLAUDE.md failsafe map: "Skein homepage callout hidden unless SKEIN_CALLOUT_LIVE=true" ── */}
      {process.env.SKEIN_CALLOUT_LIVE === 'true' && (
        <section className="w-full py-10 px-4 bg-accent/10 border-y border-accent/20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">
              {translate('homepage.skeinCallout.headline')}
            </h2>
            <p className="text-sm text-foreground/70 mb-4">
              {translate('homepage.skeinCallout.body')}
            </p>
            <a
              href={`/${locale}/skein`}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg text-sm font-medium transition-colors"
            >
              {translate('homepage.skeinCallout.cta')}
            </a>
          </div>
        </section>
      )}

      {/* ── 4d. Membership callout — hidden unless MEMBERSHIP_LIVE=true.
               Failsafe: env var OFF by default; renders null when unset.
               See CLAUDE.md failsafe map: "Membership callout hidden unless MEMBERSHIP_LIVE=true"
               Placed AFTER social-proof strip (NN/g trust-level ordering). ── */}
      {MEMBERSHIP_LIVE && MEMBERSHIP_PRICE_EUR > 0 && (
        <section className="w-full py-10 px-4 bg-primary/5 border-y border-primary/10">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Annual Farm Pass — Unlimited Visits
            </h2>
            <p className="text-sm text-foreground/70 mb-4">
              {`Visit as often as you like for a full year. One pass, every visit — €${MEMBERSHIP_PRICE_EUR}.`}
            </p>
            <a
              href={`/${locale}/membership`}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
            >
              Learn more
            </a>
          </div>
        </section>
      )}

      {/* ── 4e. Herd Family callout — hidden unless HERD_FAMILY_LIVE=true.
               Failsafe: env var OFF by default; renders null when unset.
               Placed AFTER social-proof strip (NN/g trust-level ordering). ── */}
      {HERD_FAMILY_LIVE && (
        <section className="w-full py-10 px-4 bg-accent/10 border-y border-accent/20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Become a Herd Family Member
            </h2>
            <p className="text-sm text-foreground/70 mb-4">
              {`Monthly alpaca adoption — €${ADOPT_PRICE_MONTHLY_EUR}/month, cancel any time.`}
            </p>
            <a
              href={`/${locale}/herd-family`}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
            >
              Learn more
            </a>
          </div>
        </section>
      )}

      {/* ── 5. Special Experiences ── */}
      <ExperienceCards
        cards={experienceCards}
        title={translate('experiences.sectionTitle')}
        subtitle={translate('experiences.sectionSubtitle')}
      />

      {/* ── 6. Social Proof — Guest Reviews ── */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <GoogleReviewsBadge className="mb-4 justify-center" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {translate('guestStories.title')}
            </h2>
            <p className="text-foreground/70 max-w-2xl mx-auto">
              {translate('guestStories.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {reviews.map((review, idx) => (
              <ReviewCard
                key={idx}
                review={review}
                translatedText={translate(review.translationKey)}
                translateButtonLabel={translate('guestStories.translateButton')}
                showOriginalLabel={translate('guestStories.showOriginal')}
                siteLocale={locale}
                facebookBadgeLabel={translate('guestStories.facebookBadge')}
              />
            ))}
          </div>
          <div className="text-center">
            <a
              href="https://www.facebook.com/people/Es-Currals-Alpacas-Ibiza/100066379310193/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {translate('guestStories.readMore')}
              <svg className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── 7. Final CTA ── */}
      <section className="w-full py-16 md:py-24 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            {translate('cta.title')}
          </h2>
          <p className="text-lg text-foreground/70 mb-8 max-w-2xl mx-auto">
            {translate('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={primaryBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-medium transition-colors"
            >
              {translate('cta.bookTour')}
            </a>
            <a
              href={`/${locale}/shop`}
              className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary hover:bg-primary/5 rounded-lg font-medium transition-colors"
            >
              {translate('cta.exploreShop')}
            </a>
          </div>
        </div>
      </section>

      {/* ── 8. Newsletter ── */}
      <section className="w-full py-12 md:py-16 px-4 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {translate('newsletter.title')}
            </h3>
            <p className="text-sm text-foreground/70">
              {translate('newsletter.subtitle')}
            </p>
          </div>
          {/* client component handles state and API call */}
          {/* eslint-disable-next-line react/jsx-no-undef */}
          <NewsletterForm locale={locale} />
        </div>
      </section>
    </main>
  )
}
