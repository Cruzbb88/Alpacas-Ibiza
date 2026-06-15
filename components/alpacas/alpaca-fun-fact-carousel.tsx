'use client'

/**
 * AlpacaFunFactCarousel — auto-rotating fun-fact carousel from the herd.
 *
 * Pulls every alpaca whose `fun_fact` field is non-null (UNMAPPED ones are
 * silently skipped — PRACTICES Rule 5). Cycles every N seconds with a soft
 * cross-fade. Pauses on hover/focus and when the tab is hidden, respects
 * `prefers-reduced-motion`. Manual next/prev buttons + dot indicators.
 *
 * Each card links to the alpaca's detail page so the fact serves as a hook
 * into the deeper bio.
 *
 * Renders null if no alpaca has a fun_fact yet — common during the
 * UNMAPPED phase before owner provides content. No "coming soon" banner;
 * the carousel just vanishes from the page rather than showing empty state.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import type { AnimalEntity } from '@/lib/integrations/content-types'
import { useTranslations } from 'next-intl'

interface AlpacaFunFactCarouselProps {
  locale: Locale
  animals: ReadonlyArray<AnimalEntity>
  /** Rotation interval in ms. Default 6000 (6s — long enough to read short facts). */
  intervalMs?: number
  /** Optional override heading. */
  heading?: string
}

export function AlpacaFunFactCarousel({
  locale,
  animals,
  intervalMs = 6000,
  heading,
}: AlpacaFunFactCarouselProps) {
  const translate = useTranslations()
  const facts = useMemo(
    () => animals.filter((a): a is AnimalEntity & { fun_fact: string } => Boolean(a.fun_fact)),
    [animals],
  )
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  // Auto-rotate — pauses when document hidden, when user hovers/focuses, or
  // when prefers-reduced-motion is set.
  useEffect(() => {
    if (facts.length <= 1) return
    if (paused) return
    if (typeof document !== 'undefined' && document.hidden) return
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % facts.length)
    }, intervalMs)
    return () => window.clearTimeout(id)
  }, [index, paused, facts.length, intervalMs])

  // Pause when tab becomes hidden, resume when visible
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVis = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Clamp index when facts list shrinks (e.g. UNMAPPED phase update)
  useEffect(() => {
    if (index >= facts.length && facts.length > 0) setIndex(0)
  }, [facts.length, index])

  if (facts.length === 0) return null

  const current = facts[index] ?? facts[0]
  const headingText = heading ?? translate('alpacas.funFacts.heading')
  const prevLabel = translate('alpacas.funFacts.prev')
  const nextLabel = translate('alpacas.funFacts.next')

  function go(delta: number) {
    setIndex((i) => (i + delta + facts.length) % facts.length)
  }

  return (
    <section
      aria-labelledby="alpaca-fun-fact-heading"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="bg-card rounded-2xl border border-border p-6 sm:p-8 relative overflow-hidden"
    >
      <header className="text-center mb-4">
        <h2
          id="alpaca-fun-fact-heading"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          {headingText}
        </h2>
      </header>

      {/* Slide region — aria-live so screen readers announce the new fact on rotation */}
      <div
        aria-live={paused ? 'off' : 'polite'}
        aria-atomic="true"
        className="text-center min-h-[120px] flex flex-col items-center justify-center px-2"
      >
        <p
          key={current.id} // forces re-render → CSS animation fires on each cycle
          className="text-lg sm:text-xl text-foreground italic mb-3 leading-snug motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
        >
          <span aria-hidden="true">✦ </span>
          {current.fun_fact}
        </p>
        <Link
          href={`/${locale}/alpacas/${encodeURIComponent(current.id)}`}
          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
        >
          — {current.name} →
        </Link>
      </div>

      {/* Controls — only render when there's more than one fact */}
      {facts.length > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={prevLabel}
            className="rounded-full h-8 w-8 flex items-center justify-center border border-border text-foreground hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span aria-hidden="true">‹</span>
          </button>

          <div className="flex gap-1.5" role="tablist" aria-label="Fact selector">
            {facts.map((f, i) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${f.name} (${i + 1} of ${facts.length})`}
                onClick={() => setIndex(i)}
                className={
                  'h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ' +
                  (i === index ? 'w-6 bg-primary' : 'w-1.5 bg-secondary hover:bg-primary/40')
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            aria-label={nextLabel}
            className="rounded-full h-8 w-8 flex items-center justify-center border border-border text-foreground hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      )}
    </section>
  )
}
