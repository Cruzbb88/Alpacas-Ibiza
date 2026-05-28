/**
 * Shared dynamic-import loader for the `stripe` SDK.
 *
 * `stripe` is a real dependency in package.json. The dynamic import + fallback
 * pattern is retained because:
 *   - Bundlers (Turbopack/webpack) can mark it as runtime-only via the
 *     `webpackIgnore` / `turbopackIgnore` magic comments → keeps the SDK out
 *     of edge-runtime bundles where it's unsupported.
 *   - If a future deploy omits the package, the catch-block returns null so
 *     routes can fail-closed instead of crashing the whole function.
 *
 * Real Stripe type imported as `type` only so the runtime resolution still
 * works. Previous `type StripeFactory = (key) => any` hid SDK shape bugs in
 * downstream code (see code-review 2026-05-28).
 */

import type Stripe from 'stripe'

// The Stripe SDK's runtime export is a callable constructor: `Stripe(key, opts)`
// returns a Stripe instance. The default `import type Stripe` brings the
// constructor type itself. We treat `Stripe` (the type) AS the instance type
// because Stripe's typings overload the default export so that calling it
// returns `Stripe`. Config is left as a loose record to match the constructor's
// runtime signature without coupling to a private interface.
type StripeFactory = (key: string, opts?: Record<string, unknown>) => Stripe

let _stripeFactory: StripeFactory | null | undefined = undefined

export async function importStripe(): Promise<StripeFactory | null> {
    if (_stripeFactory !== undefined) return _stripeFactory
    try {
        const mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'stripe')
        const Ctor = (mod.default ?? mod) as unknown as new (key: string, opts?: Record<string, unknown>) => Stripe
        _stripeFactory = (key: string, opts?: Record<string, unknown>) => new Ctor(key, opts)
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
