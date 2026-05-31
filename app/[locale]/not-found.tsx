import { headers } from 'next/headers'
import { logNotFound } from '@/lib/notfound-log'
import { DidYouMean } from '@/components/did-you-mean'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n.config'

export default async function LocaleNotFound() {
  const h = await headers()
  const referer = h.get('referer')
  const ua = h.get('user-agent')
  // next-url is set by Next.js internals for the originally requested path
  const pathname = h.get('x-invoke-path') ?? h.get('next-url') ?? '/unknown'

  logNotFound({ pathname, referer, userAgent: ua })

  // Detect locale from the requested path so titles render in the right language.
  // DidYouMean is a client component and reads params.locale independently.
  const locales = ['en', 'de', 'it', 'es', 'nl', 'fr'] as const
  const seg = pathname.split('/')[1] ?? 'en'
  const locale: Locale = (locales as readonly string[]).includes(seg) ? (seg as Locale) : 'en'
  const tr = await getTranslations()

  return (
    <div className="flex flex-col items-center px-4 py-16 md:py-24" aria-live="polite">
      {/* Hero section */}
      <div className="text-center max-w-2xl mb-12">
        <span className="text-7xl mb-6 block" aria-hidden="true">🦙</span>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-display">
          {tr('notFound.title')}
        </h1>
        <p className="text-lg text-foreground/70 max-w-md mx-auto">
          {tr('notFound.subtitle')}
        </p>
      </div>

      {/* "Did you mean" suggestions — client component for locale-aware links */}
      <DidYouMean />

      {/* CTA */}
      <div className="mt-12 text-center">
        <p className="text-sm text-foreground/50 mb-4">{tr('notFound.ctaText')}</p>
        <a
          href="https://fareharbor.com/embeds/book/alpacasibiza/?full-items=yes"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl font-medium transition-colors"
        >
          {tr('notFound.suggestions.tours')}
        </a>
      </div>
    </div>
  )
}
