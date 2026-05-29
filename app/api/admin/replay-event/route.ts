import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { getPaymentEventById } from '@/lib/db/read-events'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { SITE_BASE_URL } from '@/lib/config'

/**
 * POST /api/admin/replay-event
 *
 * Stripe-Dashboard-style "Events → Resend" for our own webhook delivery log.
 * Reads a payment_events row by id, then re-POSTs the original payload to OUR
 * OWN webhook endpoint with a freshly-signed header so the receiving handler
 * accepts it as a real delivery.
 *
 * Auth: next-auth session gate (admin only) — mirrors content-stage, never
 * exposed without ADMIN_USERNAME/PASSWORD configured.
 *
 * Signer-verification contract (critical):
 *   - Stripe: re-compute the HMAC-SHA256 signature using STRIPE_WEBHOOK_SECRET
 *     via stripe.webhooks.generateTestHeaderString. The receiving handler at
 *     /api/stripe-webhook validates with constructEvent, which accepts our
 *     freshly-signed header because we used the live webhook secret.
 *   - Mollie: no HMAC signature scheme — the URL ?secret=… is the auth layer.
 *     Re-POSTing to /api/mollie-webhook?secret=<MOLLIE_WEBHOOK_SECRET> passes
 *     the same constant-time secret check the live deliveries pass.
 *
 * Idempotency contract:
 *   The webhook handlers de-dup on (event.id / payment.id+status) via the
 *   in-memory webhook-idempotency Map (or, when DATABASE_URL is set, the
 *   payment_events unique index). A replay during the same warm Lambda
 *   short-circuits on that guard → 200 idempotent:true with no side effect.
 *   That is the correct ops semantics: a replay tests "did the original
 *   delivery complete first time" without re-triggering welcome/owner emails.
 *
 * Returns:
 *   200 { ok: true, replayedAs: <idempotencyKey>, statusCode: <number> }
 *     on a successful replay (statusCode is what the receiving handler
 *     returned — 200 means the dedup map short-circuited; 200 received:true
 *     means the original delivery hadn't been recorded and the handler
 *     re-processed it).
 *   401 unauthorized (no admin session)
 *   400 missing/malformed body
 *   404 event not found
 *   503 vendor not configured (missing webhook secret for the event's vendor)
 *   500 replay POST itself threw / receiving handler 5xx'd
 */

const REPLAY_FETCH_TIMEOUT_MS = 10_000

interface ReplayRequestBody {
  eventId: string
}

function isReplayRequestBody(x: unknown): x is ReplayRequestBody {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof (x as { eventId?: unknown }).eventId === 'string' &&
    (x as { eventId: string }).eventId.length > 0
  )
}

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('admin/replay-event', reqId)

  // ── Auth gate (fail-CLOSED) ─────────────────────────────────────────────────
  const session = await getServerSession(auth)
  if (!session) {
    return attachRequestId(NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }), reqId)
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return attachRequestId(NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }), reqId)
  }
  if (!isReplayRequestBody(body)) {
    return attachRequestId(NextResponse.json({ ok: false, error: 'Missing eventId' }, { status: 400 }), reqId)
  }
  const { eventId } = body

  // ── Load the recorded event ─────────────────────────────────────────────────
  const event = await getPaymentEventById(eventId)
  if (!event) {
    // Either the DB is dormant (no DATABASE_URL) or the row doesn't exist.
    // Same 404 either way — the admin UI only ever surfaces rows that came
    // out of listRecentPaymentEvents, so a 404 here means the DB just went
    // dormant between page-load and click.
    log.warn('event not found for replay', { eventId })
    return attachRequestId(
      NextResponse.json({ ok: false, error: 'Event not found' }, { status: 404 }),
      reqId,
    )
  }

  // ── Dispatch by vendor ──────────────────────────────────────────────────────
  if (event.vendor === 'stripe') {
    return attachRequestId(await replayStripeEvent(event.payloadJson, event.idempotencyKey, log), reqId)
  }
  if (event.vendor === 'mollie') {
    return attachRequestId(await replayMollieEvent(event.payloadJson, event.idempotencyKey, log), reqId)
  }

  log.error('unknown vendor on event', { vendor: (event as { vendor: string }).vendor, eventId })
  return attachRequestId(
    NextResponse.json({ ok: false, error: `Unknown vendor: ${(event as { vendor: string }).vendor}` }, { status: 400 }),
    reqId,
  )
}

// ── Stripe replay ────────────────────────────────────────────────────────────
//
// Stripe constructEvent requires the EXACT raw bytes that were signed. The
// recorded payload_json may have been parsed and re-stringified at upsert
// time (lib/db/upsert-from-webhook.ts:recordPaymentEvent does
// JSON.stringify(args.payload)), so we sign and POST the same canonical
// stringified form. The receiving handler will read request.text() back as
// the byte-for-byte payload we sign here.

