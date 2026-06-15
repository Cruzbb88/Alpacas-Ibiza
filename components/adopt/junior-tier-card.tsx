import { JUNIOR_TIER_LIVE, JUNIOR_TIER_PRICE_EUR } from '@/lib/config'

interface JuniorTierCardProps {
  locale: string
  className?: string
  alpacaSlug?: string | null
}

/**
 * JuniorTierCard — env-gated server component for the junior (kids) tier.
 *
 * Renders null when JUNIOR_TIER_LIVE is false OR JUNIOR_TIER_PRICE_EUR is 0.
 * This guarantees zero layout impact on the /adopt page until the owner
 * supplies both env vars (OWNER_INPUT_NEEDED: see CLAUDE.md TIER2_VARS).
 *
 * Pattern mirrors AdoptTierCard visual shape but is a plain server component
 * — no GA4 tracking, no client hooks — because junior checkout is a simple
 * form POST, not a pre-built payment adapter URL.
 *
 * aria-label: "Junior adopter tier card"
 */
export function JuniorTierCard({ locale, className, alpacaSlug }: JuniorTierCardProps) {
  if (!JUNIOR_TIER_LIVE || JUNIOR_TIER_PRICE_EUR === 0) return null

  const priceLabel = `€${JUNIOR_TIER_PRICE_EUR}/month`
  const alpacaParam = alpacaSlug ? `&alpaca=${encodeURIComponent(alpacaSlug)}` : ''
  const actionUrl = `/api/junior-checkout?locale=${encodeURIComponent(locale)}${alpacaParam}`

  return (
    <article
      aria-label="Junior adopter tier card"
      className={
        'relative rounded-2xl p-8 flex flex-col items-center text-center transition-colors ' +
        'bg-card border border-border ' +
        (className ?? '')
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-muted-foreground">
        Junior adopter
      </p>

      <p className="text-4xl font-bold text-foreground mb-1 tabular-nums">{priceLabel}</p>

      <p className="text-sm text-muted-foreground mb-6">For young alpaca lovers</p>

      <ul className="text-sm text-muted-foreground mb-6 space-y-1 text-left list-none">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-primary" aria-hidden="true">✓</span>
          Digital adoption certificate
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-primary" aria-hidden="true">✓</span>
          Monthly alpaca photo &amp; updates
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-primary" aria-hidden="true">✓</span>
          Farm tour invitation
        </li>
      </ul>

      {/* Form POST to /api/junior-checkout with locale + optional ?alpaca= via JS */}
      <form method="POST" action={actionUrl} className="mt-auto w-full">
        <button
          type="submit"
          className="inline-flex w-full justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 border border-primary text-primary hover:bg-primary/5"
        >
          Start junior adoption — {priceLabel}
        </button>
      </form>
    </article>
  )
}
