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
import { AdoptTierCard } from '@/components/adopt/adopt-tier-card'
import { AdoptBenefitsList } from '@/components/adopt/adopt-benefits-list'
import { AdoptionTimeline } from '@/components/adopt/adoption-timeline'
import { AdopterCounter } from '@/components/adopt/adopter-counter'
import { AdoptionCertificatePreview } from '@/components/adopt/adoption-certificate-preview'
import { TrustSignals } from '@/components/adopt/trust-signals'
import { RepeatCta } from '@/components/adopt/repeat-cta'
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

            {/* Social proof — herd availability counter. `adopted={0}` until the
                adoption DB lands; AdopterCounter degrades gracefully ("plenty available"). */}
            <PageSection bg="default" width="narrow" className="pt-12 pb-2">
                <AdopterCounter locale={locale} total={ALPACAS.length} adopted={0} />
            </PageSection>

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

            {/* Pricing tiers — extracted to AdoptTierCard (monthly + yearly variants).
                Both cards link to checkout URLs already built with the alpaca slug. */}
            <PageSection bg="default" width="narrow" className="py-16">
                <h2 className="text-2xl font-bold text-foreground text-center mb-10">
                    {translate('adopt.tierLabel')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AdoptTierCard
                        locale={locale}
                        tier="monthly"
                        priceLabel={translate('adopt.monthlyPrice')}
                        checkoutUrl={monthlyUrl}
                        subLabel={translate('adopt.monthlyTierTagline')}
                    />
                    <AdoptTierCard
                        locale={locale}
                        tier="yearly"
                        priceLabel={translate('adopt.yearlyPrice')}
                        checkoutUrl={yearlyUrl}
                        subLabel={translate('adopt.yearlyTierTagline')}
                        popularBadge={translate('adopt.yearlyTierBadge')}
                    />
                </div>
            </PageSection>

            {/* What you'll receive — visual donor journey timeline */}
            <PageSection width="narrow" className="py-12 border-t border-border">
                <AdoptionTimeline locale={locale} />
            </PageSection>

            {/* Benefits — extracted to AdoptBenefitsList. Default 7-item list
                covers the spec-confirmed benefits; caller can override per tenant. */}
            <PageSection width="narrow" className="border-t border-border">
                <AdoptBenefitsList locale={locale} />
            </PageSection>

            {/* Certificate preview — makes the headline perk concrete + personalises
                with the picker selection when present. */}
            <PageSection bg="muted" width="narrow" className="border-t border-border">
                <AdoptionCertificatePreview
                    title={translate('adopt.certPreviewTitle')}
                    subtitle={translate('adopt.certPreviewSubtitle')}
                    certificateLabel={translate('adopt.certPreviewLabel')}
                    presentedToLabel={translate('adopt.certPreviewPresentedTo')}
                    sponsorOfLabel={translate('adopt.certPreviewSponsorOf')}
                    certificateFooter={translate('adopt.certPreviewFooter')}
                    alpacaName={selectedAlpacaSlug ? findAlpacaName(selectedAlpacaSlug) : null}
                    alpacaPlaceholder={translate('adopt.certPreviewAlpacaPlaceholder')}
                    donorPlaceholder={translate('adopt.certPreviewDonorPlaceholder')}
                />
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

            {/* Trust strip — directly below the CTA so security/cancellation/support
                reassurance lands while the donor is still deciding. */}
            <PageSection width="narrow" className="py-10 border-t border-border">
                <TrustSignals
                    heading={translate('adopt.trustHeading')}
                    securePayments={translate('adopt.trustSecurePayments')}
                    cancelAnyTime={translate('adopt.trustCancelAnyTime')}
                    responsiveSupport={translate('adopt.trustResponsiveSupport')}
                    receiptIncluded={translate('adopt.trustReceiptIncluded')}
                    acceptedLabel={translate('adopt.trustAcceptedLabel')}
                />
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

            {/* Closing CTA — catches donors who reached the FAQ without converting. Reuses the
                page-level checkout URLs so the picker selection stays threaded into Stripe. */}
            <PageSection width="narrow" className="py-12 border-t border-border">
                <RepeatCta
                    heading={translate('adopt.repeatHeading')}
                    body={translate('adopt.repeatBody')}
                    monthlyCtaLabel={translate('adopt.repeatMonthlyCta')}
                    yearlyCtaLabel={translate('adopt.repeatYearlyCta')}
                    monthlyHref={monthlyUrl}
                    yearlyHref={yearlyUrl}
                    alpacaName={selectedAlpacaSlug ? findAlpacaName(selectedAlpacaSlug) : null}
                    alpacaPickedNote={translate('adopt.repeatAlpacaNote')}
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
