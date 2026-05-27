import { liveTestimonials, hasLiveTestimonials } from '@/lib/data/testimonials'
import { TestimonialCard } from '@/components/testimonial-card'

interface TestimonialsWallProps {
  title?: string
  subtitle?: string
  /** Optional cap on number of cards shown; default renders all live entries. */
  limit?: number
  className?: string
}

/**
 * TestimonialsWall — 3-column responsive testimonial grid.
 *
 * Fail-quiet: renders nothing in production until at least one entry in
 * lib/data/testimonials.ts has status: 'live'. This mirrors the PressLogos
 * pattern (components/press-logos.tsx:23).
 *
 * Owner checklist:
 *   1. Add or set a testimonial entry to status: 'live' in lib/data/testimonials.ts
 *   2. Wall renders automatically — newest (by ISO date) first
 *   3. No code change required
 *
 * Dev mode shows an amber hint box when 0 live entries exist so the
 * absent section is obvious during local development.
 */
export function TestimonialsWall({
  title,
  subtitle,
  limit,
  className = '',
}: TestimonialsWallProps) {
  if (!hasLiveTestimonials()) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="border border-dashed border-amber-300 bg-amber-50 text-amber-900 text-xs px-3 py-2 rounded my-4">
          [TestimonialsWall] No live testimonials. Owner: add entries to{' '}
          <code>lib/data/testimonials.ts</code> with{' '}
          <code>status: &apos;live&apos;</code>. Production renders nothing.
        </div>
      )
    }
    return null
  }

  const items = limit ? liveTestimonials().slice(0, limit) : liveTestimonials()

  return (
    <section
      className={`py-12 md:py-16 ${className}`}
      aria-label="Guest testimonials"
    >
      <div className="container mx-auto px-4">
        {title && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((t) => (
            <TestimonialCard
              key={t.id}
              author={t.name}
              date={t.date}
              rating={t.rating}
              body={t.body}
              source={t.source}
              avatarUrl={t.photoUrl ?? null}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
