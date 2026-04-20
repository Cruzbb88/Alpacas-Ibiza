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
