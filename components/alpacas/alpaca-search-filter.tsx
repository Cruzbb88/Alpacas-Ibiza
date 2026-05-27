'use client'

/**
 * AlpacaSearchFilter — URL-driven filter chips for the /alpacas listing.
 *
 * Three filter dimensions, all OR'd within each dimension and AND'd across:
 *   - personality keyword (calm / playful / bold / shy / sociable / independent)
 *   - color (greys / browns / whites / mixed)
 *   - breed (Huacaya / Suri)
 *
 * State lives in URL search params so filters are bookmarkable, shareable,
 * and survive back-button navigation. Server re-renders the grid because
 * the listing page reads `searchParams` directly.
 *
 * Renders a count summary (`Showing 6 of 14`) computed by the parent and
 * passed in — keeps this component dumb about the underlying filter logic.
 *
 * "Clear all" link only renders when at least one filter is active.
 *
 * Each chip is a real <button> with `aria-pressed` so screen readers
 * announce toggled state. Filter groups are <fieldset> + <legend>.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'

export const FILTER_PERSONALITIES = ['calm', 'playful', 'bold', 'shy', 'sociable', 'independent'] as const
export const FILTER_COLORS = ['white', 'grey', 'brown', 'mixed'] as const
export const FILTER_BREEDS = ['huacaya', 'suri'] as const

export type PersonalityFilter = typeof FILTER_PERSONALITIES[number]
export type ColorFilter = typeof FILTER_COLORS[number]
export type BreedFilter = typeof FILTER_BREEDS[number]

interface AlpacaSearchFilterProps {
  locale: Locale
  /** Parent-supplied count of matches (after filtering). */
  matchCount: number
  /** Parent-supplied total roster size. */
  totalCount: number
}

export function AlpacaSearchFilter({ locale, matchCount, totalCount }: AlpacaSearchFilterProps) {
  const translate = t(locale)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const activePersonalities = parseListParam(searchParams?.get('p'))
  const activeColors = parseListParam(searchParams?.get('c'))
  const activeBreeds = parseListParam(searchParams?.get('b'))
  const hasAnyFilter =
    activePersonalities.length > 0 || activeColors.length > 0 || activeBreeds.length > 0

  function toggleParam(paramKey: 'p' | 'c' | 'b', value: string) {
    const current = parseListParam(searchParams?.get(paramKey))
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    pushUrl(paramKey, next)
  }

  function pushUrl(paramKey: 'p' | 'c' | 'b', next: ReadonlyArray<string>) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (next.length === 0) {
      params.delete(paramKey)
    } else {
      params.set(paramKey, next.join(','))
    }
    const qs = params.toString()
    const url = `/${locale}/alpacas${qs ? `?${qs}` : ''}`
    startTransition(() => router.push(url, { scroll: false }))
  }

  function clearAll() {
    startTransition(() => router.push(`/${locale}/alpacas`, { scroll: false }))
  }

  return (
    <div aria-busy={isPending} className="space-y-5">
      <FilterFieldset
        legend={translate('alpacas.filter.personality', 'Personality')}
        options={FILTER_PERSONALITIES}
        active={activePersonalities}
        translate={translate}
        labelPrefix="alpacas.filter.personalityOption"
        onToggle={(v) => toggleParam('p', v)}
      />
      <FilterFieldset
        legend={translate('alpacas.filter.color', 'Colour')}
        options={FILTER_COLORS}
        active={activeColors}
        translate={translate}
        labelPrefix="alpacas.filter.colorOption"
        onToggle={(v) => toggleParam('c', v)}
      />
      <FilterFieldset
        legend={translate('alpacas.filter.breed', 'Breed')}
        options={FILTER_BREEDS}
        active={activeBreeds}
        translate={translate}
        labelPrefix="alpacas.filter.breedOption"
        onToggle={(v) => toggleParam('b', v)}
      />

      <div className="flex items-center justify-between text-sm" role="status" aria-live="polite">
        <span className="text-foreground/70">
          {translate('alpacas.filter.showing', `Showing ${matchCount} of ${totalCount}`)
            .replace('{match}', String(matchCount))
            .replace('{total}', String(totalCount))}
        </span>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="text-primary hover:text-primary/80 font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
          >
            {translate('alpacas.filter.clearAll', 'Clear all filters')}
          </button>
        )}
      </div>
    </div>
  )
}

interface FilterFieldsetProps {
  legend: string
  options: ReadonlyArray<string>
  active: ReadonlyArray<string>
  translate: (key: string, fallback?: string) => string
  labelPrefix: string
  onToggle: (value: string) => void
}

function FilterFieldset({ legend, options, active, translate, labelPrefix, onToggle }: FilterFieldsetProps) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wide text-foreground/60 mb-2">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = active.includes(option)
          const label = translate(`${labelPrefix}.${option}`, capitalize(option))
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              aria-pressed={isActive}
              className={
                'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ' +
                (isActive
                  ? 'bg-primary text-primary-foreground border border-primary'
                  : 'bg-card text-foreground/80 border border-border hover:border-primary/40 hover:bg-primary/5')
              }
            >
              {label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function parseListParam(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Apply the URL filter state to an animal roster. Exported so the server-side
 * listing page can use the same logic without duplicating it client-side.
 *
 * Matching is case-insensitive substring on personality/color/breed strings.
 * Empty filter set on a dimension = no filter for that dimension (passes through).
 */
export function filterAlpacas<T extends { personality?: string | null; color?: string | null; breed?: string | null }>(
  animals: ReadonlyArray<T>,
  filters: { p?: string[]; c?: string[]; b?: string[] },
): T[] {
  const personalities = (filters.p ?? []).map((s) => s.toLowerCase())
  const colors = (filters.c ?? []).map((s) => s.toLowerCase())
  const breeds = (filters.b ?? []).map((s) => s.toLowerCase())
  return animals.filter((a) => {
    if (personalities.length > 0) {
      const p = (a.personality ?? '').toLowerCase()
      if (!personalities.some((needle) => p.includes(needle))) return false
    }
    if (colors.length > 0) {
      const c = (a.color ?? '').toLowerCase()
      if (!colors.some((needle) => c.includes(needle))) return false
    }
    if (breeds.length > 0) {
      const b = (a.breed ?? '').toLowerCase()
      if (!breeds.some((needle) => b.includes(needle))) return false
    }
    return true
  })
}
