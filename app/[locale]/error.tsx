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
import { useTranslations, useLocale } from 'next-intl'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  // Extract locale from the URL segment so links stay in the same locale.
  // Falls back to 'en' if the path is somehow missing a locale prefix.
  const seg = pathname?.split('/')[1] ?? 'en'
  const locale = useLocale() || seg
  const tr = useTranslations()

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
    <div className="container mx-auto px-4 py-24 text-center">
      <span className="text-6xl block mb-6" aria-hidden="true">🦙</span>
      <h1 className="text-4xl font-bold text-foreground mb-4 font-display">
        {tr('error.title')}
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
        {tr('error.subtitle')}
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Button onClick={reset}>{tr('error.tryAgain')}</Button>
        <Button variant="outline" asChild>
          <Link href={`/${locale}`}>{tr('error.goHome')}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/tours`}>{tr('error.goTours')}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/adopt`}>{tr('error.goAdopt')}</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground mt-8">
          {tr('error.errorRef')}: {error.digest}
        </p>
      )}
    </div>
  )
}
