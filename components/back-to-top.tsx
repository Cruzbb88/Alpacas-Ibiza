'use client'
import { useEffect, useRef, useState } from 'react'

interface BackToTopProps {
  /** Pixel threshold for visibility. Default 600. */
  threshold?: number
  /** Whether to show the progress ring. Default true. */
  showRing?: boolean
  /** Optional className passthrough. */
  className?: string
}

// SVG ring geometry — kept as module-level constants so they are stable.
const SIZE = 44
const STROKE = 3
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function BackToTop({ threshold = 600, showRing = true, className = '' }: BackToTopProps) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number | null>(null)
  const tickingRef = useRef(false)

  useEffect(() => {
    function update() {
      tickingRef.current = false
      const y = window.scrollY || 0
      const max = Math.max(1, (document.documentElement.scrollHeight || 0) - window.innerHeight)
      const ratio = Math.min(1, Math.max(0, y / max))
      setProgress(ratio)
      setVisible(y > threshold)
    }

    function onScroll() {
      if (tickingRef.current) return
      tickingRef.current = true
      rafRef.current = window.requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
    }
  }, [threshold])

  function scrollUp() {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  const dashOffset = CIRCUMFERENCE - progress * CIRCUMFERENCE

  return (
    <button
      type="button"
      onClick={scrollUp}
      aria-label="Back to top"
      aria-hidden={visible ? undefined : true}
      tabIndex={visible ? 0 : -1}
      title="Back to top"
      className={[
        'fixed bottom-24 right-6 md:bottom-8 md:right-28 z-40',
        'w-12 h-12 md:w-14 md:h-14 rounded-full',
        'bg-background/95 backdrop-blur-md border border-border',
        'shadow-lg hover:shadow-xl transition-shadow',
        'flex items-center justify-center text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
        'transition-all duration-200 ease-out',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-2 pointer-events-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showRing && (
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-foreground/15"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="stroke-accent transition-[stroke-dashoffset] duration-150 ease-out"
          />
        </svg>
      )}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="relative"
      >
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
    </button>
  )
}
