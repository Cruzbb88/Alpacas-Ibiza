import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import {
  reminderEmailHtml,
  reviewRequestEmailHtml,
  welcomeAdoptionEmailHtml,
  buildAdoptDiscountCodesEmail,
  buildNewsletterConfirmEmail,
  buildBillingPortalEmail,
  buildMollieManageEmail,
  reminderSubject,
  reviewRequestSubject,
  welcomeAdoptionSubject,
} from '@/lib/email-templates'

export const metadata = {
  title: 'Email Previews — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

// ── Dummy data ────────────────────────────────────────────────────────────────
const DUMMY = {
  name:         'Test Person',
  escapedName:  'Test Person',
  email:        'test@example.com',
  tourName:     'Meet the Herd Tour',
  dateStr:      '2026-07-15 at 10:00',
  confirmUrl:   'https://example.com/newsletter/confirm?token=DUMMY_TOKEN',
  unsubUrl:     'https://example.com/newsletter/unsubscribe?token=DUMMY_TOKEN',
  portalUrl:    'https://billing.stripe.com/session/DUMMY_SESSION',
}

// Build all previews at render time (server component — safe)
function buildPreviews() {
  const reminderHtml = reminderEmailHtml({
    escapedName:    DUMMY.escapedName,
    escapedTourName: DUMMY.tourName,
    dateStr:        DUMMY.dateStr,
    locale:         'en',
    addToCalendarUrl: 'https://calendar.google.com/calendar/r/eventedit?text=DUMMY',
  })

  const reviewHtml = reviewRequestEmailHtml({
    escapedName:    DUMMY.escapedName,
    escapedTourName: DUMMY.tourName,
    returnCode:     'RETURN10',
  })

  const welcomeMonthlyHtml = welcomeAdoptionEmailHtml({
    escapedName: DUMMY.escapedName,
    tier:        'monthly',
    processor:   'Stripe',
    paymentRef:  'cs_test_DUMMY',
  })

  const welcomeYearlyHtml = welcomeAdoptionEmailHtml({
    escapedName: DUMMY.escapedName,
    tier:        'yearly',
    processor:   'Mollie',
    paymentRef:  'tr_DUMMY',
  })

  const discountCodes = buildAdoptDiscountCodesEmail({ name: DUMMY.name })
  const newsletter    = buildNewsletterConfirmEmail(DUMMY.confirmUrl, DUMMY.unsubUrl)
  const billingPortal = buildBillingPortalEmail(DUMMY.portalUrl)
  // Mollie-manage is the DEFAULT vendor's portal email per ADR 019. Two
  // entries simulate one and two active subscriptions so the owner can QA
  // both layouts before shipping. Cancel URL is a dummy /api/mollie-manage/
  // cancel link with a fake token.
  const dummyMollieUrls = (subId: string) => ({
    statusUrl: `https://example.com/api/mollie-manage/status?token=DUMMY_${subId}`,
    updatePaymentUrl: `https://example.com/api/mollie-manage/update-payment?token=DUMMY_${subId}`,
    cancelUrl: `https://example.com/api/mollie-manage/cancel?token=DUMMY_${subId}`,
  })
  const mollieManageOne = buildMollieManageEmail({
    subscriptions: [
      { id: 'sub_DUMMY_1', amount: '75.00 EUR', interval: '1 month', ...dummyMollieUrls('1') },
    ],
  })
  const mollieManageTwo = buildMollieManageEmail({
    subscriptions: [
      { id: 'sub_DUMMY_1', amount: '75.00 EUR', interval: '1 month', ...dummyMollieUrls('1') },
      { id: 'sub_DUMMY_2', amount: '900.00 EUR', interval: '1 year', ...dummyMollieUrls('2') },
    ],
  })

  return [
    { id: 'reminder',        subject: reminderSubject('en'),              html: reminderHtml },
    { id: 'review-request',  subject: reviewRequestSubject('en'),         html: reviewHtml },
    { id: 'welcome-monthly', subject: welcomeAdoptionSubject('monthly'),  html: welcomeMonthlyHtml },
    { id: 'welcome-yearly',  subject: welcomeAdoptionSubject('yearly'),   html: welcomeYearlyHtml },
    { id: 'discount-codes',  subject: discountCodes.subject,              html: discountCodes.html },
    { id: 'newsletter-confirm', subject: newsletter.subject,              html: newsletter.html },
    { id: 'mollie-manage-one', subject: mollieManageOne.subject,          html: mollieManageOne.html },
    { id: 'mollie-manage-two', subject: mollieManageTwo.subject,          html: mollieManageTwo.html },
    { id: 'billing-portal-stripe', subject: billingPortal.subject,        html: billingPortal.html },
  ]
}

export default async function AdminEmailPreviewsPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const previews = buildPreviews()

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 860, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Email Previews</h1>
      <p style={{ color: '#6b7280', marginBottom: 8, fontSize: 14 }}>
        {previews.length} email templates rendered with dummy data. iframes are sandboxed — no scripts run.
      </p>
      <p style={{ color: '#9ca3af', marginBottom: 32, fontSize: 12 }}>
        Dummy sender: <code>{DUMMY.email}</code> · name: <code>{DUMMY.name}</code>
      </p>

      {previews.map(({ id, subject, html }) => (
        <div
          key={id}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            marginBottom: 40,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ background: '#f9fafb', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
              {id}
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{subject}</div>
          </div>

          {/* iframe — sandbox prevents scripts; allow-same-origin lets relative CSS work */}
          <iframe
            srcDoc={html}
            sandbox="allow-same-origin"
            style={{
              width: '100%',
              height: 480,
              border: 'none',
              display: 'block',
              background: '#fff',
            }}
            title={`Preview: ${subject}`}
          />
        </div>
      ))}
    </div>
  )
}