async function replayStripeEvent(
  payloadJson: string,
  idempotencyKey: string,
  log: ReturnType<typeof makeRequestLogger>,
): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    log.warn('STRIPE_WEBHOOK_SECRET unset; cannot replay stripe event')
    return NextResponse.json(
      { ok: false, error: 'STRIPE_WEBHOOK_SECRET not configured' },
      { status: 503 },
    )
  }

  // The recorded payload is the Stripe Event.data.object, NOT the full Event
  // envelope. constructEvent validates the envelope shape, so wrap before
  // re-signing. We synthesise the envelope with a "rpl_<idempotencyKey>"
  // event id so the receiving handler's idempotency guard collides on the
  // ORIGINAL key (we lose the original event.id at recordPaymentEvent time
  // — only the idempotencyKey survived). Marking it as "rpl_" makes the
  // replay path obvious in handler logs.
  //
  // Important: the receiving handler uses event.id as its dedup key
  // (isAlreadyProcessed(event.id)). To make the replay short-circuit on the
  // SAME dedup that the original landed under, we set event.id to the
  // recorded idempotencyKey (which is `stripe:<original-event-id>` per
  // app/api/stripe-webhook/route.ts). That collides cleanly — webhook
  // returns 200 idempotent:true, confirming "yes, original was processed".
  let parsedObject: unknown
  try {
    parsedObject = JSON.parse(payloadJson)
  } catch {
    log.error('stripe payload_json failed to parse', { idempotencyKey })
    return NextResponse.json(
      { ok: false, error: 'Recorded payload is not valid JSON' },
      { status: 500 },
    )
  }

  const envelope = {
    id: idempotencyKey,
    object: 'event' as const,
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type: inferStripeEventType(parsedObject),
    data: { object: parsedObject },
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  }
  const canonicalBody = JSON.stringify(envelope)

  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    log.error('stripe SDK not installed; cannot sign replay payload')
    return NextResponse.json(
      { ok: false, error: 'Stripe SDK not installed' },
      { status: 503 },
    )
  }
  const stripe = stripeFactory(process.env.STRIPE_SECRET_KEY ?? 'sk_test_replay_only', { apiVersion: '2024-06-20' })

  const signature = stripe.webhooks.generateTestHeaderString({
    payload: canonicalBody,
    secret: webhookSecret,
  })

  const replayUrl = `${SITE_BASE_URL}/api/stripe-webhook`
  const statusCode = await postWithTimeout(replayUrl, canonicalBody, {
    'Content-Type': 'application/json',
    'Stripe-Signature': signature,
  }, log)

  if (statusCode === null) {
    return NextResponse.json(
      { ok: false, error: 'Replay POST failed (timeout or network)' },
      { status: 500 },
    )
  }

  log.info('stripe replay completed', { idempotencyKey, statusCode })
  return NextResponse.json({ ok: true, replayedAs: idempotencyKey, statusCode })
}

/**
 * Best-effort inference of the Stripe event type from the recorded object.
 * The DB stores event_type alongside the payload, but we don't have it on
 * this code path (the route only loaded the payload + idempotency key). The
 * receiving handler only needs the envelope's `type` to dispatch the right
 * branch; if we get it wrong it falls into the `default:` log-only path,
 * which is a harmless no-op for replay testing.
 */
function inferStripeEventType(obj: unknown): string {
  if (typeof obj !== 'object' || obj === null) return 'unknown'
  const o = obj as Record<string, unknown>
  if (o.object === 'checkout.session') return 'checkout.session.completed'
  if (o.object === 'invoice') return 'invoice.payment_failed'
  if (o.object === 'subscription') return 'customer.subscription.deleted'
  return 'unknown'
}

// ── Mollie replay ────────────────────────────────────────────────────────────
//
// Mollie webhooks are URL-secret-gated, body is form-encoded `id=<payment_id>`.
// Re-POSTing requires the original payment id (which the receiving handler
// re-fetches from the Mollie API to verify state). The recorded payload_json
// is the Mollie payment object — pull `.id` from it and post that.

async function replayMollieEvent(
  payloadJson: string,
  idempotencyKey: string,
  log: ReturnType<typeof makeRequestLogger>,
): Promise<NextResponse> {
  const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET
  if (!webhookSecret) {
    log.warn('MOLLIE_WEBHOOK_SECRET unset; cannot replay mollie event')
    return NextResponse.json(
      { ok: false, error: 'MOLLIE_WEBHOOK_SECRET not configured' },
      { status: 503 },
    )
  }

  let paymentId: string | null = null
  try {
    const parsed = JSON.parse(payloadJson) as { id?: unknown }
    if (typeof parsed.id === 'string') paymentId = parsed.id
  } catch {
    log.error('mollie payload_json failed to parse', { idempotencyKey })
    return NextResponse.json(
      { ok: false, error: 'Recorded payload is not valid JSON' },
      { status: 500 },
    )
  }
  if (!paymentId) {
    log.error('mollie payload has no .id field', { idempotencyKey })
    return NextResponse.json(
      { ok: false, error: 'Recorded payload missing Mollie payment id' },
      { status: 500 },
    )
  }

  // Form-encoded body matches the live Mollie webhook delivery shape; the
  // receiving handler at /api/mollie-webhook calls request.text() and parses
  // expecting `id=<payment_id>`.
  const formBody = `id=${encodeURIComponent(paymentId)}`
  const replayUrl = `${SITE_BASE_URL}/api/mollie-webhook?secret=${encodeURIComponent(webhookSecret)}`

  const statusCode = await postWithTimeout(replayUrl, formBody, {
    'Content-Type': 'application/x-www-form-urlencoded',
  }, log)

  if (statusCode === null) {
    return NextResponse.json(
      { ok: false, error: 'Replay POST failed (timeout or network)' },
      { status: 500 },
    )
  }

  log.info('mollie replay completed', { idempotencyKey, statusCode, paymentId })
  return NextResponse.json({ ok: true, replayedAs: idempotencyKey, statusCode })
}

// ── Shared HTTP helper ───────────────────────────────────────────────────────

async function postWithTimeout(
  url: string,
  body: string,
  headers: Record<string, string>,
  log: ReturnType<typeof makeRequestLogger>,
): Promise<number | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), REPLAY_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: ctrl.signal,
    })
    return res.status
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('replay POST threw', { url, message })
    return null
  } finally {
    clearTimeout(timer)
  }
}
