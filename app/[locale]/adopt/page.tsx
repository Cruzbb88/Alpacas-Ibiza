import type { Metadata } from 'next'
import { Suspense } from 'react'
import { t } from '@/lib/translations'
import type { Locale } from '@/i18n.config'
import { SITE_BASE_URL as BASE_URL } from '@/lib/config'
import { getPaymentAdapter } from '@/lib/payment-vendor'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { toJsonLd, adoptAPacaServiceSchema } from '@/lib/structured-data'
import { GradientPageHero, PageSection, OwnerConfirmBanner } from '@/components/layout'
import { BillingPortalLink } from '@/components/billing-portal-link'
import { AdoptTierCard } from '@/components/adopt/adopt-tier-card'
import { TierComparison } from '@/components/adopt/tier-comparison'
import { AdoptBenefitsList } from '@/components/adopt/adopt-benefits-list'
import { AdoptionTimeline } from '@/components/adopt/adoption-timeline'
import { AdopterCounter } from '@/components/adopt/adopter-counter'
import { AdoptStickyMobileBar } from '@/components/adopt/adopt-sticky-mobile-bar'
import { AlpacaPersonalityMatch } from '@/components/adopt/alpaca-personality-match'
import { AdoptionCertificatePreview } from '@/components/adopt/adoption-certificate-preview'
import { TrustSignals } from '@/components/adopt/trust-signals'
import { RepeatCta } from '@/components/adopt/repeat-cta'
import { ALPACAS, findAlpacaName } from '@/lib/data/alpacas'
import { AlpacaPicker } from '@/components/adopt/alpaca-picker'
import { AdoptGiftAdoption } from '@/components/adopt/adopt-gift-adoption'
import { CampaignBanner } from '@/components/adopt/campaign-banner'
import { ReferralAppliedBanner } from '@/components/adopt/referral-applied-banner'
import { AdoptThankYou } from '@/components/adopt-thank-you'
import { AdoptPageTracker } from '@/components/adopt/adopt-page-tracker'
import { AdoptCheckoutLink } from '@/components/adopt/adopt-checkout-link'
import { EmbeddedCheckout } from '@/components/adopt/embedded-checkout'
import { SUCCESS_LIKE_CHECKOUT_STATES } from '@/lib/checkout-states'
import { getCheckoutMode } from '@/lib/checkout-mode'
import { FAQ } from '@/components/faq'
import { TestimonialsWall } from '@/components/testimonials-wall'
import { GoogleReviewsWall } from '@/components/google-reviews-wall'
import { getTenant } from '@/lib/tenants/server'
import { getOgImage } from '@/lib/og-images'
import { getActiveAdopterCount } from '@/lib/adopters/count'

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

// Narrow PaymentVendor → the analytics processor union. 'stripe-connect' is
// rolled into 'stripe' (same processor downstream) and 'unconfigured' becomes
// 'mailto' (the fallback CTA destination). Keeps GA4 reports clean.
function normalizeProcessor(
  v: import('@/lib/payment-vendor').PaymentVendor,
): 'stripe' | 'mollie' | 'mailto' | 'fareharbor' | 'unknown' {
  if (v === 'stripe' || v === 'stripe-connect') return 'stripe'
  if (v === 'mollie') return 'mollie'
  if (v === 'fareharbor') return 'fareharbor'
  if (v === 'mailto' || v === 'unconfigured') return 'mailto'
  return 'unknown'
}


