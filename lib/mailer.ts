import { Resend } from 'resend'
import { isSuppressed, getSuppression } from './email-suppression.ts'

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
    /**
     * Optional unsubscribe URL. When provided, adds RFC 8058 headers:
     *   List-Unsubscribe: <url>, <mailto:...>
     *   List-Unsubscribe-Post: List-Unsubscribe=One-Click
     *
     * Required by CAN-SPAM § 5(a)(3) and EU PECR for bulk/newsletter emails.
     * Resend supports arbitrary headers via the `headers` field in the send payload.
     */
    listUnsubscribeUrl?: string
    /**
     * Optional file attachments. Each item maps to a Resend attachment object.
     * `content` must be a base64-encoded string of the file data.
     * `contentType` defaults to application/octet-stream if omitted.
     */
    attachments?: Array<{ filename: string; content: string; contentType?: string }>
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
    listUnsubscribeUrl,
    attachments,
}: SendEmailOptions): Promise<{ id: string | null }> {
    // Suppression gate — protect sender reputation. /api/resend-webhook adds
    // bounced + complained addresses to the in-memory suppression store;
    // every subsequent send to that address is skipped here BEFORE the
    // Resend API call so we don't rack up bounce count + cost.
    // The owner CONTACT_EMAIL fallback is never suppressed (admin notifications
    // must always go through; the owner can unsuppress their own address via
    // a future admin page if it ever lands in the store).
    if (to !== DEFAULT_TO && isSuppressed(to)) {
        const entry = getSuppression(to)
        console.warn(`[mailer] skipping send to suppressed address: reason=${entry?.reason ?? 'unknown'}, subject="${subject}"`)
        return { id: null }
    }

    // Build List-Unsubscribe headers when a per-recipient URL is supplied.
    // Resend accepts `headers: Record<string, string>` on the email payload.
    const listUnsubscribeHeaders: Record<string, string> = listUnsubscribeUrl
        ? {
            'List-Unsubscribe': `<${listUnsubscribeUrl}>, <mailto:unsubscribe@alpacasibiza.com>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
        : {}

    // Map attachments to Resend's shape: { filename, content (base64), content_type }
    const resendAttachments = attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        content_type: a.contentType ?? 'application/octet-stream',
    }))

    const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
        replyTo,
        ...(scheduledAt ? { scheduledAt } : {}),
        ...(Object.keys(listUnsubscribeHeaders).length > 0 ? { headers: listUnsubscribeHeaders } : {}),
        ...(resendAttachments && resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
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
