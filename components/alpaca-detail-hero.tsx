/**
 * AlpacaDetailHero — photo + name + facts hero block for /alpacas/[slug].
 *
 * Two-column on desktop (photo left, info right), stacked on mobile.
 * Image side gracefully degrades to a branded text placeholder when the
 * roster has no photo for this alpaca (UNMAPPED — PRACTICES Rule 5).
 *
 * Facts shown only when non-null: breed, age, color, personality, bio,
 * fun_fact. No invented values.
 *
 * CTAs: primary "Adopt {name}" (threads ?alpaca=<slug> to /adopt for picker
 * pre-selection) + secondary "Back to the herd" (returns to listing).
 */

import Image from 'next/image'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import type { AnimalEntity } from '@/lib/integrations/content-types'
import { t } from '@/lib/translations'
import { resolveAnimalBio } from '@/lib/alpacas/resolve-bio'
import { ShareAlpacaButton } from '@/components/alpacas/share-alpaca-button'

interface AlpacaDetailHeroProps {
  locale: Locale
  animal: AnimalEntity
}

export function AlpacaDetailHero({ locale, animal }: AlpacaDetailHeroProps) {
  const translate = t(locale)
  const hasImage = animal.image != null
  const bioText = resolveAnimalBio(animal, locale, translate)

  // Descriptive alt for screen readers — compose name + colour + breed.
  const altText = [animal.name, animal.color, animal.breed].filter(Boolean).join(', ')

  const adoptHref = `/${locale}/adopt?alpaca=${encodeURIComponent(animal.id)}`
  const listHref = `/${locale}/alpacas`

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
      {/* Image column — Next/Image with placeholder fallback */}
      {hasImage ? (
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-secondary/40">
          <Image
            src={animal.image as string}
            alt={altText}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      ) : (
        <div
          role="img"
          aria-label={`${translate('alpacas.photoComingSoon', 'Photo coming soon')}: ${animal.name}`}
          className="aspect-square w-full rounded-2xl bg-secondary/60 flex items-center justify-center"
        >
          <span className="text-4xl font-bold text-muted-foreground/40">{animal.name}</span>
        </div>
      )}

      {/* Info column */}
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-bold text-primary">{animal.name}</h1>

        {/* Badges — render only fields the owner has supplied */}
        {(animal.breed || animal.age != null || animal.color) && (
          <div className="flex flex-wrap gap-2">
            {animal.breed && (
              <span className="inline-block rounded-full bg-secondary/80 px-3 py-1 text-xs font-semibold text-foreground/80">
                {animal.breed}
              </span>
            )}
            {animal.age != null && (
              <span className="inline-block rounded-full bg-secondary/80 px-3 py-1 text-xs font-semibold text-foreground/80">
                {animal.age} {translate('alpacas.yearsOld', 'years old')}
              </span>
            )}
            {animal.color && (
              <span className="inline-block rounded-full bg-secondary/80 px-3 py-1 text-xs font-semibold text-foreground/80">
                {animal.color}
              </span>
            )}
          </div>
        )}

        {animal.personality && (
          <p className="text-lg italic text-primary/80">{animal.personality}</p>
        )}

        <p className="text-base text-foreground/80 leading-relaxed">{bioText}</p>

        {animal.fun_fact && (
          <p className="text-sm text-muted-foreground italic border-l-4 border-primary/30 pl-4">
            <span aria-hidden="true">✦ </span>
            {animal.fun_fact}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href={adoptHref}
            className="inline-flex justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={`${translate('alpacas.adoptCta', 'Adopt')} ${animal.name}`}
          >
            {translate('alpacas.adoptCta', 'Adopt')} {animal.name} →
          </Link>
          <Link
            href={listHref}
            className="inline-flex justify-center rounded-lg border border-primary px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {translate('alpacas.backToHerd', 'Back to the herd')}
          </Link>
          {/* Web Share API — renders null on desktop / unsupported browsers */}
          <ShareAlpacaButton
            name={animal.name}
            label={translate('share.label', 'Share')}
          />
        </div>
      </div>
    </div>
  )
}
