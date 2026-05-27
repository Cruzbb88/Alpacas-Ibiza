'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackEngagement } from '@/lib/analytics-engagement'

export function ScrollTracker() {
  const pathname = usePathname()
  const firedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    firedRef.current.clear() // reset on route change
    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return
      const pct = Math.round((window.scrollY / docHeight) * 100)
      for (const milestone of [25, 50, 75, 100] as const) {
        if (pct >= milestone && !firedRef.current.has(milestone)) {
          firedRef.current.add(milestone)
          trackEngagement.scrollDepth(milestone, pathname)
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  return null
}
