'use client'

/**
 * JournalToc — sticky table-of-contents for journal post pages.
 *
 * - lg+ screens: fixed sidebar (right side), hidden on mobile
 * - <lg screens: inline collapsible section rendered above article body
 * - IntersectionObserver tracks active heading (SSR-safe, useEffect only)
 * - Returns null when fewer than 2 items (short posts need no TOC)
 * - prefers-reduced-motion: scrollIntoView falls back to instant jump
 */

import { useEffect, useRef, useState } from 'react'

export interface TocItem {
  readonly id: string
  readonly text: string
  readonly level: 2 | 3
}

interface JournalTocProps {
  readonly items: ReadonlyArray<TocItem>
  readonly label?: string
}

export function JournalToc({ items, label = 'On this page' }: JournalTocProps) {
  const [activeId, setActiveId] = useState<string>('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Guard: too few headings → render nothing
  if (items.length < 2) return null

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const headingEls = items
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (headingEls.length === 0) return

    // Track which heading is nearest top of viewport
    const positions = new Map<string, number>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          positions.set(entry.target.id, entry.boundingClientRect.top)
        }
        // Active = topmost visible heading (closest to top without being above viewport)
        let bestId = ''
        let bestTop = Infinity
        for (const [id, top] of positions) {
          if (top >= 0 && top < bestTop) {
            bestTop = top
            bestId = id
          }
        }
        if (bestId) setActiveId(bestId)
      },
      { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] },
    )

    for (const el of headingEls) {
      observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [items])

  function handleClick(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
  }

  const tocList = (
    <ul className="space-y-1 text-sm" role="list">
      {items.map(({ id, text, level }) => (
        <li key={id} className={level === 3 ? 'pl-4' : ''}>
          <a
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault()
              handleClick(id)
            }}
            className={[
              'block py-0.5 leading-snug transition-colors hover:text-primary',
              activeId === id
                ? 'font-semibold text-primary'
                : 'text-muted-foreground',
            ].join(' ')}
          >
            {text}
          </a>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      {/* ── Desktop: fixed sidebar ─────────────────────────────────────────── */}
      <nav
        aria-label={label}
        className="hidden lg:block fixed top-32 right-8 max-w-[240px] max-h-[calc(100vh-200px)] overflow-y-auto z-20 rounded-lg border border-border bg-background/95 backdrop-blur-sm p-4 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {label}
        </p>
        {tocList}
      </nav>

      {/* ── Mobile: inline collapsible above article body ──────────────────── */}
      <nav
        aria-label={label}
        className="lg:hidden border border-border rounded-lg mb-8 overflow-hidden"
      >
        <button
          type="button"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
        >
          <span>{label}</span>
          <span aria-hidden="true" className="text-muted-foreground text-xs">
            {mobileOpen ? '▲' : '▼'}
          </span>
        </button>
        {mobileOpen && (
          <div className="px-4 py-3 bg-background">
            {tocList}
          </div>
        )}
      </nav>
    </>
  )
}
