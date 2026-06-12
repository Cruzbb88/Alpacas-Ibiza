/**
 * getMonitoringSnapshot — aggregates data from all 11 admin subsystems
 * into a single struct for the /admin/monitoring dashboard.
 *
 * Design rules:
 *   - Each section is fail-quiet: a broken source returns an "unavailable"
 *     status rather than crashing the page.
 *   - Read-only: no mutations anywhere in this file.
 *   - No new env vars required to render — the dashboard works even when
 *     most services are unconfigured; it shows their status.
 */

import { getActiveAdopterCount } from '@/lib/adopters/count'
import { getPaymentAdapter } from '@/lib/payment-vendor'
import { listSuppressions } from '@/lib/email-suppression'
import { isSet } from '@/lib/validate-env'
import { getRecentEntries } from '@/lib/notfound-log'
import { getMailerAuditSummary, getMailerAuditEntries, type MailerAuditEntry, type MailerAuditSummary } from '@/lib/mailer'
import { getClientErrorEntries, getClientErrorSummary, type ClientErrorEntry, type ClientErrorSummary } from '@/lib/client-error-buffer'
import { getSize as getWebhookIdempotencySize } from '@/lib/webhook-idempotency'

// ── Type exports ─────────────────────────────────────────────────────────────

export type TrafficLight = 'green' | 'yellow' | 'red' | 'unavailable'

export interface PaymentsSection {
  status: TrafficLight
  vendor: string
  activeCount: number
  note: string
}

export interface WebhooksSection {
  status: TrafficLight
  idempotencyMapSize: number
  atRiskCount: number
  actionRequiredCount: number
  note: string
}

export interface EmailSection {
  status: TrafficLight
  suppressionCount: number
  resendKeySet: boolean
  /** Sends in the last 24 h from the in-process audit ring buffer */
  last24hSent: number
  /** Failures in the last 24 h from the in-process audit ring buffer */
  last24hFailed: number
  /** 0..1 — fraction of buffered sends that carried an unsubscribe header */
  unsubscribeUrlPresenceRate: number
  note: string
}

export interface CronEntry {
  path: string
  schedule: string
}

export interface CronsSection {
  status: TrafficLight
  entries: CronEntry[]
  note: string
}

export interface CountersSection {
  totalSubscriptions: number
  subscriptionSource: string
  weeklyNewSignups: number | null
  past24hEmailSends: number | null
  note: string
}

export interface ErrorEntry {
  route: string
  count: number
  lastSeenAt: number
}

export interface ErrorsSection {
  entries: ErrorEntry[]
  note: string
}

export interface LaunchReadinessCard {
  overall: 'ready' | 'blocked' | 'launching-with-warnings'
  checksTotal: number
  checksPassed: number
  blockerCount: number
  warnCount: number
  status: TrafficLight
}

export interface MailerAuditSection {
  summary: MailerAuditSummary
  recent: MailerAuditEntry[]
}

export interface ClientErrorsSection {
  summary: ClientErrorSummary
  recent: ClientErrorEntry[]
}

export interface MonitoringSnapshot {
  payments: PaymentsSection
  webhooks: WebhooksSection
  email: EmailSection
  crons: CronsSection
  counters: CountersSection
  errors: ErrorsSection
  launchReadiness: LaunchReadinessCard
  mailerAudit: MailerAuditSection
  clientErrors: ClientErrorsSection
  generatedAt: number
}

// ── Section builders ─────────────────────────────────────────────────────────

async function buildPayments(activeAdopter: { count: number; source: string }): Promise<PaymentsSection> {
  try {
    const adapter = getPaymentAdapter()
    const vendor = adapter.vendor
    const { count, source } = activeAdopter

    let status: TrafficLight
    let note: string

    if (vendor === 'mailto' || vendor === 'unconfigured') {
      status = 'yellow'
      note = 'No payment vendor configured — adopt CTA uses mailto fallback'
    } else if (source === 'error') {
      status = 'red'
      note = 'Payment vendor SDK returned an error'
    } else if (source === 'unconfigured') {
      status = 'yellow'
      note = `${vendor} selected but credentials unset`
    } else if (count > 0) {
      status = 'green'
      note = `${vendor} configured, ${count} active subscriptions`
    } else {
      status = 'yellow'
      note = `${vendor} configured but 0 active subscriptions`
    }

    return { status, vendor, activeCount: count, note }
  } catch {
    return {
      status: 'unavailable',
      vendor: 'unknown',
      activeCount: 0,
      note: 'Payments section unavailable — check server logs',
    }
  }
}

