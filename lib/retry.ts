export interface RetryOptions {
    attempts?: number
    baseDelayMs?: number
    /** Predicate: which errors are retryable. Default: any thrown error. */
    shouldRetry?: (err: unknown, attempt: number) => boolean
}

/**
 * Run `fn` with exponential backoff. Total wait roughly 250 + 500 + 1000 = 1.75s
 * over 3 attempts. Re-throws the last error if all attempts fail.
 *
 * Failsafe: NEVER swallows errors. The caller's existing try/catch still fires
 * — withRetry just multiplies attempts before letting the error propagate.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts?: RetryOptions): Promise<T> {
    const attempts = opts?.attempts ?? 3
    const baseDelayMs = opts?.baseDelayMs ?? 250
    const shouldRetry = opts?.shouldRetry ?? (() => true)

    let lastErr: unknown
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastErr = err
            if (attempt === attempts || !shouldRetry(err, attempt)) throw err
            const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), 30_000)
            console.warn(`[retry] attempt ${attempt}/${attempts} failed; retrying in ${delay}ms`, (err as Error)?.message)
            await new Promise(r => setTimeout(r, delay))
        }
    }
    throw lastErr
}
