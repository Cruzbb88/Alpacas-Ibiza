/**
 * /[locale]/herd-diary — Public Herd Diary feed.
 *
 * Server component. Renders liveHerdEvents() as a vertical timeline.
 * Empty state shown when no events are live (owner populates herd-events.ts).
 * FAILSAFE: renders null sections when arrays are empty — never invents events.
 */

import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import Link from 'next/link'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { GradientPageHero, PageSection } from '@/components/layout'
import { liveHerdEvents } from '@/lib/data/herd-events'
import { ALPACAS } from '@/lib/data/alpacas'

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const translate = await getTranslations({ locale })
  const title =
    translate('herdDiary.metaTitle') ||
    'Herd Diary | Alpacas Ibiza — Life with the Es Currals Alpacas'
  const description =
    translate('herdDiary.metaDescription') ||
    'Follow the day-to-day life of the 14 named alpacas at Es Currals — shearing days, health checks, milestones, and farm moments, straight from the herd.'
  return {
    title,
    description,
    alternates: buildLocaleAlternates(locale, 'herd-diary'),
    openGraph: { title, description },
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function HerdDiaryPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const translate = await getTranslations({ locale })

  const events = liveHerdEvents()

  return (
    <>
      <PageBreadcrumbs
        locale={locale}
        homeLabel={translate('nav.home') || 'Home'}
        crumbs={[
          { name: translate('nav.alpacas') || 'Our Alpacas', path: 'alpacas' },
          {
            name: translate('herdDiary.heading') || 'Herd Diary',
            path: 'herd-diary',
          },
        ]}
      />

      <GradientPageHero
        title={translate('herdDiary.heading') || 'Herd Diary'}
        subtitle={
          translate('herdDiary.subhead') ||
          'Real moments from the farm — shearing days, health checks, and everyday life with the herd.'
        }
        backgroundImage="/images/gallery/herd-chicas.jpg"
      />

      <PageSection>
        {events.length === 0 ? (
          /* ── Empty state — shown until owner supplies events ── */
          <div className="py-16 text-center">
            <p className="text-muted-foreground max-w-md mx-auto">
              {translate('herdDiary.emptyState') ||
                'The herd diary is just getting started — check back soon.'}
            </p>
          </div>
        ) : (
          /* ── Timeline feed ── */
          <ol className="relative border-l border-border space-y-10 pl-6">
            {events.map((event) => {
              // Resolve display names for alpaca chips
              const alpacaNames = event.alpacaSlugs
                .map((slug) => ALPACAS.find((a) => a.id === slug)?.name ?? slug)

              return (
                <li key={event.id} className="relative">
                  {/* Timeline dot */}
                  <span
                    aria-hidden="true"
                    className="absolute -left-[1.625rem] top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background"
                  />

                  {/* Event card */}
                  <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    {/* Date */}
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      <time dateTime={event.date}>
                        {translate('herdDiary.eventDateLabel') || 'Date'}:{' '}
                        {event.date}
                      </time>
                    </p>

                    {/* Title */}
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                      {event.title}
                    </h2>

                    {/* Image (optional) */}
                    {event.imageSrc && (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3 bg-muted">
                        <Image
                          src={event.imageSrc}
                          alt={event.title}
                          fill
                          sizes="(min-width: 768px) 672px, 100vw"
                          className="object-cover"
                        />
                      </div>
                    )}

                    {/* Body */}
                    <p className="text-foreground/80 text-sm leading-relaxed mb-3">
                      {event.body}
                    </p>

                    {/* Alpaca chips */}
                    {alpacaNames.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {alpacaNames.map((name, i) => {
                          const slug = event.alpacaSlugs[i]
                          return (
                            <Link
                              key={slug}
                              href={`/${locale}/alpacas/${slug}`}
                              className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-0.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                              <span className="sr-only">
                                {translate('herdDiary.alpacaChipLabel') ||
                                  'Alpaca'}:{' '}
                              </span>
                              {name}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </article>
                </li>
              )
            })}
          </ol>
        )}
      </PageSection>
    </>
  )
}
