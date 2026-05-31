import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { CancelFeedbackForm } from '@/components/adopt/cancel-feedback-form'

export const metadata: Metadata = {
  title: 'Before you go — Alpacas Ibiza',
  robots: { index: false, follow: false },
}

/**
 * /[locale]/cancel-feedback
 *
 * Optional exit survey shown to donors after cancelling their Alpacas Ibiza
 * adoption subscription. Reached from:
 *   - Mollie cancel success redirect: /api/mollie-manage/cancel → /cancel-feedback?vendor=mollie&sub={subId}
 *   - Stripe billing-portal cancel (return_url configured in Stripe Dashboard)
 *
 * noindex — self-service utility page, no SEO value.
 */
export default async function CancelFeedbackPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const tr = t(locale)

  const title = tr('cancelFeedback.title', 'Before you go…')
  const subhead = tr(
    'cancelFeedback.subhead',
    "We're sorry to see you go. Would you mind telling us why you cancelled?",
  )
  const labelPrice = tr('cancelFeedback.reason.price', 'The price was too high')
  const labelForgot = tr('cancelFeedback.reason.forgot', 'I forgot I had an adoption')
  const labelUnused = tr('cancelFeedback.reason.unused', 'I no longer needed it')
  const labelOther = tr('cancelFeedback.reason.other', 'Other reason')
  const labelNotes = tr('cancelFeedback.notesLabel', 'Anything else? (optional)')
  const submitLabel = tr('cancelFeedback.submit', 'Send feedback')
  const skipLabel = tr('cancelFeedback.skip', 'Skip — take me to re-adopt')
  const thankYouMessage = tr(
    'cancelFeedback.thankYou',
    'Thank you for your feedback — it helps us improve.',
  )
  const reAdoptLabel = tr('cancelFeedback.reAdoptLink', 'If you change your mind, you can re-adopt here')

  return (
    <main className="min-h-[60vh] py-20 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-3">{title}</h1>
        <p className="text-foreground/70 mb-8">{subhead}</p>

        <CancelFeedbackForm
          locale={locale}
          labels={{
            price: labelPrice,
            forgot: labelForgot,
            unused: labelUnused,
            other: labelOther,
          }}
          notesLabel={labelNotes}
          submitLabel={submitLabel}
          skipLabel={skipLabel}
          thankYouMessage={thankYouMessage}
          reAdoptLabel={reAdoptLabel}
        />
      </div>
    </main>
  )
}
