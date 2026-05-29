/**
 * Dead-man's switch heartbeat for cron routes.
 *
 * When a cron stops firing (Vercel quota exhausted, env var rotated, plan
 * downgrade) the silence is itself a failure mode — owner notices weeks late
 * when no Monday digest arrives. The fix is an external watchdog (Healthchecks.io
 * free tier, 20 checks) that expects a ping at a fixed cadence and alerts
 * when the ping doesn't arrive.
 *
 * Pattern: every cron route's last action calls `pingHeartbeat('owner-mrr-digest')`
 * before returning. The fetch is fire-and-forget (no await) — a failed ping
 * MUST NOT propagate into the route's response. If the env var is unset, the
 * helper is a no-op so dev/staging never accidentally pings the prod check.
 *
 * Env vars (each independent, all optional):
 *   HEARTBEAT_OWNER_DIGEST_URL       — owner-digest cron (Mon 09:00 UTC)
 *   HEARTBEAT_OWNER_MRR_DIGEST_URL   — owner-mrr-digest cron (Mon 06:00 UTC)
 *
 * Example Healthchecks.io URL: https://hc-ping.com/<uuid>
 */

const HEARTBEAT_TIMEOUT_MS = 2000

/** Map heartbeat name → env-var key. Add a row when adding a new cron. */
const HEARTBEAT_ENV_KEYS: Record<string, string> = {
  'owner-digest': 'HEARTBEAT_OWNER_DIGEST_URL',
  'owner-mrr-digest': 'HEARTBEAT_OWNER_MRR_DIGEST_URL',
  'adopt-quarterly-update': 'HEARTBEAT_ADOPT_QUARTERLY_UPDATE_URL',
}

/**
 * Fire-and-forget GET to the configured heartbeat URL.
 *
 * Returns immediately; the fetch runs in the background. Callers should NOT
 * await this — the cron handler's response path stays fast and the heartbeat
 * is best-effort. Errors are swallowed so a transient watchdog outage cannot
 * become a cron failure.
 *
 * Pattern at call sites:
 *   pingHeartbeat('owner-mrr-digest')
 *   return NextResponse.json({ sent: true })
 */
export function pingHeartbeat(name: keyof typeof HEARTBEAT_ENV_KEYS | string): void {
  const envKey = HEARTBEAT_ENV_KEYS[name]
  if (!envKey) return
  const url = process.env[envKey]
  if (!url) return

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), HEARTBEAT_TIMEOUT_MS)
  // Intentionally not awaited. .catch swallows any error including the
  // AbortError from the timeout. Without the catch chain, an unhandled
  // rejection would propagate.
  fetch(url, { method: 'GET', signal: ctrl.signal })
    .finally(() => clearTimeout(t))
    .catch(() => {
      // Heartbeat is best-effort; never let it crash the cron handler.
    })
}
