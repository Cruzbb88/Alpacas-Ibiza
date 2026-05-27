'use client'

/**
 * app/error.tsx — global route-segment error boundary.
 * Catches errors thrown inside any route that doesn't have its own error.tsx.
 * Does NOT replace the root layout (that's global-error.tsx).
 * Does NOT leak error.message — only logs digest for server-side correlation.
 */
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        digest: error.digest ?? null,
        message: error.message?.slice(0, 200) ?? null,
        pathname: window.location.pathname,
        ts: Date.now(),
      }),
    }).catch(() => {
      // fire-and-forget; never throw from an error boundary
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16 text-center">
      <span className="text-6xl mb-6 block" aria-hidden="true">🦙</span>
      <h1 className="text-3xl font-bold text-foreground mb-3 font-display">
        Something went wrong
      </h1>
      <p className="text-foreground/70 max-w-md mb-8">
        One of our alpacas wandered off with this page. Please try again or head back home.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
        <a
          href="/en"
          className="px-5 py-2.5 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary/5 transition-colors"
        >
          Back to home
        </a>
      </div>
    </div>
  )
}
