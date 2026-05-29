/**
 * Re-export of the schema for `drizzle-kit generate` to consume.
 *
 * drizzle-kit reads its `schema` config path and expects all pgTable definitions
 * to be exported from a single module. We keep the canonical definitions in
 * ./schema.ts and forward them here so the drizzle.config.ts at the repo root
 * can point at this file (matches the drizzle-kit docs recipe).
 *
 * Application code should still import from ./schema.ts directly — this file
 * is for the migration generator only.
 */
export * from './schema.ts'
