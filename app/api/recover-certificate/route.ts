/**
 * POST /api/recover-certificate
 *
 * Accepts: { email: string; locale?: string; bee_finds_nectar?: string }
 * Returns: ALWAYS `{ ok: true }` 200 on any input.
 *
 * Email-oracle closure (mirrors /api/billing-portal and /api/mollie-manage):
 *   The certificate URL is delivered out-of-band via email to the supplied
 *   address — NEVER in the JSON response. An attacker who submits an arbitrary
 *   email address learns nothing: both "exists" and "not found" return the
 *   same `{ ok: true }` 200 with no distinguishing body or timing.
 *
 * Defence layers (in order):
 *   1. IP rate limit — 3 req / 15 min per IP (more relaxed than billing-portal's
 *      3/5min to tolerate "try my email then my old one" legitimate use-case
 *      while still blocking automated enumeration sweeps).
 *   2. Honeypot — bots fill `bee_finds_nectar`; humans never see it.
 *   3. Email validation — invalid/missing email → silent 200, no lookup.
 *   4. Customer lookup — Stripe first (stripe.customers.list by email, then
 *      active subscription check); Mollie second (customers.iterate email scan,
 *      then customerSubscriptions.iterate for active/pending subs).
 *   5. Certificate email — only sent if a match is found AND has active sub.
 *
 * Fail-QUIET on EVERYTHING after env-gate: SDK missing, API errors, email
 * send failures all return ALWAYS_OK silently. Never reveals customer state.
 */

import { NextResponse } from 'next/server'
import { isValidEmail } from '@/lib/validate-email'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { detectHoneypot } from '@/lib/honeypot'
import { sendEmail } from '@/lib/mailer'
import { SITE_BASE_URL } from '@/lib/config'
import { buildCertificateRecoveryEmail } from '@/lib/email-templates-retention'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { getMollieClient } from '@/lib/integrations/payment-mollie'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALWAYS_OK = NextResponse.json({ ok: true })

/** Narrow shape of Mollie Customer resource we read. */
type MollieCustomerRaw = {
    id: string
    email?: string | null
    name?: string | null
}

/** Narrow shape of Mollie Subscription resource we read. */
type MollieSubRaw = {
    id: string
    status?: string
    metadata?: {
        alpacaName?: string | null
        alpaca?: string | null
        donorName?: string | null
    }
}

/**
 * Try to find an active Stripe adoption subscription for the given email.
 * Returns { name, alpaca } or null. Never throws — callers get null on any error.
 */
async function lookupStripe(email: string): Promise<{ name: string | null; alpaca: string | null } | null> {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) return null

    try {
        const stripeFactory = await importStripe()
        if (!stripeFactory) return null

        const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

        // Find the customer by email.
        const customers = await stripe.customers.list({ email, limit: 1 })
        const customer = customers.data[0]
        if (!customer) return null

        // Look up their most recent active subscription.
        const subs = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1,
        })
        const sub = subs.data[0]
        if (!sub) return null

        // Donor name lives on the customer; alpaca slug on subscription metadata.
        const name = typeof customer.name === 'string' ? customer.name || null : null
        const alpaca =
            (sub.metadata?.alpacaName ?? sub.metadata?.alpaca) || null

        return { name, alpaca }
    } catch {
        return null
    }
}

/**
 * Try to find an active Mollie adoption subscription for the given email.
 * Returns { name, alpaca } or null. Never throws — callers get null on any error.
 */
async function lookupMollie(email: string): Promise<{ name: string | null; alpaca: string | null } | null> {
    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) return null

    try {
        const mollie = await getMollieClient(apiKey)
        if (!mollie) return null

        // Mollie has no email-filter API — scan the customer list.
        // Pattern mirrors /api/mollie-manage/route.ts (cap 200, same comment).
        const lowerEmail = email.toLowerCase()
        const hit = await mollie.customers.iterate({}).take(200).find(
            (c) => {
                const raw = c as unknown as MollieCustomerRaw
                return typeof raw.email === 'string' && raw.email.toLowerCase() === lowerEmail
            },
        )
        if (!hit) return null

        const customer = hit as unknown as MollieCustomerRaw
        const name = typeof customer.name === 'string' ? customer.name || null : null

        // Walk the customer's subscriptions for an active or pending one.
        // Pattern mirrors /api/mollie-manage/route.ts (customerSubscriptions.iterate).
        const liveSubs: MollieSubRaw[] = []
        const liveStatuses = new Set(['active', 'pending'])
        for await (const sub of mollie.customerSubscriptions.iterate({ customerId: customer.id }).take(100)) {
            const raw = sub as unknown as MollieSubRaw
            if (raw.status && liveStatuses.has(raw.status)) {
                liveSubs.push(raw)
                break // first match is enough
            }
        }

        if (liveSubs.length === 0) return null

        const sub = liveSubs[0]
        // alpacaName is set by the webhook handler; alpaca is the older slug key.
        const alpaca =
            sub.metadata?.alpacaName ?? sub.metadata?.alpaca ?? null

        return { name, alpaca }
    } catch {
        return null
    }
}

export async function POST(request: Request) {
    // Anti-enumeration guarantee: ALL paths return ALWAYS_OK.
    // The only observable difference is whether a certificate email arrives.

    // Rate limit — 3 req / 15 min per IP (covers "try my email + old email"
    // without enabling enumeration sweeps).
    const ip = getClientIp(request)
    const rl = rateLimit({ key: `recover-cert:${ip}`, limit: 3, windowMs: 15 * 60 * 1000 })
    if (!rl.allowed) return ALWAYS_OK

    let body: { email?: unknown; locale?: unknown; bee_finds_nectar?: unknown } = {}
    try {
        body = await request.json()
    } catch {
        return ALWAYS_OK
    }

    // Honeypot — bots fill the hidden field; humans never see it.
    const honeypotVal = typeof body.bee_finds_nectar === 'string' ? body.bee_finds_nectar : ''
    if (detectHoneypot({ bee_finds_nectar: honeypotVal }, 'bee_finds_nectar')) {
        return ALWAYS_OK
    }

    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const locale = typeof body.locale === 'string' ? body.locale : 'en'

    if (!isValidEmail(email)) return ALWAYS_OK

    // Customer lookup — Stripe first, Mollie second. First match wins.
    // Every vendor-lookup is individually try/caught inside lookupStripe/lookupMollie.
    // This outer try/catch is a belt-and-suspenders last line of defence.
    try {
        let found: { name: string | null; alpaca: string | null } | null = null

        found = await lookupStripe(email)
        if (!found) {
            found = await lookupMollie(email)
        }

        if (found) {
            const { name, alpaca } = found
            const certParams = new URLSearchParams()
            if (name) certParams.set('donor_name', name)
            if (alpaca) certParams.set('alpaca_name', alpaca)
            const certUrl = `${SITE_BASE_URL}/api/adopt-certificate${certParams.toString() ? `?${certParams.toString()}` : ''}`

            try {
                const { subject, html } = buildCertificateRecoveryEmail({
                    donorName: name,
                    alpacaName: alpaca,
                    certificateUrl: certUrl,
                    locale,
                })
                await sendEmail({ to: email, subject, html })
            } catch {
                // Email send failure must NOT change the response.
                // Never reveals that customer existed but send failed.
            }
        }
    } catch {
        // Swallow any unexpected error — the response shape must not change.
    }

    return ALWAYS_OK
}
