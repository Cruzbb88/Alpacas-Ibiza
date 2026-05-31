'use client'

/**
 * ShareAlpacaButton — Web Share API button for individual alpaca detail pages.
 *
 * Calls navigator.share() with the alpaca's name and current URL.
 * Renders nothing when the Web Share API is unavailable (all desktops,
 * old Safari, Firefox). Guard is client-side only per spec constraints.
 *
 * No new deps.
 */

import { useState, useEffect } from 'react'

interface ShareAlpacaButtonProps {
  /** The alpaca's display name, used in the share title. */
  name: string
  /** Share label. Defaults to "Share". */
  label?: string
}

export function ShareAlpacaButton({ name, label = 'Share' }: ShareAlpacaButtonProps) {
  const [canShare, setCanShare] = useState(false)

  // Resolve the Web Share API capability after mount — safe for SSR.
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      setCanShare(true)
    }
  }, [])

  if (!canShare) return null

  async function handleShare() {
    try {
      await navigator.share({
        title: `Meet ${name} — Alpacas Ibiza`,
        url: window.location.href,
      })
    } catch {
      // User cancelled or API rejected — silent, never rethrow.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {label}
    </button>
  )
}
