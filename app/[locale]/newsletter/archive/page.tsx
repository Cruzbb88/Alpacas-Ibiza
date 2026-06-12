/**
 * /[locale]/newsletter/archive
 *
 * Public archive of past newsletter issues — Substack/Beehiiv pattern for
 * SEO and re-engagement. Issues are defined in lib/data/newsletter-issues.ts.
 *
 * Empty state: "First issue coming soon" with newsletter signup CTA.
 * Otherwise: list of issue cards (title + date + summary + optional read link).
 *
 * Server component — no client state needed.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { GradientPageHero, PageSection } from '@/components/layout'
import { liveNewsletterIssues } from '@/lib/data/newsletter-issues'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const title = 'Newsletter Archive | Alpacas Ibiza'
  const description =
    'Browse past issues of the Alpacas Ibiza newsletter — farm updates, seasonal stories, and news from Es Currals.'
  return {
    title,
    description,
    alternates: buildLocaleAlternates(locale, 'newsletter/archive'),
    openGraph: { title, description },
    robots: { index: true, follow: true },
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export default async function NewsletterArchivePage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const issues = liveNewsletterIssues()

  return (
    <main>
      <GradientPageHero
        title="Newsletter Archive"
        subtitle="Past issues from Es Currals — farm stories, seasonal updates, and alpaca news."
      />

      <PageSection>
        {issues.length === 0 ? (
          /* Empty state — first issue not yet published */
          <div className="max-w-lg mx-auto text-center py-12">
            <p className="text-foreground/70 text-lg mb-6">
              First issue coming soon — subscribe to be the first to read it.
            </p>
            <Link
              href={`/${locale}#newsletter`}
              className="inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
            >
              Subscribe to the newsletter
            </Link>
          </div>
        ) : (
          /* Issue list */
          <div className="max-w-2xl mx-auto space-y-6 py-8">
            {issues.map((issue) => (
              <article
                key={issue.slug}
                className="rounded-2xl border border-border bg-card p-6 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                  <h2 className="font-semibold text-foreground text-lg leading-snug">
                    {issue.title}
                  </h2>
                  <time
                    dateTime={issue.publishedAt}
                    className="text-xs text-foreground/50 whitespace-nowrap pt-0.5"
                  >
                    {formatDate(issue.publishedAt)}
                  </time>
                </div>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {issue.summary}
                </p>
              </article>
            ))}

            {/* CTA to subscribe */}
            <div className="pt-4 text-center">
              <Link
                href={`/${locale}#newsletter`}
                className="inline-flex items-center justify-center px-5 py-2.5 border border-border hover:bg-primary/5 text-foreground rounded-lg font-medium transition-colors text-sm"
              >
                Subscribe to future issues
              </Link>
            </div>
          </div>
        )}
      </PageSection>
    </main>
  )
}
