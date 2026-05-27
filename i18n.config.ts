export const i18nConfig = {
  locales: ['en', 'de', 'it', 'es', 'nl', 'fr'] as const,
  defaultLocale: 'en' as const,
  localeNames: {
    en: 'English',
    de: 'Deutsch',
    it: 'Italiano',
    es: 'Español',
    nl: 'Nederlands',
    fr: 'Français',
  },
  // Spec 005: dropped 🇬🇧 (UK flag for international English is misleading for a Spain-based
   // business serving non-UK visitors). Text label "EN" is locale-neutral.
  localeFlagEmoji: {
    en: 'EN',
    de: '🇩🇪',
    it: '🇮🇹',
    es: '🇪🇸',
    nl: '🇳🇱',
    fr: '🇫🇷',
  },
}

export type Locale = (typeof i18nConfig.locales)[number]
