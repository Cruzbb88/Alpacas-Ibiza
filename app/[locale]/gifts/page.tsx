import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { Hero } from '@/components/hero'
import { FareHarborCalendar } from '@/components/booking/fareharbor-calendar'
import { CancellationBadge } from '@/components/booking/cancellation-badge'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { GiftFlow, type GiftType } from '@/components/gifts/gift-flow'
import { getPaymentAdapter, ADOPT_FALLBACK_MAILTO } from '@/lib/payment-vendor'
import { getFareHarborEmbedUrl } from '@/lib/config'
import type { Metadata } from 'next'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { getOgImage } from '@/lib/og-images'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
    const { locale } = await params
    const tr = t(locale)
    const ogImage = getOgImage('alpacas', 'Gift a Visit to Alpacas Ibiza')
    return {
        title: tr('gifts.meta.title') || 'Gift Voucher – Alpacas Ibiza | Give an Alpaca Experience',
        description:
            tr('gifts.meta.description') ||
            'Give someone a memorable day with our alpaca herd. Gift vouchers valid for any of our tours.',
        alternates: buildLocaleAlternates(locale, 'gifts'),
        openGraph: {
            title: tr('gifts.meta.title') || 'Gift Voucher – Alpacas Ibiza | Give an Alpaca Experience',
            description:
                tr('gifts.meta.description') ||
                'Give someone a memorable day with our alpaca herd. Gift vouchers valid for any of our tours.',
            images: [ogImage],
        },
        twitter: {
            card: 'summary_large_image',
            images: [ogImage.url],
        },
    }
}

