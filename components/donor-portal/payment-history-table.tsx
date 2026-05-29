/**
 * Donor-portal payment history table.
 *
 * Server component — pure render of the rows from
 * lib/donor-portal-data.fetchDonorPortalData().paymentHistory.
 *
 * Renders at most 12 rows + a "+ N earlier charges" affordance, so the
 * table stays scannable even when a 6-year donor opens the portal.
 *
 * Empty state is rendered (not hidden) because seeing "your first payment
 * is in progress" is the right message for a donor who just signed up
 * minutes ago and is checking the portal for the first time.
 */

import type { Locale } from '@/i18n.config'

const MAX_VISIBLE_ROWS = 12

export interface PaymentHistoryRow {
  readonly id: string
  readonly amount: { value: string; currency: string }
  readonly status: string
  readonly paidAt: string | null
  readonly method: string | null
}

export interface PaymentHistoryTableProps {
  readonly payments: ReadonlyArray<PaymentHistoryRow>
  readonly locale: Locale
}

/**
 * Locale → BCP-47 tag for Intl APIs.
 *
 * Matches the page.tsx convention (`locale === 'en' ? 'en-GB' : locale`)
 * so date formatting in the table is consistent with the rest of the
 * portal. 'en' → 'en-GB' specifically because Alpacas Ibiza serves an EU
 * audience (DD MMM YYYY beats MM/DD/YYYY).
 */
function bcp47(locale: Locale): string {
  return locale === 'en' ? 'en-GB' : locale
}

function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(bcp47(locale), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatAmount(amount: { value: string; currency: string }): string {
  // Mollie sends `value` as a stringified decimal (e.g. "75.00"). Keep it
  // verbatim — converting to Number for Intl.NumberFormat risks float
  // rounding on amounts the donor verifies against their bank statement.
  return `${amount.value} ${amount.currency}`
}

interface StatusStyle {
  readonly bg: string
  readonly fg: string
  readonly label: string
}

function statusStyle(status: string): StatusStyle {
  const s = status.toLowerCase()
  if (s === 'paid') return { bg: '#dcfce7', fg: '#15803d', label: 'Paid' }
  if (s === 'failed' || s === 'expired' || s === 'canceled') {
    return { bg: '#fee2e2', fg: '#b91c1c', label: s.charAt(0).toUpperCase() + s.slice(1) }
  }
  if (s === 'pending' || s === 'open' || s === 'authorized') {
    return { bg: '#fef3c7', fg: '#a16207', label: s.charAt(0).toUpperCase() + s.slice(1) }
  }
  return { bg: '#f4f4f5', fg: '#52525b', label: status || '—' }
}

export function PaymentHistoryTable({ payments, locale }: PaymentHistoryTableProps) {
  const total = payments.length
  const visible = payments.slice(0, MAX_VISIBLE_ROWS)
  const hidden = Math.max(0, total - MAX_VISIBLE_ROWS)

  return (
    <section
      aria-labelledby="donor-payment-history-heading"
      style={{
        background: '#fff',
        border: '1px solid #e4e4e7',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <h2
        id="donor-payment-history-heading"
        style={{
          fontSize: 13,
          fontWeight: 600,
          margin: '0 0 12px',
          color: '#3f3f46',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Payment history
      </h2>

      {total === 0 ? (
        <p
          style={{
            margin: 0,
            padding: '20px 16px',
            background: '#fafafa',
            border: '1px dashed #d4d4d8',
            borderRadius: 8,
            color: '#71717a',
            fontSize: 13,
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          No charges yet — your first payment is in progress.
        </p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14,
                color: '#27272a',
              }}
            >
              <thead>
                <tr style={{ textAlign: 'left', color: '#71717a', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  <th style={{ padding: '8px 12px 8px 0', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '8px 0 8px 12px', fontWeight: 600 }}>Method</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const ss = statusStyle(p.status)
                  return (
                    <tr key={p.id} style={{ borderTop: '1px solid #f4f4f5' }}>
                      <td style={{ padding: '10px 12px 10px 0', whiteSpace: 'nowrap' }}>
                        {formatDate(p.paidAt, locale)}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {formatAmount(p.amount)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            background: ss.bg,
                            color: ss.fg,
                            padding: '2px 10px',
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ss.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 0 10px 12px', color: '#52525b', whiteSpace: 'nowrap' }}>
                        {p.method ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {hidden > 0 && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#71717a', fontStyle: 'italic' }}>
              + {hidden} earlier charge{hidden === 1 ? '' : 's'} — contact us at{' '}
              <a href="mailto:info@alpacasibiza.com" style={{ color: '#556B2F' }}>
                info@alpacasibiza.com
              </a>{' '}
              for full history.
            </p>
          )}
        </>
      )}
    </section>
  )
}
