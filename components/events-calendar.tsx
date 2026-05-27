import Link from 'next/link'
import { upcomingEvents, hasUpcomingEvents } from '@/lib/data/events'

interface EventsCalendarProps {
  title?: string
  subtitle?: string
  limit?: number
  className?: string
}

function formatEventDate(event: { date: string | null; recurrence?: string | null }): string {
  if (event.recurrence) {
    if (event.recurrence.startsWith('weekly:')) {
      const days = event.recurrence.slice('weekly:'.length).split(',').map((d) => d.trim())
      const dayNames: Record<string, string> = {
        mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
        fri: 'Fri', sat: 'Sat', sun: 'Sun',
      }
      return `Every ${days.map((d) => dayNames[d] ?? d).join(' & ')}`
    }
    return event.recurrence
  }
  if (!event.date) return 'TBC'
  const d = new Date(event.date)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * "What's On" events calendar — surfaces upcoming farm events chronologically.
 *
 * Fail-quiet: renders null in production when no events are live.
 * In dev mode, renders an amber hint box so the slot is visible before content exists.
 *
 * Owner checklist:
 *   1. Add entries to lib/data/events.ts with status: 'live'
 *   2. Set `date` (ISO) for one-off events OR `recurrence` for recurring
 *   3. Component auto-filters past one-off events; recurring events always show
 *   4. Decide: render on home page (current, limit=3) or move to a dedicated /events route
 *
 * Failsafe: hasUpcomingEvents() → false → component renders null (production).
 * Named in CLAUDE.md failsafe map after landing.
 */
export function EventsCalendar({ title, subtitle, limit, className = '' }: EventsCalendarProps) {
  // Fail-quiet: no upcoming events → nothing in production
  if (!hasUpcomingEvents()) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="border border-dashed border-amber-300 bg-amber-50 text-amber-900 text-xs px-3 py-2 rounded my-4 mx-4">
          [EventsCalendar] No upcoming events. Owner: add entries to lib/data/events.ts with status: &apos;live&apos;.
          Production renders nothing until populated.
        </div>
      )
    }
    return null
  }

  const items = limit ? upcomingEvents().slice(0, limit) : upcomingEvents()

  return (
    <section className={`py-16 ${className}`} aria-label="Upcoming events">
      <div className="container mx-auto px-4">
        {title && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{title}</h2>
        )}
        {subtitle && (
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">{subtitle}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {items.map((event) => (
            <article
              key={event.id}
              className="bg-card border border-border rounded-lg p-6 flex flex-col"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                {formatEventDate(event)}
              </div>
              <h3 className="text-xl font-bold mb-2">{event.title}</h3>
              {event.description && (
                <p className="text-muted-foreground text-sm mb-3 flex-1">{event.description}</p>
              )}
              <div className="text-xs text-muted-foreground mb-4 space-y-1">
                {event.durationMinutes && <div>Duration: {event.durationMinutes} min</div>}
                {event.capacity && <div>Max {event.capacity} guests</div>}
                {event.priceLabel && (
                  <div className="font-semibold text-foreground">{event.priceLabel}</div>
                )}
              </div>
              {event.ctaUrl && (
                <Link
                  href={event.ctaUrl}
                  className="inline-block text-center bg-accent text-accent-foreground px-4 py-2 rounded font-medium hover:opacity-90"
                >
                  {event.ctaLabel ?? 'Learn more'}
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
