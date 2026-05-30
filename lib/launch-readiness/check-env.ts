/**
 * Launch-readiness: Tier 1 environment checks + payment vendor check.
 * All checks are synchronous — no I/O.
 */

import { isValidEmail } from '@/lib/validate-email'

export interface CheckResult {
  id: string
  label: string
  status: 'green' | 'yellow' | 'red'
  detail: string
  fixHint?: string
}

function env(key: string): string | undefined {
  const v = process.env[key]
  if (!v || v.startsWith('TODO_') || v === '__OWNER_INPUT_REQUIRED__') return undefined
  return v
}

export function checkTier1Env(): CheckResult[] {
  const results: CheckResult[] = []

  // RESEND_API_KEY
  const resendKey = env('RESEND_API_KEY')
  results.push({
    id: 'resend_api_key',
    label: 'RESEND_API_KEY',
    status: resendKey?.startsWith('re_') ? 'green' : resendKey ? 'yellow' : 'red',
    detail: resendKey
      ? resendKey.startsWith('re_')
        ? 'Set and starts with re_ (valid format)'
        : 'Set but does not start with re_ — may be invalid'
      : 'Not set',
    fixHint: !resendKey
      ? 'Resend dashboard → API Keys → Create key. Starts with re_'
      : !resendKey.startsWith('re_')
      ? 'Key format looks wrong. Resend keys start with re_'
      : undefined,
  })

  // CONTACT_EMAIL
  const contactEmail = env('CONTACT_EMAIL')
  const contactValid = contactEmail ? isValidEmail(contactEmail) : false
  results.push({
    id: 'contact_email',
    label: 'CONTACT_EMAIL',
    status: !contactEmail ? 'red' : contactValid ? 'green' : 'yellow',
    detail: !contactEmail
      ? 'Not set'
      : contactValid
      ? `Set: ${contactEmail}`
      : `Set but fails email validation: ${contactEmail}`,
    fixHint: !contactEmail
      ? 'Set CONTACT_EMAIL to where form submissions and admin alerts should go'
      : !contactValid
      ? 'Value does not look like a valid email address'
      : undefined,
  })

  // NEXTAUTH_SECRET
  const nextauthSecret = env('NEXTAUTH_SECRET')
  results.push({
    id: 'nextauth_secret',
    label: 'NEXTAUTH_SECRET',
    status: !nextauthSecret ? 'red' : nextauthSecret.length >= 32 ? 'green' : 'yellow',
    detail: !nextauthSecret
      ? 'Not set'
      : nextauthSecret.length >= 32
      ? `Set (${nextauthSecret.length} chars)`
      : `Set but too short (${nextauthSecret.length} chars, need ≥32)`,
    fixHint: !nextauthSecret
      ? 'Run: openssl rand -base64 32'
      : nextauthSecret.length < 32
      ? 'Generate a longer secret: openssl rand -base64 32'
      : undefined,
  })

  // ADMIN_USERNAME
  const adminUser = env('ADMIN_USERNAME')
  const adminUserBad = adminUser === 'admin'
  results.push({
    id: 'admin_username',
    label: 'ADMIN_USERNAME',
    status: !adminUser ? 'red' : adminUserBad ? 'red' : 'green',
    detail: !adminUser
      ? 'Not set — admin login non-functional'
      : adminUserBad
      ? 'Set to literal "admin" — insecure default'
      : 'Set',
    fixHint: !adminUser
      ? 'Set ADMIN_USERNAME in env (do not use "admin")'
      : adminUserBad
      ? 'Change ADMIN_USERNAME to something other than "admin"'
      : undefined,
  })

  // ADMIN_PASSWORD
  const adminPass = env('ADMIN_PASSWORD')
  const adminPassBad = adminPass === 'password'
  results.push({
    id: 'admin_password',
    label: 'ADMIN_PASSWORD',
    status: !adminPass ? 'red' : adminPassBad ? 'red' : 'green',
    detail: !adminPass
      ? 'Not set — admin login non-functional'
      : adminPassBad
      ? 'Set to literal "password" — insecure default'
      : 'Set',
    fixHint: !adminPass
      ? 'Set ADMIN_PASSWORD in env (16+ chars recommended)'
      : adminPassBad
      ? 'Change ADMIN_PASSWORD to a strong password'
      : undefined,
  })

  // NEXTAUTH_URL
  const nextauthUrl = env('NEXTAUTH_URL')
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  const urlOk = nextauthUrl
    ? isProd
      ? nextauthUrl.startsWith('https://')
      : true
    : false
  results.push({
    id: 'nextauth_url',
    label: 'NEXTAUTH_URL',
    status: !nextauthUrl ? 'red' : !urlOk ? 'yellow' : 'green',
    detail: !nextauthUrl
      ? 'Not set'
      : !urlOk
      ? `Set to "${nextauthUrl}" — must start with https:// in production`
      : `Set: ${nextauthUrl}`,
    fixHint: !nextauthUrl
      ? 'Set NEXTAUTH_URL=https://alpacasibiza.com'
      : !urlOk
      ? 'Change to https:// URL for production'
      : undefined,
  })

  // FAREHARBOR_WEBHOOK_SECRET
  const fhSecret = env('FAREHARBOR_WEBHOOK_SECRET')
  results.push({
    id: 'fareharbor_webhook_secret',
    label: 'FAREHARBOR_WEBHOOK_SECRET',
    status: fhSecret ? 'green' : 'red',
    detail: fhSecret ? 'Set' : 'Not set — FareHarbor webhook endpoint returns 503',
    fixHint: !fhSecret ? 'Run: openssl rand -hex 32' : undefined,
  })

  // CRON_SECRET
  const cronSecret = env('CRON_SECRET')
  results.push({
    id: 'cron_secret',
    label: 'CRON_SECRET',
    status: !cronSecret ? 'red' : cronSecret.length >= 16 ? 'green' : 'yellow',
    detail: !cronSecret
      ? 'Not set — cron routes unprotected'
      : cronSecret.length >= 16
      ? `Set (${cronSecret.length} chars)`
      : `Set but too short (${cronSecret.length} chars, need ≥16)`,
    fixHint: !cronSecret
      ? 'Run: openssl rand -hex 32'
      : cronSecret.length < 16
      ? 'Generate a longer secret: openssl rand -hex 32'
      : undefined,
  })

  return results
}

