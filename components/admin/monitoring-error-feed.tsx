/**
 * MonitoringErrorFeed — scrollable list of recent 404 / client-error entries.
 *
 * Server component (no 'use client'). Renders the errors section of the
 * monitoring snapshot. Shows an inline "logging gap" notice when the source
 * is unavailable.
 */

import type { ErrorsSection } from '@/lib/monitoring/snapshot'

export interface MonitoringErrorFeedProps {
  errors: ErrorsSection
}

export function MonitoringErrorFeed({ errors }: MonitoringErrorFeedProps) {
  const hasEntries = errors.entries.length > 0

  return (
    <div
      style={{
        background: '#fff',
        border: '1.5px solid #e5e7eb',
        borderRadius: 12,
        padding: '16px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 10 }}>
        Recent errors / 404s
      </div>

      {errors.note ? (
        <div
          style={{
            fontSize: 12,
            color: '#78350f',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: hasEntries ? 10 : 0,
          }}
        >
          {errors.note}
        </div>
      ) : null}

      {hasEntries ? (
        <div
          style={{
            maxHeight: 320,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {errors.entries.map((entry, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '8px 12px',
                background: '#f9fafb',
                borderRadius: 6,
                fontSize: 13,
                minHeight: 36,
              }}
            >
              <span style={{ fontFamily: 'monospace', color: '#374151', flexGrow: 1, wordBreak: 'break-all' }}>
                {entry.route}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  fontWeight: 600,
                  color: entry.count > 5 ? '#dc2626' : '#6b7280',
                  fontSize: 12,
                }}
              >
                &times;{entry.count}
              </span>
              <span style={{ flexShrink: 0, color: '#9ca3af', fontSize: 11 }}>
                {new Date(entry.lastSeenAt).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      ) : !errors.note ? (
        <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
          No recent errors recorded.
        </div>
      ) : null}
    </div>
  )
}
