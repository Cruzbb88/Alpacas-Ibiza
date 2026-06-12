import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n.config'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { getOgImage } from '@/lib/og-images'
import { localBusinessSchema, toJsonLd } from '@/lib/structured-data'
import { getTenant } from '@/lib/tenant'
import { TenantMap } from '@/components/tenant-map'
import { VirtualFarmTour } from '@/components/virtual-farm-tour'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = await getTranslations()
  const ogImage = getOgImage('about', 'Plan Your Visit – Alpacas Ibiza Es Currals')
  return {
    title: tr('visit.metaTitle'),
    description: tr('visit.metaDescription'),
    alternates: buildLocaleAlternates(locale, 'visit'),
    openGraph: {
      title: tr('visit.metaTitle'),
      description: tr('visit.metaDescription'),
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
      postalCode: '07850',
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
  const tr = await getTranslations()
  const tenant = await getTenant()

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
      <section className="relative w-full overflow-hidden min-h-[300px] flex items-center py-20 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/gallery/farm-03.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {tr('visit.title')}
          </h1>
          <p className="text-lg text-white/85 max-w-2xl mx-auto">
            {tr('visit.subhead')}
          </p>
        </div>
      </section>

      {/* ── Virtual Farm Tour — scaffold, renders null until owner sets imageSrc + status: 'live' in lib/data/media.ts */}
      <VirtualFarmTour />

      {/* ── Section A — Getting here ──────────────────────────────────────── */}
      <section className="w-full py-16 md:py-24 px-4 bg-background" aria-labelledby="getting-here-heading">
        <div className="max-w-6xl mx-auto">
          <h2 id="getting-here-heading" className="text-3xl font-bold text-foreground mb-10 text-center">
            {tr('visit.gettingHere.heading')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* By car */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl" aria-hidden="true">🚗</div>
              <h3 className="font-semibold text-foreground text-lg">
                {tr('visit.gettingHere.byCar.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.gettingHere.byCar.body')}
              </p>
            </div>

            {/* From the airport */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl" aria-hidden="true">✈️</div>
              <h3 className="font-semibold text-foreground text-lg">
                {tr('visit.gettingHere.fromAirport.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.gettingHere.fromAirport.body')}
              </p>
            </div>

            {/* By bus */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl" aria-hidden="true">🚌</div>
              <h3 className="font-semibold text-foreground text-lg">
                {tr('visit.gettingHere.byBus.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.gettingHere.byBus.body')}
              </p>
            </div>

            {/* GPS & map links */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl" aria-hidden="true">📍</div>
              <h3 className="font-semibold text-foreground text-lg">
                {tr('visit.gettingHere.gps.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed mb-3">
                {tr('visit.gettingHere.gps.body')}
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://maps.google.com/?q=38.9861,1.5228"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary underline hover:text-primary/80"
                >
                  {tr('visit.gettingHere.gps.googleMaps')}
                </a>
                <a
                  href="https://maps.apple.com/?ll=38.9861,1.5228"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary underline hover:text-primary/80"
                >
                  {tr('visit.gettingHere.gps.appleMaps')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map — TenantMap renders an OSM iframe with NO API key (fail-open via
          lib/integrations/map.ts); auto-upgrades to Google Maps embed if
          GOOGLE_MAPS_EMBED_API_KEY is ever set. Same component as /contact. */}
      <TenantMap
        tenant={tenant}
        heading={tr('visit.mapHeading') || 'Find us on the map'}
        iframeTitle={tr('visit.mapIframeTitle') || 'Map showing Alpacas Ibiza location'}
        largerMapLabel={tr('visit.mapLargerLabel') || 'View larger map →'}
      />

      {/* ── Section B — When you arrive ──────────────────────────────────── */}
      <section className="w-full py-16 md:py-24 px-4 bg-muted/40" aria-labelledby="on-arrival-heading">
        <div className="max-w-4xl mx-auto">
          <h2 id="on-arrival-heading" className="text-3xl font-bold text-foreground mb-10 text-center">
            {tr('visit.onArrival.heading')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.onArrival.parking.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.onArrival.parking.body')}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.onArrival.meetingPoint.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.onArrival.meetingPoint.body')}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.onArrival.duration.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.onArrival.duration.body')}{' '}
                <Link href={`/${locale}/tours`} className="text-primary underline hover:text-primary/80 text-sm">
                  {tr('visit.onArrival.duration.link')}
                </Link>
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.onArrival.bring.title')}
              </h3>
              <ul className="text-sm text-foreground/70 leading-relaxed space-y-1 list-disc list-inside">
                <li>{tr('visit.onArrival.bring.shoes')}</li>
                <li>{tr('visit.onArrival.bring.hat')}</li>
                <li>{tr('visit.onArrival.bring.water')}</li>
                <li>{tr('visit.onArrival.bring.noPerfume')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section C — Accessibility ─────────────────────────────────────── */}
      <section className="w-full py-16 md:py-24 px-4 bg-background" aria-labelledby="accessibility-heading">
        <div className="max-w-4xl mx-auto">
          <h2 id="accessibility-heading" className="text-3xl font-bold text-foreground mb-10 text-center">
            {tr('visit.accessibility.heading')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.accessibility.mobility.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.accessibility.mobility.body')}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.accessibility.children.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.accessibility.children.body')}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.accessibility.pets.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.accessibility.pets.body')}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.accessibility.serviceAnimals.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.accessibility.serviceAnimals.bodyPrefix')}{' '}
                <Link href={`/${locale}/contact`} className="text-primary underline hover:text-primary/80 text-sm">
                  {tr('visit.accessibility.serviceAnimals.contactLink')}
                </Link>{' '}
                {tr('visit.accessibility.serviceAnimals.bodySuffix')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section D — Cancellation policy ──────────────────────────────── */}
      <section className="w-full py-16 md:py-24 px-4 bg-muted/40" aria-labelledby="cancellation-heading">
        <div className="max-w-4xl mx-auto">
          <h2 id="cancellation-heading" className="text-3xl font-bold text-foreground mb-10 text-center">
            {tr('visit.cancellation.heading')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.cancellation.free.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.cancellation.free.body')}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.cancellation.weather.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.cancellation.weather.body')}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.cancellation.lateNotice.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.cancellation.lateNotice.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section E — Photos welcome ────────────────────────────────────── */}
      <section className="w-full py-16 md:py-24 px-4 bg-background" aria-labelledby="photos-heading">
        <div className="max-w-4xl mx-auto">
          <h2 id="photos-heading" className="text-3xl font-bold text-foreground mb-10 text-center">
            {tr('visit.photos.heading')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.photos.personal.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.photos.personal.body')}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h3 className="font-semibold text-foreground">
                {tr('visit.photos.commercial.title')}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {tr('visit.photos.commercial.bodyPrefix')}{' '}
                <Link href={`/${locale}/press-kit`} className="text-primary underline hover:text-primary/80 text-sm">
                  {tr('visit.photos.commercial.pressKitLink')}
                </Link>{' '}
                {tr('visit.photos.commercial.bodySuffix')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTAs ───────────────────────────────────────────────────── */}
      <section className="w-full py-16 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-8">
            {tr('visit.ctas.heading')}
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/tours`}
              className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {tr('visit.ctas.bookTour')}
            </Link>
            <Link
              href={`/${locale}/alpacas`}
              className="inline-block rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-primary/5"
            >
              {tr('visit.ctas.seeHerd')}
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="inline-block rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-primary/5"
            >
              {tr('visit.ctas.contact')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
