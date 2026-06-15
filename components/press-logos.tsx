import Image from 'next/image'
import { press, hasLivePress } from '@/lib/data/press'

interface PressLogosProps {
  title?: string   // e.g. "As featured in" — caller supplies, supports i18n
  className?: string
}

/**
 * Horizontal press-logo band — surfaces Belgian press coverage as a homepage trust signal.
 * Fail-quiet: renders nothing in production until owner provides at least one logo file.
 * This matches the GoogleReviewsBadge pattern (components/google-reviews-badge.tsx:39).
 *
 * Owner checklist:
 *   1. Drop files at public/images/press/<slug>.svg|png
 *   2. Set logoUrl: '/images/press/<slug>.svg' in lib/data/press.ts
 *   3. Optionally set articleUrl to the deep-link article
 *   4. Set status: 'live'
 */
export function PressLogos({ title, className = '' }: PressLogosProps) {
  // Fail-quiet: until owner provides at least one logo file, render nothing.
  // Matches GoogleReviewsBadge (components/google-reviews-badge.tsx:39): `if (!data.configured) return null`
  if (!hasLivePress()) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="border border-dashed border-amber-300 bg-amber-50 text-amber-900 text-xs px-3 py-2 rounded">
          <PressLogos.DevHint />
        </div>
      )
    }
    return null
  }

  const liveEntries = press.filter((p) => p.logoUrl !== null)

  return (
    <section
      className={`py-8 border-y border-border bg-muted/30 ${className}`}
      aria-label="Press mentions"
    >
      <div className="max-w-7xl mx-auto px-4">
        {title && (
          <p className="text-center text-sm uppercase tracking-wider text-muted-foreground mb-4">
            {title}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-70">
          {liveEntries.map((entry) => {
            const img = (
              <Image
                src={entry.logoUrl!}
                alt={entry.outlet}
                width={120}
                height={40}
                className="h-8 md:h-10 w-auto grayscale hover:grayscale-0 transition"
              />
            )
            return entry.articleUrl ? (
              <a
                key={entry.id}
                href={entry.articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {img}
              </a>
            ) : (
              <span key={entry.id} className="block">
                {img}
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}

PressLogos.DevHint = function PressLogosDevHint() {
  return (
    <>
      [PressLogos] No press logos configured. Owner: see OWNER_INPUT_NEEDED.md
      &ldquo;Press logos&rdquo; — provide files at public/images/press/&lt;slug&gt;.svg, then
      set logoUrl in lib/data/press.ts. Production renders nothing until populated.
    </>
  )
}
