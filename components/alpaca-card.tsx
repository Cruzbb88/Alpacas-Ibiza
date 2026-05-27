/**
 * AlpacaCard — single-alpaca card renderer.
 *
 * Data source: AnimalEntity from lib/integrations/content-types.ts
 * All optional fields (age, breed, color, personality, fun_fact, localizedBio)
 * are null = UNMAPPED — fields are omitted entirely from the UI when null.
 * See OWNER_INPUT_NEEDED.md for pending bios + photos.
 *
 * Bio resolution order:
 *   localizedBio[locale] → localizedBio.en → bio (plain string) → translate('alpacas.bioComingSoon')
 */

import Image from 'next/image'
import type { Locale } from '@/i18n.config'
import type { AnimalEntity } from '@/lib/integrations/content-types'
import { t } from '@/lib/translations'

interface AlpacaCardProps {
  alpaca: AnimalEntity
  locale: Locale
}

export function AlpacaCard({ alpaca, locale }: AlpacaCardProps) {
  const translate = t(locale)
  const hasImage = alpaca.image !== null && alpaca.image !== undefined

  // Bio resolution: localized map → plain string → i18n key
  let bioText: string
  if (alpaca.localizedBio != null) {
    // AlpacaBio keys match Locale values (en, de, it, es, nl, fr)
    // Double-cast via unknown to avoid TS overlap error
    const bioMap = alpaca.localizedBio as unknown as Record<string, string | null | undefined>
    const localized = bioMap[locale] ?? alpaca.localizedBio.en
    bioText = localized ?? translate('alpacas.bioComingSoon')
  } else if (alpaca.bio != null) {
    bioText = alpaca.bio
  } else {
    bioText = translate('alpacas.bioComingSoon')
  }

  // Badge: breed + age — only rendered when at least one is present
  const hasBreed = alpaca.breed != null
  const hasAge = alpaca.age != null
  const hasBadge = hasBreed || hasAge
  const badgeText = [
    hasBreed ? alpaca.breed : null,
    hasAge ? `${alpaca.age} ${translate('alpacas.yearsOld')}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article
      className="bg-white rounded-[16px] border border-secondary overflow-hidden shadow-sm flex flex-col"
      aria-label={alpaca.name}
    >
      {/* Image or placeholder — never render a broken src */}
      {hasImage ? (
        <div className="relative aspect-square w-full">
          <Image
            src={alpaca.image as string}
            alt={alpaca.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
      ) : (
        <div
          className="aspect-square bg-secondary/60 flex items-center justify-center"
          aria-label={`${translate('alpacas.photoComingSoon')}: ${alpaca.name}`}
        >
          <span className="text-2xl font-bold text-muted-foreground/40">
            {alpaca.name}
          </span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Name */}
        <h3 className="font-bold text-primary">{alpaca.name}</h3>

        {/* Breed + Age badge — omitted entirely when both are null */}
        {hasBadge && (
          <p className="text-xs text-muted-foreground font-medium">{badgeText}</p>
        )}

        {/* Personality — omitted entirely when null */}
        {alpaca.personality != null && (
          <p className="text-xs text-primary/70 italic">{alpaca.personality}</p>
        )}

        {/* Bio */}
        <p className="text-sm text-muted-foreground flex-1">{bioText}</p>

        {/* Fun fact — omitted entirely when null */}
        {alpaca.fun_fact != null && (
          <p className="text-xs text-muted-foreground/60 italic mt-1">
            ✦ {alpaca.fun_fact}
          </p>
        )}
      </div>
    </article>
  )
}
