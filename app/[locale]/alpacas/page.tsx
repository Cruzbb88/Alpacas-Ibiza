import type { Metadata } from 'next'
import { Hero } from '@/components/hero'
import { AlpacaCard } from '@/components/alpaca-card'
import { t } from '@/lib/translations'
import { localBusinessSchema, toJsonLd } from '@/lib/structured-data'
import type { Locale } from '@/i18n.config'
import { getTenant } from '@/lib/tenants/server'
import { getProviders } from '@/lib/integrations'
import { tenantMetadata } from '@/lib/tenants/metadata'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { PageSection } from '@/components/layout'
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

export default async function AlpacasPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const translate = t(locale)

    const tenant = await getTenant()
    const providers = getProviders(tenant)
    const animals = providers.content.listAnimals()

    const schema = localBusinessSchema()

    return (
        <main>
            {/* JSON-LD: LocalBusiness */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }}
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

            {/* Alpaca grid */}
            <PageSection>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {animals.map((animal) => (
                        <AlpacaCard key={animal.id} alpaca={animal} locale={locale} />
                    ))}
                </div>
            </PageSection>
        </main>
    )
}
