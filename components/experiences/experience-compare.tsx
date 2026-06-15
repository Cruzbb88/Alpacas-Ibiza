'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
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

import { SeasonalPriceList } from '@/components/seasonal-price-list'
import type { SeasonalPriceWindow } from '@/components/seasonal-price-list'

interface ExperienceCompareProps {
  heading: string
  subheading?: string
  rows: ExperienceRow[]
  /** Optional seasonal pricing windows. When provided, rendered below the single price. */
  seasonalWindows?: SeasonalPriceWindow[]
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

// Sandy-beige + nature-green palette: badges stay within the token family
// (green / accent / sand / muted) so they read as distinct categories without
// the old off-palette rainbow. Icon + label carry the finer distinction.
const VIBE_CLASSES: Record<ExperienceVibe, string> = {
  romantic: 'bg-accent/10 text-accent border-accent/20',
  family: 'bg-secondary text-secondary-foreground border-border',
  wellness: 'bg-primary/10 text-primary border-primary/20',
  corporate: 'bg-muted text-muted-foreground border-border',
  creative: 'bg-accent/10 text-accent border-accent/20',
  celebration: 'bg-secondary text-secondary-foreground border-border',
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
/** First integer in a price string ("From €30 / person" → 30). No number
 *  ("On request" / "Contact for pricing") sorts last in ascending order. */
function priceValue(priceFrom: string): number {
  const m = priceFrom.match(/\d+/)
  return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY
}

export function ExperienceCompare({ heading, subheading, rows, seasonalWindows }: ExperienceCompareProps) {
  const [sort, setSort] = useState<'featured' | 'price-asc'>('featured')

  const sortedRows = useMemo(() => {
    if (sort === 'featured') return rows
    return [...rows].sort((a, b) => priceValue(a.priceFrom) - priceValue(b.priceFrom))
  }, [rows, sort])

  const pill = (active: boolean) =>
    `px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-card text-muted-foreground border-border hover:border-primary/40'
    }`

  return (
    <section aria-labelledby="exp-compare-heading" className="w-full">
      <div className="text-center mb-6">
        <h2
          id="exp-compare-heading"
          className="text-3xl md:text-4xl font-bold text-foreground mb-3"
        >
          {heading}
        </h2>
        {subheading && (
          <p className="text-muted-foreground max-w-2xl mx-auto">{subheading}</p>
        )}
      </div>

      {/* Sort control — competitor scan: peers let visitors sort experiences by price. */}
      <div className="flex justify-center gap-2 mb-8" role="group" aria-label="Sort experiences">
        <button type="button" onClick={() => setSort('featured')} className={pill(sort === 'featured')} aria-pressed={sort === 'featured'}>
          Featured
        </button>
        <button type="button" onClick={() => setSort('price-asc')} className={pill(sort === 'price-asc')} aria-pressed={sort === 'price-asc'}>
          Price: low to high
        </button>
      </div>

      {/* Mobile: horizontal snap-scroll. Desktop: 2/3 col grid. */}
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-x-auto snap-x snap-mandatory pb-4 md:overflow-visible md:pb-0 -mx-4 md:mx-0 px-4 md:px-0">
        {sortedRows.map((row) => (
          <ExperienceCard key={row.slug} row={row} seasonalWindows={seasonalWindows} />
        ))}
      </div>
    </section>
  )
}

function ExperienceCard({ row, seasonalWindows }: { row: ExperienceRow; seasonalWindows?: SeasonalPriceWindow[] }) {
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
            <p className="text-sm text-muted-foreground mt-1">{row.oneLiner}</p>
          </div>
        </div>

        {/* Facts strip */}
        <dl className="grid grid-cols-3 gap-2 my-4 text-center border-y border-border py-3 text-xs">
          <Fact icon={Clock} label="Duration" value={row.duration} />
          <Fact icon={Users} label="Group" value={row.groupSize} />
          <Fact icon={Sparkles} label="From" value={row.priceFrom} />
        </dl>

        {/* Seasonal pricing — additive only; current single-price unchanged when absent */}
        <SeasonalPriceList windows={seasonalWindows ?? null} variant="inline" className="mb-3" />

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
        className="h-4 w-4 mx-auto mb-1 text-muted-foreground"
        aria-hidden="true"
      />
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-xs font-semibold text-foreground/85 mt-0.5">{value}</dd>
    </div>
  )
}
