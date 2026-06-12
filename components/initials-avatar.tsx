'use client'

/**
 * InitialsAvatar — deterministic colored avatar drawn from the project's
 * existing CSS palette tokens (`--chart-1` … `--chart-5`). Owner controls the
 * five colors via app/globals.css — this component just rotates through them.
 */

import { useMemo } from 'react'

/** Rotate through the 5 chart tokens already defined in globals.css. */
const TOKEN_COUNT = 5

/** Compute djb2 hash of a string, always returns a positive integer. */
function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
    h = h | 0
  }
  return Math.abs(h)
}

/** Pick a chart-token slot (1..5) deterministically from a name. */
function chartSlotFor(name: string): number {
  return (djb2(name) % TOKEN_COUNT) + 1
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const chars = words.map((w) => w[0].toUpperCase())
  return chars.slice(0, 2).join('')
}

export interface InitialsAvatarProps {
  name: string
  className?: string
  fontScale?: number
}

export function InitialsAvatar({
  name,
  className = '',
  fontScale = 0.4,
}: InitialsAvatarProps) {
  const { initials, slot } = useMemo(
    () => ({ initials: getInitials(name), slot: chartSlotFor(name) }),
    [name],
  )

  return (
    <div style={{ containerType: 'inline-size', width: '100%', height: '100%' }} className={className}>
      <div
        aria-hidden="true"
        className="flex items-center justify-center font-display font-bold text-primary-foreground select-none w-full h-full"
        style={{ backgroundColor: `hsl(var(--chart-${slot}))`, fontSize: `${fontScale * 100}cqw` }}
      >
        <span>{initials}</span>
      </div>
    </div>
  )
}
