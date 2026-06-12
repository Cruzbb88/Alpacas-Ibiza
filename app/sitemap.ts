import type { MetadataRoute } from 'next'
import { i18nConfig } from '@/i18n.config'
import { listJournalPostsNewest } from '@/lib/data/journal-posts'
import { SITE_BASE_URL as BASE_URL } from '@/lib/config'
import { getTenant } from '@/lib/tenants/server'
import { getProviders } from '@/lib/integrations'

const routes = [
    '',           // homepage
    '/tours',
    '/visit',
    '/about',
    '/adopt',     // primary conversion page — was missing per SEO audit 2026-05-29
    '/contact',
    '/shop',
    '/shop/woven',
    '/shop/commission',
    '/shop/alcaca',
    '/alpacas',
    '/experiences',
    '/experiences/corporate-team-building',
    '/experiences/romantic-sunset',
    '/experiences/family-farm-days',
    '/gifts',
    '/redeem-voucher',  // gift voucher redemption — public-facing
    '/weaving',
    '/skein',           // alpaca-fibre sponsor page
    '/sustainability',
    '/weddings',
    '/workshops',
    '/yoga',
    '/privacy',
    '/terms',
    '/cookies',
    '/impressum', // LSSI-CE Art. 10 legal notice — required for EU-targeted commercial site (indexable)
    '/press',     // press room
    // '/press-kit' — excluded: no assets uploaded yet; page is noindex, direct URL still works
    // '/media'     — excluded: no live photos yet; page is noindex, direct URL still works
    '/sitemap',   // human-readable site map
    '/journal',   // journal index
    '/herd-diary', // herd diary feed (empty-state until owner adds events)
    '/newsletter/archive',  // public newsletter archive (empty-state until owner adds issues)
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const entries: MetadataRoute.Sitemap = []

    for (const locale of i18nConfig.locales) {
        for (const route of routes) {
            entries.push({
                url: `${BASE_URL}/${locale}${route}`,
                lastModified: new Date(),
                changeFrequency: route === '' ? 'weekly' : route === '/journal' ? 'weekly' : 'monthly',
                priority: route === '' ? 1.0 : route === '/tours' ? 0.9 : route === '/journal' ? 0.8 : 0.7,
                alternates: {
                    languages: Object.fromEntries(
                        i18nConfig.locales.map((l) => [l, `${BASE_URL}/${l}${route}`])
                    ),
                },
            })
        }
    }

    // Dynamic alpaca detail pages — one per alpaca per locale (14 alpacas × N locales)
    const tenant = await getTenant()
    const providers = getProviders(tenant)
    const animals = providers.content.listAnimals()
    for (const locale of i18nConfig.locales) {
        for (const animal of animals) {
            entries.push({
                url: `${BASE_URL}/${locale}/alpacas/${animal.id}`,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.7,
                alternates: {
                    languages: Object.fromEntries(
                        i18nConfig.locales.map((l) => [l, `${BASE_URL}/${l}/alpacas/${animal.id}`])
                    ),
                },
            })
        }
    }

    // Dynamic journal post entries — one per post per locale
    const posts = listJournalPostsNewest()
    for (const locale of i18nConfig.locales) {
        for (const post of posts) {
            entries.push({
                url: `${BASE_URL}/${locale}/journal/${post.slug}`,
                lastModified: new Date(post.updatedAt ?? post.publishedAt),
                changeFrequency: 'yearly',
                priority: 0.6,
                alternates: {
                    languages: Object.fromEntries(
                        i18nConfig.locales.map((l) => [l, `${BASE_URL}/${l}/journal/${post.slug}`])
                    ),
                },
            })
        }
    }

    return entries
}
