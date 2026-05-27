/**
 * Alpaca Yoga page — Es Currals Alpacas Ibiza
 *
 * Verified live-site facts (sa-001-2026-05-27-live-site.md; REALITY_CHECK.md Tier 2):
 *   - €30 per person — source: live /alpaca-yoga, "30€ per persoon", 2026-05-27
 *   - 1h 15min Hatha session — source: live site, "1u 15 minuten"
 *   - Maximum 6 participants — source: live site
 *   - Held among the alpaca herd ("Alpaca Yoga-dorp") — source: live site
 *   - Schedule Wednesdays & Saturdays — source: live site Dutch page (see OWNER_INPUT_NEEDED below)
 *
 * UNMAPPED (owner must confirm before launch — see OwnerConfirmBanner below):
 *   - Exact session start time
 *   - Whether schedule differs in off-season
 *   - Yoga mat provision (bring your own or provided)
 *   - Instructor name + bio
 *   - Hero photo (public/images/heroes/yoga.webp)
 *   - FareHarbor yoga item ID (FAREHARBOR_ITEM_YOGA env var)
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { t } from '@/lib/translations'
import type { Locale } from '@/i18n.config'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { GradientPageHero, PageSection, OwnerConfirmBanner } from '@/components/layout'
import { FAQ } from '@/components/faq'
import { localBusinessSchema, yogaWeeklyEventSchema, toJsonLd } from '@/lib/structured-data'
import {
    SITE_BASE_URL as BASE_URL,
    YOGA_PRICE_EUR,
    FAREHARBOR_BOOKING_URL,
    FAREHARBOR_ITEM_YOGA,
    getFareHarborItemUrl,
} from '@/lib/config'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'

// ─── Yoga activity schema (SportsActivityLocation + Offer) ───────────────────
// Price €30 verified live 2026-05-27. Duration / style / schedule verified same source.
function yogaActivitySchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'SportsActivityLocation',
        name: 'Alpaca Yoga – Es Currals Ibiza',
        description:
            'Hatha yoga sessions held outdoors alongside alpacas on an authentic Ibiza finca. 1 hour 15 minutes, max 6 guests. Every Wednesday and Saturday.',
        url: `${BASE_URL}/en/yoga`,
        // backgroundImage intentionally omitted — /images/heroes/yoga.webp not yet supplied.
        // Add `image` field once owner provides the file. Emitting a broken URL harms SEO crawlers.
        address: {
            '@type': 'PostalAddress',
            streetAddress: 'San Carlos',
            addressLocality: 'Santa Eulària des Riu',
            addressRegion: 'Islas Baleares',
            addressCountry: 'ES',
            postalCode: '07819',
        },
        offers: {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price: String(YOGA_PRICE_EUR),
            availability: 'https://schema.org/InStock',
            url: getFareHarborItemUrl(FAREHARBOR_ITEM_YOGA),
        },
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const tenant = await getTenant()
    return tenantMetadata(tenant, {
        locale,
        route: '/yoga',
        titleOverride: 'Alpaca Yoga Ibiza | Hatha Yoga with Alpacas – €30 per person',
        descriptionOverride:
            'Join our 1h 15min Hatha yoga sessions surrounded by gentle alpacas at our Ibiza farm. Max 6 guests. Every Wednesday & Saturday. €30 per person. Book now!',
    })
}

export default async function YogaPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const translate = t(locale as Locale)

    const faqItems = [
        {
            question: translate('yoga.faq.audience.q'),
            answer: translate('yoga.faq.audience.a'),
        },
        {
            question: translate('yoga.faq.bring.q'),
            answer: translate('yoga.faq.bring.a'),
        },
        {
            question: translate('yoga.faq.weather.q'),
            answer: translate('yoga.faq.weather.a'),
        },
        {
            question: translate('yoga.faq.refund.q'),
            answer: translate('yoga.faq.refund.a'),
        },
    ]

    const schemas = [
        localBusinessSchema(),
        yogaActivitySchema(),
        yogaWeeklyEventSchema(),
    ]

    // CTA booking URL — filtered to yoga item when set; falls back to main calendar (fail-open)
    const bookingUrl = getFareHarborItemUrl(FAREHARBOR_ITEM_YOGA)

    return (
        <main>
            {/* JSON-LD: LocalBusiness + SportsActivityLocation + Event */}
            {schemas.map((schema, i) => (
                <script
                    key={`yoga-schema-${i}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
                />
            ))}

            {/* Breadcrumb nav */}
            <PageBreadcrumbs
                locale={locale}
                homeLabel={translate('nav.home') || 'Home'}
                crumbs={[{ name: translate('yoga.title') || 'Alpaca Yoga', path: 'yoga' }]}
            />

            {/* Hero — gradient until owner supplies public/images/heroes/yoga.webp */}
            <GradientPageHero
                title={translate('yoga.title')}
                subtitle={translate('yoga.subtitle')}
                ctaPrimary={{
                    label: translate('yoga.cta'),
                    href: bookingUrl,
                }}
            />

            {/* ── Section 1: What Is Alpaca Yoga? ─────────────────────────────── */}
            <PageSection bg="default" width="narrow" padding="md" ariaLabel="What is alpaca yoga">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                    {translate('yoga.whatTitle')}
                </h2>
                <p className="text-foreground/70 text-base leading-relaxed">
                    {translate('yoga.whatBody')}
                </p>
            </PageSection>

            {/* ── Section 2: Why Yoga with Alpacas? ───────────────────────────── */}
            <PageSection bg="muted" width="narrow" padding="md" ariaLabel="Why yoga with alpacas">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                    {translate('yoga.whyTitle')}
                </h2>
                <p className="text-foreground/70 text-base leading-relaxed">
                    {translate('yoga.whyBody')}
                </p>
            </PageSection>

            {/* ── Section 3: When & Where ──────────────────────────────────────── */}
            <PageSection bg="default" width="narrow" padding="md" ariaLabel="Schedule and location">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                    {translate('yoga.whenTitle')}
                </h2>
                <p className="text-foreground/70 text-base leading-relaxed">
                    {translate('yoga.whenBody')}
                </p>
            </PageSection>

            {/* ── Section 4: Price & Capacity ─────────────────────────────────── */}
            {/*
             * All values below sourced from live site (sa-001-2026-05-27-live-site.md) and
             * REALITY_CHECK.md Tier 2. Do not edit without re-verifying on live site.
             */}
            <PageSection bg="muted" width="narrow" padding="md" ariaLabel="Price and capacity">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                    {translate('yoga.priceTitle')}
                </h2>
                <p className="text-foreground/70 text-base leading-relaxed mb-6">
                    {translate('yoga.priceBody')}
                </p>
                {/* Quick-glance fact grid — 3-up verified facts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Price — verified: "30€ per persoon" */}
                    <div className="bg-background p-5 rounded-lg border border-border text-center">
                        <div className="text-3xl mb-2">💶</div>
                        <p className="font-semibold text-foreground text-sm">
                            {translate('yoga.details.price.title')}
                        </p>
                        <p className="text-xs text-foreground/60 mt-1">
                            {translate('yoga.details.price.desc')}
                        </p>
                    </div>
                    {/* Duration — verified: "1u 15 minuten" */}
                    <div className="bg-background p-5 rounded-lg border border-border text-center">
                        <div className="text-3xl mb-2">⏱️</div>
                        <p className="font-semibold text-foreground text-sm">
                            {translate('yoga.details.duration.title')}
                        </p>
                        <p className="text-xs text-foreground/60 mt-1">
                            {translate('yoga.details.duration.desc')}
                        </p>
                    </div>
                    {/* Group size — verified: max 6 */}
                    <div className="bg-background p-5 rounded-lg border border-border text-center">
                        <div className="text-3xl mb-2">👥</div>
                        <p className="font-semibold text-foreground text-sm">
                            {translate('yoga.details.groupSize.title')}
                        </p>
                        <p className="text-xs text-foreground/60 mt-1">
                            {translate('yoga.details.groupSize.desc')}
                        </p>
                    </div>
                </div>
            </PageSection>

            {/* ── CTA section ─────────────────────────────────────────────────── */}
            {/*
             * Primary CTA: getFareHarborItemUrl(FAREHARBOR_ITEM_YOGA)
             *   — filtered to yoga item when env var set; falls back to main calendar (fail-open).
             *   Failsafe documented in CLAUDE.md: "Per-tour FareHarbor URL falls back to base calendar"
             * Secondary CTA: mailto for private group inquiries
             */}
            <PageSection
                bg="gradient"
                width="narrow"
                padding="md"
                innerClassName="text-center"
                ariaLabel="Book your yoga session"
                id="booking"
            >
                <h2 className="text-2xl font-bold text-foreground mb-3">
                    {translate('yoga.cta')}
                </h2>
                <p className="text-foreground/70 mb-8 max-w-xl mx-auto text-sm">
                    {translate('yoga.scheduleNote')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href={bookingUrl}
                        className="inline-block rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        {translate('yoga.cta')}
                    </Link>
                    <Link
                        href="mailto:info@alpacasibiza.com?subject=Private+Yoga+Group+Inquiry"
                        className="inline-block rounded-lg border border-primary px-8 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                    >
                        {translate('yoga.ctaSecondary')}
                    </Link>
                </div>
            </PageSection>

            {/* ── AEO-Optimised FAQ ────────────────────────────────────────────── */}
            <section className="w-full bg-muted">
                <FAQ items={faqItems} />
            </section>

            {/* ── Owner-confirm banner — dev/staging only ──────────────────────── */}
            <OwnerConfirmBanner
                heading={translate('yoga.ownerConfirmHeader')}
                body={translate('yoga.ownerConfirmBody')}
                items={[
                    '[UNMAPPED] Exact session start time — confirm before publishing schedule',
                    '[UNMAPPED] Off-season schedule — does Wed/Sat schedule hold year-round?',
                    '[UNMAPPED] Yoga mat provision — bring your own or provided on-site?',
                    '[UNMAPPED] Instructor name + short bio — owner must supply',
                    '[UNMAPPED] Hero photo — drop at public/images/heroes/yoga.webp when ready',
                    '[UNMAPPED] FareHarbor yoga item ID — set FAREHARBOR_ITEM_YOGA in .env.local',
                ]}
            />
        </main>
    )
}
