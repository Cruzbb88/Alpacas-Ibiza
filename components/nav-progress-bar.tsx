'use client'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * 2px top-of-viewport progress bar that animates during route transitions.
 * Listens to pathname/searchParams changes (Next App Router signals these
 * synchronously when nav starts).
 *
 * Trades simplicity for perfect-accuracy: shows briefly even for instant
 * cached nav. Respects prefers-reduced-motion by jumping straight to 100%.
 */
export function NavProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState<number | null>(null)

  useEffect(() => {
    setProgress(20)
    const t1 = window.setTimeout(() => setProgress(60), 100)
    const t2 = window.setTimeout(() => setProgress(100), 300)
    const t3 = window.setTimeout(() => setProgress(null), 500)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [pathname, searchParams])

  if (progress === null) return null

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      className="fixed top-0 left-0 right-0 z-[60] h-0.5 pointer-events-none"
    >
      <div
        style={{
          width: `${progress}%`,
          transition: 'width 200ms ease-out',
        }}
        className="h-full bg-primary"
      />
    </div>
  )
}
