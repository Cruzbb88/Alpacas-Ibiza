/**
 * Retention email templates — quarterly herd update.
 *
 * This module is intentionally separate from lib/email-templates.ts
 * (parallel AI's domain). All user-controlled values (donorName, alpacaName)
 * MUST be passed through escapeHtml before interpolation.
 *
 * Visual style mirrors email-templates.ts — inline BRAND constants are
 * intentionally duplicated here (not imported) to avoid coupling with
 * that module's internal changes.
 */

import { escapeHtml } from './html.ts'

// Mirrors SITE_BASE_URL_INLINE in lib/email-templates.ts — kept inline
// so this module works in node:test runs that bypass the @/ alias.
const SITE_BASE_URL_INLINE = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alpacasibiza.com'
).replace(/\/$/, '')

const BRAND = {
    name: 'Alpacas Ibiza',
    primary: '#556B2F',
    secondary: '#f5f5dc',
}

function retentionEmailLayout(innerHtml: string): string {
    return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
${innerHtml}
<hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
<p style="color:#999;font-size:12px">${BRAND.name} · info@alpacasibiza.com · <a href="https://wa.me/32475586544" style="color:${BRAND.primary}">WhatsApp</a></p>
</div>
`.trim()
}

export interface QuarterlyUpdateOpts {
    /** Donor's display name — user-controlled, will be HTML-escaped. */
    donorName: string | null
    /** Name of the adopted alpaca — user-controlled, will be HTML-escaped. */
    alpacaName: string | null
    /** Human label for the quarter, e.g. "Spring 2026". */
    quarterLabel: string
    /** Two-letter locale slug for locale-prefixed site links, e.g. "en". */
    locale: string
}

/**
 * Build the quarterly "update from the herd" email.
 *
 * Subject: "A note from the herd — {quarterLabel}"
 * Content blocks:
 *   (a) Herd news — generic warm copy; TODO for owner-supplied details
 *   (b) Your next visit — link to tours page
 *   (c) Manage your adoption — link to billing portal request
 *   (d) Standard footer (rendered by retentionEmailLayout)
 */
export function buildQuarterlyUpdateEmail(
    opts: QuarterlyUpdateOpts,
): { subject: string; html: string } {
    const { donorName, alpacaName, quarterLabel, locale } = opts

    const safeQuarterLabel = escapeHtml(quarterLabel)
    const safeDonorName = donorName ? escapeHtml(donorName) : null
    const safeAlpacaName = alpacaName ? escapeHtml(alpacaName) : null

    // Subject is plain text — use raw quarterLabel; HTML body uses safeQuarterLabel.
    const subject = `A note from the herd — ${quarterLabel}`

    // --- Greeting ---
    const greeting = safeDonorName
        ? `<h2 style="color:${BRAND.primary}">Hi ${safeDonorName} 🦙</h2>`
        : `<h2 style="color:${BRAND.primary}">A note from the herd 🦙</h2>`

    // --- Alpaca personalisation ---
    const alpacaLine = safeAlpacaName
        ? `<p>We have an update to share about <strong>${safeAlpacaName}</strong> and the rest of the herd — thank you for making this possible.</p>`
        : `<p>Thanks to your support, the whole herd is thriving — here's what's been happening on the farm.</p>`

    // --- Block (a): Herd news ---
    const herdNewsBlock = `
<h3 style="margin-top:24px;color:${BRAND.primary}">Here's how the herd has been</h3>
${alpacaLine}
<!-- TODO / UNMAPPED: owner-supplied seasonal update for ${safeQuarterLabel}.
     Set QUARTERLY_UPDATE_BODY_${safeQuarterLabel.replace(/\s+/g, '_').toUpperCase()} env var
     or populate a per-quarter content file to inject custom copy here. -->
<p style="background:${BRAND.secondary};border-left:4px solid ${BRAND.primary};padding:12px 16px;border-radius:4px;color:#555;font-style:italic">
  [Owner action: supply a short seasonal update — photos, new arrivals, farm news — for this section before sending.]
</p>
`

    // --- Block (b): Next visit ---
    const safeLocale = escapeHtml(locale || 'en')
    const toursUrl = `${SITE_BASE_URL_INLINE}/${safeLocale}/tours`
    const nextVisitBlock = `
<h3 style="margin-top:24px;color:${BRAND.primary}">Your next visit</h3>
<p>The alpacas would love to see you again. Browse our upcoming tours and book your spot:</p>
<div style="margin:16px 0">
  <a href="${toursUrl}" style="display:inline-block;padding:10px 20px;background:${BRAND.primary};color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">Browse Tours</a>
</div>
`

    // --- Block (c): Manage adoption ---
    const billingPortalUrl = `${SITE_BASE_URL_INLINE}/${safeLocale}/adopt#manage`
    const safePortalUrl = escapeHtml(billingPortalUrl)
    const manageBlock = `
<h3 style="margin-top:24px;color:${BRAND.primary}">Manage your adoption</h3>
<p>Need to update payment details, pause, or cancel? <a href="${safePortalUrl}" style="color:${BRAND.primary}">Manage your adoption here</a>.</p>
`

    const html = retentionEmailLayout(`
${greeting}
<p>It's ${safeQuarterLabel} — time for your quarterly update straight from the farm.</p>
${herdNewsBlock}
${nextVisitBlock}
${manageBlock}
`)

    return { subject, html }
}

