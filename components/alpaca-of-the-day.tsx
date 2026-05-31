/**
 * AlpacaOfTheDay — daily rotating spotlight for the homepage.
 *
 * Server component (no 'use client'). Async because it calls getProviders().
 *
 * Selection: deterministic per calendar day using day-of-year index so the
 * SSR cache is stable throughout the day and all edge nodes agree on which
 * alpaca to show. Uses UTC day-of-year so it rolls over at midnight UTC.
 *
 * Eligibility filter: animals must have non-null `image` AND non-null `fun_fact`.
 * If no animals pass the filter, the component returns null (fail-quiet).
 *
 * Translation keys (EN fallbacks embedded so the component works before
 * translation files are extended):
 *   alpacaOfDay.eyebrow    — "Alpaca of the day"
 *   alpacaOfDay.funFact    — "Fun fact"
 *   alpacaOfDay.cta        — "Meet {name}"
 */

import Image from 'next/image'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { getTenant } from '@/lib/tenants/server'
import { getProviders } from '@/lib/integrations'

interface AlpacaOfTheDayProps {
  locale: Locale
}

export async function AlpacaOfTheDay({ locale }: AlpacaOfTheDayProps) {
  const translate = t(locale)

  // Resolve tenant + content provider.
  const tenant = await getTenant()
  const providers = getProviders(tenant)
  const allAnimals = providers.content.listAnimals()

  // Eligibility: must have a real CDN portrait AND a fun fact.
  const eligible = allAnimals.filter(
    (a) => a.image !== null && a.image !== undefined && a.fun_fact !== null && a.fun_fact !== undefined,
  )

  if (eligible.length === 0) return null

  // Deterministic day-of-year index — stable per UTC calendar day.
  const now = new Date()
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1)
  const dayOfYear = Math.floor((Date.now() - startOfYear) / 86_400_000)
  const animal = eligible[dayOfYear % eligible.length]

  const eyebrow = translate('alpacaOfDay.eyebrow', 'Alpaca of the day')
  const funFactLabel = translate('alpacaOfDay.funFact', 'Fun fact')
  const ctaText = translate('alpacaOfDay.cta', `Meet ${animal.name}`).replace(
    '{name}',
    animal.name,
  )

  return (
    <section
      aria-label={eyebrow}
      className="w-full py-12 md:py-16 px-4 bg-muted/40 border-y border-border"
    >
      <div className="max-w-4xl mx-auto">
        {/* Eyebrow */}
        <p className="text-xs uppercase tracking-widest font-semibold text-accent text-center mb-6">
          {eyebrow}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Portrait */}
          <div className="relative flex-shrink-0 w-48 h-48 md:w-60 md:h-60 rounded-2xl overflow-hidden shadow-lg ring-2 ring-primary/20">
            <Image
              src={animal.image!}
              alt={`${animal.name} — alpaca portrait`}
              fill
              sizes="(max-width: 768px) 192px, 240px"
              className="object-cover"
            />
          </div>

          {/* Text */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {animal.name}
            </h2>

            {animal.personality && (
              <p className="text-sm text-foreground/60 italic mb-3">{animal.personality}</p>
            )}

            <div className="bg-card border border-border rounded-xl px-4 py-3 mb-5">
              <p className="text-xs uppercase tracking-wide text-foreground/50 mb-1">
                {funFactLabel}
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">{animal.fun_fact}</p>
            </div>

            <Link
              href={`/${locale}/alpacas/${animal.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {ctaText}
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
