/**
 * MonitoringCard — reusable status card with traffic-light dot.
 *
 * Server component (no 'use client'). Stateless props only.
 * 44px+ minimum tap target on mobile.
 */

import type { TrafficLight } from '@/lib/monitoring/snapshot'

export interface MonitoringCardProps {
  title: string
  status: TrafficLight
  details: string[]
  /** Optional small badge below the headline, e.g. "12 active" */
  badge?: string
}

const DOT: Record<TrafficLight, { color: string; label: string }> = {
  green:       { color: '#16a34a', label: 'OK' },
  yellow:      { color: '#d97706', label: 'Warning' },
  red:         { color: '#dc2626', label: 'Error' },
  unavailable: { color: '#9ca3af', label: 'Unavailable' },
}

const CARD_BORDER: Record<TrafficLight, string> = {
  green:       '#bbf7d0',
  yellow:      '#fde68a',
  red:         '#fecaca',
  unavailable: '#e5e7eb',
}

export function MonitoringCard({ title, status, details, badge }: MonitoringCardProps) {
  const dot = DOT[status]
  const borderColor = CARD_BORDER[status]

  return (
    <div
      style={{
        background: '#fff',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 12,
        padding: '16px 18px',
        minHeight: 44,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Traffic-light dot */}
        <span
          aria-label={dot.label}
          title={dot.label}
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: dot.color,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1.2 }}>
          {title}
        </span>
        {badge ? (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              fontWeight: 600,
              color: '#374151',
              background: '#f3f4f6',
              borderRadius: 20,
              padding: '2px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      {/* Detail lines */}
      {details.length > 0 ? (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {details.map((d, i) => (
            <li key={i} style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.4 }}>
              {d}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
