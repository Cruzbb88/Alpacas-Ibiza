import type { LegalPageMeta } from '@/lib/data/legal-meta'
import type { Locale } from '@/i18n.config'
import { getTranslation } from '@/lib/translations'

interface LegalVersionStampProps {
  meta: LegalPageMeta | null
  locale: Locale
}

function formatDate(isoDate: string, locale: Locale): string {
  try {
    const date = new Date(isoDate + 'T00:00:00Z')
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date)
  } catch {
    return isoDate
  }
}

export function LegalVersionStamp({ meta, locale }: LegalVersionStampProps) {
  if (!meta) return null

  const lastUpdatedLabel = getTranslation(locale, 'legal.lastUpdated', 'Last updated')
  const versionLabel = getTranslation(locale, 'legal.version', 'Version')

  const formattedDate = formatDate(meta.updatedAt, locale)

  return (
    <div
      className="max-w-4xl mx-auto px-4 mt-4 mb-2 flex flex-wrap items-center gap-3 text-sm text-foreground/60"
      aria-label={`${lastUpdatedLabel}: ${formattedDate}`}
    >
      <span>
        <span className="font-medium text-foreground/70">{lastUpdatedLabel}:</span>{' '}
        {formattedDate}
      </span>
      <span
        className="inline-flex items-center rounded-full border border-foreground/20 bg-foreground/5 px-2.5 py-0.5 text-xs font-medium text-foreground/60"
        title={meta.latestChange}
        aria-describedby={meta.latestChange ? `legal-stamp-changelog-${meta.slug}` : undefined}
      >
        {versionLabel} {meta.version}
      </span>
      {meta.latestChange && (
        <span
          id={`legal-stamp-changelog-${meta.slug}`}
          className="sr-only"
        >
          {meta.latestChange}
        </span>
      )}
    </div>
  )
}
