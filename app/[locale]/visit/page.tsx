import type { Metadata } from 'next'
import Link from 'next/link'
import { t } from '@/lib/translations'
import type { Locale } from '@/i18n.config'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { getOgImage } from '@/lib/og-images'
import { localBusinessSchema, toJsonLd } from '@/lib/structured-data'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = t(locale)
  const ogImage = getOgImage('about', 'Plan Your Visit – Alpacas Ibiza Es Currals')
  return {
    title: tr('visit.metaTitle', 'Plan Your Visit | Alpacas Ibiza – Es Currals Farm Ibiza'),
    description: tr(
      'visit.metaDescription',
      'Everything you need before arriving at Es Currals alpaca farm in northern Ibiza — directions, parking, accessibility, what to bring, and cancellation policy.',
    ),
    alternates: buildLocaleAlternates(locale, 'visit'),
    openGraph: {
      title: tr('visit.metaTitle', 'Plan Your Visit | Alpacas Ibiza – Es Currals Farm Ibiza'),
      description: tr(
        'visit.metaDescription',
        'Everything you need before arriving at Es Currals alpaca farm in northern Ibiza.',
      ),
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage.url],
    },
  }
}

// Minimal Place JSON-LD for the visit page — localBusinessSchema covers all
// fields we have confirmed; a standalone Place block would duplicate them.
function visitPlaceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: 'Es Currals Alpacas Ibiza',
    url: 'https://alpacasibiza.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'San Carlos',
      addressLocality: 'Santa Eulària des Riu',
      addressRegion: 'Islas Baleares',
      addressCountry: 'ES',
      postalCode: '07819',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 38.9861,
      longitude: 1.5228,
    },
    hasMap: 'https://maps.google.com/?q=38.9861,1.5228',
    telephone: '+32475586544',
    email: 'info@alpacasibiza.com',
  }
}

