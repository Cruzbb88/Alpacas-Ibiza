/**
 * Stripe `checkout.session.expired` handler — pure function.
 *
 * Sends a single recovery email when a donor abandoned checkout.
 *
 * Fail-quiet: webhook returns 200 even if send fails (avoid Stripe retry-spam).
 * Idempotency is enforced by the caller (webhook-idempotency Map keyed by event.id).
 *
 * ADR 016 (pure-function-payment-handlers) pattern: no I/O injected into module
 * scope; all side-effects arrive via `deps` argument so unit tests can stub them.
 */

import { buildAbandonedAdoptionEmail } from '@/lib/email-templates-retention'
import { isValidEmail } from '@/lib/validate-email'
import { SITE_BASE_URL } from '@/lib/config'
import { i18nConfig } from '@/i18n.config'

const ALLOWED_LOCALES = new Set<string>(i18nConfig.locales)

export interface StripeCheckoutExpiredHandlerDeps {
    sendEmail: (opts: { to: string; subject: string; html: string }) => Promise<unknown>
    log: {
        info:  (msg: string, meta?: object) => void
        warn:  (msg: string, meta?: object) => void
        error: (msg: string, meta?: object) => void
    }
}

export interface StripeCheckoutExpiredEvent {
    id: string
    customer_details: { email: string | null; name: string | null } | null
    metadata: Record<string, string> | null
    locale: string | null
}

export type StripeCheckoutExpiredResult =
    | { ok: true;  sent: true;  skipReason?: undefined }
    | { ok: true;  sent: false; skipReason: 'missing-email' | 'invalid-email' | 'no-locale' | 'unknown-tier' }
    | { ok: false; error: string }

/**
 * Handle a Stripe `checkout.session.expired` event.
 *
 * Skip conditions (all return `{ok:true, sent:false}` so the caller still
 * returns HTTP 200 — avoid Stripe retry-spam on non-actionable events):
 *   - `customer_details.email` missing → `missing-email`
 *   - email fails RFC-regex → `invalid-email`
 *   - `metadata.tier` absent → `unknown-tier` (not an Adopt-a-Paca session)
 *
 * On send failure the error is caught, logged at `warn`, and
 * `{ok:false, error:'send-failed'}` is returned. The caller still returns
 * HTTP 200 (fail-quiet contract, same as checkout.session.completed).
 */
export async function handleStripeCheckoutExpired(
    session: StripeCheckoutExpiredEvent,
    deps: StripeCheckoutExpiredHandlerDeps,
): Promise<StripeCheckoutExpiredResult> {
    const donorEmail = session.customer_details?.email ?? null

    if (!donorEmail) {
        return { ok: true, sent: false, skipReason: 'missing-email' }
    }

    if (!isValidEmail(donorEmail)) {
        return { ok: true, sent: false, skipReason: 'invalid-email' }
    }

    const donorName  = session.customer_details?.name ?? null
    const alpacaSlug = session.metadata?.alpaca ?? null
    const tier       = session.metadata?.tier   ?? null
    const rawLocale  = session.locale            ?? 'en'
    const locale     = ALLOWED_LOCALES.has(rawLocale) ? rawLocale : 'en'

    // Only attempt recovery for sessions we recognise as Adopt-a-Paca checkouts.
    if (!tier) {
        return { ok: true, sent: false, skipReason: 'unknown-tier' }
    }

    // Resume URL: direct donor back to /adopt with alpaca pre-selected if known.
    // We don't re-issue a Stripe Checkout session — they can't be revived once
    // expired. A fresh session is created on the next "Adopt" click.
    const resumeParams = new URLSearchParams()
    if (alpacaSlug) resumeParams.set('alpaca', alpacaSlug)
    resumeParams.set('utm_source', 'recovery_email')
    resumeParams.set('utm_campaign', 'abandoned_adoption')
    const resumeUrl = `${SITE_BASE_URL}/${locale}/adopt?${resumeParams.toString()}`

    const { subject, html } = buildAbandonedAdoptionEmail({
        donorName,
        resumeUrl,
        alpacaName: alpacaSlug,
        locale,
    })

    try {
        await deps.sendEmail({ to: donorEmail, subject, html })
        deps.log.info('[recovery] abandoned-cart email sent', { sessionId: session.id, locale })
        return { ok: true, sent: true }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        deps.log.warn('[recovery] abandoned-cart email send failed (fail-quiet)', {
            sessionId: session.id,
            error: msg,
        })
        return { ok: false, error: 'send-failed' }
    }
}

// ---------------------------------------------------------------------------
// Gift-welcome payload builder
// ---------------------------------------------------------------------------

import type { GiftMetadata } from './payment-handlers-gift-schedule.ts'

/**
 * Build a per-recipient gift-welcome email payload. Owner of the actual
 * email template lives in lib/email-templates.ts (parallel AI's domain).
 * This helper just composes the structured opts the template should consume.
 */

export interface GiftWelcomeOpts {
  recipientName: string
  recipientEmail: string
  senderName: string | null
  alpacaName: string | null
  giftMessage: string | null
  tier: 'monthly' | 'yearly'
  locale: string
}

export function buildGiftWelcomeOpts(
  metadata: GiftMetadata & { tier: string; alpaca?: string | null; locale?: string | null },
): GiftWelcomeOpts | null {
  const recipientEmail = metadata.gift_recipient_email?.trim()
  if (!recipientEmail) return null
  const tier = metadata.tier === 'yearly' ? 'yearly' : 'monthly'
  return {
    recipientName: metadata.gift_recipient_name?.trim() || 'Friend',
    recipientEmail,
    senderName: metadata.gift_sender_name?.trim() || null,
    alpacaName: metadata.alpaca?.trim() || null,
    giftMessage: metadata.gift_message?.trim() || null,
    tier,
    locale: metadata.locale ?? 'en',
  }
}
