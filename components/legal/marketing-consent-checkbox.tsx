'use client'

/**
 * MarketingConsentCheckbox — affirmative, un-ticked-by-default consent
 * checkbox for marketing signups (currently: the newsletter form).
 *
 * PECR (UK Privacy and Electronic Communications Regulations 2003 reg 22)
 * and GDPR Art. 7 + Recital 32 require:
 *   - Unambiguous, freely-given consent (no pre-ticked boxes)
 *   - Specific to the processing purpose (here: marketing emails)
 *   - As easy to withdraw as to give (handled by /api/newsletter/unsubscribe)
 *
 * Controlled component. Caller owns the `checked` state so the parent form
 * can disable submit until it's true (when `required`) and persist the
 * consent timestamp on submission.
 */

import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'

interface MarketingConsentCheckboxProps {
  locale: Locale
  checked: boolean
  onChange: (next: boolean) => void
  /**
   * When true, this checkbox represents the legal basis for sending
   * marketing email and the parent form should block submit until it
   * resolves to true. Defaults to true — marketing signup is the primary
   * use case. Pass `false` to render the same checkbox as optional
   * (e.g. on a checkout flow where marketing opt-in is offered alongside a
   * separate transactional consent).
   */
  required?: boolean
  /**
   * Optional id so two instances on the same page don't clash and so the
   * parent can reference it from an aria-describedby on the submit button.
   */
  id?: string
  disabled?: boolean
}

export function MarketingConsentCheckbox({
  locale,
  checked,
  onChange,
  required = true,
  id = 'marketing-consent',
  disabled = false,
}: MarketingConsentCheckboxProps) {
  const translate = t(locale)
  // The translation file holds a single string that includes the
  // [Privacy Policy] anchor placeholder so localised copy can move the link
  // mid-sentence. We split on the placeholder and render the link as a real
  // <a>, falling back gracefully if the placeholder is missing.
  const raw = translate(
    'legal.marketingConsent',
    'I agree to receive Alpacas Ibiza updates and accept the [Privacy Policy].',
  )

  const privacyHref = `/${locale}/privacy`
  const linkText = translate('legal.consentPrivacy', 'Privacy Policy')

  const placeholderMatch = raw.match(/\[([^\]]+)\]/)
  let before = raw
  let after = ''
  let visibleLinkText = linkText
  if (placeholderMatch) {
    const [full, inner] = placeholderMatch
    const idx = raw.indexOf(full)
    before = raw.slice(0, idx)
    after = raw.slice(idx + full.length)
    visibleLinkText = inner
  }

  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 text-sm text-foreground cursor-pointer"
    >
      <input
        id={id}
        name="marketing_consent"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        required={required}
        aria-required={required || undefined}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-2 focus:ring-accent focus:ring-offset-0"
        data-testid="marketing-consent-checkbox"
      />
      <span>
        {before}
        <a
          href={privacyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline hover:no-underline"
        >
          {visibleLinkText}
        </a>
        {after}
        {required && <span aria-hidden="true" className="text-accent ml-0.5">*</span>}
      </span>
    </label>
  )
}
