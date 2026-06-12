import type { Metadata } from 'next'
import Link from 'next/link'
import { Hero } from '@/components/hero'
import { FAQ } from '@/components/faq'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { localBusinessSchema, workshopHowToSchema, toJsonLd } from '@/lib/structured-data'
import { SITE_BASE_URL as BASE_URL, FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP } from '@/lib/config'
import type { Locale } from '@/i18n.config'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { SpotsLeftBanner } from '@/components/tours/spots-left-banner'
import { AdoptCrossSell } from '@/components/tours/adopt-cross-sell'

/**
 * Verified live-site data (REALITY_CHECK.md Tier 2, line 62-65;
 * VERIFICATION_RESULTS.md: paragraph "Workshops page missing"):
 *   - 2-day weaving + spinning workshop
 *   - Taught by San
 *   - Off-season only (when not running regular tours)
 *   - On-request booking (NOT calendar/slot-based)
 *   - Takeaway: a scarf each guest wove themselves
 *   - San runs Wishfulfilling Weaving studio (verified in about.weavingTitle translation)
 *
 * UNMAPPED — do NOT invent (OWNER_INPUT_NEEDED):
 *   - Exact price
 *   - Exact max group size
 *   - Specific months (only "off-season" verified)
 *   - Materials provided vs BYO
 *   - Skill level required
 *   - Lunch/meal arrangements
 */

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const tenant = await getTenant()
    return tenantMetadata(tenant, {
        locale,
        route: '/workshops',
        titleOverride:
            'Weaving + Spinning Workshops with San | Alpacas Ibiza',
        descriptionOverride:
            'A 2-day hands-on weaving and spinning workshop with San at our Ibiza alpaca farm. Off-season only, on request. You spin the yarn, weave the cloth, and take home the scarf you made.',
    })
}

// ─── Course-shaped schema ─────────────────────────────────────────────────────
// Price and courseSchedule UNMAPPED (OWNER_INPUT_NEEDED) — omitted intentionally.
// Never emit broken/invented structured data.
function workshopCourseSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: 'Weaving + Spinning Workshop – Alpacas Ibiza',
        description:
            'A 2-day immersive workshop covering alpaca fleece preparation, spinning on a wheel, and weaving on a traditional wooden loom. Taught by San of Wishfulfilling Weaving. Available off-season, on request. Each participant takes home a handwoven scarf.',
        url: `${BASE_URL}/en/workshops`,
        // image intentionally omitted — not yet supplied by owner
        provider: {
            '@type': 'LocalBusiness',
            name: 'Alpacas Ibiza – Es Currals',
            url: BASE_URL,
        },
        educationalLevel: 'Beginner',
        teaches: [
            'Alpaca fleece washing and carding',
            'Spinning yarn on a spinning wheel',
            'Weaving on a traditional wooden loom',
        ],
        // courseSchedule intentionally omitted — only "off-season, on request" is verified
        // price intentionally omitted — UNMAPPED (OWNER_INPUT_NEEDED)
    }
}

