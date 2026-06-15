/**
 * /[locale]/share-adoption?alpaca=<slug>
 *
 * Public landing page hit when someone opens the share-link a donor posted on
 * Instagram / WhatsApp / Twitter. This is NOT token-gated — the whole point
 * of the share-card is that anyone can preview it.
 *
 * - Renders a branded "Sample Donor adopted {Alpaca} — want to adopt one too?"
 *   welcome with a big CTA into `/{locale}/adopt`.
 * - Sets OG metadata → `/api/og/adoption-share?alpaca=<slug>` so when this URL
 *   is pasted into a social feed the preview card renders correctly.
 * - Unknown slug → generic "I support Alpacas Ibiza" voice, still funnels into
 *   the adopt page.
 *
 * Failsafe philosophy: this page MUST render for any input, including an empty
 * query string. The OG card route + findAlpacaName both fall back gracefully,
 * so we mirror that here.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { SITE_BASE_URL } from '@/lib/config'
import { findAlpacaName } from '@/lib/data/alpacas'
import { REFERRAL_CODE_RE } from '@/lib/referral-codes'

type SearchParams = Promise<{ alpaca?: string; ref?: string }>
type Params = Promise<{ locale: Locale }>


function resolveAlpacaName(raw: string | undefined): string | null {
  if (!raw) return null
  return findAlpacaName(raw)
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}): Promise<Metadata> {
  const { locale } = await params
  const { alpaca } = await searchParams
  const alpacaName = resolveAlpacaName(alpaca)

  const title = alpacaName
    ? `Sample Donor adopted ${alpacaName} — Alpacas Ibiza`
    : 'Support Alpacas Ibiza'
  const description = alpacaName
    ? `Sample Donor adopted ${alpacaName} at Alpacas Ibiza, Es Currals. Want to adopt one too?`
    : "Sample Donor supports Alpacas Ibiza, Ibiza's first alpaca farm. Adopt your own."

  // The OG card route ignores unknown slugs and falls back to generic, so it's
  // safe to forward the raw query string here (sanitised by URLSearchParams).
  const ogSearch = alpaca
    ? `?alpaca=${encodeURIComponent(alpaca)}`
    : ''
  const ogImage = `${SITE_BASE_URL}/api/og/adoption-share${ogSearch}`
  const pageUrl = `${SITE_BASE_URL}/${locale}/share-adoption${ogSearch}`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function ShareAdoptionPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { locale } = await params
  const { alpaca, ref } = await searchParams
  const alpacaName = resolveAlpacaName(alpaca)
  const validRef = ref && REFERRAL_CODE_RE.test(ref) ? ref : null

  const headline = alpacaName
    ? `Sample Donor adopted ${alpacaName} at Alpacas Ibiza.`
    : 'Sample Donor supports Alpacas Ibiza.'
  const subline = 'Want to adopt one too?'
  const adoptHref = validRef
    ? `/${locale}/adopt?referral=${encodeURIComponent(validRef)}`
    : `/${locale}/adopt`

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px',
        background: 'linear-gradient(135deg, #f5f5dc 0%, #ecead0 100%)',
        color: '#27272a',
      }}
    >
      <section
        style={{
          maxWidth: 640,
          width: '100%',
          background: '#fff',
          border: '1px solid #e4e4e7',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(85, 107, 47, 0.08)',
          padding: '48px 32px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 16 }} aria-hidden>
          🦙
        </div>

        <p
          style={{
            fontSize: 13,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'hsl(var(--primary))',
            fontWeight: 600,
            margin: '0 0 16px',
          }}
        >
          Welcome
        </p>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: 'hsl(var(--primary))',
            lineHeight: 1.2,
            margin: '0 0 12px',
          }}
        >
          {headline}
        </h1>

        <p style={{ fontSize: 18, color: '#3f3f46', margin: '0 0 32px' }}>
          {subline}
        </p>

        <Link
          href={adoptHref}
          style={{
            display: 'inline-block',
            background: 'hsl(var(--primary))',
            color: '#fff',
            padding: '16px 40px',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 18,
          }}
        >
          Adopt your own
        </Link>

        <p style={{ fontSize: 13, color: '#a1a1aa', marginTop: 32 }}>
          Alpacas Ibiza · Es Currals · alpacasibiza.com
        </p>
      </section>
    </div>
  )
}
