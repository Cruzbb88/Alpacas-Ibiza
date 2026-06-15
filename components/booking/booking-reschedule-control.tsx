'use client'

/**
 * Self-service reschedule control on the guest manage page (spec-011 §J). Pick an
 * alternative OPEN slot → POST to /api/booking/reschedule (token-gated). The
 * server does the atomic capacity move + no-upcharge policy; this just drives it.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export interface RescheduleOption {
  id: string
  label: string
}

export function BookingRescheduleControl({
  id, token, options,
}: { id: string; token: string; options: RescheduleOption[] }) {
  const [choice, setChoice] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  if (options.length === 0) return null

  const submit = async () => {
    if (!choice) return
    setState('busy')
    setMsg('')
    try {
      const res = await fetch('/api/booking/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token, newSlotId: choice }),
        signal: AbortSignal.timeout(12_000),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not reschedule.')
      setState('done')
      setMsg('Done — your booking has moved. Check your email for the new details.')
    } catch (e) {
      setState('error')
      setMsg(e instanceof Error ? e.message : 'Could not reschedule.')
    }
  }

  if (state === 'done') return <p className="text-sm font-medium text-green-700">{msg}</p>

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Choose a new date…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <Button variant="outline" onClick={submit} disabled={state === 'busy' || !choice}>
          {state === 'busy' ? 'Moving…' : 'Reschedule'}
        </Button>
      </div>
      {state === 'error' && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  )
}