// ── Renewal reminder email ────────────────────────────────────────────────────

/**
 * Locale-switched subject line for the renewal reminder email.
 * Same fall-through pattern as reminderSubject() in email-templates.ts.
 * Covers the 5 non-English locales the site ships (de/it/es/nl/fr).
 */
export function buildRenewalReminderSubject(tier: 'monthly' | 'yearly', locale?: string | null): string {
    switch (locale) {
        case 'de': return tier === 'yearly'
            ? 'Deine Alpaka-Patenschaft verlängert sich bald — danke für ein Jahr Unterstützung 🦙'
            : 'Deine Alpaka-Patenschaft verlängert sich nächsten Monat — danke 🦙'
        case 'it': return tier === 'yearly'
            ? 'La tua adozione di un alpaca si rinnova presto — grazie per un anno di supporto 🦙'
            : 'La tua adozione di un alpaca si rinnova il mese prossimo — grazie 🦙'
        case 'es': return tier === 'yearly'
            ? 'Tu adopción de alpaca se renueva pronto — gracias por un año de apoyo 🦙'
            : 'Tu adopción de alpaca se renueva el mes que viene — gracias 🦙'
        case 'nl': return tier === 'yearly'
            ? 'Je alpaca-adoptie wordt binnenkort verlengd — bedankt voor een jaar steun 🦙'
            : 'Je alpaca-adoptie wordt volgende maand verlengd — bedankt 🦙'
        case 'fr': return tier === 'yearly'
            ? 'Votre adoption d\'alpaga se renouvelle bientôt — merci pour une année de soutien 🦙'
            : 'Votre adoption d\'alpaga se renouvelle le mois prochain — merci 🦙'
        default: return tier === 'yearly'
            ? `Your alpaca adoption renews soon — thank you for a year of support 🦙`
            : `Your alpaca adoption renews next month — thank you 🦙`
    }
}

export interface RenewalReminderOpts {
    /** Donor's display name — user-controlled, will be HTML-escaped. */
    donorName: string | null
    /** Name of the adopted alpaca — user-controlled, will be HTML-escaped. */
    alpacaName: string | null
    /** Subscription tier. */
    tier: 'monthly' | 'yearly'
    /** ISO date string for the upcoming renewal. */
    renewalDate: string
    /** Referral code from subscription metadata, if set. */
    referralCode: string | null
    /** Tenant-aware billing portal URL. */
    billingPortalUrl: string
    /** Two-letter locale slug, e.g. "en". */
    locale: string
}

