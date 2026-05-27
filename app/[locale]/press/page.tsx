/**
 * Press & Media page — Alpacas Ibiza
 *
 * Renders all entries from lib/data/press.ts.
 *
 * OWNER INPUT NEEDED (see OWNER_INPUT_NEEDED.md "Press logos" section):
 *   All 6 press entries currently have logoUrl: null AND articleUrl: null.
 *   The page renders a "Coming soon" state until the owner supplies at least
 *   one logo or article URL. The outlet names ARE shown so the owner can verify
 *   the list before providing assets.
 *
 * Failsafe (Rule 5): if all entries have logoUrl: null AND articleUrl: null,
 *   the grid is replaced with a "logos coming soon" placeholder. Outlet names
 *   are still rendered so the owner can verify the list.
 *
 * Do NOT invent press outlets, logos, or article URLs — see lib/data/press.ts
 * header comment.
 */

import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { t } from '@/lib/translations'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { localBusinessSchema, toJsonLd } from '@/lib/structured-data'
import { press } from '@/lib/data/press'

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const tenant = await getTenant()
    return tenantMetadata(tenant, {
        locale,
        route: '/press',
        titleOverride: 'Press & Media | Alpacas Ibiza',
        descriptionOverride:
            'Alpacas Ibiza as seen in Belgian and Spanish press. Coverage from Gazet van Antwerpen, Het Laatste Nieuws, Diario de Ibiza, Tribes & Nomads and more.',
    })
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PressPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const translate = t(locale as Locale)

    // Failsafe: detect whether ANY entry is actionable (has logo OR article URL)
    const hasAnyAsset = press.some((p) => p.logoUrl !== null || p.articleUrl !== null)

    const schemas = [localBusinessSchema()]

    return (
        <main>
            {/* JSON-LD: LocalBusiness */}
            {schemas.map((schema, i) => (
                <script
                    key={`press-schema-${i}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
                />
            ))}

            {/* BreadcrumbList JSON-LD */}
            <PageBreadcrumbs
                locale={locale}
                homeLabel={translate('nav.home') || 'Home'}
                crumbs={[
                    {
                        name: translate('press.title') || 'Press & Media',
                        path: 'press',
                    },
                ]}
            />

            {/* Hero */}
            <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                        {translate('press.title') || 'Press & Media'}
                    </h1>
                    <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
                        {translate('press.subtitle') ||
                            'Alpacas Ibiza has been featured in Belgian national press, regional Flemish media, Spanish local newspapers, and international travel outlets.'}
                    </p>
                </div>
            </section>

            {/* "Featured in" section */}
            <section className="w-full py-16 md:py-24 px-4 bg-background">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
                        {translate('press.featuredIn') || 'As Seen In'}
                    </h2>

                    {hasAnyAsset ? (
                        /* ── Live grid: at least one entry has logo or article URL ── */
                        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {press.map((mention) => {
                                const card = (
                                    <div
                                        key={mention.id}
                                        className="bg-card rounded-lg border border-border p-6 flex flex-col items-center justify-center gap-3 text-center hover:border-primary/50 transition-colors"
                                    >
                                        {mention.logoUrl !== null ? (
                                            /* Owner-supplied logo */
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={mention.logoUrl}
                                                alt={mention.outlet}
                                                className="h-10 object-contain"
                                                loading="lazy"
                                            />
                                        ) : (
                                            /* Fallback: outlet name in branded text */
                                            <span className="font-semibold text-primary text-sm">
                                                {mention.outlet}
                                            </span>
                                        )}
                                        {mention.articleUrl !== null && (
                                            <span className="text-xs text-muted-foreground underline">
                                                {translate('press.readArticle') || 'Read article'}
                                            </span>
                                        )}
                                    </div>
                                )

                                if (mention.articleUrl !== null) {
                                    return (
                                        <a
                                            key={mention.id}
                                            href={mention.articleUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                            aria-label={`${mention.outlet} — ${translate('press.readArticle') || 'Read article'}`}
                                        >
                                            {card}
                                        </a>
                                    )
                                }

                                return card
                            })}
                        </div>
                    ) : (
                        /* ── Failsafe: all entries are pending (logoUrl null + articleUrl null) ── */
                        <div className="mt-10">
                            {/* Outlet name list — lets owner verify the roster before providing assets */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                                {press.map((mention) => (
                                    <div
                                        key={mention.id}
                                        className="bg-card rounded-lg border border-border border-dashed p-6 flex items-center justify-center text-center"
                                    >
                                        <span className="font-semibold text-primary/80 text-sm">
                                            {mention.outlet}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Coming-soon notice — NOT shown to end-users in prod until logos are supplied */}
                            <p className="text-center text-sm text-muted-foreground italic">
                                {translate('press.logosComingSoon') ||
                                    'Press logos and article links coming soon — check back shortly.'}
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Press inquiries */}
            <section className="w-full py-16 px-4 bg-secondary/30">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                        {translate('press.inquiriesTitle') || 'Press Inquiries'}
                    </h2>
                    <p className="text-foreground/70 mb-6">
                        {translate('press.inquiriesBody') ||
                            'Journalists and media professionals are welcome to reach out for interviews, photography access, or editorial information.'}
                    </p>
                    <a
                        href="/contact?subject=Press%20inquiry"
                        className="inline-block bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-[16px] hover:bg-primary/90 transition-colors"
                    >
                        {translate('press.inquiriesCta') || 'Contact for Press'}
                    </a>
                </div>
            </section>
        </main>
    )
}
