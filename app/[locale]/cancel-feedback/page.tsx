import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'
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
  const tr = await getTranslations()

  // Every key gets an EN fallback so the page never renders blank when a
  // locale translation is missing. The fallback strings ARE the source of
  // truth until translators ship the keys; the sentinel-strip resolver in
  // lib/translations.ts handles graceful per-locale fallback to EN.
  const title = tr('cancelFeedback.title')
  const subhead = tr('cancelFeedback.subhead')
  const labelPrice = tr('cancelFeedback.reason.price')
  const labelForgot = tr('cancelFeedback.reason.forgot')
  const labelUnused = tr('cancelFeedback.reason.unused')
  const labelOther = tr('cancelFeedback.reason.other')
  const labelNotes = tr('cancelFeedback.notesLabel')
  const submitLabel = tr('cancelFeedback.submit')
  const skipLabel = tr('cancelFeedback.skip')
  const thankYouMessage = tr('cancelFeedback.thankYou')
  const reAdoptLabel = tr('cancelFeedback.reAdoptLink')

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