/**
 * Build the pre-renewal reminder email.
 *
 * Sent T-14 days before current_period_end.
 * Contains: thank-you, referral code block (if present), upgrade nudge
 * (monthly→yearly only), billing-portal manage link.
 */
export function buildRenewalReminderEmail(
    opts: RenewalReminderOpts,
): { subject: string; html: string } {
    const { donorName, alpacaName, tier, renewalDate, referralCode, billingPortalUrl, locale } = opts

    const safeDonorName    = donorName    ? escapeHtml(donorName)    : null
    const safeAlpacaName   = alpacaName   ? escapeHtml(alpacaName)   : null
    const safeRenewalDate  = escapeHtml(renewalDate)
    // billingPortalUrl is server-constructed — still escape for defence-in-depth.
    const safePortalUrl    = escapeHtml(billingPortalUrl)
    // referralCode format is ALPACA-[A-Z0-9]{6} — uppercase alphanumeric, safe to display.
    const safeReferralCode = referralCode ? escapeHtml(referralCode) : null

    // --- Subject (locale-switched, same fall-through pattern as reminderSubject) ---
    const subject = buildRenewalReminderSubject(tier, locale)

    // --- Greeting ---
    const greeting = safeDonorName
        ? `<h2 style="color:${BRAND.primary}">Hi ${safeDonorName} 🦙</h2>`
        : `<h2 style="color:${BRAND.primary}">Hello from the herd 🦙</h2>`

    // --- Alpaca personalisation ---
    const alpacaLine = safeAlpacaName
        ? `<p>Your adoption of <strong>${safeAlpacaName}</strong> is coming up for renewal on <strong>${safeRenewalDate}</strong>.</p>`
        : `<p>Your alpaca adoption is coming up for renewal on <strong>${safeRenewalDate}</strong>.</p>`

    // --- Impact block (tier-branched copy) ---
    const tierLabel = tier === 'yearly' ? 'year' : 'month'
    const impactBlock = `
<h3 style="margin-top:24px;color:${BRAND.primary}">Here's what your support has done</h3>
<p>It's been another ${tierLabel} of your support — and it means a great deal to the whole herd.</p>
<!-- TODO / UNMAPPED: owner-supplied impact stats block.
     Inject real numbers (hay bales funded, vet visits covered, etc.) from
     a per-donor stats endpoint or env-var template before sending. -->
<p style="background:${BRAND.secondary};border-left:4px solid ${BRAND.primary};padding:12px 16px;border-radius:4px;color:#555;font-style:italic">
  [Owner action: supply a short impact paragraph — e.g. "Your €X in support this ${tierLabel} paid for
  N bags of hay, Y vet check-ups, and Z …" — before the send goes live.]
</p>
`

    // --- Referral code block (only when code is present) ---
    const referralBlock = safeReferralCode
        ? `
<div style="background:${BRAND.secondary};border:2px dashed ${BRAND.primary};border-radius:8px;padding:16px 20px;margin:24px 0">
  <h3 style="margin:0 0 8px;color:${BRAND.primary}">Share the herd 🎁</h3>
  <p style="margin:0 0 12px;font-size:14px">Know someone who'd love to adopt an alpaca? Give them <strong>€5 off their first month</strong> with your personal code:</p>
  <p style="font-size:24px;font-weight:700;letter-spacing:2px;color:${BRAND.primary};margin:0 0 12px">${safeReferralCode}</p>
  <p style="font-size:12px;color:#777;margin:0">They can use this code at checkout — just share this link:<br>
    <a href="${SITE_BASE_URL_INLINE}/${escapeHtml(locale || 'en')}/adopt?referral=${safeReferralCode}" style="color:${BRAND.primary};word-break:break-all">
      ${SITE_BASE_URL_INLINE}/${escapeHtml(locale || 'en')}/adopt?referral=${safeReferralCode}
    </a>
  </p>
</div>
`
        : ''

    // --- Monthly-only upgrade nudge ---
    const upgradeBlock = tier === 'monthly'
        ? `
<div style="background:#f0f7ea;border-left:4px solid ${BRAND.primary};padding:12px 16px;border-radius:4px;margin:24px 0">
  <p style="margin:0;font-size:14px">
    <strong>Save with yearly?</strong> Switch to a yearly plan and save compared to 12 monthly payments —
    plus unlock extra perks like the professional alpaca photoshoot and a bag of fertilizer.
    <a href="${safePortalUrl}" style="color:${BRAND.primary};font-weight:600">Switch plan in your portal →</a>
  </p>
</div>
`
        : ''

    // --- Billing portal block ---
    const manageBlock = `
<h3 style="margin-top:24px;color:${BRAND.primary}">Manage your adoption</h3>
<p>Need to update your payment details, pause, or make any changes before the renewal?
  <a href="${safePortalUrl}" style="color:${BRAND.primary}">Manage your adoption here</a>.
</p>
`

    const html = retentionEmailLayout(`
${greeting}
${alpacaLine}
${impactBlock}
${referralBlock}
${upgradeBlock}
${manageBlock}
`)

    return { subject, html }
}

