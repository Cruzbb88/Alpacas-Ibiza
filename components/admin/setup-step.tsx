'use client'

/**
 * SetupStep — reusable card for /admin/setup wizard.
 *
 * Server-rendered (static props), but contains a "Verify" button which
 * is a client interaction. The whole component is 'use client' to support
 * the inline verify UX. Pages that use it are server components that import
 * it as a leaf.
 */

import { useState } from 'react'

export type StepStatus = 'set' | 'unset' | 'invalid'

export interface SetupStepProps {
  number: number
  headline: string
  status: StepStatus
  whatItDoes: string
  howToGet: React.ReactNode
  whereToPaste: React.ReactNode
  verifyCheck?: string     // ?check= value to POST to /api/setup-probe
  verifyLabel?: string
}

function StatusBadge({ status }: { status: StepStatus }) {
  const styles: Record<StepStatus, { bg: string; text: string; label: string; icon: string }> = {
    set:     { bg: 'bg-green-100',  text: 'text-green-800',  label: 'SET',     icon: '✅' },
    unset:   { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'UNSET',   icon: '⚪' },
    invalid: { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'INVALID', icon: '⚠️' },
  }
  const s = styles[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  )
}

type VerifyResult = { ok: boolean; detail?: string; code?: string }

function VerifyButton({ check, label }: { check: string; label: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [result, setResult] = useState<VerifyResult | null>(null)

  async function run() {
    setState('loading')
    try {
      const res = await fetch(`/api/setup-probe?check=${encodeURIComponent(check)}`)
      const json = await res.json() as VerifyResult
      setResult(json)
    } catch {
      setResult({ ok: false, code: 'NETWORK_ERROR' })
    } finally {
      setState('done')
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3 flex-wrap">
      <button
        onClick={run}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {state === 'loading' ? (
          <>
            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Checking…
          </>
        ) : label}
      </button>

      {state === 'done' && result && (
        <span
          className={`text-xs font-medium ${result.ok ? 'text-green-700' : 'text-red-700'}`}
          role="status"
          aria-live="polite"
        >
          {result.ok
            ? `✅ OK${result.detail ? ` — ${result.detail}` : ''}`
            : `❌ Failed${result.code ? ` (${result.code})` : ''}${result.detail ? ` — ${result.detail}` : ''}`}
        </span>
      )}
    </div>
  )
}

export function SetupStep({
  number,
  headline,
  status,
  whatItDoes,
  howToGet,
  whereToPaste,
  verifyCheck,
  verifyLabel = 'Verify',
}: SetupStepProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
            aria-label={`Step ${number}`}
          >
            {number}
          </span>
          <h2 className="text-base font-semibold text-foreground">{headline}</h2>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-2 pl-10">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What this does</span>
          <p className="mt-0.5 text-sm text-foreground/80">{whatItDoes}</p>
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to get it</span>
          <div className="mt-0.5 text-sm text-foreground/80">{howToGet}</div>
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where to paste</span>
          <div className="mt-0.5 text-sm text-foreground/80">{whereToPaste}</div>
        </div>

        {verifyCheck && (
          <VerifyButton check={verifyCheck} label={verifyLabel} />
        )}
      </div>
    </article>
  )
}
