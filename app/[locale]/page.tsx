import type { Metadata } from 'next'
import { Hero } from '@/components/hero'
import { ChoicePaths } from '@/components/choice-paths'
import { Features } from '@/components/features'
import { WeavingShowcase } from '@/components/weaving-showcase'
import { ExperienceCards } from '@/components/experience-cards'
import { ReviewCard } from '@/components/review-card'
import type { Review } from '@/components/review-card'
import { t } from '@/lib/translations'
import { FAREHARBOR_BOOKING_URL } from '@/lib/config'
import type { Locale } from '@/i18n.config'
import Link from 'next/link'
import { NewsletterForm } from '@/components/newsletter-form'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { getOgImage } from '@/lib/og-images'

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

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = t(locale)

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

  /* ─── Experience Cards ─── */
  const experienceCards = [
    {
      icon: '🏢',
      title: translate('homepage.experiences.corporate.title'),
      description: translate('homepage.experiences.corporate.description'),
      cta: translate('homepage.experiences.corporate.cta'),
      href: `/${locale}/experiences/corporate-team-building`,
    },
    {
      icon: '🌅',
      title: translate('homepage.experiences.romantic.title'),
      description: translate('homepage.experiences.romantic.description'),
      cta: translate('homepage.experiences.romantic.cta'),
      href: `/${locale}/experiences/romantic-sunset`,
    },
    {
      icon: '👨‍👩‍👧‍👦',
      title: translate('homepage.experiences.family.title'),
      description: translate('homepage.experiences.family.description'),
      cta: translate('homepage.experiences.family.cta'),
      href: `/${locale}/experiences/family-farm-days`,
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
      {/* ── 1. Hero Section ── */}
      <Hero
        title={translate('hero.title')}
        subtitle={translate('hero.subtitle')}
        cta={{
          label: translate('hero.ctaPrimary'),
          href: FAREHARBOR_BOOKING_URL,
        }}
        secondary={{
          label: translate('hero.ctaSecondary'),
          href: `/${locale}/shop`,
        }}
      />

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
              href="https://www.facebook.com/alpacasibiza/reviews"
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
              href="https://fareharbor.com/embeds/book/alpacasibiza/?full-items=yes"
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
