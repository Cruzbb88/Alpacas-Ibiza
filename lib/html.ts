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
