'use client'
import { useEffect, useState, useCallback } from 'react'

const DRAFT_PREFIX = 'ai_draft_v1:'
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000  // 7 days — auto-expire

interface DraftEnvelope<T> {
  readonly savedAt: number
  readonly data: T
}

/**
 * Persist a form's fields to localStorage so navigating away + returning
 * doesn't lose typed content. GDPR-safe: localStorage with key prefix
 * 'ai_draft_v1:' is functional-storage (always allowed under Consent Mode v2
 * `functionality_storage: 'granted'`).
 *
 * Drafts auto-expire after 7 days. Clear-on-submit is the caller's
 * responsibility — call `clear()` from the form's onSuccess.
 *
 * Failsafe: localStorage access can throw in Safari private mode / quota
 * exceeded — every helper try/catches and silently falls back to no-op.
 */
export function useFormDraft<T extends Record<string, unknown>>(
  key: string,
  initial: T,
): {
  draft: T
  setDraft: (next: T) => void
  patch: (partial: Partial<T>) => void
  clear: () => void
} {
  const storageKey = DRAFT_PREFIX + key
  const [draft, setDraftState] = useState<T>(initial)

  // On mount, hydrate from localStorage if a fresh draft exists.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const env = JSON.parse(raw) as DraftEnvelope<T>
      if (!env?.savedAt || Date.now() - env.savedAt > MAX_DRAFT_AGE_MS) {
        window.localStorage.removeItem(storageKey)
        return
      }
      if (env.data && typeof env.data === 'object') {
        setDraftState({ ...initial, ...env.data })
      }
    } catch {
      // localStorage unavailable / quota exceeded / malformed JSON — silent no-op.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  const setDraft = useCallback((next: T) => {
    setDraftState(next)
    try {
      const envelope: DraftEnvelope<T> = { savedAt: Date.now(), data: next }
      window.localStorage.setItem(storageKey, JSON.stringify(envelope))
    } catch {
      /* silent */
    }
  }, [storageKey])

  const patch = useCallback((partial: Partial<T>) => {
    setDraftState((prev) => {
      const next = { ...prev, ...partial }
      try {
        const envelope: DraftEnvelope<T> = { savedAt: Date.now(), data: next }
        window.localStorage.setItem(storageKey, JSON.stringify(envelope))
      } catch {
        /* silent */
      }
      return next
    })
  }, [storageKey])

  const clear = useCallback(() => {
    setDraftState(initial)
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      /* silent */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  return { draft, setDraft, patch, clear }
}
