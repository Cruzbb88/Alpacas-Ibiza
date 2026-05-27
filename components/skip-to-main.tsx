import { t } from '@/lib/translations'
import type { Locale } from '@/i18n.config'

export function SkipToMain({ locale }: { locale: Locale }) {
  const translate = t(locale)
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none"
    >
      {translate('a11y.skipToMain') || 'Skip to main content'}
    </a>
  )
}
