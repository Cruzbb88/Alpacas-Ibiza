/**
 * Drizzle DB client — singleton, lazy, fail-quiet on missing DATABASE_URL.
 *
 * Activation contract:
 *   - DATABASE_URL set    → returns a Drizzle client bound to postgres-js.
 *                           Singleton pinned via globalThis so HMR / repeated
 *                           imports don't open new pools (same pattern as
 *                           lib/booking-schedule-store.ts).
 *   - DATABASE_URL unset  → returns null. Callers MUST check for null and
 *                           no-op. The whole point of this layer is that the
 *                           existing Mollie-iteration code paths stay working
 *                           until Cruz provisions a real Postgres.
 *
 * Driver choice: drizzle-orm/postgres-js + postgres (porsager/postgres). The
 * lightweight one — no native bindings, edge-runtime friendly, ~80kB. Avoids
 * node-postgres (`pg`) because it pulls in libpq buffers we don't need for the
 * row volumes Adopt-a-Paca will see this decade.
 *
 * Connection pool sized at max=1 because:
 *   - Vercel Functions run per-request; concurrent fan-out happens by spawning
 *     more lambdas, not by pooling within one.
 *   - Neon's pooled connection mode handles the real fan-out upstream.
 *   - A larger pool inside a serverless function just wastes file descriptors.
 *
 * If a future cron job / batch script needs higher local concurrency, take a
 * separate client via `postgres(url, { max: N })` — don't bloat this one.
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.ts'

export type DbClient = ReturnType<typeof drizzle<typeof schema>>

interface CachedDb {
  client: DbClient
  url: string
}

// Singleton — global so HMR / dynamic imports don't open extra pools.
const globalForDb = globalThis as unknown as {
  __alpacaDbClient?: CachedDb
}

/**
 * Returns a Drizzle client bound to DATABASE_URL, or null when unset.
 *
 * Fail-quiet on construction errors: if the postgres / drizzle constructor
 * throws (malformed URL, bad SSL config, …) we log via console.error and
 * return null so the calling webhook still returns 200 to Mollie/Stripe. The
 * webhook handler's existing in-memory + Mollie-iteration path remains the
 * source of truth until the DB is fixed.
 *
 * The cached client is keyed by URL so a dev who edits .env.local and HMRs
 * doesn't keep talking to the previous database.
 */
export function getDb(): DbClient | null {
  const url = process.env.DATABASE_URL
  if (!url) return null

  const cached = globalForDb.__alpacaDbClient
  if (cached && cached.url === url) return cached.client

  try {
    // max=1 per note above. prepare=false because Neon's pooled connections
    // (`?pgbouncer=true`) don't support prepared statements and we'd rather
    // pay the parse cost than blow up on a misconfigured connection string.
    const sql = postgres(url, { max: 1, prepare: false })
    const client = drizzle(sql, { schema })
    globalForDb.__alpacaDbClient = { client, url }
    return client
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[db/client] Failed to construct Drizzle client; DB layer disabled.', { message })
    return null
  }
}

/**
 * @internal — for tests. Drops the cached client so a new DATABASE_URL takes
 * effect on the next getDb() call within the same process.
 */
export function __resetDbClientForTests(): void {
  if (globalForDb.__alpacaDbClient) {
    // Best-effort close. postgres-js exposes `.end()` on the underlying sql tag
    // via the drizzle session; reaching it cleanly is more trouble than it's
    // worth in tests — let the process exit reclaim the socket.
    globalForDb.__alpacaDbClient = undefined
  }
}
