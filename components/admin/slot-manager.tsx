'use client'

/**
 * Admin slot manager (spec-011 §F) — the tool the owner uses to enter their tour
 * times/capacity/prices. No data is invented; everything shown is what the owner
 * typed. Talks to /api/admin/slots (GET list / POST create / PATCH open-close).
 */
import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Slot {
  id: string
  tourSlug: string
  startsAt: string
  durationMin: number
  capacity: number
  bookedCount: number
  priceEurMinor: number
  status: string
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/Madrid',
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

export function SlotManager() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [tourSlug, setTourSlug] = useState('alpaca-tour')
  const [startsAt, setStartsAt] = useState('')
  const [durationMin, setDurationMin] = useState('60')
  const [capacity, setCapacity] = useState('10')
  const [priceEur, setPriceEur] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/slots', { signal: AbortSignal.timeout(12_000) })
      if (!res.ok) throw new Error(`List failed (${res.status})`)
      const data = await res.json()
      setSlots(data.slots ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load slots')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourSlug, startsAt, durationMin, capacity, priceEur }),
        signal: AbortSignal.timeout(12_000),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Create failed (${res.status})`)
      setStartsAt(''); setPriceEur('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (slot: Slot) => {
    const next = slot.status === 'open' ? 'closed' : 'open'
    try {
      const res = await fetch('/api/admin/slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: slot.id, status: next }),
        signal: AbortSignal.timeout(12_000),
      })
      if (!res.ok) throw new Error(`Update failed (${res.status})`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    }
  }

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Add a tour slot</h2>
        <form onSubmit={create} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="tourSlug">Tour</Label>
            <Input id="tourSlug" value={tourSlug} onChange={(e) => setTourSlug(e.target.value)} placeholder="alpaca-tour" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="startsAt">Date &amp; time (Ibiza local)</Label>
            <Input id="startsAt" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="durationMin">Duration (min)</Label>
            <Input id="durationMin" type="number" min="1" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="priceEur">Price / guest (€)</Label>
            <Input id="priceEur" type="number" min="0" step="0.01" value={priceEur} onChange={(e) => setPriceEur(e.target.value)} placeholder="21.19" required />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full">{saving ? 'Saving…' : 'Add slot'}</Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          The <code>datetime-local</code> value is the wall-clock time guests see (Europe/Madrid).
        </p>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Slots</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No slots yet. Add one above. (If this stays empty after adding, the booking engine isn&apos;t
            active — set <code>DATABASE_URL</code> and <code>BOOKING_ENGINE=inhouse</code>.)
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Tour</th>
                  <th className="py-2 pr-4">Seats</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{fmt(s.startsAt)}</td>
                    <td className="py-2 pr-4">{s.tourSlug}</td>
                    <td className="py-2 pr-4">{Math.max(0, s.capacity - s.bookedCount)} / {s.capacity}</td>
                    <td className="py-2 pr-4">€{(s.priceEurMinor / 100).toFixed(2)}</td>
                    <td className="py-2 pr-4">
                      <span className={s.status === 'open' ? 'text-green-600' : 'text-muted-foreground'}>{s.status}</span>
                    </td>
                    <td className="py-2">
                      <Button variant="outline" size="sm" onClick={() => toggle(s)}>
                        {s.status === 'open' ? 'Close' : 'Reopen'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
