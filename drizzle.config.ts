/**
 * drizzle-kit configuration — used by `pnpm drizzle-kit generate` to produce
 * SQL migrations in `drizzle/` from the schema in lib/db/schema.ts.
 *
 * No runtime impact: this file is only read by the CLI tool. Keeping it at the
 * repo root matches the drizzle-kit docs default discovery path so contributors
 * don't have to pass `--config`.
 *
 * DATABASE_URL is consumed at migration-apply time (drizzle-kit push / migrate).
 * The same fail-quiet contract from lib/db/client.ts does NOT apply here —
 * running migrations without a configured URL should be a loud error, not a
 * silent no-op.
 */
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle/',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  // Verbose / strict default to false; flip to true locally when debugging
  // unexpected diff output.
  verbose: false,
  strict: false,
} satisfies Config
