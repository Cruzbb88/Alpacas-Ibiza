import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'
import { GradientPageHero, PageSection } from '@/components/layout'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
    const { locale } = await params
    const tr = t(locale)
    return {
        title: tr('sitemap.metaTitle', 'Site Map | Alpacas Ibiza'),
        description: tr('sitemap.metaDescription', 'Every page on alpacasibiza.com — tours, shop, experiences, and more.'),
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
    const tr = t(locale)
    const p = (path: string) => `/${locale}${path}`

    const categories: SitemapCategory[] = [
        {
            heading: tr('sitemap.categoryVisit', 'Visit & Experiences'),
            links: [
                { label: tr('sitemap.linkTours', 'Tours & Farm Visits'), href: p('/tours') },
                { label: tr('sitemap.linkYoga', 'Alpaca Yoga'), href: p('/yoga') },
                { label: tr('sitemap.linkFamily', 'Family Farm Days'), href: p('/experiences/family-farm-days') },
                { label: tr('sitemap.linkRomantic', 'Romantic Sunset Walks'), href: p('/experiences/romantic-sunset') },
                { label: tr('sitemap.linkCorporate', 'Corporate & Team Building'), href: p('/experiences/corporate-team-building') },
                { label: tr('sitemap.linkWeddings', 'Weddings'), href: p('/weddings') },
                { label: tr('sitemap.linkWorkshops', 'Workshops'), href: p('/workshops') },
            ],
        },
        {
            heading: tr('sitemap.categoryShop', 'Shop'),
            links: [
                { label: tr('sitemap.linkShop', 'Shop Overview'), href: p('/shop') },
                { label: tr('sitemap.linkWoven', 'Woven Collection'), href: p('/shop/woven') },
                { label: tr('sitemap.linkCommission', 'Custom Commission'), href: p('/shop/commission') },
                { label: tr('sitemap.linkAlcaca', 'Alcaca – Alpaca Manure'), href: p('/shop/alcaca') },
                { label: tr('sitemap.linkGifts', 'Gift Cards'), href: p('/gifts') },
            ],
        },
        {
            heading: tr('sitemap.categoryAdopt', 'Adopt'),
            links: [
                { label: tr('sitemap.linkAdopt', 'Adopt an Alpaca'), href: p('/adopt') },
            ],
        },
        {
            heading: tr('sitemap.categoryAbout', 'About'),
            links: [
                { label: tr('sitemap.linkAbout', 'About Us'), href: p('/about') },
                { label: tr('sitemap.linkAlpacas', 'Our Alpacas'), href: p('/alpacas') },
                { label: tr('sitemap.linkSustainability', 'Sustainability'), href: p('/sustainability') },
            ],
        },
        {
            heading: tr('sitemap.categoryMedia', 'Media & Stories'),
            links: [
                { label: tr('sitemap.linkJournal', 'Journal'), href: p('/journal') },
                { label: tr('sitemap.linkMedia', 'Media'), href: p('/media') },
                { label: tr('sitemap.linkPress', 'Press'), href: p('/press') },
            ],
        },
        {
            heading: tr('sitemap.categoryContact', 'Contact'),
            links: [
                { label: tr('sitemap.linkContact', 'Contact Us'), href: p('/contact') },
            ],
        },
        {
            heading: tr('sitemap.categoryLegal', 'Legal'),
            links: [
                { label: tr('sitemap.linkPrivacy', 'Privacy Policy'), href: p('/privacy') },
                { label: tr('sitemap.linkTerms', 'Terms of Service'), href: p('/terms') },
                { label: tr('sitemap.linkCookies', 'Cookie Policy'), href: p('/cookies') },
                { label: tr('sitemap.linkImpressum', 'Legal notice'), href: p('/impressum') },
                { label: tr('sitemap.linkSitemap', 'Site Map'), href: p('/sitemap') },
            ],
        },
    ]

    // Total link count: Visit(7) + Shop(5) + Adopt(1) + About(3) + Media(3) + Contact(1) + Legal(5) = 25

    return (
        <main>
            <PageBreadcrumbs
                locale={locale}
                homeLabel={tr('nav.home') || 'Home'}
                crumbs={[{ name: tr('sitemap.breadcrumb', 'Site Map'), path: 'sitemap' }]}
            />

            <GradientPageHero
                title={tr('sitemap.title', 'Site Map')}
                subtitle={tr('sitemap.subtitle', 'Every page on alpacasibiza.com')}
            />

            <PageSection>
                <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
                    <nav aria-label={tr('sitemap.navAriaLabel', 'Site map navigation')}>
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