export default async function VisitPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const tr = t(locale)

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(visitPlaceSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(localBusinessSchema()) }}
      />

      <PageBreadcrumbs
        locale={locale}
        homeLabel={tr('nav.home') || 'Home'}
        crumbs={[{ name: tr('nav.visit') || 'Visit', path: 'visit' }]}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {tr('visit.title', 'Planning your visit')}
          </h1>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            {tr(
              'visit.subhead',
              'Everything you need before you arrive at Es Currals, the farm in northern Ibiza.',
            )}
          </p>
        </div>
      </section>

      {/* ── Section A — Getting here ──────────────────────────────────────── */}
      <section className="w-full py-16 md:py-24 px-4 bg-background" aria-labelledby="getting-here-heading">
        <div className="max-w-6xl mx-auto">
          <h2 id="getting-here-heading" className="text-3xl font-bold text-foreground mb-10 text-center">
            {tr('visit.gettingHere.heading', 'Getting here')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* By car */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl" aria-hidden="true">🚗</div>
              <h3 className="font-semibold text-foreground text-lg">
                {tr('visit.gettingHere.byCar.title', 'By car')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.gettingHere.byCar.body',
                  'From Ibiza Town: approx. [UNMAPPED] minutes via PM-810. From Santa Eulàlia: approx. [UNMAPPED] minutes. Free parking on-site.',
                )}
              </p>
            </div>

            {/* From the airport */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl" aria-hidden="true">✈️</div>
              <h3 className="font-semibold text-foreground text-lg">
                {tr('visit.gettingHere.fromAirport.title', 'From the airport')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.gettingHere.fromAirport.body',
                  'Ibiza Airport (IBZ) is approx. [UNMAPPED] km — roughly [UNMAPPED] minutes by car or taxi. Taxis available at the airport rank; no pre-booking required.',
                )}
              </p>
            </div>

            {/* By bus */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl" aria-hidden="true">🚌</div>
              <h3 className="font-semibold text-foreground text-lg">
                {tr('visit.gettingHere.byBus.title', 'By bus')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.gettingHere.byBus.body',
                  'Nearest bus stop: [UNMAPPED] — approx. [UNMAPPED] minutes walk to the farm. Check ibizabus.com for routes. A car or taxi is recommended for the final stretch.',
                )}
              </p>
            </div>

            {/* GPS & map links */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl" aria-hidden="true">📍</div>
              <h3 className="font-semibold text-foreground text-lg">
                {tr('visit.gettingHere.gps.title', 'GPS & maps')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed mb-3">
                {tr('visit.gettingHere.gps.body', 'GPS: 38.9861° N, 1.5228° E. Search «Alpacas Ibiza, San Carlos» if deep links don\'t open.')}
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://maps.google.com/?q=38.9861,1.5228"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary underline hover:text-primary/80"
                >
                  {tr('visit.gettingHere.gps.googleMaps', 'Open in Google Maps')}
                </a>
                <a
                  href="https://maps.apple.com/?ll=38.9861,1.5228"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary underline hover:text-primary/80"
                >
                  {tr('visit.gettingHere.gps.appleMaps', 'Open in Apple Maps')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section B — When you arrive ──────────────────────────────────── */}
      <section className="w-full py-16 md:py-24 px-4 bg-muted/40" aria-labelledby="on-arrival-heading">
        <div className="max-w-4xl mx-auto">
          <h2 id="on-arrival-heading" className="text-3xl font-bold text-foreground mb-10 text-center">
            {tr('visit.onArrival.heading', 'When you arrive')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.onArrival.parking.title', 'Where to park')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.onArrival.parking.body',
                  '[UNMAPPED: parking location details]. Free on-site parking available.',
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.onArrival.meetingPoint.title', 'Meeting point')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.onArrival.meetingPoint.body',
                  'Meet your guide at the farm gate. Your host will greet you and walk you in.',
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.onArrival.duration.title', 'Tour duration')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.onArrival.duration.body', 'Duration depends on your tour type.')}{' '}
                <Link href={`/${locale}/tours`} className="text-primary underline hover:text-primary/80 text-sm">
                  {tr('visit.onArrival.duration.link', 'See all tours →')}
                </Link>
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.onArrival.bring.title', 'What to bring')}
              </h3>
              <ul className="text-sm text-foreground/70 leading-relaxed space-y-1 list-disc list-inside">
                <li>{tr('visit.onArrival.bring.shoes', 'Comfortable, closed-toe shoes')}</li>
                <li>{tr('visit.onArrival.bring.hat', 'Sun hat (the farm is outdoors)')}</li>
                <li>{tr('visit.onArrival.bring.water', 'Water bottle')}</li>
                <li>{tr('visit.onArrival.bring.noPerfume', 'No strong perfume — alpacas are sensitive to scent')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section C — Accessibility ─────────────────────────────────────── */}
      <section className="w-full py-16 md:py-24 px-4 bg-background" aria-labelledby="accessibility-heading">
        <div className="max-w-4xl mx-auto">
          <h2 id="accessibility-heading" className="text-3xl font-bold text-foreground mb-10 text-center">
            {tr('visit.accessibility.heading', 'Accessibility & guests')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.accessibility.mobility.title', 'Mobility')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.accessibility.mobility.body',
                  'Most of the farm is flat dirt and grass. Some sections are uneven terrain. Please contact us in advance so we can plan the best route for you.',
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.accessibility.children.title', 'Children')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.accessibility.children.body',
                  'Children are welcome at all ages. They must be supervised by an adult at all times near the herd.',
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.accessibility.pets.title', 'Pets')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.accessibility.pets.body',
                  'Pets are not permitted on the farm. The presence of dogs and cats unsettles the herd.',
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.accessibility.serviceAnimals.title', 'Service animals')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.accessibility.serviceAnimals.bodyPrefix', 'Service animals are permitted with advance notice. Please')}{' '}
                <Link href={`/${locale}/contact`} className="text-primary underline hover:text-primary/80 text-sm">
                  {tr('visit.accessibility.serviceAnimals.contactLink', 'contact us')}
                </Link>{' '}
                {tr('visit.accessibility.serviceAnimals.bodySuffix', 'before your visit so we can prepare the herd.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section D — Cancellation policy ──────────────────────────────── */}
      <section className="w-full py-16 md:py-24 px-4 bg-muted/40" aria-labelledby="cancellation-heading">
        <div className="max-w-4xl mx-auto">
          <h2 id="cancellation-heading" className="text-3xl font-bold text-foreground mb-10 text-center">
            {tr('visit.cancellation.heading', 'Cancellation policy')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.cancellation.free.title', 'Free cancellation')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.cancellation.free.body',
                  'Cancel up to 24 hours before your visit for a full refund. Refunds are processed within 5–10 business days.',
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.cancellation.weather.title', 'Bad weather')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.cancellation.weather.body',
                  'Light rain: we still run the tour. Thunderstorm or severe weather: we reschedule for free.',
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.cancellation.lateNotice.title', 'Late cancellations')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.cancellation.lateNotice.body',
                  'Cancellations within 24 hours may incur a fee. Contact us as early as possible and we\'ll do our best to accommodate you.',
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section E — Photos welcome ────────────────────────────────────── */}
      <section className="w-full py-16 md:py-24 px-4 bg-background" aria-labelledby="photos-heading">
        <div className="max-w-4xl mx-auto">
          <h2 id="photos-heading" className="text-3xl font-bold text-foreground mb-10 text-center">
            {tr('visit.photos.heading', 'Photos & filming')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.photos.personal.title', 'Personal photography')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr(
                  'visit.photos.personal.body',
                  'Yes — photograph and film anywhere on the farm for personal use. The alpacas are famously photogenic.',
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.photos.commercial.title', 'Commercial use')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.photos.commercial.bodyPrefix', 'For commercial shoots, branded content, or media, please review our')}{' '}
                <Link href={`/${locale}/press-kit`} className="text-primary underline hover:text-primary/80 text-sm">
                  {tr('visit.photos.commercial.pressKitLink', 'press kit')}
                </Link>{' '}
                {tr('visit.photos.commercial.bodySuffix', 'and contact us before your visit.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTAs ───────────────────────────────────────────────────── */}
      <section className="w-full py-16 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-8">
            {tr('visit.ctas.heading', 'Ready to visit?')}
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/tours`}
              className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {tr('visit.ctas.bookTour', 'Book a tour')}
            </Link>
            <Link
              href={`/${locale}/alpacas`}
              className="inline-block rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-primary/5"
            >
              {tr('visit.ctas.seeHerd', 'See the herd')}
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="inline-block rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-primary/5"
            >
              {tr('visit.ctas.contact', 'Contact us')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
