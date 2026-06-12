// Shared abort-controller-based fetch wrapper with timeout.
// Replaces inline duplicates in api/availability, api/owner-digest, lib/turnstile.
export async function fetchWithTimeout(
    url: string,
    init: RequestInit = {},
    ms = 5000,
): Promise<Response> {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    try {
        return await fetch(url, { ...init, signal: ctrl.signal })
    } finally {
        clearTimeout(t)
    }
}

/**
 * Race a promise against a millisecond timeout.
 * Resolves to `null` on timeout or rejection; always clears the timer.
 * Each call gets its own independent timer so parallel races don't share state.
 *
 * Used by: api/social-proof/route.ts, components/social-proof-strip.tsx
 */
export function raceWithTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
    return new Promise(resolve => {
        const timer = setTimeout(() => resolve(null), ms)
        p.then(
            v => { clearTimeout(timer); resolve(v) },
            () => { clearTimeout(timer); resolve(null) },
        )
    })
}
