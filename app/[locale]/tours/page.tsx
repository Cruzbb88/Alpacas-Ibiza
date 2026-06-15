import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Hero } from '@/components/hero'
import { FAQ } from '@/components/faq'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReviewCard } from '@/components/review-card'
import type { Review } from '@/components/review-card'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { FAREHARBOR_BOOKING_URL, TOUR_BASE_PRICE_EUR } from '@/lib/config'
import { FareHarborCalendar } from '@/components/booking/fareharbor-calendar'
import { CancellationBadge } from '@/components/booking/cancellation-badge'
import { AvailabilityUrgency } from '@/components/booking/availability-urgency'
import { GoogleReviewsBadge } from '@/components/google-reviews-badge'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import type { Locale } from '@/i18n.config'
import { touristTripSchema, faqPageSchema, toJsonLd } from '@/lib/structured-data'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { getOgImage } from '@/lib/og-images'
import { WhatToBringChecklist } from '@/components/tours/what-to-bring-checklist'
import { AdoptCrossSell } from '@/components/tours/adopt-cross-sell'
import { RecentBookingsTicker } from '@/components/tours/recent-bookings-ticker'
import { SocialProofStrip } from '@/components/social-proof-strip'
import { CampaignBannerGeneric } from '@/components/campaign-banner-generic'
import { BundleCta } from '@/components/tours/bundle-cta'
import { WaitlistForm } from '@/components/booking/waitlist-form'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const { canonical, languages } = buildLocaleAlternates(locale, 'tours')
  const ogImage = getOgImage('tours', 'Alpaca Trekking Tours – Alpacas Ibiza')
  return {
    title: 'Alpaca Trekking Tours | Alpacas Ibiza – Es Currals',
    description:
      'Book an alpaca trekking experience at Es Currals, Ibiza\'s first alpaca farm. Meet the herd, weave on a traditional loom, or enjoy a full farm experience.',
    alternates: { canonical, languages },
    openGraph: {
      title: 'Alpaca Trekking Tours | Alpacas Ibiza – Es Currals',
      description:
        'Book an alpaca trekking experience at Es Currals, Ibiza\'s first alpaca farm. Meet the herd, weave on a traditional loom, or enjoy a full farm experience.',
      url: canonical,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage.url],
    },
  }
}

