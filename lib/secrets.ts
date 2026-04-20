import { createHash, timingSafeEqual } from 'crypto'

// Constant-time string comparison for secrets / tokens.
// Uses SHA-256 hashes of both sides so length difference never leaks via
// timingSafeEqual's same-length requirement.
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b) return false
    const ha = createHash('sha256').update(a).digest()
    const hb = createHash('sha256').update(b).digest()
    return timingSafeEqual(ha, hb)
}
