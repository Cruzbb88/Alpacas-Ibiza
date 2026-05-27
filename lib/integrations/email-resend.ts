/**
 * Resend EmailProvider adapter.
 *
 * Wraps lib/mailer.ts so it conforms to the EmailProvider interface.
 * Failsafe: THROWS on error (route handlers catch → 500). No silent failure.
 */

import type { EmailProvider } from './_types'
import type { Tenant } from '@/lib/tenants/_types'
import { sendEmail, cancelScheduledEmail } from '@/lib/mailer'

export function resendEmailProvider(tenant: Tenant): EmailProvider {
  // Per-tenant from-address; falls back to tenant.contactEmail if no noreply set.
  const _fromHint = tenant.noreplyEmail ?? tenant.contactEmail

  return {
    kind: 'resend',
    async send(opts) {
      // Note: lib/mailer.ts currently hardcodes the from address.
      // Multi-tenant migration: lift `from` into mailer's options.
      return sendEmail({
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        replyTo: opts.replyTo,
        scheduledAt: opts.scheduledAt,
      })
    },
    async cancelScheduled(id) {
      return cancelScheduledEmail(id)
    },
  }
}
