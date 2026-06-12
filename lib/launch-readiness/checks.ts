/**
 * lib/launch-readiness/checks.ts
 *
 * Canonical launch-readiness check runner.
 *
 * Consumed by:
 *   - app/admin/launch-readiness/page.tsx  (SSR, session-gated)
 *   - app/api/launch-readiness/route.ts    (REST, token or session auth)
 *   - lib/monitoring/snapshot.ts           (summary card on /admin/monitoring)
 *
 * Rules:
 *   - Every check is fail-quiet: uncaught errors → status 'skip', never throw.
 *   - No mutations anywhere in this file.
 *   - Network probes have a 3-second abort timeout.
 */

import fs from 'fs'
import path from 'path'
import { isValidEmail } from '@/lib/validate-email'
import { isProductionEnv } from '@/lib/robots-env'
import { SITE_BASE_URL } from '@/lib/config'
import { fetchWithTimeout } from '@/lib/fetch'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckCategory =
  | 'tier1-required'
  | 'tier2-graceful'
  | 'content'
  | 'integrations'
  | 'compliance'

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip'

export interface LaunchReadinessCheck {
  id: string // e.g. 'tier1.resend_api_key'
  category: CheckCategory
  label: string
  status: CheckStatus
  detail?: string
  blocking: boolean // does this block launch?
}

