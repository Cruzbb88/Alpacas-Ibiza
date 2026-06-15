/**
 * /[locale]/newsletter-confirmed
 *
 * Landing page shown after a subscriber clicks the double opt-in confirmation link.
 * Reached via 303 redirect from GET /api/newsletter/confirm?token=...
 *
 * The `email` query param is informational only — never rendered without escaping.
 */
import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { GradientPageHero, PageSection } from '@/components/layout'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const tenant = await getTenant()
  return tenantMetadata(tenant, {
    locale,
    route: '/newsletter-confirmed',
    titleOverride: 'Subscribed! | Alpacas Ibiza',
    descriptionOverride: 'You are now subscribed to the Alpacas Ibiza newsletter.',
  })
}

export default async function NewsletterConfirmedPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  return (
    <>
      <GradientPageHero
        title="You're subscribed! 🎉"
        subtitle="Look for our next field notes from the herd."
      />

      <PageSection>
        <div className="max-w-lg mx-auto text-center py-8">
          <p className="text-muted-foreground mb-8">
            Thanks for confirming your email. We'll send occasional updates from the farm —
            new arrivals, weaving seasons, and stories from Es Currals.
          </p>
          <a
            href={`/${locale}/journal`}
            className="inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
          >
            Browse the journal
          </a>
        </div>
      </PageSection>
    </>
  )
}
