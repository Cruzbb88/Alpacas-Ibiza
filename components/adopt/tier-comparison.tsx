import { Check, X } from 'lucide-react'

interface TierFeature {
  /** Short label shown in the left-most column. */
  label: string
  /** Inclusion in the monthly tier. true = check, false = X, string = note. */
  monthly: boolean | string
  /** Inclusion in the yearly tier. */
  yearly: boolean | string
}

interface TierComparisonProps {
  /** Heading above the table — i18n-translated by caller. */
  title: string
  /** Subheading under the heading. */
  subtitle?: string
  /** Localised "Monthly" / "Yearly" column headers. */
  monthlyLabel: string
  yearlyLabel: string
  /** Localised price strings under each header. */
  monthlyPrice: string
  yearlyPrice: string
  /** Optional badge to overlay on the yearly column (e.g. "Best value"). */
  yearlyBadge?: string
  /** Row-by-row perk comparison. */
  features: TierFeature[]
  /** Localised CTA button labels — open the actual checkout. */
  monthlyCtaLabel: string
  yearlyCtaLabel: string
  monthlyHref: string
  yearlyHref: string
  /** Localised label for the "what you get" / features column header. */
  whatYouGetLabel?: string
}

/**
 * TierComparison — side-by-side perk-comparison table for monthly vs yearly.
 *
 * Replaces the old plain 2-card pricing layout. Each row in `features` shows
 * one perk and whether it's included in each tier (Check / X / annotated string).
 * The yearly column gets a coloured background + badge to highlight commitment.
 *
 * Self-contained — accepts all copy + URLs as props so the /adopt page owns
 * i18n + URL construction. No client-side state; pure render.
 */
export function TierComparison({
  title,
  subtitle,
  monthlyLabel,
  yearlyLabel,
  monthlyPrice,
  yearlyPrice,
  yearlyBadge,
  features,
  monthlyCtaLabel,
  yearlyCtaLabel,
  monthlyHref,
  yearlyHref,
  whatYouGetLabel = 'What you get',
}: TierComparisonProps) {
  return (
    <section aria-labelledby="tier-comparison-heading" className="w-full">
      <div className="text-center mb-10">
        <h2
          id="tier-comparison-heading"
          className="text-3xl md:text-4xl font-bold text-foreground mb-3"
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        )}
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full max-w-4xl mx-auto border-collapse bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
          <thead>
            <tr>
              <th className="text-left px-6 py-5 bg-card font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                {whatYouGetLabel}
              </th>
              <th className="text-center px-6 py-5 bg-card font-semibold text-foreground border-l border-border">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  {monthlyLabel}
                </div>
                <div className="text-2xl font-bold">{monthlyPrice}</div>
              </th>
              <th className="text-center px-6 py-5 bg-primary/10 font-semibold text-foreground border-l-2 border-primary/40 relative">
                {yearlyBadge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    {yearlyBadge}
                  </span>
                )}
                <div className="text-xs uppercase tracking-wide text-primary mb-1">
                  {yearlyLabel}
                </div>
                <div className="text-2xl font-bold">{yearlyPrice}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? 'bg-background' : 'bg-secondary/15'}
              >
                <td className="px-6 py-4 text-sm text-foreground/85 border-t border-border">
                  {feature.label}
                </td>
                <td className="text-center px-6 py-4 border-t border-l border-border">
                  <TierCell value={feature.monthly} />
                </td>
                <td className="text-center px-6 py-4 border-t border-l-2 border-primary/40 bg-primary/5">
                  <TierCell value={feature.yearly} accent />
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-6 py-6 border-t border-border" />
              <td className="text-center px-6 py-6 border-t border-l border-border">
                <a
                  href={monthlyHref}
                  className="inline-block rounded-lg border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                >
                  {monthlyCtaLabel}
                </a>
              </td>
              <td className="text-center px-6 py-6 border-t border-l-2 border-primary/40 bg-primary/5">
                <a
                  href={yearlyHref}
                  className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {yearlyCtaLabel}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards — one tier per card with embedded checklist */}
      <div className="md:hidden flex flex-col gap-6 max-w-md mx-auto">
        <MobileTierCard
          tierLabel={monthlyLabel}
          price={monthlyPrice}
          features={features.map((f) => ({ label: f.label, value: f.monthly }))}
          ctaHref={monthlyHref}
          ctaLabel={monthlyCtaLabel}
          accent={false}
        />
        <MobileTierCard
          tierLabel={yearlyLabel}
          price={yearlyPrice}
          badge={yearlyBadge}
          features={features.map((f) => ({ label: f.label, value: f.yearly }))}
          ctaHref={yearlyHref}
          ctaLabel={yearlyCtaLabel}
          accent
        />
      </div>
    </section>
  )
}

function TierCell({ value, accent = false }: { value: boolean | string; accent?: boolean }) {
  if (value === true) {
    return (
      <Check
        className={`h-5 w-5 inline-block ${accent ? 'text-primary' : 'text-primary/70'}`}
        aria-label="included"
      />
    )
  }
  if (value === false) {
    return (
      <X
        className="h-5 w-5 inline-block text-muted-foreground/40"
        aria-label="not included"
      />
    )
  }
  return (
    <span className={`text-sm font-medium ${accent ? 'text-primary' : 'text-foreground/80'}`}>
      {value}
    </span>
  )
}

function MobileTierCard({
  tierLabel,
  price,
  badge,
  features,
  ctaHref,
  ctaLabel,
  accent,
}: {
  tierLabel: string
  price: string
  badge?: string
  features: Array<{ label: string; value: boolean | string }>
  ctaHref: string
  ctaLabel: string
  accent: boolean
}) {
  return (
    <div
      className={`relative rounded-2xl border-2 p-6 ${
        accent ? 'bg-primary/5 border-primary/40' : 'bg-card border-border'
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
          {badge}
        </span>
      )}
      <p
        className={`text-xs uppercase tracking-wide mb-2 font-semibold ${
          accent ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        {tierLabel}
      </p>
      <p className="text-3xl font-bold text-foreground mb-6">{price}</p>
      <ul className="space-y-3 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 shrink-0">
              <TierCell value={f.value} accent={accent} />
            </span>
            <span className="text-foreground/85">{f.label}</span>
          </li>
        ))}
      </ul>
      <a
        href={ctaHref}
        className={`block text-center rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
          accent
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border border-primary text-primary hover:bg-primary/5'
        }`}
      >
        {ctaLabel}
      </a>
    </div>
  )
}
