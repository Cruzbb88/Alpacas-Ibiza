import type { Metadata } from 'next'
import { Hero } from '@/components/hero'
import { AlpacaCard } from '@/components/alpaca-card'
import { getTranslations } from 'next-intl/server'
import { localBusinessSchema, herdAttractionSchema, toJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/i18n.config'
import { getTenant } from '@/lib/tenants/server'
import { getProviders } from '@/lib/integrations'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { PageSection } from '@/components/layout'
import { getOgImage } from '@/lib/og-images'
import { AlpacaSearchFilter } from '@/components/alpacas/alpaca-search-filter'
import { filterAlpacas, parseListParam } from '@/lib/alpacas/filter'
import { AlpacaFunFactCarousel } from '@/components/alpacas/alpaca-fun-fact-carousel'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const tenant = await getTenant()
    const base = tenantMetadata(tenant, {
        locale,
        route: '/alpacas',
        titleOverride: 'Meet Our Alpacas | Alpacas Ibiza – Es Currals Herd',
        descriptionOverride:
            'Get to know the 14 alpacas of Es Currals. Barbarella, Avalon, Bardot, Chet, Dusty, Fela, Fonda, Lewis, Marron, Mojo, Moloko, Nelson, Suki, and Toots — Ibiza\'s beloved herd.',
    })
    const ogImage = getOgImage('alpacas', 'Meet the alpacas of Es Currals – Alpacas Ibiza')
    return {
        ...base,
        openGraph: { ...base.openGraph, images: [ogImage] },
        twitter: { ...base.twitter, images: [ogImage.url] },
    }
}

export default async function AlpacasPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: Locale }>
    searchParams: Promise<{ p?: string; c?: string; b?: string }>
}) {
    const { locale } = await params
    const { p, c, b } = await searchParams
    const translate = await getTranslations()

    const tenant = await getTenant()
    const providers = getProviders(tenant)
    const animals = providers.content.listAnimals()

    // Server-side filter mirrors AlpacaSearchFilter's client-side logic.
    // URL params `?p=`, `?c=`, `?b=` are comma-joined keyword lists.
    const filters = {
        p: parseListParam(p),
        c: parseListParam(c),
        b: parseListParam(b),
    }
    const filtered = filterAlpacas(animals, filters)

    const schema = localBusinessSchema()
    const attractionSchema = herdAttractionSchema()

    return (
        <main>
            {/* JSON-LD: LocalBusiness */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
            />
            {/* JSON-LD: TouristAttraction (herd page is a destination) */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: toJsonLd(attractionSchema) }}
            />

            <PageBreadcrumbs
                locale={locale}
                homeLabel={translate('nav.home') || 'Home'}
                crumbs={[{ name: translate('nav.alpacas') || 'Our Alpacas', path: 'alpacas' }]}
            />

            {/* backgroundImage pending owner photo supply — Hero falls back to gradient */}
            {/* Hero */}
            <Hero
                title={translate('alpacas.title')}
                subtitle={translate('alpacas.subtitle')}
            />

            {/* Fun-fact carousel — pulls non-null fun_fact from the full herd
                (unfiltered intentionally: the carousel is a sitewide hook, not a
                filter-aware listing). Renders null while UNMAPPED. */}
            <PageSection width="narrow" className="pt-8 pb-4">
                <AlpacaFunFactCarousel locale={locale} animals={animals} />
            </PageSection>

            {/* Filter chips — URL-driven, server re-renders the grid below */}
            <PageSection width="narrow" className="py-6 border-t border-border">
                <AlpacaSearchFilter
                    locale={locale}
                    matchCount={filtered.length}
                    totalCount={animals.length}
                />
            </PageSection>

            {/* Alpaca grid — filtered server-side; empty state when no matches */}
            <PageSection>
                {filtered.length === 0 ? (
                    <p className="text-center text-foreground/60 py-12">
                        {translate('alpacas.filter.noMatches')}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filtered.map((animal) => (
                            <AlpacaCard key={animal.id} alpaca={animal} locale={locale} showAdoptCta />
                        ))}
                    </div>
                )}
            </PageSection>
        </main>
    )
}
