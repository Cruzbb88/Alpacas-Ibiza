/**
 * Presentational component: renders a list of CheckResult items.
 * Pure — no data fetching, no side effects.
 */

import type { CheckResult } from '@/lib/launch-readiness/check-env'

function StatusIcon({ status }: { status: CheckResult['status'] }) {
  if (status === 'green') {
    return (
      <span
        aria-label="Passed"
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#16a34a',
          flexShrink: 0,
          marginTop: 4,
        }}
      />
    )
  }
  if (status === 'yellow') {
    return (
      <span
        aria-label="Warning"
        style={{
          display: 'inline-block',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '11px solid #ca8a04',
          flexShrink: 0,
          marginTop: 2,
        }}
      />
    )
  }
  // red
  return (
    <span
      aria-label="Failed"
      style={{
        display: 'inline-block',
        fontWeight: 700,
        color: '#dc2626',
        fontSize: 14,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      ✕
    </span>
  )
}

function CheckRow({ check }: { check: CheckResult }) {
  const rowBg =
    check.status === 'red'
      ? '#fef2f2'
      : check.status === 'yellow'
      ? '#fffbeb'
      : undefined

  return (
    <li
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '10px 12px',
        borderBottom: '1px solid #f3f4f6',
        background: rowBg,
      }}
    >
      <StatusIcon status={check.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>
          {check.label}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{check.detail}</div>
        {check.fixHint && (check.status === 'yellow' || check.status === 'red') && (
          <div
            style={{
              fontSize: 11,
              color: check.status === 'red' ? '#b91c1c' : '#92400e',
              marginTop: 4,
              fontStyle: 'italic',
            }}
          >
            Fix: {check.fixHint}
          </div>
        )}
      </div>
    </li>
  )
}

interface CheckListProps {
  checks: CheckResult[]
}

export function CheckList({ checks }: CheckListProps) {
  if (checks.length === 0) {
    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        <li style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 13 }}>No checks</li>
      </ul>
    )
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {checks.map((check) => (
        <CheckRow key={check.id} check={check} />
      ))}
    </ul>
  )
}
