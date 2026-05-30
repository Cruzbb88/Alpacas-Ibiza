// HTML-entity escape for user-controlled values interpolated into email HTML
// templates. Prevents XSS when webhook senders or form submitters inject tags.
const ENT: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
}

export function escapeHtml(value: unknown): string {
    if (value === null || value === undefined) return ''
    const s = String(value)
    return s.replace(/[&<>"'/]/g, (c) => ENT[c])
}

/**
 * CRLF strip for email header fields (Subject, From, Reply-To). Prevents
 * SMTP header injection (e.g. `name\r\nBcc: attacker@evil.com`).
 *
 * Also truncates at 200 chars — RFC 5322 limits header line length but
 * libraries differ; 200 is conservative and well under any limit.
 */
export function sanitizeHeader(value: unknown): string {
    if (value === null || value === undefined) return ''
    return String(value)
        .replace(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, 200)
}

/**
 * Sanitise a name or other free-form user string for display.
 * - Strips HTML tags
 * - Strips control characters (incl. CR/LF, tab)
 * - Trims whitespace
 * - Caps at maxLen (default 80)
 *
 * Returns `null` when input is null/undefined OR collapses to empty after sanitisation.
 *
 * Used at every boundary where untrusted user-supplied names reach a rendered
 * surface (PDF certificate, Open Graph image, post-payment confirmation page).
 */
export function sanitiseDisplayName(
    raw: string | null | undefined,
    maxLen: number = 80,
): string | null {
    if (raw == null) return null
    const stripped = raw
        .replace(/<[^>]*>/g, '')
        .replace(/[\r\n\t\x00-\x1F]+/g, ' ')
        .trim()
    if (!stripped) return null
    return stripped.slice(0, maxLen)
}
