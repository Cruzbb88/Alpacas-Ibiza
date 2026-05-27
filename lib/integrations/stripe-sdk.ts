/**
 * Shared dynamic-import loader for the `stripe` SDK.
 *
 * The `stripe` package is intentionally NOT in package.json dependencies —
 * owner installs it on deploy (matches the Mollie pattern). Until installed,
 * `importStripe()` returns `null` so callers can fail-closed gracefully.
 *
 * Module-level cache means the dynamic import is resolved exactly once per
 * process lifetime; subsequent calls return the cached factory.
 *
 * Previously this function was duplicated verbatim in 3 route files + 1 lib file.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StripeFactory = (key: string, opts?: object) => any

// sentinel: undefined = not yet attempted; null = attempted but module missing
let _stripeFactory: StripeFactory | null | undefined = undefined

export async function importStripe(): Promise<StripeFactory | null> {
    if (_stripeFactory !== undefined) return _stripeFactory
    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore — stripe SDK intentionally absent until owner installs it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'stripe')
        const Ctor = mod.default ?? mod
        _stripeFactory = (key: string, opts?: object) => new Ctor(key, opts)
        return _stripeFactory
    } catch {
        _stripeFactory = null
        return null
    }
}

/** Reset the cache. @internal — for tests only. */
export function __resetStripeImportCache(): void {
    _stripeFactory = undefined
}
