import {
  CalendarCheck,
  Users,
  Languages,
  Baby,
  Heart,
  BadgeCheck,
  Zap,
} from 'lucide-react'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'

export type TrustSignalKey =
  | 'cancellation'
  | 'small-groups'
  | 'languages'
  | 'family-friendly'
  | 'animal-welfare'
  | 'verified-reviews'
  | 'instant-confirmation'

interface TrustSignalsProps {
  readonly variant?: 'horizontal' | 'compact-vertical'
  readonly locale: Locale
  /** Optional override list — default shows 4. */
  readonly items?: ReadonlyArray<TrustSignalKey>
}

const DEFAULT_ITEMS: ReadonlyArray<TrustSignalKey> = [
  'cancellation',
  'small-groups',
  'languages',
  'family-friendly',
]

function TrustItem({
  icon: Icon,
  text,
  variant,
}: {
  icon: React.ComponentType<{ className?: string }>
  text: string
  variant: 'horizontal' | 'compact-vertical'
}) {
  if (variant === 'compact-vertical') {
    return (
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Icon className="h-6 w-6 text-primary/80 shrink-0" />
        <span className="text-xs text-foreground/70 leading-snug">{text}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-primary/80 shrink-0" />
      <span className="text-xs text-foreground/70">{text}</span>
    </div>
  )
}

export async function TrustSignals({
  variant = 'horizontal',
  locale,
  items = DEFAULT_ITEMS,
}: TrustSignalsProps) {
  const tr = await getTranslations()

  // verified-reviews: only render when Google Places is configured
  // The API signals this via the /api/google-reviews route returning {configured:true}
  // At build/render time we cannot call that route from a server component without
  // adding a fetch. Per spec: fail-quiet — omit the item entirely when Google env
  // vars are not set. We check the env var directly (same guard as the API route).
  const googleConfigured =
    typeof process !== 'undefined' &&
    !!process.env.GOOGLE_PLACES_API_KEY &&
    !!process.env.GOOGLE_PLACES_PLACE_ID

  const iconMap: Record<
    TrustSignalKey,
    React.ComponentType<{ className?: string }>
  > = {
    cancellation: CalendarCheck,
    'small-groups': Users,
    languages: Languages,
    'family-friendly': Baby,
    'animal-welfare': Heart,
    'verified-reviews': BadgeCheck,
    'instant-confirmation': Zap,
  }

  const labelMap: Record<TrustSignalKey, string> = {
    cancellation: tr('trustSignals.cancellation'),
    'small-groups': tr('trustSignals.smallGroups'),
    languages: tr('trustSignals.languages'),
    'family-friendly': tr('trustSignals.familyFriendly'),
    'animal-welfare': tr('trustSignals.animalWelfare'),
    'verified-reviews': tr('trustSignals.verifiedReviews'),
    'instant-confirmation': tr('trustSignals.instantConfirmation'),
  }

  const visibleItems = items.filter(
    (key) => key !== 'verified-reviews' || googleConfigured
  )

  if (visibleItems.length === 0) return null

  if (variant === 'compact-vertical') {
    return (
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        aria-label="Trust signals"
      >
        {visibleItems.map((key) => (
          <TrustItem
            key={key}
            icon={iconMap[key]}
            text={labelMap[key]}
            variant="compact-vertical"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex flex-wrap items-center gap-4"
      aria-label="Trust signals"
    >
      {visibleItems.map((key) => (
        <TrustItem
          key={key}
          icon={iconMap[key]}
          text={labelMap[key]}
          variant="horizontal"
        />
      ))}
    </div>
  )
}
