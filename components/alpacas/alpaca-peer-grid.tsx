/**
 * AlpacaPeerGrid — "meet the rest of the herd" thumbnail grid for the
 * /alpacas/[slug] detail page.
 *
 * Renders up to N peer alpacas (default 6) as AlpacaCards, excluding the
 * current alpaca. Renders nothing when there are no peers (single-alpaca
 * herd — currently impossible but defensive).
 *
 * Layout: 2 cols mobile → 3 cols tablet → 6 cols desktop, so the strip
 * stays one row at typical breakpoints.
 */

import type { Locale } from '@/i18n.config'
import type { AnimalEntity } from '@/lib/integrations/content-types'
import { AlpacaCard } from '@/components/alpaca-card'
import { t } from '@/lib/translations'

export const PEER_GRID_DEFAULT_LIMIT = 6

interface AlpacaPeerGridProps {
  locale: Locale
  /** Full herd from the content provider. */
  animals: ReadonlyArray<AnimalEntity>
  /** Slug of the alpaca currently being viewed — excluded from the peer list. */
  currentSlug: string
  /** Max peers to show. Defaults to PEER_GRID_DEFAULT_LIMIT (6). */
  limit?: number
  /** Override the section heading. */
  heading?: string
}

export function AlpacaPeerGrid({
  locale,
  animals,
  currentSlug,
  limit = PEER_GRID_DEFAULT_LIMIT,
  heading,
}: AlpacaPeerGridProps) {
  const translate = t(locale)
  const peers = animals.filter((a) => a.id !== currentSlug).slice(0, limit)
  if (peers.length === 0) return null

  const headingText = heading ?? translate('alpacas.restOfHerd', 'Meet the rest of the herd')

  return (
    <section aria-labelledby="alpaca-peer-grid-heading">
      <h2
        id="alpaca-peer-grid-heading"
        className="text-2xl font-bold text-foreground text-center mb-8"
      >
        {headingText}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {peers.map((peer) => (
          <AlpacaCard key={peer.id} alpaca={peer} locale={locale} showAdoptCta={false} />
        ))}
      </div>
    </section>
  )
}
