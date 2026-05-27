'use client'

/**
 * error.tsx — route-level error boundary for all pages under app/[locale]/.
 * Inherits downward to every sub-route via Next.js segment inheritance.
 * Must be a Client Component (Next.js requirement for error boundaries).
 * Keeps Tailwind tokens so it renders consistently with the rest of the site,
 * unlike global-error.tsx which must be self-contained.
 */
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  // Extract locale from the URL segment so the home link stays in the same locale.
  // Falls back to 'en' if the path is somehow missing a locale prefix.
  const locale = pathname?.split('/')[1] || 'en'

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
    <main className="container mx-auto px-4 py-24 text-center">
      <span className="text-6xl block mb-6" aria-hidden="true">🦙</span>
      <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        One of our alpacas seems to have wandered off with the page. Our team
        has been notified — please try again or head back home.
      </p>
      <div className="flex gap-3 justify-center">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href={`/${locale}`}>Go home</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground mt-8">
          Error ref: {error.digest}
        </p>
      )}
    </main>
  )
}
