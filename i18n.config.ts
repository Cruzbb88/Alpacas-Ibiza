export const i18nConfig = {
  locales: ['en', 'de', 'it', 'es', 'nl', 'fr'] as const,
  defaultLocale: 'en' as const,
  /**
   * Locales complete enough to be INDEXED by search engines.
   *
   * de/it/es/fr are ~30% translated as of 2026-06-13 (≈30% real, ~40% sentinel,
   * the rest fall back to English via mergeWithEnBase). Users on those locales
   * see a graceful mixed German/English page — never a broken key. BUT a German
   * URL serving mostly-English content is near-duplicate THIN CONTENT: Google
   * demotes it AND drags the healthy locales (en/nl) down with it.
   *
   * So incomplete locales are: noindexed (robots) + excluded from the sitemap +
   * omitted from the hreflang alternate set. The pages still render and work for
   * direct visitors — they're just invisible to search until complete.
   *
   * Reversible: when translations/<locale>.json reaches parity, ADD the locale
   * here — that single edit re-enables index + sitemap + hreflang for it.
   *
   * Evidence: reports/seo-audit/seo-001-2026-06-13.md (3 thin-content FAILs),
   * reports/i18n/loc-quality-001-2026-06-13.md (2 genuinely shippable locales).
   */
  indexableLocales: ['en', 'nl'] as const,
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
