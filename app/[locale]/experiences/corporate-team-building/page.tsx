import type { Metadata } from 'next'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import Image from 'next/image'
import Link from 'next/link'
import { Hero } from '@/components/hero'
import { Features } from '@/components/features'
import { FAQ } from '@/components/faq'
import { FareHarborCalendar } from '@/components/booking/fareharbor-calendar'
import { Button } from '@/components/ui/button'
import { getTranslations } from 'next-intl/server'
import { localBusinessSchema, faqPageSchema, toJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/i18n.config'
import { CorporateEnquiryForm } from '@/components/corporate-enquiry-form'

import { SITE_BASE_URL as BASE_URL, FAREHARBOR_ITEM_BUSINESS_INCENTIVES } from '@/lib/config'
import { getOgImage } from '@/lib/og-images'
import { SpotsLeftBanner } from '@/components/tours/spots-left-banner'
import { AdoptCrossSell } from '@/components/tours/adopt-cross-sell'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const ogImage = getOgImage('alpacas', 'Corporate Team Building with Alpacas – Alpacas Ibiza')
    return {
        title: 'Corporate Alpaca Retreats | Team Building – Alpacas Ibiza',
        description:
            'Unique corporate retreats and team building experiences with alpacas in Ibiza. Stress reduction, communication workshops, and nature connection. Book your corporate event!',
        alternates: buildLocaleAlternates(locale, 'experiences/corporate-team-building'),
        openGraph: {
            title: 'Corporate Alpaca Retreats | Team Building – Alpacas Ibiza',
            description:
                'Disconnect to reconnect. Bring your team to Ibiza for a unique bonding experience with alpacas on an authentic finca.',
            url: `${BASE_URL}/${locale}/experiences/corporate-team-building`,
            images: [ogImage],
        },
        twitter: {
            card: 'summary_large_image',
            images: [ogImage.url],
        },
    }
}