// ── Abandoned-cart / checkout-expired recovery ──────────────────────────────

export interface AbandonedAdoptionEmailOpts {
    /** Donor's display name — user-controlled, will be HTML-escaped. */
    donorName: string | null
    /** Signed Stripe checkout link OR /adopt URL to restart the flow. */
    resumeUrl: string
    /** Alpaca slug (used as display name) — user-controlled, will be HTML-escaped. */
    alpacaName: string | null
    /** Two-letter locale slug for locale-prefixed site links, e.g. "en". */
    locale: string
}

/**
 * Build the abandoned-checkout recovery email.
 *
 * Subject: "Your adoption is waiting at Es Currals"
 * Content: warm reminder that checkout was started; clear CTA to resume.
 * No unsubscribe footer — this is a transactional retry email exempt under
 * CAN-SPAM § 5(a)(2) (transactional relationship message). Not bulk marketing.
 */
export function buildAbandonedAdoptionEmail(
    opts: AbandonedAdoptionEmailOpts,
): { subject: string; html: string } {
    const { donorName, resumeUrl, alpacaName, locale: _locale } = opts

    const safeDonorName = donorName ? escapeHtml(donorName) : null
    const safeAlpacaName = alpacaName ? escapeHtml(alpacaName) : null
    // resumeUrl is server-constructed (SITE_BASE_URL + UTM params) — not user input.
    // Still escape for defence-in-depth in case alpaca slug contains markup.
    const safeResumeUrl = escapeHtml(resumeUrl)

    const subject = `Your adoption is waiting at Es Currals`

    const greeting = safeDonorName
        ? `<h2 style="color:${BRAND.primary}">Hi ${safeDonorName} 🦙</h2>`
        : `<h2 style="color:${BRAND.primary}">Your adoption is waiting 🦙</h2>`

    const alpacaLine = safeAlpacaName
        ? `<p>We noticed you started an adoption for <strong>${safeAlpacaName}</strong> but didn't quite finish — no worries, it happens!</p>`
        : `<p>We noticed you started an adoption at Es Currals but didn't quite finish — no worries, it happens!</p>`

    const bodyBlock = `
<p>Your alpaca family is still here, waiting to welcome you. It only takes a moment to complete your adoption and give one of our herd a forever supporter.</p>
<div style="margin:24px 0">
  <a href="${safeResumeUrl}"
     style="display:inline-block;padding:12px 24px;background:${BRAND.primary};color:#fff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600">
    Complete my adoption
  </a>
</div>
<p style="color:#777;font-size:13px">If you have any questions before adopting, just reply to this email — we're happy to help.</p>
`

    const html = retentionEmailLayout(`
${greeting}
${alpacaLine}
${bodyBlock}
`)

    return { subject, html }
}
