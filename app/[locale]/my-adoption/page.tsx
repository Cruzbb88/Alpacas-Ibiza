import { redirect } from 'next/navigation'
import Image from 'next/image'
import type { Locale } from '@/i18n.config'
import { SITE_BASE_URL } from '@/lib/config'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { fetchDonorPortalData } from '@/lib/donor-portal-data'
import { getTenant } from '@/lib/tenants/server'
import { getProviders } from '@/lib/integrations'
import { t } from '@/lib/translations'
import { PortalErrorState } from './error-state'
import { PhotoGallery } from '@/components/donor-portal/photo-gallery'
import { PaymentHistoryTable } from '@/components/donor-portal/payment-history-table'
import { ShareCTA } from '@/components/donor-portal/share-cta'
import { generateReferralCode } from '@/lib/referral-codes'
import { ReferralCodeBadge } from './referral-code-badge'

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
 *
 * i18n: page-level labels are translated via t(locale) → translations/{locale}.json
 * `portal.*` namespace. Companion components in components/donor-portal/*
 * remain English-only this round (separate work stream).
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
  const translate = t(locale)

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

  // ── Referral code + share URL ─────────────────────────────────────────────
  // Deterministic per-donor code derived from the Mollie customerId via HMAC.
  // Same input → same code, so the link the donor pasted into Instagram last
  // month still points back to them. generateReferralCode runs server-side
  // (NEWSLETTER_SIGNING_KEY is server-only); we pass the result down to a
  // client component for the analytics impression.
  //
  // Wrapped in try/catch: a missing signing key (dev misconfig) MUST NOT
  // break the donor portal. Fall back to no badge rather than crash the
  // whole page.
  let referralCode: string | null = null
  try {
    referralCode = generateReferralCode(result.customerId)
  } catch (err) {
    // Tier 1 NEXTAUTH_SECRET fallback should always be set in prod; this
    // path is reachable only in misconfigured dev environments.
    console.warn('[my-adoption] generateReferralCode failed:', err instanceof Error ? err.message : String(err))
  }

  // Build the share URL with `?ref=<code>` appended NON-DESTRUCTIVELY so any
  // existing `?alpaca=<slug>` stays intact (URLSearchParams merges cleanly).
  // We deliberately mirror the URL the ShareCTA builds — same path, same
  // alpaca param — and only add the ref tag on top.
  const baseShareSearch = new URLSearchParams()
  if (result.subscription.alpacaSlug) {
    baseShareSearch.set('alpaca', result.subscription.alpacaSlug)
  }
  if (referralCode) {
    baseShareSearch.set('ref', referralCode)
  }
  const shareQueryString = baseShareSearch.toString()
  const referralShareUrl = `${SITE_BASE_URL}/${locale}/share-adoption${shareQueryString ? `?${shareQueryString}` : ''}`

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
          {translate('portal.title')}
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
          <strong>{translate('portal.failureWarningPrefix').replace('{count}', String(result.failureCount))}</strong> {translate('portal.failureWarningSuffix')}
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
            <strong>{translate('portal.photoComingSoon')}</strong>
          </div>
        )}
        <div style={{ padding: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: '#556B2F' }}>
            {result.alpacaDisplayName ?? animal?.name ?? translate('portal.matchedAlpacaFallback')}
          </h2>
          {!result.alpacaDisplayName && (
            <p style={{ color: '#a1a1aa', fontSize: 13, marginTop: 4, fontStyle: 'italic' }}>
              {translate('portal.weWillPick')}
            </p>
          )}
          {animal?.bio && (
            <p style={{ color: '#3f3f46', fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
              {animal.bio}
            </p>
          )}
          {animal && !animal.bio && (
            <p style={{ color: '#71717a', fontSize: 13, marginTop: 12, fontStyle: 'italic' }}>
              {translate('portal.bioComingSoon')}
            </p>
          )}
          {animal?.personality && (
            <p style={{ marginTop: 12, fontSize: 13, color: '#52525b' }}>
              <strong>{translate('portal.personalityLabel')}</strong> {animal.personality}
            </p>
          )}
        </div>
      </section>

      {/* Subscription summary — the practical info. */}
      <section style={{ background: '#fafafa', border: '1px solid #e4e4e7', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: '#3f3f46', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {translate('portal.subscriptionHeader')}
        </h2>
        <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 16px', fontSize: 14, margin: 0 }}>
          <dt style={{ color: '#71717a' }}>{translate('portal.amount')}</dt>
          <dd style={{ margin: 0, fontWeight: 500 }}>
            {result.subscription.amount
              ? `${result.subscription.amount.value} ${result.subscription.amount.currency}${result.subscription.interval ? ' / ' + result.subscription.interval : ''}`
              : '—'}
          </dd>
          <dt style={{ color: '#71717a' }}>{translate('portal.nextCharge')}</dt>
          <dd style={{ margin: 0, fontWeight: 500 }}>
            {result.subscription.nextPaymentDate
              ? new Date(result.subscription.nextPaymentDate).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </dd>
          <dt style={{ color: '#71717a' }}>{translate('portal.started')}</dt>
          <dd style={{ margin: 0, fontWeight: 500 }}>
            {result.subscription.createdAt
              ? new Date(result.subscription.createdAt).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </dd>
          {result.subscription.canceledAt && (
            <>
              <dt style={{ color: '#71717a' }}>{translate('portal.canceled')}</dt>
              <dd style={{ margin: 0, fontWeight: 500 }}>
                {new Date(result.subscription.canceledAt).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, { day: '2-digit', month: 'short', year: 'numeric' })}
              </dd>
            </>
          )}
        </dl>
      </section>

      {/* Payment mandate — surfaces SEPA / card authorisation state so donors
          learn about a revoked mandate BEFORE their next charge fails
          (parity with N26 / Klarna / Revolut subscription tabs). Sits between
          the subscription summary and the action buttons so the
          "Update payment method" CTA below is the natural next action when
          mandate state is bad. */}
      {(() => {
        const m = result.mandate
        // Status → badge colour mapping. Unknown / null → gray.
        const mStatus = m?.status ?? null
        const badgeColor =
          mStatus === 'valid' ? '#15803d'
          : mStatus === 'pending' ? '#a16207'
          : mStatus === 'invalid' || mStatus === 'revoked' ? '#b91c1c'
          : '#52525b'
        const badgeBg =
          mStatus === 'valid' ? '#dcfce7'
          : mStatus === 'pending' ? '#fef3c7'
          : mStatus === 'invalid' || mStatus === 'revoked' ? '#fee2e2'
          : '#f4f4f5'
        // Method → human label. Mollie returns 'directdebit' | 'creditcard' |
        // 'paypal'; we surface the EU-payment-app convention donors recognise.
        const methodLabel =
          m?.method === 'directdebit' ? 'SEPA'
          : m?.method === 'creditcard' ? 'Card'
          : m?.method === 'ideal' ? 'iDEAL'
          : m?.method === 'paypal' ? 'PayPal'
          : m?.method ?? null
        // SEPA accounts get the masked-IBAN dot prefix; card numbers come
        // pre-masked from Mollie (already start with •••• so no double prefix).
        const accountDisplay =
          m?.bankAccount
            ? m.method === 'directdebit' || (m.bankAccount.length === 4 && /^\w{4}$/.test(m.bankAccount))
              ? `•••• ${m.bankAccount}`
              : m.bankAccount
            : null
        return (
          <section style={{ background: '#fafafa', border: '1px solid #e4e4e7', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: '#3f3f46', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Payment mandate
            </h2>
            {m === null ? (
              <p style={{ margin: 0, fontSize: 14, color: '#52525b' }}>
                <span style={{ background: badgeBg, color: badgeColor, padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginRight: 10 }}>
                  No mandate
                </span>
                No mandate on file. Use the &ldquo;Update payment method&rdquo; button below to authorise one.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span style={{ background: badgeBg, color: badgeColor, padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
                    {mStatus ?? 'unknown'}
                  </span>
                  {methodLabel && (
                    <span style={{ fontSize: 14, color: '#3f3f46', fontWeight: 500 }}>{methodLabel}</span>
                  )}
                  {accountDisplay && (
                    <span style={{ fontSize: 14, color: '#52525b', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                      {accountDisplay}
                    </span>
                  )}
                </div>
                <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 16px', fontSize: 14, margin: 0 }}>
                  <dt style={{ color: '#71717a' }}>Signed</dt>
                  <dd style={{ margin: 0, fontWeight: 500 }}>
                    {m.signatureDate
                      ? new Date(m.signatureDate).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </dd>
                </dl>
                {(mStatus === 'invalid' || mStatus === 'revoked') && (
                  <div style={{ marginTop: 12, background: '#fee2e2', borderLeft: '4px solid #b91c1c', padding: '10px 14px', borderRadius: 6, fontSize: 14, color: '#7f1d1d' }}>
                    <strong>Mandate revoked</strong> — your next charge will fail. Tap &ldquo;Update payment method&rdquo; below.
                  </div>
                )}
              </>
            )}
          </section>
        )
      })()}

      {/* Action buttons */}
      <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        {isLive && result.updateToken && (
          <a
            href={`${SITE_BASE_URL}/api/mollie-manage/update-payment?token=${result.updateToken}`}
            style={{ background: '#556B2F', color: '#fff', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
          >
            {translate('portal.updatePayment')}
          </a>
        )}
        {isLive && result.cancelToken && (
          <a
            href={`${SITE_BASE_URL}/api/mollie-manage/cancel?token=${result.cancelToken}`}
            style={{ background: '#fff', color: '#b91c1c', border: '1px solid #b91c1c', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
          >
            {translate('portal.cancel')}
          </a>
        )}
        {!isLive && (
          <a
            href={`${SITE_BASE_URL}/${locale}/adopt`}
            style={{ background: '#556B2F', color: '#fff', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
          >
            {translate('portal.adoptAgain')}
          </a>
        )}
      </section>

      {/* Share-adoption CTA + referral-code badge.
          Sits between the action buttons (update/cancel) and the photo
          gallery so the share affordance is visible without scrolling past
          the emotional content (alpaca card + gallery). The badge shows the
          donor's stable referral code and renders the share URL with `?ref=`
          appended non-destructively — the ShareCTA component itself stays
          unchanged this round (forbidden file constraint) so the
          ShareCTA-built clipboard link does NOT yet include `?ref=`; the
          referral URL displayed here is what donors can copy manually.
          Follow-up round will thread the code into ShareCTA's clipboard
          payload once that component opens up for edits. */}
      {isLive && <ShareCTA alpacaSlug={result.subscription.alpacaSlug} locale={locale} referralCode={referralCode} />}
      {isLive && referralCode && (
        <ReferralCodeBadge code={referralCode} shareUrl={referralShareUrl} />
      )}

      {/* Photo gallery — always-rendered surface so donors see what's coming
          even before the owner uploads shots. Empty array → soft empty state.
          NEVER invent photo paths (Failsafe Rule 5). */}
      <PhotoGallery photos={galleryPhotos} alpacaName={galleryAlpacaName} />

      {/* Payment history — always rendered. Empty array → "first payment in
          progress" hint, which is the right message for a fresh donor. */}
      <PaymentHistoryTable payments={result.paymentHistory} locale={locale} />

      {/* Latest quarterly farm news — sneak preview from the admin compose
          page. Sits last (just above the footer) so the practical info
          (mandate / actions / payment history) is what donors see first
          when they land on the page. */}
      {result.latestQuarter && (
        <section style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#556B2F' }}>
              {translate('portal.farmNewsHeader').replace('{label}', result.latestQuarter.label)}
            </h2>
            {!result.latestQuarter.sentAt && (
              <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {translate('portal.sneakPeek')}
              </span>
            )}
          </div>
          <div
            style={{ color: '#3f3f46', fontSize: 14, lineHeight: 1.6 }}
            // Belt-and-braces sanitiser: strip <script> blocks + inline event
            // handlers before injecting. Source today is admin-composed
            // (admin-gated save route already strips these), but this guard
            // means a future CMS / DB swap can't bypass the policy by
            // accident. Mirrors the strip in /api/admin/quarterly-update.
            dangerouslySetInnerHTML={{
              __html: result.latestQuarter.newsHtml
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
                .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
                .replace(/\son\w+\s*=\s*[^\s>]+/gi, ''),
            }}
          />
        </section>
      )}

      <footer style={{ marginTop: 32, padding: 16, borderTop: '1px solid #e4e4e7', fontSize: 12, color: '#a1a1aa' }}>
        {translate('portal.footerHelpPrefix')}{' '}
        <a href="mailto:info@alpacasibiza.com" style={{ color: '#556B2F' }}>info@alpacasibiza.com</a>.
      </footer>
    </main>
  )
}