export default async function CorporatePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const translate = await getTranslations()

    const faqItems = [
        {
            question: 'How many people can attend a corporate event?',
            answer: 'We accommodate groups from 5 to 40 people. For larger groups, we can arrange multiple sessions or custom setups. Contact us for tailored packages.',
        },
        {
            question: 'What is included in a corporate package?',
            answer: 'Standard packages include welcome refreshments, guided alpaca interaction, a team challenge activity, and an organic farm lunch. Weaving workshops, photography, and custom add-ons are available.',
        },
        {
            question: 'How far in advance should we book?',
            answer: 'We recommend booking at least 2-4 weeks in advance for corporate events to ensure availability and allow time for customization.',
        },
        {
            question: 'Is transport to the farm included?',
            answer: 'Transport is not included, but we provide detailed directions and can recommend local transport services. Free on-site parking is available.',
        },
        {
            question: 'Can we customize the itinerary?',
            answer: 'Absolutely. Every corporate package is tailored to your team size, goals, and time constraints. We work with you to design the perfect experience.',
        },
    ]

    const schemas = [
        localBusinessSchema(),
        faqPageSchema(faqItems),
    ]

    return (
        <main>
            {/* JSON-LD: LocalBusiness + FAQPage */}
            {schemas.map((schema, i) => (
                <script
                    key={`corporate-schema-${i}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
                />
            ))}

            {/* Hero */}
            <Hero
                title={translate('corporate.title')}
                subtitle={translate('corporate.subtitle')}
                cta={{
                    label: translate('corporate.cta'),
                    href: `/${locale}/contact`,
                }}
                backgroundImage="/images/corporate-hero.webp"
            />

            {/* Spots-left urgency widget */}
            <div className="w-full px-4 pt-6 max-w-4xl mx-auto">
                <SpotsLeftBanner itemId={FAREHARBOR_ITEM_BUSINESS_INCENTIVES} tourLabel="Corporate Team Building" />
            </div>

            {/* FairHarbor Booking Calendar - Above the Fold */}
            <section className="w-full py-12 md:py-16 px-4 bg-[#F9F9F9]">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-[#708090] mb-4">
                        {translate('tours.bookingSection.title')}
                    </h2>
                    <p className="text-[#708090]/70 mb-8 max-w-2xl mx-auto">
                        {translate('tours.bookingSection.subtitle')}
                    </p>
                    <div className="bg-white rounded-[16px] p-6 md:p-8 shadow-sm border border-[#F5F5DC]">
                        <FareHarborCalendar itemId={FAREHARBOR_ITEM_BUSINESS_INCENTIVES} />
                    </div>
                </div>
            </section>

            {/* Get a custom quote */}
            <section className="w-full py-16 md:py-24 px-4 bg-white" aria-labelledby="corporate-quote-heading">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 id="corporate-quote-heading" className="text-3xl font-bold text-[#556B2F] mb-3">
                            Get a custom quote
                        </h2>
                        <p className="text-[#708090]">
                            Every corporate retreat is bespoke. Share your details and we&apos;ll send a
                            tailored proposal within 48 hours.
                        </p>
                    </div>
                    <CorporateEnquiryForm />
                </div>
            </section>

            {/* Why Alpacas for Team Building */}
            <section className="w-full py-16 md:py-24 px-4 bg-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-[#556B2F] mb-6">
                        {translate('corporate.whyTitle')}
                    </h2>
                    <p className="text-lg text-[#708090] mb-12">
                        {translate('corporate.whyText')}
                    </p>
                </div>

                <Features
                    items={[
                        {
                            title: translate('corporate.features.stress.title'),
                            description: translate('corporate.features.stress.description'),
                            icon: '\u{1F60C}',
                        },
                        {
                            title: translate('corporate.features.communication.title'),
                            description: translate('corporate.features.communication.description'),
                            icon: '\u{1F5E3}\uFE0F',
                        },
                        {
                            title: translate('corporate.features.creativity.title'),
                            description: translate('corporate.features.creativity.description'),
                            icon: '\u{1F9F6}',
                        },
                        {
                            title: translate('corporate.features.nature.title'),
                            description: translate('corporate.features.nature.description'),
                            icon: '\u{1F33F}',
                        },
                    ]}
                />
            </section>

            {/* Team Experience Image */}
            <section className="w-full py-12 px-4 bg-[#F5F5DC]/20">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="relative aspect-[4/3] rounded-[16px] overflow-hidden">
                            <Image
                                src="/images/corporate-team-alpacas.webp"
                                alt="Corporate team building with alpacas - Alpaca Trekking Santa Eularia Ibiza Eco-Tourism"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        </div>
                        <div className="relative aspect-[4/3] rounded-[16px] overflow-hidden">
                            <Image
                                src="/images/corporate-weaving-workshop.webp"
                                alt="Team weaving workshop at Ibiza alpaca farm - Corporate Eco-Tourism"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Itinerary */}
            <section className="w-full py-16 px-4 bg-[#F9F9F9]">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-[#556B2F] mb-8 text-center">
                        {translate('corporate.itinerary.title')}
                    </h2>
                    <div className="space-y-6">
                        {(['item1', 'item2', 'item3', 'item4'] as const).map((item) => (
                            <div
                                key={item}
                                className="bg-white p-6 rounded-[16px] shadow-sm border border-[#F5F5DC] flex gap-4 items-start"
                            >
                                <div className="w-20 flex-shrink-0 text-sm font-bold text-[#556B2F] bg-[#F5F5DC]/50 rounded-[16px] px-3 py-2 text-center">
                                    {translate(`corporate.itinerary.${item}.time`)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-[#556B2F] mb-1">
                                        {translate(`corporate.itinerary.${item}.title`)}
                                    </h3>
                                    <p className="text-[#708090]">
                                        {translate(`corporate.itinerary.${item}.desc`)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Banner */}
            <section className="w-full py-16 px-4 bg-[#556B2F] text-white text-center">
                <h2 className="text-3xl font-bold mb-4">{translate('corporate.planTitle')}</h2>
                <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
                    {translate('corporate.planText')}
                </p>
                <Button
                    asChild
                    size="lg"
                    className="bg-[#F5F5DC] text-[#556B2F] hover:bg-[#F5F5DC]/90 text-lg rounded-[16px] font-bold"
                >
                    <Link href={`/${locale}/contact`}>{translate('corporate.planCta')}</Link>
                </Button>
            </section>

            {/* AEO-Optimized FAQ */}
            <section className="w-full bg-[#F9F9F9]">
                <FAQ items={faqItems} />
            </section>

            {/* Adopt cross-sell */}
            <AdoptCrossSell locale={locale} />
        </main>
    )
}
