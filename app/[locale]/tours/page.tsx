import { Hero } from '@/components/hero'
import { Features } from '@/components/features'
import { Timeline } from '@/components/timeline'
import { FAQ } from '@/components/faq'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReviewCard } from '@/components/review-card'
import type { Review } from '@/components/review-card'
import Link from 'next/link'
import { t } from '@/lib/translations'
import { FAREHARBOR_BOOKING_URL } from '@/lib/config'
import { FareHarborCalendar } from '@/components/fareharbor-calendar'
import type { Locale } from '@/i18n.config'
import { touristTripSchema, faqPageSchema, toJsonLd } from '@/lib/structured-data'

export default async function ToursPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = t(locale)

  const tourTypes = [
    {
      icon: '🦙',
      title: translate('tours.tourTypes.meetHerd.title'),
      description: translate('tours.tourTypes.meetHerd.description'),
    },
    {
      icon: '🧵',
      title: translate('tours.tourTypes.weaving.title'),
      description: translate('tours.tourTypes.weaving.description'),
    },
    {
      icon: '🌄',
      title: translate('tours.tourTypes.farm.title'),
      description: translate('tours.tourTypes.farm.description'),
    },
    {
      icon: '📸',
      title: translate('tours.tourTypes.photo.title'),
      description: translate('tours.tourTypes.photo.description'),
    },
  ]

  const timelineItems = [
    {
      time: translate('tours.timeline.arrival.time'),
      title: translate('tours.timeline.arrival.title'),
      description: translate('tours.timeline.arrival.description'),
    },
    {
      time: translate('tours.timeline.morning.time'),
      title: translate('tours.timeline.morning.title'),
      description: translate('tours.timeline.morning.description'),
    },
    {
      time: translate('tours.timeline.midday.time'),
      title: translate('tours.timeline.midday.title'),
      description: translate('tours.timeline.midday.description'),
    },
    {
      time: translate('tours.timeline.afternoon.time'),
      title: translate('tours.timeline.afternoon.title'),
      description: translate('tours.timeline.afternoon.description'),
    },
    {
      time: translate('tours.timeline.closing.time'),
      title: translate('tours.timeline.closing.title'),
      description: translate('tours.timeline.closing.description'),
    },
  ]

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

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(touristTripSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(faqPageSchema(faqItems)) }}
      />
      <Hero
        title={translate('tours.heroTitle')}
        subtitle={translate('tours.heroSubtitle')}
        cta={{
          label: translate('tours.heroCta'),
          href: FAREHARBOR_BOOKING_URL,
        }}
      />

      {/* Tour Types */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {translate('tours.tourOptionsTitle')}
            </h2>
            <p className="text-foreground/70 max-w-2xl mx-auto">
              {translate('tours.tourOptionsSubtitle')}
            </p>
          </div>
          <Features items={tourTypes} />
        </div>
      </section>

      {/* What to Expect */}
      <Timeline items={timelineItems} title={translate('tours.timelineTitle')} />

      {/* Plan Your Visit Info */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="p-8 border-border/50">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {translate('tours.planVisit.hours.title')}
              </h3>
              <p className="text-foreground/70 mb-3">
                {translate('tours.planVisit.hours.description')}
              </p>
              <ul className="text-sm text-foreground/70 space-y-1">
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
              <p className="text-foreground/70 mb-3">
                {translate('tours.planVisit.location.description')}
              </p>
              <p className="text-sm text-foreground/70">
                {translate('tours.planVisit.location.details')}
              </p>
            </Card>

            <Card className="p-8 border-border/50">
              <div className="text-4xl mb-4">💶</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {translate('tours.planVisit.pricing.title')}
              </h3>
              <p className="text-foreground/70 mb-3">
                {translate('tours.planVisit.pricing.starting')}
              </p>
              <p className="text-sm text-foreground/70">
                {translate('tours.planVisit.pricing.custom')}
              </p>
            </Card>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {translate('tours.planVisit.specialEvents.title')}
            </h3>
            <p className="text-foreground/70 mb-6 max-w-2xl mx-auto">
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
            <p className="text-foreground/70 max-w-2xl mx-auto mb-8">
              {translate('tours.bookingSection.subtitle')}
            </p>
          </div>

          {/* FareHarbor Integration */}
          <div className="p-6 md:p-8 border border-border bg-background rounded-lg shadow-sm">
            <h3 className="text-2xl font-semibold mb-2 text-center">{translate('tours.bookingSection.cardTitle')}</h3>
            <p className="text-foreground/70 mb-6 text-center max-w-md mx-auto">
              {translate('tours.bookingSection.cardSubtitle')}
            </p>
            <FareHarborCalendar />
            <div className="mt-6 text-center">
              <a
                href={FAREHARBOR_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary underline hover:no-underline"
              >
                {translate('tours.bookingSection.bookNow')}
              </a>
              <p className="text-xs text-foreground/50 mt-2">
                {translate('tours.bookingSection.poweredBy')}
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-foreground/70">
              <strong className="text-foreground">{translate('tours.bookingSection.questions')}</strong> {translate('tours.bookingSection.questionsText')}
            </p>
          </div>
        </div>
      </section>

      {/* Guest Reviews */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {translate('guestStories.title')}
            </h2>
            <p className="text-foreground/70">
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
    </>
  )
}
