/**
 * Next.js instrumentation hook — runs once per server process on boot.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This is the canonical boot point for validateEnv() because:
 *  - App Router guarantees it runs server-side, exactly once, before any request.
 *  - No risk of double-execution from module hot-reload importing lib/config.ts.
 *  - Zero client-bundle footprint (never shipped to the browser).
 */
import { validateEnv } from './lib/validate-env'

export async function register() {
  validateEnv()
}
