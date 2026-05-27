// __WEDDINGS_BUILT__ 2026-05-27
// Tier 2 🔴 gap closed: live site /weddings-photoshoots → /weddings
// VERIFIED SOURCE: REALITY_CHECK.md line 57-60 (wedding/photoshoots as real revenue line)
// UNMAPPED: price, package details, photographer arrangement, off-site delivery radius, handler count
import type { Metadata } from 'next'
import { t } from '@/lib/translations'
import type { Locale } from '@/i18n.config'
import { SITE_BASE_URL as BASE_URL } from '@/lib/config'
import { BookingButton } from '@/components/booking/button'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { localBusinessSchema, faqPageSchema, toJsonLd } from '@/lib/structured-data'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const tenant = await getTenant()
    return tenantMetadata(tenant, {
        locale,
        route: '/weddings',
        titleOverride: 'Alpacas at Your Wedding | Alpacas Ibiza – Bridal Photoshoots & Ceremonies',
        descriptionOverride:
            'Make your wedding or photoshoot unforgettable with our gentle alpacas. Bridal shoots, ring-bearer ceremonies, engagement portraits, and social events. Contact us for a bespoke quote.',
    })
}

export default async function WeddingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const translate = t(locale)

    // UNMAPPED grid items — every cell shows "Contact us for details" per Rule 5
    const unmappedDetails = [
        { label: translate('weddings.details.alpacaCount'), key: 'alpacaCount' },
        { label: translate('weddings.details.duration'), key: 'duration' },
        { label: translate('weddings.details.radius'), key: 'radius' },
        { label: translate('weddings.details.handler'), key: 'handler' },
    ]

    // Use-case cards — generic enough to mention without invented specifics
    const useCases = [
        { icon: '💍', label: translate('weddings.useCases.bridal') },
        { icon: '💒', label: translate('weddings.useCases.ringBearer') },
        { icon: '💑', label: translate('weddings.useCases.engagement') },
        { icon: '👨‍👩‍👧‍👦', label: translate('weddings.useCases.family') },
        { icon: '📸', label: translate('weddings.useCases.socialMedia') },
    ]

    const faqItems = [
        {
            question: translate('weddings.faq.notice.q'),
            answer: translate('weddings.faq.notice.a'),
        },
        {
            question: translate('weddings.faq.location.q'),
            answer: translate('weddings.faq.location.a'),
        },
        {
            question: translate('weddings.faq.kids.q'),
            answer: translate('weddings.faq.kids.a'),
        },
        {
            question: translate('weddings.faq.cancellation.q'),
            answer: translate('weddings.faq.cancellation.a'),
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
                    key={`weddings-schema-${i}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
                />
            ))}

            {/* BreadcrumbList JSON-LD */}
            <PageBreadcrumbs
                locale={locale}
                homeLabel={translate('nav.home') || 'Home'}
                crumbs={[
                    { name: translate('weddings.title'), path: 'weddings' },
                ]}
            />

            {/* ── Hero ───────────────────────────────────────────────────────── */}
            {/* OWNER_INPUT_NEEDED: supply wedding/photoshoot hero .webp to replace gradient */}
            <section className="w-full py-20 px-4 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
                        {translate('weddings.eyebrow')}
                    </p>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                        {translate('weddings.title')}
                    </h1>
                    <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
                        {translate('weddings.subtitle')}
                    </p>
                </div>
            </section>

            {/* ── What's included (UNMAPPED) ─────────────────────────────────── */}
            <section className="w-full py-16 md:py-20 px-4 bg-background">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
                        {translate('weddings.includedTitle')}
                    </h2>
                    <p className="text-center text-foreground/60 mb-10 text-sm">
                        {translate('weddings.includedSubtitle')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {unmappedDetails.map((item) => (
                            <div
                                key={item.key}
                                className="bg-card rounded-lg border border-border p-6"
                            >
                                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50 mb-1">
                                    {item.label}
                                </p>
                                <p className="text-foreground/80 font-medium">
                                    {translate('weddings.contactForDetails')}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Use cases ──────────────────────────────────────────────────── */}
            <section className="w-full py-16 px-4 bg-secondary/10 border-y border-border">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
                        {translate('weddings.useCasesTitle')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {useCases.map((uc) => (
                            <div
                                key={uc.label}
                                className="bg-background rounded-lg border border-border p-6 flex items-center gap-4"
                            >
                                <span className="text-3xl flex-shrink-0" aria-hidden="true">
                                    {uc.icon}
                                </span>
                                <span className="text-foreground/80 font-medium">{uc.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Animal welfare + trust ─────────────────────────────────────── */}
            <section className="w-full py-16 md:py-20 px-4 bg-background">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                        {translate('weddings.welfareTitle')}
                    </h2>
                    <p className="text-foreground/70 text-base leading-relaxed mb-8">
                        {translate('weddings.welfareText')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="bg-card border border-border rounded-lg p-5">
                            <p className="font-semibold text-foreground mb-1">{translate('weddings.welfare.gentle')}</p>
                            <p className="text-xs text-foreground/60">{translate('weddings.welfare.gentleDesc')}</p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-5">
                            <p className="font-semibold text-foreground mb-1">{translate('weddings.welfare.supervised')}</p>
                            <p className="text-xs text-foreground/60">{translate('weddings.welfare.supervisedDesc')}</p>
                        </div>
                        <div className="bg-card border border-border rounded-lg p-5">
                            <p className="font-semibold text-foreground mb-1">{translate('weddings.welfare.allergy')}</p>
                            <p className="text-xs text-foreground/60">{translate('weddings.welfare.allergyDesc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Booking CTAs ────────────────────────────────────────────────── */}
            <section className="w-full py-16 md:py-20 px-4 bg-primary/5 border-y border-border">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                        {translate('weddings.bookingTitle')}
                    </h2>
                    <p className="text-foreground/70 mb-10">
                        {translate('weddings.bookingText')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {/*
                         * CTA 1 — visit at the farm (filtered to weddings item when FAREHARBOR_ITEM_WEDDINGS is set;
                         * falls back to main calendar when unset — fail-open via BookingButton / getProductBookingUrl).
                         */}
                        <BookingButton
                            product="weddings"
                            label={translate('weddings.bookAtFarm')}
                            anchorProps={{ target: '_blank', rel: 'noopener noreferrer' }}
                            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                        />
                        {/*
                         * CTA 2 — off-site wedding inquiry (email-based, per ADR 004).
                         * Off-site pricing is bespoke and cannot go through FareHarbor checkout.
                         */}
                        <a
                            href={`/${locale}/contact?subject=Wedding%20inquiry`}
                            className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-secondary/20 transition-colors"
                        >
                            {translate('weddings.bookOffSite')}
                        </a>
                    </div>
                </div>
            </section>

            {/* ── FAQ ─────────────────────────────────────────────────────────── */}
            <section className="w-full py-16 md:py-20 px-4 bg-background">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
                        {translate('faq.sectionTitle')}
                    </h2>
                    <div className="space-y-4">
                        {faqItems.map((item, i) => (
                            <details
                                key={i}
                                className="group border border-border rounded-lg bg-card"
                            >
                                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-semibold text-foreground">
                                    <span>{item.question}</span>
                                    <span
                                        aria-hidden="true"
                                        className="ml-4 text-foreground/40 transition-transform group-open:rotate-180"
                                    >
                                        ▾
                                    </span>
                                </summary>
                                <p className="px-6 pb-5 text-foreground/70 text-sm leading-relaxed">
                                    {item.answer}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Owner-confirm banner (dev/staging only) ─────────────────────── */}
            {process.env.NODE_ENV !== 'production' && (
                <section className="w-full py-10 px-4 bg-amber-50 border-t border-amber-200">
                    <div className="max-w-4xl mx-auto">
                        <h3 className="text-base font-bold text-amber-800 mb-2">
                            [OWNER_INPUT_NEEDED] — Wedding page — confirm before launch
                        </h3>
                        <ul className="space-y-1 text-sm font-mono text-amber-800 list-disc list-inside">
                            <li>[OWNER_INPUT_NEEDED] Pricing model — per-session flat rate or per-hour?</li>
                            <li>[OWNER_INPUT_NEEDED] Number of alpacas included per booking</li>
                            <li>[OWNER_INPUT_NEEDED] Travel radius for off-site events (km)</li>
                            <li>[OWNER_INPUT_NEEDED] Handler: is one included, or extra cost?</li>
                            <li>[OWNER_INPUT_NEEDED] Photographer: BYO or supplied by the farm?</li>
                            <li>[OWNER_INPUT_NEEDED] Off-site venue support: do you deliver alpacas to external venues?</li>
                            <li>[OWNER_INPUT_NEEDED] Hero photo — supply .webp wedding/photoshoot asset</li>
                            <li>[OWNER_INPUT_NEEDED] FareHarbor wedding item ID (for primary CTA specificity)</li>
                        </ul>
                    </div>
                </section>
            )}
        </main>
    )
}
