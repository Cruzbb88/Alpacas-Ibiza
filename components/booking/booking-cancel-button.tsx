'use client'

/**
 * Self-service cancel button on the guest manage page (spec-011 §J). POSTs the
 * bookingId + manage token to /api/booking/cancel. The server enforces the 24h
 * refund policy + does the refund; this just drives the action and shows the
 * outcome. No account — the token is the capability.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function BookingCancelButton({
  id, token, refundable,
}: { id: string; token: string; refundable: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const cancel = async () => {
    const ok = window.confirm(
      refundable
        ? 'Cancel this booking? You’ll be refunded in full.'
        : 'Cancel this booking? It’s within 24h of the tour, so no refund applies.',
    )
    if (!ok) return
    setState('busy')
    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token }),
        signal: AbortSignal.timeout(12_000),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error()
      setState('done')
      setMsg(data.refunded ? 'Cancelled — your refund is on its way.' : 'Your booking is cancelled.')
    } catch {
      setState('error')
      setMsg('Could not cancel — please reply to your booking email and we’ll help.')
    }
  }

  if (state === 'done') return <p className="text-sm font-medium text-green-700">{msg}</p>
  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={cancel} disabled={state === 'busy'}>
        {state === 'busy' ? 'Cancelling…' : 'Cancel booking'}
      </Button>
      {state === 'error' && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  )
}
