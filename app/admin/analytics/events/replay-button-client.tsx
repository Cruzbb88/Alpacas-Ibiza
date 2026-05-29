'use client'

/**
 * Client-island Replay button for the payment-events admin page.
 *
 * Why a client island instead of a Server Action?
 *   The replay route lives at /api/admin/replay-event so curl / a future
 *   external monitoring agent (e.g. UptimeRobot health probe) can POST to it
 *   without a session-action token. Keeping the call surface as a POST + JSON
 *   keeps the contract simple for both this UI and any future ops scripts.
 *
 * UX shape:
 *   - idle    → "Replay" button.
 *   - working → spinner + disabled.
 *   - ok      → green pill "Replayed · <status>".
 *   - err     → red pill "Failed · <reason>".
 *
 * Errors are kept terse on-screen — the page surface is operational, not
 * customer-facing. Full error JSON is also logged to the browser console for
 * the operator who's debugging a missed webhook.
 */
import { useState } from 'react'

type State =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'ok'; statusCode: number; replayedAs: string }
  | { kind: 'err'; message: string }

export default function ReplayButton({ eventId }: { eventId: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function onClick() {
    setState({ kind: 'working' })
    try {
      const res = await fetch('/api/admin/replay-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      const body = (await res.json().catch(() => null)) as
        | { ok: true; replayedAs: string; statusCode: number }
        | { ok: false; error: string }
        | null
      if (!res.ok || !body || !('ok' in body) || body.ok !== true) {
        const msg = body && 'error' in body ? body.error : `HTTP ${res.status}`
        console.error('[replay-button] replay failed', { eventId, body })
        setState({ kind: 'err', message: msg })
        return
      }
      setState({ kind: 'ok', statusCode: body.statusCode, replayedAs: body.replayedAs })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[replay-button] replay threw', { eventId, message })
      setState({ kind: 'err', message })
    }
  }

  if (state.kind === 'ok') {
    return (
      <span
        title={`Replayed as ${state.replayedAs}`}
        style={{
          background: '#dcfce7',
          color: '#166534',
          padding: '4px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        Replayed · {state.statusCode}
      </span>
    )
  }
  if (state.kind === 'err') {
    return (
      <span
        title={state.message}
        style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '4px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        Failed · {state.message.slice(0, 24)}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state.kind === 'working'}
      style={{
        background: state.kind === 'working' ? '#e5e7eb' : '#6366f1',
        color: state.kind === 'working' ? '#6b7280' : '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '4px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: state.kind === 'working' ? 'wait' : 'pointer',
      }}
    >
      {state.kind === 'working' ? 'Replaying…' : 'Replay'}
    </button>
  )
}
