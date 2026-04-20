import { t } from '@/lib/translations'
import type { Locale } from '@/i18n.config'
import { ContactForm } from '@/components/contact-form'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = t(locale)

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
    </main>
  )
}

