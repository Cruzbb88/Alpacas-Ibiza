/**
 * GET /api/launch-readiness
 *
 * Auth: valid admin session OR ?token=<CRON_SECRET> for UptimeRobot monitoring.
 *
 * Pre-launch this may be hit before admin auth is set up — the token path
 * allows external monitors to probe readiness without a session cookie.
 *
 * Failsafe: 401 if no session AND no valid cron-token.
 * All checks are fail-quiet (broken check → skip, never throws).
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { safeEqual } from '@/lib/secrets'
import { runLaunchReadinessChecks } from '@/lib/launch-readiness/checks'

function verifyCronToken(token: string | null): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected || !token) return false
  return safeEqual(token, expected)
}

export async function GET(req: Request): Promise<Response> {
  const session = await getServerSession(auth)
  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!session && !verifyCronToken(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const report = await runLaunchReadinessChecks()

  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
