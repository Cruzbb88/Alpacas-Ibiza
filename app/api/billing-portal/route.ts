import { NextResponse } from 'next/server'
import { SITE_BASE_URL } from '@/lib/config'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { extractLocaleFromReferer, requireEnvOrReturn503 } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { sendEmail } from '@/lib/mailer'
import { buildBillingPortalEmail } from '@/lib/email-templates'
import { withAlwaysOk200 } from '@/lib/oracle-form-guard'

/**
 * POST /api/billing-portal
 *
 * Accepts: { email: string; locale?: string; 'cf-turnstile-response'?: string }
 * Returns: ALWAYS `{ ok: true }` 200 on any valid input.
 *
 * The Stripe Customer Portal URL is delivered out-of-band via email to the
 * supplied address — NEVER in the JSON response. This closes an email-oracle
 * enumeration vector: if the response differed between "subscriber" and
 * "non-subscriber", an attacker could probe arbitrary emails to learn who
 * has an adoption subscription (privacy leak + targeting data for phishing).
 *
 * Defence layers (in order):
 *   1. Stripe key gate — 503 if STRIPE_SECRET_KEY unset (fail-CLOSED).
 *   2. Honeypot — bots filling `website` field get silent 200 (no email sent).
 *   3. IP rate limit — 3 req / 5 min per IP.
 *   4. Per-email rate limit — 2 req / 1 hour per email (legit users rarely re-open).
 *   5. Turnstile — bot check.
 *   6. Side-channel email — portal URL emailed to user, never returned.
 *
 * The `customer_id` direct-lookup path that used to live here was removed:
 *   - the only legit caller (BillingPortalLink) never sent customer_id
 *   - allowing customer_id input would expose a separate Stripe-ID oracle
 *
 * Fail-CLOSED on Stripe gate. Fail-QUIET on everything else (silent 200) so
 * that no response shape ever reveals customer existence.
 *
 * PREREQUISITE (owner action): Enable Customer Portal in Stripe dashboard:
 *   Stripe → Settings → Billing → Customer portal → Activate
 *   https://dashboard.stripe.com/settings/billing/portal
 */

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('billing-portal', reqId)

  // Stripe key gate — fail-CLOSED. Must be outside oracle wrapper because
  // this is the only non-200 path that is intentional and required.
  const secretGate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Subscription portal is unavailable — contact info@alpacasibiza.com to manage your subscription.', { code: 'STRIPE_NOT_CONFIGURED' })
  if (secretGate) return attachRequestId(secretGate, reqId)
  const secretKey = process.env.STRIPE_SECRET_KEY!

  let body: { email?: string; locale?: string; 'cf-turnstile-response'?: string; website?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Malformed body → silent 200 (don't help fuzzers).
    return attachRequestId(NextResponse.json({ ok: true }, { status: 200 }), reqId)
  }

  // Email length cap — RFC 5321 max 320 chars. Silent 200 on oversized input
  // (oracle-closure: same shape as all other invalid-email paths).
  if (body.email && String(body.email).length > 320) {
    return attachRequestId(NextResponse.json({ ok: true }, { status: 200 }), reqId)
  }

  const { locale } = body

  // Oracle guard: honeypot → IP rate-limit → email validation → per-email rate-limit
  // → Turnstile → onAllowed. Always returns 200.
  const response = await withAlwaysOk200(
    request,
    body as Record<string, unknown>,
    {
      routeName: 'billing-portal',
      honeypotField: 'website',
      rateLimitPerIp: { limit: 3, windowMs: 5 * 60_000 },
      rateLimitPerEmail: { limit: 2, windowMs: 60 * 60_000 },
    },
    async () => {
      // email is validated inside withAlwaysOk200 before onAllowed is called
      const email = (body.email ?? '').trim()

      const stripeFactory = await importStripe()
      if (!stripeFactory) {
        log.error('stripe SDK not installed. Run: pnpm add stripe (owner-controlled deploy step).')
        return
      }
      const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

      let customerId: string | undefined
      try {
        const customers = await stripe.customers.list({ email, limit: 1 })
        customerId = customers.data[0]?.id
      } catch (err) {
        log.error('Stripe customers.list failed', { message: err instanceof Error ? err.message : String(err) })
        return
      }

      if (!customerId) {
        // No subscription for this email — silent no-op (preserves oracle closure).
        log.info('billing-portal: no customer for email', { email_first4: email.slice(0, 4) + '…' })
        return
      }

      const allowed = ['en', 'nl', 'es', 'de', 'it', 'fr']
      const safeLocale = locale && allowed.includes(locale)
        ? locale
        : extractLocaleFromReferer(request.headers.get('referer'))
      const returnUrl = `${SITE_BASE_URL}/${safeLocale}/adopt?portal=return`

      let portalUrl: string
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        })
        portalUrl = session.url
      } catch (err) {
        log.error('billingPortal.sessions.create failed', { message: err instanceof Error ? err.message : String(err) })
        return
      }

      try {
        const { subject, html } = buildBillingPortalEmail(portalUrl)
        await sendEmail({ to: email, subject, html })
      } catch (err) {
        log.error('sendEmail failed for billing-portal link', { message: err instanceof Error ? err.message : String(err) })
        // Still return generic 200 — never reveal that customer existed but email failed.
      }
    },
  )

  return attachRequestId(response, reqId)
}
