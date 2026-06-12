/**
 * Minimal type shim for vanilla-cookieconsent.
 *
 * The package ships no bundled .d.ts and @types/vanilla-cookieconsent does not
 * exist on npm (verified 2026-06-05). This shim covers exactly what
 * components/cookie-consent-v3.tsx imports — no more.
 *
 * Shim path: types/vanilla-cookieconsent.d.ts
 * Re-check: if upgrading vanilla-cookieconsent to a version that ships its own
 * types, delete this file and verify `tsc --noEmit` still passes.
 */

declare module 'vanilla-cookieconsent' {
  export interface CookieValue {
    categories: string[]
    revision?: number
    data?: unknown
    consentId?: string
    consentTimestamp?: string
    lastConsentTimestamp?: string
  }

  export interface ConsentEvent {
    cookie: CookieValue
  }

  export interface ChangeEvent extends ConsentEvent {
    changedCategories: string[]
    changedServices: Record<string, string[]>
  }

  export interface AutoClearCookie {
    name: string | RegExp
    domain?: string
    path?: string
  }

  export interface CategoryConfig {
    enabled?: boolean
    readOnly?: boolean
    autoClear?: {
      cookies: AutoClearCookie[]
      reloadPage?: boolean
    }
    services?: Record<string, unknown>
  }

  export interface ConsentModalConfig {
    title?: string
    description?: string
    acceptAllBtn?: string
    acceptNecessaryBtn?: string
    showPreferencesBtn?: string
    footer?: string
    closeIconLabel?: string
  }

  export interface CookieTableSection {
    headers?: Record<string, string>
    body?: Record<string, string>[]
  }

  export interface PreferencesSection {
    title?: string
    description?: string
    linkedCategory?: string
    cookieTable?: CookieTableSection
  }

  export interface PreferencesModalConfig {
    title?: string
    acceptAllBtn?: string
    acceptNecessaryBtn?: string
    savePreferencesBtn?: string
    closeIconLabel?: string
    sections?: PreferencesSection[]
  }

  export interface TranslationConfig {
    consentModal?: ConsentModalConfig
    preferencesModal?: PreferencesModalConfig
  }

  export interface LanguageConfig {
    default: string
    autoDetect?: string
    translations: Record<string, TranslationConfig>
  }

  export interface GuiOptions {
    consentModal?: {
      layout?: string
      position?: string
      equalWeightButtons?: boolean
      flipButtons?: boolean
    }
    preferencesModal?: {
      layout?: string
      equalWeightButtons?: boolean
      flipButtons?: boolean
    }
  }

  export interface CookieConsentConfig {
    guiOptions?: GuiOptions
    categories?: Record<string, CategoryConfig>
    language?: LanguageConfig
    onFirstConsent?: (event: ConsentEvent) => void
    onConsent?: (event: ConsentEvent) => void
    onChange?: (event: ChangeEvent) => void
    revision?: number
    cookie?: {
      name?: string
      domain?: string
      path?: string
      sameSite?: string
      expiresAfterDays?: number
    }
    disablePageInteraction?: boolean
    lazyHtmlGeneration?: boolean
    autoClearCookies?: boolean
  }

  export function run(config: CookieConsentConfig): Promise<void>
  export function show(createModal?: boolean): void
  export function hide(): void
  export function showPreferences(): void
  export function hidePreferences(): void
  export function acceptCategory(categories: string | string[]): void
  export function getConsent(): CookieValue
  export function validConsent(): boolean
  export function eraseCookies(cookies: string | RegExp | Array<string | RegExp>): void
  export function loadScript(path: string, attrs?: Record<string, string>): Promise<boolean>
  export function setLanguage(languageCode: string, force?: boolean): Promise<void>
  export function getCookie(field?: keyof CookieValue): unknown
  export function getConfig(field?: keyof CookieConsentConfig): unknown
  export function acceptedCategory(categoryName: string): boolean
}

// CSS module side-effect import
declare module 'vanilla-cookieconsent/dist/cookieconsent.css' {}
