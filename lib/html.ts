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