function buildWebhooks(): WebhooksSection {
  try {
    // Use the public reader helpers from payment-failure-tracker-readers.ts
    // to avoid coupling to internal Map handles.
    const { listAtRiskDonors, listActionRequiredDonors } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/lib/payment-failure-tracker-readers') as typeof import('@/lib/payment-failure-tracker-readers')

    const idempotencyMapSize = getWebhookIdempotencySize()

    const atRiskCount = listAtRiskDonors().length
    const actionRequiredCount = listActionRequiredDonors().length

    let status: TrafficLight
    let note: string

    if (actionRequiredCount > 0) {
      status = 'red'
      note = `${actionRequiredCount} donor(s) require immediate action`
    } else if (atRiskCount > 0) {
      status = 'yellow'
      note = `${atRiskCount} donor(s) at risk (2+ consecutive failures)`
    } else {
      status = 'green'
      note = `Idempotency active (${idempotencyMapSize} events in 4d window), 0 at-risk`
    }

    return { status, idempotencyMapSize, atRiskCount, actionRequiredCount, note }
  } catch {
    return {
      status: 'unavailable',
      idempotencyMapSize: 0,
      atRiskCount: 0,
      actionRequiredCount: 0,
      note: 'Webhooks section unavailable — check server logs',
    }
  }
}

function buildEmail(): EmailSection {
  try {
    const suppressions = listSuppressions()
    const suppressionCount = suppressions.length
    const resendKeySet = isSet('RESEND_API_KEY')

    const auditSummary = getMailerAuditSummary()
    const last24hSent = auditSummary.last24h.sent
    const last24hFailed = auditSummary.last24h.failed
    const unsubscribeUrlPresenceRate = auditSummary.unsubscribeUrlPresenceRate

    let status: TrafficLight
    let note: string

    if (!resendKeySet) {
      status = 'yellow'
      note = 'RESEND_API_KEY unset — email sends will fail'
    } else if (last24hFailed > 0 && last24hSent === 0) {
      status = 'red'
      note = `${last24hFailed} failed send${last24hFailed !== 1 ? 's' : ''} in last 24 h — check Resend dashboard`
    } else if (suppressionCount > 50) {
      status = 'yellow'
      note = `${suppressionCount} suppressed addresses — check Resend dashboard for bounce rate`
    } else {
      const sendLine = last24hSent > 0
        ? `${last24hSent} sent${last24hFailed > 0 ? `, ${last24hFailed} failed` : ''} in 24 h`
        : 'no sends yet this process'
      status = 'green'
      note = `Resend configured, ${suppressionCount} suppressed — ${sendLine}`
    }

    return { status, suppressionCount, resendKeySet, last24hSent, last24hFailed, unsubscribeUrlPresenceRate, note }
  } catch {
    return {
      status: 'unavailable',
      suppressionCount: 0,
      resendKeySet: false,
      last24hSent: 0,
      last24hFailed: 0,
      unsubscribeUrlPresenceRate: 1,
      note: 'Email section unavailable — check server logs',
    }
  }
}

function buildCrons(): CronsSection {
  try {
    // Read vercel.json via require — resolveJsonModule is enabled in tsconfig.
    // The `@/../` alias is not valid; use process.cwd() path resolution or a
    // relative import. Because this module lives in lib/monitoring/, we use a
    // relative path two levels up to reach the project root.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vercelConfig = require('../../vercel.json') as {
      crons?: Array<{ path: string; schedule: string }>
    }

    const entries: CronEntry[] = (vercelConfig.crons ?? []).map((c) => ({
      path: c.path,
      schedule: c.schedule,
    }))

    const status: TrafficLight = entries.length > 0 ? 'green' : 'yellow'
    const note =
      entries.length > 0
        ? `${entries.length} cron${entries.length !== 1 ? 's' : ''} scheduled in vercel.json`
        : 'No crons found in vercel.json'

    return { status, entries, note }
  } catch {
    return {
      status: 'unavailable',
      entries: [],
      note: 'Crons section unavailable — vercel.json unreadable',
    }
  }
}

async function buildCounters(activeAdopter: { count: number; source: string }): Promise<CountersSection> {
  try {
    const { count, source } = activeAdopter

    // Week-ago new sign-ups: only computable with Stripe SDK; skip for Mollie
    // (no created-range filter on Mollie subscription list without full scan).
    // For now we surface "logging gap" to keep the promise we made in the spec.
    let weeklyNewSignups: number | null = null
    const vendor = process.env.PAYMENT_VENDOR ?? ''

    if (vendor === 'stripe' && isSet('STRIPE_SECRET_KEY')) {
      try {
        const { importStripe } = await import('@/lib/integrations/stripe-sdk')
        const stripeFactory = await importStripe()
        if (stripeFactory) {
          const stripe = stripeFactory(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2024-06-20',
          })
          const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
          let newCount = 0
          for await (const _sub of stripe.subscriptions.list({
            status: 'active',
            limit: 100,
            created: { gte: sevenDaysAgo },
          })) {
            newCount++
          }
          weeklyNewSignups = newCount
        }
      } catch {
        // fail-quiet — weeklyNewSignups stays null
      }
    }

    // Email sends in the last 24 h — read from the in-process audit ring buffer.
    // Buffer is lost on cold start (ADR 001 tradeoff), so value may be lower than
    // reality after a redeploy. Still better than null/"logging gap".
    const auditSummary = getMailerAuditSummary()
    const past24hEmailSends = auditSummary.last24h.sent + auditSummary.last24h.failed + auditSummary.last24h.cancelled

    return {
      totalSubscriptions: count,
      subscriptionSource: source,
      weeklyNewSignups,
      past24hEmailSends,
      note:
        weeklyNewSignups === null
          ? 'Weekly new sign-ups only available with Stripe vendor; email sends from in-process buffer (resets on cold start)'
          : 'Email sends from in-process buffer (resets on cold start)',
    }
  } catch {
    return {
      totalSubscriptions: 0,
      subscriptionSource: 'error',
      weeklyNewSignups: null,
      past24hEmailSends: null,
      note: 'Counters section unavailable — check server logs',
    }
  }
}

