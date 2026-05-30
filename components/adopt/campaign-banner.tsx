import { CAMPAIGN_HEADLINE, CAMPAIGN_SUBLINE, CAMPAIGN_END_DATE } from '@/lib/config'
import { getTranslation } from '@/lib/translations'
import type { Locale } from '@/i18n.config'

export function CampaignBanner({ locale, className }: { locale: Locale; className?: string }) {
  if (!CAMPAIGN_HEADLINE || !CAMPAIGN_END_DATE) return null
  const endMs = Date.parse(CAMPAIGN_END_DATE)
  if (!Number.isFinite(endMs) || endMs < Date.now()) return null
  const daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)))

  const tr = (key: string, fallback: string) => getTranslation(locale, key, fallback)

  const daysLeftLabel =
    daysLeft === 0
      ? tr('adopt.campaign.finalHours', 'Final hours')
      : daysLeft === 1
        ? tr('adopt.campaign.oneDayLeft', '1 day left')
        : tr('adopt.campaign.daysLeft', '{count} days left').replace('{count}', String(daysLeft))

  const daysRemainingAria =
    daysLeft === 1
      ? tr('adopt.campaign.daysRemainingAria', '{count} days remaining').replace('{count}', '1')
      : tr('adopt.campaign.daysRemainingAria', '{count} days remaining').replace('{count}', String(daysLeft))

  return (
    <div
      role="status"
      aria-live="polite"
      className={`bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center sm:text-left ${className ?? ''}`}
    >
      <div>
        <p className="text-sm sm:text-base font-bold text-primary">{CAMPAIGN_HEADLINE}</p>
        {CAMPAIGN_SUBLINE ? <p className="text-xs sm:text-sm text-foreground/70 mt-1">{CAMPAIGN_SUBLINE}</p> : null}
      </div>
      <span
        className="shrink-0 inline-flex items-center rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold"
        aria-label={daysRemainingAria}
      >
        {daysLeftLabel}
      </span>
    </div>
  )
}
