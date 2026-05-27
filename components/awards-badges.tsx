import Image from 'next/image'
import Link from 'next/link'
import { liveAwards, hasLiveAwards, type AwardCategory } from '@/lib/data/awards'

interface AwardsBadgesProps {
  title?: string          // e.g. "Certified & recognised" — caller supplies, supports i18n
  category?: AwardCategory  // optional filter: only show one category
  className?: string
}

/**
 * Horizontal awards / certification badge band — surfaces trust signals
 * (TripAdvisor Travelers' Choice, Visit Ibiza, eco-certs, animal-welfare schemes, etc.).
 * Fail-quiet: renders nothing in production until owner provides at least one logo file.
 * Mirrors the PressLogos pattern (components/press-logos.tsx).
 *
 * Owner checklist:
 *   1. Drop files at public/images/awards/<slug>.svg|png
 *   2. Set logoUrl: '/images/awards/<slug>.svg' + status: 'live' in lib/data/awards.ts
 *   3. Optionally set verifyUrl to the issuing org's verification page
 *   4. Drop the component where needed:
 *        <AwardsBadges title="Certified & recognised" />                         — all
 *        <AwardsBadges title="Eco-certified" category="sustainability" />        — filtered
 *        <AwardsBadges title="Award-winning" category="travel-award" />         — filtered
 */
export function AwardsBadges({ title, category, className = '' }: AwardsBadgesProps) {
  // Fail-quiet: until owner provides at least one live logo, render nothing.
  if (!hasLiveAwards()) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="border border-dashed border-amber-300 bg-amber-50 text-amber-900 text-xs px-3 py-2 rounded my-4">
          <AwardsBadges.DevHint />
        </div>
      )
    }
    return null
  }

  const items = liveAwards(category)
  if (items.length === 0) return null

  return (
    <section
      className={`py-8 border-y border-border bg-muted/30 ${className}`}
      aria-label={title ?? 'Awards and certifications'}
    >
      <div className="max-w-7xl mx-auto px-4">
        {title && (
          <p className="text-center text-sm uppercase tracking-wider text-foreground/60 mb-4">
            {title}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-80">
          {items.map((award) => {
            const img = (
              <Image
                src={award.logoUrl!}
                alt={`${award.name} — ${award.issuer}`}
                width={120}
                height={48}
                className="h-10 md:h-12 w-auto grayscale hover:grayscale-0 transition"
              />
            )
            return award.verifyUrl ? (
              <Link
                key={award.id}
                href={award.verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                title={`Verify ${award.name}${award.year ? ` (${award.year})` : ''}`}
              >
                {img}
              </Link>
            ) : (
              <span
                key={award.id}
                className="block"
                title={`${award.name}${award.year ? ` (${award.year})` : ''}`}
              >
                {img}
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}

AwardsBadges.DevHint = function AwardsBadgesDevHint() {
  return (
    <>
      [AwardsBadges] No awards configured. Owner: drop logo files at
      public/images/awards/&lt;slug&gt;.svg, then add an entry with logoUrl +
      status: &apos;live&apos; in lib/data/awards.ts. Production renders nothing until populated.
    </>
  )
}
