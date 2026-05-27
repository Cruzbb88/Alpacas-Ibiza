import type { Metadata } from 'next'
import { Suspense } from 'react'
import { t } from '@/lib/translations'
import type { Locale } from '@/i18n.config'
import { SITE_BASE_URL as BASE_URL } from '@/lib/config'
import { getPaymentAdapter } from '@/lib/payment-vendor'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { toJsonLd } from '@/lib/structured-data'
import { GradientPageHero, PageSection, OwnerConfirmBanner } from '@/components/layout'
import { BillingPortalLink } from '@/components/billing-portal-link'
import { ALPACAS, findAlpacaName } from '@/lib/data/alpacas'
import { AlpacaPicker } from '@/components/adopt/alpaca-picker'
import { AdoptThankYou } from '@/components/adopt-thank-you'
import { FAQ } from '@/components/faq'
import { TestimonialsWall } from '@/components/testimonials-wall'
import { getTenant } from '@/lib/tenants/server'
import { getOgImage } from '@/lib/og-images'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const { canonical, languages } = buildLocaleAlternates(locale, 'adopt')
    const ogImage = getOgImage('adopt', 'Adopt an Alpaca – Alpacas Ibiza')
    return {
        title: 'Adopt an Alpaca | Alpacas Ibiza – Es Currals',
        description:
            'Support Ibiza\'s first alpaca farm with a monthly or yearly adoption. €75/month or €900/year — includes farm tours, certificate, fertilizer, photoshoot, and more.',
        alternates: { canonical, languages },
        openGraph: {
            title: 'Adopt an Alpaca | Alpacas Ibiza',
            description:
                'Become part of the herd. Monthly or yearly adoption with farm tours, certificate, professional photoshoot and exclusive perks.',
            url: canonical,
            images: [ogImage],
        },
        twitter: {
            card: 'summary_large_image',
            images: [ogImage.url],
        },
    }
}

// TODO: OWNER_CONFIRMED — prices (€75/mo, €900/yr) and all 9 benefits sourced from live site
// VERIFICATION_RESULTS.md #10. Owner must confirm before launch: (a) prices unchanged,
// (b) benefits bundle migrates 1:1, (c) existing subscriber grandfathering policy.

// 7 confirmed benefits per spec 003 + VERIFICATION_RESULTS.md #10.
// Owner-blocked items (alpaca selector, per-alpaca cap) handled via OwnerConfirmBanner below.
const BENEFITS = [
    'benefit1',
    'benefit2',
    'benefit3',
    'benefit4',
    'benefit5',
    'benefit6',
    'benefit7',
] as const