export default async function GiftsPage({
    params,
}: {
    params: Promise<{ locale: Locale }>
}) {
    const { locale } = await params
    const translate = t(locale)

    // Pre-compute checkout URLs per gift type so the wizard (client component)
    // can receive a serialisable map instead of a function. Adoption tiers go
    // through the same Stripe/Mollie adapter the /adopt page uses; tour vouchers
    // route to the FareHarbor calendar (the owner finalises gift-voucher items
    // there); shop credit falls back to email until a Stripe SKU is created.
    const paymentAdapter = getPaymentAdapter()
    const giftCheckoutHrefByType: Record<GiftType, string> = {
        tour: getFareHarborEmbedUrl(),
        'adoption-monthly':
            paymentAdapter.buildAdoptCheckoutUrl('monthly') ?? ADOPT_FALLBACK_MAILTO,
        'adoption-yearly':
            paymentAdapter.buildAdoptCheckoutUrl('yearly') ?? ADOPT_FALLBACK_MAILTO,
        'shop-credit':
            'mailto:info@alpacasibiza.com?subject=Shop%20credit%20gift%20voucher',
    }

    return (
        <div className="flex flex-col min-h-screen">
            <PageBreadcrumbs
                locale={locale}
                homeLabel={translate('nav.home') || 'Home'}
                crumbs={[{ name: translate('nav.gifts') || 'Gift vouchers', path: 'gifts' }]}
            />
            <Hero
                title={translate('gifts.hero.title') || 'Give the gift of alpacas'}
                subtitle={
                    translate('gifts.hero.subtitle') ||
                    'A unique Ibiza experience — valid for any tour, any date'
                }
                cta={{
                    label: translate('gifts.hero.cta') || 'Buy a gift voucher',
                    href: '#gift-booking',
                }}
            />

            <section className="w-full py-16 md:py-24 px-4 bg-background">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            {translate('gifts.why.title') || 'Why gift an Alpacas Ibiza visit?'}
                        </h2>
                        <ul className="text-left max-w-xl mx-auto space-y-3 text-foreground/70">
                            <li>
                                🎁{' '}
                                {translate('gifts.why.reason1') ||
                                    'An experience, not another thing they will store away'}
                            </li>
                            <li>
                                📅{' '}
                                {translate('gifts.why.reason2') ||
                                    'Redeemable on any date — flexible for their schedule'}
                            </li>
                            <li>
                                🦙{' '}
                                {translate('gifts.why.reason3') ||
                                    'Works for any age — families, couples, groups'}
                            </li>
                            <li>
                                ✉️{' '}
                                {translate('gifts.why.reason4') ||
                                    'Digital voucher delivered by email — no shipping wait'}
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <section
                id="gift-booking"
                className="w-full py-16 md:py-24 px-4 bg-secondary/20"
            >
                <GiftFlow
                    checkoutHrefByType={giftCheckoutHrefByType}
                    locale={locale}
                    consentActionLabel={translate('legal.giftAction') || 'completing your gift'}
                    copy={{
                        heading: translate('gifts.flow.heading') || 'Send the gift of alpacas',
                        subheading:
                            translate('gifts.flow.subheading') ||
                            'Four short steps. We email a branded voucher to your recipient on the day you choose.',
                        stepGift: translate('gifts.flow.stepGift') || 'Gift type',
                        stepRecipient: translate('gifts.flow.stepRecipient') || 'Recipient',
                        stepMessage: translate('gifts.flow.stepMessage') || 'Message',
                        stepReview: translate('gifts.flow.stepReview') || 'Review',
                        giftTypes: {
                            tour: {
                                title: translate('gifts.flow.tourTitle') || 'Tour voucher',
                                price: translate('gifts.flow.tourPrice') || 'From €45 / guest',
                                description:
                                    translate('gifts.flow.tourDescription') ||
                                    '90-min farm tour, valid for 12 months. Choose any tour type at booking.',
                            },
                            'adoption-monthly': {
                                title:
                                    translate('gifts.flow.adoptMonthlyTitle') ||
                                    'Monthly adoption',
                                price:
                                    translate('gifts.flow.adoptMonthlyPrice') || '€75 / month',
                                description:
                                    translate('gifts.flow.adoptMonthlyDescription') ||
                                    'Year-long adoption with farm tours, certificate, photoshoot, and seasonal gifts.',
                            },
                            'adoption-yearly': {
                                title:
                                    translate('gifts.flow.adoptYearlyTitle') ||
                                    'Yearly adoption',
                                price:
                                    translate('gifts.flow.adoptYearlyPrice') ||
                                    '€900 / year prepaid',
                                description:
                                    translate('gifts.flow.adoptYearlyDescription') ||
                                    'Same perks as monthly, paid upfront. The committed gift.',
                            },
                            'shop-credit': {
                                title:
                                    translate('gifts.flow.shopCreditTitle') ||
                                    'Farm shop credit',
                                price:
                                    translate('gifts.flow.shopCreditPrice') || 'Custom amount',
                                description:
                                    translate('gifts.flow.shopCreditDescription') ||
                                    'Use against woven textiles, alpaca fibre, and farm shop items.',
                            },
                        },
                        continueLabel: translate('gifts.flow.continue') || 'Continue',
                        backLabel: translate('gifts.flow.back') || 'Back',
                        checkoutLabel:
                            translate('gifts.flow.checkout') || 'Open secure checkout',
                        recipientNameLabel:
                            translate('gifts.flow.recipientName') || 'Recipient name',
                        recipientEmailLabel:
                            translate('gifts.flow.recipientEmail') || 'Recipient email',
                        senderNameLabel: translate('gifts.flow.senderName') || 'Your name',
                        messageLabel: translate('gifts.flow.message') || 'Personal message',
                        messagePlaceholder:
                            translate('gifts.flow.messagePlaceholder') ||
                            'A short note that appears on the voucher.',
                        sendDateLabel: translate('gifts.flow.sendDate') || 'When to send',
                        sendDateTodayOption:
                            translate('gifts.flow.sendToday') || 'Send today',
                        sendDateFutureOption:
                            translate('gifts.flow.sendFuture') || 'Schedule for a future date',
                        reviewTitle:
                            translate('gifts.flow.reviewTitle') || 'You’re gifting',
                        reviewGiftFor: translate('gifts.flow.reviewGiftFor') || 'Gift for',
                        reviewFrom: translate('gifts.flow.reviewFrom') || 'From',
                        reviewSendDate:
                            translate('gifts.flow.reviewSendDate') || 'Send date',
                    }}
                />

                {/* Direct FareHarbor calendar — for visitors who already know what they want
                    and would rather book a tour voucher directly without going through the wizard. */}
                <div className="max-w-4xl mx-auto mt-16">
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                            {translate('gifts.booking.title') || 'Or buy a tour voucher directly'}
                        </h3>
                        <p className="text-sm text-foreground/70">
                            {translate('gifts.booking.subtitle') ||
                                'Skip the wizard and use the calendar embed below.'}
                        </p>
                    </div>
                    <div className="p-6 md:p-8 border border-border bg-background rounded-lg shadow-sm">
                        <FareHarborCalendar />
                        <div className="mt-6 text-center">
                            <CancellationBadge variant="full" />
                            <p className="text-xs text-foreground/50 mt-2">
                                {translate('gifts.booking.poweredBy') ||
                                    'Secure gift voucher checkout powered by FareHarbor'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
