import type { Metadata } from 'next'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import Image from 'next/image'
import { Hero } from '@/components/hero'
import { FAQ } from '@/components/faq'
import { FareHarborCalendar } from '@/components/booking/fareharbor-calendar'
import { t } from '@/lib/translations'
import { localBusinessSchema, faqPageSchema, toJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/i18n.config'

import { SITE_BASE_URL as BASE_URL } from '@/lib/config'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    return {
        title: 'Family Farm Days | Alpacas Ibiza - Kid-Friendly Alpaca Experience',
        description:
            'Safe, educational family fun at Ibiza\'s first alpaca farm. Kids feed alpacas, learn about sustainability, and enjoy nature in Santa Eularia. Ages 0+. Book now!',
        alternates: buildLocaleAlternates(locale, 'experiences/family-farm-days'),
        openGraph: {
            title: 'Family Farm Days | Alpacas Ibiza',
            description:
                'Introduce your kids to alpacas on a real Ibiza finca. Safe, educational, and unforgettable for all ages.',
            url: `${BASE_URL}/${locale}/experiences/family-farm-days`,
            images: [
                {
                    url: '/images/family-alpacas-hero.webp',
                    width: 1200,
                    height: 630,
                    alt: 'Family visiting alpacas at Ibiza eco-tourism farm in Santa Eularia',
                },
            ],
        },
    }
}

export default async function FamilyPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const translate = t(locale as Locale)

    const faqItems = [
        {
            question: translate('family.faq.age.q'),
            answer: translate('family.faq.age.a'),
        },
        {
            question: translate('family.faq.safe.q'),
            answer: translate('family.faq.safe.a'),
        },
        {
            question: translate('family.faq.duration.q'),
            answer: translate('family.faq.duration.a'),
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
                    key={`family-schema-${i}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
                />
            ))}

            {/* Hero */}
            <Hero
                title={translate('family.title')}
                subtitle={translate('family.subtitle')}
                cta={{
                    label: translate('family.cta'),
                    href: 'https://fareharbor.com/embeds/book/alpacasibiza/?full-items=yes',
                }}
                backgroundImage="/images/family-hero.webp"
            />

            {/* FairHarbor Booking Calendar - Above the Fold */}
            <section className="w-full py-12 md:py-16 px-4 bg-[#F9F9F9]">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-[#708090] mb-4">
                        {translate('tours.bookingSection.title', 'Book Your Family Visit')}
                    </h2>
                    <p className="text-[#708090]/70 mb-8 max-w-2xl mx-auto">
                        {translate('tours.bookingSection.subtitle', 'Select your preferred date and time to reserve your alpaca experience.')}
                    </p>
                    <div className="bg-white rounded-[16px] p-6 md:p-8 shadow-sm border border-[#F5F5DC]">
                        <FareHarborCalendar />
                    </div>
                </div>
            </section>

            {/* Education Section */}
            <section className="w-full py-16 md:py-24 px-4 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-[#556B2F] mb-6">
                                {translate('family.educationTitle')}
                            </h2>
                            <p className="text-lg text-[#708090] mb-6">
                                {translate('family.educationText')}
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-[#556B2F] text-white flex items-center justify-center text-sm flex-shrink-0">
                                        &#10003;
                                    </span>
                                    <span className="text-[#708090]">
                                        <strong>{translate('family.points.respect')}</strong>
                                    </span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-[#556B2F] text-white flex items-center justify-center text-sm flex-shrink-0">
                                        &#10003;
                                    </span>
                                    <span className="text-[#708090]">
                                        <strong>{translate('family.points.biology')}</strong>
                                    </span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-[#556B2F] text-white flex items-center justify-center text-sm flex-shrink-0">
                                        &#10003;
                                    </span>
                                    <span className="text-[#708090]">
                                        <strong>{translate('family.points.sustainability')}</strong>
                                    </span>
                                </li>
                            </ul>
                        </div>
                        <div className="relative h-80 rounded-[16px] overflow-hidden">
                            <Image
                                src="/images/kids-feeding-alpacas.webp"
                                alt="Kids feeding alpacas at Alpaca Trekking Santa Eularia - Ibiza Eco-Tourism"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Safety Section */}
            <section className="w-full py-16 px-4 bg-[#F5F5DC]/30">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold mb-8 text-center text-[#556B2F]">
                        {translate('family.safetyTitle')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: '\u{1F6E1}\uFE0F', key: 'gentle' },
                            { icon: '\u{1F476}', key: 'stroller' },
                            { icon: '\u{1F9FC}', key: 'hygiene' },
                            { icon: '\u{1F964}', key: 'refreshments' },
                        ].map((item) => (
                            <div
                                key={item.key}
                                className="bg-white p-6 rounded-[16px] text-center border border-[#F5F5DC] shadow-sm"
                            >
                                <div className="text-3xl mb-3">{item.icon}</div>
                                <h3 className="font-semibold text-[#556B2F] mb-1">
                                    {translate(`family.safety.${item.key}.title`)}
                                </h3>
                                <p className="text-xs text-[#708090]">
                                    {translate(`family.safety.${item.key}.desc`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Gallery Strip */}
            <section className="w-full py-12 px-4 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { src: '/images/family-alpaca-walk.webp', alt: 'Family walking with alpacas in Ibiza countryside - Eco-Tourism' },
                            { src: '/images/family-kids-petting.webp', alt: 'Children petting alpacas at Alpaca Trekking Santa Eularia' },
                            { src: '/images/family-feeding-time.webp', alt: 'Kids feeding alpacas on Ibiza farm - Family Eco-Tourism' },
                            { src: '/images/family-farm-landscape.webp', alt: 'Alpaca farm landscape Santa Eularia Ibiza - Eco-Tourism experience' },
                        ].map((img, i) => (
                            <div key={i} className="relative aspect-square rounded-[16px] overflow-hidden">
                                <Image
                                    src={img.src}
                                    alt={img.alt}
                                    fill
                                    className="object-cover hover:scale-105 transition-transform duration-300"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* AEO-Optimized FAQ */}
            <section className="w-full bg-[#F9F9F9]">
                <FAQ items={faqItems} />
            </section>
        </main>
    )
}
