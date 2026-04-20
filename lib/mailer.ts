import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const DEFAULT_TO = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'
const FROM_EMAIL = `Alpacas Ibiza Website <noreply@alpacasibiza.com>`

export interface SendEmailOptions {
    subject: string
    html: string
    to?: string
    replyTo?: string
    /**
     * Optional ISO 8601 timestamp (e.g. "2026-05-12T09:30:00Z") OR Resend
     * natural-language form (e.g. "in 48 hours") to defer send until later.
     * Max ~30 days ahead per Resend docs.
     */
    scheduledAt?: string
}

/**
 * Send an email via Resend. Returns the resulting email ID (needed if the
 * caller later wants to cancel a scheduled send).
 */
export async function sendEmail({
    subject,
    html,
    to = DEFAULT_TO,
    replyTo,
    scheduledAt,
}: SendEmailOptions): Promise<{ id: string | null }> {
    const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        replyTo,
        ...(scheduledAt ? { scheduledAt } : {}),
    })

    if (error) {
        throw new Error(error.message || 'Unknown email error')
    }

    return { id: data?.id ?? null }
}

/**
 * Cancel a previously scheduled Resend email by its ID.
 * Safe to call on already-sent emails — Resend no-ops.
 */
export async function cancelScheduledEmail(id: string): Promise<boolean> {
    try {
        await resend.emails.cancel(id)
        return true
    } catch (err) {
        console.warn('[mailer] cancel scheduled email failed:', (err as Error).message)
        return false
    }
}
