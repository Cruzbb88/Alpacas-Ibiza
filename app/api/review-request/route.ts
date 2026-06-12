/**
 * POST /api/review-request
 *
 * Manual / fallback path for the 24h post-tour review-request email. Primary
 * flow is /api/fareharbor-webhook which schedules via Resend scheduledAt.
 *
 * Thin shim — delegates to lib/handlers/tour-email-handler.ts.
 * Webhook secret: REVIEW_REQUEST_WEBHOOK_SECRET (fail-open).
 */
import { handleTourEmail } from '@/lib/handlers/tour-email-handler'

export const POST = (request: Request) => handleTourEmail(request, 'review-request')
