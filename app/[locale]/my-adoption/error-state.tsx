import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'

interface Props {
  locale: Locale
  reason: 'no-token' | 'expired' | 'sdk-missing' | 'fetch-failed'
  message: string
}

export function PortalErrorState({ locale, reason, message }: Props) {
  const translate = t(locale)
  const TITLES: Record<Props['reason'], string> = {
    'no-token': translate('portal.errorTitle.noToken'),
    expired: translate('portal.errorTitle.expired'),
    'sdk-missing': translate('portal.errorTitle.sdkMissing'),
    'fetch-failed': translate('portal.errorTitle.fetchFailed'),
  }
  const showRequestFreshLink = reason === 'no-token' || reason === 'expired'
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '0 auto', padding: '64px 16px', color: '#27272a', textAlign: 'center' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#556B2F', marginBottom: 12 }}>
        {TITLES[reason]}
      </h1>
      <p style={{ color: '#52525b', fontSize: 15, lineHeight: 1.5 }}>{message}</p>
      <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {showRequestFreshLink && (
          <Link
            href={`/${locale}/adopt#manage`}
            style={{ background: '#556B2F', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
          >
            {translate('portal.requestFreshLink')}
          </Link>
        )}
        <a
          href="mailto:info@alpacasibiza.com"
          style={{ background: '#fff', color: '#556B2F', border: '1px solid #556B2F', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
        >
          {translate('portal.emailUs')}
        </a>
      </div>
    </main>
  )
}
