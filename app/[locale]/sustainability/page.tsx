/**
 * Sustainability page — Es Currals Alpacas Ibiza
 *
 * Verified live-site facts used here (REALITY_CHECK.md):
 *   - 14 named alpacas (Tier 2, /onze-alpacas) — see lib/data/alpacas.ts
 *   - Es Currals finca, rural north Ibiza — verified via live site copy
 *   - Belgian founders (Bart & San) — verified via live site copy
 *   - Annual spring shearing — verified via live site copy
 *   - Alpaca manure "Oro Negro / Alcaca" — verified via live site + translations
 *   - Traditional wooden loom, Wishfulfilling Weaving — verified via live site
 *
 * UNMAPPED (confirm before removing the dev banner):
 *   - Finca size — exact hectares (draft copy says "6-hectare"; UNCONFIRMED)
 *   - Natural shades count — exact number (draft copy said "22"; UNCONFIRMED)
 *   - Any certifications (organic label, animal-welfare scheme) — NONE LISTED
 *   - Hero image — pending owner photo supply
 */

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n.config'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { localBusinessSchema, toJsonLd } from '@/lib/structured-data'
import { getTenant } from '@/lib/tenants/server'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { ALPACAS } from '@/lib/data/alpacas'
import Link from 'next/link'
import { GradientPageHero, PageSection, OwnerConfirmBanner } from '@/components/layout'
import { AwardsBadges } from '@/components/awards-badges'
import { getOgImage } from '@/lib/og-images'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const tenant = await getTenant()
    const base = tenantMetadata(tenant, {
        locale,
        route: '/sustainability',
        titleOverride: 'Sustainability | Alpacas Ibiza – Living Lightly on the Land',
        descriptionOverride:
            'How Es Currals alpaca farm works: animal welfare, natural dyes, traditional Ibiza weaving, and zero-waste practices.',
    })
    const ogImage = getOgImage('sustainability', 'Sustainability at Es Currals – Alpacas Ibiza')
    return {
        ...base,
        openGraph: { ...base.openGraph, images: [ogImage] },
        twitter: { ...base.twitter, images: [ogImage.url] },
    }
}

export default async function SustainabilityPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const translate = await getTranslations()

    // ── Cards: Cruz's original 4 + 2 new sections ─────────────────────────────
    const cards = [
        {
            key: 'welfare',
            title: translate('sustainability.welfareTitle'),
            body: translate('sustainability.welfareBody'),
            // OWNER_INPUT_NEEDED: verify alpaca count is still 14 (births/deaths since last verify)
            unmapped: null, // names pulled from lib/data/alpacas.ts (live-verified); count may drift
        },
        {
            key: 'craft',
            title: translate('sustainability.craftTitle'),
            body: translate('sustainability.craftBody'),
            unmapped: null,
        },
        {
            key: 'dyes',
            title: translate('sustainability.dyesTitle'),
            body: translate('sustainability.dyesBody'),
            // Natural dyes claim is verified on live site; "22 shades" count deliberately removed (was UNMAPPED)
            unmapped: null,
        },
        {
            key: 'waste',
            title: translate('sustainability.wasteTitle'),
            body: translate('sustainability.wasteBody'),
            unmapped: null,
        },
        {
            key: 'land',
            title: translate('sustainability.landTitle'),
            body: translate('sustainability.landBody'),
            // OWNER_INPUT_NEEDED: confirm exact finca size in hectares before publishing
            unmapped: '[UNMAPPED: confirm finca size in hectares before publishing]',
        },
        {
            key: 'sourcing',
            title: translate('sustainability.sourcingTitle'),
            body: translate('sustainability.sourcingBody'),
            unmapped: null,
        },
    ]

    return (
        <main>
            {/* JSON-LD: LocalBusiness */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: toJsonLd(localBusinessSchema()) }}
            />

            <PageBreadcrumbs
                locale={locale}
                homeLabel={translate('nav.home') || 'Home'}
                crumbs={[{ name: translate('sustainability.title') || 'Sustainability', path: 'sustainability' }]}
            />

            {/* Hero */}
            <GradientPageHero
                title={translate('sustainability.title')}
                subtitle={translate('sustainability.subtitle')}
            />

            {/* Content cards — 2x3 grid (Cruz's original 4 + 2 new) */}
            <PageSection width="narrow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cards.map((card) => (
                        <div key={card.key} className="bg-card rounded-lg border border-border p-6">
                            <h2 className="text-xl font-bold text-foreground mb-3">{card.title}</h2>
                            <p className="text-sm text-foreground/70">{card.body}</p>
                            {/* Dev/staging only: show UNMAPPED sentinel so owner knows what needs verification */}
                            {process.env.NODE_ENV !== 'production' && card.unmapped && (
                                <p className="mt-3 text-xs font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                    {card.unmapped}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </PageSection>

            {/* Animal welfare — 14 named alpacas as individuals */}
            <PageSection bg="muted" width="narrow" className="py-12">
                <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
                    {translate('sustainability.welfareTitle')}
                </h2>
                <p className="text-center text-foreground/70 mb-8 max-w-2xl mx-auto text-sm">
                    Each of our {ALPACAS.length} alpacas has a name and a personality. They are individuals, not livestock.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                    {ALPACAS.map((alpaca) => (
                        <span
                            key={alpaca.id}
                            className="inline-block px-3 py-1 rounded-full border border-border bg-background text-sm text-foreground/80"
                        >
                            {alpaca.name}
                        </span>
                    ))}
                </div>
            </PageSection>

            {/* Sustainability / eco certifications band */}
            <AwardsBadges category="sustainability" title={translate('awards.certified')} />

            {/* Owner-confirm banner — visible dev/staging, hidden in production */}
            <OwnerConfirmBanner
                heading={translate('sustainability.ownerConfirmHeader')}
                body={translate('sustainability.ownerConfirmBody')}
                items={[
                    '[UNMAPPED] Finca size — exact hectares (copy once said "6-hectare"; unconfirmed)',
                    '[UNMAPPED] Any certifications (organic, animal welfare label) to call out — none listed yet',
                    '[UNMAPPED] Hero image — provide a photo for this page or use an existing one',
                    '[UNMAPPED] Alpaca count — confirm still 14 (births/deaths since last verify)',
                ]}
            />

            {/* Trust signals — link to press, about, contact */}
            <PageSection bg="default" width="narrow" borderTop className="py-14" innerClassName="text-center">
                <h2 className="text-xl font-bold text-foreground mb-6">
                    {translate('sustainability.trustSectionTitle')}
                </h2>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link
                        href={`/${locale}/about`}
                        className="inline-block rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        {translate('sustainability.trustAbout')}
                    </Link>
                    <Link
                        href={`/${locale}/press`}
                        className="inline-block rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        {translate('sustainability.trustPress')}
                    </Link>
                    <Link
                        href={`/${locale}/contact`}
                        className="inline-block rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        {translate('sustainability.trustContact')}
                    </Link>
                </div>
            </PageSection>
        </main>
    )
}