export default async function AdoptPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: Locale }>
    searchParams: Promise<{ checkout?: string; tier?: string; portal?: string; alpaca?: string }>
}) {
    const { locale } = await params
    const { checkout, alpaca: alpacaParam } = await searchParams
    const translate = t(locale)
    const tenant = await getTenant()

    // Validate alpaca slug against the canonical roster — unknown slugs (forged
    // URL, typo) collapse to "no selection". The same validation runs in the
    // checkout routes as a second line of defence.
    const selectedAlpacaSlug = findAlpacaName(alpacaParam ?? null) ? (alpacaParam as string) : null

    const paymentAdapter = getPaymentAdapter()
    const adoptOpts = selectedAlpacaSlug ? { alpaca: selectedAlpacaSlug } : undefined
    const monthlyUrl = paymentAdapter.buildAdoptCheckoutUrl('monthly', adoptOpts) ?? `mailto:info@alpacasibiza.com?subject=Adopt%20an%20Alpaca%20enquiry`
    const yearlyUrl  = paymentAdapter.buildAdoptCheckoutUrl('yearly', adoptOpts)  ?? `mailto:info@alpacasibiza.com?subject=Adopt%20an%20Alpaca%20enquiry`
    // When vendor returns null (env vars unset), both fall back to mailto — same as before.
    // Drop-in: set PAYMENT_VENDOR + vendor-specific keys in .env.local and both CTAs activate.

    // Structured data: Offer — prices from verified live site (VERIFICATION_RESULTS.md #10)
    const offerSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Adopt an Alpaca — Alpacas Ibiza',
        description: 'Monthly or yearly alpaca adoption including farm tours, certificate, professional photoshoot, and fertilizer.',
        brand: {
            '@type': 'Brand',
            name: 'Alpacas Ibiza',
        },
        offers: [
            {
                '@type': 'Offer',
                name: 'Monthly adoption',
                price: '75.00',
                priceCurrency: 'EUR',
                priceSpecification: {
                    '@type': 'UnitPriceSpecification',
                    price: '75.00',
                    priceCurrency: 'EUR',
                    referenceQuantity: {
                        '@type': 'QuantitativeValue',
                        value: '1',
                        unitCode: 'MON',
                    },
                },
                availability: 'https://schema.org/InStock',
                url: `${BASE_URL}/${locale}/adopt`,
            },
            {
                '@type': 'Offer',
                name: 'Yearly adoption (prepaid)',
                price: '900.00',
                priceCurrency: 'EUR',
                priceSpecification: {
                    '@type': 'UnitPriceSpecification',
                    price: '900.00',
                    priceCurrency: 'EUR',
                    referenceQuantity: {
                        '@type': 'QuantitativeValue',
                        value: '1',
                        unitCode: 'ANN',
                    },
                },
                availability: 'https://schema.org/InStock',
                url: `${BASE_URL}/${locale}/adopt`,
            },
        ],
    }

    const isSuccess = checkout === 'success'

    return (
        <>
            {/* JSON-LD: Product/Offer */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: toJsonLd(offerSchema) }}
            />

            {/* Thank-you screen (success) + cancelled banner — client component;
                Suspense required by Next.js for useSearchParams in static build */}
            <Suspense fallback={null}>
                <AdoptThankYou
                    locale={locale}
                    contactEmail={tenant.contactEmail}
                    whatsappE164={tenant.whatsappE164}
                    siteUrl={tenant.siteUrl}
                />
            </Suspense>

            {/* Marketing content — hidden when checkout=success (donor already converted) */}
            {!isSuccess && (
            <>
            <PageBreadcrumbs
                locale={locale}
                homeLabel={translate('nav.home') || 'Home'}
                crumbs={[{ name: translate('adopt.title') || 'Adopt an Alpaca', path: 'adopt' }]}
            />

            {/* Hero */}
            <GradientPageHero
                title={translate('adopt.title')}
                subtitle={translate('adopt.subtitle')}
            />

            {/* Alpaca picker — donor can pin a specific alpaca. Slug rides through Stripe/Mollie metadata
                so the welcome email mentions which alpaca they adopted. "Pick for me" clears selection. */}
            <PageSection bg="default" width="narrow" className="pt-12 pb-2">
                <AlpacaPicker
                    locale={locale}
                    selectedSlug={selectedAlpacaSlug}
                    heading={translate('adopt.pickerHeading') || 'Pick your alpaca'}
                    subheading={translate('adopt.pickerSubheading') || 'Or let us match you with one of the herd.'}
                    randomLabel={translate('adopt.pickerRandomLabel') || 'Pick for me'}
                />
            </PageSection>

            {/* Pricing tiers — rich layout: badge on yearly to highlight commitment level,
                tagline from translation so locales can localise the cancellation copy. */}
            <PageSection bg="default" width="narrow" className="py-16">
                <h2 className="text-2xl font-bold text-foreground text-center mb-10">
                    {translate('adopt.tierLabel')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Monthly */}
                    <div className="bg-card rounded-lg border border-border p-8 flex flex-col items-center text-center">
                        <p className="text-sm font-semibold text-foreground/50 uppercase tracking-wide mb-2">Monthly</p>
                        <p className="text-4xl font-bold text-foreground mb-1">
                            {translate('adopt.monthlyPrice')}
                        </p>
                        <p className="text-sm text-foreground/60">{translate('adopt.monthlyTierTagline')}</p>
                    </div>
                    {/* Yearly */}
                    <div className="relative bg-primary/5 rounded-lg border-2 border-primary/30 p-8 flex flex-col items-center text-center">
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                            {translate('adopt.yearlyTierBadge')}
                        </span>
                        <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Yearly — prepaid</p>
                        <p className="text-4xl font-bold text-foreground mb-1">
                            {translate('adopt.yearlyPrice')}
                        </p>
                        <p className="text-sm text-foreground/60">{translate('adopt.yearlyTierTagline')}</p>
                    </div>
                </div>
            </PageSection>

            {/* Benefits — 3×3 grid */}
            <PageSection width="narrow" className="border-t border-border">
                <h2 className="text-2xl font-bold text-foreground mb-3">
                    {translate('adopt.benefitsTitle')}
                </h2>
                <p className="text-sm text-foreground/70 mb-10">
                    {translate('adopt.benefitsIntro')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {BENEFITS.map((key) => (
                        <div
                            key={key}
                            className="bg-card rounded-lg border border-border p-5 flex items-start gap-3"
                        >
                            <span className="mt-0.5 text-primary shrink-0">✓</span>
                            <p className="text-sm text-foreground/80">
                                {translate(`adopt.${key}`)}
                            </p>
                        </div>
                    ))}
                </div>
            </PageSection>

            {/* CTA — routes through payment adapter; falls back to mailto until PAYMENT_VENDOR is set.
                `id="cta"` is the AlpacaPicker's smooth-scroll target after a donor picks an alpaca. */}
            <PageSection id="cta" bg="gradient" width="tight" borderTop className="py-16" innerClassName="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                    {translate('adopt.ctaLabel')}
                </h2>
                <p className="text-sm text-foreground/70 mb-8">
                    {translate('adopt.ctaSubtext')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                        href={monthlyUrl}
                        className="inline-block rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        {translate('adopt.ctaLabel')} — Monthly
                    </a>
                    <a
                        href={yearlyUrl}
                        className="inline-block rounded-lg border border-primary px-8 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                    >
                        {translate('adopt.ctaLabel')} — Yearly
                    </a>
                </div>
            </PageSection>

            {/* Social proof — fail-quiet, renders null until owner adds testimonials with status:'live' */}
            <TestimonialsWall
                title={translate('alpacas.adoptCta') ? `What adopters say` : undefined}
                limit={6}
                className="border-t border-border"
            />

            {/* FAQ — addresses the cancel/visit/gift questions every competitor's adopt page covers */}
            <PageSection bg="muted" width="narrow" className="border-t border-border">
                <FAQ
                    title={translate('adopt.faqTitle')}
                    subtitle={translate('adopt.faqSubtitle')}
                    items={[
                        { question: translate('adopt.faqQ1'), answer: translate('adopt.faqA1') },
                        { question: translate('adopt.faqQ2'), answer: translate('adopt.faqA2') },
                        { question: translate('adopt.faqQ3'), answer: translate('adopt.faqA3') },
                        { question: translate('adopt.faqQ4'), answer: translate('adopt.faqA4') },
                        { question: translate('adopt.faqQ5'), answer: translate('adopt.faqA5') },
                        { question: translate('adopt.faqQ6'), answer: translate('adopt.faqA6') },
                        { question: translate('adopt.faqQ7'), answer: translate('adopt.faqA7') },
                    ]}
                />
            </PageSection>

            {/* Billing portal — existing subscribers only; collapsed by default */}
            <PageSection width="narrow" className="pt-0 pb-2">
                <BillingPortalLink locale={locale} />
            </PageSection>

            {/* Owner-confirm banner — dev/staging only */}
            <OwnerConfirmBanner
                heading={translate('adopt.ownerConfirmHeader')}
                body={translate('adopt.ownerConfirmBody')}
                items={[
                    '[OWNER_CONFIRM] Prices: €75/mo and €900/yr still current on live site?',
                    '[OWNER_CONFIRM] All 9 benefits carry to redesign 1:1?',
                    '[OWNER_CONFIRM] Existing subscribers: grandfathered, re-enroll, or no change?',
                    '[UNMAPPED] Payment vendor: FareHarbor subscriptions, Stripe, Mollie, or other?',
                    '[UNMAPPED] Per-alpaca cap: how many adopters can be assigned per alpaca?',
                    '[UNMAPPED] Add to main nav? Under "Experiences" or standalone?',
                ]}
            />
            </>
            )}
        </>
    )
}
