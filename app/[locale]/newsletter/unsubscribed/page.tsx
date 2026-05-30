/**
 * /[locale]/newsletter/unsubscribed
 *
 * Landing page shown after one-click unsubscribe (GET or POST from email client).
 * Reached via 303 redirect from GET /api/newsletter/unsubscribe?token=...
 *
 * This page renders the same success state regardless of whether the token was
 * valid or expired — never reveals subscription state to a third party.
 *
 * CAN-SPAM § 5(a)(6): process must honour opt-out within 10 business days.
 * EU PECR: opt-out must be straightforward and take effect immediately.
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
    route: '/newsletter/unsubscribed',
    titleOverride: "You've been unsubscribed | Alpacas Ibiza",
    descriptionOverride: 'You have been removed from the Alpacas Ibiza newsletter.',
    robotsOverride: { index: false, follow: false },  // noindex — avoid cluttering SERPs
  })
}

export default async function NewsletterUnsubscribedPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  return (
    <main>
      <GradientPageHero
        title="You've been unsubscribed"
        subtitle="We'll miss you — but we respect your choice."
      />

      <PageSection>
        <div className="max-w-lg mx-auto text-center py-8">
          <p className="text-foreground/70 mb-6">
            Your email address has been removed from our newsletter list. You
            won't receive any further messages from us.
          </p>
          <p className="text-foreground/70 mb-8">
            If you unsubscribed by mistake or change your mind later, you're
            always welcome to{' '}
            <a
              href={`/${locale}#newsletter`}
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              sign up again
            </a>
            .
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`/${locale}`}
              className="inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
            >
              Back to the farm
            </a>
            <a
              href={`/${locale}/journal`}
              className="inline-flex items-center justify-center px-6 py-3 border border-border hover:bg-muted text-foreground rounded-lg font-medium transition-colors"
            >
              Browse the journal
            </a>
          </div>
        </div>
      </PageSection>
    </main>
  )
}
