'use client'

import { useParams, usePathname } from 'next/navigation'
import { i18nConfig, type Locale } from '@/i18n.config'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function LanguageSwitcher() {
  const pathname = usePathname()
  const params = useParams()
  const currentLocale = (params.locale || i18nConfig.defaultLocale) as Locale

  const handleChangeLanguage = (newLocale: Locale) => {
    // Remove current locale from path
    const segments = pathname.split('/')
    segments.shift() // Remove empty string from split
    if (i18nConfig.locales.includes(segments[0] as Locale)) {
      segments.shift() // Remove old locale
    }
    // Build new path with new locale — hard navigate to re-render server components
    const newPath = `/${newLocale}${segments.length > 0 ? '/' + segments.join('/') : ''}`
    window.location.href = newPath
  }

  return (
    <Select value={currentLocale} onValueChange={handleChangeLanguage}>
      <SelectTrigger className="w-[140px] border-border bg-background" aria-label="Select language">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {i18nConfig.locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            <span className="flex items-center gap-2">
              <span>{i18nConfig.localeFlagEmoji[locale]}</span>
              <span>{i18nConfig.localeNames[locale]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
