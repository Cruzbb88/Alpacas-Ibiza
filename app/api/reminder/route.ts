/**
 * POST /api/reminder
 *
 * Manual / fallback path for the 48h pre-tour reminder email. The primary flow
 * is /api/fareharbor-webhook which schedules the send via Resend scheduledAt.
 * This route is kept for:
 *  - owner-initiated tests
 *  - ad-hoc re-sends when a guest misses the original
 *  - integrations that can't speak to the webhook endpoint
 *
 * Thin shim — delegates to lib/handlers/tour-email-handler.ts.
 * Webhook secret: REMINDER_WEBHOOK_SECRET (fail-open).
 */
import { handleTourEmail } from '@/lib/handlers/tour-email-handler'

export const POST = (request: Request) => handleTourEmail(request, 'reminder')
