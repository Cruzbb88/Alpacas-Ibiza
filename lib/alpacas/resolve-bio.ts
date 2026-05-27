/**
 * Single source of truth for resolving an alpaca's bio to display text.
 * Both AlpacaCard and the /alpacas/[slug] detail page must agree on the
 * resolution algorithm — without this shared helper they had near-identical
 * but subtly different cascades (peer-review finding 2026-05-27).
 *
 * Resolution order:
 *   1. localizedBio[locale] if non-null
 *   2. localizedBio.en (English fallback) if non-null
 *   3. plain string `bio` field if non-null
 *   4. i18n key `alpacas.bioComingSoon` (UNMAPPED sentinel)
 */

import type { AnimalEntity } from '@/lib/integrations/content-types'
import type { Locale } from '@/i18n.config'

export type TranslateFn = (key: string, defaultValue?: string) => string

export function resolveAnimalBio(
  animal: AnimalEntity,
  locale: Locale,
  translate: TranslateFn,
): string {
  if (animal.localizedBio != null) {
    const bioMap = animal.localizedBio as unknown as Record<string, string | null | undefined>
    const localized = bioMap[locale] ?? animal.localizedBio.en
    if (localized != null) return localized
  }
  if (animal.bio != null) return animal.bio
  return translate('alpacas.bioComingSoon', 'Bio coming soon')
}
