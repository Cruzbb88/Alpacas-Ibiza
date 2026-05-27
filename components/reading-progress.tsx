'use client'

/**
 * ReadingProgress — fixed 1px bar at top of viewport showing scroll depth.
 * z-30: below modals (z-50), above general content.
 * Passive scroll listener for smooth-scroll perf.
 * prefers-reduced-motion: no CSS transition (direct width set only).
 */

import { useEffect, useState } from 'react'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    // Check prefers-reduced-motion once on mount
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)

    function onScroll() {
      const scrolled = window.scrollY
      const total = document.body.scrollHeight - window.innerHeight
      if (total <= 0) {
        setProgress(100)
        return
      }
      setProgress(Math.min(100, Math.max(0, (scrolled / total) * 100)))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // set initial value
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      data-no-print
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-1 bg-primary/20 z-30"
    >
      <div
        className={reducedMotion ? 'h-full bg-primary' : 'h-full bg-primary transition-[width] duration-75 ease-linear'}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