export default async function AdoptPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: Locale }>
    searchParams: Promise<{
        checkout?: string
        tier?: string
        portal?: string
        alpaca?: string
        gift_name?: string
        gift_email?: string
        gift_deliver?: string
    }>
}) {
    const { locale } = await params
    const { checkout, alpaca: alpacaParam, gift_name, gift_email, gift_deliver } = await searchParams
    const translate = t(locale)
    const tenant = await getTenant()

    // Validate alpaca slug against the canonical roster — unknown slugs (forged
    // URL, typo) collapse to "no selection". The same validation runs in the
    // checkout routes as a second line of defence.
    const selectedAlpacaSlug = findAlpacaName(alpacaParam ?? null) ? (alpacaParam as string) : null

    // Fetch live adopter count server-side; fail-quiet (returns 0 on error / unconfigured).
    const { count: adoptedCount } = await getActiveAdopterCount()

    const paymentAdapter = getPaymentAdapter()
    // Stage 1-2 of embedded checkout migration. When CHECKOUT_MODE=embedded AND
    // the active vendor is Stripe, we render <EmbeddedCheckout /> below the tier
    // cards in addition to the hosted-redirect CTAs (Stage 2 = additive; Stage 5
    // = hosted CTAs removed). Default 'hosted' → no behavioural change.
    const checkoutMode = getCheckoutMode()
    const showEmbedded = checkoutMode === 'embedded' && paymentAdapter.vendor === 'stripe'
    const hasGiftFields = Boolean(gift_name || gift_email || gift_deliver)
    const adoptOpts: import('@/lib/payment-vendor').AdoptCheckoutOpts | undefined =
        (selectedAlpacaSlug || hasGiftFields)
            ? {
                  alpaca: selectedAlpacaSlug ?? undefined,
                  ...(gift_name ? { giftName: gift_name } : {}),
                  ...(gift_email ? { giftEmail: gift_email } : {}),
                  ...(gift_deliver ? { giftDeliver: gift_deliver } : {}),
              }
            : undefined
    const monthlyUrl = paymentAdapter.buildAdoptCheckoutUrl('monthly', adoptOpts) ?? `mailto:info@alpacasibiza.com?subject=Adopt%20an%20Alpaca%20enquiry`
    const yearlyUrl  = paymentAdapter.buildAdoptCheckoutUrl('yearly', adoptOpts)  ?? `mailto:info@alpacasibiza.com?subject=Adopt%20an%20Alpaca%20enquiry`

    // BillingPortalLink needs to hit the right vendor's manage endpoint based on
    // who actually charged the donor. paymentAdapter.vendor is the live answer
    // (Mollie by default per ADR 019; Stripe when PAYMENT_VENDOR=stripe). Other
    // vendors (mailto, fareharbor) don't have a self-serve manage flow yet —
    // they fall back to 'mollie' which 200s silently if no customer matches.
    const billingPortalVendor: 'mollie' | 'stripe' = paymentAdapter.vendor === 'stripe' ? 'stripe' : 'mollie'
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

    // Donor has finished a Mollie/Stripe round-trip — suppress the marketing
    // content so they see the thank-you (or SEPA-pending) screen, not the pitch
    // that suggests their payment failed. Mollie returns to `mollie-return` /
    // `mollie-embedded-return` while SEPA settles (1-5 business days).
    const isSuccess = checkout != null && (SUCCESS_LIKE_CHECKOUT_STATES as ReadonlyArray<string>).includes(checkout)

    return (
        <>
            {/* JSON-LD: Product/Offer */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: toJsonLd(offerSchema) }}
            />
            {/* JSON-LD: Service + Offer (symbolic sponsorship) */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: toJsonLd(adoptAPacaServiceSchema()) }}
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
            {/* GA4 page-view fire — invisible client component; only renders in the
                marketing path so the success/cancelled events stay isolated. */}
            <AdoptPageTracker locale={locale} />
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

            {/* Referral discount banner — shown when ?referral=ALPACA-XXXXXX is in the URL.
                Client component; Suspense required by Next.js for useSearchParams in static build.
                Renders null when referral param is absent or malformed. */}
            <PageSection bg="default" width="narrow" className="pt-8 pb-0">
                <Suspense fallback={null}>
                    <ReferralAppliedBanner locale={locale} />
                </Suspense>
            </PageSection>

            {/* Campaign banner — impact-multiplier trust signal (Heifer-style).
                Reads ADOPT_CAMPAIGN_HEADLINE + ADOPT_CAMPAIGN_SUBLINE + ADOPT_CAMPAIGN_END_DATE.
                Renders null if any required var is unset or end date has passed (auto-expiry). */}
            <PageSection bg="default" width="narrow" className="pt-4 pb-0">
                <CampaignBanner locale={locale} />
            </PageSection>

            {/* Social proof — herd availability counter. Live count from payment
                vendor (Stripe / Mollie); degrades gracefully to 0 when unconfigured. */}
            <PageSection bg="default" width="narrow" className="pt-12 pb-2">
                <AdopterCounter locale={locale} total={ALPACAS.length} adopted={adoptedCount} />
            </PageSection>

            {/* Personality quiz — donors with no preference can answer 3 questions and
                get a recommendation. Result links to /adopt?alpaca=<slug> which re-renders
                with the picker pre-selected. */}
            <PageSection bg="default" width="narrow" className="pt-12 pb-2">
                <AlpacaPersonalityMatch locale={locale} animals={ALPACAS.map((a) => ({ ...a, kind: 'animal' as const, personality: null }))} />
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

            {/* Gift adoption disclosure — threads recipient name/email/delivery date
                into URL params; the tier CTAs above pick them up automatically. */}
            <PageSection bg="default" width="narrow" className="pt-2 pb-6">
                <AdoptGiftAdoption locale={locale} />
            </PageSection>

            {/* Tier comparison table — richer decision aid above the quick-checkout cards.
                Donors who want detail use this; those who want fast checkout use the cards below. */}
            <PageSection bg="default" width="narrow" className="py-16 pb-0">
                <TierComparison
                    title={translate('adopt.comparisonTitle') || 'Compare plans'}
                    subtitle={translate('adopt.comparisonSubtitle') || undefined}
                    monthlyLabel={translate('adopt.monthly') || 'Monthly'}
                    yearlyLabel={translate('adopt.yearly') || 'Yearly'}
                    monthlyPrice={translate('adopt.monthlyPrice') || '€75 / month'}
                    yearlyPrice={translate('adopt.yearlyPrice') || '€900 / year'}
                    yearlyBadge={translate('adopt.yearlyTierBadge') || undefined}
                    monthlyCtaLabel={translate('adopt.monthlyCtaLabel') || 'Adopt monthly'}
                    yearlyCtaLabel={translate('adopt.yearlyCtaLabel') || 'Adopt yearly'}
                    whatYouGetLabel={translate('adopt.comparison.whatYouGet') || 'What you get'}
                    monthlyHref={monthlyUrl}
                    yearlyHref={yearlyUrl}
                    features={[
                        {
                            label: translate('adopt.feature.certificate') || 'Digital adoption certificate',
                            monthly: true,
                            yearly: true,
                        },
                        {
                            label: translate('adopt.feature.updates') || 'Monthly alpaca photo & updates',
                            monthly: true,
                            yearly: true,
                        },
                        {
                            label: translate('adopt.feature.farmTour') || 'Farm tour invitation',
                            monthly: true,
                            yearly: true,
                        },
                        {
                            label: translate('adopt.feature.weavingDiscount') || '10% Wishfulfilling Weaving discount',
                            monthly: true,
                            yearly: true,
                        },
                        {
                            label: translate('adopt.feature.shopDiscount') || '15% Farm Shop discount',
                            monthly: true,
                            yearly: true,
                        },
                        {
                            label: translate('adopt.feature.fertilizer') || 'Alpaca fertilizer bag',
                            monthly: false,
                            yearly: true,
                        },
                        {
                            label: translate('adopt.feature.photoshoot') || 'Professional alpaca photoshoot',
                            monthly: false,
                            yearly: true,
                        },
                    ]}
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
                        alpacaSlug={selectedAlpacaSlug}
                        processor={normalizeProcessor(paymentAdapter.vendor)}
                        isGift={hasGiftFields}
                    />
                    <AdoptTierCard
                        locale={locale}
                        tier="yearly"
                        priceLabel={translate('adopt.yearlyPrice')}
                        checkoutUrl={yearlyUrl}
                        subLabel={translate('adopt.yearlyTierTagline')}
                        popularBadge={translate('adopt.yearlyTierBadge')}
                        alpacaSlug={selectedAlpacaSlug}
                        processor={normalizeProcessor(paymentAdapter.vendor)}
                        isGift={hasGiftFields}
                    />
                </div>
            </PageSection>

            {/* Embedded Stripe Elements — Stage 2 of embedded checkout migration.
                Renders ONLY when CHECKOUT_MODE=embedded AND PAYMENT_VENDOR=stripe.
                Hosted-redirect CTAs above stay visible during the additive rollout
                so donors keep their existing path. Stage 5 will remove the hosted
                CTAs once A/B confirms embedded wins. */}
            {showEmbedded && (
                <PageSection bg="default" width="narrow" className="py-12 border-t border-border">
                    <h2 className="text-2xl font-bold text-foreground text-center mb-2">
                        {translate('adopt.embeddedHeading') || 'Pay securely without leaving the page'}
                    </h2>
                    <p className="text-sm text-foreground/70 text-center mb-8">
                        {translate('adopt.embeddedSubtext') || 'Card or SEPA — your payment never leaves alpacasibiza.com.'}
                    </p>
                    <EmbeddedCheckout
                        tier="monthly"
                        alpacaSlug={selectedAlpacaSlug}
                        isGift={hasGiftFields}
                        locale={locale}
                    />
                </PageSection>
            )}

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
                    <AdoptCheckoutLink
                        href={monthlyUrl}
                        tier="monthly"
                        source="cta"
                        alpacaSlug={selectedAlpacaSlug}
                        processor={normalizeProcessor(paymentAdapter.vendor)}
                        isGift={hasGiftFields}
                        className="inline-block rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        {translate('adopt.ctaLabel')} — Monthly
                    </AdoptCheckoutLink>
                    <AdoptCheckoutLink
                        href={yearlyUrl}
                        tier="yearly"
                        source="cta"
                        alpacaSlug={selectedAlpacaSlug}
                        processor={normalizeProcessor(paymentAdapter.vendor)}
                        isGift={hasGiftFields}
                        className="inline-block rounded-lg border border-primary px-8 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                    >
                        {translate('adopt.ctaLabel')} — Yearly
                    </AdoptCheckoutLink>
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

            {/* Google Reviews wall — live trust signal. Fail-quiet when keys unset.
                Renders between TrustSignals and TestimonialsWall so it's the first
                real social proof a donor sees above the fold. */}
            <PageSection width="narrow" className="py-10 border-t border-border">
                <GoogleReviewsWall heading="What our adopters say on Google" />
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
                    emitSchema={true}
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
                    alpacaSlug={selectedAlpacaSlug}
                    processor={normalizeProcessor(paymentAdapter.vendor)}
                    isGift={hasGiftFields}
                />
            </PageSection>

            {/* Billing portal — existing subscribers only; collapsed by default */}
            <PageSection width="narrow" className="pt-0 pb-2">
                <BillingPortalLink locale={locale} vendor={billingPortalVendor} />
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

            {/* Mobile-only sticky bottom CTA — hidden on success, hidden above fold,
                hidden when donor is scrolling down (auto-shows on scroll up). */}
            {!isSuccess && (
                <AdoptStickyMobileBar
                    locale={locale}
                    monthlyUrl={monthlyUrl}
                    yearlyUrl={yearlyUrl}
                    alpacaSlug={selectedAlpacaSlug}
                    processor={normalizeProcessor(paymentAdapter.vendor)}
                    isGift={hasGiftFields}
                />
            )}
        </>
    )
}
