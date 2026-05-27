import { t } from '@/lib/translations'
import type { Locale } from '@/i18n.config'
import { ContactForm } from '@/components/contact-form'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { TenantMap } from '@/components/tenant-map'
import { getDefaultTenant } from '@/lib/tenants/server'

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = t(locale)
  const tenant = getDefaultTenant()

  const formLabels = {
    name: translate('contact.name'),
    email: translate('contact.email'),
    subject: translate('contact.subject'),
    message: translate('contact.message'),
    send: translate('contact.send'),
    sending: translate('contact.sending') || 'Sending…',
    success: translate('contact.successMessage') || "Thank you! We'll be in touch soon.",
    error: translate('contact.errorMessage') || 'Something went wrong. Please try again.',
  }

  return (
    <main>
      <PageBreadcrumbs
        locale={locale}
        homeLabel={translate('nav.home') || 'Home'}
        crumbs={[{ name: translate('nav.contact') || 'Contact', path: 'contact' }]}
      />
      <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {translate('contact.title')}
          </h1>
          <p className="text-lg text-foreground/70">
            {translate('contact.subtitle')}
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {translate('contact.formTitle')}
            </h2>
            <ContactForm labels={formLabels} />
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {translate('contact.infoTitle')}
              </h2>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="text-2xl">📍</div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {translate('contact.location')}
                    </h3>
                    <p className="text-foreground/70">Ibiza, Spain</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="text-2xl">📞</div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {translate('contact.phone')}
                    </h3>
                    <p className="text-foreground/70">
                      <a href="tel:+32475586544" className="hover:text-primary transition-colors">
                        +32 475 58 65 44
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="text-2xl">✉️</div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {translate('contact.emailLabel')}
                    </h3>
                    <p className="text-foreground/70">
                      <a href="mailto:info@alpacasibiza.com" className="hover:text-primary transition-colors">
                        info@alpacasibiza.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="text-2xl">🕐</div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {translate('contact.hours')}
                    </h3>
                    <p className="text-foreground/70">
                      {translate('contact.byAppointment')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map — TenantMap pulls lat/lng from alpacasibiza.ts geo block.
          Falls back to OSM iframe if no Google Maps embed key is configured (fail-open). */}
      <TenantMap
        tenant={tenant}
        heading={translate('contact.mapHeading') || 'How to find us'}
        iframeTitle={translate('contact.mapIframeTitle') || 'Map showing Alpacas Ibiza location'}
        largerMapLabel={translate('contact.mapLargerLabel') || 'View larger map →'}
      />

      {/* Getting here — driving directions, parking, transit, coordinates */}
      <section className="w-full py-16 md:py-24 px-4 bg-muted/40">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-10 text-center">
            {translate('contact.gettingHere.heading') || 'Getting here'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* By car */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl">🚗</div>
              <h3 className="font-semibold text-foreground text-lg">
                {translate('contact.gettingHere.byCar.title') || 'By car'}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {translate('contact.gettingHere.byCar.body') ||
                  'From Ibiza Town: approx. [UNMAPPED] minutes via PM-810. From Santa Eulàlia: approx. [UNMAPPED] minutes. Free parking on-site.'}
              </p>
            </div>

            {/* From the airport */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl">✈️</div>
              <h3 className="font-semibold text-foreground text-lg">
                {translate('contact.gettingHere.fromAirport.title') || 'From the airport'}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {translate('contact.gettingHere.fromAirport.body') ||
                  'Ibiza Airport (IBZ) is approx. [UNMAPPED] km — roughly [UNMAPPED] minutes by car or taxi. Taxis available at the airport rank; no pre-booking required.'}
              </p>
            </div>

            {/* Public transit */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl">🚌</div>
              <h3 className="font-semibold text-foreground text-lg">
                {translate('contact.gettingHere.transit.title') || 'Public transit'}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {translate('contact.gettingHere.transit.body') ||
                  'Nearest bus stop approx. [UNMAPPED] minutes walk. Check ibizabus.com for routes. A car or taxi is recommended for the final stretch.'}
              </p>
            </div>

            {/* Coordinates */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="text-3xl">📍</div>
              <h3 className="font-semibold text-foreground text-lg">
                {translate('contact.gettingHere.coordinates.title') || 'Coordinates & backup nav'}
              </h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {translate('contact.gettingHere.coordinates.body') ||
                  'GPS: 38.9861° N, 1.5228° E. Search «Alpacas Ibiza, San Carlos» in Google Maps or Apple Maps. What3Words: [UNMAPPED — owner confirm].'}
              </p>
            </div>

          </div>
        </div>
      </section>
    </main>
  )
}

