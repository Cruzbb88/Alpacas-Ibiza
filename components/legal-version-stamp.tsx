import type { LegalPageMeta } from '@/lib/data/legal-meta'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'

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

export async function LegalVersionStamp({ meta, locale }: LegalVersionStampProps) {
  if (!meta) return null

  const translate = await getTranslations()
  const lastUpdatedLabel = translate('legal.lastUpdated')
  const versionLabel = translate('legal.version')

  const formattedDate = formatDate(meta.updatedAt, locale)

  return (
    <div
      className="max-w-4xl mx-auto px-4 mt-4 mb-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground"
      aria-label={`${lastUpdatedLabel}: ${formattedDate}`}
    >
      <span>
        <span className="font-medium text-muted-foreground">{lastUpdatedLabel}:</span>{' '}
        {formattedDate}
      </span>
      <span
        className="inline-flex items-center rounded-full border border-foreground/20 bg-foreground/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
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
