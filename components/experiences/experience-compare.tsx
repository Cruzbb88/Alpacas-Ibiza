import Link from 'next/link'
import { Clock, Users, Heart, Calendar, Sparkles, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ExperienceVibe =
  | 'romantic'
  | 'family'
  | 'wellness'
  | 'corporate'
  | 'creative'
  | 'celebration'
  | 'classic'

interface ExperienceRow {
  /** Stable slug — used as React key and CTA href segment. */
  slug: string
  /** Display title (translated by caller). */
  title: string
  /** Emoji or single-character glyph rendered above the title — decorative. */
  icon: string
  /** One-liner sub-title rendered under the title (translated). */
  oneLiner: string
  /** Duration string e.g. "2 hours" — caller translates. */
  duration: string
  /** Group size string e.g. "Up to 6 guests" — caller translates. */
  groupSize: string
  /** Price-from string e.g. "From €45 / person" — caller translates. */
  priceFrom: string
  /** Vibe tag — drives a coloured badge + decorative icon. */
  vibe: ExperienceVibe
  /** Vibe label shown in the badge (translated). */
  vibeLabel: string
  /** 3-5 short bullets describing what's included. */
  includes: string[]
  /** Internal route on this site (e.g. /[locale]/yoga). Falls back to /tours. */
  href: string
  /** CTA button label, e.g. "Learn more" or "Book yoga" (translated). */
  ctaLabel: string
}

interface ExperienceCompareProps {
  heading: string
  subheading?: string
  rows: ExperienceRow[]
}

const VIBE_ICONS: Record<ExperienceVibe, LucideIcon> = {
  romantic: Heart,
  family: Users,
  wellness: Sparkles,
  corporate: Zap,
  creative: Sparkles,
  celebration: Calendar,
  classic: Clock,
}

const VIBE_CLASSES: Record<ExperienceVibe, string> = {
  romantic: 'bg-rose-100 text-rose-700 border-rose-200',
  family: 'bg-amber-100 text-amber-700 border-amber-200',
  wellness: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  corporate: 'bg-slate-100 text-slate-700 border-slate-200',
  creative: 'bg-purple-100 text-purple-700 border-purple-200',
  celebration: 'bg-pink-100 text-pink-700 border-pink-200',
  classic: 'bg-primary/10 text-primary border-primary/20',
}

/**
 * ExperienceCompare — side-by-side facts grid for the 6+ alpaca-farm experiences.
 *
 * Helps visitors who land on the homepage / /experiences without knowing which
 * booking is right for them. Compact horizontal scroll on mobile (snap-x cards),
 * grid on tablet/desktop.
 *
 * Pure render. All copy + URLs come from the caller (one /experiences page
 * builds the rows from i18n + lib/config FareHarbor URLs).
 */
export function ExperienceCompare({ heading, subheading, rows }: ExperienceCompareProps) {
  return (
    <section aria-labelledby="exp-compare-heading" className="w-full">
      <div className="text-center mb-10">
        <h2
          id="exp-compare-heading"
          className="text-3xl md:text-4xl font-bold text-foreground mb-3"
        >
          {heading}
        </h2>
        {subheading && (
          <p className="text-foreground/70 max-w-2xl mx-auto">{subheading}</p>
        )}
      </div>

      {/* Mobile: horizontal snap-scroll. Desktop: 2/3 col grid. */}
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-x-auto snap-x snap-mandatory pb-4 md:overflow-visible md:pb-0 -mx-4 md:mx-0 px-4 md:px-0">
        {rows.map((row) => (
          <ExperienceCard key={row.slug} row={row} />
        ))}
      </div>
    </section>
  )
}

function ExperienceCard({ row }: { row: ExperienceRow }) {
  const VibeIcon = VIBE_ICONS[row.vibe]
  const vibeClass = VIBE_CLASSES[row.vibe]

  return (
    <article className="snap-start shrink-0 w-[80vw] sm:w-[60vw] md:w-auto flex flex-col bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 flex flex-col flex-1">
        {/* Vibe badge — top of card */}
        <span
          className={`inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${vibeClass} mb-4`}
        >
          <VibeIcon className="h-3 w-3" aria-hidden="true" />
          {row.vibeLabel}
        </span>

        <div className="flex items-start gap-3 mb-3">
          <span aria-hidden="true" className="text-3xl shrink-0">
            {row.icon}
          </span>
          <div>
            <h3 className="text-xl font-bold text-foreground leading-tight">{row.title}</h3>
            <p className="text-sm text-foreground/70 mt-1">{row.oneLiner}</p>
          </div>
        </div>

        {/* Facts strip */}
        <dl className="grid grid-cols-3 gap-2 my-4 text-center border-y border-border py-3 text-xs">
          <Fact icon={Clock} label="Duration" value={row.duration} />
          <Fact icon={Users} label="Group" value={row.groupSize} />
          <Fact icon={Sparkles} label="From" value={row.priceFrom} />
        </dl>

        {/* What's included list */}
        <ul className="list-none p-0 space-y-2 mb-6 flex-1">
          {row.includes.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
              <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        <Link
          href={row.href}
          className="mt-auto inline-flex justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          aria-label={`${row.ctaLabel} — ${row.title}`}
        >
          {row.ctaLabel}
        </Link>
      </div>
    </article>
  )
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div>
      <Icon
        className="h-4 w-4 mx-auto mb-1 text-foreground/50"
        aria-hidden="true"
      />
      <dt className="text-[10px] uppercase tracking-wider text-foreground/50">{label}</dt>
      <dd className="text-xs font-semibold text-foreground/85 mt-0.5">{value}</dd>
    </div>
  )
}
