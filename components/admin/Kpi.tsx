/**
 * Shared KPI card for admin analytics dashboards.
 *
 * Three pages (vat, dunning, subscriptions) had near-identical inline
 * copies of this — same border, padding, fontSize, color logic, drifted
 * by whitespace and one-vs-two-line styling. This is the canonical shape.
 *
 * `negative` flips the numeric color to red — used when the metric being
 * displayed is "bad when non-zero" (action-required donors, churn %, etc).
 */
import type { ReactNode } from 'react'

export interface KpiProps {
  label: string
  value: string
  negative?: boolean
  /**
   * Optional sub-label rendered below the main value, smaller. Used by the
   * VAT page to surface "remaining" alongside the threshold figure.
   */
  caption?: ReactNode
}

export function Kpi({ label, value, negative, caption }: KpiProps) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 10,
        padding: 16,
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: '#6b7280',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: negative ? '#a44' : '#111827',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {caption !== undefined ? (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{caption}</div>
      ) : null}
    </div>
  )
}
