/**
 * Standard email validator — requires @ + at least one dot + 2-char TLD.
 * Used by webhook routes + form validation. Mirrors the regex previously
 * duplicated across 3 files (consolidated 2026-05-27).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(value: unknown): value is string {
    return typeof value === 'string' && EMAIL_RE.test(value.trim())
}
