import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { parseFareHarborCsv, type FareHarborMigrationRow } from '@/lib/migration/parse-fareharbor-csv'
import { SITE_BASE_URL } from '@/lib/config'

/**
 * POST /api/admin/migration-links
 *
 * Admin-gated. Accepts a FareHarbor CSV export and returns per-customer
 * Stripe Checkout migration links for the Strategy B anniversary workflow.
 *
 * Body: { csv: string, lookaheadDays?: number }
 * Response: { rows: MigrationLinkRow[], skipped: SkipSummary[], errors: ErrorRow[] }
 *
 * Fail modes:
 * - 401 if not authenticated
 * - 400 if body is invalid JSON or csv field missing / exceeds 1 MB
 * - 503 if STRIPE_SECRET_KEY unset (code: STRIPE_SDK_MISSING or STRIPE_SECRET_KEY_UNSET)
 * - Each row fails independently via Promise.allSettled — row errors surface in errors[]
 *
 * SECURITY: success_url uses SITE_BASE_URL only — never Origin header (ADR 017).
 * client_reference_id carries the FareHarbor customer ID for original-date preservation
 * on the receiving webhook (see runbook Section 4, Risk 3).
 */

const MAX_CSV_BYTES = 1 * 1024 * 1024 // 1 MB

// 14 days from now as a Unix timestamp
function expiresAtUnix(): number {
  return Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60
}

interface MigrationLinkRow {
  customerName: string
  email: string
  tier: 'monthly' | 'yearly'
  nextRenewal: string
  checkoutUrl: string
  expiresAt: string // ISO
}

interface ErrorRow {
  email: string
  reason: string
}

export async function POST(request: NextRequest) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('migration-links', reqId)

  // ── Auth gate (fail-CLOSED) ─────────────────────────────────────────────
  const session = await getServerSession(auth)
  if (!session) {
    return attachRequestId(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      reqId,
    )
  }

  // ── Stripe SDK + key gates ──────────────────────────────────────────────
  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    log.error('stripe SDK not installed')
    return attachRequestId(
      NextResponse.json(
        { error: 'Payment SDK not installed', code: 'STRIPE_SDK_MISSING' },
        { status: 503 },
      ),
      reqId,
    )
  }

  const secretGate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Payment system not configured')
  if (secretGate) return attachRequestId(secretGate, reqId)
  const secretKey = process.env.STRIPE_SECRET_KEY!

  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return attachRequestId(
      NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
      reqId,
    )
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).csv !== 'string'
  ) {
    return attachRequestId(
      NextResponse.json({ error: 'Body must include { csv: string }' }, { status: 400 }),
      reqId,
    )
  }

  const { csv, lookaheadDays } = body as { csv: string; lookaheadDays?: unknown }

  if (csv.length > MAX_CSV_BYTES) {
    return attachRequestId(
      NextResponse.json({ error: 'CSV exceeds 1 MB limit' }, { status: 400 }),
      reqId,
    )
  }

  const lookahead =
    typeof lookaheadDays === 'number' && lookaheadDays > 0 ? lookaheadDays : 30

  // ── Parse CSV ──────────────────────────────────────────────────────────
  const { rows, skipped } = parseFareHarborCsv(csv, { lookaheadDays: lookahead })
  log.info('csv parsed', { total: rows.length, skipped: skipped.map(s => `${s.reason}:${s.count}`).join(' ') })

  if (rows.length === 0) {
    return attachRequestId(
      NextResponse.json({ rows: [], skipped, errors: [] }),
      reqId,
    )
  }

  // ── Generate Stripe Checkout links per row (independent failures) ───────
  const priceIdMonthly = process.env.STRIPE_ADOPT_PRICE_ID_MONTHLY
  const priceIdYearly = process.env.STRIPE_ADOPT_PRICE_ID_YEARLY

  const successUrl = `${SITE_BASE_URL}/en/adopt?checkout=success&tier={TIER}&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${SITE_BASE_URL}/en/adopt?checkout=cancelled`

  const expiresAt = expiresAtUnix()
  const expiresAtIso = new Date(expiresAt * 1000).toISOString()

  const settled = await Promise.allSettled(
    rows.map(async (row: FareHarborMigrationRow): Promise<MigrationLinkRow> => {
      const priceId = row.tier === 'monthly' ? priceIdMonthly : priceIdYearly
      if (!priceId) {
        throw new Error(`STRIPE_ADOPT_PRICE_ID_${row.tier.toUpperCase()} unset — cannot generate link`)
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: row.email,
        // client_reference_id carries the FareHarbor ID so handleStripeCheckoutCompleted
        // can preserve the original adoption start date (runbook Risk 3).
        client_reference_id: row.fareHarborId ?? row.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl.replace('{TIER}', row.tier),
        cancel_url: cancelUrl,
        expires_at: expiresAt,
        metadata: {
          migrated_from: 'fareharbor',
          original_start_date: row.startDate,
          original_total_paid: String(row.totalPaid),
          product: 'adopt-a-paca',
          tier: row.tier,
        },
      })

      if (!session.url) {
        throw new Error('Stripe returned session with no URL')
      }

      return {
        customerName: row.customerName,
        email: row.email,
        tier: row.tier,
        nextRenewal: row.nextRenewal,
        checkoutUrl: session.url,
        expiresAt: expiresAtIso,
      }
    }),
  )

  const resultRows: MigrationLinkRow[] = []
  const errors: ErrorRow[] = []

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]
    if (result.status === 'fulfilled') {
      resultRows.push(result.value)
    } else {
      const row = rows[i]
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
      log.error('row failed', { email: row.email, reason })
      errors.push({ email: row.email, reason })
    }
  }

  log.info('migration links generated', { success: resultRows.length, errors: errors.length })

  return attachRequestId(
    NextResponse.json({ rows: resultRows, skipped, errors }),
    reqId,
  )
}
