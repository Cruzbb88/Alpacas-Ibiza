import { NextResponse } from 'next/server'
import { isSet, TIER1_KEYS } from '@/lib/validate-env'

/**
 * GET /api/health
 *
 * Liveness check for external monitors (UptimeRobot, Better Uptime).
 * Returns 200 when all Tier 1 env vars are set; 503 if any are missing.
 * Never cached — monitors need a fresh read every poll.
 *
 * No auth required — this is a public status endpoint.
 */
export async function GET() {
    const version = process.env.npm_package_version ?? 'unknown'
    const env = process.env.NODE_ENV === 'production' ? 'production' : 'development'

    const missingTier1 = TIER1_KEYS.filter((key) => !isSet(key))
    const healthy = missingTier1.length === 0

    const body = {
        status: healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        version,
        env,
        ...(healthy ? {} : { missing: missingTier1 }),
    }

    return NextResponse.json(body, {
        status: healthy ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' },
    })
}
