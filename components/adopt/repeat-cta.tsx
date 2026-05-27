import Link from 'next/link'

interface RepeatCtaProps {
  /** Big headline that closes the page — translated by caller. */
  heading: string
  /** Supporting line under the headline. */
  body: string
  /** Localised button labels. */
  monthlyCtaLabel: string
  yearlyCtaLabel: string
  /** Pre-built checkout URLs (already include any chosen alpaca slug). */
  monthlyHref: string
  yearlyHref: string
  /** Optional name of the alpaca the donor pre-selected — appears in the headline when set. */
  alpacaName?: string | null
  /** Localised "you picked X" copy template. Caller substitutes the name. */
  alpacaPickedNote?: string
}

/**
 * RepeatCta — closing CTA after the FAQ so donors don't have to scroll back
 * up to convert. Reuses the page-level checkout URLs so any alpaca picker
 * state stays threaded into the Stripe / Mollie session.
 *
 * Pure render. All copy comes from props for i18n.
 */
export function RepeatCta({
  heading,
  body,
  monthlyCtaLabel,
  yearlyCtaLabel,
  monthlyHref,
  yearlyHref,
  alpacaName,
  alpacaPickedNote,
}: RepeatCtaProps) {
  return (
    <section
      aria-labelledby="repeat-cta-heading"
      className="rounded-3xl bg-gradient-to-br from-primary/8 via-secondary/30 to-primary/8 border border-primary/20 px-6 py-12 md:py-16 max-w-3xl mx-auto text-center"
    >
      <span aria-hidden="true" className="text-4xl mb-4 inline-block">
        🦙
      </span>
      <h2
        id="repeat-cta-heading"
        className="text-3xl md:text-4xl font-bold text-foreground mb-4"
      >
        {heading}
      </h2>
      <p className="text-base text-foreground/75 max-w-xl mx-auto mb-3 leading-relaxed">
        {body}
      </p>

      {alpacaName && alpacaPickedNote && (
        <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary mb-6">
          <span aria-hidden="true">🎯</span>
          {alpacaPickedNote.replace('{name}', alpacaName)}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        <Link
          href={monthlyHref}
          className="inline-flex justify-center rounded-lg border border-primary px-8 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          {monthlyCtaLabel}
        </Link>
        <Link
          href={yearlyHref}
          className="inline-flex justify-center rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          {yearlyCtaLabel}
        </Link>
      </div>
    </section>
  )
}
