'use client'

import { useState } from 'react'

export type FormStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseFormSubmitOptions<TForm> {
    /** API endpoint to POST to */
    endpoint: string
    /** Build the JSON body from current form state + captcha token */
    buildBody: (formData: TForm, captchaToken: string) => unknown
    /** Called after a successful response (res.ok). Use for analytics, reset, etc. */
    onSuccess?: (formData: TForm) => void
}

export interface UseFormSubmitReturn<TForm> {
    status: FormStatus
    captchaToken: string
    setCaptchaToken: (token: string) => void
    submit: (formData: TForm) => Promise<void>
    reset: () => void
}

export function useFormSubmit<TForm>(
    opts: UseFormSubmitOptions<TForm>
): UseFormSubmitReturn<TForm> {
    const [status, setStatus] = useState<FormStatus>('idle')
    const [captchaToken, setCaptchaToken] = useState<string>('')

    const submit = async (formData: TForm) => {
        setStatus('loading')
        try {
            const res = await fetch(opts.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(opts.buildBody(formData, captchaToken)),
            })
            if (res.ok) {
                opts.onSuccess?.(formData)
                setStatus('success')
            } else {
                setStatus('error')
            }
        } catch {
            setStatus('error')
        }
    }

    const reset = () => {
        setStatus('idle')
        setCaptchaToken('')
    }

    return { status, captchaToken, setCaptchaToken, submit, reset }
}
