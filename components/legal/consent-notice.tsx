'use client'

/**
 * ConsentNotice — inline disclosure rendered next to a CTA that performs a
 * data-collecting action (e.g. the Adopt button, the final-step "Open
 * checkout" link in the gift wizard).
 *
 * GDPR Art. 6(1)(b) — contract necessity — covers the actual purchase, but
 * Art. 13 still requires that the data subject be informed of the basis
 * BEFORE submission. CAN-SPAM § 5(a) treats the click itself as the consent
 * action for transactional flows, so we DO NOT block the click — we only
 * disclose. Marketing signups (newsletter) use MarketingConsentCheckbox
 * instead, which IS blocking per PECR.
 *
 * Translation keys (with English fallbacks):
 *   - legal.consentBy     → "By {action} you agree to our"
 *   - legal.consentTerms  → "Terms"
 *   - legal.consentPrivacy → "Privacy Policy"
 *
 * Links go to `/${locale}/terms` and `/${locale}/privacy`. Those pages
 * exist but currently render a "content pending" notice until
 * LEGAL_CONTENT_LIVE=true; the URLs are still valid and stable.
 */

import type { Locale } from '@/i18n.config'
import { useTranslations } from 'next-intl'

interface ConsentNoticeProps {
  locale: Locale
  /**
   * Verb phrase that fits into the sentence "By {actionLabel} you agree…",
   * e.g. "adopting", "completing your gift". Caller controls the wording so
   * we never hard-code an action.
   */
  actionLabel: string
}

export function ConsentNotice({ locale, actionLabel }: ConsentNoticeProps) {
  const translate = useTranslations()
  // Translation files contain a placeholder `{action}` so localised copy can
  // reorder around the verb (e.g. German verb-final). For unknown locales we
  // fall back to English. The translation helper already falls back to en,
  // and then to the default value, so we always render something readable.
  // `.raw()` returns the literal message ("By {action} you agree to our")
  // WITHOUT running ICU formatting. We need the raw template here because we
  // split on the `{action}` placeholder and inject `actionLabel` as a styled
  // span below. Calling `translate('legal.consentBy')` instead throws
  // FORMATTING_ERROR — ICU sees `{action}` and demands a value we deliberately
  // don't pass (we render it as markup, not a plain string).
  const byTemplate = String(translate.raw('legal.consentBy'))
  const termsLabel = translate('legal.consentTerms')
  const privacyLabel = translate('legal.consentPrivacy')

  const [before, after] = byTemplate.includes('{action}')
    ? byTemplate.split('{action}')
    : [byTemplate + ' ', '']

  const termsHref = `/${locale}/terms`
  const privacyHref = `/${locale}/privacy`

  return (
    <p
      className="text-xs text-foreground/60 mt-3 text-center leading-relaxed"
      data-testid="consent-notice"
    >
      {before}
      <span className="font-medium text-foreground/80">{actionLabel}</span>
      {after}{' '}
      <a
        href={termsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline text-accent"
      >
        {termsLabel}
      </a>
      {' & '}
      <a
        href={privacyHref}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline text-accent"
      >
        {privacyLabel}
      </a>
      .
    </p>
  )
}
