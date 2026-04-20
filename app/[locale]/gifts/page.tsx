import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { Hero } from '@/components/hero'
import { FareHarborCalendar } from '@/components/fareharbor-calendar'
import { CancellationBadge } from '@/components/cancellation-badge'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import type { Metadata } from 'next'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
    const { locale } = await params
    const tr = t(locale)
    return {
        title: tr('gifts.meta.title') || 'Gift a Visit — Alpacas Ibiza',
        description:
            tr('gifts.meta.description') ||
            'Give someone a memorable day with our alpaca herd. Gift vouchers valid for any of our tours.',
        alternates: {
            canonical: `/${locale}/gifts`,
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
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                            {translate('gifts.booking.title') || 'Buy a gift voucher'}
                        </h2>
                        <p className="text-foreground/70 max-w-2xl mx-auto">
                            {translate('gifts.booking.subtitle') ||
                                'Select a tour and purchase a voucher. We will email it directly to the recipient on your chosen date.'}
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

                    <div className="mt-8 p-6 bg-accent/10 border border-accent/20 rounded-lg">
                        <p className="text-sm text-foreground/70">
                            <strong className="text-foreground">
                                {translate('gifts.faq.howItWorksTitle') || 'How it works'}
                            </strong>
                            <br />
                            {translate('gifts.faq.howItWorksText') ||
                                'Choose a tour, pay securely, and we send a branded voucher by email to the recipient. They pick a date that works for them and book through the same system.'}
                        </p>
                    </div>
                </div>
            </section>
        </div>
    )
}
