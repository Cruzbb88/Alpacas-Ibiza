'use client'

import { useState } from 'react'
import { TurnstileWidget } from '@/components/turnstile-widget'
import { HoneypotField } from '@/components/honeypot-field'
import { useFormDraft } from '@/lib/hooks/use-form-draft'

interface CommissionFormProps {
    labels: {
        name: string
        email: string
        description: string
        submit: string
        sending: string
        success: string
        error: string
    }
}

export function CommissionForm({ labels }: CommissionFormProps) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const { draft: form, patch, clear } = useFormDraft('commission', { name: '', email: '', description: '' })
    const [captchaToken, setCaptchaToken] = useState<string>('')
    const [honeypot, setHoneypot] = useState('')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        patch({ [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')
        try {
            const res = await fetch('/api/commission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, 'cf-turnstile-response': captchaToken, phone_extension: honeypot }),
            })
            if (res.ok) {
                setStatus('success')
                clear()
            } else {
                setStatus('error')
            }
        } catch {
            setStatus('error')
        }
    }

    if (status === 'success') {
        return (
            <div className="text-center rounded-lg border border-primary/30 bg-primary/5 p-8">
                <div className="text-4xl mb-3">✨</div>
                <p className="font-semibold text-foreground">{labels.success}</p>
            </div>
        )
    }

    return (
        <form className="space-y-6" onSubmit={handleSubmit}>
            <HoneypotField name="phone_extension" value={honeypot} onChange={setHoneypot} />
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">{labels.name}</label>
                <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">{labels.email}</label>
                <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">{labels.description}</label>
                <textarea
                    name="description"
                    rows={6}
                    required
                    value={form.description}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <TurnstileWidget onToken={setCaptchaToken} className="pt-2" />
            {status === 'error' && (
                <p className="text-sm text-red-600">{labels.error}</p>
            )}
            <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full px-6 py-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-medium transition-colors disabled:opacity-60"
            >
                {status === 'loading' ? labels.sending : labels.submit}
            </button>
        </form>
    )
}