export function checkPaymentVendor(): CheckResult {
  const vendor = env('PAYMENT_VENDOR')

  if (!vendor) {
    return {
      id: 'payment_vendor',
      label: 'Payment vendor',
      status: 'yellow',
      detail: 'PAYMENT_VENDOR not set — adopt CTA falls back to mailto:',
      fixHint: 'Set PAYMENT_VENDOR=mollie (recommended) or PAYMENT_VENDOR=stripe',
    }
  }

  if (vendor === 'fareharbor') {
    return {
      id: 'payment_vendor',
      label: `Payment vendor: fareharbor`,
      status: 'green',
      detail: 'FareHarbor passthrough path active (backward-compatible)',
    }
  }

  if (vendor === 'stripe') {
    const stripeKey = env('STRIPE_SECRET_KEY')
    const stripeWebhook = env('STRIPE_WEBHOOK_SECRET')
    const monthlyId = env('STRIPE_ADOPT_PRICE_ID_MONTHLY')
    const yearlyId = env('STRIPE_ADOPT_PRICE_ID_YEARLY')

    const issues: string[] = []
    if (!stripeKey) issues.push('STRIPE_SECRET_KEY missing')
    else if (!stripeKey.startsWith('sk_live_') && !stripeKey.startsWith('sk_test_'))
      issues.push('STRIPE_SECRET_KEY does not start with sk_live_ or sk_test_')
    if (!stripeWebhook) issues.push('STRIPE_WEBHOOK_SECRET missing')
    else if (!stripeWebhook.startsWith('whsec_'))
      issues.push('STRIPE_WEBHOOK_SECRET does not start with whsec_')
    if (!monthlyId) issues.push('STRIPE_ADOPT_PRICE_ID_MONTHLY missing')
    else if (!monthlyId.startsWith('price_'))
      issues.push('STRIPE_ADOPT_PRICE_ID_MONTHLY does not start with price_')
    if (!yearlyId) issues.push('STRIPE_ADOPT_PRICE_ID_YEARLY missing')
    else if (!yearlyId.startsWith('price_'))
      issues.push('STRIPE_ADOPT_PRICE_ID_YEARLY does not start with price_')

    if (issues.length === 0) {
      return {
        id: 'payment_vendor',
        label: 'Payment vendor: Stripe',
        status: 'green',
        detail: 'All Stripe keys set and format-valid',
      }
    }
    return {
      id: 'payment_vendor',
      label: 'Payment vendor: Stripe (incomplete)',
      status: 'red',
      detail: issues.join('; '),
      fixHint: 'Stripe dashboard → Developers → API keys + Webhooks. Set all 4 STRIPE_* env vars.',
    }
  }

  if (vendor === 'mollie') {
    const mollieKey = env('MOLLIE_API_KEY')
    const mollieWebhook = env('MOLLIE_WEBHOOK_SECRET')

    const issues: string[] = []
    if (!mollieKey) issues.push('MOLLIE_API_KEY missing')
    else if (!mollieKey.startsWith('live_') && !mollieKey.startsWith('test_'))
      issues.push('MOLLIE_API_KEY does not start with live_ or test_')
    if (!mollieWebhook) issues.push('MOLLIE_WEBHOOK_SECRET missing')

    if (issues.length === 0) {
      return {
        id: 'payment_vendor',
        label: 'Payment vendor: Mollie',
        status: 'green',
        detail: 'All Mollie keys set and format-valid',
      }
    }
    return {
      id: 'payment_vendor',
      label: 'Payment vendor: Mollie (incomplete)',
      status: 'red',
      detail: issues.join('; '),
      fixHint:
        'Mollie dashboard → Developers → API keys. Run: openssl rand -hex 32 for MOLLIE_WEBHOOK_SECRET.',
    }
  }

  return {
    id: 'payment_vendor',
    label: `Payment vendor: ${vendor}`,
    status: 'yellow',
    detail: `Unknown PAYMENT_VENDOR value: "${vendor}"`,
    fixHint: 'Set PAYMENT_VENDOR to one of: mollie, stripe, fareharbor',
  }
}
