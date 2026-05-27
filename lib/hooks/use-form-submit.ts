'use client'

import { useState } from 'react'

export type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseFormSubmitOptions<TBody> {
    /** Where to POST. e.g. '/api/contact' */
    endpoint: string
    /** Build the body to POST from current form state. Called at submit time with no args. */
    buildBody: () => TBody
    /** Called after success, before status flips. Use for trackConversion + form reset. */
    onSuccess?: (response: unknown) => void
    /** Called after error, before status flips. Use for trackConversion('form_error'). */
    onError?: (error: unknown) => void
}

export interface UseFormSubmitReturn {
    readonly status: SubmitStatus
    readonly error: string | null
    /** Pass this to <form onSubmit={...}>. Handles preventDefault internally. */
    submit: (e: React.FormEvent) => Promise<void>
    /** Reset to idle (e.g. after error → user types). */
    reset: () => void
}

export function useFormSubmit<TBody>(
    opts: UseFormSubmitOptions<TBody>
): UseFormSubmitReturn {
    const [status, setStatus] = useState<SubmitStatus>('idle')
    const [error, setError] = useState<string | null>(null)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')
        setError(null)
        try {
            const res = await fetch(opts.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(opts.buildBody()),
            })
            if (res.ok) {
                const json = await res.json().catch(() => null)
                opts.onSuccess?.(json)
                setStatus('success')
            } else {
                const body = await res.json().catch(() => null)
                const message = body?.error ?? 'Request failed'
                setError(message)
                opts.onError?.(message)
                setStatus('error')
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Request failed'
            setError(message)
            opts.onError?.(err)
            setStatus('error')
        }
    }

    const reset = () => {
        setStatus('idle')
        setError(null)
    }

    return { status, error, submit, reset }
}
