import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { RecoverCertificateForm } from '@/components/adopt/recover-certificate-form'

export const metadata: Metadata = {
  title: 'Recover your certificate — Alpacas Ibiza',
  robots: { index: false, follow: false },
}

/**
 * /[locale]/recover-certificate — static server-rendered page.
 *
 * Provides the "recover my certificate" self-service flow for donors who lost
 * their welcome email. The page renders a minimal form; all interactive
 * behaviour lives in the client component RecoverCertificateForm.
 *
 * Anti-enumeration guarantee is preserved end-to-end:
 *   - The form POSTs to /api/recover-certificate.
 *   - That route always returns { ok: true } 200 regardless of lookup outcome.
 *   - The success message shown to the user is identical for both "found" and
 *     "not found" — no observable oracle for email addresses.
 *
 * noindex: low-value self-service page; not intended for search indexing.
 */
export default async function RecoverCertificatePage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const tr = t(locale)

  const title = tr('recoverCertificate.title', 'Recover your certificate')
  const subhead = tr(
    'recoverCertificate.subhead',
    "Lost the welcome email? Tell us the email you adopted with and we'll re-send your certificate.",
  )
  const emailLabel = tr('recoverCertificate.emailLabel', 'Email')
  const submitLabel = tr('recoverCertificate.submit', 'Send certificate')
  const successMessage = tr(
    'recoverCertificate.successMessage',
    "Check your inbox — if we have a record matching that email, your certificate is on the way.",
  )

  return (
    <main className="min-h-[60vh] py-20 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-3">{title}</h1>
        <p className="text-foreground/70 mb-6">{subhead}</p>

        {/* Client component owns the form interaction + fetch */}
        <RecoverCertificateForm
          emailLabel={emailLabel}
          submitLabel={submitLabel}
          successMessage={successMessage}
        />
      </div>
    </main>
  )
}
