/**
 * /healthz — public uptime-monitor endpoint.
 *
 * No auth. No rate-limit. No DB queries.
 * Returns 200 as long as Node is running.
 *
 * Wire into UptimeRobot / BetterStack / similar as an HTTP monitor.
 * Expected response: { ok: true, ... }
 */
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      build_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      env_tier1_ready: Boolean(
        process.env.NEXTAUTH_SECRET &&
        process.env.NEXTAUTH_URL &&
        process.env.CONTACT_EMAIL &&
        process.env.ADMIN_USERNAME &&
        process.env.ADMIN_PASSWORD &&
        process.env.RESEND_API_KEY &&
        process.env.FAREHARBOR_WEBHOOK_SECRET &&
        process.env.CRON_SECRET
      ),
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
