/**
 * Console-only EmailProvider — for dev / preview where no email API key is set.
 *
 * Logs the would-be email to stdout and returns a fake ID. Never sends real mail.
 *
 * Failsafe: never throws. The fake `id` allows scheduled-cancel flows to no-op
 * gracefully without breaking the caller.
 */

import type { EmailProvider } from './_types'

export function consoleOnlyEmailProvider(): EmailProvider {
  return {
    kind: 'console-only',
    async send(opts) {
      const id = `dev-${Date.now().toString(36)}`
      console.log('[email:console-only]', { id, ...opts, html: `${opts.html.slice(0, 100)}…` })
      return { id }
    },
    async cancelScheduled(id) {
      console.log('[email:console-only] cancel', id)
      return true
    },
  }
}