export default async function ToursPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = await getTranslations()

  // tourTypes, tourCompareSpecs and timelineItems removed 2026-06-06 —
  // AI-fabricated (FareHarbor has ONE 1-hour Alpaca Tour, not 4 types or an
  // all-day arc). See FABRICATED_INFO_2026-06-06.md.

  const faqItems = [
    {
      question: translate('faq.duration.q'),
      answer: translate('faq.duration.a'),
    },
    {
      question: translate('faq.languages.q'),
      answer: translate('faq.languages.a'),
    },
    {
      question: translate('faq.children.q'),
      answer: translate('faq.children.a'),
    },
    {
      question: translate('faq.wear.q'),
      answer: translate('faq.wear.a'),
    },
    {
      question: translate('faq.accessibility.q'),
      answer: translate('faq.accessibility.a'),
    },
    {
      question: translate('faq.food.q'),
      answer: translate('faq.food.a'),
    },
    {
      question: translate('faq.booking.q'),
      answer: translate('faq.booking.a'),
    },
    {
      question: translate('faq.cancellation.q'),
      answer: translate('faq.cancellation.a'),
    },
    {
      question: translate('faq.private.q'),
      answer: translate('faq.private.a'),
    },
    {
      question: translate('faq.parking.q'),
      answer: translate('faq.parking.a'),
    },
  ]

  // The Book CTA: in-house picker when the engine is on, else the FareHarbor
  // embed (current live behavior). One switch makes the in-house engine a true
  // drop-in for the existing booking button.
  const bookingHref =
    process.env.BOOKING_ENGINE === 'inhouse' ? `/${locale}/tours/book` : FAREHARBOR_BOOKING_URL

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(touristTripSchema({ locale })) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(faqPageSchema(faqItems)) }}
      />
      <PageBreadcrumbs
        locale={locale}
        homeLabel={translate('nav.home') || 'Home'}
        crumbs={[{ name: translate('nav.tours') || 'Tours', path: 'tours' }]}
      />
      <Hero
        title={translate('tours.heroTitle')}
        subtitle={translate('tours.heroSubtitle')}
        eyebrow={`From €${TOUR_BASE_PRICE_EUR} per person`}
        cta={{
          label: translate('tours.heroCta'),
          href: bookingHref,
        }}
      />

      {/* Removed 2026-06-06 (owner-confirmed AI fabrication): the 4-way "Tour
          Types" split, the comparison table, and the all-day "What to Expect"
          timeline. FareHarbor has ONE Alpaca Tour (1 hour, all ages) — the
          multi-tour taxonomy and the morning→closing day-arc were invented. */}

      {/* Plan Your Visit Info */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="p-8 border-border/50">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {translate('tours.planVisit.hours.title')}
              </h3>
              <p className="text-muted-foreground mb-3">
                {translate('tours.planVisit.hours.description')}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>{translate('tours.planVisit.hours.summer')}</li>
                <li>{translate('tours.planVisit.hours.winter')}</li>
                <li>{translate('tours.planVisit.hours.contact')}</li>
              </ul>
            </Card>

            <Card className="p-8 border-border/50">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {translate('tours.planVisit.location.title')}
              </h3>
              <p className="text-muted-foreground mb-3">
                {translate('tours.planVisit.location.description')}
              </p>
              <p className="text-sm text-muted-foreground">
                {translate('tours.planVisit.location.details')}
              </p>
            </Card>

            <Card className="p-8 border-border/50">
              <div className="text-4xl mb-4">💶</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {translate('tours.planVisit.pricing.title')}
              </h3>
              <p className="text-muted-foreground mb-3">
                {translate('tours.planVisit.pricing.starting')}
              </p>
              <p className="text-sm text-muted-foreground">
                {translate('tours.planVisit.pricing.custom')}
              </p>
            </Card>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {translate('tours.planVisit.specialEvents.title')}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              {translate('tours.planVisit.specialEvents.description')}
            </p>
            <Button
              asChild
              variant="outline"
              className="border-primary text-primary hover:bg-primary/5 bg-transparent"
            >
              <Link href={`/${locale}/contact`}>{translate('tours.planVisit.specialEvents.cta')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ
        items={faqItems}
        title={translate('faq.sectionTitle')}
        subtitle={translate('faq.sectionSubtitle')}
      />

      {/* Social proof strip — full 3-up above the booking calendar */}
      <section className="w-full py-6 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={null}>
            <SocialProofStrip variant="full" />
          </Suspense>
        </div>
      </section>

      {/* Build #4 — Campaign banner (tours slot) — env-gated; renders null unless CAMPAIGN_TOURS_LIVE=true */}
      <section className="w-full px-4 pb-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <CampaignBannerGeneric slot="tours" />
        </div>
      </section>

      {/* Booking Section */}
      <section
        id="booking"
        className="w-full py-16 md:py-24 px-4 bg-secondary/20"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {translate('tours.bookingSection.title')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-3">
              {translate('tours.bookingSection.subtitle')}
            </p>
            {/* Real FareHarbor price at the point of decision (competitor scan:
                price-at-the-Book-CTA is the #1 drop-off fix). */}
            <p className="text-2xl font-bold text-primary">
              From €{TOUR_BASE_PRICE_EUR} per person
            </p>
          </div>

          {/* FareHarbor Integration */}
          <div className="p-6 md:p-8 border border-border bg-background rounded-lg shadow-sm">
            <h3 className="text-2xl font-semibold mb-2 text-center">{translate('tours.bookingSection.cardTitle')}</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md mx-auto">
              {translate('tours.bookingSection.cardSubtitle')}
            </p>
            <div className="flex justify-center mb-4">
              <GoogleReviewsBadge />
            </div>
            <AvailabilityUrgency className="mb-4 max-w-md mx-auto" />
            {/* Recent-bookings ticker — renders null until owner populates lib/data/social-proof.ts */}
            <div className="mb-4 max-w-md mx-auto">
              <RecentBookingsTicker />
            </div>
            <FareHarborCalendar />
            <div className="mt-6 text-center">
              <a
                href={bookingHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary underline hover:no-underline"
              >
                {translate('tours.bookingSection.bookNow')}
              </a>
              <div className="mt-3">
                <CancellationBadge variant="full" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {translate('tours.bookingSection.poweredBy')}
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{translate('tours.bookingSection.questions')}</strong> {translate('tours.bookingSection.questionsText')}
            </p>
          </div>

          {/* Build #8 — Bundle CTA (tour+yoga slot) — env-gated; renders null unless BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR > 0 */}
          <div className="mt-6">
            <BundleCta slot="tour-yoga" />
          </div>

          {/* Build #10 — Waitlist form — below the calendar as fallback CTA */}
          <div className="mt-6">
            <WaitlistForm
              tourSlug="tours"
              locale={locale}
              labels={{
                heading: translate('waitlist.heading'),
                subheading: translate('waitlist.subheading'),
                emailPlaceholder: translate('waitlist.emailPlaceholder'),
                datePlaceholder: translate('waitlist.datePlaceholder'),
                submitLabel: translate('waitlist.submitLabel'),
                successMessage: translate('waitlist.successMessage'),
              }}
            />
          </div>
        </div>
      </section>

      {/* What to Bring Checklist */}
      <section className="w-full py-12 md:py-16 px-4 bg-secondary/20">
        <div className="max-w-2xl mx-auto">
          <WhatToBringChecklist />
        </div>
      </section>

      {/* Guest Reviews */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {translate('guestStories.title')}
            </h2>
            <p className="text-muted-foreground">
              {translate('guestStories.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {([
              {
                name: 'Sue Rose',
                date: 'October 12, 2025',
                language: 'en',
                translationKey: 'sue',
                text: 'I visited at the end of August and had a fantastic time! Ibiza has so much to offer in addition to the music and I would highly recommend a visit to see the beautiful Alpacas. You can feed them and learn so much about these amazing animals ❤️. I was warmly welcomed and had such a valuable experience. Go and see them - you\'ll love it and them!',
              },
              {
                name: 'Verena R Kaiser',
                date: 'August 16, 2025',
                language: 'de',
                translationKey: 'verena',
                text: 'Wir waren zu Besuch bei den süßen, flauschigen Alpakas. Ein super nettes Pärchen führt dich durch die Gehege der Alpakas mit tollen Informationen über diese Tiere. Du hast die Möglichkeit die Tiere zu füttern, streicheln und auch ein AlpakaBussi zu geben. Die Tiere sind sehr zutraulich und freuen sich riesig über deine Nähe und Futter. Es war eine tolle Erfahrung und ich kann sie nur jedem empfehlen, der auf Ibiza ist. 🤗🥳',
              },
              {
                name: 'Gemma Muldoon',
                date: 'May 13, 2025',
                language: 'en',
                translationKey: 'gemma',
                text: 'I made a group booking for 6 of us for Friday 9th May. Bart got in touch to let me know that they were actually closed that day because they were shearing the Alpacas. He then kindly offered to accommodate us the day before even though the farm was closed, it was really kind of him to do so. The experience itself was amazing. Bart was so knowledgeable and friendly and the Alpacas were so sweet. All the Alpacas are very well cared for and adore Bart which shows how much he loves them.',
              },
              {
                name: 'Renate Hoofddorp',
                date: 'February 19, 2025',
                language: 'nl',
                translationKey: 'renate',
                text: 'Heel leuk om te doen met onze 2 jongens van 12 jaar oud maar eigenlijk leuk voor alle leeftijden. Wij wisten eigenlijk niets van Alpaca\'s, was heel interessant! precies een uur bezig geweest.',
              },
              {
                name: 'Sven Van Hees',
                date: 'May 9, 2024',
                language: 'en',
                translationKey: 'sven',
                text: 'Highly recommended! Bart & San run a fantastic operation. The ultimate Chill Out experience 🦙❤️🦙',
              },
              {
                name: 'Paul Walker',
                date: 'April 8, 2024',
                language: 'en',
                translationKey: 'paul',
                text: 'Went September 23, amazing tour, Bart is so knowledgeable and friendly. If you have a car it\'s a must 😀🦙',
              },
            ] satisfies Review[]).map((review, i) => (
              <ReviewCard
                key={i}
                review={review}
                translatedText={translate(`guestStories.reviews.${review.translationKey}`)}
                translateButtonLabel={translate('guestStories.translateButton')}
                showOriginalLabel={translate('guestStories.showOriginal')}
                siteLocale={locale}
                facebookBadgeLabel={translate('guestStories.facebookBadge')}
              />
            ))}
          </div>

          <div className="mt-10 text-center">
            <a
              href="https://www.facebook.com/people/Es-Currals-Alpacas-Ibiza/100066379310193/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {translate('guestStories.readMore')} →
            </a>
          </div>
        </div>
      </section>

      {/* Adopt cross-sell */}
      <AdoptCrossSell locale={locale} />
    </>
  )
}