export interface LaunchReadinessReport {
  generatedAt: string // ISO
  overall: 'ready' | 'blocked' | 'launching-with-warnings'
  blockerCount: number
  warnCount: number
  checks: LaunchReadinessCheck[]
  summary: {
    passed: number
    warnings: number
    failed: number
    skipped: number
    total: number
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROJECT_ROOT = process.cwd()

function env(key: string): string | undefined {
  const v = process.env[key]
  if (!v || v.startsWith('TODO_') || v === '__OWNER_INPUT_REQUIRED__') return undefined
  return v
}

/** Wrap any check fn so errors become 'skip' instead of throws. */
function safe(
  id: string,
  category: CheckCategory,
  label: string,
  blocking: boolean,
  fn: () => LaunchReadinessCheck | Promise<LaunchReadinessCheck>,
): Promise<LaunchReadinessCheck> {
  try {
    const result = fn()
    if (result instanceof Promise) {
      return result.catch((err: unknown) => ({
        id,
        category,
        label,
        status: 'skip' as const,
        detail: `Check error: ${err instanceof Error ? err.message : String(err)}`,
        blocking,
      }))
    }
    return Promise.resolve(result)
  } catch (err: unknown) {
    return Promise.resolve({
      id,
      category,
      label,
      status: 'skip' as const,
      detail: `Check error: ${err instanceof Error ? err.message : String(err)}`,
      blocking,
    })
  }
}

// ── Tier-1 required checks ────────────────────────────────────────────────────

function checkResendApiKey(): LaunchReadinessCheck {
  const key = env('RESEND_API_KEY')
  if (!key) {
    return {
      id: 'tier1.resend_api_key',
      category: 'tier1-required',
      label: 'Resend API key set',
      status: 'fail',
      detail: 'RESEND_API_KEY not set — emails will not send',
      blocking: true,
    }
  }
  if (!key.startsWith('re_')) {
    return {
      id: 'tier1.resend_api_key',
      category: 'tier1-required',
      label: 'Resend API key set',
      status: 'warn',
      detail: 'RESEND_API_KEY set but does not start with re_ — may be invalid',
      blocking: false,
    }
  }
  return {
    id: 'tier1.resend_api_key',
    category: 'tier1-required',
    label: 'Resend API key set',
    status: 'pass',
    detail: 'Set and starts with re_',
    blocking: false,
  }
}

function checkContactEmail(): LaunchReadinessCheck {
  const val = env('CONTACT_EMAIL')
  if (!val) {
    return {
      id: 'tier1.contact_email',
      category: 'tier1-required',
      label: 'CONTACT_EMAIL set + valid',
      status: 'fail',
      detail: 'CONTACT_EMAIL not set',
      blocking: true,
    }
  }
  if (!isValidEmail(val)) {
    return {
      id: 'tier1.contact_email',
      category: 'tier1-required',
      label: 'CONTACT_EMAIL set + valid',
      status: 'fail',
      detail: `CONTACT_EMAIL fails validation: ${val}`,
      blocking: true,
    }
  }
  return {
    id: 'tier1.contact_email',
    category: 'tier1-required',
    label: 'CONTACT_EMAIL set + valid',
    status: 'pass',
    detail: `Set: ${val}`,
    blocking: false,
  }
}

function checkNextauthSecret(): LaunchReadinessCheck {
  const val = env('NEXTAUTH_SECRET')
  if (!val) {
    return {
      id: 'tier1.nextauth_secret',
      category: 'tier1-required',
      label: 'NEXTAUTH_SECRET set + length >= 32',
      status: 'fail',
      detail: 'NEXTAUTH_SECRET not set',
      blocking: true,
    }
  }
  if (val.length < 32) {
    return {
      id: 'tier1.nextauth_secret',
      category: 'tier1-required',
      label: 'NEXTAUTH_SECRET set + length >= 32',
      status: 'fail',
      detail: `NEXTAUTH_SECRET too short (${val.length} chars, need >= 32)`,
      blocking: true,
    }
  }
  return {
    id: 'tier1.nextauth_secret',
    category: 'tier1-required',
    label: 'NEXTAUTH_SECRET set + length >= 32',
    status: 'pass',
    detail: `Set (${val.length} chars)`,
    blocking: false,
  }
}

function checkAdminUsername(): LaunchReadinessCheck {
  const user = env('ADMIN_USERNAME')
  if (!user) {
    return {
      id: 'tier1.admin_username',
      category: 'tier1-required',
      label: 'ADMIN_USERNAME set',
      status: 'fail',
      detail: 'ADMIN_USERNAME not set — admin login disabled',
      blocking: true,
    }
  }
  if (user === 'admin') {
    return {
      id: 'tier1.admin_username',
      category: 'tier1-required',
      label: 'ADMIN_USERNAME set',
      status: 'fail',
      detail: 'ADMIN_USERNAME set to insecure default "admin"',
      blocking: true,
    }
  }
  return {
    id: 'tier1.admin_username',
    category: 'tier1-required',
    label: 'ADMIN_USERNAME set',
    status: 'pass',
    detail: 'Set, non-default value',
    blocking: false,
  }
}

function checkAdminPassword(): LaunchReadinessCheck {
  const pass = env('ADMIN_PASSWORD')
  if (!pass) {
    return {
      id: 'tier1.admin_password',
      category: 'tier1-required',
      label: 'ADMIN_PASSWORD set',
      status: 'fail',
      detail: 'ADMIN_PASSWORD not set — admin login disabled',
      blocking: true,
    }
  }
  if (pass === 'password') {
    return {
      id: 'tier1.admin_password',
      category: 'tier1-required',
      label: 'ADMIN_PASSWORD set',
      status: 'fail',
      detail: 'ADMIN_PASSWORD set to insecure default "password"',
      blocking: true,
    }
  }
  return {
    id: 'tier1.admin_password',
    category: 'tier1-required',
    label: 'ADMIN_PASSWORD set',
    status: 'pass',
    detail: 'Set, non-default value',
    blocking: false,
  }
}

function checkNextauthUrl(): LaunchReadinessCheck {
  const val = env('NEXTAUTH_URL')
  const isProd =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  if (!val) {
    return {
      id: 'tier1.nextauth_url',
      category: 'tier1-required',
      label: 'NEXTAUTH_URL set',
      status: 'fail',
      detail: 'NEXTAUTH_URL not set — NextAuth callbacks will break',
      blocking: true,
    }
  }
  if (isProd && !val.startsWith('https://')) {
    return {
      id: 'tier1.nextauth_url',
      category: 'tier1-required',
      label: 'NEXTAUTH_URL set',
      status: 'fail',
      detail: `NEXTAUTH_URL must start with https:// in production (got: ${val})`,
      blocking: true,
    }
  }
  return {
    id: 'tier1.nextauth_url',
    category: 'tier1-required',
    label: 'NEXTAUTH_URL set',
    status: 'pass',
    detail: `Set: ${val}`,
    blocking: false,
  }
}

function checkFareHarborWebhookSecret(): LaunchReadinessCheck {
  const val = env('FAREHARBOR_WEBHOOK_SECRET')
  if (!val) {
    return {
      id: 'tier1.fareharbor_webhook_secret',
      category: 'tier1-required',
      label: 'FAREHARBOR_WEBHOOK_SECRET set',
      status: 'fail',
      detail: 'FAREHARBOR_WEBHOOK_SECRET not set — FareHarbor webhook endpoint returns 503',
      blocking: true,
    }
  }
  return {
    id: 'tier1.fareharbor_webhook_secret',
    category: 'tier1-required',
    label: 'FAREHARBOR_WEBHOOK_SECRET set',
    status: 'pass',
    detail: `Set (${val.length} chars)`,
    blocking: false,
  }
}

function checkCronSecret(): LaunchReadinessCheck {
  const val = env('CRON_SECRET')
  if (!val) {
    return {
      id: 'tier1.cron_secret',
      category: 'tier1-required',
      label: 'CRON_SECRET set + length >= 16',
      status: 'fail',
      detail: 'CRON_SECRET not set — cron routes unprotected',
      blocking: true,
    }
  }
  if (val.length < 16) {
    return {
      id: 'tier1.cron_secret',
      category: 'tier1-required',
      label: 'CRON_SECRET set + length >= 16',
      status: 'fail',
      detail: `CRON_SECRET too short (${val.length} chars, need >= 16)`,
      blocking: true,
    }
  }
  return {
    id: 'tier1.cron_secret',
    category: 'tier1-required',
    label: 'CRON_SECRET set + length >= 16',
    status: 'pass',
    detail: `Set (${val.length} chars)`,
    blocking: false,
  }
}

// ── Tier-2 graceful checks ────────────────────────────────────────────────────

function checkPaymentVendorConfig(): LaunchReadinessCheck[] {
  const results: LaunchReadinessCheck[] = []
  const vendor = env('PAYMENT_VENDOR')

  if (!vendor) {
    results.push({
      id: 'tier2.payment_vendor',
      category: 'tier2-graceful',
      label: 'PAYMENT_VENDOR set (stripe|mollie|fareharbor)',
      status: 'warn',
      detail: 'PAYMENT_VENDOR not set — adopt CTA falls back to mailto',
      blocking: false,
    })
    return results
  }

  const validVendors = ['stripe', 'mollie', 'fareharbor']
  if (!validVendors.includes(vendor)) {
    results.push({
      id: 'tier2.payment_vendor',
      category: 'tier2-graceful',
      label: 'PAYMENT_VENDOR set (stripe|mollie|fareharbor)',
      status: 'warn',
      detail: `Unknown PAYMENT_VENDOR value: "${vendor}"`,
      blocking: false,
    })
    return results
  }

  results.push({
    id: 'tier2.payment_vendor',
    category: 'tier2-graceful',
    label: 'PAYMENT_VENDOR set (stripe|mollie|fareharbor)',
    status: 'pass',
    detail: `PAYMENT_VENDOR=${vendor}`,
    blocking: false,
  })

  if (vendor === 'stripe') {
    const stripeKey = env('STRIPE_SECRET_KEY')
    const stripeWebhook = env('STRIPE_WEBHOOK_SECRET')
    const monthlyId = env('STRIPE_ADOPT_PRICE_ID_MONTHLY')
    const yearlyId = env('STRIPE_ADOPT_PRICE_ID_YEARLY')
    const missing = [
      !stripeKey && 'STRIPE_SECRET_KEY',
      !stripeWebhook && 'STRIPE_WEBHOOK_SECRET',
      !monthlyId && 'STRIPE_ADOPT_PRICE_ID_MONTHLY',
      !yearlyId && 'STRIPE_ADOPT_PRICE_ID_YEARLY',
    ].filter(Boolean)
    results.push({
      id: 'tier2.stripe_keys',
      category: 'tier2-graceful',
      label: 'Stripe: secret key + webhook secret + 2 price IDs',
      status: missing.length === 0 ? 'pass' : 'warn',
      detail:
        missing.length === 0
          ? 'All 4 Stripe env vars set'
          : `Missing: ${missing.join(', ')}`,
      blocking: false,
    })
  }

  if (vendor === 'mollie') {
    const mollieKey = env('MOLLIE_API_KEY')
    const mollieWebhook = env('MOLLIE_WEBHOOK_SECRET')
    const missing = [!mollieKey && 'MOLLIE_API_KEY', !mollieWebhook && 'MOLLIE_WEBHOOK_SECRET'].filter(Boolean)
    results.push({
      id: 'tier2.mollie_keys',
      category: 'tier2-graceful',
      label: 'Mollie: API key + webhook secret',
      status: missing.length === 0 ? 'pass' : 'warn',
      detail:
        missing.length === 0
          ? 'Both Mollie env vars set'
          : `Missing: ${missing.join(', ')}`,
      blocking: false,
    })
  }

  const fareHarborApp = env('FAREHARBOR_APP_KEY')
  const fareHarborUser = env('FAREHARBOR_USER_KEY')
  results.push({
    id: 'tier2.fareharbor_keys',
    category: 'tier2-graceful',
    label: 'FAREHARBOR_APP_KEY + USER_KEY (live spots widget)',
    status: fareHarborApp && fareHarborUser ? 'pass' : 'warn',
    detail:
      fareHarborApp && fareHarborUser
        ? 'Both FareHarbor API keys set'
        : `Missing: ${[!fareHarborApp && 'FAREHARBOR_APP_KEY', !fareHarborUser && 'FAREHARBOR_USER_KEY'].filter(Boolean).join(', ')} — live spots-left widget hidden`,
    blocking: false,
  })

  return results
}

// ── Content checks ────────────────────────────────────────────────────────────

function checkLegalContentFlag(): LaunchReadinessCheck {
  const live = process.env.LEGAL_CONTENT_LIVE === 'true'
  return {
    id: 'content.legal_content_live',
    category: 'content',
    label: 'LEGAL_CONTENT_LIVE flag set',
    status: live ? 'pass' : 'warn',
    detail: live
      ? 'LEGAL_CONTENT_LIVE=true — legal pages live'
      : 'LEGAL_CONTENT_LIVE not set — pages render auto-draft',
    blocking: false,
  }
}

async function checkAlpacaBios(): Promise<LaunchReadinessCheck[]> {
  const results: LaunchReadinessCheck[] = []
  try {
    const src = await fs.promises.readFile(
      path.join(PROJECT_ROOT, 'lib', 'tenants', 'alpacasibiza-content.ts'),
      'utf-8',
    )
    // Count entries in the animals array by counting `kind: 'animal'` occurrences
    const totalMatch = (src.match(/kind:\s*['"]animal['"]/g) ?? []).length

    // Count alpacas with a non-null bio or a localizedBio block.
    // Two disjoint sets:
    //   A) entries with bio: 'string' (non-null)  → totalMatch - bioNullCount
    //   B) entries with bio: null AND localizedBio → localizedBioCount
    //      (by convention these always carry bio: null, so these sets are disjoint)
    // Entries that have BOTH bio: 'string' AND localizedBio: would be double-counted
    // by the old formula (bioNotNullCount + localizedBioCount). Correct formula:
    //   withBio = totalMatch - (bio: null entries that have NO localizedBio)
    const localizedBioCount = (src.match(/localizedBio:/g) ?? []).length
    // bio: null entries
    const bioNullCount = (src.match(/bio:\s*null/g) ?? []).length
    // entries with bio:null that have no localizedBio counterpart
    const bioNullWithoutLocalized = bioNullCount - localizedBioCount
    const withBio = totalMatch - bioNullWithoutLocalized

    results.push({
      id: 'content.alpaca_bios',
      category: 'content',
      label: 'All 14 alpacas have bio > 0',
      status: withBio >= totalMatch && totalMatch === 14 ? 'pass' : withBio > 0 ? 'warn' : 'fail',
      detail: `${withBio}/${totalMatch} alpacas have bio content (bio or localizedBio)`,
      blocking: false,
    })

    // Count alpacas with image !== null
    const imageNullCount = (src.match(/image:\s*null/g) ?? []).length
    const withImage = totalMatch - imageNullCount
    results.push({
      id: 'content.alpaca_photos',
      category: 'content',
      label: 'Alpaca photo references (image !== null)',
      status: withImage >= totalMatch ? 'pass' : withImage > 0 ? 'warn' : 'fail',
      detail: `${withImage}/${totalMatch} alpacas have an image reference`,
      blocking: false,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    results.push({
      id: 'content.alpaca_bios',
      category: 'content',
      label: 'All 14 alpacas have bio > 0',
      status: 'skip',
      detail: `Could not read alpacasibiza-content.ts: ${msg}`,
      blocking: false,
    })
    results.push({
      id: 'content.alpaca_photos',
      category: 'content',
      label: 'Alpaca photo references (image !== null)',
      status: 'skip',
      detail: `Could not read alpacasibiza-content.ts: ${msg}`,
      blocking: false,
    })
  }
  return results
}

// ── Integration checks ────────────────────────────────────────────────────────

function checkVercelCrons(): LaunchReadinessCheck {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vercelConfig = require('../../vercel.json') as {
      crons?: Array<{ path: string; schedule: string }>
    }
    const count = (vercelConfig.crons ?? []).length
    return {
      id: 'integrations.vercel_crons',
      category: 'integrations',
      label: 'vercel.json crons present',
      status: count > 0 ? 'pass' : 'warn',
      detail: count > 0 ? `${count} cron job(s) configured in vercel.json` : 'No crons in vercel.json',
      blocking: false,
    }
  } catch (err: unknown) {
    return {
      id: 'integrations.vercel_crons',
      category: 'integrations',
      label: 'vercel.json crons present',
      status: 'skip',
      detail: `Could not read vercel.json: ${err instanceof Error ? err.message : String(err)}`,
      blocking: false,
    }
  }
}

async function checkResendReachable(): Promise<LaunchReadinessCheck> {
  const resendKey = env('RESEND_API_KEY')
  if (!resendKey) {
    return {
      id: 'integrations.resend_reachable',
      category: 'integrations',
      label: 'Resend API reachable',
      status: 'skip',
      detail: 'RESEND_API_KEY not set — skipping network probe',
      blocking: false,
    }
  }
  try {
    const res = await fetchWithTimeout('https://api.resend.com/api-keys', {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${resendKey}` },
    }, 3000)
    // 200 = authenticated, 401 = reachable but bad key, both mean the endpoint is up
    const reachable = res.status < 500
    return {
      id: 'integrations.resend_reachable',
      category: 'integrations',
      label: 'Resend API reachable',
      status: reachable ? 'pass' : 'fail',
      detail: reachable
        ? `Resend API responded HTTP ${res.status}`
        : `Resend API returned HTTP ${res.status}`,
      blocking: false,
    }
  } catch (err: unknown) {
    return {
      id: 'integrations.resend_reachable',
      category: 'integrations',
      label: 'Resend API reachable',
      status: 'warn',
      detail: `Network probe failed (3s timeout): ${err instanceof Error ? err.message : String(err)}`,
      blocking: false,
    }
  }
}

async function checkStripeReachable(): Promise<LaunchReadinessCheck> {
  const stripeKey = env('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return {
      id: 'integrations.stripe_reachable',
      category: 'integrations',
      label: 'Stripe API reachable + configured',
      status: 'skip',
      detail: 'STRIPE_SECRET_KEY not set — skipping Stripe probe',
      blocking: false,
    }
  }
  const vendor = env('PAYMENT_VENDOR')
  if (vendor !== 'stripe') {
    return {
      id: 'integrations.stripe_reachable',
      category: 'integrations',
      label: 'Stripe API reachable + configured',
      status: 'skip',
      detail: `PAYMENT_VENDOR=${vendor ?? 'unset'} — Stripe probe skipped`,
      blocking: false,
    }
  }
  try {
    const res = await fetchWithTimeout('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${stripeKey}` },
    }, 3000)
    return {
      id: 'integrations.stripe_reachable',
      category: 'integrations',
      label: 'Stripe API reachable + configured',
      status: res.ok ? 'pass' : res.status === 401 ? 'warn' : 'fail',
      detail: res.ok
        ? 'Stripe balance.retrieve responded 200'
        : `Stripe API returned HTTP ${res.status}`,
      blocking: false,
    }
  } catch (err: unknown) {
    return {
      id: 'integrations.stripe_reachable',
      category: 'integrations',
      label: 'Stripe API reachable + configured',
      status: 'warn',
      detail: `Stripe probe failed (3s timeout): ${err instanceof Error ? err.message : String(err)}`,
      blocking: false,
    }
  }
}

async function checkMollieReachable(): Promise<LaunchReadinessCheck> {
  const mollieKey = env('MOLLIE_API_KEY')
  if (!mollieKey) {
    return {
      id: 'integrations.mollie_reachable',
      category: 'integrations',
      label: 'Mollie API reachable + configured',
      status: 'skip',
      detail: 'MOLLIE_API_KEY not set — skipping Mollie probe',
      blocking: false,
    }
  }
  const vendor = env('PAYMENT_VENDOR')
  if (vendor !== 'mollie') {
    return {
      id: 'integrations.mollie_reachable',
      category: 'integrations',
      label: 'Mollie API reachable + configured',
      status: 'skip',
      detail: `PAYMENT_VENDOR=${vendor ?? 'unset'} — Mollie probe skipped`,
      blocking: false,
    }
  }
  try {
    const res = await fetchWithTimeout('https://api.mollie.com/v2/profiles/me', {
      headers: { Authorization: `Bearer ${mollieKey}` },
    }, 3000)
    return {
      id: 'integrations.mollie_reachable',
      category: 'integrations',
      label: 'Mollie API reachable + configured',
      status: res.ok ? 'pass' : res.status === 401 ? 'warn' : 'fail',
      detail: res.ok
        ? 'Mollie profiles.getCurrent responded 200'
        : `Mollie API returned HTTP ${res.status}`,
      blocking: false,
    }
  } catch (err: unknown) {
    return {
      id: 'integrations.mollie_reachable',
      category: 'integrations',
      label: 'Mollie API reachable + configured',
      status: 'warn',
      detail: `Mollie probe failed (3s timeout): ${err instanceof Error ? err.message : String(err)}`,
      blocking: false,
    }
  }
}

// ── Compliance checks ─────────────────────────────────────────────────────────

async function checkCookieConsentBanner(): Promise<LaunchReadinessCheck> {
  try {
    const src = await fs.promises.readFile(
      path.join(PROJECT_ROOT, 'app', '[locale]', 'layout.tsx'),
      'utf-8',
    )
    const hasBanner =
      src.includes('CookieConsentBanner') || src.includes('cookie-consent')
    return {
      id: 'compliance.cookie_consent_banner',
      category: 'compliance',
      label: 'Cookie consent banner mounted in layout',
      status: hasBanner ? 'pass' : 'fail',
      detail: hasBanner
        ? 'CookieConsentBanner found in app/[locale]/layout.tsx'
        : 'No CookieConsentBanner import in app/[locale]/layout.tsx',
      blocking: false,
    }
  } catch (err: unknown) {
    return {
      id: 'compliance.cookie_consent_banner',
      category: 'compliance',
      label: 'Cookie consent banner mounted in layout',
      status: 'skip',
      detail: `Could not read layout: ${err instanceof Error ? err.message : String(err)}`,
      blocking: false,
    }
  }
}

async function checkWithdrawalWaiver(): Promise<LaunchReadinessCheck> {
  try {
    const src = await fs.promises.readFile(
      path.join(PROJECT_ROOT, 'app', '[locale]', 'adopt', 'page.tsx'),
      'utf-8',
    )
    const hasWaiver =
      src.includes('checkout-gate') ||
      src.includes('CheckoutGate') ||
      src.includes('withdrawal_waiver') ||
      src.includes('WithdrawalWaiver')
    return {
      id: 'compliance.withdrawal_waiver',
      category: 'compliance',
      label: 'Withdrawal-waiver component in adopt flow',
      status: hasWaiver ? 'pass' : 'fail',
      detail: hasWaiver
        ? 'Withdrawal waiver / CheckoutGate found in adopt page'
        : 'No withdrawal waiver found in app/[locale]/adopt/page.tsx',
      blocking: false,
    }
  } catch (err: unknown) {
    return {
      id: 'compliance.withdrawal_waiver',
      category: 'compliance',
      label: 'Withdrawal-waiver component in adopt flow',
      status: 'skip',
      detail: `Could not read adopt page: ${err instanceof Error ? err.message : String(err)}`,
      blocking: false,
    }
  }
}

function checkRobotsTxt(): LaunchReadinessCheck {
  const isProd = isProductionEnv(SITE_BASE_URL, process.env.VERCEL_ENV)
  return {
    id: 'compliance.robots_txt',
    category: 'compliance',
    label: 'robots.txt allows production domain',
    status: isProd ? 'pass' : 'warn',
    detail: isProd
      ? `Production env detected (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'}, SITE_BASE_URL=${SITE_BASE_URL}) — robots.txt allows crawlers`
      : `Non-production env — robots.txt blocks all crawlers (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'})`,
    blocking: false,
  }
}

function checkPrivacyCookiesPages(): LaunchReadinessCheck {
  const legalLive = process.env.LEGAL_CONTENT_LIVE === 'true'
  return {
    id: 'compliance.privacy_cookies_pages',
    category: 'compliance',
    label: 'Privacy/cookies pages exist (LEGAL_CONTENT_LIVE or auto-draft)',
    status: legalLive ? 'pass' : 'warn',
    detail: legalLive
      ? 'LEGAL_CONTENT_LIVE=true — privacy and cookies pages render live content'
      : 'LEGAL_CONTENT_LIVE not set — pages render auto-draft placeholder content',
    blocking: false,
  }
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

/**
 * Runs all launch-readiness checks in parallel.
 * Every check is fail-quiet: errors → 'skip', never throw.
 */
export async function runLaunchReadinessChecks(): Promise<LaunchReadinessReport> {
  const skipArr = (id1: string, id2: string, err: unknown): LaunchReadinessCheck[] => [
    {
      id: id1,
      category: 'content',
      label: 'Alpaca bios',
      status: 'skip',
      detail: `Check error: ${err instanceof Error ? err.message : String(err)}`,
      blocking: false,
    },
    {
      id: id2,
      category: 'content',
      label: 'Alpaca photos',
      status: 'skip',
      detail: `Check error: ${err instanceof Error ? err.message : String(err)}`,
      blocking: false,
    },
  ]

  const [
    alpacaChecksRaw,
    cookieBanner,
    withdrawalWaiver,
    resendReachable,
    stripeReachable,
    mollieReachable,
  ] = await Promise.all([
    checkAlpacaBios().catch((e: unknown) => skipArr('content.alpaca_bios', 'content.alpaca_photos', e)),
    safe('compliance.cookie_consent_banner', 'compliance', 'Cookie consent banner', false, checkCookieConsentBanner),
    safe('compliance.withdrawal_waiver', 'compliance', 'Withdrawal waiver', false, checkWithdrawalWaiver),
    safe('integrations.resend_reachable', 'integrations', 'Resend reachable', false, checkResendReachable),
    safe('integrations.stripe_reachable', 'integrations', 'Stripe reachable', false, checkStripeReachable),
    safe('integrations.mollie_reachable', 'integrations', 'Mollie reachable', false, checkMollieReachable),
  ])

  // Synchronous checks
  const tier1Checks: LaunchReadinessCheck[] = [
    checkResendApiKey(),
    checkContactEmail(),
    checkNextauthSecret(),
    checkAdminUsername(),
    checkAdminPassword(),
    checkNextauthUrl(),
    checkFareHarborWebhookSecret(),
    checkCronSecret(),
  ]

  const tier2Checks: LaunchReadinessCheck[] = checkPaymentVendorConfig()

  const contentChecks: LaunchReadinessCheck[] = [
    checkLegalContentFlag(),
    ...alpacaChecksRaw,
  ]

  const integrationChecks: LaunchReadinessCheck[] = [
    checkVercelCrons(),
    resendReachable,
    stripeReachable,
    mollieReachable,
  ]

  const complianceChecks: LaunchReadinessCheck[] = [
    cookieBanner,
    withdrawalWaiver,
    checkRobotsTxt(),
    checkPrivacyCookiesPages(),
  ]

  const checks: LaunchReadinessCheck[] = [
    ...tier1Checks,
    ...tier2Checks,
    ...contentChecks,
    ...integrationChecks,
    ...complianceChecks,
  ]

  const passed = checks.filter((c) => c.status === 'pass').length
  const warnings = checks.filter((c) => c.status === 'warn').length
  const failed = checks.filter((c) => c.status === 'fail').length
  const skipped = checks.filter((c) => c.status === 'skip').length
  const total = checks.length

  const blockerCount = checks.filter((c) => c.status === 'fail' && c.blocking).length
  const warnCount = warnings

  let overall: LaunchReadinessReport['overall']
  if (blockerCount > 0) {
    overall = 'blocked'
  } else if (warnCount > 0 || failed > 0) {
    overall = 'launching-with-warnings'
  } else {
    overall = 'ready'
  }

  return {
    generatedAt: new Date().toISOString(),
    overall,
    blockerCount,
    warnCount,
    checks,
    summary: { passed, warnings, failed, skipped, total },
  }
}
