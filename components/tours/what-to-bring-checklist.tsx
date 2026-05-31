'use client'

/**
 * WhatToBringChecklist — interactive pre-visit packing list for /tours.
 *
 * Items are derived directly from the reminder email template
 * (lib/email-templates.ts reminderEmailHtml "Before you arrive" list).
 *
 * State persisted in localStorage under key `alpacas-checklist-v1` so checks
 * survive page reloads and return visits.
 *
 * Share footer uses navigator.share() with a graceful null-guard when the
 * API is unavailable (desktop browsers, old Safari).
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'

// ── Types ───────────────────────────────────────────────────────────────────

type ItemKey =
  | 'closedShoes'
  | 'sunHat'
  | 'sunscreen'
  | 'water'
  | 'camera'
  | 'layeredClothing'
  | 'allergyNotes'
  | 'validId'

const ITEM_KEYS: ItemKey[] = [
  'closedShoes',
  'sunHat',
  'sunscreen',
  'water',
  'camera',
  'layeredClothing',
  'allergyNotes',
  'validId',
]

type CheckedState = Partial<Record<ItemKey, boolean>>

const STORAGE_KEY = 'alpacas-checklist-v1'

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadChecked(): CheckedState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as CheckedState
  } catch {
    return {}
  }
}

function saveChecked(state: CheckedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage may be blocked (private browsing, quota, etc.) — silent.
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function WhatToBringChecklist() {
  const tr = useTranslations()

  // Initialise from localStorage after mount (avoids SSR/hydration mismatch).
  const [checked, setChecked] = useState<CheckedState>({})
  const [mounted, setMounted] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setChecked(loadChecked())
    setMounted(true)
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  const toggle = useCallback((key: ItemKey) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      saveChecked(next)
      return next
    })
  }, [])

  const handleShare = useCallback(() => {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return
    navigator
      .share({
        title: tr('tours.checklist.shareTitle'),
        text: tr('tours.checklist.shareText'),
        url: typeof window !== 'undefined' ? window.location.href : 'https://alpacasibiza.com/tours',
      })
      .catch(() => {
        // User cancelled or share failed — silent.
      })
  }, [tr])

  const checkedCount = ITEM_KEYS.filter((k) => checked[k]).length

  return (
    <section
      aria-label={tr('tours.checklist.title')}
      className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm"
    >
      <h2 className="text-2xl font-bold text-foreground mb-1">
        {tr('tours.checklist.title')}
      </h2>
      {mounted && (
        <p className="text-sm text-foreground/60 mb-5" aria-live="polite">
          {checkedCount}/{ITEM_KEYS.length} packed
        </p>
      )}

      <ul className="space-y-3">
        {ITEM_KEYS.map((key) => {
          const id = `checklist-${key}`
          const label = tr(`tours.checklist.items.${key}` as Parameters<typeof tr>[0])
          const isChecked = mounted ? Boolean(checked[key]) : false

          return (
            <li key={key} className="flex items-start gap-3">
              <input
                id={id}
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(key)}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-border accent-primary focus:ring-2 focus:ring-primary/50"
                aria-label={label}
              />
              <label
                htmlFor={id}
                className={`cursor-pointer text-sm leading-relaxed transition-colors ${
                  isChecked ? 'text-foreground/40 line-through' : 'text-foreground/80'
                }`}
              >
                {label}
              </label>
            </li>
          )
        })}
      </ul>

      {canShare && (
        <div className="mt-6 pt-5 border-t border-border/50 flex justify-end">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M13 8a3 3 0 1 0-2.83-2H7.83A3.001 3.001 0 0 0 5 4a3 3 0 1 0 2.83 4H10.17A3.001 3.001 0 0 0 13 10a3 3 0 0 0 2.83-4H13zM5 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm8-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-3 7a3 3 0 1 0-2.83 2H5a3 3 0 1 0 2.83-2H7.17A3.001 3.001 0 0 0 10 14a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
            </svg>
            {tr('tours.checklist.shareButton')}
          </button>
        </div>
      )}
    </section>
  )
}
