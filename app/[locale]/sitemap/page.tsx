import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { GradientPageHero, PageSection } from '@/components/layout'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
    const { locale } = await params
    const tr = await getTranslations()
    return {
        title: tr('sitemap.metaTitle'),
        description: tr('sitemap.metaDescription'),
        alternates: buildLocaleAlternates(locale, 'sitemap'),
        robots: { index: true, follow: true },
    }
}

interface SitemapLink {
    label: string
    href: string
}

interface SitemapCategory {
    heading: string
    links: SitemapLink[]
}

export default async function SitemapPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params
    const tr = await getTranslations()
    const p = (path: string) => `/${locale}${path}`

    const categories: SitemapCategory[] = [
        {
            heading: tr('sitemap.categoryVisit'),
            links: [
                { label: tr('sitemap.linkTours'), href: p('/tours') },
                { label: tr('sitemap.linkYoga'), href: p('/yoga') },
                { label: tr('sitemap.linkFamily'), href: p('/experiences/family-farm-days') },
                { label: tr('sitemap.linkRomantic'), href: p('/experiences/romantic-sunset') },
                { label: tr('sitemap.linkCorporate'), href: p('/experiences/corporate-team-building') },
                { label: tr('sitemap.linkWeddings'), href: p('/weddings') },
                { label: tr('sitemap.linkWorkshops'), href: p('/workshops') },
            ],
        },
        {
            heading: tr('sitemap.categoryShop'),
            links: [
                { label: tr('sitemap.linkShop'), href: p('/shop') },
                { label: tr('sitemap.linkWoven'), href: p('/shop/woven') },
                { label: tr('sitemap.linkCommission'), href: p('/shop/commission') },
                { label: tr('sitemap.linkAlcaca'), href: p('/shop/alcaca') },
                { label: tr('sitemap.linkGifts'), href: p('/gifts') },
            ],
        },
        {
            heading: tr('sitemap.categoryAdopt'),
            links: [
                { label: tr('sitemap.linkAdopt'), href: p('/adopt') },
            ],
        },
        {
            heading: tr('sitemap.categoryAbout'),
            links: [
                { label: tr('sitemap.linkAbout'), href: p('/about') },
                { label: tr('sitemap.linkAlpacas'), href: p('/alpacas') },
                { label: tr('sitemap.linkSustainability'), href: p('/sustainability') },
            ],
        },
        {
            heading: tr('sitemap.categoryMedia'),
            links: [
                { label: tr('sitemap.linkJournal'), href: p('/journal') },
                { label: tr('sitemap.linkMedia'), href: p('/media') },
                { label: tr('sitemap.linkPress'), href: p('/press') },
            ],
        },
        {
            heading: tr('sitemap.categoryContact'),
            links: [
                { label: tr('sitemap.linkContact'), href: p('/contact') },
            ],
        },
        {
            heading: tr('sitemap.categoryLegal'),
            links: [
                { label: tr('sitemap.linkPrivacy'), href: p('/privacy') },
                { label: tr('sitemap.linkTerms'), href: p('/terms') },
                { label: tr('sitemap.linkCookies'), href: p('/cookies') },
                { label: tr('sitemap.linkImpressum'), href: p('/impressum') },
                { label: tr('sitemap.linkSitemap'), href: p('/sitemap') },
            ],
        },
    ]

    // Total link count: Visit(7) + Shop(5) + Adopt(1) + About(3) + Media(3) + Contact(1) + Legal(5) = 25

    return (
        <main>
            <PageBreadcrumbs
                locale={locale}
                homeLabel={tr('nav.home') || 'Home'}
                crumbs={[{ name: tr('sitemap.breadcrumb'), path: 'sitemap' }]}
            />

            <GradientPageHero
                title={tr('sitemap.title')}
                subtitle={tr('sitemap.subtitle')}
            />

            <PageSection>
                <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
                    <nav aria-label={tr('sitemap.navAriaLabel')}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                            {categories.map((cat) => (
                                <div key={cat.heading}>
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-4 pb-2 border-b border-border">
                                        {cat.heading}
                                    </h2>
                                    <ul className="space-y-2" role="list">
                                        {cat.links.map((link) => (
                                            <li key={link.href}>
                                                <Link
                                                    href={link.href}
                                                    className="text-sm text-foreground/80 hover:text-primary hover:underline underline-offset-2 transition-colors"
                                                >
                                                    {link.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </nav>
                </div>
            </PageSection>
        </main>
    )
}
