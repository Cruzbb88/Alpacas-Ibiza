'use client'

/**
 * Small client component that renders the donor's stable referral code and
 * fires the `referral_link_displayed` analytics event exactly once per mount.
 *
 * Why a separate file under app/[locale]/my-adoption/ (not components/donor-portal/):
 *   The donor-portal component folder is a hard-forbidden surface for the
 *   referral-tracking change set (see task brief). Co-locating with the
 *   page keeps the new client boundary out of that protected area without
 *   spawning a new top-level components subdir.
 *
 * The component DOES NOT compute the code itself — generateReferralCode is
 * a server-side function (NEWSLETTER_SIGNING_KEY is server-only). The page
 * computes the code from result.customerId and passes it in as a prop.
 *
 * Analytics: useEffect + ref guard so React 18 dev-mode double-render does
 * not double-count the impression event.
 */

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics-events'

interface ReferralCodeBadgeProps {
  /** Pre-computed deterministic referral code for the donor's customerId. */
  code: string
  /** Full share URL with `?ref=<code>` already appended — for the helper copy. */
  shareUrl: string
}

export function ReferralCodeBadge({ code, shareUrl }: ReferralCodeBadgeProps) {
  // React Strict Mode double-fires effects in dev. Single-shot guard keeps
  // the impression count honest. Production builds drop StrictMode wrapping
  // for the user-facing tree, so this is purely a dev-time correctness net.
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    trackEvent('referral_link_displayed', { code })
  }, [code])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: '#f4f4f5',
        border: '1px dashed #d4d4d8',
        borderRadius: 8,
        padding: '8px 12px',
        marginTop: 4,
        fontSize: 12,
        color: '#52525b',
      }}
    >
      <span>
        Your referral code:{' '}
        <strong style={{ color: '#27272a', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }}>
          {code}
        </strong>
      </span>
      <span
        style={{
          color: '#71717a',
          fontSize: 11,
          wordBreak: 'break-all',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}
      >
        {shareUrl}
      </span>
    </div>
  )
}