async function buildLaunchReadiness(): Promise<LaunchReadinessCard> {
  try {
    const { runLaunchReadinessChecks } = await import('@/lib/launch-readiness/checks')
    const report = await runLaunchReadinessChecks()
    const status: TrafficLight =
      report.overall === 'ready'
        ? 'green'
        : report.overall === 'launching-with-warnings'
        ? 'yellow'
        : 'red'
    return {
      overall: report.overall,
      checksTotal: report.summary.total,
      checksPassed: report.summary.passed,
      blockerCount: report.blockerCount,
      warnCount: report.warnCount,
      status,
    }
  } catch {
    return {
      overall: 'blocked',
      checksTotal: 0,
      checksPassed: 0,
      blockerCount: 0,
      warnCount: 0,
      status: 'unavailable',
    }
  }
}

function buildErrors(): ErrorsSection {
  try {
    const recent = getRecentEntries(20)
    return {
      entries: recent.map((r) => ({
        route: r.key.split('|')[0] ?? r.key,
        count: 1, // dedupe Map is presence-only; each entry is one unique (path, referer) hit within the TTL window
        lastSeenAt: r.lastSeenMs,
      })),
      note: '',
    }
  } catch {
    return {
      entries: [],
      note: 'Error feed unavailable — check server logs',
    }
  }
}

function buildMailerAudit(): MailerAuditSection {
  try {
    return {
      summary: getMailerAuditSummary(),
      recent: getMailerAuditEntries(20),
    }
  } catch {
    return {
      summary: {
        last24h: { sent: 0, failed: 0, cancelled: 0 },
        byHostname: [],
        unsubscribeUrlPresenceRate: 1,
      },
      recent: [],
    }
  }
}

function buildClientErrors(): ClientErrorsSection {
  try {
    return {
      summary: getClientErrorSummary(),
      recent: getClientErrorEntries(20),
    }
  } catch {
    return {
      summary: { last1h: {}, total: 0 },
      recent: [],
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Assembles a full monitoring snapshot. All sections are fail-quiet: a
 * broken subsystem returns an "unavailable" badge, not a thrown error.
 *
 * Called from app/admin/monitoring/page.tsx. Never call from webhook routes.
 */
export async function getMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  // Hoist adopter count: both buildPayments and buildCounters need it; call once.
  let activeAdopter: { count: number; source: string } = { count: 0, source: 'error' }
  try {
    activeAdopter = await getActiveAdopterCount()
  } catch {
    // fall through — both builders will receive the error sentinel
  }

  const [payments, counters, launchReadiness] = await Promise.allSettled([
    buildPayments(activeAdopter),
    buildCounters(activeAdopter),
    buildLaunchReadiness(),
  ])

  const paymentsResult: PaymentsSection =
    payments.status === 'fulfilled'
      ? payments.value
      : {
          status: 'unavailable',
          vendor: 'unknown',
          activeCount: 0,
          note: 'Payments section threw unexpectedly',
        }

  const countersResult: CountersSection =
    counters.status === 'fulfilled'
      ? counters.value
      : {
          totalSubscriptions: 0,
          subscriptionSource: 'error',
          weeklyNewSignups: null,
          past24hEmailSends: null,
          note: 'Counters section threw unexpectedly',
        }

  const launchReadinessResult: LaunchReadinessCard =
    launchReadiness.status === 'fulfilled'
      ? launchReadiness.value
      : {
          overall: 'blocked',
          checksTotal: 0,
          checksPassed: 0,
          blockerCount: 0,
          warnCount: 0,
          status: 'unavailable',
        }

  return {
    payments: paymentsResult,
    webhooks: buildWebhooks(),
    email: buildEmail(),
    crons: buildCrons(),
    counters: countersResult,
    errors: buildErrors(),
    launchReadiness: launchReadinessResult,
    mailerAudit: buildMailerAudit(),
    clientErrors: buildClientErrors(),
    generatedAt: Date.now(),
  }
}
