import { redirect } from 'next/navigation'
import Image from 'next/image'
import type { Locale } from '@/i18n.config'
import { SITE_BASE_URL } from '@/lib/config'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { fetchDonorPortalData } from '@/lib/donor-portal-data'
import { getTenant } from '@/lib/tenants/server'
import { getProviders } from '@/lib/integrations'
import { PortalErrorState } from './error-state'
import { PhotoGallery } from '@/components/donor-portal/photo-gallery'
import { PaymentHistoryTable } from '@/components/donor-portal/payment-history-table'

export const metadata = {
  title: 'Your adoption — Alpacas Ibiza',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * /[locale]/my-adoption?token=<status-scoped-token>
 *
 * Donor self-service portal. Replaces the legacy HTML page at
 * /api/mollie-manage/status with a React surface that shows:
 *   1. The donor's adopted alpaca (photo + bio) — what they actually
 *      came here for. The old page only showed a slug like "paco" in
 *      a table cell.
 *   2. Subscription summary (tier, amount, next charge, status badge).
 *   3. Latest "what's new on the farm" — the most recent quarterly
 *      content from the admin compose page, even if it hasn't gone
 *      out by email yet (sneak preview).
 *   4. Action buttons: update payment / cancel / re-adopt (state-aware).
 *
 * Token-gated via the existing capability-token infrastructure. Both this
 * page and the legacy HTML route consume lib/donor-portal-data.ts so any
 * fix lands in one place.
 *
 * NOINDEX: page renders donor-specific data with a token in the URL.
 */
export default async function MyAdoptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ token?: string }>
}) {
  const { locale } = await params
  const { token } = await searchParams

  // No token at all → bounce to the adopt page where they can request a fresh
  // portal email. We don't render an error state for the literally-empty case
  // because it's almost always someone hitting the URL by accident.
  if (!token) {
    redirect(`/${locale}/adopt#manage`)
  }

  const apiKey = process.env.MOLLIE_API_KEY
  const mollie = apiKey ? await getMollieClient(apiKey) : null
  const result = await fetchDonorPortalData(token, mollie)

  if (!result.ok) {
    return <PortalErrorState locale={locale} reason={result.reason} message={result.message} />
  }

  // Resolve the actual alpaca entity (photo + bio) when the donor picked one.
  const tenant = await getTenant()
  const providers = getProviders(tenant)
  const animals = providers.content.listAnimals()
  const animal = result.subscription.alpacaSlug
    ? animals.find((a) => a.id === result.subscription.alpacaSlug) ?? null
    : null

  // Resolve gallery photos. The AnimalEntity.gallery field is optional and
  // null/undefined = UNMAPPED (owner hasn't supplied photos yet). NEVER
  // invent paths — pass an empty array so PhotoGallery shows its
  // empty-state hint instead of broken <img> tags.
  const galleryPhotos = (animal?.gallery ?? []).map((g) => ({ src: g.src, alt: g.alt }))
  const galleryAlpacaName = result.alpacaDisplayName ?? animal?.name ?? 'your alpaca'

  const statusLabel = result.subscription.status
  const isLive = result.isLive
  const statusColor =
    statusLabel === 'active' ? '#15803d'
    : statusLabel === 'pending' ? '#a16207'
    : statusLabel === 'suspended' ? '#b91c1c'
    : '#52525b'
  const statusBg =
    statusLabel === 'active' ? '#dcfce7'
    : statusLabel === 'pending' ? '#fef3c7'
    : statusLabel === 'suspended' ? '#fee2e2'
    : '#f4f4f5'

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto', padding: '32px 16px', color: '#27272a' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#556B2F' }}>
          Your adoption
        </h1>
        <p style={{ color: '#71717a', margin: '4px 0 0' }}>
          <span style={{ background: statusBg, color: statusColor, padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
            {statusLabel}
          </span>
          {result.subscription.tier ? <span style={{ marginLeft: 12, fontSize: 14 }}>{result.subscription.tier} tier</span> : null}
        </p>
      </header>

      {result.failureCount >= 2 && (
        <div style={{ background: '#fef3c7', borderLeft: '4px solid #d97706', padding: '12px 16px', marginBottom: 24, borderRadius: 6, fontSize: 14, color: '#78350f' }}>
          <strong>Heads up — {result.failureCount} recent payment failures.</strong> Your adoption will pause if we can&apos;t collect soon. Use the &ldquo;Update payment&rdquo; button below to fix it.
        </div>
      )}

      {/* Alpaca card — the emotional centerpiece. Shows photo + bio when
          owner has supplied them, otherwise a placeholder with helpful copy. */}
      <section style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, overflow: 'hidden', marginBottom: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        {animal?.image ? (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#f4f4f5' }}>
            <Image
              src={animal.image}
              alt={`Photo of ${animal.name}`}
              fill
              sizes="(min-width: 720px) 720px, 100vw"
              style={{ objectFit: 'cover' }}
              priority={false}
            />
          </div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #ecfccb 0%, #d9f99d 100%)', padding: 48, textAlign: 'center', color: '#365314', fontSize: 14 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🦙</div>
            <strong>Photo coming soon.</strong> The owner is gathering portraits — your welcome packet has one too.
          </div>
        )}
        <div style={{ padding: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: '#556B2F' }}>
            {result.alpacaDisplayName ?? animal?.name ?? 'Your matched alpaca'}
          </h2>
          {!result.alpacaDisplayName && (
            <p style={{ color: '#a1a1aa', fontSize: 13, marginTop: 4, fontStyle: 'italic' }}>
              You let us pick — we&apos;ll match you to one of the herd within a few days and update this page.
            </p>
          )}
          {animal?.bio && (
            <p style={{ color: '#3f3f46', fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
              {animal.bio}
            </p>
          )}
          {animal && !animal.bio && (
            <p style={{ color: '#71717a', fontSize: 13, marginTop: 12, fontStyle: 'italic' }}>
              Bio coming soon — the owner is collecting personality notes from the herd.
            </p>
          )}
          {animal?.personality && (
            <p style={{ marginTop: 12, fontSize: 13, color: '#52525b' }}>
              <strong>Personality:</strong> {animal.personality}
            </p>
          )}
        </div>
      </section>

      {/* Subscription summary — the practical info. */}
      <section style={{ background: '#fafafa', border: '1px solid #e4e4e7', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: '#3f3f46', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Subscription
        </h2>
        <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 16px', fontSize: 14, margin: 0 }}>
          <dt style={{ color: '#71717a' }}>Amount</dt>
          <dd style={{ margin: 0, fontWeight: 500 }}>
            {result.subscription.amount
              ? `${result.subscription.amount.value} ${result.subscription.amount.currency}${result.subscription.interval ? ' / ' + result.subscription.interval : ''}`
              : '—'}
          </dd>
          <dt style={{ color: '#71717a' }}>Next charge</dt>
          <dd style={{ margin: 0, fontWeight: 500 }}>
            {result.subscription.nextPaymentDate
              ? new Date(result.subscription.nextPaymentDate).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </dd>
          <dt style={{ color: '#71717a' }}>Started</dt>
          <dd style={{ margin: 0, fontWeight: 500 }}>
            {result.subscription.createdAt
              ? new Date(result.subscription.createdAt).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </dd>
          {result.subscription.canceledAt && (
            <>
              <dt style={{ color: '#71717a' }}>Canceled</dt>
              <dd style={{ margin: 0, fontWeight: 500 }}>
                {new Date(result.subscription.canceledAt).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, { day: '2-digit', month: 'short', year: 'numeric' })}
              </dd>
            </>
          )}
        </dl>
      </section>

      {/* Action buttons */}
      <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        {isLive && result.updateToken && (
          <a
            href={`${SITE_BASE_URL}/api/mollie-manage/update-payment?token=${result.updateToken}`}
            style={{ background: '#556B2F', color: '#fff', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
          >
            Update payment method
          </a>
        )}
        {isLive && result.cancelToken && (
          <a
            href={`${SITE_BASE_URL}/api/mollie-manage/cancel?token=${result.cancelToken}`}
            style={{ background: '#fff', color: '#b91c1c', border: '1px solid #b91c1c', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
          >
            Cancel adoption
          </a>
        )}
        {!isLive && (
          <a
            href={`${SITE_BASE_URL}/${locale}/adopt`}
            style={{ background: '#556B2F', color: '#fff', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
          >
            Adopt again
          </a>
        )}
      </section>

      {/* Photo gallery — always-rendered surface so donors see what's coming
          even before the owner uploads shots. Empty array → soft empty state.
          NEVER invent photo paths (Failsafe Rule 5). */}
      <PhotoGallery photos={galleryPhotos} alpacaName={galleryAlpacaName} />

      {/* Latest quarterly farm news — sneak preview from the admin compose page */}
      {result.latestQuarter && (
        <section style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#556B2F' }}>
              {result.latestQuarter.label} from the farm
            </h2>
            {!result.latestQuarter.sentAt && (
              <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                Sneak peek
              </span>
            )}
          </div>
          <div
            style={{ color: '#3f3f46', fontSize: 14, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: result.latestQuarter.newsHtml }}
          />
        </section>
      )}

      {/* Payment history — always rendered. Empty array → "first payment in
          progress" hint, which is the right message for a fresh donor. */}
      <PaymentHistoryTable payments={result.paymentHistory} locale={locale} />

      <footer style={{ marginTop: 32, padding: 16, borderTop: '1px solid #e4e4e7', fontSize: 12, color: '#a1a1aa' }}>
        Need help? Reply to your welcome email or write to{' '}
        <a href="mailto:info@alpacasibiza.com" style={{ color: '#556B2F' }}>info@alpacasibiza.com</a>.
      </footer>
    </main>
  )
}
