'use client'

import { useState } from 'react'
import { TurnstileWidget } from '@/components/turnstile-widget'

interface ContactFormProps {
    labels: {
        name: string
        email: string
        subject: string
        message: string
        send: string
        sending: string
        success: string
        error: string
    }
}

export function ContactForm({ labels }: ContactFormProps) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
    const [captchaToken, setCaptchaToken] = useState<string>('')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, 'cf-turnstile-response': captchaToken }),
            })
            if (res.ok) {
                setStatus('success')
                setForm({ name: '', email: '', subject: '', message: '' })
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
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-foreground">{labels.success}</p>
            </div>
        )
    }

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">{labels.name}</label>
                <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">{labels.subject}</label>
                <input
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">{labels.message}</label>
                <textarea
                    name="message"
                    rows={5}
                    required
                    value={form.message}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                {status === 'loading' ? labels.sending : labels.send}
            </button>
        </form>
    )
}
