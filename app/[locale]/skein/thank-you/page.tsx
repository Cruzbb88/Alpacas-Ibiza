/**
 * /[locale]/skein/thank-you — post-checkout confirmation for skein sponsorship.
 *
 * Reads ?alpaca=<displayName> from the success_url set by /api/skein-checkout.
 * Note: this receives the DISPLAY NAME (e.g. "Dusty"), not the slug, because
 * Stripe substitutes {CHECKOUT_SESSION_ID} client-side and our success_url
 * passes the display name directly for simplicity (single one-off payment,
 * no webhook session lookup needed).
 *
 * Separate page (simpler than adding a branch to AdoptThankYou — no
 * tier/billing-portal logic needed here, and the messaging is distinct).
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'

export const metadata: Metadata = {
  title: 'Sponsorship confirmed — Alpacas Ibiza',
  robots: { index: false, follow: false },
}

export default async function SkeinThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const sp = searchParams ? await searchParams : {}

  // alpaca is passed as the display name from success_url
  const alpacaName = typeof sp.alpaca === 'string' ? sp.alpaca : null

  // Gift mode: set by success_url when gift_name was present at checkout.
  const isGift = sp.gift === 'true'
  const giftRecipientName = typeof sp.gift_name === 'string' ? sp.gift_name : null

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 560,
        margin: '0 auto',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      {/* Success icon */}
      <div style={{ fontSize: 64, marginBottom: 24 }}>🧶</div>

      <h1
        style={{
          fontSize: 30,
          fontWeight: 800,
          color: '#111827',
          marginBottom: 16,
          lineHeight: 1.2,
        }}
      >
        {isGift && giftRecipientName
          ? `Gift confirmed for ${giftRecipientName}`
          : alpacaName
            ? `You're down for ${alpacaName}'s spring shearing`
            : 'Sponsorship confirmed'}
      </h1>

      <p style={{ fontSize: 16, color: '#4b5563', marginBottom: 8, lineHeight: 1.6 }}>
        {isGift && giftRecipientName
          ? `You sponsored ${alpacaName ? `${alpacaName}'s` : "an alpaca's"} spring shearing as a gift for ${giftRecipientName}. We'll add a hand-written card to the package.`
          : alpacaName
            ? `We have you down for ${alpacaName}'s spring shearing.`
            : `We have you down for one of our alpacas' spring shearing.`}{' '}
        {!isGift && 'Wool ships in October. We’ll email you 2 weeks before delivery with tracking details.'}
        {isGift && 'Wool ships in October — we’ll reach out closer to delivery.'}
      </p>

      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 40 }}>
        A confirmation email has been sent by Stripe. If you don&rsquo;t see it within a few
        minutes, check your spam folder or contact us at{' '}
        <a
          href="mailto:info@alpacasibiza.com"
          style={{ color: 'hsl(var(--primary))', textDecoration: 'none' }}
        >
          info@alpacasibiza.com
        </a>
        .
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Link
          href={`/${locale}/skein`}
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: 'hsl(var(--primary))',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
          }}
        >
          Back to skein sponsorships
        </Link>
        <Link
          href={`/${locale}/adopt`}
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: '#fff',
            color: 'hsl(var(--primary))',
            border: '1.5px solid hsl(var(--primary))',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
          }}
        >
          Adopt an alpaca →
        </Link>
        <Link
          href={`/${locale}`}
          style={{
            fontSize: 14,
            color: '#6b7280',
            textDecoration: 'none',
          }}
        >
          Back to the farm &rarr;
        </Link>
      </div>
    </div>
  )
}
