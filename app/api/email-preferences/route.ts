import { NextResponse } from 'next/server'
import {
  verifyEmailPreferenceToken,
  isExpiredEmailPreferenceToken,
  type EmailPreferenceType,
} from '@/lib/email-preferences-token'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { importStripe } from '@/lib/integrations/stripe-sdk'

/**
 * GET  /api/email-preferences?token=<...>&action=unsubscribe&type=birthday
 * POST /api/email-preferences  { token, action, type }
 *
 * Per-email-type preference center. Donors can opt out of a specific email
 * category (birthday / quarterly / renewal) without unsubscribing from all.
 *
 * The opt-out is stored as metadata on the donor's active subscription(s):
 *   Stripe: subscription.metadata.opt_out_<type> = 'true'
 *   Mollie: subscription metadata via customers.subscriptions.update()
 *
 * Email footers should include BOTH:
 *   "Unsubscribe from all"  → /api/newsletter/unsubscribe (existing route)
 *   "Stop birthday emails only" → /api/email-preferences?token=...&action=unsubscribe&type=birthday
 *
 * Failsafe: returns 200 on all non-error paths — preference center failures
 * must never block donors. 400 on bad token, 410 on expired token.
 * Missing payment vendor keys → 200 (preference recorded as best-effort).
 *
 * Anti-enumeration: response body is always the same shape regardless of
 * whether the email was found in any subscription.
 */

const VALID_TYPES: EmailPreferenceType[] = ['birthday', 'quarterly', 'renewal']
const VALID_ACTIONS = ['unsubscribe'] as const

function parseParams(token: string | null, action: string | null, type: string | null) {
  return {
    token: typeof token === 'string' ? token : null,
    action: typeof action === 'string' && (VALID_ACTIONS as readonly string[]).includes(action)
      ? (action as (typeof VALID_ACTIONS)[number])
      : null,
    type: typeof type === 'string' && (VALID_TYPES as readonly string[]).includes(type)
      ? (type as EmailPreferenceType)
      : null,
  }
}

async function handlePreferenceRequest(
  token: string | null,
  action: string | null,
  type: string | null,
): Promise<NextResponse> {
  if (!token || !action || !type) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  const { token: safeToken, action: safeAction, type: safeType } = parseParams(token, action, type)
  if (!safeToken || !safeAction || !safeType) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const payload = verifyEmailPreferenceToken(safeToken)
  if (!payload) {
    if (isExpiredEmailPreferenceToken(safeToken)) {
      return NextResponse.json({ error: 'Token expired' }, { status: 410 })
    }
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  // Verify token type matches the request type (prevents token reuse across types)
  if (payload.type !== safeType) {
    return NextResponse.json({ error: 'Token type mismatch' }, { status: 400 })
  }

  const metaKey = `opt_out_${safeType}`
  const email = payload.email

  // ── Stripe opt-out ──────────────────────────────────────────────────────────
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (stripeKey) {
      const stripeFactory = await importStripe()
      if (stripeFactory) {
        const stripe = stripeFactory(stripeKey)
        // Find subscriptions by customer email
        const customers = await stripe.customers.list({ email, limit: 5 })
        for (const customer of customers.data) {
          const subs = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 10,
          })
          for (const sub of subs.data) {
            await stripe.subscriptions.update(sub.id, {
              metadata: { ...sub.metadata, [metaKey]: 'true' },
            })
          }
        }
      }
    }
  } catch {
    // Fail-quiet — preference center errors must not surface to donor
    console.warn(`[email-preferences] Stripe opt-out failed for ${email.slice(0, 4)}… type=${safeType}`)
  }

  // ── Mollie opt-out ──────────────────────────────────────────────────────────
  try {
    const mollieKey = process.env.MOLLIE_API_KEY
    if (mollieKey) {
      const mollie = await getMollieClient(mollieKey)
      if (mollie) {
        // Mollie: iterate customers, find by email, update subscription metadata
        const customersPage = await mollie.customers.page({ limit: 250 })
        for (const customer of customersPage) {
          if (customer.email !== email) continue
          const subsPage = await mollie.customerSubscriptions.page({
            customerId: customer.id,
            limit: 50,
          })
          for (const sub of subsPage) {
            if (sub.status !== 'active' && sub.status !== 'pending') continue
            await mollie.customerSubscriptions.update(sub.id, {
              customerId: customer.id,
              metadata: { ...(sub.metadata ?? {}), [metaKey]: 'true' },
            })
          }
        }
      }
    }
  } catch {
    console.warn(`[email-preferences] Mollie opt-out failed for ${email.slice(0, 4)}… type=${safeType}`)
  }

  return NextResponse.json({
    ok: true,
    message: `Preference updated — you will no longer receive ${payload.type} emails.`,
  })
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const action = searchParams.get('action')
  const type = searchParams.get('type')

  // Validate params (shape only — no mutation)
  const { token: safeToken, action: safeAction, type: safeType } = parseParams(token, action, type)
  if (!safeToken || !safeAction || !safeType) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  // Verify the token — report expired vs invalid
  const payload = verifyEmailPreferenceToken(safeToken)
  if (!payload) {
    if (isExpiredEmailPreferenceToken(safeToken)) {
      return NextResponse.json({ error: 'Token expired' }, { status: 410 })
    }
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  // Return a minimal HTML interstitial with a POST confirmation form — NO mutation in GET.
  // This prevents link-prefetch scanners (Google, Slack, email clients) from silently
  // opting out the donor by following the one-click unsubscribe link.
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Confirm preference</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:sans-serif;max-width:480px;margin:3rem auto;padding:0 1rem}
button{background:#556B2F;color:#fff;border:none;padding:.75rem 1.5rem;border-radius:4px;font-size:1rem;cursor:pointer}
button:hover{background:#3e4e22}</style></head>
<body>
<h1>Confirm preference update</h1>
<p>Click the button below to stop receiving <strong>${safeType}</strong> emails.</p>
<form method="POST" action="/api/email-preferences">
  <input type="hidden" name="token" value="${safeToken}">
  <input type="hidden" name="action" value="${safeAction}">
  <input type="hidden" name="type" value="${safeType}">
  <button type="submit">Confirm — stop ${safeType} emails</button>
</form>
</body></html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  return handlePreferenceRequest(
    typeof body.token === 'string' ? body.token : null,
    typeof body.action === 'string' ? body.action : null,
    typeof body.type === 'string' ? body.type : null,
  )
}