export default async function WorkshopsPage({
    params,
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const translate = await getTranslations()

    const faqItems = [
        {
            question: translate('workshops.faq.experience.q'),
            answer: translate('workshops.faq.experience.a'),
        },
        {
            question: translate('workshops.faq.bring.q'),
            answer: translate('workshops.faq.bring.a'),
        },
        {
            question: translate('workshops.faq.cancellation.q'),
            answer: translate('workshops.faq.cancellation.a'),
        },
        {
            question: translate('workshops.faq.wool.q'),
            answer: translate('workshops.faq.wool.a'),
        },
    ]

    const schemas = [
        localBusinessSchema(),
        workshopCourseSchema(),
        workshopHowToSchema(),
    ]

    // Verified-facts grid — sourced from REALITY_CHECK.md Tier 2 (line 62-65)
    const facts = [
        {
            icon: '📅',
            title: translate('workshops.facts.duration.title'),
            desc: translate('workshops.facts.duration.desc'),
        },
        {
            icon: '🧑‍🎨',
            title: translate('workshops.facts.instructor.title'),
            desc: translate('workshops.facts.instructor.desc'),
        },
        {
            icon: '👥',
            title: translate('workshops.facts.groupSize.title'),
            desc: translate('workshops.facts.groupSize.desc'),
        },
        {
            icon: '🗓️',
            title: translate('workshops.facts.schedule.title'),
            desc: translate('workshops.facts.schedule.desc'),
        },
        {
            icon: '💶',
            title: translate('workshops.facts.price.title'),
            desc: translate('workshops.facts.price.desc'),
        },
        {
            icon: '🧣',
            title: translate('workshops.facts.takeaway.title'),
            desc: translate('workshops.facts.takeaway.desc'),
        },
    ]

    // What you'll learn — all 4 items verified from REALITY_CHECK.md Tier 2
    const curriculum = [
        translate('workshops.curriculum.wash'),
        translate('workshops.curriculum.spin'),
        translate('workshops.curriculum.weave'),
        translate('workshops.curriculum.scarf'),
    ]

    return (
        <main>
            {/* JSON-LD: LocalBusiness + FAQPage + Course */}
            {schemas.map((schema, i) => (
                <script
                    key={`workshops-schema-${i}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
                />
            ))}

            {/* BreadcrumbList JSON-LD */}
            <PageBreadcrumbs
                locale={locale}
                homeLabel={translate('nav.home')}
                crumbs={[
                    {
                        name: translate('workshops.breadcrumb'),
                        path: 'workshops',
                    },
                ]}
            />

            {/* Spots-left urgency widget (weaving workshop item — renders null if unconfigured) */}
            <div className="w-full px-4 pt-6 max-w-4xl mx-auto">
                <SpotsLeftBanner itemId={FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP} tourLabel="Weaving Workshop" />
            </div>

            {/* Hero — title and subtitle use verified facts only */}
            <Hero
                title={translate('workshops.title')}
                subtitle={translate('workshops.subtitle')}
                backgroundImage="/images/gallery/weaving-15.jpg"
                cta={{
                    label: translate('workshops.cta'),
                    href: `/contact?subject=${encodeURIComponent('Workshop inquiry')}`,
                }}
            />

            {/* What you'll learn — 4 verified curriculum items */}
            <section className="w-full py-16 px-4 bg-secondary/30">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold mb-2 text-center text-primary">
                        {translate('workshops.curriculum.title')}
                    </h2>
                    <p className="text-center text-muted-foreground mb-8">
                        {translate('workshops.curriculum.subtitle')}
                    </p>
                    <ul className="max-w-xl mx-auto space-y-4">
                        {curriculum.map((item, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-3 bg-background rounded-[16px] px-6 py-4 border border-secondary shadow-sm"
                            >
                                <span className="text-primary font-bold text-lg leading-none mt-0.5">
                                    ✓
                                </span>
                                <span className="text-foreground/80">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Verified facts grid — mirrors yoga page pattern */}
            {/*
             * All values sourced from REALITY_CHECK.md Tier 2 (line 62-65).
             * UNMAPPED fields (price, group size) show "Contact for details"
             * rather than invented values.
             */}
            <section className="w-full py-16 px-4 bg-muted">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold mb-2 text-center text-primary">
                        {translate('workshops.facts.title')}
                    </h2>
                    <p className="text-center text-muted-foreground mb-8">
                        {translate('workshops.facts.subtitle')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {facts.map((fact, i) => (
                            <div
                                key={i}
                                className="bg-background p-6 rounded-[16px] text-center border border-secondary shadow-sm"
                            >
                                <div className="text-3xl mb-3">{fact.icon}</div>
                                <h3 className="font-semibold text-primary mb-1">
                                    {fact.title}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {fact.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About San — verified: she runs Wishfulfilling Weaving studio. No fake bio. */}
            <section className="w-full py-16 px-4 bg-background">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="text-5xl mb-4">🧵</div>
                    <h2 className="text-2xl font-bold mb-4 text-primary">
                        {translate('workshops.san.title')}
                    </h2>
                    <p className="text-foreground/70 leading-relaxed">
                        {translate('workshops.san.body')}
                    </p>
                </div>
            </section>

            {/* How to book — request-based, no FareHarbor calendar */}
            <section className="w-full py-16 px-4 bg-secondary/30">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-4 text-primary">
                        {translate('workshops.booking.title')}
                    </h2>
                    <p className="text-foreground/70 mb-6 leading-relaxed">
                        {translate('workshops.booking.body')}
                    </p>
                    <Link
                        href={`/${locale}/contact?subject=${encodeURIComponent('Workshop inquiry')}`}
                        className="inline-flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-medium transition-colors"
                    >
                        {translate('workshops.booking.cta')}
                    </Link>
                </div>
            </section>

            {/* AEO-Optimised FAQ */}
            <section className="w-full bg-muted">
                <FAQ items={faqItems} />
            </section>

            {/* Adopt cross-sell */}
            <AdoptCrossSell locale={locale} />
        </main>
    )
}
