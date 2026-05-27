'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { ALPACAS } from '@/lib/data/alpacas'

interface AlpacaPickerProps {
  /** Current locale — used to keep the URL on the same locale tree. */
  locale: string
  /** Slug currently selected (from server-side searchParams), or null. */
  selectedSlug: string | null
  /** Section heading + helper copy — i18n-translated by the caller. */
  heading: string
  subheading: string
  /** Label for the "no preference / pick for me" affordance. */
  randomLabel: string
}

/**
 * AlpacaPicker — grid of all 14 alpacas as toggle-able selection chips.
 *
 * Clicking an alpaca pushes `?alpaca=<slug>` into the URL. The server re-renders
 * the page (Next App Router pushes to current route, server component reruns
 * with the new searchParams), which causes the CTA buttons below the picker to
 * rebuild their checkout URLs with the alpaca slug appended.
 *
 * Clicking the currently selected alpaca clears the selection (URL drops the
 * param). Clicking "Pick for me" also clears.
 *
 * Bookmarkable: the URL carries selection, so refresh / share works.
 * Accessibility: each tile is a real <button> with aria-pressed, screen readers
 * announce the toggled state.
 */
export function AlpacaPicker({
  locale,
  selectedSlug,
  heading,
  subheading,
  randomLabel,
}: AlpacaPickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function setAlpaca(nextSlug: string | null) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (nextSlug) {
      params.set('alpaca', nextSlug)
    } else {
      params.delete('alpaca')
    }
    const qs = params.toString()
    const url = `/${locale}/adopt${qs ? `?${qs}` : ''}${nextSlug ? '#cta' : ''}`
    startTransition(() => {
      router.push(url, { scroll: false })
    })
  }

  return (
    <div aria-busy={isPending}>
      <h2 className="text-2xl font-bold text-foreground text-center mb-2">
        {heading}
      </h2>
      <p className="text-sm text-foreground/70 text-center mb-8">
        {subheading}
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
        {/* "Pick for me" tile — distinct visual treatment so donors aren't anchored to one alpaca */}
        <button
          type="button"
          onClick={() => setAlpaca(null)}
          aria-pressed={selectedSlug === null}
          className={
            'rounded-lg border p-3 text-center text-sm transition-colors flex flex-col items-center justify-center gap-1 ' +
            (selectedSlug === null
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border hover:border-primary/40 text-foreground')
          }
        >
          <span aria-hidden="true" className="text-xl">✨</span>
          <span className="font-medium leading-tight">{randomLabel}</span>
        </button>

        {ALPACAS.map((a) => {
          const isSelected = selectedSlug === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAlpaca(isSelected ? null : a.id)}
              aria-pressed={isSelected}
              aria-label={isSelected ? `Deselect ${a.name}` : `Select ${a.name}`}
              className={
                'rounded-lg border p-3 text-center text-sm transition-colors flex flex-col items-center justify-center gap-1 ' +
                (isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:border-primary/40 text-foreground')
              }
            >
              <span aria-hidden="true" className="text-xl">🦙</span>
              <span className="font-medium leading-tight">{a.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
