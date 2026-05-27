/**
 * AdoptBenefitsList — the 7 confirmed Adopt-a-Paca benefits as a grid.
 *
 * Each item has a ✓ accent icon and short copy from translations. The 7
 * benefits are the spec-confirmed live-verified set (VERIFICATION_RESULTS.md #10).
 *
 * Visual: 1-col mobile → 2-col tablet → 3-col desktop. Accessible: rendered as
 * a <ul> so screen readers announce as a list. The ✓ is decorative — wrapped
 * in aria-hidden so it doesn't read as "check" for each item.
 *
 * Caller can override the benefit slugs (e.g. to render a different list on a
 * tenant variant) but the default covers Alpacas Ibiza's confirmed bundle.
 */

import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'

const DEFAULT_BENEFITS = [
  'benefit1',
  'benefit2',
  'benefit3',
  'benefit4',
  'benefit5',
  'benefit6',
  'benefit7',
] as const

const DEFAULT_BENEFIT_COPY: Record<string, string> = {
  benefit1: 'Personalised adoption certificate with your chosen alpaca\'s name',
  benefit2: '6 farm tours per year for up to 4 guests',
  benefit3: '5 kg of premium Alcaca fibre (organic alpaca-derived garden amendment)',
  benefit4: 'Gift bundle: branded calendar, planner, keychain, and framed photo',
  benefit5: 'Professional photoshoot with your alpaca at the farm',
  benefit6: '10% discount on Wishfulfilling Weaving handwoven pieces',
  benefit7: '15% discount on everything in the farm shop',
}

interface AdoptBenefitsListProps {
  locale: Locale
  /** Heading text — translated by caller, or fallback to default. */
  heading?: string
  /** Intro paragraph below the heading. */
  intro?: string
  /** Override the benefit slug list. Defaults to the 7 confirmed benefits. */
  benefits?: ReadonlyArray<string>
  /** Wrapper className for the outer <section>. */
  className?: string
}

export function AdoptBenefitsList({
  locale,
  heading,
  intro,
  benefits = DEFAULT_BENEFITS,
  className,
}: AdoptBenefitsListProps) {
  const translate = t(locale)
  const headingText = heading ?? translate('adopt.benefitsTitle', 'What\'s included')
  const introText =
    intro ??
    translate(
      'adopt.benefitsIntro',
      'Every adoption directly funds feed, veterinary care, and the daily work of running an ethical alpaca farm.',
    )

  return (
    <section aria-labelledby="adopt-benefits-heading" className={className}>
      <h2
        id="adopt-benefits-heading"
        className="text-2xl font-bold text-foreground mb-3"
      >
        {headingText}
      </h2>
      <p className="text-sm text-foreground/70 mb-10">{introText}</p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 list-none p-0">
        {benefits.map((key) => {
          const fallback = DEFAULT_BENEFIT_COPY[key] ?? key
          const copy = translate(`adopt.${key}`, fallback)
          return (
            <li
              key={key}
              className="bg-card rounded-lg border border-border p-5 flex items-start gap-3"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 text-primary shrink-0 font-bold"
              >
                ✓
              </span>
              <p className="text-sm text-foreground/80">{copy}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
