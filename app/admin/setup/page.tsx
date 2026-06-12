/**
 * /admin/setup — owner-facing launch wizard.
 *
 * Single scrollable page that walks through every API key + sign-up needed
 * for launch. Auth-gated via middleware (already enforced) + session check.
 *
 * Phases:
 *   1. Core auth (Tier 1 — all required)
 *   2. Email infrastructure
 *   3. Payments (Stripe or Mollie)
 *   4. Bookings (optional during migration)
 *   5. Optional polish
 */

import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { isSet } from '@/lib/validate-env'
import { SetupStep, type StepStatus } from '@/components/admin/setup-step'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Launch Setup — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

// ── helpers ──────────────────────────────────────────────────────────────────

function status(key: string): StepStatus {
  return isSet(key) ? 'set' : 'unset'
}

function multiStatus(...keys: string[]): StepStatus {
  const allSet = keys.every((k) => isSet(k))
  const noneSet = keys.every((k) => !isSet(k))
  if (allSet) return 'set'
  if (noneSet) return 'unset'
  return 'invalid' // partial — some set, some not
}

function EnvVar({ name, hint }: { name: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-1">
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{name}</code>
      {hint && <span className="text-xs text-foreground/60">{hint}</span>}
    </div>
  )
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline text-primary hover:opacity-80"
    >
      {children}
    </a>
  )
}

function CopyBox({ children }: { children: string }) {
  return (
    <pre className="mt-1 rounded bg-muted px-3 py-2 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
      {children}
    </pre>
  )
}

function PhaseHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="pt-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
          Phase {number}
        </span>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      <p className="text-sm text-foreground/60">{description}</p>
      <hr className="mt-3 border-border" />
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function AdminSetupPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  // Compute statuses server-side so badges render instantly (no hydration flash)
  const vendorEnv = process.env.PAYMENT_VENDOR ?? ''
  const stripeActive = vendorEnv === 'stripe'
  const mollieActive = vendorEnv === 'mollie'

  const tier1Ready = [
    'NEXTAUTH_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD',
    'CRON_SECRET', 'CONTACT_EMAIL', 'RESEND_API_KEY',
    'FAREHARBOR_WEBHOOK_SECRET',
  ].filter((k) => !isSet(k)).length === 0

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Launch setup wizard</h1>
        <p className="mt-2 text-sm text-foreground/60">
          Work top-to-bottom. Complete every step in Phase 1 before going live.
          Phases 4–5 are optional.
        </p>
        {!tier1Ready && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 font-medium">
            Phase 1 is not complete — the site cannot safely go live yet.
          </div>
        )}
        {tier1Ready && (
          <div className="mt-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900 font-medium">
            Phase 1 complete. Review phases 2–3 before launching.
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          Phase 1 — Core auth
      ═══════════════════════════════════════════════════ */}
      <PhaseHeading
        number="1"
        title="Core auth"
        description="All required. Site breaks or is unsafe without these."
      />

      {/* Step 1 — NEXTAUTH_SECRET */}
      <SetupStep
        number={1}
        headline="NextAuth secret"
        status={status('NEXTAUTH_SECRET')}
        whatItDoes="Encrypts admin login sessions — without it, anyone can forge a session cookie."
        howToGet={
          <p>
            Run in your terminal:{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">openssl rand -base64 32</code>
            <br />
            Example output (do not reuse this one):
            <CopyBox>{'NEXTAUTH_SECRET=kZm8QvT3+Ln9xP0yJ2RhFa7WdEsXcNbOuI1GkYqMtVo='}</CopyBox>
          </p>
        }
        whereToPaste={
          <>
            <EnvVar name="NEXTAUTH_SECRET" hint="min 32 chars, base64" />
            <EnvVar name="NEXTAUTH_URL" hint="e.g. https://alpacasibiza.com (no trailing slash)" />
          </>
        }
        verifyCheck="nextauth_secret"
        verifyLabel="Verify secret length"
      />

      {/* Step 2 — ADMIN_USERNAME + ADMIN_PASSWORD */}
      <SetupStep
        number={2}
        headline="Admin login credentials"
        status={multiStatus('ADMIN_USERNAME', 'ADMIN_PASSWORD')}
        whatItDoes="Your username and password for this admin dashboard. No default credentials exist — the login page returns nothing until both are set."
        howToGet={
          <p>
            Use a password manager (1Password, Bitwarden, etc.) to generate a strong password.
            Recommended: username with no spaces, password 16+ chars with mixed case + symbols.
            <br />
            No verify needed — you are already logged in, which proves credentials are working.
          </p>
        }
        whereToPaste={
          <>
            <EnvVar name="ADMIN_USERNAME" hint='not "admin" — use something unique' />
            <EnvVar name="ADMIN_PASSWORD" hint="16+ chars recommended" />
          </>
        }
      />

      {/* Step 3 — CRON_SECRET */}
      <SetupStep
        number={3}
        headline="Cron secret"
        status={status('CRON_SECRET')}
        whatItDoes="Authenticates Vercel cron jobs (weekly digest, quarterly update, renewal reminders). Without it, the cron routes reject all requests."
        howToGet={
          <p>
            Run:{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">openssl rand -hex 32</code>
            <br />
            This generates a 64-character hex string.
          </p>
        }
        whereToPaste={
          <EnvVar name="CRON_SECRET" hint="min 16 chars, hex string" />
        }
        verifyCheck="cron_secret"
        verifyLabel="Verify cron secret"
      />

      {/* Step 4 — CONTACT_EMAIL */}
      <SetupStep
        number={4}
        headline="Contact email"
        status={status('CONTACT_EMAIL')}
        whatItDoes="Where every contact form submission, adoption notification, dunning alert, and weekly digest lands."
        howToGet={
          <p>This is simply your email address — no sign-up needed.</p>
        }
        whereToPaste={
          <EnvVar name="CONTACT_EMAIL" hint="e.g. info@alpacasibiza.com" />
        }
      />

      {/* ═══════════════════════════════════════════════════
          Phase 2 — Email infrastructure
      ═══════════════════════════════════════════════════ */}
      <PhaseHeading
        number="2"
        title="Email infrastructure"
        description="Required to send any email from the site."
      />

      {/* Step 5 — RESEND_API_KEY */}
      <SetupStep
        number={5}
        headline="Resend API key"
        status={status('RESEND_API_KEY')}
        whatItDoes="Sends every email the site generates — welcome emails, adoption receipts, contact replies, cron digests."
        howToGet={
          <ol className="list-decimal list-inside space-y-1">
            <li>Sign up at <Link href="https://resend.com">resend.com</Link></li>
            <li>Dashboard → API Keys → Create API Key</li>
            <li>Choose permission: &quot;Sending access&quot;</li>
            <li>Copy the key (shown once — save it now)</li>
          </ol>
        }
        whereToPaste={
          <EnvVar name="RESEND_API_KEY" hint='starts with "re_"' />
        }
        verifyCheck="resend"
        verifyLabel="Verify Resend key"
      />

      {/* Step 6 — DNS records */}
      <SetupStep
        number={6}
        headline="Email DNS records (One.com)"
        status={'unset' as StepStatus}
        whatItDoes="Authenticates alpacasibiza.com as an authorised sender so emails reach Gmail instead of spam."
        howToGet={
          <ol className="list-decimal list-inside space-y-1">
            <li>Resend Dashboard → Domains → Add Domain → <code className="text-xs font-mono">alpacasibiza.com</code></li>
            <li>Resend shows 3 DNS records (SPF, DKIM, DMARC)</li>
            <li>Log in to your registrar (One.com) → DNS settings → paste each record</li>
            <li>Resend Dashboard → wait for all 3 checks to turn green (5–30 minutes)</li>
            <li>
              External verification:{' '}
              <Link href="https://mail-tester.com">mail-tester.com</Link>
              {' '}→ send a test email to the address shown → score should be 9+/10
            </li>
          </ol>
        }
        whereToPaste={
          <p className="text-sm text-foreground/60">
            DNS changes only — no env var needed. Verify via Resend dashboard (all 3 records green).
          </p>
        }
      />

      {/* ═══════════════════════════════════════════════════
          Phase 3 — Payments
      ═══════════════════════════════════════════════════ */}
      <PhaseHeading
        number="3"
        title="Payments"
        description="Pick one processor. Mollie is recommended for EU SEPA Direct Debit (€0.25/charge vs Stripe ~€1.75 at €75/month — saves ~€900/year at 50 donors)."
      />

      {/* Step 7 — PAYMENT_VENDOR */}
      <SetupStep
        number={7}
        headline="Payment vendor selection"
        status={isSet('PAYMENT_VENDOR') ? 'set' : 'unset'}
        whatItDoes="Tells the site which processor to use for Adopt-a-Paca payments. Without this, the adopt CTA falls back to a mailto link."
        howToGet={
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="font-semibold text-sm text-green-900">Mollie (recommended)</div>
                <ul className="mt-1 text-xs text-green-800 space-y-0.5">
                  <li>SEPA Direct Debit: ~€0.25/charge</li>
                  <li>Visa/MC, iDEAL, Bancontact</li>
                  <li>Spain + NL companies supported</li>
                  <li>KYC takes 1–2 business days</li>
                </ul>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="font-semibold text-sm text-blue-900">Stripe</div>
                <ul className="mt-1 text-xs text-blue-800 space-y-0.5">
                  <li>Cards: ~€1.75/charge at €75/mo</li>
                  <li>Larger ecosystem, more docs</li>
                  <li>Faster onboarding</li>
                  <li>Needs Price IDs created in dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        }
        whereToPaste={
          <EnvVar name="PAYMENT_VENDOR" hint='"mollie" or "stripe"' />
        }
      />

      {/* Step 8 — Stripe */}
      <SetupStep
        number={8}
        headline="Stripe keys"
        status={multiStatus('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_ADOPT_PRICE_ID_MONTHLY', 'STRIPE_ADOPT_PRICE_ID_YEARLY')}
        whatItDoes="Activates Stripe Checkout for monthly and yearly Adopt-a-Paca subscriptions. Skip if using Mollie."
        howToGet={
          <ol className="list-decimal list-inside space-y-1">
            <li>Create account at <Link href="https://stripe.com">stripe.com</Link></li>
            <li>Verify business identity + add bank account for payouts</li>
            <li>Dashboard → Products → Create &quot;Adopt-a-Paca Monthly&quot; → Recurring €75/mo → copy Price ID</li>
            <li>Dashboard → Products → Create &quot;Adopt-a-Paca Yearly&quot; → One-time €900 → copy Price ID</li>
            <li>Dashboard → Developers → Webhooks → Add endpoint → <code className="text-xs font-mono">https://alpacasibiza.com/api/stripe-webhook</code> → events: <code className="text-xs font-mono">checkout.session.completed</code>, <code className="text-xs font-mono">checkout.session.expired</code>, <code className="text-xs font-mono">customer.subscription.deleted</code></li>
            <li>Copy Signing secret (<code className="text-xs font-mono">whsec_…</code>) from webhook detail page</li>
          </ol>
        }
        whereToPaste={
          <>
            <EnvVar name="STRIPE_SECRET_KEY" hint='starts with "sk_live_"' />
            <EnvVar name="STRIPE_WEBHOOK_SECRET" hint='starts with "whsec_"' />
            <EnvVar name="STRIPE_ADOPT_PRICE_ID_MONTHLY" hint='starts with "price_"' />
            <EnvVar name="STRIPE_ADOPT_PRICE_ID_YEARLY" hint='starts with "price_"' />
          </>
        }
        verifyCheck={stripeActive || isSet('STRIPE_SECRET_KEY') ? 'stripe' : undefined}
        verifyLabel="Verify Stripe key"
      />

      {/* Step 9 — Mollie */}
      <SetupStep
        number={9}
        headline="Mollie keys"
        status={multiStatus('MOLLIE_API_KEY', 'MOLLIE_WEBHOOK_SECRET')}
        whatItDoes="Activates Mollie SEPA Direct Debit checkout for Adopt-a-Paca subscriptions. Skip if using Stripe."
        howToGet={
          <ol className="list-decimal list-inside space-y-1">
            <li>Create account at <Link href="https://www.mollie.com">mollie.com</Link></li>
            <li>Complete KYC (typically 1–2 business days)</li>
            <li>Dashboard → Payment methods → enable SEPA Direct Debit, Cards, iDEAL, Bancontact</li>
            <li>Dashboard → Developers → API keys → copy live key (<code className="text-xs font-mono">live_xxx</code>)</li>
            <li>
              Generate webhook secret locally:{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">openssl rand -hex 32</code>
            </li>
            <li>Note: no webhook URL registration needed — the code passes it inline per-payment</li>
          </ol>
        }
        whereToPaste={
          <>
            <EnvVar name="MOLLIE_API_KEY" hint='starts with "live_"' />
            <EnvVar name="MOLLIE_WEBHOOK_SECRET" hint="64-char hex string you generated above" />
          </>
        }
        verifyCheck={mollieActive || isSet('MOLLIE_API_KEY') ? 'mollie' : undefined}
        verifyLabel="Verify Mollie key"
      />

      {/* ═══════════════════════════════════════════════════
          Phase 4 — Bookings
      ═══════════════════════════════════════════════════ */}
      <PhaseHeading
        number="4"
        title="Bookings (optional during migration)"
        description="Required for FareHarbor passthrough. Per-tour item IDs unlock direct booking buttons."
      />

      {/* Step 10 — FAREHARBOR_WEBHOOK_SECRET */}
      <SetupStep
        number={10}
        headline="FareHarbor webhook secret"
        status={status('FAREHARBOR_WEBHOOK_SECRET')}
        whatItDoes="Authenticates incoming webhooks from FareHarbor (new booking → 48h reminder email, tour completion → review request). Required if using FareHarbor passthrough."
        howToGet={
          <p>
            Generate locally:{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">openssl rand -hex 32</code>
            <br />
            Then ask FareHarbor support to set their webhook URL to{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">https://alpacasibiza.com/api/fareharbor-webhook</code>
            {' '}and include header{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">x-webhook-secret: &lt;your secret&gt;</code>
          </p>
        }
        whereToPaste={
          <EnvVar name="FAREHARBOR_WEBHOOK_SECRET" hint="64-char hex string" />
        }
      />

      {/* Step 11 — FareHarbor API keys */}
      <SetupStep
        number={11}
        headline="FareHarbor API keys (live spots widget)"
        status={multiStatus('FAREHARBOR_APP_KEY', 'FAREHARBOR_USER_KEY')}
        whatItDoes="Powers the real-time &quot;spots left&quot; widget on tour pages and provides live data to the owner digest. Without these, the widget is hidden."
        howToGet={
          <ol className="list-decimal list-inside space-y-1">
            <li>Email <Link href="mailto:support@fareharbor.com">support@fareharbor.com</Link>: &quot;Please grant External API access for alpacasibiza. We need app key and user key.&quot;</li>
            <li>FareHarbor support typically responds within 1–2 business days</li>
          </ol>
        }
        whereToPaste={
          <>
            <EnvVar name="FAREHARBOR_APP_KEY" hint="provided by FareHarbor support" />
            <EnvVar name="FAREHARBOR_USER_KEY" hint="provided by FareHarbor support" />
          </>
        }
      />

      {/* Step 12 — FareHarbor item IDs */}
      <SetupStep
        number={12}
        headline="FareHarbor item IDs (per-tour deep links)"
        status={multiStatus(
          'FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP',
        )}
        whatItDoes="Sends each &quot;Book Now&quot; button to the specific tour instead of the main calendar. Without these, all book buttons fall back to the main calendar (fail-open — they still work)."
        howToGet={
          <ol className="list-decimal list-inside space-y-1">
            <li>Open the Squarespace DevTools script #3 from <code className="text-xs font-mono">handoff/SQUARESPACE_DEVTOOLS_SCRIPTS.md</code> — run it on the live site to collect all item IDs (~5 min, no FareHarbor login needed)</li>
            <li>Or log in to FareHarbor Dashboard → Items → find each item → copy the numeric ID from the URL</li>
          </ol>
        }
        whereToPaste={
          <>
            <EnvVar name="FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP" hint="numeric" />
            <EnvVar name="FAREHARBOR_ITEM_YOGA" hint="numeric" />
            <EnvVar name="FAREHARBOR_ITEM_GIFT_CARD" hint="numeric" />
            <EnvVar name="FAREHARBOR_ITEM_WEDDINGS" hint="numeric" />
            <EnvVar name="FAREHARBOR_ITEM_PHOTOSHOOTS" hint="numeric" />
            <EnvVar name="FAREHARBOR_ITEM_ROMANTIC_SUNSET" hint="numeric" />
            <EnvVar name="FAREHARBOR_ITEM_FAMILY_FARM_DAYS" hint="numeric" />
            <EnvVar name="FAREHARBOR_ITEM_BUSINESS_INCENTIVES" hint="numeric" />
            <EnvVar name="FAREHARBOR_ITEM_WOVEN" hint="numeric" />
            <EnvVar name="FAREHARBOR_ITEM_ALCACA" hint="numeric" />
            <EnvVar name="FAREHARBOR_ITEM_COMMISSION" hint="numeric" />
          </>
        }
      />

      {/* ═══════════════════════════════════════════════════
          Phase 5 — Optional polish
      ═══════════════════════════════════════════════════ */}
      <PhaseHeading
        number="5"
        title="Optional polish"
        description="Site launches fine without these. They unlock bot protection, analytics, and live reviews."
      />

      {/* Step 13 — Turnstile */}
      <SetupStep
        number={13}
        headline="Cloudflare Turnstile (bot protection)"
        status={multiStatus('TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY')}
        whatItDoes="Protects contact, newsletter, and commission forms from bots. Without it, forms still work but are unprotected."
        howToGet={
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <Link href="https://dash.cloudflare.com">dash.cloudflare.com</Link> → Turnstile → Add site</li>
            <li>Widget type: &quot;Managed&quot;, domain: <code className="text-xs font-mono">alpacasibiza.com</code></li>
            <li>Copy Site Key (public) and Secret Key (private)</li>
          </ol>
        }
        whereToPaste={
          <>
            <EnvVar name="NEXT_PUBLIC_TURNSTILE_SITE_KEY" hint="public site key (safe to expose)" />
            <EnvVar name="TURNSTILE_SECRET_KEY" hint="secret key (server only)" />
          </>
        }
      />

      {/* Step 14 — GA4 */}
      <SetupStep
        number={14}
        headline="GA4 analytics (in-site dashboard)"
        status={multiStatus('GA4_PROPERTY_ID', 'GA4_CLIENT_EMAIL', 'GA4_PRIVATE_KEY')}
        whatItDoes="Powers the analytics page inside this admin dashboard. Without it, the analytics page is dark. GA4 still collects data via the pixel — this is only for the in-site view."
        howToGet={
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>Simpler option:</strong> invite yourself to GA4 directly — <Link href="https://analytics.google.com">analytics.google.com</Link> → Admin → Account Access → Add user (role: Viewer)</li>
            <li><strong>In-site dashboard:</strong> <Link href="https://console.cloud.google.com">console.cloud.google.com</Link> → Create service account with Viewer on GA4 property → generate JSON key → extract <code className="text-xs font-mono">client_email</code> and <code className="text-xs font-mono">private_key</code></li>
          </ol>
        }
        whereToPaste={
          <>
            <EnvVar name="GA4_PROPERTY_ID" hint="numeric property ID from GA4 Admin" />
            <EnvVar name="GA4_CLIENT_EMAIL" hint="service account email" />
            <EnvVar name="GA4_PRIVATE_KEY" hint='paste exactly, including "\n" line breaks' />
          </>
        }
      />

      {/* Step 15 — Google Places */}
      <SetupStep
        number={15}
        headline="Google Places (live star rating)"
        status={multiStatus('GOOGLE_PLACES_API_KEY', 'GOOGLE_PLACES_PLACE_ID')}
        whatItDoes="Shows a live Google star rating badge on the tours page. Without it, the badge is hidden — the rest of the page is unaffected."
        howToGet={
          <ol className="list-decimal list-inside space-y-1">
            <li><Link href="https://console.cloud.google.com">console.cloud.google.com</Link> → APIs &amp; Services → Enable &quot;Places API (New)&quot;</li>
            <li>Credentials → Create API key → restrict to <code className="text-xs font-mono">alpacasibiza.com</code></li>
            <li><Link href="https://developers.google.com/maps/documentation/places/web-service/place-id">Place ID Finder</Link> → search &quot;Alpacas Ibiza&quot; → copy Place ID</li>
          </ol>
        }
        whereToPaste={
          <>
            <EnvVar name="GOOGLE_PLACES_API_KEY" hint="restrict to your domain in Google Console" />
            <EnvVar name="GOOGLE_PLACES_PLACE_ID" hint='starts with "ChIJ"' />
          </>
        }
      />

      {/* Footer nav */}
      <div className="pt-4 flex flex-wrap gap-3 text-sm">
        <a href="/admin/env-check" className="text-primary underline hover:opacity-80">
          Full env-var status table →
        </a>
        <a href="/admin/launch-readiness" className="text-primary underline hover:opacity-80">
          Launch readiness checklist →
        </a>
        <a href="/admin" className="text-foreground/60 hover:text-foreground">
          ← Back to admin
        </a>
      </div>

    </main>
  )
}
